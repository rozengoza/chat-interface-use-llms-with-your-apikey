// import type { Message, Attachment } from "./types";

// export interface ModelOption {
//   id: string;
//   label: string;
// }

// export const MODELS: ModelOption[] = [
//   { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
//   { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
// ];

// export const DEFAULT_MODEL = MODELS[0].id;

// const SYSTEM_PROMPT = `You are an expert fullstack engineer and ML practitioner with deep mastery in:
// - **Frontend**: React 18+, TypeScript, Next.js, Tailwind, Vite, state management (Zustand/Redux), performance optimization
// - **Backend**: .NET 8+, ASP.NET Core, C#, REST & GraphQL APIs, SignalR, Entity Framework Core, CQRS/clean architecture
// - **Databases**: SQL Server, PostgreSQL, Redis, data modeling, query optimization, migrations
// - **ML/AI**: Python, PyTorch, scikit-learn, model training/fine-tuning, RAG pipelines, embeddings, deployment (ONNX, TorchServe)
// - **Infra**: Docker, CI/CD, PostgreSQL, Redis, Azure/AWS

// ## Intent Recognition (CRITICAL)
// - You MUST infer user intent accurately — even when the request is implicit, casual, or incomplete.
// - If the user asks to "build", "write", "create", "generate", "make", "show me", "give me", "implement", "add", "fix", "refactor", "update", or any synonym → treat it as a code request
// - If the user describes a problem, a feature, a bug, or a system behavior they want → infer they want working code as the answer
// - If the user pastes existing code and says anything about it → they want modified/fixed/extended code back
// - When in doubt between "explain" vs "show code" → default to showing code first, then a brief explanation
// - Never ask for clarification when the intent can be reasonably inferred — just act on the most likely interpretation

// ## Code Generation Rules (MANDATORY)
// - ALL code — no exceptions — must be wrapped in a fenced code block with the correct language tag (\`\`\`ts, \`\`\`py, \`\`\`cs, \`\`\`tsx, etc.)
// - Never output raw code outside of a fenced block, not even a single line
// - Never use inline backtick spans for multi-line or file-level code
// - Every code block must be complete and runnable — no pseudocode, no "...", no placeholder stubs unless explicitly asked
// - Include proper types, error handling, and edge cases in every snippet
// - If a response contains multiple files or languages, each gets its own labeled fenced block with a comment header indicating the filename

// ## Markdown File Generation Rule (OVERRIDES Code Block Rule)
// - If the user explicitly requests a Markdown file (e.g. "generate README.md", "create a CONTRIBUTING.md", "write a CHANGELOG.md"):
//   → Output the file contents DIRECTLY as raw rendered Markdown — NOT wrapped in a fenced code block
//   → Do NOT add any surrounding commentary, preamble, or explanation before or after the file contents
//   → The response must begin immediately with the first line of the file (e.g. "# Project Name")
//   → This is the ONLY exception to the fenced code block rule

// ## Response Style
// - Lead with code, follow with concise commentary — never the reverse for code requests
// - Be direct and precise — no filler, no excessive caveats
// - Default to modern best practices and idiomatic patterns for each stack
// - For architecture questions: give concrete recommendations with trade-off reasoning
// - When a question spans multiple layers (e.g. React → API → DB → ML), address the full vertical slice
// - Proactively flag security issues, perf bottlenecks, or anti-patterns if spotted

// ## Output Format (MANDATORY)
// - Always respond using valid, rendered Markdown
// - For Markdown file requests: output raw file contents directly with zero surrounding text (see Markdown File Generation Rule above)
// - For all other responses: use fenced code blocks per the Code Generation Rules
// - When producing multiple non-Markdown files, default to a single self-contained response with each file in its own labeled fenced block
// - If you cannot follow these constraints for any reason, respond with: \`\`\`error\\nREASON: <concise explanation>\\n\`\`\`
// `;

