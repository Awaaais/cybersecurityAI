import { AIProviderError } from "./errors";
import type { AIProvider, ChatMessage, ChatPolicy, ProviderStatus } from "./types";

const STATUS_TIMEOUT_MS = 5_000;

/**
 * Generic OpenAI-compatible provider. Works with OpenAI, Groq, OpenRouter,
 * LM Studio, vLLM, and Ollama's /v1 endpoint. Optional — Ollama is the default.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly id = "openai-compatible";
  readonly label = "OpenAI-compatible API";
  readonly local: boolean;
  readonly model: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options?: { baseUrl?: string; apiKey?: string; model?: string }) {
    this.baseUrl = (options?.baseUrl ?? process.env.TEKAI_API_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.apiKey = options?.apiKey ?? process.env.TEKAI_API_KEY ?? "";
    this.model = (options?.model ?? process.env.TEKAI_MODEL ?? "gpt-4o-mini").trim();
    this.local = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(this.baseUrl);
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  private async post(messages: ChatMessage[], stream: boolean, signal: AbortSignal, policy?: ChatPolicy): Promise<Response> {
    const maxTokens = Math.max(80, Math.min(policy?.maxTokens ?? 480, 2000));
    try {
      return await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal,
        headers: this.headers(),
        body: JSON.stringify({ model: this.model, temperature: 0.3, max_tokens: maxTokens, stream, messages }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new AIProviderError("timeout");
      throw new AIProviderError("unreachable", error instanceof Error ? error.message : undefined);
    }
  }

  private async failFrom(response: Response): Promise<AIProviderError> {
    const detail = await response.text().catch(() => "");
    if (response.status === 404) return new AIProviderError("model-missing", detail.slice(0, 300));
    return new AIProviderError("generation-failed", `${response.status} ${detail}`.slice(0, 300));
  }

  async chat(messages: ChatMessage[], signal: AbortSignal, policy?: ChatPolicy): Promise<string> {
    const response = await this.post(messages, false, signal, policy);
    if (!response.ok) throw await this.failFrom(response);
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AIProviderError("malformed");
    return text;
  }

  async *streamChat(messages: ChatMessage[], signal: AbortSignal, policy?: ChatPolicy): AsyncGenerator<string, void, unknown> {
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
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let chunk: { choices?: Array<{ delta?: { content?: string } }> };
          try {
            chunk = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          } catch {
            continue;
          }
          const delta = chunk.choices?.[0]?.delta?.content;
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
    const base = { configured: true, provider: this.id, model: this.model, local: this.local };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/models`, { signal: controller.signal, headers: this.headers(), cache: "no-store" });
      return { ...base, reachable: response.ok, modelInstalled: response.ok, message: response.ok ? undefined : `Endpoint answered with status ${response.status}.` };
    } catch {
      return { ...base, reachable: false, modelInstalled: false, message: "Endpoint is not reachable." };
    } finally {
      clearTimeout(timer);
    }
  }
}
