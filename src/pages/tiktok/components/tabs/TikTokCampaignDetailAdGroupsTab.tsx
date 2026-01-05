import React from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";

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
    isFilterPanelOpen,
    onToggleFilterPanel,
    filters,
    onApplyFilters,
    syncing,
    onSync,
}) => {
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
                        {syncing ? "Syncing..." : "Sync Ad Groups"}
                    </button>
                )}
            </div>

            {/* Filter Panel */}
            {isFilterPanelOpen && (
                <div className="mb-4">
                    <FilterPanel
                        isOpen={true}
                        onClose={onToggleFilterPanel}
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
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    {loading ? (
                        <div className="text-center py-8 text-[#556179] text-[13.3px]">Loading ad groups...</div>
                    ) : adgroups.length === 0 ? (
                        <div className="text-center py-8 text-[#556179] text-[13.3px]">No ad groups found</div>
                    ) : (
                        <table className="w-full min-w-[1200px]">
                            <thead className="bg-[#f5f5f0]">
                                <tr className="border-b border-[#e8e8e3]">
                                    <th className="text-left py-[10px] px-[10px] w-[35px]">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={adgroups.length > 0 && adgroups.every(ag => selectedAdGroupIds.has(ag.adgroup_id))}
                                                // indeterminate logic could be added here
                                                onChange={onSelectAll}
                                            />
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("adgroup_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Group Name {getSortIcon("adgroup_name")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("operation_status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status {getSortIcon("operation_status")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("budget")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Budget {getSortIcon("budget")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("spend")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Spend {getSortIcon("spend")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("impressions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Impressions {getSortIcon("impressions")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("clicks")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Clicks {getSortIcon("clicks")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("conversions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Conversions {getSortIcon("conversions")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("ctr")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CTR {getSortIcon("ctr")}
                                        </div>
                                    </th>
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] cursor-pointer hover:bg-gray-100"
                                        onClick={() => onSort("cpc")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CPC {getSortIcon("cpc")}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {adgroups.map((item, index) => {
                                    const isLastRow = index === adgroups.length - 1;
                                    const isSelected = selectedAdGroupIds.has(item.adgroup_id);
                                    return (
                                        <tr
                                            key={item.adgroup_id}
                                            className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""} ${isSelected ? "bg-gray-50" : ""}`}
                                        >
                                            <td className="py-[10px] px-[10px]">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(checked) => onSelectAdGroup(item.adgroup_id, checked)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] font-medium cursor-pointer">
                                                {/* Link if we have nested detail or just text */}
                                                {item.adgroup_name}
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <StatusBadge status={item.operation_status} />
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
                                                {formatCurrency(item.budget)}
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
                                                {formatCurrency(item.spend)}
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
                                                {formatNumber(item.impressions)}
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
                                                {formatNumber(item.clicks)}
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
                                                {formatNumber(item.conversions)}
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
                                                {formatPercentage(item.ctr)}
                                            </td>
                                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16]">
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
            {!loading && adgroups.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-end mt-4">
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 hover:bg-gray-50 bg-[#FEFEFB]"
                        >
                            Previous
                        </button>
                        {/* Simple Pagination for now */}
                        <span className="px-3 py-2 text-[10.64px] text-black">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 border-l border-gray-200 text-[10.64px] text-black disabled:opacity-50 hover:bg-gray-50 bg-[#FEFEFB]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
