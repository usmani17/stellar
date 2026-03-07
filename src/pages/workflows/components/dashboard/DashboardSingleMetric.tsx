import React from "react";
import type { DashboardComponent, SingleMetricDatum } from "../../types/dashboard";
import { cn } from "../../../../lib/cn";
import { formatDashboardValue, formatMetricLabel } from "../../utils/formatDashboardValue";

interface DashboardSingleMetricProps {
  component: DashboardComponent;
  data: SingleMetricDatum[];
  isDark?: boolean;
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
        const displayValue = formatDashboardValue(value, key, component.metric_formats);
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
