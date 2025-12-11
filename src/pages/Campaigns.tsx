import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useDateRange } from "../contexts/DateRangeContext";
import { campaignsService, type Campaign } from "../services/campaigns";
import { Checkbox } from "../components/ui/Checkbox";
import { Dropdown } from "../components/ui/Dropdown";
import { Button } from "../components/ui";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  FilterPanel,
  type FilterValues,
} from "../components/filters/FilterPanel";

export const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { startDate, endDate } = useDateRange();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState<
    Set<string | number>
  >(new Set());
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);
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

  const loadCampaigns = async (accountId: number) => {
    try {
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
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      setCampaigns([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
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
        page: 1, // Always reset to first page when applying filters
        page_size: itemsPerPage,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        ...buildFilterParams(filterList),
      };

      const response = await campaignsService.getCampaigns(accountId, params);
      setCampaigns(Array.isArray(response.campaigns) ? response.campaigns : []);
      setTotalPages(response.total_pages || 0);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      setCampaigns([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
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
      setEditedValue(campaign.status || "Enable");
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
      const oldValue = (campaign.status || "Enable").trim();
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
      oldValue = campaign.status || "Enable";
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

  const toggleChartMetric = (metric: keyof typeof chartToggles) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
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
      const orders = Math.floor(sales / (50 + Math.random() * 30)); // Estimate orders from sales

      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales: Math.round(sales),
        spend: Math.round(spend),
        clicks: clicks,
        orders: orders,
      });
    }

    return data;
  }, [campaigns, startDate, endDate]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          {/* Page Header with Campaign Manager */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-[22.4px] font-semibold text-black">
                Campaign Manager
              </h1>
              {/* Add Filter Button - Beside Campaign Manager */}
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="px-3 py-2 bg-[#FEFEFB] border border-[#E3E3E3] rounded-xl flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                <span className="text-[11.2px] text-[#072929] font-normal">
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
            </div>
            {/* Filter Panel - Full width, inline, no popup */}
            {isFilterPanelOpen && (
              <FilterPanel
                isOpen={true}
                onClose={() => setIsFilterPanelOpen(false)}
                onApply={(newFilters) => {
                  setFilters(newFilters);
                  setCurrentPage(1); // Reset to first page when applying filters
                  // Explicitly trigger AJAX request when filters are applied
                  if (accountId) {
                    const accountIdNum = parseInt(accountId, 10);
                    if (!isNaN(accountIdNum)) {
                      loadCampaignsWithFilters(accountIdNum, newFilters);
                    }
                  }
                }}
                initialFilters={filters}
              />
            )}
          </div>

          {/* Chart Section */}
          <div
            className="border border-[#E6E6E6] rounded-[20px] p-4 mb-4"
            style={{ backgroundColor: "#F5F5F0" }}
          >
            {/* Title and Toggle Switches Row */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12.8px] font-semibold text-black">
                Performance Trends
              </h3>

              {/* Toggle Switches */}
              <div className="flex gap-3 items-center">
                {[
                  { key: "sales", label: "Sales", color: "#136D6D" },
                  { key: "spend", label: "Spend", color: "#506766" },
                  { key: "clicks", label: "Clicks", color: "#169aa3" },
                  { key: "orders", label: "Orders", color: "#072929" },
                ].map((metric) => (
                  <div
                    key={metric.key}
                    className="border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3 bg-white"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-[10.4px] font-normal text-black whitespace-nowrap">
                      {metric.label}
                    </span>
                    <button
                      onClick={() =>
                        toggleChartMetric(
                          metric.key as keyof typeof chartToggles
                        )
                      }
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                        chartToggles[metric.key as keyof typeof chartToggles]
                          ? "bg-[#136D6D]"
                          : "bg-[#a3a8b3]"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          chartToggles[metric.key as keyof typeof chartToggles]
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[223px] bg-transparent rounded-lg ">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    stroke="#556179"
                    style={{ fontSize: "9.6px" }}
                    tick={{ fill: "#556179" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#556179"
                    style={{ fontSize: "9.6px" }}
                    tick={{ fill: "#556179" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}K`;
                      }
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E6E6E6",
                      borderRadius: "8px",
                      fontSize: "9.6px",
                      boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === "Sales" || name === "Spend") {
                        return [`$${value.toLocaleString()}`, name];
                      }
                      return [value.toLocaleString(), name];
                    }}
                  />
                  {chartToggles.sales && (
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#136D6D"
                      strokeWidth={1.5}
                      dot={false}
                      name="Sales"
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {chartToggles.spend && (
                    <Line
                      type="monotone"
                      dataKey="spend"
                      stroke="#506766"
                      strokeWidth={1.5}
                      dot={false}
                      name="Spend"
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {chartToggles.clicks && (
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#169aa3"
                      strokeWidth={1.5}
                      dot={false}
                      name="Clicks"
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {chartToggles.orders && (
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#072929"
                      strokeWidth={1.5}
                      dot={false}
                      name="Orders"
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="rounded-2xl" style={{ backgroundColor: "#F5F5F0" }}>
            {/* Table Header */}
            <div
              className="border border-[#E6E6E6] border-b-0 rounded-t-2xl px-[28px] pt-4 pb-0 "
              style={{ backgroundColor: "#F5F5F0" }}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[22.4px] font-semibold text-black">
                    Campaigns{" "}
                    <span className="text-[12.8px] font-normal text-[#727272]">
                      (Overview of all active campaigns)
                    </span>
                  </h2>
                  <div
                    className="relative inline-flex justify-end"
                    ref={dropdownRef}
                  >
                    <Button
                      type="button"
                      className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-xl flex items-center gap-1.5 h-8 hover:bg-gray-50 transition-colors text-[10px] text-[#072929] font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBulkActions((prev) => !prev);
                        setShowBudgetPanel(false);
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
                      <span className="text-[11.2px] text-[#072929] font-normal">
                        Edit
                      </span>
                    </Button>
                    {showBulkActions && (
                      <div className="absolute top-[38px] left-0 w-56 bg-white border border-[#E6E6E6] rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                        <div className="overflow-y-auto">
                          {[
                            { value: "enable", label: "Enable" },
                            { value: "pause", label: "Pause" },
                            { value: "archive", label: "Archive" },
                            { value: "edit_budget", label: "Edit Budget" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className="w-full text-left px-3 py-2 text-[11.2px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                </div>
              </div>
            </div>

            {/* Budget editor panel */}
            {selectedCampaigns.size > 0 && showBudgetPanel && (
              <div className="px-6 mb-4">
                <div className="bg-white border border-[#E6E6E6] rounded-lg p-4">
                  <div className="flex flex-wrap items-end gap-3 justify-between">
                    <div className="w-[160px]">
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-1 uppercase">
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
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-1 uppercase">
                          Unit
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border ${
                              budgetUnit === "percent"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-white text-forest-f60 border-[#E6E6E6]"
                            }`}
                            onClick={() => setBudgetUnit("percent")}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={`flex-1 px-3 py-2 rounded-lg border ${
                              budgetUnit === "amount"
                                ? "bg-forest-f40  border-forest-f40"
                                : "bg-white text-forest-f60 border-[#E6E6E6]"
                            }`}
                            onClick={() => setBudgetUnit("amount")}
                          >
                            $
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="w-[160px]">
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-1 uppercase">
                        Value
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={budgetValue}
                          onChange={(e) => setBudgetValue(e.target.value)}
                          className="bg-white w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.2px] text-[#556179]">
                          {budgetUnit === "percent" ? "%" : "$"}
                        </span>
                      </div>
                    </div>
                    {budgetAction === "increase" && (
                      <div className="w-[160px]">
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-1 uppercase">
                          Upper Limit (optional)
                        </label>
                        <input
                          type="number"
                          value={upperLimit}
                          onChange={(e) => setUpperLimit(e.target.value)}
                          className="bg-white w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                        />
                      </div>
                    )}
                    {budgetAction === "decrease" && (
                      <div className="w-[160px]">
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-1 uppercase">
                          Lower Limit (optional)
                        </label>
                        <input
                          type="number"
                          value={lowerLimit}
                          onChange={(e) => setLowerLimit(e.target.value)}
                          className="bg-white w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
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
                        className="px-4 py-2.5 bg-white border border-[#E6E6E6] text-[11.2px] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
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
                        className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                    {isBudgetChange
                      ? "Confirm Budget Changes"
                      : "Confirm Status Changes"}
                  </h3>

                  {/* Summary */}
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.8px] text-[#556179]">
                        {selectedCampaigns.size} campaign
                        {selectedCampaigns.size !== 1 ? "s" : ""} will be
                        updated:
                      </span>
                      <span className="text-[12.8px] font-semibold text-[#072929]">
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
                          <span className="text-[11.2px] text-[#556179]">
                            {hasMore
                              ? `Showing ${previewCount} of ${selectedCampaignsData.length} selected campaigns`
                              : `${selectedCampaignsData.length} campaign${
                                  selectedCampaignsData.length !== 1 ? "s" : ""
                                } selected`}
                          </span>
                        </div>
                        <div className="border border-[#E6E6E6] rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-sandstorm-s20">
                              <tr>
                                <th className="text-left px-4 py-2 text-[11.2px] font-semibold text-[#556179] uppercase">
                                  Campaign Name
                                </th>
                                <th className="text-left px-4 py-2 text-[11.2px] font-semibold text-[#556179] uppercase">
                                  Old Value
                                </th>
                                <th className="text-left px-4 py-2 text-[11.2px] font-semibold text-[#556179] uppercase">
                                  New Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCampaignsData
                                .slice(0, 10)
                                .map((campaign) => {
                                  const oldBudget = campaign.daily_budget || 0;
                                  const oldStatus = campaign.status || "Enable";
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
                                      className="border-b border-[#E6E6E6] last:border-b-0"
                                    >
                                      <td className="px-4 py-2 text-[11.2px] text-[#072929]">
                                        {campaign.campaign_name ||
                                          "Unnamed Campaign"}
                                      </td>
                                      <td className="px-4 py-2 text-[11.2px] text-[#556179]">
                                        {isBudgetChange
                                          ? `$${oldBudget.toFixed(2)}`
                                          : oldStatus}
                                      </td>
                                      <td className="px-4 py-2 text-[11.2px] font-semibold text-[#072929]">
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
                        <div className="flex justify-between items-center py-2 border-b border-[#E6E6E6]">
                          <span className="text-[12.8px] text-[#556179]">
                            Action:
                          </span>
                          <span className="text-[12.8px] font-semibold text-[#072929]">
                            {budgetAction === "increase"
                              ? "Increase By"
                              : budgetAction === "decrease"
                              ? "Decrease By"
                              : "Set To"}
                          </span>
                        </div>

                        {(budgetAction === "increase" ||
                          budgetAction === "decrease") && (
                          <div className="flex justify-between items-center py-2 border-b border-[#E6E6E6]">
                            <span className="text-[12.8px] text-[#556179]">
                              Unit:
                            </span>
                            <span className="text-[12.8px] font-semibold text-[#072929]">
                              {budgetUnit === "percent"
                                ? "Percentage (%)"
                                : "Amount ($)"}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-2 border-b border-[#E6E6E6]">
                          <span className="text-[12.8px] text-[#556179]">
                            Value:
                          </span>
                          <span className="text-[12.8px] font-semibold text-[#072929]">
                            {budgetValue} {budgetUnit === "percent" ? "%" : "$"}
                          </span>
                        </div>

                        {budgetAction === "increase" && upperLimit && (
                          <div className="flex justify-between items-center py-2 border-b border-[#E6E6E6]">
                            <span className="text-[12.8px] text-[#556179]">
                              Upper Limit:
                            </span>
                            <span className="text-[12.8px] font-semibold text-[#072929]">
                              ${upperLimit}
                            </span>
                          </div>
                        )}

                        {budgetAction === "decrease" && lowerLimit && (
                          <div className="flex justify-between items-center py-2 border-b border-[#E6E6E6]">
                            <span className="text-[12.8px] text-[#556179]">
                              Lower Limit:
                            </span>
                            <span className="text-[12.8px] font-semibold text-[#072929]">
                              ${lowerLimit}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center py-2 border-b border-[#E6E6E6]">
                        <span className="text-[12.8px] text-[#556179]">
                          New Status:
                        </span>
                        <span className="text-[12.8px] font-semibold text-[#072929]">
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
                      className="px-4 py-2 bg-white border border-[#E6E6E6] text-[11.2px] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
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
                      className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                    Confirm{" "}
                    {inlineEditField === "budget"
                      ? "Budget"
                      : inlineEditField === "budgetType"
                      ? "Budget Type"
                      : "Status"}{" "}
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
                            : inlineEditField === "budgetType"
                            ? "Budget Type"
                            : "Status"}
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
                      className="px-4 py-2 bg-white border border-[#E6E6E6] text-[11.2px] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
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
            <div
              className="border border-[#E6E6E6] border-t-0 rounded-b-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] overflow-hidden px-6 pb-6 pt-1"
              style={{ backgroundColor: "#F5F5F0" }}
            >
              {loading ? (
                <div
                  className="p-8 text-center text-[#556179]"
                  style={{ backgroundColor: "#F5F5F0" }}
                >
                  Loading campaigns...
                </div>
              ) : campaigns.length === 0 ? (
                <div
                  className="p-8 text-center text-[#556179]"
                  style={{ backgroundColor: "#F5F5F0" }}
                >
                  No campaigns found
                </div>
              ) : (
                <div className="bg-white rounded-xl overflow-hidden">
                  {/* Table Header Row */}
                  <div className="border-b border-[#E6E6E6] flex items-center h-[48px] bg-white rounded-t-xl">
                    {/* Checkbox Header */}
                    <div className="w-[35px] flex items-center justify-center">
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
                              new Set(campaigns.map((c) => c.campaignId))
                            );
                          } else {
                            setSelectedCampaigns(new Set());
                          }
                        }}
                        size="small"
                      />
                    </div>

                    {/* Profile Name Header */}
                    <div
                      className="w-[150px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("profile_name")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Profile Name
                      </p>
                      {getSortIcon("profile_name")}
                    </div>

                    {/* Campaign Name Header */}
                    <div
                      className="w-[280px] px-4 cursor-pointer hover:bg-gray-50 flex items-center"
                      onClick={() => handleSort("campaign_name")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Campaign Name
                      </p>
                      {getSortIcon("campaign_name")}
                    </div>

                    {/* Campaign Type Header */}
                    <div
                      className="w-[80px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("type")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Type
                      </p>
                      {getSortIcon("type")}
                    </div>

                    {/* State Header */}
                    <div
                      className="w-[100px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("status")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        State
                      </p>
                      {getSortIcon("status")}
                    </div>

                    {/* Budget Header */}
                    <div
                      className="w-[120px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("budget")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Budget
                      </p>
                      {getSortIcon("budget")}
                    </div>

                    {/* Budget Type Header */}
                    <div
                      className="w-[120px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("budgetType")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Budget Type
                      </p>
                      {getSortIcon("budgetType")}
                    </div>

                    {/* Start Date Header */}
                    <div
                      className="w-[120px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("startDate")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Start Date
                      </p>
                      {getSortIcon("startDate")}
                    </div>

                    {/* Spends Header */}
                    <div
                      className="w-[100px] text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("spends")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Spends
                      </p>
                      {getSortIcon("spends")}
                    </div>

                    {/* Sales Header */}
                    <div
                      className="text-center flex-1 min-w-[51px] cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("sales")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Sales
                      </p>
                      {getSortIcon("sales")}
                    </div>

                    {/* ACOS Header */}
                    <div
                      className="text-center flex-1 min-w-[47px] cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("acos")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        ACOS
                      </p>
                      {getSortIcon("acos")}
                    </div>

                    {/* ROAS Header */}
                    <div
                      className="text-center flex-1 min-w-[47px] cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => handleSort("roas")}
                    >
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        ROAS
                      </p>
                      {getSortIcon("roas")}
                    </div>

                    {/* Actions Header */}
                    <div className="w-[54px] text-center mr-4">
                      <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                        Actions
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E6E6E6]">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.campaignId}
                        className="flex items-center h-[48px] bg-white hover:bg-gray-50"
                      >
                        {/* Checkbox */}
                        <div className="w-[35px] flex items-center justify-center">
                          <Checkbox
                            checked={selectedCampaigns.has(campaign.campaignId)}
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

                        {/* Profile Name */}
                        <div className="w-[150px] text-center">
                          <p className="text-[12.8px] font-normal text-black">
                            {campaign.profile_name || "—"}
                          </p>
                        </div>

                        {/* Campaign Name */}
                        <div className="w-[280px] px-4">
                          <button
                            onClick={() =>
                              navigate(
                                `/accounts/${accountId}/campaigns/${campaign.campaignId}`
                              )
                            }
                            className="text-[12.8px] font-normal text-black truncate hover:text-[#0066ff] hover:underline cursor-pointer text-left w-full"
                          >
                            {campaign.campaign_name || "Unnamed Campaign"}
                          </button>
                        </div>

                        {/* Type */}
                        <div className="w-[80px] text-center">
                          <p className="text-[12.8px] font-semibold text-[#7a4dff]">
                            {campaign.type || "SP"}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="w-[100px] text-center">
                          {editingCell?.campaignId === campaign.campaignId &&
                          editingCell?.field === "status" ? (
                            <Dropdown
                              options={[
                                { value: "Enable", label: "Enable" },
                                { value: "Paused", label: "Paused" },
                                { value: "Archived", label: "Archived" },
                              ]}
                              value={editedValue}
                              onChange={(val) => {
                                const newValue = val as string;
                                handleInlineEditChange(newValue);
                                // Use setTimeout to ensure dropdown closes before confirmation shows
                                setTimeout(() => {
                                  confirmInlineEdit(newValue);
                                }, 100);
                              }}
                              defaultOpen={true}
                              closeOnSelect={true}
                              buttonClassName="w-full text-[12.8px] px-2 py-1"
                              width="w-full"
                              align="center"
                            />
                          ) : (
                            <div
                              onClick={() =>
                                startInlineEdit(campaign, "status")
                              }
                              className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                            >
                              <StatusBadge
                                status={campaign.status || "Enable"}
                              />
                            </div>
                          )}
                        </div>

                        {/* Daily Budget */}
                        <div className="w-[120px] text-center">
                          {editingCell?.campaignId === campaign.campaignId &&
                          editingCell?.field === "budget" ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                value={editedValue}
                                onChange={(e) =>
                                  handleInlineEditChange(e.target.value)
                                }
                                onBlur={(e) => {
                                  // Get the current input value
                                  const inputValue = e.target.value;
                                  // Check if value changed before confirming
                                  confirmInlineEdit(inputValue);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur(); // This will trigger onBlur which calls confirmInlineEdit
                                  } else if (e.key === "Escape") {
                                    cancelInlineEdit();
                                  }
                                }}
                                autoFocus
                                className="w-full px-2 py-1 text-[12.8px] text-black border border-[#E6E6E6] rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
                              />
                            </div>
                          ) : (
                            <p
                              onClick={() =>
                                startInlineEdit(campaign, "budget")
                              }
                              className="text-[12.8px] font-normal text-black cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                            >
                              {formatCurrency(campaign.daily_budget || 0)}
                            </p>
                          )}
                        </div>

                        {/* Budget Type */}
                        <div className="w-[120px] text-center">
                          {editingCell?.campaignId === campaign.campaignId &&
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
                                // Use setTimeout to ensure dropdown closes before confirmation shows
                                setTimeout(() => {
                                  confirmInlineEdit(newValue);
                                }, 100);
                              }}
                              defaultOpen={true}
                              closeOnSelect={true}
                              buttonClassName="w-full text-[12.8px] px-2 py-1"
                              width="w-full"
                              align="center"
                            />
                          ) : (
                            <p
                              onClick={() =>
                                startInlineEdit(campaign, "budgetType")
                              }
                              className="text-[12.8px] font-normal text-black cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                            >
                              {campaign.budgetType || "—"}
                            </p>
                          )}
                        </div>

                        {/* Start Date */}
                        <div className="w-[120px] text-center">
                          <p className="text-[12.8px] font-normal text-black">
                            {campaign.startDate
                              ? new Date(campaign.startDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )
                              : "—"}
                          </p>
                        </div>

                        {/* Spends */}
                        <div className="w-[100px] text-center">
                          <p className="text-[12.8px] font-normal text-black">
                            {formatCurrency(campaign.spends || 0)}
                          </p>
                        </div>

                        {/* Sales */}
                        <div className="text-center flex-1 min-w-[51px]">
                          <p className="text-[12.8px] font-normal text-black">
                            {formatCurrency(campaign.sales || 0)}
                          </p>
                        </div>

                        {/* ACOS */}
                        <div className="text-center flex-1 min-w-[47px]">
                          <p className="text-[12.8px] font-normal text-black">
                            {formatPercentage(campaign.acos || 0)}
                          </p>
                        </div>

                        {/* ROAS */}
                        <div className="text-center flex-1 min-w-[47px]">
                          <p className="text-[12.8px] font-normal text-black">
                            {campaign.roas
                              ? `${campaign.roas.toFixed(2)} x`
                              : "0.00 x"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="w-[54px] text-center mr-4">
                          <button
                            onClick={() =>
                              navigate(
                                `/accounts/${accountId}/campaigns/${campaign.campaignId}`
                              )
                            }
                            className="text-[#A3A8B3] hover:text-black"
                          >
                            <svg
                              className="w-5 h-5 mx-auto"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div
                    className="border-t border-[#E6E6E6] py-4 flex items-center justify-end rounded-b-xl"
                    style={{ backgroundColor: "#F5F5F0" }}
                  >
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-2 border-r border-[#E6E6E6] text-[11.2px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
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
                              className={`px-3 py-2 border-r border-[#E6E6E6] text-[11.2px] min-w-[40px] cursor-pointer ${
                                currentPage === pageNum
                                  ? "bg-white text-[#136D6D] font-semibold"
                                  : "text-black hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-3 py-2 border-r border-[#E6E6E6] text-[11.2px] text-[#222124]">
                          ...
                        </span>
                      )}
                      {totalPages > 5 && (
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className={`px-3 py-2 border-r border-[#E6E6E6] text-[11.2px] cursor-pointer ${
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
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-[11.2px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
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
