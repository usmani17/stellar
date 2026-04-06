/**
 * Pixis AI sessions service.
 * Talks to Pixis Analyze API (POST /chat, GET /sessions, etc.).
 * Uses VITE_AI_AGENT_BASE_URL.
 */

/** Profile context from session (for single or multi-profile restore). */
export interface PixisSessionProfile {
  account_id?: number | null;
  channel_id?: number | null;
  profile_id?: string | number | null;
  platform?: string | null;
  account_name?: string | null;
  customer_id?: string | null;
  [key: string]: unknown;
}

export interface PixisSession {
  id: string;
  user_id?: string | null;
  workspace_id?: number | null;
  account_id?: number | null;
  channel_id?: number | null;
  profile_id?: string | null;
  model?: string | null;
  modes?: string[] | null;
  title?: string | null;
  cursor_session_id?: string | null;
  created_at?: string;
  last_activity_at?: string;
  updated_at?: string;
  /** Multi-profile context stored when session used multiple profiles. */
  profiles_json?: PixisSessionProfile[] | null;
  /** Session type — e.g. 'chat', 'portfolio_actions', 'reanalyze_portfolio_actions'. */
  type?: string | null;
  /** True when the agent subprocess for this session is still running in the backend. */
  is_running?: boolean;
}

export interface PixisEvent {
  type: "system" | "assistant" | "tool_call" | "result" | "campaign-draft" | string;
  subtype?: string;
  message?: unknown;
  full_message?: string;
  draft_id?: string;
  [key: string]: unknown;
}

export interface PixisThreadHistory {
  id: string;
  user_query: string;
  events: PixisEvent[];
  final_message: string;
  tools_used: unknown[];
  duration_ms: number;
}

export interface PixisHistoryResponse {
  history: PixisThreadHistory[];
  /** True when the agent subprocess for this session is still running in memory.
   * The frontend should auto-reconnect to the live stream when this is true. */
  is_running?: boolean;
}

const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl) {
    throw new Error("VITE_AI_AGENT_BASE_URL is not set");
  }
  return String(baseUrl).replace(/\/$/, "");
};

export function getPixisAiBaseUrl(): string | null {
  const url = import.meta.env.VITE_AI_AGENT_BASE_URL;
  return url ? String(url).replace(/\/$/, "") : null;
}

export const pixisAiSessionsService = {
  list: async (
    accessToken: string,
    options?: { accountId?: number; limit?: number; offset?: number; type?: string }
  ): Promise<{ sessions: PixisSession[] }> => {
    const baseUrl = getBaseUrl();
    const params = new URLSearchParams();
    if (options?.accountId != null) params.set("account_id", String(options.accountId));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.type) params.set("type", options.type);

    const res = await fetch(`${baseUrl}/sessions?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pixis AI sessions list failed: ${res.status} ${err}`);
    }
    return res.json();
  },

  get: async (sessionId: string, accessToken: string): Promise<PixisSession> => {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pixis AI session get failed: ${res.status} ${err}`);
    }
    return res.json();
  },

  getHistory: async (
    sessionId: string,
    accessToken: string
  ): Promise<PixisHistoryResponse> => {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/sessions/${sessionId}/history`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pixis AI session history failed: ${res.status} ${err}`);
    }
    return res.json();
  },

  patch: async (
    sessionId: string,
    updates: { title?: string },
    accessToken: string
  ): Promise<PixisSession> => {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pixis AI session patch failed: ${res.status} ${err}`);
    }
    return res.json();
  },

  delete: async (
    sessionId: string,
    accessToken: string
  ): Promise<{ deleted: boolean; id: string }> => {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pixis AI session delete failed: ${res.status} ${err}`);
    }
    return res.json();
  },

  stop: async (
    sessionDbId: string,
    accessToken: string
  ): Promise<{ ok: boolean; stopped: boolean }> => {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/chat/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ session_db_id: sessionDbId }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pixis AI session stop failed: ${res.status} ${err}`);
    }
    return res.json();
  },
};
