import { useState, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useReveal } from "../../hooks/useReveal";

const TERMINAL_LINES = [
  { text: '$ export ANTHROPIC_API_KEY="sk-ant-..."', delay: 0 },
  { text: '$ export DEEPSEEK_API_KEY="sk-..."', delay: 500 },
  { text: "$ claude", delay: 380 },
  { text: "> Fix the authentication bug in auth.ts", delay: 700 },
  { text: "", delay: 220 },
  { text: "Claude Code • Opus 4.8 • analyzing codebase...", delay: 500 },
  { text: "✓ Found issue in auth.ts:45 — JWT expiry not validated", delay: 380 },
  { text: "✓ Applied fix: added expiry check before token refresh", delay: 280 },
  { text: "✓ All 12 auth tests passing", delay: 180 },
];

const COMPARISON = [
  { label: "Claude Pro", sub: "$20/mo — unlimited? No.", color: "var(--pb-text-dim)" },
  { label: "ChatGPT Plus", sub: "$20/mo — capped at 40 msgs/3h", color: "var(--pb-text-dim)" },
  { label: "ARC + your key", sub: "$0–10/mo — pay per token, no cap", color: "var(--pb-teal)" },
];

const POINTS = [
  { title: "Terminal-native", desc: <>Run <code className="pb-mono" style={{ color: "var(--pb-coral)" }}>claude</code> in your terminal. It reads your codebase, understands context, and ships fixes — same key, not a separate subscription.</> },
  { title: "Multi-provider", desc: <>Set <code className="pb-mono" style={{ color: "var(--pb-coral)" }}>ANTHROPIC_API_KEY</code> or <code className="pb-mono" style={{ color: "var(--pb-coral)" }}>DEEPSEEK_API_KEY</code>. One CLI, any provider.</> },
  { title: "Per-token, not per-month", desc: "Casual on DeepSeek? A few cents. Power user on Opus? Still cheaper than Pro." },
  { title: "Same key, anywhere", desc: "Works in Claude Code, the Anthropic SDK, LangChain — any tool that speaks the API." },
];

function TerminalMockup() {
  const [visible, setVisible] = useState(0);
  const elRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !done.current) {
        done.current = true;
        let i = 0;
        const t = setInterval(() => { i++; setVisible(i); if (i >= TERMINAL_LINES.length) clearInterval(t); }, 85);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={elRef} className="pb-panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--pb-rule)", background: "var(--pb-surface2)" }}>
        <span className="pb-node" style={{ "--tick": "var(--pb-coral)" } as React.CSSProperties} />
        <span className="pb-mono text-[11px]" style={{ color: "var(--pb-text-dim)" }}>bash</span>
      </div>
      <div className="p-4 pb-mono text-[13px] leading-relaxed overflow-x-auto">
        {TERMINAL_LINES.slice(0, visible).map((line, i) => (
          <div key={i} style={{ minHeight: line.text ? "1.7em" : "0.7em", color: line.text.startsWith("✓") ? "var(--pb-teal)" : line.text.startsWith(">") ? "var(--pb-coral)" : "var(--pb-text-dim)" }}>
            {line.text.startsWith("✓") ? <Check size={12} className="inline mr-1" style={{ marginBottom: 2 }} /> : null}
            {line.text}
          </div>
        ))}
        {visible >= TERMINAL_LINES.length && <span className="pb-cursor" />}
      </div>
    </div>
  );
}

export default function ClaudeCodeSection() {
  const headerRef = useReveal<HTMLDivElement>();
  const bodyRef = useReveal<HTMLDivElement>();

  return (
    <section id="claude-code" className="pb-section pb-px" style={{ background: "var(--pb-surface)" }}>
      <div className="pb-container">
        <div ref={headerRef} className="reveal max-w-2xl mb-10">
          <span className="pb-label mb-4" style={{ "--tick": "var(--pb-coral)" } as React.CSSProperties}>Claude Code</span>
          <h2 className="pb-heading">API keys, not seats</h2>
          <p className="mt-4 text-base" style={{ color: "var(--pb-text-dim)" }}>
            ARC doesn't replace Claude Pro or ChatGPT Plus — it gives you a metered alternative
            that works the same key everywhere, including your terminal.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-14 pb-mono text-xs">
          {COMPARISON.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <span className="pb-node" style={{ "--tick": c.color } as React.CSSProperties} />
              <span style={{ color: c.color }}>{c.label}</span>
              <span style={{ color: "var(--pb-text-dim)" }}>— {c.sub}</span>
            </div>
          ))}
        </div>

        <div ref={bodyRef} className="reveal grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-7">
            {POINTS.map((p) => (
              <div key={p.title}>
                <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--pb-text)" }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <TerminalMockup />
        </div>
      </div>
    </section>
  );
}
