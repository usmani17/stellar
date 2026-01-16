import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Dropdown } from "../../../components/ui/Dropdown";
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
    spend?: number;
    conversions?: number;
    cpa?: number;
    roas?: number;
    profile_name?: string;
}

interface TikTokCampaignsTableProps {
    campaigns: TikTokCampaign[];
    loading: boolean;
    onSort?: (column: string) => void;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    selectedCampaigns?: Set<string | number>;
    onSelectionChange?: (selected: Set<string | number>) => void;
    onEditCampaign?: (campaign: TikTokCampaign) => void;
    editingCell?: {
        campaign_id: string;
        field: "operation_status" | "budget";
    } | null;
    editedValue?: string;
    onStartInlineEdit?: (campaign: TikTokCampaign, field: "operation_status" | "budget") => void;
    onCancelInlineEdit?: () => void;
    onInlineEditChange?: (value: string) => void;
    onConfirmInlineEdit?: (newValueOverride?: string) => void;
}

export const TikTokCampaignsTable: React.FC<TikTokCampaignsTableProps> = ({
    campaigns,
    loading,
    onSort,
    sortBy,
    sortOrder,
    selectedCampaigns = new Set(),
    onSelectionChange,
    onEditCampaign,
    editingCell,
    editedValue = "",
    onStartInlineEdit,
    onCancelInlineEdit,
    onInlineEditChange,
    onConfirmInlineEdit,
}) => {
    // Check if campaign is deleted (cannot be edited)
    const isDeleted = (campaign: TikTokCampaign): boolean => {
        const statusLower = campaign.operation_status?.toLowerCase() || "";
        return statusLower === "deleted" || statusLower === "delete";
    };

    const handleSelectCampaign = (campaignId: string | number, checked: boolean) => {
        if (!onSelectionChange) return;
        const newSelected = new Set(selectedCampaigns);
        if (checked) {
            newSelected.add(campaignId);
        } else {
            newSelected.delete(campaignId);
        }
        onSelectionChange(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            // Only select non-deleted campaigns
            const selectableIds = new Set(
                campaigns
                    .filter(c => !isDeleted(c))
                    .map(c => c.campaign_id)
            );
            onSelectionChange(selectableIds);
        } else {
            onSelectionChange(new Set());
        }
    };

    // Only count non-deleted campaigns for "all selected" check
    const selectableCampaigns = campaigns.filter(c => !isDeleted(c));
    const allSelected = selectableCampaigns.length > 0 && selectableCampaigns.every(c => selectedCampaigns.has(c.campaign_id));
    const someSelected = selectableCampaigns.some(c => selectedCampaigns.has(c.campaign_id));
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
        if (statusLower === "enable" || statusLower === "enabled" || statusLower === "active") {
            return "Enabled";
        }
        if (statusLower === "disable" || statusLower === "disabled" || statusLower === "paused") {
            return "Paused";
        }
        if (statusLower === "deleted" || statusLower === "delete") {
            return "Deleted";
        }
        if (statusLower === "archived") {
            return "Archived";
        }
        return status || "Enabled";
    };

    const formatBudgetType = (budgetMode?: string): string => {
        if (!budgetMode) return "—";
        const mode = budgetMode.toUpperCase();
        if (mode === "BUDGET_MODE_DAY" || mode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET") {
            return "DAILY";
        }
        if (mode === "BUDGET_MODE_TOTAL") {
            return "LIFETIME";
        }
        if (mode === "BUDGET_MODE_INFINITE") {
            return "UNLIMITED";
        }
        // Fallback: format the mode string
        return mode.replace("BUDGET_MODE_", "").replace(/_/g, " ");
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
                className="w-4 h-4 ml-1 text-[#556179]"
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
                className="w-4 h-4 ml-1 text-[#556179]"
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

    if (loading) {
        return (
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                <div className="text-center py-8 text-[#556179] text-[13.3px]">
                    Loading campaigns...
                </div>
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
                <table className="min-w-[1200px] w-full">
                    <thead>
                        <tr className="border-b border-[#e8e8e3]">
                            {/* Checkbox Header */}
                            <th className="table-header w-[35px] sticky left-0 z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]">
                                <div className="flex items-center justify-center">
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected && !allSelected}
                                        onChange={(checked) => handleSelectAll(checked)}
                                        size="small"
                                    />
                                </div>
                            </th>
                            <th
                                className="table-header cursor-pointer hover:bg-gray-50 w-[400px] table-sticky-first-column"
                                onClick={() => onSort?.("campaign_name")}
                            >
                                <div className="flex items-center gap-1">
                                    Campaign Name
                                    {getSortIcon("campaign_name")}
                                </div>
                            </th>
                            <th
                                className="table-header cursor-pointer hover:bg-gray-50 min-w-[200px]"
                                onClick={() => onSort?.("profile_name")}
                            >
                                <div className="flex items-center gap-1">
                                    Profile
                                    {getSortIcon("profile_name")}
                                </div>
                            </th>
                            <th className="table-header cursor-pointer hover:bg-gray-50 min-w-[60px] whitespace-nowrap" onClick={() => onSort?.("objective_type")}>
                                <div className="flex items-center gap-1">
                                    Type
                                    {getSortIcon("objective_type")}
                                </div>
                            </th>
                            <th
                                className="table-header cursor-pointer hover:bg-gray-50 min-w-[115px]"
                                onClick={() => onSort?.("operation_status")}
                            >
                                <div className="flex items-center gap-1">
                                    State
                                    {getSortIcon("operation_status")}
                                </div>
                            </th>
                            <th
                                className="table-header"
                                onClick={() => onSort?.("budget")}
                            >
                                <div className="flex items-center gap-1">
                                    Budget
                                    {getSortIcon("budget")}
                                </div>
                            </th>
                            <th
                                className="table-header"
                                onClick={() => onSort?.("budgetType")}
                            >
                                <div className="flex items-center gap-1">
                                    <div className="flex flex-col">
                                        <span>Budget</span>
                                        <span>Type</span>
                                    </div>
                                    {getSortIcon("budgetType")}
                                </div>
                            </th>
                            <th
                                className="table-header"
                                onClick={() => onSort?.("spends")}
                            >
                                <div className="flex items-center gap-1">
                                    Spends
                                    {getSortIcon("spends")}
                                </div>
                            </th>
                            <th
                                className="table-header"
                                onClick={() => onSort?.("conversions")}
                            >
                                <div className="flex items-center gap-1">
                                    Conversions
                                    {getSortIcon("conversions")}
                                </div>
                            </th>
                            <th
                                className="table-header"
                                onClick={() => onSort?.("cpa")}
                            >
                                <div className="flex items-center gap-1">
                                    CPA
                                    {getSortIcon("cpa")}
                                </div>
                            </th>
                            <th
                                className="table-header"
                                onClick={() => onSort?.("roas")}
                            >
                                <div className="flex items-center gap-1">
                                    ROAS
                                    {getSortIcon("roas")}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Summary Row */}
                        <tr className="table-summary-row">
                            <td className="table-cell sticky left-0 z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]"></td>
                            <td className="table-cell table-sticky-first-column">
                                Total ({campaigns.length})
                            </td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                            <td className="table-cell"></td>
                        </tr>
                        {campaigns.map((campaign, index) => {
                            const isLastRow = index === campaigns.length - 1;
                            const campaignIsDeleted = isDeleted(campaign);
                            return (
                                <tr
                                    key={campaign.id}
                                    className={`group ${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                                        } ${campaignIsDeleted
                                            ? "bg-gray-100 opacity-60"
                                            : "hover:bg-gray-100"
                                        } transition-colors`}
                                >
                                    <td
                                        className="table-cell sticky left-0 z-30 bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={selectedCampaigns.has(campaign.campaign_id)}
                                                onChange={(checked) => handleSelectCampaign(campaign.campaign_id, checked)}
                                                size="small"
                                            />
                                        </div>
                                    </td>
                                    <td className="table-cell table-sticky-first-column w-[400px] group-hover:bg-gray-100">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEditCampaign) {
                                                        onEditCampaign(campaign);
                                                    }
                                                }}
                                                className="table-edit-icon"
                                                title="Edit campaign"
                                            >
                                                <svg
                                                    className="w-4 h-4 text-[#556179]"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleCampaignClick(campaign.campaign_id)}
                                                className="table-edit-link"
                                            >
                                                {campaign.campaign_name || "Unnamed Campaign"}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="table-cell min-w-[200px] text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                                            {campaign.profile_name && campaign.profile_name.trim() !== ""
                                                ? campaign.profile_name
                                                : "—"}
                                        </span>
                                    </td>
                                    <td className="table-cell text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {getObjectiveLabel(campaign.objective_type)}
                                        </span>
                                    </td>
                                    <td className="table-cell min-w-[115px] text-left">
                                        {/* Deleted campaigns cannot be edited - mimic Amazon archived behavior */}
                                        {campaignIsDeleted ? (
                                            <div
                                                className="rounded px-2 py-1 cursor-not-allowed opacity-60"
                                                title="Deleted campaigns cannot be modified."
                                            >
                                                <StatusBadge status="DELETED" />
                                            </div>
                                        ) : editingCell?.campaign_id === campaign.campaign_id && editingCell?.field === "operation_status" ? (
                                            <div className="dropdown-container" onClick={(e) => e.stopPropagation()}>
                                                <Dropdown
                                                    options={[
                                                        { value: "ENABLE", label: "Enable" },
                                                        { value: "DISABLE", label: "Disable (Pause)" },
                                                        { value: "DELETE", label: "Delete" },
                                                    ]}
                                                    value={editedValue}
                                                    onChange={(val) => {
                                                        const newValue = val as string;
                                                        if (onInlineEditChange) {
                                                            onInlineEditChange(newValue);
                                                        }
                                                        setTimeout(() => {
                                                            if (onConfirmInlineEdit) {
                                                                onConfirmInlineEdit(newValue);
                                                            }
                                                        }, 100);
                                                    }}
                                                    onClose={() => {
                                                        if (onCancelInlineEdit) {
                                                            onCancelInlineEdit();
                                                        }
                                                    }}
                                                    defaultOpen={true}
                                                    closeOnSelect={true}
                                                    buttonClassName="w-full text-[13.3px] px-2 py-1"
                                                    width="w-full"
                                                    align="center"
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="rounded px-2 py-1 cursor-pointer hover:bg-gray-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onStartInlineEdit) {
                                                        onStartInlineEdit(campaign, "operation_status");
                                                    }
                                                }}
                                            >
                                                <StatusBadge
                                                    status={normalizeStatus(campaign.operation_status).toUpperCase() as any}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td className="table-cell text-left">
                                        {/* Deleted campaigns cannot be edited - show budget only, mimic Amazon archived behavior */}
                                        {campaignIsDeleted ? (
                                            <p className="text-[13.3px] text-[#0b0f16] leading-[1.26] rounded px-2 py-1 cursor-not-allowed opacity-60" title="Deleted campaigns cannot be modified.">
                                                {formatCurrency(campaign.budget)}
                                            </p>
                                        ) : editingCell?.campaign_id === campaign.campaign_id && editingCell?.field === "budget" ? (
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editedValue}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        if (onInlineEditChange) {
                                                            onInlineEditChange(e.target.value);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const inputValue = e.target.value;
                                                        if (onConfirmInlineEdit) {
                                                            onConfirmInlineEdit(inputValue);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.currentTarget.blur();
                                                        } else if (e.key === "Escape") {
                                                            if (onCancelInlineEdit) {
                                                                onCancelInlineEdit();
                                                            }
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    className="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                                />
                                            </div>
                                        ) : (
                                            <p
                                                className="text-[13.3px] text-[#0b0f16] leading-[1.26] rounded px-2 py-1 cursor-pointer hover:bg-gray-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onStartInlineEdit) {
                                                        onStartInlineEdit(campaign, "budget");
                                                    }
                                                }}
                                            >
                                                {formatCurrency(campaign.budget)}
                                            </p>
                                        )}
                                    </td>
                                    <td className="table-cell text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatBudgetType(campaign.budget_mode)}
                                        </span>
                                    </td>
                                    <td className="table-cell text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {campaign.spend !== undefined && campaign.spend !== null ? formatCurrency(campaign.spend) : "—"}
                                        </span>
                                    </td>
                                    <td className="table-cell text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {campaign.conversions !== undefined && campaign.conversions !== null ? campaign.conversions.toLocaleString() : "—"}
                                        </span>
                                    </td>
                                    <td className="table-cell text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {campaign.cpa !== undefined && campaign.cpa !== null && campaign.cpa > 0 ? formatCurrency(campaign.cpa) : "—"}
                                        </span>
                                    </td>
                                    <td className="table-cell text-left">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {campaign.roas !== undefined && campaign.roas !== null && campaign.roas > 0 ? campaign.roas.toFixed(2) : "—"}
                                        </span>
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
