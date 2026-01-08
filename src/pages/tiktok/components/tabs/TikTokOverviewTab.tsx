import React from "react";
import { PerformanceChart, type MetricConfig } from "../../../../components/charts/PerformanceChart";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";

interface TopAd {
    ad_name: string;
    ad_id: string;
    spends: string;
    sales: string;
    clicks: number;
    impressions: number;
    ctr: string;
    status: string;
}

interface TopProduct {
    name: string;
    asin?: string;
    sales: string;
}

interface TikTokOverviewTabProps {
    chartData: any[];
    chartToggles: { [key: string]: boolean };
    onToggleChartMetric: (metric: string) => void;
    metrics: MetricConfig[];
    topAds: TopAd[];
    topProducts: TopProduct[];
    loading: boolean;
}

export const TikTokOverviewTab: React.FC<TikTokOverviewTabProps> = ({
    chartData,
    chartToggles,
    onToggleChartMetric,
    metrics,
    topAds,
    topProducts,
    loading,
}) => {
    return (
        <div className="space-y-6">
            {/* Chart Section */}
            <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={onToggleChartMetric}
                title="Performance Trends"
                metrics={metrics}
            />

            {/* Top Ads & Top Products */}
            <div className="flex gap-6 mb-4">
                {/* Top Ads Table */}
                <div className="flex-1">
                    <div className="mb-2">
                        <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                            Top Ads
                        </h3>
                    </div>
                    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                        <div className="overflow-x-auto w-full">
                            {loading ? (
                                <div className="text-center py-8 text-[#556179] text-[13.3px]">
                                    Loading ads...
                                </div>
                            ) : topAds && topAds.length > 0 ? (
                                <table className="min-w-full w-full">
                                    <thead>
                                        <tr className="border-b border-[#e8e8e3]">
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={false}
                                                        onChange={() => {}}
                                                        size="small"
                                                    />
                                                </div>
                                            </th>
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                Ad Name
                                            </th>
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                CTR
                                            </th>
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                Status
                                            </th>
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                Spends
                                            </th>
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                Sales
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topAds.map((ad, index) => {
                                            const isLastRow = index === topAds.length - 1;
                                            return (
                                                <tr
                                                    key={ad.ad_id}
                                                    className={`${
                                                        !isLastRow
                                                            ? "border-b border-[#e8e8e3]"
                                                            : ""
                                                    } hover:bg-gray-50 transition-colors`}
                                                >
                                                    <td className="py-[10px] px-[10px]">
                                                        <div className="flex items-center justify-center">
                                                            <Checkbox
                                                                checked={false}
                                                                onChange={() => {}}
                                                                size="small"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-[10px] px-[10px]">
                                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                            {ad.ad_name}
                                                        </span>
                                                    </td>
                                                    <td className="py-[10px] px-[10px]">
                                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                            {ad.ctr}
                                                        </span>
                                                    </td>
                                                    <td className="py-[10px] px-[10px]">
                                                        <StatusBadge
                                                            status={ad.status}
                                                        />
                                                    </td>
                                                    <td className="py-[10px] px-[10px]">
                                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                            {ad.spends}
                                                        </span>
                                                    </td>
                                                    <td className="py-[10px] px-[10px]">
                                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                            {ad.sales}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-[13.3px] text-[#556179] mb-4">
                                        No ads data available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Products Table */}
                <div className="flex-1">
                    <div className="mb-2">
                        <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                            Top Products
                        </h3>
                    </div>
                    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                        <div className="overflow-x-auto w-full">
                            {loading ? (
                                <div className="text-center py-8 text-[#556179] text-[13.3px]">
                                    Loading products...
                                </div>
                            ) : topProducts && topProducts.length > 0 ? (
                                <table className="min-w-full w-full">
                                    <thead>
                                        <tr className="border-b border-[#e8e8e3]">
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={false}
                                                        onChange={() => {}}
                                                        size="small"
                                                    />
                                                </div>
                                            </th>
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                Product Name
                                            </th>
                                            {topProducts[0]?.asin && (
                                                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                    ASIN
                                                </th>
                                            )}
                                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                                Sales
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.map((product, index) => {
                                            const isLastRow = index === topProducts.length - 1;
                                            return (
                                                <tr
                                                    key={index}
                                                    className={`${
                                                        !isLastRow
                                                            ? "border-b border-[#e8e8e3]"
                                                            : ""
                                                    } hover:bg-gray-50 transition-colors`}
                                                >
                                                    <td className="py-[10px] px-[10px]">
                                                        <div className="flex items-center justify-center">
                                                            <Checkbox
                                                                checked={false}
                                                                onChange={() => {}}
                                                                size="small"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-[10px] px-[10px]">
                                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                            {product.name}
                                                        </span>
                                                    </td>
                                                    {product.asin && (
                                                        <td className="py-[10px] px-[10px]">
                                                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                                {product.asin}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="py-[10px] px-[10px]">
                                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                            {product.sales}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-[13.3px] text-[#556179] mb-4">
                                        No products data available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
