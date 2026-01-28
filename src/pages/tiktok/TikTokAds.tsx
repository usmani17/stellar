import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import { useChartCollapse } from "../../hooks/useChartCollapse";
import { PerformanceChart, type MetricConfig } from "../../components/charts/PerformanceChart";
import { TikTokAdsTable, type TikTokAd } from "./components/TikTokAdsTable";
import { Button } from "../../components/ui";
import { FilterSection, FilterSectionPanel } from "../../components/filters/FilterSection";
import type { FilterValues } from "../../components/filters/FilterPanel";
import { ErrorModal } from "../../components/ui/ErrorModal";

export const TikTokAds: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
    const { sidebarWidth } = useSidebar();

    const [ads, setAds] = useState<TikTokAd[]>([]);
    const [summary, setSummary] = useState<{
        total_ads: number;
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
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState<string>("id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Selection State
    const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());

    // UI Mock States
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [exportLoading, setExportLoading] = useState(false);

    // Bulk Actions State
    const [pendingStatusAction, setPendingStatusAction] = useState<"ENABLE" | "DISABLE" | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Inline Editing State
    const [inlineEditLoading, setInlineEditLoading] = useState(false);
    const [showInlineEditConfirm, setShowInlineEditConfirm] = useState(false);
    const [pendingInlineEdit, setPendingInlineEdit] = useState<{
        ad: TikTokAd;
        field: "ad_name" | "operation_status";
        newValue: string;
    } | null>(null);

    // Error Modal State
    const [errorModal, setErrorModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        isSuccess?: boolean;
        fieldErrors?: Record<string, string[]>;
        genericErrors?: string[];
    }>({
        isOpen: false,
        title: "",
        message: "",
    });

    // Filter State
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterValues>([]);

    // Chart toggle state
    const [chartToggles, setChartToggles] = useState({
        spend: true,
        clicks: true,
        impressions: false,
        conversions: false,
        ctr: false,
        cpc: false,
    });

    // Chart collapse state with localStorage persistence
    const [isChartCollapsed, toggleChartCollapse] = useChartCollapse(
        "tiktok-ads-chart-collapsed"
    );

    const toggleChartMetric = (metric: string) => {
        setChartToggles(prev => ({
            ...prev,
            [metric]: !prev[metric as keyof typeof prev]
        }));
    };

    const metrics: MetricConfig[] = [
        { key: "spend", label: "Spend", color: "#506766", tooltipFormatter: (v) => `$${v.toFixed(2)} ` },
        { key: "clicks", label: "Clicks", color: "#169aa3" },
        { key: "impressions", label: "Impressions", color: "#7C3AED" },
        { key: "conversions", label: "Conversions", color: "#FF6B6B" },
        { key: "ctr", label: "CTR", color: "#8B5CF6", tooltipFormatter: (v) => `${v.toFixed(2)}% ` },
        { key: "cpc", label: "CPC", color: "#F59E0B", tooltipFormatter: (v) => `$${v.toFixed(2)} ` },
    ];

    const TIKTOK_AD_FILTER_FIELDS = [
        { value: "ad_name", label: "Ad Name" },
        { value: "state", label: "Status" },
        { value: "adgroup_name", label: "Ad Group Name" },
        { value: "campaign_name", label: "Campaign Name" },
        { value: "ad_format", label: "Ad Format" },
    ];

    // Build params for API from filters
    const buildFilterParams = (currentFilters: FilterValues) => {
        const params: any = {};
        currentFilters.forEach((filter) => {
            const field = filter.field as string;
            if (field === "ad_name") {
                params.ad_name__icontains = filter.value;
            } else if (field === "adgroup_name") {
                params.adgroup_name__icontains = filter.value;
            } else if (field === "campaign_name") {
                params.campaign_name__icontains = filter.value;
            } else if (field === "state") {
                const val = String(filter.value).toUpperCase();
                if (val === "ENABLED") params.operation_status = "ENABLE";
                else if (val === "PAUSED") params.operation_status = "DISABLE";
                else params.operation_status = filter.value;
            } else if (field === "ad_format") {
                params.ad_format = filter.value;
            }
        });
        return params;
    };

    // Set page title
    useEffect(() => {
        setPageTitle("TikTok Ads");
        return () => {
            resetPageTitle();
        };
    }, []);

    // Load ads
    useEffect(() => {
        if (accountId) {
            loadAds();
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
            }
            if (
                exportDropdownRef.current &&
                !exportDropdownRef.current.contains(event.target as Node)
            ) {
                setShowExportDropdown(false);
            }
        };

        if (showBulkActions || showExportDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showBulkActions, showExportDropdown]);

    const loadAds = async () => {
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
                start_date: startDateStr,
                end_date: endDateStr,
                filters: filterParams,
            };

            const response = await campaignsService.getTikTokAds(
                accountIdNum,
                params
            );

            const adsList = Array.isArray(response.ads) ? response.ads : [];
            setAds(adsList);
            setTotalPages(response.total_pages || 0);
            if (response.summary) {
                setSummary(response.summary);
            }
            if (response.chart_data) {
                // Ensure chart_data is always an array
                const chartDataArray = Array.isArray(response.chart_data)
                    ? response.chart_data
                    : [];
                setChartData(chartDataArray);
            } else {
                setChartData([]);
            }
        } catch (error) {
            console.error("Failed to load TikTok ads:", error);
            setAds([]);
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
            const allIds = new Set(ads.map(ad => ad.ad_id));
            setSelectedAds(allIds);
        } else {
            setSelectedAds(new Set());
        }
    };

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedAds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedAds(newSelected);
    };

    const handleApplyFilters = (newFilters: FilterValues) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    // Export Handler
    const handleExport = async (exportType: "current_view" | "all_data") => {
        if (!accountId) return;
        setExportLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) return;

            const baseParams: any = {
                sort_by: sortBy,
                order: sortOrder,
                start_date: startDateStr,
                end_date: endDateStr,
                filters: buildFilterParams(filters),
            };

            if (exportType === "current_view") {
                baseParams.page = currentPage;
                baseParams.page_size = itemsPerPage;
            }

            await campaignsService.exportTikTokAds(accountIdNum, baseParams, exportType);
            // toast.success("Export started successfully");
        } catch (error) {
            console.error("Export failed:", error);
            setErrorModal({
                isOpen: true,
                title: "Export Failed",
                message: "Failed to export ads. Please try again.",
            });
        } finally {
            setExportLoading(false);
            setShowExportDropdown(false);
        }
    };

    // Bulk Actions Handler
    const handleBulkAction = (action: "ENABLE" | "DISABLE" | "DELETE") => {
        if (!accountId || selectedAds.size === 0) return;

        if (action === "DELETE") {
            setShowDeleteModal(true);
        } else {
            setPendingStatusAction(action);
            setShowConfirmationModal(true);
        }
        setShowBulkActions(false);
    };

    const handleStatusUpdateConfirm = async () => {
        if (!accountId || !pendingStatusAction || selectedAds.size === 0) return;

        setStatusUpdateLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) return;

            await campaignsService.updateTikTokAdStatus(accountIdNum, {
                ad_ids: Array.from(selectedAds),
                operation_status: pendingStatusAction,
            });

            loadAds();
            setSelectedAds(new Set());
            setShowConfirmationModal(false);
            setPendingStatusAction(null);
        } catch (error) {
            console.error("Failed to update ad status:", error);
            setErrorModal({
                isOpen: true,
                title: "Status Update Failed",
                message: "Failed to update ad status. Please try again.",
            });
        } finally {
            setStatusUpdateLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!accountId || selectedAds.size === 0) return;

        setDeleteLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) return;

            await campaignsService.updateTikTokAdStatus(accountIdNum, {
                ad_ids: Array.from(selectedAds),
                operation_status: "DELETE",
            });

            loadAds();
            setSelectedAds(new Set());
            setShowDeleteModal(false);
        } catch (error) {
            console.error("Failed to delete ads:", error);
            setErrorModal({
                isOpen: true,
                title: "Delete Failed",
                message: "Failed to delete ads. Please try again.",
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    // Helper to get selected ads data
    const getSelectedAdsData = () => {
        return ads.filter((ad) => selectedAds.has(ad.ad_id));
    };

    // Inline Edit Handlers
    // Inline Edit Handlers
    const handleInlineNameEdit = (adId: string, newName: string) => {
        const ad = ads.find(a => a.ad_id === adId);
        if (!ad) return;

        if (ad.ad_name === newName) return;

        setPendingInlineEdit({
            ad,
            field: "ad_name",
            newValue: newName,
        });
        setShowInlineEditConfirm(true);
    };

    const handleInlineStatusEdit = (adId: string, newStatus: string) => {
        const ad = ads.find(a => a.ad_id === adId);
        if (!ad) return;

        if (ad.operation_status === newStatus) return;

        setPendingInlineEdit({
            ad,
            field: "operation_status",
            newValue: newStatus,
        });
        setShowInlineEditConfirm(true);
    };

    const runInlineEdit = async () => {
        if (!pendingInlineEdit || !accountId) return;

        setInlineEditLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) return;

            const payload: any = {};
            if (pendingInlineEdit.field === "ad_name") {
                payload.ad_name = pendingInlineEdit.newValue;
            } else if (pendingInlineEdit.field === "operation_status") {
                payload.operation_status = pendingInlineEdit.newValue;
            }

            await campaignsService.updateTikTokAd(accountIdNum, pendingInlineEdit.ad.ad_id, payload);

            // Optimistic update
            setAds(prev => prev.map(item => {
                if (item.ad_id === pendingInlineEdit.ad.ad_id) {
                    return { ...item, [pendingInlineEdit.field]: pendingInlineEdit.newValue };
                }
                return item;
            }));

        } catch (error) {
            console.error("Inline update failed:", error);
            setErrorModal({
                isOpen: true,
                title: "Update Failed",
                message: "Failed to update ad. Please try again.",
            });
            loadAds(); // Revert on failure
        } finally {
            setInlineEditLoading(false);
            setShowInlineEditConfirm(false);
            setPendingInlineEdit(null);
        }
    };

    // Process chart data with computed metrics
    // Process chart data with computed metrics
    const processedChartData = useMemo(() => {
        return chartData.map(item => ({
            ...item,
            ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
            cpc: item.clicks > 0 ? item.spend / item.clicks : 0,
        }));
    }, [chartData]);

    if (loading && ads.length === 0) {
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
                                TikTok Ads
                            </h1>
                            <div className="flex items-center gap-2">
                                <FilterSection
                                    isOpen={isFilterPanelOpen}
                                    onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                    filters={filters}
                                    onApply={handleApplyFilters}
                                    filterFields={TIKTOK_AD_FILTER_FIELDS}
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
                            filterFields={TIKTOK_AD_FILTER_FIELDS}
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
                            isCollapsed={isChartCollapsed}
                            onCollapseToggle={toggleChartCollapse}
                        />

                        {/* Table Header Actions (Edit/Export) */}
                        <div className="flex items-center justify-end gap-2">
                            {/* Bulk Actions Dropdown */}
                            <div className="relative inline-flex justify-end" ref={dropdownRef}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={statusUpdateLoading}
                                    className="edit-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowBulkActions(prev => !prev);
                                        setShowExportDropdown(false);
                                    }}
                                >
                                    <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <span className="text-[10.64px] text-[#072929] font-normal">
                                        {statusUpdateLoading ? "Updating..." : "Bulk Actions"}
                                    </span>
                                </Button>
                                {showBulkActions && (
                                    <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                                        <div className="overflow-y-auto">
                                            {['ENABLE', 'DISABLE', 'DELETE'].map((action) => (
                                                <button
                                                    key={action}
                                                    className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer capitalize"
                                                    disabled={selectedAds.size === 0}
                                                    onClick={() => handleBulkAction(action as "ENABLE" | "DISABLE" | "DELETE")}
                                                >
                                                    {action.toLowerCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Export Button */}
                            <div className="relative inline-flex justify-end" ref={exportDropdownRef}>
                                <div className="relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="edit-button"
                                        onClick={(e) => {
                                            if (exportLoading) return;
                                            e.stopPropagation();
                                            setShowExportDropdown(prev => !prev);
                                            setShowBulkActions(false);
                                        }}
                                        disabled={exportLoading}
                                    >
                                        {exportLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#136D6D]"></div>
                                            </div>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="text-[10.64px] text-[#072929] font-normal">Export</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {(showExportDropdown || exportLoading) && (
                                    <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-[#E3E3E3] rounded-[12px] shadow-lg z-[100] pointer-events-auto overflow-hidden">
                                        {exportLoading ? (
                                            <div className="px-3 py-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                                                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#136D6D] border-t-transparent"></div>
                                                <p className="text-[13px] text-[#072929] font-medium">
                                                    Exporting...
                                                </p>
                                                <p className="text-[11px] text-[#556179] text-center px-2">
                                                    Please wait while we prepare your file
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-y-auto">
                                                {[
                                                    { value: "all_data", label: "Export All" },
                                                    { value: "current_view", label: "Export Current View" }
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            await handleExport(opt.value as "all_data" | "current_view");
                                                        }}
                                                        disabled={exportLoading}
                                                    >
                                                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                                            <svg
                                                                width="20"
                                                                height="20"
                                                                viewBox="0 0 20 20"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <rect
                                                                    width="20"
                                                                    height="20"
                                                                    rx="3.2"
                                                                    fill="#072929"
                                                                />
                                                                <path
                                                                    d="M15 11.2V9.1942C15 8.7034 15 8.4586 14.9145 8.2378C14.829 8.0176 14.6664 7.8436 14.3407 7.4968L11.6768 4.6552C11.3961 4.3558 11.256 4.2064 11.0816 4.1176C11.0455 4.09911 11.0085 4.08269 10.9708 4.0684C10.7891 4 10.5906 4 10.194 4C8.36869 4 7.45575 4 6.83756 4.5316C6.71274 4.63896 6.59903 4.76025 6.49838 4.8934C6 5.554 6 6.5266 6 8.4736V11.2C6 13.4626 6 14.5942 6.65925 15.2968C7.3185 15.9994 8.37881 16 10.5 16M11.0625 4.3V4.6C11.0625 6.2968 11.0625 7.1458 11.5569 7.6726C12.0508 8.2 12.8467 8.2 14.4375 8.2H14.7188M13.3125 16C13.6539 15.646 15 14.704 15 14.2C15 13.696 13.6539 12.754 13.3125 12.4M14.4375 14.2H10.5"
                                                                    stroke="#F9F9F6"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="1.2"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <span>{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ads Table */}
                        <TikTokAdsTable
                            ads={ads}
                            loading={loading}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            selectedIds={selectedAds}
                            onSelect={handleSelect}
                            onSelectAll={handleSelectAll}
                            summary={summary}
                            onUpdateAdName={handleInlineNameEdit}
                            onUpdateAdStatus={handleInlineStatusEdit}
                        />

                        {/* Pagination */}
                        {!loading && ads.length > 0 && (
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

            {/* Confirmation Modal */}
            {showConfirmationModal && pendingStatusAction && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowConfirmationModal(false);
                            setPendingStatusAction(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            Confirm Status Changes
                        </h3>

                        {/* Summary */}
                        <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[12.16px] text-[#556179]">
                                    {selectedAds.size} ad
                                    {selectedAds.size !== 1 ? "s" : ""} will be
                                    updated:
                                </span>
                                <span className="text-[12.16px] font-semibold text-[#072929]">
                                    Status change
                                </span>
                            </div>
                        </div>

                        {/* Ad Preview Table */}
                        {(() => {
                            const selectedAdsData = getSelectedAdsData();
                            const previewCount = Math.min(
                                10,
                                selectedAdsData.length
                            );
                            const hasMore = selectedAdsData.length > 10;

                            return (
                                <div className="mb-6">
                                    <div className="mb-2">
                                        <span className="text-[10.64px] text-[#556179]">
                                            {hasMore
                                                ? `Showing ${previewCount} of ${selectedAdsData.length} selected ads`
                                                : `${selectedAdsData.length} ad${selectedAdsData.length !== 1
                                                    ? "s"
                                                    : ""
                                                } selected`}
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
                                                        Old Value
                                                    </th>
                                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                                        New Value
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedAdsData
                                                    .slice(0, 10)
                                                    .map((ad) => {
                                                        const oldStatus = ad.operation_status;
                                                        const newStatus = pendingStatusAction === 'ENABLE'
                                                            ? 'Enable'
                                                            : 'Pause';
                                                        const oldStatusDisplay = oldStatus === 'ENABLE'
                                                            ? 'Enable'
                                                            : oldStatus === 'DISABLE'
                                                                ? 'Pause'
                                                                : oldStatus;

                                                        return (
                                                            <tr
                                                                key={ad.ad_id}
                                                                className="border-b border-gray-200 last:border-b-0"
                                                            >
                                                                <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                                                    {ad.ad_name ||
                                                                        "Unnamed Ad"}
                                                                </td>
                                                                <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                                                    {oldStatusDisplay}
                                                                </td>
                                                                <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                                                    {newStatus}
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

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-[12.16px] text-[#556179]">
                                    New Status:
                                </span>
                                <span className="text-[12.16px] font-semibold text-[#072929]">
                                    {pendingStatusAction === 'ENABLE'
                                        ? 'Enable'
                                        : 'Pause'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmationModal(false);
                                    setPendingStatusAction(null);
                                }}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleStatusUpdateConfirm}
                                disabled={statusUpdateLoading}
                                className="create-entity-button btn-sm"
                            >
                                {statusUpdateLoading ? "Applying..." : "Confirm"}
                            </button>
                        </div>
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
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInlineEditConfirm(false);
                                    setPendingInlineEdit(null);
                                }}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={runInlineEdit}
                                disabled={inlineEditLoading}
                                className="create-entity-button btn-sm"
                            >
                                {inlineEditLoading ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                title={errorModal.title}
                message={errorModal.message}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deleteLoading) {
                            setShowDeleteModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            Delete Ads?
                        </h3>

                        <p className="text-[12.16px] text-[#556179] mb-4">
                            You are about to permanently delete{" "}
                            {selectedAds.size} selected ad
                            {selectedAds.size !== 1 ? "s" : ""}. This will stop
                            all ad serving immediately and cannot be undone. Deleted
                            ads can still be viewed in reports but not edited or
                            re-enabled.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!deleteLoading) {
                                        setShowDeleteModal(false);
                                    }
                                }}
                                disabled={deleteLoading}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading}
                                className="px-4 py-2 bg-red-600 text-white text-[10.64px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleteLoading ? "Deleting..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
