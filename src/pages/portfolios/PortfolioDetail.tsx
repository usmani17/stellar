import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Settings,
  LayoutDashboard,
  Clock,
  AlertTriangle,
  Pencil,
  TrendingUp,
  TrendingDown,
  Target,
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
import { usePortfolio, usePortfolioTracking } from "../../hooks/queries/usePortfolios";
import {
  useRunPortfolio,
  useUpdatePortfolio,
} from "../../hooks/mutations/usePortfolioMutations";
import { Sidebar } from "../../components/layout/Sidebar";
import { AccountsHeader } from "../../components/layout/AccountsHeader";
import { Banner, Button, ConfirmationModal, KPICard, Loader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { CreatePortfolioWizard } from "./components/CreatePortfolioWizard";

type Tab = "dashboard" | "campaigns" | "tracking" | "settings";

function fmt(val: number | null | undefined, prefix = ""): string {
  if (val == null) return "—";
  return `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtInt(val: number | null | undefined): string {
  if (val == null) return "—";
  return val.toLocaleString();
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

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [trackingPage, setTrackingPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const isEditMode = searchParams.get("edit") === "true";

  const { data: portfolio, isLoading, error } = usePortfolio(
    accountId,
    portfolioId,
  );

  const { data: trackingData, isLoading: trackingLoading } =
    usePortfolioTracking(accountId, portfolioId, trackingPage);

  const runMutation = useRunPortfolio(accountId);
  const updateMutation = useUpdatePortfolio(accountId, portfolioId);

  useEffect(() => {
    if (portfolio) {
      setPageTitle(portfolio.name);
    }
    return () => resetPageTitle();
  }, [portfolio]);

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
    { id: "tracking", label: "Tracking History", icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AccountsHeader />

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
                <button
                  onClick={() => setShowRunConfirm(true)}
                  disabled={runMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-forest-f40 bg-forest-f40 text-white hover:bg-forest-f50 hover:border-forest-f50 transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 shrink-0" />
                  {runMutation.isPending ? "Running..." : "Run Now"}
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
            {activeTab === "tracking" && (
              <TrackingTab
                data={trackingData}
                isLoading={trackingLoading}
                page={trackingPage}
                onPageChange={setTrackingPage}
              />
            )}
          </div>
        </div>
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

  const targetField = getTargetKpiField(portfolio.targetType);
  const latestRow = successRows[0];
  const currentKpiValue = targetField && latestRow ? latestRow[targetField] ?? null : null;
  const targetValue = portfolio.targetValue ?? null;
  const status = getProgressStatus(currentKpiValue, targetValue, portfolio.targetType);

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

      {/* Hero: Target Progress + Side stats */}
      {!trackingLoading && rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-6 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[12px] text-forest-f30 uppercase tracking-wider font-medium mb-1">Target Progress</p>
                <h3 className="text-[24px] font-agrandir font-bold text-forest-f60">{portfolio.targetType ?? "N/A"}</h3>
              </div>
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium", status.bgColor, status.color)}>
                {status.icon === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : status.icon === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
                {status.label}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-[11px] text-forest-f30 mb-1">Current</p>
                <p className="text-[20px] font-medium text-forest-f60">
                  {currentKpiValue != null ? fmt(currentKpiValue, portfolio.targetType === "ROAS" ? "" : "$") : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-forest-f30 mb-1">Target</p>
                <p className="text-[20px] font-medium text-forest-f60">
                  {targetValue != null ? fmt(targetValue, portfolio.targetType === "ROAS" ? "" : "$") : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-forest-f30 mb-1">Variance</p>
                {currentKpiValue != null && targetValue != null && targetValue !== 0 ? (
                  <p className={cn("text-[20px] font-medium", status.color)}>
                    {(((currentKpiValue - targetValue) / targetValue) * 100).toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-[20px] font-medium text-forest-f30">—</p>
                )}
              </div>
            </div>

            {chartData.length >= 2 && targetField && (
              <div className="h-[120px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                    <defs>
                      <linearGradient id="kpiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#136D6D" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#136D6D" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#506766" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#506766" }} axisLine={false} tickLine={false} width={40} />
                    <RechartsTooltip content={<CustomTooltipContent />} />
                    <Area type="monotone" dataKey={targetField} stroke="#136D6D" strokeWidth={2} fill="url(#kpiGradient)" name={portfolio.targetType ?? "KPI"} />
                    {targetValue != null && (
                      <ReferenceLine y={targetValue} stroke="#CE1313" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Target: ${fmt(targetValue)}`, position: "right", fontSize: 10, fill: "#CE1313" }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
              <p className="text-[12px] text-forest-f30 uppercase tracking-wider font-medium mb-3">Budget Usage</p>
              <div className="flex items-end justify-between mb-2">
                <span className="text-[22px] font-medium text-forest-f60">{fmt(budgetUsed, "$")}</span>
                <span className="text-[13px] text-forest-f30">of {fmt(budgetTotal, "$")}</span>
              </div>
              <div className="w-full h-2 bg-sandstorm-s20 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-forest-f40")} style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="text-[11px] text-forest-f30 mt-1.5">{budgetPct.toFixed(1)}% used</p>
            </div>

            <div className="p-5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[16px]">
              <p className="text-[12px] text-forest-f30 uppercase tracking-wider font-medium mb-3">Pacing</p>
              <p className={cn("text-[28px] font-medium", pacingPct != null && pacingPct > 100 ? "text-red-600" : "text-forest-f60")}>
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

