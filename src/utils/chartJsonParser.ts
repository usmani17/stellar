/**
 * Parse chart-json blocks (Recharts format from Pixis visualize skill).
 * Same schema as Pixis-Ai-Agent chat-ui.
 */

import type { CampaignDraftData, TodoItem, SubagentStep } from "../services/ai/pixisChat";

export type ChartType = "bar" | "line" | "pie" | "area";

export interface ChartConfig {
  type: ChartType;
  title?: string;
  data: Record<string, string | number>[];
  dataKeys: { x: string; series: string[] };
}

export function parseChartJson(jsonStr: string): ChartConfig | null {
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const type = parsed.type as string;
    const validTypes: ChartType[] = ["bar", "line", "pie", "area"];
    if (!type || !validTypes.includes(type as ChartType)) return null;

    let data: Record<string, string | number>[] = [];
    let dataKeys: { x: string; series: string[] };

    if (Array.isArray(parsed.data) && parsed.data.length > 0 && parsed.dataKeys) {
      const dk = parsed.dataKeys as Record<string, unknown>;
      data = parsed.data as Record<string, string | number>[];
      dataKeys = {
        x: String(dk.x ?? "name"),
        series: Array.isArray(dk.series) ? dk.series.map(String) : [],
      };
      if (dataKeys.series.length === 0) return null;
      data = data.map((row) => {
        const out: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] =
            typeof v === "number"
              ? v
              : typeof v === "string" && !Number.isNaN(Number(v))
                ? Number(v)
                : v;
        }
        return out;
      });
    } else if (
      parsed.data &&
      typeof parsed.data === "object" &&
      Array.isArray((parsed.data as Record<string, unknown>).labels) &&
      Array.isArray((parsed.data as Record<string, unknown>).datasets)
    ) {
      const old = parsed.data as {
        labels: string[];
        datasets: Array<{ label: string; data: number[] }>;
      };
      const labels = old.labels;
      const datasets = old.datasets;
      data = labels.map((name, i) => {
        const row: Record<string, string | number> = { name };
        datasets.forEach((ds) => {
          row[ds.label] =
            typeof ds.data[i] === "number" ? ds.data[i] : Number(ds.data[i]) || 0;
        });
        return row;
      });
      dataKeys = { x: "name", series: datasets.map((d) => d.label) };
    } else {
      return null;
    }

    return {
      type: type as ChartType,
      title: String(parsed.title ?? ""),
      data,
      dataKeys,
    };
  } catch {
    return null;
  }
}

export type PdfReportData = {
  url: string;
  title: string;
  generated_at: string;
};

export type DashboardReportComponentSummary = {
  id: string;
  title: string;
  visualization_type: string;
};

export type DashboardReportData = {
  dashboard_id: number;
  name: string;
  account_id: number;
  components_count: number;
  layout: { rows: number; cols: number };
  components: DashboardReportComponentSummary[];
  url: string;
};

export type ContentSegment =
  | { type: "markdown"; content: string }
  | { type: "chart"; config: ChartConfig }
  | { type: "campaign-setup"; data: CampaignDraftData }
  | { type: "pdf-report"; data: PdfReportData }
  | { type: "custom-dashboard"; data: DashboardReportData };



export function parsePdfReportJson(jsonStr: string): PdfReportData | null {
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (typeof parsed.url !== "string" || !parsed.url) return null;
    return {
      url: String(parsed.url),
      title: String(parsed.title ?? "Report"),
      generated_at: String(parsed.generated_at ?? ""),
    };
  } catch {
    return null;
  }
}

export function parseDashboardReportJson(jsonStr: string): DashboardReportData | null {
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (typeof parsed.dashboard_id !== "number" || !parsed.name) return null;
    const layout = parsed.layout as Record<string, number> | undefined;
    const components = Array.isArray(parsed.components)
      ? (parsed.components as DashboardReportComponentSummary[]).map((c) => ({
          id: String(c.id ?? ""),
          title: String(c.title ?? ""),
          visualization_type: String(c.visualization_type ?? "table"),
        }))
      : [];
    return {
      dashboard_id: parsed.dashboard_id as number,
      name: String(parsed.name),
      account_id: (parsed.account_id as number) ?? 0,
      components_count: (parsed.components_count as number) ?? components.length,
      layout: {
        rows: layout?.rows ?? 2,
        cols: layout?.cols ?? 2,
      },
      components,
      url: String(parsed.url ?? ""),
    };
  } catch {
    return null;
  }
}

export function parseCampaignSetupJson(jsonStr: string): CampaignDraftData | null {
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (
      typeof parsed.platform !== "string" &&
      typeof parsed.campaign_type !== "string"
    )
      return null;
    return {
      draft_id: String(parsed.draft_id ?? ""),
      platform: String(parsed.platform ?? ""),
      campaign_type: String(parsed.campaign_type ?? ""),
      complete: Boolean(parsed.complete),
      draft: (parsed.draft as Record<string, Record<string, unknown>>) ?? {},
      questions:
        (parsed.questions as Record<string, Record<string, string>>) ?? {},
      keys_for_form: Array.isArray(parsed.keys_for_form)
        ? parsed.keys_for_form.map(String)
        : [],
      validation_error:parsed.validation_error as string | null,
    };
  } catch {
    return null;
  }
}

