import api from "./api";
import { getAccountIdFromStorage } from "../utils/urlHelpers";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export interface AgentChatResponse {
  status: number;
  auth_failed?: boolean;
  response: string;
  messages?: unknown[];
  intent?: string;
  campaign_id?: string;
  campaign_resource_name?: string;
  last_error?: string;
}

export interface AgentStreamEvent {
  type: "status" | "response" | "error";
  message?: string;
  content?: string;
  status?: number;
  auth_failed?: boolean;
  intent?: string;
  campaign_id?: string;
  last_error?: string;
  suggested_options?: string[];
  state?: Record<string, unknown>;
}

export interface AgentResponsePayload {
  content: string;
  suggestedOptions?: string[];
  state?: Record<string, unknown>;
}

export async function sendAgentMessage(
  message: string,
  options?: {
    history?: { role: string; content: string }[];
    state?: Record<string, unknown>;
  },
): Promise<AgentChatResponse> {
  const accountId = getAccountIdFromStorage();
  const { data } = await api.post<AgentChatResponse>(
    "/google-campaign-agent/chat/",
    {
      message,
      ...(accountId != null ? { account_id: accountId } : {}),
      history: options?.history,
      state: options?.state,
    },
  );
  return data;
}

/**
 * Stream agent response via Server-Sent Events.
 * Pass history and state for conversational turns.
 */
export async function sendAgentMessageStream(
  message: string,
  callbacks: {
    onStatus: (message: string) => void;
    onResponse: (payload: AgentResponsePayload) => void;
    onError: (message: string) => void;
  },
  options?: {
    history?: { role: string; content: string }[];
    state?: Record<string, unknown>;
  },
): Promise<void> {
  const token = localStorage.getItem("accessToken");
  const accountId = getAccountIdFromStorage();
  const res = await fetch(
    `${API_BASE_URL}/google-campaign-agent/chat/stream/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        ...(accountId != null ? { account_id: accountId } : {}),
        history: options?.history,
        state: options?.state,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    callbacks.onError((err as { error?: string }).error || "Request failed");
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6)) as AgentStreamEvent;
            if (data.type === "status" && data.message)
              callbacks.onStatus(data.message);
            else if (data.type === "response")
              callbacks.onResponse({
                content: data.content ?? "",
                suggestedOptions: data.suggested_options,
                state: data.state,
              });
            else if (data.type === "error" && data.message)
              callbacks.onError(data.message);
          } catch {
            // ignore parse errors for incomplete chunks
          }
        }
      }
    }
    if (buffer.startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.slice(6)) as AgentStreamEvent;
        if (data.type === "status" && data.message)
          callbacks.onStatus(data.message);
        else if (data.type === "response")
          callbacks.onResponse({
            content: data.content ?? "",
            suggestedOptions: data.suggested_options,
            state: data.state,
          });
        else if (data.type === "error" && data.message)
          callbacks.onError(data.message);
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}
