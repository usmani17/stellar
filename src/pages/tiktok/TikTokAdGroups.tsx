import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import { useChartCollapse } from "../../hooks/useChartCollapse";
import { PerformanceChart, type MetricConfig } from "../../components/charts/PerformanceChart";
import { TikTokAdGroupsTable, type TikTokAdGroup } from "./components/TikTokAdGroupsTable";
import { Button } from "../../components/ui";
import { ErrorModal } from "../../components/ui/ErrorModal";
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
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState<string>("id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Selection State
    const [selectedAdgroups, setSelectedAdgroups] = useState<Set<string | number>>(new Set());

    // UI Mock States
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
    const [showBidPanel, setShowBidPanel] = useState(false);
    const [bidValue, setBidValue] = useState<string>("");

    // Error modal state
    const [errorModal, setErrorModal] = useState<{
        isOpen: boolean;
        message: string;
        title?: string;
        isSuccess?: boolean;
        fieldErrors?: Record<string, string>;
        genericErrors?: string[];
    }>({ isOpen: false, message: "" });

    // Status update modal state
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pendingStatusAction, setPendingStatusAction] = useState<"ENABLE" | "DISABLE" | null>(null);
    const [isBudgetChange, setIsBudgetChange] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Inline edit confirmation modal state
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [inlineEditAdgroup, setInlineEditAdgroup] = useState<TikTokAdGroup | null>(null);
    const [inlineEditField, setInlineEditField] = useState<"operation_status" | "budget" | "adgroup_name" | null>(null);
    const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
    const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
    const [inlineEditLoading, setInlineEditLoading] = useState(false);

    // Helper function to get selected ad groups data
    const getSelectedAdgroupsData = () => {
        return adgroups.filter((adgroup) =>
            selectedAdgroups.has(adgroup.adgroup_id)
        );
    };

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
        "tiktok-adgroups-chart-collapsed"
    );

    const toggleChartMetric = (metric: string) => {
        setChartToggles(prev => ({
            ...prev,
            [metric]: !prev[metric as keyof typeof prev]
        }));
    };

    const metrics: MetricConfig[] = [
        { key: "spend", label: "Spend", color: "#506766", tooltipFormatter: (v) => `$${v.toFixed(2)}` },
        { key: "clicks", label: "Clicks", color: "#169aa3" },
        { key: "impressions", label: "Impressions", color: "#7C3AED" },
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

    // Close dropdowns when clicking outside (but NOT the budget panel - like Amazon)
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

    // Bulk status update handler - shows confirmation modal
    const handleBulkStatusUpdate = (operationStatus: "ENABLE" | "DISABLE" | "DELETE") => {
        if (!accountId || selectedAdgroups.size === 0) {
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Please select at least one ad group to update.",
            });
            return;
        }

        const accountIdNum = parseInt(accountId, 10);
        if (isNaN(accountIdNum)) {
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Invalid account ID.",
            });
            return;
        }

        setShowBulkActions(false);

        // For DELETE, show separate delete modal
        if (operationStatus === "DELETE") {
            setShowDeleteModal(true);
            return;
        }

        // For ENABLE/DISABLE, show status confirmation modal
        setPendingStatusAction(operationStatus);
        setShowConfirmationModal(true);
    };

    // Bulk budget update handler - shows confirmation modal
    const handleBulkBudgetUpdate = () => {
        if (!accountId || selectedAdgroups.size === 0) {
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Please select at least one ad group to update.",
            });
            return;
        }

        const budgetValue = parseFloat(bidValue);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Please enter a valid budget amount greater than 0.",
            });
            return;
        }

        // Show confirmation modal instead of executing immediately
        setIsBudgetChange(true);
        setPendingStatusAction(null);
        setShowConfirmationModal(true);
        setShowBidPanel(false);
    };

    // Execute bulk budget update after confirmation
    const runBulkBudget = async () => {
        if (!accountId || selectedAdgroups.size === 0) return;

        const budgetValue = parseFloat(bidValue);
        if (isNaN(budgetValue) || budgetValue <= 0) return;

        const accountIdNum = parseInt(accountId, 10);
        if (isNaN(accountIdNum)) return;

        setBulkStatusLoading(true);
        try {
            await campaignsService.updateTikTokAdGroupBudget(accountIdNum, {
                budget: Array.from(selectedAdgroups).map(id => ({
                    adgroup_id: id,
                    budget: budgetValue
                }))
            });

            // Clear selection and refresh (silent refresh, matching Amazon)
            setSelectedAdgroups(new Set());
            setBidValue("");
            await loadAdGroups();
        } catch (error: any) {
            console.error("Failed to update ad group budget:", error);
            const errorMessage =
                error?.response?.data?.error ||
                error?.message ||
                "Failed to update ad group budget. Please try again.";
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: errorMessage,
            });
        } finally {
            setBulkStatusLoading(false);
        }
    };

    // Handle status update confirmation (called when modal is confirmed)
    const handleStatusUpdateConfirm = async () => {
        if (!accountId || !pendingStatusAction || selectedAdgroups.size === 0) return;

        setBulkStatusLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            const selectedIds = Array.from(selectedAdgroups);
            
            await campaignsService.updateTikTokAdGroupStatus(accountIdNum, {
                adgroup_ids: selectedIds,
                operation_status: pendingStatusAction,
            });

            // Clear selection and refresh (silent refresh, matching Amazon)
            setSelectedAdgroups(new Set());
            setShowConfirmationModal(false);
            setPendingStatusAction(null);
            await loadAdGroups();
        } catch (error: any) {
            console.error("Failed to update ad group status:", error);
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: error?.response?.data?.error || error?.message || "Failed to update ad group status. Please try again.",
            });
        } finally {
            setBulkStatusLoading(false);
        }
    };

    // Handle delete confirmation (called when delete modal is confirmed)
    const handleDeleteConfirm = async () => {
        if (!accountId || selectedAdgroups.size === 0) return;

        setDeleteLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            const selectedIds = Array.from(selectedAdgroups);
            
            await campaignsService.updateTikTokAdGroupStatus(accountIdNum, {
                adgroup_ids: selectedIds,
                operation_status: "DELETE",
            });

            // Clear selection and refresh (silent refresh, matching Amazon)
            setSelectedAdgroups(new Set());
            setShowDeleteModal(false);
            await loadAdGroups();
        } catch (error: any) {
            console.error("Failed to delete ad groups:", error);
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: error?.response?.data?.error || error?.message || "Failed to delete ad groups. Please try again.",
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    // Format currency for display
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value);
    };

    // Inline edit handler for status changes
    const handleInlineStatusEdit = (adgroupId: string, newStatus: string) => {
        const adgroup = adgroups.find((ag) => ag.adgroup_id === adgroupId);
        if (!adgroup) return;

        const oldStatus = adgroup.operation_status || "ENABLE";
        const oldStatusDisplay = oldStatus === "ENABLE" ? "Enable" : oldStatus === "DISABLE" ? "Pause" : oldStatus;
        const newStatusDisplay = newStatus === "ENABLE" ? "Enable" : newStatus === "DISABLE" ? "Pause" : newStatus === "DELETE" ? "Delete" : newStatus;

        setInlineEditAdgroup(adgroup);
        setInlineEditField("operation_status");
        setInlineEditOldValue(oldStatusDisplay);
        setInlineEditNewValue(newStatusDisplay);
        setShowInlineEditModal(true);
    };

    // Inline edit handler for budget changes
    const handleInlineBudgetEdit = (adgroupId: string, newBudget: number) => {
        const adgroup = adgroups.find((ag) => ag.adgroup_id === adgroupId);
        if (!adgroup) return;

        const oldBudget = adgroup.budget || 0;

        setInlineEditAdgroup(adgroup);
        setInlineEditField("budget");
        setInlineEditOldValue(formatCurrency(oldBudget));
        setInlineEditNewValue(formatCurrency(newBudget));
        setShowInlineEditModal(true);
    };

    // Inline edit handler for name changes
    const handleInlineNameEdit = (adgroupId: string, newName: string) => {
        const adgroup = adgroups.find((ag) => ag.adgroup_id === adgroupId);
        if (!adgroup) return;

        const oldName = adgroup.adgroup_name || "";

        setInlineEditAdgroup(adgroup);
        setInlineEditField("adgroup_name");
        setInlineEditOldValue(oldName);
        setInlineEditNewValue(newName);
        setShowInlineEditModal(true);
    };

    // Execute inline edit after modal confirmation
    const runInlineEdit = async () => {
        if (!inlineEditAdgroup || !inlineEditField || !accountId) return;

        setInlineEditLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);

            if (inlineEditField === "operation_status") {
                // Map display value back to API value
                const apiStatus = (inlineEditNewValue === "Enable" ? "ENABLE" 
                    : inlineEditNewValue === "Pause" ? "DISABLE" 
                    : inlineEditNewValue === "Delete" ? "DELETE" 
                    : inlineEditNewValue.toUpperCase()) as "ENABLE" | "DISABLE" | "DELETE";

                await campaignsService.updateTikTokAdGroupStatus(accountIdNum, {
                    adgroup_ids: [inlineEditAdgroup.adgroup_id],
                    operation_status: apiStatus,
                });
            } else if (inlineEditField === "budget") {
                // Parse budget from formatted string (e.g., "$100.00" -> 100)
                const budgetValue = parseFloat(inlineEditNewValue.replace(/[$,]/g, "")) || 0;

                await campaignsService.updateTikTokAdGroupBudget(accountIdNum, {
                    budget: [{
                        adgroup_id: inlineEditAdgroup.adgroup_id,
                        budget: budgetValue,
                    }],
                });
            } else if (inlineEditField === "adgroup_name") {
                // Update ad group name
                await campaignsService.updateTikTokAdGroup(accountIdNum, inlineEditAdgroup.adgroup_id, {
                    adgroup_name: inlineEditNewValue,
                });
            }

            // Close modal and refresh (silent refresh, matching Amazon)
            setShowInlineEditModal(false);
            setInlineEditAdgroup(null);
            setInlineEditField(null);
            setInlineEditOldValue("");
            setInlineEditNewValue("");
            await loadAdGroups();
        } catch (error: any) {
            console.error("Failed to update ad group:", error);
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: error?.response?.data?.error || error?.message || "Failed to update ad group. Please try again.",
            });
        } finally {
            setInlineEditLoading(false);
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

    const handleSelectionChange = (selected: Set<string | number>) => {
        setSelectedAdgroups(selected);
    };

    const handleExport = async (exportType: "all_data" | "current_view") => {
        if (!accountId) return;

        // Keep dropdown open and show loading
        setShowExportDropdown(true);
        setExportLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) {
                throw new Error("Invalid account ID");
            }

            // Build params from current filters, sorting, and pagination
            const params: any = {
                sort_by: sortBy,
                order: sortOrder,
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
            };

            // Apply FilterPanel filters to export
            for (const filter of filters) {
                if (filter.field === "adgroup_name") {
                    params.adgroup_name = filter.value;
                }
                if (filter.field === "campaign_name") {
                    params.campaign_name = filter.value;
                }
                if (filter.field === "state") {
                    // Map display values to API values
                    const stateMapping: Record<string, string> = {
                        "Enabled": "ENABLE",
                        "Paused": "DISABLE",
                        "Deleted": "DELETED",
                    };
                    const apiValue = stateMapping[String(filter.value)] || String(filter.value).toUpperCase();
                    params.operation_status = apiValue;
                }
            }

            // Add pagination for current_view
            if (exportType === "current_view") {
                params.page = currentPage;
                params.page_size = itemsPerPage;
            }

            // Call export API (handles download automatically)
            await campaignsService.exportTikTokAdGroups(accountIdNum, {
                ...params,
                export_type: exportType,
            });

            // Close dropdown after a short delay to show success
            setTimeout(() => {
                setShowExportDropdown(false);
            }, 500);
        } catch (error: any) {
            console.error("Failed to export TikTok ad groups:", error);
            const errorMessage =
                error?.response?.data?.error ||
                error?.message ||
                "Failed to export ad groups. Please try again.";
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: errorMessage,
            });
            setShowExportDropdown(false);
        } finally {
            setExportLoading(false);
        }
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
                            isCollapsed={isChartCollapsed}
                            onCollapseToggle={toggleChartCollapse}
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
                                                Apply
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
                                    className="edit-button"
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
                                        {bulkStatusLoading ? "Updating..." : "Bulk Actions"}
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
                                <div className="relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="edit-button"
                                        onClick={(e) => {
                                            if (exportLoading) return;
                                            e.stopPropagation();
                                            setShowExportDropdown((prev) => !prev);
                                            setShowBulkActions(false);
                                            setShowBidPanel(false);
                                        }}
                                        disabled={exportLoading}
                                    >
                                        {exportLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#136D6D]"></div>
                                            </div>
                                        ) : (
                                            <>
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
                                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                <span className="text-[10.64px] text-[#072929] font-normal">
                                                    Export
                                                </span>
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
                                                    {
                                                        value: "current_view",
                                                        label: "Export Current View",
                                                    },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            const exportType =
                                                                opt.value === "all_data"
                                                                    ? "all_data"
                                                                    : "current_view";
                                                            // Keep dropdown open during export
                                                            await handleExport(exportType);
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

                        {/* Ad Groups Table */}
                        <TikTokAdGroupsTable
                            adgroups={adgroups}
                            loading={loading}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            selectedAdgroups={selectedAdgroups}
                            onSelectionChange={handleSelectionChange}
                            summary={summary}
                            onUpdateAdGroupName={handleInlineNameEdit}
                            onUpdateAdGroupStatus={handleInlineStatusEdit}
                            onUpdateAdGroupBudget={handleInlineBudgetEdit}
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

            {/* Status Update Confirmation Modal (matching TikTok Campaigns) */}
            {showConfirmationModal && (pendingStatusAction || isBudgetChange) && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !bulkStatusLoading) {
                            setShowConfirmationModal(false);
                            setPendingStatusAction(null);
                            setIsBudgetChange(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            {isBudgetChange ? "Confirm Budget Changes" : "Confirm Status Changes"}
                        </h3>

                        {/* Summary section */}
                        <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[12.16px] text-[#556179]">
                                    {selectedAdgroups.size} ad group{selectedAdgroups.size !== 1 ? "s" : ""} will be
                                    updated:
                                </span>
                                <span className="text-[12.16px] font-semibold text-[#072929]">
                                    {isBudgetChange ? "Budget" : "Status"} change
                                </span>
                            </div>
                        </div>

                        {/* Ad groups preview table */}
                        {(() => {
                            const selectedAdgroupsData = getSelectedAdgroupsData();
                            const previewCount = Math.min(10, selectedAdgroupsData.length);
                            const hasMore = selectedAdgroupsData.length > 10;

                            return (
                                <div className="mb-6">
                                    <div className="mb-2">
                                        <span className="text-[10.64px] text-[#556179]">
                                            {hasMore
                                                ? `Showing ${previewCount} of ${selectedAdgroupsData.length} selected ad groups`
                                                : `${selectedAdgroupsData.length} ad group${selectedAdgroupsData.length !== 1 ? "s" : ""} selected`}
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
                                                        Current {isBudgetChange ? "Budget" : "Status"}
                                                    </th>
                                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                                        New {isBudgetChange ? "Budget" : "Status"}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedAdgroupsData.slice(0, 10).map((adgroup) => {
                                                    if (isBudgetChange) {
                                                        const oldBudget = adgroup.budget || 0;
                                                        const newBudget = parseFloat(bidValue) || 0;
                                                        return (
                                                            <tr
                                                                key={adgroup.adgroup_id}
                                                                className="border-b border-gray-200 last:border-b-0"
                                                            >
                                                                <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                                                    {adgroup.adgroup_name || "Unnamed Ad Group"}
                                                                </td>
                                                                <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                                                    {formatCurrency(oldBudget)}
                                                                </td>
                                                                <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                                                    {formatCurrency(newBudget)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    } else {
                                                        const oldStatus = adgroup.operation_status || "ENABLE";
                                                        const newStatus = pendingStatusAction === "ENABLE" ? "Enable" : "Pause";
                                                        const oldStatusDisplay =
                                                            oldStatus === "ENABLE"
                                                                ? "Enable"
                                                                : oldStatus === "DISABLE"
                                                                ? "Pause"
                                                                : oldStatus;

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
                                                                    {newStatus}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmationModal(false);
                                    setPendingStatusAction(null);
                                    setIsBudgetChange(false);
                                }}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setShowConfirmationModal(false);
                                    if (isBudgetChange) {
                                        await runBulkBudget();
                                        setShowBidPanel(false);
                                        setBidValue("");
                                    } else if (pendingStatusAction) {
                                        await handleStatusUpdateConfirm();
                                    }
                                    setPendingStatusAction(null);
                                    setIsBudgetChange(false);
                                }}
                                disabled={bulkStatusLoading}
                                className="create-entity-button btn-sm"
                            >
                                {bulkStatusLoading ? "Applying..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            Delete Ad Groups?
                        </h3>

                        <p className="text-[12.16px] text-[#556179] mb-4">
                            You are about to permanently delete {selectedAdgroups.size} selected ad
                            group{selectedAdgroups.size !== 1 ? "s" : ""}. This will stop all ad
                            serving immediately and cannot be undone. Deleted ad groups can still be
                            viewed in reports but not edited or re-enabled.
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

            {/* Inline Edit Confirmation Modal */}
            {showInlineEditModal && inlineEditAdgroup && inlineEditField && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !inlineEditLoading) {
                            setShowInlineEditModal(false);
                            setInlineEditAdgroup(null);
                            setInlineEditField(null);
                            setInlineEditOldValue("");
                            setInlineEditNewValue("");
                        }
                    }}
                >
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            Confirm{" "}
                            {inlineEditField === "operation_status"
                                ? "Status"
                                : inlineEditField === "adgroup_name"
                                ? "Name"
                                : "Budget"}{" "}
                            Change
                        </h3>

                        <div className="mb-4">
                            <p className="text-[12.16px] text-[#556179] mb-2">
                                Ad Group:{" "}
                                <span className="font-semibold text-[#072929]">
                                    {inlineEditAdgroup.adgroup_name || "Unnamed Ad Group"}
                                </span>
                            </p>
                            <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12.16px] text-[#556179]">
                                        {inlineEditField === "operation_status"
                                            ? "Status"
                                            : inlineEditField === "adgroup_name"
                                            ? "Name"
                                            : "Budget"}
                                        :
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12.16px] text-[#556179]">
                                            {inlineEditOldValue}
                                        </span>
                                        <span className="text-[12.16px] text-[#556179]">
                                            →
                                        </span>
                                        <span className="text-[12.16px] font-semibold text-[#072929]">
                                            {inlineEditNewValue}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInlineEditModal(false);
                                    setInlineEditAdgroup(null);
                                    setInlineEditField(null);
                                    setInlineEditOldValue("");
                                    setInlineEditNewValue("");
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
                                {inlineEditLoading ? "Updating..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ isOpen: false, message: "" })}
                title={errorModal.title}
                message={errorModal.message}
                isSuccess={errorModal.isSuccess}
                fieldErrors={errorModal.fieldErrors}
                genericErrors={errorModal.genericErrors}
            />
        </div>
    );
};
