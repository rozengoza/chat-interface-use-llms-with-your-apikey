/**
 * store.ts — Chat/session persistence via the ARC backend.
 *
 * WHAT CHANGED:
 *   - loadSessions / saveSessions now call GET/POST/DELETE /chats
 *   - createNewSession calls POST /chats
 *   - localStorage is only used for UI prefs (activeId, apiKey, tokenSettings)
 *
 * WHAT STAYS THE SAME:
 *   - All function signatures are identical so App.tsx changes are minimal
 *   - loadApiKey / saveApiKey still use localStorage (key never goes to server)
 *   - loadTokenSettings / saveTokenSettings unchanged
 *   - createNewSession / deriveTitle unchanged
 */

import type { Conversation, Message } from "./types";
import { API_BASE, getToken } from "./auth";

// ---------------------------------------------------------------------------
// Authenticated fetch helper
// ---------------------------------------------------------------------------
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    // Token expired or invalid — signal the app to log the user out
    window.dispatchEvent(new CustomEvent("arc:auth-error"));
  }
  return res;
}

// ---------------------------------------------------------------------------
// Backend chat shape → local Conversation shape
// ---------------------------------------------------------------------------
interface BackendChat {
  id: string;
  title: string;
  provider: string;
  model: string;
  is_free_tier: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface BackendMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  input_tokens?: number;
  output_tokens?: number;
}

function chatToConversation(chat: BackendChat, messages: Message[] = []): Conversation {
  return {
    id: chat.id,
    title: chat.title,
    messages,
    updatedAt: new Date(chat.updated_at).getTime(),
    createdAt: new Date(chat.created_at).getTime(),
    // Extra fields used by the new multi-provider UI
    provider: chat.provider,
    model: chat.model,
    is_free_tier: chat.is_free_tier,
  };
}

function backendMsgToMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at).getTime(),
    tokens: m.input_tokens != null
      ? { input: m.input_tokens ?? 0, output: m.output_tokens ?? 0, cacheRead: 0, cacheWrite: 0 }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Sessions (chat list) — fetched from backend, NOT localStorage
// ---------------------------------------------------------------------------

/** Fetch all chats for the current user from the backend.
 *  Throws if the backend is unreachable so callers can show an error state. */
export async function loadSessions(_userId: string): Promise<Conversation[]> {
  const res = await apiFetch("/chats");
  if (!res.ok) throw new Error(`Failed to load chats: ${res.status}`);
  const data = await res.json() as { chats: BackendChat[] };
  return data.chats.map((c) => chatToConversation(c));
}

/** Load a single chat WITH its full message history */
export async function loadSessionMessages(chatId: string): Promise<Message[]> {
  try {
    const res = await apiFetch(`/chats/${chatId}`);
    if (!res.ok) return [];
    const data = await res.json() as { chat: BackendChat; messages: BackendMessage[] };
    if (!data.messages || data.messages.length === 0) {
      console.warn(`loadSessionMessages: no messages returned for chat ${chatId}`, data);
    }
    return (data.messages ?? []).map(backendMsgToMessage);
  } catch {
    return [];
  }
}

/**
 * saveSessions is called by App.tsx whenever sessions state changes.
 * With the backend we only need to PATCH the title — messages are saved
 * by the completion route automatically. For deletions, we track them separately.
 */
export function saveSessions(_userId: string, _sessions: Conversation[]): void {
  // No-op: persistence is handled by the backend.
  // Title updates happen via updateChatTitle(), deletions via deleteChat().
}

