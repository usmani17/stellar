import React from "react";
import { PerformanceChart, type MetricConfig } from "../../../../components/charts/PerformanceChart";

interface TikTokOverviewTabProps {
    chartData: any[];
    chartToggles: { [key: string]: boolean };
    onToggleChartMetric: (metric: string) => void;
    metrics: MetricConfig[];
}

export const TikTokOverviewTab: React.FC<TikTokOverviewTabProps> = ({
    chartData,
    chartToggles,
    onToggleChartMetric,
    metrics,
}) => {
    return (
        <div className="space-y-6">
            <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={onToggleChartMetric}
                title="Performance Trends"
                metrics={metrics}
            />
        </div>
    );
};
