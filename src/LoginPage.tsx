import { useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus, Loader } from "lucide-react";
import type { UserProfile } from "./auth";
import { loginUser, registerUser, loadUsers } from "./auth";
import faviconUrl from "./assets/favicon.svg";

const PRESET_COLORS = [
  "#58a6ff", // blue
  "#3fb950", // green
  "#f78166", // coral
  "#d2a8ff", // purple
  "#ffa657", // orange
  "#79c0ff", // sky
];

const PRESET_EMOJIS = ["🐱", "🐶", "💠", "🩵", "💚", "🦊", "🐺", "🦋", "🌙", "🌊", "🌿"];

interface LoginPageProps {
  onLogin: (user: UserProfile) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const hasUsers = loadUsers().length > 0;
  const [mode, setMode] = useState<"login" | "register">(hasUsers ? "login" : "register");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [color, setColor]       = useState(PRESET_COLORS[0]);
  const [emoji, setEmoji]       = useState(PRESET_EMOJIS[0]);
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const users = loadUsers();
  const MAX_USERS = 2;
  const canRegister = users.length < MAX_USERS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) { setError("Please enter a username."); return; }
    if (!password)        { setError("Please enter a password."); return; }

    setBusy(true);
    try {
      if (mode === "register") {
        if (password.length < 6)        { setError("Password must be at least 6 characters."); return; }
        if (password !== confirmPw)     { setError("Passwords do not match."); return; }
        if (!canRegister)               { setError("Maximum of 2 users already registered."); return; }
        const user = await registerUser(username.trim(), password, color, emoji);
        onLogin(user);
      } else {
        const user = await loginUser(username.trim(), password);
        onLogin(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--bg)",
    border: "1.5px solid var(--border2)",
    borderRadius: 8,
    color: "var(--text)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 16,
        padding: 32,
        boxShadow: "var(--shadow)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            <img src={faviconUrl} alt="arc" style={{ width: 48, height: 48 }} />
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: "var(--text)", marginBottom: 4 }}>
            ARC
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Tab switcher — only show if users exist AND registration is possible */}
        {(hasUsers || canRegister) && (
          <div style={{
            display: "flex", background: "var(--bg)", borderRadius: 8,
            padding: 3, marginBottom: 24, gap: 2,
          }}>
            {hasUsers && (
              <button
                onClick={() => { setMode("login"); setError(""); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 13, fontWeight: 500,
                  background: mode === "login" ? "var(--surface2)" : "transparent",
                  color: mode === "login" ? "var(--text)" : "var(--text-muted)",
                  border: mode === "login" ? "1px solid var(--border)" : "1px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <LogIn size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                Sign in
              </button>
            )}
            {canRegister && (
              <button
                onClick={() => { setMode("register"); setError(""); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 13, fontWeight: 500,
                  background: mode === "register" ? "var(--surface2)" : "transparent",
                  color: mode === "register" ? "var(--text)" : "var(--text-muted)",
                  border: mode === "register" ? "1px solid var(--border)" : "1px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <UserPlus size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                Register
              </button>
            )}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Username */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your name"
              autoFocus
              autoComplete="username"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border2)")}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border2)")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-dim)", display: "flex",
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password (register only) */}
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 }}>
                Confirm password
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border2)")}
              />
            </div>
          )}

          {/* Personalisation (register only) */}
          {mode === "register" && (
            <>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 8, fontWeight: 500 }}>
                  Accent color
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: c,
                        border: color === c ? `3px solid var(--text)` : "3px solid transparent",
                        transition: "border 0.12s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 8, fontWeight: 500 }}>
                  Avatar
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      style={{
                        width: 34, height: 34, borderRadius: 8, fontSize: 18,
                        background: emoji === em ? "var(--surface2)" : "transparent",
                        border: `1.5px solid ${emoji === em ? "var(--border2)" : "transparent"}`,
                        transition: "all 0.12s",
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              fontSize: 13, color: "var(--red)",
              background: "rgba(248,81,73,0.08)",
              border: "1px solid rgba(248,81,73,0.25)",
              borderRadius: 7, padding: "8px 12px",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 4,
              padding: "11px 0",
              background: "var(--accent)",
              borderRadius: 8,
              color: "var(--bg)",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              opacity: busy ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {busy
              ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Please wait…</>
              : mode === "login"
                ? <><LogIn size={15} />Sign in</>
                : <><UserPlus size={15} />Create account</>
            }
          </button>
        </form>

        {/* Existing user avatars */}
        {users.length > 0 && mode === "login" && (
          <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center" }}>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setUsername(u.username)}
                title={u.username}
                style={{
                  width: 36, height: 36, borderRadius: 10, fontSize: 18,
                  background: "var(--surface2)", border: `1.5px solid var(--border)`,
                  transition: "border-color 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = u.color)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {u.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
