import React, { useState, useRef, useEffect } from "react";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import { TikTokAdTable } from "./TikTokAdTable";
import { campaignsService } from "../../../../services/campaigns";
import { CreateTikTokAdPanel, type TikTokAdInput, type AdGroupOption } from "../../../../components/tiktok/CreateTikTokAdPanel";
import type { TikTokAd } from "./types";

interface TikTokCampaignDetailAdsTabProps {
    ads: TikTokAd[];
    loading: boolean;
    selectedAdIds: Set<string>;
    onSelectAll: (checked: boolean) => void;
    onSelectAd: (id: string, checked: boolean) => void;
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSort: (column: string) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    // Filter/Sync
    isFilterPanelOpen: boolean;
    onToggleFilterPanel: () => void;
    filters: FilterValues;
    onApplyFilters: (filters: FilterValues) => void;
    syncing?: boolean;
    onSync?: () => void;
    // Create Ad Panel
    isCreateAdPanelOpen?: boolean;
    onToggleCreateAdPanel?: () => void;
    adgroupId?: string;
    adgroups?: AdGroupOption[];
    onAdGroupChange?: (id: string) => void;
    onCreateAd?: (data: TikTokAdInput) => void;
    createAdLoading?: boolean;
    createAdError?: string | null;
    accountId: number;
    onAdsUpdated: () => void;
}

