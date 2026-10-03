"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useRuntimeRecord } from "../linux/runtime-store";
import { readProgress, saveProgress, useAuth } from "../components/auth-panel";
import { hasPremiumAccess, useSubscription } from "../components/subscription-store";
import { saveNote } from "../components/notes-store";

const topics = [
  "Networking and OSI",
  "Linux system controls",
  "Authentication and access",
  "Web security and XSS",
  "Malware and defense",
  "Incident response",
];

const quickPrompts = [
  "Explain HTTPS like I am brand new",
  "How does the OSI model work?",
  "What is least privilege in Linux?",
  "How does TLS protect data?",
  "Explain the difference between TCP and UDP",
  "Show me how authentication works",
];

const explanationModes = ["Beginner", "Standard", "Technical", "Expert"];

interface Message {
  role: "assistant" | "user";
  title: string;
  content: string;
  diagram?: string;
}

const diagramLibrary: Record<string, string> = {
  osi: `7   Application   ──── HTTP / DNS / Browser\n6   Presentation  ──── TLS / Encoding\n5   Session       ──── Session tokens\n4   Transport     ──── TCP / UDP\n3   Network       ──── IP / Routing\n2   Data Link     ──── MAC / Ethernet\n1   Physical      ──── Cables / Wi‑Fi`,
  https: `Client ── HTTPS Request ──> Server\n   │                           │\n   ├─ Validate certificate\n   ├─ Negotiate TLS keys\n   └─ Encrypt traffic`,
  auth: `User ── login request ──> App ── validate creds ──> DB\n      │                                     │\n      └── receive session token ─────────────┘`,
  linux: `Owner  Group  Others\n[rwx]  [r-x]  [r--]\nRead, write, execute for each class of user`,
  tcp: `TCP: 3-way handshake\nClient ── SYN ──> Server\nClient <- SYN/ACK <- Server\nClient ── ACK ──> Server\nReliable delivery and order`,
  udp: `UDP: lightweight, connectionless\nClient ── Data ──> Server\nServer ── Data ──> Client\nFast, but no guaranteed delivery`,
};

interface CourseAnswer {
  title: string;
  simple: string;
  technical: string;
  example?: string;
  relevance?: string;
  related?: string[];
  sources: string[];
  diagram?: string;
}

