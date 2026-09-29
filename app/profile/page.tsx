"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/back-button";
import { getDefaultProgress, readProgress, useAuth } from "../components/auth-panel";
import { SubscriptionPanel } from "../components/subscription-ui";

export default function ProfilePage() {
  const { auth } = useAuth();
  const [progress, setProgress] = useState(getDefaultProgress);

  useEffect(() => {
    const syncProgress = () => {
      setProgress(auth.isLoggedIn && auth.email ? readProgress(auth.email) : getDefaultProgress());
    };

    syncProgress();
    window.addEventListener("cyberteka-progress-change", syncProgress);
    return () => window.removeEventListener("cyberteka-progress-change", syncProgress);
  }, [auth.email, auth.isLoggedIn]);

  const goalProgress = useMemo(() => {
    const ratio = Math.min((progress.completedModules / progress.weeklyGoal) * 100, 100);
    return Math.round(ratio);
  }, [progress]);

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="mb-4 flex justify-end">
            <BackButton href="/" />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Profile</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Learner profile</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Track progress, achievements, saved notes, and learning streaks as the learner advances through structured security education.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f4c65a]/30 bg-[#f4c65a]/10 text-xl font-bold text-[#f7d97d]">
                {auth.isLoggedIn ? auth.name.charAt(0).toUpperCase() : "G"}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">{auth.isLoggedIn ? auth.name : "Guest learner"}</h2>
                <p className="text-sm text-slate-400">{auth.isLoggedIn ? "Beginner learner" : "Sign in to track your learning"}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-200">
              {auth.isLoggedIn && <div className="rounded-2xl border border-white/10 bg-[#151c22] p-3">Email: {auth.email}</div>}
              <div className="rounded-2xl border border-white/10 bg-[#151c22] p-3">{auth.isLoggedIn ? "Account: This device" : "Account: Not signed in"}</div>
              <div className="rounded-2xl border border-white/10 bg-[#151c22] p-3">Current streak: {progress.streak} days</div>
            </div>

            {auth.isLoggedIn && <div className="mt-6 rounded-2xl border border-[#f4c65a]/20 bg-[#f4c65a]/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#f7d97d]">Weekly goal</p>
                <p className="text-sm text-slate-200">{goalProgress}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0d1217]">
                <div className="h-full rounded-full bg-[#f4c65a]" style={{ width: `${goalProgress}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-200">{progress.completedModules} of {progress.weeklyGoal} learning modules completed</p>
            </div>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
            {auth.isLoggedIn ? <>
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Progress overview</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#151c22] p-4">
                <p className="text-slate-400">Completed modules</p>
                <p className="mt-2 text-3xl font-bold text-white">{progress.completedModules}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#151c22] p-4">
                <p className="text-slate-400">Labs complete</p>
                <p className="mt-2 text-3xl font-bold text-white">{progress.labsComplete}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#151c22] p-4">
                <p className="text-slate-400">Quiz score</p>
                <p className="mt-2 text-3xl font-bold text-white">{progress.quizScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#151c22] p-4">
                <p className="text-slate-400">Saved notes</p>
                <p className="mt-2 text-3xl font-bold text-white">{progress.savedNotes}</p>
              </div>
              </div>
            </> : <div className="flex h-full min-h-64 flex-col items-start justify-center">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Your learning record</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Start your learner profile</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">Sign in or create an account to keep your modules, quiz results, notes, and learning streak together on this device.</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("cyberteka-open-auth"))}
                className="mt-5 rounded-xl bg-[#f4c65a] px-4 py-2.5 text-sm font-semibold text-[#11151b] transition hover:bg-[#f7d97d]"
              >
                Sign in or create account
              </button>
            </div>}
          </div>
        </div>

        <div className="mt-6">
          <SubscriptionPanel email={auth.email} isLoggedIn={auth.isLoggedIn} />
        </div>
      </div>
    </main>
  );
}
