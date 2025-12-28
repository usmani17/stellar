import { buildMarketplaceRoute } from "../../utils/urlHelpers";
import { parseDateToYYYYMMDD } from "../../utils/dateHelpers";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Button } from "../../components/ui";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Dropdown } from "../../components/ui/Dropdown";
import { Banner } from "../../components/ui/Banner";
import {
  FilterPanel,
  type FilterValues,
} from "../../components/filters/FilterPanel";
import { campaignsService } from "../../services/campaigns";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import {
  GoogleCampaignsTable,
  type GoogleCampaign,
} from "./components/GoogleCampaignsTable";

// GoogleCampaign interface is now imported from GoogleCampaignsTable

export const GoogleCampaigns: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [campaigns, setCampaigns] = useState<GoogleCampaign[]>([]);
  const [summary, setSummary] = useState<{
    total_campaigns: number;
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
      impressions?: number;
      clicks?: number;
      acos?: number;
      roas?: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncingAnalytics, setSyncingAnalytics] = useState(false);
  const [analyticsSyncMessage, setAnalyticsSyncMessage] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);

  // Chart toggles (visual parity with Amazon Campaigns)
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    impressions: false,
    clicks: false,
    acos: false,
    roas: false,
  });

  // Selection and bulk actions
  const [selectedCampaigns, setSelectedCampaigns] = useState<
    Set<string | number>
  >(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [budgetAction, setBudgetAction] = useState<
    "increase" | "decrease" | "set"
  >("increase");
  const [budgetUnit, setBudgetUnit] = useState<"percent" | "amount">("percent");
  const [budgetValue, setBudgetValue] = useState<string>("");
  const [upperLimit, setUpperLimit] = useState<string>("");
  const [lowerLimit, setLowerLimit] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "ENABLED" | "PAUSED" | "REMOVED" | null
  >(null);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    campaignId: string | number;
    field: "budget" | "status" | "start_date" | "end_date";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [updatingField, setUpdatingField] = useState<{
    campaignId: string | number;
    field: "budget" | "status" | "start_date" | "end_date";
  } | null>(null);
  const [inlineEditCampaign, setInlineEditCampaign] =
    useState<GoogleCampaign | null>(null);
  const [inlineEditField, setInlineEditField] = useState<
    "budget" | "status" | "start_date" | "end_date" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    campaignId: string | number;
    newStatus: string;
    oldStatus: string;
  } | null>(null);
  const [pendingBudgetChange, setPendingBudgetChange] = useState<{
    campaignId: string | number;
    newBudget: number;
    oldBudget: number;
  } | null>(null);
  const [pendingDateChange, setPendingDateChange] = useState<{
    campaignId: string | number;
    field: "start_date" | "end_date";
    newDate: string;
    oldDate: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<"current_view" | "all_data">(
    "current_view"
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowBulkActions(false);
      }
    };

    if (showBulkActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActions]);

  // Close budget panel when no campaigns are selected
  useEffect(() => {
    if (selectedCampaigns.size === 0) {
      setShowBudgetPanel(false);
    }
  }, [selectedCampaigns.size]);

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

  // Set page title
  useEffect(() => {
    setPageTitle("Google Campaigns");
    return () => {
      resetPageTitle();
    };
  }, []);

  useEffect(() => {
    // Don't reload if we're currently sorting (handleSort will handle the reload)
    // Also don't reload when sortBy/sortOrder changes (handleSort handles that)
    if (sorting) return;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadCampaigns(accountIdNum);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [accountId, currentPage, filters, startDate, endDate]);

  const buildFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    filterList.forEach((filter) => {
      if (filter.field === "campaign_name") {
        if (filter.operator === "contains") {
          params.campaign_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.campaign_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.campaign_name = filter.value;
        }
      } else if (filter.field === "budget") {
        if (filter.operator === "lt") {
          params.budget__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.budget__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.budget = filter.value;
        } else if (filter.operator === "lte") {
          params.budget__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.budget__gte = filter.value;
        }
      } else if (filter.field === "status") {
        params.status = filter.value;
      } else if (filter.field === "advertising_channel_type") {
        params.advertising_channel_type = filter.value;
      } else if (filter.field === "account_name") {
        if (filter.operator === "contains") {
          params.account_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.account_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.account_name = filter.value;
        }
      }
    });

    return params;
  };

  const loadCampaignsWithFilters = async (
    accountId: number,
    filterList: FilterValues
  ) => {
    try {
      setLoading(true);
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        page: 1,
        page_size: itemsPerPage,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        ...buildFilterParams(filterList),
      };

      const response = await campaignsService.getGoogleCampaigns(
        accountId,
        params
      );
      setCampaigns(Array.isArray(response.campaigns) ? response.campaigns : []);
      setTotalPages(response.total_pages || 0);
      setTotal(response.total || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      // Store chart data from API if available
      const responseWithChart = response as any;
      if (
        responseWithChart.chart_data &&
        Array.isArray(responseWithChart.chart_data)
      ) {
        setChartDataFromApi(responseWithChart.chart_data);
      } else {
        setChartDataFromApi([]);
      }
      setSelectedCampaigns(new Set());
    } catch (error) {
      console.error("Failed to load Google campaigns:", error);
      setCampaigns([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async (accountId: number) => {
    try {
      setLoading(true);
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        page: currentPage,
        page_size: itemsPerPage,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        ...buildFilterParams(filters),
      };

      const response = await campaignsService.getGoogleCampaigns(
        accountId,
        params
      );
      console.log("Google campaigns API response:", response);
      console.log("Campaigns array:", response.campaigns);
      console.log("Campaigns length:", response.campaigns?.length);
      if (response.campaigns && response.campaigns.length > 0) {
        console.log(
          "First campaign:",
          JSON.stringify(response.campaigns[0], null, 2)
        );
        console.log("First campaign id:", response.campaigns[0].id);
        console.log(
          "First campaign campaign_id:",
          response.campaigns[0].campaign_id
        );
      }
      const campaignsArray = Array.isArray(response.campaigns)
        ? response.campaigns
        : [];
      console.log("Setting campaigns array, length:", campaignsArray.length);
      setCampaigns(campaignsArray);
      setTotalPages(response.total_pages || 0);
      setTotal(response.total || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      // Store chart data from API if available
      const responseWithChart = response as any;
      console.log("🔍 [CHART DEBUG] Checking for chart_data in response:", {
        hasChartData: !!responseWithChart.chart_data,
        chartDataType: typeof responseWithChart.chart_data,
        isArray: Array.isArray(responseWithChart.chart_data),
        chartDataLength: responseWithChart.chart_data?.length,
        chartDataPreview: responseWithChart.chart_data?.slice(0, 3),
        fullResponseKeys: Object.keys(responseWithChart),
      });
      if (
        responseWithChart.chart_data &&
        Array.isArray(responseWithChart.chart_data)
      ) {
        console.log(
          "✅ [CHART DEBUG] Setting chart data, length:",
          responseWithChart.chart_data.length
        );
        setChartDataFromApi(responseWithChart.chart_data);
      } else {
        console.log(
          "❌ [CHART DEBUG] No chart_data found or not an array, setting empty array"
        );
        setChartDataFromApi([]);
      }
      // Clear selection when campaigns reload
      setSelectedCampaigns(new Set());
    } catch (error) {
      console.error("Failed to load Google campaigns:", error);
      setCampaigns([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncing(true);
      setSyncMessage(null);
      const result = await campaignsService.syncGoogleCampaigns(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} campaigns`;

      if (result.errors && result.errors.length > 0) {
        const errorDetails = (result as any).error_details || result.errors;
        const errorText = errorDetails.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage(message);

      // Reset to first page and reload campaigns after sync
      if (result.synced > 0) {
        setCurrentPage(1);
        // Small delay to ensure database is updated
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadCampaigns(accountIdNum);

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage(null), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage(null), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync campaigns:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync campaigns from Google Ads";
      setSyncMessage(errorMessage);
      setTimeout(() => setSyncMessage(null), 8000);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAnalytics = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAnalytics(true);
      setAnalyticsSyncMessage(null);

      // Use date range from context if available, otherwise use last 30 days
      const result = await campaignsService.syncGoogleCampaignAnalytics(
        accountIdNum,
        startDate ? startDate.toISOString().split("T")[0] : undefined,
        endDate ? endDate.toISOString().split("T")[0] : undefined
      );

      let message =
        result.message ||
        `Successfully synced analytics: ${
          result.rows_inserted || 0
        } inserted, ${result.rows_updated || 0} updated`;

      if (result.errors && result.errors.length > 0) {
        const errorDetails = (result as any).error_details || result.errors;
        const errorText = errorDetails.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setAnalyticsSyncMessage(message);

      // Reload campaigns to show updated analytics
      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadCampaigns(accountIdNum);
      }

      if ((result.rows_inserted || 0) > 0 && !result.errors) {
        setTimeout(() => setAnalyticsSyncMessage(null), 5000);
      } else if (result.errors) {
        setTimeout(() => setAnalyticsSyncMessage(null), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync campaign analytics from Google Ads";
      setAnalyticsSyncMessage(errorMessage);
      setTimeout(() => setAnalyticsSyncMessage(null), 8000);
    } finally {
      setSyncingAnalytics(false);
    }
  };

  const handleSort = async (column: string) => {
    if (sorting) return; // Prevent multiple simultaneous sorts

    const newSortBy = column;
    const newSortOrder =
      sortBy === column ? (sortOrder === "asc" ? "desc" : "asc") : "asc";

    // Show sorting indicator immediately
    setSorting(true);

    // Update state
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);

    // Reload campaigns with new sort
    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        try {
          const params: any = {
            sort_by: newSortBy,
            order: newSortOrder,
            page: 1,
            page_size: itemsPerPage,
            start_date: startDate
              ? startDate.toISOString().split("T")[0]
              : undefined,
            end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
            ...buildFilterParams(filters),
          };

          const response = await campaignsService.getGoogleCampaigns(
            accountIdNum,
            params
          );
          setCampaigns(
            Array.isArray(response.campaigns) ? response.campaigns : []
          );
          setTotalPages(response.total_pages || 0);
          setTotal(response.total || 0);
          if (response.summary) {
            setSummary(response.summary);
          }
          // Update chart data if available
          const responseWithChart = response as any;
          if (
            responseWithChart.chart_data &&
            Array.isArray(responseWithChart.chart_data)
          ) {
            setChartDataFromApi(responseWithChart.chart_data);
          } else {
            setChartDataFromApi([]);
          }
          setSelectedCampaigns(new Set()); // Clear selection
        } catch (error) {
          console.error("Failed to sort campaigns:", error);
        } finally {
          // Small delay for smooth UX
          setTimeout(() => {
            setSorting(false);
          }, 300);
        }
      } else {
        setSorting(false);
      }
    } else {
      setSorting(false);
    }
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

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(new Set(campaigns.map((c) => c.campaign_id)));
    } else {
      setSelectedCampaigns(new Set());
    }
  };

  const handleSelectCampaign = (
    campaignId: string | number,
    checked: boolean
  ) => {
    const newSelected = new Set(selectedCampaigns);
    if (checked) {
      newSelected.add(campaignId);
    } else {
      newSelected.delete(campaignId);
    }
    setSelectedCampaigns(newSelected);
    // Close budget panel when selection changes
    if (newSelected.size === 0) {
      setShowBudgetPanel(false);
    }
  };

  // Inline edit handlers
  const startInlineEdit = (
    campaign: GoogleCampaign,
    field: "budget" | "status" | "start_date" | "end_date"
  ) => {
    setEditingCell({ campaignId: campaign.campaign_id, field });
    if (field === "budget") {
      setEditedValue((campaign.daily_budget || 0).toString());
    } else if (field === "status") {
      setEditedValue(campaign.status || "ENABLED");
    } else if (field === "start_date") {
      // Format date as YYYY-MM-DD for input using utility function to avoid timezone issues
      setEditedValue(parseDateToYYYYMMDD(campaign.start_date));
    } else if (field === "end_date") {
      // Format date as YYYY-MM-DD for input using utility function to avoid timezone issues
      setEditedValue(parseDateToYYYYMMDD(campaign.end_date));
    }
  };

  const cancelInlineEdit = () => {
    setIsCancelling(true);
    setEditingCell(null);
    setEditedValue("");
    // Reset cancel flag after a short delay to allow onBlur to check it
    setTimeout(() => {
      setIsCancelling(false);
    }, 100);
  };

  const handleInlineEditChange = (value: string) => {
    setEditedValue(value);
  };

  const confirmInlineEdit = (
    newValueOverride?: string,
    skipModal: boolean = false
  ) => {
    if (!editingCell || !accountId || isCancelling) return;

    const campaign = campaigns.find(
      (c) => c.campaign_id === editingCell.campaignId
    );
    if (!campaign) return;

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;
    let hasChanged = false;
    let validationError = "";

    if (editingCell.field === "budget") {
      const newBudgetStr = valueToCheck.trim();
      const newBudget = newBudgetStr === "" ? 0 : parseFloat(newBudgetStr);
      const oldBudget = campaign.daily_budget || 0;
      if (isNaN(newBudget)) {
        cancelInlineEdit();
        return;
      }
      hasChanged = Math.abs(newBudget - oldBudget) > 0.01;
    } else if (editingCell.field === "status") {
      const oldValue = (campaign.status || "ENABLED").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    } else if (editingCell.field === "start_date") {
      // Normalize dates to YYYY-MM-DD format for comparison using utility function
      const oldValue = parseDateToYYYYMMDD(campaign.start_date);
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;

      console.log("[start_date] Date comparison:", {
        campaignId: editingCell.campaignId,
        oldValue,
        newValue,
        hasChanged,
        rawStartDate: campaign.start_date,
      });

      // Validate: start date cannot be in the past
      // Compare YYYY-MM-DD strings directly to avoid timezone issues
      if (newValue) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        if (newValue < todayStr) {
          validationError = "Start date cannot be in the past";
          alert(validationError);
          cancelInlineEdit();
          return;
        }
      }
    } else if (editingCell.field === "end_date") {
      // Normalize dates to YYYY-MM-DD format for comparison using utility function
      const oldValue = parseDateToYYYYMMDD(campaign.end_date);
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;

      console.log("[end_date] Date comparison:", {
        campaignId: editingCell.campaignId,
        oldValue,
        newValue,
        hasChanged,
        rawEndDate: campaign.end_date,
      });

      // Validate: end date cannot be before start date
      // Compare YYYY-MM-DD strings directly to avoid timezone issues
      if (newValue) {
        const startDateStr = parseDateToYYYYMMDD(campaign.start_date);
        if (startDateStr && newValue < startDateStr) {
          validationError = "End date cannot be before start date";
          alert(validationError);
          cancelInlineEdit();
          return;
        }
      }
    }

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    // If skipModal is true (e.g., when canceling), just cancel without showing modal
    if (skipModal) {
      cancelInlineEdit();
      return;
    }

    // For status changes, show inline confirmation instead of modal
    if (editingCell.field === "status") {
      setPendingStatusChange({
        campaignId: editingCell.campaignId,
        newStatus: valueToCheck,
        oldStatus: campaign.status || "ENABLED",
      });
      // Keep editing cell open to show confirmation buttons
      return;
    }

    // For budget, show inline confirmation buttons
    if (editingCell.field === "budget") {
      const newBudget = parseFloat(valueToCheck) || 0;
      const oldBudget = campaign.daily_budget || 0;

      setPendingBudgetChange({
        campaignId: editingCell.campaignId,
        newBudget: newBudget,
        oldBudget: oldBudget,
      });
      // Keep editing cell open to show confirmation buttons
      return;
    }

    // For start_date and end_date, show inline confirmation buttons
    if (
      editingCell.field === "start_date" ||
      editingCell.field === "end_date"
    ) {
      // Normalize old date to YYYY-MM-DD format
      let oldDateFormatted = "";
      const oldDate = campaign[editingCell.field];
      if (oldDate) {
        try {
          const date = new Date(oldDate);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            oldDateFormatted = `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.error(`Error parsing ${editingCell.field}:`, e, oldDate);
        }
      }

      const pendingChange = {
        campaignId: editingCell.campaignId,
        field: editingCell.field,
        newDate: valueToCheck.trim(),
        oldDate: oldDateFormatted,
      };

      console.log(
        `[${editingCell.field}] Setting pendingDateChange:`,
        pendingChange
      );
      console.log(`[${editingCell.field}] Current editingCell:`, editingCell);
      console.log(`[${editingCell.field}] Campaign:`, campaign);

      // Clear editing cell so the input disappears and confirmation buttons show
      setEditingCell(null);
      setEditedValue("");
      setPendingDateChange(pendingChange);
      // Keep editing cell open to show confirmation buttons
      console.log(`[${editingCell.field}] Pending date change set, returning`);
      return;
    }

    // Fallback for any other fields (shouldn't happen, but keep modal for safety)
    let oldValue = "";
    let newValue = valueToCheck;

    setInlineEditCampaign(campaign);
    setInlineEditField(editingCell.field);
    setInlineEditOldValue(oldValue);
    setInlineEditNewValue(newValue);
    setShowInlineEditModal(true);
    setEditingCell(null);
  };

  const runInlineBudgetUpdate = async (
    campaignId: string | number,
    newBudget: number
  ) => {
    if (!accountId) return;

    const campaign = campaigns.find((c) => c.campaign_id === campaignId);
    if (!campaign) return;

    setUpdatingField({ campaignId, field: "budget" });

    // Optimistically update the local state
    setCampaigns((prevCampaigns) =>
      prevCampaigns.map((c) =>
        c.campaign_id === campaignId ? { ...c, daily_budget: newBudget } : c
      )
    );

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (isNaN(newBudget) || newBudget <= 0) {
        throw new Error("Invalid budget value");
      }

      const response = await campaignsService.bulkUpdateGoogleCampaigns(
        accountIdNum,
        {
          campaignIds: [campaignId],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: newBudget,
        }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0]);
      }

      // Update successful - keep the optimistic update
      setPendingBudgetChange(null);
      setEditingCell(null);
      setEditedValue("");
    } catch (error) {
      console.error("Error updating campaign budget:", error);
      // Revert optimistic update on error
      setCampaigns((prevCampaigns) =>
        prevCampaigns.map((c) => (c.campaign_id === campaignId ? campaign : c))
      );
      alert("Failed to update campaign budget. Please try again.");
    } finally {
      setUpdatingField(null);
    }
  };

  const runInlineDateUpdate = async (
    campaignId: string | number,
    field: "start_date" | "end_date",
    newDate: string
  ) => {
    if (!accountId) return;

    const campaign = campaigns.find((c) => c.campaign_id === campaignId);
    if (!campaign) return;

    setUpdatingField({ campaignId, field });

    // Parse the date value first to ensure consistency
    const dateValue = parseDateToYYYYMMDD(newDate);
    console.log(`[${field}] Date value for API:`, {
      original: newDate,
      parsed: dateValue,
    });

    // Optimistically update the local state with the parsed date value
    let optimisticValue: any = {};
    if (field === "start_date") {
      optimisticValue = { start_date: dateValue || null };
    } else if (field === "end_date") {
      optimisticValue = { end_date: dateValue || null };
    }

    setCampaigns((prevCampaigns) =>
      prevCampaigns.map((c) =>
        c.campaign_id === campaignId ? { ...c, ...optimisticValue } : c
      )
    );

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.bulkUpdateGoogleCampaigns(
        accountIdNum,
        {
          campaignIds: [campaignId],
          action: field,
          [field]: dateValue || undefined,
        }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0]);
      }

      // Update successful - ensure the state has the correct value from API response
      // The response might contain the updated value, use it if available
      const updatedCampaign = response.updated_campaigns?.find(
        (c: any) => c.campaign_id === campaignId
      );

      if (updatedCampaign?.value) {
        // Use the value from API response to ensure consistency
        const apiDateValue = updatedCampaign.value;
        setCampaigns((prevCampaigns) =>
          prevCampaigns.map((c) =>
            c.campaign_id === campaignId ? { ...c, [field]: apiDateValue } : c
          )
        );
        console.log(
          `[${field}] Updated state with API response value:`,
          apiDateValue
        );
      }

      setPendingDateChange(null);
      setEditingCell(null);
      setEditedValue("");
    } catch (error) {
      console.error(`Error updating campaign ${field}:`, error);
      // Revert optimistic update on error
      setCampaigns((prevCampaigns) =>
        prevCampaigns.map((c) => (c.campaign_id === campaignId ? campaign : c))
      );
      alert(`Failed to update campaign ${field}. Please try again.`);
    } finally {
      setUpdatingField(null);
    }
  };

  const runInlineStatusUpdate = async (
    campaignId: string | number,
    newStatus: string
  ) => {
    if (!accountId) return;

    setUpdatingField({ campaignId, field: "status" });

    // Optimistically update the local state
    setCampaigns((prevCampaigns) =>
      prevCampaigns.map((campaign) =>
        campaign.campaign_id === campaignId
          ? { ...campaign, status: newStatus }
          : campaign
      )
    );

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const statusMap: Record<string, "ENABLED" | "PAUSED" | "REMOVED"> = {
        ENABLED: "ENABLED",
        PAUSED: "PAUSED",
        REMOVED: "REMOVED",
        Enabled: "ENABLED",
        Paused: "PAUSED",
        Removed: "REMOVED",
      };
      const statusValue = statusMap[newStatus] || "ENABLED";

      const response = await campaignsService.bulkUpdateGoogleCampaigns(
        accountIdNum,
        {
          campaignIds: [campaignId],
          action: "status",
          status: statusValue,
        }
      );

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0]);
      }

      // Update successful - keep the optimistic update
      setPendingStatusChange(null);
      setEditingCell(null);
      setEditedValue("");
    } catch (error) {
      console.error("Error updating campaign status:", error);
      // Revert optimistic update on error
      setCampaigns((prevCampaigns) =>
        prevCampaigns.map((campaign) =>
          campaign.campaign_id === campaignId
            ? {
                ...campaign,
                status: pendingStatusChange?.oldStatus || campaign.status,
              }
            : campaign
        )
      );
      alert("Failed to update campaign status. Please try again.");
    } finally {
      setUpdatingField(null);
    }
  };

  const runInlineEdit = async () => {
    if (!inlineEditCampaign || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "budget") {
        const budgetValue = parseFloat(
          inlineEditNewValue.replace(/[^0-9.]/g, "")
        );
        if (isNaN(budgetValue)) {
          throw new Error("Invalid budget value");
        }

        await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [inlineEditCampaign.campaign_id],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });
      } else if (inlineEditField === "start_date") {
        // Extract date from formatted string or use raw value
        let dateValue = inlineEditNewValue;
        if (dateValue === "—" || !dateValue) {
          dateValue = "";
        } else {
          // Try to parse the formatted date back to YYYY-MM-DD
          const date = new Date(inlineEditNewValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            dateValue = `${year}-${month}-${day}`;
          }
        }

        const response = await campaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          {
            campaignIds: [inlineEditCampaign.campaign_id],
            action: "start_date",
            start_date: dateValue || undefined,
          }
        );

        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0]);
        }
      } else if (inlineEditField === "end_date") {
        let dateValue = inlineEditNewValue;
        if (dateValue === "—" || !dateValue) {
          dateValue = "";
        } else {
          const date = new Date(inlineEditNewValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            dateValue = `${year}-${month}-${day}`;
          }
        }

        const response = await campaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          {
            campaignIds: [inlineEditCampaign.campaign_id],
            action: "end_date",
            end_date: dateValue || undefined,
          }
        );

        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0]);
        }
      }

      await loadCampaigns(accountIdNum);
      setShowInlineEditModal(false);
      setInlineEditCampaign(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    } catch (error) {
      console.error("Error updating campaign:", error);
      alert("Failed to update campaign. Please try again.");
    } finally {
      setInlineEditLoading(false);
    }
  };

  const runBulkStatus = async (
    statusValue: "ENABLED" | "PAUSED" | "REMOVED"
  ) => {
    if (!accountId || selectedCampaigns.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "status",
        status: statusValue,
      });
      await loadCampaigns(accountIdNum);
    } catch (error: any) {
      console.error("Failed to update campaigns", error);
      alert("Failed to update campaigns. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedCampaignsData = () => {
    return campaigns.filter((campaign) =>
      selectedCampaigns.has(campaign.campaign_id)
    );
  };

  // Calculate new budget value for a campaign
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
        if (!isNaN(upper)) {
          newBudget = Math.min(newBudget, upper);
        }
      }
    } else if (budgetAction === "decrease") {
      if (budgetUnit === "percent") {
        newBudget = currentBudget * (1 - valueNum / 100);
      } else {
        newBudget = currentBudget - valueNum;
      }
      if (lowerLimit) {
        const lower = parseFloat(lowerLimit);
        if (!isNaN(lower)) {
          newBudget = Math.max(newBudget, lower);
        }
      }
    } else if (budgetAction === "set") {
      newBudget = valueNum;
    }

    return Math.max(0, newBudget); // Ensure non-negative
  };

  const runBulkBudget = async () => {
    if (!accountId || selectedCampaigns.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(budgetValue);
    if (isNaN(valueNum)) {
      return;
    }
    const upper = upperLimit ? parseFloat(upperLimit) : undefined;
    const lower = lowerLimit ? parseFloat(lowerLimit) : undefined;

    try {
      // Show loading in modal
      setBulkLoading(true);

      await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "budget",
        budgetAction,
        unit: budgetUnit,
        value: valueNum,
        upperLimit: upper,
        lowerLimit: lower,
      });

      // Close modal and reload campaigns with loading state
      setShowConfirmationModal(false);
      setShowBudgetPanel(false);
      setShowBulkActions(false);
      setSorting(true); // Show loading overlay
      await loadCampaigns(accountIdNum);
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update campaigns", error);
      alert("Failed to update campaigns. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExport = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setExporting(true);
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        ...buildFilterParams(filters),
      };

      // Add pagination for current view export
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      await campaignsService.exportGoogleCampaigns(
        accountIdNum,
        params,
        exportType
      );
      setShowExportModal(false);
    } catch (error: any) {
      console.error("Failed to export campaigns:", error);
      alert("Failed to export campaigns. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatSyncDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();

      // Format time in 12-hour format with AM/PM (no leading zero for hours)
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      // Don't pad hours - show as "5:09 PM" not "05:09 PM"
      const hoursFormatted = String(hours);

      return `${month}/${day}/${year} ${hoursFormatted}:${minutes} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      ENABLED: "Enable",
      PAUSED: "Paused",
      REMOVED: "Removed",
    };
    const statusLabel = statusMap[status.toUpperCase()] || "Paused";
    return <StatusBadge status={statusLabel} />;
  };

  const getChannelTypeLabel = (type?: string) => {
    if (!type) return "—";
    const typeMap: Record<string, string> = {
      SEARCH: "Search",
      DISPLAY: "Display",
      SHOPPING: "Shopping",
      PERFORMANCE_MAX: "Performance Max",
      VIDEO: "Video",
      HOTEL: "Hotel",
      MULTI_CHANNEL: "Multi Channel",
      LOCAL: "Local",
      SMART: "Smart",
    };
    return typeMap[type] || type;
  };

  const allSelected =
    campaigns.length > 0 && selectedCampaigns.size === campaigns.length;
  const someSelected =
    selectedCampaigns.size > 0 && selectedCampaigns.size < campaigns.length;

  const toggleChartMetric = (
    metric: "sales" | "spend" | "impressions" | "clicks" | "acos" | "roas"
  ) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Chart data comes from backend - no frontend calculations
  const chartData = useMemo(() => {
    console.log(
      "📊 [CHART DEBUG] Processing chart data, chartDataFromApi length:",
      chartDataFromApi.length
    );
    // Use chart data from API only - all data comes from backend
    if (chartDataFromApi.length > 0) {
      const processed = chartDataFromApi.map((item) => {
        // Format date from backend (YYYY-MM-DD or date string)
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
          } catch (e) {
            // Keep original date if parsing fails
            formattedDate = item.date;
          }
        }

        return {
          date: formattedDate,
          sales: item.sales || 0,
          spend: item.spend || 0,
          impressions: item.impressions || 0,
          clicks: Math.round(item.clicks || 0), // Ensure clicks are whole numbers
          acos: 0, // Google campaigns don't have ACOS
          roas: 0, // Google campaigns don't have ROAS
        };
      });
      console.log(
        "✅ [CHART DEBUG] Processed chart data, length:",
        processed.length,
        "first item:",
        processed[0]
      );
      return processed;
    }

    // Return empty array if no data from backend
    console.log(
      "❌ [CHART DEBUG] No chart data from API, returning empty array"
    );
    return [];
  }, [chartDataFromApi]);

  return (
    <div className="min-h-screen bg-white flex">
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
            {/* Header with Filter Button + Sync */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                Google Campaign Manager
              </h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                    className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                      isFilterPanelOpen ? "rotate-180" : ""
                    }`}
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
                <Button
                  onClick={handleSync}
                  disabled={syncing || syncingAnalytics}
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 text-[10.64px] font-semibold"
                >
                  {syncing ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Syncing...
                    </span>
                  ) : (
                    "Sync Campaigns"
                  )}
                </Button>
                <Button
                  onClick={handleSyncAnalytics}
                  disabled={syncing || syncingAnalytics}
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 text-[10.64px] font-semibold ml-2"
                >
                  {syncingAnalytics ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Syncing Analytics...
                    </span>
                  ) : (
                    "Sync Analytics"
                  )}
                </Button>
              </div>
            </div>

            {/* Sync Messages */}
            {syncMessage && (
              <div className="mb-4">
                <Banner
                  type={
                    syncMessage.includes("error") ||
                    syncMessage.includes("Failed")
                      ? "error"
                      : "success"
                  }
                  message={syncMessage}
                  dismissable={true}
                  onDismiss={() => setSyncMessage(null)}
                />
              </div>
            )}
            {analyticsSyncMessage && (
              <div className="mb-4">
                <Banner
                  type={
                    analyticsSyncMessage.includes("error") ||
                    analyticsSyncMessage.includes("Failed")
                      ? "error"
                      : "success"
                  }
                  message={analyticsSyncMessage}
                  dismissable={true}
                  onDismiss={() => setAnalyticsSyncMessage(null)}
                />
              </div>
            )}

            {/* Filter Panel - inline, matching Amazon layout */}
            {isFilterPanelOpen && (
              <FilterPanel
                isOpen={true}
                onClose={() => setIsFilterPanelOpen(false)}
                onApply={(newFilters) => {
                  setFilters(newFilters);
                  setCurrentPage(1);
                  if (accountId) {
                    const accountIdNum = parseInt(accountId, 10);
                    if (!isNaN(accountIdNum)) {
                      loadCampaignsWithFilters(accountIdNum, newFilters);
                    }
                  }
                }}
                initialFilters={filters}
                filterFields={[
                  { value: "campaign_name", label: "Campaign Name" },
                  { value: "status", label: "Status" },
                  { value: "budget", label: "Budget" },
                  { value: "advertising_channel_type", label: "Channel Type" },
                  { value: "account_name", label: "Account Name" },
                ]}
              />
            )}

            {/* Performance Trends Chart */}
            <PerformanceChart
              data={chartData}
              toggles={chartToggles}
              onToggle={toggleChartMetric}
              title="Performance Trends"
            />

            {/* Edit and Export Buttons - Above Table */}
            <div className="flex items-center justify-end gap-2">
              <div
                className="relative inline-flex justify-end"
                ref={dropdownRef}
              >
                <Button
                  type="button"
                  className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowExportModal(true)}
                  disabled={exporting || loading || campaigns.length === 0}
                >
                  {exporting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#072929] border-t-transparent"></span>
                      <span className="text-[10.64px] text-[#072929] font-normal">
                        Exporting...
                      </span>
                    </>
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
                <Button
                  type="button"
                  className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBulkActions((prev) => !prev);
                    setShowBudgetPanel(false);
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
                        { value: "ENABLED", label: "Enable" },
                        { value: "PAUSED", label: "Pause" },
                        { value: "REMOVED", label: "Remove" },
                        { value: "edit_budget", label: "Edit Budget" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedCampaigns.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedCampaigns.size === 0) return;
                            if (opt.value === "edit_budget") {
                              setShowBudgetPanel(true);
                            } else {
                              setShowBudgetPanel(false);
                              setPendingStatusAction(
                                opt.value as "ENABLED" | "PAUSED" | "REMOVED"
                              );
                              setIsBudgetChange(false);
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
            </div>

            {/* Google Campaigns Table Card */}
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                Campaigns{" "}
                <span className="text-[12.8px] font-normal text-[#727272]">
                  ({total} total)
                </span>
              </h2>
            </div>

            {/* Budget editor panel */}
            {selectedCampaigns.size > 0 && showBudgetPanel && (
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
                        value={budgetAction}
                        onChange={(val) => {
                          const action = val as typeof budgetAction;
                          setBudgetAction(action);
                          if (action === "set") {
                            setBudgetUnit("amount");
                          }
                        }}
                        buttonClassName="w-full bg-[#FEFEFB]"
                        width="w-full"
                      />
                    </div>
                    {(budgetAction === "increase" ||
                      budgetAction === "decrease") && (
                      <div className="w-[140px]">
                        <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                          Unit
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                              budgetUnit === "percent"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                            }`}
                            onClick={() => setBudgetUnit("percent")}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                              budgetUnit === "amount"
                                ? "bg-forest-f40  border-forest-f40"
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
                          value={budgetValue}
                          onChange={(e) => setBudgetValue(e.target.value)}
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
                          value={upperLimit}
                          onChange={(e) => setUpperLimit(e.target.value)}
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
                          setShowBudgetPanel(false);
                          setShowBulkActions(false);
                        }}
                        className="px-4 py-2 text-[#556179] bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-[11.2px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!budgetValue) return;
                          setIsBudgetChange(true);
                          setPendingStatusAction(null);
                          setShowConfirmationModal(true);
                        }}
                        disabled={bulkLoading || !budgetValue}
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
                <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative">
                  {bulkLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#136D6D] border-t-transparent"></div>
                        <span className="text-[12.8px] font-medium text-[#136D6D]">
                          Updating campaigns...
                        </span>
                      </div>
                    </div>
                  )}
                  <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                    {isBudgetChange
                      ? "Confirm Budget Changes"
                      : "Confirm Status Changes"}
                  </h3>

                  {/* Summary */}
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.16px] text-[#556179]">
                        {selectedCampaigns.size} campaign
                        {selectedCampaigns.size !== 1 ? "s" : ""} will be
                        updated:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {isBudgetChange ? "Budget" : "Status"} change
                      </span>
                    </div>
                  </div>

                  {/* Campaign Preview Table */}
                  {(() => {
                    const selectedCampaignsData = getSelectedCampaignsData();
                    const previewCount = Math.min(
                      10,
                      selectedCampaignsData.length
                    );
                    const hasMore = selectedCampaignsData.length > 10;

                    return (
                      <div className="mb-6">
                        <div className="mb-2">
                          <span className="text-[10.64px] text-[#556179]">
                            {hasMore
                              ? `Showing ${previewCount} of ${selectedCampaignsData.length} selected campaigns`
                              : `${selectedCampaignsData.length} campaign${
                                  selectedCampaignsData.length !== 1 ? "s" : ""
                                } selected`}
                          </span>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-sandstorm-s20">
                              <tr>
                                <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                  Campaign Name
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
                              {selectedCampaignsData
                                .slice(0, 10)
                                .map((campaign) => {
                                  const oldBudget = campaign.daily_budget || 0;
                                  const oldStatus =
                                    campaign.status || "ENABLED";
                                  const newBudget = isBudgetChange
                                    ? calculateNewBudget(oldBudget)
                                    : oldBudget;
                                  const newStatus = pendingStatusAction
                                    ? pendingStatusAction
                                    : oldStatus;

                                  return (
                                    <tr
                                      key={campaign.campaign_id}
                                      className="border-b border-gray-200 last:border-b-0"
                                    >
                                      <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                        {campaign.campaign_name ||
                                          "Unnamed Campaign"}
                                      </td>
                                      <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                        {isBudgetChange
                                          ? `$${oldBudget.toFixed(2)}`
                                          : oldStatus}
                                      </td>
                                      <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                        {isBudgetChange
                                          ? `$${newBudget.toFixed(2)}`
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

                  <div className="space-y-3 mb-6">
                    {isBudgetChange ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Action:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {budgetAction === "increase"
                              ? "Increase By"
                              : budgetAction === "decrease"
                              ? "Decrease By"
                              : "Set To"}
                          </span>
                        </div>

                        {(budgetAction === "increase" ||
                          budgetAction === "decrease") && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-[12.16px] text-[#556179]">
                              Unit:
                            </span>
                            <span className="text-[12.16px] font-semibold text-[#072929]">
                              {budgetUnit === "percent"
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
                            {budgetValue} {budgetUnit === "percent" ? "%" : "$"}
                          </span>
                        </div>

                        {budgetAction === "increase" && upperLimit && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-[12.16px] text-[#556179]">
                              Upper Limit:
                            </span>
                            <span className="text-[12.16px] font-semibold text-[#072929]">
                              ${upperLimit}
                            </span>
                          </div>
                        )}

                        {budgetAction === "decrease" && lowerLimit && (
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
                            ? pendingStatusAction.charAt(0) +
                              pendingStatusAction.slice(1).toLowerCase()
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmationModal(false);
                        setPendingStatusAction(null);
                      }}
                      className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary font-semibold rounded-lg items-center hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isBudgetChange) {
                          await runBulkBudget();
                        } else if (pendingStatusAction) {
                          setShowConfirmationModal(false);
                          await runBulkStatus(pendingStatusAction);
                          setShowBulkActions(false);
                        }
                        setPendingStatusAction(null);
                      }}
                      disabled={bulkLoading}
                      className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkLoading ? "Updating..." : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowExportModal(false);
                  }
                }}
              >
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                  <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                    Export Campaigns
                  </h3>
                  <div className="mb-6">
                    <label className="block text-[12.8px] font-semibold text-[#556179] mb-2 uppercase">
                      Export Type
                    </label>
                    <Dropdown
                      options={[
                        { value: "current_view", label: "Current View" },
                        { value: "all_data", label: "All Data" },
                      ]}
                      value={exportType}
                      onChange={(val) => {
                        setExportType(val as "current_view" | "all_data");
                      }}
                      buttonClassName="w-full"
                      width="w-full"
                    />
                    <p className="text-[10.64px] text-[#727272] mt-2">
                      {exportType === "current_view"
                        ? `Exporting ${campaigns.length} campaign${
                            campaigns.length !== 1 ? "s" : ""
                          } from the current page (${total} total available)`
                        : `Exporting all ${total} campaign${
                            total !== 1 ? "s" : ""
                          } matching your filters`}
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportModal(false);
                        setExportType("current_view");
                      }}
                      disabled={exporting}
                      className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[11.2px] font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={exporting}
                      className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
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
                          Download
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Edit Confirmation Modal */}
            {showInlineEditModal && inlineEditCampaign && inlineEditField && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowInlineEditModal(false);
                  }
                }}
              >
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                  <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                    Confirm{" "}
                    {inlineEditField === "budget"
                      ? "Budget"
                      : inlineEditField === "status"
                      ? "Status"
                      : inlineEditField === "start_date"
                      ? "Start Date"
                      : "End Date"}{" "}
                    Change
                  </h3>
                  <div className="mb-4">
                    <p className="text-[12.8px] text-[#556179] mb-2">
                      Campaign:{" "}
                      <span className="font-semibold text-[#072929]">
                        {inlineEditCampaign.campaign_name || "Unnamed Campaign"}
                      </span>
                    </p>
                    <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[12.8px] text-[#556179]">
                          {inlineEditField === "budget"
                            ? "Budget"
                            : inlineEditField === "status"
                            ? "Status"
                            : inlineEditField === "start_date"
                            ? "Start Date"
                            : "End Date"}
                          :
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12.8px] text-[#556179]">
                            {inlineEditOldValue}
                          </span>
                          <span className="text-[12.8px] text-[#556179]">
                            →
                          </span>
                          <span className="text-[12.8px] font-semibold text-[#072929]">
                            {inlineEditNewValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineEditModal(false);
                        setInlineEditCampaign(null);
                        setInlineEditField(null);
                        setInlineEditOldValue("");
                        setInlineEditNewValue("");
                      }}
                      className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[11.2px] font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={runInlineEdit}
                      disabled={inlineEditLoading}
                      className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inlineEditLoading ? "Updating..." : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <GoogleCampaignsTable
              campaigns={campaigns}
              loading={loading}
              sorting={sorting}
              accountId={accountId || ""}
              selectedCampaigns={selectedCampaigns}
              allSelected={allSelected}
              someSelected={someSelected}
              sortBy={sortBy}
              sortOrder={sortOrder}
              editingCell={editingCell}
              editedValue={editedValue}
              isCancelling={isCancelling}
              summary={summary}
              updatingField={updatingField}
              pendingBudgetChange={pendingBudgetChange}
              pendingStatusChange={pendingStatusChange}
              onSelectAll={handleSelectAll}
              onSelectCampaign={handleSelectCampaign}
              onSort={handleSort}
              onStartInlineEdit={startInlineEdit}
              onCancelInlineEdit={cancelInlineEdit}
              onInlineEditChange={handleInlineEditChange}
              onConfirmInlineEdit={confirmInlineEdit}
              onConfirmBudgetChange={runInlineBudgetUpdate}
              onCancelBudgetChange={() => {
                setPendingBudgetChange(null);
                cancelInlineEdit();
              }}
              onConfirmStatusChange={runInlineStatusUpdate}
              onCancelStatusChange={() => {
                setPendingStatusChange(null);
                cancelInlineEdit();
              }}
              pendingDateChange={pendingDateChange}
              onConfirmDateChange={runInlineDateUpdate}
              onCancelDateChange={() => {
                setPendingDateChange(null);
                cancelInlineEdit();
              }}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
              getStatusBadge={getStatusBadge}
              getChannelTypeLabel={getChannelTypeLabel}
              getSortIcon={getSortIcon}
            />

            {/* Pagination */}
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
                  <span className="px-4 py-2 text-[10.64px] text-[#556179] flex items-center">
                    Page {currentPage} of {totalPages} • Showing{" "}
                    {(currentPage - 1) * itemsPerPage + 1}–{" "}
                    {Math.min(currentPage * itemsPerPage, total)} of {total}
                  </span>
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

            {/* Sync Message */}
            {syncMessage && (
              <div className="mb-4">
                <Banner
                  type={
                    syncMessage.includes("error") ||
                    syncMessage.includes("Failed")
                      ? "error"
                      : "success"
                  }
                  message={syncMessage}
                  dismissable={true}
                  onDismiss={() => setSyncMessage(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
