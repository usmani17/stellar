/**
 * Dashboard configuration types — matches the JSON structure for workflow dashboards
 * Supports: raw GAQL, GAQL with date_range, multi-GAQL join, internal DB SQL
 */

export interface DashboardLayout {
  cols: number;
  rows: number;
}

export interface DashboardSort {
  field: string;
  order: "asc" | "desc";
}

export type DateRangePreset =
  | "last3days"
  | "last7days"
  | "last30days"
  | "last90days"
  | "lastyear"
  | "thisweek"
  | "thismonth";

export interface DateRangePresetConfig {
  preset: DateRangePreset;
}

/** Raw GAQL — date can be in query or via date_range (backend substitution) */
export interface GaqlQuery {
  gaql: string;
  format: string;
  date_range?: DateRangePresetConfig;
}

/** Single GAQL in a multi-query */
export interface MultiGaqlQueryItem {
  id: string;
  gaql: string;
}

export interface MultiGaqlJoin {
  type: "inner" | "left";
  on: [string, string][];
}

export interface MultiGaqlMetric {
  op: "sum" | "avg" | "min" | "max" | "count";
  field?: string;
}

export interface MultiGaqlAggregation {
  group_by: string[];
  metrics: Record<string, MultiGaqlMetric>;
}

export interface MultiGaqlQuery {
  queries: MultiGaqlQueryItem[];
  join: MultiGaqlJoin;
  aggregation?: MultiGaqlAggregation;
}

/** Internal DB — parameterized SQL */
export interface SqlQuery {
  sql: string;
  params?: Record<string, string | number>;
}

export type DashboardQuery = GaqlQuery | { multi_gaql: MultiGaqlQuery } | SqlQuery;

export function isGaqlQuery(q: DashboardQuery): q is GaqlQuery {
  return "gaql" in q && typeof (q as GaqlQuery).gaql === "string";
}

export function isMultiGaqlQuery(q: DashboardQuery): q is { multi_gaql: MultiGaqlQuery } {
  return "multi_gaql" in q && typeof (q as { multi_gaql: MultiGaqlQuery }).multi_gaql === "object";
}

export function isSqlQuery(q: DashboardQuery): q is SqlQuery {
  return "sql" in q && typeof (q as SqlQuery).sql === "string";
}

export type DashboardPagination =
  | { page: number; page_size: number }
  | null;

export type VisualizationType =
  | "table"
  | "bar_chart"
  | "line_chart"
  | "pie_chart"
  | "area_chart"
  | "combo_chart"
  | "comparison_chart";

export interface DashboardComponent {
  id: string;
  title: string;
  visualization_type: VisualizationType;
  data_source: "google_ads" | "internal_db";
  query: DashboardQuery;
  sort: DashboardSort;
  filters: Record<string, unknown>;
  pagination: DashboardPagination;
  refresh_interval_seconds: number;
}

export interface DashboardConfig {
  layout: DashboardLayout;
  components: DashboardComponent[];
}
