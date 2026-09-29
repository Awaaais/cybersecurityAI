"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDefaultProgress, readAuth, readProgress, useAuth } from "./components/auth-panel";

const defaultProgress = getDefaultProgress();

function useDashboardProgress() {
  const [progress, setProgress] = useState(defaultProgress);

  useEffect(() => {
    const syncProgress = () => {
      const auth = readAuth();
      const next = auth.isLoggedIn && auth.email ? readProgress(auth.email) : defaultProgress;
      setProgress(next);
    };

    syncProgress();
    window.addEventListener("cyberteka-auth-change", syncProgress);
    window.addEventListener("cyberteka-progress-change", syncProgress);

    return () => {
      window.removeEventListener("cyberteka-auth-change", syncProgress);
      window.removeEventListener("cyberteka-progress-change", syncProgress);
    };
  }, []);

  return progress;
}

const learningPaths = [
  { title: "Networking Fundamentals", level: "Beginner", description: "Understand packets, addressing, protocols, and the OSI model." },
  { title: "Linux Security Basics", level: "Beginner", description: "From shell commands to permissions, users, and process control." },
  { title: "Web Security", level: "Intermediate", description: "Explore HTTP, XSS, auth flows, headers, and secure coding patterns." },
];

const labs = [
  { title: "Linux Command Practice", difficulty: "Beginner", status: "Ready" },
  { title: "Packet Analysis Basics", difficulty: "Intermediate", status: "Running" },
  { title: "Firewall Concepts", difficulty: "Beginner", status: "Queued" },
];

const factCards = [
  "DNS translates human-readable names into IP addresses.",
  "HTTPS uses TLS to protect the data in transit between a browser and a server.",
  "A MAC address is not the same as an IP address and works at a different layer.",
];

const searchableResources = [
  { title: "Networking Fundamentals", description: "OSI layers 1 to 7, TCP, UDP, IP, IPv4, IPv6, MAC addresses, subnets, DNS, DHCP, HTTP, HTTPS, TLS, routers, switches, firewalls", href: "/networking" },
  { title: "Linux Learning Path", description: "Linux operating system, filesystem, pwd, ls, cd, mkdir, touch, rm, cp, mv, ln, cat, less, head, tail, grep, awk, sed, sort, uniq, chmod, chown, chgrp, sudo, ps, top, htop, kill, jobs, bg, fg, ip addr, ifconfig, ping, ss, netstat, nmap", href: "/linux" },
  { title: "Cybersecurity Labs", description: "Linux command practice, file permissions, firewall concepts, packet analysis, authentication testing, log investigation; isolated hands-on learning", href: "/labs" },
  { title: "Quizzes and Checkpoints", description: "Networking, Linux, OSI, transport protocols, authentication, least privilege, permissions and cybersecurity knowledge checks", href: "/quizzes" },
  { title: "Cybersecurity Notes", description: "CIA Triad confidentiality integrity availability, authentication, Zero Trust, TLS encryption, XSS, SIEM, phishing, firewall, vulnerability, threat, exploit", href: "/notes" },
  { title: "Cybersecurity Glossary", description: "Definitions for vulnerability, threat, exploit, firewall, encryption, Zero Trust, XSS, SIEM, phishing and network security terminology", href: "/glossary" },
  { title: "TeKAI Tutor", description: "Ask about cybersecurity, networking, Linux, operating systems, commands and IT concepts", href: "/tekai" },
  { title: "Learner Profile", description: "Review account information and progress", href: "/profile" },
];

