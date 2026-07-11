import { useEffect, useState } from "react";

/**
 * OpenRouter's public model catalogue (https://openrouter.ai/api/v1/models)
 * is the only broadly-covering, public, no-auth, real-time pricing feed
 * across providers — Anthropic/OpenAI/Google/etc. don't expose one directly.
 * Prices reflect OpenRouter's own rate for a model, which can differ
 * slightly from that provider's direct API — always label it as such.
 */
export interface OpenRouterPricing {
  prompt?: string;
  completion?: string;
  input_cache_read?: string;
  input_cache_write?: string;
}
export interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing: OpenRouterPricing;
}

const ENDPOINT = "https://openrouter.ai/api/v1/models";
const CACHE_KEY = "arc_openrouter_models_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — catalogue/pricing rarely changes minute to minute

let memoryCache: OpenRouterModel[] | null = null;

function readSessionCache(): OpenRouterModel[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, models } = JSON.parse(raw) as { ts: number; models: OpenRouterModel[] };
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return models;
  } catch {
    return null;
  }
}
function writeSessionCache(models: OpenRouterModel[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), models }));
  } catch {
    /* storage unavailable/full — non-fatal, just skip persistence */
  }
}

/** Fetches once per session (memory + sessionStorage cache), never throws —
 * failures resolve to an empty list so callers can fall back gracefully. */
export function useOpenRouterModels() {
  const [models, setModels] = useState<OpenRouterModel[] | null>(() => memoryCache ?? readSessionCache());
  const [loading, setLoading] = useState(models === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (models !== null) return;
    let cancelled = false;
    // `loading` is already true here — it's seeded by useState(models === null)
    // on the same render that made this effect run, so no setState needed yet.

    fetch(ENDPOINT, { signal: AbortSignal.timeout(10_000) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const list: OpenRouterModel[] = Array.isArray(json) ? json : (json?.data ?? []);
        memoryCache = list;
        writeSessionCache(list);
        setModels(list);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load live pricing");
        setModels([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [models]);

  return { models: models ?? [], loading, error };
}

/** USD-per-token string → USD-per-million-tokens number, or null if absent/invalid. */
export function perMTok(pricePerToken: string | undefined): number | null {
  if (!pricePerToken) return null;
  const n = Number(pricePerToken);
  if (!Number.isFinite(n) || n < 0) return null;
  return n * 1_000_000;
}

export function formatUSD(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "$0.00";
  return value < 1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`;
}

/**
 * Best-effort match: normalizes both sides to lowercase words and requires
 * every significant word of the display name (e.g. "Claude Sonnet 4.6") to
 * appear in a candidate's name/id before accepting it — deliberately strict
 * so a miss falls back to "no live match" rather than showing a wrong price.
 */
export function findModelPricing(displayName: string, models: OpenRouterModel[]): OpenRouterModel | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
  const words = normalize(displayName).split(" ").filter((w) => w.length > 1);
  if (!words.length || !models.length) return null;

  for (const m of models) {
    const haystack = normalize(`${m.name} ${m.id}`);
    if (words.every((w) => haystack.includes(w))) return m;
  }
  return null;
}
