import type { ChatMessage, ChatPolicy, DetailLevel } from "./types";

// Single source of truth for TeKAI's behaviour. Edit here, not in components.
// The system prompt is kept compact for TinyLlama: response length is steered
// per-request by the detail/diagram instructions appended in buildTeKaiMessages.

// --- Response-policy detection (server-side, regex only — no cloud call) ---

// Tuned thresholds for a small local model on low-RAM hardware:
//
// - An explicit request always wins. "briefly" ("short answer", "in one
//   paragraph") gives the shortest answer; "in detail" ("go deeper", "explain
//   everything", "beginner to advanced") gives the fullest. When a message
//   contains both, the shorter one wins — it is the cheaper and the more
//   deliberate instruction.
// - SIMPLE_PATTERN is intentionally strict: one short factual question only
//   (≤120 characters, ≤27 words) → BRIEF.
// - MODERATE_PATTERN channels "how does X work?" questions to NORMAL.
// - Everything else defaults to NORMAL; questions that are clearly long or
//   multi-part (≥45 words, 4+ "?" segments, or a two-part "explain … and how
//   to …" request) escalate to DETAILED.

// Simple question: "what is X?" / "what's X?" / "what does X do?"
// (120 chars or fewer, no how/why/explain/compare/detail words).
const SIMPLE_PATTERN =
  /^\s*what\s+(?:is|are|does|do)\s+(?:an?\s+|the\s+)?[a-z0-9][a-z0-9 .,'’\-/]{0,90}\??\s*$/i;

// Moderate question: "how does X work?" — deserves steps, not a short blurb.
const MODERATE_PATTERN = /\bhow\s+does\b/i;

const DETAIL_PATTERN =
  /\b(in detail|detailed(ly)?|deep dive|go deeper|deeper|deeply|everything about|explain everything|full explanation|all the details|beginner to advanced|teach me (this |that |properly|everything)|step[- ]by[- ]step|comprehensive|thoroughly|explain (deeply|everything)|go into (more |greater )?detail|tell me more|give me (all|more)( the)? details|explain (normally\b.*\bdetail|that in detail)|internally|and how to)\b/i;

const BRIEF_PATTERN =
  /\b(briefly|brief answer|brief explanation|short answer|keep it short|keep this short|in short|quick(ly)?|quick explanation|in simple terms|in one paragraph|short version|explain (this |that )?briefly|summar(y|ise|ize)( briefly| in one)?)\b/i;

const DIAGRAM_PATTERN =
  /\b(diagrams?|visualiz(e|ation)s?|visualise|visuals?|draw( it| this)?|show( me)? (the |a )?(flow|diagram|picture|visual)s?|flow ?charts?|with (a |some )?diagrams?|explain this with|show me how it works|architecture diagrams?|packet flow)\b/i;

const LAB_PATTERN =
  /\b(practical |hands[- ]on )?(lab|exercise|practice task|mini[ -]?exercise|challenge|walk ?through|give me steps to try|show me how to practice)\b|give me a practical lab|(practical|hands[- ]on|real[- ]world|worked) examples?\b/i;

// "Explain ... like I'm a <level>" / "explain simply". The subject may sit
// between "explain" and "like" ("Explain Linux like I'm a beginner"), so we
// key off the "like I'm <level>" phrase itself rather than requiring the two
// words to be adjacent — otherwise natural phrasings silently miss the intent.
const LEVEL_PATTERN =
  /\blike i(?:'| a)?m (?:a |an )?(?:beginner|new|intermediate|advanced|expert|kid|child|professional|cybersecurity professional|five|5)\b|\bexplain (?:this |that |it )?simply\b/i;

// Within an "explain like I'm X" request the level word chooses the depth:
// advanced/professional wants a fuller answer, beginner/five wants a shorter,
// simpler one. Intermediate falls through to the normal budget.
const ADVANCED_LEVEL_PATTERN = /\b(advanced|expert|professional|senior|graduate)\b/i;
const BEGINNER_LEVEL_PATTERN = /\b(beginner|basic|kid|child|five|5|simple|simply)\b/i;

export type TeKaiPolicy = { detail: DetailLevel; wantsDiagram: boolean; wantsLab: boolean };

/**
 * Derive response depth + diagram/lab intent from the latest user message.
 *
 * Order matters for speed and focus:
 *  1. Explicit user request (brief / detailed / diagram / lab) always wins.
 *  2. Short "what is X?" factual questions default to BRIEF (fewer tokens = faster).
 *  3. "How does X work?" questions default to NORMAL.
 *  4. Everything else (why/explain/compare/multi-sentence) defaults to NORMAL;
 *     truly long or multi-part questions escalate to DETAILED.
 */
export const detectPolicy = (text: string): TeKaiPolicy => {
  const value = text.trim();
  const wordCount = value.split(/\s+/).filter(Boolean).length;
  // "briefly" is checked first: an explicit request to keep it short is both
  // the cheaper and the more deliberate instruction when the two conflict
  // ("explain briefly how TCP works internally").
  const explicitDetail: DetailLevel | null = BRIEF_PATTERN.test(value)
    ? "brief"
    : DETAIL_PATTERN.test(value)
      ? "detailed"
      : null;
  const wantsDiagram = DIAGRAM_PATTERN.test(value);
  const wantsLab = LAB_PATTERN.test(value);

  if (explicitDetail) return { detail: explicitDetail, wantsDiagram, wantsLab };
  if (wordCount <= 27 && SIMPLE_PATTERN.test(value)) return { detail: "brief", wantsDiagram, wantsLab };
  if (MODERATE_PATTERN.test(value) && wordCount <= 30) return { detail: "normal", wantsDiagram, wantsLab };
  if (LEVEL_PATTERN.test(value)) {
    // "Explain like I'm a cybersecurity professional" → detailed;
    // "explain like I'm five" → brief; intermediate → the normal budget.
    const level: DetailLevel = ADVANCED_LEVEL_PATTERN.test(value)
      ? "detailed"
      : BEGINNER_LEVEL_PATTERN.test(value)
        ? "brief"
        : "normal";
    return { detail: level, wantsDiagram, wantsLab };
  }
  if (wordCount >= 45 || value.split("?").length > 3) return { detail: "detailed", wantsDiagram, wantsLab };
  return { detail: "normal", wantsDiagram, wantsLab };
};

// Output-token budget matched to depth: smaller = faster on low RAM.
// Tuned to real speeds measured on the Celeron N2930 (~1.4 tok/s incl. prompt
// eval): brief = ~2 min, normal = ~5-6 min, detailed = ~7-9 min.
// A diagram request adds a block of ASCII rows plus its step-by-step
// explanation on top of the explanation itself, so it gets a little more room —
// the diagram is extra content, never a replacement for the answer.
export const maxTokensFor = (detail: DetailLevel, wantsDiagram = false): number => {
  const base = detail === "brief" ? 160 : detail === "detailed" ? 560 : 440;
  return base + (wantsDiagram ? 80 : 0);
};





// --- System prompt ---

// Single source of truth for TeKAI's behaviour. Edit here, not in components.
// Kept short and direct on purpose: long system prompts overwhelm small
// local models like TinyLlama and slow them down on low-RAM machines.
export const TEKAI_SYSTEM_PROMPT = `You are TeKAI, the CyberTeKa learning assistant for IT, cybersecurity, programming and Linux.

Rules:
- Start directly with the answer. No filler ("Great question", "Let's dive in").
- Answer the exact question first, in the first sentence. Never add unrelated topics.
- After you answer, end with ONE short line offering 2-4 clearly related next topics the user can pick from (e.g. "Want to go deeper? → Linux terminal, Linux file system"). Never expand on them, and keep the answer itself focused.
- Be precise and technically correct. State the exact fact asked for, with no padding or guessing. Do not invent commands, APIs, CVEs or facts. If unsure, say "I'm not certain about that detail."
- Windows and Linux use different kernels. Never claim they share a kernel.
- Explain each idea once. Do not repeat the same point in different words.
- Use simple language. Explain jargon. Mention cybersecurity relevance ONLY when it genuinely applies.
- For code, use a fenced code block with a language tag. Explain the important lines.
- Never write to Notes yourself. Never claim you saved anything.
- For security topics, teach for defence, labs and authorized testing only.`;

export type TopicCategory =
  | "IT"
  | "Linux"
  | "Networking"
  | "Cybersecurity"
  | "Programming"
  | "Software Engineering"
  | "Web Development"
  | "Cloud"
  | "DevOps"
  | "Databases"
  | "Troubleshooting"
  | "Security Lab"
  | "General";

const TOPIC_PATTERNS: Array<{ topic: TopicCategory; pattern: RegExp }> = [
  { topic: "Security Lab", pattern: /\b(lab|labs|ctf|sandbox|exercise|practice)\b/i },
  { topic: "Linux", pattern: /\b(linux|ubuntu|debian|fedora|arch|kali|kernel|distro|distribution|bash|shell|chmod|chown|systemd|apt|permission)\b/i },
  { topic: "Networking", pattern: /\b(network|networking|tcp|udp|ip address|ipv4|ipv6|subnet|dns|dhcp|http|https|tls|port|router|switch|firewall|packet|vpn)\b/i },
  { topic: "Cybersecurity", pattern: /\b(security|cybersecurity|malware|ransomware|phishing|xss|sql injection|csrf|ssrf|exploit|vulnerability|threat|siem|incident|forensics|osint|penetration|privilege escalation|cryptography|encryption|hashing)\b/i },
  { topic: "Databases", pattern: /\b(database|sql|mysql|postgres|sqlite|mongodb|query|index)\b/i },
  { topic: "Web Development", pattern: /\b(html|css|react|next\.?js|vue|angular|frontend|front-end|dom|browser)\b/i },
  { topic: "Programming", pattern: /\b(python|javascript|typescript|java\b|c\+\+|c#|golang|\bgo\b|rust|php|function|variable|loop|array|algorithm|data structure|debug)\b/i },
  { topic: "DevOps", pattern: /\b(docker|kubernetes|k8s|ci\/cd|devops|pipeline|container)\b/i },
  { topic: "Cloud", pattern: /\b(cloud|aws|azure|gcp|serverless|virtual machine|virtualization)\b/i },
  { topic: "Software Engineering", pattern: /\b(api|rest|graphql|git|github|architecture|design pattern|testing|refactor)\b/i },
  { topic: "IT", pattern: /\b(cpu|ram|memory|storage|ssd|hdd|operating system|windows|macos|server|hardware|motherboard|bios|process|file system|filesystem)\b/i },
];

/** Lightweight topic hint. Used only to steer the model; never to hard-code answers. */
export const detectTopic = (text: string): TopicCategory => {
  for (const { topic, pattern } of TOPIC_PATTERNS) {
    if (pattern.test(text)) return topic;
  }
  return "General";
};

export const buildSystemMessage = (mode: string, topic: TopicCategory): string =>
  `${TEKAI_SYSTEM_PROMPT}\n\nRequested depth: ${mode}.\nDetected topic area: ${topic}.`;

// --- Prompt-size budget -----------------------------------------------------
//
// Prompt evaluation costs about the same as generation on this hardware
// (~1.4 tok/s), so a long conversation is a long wait even when the answer
// itself is short: "What is RAM?" after a detailed lesson would otherwise pay
// for the whole lesson before writing a word. The conversation is therefore
// capped by SIZE, not just by message count.
//
// Recent turns are what carry follow-up context ("What about Ubuntu?" →
// "explain that in detail"), so older turns are trimmed to their opening lines
// — where the subject is stated — instead of being dropped wholesale, and the
// live question is never trimmed. ~2400 characters is roughly 650 tokens,
// which leaves the 2048-token window (see generationOptions.numCtxFor) plenty
// of room for the largest answer budget.
export const HISTORY_CHAR_BUDGET = 2_400;
export const HISTORY_MESSAGE_CHARS = 700;

/**
 * Keep the newest turns within the prompt budget, oldest first out. The live
 * question is always kept in full: it is the thing being answered.
 */
const trimHistory = (history: ChatMessage[]): ChatMessage[] => {
  const kept: ChatMessage[] = [];
  let budget = HISTORY_CHAR_BUDGET;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    const isLiveQuestion = index === history.length - 1;
    const content = isLiveQuestion ? message.content : message.content.slice(0, HISTORY_MESSAGE_CHARS);
    if (!isLiveQuestion && kept.length > 0 && content.length > budget) break;
    kept.unshift({ role: message.role, content });
    budget -= content.length;
  }
  return kept;
};

/** Assemble the final message list sent to the provider. */
export const buildTeKaiMessages = (
  history: ChatMessage[],
  mode: string,
  policy?: TeKaiPolicy,
): { messages: ChatMessage[]; policy: Required<Omit<ChatPolicy, "maxTokens">> & Pick<ChatPolicy, "maxTokens"> } => {
  // Trim first: every later step (topic hint, diagram anchor) reads the trimmed
  // conversation, so the prompt can never grow past the budget above.
  const trimmed = trimHistory(history);
  const lastUser = [...trimmed].reverse().find((message) => message.role === "user");
  const topic = lastUser ? detectTopic(lastUser.content) : "General";
  const detected = policy ?? detectPolicy(lastUser?.content ?? "");
  const detail: DetailLevel = detected.detail;
  const wantsDiagram = detected.wantsDiagram;
  const wantsLab = detected.wantsLab;
  const lines: string[] = [];

  // Every one of these lines costs prompt tokens on a machine that evaluates
  // prompt tokens at roughly the speed it generates them, so they are worded as
  // tightly as they can be while still holding the behaviour the probes check.
  if (detail === "brief") {
    lines.push("RESPONSE LENGTH: brief. One short paragraph, at most 5 sentences, plus one short example.");
  } else if (detail === "detailed") {
    lines.push(
      "RESPONSE LENGTH: detailed. Teach thoroughly with headings: definition, how it works, key steps or components, example, cybersecurity relevance, common mistakes.",
    );
  } else {
    lines.push(
      "RESPONSE LENGTH: normal. Keep this compact: a direct answer, at most three short sections, one short example, cybersecurity relevance only when it applies.",
    );
  }

  if (wantsDiagram) {
    lines.push(
      "The user asked for a diagram, so for this request the diagram IS the answer: the very first characters of your reply must be the ```text fence itself. Write the fence first, draw ONE compact ASCII diagram inside it using plain text characters (boxes and arrows, showing every party involved, at most 10 rows and 60 columns), close the fence with ```, then explain each step below it. Never use image links or markdown image syntax.",
    );
  } else {
    lines.push("Do not include a diagram unless the user asked for one.");
  }

  // Final line: small models weight the last instruction most heavily.
  lines.push(
    "Start with the answer itself: never 'Sure', 'Great question' or any preamble, and never restate the request. Do not repeat yourself, and finish your last sentence cleanly.",
  );

  if (wantsLab) {
    lines.push(
      "The user asked for a practical lab: ONE short hands-on exercise, numbered steps, the commands to run and what to expect, safe for a local practice environment.",
    );
  }

  // Diagram requests get a short few-shot exchange placed directly before the
  // live question: the assistant turn immediately preceding the question is
  // the strongest format anchor a small model has, and that example answer
  // opens with the ``` fence we need. Topic-neutral content anchors the
  // SHAPE (fence first, boxes and arrows, explanation below), not specifics.
  const diagramExample: ChatMessage[] =
    wantsDiagram && trimmed[trimmed.length - 1]?.role === "user"
      ? [
          { role: "user", content: "Draw a simple request–reply exchange as an ASCII diagram." },
          {
            role: "assistant",
            content:
              "```text\n[Sender]             [Receiver]\n  |---- request ----->|\n  |<--- response -----|\n```\nThe sender transmits a request and the receiver replies, showing the whole flow between both parties.",
          },
        ]
      : [];
  const conversation =
    diagramExample.length > 0
      ? [...trimmed.slice(0, -1), ...diagramExample, trimmed[trimmed.length - 1]]
      : trimmed;

  return {
    messages: [
      { role: "system", content: `${buildSystemMessage(mode, topic)}\n\n${lines.join("\n")}` },
      ...conversation,
    ],
    policy: { detail, wantsDiagram, wantsLab, maxTokens: maxTokensFor(detail, wantsDiagram) },
  };
};