const osiLayers = [
  {
    number: 7,
    name: "Application",
    summary: "Software interfaces users rely on, such as browsers, email clients, and APIs.",
    data: "Data",
    examples: ["HTTP", "SMTP", "DNS"],
    security: "Application-layer input validation and secure protocols matter here.",
  },
  {
    number: 6,
    name: "Presentation",
    summary: "Formats and encrypts data so applications can understand it correctly.",
    data: "Data",
    examples: ["TLS", "JPEG", "JSON"],
    security: "Encryption and encoding help protect data before transmission.",
  },
  {
    number: 5,
    name: "Session",
    summary: "Manages sessions, connections, and communication setup between devices.",
    data: "Data",
    examples: ["RPC", "NetBIOS", "WebSocket"],
    security: "Session hijacking is a risk when sessions are not protected.",
  },
  {
    number: 4,
    name: "Transport",
    summary: "Ensures reliable or fast delivery of data between endpoints.",
    data: "Segments / Datagrams",
    examples: ["TCP", "UDP"],
    security: "Connection state and port filtering help control network access.",
  },
  {
    number: 3,
    name: "Network",
    summary: "Routes packets across networks by using logical addresses.",
    data: "Packets",
    examples: ["IP", "ICMP", "Routing"],
    security: "Routers, ACLs, and segmentation limit traffic exposure.",
  },
  {
    number: 2,
    name: "Data Link",
    summary: "Moves frames locally between devices on the same network segment.",
    data: "Frames",
    examples: ["Ethernet", "Wi‑Fi", "MAC"],
    security: "Switches and VLANs can reduce broadcast exposure.",
  },
  {
    number: 1,
    name: "Physical",
    summary: "Carries the actual electrical or radio signals over a medium.",
    data: "Bits",
    examples: ["Cables", "Fiber", "Radio"],
    security: "Physical access controls and signal protection matter here.",
  },
];

