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

export function isGaqlQuery(q: DashboardQuery | null | undefined): q is GaqlQuery {
  return q != null && typeof q === "object" && "gaql" in q && typeof (q as GaqlQuery).gaql === "string";
}

export function isMultiGaqlQuery(q: DashboardQuery | null | undefined): q is { multi_gaql: MultiGaqlQuery } {
  return q != null && typeof q === "object" && "multi_gaql" in q && typeof (q as { multi_gaql: MultiGaqlQuery }).multi_gaql === "object";
}

export function isSqlQuery(q: DashboardQuery | null | undefined): q is SqlQuery {
  return q != null && typeof q === "object" && "sql" in q && typeof (q as SqlQuery).sql === "string";
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
  | "comparison_chart"
  | "single_metric";

/** Data row for table — arbitrary key/value columns */
export type TableDataRow = Record<string, unknown>;

/** Datum for bar chart — category + numeric value(s) */
export interface BarChartDatum {
  name: string;
  value: number;
  [key: string]: unknown;
}

/** Datum for line/area/combo — date/category + numeric series */
export interface LineChartDatum {
  date: string;
  [key: string]: unknown;
}

/** Datum for pie chart — label + value */
export interface PieChartDatum {
  name: string;
  value: number;
  [key: string]: unknown;
}

/** Datum for area chart — same shape as line */
export type AreaChartDatum = LineChartDatum;

/** Datum for combo chart — multiple value keys */
export type ComboChartDatum = LineChartDatum;

/** Datum for comparison chart — dimension + comparable values */
export type ComparisonChartDatum = LineChartDatum;

/** Row for single_metric — one or more metric key/value pairs (typically one row) */
export type SingleMetricDatum = Record<string, unknown>;

/** Data array type for each visualization type */
export type VisualizationDataMap = {
  table: TableDataRow[];
  bar_chart: BarChartDatum[];
  line_chart: LineChartDatum[];
  pie_chart: PieChartDatum[];
  area_chart: AreaChartDatum[];
  combo_chart: ComboChartDatum[];
  comparison_chart: ComparisonChartDatum[];
  single_metric: SingleMetricDatum[];
};

/** Optional mapping for chart components: query result keys → chart axes (backend uses for transform) */
export interface DashboardDataKeys {
  x: string;
  series: string[];
}

export interface DashboardComponent {
  id: string;
  title: string;
  visualization_type: VisualizationType;
  data_source: "google_ads" | "internal_db";
  query: DashboardQuery;
  data_keys?: DashboardDataKeys;
  data: VisualizationDataMap[VisualizationType];
  sort: DashboardSort;
  filters: Record<string, unknown>;
  pagination: DashboardPagination;
  refresh_interval_seconds: number;
}

export interface DashboardConfig {
  layout: DashboardLayout;
  components: DashboardComponent[];
}
