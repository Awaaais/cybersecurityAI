"use client";

import { useState } from "react";

type CodeBlockProps = {
  code: string;
  label?: string;
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard unavailable");
};

export function CodeBlock({ code, label }: CodeBlockProps) {
  const [feedback, setFeedback] = useState("");

  const handleCopy = async () => {
    try {
      await copyText(code);
      setFeedback("Copied!");
    } catch {
      setFeedback("Copy unavailable");
    }
    window.setTimeout(() => setFeedback(""), 1800);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#080d0f]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <p className="min-w-0 truncate text-xs leading-5 text-slate-400">{label ?? "Command"}</p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="shrink-0 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/5"
        >
          Copy Code
        </button>
        <span className="sr-only" aria-live="polite">{feedback}</span>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-5 text-[#c4f1da]"><code>{code}</code></pre>
    </div>
  );
}