import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Button } from "../../../../components/ui";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import type { GoogleAd } from "./GoogleTypes";

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
  onSync,
  syncingAnalytics,
  onSyncAnalytics,
  syncMessage,
  onRefresh,
  getSortIcon,
  onUpdateAdStatus,
}) => {
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [pendingChange, setPendingChange] = useState<{
    id: number;
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [updatingAdId, setUpdatingAdId] = useState<number | null>(null);

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
      setPendingChange({
        id: adId,
        newValue: newStatusUpper,
        oldValue: oldStatus,
      });
    }
    setEditingAdId(null);
    setEditingStatus("");
  };

  const confirmChange = async () => {
    if (!pendingChange || !onUpdateAdStatus) return;

    setUpdatingAdId(pendingChange.id);
    try {
      await onUpdateAdStatus(pendingChange.id, pendingChange.newValue);
      setPendingChange(null);
    } catch (error) {
      console.error("Failed to update ad status:", error);
      alert("Failed to update ad status. Please try again.");
    } finally {
      setUpdatingAdId(null);
    }
  };

  const cancelChange = () => {
    setPendingChange(null);
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
              <span className="text-[10.64px] text-white font-normal">Sync Ads</span>
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
                        checked={ads.length > 0 && ads.every((ad) => selectedAdIds.has(ad.id))}
                        onChange={onSelectAll}
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
                  <th className="table-header hidden lg:table-cell">
                    Headlines
                  </th>
                  <th className="table-header hidden lg:table-cell">
                    Final URLs
                  </th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad, index) => {
                  const isLastRow = index === ads.length - 1;
                  return (
                    <tr
                      key={ad.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedAdIds.has(ad.id)}
                            onChange={(checked) => onSelectAd(ad.id, checked)}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {ad.ad_type || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26]">
                          {ad.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {updatingAdId === ad.id && pendingChange ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={pendingChange.newValue} />
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                          </div>
                        ) : pendingChange?.id === ad.id ? (
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
                        ) : editingAdId === ad.id && onUpdateAdStatus ? (
                          <Dropdown
                            options={[
                              { value: "ENABLED", label: "Enabled" },
                              { value: "PAUSED", label: "Paused" },
                              { value: "REMOVED", label: "Removed" },
                            ]}
                            value={editingStatus}
                            onChange={(val) => handleStatusChange(ad.id, val as string)}
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="text-[13.3px] px-2 py-1"
                            width="w-32"
                          />
                        ) : (
                          <div
                            className={onUpdateAdStatus ? "cursor-pointer hover:underline" : ""}
                            onClick={() => onUpdateAdStatus && handleStatusClick(ad)}
                          >
                            {ad.status && <StatusBadge status={ad.status} />}
                          </div>
                        )}
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        {ad.headlines && Array.isArray(ad.headlines) && ad.headlines.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {ad.headlines.map((h: any, index: number) => (
                              <span key={index} className="table-text leading-[1.26] block">
                                {h.text || h}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="table-text leading-[1.26]">—</span>
                        )}
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26] truncate block max-w-[300px]">
                          {ad.final_urls && Array.isArray(ad.final_urls) && ad.final_urls.length > 0
                            ? ad.final_urls[0]
                            : "—"}
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
    </>
  );
};

