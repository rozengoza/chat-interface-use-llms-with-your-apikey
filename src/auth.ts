/**
 * auth.ts — Client-side auth using Web Crypto PBKDF2 + SHA-256.
 *
 * User records are persisted in localStorage. Passwords are NEVER stored
 * in plaintext — only the PBKDF2-derived key (hex) + salt per user.
 *
 * Session: a random token stored in sessionStorage (cleared on tab close).
 */

export interface UserProfile {
  id: string;         // uuid, immutable
  username: string;   // display name
  color: string;      // accent color hex
  emoji: string;      // avatar emoji
  passwordHash: string; // hex-encoded PBKDF2 output
  passwordSalt: string; // hex-encoded random salt
  createdAt: number;
}

export interface Session {
  userId: string;
  token: string;
  loginAt: number;
}

const USERS_KEY   = "arc_users";
const SESSION_KEY = "arc_session";
const ITERATIONS  = 200_000;

// ── Allowlist ─────────────────────────────────────────────────────────────────
// Usernames are loaded from .env.local at build time (gitignored).
// Set VITE_ALLOWED_USER_1 and VITE_ALLOWED_USER_2 in .env.local.
export const ALLOWED_USERNAMES: [string, string] = [
  import.meta.env.VITE_ALLOWED_USER_1,
  import.meta.env.VITE_ALLOWED_USER_2,
];

// ── Crypto helpers ────────────────────────────────────────────────────────────

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const saltBytes = hexToBytes(saltHex);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: ITERATIONS,
    },
    keyMaterial,
    256
  );
  return bytesToHex(derived);
}

function randomHex(bytes = 16): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

// ── User storage ──────────────────────────────────────────────────────────────

export function loadUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as UserProfile[];
  } catch {
    console.warn("Failed to load users");
  }
  return [];
}

function saveUsers(users: UserProfile[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerUser(
  username: string,
  password: string,
  color: string,
  emoji: string
): Promise<UserProfile> {
  const allowed = ALLOWED_USERNAMES.map((n) => n.toLowerCase());
  if (!allowed.includes(username.trim().toLowerCase())) {
    throw new Error("This username is not authorised to access arc.");
  }
  const users = loadUsers();
  if (users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    throw new Error("Username already taken.");
  }
  const salt = randomHex(16);
  const hash = await deriveKey(password, salt);
  const profile: UserProfile = {
    id: crypto.randomUUID(),
    username: username.trim(),
    color,
    emoji,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: Date.now(),
  };
  saveUsers([...users, profile]);
  return profile;
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(
  username: string,
  password: string
): Promise<UserProfile> {
  const allowed = ALLOWED_USERNAMES.map((n) => n.toLowerCase());
  if (!allowed.includes(username.trim().toLowerCase())) {
    throw new Error("This username is not authorised to access arc.");
  }
  const users = loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) throw new Error("Account not found. Register first.");

  const hash = await deriveKey(password, user.passwordSalt);
  if (hash !== user.passwordHash) throw new Error("Incorrect password.");

  const session: Session = {
    userId: user.id,
    token: randomHex(32),
    loginAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return user;
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getActiveSession(): { session: Session; user: UserProfile } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    const users = loadUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { session, user };
  } catch {
    return null;
  }
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
