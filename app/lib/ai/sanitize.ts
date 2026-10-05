// app/lib/ai/sanitize.ts — deterministic output cleanup for TeKAI answers.
//
// The prompt ASKS the model to follow these rules; this module ENFORCES them,
// because a small local model cannot be trusted to comply every single time.
// Deliberately dependency-free (zero imports) so it can be unit-probed directly
// with `node --experimental-strip-types`.

// TinyLlama often opens with filler ("Sure,", "Great question!") no matter how
// the prompt words the rule, so we also strip it deterministically at the
// source. Conservative: only removes leading filler tokens + separators, and
// only at the very start of the answer.
const LEADING_FILLER =
  /^\s*(?:(?:sure(?: thing)?|certainly|absolutely|of course|great question|great|good question)[!,.\-]?(?:\s+|$))+/i;

// Small models occasionally answer by FILLING IN our own prompt labels
// ("RESPONSE LENGTH: …", "Detected topic area: …", "USER QUESTION: …" — all
// seen live, verbatim from the instructions). Those lines are scaffolding,
// never the answer, so leading occurrences are dropped. Anchored at ^ only
// (no /m): the same words mid-answer are legitimate prose (e.g. a quiz line
// starting "Question: …" must survive).
const ECHOED_LABEL =
  /^\s*(?:response (?:level|length|format|style)|requested depth|detected topic area|user question|support photographs)\s*:[^\n]*\n?/i;

/**
 * Strip everything that may precede the real answer: echoed prompt labels and
 * filler, in either order (removing one can expose the other), repeatedly.
 */
export const stripLeadingFiller = (text: string): string => {
  let out = text;
  for (;;) {
    const next = out.replace(ECHOED_LABEL, "").replace(LEADING_FILLER, "");
    if (next === out) return out;
    out = next;
  }
};

// --- Diagram hygiene (applies only when the user asked for a diagram) ------
//
// Two failure modes observed from TinyLlama on diagram requests:
//   1. A lead-in before the ``` fence ("Here is a diagram…", "[Diagram]",
//      filler, echoed prompt labels), which the spec forbids — the fence must
//      open the answer. The completed-answer path drops EVERYTHING in front
//      of the first fence; if there is no fence at all the text is prose and
//      is kept (never delete content for nothing). The stream path can only
//      retract what it has not sent yet, so it holds output for up to
//      FENCE_WAIT_MAX chars waiting for the fence, then lets prose through.
//   2. An image link (e.g. an imgur URL) instead of / next to the ASCII art.
//      Images are dropped at the source: diagrams must be plain text, and an
//      external image would leak the request off this machine.
// How long the stream waits for the fence before concluding "this is prose".
const FENCE_WAIT_MAX = 400;

// Markdown image links are forbidden in diagram answers, and rendering one in
// the UI would fire an off-machine request. Observed forms: ![alt](url), and
// a space after the bang (! [](url)) — TinyLlama emits both. Strip every
// complete reference; hold a trailing partial one (references can split
// across stream deltas) until it completes or grows implausibly long.
const IMAGE_LINK = /!\s*\[[^\]\n]*\]\([^)\n]*\)/g;
const IMAGE_HOLD_MAX = 160;
// Trailing incomplete image reference: open bracket not yet closed, or
// bracket + url still missing the closing paren.
const TAIL_IMAGE = /!\s*(?:\[[^\]\n]*\]\([^)\n]*|\[[^\]\n]*)$/;

/**
 * Stream-safe image stripper: `push` returns the text that is safe to emit
 * now; a partial reference at the end of the buffer is held back until it
 * completes (or is proven not to be an image by exceeding IMAGE_HOLD_MAX).
 * `flush` drains the buffer and drops a still-incomplete tail — it is dead
 * markdown that would only render as garbage.
 */
export const createImageFilter = (): {
  push: (text: string) => string;
  flush: () => string;
} => {
  let pending = "";
  return {
    push(text: string) {
      pending += text;
      pending = pending.replace(IMAGE_LINK, "");
      const tail = pending.match(TAIL_IMAGE);
      const cut = tail?.index ?? -1;
      if (cut !== -1 && pending.length - cut <= IMAGE_HOLD_MAX) {
        const ready = pending.slice(0, cut);
        pending = pending.slice(cut);
        return ready;
      }
      const ready = pending;
      pending = "";
      return ready;
    },
    flush() {
      const out = pending.replace(IMAGE_LINK, "");
      pending = "";
      const tail = out.match(TAIL_IMAGE);
      return tail?.index === undefined ? out : out.slice(0, tail.index);
    },
  };
};

/**
 * Streaming variant: buffers only the beginning of the answer until the start
 * can be classified (filler ended, or no filler present), so the client sees a
 * clean first token without delaying the rest of the stream.
 *
 * In diagram mode (`holdForDiagramIntro`), output is held until the ``` fence
 * arrives: everything the model wrote in front of the fence ("Here is a
 * diagram…", "[Diagram]", filler) is dropped, so the fence opens the answer.
 * If FENCE_WAIT_MAX chars pass with no fence this is prose — let it through
 * rather than block forever; flush() does the same at end-of-stream.
 */
export const createPreambleFilter = (options?: { holdForDiagramIntro?: boolean }): {
  push: (delta: string) => string;
  flush: () => string;
} => {
  const holdForIntro = options?.holdForDiagramIntro ?? false;
  let buffer = "";
  let resolved = false;
  return {
    push(delta: string) {
      if (resolved) return delta;
      buffer += delta;
      if (holdForIntro) {
        const fence = buffer.indexOf("```");
        if (fence !== -1) {
          // Fence found — drop everything in front of it and open with it.
          resolved = true;
          const out = buffer.slice(fence);
          buffer = "";
          return out;
        }
        if (buffer.length < FENCE_WAIT_MAX) return ""; // wait for the fence
        // No fence arrived in time — this is prose; pass it through.
        resolved = true;
        const prose = stripLeadingFiller(buffer);
        buffer = "";
        return prose;
      }
      const settled = buffer.length >= 32 || /[.!?\n]/.test(buffer) || (buffer.length >= 4 && /,\s/.test(buffer));
      if (!settled) return "";
      resolved = true;
      const cleaned = stripLeadingFiller(buffer);
      // If everything so far was filler, keep buffering for the real answer.
      if (!cleaned) {
        resolved = false;
        buffer = "";
        return "";
      }
      buffer = "";
      return cleaned;
    },
    flush() {
      if (resolved) return "";
      resolved = true;
      const cleaned = stripLeadingFiller(buffer);
      buffer = "";
      return cleaned;
    },
  };
};

/** Full cleanup for a completed (non-streamed) diagram answer. */
export const sanitizeDiagramAnswer = (text: string): string => {
  const prose = stripLeadingFiller(text);
  const fence = prose.indexOf("```");
  // The fence must open the answer: drop EVERYTHING in front of the first
  // fence (lead-in, filler, echoed labels — none of it belongs before the
  // diagram). No fence at all → prose stays as the answer; images still go.
  const body = fence > 0 ? prose.slice(fence) : prose;
  return body.replace(IMAGE_LINK, "");
};
