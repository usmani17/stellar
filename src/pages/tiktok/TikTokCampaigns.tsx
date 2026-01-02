import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import { TikTokCampaignsTable, type TikTokCampaign } from "./components/TikTokCampaignsTable";
import {
    CreateTikTokCampaignPanel,
    type CreateTikTokCampaignData,
} from "../../components/campaigns/CreateTikTokCampaignPanel";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { Button } from "../../components/ui";
import { Dropdown } from "../../components/ui/Dropdown";
import { ErrorModal } from "../../components/ui/ErrorModal";
import {
    FilterSection,
    FilterSectionPanel,
} from "../../components/filters/FilterSection";
import { type FilterValues } from "../../components/filters/FilterPanel";

// TikTok Campaign Filter Fields
const TIKTOK_CAMPAIGN_FILTER_FIELDS = [
    { value: "campaign_name", label: "Campaign Name" },
    { value: "state", label: "Status" },
    { value: "type", label: "Objective Type" },
    { value: "budget", label: "Budget" },
];

export const TikTokCampaigns: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const { sidebarWidth } = useSidebar();

    // State
    const [campaigns, setCampaigns] = useState<TikTokCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortColumn, setSortColumn] = useState<string>("campaign_name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [searchQuery, setSearchQuery] = useState("");

    // Create Campaign state
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    // Filter state - using FilterPanel compatible state
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterValues>([]);

    // Error modal state
    const [errorModal, setErrorModal] = useState<{
        isOpen: boolean;
        message: string;
        title?: string;
        isSuccess?: boolean;
    }>({ isOpen: false, message: "" });

    // Chart toggles
    const [chartToggles, setChartToggles] = useState({
        spend: true,
        conversions: true,
        impressions: false,
        clicks: false,
        ctr: false,
        cpc: false,
    });

    // Toggle chart metric
    const toggleChartMetric = (metric: string) => {
        setChartToggles(prev => ({
            ...prev,
            [metric]: !prev[metric as keyof typeof prev]
        }));
    };

    const fetchCampaigns = useCallback(async () => {
        if (!accountId) return;

        setLoading(true);
        try {
            const response = await campaignsService.getTikTokCampaigns(
                parseInt(accountId),
                {
                    page,
                    page_size: pageSize,
                }
            );

            if (response && response.campaigns) {
                setCampaigns(response.campaigns);
                setTotal(response.total);
            }
        } catch (error) {
            console.error("Failed to fetch TikTok campaigns:", error);
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Failed to fetch campaigns. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    }, [accountId, page, pageSize]);

    useEffect(() => {
        setPageTitle("TikTok Campaigns");
        return () => resetPageTitle();
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleCreateCampaign = async (data: CreateTikTokCampaignData) => {
        if (!accountId) return;

        setCreateLoading(true);
        try {
            await campaignsService.createTikTokCampaign(parseInt(accountId), data);
            setIsCreatePanelOpen(false);
            setErrorModal({
                isOpen: true,
                title: "Success",
                message: "Campaign created successfully!",
                isSuccess: true,
            });
            // Refresh campaigns list
            await fetchCampaigns();
        } catch (error) {
            console.error("Failed to create TikTok campaign:", error);
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Failed to create campaign. Please check the console for details.",
            });
        } finally {
            setCreateLoading(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    // Generate sample chart data for visualization
    const chartData = useMemo(() => {
        const days = 14;
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // Generate realistic-looking sample data
            const baseSpend = 3000 + Math.random() * 2000;
            const baseConversions = 150 + Math.random() * 100;
            const baseImpressions = 50000 + Math.random() * 30000;
            const baseClicks = 2000 + Math.random() * 1500;

            data.push({
                date: dateStr,
                spend: Math.round(baseSpend),
                conversions: Math.round(baseConversions),
                impressions: Math.round(baseImpressions),
                clicks: Math.round(baseClicks),
                ctr: parseFloat(((baseClicks / baseImpressions) * 100).toFixed(2)),
                cpc: parseFloat((baseSpend / baseClicks).toFixed(2)),
            });
        }
        return data;
    }, []);

    // Filter campaigns based on FilterPanel filters and search query
    const filteredCampaignsItems = useMemo(() => {
        return campaigns.filter(campaign => {
            // Apply filters from FilterPanel
            for (const filter of filters) {
                if (filter.field === "campaign_name") {
                    const nameMatch = campaign.campaign_name.toLowerCase().includes(String(filter.value).toLowerCase());
                    if (filter.operator === "contains" && !nameMatch) return false;
                    if (filter.operator === "not_contains" && nameMatch) return false;
                    if (filter.operator === "equals" && campaign.campaign_name.toLowerCase() !== String(filter.value).toLowerCase()) return false;
                }
                if (filter.field === "state") {
                    const statusNormalized = campaign.operation_status?.toLowerCase() === "enable" ? "ENABLED" :
                        campaign.operation_status?.toLowerCase() === "disable" ? "PAUSED" : campaign.operation_status;
                    if (statusNormalized !== filter.value) return false;
                }
                if (filter.field === "type") {
                    if (campaign.objective_type !== filter.value) return false;
                }
                if (filter.field === "budget") {
                    const budgetValue = campaign.budget || 0;
                    const filterValue = Number(filter.value);
                    if (filter.operator === "gt" && budgetValue <= filterValue) return false;
                    if (filter.operator === "lt" && budgetValue >= filterValue) return false;
                    if (filter.operator === "eq" && budgetValue !== filterValue) return false;
                    if (filter.operator === "gte" && budgetValue < filterValue) return false;
                    if (filter.operator === "lte" && budgetValue > filterValue) return false;
                }
            }

            // Search query (from top search bar)
            if (searchQuery.trim() !== "") {
                const searchMatch =
                    campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    campaign.campaign_id?.toString().includes(searchQuery);
                if (!searchMatch) return false;
            }

            return true;
        });
    }, [campaigns, filters, searchQuery]);

    return (
        <div className="min-h-screen bg-white flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div
                className="flex-1 min-w-0 w-full"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                {/* Header */}
                <DashboardHeader />

                {/* Main Content Area */}
                <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
                    <div className="space-y-6">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                                TikTok Campaign Manager
                            </h1>
                            <div className="flex items-center gap-3">
                                {/* Create Campaign Button */}
                                <button
                                    onClick={() => setIsCreatePanelOpen(!isCreatePanelOpen)}
                                    className="px-3 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] hover:text-white transition-colors flex items-center gap-2 h-10"
                                >
                                    Create Campaign
                                    <svg
                                        className={`w-4 h-4 transition-transform ${isCreatePanelOpen ? "rotate-180" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {/* Add Filter Button - Using FilterSection component */}
                                <FilterSection
                                    isOpen={isFilterPanelOpen}
                                    onToggle={() => {
                                        setIsFilterPanelOpen(!isFilterPanelOpen);
                                        if (!isFilterPanelOpen) setIsCreatePanelOpen(false);
                                    }}
                                    filters={filters}
                                    onApply={() => { }} // Handled by FilterSectionPanel
                                    filterFields={TIKTOK_CAMPAIGN_FILTER_FIELDS}
                                    initialFilters={filters}
                                />
                            </div>
                        </div>

                        {/* Create Campaign Panel */}
                        {isCreatePanelOpen && (
                            <div className="relative z-30">
                                <CreateTikTokCampaignPanel
                                    isOpen={isCreatePanelOpen}
                                    onClose={() => setIsCreatePanelOpen(false)}
                                    onSubmit={handleCreateCampaign}
                                    loading={createLoading}
                                />
                            </div>
                        )}

                        {/* Filter Panel - Using FilterSectionPanel component */}
                        <FilterSectionPanel
                            isOpen={isFilterPanelOpen}
                            onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            filters={filters}
                            onApply={(newFilters) => {
                                setFilters(newFilters);
                                setPage(1); // Reset to first page when applying filters
                            }}
                            filterFields={TIKTOK_CAMPAIGN_FILTER_FIELDS}
                            initialFilters={filters}
                            accountId={accountId}
                            channelType="tiktok"
                        />

                        {/* Performance Trends Chart */}
                        <div className="relative">
                            <PerformanceChart
                                data={chartData}
                                toggles={chartToggles}
                                onToggle={toggleChartMetric}
                                title="Performance Trends"
                                metrics={[
                                    { key: "spend", label: "Spend", color: "#136D6D" },
                                    { key: "conversions", label: "Conversions", color: "#FF6B6B" },
                                    { key: "impressions", label: "Impressions", color: "#7C3AED" },
                                    { key: "clicks", label: "Clicks", color: "#169aa3" },
                                    { key: "ctr", label: "CTR", color: "#F59E0B" },
                                    { key: "cpc", label: "CPC", color: "#059669" },
                                ]}
                            />
                            {isCreatePanelOpen && (
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-20 rounded-[12px] cursor-not-allowed" />
                            )}
                        </div>

                        {/* Campaigns Overview Card */}
                        <div className="bg-[#f9f9f6] rounded-[12px] border border-[#e8e8e3] p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <h2 className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">Campaigns Overview</h2>
                                <div className="flex items-center gap-3">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Account ID"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-[#e8e8e3] rounded-lg text-[13.3px] w-72 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                                        />
                                        <svg
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    {/* Edit Button */}
                                    <Button
                                        variant="ghost"
                                        className="px-3 py-2 bg-[#FEFEFB] border border-[#e8e8e3] rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[13.3px] text-[#29303f] font-normal"
                                    >
                                        <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        <span className="text-[13.3px] text-[#29303f] font-normal">Edit</span>
                                    </Button>
                                    {/* Export Button */}
                                    <Button
                                        variant="ghost"
                                        className="px-3 py-2 bg-[#FEFEFB] border border-[#e8e8e3] rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[13.3px] text-[#29303f] font-normal"
                                    >
                                        <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <TikTokCampaignsTable
                                campaigns={filteredCampaignsItems}
                                loading={loading}
                                onSort={handleSort}
                                sortColumn={sortColumn}
                                sortDirection={sortDirection}
                            />

                            {/* Pagination */}
                            {total > 0 && (
                                <div className="flex items-center justify-end mt-4 pt-4 border-t border-[#e8e8e3]">
                                    <div className="flex items-center gap-2 text-[13.3px] text-[#556179]">
                                        <span>Page</span>
                                        <Dropdown
                                            options={Array.from({ length: totalPages }, (_, i) => ({
                                                value: (i + 1).toString(),
                                                label: (i + 1).toString()
                                            }))}
                                            value={page.toString()}
                                            onChange={(val) => handlePageChange(parseInt(val as string))}
                                            width="w-16"
                                        />
                                        <span>of {totalPages} Result</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ isOpen: false, message: "" })}
                title={errorModal.title}
                message={errorModal.message}
                isSuccess={errorModal.isSuccess}
            />
        </div>
    );
};
