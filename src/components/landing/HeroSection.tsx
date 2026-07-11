import { useNavigate } from "react-router-dom";
import { useReveal } from "../../hooks/useReveal";
import type { UserProfile } from "../../auth";

const PROVIDERS = ["Anthropic", "OpenAI", "Google", "DeepSeek", "Groq", "Mistral", "xAI", "OpenRouter", "Ollama"];
const SIGNAL_COLORS = ["var(--pb-coral)", "var(--pb-teal)", "var(--pb-amber)"];

const VIEW_W = 460;
const VIEW_H = 420;
const SOURCE = { x: 34, y: VIEW_H / 2 };

function RoutingDiagram() {
  const gap = VIEW_H / PROVIDERS.length;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label="Your API key routed directly to nine providers">
      {PROVIDERS.map((provider, i) => {
        const color = SIGNAL_COLORS[i % SIGNAL_COLORS.length];
        const target = { x: VIEW_W - 34, y: gap * i + gap / 2 };
        const cx1 = SOURCE.x + (target.x - SOURCE.x) * 0.45;
        const cx2 = SOURCE.x + (target.x - SOURCE.x) * 0.75;
        return (
          <g key={provider}>
            <path
              d={`M ${SOURCE.x},${SOURCE.y} C ${cx1},${SOURCE.y} ${cx2},${target.y} ${target.x - 6},${target.y}`}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.55"
            />
            <circle cx={target.x} cy={target.y} r="3" fill={color} />
            <text x={target.x - 12} y={target.y + 3.5} textAnchor="end" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill="var(--pb-text-dim)">
              {provider}
            </text>
          </g>
        );
      })}
      <circle cx={SOURCE.x} cy={SOURCE.y} r="7" fill="var(--pb-coral)" />
      <circle cx={SOURCE.x} cy={SOURCE.y} r="13" fill="none" stroke="var(--pb-coral)" strokeWidth="1" opacity="0.4" />
      <text x={SOURCE.x} y={SOURCE.y + 26} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="600" fill="var(--pb-text)" letterSpacing="0.05em">
        YOUR KEY
      </text>
    </svg>
  );
}

interface HeroSectionProps {
  user: UserProfile | null;
}

export default function HeroSection({ user }: HeroSectionProps) {
  const navigate = useNavigate();
  const textRef = useReveal<HTMLDivElement>({ threshold: 0.05 });
  const diagramRef = useReveal<HTMLDivElement>({ threshold: 0.05 });

  return (
    <section className="pb-gutter pt-32 pb-20 sm:pt-40 sm:pb-24">
      <div className="pb-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-8 items-center">
          <div ref={textRef} className="reveal">
            <span className="pb-label mb-6" style={{ "--tick": "var(--pb-coral)" } as React.CSSProperties}>
              Bring your own key
            </span>
            <h1 className="pb-display text-[13vw] sm:text-[7.5vw] lg:text-[4.4vw]">
              One key.
              <br />
              Nine providers.
              <br />
              <span style={{ color: "var(--pb-coral)" }}>Zero markup.</span>
            </h1>
            <p className="mt-7 text-base sm:text-lg max-w-lg" style={{ color: "var(--pb-text-dim)" }}>
              No $20/month subscription sitting between you and the model. Your API key talks
              straight to the provider — <strong style={{ color: "var(--pb-text)" }}>22+ models</strong>,
              billed by the token, from your browser.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button onClick={() => navigate(user ? "/chat" : "/signup")} className="pb-btn pb-btn--primary">
                {user ? "Open chat" : "Get started, free"}
              </button>
              <a href="https://github.com/rozengoza" target="_blank" rel="noopener noreferrer" className="pb-btn pb-btn--secondary">
                View source
              </a>
            </div>
          </div>

          <div ref={diagramRef} className="reveal pb-panel p-6">
            <RoutingDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}
