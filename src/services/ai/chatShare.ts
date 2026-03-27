/**
 * Chat share service.
 * Authenticated calls use the axios instance (token auto-attached).
 * The public fetch (getSharedChat) uses raw fetch — no auth header.
 */
import api from "../api";
import type { PixisSession } from "./pixisAiSessions";

const API_BASE = "/assistant";

export interface ChatShareRecord {
  share_token: string;
  id: number;
}

/** A single parsed thread turn as returned by the public share endpoint. */
export interface SharedThreadTurn {
  id: string;
  user_query: string;
  /** Extracted final answer text (plain text or markdown). */
  final_text: string;
  /** Ordered list of tool labels used during this turn. */
  tools: string[];
  duration_ms: number | null;
  turn_index: number;
  created_at: string | null;
  model: string | null;
}

export interface SharedChatResponse {
  session_id: string;
  thread_id: string | null;
  session: Pick<PixisSession, "id" | "title" | "model"> & { created_at?: string | null } | null;
  history: SharedThreadTurn[];
  share_type: "public" | "internal" | "workspace";
}

/** Create a share link for an entire chat session. Returns the share token. */
export async function createSessionShare(
  accountId: number,
  sessionId: string,
  expiresAt?: string
): Promise<ChatShareRecord> {
  const { data } = await api.post<ChatShareRecord>(
    `${API_BASE}/${accountId}/sessions/${sessionId}/shares/`,
    expiresAt ? { expires_at: expiresAt } : {}
  );
  return data;
}

/** Create a share link for a single thread turn. Returns the share token. */
export async function createThreadShare(
  accountId: number,
  sessionId: string,
  threadId: string,
  expiresAt?: string
): Promise<ChatShareRecord> {
  const { data } = await api.post<ChatShareRecord>(
    `${API_BASE}/${accountId}/sessions/${sessionId}/threads/${threadId}/shares/`,
    expiresAt ? { expires_at: expiresAt } : {}
  );
  return data;
}

/** Revoke a share link (authenticated). */
export async function revokeChatShare(
  accountId: number,
  sessionId: string,
  shareToken: string
): Promise<void> {
  await api.delete(
    `${API_BASE}/${accountId}/sessions/${sessionId}/shares/${shareToken}/`
  );
}

/**
 * Public — fetch a shared chat by token. No auth header sent.
 * Used by PublicChatPage which is accessible without login.
 */
export async function getSharedChat(shareToken: string): Promise<SharedChatResponse> {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";
  const res = await fetch(`${baseUrl}/assistant/chat/share/${shareToken}/`);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to load shared chat: ${res.status} ${err}`);
  }
  return res.json();
}
