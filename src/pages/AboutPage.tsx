import { useReveal } from "../hooks/useReveal";
import type { UserProfile } from "../auth";
import NavBar from "../components/landing/NavBar";
import Footer from "../components/landing/Footer";

interface AboutPageProps {
  user: UserProfile | null;
}

const SIGNAL_COLORS = ["var(--pb-coral)", "var(--pb-teal)", "var(--pb-amber)"];
const TECH_TAGS = ["Node ≥ 18", "PostgreSQL", "SSE Streaming", "MIT License", "Zero-Cost Deploy"];

const FEATURES = [
  { title: "AES-256-GCM encryption", desc: "Messages encrypted at rest before storage. Keys derived per-user, never stored raw." },
  { title: "Neon PostgreSQL + hashed passwords", desc: "Serverless Postgres with bcrypt-hashed credentials. Neon Auth optional (RS256/JWKS)." },
  { title: "Your key, your privacy", desc: "Keys live in memory only for the duration of a request. Never logged, never persisted." },
  { title: "Express + Node.js API", desc: "RESTful backend, middleware pipeline: auth → rate-limit → proxy → stream → persist." },
  { title: "Import chats", desc: "Bring existing conversations from other apps. JSON import with automatic format detection." },
  { title: "Export & continue", desc: "Export any chat as JSON or Markdown. Re-import later and pick up where you left off." },
  { title: "Provider adapters", desc: "One completion endpoint. Swap Anthropic, OpenAI, DeepSeek — or add a provider in one file." },
  { title: "Rate-limited & audited", desc: "Per-user daily quotas logged to rate_limit_log. Full request audit trail." },
];

const AUTH_STEPS = [
  { title: "Client sends credentials", desc: "POST /auth/login with username + password. Password hashed with bcrypt. In Neon Auth mode, RS256 JWT validated against JWKS." },
  { title: "JWT issued, session active", desc: "Local mode signs an HS256 JWT. Neon Auth mode validates RS256 tokens. Identity established for all subsequent requests." },
  { title: "Rate limit checked", desc: "Middleware verifies per-user daily quota against rate_limit_log before forwarding to the AI provider." },
  { title: "Key used in-memory only", desc: "Your provider API key is held in memory for the duration of the request. Never logged, never stored." },
  { title: "Completion streamed via SSE", desc: "Backend proxies the request and pipes SSE event chunks to the frontend. Real-time, no polling." },
  { title: "Message encrypted & persisted", desc: "Full message pair encrypted with AES-256-GCM before storage. Chat survives reloads and device switches." },
];

const API_ENDPOINTS = [
  { method: "POST", route: "/auth/register", desc: "{ username, password } → { token }" },
  { method: "POST", route: "/auth/login", desc: "{ username, password } → { token }" },
  { method: "GET", route: "/auth/me", desc: "Bearer → { user }" },
  { method: "GET", route: "/chats", desc: "List chats with message counts" },
  { method: "POST", route: "/chats", desc: "{ provider, model, title? }" },
  { method: "GET", route: "/chats/:id", desc: "Full chat + messages" },
  { method: "PATCH", route: "/chats/:id", desc: "Rename: { title }" },
  { method: "DELETE", route: "/chats/:id", desc: "Cascades to messages" },
  { method: "POST", route: "/completion", desc: "SSE stream · { chatId, messages, apiKey }" },
  { method: "GET", route: "/health", desc: "{ ok: true } · public" },
  { method: "GET", route: "/models", desc: "Available model catalogue · public" },
];

const METHOD_COLOR: Record<string, string> = {
  POST: "var(--pb-coral)", GET: "var(--pb-teal)", PATCH: "var(--pb-amber)", DELETE: "#e0607a",
};

const DEPLOY_OPTIONS = [
  { name: "Fly.io", desc: "Global edge · fly.toml included" },
  { name: "Render", desc: "Auto-deploy · render.yaml included" },
  { name: "Railway", desc: "One-click deploy · railway.toml" },
];
const DEPLOY_STATS = [
  { value: "0¢", label: "hosting cost" },
  { value: "5", label: "min to deploy" },
  { value: "3", label: "deploy options" },
  { value: "∞", label: "chat history" },
];

const GITHUB_ICON_PATH =
  "M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z";

function Label({ tick, children }: { tick: string; children: React.ReactNode }) {
  return <span className="pb-label mb-4" style={{ "--tick": tick } as React.CSSProperties}>{children}</span>;
}

