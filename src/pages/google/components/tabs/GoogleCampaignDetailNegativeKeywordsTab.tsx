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
import { TrashIcon } from "lucide-react";

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
}) => {
  // Check if this is a Performance Max campaign
  const isPerformanceMax = campaignType?.toUpperCase() === "PERFORMANCE_MAX";
  const [editingNegativeKeywordId, setEditingNegativeKeywordId] = useState<
    number | null
  >(null);
  const [editingField, setEditingField] = useState<
    "status" | "match_type" | null
  >(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingMatchType, setEditingMatchType] = useState<string>("");
  const [updatingNegativeKeywordId, setUpdatingNegativeKeywordId] = useState<
    number | null
  >(null);

  // Modal state for status and match_type changes - matches KeywordsTab pattern
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditNegativeKeyword, setInlineEditNegativeKeyword] = useState<GoogleNegativeKeyword | null>(null);
  const [inlineEditField, setInlineEditField] = useState<"status" | "match_type" | null>(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [inlineEditCriterionId, setInlineEditCriterionId] = useState<string>("");
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
          field: "status" 
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

  const handleMatchTypeClick = (negativeKeyword: GoogleNegativeKeyword) => {
    if (onUpdateNegativeKeywordMatchType) {
      // Close any other open dropdowns first
      if (
        editingNegativeKeywordId !== null &&
        editingNegativeKeywordId !== negativeKeyword.id
      ) {
        setEditingNegativeKeywordId(null);
        setEditingField(null);
      }
      setEditingNegativeKeywordId(negativeKeyword.id);
      setEditingField("match_type");
      const currentMatchType = (
        negativeKeyword.match_type || "BROAD"
      ).toUpperCase();
      setEditingMatchType(currentMatchType);
    }
  };

  const handleKeywordTextClick = (negativeKeyword: GoogleNegativeKeyword) => {
    if (onUpdateNegativeKeywordText) {
      // Show modal instead of inline editing
      setKeywordTextEditNegativeKeyword(negativeKeyword);
      setKeywordTextEditValue(negativeKeyword.keyword_text || "");
      setShowKeywordTextEditModal(true);
    }
  };

  const handleMatchTypeChange = (
    negativeKeywordId: number,
    criterionId: string,
    newMatchType: string
  ) => {
    const negativeKeyword = negativeKeywords.find(
      (nkw) => nkw.id === negativeKeywordId
    );
    if (!negativeKeyword) return;

    const oldMatchType = (negativeKeyword.match_type || "BROAD").toUpperCase();
    const newMatchTypeUpper = newMatchType.toUpperCase();

    if (newMatchTypeUpper !== oldMatchType) {
      // Show confirmation modal immediately - matches KeywordsTab pattern
      const matchTypeDisplayMap: Record<string, string> = {
        EXACT: "Exact",
        PHRASE: "Phrase",
        BROAD: "Broad",
        Exact: "Exact",
        Phrase: "Phrase",
        Broad: "Broad",
      };
      setInlineEditNegativeKeyword(negativeKeyword);
      setInlineEditField("match_type");
      setInlineEditOldValue(matchTypeDisplayMap[oldMatchType] || oldMatchType);
      setInlineEditNewValue(matchTypeDisplayMap[newMatchTypeUpper] || newMatchTypeUpper);
      setInlineEditCriterionId(criterionId);
      setShowInlineEditModal(true);
    }
    setEditingNegativeKeywordId(null);
    setEditingField(null);
    setEditingMatchType("");
  };

  const runInlineEdit = async () => {
    if (!inlineEditNegativeKeyword || !inlineEditField || !inlineEditCriterionId) return;

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
      } else if (inlineEditField === "match_type" && onUpdateNegativeKeywordMatchType) {
        // Map display values back to API values
        const matchTypeMap: Record<string, "EXACT" | "PHRASE" | "BROAD"> = {
          Exact: "EXACT",
          EXACT: "EXACT",
          Phrase: "PHRASE",
          PHRASE: "PHRASE",
          Broad: "BROAD",
          BROAD: "BROAD",
        };
        const matchTypeValue = matchTypeMap[inlineEditNewValue] || "EXACT";
        await onUpdateNegativeKeywordMatchType(inlineEditCriterionId, matchTypeValue);
      }

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
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* Header with Filter Button and Sync Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Negative Keywords
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
          ) : negativeKeywords.length === 0 ? (
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
                          negativeKeywords.length > 0 &&
                          negativeKeywords.every((nkw) =>
                            selectedNegativeKeywordIds.has(nkw.id)
                          )
                        }
                        onChange={onSelectAll}
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
                {negativeKeywords.map((negativeKeyword, index) => {
                  const isLastRow = index === negativeKeywords.length - 1;
                  const negativeKeywordStatus = (negativeKeyword.status || "").toUpperCase();
                  const isRemoved = negativeKeywordStatus === "REMOVED";
                  return (
                    <tr
                      key={negativeKeyword.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${isRemoved ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"} transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedNegativeKeywordIds.has(
                              negativeKeyword.id
                            )}
                            onChange={(checked) =>
                              onSelectNegativeKeyword(
                                negativeKeyword.id,
                                checked
                              )
                            }
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`table-text leading-[1.26] ${
                            onUpdateNegativeKeywordText
                              ? "cursor-pointer hover:underline"
                              : ""
                          }`}
                          onClick={() =>
                            onUpdateNegativeKeywordText &&
                            handleKeywordTextClick(negativeKeyword)
                          }
                        >
                          {negativeKeyword.keyword_text || "—"}
                        </span>
                      </td>
                      {!isPerformanceMax && (
                        <td className="table-cell hidden lg:table-cell">
                          <span className="table-text leading-[1.26]">
                            {negativeKeyword.adgroup_name ||
                              (negativeKeyword.level === "campaign" ? "—" : "—")}
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
                                <StatusBadge status={negativeKeyword.status || "ENABLED"} />
                                <Loader size="sm" showMessage={false} />
                              </div>
                            ) : editingNegativeKeywordId === negativeKeyword.id &&
                              editingField === "status" &&
                              onUpdateNegativeKeywordStatus && !isRemoved ? (
                              <div onClick={(e) => e.stopPropagation()} className="w-full relative">
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
                                  if (onUpdateNegativeKeywordStatus && !isRemoved) {
                                    handleStatusClick(negativeKeyword);
                                  }
                                }}
                                disabled={!onUpdateNegativeKeywordStatus || isRemoved}
                              >
                            <span className="truncate flex-1 min-w-0 text-left">
                              {negativeKeyword.status === "ENABLED" || negativeKeyword.status === "Enabled" || negativeKeyword.status === "ENABLE"
                                ? "Enabled"
                                : negativeKeyword.status === "PAUSED" || negativeKeyword.status === "Paused" || negativeKeyword.status === "PAUSE"
                                ? "Paused"
                                : negativeKeyword.status === "REMOVED" || negativeKeyword.status === "Removed" || negativeKeyword.status === "REMOVE"
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
                        {updatingNegativeKeywordId === negativeKeyword.id ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {negativeKeyword.match_type || "—"}
                            </span>
                            <Loader size="sm" showMessage={false} />
                          </div>
                        ) : editingNegativeKeywordId === negativeKeyword.id &&
                          editingField === "match_type" &&
                          onUpdateNegativeKeywordMatchType && !isRemoved ? (
                          <div className="w-full relative" onClick={(e) => e.stopPropagation()}>
                            <Dropdown
                              key={`match-type-${negativeKeyword.id}`}
                              options={[
                                { value: "EXACT", label: "Exact match" },
                                { value: "PHRASE", label: "Phrase match" },
                                { value: "BROAD", label: "Broad match" },
                              ]}
                              value={editingMatchType}
                              onChange={(val) =>
                                handleMatchTypeChange(
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
                                setEditingMatchType("");
                              }}
                              buttonClassName="inline-edit-dropdown w-full text-[13.3px]"
                              width="w-full"
                              className="w-full"
                              menuClassName="z-[100000]"
                              align="left"
                              disabled={isRemoved}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={
                              onUpdateNegativeKeywordMatchType && !isRemoved
                                ? "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between"
                                : "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between cursor-default"
                            }
                            onClick={() =>
                              onUpdateNegativeKeywordMatchType && !isRemoved &&
                              handleMatchTypeClick(negativeKeyword)
                            }
                            disabled={!onUpdateNegativeKeywordMatchType || isRemoved}
                          >
                            <span className="truncate flex-1 min-w-0 text-left">
                              {negativeKeyword.match_type === "EXACT" || negativeKeyword.match_type === "Exact"
                                ? "Exact"
                                : negativeKeyword.match_type === "PHRASE" || negativeKeyword.match_type === "Phrase"
                                ? "Phrase"
                                : negativeKeyword.match_type === "BROAD" || negativeKeyword.match_type === "Broad"
                                ? "Broad"
                                : negativeKeyword.match_type || "—"}
                            </span>
                            {onUpdateNegativeKeywordMatchType && (
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
              Confirm {inlineEditField === "status" ? "Status" : "Match Type"} Change
            </h3>

            <div className="mb-4">
              <p className="text-[12.16px] text-[#556179] mb-2">
                Negative Keyword:{" "}
                <span className="font-semibold text-[#072929]">
                  {inlineEditNegativeKeyword.keyword_text || "Unnamed Negative Keyword"}
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
                    <Loader size="sm" variant="white" showMessage={false} className="!flex-row" />
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
