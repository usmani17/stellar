import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildMarketplaceRoute } from "../utils/urlHelpers";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useDateRange } from "../contexts/DateRangeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { campaignsService, type AdGroup } from "../services/campaigns";
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
import { AdGroupsTable } from "../components/campaigns/AdGroupsTable";

export const AdGroups: React.FC = () => {
  const { showEditSummary, EditSummaryModal: EditSummaryModalOutlet } =
    useEditSummaryModal();
  const navigate = useNavigate();
  const { accountId, channelId } = useParams<{
    accountId: string;
    channelId?: string;
  }>();
  const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
  const { sidebarWidth } = useSidebar();
  const [adgroups, setAdgroups] = useState<AdGroup[]>([]);
  const [summary, setSummary] = useState<{
    total_adgroups: number;
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
  const [selectedAdgroups, setSelectedAdgroups] = useState<
    Set<string | number>
  >(new Set());
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
    "adgroups-chart-collapsed"
  );

  const adgroupMetrics: MetricConfig[] = [
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
  const requestIdRef = useRef<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    isSuccess?: boolean;
    genericErrors?: string[];
    title?: string;
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
  const [selectedAdgroupsFetched, setSelectedAdgroupsFetched] = useState<
    AdGroup[] | null
  >(null);
  const [selectedAdgroupsFetching, setSelectedAdgroupsFetching] =
    useState(false);

  // Inline edit state - matching AdGroupsTable pattern
  const [editingAdGroupField, setEditingAdGroupField] = useState<{
    id: number;
    field: "status" | "default_bid" | "name";
  } | null>(null);
  const [editedAdGroupValue, setEditedAdGroupValue] = useState<string>("");
  const [pendingAdGroupChange, setPendingAdGroupChange] = useState<{
    id: number;
    field: "status" | "default_bid" | "name";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [adGroupEditLoading, setAdGroupEditLoading] = useState<Set<number>>(
    new Set()
  );

  const toggleChartMetric = (key: string) => {
    const validKeys: Array<
      | "sales"
      | "spend"
      | "sales1d"
      | "sales7d"
      | "sales14d"
      | "impressions"
      | "clicks"
      | "acos"
      | "roas"
    > = [
        "sales",
        "spend",
        "sales1d",
        "sales7d",
        "sales14d",
        "impressions",
        "clicks",
        "acos",
        "roas",
      ];
    if (validKeys.includes(key as any)) {
      setChartToggles((prev) => ({
        ...prev,
        [key]: !prev[key as keyof typeof prev],
      }));
    }
  };

  // Set page title
  useEffect(() => {
    setPageTitle("Ad Groups");
    return () => {
      resetPageTitle();
    };
  }, []);

  useEffect(() => {
    // Cancel any pending request when dependencies change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    // Generate a unique request ID based on all dependencies to prevent duplicate requests
    const requestId = JSON.stringify({
      accountId,
      currentPage,
      itemsPerPage,
      sortBy,
      sortOrder,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filters,
      profileId,
    });

    // Skip if this is the same request as the last one (prevents React StrictMode double calls)
    if (requestIdRef.current === requestId) {
      return;
    }

    requestIdRef.current = requestId;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadAdGroups(accountIdNum);
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
    profileId,
  ]);

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
      } else if (filter.field === "default_bid") {
        if (filter.operator === "lt") {
          params.default_bid__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.default_bid__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.default_bid = filter.value;
        } else if (filter.operator === "lte") {
          params.default_bid__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.default_bid__gte = filter.value;
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
        params.type = filter.value;
      } else if (filter.field === "campaign_name") {
        if (filter.operator === "contains") {
          params.campaign_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.campaign_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.campaign_name = filter.value;
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

      // Call export API (channelId from route for /brands/:accountId/:channelId/amazon/adgroups)
      const result = await campaignsService.exportAdGroups(
        accountIdNum,
        { ...params, export_type: exportType },
        channelId ?? undefined,
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
      console.error("Failed to export adgroups:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export ad groups. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  const loadAdGroups = async (accountId: number) => {
    // Prevent duplicate simultaneous requests
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);

      console.log("AdGroups - Date range:", {
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

      const response = await campaignsService.getAdGroupsList(
        accountId,
        params,
        channelId ?? undefined,
        profileId ?? null
      );

      console.log(
        "AdGroups - Chart data received:",
        response.chart_data?.length || 0,
        "points"
      );

      setAdgroups(Array.isArray(response.adgroups) ? response.adgroups : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
        console.log(
          "AdGroups - Chart data dates:",
          response.chart_data.map((d: any) => d.date)
        );
      }
    } catch (error) {
      console.error("Failed to load adgroups:", error);
      setAdgroups([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadAdGroupsWithFilters = async (
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

      const response = await campaignsService.getAdGroupsList(
        accountId,
        params,
        channelId ?? undefined,
        profileId ?? null
      );
      setAdgroups(Array.isArray(response.adgroups) ? response.adgroups : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
      }
    } catch (error) {
      console.error("Failed to load adgroups:", error);
      setAdgroups([]);
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

  // Ad Group inline edit handlers - matching AdGroupsTable pattern
  const handleAdGroupEditStart = (
    id: number,
    field: "status" | "default_bid" | "name",
    currentValue: string
  ) => {
    setEditingAdGroupField({ id, field });
    setEditedAdGroupValue(currentValue);
    setPendingAdGroupChange(null);
  };

  const handleAdGroupEditChange = (value: string) => {
    setEditedAdGroupValue(value);
  };

  const handleAdGroupEditCancel = () => {
    setEditingAdGroupField(null);
    setEditedAdGroupValue("");
    setPendingAdGroupChange(null);
  };

  const handleAdGroupEditEnd = (newValue?: string, adgroupIdOverride?: number, fieldOverride?: "status" | "default_bid" | "name") => {
    // Use override parameters if provided, otherwise fall back to editingAdGroupField state
    const adgroupIdToUse = adgroupIdOverride || editingAdGroupField?.id;
    const fieldToUse = fieldOverride || editingAdGroupField?.field;

    if (!adgroupIdToUse || !fieldToUse) return;

    const adgroup = adgroups.find((ag) => ag.id === adgroupIdToUse);
    if (!adgroup) {
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    // This handles the case where onEditEnd is called immediately after onChange
    // before React state has updated
    const valueToCompare =
      newValue !== undefined ? newValue : editedAdGroupValue;

    let hasChanged = false;
    let oldValue = "";

    if (fieldToUse === "status") {
      const statusLower = adgroup.status?.toLowerCase() || "enabled";
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : statusLower === "paused"
            ? "paused"
            : "archived";
      oldValue = currentStatus;
      const newStatusLower = (valueToCompare || "").toLowerCase();
      const normalizedNew =
        newStatusLower === "enable" || newStatusLower === "enabled"
          ? "enabled"
          : newStatusLower === "paused"
            ? "paused"
            : "archived";
      hasChanged = normalizedNew !== currentStatus;
    } else if (fieldToUse === "default_bid") {
      const bidStr =
        typeof adgroup.default_bid === "string"
          ? adgroup.default_bid
          : adgroup.default_bid != null
            ? String(adgroup.default_bid)
            : "$0.00";
      const currentBid = bidStr.replace(/[^0-9.]/g, "") || "0";
      oldValue = bidStr;
      hasChanged = valueToCompare !== currentBid && valueToCompare !== "";
    } else if (fieldToUse === "name") {
      oldValue = adgroup.name || "";
      hasChanged =
        valueToCompare.trim() !== oldValue.trim() &&
        valueToCompare.trim() !== "";
    }

    if (hasChanged) {
      setPendingAdGroupChange({
        id: adgroupIdToUse,
        field: fieldToUse,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setEditingAdGroupField(null);
    } else {
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
    }
  };

  const confirmAdGroupChange = async () => {
    if (!pendingAdGroupChange || !accountId) return;

    const adgroup = adgroups.find((ag) => ag.id === pendingAdGroupChange.id);
    if (!adgroup || !adgroup.adGroupId) {
      alert("Ad group ID not found");
      setPendingAdGroupChange(null);
      return;
    }

    setAdGroupEditLoading((prev) => new Set(prev).add(pendingAdGroupChange.id));
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      let adGroupAction: "updated" | "archived" = "updated";
      if (pendingAdGroupChange.field === "status") {
        // For SD adgroups, archive uses the archive endpoint
        if (
          ((adgroup.type ?? (adgroup as { campaignType?: string }).campaignType ?? (adgroup as { campaign_type?: string }).campaign_type) === "SD") &&
          (pendingAdGroupChange.newValue.toLowerCase() === "archived" ||
            pendingAdGroupChange.newValue.toLowerCase() === "archive")
        ) {
          adGroupAction = "archived";
          await campaignsService.archiveSdAdGroup(
            accountIdNum,
            adgroup.adGroupId,
            channelId ?? null
          );
        } else {
          const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
            enabled: "ENABLED",
            paused: "PAUSED",
            enable: "ENABLED",
            pause: "PAUSED",
          };
          const statusValue =
            statusMap[pendingAdGroupChange.newValue.toLowerCase()] || "ENABLED";

          const payload = buildGroupedPayload([
            {
              entityId: adgroup.adGroupId,
              profile_id: adgroup.profile_id ?? (adgroup as { profileId?: string }).profileId,
              type: getCampaignTypeFromAdgroup(adgroup),
            },
          ]);
          if (Object.keys(payload).length === 0) throw new Error("Missing profile_id or adGroupId");

          await campaignsService.bulkUpdateAdGroups(
            accountIdNum,
            {
              payload,
              action: "status",
              status: statusValue,
            },
            channelId ?? null
          );
        }
      } else if (pendingAdGroupChange.field === "default_bid") {
        const bidValue = parseFloat(pendingAdGroupChange.newValue);
        if (isNaN(bidValue)) {
          throw new Error("Invalid bid value");
        }

        const payload = buildGroupedPayload([
          {
            entityId: adgroup.adGroupId,
            profile_id: adgroup.profile_id ?? (adgroup as { profileId?: string }).profileId,
            type: getCampaignTypeFromAdgroup(adgroup),
          },
        ]);
        if (Object.keys(payload).length === 0) throw new Error("Missing profile_id or adGroupId");

        await campaignsService.bulkUpdateAdGroups(
          accountIdNum,
          {
            payload,
            action: "default_bid",
            value: bidValue,
          },
          channelId ?? null
        );
      } else if (pendingAdGroupChange.field === "name") {
        const payload = buildGroupedPayload([
          {
            entityId: adgroup.adGroupId,
            profile_id: adgroup.profile_id ?? (adgroup as { profileId?: string }).profileId,
            type: getCampaignTypeFromAdgroup(adgroup),
          },
        ]);
        if (Object.keys(payload).length === 0) throw new Error("Missing profile_id or adGroupId");

        await campaignsService.bulkUpdateAdGroups(
          accountIdNum,
          {
            payload,
            action: "name",
            name: pendingAdGroupChange.newValue.trim(),
          },
          channelId ?? null
        );
      }

      const { field, oldValue, newValue } = pendingAdGroupChange;
      setPendingAdGroupChange(null);
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");

      const isStatusField = field === "status";
      const displayOld = isStatusField ? normalizeStatusDisplay(oldValue) : oldValue;
      const displayNew =
        adGroupAction === "archived" ? "Archived" : isStatusField ? normalizeStatusDisplay(newValue) : newValue;

      showEditSummary({
        entityType: "adGroup",
        action: adGroupAction,
        mode: "inline",
        succeededCount: 1,
        entityName: adgroup.name || adgroup.campaign_name || "Ad Group",
        field,
        oldValue: displayOld,
        newValue: displayNew,
      });

      await loadAdGroups(accountIdNum);
    } catch (error: any) {
      console.error("Error updating ad group:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update ad group. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setAdGroupEditLoading((prev) => {
        const newSet = new Set(prev);
        if (pendingAdGroupChange) newSet.delete(pendingAdGroupChange.id);
        return newSet;
      });
    }
  };

  const cancelAdGroupChange = () => {
    setPendingAdGroupChange(null);
    setEditingAdGroupField(null);
    setEditedAdGroupValue("");
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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const parseSucceededItemsFromResponse = (
    response: {
      successes?: Array<{
        adgroupId?: string | number;
        adgroupName?: string;
        field?: string;
        oldValue?: string;
        newValue?: string;
      }>;
    },
    adgroupMap?: Map<string, AdGroup>
  ): Array<{ label: string; field: string; oldValue: string; newValue: string }> => {
    const successes = response?.successes ?? [];
    const items: Array<{
      label: string;
      field: string;
      oldValue: string;
      newValue: string;
    }> = [];
    const isStatusField = (f: string) =>
      (f ?? "").toLowerCase() === "state" || (f ?? "").toLowerCase() === "status";

    const isBidField = (f: string) =>
      (f ?? "").toLowerCase() === "bid" || (f ?? "").toLowerCase() === "default_bid";
    for (const s of successes) {
      const id = String(s.adgroupId ?? "");
      const fromBackend =
        s.field != null && (s.oldValue != null || s.newValue != null);
      const fieldVal = s.field ?? "—";
      const oldVal = s.oldValue ?? "—";
      const newVal = s.newValue ?? "—";
      const ag = adgroupMap?.get(id);
      const currency = ag?.profile_currency_code;
      let normOld = isStatusField(fieldVal) ? normalizeStatusDisplay(oldVal) : oldVal;
      let normNew = isStatusField(fieldVal) ? normalizeStatusDisplay(newVal) : newVal;
      if (isBidField(fieldVal)) {
        normOld = formatMoneyForEditSummary(oldVal, currency) || normOld;
        normNew = formatMoneyForEditSummary(newVal, currency) || normNew;
      }
      if (fromBackend) {
        items.push({
          label: s.adgroupName ?? `Ad Group ${id}`,
          field: fieldVal,
          oldValue: normOld,
          newValue: normNew,
        });
      } else if (adgroupMap) {
        const name = ag?.name ?? `Ad Group ${id}`;
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

  // Bulk action handlers
  const runBulkStatus = async (statusValue: "enable" | "pause" | "archive") => {
    if (!accountId || selectedAdgroups.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      // Get adGroupIds from selected adgroups - use adGroupId from the adgroup objects
      const selectedAdgroupsData = getSelectedAdgroupsData();
      const adgroupIds = selectedAdgroupsData
        .map((ag) => ag.adGroupId || ag.id)
        .filter(Boolean);

      // For archive, use bulk delete endpoint (backend handles archiving for all types: SP, SB, SD)
      if (statusValue === "archive") {
        const res = await campaignsService.bulkDeleteAdGroups(
          accountIdNum,
          {
            adGroupIdFilter: {
              include: adgroupIds,
            },
            // Don't restrict to specific campaign type - backend handles all types appropriately
          },
          channelId ?? null
        );
        const successList = res?.adGroups?.success ?? [];
        const errorList = res?.adGroups?.error ?? [];
        const adgroupMap = new Map(
          selectedAdgroupsData.map((ag) => [
            String(ag.adGroupId ?? ag.id),
            ag,
          ])
        );
        const succeededItems = successList.slice(0, 10).map((s: { adGroupId?: string }) => {
          const id = String(s.adGroupId ?? "");
          const ag = adgroupMap.get(id);
          return {
            label: ag?.name ?? `Ad Group ${id}`,
            field: "Action",
            oldValue: "—",
            newValue: "Archived",
          };
        });
        showEditSummary({
          entityType: "adGroup",
          action: "deleted",
          mode: "bulk",
          succeededCount: successList.length,
          failedCount: errorList.length > 0 ? errorList.length : undefined,
          succeededItems,
          details: errorList.slice(0, 5).map((e: { adGroupId?: string; message?: string }) => {
            const ag = selectedAdgroupsData.find(
              (a) => String(a.adGroupId ?? a.id) === String(e.adGroupId)
            );
            const label = ag?.name
              ? `${ag.name} (${e.adGroupId ?? "—"})`
              : `Ad Group ${e.adGroupId ?? "—"}`;
            return { label, value: e.message ?? "Unknown error" };
          }),
        });
      } else {
        const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
          enable: "ENABLED",
          pause: "PAUSED",
          enabled: "ENABLED",
          paused: "PAUSED",
        };
        const apiStatus = statusMap[statusValue.toLowerCase()] || "ENABLED";

        const payload = buildGroupedPayload(
          selectedAdgroupsData.map((ag) => ({
            entityId: ag.adGroupId ?? ag.id,
            profile_id: ag.profile_id ?? (ag as { profileId?: string }).profileId,
            type: getCampaignTypeFromAdgroup(ag),
          }))
        );
        if (Object.keys(payload).length === 0) return;

        const res = await campaignsService.bulkUpdateAdGroups(
          accountIdNum,
          {
            payload,
            action: "status",
            status: apiStatus,
          },
          channelId ?? null
        );
        const succeededCount = res?.updated ?? 0;
        const failedCount = res?.failed ?? 0;
        const adgroupMap = new Map(
          selectedAdgroupsData.map((ag) => [
            String(ag.adGroupId ?? ag.id),
            ag,
          ])
        );
        const succeededItems = parseSucceededItemsFromResponse(res, adgroupMap).slice(0, 10);

        showEditSummary({
          entityType: "adGroup",
          action: "updated",
          mode: "bulk",
          succeededCount,
          failedCount: failedCount > 0 ? failedCount : undefined,
          succeededItems,
          details: (res?.errors as Array<{ adgroupId?: string | number; error?: string }> | undefined)?.slice(0, 5).map((e) => {
            const ag = getSelectedAdgroupsData().find(
              (a) => String(a.adGroupId ?? a.id) === String(e.adgroupId)
            );
            const name = ag?.name ?? null;
            const label = name
              ? `${name} (${e.adgroupId ?? "—"})`
              : `Ad Group ${e.adgroupId ?? "—"}`;
            return { label, value: e.error ?? "Unknown error" };
          }),
        });
      }
      await loadAdGroups(accountIdNum);
      setSelectedAdgroups(new Set());
      setSelectedAdgroupsFetched(null);
      setShowConfirmationModal(false);
      setPendingStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update adgroups", error);
      setShowConfirmationModal(false);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update adgroups. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkBid = async () => {
    if (!accountId || selectedAdgroups.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(bidValue);
    if (isNaN(valueNum)) {
      return;
    }

    try {
      setBulkLoading(true);

      // Get selected adgroups with their current default bids. Only SD (and SP) ad groups have default bid; SB does not — skip SB for bulk default bid.
      const selectedAdgroupsData = getSelectedAdgroupsData();
      const updates: Array<{ adgroupId: string | number; newBid: number; campaignType: "SP" | "SD" }> = [];

      for (const adgroup of selectedAdgroupsData) {
        const agType = getCampaignTypeFromAdgroup(adgroup);
        if (agType === "SB") {
          // SB ad groups have no default bid; skip
          continue;
        }

        // Extract current bid (API may return string like "$0.00" or number)
        const bidStr =
          typeof adgroup.default_bid === "string"
            ? adgroup.default_bid
            : adgroup.default_bid != null
              ? String(adgroup.default_bid)
              : "$0.00";
        const currentBid = parseFloat(bidStr.replace(/[^0-9.]/g, "") || "0");
        let newBid = currentBid;

        if (bidAction === "set") {
          newBid = valueNum;
        } else if (bidAction === "increase") {
          if (bidUnit === "percent") {
            newBid = currentBid * (1 + valueNum / 100.0);
          } else {
            newBid = currentBid + valueNum;
          }
        } else if (bidAction === "decrease") {
          if (bidUnit === "percent") {
            newBid = currentBid * (1 - valueNum / 100.0);
          } else {
            newBid = currentBid - valueNum;
          }
        }

        // Apply optional limits
        if (upperLimit) {
          const upper = parseFloat(upperLimit);
          if (!isNaN(upper)) {
            newBid = Math.min(newBid, upper);
          }
        }
        if (lowerLimit) {
          const lower = parseFloat(lowerLimit);
          if (!isNaN(lower)) {
            newBid = Math.max(newBid, lower);
          }
        }

        // Prevent negative or zero
        newBid = Math.max(newBid, 0);

        if (adgroup.adGroupId && (agType === "SP" || agType === "SD")) {
          updates.push({
            adgroupId: adgroup.adGroupId,
            newBid: Math.round(newBid * 100) / 100,
            campaignType: agType,
          });
        }
      }

      if (updates.length === 0) {
        // All selected were SB; only SD/SP ad groups have default bid
        setShowConfirmationModal(false);
        setShowBidPanel(false);
        setErrorModal({
          isOpen: true,
          message:
            "Default bid only applies to Sponsored Products (SP) and Sponsored Display (SD) ad groups. Selected Sponsored Brands (SB) ad groups were skipped.",
        });
        setBulkLoading(false);
        return;
      }

      const payload = buildGroupedPayload(
        updates.map((u) => ({
          entityId: u.adgroupId,
          profile_id: selectedAdgroupsData.find(
            (ag) => String(ag.adGroupId ?? ag.id) === String(u.adgroupId)
          )?.profile_id,
          type: u.campaignType,
        }))
      );
      const payloadFiltered = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v && Object.keys(v).length > 0)
      );
      if (Object.keys(payloadFiltered).length === 0) return;

      const bids = updates.map((u) => ({ adgroupId: u.adgroupId, bid: u.newBid }));

      const res = await campaignsService.bulkUpdateAdGroups(
        accountIdNum,
        {
          payload: payloadFiltered,
          action: "default_bid",
          bids,
        },
        channelId ?? null
      );
      const succeededCount = res?.updated ?? 0;
      const failedCount = res?.failed ?? 0;
      const adgroupMap = new Map(
        selectedAdgroupsData.map((ag) => [
          String(ag.adGroupId ?? ag.id),
          ag,
        ])
      );
      const succeededItems = parseSucceededItemsFromResponse(res, adgroupMap).slice(0, 10);

      showEditSummary({
        entityType: "adGroup",
        action: "updated",
        mode: "bulk",
        succeededCount,
        failedCount: failedCount > 0 ? failedCount : undefined,
        succeededItems,
        details: (res?.errors as Array<{ adgroupId?: string | number; error?: string }> | undefined)?.slice(0, 5).map((e) => {
          const ag = getSelectedAdgroupsData().find(
            (a) => String(a.adGroupId ?? a.id) === String(e.adgroupId)
          );
          const name = ag?.name ?? null;
          const label = name
            ? `${name} (${e.adgroupId ?? "—"})`
            : `Ad Group ${e.adgroupId ?? "—"}`;
          return { label, value: e.error ?? "Unknown error" };
        }),
      });

      await loadAdGroups(accountIdNum);
      setSelectedAdgroups(new Set());
      setSelectedAdgroupsFetched(null);
      setShowConfirmationModal(false);
      setShowBidPanel(false);
      setBidValue("");
      setUpperLimit("");
      setLowerLimit("");
    } catch (error: any) {
      console.error("Failed to update adgroups", error);
      setShowConfirmationModal(false);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update adgroups. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedAdgroupsData = (): AdGroup[] => {
    if (selectedAdgroupsFetched && selectedAdgroupsFetched.length > 0) {
      return selectedAdgroupsFetched;
    }
    return adgroups.filter((ag) =>
      selectedAdgroups.has(ag.adGroupId || ag.id)
    );
  };

  useEffect(() => {
    if (
      !showConfirmationModal ||
      selectedAdgroups.size === 0 ||
      !accountId ||
      !channelId
    ) {
      setSelectedAdgroupsFetched(null);
      return;
    }
    const ids = Array.from(selectedAdgroups);
    let cancelled = false;
    setSelectedAdgroupsFetching(true);
    campaignsService
      .getAdGroupsByIds(
        parseInt(accountId, 10),
        ids,
        channelId ? parseInt(channelId, 10) : null
      )
      .then((res) => {
        if (!cancelled && res?.adgroups) {
          setSelectedAdgroupsFetched(res.adgroups);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedAdgroupsFetched(null);
      })
      .finally(() => {
        if (!cancelled) setSelectedAdgroupsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showConfirmationModal, selectedAdgroups, accountId, channelId]);

  const getCampaignTypeFromAdgroup = (ag: AdGroup | undefined): "SP" | "SB" | "SD" => {
    if (!ag) return "SP";
    const t = (ag as { type?: string; campaignType?: string; campaign_type?: string }).type
      ?? (ag as { type?: string; campaignType?: string; campaign_type?: string }).campaignType
      ?? (ag as { type?: string; campaignType?: string; campaign_type?: string }).campaign_type
      ?? "SP";
    return (String(t).toUpperCase() === "SB" ? "SB" : String(t).toUpperCase() === "SD" ? "SD" : "SP") as "SP" | "SB" | "SD";
  };

  const formatCurrency = (value: string | number, currency?: string) => {
    const numValue =
      typeof value === "string"
        ? parseFloat(String(value).replace(/[^0-9.-]+/g, ""))
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

  const calculateNewBid = (currentBid: number): number => {
    const valueNum = parseFloat(bidValue);
    if (isNaN(valueNum)) return currentBid;

    let newBid = currentBid;

    if (bidAction === "increase") {
      if (bidUnit === "percent") {
        newBid = currentBid * (1 + valueNum / 100);
      } else {
        newBid = currentBid + valueNum;
      }
      if (upperLimit) {
        const upper = parseFloat(upperLimit);
        if (!isNaN(upper)) {
          newBid = Math.min(newBid, upper);
        }
      }
    } else if (bidAction === "decrease") {
      if (bidUnit === "percent") {
        newBid = currentBid * (1 - valueNum / 100);
      } else {
        newBid = currentBid - valueNum;
      }
      if (lowerLimit) {
        const lower = parseFloat(lowerLimit);
        if (!isNaN(lower)) {
          newBid = Math.max(newBid, lower);
        }
      }
    } else if (bidAction === "set") {
      newBid = valueNum;
    }

    // Prevent negative
    newBid = Math.max(newBid, 0);

    return Math.round(newBid * 100) / 100;
  };

  // Generate chart data based on adgroups and date range
  const chartData = useMemo(() => {
    // Use chart data from API if available, otherwise generate from adgroups
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

  const handleSelectAllAdGroups = (checked: boolean) => {
    if (checked) {
      const selectable = adgroups.filter(
        (ag) => (ag.status ?? "").toLowerCase() !== "archived"
      );
      const allIds = new Set(
        selectable.map((ag) => ag.adGroupId || ag.id)
      );
      setSelectedAdgroups(allIds);
    } else {
      setSelectedAdgroups(new Set());
    }
  };

  const handleSelectAdGroup = (id: string | number, checked: boolean) => {
    if (checked) {
      setSelectedAdgroups((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    } else {
      setSelectedAdgroups((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Define filter fields for Ad Groups
  const ADGROUP_FILTER_FIELDS = [
    { value: "name", label: "Ad Group Name" },
    { value: "state", label: "State" },
    { value: "default_bid", label: "Default Bid" },
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
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#136D6D] border-t-transparent"></div>
            <p className="text-[16px] text-[#072929] font-medium">
              Exporting Ad Groups...
            </p>
            <p className="text-[13px] text-[#556179] text-center">
              Please wait while we prepare your file
            </p>
          </div>
        </div>
      )}

      {/* Error Modal / Bulk result summary */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() =>
          setErrorModal({
            isOpen: false,
            message: "",
            isSuccess: undefined,
            genericErrors: undefined,
            title: undefined,
          })
        }
        title={errorModal.title}
        message={errorModal.message}
        isSuccess={errorModal.isSuccess}
        genericErrors={errorModal.genericErrors}
      />

      <EditSummaryModalOutlet />

      {/* Inline Edit Confirmation Modal */}
      {pendingAdGroupChange &&
        (() => {
          const adgroup = adgroups.find(
            (ag) => ag.id === pendingAdGroupChange.id
          );
          const adgroupName = adgroup?.name || "Unnamed Ad Group";
          const fieldLabel =
            pendingAdGroupChange.field === "status"
              ? "Status"
              : pendingAdGroupChange.field === "default_bid"
                ? "Default Bid"
                : "Name";

          // Format old value
          let oldValueDisplay = "";
          if (pendingAdGroupChange.field === "default_bid") {
            oldValueDisplay = pendingAdGroupChange.oldValue.startsWith("$")
              ? pendingAdGroupChange.oldValue
              : `$${parseFloat(
                pendingAdGroupChange.oldValue || "0"
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
          } else if (pendingAdGroupChange.field === "status") {
            oldValueDisplay =
              pendingAdGroupChange.oldValue === "enabled"
                ? "Enabled"
                : pendingAdGroupChange.oldValue === "paused"
                  ? "Paused"
                  : pendingAdGroupChange.oldValue === "archived"
                    ? "Archived"
                    : pendingAdGroupChange.oldValue;
          } else {
            // name
            oldValueDisplay = pendingAdGroupChange.oldValue || "—";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingAdGroupChange.field === "default_bid") {
            newValueDisplay = pendingAdGroupChange.newValue.startsWith("$")
              ? pendingAdGroupChange.newValue
              : `$${parseFloat(
                pendingAdGroupChange.newValue || "0"
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
          } else if (pendingAdGroupChange.field === "status") {
            newValueDisplay =
              pendingAdGroupChange.newValue === "enabled"
                ? "Enabled"
                : pendingAdGroupChange.newValue === "paused"
                  ? "Paused"
                  : pendingAdGroupChange.newValue === "archived"
                    ? "Archived"
                    : pendingAdGroupChange.newValue;
          } else {
            // name
            newValueDisplay = pendingAdGroupChange.newValue || "—";
          }

          return (
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !adGroupEditLoading.has(pendingAdGroupChange.id)
                ) {
                  cancelAdGroupChange();
                }
              }}
            >
              <div
                className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                  Confirm {fieldLabel} Change
                </h3>

                <div className="mb-4">
                  <p className="text-[12.16px] text-[#556179] mb-2">
                    Ad Group:{" "}
                    <span className="font-semibold text-[#072929]">
                      {adgroupName}
                    </span>
                  </p>
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[12.16px] text-[#556179]">
                        {fieldLabel}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.16px] text-[#556179]">
                          {oldValueDisplay}
                        </span>
                        <span className="text-[12.16px] text-[#556179]">→</span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {newValueDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelAdGroupChange}
                    disabled={adGroupEditLoading.has(pendingAdGroupChange.id)}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAdGroupChange}
                    disabled={adGroupEditLoading.has(pendingAdGroupChange.id)}
                    className="create-entity-button btn-sm"
                  >
                    {adGroupEditLoading.has(pendingAdGroupChange.id)
                      ? "Updating..."
                      : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

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
                Ad Groups
              </h1>
              <FilterSection
                isOpen={isFilterPanelOpen}
                onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                filters={filters}
                onApply={() => { }} // Not used - FilterSectionPanel handles onApply
                filterFields={ADGROUP_FILTER_FIELDS}
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
              filterFields={ADGROUP_FILTER_FIELDS}
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
                metrics={adgroupMetrics}
                title="Performance Trends"
                isCollapsed={isChartCollapsed}
                onCollapseToggle={toggleChartCollapse}
              />

              {loading && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <Loader size="md" message="Loading chart data..." />
                  </div>
                </div>
              )}
            </div>

            {/* Ad Groups Table Card */}
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
                      {(() => {
                        // Show "Edit Default Bid" only when at least one selected ad group is SD or SP (they have default bid). Hide when all are SB (SB has no default bid).
                        const selectedData = getSelectedAdgroupsData();
                        const allSelectedAreSb =
                          selectedData.length > 0 &&
                          selectedData.every((ag) => {
                            const t = (ag as { type?: string; campaignType?: string; campaign_type?: string }).type
                              ?? (ag as { type?: string; campaignType?: string; campaign_type?: string }).campaignType
                              ?? (ag as { type?: string; campaignType?: string; campaign_type?: string }).campaign_type;
                            return String(t ?? "").toUpperCase() === "SB";
                          });

                        return [
                          { value: "enable", label: "Enabled" },
                          { value: "pause", label: "Paused" },
                          { value: "archive", label: "Archived" },
                          ...(allSelectedAreSb ? [] : [{ value: "edit_bid", label: "Edit Default Bid" }]),
                        ];
                      })().map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedAdgroups.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedAdgroups.size === 0) return;
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
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#136D6D]"></div>
                      </div>
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
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#136D6D] border-t-transparent"></div>
                        <p className="text-[13px] text-[#072929] font-medium">
                          Exporting...
                        </p>
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

            {/* Default Bid editor panel */}
            {selectedAdgroups.size > 0 && showBidPanel && (
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
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                              }`}
                            onClick={() => setBidUnit("percent")}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "amount"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
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
                        className="px-4 py-2 text-[#556179] bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-[11.2px]"
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
                        className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    setSelectedAdgroupsFetched(null);
                    setShowConfirmationModal(false);
                  }
                }}
              >
                <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative">
                  {(bulkLoading || selectedAdgroupsFetching) && (
                    <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
                      <Loader
                        size="md"
                        message={
                          selectedAdgroupsFetching
                            ? "Loading selected ad groups..."
                            : "Updating adgroups..."
                        }
                      />
                    </div>
                  )}
                  <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                    {isBidChange
                      ? "Confirm Default Bid Changes"
                      : "Confirm Status Changes"}
                  </h3>

                  {/* Summary */}
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.16px] text-[#556179]">
                        {selectedAdgroups.size} ad group
                        {selectedAdgroups.size !== 1 ? "s" : ""} will be
                        updated:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {isBidChange ? "Default Bid" : "Status"} change
                      </span>
                    </div>
                  </div>

                  {/* AdGroup Preview Table */}
                  {(() => {
                    const selectedAdgroupsData = getSelectedAdgroupsData();
                    const previewCount = Math.min(
                      10,
                      selectedAdgroupsData.length
                    );
                    const hasMore = selectedAdgroupsData.length > 10;

                    return (
                      <div className="mb-6">
                        <div className="mb-2">
                          <span className="text-[10.64px] text-[#556179]">
                            {hasMore
                              ? `Showing ${previewCount} of ${selectedAdgroupsData.length} selected ad groups`
                              : `${selectedAdgroupsData.length} ad group${selectedAdgroupsData.length !== 1 ? "s" : ""
                              } selected`}
                          </span>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-sandstorm-s20">
                              <tr>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Ad Group Name
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Old Value
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  New Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAdgroupsData
                                .slice(0, previewCount)
                                .map((ag) => {
                                  const bidStr =
                                    typeof ag.default_bid === "string"
                                      ? ag.default_bid
                                      : ag.default_bid != null
                                        ? String(ag.default_bid)
                                        : "$0.00";
                                  const oldBid = parseFloat(
                                    bidStr.replace(/[^0-9.]/g, "") || "0"
                                  );
                                  const oldStatus = normalizeStatusDisplay(ag.status || "Enabled");
                                  const newBid = isBidChange
                                    ? calculateNewBid(oldBid)
                                    : oldBid;
                                  const newStatus = pendingStatusAction
                                    ? normalizeStatusDisplay(pendingStatusAction)
                                    : oldStatus;

                                  return (
                                    <tr
                                      key={ag.adGroupId ?? ag.id}
                                      className="border-b border-gray-200 last:border-b-0"
                                    >
                                      <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                        {ag.name || "Unnamed Ad Group"}
                                      </td>
                                      <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                        {isBidChange
                                          ? formatCurrency(oldBid, ag.profile_currency_code)
                                          : oldStatus}
                                      </td>
                                      <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                        {isBidChange
                                          ? formatCurrency(newBid, ag.profile_currency_code)
                                          : newStatus}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Details */}
                  <div className="space-y-3 mb-6">
                    {isBidChange ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Action:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {bidAction === "increase"
                              ? "Increase By"
                              : bidAction === "decrease"
                                ? "Decrease By"
                                : "Set To"}
                          </span>
                        </div>

                        {(bidAction === "increase" ||
                          bidAction === "decrease") && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                              <span className="text-[12.16px] text-[#556179]">
                                Unit:
                              </span>
                              <span className="text-[12.16px] font-semibold text-[#072929]">
                                {bidUnit === "percent"
                                  ? "Percentage (%)"
                                  : "Amount ($)"}
                              </span>
                            </div>
                          )}

                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Value:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {bidValue} {bidUnit === "percent" ? "%" : "$"}
                          </span>
                        </div>

                        {bidAction === "increase" && upperLimit && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-[12.16px] text-[#556179]">
                              Upper Limit:
                            </span>
                            <span className="text-[12.16px] font-semibold text-[#072929]">
                              ${upperLimit}
                            </span>
                          </div>
                        )}

                        {bidAction === "decrease" && lowerLimit && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-[12.16px] text-[#556179]">
                              Lower Limit:
                            </span>
                            <span className="text-[12.16px] font-semibold text-[#072929]">
                              ${lowerLimit}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-[12.16px] text-[#556179]">
                          New Status:
                        </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {pendingStatusAction
                          ? normalizeStatusDisplay(pendingStatusAction)
                          : ""}
                      </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setSelectedAdgroupsFetched(null);
                        setShowConfirmationModal(false);
                        setPendingStatusAction(null);
                        setIsBidChange(false);
                      }}
                      disabled={bulkLoading || selectedAdgroupsFetching}
                      className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
                      disabled={bulkLoading || selectedAdgroupsFetching}
                      className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0e5a5a] disabled:opacity-50"
                    >
                      {selectedAdgroupsFetching
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
            <AdGroupsTable
              adgroups={adgroups}
              loading={loading}
              campaignDetail={null}
              // campaignId not provided, so all columns including Campaign Name will show
              onSelectAll={(checked) => {
                console.log("Inline onSelectAll called with:", checked);
                console.log(
                  "handleSelectAllAdGroups function:",
                  handleSelectAllAdGroups
                );
                handleSelectAllAdGroups(checked);
              }}
              onSelect={handleSelectAdGroup}
              selectedIds={selectedAdgroups}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              editingField={editingAdGroupField}
              editedValue={editedAdGroupValue}
              onEditStart={handleAdGroupEditStart}
              onEditChange={handleAdGroupEditChange}
              onEditEnd={handleAdGroupEditEnd}
              onEditCancel={handleAdGroupEditCancel}
              inlineEditLoading={adGroupEditLoading}
              pendingChange={pendingAdGroupChange}
              onConfirmChange={confirmAdGroupChange}
              onCancelChange={cancelAdGroupChange}
              summary={summary}
            />
            {/* Pagination */}
            {!loading && adgroups.length > 0 && (
              <div className="flex items-center justify-end mt-4">
                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                  <button
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
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
                  {totalPages > 5 && (
                    <button
                      onClick={() => handlePageChange(totalPages)}
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
                      handlePageChange(Math.min(totalPages, currentPage + 1))
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
    </div>
  );
};