export default function AboutPage({ user }: AboutPageProps) {
  const heroRef = useReveal<HTMLDivElement>({ threshold: 0.05 });
  const featuresRef = useReveal<HTMLDivElement>();
  const archRef = useReveal<HTMLDivElement>();
  const authRef = useReveal<HTMLDivElement>();
  const apiRef = useReveal<HTMLDivElement>();
  const ieRef = useReveal<HTMLDivElement>();
  const deployRef = useReveal<HTMLDivElement>();

  return (
    <div style={{ background: "var(--pb-bg)", color: "var(--pb-text)", minHeight: "100vh" }}>
      <NavBar user={user} />
      <main>

        {/* ── Hero ── */}
        <section className="pb-gutter pt-36 pb-16 sm:pt-44 sm:pb-20">
          <div className="pb-container">
            <div ref={heroRef} className="reveal">
              <Label tick="var(--pb-coral)">Reference</Label>
              <h1 className="pb-display text-[13vw] sm:text-[7vw] lg:text-[4vw]">Multi-provider chat API</h1>
              <p className="mt-6 text-lg max-w-xl" style={{ color: "var(--pb-text-dim)" }}>
                Node.js · Express · PostgreSQL · SSE · JWT — stream AI completions, manage
                conversations, and own your data.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 pb-mono text-xs" style={{ color: "var(--pb-text-dim)" }}>
                {TECH_TAGS.map((t) => <span key={t}>· {t}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* ── Production infrastructure ── */}
        <section className="pb-section pb-gutter" style={{ background: "var(--pb-surface)" }}>
          <div className="pb-container">
            <div className="max-w-2xl mb-12">
              <Label tick="var(--pb-teal)">Infrastructure</Label>
              <h2 className="pb-heading">What's running underneath</h2>
            </div>
            <div ref={featuresRef} className="reveal grid grid-cols-1 md:grid-cols-2" style={{ borderTop: "1px solid var(--pb-rule)" }}>
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
          </div>
        </section>

        {/* ── Architecture ── */}
        <section className="pb-section pb-gutter" style={{ background: "var(--pb-bg)" }}>
          <div className="pb-container">
            <div className="max-w-2xl mb-12">
              <Label tick="var(--pb-amber)">Architecture</Label>
              <h2 className="pb-heading">How a request travels</h2>
            </div>
            <div ref={archRef} className="reveal pb-panel p-8 overflow-x-auto">
              <svg viewBox="0 0 600 180" className="w-full" style={{ minWidth: 500 }}>
                <defs>
                  <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="var(--pb-coral)" opacity="0.8" />
                  </marker>
                </defs>
                <rect x="20" y="70" width="90" height="40" fill="none" stroke="var(--pb-rule)" strokeWidth="1" />
                <text x="65" y="87" textAnchor="middle" fill="var(--pb-text-dim)" fontSize="9" fontFamily="'JetBrains Mono', monospace">Frontend</text>
                <text x="65" y="99" textAnchor="middle" fill="var(--pb-text)" fontSize="8" fontFamily="'JetBrains Mono', monospace">ARC UI</text>
                <rect x="220" y="65" width="120" height="50" fill="none" stroke="var(--pb-coral)" strokeWidth="1" />
                <text x="280" y="87" textAnchor="middle" fill="var(--pb-text-dim)" fontSize="9" fontFamily="'JetBrains Mono', monospace">ARC Backend</text>
                <text x="280" y="102" textAnchor="middle" fill="var(--pb-coral)" fontSize="8" fontFamily="'JetBrains Mono', monospace">Express · Node.js</text>
                <rect x="460" y="20" width="100" height="38" fill="none" stroke="var(--pb-teal)" strokeWidth="1" />
                <text x="510" y="36" textAnchor="middle" fill="var(--pb-text-dim)" fontSize="9" fontFamily="'JetBrains Mono', monospace">Neon DB</text>
                <text x="510" y="50" textAnchor="middle" fill="var(--pb-teal)" fontSize="8" fontFamily="'JetBrains Mono', monospace">PostgreSQL</text>
                <rect x="460" y="70" width="100" height="38" fill="none" stroke="var(--pb-amber)" strokeWidth="1" />
                <text x="510" y="86" textAnchor="middle" fill="var(--pb-text-dim)" fontSize="9" fontFamily="'JetBrains Mono', monospace">AI Providers</text>
                <text x="510" y="100" textAnchor="middle" fill="var(--pb-amber)" fontSize="8" fontFamily="'JetBrains Mono', monospace">Deepseek/ …</text>
                <rect x="460" y="120" width="100" height="38" fill="none" stroke="var(--pb-rule)" strokeWidth="1" />
                <text x="510" y="136" textAnchor="middle" fill="var(--pb-text-dim)" fontSize="9" fontFamily="'JetBrains Mono', monospace">Neon Auth</text>
                <text x="510" y="150" textAnchor="middle" fill="var(--pb-text)" fontSize="8" fontFamily="'JetBrains Mono', monospace">JWKS · RS256</text>
                <line x1="110" y1="90" x2="218" y2="90" stroke="var(--pb-coral)" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#flowArrow)" />
                <text x="164" y="84" textAnchor="middle" fill="var(--pb-coral)" fontSize="8" fontFamily="'JetBrains Mono', monospace">HTTPS+JWT</text>
                <line x1="340" y1="80" x2="458" y2="40" stroke="var(--pb-teal)" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#flowArrow)" />
                <line x1="340" y1="90" x2="458" y2="90" stroke="var(--pb-amber)" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#flowArrow)" />
                <line x1="340" y1="100" x2="458" y2="138" stroke="var(--pb-rule)" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#flowArrow)" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── Auth & encryption flow — a real sequence, numbered ── */}
        <section className="pb-section pb-gutter" style={{ background: "var(--pb-surface)" }}>
          <div className="pb-container">
            <div className="max-w-2xl mb-12">
              <Label tick="var(--pb-coral)">Security</Label>
              <h2 className="pb-heading">Login to persisted message, in order</h2>
            </div>
            <div ref={authRef} className="reveal max-w-3xl">
              {AUTH_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-5 py-5" style={{ borderBottom: "1px solid var(--pb-rule)" }}>
                  <div className="pb-mono flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--pb-surface2)", border: "1px solid var(--pb-rule)", color: "var(--pb-text-dim)" }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--pb-text)" }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── API reference ── */}
        <section className="pb-section pb-gutter" style={{ background: "var(--pb-bg)" }}>
          <div className="pb-container">
            <div className="max-w-2xl mb-12">
              <Label tick="var(--pb-teal)">API</Label>
              <h2 className="pb-heading">Endpoint reference</h2>
            </div>
            <div ref={apiRef} className="reveal pb-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full pb-mono text-sm" style={{ minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--pb-rule)" }}>
                      <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Method</th>
                      <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Endpoint</th>
                      <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-medium hidden sm:table-cell" style={{ color: "var(--pb-text-dim)" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {API_ENDPOINTS.map((ep) => (
                      <tr key={ep.route} style={{ borderBottom: "1px solid var(--pb-rule)" }}>
                        <td className="px-5 py-3 font-bold" style={{ color: METHOD_COLOR[ep.method] }}>{ep.method}</td>
                        <td className="px-5 py-3" style={{ color: "var(--pb-text)" }}>{ep.route}</td>
                        <td className="px-5 py-3 text-xs hidden sm:table-cell" style={{ color: "var(--pb-text-dim)" }}>{ep.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── Import / export ── */}
        <section className="pb-section pb-gutter" style={{ background: "var(--pb-surface)" }}>
          <div className="pb-container">
            <div className="max-w-2xl mb-12">
              <Label tick="var(--pb-amber)">Portability</Label>
              <h2 className="pb-heading">Your data, both directions</h2>
            </div>
            <div ref={ieRef} className="reveal grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="pb-panel p-7">
                <h3 className="pb-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--pb-coral)" }}>Import</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--pb-text-dim)" }}>
                  <li>→ JSON import from any ARC-compatible export</li>
                  <li>→ Automatic format detection & validation</li>
                  <li>→ Messages restored with full metadata</li>
                  <li>→ Drag-and-drop or file picker</li>
                </ul>
              </div>
              <div className="pb-panel p-7">
                <h3 className="pb-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--pb-teal)" }}>Export</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--pb-text-dim)" }}>
                  <li>→ Export as JSON or Markdown</li>
                  <li>→ Re-import exported chats to continue</li>
                  <li>→ Share conversations in readable format</li>
                  <li>→ Full conversation history preserved</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Deployment ── */}
        <section className="pb-section pb-gutter" style={{ background: "var(--pb-bg)" }}>
          <div className="pb-container">
            <div className="max-w-2xl mb-12">
              <Label tick="var(--pb-coral)">Deploy</Label>
              <h2 className="pb-heading">Zero-cost to production</h2>
            </div>

            <div ref={deployRef} className="reveal">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                {DEPLOY_OPTIONS.map((opt) => (
                  <div key={opt.name} className="pb-panel p-6">
                    <h3 className="text-base font-semibold mb-1" style={{ color: "var(--pb-text)" }}>{opt.name}</h3>
                    <p className="text-sm" style={{ color: "var(--pb-text-dim)" }}>{opt.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-10 gap-y-6 mb-10" style={{ borderTop: "1px solid var(--pb-rule)", borderBottom: "1px solid var(--pb-rule)", padding: "24px 0" }}>
                {DEPLOY_STATS.map((s) => (
                  <div key={s.label}>
                    <div className="pb-display text-3xl" style={{ color: "var(--pb-coral)" }}>{s.value}</div>
                    <div className="pb-mono text-xs uppercase tracking-wider mt-1" style={{ color: "var(--pb-text-dim)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="pb-panel p-8 max-w-2xl">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--pb-text)" }}>Self-host your own instance</h3>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>
                  The entire ARC backend is open source under MIT. Fork it, deploy it, own your
                  data. Express + PostgreSQL on Neon, with Docker, Fly.io, Render, and Railway
                  configs included.
                </p>
                <a href="https://github.com/rozengoza/chat-interface-backend" target="_blank" rel="noopener noreferrer" className="pb-btn pb-btn--primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={GITHUB_ICON_PATH} /></svg>
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
