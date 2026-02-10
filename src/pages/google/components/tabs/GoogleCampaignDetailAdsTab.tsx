import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Button } from "../../../../components/ui";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import type { GoogleAd } from "./GoogleTypes";
import { formatCurrency2Decimals, formatPercentage as formatPercentageUtil } from "../../utils/campaignDetailHelpers";
import { ConfirmationModal } from "../../../../components/ui/ConfirmationModal";
import { TrashIcon } from "lucide-react";
import { googleAdwordsAdsService } from "../../../../services/googleAdwords/googleAdwordsAds";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";
import { BulkActionsDropdown } from "../BulkActionsDropdown";
import { formatStatusForDisplay } from "../../utils/googleAdsUtils";

interface GoogleCampaignDetailAdsTabProps {
  ads: GoogleAd[];
  loading: boolean;
  selectedAdIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectAd: (id: number, checked: boolean) => void;
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
  getSortIcon: (column: string, currentSortBy: string, currentSortOrder: "asc" | "desc") => React.ReactNode;
  onUpdateAdStatus?: (adId: number, status: string) => Promise<void>;
  onStartFinalUrlEdit?: (ad: GoogleAd) => void;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  accountId?: string;
  channelId?: string;
  campaignId?: string;
  onBulkUpdateComplete?: () => void;
  formatCurrency?: (value: number | string | undefined) => string;
  formatPercentage?: (value: number | string | undefined) => string;
}

