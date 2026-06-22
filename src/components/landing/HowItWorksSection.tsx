import { useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitElement } from "../../hooks/useTextSplit";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    title: "Create Account",
    description:
      "Sign up with a username and password. No email required. Your profile stays local.",
  },
  {
    title: "Add Your API Key",
    description:
      "Paste your Anthropic, OpenAI, or DeepSeek key. It stays in your browser — never sent to our servers.",
  },
  {
    title: "Choose Your Model",
    description:
      "Pick from 22+ models across 9 providers. Switch anytime mid-conversation.",
  },
  {
    title: "Start Chatting",
    description:
      "Chat with the AI model of your choice. Pay only for the tokens you use. No subscriptions.",
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const flow = flowRef.current;
    if (!section || !title || !subtitle || !flow) return;

    const steps = flow.children;
    if (!steps.length) return;

    const ctx = gsap.context(() => {
      const titleWords = splitElement(title);
      gsap.set(subtitle, { opacity: 0, y: 20 });
      gsap.set(steps, { opacity: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      tl.from(titleWords, {
        opacity: 0, y: 30, rotateX: -15, duration: 0.4, stagger: 0.04, ease: "power2.out",
      }).to(subtitle, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15")
        .to(steps, {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: "power2.out",
        }, "-=0.2");
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="tesla-section py-28 sm:py-36 px-5 sm:px-8 lg:px-12"
      style={{ background: "var(--surface)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div ref={headerRef} className="text-center mb-20">
          <h2
            ref={titleRef}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            How It Works
          </h2>
          <p
            ref={subtitleRef}
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Four steps from landing page to AI-powered chat. No credit card, no subscription.
          </p>
        </div>

        {/* Sequence flow */}
        <div
          ref={flowRef}
          className="relative"
          style={{ maxWidth: 960, margin: "0 auto" }}
        >
          {/* Continuous connecting track */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, var(--border), var(--accent-dim), var(--border))" }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 lg:gap-0 relative">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative flex lg:block">
                {/* Step connector with dot */}
                <div className="flex lg:flex-col items-start lg:items-center gap-4 lg:gap-0 p-5 lg:p-6 w-full">
                  {/* Dot + arrow row (desktop) / dot column (mobile) */}
                  <div className="flex items-center gap-0 lg:mb-5 w-full lg:w-auto">
                    {/* Accent dot */}
                    <div
                      className="relative z-10 w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: i === 0 ? "var(--accent)" : "var(--text-dim)", opacity: i === 0 ? 1 : 0.4 }}
                    />
                    {/* Arrow between steps on desktop */}
                    {i < STEPS.length - 1 && (
                      <div className="hidden lg:flex items-center flex-1 mx-6">
                        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                        <ArrowRight size={14} style={{ color: "var(--text-dim)", flexShrink: 0, marginLeft: 4 }} />
                      </div>
                    )}
                  </div>

                  {/* Text content */}
                  <div className="lg:text-center flex-1">
                    <h3 className="text-sm font-semibold mb-1.5" style={{ color: i === 0 ? "var(--accent)" : "var(--text)" }}>
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", lineHeight: "1.7", maxWidth: 240 }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