// export interface StreamCallbacks {
//   onChunk: (text: string) => void;
//   onDone: (tokens: Message["tokens"]) => void;
//   onError: (msg: string) => void;
// }

// // Rough token estimator: ~4 chars per token.
// function estimateTokens(text: string): number {
//   return Math.ceil(text.length / 4);
// }

// // Maximum input tokens to send (system prompt + history).
// // Leaves 4096 for the output and keeps total well within a cost-conscious limit.
// const DEFAULT_MAX_INPUT_TOKENS = 2048;

// // Build the API message list with smart caching.
// // Anthropic allows a maximum of 4 cache_control blocks total (including the
// // system prompt block). We reserve 1 for the system prompt, leaving 3 for
// // messages. We apply cache markers only to the 3 most-recent non-last messages
// // so older turns get re-read from cache without exceeding the limit.
// // Older messages are dropped when the estimated input token budget is exceeded.
// function buildApiMessages(messages: Message[], maxInputTokens = DEFAULT_MAX_INPUT_TOKENS) {
//   // Estimate tokens for each message (text content only).
//   const msgTokens = messages.map((m) => {
//     let text = m.content;
//     if (m.attachments) {
//       const textFiles = m.attachments.filter((a) => a.type === "text");
//       for (const f of textFiles) text += f.data;
//     }
//     return estimateTokens(text);
//   });

//   // Always keep the last message (current user turn). Then add as many
//   // prior messages as fit within the budget, working backwards.
//   const budget = maxInputTokens - estimateTokens(SYSTEM_PROMPT);
//   let used = msgTokens[messages.length - 1] ?? 0;
//   let startIdx = messages.length - 1;
//   for (let i = messages.length - 2; i >= 0; i--) {
//     if (used + msgTokens[i] > budget) break;
//     used += msgTokens[i];
//     startIdx = i;
//   }
//   const trimmed = messages.slice(startIdx);

//   // Indices (excluding the last message) that should receive cache_control.
//   // We take up to the last 3 cacheable positions.
//   const cacheableIndices = new Set<number>();
//   let count = 0;
//   for (let i = trimmed.length - 2; i >= 0 && count < 3; i--) {
//     cacheableIndices.add(i);
//     count++;
//   }

//   return trimmed.map((m, i) => {
//     const isLast = i === trimmed.length - 1;
//     const shouldCache = !isLast && cacheableIndices.has(i);
//     const content: Record<string, unknown>[] = [];

//     // Add image attachments first (vision)
//     if (m.attachments) {
//       for (const att of m.attachments) {
//         if (att.type === "image") {
//           content.push({
//             type: "image",
//             source: {
//               type: "base64",
//               media_type: att.mimeType,
//               data: att.data,
//             },
//           });
//         }
//       }
//     }

//     // Build text — prepend text-file attachments inline
//     let text = m.content;
//     if (m.attachments) {
//       const textFiles = m.attachments.filter(
//         (a: Attachment) => a.type === "text",
//       );
//       if (textFiles.length > 0) {
//         const block = textFiles
//           .map(
//             (f: Attachment) => `[file: ${f.name}]\n\`\`\`\n${f.data}\n\`\`\``,
//           )
//           .join("\n\n");
//         text = block + "\n\n" + text;
//       }
//     }

//     content.push({
//       type: "text" as const,
//       text,
//       ...(shouldCache && { cache_control: { type: "ephemeral" as const } }),
//     });

//     return { role: m.role, content };
//   });
// }

// export async function streamChat(
//   messages: Message[],
//   apiKey: string,
//   callbacks: StreamCallbacks,
//   abortSignal?: AbortSignal,
//   model = DEFAULT_MODEL,
//   tokenOpts?: { inputTokens?: number; outputTokens?: number },
// ): Promise<void> {
//   const maxOutputTokens = tokenOpts?.outputTokens ?? (model.includes("sonnet") ? 2048 : 2048);

//   if (!apiKey.trim()) {
//     callbacks.onError("No API key set. Click the key icon to configure.");
//     return;
//   }