const EVENT_STREAM_TYPES = new Set([
  "system",
  "user",
  "thinking",
  "assistant",
  "tool_call",
  "result",
  "campaign-draft",
]);

/**
 * Detect if value is a JSON array of agent events (event stream format).
 */
export function isEventStream(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    const first = parsed[0] as Record<string, unknown>;
    return (
      first &&
      typeof first === "object" &&
      typeof first.type === "string" &&
      EVENT_STREAM_TYPES.has(first.type)
    );
  } catch {
    return false;
  }
}

/** Timeline item shape for building display from stored events (matches PixisTimelineItem) */
export type EventStreamTimelineItem =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; call_id?: string; label: string; status: "running" | "completed" }
  | { type: "text"; content: string }
  | { type: "todo_update"; todos: TodoItem[]; merge: boolean }
  | { type: "subagent"; call_id: string; description: string; subagentType?: string; model?: string; status: "running" | "completed"; steps?: SubagentStep[]; durationMs?: number };

function extractToolLabelFromEvent(tc: Record<string, unknown>): string {
  const toolKey = Object.keys(tc).find((k) => k.endsWith("ToolCall"));
  if (!toolKey) return "Processing...";
  const inner = tc[toolKey] as Record<string, unknown> | undefined;
  const desc = inner?.description;
  if (typeof desc === "string" && desc.trim()) return desc;
  const args = inner?.args as Record<string, unknown> | undefined;
  switch (toolKey) {
    case "shellToolCall": return "Processing...";
    case "readToolCall": { const p = (args?.path as string) ?? ""; return `Reading ${p.split("/").pop() ?? "file"}`; }
    case "writeToolCall": { const p = (args?.path as string) ?? ""; return `Writing ${p.split("/").pop() ?? "file"}`; }
    case "editToolCall": { const p = (args?.path as string) ?? ""; return `Editing ${p.split("/").pop() ?? "file"}`; }
    case "globToolCall": return "Searching files...";
    case "grepToolCall": return "Searching code...";
    default: return "Processing...";
  }
}

