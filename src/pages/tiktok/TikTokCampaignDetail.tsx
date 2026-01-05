import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { KPICard } from "../../components/ui/KPICard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { campaignsService } from "../../services/campaigns";
import { PerformanceChart } from "../../components/charts/PerformanceChart";

interface TikTokCampaignDetailData {
    campaign_id: string;
    campaign_name: string;
    operation_status?: string;
    objective_type?: string;
    budget?: number;
    budget_mode?: string;
    create_time?: string;
    modify_time?: string;
    // Metrics
    spend?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
    conversion_rate?: number;
}

export const TikTokCampaignDetail: React.FC = () => {
    const { accountId, campaignId } = useParams<{
        accountId: string;
        campaignId: string;
    }>();
    const navigate = useNavigate();
    const { sidebarWidth } = useSidebar();
    const { startDate, endDate } = useDateRange();
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState<TikTokCampaignDetailData | null>(null);
    const [kpiCards, setKpiCards] = useState<Array<{ label: string; value: string }>>([]);
    const [chartData, setChartData] = useState<Array<any>>([]);

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

    useEffect(() => {
        const title = campaign?.campaign_name
            ? campaign.campaign_name
            : "TikTok Campaign Detail";
        setPageTitle(title);
        return () => {
            resetPageTitle();
        };
    }, [campaign]);

    const fetchCampaignDetail = useCallback(async () => {
        if (!accountId || !campaignId) return;

        setLoading(true);
        try {
            // Use the new campaign detail endpoint with chart data
            // Format dates as YYYY-MM-DD strings
            const formattedStartDate = startDate.toISOString().split('T')[0];
            const formattedEndDate = endDate.toISOString().split('T')[0];

            console.log('[TikTok] Fetching campaign detail with dates:', formattedStartDate, 'to', formattedEndDate);

            const response = await campaignsService.getTikTokCampaignDetail(
                parseInt(accountId),
                campaignId,
                formattedStartDate,
                formattedEndDate
            );

            console.log('[TikTok] chart_data returned:', response?.chart_data?.length, 'items', response?.chart_data);

            if (response) {
                // Map API response to component state
                setCampaign({
                    campaign_id: response.campaign.campaign_id,
                    campaign_name: response.campaign.campaign_name,
                    operation_status: response.campaign.operation_status,
                    objective_type: response.campaign.objective_type,
                    budget: response.campaign.budget,
                    budget_mode: response.campaign.budget_mode,
                    create_time: response.campaign.create_time,
                    modify_time: response.campaign.modify_time,
                });

                // Set KPI cards from response
                setKpiCards(response.kpi_cards || []);

                // Set chart data from response (real data from backend)
                setChartData(response.chart_data || []);
            }
        } catch (error) {
            console.error("Failed to fetch TikTok campaign detail:", error);
        } finally {
            setLoading(false);
        }
    }, [accountId, campaignId, startDate, endDate]);

    useEffect(() => {
        fetchCampaignDetail();
    }, [fetchCampaignDetail]);

    // Process chart data with computed metrics
    const processedChartData = useMemo(() => {
        return chartData.map(item => ({
            ...item,
            ctr: item.impressions > 0 ? parseFloat(((item.clicks / item.impressions) * 100).toFixed(2)) : 0,
            cpc: item.clicks > 0 ? parseFloat((item.spend / item.clicks).toFixed(2)) : 0,
        }));
    }, [chartData]);

    // Format status for StatusBadge
    const getStatusBadgeValue = (status?: string) => {
        if (!status) return "Unknown";
        const normalized = status.toLowerCase();
        if (normalized === "enable" || normalized === "enabled") return "ENABLED";
        if (normalized === "disable" || normalized === "disabled" || normalized === "paused") return "PAUSED";
        return status.toUpperCase();
    };

    // Format currency
    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return "$0.00";
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    // Format number
    const formatNumber = (value?: number) => {
        if (value === undefined || value === null) return "0";
        return new Intl.NumberFormat('en-US').format(value);
    };

    // Format percentage
    const formatPercentage = (value?: number) => {
        if (value === undefined || value === null) return "0%";
        return `${value.toFixed(2)}%`;
    };

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
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

    if (!campaign) {
        return (
            <div className="min-h-screen bg-white flex">
                <Sidebar />
                <div
                    className="flex-1 min-w-0 w-full"
                    style={{ marginLeft: `${sidebarWidth}px` }}
                >
                    <DashboardHeader />
                    <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
                        <div className="flex flex-col items-center justify-center h-64">
                            <p className="text-gray-500 text-[12.16px]">Campaign not found</p>
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-4 px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a]"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                        {/* Back Button and Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg
                                    className="w-5 h-5 text-[#072929]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                                    {campaign.campaign_name}
                                </h1>
                                <p className="text-[10.64px] text-gray-500">
                                    Campaign ID: {campaign.campaign_id}
                                </p>
                            </div>
                        </div>

                        {/* Campaign Information Card */}
                        <div className="bg-[#f9f9f6] rounded-[12px] border border-[#e8e8e3] p-6">
                            <h2 className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px] mb-6">
                                Campaign Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Campaign Name */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Campaign Name</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {campaign.campaign_name}
                                    </p>
                                </div>

                                {/* Status */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Status</p>
                                    <StatusBadge status={getStatusBadgeValue(campaign.operation_status)} />
                                </div>

                                {/* Objective Type */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Objective Type</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {campaign.objective_type || "-"}
                                    </p>
                                </div>

                                {/* Budget */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Budget</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {formatCurrency(campaign.budget)}
                                    </p>
                                </div>

                                {/* Budget Mode */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Budget Mode</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {campaign.budget_mode || "-"}
                                    </p>
                                </div>

                                {/* Created Date */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Created</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {formatDate(campaign.create_time)}
                                    </p>
                                </div>

                                {/* Last Modified */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Last Modified</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {formatDate(campaign.modify_time)}
                                    </p>
                                </div>

                                {/* Campaign ID */}
                                <div>
                                    <p className="text-[13.3px] text-[#556179] mb-1">Campaign ID</p>
                                    <p className="text-[13.3px] font-medium text-[#0b0f16] leading-[1.26]">
                                        {campaign.campaign_id}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards - from API response */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {kpiCards.map((kpi, index) => (
                                <KPICard
                                    key={index}
                                    label={kpi.label}
                                    value={kpi.value}
                                />
                            ))}
                        </div>

                        {/* Performance Chart */}
                        <PerformanceChart
                            data={processedChartData}
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
                    </div>
                </div>
            </div>
        </div>
    );
};
