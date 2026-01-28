import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Loader } from "../../../../components/ui/Loader";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";

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
  syncing,
  onSync,
  syncingAnalytics,
  onSyncAnalytics,
  syncMessage,
  getSortIcon,
  formatCurrency2Decimals,
  formatPercentage,
  onUpdateListingGroupStatus,
  createButton,
}) => {
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
              { value: "name", label: "Shopping Ad Name" },
              { value: "status", label: "Status" },
              { value: "adgroup_name", label: "Ad Group Name" },
            ]}
          />
        </div>
      )}

      {/* Listing Groups Table */}
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
                        checked={listingGroups.length > 0 && listingGroups.every((lg) => selectedListingGroupIds.has(lg.id))}
                        onChange={onSelectAll}
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="table-header"
                    onClick={() => onSort("listing_group_name")}
                  >
                    <div className="flex items-center gap-1">
                      Listing Groups
                      {getSortIcon("listing_group_name", sortBy, sortOrder)}
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
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("cpc_bid_dollars")}
                  >
                    <div className="flex items-center gap-1">
                      CPC Bid
                      {getSortIcon("cpc_bid_dollars", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell">
                    CTR
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Cost
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Conv. value
                  </th>
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
                            onChange={(checked) => onSelectListingGroup(listingGroup.id, checked)}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26] underline cursor-pointer">
                          All products
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
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(listingGroup.cpc_bid_dollars)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage(listingGroup.ctr)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(listingGroup.spends)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(listingGroup.sales)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
