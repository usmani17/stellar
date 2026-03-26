import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, AXIS_STYLE_DARK, TOOLTIP_STYLE, getChartColors, getSeriesColor } from "../../../../utils/chartStyles";
import { DASHBOARD_TABLE_CHART_CONTENT_HEIGHT } from "./dashboardConstants";
import type { DashboardComponent } from "../../types/dashboard";
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";

interface DashboardAreaChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferChartKeys(data: Record<string, unknown>[]): {
  xKey: string;
  valueKeys: string[];
} {
  if (data.length === 0) return { xKey: "date", valueKeys: ["value"] };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter(
    (k) => typeof (data[0] as Record<string, unknown>)[k] === "number"
  );
  const stringKeys = keys.filter(
    (k) => typeof (data[0] as Record<string, unknown>)[k] === "string"
  );
  return {
    xKey: stringKeys[0] ?? "date",
    valueKeys: numericKeys.length > 0 ? numericKeys : ["value"],
  };
}

export const DashboardAreaChart: React.FC<DashboardAreaChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const { xKey, valueKeys } = inferChartKeys(data);
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const stroke = axisStyle.stroke;
  const fill = axisStyle.fill;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";

  return (
    <div className="w-full" style={{ minHeight: DASHBOARD_TABLE_CHART_CONTENT_HEIGHT }}>
      <ResponsiveContainer width="100%" height={DASHBOARD_TABLE_CHART_CONTENT_HEIGHT}>
        <AreaChart
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
            stroke={stroke}
            tick={{ fontSize: axisStyle.fontSize, fill }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={stroke}
            tick={{ fontSize: axisStyle.fontSize, fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatDashboardTick(v, valueKeys[0] ?? "value", component.metric_formats)}
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
            formatter={(v: unknown, name: string): [React.ReactNode, string] => [
              formatDashboardValue(v, name, component.metric_formats),
              name.replace(/_/g, " "),
            ]}
          />
          {valueKeys.map((key, i) => {
            const color = isDark ? colors[i % colors.length] : getSeriesColor(key, i);
            return (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                fill={color}
                fillOpacity={isDark ? 0.4 : 0.3}
                strokeWidth={2}
                name={key.replace(/_/g, " ")}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
