import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildMarketplaceRoute } from "../utils/urlHelpers";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useDateRange } from "../contexts/DateRangeContext";
import { useSidebar } from "../contexts/SidebarContext";
import { campaignsService, type Campaign } from "../services/campaigns";
import { Checkbox } from "../components/ui/Checkbox";
import { Dropdown } from "../components/ui/Dropdown";
import { Button } from "../components/ui";
import { StatusBadge } from "../components/ui/StatusBadge";
import { type FilterValues } from "../components/filters/FilterPanel";
import {
  FilterSection,
  FilterSectionPanel,
} from "../components/filters/FilterSection";
import {
  PerformanceChart,
  type MetricConfig,
} from "../components/charts/PerformanceChart";
import { CreateCampaignSection } from "../components/campaigns/CreateCampaignSection";
import {
  CreateCampaignPanel,
  type CreateCampaignData,
} from "../components/campaigns/CreateCampaignPanel";
import ExportIcon from "../assets/export-icon.svg";
import { ErrorModal } from "../components/ui/ErrorModal";

export const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { startDate, endDate } = useDateRange();
  const { sidebarWidth } = useSidebar();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
  const [selectedCampaigns, setSelectedCampaigns] = useState<
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

  const campaignMetrics: MetricConfig[] = [
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
  const [isCreateCampaignPanelOpen, setIsCreateCampaignPanelOpen] =
    useState(false);
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
    "enable" | "pause" | "archive" | null
  >(null);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    campaignId: string | number;
    field: "budget" | "budgetType" | "status";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditCampaign, setInlineEditCampaign] = useState<Campaign | null>(
    null
  );
  const [inlineEditField, setInlineEditField] = useState<
    "budget" | "budgetType" | "status" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string>("");

  // Define filter fields for Campaigns
  const CAMPAIGN_FILTER_FIELDS = [
    { value: "campaign_name", label: "Campaign Name" },
    { value: "state", label: "State" },
    { value: "budget", label: "Budget" },
    { value: "type", label: "Type" },
    { value: "profile_name", label: "Profile" },
  ];

  // Set page title
  useEffect(() => {
    setPageTitle("Amazon Campaigns");
    return () => {
      resetPageTitle();
    };
  }, []);

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

  // Cancel inline edit when clicking outside (except on input/dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingCell && !showInlineEditModal) {
        const target = event.target as HTMLElement;
        // Don't cancel if clicking on:
        // - input fields
        // - dropdown button or menu (check for z-50 which is the dropdown menu)
        // - any element with z-50 (dropdowns/modals)
        // - confirmation modal
        const isDropdownMenu =
          target.closest('[class*="z-50"]') ||
          target.closest('[class*="shadow-lg"]') ||
          target.closest('button[type="button"]');
        const isInput = target.closest("input");
        const isModal = target.closest('[class*="fixed"]');

        if (!isInput && !isDropdownMenu && !isModal) {
          // Small delay to allow dropdown onChange to fire first
          setTimeout(() => {
            if (editingCell && !showInlineEditModal) {
              cancelInlineEdit();
            }
          }, 150);
        }
      }
    };

    if (editingCell && !showInlineEditModal) {
      // Use a delay to avoid canceling when opening the edit or selecting from dropdown
      const timeout = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 200);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [editingCell, showInlineEditModal]);

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
    });

    // Skip if this is the same request as the last one (prevents React StrictMode double calls)
    if (requestIdRef.current === requestId) {
      return;
    }

    requestIdRef.current = requestId;

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

    // Add filters to params
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
      } else if (filter.field === "state") {
        params.state = filter.value;
      } else if (filter.field === "type") {
        params.type = filter.value;
      } else if (filter.field === "profile_name") {
        if (filter.operator === "contains") {
          params.profile_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.profile_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.profile_name = filter.value;
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
      const result = await campaignsService.exportCampaigns(accountIdNum, {
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
      console.error("Failed to export campaigns:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export campaigns. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  const loadFilterDefinitions = async () => {
    try {
      const definitions = await filtersService.getFilterDefinitions(
        "campaigns"
      );
      setFilterDefinitions(definitions);
    } catch (error) {
      console.error("Failed to load filter definitions:", error);
    }
  };

  const loadCampaigns = async (accountId: number) => {
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
        page: currentPage,
        page_size: itemsPerPage,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        ...buildFilterParams(filters),
      };

      const response = await campaignsService.getCampaigns(accountId, params);
      setCampaigns(Array.isArray(response.campaigns) ? response.campaigns : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      setCampaigns([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadCampaignsWithFilters = async (
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
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        ...buildFilterParams(filterList),
      };

      const response = await campaignsService.getCampaigns(accountId, params);
      setCampaigns(Array.isArray(response.campaigns) ? response.campaigns : []);
      setTotalPages(response.total_pages || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      if (response.chart_data) {
        setChartDataFromApi(response.chart_data);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      setCampaigns([]);
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

  // Inline edit handlers
  const startInlineEdit = (
    campaign: Campaign,
    field: "budget" | "budgetType" | "status"
  ) => {
    setEditingCell({ campaignId: campaign.campaignId, field });
    if (field === "budget") {
      setEditedValue((campaign.daily_budget || 0).toString());
    } else if (field === "budgetType") {
      setEditedValue(campaign.budgetType || "");
    } else if (field === "status") {
      setEditedValue(campaign.status || "Enabled");
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

    const campaign = campaigns.find(
      (c) => c.campaignId === editingCell.campaignId
    );
    if (!campaign) return;

    // Use override value if provided, otherwise use state
    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;

    // Check if value actually changed
    let hasChanged = false;
    if (editingCell.field === "budget") {
      // Parse the new value, handling empty strings
      const newBudgetStr = valueToCheck.trim();
      const newBudget = newBudgetStr === "" ? 0 : parseFloat(newBudgetStr);
      const oldBudget = campaign.daily_budget || 0;

      // Check if the value is a valid number and if it changed
      if (isNaN(newBudget)) {
        // Invalid number, cancel edit
        cancelInlineEdit();
        return;
      }
      hasChanged = Math.abs(newBudget - oldBudget) > 0.01;
    } else if (editingCell.field === "budgetType") {
      const oldValue = (campaign.budgetType || "").trim().toUpperCase();
      const newValue = valueToCheck.trim().toUpperCase();
      hasChanged = newValue !== oldValue;
    } else if (editingCell.field === "status") {
      // Normalize status values for comparison
      const oldValue = (campaign.status || "Enabled").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    }

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    let oldValue = "";
    let newValue = valueToCheck;

    if (editingCell.field === "budget") {
      oldValue = formatCurrency(campaign.daily_budget || 0);
      newValue = formatCurrency(parseFloat(valueToCheck) || 0);
    } else if (editingCell.field === "budgetType") {
      oldValue = campaign.budgetType || "—";
      newValue = valueToCheck;
    } else if (editingCell.field === "status") {
      oldValue = campaign.status || "Enabled";
      newValue = valueToCheck;
    }

    setInlineEditCampaign(campaign);
    setInlineEditField(editingCell.field);
    setInlineEditOldValue(oldValue);
    setInlineEditNewValue(newValue);
    setShowInlineEditModal(true);
    setEditingCell(null);
  };

  const runInlineEdit = async () => {
    if (!inlineEditCampaign || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "status") {
        // Map status values
        const statusMap: Record<string, "enable" | "pause" | "archive"> = {
          Enable: "enable",
          Paused: "pause",
          Archived: "archive",
        };
        const statusValue = statusMap[inlineEditNewValue] || "enable";

        await campaignsService.bulkUpdateCampaigns(accountIdNum, {
          campaignIds: [inlineEditCampaign.campaignId],
          action: "status",
          status: statusValue,
        });
      } else if (inlineEditField === "budget") {
        // Extract numeric value from formatted string
        const budgetValue = parseFloat(
          inlineEditNewValue.replace(/[^0-9.]/g, "")
        );
        if (isNaN(budgetValue)) {
          throw new Error("Invalid budget value");
        }

        await campaignsService.bulkUpdateCampaigns(accountIdNum, {
          campaignIds: [inlineEditCampaign.campaignId],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });
      } else if (inlineEditField === "budgetType") {
        // Note: BudgetType updates are not currently supported by the backend/Amazon API
        // This is a read-only field from Amazon's API
        // For now, we'll show an error message
        throw new Error(
          "Budget Type updates are not currently supported. This field is read-only."
        );
      }

      // Reload campaigns
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

  const runBulkStatus = async (statusValue: "enable" | "pause" | "archive") => {
    if (!accountId || selectedCampaigns.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      await campaignsService.bulkUpdateCampaigns(accountIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "status",
        status: statusValue,
      });
      // Refresh
      await loadCampaigns(accountIdNum);
    } catch (error: any) {
      console.error("Failed to update campaigns", error);
    } finally {
      setBulkLoading(false);
    }
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
      setBulkLoading(true);
      await campaignsService.bulkUpdateCampaigns(accountIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "budget",
        budgetAction,
        unit: budgetUnit,
        value: valueNum,
        upperLimit: upper,
        lowerLimit: lower,
      });
      await loadCampaigns(accountIdNum);
    } catch (error: any) {
      console.error("Failed to update budgets", error);
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const handleCreateCampaign = async (data: CreateCampaignData) => {
    if (!accountId) return;

    try {
      // TODO: Implement API call to create campaign
      // For now, just show success message
      console.log("Creating campaign:", data);

      // Close the panel
      setIsCreateCampaignPanelOpen(false);

      // Show success message (you can replace this with a toast notification)
      setErrorModal({
        isOpen: true,
        message: `Campaign "${data.campaign_name}" created successfully!`,
      });

      // Reload campaigns to show the new one
      // await loadCampaigns(parseInt(accountId));
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create campaign. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    }
  };

  // Get selected campaigns data for confirmation modal
  const getSelectedCampaignsData = () => {
    return campaigns.filter((campaign) =>
      selectedCampaigns.has(campaign.campaignId)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Generate chart data based on campaigns and date range
  const chartData = useMemo(() => {
    // Use chart data from API if available, otherwise generate from campaigns
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

    // Fallback: generate from campaigns data
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dataPoints = Math.min(days, 60); // Limit to 60 data points for readability

    const data = [];
    const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpends = campaigns.reduce((sum, c) => sum + (c.spends || 0), 0);
    const avgSalesPerDay = days > 0 ? totalSales / days : 0;
    const avgSpendsPerDay = days > 0 ? totalSpends / days : 0;

    // Generate sample data with some variation
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor((i * days) / dataPoints));
      const dayOfWeek = date.getDay();

      // Add some variation based on day of week (weekends typically lower)
      const variation = 0.7 + Math.random() * 0.6;
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1.0;

      const sales = Math.max(0, avgSalesPerDay * variation * weekendFactor);
      const spend = Math.max(0, avgSpendsPerDay * variation * weekendFactor);
      const clicks = Math.floor(spend * (50 + Math.random() * 30)); // Estimate clicks from spend
      const impressions = Math.floor(clicks * (10 + Math.random() * 20)); // Estimate impressions from clicks
      const acos = sales > 0 ? (spend / sales) * 100 : 0; // Calculate ACOS
      const roas = spend > 0 ? sales / spend : 0; // Calculate ROAS
      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales: Math.round(sales),
        spend: Math.round(spend),
        impressions: impressions,
        clicks: clicks,
        acos: Math.round(acos * 10) / 10,
        roas: Math.round(roas * 100) / 100,
      });
    }

    return data;
  }, [chartDataFromApi, campaigns, startDate, endDate]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Export Loading Overlay */}
      {exportLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[300]">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#136D6D] border-t-transparent"></div>
            <p className="text-[16px] text-[#072929] font-medium">
              Exporting Campaigns...
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
            {/* Header with Filter and Create Campaign Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                Campaign Manager
              </h1>
              <div className="flex items-center gap-2">
                <CreateCampaignSection
                  isOpen={isCreateCampaignPanelOpen}
                  onToggle={() => {
                    setIsCreateCampaignPanelOpen(!isCreateCampaignPanelOpen);
                    setIsFilterPanelOpen(false); // Close filter panel when opening create panel
                  }}
                />
                <FilterSection
                  isOpen={isFilterPanelOpen}
                  onToggle={() => {
                    setIsFilterPanelOpen(!isFilterPanelOpen);
                    setIsCreateCampaignPanelOpen(false); // Close create panel when opening filter panel
                  }}
                  filters={filters}
                  onApply={() => {}} // Not used - FilterSectionPanel handles onApply
                  filterFields={CAMPAIGN_FILTER_FIELDS}
                  initialFilters={filters}
                />
              </div>
            </div>

            {/* Create Campaign Panel */}
            {isCreateCampaignPanelOpen && (
              <CreateCampaignPanel
                isOpen={isCreateCampaignPanelOpen}
                onClose={() => setIsCreateCampaignPanelOpen(false)}
                onSubmit={handleCreateCampaign}
                accountId={accountId}
              />
            )}

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
              filterFields={CAMPAIGN_FILTER_FIELDS}
              initialFilters={filters}
              accountId={accountId}
              channelType="amazon"
            />

            {/* Chart Section */}
            <PerformanceChart
              data={chartData}
              toggles={chartToggles}
              onToggle={toggleChartMetric}
              metrics={campaignMetrics}
              title="Performance Trends"
            />

            {/* Campaigns Table Card */}
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6 flex flex-col gap-6 max-w-full overflow-hidden">
              {/* Table Header */}
              <div className="flex items-center justify-end gap-2">
                <div
                  className="relative inline-flex justify-end"
                  ref={dropdownRef}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBulkActions((prev) => !prev);
                      setShowBudgetPanel(false);
                      setShowExportDropdown(false);
                    }}
                  >
                    <svg
                      className="w-4 h-4 text-[#072929]"
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
                    <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                      <div className="overflow-y-auto">
                        {[
                          { value: "enable", label: "Enabled" },
                          { value: "pause", label: "Pause" },
                          { value: "archive", label: "Archive" },
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
                                  opt.value as "enable" | "pause" | "archive"
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
                <div
                  className="relative inline-flex justify-end"
                  ref={exportDropdownRef}
                >
                  <div className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(e) => {
                        if (exportLoading) return;
                        e.stopPropagation();
                        setShowExportDropdown((prev) => !prev);
                        setShowBulkActions(false);
                        setShowBudgetPanel(false);
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
                            className="w-4 h-4 text-[#072929]"
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
                    <div className="absolute top-[38px] right-0 w-56 bg-[#FCFCF9] border border-[#E3E3E3] rounded-[12px] shadow-lg z-[100] pointer-events-auto overflow-hidden">
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

              {/* Budget editor panel */}
              {selectedCampaigns.size > 0 && showBudgetPanel && (
                <div className="px-6 mb-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
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
                            // When "Set To" is selected, automatically use $ (amount)
                            if (action === "set") {
                              setBudgetUnit("amount");
                            }
                          }}
                          buttonClassName="w-full"
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
                                  : "bg-background-field text-forest-f60 border-gray-200 hover:bg-gray-50"
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
                                  : "bg-background-field text-forest-f60 border-gray-200 hover:bg-gray-50"
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
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
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
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
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
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
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
                          className="px-4 py-2.5 bg-background-field border border-gray-200 text-button-text text-text-primary font-semibold rounded-lg items-center hover:bg-gray-50 transition-colors"
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
                  <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
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
                                    selectedCampaignsData.length !== 1
                                      ? "s"
                                      : ""
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
                                    const oldBudget =
                                      campaign.daily_budget || 0;
                                    const oldStatus =
                                      campaign.status || "Enabled";
                                    const newBudget = isBudgetChange
                                      ? calculateNewBudget(oldBudget)
                                      : oldBudget;
                                    const newStatus = pendingStatusAction
                                      ? pendingStatusAction
                                          .charAt(0)
                                          .toUpperCase() +
                                        pendingStatusAction.slice(1)
                                      : oldStatus;

                                    return (
                                      <tr
                                        key={campaign.campaignId}
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
                              {budgetValue}{" "}
                              {budgetUnit === "percent" ? "%" : "$"}
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
                              ? pendingStatusAction.charAt(0).toUpperCase() +
                                pendingStatusAction.slice(1)
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
                        className="px-4 py-2 bg-background-field border border-gray-200 text-button-text text-text-primary font-semibold rounded-lg items-center hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setShowConfirmationModal(false);
                          if (isBudgetChange) {
                            await runBulkBudget();
                            setShowBudgetPanel(false);
                            setShowBulkActions(false);
                          } else if (pendingStatusAction) {
                            await runBulkStatus(pendingStatusAction);
                            setShowBulkActions(false);
                          }
                          setPendingStatusAction(null);
                        }}
                        disabled={bulkLoading}
                        className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bulkLoading ? "Applying..." : "Confirm"}
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
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      Confirm{" "}
                      {inlineEditField === "budget"
                        ? "Budget"
                        : inlineEditField === "budgetType"
                        ? "Budget Type"
                        : "Status"}{" "}
                      Change
                    </h3>

                    <div className="mb-4">
                      <p className="text-[12.16px] text-[#556179] mb-2">
                        Campaign:{" "}
                        <span className="font-semibold text-[#072929]">
                          {inlineEditCampaign.campaign_name ||
                            "Unnamed Campaign"}
                        </span>
                      </p>
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[12.16px] text-[#556179]">
                            {inlineEditField === "budget"
                              ? "Budget"
                              : inlineEditField === "budgetType"
                              ? "Budget Type"
                              : "Status"}
                            :
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12.16px] text-[#556179]">
                              {inlineEditOldValue}
                            </span>
                            <span className="text-[12.16px] text-[#556179]">
                              →
                            </span>
                            <span className="text-[12.16px] font-semibold text-[#072929]">
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
                        className="px-4 py-2 bg-background-field border border-gray-200 text-button-text text-text-primary font-semibold rounded-lg items-center hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={runInlineEdit}
                        disabled={inlineEditLoading}
                        className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {inlineEditLoading ? "Updating..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                  {loading ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">
                      Loading campaigns...
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[13.3px] text-[#556179] mb-4">
                        No campaigns found
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
                                checked={
                                  selectedCampaigns.size === campaigns.length &&
                                  campaigns.length > 0
                                }
                                indeterminate={
                                  selectedCampaigns.size > 0 &&
                                  selectedCampaigns.size < campaigns.length
                                }
                                onChange={(checked) => {
                                  if (checked) {
                                    setSelectedCampaigns(
                                      new Set(
                                        campaigns.map((c) => c.campaignId)
                                      )
                                    );
                                  } else {
                                    setSelectedCampaigns(new Set());
                                  }
                                }}
                                size="small"
                              />
                            </div>
                          </th>

                          {/* Campaign Name Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[300px] max-w-[400px]"
                            onClick={() => handleSort("campaign_name")}
                          >
                            <div className="flex items-center gap-1">
                              Campaign Name
                              {getSortIcon("campaign_name")}
                            </div>
                          </th>

                          {/* Profile Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[200px]"
                            onClick={() => handleSort("profile_name")}
                          >
                            <div className="flex items-center gap-1">
                              Profile
                              {getSortIcon("profile_name")}
                            </div>
                          </th>

                          {/* Campaign Type Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("type")}
                          >
                            <div className="flex items-center gap-1">
                              Type
                              {getSortIcon("type")}
                            </div>
                          </th>

                          {/* State Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              State
                              {getSortIcon("status")}
                            </div>
                          </th>

                          {/* Budget Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("budget")}
                          >
                            <div className="flex items-center gap-1">
                              Budget
                              {getSortIcon("budget")}
                            </div>
                          </th>

                          {/* Budget Type Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("budgetType")}
                          >
                            <div className="flex items-center gap-1">
                              Budget Type
                              {getSortIcon("budgetType")}
                            </div>
                          </th>

                          {/* Start Date Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                            onClick={() => handleSort("startDate")}
                          >
                            <div className="flex items-center gap-1">
                              Start Date
                              {getSortIcon("startDate")}
                            </div>
                          </th>

                          {/* Date Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                            onClick={() => handleSort("report_date")}
                          >
                            <div className="flex items-center gap-1">
                              Date
                              {getSortIcon("report_date")}
                            </div>
                          </th>

                          {/* Spends Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("spends")}
                          >
                            <div className="flex items-center gap-1">
                              Spends
                              {getSortIcon("spends")}
                            </div>
                          </th>

                          {/* Sales Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("sales")}
                          >
                            <div className="flex items-center gap-1">
                              Sales
                              {getSortIcon("sales")}
                            </div>
                          </th>

                          {/* Impressions Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("impressions")}
                          >
                            <div className="flex items-center gap-1">
                              Impressions
                              {getSortIcon("impressions")}
                            </div>
                          </th>

                          {/* Clicks Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("clicks")}
                          >
                            <div className="flex items-center gap-1">
                              Clicks
                              {getSortIcon("clicks")}
                            </div>
                          </th>

                          {/* ACOS Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort("acos")}
                          >
                            <div className="flex items-center gap-1">
                              ACOS
                              {getSortIcon("acos")}
                            </div>
                          </th>

                          {/* ROAS Header */}
                          <th
                            className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
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
                              Total ({summary.total_campaigns})
                            </td>
                            <td className="py-[10px] px-[10px]"></td>
                            <td className="py-[10px] px-[10px]"></td>
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
                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {summary.avg_acos.toFixed(2)}%
                            </td>
                            <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {summary.avg_roas.toFixed(2)}x
                            </td>
                          </tr>
                        )}
                        {campaigns.map((campaign, index) => {
                          const isLastRow = index === campaigns.length - 1;
                          return (
                            <tr
                              key={campaign.campaignId}
                              className={`${
                                !isLastRow ? "border-b border-[#e8e8e3]" : ""
                              } hover:bg-gray-50 transition-colors`}
                            >
                              {/* Checkbox */}
                              <td className="py-[10px] px-[10px]">
                                <div className="flex items-center justify-center">
                                  <Checkbox
                                    checked={selectedCampaigns.has(
                                      campaign.campaignId
                                    )}
                                    onChange={(checked) => {
                                      if (checked) {
                                        setSelectedCampaigns((prev) => {
                                          const newSet = new Set(prev);
                                          newSet.add(campaign.campaignId);
                                          return newSet;
                                        });
                                      } else {
                                        setSelectedCampaigns((prev) => {
                                          const newSet = new Set(prev);
                                          newSet.delete(campaign.campaignId);
                                          return newSet;
                                        });
                                      }
                                    }}
                                    size="small"
                                  />
                                </div>
                              </td>

                              {/* Campaign Name */}
                              <td className="py-[10px] px-[10px] min-w-[300px] max-w-[400px]">
                                <button
                                  onClick={() => {
                                    if (accountId) {
                                      navigate(
                                        buildMarketplaceRoute(
                                          parseInt(accountId),
                                          "amazon",
                                          "campaigns",
                                          `${campaign.type.toLowerCase()}_${
                                            campaign.campaignId
                                          }`
                                        )
                                      );
                                    }
                                  }}
                                  className="text-[13.3px] text-[#0b0f16] leading-[1.26] hover:text-[#136d6d] hover:underline cursor-pointer text-left truncate block w-full"
                                >
                                  {campaign.campaign_name || "Unnamed Campaign"}
                                </button>
                              </td>

                              {/* Profile */}
                              <td className="py-[10px] px-[10px] min-w-[200px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                                  {campaign.profile_name &&
                                  campaign.profile_name.trim() !== ""
                                    ? campaign.profile_name
                                    : "—"}
                                </span>
                              </td>

                              {/* Type */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-semibold text-[#7a4dff]">
                                  {campaign.type || "SP"}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-[10px] px-[10px]">
                                {editingCell?.campaignId ===
                                  campaign.campaignId &&
                                editingCell?.field === "status" ? (
                                  <Dropdown
                                    options={[
                                      { value: "Enabled", label: "Enabled" },
                                      { value: "Paused", label: "Paused" },
                                      { value: "Archived", label: "Archived" },
                                    ]}
                                    value={editedValue}
                                    onChange={(val) => {
                                      const newValue = val as string;
                                      handleInlineEditChange(newValue);
                                      setTimeout(() => {
                                        confirmInlineEdit(newValue);
                                      }, 100);
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
                                      startInlineEdit(campaign, "status")
                                    }
                                    className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                  >
                                    <StatusBadge
                                      status={campaign.status || "Enabled"}
                                    />
                                  </div>
                                )}
                              </td>

                              {/* Daily Budget */}
                              <td className="py-[10px] px-[10px]">
                                {editingCell?.campaignId ===
                                  campaign.campaignId &&
                                editingCell?.field === "budget" ? (
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
                                      startInlineEdit(campaign, "budget")
                                    }
                                    className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                  >
                                    {formatCurrency(campaign.daily_budget || 0)}
                                  </p>
                                )}
                              </td>

                              {/* Budget Type */}
                              <td className="py-[10px] px-[10px]">
                                {editingCell?.campaignId ===
                                  campaign.campaignId &&
                                editingCell?.field === "budgetType" ? (
                                  <Dropdown
                                    options={[
                                      { value: "DAILY", label: "DAILY" },
                                      { value: "LIFETIME", label: "LIFETIME" },
                                    ]}
                                    value={editedValue}
                                    onChange={(val) => {
                                      const newValue = val as string;
                                      handleInlineEditChange(newValue);
                                      setTimeout(() => {
                                        confirmInlineEdit(newValue);
                                      }, 100);
                                    }}
                                    defaultOpen={true}
                                    closeOnSelect={true}
                                    buttonClassName="w-full text-[13.3px] px-2 py-1"
                                    width="w-full"
                                    align="center"
                                  />
                                ) : (
                                  <p
                                    onClick={() =>
                                      startInlineEdit(campaign, "budgetType")
                                    }
                                    className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                  >
                                    {campaign.budgetType || "—"}
                                  </p>
                                )}
                              </td>

                              {/* Start Date */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                                  {campaign.startDate
                                    ? new Date(
                                        campaign.startDate
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                                  {campaign.report_date
                                    ? new Date(
                                        campaign.report_date
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </span>
                              </td>

                              {/* Spends */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                  {formatCurrency(campaign.spends || 0)}
                                </span>
                              </td>

                              {/* Sales */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                  {formatCurrency(campaign.sales || 0)}
                                </span>
                              </td>

                              {/* Impressions */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                  {(campaign.impressions || 0).toLocaleString()}
                                </span>
                              </td>

                              {/* Clicks */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                  {(campaign.clicks || 0).toLocaleString()}
                                </span>
                              </td>

                              {/* ACOS */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                  {formatPercentage(campaign.acos || 0)}
                                </span>
                              </td>

                              {/* ROAS */}
                              <td className="py-[10px] px-[10px]">
                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                  {campaign.roas
                                    ? `${campaign.roas.toFixed(2)} x`
                                    : "0.00 x"}
                                </span>
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
              {!loading && campaigns.length > 0 && (
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
      </div>
    </div>
  );
};
