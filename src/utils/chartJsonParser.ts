/**
 * Parse chart-json blocks (Recharts format from Pixis visualize skill).
 * Same schema as Pixis-Ai-Agent chat-ui.
 */

import type { CampaignDraftData } from "../services/ai/pixisChat";

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

export type ContentSegment =
  | { type: "markdown"; content: string }
  | { type: "chart"; config: ChartConfig }
  | { type: "campaign-setup"; data: CampaignDraftData }
  | { type: "pdf-report"; data: PdfReportData };



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
  | { type: "tool_call"; label: string }
  | { type: "text"; content: string };

/**
 * Build timeline items from stored event stream for history display.
 * Enables Thoughts + Ran tools to render the same as live streaming.
 * Preserves chronological order: thinking, tool_call, then text at end.
 */
export function eventsToTimeline(events: unknown[]): EventStreamTimelineItem[] {
  if (!Array.isArray(events)) return [];
  const out: EventStreamTimelineItem[] = [];
  const evArr = events as Array<Record<string, unknown>>;

  for (const ev of evArr) {
    if (ev.type === "thinking") {
      const content = ev.content ?? ev.text;
      if (typeof content === "string" && content.trim()) {
        out.push({ type: "thinking", content });
      }
    } else if (ev.type === "tool_call" && typeof ev.label === "string") {
      out.push({ type: "tool_call", label: ev.label });
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
  const blockRe = /```(chart-json|campaign-setup|pdf-report)\s*\n([\s\S]*?)\n```/g;
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
    } else if (blockType === "pdf-report") {
      const data = parsePdfReportJson(inner);
      if (data) segments.push({ type: "pdf-report", data });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = raw.slice(lastIndex);
  if (remaining) segments.push({ type: "markdown", content: remaining });
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
