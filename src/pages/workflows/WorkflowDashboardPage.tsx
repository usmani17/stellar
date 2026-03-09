import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Share2, Moon, Sun, RotateCw, Copy, X } from "lucide-react";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { DashboardGrid } from "./components/dashboard/DashboardGrid";
import { getDashboardDetail, updateDashboardConfig, updateDashboardComponent, createDashboardShare } from "../../services/dashboard";
import { DashboardThemeProvider, useDashboardTheme } from "./contexts/DashboardThemeContext";
import { Assistant } from "../../components/layout/Assistant";
import { BaseModal, Loader } from "../../components/ui";

export const WorkflowDashboardPage: React.FC = () => {
  const { accountId, dashboardId } = useParams<{ accountId: string; dashboardId: string }>();
  const { sidebarWidth } = useSidebar();
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");
  const [shareError, setShareError] = React.useState<string | null>(null);

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
    if (!accountIdNum || !dashboardIdNum) return;
    setShareError(null);
    setShareLink("");
    setShareModalOpen(true);
    try {
      const share = await createDashboardShare(accountIdNum, dashboardIdNum);
      const url = `${window.location.origin}/dashboards/share/${share.share_id}`;
      setShareLink(url);
    } catch (error) {
      console.error("Failed to create share link:", error);
      setShareError("Failed to create share link. Please try again.");
    }
  };

  const onCloseShareModal = () => {
    setShareModalOpen(false);
    setShareLink("");
    setShareError(null);
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
        handleShare={handleShare}
        config={dashboard?.config}
        accountIdNum={accountIdNum}
        dashboardId={dashboard?.id}
        refetchDashboard={refetchDashboard}
        shareModalOpen={shareModalOpen}
        shareLink={shareLink}
        shareError={shareError}
        onCloseShareModal={onCloseShareModal}
      />
    </DashboardThemeProvider>
  );
};

function WorkflowDashboardContent({
  workflowsPath,
  sidebarWidth,
  workflowName,
  handleShare,
  config,
  accountIdNum,
  dashboardId,
  refetchDashboard,
  shareModalOpen,
  shareLink,
  shareError,
  onCloseShareModal,
}: {
  workflowsPath: string;
  sidebarWidth: number;
  workflowName?: string;
  handleShare: () => void;
  config: import("./types/dashboard").DashboardConfig | undefined;
  accountIdNum: number | undefined;
  dashboardId: number | undefined;
  refetchDashboard: () => void;
  shareModalOpen: boolean;
  shareLink: string;
  shareError: string | null;
  onCloseShareModal: () => void;
}) {
  const { isDark, toggleTheme } = useDashboardTheme();
  const [copySuccess, setCopySuccess] = React.useState(false);
  const queryClient = useQueryClient();
  const [hardRefreshTrigger, setHardRefreshTrigger] = React.useState(0);

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

  const updateComponentMutation = useMutation({
    mutationFn: (payload: import("../../services/dashboard").DashboardComponentUpdatePayload) =>
      updateDashboardComponent(accountIdNum!, dashboardId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", accountIdNum, dashboardId] });
      refetchDashboard();
    },
    onError: (err) => {
      console.error("Failed to update dashboard component:", err);
    },
  });

  const handleConfigChange = (newConfig: import("./types/dashboard").DashboardConfig) => {
    if (!accountIdNum || !dashboardId) return;
    updateConfigMutation.mutate(newConfig);
  };

  const handleComponentChange = (payload: import("../../services/dashboard").DashboardComponentUpdatePayload) => {
    if (!accountIdNum || !dashboardId) return;
    updateComponentMutation.mutate(payload);
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
                  onClick={() => {
                    setHardRefreshTrigger((prev) => prev + 1);
                    refetchDashboard();
                  }}
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
                  type="button"
                  onClick={handleShare}
                  disabled={!dashboardId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-colors ${isDark
                      ? "border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                      : "border-sandstorm-s40 bg-white text-forest-f60 hover:bg-sandstorm-s5"
                    } disabled:opacity-50`}
                  aria-label="Share dashboard"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
                </div>
              </div>

              <BaseModal
                isOpen={shareModalOpen}
                onClose={onCloseShareModal}
                size="lg"
                maxWidth="max-w-lg"
              >
                <div className={isDark ? "text-neutral-100" : "text-forest-f60"}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Share dashboard</h2>
                    <button
                      type="button"
                      onClick={onCloseShareModal}
                      className={`p-1.5 rounded transition-colors ${isDark ? "hover:bg-neutral-700 text-neutral-400" : "hover:bg-sandstorm-s20 text-forest-f30"}`}
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {shareError ? (
                    <p className="text-red-r30 text-sm mb-3">{shareError}</p>
                  ) : !shareLink ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader
                        size="md"
                        variant={isDark ? "white" : "default"}
                        showMessage={false}
                      />
                      <p className={`text-sm ${isDark ? "text-neutral-400" : "text-forest-f30"}`}>
                        Creating share link...
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm mb-2 ${isDark ? "text-neutral-400" : "text-forest-f30"}`}>
                        Anyone with this link can view the dashboard.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareLink}
                          className={`flex-1 min-w-0 px-3 py-2.5 rounded border text-sm font-mono truncate ${
                            isDark
                              ? "bg-neutral-800 border-neutral-600 text-neutral-100"
                              : "bg-sandstorm-s5 border-sandstorm-s40 text-forest-f60"
                          }`}
                          aria-label="Share link"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!shareLink) return;
                            try {
                              await navigator.clipboard.writeText(shareLink);
                              setCopySuccess(true);
                              setTimeout(() => setCopySuccess(false), 2000);
                            } catch {
                              setCopySuccess(false);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium border shrink-0 transition-colors ${
                            isDark
                              ? "border-neutral-600 bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
                              : "border-sandstorm-s40 bg-forest-f40 text-white hover:bg-forest-f50"
                          }`}
                        >
                          <Copy className="w-4 h-4" aria-hidden />
                          {copySuccess ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </BaseModal>

              {config ? (
                <DashboardGrid
                  config={config}
                  accountId={accountIdNum}
                  dashboardId={dashboardId}
                  showQueryDetails
                  editable
                  onConfigChange={handleConfigChange}
                  onComponentChange={handleComponentChange}
                  hardRefreshTrigger={hardRefreshTrigger}
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
