import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Button } from "../../../../components/ui";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import type { GoogleKeyword } from "./types";

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
  syncing: boolean;
  onSync: () => void;
  syncingAnalytics?: boolean;
  onSyncAnalytics?: () => void;
  syncMessage: string | null;
  getSortIcon: (column: string, currentSortBy: string, currentSortOrder: "asc" | "desc") => React.ReactNode;
  onUpdateKeywordStatus?: (keywordId: number, status: string) => Promise<void>;
  onUpdateKeywordBid?: (keywordId: number, bid: number) => Promise<void>;
  onUpdateKeywordMatchType?: (keywordId: number, matchType: string) => Promise<void>;
}

export const GoogleCampaignDetailKeywordsTab: React.FC<GoogleCampaignDetailKeywordsTabProps> = ({
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
  syncing,
  onSync,
  syncingAnalytics,
  onSyncAnalytics,
  syncMessage,
  getSortIcon,
  onUpdateKeywordStatus,
  onUpdateKeywordBid,
  onUpdateKeywordMatchType,
}) => {
  const [editingKeywordId, setEditingKeywordId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"status" | "bid" | "match_type" | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingBid, setEditingBid] = useState<string>("");
  const [editingMatchType, setEditingMatchType] = useState<string>("");
  const [pendingChange, setPendingChange] = useState<{
    id: number;
    field: "status" | "bid" | "match_type";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [updatingKeywordId, setUpdatingKeywordId] = useState<number | null>(null);

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
      setEditingBid((keyword.cpc_bid_dollars || 0).toString());
    }
  };

  const handleMatchTypeClick = (keyword: GoogleKeyword) => {
    if (onUpdateKeywordMatchType) {
      setEditingKeywordId(keyword.id);
      setEditingField("match_type");
      // Normalize match type to match dropdown options
      const currentMatchType = (keyword.match_type || "BROAD").toUpperCase();
      setEditingMatchType(currentMatchType);
    }
  };

  const handleStatusChange = (keywordId: number, newStatus: string) => {
    const keyword = keywords.find((k) => k.id === keywordId);
    if (!keyword) return;

    const oldStatus = (keyword.status || "ENABLED").toUpperCase();
    const newStatusUpper = newStatus.toUpperCase();

    if (newStatusUpper !== oldStatus) {
      setPendingChange({
        id: keywordId,
        field: "status",
        newValue: newStatusUpper,
        oldValue: oldStatus,
      });
    }
      setEditingKeywordId(null);
      setEditingField(null);
      setEditingStatus("");
  };

  const handleBidChange = (keywordId: number, newBid: string) => {
    const keyword = keywords.find((k) => k.id === keywordId);
    if (!keyword) return;

    const bidValue = parseFloat(newBid);
    const oldBid = (keyword.cpc_bid_dollars || 0).toString();

    if (!isNaN(bidValue) && bidValue >= 0 && newBid !== oldBid && newBid !== "") {
      setPendingChange({
        id: keywordId,
        field: "bid",
        newValue: newBid,
        oldValue: oldBid,
      });
    }
        setEditingKeywordId(null);
        setEditingField(null);
        setEditingBid("");
  };

  const handleMatchTypeChange = (keywordId: number, newMatchType: string) => {
    const keyword = keywords.find((k) => k.id === keywordId);
    if (!keyword) return;

    const oldMatchType = (keyword.match_type || "BROAD").toUpperCase();
    const newMatchTypeUpper = newMatchType.toUpperCase();

    if (newMatchTypeUpper !== oldMatchType) {
      setPendingChange({
        id: keywordId,
        field: "match_type",
        newValue: newMatchTypeUpper,
        oldValue: oldMatchType,
      });
    }
    setEditingKeywordId(null);
    setEditingField(null);
    setEditingMatchType("");
  };

  const confirmChange = async () => {
    if (!pendingChange) return;

    setUpdatingKeywordId(pendingChange.id);
    try {
      if (pendingChange.field === "status" && onUpdateKeywordStatus) {
        await onUpdateKeywordStatus(pendingChange.id, pendingChange.newValue);
      } else if (pendingChange.field === "bid" && onUpdateKeywordBid) {
        const bidValue = parseFloat(pendingChange.newValue);
        if (!isNaN(bidValue)) {
          await onUpdateKeywordBid(pendingChange.id, bidValue);
        }
      } else if (pendingChange.field === "match_type" && onUpdateKeywordMatchType) {
        await onUpdateKeywordMatchType(pendingChange.id, pendingChange.newValue);
      }
      setPendingChange(null);
    } catch (error) {
      console.error("Failed to update keyword:", error);
      alert(`Failed to update keyword ${pendingChange.field}. Please try again.`);
    } finally {
      setUpdatingKeywordId(null);
    }
  };

  const cancelChange = () => {
    setPendingChange(null);
      setEditingKeywordId(null);
      setEditingField(null);
    setEditingStatus("");
      setEditingBid("");
      setEditingMatchType("");
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
          Keywords
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
              <span className="text-[10.64px] text-white font-normal">Sync Keywords</span>
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
                <span className="text-[10.64px] text-white font-normal">Sync Analytics</span>
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
              { value: "name", label: "Keyword" },
              { value: "type", label: "Match Type" },
              { value: "status", label: "Status" },
              { value: "adgroup_name", label: "Ad Group Name" },
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
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={keywords.length > 0 && keywords.every((kw) => selectedKeywordIds.has(kw.id))}
                        onChange={onSelectAll}
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("keyword_text")}
                  >
                    <div className="flex items-center gap-1">
                      Keyword
                      {getSortIcon("keyword_text", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("match_type")}
                  >
                    <div className="flex items-center gap-1">
                      Match Type
                      {getSortIcon("match_type", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden lg:table-cell">
                    Ad Group
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("cpc_bid_dollars")}
                  >
                    <div className="flex items-center gap-1">
                      CPC Bid
                      {getSortIcon("cpc_bid_dollars", sortBy, sortOrder)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((keyword, index) => {
                  const isLastRow = index === keywords.length - 1;
                  return (
                    <tr
                      key={keyword.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="py-[10px] px-[10px]">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedKeywordIds.has(keyword.id)}
                            onChange={(checked) => onSelectKeyword(keyword.id, checked)}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {keyword.keyword_text || "—"}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        {updatingKeywordId === keyword.id && pendingChange?.field === "match_type" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {pendingChange.newValue}
                            </span>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : pendingChange?.id === keyword.id && pendingChange?.field === "match_type" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
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
                        ) : editingKeywordId === keyword.id && editingField === "match_type" && onUpdateKeywordMatchType ? (
                          <Dropdown
                            options={[
                              { value: "EXACT", label: "Exact match" },
                              { value: "PHRASE", label: "Phrase match" },
                              { value: "BROAD", label: "Broad match" },
                            ]}
                            value={editingMatchType}
                            onChange={(val) => handleMatchTypeChange(keyword.id, val as string)}
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-40"
                          />
                        ) : (
                          <span
                            className={`text-[13.3px] text-[#0b0f16] leading-[1.26] ${onUpdateKeywordMatchType ? "cursor-pointer hover:underline" : ""}`}
                            onClick={() => onUpdateKeywordMatchType && handleMatchTypeClick(keyword)}
                          >
                            {keyword.match_type || "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-[10px] px-[10px] hidden lg:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {keyword.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        {updatingKeywordId === keyword.id && pendingChange?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={pendingChange.newValue} />
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : pendingChange?.id === keyword.id && pendingChange?.field === "status" ? (
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
                        ) : editingKeywordId === keyword.id && editingField === "status" && onUpdateKeywordStatus ? (
                          <Dropdown
                            options={[
                              { value: "ENABLED", label: "Enabled" },
                              { value: "PAUSED", label: "Paused" },
                              { value: "REMOVED", label: "Removed" },
                            ]}
                            value={editingStatus}
                            onChange={(val) => handleStatusChange(keyword.id, val as string)}
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-32"
                          />
                        ) : (
                          <div
                            className={onUpdateKeywordStatus ? "cursor-pointer hover:underline" : ""}
                            onClick={() => onUpdateKeywordStatus && handleStatusClick(keyword)}
                          >
                            {keyword.status && <StatusBadge status={keyword.status} />}
                          </div>
                        )}
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        {updatingKeywordId === keyword.id && pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              ${parseFloat(pendingChange.newValue).toFixed(2)}
                            </span>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : pendingChange?.id === keyword.id && pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              ${parseFloat(pendingChange.newValue).toFixed(2)}
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
                        ) : editingKeywordId === keyword.id && editingField === "bid" && onUpdateKeywordBid ? (
                          <div className="flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingBid}
                            onChange={(e) => setEditingBid(e.target.value)}
                              onBlur={() => {
                                const inputValue = editingBid;
                                const oldValue = (keyword.cpc_bid_dollars || 0).toString();
                                if (inputValue === oldValue || inputValue === "") {
                                  cancelChange();
                                } else {
                                  handleBidChange(keyword.id, editingBid);
                                }
                              }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                  e.currentTarget.blur();
                              } else if (e.key === "Escape") {
                                  cancelChange();
                              }
                            }}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-24"
                            autoFocus
                          />
                          </div>
                        ) : (
                          <span
                            className={`text-[13.3px] text-[#0b0f16] leading-[1.26] ${onUpdateKeywordBid ? "cursor-pointer hover:underline" : ""}`}
                            onClick={() => onUpdateKeywordBid && handleBidClick(keyword)}
                          >
                            ${keyword.cpc_bid_dollars?.toFixed(2) || "0.00"}
                          </span>
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

