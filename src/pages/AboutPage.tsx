import { useRef, useEffect } from "react";
import { Shield, Key, Database, Server, Upload, Download, Lock, Cpu } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitElement } from "../hooks/useTextSplit";
import type { UserProfile } from "../auth";
import NavBar from "../components/landing/NavBar";
import Footer from "../components/landing/Footer";
import Stars from "../components/Stars";

gsap.registerPlugin(ScrollTrigger);

interface AboutPageProps {
  user: UserProfile | null;
}

const API_ENDPOINTS = [
  { method: "POST", route: "/auth/register", desc: "{ username, password } → { token }", color: "var(--accent)" },
  { method: "POST", route: "/auth/login", desc: "{ username, password } → { token }", color: "var(--accent)" },
  { method: "GET", route: "/auth/me", desc: "Bearer → { user }", color: "var(--green)" },
  { method: "GET", route: "/chats", desc: "List chats with message counts", color: "var(--green)" },
  { method: "POST", route: "/chats", desc: "{ provider, model, title? }", color: "var(--accent)" },
  { method: "GET", route: "/chats/:id", desc: "Full chat + messages", color: "var(--green)" },
  { method: "PATCH", route: "/chats/:id", desc: "Rename: { title }", color: "var(--orange)" },
  { method: "DELETE", route: "/chats/:id", desc: "Cascades to messages", color: "var(--red)" },
  { method: "POST", route: "/completion", desc: "SSE stream · { chatId, messages, apiKey }", color: "var(--accent)" },
  { method: "GET", route: "/health", desc: "{ ok: true } · public", color: "var(--green)" },
  { method: "GET", route: "/models", desc: "Available model catalogue · public", color: "var(--green)" },
];

const DEPLOY_OPTIONS = [
  { name: "Fly.io", icon: "🚀", desc: "Global edge · fly.toml included", color: "var(--accent)" },
  { name: "Render", icon: "⚡", desc: "Auto-deploy · render.yaml included", color: "var(--green)" },
  { name: "Railway", icon: "🛤️", desc: "One-click deploy · railway.toml", color: "var(--orange)" },
];

const FEATURES = [
  { icon: Lock, title: "AES-256-GCM Encryption", desc: "Messages encrypted at rest before storage. Keys derived per-user, never stored raw." },
  { icon: Database, title: "Neon PostgreSQL + Hashed Passwords", desc: "Serverless Postgres with bcrypt-hashed credentials. Neon Auth optional (RS256/JWKS)." },
  { icon: Key, title: "Your API Key, Your Privacy", desc: "Keys live in memory only for the duration of a request. Never logged, never persisted." },
  { icon: Server, title: "Express + Node.js API", desc: "RESTful backend with middleware pipeline: auth → rate-limit → proxy → stream → persist." },
  { icon: Upload, title: "Import Chats", desc: "Bring your existing conversations from other apps. JSON import with automatic format detection." },
  { icon: Download, title: "Export & Continue", desc: "Export any chat as JSON or Markdown. Re-import later and pick up where you left off." },
  { icon: Cpu, title: "Provider Adapters", desc: "Unified completion endpoint. Swap Anthropic, OpenAI, DeepSeek — or add a new provider in one file." },
  { icon: Shield, title: "Rate-Limited & Audited", desc: "Per-user daily quotas logged to rate_limit_log. Full request audit trail." },
];

/** Helper: wraps a section with GSAP ScrollTrigger entrance */
function useSectionAnim(ref: React.RefObject<HTMLElement | null>, contentRefs: (HTMLElement | null)[], delay = 0) {
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const valid = contentRefs.filter(Boolean) as HTMLElement[];
    if (!valid.length) return;

    const ctx = gsap.context(() => {
      gsap.set(valid, { opacity: 0, y: 30 });
      gsap.to(valid, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        delay,
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });
    });

    return () => ctx.revert();
  }, [delay]);
}

