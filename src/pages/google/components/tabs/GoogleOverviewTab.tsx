import React from "react";
import { PerformanceChart } from "../../../../components/charts/PerformanceChart";

interface GoogleOverviewTabProps {
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

export const GoogleOverviewTab: React.FC<GoogleOverviewTabProps> = ({
  chartData,
  chartToggles,
  onToggleChartMetric,
}) => {
  // Filter chartToggles to only include the metrics that PerformanceChart expects
  const filteredToggles = {
    sales: chartToggles.sales,
    spend: chartToggles.spend,
    clicks: chartToggles.clicks,
    impressions: false,
    acos: false,
    roas: false,
  };

  // Map onToggleChartMetric to only handle the metrics PerformanceChart supports
  const handleToggle = (metric: "sales" | "spend" | "impressions" | "clicks" | "acos" | "roas") => {
    if (metric === "sales" || metric === "spend" || metric === "clicks") {
      onToggleChartMetric(metric);
    }
  };

  return (
    <>
      {/* Chart Section */}
      <PerformanceChart
        data={chartData}
        toggles={filteredToggles}
        onToggle={handleToggle}
        title="Performance Trends"
      />
    </>
  );
};
