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
  onStartBidConfirmation?: (
    keyword: GoogleKeyword,
    oldBid: number,
    newBid: number
  ) => void;
  onStartFinalUrlEdit?: (keyword: GoogleKeyword) => void;
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
  onStartBidConfirmation,
  onStartFinalUrlEdit,
}) => {
  const [editingKeywordId, setEditingKeywordId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<
    "status" | "match_type" | "bid" | null
  >(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingMatchType, setEditingMatchType] = useState<string>("");
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

  const handleBidBlur = (keyword: GoogleKeyword) => {
    if (!onUpdateKeywordBid || !onStartBidConfirmation) return;

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
      onStartBidConfirmation(keyword, oldBid, bidValue);
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

  const handleMatchTypeClick = (keyword: GoogleKeyword) => {
    if (onUpdateKeywordMatchType) {
      setEditingKeywordId(keyword.id);
      setEditingField("match_type");
      // Normalize match type to match dropdown options
      const currentMatchType = (keyword.match_type || "BROAD").toUpperCase();
      setEditingMatchType(currentMatchType);
    }
  };

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
      } else if (
        pendingChange.field === "match_type" &&
        onUpdateKeywordMatchType
      ) {
        await onUpdateKeywordMatchType(
          pendingChange.id,
          pendingChange.newValue
        );
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
    setEditingMatchType("");
    setEditingBid("");
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
            className="create-entity-button disabled:opacity-50"
          >
            {syncing ? (
              <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Syncing...
              </span>
            ) : (
              <span className="text-[10.64px] text-white font-normal">
                Sync Keywords
              </span>
            )}
          </Button>
          {onSyncAnalytics && (
            <Button
              onClick={onSyncAnalytics}
              disabled={syncing || syncingAnalytics}
              className="create-entity-button disabled:opacity-50"
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
                  <th className="table-header w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          keywords.length > 0 &&
                          keywords.every((kw) => selectedKeywordIds.has(kw.id))
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
                  <th
                    className="table-header cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("cpc_bid_dollars")}
                  >
                    <div className="flex items-center gap-1">
                      Max. CPC
                      {getSortIcon("cpc_bid_dollars", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden lg:table-cell">
                    Final URL
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
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedKeywordIds.has(keyword.id)}
                            onChange={(checked) =>
                              onSelectKeyword(keyword.id, checked)
                            }
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
                          className={`table-text leading-[1.26] ${
                            onStartKeywordTextEdit
                              ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                              : ""
                          }`}
                        >
                          {keyword.keyword_text || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingKeywordId === keyword.id &&
                        pendingChange?.field === "match_type" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              {pendingChange.newValue}
                            </span>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : pendingChange?.id === keyword.id &&
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
                        ) : editingKeywordId === keyword.id &&
                          editingField === "match_type" &&
                          onUpdateKeywordMatchType ? (
                          <Dropdown
                            options={[
                              { value: "EXACT", label: "Exact match" },
                              { value: "PHRASE", label: "Phrase match" },
                              { value: "BROAD", label: "Broad match" },
                            ]}
                            value={editingMatchType}
                            onChange={(val) =>
                              handleMatchTypeChange(keyword.id, val as string)
                            }
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-40"
                          />
                        ) : (
                          <span
                            className={`table-text leading-[1.26] ${
                              onUpdateKeywordMatchType
                                ? "cursor-pointer hover:underline"
                                : ""
                            }`}
                            onClick={() =>
                              onUpdateKeywordMatchType &&
                              handleMatchTypeClick(keyword)
                            }
                          >
                            {keyword.match_type || "—"}
                          </span>
                        )}
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingKeywordId === keyword.id &&
                        pendingChange?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={pendingChange.newValue} />
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
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
                          onUpdateKeywordStatus ? (
                          <Dropdown
                            options={[
                              { value: "ENABLED", label: "Enabled" },
                              { value: "PAUSED", label: "Paused" },
                              { value: "REMOVED", label: "Removed" },
                            ]}
                            value={editingStatus}
                            onChange={(val) =>
                              handleStatusChange(keyword.id, val as string)
                            }
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-32"
                          />
                        ) : (
                          <div
                            className={
                              onUpdateKeywordStatus
                                ? "cursor-pointer hover:underline"
                                : ""
                            }
                            onClick={() =>
                              onUpdateKeywordStatus &&
                              handleStatusClick(keyword)
                            }
                          >
                            {keyword.status && (
                              <StatusBadge status={keyword.status} />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingKeywordId === keyword.id &&
                        pendingChange?.field === "bid" ? (
                          <div className="flex items-center gap-2">
                            <span className="table-text leading-[1.26]">
                              ${parseFloat(pendingChange.newValue).toFixed(2)}
                            </span>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : editingKeywordId === keyword.id &&
                          editingField === "bid" &&
                          onUpdateKeywordBid ? (
                          <div className="flex items-center">
                            <span className="table-text mr-1">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingBid}
                              onChange={(e) => setEditingBid(e.target.value)}
                              onBlur={() => handleBidBlur(keyword)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                } else if (e.key === "Escape") {
                                  setEditingKeywordId(null);
                                  setEditingField(null);
                                  setEditingBid("");
                                }
                              }}
                              autoFocus
                              className="w-24 px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
                            />
                          </div>
                        ) : (
                          <span
                            onClick={() =>
                              onUpdateKeywordBid && handleBidClick(keyword)
                            }
                            className={`table-text leading-[1.26] ${
                              onUpdateKeywordBid
                                ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                : ""
                            }`}
                          >
                            ${keyword.cpc_bid_dollars?.toFixed(2) || "0.00"}
                          </span>
                        )}
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
                                        ? `${urlsArray[0]} (+${
                                            urlsArray.length - 1
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
                                        ? `${mobileUrlsArray[0]} (+${
                                            mobileUrlsArray.length - 1
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
