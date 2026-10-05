// app/lib/ai/generationOptions.ts — every sampling/generation knob TeKAI sends
// to Ollama, kept in ONE dependency-free place (same trick as sanitize.ts) so it
// can be unit-probed directly with `node --experimental-strip-types`.
//
// Everything here is tuned for a small local model on LOW-SPEC hardware
// (Celeron N2930 @ 1.83 GHz, 3.8 GB RAM, tinyllama:latest ~637 MB). Two facts
// drive the whole design:
//
//  1. OUTPUT TOKENS ARE THE WAIT. This machine generates roughly 1-2 tokens per
//     second, so the answer budget must follow the question: "What is RAM?" must
//     not get the same budget as "Explain Linux permissions in detail". A
//     diagram adds a block of ASCII art plus its step-by-step explanation, so
//     diagram requests get a little extra room (see maxTokensFor).
//  2. THE PROMPT IS THE OTHER HALF OF THE WAIT. Prompt evaluation runs at the
//     same slow speed, so prompt size is budgeted as well (HISTORY_CHAR_BUDGET
//     in systemPrompt.ts, MAX_MESSAGE_CHARS in handler.ts) and num_ctx is held
//     CONSTANT: changing num_ctx between requests makes Ollama reload the model,
//     which costs far more than the handful of MB a smaller context would save.

import type { ChatPolicy } from "./types";

/** Context window (prompt + generated). tinyllama is trained for 2048 tokens. */
const DEFAULT_NUM_CTX = 2048;
/** Smallest context we will honour if the user overrides it. */
const MIN_NUM_CTX = 512;
/**
 * Keep the model loaded between questions. Loading 637 MB of weights from disk
 * again takes much longer on this machine than answering does, so the default
 * is deliberately long; Ollama's own default is only 5 minutes.
 */
const DEFAULT_KEEP_ALIVE = "30m";
/** Safety clamps around the policy budget, in tokens. */
const MIN_TOKENS = 80;
const MAX_TOKENS = 1200;

const clampInt = (raw: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
};

/** Context window in tokens. Override with OLLAMA_NUM_CTX on very low RAM. */
export const numCtxFor = (): number => clampInt(process.env.OLLAMA_NUM_CTX, DEFAULT_NUM_CTX, MIN_NUM_CTX, DEFAULT_NUM_CTX);

/** How long Ollama keeps the model in RAM after a request. */
export const keepAliveFor = (): string => process.env.OLLAMA_KEEP_ALIVE?.trim() || DEFAULT_KEEP_ALIVE;

export type GenerationOptions = {
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  num_predict: number;
  repeat_last_n: number;
  repeat_penalty: number;
};

/**
 * Map a response policy onto Ollama options.
 *
 * temperature — Diagram requests at very low temperature can lock into a
 *   degenerate box-drawing loop that burns the whole output budget (each line's
 *   indent tokens differ, so the repetition penalty can't catch it). 0.5 breaks
 *   that lock while staying grounded — at 0.6 the model started inventing facts
 *   (e.g. attributing TCP to Tim Berners-Lee); prose stays at 0.1 where accuracy
 *   matters most.
 * top_k — Narrow the candidate set: with fewer plausible next tokens a small
 *   model stays on-topic and factually steadier. Diagrams need a slightly wider
 *   set so box-drawing characters stay available.
 * num_predict — The depth budget from the question itself (see maxTokensFor):
 *   simple question, small budget, fast answer.
 * repeat_* — Small models lock into repetition loops that burn the whole budget
 *   and leave the answer cut mid-sentence; a penalty keeps generation moving.
 */
export const buildGenerationOptions = (policy?: ChatPolicy): GenerationOptions => {
  const wantsDiagram = policy?.wantsDiagram ?? false;
  const numPredict = Math.max(MIN_TOKENS, Math.min(policy?.maxTokens ?? 440, MAX_TOKENS));
  return {
    temperature: wantsDiagram ? 0.5 : 0.1,
    top_p: 0.9,
    top_k: wantsDiagram ? 60 : 30,
    num_ctx: numCtxFor(),
    num_predict: numPredict,
    repeat_last_n: 256,
    repeat_penalty: wantsDiagram ? 1.3 : 1.18,
  };
};
