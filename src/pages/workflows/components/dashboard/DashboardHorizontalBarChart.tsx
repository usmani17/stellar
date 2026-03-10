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
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardHorizontalBarChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferKeys(data: Record<string, unknown>[]): { labelKey: string; valueKey: string } {
  if (data.length === 0) return { labelKey: "name", valueKey: "value" };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  const stringKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "string");
  return {
    labelKey: stringKeys[0] ?? "name",
    valueKey: numericKeys[0] ?? "value",
  };
}

export const DashboardHorizontalBarChart: React.FC<DashboardHorizontalBarChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const dk = component.data_keys;
  const { labelKey: inferredLabel, valueKey: inferredValue } = inferKeys(data);
  const labelKey = dk?.x ?? inferredLabel;
  const valueKey = dk?.series?.[0] ?? inferredValue;
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";

  const chartHeight = Math.max(DASHBOARD_TABLE_CHART_CONTENT_HEIGHT, data.length * 32);

  return (
    <div className="w-full" style={{ minHeight: DASHBOARD_TABLE_CHART_CONTENT_HEIGHT }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(156,163,175,0.2)" : "rgba(85,97,121,0.15)"}
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke={axisStyle.stroke}
            tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatDashboardTick(v, valueKey, component.metric_formats)}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            width={100}
            stroke={axisStyle.stroke}
            tick={{ fontSize: 11, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
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
            formatter={(v: unknown) => [
              formatDashboardValue(v, valueKey, component.metric_formats),
              valueKey.replace(/_/g, " "),
            ]}
          />
          <Bar
            dataKey={valueKey}
            fill={colors[0]}
            name={valueKey.replace(/_/g, " ")}
            radius={[0, 6, 6, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
