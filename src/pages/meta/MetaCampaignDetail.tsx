import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { accountsService } from "../../services/accounts";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { KPICard } from "../../components/ui/KPICard";
import { Loader } from "../../components/ui/Loader";
import { ArrowLeft } from "lucide-react";
import { MetaCampaignInformation } from "./components/MetaCampaignInformation";
import { useMetaCampaignDetail } from "./hooks/useMetaCampaignDetail";
import { useMetaCampaignDetailAdsets } from "./hooks/useMetaCampaignDetailAdsets";
import { useMetaCampaignDetailAds } from "./hooks/useMetaCampaignDetailAds";
import { useMetaCampaignDetailCreatives } from "./hooks/useMetaCampaignDetailCreatives";
import { MetaCampaignDetailOverviewTab } from "./components/tabs/MetaCampaignDetailOverviewTab";
import { MetaCampaignDetailAdsetsTab } from "./components/tabs/MetaCampaignDetailAdsetsTab";
import { MetaCampaignDetailAdsTab } from "./components/tabs/MetaCampaignDetailAdsTab";
import { MetaCampaignDetailCreativesTab } from "./components/tabs/MetaCampaignDetailCreativesTab";
import { MetaCampaignDetailLogsTab } from "./components/tabs/MetaCampaignDetailLogsTab";
import { CreateMetaAdSetSection } from "../../components/meta/CreateMetaAdSetSection";
import { CreateMetaAdSection } from "../../components/meta/CreateMetaAdSection";
import { CreateMetaCreativeSection } from "../../components/meta/CreateMetaCreativeSection";
import { CreateMetaAdSetPanel } from "../../components/meta/CreateMetaAdSetPanel";
import { CreateMetaAdPanel } from "../../components/meta/CreateMetaAdPanel";
import { CreateMetaCreativePanel } from "../../components/meta/CreateMetaCreativePanel";

const META_TABS = ["Overview", "Adsets", "Ads", "Creatives", "Logs"];

/**
 * Meta campaign detail page. Same layout as Google Campaign Detail.
 * Route: /brands/:accountId/:channelId/meta/campaigns/:campaignId
 */
