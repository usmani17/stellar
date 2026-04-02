import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  LayoutDashboard,
  Bot,
  AlertTriangle,
  Pencil,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAssistant } from "../../contexts/AssistantContext";
import { usePortfolio, usePortfolioTracking } from "../../hooks/queries/usePortfolios";
import {
  useRunPortfolio,
  useUpdatePortfolio,
} from "../../hooks/mutations/usePortfolioMutations";
import { Sidebar } from "../../components/layout/Sidebar";
import { AccountsHeader } from "../../components/layout/AccountsHeader";
import { Assistant } from "../../components/layout/Assistant";
import { Banner, Button, ConfirmationModal, KPICard, Loader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { CreatePortfolioWizard } from "./components/CreatePortfolioWizard";

type Tab = "dashboard" | "campaigns" | "dashboards" | "settings";

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

export const PortfolioDetail: React.FC = () => {
  const navigate = useNavigate();
  const { accountId: accountIdStr, portfolioId: portfolioIdStr } =
    useParams<{ accountId: string; portfolioId: string }>();
  const accountId = Number(accountIdStr);
  const portfolioId = Number(portfolioIdStr);
  const { sidebarWidth } = useSidebar();
  const { setPortfolioScope, clearPortfolioScope } = useAssistant();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [successMsg, setSuccessMsg] = useState("");
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const isEditMode = searchParams.get("edit") === "true";

  const { data: portfolio, isLoading, error } = usePortfolio(
    accountId,
    portfolioId,
  );

  const { data: trackingData, isLoading: trackingLoading } =
    usePortfolioTracking(accountId, portfolioId, 1);

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
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "campaigns", label: "Campaigns", icon: <Settings className="w-4 h-4" /> },
    { id: "dashboards", label: "Agents", icon: <Bot className="w-4 h-4" /> },
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
            {activeTab === "dashboard" && (
              <DashboardTab portfolio={portfolio} trackingData={trackingData} trackingLoading={trackingLoading} />
            )}
            {activeTab === "campaigns" && (
              <CampaignsTab campaigns={portfolio.campaigns ?? []} />
            )}
            {activeTab === "dashboards" && (
              <PortfolioDashboardsTab accountId={accountId} portfolioId={portfolioId} />
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

// ── Dashboard Tab ─────────────────────────────────────────────────────────

const DashboardTab: React.FC<{ portfolio: any; trackingData: any; trackingLoading: boolean }> = ({
  portfolio,
  trackingData,
  trackingLoading,
}) => {
  const rows = trackingData?.data?.results ?? trackingData?.results ?? [];
  const successRows = rows.filter((r: any) => r.status === "success");
  const chartData = [...successRows]
    .reverse()
    .map((r: any) => ({
      date: r.trackedAt ? fmtShortDate(r.trackedAt) : "",
      spend: r.totalSpend ?? 0,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      conversions: r.conversions ?? 0,
      cpc: r.cpc ?? 0,
      cpm: r.cpm ?? 0,
      cpa: r.cpa ?? 0,
      roas: r.roas ?? 0,
      pacing: r.pacingPercentage ?? 0,
      totalSpend: r.totalSpend ?? 0,
    }));

  const latestRow = successRows[0];
  const pacingPct = latestRow?.pacingPercentage ?? null;
  const budgetUsed = latestRow?.totalSpend ?? 0;
  const budgetTotal = portfolio.totalBudget ?? 0;
  const budgetPct = budgetTotal > 0 ? Math.min((budgetUsed / budgetTotal) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Loading state for tracking data */}
      {trackingLoading && (
        <div className="flex justify-center py-8">
          <Loader size="md" message="Loading performance data..." />
        </div>
      )}

      {/* Budget, pacing, snapshot summary */}
      {!trackingLoading && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
            <p className="text-[12px] text-forest-f30 uppercase tracking-wider font-medium mb-3">Budget Usage</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-[22px] font-medium text-forest-f60">{fmt(budgetUsed, "$")}</span>
              <span className="text-[13px] text-forest-f30">of {fmt(budgetTotal, "$")}</span>
            </div>
            <div className="w-full h-2 bg-sandstorm-s20 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", budgetPct > 90 ? "bg-red-r30" : budgetPct > 70 ? "bg-yellow-y10" : "bg-forest-f40")} style={{ width: `${budgetPct}%` }} />
            </div>
            <p className="text-[11px] text-forest-f30 mt-1.5">{budgetPct.toFixed(1)}% used</p>
          </div>

          <div className="p-5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
            <p className="text-[12px] text-forest-f30 uppercase tracking-wider font-medium mb-3">Pacing</p>
            <p className={cn("text-[28px] font-medium", pacingPct != null && pacingPct > 100 ? "text-red-r30" : "text-forest-f60")}>
              {pacingPct != null ? `${pacingPct.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[11px] text-forest-f30 mt-1">
              {pacingPct != null && pacingPct <= 100 ? "Within budget pace" : pacingPct != null ? "Over budget pace" : "No data"}
            </p>
          </div>

          <div className="p-5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
            <p className="text-[12px] text-forest-f30 uppercase tracking-wider font-medium mb-3">Snapshots</p>
            <p className="text-[28px] font-medium text-forest-f60">{rows.length}</p>
            <p className="text-[11px] text-forest-f30 mt-1">{successRows.length} successful</p>
          </div>
        </div>
      )}

      {/* Sparkline grid */}
      {!trackingLoading && chartData.length >= 2 && (
        <div>
          <p className="text-[13px] font-medium text-forest-f60 mb-3">Metric Trends</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {SPARKLINE_METRICS.map((metric) => {
              const values = chartData.map((d: any) => d[metric.key] as number);
              const latest = values[values.length - 1] ?? 0;
              const prev = values.length >= 2 ? values[values.length - 2] : latest;
              const changePct = prev ? ((latest - prev) / prev) * 100 : 0;
              const isUp = changePct >= 0;
              return (
                <div key={metric.key} className="p-3 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px]">
                  <p className="text-[11px] text-forest-f30 mb-1">{metric.label}</p>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[15px] font-medium text-forest-f60">
                      {metric.prefix}{latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    {values.length >= 2 && (
                      <span className={cn("text-[10px] font-medium", isUp ? "text-green-600" : "text-red-600")}>
                        {isUp ? "+" : ""}{changePct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="h-[32px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <Line type="monotone" dataKey={metric.key} stroke={isUp ? "#136D6D" : "#CE1313"} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spend & Pacing chart */}
      {!trackingLoading && chartData.length >= 2 && (
        <div className="p-5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
          <p className="text-[13px] font-medium text-forest-f60 mb-4">Spend & Pacing Over Time</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#136D6D" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#136D6D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#506766" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#506766" }} axisLine={false} tickLine={false} width={50} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#506766" }} axisLine={false} tickLine={false} width={40} domain={[0, "auto"]} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Area yAxisId="left" type="monotone" dataKey="spend" stroke="#136D6D" strokeWidth={2} fill="url(#spendGradient)" name="Spend ($)" />
                <Line yAxisId="right" type="monotone" dataKey="pacing" stroke="#FF991F" strokeWidth={2} dot={{ r: 3, fill: "#FF991F" }} name="Pacing (%)" />
                {budgetTotal > 0 && (
                  <ReferenceLine yAxisId="left" y={budgetTotal} stroke="#CE1313" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Budget: ${fmt(budgetTotal, "$")}`, position: "right", fontSize: 10, fill: "#CE1313" }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
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
      {/* Always-visible header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-forest-f30">
          {loading ? "" : `${dashboards.length} dashboard${dashboards.length !== 1 ? "s" : ""}`}
        </p>
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

      {/* Loading state */}
      {(loading || refreshing) && (
        <div className="flex items-center justify-center py-12">
          <Loader size="md" message={loading ? "Loading dashboards..." : "Refreshing..."} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !refreshing && dashboards.length === 0 && (
        <div className="text-center py-12">
          <Bot className="w-10 h-10 mx-auto mb-3 text-forest-f20" />
          <p className="text-[14px] text-forest-f30 mb-1">No actions yet</p>
          <p className="text-[12px] text-forest-f20 mb-4">
            Use the Assistant to create actions for this portfolio.
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

      {/* Dashboard list */}
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
    </div>
  );
};

// ── Campaigns Tab ─────────────────────────────────────────────────────────

const CampaignsTab: React.FC<{ campaigns: any[] }> = ({ campaigns }) => {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-[14px] text-forest-f30">
        No campaigns in this portfolio.
      </div>
    );
  }

  return (
    <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-header">Campaign Name</th>
            <th className="table-header">Campaign ID</th>
            <th className="table-header">Type</th>
            <th className="table-header">Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c: any) => (
            <tr key={c.id} className="table-row">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Dashboard chart helpers ───────────────────────────────────────────────

function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SPARKLINE_METRICS = [
  { key: "totalSpend", label: "Spend", prefix: "$" },
  { key: "clicks", label: "Clicks", prefix: "" },
  { key: "impressions", label: "Impressions", prefix: "" },
  { key: "conversions", label: "Conversions", prefix: "" },
  { key: "cpc", label: "CPC", prefix: "$" },
  { key: "roas", label: "ROAS", prefix: "" },
];

const CustomTooltipContent: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-forest-f60 text-white px-3 py-2 rounded-lg shadow-lg text-[12px]">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
        </p>
      ))}
    </div>
  );
};

