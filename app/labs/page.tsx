"use client";

import { useState, useSyncExternalStore } from "react";
import { readAuth, saveProgress, useAuth } from "../components/auth-panel";
import { MockLinuxTerminal } from "../components/mock-linux-terminal";
import { PremiumGate } from "../components/subscription-ui";
import { linuxModules } from "../linux/course-content";
import { useRuntimeRecord } from "../linux/runtime-store";
import { hasPremiumAccess, useSubscription } from "../components/subscription-store";

const subscribeToLabProgress = (onStoreChange: () => void) => {
  window.addEventListener("cyberteka-labs-change", onStoreChange);
  window.addEventListener("cyberteka-auth-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("cyberteka-labs-change", onStoreChange);
    window.removeEventListener("cyberteka-auth-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

const getCompletedLabsSnapshot = () => {
  const auth = readAuth();
  if (!auth.isLoggedIn || !auth.email) return "[]";

  try {
    return localStorage.getItem(`cyberteka-completed-labs-${auth.email}`) ?? "[]";
  } catch {
    return "[]";
  }
};

const getServerCompletedLabsSnapshot = () => "[]";

const labList = [
  {
    title: "Linux command practice",
    difficulty: "Beginner",
    goal: "Learn shell navigation, file creation, and safe command usage.",
    steps: ["Run `pwd` to confirm your location.", "Use `ls` to list the current directory.", "Create a practice folder with `mkdir practice`, then enter it with `cd practice`.", "Before changing permissions, use `pwd` again to confirm the path."],
    checkpoint: "Which command shows the directory you are currently in?",
    answer: "`pwd` prints the current working directory.",
  },
  {
    title: "File permissions",
    difficulty: "Beginner",
    goal: "Understand read, write, execute, and least-privilege security models.",
    steps: ["Use a disposable file in a practice directory you control.", "Apply `chmod 640 notes.txt` to that file.", "Read the mode by owner, group, and others: 6 is read/write, 4 is read, and 0 is no access.", "Consider whether each class needs the access it has."],
    checkpoint: "With mode 640, which classes can read the file?",
    answer: "The owner and group can read it. Only the owner can write; others have no access.",
  },
  {
    title: "Firewall concepts",
    difficulty: "Beginner",
    goal: "Explore how traffic is allowed or blocked in controlled environments.",
    steps: ["Use a paper exercise or an isolated lab firewall; do not change a production policy.", "Write down a fictional source, destination, service, and business need.", "Draft the narrowest rule that permits only that required traffic.", "Review the rule for unnecessary sources, destinations, and services."],
    checkpoint: "Why is a narrow allow rule preferable to allowing all traffic?",
    answer: "It follows least privilege and reduces the network exposure created by the rule.",
  },
  {
    title: "Packet analysis basics",
    difficulty: "Intermediate",
    goal: "Review network traffic patterns in a safe educational sandbox.",
    steps: ["Review only a provided sample capture or traffic from a lab you own.", "Identify the DNS lookup, client/server addresses, and transport protocol.", "Look for the TCP connection setup before application data when TCP is used.", "Summarize what the capture shows without collecting other users’ traffic."],
    checkpoint: "Which OSI layer is responsible for routing IP packets between networks?",
    answer: "Layer 3, the Network layer, handles logical addressing and packet routing.",
  },
  {
    title: "Authentication testing",
    difficulty: "Intermediate",
    premiumOnly: true,
    goal: "Understand token flow, credential checks, and secure session design.",
    steps: ["Use a toy application or an explicitly authorized test environment.", "Draw the flow from user to application to credential validation.", "Identify where a session token is issued and how later requests are checked.", "Review defensive controls such as MFA, secure cookies, short timeouts, and token rotation."],
    checkpoint: "What should a session identifier be protected against?",
    answer: "The course highlights theft and fixation; secure cookies, short timeouts, and token rotation help reduce risk.",
  },
  {
    title: "Log investigation",
    difficulty: "Advanced",
    premiumOnly: true,
    goal: "Correlate security event data and determine the likely cause of activity.",
    steps: ["Review this fictional sequence: repeated sign-in failures followed by a successful sign-in.", "Compare timestamps, account, source, and device context in the authorized sample logs.", "Decide whether the activity matches the account owner’s expected behavior.", "Document evidence and escalate according to your organization’s incident process."],
    checkpoint: "What should an analyst do after repeated failures are followed by a success?",
    answer: "Correlate the events, verify the activity with the account owner or approved process, preserve relevant logs, and follow the incident plan. The pattern is a lead, not proof by itself.",
  },
];

export default function LabsPage() {
  const { auth } = useAuth();
  const runtime = useRuntimeRecord();
  const subscription = useSubscription(auth.isLoggedIn ? auth.email : "");
  const hasPlus = hasPremiumAccess(subscription);
  const [openLab, setOpenLab] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<string[]>([]);
  const [activeModuleId, setActiveModuleId] = useState(linuxModules[0].id);
  const activeModule = linuxModules.find((module) => module.id === activeModuleId) ?? linuxModules[0];
  const completedLabsSnapshot = useSyncExternalStore(subscribeToLabProgress, getCompletedLabsSnapshot, getServerCompletedLabsSnapshot);
  const completedLabs = (() => {
    try {
      const parsed: unknown = JSON.parse(completedLabsSnapshot);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  })();

  const completeLab = (title: string) => {
    if (!auth.isLoggedIn || !auth.email) {
      window.dispatchEvent(new Event("cyberteka-open-auth"));
      return;
    }
    if (completedLabs.includes(title)) return;

    const nextCompleted = [...completedLabs, title];
    localStorage.setItem(`cyberteka-completed-labs-${auth.email}`, JSON.stringify(nextCompleted));
    window.dispatchEvent(new Event("cyberteka-labs-change"));
    saveProgress(auth.email, { labsComplete: nextCompleted.length });
  };

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Safe practice</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Cybersecurity Labs</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Every lab is designed for authorized, isolated learning environments. The purpose is education, defense, and responsible testing.
          </p>
        </div>

        <section className="mb-8 rounded-3xl border border-emerald-300/15 bg-[#0d1415] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Live runtime · simulated</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Isolated Linux practice machine</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Run supported CLI commands in a virtual filesystem. No host commands or network packets are executed; Nmap is restricted to fixed documentation-only sample targets.</p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1.5 text-xs text-emerald-100">{runtime.completedModuleIds.length} module labs validated</span>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2" aria-label="Select runtime assignment">
            {linuxModules.map((module, index) => <button key={module.id} type="button" aria-pressed={module.id === activeModule.id} onClick={() => setActiveModuleId(module.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs transition ${module.id === activeModule.id ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-[#11191b] text-slate-400 hover:text-white"}`}>M{index + 1}</button>)}
          </div>
          <MockLinuxTerminal key={activeModule.id} activeModule={activeModule} />
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {labList.map((lab) => (
            <article key={lab.title} className="rounded-2xl border border-white/10 bg-[#11151b] p-5 transition hover:border-[#f4c65a]/25">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">{lab.title}</h2>
                <span className="rounded-full border border-[#f4c65a]/25 bg-[#f4c65a]/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f7d97d]">
                  {lab.difficulty}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{lab.goal}</p>
              {lab.premiumOnly && !hasPlus ? <div className="mt-5"><PremiumGate feature={lab.title} /></div> : <>
              <button
                type="button"
                aria-expanded={openLab === lab.title}
                onClick={() => setOpenLab(openLab === lab.title ? null : lab.title)}
                className="mt-5 rounded-xl bg-[#f4c65a] px-4 py-2 text-sm font-semibold text-[#11151b] transition hover:bg-[#f7d97d]"
              >
                {openLab === lab.title ? "Close lab" : "Open lab"}
              </button>
              {openLab === lab.title && <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#f4c65a]">Exercise</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
                  {lab.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <div className="mt-4 rounded-xl border border-white/10 bg-[#0d1217] p-4">
                  <p className="text-sm font-medium text-white">Checkpoint</p>
                  <p className="mt-2 text-sm text-slate-300">{lab.checkpoint}</p>
                  {revealedAnswers.includes(lab.title) && <p className="mt-3 text-sm leading-6 text-emerald-200">{lab.answer}</p>}
                  <button
                    type="button"
                    onClick={() => setRevealedAnswers((current) => current.includes(lab.title) ? current.filter((title) => title !== lab.title) : [...current, lab.title])}
                    className="mt-3 text-sm font-medium text-[#f7d97d] underline decoration-[#f4c65a]/40 underline-offset-4"
                  >
                    {revealedAnswers.includes(lab.title) ? "Hide answer" : "Check answer"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => completeLab(lab.title)}
                  disabled={completedLabs.includes(lab.title)}
                  className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:cursor-default disabled:opacity-70"
                >
                  {completedLabs.includes(lab.title) ? "Completed" : auth.isLoggedIn ? "Mark complete" : "Sign in to save completion"}
                </button>
              </div>}
              </>}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
