import { useState, useEffect, useCallback, useRef } from "react";
import { Pause, Play } from "lucide-react";
import { useReveal } from "../../hooks/useReveal";

interface ModelInfo { id: string; name: string; context: number; free: boolean; }
interface ProviderGroup { name: string; models: ModelInfo[]; }

const PROVIDERS: ProviderGroup[] = [
  { name: "Anthropic", models: [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", context: 200, free: false },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", context: 200, free: false },
  ]},
  { name: "OpenAI", models: [
    { id: "gpt-4o", name: "GPT-4o", context: 128, free: false },
    { id: "gpt-4o-mini", name: "GPT-4o mini", context: 128, free: false },
  ]},
  { name: "Google", models: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: 1000, free: false },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1000, free: false },
  ]},
  { name: "DeepSeek", models: [
    { id: "deepseek-chat", name: "DeepSeek V3", context: 64, free: false },
    { id: "deepseek-reasoner", name: "DeepSeek R1", context: 64, free: false },
  ]},
  { name: "Groq", models: [
    { id: "llama-3.3-70b", name: "Llama 3.3 70B", context: 128, free: false },
    { id: "gemma2-9b-it", name: "Gemma 2 9B", context: 8, free: false },
  ]},
  { name: "Mistral", models: [
    { id: "mistral-large", name: "Mistral Large", context: 32, free: false },
    { id: "mistral-small", name: "Mistral Small", context: 32, free: false },
  ]},
  { name: "xAI", models: [
    { id: "grok-3", name: "Grok 3", context: 131, free: false },
    { id: "grok-3-mini", name: "Grok 3 Mini", context: 131, free: false },
  ]},
  { name: "OpenRouter", models: [
    { id: "llama-3.3-70b-or", name: "Llama 3.3 70B (OR)", context: 128, free: false },
    { id: "claude-3.5-sonnet-or", name: "Claude 3.5 Sonnet (OR)", context: 200, free: false },
    { id: "gemini-2.0-flash-or", name: "Gemini 2.0 Flash (OR)", context: 1000, free: false },
  ]},
  { name: "Ollama", models: [
    { id: "llama3.2", name: "Llama 3.2 (local)", context: 128, free: false },
    { id: "mistral-local", name: "Mistral 7B (local)", context: 32, free: false },
    { id: "qwen2.5-coder", name: "Qwen2.5 Coder 7B (local)", context: 32, free: false },
  ]},
];

const AUTOPLAY_MS = 5000;

export default function ModelsShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headerRef = useReveal<HTMLDivElement>();
  const panelRef = useReveal<HTMLDivElement>();

  const goTo = useCallback((i: number) => { setActive(((i % PROVIDERS.length) + PROVIDERS.length) % PROVIDERS.length); setPaused(true); }, []);
  const next = useCallback(() => setActive((p) => (p + 1) % PROVIDERS.length), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setInterval(next, AUTOPLAY_MS);
    return () => { if (timerRef.current !== null) clearInterval(timerRef.current); };
  }, [paused, next]);

  const models = PROVIDERS[active].models;

  return (
    <section id="models" className="pb-section pb-px" style={{ background: "var(--pb-surface)" }}>
      <div className="pb-container">
        <div ref={headerRef} className="reveal max-w-2xl mb-10">
          <span className="pb-label mb-4" style={{ "--tick": "var(--pb-coral)" } as React.CSSProperties}>Catalogue</span>
          <h2 className="pb-heading">9 providers, 22+ models</h2>
        </div>

        <div ref={panelRef} className="reveal pb-panel overflow-hidden">
          {/* Provider rail */}
          <div className="flex overflow-x-auto pb-scroll" style={{ borderBottom: "1px solid var(--pb-rule)" }}>
            {PROVIDERS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => goTo(i)}
                className="flex-shrink-0 px-4 py-3 pb-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors"
                style={{
                  color: i === active ? "var(--pb-text)" : "var(--pb-text-dim)",
                  borderBottom: i === active ? "2px solid var(--pb-coral)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {p.name} <span style={{ opacity: 0.5 }}>({p.models.length})</span>
              </button>
            ))}
            <button
              onClick={() => setPaused((v) => !v)}
              className="flex-shrink-0 ml-auto px-4 py-3 flex items-center gap-1.5 pb-mono text-xs"
              style={{ color: "var(--pb-text-dim)" }}
              aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
            >
              {paused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          </div>

          {/* Spec table */}
          <div className="overflow-x-auto">
            <table className="w-full pb-mono text-sm" style={{ minWidth: 420 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--pb-rule)" }}>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Model</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Context</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--pb-text-dim)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--pb-rule)" }}>
                    <td className="px-5 py-3.5" style={{ color: "var(--pb-text)" }}>{m.name}</td>
                    <td className="px-5 py-3.5 text-right" style={{ color: "var(--pb-text-dim)" }}>{m.context}K</td>
                    <td className="px-5 py-3.5 text-right">
                      {m.free ? (
                        <span className="text-xs" style={{ color: "var(--pb-teal)" }}>FREE</span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--pb-text-dim)" }}>metered</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
