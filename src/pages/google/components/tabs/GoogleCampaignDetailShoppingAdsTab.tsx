import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Loader } from "../../../../components/ui/Loader";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";
import { BulkActionsDropdown } from "../BulkActionsDropdown";
import { formatStatusForDisplay } from "../../utils/googleAdsUtils";

interface GoogleListingGroup {
  id: number;
  listing_group_id: number;
  ad_id?: number; // ad_id from ads table (used for API calls)
  listing_group_name?: string;
  listing_group_type?: string;
  status?: string;
  cpc_bid_dollars?: number;
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
  ctr?: number | string;
  spends?: number | string;
  sales?: number | string;
  // Metrics (when API returns them with date range)
  impressions?: number;
  clicks?: number;
  roas?: number;
  conversions?: number;
  conversion_rate?: number;
  cost_per_conversion?: number;
  avg_cpc?: number;
  avg_cost?: number;
  interaction_rate?: number;
}

interface ShoppingAdsSummary {
  total_ads?: number;
  total_spends?: number;
  total_sales?: number;
  total_impressions?: number;
  total_clicks?: number;
  avg_acos?: number;
  avg_roas?: number;
  total_conversions?: number;
  avg_conversion_rate?: number;
  avg_cost_per_conversion?: number;
  avg_cpc?: number;
  avg_cost?: number;
  avg_interaction_rate?: number;
}

interface GoogleCampaignDetailShoppingAdsTabProps {
  listingGroups: GoogleListingGroup[];
  loading: boolean;
  selectedListingGroupIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectListingGroup: (id: number, checked: boolean) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  filters: FilterValues;
  onApplyFilters: (filters: FilterValues) => void;
  syncing: boolean;
  onSync: () => void;
  syncingAnalytics?: boolean;
  onSyncAnalytics?: () => void;
  syncMessage: string | null;
  getSortIcon: (column: string, currentSortBy: string, currentSortOrder: "asc" | "desc") => React.ReactNode;
  formatCurrency2Decimals: (value: number | string | undefined) => string;
  formatPercentage: (value: number | string | undefined) => string;
  onUpdateListingGroupStatus?: (listingGroupId: number, status: string) => Promise<void>;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  onBulkUpdateComplete?: () => void;
  currencyCode?: string;
  summary?: ShoppingAdsSummary | null;
}