export function MetaCampaignDetail() {
  const { accountId, channelId, campaignId } = useParams<{
    accountId: string;
    channelId: string;
    campaignId: string;
  }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [activeTab, setActiveTab] = useState("Overview");
  const [isCreateAdSetPanelOpen, setIsCreateAdSetPanelOpen] = useState(false);
  const [isCreateCreativePanelOpen, setIsCreateCreativePanelOpen] =
    useState(false);
  const [isCreateAdPanelOpen, setIsCreateAdPanelOpen] = useState(false);
  const [profileIdFallback, setProfileIdFallback] = useState<number | null>(
    null,
  );

  const {
    campaignDetail,
    loading,
    chartData,
    chartToggles,
    toggleChartMetric,
    loadCampaignDetail,
  } = useMetaCampaignDetail({
    accountId,
    channelId,
    campaignId,
    startDate,
    endDate,
  });

  const adsetsHook = useMetaCampaignDetailAdsets({
    channelId,
    campaignId,
    startDate,
    endDate,
    activeTab,
  });

  const adsHook = useMetaCampaignDetailAds({
    channelId,
    campaignId,
    startDate,
    endDate,
    activeTab,
  });

  const creativesHook = useMetaCampaignDetailCreatives({
    channelId,
    campaignId,
    startDate,
    endDate,
    activeTab,
  });

  useEffect(() => {
    setPageTitle(campaignDetail?.campaign?.campaign_name ?? "Meta Campaign");
    return () => resetPageTitle();
  }, [campaignDetail?.campaign?.campaign_name]);

  // When campaign has no profile_id, fetch Meta profiles and use first as fallback for Create Meta Ad Set.
  useEffect(() => {
    if (
      !channelId ||
      !campaignDetail ||
      campaignDetail.campaign.profile_id != null
    ) {
      if (campaignDetail?.campaign?.profile_id != null)
        setProfileIdFallback(null);
      return;
    }
    let cancelled = false;
    accountsService
      .fetchMetaProfiles(parseInt(channelId, 10))
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{ id?: number }>;
        const first = list.find((p) => p.id != null);
        if (first?.id != null) setProfileIdFallback(first.id);
      })
      .catch(() => {
        if (!cancelled) setProfileIdFallback(null);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, campaignDetail]);

  const listPath = `/brands/${accountId}/${channelId}/meta/campaigns`;
  const kpiCards = useMemo(
    () =>
      campaignDetail?.kpi_cards && campaignDetail.kpi_cards.length > 0
        ? campaignDetail.kpi_cards
        : [
            {
              label: "Spend",
              value: "$0",
              change: undefined,
              isPositive: undefined,
            },
            {
              label: "Sales",
              value: "$0",
              change: undefined,
              isPositive: undefined,
            },
            {
              label: "Impressions",
              value: "0",
              change: undefined,
              isPositive: undefined,
            },
            {
              label: "Clicks",
              value: "0",
              change: undefined,
              isPositive: undefined,
            },
          ],
    [campaignDetail?.kpi_cards],
  );

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="flex-1 min-w-0 w-full h-screen flex flex-col"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />
        <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
          <div className="space-y-6">
            <Link
              to={listPath}
              className="inline-flex items-center gap-2 text-sm text-[#136D6D] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to campaigns
            </Link>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader size="lg" message="Loading campaign..." />
              </div>
            ) : !campaignDetail ? (
              <div className="rounded-lg border border-[#e8e8e3] bg-white p-6">
                <p className="text-red-500">Campaign not found.</p>
              </div>
            ) : (
              <>
                <MetaCampaignInformation
                  campaignDetail={campaignDetail}
                  loading={loading}
                />

                <div className="flex flex-wrap gap-4 md:gap-7">
                  {kpiCards.map((card, index) => (
                    <KPICard
                      key={index}
                      label={card.label}
                      value={card.value}
                      change={card.change ?? undefined}
                      isPositive={card.isPositive ?? undefined}
                      className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                    />
                  ))}
                </div>

                <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
                  <div className="flex items-center gap-2 mb-8 border-b border-[#E6E6E6]">
                    {META_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
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

                  {activeTab === "Overview" && (
                    <MetaCampaignDetailOverviewTab
                      chartData={chartData}
                      chartToggles={chartToggles}
                      onToggleChartMetric={toggleChartMetric}
                    />
                  )}
                  {activeTab === "Adsets" && (
                    <MetaCampaignDetailAdsetsTab
                      adsets={adsetsHook.adsets}
                      loading={adsetsHook.loading}
                      selectedIds={adsetsHook.selectedIds}
                      onSelectAll={adsetsHook.handleSelectAll}
                      onSelectOne={adsetsHook.handleSelectOne}
                      sortBy={adsetsHook.sortBy}
                      sortOrder={adsetsHook.sortOrder}
                      onSort={adsetsHook.handleSort}
                      currentPage={adsetsHook.currentPage}
                      totalPages={adsetsHook.totalPages}
                      onPageChange={adsetsHook.handlePageChange}
                      createButton={
                        <CreateMetaAdSetSection
                          isOpen={isCreateAdSetPanelOpen}
                          onToggle={() => setIsCreateAdSetPanelOpen((p) => !p)}
                        />
                      }
                      createPanel={
                        isCreateAdSetPanelOpen &&
                        channelId &&
                        campaignId && (
                          <CreateMetaAdSetPanel
                            channelId={parseInt(channelId, 10)}
                            profileId={
                              campaignDetail?.campaign?.profile_id ??
                              profileIdFallback ??
                              0
                            }
                            campaignId={campaignId}
                            campaignObjective={
                              campaignDetail?.campaign?.objective
                            }
                            campaignBidStrategy={
                              campaignDetail?.campaign?.bid_strategy
                            }
                            campaignBudgetSet={
                              campaignDetail?.campaign?.daily_budget != null &&
                              String(
                                campaignDetail.campaign.daily_budget,
                              ).trim() !== ""
                            }
                            accountId={accountId}
                            onSuccess={() => {
                              adsetsHook.loadAdsets();
                              setIsCreateAdSetPanelOpen(false);
                            }}
                            onClose={() => setIsCreateAdSetPanelOpen(false)}
                          />
                        )
                      }
                    />
                  )}
                  {activeTab === "Ads" && (
                    <MetaCampaignDetailAdsTab
                      ads={adsHook.ads}
                      loading={adsHook.loading}
                      selectedIds={adsHook.selectedIds}
                      onSelectAll={adsHook.handleSelectAll}
                      onSelectOne={adsHook.handleSelectOne}
                      sortBy={adsHook.sortBy}
                      sortOrder={adsHook.sortOrder}
                      onSort={adsHook.handleSort}
                      currentPage={adsHook.currentPage}
                      totalPages={adsHook.totalPages}
                      onPageChange={adsHook.handlePageChange}
                      createButton={
                        <CreateMetaAdSection
                          isOpen={isCreateAdPanelOpen}
                          onToggle={() => setIsCreateAdPanelOpen((p) => !p)}
                        />
                      }
                      createPanel={
                        isCreateAdPanelOpen &&
                        channelId &&
                        campaignId && (
                          <CreateMetaAdPanel
                            channelId={parseInt(channelId, 10)}
                            campaignId={campaignId}
                            onSuccess={() => {
                              adsHook.loadAds();
                              setIsCreateAdPanelOpen(false);
                            }}
                            onClose={() => setIsCreateAdPanelOpen(false)}
                          />
                        )
                      }
                    />
                  )}
                  {activeTab === "Creatives" && (
                    <MetaCampaignDetailCreativesTab
                      creatives={creativesHook.creatives}
                      loading={creativesHook.loading}
                      selectedIds={creativesHook.selectedIds}
                      onSelectAll={creativesHook.handleSelectAll}
                      onSelectOne={creativesHook.handleSelectOne}
                      sortBy={creativesHook.sortBy}
                      sortOrder={creativesHook.sortOrder}
                      onSort={creativesHook.handleSort}
                      currentPage={creativesHook.currentPage}
                      totalPages={creativesHook.totalPages}
                      onPageChange={creativesHook.handlePageChange}
                      createButton={
                        <CreateMetaCreativeSection
                          isOpen={isCreateCreativePanelOpen}
                          onToggle={() =>
                            setIsCreateCreativePanelOpen((p) => !p)
                          }
                        />
                      }
                      createPanel={
                        isCreateCreativePanelOpen &&
                        channelId && (
                          <CreateMetaCreativePanel
                            channelId={parseInt(channelId, 10)}
                            onSuccess={() => {
                              creativesHook.loadCreatives();
                              setIsCreateCreativePanelOpen(false);
                            }}
                            onClose={() => setIsCreateCreativePanelOpen(false)}
                          />
                        )
                      }
                    />
                  )}
                  {activeTab === "Logs" && <MetaCampaignDetailLogsTab />}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
