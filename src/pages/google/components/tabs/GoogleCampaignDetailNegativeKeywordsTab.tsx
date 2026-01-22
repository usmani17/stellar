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
}) => {
  const [editingNegativeKeywordId, setEditingNegativeKeywordId] = useState<
    number | null
  >(null);
  const [editingField, setEditingField] = useState<
    "status" | "match_type" | null
  >(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingMatchType, setEditingMatchType] = useState<string>("");
  const [pendingChange, setPendingChange] = useState<{
    id: number;
    criterionId: string;
    field: "status" | "match_type" | "keyword_text";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [updatingNegativeKeywordId, setUpdatingNegativeKeywordId] = useState<
    number | null
  >(null);

  // Keyword text edit modal state
  const [showKeywordTextEditModal, setShowKeywordTextEditModal] =
    useState(false);
  const [keywordTextEditNegativeKeyword, setKeywordTextEditNegativeKeyword] =
    useState<GoogleNegativeKeyword | null>(null);
  const [keywordTextEditValue, setKeywordTextEditValue] = useState<string>("");
  const [keywordTextEditLoading, setKeywordTextEditLoading] = useState(false);

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
      setPendingChange({
        id: negativeKeywordId,
        criterionId,
        field: "status",
        newValue: newStatusUpper,
        oldValue: oldStatus,
      });
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
      setPendingChange({
        id: negativeKeywordId,
        criterionId,
        field: "match_type",
        newValue: newMatchTypeUpper,
        oldValue: oldMatchType,
      });
    }
    setEditingNegativeKeywordId(null);
    setEditingField(null);
    setEditingMatchType("");
  };

  const confirmChange = async () => {
    if (!pendingChange) return;

    setUpdatingNegativeKeywordId(pendingChange.id);
    try {
      if (pendingChange.field === "status" && onUpdateNegativeKeywordStatus) {
        await onUpdateNegativeKeywordStatus(
          pendingChange.criterionId,
          pendingChange.newValue
        );
      } else if (
        pendingChange.field === "match_type" &&
        onUpdateNegativeKeywordMatchType
      ) {
        await onUpdateNegativeKeywordMatchType(
          pendingChange.criterionId,
          pendingChange.newValue
        );
      } else if (
        pendingChange.field === "keyword_text" &&
        onUpdateNegativeKeywordText
      ) {
        await onUpdateNegativeKeywordText(
          pendingChange.criterionId,
          pendingChange.newValue
        );
      }
      setPendingChange(null);
    } catch (error) {
      console.error("Failed to update negative keyword:", error);
      alert(
        `Failed to update negative keyword ${pendingChange.field}. Please try again.`
      );
    } finally {
      setUpdatingNegativeKeywordId(null);
    }
  };

  const cancelChange = () => {
    setPendingChange(null);
    setEditingNegativeKeywordId(null);
    setEditingField(null);
    setEditingStatus("");
    setEditingMatchType("");
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
          <Button
            onClick={onSync}
            disabled={syncing}
            className="create-entity-button disabled:opacity-50"
          >
            {syncing ? (
              <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                <Loader size="sm" variant="white" showMessage={false} className="!flex-row" />
                Syncing...
              </span>
            ) : (
              <span className="text-[10.64px] text-white font-normal">
                Sync Negative Keywords
              </span>
            )}
          </Button>
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
                  <th
                    className="table-header cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("match_type")}
                  >
                    <div className="flex items-center gap-1">
                      Match Type
                      {getSortIcon("match_type", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("level")}
                  >
                    <div className="flex items-center gap-1">
                      Level
                      {getSortIcon("level", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden lg:table-cell">
                    Ad Group
                  </th>
                  <th
                    className="table-header cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      State
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {negativeKeywords.map((negativeKeyword, index) => {
                  const isLastRow = index === negativeKeywords.length - 1;
                  return (
                    <tr
                      key={negativeKeyword.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
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
                        {updatingNegativeKeywordId === negativeKeyword.id &&
                        pendingChange?.field === "keyword_text" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {pendingChange.newValue}
                            </span>
                            <Loader size="sm" showMessage={false} />
                          </div>
                        ) : pendingChange?.id === negativeKeyword.id &&
                          pendingChange?.field === "keyword_text" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {pendingChange.newValue}
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
                        ) : (
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
                        )}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingNegativeKeywordId === negativeKeyword.id &&
                        pendingChange?.field === "match_type" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {pendingChange.newValue}
                            </span>
                            <Loader size="sm" showMessage={false} />
                          </div>
                        ) : pendingChange?.id === negativeKeyword.id &&
                          pendingChange?.field === "match_type" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {pendingChange.newValue}
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
                        ) : editingNegativeKeywordId === negativeKeyword.id &&
                          editingField === "match_type" &&
                          onUpdateNegativeKeywordMatchType ? (
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
                            onClose={() => {
                              setEditingNegativeKeywordId(null);
                              setEditingField(null);
                              setEditingMatchType("");
                            }}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-40"
                          />
                        ) : (
                          <span
                            className={`table-text leading-[1.26] ${
                              onUpdateNegativeKeywordMatchType
                                ? "cursor-pointer hover:underline"
                                : ""
                            }`}
                            onClick={() =>
                              onUpdateNegativeKeywordMatchType &&
                              handleMatchTypeClick(negativeKeyword)
                            }
                          >
                            {negativeKeyword.match_type || "—"}
                          </span>
                        )}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {negativeKeyword.level === "campaign"
                            ? "Campaign"
                            : "Ad Group"}
                        </span>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26]">
                          {negativeKeyword.adgroup_name ||
                            (negativeKeyword.level === "campaign" ? "—" : "—")}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingNegativeKeywordId === negativeKeyword.id &&
                        pendingChange?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={pendingChange.newValue} />
                            <Loader size="sm" showMessage={false} />
                          </div>
                        ) : pendingChange?.id === negativeKeyword.id &&
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
                        ) : editingNegativeKeywordId === negativeKeyword.id &&
                          editingField === "status" &&
                          onUpdateNegativeKeywordStatus ? (
                          <Dropdown
                            key={`status-${negativeKeyword.id}-${editingNegativeKeywordId}`}
                            options={[
                              { value: "ENABLED", label: "Enabled" },
                              { value: "PAUSED", label: "Paused" },
                              { value: "REMOVED", label: "Removed" },
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
                            onClose={() => {
                              setEditingNegativeKeywordId(null);
                              setEditingField(null);
                              setEditingStatus("");
                            }}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-32"
                          />
                        ) : (
                          <div
                            className={
                              onUpdateNegativeKeywordStatus
                                ? "cursor-pointer hover:underline"
                                : ""
                            }
                            onClick={() =>
                              onUpdateNegativeKeywordStatus &&
                              handleStatusClick(negativeKeyword)
                            }
                          >
                            {negativeKeyword.status && (
                              <StatusBadge status={negativeKeyword.status} />
                            )}
                          </div>
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
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  );
};
