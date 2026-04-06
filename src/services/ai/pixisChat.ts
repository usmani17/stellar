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
  /** Portfolio ID when assistant is opened from a portfolio detail page */
  portfolio_id?: number;
  /** Dashboard ID when assistant is opened from a dashboard page */
  dashboard_id?: number;
  /** "stream-json" | "stream-json-partial" | "json" — for testing output formats */
  output_format?: string;
  /** Session type — 'reanalyze' for autonomous re-analysis sessions */
  session_type?: string;
  /** Selected Google Sheets integrations with full details for agent context */
  google_sheets_integrations?: Array<{
    account_id: number;
    integration_id: number;
    spreadsheet_id?: string;
    spreadsheet_name?: string;
    sheet_name?: string;
    sheet_gid?: string;
    header_row?: number;
    range?: string;
    column_mapping?: Array<{ column_name: string; type: string; ignore: boolean; is_key: boolean; position: number }>;
  }>;
}

/** Todo status values from updateTodosToolCall */
export type TodoStatus =
  | "TODO_STATUS_PENDING"
  | "TODO_STATUS_IN_PROGRESS"
  | "TODO_STATUS_COMPLETE"
  | "TODO_STATUS_COMPLETED"
  | "TODO_STATUS_CANCELLED";

export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
}

/** A single step inside a subagent's conversationSteps trace */
export interface SubagentStep {
  toolCall?: {
    toolName: string;
    label: string;
    args?: Record<string, unknown>;
    result?: unknown;
  };
  assistantMessage?: { text: string };
}

/** Timeline item for ordered display */
export type PixisTimelineItem =
  | { type: "thinking"; content?: string; timestamp_ms?: number }
  | {
      type: "tool_call";
      call_id?: string;
      label: string;
      status: "running" | "completed";
      args?: unknown;
      result?: unknown;
      timestamp_ms?: number;
    }
  | { type: "text"; content: string; timestamp_ms?: number }
  | { type: "campaign-draft"; data: CampaignDraftData; timestamp_ms?: number }
  | {
      type: "todo_update";
      todos: TodoItem[];
      merge: boolean;
      timestamp_ms?: number;
    }
  | {
      type: "subagent";
      call_id: string;
      description: string;
      subagentType?: string;
      model?: string;
      status: "running" | "completed";
      steps?: SubagentStep[];
      durationMs?: number;
      timestamp_ms?: number;
    };

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

function extractToolLabel(tc: Record<string, unknown>, toolKey?: string): string {
  if (!toolKey) return "Processing...";
  const inner = tc[toolKey] as { args?: Record<string, unknown>; description?: string } | undefined;
  const desc = inner?.description;
  if (typeof desc === "string" && desc.trim()) return desc;

  switch (toolKey) {
    case "shellToolCall":
      return "Processing...";
    case "readToolCall": {
      const p = (inner?.args?.path as string) ?? "";
      return `Reading ${p.split("/").pop() ?? "file"}`;
    }
    case "writeToolCall": {
      const p = (inner?.args?.path as string) ?? "";
      return `Writing ${p.split("/").pop() ?? "file"}`;
    }
    case "editToolCall": {
      const p = (inner?.args?.path as string) ?? "";
      return `Editing ${p.split("/").pop() ?? "file"}`;
    }
    case "globToolCall": {
      const pat = (inner?.args?.globPattern as string) ?? (inner?.args?.glob_pattern as string) ?? "";
      return pat ? `Searching files: ${pat}` : "Searching files...";
    }
    case "grepToolCall": {
      const pat = (inner?.args?.pattern as string) ?? "";
      return pat ? `Searching code: ${pat.slice(0, 40)}` : "Searching code...";
    }
    default:
      return "Processing...";
  }
}

function parseSubagentSteps(rawSteps?: unknown[]): SubagentStep[] {
  if (!Array.isArray(rawSteps)) return [];
  return rawSteps.map((step) => {
    const s = step as Record<string, unknown>;
    if (s.toolCall) {
      const tc = s.toolCall as Record<string, unknown>;
      const toolKey = Object.keys(tc).find((k) => k.endsWith("ToolCall"));
      const label = toolKey ? extractToolLabel(tc, toolKey) : "Tool call";
      const inner = toolKey ? (tc[toolKey] as Record<string, unknown>) : {};
      return {
        toolCall: {
          toolName: toolKey?.replace("ToolCall", "") ?? "unknown",
          label,
          args: inner?.args as Record<string, unknown> | undefined,
          result: inner?.result,
        },
      };
    }
    if (s.assistantMessage) {
      const am = s.assistantMessage as { text?: string };
      return { assistantMessage: { text: am.text ?? "" } };
    }
    return { assistantMessage: { text: "" } };
  });
}

