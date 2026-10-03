"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../components/auth-panel";
import { deleteNote, useSavedNotes } from "../components/notes-store";

const notes = [
  { title: "CIA Triad", category: "Foundations", text: "Confidentiality, integrity, and availability define the core goals of information security.", example: "A private health record needs confidentiality; an accurate payment record needs integrity; an emergency service needs availability.", defense: "Choose controls by the goal at risk: access control, change validation, or resilient recovery.", source: "Course note: CIA Triad" },
  { title: "Authentication", category: "Identity", text: "Identity verification confirms that a user or system is who they claim to be.", example: "An application validates a user's credentials before it creates a protected session.", defense: "Use MFA where appropriate, protect session identifiers, and grant only necessary access.", source: "Course note: Authentication" },
  { title: "Zero Trust", category: "Architecture", text: "Do not trust a user or system automatically; verify each request and enforce least privilege.", example: "A request from inside a company network still has to prove identity and meet access policy.", defense: "Re-check identity and authorization at meaningful boundaries; review access regularly.", source: "Course note: Zero Trust; Glossary: Zero Trust" },
  { title: "XSS", category: "Web Security", text: "Cross-site scripting is a web vulnerability where injected client-side code runs in a visitor's browser.", example: "Untrusted text rendered as executable markup can run in the context of a trusted site.", defense: "Validate inputs, encode output for its context, and use appropriate application-layer protections.", source: "Course note: XSS; Networking Fundamentals — OSI Layer 7: Application" },
  { title: "TLS", category: "Networking", text: "Transport Layer Security protects communication between endpoints, supporting confidentiality and integrity in transit.", example: "HTTPS uses TLS to protect web traffic between a browser and a server.", defense: "Validate certificates and maintain supported TLS configuration; do not treat encryption as proof that an application itself is safe.", source: "Course note: TLS; Networking Fundamentals — OSI Layer 6: Presentation" },
  { title: "SIEM", category: "Monitoring", text: "Security information and event management systems aggregate and analyze logs or security telemetry for detection and response.", example: "Correlating repeated sign-in failures with a later success can help an analyst decide what to investigate.", defense: "Keep useful logs, protect them from tampering, tune detections, and verify alerts with context.", source: "Course note: SIEM; Glossary: SIEM" },
  { title: "Phishing", category: "Awareness", text: "A deceptive message can pressure a person to reveal sensitive information or take an unsafe action.", example: "An unexpected message asks the recipient to sign in through an unfamiliar link.", defense: "Verify requests through a separate trusted channel, inspect the destination, and report suspicious messages.", source: "Glossary: Phishing" },
  { title: "Firewalls", category: "Networking", text: "A firewall monitors and filters network traffic according to an access policy.", example: "A rule can allow a required service between a known source and destination while blocking other flows.", defense: "Keep rules narrow, review them regularly, and pair filtering with monitoring and segmentation.", source: "Glossary: Firewall; Networking Fundamentals — OSI Layer 4: Transport" },
  { title: "Vulnerability, threat, and exploit", category: "Foundations", text: "A vulnerability is a weakness, a threat is a potential danger, and an exploit is a technique that takes advantage of a weakness.", example: "A software flaw is a vulnerability; a threat actor may target it; an exploit is the method used to take advantage of it.", defense: "Prioritize fixing exposed weaknesses, reduce access, monitor relevant activity, and verify remediation.", source: "Glossary: Vulnerability, Threat, and Exploit" },
];

export default function NotesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const { auth } = useAuth();
  const savedNotes = useSavedNotes(auth.isLoggedIn ? auth.email : "");
  const categories = ["All", ...new Set(notes.map((note) => note.category))];
  const query = search.trim().toLowerCase();
  const visibleNotes = useMemo(() => notes.filter((note) => (category === "All" || note.category === category)
    && `${note.title} ${note.text} ${note.example} ${note.defense}`.toLowerCase().includes(query)), [category, query]);
  const visibleSavedNotes = useMemo(() => savedNotes.filter((note) =>
    (category === "All" || note.category === category)
    && `${note.title} ${note.content} ${note.category}`.toLowerCase().includes(query)), [savedNotes, category, query]);

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Knowledge base · {savedNotes.length} saved</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Cybersecurity Notes</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Build a strong foundation by connecting definitions to real-world security concepts, defensive strategies, and attacker tradecraft.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#11151b] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="w-full lg:max-w-md">
              <span className="sr-only">Search notes</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search concepts, examples, and defenses" className="w-full rounded-xl border border-white/10 bg-[#0d1217] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#f4c65a]/40 focus:outline-none" />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Filter by category">
              {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full border px-3 py-1.5 text-xs transition ${category === item ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]" : "border-white/10 bg-[#151c22] text-slate-300 hover:border-white/20"}`}>{item}</button>)}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">{visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}</p>
        </section>

        {auth.isLoggedIn && savedNotes.length > 0 && (
          <section className="mb-6 rounded-2xl border border-[#f4c65a]/20 bg-[#11151b] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Your saved notes · {savedNotes.length}</p>
            {visibleSavedNotes.length === 0
              ? <p className="mt-3 text-sm text-slate-400">No saved notes match that search.</p>
              : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleSavedNotes.map((note) => (
                    <article key={note.id} className="flex flex-col rounded-2xl border border-[#f4c65a]/15 bg-[#0d1217] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#f7d97d]">{note.category}</p>
                        <button type="button" onClick={() => deleteNote(auth.email, note.id)} className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400 transition hover:border-rose-300/30 hover:text-rose-200">Delete</button>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-white">{note.title}</h2>
                      <div className="prose prose-invert mt-2 max-w-none flex-1 text-sm leading-6 text-slate-300"><ReactMarkdown>{note.content}</ReactMarkdown></div>
                      <p className="mt-4 border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Saved {new Date(note.createdAt).toLocaleString()} · {auth.name || auth.email}</p>
                    </article>
                  ))}
                </div>}
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleNotes.map((note) => (
            <article key={note.title} className="rounded-2xl border border-white/10 bg-[#11151b] p-5 transition hover:border-[#f4c65a]/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#f4c65a]">{note.category}</p>
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{note.source}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{note.title}</h2>
              <div className="prose prose-invert mt-2 max-w-none text-sm leading-6 text-slate-300"><ReactMarkdown>{note.text}</ReactMarkdown></div>
              <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Example</p><p className="mt-1 text-sm leading-6 text-slate-300">{note.example}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Defensive takeaway</p><p className="mt-1 text-sm leading-6 text-slate-300">{note.defense}</p></div>
              </div>
            </article>
          ))}
        </div>
        {visibleNotes.length === 0 && <p className="rounded-2xl border border-white/10 bg-[#11151b] p-8 text-center text-sm text-slate-400">No notes match that search. Try a different term or category.</p>}
      </div>
    </main>
  );
}
