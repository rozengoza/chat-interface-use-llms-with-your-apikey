import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { v4 as uuid } from "uuid";
import {
  Send,
  Square,
  Trash2,
  Key,
  X,
  Check,
  Zap,
  ChevronDown,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  RefreshCw,
  Paperclip,
  LogOut,
  Copy,
  Link2,
  Moon,
  Sun,
} from "lucide-react";
import { marked } from "marked";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import "highlight.js/styles/github-dark.css";
import type { Message, Conversation, Attachment } from "./types";
import type { UserProfile } from "./auth";
import { logout } from "./auth";
import {
  loadSessions,
  saveSessions,
  loadActiveId,
  saveActiveId,
  loadApiKey,
  saveApiKey,
  createNewSession,
  deriveTitle,
} from "./store";
import { streamChat, MODELS, DEFAULT_MODEL } from "./api";
import faviconUrl from "./assets/favicon.svg";
import "./index.css";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();

// SVG icons used in code-block copy buttons (referenced in renderer + click handler)
const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(text, { language: lang }).value
      : hljs.highlightAuto(text).value;
  const langLabel = lang || "text";
  return `<div class="code-block"><div class="code-header"><span>${langLabel}</span><button class="copy-code-btn" title="Copy code">${COPY_SVG}</button></div><pre><code class="hljs">${highlighted}</code></pre></div>`;
};
renderer.link = ({ href, text }: { href: string; text: string }) => {
  // Only allow safe protocols — block javascript:, data:, vbscript:, etc.
  const safe = /^https?:\/\//i.test(href ?? "") ? href : "#";
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { renderer }) as string;
  // Sanitize before injecting into the DOM — blocks XSS from prompt-injected AI output.
  // ADD_ATTR keeps target/rel on links; FORCE_BODY wraps bare text nodes safely.
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target", "rel"],
    FORCE_BODY: true,
  });
}


type RawMsg = { role: "user" | "assistant"; content: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMsgs(raw: any[]): RawMsg[] {
  return raw
    .filter((m) => (m.sender === "human" || m.sender === "assistant") && typeof m.text === "string")
    .map((m) => ({
      role: (m.sender === "human" ? "user" : "assistant") as "user" | "assistant",
      content: m.text as string,
    }));
}

function parseClaudeSharePage(html: string): RawMsg[] {
  // Strategy 1 — Next.js Pages Router: __NEXT_DATA__ script block
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(nextMatch[1]) as any;
      const pp = data?.props?.pageProps;
      const msgs =
        pp?.conversation?.chat_messages ??
        pp?.data?.chat_messages ??
        pp?.chat_messages;
      if (Array.isArray(msgs) && msgs.length > 0) return extractMsgs(msgs);
    } catch { /* fall through */ }
  }

  // Strategy 2 — inline JSON blob containing "chat_messages" key
  // Walk the "[" that follows to find the matching "]" via bracket counting.
  const keyRe = /"chat_messages"\s*:\s*\[/g;
  let km: RegExpExecArray | null;
  while ((km = keyRe.exec(html)) !== null) {
    try {
      const start = km.index + km[0].length - 1; // position of opening "["
      let depth = 0;
      let i = start;
      for (; i < html.length; i++) {
        if (html[i] === "[" || html[i] === "{") depth++;
        else if (html[i] === "]" || html[i] === "}") { depth--; if (depth === 0) break; }
      }
      const arr = JSON.parse(html.slice(start, i + 1));
      if (Array.isArray(arr) && arr.length > 0) {
        const msgs = extractMsgs(arr);
        if (msgs.length > 0) return msgs;
      }
    } catch {
      /* keep going */
    }
  }

  throw new Error(
    "Could not parse conversation data from this share link. " +
    "Claude.ai may have changed their page format. " +
    "You can also export your data from claude.ai/settings and import the JSON directly."
  );
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function TokenRow({ msg }: { msg: Message }) {
  const t = msg.tokens;
  if (!t) return null;

  const badges = [
    { label: "in", val: t.input, color: "var(--text-muted)" },
    { label: "out", val: t.output, color: "var(--text-muted)" },
    ...(t.cacheRead > 0 ? [{ label: "⚡ cached", val: t.cacheRead, color: "var(--green)" }] : []),
    ...(t.cacheWrite > 0 ? [{ label: "written", val: t.cacheWrite, color: "var(--orange)" }] : []),
  ];

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
      {badges.map((b) => (
        <span key={b.label} style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: b.color,
          background: "var(--badge-bg)",
          border: "1px solid var(--border)",
          padding: "1px 8px",
          borderRadius: 20,
        }}>
          {b.label} {b.val.toLocaleString()}
        </span>
      ))}
    </div>
  );
}

