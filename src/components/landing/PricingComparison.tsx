import { useReveal } from "../../hooks/useReveal";

const DEEPSEEK_MODELS = [
  { name: "deepseek-v4-flash (chat)", input: 0.14, output: 0.28, highlight: true },
  { name: "deepseek-v4-pro (reasoner)", input: 0.435, output: 0.87, highlight: false },
];
const CLAUDE_MODELS = [
  { name: "Claude Haiku 4.5", input: 1.0, output: 5.0, highlight: false },
  { name: "Claude Sonnet 4.6", input: 3.0, output: 15.0, highlight: true },
  { name: "Claude Opus 4.8", input: 5.0, output: 25.0, highlight: false },
];
const METERS = [
  { label: "Claude Pro, monthly", cost: "$20.00", pct: 100, color: "var(--pb-coral)" },
  { label: "ARC + DeepSeek Flash", cost: "$0.03", pct: 0.5, color: "var(--pb-teal)" },
  { label: "ARC + Claude Sonnet 4.6", cost: "$6.00", pct: 30, color: "var(--pb-teal)" },
  { label: "ARC + Claude Opus 4.8", cost: "$10.00", pct: 50, color: "var(--pb-amber)" },
];

function SpecTable({ provider, models, dot }: { provider: string; models: typeof DEEPSEEK_MODELS; dot: string }) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="pb-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--pb-text-dim)" }}>
        <span className="pb-node" style={{ "--tick": dot } as React.CSSProperties} />
        {provider}
      </h3>
      <div className="pb-panel overflow-hidden">
        <table className="w-full pb-mono text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--pb-rule)" }}>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Model</th>
              <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>In/MTok</th>
              <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Out/MTok</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} style={{ borderBottom: "1px solid var(--pb-rule)", background: m.highlight ? "color-mix(in srgb, var(--pb-teal) 8%, transparent)" : undefined }}>
                <td className="px-4 py-3 truncate" style={{ color: m.highlight ? "var(--pb-teal)" : "var(--pb-text)" }}>{m.name}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--pb-text)" }}>${m.input.toFixed(m.input < 1 ? 3 : 2)}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--pb-text)" }}>${m.output.toFixed(m.output < 1 ? 3 : 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PricingComparison() {
  const headerRef = useReveal<HTMLDivElement>();
  const tablesRef = useReveal<HTMLDivElement>();
  const metersRef = useReveal<HTMLDivElement>();

  return (
    <section id="pricing" className="pb-section pb-gutter" style={{ background: "var(--pb-bg)" }}>
      <div className="pb-container">
        <div ref={headerRef} className="reveal max-w-2xl mb-12">
          <span className="pb-label mb-4" style={{ "--tick": "var(--pb-amber)" } as React.CSSProperties}>Rates</span>
          <h2 className="pb-heading">What it actually costs</h2>
          <p className="mt-4 text-base" style={{ color: "var(--pb-text-dim)" }}>
            All prices per 1 million tokens.
          </p>
        </div>

        <div ref={tablesRef} className="reveal flex flex-col lg:flex-row gap-8 mb-14">
          <SpecTable provider="DeepSeek" models={DEEPSEEK_MODELS} dot="#4f8ef7" />
          <SpecTable provider="Anthropic Claude" models={CLAUDE_MODELS} dot="var(--pb-coral)" />
        </div>

        <div ref={metersRef} className="reveal pb-panel p-6 max-w-2xl">
          <h3 className="pb-mono text-xs uppercase tracking-widest mb-1" style={{ color: "var(--pb-text-dim)" }}>Monthly cost, ~100 conversations</h3>
          <div className="mt-5 space-y-4">
            {METERS.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between mb-1.5 pb-mono text-xs">
                  <span style={{ color: "var(--pb-text-dim)" }}>{m.label}</span>
                  <span style={{ color: m.color }}>{m.cost}</span>
                </div>
                <div className="h-1.5" style={{ background: "var(--pb-surface2)" }}>
                  <div className="h-full transition-[width] duration-700" style={{ width: `${Math.max(m.pct, 1.5)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>
            Claude offers 50% off with the Batch API and ~90% off input with Prompt Caching.
            DeepSeek cache hits run as low as $0.0028/MTok.
          </p>
        </div>
      </div>
    </section>
  );
}
