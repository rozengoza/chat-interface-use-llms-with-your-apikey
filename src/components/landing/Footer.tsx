import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10" style={{ background: "var(--surface)" }}>
      <div className="tesla-divider" />
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }} className="px-5 sm:px-8 lg:px-12 py-14 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xl font-semibold tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text)" }}
              >
                ARC
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
              A clean, self-hostable chat interface. Bring your own API key. Pay only for what you use.
            </p>
            <a
              href="https://github.com/rozengoza"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: "var(--accent)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/>
              </svg>
              rozengoza
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Product</h4>
            <ul className="space-y-2.5">
              {["Features", "Models", "Pricing", "Claude Code"].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm transition-colors hover:text-[var(--text)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/about"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Resources</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Frontend (ARC UI)
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/rozengoza/chat-interface-backend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Backend (API + DB)
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey/blob/development/README.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Get an API Key
                </a>
              </li>
              <li>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  DeepSeek API Keys
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey/blob/development/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-[var(--text)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  MIT License
                </a>
              </li>
              <li>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                  Privacy-first: your keys never leave your browser
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 border-t text-center"
          style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
        >
          <p className="text-xs flex items-center justify-center gap-1.5">
            Built with <Heart size={12} style={{ color: "var(--accent)" }} /> by{" "}
            <a
              href="https://github.com/rozengoza"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-colors hover:text-[var(--accent)]"
              style={{ color: "var(--text-muted)" }}
            >
              rozengoza
            </a>
            {" "}· Open Source · MIT Licensed
          </p>
        </div>
      </div>
    </footer>
  );
}
