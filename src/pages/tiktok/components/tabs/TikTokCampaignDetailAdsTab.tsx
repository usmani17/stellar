import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import { useState, useRef, useEffect } from "react";
import { Dropdown } from "../../../../components/ui/Dropdown";
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
    // Inline Edit State
    const [editingCell, setEditingCell] = useState<{
        ad_id: string;
        field: "ad_name" | "operation_status";
    } | null>(null);
    const [editedValue, setEditedValue] = useState("");
    const [inlineEditLoading, setInlineEditLoading] = useState(false);
    const [showInlineEditConfirm, setShowInlineEditConfirm] = useState(false);
    const [pendingInlineEdit, setPendingInlineEdit] = useState<{
        ad: TikTokAd;
        field: "ad_name" | "operation_status";
        newValue: string;
    } | null>(null);

    // Bulk Actions State
    const [showBulkActions, setShowBulkActions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isStartingEditRef = useRef(false);
    const [isCancelling, setIsCancelling] = useState(false);

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

    // Click outside handler for inline editing
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isStartingEditRef.current) return;

            if (editingCell && !showInlineEditConfirm) {
                const target = event.target as HTMLElement;
                const isDropdownContainer = target.closest(".dropdown-container");
                const isDropdownMenu =
                    target.closest('[class*="z-50"]') ||
                    target.closest('[class*="z-[100000]"]') ||
                    target.closest('[class*="shadow-lg"]');
                const isInput = target.closest("input");
                const isModal = target.closest('[class*="fixed"]');

                if (!isInput && !isDropdownMenu && !isModal && !isDropdownContainer) {
                    setTimeout(() => {
                        if (editingCell && !showInlineEditConfirm && !isStartingEditRef.current) {
                            cancelInlineEdit();
                        }
                    }, 150);
                }
            }
        };

        if (editingCell && !showInlineEditConfirm) {
            const timeout = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 300);

            return () => {
                clearTimeout(timeout);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [editingCell, showInlineEditConfirm]);

    // Bulk Action Handler
    const handleBulkAction = async (action: "ENABLE" | "DISABLE" | "DELETE") => {
        if (!accountId || selectedAdIds.size === 0) return;

        if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} details for ${selectedAdIds.size} ads?`)) {
            return;
        }

        try {
            await campaignsService.updateTikTokAdStatus(accountId, {
                ad_ids: Array.from(selectedAdIds),
                operation_status: action,
            });

            onAdsUpdated();
            onSelectAll(false); // Clear selection
        } catch (error) {
            console.error(`Bulk ${action} failed:`, error);
            alert(`Failed to ${action.toLowerCase()} ads`);
        } finally {
            setShowBulkActions(false);
        }
    };

    // Inline Edit Handlers
    const startInlineEdit = (ad: TikTokAd, field: "ad_name" | "operation_status") => {
        isStartingEditRef.current = true;
        setEditingCell({ ad_id: ad.ad_id, field });
        setEditedValue(field === "ad_name" ? ad.ad_name : ad.operation_status);

        setTimeout(() => {
            isStartingEditRef.current = false;
        }, 300);
    };

    const cancelInlineEdit = () => {
        setIsCancelling(true);
        setEditingCell(null);
        setEditedValue("");
        setPendingInlineEdit(null);
        setTimeout(() => {
            setIsCancelling(false);
        }, 100);
    };

    const handleInlineEditChange = (value: string) => {
        setEditedValue(value);
    };

    const confirmInlineEdit = (newValueOverride?: string) => {
        if (!editingCell || isCancelling) return;

        const ad = ads.find(a => a.ad_id === editingCell.ad_id);
        if (!ad) return;

        const valueToSave = newValueOverride !== undefined ? newValueOverride : editedValue;

        // Check if value actually changed
        const currentValue = editingCell.field === "ad_name" ? ad.ad_name : ad.operation_status;
        if (valueToSave === currentValue) {
            cancelInlineEdit();
            return;
        }

        setPendingInlineEdit({
            ad,
            field: editingCell.field,
            newValue: valueToSave,
        });
        setShowInlineEditConfirm(true);
    };

    const runInlineEdit = async () => {
        if (!pendingInlineEdit || !accountId) return;

        setInlineEditLoading(true);
        try {
            const payload: any = {};
            if (pendingInlineEdit.field === "ad_name") {
                payload.ad_name = pendingInlineEdit.newValue;
            } else if (pendingInlineEdit.field === "operation_status") {
                payload.operation_status = pendingInlineEdit.newValue;
            }

            await campaignsService.updateTikTokAd(accountId, pendingInlineEdit.ad.ad_id, payload);

            onAdsUpdated();
        } catch (error) {
            console.error("Inline update failed:", error);
            alert("Failed to update ad");
        } finally {
            setInlineEditLoading(false);
            setShowInlineEditConfirm(false);
            cancelInlineEdit();
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("en-US").format(value);
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return (
                <svg
                    className="w-4 h-4 ml-1 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                </svg>
            );
        }
        return sortOrder === "asc" ? (
            <svg
                className="w-4 h-4 ml-1 text-[#136D6D]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                />
            </svg>
        ) : (
            <svg
                className="w-4 h-4 ml-1 text-[#136D6D]"
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
        );
    };

    return (
        <>
            {/* Header Actions (Filter/Sync) */}
            <div className="flex items-center justify-end mb-4 gap-3">
                {onToggleCreateAdPanel && adgroupId && (
                    <button
                        onClick={onToggleCreateAdPanel}
                        className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] hover:!text-white transition-colors"
                    >
                        <svg className="w-5 h-5 !text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
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
                        className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal"
                    >
                        <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span className="text-[10.64px] text-[#072929] font-normal">Edit</span>
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
                    className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                                                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className="text-[13.3px] text-[#0b0f16] font-medium cursor-pointer hover:underline truncate block w-full whitespace-nowrap"
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
                                                            buttonClassName="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
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
                                            <td className="table-cell text-[13.3px] text-[#0b0f16]">
                                                {formatCurrency(item.spend)}
                                            </td>
                                            <td className="table-cell text-[13.3px] text-[#0b0f16]">
                                                {formatNumber(item.impressions)}
                                            </td>
                                            <td className="table-cell text-[13.3px] text-[#0b0f16]">
                                                {formatNumber(item.clicks)}
                                            </td>
                                            <td className="table-cell text-[13.3px] text-[#0b0f16]">
                                                {formatNumber(item.conversions)}
                                            </td>
                                            <td className="table-cell text-[13.3px] text-[#0b0f16]">
                                                {formatPercentage(item.ctr)}
                                            </td>
                                            <td className="table-cell text-[13.3px] text-[#0b0f16]">
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

            {/* Inline Edit Confirmation Modal */}
            {showInlineEditConfirm && pendingInlineEdit && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !inlineEditLoading) {
                            setShowInlineEditConfirm(false);
                            setPendingInlineEdit(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            Confirm {pendingInlineEdit.field === "ad_name" ? "Name" : "Status"} Change
                        </h3>
                        <div className="mb-4">
                            <p className="text-[12.16px] text-[#556179] mb-2">
                                Ad: <span className="font-semibold text-[#072929]">{pendingInlineEdit.ad.ad_name}</span>
                            </p>
                            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12.16px] text-[#556179]">
                                        {pendingInlineEdit.field === "ad_name" ? "Name" : "Status"}:
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12.16px] text-[#556179]">
                                            {pendingInlineEdit.field === "operation_status"
                                                ? (pendingInlineEdit.ad.operation_status === "ENABLE" ? "Enable" : "Pause")
                                                : pendingInlineEdit.ad.ad_name}
                                        </span>
                                        <span className="text-[12.16px] text-[#556179]">→</span>
                                        <span className="text-[12.16px] font-semibold text-[#072929]">
                                            {pendingInlineEdit.field === "operation_status"
                                                ? (pendingInlineEdit.newValue === "ENABLE" ? "Enable" : (pendingInlineEdit.newValue === "DELETE" ? "Delete" : "Pause"))
                                                : pendingInlineEdit.newValue}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {pendingInlineEdit.newValue === "DELETE" && (
                                <p className="mt-3 text-[11px] text-red-600 italic">
                                    * This action cannot be undone.
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowInlineEditConfirm(false)}
                                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runInlineEdit}
                                disabled={inlineEditLoading}
                                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {inlineEditLoading ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
