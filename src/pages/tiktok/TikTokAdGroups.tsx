import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import { PerformanceChart, type MetricConfig } from "../../components/charts/PerformanceChart";
import { TikTokAdGroupsTable, type TikTokAdGroup } from "./components/TikTokAdGroupsTable";
import { Button } from "../../components/ui";
import { FilterSection, FilterSectionPanel } from "../../components/filters/FilterSection";
import type { FilterValues } from "../../components/filters/FilterPanel";

export const TikTokAdGroups: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const { startDate, endDate } = useDateRange();
    const { sidebarWidth } = useSidebar();

    const [adgroups, setAdgroups] = useState<TikTokAdGroup[]>([]);
    const [summary, setSummary] = useState<{
        total_adgroups: number;
        total_spend: number;
        total_impressions: number;
        total_clicks: number;
        total_conversions: number;
        avg_ctr: number;
        avg_cpc: number;
    } | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState<string>("id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Selection State
    const [selectedAdgroups, setSelectedAdgroups] = useState<Set<string>>(new Set());

    // UI Mock States
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
    const [showBidPanel, setShowBidPanel] = useState(false);
    const [bidValue, setBidValue] = useState<string>("");

    // Filter State
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterValues>([]);

    // Chart toggle state
    const [chartToggles, setChartToggles] = useState({
        spend: true,
        impressions: true,
        clicks: false,
        conversions: false,
        ctr: false,
        cpc: false,
    });

    const toggleChartMetric = (metric: string) => {
        setChartToggles(prev => ({
            ...prev,
            [metric]: !prev[metric as keyof typeof prev]
        }));
    };

    const metrics: MetricConfig[] = [
        { key: "spend", label: "Spend", color: "#506766", tooltipFormatter: (v) => `$${v.toFixed(2)}` },
        { key: "impressions", label: "Impressions", color: "#7C3AED" },
        { key: "clicks", label: "Clicks", color: "#169aa3" },
        { key: "conversions", label: "Conversions", color: "#FF6B6B" },
        { key: "ctr", label: "CTR", color: "#8B5CF6", tooltipFormatter: (v) => `${v.toFixed(2)}%` },
        { key: "cpc", label: "CPC", color: "#F59E0B", tooltipFormatter: (v) => `$${v.toFixed(2)}` },
    ];

    const TIKTOK_ADGROUP_FILTER_FIELDS = [
        { value: "adgroup_name", label: "Ad Group Name" },
        { value: "state", label: "Status" }, // 'state' triggers the status dropdown logic in FilterPanel
        { value: "campaign_name", label: "Campaign Name" },
        { value: "budget", label: "Budget" },
    ];

    // Build params for API from filters
    const buildFilterParams = (currentFilters: FilterValues) => {
        const params: any = {};
        currentFilters.forEach((filter) => {
            if (filter.field === "adgroup_name") {
                params.adgroup_name__icontains = filter.value;
            } else if (filter.field === "campaign_name") {
                params.campaign_name__icontains = filter.value;
            } else if (filter.field === "state") {
                // Map frontend status to backend status
                const val = String(filter.value).toUpperCase();
                if (val === "ENABLED") params.operation_status = "ENABLE"; // Or "ENABLED" if backend supports matches
                else if (val === "PAUSED") params.operation_status = "DISABLE"; // Or "PAUSED"
                else params.operation_status = filter.value;
            } else if (filter.field === "budget") {
                params.budget = filter.value;
            }
        });
        return params;
    };

    // Set page title
    useEffect(() => {
        setPageTitle("TikTok Ad Groups");
        return () => {
            resetPageTitle();
        };
    }, []);

    // Load ad groups
    useEffect(() => {
        if (accountId) {
            loadAdGroups();
        }
    }, [accountId, currentPage, sortBy, sortOrder, startDate, endDate, filters]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setShowBulkActions(false);
                setShowBidPanel(false);
            }
            if (
                exportDropdownRef.current &&
                !exportDropdownRef.current.contains(event.target as Node)
            ) {
                setShowExportDropdown(false);
            }
        };

        if (showBulkActions || showExportDropdown || showBidPanel) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showBulkActions, showExportDropdown, showBidPanel]);

    // Bulk status update handler
    const handleBulkStatusUpdate = async (operationStatus: "ENABLE" | "DISABLE" | "DELETE") => {
        if (!accountId || selectedAdgroups.size === 0) {
            alert("Please select at least one ad group to update.");
            return;
        }

        const accountIdNum = parseInt(accountId, 10);
        if (isNaN(accountIdNum)) {
            alert("Invalid account ID.");
            return;
        }

        const selectedIds = Array.from(selectedAdgroups);
        const statusLabel = operationStatus === "ENABLE" ? "enable" : operationStatus === "DISABLE" ? "pause" : "delete";
        
        // Show confirmation
        const confirmMessage = `Are you sure you want to ${statusLabel} ${selectedIds.length} ad group(s)?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setBulkStatusLoading(true);
        setShowBulkActions(false);

        try {
            await campaignsService.updateTikTokAdGroupStatus(accountIdNum, {
                adgroup_ids: selectedIds,
                operation_status: operationStatus,
            });

            // Clear selection and refresh
            setSelectedAdgroups(new Set());
            await loadAdGroups();
        } catch (error: any) {
            console.error("Failed to update ad group status:", error);
            const errorMessage =
                error?.response?.data?.error ||
                error?.message ||
                "Failed to update ad group status. Please try again.";
            alert(errorMessage);
        } finally {
            setBulkStatusLoading(false);
        }
    };

    // Bulk budget update handler
    const handleBulkBudgetUpdate = async () => {
        if (!accountId || selectedAdgroups.size === 0) {
            alert("Please select at least one ad group to update.");
            return;
        }

        const budgetValue = parseFloat(bidValue);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            alert("Please enter a valid budget amount.");
            return;
        }

        const accountIdNum = parseInt(accountId, 10);
        if (isNaN(accountIdNum)) {
            alert("Invalid account ID.");
            return;
        }

        const selectedIds = Array.from(selectedAdgroups);
        
        // Show confirmation
        const confirmMessage = `Are you sure you want to update budget to $${budgetValue.toFixed(2)} for ${selectedIds.length} ad group(s)?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setBulkStatusLoading(true);
        setShowBidPanel(false);
        setBidValue("");

        try {
            await campaignsService.updateTikTokAdGroupBudget(accountIdNum, {
                budget: selectedIds.map(id => ({
                    adgroup_id: id,
                    budget: budgetValue
                }))
            });

            // Clear selection and refresh
            setSelectedAdgroups(new Set());
            await loadAdGroups();
        } catch (error: any) {
            console.error("Failed to update ad group budget:", error);
            const errorMessage =
                error?.response?.data?.error ||
                error?.message ||
                "Failed to update ad group budget. Please try again.";
            alert(errorMessage);
        } finally {
            setBulkStatusLoading(false);
        }
    };

    const loadAdGroups = async () => {
        if (!accountId) return;

        setLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) {
                setLoading(false);
                return;
            }

            const filterParams = buildFilterParams(filters);

            const params: any = {
                page: currentPage,
                page_size: itemsPerPage,
                sort_by: sortBy,
                order: sortOrder,
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
                filters: filterParams, // Pass filters object specifically for POST or structured params
            };

            // Identify how campaignsService.getTikTokAdGroups handles filters. 
            // If it expects 'filters' key in params, this is correct.
            const response = await campaignsService.getTikTokAdGroups(
                accountIdNum,
                params
            );

            const adgroupsList = Array.isArray(response.adgroups) ? response.adgroups : [];
            setAdgroups(adgroupsList);
            setTotalPages(response.total_pages || 0);
            if (response.summary) {
                setSummary(response.summary);
            }
            if (response.chart_data) {
                setChartData(response.chart_data);
            }
        } catch (error) {
            console.error("Failed to load TikTok ad groups:", error);
            setAdgroups([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("desc");
        }
        setCurrentPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Select all loaded IDs
            const allIds = new Set(adgroups.map(ag => ag.adgroup_id));
            setSelectedAdgroups(allIds);
        } else {
            setSelectedAdgroups(new Set());
        }
    };

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedAdgroups);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedAdgroups(newSelected);
    };

    const handleApplyFilters = (newFilters: FilterValues) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    // Process chart data with computed metrics
    const processedChartData = React.useMemo(() => {
        return chartData.map(item => ({
            ...item,
            ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
            cpc: item.clicks > 0 ? item.spend / item.clicks : 0,
        }));
    }, [chartData]);

    if (loading && adgroups.length === 0) {
        return (
            <div className="min-h-screen bg-white flex">
                <Sidebar />
                <div
                    className="flex-1 min-w-0 w-full"
                    style={{ marginLeft: `${sidebarWidth}px` }}
                >
                    <DashboardHeader />
                    <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#136D6D]"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex">
            <Sidebar />
            <div
                className="flex-1 min-w-0 w-full"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <DashboardHeader />
                <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                                TikTok Ad Groups
                            </h1>
                            <div className="flex items-center gap-2">
                                <FilterSection
                                    isOpen={isFilterPanelOpen}
                                    onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                    filters={filters}
                                    onApply={handleApplyFilters}
                                    filterFields={TIKTOK_ADGROUP_FILTER_FIELDS}
                                    initialFilters={filters}
                                />
                            </div>
                        </div>

                        {/* Filter Panel */}
                        <FilterSectionPanel
                            isOpen={isFilterPanelOpen}
                            onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            filters={filters}
                            onApply={handleApplyFilters}
                            filterFields={TIKTOK_ADGROUP_FILTER_FIELDS}
                            initialFilters={filters}
                            accountId={accountId}
                            channelType="tiktok"
                        />

                        {/* Performance Chart */}
                        <PerformanceChart
                            data={processedChartData}
                            toggles={chartToggles}
                            onToggle={toggleChartMetric}
                            title="Performance"
                            metrics={metrics}
                        />

                        {/* Budget editor panel */}
                        {selectedAdgroups.size > 0 && showBidPanel && (
                            <div className="mb-4">
                                <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
                                    <div className="flex flex-wrap items-end gap-3 justify-between">
                                        <div className="w-[160px]">
                                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                                                Budget
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={bidValue}
                                                    onChange={(e) => setBidValue(e.target.value)}
                                                    className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                                                    $
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleBulkBudgetUpdate}
                                                disabled={bulkStatusLoading || !bidValue || parseFloat(bidValue) <= 0}
                                                className="px-4 py-2.5 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10.64px] font-medium"
                                            >
                                                {bulkStatusLoading ? "Updating..." : "Update"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowBidPanel(false);
                                                    setBidValue("");
                                                }}
                                                className="px-4 py-2.5 bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[10.64px] text-[#556179] font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Table Header Actions (Edit/Export) */}
                        <div className="flex items-center justify-end gap-2">
                            {/* Bulk Actions Dropdown */}
                            <div className="relative inline-flex justify-end" ref={dropdownRef}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={bulkStatusLoading}
                                    className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowBulkActions(prev => !prev);
                                        setShowExportDropdown(false);
                                        setShowBidPanel(false);
                                    }}
                                >
                                    <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <span className="text-[10.64px] text-[#072929] font-normal">
                                        {bulkStatusLoading ? "Updating..." : "Edit"}
                                    </span>
                                </Button>
                                {showBulkActions && (
                                    <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                                        <div className="overflow-y-auto">
                                            <button
                                                onClick={() => {
                                                    setShowBulkActions(false);
                                                    handleBulkStatusUpdate("ENABLE");
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                disabled={selectedAdgroups.size === 0 || bulkStatusLoading}
                                            >
                                                Enable
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowBulkActions(false);
                                                    handleBulkStatusUpdate("DISABLE");
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                disabled={selectedAdgroups.size === 0 || bulkStatusLoading}
                                            >
                                                Disable
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowBulkActions(false);
                                                    handleBulkStatusUpdate("DELETE");
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10.64px] text-red-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                disabled={selectedAdgroups.size === 0 || bulkStatusLoading}
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowBidPanel(true);
                                                    setShowBulkActions(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                disabled={selectedAdgroups.size === 0 || bulkStatusLoading}
                                            >
                                                Edit Budget
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Export Button */}
                            <div className="relative inline-flex justify-end" ref={exportDropdownRef}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowExportDropdown(prev => !prev);
                                        setShowBulkActions(false);
                                        setShowBidPanel(false);
                                    }}
                                    disabled={exportLoading}
                                >
                                    <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-[10.64px] text-[#072929] font-normal">Export</span>
                                </Button>
                                {showExportDropdown && (
                                    <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-[#E3E3E3] rounded-[12px] shadow-lg z-[100] pointer-events-auto overflow-hidden">
                                        <div className="overflow-y-auto">
                                            <button className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors cursor-pointer">
                                                Export All Data
                                            </button>
                                            <button className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors cursor-pointer">
                                                Export Current View
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ad Groups Table */}
                        <TikTokAdGroupsTable
                            adgroups={adgroups}
                            loading={loading}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            selectedIds={selectedAdgroups}
                            onSelect={handleSelect}
                            onSelectAll={handleSelectAll}
                            summary={summary}
                        />

                        {/* Pagination */}
                        {!loading && adgroups.length > 0 && (
                            <div className="flex items-center justify-end">
                                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                                    <button
                                        onClick={() =>
                                            handlePageChange(Math.max(1, currentPage - 1))
                                        }
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
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
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
                                            onClick={() => handlePageChange(totalPages)}
                                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
                                                    ? "bg-white text-[#136D6D] font-semibold"
                                                    : "text-black hover:bg-gray-50"
                                                }`}
                                        >
                                            {totalPages}
                                        </button>
                                    )}
                                    <button
                                        onClick={() =>
                                            handlePageChange(Math.min(totalPages, currentPage + 1))
                                        }
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
