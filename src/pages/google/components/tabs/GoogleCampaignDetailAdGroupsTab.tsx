import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Button } from "../../../../components/ui";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import type { GoogleAdGroup } from "./types";

interface GoogleCampaignDetailAdGroupsTabProps {
  adgroups: GoogleAdGroup[];
  loading: boolean;
  selectedAdGroupIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectAdGroup: (id: number, checked: boolean) => void;
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
  onRefresh?: () => void;
  formatPercentage: (value: number | string | undefined) => string;
  formatCurrency2Decimals: (value: number | string | undefined) => string;
  getSortIcon: (
    column: string,
    currentSortBy: string,
    currentSortOrder: "asc" | "desc"
  ) => React.ReactNode;
  onUpdateAdGroupStatus?: (adgroupId: number, status: string) => Promise<void>;
  onUpdateAdGroupBid?: (adgroupId: number, bid: number) => Promise<void>;
  onUpdateAdGroupName?: (adgroupId: number, name: string) => Promise<void>;
  onStartBidConfirmation?: (
    adgroup: GoogleAdGroup,
    oldBid: number,
    newBid: number
  ) => void;
  onStartNameEdit?: (adgroup: GoogleAdGroup) => void;
}

export const GoogleCampaignDetailAdGroupsTab: React.FC<
  GoogleCampaignDetailAdGroupsTabProps
