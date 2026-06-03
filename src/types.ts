export type Role = "user" | "assistant";

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "text";
  data: string;
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  tokens?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  error?: boolean;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  createdAt: number;
  // NEW — multi-provider fields
  provider?: string;     // 'anthropic' | 'openai' | 'google' | ...
  model?: string;        // 'claude-sonnet-4-6' | 'gpt-4o' | ...
  is_free_tier?: boolean;
}