// Event delegation handler for per-code-block copy buttons
function handleCodeCopy(e: React.MouseEvent<HTMLDivElement>) {
  const btn = (e.target as Element).closest<HTMLElement>(".copy-code-btn");
  if (!btn) return;
  const code = btn.closest(".code-block")?.querySelector("code")?.textContent ?? "";
  void navigator.clipboard.writeText(code).then(() => {
    btn.innerHTML = CHECK_SVG;
    btn.style.color = "var(--green)";
    setTimeout(() => { btn.innerHTML = COPY_SVG; btn.style.color = ""; }, 1500);
  });
}

function MessageBubble({
  msg, isStreaming, onEdit, onRegenerate,
  isEditing, editText, onEditChange, onEditSave, onEditCancel,
}: {
  msg: Message;
  isStreaming?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
  isEditing?: boolean;
  editText?: string;
  onEditChange?: (t: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
}) {
  const isUser = msg.role === "user";
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [msgCopied, setMsgCopied] = useState(false);

  useEffect(() => {
    if (isEditing && editRef.current) {
      const ta = editRef.current;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 260) + "px";
      ta.focus();
    }
  }, [isEditing, editText]);

  return (
    <div className="msg-enter msg-row" style={{
      display: "flex",
      gap: 14,
      padding: "22px 0",
      borderBottom: "1px solid var(--border)",
      position: "relative",
    }}>
      <div style={{
        width: 34, height: 34,
        borderRadius: isUser ? 8 : 10,
        background: isUser ? "var(--surface2)" : "var(--accent-dim)",
        border: `1.5px solid ${isUser ? "var(--border2)" : "var(--accent)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: 12, fontWeight: 600,
        color: isUser ? "var(--text-muted)" : "var(--accent)",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.05em",
      }}>
        {isUser ? "you" : "ai"}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isUser ? "var(--text-muted)" : "var(--text)" }}>
            {isUser ? "You" : "Claude"}
          </span>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)" }}>
            {fmtTime(msg.timestamp)}
          </span>
          {msg.error && (
            <span style={{
              fontSize: 11, color: "var(--red)",
              background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)",
              padding: "1px 8px", borderRadius: 20,
            }}>error</span>
          )}

          {!isStreaming && !isEditing && (
            <div className="msg-actions" style={{
              marginLeft: "auto", display: "flex", gap: 4, opacity: 0,
              transition: "opacity 0.15s",
            }}>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(msg.content).then(() => {
                    setMsgCopied(true);
                    setTimeout(() => setMsgCopied(false), 1500);
                  });
                }}
                title="Copy message"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  color: msgCopied ? "var(--green)" : "var(--text-dim)",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { if (!msgCopied) { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.color = msgCopied ? "var(--green)" : "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
              >
                {msgCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              {isUser && onEdit && (
                <button onClick={onEdit} title="Edit message" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  color: "var(--text-dim)", transition: "color 0.15s, background 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
                >
                  <Pencil size={13} />
                </button>
              )}
              {!isUser && onRegenerate && (
                <button onClick={onRegenerate} title="Regenerate response" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  color: "var(--text-dim)", transition: "color 0.15s, background 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {msg.attachments && msg.attachments.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {msg.attachments.map((att) =>
              att.type === "image" ? (
                <img
                  key={att.id}
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.name}
                  style={{ maxHeight: 80, maxWidth: 160, borderRadius: 6, border: "1px solid var(--border)", objectFit: "cover" }}
                />
              ) : (
                <span key={att.id} style={{
                  fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)",
                  padding: "2px 8px", borderRadius: 6, color: "var(--text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  📎 {att.name}
                </span>
              )
            )}
          </div>
        )}

        {isEditing ? (
          <div>
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => onEditChange?.(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSave?.(); } if (e.key === "Escape") onEditCancel?.(); }}
              style={{
                width: "100%", fontSize: 15, color: "var(--text)", lineHeight: 1.65,
                background: "var(--bg)", border: "1.5px solid var(--accent)",
                borderRadius: 8, padding: "10px 12px",
                fontFamily: "'Outfit', sans-serif", resize: "none", outline: "none",
                minHeight: 60, maxHeight: 260, overflow: "auto",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={onEditSave} style={{
                padding: "6px 14px", background: "var(--accent)", borderRadius: 6,
                color: "var(--bg)", fontWeight: 600, fontSize: 12.5,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Send size={12} />Save & send
              </button>
              <button onClick={onEditCancel} style={{
                padding: "6px 14px", border: "1px solid var(--border2)", borderRadius: 6,
                color: "var(--text-muted)", fontSize: 12.5,
              }}>Cancel</button>
            </div>
          </div>
        ) : isUser ? (
          <div style={{ fontSize: 15, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
            {msg.content}
          </div>
        ) : (
          <div
            className="md"
            style={{ fontSize: 15.5, color: "var(--text)", lineHeight: 1.78 }}
            onClick={handleCodeCopy}
            dangerouslySetInnerHTML={{
              __html: isStreaming
                ? renderMarkdown(msg.content) + '<span class="streaming-cursor"></span>'
                : renderMarkdown(msg.content),
            }}
          />
        )}
        <TokenRow msg={msg} />
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div style={{ display: "flex", gap: 14, padding: "22px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: "var(--accent-dim)", border: "1.5px solid var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>ai</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, paddingTop: 13 }}>
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}

function ApiKeyModal({ current, onSave, onClose }: { current: string; onSave: (k: string) => void; onClose: () => void }) {
  const [val, setVal] = useState(current);
  const [show, setShow] = useState(false);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20, backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "var(--text)", marginBottom: 4 }}>
              Anthropic API Key
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Stored in your browser only.</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="sk-ant-..."
            autoFocus
            style={{
              width: "100%", padding: "10px 50px 10px 12px",
              background: "var(--bg)", border: "1.5px solid var(--border2)",
              borderRadius: 8, color: "var(--text)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13, outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
          />
          <button
            onClick={() => setShow(!show)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {show ? "hide" : "show"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 18px", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-muted)", fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={() => { onSave(val.trim()); onClose(); }}
            style={{ padding: "8px 20px", background: "var(--accent)", borderRadius: 7, color: "var(--bg)", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Check size={14} />Save key
          </button>
        </div>

        <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-dim)" }}>
          Get your key at{" "}
          <a href="https://platform.anthropic.com" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>
            platform.anthropic.com
          </a>
        </p>
      </div>
    </div>
  );
}

function ImportClaudeModal({ onImport, onClose }: {
  onImport: (msgs: RawMsg[]) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoad = async () => {
    const shareMatch = url.match(/claude\.ai\/share\/([a-f0-9-]{36})/i);
    if (!shareMatch) {
      setError("Please enter a valid Claude.ai share link (e.g. https://claude.ai/share/...)");
      return;
    }
    const shareId = shareMatch[1];
    setLoading(true);
    setError("");
    try {
      const targetUrl = `https://claude.ai/share/${shareId}`;
      // Try multiple CORS proxies in order until one succeeds
      const proxies: Array<(u: string) => { url: string; extract: (r: Response) => Promise<string> }> = [
        (u) => ({
          url: `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
          extract: async (r) => { const j = await r.json() as { contents: string }; return j.contents; },
        }),
        (u) => ({
          url: `https://corsproxy.io/?${encodeURIComponent(u)}`,
          extract: (r) => r.text(),
        }),
        (u) => ({
          url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
          extract: (r) => r.text(),
        }),
      ];

      let html = "";
      let lastErr = "";
      for (const makeProxy of proxies) {
        try {
          const { url: proxyUrl, extract } = makeProxy(targetUrl);
          const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
          if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
          html = await extract(res);
          if (html) break;
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      if (!html) throw new Error(`All proxies failed (last error: ${lastErr}). The link may be private or Claude.ai changed their format.`);

      const msgs = parseClaudeSharePage(html);
      if (msgs.length === 0) throw new Error("No messages found in this conversation.");
      onImport(msgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20, backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "var(--text)", marginBottom: 4 }}>
              Import from Claude.ai
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Paste a public share link to load a conversation.</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ marginTop: 18 }}>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleLoad(); }}
            placeholder="https://claude.ai/share/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoFocus
            disabled={loading}
            style={{
              width: "100%", padding: "10px 12px",
              background: "var(--bg)", border: `1.5px solid ${error ? "var(--red)" : "var(--border2)"}`,
              borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
              opacity: loading ? 0.6 : 1, boxSizing: "border-box",
            }}
            onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--border2)"; }}
          />
          {error && (
            <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8, lineHeight: 1.5 }}>{error}</p>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 10, lineHeight: 1.5 }}>
          Fetches via public CORS proxies. Only publicly shared links work.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 18px", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-muted)", fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={() => void handleLoad()}
            disabled={loading || !url.trim()}
            style={{
              padding: "8px 20px",
              background: loading ? "var(--surface2)" : "var(--accent)",
              borderRadius: 7,
              color: loading ? "var(--text-muted)" : "var(--bg)",
              fontWeight: 600, fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
              opacity: !url.trim() ? 0.5 : 1,
            }}
          >
            {loading
              ? <><span className="dot" /><span className="dot" /><span className="dot" /></>
              : <><Link2 size={14} />Import</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  sessions: Conversation[];
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onImport: () => void;
}

