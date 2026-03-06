import React from "react";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardGaugeChartProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

export const DashboardGaugeChart: React.FC<DashboardGaugeChartProps> = ({
  component,
  data,
  isDark = false,
}) => {
  const row = data[0] ?? {};
  const keys = Object.keys(row);
  const numericKeys = keys.filter((k) => typeof row[k] === "number");
  const valueKey = component.data_keys?.series?.[0] ?? numericKeys[0] ?? "value";
  const rawValue = Number(row[valueKey] ?? 0);
  const value = Math.min(Math.max(rawValue, 0), 100);

  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = 135;
  const endAngle = 405;
  const totalArc = endAngle - startAngle;
  const valueAngle = startAngle + (value / 100) * totalArc;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPoint = (angle: number) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle)),
  });

  const bgStart = arcPoint(startAngle);
  const bgEnd = arcPoint(endAngle);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  const valEnd = arcPoint(valueAngle);
  const largeArc = valueAngle - startAngle > 180 ? 1 : 0;
  const valPath = value > 0
    ? `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`
    : "";

  const bgTrackColor = isDark ? "rgba(156,163,175,0.2)" : "rgba(85,97,121,0.12)";
  const arcColor = value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";
  const textColor = isDark ? "#e5e7eb" : "#072929";
  const subTextColor = isDark ? "#9ca3af" : "#506766";

  return (
    <div className="min-h-[180px] w-full flex items-center justify-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <path
          d={bgPath}
          fill="none"
          stroke={bgTrackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {valPath && (
          <path
            d={valPath}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontSize={24}
          fontWeight={700}
        >
          {rawValue % 1 === 0 ? rawValue : rawValue.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          dominantBaseline="central"
          fill={subTextColor}
          fontSize={10}
        >
          {valueKey.replace(/_/g, " ")}
        </text>
      </svg>
    </div>
  );
};
