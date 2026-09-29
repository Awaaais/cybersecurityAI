"use client";

import { useMemo, useState } from "react";
import { BackButton } from "../components/back-button";
import { saveProgress, useAuth } from "../components/auth-panel";
import { LinuxModuleAssessment } from "../components/linux-module-assessment";
import { linuxModules } from "../linux/course-content";

const questions = [
  {
    question: "Which layer of the OSI model is most directly responsible for routing packets between networks?",
    options: ["Layer 2 – Data Link", "Layer 3 – Network", "Layer 4 – Transport", "Layer 7 – Application"],
    correct: 1,
    explanation: "Layer 3 handles logical addressing and routing, which is how devices move packets across networks.",
    source: "Networking Fundamentals — OSI model, Layer 3: Network",
  },
  {
    question: "What does HTTPS add to normal HTTP communication?",
    options: ["A browser-only cache", "TLS encryption for transport security", "A new file format", "A faster DNS lookup"],
    correct: 1,
    explanation: "HTTPS wraps HTTP in TLS, encrypting traffic so data is protected in transit.",
    source: "Networking Fundamentals — OSI model, Layer 6: Presentation; Note: TLS",
  },
  {
    question: "Why is least privilege important in Linux security?",
    options: ["It reduces the damage from a compromised account.", "It makes tasks slower but more visible.", "It disables all users.", "It replaces firewalls."],
    correct: 0,
    explanation: "Least privilege limits the permissions a process or user has, reducing the impact of misuse or compromise.",
    source: "Linux Learning — Users and groups",
  },
  {
    question: "Which control is most directly associated with verifying a user is who they claim to be?",
    options: ["Integrity", "Availability", "Authentication", "Logging"],
    correct: 2,
    explanation: "Authentication answers the question, 'Who are you?' by validating credentials or signals before granting access.",
    source: "Note: Authentication",
  },
  {
    question: "Which OSI layer handles end-to-end delivery using TCP or UDP?",
    options: ["Layer 2 – Data Link", "Layer 3 – Network", "Layer 4 – Transport", "Layer 6 – Presentation"],
    correct: 2,
    explanation: "Layer 4 processes data for reliable or low-latency transport between hosts.",
    source: "Networking Fundamentals — OSI model, Layer 4: Transport",
  },
  {
    question: "What does `chmod` change?",
    options: ["Network routes", "File permissions and access rules", "Running processes", "The current directory"],
    correct: 1,
    explanation: "The course describes `chmod` as changing file permissions and access rules.",
    source: "Linux Learning — Command: chmod",
  },
  {
    question: "Which statement best describes a firewall?",
    options: ["It filters network traffic according to policy.", "It encrypts every file on a computer.", "It assigns names to websites.", "It guarantees that a system cannot be compromised."],
    correct: 0,
    explanation: "A firewall filters traffic by policy. It is one control, not a complete security strategy.",
    source: "Glossary: Firewall; Networking Fundamentals — Devices",
  },
  {
    question: "Which address is used for communication on a local data-link network?",
    options: ["A MAC address", "A weekly goal", "A TLS certificate", "A process ID"],
    correct: 0,
    explanation: "The course describes Layer 2 frames as identified by MAC addresses on a local network segment.",
    source: "Networking Fundamentals — OSI model, Layer 2: Data Link",
  },
  {
    question: "What is a defensive use of a SIEM?",
    options: ["Aggregate and analyze logs for detection and response.", "Grant every account administrator access.", "Replace all access controls.", "Encrypt network cables."],
    correct: 0,
    explanation: "SIEM systems aggregate and analyze security logs or telemetry to support detection and response.",
    source: "Note: SIEM; Glossary: SIEM",
  },
  {
    question: "What is the safest response to a suspicious sign-in message?",
    options: ["Open its link to inspect it.", "Reply with your password.", "Verify the request through a separate trusted channel and report it.", "Forward it to everyone."],
    correct: 2,
    explanation: "Phishing uses deception to prompt unsafe actions. Verify unexpected requests independently and report suspicious messages.",
    source: "Glossary: Phishing",
  },
  {
    question: "Which permission mode gives the owner read/write, the group read, and others no access?",
    options: ["777", "640", "444", "000"],
    correct: 1,
    explanation: "Mode 640 gives the owner read/write (6), the group read (4), and others no permissions (0).",
    source: "Linux Learning — Permissions",
  },
];

