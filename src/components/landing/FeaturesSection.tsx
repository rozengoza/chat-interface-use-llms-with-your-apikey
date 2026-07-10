import { ArrowRight, CircleX } from "lucide-react";
import { useReveal } from "../../hooks/useReveal";

const SIGNAL_COLORS = ["var(--pb-coral)", "var(--pb-teal)", "var(--pb-amber)"];

const FEATURES = [
  { title: "Bring your own key", desc: "Lives in your browser's memory, dies when the tab closes. Every request goes straight to the provider — zero middlemen." },
  { title: "Pay for what you use", desc: "Most developers land under $5/month at API pricing. DeepSeek Flash at $0.14/MTok, Claude Opus at $5/MTok — you choose per message." },
  { title: "22+ models, one interface", desc: "Anthropic, OpenAI, Google, DeepSeek, Groq, Mistral, xAI, OpenRouter, Ollama. Switch providers and models mid-conversation." },
  { title: "Instant streaming", desc: "Token-by-token SSE. No spinner waiting on a full completion — you read the response as it's generated." },
  { title: "100% transparent", desc: "Open DevTools, watch the network tab. Every request goes to the provider and nowhere else — MIT licensed, inspect it yourself." },
  { title: "Claude Code ready", desc: "Same key, your terminal. Set ANTHROPIC_API_KEY and go — ARC keys work anywhere the Anthropic SDK does." },
];

const FOR_YOU = [
  "Devs with an API key who don't want to pay $20/month for a chat UI",
  "Anyone who hits free-tier limits mid-work and wants to just continue",
  "Developers who want full API access — longer context, no rate limits",
  "Users who want to switch models and providers freely",
];
const NOT_FOR_YOU = [
  "Non-developers without an API key from any provider",
  "Heavy daily users where flat-rate Pro pricing actually wins",
  "Teams needing centralized billing — this is bring-your-own, per user",
  "Users who prefer managed auth and key handling",
];

export default function FeaturesSection() {
  const headerRef = useReveal<HTMLDivElement>();
  const listRef = useReveal<HTMLDivElement>();
  const verdictRef = useReveal<HTMLDivElement>();

  return (
    <section id="features" className="pb-section pb-px" style={{ background: "var(--pb-surface)" }}>
      <div className="pb-container">
        <div ref={headerRef} className="reveal max-w-2xl mb-14">
          <span className="pb-label mb-4" style={{ "--tick": "var(--pb-teal)" } as React.CSSProperties}>Spec</span>
          <h2 className="pb-heading">What ARC actually does</h2>
        </div>

        <div ref={listRef} className="reveal grid grid-cols-1 md:grid-cols-2" style={{ borderTop: "1px solid var(--pb-rule)" }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="flex gap-4 py-6 pr-6"
              style={{
                borderBottom: "1px solid var(--pb-rule)",
                borderRight: i % 2 === 0 ? "1px solid var(--pb-rule)" : undefined,
                paddingLeft: i % 2 === 1 ? "24px" : undefined,
              }}
            >
              <span className="pb-node mt-2" style={{ "--tick": SIGNAL_COLORS[i % 3] } as React.CSSProperties} />
              <div>
                <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--pb-text)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div ref={verdictRef} className="reveal mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="pb-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--pb-teal)" }}>
              <ArrowRight size={13} /> Built for
            </h3>
            <ul className="space-y-3">
              {FOR_YOU.map((item) => (
                <li key={item} className="text-sm leading-relaxed pl-4" style={{ color: "var(--pb-text-dim)", borderLeft: "2px solid var(--pb-teal)" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="pb-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--pb-coral)" }}>
              <CircleX size={13} /> Not built for
            </h3>
            <ul className="space-y-3">
              {NOT_FOR_YOU.map((item) => (
                <li key={item} className="text-sm leading-relaxed pl-4" style={{ color: "var(--pb-text-dim)", borderLeft: "2px solid var(--pb-coral)" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
