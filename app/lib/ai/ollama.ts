import { AIProviderError } from "./errors";
import type { AIProvider, ChatMessage, ChatPolicy, ProviderStatus } from "./types";

const DEFAULT_BASE_URL = "http://localhost:11434";
const STATUS_TIMEOUT_MS = 5_000;

type OllamaStreamChunk = {
  message?: { content?: string };
  done?: boolean;
  error?: string;
};

/**
 * Talks to a local Ollama server over its native HTTP API.
 * Requires no API key and keeps all traffic on the user's machine.
 */
export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  readonly label = "Ollama (local)";
  readonly local = true;
  readonly model: string;

  private readonly baseUrl: string;

  constructor(options?: { baseUrl?: string; model?: string }) {
    this.baseUrl = (options?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = (options?.model ?? process.env.OLLAMA_MODEL ?? "").trim();
  }

  private async post(messages: ChatMessage[], stream: boolean, signal: AbortSignal, policy?: ChatPolicy): Promise<Response> {
    const maxTokens = Math.max(80, Math.min(policy?.maxTokens ?? 480, 1200));
    try {
      return await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream,
          // Tuned for small local models on low-resource machines:
          // low temperature for accuracy, small context window, and an
          // output budget that matches the question depth.
          options: {
            // Diagram requests at low temperature can lock into a degenerate
            // box-drawing loop that burns the whole output budget (each line's
            // indent tokens differ, so the repetition penalty can't catch it).
            // 0.5 breaks that lock while staying grounded — at 0.6 the model
            // started inventing facts (e.g. attributing TCP to Tim Berners-Lee);
            // prose stays at 0.1 where accuracy matters most — the lower the
            // temperature, the less the model drifts off the asked-for fact.
            temperature: policy?.wantsDiagram ? 0.5 : 0.1,
            top_p: 0.9,
            // Narrow the candidate set: with fewer plausible next tokens a small
            // model stays on-topic and factually steadier. Diagrams need a
            // slightly wider set so box-drawing characters stay available.
            top_k: policy?.wantsDiagram ? 60 : 30,
            num_ctx: 2048,
            num_predict: maxTokens,
            // Small models like TinyLlama can lock into a repetition loop that
            // burns the whole output budget and leaves the answer cut
            // mid-sentence; a repetition penalty keeps generation moving.
            repeat_last_n: 256,
            repeat_penalty: policy?.wantsDiagram ? 1.3 : 1.18,
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new AIProviderError("timeout");
      throw new AIProviderError("unreachable", error instanceof Error ? error.message : undefined);
    }
  }

  private async failFrom(response: Response): Promise<AIProviderError> {
    const detail = await response.text().catch(() => "");
    if (response.status === 404 || /not found|no such model|pull/i.test(detail)) {
      return new AIProviderError("model-missing", detail.slice(0, 300));
    }
    return new AIProviderError("generation-failed", `${response.status} ${detail}`.slice(0, 300));
  }

  async chat(messages: ChatMessage[], signal: AbortSignal, policy?: ChatPolicy): Promise<string> {
    if (!this.model) throw new AIProviderError("not-configured");
    const response = await this.post(messages, false, signal, policy);
    if (!response.ok) throw await this.failFrom(response);
    let data: OllamaStreamChunk;
    try {
      data = (await response.json()) as OllamaStreamChunk;
    } catch {
      throw new AIProviderError("malformed");
    }
    if (data.error) throw new AIProviderError("generation-failed", data.error);
    const text = data.message?.content?.trim();
    if (!text) throw new AIProviderError("malformed");
    return text;
  }

  async *streamChat(messages: ChatMessage[], signal: AbortSignal, policy?: ChatPolicy): AsyncGenerator<string, void, unknown> {
    if (!this.model) throw new AIProviderError("not-configured");
    const response = await this.post(messages, true, signal, policy);
    if (!response.ok) throw await this.failFrom(response);
    if (!response.body) throw new AIProviderError("malformed");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let emitted = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let chunk: OllamaStreamChunk;
          try {
            chunk = JSON.parse(trimmed) as OllamaStreamChunk;
          } catch {
            throw new AIProviderError("malformed");
          }
          if (chunk.error) throw new AIProviderError("generation-failed", chunk.error);
          const delta = chunk.message?.content;
          if (delta) {
            emitted = true;
            yield delta;
          }
        }
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new AIProviderError("timeout");
      throw new AIProviderError("generation-failed");
    } finally {
      reader.releaseLock();
    }

    if (!emitted) throw new AIProviderError("malformed");
  }

  async status(): Promise<ProviderStatus> {
    const base = { configured: Boolean(this.model), provider: this.id, model: this.model, local: true };
    if (!this.model) {
      return { ...base, reachable: false, modelInstalled: false, message: "OLLAMA_MODEL is not set." };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        return { ...base, reachable: false, modelInstalled: false, message: `Ollama answered with status ${response.status}.` };
      }
      const data = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
      const names = (data.models ?? []).map((entry) => entry.name ?? entry.model ?? "");
      const wanted = this.model.includes(":") ? this.model : `${this.model}:latest`;
      const installed = names.some(
        (name) => name === this.model || name === wanted || name.split(":")[0] === this.model,
      );
      return {
        ...base,
        reachable: true,
        modelInstalled: installed,
        message: installed ? undefined : `Model "${this.model}" is not installed.`,
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ...base,
        reachable: false,
        modelInstalled: false,
        message: aborted ? "Ollama did not respond in time." : "Ollama is not reachable.",
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