// ── Tracking Tab ──────────────────────────────────────────────────────────

// ── Tracking helpers ────────────────────────────────────────────────────────

interface TrackingTabProps {
  data: any;
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
}

function getTargetKpiField(targetType: string | null | undefined): string | null {
  const map: Record<string, string> = {
    CPC: "cpc",
    CPM: "cpm",
    CPA: "cpa",
    ROAS: "roas",
  };
  return targetType ? map[targetType] ?? null : null;
}

function getProgressStatus(
  current: number | null,
  target: number | null,
  targetType: string | null,
): { label: string; color: string; bgColor: string; icon: "up" | "down" | "target" } {
  if (current == null || target == null || !target)
    return { label: "No Data", color: "text-forest-f30", bgColor: "bg-sandstorm-s10", icon: "target" };

  const ratio = current / target;
  const isLowerBetter = targetType === "CPC" || targetType === "CPA" || targetType === "CPM";

  if (isLowerBetter) {
    if (ratio <= 1) return { label: "On Track", color: "text-green-700", bgColor: "bg-green-50", icon: "down" };
    if (ratio <= 1.15) return { label: "Approaching", color: "text-yellow-700", bgColor: "bg-yellow-50", icon: "up" };
    return { label: "Off Track", color: "text-red-700", bgColor: "bg-red-50", icon: "up" };
  }
  if (ratio >= 1) return { label: "On Track", color: "text-green-700", bgColor: "bg-green-50", icon: "up" };
  if (ratio >= 0.85) return { label: "Approaching", color: "text-yellow-700", bgColor: "bg-yellow-50", icon: "down" };
  return { label: "Off Track", color: "text-red-700", bgColor: "bg-red-50", icon: "down" };
}

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

const TrackingTab: React.FC<TrackingTabProps> = ({ data, isLoading, page, onPageChange }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="md" message="Loading snapshots..." />
      </div>
    );
  }

  const rows = data?.data?.results ?? data?.results ?? [];
  const totalPages = data?.data?.totalPages ?? data?.totalPages ?? 1;

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-[14px] text-forest-f30">
        No snapshots yet. Run the portfolio to generate the first snapshot.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Date</th>
              <th className="table-header">Status</th>
              <th className="table-header">Spend</th>
              <th className="table-header">Budget</th>
              <th className="table-header">Pacing</th>
              <th className="table-header">Clicks</th>
              <th className="table-header">Impressions</th>
              <th className="table-header">CPC</th>
              <th className="table-header">Conversions</th>
              <th className="table-header">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="table-row">
                <td className="table-cell text-[12px] text-forest-f60">
                  {r.trackedAt ? new Date(r.trackedAt).toLocaleString() : "—"}
                </td>
                <td className="table-cell">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                      r.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="table-cell text-[12px] text-forest-f60">{fmt(r.totalSpend, "$")}</td>
                <td className="table-cell text-[12px] text-forest-f60">{fmt(r.totalBudget, "$")}</td>
                <td className="table-cell text-[12px] text-forest-f60">
                  {r.pacingPercentage != null ? `${r.pacingPercentage.toFixed(1)}%` : "—"}
                </td>
                <td className="table-cell text-[12px] text-forest-f60">{fmtInt(r.clicks)}</td>
                <td className="table-cell text-[12px] text-forest-f60">{fmtInt(r.impressions)}</td>
                <td className="table-cell text-[12px] text-forest-f60">{fmt(r.cpc, "$")}</td>
                <td className="table-cell text-[12px] text-forest-f60">{fmt(r.conversions)}</td>
                <td className="table-cell text-[12px] text-forest-f60">{fmt(r.roas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-[12px] px-3 py-1.5"
          >
            Previous
          </Button>
          <span className="text-[13px] text-forest-f30">
            {page} / {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="text-[12px] px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
