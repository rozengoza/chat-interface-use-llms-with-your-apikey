import { useRef, useEffect } from "react";
import { DollarSign, TrendingDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitElement } from "../../hooks/useTextSplit";

gsap.registerPlugin(ScrollTrigger);

const DEEPSEEK_MODELS = [
  { name: "deepseek-v4-flash (chat)", input: 0.14, output: 0.28, cache: 0.0028, highlight: true },
  { name: "deepseek-v4-pro (reasoner)", input: 0.435, output: 0.87, cache: null, highlight: false },
];

const CLAUDE_MODELS = [
  { name: "Claude Haiku 4.5", input: 1.0, output: 5.0, cache: null, highlight: false },
  { name: "Claude Sonnet 4.6", input: 3.0, output: 15.0, cache: null, highlight: true },
  { name: "Claude Opus 4.8", input: 5.0, output: 25.0, cache: null, highlight: false },
];

function PricingTable({
  provider,
  models,
  showCache,
  accentColor,
}: {
  provider: string;
  models: typeof DEEPSEEK_MODELS;
  showCache: boolean;
  accentColor: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
        <span className="w-3 h-3 rounded-full" style={{ background: accentColor }} />
        {provider}
      </h3>
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
      >
        <div
          className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider px-5 py-3"
          style={{
            background: "var(--surface2)",
            color: "var(--text-dim)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span>Model</span>
          <span>Input / MTok</span>
          <span>Output / MTok</span>
        </div>

        {models.map((model) => (
          <div
            key={model.name}
            className="grid grid-cols-3 px-5 py-3.5 text-sm border-b"
            style={{
              borderColor: "var(--border)",
              background: model.highlight ? "var(--accent-dim)" : "transparent",
            }}
          >
            <span
              className="font-medium truncate pr-2"
              style={{ color: model.highlight ? "var(--accent)" : "var(--text)" }}
            >
              {model.name}
              {model.highlight && (
                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider">Best Value</span>
              )}
            </span>
            <span style={{ color: "var(--text)" }}>${model.input.toFixed(model.input < 1 ? 3 : 2)}</span>
            <span style={{ color: "var(--text)" }}>${model.output.toFixed(model.output < 1 ? 3 : 2)}</span>
          </div>
        ))}

        {showCache && (
          <div
            className="px-5 py-2.5 text-xs"
            style={{ color: "var(--text-dim)", background: "var(--surface2)", borderTop: "1px solid var(--border)" }}
          >
            💡 <strong>Cache hit:</strong> as low as $0.0028/MTok — 98% cheaper than standard input
          </div>
        )}
      </div>
    </div>
  );
}

export default function PricingComparison() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const tablesRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  // const costNumberRefs = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const tables = tablesRef.current;
    const callout = calloutRef.current;
    const tip = tipRef.current;
    if (!section || !title || !subtitle || !tables || !callout || !tip) return;

    const ctx = gsap.context(() => {
      // Split heading words
      const titleWords = splitElement(title);
      gsap.set(subtitle, { opacity: 0, y: 20 });
      gsap.set(tables.children, { opacity: 0, y: 40, scale: 0.95 });
      gsap.set(callout, { opacity: 0, y: 30, scale: 0.92 });
      gsap.set(tip, { opacity: 0, y: 20 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      tl.from(titleWords, {
        opacity: 0,
        y: 30,
        rotateX: -15,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
      })
        .to(subtitle, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15")
        .to(tables.children, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.2,
          ease: "back.out(1.1)",
        }, "-=0.2")
        .to(callout, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.3)" }, "-=0.2")
        .to(tip, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.15");
    });

    return () => ctx.revert();
  }, []);

  // const setCostRef = (el: HTMLSpanElement | null, i: number) => {
  //   if (el) costNumberRefs.current[i] = el;
  // };

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="tesla-section py-28 sm:py-36 px-4 sm:px-8 lg:px-12"
      style={{ background: "var(--surface)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <h2
            ref={titleRef}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            Pricing Compared
          </h2>
          <p
            ref={subtitleRef}
            className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            DeepSeek vs Claude API pricing — see the cost difference and choose based on your needs.
            All prices are <strong style={{ color: "var(--text)" }}>per 1 million tokens</strong>.
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div ref={tablesRef} className="flex flex-col lg:flex-row gap-8 lg:gap-10 mb-16 lg:mb-20">
          <PricingTable provider="DeepSeek" models={DEEPSEEK_MODELS} showCache={true} accentColor="#4f8ef7" />
          <PricingTable provider="Anthropic Claude" models={CLAUDE_MODELS} showCache={false} accentColor="var(--accent)" />
        </div>

        {/* Cost analysis callout */}
        <div ref={calloutRef}>
          <div
            className="max-w-4xl mx-auto rounded-2xl p-8 lg:p-10 border text-center"
            style={{ background: "var(--accent-dim)", borderColor: "var(--border-accent)" }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingDown size={22} style={{ color: "var(--accent)" }} />
              <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                Real-World Cost Comparison
              </h3>
            </div>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
              At <strong style={{ color: "var(--text)" }}>100 messages/month</strong> with 2K input + 1K output tokens each:
            </p>
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              <div className="rounded-xl p-6 lg:p-8 text-center" style={{ background: "var(--surface)" }}>
                <span className="block text-xs mb-2" style={{ color: "var(--text-dim)" }}>DeepSeek Flash</span>
                <span className="text-3xl font-bold" style={{ color: "var(--green)" }}>~$0.03</span>
                <span className="block text-xs mt-2" style={{ color: "var(--text-dim)" }}>per month</span>
              </div>
              <div className="rounded-xl p-6 lg:p-8 text-center" style={{ background: "var(--surface)" }}>
                <span className="block text-xs mb-2" style={{ color: "var(--text-dim)" }}>Claude Sonnet 4.6</span>
                <span className="text-3xl font-bold" style={{ color: "var(--accent)" }}>~$6.00</span>
                <span className="block text-xs mt-2" style={{ color: "var(--text-dim)" }}>per month</span>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <DollarSign size={16} style={{ color: "var(--accent-warm)" }} />
              <span>
                <strong style={{ color: "var(--text)" }}>200× cheaper</strong> with DeepSeek for casual chats.
                Use <strong style={{ color: "var(--text)" }}>Claude</strong> for complex reasoning where quality matters most.
              </span>
            </div>
          </div>
        </div>

        {/* Batch & Cache savings */}
        <div ref={tipRef} className="mt-12 lg:mt-16 max-w-3xl mx-auto text-center">
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            💡 <strong style={{ color: "var(--text-muted)" }}>Pro tip:</strong> Claude offers{" "}
            <strong style={{ color: "var(--text)" }}>50% off with Batch API</strong> and{" "}
            <strong style={{ color: "var(--text)" }}>~90% off input with Prompt Caching</strong>.
            DeepSeek offers cache hits at just <strong style={{ color: "var(--text)" }}>$0.0028/MTok</strong> (98% off).
          </p>
        </div>
      </div>
    </section>
  );
}
