import type { MetricFormat } from "../types/dashboard";
import { formatCurrency, formatPercentage, formatNumber } from "../../../utils/formatters";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateFormatterShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function formatDate(value: string): string {
  const parsed = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (isNaN(parsed.getTime())) return value;
  const now = new Date();
  return parsed.getFullYear() === now.getFullYear()
    ? dateFormatterShort.format(parsed)
    : dateFormatter.format(parsed);
}

function formatTime(value: string): string {
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return timeFormatter.format(parsed);
}

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function applyFormat(value: number, fmt: MetricFormat): string {
  switch (fmt) {
    case "currency":
      return formatCurrency(value);
    case "micros_currency":
      return formatCurrency(value / 1_000_000);
    case "percentage":
      return formatPercentage(value);
    case "integer":
      return formatNumber(value, 0);
    case "number":
      return formatNumber(value, 2);
    case "ratio":
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "compact":
      return compactNumber(value);
    case "id":
      return String(Math.round(value));
    case "text":
    case "date":
    case "time":
      return String(value);
  }
}

/**
 * Heuristic fallback for dashboards without metric_formats.
 * Matches existing behavior across DashboardSingleMetric, DashboardTable, chart tooltips.
 */
function fallbackHeuristic(value: number, key: string): string {
  if (/_id$/i.test(key) || /\.id$/i.test(key) || key === "id") {
    return String(Math.round(value));
  }
  if (/cost_micros|micros|costmicros/i.test(key)) {
    return `$${(value / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (/spend|cost|revenue|budget/i.test(key)) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (/roas/i.test(key)) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (/ctr|ctr_pct|impression_share|rank_lost/i.test(key)) {
    return `${value.toFixed(2)}%`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Central formatter for all dashboard widget values.
 * Uses explicit metric_formats when available; falls back to name-based heuristic for old dashboards.
 */
export function formatDashboardValue(
  value: unknown,
  key: string,
  metricFormats?: Record<string, MetricFormat>,
): string {
  if (value == null) return "\u2014";

  const fmt = metricFormats?.[key];

  if (fmt === "text" || fmt === "id") return String(value);
  if (fmt === "date") return typeof value === "string" ? formatDate(value) : String(value);
  if (fmt === "time") return typeof value === "string" ? formatTime(value) : String(value);

  if (typeof value === "number") {
    if (fmt) return applyFormat(value, fmt);
    return fallbackHeuristic(value, key);
  }

  if (typeof value === "string" && fmt) {
    const num = Number(value);
    if (!isNaN(num)) return applyFormat(num, fmt);
  }

  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "value" in first) {
      const raw = Number(first.value);
      if (!isNaN(raw)) {
        if (fmt) return applyFormat(raw, fmt);
        return fallbackHeuristic(raw, key);
      }
    }
    return "\u2014";
  }

  return String(value);
}

/**
 * Format for chart axis ticks — always compact for readability.
 * Uses metric_formats when available to pick the right prefix/suffix.
 */
export function formatDashboardTick(
  value: number,
  key: string,
  metricFormats?: Record<string, MetricFormat>,
): string {
  const fmt = metricFormats?.[key];
  if (fmt === "currency" || fmt === "micros_currency" || (!fmt && /spend|cost|revenue|budget/i.test(key))) {
    const v = fmt === "micros_currency" ? value / 1_000_000 : value;
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }
  if (fmt === "percentage" || (!fmt && /ctr|impression_share|rank_lost/i.test(key))) {
    return `${value.toFixed(1)}%`;
  }
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

/**
 * Format metric label: converts column keys to human-readable titles.
 */
const LABEL_OVERRIDES: Record<string, string> = {
  cost_micros: "Spend",
  costmicros: "Spend",
  costMicros: "Spend",
  impressions: "Impressions",
  clicks: "Clicks",
  conversions: "Conversions",
  conversionsValue: "Conv. Value",
  conversions_value: "Conv. Value",
  roas: "ROAS",
  ctr_pct: "CTR %",
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  spend: "Spend",
  reach: "Reach",
  frequency: "Frequency",
  wasted_spend: "Wasted Spend",
  total_spend: "Total Spend",
  campaign_count: "Campaigns",
  amountMicros: "Daily Budget",
  amountmicros: "Daily Budget",
  amount_micros: "Daily Budget",
  status: "Status",
  name: "Name",
  id: "ID",
};

export function formatMetricLabel(key: string): string {
  const lastPart = key.includes(".") ? key.split(".").pop() ?? key : key;
  const normalized = lastPart.toLowerCase().replace(/_/g, "");
  if (LABEL_OVERRIDES[lastPart]) return LABEL_OVERRIDES[lastPart];
  if (LABEL_OVERRIDES[normalized]) return LABEL_OVERRIDES[normalized];
  return lastPart
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
