"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { ReactNode } from "react";
import { CodeBlock } from "../components/code-block";
import { readProgress, saveProgress, useAuth } from "../components/auth-panel";
import { saveNote } from "../components/notes-store";
import { hasPremiumAccess, useSubscription } from "../components/subscription-store";
import { useRuntimeRecord } from "../linux/runtime-store";
import type { ChatMessage, ChatStreamEvent, ProviderStatus } from "../lib/ai/types";

const explanationModes = ["Beginner", "Standard", "Technical", "Expert"];

const quickPrompts = [
  "What is Linux?",
  "What is TCP?",
  "What is an IP address?",
  "What is SQL injection?",
  "What is an API?",
  "Why is my JavaScript variable undefined?",
];

const topics = [
  "IT and operating systems",
  "Linux and the shell",
  "Networking and protocols",
  "Cybersecurity and defense",
  "Programming and debugging",
  "Software engineering and DevOps",
];

type ChatUIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "done" | "error" | "stopped";
  meta?: string;
};

const uid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getWelcomeMessage = (): ChatUIMessage => ({
  id: "welcome",
  role: "assistant",
  status: "done",
  content:
    "Hi, I'm **TeKAI**, your IT, cybersecurity and software-engineering tutor.\n\nAsk me anything — for example *\"What is Linux?\"*, *\"What is TCP?\"*, or *\"Why is my JavaScript variable undefined?\"*\n\nI run on a **local AI model** on this machine. Nothing is sent to a cloud service and no API key is required.",
});

// SAVE_NOTE intent — notes are only created on an explicit request.
const SAVE_NOTE_INTENT = {
  wantsToSave: /\b(?:save|add|put|remember|store|write)\b/i,
  mentionsNote: /\b(?:notes?|study note|this explanation|this answer)\b/i,
};

const isExplicitNoteRequest = (prompt: string) =>
  SAVE_NOTE_INTENT.wantsToSave.test(prompt) && SAVE_NOTE_INTENT.mentionsNote.test(prompt);

const getNoteCategory = (text: string) => {
  const value = text.toLowerCase();
  if (/\b(network|networking|tcp|udp|dns|dhcp|http|https|ip address|subnet|router|switch|firewall|vpn|port)\b/.test(value)) return "Networking";
  if (/\b(linux|bash|shell|command|chmod|chown|permission|kernel|distro|distribution|systemd)\b/.test(value)) return "Linux";
  if (/\b(security|cybersecurity|xss|sql injection|csrf|ssrf|malware|ransomware|phishing|exploit|vulnerability|privilege escalation|encryption|hashing)\b/.test(value)) return "Security";
  if (/\b(python|javascript|typescript|react|next\.?js|code|function|variable|api|git|docker|sql|algorithm)\b/.test(value)) return "Programming";
  if (/\b(cpu|ram|memory|storage|operating system|server|hardware|virtualization|cloud)\b/.test(value)) return "IT";
  return "General";
};

const extractCode = (children: ReactNode): { code: string; lang: string } => {
  const nodes = Array.isArray(children) ? children : [children];
  for (const node of nodes) {
    if (node && typeof node === "object" && "props" in (node as object)) {
      const props = (node as { props?: { className?: string; children?: ReactNode } }).props;
      if (props) {
        const raw = props.children;
        const code = Array.isArray(raw) ? raw.join("") : typeof raw === "string" ? raw : "";
        const lang = (props.className ?? "").replace("language-", "").trim() || "text";
        if (code) return { code: code.replace(/\n$/, ""), lang };
      }
    }
  }
  return { code: "", lang: "text" };
};

// TeKAI's diagrams are plain-text art inside a fenced block — no images and no
// HTML ever (see sanitize.ts). A text block full of arrows and box-drawing
// characters is therefore a diagram, and labelling it as one keeps the label
// honest without adding a second rendering path: it reuses the existing
// CodeBlock, which already shows plain text with a Copy button.
const DIAGRAM_BLOCK = /[│┌└├┤┬┴┼▼▲◄►←→↑↓]|[-=]{2,}>|<[-=]{2,}/;
const diagramLabel = (lang: string, code: string): string => {
  const isPlainText = lang === "text" || lang === "ascii" || lang === "diagram";
  return isPlainText && code.includes("\n") && DIAGRAM_BLOCK.test(code) ? "Diagram" : lang;
};

