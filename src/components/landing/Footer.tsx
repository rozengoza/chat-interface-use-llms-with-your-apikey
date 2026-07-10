import faviconUrl from "../../assets/favicon.svg";

const GITHUB_ICON_PATH =
  "M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Models", href: "#models" },
  { label: "Pricing", href: "#pricing" },
  { label: "Claude Code", href: "#claude-code" },
  { label: "About", href: "/about" },
];
const RESOURCE_LINKS = [
  { label: "Frontend", href: "https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey" },
  { label: "Backend", href: "https://github.com/rozengoza/chat-interface-backend" },
  { label: "Docs", href: "https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey/blob/development/README.md" },
  { label: "Anthropic keys", href: "https://console.anthropic.com/" },
  { label: "DeepSeek keys", href: "https://platform.deepseek.com/api_keys" },
];

export default function Footer() {
  return (
    <footer style={{ background: "var(--pb-surface)", borderTop: "1px solid var(--pb-rule)" }}>
      <div className="pb-container pb-gutter py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2">
              <img src={faviconUrl} alt="ARC" className="w-7 h-7" />
              <span className="pb-display text-xl">ARC</span>
            </div>
            <p className="text-sm leading-relaxed mt-4 mb-4" style={{ color: "var(--pb-text-dim)" }}>
              A self-hostable chat interface. Bring your own API key. Pay only for what you use.
            </p>
            <a href="https://github.com/rozengoza" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "var(--pb-coral)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d={GITHUB_ICON_PATH} /></svg>
              rozengoza
            </a>
          </div>

          <div>
            <h4 className="pb-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--pb-text)" }}>Product</h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}><a href={l.href} className="text-sm" style={{ color: "var(--pb-text-dim)" }}>{l.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="pb-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--pb-text)" }}>Resources</h4>
            <ul className="space-y-2.5">
              {RESOURCE_LINKS.map((l) => (
                <li key={l.label}><a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: "var(--pb-text-dim)" }}>{l.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="pb-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--pb-text)" }}>Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey/blob/development/LICENSE" target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: "var(--pb-text-dim)" }}>
                  MIT License
                </a>
              </li>
              <li><span className="text-sm" style={{ color: "var(--pb-text-dim)" }}>Keys never leave your browser</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 flex items-center gap-2" style={{ borderTop: "1px solid var(--pb-rule)" }}>
          <span className="pb-node" style={{ "--tick": "var(--pb-coral)" } as React.CSSProperties} />
          <p className="pb-mono text-xs" style={{ color: "var(--pb-text-dim)" }}>
            ARC · Open source · MIT licensed
          </p>
        </div>
      </div>
    </footer>
  );
}
