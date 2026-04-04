import type { Conversation } from "./types";

// Keys are now namespaced per user so each user has isolated storage
function k(userId: string, key: string) { return `arc_${userId}_${key}`; }

// Sessions

export function loadSessions(userId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(k(userId, "sessions"));
    if (raw) return JSON.parse(raw) as Conversation[];
  } catch {
    console.warn("Failed to load sessions");
  }
  return [];
}

export function saveSessions(userId: string, sessions: Conversation[]): void {
  localStorage.setItem(k(userId, "sessions"), JSON.stringify(sessions));
}

// Active ID

export function loadActiveId(userId: string): string {
  return localStorage.getItem(k(userId, "active_id")) ?? "";
}

export function saveActiveId(userId: string, id: string): void {
  localStorage.setItem(k(userId, "active_id"), id);
}

// API Key

export function loadApiKey(userId: string): string {
  return localStorage.getItem(k(userId, "api_key")) ?? "";
}

export function saveApiKey(userId: string, key: string): void {
  localStorage.setItem(k(userId, "api_key"), key);
}

// Helpers

export function createNewSession(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
}

/** Derive a short title from the first user message */
export function deriveTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? clean.slice(0, 42).trimEnd() + "…" : clean;
}