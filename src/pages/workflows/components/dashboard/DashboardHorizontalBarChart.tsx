import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AXIS_STYLE, AXIS_STYLE_DARK, TOOLTIP_STYLE, getChartColors } from "../../../../utils/chartStyles";
import { DASHBOARD_TABLE_CHART_CONTENT_HEIGHT } from "./dashboardConstants";
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";
import type { DashboardComponent } from "../../types/dashboard";


interface DashboardHorizontalBarChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[] | undefined | null;
  isDark?: boolean;
}

function inferKeys(data: Record<string, unknown>[]): {
  labelKey: string;
  valueKeys: string[];
} {
  if (!data || data.length === 0) return { labelKey: "name", valueKeys: ["value"] };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  const stringKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "string");
  return {
    labelKey: stringKeys[0] ?? "name",
    valueKeys: numericKeys.length > 0 ? numericKeys : ["value"],
  };
}

export const DashboardHorizontalBarChart: React.FC<DashboardHorizontalBarChartProps> = ({
  component,
  data: rawData,
  isDark = false,
}) => {
  const data = Array.isArray(rawData) ? rawData : [];
  const dk = component.data_keys;
  const { labelKey: inferredLabel, valueKeys: inferredValueKeys } = inferKeys(data);
  const actualKeys = data[0] ? Object.keys(data[0] as object) : [];
  const hasKey = (k: string) => actualKeys.includes(k);
  const labelKey = (dk?.x && hasKey(dk.x)) ? dk.x : inferredLabel;
  const valueKeys =
    dk?.series?.length && dk.series.length > 0
      ? dk.series.filter(hasKey).length > 0
        ? dk.series.filter(hasKey)
        : inferredValueKeys
      : inferredValueKeys;
  const primaryValueKey = valueKeys[0] ?? "value";
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";
  const legendTextColor = isDark ? "#d1d5db" : "#374151";

  return (
    <div className="w-full" style={{ minHeight: DASHBOARD_TABLE_CHART_CONTENT_HEIGHT }}>
      <ResponsiveContainer width="100%" height={DASHBOARD_TABLE_CHART_CONTENT_HEIGHT}>
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
            tickFormatter={(v) => formatDashboardTick(v, primaryValueKey, component.metric_formats)}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            width={120}
            stroke={axisStyle.stroke}
            tick={{ fontSize: 11, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (typeof v === "string" && v.length > 24 ? `${v.slice(0, 22)}…` : v)}
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
              (typeof name === "string" ? name : String(name)).replace(/_/g, " "),
            ]}
          />
          {valueKeys.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: "10px" }}
              formatter={(value) => (
                <span style={{ color: legendTextColor }}>{value.replace(/_/g, " ")}</span>
              )}
            />
          )}
          {valueKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              name={key.replace(/_/g, " ")}
              radius={i === valueKeys.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]}
              barSize={valueKeys.length > 1 ? Math.max(14, 24 - valueKeys.length * 4) : 20}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
