import { AIProviderError, describeAIError } from "../../lib/ai/errors";
import { getProvider, getProviderStatus } from "../../lib/ai/provider";
import { buildTeKaiMessages, detectPolicy } from "../../lib/ai/systemPrompt";
import type { AIErrorCode, ChatMessage, ChatStreamEvent, ChatPolicy } from "../../lib/ai/types";
import {
  createImageFilter,
  createPreambleFilter,
  sanitizeDiagramAnswer,
  stripLeadingFiller,
} from "../../lib/ai/sanitize";

const MAX_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 1_500;
// Generation is slow on the target hardware (~1.4 tok/s incl. prompt eval), so
// the timeout scales with the answer budget: brief gets 5 min, normal 8 min
// (measured diagram runs hit 409 s — headroom is required), detailed lessons
// get 9 min before we give up and surface an error.
const BRIEF_TIMEOUT_MS = 300_000;
const NORMAL_TIMEOUT_MS = 480_000;
const DETAILED_TIMEOUT_MS = 540_000;
// Sanitizing can legitimately empty an answer that consisted only of filler
// or echoed prompt labels — never hand the user a blank screen after a long
// wait. Presentation-level fallback; the sanitizers themselves stay pure.
const EMPTY_ANSWER_FALLBACK = "I couldn't finish that answer — please try asking again.";



const sse = (event: ChatStreamEvent) => `data: ${JSON.stringify(event)}\n\n`;

const logServerError = (error: unknown, code: AIErrorCode) => {
  if (error instanceof AIProviderError) {
    console.error(`TeKAI provider error [${code}]`, error.detail ?? "");
    return;
  }
  console.error("TeKAI unexpected error", error);
};

const codeOf = (error: unknown): AIErrorCode =>
  error instanceof AIProviderError ? error.code : "generation-failed";

/** Validate and clamp untrusted message input. */
const safeMessages = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<ChatMessage>;
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .slice(-MAX_MESSAGES)
    .map((item) => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_CHARS) }));
};

/** Health check: is the configured local model reachable and installed? */
export async function handleChatGET() {
  const status = await getProviderStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function handleChatPOST(request: Request) {
  let body: { messages?: unknown; mode?: unknown; stream?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: { code: "generation-failed", message: "Malformed request." } }, { status: 400 });
  }

  const messages = safeMessages(body.messages);
  if (messages.length === 0) {
    return Response.json({ error: { code: "generation-failed", message: "No messages provided." } }, { status: 400 });
  }
  const mode = typeof body.mode === "string" && body.mode.trim() ? body.mode.trim() : "Beginner";
  const wantsStream = body.stream !== false;

  const provider = getProvider();
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const detected = detectPolicy(lastUser?.content ?? "");
  const built = buildTeKaiMessages(messages, mode, detected);
  const policy: ChatPolicy = { ...built.policy };
  const requestMessages = built.messages;

  const controller = new AbortController();
  const timeoutMs =
    policy.detail === "detailed" ? DETAILED_TIMEOUT_MS : policy.detail === "normal" ? NORMAL_TIMEOUT_MS : BRIEF_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);


  const onClientAbort = () => controller.abort();
  request.signal.addEventListener("abort", onClientAbort);
  const finish = () => {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onClientAbort);
  };

  if (!wantsStream) {
    try {
      if (!provider) throw new AIProviderError("not-configured");
      const raw = await provider.chat(requestMessages, controller.signal, policy);
      // Diagram answers must open with the fence and never carry image links.
      const text = policy.wantsDiagram ? sanitizeDiagramAnswer(raw) : stripLeadingFiller(raw);
      const body = text.trim() ? text : EMPTY_ANSWER_FALLBACK;

      return Response.json(
        { source: "live", body, provider: provider.id, model: provider.model },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const code = codeOf(error);
      logServerError(error, code);
      return Response.json(
        { source: "offline", error: { code, message: describeAIError(code) } },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      finish();
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const encoder = new TextEncoder();
      const send = (event: ChatStreamEvent) => streamController.enqueue(encoder.encode(sse(event)));
      try {
        if (!provider) throw new AIProviderError("not-configured");
        send({ type: "meta", provider: provider.id, model: provider.model });
        const preamble = createPreambleFilter({ holdForDiagramIntro: policy.wantsDiagram });
        // In diagram answers, image links are stripped before anything else
        // sees them; a reference split across deltas is held until complete.
        const images = policy.wantsDiagram ? createImageFilter() : null;
        let sentAny = false;
        const forward = (delta: string) => {
          const clean = images ? images.push(delta) : delta;
          if (!clean) return;
          const out = preamble.push(clean);
          if (out) {
            sentAny = true;
            send({ type: "delta", text: out });
          }
        };
        for await (const delta of provider.streamChat(requestMessages, controller.signal, policy)) {
          forward(delta);
        }
        if (images) forward(images.flush());
        const tail = preamble.flush();
        if (tail) {
          sentAny = true;
          send({ type: "delta", text: tail });
        }
        if (!sentAny) send({ type: "delta", text: EMPTY_ANSWER_FALLBACK });
        send({ type: "done" });

      } catch (error) {
        const code = codeOf(error);
        logServerError(error, code);
        send({ type: "error", code, message: describeAIError(code) });
      } finally {
        finish();
        streamController.close();
      }
    },
    cancel() {
      controller.abort();
      finish();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
