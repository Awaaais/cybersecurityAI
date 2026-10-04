import type { AIErrorCode } from "./types";

/** Error thrown by providers. `code` is safe to surface; `detail` is for logs. */
export class AIProviderError extends Error {
  readonly code: AIErrorCode;
  readonly detail?: string;

  constructor(code: AIErrorCode, detail?: string) {
    super(code);
    this.name = "AIProviderError";
    this.code = code;
    this.detail = detail;
  }
}

/** User-facing messages. Keep raw server errors out of the UI. */
export const describeAIError = (code: AIErrorCode): string => {
  switch (code) {
    case "not-configured":
      return "TeKAI has no local AI service configured yet.\n\nInstall Ollama, start it, install a model, and set `OLLAMA_MODEL`. See `docs/tekai-ollama-setup.md`.";
    case "unreachable":
      return "TeKAI can't connect to the local AI service.\n\nPlease make sure Ollama is running, then try again. TeKAI never sends your question to a cloud service.";
    case "model-missing":
      return "The configured TeKAI model is not available.\n\nPlease make sure `tinyllama:latest` is installed in Ollama (`ollama list`), and that `OLLAMA_MODEL` matches it.";
    case "timeout":
      return "TeKAI took too long to respond.\n\nTinyLlama can be slow on low-RAM machines, especially on the first question while the model loads. Please try again — do not install a larger model, it would be slower here.";
    case "malformed":
      return "TeKAI received an unexpected response from the local AI service.\n\nCheck that `OLLAMA_BASE_URL` points at a compatible Ollama server.";
    case "generation-failed":
    default:
      return "TeKAI couldn't generate a response.\n\nPlease try again.";
  }
};
