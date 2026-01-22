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
import { useCampaigns } from "../contexts/GlobalStateContext";
import {
  campaignsService,
  type Campaign,
  type CampaignsQueryParams,
} from "../services/campaigns";
import {
  useBulkUpdateCampaigns,
  useBulkDeleteCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
} from "../hooks/mutations/useCampaignMutations";
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
import { filtersService } from "../services/filters";
import { accountsService } from "../services/accounts";
import type { FilterDefinition } from "../types/filters";

export const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { startDate, endDate } = useDateRange();
  const { sidebarWidth } = useSidebar();

  // Get account ID as number
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;

  // State for pagination, sorting, and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<FilterValues>([]);
  const [searchQuery, setSearchQuery] = useState<string>(""); // For input field and client-side filtering
  const [apiSearchQuery, setApiSearchQuery] = useState<string>(""); // For backend API calls

  // Build filter params helper
  const buildFilterParams = useCallback(
    (filterList: FilterValues): CampaignsQueryParams => {
      const params: CampaignsQueryParams = {};

      filterList.forEach((filter) => {
        if (filter.field === "campaign_name") {
          if (typeof filter.value === "string") {
            if (filter.operator === "contains") {
              params.campaign_name__icontains = filter.value;
            } else if (filter.operator === "not_contains") {
              params.campaign_name__not_icontains = filter.value;
            } else if (filter.operator === "equals") {
              params.campaign_name = filter.value;
            }
          }
        } else if (filter.field === "budget") {
          if (typeof filter.value === "number") {
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
          }
        } else if (filter.field === "state") {
          // Handle array values for multi-select
          if (Array.isArray(filter.value)) {
            params.state__in = filter.value;
          } else if (typeof filter.value === "string") {
            params.state = filter.value;
          }
        } else if (filter.field === "type") {
          // Handle array values for multi-select
          if (Array.isArray(filter.value)) {
            params.type__in = filter.value;
          } else if (typeof filter.value === "string") {
            params.type = filter.value;
          }
        } else if (filter.field === "profile_name") {
          // Handle array values for multi-select (when profile_name is used as dropdown)
          if (Array.isArray(filter.value)) {
            params.profile_name__in = filter.value;
          } else if (typeof filter.value === "string") {
            if (filter.operator === "contains") {
              params.profile_name__icontains = filter.value;
            } else if (filter.operator === "not_contains") {
              params.profile_name__not_icontains = filter.value;
            } else if (filter.operator === "equals") {
              params.profile_name = filter.value;
            }
          }
        }
      });

      return params;
    },
    []
  );

  // Build query params for React Query
  const queryParams = useMemo<CampaignsQueryParams>(() => {
    const params: CampaignsQueryParams = {
      ...(apiSearchQuery && {
        campaign_name__icontains: apiSearchQuery,
      }),
      sort_by: sortBy,
      order: sortOrder,
      page: currentPage,
      page_size: itemsPerPage,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      ...buildFilterParams(filters),
    };
    return params;
  }, [
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    filters,
    apiSearchQuery,
    buildFilterParams,
  ]);

  // Use React Query hook for campaigns data
  const {
    data: campaignsResponse,
    isLoading: loading,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = useCampaigns(accountIdNum, queryParams);

  // Extract data from response and apply client-side filtering
  const campaigns = useMemo(() => {
    const allCampaigns = campaignsResponse?.campaigns || [];

    // Apply client-side filtering if searchQuery is different from apiSearchQuery
    if (searchQuery && searchQuery !== apiSearchQuery) {
      const query = searchQuery.toLowerCase().trim();
      return allCampaigns.filter((campaign) => {
        const campaignName = (campaign.campaign_name || "").toLowerCase();
        const accountIdStr = accountId ? accountId.toString() : "";
        return campaignName.includes(query) || accountIdStr.includes(query);
      });
    }

    return allCampaigns;
  }, [campaignsResponse, searchQuery, apiSearchQuery, accountId]);

  const summary = useMemo(() => {
    return campaignsResponse?.summary || null;
  }, [campaignsResponse]);

  const chartDataFromApi = useMemo(() => {
    return campaignsResponse?.chart_data || [];
  }, [campaignsResponse]);

  const totalPages = useMemo(() => {
    return campaignsResponse?.total_pages || 0;
  }, [campaignsResponse]);

  // Mutation hooks (only initialize if accountIdNum is valid)
  const bulkUpdateMutation = useBulkUpdateCampaigns(accountIdNum || 0);
  const bulkDeleteMutation = useBulkDeleteCampaigns(accountIdNum || 0);
  const createCampaignMutation = useCreateCampaign(accountIdNum || 0);
  const updateCampaignMutation = useUpdateCampaign(accountIdNum || 0);

  // Use mutation loading states
  const bulkLoading =
    bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;
  const createCampaignLoading = createCampaignMutation.isPending;
  const inlineEditLoading = bulkUpdateMutation.isPending;
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
  const [, setFilterDefinitions] = useState<FilterDefinition[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isCreateCampaignPanelOpen, setIsCreateCampaignPanelOpen] =
    useState(false);
  const [, setCreateCampaignLoading] = useState(false);
  const [, setCreateCampaignError] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [budgetAction, setBudgetAction] = useState<
    "increase" | "decrease" | "set"
  >("increase");
  const [budgetUnit, setBudgetUnit] = useState<"percent" | "amount">("percent");
  const [budgetValue, setBudgetValue] = useState<string>("");
  const [upperLimit, setUpperLimit] = useState<string>("");
  const [lowerLimit, setLowerLimit] = useState<string>("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "enable" | "pause" | null
  >(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Profile options for campaign creation/editing (loaded once on page load)
  const [profileOptions, setProfileOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    isSuccess?: boolean;
    fieldErrors?: Record<string, string>;
    genericErrors?: string[];
    actionButton?: {
      text: string;
      onClick: () => void;
    };
  }>({ isOpen: false, message: "" });
  // Extract error message from mutation error, handling both direct errors and API response errors
  const createCampaignError = useMemo(() => {
    if (!createCampaignMutation.error) return null;

    const error = createCampaignMutation.error as any;

    // Try to extract from API response first (most common case)
    if (error?.response?.data?.error) {
      // Check if there are field errors to include
      const fieldErrors = error.response.data.field_errors;
      if (fieldErrors) {
        return JSON.stringify({
          message: error.response.data.error,
          fieldErrors: fieldErrors,
        });
      }
      return error.response.data.error;
    }

    // Try to parse if it's a JSON stringified error with field errors
    if (error?.message) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.message && parsed.fieldErrors) {
          return error.message; // Return the JSON string so panel can parse it
        }
        return parsed.message || error.message;
      } catch (e) {
        // Not JSON, return as is
        return error.message;
      }
    }

    return error?.message || "Failed to create campaign";
  }, [createCampaignMutation.error]);
  const [campaignFormMode, setCampaignFormMode] = useState<"create" | "edit">(
    "create"
  );
  const [initialCampaignData, setInitialCampaignData] =
    useState<Partial<CreateCampaignData> | null>(null);
  // Store a deep snapshot of initialCampaignData when it's set to prevent mutations
  const [originalCampaignDataSnapshot, setOriginalCampaignDataSnapshot] =
    useState<Partial<CreateCampaignData> | null>(null);
  const [editLoadingCampaignId, setEditLoadingCampaignId] = useState<
    string | number | null
  >(null);
  const [campaignId, setCampaignId] = useState<string | number | undefined>(
    undefined
  );

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    campaignId: string | number;
    field: "budget" | "budgetType" | "status";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditCampaign, setInlineEditCampaign] = useState<Campaign | null>(
    null
  );
  const [inlineEditField, setInlineEditField] = useState<
    "budget" | "budgetType" | "status" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");

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

  // Close budget panel when no campaigns are selected
  useEffect(() => {
    if (selectedCampaigns.size === 0) {
      setShowBudgetPanel(false);
    }
  }, [selectedCampaigns.size]);

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

  // React Query handles data fetching automatically based on queryParams changes
  // No need for manual useEffect to trigger fetches

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

  // Load profiles once when page loads (to avoid AJAX calls in CreateCampaignPanel)
  useEffect(() => {
    const loadProfiles = async () => {
      if (!accountIdNum) return;

      try {
        console.log("Loading profiles for account:", accountIdNum);
        const channels = await accountsService.getAccountChannels(accountIdNum);
        console.log("Channels loaded:", channels);
        const amazonChannel = channels.find(
          (ch) => ch.channel_type === "amazon"
        );
        console.log("Amazon channel found:", amazonChannel);

        if (amazonChannel) {
          const response = await accountsService.getProfiles(amazonChannel.id);
          console.log("Profiles response:", response);
          // Show all non-deleted profiles for campaign creation (not just selected ones)
          const activeProfiles = (response.profiles || []).filter(
            (profile: any) => !profile.deleted_at
          );
          console.log("Active profiles:", activeProfiles);

          const options = activeProfiles
            .map((profile: any) => {
              const profileId =
                profile.profileId || profile.id || profile.profile_id;
              const profileName = profile.name || profileId;
              const countryCode =
                profile.countryCode || profile.country_code || "";
              if (!profileId) {
                console.warn("Profile missing ID:", profile);
                return null;
              }
              // Include country code in label if available
              const label = countryCode
                ? `${profileName} (${countryCode})`
                : profileName;
              return {
                value: String(profileId),
                label: String(label || profileId),
              };
            })
            .filter(
              (opt): opt is { value: string; label: string } => opt !== null
            );

          console.log("Profile options:", options);
          setProfileOptions(options);
        } else {
          console.warn("No Amazon channel found for account:", accountIdNum);
          setProfileOptions([]);
        }
      } catch (error) {
        console.error("Failed to load profiles:", error);
        setProfileOptions([]);
      }
    };

    if (accountIdNum) {
      loadProfiles();
    }
  }, [accountIdNum]);

  // React Query handles data loading automatically
  // No need for manual loadCampaigns functions

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
      // Normalize status to match dropdown options
      const statusLower = (campaign.status || "Enabled").toLowerCase();
      const normalizedStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "Enabled"
          : statusLower === "paused"
          ? "Paused"
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
    if (!inlineEditCampaign || !inlineEditField || !accountIdNum) return;

    try {
      if (inlineEditField === "status") {
        // Map status values - Note: "archive" is not allowed via API
        const statusMap: Record<string, "enable" | "pause"> = {
          Enable: "enable",
          Paused: "pause",
          // Archived is read-only and cannot be set via API
        };
        const statusValue = statusMap[inlineEditNewValue] || "enable";

        await bulkUpdateMutation.mutateAsync({
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

        await bulkUpdateMutation.mutateAsync({
          campaignIds: [inlineEditCampaign.campaignId],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });
      } else if (inlineEditField === "budgetType") {
        // Map budgetType values to uppercase
        const budgetTypeMap: Record<string, "DAILY" | "LIFETIME"> = {
          Daily: "DAILY",
          DAILY: "DAILY",
          Lifetime: "LIFETIME",
          LIFETIME: "LIFETIME",
        };
        const budgetTypeValue = budgetTypeMap[inlineEditNewValue] || "DAILY";

        await bulkUpdateMutation.mutateAsync({
          campaignIds: [inlineEditCampaign.campaignId],
          action: "budgetType",
          budgetType: budgetTypeValue,
        });
      }

      setShowInlineEditModal(false);
      setInlineEditCampaign(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update campaign. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    }
  };

  const runBulkStatus = async (statusValue: "enable" | "pause") => {
    if (!accountIdNum || selectedCampaigns.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        campaignIds: Array.from(selectedCampaigns),
        action: "status",
        status: statusValue,
      });
    } catch (error: any) {
      console.error("Failed to update campaigns", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update campaigns. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    }
  };

  const runBulkDelete = async () => {
    if (!accountIdNum || selectedCampaigns.size === 0) return;

    try {
      await bulkDeleteMutation.mutateAsync({
        campaignIds: Array.from(selectedCampaigns),
      });

      // Clear selection after successful delete
      setSelectedCampaigns(new Set());
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error("Failed to delete campaigns", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete campaigns. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowDeleteModal(false);
    }
  };

  const runBulkBudget = async () => {
    if (!accountIdNum || selectedCampaigns.size === 0) return;

    const valueNum = parseFloat(budgetValue);
    if (isNaN(valueNum)) {
      return;
    }
    const upper = upperLimit ? parseFloat(upperLimit) : undefined;
    const lower = lowerLimit ? parseFloat(lowerLimit) : undefined;

    try {
      await bulkUpdateMutation.mutateAsync({
        campaignIds: Array.from(selectedCampaigns),
        action: "budget",
        budgetAction,
        unit: budgetUnit,
        value: valueNum,
        upperLimit: upper,
        lowerLimit: lower,
      });
    } catch (error: any) {
      console.error("Failed to update budgets", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update budgets. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    }
  };

  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const handleCreateCampaign = async (data: CreateCampaignData) => {
    if (!accountIdNum) return;

    try {
      const response = await createCampaignMutation.mutateAsync({
        ...data,
        // Ensure type matches the service payload (no empty string)
        type: (data.type || "SP") as "SP" | "SB" | "SD",
      });

      console.log("Create campaign response:", response);

      // Extract campaign ID and type from response
      // Backend returns: { "created": True, "campaignId": "...", "campaignType": "SP"|"SB"|"SD", "response": {...} }
      let campaignId: string | number | null = null;
      const campaignType = response?.campaignType || data.type || "SP"; // Use response type or fallback to data type

      // First try to get campaignId directly from response
      if (response?.campaignId) {
        campaignId = response.campaignId;
      } else if (response?.response) {
        // Fallback: Check if response contains campaign data
        if (
          response.response.campaigns &&
          Array.isArray(response.response.campaigns) &&
          response.response.campaigns.length > 0
        ) {
          const campaign = response.response.campaigns[0];
          campaignId = campaign.campaignId || campaign.id || null;
        }
      }

      // Close the panel
      setIsCreateCampaignPanelOpen(false);

      // Show success modal with navigation button if we have campaign ID
      if (campaignId) {
        // Construct URL with campaign type prefix: sp_123456, sb_123456, or sd_123456
        const campaignTypeAndId = `${campaignType.toLowerCase()}_${campaignId}`;
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `Campaign "${data.campaign_name}" created successfully!`,
          isSuccess: true,
          actionButton: {
            text: "View Campaign",
            onClick: () => {
              setErrorModal({ isOpen: false, message: "" });
              navigate(
                `/accounts/${accountIdNum}/campaigns/${campaignTypeAndId}`
              );
            },
          },
        });
      } else {
        // If no campaign ID, show success
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `Campaign "${data.campaign_name}" created successfully!`,
          isSuccess: true,
        });
      }
    } catch (error: any) {
      console.error("Failed to create campaign:", error);

      // Extract error message from backend response
      let errorMessage = "Failed to create campaign. Please try again.";
      let fieldErrors: Record<string, string> = {};
      let genericErrors: string[] = [];

      if (error?.response?.data) {
        // Parse standardized error format
        if (error.response.data.field_errors) {
          fieldErrors = error.response.data.field_errors;
        }

        if (error.response.data.generic_errors) {
          genericErrors = Array.isArray(error.response.data.generic_errors)
            ? error.response.data.generic_errors
            : [error.response.data.generic_errors];
        }

        // Get summary error message
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (genericErrors.length > 0) {
          errorMessage = genericErrors[0];
        } else if (Object.keys(fieldErrors).length > 0) {
          // Build summary from field errors
          const fieldNames = Object.keys(fieldErrors);
          errorMessage = `Validation failed: ${fieldNames.length} field error(s)`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
        genericErrors = [error.message];
      }

      // Auto-open error modal with field errors and generic errors
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: errorMessage,
        isSuccess: false,
        fieldErrors:
          Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
        genericErrors: genericErrors.length > 0 ? genericErrors : undefined,
      });

      // Pass field errors to the panel via a custom error object
      // The panel will parse this and set field-specific errors
      const errorWithFields = {
        message: errorMessage,
        fieldErrors: fieldErrors,
        genericErrors: genericErrors,
      };

      // Re-throw error so the form knows submission failed
      // Note: createCampaignError is derived from mutation error state
      throw new Error(JSON.stringify(errorWithFields));
    }
  };

  // Shared submit handler for the campaign panel
  const handleCampaignPanelSubmit = async (data: CreateCampaignData) => {
    if (!accountId) return;

    // If in edit mode, use update API instead of create
    if (campaignFormMode === "edit" && campaignId) {
      await handleUpdateCampaign(data);
    } else {
      await handleCreateCampaign(data);
    }
  };

  // Handle campaign updates in edit mode
  const handleUpdateCampaign = async (data: CreateCampaignData) => {
    if (!accountId || !campaignId) return;

    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) {
      throw new Error("Invalid account ID");
    }

    // Set loading state for the specific campaign being edited
    setEditLoadingCampaignId(campaignId);

    try {
      // Get original data to compare changes
      // IMPORTANT: Use the snapshot (captured when form opened) instead of current initialCampaignData
      // This prevents mutations from the form affecting the comparison
      const original = originalCampaignDataSnapshot
        ? JSON.parse(JSON.stringify(originalCampaignDataSnapshot))
        : initialCampaignData
        ? JSON.parse(JSON.stringify(initialCampaignData))
        : null;
      if (!original) {
        throw new Error("Original campaign data not available");
      }

      // Build update payload with all changed fields
      const updatePayload: any = {};

      // 1. Check if name changed
      if (
        data.campaign_name !== original.campaign_name &&
        data.campaign_name.trim()
      ) {
        updatePayload.name = data.campaign_name.trim();
      }

      // 2. Check if status changed
      const originalStatus = original.status || "";
      const newStatus = data.status || "";

      // Normalize status values for comparison
      const normalizeStatusForCompare = (s: string) => {
        const upper = s.toUpperCase();
        if (upper === "ENABLED" || upper === "ENABLE") return "enabled";
        if (upper === "PAUSED" || upper === "PAUSE") return "paused";
        return s.toLowerCase();
      };

      // Map status to API format
      const statusMap: Record<string, "enable" | "pause"> = {
        Enabled: "enable",
        ENABLED: "enable",
        enable: "enable",
        enabled: "enable",
        Paused: "pause",
        PAUSED: "pause",
        pause: "pause",
        paused: "pause",
      };

      if (
        normalizeStatusForCompare(newStatus) !==
        normalizeStatusForCompare(originalStatus)
      ) {
        updatePayload.status = statusMap[newStatus] || "enable";
      }

      // 3. Check if budget changed
      const originalBudget = original.budget || 0;
      const newBudget = data.budget || 0;
      if (Math.abs(newBudget - originalBudget) > 0.01) {
        updatePayload.budget = newBudget;
      }

      // 4. Check if budgetType changed
      const originalBudgetType = original.budgetType || "";
      const newBudgetType = data.budgetType || "";
      const normalizeBudgetType = (bt: string) => bt.toLowerCase();
      if (
        normalizeBudgetType(newBudgetType) !==
          normalizeBudgetType(originalBudgetType) &&
        (normalizeBudgetType(newBudgetType) === "daily" ||
          normalizeBudgetType(newBudgetType) === "lifetime")
      ) {
        // For SD campaigns, use lowercase; for SP/SB, use uppercase
        if (data.type === "SD") {
          updatePayload.budgetType = normalizeBudgetType(newBudgetType) as
            | "daily"
            | "lifetime";
        } else {
          updatePayload.budgetType = newBudgetType.toUpperCase() as
            | "DAILY"
            | "LIFETIME";
        }
      }

      // 5. Check if endDate changed (for SP and SD campaigns)
      if (data.type === "SP" || data.type === "SD") {
        const originalEndDate = original.endDate || "";
        const newEndDate = data.endDate || "";

        // Convert both to YYYYMMDD format for comparison
        const normalizeEndDate = (dateStr: string): string => {
          if (!dateStr) return "";
          if (!dateStr.includes("-") && /^\d{8}$/.test(dateStr)) return dateStr;
          if (dateStr.includes("-")) {
            return dateStr.replace(/-/g, "");
          }
          return dateStr;
        };

        const originalEndDateNormalized = normalizeEndDate(originalEndDate);
        const newEndDateNormalized = normalizeEndDate(newEndDate);

        if (originalEndDateNormalized !== newEndDateNormalized) {
          updatePayload.endDate = newEndDateNormalized || null;
        }
      }

      // 6. Check if portfolioId changed
      const originalPortfolioId = original.portfolioId || "";
      const newPortfolioId = data.portfolioId || "";
      const originalPortfolioIdStr = originalPortfolioId
        ? String(originalPortfolioId).trim()
        : "";
      const newPortfolioIdStr = newPortfolioId
        ? String(newPortfolioId).trim()
        : "";
      if (originalPortfolioIdStr !== newPortfolioIdStr) {
        updatePayload.portfolioId = newPortfolioIdStr || null;
      }

      // 7. Check if targetingType changed (for SP campaigns)
      if (data.type === "SP") {
        const originalTargetingType = original.targetingType || "";
        const newTargetingType = data.targetingType || "";
        const normalizeTargetingType = (tt: any) => {
          if (!tt) return "";
          const ttStr = String(tt).trim();
          if (!ttStr) return "";
          return ttStr.toUpperCase();
        };
        if (
          normalizeTargetingType(originalTargetingType) !==
          normalizeTargetingType(newTargetingType)
        ) {
          const newTargetingTypeStr = newTargetingType
            ? String(newTargetingType).trim().toUpperCase()
            : "";
          if (newTargetingTypeStr) {
            updatePayload.targetingType = newTargetingTypeStr as
              | "AUTO"
              | "MANUAL";
          }
        }

        // 8. Check if tags changed
        const normalizeTags = (tags: any): string[] => {
          if (!tags) return [];
          if (Array.isArray(tags)) {
            return tags
              .filter(
                (tag) => tag && typeof tag === "object" && tag.key && tag.value
              )
              .sort((a, b) => a.key.localeCompare(b.key))
              .map((tag) => `${tag.key}:${tag.value}`);
          }
          if (typeof tags === "object" && tags !== null) {
            return Object.entries(tags)
              .filter(([key, value]) => key && value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => `${key}:${value}`);
          }
          return [];
        };

        const originalNormalized = normalizeTags(original.tags);
        const newNormalized = normalizeTags(data.tags);
        const tagsChanged =
          JSON.stringify(originalNormalized) !== JSON.stringify(newNormalized);

        if (tagsChanged) {
          let tagsToSend: Array<{ key: string; value: string }> = [];
          const newTagsRaw = data.tags;

          if (Array.isArray(newTagsRaw)) {
            tagsToSend = newTagsRaw.filter(
              (tag) => tag && typeof tag === "object" && tag.key && tag.value
            );
          } else if (typeof newTagsRaw === "object" && newTagsRaw !== null) {
            tagsToSend = Object.entries(newTagsRaw)
              .filter(([key, value]) => key && value)
              .map(([key, value]) => ({
                key: String(key),
                value: String(value),
              }));
          }
          updatePayload.tags = tagsToSend;
        }

        // 9. Check if siteRestrictions changed
        // Skip siteRestrictions - cannot be updated after campaign creation (Amazon API limitation)
        // Note: siteRestrictions field is disabled in edit mode, so this check should never trigger
        // But we skip it anyway as a safety measure

        // 10. Check if dynamicBidding (bidding) changed
        const originalBidding = original.bidding || {};
        const newBidding = data.bidding || {};

        // First, do a quick check on raw data - if both are empty/undefined, no change
        if (!originalBidding || Object.keys(originalBidding).length === 0) {
          if (!newBidding || Object.keys(newBidding).length === 0) {
            // Both empty, no change
          } else if (
            newBidding.bidAdjustmentsByPlacement &&
            newBidding.bidAdjustmentsByPlacement.length > 0
          ) {
            // Original empty but new has placements - there's a change
            updatePayload.dynamicBidding = newBidding;
          }
        } else if (!newBidding || Object.keys(newBidding).length === 0) {
          // Original has data but new is empty - there's a change
          updatePayload.dynamicBidding = newBidding;
        } else {
          // Both have data, normalize and compare
          // Normalize bidding objects for comparison
          const normalizeBidding = (bidding: any) => {
            if (!bidding || typeof bidding !== "object") return {};

            const normalized: any = {};

            // Normalize strategy
            if (bidding.strategy) {
              normalized.strategy = bidding.strategy;
            }

            // Normalize bidAdjustmentsByPlacement - ensure all placements are included for accurate comparison
            // The form always sends all 4 placements, but original data might only have non-zero ones
            const allPlacements = [
              "PLACEMENT_TOP",
              "PLACEMENT_REST_OF_SEARCH",
              "PLACEMENT_PRODUCT_PAGE",
              "SITE_AMAZON_BUSINESS",
            ];

            if (
              bidding.bidAdjustmentsByPlacement &&
              Array.isArray(bidding.bidAdjustmentsByPlacement)
            ) {
              // Create a map of existing placements
              const placementMap = new Map();
              bidding.bidAdjustmentsByPlacement
                .filter((adj: any) => adj && adj.placement)
                .forEach((adj: any) => {
                  placementMap.set(
                    adj.placement,
                    adj.percentage !== undefined && adj.percentage !== null
                      ? Number(adj.percentage)
                      : 0
                  );
                });

              // Ensure all placements are included, defaulting to 0 if not present
              const sorted = allPlacements
                .map((placement) => ({
                  placement,
                  percentage: placementMap.get(placement) ?? 0,
                }))
                .sort((a, b) => a.placement.localeCompare(b.placement));

              normalized.bidAdjustmentsByPlacement = sorted;
            } else {
              // If bidAdjustmentsByPlacement doesn't exist, create array with all placements at 0
              normalized.bidAdjustmentsByPlacement = allPlacements
                .map((placement) => ({ placement, percentage: 0 }))
                .sort((a, b) => a.placement.localeCompare(b.placement));
            }

            // Normalize shopperCohortBidAdjustments - sort for consistent comparison
            if (
              bidding.shopperCohortBidAdjustments &&
              Array.isArray(bidding.shopperCohortBidAdjustments)
            ) {
              const sorted = [...bidding.shopperCohortBidAdjustments]
                .filter(
                  (adj) =>
                    adj &&
                    adj.percentage !== undefined &&
                    adj.percentage !== null
                )
                .sort((a, b) => {
                  const aType = (a.shopperCohortType || "").localeCompare(
                    b.shopperCohortType || ""
                  );
                  if (aType !== 0) return aType;
                  return JSON.stringify(a.audienceSegments || []).localeCompare(
                    JSON.stringify(b.audienceSegments || [])
                  );
                })
                .map((adj) => ({
                  percentage: Number(adj.percentage) || 0,
                  shopperCohortType:
                    adj.shopperCohortType || "AUDIENCE_SEGMENT",
                  audienceSegments: Array.isArray(adj.audienceSegments)
                    ? [...adj.audienceSegments].sort()
                    : [],
                }));
              if (sorted.length > 0) {
                normalized.shopperCohortBidAdjustments = sorted;
              }
            }

            return normalized;
          };

          const normalizedOriginal = normalizeBidding(originalBidding);
          const normalizedNew = normalizeBidding(newBidding);

          // Compare placements more explicitly - check each placement individually
          const originalPlacements =
            normalizedOriginal.bidAdjustmentsByPlacement || [];
          const newPlacements = normalizedNew.bidAdjustmentsByPlacement || [];

          // Create maps for easier comparison
          const originalPlacementMap = new Map(
            originalPlacements.map((p: any) => [p.placement, p.percentage])
          );
          const newPlacementMap = new Map(
            newPlacements.map((p: any) => [p.placement, p.percentage])
          );

          // Check if any placement percentage differs
          let placementsChanged = false;
          const allPlacements = [
            "PLACEMENT_TOP",
            "PLACEMENT_REST_OF_SEARCH",
            "PLACEMENT_PRODUCT_PAGE",
            "SITE_AMAZON_BUSINESS",
          ];
          const placementComparisons: any = {};
          for (const placement of allPlacements) {
            const originalPct = originalPlacementMap.get(placement) ?? 0;
            const newPct = newPlacementMap.get(placement) ?? 0;
            placementComparisons[placement] = {
              original: originalPct,
              new: newPct,
              changed: originalPct !== newPct,
            };
            if (originalPct !== newPct) {
              placementsChanged = true;
              break;
            }
          }

          // Check if strategy changed
          const strategyChanged =
            normalizedOriginal.strategy !== normalizedNew.strategy;

          // Check if shopper cohort adjustments changed
          const originalCohorts =
            normalizedOriginal.shopperCohortBidAdjustments || [];
          const newCohorts = normalizedNew.shopperCohortBidAdjustments || [];
          const cohortsChanged =
            JSON.stringify(originalCohorts) !== JSON.stringify(newCohorts);

          const biddingChanged =
            placementsChanged || strategyChanged || cohortsChanged;

          if (biddingChanged) {
            updatePayload.dynamicBidding = newBidding;
          }
        }
      }

      // Check changes for SB campaigns
      if (data.type === "SB") {
        // 8. Check if tags changed (same logic as SP)
        const normalizeTags = (tags: any): string[] => {
          if (!tags) return [];
          if (Array.isArray(tags)) {
            return tags
              .filter(
                (tag) => tag && typeof tag === "object" && tag.key && tag.value
              )
              .sort((a, b) => a.key.localeCompare(b.key))
              .map((tag) => `${tag.key}:${tag.value}`);
          }
          if (typeof tags === "object" && tags !== null) {
            return Object.entries(tags)
              .filter(([key, value]) => key && value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => `${key}:${value}`);
          }
          return [];
        };

        const originalNormalized = normalizeTags(original.tags);
        const newNormalized = normalizeTags(data.tags);
        const tagsChanged =
          JSON.stringify(originalNormalized) !== JSON.stringify(newNormalized);

        if (tagsChanged) {
          let tagsToSend: Array<{ key: string; value: string }> = [];
          const newTagsRaw = data.tags;

          if (Array.isArray(newTagsRaw)) {
            tagsToSend = newTagsRaw.filter(
              (tag) => tag && typeof tag === "object" && tag.key && tag.value
            );
          } else if (typeof newTagsRaw === "object" && newTagsRaw !== null) {
            tagsToSend = Object.entries(newTagsRaw)
              .filter(([key, value]) => key && value)
              .map(([key, value]) => ({
                key: String(key),
                value: String(value),
              }));
          }
          updatePayload.tags = tagsToSend;
        }

        // 9. Check if bidding changed (for SB campaigns, it's called "bidding" not "dynamicBidding")
        const originalBidding = original.bidding || {};
        const newBidding = data.bidding || {};

        // First, do a quick check on raw data - if both are empty/undefined, no change
        if (!originalBidding || Object.keys(originalBidding).length === 0) {
          if (!newBidding || Object.keys(newBidding).length === 0) {
            // Both empty, no change
          } else if (
            newBidding.bidAdjustmentsByPlacement &&
            newBidding.bidAdjustmentsByPlacement.length > 0
          ) {
            // Original empty but new has placements - there's a change
            updatePayload.bidding = newBidding;
          }
        } else if (!newBidding || Object.keys(newBidding).length === 0) {
          // Original has data but new is empty - there's a change
          updatePayload.bidding = newBidding;
        } else {
          // Both have data, normalize and compare
          // Normalize bidding objects for comparison (same logic as SP)
          const normalizeBidding = (bidding: any) => {
            if (!bidding || typeof bidding !== "object") return {};

            const normalized: any = {};

            // Normalize bidOptimization
            if (bidding.bidOptimization !== undefined) {
              normalized.bidOptimization = Boolean(bidding.bidOptimization);
            }

            // Normalize bidAdjustmentsByPlacement - ensure all placements are included for accurate comparison
            const allPlacements = [
              "PLACEMENT_TOP",
              "PLACEMENT_REST_OF_SEARCH",
              "PLACEMENT_PRODUCT_PAGE",
              "SITE_AMAZON_BUSINESS",
            ];

            if (
              bidding.bidAdjustmentsByPlacement &&
              Array.isArray(bidding.bidAdjustmentsByPlacement)
            ) {
              // Create a map of existing placements
              const placementMap = new Map();
              bidding.bidAdjustmentsByPlacement
                .filter((adj: any) => adj && adj.placement)
                .forEach((adj: any) => {
                  placementMap.set(
                    adj.placement,
                    adj.percentage !== undefined && adj.percentage !== null
                      ? Number(adj.percentage)
                      : 0
                  );
                });

              // Ensure all placements are included, defaulting to 0 if not present
              const sorted = allPlacements
                .map((placement) => ({
                  placement,
                  percentage: placementMap.get(placement) ?? 0,
                }))
                .sort((a, b) => a.placement.localeCompare(b.placement));

              normalized.bidAdjustmentsByPlacement = sorted;
            } else {
              // If bidAdjustmentsByPlacement doesn't exist, create array with all placements at 0
              normalized.bidAdjustmentsByPlacement = allPlacements
                .map((placement) => ({ placement, percentage: 0 }))
                .sort((a, b) => a.placement.localeCompare(b.placement));
            }

            // Normalize shopperCohortBidAdjustments - sort for consistent comparison
            if (
              bidding.shopperCohortBidAdjustments &&
              Array.isArray(bidding.shopperCohortBidAdjustments)
            ) {
              const sorted = [...bidding.shopperCohortBidAdjustments]
                .filter(
                  (adj) =>
                    adj &&
                    adj.percentage !== undefined &&
                    adj.percentage !== null
                )
                .sort((a, b) => {
                  const aType = (a.shopperCohortType || "").localeCompare(
                    b.shopperCohortType || ""
                  );
                  if (aType !== 0) return aType;
                  return JSON.stringify(a.audienceSegments || []).localeCompare(
                    JSON.stringify(b.audienceSegments || [])
                  );
                })
                .map((adj) => ({
                  percentage: Number(adj.percentage) || 0,
                  shopperCohortType:
                    adj.shopperCohortType || "AUDIENCE_SEGMENT",
                  audienceSegments: Array.isArray(adj.audienceSegments)
                    ? [...adj.audienceSegments].sort()
                    : [],
                }));
              if (sorted.length > 0) {
                normalized.shopperCohortBidAdjustments = sorted;
              }
            }

            return normalized;
          };

          const normalizedOriginal = normalizeBidding(originalBidding);
          const normalizedNew = normalizeBidding(newBidding);

          // Compare placements more explicitly - check each placement individually
          const originalPlacements =
            normalizedOriginal.bidAdjustmentsByPlacement || [];
          const newPlacements = normalizedNew.bidAdjustmentsByPlacement || [];

          // Create maps for easier comparison
          const originalPlacementMap = new Map(
            originalPlacements.map((p: any) => [p.placement, p.percentage])
          );
          const newPlacementMap = new Map(
            newPlacements.map((p: any) => [p.placement, p.percentage])
          );

          // Check if any placement percentage differs
          let placementsChanged = false;
          const allPlacements = [
            "PLACEMENT_TOP",
            "PLACEMENT_REST_OF_SEARCH",
            "PLACEMENT_PRODUCT_PAGE",
            "SITE_AMAZON_BUSINESS",
          ];
          for (const placement of allPlacements) {
            const originalPct = originalPlacementMap.get(placement) ?? 0;
            const newPct = newPlacementMap.get(placement) ?? 0;
            if (originalPct !== newPct) {
              placementsChanged = true;
              break;
            }
          }

          // Check if bidOptimization changed
          const bidOptimizationChanged =
            normalizedOriginal.bidOptimization !==
            normalizedNew.bidOptimization;

          // Check if shopper cohort adjustments changed
          const originalCohorts =
            normalizedOriginal.shopperCohortBidAdjustments || [];
          const newCohorts = normalizedNew.shopperCohortBidAdjustments || [];
          const cohortsChanged =
            JSON.stringify(originalCohorts) !== JSON.stringify(newCohorts);

          const biddingChanged =
            placementsChanged || bidOptimizationChanged || cohortsChanged;

          if (biddingChanged) {
            updatePayload.bidding = newBidding;
          }
        }

        // 10. Check if startDate changed (for SB and SD campaigns)
        const originalStartDate = original.startDate || "";
        const newStartDate = data.startDate || "";

        // Convert both to YYYYMMDD format for comparison
        const normalizeStartDate = (dateStr: string): string => {
          if (!dateStr) return "";
          if (!dateStr.includes("-") && /^\d{8}$/.test(dateStr)) return dateStr;
          if (dateStr.includes("-")) {
            return dateStr.replace(/-/g, "");
          }
          return dateStr;
        };

        const originalStartDateNormalized =
          normalizeStartDate(originalStartDate);
        const newStartDateNormalized = normalizeStartDate(newStartDate);

        if (originalStartDateNormalized !== newStartDateNormalized) {
          updatePayload.startDate = newStartDateNormalized || null;
        }
      }

      // Check changes for SD campaigns
      if (data.type === "SD") {
        // 11. Check if costType changed (for SD campaigns)
        const originalCostType = original.costType || "";
        const newCostType = data.costType || "";
        if (
          originalCostType !== newCostType &&
          (newCostType === "cpc" || newCostType === "vcpm")
        ) {
          updatePayload.costType = newCostType;
        }

        // 12. Check if tactic changed (for SD campaigns)
        const originalTactic = original.tactic || "";
        const newTactic = data.tactic || "";
        if (
          originalTactic !== newTactic &&
          (newTactic === "T00020" || newTactic === "T00030")
        ) {
          updatePayload.tactic = newTactic;
        }
      }

      // Execute single update if there are changes
      if (Object.keys(updatePayload).length === 0) {
        // No changes detected, show message but keep panel open
        setErrorModal({
          isOpen: true,
          title: "No Changes",
          message:
            "No changes were detected. The campaign data is already up to date.",
          isSuccess: true,
        });
        // Don't close the panel - let user continue editing
        setEditLoadingCampaignId(null);
        return;
      }

      // Make single API call with all changes
      const response = await campaignsService.updateCampaign(
        accountIdNum,
        campaignId,
        updatePayload
      );

      // Refetch campaigns to update the data table
      await refetchCampaigns();

      // Close the panel
      setIsCreateCampaignPanelOpen(false);
      setInitialCampaignData(null);
      setOriginalCampaignDataSnapshot(null); // Clear snapshot when closing
      setCampaignFormMode("create");
      setEditLoadingCampaignId(null);

      // Show success modal with optional "View Campaign" button
      const campaignTypeAndId = `${data.type.toLowerCase()}_${campaignId}`;
      setErrorModal({
        isOpen: true,
        title: "Success",
        message: `Campaign "${data.campaign_name}" updated successfully!`,
        isSuccess: true,
        actionButton: {
          text: "View Campaign",
          onClick: () => {
            setErrorModal({ isOpen: false, message: "" });
            navigate(
              `/accounts/${accountIdNum}/campaigns/${campaignTypeAndId}`
            );
          },
        },
      });
    } catch (error: any) {
      console.error("Failed to update campaign:", error);
      setEditLoadingCampaignId(null);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update campaign. Please try again.";
      // Re-throw error so parent component can handle it
      throw error;
    }
  };

  // Open edit mode for an existing campaign (UI wiring; full edit flow can be added on top)
  const handleOpenEditCampaign = async (row: Campaign) => {
    if (!accountId) return;

    try {
      setEditLoadingCampaignId(row.campaignId);
      setCampaignFormMode("edit");
      setIsCreateCampaignPanelOpen(true);

      const accountIdNum = parseInt(accountId);
      const detail = await campaignsService.getCampaignDetail(
        accountIdNum,
        row.campaignId,
        undefined,
        undefined,
        row.type
      );

      const campaign = detail.campaign;

      // Normalize status into the values expected by the CreateCampaignPanel
      let normalizedStatus: any = campaign.status;
      if (row.type) {
        const typeUpper = row.type.toUpperCase();
        if (typeUpper === "SP" || typeUpper === "SB") {
          // SP/SB: we want "Enabled" / "Paused" for the dropdown
          const raw = String(campaign.status || "").toUpperCase();
          if (raw === "PAUSED") {
            normalizedStatus = "Paused";
          } else {
            normalizedStatus = "Enabled";
          }
        } else if (typeUpper === "SD") {
          // SD: keep lower-case "enabled"/"paused" for the existing mapping logic
          const raw = String(campaign.status || "").toLowerCase();
          if (raw === "paused") {
            normalizedStatus = "paused";
          } else {
            normalizedStatus = "enabled";
          }
        }
      }

      // Map dynamicBidding from backend to frontend bidding structure (for SP campaigns)
      const mapDynamicBidding = (dynamicBidding: any) => {
        if (!dynamicBidding) return undefined;

        // If dynamicBidding is a string, parse it as JSON
        let parsedBidding = dynamicBidding;
        if (typeof dynamicBidding === "string") {
          try {
            parsedBidding = JSON.parse(dynamicBidding);
          } catch (e) {
            console.error("Failed to parse dynamicBidding JSON:", e);
            return undefined;
          }
        }

        const bidding: any = {
          bidOptimization: true, // Default value
          shopperCohortBidAdjustments: [],
          bidAdjustmentsByPlacement: [],
        };

        // Map strategy
        if (parsedBidding.strategy) {
          bidding.strategy = parsedBidding.strategy;
        }

        // Map placementBidding to bidAdjustmentsByPlacement
        if (
          parsedBidding.placementBidding &&
          Array.isArray(parsedBidding.placementBidding)
        ) {
          bidding.bidAdjustmentsByPlacement =
            parsedBidding.placementBidding.map((pb: any) => ({
              percentage: pb.percentage || 0,
              placement: pb.placement, // Already in correct format (PLACEMENT_TOP, etc.)
            }));
        }

        // Map shopperCohortBidding to shopperCohortBidAdjustments
        if (
          parsedBidding.shopperCohortBidding &&
          Array.isArray(parsedBidding.shopperCohortBidding)
        ) {
          bidding.shopperCohortBidAdjustments =
            parsedBidding.shopperCohortBidding.map((scb: any) => ({
              percentage: scb.percentage || 0,
              shopperCohortType: scb.shopperCohortType || "AUDIENCE_SEGMENT",
              audienceSegments: scb.audienceSegments || [],
            }));
        }

        console.log(
          "Mapped dynamicBidding:",
          parsedBidding,
          "to bidding:",
          bidding
        );
        return bidding;
      };

      // Map bidding from backend to frontend bidding structure (for SB campaigns)
      const mapBidding = (bidding: any) => {
        if (!bidding) return undefined;

        // If bidding is a string, parse it as JSON
        let parsedBidding = bidding;
        if (typeof bidding === "string") {
          try {
            parsedBidding = JSON.parse(bidding);
          } catch (e) {
            console.error("Failed to parse bidding JSON:", e);
            return undefined;
          }
        }

        const biddingObj: any = {
          bidOptimization: parsedBidding.bidOptimization ?? true, // Default value
          shopperCohortBidAdjustments: [],
          bidAdjustmentsByPlacement: [],
        };

        // Map bidAdjustmentsByPlacement (SB uses same field name)
        if (
          parsedBidding.bidAdjustmentsByPlacement &&
          Array.isArray(parsedBidding.bidAdjustmentsByPlacement)
        ) {
          biddingObj.bidAdjustmentsByPlacement =
            parsedBidding.bidAdjustmentsByPlacement.map((pb: any) => ({
              percentage: pb.percentage || 0,
              placement: pb.placement, // Already in correct format (PLACEMENT_TOP, etc.)
            }));
        }

        // Map shopperCohortBidAdjustments (SB uses same field name)
        if (
          parsedBidding.shopperCohortBidAdjustments &&
          Array.isArray(parsedBidding.shopperCohortBidAdjustments)
        ) {
          biddingObj.shopperCohortBidAdjustments =
            parsedBidding.shopperCohortBidAdjustments.map((scb: any) => ({
              percentage: scb.percentage || 0,
              shopperCohortType: scb.shopperCohortType || "AUDIENCE_SEGMENT",
              audienceSegments: scb.audienceSegments || [],
            }));
        }

        console.log(
          "Mapped bidding:",
          parsedBidding,
          "to bidding:",
          biddingObj
        );
        return biddingObj;
      };

      // Map siteRestrictions (could be array or string)
      const mapSiteRestrictions = (siteRestrictions: any) => {
        if (!siteRestrictions) return undefined;
        // If it's an array, take the first element (frontend expects string)
        if (Array.isArray(siteRestrictions) && siteRestrictions.length > 0) {
          return siteRestrictions[0];
        }
        // If it's a string, return as is
        if (typeof siteRestrictions === "string") {
          return siteRestrictions;
        }
        return undefined;
      };

      const campaignTypeUpper = (row.type?.toUpperCase() as any) || "SP";

      const initial: Partial<CreateCampaignData> = {
        campaign_name: campaign.name || row.campaign_name,
        type: campaignTypeUpper,
        // Try to pre-select profile if we have it on the row
        profileId: (row as any).profile_id || undefined,
        // Pre-select portfolio if present in campaign detail
        portfolioId: (campaign as any).portfolioId
          ? String((campaign as any).portfolioId)
          : undefined,
        budget:
          typeof campaign.budget === "number"
            ? campaign.budget
            : row.daily_budget || 0,
        budgetType: (() => {
          const rawBudgetType =
            (campaign.budgetType as any) || (row.budgetType as any);
          if (!rawBudgetType) {
            // Default based on campaign type
            return campaignTypeUpper === "SD" ? "daily" : "DAILY";
          }
          // Normalize budgetType based on campaign type
          if (campaignTypeUpper === "SD") {
            // SD campaigns use lowercase
            return String(rawBudgetType).toLowerCase() === "lifetime"
              ? "lifetime"
              : "daily";
          } else {
            // SP and SB campaigns use uppercase
            return String(rawBudgetType).toUpperCase() === "LIFETIME"
              ? "LIFETIME"
              : "DAILY";
          }
        })(),
        status: normalizedStatus || "Enabled",
        startDate: campaign.startDate || row.startDate,
        // Include endDate for all campaign types (SB campaigns now support endDate)
        endDate: campaign.endDate,
        // Only include targetingType for SP campaigns
        ...(campaignTypeUpper === "SP" && {
          targetingType:
            (campaign.targetingType as any) ||
            (campaign.targeting_type as any) ||
            undefined,
        }),
        // Map bidding based on campaign type
        bidding:
          campaignTypeUpper === "SB"
            ? mapBidding((campaign as any).bidding || (row as any).bidding)
            : mapDynamicBidding(
                (campaign as any).dynamicBidding || (row as any).dynamicBidding
              ),
        // SB-specific fields
        ...(campaignTypeUpper === "SB" && {
          brandEntityId: (campaign as any).brandEntityId || undefined,
          goal: (campaign as any).goal || "PAGE_VISIT",
          productLocation: (campaign as any).productLocation || "",
        }),
        // SD-specific fields
        ...(campaignTypeUpper === "SD" && {
          tactic: (campaign as any).tactic || (row as any).tactic || undefined,
          costType:
            (campaign as any).costType || (row as any).costType || undefined,
        }),
        // Map tags from object to array format
        tags: (() => {
          const tagsData = (campaign as any).tags || (row as any).tags;
          if (!tagsData) return undefined;

          // If it's already an array, return as is
          if (Array.isArray(tagsData)) {
            return tagsData;
          }

          // If it's an object, convert to array
          if (typeof tagsData === "object" && tagsData !== null) {
            return Object.entries(tagsData).map(([key, value]) => ({
              key,
              value: value as string,
            }));
          }

          // If it's a string, try to parse as JSON
          if (typeof tagsData === "string") {
            try {
              const parsed = JSON.parse(tagsData);
              if (Array.isArray(parsed)) {
                return parsed;
              }
              if (typeof parsed === "object" && parsed !== null) {
                return Object.entries(parsed).map(([key, value]) => ({
                  key,
                  value: value as string,
                }));
              }
            } catch (e) {
              console.error("Failed to parse tags:", e);
            }
          }

          return undefined;
        })(),
        // Map siteRestrictions
        siteRestrictions: mapSiteRestrictions(
          (campaign as any).siteRestrictions ||
            (campaign as any).site_restrictions ||
            (row as any).siteRestrictions ||
            (row as any).site_restrictions
        ),
      };

      // Create a deep snapshot IMMEDIATELY to prevent mutations
      const snapshot = JSON.parse(JSON.stringify(initial));
      setOriginalCampaignDataSnapshot(snapshot);

      setInitialCampaignData(initial);
      setCampaignId(row.campaignId);
      // After data is loaded and form state is set, smoothly scroll to top
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      setEditLoadingCampaignId(null);
    } catch (error) {
      console.error("Failed to load campaign for edit:", error);
      setEditLoadingCampaignId(null);
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
        title={errorModal.title || (errorModal.isSuccess ? "Success" : "Error")}
        message={errorModal.message}
        isSuccess={errorModal.isSuccess}
        fieldErrors={errorModal.fieldErrors}
        genericErrors={errorModal.genericErrors}
        actionButton={errorModal.actionButton}
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
                Campaigns Overview
              </h1>
              <div className="flex items-center gap-2">
                <CreateCampaignSection
                  isOpen={
                    isCreateCampaignPanelOpen && campaignFormMode === "create"
                  }
                  onToggle={() => {
                    setCampaignFormMode("create");
                    setInitialCampaignData(null);
                    setOriginalCampaignDataSnapshot(null);
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

            {/* Create / Edit Campaign Panel */}
            {isCreateCampaignPanelOpen && (
              <div className="relative z-[999998]">
                <CreateCampaignPanel
                  isOpen={isCreateCampaignPanelOpen}
                  onClose={() => {
                    setIsCreateCampaignPanelOpen(false);
                    setInitialCampaignData(null);
                    setOriginalCampaignDataSnapshot(null);
                    setCampaignFormMode("create");
                    setCampaignId(undefined);
                    setEditLoadingCampaignId(null);
                  }}
                  onSubmit={handleCampaignPanelSubmit}
                  accountId={accountId}
                  profiles={profileOptions}
                  loading={
                    createCampaignLoading ||
                    editLoadingCampaignId === campaignId
                  }
                  submitError={createCampaignError}
                  mode={campaignFormMode}
                  initialData={initialCampaignData}
                  campaignId={campaignId}
                />
              </div>
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

            {/* Chart Section with overlay when panel is open */}
            <div className="relative">
              <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={toggleChartMetric}
                metrics={campaignMetrics}
                title="Performance Trends"
              />
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
              {/* Loading overlay for chart */}
              {loading && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <svg
                      className="loading-spinner"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="loading-message">Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Search, Edit and Export Buttons - Above Table */}
            <div className="flex items-center justify-end gap-2">
              {/* Search Box */}
              <div className="search-input-container flex gap-[8px] h-[40px] items-center p-[10px] w-[272px]">
                <div className="relative shrink-0 size-[12px]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.5 9.5C7.70914 9.5 9.5 7.70914 9.5 5.5C9.5 3.29086 7.70914 1.5 5.5 1.5C3.29086 1.5 1.5 3.29086 1.5 5.5C1.5 7.70914 3.29086 9.5 5.5 9.5Z"
                      stroke="#556179"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5 10.5L8.5 8.5"
                      stroke="#556179"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Don't reset page or call API while typing - only filter client-side
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Call backend API when Enter is pressed
                      setApiSearchQuery(searchQuery);
                      setCurrentPage(1); // Reset to first page when searching
                    }
                  }}
                  placeholder="Search by Name or Account ID"
                  className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179] font-['GT_America_Trial'] font-normal"
                />
              </div>
              <div className="flex items-center gap-2">
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
                      setShowBudgetPanel(false);
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
                          { value: "pause", label: "Pause" },
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
                              if (opt.value === "edit_budget") {
                                setShowBudgetPanel(true);
                              } else if (opt.value === "delete") {
                                setShowBudgetPanel(false);
                                setShowDeleteModal(true);
                              } else {
                                setShowBudgetPanel(false);
                                setPendingStatusAction(
                                  opt.value as "enable" | "pause"
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
                      className="edit-button"
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
            </div>

            {/* Campaigns Table Card with overlay when panel is open */}
            <div className="relative">
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
                            // When "Set To" is selected, automatically use $ (amount)
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
                          className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
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
                        className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors"
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
                        className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bulkLoading ? "Applying..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteModal && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !bulkLoading) {
                      setShowDeleteModal(false);
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      Delete Campaigns?
                    </h3>

                    <p className="text-[12.16px] text-[#556179] mb-4">
                      You are about to permanently delete{" "}
                      {selectedCampaigns.size} selected campaign
                      {selectedCampaigns.size !== 1 ? "s" : ""}. This will stop
                      all ad serving immediately and cannot be undone. Deleted
                      campaigns can still be viewed in reports but not edited or
                      re-enabled.
                    </p>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!bulkLoading) {
                            setShowDeleteModal(false);
                          }
                        }}
                        disabled={bulkLoading}
                        className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={runBulkDelete}
                        disabled={bulkLoading}
                        className="px-4 py-2 bg-red-600 text-white text-[10.64px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bulkLoading ? "Deleting..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline Edit Confirmation Modal */}
              {showInlineEditModal && inlineEditCampaign && inlineEditField && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
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
                        className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={runInlineEdit}
                        disabled={inlineEditLoading}
                        className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {inlineEditLoading ? "Updating..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full relative">
                <div className="overflow-x-auto w-full">
                  {campaigns.length === 0 && !loading ? (
                    <div className="text-center py-8">
                      <p className="text-[13.3px] text-[#556179] mb-4">
                        No campaigns found
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-[1200px] w-full">
                      {/* Always render table header to maintain height */}
                      <thead>
                        <tr className="border-b border-[#e8e8e3]">
                          {/* Checkbox Header */}
                          <th className="table-header w-[35px] sticky left-0 z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]">
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
                                    setShowBudgetPanel(false);
                                  }
                                }}
                                size="small"
                              />
                            </div>
                          </th>

                          {/* Campaign Name Header */}
                          <th
                            className="table-header min-w-[300px] max-w-[400px] table-sticky-first-column"
                            onClick={() => handleSort("campaign_name")}
                          >
                            <div className="flex items-center gap-1">
                              Campaign Name
                              {getSortIcon("campaign_name")}
                            </div>
                          </th>

                          {/* Profile Header */}
                          <th
                            className="table-header cursor-pointer hover:bg-gray-50 min-w-[200px]"
                            onClick={() => handleSort("profile_name")}
                          >
                            <div className="flex items-center gap-1">
                              Profile
                              {getSortIcon("profile_name")}
                            </div>
                          </th>

                          {/* Country Header */}
                          <th className="table-header min-w-[100px]">
                            Country
                          </th>

                          {/* Campaign Type Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("type")}
                          >
                            <div className="flex items-center gap-1">
                              Type
                              {getSortIcon("type")}
                            </div>
                          </th>

                          {/* State Header */}
                          <th
                            className="table-header cursor-pointer hover:bg-gray-50 min-w-[115px]"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              State
                              {getSortIcon("status")}
                            </div>
                          </th>

                          {/* Budget Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("budget")}
                          >
                            <div className="flex items-center gap-1">
                              Budget
                              {getSortIcon("budget")}
                            </div>
                          </th>

                          {/* Budget Type Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("budgetType")}
                          >
                            <div className="flex items-center gap-1">
                              Budget Type
                              {getSortIcon("budgetType")}
                            </div>
                          </th>

                          {/* Start Date Header */}
                          <th
                            className="table-header cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                            onClick={() => handleSort("startDate")}
                          >
                            <div className="flex items-center gap-1">
                              Start Date
                              {getSortIcon("startDate")}
                            </div>
                          </th>

                          {/* Spends Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("spends")}
                          >
                            <div className="flex items-center gap-1">
                              Spends
                              {getSortIcon("spends")}
                            </div>
                          </th>

                          {/* Sales Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("sales")}
                          >
                            <div className="flex items-center gap-1">
                              Sales
                              {getSortIcon("sales")}
                            </div>
                          </th>

                          {/* Impressions Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("impressions")}
                          >
                            <div className="flex items-center gap-1">
                              Impressions
                              {getSortIcon("impressions")}
                            </div>
                          </th>

                          {/* Clicks Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("clicks")}
                          >
                            <div className="flex items-center gap-1">
                              Clicks
                              {getSortIcon("clicks")}
                            </div>
                          </th>

                          {/* ACOS Header */}
                          <th
                            className="table-header"
                            onClick={() => handleSort("acos")}
                          >
                            <div className="flex items-center gap-1">
                              ACOS
                              {getSortIcon("acos")}
                            </div>
                          </th>

                          {/* ROAS Header */}
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
                        {loading && campaigns.length === 0 ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <tr key={`skeleton-${index}`} className="table-row">
                              <td className="table-cell" colSpan={15}>
                                <div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            {/* Summary Row */}
                            {summary && (
                              <tr className="table-summary-row">
                                <td className="table-cell sticky left-0 z-30 bg-[#f5f5f0] border-r border-[#e8e8e3]"></td>
                                <td className="table-cell table-sticky-first-column">
                                  Total ({summary.total_campaigns})
                                </td>
                                <td className="table-cell"></td>
                                <td className="table-cell"></td>
                                <td className="table-cell"></td>
                                <td className="table-cell"></td>
                                <td className="table-cell"></td>
                                <td className="table-cell"></td>
                                <td className="table-cell"></td>
                                <td className="table-cell table-text leading-[1.26]">
                                  {formatCurrency(summary.total_spends)}
                                </td>
                                <td className="table-cell table-text leading-[1.26]">
                                  {formatCurrency(summary.total_sales)}
                                </td>
                                <td className="table-cell table-text leading-[1.26]">
                                  {summary.total_impressions.toLocaleString()}
                                </td>
                                <td className="table-cell table-text leading-[1.26]">
                                  {summary.total_clicks.toLocaleString()}
                                </td>
                                <td className="table-cell table-text leading-[1.26]">
                                  {summary.avg_acos.toFixed(2)}%
                                </td>
                                <td className="table-cell table-text leading-[1.26]">
                                  {summary.avg_roas.toFixed(2)}x
                                </td>
                              </tr>
                            )}
                            {campaigns.map((campaign, index) => {
                              const isLastRow = index === campaigns.length - 1;
                              const isArchived =
                                campaign.status?.toLowerCase() === "archived";
                              return (
                                <tr
                                  key={campaign.campaignId}
                                  className={`table-row group ${
                                    isArchived ? "bg-gray-100 opacity-60" : ""
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <td className="table-cell sticky left-0 z-30 bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
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
                                              newSet.delete(
                                                campaign.campaignId
                                              );
                                              // Close budget panel when no campaigns are selected
                                              if (newSet.size === 0) {
                                                setShowBudgetPanel(false);
                                              }
                                              return newSet;
                                            });
                                          }
                                        }}
                                        size="small"
                                      />
                                    </div>
                                  </td>

                                  {/* Campaign Name (with edit icon) */}
                                  <td className="table-cell table-sticky-first-column min-w-[300px] max-w-[400px] group-hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditCampaign(campaign);
                                        }}
                                        className="table-edit-icon"
                                        title="Edit campaign"
                                        disabled={
                                          editLoadingCampaignId ===
                                          campaign.campaignId
                                        }
                                      >
                                        {editLoadingCampaignId ===
                                        campaign.campaignId ? (
                                          // Small spinner while campaign details load
                                          <svg
                                            className="w-4 h-4 text-[#136D6D] animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              strokeWidth="4"
                                            />
                                            <path
                                              className="opacity-75"
                                              d="M4 12a8 8 0 018-8"
                                              strokeWidth="4"
                                              strokeLinecap="round"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className="w-4 h-4 text-[#556179]"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        )}
                                      </button>
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
                                        className="table-edit-link"
                                      >
                                        {campaign.campaign_name ||
                                          "Unnamed Campaign"}
                                      </button>
                                    </div>
                                  </td>

                                  {/* Profile */}
                                  <td className="table-cell min-w-[200px]">
                                    <span className="table-text leading-[1.26] whitespace-nowrap">
                                      {campaign.profile_name &&
                                      campaign.profile_name.trim() !== ""
                                        ? campaign.profile_name
                                        : "—"}
                                    </span>
                                  </td>

                                  {/* Country */}
                                  <td className="table-cell min-w-[100px]">
                                    <span className="table-text leading-[1.26] whitespace-nowrap">
                                      {campaign.profile_country_code &&
                                      campaign.profile_country_code.trim() !==
                                        ""
                                        ? campaign.profile_country_code
                                        : "—"}
                                    </span>
                                  </td>

                                  {/* Type */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {campaign.type || "SP"}
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="table-cell min-w-[115px]">
                                    {(() => {
                                      const currentStatus = (
                                        campaign.status || "Enabled"
                                      ).toUpperCase();
                                      const isArchived = currentStatus === "ARCHIVED";
                                      
                                      if (isArchived) {
                                        return (
                                          <div className="rounded px-2 py-1 opacity-60">
                                            <StatusBadge
                                              status={campaign.status || "Enabled"}
                                            />
                                          </div>
                                        );
                                      }
                                      
                                      const statusLower = (
                                        campaign.status || "Enabled"
                                      ).toLowerCase();
                                      const normalizedStatus =
                                        statusLower === "enable" ||
                                        statusLower === "enabled"
                                          ? "Enabled"
                                          : statusLower === "paused"
                                          ? "Paused"
                                          : "Enabled";
                                      
                                      return (
                                        <Dropdown
                                          options={[
                                            {
                                              value: "Enabled",
                                              label: "Enabled",
                                            },
                                            { value: "Paused", label: "Paused" },
                                            // Note: "Archived" is not included as it's read-only and cannot be set via API
                                          ]}
                                          value={normalizedStatus}
                                          onChange={(val) => {
                                            const newValue = val as string;
                                            if (editingCell?.campaignId !== campaign.campaignId ||
                                                editingCell?.field !== "status") {
                                              startInlineEdit(campaign, "status");
                                            }
                                            handleInlineEditChange(newValue);
                                            setTimeout(() => {
                                              confirmInlineEdit(newValue);
                                            }, 100);
                                          }}
                                          buttonClassName="w-full text-[13.3px] px-2 py-1"
                                          width="w-full"
                                          align="center"
                                        />
                                      );
                                    })()}
                                  </td>

                                  {/* Daily Budget */}
                                  <td className="table-cell">
                                    {(() => {
                                      const currentStatus = (
                                        campaign.status || "Enabled"
                                      ).toUpperCase();
                                      const isArchived = currentStatus === "ARCHIVED";
                                      const budgetValue = editingCell?.campaignId === campaign.campaignId &&
                                        editingCell?.field === "budget"
                                        ? editedValue
                                        : (campaign.daily_budget || 0).toString();
                                      
                                      return (
                                        <input
                                          type="number"
                                          value={budgetValue}
                                          onFocus={() => {
                                            if (isArchived) return;
                                            if (editingCell?.campaignId !== campaign.campaignId ||
                                                editingCell?.field !== "budget") {
                                              startInlineEdit(campaign, "budget");
                                            }
                                          }}
                                          onChange={(e) => {
                                            if (isArchived) return;
                                            handleInlineEditChange(e.target.value);
                                          }}
                                          onBlur={(e) => {
                                            if (isArchived) return;
                                            const inputValue = e.target.value;
                                            if (editingCell?.campaignId === campaign.campaignId &&
                                                editingCell?.field === "budget") {
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
                                          className={`w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40 ${
                                            isArchived ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                                          }`}
                                          title={
                                            isArchived
                                              ? "Archived campaigns cannot be modified. Please use the Amazon Advertising Console to manage archived campaigns."
                                              : undefined
                                          }
                                        />
                                      );
                                    })()}
                                  </td>

                                  {/* Budget Type */}
                                  <td className="table-cell">
                                    {(() => {
                                      const currentStatus = (
                                        campaign.status || "Enabled"
                                      ).toUpperCase();
                                      const isArchived = currentStatus === "ARCHIVED";
                                      
                                      if (isArchived) {
                                        return (
                                          <span className="table-text leading-[1.26] opacity-60">
                                            {campaign.budgetType || "—"}
                                          </span>
                                        );
                                      }
                                      
                                      const budgetTypeValue = editingCell?.campaignId === campaign.campaignId &&
                                        editingCell?.field === "budgetType"
                                        ? editedValue
                                        : (campaign.budgetType || "DAILY");
                                      
                                      return (
                                        <Dropdown
                                          options={[
                                            { value: "DAILY", label: "DAILY" },
                                            {
                                              value: "LIFETIME",
                                              label: "LIFETIME",
                                            },
                                          ]}
                                          value={budgetTypeValue}
                                          onChange={(val) => {
                                            const newValue = val as string;
                                            if (editingCell?.campaignId !== campaign.campaignId ||
                                                editingCell?.field !== "budgetType") {
                                              startInlineEdit(campaign, "budgetType");
                                            }
                                            handleInlineEditChange(newValue);
                                            setTimeout(() => {
                                              confirmInlineEdit(newValue);
                                            }, 100);
                                          }}
                                          buttonClassName="w-full text-[13.3px] px-2 py-1"
                                          width="w-full"
                                          align="center"
                                        />
                                      );
                                    })()}
                                  </td>

                                  {/* Start Date */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26] whitespace-nowrap">
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

                                  {/* Spends */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {formatCurrency(campaign.spends || 0)}
                                    </span>
                                  </td>

                                  {/* Sales */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {formatCurrency(campaign.sales || 0)}
                                    </span>
                                  </td>

                                  {/* Impressions */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {(
                                        campaign.impressions || 0
                                      ).toLocaleString()}
                                    </span>
                                  </td>

                                  {/* Clicks */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {(campaign.clicks || 0).toLocaleString()}
                                    </span>
                                  </td>

                                  {/* ACOS */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {formatPercentage(campaign.acos || 0)}
                                    </span>
                                  </td>

                                  {/* ROAS */}
                                  <td className="table-cell">
                                    <span className="table-text leading-[1.26]">
                                      {campaign.roas
                                        ? `${campaign.roas.toFixed(2)} x`
                                        : "0.00 x"}
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
                      <svg
                        className="loading-spinner"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="loading-spinner-circle"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="loading-spinner-path"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p className="loading-message">Loading campaigns...</p>
                    </div>
                  </div>
                )}
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
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
