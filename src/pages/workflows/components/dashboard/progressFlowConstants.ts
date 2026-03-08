export type ProgressStep =
  | "fetch"
  | "save"
  | "fetch2"
  | "join"
  | "analyze"
  | "display";

/** Step with custom label for query-derived progress (e.g. "Week 3", "Week 4") */
export interface ProgressStepDef {
  id: string;
  label: string;
}

/** Simple pipeline: fetch → save → analyze → display */
export const SIMPLE_STEPS: ProgressStep[] = ["fetch", "save", "analyze", "display"];

/** Multi-GAQL pipeline: fetch → save → fetch2 → join → analyze → display */
export const MULTI_GAQL_STEPS: ProgressStep[] = [
  "fetch",
  "save",
  "fetch2",
  "join",
  "analyze",
  "display",
];

/** Humanize query id to label: week3 → "Week 3", campaign_insights → "Campaign Insights" */
function humanizeQueryId(id: string): string {
  if (!id) return "Fetch";
  const parts = String(id).split("_");
  return parts
    .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

/** Derive progress steps from component query structure. Supports single (gaql, meta_insights, sql) and multi (multi_gaql, multi_meta). */
export function getStepsFromQuery(query: unknown): ProgressStepDef[] {
  if (!query || typeof query !== "object") {
    return [
      { id: "fetch", label: "Fetch" },
      { id: "save", label: "Save" },
      { id: "analyze", label: "Analyze" },
      { id: "display", label: "Display" },
    ];
  }
  const q = query as Record<string, unknown>;

  if (q.multi_gaql && typeof q.multi_gaql === "object") {
    const multi = q.multi_gaql as { queries?: Array<{ id?: string }> };
    const queries = multi.queries ?? [];
    const steps: ProgressStepDef[] = [];
    queries.forEach((sub, i) => {
      const label = humanizeQueryId(String(sub.id ?? "")) || `Fetch ${i + 1}`;
      steps.push({ id: String(sub.id ?? `fetch${i + 1}`), label });
      if (i === 0) steps.push({ id: "save", label: "Save" });
    });
    steps.push({ id: "join", label: "Join" });
    steps.push({ id: "analyze", label: "Analyze" });
    steps.push({ id: "display", label: "Display" });
    return steps;
  }

  if (q.multi_meta && typeof q.multi_meta === "object") {
    const multi = q.multi_meta as { queries?: Array<{ id?: string }> };
    const queries = multi.queries ?? [];
    const steps: ProgressStepDef[] = [];
    queries.forEach((sub, i) => {
      const label = humanizeQueryId(String(sub.id ?? "")) || `Fetch ${i + 1}`;
      steps.push({ id: String(sub.id ?? `fetch${i + 1}`), label });
      if (i === 0) steps.push({ id: "save", label: "Save" });
    });
    steps.push({ id: "join", label: "Join" });
    steps.push({ id: "analyze", label: "Analyze" });
    steps.push({ id: "display", label: "Display" });
    return steps;
  }

  if (q.multi_platform && typeof q.multi_platform === "object") {
    const multi = q.multi_platform as { queries?: Array<{ id?: string }> };
    const queries = multi.queries ?? [];
    const steps: ProgressStepDef[] = [];
    queries.forEach((sub, i) => {
      const label = humanizeQueryId(String(sub.id ?? "")) || `Platform ${i + 1}`;
      steps.push({ id: String(sub.id ?? `platform${i + 1}`), label });
    });
    steps.push({ id: "join", label: "Combine" });
    steps.push({ id: "analyze", label: "Analyze" });
    steps.push({ id: "display", label: "Display" });
    return steps;
  }

  return [
    { id: "fetch", label: "Fetch" },
    { id: "save", label: "Save" },
    { id: "analyze", label: "Analyze" },
    { id: "display", label: "Display" },
  ];
}
