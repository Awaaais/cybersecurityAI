"use client";

import { useState } from "react";

const fundamentals = [
  "What is a network?",
  "LAN, WAN, MAN, PAN",
  "Internet, intranet, extranet",
  "Client/server vs peer-to-peer",
];

const devices = [
  "Hub, switch, router, bridge",
  "Repeater, access point, modem",
  "Firewall, proxy, load balancer",
];

const osi = [
  {
    layer: "Layer 1",
    name: "Physical",
    summary: "Signals, cables, and wireless transmission hardware move the actual bits.",
    purpose: "Carries electrical or radio signals between devices.",
    dataUnit: "Bits",
    examples: ["Ethernet cable", "Fiber", "Radio"],
    protocols: ["IEEE 802.3", "Wi‑Fi", "Bluetooth"],
    devices: ["Cables", "NICs", "Repeaters"],
    security: "Physical access controls and signal protection matter here.",
    attacks: ["Cable tapping", "Signal interception"],
    defense: ["Locked rooms", "Cable shielding", "Site controls"],
  },
  {
    layer: "Layer 2",
    name: "Data Link",
    summary: "Frames are passed on a local network segment and identified by MAC addresses.",
    purpose: "Creates reliable local communication between neighboring devices.",
    dataUnit: "Frames",
    examples: ["Ethernet", "Switching", "Wi‑Fi"],
    protocols: ["Ethernet", "ARP", "WPA"],
    devices: ["Switch", "Bridge", "Access point"],
    security: "Switches and VLANs reduce unnecessary broadcast exposure.",
    attacks: ["ARP spoofing", "MAC flooding"],
    defense: ["Port security", "VLAN segmentation", "Switch hardening"],
  },
  {
    layer: "Layer 3",
    name: "Network",
    summary: "Packets are routed across networks using logical addresses such as IP.",
    purpose: "Chooses routes and forwards packets beyond the local network.",
    dataUnit: "Packets",
    examples: ["IPv4", "IPv6", "Routing"],
    protocols: ["IP", "ICMP", "OSPF"],
    devices: ["Router", "Firewall", "Load balancer"],
    security: "Routing policies, ACLs, and segmentation limit exposure.",
    attacks: ["IP spoofing", "Routing manipulation"],
    defense: ["ACLs", "Segmentation", "Monitoring"],
  },
  {
    layer: "Layer 4",
    name: "Transport",
    summary: "TCP and UDP manage end-to-end delivery and communication behavior.",
    purpose: "Processes data for reliable or low-latency transport between hosts.",
    dataUnit: "Segments / Datagrams",
    examples: ["TCP handshake", "UDP streaming"],
    protocols: ["TCP", "UDP"],
    devices: ["Hosts", "Load balancers", "Firewalls"],
    security: "Port filtering and stateful inspection help regulate flows.",
    attacks: ["Port scanning", "SYN flood"],
    defense: ["Rate limiting", "Firewall rules", "DDoS protections"],
  },
  {
    layer: "Layer 5",
    name: "Session",
    summary: "Sessions manage communication setup and continuity between applications.",
    purpose: "Maintains connection state and stream continuity.",
    dataUnit: "Sessions",
    examples: ["RPC", "WebSocket", "Authentication sessions"],
    protocols: ["NetBIOS", "RPC", "Session tokens"],
    devices: ["Application servers", "API gateways"],
    security: "Session IDs must be protected against theft and fixation.",
    attacks: ["Session hijacking", "Replay attacks"],
    defense: ["Secure cookies", "Short timeouts", "Token rotation"],
  },
  {
    layer: "Layer 6",
    name: "Presentation",
    summary: "Data is formatted, compressed, and encrypted so applications can understand it.",
    purpose: "Handles encoding and representation changes for interoperability.",
    dataUnit: "Data",
    examples: ["TLS", "JSON", "Compression"],
    protocols: ["TLS", "SSL", "Encoding standards"],
    devices: ["Clients", "Proxies", "TLS offload appliances"],
    security: "Encryption and correct encoding protect the meaning of the data.",
    attacks: ["Content manipulation", "Protocol downgrade"],
    defense: ["TLS enforcement", "Strong ciphers", "Strict parsing"],
  },
  {
    layer: "Layer 7",
    name: "Application",
    summary: "This is where end-user applications such as web browsers and APIs communicate.",
    purpose: "Delivers the actual service a user or program interacts with.",
    dataUnit: "Data",
    examples: ["HTTP", "DNS", "SMTP"],
    protocols: ["HTTP", "HTTPS", "FTP", "SSH"],
    devices: ["Web servers", "Email servers", "APIs"],
    security: "Input validation, auth controls, and secure coding matter most here.",
    attacks: ["SQL injection", "XSS", "CSRF"],
    defense: ["WAFs", "Validation", "Authentication zoning"],
  },
];

