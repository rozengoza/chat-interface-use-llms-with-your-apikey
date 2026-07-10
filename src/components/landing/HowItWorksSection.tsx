import { useReveal } from "../../hooks/useReveal";

const STEPS = [
  { title: "Create account", desc: "Username and password. No email required. Your profile stays local." },
  { title: "Add your key", desc: "Paste your Anthropic, OpenAI, or DeepSeek key. It stays in your browser — never sent to our servers." },
  { title: "Choose a model", desc: "Pick from 22+ models across 9 providers. Switch anytime mid-conversation." },
  { title: "Start chatting", desc: "Pay only for the tokens you use. No subscription, no seat, no minimum." },
];

export default function HowItWorksSection() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section className="pb-section pb-px" style={{ background: "var(--pb-bg)" }}>
      <div className="pb-container">
        <div className="max-w-2xl mb-14">
          <span className="pb-label mb-4" style={{ "--tick": "var(--pb-amber)" } as React.CSSProperties}>Sequence</span>
          <h2 className="pb-heading">Four steps, in order</h2>
        </div>

        <div ref={ref} className="reveal relative">
          <div
            aria-hidden="true"
            className="hidden lg:block absolute left-0 right-0"
            style={{ top: 15, height: 1, background: "var(--pb-rule)" }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div
                  className="relative z-10 pb-mono w-8 h-8 flex items-center justify-center text-xs font-bold mb-4"
                  style={{
                    background: i === 0 ? "var(--pb-coral)" : "var(--pb-surface)",
                    color: i === 0 ? "var(--pb-bg)" : "var(--pb-text-dim)",
                    border: i === 0 ? "none" : "1px solid var(--pb-rule)",
                    borderRadius: "50%",
                  }}
                >
                  {i + 1}
                </div>
                <h3 className="text-base font-semibold mb-1.5" style={{ color: i === 0 ? "var(--pb-coral)" : "var(--pb-text)" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--pb-text-dim)" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
