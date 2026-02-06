import React, { useState } from "react";
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
import type { GoogleKeyword } from "./GoogleTypes";
import { formatCurrency2Decimals as formatCurrency2DecimalsUtil, formatPercentage as formatPercentageUtil } from "../../utils/campaignDetailHelpers";
import { ConfirmationModal } from "../../../../components/ui/ConfirmationModal";
import { TrashIcon } from "lucide-react";
import { googleAdwordsKeywordsService } from "../../../../services/googleAdwords/googleAdwordsKeywords";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";
import { BulkActionsDropdown } from "../BulkActionsDropdown";
import { formatStatusForDisplay } from "../../utils/googleAdsUtils";

interface GoogleCampaignDetailKeywordsTabProps {
  keywords: GoogleKeyword[];
  loading: boolean;
  selectedKeywordIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectKeyword: (id: number, checked: boolean) => void;
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
  accountId: string;
  syncing: boolean;
  onSync: () => void;
  syncingAnalytics?: boolean;
  onSyncAnalytics?: () => void;
  syncMessage: string | null;
  onRefresh?: () => void;
  getSortIcon: (
    column: string,
    currentSortBy: string,
    currentSortOrder: "asc" | "desc"
  ) => React.ReactNode;
  onUpdateKeywordStatus?: (keywordId: number, status: string) => Promise<void>;
  onUpdateKeywordMatchType?: (
    keywordId: number,
    matchType: string
  ) => Promise<void>;
  onUpdateKeywordBid?: (keywordId: number, bid: number) => Promise<void>;
  onStartKeywordTextEdit?: (keyword: GoogleKeyword) => void;
  onStartFinalUrlEdit?: (keyword: GoogleKeyword) => void;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  channelId?: string;
  onBulkUpdateComplete?: () => void;
  formatCurrency2Decimals?: (value: number | string | undefined) => string;
}

export const GoogleCampaignDetailKeywordsTab: React.FC<
  GoogleCampaignDetailKeywordsTabProps
