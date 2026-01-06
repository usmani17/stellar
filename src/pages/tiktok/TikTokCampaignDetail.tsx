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

    const [isCreateAdGroupPanelOpen, setIsCreateAdGroupPanelOpen] = useState(false);

    // Chart State
    const [chartToggles, setChartToggles] = useState({
        spend: true,
        impressions: true,
        clicks: false,
        conversions: false,
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
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Campaign ID
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-mono">
                                    {campaignDetail.campaign.campaign_id}
                                </div>
                            </div>

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
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Budget
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(campaignDetail.campaign.budget)}
                                </div>
                            </div>

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
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Objective Type
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] capitalize">
                                    {campaignDetail.campaign.objective_type?.replace(/_/g, " ").toLowerCase() || "-"}
                                </div>
                            </div>

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
                                onRefresh={loadAdGroups}
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
                            />
                        )}


                        {activeTab === "Logs" && <TikTokCampaignDetailLogsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};
