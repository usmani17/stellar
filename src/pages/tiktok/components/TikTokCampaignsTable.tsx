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
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === "asc" ? (
            <svg className="w-4 h-4 text-forest-f60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-forest-f60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="text-center py-12 text-gray-500 text-[10.64px]">
                No campaigns found. Create your first TikTok campaign to get started.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left">
                            <Checkbox
                                checked={allSelected}
                                onChange={() => onSelectAll?.()}
                            />
                        </th>
                        <th
                            className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                            onClick={() => onSort?.("campaign_name")}
                        >
                            <div className="flex items-center gap-1">
                                Campaign Name
                                {getSortIcon("campaign_name")}
                            </div>
                        </th>
                        <th className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider">
                            Type
                        </th>
                        <th
                            className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                            onClick={() => onSort?.("operation_status")}
                        >
                            <div className="flex items-center gap-1">
                                Status
                                {getSortIcon("operation_status")}
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                            onClick={() => onSort?.("budget")}
                        >
                            <div className="flex items-center gap-1">
                                Daily Budget
                                {getSortIcon("budget")}
                            </div>
                        </th>
                        <th className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider">
                            Spends
                        </th>
                        <th className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider">
                            Conversions
                        </th>
                        <th className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider">
                            CPA
                        </th>
                        <th className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider">
                            ROAS
                        </th>
                        <th className="px-4 py-3 text-left text-[10.64px] font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map((campaign, index) => (
                        <tr
                            key={campaign.id}
                            className={`hover:bg-gray-50 ${index !== campaigns.length - 1 ? "border-b border-gray-200" : ""}`}
                        >
                            <td className="px-4 py-4">
                                <Checkbox
                                    checked={selectedCampaigns.has(campaign.campaign_id)}
                                    onChange={() => onSelectCampaign?.(campaign.campaign_id)}
                                />
                            </td>
                            <td className="px-4 py-4">
                                <button
                                    onClick={() => handleCampaignClick(campaign.campaign_id)}
                                    className="text-[10.64px] font-medium text-[#136D6D] hover:text-[#0e5a5a] hover:underline cursor-pointer text-left"
                                >
                                    {campaign.campaign_name}
                                </button>
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-gray-600">
                                {getObjectiveLabel(campaign.objective_type)}
                            </td>
                            <td className="px-4 py-4">
                                <StatusBadge status={normalizeStatus(campaign.operation_status)} />
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-[#072929]">
                                {formatCurrency(campaign.budget)}
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-gray-600">
                                —
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-gray-600">
                                —
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-gray-600">
                                —
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-gray-600">
                                —
                            </td>
                            <td className="px-4 py-4 text-[10.64px] text-gray-600">
                                <button className="text-gray-400 hover:text-[#072929] transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