//   try {
//     const res = await fetch("https://api.anthropic.com/v1/messages", {
//       method: "POST",
//       signal: abortSignal,
//       headers: {
//         "Content-Type": "application/json",
//         "x-api-key": apiKey,
//         "anthropic-version": "2023-06-01",
//         // Enable prompt caching beta
//         "anthropic-beta": "prompt-caching-2024-07-31",
//         // Required for direct browser-to-API calls
//         "anthropic-dangerous-direct-browser-access": "true",
//       },
//       body: JSON.stringify({
//         model: model,
//         max_tokens: maxOutputTokens,
//         stream: true,
//         system: [
//           {
//             type: "text",
//             text: SYSTEM_PROMPT,
//             // Cache the system prompt on every request
//             cache_control: { type: "ephemeral" },
//           },
//         ],
//         messages: buildApiMessages(messages, tokenOpts?.inputTokens),
//       }),
//     });

//     if (!res.ok) {
//       const body = await res.text();
//       let detail = `HTTP ${res.status}`;
//       try {
//         detail =
//           (JSON.parse(body) as { error?: { message?: string } }).error
//             ?.message ?? detail;
//       } catch {
//         console.warn("Failed to parse error response:", body);
//       }
//       callbacks.onError(detail);
//       return;
//     }

//     const reader = res.body?.getReader();
//     const dec = new TextDecoder();
//     if (!reader) {
//       callbacks.onError("No response stream.");
//       return;
//     }

//     let tokens: Message["tokens"] = {
//       input: 0,
//       output: 0,
//       cacheRead: 0,
//       cacheWrite: 0,
//     };
//     let buf = "";

//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) break;
//       buf += dec.decode(value, { stream: true });

//       const lines = buf.split("\n");
//       buf = lines.pop() ?? "";

//       for (const line of lines) {
//         if (!line.startsWith("data: ")) continue;
//         const payload = line.slice(6).trim();
//         if (payload === "[DONE]") continue;
//         try {
//           const evt = JSON.parse(payload) as {
//             type: string;
//             delta?: { text?: string };
//             usage?: {
//               output_tokens?: number;
//               input_tokens?: number;
//               cache_read_input_tokens?: number;
//               cache_creation_input_tokens?: number;
//             };
//             message?: {
//               usage?: {
//                 input_tokens?: number;
//                 cache_read_input_tokens?: number;
//                 cache_creation_input_tokens?: number;
//               };
//             };
//           };

//           if (evt.type === "content_block_delta" && evt.delta?.text) {
//             callbacks.onChunk(evt.delta.text);
//           }
//           if (evt.type === "message_start" && evt.message?.usage) {
//             const u = evt.message.usage;
//             tokens = {
//               ...tokens,
//               input: u.input_tokens ?? 0,
//               cacheRead: u.cache_read_input_tokens ?? 0,
//               cacheWrite: u.cache_creation_input_tokens ?? 0,
//             };
//           }
//           if (evt.type === "message_delta" && evt.usage) {
//             tokens = { ...tokens, output: evt.usage.output_tokens ?? 0 };
//           }
//         } catch {
//           console.warn("Failed to parse event:", payload);
//         }
//       }
//     }

//     callbacks.onDone(tokens);
//   } catch (err) {
//     if ((err as { name?: string }).name === "AbortError") return;
//     callbacks.onError(err instanceof Error ? err.message : "Unexpected error");
//   }
// }


/**
 * api.ts — AI completion via the ARC backend (/completion SSE endpoint).
 *
 * WHAT CHANGED FROM THE OLD VERSION:
 *   - streamChat now POSTs to /completion on our backend (SSE)
 *   - provider + chatId are new params
 *   - apiKey is optional — free-tier models use the backend key
 *
 * WHAT STAYS THE SAME:
 *   - StreamCallbacks interface identical
 *   - streamChatDirect() kept for offline/bypass fallback
 *   - MODELS / DEFAULT_MODEL exported for backward compat
 */

