import React, { useState, useRef, useEffect } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Button } from "../../../../components/ui";
import { Loader } from "../../../../components/ui/Loader";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import type { GoogleAdGroup } from "./GoogleTypes";
import { googleAdwordsAdGroupsService } from "../../../../services/googleAdwords/googleAdwordsAdGroups";

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
  onStartNameEdit?: (adgroup: GoogleAdGroup) => void;
  accountId?: string;
  onBulkUpdateComplete?: () => void;
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
  syncingAnalytics,
  syncMessage,
  onRefresh,
  formatPercentage,
  formatCurrency2Decimals,
  getSortIcon,
  onUpdateAdGroupStatus,
  onUpdateAdGroupBid,
  onStartNameEdit,
  accountId,
  onBulkUpdateComplete,
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
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "ENABLED" | "PAUSED" | null
  >(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditAdGroup, setInlineEditAdGroup] = useState<GoogleAdGroup | null>(null);
  const [inlineEditField, setInlineEditField] = useState<"status" | null>(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [showBidConfirmationModal, setShowBidConfirmationModal] = useState(false);
  const [bidConfirmationData, setBidConfirmationData] = useState<{
    adgroup: GoogleAdGroup;
    oldBid: number;
    newBid: number;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusSelectionMadeRef = useRef<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowBulkActions(false);
      }
    };

    if (showBulkActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActions]);

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
      const bidValue = (adgroup.cpc_bid_dollars || 0).toString().replace(/\$/g, "");
      setEditingValue(bidValue);
    }
  };

  const handleNameClick = (adgroup: GoogleAdGroup) => {
    if (onStartNameEdit) {
      onStartNameEdit(adgroup);
    }
  };

  const cancelInlineEdit = () => {
    setIsCancelling(true);
    setEditingAdGroupId(null);
    setEditingField(null);
    setEditingValue("");
    setTimeout(() => {
      setIsCancelling(false);
    }, 100);
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

    if (editingField === "bid") {
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

      if (bidValue !== oldBid) {
        // Show confirmation modal
        setBidConfirmationData({ adgroup, oldBid, newBid: bidValue });
        setShowBidConfirmationModal(true);
      }
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
    }
  };

  const confirmInlineEdit = (newValueOverride?: string) => {
    if (!editingAdGroupId || !editingField || isCancelling) return;

    const adgroup = adgroups.find((ag) => ag.id === editingAdGroupId);
    if (!adgroup) {
      cancelInlineEdit();
      return;
    }

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editingValue;

    if (editingField === "status") {
      // Status uses modal confirmation (matches Google campaign table pattern)
      const oldStatusRaw = (adgroup.status || "ENABLED").trim();
      const newStatusRaw = valueToCheck.trim();
      const hasChanged = newStatusRaw.toUpperCase() !== oldStatusRaw.toUpperCase();

      if (!hasChanged) {
        cancelInlineEdit();
        return;
      }

      // Format status values for display
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        REMOVED: "Remove",
        Enabled: "Enabled",
        Paused: "Paused",
        Removed: "Remove",
      };
      const oldValue = statusDisplayMap[oldStatusRaw] || oldStatusRaw;
      const newValue = statusDisplayMap[newStatusRaw] || newStatusRaw;

      setInlineEditAdGroup(adgroup);
      setInlineEditField("status");
      setInlineEditOldValue(oldValue);
      setInlineEditNewValue(newValue);
      setShowInlineEditModal(true);
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
      return;
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

      if (bidValue !== oldBid) {
        // Show confirmation modal
        setBidConfirmationData({ adgroup, oldBid, newBid: bidValue });
        setShowBidConfirmationModal(true);
      }
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
    }
  };

  const runInlineEdit = async () => {
    if (!inlineEditAdGroup || !inlineEditField || !accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setInlineEditLoading(true);

      if (inlineEditField === "status") {
        // Map display values back to API values
        const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
          Enabled: "ENABLED",
          ENABLED: "ENABLED",
          Paused: "PAUSED",
          PAUSED: "PAUSED",
        };
        const statusValue = statusMap[inlineEditNewValue] || "ENABLED";

        // Find the adgroup to get adgroup_id
        const adgroup = adgroups.find(
          (ag) => ag.id === inlineEditAdGroup.id
        );
        if (!adgroup || !adgroup.adgroup_id) {
          alert("Ad group not found");
          return;
        }

        await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
          accountIdNum,
          {
            adgroupIds: [adgroup.adgroup_id],
            action: "status",
            status: statusValue,
          }
        );

        // Refresh data if callback provided
        if (onBulkUpdateComplete) {
          onBulkUpdateComplete();
        } else if (onRefresh) {
          onRefresh();
        }
      }

      setShowInlineEditModal(false);
      setInlineEditAdGroup(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    } catch (error: any) {
      console.error("Failed to update ad group:", error);
      alert(
        error?.response?.data?.error ||
          "Failed to update ad group. Please try again."
      );
    } finally {
      setInlineEditLoading(false);
    }
  };

  const cancelInlineEditModal = () => {
    setShowInlineEditModal(false);
    setInlineEditAdGroup(null);
    setInlineEditField(null);
    setInlineEditOldValue("");
    setInlineEditNewValue("");
  };

  const confirmChange = async () => {
    if (!pendingChange) return;

    // Only bid uses this confirmation (status now uses modal)
    if (pendingChange.field !== "bid") {
      setPendingChange(null);
      return;
    }

    setUpdatingAdGroupId(pendingChange.id);
    try {
      if (pendingChange.field === "bid" && onUpdateAdGroupBid) {
        await onUpdateAdGroupBid(
          pendingChange.id,
          parseFloat(pendingChange.newValue)
        );
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

  const handleBulkStatusUpdate = async (status: "ENABLED" | "PAUSED") => {
    if (!accountId || selectedAdGroupIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      const selectedAdGroupIdsArray = Array.from(selectedAdGroupIds).map(
        (id) => {
          const adgroup = adgroups.find((ag) => ag.id === id);
          return adgroup?.adgroup_id || id;
        }
      );

      const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
        accountIdNum,
        {
          adgroupIds: selectedAdGroupIdsArray,
          action: "status",
          status: status,
        }
      );

      // Store results
      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Refresh data if callback provided
      if (onBulkUpdateComplete) {
        onBulkUpdateComplete();
      } else if (onRefresh) {
        onRefresh();
      }

      // Clear selection - use onSelectAll to clear all
      onSelectAll(false);
    } catch (error: any) {
      console.error("Failed to bulk update ad groups:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update ad groups. Please try again.";
      alert(errorMessage);
      setBulkUpdateResults({
        updated: 0,
        failed: selectedAdGroupIds.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
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
        <div className="flex items-center gap-2">
          <div
            className="relative inline-flex justify-end"
            ref={dropdownRef}
          >
            <Button
              type="button"
              variant="ghost"
              className="edit-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBulkActions((prev) => !prev);
              }}
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                />
              </svg>
              <span className="text-[10.64px] text-[#072929] font-normal">
                Edit
              </span>
            </Button>
            {showBulkActions && (
              <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                <div className="overflow-y-auto">
                  {[
                    { value: "ENABLED", label: "Enabled" },
                    { value: "PAUSED", label: "Pause" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={selectedAdGroupIds.size === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedAdGroupIds.size === 0) return;
                        setPendingStatusAction(opt.value as "ENABLED" | "PAUSED");
                        setShowConfirmationModal(true);
                        setShowBulkActions(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel
            isOpen={true}
            onClose={onToggleFilterPanel}
            onApply={(newFilters) => {
              // Transform filters to match backend field names
              // Map "status" to "adgroup_status" for ad groups
              const transformedFilters = newFilters.map((filter) => {
                if (filter.field === "status") {
                  return {
                    ...filter,
                    field: "adgroup_status" as any,
                  };
                }
                return filter;
              });
              onApplyFilters(transformedFilters as FilterValues);
            }}
            initialFilters={filters.map((filter) => {
              // Transform initial filters from backend format to FilterPanel format
              // Map "adgroup_status" back to "status" for display
              if ((filter.field as string) === "adgroup_status") {
                return {
                  ...filter,
                  field: "status" as FilterValues[0]["field"],
                };
              }
              return filter;
            })}
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
                  <th className="table-header min-w-[300px]" onClick={() => onSort("name")}>
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
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("cpc_bid_dollars")}>
                    <div className="flex items-center gap-1">
                      Default max. CPC
                      {getSortIcon("cpc_bid_dollars", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("ctr")}>
                    <div className="flex items-center gap-1">
                      CTR
                      {getSortIcon("ctr", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("spends")}>
                    <div className="flex items-center gap-1">
                      Cost
                      {getSortIcon("spends", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("sales")}>
                    <div className="flex items-center gap-1">
                      Conv. value
                      {getSortIcon("sales", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("impressions")}>
                    <div className="flex items-center gap-1">
                      Impressions
                      {getSortIcon("impressions", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("clicks")}>
                    <div className="flex items-center gap-1">
                      Clicks
                      {getSortIcon("clicks", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("roas")}>
                    <div className="flex items-center gap-1">
                      Conv. value / cost
                      {getSortIcon("roas", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("avg_cpc")}>
                    <div className="flex items-center gap-1">
                      Avg. CPC
                      {getSortIcon("avg_cpc", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("conversions")}>
                    <div className="flex items-center gap-1">
                      Conversions
                      {getSortIcon("conversions", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("conversion_rate")}>
                    <div className="flex items-center gap-1">
                      Conv. rate
                      {getSortIcon("conversion_rate", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("cost_per_conversion")}>
                    <div className="flex items-center gap-1">
                      Cost / conv.
                      {getSortIcon("cost_per_conversion", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("avg_cost")}>
                    <div className="flex items-center gap-1">
                      Avg. cost
                      {getSortIcon("avg_cost", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden md:table-cell" onClick={() => onSort("interaction_rate")}>
                    <div className="flex items-center gap-1">
                      Interaction rate
                      {getSortIcon("interaction_rate", sortBy, sortOrder)}
                    </div>
                  </th>
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
                      <td className="table-cell min-w-[300px]">
                        <span
                          onClick={() =>
                            onStartNameEdit && handleNameClick(adgroup)
                          }
                          className={`table-text leading-[1.26] ${
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
                              <Loader size="sm" showMessage={false} />
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
                            <div className="flex items-center gap-2">
                              <Dropdown
                                options={[
                                  { value: "ENABLED", label: "Enabled" },
                                  { value: "PAUSED", label: "Paused" },
                                  { value: "REMOVED", label: "Remove" },
                                ]}
                                value={editingValue}
                                onChange={(val) => {
                                  // Mark that a selection was made (matches Google campaign table pattern)
                                  statusSelectionMadeRef.current = adgroup.id;
                                  const newValue = val as string;
                                  setEditingValue(newValue);
                                  
                                  // Close dropdown immediately when REMOVED is selected
                                  if (newValue === "REMOVED") {
                                    setEditingAdGroupId(null);
                                    setEditingField(null);
                                  }
                                  
                                  // Call confirmInlineEdit immediately when a value is selected
                                  // This will trigger the modal confirmation (matches Google campaign table pattern)
                                  confirmInlineEdit(newValue);
                                  // Clear the ref after a short delay to allow onClose to check it
                                  setTimeout(() => {
                                    if (statusSelectionMadeRef.current === adgroup.id) {
                                      statusSelectionMadeRef.current = null;
                                    }
                                  }, 200);
                                }}
                                onClose={() => {
                                  // Only cancel if no selection was made (clicked outside)
                                  // If a selection was made, statusSelectionMadeRef will be set
                                  // This matches Google campaign table pattern exactly
                                  if (
                                    statusSelectionMadeRef.current !== adgroup.id &&
                                    editingAdGroupId === adgroup.id
                                  ) {
                                    cancelInlineEdit();
                                  }
                                }}
                                defaultOpen={false}
                                closeOnSelect={true}
                                showCheckmark={false}
                                buttonClassName="w-full text-[13.3px] px-2 py-1"
                                width="w-full"
                                align="center"
                                className="w-full"
                                menuClassName="z-[100000]"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={
                                onUpdateAdGroupStatus
                                  ? "inline-edit-dropdown w-full text-[13.3px] min-w-0 flex items-center justify-between"
                                  : "inline-edit-dropdown w-full text-[13.3px] min-w-0 flex items-center justify-between cursor-default"
                              }
                              onClick={() =>
                                onUpdateAdGroupStatus &&
                                handleStatusClick(adgroup)
                              }
                              disabled={!onUpdateAdGroupStatus}
                            >
                              <span className="truncate flex-1 min-w-0 text-left">
                                {adgroup.status === "ENABLED" || adgroup.status === "Enabled" || adgroup.status === "ENABLE"
                                  ? "Enabled"
                                  : adgroup.status === "PAUSED" || adgroup.status === "Paused" || adgroup.status === "PAUSE"
                                  ? "Paused"
                                  : adgroup.status === "REMOVED" || adgroup.status === "Removed" || adgroup.status === "REMOVE"
                                  ? "Remove"
                                  : adgroup.status || "Enabled"}
                              </span>
                              {onUpdateAdGroupStatus && (
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
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingAdGroupId === adgroup.id &&
                        pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {formatCurrency2Decimals(
                                parseFloat(pendingChange.newValue)
                              )}
                            </span>
                            <Loader size="sm" showMessage={false} />
                          </div>
                        ) : pendingChange?.id === adgroup.id &&
                          pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
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
                          <div className="relative" style={{ width: "96px" }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingValue.replace(/\$/g, "")}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\$/g, "");
                                setEditingValue(value);
                              }}
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
                              className="inline-edit-input"
                              style={{ 
                                width: "96px", 
                                minWidth: "96px", 
                                maxWidth: "96px",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateAdGroupBid) {
                                handleBidClick(adgroup);
                              }
                            }}
                            disabled={!onUpdateAdGroupBid}
                            className={
                              onUpdateAdGroupBid
                                ? "inline-edit-input w-24 cursor-pointer text-left disabled:cursor-default"
                                : "inline-edit-input w-24 cursor-default text-left"
                            }
                          >
                            {formatCurrency2Decimals(adgroup.cpc_bid_dollars)}
                          </button>
                        )}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage(adgroup.ctr)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(adgroup.spends)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(adgroup.sales)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((adgroup as any).impressions || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((adgroup as any).clicks || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((adgroup as any).roas || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals((adgroup as any).avg_cpc || (adgroup as any).cpc || 0)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((adgroup as any).conversions || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage((adgroup as any).conversion_rate || 0)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals((adgroup as any).cost_per_conversion || 0)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(
                            (() => {
                              const interactions = Number((adgroup as any).interactions ?? (adgroup as any).clicks ?? 0);
                              const spends = Number(adgroup.spends ?? 0);
                              return interactions > 0 ? spends / interactions : Number((adgroup as any).avg_cost ?? 0);
                            })()
                          )}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage((adgroup as any).interaction_rate || 0)}
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

      {/* Bulk Status Update Confirmation Modal */}
      {showConfirmationModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkLoading) {
              setShowConfirmationModal(false);
              setPendingStatusAction(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm Status Change
            </h3>

            <div className="mb-4">
              <p className="text-[12.16px] text-[#556179] mb-2">
                {selectedAdGroupIds.size} ad group
                {selectedAdGroupIds.size !== 1 ? "s" : ""} will be updated
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.16px] text-[#556179]">
                    New Status:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    {pendingStatusAction
                      ? pendingStatusAction.charAt(0) +
                        pendingStatusAction.slice(1).toLowerCase()
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            {bulkUpdateResults && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-[12.16px] text-[#556179] mb-1">
                  Updated: {bulkUpdateResults.updated} | Failed:{" "}
                  {bulkUpdateResults.failed}
                </p>
                {bulkUpdateResults.errors.length > 0 && (
                  <div className="mt-2">
                    {bulkUpdateResults.errors.map((error, idx) => (
                      <p
                        key={idx}
                        className="text-[11px] text-red-600 mt-1"
                      >
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              {bulkUpdateResults ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setShowBulkActions(false);
                    setPendingStatusAction(null);
                    setBulkUpdateResults(null);
                  }}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmationModal(false);
                      setPendingStatusAction(null);
                    }}
                    className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingStatusAction) {
                        await handleBulkStatusUpdate(pendingStatusAction);
                      }
                    }}
                    disabled={bulkLoading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkLoading ? "Updating..." : "Confirm"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline Edit Modal for Status */}
      {showInlineEditModal && inlineEditAdGroup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !inlineEditLoading) {
              cancelInlineEditModal();
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm Status Change
            </h3>

            <div className="mb-4">
              <p className="text-[12.16px] text-[#556179] mb-2">
                Ad Group:{" "}
                <span className="font-semibold text-[#072929]">
                  {inlineEditAdGroup.adgroup_name ||
                    inlineEditAdGroup.name ||
                    "Unnamed Ad Group"}
                </span>
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.16px] text-[#556179]">
                    Status:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.16px] text-[#556179]">
                      {inlineEditOldValue}
                    </span>
                    <span className="text-[12.16px] text-[#556179]">→</span>
                    <span className="text-[12.16px] font-semibold text-[#072929]">
                      {inlineEditNewValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelInlineEditModal}
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runInlineEdit}
                disabled={inlineEditLoading}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inlineEditLoading ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Change Confirmation Modal */}
      {showBidConfirmationModal && bidConfirmationData && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && updatingAdGroupId !== bidConfirmationData.adgroup.id) {
              setShowBidConfirmationModal(false);
              setBidConfirmationData(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
              Confirm Bid Change
            </h3>
            <div className="mb-4">
              <p className="text-[12.8px] text-[#556179] mb-2">
                Ad Group:{" "}
                <span className="font-semibold text-[#072929]">
                  {bidConfirmationData.adgroup.name || "Unnamed Ad Group"}
                </span>
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.8px] text-[#556179]">Default max. CPC:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.8px] text-[#556179]">
                      {formatCurrency2Decimals(bidConfirmationData.oldBid)}
                    </span>
                    <span className="text-[12.8px] text-[#556179]">→</span>
                    <span className="text-[12.8px] font-semibold text-[#072929]">
                      {formatCurrency2Decimals(bidConfirmationData.newBid)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBidConfirmationModal(false);
                  setBidConfirmationData(null);
                }}
                disabled={updatingAdGroupId === bidConfirmationData.adgroup.id}
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onUpdateAdGroupBid || !bidConfirmationData) return;
                  
                  setUpdatingAdGroupId(bidConfirmationData.adgroup.id);
                  try {
                    await onUpdateAdGroupBid(
                      bidConfirmationData.adgroup.id,
                      bidConfirmationData.newBid
                    );
                    setShowBidConfirmationModal(false);
                    setBidConfirmationData(null);
                  } catch (error) {
                    console.error("Failed to update bid:", error);
                  } finally {
                    setUpdatingAdGroupId(null);
                  }
                }}
                disabled={updatingAdGroupId === bidConfirmationData.adgroup.id}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingAdGroupId === bidConfirmationData.adgroup.id
                  ? "Updating..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