const markdownComponents: Components = {
  pre: ({ children }) => {
    const { code, lang } = extractCode(children);
    if (!code) return <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#060a0b] p-3 text-xs leading-5 text-slate-300">{children}</pre>;
    return <CodeBlock code={code} label={diagramLabel(lang, code)} />;
  },
  code: ({ children }) => (
    <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.85em] text-[#f7d97d]">{children}</code>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#f7d97d] underline decoration-[#f4c65a]/40 underline-offset-4">
      {children}
    </a>
  ),
  // TeKAI never loads external images: diagrams must be plain text, and an
  // off-machine image request would break the "stays on your machine" promise.
  // Show the markdown source instead so the reference stays readable.
  img: ({ alt, src }) => (
    <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-400">
      {`![${alt ?? ""}](${src ?? ""})`}
    </code>
  ),
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-semibold text-white">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold text-white">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold text-white">{children}</h3>,
  p: ({ children }) => <p className="my-2 leading-6">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-[#f4c65a]/40 pl-3 text-slate-300">{children}</blockquote>,
};

function MessageBubble({ message, onRetry }: { message: ChatUIMessage; onRetry: () => void }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const isError = message.status === "error";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[92%] rounded-2xl border p-4 sm:max-w-[85%] ${
          isUser
            ? "border-white/10 bg-[#0d1217]"
            : isError
              ? "border-rose-300/25 bg-rose-300/5"
              : "border-[#f4c65a]/20 bg-[#f4c65a]/5"
        }`}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4c65a]">{isUser ? "You" : "TeKAI"}</p>
        <div className="mt-2 max-w-none break-words text-sm text-slate-200">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown components={markdownComponents}>
              {message.content || (message.status === "streaming" ? "…" : "")}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && message.content && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-2 text-[11px]">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-md border border-white/10 px-2 py-1 text-slate-300 transition hover:border-[#f4c65a]/30 hover:text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            {isError && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md border border-white/10 px-2 py-1 text-slate-300 transition hover:border-[#f4c65a]/30 hover:text-white"
              >
                Retry
              </button>
            )}
            {message.meta && !isError && <span className="text-slate-600">{message.meta}</span>}
            {message.status === "streaming" && <span className="text-[#f7d97d]">generating…</span>}
            {message.status === "stopped" && <span className="text-slate-500">stopped</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized so a streaming answer re-renders only the bubble it is growing.
// Without this, every flushed chunk re-parses the markdown of the whole
// conversation, which is exactly where a low-spec machine starts to stutter.
const MemoMessageBubble = memo(MessageBubble);

export default function TeKaiPage() {
  const [mode, setMode] = useState("Beginner");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatUIMessage[]>([getWelcomeMessage()]);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { auth } = useAuth();
  const subscription = useSubscription(auth.isLoggedIn ? auth.email : "");
  const hasPlus = hasPremiumAccess(subscription);
  const runtime = useRuntimeRecord();

  const ready = Boolean(status?.configured && status?.reachable && status?.modelInstalled);

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/tekai", { cache: "no-store" });
      setStatus((await response.json()) as ProviderStatus);
    } catch {
      setStatus({ configured: false, provider: "ollama", model: "", local: true, reachable: false, modelInstalled: false, message: "Could not read TeKAI status." });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/tekai", { cache: "no-store" });
        const data = (await response.json()) as ProviderStatus;
        if (active) {
          setStatus(data);
          setChecking(false);
        }
      } catch {
        if (active) {
          setStatus({ configured: false, provider: "ollama", model: "", local: true, reachable: false, modelInstalled: false, message: "Could not read TeKAI status." });
          setChecking(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const patchMessage = (id: string, patch: (message: ChatUIMessage) => Partial<ChatUIMessage>) =>
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...patch(message) } : message)));

  const runAssistant = async (history: ChatMessage[]) => {
    const id = uid();
    setMessages((current) => [...current, { id, role: "assistant", content: "", status: "streaming" }]);
    setStreamingId(id);
    setNotice("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/tekai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ messages: history, mode, stream: true }),
      });
      if (!response.ok || !response.body) throw new Error("transport");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let received = false;
      // Batch deltas: multiple state updates per token chunk re-render the
      // whole chat on every chunk. Accumulate locally, then flush once per
      // network read so a Celeron-class machine stays responsive.
      let pending = "";

      const flush = () => {
        if (!pending) return;
        const text = pending;
        pending = "";
        patchMessage(id, (message) => ({ content: message.content + text }));
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim()) as ChatStreamEvent;
          if (payload.type === "meta") {
            patchMessage(id, () => ({ meta: `${payload.provider} · ${payload.model}` }));
          } else if (payload.type === "delta") {
            received = true;
            pending += payload.text;
          } else if (payload.type === "error") {
            flush();
            patchMessage(id, () => ({ status: "error", content: payload.message, meta: payload.code }));
          }
        }
        flush();
      }
      flush();

      patchMessage(id, (message) =>
        message.status === "streaming"
          ? { status: received ? "done" : "error", content: message.content || "TeKAI couldn't generate a response. Please try again." }
          : {},
      );
    } catch {
      const aborted = controller.signal.aborted;
      patchMessage(id, (message) => {
        if (aborted) return { status: "stopped", content: message.content || "_Generation stopped._" };
        if (message.status === "error") return {};
        return { status: "error", content: message.content || "Something went wrong while contacting TeKAI. Please try again.", meta: "error" };
      });
    } finally {
      setStreamingId(null);
      abortRef.current = null;
    }
  };

  // Only the most recent turns are sent: the server trims this to its own
  // prompt budget anyway (HISTORY_CHAR_BUDGET in lib/ai/systemPrompt.ts), and a
  // shorter request keeps the low-spec machine responsive. Follow-ups ("What
  // about Ubuntu?", "explain that in detail", "show me a diagram") still
  // resolve their subject from these turns.
  const buildHistory = (list: ChatUIMessage[]): ChatMessage[] =>
    list
      .filter((message) => message.id !== "welcome" && message.content.trim().length > 0 && message.status !== "error")
      .map((message) => ({ role: message.role, content: message.content }))
      .slice(-6);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || streamingId) return;
    setInput("");

    if (isExplicitNoteRequest(trimmed)) {
      const asked: ChatUIMessage = { id: uid(), role: "user", content: trimmed, status: "done" };
      setMessages((current) => [...current, asked]);
      if (!auth.isLoggedIn || !auth.email) {
        setMessages((current) => [...current, { id: uid(), role: "assistant", status: "done", meta: "note", content: "Please sign in to save notes — they are stored under your account on this device." }]);
        return;
      }
      const previous = [...messages].reverse().find((message) => message.role === "assistant" && message.status === "done" && message.content.trim().length > 0);
      const custom = trimmed.match(/:\s*([\s\S]+)$/)?.[1]?.trim();
      const content = custom || previous?.content || "";
      if (!content) {
        setMessages((current) => [...current, { id: uid(), role: "assistant", status: "done", meta: "note", content: "There is no explanation to save yet. Ask a question first, then say \"save this as a note\"." }]);
        return;
      }
      const category = getNoteCategory(`${trimmed} ${content}`);
      saveNote(auth.email, { title: `${category} study note`, content, category });
      const progress = readProgress(auth.email);
      saveProgress(auth.email, { savedNotes: progress.savedNotes + 1 });
      setMessages((current) => [...current, { id: uid(), role: "assistant", status: "done", meta: "note", content: `✓ Saved to your **${category}** notes.` }]);
      return;
    }

    const asked: ChatUIMessage = { id: uid(), role: "user", content: trimmed, status: "done" };
    const next = [...messages, asked];
    setMessages(next);
    await runAssistant(buildHistory(next));
  };

  const stop = () => abortRef.current?.abort();

  const retry = async () => {
    if (streamingId) return;
    const index = [...messages].map((message) => message.role).lastIndexOf("user");
    if (index < 0) return;
    await runAssistant(buildHistory(messages.slice(0, index + 1)));
  };

  // Message bubbles are memoized (see MemoMessageBubble), so their props have to
  // stay referentially stable. `retry` closes over the current message list and
  // therefore changes on every streamed chunk; route it through a ref and hand
  // React one stable callback instead.
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  });
  const retryStable = useCallback(() => void retryRef.current(), []);

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([getWelcomeMessage()]);
    setNotice("");
  };

  const selectMode = (next: string) => {
    setMode(next);
    setNotice(next === "Expert" && !hasPlus ? "Expert depth is part of CyberTeKa Plus. TeKAI will still answer at this depth." : "");
  };

  const statusTone = ready
    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
    : checking
      ? "border-white/10 bg-white/5 text-slate-300"
      : "border-amber-300/25 bg-amber-300/10 text-amber-100";
  const statusText = checking
    ? "Checking the local AI service…"
    : ready
      ? `Local model ready · ${status?.provider} · ${status?.model}`
      : status?.message ?? "The local AI service is not available.";

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">AI tutor</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">TeKAI</h1>
              <p className="mt-3 max-w-3xl text-slate-300">
                An IT, cybersecurity and software-engineering tutor powered by a local AI model on this device. No cloud API key is required and your questions stay on your machine.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full border px-3 py-1.5 ${statusTone}`}>{ready ? "Local AI ready" : checking ? "Checking…" : "Local AI unavailable"}</span>
                <span className="text-slate-500">{statusText}</span>
                <button type="button" onClick={() => void refreshStatus()} className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition hover:text-white">Recheck</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {explanationModes.map((item) => (
                <button key={item} type="button" onClick={() => selectMode(item)} aria-pressed={mode === item} className={`rounded-full border px-3 py-2 text-xs transition ${mode === item ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]" : "border-white/10 bg-[#151c22] text-slate-300 hover:text-white"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          {notice && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">{notice}</p>}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
          <section className="flex min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11151b]">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
              {messages.map((message) => (
                <MemoMessageBubble key={message.id} message={message} onRetry={retryStable} />
              ))}
            </div>

            {!ready && !checking && (
              <div className="mx-4 mb-2 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100 sm:mx-5">
                TeKAI is currently unavailable because the local AI service could not be reached. Start Ollama and make sure your configured model is installed, then press <strong>Recheck</strong>. TeKAI never sends your question to a cloud service.
              </div>
            )}

            <div className="border-t border-white/10 p-4 sm:p-5">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Ask TeKAI anything…"
                className="w-full resize-y rounded-2xl border border-white/10 bg-[#0d1217] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#f4c65a]/40 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Enter to send · Shift+Enter for a new line</span>
                <div className="flex gap-2">
                  {streamingId ? (
                    <button type="button" onClick={stop} className="rounded-2xl border border-rose-300/30 bg-rose-300/10 px-5 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/15">Stop</button>
                  ) : (
                    <button type="button" onClick={() => void send()} className="rounded-2xl bg-[#f4c65a] px-5 py-2.5 text-sm font-semibold text-[#11151b] transition hover:bg-[#f7d97d]">Send</button>
                  )}
                  <button type="button" onClick={clearChat} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white">Clear</button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            {runtime.report && (
              <div className="rounded-3xl border border-emerald-300/20 bg-[#0d1415] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Lab context · simulated terminal</p>
                <h2 className="mt-2 text-lg font-semibold text-white">{runtime.report.labTitle}</h2>
                <p className="mt-2 break-all font-mono text-xs text-emerald-100">$ {runtime.report.command}</p>
                {runtime.report.error && <p className="mt-3 rounded-lg border border-rose-300/15 bg-rose-300/5 p-3 text-xs leading-5 text-rose-100">{runtime.report.error}</p>}
                {!runtime.report.error && <p className="mt-3 text-xs text-slate-400">{runtime.report.matchedExpectedOutput ? "Expected lab output matched." : "Ask TeKAI about the latest simulated command."}</p>}
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">What TeKAI can help with</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {topics.map((topic) => (
                  <li key={topic} className="rounded-xl border border-white/10 bg-[#151c22] px-3 py-2">• {topic}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Try asking</p>
              <div className="mt-4 space-y-3">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => setInput(prompt)} className="w-full rounded-xl border border-white/10 bg-[#151c22] px-3 py-2 text-left text-sm text-slate-200 transition hover:border-[#f4c65a]/30 hover:text-white">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5 text-xs leading-5 text-slate-400">
              <p className="uppercase tracking-[0.22em] text-[#f4c65a]">Local-first &amp; private</p>
              <p className="mt-3">TeKAI answers using a local model through Ollama. Nothing is sent to a cloud service, and no API key is required. To save an explanation, just ask: &ldquo;save this as a note&rdquo;.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
