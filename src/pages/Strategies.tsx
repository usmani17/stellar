import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useSidebar } from "../contexts/SidebarContext";
import { useStrategiesPaginated } from "../hooks/queries/useStrategies";
import {
  useDuplicateStrategy,
  useRunStrategy,
} from "../hooks/mutations/useStrategyMutations";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Banner, Button, Tooltip } from "../components/ui";
import { cn } from "../lib/cn";
import {
  strategiesService,
  type Strategy,
  type StrategyAutomationPayload,
  type AutomationPreviewRow,
} from "../services/strategies";
import { formatCurrency } from "../utils/formatters";

const PAGE_SIZE = 10;

const ENTITY_LABEL: Record<string, string> = {
  campaign: "Campaign",
  ad_group: "Ad group",
  ad: "Campaign",
  keyword: "Keyword",
};

const ACTION_LABEL: Record<string, string> = {
  increase_budget_pct: "Increase",
  decrease_budget_pct: "Decrease",
  set_budget: "Set to",
  increase_bid_pct: "Increase bid",
  decrease_bid_pct: "Decrease bid",
};

const ACTION_SIGN: Record<string, string> = {
  increase_budget_pct: "+",
  decrease_budget_pct: "−",
  set_budget: "=",
  increase_bid_pct: "+",
  decrease_bid_pct: "−",
};

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatAutomationSummary(a: StrategyAutomationPayload): string {
  const entity = ENTITY_LABEL[a.entity?.toLowerCase() ?? ""] ?? a.entity ?? "Automation";
  const sign = ACTION_SIGN[a.action ?? ""] ?? "";
  const val = a.change_value != null ? String(a.change_value) : "";
  const unit = a.change_unit === "absolute" ? "$" : "%";
  if (val) return `${entity} · ${sign}${val}${unit}`;
  return `${entity} · ${a.action ?? "—"}`;
}

function formatAutomationAction(a: StrategyAutomationPayload): string {
  const label = ACTION_LABEL[a.action ?? ""] ?? a.action ?? "—";
  const val = a.change_value != null ? String(a.change_value) : "";
  const unit = a.change_unit === "absolute" ? "$" : "%";
  const cap = a.change_cap != null ? String(a.change_cap) : null;
  if (!val) return label;
  const isSetTo = (a.action ?? "") === "set_budget";
  const main = isSetTo
    ? `${label} ${val}${unit}`
    : `${label} by ${val}${unit}`;
  return cap != null ? `${main} (cap ${unit === "$" ? "$" : ""}${cap}${unit === "$" ? "" : "%"})` : main;
}

function parseConditions(conditions: StrategyAutomationPayload["conditions"]): Record<string, unknown>[] {
  let arr: Record<string, unknown>[] = [];
  if (Array.isArray(conditions)) arr = conditions;
  else if (typeof conditions === "string") {
    try {
      const parsed = JSON.parse(conditions) as unknown;
      arr = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return arr;
}

function formatAutomationFilters(conditions: StrategyAutomationPayload["conditions"]): string {
  const arr = parseConditions(conditions);
  if (arr.length === 0) return "—";
  const parts = arr.slice(0, 3).map((c) => {
    const field = (c.field as string) ?? "?";
    const op = (c.operator as string) ?? "=";
    const val = c.value;
    const valStr = val != null ? String(val) : "?";
    return `${field} ${op} ${valStr}`;
  });
  return arr.length > 3 ? `${parts.join(", ")} +${arr.length - 3}` : parts.join(", ");
}

/** Full filters string for tooltip (all conditions, one per line for readability). */
function formatAutomationFiltersFull(conditions: StrategyAutomationPayload["conditions"]): string {
  const arr = parseConditions(conditions);
  if (arr.length === 0) return "No filters";
  return arr
    .map((c) => {
      const field = (c.field as string) ?? "?";
      const op = (c.operator as string) ?? "=";
      const val = c.value;
      const valStr = val != null ? String(val) : "?";
      return `${field} ${op} ${valStr}`;
    })
    .join("\n");
}

function formatStrategySchedule(s: Strategy): string {
  const freq = (s.frequency ?? "").toLowerCase();
  const time = s.run_at != null ? String(s.run_at).slice(0, 5) : "";
  let dayStr = "";
  const runDays = s.run_days;
  if (Array.isArray(runDays) && runDays.length > 0) {
    dayStr = runDays.map((d) => WEEKDAYS_SHORT[d] ?? d).join(", ");
  } else if (typeof runDays === "string" && runDays.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(runDays) as unknown;
      const arr = Array.isArray(parsed) ? (parsed as number[]) : [];
      dayStr = arr.map((d) => WEEKDAYS_SHORT[d] ?? d).join(", ");
    } catch {
      // ignore
    }
  }
  if (freq === "daily" && time) return `Daily ${time}`;
  if (freq === "weekly" && dayStr) return `Weekly ${dayStr}${time ? ` ${time}` : ""}`;
  if (freq === "monthly" && time) return `Monthly ${time}`;
  return freq || time ? [freq, time].filter(Boolean).join(" ") || "—" : "—";
}

function formatAutomationSchedule(a: StrategyAutomationPayload): string {
  if (!a.schedule_enabled) return "Strategy default";
  const freq = (a.schedule_frequency ?? "").toLowerCase();
  const time = a.schedule_run_at != null ? String(a.schedule_run_at).slice(0, 5) : "";
  const days = a.schedule_run_days;
  let dayStr = "";
  if (Array.isArray(days) && days.length > 0) {
    dayStr = days.map((d) => WEEKDAYS_SHORT[d] ?? d).join(", ");
  } else if (typeof days === "string" && days.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(days) as unknown;
      const arr = Array.isArray(parsed) ? (parsed as number[]) : [];
      dayStr = arr.map((d) => WEEKDAYS_SHORT[d] ?? d).join(", ");
    } catch {
      // ignore
    }
  }
  if (freq === "daily" && time) return `Daily ${time}`;
  if (freq === "weekly" && dayStr) return `Weekly ${dayStr}${time ? ` ${time}` : ""}`;
  if (freq === "monthly" && time) return `Monthly ${time}`;
  return freq || time ? [freq, time].filter(Boolean).join(" ") || "Custom" : "Custom";
}

