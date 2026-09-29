"use client";

import { FormEvent, useState } from "react";
import { readProgress, saveProgress, useAuth } from "./auth-panel";
import { executeMockCommand, createMockTerminalState } from "../linux/mock-terminal-engine";
import type { LinuxModule } from "../linux/course-content";
import { readRuntimeRecord, updateRuntimeRecord, useRuntimeRecord } from "../linux/runtime-store";

type TerminalLine = { command: string; output: string; error: boolean };

const getDebugHint = (error: string | undefined) => {
  if (!error) return null;
  if (error.includes("outside isolated") || error.includes("documentation-only")) return "This network simulator is limited to the printed RFC 5737 documentation addresses. Check that the target is exactly 192.0.2.20 or 192.0.2.53; no packets are sent.";
  if (error.includes("No such file") || error.includes("Parent directory")) return "Check the current directory with `pwd`, list entries with `ls -a`, and use an absolute path if you are unsure where the target lives.";
  if (error.includes("permission") || error.includes("sudo")) return "Review the owner/group/other permission matrix. Privilege escalation is deliberately disabled; use the learner-owned files in `/home/learner`.";
  if (error.includes("syntax") || error.includes("supported form")) return "This simulator implements a constrained command grammar. Run `help` for supported forms; command chaining and shell expansion are disabled.";
  if (error.includes("Is a directory")) return "A directory path was used where a file was expected. Inspect it with `ls`, or use a specific file inside it.";
  return "Inspect the command, target path, and current directory. Run `help` for supported simulator syntax; this terminal never runs commands on the host system.";
};

export function MockLinuxTerminal({ activeModule }: { activeModule: LinuxModule }) {
  const { auth } = useAuth();
  const runtime = useRuntimeRecord();
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<TerminalLine[]>([
    { command: "", output: "CyberTeKa isolated Linux lab. Type `help` to see supported commands.", error: false },
  ]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const submitted = command.trim();
    if (!submitted) return;

    const current = readRuntimeRecord();
    const result = executeMockCommand(submitted, current.terminal);
    const resetOutput = result.clear === true;
    const normalizedCommand = submitted.replace(/\s+/g, " ").toLowerCase();
    const expectedCommand = activeModule.lab.expectedCommand.replace(/\s+/g, " ").toLowerCase();
    const matchedExpectedOutput = !result.error
      && normalizedCommand === expectedCommand
      && result.output.toLowerCase().includes(activeModule.lab.expectedOutput.toLowerCase());
    const debugHint = getDebugHint(result.error);
    const nextCompletedModuleIds = matchedExpectedOutput
      ? [...new Set([...current.completedModuleIds, activeModule.id])]
      : current.completedModuleIds;

    setHistory((lines) => resetOutput ? [] : [...lines, { command: submitted, output: result.output || "(no output)", error: Boolean(result.error) }]);
    setCommand("");

    updateRuntimeRecord((latest) => ({
      ...latest,
      terminal: result.state,
      completedModuleIds: nextCompletedModuleIds,
      report: {
        moduleId: activeModule.id,
        labTitle: activeModule.lab.title,
        command: submitted,
        output: result.output,
        error: result.error ?? null,
        debugHint,
        matchedExpectedOutput,
      },
    }));

    if (matchedExpectedOutput && auth.isLoggedIn && auth.email) {
      const progress = readProgress(auth.email);
      saveProgress(auth.email, {
        completedModules: Math.max(progress.completedModules, nextCompletedModuleIds.length),
        labsComplete: Math.max(progress.labsComplete, nextCompletedModuleIds.length),
      });
    }
  };

  const resetLab = () => {
    updateRuntimeRecord((current) => ({ ...current, terminal: createMockTerminalState(), report: null }));
    setHistory([{ command: "", output: "Virtual machine reset. No host files, processes, or network state were changed.", error: false }]);
  };

  const moduleComplete = runtime.completedModuleIds.includes(activeModule.id);

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#0b1214] shadow-[0_18px_50px_rgba(0,0,0,0.28)]" aria-label="Isolated Linux terminal">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#10191b] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
          <div>
            <p className="text-xs font-semibold text-white">Linux lab terminal</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">Browser simulation · no host execution</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${moduleComplete ? "text-emerald-200" : "text-slate-500"}`}>{moduleComplete ? "Module validated" : "Module not yet validated"}</span>
          <button type="button" onClick={resetLab} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white">Reset VM</button>
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(230px,0.7fr)] sm:p-5">
        <div>
          <div className="h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#060a0b] p-4 font-mono text-xs leading-6 sm:h-80" aria-live="polite">
            {history.map((line, index) => (
              <div key={`${line.command}-${index}`} className="mb-3">
                {line.command && <p className="break-all text-emerald-300"><span className="text-slate-500">learner@cyberteka:{runtime.terminal.cwd}$ </span>{line.command}</p>}
                {line.output && <pre className={`whitespace-pre-wrap break-words font-mono ${line.error ? "text-rose-300" : "text-slate-200"}`}>{line.output}</pre>}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#060a0b] px-3 focus-within:border-emerald-400/40">
              <span className="shrink-0 font-mono text-sm text-emerald-300">$</span>
              <input value={command} onChange={(event) => setCommand(event.target.value)} aria-label="Linux lab command" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm text-white outline-none placeholder:text-slate-600" placeholder="type a lab command" />
            </label>
            <button type="submit" className="rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#07100e] transition hover:bg-emerald-200">Run</button>
          </form>
        </div>

        <aside className="rounded-xl border border-white/10 bg-[#10191b] p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Active assignment</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{activeModule.lab.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{activeModule.lab.instructions}</p>
          <details className="mt-4 rounded-lg border border-white/10 bg-[#0b1214] p-3">
            <summary className="cursor-pointer text-xs font-medium text-emerald-200">Show hint</summary>
            <p className="mt-2 text-xs leading-5 text-slate-300">{activeModule.lab.hint}</p>
          </details>
          <p className="mt-4 text-xs leading-5 text-slate-500">Completion requires the assignment command and expected output. A matching `echo` or pasted result does not satisfy the command check.</p>
        </aside>
      </div>
    </section>
  );
}