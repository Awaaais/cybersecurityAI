import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider } from "./openai";
import type { AIProvider, ProviderStatus } from "./types";

/**
 * Provider registry. Ollama (local, no API key) is the default.
 * Adding a provider later = add one class + one line here; the UI never changes.
 */
export type ProviderId = "ollama" | "openai-compatible";

export const getProvider = (): AIProvider | null => {
  const explicit = process.env.TEKAI_PROVIDER?.trim().toLowerCase();

  if (explicit === "openai" || explicit === "openai-compatible" || explicit === "custom") {
    const baseUrl = process.env.TEKAI_API_URL?.trim();
    const apiKey = process.env.TEKAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!baseUrl && !apiKey) return null;
    return new OpenAICompatibleProvider({ baseUrl, apiKey });
  }

  // Default: local Ollama. No key, no cloud dependency.
  return new OllamaProvider();
};

export const getProviderStatus = async (): Promise<ProviderStatus> => {
  const provider = getProvider();
  if (!provider) {
    return {
      configured: false,
      provider: "none",
      model: "",
      local: true,
      reachable: false,
      modelInstalled: false,
      message: "No AI provider is configured.",
    };
  }
  return provider.status();
};