export default function QuizzesPage() {
  const { auth } = useAuth();
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));

  const score = useMemo(
    () => answers.reduce((total, answer, index) => total + (answer === questions[index].correct ? 1 : 0), 0),
    [answers],
  );

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    const next = [...answers];
    next[questionIndex] = optionIndex;
    setAnswers(next);

    if (next.every((answer) => answer !== -1) && auth.isLoggedIn && auth.email) {
      const finalScore = next.reduce((total, answer, index) => total + (answer === questions[index].correct ? 1 : 0), 0);
      saveProgress(auth.email, { quizScore: Math.round((finalScore / questions.length) * 100) });
    }
  };

  const resetQuiz = () => setAnswers(Array(questions.length).fill(-1));

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="mb-4 flex justify-end">
            <BackButton href="/" />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Assessments</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Quizzes and checkpoints</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Check your understanding with short security questions that explain the correct answer and why the others are incorrect.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Score</p>
              <p className="mt-2 text-3xl font-bold text-white">{score}/{questions.length}</p>
              <p className="mt-1 text-sm text-slate-400">{answers.filter((answer) => answer !== -1).length} of {questions.length} answered</p>
            </div>
            <button
              type="button"
              onClick={resetQuiz}
              className="rounded-xl border border-white/10 bg-[#151c22] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#f4c65a]/30 hover:text-white"
            >
              Reset quiz
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {questions.map((item, index) => {
            const selected = answers[index];
            const isCorrect = selected === item.correct;

            return (
              <article key={item.question} className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Question {index + 1}</p>
                  <span className="text-xs text-slate-500">{item.source}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">{item.question}</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  {item.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isRightAnswer = optionIndex === item.correct;
                    const showCorrect = selected !== -1 && isRightAnswer;
                    const showWrong = selected === optionIndex && selected !== item.correct;

                    return (
                      <li key={option}>
                        <button
                          type="button"
                          onClick={() => handleSelect(index, optionIndex)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                            showCorrect
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : showWrong
                                ? "border-red-500/40 bg-red-500/10 text-red-200"
                                : isSelected
                                  ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]"
                                  : "border-white/10 bg-[#151c22] text-slate-200 hover:border-white/20"
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </span>
                          {showCorrect && <span>✓</span>}
                          {showWrong && <span>✕</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {selected !== -1 && (
                  <div className={`mt-5 rounded-2xl border p-4 ${isCorrect ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#f4c65a]/20 bg-[#f4c65a]/10"}`}>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#f7d97d]">
                      {isCorrect ? "Correct" : "Review"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{item.explanation}</p>
                    <p className="mt-3 text-xs text-slate-400">Course source: {item.source}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <section className="mt-10 rounded-3xl border border-emerald-300/15 bg-[#0d1415] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Module validations</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Linux course checkpoints</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Each module has focused checks tied to its course notes. Pass every question in a module to record its assessment in the Linux runtime.</p>
          <div className="mt-5 space-y-3">
            {linuxModules.map((module, index) => <details key={module.id} className="group rounded-xl border border-white/10 bg-[#11191b] p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-white marker:hidden">Module {index + 1}: {module.title.replace(/^Module \d+: /, "")}<span className="float-right text-emerald-300 group-open:rotate-45">+</span></summary>
              <div className="mt-4"><LinuxModuleAssessment module={module} /></div>
            </details>)}
          </div>
        </section>
      </div>
    </main>
  );
}