/** PATCH /chats/:id to update title */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  await apiFetch(`/chats/${chatId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

/** DELETE /chats/:id */
export async function deleteChat(chatId: string): Promise<void> {
  await apiFetch(`/chats/${chatId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Active ID — still localStorage (pure UI state, not user data)
// ---------------------------------------------------------------------------
function k(userId: string, key: string) { return `arc_${userId}_${key}`; }

export function loadActiveId(userId: string): string {
  return localStorage.getItem(k(userId, "active_id")) ?? "";
}

export function saveActiveId(userId: string, id: string): void {
  localStorage.setItem(k(userId, "active_id"), id);
}

// ---------------------------------------------------------------------------
// API Key — stays in localStorage (never goes to server)
// ---------------------------------------------------------------------------
export function loadApiKey(userId: string): string {
  return localStorage.getItem(k(userId, "api_key")) ?? "";
}

export function saveApiKey(userId: string, key: string): void {
  localStorage.setItem(k(userId, "api_key"), key);
}

// ---------------------------------------------------------------------------
// Token Settings — still localStorage (UI preference)
// ---------------------------------------------------------------------------
export interface TokenSettings {
  inputTokens: number;
  outputTokens: number;
}

const TOKEN_DEFAULTS: TokenSettings = { inputTokens: 2048, outputTokens: 2048 };

export function loadTokenSettings(userId: string): TokenSettings {
  try {
    const raw = localStorage.getItem(k(userId, "token_settings"));
    if (raw) return { ...TOKEN_DEFAULTS, ...(JSON.parse(raw) as Partial<TokenSettings>) };
  } catch { /* ignore */ }
  return { ...TOKEN_DEFAULTS };
}

export function saveTokenSettings(userId: string, s: TokenSettings): void {
  localStorage.setItem(k(userId, "token_settings"), JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// Create a new session via POST /chats
// Returns the server-assigned Conversation (with real UUID from DB)
// ---------------------------------------------------------------------------
export async function createNewSession(
  provider = "anthropic",
  model = "claude-haiku-4-5-20251001",
  isFreeTier = false,
): Promise<Conversation> {
  try {
    const res = await apiFetch("/chats", {
      method: "POST",
      body: JSON.stringify({ provider, model, is_free_tier: isFreeTier }),
    });
    if (res.ok) {
      const data = await res.json() as { chat: BackendChat };
      return chatToConversation(data.chat);
    }
  } catch { /* fall through to local fallback */ }

  // Fallback if backend is unreachable (dev / offline)
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
    provider,
    model,
    is_free_tier: isFreeTier,
  };
}

/** Derive a short title from the first user message */
export function deriveTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? clean.slice(0, 42).trimEnd() + "…" : clean;
}

// ---------------------------------------------------------------------------
// Provider/model catalogue from backend
// ---------------------------------------------------------------------------
export interface ProviderModel {
  model_id: string;
  display_name: string;
  context_k: number | null;
  is_free: boolean;
}

export interface ProviderInfo {
  slug: string;
  name: string;
  api_style: "openai" | "anthropic" | "google";
  models: ProviderModel[];
}

let _modelsCache: ProviderInfo[] | null = null;

export async function loadProviders(): Promise<ProviderInfo[]> {
  if (_modelsCache) return _modelsCache;
  try {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error("Failed to fetch models");
    const data = await res.json() as { providers: ProviderInfo[] };
    _modelsCache = data.providers;
    return data.providers;
  } catch {
    // Fallback to Anthropic only if backend is unreachable
    return [
      {
        slug: "anthropic",
        name: "Anthropic",
        api_style: "anthropic",
        models: [
          { model_id: "claude-haiku-4-5-20251001", display_name: "Claude Haiku 4.5", context_k: 200, is_free: false },
          { model_id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6", context_k: 200, is_free: false },
        ],
      },
    ];
  }
}

/**
 * POST multiple messages into an existing chat so imports can be persisted
 */
export async function saveMessages(chatId: string, messages: Message[]): Promise<void> {
  try {
    // Convert to backend shape
    const payload = messages.map((m) => ({ role: m.role, content: m.content, created_at: new Date(m.timestamp).toISOString() }));
    await apiFetch(`/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messages: payload }),
    });
  } catch (e) {
    console.warn("saveMessages failed", e);
  }
}

/**
 * Create a chat and persist initial messages in a single request.
 * Uses the same POST /chats API the app already calls for new chats.
 */
export async function createChatWithMessages(
  provider = "anthropic",
  model = "claude-haiku-4-5-20251001",
  isFreeTier = false,
  title = "New conversation",
  messages: Message[] = [],
): Promise<Conversation> {
  try {
    const payload = {
      provider,
      model,
      is_free_tier: isFreeTier,
      title,
      messages: messages.map((m) => ({ role: m.role, content: m.content, created_at: new Date(m.timestamp).toISOString() })),
    };
    const res = await apiFetch("/chats", { method: "POST", body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json() as { chat: BackendChat; messages?: BackendMessage[] };
      const msgs = (data.messages ?? []).map(backendMsgToMessage);
      return chatToConversation(data.chat, msgs);
    }
  } catch (e) {
    console.warn("createChatWithMessages failed", e);
  }

  // Fallback to local-only chat when backend unavailable
  return {
    id: crypto.randomUUID(),
    title,
    messages,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    provider,
    model,
    is_free_tier: isFreeTier,
  };
}