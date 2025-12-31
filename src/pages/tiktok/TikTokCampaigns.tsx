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

    // Filter state
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [nameFilter, setNameFilter] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState<string>("all");



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
            // Refresh campaigns list
            await fetchCampaigns();
        } catch (error) {
            console.error("Failed to create TikTok campaign:", error);
            alert("Failed to create campaign. Please check the console for details.");
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

    // Filter campaigns based on all active filters
    const filteredCampaignsItems = useMemo(() => {
        return campaigns.filter(campaign => {
            // Status filter
            if (statusFilter !== "all") {
                const statusMatch = campaign.operation_status?.toLowerCase() === statusFilter.toLowerCase();
                if (!statusMatch) return false;
            }

            // Name filter
            if (nameFilter.trim() !== "") {
                const nameMatch = campaign.campaign_name.toLowerCase().includes(nameFilter.toLowerCase());
                if (!nameMatch) return false;
            }

            // Type filter
            if (typeFilter !== "all") {
                const typeMatch = campaign.objective_type === typeFilter;
                if (!typeMatch) return false;
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
    }, [campaigns, statusFilter, nameFilter, typeFilter, searchQuery]);

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
                <div className="px-4 py-6 sm:px-6 lg:px-8 bg-white overflow-x-hidden min-w-0">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <h1 className="text-[22px] font-medium text-[#072929]">
                            Campaigns
                        </h1>
                        <div className="flex items-center gap-3">
                            {/* Create Campaign Button */}
                            <button
                                onClick={() => setIsCreatePanelOpen(!isCreatePanelOpen)}
                                className="px-5 py-2.5 bg-[#136D6D] text-white rounded-full text-sm font-medium hover:bg-[#0f5a5a] transition-colors flex items-center gap-2"
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
                            {/* Add Filter Button */}
                            <button
                                onClick={() => {
                                    setIsFilterPanelOpen(!isFilterPanelOpen);
                                    if (!isFilterPanelOpen) setIsCreatePanelOpen(false);
                                }}
                                className={`px-4 py-2.5 border rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${isFilterPanelOpen
                                    ? "bg-[#136D6D] text-white border-[#136D6D]"
                                    : "bg-[#FEFEFB] border-[#E3E3E3] text-[#072929] hover:bg-gray-50"
                                    }`}
                            >
                                <svg className={`w-4 h-4 ${isFilterPanelOpen ? "text-white" : "text-[#556179]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Add Filter
                                <svg
                                    className={`w-4 h-4 transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {isFilterPanelOpen && (
                        <div className="bg-[#FEFEFB] rounded-xl border border-[#E8E8E3] p-4 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[14px] font-medium text-[#072929]">Filters</h3>
                                <button
                                    onClick={() => setIsFilterPanelOpen(false)}
                                    className="text-[#556179] hover:text-[#072929] transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex flex-wrap items-end gap-6">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] text-[#556179]">Campaign Name</label>
                                    <input
                                        type="text"
                                        placeholder="Filter by name..."
                                        value={nameFilter}
                                        onChange={(e) => setNameFilter(e.target.value)}
                                        className="px-3 py-2 border border-[#E8E8E3] rounded-lg bg-white text-sm text-[#072929] min-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] text-[#556179]">Type</label>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="px-3 py-2 border border-[#E8E8E3] rounded-lg bg-white text-sm text-[#072929] min-w-[150px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="TRAFFIC">Traffic</option>
                                        <option value="CONVERSIONS">Website Conversions</option>
                                        <option value="APP_PROMOTION">App Promotion</option>
                                        <option value="REACH">Reach</option>
                                        <option value="VIDEO_VIEWS">Video Views</option>
                                        <option value="LEAD_GENERATION">Lead Generation</option>
                                        <option value="PRODUCT_SALES">Product Sales</option>
                                        <option value="ENGAGEMENT">Engagement</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[12px] text-[#556179]">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3 py-2 border border-[#E8E8E3] rounded-lg bg-white text-sm text-[#072929] min-w-[150px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="enable">Enabled</option>
                                        <option value="disable">Disabled</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => {
                                        setStatusFilter("all");
                                        setNameFilter("");
                                        setTypeFilter("all");
                                    }}
                                    className="text-sm text-[#136D6D] hover:underline pb-2"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Create Campaign Panel */}
                    <CreateTikTokCampaignPanel
                        isOpen={isCreatePanelOpen}
                        onClose={() => setIsCreatePanelOpen(false)}
                        onSubmit={handleCreateCampaign}
                        loading={createLoading}
                    />

                    {/* Performance Trends Chart */}
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

                    {/* Campaigns Overview Card */}
                    <div className="bg-[#FEFEFB] rounded-xl border border-[#E8E8E3] p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <h2 className="text-[16px] font-medium text-[#072929]">Campaigns Overview</h2>
                            <div className="flex items-center gap-3">
                                {/* Search Input */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search by Name or Account ID"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2.5 border border-[#E8E8E3] rounded-lg text-sm w-72 bg-[#F9F9F6] placeholder-[#556179] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                                    />
                                    <svg
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#556179]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                {/* Edit Button */}
                                <button className="px-4 py-2.5 border border-[#E8E8E3] text-[#072929] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 bg-[#F9F9F6]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span className="text-sm font-medium">Edit</span>
                                </button>
                                {/* Export Button */}
                                <button className="px-4 py-2.5 border border-[#E8E8E3] text-[#072929] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 bg-[#F9F9F6]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </button>
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
                            <div className="flex items-center justify-end mt-4 pt-4 border-t border-[#E8E8E3]">
                                <div className="flex items-center gap-2 text-sm text-[#556179]">
                                    <span>Page</span>
                                    <select
                                        value={page}
                                        onChange={(e) => handlePageChange(parseInt(e.target.value))}
                                        className="px-2 py-1 border border-[#E8E8E3] rounded bg-[#F9F9F6] text-[#072929]"
                                    >
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                    <span>of {totalPages} Result</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
