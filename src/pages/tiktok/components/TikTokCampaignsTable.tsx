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

    const getSortIcon = (column: string) => {
        if (sortColumn !== column) {
            return (
                <div className="flex flex-col -gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-2 h-2 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h16z" /></svg>
                    <svg className="w-2 h-2 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8H4z" /></svg>
                </div>
            );
        }
        return sortDirection === "asc" ? (
            <svg className="w-2 h-2 text-[#136D6D]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h16z" /></svg>
        ) : (
            <svg className="w-2 h-2 text-[#136D6D]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8H4z" /></svg>
        );
    };

    if (loading) {
        return (
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#136D6D] mb-4"></div>
                <p className="text-[13.3px] text-[#556179]">Loading campaigns...</p>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-[13.3px] text-[#556179]">No campaigns found.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                <table className="min-w-[1000px] w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[#e8e8e3]">
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                                <div className="flex items-center justify-center">
                                    <Checkbox
                                        checked={campaigns.length > 0 && selectedCampaigns.size === campaigns.length}
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
                            <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] min-w-[150px]">
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
                        {/* Summary Row */}
                        <tr className="border-b border-[#e8e8e3] bg-[#f5f5f0]">
                            <td className="py-[10px] px-[10px]"></td>
                            <td className="py-[10px] px-[10px] text-[13.3px] font-semibold text-[#0b0f16] leading-[1.26]">
                                Total ({campaigns.length})
                            </td>
                            <td className="py-[10px] px-[10px]" colSpan={3}></td>
                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {formatCurrency(campaigns.reduce((sum, c) => sum + (c.budget || 0), 0))}
                            </td>
                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                —
                            </td>
                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                —
                            </td>
                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                —
                            </td>
                        </tr>
                        {campaigns.map((campaign, index) => {
                            const isLastRow = index === campaigns.length - 1;
                            return (
                                <tr
                                    key={campaign.id}
                                    className={`group ${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                                        } hover:bg-gray-100 transition-colors cursor-pointer`}
                                    onClick={() => handleCampaignClick(campaign.campaign_id)}
                                >
                                    <td
                                        className="py-[10px] px-[10px]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={selectedCampaigns.has(campaign.campaign_id)}
                                                onChange={() => onSelectCampaign?.(campaign.campaign_id)}
                                                size="small"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26] max-w-[400px]">
                                        <div className="flex items-center gap-2">
                                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <span className="truncate hover:underline">{campaign.campaign_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        {getObjectiveLabel(campaign.objective_type)}
                                    </td>
                                    <td className="py-[10px] px-[10px]">
                                        <StatusBadge
                                            status={normalizeStatus(campaign.operation_status).toUpperCase() as any}
                                        />
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        {formatCurrency(campaign.budget)}
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        {formatCurrency(campaign.budget)}
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        —
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        —
                                    </td>
                                    <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                        —
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
