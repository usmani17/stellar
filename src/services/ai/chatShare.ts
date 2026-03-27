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

/** A single thread turn as returned by the public share endpoint.
 *  final_message is the raw JSON event-stream string stored in the DB —
 *  parse it with isEventStream / extractDisplayContentFromEvents / eventsToTimeline
 *  (same functions used in AssistantContext.tsx) for rendering. */
export interface SharedThreadTurn {
  id: string;
  user_query: string;
  /** Raw JSON event-stream string from cur_session_threads.final_message. */
  final_message: string | null;
  duration_ms: number | null;
  turn_index: number;
  created_at: string | null;
  model: string | null;
}

export interface SharedSessionProfile {
  account_name: string;
  platform: string;
}

export interface SharedChatResponse {
  session_id: string;
  thread_id: string | null;
  session: Pick<PixisSession, "id" | "title"> & {
    created_at?: string | null;
    account_id?: number | null;
    profiles?: SharedSessionProfile[];
  } | null;
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
