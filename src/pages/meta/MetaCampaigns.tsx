import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
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
import { CreateMetaCampaignPanel } from "../../components/meta/CreateMetaCampaignPanel";
import { EditMetaCampaignPanel } from "../../components/meta/EditMetaCampaignPanel";
import { Dropdown } from "../../components/ui/Dropdown";

export interface MetaCampaignRow {
  id: number;
  campaign_id: string;
  campaign_name: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  daily_budget?: number;
  impressions?: number;
  clicks?: number;
  spends?: number;
  sales?: number;
  acos?: number;
  roas?: number;
}

export interface MetaCampaignsSummary {
  total_campaigns: number;
  total_spends: number;
  total_sales: number;
  total_impressions: number;
  total_clicks: number;
  avg_acos: number;
  avg_roas: number;
}

export const MetaCampaigns: React.FC = () => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDateStr, endDateStr } = useDateRange();

  const [campaigns, setCampaigns] = useState<MetaCampaignRow[]>([]);
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
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
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
  const [pendingStatusAction, setPendingStatusAction] = useState<"ACTIVE" | "PAUSED" | "ARCHIVED" | null>(null);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
  const [budgetAction, setBudgetAction] = useState<"increase" | "decrease" | "set">("set");
  const [budgetUnit, setBudgetUnit] = useState<"percent" | "amount">("amount");
  const [budgetValue, setBudgetValue] = useState("");
  const [upperLimit, setUpperLimit] = useState("");
  const [lowerLimit, setLowerLimit] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedCampaignsFetched, setSelectedCampaignsFetched] = useState<MetaCampaignRow[] | null>(null);
  const [selectedCampaignsFetching, setSelectedCampaignsFetching] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inlineBudgetCampaignId, setInlineBudgetCampaignId] = useState<string | null>(null);
  const [inlineBudgetValue, setInlineBudgetValue] = useState("");
  type InlineConfirm =
    | { type: "status"; campaignId: string; newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED"; row: MetaCampaignRow }
    | { type: "budget"; campaignId: string; newBudget: number; row: MetaCampaignRow };
  const [inlineConfirm, setInlineConfirm] = useState<InlineConfirm | null>(null);
  const [inlineConfirmLoading, setInlineConfirmLoading] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);
  const [showCreateCampaignPanel, setShowCreateCampaignPanel] = useState(false);
  type EditingCampaign = { campaignId: string; name: string; status?: string; dailyBudget?: number } | null;
  const [editingCampaign, setEditingCampaign] = useState<EditingCampaign>(null);

  const { showEditSummary, EditSummaryModal } = useEditSummaryModal();
  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;

  const loadCampaigns = useCallback(async () => {
    if (!channelIdNum) return;
    setLoading(true);
    try {
      const data = await accountsService.getMetaCampaigns(channelIdNum, {
        page: currentPage,
        page_size: itemsPerPage,
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDateStr,
        end_date: endDateStr,
        filters: filters.map((f) => ({ field: f.field, operator: f.operator, value: f.value })),
      });
      setCampaigns(data.campaigns || []);
      setChartDataFromApi(data.chart_data || []);
      setTotalPages(data.total_pages || 0);
      setTotal(data.total || 0);
    } catch (e) {
      setCampaigns([]);
      setChartDataFromApi([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [channelIdNum, currentPage, itemsPerPage, sortBy, sortOrder, startDateStr, endDateStr, filters]);

  useEffect(() => {
    setPageTitle("Meta Campaigns");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  /** Sort icon for table headers (matches Google campaign table: neutral when inactive, up/down when active). */
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

  const allSelected = campaigns.length > 0 && selectedCampaigns.size === campaigns.length;
  const someSelected = selectedCampaigns.size > 0 && selectedCampaigns.size < campaigns.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(campaigns.map((c) => String(c.campaign_id ?? c.id))));
    }
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
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

  // Fetch selected campaigns when confirmation modal opens (cross-page selection)
  useEffect(() => {
    if (!showConfirmationModal || selectedCampaigns.size === 0 || !channelIdNum) {
      if (!showConfirmationModal) setSelectedCampaignsFetched(null);
      return;
    }
    let cancelled = false;
    setSelectedCampaignsFetching(true);
    accountsService
      .getMetaCampaignsByIds(channelIdNum, { campaignIds: Array.from(selectedCampaigns) })
      .then((res) => {
        if (!cancelled) setSelectedCampaignsFetched((res.campaigns ?? []) as MetaCampaignRow[]);
      })
      .catch(() => {
        if (!cancelled) setSelectedCampaignsFetched([]);
      })
      .finally(() => {
        if (!cancelled) setSelectedCampaignsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showConfirmationModal, selectedCampaigns.size, channelIdNum]);

  const getSelectedCampaignsData = (): MetaCampaignRow[] => {
    if (selectedCampaignsFetched != null) return selectedCampaignsFetched;
    return campaigns.filter((c) =>
      selectedCampaigns.has(String(c.campaign_id ?? c.id))
    );
  };

  // Close bulk dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(e.target as Node)) {
        setShowBulkActions(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const runBulkStatus = async (statusValue: "ACTIVE" | "PAUSED" | "ARCHIVED") => {
    if (!channelIdNum || selectedCampaigns.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await accountsService.bulkUpdateMetaCampaigns(channelIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        status: statusValue,
      });
      setSelectedCampaigns(new Set());
      const succeededItems = (res.successes ?? []).slice(0, 10).map((s) => ({
        label: s.campaignName ?? `Campaign ${s.campaignId}`,
        field: s.field,
        oldValue: s.oldValue,
        newValue: s.newValue,
      }));
      showEditSummary({
        entityType: "campaign",
        action: "updated",
        mode: "bulk",
        succeededCount: res.updated ?? 0,
        failedCount: (res.failed ?? 0) > 0 ? res.failed : undefined,
        succeededItems,
        details: (res.errors ?? []).slice(0, 5).map((e) => ({
          label: `Campaign ${e.campaignId}`,
          value: e.error,
        })),
      });
      loadCampaigns();
    } catch (err: unknown) {
      console.error("Meta bulk status update failed", err);
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
    if (!channelIdNum || selectedCampaigns.size === 0) return;
    const valueNum = parseFloat(budgetValue);
    if (isNaN(valueNum)) return;
    setBulkLoading(true);
    try {
      const payload: Parameters<typeof accountsService.bulkUpdateMetaCampaigns>[1] = {
        campaignIds: Array.from(selectedCampaigns),
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
      const res = await accountsService.bulkUpdateMetaCampaigns(channelIdNum, payload);
      setSelectedCampaigns(new Set());
      setShowBudgetPanel(false);
      setBudgetValue("");
      setUpperLimit("");
      setLowerLimit("");
      const succeededItems = (res.successes ?? []).slice(0, 10).map((s) => ({
        label: s.campaignName ?? `Campaign ${s.campaignId}`,
        field: s.field,
        oldValue: s.oldValue,
        newValue: s.newValue,
      }));
      showEditSummary({
        entityType: "campaign",
        action: "updated",
        mode: "bulk",
        succeededCount: res.updated ?? 0,
        failedCount: (res.failed ?? 0) > 0 ? res.failed : undefined,
        succeededItems,
        details: (res.errors ?? []).slice(0, 5).map((e) => ({
          label: `Campaign ${e.campaignId}`,
          value: e.error,
        })),
      });
      loadCampaigns();
    } catch (err: unknown) {
      console.error("Meta bulk budget update failed", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkDelete = async () => {
    if (!channelIdNum || selectedCampaigns.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await accountsService.bulkUpdateMetaCampaigns(channelIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "delete",
      });
      setSelectedCampaigns(new Set());
      setShowDeleteModal(false);
      const succeededItems = (res.successes ?? []).slice(0, 10).map((s) => ({
        label: s.campaignName ?? `Campaign ${s.campaignId}`,
        field: s.field,
        oldValue: s.oldValue,
        newValue: s.newValue,
      }));
      showEditSummary({
        entityType: "campaign",
        action: "deleted",
        mode: "bulk",
        succeededCount: res.updated ?? 0,
        failedCount: (res.failed ?? 0) > 0 ? res.failed : undefined,
        succeededItems,
        details: (res.errors ?? []).slice(0, 5).map((e) => ({
          label: `Campaign ${e.campaignId}`,
          value: e.error,
        })),
      });
      loadCampaigns();
    } catch (err: unknown) {
      console.error("Meta bulk delete failed", err);
      setShowDeleteModal(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleInlineStatusChange = (campaignId: string, newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED") => {
    if (!channelIdNum) return;
    const row = campaigns.find((c) => String(c.campaign_id ?? c.id) === campaignId);
    if (!row) return;
    setInlineConfirm({ type: "status", campaignId, newStatus, row });
  };

  const handleInlineBudgetBlur = (campaignId: string, value: string) => {
    if (!channelIdNum) return;
    setInlineBudgetCampaignId(null);
    const num = parseFloat(value.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) return;
    const row = campaigns.find((c) => String(c.campaign_id ?? c.id) === campaignId);
    if (!row) return;
    const current = row.daily_budget != null ? Number(row.daily_budget) : null;
    if (current !== null && Math.abs(current - num) < 0.001) return;
    setInlineConfirm({ type: "budget", campaignId, newBudget: num, row });
  };

  const runInlineConfirm = async () => {
    if (!channelIdNum || !inlineConfirm) return;
    setInlineConfirmLoading(true);
    try {
      if (inlineConfirm.type === "status") {
        const res = await accountsService.bulkUpdateMetaCampaigns(channelIdNum, {
          campaignIds: [inlineConfirm.campaignId],
          status: inlineConfirm.newStatus,
        });
        if ((res.updated ?? 0) > 0) {
          showEditSummary({
            entityType: "campaign",
            action: "updated",
            mode: "inline",
            succeededCount: 1,
            entityName: inlineConfirm.row.campaign_name ?? "Campaign",
            field: "Status",
            oldValue: normalizeStatusDisplay(inlineConfirm.row.status),
            newValue: normalizeStatusDisplay(inlineConfirm.newStatus),
          });
          loadCampaigns();
        }
      } else {
        const res = await accountsService.bulkUpdateMetaCampaigns(channelIdNum, {
          campaignIds: [inlineConfirm.campaignId],
          daily_budget: inlineConfirm.newBudget,
        });
        if ((res.updated ?? 0) > 0) {
          const current = inlineConfirm.row.daily_budget != null ? Number(inlineConfirm.row.daily_budget) : null;
          showEditSummary({
            entityType: "campaign",
            action: "updated",
            mode: "inline",
            succeededCount: 1,
            entityName: inlineConfirm.row.campaign_name ?? "Campaign",
            field: "Budget",
            oldValue: current != null ? formatCurrency(current) : "—",
            newValue: formatCurrency(inlineConfirm.newBudget),
          });
          loadCampaigns();
        }
      }
    } catch (err: unknown) {
      console.error("Meta inline update failed", err);
    } finally {
      setInlineConfirm(null);
      setInlineConfirmLoading(false);
    }
  };

  const getStatusOption = (status: string | undefined): "ACTIVE" | "PAUSED" | "ARCHIVED" => {
    const u = (status ?? "").toUpperCase();
    if (u === "ACTIVE" || u === "ENABLED" || u === "ACTIVED") return "ACTIVE";
    if (u === "PAUSED" || u === "PAUSE") return "PAUSED";
    if (u === "ARCHIVED" || u === "ARCHIVE") return "ARCHIVED";
    return "PAUSED";
  };

  const statusSelectBg = (status: string | undefined) => {
    const s = getStatusOption(status);
    if (s === "ACTIVE") return "bg-emerald-50 border-emerald-200 text-[#065f46]";
    if (s === "PAUSED") return "bg-gray-100 border-gray-200 text-[#374151]";
    if (s === "ARCHIVED") return "bg-gray-100 border-gray-200 text-[#6b7280]";
    return "bg-gray-50 border-gray-200 text-[#556179]";
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
              {/* Header with Add Filter - same as Google campaign page */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  Campaigns
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCampaignPanel(true);
                      setIsFilterPanelOpen(false);
                    }}
                    className="create-entity-button btn-sm"
                  >
                    Create campaign
                  </button>
                  <button
                    type="button"
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

              {/* Filter Panel - inline, same as Google */}
              {isFilterPanelOpen && accountId && (
                <DynamicFilterPanel
                  isOpen={true}
                  onClose={() => setIsFilterPanelOpen(false)}
                  onApply={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                  }}
                  initialFilters={filters}
                  accountId={accountId ?? ""}
                  marketplace="meta"
                  entityType="campaigns"
                />
              )}

              {/* Create Campaign Panel */}
              {showCreateCampaignPanel && channelIdNum !== undefined && (
                <CreateMetaCampaignPanel
                  channelId={channelIdNum}
                  onSuccess={loadCampaigns}
                  onClose={() => setShowCreateCampaignPanel(false)}
                />
              )}

              {/* Edit Campaign Panel */}
              {editingCampaign && channelIdNum !== undefined && (
                <EditMetaCampaignPanel
                  channelId={channelIdNum}
                  campaignId={editingCampaign.campaignId}
                  initialName={editingCampaign.name}
                  initialStatus={editingCampaign.status}
                  initialDailyBudget={editingCampaign.dailyBudget}
                  onSuccess={loadCampaigns}
                  onClose={() => setEditingCampaign(null)}
                />
              )}

              {/* Performance Trends Chart - same as Google */}
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

              {/* Bulk Actions and table */}
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
                      <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
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
                            disabled={selectedCampaigns.size === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedCampaigns.size === 0) return;
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

                {/* Budget editor panel - same as Google Campaigns (Action, Unit, Value, Upper/Lower limit) */}
                {selectedCampaigns.size > 0 && showBudgetPanel && (
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
                          {selectedCampaigns.size} campaign{selectedCampaigns.size !== 1 ? "s" : ""} will be updated:{" "}
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {isBudgetChange ? "Budget" : "Status"} change
                        </span>
                      </div>
                      {selectedCampaignsFetching ? (
                        <div className="mb-6 py-8 text-center text-[12.16px] text-[#556179]">
                          Loading selected campaigns...
                        </div>
                      ) : (
                        (() => {
                          const data = getSelectedCampaignsData();
                          const preview = data.slice(0, 10);
                          const hasMore = data.length > 10;
                          return (
                            <div className="mb-6">
                              <div className="mb-2 text-[10.64px] text-[#556179]">
                                {hasMore
                                  ? `Showing ${preview.length} of ${data.length} selected campaigns`
                                  : `${data.length} campaign${data.length !== 1 ? "s" : ""} selected`}
                              </div>
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full table-fixed">
                                  <thead className="bg-[#f5f5f0]">
                                    <tr>
                                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">Campaign Name</th>
                                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">Old Value</th>
                                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">New Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {preview.map((c) => {
                                      const cid = String(c.campaign_id ?? c.id);
                                      const name = c.campaign_name ?? "—";
                                      const currentBudget = c.daily_budget != null ? Number(c.daily_budget) : 0;
                                      const oldVal = isBudgetChange
                                        ? (c.daily_budget != null ? formatCurrency(Number(c.daily_budget)) : "—")
                                        : normalizeStatusDisplay(c.status);
                                      const newVal = isBudgetChange
                                        ? formatCurrency(calculateNewBudget(currentBudget))
                                        : pendingStatusAction ? normalizeStatusDisplay(pendingStatusAction) : "—";
                                      return (
                                        <tr key={cid} className="border-b border-gray-200 last:border-b-0">
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
                            if (bulkLoading || selectedCampaignsFetching) return;
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
                          disabled={bulkLoading || selectedCampaignsFetching}
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
                        Delete campaigns?
                      </h3>
                      <p className="text-[12.16px] text-[#556179] mb-4">
                        You are about to permanently delete {selectedCampaigns.size} selected campaign
                        {selectedCampaigns.size !== 1 ? "s" : ""}. This action cannot be undone.
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

              </div>

              {/* Table card - same structure and classes as Google */}
              <div className="relative">
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
                            onClick={() => handleSort("campaign_name")}
                          >
                            <div className="flex items-center gap-1">
                              Campaign Name
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
                        {campaigns.map((row) => {
                          const cid = String(row.campaign_id ?? row.id);
                          return (
                            <tr
                              key={row.id ?? row.campaign_id}
                              className="table-row border-b border-[#e8e8e3] last:border-b-0 group"
                            >
                              <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3] py-3 px-4 w-[35px]">
                                <Checkbox
                                  checked={selectedCampaigns.has(cid)}
                                  onChange={() => handleSelectCampaign(cid)}
                                  aria-label={`Select ${row.campaign_name || cid}`}
                                />
                              </td>
                              <td className="table-cell table-sticky-first-column min-w-[300px] max-w-[400px] group-hover:bg-[#f9f9f6] py-3 px-4 text-left overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <Link
                                    to={`/brands/${accountId}/${channelId}/meta/campaigns/${row.campaign_id}`}
                                    className="table-edit-link table-text leading-[1.26] text-[#072929] block truncate flex-1 min-w-0"
                                    title={row.campaign_name || undefined}
                                  >
                                    {row.campaign_name || "—"}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setEditingCampaign({
                                        campaignId: cid,
                                        name: row.campaign_name || "",
                                        status: row.status,
                                        dailyBudget: row.daily_budget != null ? Number(row.daily_budget) : undefined,
                                      });
                                    }}
                                    className="text-[10.64px] text-[#136D6D] hover:underline shrink-0"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <select
                                  value={getStatusOption(row.status)}
                                  onChange={(e) =>
                                    handleInlineStatusChange(cid, e.target.value as "ACTIVE" | "PAUSED" | "ARCHIVED")
                                  }
                                  className={`edit-button google-table-dropdown min-w-0 ${statusSelectBg(row.status)}`}
                                  style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                                    backgroundPosition: "right 6px center",
                                  }}
                                  aria-label={`Status for ${row.campaign_name || cid}`}
                                >
                                  <option value="ACTIVE">Enabled</option>
                                  <option value="PAUSED">Paused</option>
                                  <option value="ARCHIVED">Archived</option>
                                </select>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    inlineBudgetCampaignId === cid
                                      ? inlineBudgetValue
                                      : row.daily_budget != null
                                        ? String(row.daily_budget)
                                        : ""
                                  }
                                  onFocus={() => {
                                    setInlineBudgetCampaignId(cid);
                                    setInlineBudgetValue(
                                      row.daily_budget != null ? String(row.daily_budget) : ""
                                    );
                                  }}
                                  onChange={(e) => {
                                    if (inlineBudgetCampaignId === cid) setInlineBudgetValue(e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    handleInlineBudgetBlur(cid, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  placeholder="—"
                                  className="inline-edit-input w-full min-w-[120px]"
                                  aria-label={`Budget for ${row.campaign_name || cid}`}
                                />
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {formatDate(row.start_date)}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4 text-left">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {formatDate(row.end_date)}
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
                        <Loader size="md" message="Loading campaigns..." />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination - same as Google campaign page */}
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
                      1 campaign will be updated:{" "}
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
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase w-[40%] max-w-[240px]">Campaign Name</th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">Old Value</th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">New Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200">
                            <td className="px-4 py-2 text-[10.64px] text-[#072929] truncate" title={inlineConfirm.row.campaign_name ?? undefined}>{inlineConfirm.row.campaign_name ?? "—"}</td>
                            <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                              {inlineConfirm.type === "status"
                                ? normalizeStatusDisplay(inlineConfirm.row.status)
                                : inlineConfirm.row.daily_budget != null ? formatCurrency(Number(inlineConfirm.row.daily_budget)) : "—"}
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
        </Assistant>
      </div>
    </div>
  );
};
