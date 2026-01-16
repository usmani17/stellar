import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dropdown } from "../ui/Dropdown";

export interface MetricConfig {
  key: string;
  label: string;
  color: string;
  tooltipFormatter?: (value: number) => string;
}

interface PerformanceChartProps {
  data: Array<{
    date: string;
    [key: string]: string | number | undefined;
  }>;
  toggles: Record<string, boolean>;
  onToggle: (metric: string) => void;
  metrics?: MetricConfig[];
  title?: string;
  maxSelectedMetrics?: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  toggles,
  onToggle,
  metrics = [],
  title = "Performance Trends",
  maxSelectedMetrics = 3,
}) => {
  // Use provided metrics or fallback to default
  const metricOptions =
    metrics.length > 0
      ? metrics
      : [
          { key: "sales", label: "Sales", color: "#136D6D" },
          { key: "spend", label: "Spend", color: "#506766" },
          { key: "impressions", label: "Impressions", color: "#7C3AED" },
          { key: "clicks", label: "Clicks", color: "#169aa3" },
          { key: "acos", label: "ACOS", color: "#DC2626" },
          { key: "roas", label: "ROAS", color: "#059669" },
        ];

  const selectedMetricCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="border border-gray-200 rounded-[20px] p-4 mb-4 bg-[#f9f9f6]">
      {/* Title and Metrics Dropdown */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12.16px] font-semibold text-black">{title}</h3>
        <Dropdown
          options={metricOptions.map((m) => ({
            value: m.key,
            label: m.label,
            disabled:
              !toggles[m.key] && selectedMetricCount >= maxSelectedMetrics,
            color: m.color,
          }))}
          value={undefined}
          closeOnSelect={false}
          showCheckmark={false}
          align="right"
          width="w-56"
          maxHeight="max-h-[300px]"
          renderButton={(_, isOpen, toggle) => {
            const selectedLabels = metricOptions
              .filter((m) => toggles[m.key])
              .map((m) => m.label)
              .join(", ");
            return (
              <button type="button" onClick={toggle} className="edit-button">
                <span className="truncate">
                  {selectedLabels || "Select metrics"}
                </span>
                <svg
                  className={`w-4 h-4 text-[#072929] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            );
          }}
          renderOption={(option) => {
            const key = option.value as string;
            const selected = toggles[key] || false;
            const disabled =
              !selected && selectedMetricCount >= maxSelectedMetrics;
            const metric = metricOptions.find((m) => m.key === key);
            return (
              <div className="flex items-center justify-between w-full px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: metric?.color || "#ccc",
                    }}
                  />
                  <span className="text-[11px] text-[#313850]">
                    {option.label}
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 accent-[#136D6D]"
                  checked={selected}
                  disabled={disabled}
                  readOnly
                />
              </div>
            );
          }}
          onChange={(value) => {
            const key = value as string;
            const isOn = toggles[key] || false;
            if (!isOn && selectedMetricCount >= maxSelectedMetrics) {
              return;
            }
            onToggle(key);
          }}
        />
      </div>

      {/* Chart */}
      <div className="h-[223px] bg-transparent rounded-lg ">
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
                const metric = metricOptions.find((m) => m.label === name);
                if (metric?.tooltipFormatter) {
                  return [metric.tooltipFormatter(value), name];
                }
                if (
                  name === "Sales" ||
                  name === "Spend" ||
                  name.includes("Sales")
                ) {
                  return [`$${value.toLocaleString()}`, name];
                }
                if (name === "ACOS") {
                  return [`${value.toFixed(2)}%`, name];
                }
                if (name === "ROAS") {
                  return [`${value.toFixed(2)} x`, name];
                }
                return [value.toLocaleString(), name];
              }}
            />
            {metricOptions.map((metric) => {
              if (toggles[metric.key]) {
                return (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.color}
                    strokeWidth={1.5}
                    dot={false}
                    name={metric.label}
                    activeDot={{ r: 4 }}
                  />
                );
              }
              return null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
