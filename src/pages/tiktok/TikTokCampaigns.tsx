import React, { useState, useEffect, useCallback } from "react";
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

    // Summary stats
    const [summary, setSummary] = useState({
        total_campaigns: 0,
        total_budget: 0,
        active_campaigns: 0,
        paused_campaigns: 0,
    });

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

                // Calculate summary
                const activeCampaigns = response.campaigns.filter(
                    (c: TikTokCampaign) => c.operation_status?.toLowerCase() === "enable"
                ).length;
                const pausedCampaigns = response.campaigns.filter(
                    (c: TikTokCampaign) => c.operation_status?.toLowerCase() === "disable"
                ).length;
                const totalBudget = response.campaigns.reduce(
                    (sum: number, c: TikTokCampaign) => sum + (c.budget || 0),
                    0
                );

                setSummary({
                    total_campaigns: response.total,
                    total_budget: totalBudget,
                    active_campaigns: activeCampaigns,
                    paused_campaigns: pausedCampaigns,
                });
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

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
                            <button className="px-4 py-2.5 bg-[#FEFEFB] border border-[#E3E3E3] rounded-full text-sm font-medium text-[#072929] flex items-center gap-2 hover:bg-gray-50 transition-colors">
                                <svg className="w-4 h-4 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Add Filter
                            </button>
                        </div>
                    </div>

                    {/* Create Campaign Panel */}
                    <CreateTikTokCampaignPanel
                        isOpen={isCreatePanelOpen}
                        onClose={() => setIsCreatePanelOpen(false)}
                        onSubmit={handleCreateCampaign}
                        loading={createLoading}
                    />

                    {/* Performance Trends Card */}
                    <div className="bg-[#FEFEFB] rounded-xl border border-[#E8E8E3] p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[16px] font-medium text-[#072929]">Performance Trends</h2>
                            <div className="flex items-center gap-3">
                                {/* Conversion, Spend dropdown */}
                                <div className="relative">
                                    <select className="appearance-none px-4 py-2 pr-8 text-sm border border-[#E3E3E3] rounded-full bg-[#FEFEFB] text-[#556179] cursor-pointer hover:bg-gray-50">
                                        <option>Conversions, Spend</option>
                                        <option>Sales, Spend</option>
                                        <option>Impressions, Clicks</option>
                                    </select>
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#556179] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Budget Summary */}
                        <div className="mb-6">
                            <div className="flex items-baseline gap-3">
                                <span className="text-[32px] font-semibold text-[#072929]">{formatCurrency(summary.total_budget)}</span>
                                <span className="px-2 py-1 bg-[#E0FAEC] text-[#1FC16B] text-sm font-medium rounded-full flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                                    </svg>
                                    0.48%
                                </span>
                            </div>
                        </div>

                        {/* Chart Placeholder */}
                        <div className="h-[200px] relative">
                            {/* Chart Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="border-t border-dashed border-[#E8E8E3]" />
                                ))}
                            </div>
                            {/* Chart will be rendered here */}
                            <div className="absolute inset-0 flex items-center justify-center text-[#97A0AF]">
                                Performance chart will be displayed here
                            </div>
                        </div>

                        {/* X-Axis Labels */}
                        <div className="flex justify-between mt-4 text-xs text-[#97A0AF]">
                            <span>45k</span>
                            <span>40k</span>
                            <span>35k</span>
                            <span>30k</span>
                            <span>25k</span>
                            <span>20k</span>
                        </div>
                    </div>

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
                            campaigns={campaigns}
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
