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
  const handleSelectCampaign = (
    campaignId: string | number,
    checked: boolean
  ) => {
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

  const allSelected =
    campaigns.length > 0 &&
    campaigns.every((c) => selectedCampaigns.has(c.campaign_id));
  const someSelected = campaigns.some((c) =>
    selectedCampaigns.has(c.campaign_id)
  );
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

  if (loading) {
    return (
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#136D6D] mb-4"></div>
        <p className="text-[13.3px] text-[#556179]">Loading campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-[13.3px] text-[#556179]">No campaigns found.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <table className="min-w-full w-full">
          <thead>
            <tr className="border-b border-[#e8e8e3] bg-[#f5f5f0]">
              <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px] sticky left-0 z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]">
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
                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[300px] max-w-[400px] sticky left-[35px] z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]"
                onClick={() => onSort?.("campaign_name")}
              >
                <div className="flex items-center gap-1">
                  Campaign Name
                  {getSortIcon("campaign_name")}
                </div>
              </th>
              <th
                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                onClick={() => onSort?.("objective_type")}
              >
                <div className="flex items-center gap-1">
                  Type
                  {getSortIcon("objective_type")}
                </div>
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
              <th
                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                onClick={() => onSort?.("spends")}
              >
                <div className="flex items-center gap-1">
                  Spends
                  {getSortIcon("spends")}
                </div>
              </th>
              <th
                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                onClick={() => onSort?.("conversions")}
              >
                <div className="flex items-center gap-1">
                  Conversions
                  {getSortIcon("conversions")}
                </div>
              </th>
              <th
                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                onClick={() => onSort?.("cpa")}
              >
                <div className="flex items-center gap-1">
                  CPA
                  {getSortIcon("cpa")}
                </div>
              </th>
              <th
                className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
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
            <tr className="bg-[#f5f5f0] font-semibold">
              <td className="py-[10px] px-[10px] sticky left-0 z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]"></td>
              <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26] sticky left-[35px] z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]">
                Total ({campaigns.length})
              </td>
              <td className="py-[10px] px-[10px]"></td>
              <td className="py-[10px] px-[10px]"></td>
              <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                {formatCurrency(
                  campaigns.reduce((sum, c) => sum + (c.budget || 0), 0)
                )}
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
              <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                —
              </td>
            </tr>
            {campaigns.map((campaign, index) => {
              const isLastRow = index === campaigns.length - 1;
              return (
                <tr
                  key={campaign.id}
                  className={`group ${
                    !isLastRow ? "border-b border-[#e8e8e3]" : ""
                  } hover:bg-gray-100 transition-colors`}
                >
                  <td
                    className="py-[10px] px-[10px] sticky left-0 z-30 bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedCampaigns.has(campaign.campaign_id)}
                        onChange={(checked) =>
                          handleSelectCampaign(campaign.campaign_id, checked)
                        }
                        size="small"
                      />
                    </div>
                  </td>
                  <td className="py-[10px] px-[10px] min-w-[300px] max-w-[400px] sticky left-[35px] z-30 bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditCampaign) {
                            onEditCampaign(campaign);
                          }
                        }}
                        className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
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
                        onClick={() =>
                          handleCampaignClick(campaign.campaign_id)
                        }
                        className="flex-1 text-[13.3px] text-[#0b0f16] leading-[1.26] hover:text-[#136d6d] hover:underline cursor-pointer text-left truncate"
                      >
                        {campaign.campaign_name || "Unnamed Campaign"}
                      </button>
                    </div>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {getObjectiveLabel(campaign.objective_type)}
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px] min-w-[115px]">
                    <StatusBadge
                      status={
                        normalizeStatus(
                          campaign.operation_status
                        ).toUpperCase() as any
                      }
                    />
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {formatCurrency(campaign.budget)}
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      —
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      —
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      —
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      —
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
