"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth-panel";
import {
  activateDemoSubscription,
  cancelDemoSubscription,
  hasPremiumAccess,
  subscriptionPlans,
  useSubscription,
  type BillingCycle,
} from "./subscription-store";

function SubscriptionCard({
  plan,
  billingCycle,
  current,
  isLoggedIn,
  onSelect,
}: {
  plan: (typeof subscriptionPlans)[number];
  billingCycle: BillingCycle;
  current: boolean;
  isLoggedIn: boolean;
  onSelect: () => void;
}) {
  const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const period = price.startsWith("KSh") ? (plan.id === "free" ? "" : billingCycle === "monthly" ? "/ month" : "/ year") : "";

  return (
    <article className={`relative flex min-h-full flex-col rounded-2xl border bg-white/[0.035] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#f4c65a]/40 hover:shadow-[0_24px_60px_rgba(244,198,90,0.08)] ${plan.id === "premium-gold" ? "border-[#f4c65a]/35" : "border-white/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">{plan.id === "free" ? "Start here" : plan.id === "platinum" ? "Most popular" : "Advanced"}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{plan.name}</h3>
        </div>
        {current && <span className="shrink-0 rounded-full border border-[#f4c65a]/30 bg-[#f4c65a]/10 px-2.5 py-1 text-[10px] font-medium text-[#f7d97d]">Current plan</span>}
      </div>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">{plan.description}</p>
      <div className="mt-5 min-h-14">
        <p className={`text-xl font-semibold ${price.startsWith("KSh") ? "text-white" : "text-[#f7d97d]"}`}>{price}</p>
        {period && <p className="mt-1 text-xs text-slate-500">{period} · local demo pricing</p>}
      </div>
      <ul className="mt-5 flex-1 space-y-3 border-t border-white/10 pt-4 text-sm leading-5 text-slate-200">
        {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden="true" className="text-[#f4c65a]">+</span><span>{feature}</span></li>)}
      </ul>
      <p className="mt-5 min-h-10 text-xs leading-5 text-slate-500">{plan.usageLimit}</p>
      <button
        type="button"
        onClick={onSelect}
        disabled={current}
        className={`mt-4 min-h-11 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-default disabled:opacity-60 ${plan.id === "free" ? "border-white/15 bg-white/5 text-slate-100 hover:border-white/30" : "border-[#f4c65a]/50 bg-[#f4c65a] text-[#11151b] hover:bg-[#f7d97d]"}`}
      >
        {current ? "Current plan" : !isLoggedIn ? "Sign in to select" : plan.id === "free" ? "Switch to Basic" : `Preview ${plan.name}`}
      </button>
    </article>
  );
}

export function SubscriptionPanel({ email, isLoggedIn }: { email: string; isLoggedIn: boolean }) {
  const subscription = useSubscription(email);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [feedback, setFeedback] = useState("");
  const premium = hasPremiumAccess(subscription);
  const renewsAt = subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : "";

  const selectPlan = (plan: "free" | "platinum" | "premium-gold") => {
    if (!isLoggedIn || !email) {
      setFeedback("Sign in before selecting a plan.");
      window.dispatchEvent(new Event("cyberteka-open-auth"));
      return;
    }
    if (plan === "free") {
      cancelDemoSubscription(email);
      setFeedback("Returned to the Basic plan.");
      return;
    }
    activateDemoSubscription(email, plan, billingCycle);
    setFeedback(`${plan === "platinum" ? "Platinum" : "Premium Gold"} preview activated locally. No payment was processed.`);
  };

  return (
    <section id="subscription-plans" className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#f4c65a]/20 bg-[radial-gradient(ellipse_at_top,_rgba(244,198,90,0.09),_rgba(13,20,21,0.94)_52%)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Membership</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Choose your learning plan</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Basic learning stays open. Paid tiers are local previews only; there is no connected checkout or payment provider.</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1.5 text-xs ${premium ? "border-[#f4c65a]/30 bg-[#f4c65a]/10 text-[#f7d97d]" : "border-white/10 bg-white/5 text-slate-300"}`}>{premium ? `${subscription.plan === "premium-gold" ? "Premium Gold" : "Platinum"} preview active` : "Basic plan"}</span>
      </div>

      {premium && <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#f4c65a]/15 bg-[#10191b]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Local preview active until {renewsAt}</p>
          <p className="mt-1 text-xs text-slate-400">No payment was taken. Preview state is saved on this device.</p>
        </div>
        <button type="button" onClick={() => { cancelDemoSubscription(email); setFeedback("Returned to the Basic plan."); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-white/20 hover:text-white">Cancel preview</button>
      </div>}

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-white">Billing display</legend>
        <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
          {(["monthly", "yearly"] as const).map((cycle) => <button key={cycle} type="button" aria-pressed={billingCycle === cycle} onClick={() => setBillingCycle(cycle)} className={`min-h-9 rounded-lg px-3 text-xs capitalize transition ${billingCycle === cycle ? "bg-[#f4c65a]/15 text-[#f7d97d]" : "text-slate-400 hover:text-white"}`}>{cycle}</button>)}
        </div>
      </fieldset>
      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subscriptionPlans.map((plan) => <SubscriptionCard
          key={plan.id}
          plan={plan}
          billingCycle={billingCycle}
          current={plan.id === "free" ? !premium : subscription.plan === plan.id && premium}
          isLoggedIn={isLoggedIn}
          onSelect={() => selectPlan(plan.id)}
        />)}
      </div>
      <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100">Demo only: plan previews do not charge money. Platinum amounts are the existing sample prices; Premium Gold pricing and production checkout require product and payment-provider configuration.</p>
      {feedback && <p role="status" className="mt-3 text-xs text-[#f7d97d]">{feedback}</p>}
    </section>
  );
}

export function PremiumGate({ feature, children }: { feature: string; children?: ReactNode }) {
  const { auth } = useAuth();
  const subscription = useSubscription(auth.isLoggedIn ? auth.email : "");
  if (hasPremiumAccess(subscription)) return <>{children}</>;

  return <section className="rounded-2xl border border-emerald-300/20 bg-[#0d1415] p-5 sm:p-6">
    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">CyberTeKa Plus</p>
    <h3 className="mt-2 text-lg font-semibold text-white">{feature} is a Plus service</h3>
    <p className="mt-2 text-sm leading-6 text-slate-300">Upgrade from your learner profile to unlock this activity. The current checkout is a local demo and does not process real payments.</p>
    <Link href="/profile#subscription-plans" className="mt-4 inline-flex rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-300/15">View plans</Link>
  </section>;
}