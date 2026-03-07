import React from "react";
import { getChartColors } from "../../../../utils/chartStyles";
import { formatDashboardValue } from "../../utils/formatDashboardValue";
import type { DashboardComponent, FunnelChartDatum } from "../../types/dashboard";

interface DashboardFunnelChartProps {
  component: DashboardComponent;
  data: FunnelChartDatum[];
  isDark?: boolean;
}

function inferKeys(data: FunnelChartDatum[]): { nameKey: string; valueKey: string } {
  if (data.length === 0) return { nameKey: "name", valueKey: "value" };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  const stringKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "string");
  return {
    nameKey: stringKeys[0] ?? "name",
    valueKey: numericKeys[0] ?? "value",
  };
}

export const DashboardFunnelChart: React.FC<DashboardFunnelChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const { nameKey, valueKey } = inferKeys(data);
  const colors = getChartColors(isDark);
  const textColor = isDark ? "#e5e7eb" : "#072929";
  const subTextColor = isDark ? "#9ca3af" : "#506766";

  const sorted = [...data].sort(
    (a, b) => Number((b as Record<string, unknown>)[valueKey] ?? 0) - Number((a as Record<string, unknown>)[valueKey] ?? 0)
  );
  const maxVal = Number((sorted[0] as Record<string, unknown>)?.[valueKey] ?? 1);

  return (
    <div className="min-h-[180px] w-full flex flex-col gap-1.5 px-4 py-2">
      {sorted.map((item, i) => {
        const val = Number((item as Record<string, unknown>)[valueKey] ?? 0);
        const name = String((item as Record<string, unknown>)[nameKey] ?? "");
        const widthPct = maxVal > 0 ? Math.max((val / maxVal) * 100, 20) : 20;
        const convRate = i > 0
          ? ((val / Number((sorted[i - 1] as Record<string, unknown>)[valueKey] ?? 1)) * 100).toFixed(1)
          : null;

        return (
          <div key={i} className="flex flex-col items-center w-full">
            {convRate && (
              <div className="text-[10px] mb-0.5" style={{ color: subTextColor }}>
                {convRate}%
              </div>
            )}
            <div
              className="rounded-md flex items-center justify-between px-3 py-1.5 transition-all"
              style={{
                width: `${widthPct}%`,
                backgroundColor: colors[i % colors.length],
                minHeight: 28,
              }}
            >
              <span className="text-xs font-medium text-white truncate">{name}</span>
              <span className="text-xs font-semibold text-white ml-2">
                {formatDashboardValue(val, valueKey, component.metric_formats)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
