import React from "react";
import { PerformanceChart } from "../PerformanceChart";

interface OverviewTabProps {
  chartData: Array<{
    date: string;
    sales: number;
    spend: number;
    clicks: number;
    orders: number;
  }>;
  chartToggles: {
    sales: boolean;
    spend: boolean;
    clicks: boolean;
    orders: boolean;
  };
  onToggleChartMetric: (metric: "sales" | "spend" | "clicks" | "orders") => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  chartData,
  chartToggles,
  onToggleChartMetric,
}) => {
  // Filter chartToggles to only include the metrics that PerformanceChart expects
  const filteredToggles = {
    sales: chartToggles.sales,
    spend: chartToggles.spend,
    clicks: chartToggles.clicks,
  };

  // Map onToggleChartMetric to only handle the metrics PerformanceChart supports
  const handleToggle = (metric: "sales" | "spend" | "clicks") => {
    onToggleChartMetric(metric);
  };

  return (
    <>
      {/* Chart Section */}
      <PerformanceChart
        chartData={chartData}
        chartToggles={filteredToggles}
        onToggleMetric={handleToggle}
      />
    </>
  );
};

