/**
 * Parse chart-json blocks (Recharts format from Pixis visualize skill).
 * Same schema as Pixis-Ai-Agent chat-ui.
 */

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

export type ContentSegment =
  | { type: "markdown"; content: string }
  | { type: "chart"; config: ChartConfig }
  | { type: "campaign-setup"; data: CampaignSetupData };

export interface CampaignSetupData {
  draft_id: string;
  platform: string;
  campaign_type: string;
  complete: boolean;
  draft: Record<string, Record<string, unknown>>;
  questions: Record<string, Record<string, string>>;
  keys_for_form: string[];
  validation_error: Record<string, string> | null;
}

export function parseCampaignSetupJson(jsonStr: string): CampaignSetupData | null {
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
      validation_error:
        (parsed.validation_error as Record<string, string> | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function parseContentWithBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  const blockRe = /```(chart-json|campaign-setup)\s*\n([\s\S]*?)\n```/g;
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
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = raw.slice(lastIndex);
  if (remaining) segments.push({ type: "markdown", content: remaining });
  return segments;
}

/** Campaign setup state derived from message content. */
export interface DerivedCampaignSetupState {
  campaign_draft?: Record<string, unknown>;
  campaign_type?: string;
  draft_setup_json?: Record<string, unknown>;
  validation_errors?: string[];
  current_questions_schema?: Array<{ key: string; label?: string; type: string; ui_hint: string }>;
}

/**
 * Find the last campaign-setup block in content and convert to DerivedCampaignSetupState.
 * Used by AssistantContext to derive form schema when the backend doesn't provide it.
 */
export function deriveCampaignStateFromContent(
  content: string
): DerivedCampaignSetupState | null {
  const segments = parseContentWithBlocks(content);
  const setupSeg = [...segments].reverse().find((s) => s.type === "campaign-setup");
  if (!setupSeg || setupSeg.type !== "campaign-setup") return null;
  const data = setupSeg.data;

  const draftFlat: Record<string, unknown> = {};
  for (const [entity, fields] of Object.entries(data.draft)) {
    if (fields && typeof fields === "object") {
      for (const [key, val] of Object.entries(fields)) {
        if (val != null && val !== "") {
          draftFlat[entity ? `${entity}.${key}` : key] = val;
        }
      }
    }
  }

  const validationErrors: string[] = data.validation_error
    ? Object.entries(data.validation_error).map(([k, v]) => `${k}: ${v}`)
    : [];

  const allSchema = Object.entries(data.questions).flatMap(([entity, qs]) =>
    Object.entries(qs || {}).map(([key, hint]) => ({
      key: entity ? `${entity}.${key}` : key,
      label: hint || key,
      type: "string",
      ui_hint: "text",
    }))
  );
  const keysForForm = data.keys_for_form?.length ? new Set(data.keys_for_form) : null;
  const current_questions_schema = keysForForm
    ? allSchema.filter((s) => {
        if (keysForForm.has(s.key)) return true;
        const leafKey = s.key.split(".").pop() ?? s.key;
        return keysForForm.has(leafKey);
      })
    : allSchema;

  return {
    campaign_draft: draftFlat,
    campaign_type: data.campaign_type,
    draft_setup_json: Object.keys(draftFlat).length > 0 ? draftFlat : undefined,
    validation_errors: validationErrors.length > 0 ? validationErrors : undefined,
    current_questions_schema:
      current_questions_schema.length > 0 ? current_questions_schema : undefined,
  };
}