> = ({
  keywords,
  loading,
  selectedKeywordIds,
  onSelectAll,
  onSelectKeyword,
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
  accountId: _accountId,
  syncing,
  onSync,
  syncingAnalytics,
  onSyncAnalytics,
  syncMessage,
  onRefresh,
  getSortIcon,
  onUpdateKeywordStatus,
  onUpdateKeywordMatchType,
  onUpdateKeywordBid,
  onStartKeywordTextEdit,
  onStartFinalUrlEdit,
  createButton,
  createPanel,
  channelId,
  onBulkUpdateComplete,
  formatCurrency2Decimals = formatCurrency2DecimalsUtil,
}) => {
  const formatPercentage = formatPercentageUtil;
  const [editingKeywordId, setEditingKeywordId] = useState<number | null>(null);
  const [showBulkConfirmationModal, setShowBulkConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<"ENABLED" | "PAUSED" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const getSelectedKeywordsData = () => keywords.filter((k) => selectedKeywordIds.has(k.id));
  const selectableKeywords = keywords.filter(
    (k) => (k.status || "").toUpperCase() !== "REMOVED"
  );
  const isKeywordRemoved = (k: { status?: string }) =>
    (k.status || "").toUpperCase() === "REMOVED";

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!_accountId || !channelId || selectedKeywordIds.size === 0) return;
    const accountIdNum = parseInt(_accountId, 10);
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
    const selectedData = getSelectedKeywordsData();
    const keywordIds = selectedData.map((k) => k.keyword_id);
    try {
      setBulkLoading(true);
      setBulkUpdateResults(null);
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(
        accountIdNum,
        channelIdNum,
        { keywordIds, action: "status", status: statusValue }
      );
      setBulkUpdateResults({
        updated: (response as { updated?: number }).updated ?? keywordIds.length,
        failed: (response as { failed?: number }).failed ?? 0,
        errors: (response as { errors?: string[] }).errors ?? [],
      });
      if (onBulkUpdateComplete) onBulkUpdateComplete();
      // Clear selections after successful bulk update
      onSelectAll(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setBulkUpdateResults({
        updated: 0,
        failed: selectedKeywordIds.size,
        errors: [err?.response?.data?.error || err?.message || "Failed to update keywords."],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const [editingField, setEditingField] = useState<
      "status" | "match_type" | "bid" | null
    >(null);
    const [editingStatus, setEditingStatus] = useState<string>("");
    // Disabled: Google Ads API doesn't allow updating keyword match type
    // const [editingMatchType, setEditingMatchType] = useState<string>("");
    const [editingBid, setEditingBid] = useState<string>("");
    const [pendingChange, setPendingChange] = useState<{
      id: number;
      field: "status" | "match_type" | "bid";
      newValue: string;
      oldValue: string;
    } | null>(null);
    const [updatingKeywordId, setUpdatingKeywordId] = useState<number | null>(
      null
    );
    // Modal state for status and match_type changes - matches Amazon pattern
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [inlineEditKeyword, setInlineEditKeyword] = useState<GoogleKeyword | null>(null);
    const [inlineEditField, setInlineEditField] = useState<"status" | "match_type" | null>(null);
    const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
    const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
    const [inlineEditLoading, setInlineEditLoading] = useState(false);
    const [showBidConfirmationModal, setShowBidConfirmationModal] = useState(false);
    const [bidConfirmationData, setBidConfirmationData] = useState<{
      keyword: GoogleKeyword;
      oldBid: number;
      newBid: number;
    } | null>(null);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const [pendingRemoveChange, setPendingRemoveChange] = useState<{
      value: string;
      keywordId: number;
      field: string;
    } | null>(null);

    const handleStatusClick = (keyword: GoogleKeyword) => {
      if (onUpdateKeywordStatus) {
        setEditingKeywordId(keyword.id);
        setEditingField("status");
        setEditingStatus(keyword.status || "ENABLED");
      }
    };

    const handleBidClick = (keyword: GoogleKeyword) => {
      if (onUpdateKeywordBid) {
        setEditingKeywordId(keyword.id);
        setEditingField("bid");
        const bidValue = (keyword.cpc_bid_dollars || 0).toString().replace(/\$/g, "");
        setEditingBid(bidValue);
      }
    };

    const handleBidBlur = (keyword: GoogleKeyword) => {
      if (!onUpdateKeywordBid) return;

      const bidValue = parseFloat(editingBid);
      const oldBid = keyword.cpc_bid_dollars || 0;

      if (isNaN(bidValue) || bidValue < 0) {
        // Invalid bid, reset
        setEditingKeywordId(null);
        setEditingField(null);
        setEditingBid("");
        return;
      }

      if (bidValue !== oldBid) {
        // Show confirmation modal
        setBidConfirmationData({ keyword, oldBid, newBid: bidValue });
        setShowBidConfirmationModal(true);
        setEditingKeywordId(null);
        setEditingField(null);
        setEditingBid("");
      } else {
        // No change, just reset
        setEditingKeywordId(null);
        setEditingField(null);
        setEditingBid("");
      }
    };

    // Disabled: Google Ads API doesn't allow updating keyword match type
    // const handleMatchTypeClick = (keyword: GoogleKeyword) => {
    //   if (onUpdateKeywordMatchType) {
    //     setEditingKeywordId(keyword.id);
    //     setEditingField("match_type");
    //     // Normalize match type to match dropdown options
    //     const currentMatchType = (keyword.match_type || "BROAD").toUpperCase();
    //     setEditingMatchType(currentMatchType);
    //   }
    // };

    const handleKeywordTextClick = (keyword: GoogleKeyword) => {
      if (onStartKeywordTextEdit) {
        onStartKeywordTextEdit(keyword);
      }
    };

    const handleStatusChange = (keywordId: number, newStatus: string) => {
      const keyword = keywords.find((k) => k.id === keywordId);
      if (!keyword) return;

      const oldStatus = (keyword.status || "ENABLED").toUpperCase();
      const newStatusUpper = newStatus.toUpperCase();

      if (newStatusUpper !== oldStatus) {
        // Check if status is being changed to REMOVED - show confirmation modal
        if (newStatusUpper === "REMOVED") {
          setEditingKeywordId(null);
          setEditingField(null);
          setEditingStatus("");
          setPendingRemoveChange({ 
            value: "REMOVED", 
            keywordId: keyword.id, 
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
        setInlineEditKeyword(keyword);
        setInlineEditField("status");
        setInlineEditOldValue(statusDisplayMap[oldStatus] || oldStatus);
        setInlineEditNewValue(statusDisplayMap[newStatusUpper] || newStatusUpper);
        setShowInlineEditModal(true);
      }
      setEditingKeywordId(null);
      setEditingField(null);
      setEditingStatus("");
    };

    // Disabled: Google Ads API doesn't allow updating keyword match type
    // const handleMatchTypeChange = (keywordId: number, newMatchType: string) => {
    //   const keyword = keywords.find((k) => k.id === keywordId);
    //   if (!keyword) return;

    //   const oldMatchType = (keyword.match_type || "BROAD").toUpperCase();
    //   const newMatchTypeUpper = newMatchType.toUpperCase();

    //   if (newMatchTypeUpper !== oldMatchType) {
    //     // Show confirmation modal immediately - matches Amazon pattern
    //     const matchTypeDisplayMap: Record<string, string> = {
    //       EXACT: "Exact",
    //       PHRASE: "Phrase",
    //       BROAD: "Broad",
    //       Exact: "Exact",
    //       Phrase: "Phrase",
    //       Broad: "Broad",
    //     };
    //     setInlineEditKeyword(keyword);
    //     setInlineEditField("match_type");
    //     setInlineEditOldValue(matchTypeDisplayMap[oldMatchType] || oldMatchType);
    //     setInlineEditNewValue(matchTypeDisplayMap[newMatchTypeUpper] || newMatchTypeUpper);
    //     setShowInlineEditModal(true);
    //   }
    //   setEditingKeywordId(null);
    //   setEditingField(null);
    //   setEditingMatchType("");
    // };

    const runInlineEdit = async () => {
      if (!inlineEditKeyword || !inlineEditField || !onUpdateKeywordStatus || !onUpdateKeywordMatchType) return;

      setInlineEditLoading(true);
      try {
        if (inlineEditField === "status" && onUpdateKeywordStatus) {
          // Map display values back to API values
          const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
            Enabled: "ENABLED",
            ENABLED: "ENABLED",
            Paused: "PAUSED",
            PAUSED: "PAUSED",
          };
          const statusValue = statusMap[inlineEditNewValue] || "ENABLED";
          await onUpdateKeywordStatus(inlineEditKeyword.id, statusValue);
        } 
        // Disabled: Google Ads API doesn't allow updating keyword match type
        // else if (inlineEditField === "match_type" && onUpdateKeywordMatchType) {
        //   // Map display values back to API values
        //   const matchTypeMap: Record<string, "EXACT" | "PHRASE" | "BROAD"> = {
        //     Exact: "EXACT",
        //     EXACT: "EXACT",
        //     Phrase: "PHRASE",
        //     PHRASE: "PHRASE",
        //     Broad: "BROAD",
        //     BROAD: "BROAD",
        //   };
        //   const matchTypeValue = matchTypeMap[inlineEditNewValue] || "EXACT";
        //   await onUpdateKeywordMatchType(inlineEditKeyword.id, matchTypeValue);
        // }

        setShowInlineEditModal(false);
        setInlineEditKeyword(null);
        setInlineEditField(null);
        setInlineEditOldValue("");
        setInlineEditNewValue("");
      } catch (error) {
        console.error("Failed to update keyword:", error);
        alert(
          `Failed to update keyword ${inlineEditField}. Please try again.`
        );
      } finally {
        setInlineEditLoading(false);
      }
    };

    const cancelInlineEditModal = () => {
      setShowInlineEditModal(false);
      setInlineEditKeyword(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    };

    const confirmChange = async () => {
      if (!pendingChange) return;

      setUpdatingKeywordId(pendingChange.id);
      try {
        if (pendingChange.field === "bid" && onUpdateKeywordBid) {
          await onUpdateKeywordBid(pendingChange.id, parseFloat(pendingChange.newValue));
        }
        setPendingChange(null);
      } catch (error) {
        console.error("Failed to update keyword:", error);
        alert(
          `Failed to update keyword ${pendingChange.field}. Please try again.`
        );
      } finally {
        setUpdatingKeywordId(null);
      }
    };

    const cancelChange = () => {
      setPendingChange(null);
      setEditingKeywordId(null);
      setEditingField(null);
      setEditingStatus("");
      // Disabled: Google Ads API doesn't allow updating keyword match type
      // setEditingMatchType("");
      setEditingBid("");
    };

    // Handle confirmation for REMOVED status change
    const handleConfirmRemove = async () => {
      if (!pendingRemoveChange || !onUpdateKeywordStatus) return;

      setInlineEditLoading(true);
      try {
        const keyword = keywords.find((k) => k.id === pendingRemoveChange.keywordId);
        if (!keyword) {
          throw new Error("Keyword not found");
        }

        await onUpdateKeywordStatus(keyword.id, "REMOVED");
        
        setShowRemoveConfirmation(false);
        setPendingRemoveChange(null);
      } catch (error: any) {
        console.error("Failed to remove keyword:", error);
        alert(
          error?.response?.data?.error ||
            "Failed to remove keyword. Please try again."
        );
      } finally {
        setInlineEditLoading(false);
      }
    };

    // Handle cancel for REMOVED status change
    const handleCancelRemove = () => {
      setShowRemoveConfirmation(false);
      setPendingRemoveChange(null);
      setEditingKeywordId(null);
      setEditingField(null);
      setEditingStatus("");
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
          Keywords
        </h2>
        <div className="flex items-center gap-2">
          {createButton}
          {_accountId && channelId && onBulkUpdateComplete && (
            <BulkActionsDropdown
              options={[
                { value: "ENABLED", label: "Enable" },
                { value: "PAUSED", label: "Pause" },
              ]}
              selectedCount={selectedKeywordIds.size}
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
                { value: "keyword_text", label: "Keyword" },
                { value: "status", label: "Status" },
              ]}
            />
          </div>
        )}

        {/* Keywords Table */}
        <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            {loading ? (
              <div className="text-center py-8 text-[#556179] text-[13.3px]">
                Loading keywords...
              </div>
            ) : keywords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13.3px] text-[#556179] mb-4">
                  No keywords found
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
                            selectableKeywords.length > 0 &&
                            selectableKeywords.every((kw) => selectedKeywordIds.has(kw.id))
                          }
                          onChange={(checked) =>
                            selectableKeywords.forEach((kw) => onSelectKeyword(kw.id, checked))
                          }
                          size="small"
                        />
                      </div>
                    </th>
                    <th
                      className="table-header"
                      onClick={() => onSort("keyword_text")}
                    >
                      <div className="flex items-center gap-1">
                        Keyword
                        {getSortIcon("keyword_text", sortBy, sortOrder)}
                      </div>
                    </th>
                    <th className="table-header hidden lg:table-cell min-w-[200px]">
                      Ad Group
                    </th>
                    <th
                      className="table-header hidden md:table-cell w-[150px] max-w-[150px]"
                      onClick={() => onSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon("status", sortBy, sortOrder)}
                      </div>
                    </th>
                    <th
                      className="table-header hidden md:table-cell w-[130px] max-w-[130px] pr-4"
                      onClick={() => onSort("cpc_bid_dollars")}
                    >
                      <div className="flex items-center gap-1">
                        Max. CPC
                        {getSortIcon("cpc_bid_dollars", sortBy, sortOrder)}
                      </div>
                    </th>
                    <th
                      className="table-header hidden md:table-cell w-[150px] max-w-[150px] pl-2"
                      onClick={() => onSort("match_type")}
                    >
                      <div className="flex items-center gap-1">
                        Match Type
                        {getSortIcon("match_type", sortBy, sortOrder)}
                      </div>
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden lg:table-cell">
                      Final URL
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
                      onClick={() => onSort("ctr")}
                    >
                      <div className="flex items-center gap-1">
                        CTR
                        {getSortIcon("ctr", sortBy, sortOrder)}
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
                      onClick={() => onSort("avg_cpc")}
                    >
                      <div className="flex items-center gap-1">
                        Avg. CPC
                        {getSortIcon("avg_cpc", sortBy, sortOrder)}
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
                  {keywords.map((keyword, index) => {
                    const isLastRow = index === keywords.length - 1;
                    const keywordStatus = (keyword.status || "").toUpperCase();
                    const isRemoved = keywordStatus === "REMOVED";
                    return (
                      <tr
                        key={keyword.id}
                        className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                          } ${isRemoved ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"} transition-colors`}
                      >
                        <td className="table-cell">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedKeywordIds.has(keyword.id)}
                              onChange={(checked) =>
                                !isKeywordRemoved(keyword) && onSelectKeyword(keyword.id, checked)
                              }
                              disabled={isRemoved}
                              size="small"
                            />
                          </div>
                        </td>
                        <td className="table-cell">
                          <span
                            onClick={() =>
                              onStartKeywordTextEdit &&
                              handleKeywordTextClick(keyword)
                            }
                            className={`table-text leading-[1.26] ${onStartKeywordTextEdit
                                ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                : ""
                              }`}
                          >
                            {keyword.keyword_text || "—"}
                          </span>
                        </td>
                        <td className="table-cell hidden lg:table-cell min-w-[200px]">
                          <span className="table-text leading-[1.26]">
                            {keyword.adgroup_name || "—"}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell w-[150px] max-w-[150px]">
                          <div className="flex items-center gap-2 w-full relative">
                            {updatingKeywordId === keyword.id &&
                              pendingChange?.field === "status" ? (
                              <div className="flex items-center gap-2">
                                <StatusBadge status={pendingChange.newValue} />
                                <Loader size="sm" showMessage={false} />
                              </div>
                            ) : pendingChange?.id === keyword.id &&
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
                            ) : editingKeywordId === keyword.id &&
                              editingField === "status" &&
                              onUpdateKeywordStatus && !isRemoved ? (
                              <div onClick={(e) => e.stopPropagation()} className="w-full relative">
                                <Dropdown
                                  options={[
                                    { value: "ENABLED", label: "Enabled" },
                                    { value: "PAUSED", label: "Paused" },
                                    { value: "REMOVED", label: "Remove" },
                                  ]}
                                  value={editingStatus}
                                  onChange={(val) =>
                                    handleStatusChange(keyword.id, val as string)
                                  }
                                  defaultOpen={true}
                                  closeOnSelect={true}
                                  showCheckmark={false}
                                  buttonClassName="inline-edit-dropdown w-full text-[13.3px]"
                                  width="w-full"
                                  className="w-full"
                                  menuClassName="z-[100000]"
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={
                                  onUpdateKeywordStatus && !isRemoved
                                    ? "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between"
                                    : "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between cursor-default"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateKeywordStatus && !isRemoved) {
                                    handleStatusClick(keyword);
                                  }
                                }}
                                disabled={!onUpdateKeywordStatus || isRemoved}
                              >
                              <span className="truncate flex-1 min-w-0 text-left">
                                {keyword.status === "ENABLED" || keyword.status === "Enabled" || keyword.status === "ENABLE"
                                  ? "Enabled"
                                  : keyword.status === "PAUSED" || keyword.status === "Paused" || keyword.status === "PAUSE"
                                  ? "Paused"
                                  : keyword.status === "REMOVED" || keyword.status === "Removed" || keyword.status === "REMOVE"
                                  ? "Remove"
                                  : keyword.status || "Enabled"}
                              </span>
                              {onUpdateKeywordStatus && (
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
                        <td className="table-cell hidden md:table-cell whitespace-nowrap">
                          {(() => {
                            if (updatingKeywordId === keyword.id &&
                              pendingChange?.field === "bid") {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="table-text leading-[1.26]">
                                    {parseFloat(pendingChange.newValue).toFixed(2)}
                                  </span>
                                  <Loader size="sm" showMessage={false} />
                                </div>
                              );
                            }

                            const currentBid = (keyword.cpc_bid_dollars || 0).toString();

                            const bidValue = editingKeywordId === keyword.id &&
                              editingField === "bid"
                              ? (editingBid?.replace(/[^0-9.]/g, "") || currentBid)
                              : currentBid;

                            return (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={bidValue}
                                onFocus={() => {
                                  if (!isRemoved &&
                                      (editingKeywordId !== keyword.id ||
                                       editingField !== "bid")) {
                                    if (onUpdateKeywordBid) {
                                      handleBidClick(keyword);
                                    }
                                  }
                                }}
                                onChange={(e) => {
                                  if (isRemoved) return;
                                  const value = e.target.value.replace(/[^0-9.]/g, "");
                                  setEditingBid(value);
                                }}
                                onBlur={() => {
                                  if (isRemoved) return;
                                  if (editingKeywordId === keyword.id &&
                                      editingField === "bid") {
                                    handleBidBlur(keyword);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (isRemoved) return;
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  } else if (e.key === "Escape") {
                                    setEditingKeywordId(null);
                                    setEditingField(null);
                                    setEditingBid("");
                                  }
                                }}
                                disabled={isRemoved || !onUpdateKeywordBid}
                                className={`inline-edit-input w-24 ${
                                  isRemoved ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                                }`}
                              />
                            );
                          })()}
                        </td>
                        <td className="table-cell hidden md:table-cell w-[150px] max-w-[150px] pl-2">
                          <span className="table-text leading-[1.26]">
                            {keyword.match_type === "EXACT" || keyword.match_type === "Exact"
                              ? "Exact"
                              : keyword.match_type === "PHRASE" || keyword.match_type === "Phrase"
                              ? "Phrase"
                              : keyword.match_type === "BROAD" || keyword.match_type === "Broad"
                              ? "Broad"
                              : keyword.match_type || "—"}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px] hidden lg:table-cell">
                          {(() => {
                            const finalUrls =
                              (keyword as any).final_urls ||
                              (keyword as any).finalUrls ||
                              null;
                            const finalMobileUrls =
                              (keyword as any).final_mobile_urls ||
                              (keyword as any).finalMobileUrls ||
                              null;

                            const urlsArray = Array.isArray(finalUrls)
                              ? finalUrls.filter((u: any) => u && u.trim())
                              : typeof finalUrls === "string" && finalUrls.trim()
                                ? finalUrls
                                  .split(",")
                                  .map((u: string) => u.trim())
                                  .filter((u: string) => u)
                                : [];
                            const mobileUrlsArray = Array.isArray(finalMobileUrls)
                              ? finalMobileUrls.filter((u: any) => u && u.trim())
                              : typeof finalMobileUrls === "string" &&
                                finalMobileUrls.trim()
                                ? finalMobileUrls
                                  .split(",")
                                  .map((u: string) => u.trim())
                                  .filter((u: string) => u)
                                : [];

                            const hasUrls = urlsArray.length > 0;
                            const hasMobileUrls = mobileUrlsArray.length > 0;

                            return (
                              <div className="flex items-center gap-2 group">
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                  {hasUrls && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] text-gray-500">
                                        Desktop:
                                      </span>
                                      <span
                                        className="table-text truncate"
                                        title={urlsArray.join(", ")}
                                      >
                                        {urlsArray.length > 1
                                          ? `${urlsArray[0]} (+${urlsArray.length - 1
                                          } more)`
                                          : urlsArray[0]}
                                      </span>
                                    </div>
                                  )}
                                  {hasMobileUrls && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] text-gray-500">
                                        Mobile:
                                      </span>
                                      <span
                                        className="table-text truncate"
                                        title={mobileUrlsArray.join(", ")}
                                      >
                                        {mobileUrlsArray.length > 1
                                          ? `${mobileUrlsArray[0]} (+${mobileUrlsArray.length - 1
                                          } more)`
                                          : mobileUrlsArray[0]}
                                      </span>
                                    </div>
                                  )}
                                  {!hasUrls && !hasMobileUrls && (
                                    <span className="table-text">
                                      —
                                    </span>
                                  )}
                                </div>
                                {onStartFinalUrlEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStartFinalUrlEdit(keyword);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#136D6D] hover:text-[#0e5a5a] flex-shrink-0"
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
                            );
                          })()}
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatCurrency2Decimals((keyword as any).spends)}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatCurrency2Decimals((keyword as any).sales)}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {((keyword as any).impressions || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {((keyword as any).clicks || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatPercentage((keyword as any).ctr)}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {((keyword as any).roas || 0).toFixed(2)}x
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatCurrency2Decimals((keyword as any).avg_cpc || (keyword as any).cpc)}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {((keyword as any).conversions || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatPercentage((keyword as any).conversion_rate)}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatCurrency2Decimals((keyword as any).cost_per_conversion)}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatCurrency2Decimals((keyword as any).avg_cost || (((keyword as any).spends || 0) / Math.max((keyword as any).interactions || (keyword as any).clicks || 1, 1)))}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {formatPercentage((keyword as any).interaction_rate)}
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
        {!loading && keywords.length > 0 && totalPages > 1 && (
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

        {/* Inline Edit Modal for Status and Match Type */}
        {showInlineEditModal && inlineEditKeyword && inlineEditField && (
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
                Confirm {inlineEditField === "status" ? "Status" : "Match Type"} Change
              </h3>

              <div className="mb-4">
                <p className="text-[12.16px] text-[#556179] mb-2">
                  Keyword:{" "}
                  <span className="font-semibold text-[#072929]">
                    {inlineEditKeyword.keyword_text || "Unnamed Keyword"}
                  </span>
                </p>
                <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[12.16px] text-[#556179]">
                      {inlineEditField === "status" ? "Status" : "Match Type"}:
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
              if (e.target === e.currentTarget && updatingKeywordId !== bidConfirmationData.keyword.id) {
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
                  Keyword:{" "}
                  <span className="font-semibold text-[#072929]">
                    {bidConfirmationData.keyword.keyword_text}
                  </span>
                </p>
                <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[12.8px] text-[#556179]">Max. CPC:</span>
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
                  disabled={updatingKeywordId === bidConfirmationData.keyword.id}
                  className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!onUpdateKeywordBid || !bidConfirmationData) return;
                    
                    setUpdatingKeywordId(bidConfirmationData.keyword.id);
                    try {
                      await onUpdateKeywordBid(
                        bidConfirmationData.keyword.id,
                        bidConfirmationData.newBid
                      );
                      setShowBidConfirmationModal(false);
                      setBidConfirmationData(null);
                    } catch (error) {
                      console.error("Failed to update bid:", error);
                    } finally {
                      setUpdatingKeywordId(null);
                    }
                  }}
                  disabled={updatingKeywordId === bidConfirmationData.keyword.id}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingKeywordId === bidConfirmationData.keyword.id
                    ? "Updating..."
                    : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk confirmation modal */}
        {_accountId && channelId && onBulkUpdateComplete && (
          <BulkUpdateConfirmationModal
            isOpen={showBulkConfirmationModal}
            onClose={() => {
              setShowBulkConfirmationModal(false);
              setPendingStatusAction(null);
              // Clear selections when closing modal after successful update
              if (bulkUpdateResults && bulkUpdateResults.updated > 0) {
                onSelectAll(false);
              }
              setBulkUpdateResults(null);
            }}
            entityLabel="keyword"
            entityNameColumn="Keyword"
            selectedCount={selectedKeywordIds.size}
            bulkUpdateResults={bulkUpdateResults}
            isValueChange={false}
            valueChangeLabel=""
            previewRows={getSelectedKeywordsData().map((kw) => {
              const oldStatus = formatStatusForDisplay(kw.status || "ENABLED");
              const newStatus = pendingStatusAction
                ? formatStatusForDisplay(pendingStatusAction)
                : oldStatus;
              return {
                name: kw.keyword_text || `Keyword ${kw.keyword_id}`,
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
            loadingMessage="Updating keywords..."
            successMessage="All keywords updated successfully!"
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
          title="Are you sure you want to remove this keyword?"
          message="This action cannot be undone. All data associated with this keyword will be permanently removed."
          type="danger"
          size="sm"
          isLoading={inlineEditLoading}
          icon={<TrashIcon className="w-6 h-6 text-red-600" />}
        />
      </>
    );
  };