/** Helper: animate heading+subtitle in a section */
function useHeadingAnim(headingRef: React.RefObject<HTMLElement | null>, subtitleRef: React.RefObject<HTMLElement | null>, sectionRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    const subtitle = subtitleRef.current;
    if (!section || !heading || !subtitle) return;

    const ctx = gsap.context(() => {
      const words = splitElement(heading);
      gsap.set(subtitle, { opacity: 0, y: 20 });
      gsap.to(subtitle, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });
      gsap.from(words, {
        opacity: 0,
        y: 30,
        rotateX: -15,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });
    });

    return () => ctx.revert();
  }, []);
}

export default function AboutPage({ user }: AboutPageProps) {
  /* ── Hero refs ── */
  const heroRef = useRef<HTMLElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);

  /* ── Features refs ── */
  const featuresSectionRef = useRef<HTMLElement>(null);
  const featuresHeadingRef = useRef<HTMLHeadingElement>(null);
  const featuresSubRef = useRef<HTMLParagraphElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);

  /* ── Architecture refs ── */
  const archSectionRef = useRef<HTMLElement>(null);
  const archHeadingRef = useRef<HTMLHeadingElement>(null);
  const archSubRef = useRef<HTMLParagraphElement>(null);
  const archBoxRef = useRef<HTMLDivElement>(null);

  /* ── Auth flow refs ── */
  const authSectionRef = useRef<HTMLElement>(null);
  const authHeadingRef = useRef<HTMLHeadingElement>(null);
  const authSubRef = useRef<HTMLParagraphElement>(null);
  const authListRef = useRef<HTMLDivElement>(null);

  /* ── API endpoints refs ── */
  const apiSectionRef = useRef<HTMLElement>(null);
  const apiHeadingRef = useRef<HTMLHeadingElement>(null);
  const apiSubRef = useRef<HTMLParagraphElement>(null);
  const apiTableRef = useRef<HTMLDivElement>(null);

  /* ── Import/Export refs ── */
  const ieSectionRef = useRef<HTMLElement>(null);
  const ieHeadingRef = useRef<HTMLHeadingElement>(null);
  const ieSubRef = useRef<HTMLParagraphElement>(null);
  const ieGridRef = useRef<HTMLDivElement>(null);

  /* ── Deploy refs ── */
  const deploySectionRef = useRef<HTMLElement>(null);
  const deployHeadingRef = useRef<HTMLHeadingElement>(null);
  const deploySubRef = useRef<HTMLParagraphElement>(null);
  const deployGridRef = useRef<HTMLDivElement>(null);
  const deployStatsRef = useRef<HTMLDivElement>(null);

  /* ── Hero animation ── */
  useEffect(() => {
    const section = heroRef.current;
    const title = heroTitleRef.current;
    const subtitle = heroSubRef.current;
    if (!section || !title || !subtitle) return;

    const ctx = gsap.context(() => {
      const titleWords = splitElement(title);
      gsap.set(subtitle, { opacity: 0, y: 20 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      tl.from(titleWords, { opacity: 0, y: 30, rotateX: -15, duration: 0.4, stagger: 0.04, ease: "power2.out" })
        .to(subtitle, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15");
    });

    return () => ctx.revert();
  }, []);

  /* ── Section animations ── */
  useHeadingAnim(featuresHeadingRef, featuresSubRef, featuresSectionRef);
  useSectionAnim(featuresSectionRef, featuresGridRef ? [featuresGridRef.current] : []);

  useHeadingAnim(archHeadingRef, archSubRef, archSectionRef);
  useEffect(() => {
    const el = archBoxRef.current;
    const section = archSectionRef.current;
    if (!el || !section) return;
    const ctx = gsap.context(() => {
      gsap.set(el, { opacity: 0, y: 30 });
      gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 82%", toggleActions: "play none none reverse" } });
    });
    return () => ctx.revert();
  }, []);

  useHeadingAnim(authHeadingRef, authSubRef, authSectionRef);
  useEffect(() => {
    const el = authListRef.current;
    const section = authSectionRef.current;
    if (!el || !section) return;
    const children = el.children;
    const ctx = gsap.context(() => {
      gsap.set(children, { opacity: 0, y: 20 });
      gsap.to(children, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 82%", toggleActions: "play none none reverse" } });
    });
    return () => ctx.revert();
  }, []);

  useHeadingAnim(apiHeadingRef, apiSubRef, apiSectionRef);
  useEffect(() => {
    const el = apiTableRef.current;
    const section = apiSectionRef.current;
    if (!el || !section) return;
    const ctx = gsap.context(() => {
      gsap.set(el, { opacity: 0, y: 30 });
      gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 82%", toggleActions: "play none none reverse" } });
    });
    return () => ctx.revert();
  }, []);

  useHeadingAnim(ieHeadingRef, ieSubRef, ieSectionRef);
  useEffect(() => {
    const grid = ieGridRef.current;
    const section = ieSectionRef.current;
    if (!grid || !section) return;
    const ctx = gsap.context(() => {
      gsap.set(grid.children, { opacity: 0, y: 30 });
      gsap.to(grid.children, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 82%", toggleActions: "play none none reverse" } });
    });
    return () => ctx.revert();
  }, []);

  useHeadingAnim(deployHeadingRef, deploySubRef, deploySectionRef);
  useEffect(() => {
    const grid = deployGridRef.current;
    const stats = deployStatsRef.current;
    const section = deploySectionRef.current;
    if (!grid || !stats || !section) return;
    const ctx = gsap.context(() => {
      gsap.set(grid.children, { opacity: 0, y: 30, scale: 0.95 });
      gsap.set(stats.children, { opacity: 0, y: 20 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top 82%", toggleActions: "play none none reverse" } });
      tl.to(grid.children, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.1)" })
        .to(stats.children, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" }, "-=0.2");
    });
    return () => ctx.revert();
  }, []);

  const sectionStyle: React.CSSProperties = {
    maxWidth: 1280, margin: "0 auto", width: "100%",
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <Stars />
      <NavBar user={user} />
      <main>

        {/* ── Hero ── */}
        <section ref={heroRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12 overflow-hidden relative" style={{ background: "transparent" }}>
          <div style={sectionStyle}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border mb-6" style={{ borderColor: "var(--accent)" }}>
                <span className="text-xl font-bold" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--accent)" }}>ARC</span>
              </div>
              <h1 ref={heroTitleRef} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>
                Multi-Provider Chat API
              </h1>
              <p ref={heroSubRef} className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>
                Node.js · Express · PostgreSQL · SSE · JWT — stream AI completions, manage conversations, and own your data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Node ≥ 18", "PostgreSQL", "SSE Streaming", "MIT License", "Zero-Cost Deploy"].map((badge) => (
                  <span key={badge} className="px-4 py-1.5 text-xs font-medium rounded-full border" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section ref={featuresSectionRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12" style={{ background: "var(--surface)" }}>
          <div style={sectionStyle}>
            <div className="text-center mb-16 lg:mb-20">
              <h2 ref={featuresHeadingRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>Production Infrastructure</h2>
              <p ref={featuresSubRef} className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)", marginTop: 16 }}>Node.js API · Encrypted storage · Hosted database · Import/export</p>
            </div>
            <div ref={featuresGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div key={feat.title} className="rounded-xl p-6 lg:p-8 border transition-all duration-200 hover:-translate-y-1" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                    <FeatIcon size={20} style={{ color: "var(--accent)", marginBottom: 14 }} />
                    <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>{feat.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Architecture ── */}
        <section ref={archSectionRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12" style={{ background: "var(--bg)" }}>
          <div style={sectionStyle}>
            <div className="text-center mb-16 lg:mb-20">
              <h2 ref={archHeadingRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>System Architecture</h2>
              <p ref={archSubRef} className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)", marginTop: 16 }}>How data flows from your browser to the AI provider and back</p>
            </div>
            <div ref={archBoxRef} className="rounded-xl border p-8 lg:p-10 overflow-x-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <svg viewBox="0 0 600 180" className="w-full" style={{ minWidth: 500 }}>
                <defs>
                  <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="var(--accent)" opacity="0.7"/>
                  </marker>
                </defs>
                <rect x="20" y="70" width="90" height="40" rx="6" fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5"/>
                <text x="65" y="87" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit, sans-serif">Frontend</text>
                <text x="65" y="99" textAnchor="middle" fill="var(--accent)" fontSize="8" fontFamily="Outfit, sans-serif">ARC UI (React)</text>
                <rect x="220" y="65" width="120" height="50" rx="6" fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.7"/>
                <text x="280" y="87" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit, sans-serif">ARC Backend</text>
                <text x="280" y="102" textAnchor="middle" fill="var(--accent)" fontSize="8" fontFamily="Outfit, sans-serif">Express · Node.js</text>
                <rect x="460" y="20" width="100" height="38" rx="6" fill="rgba(45,212,191,0.12)" stroke="rgba(45,212,191,0.5)" strokeWidth="1"/>
                <text x="510" y="36" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit, sans-serif">Neon DB</text>
                <text x="510" y="50" textAnchor="middle" fill="var(--green)" fontSize="8" fontFamily="Outfit, sans-serif">PostgreSQL</text>
                <rect x="460" y="70" width="100" height="38" rx="6" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.5)" strokeWidth="1"/>
                <text x="510" y="86" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit, sans-serif">AI Providers</text>
                <text x="510" y="100" textAnchor="middle" fill="var(--orange)" fontSize="8" fontFamily="Outfit, sans-serif">Anthropic / OpenAI / …</text>
                <rect x="460" y="120" width="100" height="38" rx="6" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.5)" strokeWidth="1"/>
                <text x="510" y="136" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Outfit, sans-serif">Neon Auth</text>
                <text x="510" y="150" textAnchor="middle" fill="var(--accent)" fontSize="8" fontFamily="Outfit, sans-serif">JWKS · RS256</text>
                <line x1="110" y1="90" x2="218" y2="90" stroke="var(--accent)" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#flowArrow)" opacity="0.7"/>
                <text x="164" y="84" textAnchor="middle" fill="var(--accent)" fontSize="8">HTTPS+JWT</text>
                <line x1="340" y1="80" x2="458" y2="40" stroke="var(--green)" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#flowArrow)" opacity="0.7"/>
                <line x1="340" y1="90" x2="458" y2="90" stroke="var(--orange)" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#flowArrow)" opacity="0.7"/>
                <line x1="340" y1="100" x2="458" y2="138" stroke="var(--accent)" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#flowArrow)" opacity="0.7"/>
              </svg>
            </div>
          </div>
        </section>

        {/* ── Auth & Encryption Flow ── */}
        <section ref={authSectionRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12" style={{ background: "var(--surface)" }}>
          <div style={sectionStyle}>
            <div className="text-center mb-16 lg:mb-20">
              <h2 ref={authHeadingRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>Auth & Encryption Flow</h2>
              <p ref={authSubRef} className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)", marginTop: 16 }}>How your data stays private from login to persistence</p>
            </div>
            <div ref={authListRef} className="max-w-3xl mx-auto">
              {[
                { num: "01", title: "Client sends credentials", desc: "POST /auth/login with username + password. Password hashed with bcrypt before storage. In Neon Auth mode, RS256 JWT validated against JWKS endpoint." },
                { num: "02", title: "JWT issued, session active", desc: "Local mode signs a HS256 JWT. Neon Auth mode validates RS256 tokens. User identity established for all subsequent requests." },
                { num: "03", title: "Rate limit checked", desc: "Middleware verifies per-user daily quota against rate_limit_log table before forwarding to AI provider. Prevents abuse." },
                { num: "04", title: "API key used in-memory only", desc: "Your provider API key is held in memory for the duration of the request. Never logged, never stored, never leaked." },
                { num: "05", title: "Completion streamed via SSE", desc: "Backend proxies request to AI provider and pipes SSE event chunks to the frontend. Real-time, no polling." },
                { num: "06", title: "Message encrypted & persisted", desc: "Full message pair encrypted with AES-256-GCM before storage in Neon PostgreSQL. Keys derived per-user. Chat survives reloads, page closes, and device switches." },
              ].map((step) => (
                <div key={step.num} className="flex gap-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── API Endpoints ── */}
        <section ref={apiSectionRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12" style={{ background: "var(--bg)" }}>
          <div style={sectionStyle}>
            <div className="text-center mb-16 lg:mb-20">
              <h2 ref={apiHeadingRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>API Reference</h2>
              <p ref={apiSubRef} className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)", marginTop: 16 }}>RESTful endpoints for chat management and AI completions</p>
            </div>
            <div ref={apiTableRef} className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider px-6 py-3.5" style={{ background: "var(--surface2)", color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                <span>Method</span>
                <span>Endpoint</span>
                <span className="hidden sm:block">Notes</span>
              </div>
              {API_ENDPOINTS.map((ep) => (
                <div key={ep.route} className="grid grid-cols-3 px-6 py-4 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs font-bold" style={{ color: ep.color }}>{ep.method}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text)" }}>{ep.route}</span>
                  <span className="hidden sm:block text-xs" style={{ color: "var(--text-dim)" }}>{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Import & Export ── */}
        <section ref={ieSectionRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12" style={{ background: "var(--surface)" }}>
          <div style={sectionStyle}>
            <div className="text-center mb-16 lg:mb-20">
              <h2 ref={ieHeadingRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>Import, Export & Continue</h2>
              <p ref={ieSubRef} className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)", marginTop: 16 }}>Your conversations are portable — always</p>
            </div>
            <div ref={ieGridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 lg:p-8 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <Upload size={22} style={{ color: "var(--accent)", marginBottom: 14 }} />
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>Import Chats</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>
                  <li>→ JSON import from any ARC-compatible export</li>
                  <li>→ Automatic format detection & validation</li>
                  <li>→ Messages restored with full metadata</li>
                  <li>→ Drag-and-drop or file picker</li>
                </ul>
              </div>
              <div className="rounded-xl p-6 lg:p-8 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <Download size={22} style={{ color: "var(--accent)", marginBottom: 14 }} />
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>Export & Continue</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>
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
        <section ref={deploySectionRef} className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12" style={{ background: "var(--bg)" }}>
          <div style={sectionStyle}>
            <div className="text-center mb-16 lg:mb-20">
              <h2 ref={deployHeadingRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}>Zero-Cost Deployment</h2>
              <p ref={deploySubRef} className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)", marginTop: 16 }}>Production-ready in minutes — free tier included</p>
            </div>
            <div ref={deployGridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {DEPLOY_OPTIONS.map((opt) => (
                <div key={opt.name} className="rounded-xl p-6 lg:p-8 text-center border transition-all duration-200 hover:-translate-y-1" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-3xl mb-3">{opt.icon}</div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: opt.color }}>{opt.name}</h3>
                  <p className="text-sm" style={{ color: "var(--text-dim)" }}>{opt.desc}</p>
                </div>
              ))}
            </div>
            <div ref={deployStatsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { value: "0¢", label: "Hosting cost" },
                { value: "5", label: "Min to deploy" },
                { value: "3", label: "Deploy options" },
                { value: "∞", label: "Chat history" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-6 lg:p-8 text-center border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <span className="block text-3xl font-bold" style={{ color: "var(--accent)" }}>{stat.value}</span>
                  <span className="block text-sm mt-2" style={{ color: "var(--text-dim)" }}>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Self-host CTA */}
            <div className="mt-12 text-center">
              <div className="rounded-xl p-8 lg:p-10 border max-w-2xl mx-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>Self-Host Your Own Instance</h3>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>
                  The entire ARC backend is open source under MIT. Fork it, deploy it, own your data.
                  Express + PostgreSQL on Neon. Docker, Fly.io, Render, and Railway configs included.
                </p>
                <a
                  href="https://github.com/rozengoza/chat-interface-backend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/>
                  </svg>
                  View on GitHub — development
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
