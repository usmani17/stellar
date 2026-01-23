import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { KPICard } from "../../components/ui/KPICard";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import type { FilterValues } from "../../components/filters/FilterPanel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
    TikTokOverviewTab,
    TikTokCampaignDetailAdGroupsTab,
    TikTokCampaignDetailAdsTab,
    TikTokCampaignDetailLogsTab,
} from "./components/tabs";
import type { TikTokAdGroup, TikTokAd } from "./components/tabs/types"; // Corrected import path for types
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
    top_ads?: TikTokAd[];
    top_adgroups?: TikTokAdGroup[];
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

    // Inline edit state
    const [editingField, setEditingField] = useState<"budget" | "status" | null>(null);
    const [editedValue, setEditedValue] = useState<string>("");

    // Confirmation Modal State
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [inlineEditField, setInlineEditField] = useState<"budget" | "status" | null>(null);
    const [inlineEditOldValue, setInlineEditOldValue] = useState("");
    const [inlineEditNewValue, setInlineEditNewValue] = useState("");
    const [inlineEditLoading, setInlineEditLoading] = useState(false);

    const handleEditStart = (field: "budget" | "status", value: string) => {
        setEditingField(field);
        setEditedValue(value);
    };

    const handleEditEnd = () => {
        if (!campaignDetail || !editingField) return;

        const currentValue = editingField === "status"
            ? campaignDetail.campaign.operation_status
            : (campaignDetail.campaign.budget || 0).toString();

        if (editedValue !== currentValue) {
            setInlineEditField(editingField);
            setInlineEditOldValue(editingField === "budget"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(currentValue))
                : (currentValue === 'ENABLE' || currentValue === 'ENABLED' ? 'Enable' : 'Pause')
            );
            setInlineEditNewValue(editedValue);
            setShowInlineEditModal(true);
        } else {
            setEditingField(null);
            setEditedValue("");
        }
    };

    const runInlineEdit = async () => {
        if (!accountId || !campaignId || !inlineEditField) return;

        try {
            setInlineEditLoading(true);
            const accountIdNum = parseInt(accountId, 10);

            if (inlineEditField === "status") {
                await campaignsService.updateTikTokCampaignStatus(accountIdNum, {
                    campaign_ids: [campaignId],
                    operation_status: inlineEditNewValue as "ENABLE" | "DISABLE" | "DELETE",
                });
            } else if (inlineEditField === "budget") {
                await campaignsService.updateTikTokCampaign(accountIdNum, campaignId, {
                    budget: parseFloat(inlineEditNewValue),
                });
            }

            setShowInlineEditModal(false);
            setEditingField(null);
            setEditedValue("");
            loadCampaignDetail(); // Refresh data
        } catch (error: any) {
            console.error(`Failed to update campaign ${inlineEditField}:`, error);
            alert(`Failed to update campaign: ${error.message || "Unknown error"}`);
        } finally {
            setInlineEditLoading(false);
        }
    };

    const cancelInlineEdit = () => {
        setShowInlineEditModal(false);
        setInlineEditField(null);
        setInlineEditOldValue("");
        setInlineEditNewValue("");
        setEditingField(null);
        setEditedValue("");
    };

    const handleEditCancel = () => {
        setEditingField(null);
        setEditedValue("");
    };

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
            // Extract user-friendly error message from response
            const errorMessage =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.response?.data?.detail ||
                (typeof error?.response?.data === 'object'
                    ? Object.values(error?.response?.data).flat().join(', ')
                    : null) ||
                (error?.response?.status === 400 ? "Invalid form data. Please check all required fields." : null) ||
                (error?.response?.status === 500 ? "Server error. Please try again later." : null) ||
                "Failed to create ad. Please try again.";
            setCreateAdError(errorMessage);
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
                    <div className="p-6 bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] mb-6">
                        {/* Title */}
                        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">
                            Campaign Information
                        </h2>

                        {/* Grid Layout to match Amazon */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Campaign Name */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Campaign Name
                                </label>
                                <div className="table-text leading-[1.26]">
                                    {campaignDetail.campaign.campaign_name}
                                </div>
                            </div>

                            {/* Campaign ID */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Campaign ID
                                </label>
                                <div className="table-text leading-[1.26]">
                                    {campaignDetail.campaign.campaign_id}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                        Status
                                    </label>
                                    <button
                                        onClick={() => handleEditStart("status", campaignDetail.campaign.operation_status)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        title="Edit status"
                                    >
                                        <svg className="w-4 h-4 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                </div>
                                {editingField === "status" ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={editedValue}
                                            onChange={(e) => setEditedValue(e.target.value)}
                                            className="table-text border border-[#e8e8e3] rounded px-2 py-1 outline-none focus:border-[#136D6D] bg-white"
                                            autoFocus
                                            onBlur={handleEditEnd}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleEditEnd();
                                                else if (e.key === "Escape") handleEditCancel();
                                            }}
                                            disabled={inlineEditLoading}
                                        >
                                            <option value="ENABLE">Enable</option>
                                            <option value="DISABLE">Pause</option>
                                            <option value="DELETE">Delete</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="table-text leading-[1.26]">
                                        <StatusBadge
                                            status={campaignDetail.campaign.operation_status === 'ENABLE' || campaignDetail.campaign.operation_status === 'ENABLED' ? 'Enable' : 'Paused'}
                                            uppercase={true}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Budget */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                        Budget
                                    </label>
                                    <button
                                        onClick={() => handleEditStart("budget", (campaignDetail.campaign.budget || 0).toString())}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        title="Edit budget"
                                    >
                                        <svg className="w-4 h-4 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                </div>
                                {editingField === "budget" ? (
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 table-text text-[#556179]">$</span>
                                            <input
                                                type="number"
                                                value={editedValue}
                                                onChange={(e) => setEditedValue(e.target.value)}
                                                className="table-text border border-[#e8e8e3] rounded pl-5 pr-2 py-1 w-32 outline-none focus:border-[#136D6D]"
                                                autoFocus
                                                onBlur={handleEditEnd}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleEditEnd();
                                                    else if (e.key === "Escape") handleEditCancel();
                                                }}
                                                disabled={inlineEditLoading}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="table-text leading-[1.26]">
                                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(campaignDetail.campaign.budget || 0)}
                                    </div>
                                )}
                            </div>

                            {/* Budget Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Budget Type
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                    {campaignDetail.campaign.budget_mode
                                        ? campaignDetail.campaign.budget_mode.replace(/_/g, " ").replace("BUDGET MODE ", "").replace("DYNAMIC DAILY BUDGET", "Daily").replace("TOTAL", "Lifetime").replace("DAY", "Daily")
                                        : "Daily"}
                                </div>
                            </div>

                            {/* Objective Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Objective Type
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                    {campaignDetail.campaign.objective_type
                                        ? campaignDetail.campaign.objective_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                                        : "-"}
                                </div>
                            </div>

                            {/* Start Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Start Date
                                </label>
                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                    {campaignDetail.campaign.start_date
                                        ? new Date(campaignDetail.campaign.start_date).toLocaleDateString()
                                        : (campaignDetail.campaign.create_time
                                            ? new Date(campaignDetail.campaign.create_time).toLocaleDateString()
                                            : "-")}
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
                                    className={`px-4 py-2 text-[16px] font-medium transition-colors border-b-2 cursor-pointer ${activeTab === tab
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
                                        tooltipFormatter: (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
                                    },
                                    {
                                        key: "spend",
                                        label: "Spend",
                                        color: "#506766",
                                        tooltipFormatter: (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
                                    },
                                    {
                                        key: "impressions",
                                        label: "Impressions",
                                        color: "#7C3AED",
                                        tooltipFormatter: (val: number) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                    {
                                        key: "clicks",
                                        label: "Clicks",
                                        color: "#169aa3",
                                        tooltipFormatter: (val: number) => new Intl.NumberFormat("en-US").format(val)
                                    },
                                ]}
                                topAds={campaignDetail.top_ads || []}
                                topAdGroups={campaignDetail.top_adgroups || []}
                                loading={loading}
                                accountId={parseInt(accountId || "0")}
                                onRefresh={loadCampaignDetail}
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


                        {activeTab === "Logs" && (
                            <TikTokCampaignDetailLogsTab
                                accountId={accountId || ""}
                                campaignId={campaignId}
                            />
                        )}
                    </div>
                </div>
            </div>
            {/* Campaign Inline Edit Confirmation Modal */}
            {showInlineEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4 text-[#072929]">Confirm Change</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2 font-medium">
                                {inlineEditField === "status" ? "Status" : "Budget"}
                            </p>
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex-1">
                                    <span className="text-xs text-gray-500 block mb-1">From:</span>
                                    <span className="text-sm font-semibold text-[#556179]">
                                        {inlineEditOldValue}
                                    </span>
                                </div>
                                <div className="text-gray-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-right">
                                    <span className="text-xs text-gray-500 block mb-1">To:</span>
                                    <span className="text-sm font-semibold text-[#136D6D]">
                                        {inlineEditField === "status"
                                            ? (inlineEditNewValue === 'ENABLE' ? 'Enable' : inlineEditNewValue === 'DISABLE' ? 'Pause' : 'Delete')
                                            : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(inlineEditNewValue || "0"))
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={cancelInlineEdit}
                                disabled={inlineEditLoading}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-[#556179] font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runInlineEdit}
                                disabled={inlineEditLoading}
                                className="px-4 py-2 text-sm bg-[#136D6D] text-white rounded-lg hover:bg-[#0f5a5a] transition-colors disabled:opacity-50 font-medium min-w-[100px]"
                            >
                                {inlineEditLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </div>
                                ) : "Confirm Change"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
