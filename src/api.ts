import type { Message, Attachment } from "./types";

export interface ModelOption {
  id: string;
  label: string;
}

export const MODELS: ModelOption[] = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
];

export const DEFAULT_MODEL = MODELS[0].id;

const SYSTEM_PROMPT =
  "You are a helpful, concise assistant. Format your responses with markdown where useful.";

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (tokens: Message["tokens"]) => void;
  onError: (msg: string) => void;
}

// Rough token estimator: ~4 chars per token.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Maximum input tokens to send (system prompt + history).
// Leaves 4096 for the output and keeps total well within a cost-conscious limit.
const MAX_INPUT_TOKENS = 6000;

// Build the API message list with smart caching.
// Anthropic allows a maximum of 4 cache_control blocks total (including the
// system prompt block). We reserve 1 for the system prompt, leaving 3 for
// messages. We apply cache markers only to the 3 most-recent non-last messages
// so older turns get re-read from cache without exceeding the limit.
// Older messages are dropped when the estimated input token budget is exceeded.
function buildApiMessages(messages: Message[]) {
  // Estimate tokens for each message (text content only).
  const msgTokens = messages.map((m) => {
    let text = m.content;
    if (m.attachments) {
      const textFiles = m.attachments.filter((a) => a.type === "text");
      for (const f of textFiles) text += f.data;
    }
    return estimateTokens(text);
  });

  // Always keep the last message (current user turn). Then add as many
  // prior messages as fit within the budget, working backwards.
  const budget = MAX_INPUT_TOKENS - estimateTokens(SYSTEM_PROMPT);
  let used = msgTokens[messages.length - 1] ?? 0;
  let startIdx = messages.length - 1;
  for (let i = messages.length - 2; i >= 0; i--) {
    if (used + msgTokens[i] > budget) break;
    used += msgTokens[i];
    startIdx = i;
  }
  const trimmed = messages.slice(startIdx);

  // Indices (excluding the last message) that should receive cache_control.
  // We take up to the last 3 cacheable positions.
  const cacheableIndices = new Set<number>();
  let count = 0;
  for (let i = trimmed.length - 2; i >= 0 && count < 3; i--) {
    cacheableIndices.add(i);
    count++;
  }

  return trimmed.map((m, i) => {
    const isLast = i === trimmed.length - 1;
    const shouldCache = !isLast && cacheableIndices.has(i);
    const content: Record<string, unknown>[] = [];

    // Add image attachments first (vision)
    if (m.attachments) {
      for (const att of m.attachments) {
        if (att.type === "image") {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: att.mimeType,
              data: att.data,
            },
          });
        }
      }
    }

    // Build text — prepend text-file attachments inline
    let text = m.content;
    if (m.attachments) {
      const textFiles = m.attachments.filter(
        (a: Attachment) => a.type === "text",
      );
      if (textFiles.length > 0) {
        const block = textFiles
          .map(
            (f: Attachment) => `[file: ${f.name}]\n\`\`\`\n${f.data}\n\`\`\``,
          )
          .join("\n\n");
        text = block + "\n\n" + text;
      }
    }

    content.push({
      type: "text" as const,
      text,
      ...(shouldCache && { cache_control: { type: "ephemeral" as const } }),
    });

    return { role: m.role, content };
  });
}

export async function streamChat(
  messages: Message[],
  apiKey: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  model = DEFAULT_MODEL,
): Promise<void> {
  if (!apiKey.trim()) {
    callbacks.onError("No API key set. Click the key icon to configure.");
    return;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: abortSignal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // Enable prompt caching beta
        "anthropic-beta": "prompt-caching-2024-07-31",
        // Required for direct browser-to-API calls
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        stream: true,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            // Cache the system prompt on every request
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: buildApiMessages(messages),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let detail = `HTTP ${res.status}`;
      try {
        detail =
          (JSON.parse(body) as { error?: { message?: string } }).error
            ?.message ?? detail;
      } catch {
        console.warn("Failed to parse error response:", body);
      }
      callbacks.onError(detail);
      return;
    }

    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    if (!reader) {
      callbacks.onError("No response stream.");
      return;
    }

    let tokens: Message["tokens"] = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    };
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type: string;
            delta?: { text?: string };
            usage?: {
              output_tokens?: number;
              input_tokens?: number;
              cache_read_input_tokens?: number;
              cache_creation_input_tokens?: number;
            };
            message?: {
              usage?: {
                input_tokens?: number;
                cache_read_input_tokens?: number;
                cache_creation_input_tokens?: number;
              };
            };
          };

          if (evt.type === "content_block_delta" && evt.delta?.text) {
            callbacks.onChunk(evt.delta.text);
          }
          if (evt.type === "message_start" && evt.message?.usage) {
            const u = evt.message.usage;
            tokens = {
              ...tokens,
              input: u.input_tokens ?? 0,
              cacheRead: u.cache_read_input_tokens ?? 0,
              cacheWrite: u.cache_creation_input_tokens ?? 0,
            };
          }
          if (evt.type === "message_delta" && evt.usage) {
            tokens = { ...tokens, output: evt.usage.output_tokens ?? 0 };
          }
        } catch {
          console.warn("Failed to parse event:", payload);
        }
      }
    }

    callbacks.onDone(tokens);
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err.message : "Unexpected error");
  }
}
