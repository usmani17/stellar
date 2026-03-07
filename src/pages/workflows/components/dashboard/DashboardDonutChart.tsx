import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getChartColors, TOOLTIP_STYLE } from "../../../../utils/chartStyles";
import { formatDashboardValue, formatDashboardTick } from "../../utils/formatDashboardValue";
import type { DashboardComponent, PieChartDatum } from "../../types/dashboard";

interface DashboardDonutChartProps {
  component: DashboardComponent;
  data: PieChartDatum[];
  isDark?: boolean;
}

function inferChartKeys(data: PieChartDatum[]): { nameKey: string; valueKey: string } {
  if (data.length === 0) return { nameKey: "name", valueKey: "value" };
  const keys = Object.keys(data[0] as object);
  const numericKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "number");
  const stringKeys = keys.filter((k) => typeof (data[0] as Record<string, unknown>)[k] === "string");
  return {
    nameKey: stringKeys[0] ?? "name",
    valueKey: numericKeys[0] ?? "value",
  };
}

export const DashboardDonutChart: React.FC<DashboardDonutChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const { nameKey, valueKey } = inferChartKeys(data);
  const colors = getChartColors(isDark);
  const tooltipBg = isDark ? "#374151" : TOOLTIP_STYLE.backgroundColor;
  const tooltipBorder = isDark ? "#4b5563" : TOOLTIP_STYLE.border;
  const tooltipText = isDark ? "#e5e7eb" : "#072929";
  const legendTextColor = isDark ? "#d1d5db" : "#374151";
  const centerLabelColor = isDark ? "#e5e7eb" : "#072929";

  const total = data.reduce((sum, row) => sum + Number((row as Record<string, unknown>)[valueKey] ?? 0), 0);

  return (
    <div className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="45%"
            innerRadius={45}
            outerRadius={70}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="central"
            fill={centerLabelColor}
            fontSize={16}
            fontWeight={600}
          >
            {formatDashboardTick(total, valueKey, component.metric_formats)}
          </text>
          {data.length <= 5 && (
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value, entry) => {
                const pct = total > 0
                  ? ((Number((entry.payload as Record<string, unknown>)?.[valueKey] ?? 0) / total) * 100).toFixed(0)
                  : "0";
                return (
                  <span style={{ color: legendTextColor, fontSize: 10 }}>
                    {value} {pct}%
                  </span>
              );
            }}
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
            formatter={(v: unknown) => [
              formatDashboardValue(v, valueKey, component.metric_formats),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
