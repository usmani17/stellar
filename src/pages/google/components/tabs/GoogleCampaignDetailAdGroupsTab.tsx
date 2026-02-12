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
import {
  formatStatusForDisplay,
  convertStatusToApi,
  STATUS_DROPDOWN_OPTIONS,
} from "../../utils/googleAdsUtils";
import { ConfirmationModal } from "../../../../components/ui/ConfirmationModal";
import { TrashIcon } from "lucide-react";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateActionDetails,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";

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
  accountId?: string;
  channelId?: string;
  onBulkUpdateComplete?: () => void;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
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
  onUpdateAdGroupName,
  accountId,
  channelId,
  onBulkUpdateComplete,
  createButton,
  createPanel,
}) => {
    const [editingAdGroupId, setEditingAdGroupId] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<"status" | "bid" | "name" | null>(
      null
    );
    const [editingValue, setEditingValue] = useState<string>("");
    const [updatingAdGroupId, setUpdatingAdGroupId] = useState<number | null>(
      null
    );
    const [updatingField, setUpdatingField] = useState<"status" | "bid" | "name" | null>(
      null
    );
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [inlineEditLoading, setInlineEditLoading] = useState(false);
    const [inlineEditAdGroup, setInlineEditAdGroup] = useState<GoogleAdGroup | null>(null);
    const [inlineEditField, setInlineEditField] = useState<"status" | "name" | null>(null);
    const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
    const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
    const [showBidConfirmationModal, setShowBidConfirmationModal] = useState(false);
    const [bidConfirmationData, setBidConfirmationData] = useState<{
      adgroup: GoogleAdGroup;
      oldBid: number;
      newBid: number;
    } | null>(null);
    const [showNameConfirmationModal, setShowNameConfirmationModal] = useState(false);
    const [nameConfirmationData, setNameConfirmationData] = useState<{
      adgroup: GoogleAdGroup;
      oldName: string;
      newName: string;
    } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const [pendingRemoveChange, setPendingRemoveChange] = useState<{
      value: string;
      adgroupId: string | number;
      field: string;
    } | null>(null);

    // Bulk edit state
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showBidPanel, setShowBidPanel] = useState(false);
    const [pendingStatusAction, setPendingStatusAction] = useState<"ENABLED" | "PAUSED" | null>(null);
    const [showBulkConfirmationModal, setShowBulkConfirmationModal] = useState(false);
    const [isBidChange, setIsBidChange] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkUpdateResults, setBulkUpdateResults] = useState<{
      updated: number;
      failed: number;
      errors: string[];
    } | null>(null);
    const [bidAction, setBidAction] = useState<"increase" | "decrease" | "set">("set");
    const [bidUnit, setBidUnit] = useState<"percent" | "amount">("amount");
    const [bidValue, setBidValue] = useState("");
    const [upperLimit, setUpperLimit] = useState("");
    const [lowerLimit, setLowerLimit] = useState("");
    const bulkActionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (bulkActionsRef.current && !bulkActionsRef.current.contains(e.target as Node)) {
          setShowBulkActions(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSelectedAdgroupsData = () =>
      adgroups.filter((ag) => selectedAdGroupIds.has(ag.id));
    const selectableAdgroups = adgroups.filter(
      (ag) => (ag.status || "").toUpperCase() !== "REMOVED"
    );
    const isAdGroupRemoved = (ag: { status?: string }) =>
      (ag.status || "").toUpperCase() === "REMOVED";

    const calculateNewBid = (currentBid: number): number => {
      const valueNum = parseFloat(bidValue);
      if (isNaN(valueNum)) return currentBid;
      let newBid = currentBid;
      if (bidAction === "increase") {
        if (bidUnit === "percent") newBid = currentBid * (1 + valueNum / 100);
        else newBid = currentBid + valueNum;
        if (upperLimit) {
          const upper = parseFloat(upperLimit);
          if (!isNaN(upper)) newBid = Math.min(newBid, upper);
        }
      } else if (bidAction === "decrease") {
        if (bidUnit === "percent") newBid = currentBid * (1 - valueNum / 100);
        else newBid = currentBid - valueNum;
        if (lowerLimit) {
          const lower = parseFloat(lowerLimit);
          if (!isNaN(lower)) newBid = Math.max(newBid, lower);
        }
      } else if (bidAction === "set") {
        newBid = valueNum;
      }
      return Math.max(0, newBid);
    };

    const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
      if (!accountId || !channelId || selectedAdGroupIds.size === 0) return;
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
      const selectedData = getSelectedAdgroupsData();
      const adgroupIds = selectedData.map((ag) => ag.adgroup_id);
      try {
        setBulkLoading(true);
        setBulkUpdateResults(null);
        const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
          accountIdNum,
          channelIdNum,
          { adgroupIds, action: "status", status: statusValue }
        );
        setBulkUpdateResults({
          updated: response.updated || 0,
          failed: response.failed || 0,
          errors: response.errors || [],
        });
        if (onBulkUpdateComplete) onBulkUpdateComplete();
      } catch (error: any) {
        setBulkUpdateResults({
          updated: 0,
          failed: selectedAdGroupIds.size,
          errors: [error?.response?.data?.error || error?.message || "Failed to update ad groups."],
        });
      } finally {
        setBulkLoading(false);
      }
    };

    const runBulkBid = async () => {
      if (!accountId || !channelId || selectedAdGroupIds.size === 0) return;
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
      const valueNum = parseFloat(bidValue);
      if (isNaN(valueNum)) return;
      const selectedData = getSelectedAdgroupsData();
      const updates = selectedData.map((ag) => ({
        adgroupId: ag.adgroup_id,
        newBid: calculateNewBid(ag.cpc_bid_dollars || 0),
      }));
      try {
        setBulkLoading(true);
        setBulkUpdateResults(null);
        let totalUpdated = 0;
        let totalFailed = 0;
        const allErrors: string[] = [];
        for (const u of updates) {
          try {
            const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
              accountIdNum,
              channelIdNum,
              { adgroupIds: [u.adgroupId], action: "bid", bid: u.newBid }
            );
            if (response.updated) totalUpdated += response.updated;
            if (response.failed) totalFailed += response.failed;
            if (response.errors?.length) allErrors.push(...response.errors);
          } catch (err: any) {
            totalFailed += 1;
            allErrors.push(err?.response?.data?.error || err?.message || "Failed");
          }
        }
        setBulkUpdateResults({ updated: totalUpdated, failed: totalFailed, errors: allErrors });
        if (onBulkUpdateComplete) onBulkUpdateComplete();
      } catch (error: any) {
        setBulkUpdateResults({
          updated: 0,
          failed: selectedAdGroupIds.size,
          errors: [error?.response?.data?.error || error?.message || "Failed to update bids."],
        });
      } finally {
        setBulkLoading(false);
      }
    };

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


    const cancelInlineEdit = () => {
      setIsCancelling(true);
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
      setTimeout(() => {
        setIsCancelling(false);
      }, 100);
    };


    const confirmInlineEdit = (newValueOverride?: string, adgroupOverride?: GoogleAdGroup) => {
      // Use adgroupOverride if provided, otherwise try to find from state
      let adgroup: GoogleAdGroup | undefined;
      let field: "status" | "bid" | "name" | null = null;
      let valueToCheck: string;

      if (adgroupOverride) {
        // Direct adgroup provided - use it
        adgroup = adgroupOverride;
        field = "status"; // Assume status when adgroup is provided directly
        valueToCheck = newValueOverride || "";
      } else {
        // Fallback to state-based lookup
        if (!editingAdGroupId || !editingField || isCancelling) {
          return;
        }

        adgroup = adgroups.find((ag) => ag.id === editingAdGroupId);
        field = editingField;
        valueToCheck = newValueOverride !== undefined ? newValueOverride : editingValue;

        if (!adgroup) {
          cancelInlineEdit();
          return;
        }
      }

      if (field === "status") {
        // Status uses modal confirmation (matches Google campaign table pattern)
        const oldStatusRaw = (adgroup.status || "ENABLED").trim();
        const newStatusRaw = valueToCheck.trim();
        const hasChanged = newStatusRaw.toUpperCase() !== oldStatusRaw.toUpperCase();

        if (!hasChanged) {
          cancelInlineEdit();
          return;
        }

        // Check if status is being changed to REMOVED - show confirmation modal
        if (newStatusRaw.toUpperCase() === "REMOVED") {
          cancelInlineEdit();
          setPendingRemoveChange({
            value: "REMOVED",
            adgroupId: adgroup.adgroup_id,
            field: "status"
          });
          setShowRemoveConfirmation(true);
          return;
        }

        // Format status values for display using utility function
        const oldValue = formatStatusForDisplay(oldStatusRaw);
        const newValue = formatStatusForDisplay(newStatusRaw);

        setInlineEditAdGroup(adgroup);
        setInlineEditField("status");
        setInlineEditOldValue(oldValue);
        setInlineEditNewValue(newValue);
        setShowInlineEditModal(true);
        setEditingAdGroupId(null);
        setEditingField(null);
        setEditingValue("");
        return;
      } else if (field === "bid") {
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
      if (!inlineEditAdGroup || !inlineEditField || !accountId || !channelId) return;
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

      try {
        setInlineEditLoading(true);

        if (inlineEditField === "status") {
          // Convert display status to API format using utility function
          const statusValue = convertStatusToApi(inlineEditNewValue);

          // Find the adgroup to get adgroup_id
          const adgroup = adgroups.find(
            (ag) => ag.id === inlineEditAdGroup.id
          );
          if (!adgroup || !adgroup.adgroup_id) {
            alert("Ad group not found");
            return;
          }

          // REMOVED status - show confirmation modal
          if (statusValue === "REMOVED") {
            setShowInlineEditModal(false);
            setInlineEditAdGroup(null);
            setInlineEditField(null);
            setInlineEditOldValue("");
            setInlineEditNewValue("");
            setPendingRemoveChange({
              value: "REMOVED",
              adgroupId: adgroup.adgroup_id,
              field: "status"
            });
            setShowRemoveConfirmation(true);
            return;
          }

          // Set updating state for loading indicator
          setUpdatingAdGroupId(adgroup.id);
          setUpdatingField("status");

          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
            accountIdNum,
            channelIdNum,
            {
              adgroupIds: [adgroup.adgroup_id],
              action: "status",
              status: statusValue as "ENABLED" | "PAUSED",
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
        // Also clear editing state after successful update
        setEditingAdGroupId(null);
        setEditingField(null);
        setEditingValue("");
        // Clear updating state
        setUpdatingAdGroupId(null);
        setUpdatingField(null);
      } catch (error: any) {
        console.error("Failed to update ad group:", error);
        alert(
          error?.response?.data?.error ||
          "Failed to update ad group. Please try again."
        );
        // Clear updating state on error
        setUpdatingAdGroupId(null);
        setUpdatingField(null);
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
      // Also clear editing state
      setEditingAdGroupId(null);
      setEditingField(null);
      setEditingValue("");
    };

    // Handle confirmation for REMOVED status change
    const handleConfirmRemove = async () => {
      if (!pendingRemoveChange || !accountId || !channelId) return;

      setInlineEditLoading(true);
      try {
        const accountIdNum = parseInt(accountId, 10);
        const channelIdNum = parseInt(channelId, 10);
        if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
          throw new Error("Invalid account ID or channel ID");
        }

        const statusValue = convertStatusToApi("REMOVED");
        await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
          adgroupIds: [pendingRemoveChange.adgroupId],
          action: "status",
          status: statusValue as "ENABLED" | "PAUSED",
        });

        // Refresh data if callback provided
        if (onBulkUpdateComplete) {
          onBulkUpdateComplete();
        } else if (onRefresh) {
          onRefresh();
        }

        setShowRemoveConfirmation(false);
        setPendingRemoveChange(null);
      } catch (error: any) {
        console.error("Failed to remove adgroup:", error);
        alert(
          error?.response?.data?.error ||
          "Failed to remove ad group. Please try again."
        );
      } finally {
        setInlineEditLoading(false);
      }
    };

    // Handle cancel for REMOVED status change
    const handleCancelRemove = () => {
      setShowRemoveConfirmation(false);
      setPendingRemoveChange(null);
      // Cancel the inline edit
      cancelInlineEdit();
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
              onDismiss={() => { }}
            />
          </div>
        )}

        {/* Header with Filter Button and Sync Button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
            Ad Groups
          </h2>
          <div className="flex items-center gap-2">
            {createButton}
            {/* Bulk Actions - only when accountId/channelId and onBulkUpdateComplete available */}
            {accountId && channelId && onBulkUpdateComplete && (
              <div className="relative" ref={bulkActionsRef}>
                <Button
                  type="button"
                  variant="ghost"
                  className="edit-button"
                  onClick={() => setShowBulkActions((prev) => !prev)}
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
                    Bulk Actions
                  </span>
                </Button>
                {showBulkActions && (
                  <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                    <div className="overflow-y-auto">
                      {[
                        { value: "ENABLED", label: "Enable" },
                        { value: "PAUSED", label: "Pause" },
                        { value: "edit_bid", label: "Default max. CPC" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedAdGroupIds.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedAdGroupIds.size === 0) return;
                            if (opt.value === "edit_bid") {
                              setShowBidPanel(true);
                              setShowBulkConfirmationModal(false);
                            } else {
                              setShowBidPanel(false);
                              setPendingStatusAction(opt.value as "ENABLED" | "PAUSED");
                              setIsBidChange(false);
                              setShowBulkConfirmationModal(true);
                            }
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
                className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""
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

        {/* Create Panel - below create button */}
        {createPanel}

        {/* Bulk bid editor panel */}
        {selectedAdGroupIds.size > 0 && showBidPanel && accountId && channelId && onBulkUpdateComplete && (
          <div className="mb-4">
            <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
              <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="w-[160px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Action
                  </label>
                  <Dropdown
                    options={[
                      { value: "increase", label: "Increase By" },
                      { value: "decrease", label: "Decrease By" },
                      { value: "set", label: "Set To" },
                    ]}
                    value={bidAction}
                    onChange={(val) => {
                      const action = val as typeof bidAction;
                      setBidAction(action);
                      if (action === "set") setBidUnit("amount");
                    }}
                    buttonClassName="w-full bg-[#FEFEFB] edit-button"
                    width="w-full"
                  />
                </div>
                {(bidAction === "increase" || bidAction === "decrease") && (
                  <div className="w-[140px]">
                    <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                      Unit
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "percent" ? "bg-forest-f40 border-forest-f40" : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                          }`}
                        onClick={() => setBidUnit("percent")}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "amount" ? "bg-forest-f40 border-forest-f40" : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                          }`}
                        onClick={() => setBidUnit("amount")}
                      >
                        $
                      </button>
                    </div>
                  </div>
                )}
                <div className="w-[160px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Value
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidValue}
                      onChange={(e) => setBidValue(e.target.value)}
                      className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                      {bidUnit === "percent" ? "%" : "$"}
                    </span>
                  </div>
                </div>
                {bidAction === "increase" && (
                  <div className="w-[160px]">
                    <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                      Upper Limit (optional)
                    </label>
                    <input
                      type="number"
                      value={upperLimit}
                      onChange={(e) => setUpperLimit(e.target.value)}
                      className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    />
                  </div>
                )}
                {bidAction === "decrease" && (
                  <div className="w-[160px]">
                    <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                      Lower Limit (optional)
                    </label>
                    <input
                      type="number"
                      value={lowerLimit}
                      onChange={(e) => setLowerLimit(e.target.value)}
                      className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBidPanel(false);
                      setShowBulkActions(false);
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!bidValue) return;
                      setIsBidChange(true);
                      setPendingStatusAction(null);
                      setShowBulkConfirmationModal(true);
                    }}
                    disabled={bulkLoading || !bidValue}
                    className="create-entity-button btn-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              <div className="flex justify-center py-8">
                <Loader size="lg" message="Loading ad groups..." />
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
                            selectableAdgroups.length > 0 &&
                            selectableAdgroups.every((ag) => selectedAdGroupIds.has(ag.id))
                          }
                          onChange={(checked) =>
                            selectableAdgroups.forEach((ag) => onSelectAdGroup(ag.id, checked))
                          }
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
                    <th className="table-header hidden md:table-cell w-[150px] max-w-[150px]" onClick={() => onSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon("status", sortBy, sortOrder)}
                      </div>
                    </th>
                    <th className="table-header hidden md:table-cell w-[130px] max-w-[130px]" onClick={() => onSort("cpc_bid_dollars")}>
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
                    const adgroupStatus = (adgroup.status || "").toUpperCase();
                    const isRemoved = adgroupStatus === "REMOVED";
                    return (
                      <tr
                        key={adgroup.id}
                        className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                          } ${isRemoved ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"} transition-colors`}
                      >
                        <td className="table-cell">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedAdGroupIds.has(adgroup.id)}
                              onChange={(checked) =>
                                !isAdGroupRemoved(adgroup) && onSelectAdGroup(adgroup.id, checked)
                              }
                              disabled={isRemoved}
                              size="small"
                            />
                          </div>
                        </td>
                        <td className="table-cell min-w-[250px] max-w-[300px]">
                          {(() => {
                            if (isRemoved) {
                              return (
                                <span className="table-text leading-[1.26] opacity-60">
                                  {adgroup.adgroup_name || adgroup.name || "—"}
                                </span>
                              );
                            }

                            if (updatingAdGroupId === adgroup.id && updatingField === "name") {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="table-text leading-[1.26]">
                                    {adgroup.adgroup_name || adgroup.name || "—"}
                                  </span>
                                  <Loader size="sm" showMessage={false} />
                                </div>
                              );
                            }

                            const nameValue = editingAdGroupId === adgroup.id &&
                              editingField === "name"
                              ? editingValue
                              : (adgroup.adgroup_name || adgroup.name || "");

                            return (
                              <input
                                type="text"
                                value={nameValue}
                                onFocus={() => {
                                  if (editingAdGroupId !== adgroup.id ||
                                    editingField !== "name") {
                                    // Always allow inline editing - don't trigger modal on focus
                                    setEditingAdGroupId(adgroup.id);
                                    setEditingField("name");
                                    setEditingValue(adgroup.adgroup_name || adgroup.name || "");
                                  }
                                }}
                                onChange={(e) => {
                                  setEditingValue(e.target.value);
                                }}
                                onBlur={() => {
                                  if (editingAdGroupId === adgroup.id && editingField === "name") {
                                    const newName = editingValue.trim();
                                    const oldName = (adgroup.adgroup_name || adgroup.name || "").trim();

                                    if (newName && newName !== oldName && onUpdateAdGroupName) {
                                      // Show confirmation modal
                                      setNameConfirmationData({ adgroup, oldName, newName });
                                      setShowNameConfirmationModal(true);
                                      // Keep editing state until modal is confirmed/cancelled
                                    } else {
                                      // No change or invalid value, cancel editing
                                      setEditingAdGroupId(null);
                                      setEditingField(null);
                                      setEditingValue("");
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  } else if (e.key === "Escape") {
                                    setEditingAdGroupId(null);
                                    setEditingField(null);
                                    setEditingValue("");
                                  }
                                }}
                                className="inline-edit-input"
                                disabled={isRemoved}
                                title={
                                  isRemoved
                                    ? "Removed ad groups cannot be modified"
                                    : undefined
                                }
                              />
                            );
                          })()}
                        </td>
                        <td className="table-cell hidden md:table-cell w-[150px] max-w-[150px]">
                          {(() => {
                            if (updatingAdGroupId === adgroup.id && updatingField === "status") {
                              return (
                                <div className="flex items-center gap-2">
                                  <StatusBadge
                                    status={
                                      adgroup.status === "ENABLED" || adgroup.status === "Enabled"
                                        ? "Enabled"
                                        : adgroup.status === "PAUSED" || adgroup.status === "Paused"
                                          ? "Paused"
                                          : "Removed"
                                    }
                                  />
                                  <Loader size="sm" showMessage={false} />
                                </div>
                              );
                            }

                            if (isRemoved) {
                              return (
                                <div className="opacity-60">
                                  <StatusBadge
                                    status={
                                      adgroup.status === "ENABLED" || adgroup.status === "Enabled"
                                        ? "Enabled"
                                        : adgroup.status === "PAUSED" || adgroup.status === "Paused"
                                          ? "Paused"
                                          : "Removed"
                                    }
                                  />
                                </div>
                              );
                            }

                            const statusLower = (adgroup.status || "ENABLED").toUpperCase();
                            const statusValue =
                              statusLower === "ENABLE" || statusLower === "ENABLED"
                                ? "ENABLED"
                                : statusLower === "PAUSE" || statusLower === "PAUSED"
                                  ? "PAUSED"
                                  : statusLower === "REMOVE" || statusLower === "REMOVED"
                                    ? "REMOVED"
                                    : "ENABLED";

                            const currentValue = editingAdGroupId === adgroup.id &&
                              editingField === "status"
                              ? editingValue
                              : statusValue;

                            return (
                              <Dropdown
                                options={STATUS_DROPDOWN_OPTIONS}
                                value={currentValue}
                                onChange={(val) => {
                                  const newValue = val as string;
                                  const wasEditing = editingAdGroupId === adgroup.id &&
                                    editingField === "status";

                                  if (!wasEditing) {
                                    handleStatusClick(adgroup);
                                  }
                                  setEditingValue(newValue);
                                  // Close dropdown and check for changes
                                  setTimeout(() => {
                                    const oldStatusRaw = (adgroup.status || "ENABLED").trim().toUpperCase();
                                    const newStatusRawUpper = newValue.trim().toUpperCase();
                                    const hasChanged = newStatusRawUpper !== oldStatusRaw;

                                    if (hasChanged) {
                                      // Check if status is being changed to REMOVED - show confirmation modal
                                      if (newStatusRawUpper === "REMOVED") {
                                        cancelInlineEdit();
                                        setPendingRemoveChange({
                                          value: "REMOVED",
                                          adgroupId: adgroup.adgroup_id,
                                          field: "status"
                                        });
                                        setShowRemoveConfirmation(true);
                                      } else {
                                        // Pass adgroup directly to avoid state timing issues
                                        confirmInlineEdit(newValue, adgroup);
                                      }
                                    } else {
                                      cancelInlineEdit();
                                    }
                                  }, 0);
                                }}
                                onClose={() => {
                                  // When dropdown closes without selection, cancel editing
                                  if (editingAdGroupId === adgroup.id && editingField === "status") {
                                    cancelInlineEdit();
                                  }
                                }}
                                buttonClassName="edit-button"
                                width="w-full"
                                align="center"
                                closeOnSelect={true}
                                maxHeight="max-h-[200px]"
                                menuClassName=""
                                disabled={isRemoved}
                              />
                            );
                          })()}
                        </td>
                        <td className="table-cell hidden md:table-cell whitespace-nowrap">
                          {(() => {
                            if (updatingAdGroupId === adgroup.id && updatingField === "bid") {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="table-text leading-[1.26]">
                                    {(adgroup.cpc_bid_dollars || 0).toFixed(2)}
                                  </span>
                                  <Loader size="sm" showMessage={false} />
                                </div>
                              );
                            }

                            const currentBid = (adgroup.cpc_bid_dollars || 0).toString();

                            const bidValue = editingAdGroupId === adgroup.id &&
                              editingField === "bid"
                              ? (editingValue?.replace(/[^0-9.]/g, "") || currentBid)
                              : currentBid;

                            return (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={bidValue}
                                onFocus={() => {
                                  if (!isRemoved &&
                                    (editingAdGroupId !== adgroup.id ||
                                      editingField !== "bid")) {
                                    if (onUpdateAdGroupBid) {
                                      handleBidClick(adgroup);
                                    }
                                  }
                                }}
                                onChange={(e) => {
                                  if (isRemoved) return;
                                  const value = e.target.value.replace(/[^0-9.]/g, "");
                                  setEditingValue(value);
                                }}
                                onBlur={() => {
                                  if (isRemoved) return;
                                  if (editingAdGroupId === adgroup.id &&
                                    editingField === "bid") {
                                    const bidValue = parseFloat(editingValue);
                                    const oldBid = adgroup.cpc_bid_dollars || 0;

                                    if (!isNaN(bidValue) && bidValue >= 0 && bidValue !== oldBid) {
                                      // Show confirmation modal
                                      setBidConfirmationData({ adgroup, oldBid, newBid: bidValue });
                                      setShowBidConfirmationModal(true);
                                      // Keep editing state until modal is confirmed/cancelled
                                    } else {
                                      // No change or invalid value, cancel editing
                                      setEditingAdGroupId(null);
                                      setEditingField(null);
                                      setEditingValue("");
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (isRemoved) return;
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  } else if (e.key === "Escape") {
                                    cancelInlineEdit();
                                  }
                                }}
                                disabled={isRemoved || !onUpdateAdGroupBid}
                                className={`inline-edit-input w-24 ${isRemoved ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                                  }`}
                              />
                            );
                          })()}
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
                    className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
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
                  className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
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
                    // Clear editing state when cancelled
                    setEditingAdGroupId(null);
                    setEditingField(null);
                    setEditingValue("");
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
                    setUpdatingField("bid");
                    try {
                      await onUpdateAdGroupBid(
                        bidConfirmationData.adgroup.id,
                        bidConfirmationData.newBid
                      );
                      setShowBidConfirmationModal(false);
                      setBidConfirmationData(null);
                      // Clear editing state after successful update
                      setEditingAdGroupId(null);
                      setEditingField(null);
                      setEditingValue("");
                    } catch (error) {
                      console.error("Failed to update bid:", error);
                    } finally {
                      setUpdatingAdGroupId(null);
                      setUpdatingField(null);
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

        {/* Name Change Confirmation Modal */}
        {showNameConfirmationModal && nameConfirmationData && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
            onClick={(e) => {
              if (e.target === e.currentTarget && updatingAdGroupId !== nameConfirmationData.adgroup.id) {
                setShowNameConfirmationModal(false);
                setNameConfirmationData(null);
                setEditingAdGroupId(null);
                setEditingField(null);
                setEditingValue("");
              }
            }}
          >
            <div
              className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                Confirm Name Change
              </h3>
              <div className="mb-4">
                <p className="text-[12.8px] text-[#556179] mb-2">
                  Ad Group:{" "}
                  <span className="font-semibold text-[#072929]">
                    {nameConfirmationData.adgroup.adgroup_name || nameConfirmationData.adgroup.name || "Unnamed Ad Group"}
                  </span>
                </p>
                <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[12.8px] text-[#556179]">Ad Group Name:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12.8px] text-[#556179]">
                        {nameConfirmationData.oldName}
                      </span>
                      <span className="text-[12.8px] text-[#556179]">→</span>
                      <span className="text-[12.8px] font-semibold text-[#072929]">
                        {nameConfirmationData.newName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNameConfirmationModal(false);
                    setNameConfirmationData(null);
                    setEditingAdGroupId(null);
                    setEditingField(null);
                    setEditingValue("");
                  }}
                  disabled={updatingAdGroupId === nameConfirmationData.adgroup.id}
                  className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!onUpdateAdGroupName || !nameConfirmationData) return;

                    setUpdatingAdGroupId(nameConfirmationData.adgroup.id);
                    setUpdatingField("name");
                    try {
                      await onUpdateAdGroupName(
                        nameConfirmationData.adgroup.id,
                        nameConfirmationData.newName
                      );
                      setShowNameConfirmationModal(false);
                      setNameConfirmationData(null);
                      setEditingAdGroupId(null);
                      setEditingField(null);
                      setEditingValue("");
                      // Refresh data if callback provided
                      if (onBulkUpdateComplete) {
                        onBulkUpdateComplete();
                      }
                    } catch (error) {
                      console.error("Failed to update name:", error);
                      alert("Failed to update ad group name. Please try again.");
                    } finally {
                      setUpdatingAdGroupId(null);
                      setUpdatingField(null);
                    }
                  }}
                  disabled={updatingAdGroupId === nameConfirmationData.adgroup.id}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingAdGroupId === nameConfirmationData.adgroup.id
                    ? "Updating..."
                    : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk confirmation modal - shared DRY component, full list */}
        {accountId && channelId && onBulkUpdateComplete && (
          <BulkUpdateConfirmationModal
            isOpen={showBulkConfirmationModal}
            onClose={() => {
              setShowBulkConfirmationModal(false);
              setPendingStatusAction(null);
              setBulkUpdateResults(null);
            }}
            entityLabel="ad group"
            entityNameColumn="Ad Group Name"
            selectedCount={selectedAdGroupIds.size}
            bulkUpdateResults={bulkUpdateResults}
            isValueChange={isBidChange}
            valueChangeLabel="Bid"
            previewRows={(() => {
              const selectedData = getSelectedAdgroupsData();
              return selectedData.map((ag) => {
                const oldBid = ag.cpc_bid_dollars || 0;
                const oldStatus = formatStatusForDisplay(ag.status || "ENABLED");
                const newBid = isBidChange ? calculateNewBid(oldBid) : oldBid;
                const newStatus = pendingStatusAction
                  ? formatStatusForDisplay(pendingStatusAction)
                  : oldStatus;
                return {
                  name: ag.adgroup_name || ag.name || "Unnamed Ad Group",
                  oldValue: isBidChange ? `$${oldBid.toFixed(2)}` : oldStatus,
                  newValue: isBidChange ? `$${newBid.toFixed(2)}` : newStatus,
                } as BulkUpdatePreviewRow;
              });
            })()}
            actionDetails={
              !bulkUpdateResults
                ? isBidChange
                  ? ({
                    type: "value",
                    action: bidAction,
                    unit: bidUnit,
                    value: bidValue,
                    upperLimit,
                    lowerLimit,
                  } as BulkUpdateActionDetails)
                  : pendingStatusAction
                    ? ({
                      type: "status",
                      newStatus:
                        pendingStatusAction.charAt(0) +
                        pendingStatusAction.slice(1).toLowerCase(),
                    } as BulkUpdateStatusDetails)
                    : null
                : null
            }
            loading={bulkLoading}
            loadingMessage="Updating ad groups..."
            successMessage="All ad groups updated successfully!"
            onConfirm={async () => {
              if (isBidChange) await runBulkBid();
              else if (pendingStatusAction) await runBulkStatus(pendingStatusAction);
            }}
          />
        )}

        {/* Remove Confirmation Modal */}
        <ConfirmationModal
          isOpen={showRemoveConfirmation}
          onClose={handleCancelRemove}
          onConfirm={handleConfirmRemove}
          title="Are you sure you want to remove this ad group?"
          message="This action cannot be undone. All data associated with this ad group will be permanently removed."
          type="danger"
          size="sm"
          isLoading={inlineEditLoading}
          icon={<TrashIcon className="w-6 h-6 text-red-600" />}
        />
      </>
    );
  };
