import React from "react";
import { useChartCollapse } from "../../../../hooks/useChartCollapse";
import { PerformanceChart } from "../../../../components/charts/PerformanceChart";

interface MetaCampaignDetailOverviewTabProps {
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

export const MetaCampaignDetailOverviewTab: React.FC<MetaCampaignDetailOverviewTabProps> = ({
  chartData,
  chartToggles,
  onToggleChartMetric,
}) => {
  const [isChartCollapsed, toggleChartCollapse] = useChartCollapse(
    "meta-overview-chart-collapsed"
  );

  const filteredToggles = {
    sales: chartToggles.sales,
    spend: chartToggles.spend,
    clicks: chartToggles.clicks,
    impressions: false,
    acos: false,
    roas: false,
  };

  const handleToggle = (metric: "sales" | "spend" | "impressions" | "clicks" | "acos" | "roas") => {
    if (metric === "sales" || metric === "spend" || metric === "clicks") {
      onToggleChartMetric(metric);
    }
  };

  return (
    <PerformanceChart
      data={chartData}
      toggles={filteredToggles}
      onToggle={handleToggle}
      title="Performance Trends"
      isCollapsed={isChartCollapsed}
      onCollapseToggle={toggleChartCollapse}
    />
  );
};
