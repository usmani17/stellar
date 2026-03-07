/**
 * Dashboard configuration types — matches the JSON structure for workflow dashboards
 * Supports: raw GAQL, GAQL with date_range, multi-GAQL join, internal DB SQL,
 * Meta Insights API, and multi-Meta join/aggregate
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

/** Single Meta Insights query */
export interface MetaInsightsQuery {
  meta_insights: {
    fields: string;
    level: "account" | "campaign" | "adset" | "ad";
    date_preset?: string;
    time_range?: { since: string; until: string };
    breakdowns?: string;
    time_increment?: string;
    filtering?: Array<{ field: string; operator: string; value: unknown[] }>;
    sort?: string[];
    action_attribution_windows?: string[];
    action_breakdowns?: string[];
    time_ranges?: Array<{ since: string; until: string }>;
  };
}

/** Single query within multi_meta */
export interface MultiMetaQueryItem {
  id: string;
  type: "insights" | "entity";
  fields: string;
  level?: "account" | "campaign" | "adset" | "ad";
  date_preset?: string;
  time_range?: { since: string; until: string };
  breakdowns?: string;
  time_increment?: string;
  filtering?: Array<{ field: string; operator: string; value: unknown[] }>;
  sort?: string[];
  action_attribution_windows?: string[];
  action_breakdowns?: string[];
  time_ranges?: Array<{ since: string; until: string }>;
  resource?: string;
  limit?: number;
}

/** Multi-Meta query with join + aggregate (mirrors MultiGaqlQuery) */
export interface MultiMetaQuery {
  queries: MultiMetaQueryItem[];
  join: MultiGaqlJoin;
  aggregation?: MultiGaqlAggregation;
}

export type DashboardQuery =
  | GaqlQuery
  | { multi_gaql: MultiGaqlQuery }
  | SqlQuery
  | MetaInsightsQuery
  | { multi_meta: MultiMetaQuery };

export function isGaqlQuery(q: DashboardQuery | null | undefined): q is GaqlQuery {
  return q != null && typeof q === "object" && "gaql" in q && typeof (q as GaqlQuery).gaql === "string";
}

export function isMultiGaqlQuery(q: DashboardQuery | null | undefined): q is { multi_gaql: MultiGaqlQuery } {
  return q != null && typeof q === "object" && "multi_gaql" in q && typeof (q as { multi_gaql: MultiGaqlQuery }).multi_gaql === "object";
}

export function isSqlQuery(q: DashboardQuery | null | undefined): q is SqlQuery {
  return q != null && typeof q === "object" && "sql" in q && typeof (q as SqlQuery).sql === "string";
}

export function isMetaInsightsQuery(q: DashboardQuery | null | undefined): q is MetaInsightsQuery {
  return q != null && typeof q === "object" && "meta_insights" in q;
}

export function isMultiMetaQuery(q: DashboardQuery | null | undefined): q is { multi_meta: MultiMetaQuery } {
  return q != null && typeof q === "object" && "multi_meta" in q;
}

export type DashboardPagination =
  | { page: number; page_size: number }
  | null;

/** How the frontend should format a metric value for display */
export type MetricFormat =
  | "currency"
  | "micros_currency"
  | "percentage"
  | "number"
  | "integer"
  | "ratio"
  | "text"
  | "id"
  | "compact"
  | "date"
  | "time";

export type VisualizationType =
  | "table"
  | "bar_chart"
  | "line_chart"
  | "pie_chart"
  | "area_chart"
  | "combo_chart"
  | "comparison_chart"
  | "single_metric"
  | "stacked_bar_chart"
  | "donut_chart"
  | "funnel_chart"
  | "scatter_plot"
  | "gauge_chart"
  | "horizontal_bar_chart";

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

/** Datum for stacked bar — category + multiple series stacked */
export type StackedBarChartDatum = BarChartDatum;

/** Datum for donut — same shape as pie */
export type DonutChartDatum = PieChartDatum;

/** Datum for funnel — ordered stages with values */
export interface FunnelChartDatum {
  name: string;
  value: number;
  [key: string]: unknown;
}

/** Datum for scatter plot — two numeric axes */
export interface ScatterPlotDatum {
  x: number;
  y: number;
  [key: string]: unknown;
}

/** Datum for gauge — single numeric value */
export type GaugeChartDatum = Record<string, unknown>;

/** Datum for horizontal bar — same shape as bar */
export type HorizontalBarChartDatum = BarChartDatum;

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
  stacked_bar_chart: StackedBarChartDatum[];
  donut_chart: DonutChartDatum[];
  funnel_chart: FunnelChartDatum[];
  scatter_plot: ScatterPlotDatum[];
  gauge_chart: GaugeChartDatum[];
  horizontal_bar_chart: HorizontalBarChartDatum[];
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
  data_source: "google_ads" | "internal_db" | "meta_ads";
  query: DashboardQuery;
  data_keys?: DashboardDataKeys;
  /** Maps column/metric names to display format types so the frontend renders values correctly. */
  metric_formats?: Record<string, MetricFormat>;
  /** Agent-suggested compatible chart types the user can switch to via the viz-type dropdown. */
  suggested_types?: VisualizationType[];
  data: VisualizationDataMap[VisualizationType];
  sort: DashboardSort;
  filters: Record<string, unknown>;
  pagination: DashboardPagination;
  refresh_interval_seconds: number;
  /** Per-widget channel — required for cross-platform dashboards. */
  channel_id?: number | null;
  /** Per-widget profile — required for cross-platform dashboards. */
  profile_id?: number | null;
  /** Grid size for this widget. */
  rows: number;
  cols: number;
}

export interface DashboardConfig {
  layout: DashboardLayout;
  components: DashboardComponent[];
}
