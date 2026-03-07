import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, AXIS_STYLE_DARK, TOOLTIP_STYLE, getChartColors } from "../../../../utils/chartStyles";
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardStackedBarChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferKeys(data: Record<string, unknown>[]): { xKey: string; seriesKeys: string[] } {
  if (data.length === 0) return { xKey: "name", seriesKeys: ["value"] };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  const stringKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "string");
  return {
    xKey: stringKeys[0] ?? "name",
    seriesKeys: numericKeys.length > 0 ? numericKeys : ["value"],
  };
}

export const DashboardStackedBarChart: React.FC<DashboardStackedBarChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const dk = component.data_keys;
  const { xKey: inferredX, seriesKeys: inferredSeries } = inferKeys(data);
  const xKey = dk?.x ?? inferredX;
  const seriesKeys = dk?.series?.length ? dk.series : inferredSeries;
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";
  const legendTextColor = isDark ? "#d1d5db" : "#374151";

  return (
    <div className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(156,163,175,0.2)" : "rgba(85,97,121,0.15)"}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            stroke={axisStyle.stroke}
            tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={axisStyle.stroke}
            tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatDashboardTick(v, seriesKeys[0] ?? "value", component.metric_formats)}
          />
          <Tooltip
            contentStyle={{
              ...TOOLTIP_STYLE,
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
            }}
            wrapperStyle={{ zIndex: 10 }}
            labelStyle={{ color: tooltipText }}
            itemStyle={{ color: tooltipText }}
            formatter={(v: unknown, name: string) => [
              formatDashboardValue(v, name, component.metric_formats),
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: legendTextColor }}>{value.replace(/_/g, " ")}</span>
            )}
          />
          {seriesKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={colors[i % colors.length]}
              name={key.replace(/_/g, " ")}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
