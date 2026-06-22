import { useState, useEffect, useRef, useCallback } from "react";
import { Cpu, Sparkles, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ModelInfo {
  id: string;
  name: string;
  context: number;
  free: boolean;
}

interface ProviderGroup {
  name: string;
  models: ModelInfo[];
}

const PROVIDERS: ProviderGroup[] = [
  {
    name: "Anthropic",
    models: [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", context: 200, free: false },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", context: 200, free: false },
    ],
  },
  {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o", context: 128, free: false },
      { id: "gpt-4o-mini", name: "GPT-4o mini", context: 128, free: false },
    ],
  },
  {
    name: "Google",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: 1000, free: false },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1000, free: false },
    ],
  },
  {
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", context: 64, free: false },
      { id: "deepseek-reasoner", name: "DeepSeek R1", context: 64, free: false },
    ],
  },
  {
    name: "Groq",
    models: [
      { id: "llama-3.3-70b", name: "Llama 3.3 70B", context: 128, free: false },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", context: 8, free: false },
    ],
  },
  {
    name: "Mistral",
    models: [
      { id: "mistral-large", name: "Mistral Large", context: 32, free: false },
      { id: "mistral-small", name: "Mistral Small", context: 32, free: false },
    ],
  },
  {
    name: "xAI",
    models: [
      { id: "grok-3", name: "Grok 3", context: 131, free: false },
      { id: "grok-3-mini", name: "Grok 3 Mini", context: 131, free: false },
    ],
  },
  {
    name: "OpenRouter",
    models: [
      { id: "llama-3.3-70b", name: "Llama 3.3 70B (OR)", context: 128, free: false },
      { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet (OR)", context: 200, free: false },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (OR)", context: 1000, free: false },
    ],
  },
  {
    name: "Gemini Free",
    models: [
      { id: "gemini-2.0-flash-free", name: "Gemini 2.0 Flash ✦", context: 1000, free: true },
    ],
  },
  {
    name: "Ollama",
    models: [
      { id: "llama3.2", name: "Llama 3.2 (local)", context: 128, free: false },
      { id: "mistral", name: "Mistral 7B (local)", context: 32, free: false },
      { id: "qwen2.5-coder", name: "Qwen2.5 Coder 7B (local)", context: 32, free: false },
    ],
  },
];

export default function ModelsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeProvider, setActiveProvider] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const prevProviderRef = useRef(0);
  const isAnimating = useRef(false);

  // GSAP entrance animation
  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const tabs = tabsRef.current;
    if (!section || !header || !tabs) return;

    const ctx = gsap.context(() => {
      gsap.set(header, { opacity: 0, y: 30 });
      gsap.set(tabs, { opacity: 0, y: 20 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(header, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
        .to(tabs, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.2");
    });

    return () => ctx.revert();
  }, []);

  // Animate cards when provider changes
  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean);
    if (!cards.length || isAnimating.current) return;

    const direction = activeProvider > prevProviderRef.current ? 1 : -1;
    prevProviderRef.current = activeProvider;
    isAnimating.current = true;

    const ctx = gsap.context(() => {
      // Set initial state for all cards
      gsap.set(cards, {
        opacity: 0,
        x: direction * 40,
        scale: 0.95,
      });

      // Stagger them in
      gsap.to(cards, {
        opacity: 1,
        x: 0,
        scale: 1,
        duration: 0.4,
        stagger: 0.06,
        ease: "power2.out",
        onComplete: () => {
          isAnimating.current = false;
        },
      });
    }, cards[0]);

    return () => ctx.revert();
  }, [activeProvider]);

  // Auto-play carousel
  const nextProvider = useCallback(() => {
    if (isAnimating.current) return;
    setActiveProvider((prev) => (prev + 1) % PROVIDERS.length);
  }, []);

  const prevProvider = useCallback(() => {
    if (isAnimating.current) return;
    setActiveProvider((prev) => (prev - 1 + PROVIDERS.length) % PROVIDERS.length);
  }, []);

  useEffect(() => {
    if (isPaused) {
      clearInterval(autoPlayTimer.current);
      return;
    }
    autoPlayTimer.current = setInterval(nextProvider, 5000);
    return () => clearInterval(autoPlayTimer.current);
  }, [isPaused, nextProvider]);

  const setCardRef = (el: HTMLDivElement | null, i: number) => {
    if (el) cardRefs.current[i] = el;
  };

  const currentModels = PROVIDERS[activeProvider].models;

  return (
    <section
      id="models"
      ref={sectionRef}
      className="tesla-section py-28 sm:py-36 px-4 sm:px-8 lg:px-12"
      style={{ background: "var(--bg)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            22+ Models, One Interface
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Bring the API key, pick your provider, and chat. From Claude Opus to local Ollama models — one unified chat experience.
          </p>
        </div>

        {/* Provider carousel tabs */}
        <div ref={tabsRef}>
          {/* Desktop tabs */}
          <div
            className="hidden sm:flex gap-2 overflow-x-auto pb-3 mb-4 landing-scroll"
            style={{ scrollbarWidth: "thin" }}
          >
            {PROVIDERS.map((provider, i) => (
              <button
                key={provider.name}
                onClick={() => { setActiveProvider(i); setIsPaused(true); }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                  i === activeProvider ? "provider-tab-active" : ""
                }`}
                style={
                  i === activeProvider
                    ? {}
                    : { color: "var(--text-muted)", borderColor: "var(--border)" }
                }
              >
                {provider.name}
                <span className="ml-1.5 text-xs opacity-60">({provider.models.length})</span>
              </button>
            ))}
          </div>

          {/* Mobile carousel controls */}
          <div className="flex sm:hidden items-center justify-between mb-4 gap-2">
            <button
              onClick={prevProvider}
              className="p-2 rounded-lg border flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex-1 text-center">
              <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                {PROVIDERS[activeProvider].name}
              </span>
              <div className="flex justify-center gap-1.5 mt-1.5">
                {PROVIDERS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveProvider(i); setIsPaused(true); }}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: i === activeProvider ? "var(--accent)" : "var(--border2)",
                      transform: i === activeProvider ? "scale(1.4)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={nextProvider}
              className="p-2 rounded-lg border flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Auto-play toggle */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: "var(--border)",
                color: isPaused ? "var(--text-muted)" : "var(--accent)",
              }}
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
              {isPaused ? "Auto-play paused" : "Auto-playing providers"}
            </button>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              ({activeProvider + 1} of {PROVIDERS.length})
            </span>
          </div>
        </div>

        {/* Model cards grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ minHeight: 180 }}>
          {currentModels.map((model, i) => (
            <div key={`${activeProvider}-${model.id}`} ref={(el) => setCardRef(el, i)}>
              <div className="glass-card p-5 lg:p-6 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--accent-dim)" }}
                >
                  <Cpu size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {model.name}
                    </h4>
                    {model.free && (
                      <span
                        className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: "var(--green)", color: "var(--bg)" }}
                      >
                        <Sparkles size={10} />
                        FREE
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {model.context}K context window
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
