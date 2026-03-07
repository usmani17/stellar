import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
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

interface DashboardComboChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferChartKeys(data: Record<string, unknown>[]): {
  xKey: string;
  barKey: string;
  lineKey: string;
  hasTwoSeries: boolean;
} {
  if (data.length === 0)
    return {
      xKey: "date",
      barKey: "value",
      lineKey: "value2",
      hasTwoSeries: false,
    };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter(
    (k) => typeof (data[0] as Record<string, unknown>)[k] === "number"
  );
  const stringKeys = keys.filter(
    (k) => typeof (data[0] as Record<string, unknown>)[k] === "string"
  );
  const xKey = stringKeys[0] ?? "date";
  const barKey = numericKeys[0] ?? "value";
  const lineKey = numericKeys[1] ?? numericKeys[0] ?? "value";
  const hasTwoSeries = numericKeys.length >= 2 && barKey !== lineKey;
  return { xKey, barKey, lineKey, hasTwoSeries };
}

export const DashboardComboChart: React.FC<DashboardComboChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const { xKey, barKey, lineKey, hasTwoSeries } = inferChartKeys(data);
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
        <ComposedChart
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
            yAxisId="left"
            stroke={axisStyle.stroke}
            tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatDashboardTick(v, barKey, component.metric_formats)}
          />
          {hasTwoSeries && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={axisStyle.stroke}
              tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatDashboardTick(v, barKey, component.metric_formats)}
            />
          )}
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
          <Bar
            yAxisId="left"
            dataKey={barKey}
            fill={colors[0]}
            name={barKey}
            radius={[4, 4, 0, 0]}
          />
          {hasTwoSeries && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              stroke={colors[1]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name={lineKey}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
