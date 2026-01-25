import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";
import type { AdGroup, CampaignDetail } from "../../services/campaigns";

interface AdGroupsTableProps {
  campaignDetail: CampaignDetail | null;
  adgroups: AdGroup[];
  loading?: boolean;
  campaignId?: string | number; // Optional campaignId - when provided, hides Campaign Name column
  campaignType?: string | null; // SP, SB, or SD - used to show SD-specific fields
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: string | number, checked: boolean) => void;
  selectedIds?: Set<string | number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "status" | "name" | "default_bid";
  } | null;
  editedValue?: string;
  onEditStart?: (
    id: number,
    field: "status" | "default_bid" | "name",
    currentValue: string
  ) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string, adgroupId?: number, field?: "status" | "default_bid" | "name") => void;
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
  campaignType = null, // SP, SB, or SD
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

  // Show all columns on both adgroups page and campaign detail page
  const showCampaignColumn = true;

  // Navigate to campaign detail page
  const handleCampaignNameClick = (adgroup: AdGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!accountId || !adgroup.campaignId) return;

    // Build campaignTypeAndId in format: sp_123456, sb_123456, or sd_123456
    // Default to 'sp' if type is not available
    const campaignType = (adgroup.type || "sp").toLowerCase();
    const campaignTypeAndId = `${campaignType}_${adgroup.campaignId}`;

    navigate(`/brands/${accountId}/amazon/campaigns/${campaignTypeAndId}`);
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
    <div className="table-container" style={{ position: 'relative', minHeight: loading ? '400px' : 'auto' }}>
      <div className="overflow-x-auto w-full">
        {adgroups.length === 0 && !loading ? (
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
                    Name
                    {getSortIcon("name")}
                  </div>
                </th>

                {/* Campaign Name Header - Only show when not in campaign detail */}
                {showCampaignColumn && (
                  <th className="table-header min-w-[225px] max-w-[300px]">Campaign Name</th>
                )}

                {/* Profile Header - Only show when not in campaign detail */}
                {showCampaignColumn && (
                  <th className="table-header">Profile</th>
                )}
                {/* Country Header - Only show when not in campaign detail */}
                {showCampaignColumn && (
                  <th className="table-header min-w-[100px]">Country</th>
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
                  className={`table-header min-w-[100px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center gap-1">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>

                {/* Default Bid Header - Hide for SB campaigns */}
                {campaignType !== "SB" && (
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
                )}

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
              {/* Show skeleton rows when loading and no data */}
              {loading && adgroups.length === 0 ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="table-row">
                    <td className="table-cell" colSpan={14}>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {/* Summary Row */}
                  {summary && (
                    <tr className="table-summary-row">
                      <td className="table-cell"></td>
                      <td className="table-cell table-text leading-[1.26]">
                        Total ({summary.total_adgroups})
                      </td>
                      {showCampaignColumn && (
                        <>
                          <td className="table-cell"></td>
                          <td className="table-cell"></td>
                          <td className="table-cell"></td>
                          <td className="table-cell"></td>
                        </>
                      )}
                      <td className="table-cell"></td>
                      {campaignType !== "SB" && <td className="table-cell"></td>}
                      <td className="table-cell table-text leading-[1.26]">
                        {summary.total_impressions > 0
                          ? `${(
                              (summary.total_clicks /
                                summary.total_impressions) *
                              100
                            ).toFixed(2)}%`
                          : "0.00%"}
                      </td>
                      <td className="table-cell table-text leading-[1.26]">
                        $
                        {summary.total_spends.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="table-cell table-text leading-[1.26]">
                        $
                        {summary.total_sales.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      {showCampaignColumn && (
                        <>
                          <td className="table-cell table-text leading-[1.26]">
                            {summary.total_impressions.toLocaleString()}
                          </td>
                          <td className="table-cell table-text leading-[1.26]">
                            {summary.total_clicks.toLocaleString()}
                          </td>
                          <td className="table-cell table-text leading-[1.26]">
                            {summary.avg_acos.toFixed(2)}%
                          </td>
                          <td className="table-cell table-text leading-[1.26]">
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
                        className={`table-row group ${
                          isArchived ? "bg-gray-100 opacity-60" : ""
                        }`}
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
                        <td className="table-cell min-w-[250px] max-w-[300px]">
                          {(() => {
                            if (isArchived) {
                              return (
                                <span className="table-text leading-[1.26] opacity-60">
                                  {adgroup.name}
                                </span>
                              );
                            }

                            if (inlineEditLoading.has(adgroup.id)) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="table-text leading-[1.26]">
                                    {pendingChange?.field === "name"
                                      ? pendingChange.newValue
                                      : adgroup.name}
                                  </span>
                                  <Loader size="sm" showMessage={false} />
                                </div>
                              );
                            }

                            const nameValue = editingField?.id === adgroup.id &&
                              editingField?.field === "name"
                              ? editedValue
                              : (adgroup.name || "");

                            return (
                              <input
                                type="text"
                                value={nameValue}
                                onFocus={() => {
                                  if (editingField?.id !== adgroup.id ||
                                      editingField?.field !== "name") {
                                    onEditStart?.(
                                      adgroup.id,
                                      "name",
                                      adgroup.name || ""
                                    );
                                  }
                                }}
                                onChange={(e) => {
                                  onEditChange?.(e.target.value);
                                }}
                                onBlur={() => {
                                  onEditEnd?.();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") {
                                    onEditEnd?.();
                                  }
                                }}
                                className="inline-edit-input"
                                disabled={isArchived}
                                title={
                                  isArchived
                                    ? "Archived ad groups cannot be modified"
                                    : undefined
                                }
                              />
                            );
                          })()}
                        </td>

                        {/* Campaign Name - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell min-w-[225px] max-w-[300px]">
                            {adgroup.campaignId ? (
                              <button
                                onClick={(e) =>
                                  handleCampaignNameClick(adgroup, e)
                                }
                                className="table-edit-link text-left block w-full"
                                style={{
                                  whiteSpace: 'normal',
                                  overflow: 'visible',
                                  textOverflow: 'clip',
                                  wordBreak: 'break-word',
                                }}
                                title={
                                  adgroup.campaign_name ||
                                  "View campaign details"
                                }
                              >
                                {adgroup.campaign_name || "—"}
                              </button>
                            ) : (
                              <span className="table-text leading-[1.26] text-left whitespace-normal break-words block w-full">
                                {adgroup.campaign_name || "—"}
                              </span>
                            )}
                          </td>
                        )}

                        {/* Profile - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell">
                            <span className="table-text leading-[1.26] truncate block w-full whitespace-nowrap">
                              {adgroup.profile_name || "—"}
                            </span>
                          </td>
                        )}

                        {/* Country - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell min-w-[100px]">
                            <span className="table-text leading-[1.26] whitespace-nowrap">
                              {adgroup.profile_country_code || "—"}
                            </span>
                          </td>
                        )}

                        {/* Type - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell">
                            <span className="table-text leading-[1.26] ">
                              {adgroup.type || "—"}
                            </span>
                          </td>
                        )}

                        {/* State */}
                        <td className="table-cell min-w-[100px] whitespace-nowrap">
                          {(() => {
                            if (inlineEditLoading.has(adgroup.id)) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="table-text leading-[1.26]">
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
                              );
                            }
                            
                            if (pendingChange?.id === adgroup.id &&
                                pendingChange?.field === "status") {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="table-text leading-[1.26]">
                                    {pendingChange.newValue === "enabled"
                                      ? "Enabled"
                                      : pendingChange.newValue === "paused"
                                      ? "Paused"
                                      : "Archived"}
                                  </span>
                                </div>
                              );
                            }
                            
                            if (isArchived) {
                              return (
                                <div className="opacity-60">
                                  <StatusBadge status={adgroup.status} />
                                </div>
                              );
                            }
                            
                            const statusLower =
                              adgroup.status?.toLowerCase() || "enabled";
                            const statusValue =
                              statusLower === "enable" ||
                              statusLower === "enabled"
                                ? "enabled"
                                : statusLower === "paused"
                                ? "paused"
                                : "archived";
                            
                            const currentValue = editingField?.id === adgroup.id &&
                              editingField?.field === "status"
                              ? editedValue
                              : statusValue;
                            
                            return (
                              <Dropdown
                                options={[
                                  { value: "enabled", label: "Enabled" },
                                  { value: "paused", label: "Paused" },
                                  { value: "archived", label: "Archived" },
                                ]}
                                value={currentValue}
                                onChange={(val) => {
                                  const newValue = val as string;
                                  const wasEditing = editingField?.id === adgroup.id &&
                                    editingField?.field === "status";
                                  
                                  if (!wasEditing) {
                                    onEditStart?.(adgroup.id, "status", statusValue);
                                    // Pass adgroup ID and field directly to avoid state timing issues
                                    setTimeout(() => {
                                      onEditChange?.(newValue);
                                      onEditEnd?.(newValue, adgroup.id, "status");
                                    }, 0);
                                  } else {
                                    onEditChange?.(newValue);
                                    onEditEnd?.(newValue, adgroup.id, "status");
                                  }
                                }}
                                buttonClassName="inline-edit-dropdown"
                                width="w-full"
                                align="center"
                              />
                            );
                          })()}
                        </td>

                        {/* Default Bid - Hide for SB campaigns */}
                        {campaignType !== "SB" && (
                          <td className="table-cell whitespace-nowrap">
                            {(() => {
                              if (inlineEditLoading.has(adgroup.id)) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="table-text leading-[1.26]">
                                      {pendingChange?.field === "default_bid"
                                        ? pendingChange.newValue.startsWith("$")
                                          ? pendingChange.newValue
                                          : `$${parseFloat(
                                              pendingChange.newValue || "0"
                                            ).toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}`
                                        : adgroup.default_bid || "$0.00"}
                                    </span>
                                    <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                );
                              }
                              
                              if (pendingChange?.id === adgroup.id &&
                                  pendingChange?.field === "default_bid") {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="table-text leading-[1.26]">
                                      {pendingChange.newValue.startsWith("$")
                                        ? pendingChange.newValue
                                        : `$${parseFloat(
                                            pendingChange.newValue || "0"
                                          ).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}`}
                                    </span>
                                  </div>
                                );
                              }
                              
                              const currentBid = adgroup.default_bid
                                ? adgroup.default_bid.replace(/[^0-9.]/g, "")
                                : "0";
                              
                              const bidValue = editingField?.id === adgroup.id &&
                                editingField?.field === "default_bid"
                                ? (editedValue?.replace(/[^0-9.]/g, "") || currentBid)
                                : currentBid;
                              
                              return (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={bidValue}
                                  onFocus={() => {
                                    if (!isArchived &&
                                        (editingField?.id !== adgroup.id ||
                                         editingField?.field !== "default_bid")) {
                                      onEditStart?.(adgroup.id, "default_bid", currentBid);
                                    }
                                  }}
                                  onChange={(e) => {
                                    if (isArchived) return;
                                    onEditChange?.(e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    if (isArchived) return;
                                    const inputValue = e.target.value;
                                    if (editingField?.id === adgroup.id &&
                                        editingField?.field === "default_bid") {
                                      onEditEnd?.(inputValue);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (isArchived) return;
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    } else if (e.key === "Escape") {
                                      onEditCancel?.();
                                    }
                                  }}
                                  disabled={isArchived}
                                  className={`inline-edit-input w-24 ${
                                    isArchived ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                                  }`}
                                />
                              );
                            })()}
                          </td>
                        )}

                        {/* CTR */}
                        <td className="table-cell">
                          <span className="table-text leading-[1.26]">
                            {adgroup.ctr}
                          </span>
                        </td>

                        {/* Spends */}
                        <td className="table-cell">
                          <span className="table-text leading-[1.26]">
                            {adgroup.spends}
                          </span>
                        </td>

                        {/* Sales */}
                        <td className="table-cell">
                          <span className="table-text leading-[1.26]">
                            {adgroup.sales}
                          </span>
                        </td>

                        {/* Impressions - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {adgroup.impressions?.toLocaleString() || "0"}
                            </span>
                          </td>
                        )}

                        {/* Clicks - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {adgroup.clicks?.toLocaleString() || "0"}
                            </span>
                          </td>
                        )}

                        {/* ACOS - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {adgroup.acos
                                ? `${parseFloat(String(adgroup.acos)).toFixed(
                                    2
                                  )}%`
                                : "0.00%"}
                            </span>
                          </td>
                        )}

                        {/* ROAS - Only show when not in campaign detail */}
                        {showCampaignColumn && (
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {adgroup.roas
                                ? `${parseFloat(String(adgroup.roas)).toFixed(
                                    2
                                  )} x`
                                : "0.00 x"}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Loading overlay for table - scoped to table container */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Loader size="md" message="Loading adgroups..." />
          </div>
        </div>
      )}
    </div>
  );
};
