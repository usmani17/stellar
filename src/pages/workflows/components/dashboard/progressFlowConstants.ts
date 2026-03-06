export type ProgressStep =
  | "fetch"
  | "save"
  | "fetch2"
  | "join"
  | "analyze"
  | "display";

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