export default function Home() {
  const [selectedLayer, setSelectedLayer] = useState(osiLayers[3]);
  const [factIndex, setFactIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const progress = useDashboardProgress();
  const { auth } = useAuth();

  const progressStats = [
    { label: "Overall", value: `${Math.min(100, Math.round((progress.completedModules / 15) * 100))}%`, detail: "Path progress" },
    { label: "Networking", value: `${Math.min(100, Math.round((progress.completedModules / 18) * 100))}%`, detail: "Modules" },
    { label: "Linux", value: `${Math.min(100, Math.round((progress.savedNotes / 22) * 100))}%`, detail: "Skills" },
    { label: "Labs", value: `${progress.labsComplete}`, detail: "Completed" },
  ];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? searchableResources.filter((resource) => `${resource.title} ${resource.description}`.toLowerCase().includes(normalizedSearch)).slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-[#070b10] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-5 lg:px-6">
        <main>
          <header className="mb-6 rounded-2xl border border-[#f4c65a]/20 bg-[#11151b]/80 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#f4c65a]">{auth.isLoggedIn ? "LEARNER DASHBOARD" : "CYBERSECURITY LEARNING PLATFORM"}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{auth.isLoggedIn ? `Welcome back, ${auth.name}.` : "Welcome to CyberTeKa — Learn. Practice. Defend."}</h2>
              </div>

              <div className="flex w-full min-w-0 items-center gap-3 md:w-auto">
                <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                    aria-label="Search CyberTeKa courses and services"
                    placeholder="Search courses, notes, labs..."
                    className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#f4c65a]/40"
                  />
                  {searchOpen && normalizedSearch && <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-xl border border-white/10 bg-[#10171d] p-2 shadow-2xl">
                    {searchResults.length ? searchResults.map((resource) => <Link key={resource.href} href={resource.href} onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="block rounded-lg px-3 py-2.5 transition hover:bg-white/5">
                      <span className="block text-sm font-medium text-white">{resource.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-400">{resource.description}</span>
                    </Link>) : <p className="px-3 py-3 text-sm text-slate-400">No courses or resources match “{searchQuery}”.</p>}
                  </div>}
                </div>
                <Link href="/tekai" className="shrink-0 rounded-xl border border-[#f4c65a]/30 bg-[#f4c65a]/10 px-3 py-2 text-sm font-medium text-[#f7d97d] transition hover:bg-[#f4c65a]/15 sm:px-4">
                  Open TeKAI
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#f4c65a]/20 bg-[radial-gradient(circle_at_top_left,_rgba(244,198,90,0.16),_rgba(17,21,27,0.9)_42%,_rgba(10,12,16,1)_100%)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Current module · Networking</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">Networking → OSI Model → Layer 4: Transport</h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                      Learn how TCP and UDP enable reliable or fast communication between hosts while keeping devices secure.
                    </p>
                  </div>
                  <Link href="/networking" className="rounded-xl bg-[#f4c65a] px-5 py-3 text-sm font-semibold text-[#11151b] transition hover:bg-[#f7d97d]">
                    Resume lesson
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {progressStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#11151b] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-400">{stat.detail}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Path recommendations</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Recommended next step</h3>
                  </div>
                  <span className="rounded-full border border-[#f4c65a]/25 bg-[#f4c65a]/10 px-2.5 py-1 text-xs text-[#f7d97d]">
                    Based on your progress
                  </span>
                </div>

                <div className="rounded-2xl border border-[#f4c65a]/15 bg-[#151c22] p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Next lesson</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">TCP vs UDP: Choosing the right transport protocol</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    This lesson helps you understand when IP handles delivery, and why connection-oriented or low-latency communication matters for security monitoring and application design.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Learning paths</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Structured cybersecurity learning</h3>
                  </div>
                </div>

                <div className="grid gap-4">
                  {learningPaths.map((path) => (
                    <div key={path.title} className="rounded-2xl border border-white/10 bg-[#151c22] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-semibold text-white">{path.title}</h4>
                            <span className="rounded-full border border-[#f4c65a]/25 bg-[#f4c65a]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#f7d97d]">
                              {path.level}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{path.description}</p>
                        </div>
                        <span className="rounded-xl bg-[#0b1015] px-3 py-2 text-sm font-medium text-[#f7d97d]">
                          Available
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Did you know?</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Daily cyber fact</h3>
                <p className="mt-4 text-lg leading-7 text-slate-100">{factCards[factIndex]}</p>
                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFactIndex((factIndex + 1) % factCards.length)}
                    className="rounded-lg border border-[#f4c65a]/25 bg-[#f4c65a]/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f7d97d]"
                  >
                    View another fact
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Quick start</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Your next action</h3>
                <div className="mt-4 space-y-3">
                  <Link href="/quizzes" className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#151c22] p-3 text-left text-sm text-slate-200 hover:border-[#f4c65a]/30">
                    <span>Take a quiz</span>
                    <span>→</span>
                  </Link>
                  <Link href="/labs" className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#151c22] p-3 text-left text-sm text-slate-200 hover:border-[#f4c65a]/30">
                    <span>Open a lab</span>
                    <span>→</span>
                  </Link>
                  <Link href="/notes" className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#151c22] p-3 text-left text-sm text-slate-200 hover:border-[#f4c65a]/30">
                    <span>Review notes</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Visual learning</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Interactive OSI diagram</h3>
                  </div>
                  <button type="button" className="rounded-lg border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-300 hover:bg-white/5">
                    Layer selection
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border border-[#f4c65a]/20 bg-[#151c22] p-4">
                    <div className="space-y-2">
                      {osiLayers.map((layer) => (
                        <button
                          key={layer.number}
                          type="button"
                          onClick={() => setSelectedLayer(layer)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                            selectedLayer.number === layer.number
                              ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]"
                              : "border-white/10 bg-[#0d1217] text-slate-300 hover:border-white/20"
                          }`}
                        >
                          <span className="font-medium">Layer {layer.number}: {layer.name}</span>
                          <span className="text-xs uppercase tracking-[0.18em]">Data</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0d1217] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Selected layer</p>
                    <h4 className="mt-2 text-2xl font-semibold text-white">Layer {selectedLayer.number}: {selectedLayer.name}</h4>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{selectedLayer.summary}</p>
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/3 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Data unit</p>
                      <p className="mt-1 text-sm font-medium text-white">{selectedLayer.data}</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Examples</p>
                        <p className="mt-1 text-sm text-slate-200">{selectedLayer.examples.join(" • ")}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Security relevance</p>
                        <p className="mt-1 text-sm text-slate-200">{selectedLayer.security}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Recent labs</p>
                <div className="mt-4 space-y-3">
                  {labs.map((lab) => (
                    <div key={lab.title} className="rounded-2xl border border-white/10 bg-[#151c22] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-white">{lab.title}</h4>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                          {lab.difficulty}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{lab.status}</p>
                        <span className="text-sm text-[#f7d97d]">Open</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
