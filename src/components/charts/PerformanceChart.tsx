import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PerformanceChartProps {
  data: Array<{
    date: string;
    sales?: number;
    spend?: number;
    clicks?: number;
    orders?: number;
  }>;
  toggles: {
    sales: boolean;
    spend: boolean;
    clicks: boolean;
    orders: boolean;
  };
  onToggle: (metric: "sales" | "spend" | "clicks" | "orders") => void;
  title?: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  toggles,
  onToggle,
  title = "Performance Trends",
}) => {
  const metrics = [
    { key: "sales", label: "Sales", color: "#136D6D" },
    { key: "spend", label: "Spend", color: "#506766" },
    { key: "clicks", label: "Clicks", color: "#169aa3" },
    { key: "orders", label: "Orders", color: "#072929" },
  ];

  return (
    <div
      className="border border-gray-200 rounded-[20px] p-4 mb-4"
      style={{ backgroundColor: "#F5F5F0" }}
    >
      {/* Title and Toggle Switches Row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12.8px] font-semibold text-black">{title}</h3>

        {/* Toggle Switches */}
        <div className="flex gap-3 items-center">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3 bg-white"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: metric.color }}
              />
              <span className="text-[10.4px] font-normal text-black whitespace-nowrap">
                {metric.label}
              </span>
              <button
                onClick={() =>
                  onToggle(metric.key as "sales" | "spend" | "clicks" | "orders")
                }
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                  toggles[metric.key as keyof typeof toggles]
                    ? "bg-[#136D6D]"
                    : "bg-[#a3a8b3]"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    toggles[metric.key as keyof typeof toggles]
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[223px] bg-transparent rounded-lg">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
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
                if (name === "Sales" || name === "Spend") {
                  return [`$${value.toLocaleString()}`, name];
                }
                return [value.toLocaleString(), name];
              }}
            />
            {toggles.sales && (
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
            {toggles.spend && (
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
            {toggles.clicks && (
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
            {toggles.orders && (
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#072929"
                strokeWidth={1.5}
                dot={false}
                name="Orders"
                activeDot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