function parseSubagentStepsFromHistory(rawSteps?: unknown[]): SubagentStep[] {
  if (!Array.isArray(rawSteps)) return [];
  return rawSteps.map((step) => {
    const s = step as Record<string, unknown>;
    if (s.toolCall) {
      const tc = s.toolCall as Record<string, unknown>;
      const toolKey = Object.keys(tc).find((k) => k.endsWith("ToolCall"));
      const label = toolKey ? extractToolLabelFromEvent(tc) : "Tool call";
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

/**
 * Build timeline items from stored event stream for history display.
 * Handles all event types: thinking, tool_call (with call_id), todo_update, subagent, text.
 */
export function eventsToTimeline(events: unknown[]): EventStreamTimelineItem[] {
  if (!Array.isArray(events)) return [];
  const out: EventStreamTimelineItem[] = [];
  const evArr = events as Array<Record<string, unknown>>;
  const toolCallMap = new Map<string, number>();
  const subagentMap = new Map<string, number>();
  let todoList: TodoItem[] = [];

  for (const ev of evArr) {
    if (ev.type === "thinking") {
      const content = ev.content ?? ev.text;
      if (typeof content === "string" && content.trim()) {
        out.push({ type: "thinking", content });
      }
      continue;
    }

    if (ev.type === "tool_call") {
      const tc = ev.tool_call as Record<string, unknown> | undefined;
      if (!tc) continue;
      const callId = ev.call_id as string | undefined;
      const toolKey = Object.keys(tc).find((k) => k.endsWith("ToolCall"));

      if (toolKey === "updateTodosToolCall" && ev.subtype === "completed") {
        const inner = tc[toolKey] as { args?: { todos?: TodoItem[]; merge?: boolean } };
        const todos = inner?.args?.todos ?? [];
        const merge = inner?.args?.merge ?? false;
        if (merge) {
          const byId = new Map(todoList.map((t) => [t.id, t]));
          for (const todo of todos) byId.set(todo.id, todo);
          todoList = Array.from(byId.values());
        } else {
          todoList = [...todos];
        }
        const existingIdx = out.findIndex((o) => o.type === "todo_update");
        const item: EventStreamTimelineItem = { type: "todo_update", todos: [...todoList], merge };
        if (existingIdx >= 0) {
          out[existingIdx] = item;
        } else {
          out.push(item);
        }
        continue;
      }

      if (toolKey === "taskToolCall") {
        const inner = tc[toolKey] as { args?: { description?: string; subagentType?: { custom?: { name?: string } }; model?: string }; result?: { success?: { conversationSteps?: unknown[]; durationMs?: number } } };
        const desc = inner?.args?.description ?? "Subagent";
        const satName = inner?.args?.subagentType?.custom?.name;
        const model = inner?.args?.model;

        if (ev.subtype === "completed" && callId) {
          const result = inner?.result?.success;
          const steps = parseSubagentStepsFromHistory(result?.conversationSteps);
          const item: EventStreamTimelineItem = { type: "subagent", call_id: callId, description: desc, subagentType: satName, model, status: "completed", steps, durationMs: result?.durationMs };
          const existingIdx = subagentMap.get(callId);
          if (existingIdx != null) {
            out[existingIdx] = item;
          } else {
            subagentMap.set(callId, out.length);
            out.push(item);
          }
        } else if (ev.subtype === "started" && callId) {
          subagentMap.set(callId, out.length);
          out.push({ type: "subagent", call_id: callId, description: desc, subagentType: satName, model, status: "completed" });
        }
        continue;
      }

      if (ev.subtype === "completed" && callId) {
        const label = extractToolLabelFromEvent(tc);
        const existingIdx = toolCallMap.get(callId);
        const item: EventStreamTimelineItem = { type: "tool_call", call_id: callId, label, status: "completed" };
        if (existingIdx != null) {
          out[existingIdx] = item;
        } else {
          toolCallMap.set(callId, out.length);
          out.push(item);
        }
      } else if (ev.subtype === "started" && callId) {
        const label = extractToolLabelFromEvent(tc);
        toolCallMap.set(callId, out.length);
        out.push({ type: "tool_call", call_id: callId, label, status: "completed" });
      } else if (typeof ev.label === "string") {
        out.push({ type: "tool_call", label: ev.label, status: "completed" });
      }
      continue;
    }
  }

  const displayText = extractDisplayContentFromEvents(events);
  if (displayText) {
    out.push({ type: "text", content: displayText });
  }

  return out;
}

/**
 * Extract display text from event stream for rendering.
 * Uses result event's full_message/result, or concatenates assistant text chunks.
 */
export function extractDisplayContentFromEvents(events: unknown[]): string {
  if (!Array.isArray(events)) return "";
  const evArr = events as Array<Record<string, unknown>>;
  const resultEv = [...evArr].reverse().find((e) => e.type === "result");
  let out = "";
  if (resultEv) {
    const full = resultEv.full_message ?? resultEv.result;
    if (typeof full === "string") out = full;
  }
  if (!out) {
    const parts: string[] = [];
    for (const ev of evArr) {
      if (ev.type === "assistant") {
        const content = ev.message as { content?: Array<{ text?: string }> } | undefined;
        const text = content?.content?.[0]?.text;
        if (typeof text === "string") parts.push(text);
      }
    }
    out = parts.join("");
  }
  return out;
}

export function parseContentWithBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  const blockRe = /```(chart-json|campaign-setup|pdf-report|docx-report|custom-dashboard)\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = blockRe.exec(raw)) !== null) {
    const mdPart = raw.slice(lastIndex, match.index);
    if (mdPart) segments.push({ type: "markdown", content: mdPart });

    const blockType = match[1].toLowerCase();
    const inner = match[2].trim();

    if (blockType === "chart-json") {
      const config = parseChartJson(inner);
      if (config) segments.push({ type: "chart", config });
    } else if (blockType === "campaign-setup") {
      const data = parseCampaignSetupJson(inner);
      if (data) segments.push({ type: "campaign-setup", data });
    } else if (blockType === "pdf-report" || blockType === "docx-report") {
      const data = parsePdfReportJson(inner);
      if (data) segments.push({ type: "pdf-report", data });
    } else if (blockType === "custom-dashboard") {
      const data = parseDashboardReportJson(inner);
      if (data) segments.push({ type: "custom-dashboard", data });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = raw.slice(lastIndex);
  if (remaining) segments.push({ type: "markdown", content: remaining });

  // Strip duplicate "View Dashboard" links from markdown when custom-dashboard block is present
  // (the block renders its own button; markdown would show a blue link duplicate)
  const hasCustomDashboard = segments.some(
    (s) => s.type === "custom-dashboard"
  );
  if (hasCustomDashboard) {
    const viewDashboardLinkRe = /\s*\[View Dashboard\]\([^)]+\)\s*/gi;
    return segments.map((seg) => {
      if (seg.type === "markdown") {
        return {
          ...seg,
          // Only collapse horizontal spaces, not newlines — otherwise markdown formatting is destroyed
          content: seg.content.replace(viewDashboardLinkRe, " ").replace(/[ \t]{2,}/g, " ").trim(),
        };
      }
      return seg;
    });
  }
  return segments;
}


/**
 * Find the last campaign-setup block in content and convert to DerivedCampaignSetupState.
 * Used by AssistantContext to derive form schema when the backend doesn't provide it.
 */
export function deriveCampaignStateFromContent(
  content: string
): CampaignDraftData | null {
  const segments = parseContentWithBlocks(content);
  const setupSeg = [...segments].reverse().find((s) => s.type === "campaign-setup");
  if (!setupSeg || setupSeg.type !== "campaign-setup") return null;
  const data = setupSeg.data;

  return data;
}
