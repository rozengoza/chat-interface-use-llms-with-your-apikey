import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
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
  Download,
  Eye,
  Settings,
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
  loadTokenSettings,
  saveTokenSettings,
  loadSessionMessages,
  updateChatTitle,
  deleteChat,
  loadProviders,
  type TokenSettings,
  type ProviderInfo,
} from "./store";
import { streamChat, MODELS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "./api";
import faviconUrl from "./assets/favicon.svg";
import "./index.css";
import gsap from "gsap";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();

// SVG icons used in code-block buttons (referenced in renderer + click handler)
const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const DOWNLOAD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const EYE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;

// Language → file extension map for downloads
const LANG_EXT: Record<string, string> = {
  javascript: "js", typescript: "ts", tsx: "tsx", jsx: "jsx",
  python: "py", bash: "sh", shell: "sh", sh: "sh", zsh: "sh",
  html: "html", css: "css", json: "json", yaml: "yml", yml: "yml",
  markdown: "md", md: "md", sql: "sql", rust: "rs", go: "go",
  java: "java", cpp: "cpp", c: "c", cs: "cs", php: "php",
  ruby: "rb", swift: "swift", kotlin: "kt", dart: "dart",
  svg: "svg", xml: "xml", toml: "toml", ini: "ini",
};

// Languages that can be visually previewed in an iframe
const PREVIEWABLE = new Set(["html", "svg"]);

// Fix incomplete fenced code blocks during streaming so marked doesn't
// break out of the code block and render the rest as plain text.
function closeUnclosedFences(text: string): string {
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^`{3,}/.test(line)) inFence = !inFence;
  }
  return inFence ? text + "\n```" : text;
}

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(text, { language: lang }).value
      : hljs.highlightAuto(text).value;
  const langLabel = (lang || "text").toLowerCase();
  const canPreview = PREVIEWABLE.has(langLabel);
  const actionBtns = [
    canPreview ? `<button class="code-action-btn preview-code-btn" title="Preview">${EYE_SVG}</button>` : "",
    `<button class="code-action-btn download-code-btn" title="Download">${DOWNLOAD_SVG}</button>`,
    `<button class="code-action-btn copy-code-btn" title="Copy">${COPY_SVG}</button>`,
  ].join("");
  return `<div class="code-block" data-lang="${langLabel}"><div class="code-header"><span>${langLabel}</span><div class="code-header-actions">${actionBtns}</div></div><pre><code class="hljs">${highlighted}</code></pre></div>`;
};
renderer.link = ({ href, text }: { href: string; text: string }) => {
  const safe = /^https?:\/\//i.test(href ?? "") ? href : "#";
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { renderer }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target", "rel"],
    FORCE_BODY: true,
  });
}

function isLikelyMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /(^|\n)#{1,6}\s|\n```|^[-*+]\s+/m.test(text);
}

