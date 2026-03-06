import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { AXIS_STYLE, AXIS_STYLE_DARK, TOOLTIP_STYLE, getChartColors } from "../../../../utils/chartStyles";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardScatterPlotProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferKeys(data: Record<string, unknown>[]): { xKey: string; yKey: string } {
  if (data.length === 0) return { xKey: "x", yKey: "y" };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  return {
    xKey: numericKeys[0] ?? "x",
    yKey: numericKeys[1] ?? numericKeys[0] ?? "y",
  };
}

export const DashboardScatterPlot: React.FC<DashboardScatterPlotProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const dk = component.data_keys;
  const { xKey: inferredX, yKey: inferredY } = inferKeys(data);
  const xKey = dk?.x ?? inferredX;
  const yKey = dk?.series?.[0] ?? inferredY;
  const axisStyle = isDark ? AXIS_STYLE_DARK : AXIS_STYLE;
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";

  return (
    <div className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(156,163,175,0.2)" : "rgba(85,97,121,0.15)"}
          />
          <XAxis
            dataKey={xKey}
            type="number"
            name={xKey.replace(/_/g, " ")}
            stroke={axisStyle.stroke}
            tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
          />
          <YAxis
            dataKey={yKey}
            type="number"
            name={yKey.replace(/_/g, " ")}
            stroke={axisStyle.stroke}
            tick={{ fontSize: axisStyle.fontSize, fill: axisStyle.fill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
          />
          <ZAxis range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              ...TOOLTIP_STYLE,
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
            }}
            wrapperStyle={{ zIndex: 10 }}
            labelStyle={{ color: tooltipText }}
            itemStyle={{ color: tooltipText }}
            formatter={(v: unknown, name: string) => [
              typeof v === "number" ? v.toLocaleString() : v,
              name.replace(/_/g, " "),
            ]}
          />
          <Scatter
            data={data}
            fill={colors[0]}
            name="data"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
