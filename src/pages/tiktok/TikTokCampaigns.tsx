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
                <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
                    <div className="space-y-6">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                                Campaigns
                            </h1>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsCreatePanelOpen(!isCreatePanelOpen)}
                                    className="px-4 py-2 bg-forest-f60 text-white rounded-lg hover:bg-forest-f70 transition-colors flex items-center gap-2 h-10"
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
                                <button className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors">
                                    <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    <span className="text-[#072929] text-sm font-medium">Add Filter</span>
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
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[16px] font-medium text-[#072929]">Performance Trends</h2>
                                <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white">
                                    <option>Sales, Spend</option>
                                    <option>Impressions, Clicks</option>
                                    <option>ROAS, CPA</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <span className="text-[28px] font-semibold text-[#072929]">{formatCurrency(summary.total_budget)}</span>
                                <span className="ml-2 text-sm text-green-600">↗ 0.48%</span>
                            </div>
                            <div className="h-48 flex items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                                Performance chart will be displayed here
                            </div>
                        </div>

                        {/* Campaigns Overview Card */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                <h2 className="text-[16px] font-medium text-[#072929]">Campaigns Overview</h2>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Account ID"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 bg-background-field"
                                        />
                                        <svg
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <button className="px-3 py-2 border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 h-10">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </button>
                                    <button
                                        onClick={fetchCampaigns}
                                        className="p-2 border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-50 transition-colors h-10"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                                <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>Page</span>
                                        <select
                                            value={page}
                                            onChange={(e) => handlePageChange(parseInt(e.target.value))}
                                            className="px-2 py-1 border border-gray-300 rounded"
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
        </div>
    );
};
