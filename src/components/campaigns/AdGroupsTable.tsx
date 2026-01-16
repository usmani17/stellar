import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import type { AdGroup, CampaignDetail } from "../../services/campaigns";

interface AdGroupsTableProps {
  campaignDetail: CampaignDetail | null;
  adgroups: AdGroup[];
  loading?: boolean;
  campaignId?: string | number; // Optional campaignId - when provided, hides Campaign Name column
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: string | number, checked: boolean) => void;
  selectedIds?: Set<string | number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "status" | "name";
  } | null;
  editedValue?: string;
  onEditStart?: (
    id: number,
    field: "status" | "default_bid" | "name",
    currentValue: string
  ) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string) => void;
  onEditCancel?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status" | "default_bid" | "name";
    newValue: string;
    oldValue: string;
  } | null;
  onConfirmChange?: () => void;
  onCancelChange?: () => void;
  summary?: {
    total_adgroups: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
  } | null;
}

export const AdGroupsTable: React.FC<AdGroupsTableProps> = ({
  adgroups,
  loading = false,
  campaignId, // Optional: when provided, hides Campaign Name column
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  onSort,
  editingField = null,
  editedValue = "",
  onEditStart,
  onEditChange,
  onEditEnd,
  onEditCancel,
  inlineEditLoading = new Set(),
  pendingChange = null,
  onConfirmChange,
  onCancelChange,
  summary,
  campaignDetail,
}) => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const statusSelectionMadeRef = useRef<number | null>(null);

  // When campaignId is provided, we're in campaign detail view - hide Campaign Name column
  // When campaignId is not provided, we're in all adgroups view - show all columns
  const showCampaignColumn = !campaignId;

  // Navigate to campaign detail page
  const handleCampaignNameClick = (adgroup: AdGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!accountId || !adgroup.campaignId) return;

    // Build campaignTypeAndId in format: sp_123456, sb_123456, or sd_123456
    // Default to 'sp' if type is not available
    const campaignType = (adgroup.type || "sp").toLowerCase();
    const campaignTypeAndId = `${campaignType}_${adgroup.campaignId}`;

    navigate(`/accounts/${accountId}/amazon/campaigns/${campaignTypeAndId}`);
  };
  const getSortIcon = (column: string) => {
    if (sortBy !== column || !onSort) {
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
  const allSelected =
    adgroups.length > 0 &&
    adgroups.every((ag) => selectedIds.has(ag.adGroupId || ag.id));
  const someSelected =
    adgroups.some((ag) => selectedIds.has(ag.adGroupId || ag.id)) &&
    !allSelected;

  const handleSelectAll = (checked: boolean) => {
    console.log("handleSelectAll", checked);
    console.log("onSelectAll type:", typeof onSelectAll);
    console.log("onSelectAll value:", onSelectAll);
    if (onSelectAll) {
      console.log("Calling onSelectAll with:", checked);
      try {
        onSelectAll(checked);
        console.log("onSelectAll called successfully");
      } catch (error) {
        console.error("Error calling onSelectAll:", error);
      }
    } else {
      console.log("onSelectAll is falsy");
    }
  };

  const handleSelect = (id: string | number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading ad groups...
          </div>
        ) : adgroups.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No ad groups found
            </p>
          </div>
        ) : (
            <table className="min-w-[1200px] w-full">
            <thead>
                <tr className="border-b border-[#e8e8e3]">
                  {/* Checkbox Header */}
                  <th className="table-header w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={handleSelectAll}
                        size="small"
                      />
                    </div>
                  </th>

                  {/* Ad Group Name Header */}
                  <th
                    className={`table-header ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("name")}
                  >
                    <div className="flex items-center gap-1">
                      Ad Group Name
                      {getSortIcon("name")}
                    </div>
                  </th>

                  {/* Ad Group ID Header */}
                  <th className="table-header">
                    Ad Group ID
                  </th>

                  {/* Campaign Name Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th className="table-header min-w-[150px] max-w-[200px]">
                      Campaign Name
                    </th>
                  )}

                  {/* Profile Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th className="table-header">
                      Profile
                    </th>
                  )}
                  {/* Country Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th className="table-header min-w-[100px]">
                      Country
                    </th>
                  )}

                  {/* Type Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th
                      className={`table-header ${
                        onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => onSort?.("type")}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        {getSortIcon("type")}
                      </div>
                    </th>
                  )}

                  {/* State Header */}
                  <th
                    className={`table-header min-w-[115px] ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("status")}
                  >
                    <div className="flex items-center gap-1">
                      State
                      {getSortIcon("status")}
                    </div>
                  </th>

                  {/* Default Bid Header */}
                  <th
                    className={`table-header ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("default_bid")}
                  >
                    <div className="flex items-center gap-1">
                      Default Bid
                      {getSortIcon("default_bid")}
                    </div>
                  </th>

                  {/* CTR Header */}
                  <th
                    className={`table-header ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("ctr")}
                  >
                    <div className="flex items-center gap-1">
                      CTR
                      {getSortIcon("ctr")}
                    </div>
                  </th>

                  {/* Spends Header */}
                  <th
                    className={`table-header ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("spends")}
                  >
                    <div className="flex items-center gap-1">
                      Spends
                      {getSortIcon("spends")}
                    </div>
                  </th>

                  {/* Sales Header */}
                  <th
                    className={`table-header ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("sales")}
                  >
                    <div className="flex items-center gap-1">
                      Sales
                      {getSortIcon("sales")}
                    </div>
                  </th>

                  {/* Impressions Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th
                      className={`table-header ${
                        onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => onSort?.("impressions")}
                    >
                      <div className="flex items-center gap-1">
                        Impressions
                        {getSortIcon("impressions")}
                      </div>
                    </th>
                  )}

                  {/* Clicks Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th
                      className={`table-header ${
                        onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => onSort?.("clicks")}
                    >
                      <div className="flex items-center gap-1">
                        Clicks
                        {getSortIcon("clicks")}
                      </div>
                    </th>
                  )}

                  {/* ACOS Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th
                      className={`table-header ${
                        onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => onSort?.("acos")}
                    >
                      <div className="flex items-center gap-1">
                        ACOS
                        {getSortIcon("acos")}
                      </div>
                    </th>
                  )}

                  {/* ROAS Header - Only show when not in campaign detail */}
                  {showCampaignColumn && (
                    <th
                      className={`table-header ${
                        onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => onSort?.("roas")}
                    >
                      <div className="flex items-center gap-1">
                        ROAS
                        {getSortIcon("roas")}
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Summary Row */}
                {summary && (
                  <tr className="table-summary-row">
                    <td className="table-cell"></td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      Total ({summary.total_adgroups})
                    </td>
                    <td className="table-cell"></td>
                    {showCampaignColumn && (
                      <>
                        <td className="table-cell"></td>
                        <td className="table-cell"></td>
                        <td className="table-cell"></td>
                        <td className="table-cell"></td>
                      </>
                    )}
                    <td className="table-cell"></td>
                    <td className="table-cell"></td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {summary.total_impressions > 0
                        ? `${(
                            (summary.total_clicks / summary.total_impressions) *
                            100
                          ).toFixed(2)}%`
                        : "0.00%"}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      $
                      {summary.total_spends.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      $
                      {summary.total_sales.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    {showCampaignColumn && (
                      <>
                        <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {summary.total_impressions.toLocaleString()}
                        </td>
                        <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {summary.total_clicks.toLocaleString()}
                        </td>
                        <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {summary.avg_acos.toFixed(2)}%
                        </td>
                        <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {summary.avg_roas.toFixed(2)} x
                        </td>
                      </>
                    )}
                  </tr>
                )}
                {adgroups.map((adgroup, index) => {
                  const isLastRow = index === adgroups.length - 1;
                  const isArchived =
                    adgroup.status?.toLowerCase() === "archived";
                  return (
                    <tr
                      key={adgroup.id}
                      className={`group ${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${
                        isArchived
                          ? "bg-gray-100 opacity-60"
                          : "hover:bg-gray-100"
                      } transition-colors`}
                    >
                      {/* Checkbox */}
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedIds.has(
                              adgroup.adGroupId || adgroup.id
                            )}
                            onChange={(checked) =>
                              handleSelect(
                                adgroup.adGroupId || adgroup.id,
                                checked
                              )
                            }
                            size="small"
                          />
                        </div>
                      </td>

                      {/* Ad Group Name */}
                      <td className="table-cell min-w-[150px] max-w-[200px]">
                        {inlineEditLoading.has(adgroup.id) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange?.field === "name"
                                ? pendingChange.newValue
                                : adgroup.name}
                            </span>
                            <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : pendingChange?.id === adgroup.id &&
                          pendingChange?.field === "name" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange.newValue}
                            </span>
                          </div>
                        ) : editingField?.id === adgroup.id &&
                          editingField?.field === "name" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedValue}
                              onChange={(e) => onEditChange?.(e.target.value)}
                              className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                              autoFocus
                              onBlur={() => onEditEnd?.()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  onEditEnd?.();
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className={`text-[13.3px] text-left truncate block w-full whitespace-nowrap ${
                              isArchived
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-[#0b0f16] cursor-pointer hover:underline"
                            }`}
                            onClick={() => {
                              if (!isArchived) {
                                onEditStart?.(
                                  adgroup.id,
                                  "name",
                                  adgroup.name || ""
                                );
                              }
                            }}
                            title={adgroup.name}
                          >
                            {adgroup.name}
                          </div>
                        )}
                      </td>

                      {/* Ad Group ID */}
                      <td className="table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {adgroup.adGroupId || "—"}
                        </span>
                      </td>

                      {/* Campaign Name - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell min-w-[150px] max-w-[200px]">
                          {adgroup.campaignId ? (
                            <button
                              onClick={(e) =>
                                handleCampaignNameClick(adgroup, e)
                              }
                              className="text-[13.3px] text-[#136D6D] hover:text-[#0f5a5a] hover:underline leading-[1.26] text-left truncate block w-full cursor-pointer"
                              title={
                                adgroup.campaign_name || "View campaign details"
                              }
                            >
                              {adgroup.campaign_name || "—"}
                            </button>
                          ) : (
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] text-left truncate block w-full">
                              {adgroup.campaign_name || "—"}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Profile - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] truncate block w-full whitespace-nowrap">
                            {adgroup.profile_name || "—"}
                          </span>
                        </td>
                      )}

                      {/* Country - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell min-w-[100px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                            {adgroup.profile_country_code || "—"}
                          </span>
                        </td>
                      )}

                      {/* Type - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] ">
                            {adgroup.type || "—"}
                          </span>
                        </td>
                      )}

                      {/* State */}
                      <td className="table-cell min-w-[115px]">
                        {inlineEditLoading.has(adgroup.id) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange?.field === "status"
                                ? pendingChange.newValue === "enabled"
                                  ? "Enabled"
                                  : pendingChange.newValue === "paused"
                                  ? "Paused"
                                  : "Archived"
                                : adgroup.status}
                            </span>
                            <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : pendingChange?.id === adgroup.id &&
                          pendingChange?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange.newValue === "enabled"
                                ? "Enabled"
                                : pendingChange.newValue === "paused"
                                ? "Paused"
                                : "Archived"}
                            </span>
                          </div>
                        ) : editingField?.id === adgroup.id &&
                          editingField?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <Dropdown
                              options={[
                                { value: "enabled", label: "Enabled" },
                                { value: "paused", label: "Paused" },
                                { value: "archived", label: "Archived" },
                              ]}
                              value={(() => {
                                if (editedValue) return editedValue;
                                const statusLower =
                                  adgroup.status?.toLowerCase() || "enabled";
                                return statusLower === "enable" ||
                                  statusLower === "enabled"
                                  ? "enabled"
                                  : statusLower === "paused"
                                  ? "paused"
                                  : "archived";
                              })()}
                              onChange={(val) => {
                                // Mark that a selection was made for this adgroup
                                statusSelectionMadeRef.current = adgroup.id;
                                const newValue = val as string;
                                onEditChange?.(newValue);
                                // Call onEditEnd with the new value immediately when a value is selected
                                // This will trigger the pending change confirmation
                                onEditEnd?.(newValue);
                                // Clear the ref after a short delay to allow onClose to check it
                                setTimeout(() => {
                                  if (
                                    statusSelectionMadeRef.current ===
                                    adgroup.id
                                  ) {
                                    statusSelectionMadeRef.current = null;
                                  }
                                }, 200);
                              }}
                              onClose={() => {
                                // Only cancel if no selection was made (clicked outside)
                                // If a selection was made, statusSelectionMadeRef will be set
                                if (
                                  statusSelectionMadeRef.current !==
                                    adgroup.id &&
                                  editingField?.id === adgroup.id
                                ) {
                                  onEditCancel?.();
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
                            className={`text-[13.3px] leading-[1.26] ${
                              isArchived
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer hover:underline"
                            }`}
                            onClick={() => {
                              if (!isArchived) {
                                const statusLower =
                                  adgroup.status?.toLowerCase() || "enabled";
                                const statusValue =
                                  statusLower === "enable" ||
                                  statusLower === "enabled"
                                    ? "enabled"
                                    : statusLower === "paused"
                                    ? "paused"
                                    : "archived";
                                onEditStart?.(
                                  adgroup.id,
                                  "status",
                                  statusValue
                                );
                              }
                            }}
                          >
                            <StatusBadge status={adgroup.status} />
                          </div>
                        )}
                      </td>

                      {/* Default Bid */}
                      <td className="table-cell">
                        {inlineEditLoading.has(adgroup.id) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange?.field === "default_bid"
                                ? pendingChange.newValue.startsWith("$")
                                  ? pendingChange.newValue
                                  : `$${parseFloat(pendingChange.newValue || "0").toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                : adgroup.default_bid || "$0.00"}
                            </span>
                            <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : pendingChange?.id === adgroup.id &&
                          pendingChange?.field === "default_bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange.newValue.startsWith("$")
                                ? pendingChange.newValue
                                : `$${parseFloat(pendingChange.newValue || "0").toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`}
                            </span>
                          </div>
                        ) : editingField?.id === adgroup.id &&
                          editingField?.field === "default_bid" ? (
                          <div className="flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editedValue?.replace(/[^0-9.]/g, "") || ""}
                              onChange={(e) => onEditChange?.(e.target.value)}
                              onBlur={(e) => {
                                const inputValue = e.target.value;
                                onEditEnd?.(inputValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                } else if (e.key === "Escape") {
                                  onEditCancel?.();
                                }
                              }}
                              className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-24"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className={`text-[13.3px] text-[#0b0f16] leading-[1.26] ${
                              isArchived
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer hover:underline"
                            }`}
                            onClick={() => {
                              if (!isArchived) {
                                const currentBid = adgroup.default_bid
                                  ? adgroup.default_bid.replace(/[^0-9.]/g, "")
                                  : "0";
                                onEditStart?.(
                                  adgroup.id,
                                  "default_bid",
                                  currentBid
                                );
                              }
                            }}
                          >
                            {adgroup.default_bid || "$0.00"}
                          </div>
                        )}
                      </td>

                      {/* CTR */}
                      <td className="table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {adgroup.ctr}
                        </span>
                      </td>

                      {/* Spends */}
                      <td className="table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {adgroup.spends}
                        </span>
                      </td>

                      {/* Sales */}
                      <td className="table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {adgroup.sales}
                        </span>
                      </td>

                      {/* Impressions - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {adgroup.impressions?.toLocaleString() || "0"}
                          </span>
                        </td>
                      )}

                      {/* Clicks - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {adgroup.clicks?.toLocaleString() || "0"}
                          </span>
                        </td>
                      )}

                      {/* ACOS - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {adgroup.acos
                              ? `${parseFloat(String(adgroup.acos)).toFixed(2)}%`
                              : "0.00%"}
                          </span>
                        </td>
                      )}

                      {/* ROAS - Only show when not in campaign detail */}
                      {showCampaignColumn && (
                        <td className="table-cell">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {adgroup.roas
                              ? `${parseFloat(String(adgroup.roas)).toFixed(2)} x`
                              : "0.00 x"}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
        )}
      </div>
    </div>
  );
};
