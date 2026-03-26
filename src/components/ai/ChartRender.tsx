import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartConfig } from "../../utils/chartJsonParser";
import { CHART_COLORS, AXIS_STYLE, TOOLTIP_STYLE, getSeriesColor } from "../../utils/chartStyles";

export function ChartRender({ config }: { config: ChartConfig }) {
  const { type, title, data, dataKeys } = config;
  const { x: xKey, series } = dataKeys;

  const chartInner =
    type === "bar" ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(85,97,121,0.15)" vertical={false} />
          <XAxis dataKey={xKey} stroke={AXIS_STYLE.stroke} tick={{ fontSize: AXIS_STYLE.fontSize, fill: AXIS_STYLE.fill }} axisLine={false} tickLine={false} />
          <YAxis stroke={AXIS_STYLE.stroke} tick={{ fontSize: AXIS_STYLE.fontSize, fill: AXIS_STYLE.fill }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown, name: string): [React.ReactNode, string] => [typeof v === "number" && /sales|spend/i.test(name) ? `$${v.toLocaleString()}` : typeof v === "number" ? v.toLocaleString() : String(v), name]} />
          <Legend />
          {series.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={series.length === 1 ? CHART_COLORS[0] : getSeriesColor(key, i)}
              name={key}
              radius={[4, 4, 0, 0]}
            >
              {series.length === 1 && data.length > 1
                ? data.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    ) : type === "line" ? (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(85,97,121,0.15)" vertical={false} />
          <XAxis dataKey={xKey} stroke={AXIS_STYLE.stroke} tick={{ fontSize: AXIS_STYLE.fontSize, fill: AXIS_STYLE.fill }} axisLine={false} tickLine={false} />
          <YAxis stroke={AXIS_STYLE.stroke} tick={{ fontSize: AXIS_STYLE.fontSize, fill: AXIS_STYLE.fill }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown, name: string): [React.ReactNode, string] => [typeof v === "number" && /sales|spend/i.test(name) ? `$${v.toLocaleString()}` : typeof v === "number" ? v.toLocaleString() : String(v), name]} />
          <Legend />
          {series.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={getSeriesColor(key, i)}
              name={key}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    ) : type === "pie" ? (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={series[0]}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name?: string; percent?: number }) => {
              const pct = percent ?? 0;
              if (pct < 0.02) return null;
              return `${name ?? ""} ${(pct * 100).toFixed(0)}%`;
            }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Legend layout="horizontal" align="center" verticalAlign="bottom" />
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown): [React.ReactNode, string] => [typeof v === "number" ? v.toLocaleString() : String(v), ""]} />
        </PieChart>
      </ResponsiveContainer>
    ) : type === "area" ? (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(85,97,121,0.15)" vertical={false} />
          <XAxis dataKey={xKey} stroke={AXIS_STYLE.stroke} tick={{ fontSize: AXIS_STYLE.fontSize, fill: AXIS_STYLE.fill }} axisLine={false} tickLine={false} />
          <YAxis stroke={AXIS_STYLE.stroke} tick={{ fontSize: AXIS_STYLE.fontSize, fill: AXIS_STYLE.fill }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} />
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown, name: string): [React.ReactNode, string] => [typeof v === "number" && /sales|spend/i.test(name) ? `$${v.toLocaleString()}` : typeof v === "number" ? v.toLocaleString() : String(v), name]} />
          <Legend />
          {series.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={getSeriesColor(key, i)}
              fill={getSeriesColor(key, i)}
              fillOpacity={0.25}
              name={key}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    ) : null;

  if (!chartInner) return null;

  return (
    <div className="graph-container my-4 min-h-[200px]">
      {title && (
        <div className="text-[12.16px] font-semibold text-[#072929] mb-4">{title}</div>
      )}
      <div className="h-[223px] bg-transparent rounded-lg">
        {chartInner}
      </div>
    </div>
  );
}
