import { useState, useEffect, useRef } from "react";
import { Terminal, ArrowRight, Check, DollarSign, Sparkles } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitElement } from "../../hooks/useTextSplit";

gsap.registerPlugin(ScrollTrigger);

const TERMINAL_LINES = [
  { text: '$ export ANTHROPIC_API_KEY="sk-ant-..."', delay: 0 },
  { text: '$ export DEEPSEEK_API_KEY="sk-..."', delay: 600 },
  { text: "$ claude", delay: 400 },
  { text: "> Fix the authentication bug in auth.ts", delay: 800 },
  { text: "", delay: 300 },
  { text: "Claude Code • Opus 4.8 • analyzing codebase...", delay: 600 },
  { text: "✓ Found issue in auth.ts:45 — JWT expiry not validated", delay: 400 },
  { text: "✓ Applied fix: added expiry check before token refresh", delay: 300 },
  { text: "✓ All 12 auth tests passing", delay: 200 },
];

function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasRevealed = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRevealed.current) {
          hasRevealed.current = true;
          let currentLine = 0;
          const interval = setInterval(() => {
            currentLine++;
            setVisibleLines(currentLine);
            if (currentLine >= TERMINAL_LINES.length) {
              clearInterval(interval);
            }
          }, 90);

          return () => clearInterval(interval);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="rounded-2xl border overflow-hidden shadow-xl"
      style={{
        background: "var(--code-bg)",
        borderColor: "var(--border2)",
      }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: "var(--code-header-bg)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
        <span className="ml-2 text-xs" style={{ color: "var(--text-dim)" }}>
          Terminal · bash
        </span>
      </div>

      {/* Terminal body */}
      <div className="p-5 font-mono text-sm leading-relaxed overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex items-start gap-2" style={{ minHeight: line.text ? "1.8em" : "0.8em" }}>
            {line.text.startsWith("$") ? (
              <span style={{ color: "var(--green)" }}>$</span>
            ) : line.text.startsWith(">") ? (
              <span style={{ color: "var(--accent)" }}>{">"}</span>
            ) : line.text.startsWith("✓") ? (
              <span style={{ color: "var(--green)" }}>
                <Check size={14} className="inline mr-1" />
              </span>
            ) : line.text ? (
              <span className="opacity-40">{">"}</span>
            ) : null}
            <span
              style={{
                color: line.text.startsWith("$")
                  ? "var(--text)"
                  : line.text.startsWith(">")
                  ? "var(--text)"
                  : line.text.startsWith("✓")
                  ? "var(--green)"
                  : line.text.includes("•")
                  ? "var(--text-dim)"
                  : "var(--text-muted)",
              }}
            >
              {line.text.startsWith("$") || line.text.startsWith(">")
                ? line.text.slice(1).trim()
                : line.text}
            </span>
          </div>
        ))}
        {visibleLines >= TERMINAL_LINES.length && (
          <span className="cursor-blink" />
        )}
      </div>
    </div>
  );
}

