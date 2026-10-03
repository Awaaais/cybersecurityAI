"use client";

import { useSyncExternalStore } from "react";

export type BillingCycle = "monthly" | "yearly";
export type PaymentMethod = "mpesa" | "google-pay" | "card";
export type SubscriptionState = {
  plan: "free" | "plus" | "platinum" | "premium-gold";
  billingCycle: BillingCycle | null;
  paymentMethod: PaymentMethod | null;
  activatedAt: string | null;
  renewsAt: string | null;
  checkoutMode: "none" | "demo";
};

const SUBSCRIPTION_CHANGED = "cyberteka-subscription-change";
const FREE_SUBSCRIPTION: SubscriptionState = {
  plan: "free",
  billingCycle: null,
  paymentMethod: null,
  activatedAt: null,
  renewsAt: null,
  checkoutMode: "none",
};
const FREE_SNAPSHOT = JSON.stringify(FREE_SUBSCRIPTION);

export type SubscriptionPlan = {
  id: "free" | "platinum" | "premium-gold";
  name: string;
  badge: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  limits: string[];
  usageLimit: string;
  highlight: boolean;
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Basic",
    badge: "Start here",
    description: "Build your security foundations at your own pace, with no cost.",
    monthlyPrice: "KSh 0",
    yearlyPrice: "KSh 0",
    features: ["Core cybersecurity lessons", "Linux notes and knowledge checks", "TeKAI Beginner and Standard modes"],
    limits: ["One learner profile on this device", "Saved notes stored locally", "No interactive terminal labs"],
    usageLimit: "Free forever · core learning only",
    highlight: false,
  },
  {
    id: "platinum",
    name: "Platinum",
    badge: "Most popular",
    description: "Practice deeper with guided labs and an advanced tutor mode.",
    monthlyPrice: "KSh 499",
    yearlyPrice: "KSh 4,990",
    features: ["Unlimited isolated terminal labs", "Advanced authentication and log exercises", "Expert TeKAI explanation mode"],
    limits: ["Unlimited practice in the local simulator", "Full guided lab library", "All TeKAI explanation modes"],
    usageLimit: "Unlimited simulated practice",
    highlight: true,
  },
  {
    id: "premium-gold",
    name: "Premium Gold",
    badge: "Advanced",
    description: "A higher-touch learning tier for focused, defensive security practice.",
    monthlyPrice: "Pricing not configured",
    yearlyPrice: "Pricing not configured",
    features: ["Everything in Platinum", "Advanced defensive scenarios", "Priority learning-path access"],
    limits: ["Advanced multi-step lab scenarios", "Priority access to new labs", "Tier limits pending configuration"],
    usageLimit: "Tier limits not configured",
    highlight: false,
  },
];

const subscriptionKey = (email: string) => `cyberteka-subscription-${email.trim().toLowerCase()}`;

const getSnapshot = (email: string) => {
  if (!email) return FREE_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(subscriptionKey(email));
    if (!raw) return FREE_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<SubscriptionState>;
    if (!["plus", "platinum", "premium-gold"].includes(parsed.plan ?? "") || !parsed.renewsAt || Date.parse(parsed.renewsAt) <= Date.now()) return FREE_SNAPSHOT;
    return JSON.stringify({ ...FREE_SUBSCRIPTION, ...parsed, plan: parsed.plan === "plus" ? "platinum" : parsed.plan });
  } catch {
    return FREE_SNAPSHOT;
  }
};

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener(SUBSCRIPTION_CHANGED, onStoreChange);
  window.addEventListener("cyberteka-auth-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SUBSCRIPTION_CHANGED, onStoreChange);
    window.removeEventListener("cyberteka-auth-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

const getServerSnapshot = () => FREE_SNAPSHOT;

export const useSubscription = (email: string) => {
  const snapshot = useSyncExternalStore(subscribe, () => getSnapshot(email), getServerSnapshot);
  try {
    return JSON.parse(snapshot) as SubscriptionState;
  } catch {
    return FREE_SUBSCRIPTION;
  }
};

export const activateDemoSubscription = (email: string, plan: Exclude<SubscriptionState["plan"], "free" | "plus">, billingCycle: BillingCycle) => {
  if (typeof window === "undefined" || !email) return;
  const now = new Date();
  const renewsAt = new Date(now);
  if (billingCycle === "monthly") renewsAt.setMonth(renewsAt.getMonth() + 1);
  else renewsAt.setFullYear(renewsAt.getFullYear() + 1);
  const next: SubscriptionState = {
    plan,
    billingCycle,
    paymentMethod: null,
    activatedAt: now.toISOString(),
    renewsAt: renewsAt.toISOString(),
    checkoutMode: "demo",
  };
  window.localStorage.setItem(subscriptionKey(email), JSON.stringify(next));
  window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED));
};

export const cancelDemoSubscription = (email: string) => {
  if (typeof window === "undefined" || !email) return;
  window.localStorage.removeItem(subscriptionKey(email));
  window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED));
};

export const hasPremiumAccess = (subscription: SubscriptionState) => subscription.plan !== "free" && subscription.renewsAt !== null && Date.parse(subscription.renewsAt) > Date.now();