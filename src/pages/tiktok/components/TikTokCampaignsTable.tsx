import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Checkbox } from "../../../components/ui/Checkbox";

export interface TikTokCampaign {
    id: number;
    campaign_id: string;
    advertiser_id: string;
    campaign_name: string;
    objective_type: string;
    budget?: number;
    budget_mode?: string;
    operation_status: string;
    create_time?: string;
    modify_time?: string;
}

interface TikTokCampaignsTableProps {
    campaigns: TikTokCampaign[];
    loading: boolean;
    onSort?: (column: string) => void;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    selectedCampaigns?: Set<string | number>;
    onSelectCampaign?: (campaignId: string | number) => void;
    onSelectAll?: () => void;
}

export const TikTokCampaignsTable: React.FC<TikTokCampaignsTableProps> = ({
    campaigns,
    loading,
    onSort,
    sortColumn,
    sortDirection,
    selectedCampaigns = new Set(),
    onSelectCampaign,
    onSelectAll,
}) => {
    const navigate = useNavigate();
    const { accountId } = useParams<{ accountId: string }>();

    const handleCampaignClick = (campaignId: string) => {
        if (accountId) {
            navigate(`/accounts/${accountId}/tiktok/campaigns/${campaignId}`);
        }
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return "—";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const normalizeStatus = (status: string): string => {
        const statusLower = status?.toLowerCase() || "";
        if (statusLower === "enable" || statusLower === "active") {
            return "Enabled";
        }
        if (statusLower === "disable" || statusLower === "paused") {
            return "Paused";
        }
        if (statusLower === "archived") {
            return "Archived";
        }
        return status || "Enabled";
    };

    const getObjectiveLabel = (objective: string) => {
        const objectiveMap: Record<string, string> = {
            TRAFFIC: "Traffic",
            CONVERSIONS: "Website Conversions",
            APP_PROMOTION: "App Promotion",
            REACH: "Reach",
            VIDEO_VIEWS: "Video Views",
            LEAD_GENERATION: "Lead Generation",
            PRODUCT_SALES: "Product Sales",
            ENGAGEMENT: "Engagement",
        };
        return objectiveMap[objective] || objective;
    };

    const getSortIcon = (column: string) => {
        if (sortColumn !== column) {
            return (
                <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === "asc" ? (
            <svg className="w-4 h-4 ml-1 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 ml-1 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const allSelected = campaigns.length > 0 && campaigns.every(c => selectedCampaigns.has(c.campaign_id));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-f60"></div>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="text-center py-12 text-[#556179] text-[13.3px] leading-[1.26]">
                No campaigns found. Create your first TikTok campaign to get started.
            </div>
        );
    }

    return (
        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                <table className="min-w-[1200px] w-full">
                    <thead className="bg-sandstorm-s20">
                        <tr className="border-b border-[#e8e8e3]">
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                                <div className="flex items-center justify-center">
                                    <Checkbox
                                        checked={allSelected}
                                        onChange={() => onSelectAll?.()}
                                        size="small"
                                    />
                                </div>
                            </th>
                            <th
                                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[300px] max-w-[400px]"
                                onClick={() => onSort?.("campaign_name")}
                            >
                                <div className="flex items-center gap-1">
                                    Campaign Name
                                    {getSortIcon("campaign_name")}
                                </div>
                            </th>
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                Type
                            </th>
                            <th
                                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[115px]"
                                onClick={() => onSort?.("operation_status")}
                            >
                                <div className="flex items-center gap-1">
                                    State
                                    {getSortIcon("operation_status")}
                                </div>
                            </th>
                            <th
                                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                onClick={() => onSort?.("budget")}
                            >
                                <div className="flex items-center gap-1">
                                    Budget
                                    {getSortIcon("budget")}
                                </div>
                            </th>
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                Spends
                            </th>
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                Conversions
                            </th>
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                CPA
                            </th>
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                ROAS
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((campaign, index) => (
                            <tr
                                key={campaign.id}
                                className={`group hover:bg-gray-100 transition-colors ${index !== campaigns.length - 1 ? "border-b border-[#e8e8e3]" : ""}`}
                            >
                                <td className="py-[10px] px-[10px]">
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={selectedCampaigns.has(campaign.campaign_id)}
                                            onChange={() => onSelectCampaign?.(campaign.campaign_id)}
                                            size="small"
                                        />
                                    </div>
                                </td>
                                <td className="py-[10px] px-[10px] min-w-[300px] max-w-[400px]">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Edit campaign"
                                        >
                                            <svg className="w-4 h-4 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleCampaignClick(campaign.campaign_id)}
                                            className="flex-1 text-[13.3px] text-[#0b0f16] leading-[1.26] hover:text-[#136d6d] hover:underline cursor-pointer text-left truncate"
                                        >
                                            {campaign.campaign_name}
                                        </button>
                                    </div>
                                </td>
                                <td className="py-[10px] px-[10px]">
                                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        {getObjectiveLabel(campaign.objective_type)}
                                    </span>
                                </td>
                                <td className="py-[10px] px-[10px] min-w-[115px]">
                                    <StatusBadge status={normalizeStatus(campaign.operation_status)} />
                                </td>
                                <td className="py-[10px] px-[10px]">
                                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        {formatCurrency(campaign.budget)}
                                    </span>
                                </td>
                                <td className="py-[10px] px-[10px]">
                                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">—</span>
                                </td>
                                <td className="py-[10px] px-[10px]">
                                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">—</span>
                                </td>
                                <td className="py-[10px] px-[10px]">
                                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">—</span>
                                </td>
                                <td className="py-[10px] px-[10px]">
                                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">—</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
