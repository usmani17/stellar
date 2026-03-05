import React from "react";
import type { DashboardComponent, SingleMetricDatum } from "../../types/dashboard";
import { cn } from "../../../../lib/cn";

interface DashboardSingleMetricProps {
  component: DashboardComponent;
  data: SingleMetricDatum[];
  isDark?: boolean;
}

function formatMetricLabel(key: string): string {
  const lastPart = key.includes(".") ? key.split(".").pop() ?? key : key;
  return lastPart.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetricValue(val: unknown, key: string): string {
  if (val == null) return "—";
  if (typeof val === "number") {
    if (/cost_micros|micros|spend|roas|ctr_pct/i.test(key)) {
      if (/roas|ctr_pct/i.test(key)) return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if (/spend|micros|cost/i.test(key)) return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    <div className="flex-1 flex flex-wrap gap-3 p-4 content-start">
      {keys.map((key) => {
        const value = row[key];
        const label = formatMetricLabel(key);
        const displayValue = formatMetricValue(value, key);
        return (
          <div
            key={key}
            className={cn(
              "min-w-[100px] rounded-lg border px-3 py-2.5 flex flex-col gap-0.5",
              isDark
                ? "border-neutral-600 bg-neutral-800/80"
                : "border-sandstorm-s40 bg-sandstorm-s5/50"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                isDark ? "text-neutral-400" : "text-forest-f30"
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums",
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
