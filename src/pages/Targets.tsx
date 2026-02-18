import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildMarketplaceRoute } from "../utils/urlHelpers";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useDateRange } from "../contexts/DateRangeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { campaignsService, type Target } from "../services/campaigns";
import { Checkbox } from "../components/ui/Checkbox";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Dropdown } from "../components/ui/Dropdown";
import { Button } from "../components/ui";
import { type FilterValues } from "../components/filters/FilterPanel";
import { normalizeStatusDisplay } from "../utils/statusHelpers";
import { buildGroupedPayload } from "../utils/groupedPayload";
import {
  FilterSection,
  FilterSectionPanel,
} from "../components/filters/FilterSection";
import { useChartCollapse } from "../hooks/useChartCollapse";
import {
  PerformanceChart,
  type MetricConfig,
} from "../components/charts/PerformanceChart";
import { ErrorModal } from "../components/ui/ErrorModal";
import { useEditSummaryModal } from "../hooks/useEditSummaryModal";
import { formatMoneyForEditSummary } from "../utils/editSummary";
import { Loader } from "../components/ui/Loader";

export const Targets: React.FC = () => {
  const { showEditSummary, EditSummaryModal: EditSummaryModalOutlet } =
    useEditSummaryModal();
  const navigate = useNavigate();
  const { accountId, channelId } = useParams<{ accountId: string; channelId?: string }>();
  const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
  const { sidebarWidth } = useSidebar();
  const [targets, setTargets] = useState<Target[]>([]);
  const [summary, setSummary] = useState<{
    total_targets: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
  } | null>(null);
  const [chartDataFromApi, setChartDataFromApi] = useState<
    Array<{
      date: string;
      spend: number;
      sales: number;
      sales1d?: number;
      sales7d?: number;
      sales14d?: number;
      impressions?: number;
      clicks?: number;
      acos?: number;
      roas?: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedTargets, setSelectedTargets] = useState<Set<string | number>>(
    new Set()
  );
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    sales1d: false,
    sales7d: false,
    sales14d: false,
    impressions: false,
    clicks: false,
    acos: false,
    roas: false,
  });

  // Chart collapse state with localStorage persistence
  const [isChartCollapsed, toggleChartCollapse] = useChartCollapse(
    "targets-chart-collapsed"
  );

  const targetMetrics: MetricConfig[] = [
    { key: "sales", label: "Sales", color: "#136D6D" },
    { key: "spend", label: "Spend", color: "#506766" },
    { key: "sales1d", label: "Sales 1D", color: "#0D9488" },
    { key: "sales7d", label: "Sales 7D", color: "#14B8A6" },
    { key: "sales14d", label: "Sales 14D", color: "#2DD4BF" },
    { key: "impressions", label: "Impressions", color: "#7C3AED" },
    { key: "clicks", label: "Clicks", color: "#169aa3" },
    {
      key: "ctr",
      label: "CTR",
      color: "#8B5CF6",
      tooltipFormatter: (v) => `${v.toFixed(2)}%`,
    },
    {
      key: "cpc",
      label: "CPC",
      color: "#F59E0B",
      tooltipFormatter: (v) => `$${v.toFixed(2)}`,
    },
    {
      key: "cpm",
      label: "CPM",
      color: "#EF4444",
      tooltipFormatter: (v) => `$${v.toFixed(2)}`,
    },
    {
      key: "acos",
      label: "ACOS",
      color: "#DC2626",
      tooltipFormatter: (v) => `${v.toFixed(2)}%`,
    },
    {
      key: "roas",
      label: "ROAS",
      color: "#059669",
      tooltipFormatter: (v) => `${v.toFixed(2)}`,
    },
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastRequestParamsRef = useRef<string>("");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });

  // Profile filter: derive profileId from filters (same as other filters; no URL sync)
  const profileId = useMemo(() => {
    const f = filters.find((x) => x.field === "profile_name");
    if (!f || f.value == null || f.value === "") return null;
    const v = Array.isArray(f.value)
      ? f.value.length === 1
        ? f.value[0]
        : null
      : f.value;
    if (v == null || v === "" || String(v).toLowerCase() === "false")
      return null;
    return String(v);
  }, [filters]);

  // Bulk actions state
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBidPanel, setShowBidPanel] = useState(false);
  const [bidAction, setBidAction] = useState<"increase" | "decrease" | "set">(
    "increase"
  );
  const [bidUnit, setBidUnit] = useState<"percent" | "amount">("percent");
  const [bidValue, setBidValue] = useState<string>("");
  const [upperLimit, setUpperLimit] = useState<string>("");
  const [lowerLimit, setLowerLimit] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "enable" | "pause" | "archive" | null
  >(null);
  const [isBidChange, setIsBidChange] = useState(false);
  const [selectedTargetsFetched, setSelectedTargetsFetched] = useState<Target[] | null>(null);
  const [selectedTargetsFetching, setSelectedTargetsFetching] = useState(false);

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    targetId: string | number;
    field: "bid" | "status";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditTarget, setInlineEditTarget] = useState<Target | null>(null);
  const [inlineEditField, setInlineEditField] = useState<
    "bid" | "status" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");

  const toggleChartMetric = (key: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Set page title
  useEffect(() => {
    setPageTitle("Targets");
    return () => {
      resetPageTitle();
    };
  }, []);

  useEffect(() => {
    // Create a unique key for this request based on all dependencies
    const requestKey = JSON.stringify({
      accountId,
      currentPage,
      itemsPerPage,
      sortBy,
      sortOrder,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      filters,
    });

    // Skip if this is the same request as the last one
    if (requestKey === lastRequestParamsRef.current) {
      return;
    }

    // Cancel any pending request when dependencies change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    // Update the last request params
    lastRequestParamsRef.current = requestKey;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadTargets(accountIdNum);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    // Cleanup function to cancel request if component unmounts or dependencies change
    return () => {
      if (currentController) {
        currentController.abort();
      }
      loadingRef.current = false;
    };
  }, [
    accountId,
    currentPage,
    itemsPerPage,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    filters,
  ]);

  useEffect(() => {
    if (
      !showConfirmationModal ||
      selectedTargets.size === 0 ||
      !accountId ||
      !channelId
    ) {
      setSelectedTargetsFetched(null);
      return;
    }
    const ids = Array.from(selectedTargets);
    let cancelled = false;
    setSelectedTargetsFetching(true);
    campaignsService
      .getTargetsByIds(
        parseInt(accountId, 10),
        ids,
        channelId ? parseInt(channelId, 10) : null
      )
      .then((res) => {
        if (!cancelled && res?.targets) {
          setSelectedTargetsFetched(res.targets);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedTargetsFetched(null);
      })
      .finally(() => {
        if (!cancelled) setSelectedTargetsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showConfirmationModal, selectedTargets, accountId, channelId]);

  const buildFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    filterList.forEach((filter) => {
      if (filter.field === "name") {
        if (filter.operator === "contains") {
          params.name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.name = filter.value;
        }
      } else if (filter.field === "bid") {
        if (filter.operator === "lt") {
          params.bid__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.bid__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.bid = filter.value;
        } else if (filter.operator === "lte") {
          params.bid__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.bid__gte = filter.value;
        }
      } else if (filter.field === "state") {
        // Convert frontend display value to backend expected value
        const stateMap: Record<string, string> = {
          Enabled: "enabled",
          Paused: "paused",
          Archived: "archived",
        };
        params.state = stateMap[filter.value as string] || filter.value;
      } else if (filter.field === "type") {
        // Type filter can be array from multi-select; backend expects single value (SP/SB/SD)
        const v = filter.value;
        params.type = Array.isArray(v) ? v[0] : v;
      } else if (filter.field === "campaign_name") {
        if (filter.operator === "contains") {
          params.campaign_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.campaign_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.campaign_name = filter.value;
        }
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      } else if (filter.field === "profile_name") {
        if (filter.operator === "contains") {
          params.profile_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.profile_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.profile_name = filter.value;
        }
      } else if (filter.field === "spends") {
        if (filter.operator === "lt") {
          params.spends__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.spends__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.spends = filter.value;
        } else if (filter.operator === "lte") {
          params.spends__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.spends__gte = filter.value;
        }
      } else if (filter.field === "sales") {
        if (filter.operator === "lt") {
          params.sales__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.sales__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.sales = filter.value;
        } else if (filter.operator === "lte") {
          params.sales__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.sales__gte = filter.value;
        }
      } else if (filter.field === "ctr") {
        if (filter.operator === "lt") {
          params.ctr__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.ctr__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.ctr = filter.value;
        } else if (filter.operator === "lte") {
          params.ctr__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.ctr__gte = filter.value;
        }
      }
    });

    return params;
  };

  const handleExport = async (exportType: "all_data" | "current_view") => {
    if (!accountId) return;

    // Keep dropdown open and show loading
    setShowExportDropdown(true);
    setExportLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Build params from current filters, sorting, and pagination
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDateStr,
        end_date: endDateStr,
        ...buildFilterParams(filters),
      };

      // Add pagination for current_view
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      // Call export API
      const result = await campaignsService.exportTargets(
        accountIdNum,
        { ...params, export_type: exportType },
        channelId ?? null,
        profileId ?? null
      );

      // Automatically download the file
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Close dropdown after a short delay to show success
      setTimeout(() => {
        setShowExportDropdown(false);
      }, 500);
    } catch (error: any) {
      console.error("Failed to export targets:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export targets. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  const loadTargets = async (accountId: number) => {
    // Prevent duplicate simultaneous requests
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);

      console.log("Targets - Date range:", {
        startDate: startDateStr,
        endDate: endDateStr,
      });

      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        page: currentPage,
        page_size: itemsPerPage,
        start_date: startDateStr,
        end_date: endDateStr,
        ...buildFilterParams(filters),
      };

      const response = await campaignsService.getTargetsList(
        accountId,
        params,
        channelId ?? null,
        profileId ?? null
      );

      console.log(
        "Targets - Chart data received:",
        response.chart_data?.length || 0,
        "points"
      );

      setTargets(Array.isArray(response.targets) ? response.targets : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
        console.log(
          "Targets - Chart data dates:",
          response.chart_data.map((d: any) => d.date)
        );
      }
    } catch (error) {
      console.error("Failed to load targets:", error);
      setTargets([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadTargetsWithFilters = async (
    accountId: number,
    filterList: FilterValues
  ) => {
    // Prevent duplicate simultaneous requests
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        page: 1, // Always reset to first page when applying filters
        page_size: itemsPerPage,
        start_date: startDateStr,
        end_date: endDateStr,
        ...buildFilterParams(filterList),
      };

      const response = await campaignsService.getTargetsList(
        accountId,
        params,
        channelId ?? null,
        profileId ?? null
      );
      setTargets(Array.isArray(response.targets) ? response.targets : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
      }
    } catch (error) {
      console.error("Failed to load targets:", error);
      setTargets([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
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
        className="w-4 h-4 ml-1 text-[#556179]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
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
        className="w-4 h-4 ml-1 text-[#556179]"
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
    );
  };

  // Inline edit handlers
  const startInlineEdit = (target: Target, field: "bid" | "status") => {
    setEditingCell({ targetId: target.targetId || target.id, field });
    if (field === "bid") {
      // Extract numeric value from formatted string
      const bidValue = parseFloat(
        (typeof target.bid === "number" ? String(target.bid) : (target.bid || "$0.00")).replace(/[^0-9.]/g, "")
      );
      setEditedValue(bidValue.toString());
    } else if (field === "status") {
      // Normalize status to match dropdown options
      const statusLower = (target.status || "Enabled").toLowerCase();
      const normalizedStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "Enabled"
          : statusLower === "paused"
            ? "Paused"
            : statusLower === "archived"
              ? "Archived"
              : "Enabled";
      setEditedValue(normalizedStatus);
    }
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setEditedValue("");
  };

  const handleInlineEditChange = (value: string) => {
    setEditedValue(value);
  };

  const confirmInlineEdit = (newValueOverride?: string, targetIdOverride?: string | number, fieldOverride?: "bid" | "status") => {
    // Use override parameters if provided, otherwise fall back to editingCell state
    const targetIdToUse = targetIdOverride || editingCell?.targetId;
    const fieldToUse = fieldOverride || editingCell?.field;

    if (!targetIdToUse || !fieldToUse || !accountId) return;

    const target = targets.find(
      (t) => String(t.targetId || t.id) === String(targetIdToUse)
    );
    if (!target) return;

    // Use override value if provided, otherwise use state
    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;

    // Check if value actually changed
    let hasChanged = false;
    if (fieldToUse === "bid") {
      // Parse the new value, handling empty strings
      const newBidStr = valueToCheck.trim();
      const newBid = newBidStr === "" ? 0 : parseFloat(newBidStr);
      const oldBid = parseFloat(
        (typeof target.bid === "number" ? String(target.bid) : (target.bid || "$0.00")).replace(/[^0-9.]/g, "")
      );

      // Check if the value is a valid number and if it changed
      if (isNaN(newBid)) {
        // Invalid number, cancel edit
        cancelInlineEdit();
        return;
      }
      hasChanged = Math.abs(newBid - oldBid) > 0.01;
    } else if (fieldToUse === "status") {
      // Normalize status values for comparison
      const oldValue = (target.status || "Enabled").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    }

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    let oldValue = "";
    let newValue = valueToCheck;

    if (fieldToUse === "bid") {
      const currency = target.profile_currency_code;
      const bidNum =
        typeof target.bid === "number"
          ? target.bid
          : parseFloat((typeof target.bid === "number" ? String(target.bid) : (target.bid || "$0.00")).replace(/[^0-9.]/g, ""));
      oldValue = formatCurrency(bidNum, currency);
      newValue = formatCurrency(parseFloat(valueToCheck) || 0, currency);
    } else if (fieldToUse === "status") {
      oldValue = target.status || "Enabled";
      newValue = valueToCheck;
    }

    setInlineEditTarget(target);
    setInlineEditField(fieldToUse);
    setInlineEditOldValue(oldValue);
    setInlineEditNewValue(newValue);
    setShowInlineEditModal(true);
    setEditingCell(null);
  };

  const runInlineEdit = async () => {
    if (!inlineEditTarget || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) throw new Error("Invalid account ID");

      const payload = buildGroupedPayload([
        {
          entityId: inlineEditTarget.targetId ?? inlineEditTarget.id,
          profile_id: inlineEditTarget.profile_id ?? (inlineEditTarget as { profileId?: string }).profileId,
          type: getTargetCampaignType(inlineEditTarget),
        },
      ]);
      if (Object.keys(payload).length === 0) throw new Error("Missing profile_id or targetId");

      if (inlineEditField === "status") {
        const statusMap: Record<string, "enable" | "pause" | "archive"> = {
          Enabled: "enable",
          Paused: "pause",
          Archived: "archive",
        };
        const statusValue = statusMap[inlineEditNewValue] || "enable";
        await campaignsService.bulkUpdateTargets(
          accountIdNum,
          { payload, action: "status", status: statusValue },
          channelId ?? null
        );
      } else if (inlineEditField === "bid") {
        const bidVal = parseFloat(inlineEditNewValue.replace(/[^0-9.]/g, ""));
        if (isNaN(bidVal)) throw new Error("Invalid bid value");
        await campaignsService.bulkUpdateTargets(
          accountIdNum,
          { payload, action: "bid", bid: bidVal },
          channelId ?? null
        );
      }

      const field = inlineEditField;
      const oldValue = inlineEditOldValue;
      const newValue = inlineEditNewValue;
      const isStatusField = field === "status";
      const displayOld = isStatusField ? normalizeStatusDisplay(oldValue) : oldValue;
      const displayNew = isStatusField ? normalizeStatusDisplay(newValue) : newValue;

      setShowInlineEditModal(false);
      setInlineEditTarget(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");

      showEditSummary({
        entityType: "target",
        action: "updated",
        mode: "inline",
        succeededCount: 1,
        entityName: inlineEditTarget.name || "Target",
        field,
        oldValue: displayOld,
        newValue: displayNew,
      });

      await loadTargets(accountIdNum);
    } catch (error: any) {
      console.error("Error updating target:", error);
      setErrorModal({
        isOpen: true,
        message: error?.response?.data?.error ?? error?.message ?? "Failed to update target. Please try again.",
      });
    } finally {
      setInlineEditLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowBulkActions(false);
      }
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    if (showBulkActions || showExportDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActions, showExportDropdown]);

  // Cancel inline edit when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingCell && !showInlineEditModal) {
        const target = event.target as HTMLElement;
        const isDropdownMenu =
          target.closest('[class*="z-50"]') ||
          target.closest('[class*="shadow-lg"]') ||
          target.closest('button[type="button"]');
        const isInput = target.closest("input");
        const isModal = target.closest('[class*="fixed"]');

        if (!isInput && !isDropdownMenu && !isModal) {
          setTimeout(() => {
            if (editingCell && !showInlineEditModal) {
              cancelInlineEdit();
            }
          }, 150);
        }
      }
    };

    if (editingCell && !showInlineEditModal) {
      const timeout = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 200);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [editingCell, showInlineEditModal]);

  const formatCurrency = (value: string | number, currency?: string) => {
    const numValue =
      typeof value === "string"
        ? parseFloat(value.replace(/[^0-9.-]+/g, ""))
        : Number(value);
    const code = currency?.trim() ? currency.trim().toUpperCase() : "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue || 0);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Bulk action handlers
  const runBulkStatus = async (statusValue: "enable" | "pause" | "archive") => {
    if (!accountId || selectedTargets.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      const selectedTargetsData = getSelectedTargetsData();
      const payload = buildGroupedPayload(
        selectedTargetsData.map((t) => ({
          entityId: t.targetId ?? t.id,
          profile_id: t.profile_id ?? (t as { profileId?: string }).profileId,
          type: getTargetCampaignType(t),
        }))
      );
      if (Object.keys(payload).length === 0) {
        setBulkLoading(false);
        return;
      }

      const res = await campaignsService.bulkUpdateTargets(
        accountIdNum,
        {
          payload,
          action: statusValue === "archive" ? "archive" : "status",
          status: statusValue,
        },
        channelId ?? null
      );
      const succeededCount = res?.updated ?? 0;
      const failedCount = res?.failed ?? 0;
      const targetMap = new Map(
        selectedTargetsData.map((t) => [String(t.targetId ?? t.id), t])
      );
      const succeededItems = parseSucceededItemsFromResponse(res, targetMap).slice(0, 10);

      await loadTargets(accountIdNum);
      setSelectedTargets(new Set());
      setShowConfirmationModal(false);
      setPendingStatusAction(null);
      setSelectedTargetsFetched(null);
      const action = statusValue === "archive" ? "archived" : "updated";
      showEditSummary({
        entityType: "target",
        action,
        mode: "bulk",
        succeededCount,
        failedCount: failedCount > 0 ? failedCount : undefined,
        succeededItems,
        details: (res?.errors as Array<{ targetId?: string; targetName?: string; error?: string }> | undefined)
          ?.slice(0, 5)
          .map((e) => ({
            label: e.targetName ? `${e.targetName} (${e.targetId ?? "—"})` : `Target ${e.targetId ?? "—"}`,
            value: e.error ?? "Unknown error",
          })),
      });
    } catch (error: any) {
      console.error("Failed to update targets", error);
      setErrorModal({
        isOpen: true,
        message: error?.response?.data?.error ?? error?.message ?? "Failed to update targets. Please try again.",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkBid = async () => {
    if (!accountId || selectedTargets.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(bidValue);
    if (isNaN(valueNum)) return;

    try {
      setBulkLoading(true);
      const selectedTargetsData = getSelectedTargetsData();
      const bids: Array<{ targetId: string | number; bid: number }> = [];
      for (const target of selectedTargetsData) {
        const tid = target.targetId || target.id;
        bids.push({ targetId: tid, bid: computeNewBidForTarget(target) });
      }

      const payload = buildGroupedPayload(
        selectedTargetsData.map((t) => ({
          entityId: t.targetId ?? t.id,
          profile_id: t.profile_id ?? (t as { profileId?: string }).profileId,
          type: getTargetCampaignType(t),
        }))
      );
      if (Object.keys(payload).length === 0) {
        setBulkLoading(false);
        return;
      }

      const res = await campaignsService.bulkUpdateTargets(
        accountIdNum,
        { payload, action: "bid", bids },
        channelId ?? null
      );
      const succeededCount = res?.updated ?? 0;
      const failedCount = res?.failed ?? 0;
      const targetMap = new Map(
        selectedTargetsData.map((t) => [String(t.targetId ?? t.id), t])
      );
      const succeededItems = parseSucceededItemsFromResponse(res, targetMap).slice(0, 10);

      await loadTargets(accountIdNum);
      setSelectedTargets(new Set());
      setShowConfirmationModal(false);
      setShowBidPanel(false);
      setBidValue("");
      setUpperLimit("");
      setLowerLimit("");
      setSelectedTargetsFetched(null);
      showEditSummary({
        entityType: "target",
        action: "updated",
        mode: "bulk",
        succeededCount,
        failedCount: failedCount > 0 ? failedCount : undefined,
        succeededItems,
        details: (res?.errors as Array<{ targetId?: string; targetName?: string; error?: string }> | undefined)
          ?.slice(0, 5)
          .map((e) => ({
            label: e.targetName ? `${e.targetName} (${e.targetId ?? "—"})` : `Target ${e.targetId ?? "—"}`,
            value: e.error ?? "Unknown error",
          })),
      });
    } catch (error: any) {
      console.error("Failed to update targets", error);
      setErrorModal({
        isOpen: true,
        message: error?.response?.data?.error ?? error?.message ?? "Failed to update targets. Please try again.",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getTargetCampaignType = (t: Target): "SP" | "SB" | "SD" => {
    const typ = t.type ?? "SP";
    return (String(typ).toUpperCase() === "SB" ? "SB" : String(typ).toUpperCase() === "SD" ? "SD" : "SP") as "SP" | "SB" | "SD";
  };

  const parseSucceededItemsFromResponse = (
    response: {
      successes?: Array<{
        targetId?: string | number;
        targetName?: string;
        field?: string;
        oldValue?: string;
        newValue?: string;
      }>;
    },
    targetMap?: Map<string, Target>
  ): Array<{ label: string; field: string; oldValue: string; newValue: string }> => {
    const successes = response?.successes ?? [];
    const items: Array<{ label: string; field: string; oldValue: string; newValue: string }> = [];
    const isStatusField = (f: string) =>
      (f ?? "").toLowerCase() === "state" || (f ?? "").toLowerCase() === "status";

    const isBidField = (f: string) =>
      (f ?? "").toLowerCase() === "bid" || (f ?? "").toLowerCase() === "default_bid";
    for (const s of successes) {
      const id = String(s.targetId ?? "");
      const fromBackend = s.field != null && (s.oldValue != null || s.newValue != null);
      const fieldVal = s.field ?? "—";
      const oldVal = s.oldValue ?? "—";
      const newVal = s.newValue ?? "—";
      const tgt = targetMap?.get(id);
      const currency = tgt?.profile_currency_code;
      let normOld = isStatusField(fieldVal) ? normalizeStatusDisplay(oldVal) : oldVal;
      let normNew = isStatusField(fieldVal) ? normalizeStatusDisplay(newVal) : newVal;
      if (isBidField(fieldVal)) {
        normOld = formatMoneyForEditSummary(oldVal, currency) || normOld;
        normNew = formatMoneyForEditSummary(newVal, currency) || normNew;
      }
      if (fromBackend) {
        items.push({
          label: s.targetName ?? `Target ${id}`,
          field: fieldVal,
          oldValue: normOld,
          newValue: normNew,
        });
      } else if (targetMap) {
        const name = tgt?.name ?? `Target ${id}`;
        items.push({
          label: name,
          field: fieldVal,
          oldValue: normOld,
          newValue: normNew,
        });
      }
    }
    return items;
  };

  const getSelectedTargetsData = (): Target[] => {
    if (selectedTargetsFetched && selectedTargetsFetched.length > 0) {
      return selectedTargetsFetched;
    }
    return targets.filter((t) => selectedTargets.has(t.targetId || t.id));
  };

  /** Parse current bid from target (handles string "USD 1", number, etc.). */
  const parseTargetBid = (target: Target): number => {
    const raw = typeof target.bid === "number" ? String(target.bid) : (target.bid || "0");
    return parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0;
  };

  /** Compute new bid for a target using Action, Unit, Value, and optional Upper/Lower limits. */
  const computeNewBidForTarget = (target: Target): number => {
    const currentBid = parseTargetBid(target);
    const valueNum = parseFloat(bidValue);
    if (isNaN(valueNum)) return currentBid;

    let newBid = currentBid;
    if (bidAction === "set") {
      newBid = valueNum;
    } else if (bidAction === "increase") {
      newBid = bidUnit === "percent"
        ? currentBid * (1 + valueNum / 100)
        : currentBid + valueNum;
    } else if (bidAction === "decrease") {
      newBid = bidUnit === "percent"
        ? currentBid * (1 - valueNum / 100)
        : currentBid - valueNum;
    }

    if (upperLimit) {
      const upper = parseFloat(upperLimit);
      if (!isNaN(upper)) newBid = Math.min(newBid, upper);
    }
    if (lowerLimit) {
      const lower = parseFloat(lowerLimit);
      if (!isNaN(lower)) newBid = Math.max(newBid, lower);
    }
    newBid = Math.max(newBid, 0);
    return Math.round(newBid * 100) / 100;
  };

  // Generate chart data based on targets and date range
  const chartData = useMemo(() => {
    // Use chart data from API if available, otherwise generate from targets
    if (chartDataFromApi.length > 0) {
      return chartDataFromApi.map((item) => ({
        date: item.date,
        sales: item.sales,
        spend: item.spend,
        sales1d: item.sales1d || 0,
        sales7d: item.sales7d || 0,
        sales14d: item.sales14d || 0,
        impressions: item.impressions || 0,
        clicks: item.clicks || 0,
        acos: item.acos || 0,
        roas: item.roas || 0,
      }));
    }

    // Return empty array if no data from API - don't generate fake data
    return [];
  }, [chartDataFromApi]);

  const selectableTargets = targets.filter(
    (t) => (t.status ?? "").toLowerCase() !== "archived"
  );
  const allSelected =
    selectableTargets.length > 0 &&
    selectableTargets.every((t) =>
      selectedTargets.has(t.targetId || t.id)
    );
  const someSelected =
    selectableTargets.some((t) =>
      selectedTargets.has(t.targetId || t.id)
    ) && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(
        selectableTargets.map((t) => t.targetId || t.id)
      );
      setSelectedTargets(allIds);
    } else {
      setSelectedTargets(new Set());
    }
  };

  // Define filter fields for Targets
  const TARGET_FILTER_FIELDS = [
    { value: "name", label: "Target Name" },
    { value: "state", label: "State" },
    { value: "bid", label: "Bid" },
    { value: "adgroup_name", label: "Ad Group Name" },
    { value: "campaign_name", label: "Campaign Name" },
    { value: "profile_name", label: "Profile" },
    { value: "type", label: "Type" },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Export Loading Overlay */}
      {exportLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[300]">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4 min-w-[280px]">
            <Loader size="lg" message="Exporting Targets..." />
            <p className="text-[13px] text-[#556179] text-center">
              Please wait while we prepare your file
            </p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
        message={errorModal.message}
      />

      <EditSummaryModalOutlet />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 min-w-0 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
          <div className="space-y-6">
            {/* Header with Filter Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                Targets
              </h1>
              <FilterSection
                isOpen={isFilterPanelOpen}
                onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                filters={filters}
                onApply={() => { }} // Not used - FilterSectionPanel handles onApply
                filterFields={TARGET_FILTER_FIELDS}
                initialFilters={filters}
              />
            </div>

            {/* Filter Panel - Rendered outside header to maintain button position */}
            <FilterSectionPanel
              isOpen={isFilterPanelOpen}
              onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              filters={filters}
              onApply={(newFilters) => {
                setFilters(newFilters);
                setCurrentPage(1); // Reset to first page when applying filters
              }}
              filterFields={TARGET_FILTER_FIELDS}
              initialFilters={filters}
              accountId={accountId}
              channelType="amazon"
            />

            {/* Chart Section */}
            <div className="relative">
              <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={toggleChartMetric}
                metrics={targetMetrics}
                title="Performance Trends"
                isCollapsed={isChartCollapsed}
                onCollapseToggle={toggleChartCollapse}
              />
              {/* Loading overlay for chart */}
              {loading && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <Loader size="md" message="Loading chart data..." />
                  </div>
                </div>
              )}
            </div>

            {/* Targets Table Card */}
            {/* Table Header */}
            <div className="flex items-center justify-end gap-2">
              <div
                className="relative inline-flex justify-end"
                ref={dropdownRef}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBulkActions((prev) => !prev);
                    setShowBidPanel(false);
                    setShowExportDropdown(false);
                  }}
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
                </Button>
                {showBulkActions && (
                  <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                    <div className="overflow-y-auto">
                      {[
                        { value: "enable", label: "Enabled" },
                        { value: "pause", label: "Paused" },
                        { value: "archive", label: "Archived" },
                        { value: "edit_bid", label: "Edit Bid" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedTargets.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedTargets.size === 0) return;
                            if (opt.value === "edit_bid") {
                              setShowBidPanel(true);
                            } else {
                              setShowBidPanel(false);
                              setPendingStatusAction(
                                opt.value as "enable" | "pause" | "archive"
                              );
                              setIsBidChange(false);
                              setShowConfirmationModal(true);
                            }
                            setShowBulkActions(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="relative inline-flex justify-end"
                ref={exportDropdownRef}
              >
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    className="edit-button"
                    onClick={(e) => {
                      if (exportLoading) return;
                      e.stopPropagation();
                      setShowExportDropdown((prev) => !prev);
                      setShowBulkActions(false);
                      setShowBidPanel(false);
                    }}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <Loader size="sm" showMessage={false} />
                    ) : (
                      <>
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
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-[10.64px] text-[#072929] font-normal">
                          Export
                        </span>
                      </>
                    )}
                  </Button>
                </div>
                {(showExportDropdown || exportLoading) && (
                  <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-[#E3E3E3] rounded-[12px] shadow-lg z-[100] pointer-events-auto overflow-hidden">
                    {exportLoading ? (
                      <div className="px-3 py-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                        <Loader size="md" message="Exporting..." />
                        <p className="text-[11px] text-[#556179] text-center px-2">
                          Please wait while we prepare your file
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto">
                        {[
                          { value: "bulk_export", label: "Export All" },
                          {
                            value: "current_view",
                            label: "Export Current View",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3"
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const exportType =
                                opt.value === "bulk_export"
                                  ? "all_data"
                                  : "current_view";
                              // Keep dropdown open during export
                              await handleExport(exportType);
                            }}
                            disabled={exportLoading}
                          >
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  width="20"
                                  height="20"
                                  rx="3.2"
                                  fill="#072929"
                                />
                                <path
                                  d="M15 11.2V9.1942C15 8.7034 15 8.4586 14.9145 8.2378C14.829 8.0176 14.6664 7.8436 14.3407 7.4968L11.6768 4.6552C11.3961 4.3558 11.256 4.2064 11.0816 4.1176C11.0455 4.09911 11.0085 4.08269 10.9708 4.0684C10.7891 4 10.5906 4 10.194 4C8.36869 4 7.45575 4 6.83756 4.5316C6.71274 4.63896 6.59903 4.76025 6.49838 4.8934C6 5.554 6 6.5266 6 8.4736V11.2C6 13.4626 6 14.5942 6.65925 15.2968C7.3185 15.9994 8.37881 16 10.5 16M11.0625 4.3V4.6C11.0625 6.2968 11.0625 7.1458 11.5569 7.6726C12.0508 8.2 12.8467 8.2 14.4375 8.2H14.7188M13.3125 16C13.6539 15.646 15 14.704 15 14.2C15 13.696 13.6539 12.754 13.3125 12.4M14.4375 14.2H10.5"
                                  stroke="#F9F9F6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                            <span className="font-normal">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bid editor panel */}
            {selectedTargets.size > 0 && showBidPanel && (
              <div className="mb-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
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
                        value={bidAction}
                        onChange={(val) => {
                          const action = val as typeof bidAction;
                          setBidAction(action);
                          // When "Set To" is selected, automatically use $ (amount)
                          if (action === "set") {
                            setBidUnit("amount");
                          }
                        }}
                        buttonClassName="w-full bg-[#FEFEFB] edit-button"
                        width="w-full"
                      />
                    </div>
                    {(bidAction === "increase" || bidAction === "decrease") && (
                      <div className="w-[140px]">
                        <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                          Unit
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "percent"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-100"
                              }`}
                            onClick={() => setBidUnit("percent")}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "amount"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-100"
                              }`}
                            onClick={() => setBidUnit("amount")}
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
                          value={bidValue}
                          onChange={(e) => setBidValue(e.target.value)}
                          className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                          {bidUnit === "percent" ? "%" : "$"}
                        </span>
                      </div>
                    </div>
                    {bidAction === "increase" && (
                      <div className="w-[160px]">
                        <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                          Upper Limit (optional)
                        </label>
                        <input
                          type="number"
                          value={upperLimit}
                          onChange={(e) => setUpperLimit(e.target.value)}
                          className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                      </div>
                    )}
                    {bidAction === "decrease" && (
                      <div className="w-[160px]">
                        <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                          Lower Limit (optional)
                        </label>
                        <input
                          type="number"
                          value={lowerLimit}
                          onChange={(e) => setLowerLimit(e.target.value)}
                          className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBidPanel(false);
                          setShowBulkActions(false);
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!bidValue) return;
                          setIsBidChange(true);
                          setPendingStatusAction(null);
                          setShowConfirmationModal(true);
                        }}
                        disabled={bulkLoading || !bidValue}
                        className="create-entity-button btn-sm font-semibold"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmationModal && (
              <div
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowConfirmationModal(false);
                  }
                }}
              >
                <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative">
                  {(bulkLoading || selectedTargetsFetching) && (
                    <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
                      <Loader
                        size="md"
                        message={
                          selectedTargetsFetching
                            ? "Loading selected targets..."
                            : "Updating targets..."
                        }
                      />
                    </div>
                  )}
                  <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                    {isBidChange
                      ? "Confirm Bid Changes"
                      : "Confirm Status Changes"}
                  </h3>

                  {/* Summary */}
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.16px] text-[#556179]">
                        {selectedTargets.size} target
                        {selectedTargets.size !== 1 ? "s" : ""} will be updated:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {isBidChange ? "Bid" : "Status"} change
                      </span>
                    </div>
                  </div>

                  {/* Target Preview Table */}
                  {(() => {
                    const selectedTargetsData = getSelectedTargetsData();
                    const previewCount = Math.min(
                      10,
                      selectedTargetsData.length
                    );
                    const hasMore = selectedTargetsData.length > 10;

                    return (
                      <div className="mb-6">
                        <div className="mb-2">
                          <span className="text-[10.64px] text-[#556179]">
                            {hasMore
                              ? `Showing ${previewCount} of ${selectedTargetsData.length} selected targets`
                              : `${selectedTargetsData.length} target${selectedTargetsData.length !== 1 ? "s" : ""
                              } selected`}
                          </span>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-sandstorm-s20">
                              <tr>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Target Name
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Current {isBidChange ? "Bid" : "Status"}
                                </th>
                                {isBidChange ? (
                                  <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                    New Bid
                                  </th>
                                ) : (
                                  <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                    New Status
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTargetsData
                                .slice(0, previewCount)
                                .map((target) => (
                                  <tr
                                    key={target.id}
                                    className="border-b border-gray-200"
                                  >
                                    <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                      {target.name || "Unnamed Target"}
                                    </td>
                                    <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                      {isBidChange
                                        ? formatCurrency(parseTargetBid(target), target.profile_currency_code)
                                        : (target.status || "Enabled")}
                                    </td>
                                    {isBidChange ? (
                                      <td className="px-4 py-2 text-[10.64px] text-[#072929] font-medium">
                                        {formatCurrency(computeNewBidForTarget(target), target.profile_currency_code)}
                                      </td>
                                    ) : (
                                      <td className="px-4 py-2 text-[10.64px] text-[#072929] font-medium">
                                        {pendingStatusAction
                                          ? normalizeStatusDisplay(pendingStatusAction)
                                          : "—"}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowConfirmationModal(false);
                        setPendingStatusAction(null);
                        setIsBidChange(false);
                        setSelectedTargetsFetched(null);
                      }}
                      disabled={bulkLoading || selectedTargetsFetching}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (isBidChange) {
                          runBulkBid();
                        } else if (pendingStatusAction) {
                          runBulkStatus(pendingStatusAction);
                        }
                      }}
                      disabled={bulkLoading || selectedTargetsFetching}
                      className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0e5a5a] disabled:opacity-50"
                    >
                      {selectedTargetsFetching
                        ? "Loading..."
                        : bulkLoading
                          ? "Updating..."
                          : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full relative">
              <div className="overflow-x-auto w-full">
                {targets.length === 0 && !loading ? (
                  <div className="text-center py-8">
                    <p className="text-[13.3px] text-[#556179] mb-4">
                      No targets found
                    </p>
                  </div>
                ) : (
                  <table className="min-w-[1430px] w-full">
                    <thead>
                      <tr className="border-b border-[#e8e8e3]">
                        {/* Checkbox Header */}
                        <th className="table-header w-[35px]">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={allSelected}
                              indeterminate={someSelected && !allSelected}
                              onChange={handleSelectAll}
                              size="small"
                            />
                          </div>
                        </th>

                        {/* Target Name */}
                        <th
                          className="table-header min-w-[310px] max-w-[430px]"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Target Name
                            {getSortIcon("name")}
                          </div>
                        </th>

                        {/* State */}
                        <th
                          className={`table-header min-w-[115px]`}
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center gap-1">
                            State
                            {getSortIcon("status")}
                          </div>
                        </th>

                        {/* Bid */}
                        <th
                          className="table-header min-w-[130px]"
                          onClick={() => handleSort("bid")}
                        >
                          <div className="flex items-center gap-1">
                            Bid
                            {getSortIcon("bid")}
                          </div>
                        </th>

                        {/* Ad Group Name */}
                        <th
                          className={`table-header min-w-[150px] max-w-[200px]`}
                          onClick={() => handleSort("adgroup_name")}
                        >
                          <div className="flex items-center gap-1">
                            Ad Group Name
                            {getSortIcon("adgroup_name")}
                          </div>
                        </th>

                        {/* Campaign Name */}
                        <th className="table-header min-w-[150px] max-w-[200px]">
                          Campaign Name
                        </th>

                        {/* Profile */}
                        <th className="table-header">Profile</th>

                        {/* Country */}
                        <th className="table-header min-w-[100px]">Country</th>

                        {/* Currency */}
                        <th className="table-header min-w-[80px]">Currency</th>

                        {/* Type */}
                        <th
                          className="table-header min-w-[70px]"
                          onClick={() => handleSort("type")}
                        >
                          <div className="flex items-center gap-1">
                            Type
                            {getSortIcon("type")}
                          </div>
                        </th>

                        {/* Spends */}
                        <th
                          className="table-header"
                          onClick={() => handleSort("spends")}
                        >
                          <div className="flex items-center gap-1">
                            Spends
                            {getSortIcon("spends")}
                          </div>
                        </th>

                        {/* Sales */}
                        <th
                          className="table-header"
                          onClick={() => handleSort("sales")}
                        >
                          <div className="flex items-center gap-1">
                            Sales
                            {getSortIcon("sales")}
                          </div>
                        </th>

                        {/* Impressions */}
                        <th
                          className="table-header"
                          onClick={() => handleSort("impressions")}
                        >
                          <div className="flex items-center gap-1">
                            Impressions
                            {getSortIcon("impressions")}
                          </div>
                        </th>

                        {/* Clicks */}
                        <th
                          className="table-header"
                          onClick={() => handleSort("clicks")}
                        >
                          <div className="flex items-center gap-1">
                            Clicks
                            {getSortIcon("clicks")}
                          </div>
                        </th>

                        {/* CTR */}
                        <th
                          className="table-header"
                          onClick={() => handleSort("ctr")}
                        >
                          <div className="flex items-center gap-1">
                            CTR
                            {getSortIcon("ctr")}
                          </div>
                        </th>

                        {/* ACOS */}
                        <th
                          className="table-header"
                          onClick={() => handleSort("acos")}
                        >
                          <div className="flex items-center gap-1">
                            ACOS
                            {getSortIcon("acos")}
                          </div>
                        </th>

                        {/* ROAS */}
                        <th
                          className="table-header"
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
                      {/* Show skeleton rows when loading and no data */}
                      {loading && targets.length === 0 ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={`skeleton-${index}`} className="table-row">
                            <td className="table-cell" colSpan={17}>
                              <div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <>
                          {/* Summary Row - match Campaigns: explicit bg so ROAS and all cells show #f5f5f0 */}
                          {summary && (
                            <tr className="table-summary-row">
                              <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] border-r border-[#e8e8e3]" data-summary-col="checkbox" />
                              <td className="table-cell table-sticky-first-column font-medium bg-[#f5f5f0]" data-summary-col="name">
                                Total ({summary.total_targets})
                              </td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="state">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="bid">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="adgroup_name">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="campaign_name">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="profile">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="country">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0]" data-summary-col="currency">—</td>
                              <td className="table-cell table-text leading-[1.26] bg-[#f5f5f0] min-w-[70px]" data-summary-col="type">—</td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="spends">
                                {formatCurrency(
                                  summary.total_spends,
                                  targets[0]?.profile_currency_code
                                )}
                              </td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="sales">
                                {formatCurrency(
                                  summary.total_sales,
                                  targets[0]?.profile_currency_code
                                )}
                              </td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="impressions">
                                {summary.total_impressions.toLocaleString()}
                              </td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="clicks">
                                {summary.total_clicks.toLocaleString()}
                              </td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="ctr">—</td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="acos">
                                {summary.avg_acos.toFixed(2)}%
                              </td>
                              <td className="table-cell table-text leading-[1.26] text-left bg-[#f5f5f0]" data-summary-col="roas">
                                {summary.avg_roas.toFixed(2)}
                              </td>
                            </tr>
                          )}
                          {targets.map((target, index) => {
                            const isLastRow = index === targets.length - 1;
                            const isArchived =
                              target.status?.toLowerCase() === "archived";
                            return (
                              <tr
                                key={target.id}
                                className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                                  } ${isArchived
                                    ? "bg-gray-100 opacity-60"
                                    : "hover:bg-gray-100"
                                  } transition-colors`}
                              >
                                {/* Checkbox - archived targets cannot be selected */}
                                <td className="table-cell">
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={selectedTargets.has(
                                        target.targetId || target.id
                                      )}
                                      disabled={isArchived}
                                      onChange={(checked) => {
                                        if (isArchived) return;
                                        const targetId =
                                          target.targetId || target.id;
                                        if (checked) {
                                          setSelectedTargets((prev) => {
                                            const newSet = new Set(prev);
                                            newSet.add(targetId);
                                            return newSet;
                                          });
                                        } else {
                                          setSelectedTargets((prev) => {
                                            const newSet = new Set(prev);
                                            newSet.delete(targetId);
                                            return newSet;
                                          });
                                        }
                                      }}
                                      size="small"
                                    />
                                  </div>
                                </td>

                                {/* Target Name */}
                                <td className="table-cell min-w-[310px] max-w-[430px]">
                                  <span
                                    className="table-text leading-[1.26] text-left truncate block w-full"
                                    title={target.name || "Unnamed Target"}
                                  >
                                    {target.name || "Unnamed Target"}
                                  </span>
                                </td>

                                {/* State */}
                                <td className="table-cell min-w-[115px]">
                                  {(() => {
                                    const currentStatus = (
                                      target.status || "Enabled"
                                    ).toLowerCase();
                                    const isArchived = currentStatus === "archived";

                                    if (isArchived) {
                                      return (
                                        <div className="opacity-60">
                                          <StatusBadge
                                            status={target.status || "Enabled"}
                                          />
                                        </div>
                                      );
                                    }

                                    const statusLower = (
                                      target.status || "Enabled"
                                    ).toLowerCase();
                                    const normalizedStatus =
                                      statusLower === "enable" ||
                                        statusLower === "enabled"
                                        ? "Enabled"
                                        : statusLower === "paused"
                                          ? "Paused"
                                          : "Enabled";

                                    const statusValue = editingCell?.targetId === target.targetId &&
                                      editingCell?.field === "status"
                                      ? editedValue
                                      : normalizedStatus;

                                    return (
                                      <Dropdown
                                        options={[
                                          { value: "Enabled", label: "Enabled" },
                                          { value: "Paused", label: "Paused" },
                                          {
                                            value: "Archived",
                                            label: "Archived",
                                          },
                                        ]}
                                        value={statusValue}
                                        onChange={(val) => {
                                          const newValue = val as string;
                                          const wasEditing = editingCell?.targetId === target.targetId &&
                                            editingCell?.field === "status";

                                          if (!wasEditing) {
                                            startInlineEdit(target, "status");
                                            // Pass target ID and field directly to avoid state timing issues
                                            setTimeout(() => {
                                              handleInlineEditChange(newValue);
                                              confirmInlineEdit(newValue, target.targetId || target.id, "status");
                                            }, 0);
                                          } else {
                                            handleInlineEditChange(newValue);
                                            confirmInlineEdit(newValue, target.targetId || target.id, "status");
                                          }
                                        }}
                                        buttonClassName="edit-button"
                                        width="w-full"
                                        align="center"
                                      />
                                    );
                                  })()}
                                </td>

                                {/* Bid */}
                                <td className="table-cell min-w-[130px]">
                                  {(() => {
                                    const currentStatus = (
                                      target.status || "Enabled"
                                    ).toLowerCase();
                                    const isArchived = currentStatus === "archived";

                                    const bidValue = parseFloat(
                                      (typeof target.bid === "number" ? String(target.bid) : (target.bid || "$0.00")).replace(/[^0-9.]/g, "")
                                    );

                                    const inputValue = editingCell?.targetId === (target.targetId || target.id) &&
                                      editingCell?.field === "bid"
                                      ? editedValue
                                      : bidValue.toString();

                                    const currencyCode = (target.profile_currency_code || "USD").trim() || "USD";
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        <span className="table-text text-gray-500 text-sm shrink-0" title="Currency">
                                          {currencyCode}
                                        </span>
                                        <input
                                          type="number"
                                          value={inputValue}
                                          min={0}
                                          step={0.01}
                                          onFocus={() => {
                                            if (!isArchived &&
                                              (editingCell?.targetId !== (target.targetId || target.id) ||
                                                editingCell?.field !== "bid")) {
                                              startInlineEdit(target, "bid");
                                            }
                                          }}
                                          onChange={(e) => {
                                            if (isArchived) return;
                                            handleInlineEditChange(e.target.value);
                                          }}
                                          onBlur={(e) => {
                                            if (isArchived) return;
                                            const inputValue = e.target.value;
                                            if (editingCell?.targetId === (target.targetId || target.id) &&
                                              editingCell?.field === "bid") {
                                              confirmInlineEdit(inputValue);
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (isArchived) return;
                                            if (e.key === "Enter") {
                                              e.currentTarget.blur();
                                            } else if (e.key === "Escape") {
                                              cancelInlineEdit();
                                            }
                                          }}
                                          disabled={isArchived}
                                          className={`inline-edit-input min-w-[5.5rem] w-28 ${isArchived ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                                            }`}
                                          title={
                                            isArchived
                                              ? "Archived targets cannot be modified"
                                              : undefined
                                          }
                                        />
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* Ad Group Name */}
                                <td className="table-cell min-w-[150px] max-w-[200px]">
                                  <span className="table-text leading-[1.26] text-left truncate block w-full">
                                    {target.adgroup_name || "—"}
                                  </span>
                                </td>

                                {/* Campaign Name */}
                                <td className="table-cell min-w-[150px] max-w-[200px]">
                                  <button
                                    onClick={() => {
                                      if (accountId && target.campaignId) {
                                        navigate(
                                          buildMarketplaceRoute(
                                            parseInt(accountId),
                                            channelId ?? 0,
                                            "amazon",
                                            "campaigns",
                                            `${target.type?.toLowerCase() || "sp"
                                            }_${target.campaignId}`
                                          )
                                        );
                                      }
                                    }}
                                    className="table-edit-link block w-full"
                                  >
                                    {target.campaign_name || "—"}
                                  </button>
                                </td>

                                {/* Profile */}
                                <td className="table-cell min-w-[150px]">
                                  <span className="table-text leading-[1.26] whitespace-nowrap">
                                    {target.profile_name &&
                                      target.profile_name.trim() !== ""
                                      ? target.profile_name
                                      : "—"}
                                  </span>
                                </td>

                                {/* Country */}
                                <td className="table-cell min-w-[100px]">
                                  <span className="table-text leading-[1.26] whitespace-nowrap">
                                    {target.profile_country_code &&
                                      target.profile_country_code.trim() !== ""
                                      ? target.profile_country_code
                                      : "—"}
                                  </span>
                                </td>

                                {/* Currency */}
                                <td className="table-cell min-w-[80px]">
                                  <span className="table-text leading-[1.26] whitespace-nowrap">
                                    {target.profile_currency_code &&
                                      target.profile_currency_code.trim() !== ""
                                      ? target.profile_currency_code
                                      : "—"}
                                  </span>
                                </td>

                                {/* Type */}
                                <td className="table-cell min-w-[70px]">
                                  <span className="table-text leading-[1.26] whitespace-nowrap">
                                    {target.type || "SP"}
                                  </span>
                                </td>

                                {/* Spends */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {formatCurrency(
                                      Number(target.spends) || 0,
                                      target.profile_currency_code
                                    )}
                                  </span>
                                </td>

                                {/* Sales */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {formatCurrency(
                                      Number(target.sales) || 0,
                                      target.profile_currency_code
                                    )}
                                  </span>
                                </td>

                                {/* Impressions */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {(target.impressions || 0).toLocaleString()}
                                  </span>
                                </td>

                                {/* Clicks */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {(target.clicks || 0).toLocaleString()}
                                  </span>
                                </td>

                                {/* CTR */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {target.ctr || "0.00%"}
                                  </span>
                                </td>

                                {/* ACOS */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {target.acos
                                      ? `${parseFloat(target.acos).toFixed(2)}%`
                                      : "0.00%"}
                                  </span>
                                </td>

                                {/* ROAS */}
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {target.roas
                                      ? `${parseFloat(target.roas).toFixed(
                                        2
                                      )}`
                                      : "0.00"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Loading overlay for table */}
              {loading && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <Loader size="md" message="Loading targets..." />
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && targets.length > 0 && (
              <div className="flex items-center justify-end mt-4">
                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                  <button
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
                            ? "bg-white text-[#136D6D] font-semibold"
                            : "text-black hover:bg-gray-100"
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
                  {/* Only show separate last-page button when last page is not already in the sliding window */}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer text-black hover:bg-gray-100"
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Edit Confirmation Modal - z-[200] above table sticky summary (z-[120]) */}
      {showInlineEditModal && inlineEditTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
          onClick={() => {
            if (!inlineEditLoading) {
              setShowInlineEditModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm Edit
            </h3>
            <div className="mb-4">
              <p className="text-[12.16px] text-[#556179] mb-2">
                {inlineEditField === "status"
                  ? "State"
                  : inlineEditField === "bid"
                    ? "Bid"
                    : "Field"}{" "}
                will be updated:
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12.16px] text-[#556179]">From:</span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    {inlineEditOldValue}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[12.16px] text-[#556179]">To:</span>
                  <span className="text-[12.16px] font-semibold text-[#136D6D]">
                    {inlineEditNewValue}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInlineEditModal(false);
                  setInlineEditTarget(null);
                  setInlineEditField(null);
                  setInlineEditOldValue("");
                  setInlineEditNewValue("");
                }}
                disabled={inlineEditLoading}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={runInlineEdit}
                disabled={inlineEditLoading}
                className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
              >
                {inlineEditLoading ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
