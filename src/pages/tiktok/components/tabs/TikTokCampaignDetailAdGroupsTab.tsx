import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { campaignsService } from "../../../../services/campaigns";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import { CreateTikTokAdGroupPanel } from "../../../../components/tiktok/CreateTikTokAdGroupPanel";
import { TikTokAdGroupTable } from "./TikTokAdGroupTable";

// Define interface locally or import if shared
export interface TikTokAdGroup {
    adgroup_id: string;
    adgroup_name: string;
    campaign_id?: string;
    campaign_name: string;
    operation_status: string;
    budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
}

interface TikTokCampaignDetailAdGroupsTabProps {
    adgroups: TikTokAdGroup[];
    loading: boolean;
    selectedAdGroupIds: Set<string>;
    onSelectAll: (checked: boolean) => void;
    onSelectAdGroup: (id: string, checked: boolean) => void;
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
    onRefresh?: () => void;
    campaignName?: string;
    objectiveType?: string;
}

export const TikTokCampaignDetailAdGroupsTab: React.FC<TikTokCampaignDetailAdGroupsTabProps> = ({
    adgroups,
    loading,
    selectedAdGroupIds,
    onSelectAll,
    onSelectAdGroup,
    sortBy,
    sortOrder,
    onSort,
    currentPage,
    totalPages,
    onPageChange,
    isFilterPanelOpen: externalIsFilterPanelOpen,
    onToggleFilterPanel,
    filters,
    onApplyFilters,
    syncing,
    onSync,
    onRefresh,
    campaignName,
    objectiveType,
}) => {
    const { accountId, campaignId } = useParams<{ accountId: string; campaignId: string }>();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(externalIsFilterPanelOpen);

    // Creation state
    const [createdAdGroups, setCreatedAdGroups] = useState<any[]>([]);
    const [failedAdGroupCount, setFailedAdGroupCount] = useState(0);
    const [failedAdGroups, setFailedAdGroups] = useState<any[]>([]);

    // Bulk edit state
    const [showBulkEditDropdown, setShowBulkEditDropdown] = useState(false);
    const [bulkEditLoading, setBulkEditLoading] = useState(false);
    const bulkEditDropdownRef = React.useRef<HTMLDivElement>(null);

    // Bulk status confirmation modal state
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
    const [pendingBulkStatusAction, setPendingBulkStatusAction] = useState<"ENABLE" | "DISABLE" | "DELETE" | null>(null);

    // Sync external filter panel state with internal state
    React.useEffect(() => {
        setIsFilterPanelOpen(externalIsFilterPanelOpen);
    }, [externalIsFilterPanelOpen]);

    // Close bulk edit dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                bulkEditDropdownRef.current &&
                !bulkEditDropdownRef.current.contains(event.target as Node)
            ) {
                setShowBulkEditDropdown(false);
            }
        };

        if (showBulkEditDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [showBulkEditDropdown]);



    // Bulk edit handlers - Now opens confirmation modal
    const handleBulkStatusUpdate = (action: "ENABLE" | "DISABLE" | "DELETE") => {
        if (!accountId || selectedAdGroupIds.size === 0) {
            alert("Please select at least one ad group to update.");
            return;
        }
        setShowBulkEditDropdown(false);
        setPendingBulkStatusAction(action);
        setShowBulkStatusModal(true);
    };

    // Execute bulk status update after modal confirmation
    const handleBulkStatusConfirm = async () => {
        if (!accountId || !pendingBulkStatusAction || selectedAdGroupIds.size === 0) return;

        const accountIdNum = parseInt(accountId, 10);
        if (isNaN(accountIdNum)) {
            alert("Invalid account ID.");
            return;
        }

        const selectedIds = Array.from(selectedAdGroupIds);
        setBulkEditLoading(true);

        try {
            await campaignsService.updateTikTokAdGroupStatus(accountIdNum, {
                adgroup_ids: selectedIds,
                operation_status: pendingBulkStatusAction,
            });

            // Clear selection and close modal
            selectedIds.forEach(id => onSelectAdGroup(id, false));
            setShowBulkStatusModal(false);
            setPendingBulkStatusAction(null);

            if (onRefresh) {
                onRefresh();
            }
        } catch (error: any) {
            console.error("Failed to update ad group status:", error);
            const errorMessage =
                error?.response?.data?.error ||
                error?.message ||
                "Failed to update ad group status. Please try again.";
            alert(errorMessage);
        } finally {
            setBulkEditLoading(false);
        }
    };



    return (
        <>
            {/* Header with Title and Actions */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Ad Groups
                </h2>
                <div className="flex items-center gap-2">
                    {/* Create Ad Group Button */}
                    <button
                        onClick={() => {
                            setIsCreateModalOpen(!isCreateModalOpen);
                            if (!isCreateModalOpen) {
                                setIsFilterPanelOpen(false); // Close filter panel when opening create panel
                            }
                        }}
                        className="create-entity-button"
                    >
                        <svg className="w-5 h-5 !text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[10.64px] text-white font-normal">Create Ad Group</span>
                        <svg
                            className={`w-4 h-4 !text-white transition-transform ${isCreateModalOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Edit Button */}
                    <div className="relative" ref={bulkEditDropdownRef}>
                        <button
                            onClick={() => {
                                setShowBulkEditDropdown(!showBulkEditDropdown);
                            }}
                            disabled={bulkEditLoading}
                            className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span className="text-[10.64px] text-[#072929] font-normal">
                                {bulkEditLoading ? "Updating..." : "Edit"}
                            </span>
                            <svg
                                className={`w-3 h-3 text-[#072929] transition-transform ${showBulkEditDropdown ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showBulkEditDropdown && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                <div className="py-1">
                                    <button
                                        onClick={() => handleBulkStatusUpdate("ENABLE")}
                                        className="w-full text-left px-4 py-2 table-text hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <span>Enable</span>
                                    </button>
                                    <button
                                        onClick={() => handleBulkStatusUpdate("DISABLE")}
                                        className="w-full text-left px-4 py-2 table-text hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <span>Disable</span>
                                    </button>
                                    <button
                                        onClick={() => handleBulkStatusUpdate("DELETE")}
                                        className="w-full text-left px-4 py-2 text-[13.3px] text-red-600 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={() => {
                            setIsFilterPanelOpen(!isFilterPanelOpen);
                            if (!isFilterPanelOpen) {
                                setIsCreateModalOpen(false); // Close create panel when opening filter panel
                            }
                        }}
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

                    {/* Sync Button */}
                    {onSync && (
                        <button
                            onClick={onSync}
                            disabled={syncing}
                            className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 text-[10.64px] font-semibold"
                        >
                            {syncing ? "Syncing..." : "Sync Ad Groups"}
                        </button>
                    )}
                </div>
            </div>

            {/* Create Ad Group Panel */}
            <CreateTikTokAdGroupPanel
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    // Reset state on close
                    setCreatedAdGroups([]);
                    setFailedAdGroupCount(0);
                    setFailedAdGroups([]);
                }}
                campaignId={campaignId!}
                campaignName={campaignName}
                objectiveType={objectiveType}
                createdAdGroups={createdAdGroups}
                failedCount={failedAdGroupCount}
                failedAdGroups={failedAdGroups}
                onSubmit={async (dataArray) => {
                    if (!accountId) return;

                    const created: any[] = [];
                    const failed: any[] = [];
                    let failCount = 0;

                    // Create all ad groups in the array
                    for (const [index, data] of dataArray.entries()) {
                        try {
                            const response = await campaignsService.createTikTokAdGroup(parseInt(accountId), {
                                ...data,
                                schedule_start_time: data.schedule_start_time || undefined,
                            });
                            // Store index to map back to original list in panel
                            created.push({ ...response, index, name: data.adgroup_name });
                        } catch (error: any) {
                            console.error(`Failed to create ad group ${data.adgroup_name}:`, error.response?.data || error.message);
                            failCount++;
                            failed.push({
                                index,
                                adgroup: data,
                                errors: [{ message: JSON.stringify(error.response?.data || error.message) }]
                            });
                        }
                    }

                    setCreatedAdGroups(created);
                    setFailedAdGroupCount(failCount);
                    setFailedAdGroups(failed);

                    if (onRefresh) onRefresh();

                    // Do not close modal automatically to show results
                    // Unless clear success on all? Amazon logic keeps it open.
                }}
            />

            {/* Filter Panel */}
            {isFilterPanelOpen && (
                <div className="mb-4">
                    <FilterPanel
                        isOpen={true}
                        onClose={() => setIsFilterPanelOpen(false)}
                        onApply={onApplyFilters}
                        initialFilters={filters}
                        filterFields={[
                            { value: "adgroup_name", label: "Ad Group Name" },
                            { value: "state", label: "Status" }, // 'state' maps to status
                            { value: "budget", label: "Budget" },
                        ]}
                    />
                </div>
            )}

            {/* Table */}
            <TikTokAdGroupTable
                adgroups={adgroups}
                loading={loading}
                selectedAdGroupIds={selectedAdGroupIds}
                onSelectAll={onSelectAll}
                onSelectAdGroup={onSelectAdGroup}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
                onRefresh={onRefresh || (() => { })}
                accountId={parseInt(accountId || "0")}
            />

            {/* Pagination */}
            {!loading && adgroups.length > 0 && totalPages > 0 && (
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
            {showBulkStatusModal && pendingBulkStatusAction && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !bulkEditLoading) {
                            setShowBulkStatusModal(false);
                            setPendingBulkStatusAction(null);
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
                                    {selectedAdGroupIds.size} ad group
                                    {selectedAdGroupIds.size !== 1 ? "s" : ""} will be updated:
                                </span>
                                <span className="text-[12.16px] font-semibold text-[#072929]">
                                    {pendingBulkStatusAction === "ENABLE"
                                        ? "Enable"
                                        : pendingBulkStatusAction === "DISABLE"
                                            ? "Pause"
                                            : "Delete"}
                                </span>
                            </div>
                        </div>

                        {/* Ad Group Preview Table */}
                        {(() => {
                            const selectedAdGroupsData = adgroups.filter(ag =>
                                selectedAdGroupIds.has(ag.adgroup_id)
                            );
                            const previewCount = Math.min(10, selectedAdGroupsData.length);
                            const hasMore = selectedAdGroupsData.length > 10;

                            return (
                                <div className="mb-6">
                                    <div className="mb-2">
                                        <span className="text-[10.64px] text-[#556179]">
                                            {hasMore
                                                ? `Showing ${previewCount} of ${selectedAdGroupsData.length} selected ad groups`
                                                : `${selectedAdGroupsData.length} ad group${selectedAdGroupsData.length !== 1 ? "s" : ""} selected`}
                                        </span>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-sandstorm-s20">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                                        Ad Group Name
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
                                                {selectedAdGroupsData.slice(0, 10).map((adgroup) => {
                                                    const oldStatus = adgroup.operation_status || "ENABLE";
                                                    const oldStatusDisplay =
                                                        oldStatus === "ENABLE"
                                                            ? "Enable"
                                                            : oldStatus === "DISABLE"
                                                                ? "Pause"
                                                                : oldStatus;
                                                    const newStatusDisplay =
                                                        pendingBulkStatusAction === "ENABLE"
                                                            ? "Enable"
                                                            : pendingBulkStatusAction === "DISABLE"
                                                                ? "Pause"
                                                                : "Delete";

                                                    return (
                                                        <tr
                                                            key={adgroup.adgroup_id}
                                                            className="border-b border-gray-200 last:border-b-0"
                                                        >
                                                            <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                                                {adgroup.adgroup_name || "Unnamed Ad Group"}
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

                        {pendingBulkStatusAction === "DELETE" && (
                            <p className="mb-4 text-[11px] text-red-600 italic">
                                * Deleting ad groups cannot be undone. Deleted ad groups will stop serving immediately.
                            </p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBulkStatusModal(false);
                                    setPendingBulkStatusAction(null);
                                }}
                                disabled={bulkEditLoading}
                                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkStatusConfirm}
                                disabled={bulkEditLoading}
                                className={`px-4 py-2 text-white text-[10.64px] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${pendingBulkStatusAction === "DELETE"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-[#136D6D] hover:bg-[#0e5a5a]"
                                    }`}
                            >
                                {bulkEditLoading ? "Applying..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
