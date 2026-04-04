export type Role = "user" | "assistant";

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "text";
  data: string; // base64 for images, text content for text files
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number; // Date.now()
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
}