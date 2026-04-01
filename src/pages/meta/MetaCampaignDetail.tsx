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
import type { MetaAdsetRow } from "./hooks/useMetaCampaignDetailAdsets";
import {
  useMetaCampaignDetailAds,
  type MetaAdRow,
} from "./hooks/useMetaCampaignDetailAds";
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
import { normalizeStatusDisplay } from "../../utils/statusHelpers";
import { formatCurrency } from "../../utils/formatters";
import { useEditSummaryModal } from "../../hooks/useEditSummaryModal";

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
  const [editingAdsetId, setEditingAdsetId] = useState<string | null>(null);
  const [editingAdsetInitialData, setEditingAdsetInitialData] = useState<
    Record<string, unknown> | undefined
  >(undefined);
  const [isCreateCreativePanelOpen, setIsCreateCreativePanelOpen] =
    useState(false);
  const [isCreateAdPanelOpen, setIsCreateAdPanelOpen] = useState(false);
  const [profileIdFallback, setProfileIdFallback] = useState<number | null>(
    null,
  );
  const { showEditSummary, EditSummaryModal } = useEditSummaryModal();

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

  const channelIdNum = channelId ? parseInt(channelId, 10) : 0;

  type InlineConfirmAdset =
    | {
        type: "status";
        adsetId: string;
        newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
        row: MetaAdsetRow;
      }
    | { type: "budget"; adsetId: string; newBudget: number; row: MetaAdsetRow };

  const [inlineConfirm, setInlineConfirm] = useState<InlineConfirmAdset | null>(
    null,
  );
  const [inlineConfirmLoading, setInlineConfirmLoading] = useState(false);

  type BulkConfirmAdset =
    | {
        type: "status";
        ids: (string | number)[];
        newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
      }
    | {
        type: "budget";
        ids: (string | number)[];
        newBudget: number;
        isDaily: boolean;
      };

  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmAdset | null>(null);
  const [bulkConfirmLoading, setBulkConfirmLoading] = useState(false);

  type InlineConfirmAd =
    | {
        type: "status";
        adId: string;
        newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
        row: MetaAdRow;
      }
    | { type: "name"; adId: string; newName: string; row: MetaAdRow };

  const [inlineConfirmAd, setInlineConfirmAd] =
    useState<InlineConfirmAd | null>(null);
  const [inlineConfirmAdLoading, setInlineConfirmAdLoading] = useState(false);

  type BulkConfirmAd = {
    type: "status";
    ids: (string | number)[];
    newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  };

  const [bulkConfirmAd, setBulkConfirmAd] = useState<BulkConfirmAd | null>(
    null,
  );
  const [bulkConfirmAdLoading, setBulkConfirmAdLoading] = useState(false);

  const handleAdsetNameClick = (row: MetaAdsetRow) => {
    setEditingAdsetId(String(row.adset_id ?? row.id));
    setEditingAdsetInitialData(row as unknown as Record<string, unknown>);
  };

  const handleInlineStatusChange = (adsetId: string, status: string) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    const row = adsetsHook.adsets.find(
      (a) => String(a.adset_id ?? a.id) === adsetId,
    );
    if (!row) return;
    const newStatus = status.toUpperCase() as InlineConfirmAdset["newStatus"];
    setInlineConfirm({ type: "status", adsetId, newStatus, row });
  };

  const handleInlineBudgetBlur = (
    adsetId: string,
    value: number,
    isDaily: boolean,
  ) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    const row = adsetsHook.adsets.find(
      (a) => String(a.adset_id ?? a.id) === adsetId,
    );
    if (!row) return;
    setInlineConfirm({ type: "budget", adsetId, newBudget: value, row });
  };

  const handleBulkStatus = (ids: (string | number)[], status: string) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    const normalized = status.toUpperCase() as BulkConfirmAdset["newStatus"];
    setBulkConfirm({ type: "status", ids, newStatus: normalized });
  };

  const handleBulkBudget = (
    ids: (string | number)[],
    value: number,
    isDaily: boolean,
  ) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    setBulkConfirm({ type: "budget", ids, newBudget: value, isDaily });
  };

  const handleInlineAdStatusChange = (adId: string, status: string) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    const row = adsHook.ads.find((a) => String(a.ad_id ?? a.id) === adId);
    if (!row) return;
    const newStatus = status.toUpperCase() as InlineConfirmAd["newStatus"];
    setInlineConfirmAd({ type: "status", adId, newStatus, row });
  };

  const handleInlineAdNameChange = (
    adId: string,
    newName: string,
    row: MetaAdRow,
  ) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    setInlineConfirmAd({ type: "name", adId, newName, row });
  };

  const handleBulkAdStatus = (ids: (string | number)[], status: string) => {
    if (!channelIdNum || isNaN(channelIdNum)) return;
    const normalized = status.toUpperCase() as BulkConfirmAd["newStatus"];
    setBulkConfirmAd({ type: "status", ids, newStatus: normalized });
  };

  const runInlineConfirmAd = async () => {
    if (!channelIdNum || isNaN(channelIdNum) || !inlineConfirmAd) return;
    setInlineConfirmAdLoading(true);
    try {
      const payload: { name?: string; status?: string } = {};
      if (inlineConfirmAd.type === "status")
        payload.status = inlineConfirmAd.newStatus;
      else payload.name = inlineConfirmAd.newName;

      const res = await accountsService.updateMetaAd(
        channelIdNum,
        inlineConfirmAd.adId,
        payload,
      );
      const succeededCount = res.updated ?? 0;
      const failedCount = res.failed ?? 0;
      const hasErrors = Array.isArray(res.errors) && res.errors.length > 0;
      const hasOutcome = succeededCount > 0 || failedCount > 0 || hasErrors;

      if (hasOutcome) {
        showEditSummary({
          entityType: "ad",
          action: "updated",
          mode: "inline",
          succeededCount: succeededCount > 0 ? succeededCount : 0,
          failedCount: failedCount > 0 ? failedCount : undefined,
          entityName: inlineConfirmAd.row.ad_name ?? "Ad",
          field: inlineConfirmAd.type === "status" ? "Status" : "Name",
          oldValue:
            inlineConfirmAd.type === "status"
              ? normalizeStatusDisplay(inlineConfirmAd.row.status)
              : (inlineConfirmAd.row.ad_name ?? "—"),
          newValue:
            inlineConfirmAd.type === "status"
              ? normalizeStatusDisplay(inlineConfirmAd.newStatus)
              : inlineConfirmAd.newName,
          details: (res.errors ?? []).slice(0, 5).map((e) => ({
            label: `Ad ${e.adId}`,
            value: e.error,
          })),
        });
      }

      if (succeededCount > 0) {
        adsHook.loadAds();
      }
    } catch (err) {
      console.error("Meta ad inline update failed", err);
      showEditSummary({
        entityType: "ad",
        action: "updated",
        mode: "inline",
        succeededCount: 0,
        failedCount: 1,
        entityName: inlineConfirmAd.row.ad_name ?? "Ad",
        field: inlineConfirmAd.type === "status" ? "Status" : "Name",
        oldValue:
          inlineConfirmAd.type === "status"
            ? normalizeStatusDisplay(inlineConfirmAd.row.status)
            : (inlineConfirmAd.row.ad_name ?? "—"),
        newValue:
          inlineConfirmAd.type === "status"
            ? normalizeStatusDisplay(inlineConfirmAd.newStatus)
            : inlineConfirmAd.newName,
        details: [
          {
            label: "Error",
            value:
              "Something went wrong while applying your inline change. Please try again.",
          },
        ],
      });
    } finally {
      setInlineConfirmAd(null);
      setInlineConfirmAdLoading(false);
    }
  };

  const runBulkConfirmAd = async () => {
    if (!channelIdNum || isNaN(channelIdNum) || !bulkConfirmAd) return;
    setBulkConfirmAdLoading(true);
    try {
      const adIds = bulkConfirmAd.ids.map((id) => String(id));
      const res = await accountsService.bulkUpdateMetaAds(channelIdNum, {
        adIds,
        status: bulkConfirmAd.newStatus,
      });
      const succeededCount = res.updated ?? 0;
      const failedCount = res.failed ?? 0;
      const hasErrors = Array.isArray(res.errors) && res.errors.length > 0;
      const hasOutcome = succeededCount > 0 || failedCount > 0 || hasErrors;

      if (hasOutcome) {
        showEditSummary({
          entityType: "ad",
          action: "updated",
          mode: "bulk",
          succeededCount,
          failedCount: failedCount > 0 ? failedCount : undefined,
          succeededItems: (res.successes ?? []).slice(0, 10).map((s) => ({
            label: `Ad ${s.adId}`,
            field: "Status",
            oldValue: "—",
            newValue: normalizeStatusDisplay(bulkConfirmAd.newStatus),
          })),
          details: (res.errors ?? []).slice(0, 5).map((e) => ({
            label: `Ad ${e.adId}`,
            value: e.error,
          })),
        });
      }

      if (succeededCount > 0) {
        adsHook.loadAds();
        adsHook.setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Meta ad bulk update failed", err);
      showEditSummary({
        entityType: "ad",
        action: "updated",
        mode: "bulk",
        succeededCount: 0,
        failedCount: bulkConfirmAd.ids.length,
        succeededItems: [],
        details: [
          {
            label: "Error",
            value:
              "Something went wrong while applying your bulk change. Please try again.",
          },
        ],
      });
    } finally {
      setBulkConfirmAd(null);
      setBulkConfirmAdLoading(false);
    }
  };

  const runInlineConfirm = async () => {
    if (!channelIdNum || isNaN(channelIdNum) || !inlineConfirm) return;
    setInlineConfirmLoading(true);
    try {
      if (inlineConfirm.type === "status") {
        const res = await accountsService.bulkUpdateMetaAdSets(channelIdNum, {
          adsetIds: [inlineConfirm.adsetId],
          status: inlineConfirm.newStatus,
        });
        const succeededCount = res.updated ?? 0;
        const failedCount = res.failed ?? 0;
        const hasErrors = Array.isArray(res.errors) && res.errors.length > 0;
        const hasOutcome = succeededCount > 0 || failedCount > 0 || hasErrors;

        if (hasOutcome) {
          showEditSummary({
            entityType: "adSet",
            action: "updated",
            mode: "inline",
            succeededCount: succeededCount > 0 ? succeededCount : 0,
            failedCount: failedCount > 0 ? failedCount : undefined,
            entityName: inlineConfirm.row.adset_name ?? "Ad set",
            field: "Status",
            oldValue: normalizeStatusDisplay(inlineConfirm.row.status),
            newValue: normalizeStatusDisplay(inlineConfirm.newStatus),
            details: (res.errors ?? []).slice(0, 5).map((e) => ({
              label: `Ad set ${e.adsetId}`,
              value: e.error,
            })),
          });
        }

        if (succeededCount > 0) {
          adsetsHook.loadAdsets();
        }
      } else {
        const payload =
          inlineConfirm.row.daily_budget != null &&
          String(inlineConfirm.row.daily_budget).trim() !== "" &&
          parseFloat(String(inlineConfirm.row.daily_budget)) > 0
            ? {
                adsetIds: [inlineConfirm.adsetId],
                daily_budget: inlineConfirm.newBudget,
              }
            : {
                adsetIds: [inlineConfirm.adsetId],
                lifetime_budget: inlineConfirm.newBudget,
              };
        const res = await accountsService.bulkUpdateMetaAdSets(
          channelIdNum,
          payload,
        );
        const succeededCount = res.updated ?? 0;
        const failedCount = res.failed ?? 0;
        const hasErrors = Array.isArray(res.errors) && res.errors.length > 0;
        const hasOutcome = succeededCount > 0 || failedCount > 0 || hasErrors;

        if (hasOutcome) {
          const currentStr =
            inlineConfirm.row.daily_budget != null &&
            String(inlineConfirm.row.daily_budget).trim() !== "" &&
            parseFloat(String(inlineConfirm.row.daily_budget)) > 0
              ? String(inlineConfirm.row.daily_budget)
              : inlineConfirm.row.lifetime_budget != null &&
                  String(inlineConfirm.row.lifetime_budget).trim() !== "" &&
                  parseFloat(String(inlineConfirm.row.lifetime_budget)) > 0
                ? String(inlineConfirm.row.lifetime_budget)
                : "";
          const current = currentStr !== "" ? Number(currentStr) : null;
          showEditSummary({
            entityType: "adSet",
            action: "updated",
            mode: "inline",
            succeededCount: succeededCount > 0 ? succeededCount : 0,
            failedCount: failedCount > 0 ? failedCount : undefined,
            entityName: inlineConfirm.row.adset_name ?? "Ad set",
            field: "Budget",
            oldValue: current != null ? formatCurrency(current) : "—",
            newValue: formatCurrency(inlineConfirm.newBudget),
            details: (res.errors ?? []).slice(0, 5).map((e) => ({
              label: `Ad set ${e.adsetId}`,
              value: e.error,
            })),
          });
        }

        if (succeededCount > 0) {
          adsetsHook.loadAdsets();
        }
      }
    } catch (err) {
      console.error("Meta ad set inline update failed", err);
      showEditSummary({
        entityType: "adSet",
        action: "updated",
        mode: "inline",
        succeededCount: 0,
        failedCount: 1,
        entityName: inlineConfirm.row.adset_name ?? "Ad set",
        field: inlineConfirm.type === "status" ? "Status" : "Budget",
        oldValue:
          inlineConfirm.type === "status"
            ? normalizeStatusDisplay(inlineConfirm.row.status)
            : (() => {
                const currentStr =
                  inlineConfirm.row.daily_budget != null &&
                  String(inlineConfirm.row.daily_budget).trim() !== "" &&
                  parseFloat(String(inlineConfirm.row.daily_budget)) > 0
                    ? String(inlineConfirm.row.daily_budget)
                    : inlineConfirm.row.lifetime_budget != null &&
                        String(inlineConfirm.row.lifetime_budget).trim() !==
                          "" &&
                        parseFloat(String(inlineConfirm.row.lifetime_budget)) >
                          0
                      ? String(inlineConfirm.row.lifetime_budget)
                      : "";
                const current = currentStr !== "" ? Number(currentStr) : null;
                return current != null ? formatCurrency(current) : "—";
              })(),
        newValue:
          inlineConfirm.type === "status"
            ? normalizeStatusDisplay(inlineConfirm.newStatus)
            : formatCurrency(inlineConfirm.newBudget),
        details: [
          {
            label: "Error",
            value:
              "Something went wrong while applying your inline change. Please try again.",
          },
        ],
      });
    } finally {
      setInlineConfirm(null);
      setInlineConfirmLoading(false);
    }
  };

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
                        (isCreateAdSetPanelOpen || editingAdsetId) &&
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
                            mode={editingAdsetId ? "edit" : "create"}
                            adsetId={editingAdsetId ?? undefined}
                            initialData={editingAdsetInitialData}
                            onSuccess={() => {
                              adsetsHook.loadAdsets();
                              setIsCreateAdSetPanelOpen(false);
                              setEditingAdsetId(null);
                              setEditingAdsetInitialData(undefined);
                            }}
                            onClose={() => {
                              setIsCreateAdSetPanelOpen(false);
                              setEditingAdsetId(null);
                              setEditingAdsetInitialData(undefined);
                            }}
                          />
                        )
                      }
                      onAdsetNameClick={handleAdsetNameClick}
                      onInlineStatusChange={handleInlineStatusChange}
                      onInlineBudgetBlur={handleInlineBudgetBlur}
                      onBulkStatus={handleBulkStatus}
                      onBulkBudget={handleBulkBudget}
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
                      onInlineStatusChange={handleInlineAdStatusChange}
                      onInlineNameBlur={handleInlineAdNameChange}
                      onBulkStatus={handleBulkAdStatus}
                    />
                  )}
                  {activeTab === "Creatives" && (
                    <MetaCampaignDetailCreativesTab
                      creatives={creativesHook.creatives}
                      loading={creativesHook.loading}
                      selectedIds={creativesHook.selectedIds}
                      onSelectAll={creativesHook.handleSelectAll}
                      onSelectOne={creativesHook.handleSelectOne}
                      searchName={creativesHook.searchName}
                      onSearchNameChange={creativesHook.setSearchName}
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

                {inlineConfirm && (
                  <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !inlineConfirmLoading)
                        setInlineConfirm(null);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[17.1px] font-semibold text-[#072929]">
                          {inlineConfirm.type === "status"
                            ? "Confirm Status Changes"
                            : "Confirm Budget Changes"}
                        </h3>
                      </div>
                      <div className="mb-2 text-[11px] text-[#556179]">
                        Review the change below and click Confirm to apply.
                      </div>
                      <div className="mb-6">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full table-fixed">
                            <thead className="bg-[#f5f5f0]">
                              <tr>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">
                                  Ad Set Name
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Old Value
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  New Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200">
                                <td
                                  className="px-4 py-2 text-[10.64px] text-[#072929] truncate"
                                  title={
                                    inlineConfirm.row.adset_name ?? undefined
                                  }
                                >
                                  {inlineConfirm.row.adset_name ?? "—"}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                  {inlineConfirm.type === "status"
                                    ? normalizeStatusDisplay(
                                        inlineConfirm.row.status,
                                      )
                                    : (() => {
                                        const d =
                                          inlineConfirm.row.daily_budget !=
                                            null &&
                                          String(
                                            inlineConfirm.row.daily_budget,
                                          ).trim() !== "" &&
                                          parseFloat(
                                            String(
                                              inlineConfirm.row.daily_budget,
                                            ),
                                          ) > 0
                                            ? String(
                                                inlineConfirm.row.daily_budget,
                                              )
                                            : inlineConfirm.row
                                                  .lifetime_budget != null &&
                                                String(
                                                  inlineConfirm.row
                                                    .lifetime_budget,
                                                ).trim() !== "" &&
                                                parseFloat(
                                                  String(
                                                    inlineConfirm.row
                                                      .lifetime_budget,
                                                  ),
                                                ) > 0
                                              ? String(
                                                  inlineConfirm.row
                                                    .lifetime_budget,
                                                )
                                              : "";
                                        return d !== ""
                                          ? formatCurrency(Number(d))
                                          : "—";
                                      })()}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                  {inlineConfirm.type === "status"
                                    ? normalizeStatusDisplay(
                                        inlineConfirm.newStatus,
                                      )
                                    : formatCurrency(inlineConfirm.newBudget)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            !inlineConfirmLoading && setInlineConfirm(null)
                          }
                          disabled={inlineConfirmLoading}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={runInlineConfirm}
                          disabled={inlineConfirmLoading}
                          className="create-entity-button btn-sm flex items-center gap-2"
                        >
                          {inlineConfirmLoading ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {bulkConfirm && (
                  <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !bulkConfirmLoading)
                        setBulkConfirm(null);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[17.1px] font-semibold text-[#072929]">
                          {bulkConfirm.type === "status"
                            ? "Confirm Status Changes"
                            : "Confirm Budget Changes"}
                        </h3>
                      </div>
                      <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4 mb-4">
                        <span className="text-[12.16px] text-[#556179]">
                          {bulkConfirm.ids.length} ad set
                          {bulkConfirm.ids.length !== 1 ? "s" : ""} will be
                          updated:{" "}
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {bulkConfirm.type === "status" ? "Status" : "Budget"}{" "}
                          change
                        </span>
                      </div>
                      {(() => {
                        const rowsMap = new Map<string, MetaAdsetRow>();
                        adsetsHook.adsets.forEach((row) => {
                          const key = String(row.adset_id ?? row.id);
                          rowsMap.set(key, row);
                        });
                        const data = bulkConfirm.ids
                          .map((id) => rowsMap.get(String(id)))
                          .filter((r): r is MetaAdsetRow => !!r);
                        const preview = data.slice(0, 10);
                        const hasMore = data.length > 10;
                        return (
                          <div className="mb-6">
                            <div className="mb-2 text-[10.64px] text-[#556179]">
                              {hasMore
                                ? `Showing ${preview.length} of ${data.length} selected ad sets`
                                : `${data.length} ad set${data.length !== 1 ? "s" : ""} selected`}
                            </div>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <table className="w-full table-fixed">
                                <thead className="bg-[#f5f5f0]">
                                  <tr>
                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">
                                      Ad Set Name
                                    </th>
                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                      Old Value
                                    </th>
                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                      New Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {preview.map((row) => {
                                    const name = row.adset_name ?? "—";
                                    const budgetStr =
                                      row.daily_budget != null &&
                                      String(row.daily_budget).trim() !== "" &&
                                      parseFloat(String(row.daily_budget)) > 0
                                        ? String(row.daily_budget)
                                        : row.lifetime_budget != null &&
                                            String(
                                              row.lifetime_budget,
                                            ).trim() !== "" &&
                                            parseFloat(
                                              String(row.lifetime_budget),
                                            ) > 0
                                          ? String(row.lifetime_budget)
                                          : "";
                                    const oldVal =
                                      bulkConfirm.type === "status"
                                        ? normalizeStatusDisplay(row.status)
                                        : budgetStr !== ""
                                          ? formatCurrency(Number(budgetStr))
                                          : "—";
                                    const newVal =
                                      bulkConfirm.type === "status"
                                        ? normalizeStatusDisplay(
                                            bulkConfirm.newStatus,
                                          )
                                        : formatCurrency(bulkConfirm.newBudget);
                                    return (
                                      <tr
                                        key={String(row.adset_id ?? row.id)}
                                        className="border-b border-gray-200 last:border-b-0"
                                      >
                                        <td
                                          className="px-4 py-2 text-[10.64px] text-[#072929] max-w-[240px] truncate"
                                          title={name}
                                        >
                                          {name}
                                        </td>
                                        <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                          {oldVal}
                                        </td>
                                        <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                          {newVal}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            !bulkConfirmLoading && setBulkConfirm(null)
                          }
                          disabled={bulkConfirmLoading}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !channelIdNum ||
                              isNaN(channelIdNum) ||
                              !bulkConfirm
                            )
                              return;
                            setBulkConfirmLoading(true);
                            try {
                              let payload:
                                | { adsetIds: string[]; status: string }
                                | { adsetIds: string[]; daily_budget: number }
                                | {
                                    adsetIds: string[];
                                    lifetime_budget: number;
                                  };
                              const adsetIds = bulkConfirm.ids.map((id) =>
                                String(id),
                              );
                              if (bulkConfirm.type === "status") {
                                payload = {
                                  adsetIds,
                                  status: bulkConfirm.newStatus,
                                };
                              } else {
                                payload = bulkConfirm.isDaily
                                  ? {
                                      adsetIds,
                                      daily_budget: bulkConfirm.newBudget,
                                    }
                                  : {
                                      adsetIds,
                                      lifetime_budget: bulkConfirm.newBudget,
                                    };
                              }
                              const res =
                                await accountsService.bulkUpdateMetaAdSets(
                                  channelIdNum,
                                  payload as any,
                                );
                              const succeededCount = res.updated ?? 0;
                              const failedCount = res.failed ?? 0;
                              const succeededItems = (res.successes ?? [])
                                .slice(0, 10)
                                .map((s) => ({
                                  label: s.adsetName ?? `Ad set ${s.adsetId}`,
                                  field: s.field,
                                  oldValue: s.oldValue,
                                  newValue: s.newValue,
                                }));
                              const hasErrors =
                                Array.isArray(res.errors) &&
                                res.errors.length > 0;
                              const hasOutcome =
                                succeededCount > 0 ||
                                failedCount > 0 ||
                                hasErrors;
                              if (hasOutcome) {
                                showEditSummary({
                                  entityType: "adSet",
                                  action:
                                    bulkConfirm.type === "status"
                                      ? "updated"
                                      : "updated",
                                  mode: "bulk",
                                  succeededCount,
                                  failedCount:
                                    failedCount > 0 ? failedCount : undefined,
                                  succeededItems,
                                  details: (res.errors ?? [])
                                    .slice(0, 5)
                                    .map((e) => ({
                                      label: `Ad set ${e.adsetId}`,
                                      value: e.error,
                                    })),
                                });
                              }
                              if (succeededCount > 0) {
                                adsetsHook.loadAdsets();
                                adsetsHook.setSelectedIds(new Set());
                              }
                              setBulkConfirm(null);
                            } catch (err) {
                              console.error(
                                "Meta ad set bulk update failed",
                                err,
                              );
                              showEditSummary({
                                entityType: "adSet",
                                action: "updated",
                                mode: "bulk",
                                succeededCount: 0,
                                failedCount: bulkConfirm.ids.length,
                                succeededItems: [],
                                details: [
                                  {
                                    label: "Error",
                                    value:
                                      "Something went wrong while applying your bulk change. Please try again.",
                                  },
                                ],
                              });
                              setBulkConfirm(null);
                            } finally {
                              setBulkConfirmLoading(false);
                            }
                          }}
                          disabled={bulkConfirmLoading}
                          className="create-entity-button btn-sm flex items-center gap-2"
                        >
                          {bulkConfirmLoading ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {inlineConfirmAd && (
                  <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                    onClick={(e) => {
                      if (
                        e.target === e.currentTarget &&
                        !inlineConfirmAdLoading
                      )
                        setInlineConfirmAd(null);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[17.1px] font-semibold text-[#072929]">
                          {inlineConfirmAd.type === "status"
                            ? "Confirm Status Changes"
                            : "Confirm Name Changes"}
                        </h3>
                      </div>
                      <div className="mb-2 text-[11px] text-[#556179]">
                        Review the change below and click Confirm to apply.
                      </div>
                      <div className="mb-6">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full table-fixed">
                            <thead className="bg-[#f5f5f0]">
                              <tr>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">
                                  Ad Name
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Old Value
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  New Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200">
                                <td
                                  className="px-4 py-2 text-[10.64px] text-[#072929] truncate"
                                  title={
                                    inlineConfirmAd.row.ad_name ?? undefined
                                  }
                                >
                                  {inlineConfirmAd.row.ad_name ?? "—"}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                  {inlineConfirmAd.type === "status"
                                    ? normalizeStatusDisplay(
                                        inlineConfirmAd.row.status,
                                      )
                                    : (inlineConfirmAd.row.ad_name ?? "—")}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                  {inlineConfirmAd.type === "status"
                                    ? normalizeStatusDisplay(
                                        inlineConfirmAd.newStatus,
                                      )
                                    : inlineConfirmAd.newName}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            !inlineConfirmAdLoading && setInlineConfirmAd(null)
                          }
                          disabled={inlineConfirmAdLoading}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={runInlineConfirmAd}
                          disabled={inlineConfirmAdLoading}
                          className="create-entity-button btn-sm flex items-center gap-2"
                        >
                          {inlineConfirmAdLoading ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {bulkConfirmAd && (
                  <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !bulkConfirmAdLoading)
                        setBulkConfirmAd(null);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[17.1px] font-semibold text-[#072929]">
                          Confirm Status Changes
                        </h3>
                      </div>
                      <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4 mb-4">
                        <span className="text-[12.16px] text-[#556179]">
                          {bulkConfirmAd.ids.length} ad
                          {bulkConfirmAd.ids.length !== 1 ? "s" : ""} will be
                          updated:{" "}
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          Status change
                        </span>
                      </div>
                      {(() => {
                        const rowsMap = new Map<string, MetaAdRow>();
                        adsHook.ads.forEach((row) => {
                          const key = String(row.ad_id ?? row.id);
                          rowsMap.set(key, row);
                        });
                        const data = bulkConfirmAd.ids
                          .map((id) => rowsMap.get(String(id)))
                          .filter((r): r is MetaAdRow => !!r);
                        const preview = data.slice(0, 10);
                        const hasMore = data.length > 10;
                        return (
                          <div className="mb-6">
                            <div className="mb-2 text-[10.64px] text-[#556179]">
                              {hasMore
                                ? `Showing ${preview.length} of ${data.length} selected ads`
                                : `${data.length} ad${data.length !== 1 ? "s" : ""} selected`}
                            </div>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <table className="w-full table-fixed">
                                <thead className="bg-[#f5f5f0]">
                                  <tr>
                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">
                                      Ad Name
                                    </th>
                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                      Old Value
                                    </th>
                                    <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                      New Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {preview.map((row) => {
                                    const name = row.ad_name ?? "—";
                                    const oldVal = normalizeStatusDisplay(
                                      row.status,
                                    );
                                    const newVal = normalizeStatusDisplay(
                                      bulkConfirmAd.newStatus,
                                    );
                                    return (
                                      <tr
                                        key={String(row.ad_id ?? row.id)}
                                        className="border-b border-gray-200 last:border-b-0"
                                      >
                                        <td
                                          className="px-4 py-2 text-[10.64px] text-[#072929] max-w-[240px] truncate"
                                          title={name}
                                        >
                                          {name}
                                        </td>
                                        <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                          {oldVal}
                                        </td>
                                        <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                          {newVal}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            !bulkConfirmAdLoading && setBulkConfirmAd(null)
                          }
                          disabled={bulkConfirmAdLoading}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={runBulkConfirmAd}
                          disabled={bulkConfirmAdLoading}
                          className="create-entity-button btn-sm flex items-center gap-2"
                        >
                          {bulkConfirmAdLoading ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <EditSummaryModal />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