function inferFilenameFromMarkdown(md: string): string | null {
  if (!md) return null;
  const m = md.match(/(^|\n)#\s*(.+)/);
  if (m && m[2]) {
    const slug = m[2]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    if (slug) return `${slug}.md`;
  }
  return null;
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

  const keyRe = /"chat_messages"\s*:\s*\[/g;
  let km: RegExpExecArray | null;
  while ((km = keyRe.exec(html)) !== null) {
    try {
      const start = km.index + km[0].length - 1;
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
    } catch { /* keep going */ }
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

function inferFilename(block: HTMLElement, lang: string): string {
  const ext = LANG_EXT[lang] ?? lang;
  const rawCode = block.querySelector("code")?.textContent ?? "";
  const firstLine = rawCode.split("\n")[0].trim();
  const m = firstLine.match(/^(?:\/\/|#|<!--|\{?\/\*)\s*([\w][\w\-. ]*\.\w{1,10})/);
  if (m) {
    const candidate = m[1].trim();
    if (/\.[a-z0-9]+$/i.test(candidate)) return candidate;
  }
  let el: Element | null = block;
  while ((el = el.previousElementSibling)) {
    if (/^H[1-4]$/.test(el.tagName)) {
      const slug = (el.textContent ?? "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 48);
      if (slug) return `${slug}.${ext}`;
      break;
    }
  }
  return `code.${ext}`;
}

function handleCodeCopy(e: React.MouseEvent<HTMLDivElement>) {
  const copyBtn = (e.target as Element).closest<HTMLElement>(".copy-code-btn");
  if (copyBtn) {
    const code = copyBtn.closest(".code-block")?.querySelector("code")?.textContent ?? "";
    void navigator.clipboard.writeText(code).then(() => {
      copyBtn.innerHTML = CHECK_SVG;
      copyBtn.style.color = "var(--green)";
      setTimeout(() => { copyBtn.innerHTML = COPY_SVG; copyBtn.style.color = ""; }, 1500);
    });
    return;
  }
  const dlBtn = (e.target as Element).closest<HTMLElement>(".download-code-btn");
  if (dlBtn) {
    const block = dlBtn.closest<HTMLElement>(".code-block");
    if (!block) return;
    const code = block.querySelector("code")?.textContent ?? "";
    const lang = block.dataset.lang ?? "text";
    const filename = inferFilename(block, lang);
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return;
  }
}

function MessageBubble({
  msg, isStreaming, onEdit, onRegenerate,
  isEditing, editText, onEditChange, onEditSave, onEditCancel, onCodePreview,
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
  onCodePreview?: (code: string, lang: string, filename: string) => void;
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
              {!isUser && isLikelyMarkdown(msg.content) && (
                <button
                  onClick={() => {
                    const name = inferFilenameFromMarkdown(msg.content) ?? "message.md";
                    const blob = new Blob([msg.content], { type: "text/markdown;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = name; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  title="Download Markdown"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, color: "var(--text-dim)" }}
                >
                  <Download size={13} />
                </button>
              )}
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
            onClick={(e) => {
              handleCodeCopy(e);
              const pvBtn = (e.target as Element).closest<HTMLElement>(".preview-code-btn");
              if (pvBtn) {
                const block = pvBtn.closest<HTMLElement>(".code-block");
                const code = block?.querySelector("code")?.textContent ?? "";
                const lang = block?.dataset.lang ?? "html";
                const filename = block ? inferFilename(block, lang) : `code.${LANG_EXT[lang] ?? lang}`;
                onCodePreview?.(code, lang, filename);
              }
            }}
            dangerouslySetInnerHTML={{
              __html: (() => {
                const base = isStreaming ? renderMarkdown(closeUnclosedFences(msg.content)) : renderMarkdown(msg.content);
                if (!isStreaming) return base;
                const needle = "</code></pre>";
                const idx = base.lastIndexOf(needle);
                if (idx !== -1) {
                  return base.slice(0, idx) + '<span class="streaming-cursor"></span>' + base.slice(idx);
                }
                return base + '<span class="streaming-cursor"></span>';
              })(),
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

function ArcLogo() {
  const lettersRef = useRef<HTMLSpanElement[]>([]);
  const shadowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const els = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    if (!els.length) return;

    let shadow = shadowRef.current;
    if (!shadow) {
      shadow = document.createElement('div');
      shadow.className = 'arc-logo__shadow';
      document.body.appendChild(shadow);
      shadowRef.current = shadow;
    }

    gsap.set(els, { transformOrigin: "bottom center" });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.22 });
    let repeats = 0;

    tl.fromTo(
        els,
        { scaleY: 0.60, scaleX: 1.30 },
        { scaleY: 1.20, scaleX: 0.85, duration: 0.10, ease: "power3.out" },
        0
      )
      .to(els, { y: -22, duration: 0.42, ease: "power2.out" }, 0)
      .to(els, { scaleY: 1, scaleX: 1, duration: 0.30, ease: "power1.inOut" }, 0.10)
      .to(els, { y: 6, duration: 0.40, ease: "power2.in" }, 0.46)
      .to(els, { scaleY: 1.08, scaleX: 0.94, duration: 0.28, ease: "power1.in" }, 0.46)
      .to(els, { scaleY: 0.60, scaleX: 1.30, duration: 0.08, ease: "power4.out" }, 0.78);

    if (shadow) {
      const containerRect = els[0].parentElement?.getBoundingClientRect() ?? els[0].getBoundingClientRect();
      const centerX = Math.round(containerRect.left + containerRect.width / 2);
      const impactY = Math.round(containerRect.bottom + 8);
      shadow.style.position = 'fixed';
      shadow.style.left = `${centerX}px`;
      shadow.style.top = `${impactY}px`;
      shadow.style.width = `${Math.round(containerRect.width)}px`;
      shadow.style.transform = 'translateX(-50%) translateY(0)';

      gsap.set(shadow, { x: 0, y: 0, scaleX: 0.6, opacity: 0.06, transformOrigin: 'center center' });

      tl.to(shadow, { scaleX: 0.45, opacity: 0.04, y: -8, duration: 0.42, ease: 'power1.out' }, 0);
      tl.to(shadow, { scaleX: 0.9, opacity: 0.14, y: 0, duration: 0.40, ease: 'power1.in' }, 0.46);
      tl.to(shadow, { scaleX: 1.25, opacity: 0.28, y: 0, duration: 0.08, ease: 'power4.out' }, 0.78);
      tl.to(shadow, { scaleX: 0.6, opacity: 0.08, y: -2, duration: 0.22, ease: 'power2.out' }, 0.86);
    }

    tl.eventCallback("onRepeat", () => {
      repeats += 1;
      if (repeats === 2) triggerFaviconSequence(els);
    });

    return () => {
      tl.kill();
      if (shadowRef.current) {
        shadowRef.current.remove();
        shadowRef.current = null;
      }
    };
  }, []);

  return (
    <div className="arc-logo">
      {["A", "R", "C"].map((letter, i) => (
        <span
          key={letter}
          ref={(el) => { lettersRef.current[i] = el as HTMLSpanElement; }}
          className={`arc-logo__letter arc-logo__letter--${letter}`}
          aria-hidden={false}
          title={letter}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

function triggerFaviconSequence(els: HTMLSpanElement[]) {
  try {
    const rect = els[0]?.getBoundingClientRect();
    const container = document.createElement("div");
    container.className = "arc-fav-sparkles";
    document.body.appendChild(container);

    const colors = ["#7FFFD4", "#B5CC18", "#7FFFD4"];
    const dots: HTMLSpanElement[] = [];
    for (let i = 0; i < 9; i++) {
      const d = document.createElement("span");
      d.className = "arc-fav-dot";
      d.style.background = colors[i % colors.length];
      container.appendChild(d);
      dots.push(d);
    }

    if (rect) {
      container.style.left = Math.round(rect.left + rect.width / 2) + "px";
      container.style.top = Math.round(rect.top + rect.height / 2) + "px";
    }

    gsap.to(els, { scaleX: 1.06, scaleY: 0.94, duration: 0.08, yoyo: true, repeat: 3, ease: "sine.inOut" });

    const shadow = document.querySelector('.arc-logo__shadow') as HTMLDivElement | null;
    if (shadow) gsap.set(shadow, { scaleX: 0.6, opacity: 0.08, transformOrigin: 'center center' });

    dots.forEach((dot, i) => {
      const angle = (i / dots.length) * Math.PI * 2 + gsap.utils.random(-0.4, 0.4);
      const dist = 26 + i * 4 + gsap.utils.random(-6, 6);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      gsap.fromTo(dot, { x: 0, y: 0, opacity: 0 }, { x: dx, y: dy, opacity: 1, duration: 0.6, ease: "power2.out" });
      gsap.to(dot, { scale: 0.3, opacity: 0, duration: 0.6, delay: 0.35, ease: "power1.in", onComplete: () => { dot.remove(); } });
    });

    gsap.to(container, { opacity: 0, delay: 1.0, duration: 0.3, onComplete: () => { container.remove(); createFavicon(); } });
  } catch {
    createFavicon();
  }
}

function createFavicon() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='64' height='64'>
    <defs>
      <linearGradient id='gA' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#7FFFD4'/><stop offset='40%' stop-color='#48D1CC'/><stop offset='100%' stop-color='#20B2AA'/>
      </linearGradient>
      <linearGradient id='gR' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#E8F5A3'/><stop offset='40%' stop-color='#B5CC18'/><stop offset='100%' stop-color='#8DB600'/>
      </linearGradient>
      <linearGradient id='gC' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#7FFFD4'/><stop offset='100%' stop-color='#B5CC18'/>
      </linearGradient>
    </defs>
    <rect width='64' height='64' rx='12' fill='#0D1F1E'/>
    <text x='8' y='44' font-family='Instrument Serif, serif' font-size='36' font-weight='600' fill='url(#gA)'>A</text>
    <text x='24' y='44' font-family='Instrument Serif, serif' font-size='36' font-weight='600' fill='url(#gR)'>R</text>
    <text x='42' y='44' font-family='Instrument Serif, serif' font-size='36' font-weight='600' fill='url(#gC)'>C</text>
  </svg>`;

  try {
    const b64 = btoa(unescape(encodeURIComponent(svg)));
    const url = `data:image/svg+xml;base64,${b64}`;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = url;
  } catch {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = url;
  }
}

// ── ApiKeyModal ──────────────────────────────────────────────────────────────
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
              API Key
            </h2>
            {/* CHANGE 13 — updated description */}
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              For premium models only. Free-tier models (marked ✦) need no key.
              Never sent to our servers — held in memory only.
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="sk-ant-... / sk-... / AIza..."
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
          <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-muted)", fontSize: 13 }}>Cancel</button>
          <button
            onClick={() => { onSave(val.trim()); onClose(); }}
            style={{ padding: "8px 20px", background: "var(--accent)", borderRadius: 7, color: "var(--bg)", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Check size={14} />Save key
          </button>
        </div>

        <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-dim)" }}>
          Anthropic keys at{" "}
          <a href="https://platform.anthropic.com" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>platform.anthropic.com</a>
          {" · "}OpenAI at{" "}
          <a href="https://platform.openai.com" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>platform.openai.com</a>
        </p>
      </div>
    </div>
  );
}

// ── ImportClaudeModal ────────────────────────────────────────────────────────
function ImportClaudeModal({ onImport, onClose }: { onImport: (msgs: RawMsg[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"json" | "link">("json");
  const [jsonText, setJsonText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleJsonImport() {
    setError("");
    if (!jsonText.trim()) { setError("Paste or upload exported JSON first."); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = JSON.parse(jsonText) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function looksLikeMsgArray(arr: any[]): boolean {
        if (arr.length === 0) return false;
        const first = arr[0];
        if (typeof first !== "object" || first === null) return false;
        if (first.sender || first.role || first.content || first.text) return true;
        if (typeof first.user === "string" || typeof first.assistant === "string") return true;
        return false;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function findMsgArray(o: any, depth = 0): any[] | null {
        if (depth > 6 || !o || typeof o !== "object") return null;
        if (Array.isArray(o)) {
          if (looksLikeMsgArray(o)) return o;
          for (const item of o) { const found = findMsgArray(item, depth + 1); if (found) return found; }
          return null;
        }
        for (const key of ["chat_messages", "messages", "conversation"]) {
          if (Array.isArray(o[key])) { const found = findMsgArray(o[key], depth + 1); if (found) return found; }
        }
        for (const key of Object.keys(o)) { const found = findMsgArray(o[key], depth + 1); if (found) return found; }
        return null;
      }
      const arr = findMsgArray(obj);
      if (!arr) throw new Error("Could not find a messages array in the JSON.");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function extractText(v: any): string {
        if (typeof v === "string") return v;
        if (Array.isArray(v)) return v.map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? "")).join("\n");
        return "";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgs: RawMsg[] = arr.flatMap((m: any): RawMsg[] => {
        if (typeof m.user === "string" || typeof m.assistant === "string") {
          const out: RawMsg[] = [];
          if (m.user?.trim()) out.push({ role: "user", content: m.user });
          if (m.assistant?.trim()) out.push({ role: "assistant", content: m.assistant });
          return out;
        }
        const role: "user" | "assistant" | null =
          m.sender === "human" || m.role === "user" ? "user"
            : m.sender === "assistant" || m.role === "assistant" ? "assistant"
              : null;
        if (!role) return [];
        const text = extractText(m.text ?? m.content ?? "");
        if (!text.trim()) return [];
        return [{ role, content: text }];
      });
      if (msgs.length === 0) throw new Error("No messages found.");
      onImport(msgs);
    } catch (e) { setError(e instanceof Error ? e.message : "Invalid JSON"); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setJsonText(await f.text()); setError(""); } catch { setError("Failed to read file."); }
  }

  const handleLinkLoad = async () => {
    const shareMatch = url.match(/claude\.ai\/share\/([a-f0-9-]{36})/i);
    if (!shareMatch) { setError("Please enter a valid Claude.ai share link."); return; }
    const shareId = shareMatch[1];
    setLoading(true); setError("");
    try {
      const targetUrl = `https://claude.ai/share/${shareId}`;
      const proxies: Array<(u: string) => { url: string; extract: (r: Response) => Promise<string> }> = [
        (u) => ({ url: `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, extract: async (r) => { const j = await r.json() as { contents: string }; return j.contents; } }),
        (u) => ({ url: `https://corsproxy.io/?${encodeURIComponent(u)}`, extract: (r) => r.text() }),
      ];
      let html = "";
      for (const makeProxy of proxies) {
        try { const { url: pu, extract } = makeProxy(targetUrl); const res = await fetch(pu, { signal: AbortSignal.timeout(12_000) }); if (res.ok) { html = await extract(res); if (html) break; } } catch { /* try next */ }
      }
      if (!html || html.includes("claude.ai/login") || html.includes("Think fast") || html.includes("Continue with Google")) {
        throw new Error("Claude.ai requires login to view shared conversations. Use JSON export instead.");
      }
      const msgs = parseClaudeSharePage(html);
      if (msgs.length === 0) throw new Error("No messages found.");
      onImport(msgs);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load conversation."); }
    finally { setLoading(false); }
  };

  const tabBtn = (id: typeof tab, label: string) => (
    <button type="button" onClick={() => { setTab(id); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 13, fontWeight: 500, background: tab === id ? "var(--surface2)" : "transparent", color: tab === id ? "var(--text)" : "var(--text-muted)", border: tab === id ? "1px solid var(--border2)" : "1px solid transparent", transition: "all 0.15s" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20, backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "var(--text)", marginBottom: 4 }}>Import conversation</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Bring a Claude.ai conversation into ARC.</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", background: "var(--bg)", borderRadius: 8, padding: 3, marginBottom: 20, gap: 2 }}>
          {tabBtn("json", "📄  JSON export  (recommended)")}
          {tabBtn("link", "🔗  Share link")}
        </div>
        {tab === "json" ? (
          <>
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>How to export from Claude.ai:</p>
              <ol style={{ listStyle: "decimal", paddingLeft: 18, margin: 0, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.8 }}>
                <li>Go to <a href="https://claude.ai/settings" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>claude.ai/settings</a></li>
                <li>Click <strong style={{ color: "var(--text)" }}>Data export</strong> and request your data</li>
                <li>Download the ZIP and find <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>conversations.json</code></li>
                <li>Upload or paste it below</li>
              </ol>
            </div>
            <textarea value={jsonText} onChange={(e) => { setJsonText(e.target.value); setError(""); }} placeholder="Paste conversations.json content here…" rows={6} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${error ? "var(--red)" : "var(--border2)"}`, background: "var(--bg)", color: "var(--text)", fontSize: 12.5, boxSizing: "border-box", fontFamily: "'JetBrains Mono', monospace", resize: "vertical" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => void handleFileUpload(e)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: "7px 14px", border: "1px solid var(--border2)", borderRadius: 7, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Download size={13} /> Upload .json file</button>
              {jsonText && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ {Math.round(jsonText.length / 1024)} KB loaded</span>}
            </div>
            {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 10, lineHeight: 1.5 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-muted)", fontSize: 13 }}>Cancel</button>
              <button onClick={handleJsonImport} disabled={!jsonText.trim()} style={{ padding: "8px 20px", background: "var(--accent)", borderRadius: 7, color: "var(--bg)", fontWeight: 600, fontSize: 13, opacity: jsonText.trim() ? 1 : 0.45 }}>Import</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.25)", borderRadius: 9, padding: "10px 14px", marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>Claude.ai requires login to view shared conversations. <button type="button" onClick={() => setTab("json")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: 12.5 }}>Use JSON export instead.</button></p>
            </div>
            <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") void handleLinkLoad(); }} placeholder="https://claude.ai/share/..." autoFocus disabled={loading} style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: `1.5px solid ${error ? "var(--red)" : "var(--border2)"}`, borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'JetBrains Mono', monospace", opacity: loading ? 0.6 : 1, boxSizing: "border-box" }} onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--accent)"; }} onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--border2)"; }} />
            {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8, lineHeight: 1.5 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-muted)", fontSize: 13 }}>Cancel</button>
              <button onClick={() => void handleLinkLoad()} disabled={loading || !url.trim()} style={{ padding: "8px 20px", background: loading ? "var(--surface2)" : "var(--accent)", borderRadius: 7, color: loading ? "var(--text-muted)" : "var(--bg)", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, opacity: !url.trim() ? 0.5 : 1 }}>
                {loading ? <><span className="dot" /><span className="dot" /><span className="dot" /></> : <><Link2 size={14} />Try import</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  sessions: Conversation[];
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onImport: () => void;
  onRename: (id: string, newTitle: string) => void;
}

function Sidebar({ sessions, activeId, collapsed, onToggle, onSelect, onNew, onDelete, onImport, onRename }: SidebarProps) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups: { label: string; items: Conversation[] }[] = [];
  for (const s of sorted) {
    const label = fmtDate(s.updatedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  }

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startRename(id: string, title: string) {
    setRenamingId(id);
    setRenameText(title);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitRename(id: string, fallbackTitle: string) {
    onRename(id, renameText.trim() || fallbackTitle);
    setRenamingId(null);
  }

  function requestDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmDeleteId(null);
      onDelete(id);
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmDeleteId(id);
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  return (
    <aside style={{ width: collapsed ? 52 : 240, minWidth: collapsed ? 52 : 240, height: "100vh", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "width 0.2s ease, min-width 0.2s ease", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? "14px 0" : "14px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, height: 54 }}>
        {!collapsed && <ArcLogo />}
        <button onClick={onToggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, color: "var(--text-muted)", transition: "background 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <div style={{ padding: collapsed ? "10px 8px" : "10px 12px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={onNew} title="New conversation (Ctrl+Shift+N)" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8, padding: collapsed ? "8px 0" : "8px 10px", background: "var(--accent-dim)", border: "1px solid rgba(88,166,255,0.3)", borderRadius: 8, color: "var(--accent)", fontSize: 13, fontWeight: 500, transition: "background 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}>
          <Plus size={15} />{!collapsed && "New chat"}
        </button>
        <button onClick={onImport} title="Import from Claude.ai" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8, padding: collapsed ? "8px 0" : "7px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-dim)", fontSize: 12.5, transition: "background 0.15s, color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}>
          <Link2 size={13} />{!collapsed && "Import from Claude.ai"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "4px 6px" : "4px 8px" }}>
        {sessions.length === 0 && !collapsed && (
          <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.6 }}>No conversations yet.<br />Start one above.</div>
        )}
        {collapsed
          ? sorted.slice(0, 12).map((s) => (
            <button key={s.id} onClick={() => onSelect(s.id)} title={s.title} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px 0", borderRadius: 6, marginBottom: 2, background: s.id === activeId ? "var(--surface2)" : "transparent", color: s.id === activeId ? "var(--accent)" : "var(--text-dim)", transition: "background 0.15s" }} onMouseEnter={(e) => { if (s.id !== activeId) e.currentTarget.style.background = "var(--surface2)"; }} onMouseLeave={(e) => { if (s.id !== activeId) e.currentTarget.style.background = "transparent"; }}>
              <MessageSquare size={14} />
            </button>
          ))
          : groups.map((g) => (
            <div key={g.label}>
              <div style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 8px 4px" }}>{g.label}</div>
              {g.items.map((s) => (
                <div key={s.id} onClick={() => renamingId !== s.id && onSelect(s.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, marginBottom: 1, background: s.id === activeId ? "var(--surface2)" : "transparent", cursor: renamingId === s.id ? "default" : "pointer", transition: "background 0.15s", position: "relative" }}
                  onMouseEnter={(e) => { if (s.id !== activeId) e.currentTarget.style.background = "var(--surface2)"; const btns = e.currentTarget.querySelector<HTMLElement>(".item-actions"); if (btns) btns.style.opacity = "1"; }}
                  onMouseLeave={(e) => { if (s.id !== activeId) e.currentTarget.style.background = "transparent"; const btns = e.currentTarget.querySelector<HTMLElement>(".item-actions"); if (btns) btns.style.opacity = "0"; }}
                >
                  <MessageSquare size={13} style={{ flexShrink: 0, color: s.id === activeId ? "var(--accent)" : "var(--text-dim)" }} />

                  {renamingId === s.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitRename(s.id, s.title); }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => commitRename(s.id, s.title)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ flex: 1, fontSize: 13, color: "var(--text)", background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: 4, padding: "2px 6px", outline: "none", fontFamily: "inherit", minWidth: 0 }}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }}
                      title="Double-click to rename"
                      style={{ flex: 1, fontSize: 13, lineHeight: 1.35, color: s.id === activeId ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {s.title}
                    </span>
                  )}

                  {renamingId !== s.id && (
                    <div className="item-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }}
                        title="Rename"
                        style={{ display: "flex", alignItems: "center", color: "var(--text-dim)", padding: 2, borderRadius: 4, transition: "color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                      >
                        <Pencil size={11} />
                      </button>
                      {confirmDeleteId === s.id ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={(e) => requestDelete(e, s.id)}
                            title="Confirm delete"
                            style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--red)", padding: "1px 5px", border: "1px solid var(--red)", borderRadius: 4, background: "rgba(224,96,96,0.1)", lineHeight: 1.4 }}
                          >yes</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            title="Cancel"
                            style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)", padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 4, lineHeight: 1.4 }}
                          >no</button>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => requestDelete(e, s.id)}
                          title="Delete"
                          style={{ display: "flex", alignItems: "center", color: "var(--text-dim)", padding: 2, borderRadius: 4, transition: "color 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        }
      </div>
    </aside>
  );
}

// ── CodePreviewModal ─────────────────────────────────────────────────────────
function CodePreviewModal({ code, lang, filename, onClose }: { code: string; lang: string; filename: string; onClose: () => void }) {
  const isSvg = lang === "svg";
  const srcDoc = isSvg ? undefined : `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:#fff;color:#111;}*{box-sizing:border-box;}</style></head><body>${code}</body></html>`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24, backdropFilter: "blur(6px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Eye size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Preview</span>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "1px 8px", borderRadius: 12 }}>{filename}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => { const blob = new Blob([code], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }} title="Download file" style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 12 }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}><Download size={12} />Download</button>
            <button onClick={onClose} style={{ display: "flex", color: "var(--text-muted)", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}><X size={16} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "#ffffff", minHeight: 0 }}>
          {isSvg
            ? <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(code) }} />
            : <iframe srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" title={`Preview — ${lang}`} className="preview-iframe" style={{ width: "100%", height: "100%", minHeight: 460, border: "none", display: "block" }} />
          }
        </div>
      </div>
    </div>
  );
}

// ── SettingsModal ────────────────────────────────────────────────────────────
const TOKEN_OPTIONS = Array.from({ length: 50 }, (_, i) => (i + 1) * 1024);

function SettingsModal({ current, onSave, onClose }: { current: TokenSettings; onSave: (s: TokenSettings) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<TokenSettings>({ ...current });
  const selectStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer", appearance: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20, backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 420, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "var(--text)", marginBottom: 4 }}>Settings</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Token budget per request</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>Max input tokens</label>
          <div style={{ position: "relative" }}>
            <select value={draft.inputTokens} onChange={(e) => setDraft((d) => ({ ...d, inputTokens: Number(e.target.value) }))} style={selectStyle}>
              {TOKEN_OPTIONS.map((v) => <option key={v} value={v}>{v.toLocaleString()} tokens</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>Older messages are trimmed when history exceeds this limit.</p>
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>Max output tokens</label>
          <div style={{ position: "relative" }}>
            <select value={draft.outputTokens} onChange={(e) => setDraft((d) => ({ ...d, outputTokens: Number(e.target.value) }))} style={selectStyle}>
              {TOKEN_OPTIONS.map((v) => <option key={v} value={v}>{v.toLocaleString()} tokens</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>Maximum length of a single response.</p>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text-muted)", fontSize: 13 }}>Cancel</button>
          <button onClick={() => onSave(draft)} style={{ padding: "8px 20px", background: "var(--accent)", borderRadius: 7, color: "var(--bg)", fontSize: 13, fontWeight: 600 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {

  // CHANGE 5 — sessions start empty, loaded async from backend
  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [backendDown, setBackendDown] = useState(false);

  const [activeId, setActiveId] = useState<string>(() => loadActiveId(user.id));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  // Track sessions we created locally so we don't try to lazy-load their (empty) messages
  const newSessionIdsRef = useRef<Set<string>>(new Set());

  // Chat state
  const [apiKey, setApiKey] = useState(() => loadApiKey(user.id));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tokenSettings, setTokenSettings] = useState<TokenSettings>(() => loadTokenSettings(user.id));
  const [previewCode, setPreviewCode] = useState<{ code: string; lang: string; filename: string } | null>(null);

  // CHANGE 3 — provider + model state; providers list from backend
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("arc_theme") as "dark" | "light") ?? "dark");

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

  const activeConv = sessions.find((s) => s.id === activeId) ?? null;

  // Detect which provider an API key belongs to based on its format
  const detectProviderFromApiKey = useCallback((key: string): string | null => {
    if (!key || !key.trim()) return null;
    const trimmed = key.trim();
    
    // Anthropic keys start with "sk-ant-"
    if (trimmed.startsWith("sk-ant-")) return "anthropic";
    
    // Google/Gemini keys start with "AIza" or "AQ"
    if (trimmed.startsWith("AIza") || trimmed.startsWith("AQ")) return "gemini";
    
    // Grok/xAI keys start with "xai-"
    if (trimmed.startsWith("xai-")) return "grok";
    
    // OpenAI keys start with "sk-" (but not sk-ant-)
    if (trimmed.startsWith("sk-") && !trimmed.startsWith("sk-ant-")) return "openai";
    
    // OpenRouter keys start with "sk-or-"
    if (trimmed.startsWith("sk-or-")) return "openrouter";
    
    return null;
  }, []);

  // Filter providers based on API key - if key is set, only show that provider's models
  // If no key is set, show all fetched providers/models (we still default-select a free model)
  const filteredProviders = useMemo(() => {
    const keyProvider = detectProviderFromApiKey(apiKey);

    if (keyProvider) {
      // User has an API key - only show models from that provider
      return providers.filter((p) => p.slug === keyProvider || p.slug.startsWith(keyProvider));
    } else {
      // No API key - show all fetched models
      return providers;
    }
  }, [providers, apiKey, detectProviderFromApiKey]);

  // Helper to check if current provider/model is free tier
  const isCurrentModelFree = useCallback((): boolean => {
    const p = providers.find((pr) => pr.slug === provider);
    if (!p) return false;
    const m = p.models.find((md) => md.model_id === model);
    return m?.is_free ?? false;
  }, [providers, provider, model]);

  // CHANGE 5 — load sessions async on mount
  useEffect(() => {
    loadSessions(user.id).then((loaded) => {
      setSessions(loaded);
      setSessionsLoaded(true);
      // If we have a saved activeId that exists in loaded sessions, keep it;
      // otherwise fall back to the first session
      setActiveId((prev) => {
        if (prev && loaded.find((s) => s.id === prev)) return prev;
        return loaded[0]?.id ?? "";
      });
    }).catch(() => {
      setBackendDown(true);
      setSessionsLoaded(true);
    });
  }, [user.id]);

  // CHANGE 4 — load providers catalogue from backend on mount
  // Auto-select first free tier model if available
  useEffect(() => {
    loadProviders().then((loaded) => {
      setProviders(loaded);
      // Find first free model and set as default
      for (const p of loaded) {
        const freeModel = p.models.find((m) => m.is_free);
        if (freeModel) {
          setProvider(p.slug);
          setModel(freeModel.model_id);
          break;
        }
      }
    }).catch(() => {});
  }, []);

  // Auto-switch to compatible model when API key changes
  useEffect(() => {
    const keyProvider = detectProviderFromApiKey(apiKey);
    
    if (keyProvider) {
      // User set an API key - switch to first model from that provider
      const compatibleProvider = providers.find((p) => p.slug === keyProvider || p.slug.startsWith(keyProvider));
      if (compatibleProvider && compatibleProvider.models.length > 0) {
        setProvider(compatibleProvider.slug);
        setModel(compatibleProvider.models[0].model_id);
      }
    } else if (apiKey === "") {
      // User cleared API key - switch to first free model
      for (const p of providers) {
        const freeModel = p.models.find((m) => m.is_free);
        if (freeModel) {
          setProvider(p.slug);
          setModel(freeModel.model_id);
          break;
        }
      }
    }
  }, [apiKey, providers, detectProviderFromApiKey]);

  // Apply user accent color
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", user.color);
    document.documentElement.style.setProperty("--accent-dim", user.color + "22");
    return () => {
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-dim");
    };
  }, [user.color]);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("arc_theme", theme);
  }, [theme]);

  // saveSessions is now a no-op (backend handles persistence) but kept for compat
  useEffect(() => { saveSessions(user.id, sessions); }, [sessions, user.id]);

  // Persist active id locally (cheap, no backend needed)
  useEffect(() => { saveActiveId(user.id, activeId); }, [activeId, user.id]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

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

  // CHANGE 7 — handleNewSession is now async; createNewSession hits the backend
  const handleNewSession = useCallback(async () => {
    abortRef.current?.abort();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStreaming(false);
    setThinking(false);
    setStreamingMsgId(null);
    streamBuf.current = "";
    setInput("");

    const s = await createNewSession(provider, model, isCurrentModelFree());
    newSessionIdsRef.current.add(s.id);
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  }, [provider, model, isCurrentModelFree]);

  // CHANGE 6 — handleSelectSession: lazy-load messages from backend
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

    // Lazy-load messages only if not already in memory and not a brand-new local session
    setSessions((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target && target.messages.length === 0 && !newSessionIdsRef.current.has(id)) {
        setLoadingSessionId(id);
        loadSessionMessages(id).then((msgs) => {
          setLoadingSessionId((curr) => curr === id ? null : curr);
          if (msgs.length > 0) {
            setSessions((p) => p.map((s) => s.id === id ? { ...s, messages: msgs } : s));
          }
        }).catch(() => {
          setLoadingSessionId((curr) => curr === id ? null : curr);
        });
      }
      return prev;
    });
  }, [activeId]);

  // CHANGE 8 — handleDeleteSession: optimistic UI + backend delete
  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? "");
      return next;
    });
    deleteChat(id).catch((e) => console.error("Failed to delete chat", e));
  }, [activeId]);

  const handleImportConversation = useCallback(async (msgs: RawMsg[]) => {
    const now = Date.now();
    const messages: Message[] = msgs.map((m, i) => ({
      id: uuid(), role: m.role, content: m.content, timestamp: now + i,
    }));
    const firstUser = messages.find((m) => m.role === "user");
    const title = firstUser ? deriveTitle(firstUser.content) : "Imported conversation";

    // Create chat on backend first, then populate messages locally
    const fresh = await createNewSession(provider, model, isCurrentModelFree());
    newSessionIdsRef.current.add(fresh.id);
    fresh.messages = messages;
    fresh.updatedAt = now;
    fresh.title = title;
    updateChatTitle(fresh.id, title).catch(() => {});

    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setShowImport(false);
  }, [provider, model, isCurrentModelFree]);

  const handleExportConversation = useCallback(() => {
    if (!activeConv || activeConv.messages.length === 0) return;
    const payload = {
      title: activeConv.title,
      exported_at: new Date().toISOString(),
      chat_messages: activeConv.messages.map((m) => ({
        role: m.role, content: m.content, timestamp: m.timestamp,
        ...(m.tokens && { tokens: m.tokens }),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = activeConv.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").trim().slice(0, 48);
    a.href = url; a.download = `${slug || "conversation"}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [activeConv]);

  const handleSaveKey = useCallback((key: string) => {
    setApiKey(key); saveApiKey(user.id, key);
  }, [user.id]);

  const handleRenameSession = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: newTitle.trim() } : s));
    updateChatTitle(id, newTitle.trim()).catch(() => {});
  }, []);

  const handleLogout = useCallback(() => {
    abortRef.current?.abort();
    logout();
    onLogout();
  }, [onLogout]);

  // Auto-logout when a 401 is received anywhere in the app
  // (placed after handleLogout to avoid "used before declaration" errors)
  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener("arc:auth-error", handler);
    return () => window.removeEventListener("arc:auth-error", handler);
  }, [handleLogout]);

  // Keyboard shortcuts (placed after handleNewSession to avoid order issues)
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        void handleNewSession();
      }
      if (e.key === "Escape") {
        setShowKeyModal(false);
        setShowSettings(false);
        setShowImport(false);
        setPreviewCode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewSession, handleLogout]);

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

  // CHANGE 10 — startStream passes provider + sessionId (chatId) to streamChat
  const startStream = useCallback(async (sessionId: string, messages: Message[]) => {
    const streamMsgId = uuid();
    let msgAdded = false;

    setThinking(true);
    setStreaming(true);
    streamBuf.current = "";

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    await streamChat(
      messages,
      apiKey,
      {
        onChunk: (chunk) => {
          if (ctrl.signal.aborted) return;
          streamBuf.current += chunk;

          if (!msgAdded) {
            msgAdded = true;
            setSessions((prev) => prev.map((s) =>
              s.id === sessionId
                ? { ...s, messages: [...s.messages, { id: streamMsgId, role: "assistant" as const, content: streamBuf.current, timestamp: Date.now() }], updatedAt: Date.now() }
                : s
            ));
            setStreamingMsgId(streamMsgId);
            setThinking(false);
          } else if (rafRef.current === null) {
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
      },
      ctrl.signal,
      provider,    // CHANGE 10 — pass provider
      model,
      sessionId,   // CHANGE 10 — pass chatId so backend saves messages
      { inputTokens: tokenSettings.inputTokens, outputTokens: tokenSettings.outputTokens }
    );
  }, [apiKey, provider, model, tokenSettings]);

  // CHANGE 9 — handleSend: createNewSession async + updateChatTitle on first message
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    let sessionId = activeId;
    if (!sessionId || !sessions.find((s) => s.id === sessionId)) {
      const fresh = await createNewSession(provider, model, isCurrentModelFree());
      newSessionIdsRef.current.add(fresh.id);
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
        ? { ...s, messages: allMessages, updatedAt: Date.now(), title: isFirstMessage ? deriveTitle(text) : s.title }
        : s
    ));

    // CHANGE 11 — sync title to backend on first message
    if (isFirstMessage) {
      const newTitle = deriveTitle(text);
      updateChatTitle(sessionId, newTitle).catch(() => {});
    }

    setInput("");
    setAttachments([]);
    await startStream(sessionId, allMessages);
  }, [input, streaming, activeId, sessions, attachments, provider, model, isCurrentModelFree, startStream]);

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
    const editedMsg: Message = { ...conv.messages[msgIndex], content: editText.trim(), timestamp: Date.now() };
    const newMessages = [...conv.messages.slice(0, msgIndex), editedMsg];
    setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));
    setEditingMsgId(null);
    setEditText("");
    await startStream(activeId, newMessages);
  }, [editingMsgId, editText, streaming, activeId, sessions, startStream]);

  const handleEditCancel = useCallback(() => { setEditingMsgId(null); setEditText(""); }, []);

  const handleRegenerate = useCallback(async (msgId: string) => {
    if (streaming) return;
    const conv = sessions.find((s) => s.id === activeId);
    if (!conv) return;
    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;
    const newMessages = conv.messages.slice(0, msgIndex);
    setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));
    await startStream(activeId, newMessages);
  }, [streaming, activeId, sessions, startStream]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    function normalizeImageMime(raw: string): string {
      if (raw === "image/jpg" || raw === "image/jfif" || raw === "image/pjpeg") return "image/jpeg";
      return raw;
    }
    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) return;
      const mime = normalizeImageMime(file.type);
      const isImage = SUPPORTED_IMAGE_TYPES.has(mime);
      const reader = new FileReader();
      if (isImage) {
        reader.onload = () => { const base64 = (reader.result as string).split(",")[1]; setAttachments((prev) => [...prev, { id: uuid(), name: file.name, type: "image", data: base64, mimeType: mime, size: file.size }]); };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => { setAttachments((prev) => [...prev, { id: uuid(), name: file.name, type: "text", data: reader.result as string, mimeType: file.type || "text/plain", size: file.size }]); };
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

  // Loading state while sessions are being fetched from backend
  if (!sessionsLoaded) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onSelect={handleSelectSession}
        onNew={() => void handleNewSession()}
        onDelete={handleDeleteSession}
        onImport={() => setShowImport(true)}
        onRename={handleRenameSession}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 54, borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>
              {activeConv?.title ?? "ARC"}
            </span>

            {/* CHANGE 12 — dynamic multi-provider model selector (filtered by API key) */}
            <select
              value={`${provider}::${model}`}
              onChange={(e) => {
                const parts = e.target.value.split("::");
                setProvider(parts[0]);
                setModel(parts[1]);
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
              {filteredProviders.length > 0
                ? filteredProviders.flatMap((prov) =>
                    prov.models.map((mdl) => (
                      <option key={`${prov.slug}::${mdl.model_id}`} value={`${prov.slug}::${mdl.model_id}`}>
                        {prov.name} · {mdl.display_name}{mdl.is_free ? " ✦" : ""}
                      </option>
                    ))
                  )
                : MODELS.map((m) => (
                    <option key={m.id} value={`anthropic::${m.id}`}>{m.label}</option>
                  ))
              }
            </select>
            
            {/* Indicator when models are filtered by API key */}
            {apiKey && detectProviderFromApiKey(apiKey) && (
              <span title={`Showing only ${detectProviderFromApiKey(apiKey)} models (API key set)`} style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent)", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>
                🔑 {detectProviderFromApiKey(apiKey)}
              </span>
            )}
            
            {/* when no api key is set we show all fetched models; no special badge */}
            
            {/* Premium model cost indicator */}
            {(model.includes("sonnet") || model.includes("gpt-4o") || model.includes("gemini-2.5-pro") || model.includes("opus")) && (
              <span title="Premium model — higher cost per token" style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--orange)", background: "rgba(200,146,42,0.12)", border: "1px solid rgba(200,146,42,0.3)", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>
                ⚡ premium
              </span>
            )}

            {hasCacheHits && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--green)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                <Zap size={11} />caching
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button onClick={handleExportConversation} disabled={!hasMessages} title="Export conversation as JSON" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 7, border: "1px solid var(--border)", color: "var(--text-muted)", opacity: hasMessages ? 1 : 0.35, transition: "background 0.15s, color 0.15s" }} onMouseEnter={(e) => { if (!hasMessages) return; e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
              <Download size={14} />
            </button>
            <button onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 7, border: "1px solid var(--border)", color: "var(--text-muted)", transition: "background 0.15s, color 0.15s, border-color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => setShowKeyModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${apiKey ? "var(--border)" : "var(--accent)"}`, borderRadius: 7, color: apiKey ? "var(--text-muted)" : "var(--accent)", fontSize: 12.5, background: apiKey ? "none" : "var(--accent-dim)" }}>
              <Key size={13} />{apiKey ? "Key set" : "Add key"}
            </button>
            <button onClick={() => setShowSettings(true)} title="Settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 7, border: "1px solid var(--border)", color: "var(--text-muted)", transition: "background 0.15s, color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
              <Settings size={14} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 6px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>{user.emoji}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{user.username}</span>
            </div>
            <button onClick={handleLogout} title="Sign out" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, color: "var(--text-dim)", transition: "color 0.15s, background 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "rgba(248,81,73,0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}>
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {backendDown && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", background: "rgba(224,96,96,0.1)", borderBottom: "1px solid rgba(224,96,96,0.25)", flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: "var(--red)" }}>⚠</span>
            <span style={{ fontSize: 12.5, color: "var(--red)" }}>Backend unreachable — chats will not be saved this session.</span>
            <button onClick={() => setBackendDown(false)} style={{ marginLeft: "auto", color: "var(--red)", display: "flex", padding: 2 }}><X size={14} /></button>
          </div>
        )}

        <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {loadingSessionId === activeId ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          ) : !hasMessages ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, paddingBottom: 60, padding: "0 24px 60px" }}>
              <img src={faviconUrl} alt="arc" style={{ width: 48, height: 48 }} />
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "var(--text)", marginBottom: 8 }}>
                  Hello, {user.username} {user.emoji}
                </h2>
                <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 300 }}>
                  Ask anything. Chats are saved automatically.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, width: "100%", maxWidth: 460 }}>
                {[
                  "Why is my code running at the speed of a tired sloth? 🦥",
                  "Roast my project idea and then help me fix it 🔥",
                  "I have 3 hours to learn .NET — what's the move? ⚡",
                  "Write me a React hook so clean it makes me cry 😭",
                ].map((s) => (
                  <button key={s} onClick={() => setInput(s)} style={{ padding: "11px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 13, textAlign: "left", lineHeight: 1.4 }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>{s}</button>
                ))}
              </div>
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
                  onCodePreview={(code, lang, filename) => setPreviewCode({ code, lang, filename })}
                />
              ))}
              {thinking && <Thinking />}
            </div>
          )}

          {showScrollBtn && (
            <button onClick={() => scrollToBottom()} style={{ position: "fixed", bottom: 110, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 20, color: "var(--text-muted)", fontSize: 12, zIndex: 10, boxShadow: "var(--shadow)" }}>
              <ChevronDown size={14} />Scroll to bottom
            </button>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "12px 24px 18px", flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: "0 auto", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }} onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}>
            {attachments.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 12px 0" }}>
                {attachments.map((att) => (
                  <span key={att.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "3px 8px 3px 10px", borderRadius: 6, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {att.type === "image" ? "🖼" : "📎"} {att.name}
                    <button onClick={() => handleRemoveAttachment(att.id)} style={{ display: "flex", color: "var(--text-dim)", padding: 1, borderRadius: 3 }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", padding: "10px 12px" }}>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} style={{ display: "none" }} accept="image/*,.txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.css,.html,.yml,.yaml,.xml,.csv,.sql,.sh,.rs,.go,.java,.c,.cpp,.h,.rb,.php,.swift,.kt,.r,.lua,.pl,.ex,.exs,.hs,.scala,.dart,.vue,.svelte,.toml,.ini,.cfg,.env,.log" />
              <button onClick={() => fileInputRef.current?.click()} title="Attach files (max 2 MB each)" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, flexShrink: 0, color: "var(--text-dim)", transition: "color 0.15s, background 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}>
                <Paperclip size={16} />
              </button>
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={streaming ? "Responding…" : "Message  (Enter ↵ to send, Shift+Enter for newline)"} disabled={streaming} rows={1} style={{ flex: 1, minHeight: 26, maxHeight: 160, overflow: "auto" }} />
              <button onClick={streaming ? handleStop : () => void handleSend()} disabled={!streaming && !input.trim() && attachments.length === 0} style={{ width: 36, height: 36, borderRadius: 8, background: streaming ? "rgba(248,81,73,0.15)" : "var(--accent)", border: streaming ? "1px solid var(--red)" : "none", color: streaming ? "var(--red)" : "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: !streaming && !input.trim() && attachments.length === 0 ? 0.35 : 1, transition: "opacity 0.15s, background 0.15s" }}>
                {streaming ? <Square size={14} fill="var(--red)" /> : <Send size={15} />}
              </button>
            </div>
          </div>

          {/* CHANGE 14 — updated status bar showing provider · model */}
          <div style={{ textAlign: "center", marginTop: 7, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)" }}>
            {provider} · {model} · {activeConv?.messages.length ?? 0} msg{(activeConv?.messages.length ?? 0) !== 1 ? "s" : ""} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {showKeyModal && <ApiKeyModal current={apiKey} onSave={handleSaveKey} onClose={() => setShowKeyModal(false)} />}
      {showSettings && <SettingsModal current={tokenSettings} onSave={(s) => { setTokenSettings(s); saveTokenSettings(user.id, s); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
      {showImport && <ImportClaudeModal onImport={(msgs) => void handleImportConversation(msgs)} onClose={() => setShowImport(false)} />}
      {previewCode && <CodePreviewModal code={previewCode.code} lang={previewCode.lang} filename={previewCode.filename} onClose={() => setPreviewCode(null)} />}
    </div>
  );
}