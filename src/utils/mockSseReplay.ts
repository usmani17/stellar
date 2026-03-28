/**
 * Dev-only: replay an NDJSON event file through the same callback interface
 * as streamPixisChat(). Used by the "Test SSE" button.
 */
import type {
  PixisChatStreamEvent,
  PixisTimelineItem,
  TodoItem,
  SubagentStep,
  CampaignDraftData,
  StreamPixisChatCallbacks,
} from "../services/ai/pixisChat";

function extractToolLabel(tc: Record<string, unknown>, toolKey?: string): string {
  if (!toolKey) return "Processing...";
  const inner = tc[toolKey] as { args?: Record<string, unknown>; description?: string } | undefined;
  const desc = inner?.description;
  if (typeof desc === "string" && desc.trim()) return desc;
  switch (toolKey) {
    case "shellToolCall": return "Processing...";
    case "readToolCall": { const p = (inner?.args?.path as string) ?? ""; return `Reading ${p.split("/").pop() ?? "file"}`; }
    case "writeToolCall": { const p = (inner?.args?.path as string) ?? ""; return `Writing ${p.split("/").pop() ?? "file"}`; }
    case "editToolCall": { const p = (inner?.args?.path as string) ?? ""; return `Editing ${p.split("/").pop() ?? "file"}`; }
    case "globToolCall": return "Searching files...";
    case "grepToolCall": return "Searching code...";
    default: return "Processing...";
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
      return { toolCall: { toolName: toolKey?.replace("ToolCall", "") ?? "unknown", label, args: inner?.args as Record<string, unknown> | undefined, result: inner?.result } };
    }
    if (s.assistantMessage) {
      const am = s.assistantMessage as { text?: string };
      return { assistantMessage: { text: am.text ?? "" } };
    }
    return { assistantMessage: { text: "" } };
  });
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) { resolve(); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

export async function replayNdjson(
  callbacks: StreamPixisChatCallbacks,
  options?: { speedMultiplier?: number; signal?: AbortSignal }
): Promise<void> {
  const speed = options?.speedMultiplier ?? 20;
  const signal = options?.signal;

  const resp = await fetch("/test-events.ndjson");
  const text = await resp.text();
  const lines = text.split("\n").filter((l) => l.trim());

  let accumulated = "";
  let segmentText = "";
  let lastTs = 0;

  for (const line of lines) {
    if (signal?.aborted) break;

    let ev: PixisChatStreamEvent;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }

    const ts = ev.timestamp_ms ?? 0;
    if (lastTs > 0 && ts > lastTs) {
      const delta = Math.max(1, (ts - lastTs) / speed);
      await sleep(Math.min(delta, 200), signal);
    }
    lastTs = ts || lastTs;

    const etype = ev.type ?? "";
    const subtype = ev.subtype ?? "";

    if (etype === "keepalive") {
      callbacks.onKeepalive?.();
      continue;
    }

    if (etype === "system" && subtype === "init") {
      callbacks.onInit?.({
        session_id: ev.session_id,
        session_db_id: ev.session_db_id,
      });
      continue;
    }

    if (etype === "thinking") continue;

    if (etype === "assistant") {
      const t = ev.message?.content?.[0]?.text ?? "";
      if (t) {
        accumulated = t.startsWith(accumulated) ? t : accumulated + t;
        segmentText = t.startsWith(segmentText) ? t : segmentText + t;
        callbacks.onMessage?.(accumulated);
        callbacks.onTimelineItem?.({
          type: "text",
          content: segmentText,
          timestamp_ms: ev.timestamp_ms,
        });
      }
      continue;
    }

    if (etype === "tool_call") {
      segmentText = "";
      const callId = (ev as Record<string, unknown>).call_id as string | undefined;
      const tc = ev.tool_call as Record<string, unknown> | undefined;
      if (!tc) continue;
      const toolKey = Object.keys(tc).find((k) => k.endsWith("ToolCall"));

      if (toolKey === "updateTodosToolCall") {
        const inner = tc[toolKey] as { args?: { todos?: TodoItem[]; merge?: boolean } };
        const todos = inner?.args?.todos ?? [];
        const merge = inner?.args?.merge ?? false;
        callbacks.onTimelineItem?.({
          type: "todo_update",
          todos,
          merge,
          timestamp_ms: ev.timestamp_ms,
        });
        continue;
      }

      if (toolKey === "taskToolCall") {
        const inner = tc[toolKey] as {
          args?: { description?: string; subagentType?: { custom?: { name?: string } }; model?: string };
          result?: { success?: { conversationSteps?: unknown[]; durationMs?: number } };
        };
        const desc = inner?.args?.description ?? "Subagent";
        const satName = inner?.args?.subagentType?.custom?.name;
        const model = inner?.args?.model;

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
          callbacks.onTimelineItem?.({
            type: "subagent",
            call_id: callId,
            description: desc,
            subagentType: satName,
            model,
            status: "completed",
            steps: parseSubagentSteps(result?.conversationSteps),
            durationMs: result?.durationMs,
            timestamp_ms: ev.timestamp_ms,
          });
        }
        continue;
      }

      const label = extractToolLabel(tc, toolKey);
      if (subtype === "started") {
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
      continue;
    }

    if (etype === "campaign-draft") {
      callbacks.onCampaignDraft?.({
        draft_id: ev.draft_id ?? "",
        platform: ev.platform,
        campaign_type: ev.campaign_type ?? "",
        complete: ev.complete ?? false,
        draft: ev.draft ?? ({} as CampaignDraftData["draft"]),
        questions: ev.questions ?? {},
        keys_for_form: ev.keys_for_form ?? [],
        validation_error: ev.validation_error ?? null,
      });
      continue;
    }

    if (etype === "result") {
      callbacks.onResult?.(ev);
      continue;
    }
  }
}
