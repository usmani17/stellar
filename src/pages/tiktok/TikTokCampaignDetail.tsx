import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { KPICard } from "../../components/ui/KPICard";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import type { FilterValues } from "../../components/filters/FilterPanel";
import {
    TikTokOverviewTab,
    TikTokCampaignDetailAdGroupsTab,
    TikTokCampaignDetailAdsTab,
    TikTokCampaignDetailLogsTab,
    type TikTokAdGroup,
    type TikTokAd,
} from "./components/tabs";
import type { TikTokAdInput } from "../../components/tiktok/CreateTikTokAdPanel";
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
        start_date?: string;
        end_date?: string;
    };
    chart_data?: Array<{
        date: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        sales?: number;
    }>;
    kpi_cards?: Array<{
        label: string;
        value: string;
        change?: string;
        isPositive?: boolean;
    }>;
    top_ads?: Array<{
        ad_name: string;
        ad_id: string;
        spends: string;
        sales: string;
        clicks: number;
        impressions: number;
        ctr: string;
        status: string;
    }>;
    top_products?: Array<{
        name: string;
        asin?: string;
        sales: string;
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

    const [isCreateAdGroupPanelOpen, setIsCreateAdGroupPanelOpen] = useState(false);

    // Chart State
    const [chartToggles, setChartToggles] = useState({
        sales: true,
        spend: true,
        impressions: false,
        clicks: false,
    });


    // Ads State
    const [ads, setAds] = useState<TikTokAd[]>([]);
    const [adsLoading, setAdsLoading] = useState(false);
    const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
    const [adsCurrentPage, setAdsCurrentPage] = useState(1);
    const [adsTotalPages, setAdsTotalPages] = useState(0);
    const [adsSortBy, setAdsSortBy] = useState<string>("spend"); // default sort
    const [adsSortOrder, setAdsSortOrder] = useState<"asc" | "desc">("desc");
    const [isAdsFilterPanelOpen, setIsAdsFilterPanelOpen] = useState(false);
    const [adsFilters, setAdsFilters] = useState<FilterValues>([]);

    // Create Ad Panel State
    const [isCreateAdPanelOpen, setIsCreateAdPanelOpen] = useState(false);
    const [selectedAdGroupForAd, setSelectedAdGroupForAd] = useState<string>("");
    const [createAdLoading, setCreateAdLoading] = useState(false);
    const [createAdError, setCreateAdError] = useState<string | null>(null);

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

            if (isNaN(accountIdNum) || !campaignId) return;

            // campaignId is a string (TikTok campaign IDs are strings, not numbers)
            const data = await campaignsService.getTikTokCampaignDetail(
                accountIdNum,
                campaignId, // Pass as string, not parsed as number
                startDate?.toISOString().split('T')[0],
                endDate?.toISOString().split('T')[0]
            );
            setCampaignDetail(data);
        } catch (error: any) {
            console.error("Failed to load TikTok campaign detail:", error);
            const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to load campaign";
            console.error("Error details:", {
                status: error?.response?.status,
                error: errorMessage,
                campaignId,
                accountId
            });
            // Set campaign detail to null to show "Campaign not found" message
            setCampaignDetail(null);
        } finally {
            setLoading(false);
        }
    };

    // Lazy Load Tab Data
    useEffect(() => {
        if (activeTab === "Ad Groups" && accountId && campaignId) {
            loadAdGroups();
        } else if (activeTab === "Ads" && accountId && campaignId) {
            loadAds();
            // Also load ad groups so we have an adgroupId for Create Ad button
            if (adgroups.length === 0) {
                loadAdGroups();
            }
        }
    }, [activeTab, accountId, campaignId, startDate, endDate, adgroupsCurrentPage, adgroupsSortBy, adgroupsSortOrder, adgroupsFilters, adsCurrentPage, adsSortBy, adsSortOrder, adsFilters]);


    const loadAdGroups = async () => {
        try {
            setAdgroupsLoading(true);
            const accountIdNum = parseInt(accountId!, 10);
            // Logic to build filters...

            const params: any = {
                campaign_id: campaignId,
                page: adgroupsCurrentPage,
                page_size: 10,
                sort_by: adgroupsSortBy,
                order: adgroupsSortOrder,
                start_date: startDate?.toISOString().split('T')[0],
                end_date: endDate?.toISOString().split('T')[0],
            };

            // Apply filters
            adgroupsFilters.forEach((filter) => {
                if (filter.field === "adgroup_name") {
                    params.adgroup_name__icontains = filter.value;
                } else if (filter.field === "state") {
                    const val = String(filter.value).toUpperCase();
                    if (val === "ENABLED") params.operation_status = "ENABLE";
                    else if (val === "PAUSED") params.operation_status = "DISABLE";
                    else params.operation_status = filter.value;
                }
            });

            const data = await campaignsService.getTikTokAdGroups(
                accountIdNum,
                params
            );
            setAdgroups(data.adgroups || []);
            setAdgroupsTotalPages(data.total_pages || 0);

        } catch (error) {
            console.error("Failed to load ad groups:", error);
        } finally {
            setAdgroupsLoading(false);
        }
    };

    const loadAds = async () => {
        try {
            setAdsLoading(true);
            const accountIdNum = parseInt(accountId!, 10);

            const params: any = {
                campaign_id: campaignId,
                page: adsCurrentPage,
                page_size: 10,
                sort_by: adsSortBy,
                order: adsSortOrder,
                start_date: startDate?.toISOString().split('T')[0],
                end_date: endDate?.toISOString().split('T')[0],
            };

            // Apply filters
            adsFilters.forEach((filter) => {
                if (filter.field === "ad_name") {
                    params.ad_name__icontains = filter.value;
                } else if (filter.field === "state") {
                    const val = String(filter.value).toUpperCase();
                    if (val === "ENABLED") params.operation_status = "ENABLE";
                    else if (val === "PAUSED") params.operation_status = "DISABLE";
                    else params.operation_status = filter.value;
                }
            });

            const data = await campaignsService.getTikTokAds(
                accountIdNum,
                params
            );
            setAds(data.ads || []);
            setAdsTotalPages(data.total_pages || 0);

        } catch (error) {
            console.error("Failed to load ads:", error);
        } finally {
            setAdsLoading(false);
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

    const handleSortAds = (column: string) => {
        if (adsSortBy === column) {
            setAdsSortOrder(adsSortOrder === "asc" ? "desc" : "asc");
        } else {
            setAdsSortBy(column);
            setAdsSortOrder("desc");
        }
    };

    const handleCreateAd = async (data: TikTokAdInput) => {
        if (!accountId) return;

        setCreateAdLoading(true);
        setCreateAdError(null);

        try {
            await campaignsService.createTikTokAd(parseInt(accountId), data);
            setIsCreateAdPanelOpen(false);
            // Refresh ads list
            loadAds();
        } catch (error: any) {
            console.error("Failed to create ad:", error);
            setCreateAdError(error.message || "Failed to create ad");
        } finally {
            setCreateAdLoading(false);
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

                    {/* Campaign Info Block - Amazon Style */}
                    <div className="h-64 p-6 bg-[#F9F9F6] rounded-2xl border border-[#E3E3E3] flex flex-col justify-start items-start gap-4 mb-6">
                        {/* Title */}
                        <div className="self-stretch text-teal-950 text-2xl font-medium">
                            Campaign Information
                        </div>

                        {/* Three Column Layout */}
                        <div className="self-stretch flex-1 flex justify-start items-start gap-32">
                            {/* Column 1 */}
                            <div className="flex flex-col justify-start items-start gap-4">
                                {/* Campaign Name */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Campaign Name
                                    </div>
                                    <div className="self-stretch text-teal-950 text-sm font-normal leading-5 tracking-tight">
                                        {campaignDetail.campaign.campaign_name}
                                    </div>
                                </div>

                                {/* Budget */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Budget
                                    </div>
                                    <div className="self-stretch text-teal-950 text-sm font-normal leading-5 tracking-tight">
                                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(campaignDetail.campaign.budget || 0)}
                                    </div>
                                </div>

                                {/* Budget Type */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Budget Type
                                    </div>
                                    <div className="self-stretch text-teal-950 text-sm font-normal leading-5 tracking-tight">
                                        {campaignDetail.campaign.budget_mode
                                            ? campaignDetail.campaign.budget_mode.replace(/_/g, " ").replace("BUDGET MODE ", "").replace("DYNAMIC DAILY BUDGET", "Daily").replace("TOTAL", "Lifetime").replace("DAY", "Daily")
                                            : "Daily"}
                                    </div>
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="flex-1 flex flex-col justify-start items-start gap-4">
                                {/* Campaign ID */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Campaign ID
                                    </div>
                                    <div className="self-stretch text-teal-950 text-sm font-normal leading-5 tracking-tight">
                                        {campaignDetail.campaign.campaign_id}
                                    </div>
                                </div>

                                {/* Start Date */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Start Date
                                    </div>
                                    <div className="self-stretch text-teal-950 text-sm font-normal leading-5 tracking-tight">
                                        {campaignDetail.campaign.start_date
                                            ? new Date(campaignDetail.campaign.start_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                            : (campaignDetail.campaign.create_time
                                                ? new Date(campaignDetail.campaign.create_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                                : "-")}
                                    </div>
                                </div>
                            </div>

                            {/* Column 3 */}
                            <div className="flex-1 flex flex-col justify-start items-start gap-4">
                                {/* Status */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Status
                                    </div>
                                    <div
                                        data-campaign-status={campaignDetail.campaign.operation_status}
                                        className={`h-5 px-2 py-0.5 rounded-full inline-flex justify-center items-center gap-2.5 ${
                                            campaignDetail.campaign.operation_status === 'ENABLE' || campaignDetail.campaign.operation_status === 'ENABLED'
                                                ? 'bg-zinc-200 text-teal-900'
                                                : campaignDetail.campaign.operation_status === 'DISABLE' || campaignDetail.campaign.operation_status === 'PAUSED'
                                                    ? 'bg-gray-300 text-gray-700'
                                                    : 'bg-zinc-200 text-teal-900'
                                            }`}
                                    >
                                        <div className="text-xs font-medium leading-4 tracking-tight">
                                            {campaignDetail.campaign.operation_status === 'ENABLE' || campaignDetail.campaign.operation_status === 'ENABLED'
                                                ? 'Enable'
                                                : campaignDetail.campaign.operation_status === 'DISABLE' || campaignDetail.campaign.operation_status === 'PAUSED'
                                                    ? 'Pause'
                                                    : campaignDetail.campaign.operation_status}
                                        </div>
                                    </div>
                                </div>

                                {/* Objective Type */}
                                <div className="h-11 flex flex-col justify-start items-start gap-1">
                                    <div className="self-stretch text-teal-950 text-sm font-medium leading-5 tracking-tight">
                                        Objective Type
                                    </div>
                                    <div className="self-stretch text-teal-950 text-sm font-normal leading-5 tracking-tight">
                                        {campaignDetail.campaign.objective_type
                                            ? campaignDetail.campaign.objective_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                                            : "-"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    {loading ? (
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="text-center py-8">Loading campaign data...</div>
                        </div>
                    ) : campaignDetail ? (
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="flex flex-wrap gap-4 md:gap-7">
                                {campaignDetail.kpi_cards?.map((card, idx) => (
                                    <KPICard
                                        key={idx}
                                        label={card.label}
                                        value={card.value}
                                        change={card.change}
                                        isPositive={card.isPositive}
                                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="text-center py-8 text-red-500">
                                Campaign not found
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation & Content Section */}
                    <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
                        {/* Tabs */}
                        <div className="flex items-center gap-2 mb-8 border-b border-[#E6E6E6]">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-[16px] font-medium transition-colors border-b-2 cursor-pointer ${
                                        activeTab === tab
                                            ? "border-[#136D6D] text-[#136D6D]"
                                            : "border-transparent text-[#556179] hover:text-[#072929]"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {activeTab === "Overview" && (
                            <TikTokOverviewTab
                                chartData={campaignDetail.chart_data || []}
                                chartToggles={chartToggles}
                                onToggleChartMetric={(metric) =>
                                    setChartToggles((prev) => ({ ...prev, [metric]: !prev[metric as keyof typeof prev] }))
                                }
                                metrics={[
                                    {
                                        key: "sales",
                                        label: "Sales",
                                        color: "#136D6D",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
                                    },
                                    {
                                        key: "spend",
                                        label: "Spend",
                                        color: "#506766",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
                                    },
                                    {
                                        key: "impressions",
                                        label: "Impressions",
                                        color: "#7C3AED",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                    {
                                        key: "clicks",
                                        label: "Clicks",
                                        color: "#169aa3",
                                        tooltipFormatter: (val) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                ]}
                                topAds={campaignDetail.top_ads || []}
                                topProducts={campaignDetail.top_products || []}
                                loading={loading}
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
                                onRefresh={loadAdGroups}
                                campaignName={campaignDetail?.campaign?.campaign_name}
                                objectiveType={campaignDetail?.campaign?.objective_type ? campaignDetail.campaign.objective_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Website Conversions"}
                            />
                        )}

                        {activeTab === "Ads" && (
                            <TikTokCampaignDetailAdsTab
                                ads={ads}
                                loading={adsLoading}
                                selectedAdIds={selectedAdIds}
                                onSelectAll={(checked) => {
                                    if (checked) setSelectedAdIds(new Set(ads.map(ad => ad.ad_id)));
                                    else setSelectedAdIds(new Set());
                                }}
                                onSelectAd={(id, checked) => {
                                    const newSet = new Set(selectedAdIds);
                                    if (checked) newSet.add(id);
                                    else newSet.delete(id);
                                    setSelectedAdIds(newSet);
                                }}
                                sortBy={adsSortBy}
                                sortOrder={adsSortOrder}
                                onSort={handleSortAds}
                                currentPage={adsCurrentPage}
                                totalPages={adsTotalPages}
                                onPageChange={setAdsCurrentPage}
                                isFilterPanelOpen={isAdsFilterPanelOpen}
                                onToggleFilterPanel={() => setIsAdsFilterPanelOpen(!isAdsFilterPanelOpen)}
                                filters={adsFilters}
                                onApplyFilters={setAdsFilters}
                                // Create Ad Panel props
                                isCreateAdPanelOpen={isCreateAdPanelOpen}
                                onToggleCreateAdPanel={() => setIsCreateAdPanelOpen(!isCreateAdPanelOpen)}
                                adgroupId={selectedAdGroupForAd || (adgroups.length > 0 ? adgroups[0].adgroup_id : "")}
                                adgroups={adgroups.map(g => ({ adgroup_id: g.adgroup_id, adgroup_name: g.adgroup_name }))}
                                onAdGroupChange={setSelectedAdGroupForAd}
                                onCreateAd={handleCreateAd}
                                createAdLoading={createAdLoading}
                                createAdError={createAdError}
                                accountId={parseInt(accountId || "0", 10)}
                                onAdsUpdated={loadAds}
                            />
                        )}


                        {activeTab === "Logs" && <TikTokCampaignDetailLogsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};
