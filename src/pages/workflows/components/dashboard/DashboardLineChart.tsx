import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, AXIS_STYLE_DARK, TOOLTIP_STYLE, getChartColors } from "../../../../utils/chartStyles";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardLineChartProps {
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

export const DashboardLineChart: React.FC<DashboardLineChartProps> = ({
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
    <div className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
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
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
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
              typeof v === "number" && /spend|cost|value|micros/i.test(name)
                ? `$${v.toLocaleString()}`
                : typeof v === "number"
                  ? v.toLocaleString()
                  : v,
              name.replace(/_/g, " "),
            ]}
          />
          {valueKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name={key.replace(/_/g, " ")}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
