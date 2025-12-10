import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";
import { PerformanceChart } from "../components/charts/PerformanceChart";
import { KPICard } from "../components/ui/KPICard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Checkbox } from "../components/ui/Checkbox";
import { useDateRange } from "../contexts/DateRangeContext";
import {
  campaignsService,
  type CampaignDetail as CampaignDetailData,
  type AdGroup,
  type Keyword,
} from "../services/campaigns";
import { AdGroupsTable } from "../components/campaigns/AdGroupsTable";
import { KeywordsTable } from "../components/campaigns/KeywordsTable";

export const CampaignDetail: React.FC = () => {
  const { accountId, campaignId } = useParams<{
    accountId: string;
    campaignId: string;
  }>();
  const { startDate, endDate } = useDateRange();
  const [isStatusEnabled, setIsStatusEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] =
    useState<CampaignDetailData | null>(null);
  const [adgroups, setAdgroups] = useState<AdGroup[]>([]);
  const [adgroupsLoading, setAdgroupsLoading] = useState(false);
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<number>>(
    new Set()
  );
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(
    new Set()
  );
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });

  const tabs = [
    "Overview",
    "Ad Group",
    "Keywords",
    "Product Targets",
    "Product Ads",
    "Logs",
  ];

  useEffect(() => {
    if (accountId && campaignId) {
      loadCampaignDetail();
    }
  }, [accountId, campaignId, startDate, endDate]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Ad Group") {
      loadAdGroups();
    }
  }, [accountId, campaignId, activeTab, startDate, endDate]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Keywords") {
      loadKeywords();
    }
  }, [accountId, campaignId, activeTab, startDate, endDate]);

  const loadCampaignDetail = async () => {
    try {
      setLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getCampaignDetail(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      setCampaignDetail(data);
      // Set status based on campaign status
      setIsStatusEnabled(
        data.campaign.status === "Enable" || data.campaign.status === "enable"
      );
    } catch (error) {
      console.error("Failed to load campaign detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdGroups = async () => {
    try {
      setAdgroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdgroupsLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getAdGroups(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      setAdgroups(data.adgroups);
    } catch (error) {
      console.error("Failed to load ad groups:", error);
      setAdgroups([]);
    } finally {
      setAdgroupsLoading(false);
    }
  };

  const loadKeywords = async () => {
    try {
      setKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setKeywordsLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getKeywords(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      setKeywords(data.keywords);
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleSelectAllAdGroups = (checked: boolean) => {
    if (checked) {
      setSelectedAdGroupIds(new Set(adgroups.map((ag) => ag.id)));
    } else {
      setSelectedAdGroupIds(new Set());
    }
  };

  const handleSelectAdGroup = (id: number, checked: boolean) => {
    setSelectedAdGroupIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAllKeywords = (checked: boolean) => {
    if (checked) {
      setSelectedKeywordIds(new Set(keywords.map((kw) => kw.id)));
    } else {
      setSelectedKeywordIds(new Set());
    }
  };

  const handleSelectKeyword = (id: number, checked: boolean) => {
    setSelectedKeywordIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const toggleChartMetric = (
    metric: "sales" | "spend" | "clicks" | "orders"
  ) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Use chart data from API, or generate fallback if empty
  const chartData = useMemo(() => {
    if (campaignDetail?.chart_data && campaignDetail.chart_data.length > 0) {
      return campaignDetail.chart_data;
    }

    // Fallback: generate empty data structure
    return [];
  }, [campaignDetail]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          {/* Campaign Header */}
          <div
            className="border border-[#E8E8E3] rounded-2xl shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)] mb-4 px-[34px] py-[22px]"
            style={{ backgroundColor: "white" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2.5">
                <h1
                  style={{
                    color: "#072929",
                    fontSize: "28px",
                    fontFamily: "Agrandir",
                    fontWeight: 400,
                    wordWrap: "break-word",
                  }}
                >
                  {loading
                    ? "Loading..."
                    : campaignDetail
                    ? `Campaign - ${campaignDetail.campaign.name}`
                    : "Campaign Not Found"}
                </h1>
                <p
                  style={{
                    color: "#808080",
                    fontSize: "16px",
                    fontFamily: "GT America Trial",
                    fontWeight: 400,
                    lineHeight: "100%",
                  }}
                >
                  {loading
                    ? "Loading..."
                    : campaignDetail?.campaign.description ||
                      "Smart campaign running on storefront + sponsored ads"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatusEnabled(!isStatusEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isStatusEnabled ? "bg-[#136D6D]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isStatusEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span
                    style={{
                      color: "#808080",
                      fontSize: "16px",
                      fontFamily: "GT America Trial",
                      fontWeight: 400,
                      lineHeight: "100%",
                    }}
                  >
                    Status
                  </span>
                </div>
                <Button className="bg-[#136D6D] text-white px-4 py-3 h-[42px] rounded-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: "14px",
                      fontFamily: "GT America Trial",
                      fontWeight: 500,
                      lineHeight: "100%",
                    }}
                  >
                    Sync Now
                  </span>
                </Button>
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
                {campaignDetail.kpi_cards.map((card, index) => (
                  <KPICard
                    key={index}
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

          {/* Tab Navigation & Chart Section */}
          <div
            className="border border-[#E8E8E3] rounded-2xl shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)] p-3 mt-4"
            style={{ backgroundColor: "#F9F9F6" }}
          >
            {/* Tabs */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-3 rounded-lg transition-colors ${
                      activeTab === tab
                        ? "bg-white border border-[#EBEAED] text-[#072929] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.06)]"
                        : "bg-transparent text-[#072929]"
                    }`}
                    style={{
                      fontSize: "12px",
                      fontFamily: "GT America Trial",
                      fontWeight: 500,
                      lineHeight: "100%",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "Overview" && (
              <>
                {/* Chart Section */}
                <PerformanceChart
                  data={chartData}
                  toggles={chartToggles}
                  onToggle={toggleChartMetric}
                  title="Performance Trends"
                />

                {/* Top Keywords & Top Products */}
                <div className="flex gap-7 mb-4">
                  {/* Top Keywords Table */}
                  <div className="rounded-2xl flex-1">
                    <div
                      className="border border-[#E8E8E3] border-b-0 rounded-t-2xl px-[34px] py-4"
                      style={{ backgroundColor: "#F5F5F0" }}
                    >
                      <h2
                        style={{
                          color: "#072929",
                          fontSize: "18px",
                          fontFamily: "GT America Trial",
                          fontWeight: 600,
                          lineHeight: "100%",
                        }}
                      >
                        Top Keywords
                      </h2>
                    </div>
                    <div className="border border-[#E6E6E6] rounded-b-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] bg-white">
                      {/* Table Header */}
                      <div className="flex items-center h-[56px] px-5 border-b border-[#E6E6E6] bg-white">
                        <div className="w-[62px] flex items-center justify-center">
                          <Checkbox
                            checked={false}
                            onChange={() => {}}
                            size="small"
                          />
                        </div>
                        <div className="flex-1 min-w-[154px]">
                          <p
                            style={{
                              color: "#072929",
                              fontSize: "16px",
                              fontFamily: "GT America Trial",
                              fontWeight: 400,
                              lineHeight: "100%",
                            }}
                          >
                            Ad Group Name
                          </p>
                        </div>
                        <div className="w-[86px] text-center">
                          <p
                            style={{
                              color: "#072929",
                              fontSize: "16px",
                              fontFamily: "GT America Trial",
                              fontWeight: 400,
                              lineHeight: "100%",
                            }}
                          >
                            Ctr
                          </p>
                        </div>
                        <div className="w-[105.5px] text-center">
                          <p
                            style={{
                              color: "#072929",
                              fontSize: "16px",
                              fontFamily: "GT America Trial",
                              fontWeight: 400,
                              lineHeight: "100%",
                            }}
                          >
                            Status
                          </p>
                        </div>
                        <div className="w-[98px] text-center">
                          <p
                            style={{
                              color: "#072929",
                              fontSize: "16px",
                              fontFamily: "GT America Trial",
                              fontWeight: 400,
                              lineHeight: "100%",
                            }}
                          >
                            Spends
                          </p>
                        </div>
                        <div className="text-center w-[105.5px]">
                          <p
                            style={{
                              color: "#072929",
                              fontSize: "16px",
                              fontFamily: "GT America Trial",
                              fontWeight: 400,
                              lineHeight: "100%",
                            }}
                          >
                            Sales
                          </p>
                        </div>
                        <div className="w-[94px] text-center">
                          <p
                            style={{
                              color: "#072929",
                              fontSize: "16px",
                              fontFamily: "GT America Trial",
                              fontWeight: 400,
                              lineHeight: "100%",
                            }}
                          >
                            Actions
                          </p>
                        </div>
                      </div>
                      <div className="divide-y divide-[#E6E6E6]">
                        {loading ? (
                          <div className="p-8 text-center text-[#556179]">
                            Loading keywords...
                          </div>
                        ) : campaignDetail &&
                          campaignDetail.top_keywords.length > 0 ? (
                          campaignDetail.top_keywords.map((keyword, index) => (
                            <div
                              key={index}
                              className="flex items-center h-[56px] px-5"
                            >
                              <div className="w-[62px] flex items-center justify-center">
                                <Checkbox
                                  checked={false}
                                  onChange={() => {}}
                                  size="small"
                                />
                              </div>
                              <div className="flex-1 min-w-[154px]">
                                <p
                                  style={{
                                    color: "#072929",
                                    fontSize: "16px",
                                    fontFamily: "GT America Trial",
                                    fontWeight: 400,
                                    lineHeight: "100%",
                                  }}
                                >
                                  {keyword.name}
                                </p>
                              </div>
                              <div className="w-[86px] text-center">
                                <p
                                  style={{
                                    color: "#072929",
                                    fontSize: "16px",
                                    fontFamily: "GT America Trial",
                                    fontWeight: 400,
                                    lineHeight: "100%",
                                  }}
                                >
                                  {keyword.ctr}
                                </p>
                              </div>
                              <div className="w-[105.5px] text-center">
                                <StatusBadge status={keyword.status} />
                              </div>
                              <div className="w-[98px] text-center">
                                <p
                                  style={{
                                    color: "#072929",
                                    fontSize: "16px",
                                    fontFamily: "GT America Trial",
                                    fontWeight: 400,
                                    lineHeight: "100%",
                                  }}
                                >
                                  {keyword.spends}
                                </p>
                              </div>
                              <div className="text-center w-[105.5px]">
                                <p
                                  style={{
                                    color: "#072929",
                                    fontSize: "16px",
                                    fontFamily: "GT America Trial",
                                    fontWeight: 400,
                                    lineHeight: "100%",
                                  }}
                                >
                                  {keyword.sales}
                                </p>
                              </div>
                              <div className="w-[94px] text-center">
                                <button className="text-[#A3A8B3] hover:text-black">
                                  <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-[#556179]">
                            No keywords data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div
                    className="border border-[#E8E8E3] rounded-2xl flex-1 p-5"
                    style={{ backgroundColor: "#F5F5F0" }}
                  >
                    <h2
                      style={{
                        color: "#072929",
                        fontSize: "18px",
                        fontFamily: "GT America Trial",
                        fontWeight: 600,
                        lineHeight: "100%",
                      }}
                      className="mb-4"
                    >
                      Top Products
                    </h2>
                    <div className="flex flex-col gap-3">
                      {loading ? (
                        <div className="text-center py-4 text-[#556179]">
                          Loading products...
                        </div>
                      ) : campaignDetail &&
                        campaignDetail.top_products.length > 0 ? (
                        campaignDetail.top_products.map((product, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between h-[71px]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-[38px] h-[38px] rounded-full bg-[#F9F9F6] flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-[#072929]"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                              </div>
                              <div>
                                <p
                                  style={{
                                    color: "#072929",
                                    fontSize: "16px",
                                    fontFamily: "GT America Trial",
                                    fontWeight: 500,
                                    lineHeight: "100%",
                                  }}
                                >
                                  {product.name}
                                </p>
                                <p
                                  style={{
                                    color: "#808080",
                                    fontSize: "12px",
                                    fontFamily: "GT America Trial",
                                    fontWeight: 400,
                                    lineHeight: "100%",
                                  }}
                                  className="mt-1"
                                >
                                  ASIN: {product.asin} • Sales: {product.sales}
                                </p>
                              </div>
                            </div>
                            <button
                              style={{
                                color: "#808080",
                                fontSize: "12px",
                                fontFamily: "GT America Trial",
                                fontWeight: 400,
                                lineHeight: "100%",
                              }}
                              className="hover:text-black"
                            >
                              View
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-[#556179]">
                          No products data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "Ad Group" && (
              <div className="mb-4">
                <AdGroupsTable
                  adgroups={adgroups}
                  loading={adgroupsLoading}
                  onSelectAll={handleSelectAllAdGroups}
                  onSelect={handleSelectAdGroup}
                  selectedIds={selectedAdGroupIds}
                />
              </div>
            )}

            {activeTab === "Keywords" && (
              <div className="mb-4">
                <KeywordsTable
                  keywords={keywords}
                  loading={keywordsLoading}
                  onSelectAll={handleSelectAllKeywords}
                  onSelect={handleSelectKeyword}
                  selectedIds={selectedKeywordIds}
                />
              </div>
            )}

            {activeTab !== "Overview" &&
              activeTab !== "Ad Group" &&
              activeTab !== "Keywords" && (
                <div className="p-8 text-center text-[#556179]">
                  {activeTab} tab content coming soon...
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
