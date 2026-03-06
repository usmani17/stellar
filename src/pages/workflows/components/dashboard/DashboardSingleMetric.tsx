import React from "react";
import type { DashboardComponent, SingleMetricDatum } from "../../types/dashboard";
import { cn } from "../../../../lib/cn";

interface DashboardSingleMetricProps {
  component: DashboardComponent;
  data: SingleMetricDatum[];
  isDark?: boolean;
}

/** Human-readable labels for common metric keys */
const LABEL_OVERRIDES: Record<string, string> = {
  cost_micros: "Spend",
  costmicros: "Spend",
  impressions: "Impressions",
  clicks: "Clicks",
  conversions: "Conversions",
  roas: "ROAS",
  ctr_pct: "CTR %",
};

function formatMetricLabel(key: string): string {
  const lastPart = key.includes(".") ? key.split(".").pop() ?? key : key;
  const normalized = lastPart.toLowerCase().replace(/_/g, "");
  if (LABEL_OVERRIDES[lastPart]) return LABEL_OVERRIDES[lastPart];
  if (LABEL_OVERRIDES[normalized]) return LABEL_OVERRIDES[normalized];
  return lastPart.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetricValue(val: unknown, key: string): string {
  if (val == null) return "—";
  if (typeof val === "number") {
    if (/cost_micros|micros|costmicros/i.test(key)) {
      return `$${(val / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (/roas|ctr_pct/i.test(key)) {
      return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    if (/spend|cost/i.test(key)) {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(val);
}

export const DashboardSingleMetric: React.FC<DashboardSingleMetricProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const row = data?.[0] as Record<string, unknown> | undefined;
  const seriesKeys = component.data_keys?.series;
  const keys = seriesKeys?.length
    ? seriesKeys
    : row
      ? Object.keys(row).filter((k) => typeof row[k] === "number" || (typeof row[k] === "string" && row[k] !== "" && !Number.isNaN(Number(row[k]))))
      : [];

  if (!row || keys.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex items-center justify-center py-8 px-4 text-sm",
          isDark ? "text-neutral-400" : "text-forest-f30"
        )}
      >
        No metrics to display
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-wrap items-stretch gap-0 py-4 px-4">
      {keys.map((key, i) => {
        const value = row[key];
        const label = formatMetricLabel(key);
        const displayValue = formatMetricValue(value, key);
        const isLast = i === keys.length - 1;
        return (
          <div
            key={key}
            className={cn(
              "flex flex-col justify-center gap-0.5 px-4 py-2 min-w-0",
              !isLast && (isDark ? "border-r border-neutral-600" : "border-r border-sandstorm-s40")
            )}
          >
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-wider",
                isDark ? "text-neutral-400" : "text-forest-f30"
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums leading-tight",
                isDark ? "text-neutral-100" : "text-forest-f60"
              )}
            >
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
};
