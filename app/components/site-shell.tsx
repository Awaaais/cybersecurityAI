"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthPanel, useAuth } from "./auth-panel";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "TeKAI", href: "/tekai" },
  { name: "Networking", href: "/networking" },
  { name: "Linux", href: "/linux" },
  { name: "Labs", href: "/labs" },
  { name: "Notes", href: "/notes" },
  { name: "Quizzes", href: "/quizzes" },
  { name: "Glossary", href: "/glossary" },
  { name: "Profile", href: "/profile" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { auth, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setMobileOpen(false);
    const onOpenAuth = () => setAuthOpen(true);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("cyberteka-open-auth", onOpenAuth);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("cyberteka-open-auth", onOpenAuth);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#f4c65a]/20 bg-[#091015]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f4c65a]/35 bg-[#f4c65a]/10 text-lg font-bold text-[#f7d97d]">
                C
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#f4c65a]">CyberTeKa</p>
                <p className="text-sm font-semibold text-white">Learn. Practice. Defend.</p>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-2 xl:flex">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <Link href="/tekai" className="rounded-full border border-[#f4c65a]/30 bg-[#f4c65a]/10 px-3 py-2 text-sm font-medium text-[#f7d97d] transition hover:bg-[#f4c65a]/15">
              Open TeKAI
            </Link>
            {auth.isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-200">{auth.name}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-white/10 bg-[#151c22] px-3 py-2 text-sm text-slate-200 hover:border-white/20"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-full border border-white/10 bg-[#151c22] px-3 py-2 text-sm text-slate-100 hover:border-[#f4c65a]/30"
              >
                Login
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#11151b] text-lg text-white xl:hidden"
          >
            ☰
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-[#091015] xl:hidden">
            <nav className="mx-auto flex max-w-[1600px] flex-col gap-1 px-4 py-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
                >
                  {item.name}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-3">
                <Link href="/tekai" onClick={() => setMobileOpen(false)} className="flex-1 rounded-xl border border-[#f4c65a]/30 bg-[#f4c65a]/10 px-3 py-2 text-center text-sm font-medium text-[#f7d97d]">
                  TeKAI
                </Link>
                {auth.isLoggedIn ? (
                  <button type="button" onClick={signOut} className="flex-1 rounded-xl border border-white/10 bg-[#151c22] px-3 py-2 text-sm text-slate-200">
                    Sign out
                  </button>
                ) : (
                  <button type="button" onClick={() => { setAuthOpen(true); setMobileOpen(false); }} className="flex-1 rounded-xl border border-white/10 bg-[#151c22] px-3 py-2 text-sm text-slate-200">
                    Login
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setAuthOpen(false)}
              className="absolute right-3 top-3 text-2xl text-slate-300"
              aria-label="Close login dialog"
            >
              ×
            </button>
            <AuthPanel onSuccess={() => setAuthOpen(false)} />
          </div>
        </div>
      )}

      <div>{children}</div>
    </>
  );
}