function Sidebar({ sessions, activeId, collapsed, onToggle, onSelect, onNew, onDelete, onImport }: SidebarProps) {
  // Group sessions by day label
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const groups: { label: string; items: Conversation[] }[] = [];
  for (const s of sorted) {
    const label = fmtDate(s.updatedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(s);
    } else {
      groups.push({ label, items: [s] });
    }
  }

  return (
    <aside style={{
      width: collapsed ? 52 : 240,
      minWidth: collapsed ? 52 : 240,
      height: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s ease, min-width 0.2s ease",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        padding: collapsed ? "14px 0" : "14px 12px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        height: 54,
      }}>
        {!collapsed && (
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 17,
            color: "var(--text)",
            letterSpacing: "-0.2px",
            paddingLeft: 4,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <img src={faviconUrl} alt="arc" style={{ width: 20, height: 20 }} />
            ARC
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: 6,
            color: "var(--text-muted)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <div style={{ padding: collapsed ? "10px 8px" : "10px 12px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={onNew}
          title="New conversation"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            padding: collapsed ? "8px 0" : "8px 10px",
            background: "var(--accent-dim)",
            border: "1px solid rgba(88,166,255,0.3)",
            borderRadius: 8,
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 500,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
        >
          <Plus size={15} />
          {!collapsed && "New chat"}
        </button>

        <button
          onClick={onImport}
          title="Import from Claude.ai"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            padding: collapsed ? "8px 0" : "7px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-dim)",
            fontSize: 12.5,
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
        >
          <Link2 size={13} />
          {!collapsed && "Import from Claude.ai"}
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "4px 6px" : "4px 8px" }}>
        {sessions.length === 0 && !collapsed && (
          <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.6 }}>
            No conversations yet.<br />Start one above.
          </div>
        )}

        {collapsed
          ? /* Collapsed: just icon dots per session */
          sorted.slice(0, 12).map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              title={s.title}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                padding: "7px 0", borderRadius: 6, marginBottom: 2,
                background: s.id === activeId ? "var(--surface2)" : "transparent",
                color: s.id === activeId ? "var(--accent)" : "var(--text-dim)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (s.id !== activeId) e.currentTarget.style.background = "var(--surface2)"; }}
              onMouseLeave={(e) => { if (s.id !== activeId) e.currentTarget.style.background = "transparent"; }}
            >
              <MessageSquare size={14} />
            </button>
          ))
          : /* Expanded: grouped list */
          groups.map((g) => (
            <div key={g.label}>
              <div style={{
                fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "12px 8px 4px",
              }}>
                {g.label}
              </div>
              {g.items.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 8px", borderRadius: 7, marginBottom: 1,
                    background: s.id === activeId ? "var(--surface2)" : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (s.id !== activeId) e.currentTarget.style.background = "var(--surface2)";
                    const btn = e.currentTarget.querySelector<HTMLElement>(".del-btn");
                    if (btn) btn.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    if (s.id !== activeId) e.currentTarget.style.background = "transparent";
                    const btn = e.currentTarget.querySelector<HTMLElement>(".del-btn");
                    if (btn) btn.style.opacity = "0";
                  }}
                >
                  <MessageSquare
                    size={13}
                    style={{ flexShrink: 0, color: s.id === activeId ? "var(--accent)" : "var(--text-dim)" }}
                  />
                  <span style={{
                    flex: 1, fontSize: 13, lineHeight: 1.35,
                    color: s.id === activeId ? "var(--text)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {s.title}
                  </span>
                  <button
                    className="del-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    title="Delete"
                    style={{
                      opacity: 0, flexShrink: 0, display: "flex", alignItems: "center",
                      color: "var(--text-dim)", padding: 2, borderRadius: 4,
                      transition: "color 0.15s, opacity 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))
        }
      </div>
    </aside>
  );
}

export default function App({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  // Multi-session state
  const [sessions, setSessions] = useState<Conversation[]>(() => loadSessions(user.id));
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = loadActiveId(user.id);
    const all = loadSessions(user.id);
    if (saved && all.find((s) => s.id === saved)) return saved;
    return all.length > 0 ? all[0].id : "";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chat state
  const [apiKey, setApiKey] = useState(() => loadApiKey(user.id));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("arc_theme") as "dark" | "light") ?? "dark"
  );

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Attachment state
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamBuf = useRef("");
  const rafRef = useRef<number | null>(null);

  // Derived active conversation
  const activeConv = sessions.find((s) => s.id === activeId) ?? null;

  // Apply user accent color as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", user.color);
    // Derive a dim version (same hue, lower opacity)
    document.documentElement.style.setProperty("--accent-dim", user.color + "22");
    return () => {
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-dim");
    };
  }, [user.color]);

  // Sync theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("arc_theme", theme);
  }, [theme]);

  // Persist sessions whenever they change
  useEffect(() => { saveSessions(user.id, sessions); }, [sessions, user.id]);

  // Persist active id
  useEffect(() => { saveActiveId(user.id, activeId); }, [activeId, user.id]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  // Scroll helpers
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => { if (streaming || thinking) scrollToBottom(); }, [sessions, thinking, streaming, scrollToBottom]);
  useEffect(() => { scrollToBottom(); }, [activeId, activeConv?.messages.length, scrollToBottom]);

  const handleNewSession = useCallback(() => {
    const s = createNewSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setInput("");
    // abort any ongoing stream
    abortRef.current?.abort();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStreaming(false);
    setThinking(false);
    setStreamingMsgId(null);
    streamBuf.current = "";
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    if (id === activeId) return;
    abortRef.current?.abort();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStreaming(false);
    setThinking(false);
    setStreamingMsgId(null);
    streamBuf.current = "";
    setActiveId(id);
    setInput("");
  }, [activeId]);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(user.id, next);
      return next;
    });
    if (id === activeId) {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        const fallback = next[0];
        if (fallback) {
          setActiveId(fallback.id);
        } else {
          setActiveId("");
        }
        return next;
      });
    }
  }, [activeId, user.id]);

  const handleImportConversation = useCallback((msgs: RawMsg[]) => {
    const now = Date.now();
    const messages: Message[] = msgs.map((m, i) => ({
      id: uuid(),
      role: m.role,
      content: m.content,
      timestamp: now + i,
    }));
    const fresh = createNewSession();
    fresh.messages = messages;
    fresh.updatedAt = now;
    const firstUser = messages.find((m) => m.role === "user");
    fresh.title = firstUser ? deriveTitle(firstUser.content) : "Imported conversation";
    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setShowImport(false);
  }, []);

  const handleSaveKey = useCallback((key: string) => {
    setApiKey(key); saveApiKey(user.id, key);
  }, [user.id]);

  const handleLogout = useCallback(() => {
    abortRef.current?.abort();
    logout();
    onLogout();
  }, [onLogout]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamBuf.current && activeId && streamingMsgId) {
      const finalContent = streamBuf.current + " *(stopped)*";
      const stoppedId = streamingMsgId;
      setSessions((prev) => prev.map((s) =>
        s.id === activeId
          ? { ...s, messages: s.messages.map((m) => m.id === stoppedId ? { ...m, content: finalContent } : m), updatedAt: Date.now() }
          : s
      ));
    }
    setStreaming(false);
    setThinking(false);
    setStreamingMsgId(null);
    streamBuf.current = "";
  }, [activeId, streamingMsgId]);

  const startStream = useCallback(async (sessionId: string, messages: Message[]) => {
    if (!apiKey) { setShowKeyModal(true); return; }

    const streamMsgId = uuid();
    let msgAdded = false;

    setThinking(true);
    setStreaming(true);
    streamBuf.current = "";

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    await streamChat(messages, apiKey, {
      onChunk: (chunk) => {
        if (ctrl.signal.aborted) return;
        streamBuf.current += chunk;

        if (!msgAdded) {
          // First chunk: insert the message into the session
          msgAdded = true;
          setSessions((prev) => prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, { id: streamMsgId, role: "assistant" as const, content: streamBuf.current, timestamp: Date.now() }], updatedAt: Date.now() }
              : s
          ));
          setStreamingMsgId(streamMsgId);
          setThinking(false);
        } else if (rafRef.current === null) {
          // Subsequent chunks: throttle updates to rAF (~60fps)
          rafRef.current = requestAnimationFrame(() => {
            const content = streamBuf.current;
            setSessions((prev) => prev.map((s) =>
              s.id === sessionId
                ? { ...s, messages: s.messages.map((m) => m.id === streamMsgId ? { ...m, content } : m) }
                : s
            ));
            rafRef.current = null;
          });
        }
      },
      onDone: (tokens) => {
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        const finalContent = streamBuf.current;
        setSessions((prev) => prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: s.messages.map((m) => m.id === streamMsgId ? { ...m, content: finalContent, tokens } : m), updatedAt: Date.now() }
            : s
        ));
        setStreaming(false);
        setThinking(false);
        setStreamingMsgId(null);
        streamBuf.current = "";
        textareaRef.current?.focus();
      },
      onError: (err) => {
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        if (msgAdded) {
          setSessions((prev) => prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: s.messages.map((m) => m.id === streamMsgId ? { ...m, content: err, error: true } : m), updatedAt: Date.now() }
              : s
          ));
        } else {
          const errMsg: Message = { id: streamMsgId, role: "assistant", content: err, timestamp: Date.now(), error: true };
          setSessions((prev) => prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() }
              : s
          ));
        }
        setStreaming(false);
        setThinking(false);
        setStreamingMsgId(null);
        streamBuf.current = "";
      },
    }, ctrl.signal, model);
  }, [apiKey, model]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    if (!apiKey) { setShowKeyModal(true); return; }

    let sessionId = activeId;
    if (!sessionId || !sessions.find((s) => s.id === sessionId)) {
      const fresh = createNewSession();
      setSessions((prev) => [fresh, ...prev]);
      setActiveId(fresh.id);
      sessionId = fresh.id;
    }

    const currentSession = sessions.find((s) => s.id === sessionId);
    const prevMessages = currentSession?.messages ?? [];

    const userMsg: Message = {
      id: uuid(), role: "user",
      content: text,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const allMessages = [...prevMessages, userMsg];

    const isFirstMessage = prevMessages.length === 0;
    setSessions((prev) => prev.map((s) =>
      s.id === sessionId
        ? {
          ...s,
          messages: allMessages,
          updatedAt: Date.now(),
          title: isFirstMessage ? deriveTitle(text) : s.title,
        }
        : s
    ));

    setInput("");
    setAttachments([]);
    await startStream(sessionId, allMessages);
  }, [input, streaming, apiKey, activeId, sessions, attachments, startStream]);

  const handleStartEdit = useCallback((msgId: string) => {
    if (streaming) return;
    const conv = sessions.find((s) => s.id === activeId);
    const msg = conv?.messages.find((m) => m.id === msgId);
    if (!msg) return;
    setEditingMsgId(msgId);
    setEditText(msg.content);
  }, [streaming, sessions, activeId]);

  const handleEditSave = useCallback(async () => {
    if (!editingMsgId || !editText.trim() || streaming) return;

    const conv = sessions.find((s) => s.id === activeId);
    if (!conv) return;

    const msgIndex = conv.messages.findIndex((m) => m.id === editingMsgId);
    if (msgIndex === -1) return;

    const editedMsg: Message = {
      ...conv.messages[msgIndex],
      content: editText.trim(),
      timestamp: Date.now(),
    };
    const newMessages = [...conv.messages.slice(0, msgIndex), editedMsg];

    setSessions((prev) => prev.map((s) =>
      s.id === activeId
        ? { ...s, messages: newMessages, updatedAt: Date.now() }
        : s
    ));

    setEditingMsgId(null);
    setEditText("");
    await startStream(activeId, newMessages);
  }, [editingMsgId, editText, streaming, activeId, sessions, startStream]);

  const handleEditCancel = useCallback(() => {
    setEditingMsgId(null);
    setEditText("");
  }, []);

  const handleRegenerate = useCallback(async (msgId: string) => {
    if (streaming) return;

    const conv = sessions.find((s) => s.id === activeId);
    if (!conv) return;

    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const newMessages = conv.messages.slice(0, msgIndex);

    setSessions((prev) => prev.map((s) =>
      s.id === activeId
        ? { ...s, messages: newMessages, updatedAt: Date.now() }
        : s
    ));

    await startStream(activeId, newMessages);
  }, [streaming, activeId, sessions, startStream]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Claude vision only accepts these four types
    const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

    // Normalize non-standard aliases so the API never rejects them
    function normalizeImageMime(raw: string): string {
      if (raw === "image/jpg") return "image/jpeg";  // non-standard alias
      if (raw === "image/jfif") return "image/jpeg";
      if (raw === "image/pjpeg") return "image/jpeg";
      return raw;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) return; // skip > 2 MB

      const mime = normalizeImageMime(file.type);
      const isImage = SUPPORTED_IMAGE_TYPES.has(mime);
      const reader = new FileReader();

      if (isImage) {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          setAttachments((prev) => [...prev, {
            id: uuid(), name: file.name, type: "image",
            data: base64, mimeType: mime, size: file.size,
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        // Unsupported image types (SVG, BMP, TIFF, AVIF, WebP-animated…)
        // and all text files are sent as inline text content
        reader.onload = () => {
          setAttachments((prev) => [...prev, {
            id: uuid(), name: file.name, type: "text",
            data: reader.result as string,
            mimeType: file.type || "text/plain", size: file.size,
          }]);
        };
        reader.readAsText(file);
      }
    });

    e.target.value = "";
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const hasMessages = (activeConv?.messages.length ?? 0) > 0;
  const hasCacheHits = activeConv?.messages.some((m) => (m.tokens?.cacheRead ?? 0) > 0) ?? false;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onSelect={handleSelectSession}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
        onImport={() => setShowImport(true)}
      />
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", minWidth: 0,
      }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 54,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{
              fontSize: 14, color: "var(--text)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 340,
            }}>
              {activeConv?.title ?? "ARC"}
            </span>
            <select
              value={model}
              onChange={(e) => {
                if (e.target.value.includes("sonnet")) {
                  if (!confirm("Use Sonnet for intensive tasks. (more powerful than Haiku)")) return;
                }
                setModel(e.target.value)
              }}
              disabled={streaming}
              style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-dim)", background: "var(--surface2)",
                border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4,
                flexShrink: 0, cursor: streaming ? "not-allowed" : "pointer",
                outline: "none", appearance: "none",
              }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {hasCacheHits && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--green)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                <Zap size={11} />caching
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button
              onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 7,
                border: "1px solid var(--border)", color: "var(--text-muted)",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={() => setShowKeyModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px",
                border: `1px solid ${apiKey ? "var(--border)" : "var(--accent)"}`,
                borderRadius: 7,
                color: apiKey ? "var(--text-muted)" : "var(--accent)",
                fontSize: 12.5,
                background: apiKey ? "none" : "var(--accent-dim)",
              }}
            >
              <Key size={13} />
              {apiKey ? "Key set" : "Add key"}
            </button>

            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "4px 10px 4px 6px",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 16 }}>{user.emoji}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{user.username}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, borderRadius: 7,
                color: "var(--text-dim)", transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "rgba(248,81,73,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: "auto", position: "relative" }}
        >
          {!hasMessages ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: "100%", gap: 16, paddingBottom: 60, padding: "0 24px 60px",
            }}>
              <img src={faviconUrl} alt="arc" style={{ width: 48, height: 48 }} />
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "var(--text)", marginBottom: 8 }}>
                  Hello, {user.username} {user.emoji}
                </h2>
                <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 300 }}>
                  {apiKey ? "Ask anything. Chats are saved automatically." : "Add your Anthropic API key to begin."}
                </p>
              </div>

              {apiKey && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, width: "100%", maxWidth: 460 }}>
                  {[
                    "Why is my code running at the speed of a tired sloth? 🦥",
                    "Roast my project idea and then help me fix it 🔥",
                    "I have 3 hours to learn .NET — what's the move? ⚡",
                    "Write me a React hook so clean it makes me cry 😭",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      style={{
                        padding: "11px 14px", background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 8, color: "var(--text-muted)", fontSize: 13, textAlign: "left", lineHeight: 1.4,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >{s}</button>
                  ))}
                </div>
              )}

              {!apiKey && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  style={{ padding: "10px 24px", background: "var(--accent)", borderRadius: 8, color: "var(--bg)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Key size={15} />Configure API key
                </button>
              )}
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: "0 auto", padding: "4px 24px 0" }}>
              {activeConv!.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isStreaming={msg.id === streamingMsgId}
                  onEdit={msg.role === "user" && msg.id !== streamingMsgId ? () => handleStartEdit(msg.id) : undefined}
                  onRegenerate={msg.role === "assistant" && msg.id !== streamingMsgId ? () => void handleRegenerate(msg.id) : undefined}
                  isEditing={editingMsgId === msg.id}
                  editText={editingMsgId === msg.id ? editText : undefined}
                  onEditChange={setEditText}
                  onEditSave={() => void handleEditSave()}
                  onEditCancel={handleEditCancel}
                />
              ))}
              {thinking && <Thinking />}
            </div>
          )}

          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              style={{
                position: "fixed", bottom: 110, left: "50%", transform: "translateX(-50%)",
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: 20, color: "var(--text-muted)", fontSize: 12, zIndex: 10, boxShadow: "var(--shadow)",
              }}
            >
              <ChevronDown size={14} />Scroll to bottom
            </button>
          )}

          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "12px 24px 18px", flexShrink: 0 }}>
          <div
            style={{
              maxWidth: 760, margin: "0 auto",
              background: "var(--surface)", border: "1.5px solid var(--border2)",
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
          >
            {attachments.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 12px 0" }}>
                {attachments.map((att) => (
                  <span key={att.id} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)",
                    padding: "3px 8px 3px 10px", borderRadius: 6,
                    color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {att.type === "image" ? "🖼" : "📎"} {att.name}
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      style={{ display: "flex", color: "var(--text-dim)", padding: 1, borderRadius: 3 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", padding: "10px 12px" }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
                accept="image/*,.txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.css,.html,.yml,.yaml,.xml,.csv,.sql,.sh,.rs,.go,.java,.c,.cpp,.h,.rb,.php,.swift,.kt,.r,.lua,.pl,.ex,.exs,.hs,.scala,.dart,.vue,.svelte,.toml,.ini,.cfg,.env,.log"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach files (max 2 MB each)"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  color: "var(--text-dim)", transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
              >
                <Paperclip size={16} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? "Claude is responding…" : "Message Claude  (Enter ↵ to send, Shift+Enter for newline)"}
                disabled={streaming}
                rows={1}
                style={{ flex: 1, minHeight: 26, maxHeight: 160, overflow: "auto" }}
              />
              <button
                onClick={streaming ? handleStop : () => void handleSend()}
                disabled={!streaming && !input.trim() && attachments.length === 0}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: streaming ? "rgba(248,81,73,0.15)" : "var(--accent)",
                  border: streaming ? "1px solid var(--red)" : "none",
                  color: streaming ? "var(--red)" : "var(--bg)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  opacity: !streaming && !input.trim() && attachments.length === 0 ? 0.35 : 1,
                  transition: "opacity 0.15s, background 0.15s",
                }}
              >
                {streaming ? <Square size={14} fill="var(--red)" /> : <Send size={15} />}
              </button>
            </div>
          </div>

          <div style={{
            textAlign: "center", marginTop: 7,
            fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)",
          }}>
            claude-{model.replace("claude-", "")} · prompt caching · {activeConv?.messages.length ?? 0} msg{(activeConv?.messages.length ?? 0) !== 1 ? "s" : ""} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {showKeyModal && (
        <ApiKeyModal current={apiKey} onSave={handleSaveKey} onClose={() => setShowKeyModal(false)} />
      )}
      {showImport && (
        <ImportClaudeModal onImport={handleImportConversation} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
