"use client";

import { useMemo, useState } from "react";
import { BackButton } from "../components/back-button";

const concepts = [
  {
    term: "Vulnerability",
    category: "Fundamentals",
    definition: "A weakness in software, configuration, or design that could be exploited under the right conditions.",
  },
  {
    term: "Threat",
    category: "Fundamentals",
    definition: "A potential danger or actor that could cause harm to systems, data, or operations.",
  },
  {
    term: "Exploit",
    category: "Offense",
    definition: "A technique or tool used to take advantage of a vulnerability.",
  },
  {
    term: "Firewall",
    category: "Defense",
    definition: "A security control that monitors and filters network traffic based on policy.",
  },
  {
    term: "Encryption",
    category: "Defense",
    definition: "The process of converting readable data into a form that is not intelligible without the right key.",
  },
  {
    term: "Zero Trust",
    category: "Architecture",
    definition: "A security model that assumes no system or user should be trusted by default.",
  },
  {
    term: "XSS",
    category: "Web Security",
    definition: "Cross-site scripting is a web vulnerability where malicious script executes in a victim's browser.",
  },
  {
    term: "SIEM",
    category: "Monitoring",
    definition: "Security information and event management systems aggregate and analyze security telemetry for detection and response.",
  },
  {
    term: "Phishing",
    category: "Social Engineering",
    definition: "A deceptive technique that tricks users into revealing sensitive information or performing unsafe actions.",
  },
];

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", ...new Set(concepts.map((concept) => concept.category))];

  const filteredConcepts = useMemo(() => {
    const query = search.toLowerCase();
    return concepts.filter((concept) => {
      const matchesCategory = selectedCategory === "All" || concept.category === selectedCategory;
      const matchesSearch =
        concept.term.toLowerCase().includes(query) || concept.definition.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="mb-4 flex justify-end">
            <BackButton href="/" />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Reference</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Cybersecurity Glossary</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Keep the language of cybersecurity clear, practical, and easy to revisit while learning.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-[#11151b] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search glossary terms..."
              className="w-full rounded-2xl border border-white/10 bg-[#0d1217] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#f4c65a]/40 focus:outline-none lg:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
                    selectedCategory === category
                      ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]"
                      : "border-white/10 bg-[#151c22] text-slate-300 hover:border-white/20"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredConcepts.map((concept) => (
            <article key={concept.term} className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">{concept.category}</p>
                <span className="rounded-full border border-white/10 bg-[#151c22] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                  Term
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-white">{concept.term}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{concept.definition}</p>
            </article>
          ))}
        </div>

        {filteredConcepts.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-[#11151b] p-6 text-center text-slate-300">
            No glossary entries match your current search.
          </div>
        )}
      </div>
    </main>
  );
}
