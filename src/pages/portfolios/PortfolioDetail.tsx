import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  LayoutDashboard,
  Bot,
  AlertTriangle,
  History,
  Pencil,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAssistant } from "../../contexts/AssistantContext";
import { usePortfolio, usePortfolioLiveMetrics } from "../../hooks/queries/usePortfolios";
import {
  useRunPortfolio,
  useUpdatePortfolio,
} from "../../hooks/mutations/usePortfolioMutations";
import { portfoliosService } from "../../services/portfolios";
import type { PortfolioLatestTracking } from "../../services/portfolios";
import { Sidebar } from "../../components/layout/Sidebar";
import { AccountsHeader } from "../../components/layout/AccountsHeader";
import { Assistant } from "../../components/layout/Assistant";
import { Banner, Button, ConfirmationModal, KPICard, Loader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { CreatePortfolioWizard } from "./components/CreatePortfolioWizard";
import { AnalysisHistoryModal } from "./components/AnalysisHistoryModal";
import { PortfolioActionsTab } from "./components/PortfolioActionsTab";

type Tab = "campaigns" | "dashboards" | "actions";

function fmt(val: number | null | undefined, prefix = ""): string {
  if (val == null) return "—";
  return `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function healthBadgeClasses(health: string | null | undefined): string {
  if (!health) return "bg-sandstorm-s20 text-forest-f30 border-sandstorm-s40";
  const h = health.toLowerCase();
  if (h.includes("excellent")) return "bg-forest-f0 text-forest-f50 border-forest-f40/40";
  if (h.includes("good")) return "bg-forest-f0/60 text-forest-f40 border-forest-f40/30";
  if (h.includes("fair") || h.includes("moderate")) return "bg-yellow-50 text-yellow-700 border-yellow-300";
  if (h.includes("poor") || h.includes("critical")) return "bg-red-50 text-red-700 border-red-300";
  return "bg-sandstorm-s20 text-forest-f30 border-sandstorm-s40";
}

function pacingTextClass(pct: number): string {
  if (pct > 110) return "text-red-600";
  if (pct > 100) return "text-yellow-600";
  return "text-forest-f60";
}

function formatKpiValue(targetType: string | null | undefined, val: number | null | undefined): string {
  if (val == null) return "—";
  const t = (targetType ?? "").toUpperCase();
  if (t === "CPA" || t === "CPC" || t === "CPM") return `$${val.toFixed(2)}`;
  if (t === "ROAS") return `${val.toFixed(2)}x`;
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export const PortfolioDetail: React.FC = () => {
  const navigate = useNavigate();
  const { accountId: accountIdStr, portfolioId: portfolioIdStr } =
    useParams<{ accountId: string; portfolioId: string }>();
  const accountId = Number(accountIdStr);
  const portfolioId = Number(portfolioIdStr);
  const { sidebarWidth } = useSidebar();
  const { setPortfolioScope, clearPortfolioScope } = useAssistant();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [successMsg, setSuccessMsg] = useState("");
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const isEditMode = searchParams.get("edit") === "true";

  const { data: portfolio, isLoading, error, refetch: refetchPortfolio } = usePortfolio(
    accountId,
    portfolioId,
  );

  const { data: liveMetrics, isLoading: metricsLoading } = usePortfolioLiveMetrics(
    [portfolioId],
    { enabled: !!portfolioId },
  );
  const tracking: PortfolioLatestTracking | null = liveMetrics?.[String(portfolioId)] ?? null;

  const runMutation = useRunPortfolio(accountId);
  const updateMutation = useUpdatePortfolio(accountId, portfolioId);

  useEffect(() => {
    if (portfolio) {
      setPageTitle(portfolio.name);
      setPortfolioScope(portfolio.id, portfolio.name, {
        accountId: portfolio.accountId,
        channelId: portfolio.channelId ?? undefined,
        profileId: portfolio.profileId ?? undefined,
        profileName: portfolio.profileName ?? undefined,
        platform: portfolio.platform ?? undefined,
        portfolioDetail: {
          status: portfolio.status,
          platform: portfolio.platform,
          totalBudget: portfolio.totalBudget ?? undefined,
          targetType: portfolio.targetType ?? undefined,
          targetValue: portfolio.targetValue ?? undefined,
          startDate: portfolio.startDate!,
          endDate: portfolio.endDate!,
          campaignCount: portfolio.campaigns?.length ?? 0,
        },
      });
    }
    return () => {
      resetPageTitle();
      clearPortfolioScope();
    };
  }, [portfolio, setPortfolioScope, clearPortfolioScope]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "dashboards" || tab === "agents") {
      setActiveTab("dashboards");
    } else if (tab === "actions") {
      setActiveTab("actions");
    } else if (tab === "dashboard" || tab === "campaigns") {
      setActiveTab("campaigns");
    }
  }, [searchParams]);

  const handleRun = async () => {
    try {
      const res = await runMutation.mutateAsync(portfolioId);
      const runStatus = res.result?.status ?? res.status;
      setShowRunConfirm(false);
      setSuccessMsg(
        runStatus === "success"
          ? "Portfolio run completed — snapshot recorded successfully."
          : `Portfolio run finished with status: ${runStatus}`,
      );
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch {
      setShowRunConfirm(false);
      setSuccessMsg("");
    }
  };

  const handleStatusToggleClick = () => {
    if (!portfolio) return;
    if (portfolio.status === "enabled") {
      setShowStatusConfirm(true);
    } else {
      confirmStatusToggle();
    }
  };

  const confirmStatusToggle = async () => {
    if (!portfolio) return;
    const newStatus = portfolio.status === "enabled" ? "disabled" : "enabled";
    try {
      await updateMutation.mutateAsync({ status: newStatus });
      setShowStatusConfirm(false);
      setSuccessMsg(`Portfolio ${newStatus === "enabled" ? "enabled" : "disabled"} successfully.`);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch {
      setShowStatusConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1 w-full" style={{ marginLeft: `${sidebarWidth}px` }}>
          <AccountsHeader />
          <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white min-h-[calc(100vh-64px)] flex items-center justify-center">
            <Loader size="lg" message="Loading portfolio..." />
          </div>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1 w-full" style={{ marginLeft: `${sidebarWidth}px` }}>
          <AccountsHeader />
          <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white min-h-[calc(100vh-64px)] flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 text-forest-f30 mx-auto mb-3" />
              <p className="text-[15px] text-forest-f60 mb-2">Portfolio not found</p>
              <Button onClick={() => navigate("/portfolios")}>
                Back to Portfolios
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "campaigns", label: "Campaigns", icon: <Settings className="w-4 h-4" /> },
    { id: "dashboards", label: "Dashboards", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "actions", label: "Actions", icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AccountsHeader />
        <Assistant>
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white min-h-[calc(100vh-64px)]">
          <div className="space-y-6">
            {successMsg && (
              <Banner
                type="success"
                message={successMsg}
                dismissable
                onDismiss={() => setSuccessMsg("")}
              />
            )}

            {/* Breadcrumb + Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/portfolios")}
                  className="p-1.5 rounded-lg hover:bg-sandstorm-s10 transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-forest-f30" />
                </button>
                <div>
                  <h1 className="text-[20px] font-medium text-forest-f60">
                    {portfolio.name}
                  </h1>
                  <p className="text-[12px] text-forest-f30 mt-0.5">
                    {portfolio.accountName} &middot;{" "}
                    <span className="capitalize">{portfolio.platform}</span>
                    {portfolio.profileName && (
                      <> &middot; {portfolio.profileName}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleStatusToggleClick}
                  disabled={updateMutation.isPending}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors whitespace-nowrap",
                    portfolio.status === "enabled"
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
                  )}
                >
                  {updateMutation.isPending
                    ? "Updating..."
                    : portfolio.status === "enabled"
                      ? "Live"
                      : "Disabled"}
                </button>
                <button
                  onClick={() => setSearchParams({ edit: "true" })}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s5 transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KPICard label="Total Budget" value={fmt(portfolio.totalBudget, "$")} />
              <KPICard label="Campaigns" value={portfolio.campaigns?.length ?? 0} />
              <KPICard label="Status" value={portfolio.status === "enabled" ? "Live" : "Disabled"} />
              <KPICard
                label={portfolio.targetType ?? "Target"}
                value={portfolio.targetValue != null ? fmt(portfolio.targetValue) : "—"}
              />
              <div className="p-4 bg-sandstorm-s5 rounded-[10px] border border-sandstorm-s40 flex flex-col justify-center">
                <span className="text-[12px] text-forest-f30">Last Run</span>
                <p className="text-[13px] font-medium text-forest-f60 mt-1">
                  {portfolio.lastRunAt ? new Date(portfolio.lastRunAt).toLocaleString() : "Never"}
                </p>
              </div>
            </div>

            {/* Date range, tags & tracked metrics */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]">
              {(portfolio.startDate || portfolio.endDate) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-forest-f30">Period:</span>
                  <span className="text-forest-f60 font-medium">
                    {fmtDate(portfolio.startDate)} — {fmtDate(portfolio.endDate)}
                  </span>
                </div>
              )}
              {(portfolio.tags?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-forest-f30">Tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {portfolio.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-sandstorm-s10 text-forest-f30 rounded text-[11px]">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {(portfolio.metrics?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-forest-f30">Tracking:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {portfolio.metrics?.map((m: any) => (
                      <span key={m.id} className="px-2 py-0.5 bg-forest-f40/10 text-forest-f40 rounded text-[11px]">
                        {m.metricName}{m.isRecommended && " ★"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-sandstorm-s40">
              <nav className="flex gap-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 text-[13px] border-b-2 transition-colors -mb-px",
                      activeTab === tab.id
                        ? "border-forest-f40 text-forest-f60 font-medium"
                        : "border-transparent text-forest-f30 hover:text-forest-f60",
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "campaigns" && (
              <CampaignsTab
                campaigns={portfolio.campaigns ?? []}
                portfolio={portfolio}
                accountId={accountId}
                portfolioId={portfolioId}
                tracking={tracking}
                metricsLoading={metricsLoading}
                onPortfolioUpdate={refetchPortfolio}
              />
            )}
            {activeTab === "dashboards" && (
              <PortfolioDashboardsTab accountId={accountId} portfolioId={portfolioId} />
            )}
            {activeTab === "actions" && (
              <PortfolioActionsTab accountId={accountId} portfolioId={portfolioId} />
            )}
          </div>
        </div>
        </Assistant>
      </div>

      <ConfirmationModal
        isOpen={showStatusConfirm}
        onClose={() => !updateMutation.isPending && setShowStatusConfirm(false)}
        onConfirm={confirmStatusToggle}
        title="Disable Portfolio"
        message="Are you sure you want to disable this portfolio? It will stop running on schedule."
        confirmButtonLabel="Disable"
        isDangerous
        isLoading={updateMutation.isPending}
        loadingLabel="Disabling..."
      />

      <ConfirmationModal
        isOpen={showRunConfirm}
        onClose={() => !runMutation.isPending && setShowRunConfirm(false)}
        onConfirm={handleRun}
        title="Run Portfolio"
        message="This will fetch the latest campaign metrics and record a tracking snapshot. Continue?"
        confirmButtonLabel="Run Now"
        isLoading={runMutation.isPending}
        loadingLabel="Running..."
      />

      {isEditMode && portfolio && (
        <CreatePortfolioWizard
          isOpen
          onClose={() => setSearchParams({})}
          onSuccess={() => {
            setSearchParams({});
            setSuccessMsg("Portfolio updated successfully.");
            setTimeout(() => setSuccessMsg(""), 5000);
          }}
          accountId={accountId}
          channelId={portfolio.channelId ?? 0}
          profileId={portfolio.profileId}
          platform={portfolio.platform}
          editPortfolio={portfolio}
        />
      )}
    </div>
  );
};

// ── Portfolio Dashboards Tab ──────────────────────────────────────────────

const PortfolioDashboardsTab: React.FC<{ accountId: number; portfolioId: number }> = ({ accountId, portfolioId }) => {
  const { openAssistant } = useAssistant();
  const [dashboards, setDashboards] = useState<Array<{ id: number; name: string; updatedAt: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fetchDashboards = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { getDashboardsByPortfolio } = await import("../../services/dashboard");
      const data = await getDashboardsByPortfolio(accountId, portfolioId);
      setDashboards(data.map((d) => ({ id: d.id, name: d.name, updatedAt: d.updatedAt })));
    } catch {
      if (!isRefresh) setDashboards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchDashboards().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [accountId, portfolioId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-forest-f30">
          {loading ? "" : `${dashboards.length} dashboard${dashboards.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          {dashboards.length > 0 && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-forest-f40 border border-sandstorm-s40 rounded-lg hover:bg-sandstorm-s5 transition-colors"
              aria-label="View analysis history"
            >
              <History className="w-3.5 h-3.5" />
              Analysis History
            </button>
          )}
          <button
            onClick={() => fetchDashboards(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-forest-f40 border border-sandstorm-s40 rounded-lg hover:bg-sandstorm-s5 transition-colors disabled:opacity-50"
            aria-label="Refresh dashboards"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {(loading || refreshing) && (
        <div className="flex items-center justify-center py-12">
          <Loader size="md" message={loading ? "Loading dashboards..." : "Refreshing..."} />
        </div>
      )}

      {!loading && !refreshing && dashboards.length === 0 && (
        <div className="text-center py-12">
          <Bot className="w-10 h-10 mx-auto mb-3 text-forest-f20" />
          <p className="text-[14px] text-forest-f30 mb-1">No dashboards yet</p>
          <p className="text-[12px] text-forest-f20 mb-4">
            Use the Assistant to create dashboards for this portfolio.
          </p>
          <button
            type="button"
            onClick={openAssistant}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-forest-f40 rounded-lg hover:bg-forest-f50 transition-colors shadow-sm"
          >
            <Bot className="w-4 h-4" />
            Open Assistant
          </button>
        </div>
      )}

      {!loading && dashboards.length > 0 && dashboards.map((d) => (
        <div
          key={d.id}
          onClick={() => window.open(`/brands/${accountId}/dashboards/${d.id}`, "_blank")}
          className={cn(
            "flex items-center justify-between p-4 border border-sandstorm-s40 rounded-lg hover:bg-sandstorm-s5 cursor-pointer transition-colors",
            refreshing && "opacity-50 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-forest-f40" />
            <div>
              <p className="text-[14px] font-medium text-forest-f60">{d.name}</p>
              {d.updatedAt && (
                <p className="text-[12px] text-forest-f20">
                  Updated {new Date(d.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      <AnalysisHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        accountId={accountId}
        dashboards={dashboards}
      />
    </div>
  );
};

// ── Campaigns Tab ─────────────────────────────────────────────────────────

interface CampaignsTabProps {
  campaigns: any[];
  portfolio: any;
  accountId: number;
  portfolioId: number;
  tracking: PortfolioLatestTracking | null;
  metricsLoading: boolean;
  onPortfolioUpdate: () => void;
}

const CampaignsTab: React.FC<CampaignsTabProps> = ({
  campaigns,
  portfolio,
  accountId,
  portfolioId,
  tracking,
  metricsLoading,
  onPortfolioUpdate,
}) => {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRemoveCampaign = useCallback(async (campaignDbId: number, campaignName: string) => {
    setRemovingId(campaignDbId);
  }, []);

  const confirmRemove = useCallback(async () => {
    if (removingId == null) return;
    setRemoveLoading(true);
    setRemoveError(null);
    try {
      const remaining = campaigns
        .filter((c: any) => c.id !== removingId)
        .map((c: any) => ({
          campaign_id: c.campaignId,
          campaign_name: c.campaignName,
          campaign_type: c.campaignType || "",
          campaign_status: c.campaignStatus || "",
        }));
      await portfoliosService.updatePortfolio(accountId, portfolioId, {
        campaigns: remaining,
      });
      onPortfolioUpdate();
      setRemovingId(null);
    } catch (err: any) {
      setRemoveError(err?.response?.data?.error ?? err?.message ?? "Failed to remove campaign");
    } finally {
      setRemoveLoading(false);
    }
  }, [removingId, campaigns, accountId, portfolioId, onPortfolioUpdate]);

  const removingCampaign = campaigns.find((c: any) => c.id === removingId);
  const t = tracking;

  return (
    <div className="space-y-5">
      {/* Live ETL Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Spend (FTD)" value={metricsLoading ? null : t?.totalSpend} prefix="$" />
        <MetricCard
          label="Pacing"
          value={metricsLoading ? null : t?.pacingPercentage}
          suffix="%"
          valueClassName={t?.pacingPercentage != null ? pacingTextClass(t.pacingPercentage) : undefined}
        />
        <MetricCard label="Conversions" value={metricsLoading ? null : t?.conversions} />
        <MetricCard label="Revenue" value={metricsLoading ? null : t?.revenue} prefix="$" />
        <div className="p-3 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[10px]">
          <p className="text-[11px] text-forest-f30 mb-1">Health</p>
          {metricsLoading ? (
            <div className="h-5 w-20 bg-sandstorm-s20 rounded animate-pulse" />
          ) : t?.health ? (
            <span className={cn(
              "inline-flex px-2 py-0.5 rounded text-[11px] font-medium border",
              healthBadgeClasses(t.health),
            )}>
              {t.health}
            </span>
          ) : (
            <span className="text-[13px] text-forest-f30">—</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="CPC" value={metricsLoading ? null : t?.cpc} prefix="$" />
        <MetricCard label="CPA" value={metricsLoading ? null : t?.cpa} prefix="$" />
        <MetricCard label="ROAS" value={metricsLoading ? null : t?.roas} suffix="x" />
        <MetricCard
          label="Achievement"
          value={metricsLoading ? null : t?.achievementPercentage}
          suffix="%"
        />
      </div>

      {tracking?.isLive && (
        <p className="text-[11px] text-forest-f30 -mt-2">
          Metrics computed live from ETL data
        </p>
      )}

      {/* Campaigns Table */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-forest-f60">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-[14px] text-forest-f30">
          No campaigns in this portfolio. Select campaigns from the Campaigns page and use &ldquo;Add to Portfolio&rdquo; to add them.
        </div>
      ) : (
        <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Campaign Name</th>
                <th className="table-header">Campaign ID</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
                <th className="table-header w-12" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="table-row group">
                  <td className="table-cell text-[13px] text-forest-f60">
                    {c.campaignName}
                  </td>
                  <td className="table-cell text-[12px] text-forest-f30 font-mono">
                    {c.campaignId}
                  </td>
                  <td className="table-cell text-[12px] text-forest-f30">
                    {c.campaignType || "—"}
                  </td>
                  <td className="table-cell">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                        (c.campaignStatus || "").toLowerCase() === "enabled"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {c.campaignStatus || "—"}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleRemoveCampaign(c.id, c.campaignName)}
                      className="p-1 rounded hover:bg-red-50 text-forest-f30 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Remove ${c.campaignName}`}
                      title="Remove from portfolio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Remove confirmation */}
      <ConfirmationModal
        isOpen={removingId != null}
        onClose={() => { if (!removeLoading) { setRemovingId(null); setRemoveError(null); } }}
        onConfirm={confirmRemove}
        title="Remove Campaign"
        message={
          removeError
            ? removeError
            : `Remove "${removingCampaign?.campaignName ?? ""}" from this portfolio? The campaign itself won't be deleted.`
        }
        confirmButtonLabel="Remove"
        isDangerous
        isLoading={removeLoading}
        loadingLabel="Removing..."
      />
    </div>
  );
};

// ── Metric Card helper ────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string;
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  valueClassName?: string;
}> = ({ label, value, prefix = "", suffix = "", valueClassName }) => (
  <div className="p-3 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[10px]">
    <p className="text-[11px] text-forest-f30 mb-1">{label}</p>
    {value === null || value === undefined ? (
      <div className="h-5 w-16 bg-sandstorm-s20 rounded animate-pulse" />
    ) : (
      <p className={cn("text-[14px] font-medium text-forest-f60 tabular-nums", valueClassName)}>
        {prefix}{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}{suffix}
      </p>
    )}
  </div>
);
