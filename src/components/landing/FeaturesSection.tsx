import { useRef, useEffect } from "react";
import { Key, Zap, Layers, Code2, Wallet, Shield } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitElement } from "../../hooks/useTextSplit";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: Key,
    title: "Bring Your Own Key",
    description:
      "Your API key never touches our servers. It lives in your browser's memory and dies when you close the tab. Every request goes directly to the AI provider — zero middlemen.",
  },
  {
    icon: Wallet,
    title: "Pay for What You Use",
    description:
      "No $20/month subscription. Most developers spend under $5/month with API pricing. Use DeepSeek Flash at $0.14/MTok for casual chats, or Claude Opus at $5/MTok for complex reasoning — you control the cost.",
  },
  {
    icon: Layers,
    title: "22+ Models, One Interface",
    description:
      "Anthropic. OpenAI. Google. DeepSeek. Groq. Mistral. xAI. OpenRouter. Ollama. Switch providers and models in one click — no need to manage multiple chat apps or subscriptions.",
  },
  {
    icon: Zap,
    title: "Instant Streaming",
    description:
      "Token-by-token SSE streaming gives you real-time responses. No waiting for the full completion — see every word as it's generated, just like the native chat interfaces.",
  },
  {
    icon: Shield,
    title: "100% Transparent",
    description:
      "Open source under MIT. Open DevTools, watch the network tab — every request goes to the AI provider and nowhere else. You don't have to trust us. That's the point.",
  },
  {
    icon: Code2,
    title: "Claude Code Ready",
    description:
      "Use your API keys with Claude Code CLI. Run terminal-native coding sessions with the models you pay for. Set ANTHROPIC_API_KEY and go — ARC keys work everywhere.",
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const cards = cardsRef.current;
    const bottom = bottomRef.current;
    if (!section || !header || !title || !subtitle || !cards.length) return;

    const ctx = gsap.context(() => {
      // Split heading into word spans
      const titleWords = splitElement(title);
      // Use gsap.from() — keeps elements visible by default, animates from offset state
      gsap.set(subtitle, { opacity: 0, y: 20 });
      gsap.set(cards, { opacity: 0, y: 50, scale: 0.92 });
      gsap.set(bottom, { opacity: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });

      // Word-by-word title reveal — FROM state (visible by default, animates in when triggered)
      tl.from(titleWords, {
        opacity: 0,
        y: 30,
        rotateX: -20,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
      })
        .to(subtitle, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15")
        // Cards stagger in with bounce
        .to(cards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "back.out(1.3)",
        }, "-=0.25")
        // Bottom comparison
        .to(bottom, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
    });

    return () => ctx.revert();
  }, []);

  const setCardRef = (el: HTMLDivElement | null, i: number) => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <section
      id="features"
      ref={sectionRef}
      className="tesla-section py-28 sm:py-36 px-4 sm:px-8 lg:px-12"
      style={{ background: "var(--bg)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Section header */}
        <div ref={headerRef} className="text-center mb-20">
          <h2
            ref={titleRef}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            Why ARC?
          </h2>
          <p
            ref={subtitleRef}
            className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)", lineHeight: "1.7" }}
          >
            Most AI chat apps charge $20/month for a subscription — whether you use it or not.
            If you already have an API key, you're very likely overpaying. ARC plugs straight
            into your key with zero subscription fees.
          </p>
        </div>

        {/* Feature cards grid — larger gap and padding */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {FEATURES.map((feature, i) => {
            const FeatureIcon = feature.icon;
            return (
              <div key={feature.title} ref={(el) => setCardRef(el, i)}>
                <div
                  className="group glass-card p-8 lg:p-10 h-full transition-all duration-300 hover:-translate-y-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300"
                    style={{ background: "var(--accent-dim)" }}
                  >
                    <FeatureIcon size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", lineHeight: "1.8" }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Who this is for / not for */}
        <div ref={bottomRef} className="mt-24 lg:mt-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10" style={{ maxWidth: 896, margin: "0 auto" }}>
            <div
              className="rounded-2xl p-8 lg:p-10 border"
              style={{ background: "var(--surface)", borderColor: "var(--green)" }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--green)" }}>
                ✅ Who this is for
              </h3>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-muted)", lineHeight: "1.8" }}>
                <li>→ Devs with an API key who don't want to pay $20/month for a chat UI</li>
                <li>→ Anyone who hits free limits mid-work and wants to just continue</li>
                <li>→ Developers who want full API access — longer context, no rate limits, custom prompts</li>
                <li>→ Users who want to switch between models and providers freely</li>
              </ul>
            </div>

            <div
              className="rounded-2xl p-8 lg:p-10 border"
              style={{ background: "var(--surface)", borderColor: "var(--red)" }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--red)" }}>
                ❌ Who this is not for
              </h3>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-muted)", lineHeight: "1.8" }}>
                <li>→ Non-developers without an API key from any provider</li>
                <li>→ Heavy daily users where Pro pricing actually makes sense</li>
                <li>→ Teams needing centralized billing (bring your own key is per-user)</li>
                <li>→ Users who prefer managed authentication and key handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