export const GoogleCampaignDetailShoppingAdsTab: React.FC<GoogleCampaignDetailShoppingAdsTabProps> = ({
  listingGroups,
  loading,
  selectedListingGroupIds,
  onSelectAll,
  onSelectListingGroup,
  sortBy,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  isFilterPanelOpen,
  onToggleFilterPanel,
  filters,
  onApplyFilters,
  syncMessage,
  getSortIcon,
  formatCurrency2Decimals,
  formatPercentage,
  onUpdateListingGroupStatus,
  createButton,
  createPanel,
  onBulkUpdateComplete,
  currencyCode,
  summary,
}) => {
  const getMetricNumber = (lg: GoogleListingGroup, key: keyof GoogleListingGroup): number => {
    const v = lg[key];
    if (v === undefined || v === null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v) || 0;
    return 0;
  };
  const getAvgCost = (lg: GoogleListingGroup): number => {
    const interactions = lg.clicks ?? 0;
    const spends = getMetricNumber(lg, "spends");
    return interactions > 0 ? spends / interactions : (lg.avg_cost ?? 0);
  };
  const [showBulkConfirmationModal, setShowBulkConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<"ENABLED" | "PAUSED" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const getSelectedListingGroupsData = () =>
    listingGroups.filter((lg) => selectedListingGroupIds.has(lg.id));
  const selectableListingGroups = listingGroups.filter(
    (lg) => (lg.status || "").toUpperCase() !== "REMOVED"
  );
  const isListingGroupRemoved = (lg: { status?: string }) =>
    (lg.status || "").toUpperCase() === "REMOVED";

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!onUpdateListingGroupStatus || selectedListingGroupIds.size === 0) return;
    const selectedData = getSelectedListingGroupsData();
    console.log("[ShoppingAds bulk] runBulkStatus: statusValue=", statusValue, "selectedData count=", selectedData.length);
    let totalUpdated = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    setBulkLoading(true);
    setBulkUpdateResults(null);
    try {
      for (const lg of selectedData) {
        try {
          console.log("[ShoppingAds bulk] calling onUpdateListingGroupStatus with id=", lg.id, "listing_group_id=", lg.listing_group_id, "ad_id=", lg.ad_id);
          await onUpdateListingGroupStatus(lg.id, statusValue);
          totalUpdated += 1;
        } catch (err: unknown) {
          totalFailed += 1;
          const e = err as { message?: string };
          allErrors.push(e?.message || "Failed");
          console.error("[ShoppingAds bulk] update failed for id=", lg.id, err);
        }
      }
      setBulkUpdateResults({ updated: totalUpdated, failed: totalFailed, errors: allErrors });
      if (onBulkUpdateComplete) onBulkUpdateComplete();
    } finally {
      setBulkLoading(false);
    }
  };

  const [editingListingGroupId, setEditingListingGroupId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [pendingChange, setPendingChange] = useState<{
    id: number;
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [updatingListingGroupId, setUpdatingListingGroupId] = useState<number | null>(null);

  const handleStatusClick = (listingGroup: GoogleListingGroup) => {
    if (onUpdateListingGroupStatus) {
      setEditingListingGroupId(listingGroup.id);
      const currentStatus = (listingGroup.status || "ENABLED").toUpperCase();
      const normalizedStatus = currentStatus === "ENABLE" || currentStatus === "ENABLED" 
        ? "ENABLED" 
        : currentStatus === "PAUSE" || currentStatus === "PAUSED"
        ? "PAUSED"
        : currentStatus;
      setEditingStatus(normalizedStatus);
    }
  };

  const handleStatusChange = (listingGroupId: number, newStatus: string) => {
    const listingGroup = listingGroups.find((lg) => lg.id === listingGroupId);
    if (!listingGroup) return;

    const oldStatus = (listingGroup.status || "ENABLED").toUpperCase();
    const newStatusUpper = newStatus.toUpperCase();

    if (newStatusUpper !== oldStatus) {
      setPendingChange({
        id: listingGroupId,
        newValue: newStatusUpper,
        oldValue: oldStatus,
      });
    }
    setEditingListingGroupId(null);
    setEditingStatus("");
  };

  const confirmChange = async () => {
    if (!pendingChange || !onUpdateListingGroupStatus) return;

    setUpdatingListingGroupId(pendingChange.id);
    try {
      await onUpdateListingGroupStatus(pendingChange.id, pendingChange.newValue);
      setPendingChange(null);
    } catch (error) {
      console.error("Failed to update listing group status:", error);
      alert("Failed to update listing group status. Please try again.");
    } finally {
      setUpdatingListingGroupId(null);
    }
  };

  const cancelChange = () => {
    setPendingChange(null);
    setEditingListingGroupId(null);
    setEditingStatus("");
  };

  return (
    <>
      {/* Sync Message */}
      {syncMessage && (
        <div className="mb-4">
          <Banner
            type={syncMessage.includes("error") || syncMessage.includes("Failed") ? "error" : "success"}
            message={syncMessage}
            dismissable={true}
            onDismiss={() => {}}
          />
        </div>
      )}
      
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Shopping Ads
        </h2>
        <div className="flex items-center gap-2">
          {createButton}
          {onUpdateListingGroupStatus && onBulkUpdateComplete && (
            <BulkActionsDropdown
              options={[
                { value: "ENABLED", label: "Enable" },
                { value: "PAUSED", label: "Pause" },
              ]}
              selectedCount={selectedListingGroupIds.size}
              onSelect={(value) => {
                const selectedData = getSelectedListingGroupsData();
                console.log("[ShoppingAds bulk] selectedListingGroupIds (Set):", selectedListingGroupIds.size, Array.from(selectedListingGroupIds));
                console.log("[ShoppingAds bulk] selected rows count:", selectedData.length);
                selectedData.forEach((lg, i) => {
                  console.log(`[ShoppingAds bulk] row ${i}: id=${lg.id}, listing_group_id=${lg.listing_group_id}, ad_id=${lg.ad_id}`);
                });
                setPendingStatusAction(value as "ENABLED" | "PAUSED");
                setShowBulkConfirmationModal(true);
              }}
            />
          )}
          <button
            onClick={onToggleFilterPanel}
            className="edit-button"
          >
            <svg
              className="w-5 h-5 text-[#072929]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-[10.64px] text-[#072929] font-normal">
              Add Filter
            </span>
            <svg
              className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                isFilterPanelOpen ? "rotate-180" : ""
              }`}
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
          </button>
        </div>
      </div>

      {/* Create Panel - below create button */}
      {createPanel}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel
            isOpen={true}
            onClose={onToggleFilterPanel}
            onApply={(newFilters) => {
              onApplyFilters(newFilters);
            }}
            initialFilters={filters}
            filterFields={[
              { value: "ad_id", label: "Shopping Ad" },
              { value: "status", label: "Status" },
              { value: "adgroup_name", label: "Ad Group Name" },
            ]}
          />
        </div>
      )}

      {/* Shopping Ads Table */}
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-8 text-[#556179] text-[13.3px]">
              Loading shopping ads...
            </div>
          ) : listingGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13.3px] text-[#556179] mb-4">
                No shopping ads found
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  <th className="table-header w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectableListingGroups.length > 0 && selectableListingGroups.every((lg) => selectedListingGroupIds.has(lg.id))}
                        onChange={(checked) => selectableListingGroups.forEach((lg) => onSelectListingGroup(lg.id, checked))}
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="table-header"
                    onClick={() => onSort("id")}
                  >
                    <div className="flex items-center gap-1">
                      Shopping Ad
                      {getSortIcon("id", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden lg:table-cell">
                    Ad Group
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("status")}
                    style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell">Currency</th>
                  <th className="table-header hidden md:table-cell">Impressions</th>
                  <th className="table-header hidden md:table-cell">Clicks</th>
                  <th className="table-header hidden md:table-cell">Cost</th>
                  <th className="table-header hidden md:table-cell">Conv. value</th>
                  <th className="table-header hidden md:table-cell">Conv. value / cost</th>
                  <th className="table-header hidden md:table-cell">CTR</th>
                  <th className="table-header hidden md:table-cell">Conversions</th>
                  <th className="table-header hidden md:table-cell">Conv. rate</th>
                  <th className="table-header hidden md:table-cell">Cost / conv.</th>
                  <th className="table-header hidden md:table-cell">Avg. CPC</th>
                  <th className="table-header hidden md:table-cell">Avg. cost</th>
                  <th className="table-header hidden md:table-cell">Interaction rate</th>
                </tr>
              </thead>
              <tbody>
                {listingGroups.map((listingGroup, index) => {
                  const isLastRow = index === listingGroups.length - 1;
                  const listingGroupStatus = (listingGroup.status || "").toUpperCase();
                  const isRemoved = listingGroupStatus === "REMOVED";
                  return (
                    <tr
                      key={listingGroup.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${isRemoved ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"} transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedListingGroupIds.has(listingGroup.id)}
                            onChange={(checked) => !isListingGroupRemoved(listingGroup) && onSelectListingGroup(listingGroup.id, checked)}
                            disabled={isRemoved}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {listingGroup.ad_id || listingGroup.id || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26]">
                          {listingGroup.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell w-[140px] max-w-[140px]">
                        <div className="flex items-center gap-2 w-full relative">
                          {updatingListingGroupId === listingGroup.id && pendingChange ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={pendingChange.newValue} />
                              <Loader size="sm" showMessage={false} />
                            </div>
                          ) : pendingChange?.id === listingGroup.id ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={pendingChange.newValue} />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={confirmChange}
                                  className="p-1 hover:bg-green-50 rounded transition-colors"
                                  title="Confirm"
                                >
                                  <svg
                                    className="w-4 h-4 text-green-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={cancelChange}
                                  className="p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <svg
                                    className="w-4 h-4 text-red-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : editingListingGroupId === listingGroup.id && onUpdateListingGroupStatus && !isRemoved ? (
                            <div className="relative z-[100000] w-full" onClick={(e) => e.stopPropagation()}>
                              <Dropdown
                                options={[
                                  { value: "ENABLED", label: "Enabled" },
                                  { value: "PAUSED", label: "Paused" },
                                ]}
                                value={editingStatus}
                                onChange={(val) => {
                                  const newValue = val as string;
                                  handleStatusChange(listingGroup.id, newValue);
                                }}
                                defaultOpen={true}
                                closeOnSelect={true}
                                buttonClassName="w-full text-[13.3px] px-2 py-1"
                                width="w-full"
                                className="w-full"
                                menuClassName="z-[100000]"
                                disabled={isRemoved}
                              />
                            </div>
                          ) : listingGroup.status ? (
                            <button
                              type="button"
                              className={
                                onUpdateListingGroupStatus && !isRemoved
                                  ? "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between"
                                  : "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between cursor-default"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isRemoved) {
                                  handleStatusClick(listingGroup);
                                }
                              }}
                              disabled={!onUpdateListingGroupStatus || isRemoved}
                            >
                            <span className="truncate flex-1 min-w-0 text-left">
                              {listingGroup.status === "ENABLED" || listingGroup.status === "Enabled" || listingGroup.status === "ENABLE"
                                ? "Enabled"
                                : listingGroup.status === "PAUSED" || listingGroup.status === "Paused" || listingGroup.status === "PAUSE"
                                ? "Paused"
                                : listingGroup.status || "Enabled"}
                            </span>
                            {onUpdateListingGroupStatus && (
                              <svg
                                className="w-4 h-4 text-[#072929] flex-shrink-0"
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
                            )}
                          </button>
                        ) : null}
                        </div>
                      </td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{currencyCode ?? "—"}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{Number(listingGroup.impressions ?? 0).toLocaleString()}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{Number(listingGroup.clicks ?? 0).toLocaleString()}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatCurrency2Decimals(getMetricNumber(listingGroup, "spends"))}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatCurrency2Decimals(getMetricNumber(listingGroup, "sales"))}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{getMetricNumber(listingGroup, "roas") ? Number(listingGroup.roas).toFixed(2) : "—"}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatPercentage(listingGroup.ctr ?? 0)}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{Number(listingGroup.conversions ?? 0).toLocaleString()}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatPercentage(listingGroup.conversion_rate ?? 0)}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatCurrency2Decimals(listingGroup.cost_per_conversion ?? 0)}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatCurrency2Decimals(listingGroup.avg_cpc ?? 0)}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatCurrency2Decimals(getAvgCost(listingGroup))}</td>
                      <td className="table-cell table-text leading-[1.26] hidden md:table-cell text-right">{formatPercentage(listingGroup.interaction_rate ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bulk confirmation modal */}
      {onUpdateListingGroupStatus && onBulkUpdateComplete && (
        <BulkUpdateConfirmationModal
          isOpen={showBulkConfirmationModal}
          onClose={() => {
            setShowBulkConfirmationModal(false);
            setPendingStatusAction(null);
            setBulkUpdateResults(null);
          }}
          entityLabel="shopping ad"
          entityNameColumn="Shopping Ad"
          selectedCount={selectedListingGroupIds.size}
          bulkUpdateResults={bulkUpdateResults}
          isValueChange={false}
          valueChangeLabel=""
          previewRows={getSelectedListingGroupsData().map((lg) => {
            const oldStatus = formatStatusForDisplay(lg.status || "ENABLED");
            const newStatus = pendingStatusAction
              ? formatStatusForDisplay(pendingStatusAction)
              : oldStatus;
            return {
              name: String(lg.ad_id ?? lg.id),
              oldValue: oldStatus,
              newValue: newStatus,
            } as BulkUpdatePreviewRow;
          })}
          actionDetails={
            !bulkUpdateResults && pendingStatusAction
              ? ({
                  type: "status",
                  newStatus:
                    pendingStatusAction.charAt(0) +
                    pendingStatusAction.slice(1).toLowerCase(),
                } as BulkUpdateStatusDetails)
              : null
          }
          loading={bulkLoading}
          loadingMessage="Updating shopping ads..."
          successMessage="All shopping ads updated successfully!"
          onConfirm={async () => {
            if (pendingStatusAction) await runBulkStatus(pendingStatusAction);
          }}
        />
      )}

      {/* Pagination */}
      {!loading && listingGroups.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-end mt-4">
          <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-white text-[#136D6D] font-semibold"
                      : "text-black hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                ...
              </span>
            )}
            {totalPages > 5 && (
              <button
                onClick={() => onPageChange(totalPages)}
                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                  currentPage === totalPages
                    ? "bg-white text-[#136D6D] font-semibold"
                    : "text-black hover:bg-gray-50"
                }`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};