export const Strategies: React.FC = () => {
  const [searchQuery, setSearchQuery, debouncedSearchQuery] =
    useDebouncedSearch("", 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedStrategyIds, setExpandedStrategyIds] = useState<Set<number>>(
    () => new Set(),
  );
  const toggleExpanded = useCallback((id: number) => {
    setExpandedStrategyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const {
    strategies,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useStrategiesPaginated(currentPage, PAGE_SIZE, debouncedSearchQuery);
  const duplicateMutation = useDuplicateStrategy();
  const runMutation = useRunStrategy();
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreatedSuccess, setShowCreatedSuccess] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [runSuccessId, setRunSuccessId] = useState<number | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  /** "strategyId-automationId" when that automation's run is starting. */
  const [startingRunKey, setStartingRunKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStrategyId, setPreviewStrategyId] = useState<number | null>(null);
  const [previewAutomationId, setPreviewAutomationId] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<AutomationPreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const handleDuplicate = async (e: React.MouseEvent, strategy: Strategy) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicateError(null);
    setDuplicatingId(strategy.id);
    try {
      const created = await duplicateMutation.mutateAsync(strategy.id);
      navigate(`/strategies/${created.id}`);
    } catch (err: unknown) {
      const msg =
        (
          err as {
            response?: { data?: { detail?: string; name?: string[] } };
            message?: string;
          }
        )?.response?.data?.detail ??
        (err as { response?: { data?: { name?: string[] } } })?.response?.data
          ?.name?.[0] ??
        (err as Error)?.message ??
        "Failed to duplicate strategy.";
      setDuplicateError(msg);
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleRunAutomation = (
    e: React.MouseEvent,
    strategy: Strategy,
    automation: { id?: number },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (automation.id == null) return;
    if (strategy.is_running) return;
    const key = `${strategy.id}-${automation.id}`;
    if (startingRunKey === key) return;
    setRunError(null);
    setRunSuccessId(null);
    setStartingRunKey(key);
    runMutation.mutate(
      { strategyId: strategy.id, automationIds: [automation.id] },
      {
        onSuccess: () => {
          setRunSuccessId(strategy.id);
          setStartingRunKey(null);
          refetch();
          setTimeout(() => setRunSuccessId(null), 3000);
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
          setStartingRunKey(null);
          const msg =
            err?.response?.data?.detail ??
            err?.message ??
            "Failed to start strategy run.";
          setRunError(msg);
        },
      },
    );
  };

  useEffect(() => {
    setPageTitle("Strategies");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Poll only while at least one strategy is running (every 10s) so we update when run completes
  const anyRunning = strategies.some((s) => s.is_running);
  useEffect(() => {
    if (!anyRunning) return;
    const interval = setInterval(() => refetch(), 10000);
    return () => clearInterval(interval);
  }, [anyRunning, refetch]);

  // Show success banner and refetch list when redirected here after creating a strategy
  useEffect(() => {
    const state = location.state as { strategyCreated?: boolean } | null;
    if (state?.strategyCreated) {
      setShowCreatedSuccess(true);
      refetch();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, refetch]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AccountsHeader />

        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
          <div className="space-y-6">
            {showCreatedSuccess && (
              <Banner
                type="success"
                message="Strategy created successfully."
                dismissable
                onDismiss={() => setShowCreatedSuccess(false)}
              />
            )}
            {duplicateError && (
              <Banner
                type="error"
                message={duplicateError}
                dismissable
                onDismiss={() => setDuplicateError(null)}
              />
            )}
            {runError && (
              <Banner
                type="error"
                message={runError}
                dismissable
                onDismiss={() => setRunError(null)}
              />
            )}
            {runSuccessId !== null && (
              <Banner
                type="success"
                message="Strategy run started. It’s running in the background."
                dismissable
                onDismiss={() => setRunSuccessId(null)}
              />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
                Strategies
              </h1>
              <div className="flex items-center gap-2">
                <div className="search-input-container h-[40px] w-full md:w-[272px] flex items-center gap-2 px-[10px]">
                  <svg
                    className="w-3 h-3 text-[#556179]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search strategies..."
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179]"
                  />
                </div>
                <button
                  className="create-entity-button"
                  type="button"
                  onClick={() => navigate("/strategies/new")}
                >
                  Create strategy
                </button>
              </div>
            </div>

            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-x-auto overflow-y-visible relative">
              {isFetching && !isLoading && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-[12px]" />
              )}
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Name</th>
                      <th className="table-header">Goal</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Platform</th>
                      <th className="table-header">Schedule</th>
                      <th className="table-header">Last run</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isError ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="table-cell text-center py-12"
                        >
                          <p className="text-[14px] text-red-600 mb-2">
                            Failed to load strategies.
                          </p>
                          <p className="text-[13px] text-[#556179]">
                            {error?.message || (error as Error)?.toString?.()}
                          </p>
                        </td>
                      </tr>
                    ) : isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="table-row">
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-32" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-28" />
                          </td>
                          <td className="table-cell">
                            <div className="h-9 bg-gray-200 rounded animate-pulse w-24" />
                          </td>
                        </tr>
                      ))
                    ) : strategies.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="table-cell text-center py-12"
                        >
                          <p className="text-[14px] text-[#556179] mb-4">
                            {debouncedSearchQuery
                              ? "No strategies found"
                              : "No strategies yet"}
                          </p>
                          {!debouncedSearchQuery && (
                            <Button
                              className="rounded-lg bg-forest-f60 hover:bg-forest-f40 text-white"
                              onClick={() => navigate("/strategies/new")}
                            >
                              Create your first strategy
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      strategies.map((strategy: Strategy) => {
                        const hasAutomations =
                          (strategy.automations?.length ?? 0) > 0;
                        const isExpanded = expandedStrategyIds.has(strategy.id);
                        return (
                          <React.Fragment key={strategy.id}>
                            <tr
                              className="table-row group cursor-pointer hover:bg-[#f3f4f6]"
                              onClick={() => toggleExpanded(strategy.id)}
                            >
                              <td className="table-cell">
                                <div className="flex items-center gap-1.5">
                                  {hasAutomations ? (
                                    <button
                                      type="button"
                                      className="flex items-center justify-center p-0.5 rounded hover:bg-sandstorm-s40 border-0 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpanded(strategy.id);
                                      }}
                                      aria-label={
                                        isExpanded
                                          ? "Collapse automations"
                                          : "Expand automations"
                                      }
                                      aria-expanded={isExpanded}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-forest-f30" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-forest-f30" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="w-4 h-4 shrink-0 block" />
                                  )}
                                  <span className="text-[14px] font-medium text-[#313850]">
                                    {strategy.name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="table-cell text-[14px] text-[#556179]">
                                {strategy.goal || "—"}
                              </td>
                              <td className="table-cell">
                                <span className="text-[14px] text-[#556179]">
                                  {strategy.is_running
                                    ? "Running"
                                    : (strategy.status.toLowerCase() ===
                                      "enabled"
                                      ? "Enabled"
                                      : "Paused")}
                                </span>
                              </td>
                              <td className="table-cell text-[14px] text-[#556179]">
                                {strategy.platform || "—"}
                              </td>
                              <td className="table-cell text-[14px] text-[#556179]">
                                {formatStrategySchedule(strategy)}
                              </td>
                              <td className="table-cell text-[14px] text-[#556179]">
                                {formatDate(strategy.last_run)}
                              </td>
                              <td
                                className="table-cell"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link
                                    to={`/strategies/${strategy.id}/run-history`}
                                    className="text-[13px] text-[#136D6D] hover:underline"
                                  >
                                    View
                                  </Link>
                                  <span className="text-[#e8e8e3]">|</span>
                                  <Link
                                    to={`/strategies/${strategy.id}`}
                                    className="text-[13px] text-[#136D6D] hover:underline"
                                  >
                                    Edit
                                  </Link>
                                  <span className="text-[#e8e8e3]">|</span>
                                  <button
                                    type="button"
                                    className="text-[13px] text-[#136D6D] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={(e) =>
                                      handleDuplicate(e, strategy)
                                    }
                                    disabled={duplicatingId !== null}
                                  >
                                    {duplicatingId === strategy.id
                                      ? "Duplicating…"
                                      : "Duplicate"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded &&
                              (hasAutomations ? (
                                <tr
                                  className="bg-sandstorm-s5 border-l-2 border-[#136D6D]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <td
                                    colSpan={7}
                                    className="table-cell p-0 align-top"
                                  >
                                    <div className="pl-10 py-3 pr-4 min-w-0">
                                      <table className="w-full border border-sandstorm-s40 rounded-lg overflow-hidden bg-white" style={{ tableLayout: "fixed" }}>
                                        <colgroup>
                                          <col style={{ width: "140px" }} />
                                          <col style={{ width: "160px" }} />
                                          <col style={{ width: "180px" }} />
                                          <col style={{ width: "180px" }} />
                                          <col style={{ width: "72px" }} />
                                        </colgroup>
                                        <thead>
                                          <tr className="bg-sandstorm-s5 border-b border-sandstorm-s40">
                                            <th className="table-header text-left py-2 px-3 text-[13px]">
                                              Entity
                                            </th>
                                            <th className="table-header text-left py-2 px-3 text-[13px]">
                                              Action
                                            </th>
                                            <th className="table-header text-left py-2 px-3 text-[13px]">
                                              Filters
                                            </th>
                                            <th className="table-header text-left py-2 px-3 text-[13px]">
                                              Schedule
                                            </th>
                                            <th className="table-header text-left py-2 px-3 text-[13px]">
                                              Actions
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {strategy.automations!.map(
                                            (automation, idx) => (
                                              <tr
                                                key={`${strategy.id}-auto-${automation.id ?? idx}`}
                                                className="table-row border-b border-sandstorm-s40 last:border-b-0"
                                              >
                                                <td className="table-cell py-2 px-3 text-[13px] text-forest-f60 font-medium overflow-hidden">
                                                  <span className="block truncate" title={formatAutomationSummary(automation)}>
                                                    {formatAutomationSummary(
                                                      automation,
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="table-cell py-2 px-3 text-[13px] text-forest-f30 overflow-hidden">
                                                  <span className="block truncate" title={formatAutomationAction(automation)}>
                                                    {formatAutomationAction(
                                                      automation,
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="table-cell py-2 px-3 text-[13px] text-forest-f30 relative z-10">
                                                  <div className="min-w-0 max-w-full">
                                                    <Tooltip
                                                      heading="Filters"
                                                      description={formatAutomationFiltersFull(
                                                        automation.conditions,
                                                      )}
                                                      position="right"
                                                      portal
                                                      triggerClassName="block min-w-0 max-w-full"
                                                      className="[&>div]:max-w-[320px] [&>div]:min-w-[200px]"
                                                    >
                                                      <span className="block truncate cursor-help max-w-full" title={formatAutomationFiltersFull(automation.conditions)}>
                                                        {formatAutomationFilters(
                                                          automation.conditions,
                                                        )}
                                                      </span>
                                                    </Tooltip>
                                                  </div>
                                                </td>
                                                <td className="table-cell py-2 px-3 text-[13px] text-forest-f30 overflow-hidden">
                                                  <span className="block truncate" title={formatAutomationSchedule(automation)}>
                                                    {formatAutomationSchedule(
                                                      automation,
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="table-cell py-2 px-3 overflow-hidden">
                                                  <span className="flex items-center gap-1 flex-wrap">
                                                    {automation.id != null && (
                                                      <>
                                                        <button
                                                          type="button"
                                                          className="text-[13px] text-forest-f40 hover:underline font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                                          onClick={(e) =>
                                                            handleRunAutomation(e, strategy, automation)
                                                          }
                                                          disabled={
                                                            strategy.is_running ||
                                                            startingRunKey === `${strategy.id}-${automation.id}`
                                                          }
                                                        >
                                                          {strategy.is_running ||
                                                          startingRunKey === `${strategy.id}-${automation.id}`
                                                            ? "Running…"
                                                            : "Run"}
                                                        </button>
                                                        <span className="text-forest-f30">|</span>
                                                        <button
                                                          type="button"
                                                          className="text-[13px] text-forest-f40 hover:underline font-medium whitespace-nowrap"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewStrategyId(strategy.id);
                                                            setPreviewAutomationId(automation.id);
                                                            setPreviewOpen(true);
                                                            setPreviewLoading(true);
                                                            setPreviewError(null);
                                                            setPreviewResults([]);
                                                            setPreviewSummary("");
                                                            strategiesService
                                                              .getAutomationPreview(strategy.id, automation.id)
                                                              .then((res) => {
                                                                setPreviewResults(res.results ?? []);
                                                                setPreviewSummary(res.summary ?? "");
                                                              })
                                                              .catch((err: unknown) => {
                                                                const msg =
                                                                  (err as { response?: { data?: { summary?: string } } })?.response?.data?.summary ??
                                                                  (err as Error)?.message ??
                                                                  "Failed to load preview.";
                                                                setPreviewError(msg);
                                                                setPreviewResults([]);
                                                                setPreviewSummary("");
                                                              })
                                                              .finally(() => setPreviewLoading(false));
                                                          }}
                                                        >
                                                          Preview
                                                        </button>
                                                      </>
                                                    )}
                                                  </span>
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr
                                  className={cn(
                                    "table-row bg-sandstorm-s5 border-l-2 border-[#136D6D]",
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <td
                                    colSpan={7}
                                    className="table-cell pl-10 text-[13px] text-forest-f30"
                                  >
                                    No automations
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-end mt-4">
                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    pageNum = Math.max(1, Math.min(pageNum, totalPages));
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-white text-[#136D6D] font-semibold"
                            : "text-black hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                      ...
                    </span>
                  )}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                        currentPage === totalPages
                          ? "bg-white text-[#136D6D] font-semibold"
                          : "text-black hover:bg-gray-50"
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview automation results modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-automation-title"
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="preview-automation-title"
              className="text-[17.1px] font-semibold text-[#072929] mb-4"
            >
              Preview automation results
            </h3>
            {previewLoading ? (
              <div className="mb-6 py-8 text-center text-[12.16px] text-forest-f30">
                Loading preview...
              </div>
            ) : previewError ? (
              <div className="mb-6 py-4 px-4 bg-red-r0 border border-red-r30 rounded-lg text-[12.16px] text-red-r30">
                {previewError}
              </div>
            ) : (
              <>
                <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4 mb-4">
                  <span className="text-[12.16px] text-forest-f30">
                    {previewSummary || "No entities would be updated."}
                  </span>
                </div>
                {previewResults.length > 0 ? (
                  <div className="mb-6">
                    <div className="mb-2 text-[10.64px] text-forest-f30">
                      {previewResults.length > 10
                        ? `Showing 10 of ${previewResults.length} entities`
                        : `${previewResults.length} entit${previewResults.length !== 1 ? "ies" : "y"} would be updated`}
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full table-fixed">
                        <thead className="bg-[#f5f5f0]">
                          <tr>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[28%] max-w-[200px]">
                              Entity
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[18%]">
                              Column
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[27%]">
                              Old value
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[27%]">
                              New value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(previewResults.length > 10
                            ? previewResults.slice(0, 10)
                            : previewResults
                          ).map((row, i) => {
                            const isBudgetOrBid =
                              row.column === "Budget" || row.column === "Bid";
                            const numOld = isBudgetOrBid
                              ? parseFloat(String(row.old_value))
                              : NaN;
                            const numNew = isBudgetOrBid
                              ? parseFloat(String(row.new_value))
                              : NaN;
                            const oldDisplay =
                              isBudgetOrBid && !Number.isNaN(numOld)
                                ? formatCurrency(numOld)
                                : row.old_value;
                            const newDisplay =
                              isBudgetOrBid && !Number.isNaN(numNew)
                                ? formatCurrency(numNew)
                                : row.new_value;
                            return (
                              <tr
                                key={`${row.entity_name}-${i}`}
                                className="border-b border-gray-200 last:border-b-0"
                              >
                                <td className="px-4 py-2 text-[10.64px] text-forest-f60 max-w-[200px] truncate" title={row.entity_name}>
                                  {row.entity_name}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-forest-f30">
                                  {row.column}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-forest-f30">
                                  {oldDisplay}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] font-semibold text-forest-f60">
                                  {newDisplay}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 py-4 text-[12.16px] text-forest-f30">
                    No entities match the automation filters.
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="cancel-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
