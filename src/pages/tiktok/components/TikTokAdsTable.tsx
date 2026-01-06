import React from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Checkbox } from "../../../components/ui/Checkbox";

export interface TikTokAd {
    ad_id: string;
    ad_name: string;
    adgroup_id?: string;
    adgroup_name: string;
    campaign_id?: string;
    campaign_name: string;
    ad_format: string;
    operation_status: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm?: number;
}

interface TikTokAdsTableProps {
    ads: TikTokAd[];
    loading: boolean;
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSort: (column: string) => void;
    // Selection Props
    selectedIds: Set<string>;
    onSelect: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    // Summary Props
    summary?: {
        total_ads: number;
        total_spend: number;
        total_impressions: number;
        total_clicks: number;
        total_conversions: number;
        avg_ctr: number;
        avg_cpc: number;
    } | null;
}

export const TikTokAdsTable: React.FC<TikTokAdsTableProps> = ({
    ads,
    loading,
    sortBy,
    sortOrder,
    onSort,
    selectedIds,
    onSelect,
    onSelectAll,
    summary,
}) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("en-US").format(value);
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return (
                <svg
                    className="w-4 h-4 ml-1 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                </svg>
            );
        }
        return sortOrder === "asc" ? (
            <svg
                className="w-4 h-4 ml-1 text-[#136D6D]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                />
            </svg>
        ) : (
            <svg
                className="w-4 h-4 ml-1 text-[#136D6D]"
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
        );
    };

    const allSelected = ads.length > 0 && ads.every((ad) => selectedIds.has(ad.ad_id));
    const isIndeterminate =
        selectedIds.size > 0 && selectedIds.size < ads.length;

    return (
        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                {loading ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">
                        Loading ads...
                    </div>
                ) : ads.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[13.3px] text-[#556179] mb-4">
                            No ads found
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="min-w-[1400px] w-full">
                            <thead className="sticky top-0 bg-sandstorm-s20 z-10">
                                <tr className="border-b border-[#e8e8e3]">
                                    {/* Checkbox Header */}
                                    <th className="text-left py-[10px] px-[10px] w-[35px]">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={isIndeterminate}
                                                onChange={onSelectAll}
                                            />
                                        </div>
                                    </th>

                                    {/* Ad Name */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("ad_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Name
                                            {getSortIcon("ad_name")}
                                        </div>
                                    </th>

                                    {/* Ad Group Name */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("adgroup_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Group
                                            {getSortIcon("adgroup_name")}
                                        </div>
                                    </th>

                                    {/* Campaign Name */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("campaign_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Campaign
                                            {getSortIcon("campaign_name")}
                                        </div>
                                    </th>

                                    {/* Ad Format */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("ad_format")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Format
                                            {getSortIcon("ad_format")}
                                        </div>
                                    </th>

                                    {/* Status */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("operation_status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {getSortIcon("operation_status")}
                                        </div>
                                    </th>

                                    {/* Spend */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("spend")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Spend
                                            {getSortIcon("spend")}
                                        </div>
                                    </th>

                                    {/* Impressions */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("impressions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Impressions
                                            {getSortIcon("impressions")}
                                        </div>
                                    </th>

                                    {/* Clicks */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("clicks")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Clicks
                                            {getSortIcon("clicks")}
                                        </div>
                                    </th>

                                    {/* Conversions */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("conversions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Conversions
                                            {getSortIcon("conversions")}
                                        </div>
                                    </th>

                                    {/* CTR */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("ctr")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CTR
                                            {getSortIcon("ctr")}
                                        </div>
                                    </th>

                                    {/* CPC */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("cpc")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CPC
                                            {getSortIcon("cpc")}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Summary Row */}
                                {summary && (
                                    <tr className="bg-[#f5f5f0] font-semibold">
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            Total ({summary.total_ads})
                                        </td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatCurrency(summary.total_spend)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatNumber(summary.total_impressions)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatNumber(summary.total_clicks)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatNumber(summary.total_conversions)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatPercentage(summary.avg_ctr)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatCurrency(summary.avg_cpc)}
                                        </td>
                                    </tr>
                                )}

                                {ads.map((item) => {
                                    const isSelected = selectedIds.has(item.ad_id);
                                    return (
                                        <tr
                                            key={item.ad_id}
                                            className="group border-b border-[#e8e8e3] hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-[10px] px-[10px]">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(checked) =>
                                                            onSelect(item.ad_id, checked)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-medium text-left">
                                                    {item.ad_name}
                                                </div>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] text-left">
                                                    {item.adgroup_name}
                                                </div>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] text-left">
                                                    {item.campaign_id ? (
                                                        <Link to={`/accounts/${1}/tiktok/campaigns/${item.campaign_id}`} className="hover:underline hover:text-[#136D6D]">
                                                            {item.campaign_name}
                                                        </Link>
                                                    ) : (
                                                        item.campaign_name
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {item.ad_format}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <StatusBadge status={item.operation_status} />
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatCurrency(item.spend)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatNumber(item.impressions)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatNumber(item.clicks)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatNumber(item.conversions)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatPercentage(item.ctr)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatCurrency(item.cpc)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
