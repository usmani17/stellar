import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { formatCurrency, formatPercentage, formatNumber } from "../../utils/formatters";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { accountsService } from "../../services/accounts";
import { Loader } from "../../components/ui/Loader";
import { Checkbox } from "../../components/ui/Checkbox";
import { Assistant } from "../../components/layout/Assistant";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import {
  DynamicFilterPanel,
  type FilterValues,
} from "../../components/filters/DynamicFilterPanel";
import { useEditSummaryModal } from "../../hooks/useEditSummaryModal";
import { normalizeStatusDisplay } from "../../utils/statusHelpers";
import { Dropdown } from "../../components/ui/Dropdown";

export interface MetaAdsetRow {
  id: number;
  adset_id: number | string;
  adset_name: string;
  campaign_id?: number | string;
  campaign_name?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_amount?: string;
  impressions?: number;
  clicks?: number;
  spends?: number;
  sales?: number;
  acos?: number;
  roas?: number;
}

export interface MetaAdsetsSummary {
  total_adsets: number;
  total_spends: number;
  total_sales: number;
  total_impressions: number;
  total_clicks: number;
  avg_acos: number;
  avg_roas: number;
}

export const MetaAdSets: React.FC = () => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDateStr, endDateStr } = useDateRange();

  const [adsets, setAdsets] = useState<MetaAdsetRow[]>([]);
  const [chartDataFromApi, setChartDataFromApi] = useState<
    Array<{ date: string; spend: number; sales: number; impressions?: number; clicks?: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedAdsets, setSelectedAdsets] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterValues>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [chartToggles, setChartToggles] = useState<Record<string, boolean>>({
    spend: true,
    sales: true,
    impressions: false,
    clicks: false,
  });
  const [chartCollapsed, setChartCollapsed] = useState(false);

  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<"ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED" | null>(null);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
  const [budgetAction, setBudgetAction] = useState<"increase" | "decrease" | "set">("set");
  const [budgetUnit, setBudgetUnit] = useState<"percent" | "amount">("amount");
  const [budgetValue, setBudgetValue] = useState("");
  const [upperLimit, setUpperLimit] = useState("");
  const [lowerLimit, setLowerLimit] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedAdsetsFetched, setSelectedAdsetsFetched] = useState<MetaAdsetRow[] | null>(null);
  const [selectedAdsetsFetching, setSelectedAdsetsFetching] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inlineBudgetAdsetId, setInlineBudgetAdsetId] = useState<string | null>(null);
  const [inlineBudgetValue, setInlineBudgetValue] = useState("");
  type InlineConfirm =
    | { type: "status"; adsetId: string; newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED"; row: MetaAdsetRow }
    | { type: "budget"; adsetId: string; newBudget: number; row: MetaAdsetRow };
  const [inlineConfirm, setInlineConfirm] = useState<InlineConfirm | null>(null);
  const [inlineConfirmLoading, setInlineConfirmLoading] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  const { showEditSummary, EditSummaryModal } = useEditSummaryModal();
  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;

  const loadAdsets = useCallback(async () => {
    if (!channelIdNum) return;
    setLoading(true);
    try {
      const data = await accountsService.getMetaAdSets(channelIdNum, {
        page: currentPage,
        page_size: itemsPerPage,
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDateStr,
        end_date: endDateStr,
        filters: filters.map((f) => ({ field: f.field, operator: f.operator, value: f.value })),
      });
      setAdsets(data.adsets || []);
      setChartDataFromApi(data.chart_data || []);
      setTotalPages(data.total_pages || 0);
      setTotal(data.total || 0);
    } catch (e) {
      setAdsets([]);
      setChartDataFromApi([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [channelIdNum, currentPage, itemsPerPage, sortBy, sortOrder, startDateStr, endDateStr, filters]);

  useEffect(() => {
    setPageTitle("Meta Ad Sets");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    loadAdsets();
  }, [loadAdsets]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400 inline-block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-[#556179] inline-block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#556179] inline-block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({ ...prev, [metric]: !prev[metric] }));
  };

  const chartData = useMemo(() => {
    if (chartDataFromApi.length === 0) return [];
    return chartDataFromApi.map((item) => {
      let formattedDate = item.date;
      if (item.date) {
        try {
          const dateObj = new Date(item.date);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }
        } catch {
          formattedDate = item.date;
        }
      }
      return {
        date: formattedDate,
        spend: item.spend ?? 0,
        sales: item.sales ?? 0,
        impressions: item.impressions ?? 0,
        clicks: Math.round(item.clicks ?? 0),
      };
    });
  }, [chartDataFromApi]);

  const allSelected = adsets.length > 0 && selectedAdsets.size === adsets.length;
  const someSelected = selectedAdsets.size > 0 && selectedAdsets.size < adsets.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedAdsets(new Set());
    } else {
      setSelectedAdsets(new Set(adsets.map((a) => String(a.adset_id ?? a.id))));
    }
  };

  const handleSelectAdset = (adsetId: string) => {
    setSelectedAdsets((prev) => {
      const next = new Set(prev);
      if (next.has(adsetId)) next.delete(adsetId);
      else next.add(adsetId);
      return next;
    });
  };

  useEffect(() => {
    if (!showConfirmationModal || selectedAdsets.size === 0 || !channelIdNum) {
      if (!showConfirmationModal) setSelectedAdsetsFetched(null);
      return;
    }
    let cancelled = false;
    setSelectedAdsetsFetching(true);
    accountsService
      .getMetaAdSetsByIds(channelIdNum, { adsetIds: Array.from(selectedAdsets) })
      .then((res) => {
        if (!cancelled) setSelectedAdsetsFetched((res.adsets ?? []) as MetaAdsetRow[]);
      })
      .catch(() => {
        if (!cancelled) setSelectedAdsetsFetched([]);
      })
      .finally(() => {
        if (!cancelled) setSelectedAdsetsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showConfirmationModal, selectedAdsets.size, channelIdNum]);

  const getSelectedAdsetsData = (): MetaAdsetRow[] => {
    if (selectedAdsetsFetched != null) return selectedAdsetsFetched;
    return adsets.filter((a) => selectedAdsets.has(String(a.adset_id ?? a.id)));
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(e.target as Node)) {
        setShowBulkActions(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const runBulkStatus = async (statusValue: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED") => {
    if (!channelIdNum || selectedAdsets.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await accountsService.bulkUpdateMetaAdSets(channelIdNum, {
        adsetIds: Array.from(selectedAdsets),
        status: statusValue,
      });
      setSelectedAdsets(new Set());
      const succeededItems = (res.successes ?? []).slice(0, 10).map((s) => ({
        label: s.adsetName ?? `Ad set ${s.adsetId}`,
        field: s.field,
        oldValue: s.oldValue,
        newValue: s.newValue,
      }));
      showEditSummary({
        entityType: "adSet",
        action: "updated",
        mode: "bulk",
        succeededCount: res.updated ?? 0,
        failedCount: (res.failed ?? 0) > 0 ? res.failed : undefined,
        succeededItems,
        details: (res.errors ?? []).slice(0, 5).map((e) => ({
          label: `Ad set ${e.adsetId}`,
          value: e.error,
        })),
      });
      loadAdsets();
    } catch (err: unknown) {
      console.error("Meta bulk ad set status update failed", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const calculateNewBudget = (currentBudget: number): number => {
    const valueNum = parseFloat(budgetValue);
    if (isNaN(valueNum)) return currentBudget;
    let newBudget = currentBudget;
    if (budgetAction === "increase") {
      if (budgetUnit === "percent") {
        newBudget = currentBudget * (1 + valueNum / 100);
      } else {
        newBudget = currentBudget + valueNum;
      }
      if (upperLimit) {
        const upper = parseFloat(upperLimit);
        if (!isNaN(upper)) newBudget = Math.min(newBudget, upper);
      }
    } else if (budgetAction === "decrease") {
      if (budgetUnit === "percent") {
        newBudget = currentBudget * (1 - valueNum / 100);
      } else {
        newBudget = currentBudget - valueNum;
      }
      if (lowerLimit) {
        const lower = parseFloat(lowerLimit);
        if (!isNaN(lower)) newBudget = Math.max(newBudget, lower);
      }
    } else {
      newBudget = valueNum;
    }
    return Math.max(0, newBudget);
  };

  const runBulkBudget = async () => {
    if (!channelIdNum || selectedAdsets.size === 0) return;
    const valueNum = parseFloat(budgetValue);
    if (isNaN(valueNum)) return;
    setBulkLoading(true);
    try {
      const payload: Parameters<typeof accountsService.bulkUpdateMetaAdSets>[1] = {
        adsetIds: Array.from(selectedAdsets),
      };
      if (budgetAction === "set") {
        payload.daily_budget = valueNum;
      } else {
        payload.budget_action = budgetAction;
        payload.budget_unit = budgetUnit;
        payload.budget_value = valueNum;
        if (upperLimit) {
          const u = parseFloat(upperLimit);
          if (!isNaN(u)) payload.upper_limit = u;
        }
        if (lowerLimit) {
          const l = parseFloat(lowerLimit);
          if (!isNaN(l)) payload.lower_limit = l;
        }
      }
      const res = await accountsService.bulkUpdateMetaAdSets(channelIdNum, payload);
      setSelectedAdsets(new Set());
      setShowBudgetPanel(false);
      setBudgetValue("");
      setUpperLimit("");
      setLowerLimit("");
      const succeededItems = (res.successes ?? []).slice(0, 10).map((s) => ({
        label: s.adsetName ?? `Ad set ${s.adsetId}`,
        field: s.field,
        oldValue: s.oldValue,
        newValue: s.newValue,
      }));
      showEditSummary({
        entityType: "adSet",
        action: "updated",
        mode: "bulk",
        succeededCount: res.updated ?? 0,
        failedCount: (res.failed ?? 0) > 0 ? res.failed : undefined,
        succeededItems,
        details: (res.errors ?? []).slice(0, 5).map((e) => ({
          label: `Ad set ${e.adsetId}`,
          value: e.error,
        })),
      });
      loadAdsets();
    } catch (err: unknown) {
      console.error("Meta bulk ad set budget update failed", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkDelete = async () => {
    if (!channelIdNum || selectedAdsets.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await accountsService.bulkUpdateMetaAdSets(channelIdNum, {
        adsetIds: Array.from(selectedAdsets),
        action: "delete",
      });
      setSelectedAdsets(new Set());
      setShowDeleteModal(false);
      const succeededItems = (res.successes ?? []).slice(0, 10).map((s) => ({
        label: s.adsetName ?? `Ad set ${s.adsetId}`,
        field: s.field,
        oldValue: s.oldValue,
        newValue: s.newValue,
      }));
      showEditSummary({
        entityType: "adSet",
        action: "deleted",
        mode: "bulk",
        succeededCount: res.updated ?? 0,
        failedCount: (res.failed ?? 0) > 0 ? res.failed : undefined,
        succeededItems,
        details: (res.errors ?? []).slice(0, 5).map((e) => ({
          label: `Ad set ${e.adsetId}`,
          value: e.error,
        })),
      });
      loadAdsets();
    } catch (err: unknown) {
      console.error("Meta bulk ad set delete failed", err);
      setShowDeleteModal(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleInlineStatusChange = (adsetId: string, newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED") => {
    if (!channelIdNum) return;
    const row = adsets.find((a) => String(a.adset_id ?? a.id) === adsetId);
    if (!row) return;
    setInlineConfirm({ type: "status", adsetId, newStatus, row });
  };

  const rowUsesDailyBudget = (row: MetaAdsetRow): boolean => {
    const d = row.daily_budget != null && String(row.daily_budget).trim() !== "" && parseFloat(String(row.daily_budget)) > 0;
    return d;
  };

  const getRowBudgetDisplay = (row: MetaAdsetRow): string => {
    if (rowUsesDailyBudget(row)) return String(row.daily_budget ?? "");
    if (row.lifetime_budget != null && String(row.lifetime_budget).trim() !== "" && parseFloat(String(row.lifetime_budget)) > 0)
      return String(row.lifetime_budget ?? "");
    return "";
  };

  const handleInlineBudgetBlur = (adsetId: string, value: string) => {
    if (!channelIdNum) return;
    setInlineBudgetAdsetId(null);
    const num = parseFloat(value.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) return;
    const row = adsets.find((a) => String(a.adset_id ?? a.id) === adsetId);
    if (!row) return;
    const currentStr = getRowBudgetDisplay(row);
    const current = currentStr !== "" ? Number(currentStr) : null;
    if (current !== null && Math.abs(current - num) < 0.001) return;
    setInlineConfirm({ type: "budget", adsetId, newBudget: num, row });
  };

  const runInlineConfirm = async () => {
    if (!channelIdNum || !inlineConfirm) return;
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
          loadAdsets();
        }
      } else {
        const useDaily = rowUsesDailyBudget(inlineConfirm.row);
        const payload = useDaily
          ? { adsetIds: [inlineConfirm.adsetId], daily_budget: inlineConfirm.newBudget }
          : { adsetIds: [inlineConfirm.adsetId], lifetime_budget: inlineConfirm.newBudget };
        const res = await accountsService.bulkUpdateMetaAdSets(channelIdNum, payload);
        const succeededCount = res.updated ?? 0;
        const failedCount = res.failed ?? 0;
        const hasErrors = Array.isArray(res.errors) && res.errors.length > 0;
        const hasOutcome = succeededCount > 0 || failedCount > 0 || hasErrors;

        if (hasOutcome) {
          const currentStr = getRowBudgetDisplay(inlineConfirm.row);
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
          loadAdsets();
        }
      }
    } catch (err: unknown) {
      console.error("Meta inline ad set update failed", err);
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
                const currentStr = getRowBudgetDisplay(inlineConfirm.row);
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
            value: "Something went wrong while applying your inline change. Please try again.",
          },
        ],
      });
    } finally {
      setInlineConfirm(null);
      setInlineConfirmLoading(false);
    }
  };

  const getStatusOption = (status: string | undefined): "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED" => {
    const u = (status ?? "").toUpperCase();
    if (u === "ACTIVE") return "ACTIVE";
    if (u === "ARCHIVED") return "ARCHIVED";
    if (u === "DELETED") return "DELETED";
    return "PAUSED";
  };

  const statusSelectBg = (status: string | undefined) => {
    const u = (status ?? "").toUpperCase();
    if (u === "ACTIVE") return "bg-emerald-50";
    if (u === "DELETED") return "bg-red-50";
    return "bg-gray-100";
  };

  const formatDate = (d: string | undefined) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
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
          <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  Ad Sets
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className="edit-button"
                  >
                    <svg
                      className="w-5 h-5 text-[#072929]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    <span className="text-[10.64px] text-[#072929] font-normal">
                      Add Filter
                    </span>
                    <svg
                      className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {isFilterPanelOpen && accountId && (
                <DynamicFilterPanel
                  isOpen={true}
                  onClose={() => setIsFilterPanelOpen(false)}
                  onApply={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                  }}
                  initialFilters={filters}
                  accountId={accountId}
                  marketplace="meta"
                  entityType="adsets"
                />
              )}

              <div className="relative">
                <PerformanceChart
                  data={chartData}
                  toggles={chartToggles}
                  onToggle={toggleChartMetric}
                  title="Performance Trends"
                  isCollapsed={chartCollapsed}
                  onCollapseToggle={() => setChartCollapsed(!chartCollapsed)}
                />
                {loading && !chartCollapsed && (
                  <div className="loading-overlay">
                    <div className="loading-overlay-content">
                      <Loader size="md" message="Loading chart data..." />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="flex items-center justify-end gap-2 mb-4">
                  <div className="relative inline-flex justify-end" ref={bulkDropdownRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBulkActions((prev) => !prev);
                        setShowBudgetPanel(false);
                      }}
                      className="edit-button flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5 text-[#072929]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                        />
                      </svg>
                      <span className="text-[10.64px] text-[#072929] font-normal">
                        Bulk Actions
                      </span>
                      <svg
                        className={`w-5 h-5 text-[#E3E3E3] transition-transform ${showBulkActions ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showBulkActions && (
                      <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                        {[
                          { value: "ACTIVE", label: "Enable" },
                          { value: "PAUSED", label: "Pause" },
                          { value: "ARCHIVED", label: "Archive" },
                          { value: "edit_budget", label: "Edit Budget" },
                          { value: "delete", label: "Delete" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            disabled={selectedAdsets.size === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedAdsets.size === 0) return;
                              setShowBulkActions(false);
                              if (opt.value === "edit_budget") {
                                setShowBudgetPanel(true);
                                setIsBudgetChange(true);
                                setPendingStatusAction(null);
                              } else if (opt.value === "delete") {
                                setShowDeleteModal(true);
                                setShowBudgetPanel(false);
                                setPendingStatusAction(null);
                              } else {
                                setShowBudgetPanel(false);
                                setPendingStatusAction(opt.value as "ACTIVE" | "PAUSED" | "ARCHIVED");
                                setIsBudgetChange(false);
                                setShowConfirmationModal(true);
                              }
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedAdsets.size > 0 && showBudgetPanel && (
                  <div className="mb-4 border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
                    <div className="flex flex-wrap items-end gap-3 justify-between">
                      <div className="w-[160px]">
                        <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                          Action
                        </label>
                        <Dropdown
                          options={[
                            { value: "increase", label: "Increase By" },
                            { value: "decrease", label: "Decrease By" },
                            { value: "set", label: "Set To" },
                          ]}
                          value={budgetAction}
                          onChange={(val) => {
                            const action = val as "increase" | "decrease" | "set";
                            setBudgetAction(action);
                            if (action === "set") setBudgetUnit("amount");
                          }}
                          buttonClassName="edit-button  w-full"
                          width="w-full"
                        />
                      </div>
                      {(budgetAction === "increase" || budgetAction === "decrease") && (
                        <div className="w-[140px]">
                          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                            Unit
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={`flex-1 px-3 py-2 rounded-lg border items-center ${budgetUnit === "percent"
                                ? "bg-forest-f40 border-forest-f40 text-white"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                              onClick={() => setBudgetUnit("percent")}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              className={`flex-1 px-3 py-2 rounded-lg border items-center ${budgetUnit === "amount"
                                ? "bg-forest-f40 border-forest-f40 text-white"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                              onClick={() => setBudgetUnit("amount")}
                            >
                              $
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="w-[160px]">
                        <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                          Value
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step={budgetUnit === "percent" ? 0.1 : 0.01}
                            value={budgetValue}
                            onChange={(e) => setBudgetValue(e.target.value)}
                            placeholder={budgetUnit === "percent" ? "e.g. 10" : "e.g. 20.00"}
                            className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                            {budgetUnit === "percent" ? "%" : "$"}
                          </span>
                        </div>
                      </div>
                      {budgetAction === "increase" && (
                        <div className="w-[160px]">
                          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                            Upper Limit (optional)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={upperLimit}
                            onChange={(e) => setUpperLimit(e.target.value)}
                            placeholder="e.g. 100"
                            className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                          />
                        </div>
                      )}
                      {budgetAction === "decrease" && (
                        <div className="w-[160px]">
                          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                            Lower Limit (optional)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={lowerLimit}
                            onChange={(e) => setLowerLimit(e.target.value)}
                            placeholder="e.g. 5"
                            className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setShowBudgetPanel(false);
                            setBudgetValue("");
                            setUpperLimit("");
                            setLowerLimit("");
                            setShowBulkActions(false);
                          }}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!budgetValue || bulkLoading) return;
                            setIsBudgetChange(true);
                            setPendingStatusAction(null);
                            setShowConfirmationModal(true);
                          }}
                          disabled={bulkLoading || !budgetValue}
                          className="create-entity-button btn-sm"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmation Modal (status or budget) */}
                {showConfirmationModal && (
                  <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !bulkLoading) {
                        setShowConfirmationModal(false);
                        setPendingStatusAction(null);
                        setIsBudgetChange(false);
                      }
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                      <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                        {isBudgetChange ? "Confirm Budget Changes" : "Confirm Status Changes"}
                      </h3>
                      <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4 mb-4">
                        <span className="text-[12.16px] text-[#556179]">
                          {selectedAdsets.size} ad set{selectedAdsets.size !== 1 ? "s" : ""} will be updated:{" "}
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {isBudgetChange ? "Budget" : "Status"} change
                        </span>
                      </div>
                      {selectedAdsetsFetching ? (
                        <div className="mb-6 py-8 text-center text-[12.16px] text-[#556179]">
                          Loading selected ad sets...
                        </div>
                      ) : (
                        (() => {
                          const data = getSelectedAdsetsData();
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
                                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">Ad Set Name</th>
                                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">Old Value</th>
                                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">New Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {preview.map((a) => {
                                      const aid = String(a.adset_id ?? a.id);
                                      const name = a.adset_name ?? "—";
                                      const budgetStr = a.daily_budget != null && String(a.daily_budget).trim() !== "" && parseFloat(String(a.daily_budget)) > 0
                                        ? String(a.daily_budget)
                                        : (a.lifetime_budget != null && String(a.lifetime_budget).trim() !== "" && parseFloat(String(a.lifetime_budget)) > 0 ? String(a.lifetime_budget) : "");
                                      const currentBudget = budgetStr !== "" ? Number(budgetStr) : 0;
                                      const oldVal = isBudgetChange
                                        ? (budgetStr !== "" ? formatCurrency(Number(budgetStr)) : "—")
                                        : normalizeStatusDisplay(a.status);
                                      const newVal = isBudgetChange
                                        ? formatCurrency(calculateNewBudget(currentBudget))
                                        : pendingStatusAction ? normalizeStatusDisplay(pendingStatusAction) : "—";
                                      return (
                                        <tr key={aid} className="border-b border-gray-200 last:border-b-0">
                                          <td className="px-4 py-2 text-[10.64px] text-[#072929] max-w-[240px] truncate" title={name}>{name}</td>
                                          <td className="px-4 py-2 text-[10.64px] text-[#556179]">{oldVal}</td>
                                          <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">{newVal}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()
                      )}
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkLoading) {
                              setShowConfirmationModal(false);
                              setPendingStatusAction(null);
                              setIsBudgetChange(false);
                            }
                          }}
                          disabled={bulkLoading}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (bulkLoading || selectedAdsetsFetching) return;
                            try {
                              if (isBudgetChange) {
                                await runBulkBudget();
                                setShowBudgetPanel(false);
                                setBudgetValue("");
                              } else if (pendingStatusAction) {
                                await runBulkStatus(pendingStatusAction);
                              }
                            } finally {
                              setShowConfirmationModal(false);
                              setPendingStatusAction(null);
                              setIsBudgetChange(false);
                            }
                          }}
                          disabled={bulkLoading || selectedAdsetsFetching}
                          className="create-entity-button btn-sm flex items-center gap-2"
                        >
                          {bulkLoading ? (
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

                {/* Delete confirmation modal */}
                {showDeleteModal && (
                  <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && !bulkLoading) setShowDeleteModal(false);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                      <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                        Delete ad sets?
                      </h3>
                      <p className="text-[12.16px] text-[#556179] mb-4">
                        You are about to permanently delete {selectedAdsets.size} selected ad set
                        {selectedAdsets.size !== 1 ? "s" : ""}. This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => !bulkLoading && setShowDeleteModal(false)}
                          disabled={bulkLoading}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={runBulkDelete}
                          disabled={bulkLoading}
                          className="px-4 py-2 bg-red-600 text-white text-[10.64px] rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {bulkLoading ? "Deleting..." : "Confirm"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="table-container"
                  style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}
                >
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[1200px] w-full">
                      <thead>
                        <tr className="border-b border-[#e8e8e3]">
                          <th
                            className="table-header w-[35px] sticky left-0 z-[120] bg-[#f5f5f0] border-r border-[#e8e8e3] py-3 px-4"
                            style={{ minWidth: "35px" }}
                          >
                            <Checkbox
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={handleSelectAll}
                              aria-label="Select all"
                            />
                          </th>
                          <th
                            className="table-header table-sticky-first-column text-left py-3 px-4 min-w-[300px] max-w-[400px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("adset_name")}
                          >
                            <div className="flex items-center gap-1">
                              Ad Set Name
                              {getSortIcon("adset_name")}
                            </div>
                          </th>
                          <th
                            className="table-header text-left py-3 px-4 min-w-[140px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("campaign_name")}
                          >
                            <div className="flex items-center gap-1">
                              Campaign
                              {getSortIcon("campaign_name")}
                            </div>
                          </th>
                          <th
                            className="table-header text-left py-3 px-4 min-w-[115px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              State
                              {getSortIcon("status")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[125px] w-[125px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("daily_budget")}
                          >
                            <div className="flex items-center gap-1">
                              Budget
                              {getSortIcon("daily_budget")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[90px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("bid_amount")}
                          >
                            <div className="flex items-center gap-1">
                              Bid
                              {getSortIcon("bid_amount")}
                            </div>
                          </th>
                          <th
                            className="table-header text-left py-3 px-4 min-w-[100px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("start_date")}
                          >
                            <div className="flex items-center gap-1">
                              Start Date
                              {getSortIcon("start_date")}
                            </div>
                          </th>
                          <th
                            className="table-header text-left py-3 px-4 min-w-[100px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("end_date")}
                          >
                            <div className="flex items-center gap-1">
                              End Date
                              {getSortIcon("end_date")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[90px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("spends")}
                          >
                            <div className="flex items-center gap-1">
                              Spends
                              {getSortIcon("spends")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[90px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("sales")}
                          >
                            <div className="flex items-center gap-1">
                              Sales
                              {getSortIcon("sales")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[100px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("impressions")}
                          >
                            <div className="flex items-center gap-1">
                              Impressions
                              {getSortIcon("impressions")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[80px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("clicks")}
                          >
                            <div className="flex items-center gap-1">
                              Clicks
                              {getSortIcon("clicks")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[80px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("acos")}
                          >
                            <div className="flex items-center gap-1">
                              ACOS
                              {getSortIcon("acos")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[80px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("roas")}
                          >
                            <div className="flex items-center gap-1">
                              ROAS
                              {getSortIcon("roas")}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {adsets.map((row) => {
                          const aid = String(row.adset_id ?? row.id);
                          return (
                            <tr
                              key={row.id ?? row.adset_id}
                              className="table-row border-b border-[#e8e8e3] last:border-b-0 group"
                            >
                              <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3] py-3 px-4 w-[35px]">
                                <Checkbox
                                  checked={selectedAdsets.has(aid)}
                                  onChange={() => handleSelectAdset(aid)}
                                  aria-label={`Select ${row.adset_name || aid}`}
                                />
                              </td>
                              <td className="table-cell table-sticky-first-column min-w-[300px] max-w-[400px] group-hover:bg-[#f9f9f6] py-3 px-4 text-left overflow-hidden">
                                <span className="table-text leading-[1.26] text-[#072929] block truncate" title={row.adset_name || undefined}>
                                  {row.adset_name || "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.campaign_name ?? row.campaign_id ?? "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <select
                                  value={getStatusOption(row.status)}
                                  onChange={(e) =>
                                    handleInlineStatusChange(aid, e.target.value as "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED")
                                  }
                                  className={`edit-button google-table-dropdown min-w-0 ${statusSelectBg(row.status)}`}
                                  style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                                    backgroundPosition: "right 6px center",
                                  }}
                                  aria-label={`Status for ${row.adset_name || aid}`}
                                >
                                  <option value="ACTIVE">Enabled</option>
                                  <option value="PAUSED">Paused</option>
                                  <option value="ARCHIVED">Archived</option>
                                  <option value="DELETED">Deleted</option>
                                </select>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    inlineBudgetAdsetId === aid
                                      ? inlineBudgetValue
                                      : getRowBudgetDisplay(row)
                                  }
                                  onFocus={() => {
                                    setInlineBudgetAdsetId(aid);
                                    setInlineBudgetValue(getRowBudgetDisplay(row));
                                  }}
                                  onChange={(e) => {
                                    if (inlineBudgetAdsetId === aid) setInlineBudgetValue(e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    handleInlineBudgetBlur(aid, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  placeholder="—"
                                  className="inline-edit-input w-full min-w-[120px]"
                                  aria-label={`Budget for ${row.adset_name || aid}`}
                                />
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.bid_amount != null && String(row.bid_amount).trim() !== ""
                                    ? String(row.bid_amount)
                                    : "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {formatDate(row.start_date ?? row.start_time)}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {formatDate(row.end_date ?? row.end_time)}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.spends != null
                                    ? formatCurrency(Number(row.spends))
                                    : "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.sales != null
                                    ? formatCurrency(Number(row.sales))
                                    : "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.impressions != null
                                    ? formatNumber(Number(row.impressions))
                                    : "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.clicks != null ? formatNumber(Number(row.clicks)) : "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.acos != null ? formatPercentage(Number(row.acos)) : "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.roas != null ? Number(row.roas).toFixed(2) : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {loading && (
                    <div className="loading-overlay">
                      <div className="loading-overlay-content">
                        <Loader size="md" message="Loading ad sets..." />
                      </div>
                    </div>
                  )}
                </div>

                {(totalPages > 1 || total > 0) && (
                  <div className="flex items-center justify-end mt-4">
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
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
                          className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
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
              {/* Inline edit confirmation (same structure as bulk per BULK_INLINE_UPDATE_SPEC) */}
              {inlineConfirm && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !inlineConfirmLoading) setInlineConfirm(null);
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      {inlineConfirm.type === "status" ? "Confirm Status Changes" : "Confirm Budget Changes"}
                    </h3>
                    <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4 mb-4">
                      <span className="text-[12.16px] text-[#556179]">
                        1 ad set will be updated:{" "}
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {inlineConfirm.type === "status" ? "Status" : "Budget"} change
                      </span>
                    </div>
                    <div className="mb-6">
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full table-fixed">
                          <thead className="bg-[#f5f5f0]">
                            <tr>
                              <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">Ad Set Name</th>
                              <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">Old Value</th>
                              <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">New Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-200">
                              <td className="px-4 py-2 text-[10.64px] text-[#072929] truncate" title={inlineConfirm.row.adset_name ?? undefined}>{inlineConfirm.row.adset_name ?? "—"}</td>
                              <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                {inlineConfirm.type === "status"
                                  ? normalizeStatusDisplay(inlineConfirm.row.status)
                                  : (() => { const s = getRowBudgetDisplay(inlineConfirm.row); return s !== "" ? formatCurrency(Number(s)) : "—"; })()}
                              </td>
                              <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                {inlineConfirm.type === "status"
                                  ? normalizeStatusDisplay(inlineConfirm.newStatus)
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
                        onClick={() => !inlineConfirmLoading && setInlineConfirm(null)}
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
              <EditSummaryModal />
            </div>
          </div>
        </Assistant>
      </div>
    </div>
  );
};
