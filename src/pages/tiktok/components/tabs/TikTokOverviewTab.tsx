import React from "react";
import { useChartCollapse } from "../../../../hooks/useChartCollapse";
import { PerformanceChart, type MetricConfig } from "../../../../components/charts/PerformanceChart";
import { TikTokAdGroupTable } from "./TikTokAdGroupTable";
import { TikTokAdTable } from "./TikTokAdTable";
import type { TikTokAdGroup, TikTokAd } from "./types";

interface TikTokOverviewTabProps {
    chartData: any[];
    chartToggles: { [key: string]: boolean };
    onToggleChartMetric: (metric: string) => void;
    metrics: MetricConfig[];
    topAds: TikTokAd[];
    topAdGroups: TikTokAdGroup[];
    loading: boolean;
    accountId: number;
    onRefresh: () => void;
}

export const TikTokOverviewTab: React.FC<TikTokOverviewTabProps> = ({
    chartData,
    chartToggles,
    onToggleChartMetric,
    metrics,
    topAds,
    topAdGroups,
    loading,
    accountId,
    onRefresh,
}) => {
    // Chart collapse state with localStorage persistence
    const [isChartCollapsed, toggleChartCollapse] = useChartCollapse(
        "tiktok-overview-chart-collapsed"
    );

    return (
        <div className="space-y-6">
            {/* Chart Section */}
            <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={onToggleChartMetric}
                title="Performance Trends"
                metrics={metrics}
                isCollapsed={isChartCollapsed}
                onCollapseToggle={toggleChartCollapse}
            />

            {/* Top Ad Groups & Top Ads */}
            <div className="flex gap-6 mb-4">
                {/* Top Ad Groups Table */}
                <div className="flex-1 min-w-0">
                    <div className="mb-2">
                        <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                            Top Ad Groups
                        </h3>
                    </div>
                    <TikTokAdGroupTable
                        adgroups={topAdGroups}
                        loading={loading}
                        selectedAdGroupIds={new Set()}
                        onSelectAll={() => { }}
                        onSelectAdGroup={() => { }}
                        sortBy="spend"
                        sortOrder="desc"
                        onSort={() => { }}
                        onRefresh={onRefresh}
                        accountId={accountId}
                        showColumns={["adgroup_name", "ctr", "operation_status", "sales", "conversions"]}
                    />
                </div>

                {/* Top Ads Table */}
                <div className="flex-1 min-w-0">
                    <div className="mb-2">
                        <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                            Top Ads
                        </h3>
                    </div>
                    <TikTokAdTable
                        ads={topAds}
                        loading={loading}
                        selectedAdIds={new Set()}
                        onSelectAll={() => { }}
                        onSelectAd={() => { }}
                        sortBy="spend"
                        sortOrder="desc"
                        onSort={() => { }}
                        onRefresh={onRefresh}
                        accountId={accountId}
                        showColumns={["ad_name", "ctr", "operation_status", "spend", "sales", "conversions"]}
                    />
                </div>
            </div>
        </div>
    );
};;