export type StreamPixisChatCallbacks = {
  onInit?: (data: { session_id?: string; session_db_id?: string }) => void;
  onMessage?: (text: string) => void;
  onToolCall?: (label: string) => void;
  onTimelineItem?: (item: PixisTimelineItem) => void;
  onCampaignDraft?: (data: CampaignDraftData) => void;
  onResult?: (data: PixisChatStreamEvent) => void;
  onError?: (err: Error) => void;
  onKeepalive?: (runningSubagents?: { call_id: string; description: string; subagentType?: string; elapsed_ms: number }[]) => void;
};

export async function streamPixisChat(
  params: PixisChatParams,
  accessToken: string,
  callbacks: StreamPixisChatCallbacks,
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
  let segmentText = "";
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

          if (etype === "keepalive") {
            const rs = ev.running_subagents as { call_id: string; description: string; subagentType?: string; elapsed_ms: number }[] | undefined;
            callbacks.onKeepalive?.(Array.isArray(rs) ? rs : undefined);
            continue;
          }

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
              segmentText = text.startsWith(segmentText) ? text : segmentText + text;
              callbacks.onMessage?.(accumulated);
              callbacks.onTimelineItem?.({ type: "text", content: segmentText, timestamp_ms: ev.timestamp_ms });
            }
          }

          if (etype === "tool_call") {
            segmentText = "";
            const callId = (ev as Record<string, unknown>).call_id as string | undefined;
            const tc = ev.tool_call as Record<string, unknown> | undefined;
            if (!tc) continue;

            const toolKey = Object.keys(tc).find((k) => k.endsWith("ToolCall"));

            if (toolKey === "updateTodosToolCall") {
              const inner = tc[toolKey] as { args?: { todos?: TodoItem[]; merge?: boolean }; result?: unknown };
              const todos = inner?.args?.todos ?? [];
              const merge = inner?.args?.merge ?? false;
              if (subtype === "completed" || subtype === "started") {
                callbacks.onTimelineItem?.({ type: "todo_update", todos, merge, timestamp_ms: ev.timestamp_ms });
              }
              continue;
            }

            if (toolKey === "taskToolCall") {
              const inner = tc[toolKey] as {
                args?: { description?: string; subagentType?: { custom?: { name?: string } }; model?: string };
                result?: { success?: { conversationSteps?: unknown[]; durationMs?: number } };
              };
              const args = inner?.args;
              const desc = args?.description ?? "Subagent";
              const satName = args?.subagentType?.custom?.name;
              const model = args?.model;

              if (subtype === "started" && callId) {
                callbacks.onTimelineItem?.({
                  type: "subagent",
                  call_id: callId,
                  description: desc,
                  subagentType: satName,
                  model,
                  status: "running",
                  timestamp_ms: ev.timestamp_ms,
                });
              } else if (subtype === "completed" && callId) {
                const result = inner?.result?.success;
                const steps = parseSubagentSteps(result?.conversationSteps);
                callbacks.onTimelineItem?.({
                  type: "subagent",
                  call_id: callId,
                  description: desc,
                  subagentType: satName,
                  model,
                  status: "completed",
                  steps,
                  durationMs: result?.durationMs,
                  timestamp_ms: ev.timestamp_ms,
                });
              }
              continue;
            }

            const label = extractToolLabel(tc, toolKey);
            if (subtype === "started") {
              callbacks.onToolCall?.(label);
              callbacks.onTimelineItem?.({
                type: "tool_call",
                call_id: callId,
                label,
                status: "running",
                timestamp_ms: ev.timestamp_ms,
              });
            } else if (subtype === "completed") {
              callbacks.onTimelineItem?.({
                type: "tool_call",
                call_id: callId,
                label,
                status: "completed",
                timestamp_ms: ev.timestamp_ms,
              });
            }
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
