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

/* Theme colors from design system (forest, semantic) */
const CHART_COLORS = [
  "#136D6D", /* --color-semantic-status-primary, forest-f40 */
  "#0E4E4E", /* forest-f50 darker teal */
  "#506766", /* --color-semantic-text-secondary, forest-f30 */
  "#9BB1B0", /* forest-f20 lighter teal */
  "#169aa3", /* cyan accent */
  "#059669", /* --color-semantic-status-success */
];

const METRIC_COLOR_MAP: Record<string, string> = {
  sales: CHART_COLORS[0],
  spend: CHART_COLORS[1],
  roas: CHART_COLORS[0],
  impressions: CHART_COLORS[2],
  clicks: CHART_COLORS[4],
  acos: CHART_COLORS[5],
};

function getSeriesColor(seriesKey: string, index: number): string {
  const key = String(seriesKey).toLowerCase();
  return METRIC_COLOR_MAP[key] ?? CHART_COLORS[index % CHART_COLORS.length];
}

const AXIS_STYLE = {
  stroke: "#556179",
  fontSize: 9.6,
  fill: "#556179",
  axisLine: false,
  tickLine: false,
};

const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: "9.6px",
  boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
};

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
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown, name: string) => [typeof v === "number" && /sales|spend/i.test(name) ? `$${v.toLocaleString()}` : typeof v === "number" ? v.toLocaleString() : v, name]} />
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
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown, name: string) => [typeof v === "number" && /sales|spend/i.test(name) ? `$${v.toLocaleString()}` : typeof v === "number" ? v.toLocaleString() : v, name]} />
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
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString() : v]} />
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
          <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 10 }} labelStyle={{ color: "#072929" }} itemStyle={{ color: "#072929" }} formatter={(v: unknown, name: string) => [typeof v === "number" && /sales|spend/i.test(name) ? `$${v.toLocaleString()}` : typeof v === "number" ? v.toLocaleString() : v, name]} />
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
