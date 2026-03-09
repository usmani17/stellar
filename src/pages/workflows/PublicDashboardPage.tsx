import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { BarChart3, Moon, Sun, RotateCcw } from "lucide-react";
import { DashboardGrid } from "./components/dashboard/DashboardGrid";
import { getSharedDashboardConfig } from "../../services/dashboard";
import { FULL_TEST_DASHBOARD_CONFIG } from "./constants/fullTestDashboard";
import { DashboardThemeProvider, useDashboardTheme } from "./contexts/DashboardThemeContext";
import type { DashboardConfig } from "./types/dashboard";

function PublicDashboardInner({
  config,
  workflowName,
  showQueryDetails,
  isDemoMode,
  shareId,
  layoutKey,
  onResetLayout,
}: {
  config: DashboardConfig;
  workflowName?: string;
  showQueryDetails?: boolean;
  isDemoMode?: boolean;
  shareId?: string;
  layoutKey?: number;
  onResetLayout?: () => void;
}) {
  const title = workflowName || "Dashboard";
  const { isDark, toggleTheme } = useDashboardTheme();

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      data-theme={isDark ? "dark" : "light"}
    >
      <div
        className={`min-h-screen transition-colors duration-300 ${isDark
            ? "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900"
            : "bg-gradient-to-br from-sandstorm-s0 via-sandstorm-s5 to-sandstorm-s10"
          }`}
      >
        <header
          className={`backdrop-blur-sm border-b sticky top-0 z-10 transition-colors duration-300 ${isDark
              ? "bg-neutral-800/90 border-neutral-700"
              : "bg-white/80 border-sandstorm-s40/60"
            }`}
        >
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl ${isDark ? "bg-[#2DD4BF]/20 text-[#2DD4BF]" : "bg-forest-f40/10 text-forest-f40"
                  }`}
              >
                <BarChart3 className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <h1
                  className={`text-lg font-semibold tracking-tight ${isDark ? "text-neutral-100" : "text-forest-f60"
                    }`}
                >
                  {title}
                </h1>
                <p className={isDark ? "text-xs text-neutral-400" : "text-xs text-forest-f30"}>
                  Shared dashboard
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark
                  ? "text-neutral-300 hover:bg-neutral-700 hover:text-white"
                  : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60"
                }`}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6 py-8">
          {isDemoMode && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg text-sm flex flex-wrap items-center justify-between gap-3 ${isDark
                  ? "bg-[#2DD4BF]/15 border border-[#2DD4BF]/40 text-[#a7f3eb]"
                  : "bg-forest-f40/10 border border-forest-f40/20 text-forest-f60"
                }`}
            >
              <span>
                <strong>Demo mode</strong> — Charts on top, tables below. Drag the <strong>⋮⋮</strong> handle to reorder. Click <strong>⤢</strong> to expand. Use the <strong>chart type</strong> dropdown to switch (table, bar, line, pie, area). Click <strong>GAQL</strong> / <strong>SQL</strong> to view the query.
              </span>
              {onResetLayout && (
                <button
                  type="button"
                  onClick={onResetLayout}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark
                      ? "text-[#2DD4BF] hover:bg-[#2DD4BF]/20"
                      : "text-forest-f60 hover:bg-forest-f40/15"
                    }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                  Reset layout
                </button>
              )}
            </div>
          )}
          <DashboardGrid
            key={layoutKey}
            config={config}
            accountId={undefined}
            dashboardId={undefined}
            shareId={shareId}
            showQueryDetails={showQueryDetails}
            editable={isDemoMode}
          />
        </main>

        <footer
          className={`py-6 text-center text-xs ${isDark ? "text-neutral-500" : "text-forest-f30"}`}
        >
          Powered by Stellar
        </footer>
      </div>
    </div>
  );
}

export const PublicDashboardPage: React.FC = () => {
  const { shareId } = useParams<{ shareId?: string }>();
  const isDemoRoute = useLocation().pathname === "/dashboards/demo";
  const [config, setConfig] = useState<DashboardConfig | null>(
    isDemoRoute ? FULL_TEST_DASHBOARD_CONFIG : null
  );
  const [workflowName, setWorkflowName] = useState<string | undefined>(
    isDemoRoute ? "Dashboard demo" : undefined
  );
  const [isDemoMode, setIsDemoMode] = useState(isDemoRoute);
  const [layoutKey, setLayoutKey] = useState(0);

  const handleResetLayout = useCallback(() => {
    setLayoutKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (isDemoRoute || !shareId) {
      setConfig(FULL_TEST_DASHBOARD_CONFIG);
      setWorkflowName("Dashboard demo");
      setIsDemoMode(true);
      return;
    }
    let cancelled = false;
    getSharedDashboardConfig(shareId).then((result) => {
      if (cancelled) return;
      console.log("Shared dashboard result:", result); // Debug log
      if (result) {
        console.log("Shared dashboard config:", result.config); // Debug log
        setConfig(result.config);
        setWorkflowName(result.workflowName);
        setIsDemoMode(false);
      } else {
        setConfig(FULL_TEST_DASHBOARD_CONFIG);
        setWorkflowName("Dashboard demo");
        setIsDemoMode(true);
      }
    });
    return () => { cancelled = true; };
  }, [shareId, isDemoRoute]);

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sandstorm-s0 via-sandstorm-s5 to-sandstorm-s10 flex items-center justify-center p-6">
        <div className="text-sm text-forest-f30">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardThemeProvider>
      <PublicDashboardInner
        config={config}
        workflowName={workflowName}
        showQueryDetails
        isDemoMode={isDemoMode}
        shareId={shareId ?? undefined}
        layoutKey={layoutKey}
        onResetLayout={isDemoMode ? handleResetLayout : undefined}
      />
    </DashboardThemeProvider>
  );
};
