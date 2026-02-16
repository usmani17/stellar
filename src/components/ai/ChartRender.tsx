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

const CHART_COLORS = [
  "#6366f1",
  "#4f46e5",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#136D6D",
];

export function ChartRender({ config }: { config: ChartConfig }) {
  const { type, title, data, dataKeys } = config;
  const { x: xKey, series } = dataKeys;

  const chartInner =
    type === "bar" ? (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6e6e73" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1d1d1f",
              border: "none",
              borderRadius: 8,
            }}
            wrapperStyle={{ zIndex: 10 }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
          />
          <Legend />
          {series.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              name={key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    ) : type === "line" ? (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6e6e73" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1d1d1f",
              border: "none",
              borderRadius: 8,
            }}
            wrapperStyle={{ zIndex: 10 }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
          />
          <Legend />
          {series.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              name={key}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    ) : type === "pie" ? (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey={series[0]}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1d1d1f",
              border: "none",
              borderRadius: 8,
            }}
            wrapperStyle={{ zIndex: 10 }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
          />
        </PieChart>
      </ResponsiveContainer>
    ) : type === "area" ? (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6e6e73" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1d1d1f",
              border: "none",
              borderRadius: 8,
            }}
            wrapperStyle={{ zIndex: 10 }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
          />
          <Legend />
          {series.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.3}
              name={key}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    ) : null;

  if (!chartInner) return null;

  return (
    <div className="my-4 p-4 bg-white border border-gray-200 rounded-xl min-h-[200px]">
      {title && (
        <div className="text-sm font-semibold text-gray-900 mb-3">{title}</div>
      )}
      {chartInner}
    </div>
  );
}
