// Shared AI provider contract. Types only — safe to import from client and server.

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = { role: ChatRole; content: string };

/** Response gear requested by the user: simple/short, default, or detailed. */
export type DetailLevel = "brief" | "normal" | "detailed";

/** Response policy derived from each user message. Sent to the model as options. */
export type ChatPolicy = {
  detail: DetailLevel;
  wantsDiagram: boolean;
  maxTokens: number;
  /** True when the user asked for a hands-on lab / exercise. Prompt-only hint. */
  wantsLab?: boolean;
};

export type AIErrorCode =
  | "not-configured"
  | "unreachable"
  | "model-missing"
  | "timeout"
  | "generation-failed"
  | "malformed";

export type ProviderStatus = {
  /** A provider is selected and has the configuration it needs. */
  configured: boolean;
  /** Provider id, e.g. "ollama". */
  provider: string;
  /** Model name in use (never a secret). */
  model: string;
  /** True when the provider runs locally (no internet / no API key). */
  local: boolean;
  /** The provider service answered a health check. */
  reachable: boolean;
  /** The configured model is present on the provider. */
  modelInstalled: boolean;
  /** Short, user-safe note about the current state. */
  message?: string;
};

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  readonly local: boolean;
  /** Single, non-streamed completion. */
  chat(messages: ChatMessage[], signal: AbortSignal, policy?: ChatPolicy): Promise<string>;
  /** Streamed completion that yields text deltas as they arrive. */
  streamChat(messages: ChatMessage[], signal: AbortSignal, policy?: ChatPolicy): AsyncGenerator<string, void, unknown>;
  /** Health/diagnostic check. Never throws. */
  status(): Promise<ProviderStatus>;
}

// Wire protocol used by /api/tekai (server-sent events).
export type ChatStreamEvent =
  | { type: "meta"; provider: string; model: string }
  | { type: "delta"; text: string }
  | { type: "error"; code: AIErrorCode; message: string }
  | { type: "done" };
