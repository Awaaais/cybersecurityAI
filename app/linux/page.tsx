"use client";

import Link from "next/link";
import { useState } from "react";
import { LinuxModuleAssessment } from "../components/linux-module-assessment";
import { MockLinuxTerminal } from "../components/mock-linux-terminal";
import { PremiumGate } from "../components/subscription-ui";
import { CodeBlock } from "../components/code-block";
import { linuxModules } from "./course-content";
import { useRuntimeRecord } from "./runtime-store";

export default function LinuxPage() {
  const [activeModuleId, setActiveModuleId] = useState(linuxModules[0].id);
  const activeModule = linuxModules.find((module) => module.id === activeModuleId) ?? linuxModules[0];
  const runtime = useRuntimeRecord();

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Linux learning path · {linuxModules.length} modules</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Linux for Cybersecurity</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Learn filesystem operations, text pipelines, identity controls, process diagnostics, and network inspection through course notes, module checks, and an isolated command simulator.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/quizzes" className="rounded-xl border border-white/10 bg-[#151c22] px-3 py-2 text-sm text-slate-200 hover:border-white/20">All quizzes</Link>
              <Link href="/labs" className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-300/15">Guided labs</Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1.5 text-emerald-100">{runtime.completedModuleIds.length}/{linuxModules.length} labs validated</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">{runtime.validatedQuizModuleIds.length}/{linuxModules.length} knowledge checks passed</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-400">All shell commands are simulated</span>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(250px,0.75fr)_minmax(0,1.5fr)]">
          <nav className="space-y-2" aria-label="Linux course modules">
            {linuxModules.map((module, index) => {
              const active = module.id === activeModule.id;
              const complete = runtime.completedModuleIds.includes(module.id);
              const quizPassed = runtime.validatedQuizModuleIds.includes(module.id);
              return <button key={module.id} type="button" aria-pressed={active} onClick={() => setActiveModuleId(module.id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-emerald-300/35 bg-emerald-300/10" : "border-white/10 bg-[#11151b] hover:border-white/20"}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Module {index + 1}</span>
                  <span className="flex gap-1.5 text-[10px]">{complete && <span className="text-emerald-200">Lab ✓</span>}{quizPassed && <span className="text-sky-200">Quiz ✓</span>}</span>
                </div>
                <span className={`mt-2 block text-sm font-semibold leading-5 ${active ? "text-white" : "text-slate-200"}`}>{module.title.replace(/^Module \d+: /, "")}</span>
                <span className="mt-2 block text-xs leading-5 text-slate-500">{module.topics.slice(0, 2).join(" · ")}</span>
              </button>;
            })}
          </nav>

          <div className="min-w-0 space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#11151b] p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{activeModule.title}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{activeModule.summary}</h2>
              <div className="mt-4 flex flex-wrap gap-2">{activeModule.topics.map((topic) => <span key={topic} className="rounded-full border border-white/10 bg-[#0b1015] px-3 py-1.5 text-xs text-slate-300">{topic}</span>)}</div>
              {activeModule.objectives && activeModule.objectives.length > 0 && (
                <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Learning objectives</p>
                  <ul className="mt-3 space-y-2">
                    {activeModule.objectives.map((objective) => <li key={objective} className="flex gap-2 text-sm leading-6 text-slate-200"><span aria-hidden="true" className="text-emerald-300">›</span><span>{objective}</span></li>)}
                  </ul>
                </div>
              )}
              <div className="mt-6 space-y-4">{activeModule.notes.map((note, index) => <article key={note} className="flex gap-3 border-t border-white/10 pt-4 first:border-0 first:pt-0"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/5 text-[10px] text-emerald-200">{String(index + 1).padStart(2, "0")}</span><p className="text-sm leading-7 text-slate-300">{note}</p></article>)}</div>
              <section className="mt-7 border-t border-white/10 pt-5">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Command reference</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Examples for this module</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {activeModule.codeExamples.map((example) => <CodeBlock key={example.command} label={example.label} code={example.command} />)}
                </div>
              </section>
              {activeModule.challenge && (
                <section className="mt-7 border-t border-white/10 pt-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Challenge</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Try it in the simulator</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{activeModule.challenge.prompt}</p>
                  <details className="mt-3 rounded-xl border border-white/10 bg-[#0b1015] p-3">
                    <summary className="cursor-pointer text-xs font-medium text-[#f7d97d]">Show solution</summary>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{activeModule.challenge.solution}</p>
                  </details>
                </section>
              )}
            </section>

            <LinuxModuleAssessment key={activeModule.id} module={activeModule} />
            <PremiumGate feature="Interactive Linux terminal labs">
              <MockLinuxTerminal activeModule={activeModule} />
            </PremiumGate>
          </div>
        </section>
      </div>
    </main>
  );
}