export default function NetworkingPage() {
  const [selectedLayer, setSelectedLayer] = useState(osi[3]);

  return (
    <main className="min-h-screen bg-[#070b10] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#f4c65a]">Network Learning</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Networking Fundamentals</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Start with the core ideas behind networks: how computers connect, how data moves, and how security teams monitor and protect traffic.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#11151b] p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Fundamentals</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {fundamentals.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11151b] p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Devices</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {devices.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11151b] p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Addressing</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              <li>• IPv4 and IPv6</li>
              <li>• Public vs private IP</li>
              <li>• MAC addresses</li>
              <li>• Subnet masks and CIDR</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11151b] p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Protocols</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              <li>• TCP and UDP</li>
              <li>• IP, ICMP, ARP</li>
              <li>• HTTP, HTTPS, DNS</li>
              <li>• DHCP, SSH, TLS</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">OSI model</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Seven layers, one communication system</h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <div className="space-y-3">
              {osi.map((item) => (
                <button
                  key={item.layer}
                  type="button"
                  onClick={() => setSelectedLayer(item)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    selectedLayer.layer === item.layer
                      ? "border-[#f4c65a]/40 bg-[#f4c65a]/10 text-[#f7d97d]"
                      : "border-white/10 bg-[#151c22] text-slate-200 hover:border-white/20"
                  }`}
                >
                  <span className="font-medium">{item.layer}: {item.name}</span>
                  <span className="text-xs uppercase tracking-[0.2em]">Select</span>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151c22] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f4c65a]">Selected layer</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{selectedLayer.layer}: {selectedLayer.name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{selectedLayer.summary}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#0d1217] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Purpose</p>
                  <p className="mt-2 text-sm text-slate-200">{selectedLayer.purpose}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0d1217] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Data unit</p>
                  <p className="mt-2 text-sm text-slate-200">{selectedLayer.dataUnit}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Examples</p>
                  <p className="mt-2 text-slate-200">{selectedLayer.examples.join(" • ")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Protocols</p>
                  <p className="mt-2 text-slate-200">{selectedLayer.protocols.join(" • ")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Security relevance</p>
                  <p className="mt-2 text-slate-200">{selectedLayer.security}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-rose-400/15 bg-rose-400/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200">Risks to recognize</p>
                    <ul className="mt-2 space-y-1 text-slate-200">
                      {selectedLayer.attacks.map((attack) => <li key={attack}>• {attack}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200">Course defenses</p>
                    <ul className="mt-2 space-y-1 text-slate-200">
                      {selectedLayer.defense.map((defense) => <li key={defense}>• {defense}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[#f4c65a]/20 bg-[#11151b] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Follow the traffic</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">What happens when you open a website?</h2>
            <ol className="mt-5 space-y-3">
              {[
                ["Application", "The browser creates an HTTP or HTTPS request."],
                ["Presentation", "TLS can encrypt and format data for secure communication."],
                ["Transport", "TCP or UDP carries data between the endpoints."],
                ["Network", "IP addressing and routers move packets between networks."],
                ["Data Link + Physical", "Frames travel across a local link as electrical, optical, or radio signals."],
              ].map(([layer, detail], index) => (
                <li key={layer} className="flex gap-4 rounded-xl border border-white/10 bg-[#151c22] p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#f4c65a]/30 text-xs font-bold text-[#f7d97d]">{index + 1}</span>
                  <div>
                    <p className="font-medium text-white">{layer}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-6">
            <article className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Addressing</p>
              <h2 className="mt-2 text-xl font-semibold text-white">IP, MAC, and ports</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="font-medium text-white">IP address</dt><dd className="mt-1 text-slate-300">A logical address used to route packets between networks.</dd></div>
                <div><dt className="font-medium text-white">MAC address</dt><dd className="mt-1 text-slate-300">An address used for delivery on a local data-link network.</dd></div>
                <div><dt className="font-medium text-white">Port</dt><dd className="mt-1 text-slate-300">Identifies a communication endpoint used by a service; firewalls can filter ports by policy.</dd></div>
              </dl>
            </article>
            <article className="rounded-3xl border border-white/10 bg-[#11151b] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#f4c65a]">Network scopes</p>
              <h2 className="mt-2 text-xl font-semibold text-white">LAN to WAN</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">A LAN connects devices in a limited local area. WANs connect across larger geographic areas. MAN and PAN describe metropolitan and personal-area networks. An intranet is private to an organization; an extranet provides controlled access to selected outside users.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
