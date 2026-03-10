import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, AXIS_STYLE_DARK, TOOLTIP_STYLE, getChartColors } from "../../../../utils/chartStyles";
import { DASHBOARD_TABLE_CHART_CONTENT_HEIGHT } from "./dashboardConstants";
import type { DashboardComponent } from "../../types/dashboard";
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";

interface DashboardBarChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferChartKeys(data: Record<string, unknown>[]): { xKey: string; valueKey: string } {
  if (data.length === 0) return { xKey: "name", valueKey: "value" };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  const stringKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "string");
  return {
    xKey: stringKeys[0] ?? "name",
    valueKey: numericKeys[0] ?? "value",
  };
}

export const DashboardBarChart: React.FC<DashboardBarChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const { xKey, valueKey } = inferChartKeys(data);
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";

  return (
    <div className="w-full" style={{ minHeight: DASHBOARD_TABLE_CHART_CONTENT_HEIGHT }}>
      <ResponsiveContainer width="100%" height={DASHBOARD_TABLE_CHART_CONTENT_HEIGHT}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: -12, bottom: 4 }}
        >
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
            tickFormatter={(v) => formatDashboardTick(v, valueKey, component.metric_formats)}
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
              valueKey.replace(/_/g, " "),
            ]}
          />
          <Bar
            dataKey={valueKey}
            fill={colors[0]}
            name={valueKey}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
