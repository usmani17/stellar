import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildMarketplaceRoute } from "../utils/urlHelpers";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useDateRange } from "../contexts/DateRangeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { campaignsService, type Keyword } from "../services/campaigns";
import { Checkbox } from "../components/ui/Checkbox";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Dropdown } from "../components/ui/Dropdown";
import { Button } from "../components/ui";
import { type FilterValues } from "../components/filters/FilterPanel";
import {
  FilterSection,
  FilterSectionPanel,
} from "../components/filters/FilterSection";
import {
  PerformanceChart,
  type MetricConfig,
} from "../components/charts/PerformanceChart";
import { ErrorModal } from "../components/ui/ErrorModal";
import { logsService } from "../services/logs";

export const Keywords: React.FC = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { startDate, endDate } = useDateRange();
  const { sidebarWidth } = useSidebar();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [summary, setSummary] = useState<{
    total_keywords: number;
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
  const [selectedKeywords, setSelectedKeywords] = useState<
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

  const keywordMetrics: MetricConfig[] = [
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
      tooltipFormatter: (v) => `${v.toFixed(2)} x`,
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{
    type: "bulk" | "inline";
    keywordId?: string | number;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Inline edit state (matching adgroups pattern)
  const [editingKeywordField, setEditingKeywordField] = useState<{
    id: number;
    field: "status" | "bid";
  } | null>(null);
  const [editedKeywordValue, setEditedKeywordValue] = useState<string>("");
  const [pendingKeywordChange, setPendingKeywordChange] = useState<{
    id: number;
    field: "status" | "bid";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [keywordEditLoading, setKeywordEditLoading] = useState<Set<number>>(
    new Set()
  );

  // Additional inline edit state for the confirmation modal flow
  const [editingCell, setEditingCell] = useState<{
    keywordId: string | number;
    field: "status" | "bid";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [inlineEditKeyword, setInlineEditKeyword] = useState<Keyword | null>(
    null
  );
  const [inlineEditField, setInlineEditField] = useState<
    "status" | "bid" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);

  const toggleChartMetric = (key: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Set page title
  useEffect(() => {
    setPageTitle("Keywords");
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
        loadKeywords(accountIdNum);
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
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        ...buildFilterParams(filters),
      };

      // Add pagination for current_view
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      // Call export API
      const result = await campaignsService.exportKeywords(accountIdNum, {
        ...params,
        export_type: exportType,
      });

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
      console.error("Failed to export keywords:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export keywords. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  const loadKeywords = async (accountId: number) => {
    // Prevent duplicate simultaneous requests
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      const startDateStr = startDate?.toISOString().split("T")[0];
      const endDateStr = endDate?.toISOString().split("T")[0];

      console.log("Keywords - Date range:", {
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

      const response = await campaignsService.getKeywordsList(
        accountId,
        params
      );

      console.log(
        "Keywords - Chart data received:",
        response.chart_data?.length || 0,
        "points"
      );

      setKeywords(Array.isArray(response.keywords) ? response.keywords : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
        console.log(
          "Keywords - Chart data dates:",
          response.chart_data.map((d: any) => d.date)
        );
      }
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadKeywordsWithFilters = async (
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
        start_date: startDate?.toISOString().split("T")[0],
        end_date: endDate?.toISOString().split("T")[0],
        ...buildFilterParams(filterList),
      };

      const response = await campaignsService.getKeywordsList(
        accountId,
        params
      );
      setKeywords(Array.isArray(response.keywords) ? response.keywords : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
      }
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
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
  const startInlineEdit = (keyword: Keyword, field: "bid" | "status") => {
    setEditingCell({ keywordId: keyword.keywordId, field });
    if (field === "bid") {
      // Extract numeric value from formatted string
      const bidValue = parseFloat(
        (keyword.bid || "$0.00").replace(/[^0-9.]/g, "")
      );
      setEditedValue(bidValue.toString());
    } else if (field === "status") {
      // Normalize status to match dropdown options
      const statusLower = (keyword.status || "Enabled").toLowerCase();
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

  const confirmInlineEdit = (newValueOverride?: string) => {
    if (!editingCell || !accountId) return;

    const keyword = keywords.find(
      (k) => (k.keywordId || k.id) === editingCell.keywordId
    );
    if (!keyword) return;

    // Use override value if provided, otherwise use state
    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;

    // Check if value actually changed
    let hasChanged = false;
    if (editingCell.field === "bid") {
      // Parse the new value, handling empty strings
      const newBidStr = valueToCheck.trim();
      const newBid = newBidStr === "" ? 0 : parseFloat(newBidStr);
      const oldBid = parseFloat(
        (keyword.bid || "$0.00").replace(/[^0-9.]/g, "")
      );

      // Check if the value is a valid number and if it changed
      if (isNaN(newBid)) {
        // Invalid number, cancel edit
        cancelInlineEdit();
        return;
      }
      hasChanged = Math.abs(newBid - oldBid) > 0.01;
    } else if (editingCell.field === "status") {
      // Normalize status values for comparison
      const oldValue = (keyword.status || "Enabled").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    }

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    let oldValue = "";
    let newValue = valueToCheck;

    if (editingCell.field === "bid") {
      oldValue = formatCurrency(
        parseFloat((keyword.bid || "$0.00").replace(/[^0-9.]/g, ""))
      );
      newValue = formatCurrency(parseFloat(valueToCheck) || 0);
    } else if (editingCell.field === "status") {
      oldValue = keyword.status || "Enabled";
      newValue = valueToCheck;
    }

    setInlineEditKeyword(keyword);
    setInlineEditField(editingCell.field);
    setInlineEditOldValue(oldValue);
    setInlineEditNewValue(newValue);
    setShowInlineEditModal(true);
    setEditingCell(null);
  };

  const runInlineEdit = async () => {
    if (!inlineEditKeyword || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "status") {
        // Map status values
        const statusMap: Record<string, "enable" | "pause" | "archive"> = {
          Enabled: "enable",
          Paused: "pause",
          Archived: "archive",
        };
        const statusValue = statusMap[inlineEditNewValue] || "enable";

        await campaignsService.bulkUpdateKeywords(accountIdNum, {
          keywordIds: [inlineEditKeyword.keywordId],
          action: "status",
          status: statusValue,
        });
      } else if (inlineEditField === "bid") {
        // Extract numeric value from formatted string
        const bidValue = parseFloat(inlineEditNewValue.replace(/[^0-9.]/g, ""));
        if (isNaN(bidValue)) {
          throw new Error("Invalid bid value");
        }

        await campaignsService.bulkUpdateKeywords(accountIdNum, {
          keywordIds: [inlineEditKeyword.keywordId],
          action: "bid",
          bid: bidValue,
        });
      }

      // Reload keywords to show updated values
      await loadKeywords(accountIdNum);
      setShowInlineEditModal(false);
      setInlineEditKeyword(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    } catch (error: any) {
      console.error("Error updating keyword:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update keyword. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
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

  const formatCurrency = (value: string | number) => {
    const numValue =
      typeof value === "string"
        ? parseFloat(value.replace(/[^0-9.-]+/g, ""))
        : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue || 0);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Bulk action handlers
  const runBulkStatus = async (statusValue: "enable" | "pause" | "archive") => {
    if (!accountId || selectedKeywords.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      // Get keywordIds from selected keywords - use keywordId from the keyword objects
      const selectedKeywordsData = getSelectedKeywordsData();
      const keywordIds = selectedKeywordsData
        .map((k) => k.keywordId || k.id)
        .filter(Boolean);

      await campaignsService.bulkUpdateKeywords(accountIdNum, {
        keywordIds: keywordIds,
        action: "status",
        status: statusValue,
      });
      await loadKeywords(accountIdNum);
      setSelectedKeywords(new Set());
      setShowConfirmationModal(false);
      setPendingStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update keywords", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update keywords. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkBid = async () => {
    if (!accountId || selectedKeywords.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(bidValue);
    if (isNaN(valueNum)) {
      return;
    }

    try {
      setBulkLoading(true);

      // Get selected keywords with their current bids
      const selectedKeywordsData = getSelectedKeywordsData();
      const updates: Array<{ keywordId: string | number; newBid: number }> = [];

      for (const keyword of selectedKeywordsData) {
        // Extract current bid from formatted string
        const currentBid = parseFloat(
          (keyword.bid || "$0.00").replace(/[^0-9.]/g, "")
        );
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

        updates.push({
          keywordId: keyword.keywordId,
          newBid: Math.round(newBid * 100) / 100,
        });
      }

      // Update each keyword individually
      for (const update of updates) {
        await campaignsService.bulkUpdateKeywords(accountIdNum, {
          keywordIds: [update.keywordId],
          action: "bid",
          bid: update.newBid,
        });
      }

      await loadKeywords(accountIdNum);
      setSelectedKeywords(new Set());
      setShowConfirmationModal(false);
      setShowBidPanel(false);
      setBidValue("");
      setUpperLimit("");
      setLowerLimit("");
    } catch (error: any) {
      console.error("Failed to update keywords", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update keywords. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedKeywordsData = () => {
    return keywords.filter((k) => selectedKeywords.has(k.keywordId || k.id));
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!accountId || selectedKeywords.size === 0 || !pendingDeleteAction)
      return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setDeleteLoading(true);
      const selectedKeywordsData = getSelectedKeywordsData();
      const keywordIds = selectedKeywordsData
        .map((k) => k.keywordId || k.id)
        .filter(Boolean);

      const response = await campaignsService.bulkDeleteKeywords(accountIdNum, {
        keywordIdFilter: {
          include: keywordIds,
        },
      });

      // Log the delete operation
      const keywordNames = selectedKeywordsData
        .map((k) => k.name || "Unnamed Keyword")
        .join(", ");
      try {
        await logsService.createLog(accountIdNum, {
          entity: "keyword",
          field: "delete",
          old_value: keywordNames,
          new_value: "",
          method: "Bulk",
        });
      } catch (logError) {
        console.error("Failed to log delete operation:", logError);
      }

      // Handle response with success/error arrays
      if (response?.keywords) {
        const errors = response.keywords.error || [];
        const successes = response.keywords.success || [];

        if (errors.length > 0) {
          const errorMessages = errors
            .map((err: any) => {
              const errorDetails = err.errors?.[0]?.errorValue;
              if (errorDetails) {
                return Object.values(errorDetails)
                  .map((e: any) => e?.message || "Unknown error")
                  .join(", ");
              }
              return "Unknown error";
            })
            .join("; ");
          setErrorModal({
            isOpen: true,
            message: `Some keywords could not be deleted: ${errorMessages}`,
          });
        }

        if (successes.length > 0) {
          await loadKeywords(accountIdNum);
          setSelectedKeywords(new Set());
        }
      } else {
        // If response format is different, just reload
        await loadKeywords(accountIdNum);
        setSelectedKeywords(new Set());
      }

      setShowDeleteConfirmation(false);
      setPendingDeleteAction(null);
    } catch (error: any) {
      console.error("Failed to delete keywords", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete keywords. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Inline delete handler
  const handleInlineDelete = async (
    keywordId: string | number,
    keywordName: string
  ) => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setDeleteLoading(true);
      const response = await campaignsService.bulkDeleteKeywords(accountIdNum, {
        keywordIdFilter: {
          include: [keywordId],
        },
      });

      // Log the delete operation
      try {
        await logsService.createLog(accountIdNum, {
          entity: "keyword",
          field: "delete",
          old_value: keywordName,
          new_value: "",
          method: "Inline",
        });
      } catch (logError) {
        console.error("Failed to log delete operation:", logError);
      }

      // Handle response
      if (response?.keywords) {
        const errors = response.keywords.error || [];
        const successes = response.keywords.success || [];

        if (errors.length > 0) {
          const errorDetails = errors[0]?.errors?.[0]?.errorValue;
          const errorMessage = errorDetails
            ? Object.values(errorDetails)
                .map((e: any) => e?.message || "Unknown error")
                .join(", ")
            : "Failed to delete keyword";
          setErrorModal({
            isOpen: true,
            message: errorMessage,
          });
        }

        if (successes.length > 0) {
          await loadKeywords(accountIdNum);
        }
      } else {
        await loadKeywords(accountIdNum);
      }
    } catch (error: any) {
      console.error("Failed to delete keyword", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete keyword. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Generate chart data based on keywords and date range
  const chartData = useMemo(() => {
    // Use chart data from API if available, otherwise generate from keywords
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

  const allSelected =
    keywords.length > 0 &&
    keywords.every((k) => selectedKeywords.has(k.keywordId || k.id));
  const someSelected =
    keywords.some((k) => selectedKeywords.has(k.keywordId || k.id)) &&
    !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(keywords.map((k) => k.keywordId || k.id));
      setSelectedKeywords(allIds);
    } else {
      setSelectedKeywords(new Set());
    }
  };

  // Define filter fields for Keywords
  const KEYWORD_FILTER_FIELDS = [
    { value: "name", label: "Keyword Name" },
    { value: "state", label: "State" },
    { value: "bid", label: "Keyword Bid" },
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
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#136D6D] border-t-transparent"></div>
            <p className="text-[16px] text-[#072929] font-medium">
              Exporting Keywords...
            </p>
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
                Keywords
              </h1>
              <FilterSection
                isOpen={isFilterPanelOpen}
                onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                filters={filters}
                onApply={() => {}} // Not used - FilterSectionPanel handles onApply
                filterFields={KEYWORD_FILTER_FIELDS}
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
                // useEffect will handle the API call when filters change
              }}
              filterFields={KEYWORD_FILTER_FIELDS}
              initialFilters={filters}
              accountId={accountId}
              channelType="amazon"
            />

            {/* Chart Section */}
            <PerformanceChart
              data={chartData}
              toggles={chartToggles}
              onToggle={toggleChartMetric}
              metrics={keywordMetrics}
              title="Performance Trends"
            />

            {/* Keywords Table Card */}
            {/* Table Header */}
            <div className="flex items-center justify-end gap-2">
              <div
                className="relative inline-flex justify-end"
                ref={dropdownRef}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal"
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
                    Edit
                  </span>
                </Button>
                {showBulkActions && (
                  <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                    <div className="overflow-y-auto">
                      {[
                        { value: "enable", label: "Enabled" },
                        { value: "pause", label: "Paused" },
                        { value: "archive", label: "Archived" },
                        { value: "edit_bid", label: "Edit Keyword Bid" },
                        { value: "delete", label: "Delete" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedKeywords.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedKeywords.size === 0) return;
                            if (opt.value === "edit_bid") {
                              setShowBidPanel(true);
                            } else if (opt.value === "delete") {
                              setShowBidPanel(false);
                              setPendingDeleteAction({ type: "bulk" });
                              setShowDeleteConfirmation(true);
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
                    className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Keyword Bid editor panel */}
            {selectedKeywords.size > 0 && showBidPanel && (
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
                        buttonClassName="w-full bg-[#FEFEFB]"
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
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                              bidUnit === "percent"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                            }`}
                            onClick={() => setBidUnit("percent")}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                              bidUnit === "amount"
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
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowConfirmationModal(false);
                  }
                }}
              >
                <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                    {isBidChange
                      ? "Confirm Keyword Bid Changes"
                      : "Confirm Status Changes"}
                  </h3>

                  {/* Summary */}
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.16px] text-[#556179]">
                        {selectedKeywords.size} keyword
                        {selectedKeywords.size !== 1 ? "s" : ""} will be
                        updated:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {isBidChange ? "Keyword Bid" : "Status"} change
                      </span>
                    </div>
                  </div>

                  {/* Keyword Preview Table */}
                  {(() => {
                    const selectedKeywordsData = getSelectedKeywordsData();
                    const previewCount = Math.min(
                      10,
                      selectedKeywordsData.length
                    );
                    const hasMore = selectedKeywordsData.length > 10;

                    return (
                      <div className="mb-6">
                        <div className="mb-2">
                          <span className="text-[10.64px] text-[#556179]">
                            {hasMore
                              ? `Showing ${previewCount} of ${selectedKeywordsData.length} selected keywords`
                              : `${selectedKeywordsData.length} keyword${
                                  selectedKeywordsData.length !== 1 ? "s" : ""
                                } selected`}
                          </span>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-sandstorm-s20">
                              <tr>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Keyword Name
                                </th>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Current{" "}
                                  {isBidChange ? "Keyword Bid" : "Status"}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedKeywordsData
                                .slice(0, previewCount)
                                .map((keyword) => (
                                  <tr
                                    key={keyword.id}
                                    className="border-b border-gray-200"
                                  >
                                    <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                      {keyword.name || "Unnamed Keyword"}
                                    </td>
                                    <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                      {isBidChange
                                        ? keyword.bid || "$0.00"
                                        : keyword.status || "Enabled"}
                                    </td>
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
                      }}
                      disabled={bulkLoading}
                      className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
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
                      disabled={bulkLoading}
                      className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0e5a5a] disabled:opacity-50"
                    >
                      {bulkLoading ? "Updating..." : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowDeleteConfirmation(false);
                    setPendingDeleteAction(null);
                  }
                }}
              >
                <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 p-6">
                  <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                    Confirm Delete
                  </h3>
                  <p className="text-[13.3px] text-[#556179] mb-6">
                    {pendingDeleteAction?.type === "bulk"
                      ? `Are you sure you want to delete ${
                          selectedKeywords.size
                        } selected keyword${
                          selectedKeywords.size !== 1 ? "s" : ""
                        }? This action cannot be undone.`
                      : "Are you sure you want to delete this keyword? This action cannot be undone."}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirmation(false);
                        setPendingDeleteAction(null);
                      }}
                      disabled={deleteLoading}
                      className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (pendingDeleteAction?.type === "bulk") {
                          handleBulkDelete();
                        }
                      }}
                      disabled={deleteLoading}
                      className="px-4 py-2 text-[12.16px] text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleteLoading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                {loading ? (
                  <div className="text-center py-8 text-[#556179] text-[13.3px]">
                    Loading keywords...
                  </div>
                ) : keywords.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[13.3px] text-[#556179] mb-4">
                      No keywords found
                    </p>
                  </div>
                ) : (
                  <table className="min-w-[1200px] w-full">
                    <thead>
                      <tr className="border-b border-[#e8e8e3]">
                        {/* Checkbox Header */}
                        <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={allSelected}
                              indeterminate={someSelected && !allSelected}
                              onChange={handleSelectAll}
                              size="small"
                            />
                          </div>
                        </th>

                        {/* Ad Group Name */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[150px] max-w-[200px]`}
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Keyword Name
                            {getSortIcon("name")}
                          </div>
                        </th>

                        {/* State */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[115px]`}
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center gap-1">
                            State
                            {getSortIcon("status")}
                          </div>
                        </th>

                        {/* Keyword Bid */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("bid")}
                        >
                          <div className="flex items-center gap-1">
                            Keyword Bid
                            {getSortIcon("bid")}
                          </div>
                        </th>

                        {/* Campaign Name */}
                        <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] min-w-[150px] max-w-[200px]">
                          Campaign Name
                        </th>

                        {/* Profile */}
                        <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                          Profile
                        </th>

                        {/* Type */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("type")}
                        >
                          <div className="flex items-center gap-1">
                            Type
                            {getSortIcon("type")}
                          </div>
                        </th>

                        {/* Spends */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("spends")}
                        >
                          <div className="flex items-center gap-1">
                            Spends
                            {getSortIcon("spends")}
                          </div>
                        </th>

                        {/* Sales */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("sales")}
                        >
                          <div className="flex items-center gap-1">
                            Sales
                            {getSortIcon("sales")}
                          </div>
                        </th>

                        {/* Impressions */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("impressions")}
                        >
                          <div className="flex items-center gap-1">
                            Impressions
                            {getSortIcon("impressions")}
                          </div>
                        </th>

                        {/* Clicks */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("clicks")}
                        >
                          <div className="flex items-center gap-1">
                            Clicks
                            {getSortIcon("clicks")}
                          </div>
                        </th>

                        {/* CTR */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("ctr")}
                        >
                          <div className="flex items-center gap-1">
                            CTR
                            {getSortIcon("ctr")}
                          </div>
                        </th>

                        {/* ACOS */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
                          onClick={() => handleSort("acos")}
                        >
                          <div className="flex items-center gap-1">
                            ACOS
                            {getSortIcon("acos")}
                          </div>
                        </th>

                        {/* ROAS */}
                        <th
                          className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50`}
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
                      {/* Summary Row */}
                      {summary && (
                        <tr className="bg-[#f5f5f0] font-semibold">
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            Total ({summary.total_keywords})
                          </td>
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {formatCurrency(summary.total_spends)}
                          </td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {formatCurrency(summary.total_sales)}
                          </td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {summary.total_impressions.toLocaleString()}
                          </td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {summary.total_clicks.toLocaleString()}
                          </td>
                          <td className="py-[10px] px-[10px]"></td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {summary.avg_acos.toFixed(2)}%
                          </td>
                          <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {summary.avg_roas.toFixed(2)}x
                          </td>
                        </tr>
                      )}
                      {keywords.map((keyword, index) => {
                        const isLastRow = index === keywords.length - 1;
                        return (
                          <tr
                            key={keyword.id}
                            className={`${
                              !isLastRow ? "border-b border-[#e8e8e3]" : ""
                            } hover:bg-gray-50 transition-colors`}
                          >
                            {/* Checkbox */}
                            <td className="py-[10px] px-[10px]">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={selectedKeywords.has(
                                    keyword.keywordId || keyword.id
                                  )}
                                  onChange={(checked) => {
                                    const keywordId =
                                      keyword.keywordId || keyword.id;
                                    if (checked) {
                                      setSelectedKeywords((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.add(keywordId);
                                        return newSet;
                                      });
                                    } else {
                                      setSelectedKeywords((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(keywordId);
                                        return newSet;
                                      });
                                    }
                                  }}
                                  size="small"
                                />
                              </div>
                            </td>

                            {/* Keyword Name */}
                            <td className="py-[10px] px-[10px] min-w-[150px] max-w-[200px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] text-left truncate block w-full">
                                {keyword.name || "Unnamed Keyword"}
                              </span>
                            </td>

                            {/* State */}
                            <td className="py-[10px] px-[10px] min-w-[115px]">
                              {editingCell?.keywordId === keyword.keywordId &&
                              editingCell?.field === "status" ? (
                                <Dropdown
                                  options={[
                                    { value: "Enabled", label: "Enabled" },
                                    { value: "Paused", label: "Paused" },
                                    { value: "Archived", label: "Archived" },
                                  ]}
                                  value={
                                    editedValue ||
                                    (() => {
                                      const statusLower = (
                                        keyword.status || "Enabled"
                                      ).toLowerCase();
                                      return statusLower === "enable" ||
                                        statusLower === "enabled"
                                        ? "Enabled"
                                        : statusLower === "paused"
                                        ? "Paused"
                                        : statusLower === "archived"
                                        ? "Archived"
                                        : "Enabled";
                                    })()
                                  }
                                  onChange={(val) => {
                                    const newValue = val as string;
                                    handleInlineEditChange(newValue);
                                    setTimeout(() => {
                                      confirmInlineEdit(newValue);
                                    }, 100);
                                  }}
                                  onClose={() => {
                                    cancelInlineEdit();
                                  }}
                                  defaultOpen={true}
                                  closeOnSelect={true}
                                  buttonClassName="w-full text-[13.3px] px-2 py-1"
                                  width="w-full"
                                  align="center"
                                />
                              ) : (
                                <div
                                  onClick={() =>
                                    startInlineEdit(keyword, "status")
                                  }
                                  className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                >
                                  <StatusBadge
                                    status={keyword.status || "Enabled"}
                                  />
                                </div>
                              )}
                            </td>

                            {/* Keyword Bid */}
                            <td className="py-[10px] px-[10px]">
                              {editingCell?.keywordId === keyword.keywordId &&
                              editingCell?.field === "bid" ? (
                                <div className="flex items-center justify-center">
                                  <input
                                    type="number"
                                    value={editedValue}
                                    onChange={(e) =>
                                      handleInlineEditChange(e.target.value)
                                    }
                                    onBlur={(e) => {
                                      const inputValue = e.target.value;
                                      confirmInlineEdit(inputValue);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                      } else if (e.key === "Escape") {
                                        cancelInlineEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
                                  />
                                </div>
                              ) : (
                                <p
                                  onClick={() =>
                                    startInlineEdit(keyword, "bid")
                                  }
                                  className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                >
                                  {keyword.bid || "$0.00"}
                                </p>
                              )}
                            </td>

                            {/* Campaign Name */}
                            <td className="py-[10px] px-[10px] min-w-[150px] max-w-[200px]">
                              <button
                                onClick={() => {
                                  if (accountId && keyword.campaignId) {
                                    navigate(
                                      buildMarketplaceRoute(
                                        parseInt(accountId),
                                        "amazon",
                                        "campaigns",
                                        `${
                                          keyword.type?.toLowerCase() || "sp"
                                        }_${keyword.campaignId}`
                                      )
                                    );
                                  }
                                }}
                                className="text-[13.3px] text-[#0b0f16] leading-[1.26] hover:text-[#136d6d] hover:underline cursor-pointer text-left truncate block w-full"
                              >
                                {keyword.campaign_name || "—"}
                              </button>
                            </td>

                            {/* Profile */}
                            <td className="py-[10px] px-[10px] min-w-[150px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                                {keyword.profile_name &&
                                keyword.profile_name.trim() !== ""
                                  ? keyword.profile_name
                                  : "—"}
                              </span>
                            </td>

                            {/* Type */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-semibold text-[#7a4dff]">
                                {keyword.type || "SP"}
                              </span>
                            </td>

                            {/* Spends */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {keyword.spends || "$0.00"}
                              </span>
                            </td>

                            {/* Sales */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {keyword.sales || "$0.00"}
                              </span>
                            </td>

                            {/* Impressions */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {(keyword.impressions || 0).toLocaleString()}
                              </span>
                            </td>

                            {/* Clicks */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {(keyword.clicks || 0).toLocaleString()}
                              </span>
                            </td>

                            {/* CTR */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {keyword.ctr || "0.00%"}
                              </span>
                            </td>

                            {/* ACOS */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {keyword.acos
                                  ? `${parseFloat(keyword.acos).toFixed(2)}%`
                                  : "0.00%"}
                              </span>
                            </td>

                            {/* ROAS */}
                            <td className="py-[10px] px-[10px]">
                              <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                {keyword.roas
                                  ? `${parseFloat(keyword.roas).toFixed(2)} x`
                                  : "0.00 x"}
                              </span>
                            </td>

                            {/* Delete Icon - Show on hover */}
                            <td className="py-[10px] px-[10px] w-[40px] relative group">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const keywordId =
                                    keyword.keywordId || keyword.id;
                                  const keywordName =
                                    keyword.name || "Unnamed Keyword";
                                  if (keywordId) {
                                    handleInlineDelete(keywordId, keywordName);
                                  }
                                }}
                                disabled={deleteLoading}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                                title="Delete keyword"
                              >
                                <svg
                                  className="w-4 h-4 text-red-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pagination */}
            {!loading && keywords.length > 0 && (
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
                  {totalPages > 5 && (
                    <button
                      onClick={() => handlePageChange(totalPages)}
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

      {/* Inline Edit Confirmation Modal for Keywords */}
      {pendingKeywordChange && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              !keywordEditLoading.has(pendingKeywordChange.id)
            ) {
              cancelKeywordChange();
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm{" "}
              {pendingKeywordChange.field === "status" ? "Status" : "Bid"}{" "}
              Change
            </h3>

            <div className="mb-4">
              {(() => {
                const keyword = keywords.find(
                  (kw) => kw.id === pendingKeywordChange.id
                );
                const keywordName = keyword?.name || "Unnamed Keyword";
                const fieldLabel =
                  pendingKeywordChange.field === "status" ? "Status" : "Bid";

                // Format old value
                let oldValueDisplay = "";
                if (pendingKeywordChange.field === "bid") {
                  oldValueDisplay = pendingKeywordChange.oldValue.startsWith(
                    "$"
                  )
                    ? pendingKeywordChange.oldValue
                    : `$${parseFloat(
                        pendingKeywordChange.oldValue || "0"
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`;
                } else if (pendingKeywordChange.field === "status") {
                  oldValueDisplay =
                    pendingKeywordChange.oldValue === "enabled"
                      ? "Enabled"
                      : pendingKeywordChange.oldValue === "paused"
                      ? "Paused"
                      : "Archived";
                }

                // Format new value
                let newValueDisplay = "";
                if (pendingKeywordChange.field === "bid") {
                  newValueDisplay = `$${parseFloat(
                    pendingKeywordChange.newValue || "0"
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                } else if (pendingKeywordChange.field === "status") {
                  newValueDisplay =
                    pendingKeywordChange.newValue === "enabled"
                      ? "Enabled"
                      : pendingKeywordChange.newValue === "paused"
                      ? "Paused"
                      : "Archived";
                }

                return (
                  <>
                    <p className="text-[12.16px] text-[#556179] mb-2">
                      Keyword:{" "}
                      <span className="font-semibold text-[#072929]">
                        {keywordName}
                      </span>
                    </p>
                    <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[12.16px] text-[#556179]">
                          {fieldLabel}:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12.16px] text-[#556179]">
                            {oldValueDisplay}
                          </span>
                          <span className="text-[12.16px] text-[#556179]">
                            →
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {newValueDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={cancelKeywordChange}
                disabled={keywordEditLoading.has(pendingKeywordChange.id)}
                className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmKeywordChange}
                disabled={keywordEditLoading.has(pendingKeywordChange.id)}
                className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
              >
                {keywordEditLoading.has(pendingKeywordChange.id)
                  ? "Updating..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
