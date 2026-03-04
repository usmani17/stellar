import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Moon, Sun } from "lucide-react";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { DashboardGrid } from "./components/dashboard/DashboardGrid";
import { getDashboardForWorkflow } from "./utils/dashboardStorage";
import { DEFAULT_DASHBOARD_CONFIG } from "./constants/defaultDashboard";
import { setShareConfig } from "./utils/dashboardStorage";
import { workflowsService } from "../../services/workflows";
import { queryKeys } from "../../hooks/queries/queryKeys";
import { DashboardThemeProvider, useDashboardTheme } from "./contexts/DashboardThemeContext";

export const WorkflowDashboardPage: React.FC = () => {
  const { accountId, workflowId } = useParams<{ accountId: string; workflowId: string }>();
  const { sidebarWidth } = useSidebar();
  const [config, setConfig] = useState(DEFAULT_DASHBOARD_CONFIG);
  const [shareCopied, setShareCopied] = useState(false);

  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const workflowIdNum = workflowId ? parseInt(workflowId, 10) : undefined;

  const { data: workflow } = useQuery({
    queryKey: [...queryKeys.workflows.detail(workflowIdNum ?? 0), accountIdNum],
    queryFn: () => workflowsService.getWorkflow(accountIdNum!, workflowIdNum!),
    enabled: !!accountIdNum && !!workflowIdNum,
  });

  useEffect(() => {
    setPageTitle(workflow?.name ? `${workflow.name} — Dashboard` : "Dashboard");
    return () => resetPageTitle();
  }, [workflow?.name]);

  useEffect(() => {
    if (workflowIdNum) {
      const stored = getDashboardForWorkflow(workflowIdNum);
      if (stored) {
        setConfig(stored);
      }
    }
  }, [workflowIdNum]);

  const handleShare = async () => {
    if (!accountIdNum || !workflowIdNum) return;
    const shareId = crypto.randomUUID();
    setShareConfig(shareId, {
      workflowId: workflowIdNum,
      accountId: accountIdNum,
      config,
      workflowName: workflow?.name,
    });
    const url = `${window.location.origin}/dashboards/share/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback: open in new tab or show URL
      window.open(url, "_blank");
    }
  };

  const workflowsPath = accountId ? `/brands/${accountId}/workflows` : "/brands";

  return (
    <DashboardThemeProvider>
      <WorkflowDashboardContent
        workflowsPath={workflowsPath}
        sidebarWidth={sidebarWidth}
        workflowName={workflow?.name}
        shareCopied={shareCopied}
        handleShare={handleShare}
        config={config}
        accountIdNum={accountIdNum}
        workflowIdNum={workflowIdNum}
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
  workflowIdNum,
}: {
  workflowsPath: string;
  sidebarWidth: number;
  workflowName?: string;
  shareCopied: boolean;
  handleShare: () => void;
  config: import("./types/dashboard").DashboardConfig;
  accountIdNum: number | undefined;
  workflowIdNum: number | undefined;
}) {
  const { isDark, toggleTheme } = useDashboardTheme();

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="transition-all duration-300 flex-1 min-w-0"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />
        <div
          className={`px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 min-h-screen transition-colors ${
            isDark ? "bg-neutral-900" : "bg-sandstorm-s0"
          }`}
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  to={workflowsPath}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-forest-f40 hover:text-forest-f50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to workflows
                </Link>
                <div className={`h-4 w-px ${isDark ? "bg-neutral-600" : "bg-sandstorm-s40"}`} aria-hidden />
                <h1 className={`text-[14px] font-semibold ${isDark ? "text-neutral-100" : "text-forest-f60"}`}>
                  {workflowName ?? "Dashboard"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`p-2 rounded transition-colors ${
                    isDark
                      ? "text-neutral-400 hover:bg-neutral-700 hover:text-white"
                      : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60"
                  }`}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleShare}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-colors ${
                    isDark
                      ? "border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                      : "border-sandstorm-s40 bg-white text-forest-f60 hover:bg-sandstorm-s5"
                  }`}
                  aria-label="Share dashboard"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shareCopied ? "Copied" : "Share"}
                </button>
              </div>
            </div>

            <DashboardGrid
              config={config}
              accountId={accountIdNum}
              workflowId={workflowIdNum}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
