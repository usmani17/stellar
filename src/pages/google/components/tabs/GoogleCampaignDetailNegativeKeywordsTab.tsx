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
import type { GoogleNegativeKeyword } from "./GoogleTypes";
import { ConfirmationModal } from "../../../../components/ui/ConfirmationModal";
import { TrashIcon, Send } from "lucide-react";
import { googleAdwordsNegativeKeywordsService } from "../../../../services/googleAdwords/googleAdwordsNegativeKeywords";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";
import { BulkActionsDropdown } from "../BulkActionsDropdown";
import { formatStatusForDisplay } from "../../utils/googleAdsUtils";

interface GoogleCampaignDetailNegativeKeywordsTabProps {
  negativeKeywords: GoogleNegativeKeyword[];
  loading: boolean;
  selectedNegativeKeywordIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectNegativeKeyword: (id: number, checked: boolean) => void;
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
  syncMessage: string | null;
  onRefresh?: () => void;
  getSortIcon: (
    column: string,
    currentSortBy: string,
    currentSortOrder: "asc" | "desc"
  ) => React.ReactNode;
  onUpdateNegativeKeywordStatus?: (
    criterionId: string,
    status: string
  ) => Promise<void>;
  onUpdateNegativeKeywordMatchType?: (
    criterionId: string,
    matchType: string
  ) => Promise<void>;
  onUpdateNegativeKeywordText?: (
    criterionId: string,
    keywordText: string
  ) => Promise<void>;
  campaignType?: string;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  accountId?: string;
  channelId?: string;
  onBulkUpdateComplete?: () => void;
  showDraftsOnly?: boolean;
  onToggleDraftsOnly?: () => void;
  onPublishDraft?: (negativeKeyword: GoogleNegativeKeyword) => void;
  publishLoadingId?: string | number;
}

export const GoogleCampaignDetailNegativeKeywordsTab: React.FC<
  GoogleCampaignDetailNegativeKeywordsTabProps
