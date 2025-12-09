import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useDateRange } from "../contexts/DateRangeContext";
import { campaignsService, type Campaign } from "../services/campaigns";
import { accountsService } from "../services/accounts";
import { FilterPanel } from "../components/filters/FilterPanel";
import { filtersService } from "../services/filters";
import type { FilterDefinition, Filter } from "../types/filters";

export const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startDate, endDate } = useDateRange();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<number>>(
    new Set()
  );
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterDefinitions, setFilterDefinitions] = useState<
    FilterDefinition[]
  >([]);
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);

  useEffect(() => {
    loadAccountAndCampaigns();
    loadFilterDefinitions();
  }, [searchParams]);

  useEffect(() => {
    if (selectedAccountId) {
      loadCampaigns(selectedAccountId);
    }
  }, [
    selectedAccountId,
    currentPage,
    itemsPerPage,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    activeFilters,
  ]);

  const loadAccountAndCampaigns = async () => {
    try {
      // Check if account_id is provided in URL params
      const accountIdParam = searchParams.get("account_id");

      if (accountIdParam) {
        const accountId = parseInt(accountIdParam, 10);
        if (!isNaN(accountId)) {
          setSelectedAccountId(accountId);
          return;
        }
      }

      // Otherwise, get accounts and use the first one
      const accountsData = await accountsService.getAccounts();
      if (Array.isArray(accountsData) && accountsData.length > 0) {
        const accountId = accountsData[0].id;
        setSelectedAccountId(accountId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
      setLoading(false);
    }
  };

  const loadFilterDefinitions = async () => {
    try {
      const definitions = await filtersService.getFilterDefinitions(
        "campaigns"
      );
      setFilterDefinitions(definitions);
    } catch (error) {
      console.error("Failed to load filter definitions:", error);
    }
  };

  const loadCampaigns = async (accountId: number) => {
    try {
      setLoading(true);
      // Use POST request with filters if filters are active, otherwise use GET
      if (activeFilters.length > 0) {
        const response = await filtersService.applyFilters<{
          campaigns: Campaign[];
          total: number;
          page: number;
          page_size: number;
          total_pages: number;
        }>(`/accounts/${accountId}/campaigns/`, activeFilters, {
          sort_by: sortBy,
          order: sortOrder,
          page: currentPage,
          page_size: itemsPerPage,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        });
        setCampaigns(
          Array.isArray(response.campaigns) ? response.campaigns : []
        );
        setTotalCount(response.total || 0);
        setTotalPages(response.total_pages || 0);
      } else {
        // Use existing GET request when no filters
        const response = await campaignsService.getCampaigns(accountId, {
          sort_by: sortBy,
          order: sortOrder,
          page: currentPage,
          page_size: itemsPerPage,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        });
        setCampaigns(
          Array.isArray(response.campaigns) ? response.campaigns : []
        );
        setTotalCount(response.total || 0);
        setTotalPages(response.total_pages || 0);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      setCampaigns([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const toggleChartMetric = (metric: keyof typeof chartToggles) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const toggleSelectCampaign = (campaignId: number) => {
    setSelectedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCampaigns.size === campaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(campaigns.map((c) => c.id)));
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-[#556179]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#556179]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      Enable: {
        bg: "bg-[rgba(30,199,122,0.1)]",
        text: "text-[#1ec77a]",
        label: "Enable",
      },
      Paused: {
        bg: "bg-[rgba(255,182,92,0.1)]",
        text: "text-[#ffb65c]",
        label: "Paused",
      },
      Archived: {
        bg: "bg-[rgba(163,168,179,0.1)]",
        text: "text-[#a3a8b3]",
        label: "Archived",
      },
    };
    const statusInfo = statusMap[status] || statusMap["Enable"];
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-[12px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Generate chart data based on campaigns and date range
  const chartData = useMemo(() => {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dataPoints = Math.min(days, 60); // Limit to 60 data points for readability

    const data = [];
    const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpends = campaigns.reduce((sum, c) => sum + (c.spends || 0), 0);
    const avgSalesPerDay = days > 0 ? totalSales / days : 0;
    const avgSpendsPerDay = days > 0 ? totalSpends / days : 0;

    // Generate sample data with some variation
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor((i * days) / dataPoints));
      const dayOfWeek = date.getDay();

      // Add some variation based on day of week (weekends typically lower)
      const variation = 0.7 + Math.random() * 0.6;
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1.0;

      const sales = Math.max(0, avgSalesPerDay * variation * weekendFactor);
      const spend = Math.max(0, avgSpendsPerDay * variation * weekendFactor);
      const clicks = Math.floor(spend * (50 + Math.random() * 30)); // Estimate clicks from spend
      const orders = Math.floor(sales / (50 + Math.random() * 30)); // Estimate orders from sales

      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales: Math.round(sales),
        spend: Math.round(spend),
        clicks: clicks,
        orders: orders,
      });
    }

    return data;
  }, [campaigns, startDate, endDate]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white flex gap-6">
          {/* Filter Panel - Inline */}
          {isFilterPanelOpen && (
            <div className="flex-shrink-0">
              <FilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                pageType="campaigns"
                filterDefinitions={filterDefinitions}
                activeFilters={activeFilters}
                onApply={(filters) => {
                  setActiveFilters(filters);
                  setCurrentPage(1); // Reset to first page when applying filters
                }}
                onClear={() => {
                  setActiveFilters([]);
                }}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Add Filter Link and Active Filters */}
            <div className="mb-4 flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="text-[16px] font-normal text-[#0066ff] hover:underline"
              >
                {isFilterPanelOpen ? "− Hide Filter" : "+ Add Filter"}
              </button>
              {activeFilters.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {activeFilters.map((filter, index) => {
                    const definition = filterDefinitions.find(
                      (def) => def.field_name === filter.field
                    );
                    const label = definition?.label || filter.field;
                    let displayValue = "";
                    if (filter.operator === "between") {
                      displayValue = `${filter.value} - ${filter.value2}`;
                    } else {
                      displayValue = `${filter.operator} ${filter.value}`;
                    }
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[12px] font-medium"
                      >
                        {label}: {displayValue}
                        <button
                          onClick={() => {
                            const newFilters = activeFilters.filter(
                              (_, i) => i !== index
                            );
                            setActiveFilters(newFilters);
                          }}
                          className="text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart Section */}
            <div className="bg-[#F5F7FA] border border-[#E6E6E6] rounded-[20px] p-6 mb-4">
              {/* Title and Toggle Switches Row */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[20px] font-semibold text-black">
                  Performance Trends
                </h3>

                {/* Toggle Switches */}
                <div className="flex gap-4 items-center">
                  {[
                    { key: "sales", label: "Sales", color: "#1ec77a" },
                    { key: "spend", label: "Spend", color: "#7a4dff" },
                    { key: "clicks", label: "Clicks", color: "#169aa3" },
                    { key: "orders", label: "Orders", color: "#ea33de" },
                  ].map((metric) => (
                    <div
                      key={metric.key}
                      className="border border-gray-300 rounded-lg px-3 py-2.5 flex items-center gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        <span className="text-[13px] font-normal text-black">
                          {metric.label}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          toggleChartMetric(
                            metric.key as keyof typeof chartToggles
                          )
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          chartToggles[metric.key as keyof typeof chartToggles]
                            ? "bg-[#7a4dff]"
                            : "bg-[#a3a8b3]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            chartToggles[
                              metric.key as keyof typeof chartToggles
                            ]
                              ? "translate-x-5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-[223px] bg-transparent rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <XAxis
                      dataKey="date"
                      stroke="#556179"
                      style={{ fontSize: "12px" }}
                      tick={{ fill: "#556179" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#556179"
                      style={{ fontSize: "12px" }}
                      tick={{ fill: "#556179" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (value >= 1000) {
                          return `${(value / 1000).toFixed(0)}K`;
                        }
                        return value.toString();
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #E6E6E6",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === "Sales" || name === "Spend") {
                          return [`$${value.toLocaleString()}`, name];
                        }
                        return [value.toLocaleString(), name];
                      }}
                    />
                    {chartToggles.sales && (
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#1ec77a"
                        strokeWidth={0.8}
                        dot={false}
                        name="Sales"
                        activeDot={{ r: 4 }}
                      />
                    )}
                    {chartToggles.spend && (
                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke="#7a4dff"
                        strokeWidth={0.8}
                        dot={false}
                        name="Spend"
                        activeDot={{ r: 4 }}
                      />
                    )}
                    {chartToggles.clicks && (
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#169aa3"
                        strokeWidth={0.8}
                        dot={false}
                        name="Clicks"
                        activeDot={{ r: 4 }}
                      />
                    )}
                    {chartToggles.orders && (
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#ea33de"
                        strokeWidth={0.8}
                        dot={false}
                        name="Orders"
                        activeDot={{ r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="bg-[#F5F7FA] rounded-2xl">
              {/* Table Header */}
              <div className="bg-[#F5F7FA] border border-[#E8E8E3] border-b-0 rounded-t-2xl px-[34px] py-8 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)]">
                <h2 className="text-[28px] font-semibold text-black">
                  Campaigns{" "}
                  <span className="text-[16px] font-normal text-[#727272]">
                    (Overview of all active campaigns)
                  </span>
                </h2>
              </div>

              {/* Table */}
              <div className="border border-[#E6E6E6] rounded-b-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-[#556179]">
                    Loading campaigns...
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="p-8 text-center text-[#556179]">
                    No campaigns found
                  </div>
                ) : (
                  <>
                    {/* Table Header Row */}
                    <div className="bg-white border-b border-[#E6E6E6] flex items-center h-[60px]">
                      {/* Checkbox Header */}
                      <div className="w-[35px] flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedCampaigns.size === campaigns.length &&
                            campaigns.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="w-6 h-6 border-[#A3A8B3] rounded"
                        />
                      </div>

                      {/* Campaign Name Header */}
                      <div
                        className="w-[280px] px-4 cursor-pointer hover:bg-gray-50 flex items-center"
                        onClick={() => handleSort("campaign_name")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          Campaign Name
                        </p>
                        {getSortIcon("campaign_name")}
                      </div>

                      {/* Campaign Type Header */}
                      <div
                        className="w-[80px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("type")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          Type
                        </p>
                        {getSortIcon("type")}
                      </div>

                      {/* State Header */}
                      <div
                        className="w-[100px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("status")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          State
                        </p>
                        {getSortIcon("status")}
                      </div>

                      {/* Budget Header */}
                      <div
                        className="w-[120px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("budget")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          Budget
                        </p>
                        {getSortIcon("budget")}
                      </div>

                      {/* Spends Header */}
                      <div
                        className="w-[100px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("spends")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          Spends
                        </p>
                        {getSortIcon("spends")}
                      </div>

                      {/* Sales Header */}
                      <div
                        className="text-center flex-1 min-w-[51px] cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("sales")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          Sales
                        </p>
                        {getSortIcon("sales")}
                      </div>

                      {/* ACOS Header */}
                      <div
                        className="text-center flex-1 min-w-[47px] cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("acos")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          ACOS
                        </p>
                        {getSortIcon("acos")}
                      </div>

                      {/* ROAS Header */}
                      <div
                        className="text-center flex-1 min-w-[47px] cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => handleSort("roas")}
                      >
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          ROAS
                        </p>
                        {getSortIcon("roas")}
                      </div>

                      {/* Actions Header */}
                      <div className="w-[54px] text-center">
                        <p className="text-[12px] font-semibold text-[#556179] uppercase">
                          Actions
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-[#E6E6E6]">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center h-[60px] hover:bg-gray-50"
                        >
                          {/* Checkbox */}
                          <div className="w-[35px] flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedCampaigns.has(campaign.id)}
                              onChange={() => toggleSelectCampaign(campaign.id)}
                              className="w-6 h-6 border-[#A3A8B3] rounded"
                            />
                          </div>

                          {/* Campaign Name */}
                          <div className="w-[280px] px-4">
                            <button
                              onClick={() =>
                                navigate(`/campaigns/${campaign.id}`)
                              }
                              className="text-[16px] font-normal text-black truncate hover:text-[#0066ff] hover:underline cursor-pointer text-left w-full"
                            >
                              {campaign.campaign_name || "Unnamed Campaign"}
                            </button>
                          </div>

                          {/* Type */}
                          <div className="w-[80px] text-center">
                            <p className="text-[16px] font-semibold text-[#7a4dff]">
                              {campaign.type || "SP"}
                            </p>
                          </div>

                          {/* Status */}
                          <div className="w-[100px] text-center">
                            {getStatusBadge(campaign.status || "Enable")}
                          </div>

                          {/* Daily Budget */}
                          <div className="w-[120px] text-center">
                            <p className="text-[16px] font-normal text-black">
                              {formatCurrency(campaign.daily_budget || 0)}
                            </p>
                          </div>

                          {/* Spends */}
                          <div className="w-[100px] text-center">
                            <p className="text-[16px] font-normal text-black">
                              {formatCurrency(campaign.spends || 0)}
                            </p>
                          </div>

                          {/* Sales */}
                          <div className="text-center flex-1 min-w-[51px]">
                            <p className="text-[16px] font-normal text-black">
                              {formatCurrency(campaign.sales || 0)}
                            </p>
                          </div>

                          {/* ACOS */}
                          <div className="text-center flex-1 min-w-[47px]">
                            <p className="text-[16px] font-normal text-black">
                              {formatPercentage(campaign.acos || 0)}
                            </p>
                          </div>

                          {/* ROAS */}
                          <div className="text-center flex-1 min-w-[47px]">
                            <p className="text-[16px] font-normal text-black">
                              {campaign.roas
                                ? `${campaign.roas.toFixed(2)} x`
                                : "0.00 x"}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="w-[54px] text-center">
                            <button
                              onClick={() =>
                                navigate(`/campaigns/${campaign.id}`)
                              }
                              className="text-[#A3A8B3] hover:text-black"
                            >
                              <svg
                                className="w-5 h-5 mx-auto"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div className="bg-[#F5F7FA] border-t border-[#E6E6E6] px-[34px] py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-normal text-black">
                          Showing
                        </span>
                        <div className="relative inline-block">
                          <input
                            type="number"
                            value={itemsPerPage}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val >= 10 && val <= 100) {
                                handleItemsPerPageChange(val);
                              }
                            }}
                            min={10}
                            max={100}
                            step={10}
                            className="w-14 h-8 px-2 pr-6 border border-[#EBEBEB] rounded-lg bg-white text-[14px] text-black text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-[#EBEBEB]"
                          />
                          <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleItemsPerPageChange(
                                  Math.min(100, itemsPerPage + 10)
                                )
                              }
                              disabled={itemsPerPage >= 100}
                              className="w-3 h-3 flex items-center justify-center text-[#858585] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
                            >
                              <svg
                                className="w-2.5 h-2.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleItemsPerPageChange(
                                  Math.max(10, itemsPerPage - 10)
                                )
                              }
                              disabled={itemsPerPage <= 10}
                              className="w-3 h-3 flex items-center justify-center text-[#858585] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
                            >
                              <svg
                                className="w-2.5 h-2.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <span className="text-[14px] font-normal text-black">
                          of{" "}
                          <span className="font-bold text-black">
                            {totalCount}
                          </span>{" "}
                          Result
                        </span>
                      </div>

                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handlePageChange(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 py-2 border-r border-[#E6E6E6] text-[14px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
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
                                className={`px-3 py-2 border-r border-[#E6E6E6] text-[14px] min-w-[40px] ${
                                  currentPage === pageNum
                                    ? "bg-white text-[#4e5cff] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <span className="px-3 py-2 border-r border-[#E6E6E6] text-[14px] text-[#222124]">
                            ...
                          </span>
                        )}
                        {totalPages > 5 && (
                          <button
                            onClick={() => handlePageChange(totalPages)}
                            className={`px-3 py-2 border-r border-[#E6E6E6] text-[14px] ${
                              currentPage === totalPages
                                ? "bg-white text-[#4e5cff] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {totalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handlePageChange(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-[14px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