const courseAnswers: Array<{ matches: (question: string) => boolean; answer: CourseAnswer }> = [
  {
    matches: (question) => /\b(commands?|command line|shell commands?)\b|\b(pwd|ls|cd|mkdir|ps|ip|chmod)\b/.test(question),
    answer: {
      title: "Linux command reference",
      simple: "These course commands help navigate directories, inspect processes or networking, and manage permissions. Use them only on systems where you have permission.",
      technical: "The course lists these commands:\n\n```text\npwd  ls  cd  mkdir  chmod  ps  ip  ssh\n```\n\n- `pwd`: show the current working directory.\n- `ls`: list directory contents.\n- `cd`: move between directories.\n- `mkdir`: create a directory.\n- `chmod`: change file permissions and access rules.\n- `ps`: display running processes.\n- `ip`: inspect network interfaces and addresses.\n- `ssh`: connect securely to another system.",
      sources: ["Linux Learning — Commands"],
    },
  },
  {
    matches: (question) => /\b(ssh|secure shell)\b/.test(question),
    answer: {
      title: "SSH (Secure Shell)",
      simple: "SSH is a protocol for securely connecting to and operating a remote computer over an untrusted network. It encrypts the connection and commonly uses keys or passwords for authentication.",
      technical: "An SSH client negotiates an encrypted transport with an SSH server, then authenticates the user before opening a shell or forwarding an approved service. Verify host keys and protect private keys; this answer describes the protocol, not a command to access a system.",
      example: "A command like `ssh learner@host` starts a session: the client verifies the host key, authenticates, then opens a remote shell.",
      relevance: "SSH is a primary way administrators reach servers, so protecting keys and verifying host keys are everyday defensive tasks.",
      related: ["SSH keys and host verification", "Linux commands", "Authentication and sessions"],
      sources: ["Linux Learning — SSH", "Networking Fundamentals — Secure protocols"],
    },
  },
  {
    matches: (question) => /\b(tcp|udp)\b/.test(question),
    answer: {
      title: "TCP and UDP",
      simple: "Both are Layer 4 transport protocols. TCP focuses on reliable, ordered delivery; UDP has lower overhead and does not guarantee delivery.",
      technical: "The course describes TCP through its handshake and UDP through streaming. At this layer, port filtering and stateful inspection help regulate communication flows.",
      sources: ["Networking Fundamentals — OSI model, Layer 4: Transport", "Networking Fundamentals — Protocols"],
      diagram: diagramLibrary.tcp,
    },
  },
  {
    matches: (question) => /\bosi\b|network model|\blayer\s*[1-7]\b/.test(question),
    answer: {
      title: "The OSI model",
      simple: "The OSI model organizes network communication into seven layers, from physical signals to the applications people use. Each layer has a different responsibility.",
      technical: "The course maps the layers as Physical (bits), Data Link (frames), Network (packets), Transport (segments/datagrams), Session, Presentation, and Application. The model helps place protocols and security controls at the relevant layer.",
      sources: ["Networking Fundamentals — OSI model, Layers 1–7"],
      diagram: diagramLibrary.osi,
    },
  },
  {
    matches: (question) => /\b(https|tls|ssl)\b/.test(question),
    answer: {
      title: "HTTPS and TLS",
      simple: "TLS protects communication between endpoints. HTTPS is HTTP used with TLS, helping protect information while it travels between a client and a server.",
      technical: "The course associates TLS with the Presentation layer and describes it as protecting confidentiality and integrity. The networking lesson also lists HTTPS and TLS among its protocols.",
      sources: ["Networking Fundamentals — OSI model, Layer 6: Presentation", "Networking Fundamentals — Protocols", "Note: TLS"],
      diagram: diagramLibrary.https,
    },
  },
  {
    matches: (question) => /\b(auth|authentication|login|session|token)\b/.test(question),
    answer: {
      title: "Authentication and sessions",
      simple: "Authentication checks that a user or system is who it claims to be. A session maintains communication state after setup, so session identifiers need protection.",
      technical: "The course defines authentication as identity verification. Its Session layer material warns that session IDs must be protected against theft and fixation, and lists secure cookies, short timeouts, and token rotation as defenses.",
      sources: ["Note: Authentication", "Networking Fundamentals — OSI model, Layer 5: Session"],
      diagram: diagramLibrary.auth,
    },
  },
  {
    matches: (question) => /\bwhat (?:is|does) linux\b|\bwhat'?s linux\b|\bhow does linux work\b|\bexplain linux\b|\b(?:linux overview|linux operating system|linux basics|linux distros?|linux os|linux used for)\b/.test(question)
      && !/\b(permission|chmod|rwx|least privilege|sudo|chown|chgrp|users?|groups?|process(?:es)?|commands?|shell commands?)\b/.test(question),
    answer: {
      title: "What is Linux?",
      simple: "Linux is a family of operating systems built around the Linux kernel. It gives you a shell and a filesystem for working with a computer, and it runs many servers, cloud workloads, and security tools.",
      technical: "Linux itself is the kernel at the core of an operating system. A Linux distribution combines that kernel with system tools and applications into an installable system.",
      example: "Common distributions include Ubuntu (general purpose), Kali Linux (security testing), and Fedora (developer-focused).",
      relevance: "In cybersecurity, Linux runs most servers and cloud infrastructure and hosts many defensive and offensive tools, so shell and filesystem skills carry across the field.",
      related: ["Linux permissions", "Linux commands", "Linux processes", "Linux networking"],
      sources: ["Linux Learning — Linux for Cybersecurity Beginners"],
    },
  },
  {
    matches: (question) => /\b(chmod|rwx|permissions?|least privilege|sudo|chown|umask|suid|sgid|sticky bit)\b/.test(question),
    answer: {
      title: "Linux permissions and least privilege",
      simple: "Linux `rwx` permissions control who can read, write, or execute a file. Least privilege means granting only the access needed for a task.",
      technical: "The course groups access by owner, group, and others. It identifies `chmod` as the command for changing file permissions and access rules; users and groups help define who receives access.",
      example: "`chmod 640 notes.txt` gives the owner read/write, the group read-only, and others no access.",
      relevance: "Correct permissions stop one compromised account or service from reading or changing files it should never touch.",
      related: ["chown and umask", "SUID, SGID, and the sticky bit", "Linux users and groups"],
      sources: ["Linux Learning — Why it matters: Permissions", "Linux Learning — Why it matters: Users and groups", "Linux Learning — Command: chmod"],
      diagram: diagramLibrary.linux,
    },
  },
  {
    matches: (question) => /\b(process|processes|users and groups|user accounts|group access)\b/.test(question),
    answer: {
      title: "Linux users, groups, and processes",
      simple: "Users and groups help organize access. Processes are running programs or jobs; monitoring them can help spot risky or unauthorized activity.",
      technical: "The Linux lesson says access should be limited to the least privilege needed and that monitoring services and jobs helps detect unauthorized or risky activity. The `ps` command displays running processes.",
      sources: ["Linux Learning — Why it matters: Users and groups", "Linux Learning — Why it matters: Processes", "Linux Learning — Command: ps"],
    },
  },
  {
    matches: (question) => /\b(encryption|encrypt|decrypt|cipher)\b/.test(question),
    answer: {
      title: "Encryption",
      simple: "Encryption transforms readable data into a form that cannot be understood without the right key.",
      technical: "The course glossary defines encryption as converting readable data into unintelligible form without the right key. The TLS note connects encryption in transit with confidentiality and integrity.",
      sources: ["Glossary: Encryption", "Note: TLS"],
    },
  },
  {
    matches: (question) => /firewall|\bpacket(s)?\b/.test(question),
    answer: {
      title: "Firewalls and traffic filtering",
      simple: "A firewall monitors and filters network traffic according to policy. Rules decide what traffic is allowed or blocked.",
      technical: "The course glossary defines a firewall as a control that filters traffic based on policy. The networking lesson lists firewalls as devices and describes port filtering, stateful inspection, and firewall rules as controls.",
      sources: ["Glossary: Firewall", "Networking Fundamentals — Devices", "Networking Fundamentals — OSI model, Layer 4: Transport"],
    },
  },
  {
    matches: (question) => /\b(cia triad|confidentiality|integrity|availability)\b/.test(question),
    answer: {
      title: "The CIA Triad",
      simple: "The CIA Triad names three goals of information security: confidentiality, integrity, and availability.",
      technical: "Confidentiality limits information exposure, integrity concerns whether information remains accurate and unaltered, and availability concerns whether authorized users can access systems and data when needed.",
      sources: ["Note: The CIA Triad"],
    },
  },
  {
    matches: (question) => /\b(xss|cross.site scripting)\b/.test(question),
    answer: {
      title: "Cross-site scripting (XSS)",
      simple: "XSS is a web vulnerability in which injected script runs in a visitor’s browser. The defensive focus is safe input handling and secure application controls.",
      technical: "The course glossary describes XSS as malicious script executing in a victim’s browser; the notes describe attacker-injected client-side code in a trusted website. The networking lesson places XSS at the Application layer and lists validation and WAFs as defenses.",
      sources: ["Note: XSS", "Glossary: XSS", "Networking Fundamentals — OSI model, Layer 7: Application"],
    },
  },
  {
    matches: (question) => /\b(zero trust)\b/.test(question),
    answer: {
      title: "Zero Trust",
      simple: "Zero Trust means not trusting a user or system automatically. Verify requests and grant only the access needed.",
      technical: "The course emphasizes verifying every request and enforcing least privilege rather than relying on implicit trust.",
      sources: ["Note: Zero Trust", "Glossary: Zero Trust"],
    },
  },
  {
    matches: (question) => /\b(siem|security information and event management)\b/.test(question),
    answer: {
      title: "SIEM",
      simple: "A SIEM gathers security logs and event data so teams can look for suspicious activity.",
      technical: "The course describes SIEM systems as aggregating and analyzing logs or security telemetry for detection and response.",
      sources: ["Note: SIEM", "Glossary: SIEM"],
    },
  },
  {
    matches: (question) => /\b(vulnerability|threat|exploit|phishing)\b/.test(question),
    answer: {
      title: "Security terms",
      simple: "A vulnerability is a weakness; a threat is a potential source of harm; an exploit is a technique that takes advantage of a vulnerability; phishing deceives people into unsafe actions.",
      technical: "Use these terms distinctly when assessing risk: identify the weakness, the potential threat, and whether a technique could exploit it. Defenses should focus on reducing exposure, monitoring, and user safety.",
      sources: ["Glossary: Vulnerability", "Glossary: Threat", "Glossary: Exploit", "Glossary: Phishing"],
    },
  },
  {
    matches: (question) => /\b(lab|labs|practice environment)\b/.test(question),
    answer: {
      title: "CyberTeKa learning labs",
      simple: "The labs are designed for authorized, isolated learning. They cover Linux commands, file permissions, firewall concepts, packet analysis, authentication testing, and log investigation.",
      technical: "Use only controlled environments where you have authorization. The lab goals focus on safe command usage, least privilege, traffic filtering, packet patterns, token flow, and analyzing event data.",
      sources: ["Cybersecurity Labs — Safe practice", "Cybersecurity Labs — Linux command practice", "Cybersecurity Labs — File permissions", "Cybersecurity Labs — Firewall concepts", "Cybersecurity Labs — Packet analysis basics", "Cybersecurity Labs — Authentication testing", "Cybersecurity Labs — Log investigation"],
    },
  },
  {
    matches: (question) => /\b(dns|dhcp|ip address|ipv4|ipv6|mac address|subnet|cidr|lan|wan|man|pan|router|switch|hub|proxy|load balancer|arp|icmp|http)\b/.test(question),
    answer: {
      title: "Networking fundamentals",
      simple: "Networks connect devices so they can exchange data. Addressing identifies devices, and protocols define how communication works.",
      technical: "The course covers network types, client/server and peer-to-peer models, devices, IPv4/IPv6, public/private IPs, MAC addresses, subnet masks/CIDR, and protocols including IP, ICMP, ARP, HTTP, HTTPS, DNS, and DHCP. The exact answer depends on which term you mean.",
      sources: ["Networking Fundamentals — Fundamentals", "Networking Fundamentals — Devices", "Networking Fundamentals — Addressing", "Networking Fundamentals — Protocols"],
    },
  },
];