export const TikTokCampaignDetailAdsTab: React.FC<TikTokCampaignDetailAdsTabProps> = ({
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
    isCreateAdPanelOpen,
    onToggleCreateAdPanel,
    adgroupId,
    adgroups,
    onAdGroupChange,
    onCreateAd,
    createAdLoading,
    createAdError,
    accountId,
    onAdsUpdated,
}) => {
    // Bulk Actions State
    const [showBulkActions, setShowBulkActions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Bulk Status Confirmation Modal State
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
    const [pendingBulkAction, setPendingBulkAction] = useState<"ENABLE" | "DISABLE" | "DELETE" | null>(null);

    // Click outside handler for bulk actions dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

    // Bulk Action Handler - Now opens confirmation modal
    const handleBulkAction = (action: "ENABLE" | "DISABLE" | "DELETE") => {
        if (!accountId || selectedAdIds.size === 0) return;
        setShowBulkActions(false);
        setPendingBulkAction(action);
        setShowBulkStatusModal(true);
    };

    // Execute bulk action after modal confirmation
    const handleBulkActionConfirm = async () => {
        if (!accountId || !pendingBulkAction || selectedAdIds.size === 0) return;

        setBulkActionLoading(true);
        try {
            await campaignsService.updateTikTokAdStatus(accountId, {
                ad_ids: Array.from(selectedAdIds),
                operation_status: pendingBulkAction,
            });

            onAdsUpdated();
            onSelectAll(false); // Clear selection
            setShowBulkStatusModal(false);
            setPendingBulkAction(null);
        } catch (error) {
            console.error(`Bulk ${pendingBulkAction} failed:`, error);
            alert(`Failed to ${pendingBulkAction.toLowerCase()} ads`);
        } finally {
            setBulkActionLoading(false);
        }
    };

    return (
        <>
            {/* Header Actions (Filter/Sync) */}
            <div className="flex items-center justify-end mb-4 gap-3">
                {onToggleCreateAdPanel && adgroupId && (
                    <button
                        onClick={onToggleCreateAdPanel}
                        className="create-entity-button"
                    >
                        <span className="text-[10.64px] text-white font-normal">Create Ad</span>
                        <svg
                            className={`w-4 h-4 !text-white transition-transform ${isCreateAdPanelOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}

                {/* Bulk Actions Dropdown */}
                <div className="relative inline-flex" ref={dropdownRef}>
                    <button
                        onClick={() => setShowBulkActions(!showBulkActions)}
                        className="edit-button"
                    >
                        <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span className="text-[10.64px] text-[#072929] font-normal">Bulk Actions</span>
                    </button>
                    {showBulkActions && (
                        <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                            <div className="overflow-y-auto">
                                {['ENABLE', 'DISABLE', 'DELETE'].map((action) => (
                                    <button
                                        key={action}
                                        className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer capitalize"
                                        disabled={selectedAdIds.size === 0}
                                        onClick={() => handleBulkAction(action as "ENABLE" | "DISABLE" | "DELETE")}
                                    >
                                        {action.toLowerCase()}
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
                    <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-[10.64px] text-[#072929] font-normal">Add Filter</span>
                    <svg
                        className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {onSync && (
                    <button
                        onClick={onSync}
                        disabled={syncing}
                        className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 text-[10.64px] font-semibold"
                    >
                        {syncing ? "Syncing..." : "Sync Ads"}
                    </button>
                )}
            </div>

            {/* Create Ad Panel */}
            {isCreateAdPanelOpen && adgroupId && onCreateAd && (
                <div className="mb-4">
                    <CreateTikTokAdPanel
                        isOpen={isCreateAdPanelOpen}
                        onClose={onToggleCreateAdPanel!}
                        onSubmit={onCreateAd}
                        adgroupId={adgroupId}
                        adgroups={adgroups}
                        onAdGroupChange={onAdGroupChange}
                        loading={createAdLoading}
                        submitError={createAdError}
                    />
                </div>
            )}

            {/* Filter Panel */}
            {isFilterPanelOpen && (
                <div className="mb-4">
                    <FilterPanel
                        isOpen={true}
                        onClose={onToggleFilterPanel}
                        onApply={onApplyFilters}
                        initialFilters={filters}
                        filterFields={[
                            { value: "ad_name", label: "Ad Name" },
                            { value: "state", label: "Status" },
                        ]}
                    />
                </div>
            )}

            {/* Table */}
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    {loading ? (
                        <div className="text-center py-8 text-[#556179] text-[13.3px]">Loading ads...</div>
                    ) : ads.length === 0 ? (
                        <div className="text-center py-8 text-[#556179] text-[13.3px]">No ads found</div>
                    ) : (
                        <table className="w-full min-w-[1200px]">
                            <thead className="bg-[#f5f5f0]">
                                <tr className="border-b border-[#e8e8e3]">
                                    <th className="table-header w-[35px]">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={ads.length > 0 && ads.every(ad => selectedAdIds.has(ad.ad_id))}
                                                onChange={onSelectAll}
                                            />
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("ad_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Name {getSortIcon("ad_name")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("operation_status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status {getSortIcon("operation_status")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("spend")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Spend {getSortIcon("spend")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("impressions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Impressions {getSortIcon("impressions")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("clicks")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Clicks {getSortIcon("clicks")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("conversions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Conversions {getSortIcon("conversions")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("ctr")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CTR {getSortIcon("ctr")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left table-cell text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("cpc")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CPC {getSortIcon("cpc")}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {ads.map((item, index) => {
                                    const isLastRow = index === ads.length - 1;
                                    const isSelected = selectedAdIds.has(item.ad_id);
                                    return (
                                        <tr
                                            key={item.ad_id}
                                            className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""} ${isSelected ? "bg-gray-50" : ""}`}
                                        >
                                            <td className="table-cell">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(checked) => onSelectAd(item.ad_id, checked)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                {editingCell?.ad_id === item.ad_id && editingCell?.field === "ad_name" ? (
                                                    <input
                                                        type="text"
                                                        value={editedValue}
                                                        onChange={(e) => handleInlineEditChange(e.target.value)}
                                                        onBlur={(e) => {
                                                            if (isCancelling) return;
                                                            confirmInlineEdit(e.target.value);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.currentTarget.blur();
                                                            } else if (e.key === "Escape") {
                                                                cancelInlineEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                        maxLength={512}
                                                        className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className="table-text font-medium cursor-pointer hover:underline truncate block w-full whitespace-nowrap"
                                                        onClick={() => startInlineEdit(item, "ad_name")}
                                                        title={item.ad_name}
                                                    >
                                                        {item.ad_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                {editingCell?.ad_id === item.ad_id && editingCell?.field === "operation_status" ? (
                                                    <div className="dropdown-container w-[100px]">
                                                        <Dropdown
                                                            options={[
                                                                { value: "ENABLE", label: "Enable" },
                                                                { value: "DISABLE", label: "Disable" },
                                                                { value: "DELETE", label: "Delete" },
                                                            ]}
                                                            value={editedValue}
                                                            onChange={(value) => {
                                                                handleInlineEditChange(value);
                                                                confirmInlineEdit(value);
                                                            }}
                                                            onClose={cancelInlineEdit}
                                                            defaultOpen={true}
                                                            closeOnSelect={true}
                                                            buttonClassName="edit-button"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="cursor-pointer hover:underline"
                                                        onClick={() => startInlineEdit(item, "operation_status")}
                                                    >
                                                        <StatusBadge status={item.operation_status} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="table-cell table-text">
                                                {formatCurrency(item.spend)}
                                            </td>
                                            <td className="table-cell table-text">
                                                {formatNumber(item.impressions)}
                                            </td>
                                            <td className="table-cell table-text">
                                                {formatNumber(item.clicks)}
                                            </td>
                                            <td className="table-cell table-text">
                                                {formatNumber(item.conversions)}
                                            </td>
                                            <td className="table-cell table-text">
                                                {formatPercentage(item.ctr)}
                                            </td>
                                            <td className="table-cell table-text">
                                                {formatCurrency(item.cpc)}
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
            {!loading && ads.length > 0 && totalPages > 0 && (
                <div className="flex items-center justify-end mt-4">
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                            Previous
                        </button>
                        {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (
                                    currentPage >= totalPages - 2
                                ) {
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
                            }
                        )}
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
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}


            {/* Bulk Status Confirmation Modal */}
            {showBulkStatusModal && pendingBulkAction && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !bulkActionLoading) {
                            setShowBulkStatusModal(false);
                            setPendingBulkAction(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            Confirm Status Change
                        </h3>

                        {/* Summary */}
                        <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[12.16px] text-[#556179]">
                                    {selectedAdIds.size} ad{selectedAdIds.size !== 1 ? "s" : ""} will be updated:
                                </span>
                                <span className="text-[12.16px] font-semibold text-[#072929]">
                                    {pendingBulkAction === "ENABLE"
                                        ? "Enable"
                                        : pendingBulkAction === "DISABLE"
                                            ? "Pause"
                                            : "Delete"}
                                </span>
                            </div>
                        </div>

                        {/* Ad Preview Table */}
                        {(() => {
                            const selectedAdsData = ads.filter(ad => selectedAdIds.has(ad.ad_id));
                            const previewCount = Math.min(10, selectedAdsData.length);
                            const hasMore = selectedAdsData.length > 10;

                            return (
                                <div className="mb-6">
                                    <div className="mb-2">
                                        <span className="text-[10.64px] text-[#556179]">
                                            {hasMore
                                                ? `Showing ${previewCount} of ${selectedAdsData.length} selected ads`
                                                : `${selectedAdsData.length} ad${selectedAdsData.length !== 1 ? "s" : ""} selected`}
                                        </span>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-sandstorm-s20">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                                        Ad Name
                                                    </th>
                                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                                        Old Status
                                                    </th>
                                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                                        New Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedAdsData.slice(0, 10).map((ad) => {
                                                    const oldStatus = ad.operation_status || "ENABLE";
                                                    const oldStatusDisplay =
                                                        oldStatus === "ENABLE"
                                                            ? "Enable"
                                                            : oldStatus === "DISABLE"
                                                                ? "Pause"
                                                                : oldStatus;
                                                    const newStatusDisplay =
                                                        pendingBulkAction === "ENABLE"
                                                            ? "Enable"
                                                            : pendingBulkAction === "DISABLE"
                                                                ? "Pause"
                                                                : "Delete";

                                                    return (
                                                        <tr
                                                            key={ad.ad_id}
                                                            className="border-b border-gray-200 last:border-b-0"
                                                        >
                                                            <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                                                {ad.ad_name || "Unnamed Ad"}
                                                            </td>
                                                            <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                                                {oldStatusDisplay}
                                                            </td>
                                                            <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                                                {newStatusDisplay}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {pendingBulkAction === "DELETE" && (
                            <p className="mb-4 text-[11px] text-red-600 italic">
                                * Deleting ads cannot be undone. Deleted ads will stop serving immediately.
                            </p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBulkStatusModal(false);
                                    setPendingBulkAction(null);
                                }}
                                disabled={bulkActionLoading}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkActionConfirm}
                                disabled={bulkActionLoading}
                                className={`create-entity-button btn-sm ${pendingBulkAction === "DELETE"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-[#136D6D] hover:bg-[#0e5a5a]"
                                    }`}
                            >
                                {bulkActionLoading ? "Applying..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