export default function ClaudeCodeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  // const headerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const badge = badgeRef.current;
    const banner = bannerRef.current;
    const left = leftColRef.current;
    const right = rightColRef.current;
    const bottom = bottomRef.current;
    if (!section || !title || !subtitle || !badge || !banner || !left || !right || !bottom) return;

    const children = left.children;
    const bannerCards = banner.children;

    const ctx = gsap.context(() => {
      // Split title into word spans for dynamic reveal
      const titleWords = splitElement(title);
      gsap.set(subtitle, { opacity: 0, y: 20 });
      gsap.set(badge, { opacity: 0, y: 15 });
      gsap.set(bannerCards, { opacity: 0, y: 25, scale: 0.95 });
      gsap.set(children, { opacity: 0, x: -30 });
      gsap.set(right, { opacity: 0, x: 30, scale: 0.95 });
      gsap.set(bottom, { opacity: 0, y: 20 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(badge, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .from(titleWords, {
          opacity: 0,
          y: 30,
          rotateX: -15,
          duration: 0.4,
          stagger: 0.04,
          ease: "power2.out",
        }, "-=0.15")
        .to(subtitle, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15")
        .to(bannerCards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(1.1)",
        }, "-=0.2")
        .to(children, {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
        }, "-=0.15")
        .to(right, { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: "power2.out" }, "-=0.3")
        .to(bottom, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.15");
    });

    return () => ctx.revert();
  }, []);

  return (
    <section id="claude-code" ref={sectionRef} className="tesla-section py-28 sm:py-36 px-4 sm:px-8 lg:px-12" style={{ background: "var(--surface)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <div ref={badgeRef} className="tesla-badge mx-auto mb-6">
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            Pay As You Go
          </div>
          <h2
            ref={titleRef}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            API Keys Over Subscriptions
          </h2>
          <p
            ref={subtitleRef}
            className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            ARC doesn't replace Claude Pro or ChatGPT Plus — it gives you a{" "}
            <strong style={{ color: "var(--text)" }}>better option</strong>.
            Use the same API keys you already have, pay per token instead of per month,
            and keep full control over which models you use and when.
          </p>
        </div>

        {/* Comparison banner */}
        <div ref={bannerRef}>
          <div
            className="max-w-4xl mx-auto rounded-2xl p-6 lg:p-8 mb-16 grid grid-cols-1 sm:grid-cols-3 gap-6 border"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border2)",
            }}
          >
            {[
              {
                label: "Claude Pro",
                sub: "$20/month — unlimited? No.",
                highlight: false,
              },
              {
                label: "ChatGPT Plus",
                sub: "$20/month — capped at 40 messages/3h",
                highlight: false,
              },
              {
                label: "ARC + Your API Key",
                sub: "~$0–10/month — pay per token, no cap",
                highlight: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-5 lg:p-6 text-center border"
                style={{
                  background: item.highlight ? "var(--accent-dim)" : "transparent",
                  borderColor: item.highlight ? "var(--border-accent)" : "var(--border)",
                }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: item.highlight ? "var(--accent)" : "var(--text)" }}>
                  {item.label}
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center" style={{ maxWidth: 1024, margin: "0 auto" }}>
          {/* Left: Text */}
          <div ref={leftColRef}>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--accent-dim)" }}
                >
                  <Terminal size={20} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>
                    Terminal-Native Coding
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Run <code style={{
                      background: "var(--code-bg)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.85em",
                      color: "var(--accent)",
                    }}>claude</code> in your terminal. Claude Code reads your entire codebase, understands context,
                    and helps you code faster — all with the API key you already have, not a separate subscription.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--accent-dim)" }}
                >
                  <ArrowRight size={20} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>
                    Multi-Provider Support
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Set <code style={{
                      background: "var(--code-bg)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.85em",
                      color: "var(--accent)",
                    }}>ANTHROPIC_API_KEY</code> for Claude models,{" "}
                    <code style={{
                      background: "var(--code-bg)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.85em",
                      color: "var(--accent)",
                    }}>DEEPSEEK_API_KEY</code> for DeepSeek,
                    or use OpenRouter for unified access. One CLI, any provider — no need to manage multiple subscriptions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--accent-dim)" }}
                >
                  <DollarSign size={20} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>
                    Pay Per Token, Not Per Month
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Claude Pro costs $20/month whether you use it or not. With ARC, you only pay for
                    what you consume. Casual user spending ~$3/month on DeepSeek? Great. Power user
                    spending $15/month on Opus? Still cheaper than Pro. <strong style={{ color: "var(--text)" }}>You control the cost.</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--accent-dim)" }}
                >
                  <Check size={20} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>
                    Same Key, Anywhere
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    The API key you use in ARC works in Claude Code, the Anthropic SDK, LangChain, or
                    any tool that speaks the Anthropic API. No vendor lock-in. Full portability.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Terminal mockup */}
          <div ref={rightColRef}>
            <TerminalMockup />
          </div>
        </div>

        {/* Bottom CTA */}
        <div ref={bottomRef} className="text-center mt-16 lg:mt-20">
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            💡 Already have an API key? ARC works with it instantly — no subscription, no credit card required.
            <br />
            Don't have one yet? Grab a key from{" "}
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              Anthropic
            </a>
            ,{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              OpenAI
            </a>
            , or{" "}
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              DeepSeek
            </a>{" "}
            in under a minute.
          </p>
        </div>
      </div>
    </section>
  );
}