const beyondCourseAnswers: Array<{ matches: (question: string) => boolean; title: string; simple: string; technical: string }> = [
  {
    matches: (question) => /\b(artificial intelligence|\bai\b|language model|llm)\b/.test(question),
    title: "Artificial intelligence",
    simple: "The CyberTeKa course does not cover AI directly. Beyond the course: AI is a broad field of computing that builds systems able to perform tasks such as recognizing patterns, making predictions, or generating language.",
    technical: "A language model is one kind of AI system. It estimates likely next tokens from its training and conversation context; its output can be wrong, so verify important claims against reliable sources. This TeKAI demo uses curated topic-based answers, not a live language model.",
  },
  {
    matches: (question) => /\bdns\b/.test(question),
    title: "DNS",
    simple: "The course lists DNS as an Application-layer protocol but does not explain its lookup process. Beyond the course: DNS helps translate a domain name, such as `example.com`, into records that systems use to locate services.",
    technical: "A DNS resolver follows the configured resolution process and returns records such as address records; caching can reduce repeated lookups. Defensively, use trusted resolvers and investigate unexpected DNS activity through authorized monitoring.",
  },
  {
    matches: (question) => /\bdhcp\b/.test(question),
    title: "DHCP",
    simple: "The course lists DHCP among networking protocols but does not explain its operation. Beyond the course: DHCP commonly provides devices with network configuration, such as an IP address and gateway, when they join a network.",
    technical: "A DHCP client requests configuration from a DHCP server, which can lease settings for a period of time. Administrators should restrict and monitor DHCP services to reduce the chance of unauthorized configuration on a network.",
  },
  {
    matches: (question) => /\bmalware|ransomware|spyware|trojan|worm\b/.test(question),
    title: "Malware",
    simple: "The course does not define malware directly. Beyond the course: malware is software intended to perform harmful or unauthorized actions, such as disrupting systems or exposing data.",
    technical: "Defenses include keeping systems patched, limiting privileges, maintaining tested backups, and monitoring endpoint and network signals. I can explain malware behavior conceptually and focus on prevention, detection, and recovery.",
  },
  {
    matches: (question) => /\b(incident response|breach response|security incident)\b/.test(question),
    title: "Incident response",
    simple: "The course includes a log-investigation lab but does not define a complete incident-response process. Beyond the course: incident response is the organized work of investigating and limiting a security event, then restoring normal operations.",
    technical: "A careful response preserves relevant evidence, documents decisions, coordinates authorized responders, contains affected systems where appropriate, and verifies recovery. Follow your organization’s incident plan and reporting obligations.",
  },
];

