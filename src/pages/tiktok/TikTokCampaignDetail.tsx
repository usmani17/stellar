import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { KPICard } from "../../components/ui/KPICard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import type { FilterValues } from "../../components/filters/FilterPanel";
import {
    TikTokOverviewTab,
    TikTokCampaignDetailAdGroupsTab,
    TikTokCampaignDetailLogsTab,
    type TikTokAdGroup,
} from "./components/tabs";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";

interface TikTokCampaignDetailData {
    campaign: {
        campaign_id: string;
        campaign_name: string;
        advertiser_id: string;
        budget: number;
        operation_status: string;
        objective_type?: string;
        create_time?: string;
        budget_mode?: string;
        start_time?: string;
    };
    chart_data?: Array<{
        date: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
    }>;
    kpi_cards?: Array<{
        label: string;
        value: string;
        change?: string;
        isPositive?: boolean;
    }>;
}

export const TikTokCampaignDetail: React.FC = () => {
    const { accountId, campaignId } = useParams<{
        accountId: string;
        campaignId: string;
    }>();
    const { startDate, endDate } = useDateRange();
    const { sidebarWidth } = useSidebar();
    const [activeTab, setActiveTab] = useState("Overview");
    const [loading, setLoading] = useState(true);
    const [campaignDetail, setCampaignDetail] = useState<TikTokCampaignDetailData | null>(null);

    // Ad Groups State
    const [adgroups, setAdgroups] = useState<TikTokAdGroup[]>([]);
    const [adgroupsLoading, setAdgroupsLoading] = useState(false);
    const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<string>>(new Set());
    const [adgroupsCurrentPage, setAdgroupsCurrentPage] = useState(1);
    const [adgroupsTotalPages, setAdgroupsTotalPages] = useState(0);
    const [adgroupsSortBy, setAdgroupsSortBy] = useState<string>("spend"); // default sort
    const [adgroupsSortOrder, setAdgroupsSortOrder] = useState<"asc" | "desc">("desc");
    const [isAdGroupsFilterPanelOpen, setIsAdGroupsFilterPanelOpen] = useState(false);
    const [adgroupsFilters, setAdgroupsFilters] = useState<FilterValues>([]);


    // Chart State
    const [chartToggles, setChartToggles] = useState({
        spend: true,
        impressions: true,
        clicks: false,
        conversions: false,
    });

    const tabs = ["Overview", "Ad Groups", "Ads", "Logs"];

    // Set Page Title
    useEffect(() => {
        const title = campaignDetail?.campaign?.campaign_name || "TikTok Campaign Detail";
        setPageTitle(title);
        return () => resetPageTitle();
    }, [campaignDetail]);

    // Initial Load & Refresh on Date/ID Change
    useEffect(() => {
        if (accountId && campaignId) {
            loadCampaignDetail();
        }
    }, [accountId, campaignId, startDate, endDate]);

    // Fetch Campaign Detail
    const loadCampaignDetail = async () => {
        try {
            setLoading(true);
            const accountIdNum = parseInt(accountId!, 10);
            const campaignIdNum = parseInt(campaignId!, 10); // Check if backend expects string or num

            if (isNaN(accountIdNum) || !campaignId) return;

            const data = await campaignsService.getTikTokCampaignDetail(
                accountIdNum,
                campaignIdNum, // Assuming service handles number/string conversion if needed
                startDate?.toISOString().split('T')[0],
                endDate?.toISOString().split('T')[0]
            );
            setCampaignDetail(data);
        } catch (error) {
            console.error("Failed to load TikTok campaign detail:", error);
        } finally {
            setLoading(false);
        }
    };

    // Lazy Load Tab Data
    useEffect(() => {
        if (activeTab === "Ad Groups" && accountId && campaignId) {
            loadAdGroups();
        }
    }, [activeTab, accountId, campaignId, startDate, endDate, adgroupsCurrentPage, adgroupsSortBy, adgroupsSortOrder, adgroupsFilters]);


    const loadAdGroups = async () => {
        try {
            setAdgroupsLoading(true);
            const accountIdNum = parseInt(accountId!, 10);
            // Logic to build filters...

            const data = await campaignsService.getTikTokAdGroups(
                accountIdNum,
                {
                    campaign_id: campaignId,
                    page: adgroupsCurrentPage,
                    page_size: 10,
                    sort_by: adgroupsSortBy,
                    order: adgroupsSortOrder,
                    start_date: startDate?.toISOString().split('T')[0],
                    end_date: endDate?.toISOString().split('T')[0],
                    // Add other filters
                }
            );
            setAdgroups(data.adgroups || []);
            setAdgroupsTotalPages(data.total_pages || 0);

        } catch (error) {
            console.error("Failed to load ad groups:", error);
        } finally {
            setAdgroupsLoading(false);
        }
    };


    const handleSortAdGroups = (column: string) => {
        if (adgroupsSortBy === column) {
            setAdgroupsSortOrder(adgroupsSortOrder === "asc" ? "desc" : "asc");
        } else {
            setAdgroupsSortBy(column);
            setAdgroupsSortOrder("desc");
        }
    };


    if (loading && !campaignDetail) {
        return <div className="p-8 text-center text-gray-500">Loading Campaign...</div>;
    }

    if (!campaignDetail) {
        return <div className="p-8 text-center text-red-500">Campaign not found.</div>;
    }

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />

            <div
                className="flex-1 min-w-0 w-full transition-all duration-300"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <DashboardHeader />

                <div className="p-8 bg-white space-y-6 overflow-x-hidden">
                    {/* Page Header */}
                    <div>
                        <h1 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                            {loading
                                ? "Loading..."
                                : campaignDetail.campaign.campaign_name}
                        </h1>
                    </div>

                    {/* Campaign Info Block - Amazon Style Ref */}
                    <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6 mb-6">
                        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">
                            Campaign Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                            {/* Campaign Name */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Campaign Name
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] truncate" title={campaignDetail.campaign.campaign_name}>
                                    {campaignDetail.campaign.campaign_name}
                                </div>
                            </div>

                            {/* Campaign ID */}
                            {/* Campaign ID */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Campaign ID
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-mono">
                                    {campaignDetail.campaign.campaign_id}
                                </div>
                            </div>

                            {/* Status */}
                            {/* Status */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Status
                                </label>
                                <div>
                                    <StatusBadge status={campaignDetail.campaign.operation_status} />
                                </div>
                            </div>

                            {/* Budget */}
                            {/* Budget */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Budget
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(campaignDetail.campaign.budget)}
                                </div>
                            </div>

                            {/* Start Date */}
                            {/* Start Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Start Date
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                    {campaignDetail.campaign.start_time
                                        ? new Date(campaignDetail.campaign.start_time).toLocaleDateString()
                                        : (campaignDetail.campaign.create_time ? new Date(campaignDetail.campaign.create_time).toLocaleDateString() : "-")}
                                </div>
                            </div>

                            {/* Objective Type */}
                            {/* Objective Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Objective Type
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] capitalize">
                                    {campaignDetail.campaign.objective_type?.replace(/_/g, " ").toLowerCase() || "-"}
                                </div>
                            </div>

                            {/* Budget Type */}
                            {/* Budget Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Budget Type
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] capitalize">
                                    {campaignDetail.campaign.budget_mode?.replace(/_/g, " ").toLowerCase() || "Daily"}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {campaignDetail.kpi_cards?.map((card, idx) => (
                            <KPICard
                                key={idx}
                                label={card.label}
                                value={card.value}
                                change={card.change}
                                isPositive={card.isPositive}
                            />
                        ))}
                    </div>

                    {/* Tabs Navigation */}
                    <div className="bg-[#fefefb] border-b border-[#e8e8e3]">
                        <div className="flex gap-6 px-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 text-[13.3px] font-medium border-b-2 transition-colors ${activeTab === tab
                                        ? "border-[#136D6D] text-[#136D6D]"
                                        : "border-transparent text-[#556179] hover:text-[#29303f]"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="mt-6">
                        {activeTab === "Overview" && (
                            <TikTokOverviewTab
                                chartData={campaignDetail.chart_data || []}
                                chartToggles={chartToggles}
                                onToggleChartMetric={(metric) =>
                                    setChartToggles((prev) => ({ ...prev, [metric]: !prev[metric as keyof typeof prev] }))
                                }
                                metrics={[
                                    {
                                        key: "spend",
                                        label: "Spend",
                                        color: "#136D6D",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
                                    },
                                    {
                                        key: "impressions",
                                        label: "Impressions",
                                        color: "#F59E0B",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                    {
                                        key: "clicks",
                                        label: "Clicks",
                                        color: "#3B82F6",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                    {
                                        key: "conversions",
                                        label: "Conversions",
                                        color: "#10B981",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                ]}
                            />
                        )}

                        {activeTab === "Ad Groups" && (
                            <TikTokCampaignDetailAdGroupsTab
                                adgroups={adgroups}
                                loading={adgroupsLoading}
                                selectedAdGroupIds={selectedAdGroupIds}
                                onSelectAll={(checked) => {
                                    if (checked) setSelectedAdGroupIds(new Set(adgroups.map(ag => ag.adgroup_id)));
                                    else setSelectedAdGroupIds(new Set());
                                }}
                                onSelectAdGroup={(id, checked) => {
                                    const newSet = new Set(selectedAdGroupIds);
                                    if (checked) newSet.add(id);
                                    else newSet.delete(id);
                                    setSelectedAdGroupIds(newSet);
                                }}
                                sortBy={adgroupsSortBy}
                                sortOrder={adgroupsSortOrder}
                                onSort={handleSortAdGroups}
                                currentPage={adgroupsCurrentPage}
                                totalPages={adgroupsTotalPages}
                                onPageChange={setAdgroupsCurrentPage}
                                isFilterPanelOpen={isAdGroupsFilterPanelOpen}
                                onToggleFilterPanel={() => setIsAdGroupsFilterPanelOpen(!isAdGroupsFilterPanelOpen)}
                                filters={adgroupsFilters}
                                onApplyFilters={setAdgroupsFilters}
                            />
                        )}


                        {activeTab === "Logs" && <TikTokCampaignDetailLogsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};
