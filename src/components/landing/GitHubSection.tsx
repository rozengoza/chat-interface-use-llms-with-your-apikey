import { useRef, useEffect } from "react";
import { Key, Cpu, Shield, DollarSign, TrendingDown, Check } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitElement } from "../../hooks/useTextSplit";

gsap.registerPlugin(ScrollTrigger);

export default function GitHubSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const checksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const left = leftColRef.current;
    const right = rightColRef.current;
    const stats = statsRef.current;
    const checks = checksRef.current;
    if (!section || !title || !left || !right || !stats || !checks) return;

    const statCards = stats.children;
    const checkItems = checks.children;

    const ctx = gsap.context(() => {
      // Split heading into word spans
      const titleWords = splitElement(title);
      gsap.set(statCards, { opacity: 0, y: 30, scale: 0.9 });
      gsap.set(checkItems, { opacity: 0, x: -15 });
      gsap.set(right, { opacity: 0, x: 30, scale: 0.95 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      // Word-by-word title reveal — FROM keeps text visible by default
      tl.from(titleWords, {
        opacity: 0,
        y: 30,
        rotateX: -15,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
      })
        .to(statCards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: "back.out(1.2)",
        }, "-=0.2")
        .to(checkItems, {
          opacity: 1,
          x: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        }, "-=0.15")
        .to(right, { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: "power2.out" }, "-=0.3");
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="transparency"
      ref={sectionRef}
      className="tesla-section py-28 sm:py-36 px-4 sm:px-8 lg:px-12"
      style={{ background: "var(--bg)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center" style={{ maxWidth: 1024, margin: "0 auto" }}>
          {/* Left: Value proposition */}
          <div ref={leftColRef}>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Shield size={24} style={{ color: "var(--accent)" }} />
                <h2
                  ref={titleRef}
                  className="text-3xl sm:text-4xl font-bold tracking-tight"
                  style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)" }}
                >
                  Open & Transparent
                </h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
                ARC is fully open source under MIT. No hidden telemetry, no data collection,
                no enterprise-only features. Your API key talks directly to the AI provider
                from your browser — our servers never see it.
              </p>

              {/* Real stats grid */}
              <div ref={statsRef} className="grid grid-cols-2 gap-3 mb-8">
                {([
                  { icon: Cpu, label: "Providers", value: "9", desc: "major AI providers" },
                  { icon: Key, label: "Models", value: "22+", desc: "across all providers" },
                  { icon: Shield, label: "Privacy", value: "100%", desc: "keys never leave your browser" },
                  { icon: TrendingDown, label: "vs Subscription", value: "~97%", desc: "potential savings" },
                ] as const).map((stat) => {
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="rounded-xl p-5 lg:p-6 text-center border"
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                    >
                      <StatIcon size={18} className="mx-auto mb-1.5" style={{ color: "var(--accent)" }} />
                      <span className="block text-xl font-bold" style={{ color: "var(--text)" }}>
                        {stat.value}
                      </span>
                      <span className="block text-xs" style={{ color: "var(--text-dim)" }}>
                        {stat.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Key differentiators */}
              <div ref={checksRef} className="space-y-2.5">
                {[
                  "MIT licensed — inspect, fork, modify freely",
                  "No account required for API-only usage",
                  "Keys stored in your browser, never transmitted",
                  "Switch providers mid-conversation — no lock-in",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    <Check size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Self-host CTA */}
              <div className="mt-6">
                <a
                  href="https://github.com/rozengoza/chat-interface-backend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/>
                  </svg>
                  Self-Host the Backend
                </a>
                <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
                  Express + PostgreSQL on Neon. Docker, Fly.io, Render, Railway configs included.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Cost comparison */}
          <div ref={rightColRef}>
            <div
              className="rounded-2xl border overflow-hidden p-6 lg:p-8"
              style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
            >
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <DollarSign size={16} style={{ color: "var(--accent)" }} />
                What You Actually Pay
              </h3>
              <p className="text-xs mb-5" style={{ color: "var(--text-dim)" }}>
                Per month, ~100 conversations with 2K input + 1K output tokens
              </p>

              {/* Cost bars */}
              <div className="space-y-4 mb-6">
                {[
                  { label: "Claude Pro (monthly)", cost: "$20.00", color: "var(--red)", barWidth: "100%" },
                  { label: "ARC + DeepSeek Flash", cost: "~$0.03", color: "var(--green)", barWidth: "0.15%" },
                  { label: "ARC + Claude Sonnet 4.6", cost: "~$6.00", color: "var(--accent)", barWidth: "30%" },
                  { label: "ARC + Claude Opus 4.8", cost: "~$10.00", color: "var(--accent-warm)", barWidth: "50%" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                        {item.label}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: item.label === "Claude Pro (monthly)" ? "var(--red)" : "var(--green)",
                        }}
                      >
                        {item.cost}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: item.barWidth,
                          background: item.color,
                          opacity: item.label === "Claude Pro (monthly)" ? 1 : 0.8,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Savings callout */}
              <div
                className="rounded-xl p-5 lg:p-6 text-center border"
                style={{
                  background: "var(--accent-dim)",
                  borderColor: "var(--border-accent)",
                }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  Use API keys directly — save up to 99.9% vs subscriptions
                </span>
                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                  Pay only for what you use. No monthly fee. No waste.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