const makeAssistantReply = (prompt: string, mode: string) => {
  const normalized = prompt.toLowerCase();
  const asksForAttackSteps = /\b(how|steps?|commands?|instructions?|payload|exploit|show me|give me)\b/.test(normalized)
    && /\b(hack|attack|break into|exploit|bypass|steal|evade|payload|scan|crack)\b/.test(normalized);
  const authorizedContext = /\b(authorized|my own|our own|owned by me|my lab|our lab|sandbox|ctf)\b/.test(normalized)
    && !/\b(do not|don't|not|never|without)\s+(?:own|authorized|permission|consent)\b/.test(normalized);

  if (asksForAttackSteps && !authorizedContext) {
    return {
      title: "I can help with the defensive side",
      body: "I can’t provide step-by-step instructions for attacking systems or bypassing access controls. I can explain the concept at a high level, discuss the risks, or help you build a defensive checklist for an authorized environment.",
    };
  }

  const inScope = /\b(network|networking|internet|osi|tcp|udp|dns|dhcp|ip address|ipv[46]|mac address|subnet|linux|command|terminal|shell|permission|firewall|packet|protocol|http|https|tls|ssl|authentication|login|session|token|security|cybersecurity|cia triad|confidentiality|integrity|availability|xss|zero trust|siem|vulnerability|threat|exploit|phishing|malware|server|computer|database|software|hardware|operating system|\bit\b|cloud computing|encryption|artificial intelligence|\bai\b|language model|llm|incident response|lab|labs|process|user|group|cipher)\b/.test(normalized);

  if (!inScope) {
    return {
      title: "Outside TeKAI’s learning scope",
      body: "I can help with networking, Linux, cybersecurity, and IT topics. Please ask a question in one of those areas.",
    };
  }

  const beyondCourse = beyondCourseAnswers.find((entry) => entry.matches(normalized));
  if (beyondCourse) {
    const technical = mode === "Beginner"
      ? beyondCourse.technical
      : `${beyondCourse.technical}\n\n${mode === "Expert" ? "Expert focus: verify assumptions in the relevant environment and document defensive controls." : "Check implementation and version details against reliable documentation."}`;
    return {
      title: beyondCourse.title,
      body: `## Course coverage\nThis topic is not covered directly in the CyberTeKa course material.\n\n## Beyond the course — simple explanation\n${beyondCourse.simple}\n\n## Technical detail\n${technical}`,
    };
  }

  const matched = courseAnswers.find((entry) => entry.matches(normalized));
  if (!matched) {
    return {
      title: "Course coverage and general context",
      body: `## Course coverage\nThe CyberTeKa lessons available to me do not cover this question directly.\n\n## Beyond the course\nFor a careful explanation, identify the exact protocol, system, command, or security concept. In general, check its purpose, inputs and outputs, trust boundaries, and version-specific documentation; test only in an environment you are authorized to use. I don’t have enough detail to make a more specific claim without guessing.`,
    };
  }

  const depth = mode === "Beginner"
    ? matched.answer.technical
    : `${matched.answer.technical}\n\n${mode === "Expert" ? "Expert focus: verify assumptions against the system’s configuration and document the relevant defensive controls." : mode === "Technical" ? "Technical focus: relate the behavior to its protocol, access boundary, and defensive control." : "Keep in mind that the exact behavior can depend on system configuration."}`;

  const sections = [
    `## Simple explanation\n${matched.answer.simple}`,
    matched.answer.example ? `## Example\n${matched.answer.example}` : "",
    matched.answer.relevance ? `## Why it matters in cybersecurity\n${matched.answer.relevance}` : "",
    `## Technical detail\n${depth}`,
    `## Course source\n${matched.answer.sources.map((source) => `- ${source}`).join("\n")}`,
    matched.answer.related?.length ? `## Optional next topics\nIf you want, I can also explain: ${matched.answer.related.join(", ")}.` : "",
  ].filter(Boolean);

  return {
    title: matched.answer.title,
    body: sections.join("\n\n"),
    diagram: matched.answer.diagram,
  };
};

// SAVE_NOTE intent: notes are created only when the user explicitly asks to store
// a note. A general question such as "What is Linux?" or "Explain chmod." must never
// match this intent.
const SAVE_NOTE_INTENT = {
  wantsToSave: /\b(?:save|add|put|remember|store|write)\b/i,
  mentionsNote: /\b(?:notes?|study note|this explanation|this answer)\b/i,
};

const isExplicitNoteRequest = (prompt: string) =>
  SAVE_NOTE_INTENT.wantsToSave.test(prompt) && SAVE_NOTE_INTENT.mentionsNote.test(prompt);

const getNoteCategory = (text: string) => {
  const category = text.match(/\b(linux|networking|cybersecurity|web security|identity|security)\s+notes?\b/i)?.[1];
  if (category) return category.replace(/\b\w/g, (letter) => letter.toUpperCase());
  if (/\b(linux|ssh|chmod|shell|terminal|kernel|distribution)\b/i.test(text)) return "Linux";
  if (/\b(network|dns|tcp|udp|https|tls|ssh|ip address)\b/i.test(text)) return "Networking";
  return "Cybersecurity";
};

const getWelcomeMessage = (): Message => ({
  role: "assistant",
  title: "What is AI?",
  content:
    "Artificial intelligence (AI) is software designed to perform tasks such as recognizing patterns and working with language. I’m TeKAI, a cybersecurity learning assistant. This demo uses curated, topic-based responses rather than a live AI model; ask me about networking, Linux, web security, authentication, or defense and I’ll explain the concept, with a diagram when useful.",
});

export default function TeKaiPage() {
  const [mode, setMode] = useState("Beginner");
  const [input, setInput] = useState("");
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const { auth } = useAuth();
  const subscription = useSubscription(auth.isLoggedIn ? auth.email : "");
  const hasPlus = hasPremiumAccess(subscription);
  const runtime = useRuntimeRecord();

  const startNewChat = () => {
    setInput("");
    setMessages([getWelcomeMessage()]);
  };

  const sendPrompt = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    let reply: { title: string; body: string; diagram?: string };
    if (isExplicitNoteRequest(trimmed)) {
      const previousAnswer = [...messages].reverse().find((message) => message.role === "assistant" && message.title !== "What is AI?");
      const customContent = trimmed.match(/:\s*([\s\S]+)$/)?.[1]?.trim();
      if (!auth.isLoggedIn || !auth.email) {
        reply = { title: "Sign in to save notes", body: "This is an explicit note-saving request, but notes are stored under your account on this device. Sign in first, then ask me to save it again." };
      } else {
        const noteToSave = customContent
          ? { title: "TeKAI study note", content: customContent }
          : previousAnswer;
        if (!noteToSave) {
          reply = { title: "Nothing to save yet", body: "Ask a question first, then tell me to save the explanation as a note." };
        } else {
          const { title, content } = noteToSave;
          saveNote(auth.email, { title, content, category: getNoteCategory(`${trimmed} ${title}`) });
          const progress = readProgress(auth.email);
          saveProgress(auth.email, { savedNotes: progress.savedNotes + 1 });
          reply = { title: "Note saved", body: `Saved **${title}** to your ${getNoteCategory(`${trimmed} ${title}`)} notes. You can review it in Notes.` };
        }
      }
    } else {
      reply = makeAssistantReply(trimmed, mode);
    }
    setMessages((current) => [
      ...current,
      { role: "user", title: "You", content: trimmed },
      { role: "assistant", title: reply.title, content: reply.body, diagram: reply.diagram },
    ]);
    setInput("");
  };

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">AI tutor</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">TeKAI</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            A cybersecurity tutor that explains fundamentals clearly, adapts to your level, and can show a visual model when a concept is easier to understand with a diagram.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-[#11151b] p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" aria-label="Explanation level">
                {explanationModes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={mode === option}
                    aria-label={option === "Expert" && !hasPlus ? "Expert mode requires Plus" : `${option} explanation mode`}
                    onClick={() => {
                      if (option === "Expert" && !hasPlus) {
                        setShowUpgradeNotice(true);
                        return;
                      }
                      setShowUpgradeNotice(false);
                      setMode(option);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
                      mode === option
                        ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]"
                        : option === "Expert" && !hasPlus
                          ? "border-emerald-300/20 bg-emerald-300/5 text-slate-500 hover:text-emerald-100"
                        : "border-white/10 bg-[#151c22] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button type="button" onClick={startNewChat} className="rounded-xl border border-white/10 bg-[#151c22] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-[#f4c65a]/30 hover:text-white">
                New chat
              </button>
            </div>

            {showUpgradeNotice && <p role="status" className="mb-4 rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-3 text-xs leading-5 text-slate-300">Expert explanation mode is included with CyberTeKa Plus. <Link href="/profile#subscription-plans" className="font-medium text-emerald-200 underline underline-offset-2">View plans</Link></p>}

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#151c22] p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.title}-${index}`}
                  className={`rounded-2xl border p-4 ${
                    message.role === "assistant"
                      ? "border-[#f4c65a]/20 bg-[#f4c65a]/8"
                      : "border-white/10 bg-[#0d1217]"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[#f4c65a]">
                    {message.role === "assistant" ? "TeKAI" : "You"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{message.title}</p>
                  <div className="prose prose-invert mt-2 max-w-none text-sm leading-7 text-slate-200">
                    <ReactMarkdown
                    components={{
                      h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-white">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                      li: ({ children }) => <li>{children}</li>,
                      pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1217] p-3 text-xs leading-6">{children}</pre>,
                      code: ({ className, children, ...props }) => className
                        ? <code className="text-[#f7d97d]" {...props}>{children}</code>
                        : <code className="rounded bg-black/30 px-1 py-0.5 text-[#f7d97d]" {...props}>{children}</code>,
                    }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.diagram && (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1217] p-3 text-xs leading-6 text-[#f7d97d]">{message.diagram}</pre>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendPrompt();
                }}
                placeholder="Ask TeKAI a cybersecurity question..."
                className="flex-1 rounded-2xl border border-white/10 bg-[#0d1217] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#f4c65a]/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={sendPrompt}
                className="rounded-2xl bg-[#f4c65a] px-5 py-3 text-sm font-semibold text-[#11151b] transition hover:bg-[#f7d97d]"
              >
                Send
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            {runtime.report && <div className="rounded-3xl border border-emerald-300/20 bg-[#0d1415] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Lab debug context · simulated terminal</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{runtime.report.labTitle}</h2>
              <p className="mt-2 break-all font-mono text-xs text-emerald-100">$ {runtime.report.command}</p>
              {runtime.report.error && <p className="mt-3 rounded-lg border border-rose-300/15 bg-rose-300/5 p-3 text-xs leading-5 text-rose-100">{runtime.report.error}</p>}
              {runtime.report.debugHint && <p className="mt-3 text-sm leading-6 text-slate-300"><span className="font-medium text-emerald-200">TeKAI hint: </span>{runtime.report.debugHint}</p>}
              {!runtime.report.error && <p className="mt-3 text-xs text-slate-400">{runtime.report.matchedExpectedOutput ? "Expected lab output matched." : "No matching lab error. The tutor checks the latest simulated command."}</p>}
              {runtime.report.output && <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#060a0b] p-3 font-mono text-[11px] leading-5 text-slate-300">{runtime.report.output}</pre>}
            </div>}

            <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Specialties</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {topics.map((topic) => (
                  <li key={topic} className="rounded-xl border border-white/10 bg-[#151c22] px-3 py-2">
                    • {topic}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Suggested questions</p>
              <div className="mt-4 space-y-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="w-full rounded-xl border border-white/10 bg-[#151c22] px-3 py-2 text-left text-sm text-slate-200 transition hover:border-[#f4c65a]/30 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