export const GoogleCampaignDetailAdsTab: React.FC<GoogleCampaignDetailAdsTabProps> = ({
  ads,
  loading,
  selectedAdIds,
  onSelectAll,
  onSelectAd,
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
  getSortIcon,
  onUpdateAdStatus,
  onStartFinalUrlEdit,
  createButton,
  createPanel,
  accountId,
  channelId,
  campaignId,
  onBulkUpdateComplete,
  formatCurrency = formatCurrency2Decimals,
  formatPercentage = formatPercentageUtil,
}) => {
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  // Modal state for status changes - matches Amazon pattern
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditAd, setInlineEditAd] = useState<GoogleAd | null>(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [pendingRemoveChange, setPendingRemoveChange] = useState<{
    value: string;
    adId: number;
    field: string;
  } | null>(null);

  // Bulk edit state
  const [showBulkConfirmationModal, setShowBulkConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<"ENABLED" | "PAUSED" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const getSelectedAdsData = () => ads.filter((a) => selectedAdIds.has(a.id));
  const selectableAds = ads.filter((ad) => (ad.status || "").toUpperCase() !== "REMOVED");
  const isAdRemoved = (ad: GoogleAd) => (ad.status || "").toUpperCase() === "REMOVED";

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!accountId || !channelId || selectedAdIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
    const selectedData = getSelectedAdsData();
    const adIds = selectedData.map((a) => a.ad_id);
    try {
      setBulkLoading(true);
      setBulkUpdateResults(null);
      const response = await googleAdwordsAdsService.bulkUpdateGoogleAds(
        accountIdNum,
        channelIdNum,
        { adIds, action: "status", status: statusValue, campaignId }
      );
      setBulkUpdateResults({
        updated: (response as { updated?: number }).updated ?? adIds.length,
        failed: (response as { failed?: number }).failed ?? 0,
        errors: (response as { errors?: string[] }).errors ?? [],
      });
      if (onBulkUpdateComplete) onBulkUpdateComplete();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setBulkUpdateResults({
        updated: 0,
        failed: selectedAdIds.size,
        errors: [err?.response?.data?.error || err?.message || "Failed to update ads."],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStatusClick = (ad: GoogleAd) => {
    if (onUpdateAdStatus) {
      setEditingAdId(ad.id);
      setEditingStatus(ad.status || "ENABLED");
    }
  };

  const handleStatusChange = (adId: number, newStatus: string) => {
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;

    const oldStatus = (ad.status || "ENABLED").toUpperCase();
    const newStatusUpper = newStatus.toUpperCase();

    if (newStatusUpper !== oldStatus) {
      // Check if status is being changed to REMOVED - show confirmation modal
      if (newStatusUpper === "REMOVED") {
        setEditingAdId(null);
        setEditingStatus("");
        setPendingRemoveChange({ 
          value: "REMOVED", 
          adId: ad.id, 
          field: "status" 
        });
        setShowRemoveConfirmation(true);
        return;
      }
      
      // Show confirmation modal immediately - matches Amazon pattern
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        REMOVED: "Remove",
        Enabled: "Enabled",
        Paused: "Paused",
        Removed: "Remove",
      };
      setInlineEditAd(ad);
      setInlineEditOldValue(statusDisplayMap[oldStatus] || oldStatus);
      setInlineEditNewValue(statusDisplayMap[newStatusUpper] || newStatusUpper);
      setShowInlineEditModal(true);
    } else {
      setEditingAdId(null);
      setEditingStatus("");
    }
  };

  const runInlineEdit = async () => {
    if (!inlineEditAd || !onUpdateAdStatus) return;

    setInlineEditLoading(true);
    try {
      // Map display values back to API values
      const statusMap: Record<string, "ENABLED" | "PAUSED" | "REMOVED"> = {
        Enabled: "ENABLED",
        ENABLED: "ENABLED",
        Paused: "PAUSED",
        PAUSED: "PAUSED",
        Removed: "REMOVED",
        REMOVED: "REMOVED",
      };
      const statusValue = statusMap[inlineEditNewValue] || "ENABLED";
      await onUpdateAdStatus(inlineEditAd.id, statusValue);

      setShowInlineEditModal(false);
      setInlineEditAd(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    } catch (error) {
      console.error("Failed to update ad status:", error);
      alert("Failed to update ad status. Please try again.");
    } finally {
      setInlineEditLoading(false);
    }
  };

  const cancelInlineEditModal = () => {
    setShowInlineEditModal(false);
    setInlineEditAd(null);
    setInlineEditOldValue("");
    setInlineEditNewValue("");
  };

  // Handle confirmation for REMOVED status change
  const handleConfirmRemove = async () => {
    if (!pendingRemoveChange || !onUpdateAdStatus) return;

    setInlineEditLoading(true);
    try {
      const ad = ads.find((a) => a.id === pendingRemoveChange.adId);
      if (!ad) {
        throw new Error("Ad not found");
      }

      await onUpdateAdStatus(ad.id, "REMOVED");
      
      setShowRemoveConfirmation(false);
      setPendingRemoveChange(null);
    } catch (error: any) {
      console.error("Failed to remove ad:", error);
      alert(
        error?.response?.data?.error ||
          "Failed to remove ad. Please try again."
      );
    } finally {
      setInlineEditLoading(false);
    }
  };

  // Handle cancel for REMOVED status change
  const handleCancelRemove = () => {
    setShowRemoveConfirmation(false);
    setPendingRemoveChange(null);
    setEditingAdId(null);
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
      
      {/* Header with Filter Button and Sync Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Ads
        </h2>
        <div className="flex items-center gap-2">
          {createButton}
          {accountId && channelId && onBulkUpdateComplete && (
            <BulkActionsDropdown
              options={[
                { value: "ENABLED", label: "Enable" },
                { value: "PAUSED", label: "Pause" },
              ]}
              selectedCount={selectedAdIds.size}
              onSelect={(value) => {
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
              { value: "name", label: "Ad Name" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
      )}

      {/* Ads Table */}
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-8 text-[#556179] text-[13.3px]">
              Loading ads...
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13.3px] text-[#556179] mb-4">
                No ads found
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  <th className="table-header w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectableAds.length > 0 && selectableAds.every((ad) => selectedAdIds.has(ad.id))}
                        onChange={(checked) => selectableAds.forEach((ad) => onSelectAd(ad.id, checked))}
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="table-header"
                    onClick={() => onSort("ad_type")}
                  >
                    <div className="flex items-center gap-1">
                      Ad Type
                      {getSortIcon("ad_type", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden lg:table-cell min-w-[200px]">
                    Ad Group
                  </th>
                  <th
                    className="table-header hidden md:table-cell w-[140px] max-w-[140px]"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden lg:table-cell">
                    Final URLs
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("impressions")}
                  >
                    <div className="flex items-center gap-1">
                      Impressions
                      {getSortIcon("impressions", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("clicks")}
                  >
                    <div className="flex items-center gap-1">
                      Clicks
                      {getSortIcon("clicks", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("spends")}
                  >
                    <div className="flex items-center gap-1">
                      Cost
                      {getSortIcon("spends", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("sales")}
                  >
                    <div className="flex items-center gap-1">
                      Conv. value
                      {getSortIcon("sales", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("ctr")}
                  >
                    <div className="flex items-center gap-1">
                      CTR
                      {getSortIcon("ctr", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("avg_cpc")}
                  >
                    <div className="flex items-center gap-1">
                      Avg. CPC
                      {getSortIcon("avg_cpc", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("roas")}
                  >
                    <div className="flex items-center gap-1">
                      Conv. value / cost
                      {getSortIcon("roas", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("conversions")}
                  >
                    <div className="flex items-center gap-1">
                      Conversions
                      {getSortIcon("conversions", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("conversion_rate")}
                  >
                    <div className="flex items-center gap-1">
                      Conv. rate
                      {getSortIcon("conversion_rate", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("cost_per_conversion")}
                  >
                    <div className="flex items-center gap-1">
                      Cost / conv.
                      {getSortIcon("cost_per_conversion", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("avg_cost")}
                  >
                    <div className="flex items-center gap-1">
                      Avg. cost
                      {getSortIcon("avg_cost", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("interaction_rate")}
                  >
                    <div className="flex items-center gap-1">
                      Interaction rate
                      {getSortIcon("interaction_rate", sortBy, sortOrder)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad, index) => {
                  const isLastRow = index === ads.length - 1;
                  const adStatus = (ad.status || "").toUpperCase();
                  const isRemoved = adStatus === "REMOVED";
                  return (
                    <tr
                      key={ad.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${isRemoved ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"} transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedAdIds.has(ad.id)}
                            onChange={(checked) => !isAdRemoved(ad) && onSelectAd(ad.id, checked)}
                            disabled={isAdRemoved(ad)}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {ad.ad_type || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden lg:table-cell min-w-[200px]">
                        <span className="table-text leading-[1.26]">
                          {ad.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell w-[140px] max-w-[140px]">
                        <div className="w-full relative">
                          {editingAdId === ad.id && onUpdateAdStatus && !isRemoved ? (
                            <div onClick={(e) => e.stopPropagation()} className="w-full relative">
                              <Dropdown
                                options={[
                                  { value: "ENABLED", label: "Enabled" },
                                  { value: "PAUSED", label: "Paused" },
                                  { value: "REMOVED", label: "Remove" },
                                ]}
                                value={editingStatus}
                                onChange={(val) => handleStatusChange(ad.id, val as string)}
                                defaultOpen={true}
                                closeOnSelect={true}
                                showCheckmark={false}
                                buttonClassName="w-full text-[13.3px] px-2 py-1"
                                width="w-full"
                                className="w-full"
                                menuClassName="z-[100000]"
                                disabled={isRemoved}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={
                                onUpdateAdStatus && !isRemoved
                                  ? "edit-button w-full text-[13.3px] flex items-center justify-between"
                                  : "edit-button w-full text-[13.3px] flex items-center justify-between cursor-default"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateAdStatus && !isRemoved) {
                                  handleStatusClick(ad);
                                }
                              }}
                              disabled={!onUpdateAdStatus || isRemoved}
                            >
                            <span className="truncate flex-1 min-w-0 text-left">
                              {ad.status === "ENABLED" || ad.status === "Enabled" || ad.status === "ENABLE"
                                ? "Enabled"
                                : ad.status === "PAUSED" || ad.status === "Paused" || ad.status === "PAUSE"
                                ? "Paused"
                                : ad.status === "REMOVED" || ad.status === "Removed" || ad.status === "REMOVE"
                                ? "Remove"
                                : ad.status || "Enabled"}
                            </span>
                            {onUpdateAdStatus && (
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
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2 group">
                          <span className="table-text leading-[1.26] truncate flex-1 min-w-0">
                            {ad.final_urls && Array.isArray(ad.final_urls) && ad.final_urls.length > 0
                              ? ad.final_urls[0]
                              : "—"}
                          </span>
                          {onStartFinalUrlEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartFinalUrlEdit(ad);
                              }}
                              className="text-[#136D6D] hover:text-[#0e5a5a] flex-shrink-0"
                              title="Edit Final URL"
                            >
                              <svg
                                className="w-4 h-4"
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
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((ad as any).impressions || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((ad as any).clicks || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency((ad as any).spends)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency((ad as any).sales)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage((ad as any).ctr)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency((ad as any).avg_cpc || (ad as any).cpc)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((ad as any).roas || 0).toFixed(2)}x
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {((ad as any).conversions || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage((ad as any).conversion_rate)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency((ad as any).cost_per_conversion)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency((ad as any).avg_cost || (((ad as any).spends || 0) / Math.max((ad as any).interactions || (ad as any).clicks || 1, 1)))}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage((ad as any).interaction_rate)}
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
      {!loading && ads.length > 0 && totalPages > 1 && (
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

        {/* Inline Edit Modal for Status */}
        {showInlineEditModal && inlineEditAd && (
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
                  Ad:{" "}
                  <span className="font-semibold text-[#072929]">
                    {inlineEditAd.ad_type || "Unnamed Ad"}
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

        {/* Bulk confirmation modal */}
        {accountId && channelId && onBulkUpdateComplete && (
          <BulkUpdateConfirmationModal
            isOpen={showBulkConfirmationModal}
            onClose={() => {
              setShowBulkConfirmationModal(false);
              setPendingStatusAction(null);
              setBulkUpdateResults(null);
            }}
            entityLabel="ad"
            entityNameColumn="Ad Name"
            selectedCount={selectedAdIds.size}
            bulkUpdateResults={bulkUpdateResults}
            isValueChange={false}
            valueChangeLabel=""
            previewRows={getSelectedAdsData().map((ad) => {
              const oldStatus = formatStatusForDisplay(ad.status || "ENABLED");
              const newStatus = pendingStatusAction
                ? formatStatusForDisplay(pendingStatusAction)
                : oldStatus;
              return {
                name: (ad as GoogleAd & { name?: string }).name || `Ad ${ad.ad_id}`,
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
            loadingMessage="Updating ads..."
            successMessage="All ads updated successfully!"
            onConfirm={async () => {
              if (pendingStatusAction) await runBulkStatus(pendingStatusAction);
            }}
          />
        )}

        {/* Remove Confirmation Modal */}
        <ConfirmationModal
          isOpen={showRemoveConfirmation}
          onClose={handleCancelRemove}
          onConfirm={handleConfirmRemove}
          title="Are you sure you want to remove this ad?"
          message="This action cannot be undone. All data associated with this ad will be permanently removed."
          type="danger"
          size="sm"
          isLoading={inlineEditLoading}
          icon={<TrashIcon className="w-6 h-6 text-red-600" />}
        />
      </>
    );
  };