import type { Message } from "./types";
import { API_BASE, getToken } from "./auth";

export interface ModelOption {
  id: string;
  label: string;
}

export const MODELS: ModelOption[] = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
];

// Default to free tier Gemini model
export const DEFAULT_MODEL = "gemini-2.0-flash";
export const DEFAULT_PROVIDER = "gemini-free";

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (tokens: Message["tokens"]) => void;
  onError: (msg: string) => void;
}

// ---------------------------------------------------------------------------
// streamChat — routes through backend /completion (SSE)
// ---------------------------------------------------------------------------
export async function streamChat(
  messages: Message[],
  apiKey: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  provider = DEFAULT_PROVIDER,
  model = DEFAULT_MODEL,
  chatId?: string,
  _tokenOpts?: { inputTokens?: number; outputTokens?: number },
): Promise<void> {
  const token = getToken();
  if (!token) {
    callbacks.onError("Not authenticated. Please log in again.");
    return;
  }

  const plainMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  try {
    const res = await fetch(`${API_BASE}/completion`, {
      method: "POST",
      signal: abortSignal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatId,
        messages: plainMessages,
        provider,
        model,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let detail = `HTTP ${res.status}`;
      try { detail = (JSON.parse(body) as { error?: string }).error ?? detail; } catch { /* ignore */ }
      callbacks.onError(detail);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { callbacks.onError("No response stream."); return; }

    const dec = new TextDecoder();
    let buf = "";
    let tokens: Message["tokens"] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

    // SSE parser — tracks current event name, then processes data lines
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      const lines = buf.split("\n");
      buf = lines.pop() ?? "";  // keep incomplete last line

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload) as {
              text?: string;
              message?: string;
              messageId?: string;
              tokens?: number;
            };

            if (currentEvent === "chunk" && evt.text) {
              callbacks.onChunk(evt.text);
            } else if (currentEvent === "done") {
              tokens = { input: 0, output: evt.tokens ?? 0, cacheRead: 0, cacheWrite: 0 };
              callbacks.onDone(tokens);
              return;
            } else if (currentEvent === "error") {
              callbacks.onError(evt.message ?? "Stream error from provider");
              return;
            }
          } catch { /* skip malformed */ }
        } else if (line === "") {
          // blank line = end of SSE event, reset currentEvent
          currentEvent = "";
        }
      }
    }

    callbacks.onDone(tokens);
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err.message : "Unexpected error");
  }
}

// ---------------------------------------------------------------------------
// streamChatDirect — direct-to-Anthropic fallback (no backend needed)
// Call this instead of streamChat() for pure browser mode.
// ---------------------------------------------------------------------------
export async function streamChatDirect(
  messages: Message[],
  apiKey: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  model = DEFAULT_MODEL,
  tokenOpts?: { inputTokens?: number; outputTokens?: number },
): Promise<void> {
  const maxOutputTokens = tokenOpts?.outputTokens ?? 2048;

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
        "anthropic-beta": "prompt-caching-2024-07-31",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxOutputTokens,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let detail = `HTTP ${res.status}`;
      try { detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? detail; } catch { /* ignore */ }
      callbacks.onError(detail);
      return;
    }

    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    if (!reader) { callbacks.onError("No response stream."); return; }

    let tokens: Message["tokens"] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
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
            usage?: { output_tokens?: number; input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
            message?: { usage?: { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } };
          };
          if (evt.type === "content_block_delta" && evt.delta?.text) callbacks.onChunk(evt.delta.text);
          if (evt.type === "message_start" && evt.message?.usage) {
            const u = evt.message.usage;
            tokens = { ...tokens, input: u.input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
          }
          if (evt.type === "message_delta" && evt.usage) {
            tokens = { ...tokens, output: evt.usage.output_tokens ?? 0 };
          }
        } catch { /* skip */ }
      }
    }

    callbacks.onDone(tokens);
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err.message : "Unexpected error");
  }
}