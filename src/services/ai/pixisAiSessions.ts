/**
 * Pixis AI sessions service.
 * Talks to Pixis Analyze API (POST /chat, GET /sessions, etc.).
 * Uses VITE_AI_AGENT_BASE_URL.
 */

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
}

export interface PixisThread {
  id: string;
  session_db_id: string;
  turn_index: number;
  user_query?: string | null;
  final_message?: string | null;
  tools_used?: unknown;
  created_at?: string;
  updated_at?: string;
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
    accountId: number,
    accessToken: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ sessions: PixisSession[] }> => {
    const baseUrl = getBaseUrl();
    const params = new URLSearchParams();
    params.set("account_id", String(accountId));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

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
  ): Promise<{ history: PixisThread[] }> => {
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
};
