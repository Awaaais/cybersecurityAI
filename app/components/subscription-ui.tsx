"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth-panel";
import {
  activateDemoSubscription,
  cancelDemoSubscription,
  hasPremiumAccess,
  useSubscription,
  type BillingCycle,
  type PaymentMethod,
} from "./subscription-store";

const methodLabels: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  "google-pay": "Google Pay",
  card: "Debit / credit card",
};

export function SubscriptionPanel({ email, isLoggedIn }: { email: string; isLoggedIn: boolean }) {
  const subscription = useSubscription(email);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [feedback, setFeedback] = useState("");
  const premium = hasPremiumAccess(subscription);
  const renewsAt = subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : "";

  const activatePreview = () => {
    if (!isLoggedIn || !email) {
      setFeedback("Sign in before selecting a plan.");
      return;
    }
    activateDemoSubscription(email, billingCycle, paymentMethod);
    setFeedback("Demo plan activated locally. No payment was processed.");
  };

  return (
    <section id="subscription-plans" className="scroll-mt-24 rounded-3xl border border-emerald-300/20 bg-[#0d1415] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Membership</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">CyberTeKa Plus</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Unlock guided Linux terminal labs, advanced scenarios, and Expert tutor mode. Course notes and beginner learning remain free.</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1.5 text-xs ${premium ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"}`}>{premium ? "Plus preview active" : "Free plan"}</span>
      </div>

      {premium ? <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-300/15 bg-[#10191b] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Plus preview is active until {renewsAt}</p>
          <p className="mt-1 text-xs text-slate-400">Checkout mode: local demo · selected method: {subscription.paymentMethod ? methodLabels[subscription.paymentMethod] : "none"} · no charge was made.</p>
        </div>
        <button type="button" onClick={() => { cancelDemoSubscription(email); setFeedback("Returned to the free plan."); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-white/20 hover:text-white">Cancel preview</button>
      </div> : <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-white/10 bg-[#10191b] p-4">
          <p className="text-sm font-semibold text-white">Plus includes</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <li>• Isolated command-terminal labs</li>
            <li>• Advanced authentication and log investigation exercises</li>
            <li>• Expert TeKAI explanation mode</li>
            <li>• Progress saved to your account on this device</li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-amber-100">Sample pricing: {billingCycle === "monthly" ? "KSh 499 / month" : "KSh 4,990 / year"}. Prices are placeholders for this demo.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#10191b] p-4">
          <fieldset>
            <legend className="text-sm font-medium text-white">Billing cycle</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["monthly", "yearly"] as const).map((cycle) => <button key={cycle} type="button" aria-pressed={billingCycle === cycle} onClick={() => setBillingCycle(cycle)} className={`rounded-lg border px-3 py-2.5 text-sm capitalize transition ${billingCycle === cycle ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-[#0b1214] text-slate-300 hover:border-white/20"}`}>{cycle}</button>)}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-white">Payment method</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(["mpesa", "google-pay", "card"] as const).map((method) => <button key={method} type="button" aria-pressed={paymentMethod === method} onClick={() => setPaymentMethod(method)} className={`min-h-11 rounded-lg border px-2 py-2 text-xs transition ${paymentMethod === method ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-[#0b1214] text-slate-300 hover:border-white/20"}`}>{methodLabels[method]}</button>)}
            </div>
          </fieldset>

          <p className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100">Demo checkout only: no M-Pesa request, Google Pay transaction, or card charge is sent. Do not enter payment credentials here. Real billing requires a secure payment-provider integration.</p>
          {!isLoggedIn ? <button type="button" onClick={() => window.dispatchEvent(new Event("cyberteka-open-auth"))} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-[#07100e] hover:bg-emerald-200">Sign in or create an account</button> : <button type="button" onClick={activatePreview} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-[#07100e] hover:bg-emerald-200">Activate demo plan</button>}
          {feedback && <p role="status" className="mt-3 text-xs text-emerald-100">{feedback}</p>}
        </div>
      </div>}
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