import type { ChatMessage, ChatPolicy, DetailLevel } from "./types";

// Single source of truth for TeKAI's behaviour. Edit here, not in components.
// The system prompt is kept compact for TinyLlama: response length is steered
// per-request by the detail/diagram instructions appended in buildTeKaiMessages.

// --- Response-policy detection (server-side, regex only — no cloud call) ---

// Tuned thresholds for a small local model on low-RAM hardware:
//
// - SIMPLE_PATTERN is intentionally strict (one short factual question only,
//   ≤120 chars). Anything else falls through to the length rules below.
// - Questions ≤12 words default to BRIEF (short question = focused answer).
// - MODERATE_PATTERN channels "how does X work?" questions to NORMAL.
// - Questions with 13-34 words default to NORMAL.
// - Questions ≥35 words or with 4+ "?" segments default to DETAILED.

// Simple question: "what is X?" / "what's X?" / "what does X do?"
// (120 chars or fewer, no how/why/explain/compare/detail words).
const SIMPLE_PATTERN =
  /^\s*what\s+(?:is|are|does|do)\s+(?:an?\s+|the\s+)?[a-z0-9][a-z0-9 .,'’\-/]{0,90}\??\s*$/i;

// Moderate question: "how does X work?" — deserves steps, not a short blurb.
const MODERATE_PATTERN = /\bhow\s+does\b/i;

const DETAIL_PATTERN =
  /\b(in detail|detailed(ly)?|deep dive|go deeper|deeper|deeply|everything about|explain everything|full explanation|all the details|beginner to advanced|teach me (this |that |properly|everything)|step[- ]by[- ]step|comprehensive|thoroughly|explain (deeply|everything)|go into (more |greater )?detail|tell me more|give me (all|more)( the)? details|explain (normally\b.*\bdetail|that in detail))\b/i;

const BRIEF_PATTERN =
  /\b(briefly|brief answer|brief explanation|short answer|keep it short|keep this short|in short|quick(ly)?|quick explanation|in simple terms|in one paragraph|short version|explain (this |that )?briefly|summar(y|ise|ize)( briefly| in one)?)\b/i;

const DIAGRAM_PATTERN =
  /\b(diagrams?|visualiz(e|ation)s?|visualise|visuals?|draw( it| this)?|show( me)? (the |a )?(flow|diagram|picture|visual)s?|flow ?charts?|with (a |some )?diagrams?|explain this with|show me how it works|architecture diagrams?|packet flow)\b/i;

const LAB_PATTERN =
  /\b(practical |hands[- ]on )?(lab|exercise|practice task|mini[ -]?exercise|challenge|walk ?through|give me steps to try|show me how to practice)\b|give me a practical lab/i;

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
const BEGINNER_LEVEL_PATTERN = /\b(beginner|basic|kid|child|five|5|simple)\b/i;

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
  const explicitDetail: DetailLevel | null = DETAIL_PATTERN.test(value)
    ? "detailed"
    : BRIEF_PATTERN.test(value)
      ? "brief"
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
// Tuned to real speeds measured on the Celeron N2930 (~1.4 tok/s incl. prompt eval):
// brief ≈ 2 min, normal ≈ 5-6 min, detailed ≈ 7-9 min.
export const maxTokensFor = (detail: DetailLevel): number =>
  detail === "brief" ? 160 : detail === "detailed" ? 560 : 440;





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

/** Assemble the final message list sent to the provider. */
export const buildTeKaiMessages = (
  history: ChatMessage[],
  mode: string,
  policy?: TeKaiPolicy,
): { messages: ChatMessage[]; policy: Required<Omit<ChatPolicy, "maxTokens">> & Pick<ChatPolicy, "maxTokens"> } => {
  const lastUser = [...history].reverse().find((message) => message.role === "user");
  const topic = lastUser ? detectTopic(lastUser.content) : "General";
  const detected = policy ?? detectPolicy(lastUser?.content ?? "");
  const detail: DetailLevel = detected.detail;
  const wantsDiagram = detected.wantsDiagram;
  const wantsLab = detected.wantsLab;
  const lines: string[] = [];

  if (detail === "brief") {
    lines.push(
      "RESPONSE LENGTH: brief. Answer in at most 5 short sentences or one compact paragraph. No follow-up sections beyond one short example.",
    );
  } else if (detail === "detailed") {
    lines.push(
      "RESPONSE LENGTH: detailed. Teach thoroughly: definition, how it works, components/steps, examples, cybersecurity relevance, common mistakes. Use headings.",
    );
  } else {
    lines.push(
      "RESPONSE LENGTH: normal. Keep this compact: a direct answer, one short example, and cybersecurity relevance only when it applies.",
    );
  }

  if (wantsDiagram) {
    lines.push(
      "The user asked for a diagram — for this request the diagram IS the answer, so starting directly with the answer means starting directly with the diagram: the very first characters of your reply must be the three backticks of the ```text fence itself — write the fence first, then draw ONE ASCII diagram inside it using plain text characters, close the fence with ``` when the diagram ends, and explain each step below it. The diagram must show the complete flow, including every party involved (for example both client and server, with the arrows between them). Keep it compact: at most 10 rows and 60 characters wide. Never use image links or markdown image syntax — the diagram must be plain text you draw.",
    );
  } else {
    lines.push("Do not include a diagram unless it is essential to the explanation.");
  }

  // Final line: small models weight the last instruction most heavily.
  lines.push(
    "Start with the answer itself — the first words must NOT be a greeting, 'Sure', 'Great question' or any preamble. Never repeat a point you already made, never restate the request or these instructions, and finish your last sentence cleanly.",
  );

  if (wantsLab) {
    lines.push(
      "The user asked for a practical lab. Include ONE short hands-on exercise with numbered steps, the commands to run, and what to expect — suitable for a safe, local practice environment.",
    );
  }

  // Diagram requests get a short few-shot exchange placed directly before the
  // live question: the assistant turn immediately preceding the question is
  // the strongest format anchor a small model has, and that example answer
  // opens with the ``` fence we need. Topic-neutral content anchors the
  // SHAPE (fence first, boxes and arrows, explanation below), not specifics.
  const diagramExample: ChatMessage[] =
    wantsDiagram && history[history.length - 1]?.role === "user"
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
      ? [...history.slice(0, -1), ...diagramExample, history[history.length - 1]]
      : history;

  return {
    messages: [
      { role: "system", content: `${buildSystemMessage(mode, topic)}\n\n${lines.join("\n")}` },
      ...conversation,
    ],
    policy: { detail, wantsDiagram, wantsLab, maxTokens: maxTokensFor(detail) },
  };
};
