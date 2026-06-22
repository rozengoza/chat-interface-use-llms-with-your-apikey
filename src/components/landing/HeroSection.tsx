import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import gsap from "gsap";
import type { UserProfile } from "../../auth";
import faviconUrl from "../../assets/favicon.svg";

interface HeroSectionProps {
  user: UserProfile | null;
}

export default function HeroSection({ user }: HeroSectionProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const taglineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      logoRef.current,
      { opacity: 0, scale: 0.85, y: -10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7 }
    )
      .fromTo(
        taglineRef.current,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7 },
        "-=0.3"
      )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.3"
      )
      .fromTo(
        ctasRef.current?.children || [],
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 },
        "-=0.2"
      )
      .fromTo(
        scrollRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        "-=0.1"
      );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero-mesh relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 lg:px-12 overflow-hidden"
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 animate-float"
        style={{ background: "var(--accent-glow)", filter: "blur(80px)" }}
      />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.3), transparent)",
          filter: "blur(100px)",
          animation: "float 8s ease-in-out infinite",
          animationDelay: "-4s",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center" style={{ maxWidth: 896, width: "100%" }}>
        {/* Logo */}
        <div className="mb-8">
          <img
            ref={logoRef}
            src={faviconUrl}
            alt="ARC"
            className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg"
          />
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6 border"
          style={{
            background: "var(--accent-dim)",
            borderColor: "var(--border-accent)",
            color: "var(--accent)",
          }}
        >
          <span className="w-2 h-2 rounded-full animate-shimmer" style={{ background: "var(--accent)" }} />
          Open Source · MIT · Self-hostable Backend
        </div>

        {/* Tagline */}
        <h1
          ref={taglineRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)" }}
        >
          Bring Your Own{" "}
          <span className="gradient-text">API Key.</span>
          <br />
          Chat with the models{" "}
          <span className="gradient-text">you</span> pay for.
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-base sm:text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          No $20/month subscription. No surprise charges. Just you, your API key,
          and <strong style={{ color: "var(--text)" }}>22+ AI models</strong> across every major
          provider — Anthropic, OpenAI, Google, DeepSeek, and more.
          Pay once per token, not once per month.
        </p>

        {/* CTAs */}
        <div ref={ctasRef} className="flex flex-col sm:flex-row gap-4">
          {user ? (
            <button
              onClick={() => navigate("/chat")}
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              Open Chat
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/signup")}
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              Get Started Free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          )}
          <a
            href="https://github.com/rozengoza"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 border"
            style={{
              color: "var(--text)",
              borderColor: "var(--border2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/>
              </svg>
            View on GitHub
          </a>
          <button
            onClick={() => navigate("/about")}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border"
            style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            About the API
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 flex flex-col items-center gap-2"
        style={{ color: "var(--text-dim)" }}
      >
        <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
        <ChevronDown size={16} className="animate-bounce" />
      </div>
    </section>
  );
}
