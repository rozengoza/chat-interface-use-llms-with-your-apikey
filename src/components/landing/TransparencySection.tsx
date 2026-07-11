import { useReveal } from "../../hooks/useReveal";

const STATS = [
  { value: "9", label: "providers" },
  { value: "22+", label: "models" },
  { value: "100%", label: "keys stay client-side" },
  { value: "97%", label: "cheaper than a seat" },
];

const DIFFERENTIATORS = [
  "MIT licensed — inspect, fork, modify freely",
  "No account required for API-only usage",
  "Keys stored in your browser, never transmitted",
  "Switch providers mid-conversation — no lock-in",
];

const GITHUB_ICON_PATH =
  "M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z";

export default function TransparencySection() {
  const statsRef = useReveal<HTMLDivElement>();
  const bodyRef = useReveal<HTMLDivElement>();

  return (
    <section id="transparency" className="pb-section pb-gutter" style={{ background: "var(--pb-bg)" }}>
      <div className="pb-container">
        <div className="max-w-2xl mb-10">
          <span className="pb-label mb-4" style={{ "--tick": "var(--pb-teal)" } as React.CSSProperties}>Transparency</span>
          <h2 className="pb-heading">Nothing hidden in the wire</h2>
          <p className="mt-4 text-base" style={{ color: "var(--pb-text-dim)" }}>
            MIT licensed, no telemetry, no data collection. Your key talks to the provider —
            our servers never see it.
          </p>
        </div>

        <div ref={statsRef} className="reveal flex flex-wrap gap-x-10 gap-y-6 mb-14" style={{ borderTop: "1px solid var(--pb-rule)", borderBottom: "1px solid var(--pb-rule)", padding: "28px 0" }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="pb-display text-4xl" style={{ color: "var(--pb-coral)" }}>{s.value}</div>
              <div className="pb-mono text-xs uppercase tracking-wider mt-1" style={{ color: "var(--pb-text-dim)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div ref={bodyRef} className="reveal grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-3">
            {DIFFERENTIATORS.map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--pb-text-dim)" }}>
                <span className="pb-node" style={{ "--tick": "var(--pb-teal)" } as React.CSSProperties} />
                {item}
              </div>
            ))}
          </div>
          <div className="pb-panel p-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--pb-text)" }}>Self-host your own instance</h3>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>
              Express + PostgreSQL on Neon. Docker, Fly.io, Render, and Railway configs included.
            </p>
            <a href="https://github.com/rozengoza/chat-interface-backend" target="_blank" rel="noopener noreferrer" className="pb-btn pb-btn--primary !py-2.5 !px-4 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={GITHUB_ICON_PATH} /></svg>
              Self-host the backend
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