> = ({
  negativeKeywords,
  loading,
  selectedNegativeKeywordIds,
  onSelectAll,
  onSelectNegativeKeyword,
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
  syncMessage,
  onRefresh,
  getSortIcon,
  onUpdateNegativeKeywordStatus,
  onUpdateNegativeKeywordMatchType,
  onUpdateNegativeKeywordText,
  campaignType,
  createButton,
  createPanel,
  accountId,
  channelId,
  onBulkUpdateComplete,
  showDraftsOnly = false,
  onToggleDraftsOnly,
  onPublishDraft,
  publishLoadingId,
}) => {
    const isDraftNegativeKeyword = (n: GoogleNegativeKeyword) => {
      const s = (n.status || "").toUpperCase();
      return s === "SAVED_DRAFT" || s === "DRAFT" || String(n.criterion_id ?? n.id).startsWith("draft-");
    };
    // Check if this is a Performance Max campaign
    const isPerformanceMax = campaignType?.toUpperCase() === "PERFORMANCE_MAX";
    const [showBulkConfirmationModal, setShowBulkConfirmationModal] =
      useState(false);
    const [pendingStatusAction, setPendingStatusAction] = useState<
      "ENABLED" | "PAUSED" | null
    >(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkUpdateResults, setBulkUpdateResults] = useState<{
      updated: number;
      failed: number;
      errors: string[];
    } | null>(null);

    const filteredNegativeKeywords = React.useMemo(() => {
      if (!filters || filters.length === 0) return negativeKeywords;

      return negativeKeywords.filter((nk) =>
        filters.every((filter) => {
          const fieldValue = (nk as any)[filter.field];
          if (fieldValue == null) return false;

          //  STATUS FILTER (NO operator)
          if (filter.field === "status") {
            return (
              String(fieldValue).toUpperCase() ===
              String(filter.value).toUpperCase()
            );
          }

          //  KEYWORD FILTER
          if (
            typeof fieldValue === "string" &&
            typeof filter.value === "string"
          ) {
            const left = fieldValue.toLowerCase();
            const right = filter.value.toLowerCase();

            switch (filter.operator) {
              case "contains":
                return left.includes(right);
              case "equals":
                return left === right;
              case "not_contains":
                return !left.includes(right);
              default:
                return true;
            }
          }

          return true;
        })
      );
    }, [negativeKeywords, filters]);

    const getSelectedNegativeKeywordsData = () =>
      filteredNegativeKeywords.filter((n) =>
        selectedNegativeKeywordIds.has(n.id)
      );

    const selectableNegativeKeywords = filteredNegativeKeywords.filter(
      (n) => (n.status || "").toUpperCase() !== "REMOVED"
    );

    const isNegativeKeywordRemoved = (n: { status?: string }) =>
      (n.status || "").toUpperCase() === "REMOVED";

    const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
      if (!accountId || !channelId || selectedNegativeKeywordIds.size === 0)
        return;
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
      const selectedData = getSelectedNegativeKeywordsData();
      const negativeKeywordIds = selectedData.map((n) => n.criterion_id);
      const level = selectedData[0]?.level === "adgroup" ? "adgroup" : "campaign";
      try {
        setBulkLoading(true);
        setBulkUpdateResults(null);
        const response =
          await googleAdwordsNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(
            accountIdNum,
            channelIdNum,
            { negativeKeywordIds, action: "status", value: statusValue, level }
          );
        setBulkUpdateResults({
          updated: response.updated ?? negativeKeywordIds.length,
          failed: response.failed ?? 0,
          errors: response.errors ?? [],
        });
        if (onBulkUpdateComplete) onBulkUpdateComplete();
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        setBulkUpdateResults({
          updated: 0,
          failed: selectedNegativeKeywordIds.size,
          errors: [
            err?.response?.data?.error ||
            err?.message ||
            "Failed to update negative keywords.",
          ],
        });
      } finally {
        setBulkLoading(false);
      }
    };

    const [editingNegativeKeywordId, setEditingNegativeKeywordId] = useState<
      number | null
    >(null);
    const [editingField, setEditingField] = useState<
      "status" | "match_type" | null
    >(null);
    const [editingStatus, setEditingStatus] = useState<string>("");
    // Disabled: Google Ads API doesn't allow updating negative keyword match type
    // const [editingMatchType, setEditingMatchType] = useState<string>("");
    const [updatingNegativeKeywordId, setUpdatingNegativeKeywordId] = useState<
      number | null
    >(null);

    // Modal state for status and match_type changes - matches KeywordsTab pattern
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [inlineEditNegativeKeyword, setInlineEditNegativeKeyword] =
      useState<GoogleNegativeKeyword | null>(null);
    const [inlineEditField, setInlineEditField] = useState<
      "status" | "match_type" | null
    >(null);
    const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
    const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
    const [inlineEditCriterionId, setInlineEditCriterionId] =
      useState<string>("");
    const [inlineEditLoading, setInlineEditLoading] = useState(false);

    // Keyword text edit modal state
    const [showKeywordTextEditModal, setShowKeywordTextEditModal] =
      useState(false);
    const [keywordTextEditNegativeKeyword, setKeywordTextEditNegativeKeyword] =
      useState<GoogleNegativeKeyword | null>(null);
    const [keywordTextEditValue, setKeywordTextEditValue] = useState<string>("");
    const [keywordTextEditLoading, setKeywordTextEditLoading] = useState(false);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const [pendingRemoveChange, setPendingRemoveChange] = useState<{
      value: string;
      negativeKeywordId: number;
      criterionId: string;
      field: string;
    } | null>(null);

    const handleStatusClick = (negativeKeyword: GoogleNegativeKeyword) => {
      if (onUpdateNegativeKeywordStatus) {
        // Close any other open dropdowns first
        if (
          editingNegativeKeywordId !== null &&
          editingNegativeKeywordId !== negativeKeyword.id
        ) {
          setEditingNegativeKeywordId(null);
          setEditingField(null);
        }
        setEditingNegativeKeywordId(negativeKeyword.id);
        setEditingField("status");
        setEditingStatus(negativeKeyword.status || "ENABLED");
      }
    };

    const handleStatusChange = (
      negativeKeywordId: number,
      criterionId: string,
      newStatus: string
    ) => {
      const negativeKeyword = negativeKeywords.find(
        (nkw) => nkw.id === negativeKeywordId
      );
      if (!negativeKeyword) return;

      const oldStatus = (negativeKeyword.status || "ENABLED").toUpperCase();
      const newStatusUpper = newStatus.toUpperCase();

      if (newStatusUpper !== oldStatus) {
        // Check if status is being changed to REMOVED - show confirmation modal
        if (newStatusUpper === "REMOVED") {
          setEditingNegativeKeywordId(null);
          setEditingField(null);
          setEditingStatus("");
          setPendingRemoveChange({
            value: "REMOVED",
            negativeKeywordId: negativeKeyword.id,
            criterionId: criterionId,
            field: "status",
          });
          setShowRemoveConfirmation(true);
          return;
        }

        // Show confirmation modal immediately - matches KeywordsTab pattern
        const statusDisplayMap: Record<string, string> = {
          ENABLED: "Enabled",
          PAUSED: "Paused",
          REMOVED: "Remove",
          Enabled: "Enabled",
          Paused: "Paused",
          Removed: "Remove",
        };
        setInlineEditNegativeKeyword(negativeKeyword);
        setInlineEditField("status");
        setInlineEditOldValue(statusDisplayMap[oldStatus] || oldStatus);
        setInlineEditNewValue(statusDisplayMap[newStatusUpper] || newStatusUpper);
        setInlineEditCriterionId(criterionId);
        setShowInlineEditModal(true);
      }
      setEditingNegativeKeywordId(null);
      setEditingField(null);
      setEditingStatus("");
    };

    // Disabled: Google Ads API doesn't allow updating negative keyword match type
    // const handleMatchTypeClick = (negativeKeyword: GoogleNegativeKeyword) => {
    //   if (onUpdateNegativeKeywordMatchType) {
    //     // Close any other open dropdowns first
    //     if (
    //       editingNegativeKeywordId !== null &&
    //       editingNegativeKeywordId !== negativeKeyword.id
    //     ) {
    //       setEditingNegativeKeywordId(null);
    //       setEditingField(null);
    //     }
    //     setEditingNegativeKeywordId(negativeKeyword.id);
    //     setEditingField("match_type");
    //     const currentMatchType = (
    //       negativeKeyword.match_type || "BROAD"
    //     ).toUpperCase();
    //     setEditingMatchType(currentMatchType);
    //   }
    // };

    // Disabled: Google Ads API doesn't allow updating negative keyword text
    // const handleKeywordTextClick = (negativeKeyword: GoogleNegativeKeyword) => {
    //   if (onUpdateNegativeKeywordText) {
    //     // Show modal instead of inline editing
    //     setKeywordTextEditNegativeKeyword(negativeKeyword);
    //     setKeywordTextEditValue(negativeKeyword.keyword_text || "");
    //     setShowKeywordTextEditModal(true);
    //   }
    // };

    // Disabled: Google Ads API doesn't allow updating negative keyword match type
    // const handleMatchTypeChange = (
    //   negativeKeywordId: number,
    //   criterionId: string,
    //   newMatchType: string
    // ) => {
    //   const negativeKeyword = negativeKeywords.find(
    //     (nkw) => nkw.id === negativeKeywordId
    //   );
    //   if (!negativeKeyword) return;

    //   const oldMatchType = (negativeKeyword.match_type || "BROAD").toUpperCase();
    //   const newMatchTypeUpper = newMatchType.toUpperCase();

    //   if (newMatchTypeUpper !== oldMatchType) {
    //     // Show confirmation modal immediately - matches KeywordsTab pattern
    //     const matchTypeDisplayMap: Record<string, string> = {
    //       EXACT: "Exact",
    //       PHRASE: "Phrase",
    //       BROAD: "Broad",
    //       Exact: "Exact",
    //       Phrase: "Phrase",
    //       Broad: "Broad",
    //     };
    //     setInlineEditNegativeKeyword(negativeKeyword);
    //     setInlineEditField("match_type");
    //     setInlineEditOldValue(matchTypeDisplayMap[oldMatchType] || oldMatchType);
    //     setInlineEditNewValue(matchTypeDisplayMap[newMatchTypeUpper] || newMatchTypeUpper);
    //     setInlineEditCriterionId(criterionId);
    //     setShowInlineEditModal(true);
    //   }
    //   setEditingNegativeKeywordId(null);
    //   setEditingField(null);
    //   setEditingMatchType("");
    // };

    const runInlineEdit = async () => {
      if (
        !inlineEditNegativeKeyword ||
        !inlineEditField ||
        !inlineEditCriterionId
      )
        return;

      setInlineEditLoading(true);
      setUpdatingNegativeKeywordId(inlineEditNegativeKeyword.id);
      try {
        if (inlineEditField === "status" && onUpdateNegativeKeywordStatus) {
          // Map display values back to API values
          const statusMap: Record<string, "ENABLED" | "PAUSED" | "REMOVED"> = {
            Enabled: "ENABLED",
            ENABLED: "ENABLED",
            Paused: "PAUSED",
            PAUSED: "PAUSED",
            Remove: "REMOVED",
            REMOVED: "REMOVED",
          };
          const statusValue = statusMap[inlineEditNewValue] || "ENABLED";
          await onUpdateNegativeKeywordStatus(inlineEditCriterionId, statusValue);
        }
        // Disabled: Google Ads API doesn't allow updating negative keyword match type
        // else if (inlineEditField === "match_type" && onUpdateNegativeKeywordMatchType) {
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
        //   await onUpdateNegativeKeywordMatchType(inlineEditCriterionId, matchTypeValue);
        // }

        setShowInlineEditModal(false);
        setInlineEditNegativeKeyword(null);
        setInlineEditField(null);
        setInlineEditOldValue("");
        setInlineEditNewValue("");
        setInlineEditCriterionId("");
      } catch (error) {
        console.error("Failed to update negative keyword:", error);
        alert(
          `Failed to update negative keyword ${inlineEditField}. Please try again.`
        );
      } finally {
        setInlineEditLoading(false);
        setUpdatingNegativeKeywordId(null);
      }
    };

    const cancelInlineEditModal = () => {
      setShowInlineEditModal(false);
      setInlineEditNegativeKeyword(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
      setInlineEditCriterionId("");
    };

    // Handle confirmation for REMOVED status change
    const handleConfirmRemove = async () => {
      if (!pendingRemoveChange || !onUpdateNegativeKeywordStatus) return;

      setInlineEditLoading(true);
      try {
        await onUpdateNegativeKeywordStatus(
          pendingRemoveChange.criterionId,
          "REMOVED"
        );

        setShowRemoveConfirmation(false);
        setPendingRemoveChange(null);
      } catch (error: any) {
        console.error("Failed to remove negative keyword:", error);
        alert(
          error?.response?.data?.error ||
          "Failed to remove negative keyword. Please try again."
        );
      } finally {
        setInlineEditLoading(false);
      }
    };

    // Handle cancel for REMOVED status change
    const handleCancelRemove = () => {
      setShowRemoveConfirmation(false);
      setPendingRemoveChange(null);
      setEditingNegativeKeywordId(null);
      setEditingField(null);
      setEditingStatus("");
    };

    // Keyword text edit modal handlers
    const handleKeywordTextEditSave = async () => {
      if (!keywordTextEditNegativeKeyword || !onUpdateNegativeKeywordText) return;

      const trimmedText = keywordTextEditValue.trim();
      if (!trimmedText) {
        alert("Keyword text cannot be empty. Please enter a keyword.");
        return;
      }

      const oldText = (keywordTextEditNegativeKeyword.keyword_text || "").trim();
      if (trimmedText === oldText) {
        setShowKeywordTextEditModal(false);
        setKeywordTextEditNegativeKeyword(null);
        setKeywordTextEditValue("");
        return;
      }

      setKeywordTextEditLoading(true);
      try {
        await onUpdateNegativeKeywordText(
          keywordTextEditNegativeKeyword.criterion_id,
          trimmedText
        );
        setShowKeywordTextEditModal(false);
        setKeywordTextEditNegativeKeyword(null);
        setKeywordTextEditValue("");
      } catch (error: any) {
        console.error("Error updating negative keyword text:", error);
        const errorMessage =
          error?.message || error?.toString() || "An unexpected error occurred";
        alert(`Failed to update negative keyword text: ${errorMessage}`);
      } finally {
        setKeywordTextEditLoading(false);
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
              onDismiss={() => { }}
            />
          </div>
        )}

        {/* Header with Draft switch, Filter Button and Sync Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onToggleDraftsOnly != null && (
              <button
                type="button"
                role="switch"
                aria-checked={showDraftsOnly}
                onClick={() => {
                  onToggleDraftsOnly();
                  onPageChange(1);
                }}
                className={`relative inline-flex items-center h-6 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#072929] focus:ring-offset-2 overflow-hidden ${
                  showDraftsOnly ? "bg-forest-f40" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-[10.64px] font-medium whitespace-nowrap transition-all duration-200 ${
                    showDraftsOnly
                      ? "left-2 right-auto text-white"
                      : "left-auto right-2 text-[#556179]"
                  }`}
                >
                  Draft
                </span>
                <span
                  className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-5 h-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                    showDraftsOnly ? "translate-x-10" : "translate-x-0"
                  }`}
                />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {createButton}
            {accountId && channelId && onBulkUpdateComplete && (
              <BulkActionsDropdown
                options={[
                  { value: "ENABLED", label: "Enable" },
                  { value: "PAUSED", label: "Pause" },
                ]}
                selectedCount={selectedNegativeKeywordIds.size}
                onSelect={(value) => {
                  setPendingStatusAction(value as "ENABLED" | "PAUSED");
                  setShowBulkConfirmationModal(true);
                }}
              />
            )}
            <button onClick={onToggleFilterPanel} className="edit-button">
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
                disabled={loading || syncing}
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

        {/* Negative Keywords Table */}
        <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            {loading ? (
              <div className="text-center py-8 text-[#556179] text-[13.3px]">
                Loading negative keywords...
              </div>
            ) : filteredNegativeKeywords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13.3px] text-[#556179] mb-4">
                  No negative keywords found
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
                            selectableNegativeKeywords.length > 0 &&
                            selectableNegativeKeywords.every((nkw) =>
                              selectedNegativeKeywordIds.has(nkw.id)
                            )
                          }
                          onChange={(checked) =>
                            selectableNegativeKeywords.forEach((nkw) =>
                              onSelectNegativeKeyword(nkw.id, checked)
                            )
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
                    {!isPerformanceMax && (
                      <th className="table-header hidden lg:table-cell">
                        Ad Group
                      </th>
                    )}
                    <th
                      className="table-header hidden md:table-cell"
                      onClick={() => onSort("level")}
                    >
                      <div className="flex items-center gap-1">
                        Level
                        {getSortIcon("level", sortBy, sortOrder)}
                      </div>
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
                    <th
                      className="table-header hidden md:table-cell w-[140px] max-w-[140px]"
                      onClick={() => onSort("match_type")}
                    >
                      <div className="flex items-center gap-1">
                        Match Type
                        {getSortIcon("match_type", sortBy, sortOrder)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNegativeKeywords.map((negativeKeyword, index) => {
                    const isLastRow = index === filteredNegativeKeywords.length - 1;
                    const negativeKeywordStatus = (
                      negativeKeyword.status || ""
                    ).toUpperCase();
                    const isRemoved = negativeKeywordStatus === "REMOVED";
                    return (
                      <tr
                        key={negativeKeyword.id}
                        className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                          } ${isRemoved
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-50"
                          } transition-colors`}
                      >
                        <td className="table-cell">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedNegativeKeywordIds.has(
                                negativeKeyword.id
                              )}
                              onChange={(checked) =>
                                !isNegativeKeywordRemoved(negativeKeyword) &&
                                onSelectNegativeKeyword(
                                  negativeKeyword.id,
                                  checked
                                )
                              }
                              disabled={isRemoved}
                              size="small"
                            />
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                          <span className="table-text leading-[1.26]">
                            {negativeKeyword.keyword_text || "—"}
                          </span>
                          {onPublishDraft && isDraftNegativeKeyword(negativeKeyword) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPublishDraft(negativeKeyword);
                              }}
                              className="table-edit-icon flex-shrink-0 cursor-pointer !opacity-100 pointer-events-auto"
                              title="Publish draft to Google Ads"
                              disabled={publishLoadingId === negativeKeyword.id || publishLoadingId === negativeKeyword.criterion_id}
                            >
                              {publishLoadingId === negativeKeyword.id || publishLoadingId === negativeKeyword.criterion_id ? (
                                <Loader size="sm" showMessage={false} />
                              ) : (
                                <Send className="w-4 h-4 text-[#136D6D]" aria-hidden />
                              )}
                            </button>
                          )}
                          </div>
                        </td>
                        {!isPerformanceMax && (
                          <td className="table-cell hidden lg:table-cell">
                            <span className="table-text leading-[1.26]">
                              {negativeKeyword.adgroup_name ||
                                (negativeKeyword.level === "campaign"
                                  ? "—"
                                  : "—")}
                            </span>
                          </td>
                        )}
                        <td className="table-cell hidden md:table-cell">
                          <span className="table-text leading-[1.26]">
                            {negativeKeyword.level === "campaign"
                              ? "Campaign"
                              : "Ad Group"}
                          </span>
                        </td>
                        <td className="table-cell hidden md:table-cell w-[140px] max-w-[140px]">
                          <div className="flex items-center gap-2 w-full relative">
                            {updatingNegativeKeywordId === negativeKeyword.id ? (
                              <div className="flex items-center gap-2">
                                <StatusBadge
                                  status={negativeKeyword.status || "ENABLED"}
                                />
                                <Loader size="sm" showMessage={false} />
                              </div>
                            ) : editingNegativeKeywordId === negativeKeyword.id &&
                              editingField === "status" &&
                              onUpdateNegativeKeywordStatus &&
                              !isRemoved ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="w-full relative"
                              >
                                <Dropdown
                                  key={`status-${negativeKeyword.id}-${editingNegativeKeywordId}`}
                                  options={[
                                    { value: "ENABLED", label: "Enabled" },
                                    { value: "PAUSED", label: "Paused" },
                                    { value: "REMOVED", label: "Remove" },
                                  ]}
                                  value={editingStatus}
                                  onChange={(val) =>
                                    handleStatusChange(
                                      negativeKeyword.id,
                                      negativeKeyword.criterion_id,
                                      val as string
                                    )
                                  }
                                  defaultOpen={true}
                                  closeOnSelect={true}
                                  showCheckmark={false}
                                  onClose={() => {
                                    setEditingNegativeKeywordId(null);
                                    setEditingField(null);
                                    setEditingStatus("");
                                  }}
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
                                  onUpdateNegativeKeywordStatus && !isRemoved
                                    ? "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between"
                                    : "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between cursor-default"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    onUpdateNegativeKeywordStatus &&
                                    !isRemoved
                                  ) {
                                    handleStatusClick(negativeKeyword);
                                  }
                                }}
                                disabled={
                                  !onUpdateNegativeKeywordStatus || isRemoved
                                }
                              >
                                <span className="truncate flex-1 min-w-0 text-left">
                                  {negativeKeyword.status === "ENABLED" ||
                                    negativeKeyword.status === "Enabled" ||
                                    negativeKeyword.status === "ENABLE"
                                    ? "Enabled"
                                    : negativeKeyword.status === "PAUSED" ||
                                      negativeKeyword.status === "Paused" ||
                                      negativeKeyword.status === "PAUSE"
                                      ? "Paused"
                                      : negativeKeyword.status === "REMOVED" ||
                                        negativeKeyword.status === "Removed" ||
                                        negativeKeyword.status === "REMOVE"
                                        ? "Remove"
                                        : negativeKeyword.status || "Enabled"}
                                </span>
                                {onUpdateNegativeKeywordStatus && (
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
                        <td className="table-cell hidden md:table-cell w-[140px] max-w-[140px]">
                          <span className="table-text leading-[1.26]">
                            {negativeKeyword.match_type === "EXACT" ||
                              negativeKeyword.match_type === "Exact"
                              ? "Exact"
                              : negativeKeyword.match_type === "PHRASE" ||
                                negativeKeyword.match_type === "Phrase"
                                ? "Phrase"
                                : negativeKeyword.match_type === "BROAD" ||
                                  negativeKeyword.match_type === "Broad"
                                  ? "Broad"
                                  : negativeKeyword.match_type || "—"}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-[13.3px] text-[#556179]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Inline Edit Modal for Status and Match Type */}
        {showInlineEditModal && inlineEditNegativeKeyword && inlineEditField && (
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
                Confirm {inlineEditField === "status" ? "Status" : "Match Type"}{" "}
                Change
              </h3>

              <div className="mb-4">
                <p className="text-[12.16px] text-[#556179] mb-2">
                  Negative Keyword:{" "}
                  <span className="font-semibold text-[#072929]">
                    {inlineEditNegativeKeyword.keyword_text ||
                      "Unnamed Negative Keyword"}
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

        {/* Keyword Text Edit Modal */}
        {showKeywordTextEditModal && keywordTextEditNegativeKeyword && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
            onClick={(e) => {
              if (e.target === e.currentTarget && !keywordTextEditLoading) {
                setShowKeywordTextEditModal(false);
                setKeywordTextEditNegativeKeyword(null);
                setKeywordTextEditValue("");
              }
            }}
          >
            <div
              className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[18px] font-semibold text-[#072929] mb-2">
                Edit Negative Keyword Text
              </h3>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-[12px] text-yellow-800">
                  <strong>Note:</strong> Google Ads doesn't allow updating
                  negative keyword text directly. This will create a new negative
                  keyword with the updated text and remove the old one. The
                  negative keyword will appear with a new ID after the update.
                </p>
              </div>
              <div className="mb-6">
                <input
                  type="text"
                  value={keywordTextEditValue}
                  onChange={(e) => setKeywordTextEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !keywordTextEditLoading) {
                      handleKeywordTextEditSave();
                    } else if (e.key === "Escape" && !keywordTextEditLoading) {
                      setShowKeywordTextEditModal(false);
                      setKeywordTextEditNegativeKeyword(null);
                      setKeywordTextEditValue("");
                    }
                  }}
                  disabled={keywordTextEditLoading}
                  autoFocus
                  className="w-full px-4 py-2.5 text-[13.3px] text-black border-2 border-[#136D6D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter negative keyword text"
                  maxLength={255}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!keywordTextEditLoading) {
                      setShowKeywordTextEditModal(false);
                      setKeywordTextEditNegativeKeyword(null);
                      setKeywordTextEditValue("");
                    }
                  }}
                  disabled={keywordTextEditLoading}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleKeywordTextEditSave}
                  disabled={
                    keywordTextEditLoading || !keywordTextEditValue.trim()
                  }
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {keywordTextEditLoading ? (
                    <>
                      <Loader
                        size="sm"
                        variant="white"
                        showMessage={false}
                        className="!flex-row"
                      />
                      Updating...
                    </>
                  ) : (
                    "Save"
                  )}
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
            entityLabel="negative keyword"
            entityNameColumn="Keyword"
            selectedCount={selectedNegativeKeywordIds.size}
            bulkUpdateResults={bulkUpdateResults}
            isValueChange={false}
            valueChangeLabel=""
            previewRows={getSelectedNegativeKeywordsData().map((n) => {
              const oldStatus = formatStatusForDisplay(n.status || "ENABLED");
              const newStatus = pendingStatusAction
                ? formatStatusForDisplay(pendingStatusAction)
                : oldStatus;
              return {
                name: n.keyword_text || n.criterion_id || "—",
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
            loadingMessage="Updating negative keywords..."
            successMessage="All negative keywords updated successfully!"
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
          title="Are you sure you want to remove this negative keyword?"
          message="This action cannot be undone. All data associated with this negative keyword will be permanently removed."
          type="danger"
          size="sm"
          isLoading={inlineEditLoading}
          icon={<TrashIcon className="w-6 h-6 text-red-600" />}
        />
      </>
    );
  };
