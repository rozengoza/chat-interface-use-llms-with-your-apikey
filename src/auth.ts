/**
 * auth.ts — Client-side auth using the ARC backend.
 *
 * WHAT CHANGED FROM THE OLD VERSION:
 *   - No more PBKDF2 / localStorage password hashing
 *   - register/login hit POST /auth/register and POST /auth/login
 *   - JWT is stored in localStorage (persists across browser restarts)
 *   - UserProfile shape is mostly the same so LoginPage.tsx needs no changes
 *
 * WHAT STAYS THE SAME:
 *   - Session persists across browser restarts (localStorage)
 *   - logout() clears localStorage
 *   - getActiveSession() returns { session, user } or null
 */

export interface UserProfile {
  id: string;
  username: string;
  color: string;    // chosen at register, stored locally (not in DB yet)
  emoji: string;    // chosen at register, stored locally (not in DB yet)
  createdAt: number;
}

export interface Session {
  userId: string;
  token: string;    // JWT from backend
  loginAt: number;
}

const SESSION_KEY  = "arc_session";
const PROFILE_KEY  = "arc_profiles"; // local store for color/emoji preferences

// ---------------------------------------------------------------------------
// API base URL — set VITE_API_URL in your .env.local
// e.g. VITE_API_URL=http://localhost:3001   (dev)
//      VITE_API_URL=https://arc-backend.onrender.com   (prod)
// ---------------------------------------------------------------------------
// Normalize VITE_API_URL: ensure no trailing slash and a scheme (defaults to https:// when missing).
const _rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const _trimmed = _rawApiUrl.replace(/\/$/, "");
const _withScheme = _trimmed && !/^https?:\/\//i.test(_trimmed) ? `https://${_trimmed}` : _trimmed;
export const API_BASE = _withScheme || "http://localhost:5001";

// ---------------------------------------------------------------------------
// Local profile store (color + emoji only — not sensitive)
// ---------------------------------------------------------------------------
function loadProfiles(): Record<string, { color: string; emoji: string }> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, { color: string; emoji: string }>;
  } catch { /* ignore */ }
  return {};
}

function saveProfile(username: string, color: string, emoji: string) {
  const profiles = loadProfiles();
  profiles[username.toLowerCase()] = { color, emoji };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function getProfile(username: string): { color: string; emoji: string } {
  const profiles = loadProfiles();
  return profiles[username.toLowerCase()] ?? { color: "#58a6ff", emoji: "🐱" };
}

// ---------------------------------------------------------------------------
// Return saved usernames for the "quick login" avatar strip in LoginPage
// ---------------------------------------------------------------------------
export function loadUsers(): Array<{ id: string; username: string; color: string; emoji: string }> {
  // We store the minimal info needed to render the avatar strip locally.
  // The source of truth for the account itself is the backend DB.
  try {
    const raw = localStorage.getItem("arc_known_users");
    if (raw) return JSON.parse(raw) as Array<{ id: string; username: string; color: string; emoji: string }>;
  } catch { /* ignore */ }
  return [];
}

function rememberUser(user: UserProfile) {
  const known = loadUsers();
  const exists = known.find((u) => u.id === user.id);
  if (!exists) {
    known.push({ id: user.id, username: user.username, color: user.color, emoji: user.emoji });
    localStorage.setItem("arc_known_users", JSON.stringify(known));
  }
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export async function registerUser(
  username: string,
  password: string,
  color: string,
  emoji: string,
): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json() as { token?: string; user?: { id: string; username: string }; error?: string };

  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.error ?? "Registration failed");
  }

  saveProfile(username, color, emoji);

  const profile: UserProfile = {
    id: data.user.id,
    username: data.user.username,
    color,
    emoji,
    createdAt: Date.now(),
  };

  const session: Session = { userId: profile.id, token: data.token, loginAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  rememberUser(profile);

  return profile;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export async function loginUser(username: string, password: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json() as { token?: string; user?: { id: string; username: string }; error?: string };

  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.error ?? "Login failed");
  }

  const { color, emoji } = getProfile(data.user.username);

  const profile: UserProfile = {
    id: data.user.id,
    username: data.user.username,
    color,
    emoji,
    createdAt: Date.now(),
  };

  const session: Session = { userId: profile.id, token: data.token, loginAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  rememberUser(profile);

  return profile;
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
export function getActiveSession(): { session: Session; user: UserProfile } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;

    // Reconstruct UserProfile from the JWT payload (no DB call needed)
    const payloadB64 = session.token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64)) as { sub: string; username: string; exp: number };

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    const { color, emoji } = getProfile(payload.username);
    const user: UserProfile = {
      id: payload.sub,
      username: payload.username,
      color,
      emoji,
      createdAt: 0,
    };
    return { session, user };
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session.token;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Password reset — calls backend (not needed to change on backend, uses login)
// Kept for LoginPage.tsx compatibility
// ---------------------------------------------------------------------------
export async function resetPassword(
  _username: string,
  _currentPassword: string,
  _newPassword: string,
): Promise<void> {
  // Placeholder — add a PATCH /auth/password endpoint on the backend when needed.
  // For now: tell the user to contact admin or re-register.
  throw new Error("Password reset is not yet supported in the backend version. Please contact the administrator.");
}