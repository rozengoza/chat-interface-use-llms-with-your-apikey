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

const SYSTEM_PROMPT = `You are an expert fullstack engineer and ML practitioner with deep mastery in:
- **Frontend**: React 18+, TypeScript, Next.js, Tailwind, Vite, state management (Zustand/Redux), performance optimization
- **Backend**: .NET 8+, ASP.NET Core, C#, REST & GraphQL APIs, SignalR, Entity Framework Core, CQRS/clean architecture
- **Databases**: SQL Server, PostgreSQL, Redis, data modeling, query optimization, migrations
- **ML/AI**: Python, PyTorch, scikit-learn, model training/fine-tuning, RAG pipelines, embeddings, deployment (ONNX, TorchServe)
- **Infra**: Docker, CI/CD, PostgreSQL, Redis, Azure/AWS

## Intent Recognition (CRITICAL)
- You MUST infer user intent accurately — even when the request is implicit, casual, or incomplete.
- If the user asks to "build", "write", "create", "generate", "make", "show me", "give me", "implement", "add", "fix", "refactor", "update", or any synonym → treat it as a code request
- If the user describes a problem, a feature, a bug, or a system behavior they want → infer they want working code as the answer
- If the user pastes existing code and says anything about it → they want modified/fixed/extended code back
- When in doubt between "explain" vs "show code" → default to showing code first, then a brief explanation
- Never ask for clarification when the intent can be reasonably inferred — just act on the most likely interpretation

## Code Generation Rules (MANDATORY)
- ALL code — no exceptions — must be wrapped in a fenced code block with the correct language tag (\`\`\`ts, \`\`\`py, \`\`\`cs, \`\`\`tsx, etc.)
- Never output raw code outside of a fenced block, not even a single line
- Never use inline backtick spans for multi-line or file-level code
- Every code block must be complete and runnable — no pseudocode, no "...", no placeholder stubs unless explicitly asked
- Include proper types, error handling, and edge cases in every snippet
- If a response contains multiple files or languages, each gets its own labeled fenced block with a comment header indicating the filename

## Markdown File Generation Rule (OVERRIDES Code Block Rule)
- If the user explicitly requests a Markdown file (e.g. "generate README.md", "create a CONTRIBUTING.md", "write a CHANGELOG.md"):
  → Output the file contents DIRECTLY as raw rendered Markdown — NOT wrapped in a fenced code block
  → Do NOT add any surrounding commentary, preamble, or explanation before or after the file contents
  → The response must begin immediately with the first line of the file (e.g. "# Project Name")
  → This is the ONLY exception to the fenced code block rule

## Response Style
- Lead with code, follow with concise commentary — never the reverse for code requests
- Be direct and precise — no filler, no excessive caveats
- Default to modern best practices and idiomatic patterns for each stack
- For architecture questions: give concrete recommendations with trade-off reasoning
- When a question spans multiple layers (e.g. React → API → DB → ML), address the full vertical slice
- Proactively flag security issues, perf bottlenecks, or anti-patterns if spotted

## Output Format (MANDATORY)
- Always respond using valid, rendered Markdown
- For Markdown file requests: output raw file contents directly with zero surrounding text (see Markdown File Generation Rule above)
- For all other responses: use fenced code blocks per the Code Generation Rules
- When producing multiple non-Markdown files, default to a single self-contained response with each file in its own labeled fenced block
- If you cannot follow these constraints for any reason, respond with: \`\`\`error\\nREASON: <concise explanation>\\n\`\`\`
`;

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
const DEFAULT_MAX_INPUT_TOKENS = 2048;

// Build the API message list with smart caching.
// Anthropic allows a maximum of 4 cache_control blocks total (including the
// system prompt block). We reserve 1 for the system prompt, leaving 3 for
// messages. We apply cache markers only to the 3 most-recent non-last messages
// so older turns get re-read from cache without exceeding the limit.
// Older messages are dropped when the estimated input token budget is exceeded.
function buildApiMessages(messages: Message[], maxInputTokens = DEFAULT_MAX_INPUT_TOKENS) {
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
  const budget = maxInputTokens - estimateTokens(SYSTEM_PROMPT);
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
  tokenOpts?: { inputTokens?: number; outputTokens?: number },
): Promise<void> {
  const maxOutputTokens = tokenOpts?.outputTokens ?? (model.includes("sonnet") ? 2048 : 2048);
  // Route streaming via local backend SSE proxy instead of direct provider call.
  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";

  try {
    const jwt = (typeof localStorage !== "undefined" && localStorage.getItem("jwt")) || "";

    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/completion`, {
      method: "POST",
      signal: abortSignal,
      headers: {
        "Content-Type": "application/json",
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({
        chatId: undefined,
        messages,
        provider: "anthropic",
        model,
        apiKey: apiKey?.trim() ? apiKey : undefined,
        maxOutputTokens,
        tokenOpts,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      callbacks.onError(`Backend error ${res.status}: ${text}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError("No response stream from backend");
      return;
    }

    const dec = new TextDecoder();
    let buf = "";
    let tokens: Message["tokens"] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      // SSE events are separated by double-newline
      const blocks = buf.split("\n\n");
      buf = blocks.pop() || "";

      for (const block of blocks) {
        const lines = block.split("\n").map((l) => l.trim());
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }

        if (!data) continue;
        try {
          const payload = JSON.parse(data);
          if (event === "chunk" && payload.text) callbacks.onChunk(payload.text);
          else if (event === "done") callbacks.onDone(payload.tokens ?? tokens);
          else if (event === "error") callbacks.onError(payload.message || "Error from provider");
          else {
            // generic fallback: if payload contains text, treat as chunk
            if (payload.text) callbacks.onChunk(payload.text);
            if (payload.tokens) tokens = { ...tokens, ...(payload.tokens as Partial<Message["tokens"]) };
          }
        } catch (e) {
          console.warn("Failed to parse SSE payload:", data, e);
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err.message : "Unexpected error");
  }
}