> = ({
  adgroups,
  loading,
  selectedAdGroupIds,
  onSelectAll,
  onSelectAdGroup,
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
  onRefresh,
  formatPercentage,
  formatCurrency2Decimals,
  getSortIcon,
  onUpdateAdGroupStatus,
  onUpdateAdGroupBid,
  onStartBidConfirmation,
  onStartNameEdit,
}) => {
  const [editingAdGroupId, setEditingAdGroupId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"status" | "bid" | null>(
    null
  );
  const [editingValue, setEditingValue] = useState<string>("");
  const [pendingChange, setPendingChange] = useState<{
    id: number;
    field: "status" | "bid" | "name";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [updatingAdGroupId, setUpdatingAdGroupId] = useState<number | null>(
    null
  );

  const handleStatusClick = (adgroup: GoogleAdGroup) => {
    if (onUpdateAdGroupStatus) {
      setEditingAdGroupId(adgroup.id);
      setEditingField("status");
      // Normalize status to uppercase to match dropdown options
      const currentStatus = (adgroup.status || "ENABLED").toUpperCase();
      // Map common variations to standard values
      const normalizedStatus =
        currentStatus === "ENABLE" || currentStatus === "ENABLED"
          ? "ENABLED"
          : currentStatus === "PAUSE" || currentStatus === "PAUSED"
          ? "PAUSED"
          : currentStatus;
      setEditingValue(normalizedStatus);
    }
  };

  const handleBidClick = (adgroup: GoogleAdGroup) => {
    if (onUpdateAdGroupBid) {
      setEditingAdGroupId(adgroup.id);
      setEditingField("bid");
      setEditingValue((adgroup.cpc_bid_dollars || 0).toString());
    }
  };

  const handleNameClick = (adgroup: GoogleAdGroup) => {
    if (onStartNameEdit) {
      onStartNameEdit(adgroup);
    }
  };

  const handleEditEnd = () => {
    if (!editingAdGroupId || !editingField) return;

    const adgroup = adgroups.find((ag) => ag.id === editingAdGroupId);
    if (!adgroup) {
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
      return;
    }

    if (editingField === "status") {
      // Status uses inline confirmation buttons
      const currentStatus = (adgroup.status || "ENABLED").toUpperCase();
      const normalizedCurrent =
        currentStatus === "ENABLE" || currentStatus === "ENABLED"
          ? "ENABLED"
          : currentStatus === "PAUSE" || currentStatus === "PAUSED"
          ? "PAUSED"
          : currentStatus;
      const hasChanged = editingValue.toUpperCase() !== normalizedCurrent;

      if (hasChanged) {
        setPendingChange({
          id: editingAdGroupId,
          field: editingField,
          newValue: editingValue,
          oldValue: normalizedCurrent,
        });
      }
      setEditingAdGroupId(null);
      setEditingField(null);
      if (!hasChanged) {
        setEditingValue("");
      }
    } else if (editingField === "bid") {
      // Bid uses confirmation modal
      const bidValue = parseFloat(editingValue);
      const oldBid = adgroup.cpc_bid_dollars || 0;

      if (isNaN(bidValue) || bidValue < 0) {
        // Invalid bid, reset
        setEditingAdGroupId(null);
        setEditingField(null);
        setEditingValue("");
        return;
      }

      if (bidValue !== oldBid && onStartBidConfirmation) {
        // Show confirmation modal
        onStartBidConfirmation(adgroup, oldBid, bidValue);
      }
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
    }
  };

  const confirmChange = async () => {
    if (!pendingChange) return;

    // Only status uses this confirmation (bid and name use modals)
    if (pendingChange.field !== "status") {
      setPendingChange(null);
      return;
    }

    setUpdatingAdGroupId(pendingChange.id);
    try {
      if (pendingChange.field === "status" && onUpdateAdGroupStatus) {
        await onUpdateAdGroupStatus(pendingChange.id, pendingChange.newValue);
      }
      setPendingChange(null);
    } catch (error) {
      console.error("Failed to update adgroup:", error);
      alert("Failed to update adgroup. Please try again.");
    } finally {
      setUpdatingAdGroupId(null);
    }
  };

  const cancelChange = () => {
    setPendingChange(null);
    setEditingAdGroupId(null);
    setEditingField(null);
    setEditingValue("");
  };
  return (
    <>
      {/* Sync Message */}
      {syncMessage && (
        <div className="mb-4">
          <Banner
            type={
              syncMessage.includes("error") || syncMessage.includes("Failed")
                ? "error"
                : "success"
            }
            message={syncMessage}
            dismissable={true}
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* Header with Filter Button and Sync Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Ad Groups
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFilterPanel}
            className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={loading || syncing || syncingAnalytics}
              className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh list"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
          )}
          <Button
            onClick={onSync}
            disabled={syncing || syncingAnalytics}
            className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Syncing...
              </span>
            ) : (
              <span className="text-[10.64px] text-white font-normal">
                Sync Ad Groups
              </span>
            )}
          </Button>
          {onSyncAnalytics && (
            <Button
              onClick={onSyncAnalytics}
              disabled={syncing || syncingAnalytics}
              className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
            >
              {syncingAnalytics ? (
                <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Syncing Analytics...
                </span>
              ) : (
                <span className="text-[10.64px] text-white font-normal">
                  Sync Analytics
                </span>
              )}
            </Button>
          )}
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
              { value: "adgroup_name", label: "Ad Group Name" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
      )}

      {/* Ad Groups Table */}
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  <th className="table-header w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          adgroups.length > 0 &&
                          adgroups.every((ag) => selectedAdGroupIds.has(ag.id))
                        }
                        onChange={onSelectAll}
                        size="small"
                      />
                    </div>
                  </th>
                  <th className="table-header" onClick={() => onSort("name")}>
                    <div className="flex items-center gap-1">
                      Ad Group Name
                      {getSortIcon("name", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header" onClick={() => onSort("status")}>
                    <div className="flex items-center gap-1">
                      State
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Default max. CPC
                  </th>
                  <th className="table-header hidden md:table-cell">CTR</th>
                  <th className="table-header hidden md:table-cell">Spends</th>
                  <th className="table-header hidden md:table-cell">Sales</th>
                </tr>
              </thead>
              <tbody>
                {adgroups.map((adgroup, index) => {
                  const isLastRow = index === adgroups.length - 1;
                  return (
                    <tr
                      key={adgroup.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedAdGroupIds.has(adgroup.id)}
                            onChange={(checked) =>
                              onSelectAdGroup(adgroup.id, checked)
                            }
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          onClick={() =>
                            onStartNameEdit && handleNameClick(adgroup)
                          }
                          className={`text-[13.3px] text-[#0b0f16] leading-[1.26] ${
                            onStartNameEdit
                              ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                              : ""
                          }`}
                        >
                          {adgroup.adgroup_name || adgroup.name || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <div className="relative w-full">
                          {updatingAdGroupId === adgroup.id &&
                          pendingChange?.field === "status" ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={pendingChange.newValue} />
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                            </div>
                          ) : pendingChange?.id === adgroup.id &&
                            pendingChange?.field === "status" ? (
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
                          ) : editingAdGroupId === adgroup.id &&
                            editingField === "status" &&
                            onUpdateAdGroupStatus ? (
                            <div className="relative z-[100000]">
                              <Dropdown
                                options={[
                                  { value: "ENABLED", label: "Enabled" },
                                  { value: "PAUSED", label: "Paused" },
                                ]}
                                value={editingValue}
                                onChange={(val) => {
                                  const newValue = val as string;
                                  setEditingValue(newValue);
                                  // Immediately trigger confirmation flow
                                  const adgroupForEdit = adgroups.find(
                                    (ag) => ag.id === editingAdGroupId
                                  );
                                  if (adgroupForEdit) {
                                    const currentStatus = (
                                      adgroupForEdit.status || "ENABLED"
                                    ).toUpperCase();
                                    const normalizedCurrent =
                                      currentStatus === "ENABLE" ||
                                      currentStatus === "ENABLED"
                                        ? "ENABLED"
                                        : currentStatus === "PAUSE" ||
                                          currentStatus === "PAUSED"
                                        ? "PAUSED"
                                        : currentStatus;
                                    const normalizedNew =
                                      newValue.toUpperCase();

                                    if (normalizedNew !== normalizedCurrent) {
                                      setPendingChange({
                                        id: editingAdGroupId,
                                        field: "status",
                                        newValue: normalizedNew,
                                        oldValue: normalizedCurrent,
                                      });
                                    }
                                    setEditingAdGroupId(null);
                                    setEditingField(null);
                                  }
                                }}
                                defaultOpen={true}
                                closeOnSelect={true}
                                buttonClassName="text-[13.3px] px-2 py-1 min-w-0"
                                width="w-[100px]"
                                align="left"
                                menuClassName="z-[100000]"
                              />
                            </div>
                          ) : (
                            <div
                              className={
                                onUpdateAdGroupStatus
                                  ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                  : ""
                              }
                              onClick={() =>
                                onUpdateAdGroupStatus &&
                                handleStatusClick(adgroup)
                              }
                            >
                              <StatusBadge status={adgroup.status} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingAdGroupId === adgroup.id &&
                        pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {formatCurrency2Decimals(
                                parseFloat(pendingChange.newValue)
                              )}
                            </span>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : pendingChange?.id === adgroup.id &&
                          pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {formatCurrency2Decimals(
                                parseFloat(pendingChange.newValue)
                              )}
                            </span>
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
                        ) : editingAdGroupId === adgroup.id &&
                          editingField === "bid" &&
                          onUpdateAdGroupBid ? (
                          <div className="flex items-center">
                            <span className="text-[13.3px] text-[#0b0f16] mr-1">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleEditEnd()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                } else if (e.key === "Escape") {
                                  setEditingAdGroupId(null);
                                  setEditingField(null);
                                  setEditingValue("");
                                }
                              }}
                              autoFocus
                              className="w-24 px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
                            />
                          </div>
                        ) : (
                          <p
                            onClick={() =>
                              onUpdateAdGroupBid && handleBidClick(adgroup)
                            }
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                          >
                            {formatCurrency2Decimals(adgroup.cpc_bid_dollars)}
                          </p>
                        )}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatPercentage(adgroup.ctr)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency2Decimals(adgroup.spends)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency2Decimals(adgroup.sales)}
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
      {!loading && adgroups.length > 0 && totalPages > 1 && (
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
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
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
