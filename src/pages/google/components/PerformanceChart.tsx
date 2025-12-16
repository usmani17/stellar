import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  sales: number;
  spend: number;
  clicks: number;
}

interface PerformanceChartProps {
  chartData: ChartData[];
  chartToggles: {
    sales: boolean;
    spend: boolean;
    clicks: boolean;
  };
  onToggleMetric: (metric: "sales" | "spend" | "clicks") => void;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  chartData,
  chartToggles,
  onToggleMetric,
}) => {
  return (
    <div
      className="border border-gray-200 rounded-[20px] p-4 mb-4"
      style={{ backgroundColor: "#F5F5F0" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12.16px] font-semibold text-black">
          Performance Trends
        </h3>
        <div className="flex gap-3 items-center">
          {[
            { key: "sales", label: "Sales", color: "#136D6D" },
            { key: "spend", label: "Spend", color: "#506766" },
            { key: "clicks", label: "Clicks", color: "#169aa3" },
          ].map((metric) => (
            <div
              key={metric.key}
              className="border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3 bg-white"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: metric.color }}
              />
              <span className="text-[9.88px] font-normal text-black whitespace-nowrap">
                {metric.label}
              </span>
              <button
                onClick={() =>
                  onToggleMetric(metric.key as keyof typeof chartToggles)
                }
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                  chartToggles[metric.key as keyof typeof chartToggles]
                    ? "bg-[#136D6D]"
                    : "bg-[#a3a8b3]"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    chartToggles[metric.key as keyof typeof chartToggles]
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[223px] bg-transparent rounded-lg ">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-[#556179]">
            No performance data available for Google campaigns yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                stroke="#556179"
                style={{ fontSize: "9.6px" }}
                tick={{ fill: "#556179" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#556179"
                style={{ fontSize: "9.6px" }}
                tick={{ fill: "#556179" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  // For decimal values, show 2 decimal places
                  if (value % 1 !== 0) {
                    return value.toFixed(2);
                  }
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "9.6px",
                  boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                }}
                formatter={(value: any, name: string) => {
                  // Format clicks as whole numbers
                  if (name === "Clicks") {
                    return [Math.round(value).toLocaleString(), name];
                  }
                  // Format Sales and Spend with 2 decimal places (always show 2 decimals)
                  if (name === "Sales" || name === "Spend") {
                    const numValue = Number(value);
                    // Use toLocaleString with minimumFractionDigits and maximumFractionDigits
                    return [
                      numValue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                      name,
                    ];
                  }
                  // For other values, show 2 decimal places if they have decimals
                  if (typeof value === "number" && value % 1 !== 0) {
                    return [value.toFixed(2), name];
                  }
                  // For whole numbers, use locale string
                  return [value.toLocaleString(), name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              {chartToggles.sales && (
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#136D6D"
                  strokeWidth={1.5}
                  dot={false}
                  name="Sales"
                  activeDot={{ r: 4 }}
                />
              )}
              {chartToggles.spend && (
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#506766"
                  strokeWidth={1.5}
                  dot={false}
                  name="Spend"
                  activeDot={{ r: 4 }}
                />
              )}
              {chartToggles.clicks && (
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#169aa3"
                  strokeWidth={1.5}
                  dot={false}
                  name="Clicks"
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

