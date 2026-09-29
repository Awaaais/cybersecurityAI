"use client";

import { useState } from "react";
import { readProgress, saveProgress, useAuth } from "./auth-panel";
import type { LinuxModule } from "../linux/course-content";
import { updateRuntimeRecord, useRuntimeRecord } from "../linux/runtime-store";

export function LinuxModuleAssessment({ module }: { module: LinuxModule }) {
  const { auth } = useAuth();
  const runtime = useRuntimeRecord();
  const [answers, setAnswers] = useState<number[]>(module.quiz.map(() => -1));
  const passed = runtime.validatedQuizModuleIds.includes(module.id);
  const score = answers.reduce((total, answer, index) => total + (answer === module.quiz[index].answer ? 1 : 0), 0);

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = optionIndex;
    setAnswers(nextAnswers);
    const passedAll = nextAnswers.every((answer, index) => answer === module.quiz[index].answer);

    updateRuntimeRecord((current) => ({
      ...current,
      validatedQuizModuleIds: passedAll
        ? [...new Set([...current.validatedQuizModuleIds, module.id])]
        : current.validatedQuizModuleIds.filter((moduleId) => moduleId !== module.id),
    }));

    if (nextAnswers.every((answer) => answer !== -1) && auth.isLoggedIn && auth.email) {
      const percentage = Math.round((scoreAfter(nextAnswers, module) / module.quiz.length) * 100);
      saveProgress(auth.email, { quizScore: Math.max(readProgress(auth.email).quizScore, percentage) });
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#10191b] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Knowledge validation</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{module.title}</h3>
        </div>
        <span className={`text-xs ${passed ? "text-emerald-200" : "text-slate-500"}`}>{passed ? "Validated" : `${score}/${module.quiz.length} correct`}</span>
      </div>
      <div className="mt-4 space-y-4">
        {module.quiz.map((item, questionIndex) => (
          <fieldset key={item.question} className="rounded-xl border border-white/10 bg-[#0b1214] p-4">
            <legend className="max-w-full px-1 text-sm font-medium leading-6 text-white">{item.question}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {item.options.map((option, optionIndex) => {
                const selected = answers[questionIndex] === optionIndex;
                const correct = optionIndex === item.answer;
                const reveal = answers[questionIndex] !== -1;
                return <button key={option} type="button" aria-pressed={selected} onClick={() => selectAnswer(questionIndex, optionIndex)} className={`rounded-lg border px-3 py-2 text-left text-xs leading-5 transition ${reveal && correct ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : selected ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#11191b] text-slate-300 hover:border-white/20"}`}>{option}</button>;
              })}
            </div>
            {answers[questionIndex] !== -1 && <p className="mt-3 text-xs leading-5 text-slate-400">{item.explanation}</p>}
          </fieldset>
        ))}
      </div>
      {passed && <p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-100">Both course checks are correct. This assessment is validated in the shared Linux runtime.</p>}
    </section>
  );
}

const scoreAfter = (answers: number[], module: LinuxModule) => answers.reduce((total, answer, index) => total + (answer === module.quiz[index].answer ? 1 : 0), 0);