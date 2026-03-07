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
import {
  AXIS_STYLE,
  AXIS_STYLE_DARK,
  TOOLTIP_STYLE,
  getChartColors,
} from "../../../../utils/chartStyles";
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardComparisonChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferChartKeys(data: Record<string, unknown>[]): {
  xKey: string;
  seriesKeys: string[];
} {
  if (data.length === 0)
    return { xKey: "name", seriesKeys: ["thisWeek", "lastWeek"] };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter(
    (k) => typeof (data[0] as Record<string, unknown>)[k] === "number"
  );
  const stringKeys = keys.filter(
    (k) => typeof (data[0] as Record<string, unknown>)[k] === "string"
  );
  return {
    xKey: stringKeys[0] ?? "name",
    seriesKeys: numericKeys.length >= 2 ? numericKeys : ["thisWeek", "lastWeek"],
  };
}

export const DashboardComparisonChart: React.FC<
  DashboardComparisonChartProps
> = ({ component, data, isDark = false }) => {
  const { xKey, seriesKeys } = inferChartKeys(data);
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";

  const formatValue = (v: unknown, name: string) =>
    formatDashboardValue(v, name, component.metric_formats);

  return (
    <div className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: -12, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={
              isDark ? "rgba(156,163,175,0.2)" : "rgba(85,97,121,0.15)"
            }
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
            tickFormatter={(v) =>
              formatDashboardTick(v, seriesKeys[0] ?? "value", component.metric_formats)
            }
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
              formatValue(v, name),
              name.replace(/_/g, " "),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px" }}
            formatter={(value) => (
              <span
                className={isDark ? "text-neutral-300" : "text-forest-f30"}
              >
                {value.replace(/_/g, " ")}
              </span>
            )}
          />
          {seriesKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              name={key.replace(/_/g, " ")}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
