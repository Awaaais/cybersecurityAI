"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export type AuthState = {
  email: string;
  name: string;
  isLoggedIn: boolean;
};

export const AUTH_STORAGE_KEY = "cyberteka-auth";
export const ACCOUNTS_STORAGE_KEY = "cyberteka-accounts";

type StoredAccount = {
  name: string;
  passwordHash: string;
};

const readAccounts = (): Record<string, StoredAccount> => {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, StoredAccount> : {};
  } catch {
    return {};
  }
};

const hashPassword = async (password: string) => {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const getDefaultProgress = () => ({
  completedModules: 0,
  labsComplete: 0,
  quizScore: 0,
  savedNotes: 0,
  streak: 0,
  weeklyGoal: 5,
});

export const getUserProgressKey = (email: string) => `cyberteka-progress-${String(email || "").trim().toLowerCase()}`;

export const readProgress = (email?: string) => {
  if (typeof window === "undefined" || !email) {
    return getDefaultProgress();
  }

  const key = getUserProgressKey(email);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    const fallback = getDefaultProgress();
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return { ...getDefaultProgress(), ...JSON.parse(raw) };
  } catch {
    const fallback = getDefaultProgress();
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
};

export const saveProgress = (email: string, updates: Partial<ReturnType<typeof getDefaultProgress>>) => {
  if (typeof window === "undefined" || !email) return;

  const next = { ...readProgress(email), ...updates };
  window.localStorage.setItem(getUserProgressKey(email), JSON.stringify(next));
  window.dispatchEvent(new Event("cyberteka-progress-change"));
};

export const readAuth = (): AuthState => {
  if (typeof window === "undefined") {
    return { email: "", name: "", isLoggedIn: false };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { email: "", name: "", isLoggedIn: false };
    }

    const parsed = JSON.parse(raw) as Partial<AuthState>;
    const email = parsed.email?.trim().toLowerCase() ?? "";
    const account = email ? readAccounts()[email] : undefined;
    if (!parsed.isLoggedIn || !email || !account) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return { email: "", name: "", isLoggedIn: false };
    }

    return {
      email,
      name: account.name,
      isLoggedIn: Boolean(parsed.isLoggedIn),
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return { email: "", name: "", isLoggedIn: false };
  }
};

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ email: "", name: "", isLoggedIn: false });

  useEffect(() => {
    const sync = () => setAuth(readAuth());
    sync();
    window.addEventListener("cyberteka-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cyberteka-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const saveAuth = (next: AuthState) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    }
    setAuth(next);
    window.dispatchEvent(new Event("cyberteka-auth-change"));
  };

  const signOut = () => {
    const cleared = { email: "", name: "", isLoggedIn: false };
    saveAuth(cleared);
  };

  return { auth, saveAuth, signOut };
}

export function AuthPanel({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const { saveAuth } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const accountEmail = email.trim().toLowerCase();

    if (submissionLock.current) return;
    if (!accountEmail || !password || (mode === "signup" && !name.trim())) {
      setFormError("Complete all required fields to continue.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setFormError("Enter a name with at least 2 characters.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setFormError("Use a password with at least 8 characters.");
      return;
    }

    setFormError("");
    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      const accounts = readAccounts();
      const passwordHash = await hashPassword(password);
      let account: StoredAccount;

      if (mode === "signup") {
        if (accounts[accountEmail]) {
          setFormError("An account with this email already exists. Log in instead.");
          return;
        }

        account = { name: name.trim(), passwordHash };
        accounts[accountEmail] = account;
        window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        window.localStorage.setItem(getUserProgressKey(accountEmail), JSON.stringify(getDefaultProgress()));
      } else {
        account = accounts[accountEmail];
        if (!account || account.passwordHash !== passwordHash) {
          setFormError("Email or password is incorrect.");
          return;
        }

        if (!window.localStorage.getItem(getUserProgressKey(accountEmail))) {
          window.localStorage.setItem(getUserProgressKey(accountEmail), JSON.stringify(getDefaultProgress()));
        }
      }

      saveAuth({ email: accountEmail, name: account.name, isLoggedIn: true });
      window.dispatchEvent(new Event("cyberteka-progress-change"));
      onSuccess?.();
    } catch {
      setFormError("Could not access account storage in this browser. Please try again.");
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Access</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isSubmitting) return;
            setMode(mode === "login" ? "signup" : "login");
            setFormError("");
            setPassword("");
          }}
          disabled={isSubmitting}
          className="rounded-full border border-white/10 bg-[#151c22] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300"
        >
          {mode === "login" ? "Sign up" : "Login"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block text-sm text-slate-200">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Full name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-xl border border-white/10 bg-[#0d1217] px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#f4c65a]/40 focus:outline-none"
              placeholder="Your name"
            />
          </label>
        )}

        <label className="block text-sm text-slate-200">
          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete={mode === "signup" ? "email" : "username"}
            className="w-full rounded-xl border border-white/10 bg-[#0d1217] px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#f4c65a]/40 focus:outline-none"
            placeholder="name@example.com"
          />
        </label>

        <label className="block text-sm text-slate-200">
          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Password</span>
          <span className="flex rounded-xl border border-white/10 bg-[#0d1217] focus-within:border-[#f4c65a]/40">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Enter your password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="shrink-0 rounded-r-xl px-3 text-xs font-medium text-[#f7d97d] hover:bg-white/5"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>

        {formError && <p role="alert" className="text-sm text-rose-300">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#f4c65a] px-4 py-3 text-sm font-semibold text-[#11151b] transition hover:bg-[#f7d97d]"
        >
          {isSubmitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
