import type { Platform } from "../../types";
import { type ICampaignDraft as IGoogleCampaignDraft } from "../../types/google/campaignDraft";

/**
 * Pixis AI chat streaming (POST /chat).
 * SSE stream format: data: { type, subtype?, session_id?, message?, ... }
 * Uses VITE_AI_AGENT_BASE_URL.
 */

export interface PixisChatStreamEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  sessionId?: string;
  session_db_id?: string;
  timestamp_ms?: number;
  message?: { content?: Array<{ text?: string }> };
  tool_call?: unknown;
  text?: string;
  full_message?: string;
  // Campaign draft fields
  draft_id?: string;
  platform?: Platform;
  campaign_type?: string;
  complete?: boolean;
  draft?: Platform extends "google" ? IGoogleCampaignDraft : Record<string, unknown>;
  questions?: Record<string, unknown>;
  keys_for_form?: string[];
  validation_error?: string | null;
  [key: string]: unknown;
}

export interface PixisChatParams {
  query: string;
  session_id?: string | null;
  session_db_id?: string | null;
  account_id?: number;
  channel_id?: number;
  profile_id?: string;
  workspace_id?: number;
  user_id?: string;
  platform?: Platform;
  /** Multi-profile analysis: list of { platform, profile_id, channel_id, account_id }. When set, overrides single profile_id. */
  platforms?: Array<{
    platform: string;
    profile_id: string;
    channel_id: number;
    account_id: number;
  }>;
  /** "stream-json" | "stream-json-partial" | "json" — for testing output formats */
  output_format?: string;
}

/** Timeline item for ordered display: thinking | tool_call | text | campaign-draft */
export type PixisTimelineItem =
  | { type: "thinking"; content?: string; timestamp_ms?: number }
  | { type: "tool_call"; label: string; status?: "running" | "completed"; timestamp_ms?: number }
  | { type: "text"; content: string; timestamp_ms?: number }
  | { type: "campaign-draft"; data: CampaignDraftData; timestamp_ms?: number };

/** Campaign draft data from AI agent */
export interface CampaignDraftData {
  draft_id: string;
  platform?: Platform;
  campaign_type: string;
  complete: boolean;
  draft: Platform extends "google" ? IGoogleCampaignDraft : Record<string, unknown>;
  questions: Record<string, unknown>;
  keys_for_form: string[];
  validation_error: string | null;
}

export const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl) throw new Error("VITE_AI_AGENT_BASE_URL is not set");
  return String(baseUrl).replace(/\/$/, "");
};

const is_env_local = (): boolean => {
  const env = import.meta.env.VITE_ENVIRONMENT;
  return env === "local";
}

export async function streamPixisChat(
  params: PixisChatParams,
  accessToken: string,
  callbacks: {
    onInit?: (data: { session_id?: string; session_db_id?: string }) => void;
    onMessage?: (text: string) => void;
    onToolCall?: (label: string) => void;
    /** Called for each timeline item in order: tool_call or text (consumer updates last text item when same type) */
    onTimelineItem?: (item: PixisTimelineItem) => void;
    onCampaignDraft?: (data: CampaignDraftData) => void;
    onResult?: (data: PixisChatStreamEvent) => void;
    onError?: (err: Error) => void;
  },
  options?: { signal?: AbortSignal }
): Promise<{ session_id?: string; session_db_id?: string }> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pixis chat failed: ${res.status} ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buf = "";
  let sessionId: string | undefined;
  let sessionDbId: string | undefined;
  let accumulated = "";
  let thinkingAccumulated = "";

  // Add abort signal listener
  if (options?.signal) {
    const handleAbort = () => {
      console.log("Stream aborted by client signal (event listener)");
      callbacks.onResult?.({ type: "result", aborted: true });
    };
    options.signal.addEventListener("abort", handleAbort, { once: true });
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (options?.signal?.aborted) {
        console.log("Stream aborted by client signal (loop check)");
        // When aborted, trigger cleanup by calling onResult
        callbacks.onResult?.({ type: "result", aborted: true });
        break;
      }
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split(/\n\n|\r\n\r\n/);
      buf = parts.pop() ?? "";

      for (const block of parts) {
        let data = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (!data) continue;
        try {
          const ev: PixisChatStreamEvent = JSON.parse(data);
          const etype = ev.type ?? "";
          const subtype = ev.subtype ?? "";

          if (etype === "system" && subtype === "init") {
            sessionId = ev.session_id ?? ev.sessionId;
            sessionDbId = ev.session_db_id;
            callbacks.onInit?.({ session_id: sessionId, session_db_id: sessionDbId });
          }

          if (etype === "thinking") {
            const text = typeof ev.text === "string" ? ev.text : "";
            if (text || subtype === "completed") {
              thinkingAccumulated = thinkingAccumulated + text;
              if (thinkingAccumulated.trim()) {
                callbacks.onTimelineItem?.({ type: "thinking", content: thinkingAccumulated, timestamp_ms: ev.timestamp_ms });
              }
              if (subtype === "completed") {
                thinkingAccumulated = "";
              }
            }
          }

          if (etype === "assistant") {
            const text = ev.message?.content?.[0]?.text ?? "";
            if (text) {
              accumulated = text.startsWith(accumulated) ? text : accumulated + text;
              callbacks.onMessage?.(accumulated);
              callbacks.onTimelineItem?.({ type: "text", content: accumulated, timestamp_ms: ev.timestamp_ms });
            }
          }

        if (etype === "tool_call" && subtype === "started") {
          const tc = ev.tool_call as { name?: string; shellToolCall?: unknown; readToolCall?: { args?: { path?: string } }; writeToolCall?: { args?: { path?: string } } } | undefined;
          let label: string;
          if (is_env_local()) {
            label = `Tool call: ${JSON.stringify(ev.tool_call)}`;
          } else {
            if (typeof tc?.name === "string") {
              label = tc.name;
            } else if (tc?.shellToolCall) {
              label = "Querying datasource...";
            } else if (tc?.readToolCall) {
              const p = tc.readToolCall?.args?.path ?? "";
              label = `Reading: ${p.split("/").pop() ?? "file"}`;
            } else if (tc?.writeToolCall) {
              const p = tc.writeToolCall?.args?.path ?? "";
              label = `Writing: ${p.split("/").pop() ?? "file"}`;
            } else {
              label = "Processing...";
            }
          }
          callbacks.onToolCall?.(label);
          callbacks.onTimelineItem?.({ type: "tool_call", label, timestamp_ms: ev.timestamp_ms });
        }

          if (etype === "campaign-draft") {
            callbacks.onCampaignDraft?.({
              draft_id: ev.draft_id ?? "",
              platform: ev.platform,
              campaign_type: ev.campaign_type ?? "",
              complete: ev.complete ?? false,
              draft: ev.draft ?? {},
              questions: ev.questions ?? {},
              keys_for_form: ev.keys_for_form ?? [],
              validation_error: ev.validation_error ?? null,
            });
          }

          if (etype === "result") {
            callbacks.onResult?.(ev);
          }
        } catch (e) {
          console.error("Error parsing stream event:", e);
          callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
        }
      }
    }
  } catch (e) {
    console.error("Stream reading error:", e);
    if ((e as Error).name === "AbortError") {
      console.log("Stream aborted due to AbortError");
      callbacks.onResult?.({ type: "result", aborted: true });
    } else {
      callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  return { session_id: sessionId, session_db_id: sessionDbId };
}
