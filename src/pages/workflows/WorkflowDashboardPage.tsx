import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Share2, Moon, Sun, RotateCw } from "lucide-react";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { DashboardGrid } from "./components/dashboard/DashboardGrid";
import { getDashboardDetail, updateDashboardConfig } from "../../services/dashboard";
import { DashboardThemeProvider, useDashboardTheme } from "./contexts/DashboardThemeContext";
import { Assistant } from "../../components/layout/Assistant";

export const WorkflowDashboardPage: React.FC = () => {
  const { accountId, dashboardId } = useParams<{ accountId: string; dashboardId: string }>();
  const { sidebarWidth } = useSidebar();
  const [shareCopied, setShareCopied] = React.useState(false);

  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const dashboardIdNum = dashboardId ? parseInt(dashboardId, 10) : undefined;

  const { data: dashboard, isLoading: isLoadingDashboard, refetch: refetchDashboard } = useQuery({
    queryKey: ["dashboard", accountIdNum, dashboardIdNum],
    queryFn: () => getDashboardDetail(accountIdNum!, dashboardIdNum!),
    enabled: !!accountIdNum && !!dashboardIdNum,
  });

  useEffect(() => {
    setPageTitle(dashboard?.name ? `${dashboard.name} — Dashboard` : "Dashboard");
    return () => resetPageTitle();
  }, [dashboard?.name]);

  const handleShare = async () => {
    if (!accountIdNum || !dashboardIdNum || !dashboard) return;
    const shareId = crypto.randomUUID();
    // TODO: implement real sharing via backend
    const url = `${window.location.origin}/dashboards/share/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.open(url, "_blank");
    }
  };

  const workflowsPath = accountId ? `/brands/${accountId}/workflows?tab=dashboards` : "/brands";

  if (isLoadingDashboard) {
    return (
      <div className="min-h-screen bg-sandstorm-s0 flex items-center justify-center">
        <p className="text-forest-f30 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <DashboardThemeProvider>
      <WorkflowDashboardContent
        workflowsPath={workflowsPath}
        sidebarWidth={sidebarWidth}
        workflowName={dashboard?.name}
        shareCopied={shareCopied}
        handleShare={handleShare}
        config={dashboard?.config}
        accountIdNum={accountIdNum}
        dashboardId={dashboard?.id}
        onRefresh={() => refetchDashboard()}
        refetchDashboard={refetchDashboard}
      />
    </DashboardThemeProvider>
  );
};

function WorkflowDashboardContent({
  workflowsPath,
  sidebarWidth,
  workflowName,
  shareCopied,
  handleShare,
  config,
  accountIdNum,
  dashboardId,
  onRefresh,
  refetchDashboard,
}: {
  workflowsPath: string;
  sidebarWidth: number;
  workflowName?: string;
  shareCopied: boolean;
  handleShare: () => void;
  config: import("./types/dashboard").DashboardConfig | undefined;
  accountIdNum: number | undefined;
  dashboardId: number | undefined;
  onRefresh: () => void;
  refetchDashboard: () => void;
}) {
  const { isDark, toggleTheme } = useDashboardTheme();
  const queryClient = useQueryClient();

  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: import("./types/dashboard").DashboardConfig) =>
      updateDashboardConfig(accountIdNum!, dashboardId!, newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", accountIdNum, dashboardId] });
      refetchDashboard();
    },
    onError: (err) => {
      console.error("Failed to update dashboard config:", err);
    },
  });

  const handleConfigChange = (newConfig: import("./types/dashboard").DashboardConfig) => {
    if (!accountIdNum || !dashboardId) return;
    updateConfigMutation.mutate(newConfig);
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="flex-1 min-w-0 w-full h-screen flex flex-col"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />
        <Assistant>
        <div
          className={`min-h-screen transition-colors duration-300 ${isDark
              ? "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900"
              : "bg-gradient-to-br from-sandstorm-s0 via-sandstorm-s5 to-sandstorm-s10"
            }`}
        >
          <div className="max-w-[1600px] mx-auto px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                <Link
                  to={workflowsPath}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-forest-f40 hover:text-forest-f50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to dashboards
                </Link>
                <div className={`h-4 w-px ${isDark ? "bg-neutral-600" : "bg-sandstorm-s40"}`} aria-hidden />
                <h1 className={`text-[14px] font-semibold ${isDark ? "text-neutral-100" : "text-forest-f60"}`}>
                  {workflowName ?? "Dashboard"}
                </h1>
                </div>
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className={`p-2 rounded transition-colors ${isDark
                      ? "text-neutral-400 hover:bg-neutral-700 hover:text-white"
                      : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60"
                    }`}
                  aria-label="Refresh dashboard"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`p-2 rounded transition-colors ${isDark
                      ? "text-neutral-400 hover:bg-neutral-700 hover:text-white"
                      : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60"
                    }`}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleShare}
                  disabled={!dashboardId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-colors ${isDark
                      ? "border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                      : "border-sandstorm-s40 bg-white text-forest-f60 hover:bg-sandstorm-s5"
                    } disabled:opacity-50`}
                  aria-label="Share dashboard"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shareCopied ? "Copied" : "Share"}
                </button>
                </div>
              </div>

              {config ? (
                <DashboardGrid
                  config={config}
                  accountId={accountIdNum}
                  dashboardId={dashboardId}
                  showQueryDetails
                  editable
                  onConfigChange={handleConfigChange}
                />
              ) : (
                <div className={`p-12 text-center rounded-xl border border-dashed ${isDark ? "border-neutral-700 text-neutral-400" : "border-sandstorm-s40 text-forest-f30"}`}>
                  <p>No dashboard configuration found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </Assistant>
      </div>
    </div>
  );
}
