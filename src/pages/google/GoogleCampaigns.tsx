import { parseDateToYYYYMMDD } from "../../utils/dateHelpers";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { formatPercentage } from "../../utils/formatters";
import {
  getStatusWithDefault,
  formatStatusForDisplay,
  convertStatusToApi,
  formatBiddingStrategy,
  formatDateForDisplay as formatDateForDisplayUtil,
  validateDateNotInPast,
  validateEndDateAfterStart,
  formatCurrency as formatCurrencyUtil,
} from "./utils/googleAdsUtils";
import { useGoogleProfiles } from "../../hooks/queries/useGoogleProfiles";
import { getStatusBadgeLabel, getChannelTypeLabel } from "../../utils/statusLabels";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Button } from "../../components/ui";
import { Dropdown } from "../../components/ui/Dropdown";
import { Banner } from "../../components/ui/Banner";
import {
  DynamicFilterPanel,
  type FilterValues,
} from "../../components/filters/DynamicFilterPanel";
import { campaignsService } from "../../services/campaigns";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import { useGoogleSyncStatus } from "../../hooks/useGoogleSyncStatus";
import { useChartCollapse } from "../../hooks/useChartCollapse";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { GoogleCampaignsTable } from "./components/GoogleCampaignsTable";
import { CreateGoogleCampaignSection } from "../../components/google/CreateGoogleCampaignSection";
import {
  CreateGoogleCampaignPanel,
  type CreateGoogleCampaignData,
} from "../../components/google/CreateGoogleCampaignPanel";
import { SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION } from "../../components/google/CreateGooglePmaxAssetGroupPanel";
import { ErrorModal } from "../../components/ui/ErrorModal";
import { Loader } from "../../components/ui/Loader";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateActionDetails,
  type BulkUpdateStatusDetails,
} from "./components/BulkUpdateConfirmationModal";
import { BulkBiddingStrategyPanel } from "./components/BulkBiddingStrategyPanel";
import { BulkConversionActionsPanel } from "./components/BulkConversionActionsPanel";
// import { CustomizeColumns } from "../../components/ui/CustomizeColumns";
import type { IGoogleCampaign, IGoogleCampaignsSummary } from "../../types/google/campaign";
import { useQuery } from "@tanstack/react-query";
import { columnPreferencesService } from "../../services/columnPreferences";
import { queryKeys } from "../../hooks/queries/queryKeys";

// IGoogleCampaign interface is now imported from GoogleCampaignsTable

export const GoogleCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
  const { data: profilesData } = useGoogleProfiles(channelIdNum);
  // Use first selected profile's currency for the page. If multiple profiles with different currencies, we still use one for consistency (summary row).
  const currencyCode = useMemo(() => {
    const profiles = profilesData?.profiles || [];
    const selected = profiles.find((p) => p.is_selected);
    return selected?.currency_code || undefined;
  }, [profilesData?.profiles]);
  const formatCurrency = useCallback(
    (value: number) => formatCurrencyUtil(value, currencyCode),
    [currencyCode]
  );
  const [campaigns, setCampaigns] = useState<IGoogleCampaign[]>([]);
  const [summary, setSummary] = useState<IGoogleCampaignsSummary | null>(null);
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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [analyticsSyncMessage, setAnalyticsSyncMessage] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Page size with localStorage persistence
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('google_campaigns_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [totalPages, setTotalPages] = useState(0);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
    localStorage.setItem('google_campaigns_page_size', newPageSize.toString());
    // Clear the request params ref to force a reload in useEffect
    lastRequestParamsRef.current = "";
  }, []);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);
  const [searchQuery, setSearchQuery] = useState<string>(""); // For input field and client-side filtering
  const [apiSearchQuery, setApiSearchQuery] = useState<string>(""); // For backend API calls
  const isLoadingRef = useRef(false);
  const lastRequestParamsRef = useRef<string>(""); // Track last request to prevent duplicate calls
  const [isCreateCampaignPanelOpen, setIsCreateCampaignPanelOpen] =
    useState(false);
  const [createCampaignLoading, setCreateCampaignLoading] = useState(false);
  const [createCampaignError, setCreateCampaignError] = useState<string | null>(
    null
  );
  const [refreshMessage, setRefreshMessage] = useState<{
    type: "loading" | "success" | "error";
    message: string;
    details?: string;
  } | null>(null);
  const [campaignFormMode, setCampaignFormMode] = useState<"create" | "edit">(
    "create"
  );
  const [initialCampaignData, setInitialCampaignData] =
    useState<Partial<CreateGoogleCampaignData> | null>(null);
  const [campaignId, setCampaignId] = useState<string | number | undefined>(
    undefined
  );
  const [editLoadingCampaignId, setEditLoadingCampaignId] = useState<
    string | number | null
  >(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    isSuccess?: boolean;
    genericErrors?: string[];
    errorDetails?: Array<{
      entity?: string;
      type?: string;
      policy_name?: string;
      policy_description?: string;
      violating_text?: string;
      error_code?: string;
      message?: string;
      is_exemptible?: boolean;
      user_message?: string;
    }>;
    actionButton?: {
      text: string;
      onClick: () => void;
    };
  }>({ isOpen: false, message: "" });

  // Chart toggles (visual parity with Amazon Campaigns)
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    impressions: false,
    clicks: false,
    acos: false,
    roas: false,
  });

  // Chart collapse state with localStorage persistence
  const [isChartCollapsed, toggleChartCollapse] = useChartCollapse(
    "google-campaigns-chart-collapsed"
  );

  // Selection and bulk actions
  const [selectedCampaigns, setSelectedCampaigns] = useState<
    Set<string | number>
  >(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [showBiddingStrategyPanel, setShowBiddingStrategyPanel] = useState(false);
  const [showConversionActionsPanel, setShowConversionActionsPanel] = useState(false);
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
    "ENABLED" | "PAUSED" | null
  >(null);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
  const [isBiddingStrategyChange, setIsBiddingStrategyChange] = useState(false);
  const [pendingBiddingStrategy, setPendingBiddingStrategy] = useState<{
    bidding_strategy_type: string;
    target_cpa_micros?: number;
    target_roas?: number;
    target_impression_share_location?: string;
    target_impression_share_location_fraction_micros?: number;
    target_impression_share_cpc_bid_ceiling_micros?: number;
  } | null>(null);
  const [pendingConversionActionIds, setPendingConversionActionIds] = useState<string[] | null>(null);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    campaignId: string | number;
    field:
    | "budget"
    | "status"
    | "start_date"
    | "end_date"
    | "bidding_strategy_type";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const isCancellingRef = useRef(false);
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [updatingField, setUpdatingField] = useState<{
    campaignId: string | number;
    field:
    | "budget"
    | "status"
    | "start_date"
    | "end_date"
    | "bidding_strategy_type";
    newValue: string;
  } | null>(null);
  const [inlineEditCampaign, setInlineEditCampaign] =
    useState<IGoogleCampaign | null>(null);
  const [inlineEditField, setInlineEditField] = useState<
    | "budget"
    | "status"
    | "start_date"
    | "end_date"
    | "bidding_strategy_type"
    | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  // Bidding strategy parameters for inline edit
  const [inlineEditTargetCpa, setInlineEditTargetCpa] = useState<string>("");
  const [inlineEditTargetRoas, setInlineEditTargetRoas] = useState<string>("");
  const [inlineEditTargetSpend, setInlineEditTargetSpend] = useState<string>("");
  const [
    inlineEditImpressionShareLocation,
    setInlineEditImpressionShareLocation,
  ] = useState<string>("TOP_OF_PAGE");
  const [
    inlineEditImpressionSharePercent,
    setInlineEditImpressionSharePercent,
  ] = useState<string>("");
  const [
    inlineEditImpressionShareCpcCeiling,
    setInlineEditImpressionShareCpcCeiling,
  ] = useState<string>("");
  const [impressionShareValidationErrors, setImpressionShareValidationErrors] = useState<{
    percent?: string;
    cpcCeiling?: string;
  }>({});
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Column visibility state
  // const [showCustomizeColumns, setShowCustomizeColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [inlineEditSuccess, setInlineEditSuccess] = useState<{
    campaignId: string | number;
    field: string;
  } | null>(null);
  const [inlineEditError, setInlineEditError] = useState<{
    campaignId: string | number;
    field: string;
    message: string;
  } | null>(null);

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

  // Set page title
  useEffect(() => {
    setPageTitle("Google Campaigns");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Auto-hide success message after 2 seconds
  useEffect(() => {
    if (inlineEditSuccess) {
      const timer = setTimeout(() => {
        setInlineEditSuccess(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [inlineEditSuccess]);

  // Auto-hide error message after 2 seconds
  useEffect(() => {
    if (inlineEditError) {
      const timer = setTimeout(() => {
        setInlineEditError(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [inlineEditError]);

  // Default column order (matches GoogleCampaignsTable allColumns order)
  const defaultColumnOrder = useMemo(() => [
    "campaign_name",
    "account_name",
    "advertising_channel_type",
    "status",
    "budget",
    "start_date",
    "end_date",
    "bidding_strategy_type",
    "currency",
    "impressions",
    "clicks",
    "spends",
    "sales",
    "roas",
    "conversions",
    "conversion_rate",
    "cost_per_conversion",
    "avg_cpc",
    "avg_cost",
    "interaction_rate",
  ], []);

  // Load column preferences
  const { data: columnPreference, isLoading: isLoadingPreferences } = useQuery({
    queryKey: queryKeys.columnPreferences.detail('google', 'campaigns'),
    queryFn: () => columnPreferencesService.get('google', 'campaigns'),
    retry: false, // Don't retry on 404 (no preferences saved yet)
  });


  // Initialize columns from preferences or defaults
  useEffect(() => {
    if (!isLoadingPreferences) {
      if (columnPreference) {
        // Load saved preferences
        setVisibleColumns(new Set(columnPreference.visible_columns));
        setColumnOrder(columnPreference.column_order.length > 0
          ? columnPreference.column_order
          : defaultColumnOrder);
      } else {
        // Use defaults
        setVisibleColumns(new Set(defaultColumnOrder));
        setColumnOrder(defaultColumnOrder);
      }
    }
  }, [columnPreference, isLoadingPreferences, defaultColumnOrder]);

  // Removed buildFilterParams - now passing filters array directly to service

  const loadCampaigns = useCallback(async (accountId: number, channelId: number) => {
    // Prevent duplicate concurrent calls
    if (isLoadingRef.current) {
      return;
    }

    // Validate channelId before making the call
    if (!channelId || isNaN(channelId)) {
      console.error("loadCampaigns: channelId is required and must be a valid number", { accountId, channelId });
      setLoading(false);
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        page: currentPage,
        page_size: itemsPerPage,
        start_date: startDate
          ? startDateStr
          : undefined,
        end_date: endDate ? endDateStr : undefined,
        filters: filters || [], // Pass filters array directly - ensure it's always an array
        ...(apiSearchQuery && {
          campaign_name__icontains: apiSearchQuery,
        }),
      };

      console.log("🔍 [FILTERS DEBUG] Sending filters to service:", {
        filters,
        filtersType: Array.isArray(filters) ? "array" : typeof filters,
        filtersLength: Array.isArray(filters) ? filters.length : "N/A",
        params,
      });

      const response = await googleAdwordsCampaignsService.getGoogleCampaigns(
        accountId,
        channelId,
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
        setChartDataFromApi(responseWithChart.chart_data);
      } else {
        setChartDataFromApi([]);
      }
      // Clear selection when campaigns reload
      setSelectedCampaigns(new Set());
    } catch (error) {
      console.error("Failed to load Google campaigns:", error);
      setCampaigns([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [sortBy, sortOrder, currentPage, itemsPerPage, startDate, endDate, filters, apiSearchQuery]);

  // Apply client-side filtering if searchQuery is different from apiSearchQuery
  const filteredCampaigns = useMemo(() => {
    // Apply client-side filtering if searchQuery is different from apiSearchQuery
    if (searchQuery && searchQuery !== apiSearchQuery) {
      const query = searchQuery.toLowerCase().trim();
      return campaigns.filter((campaign) => {
        const campaignName = (campaign.campaign_name || "").toLowerCase();
        const accountIdStr = accountId ? accountId.toString() : "";
        return campaignName.includes(query) || accountIdStr.includes(query);
      });
    }

    return campaigns;
  }, [campaigns, searchQuery, apiSearchQuery, accountId]);

  // Wrapper function for useGoogleSyncStatus hook (it expects only accountId)
  const loadCampaignsWrapper = useCallback(async (accountId: number) => {
    const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
    if (channelIdNum && !isNaN(channelIdNum)) {
      await loadCampaigns(accountId, channelIdNum);
    }
  }, [channelId, loadCampaigns]);

  // Sync status hook (after loadCampaigns is defined)
  const { SyncStatusBanner } = useGoogleSyncStatus({
    accountId,
    entityType: "campaigns",
    currentData: campaigns,
    loadFunction: loadCampaignsWrapper,
  });

  useEffect(() => {
    // Don't reload if we're currently sorting (handleSort will handle the reload)
    // Also don't reload when sortBy/sortOrder changes (handleSort handles that)
    if (sorting) return;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        // Create a unique key for this request to prevent duplicate calls
        const requestKey = JSON.stringify({
          accountId: accountIdNum,
          currentPage,
          itemsPerPage,
          filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
          startDate: startDate ? startDateStr : null,
          endDate: endDate ? endDateStr : null,
          apiSearchQuery,
        });

        // Only call loadCampaigns if the request parameters have actually changed
        if (lastRequestParamsRef.current !== requestKey) {
          lastRequestParamsRef.current = requestKey;
          const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
          if (channelIdNum && !isNaN(channelIdNum)) {
            loadCampaigns(accountIdNum, channelIdNum);
          }
        }
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, channelId, currentPage, itemsPerPage, filters, startDate, endDate, sorting, apiSearchQuery]);

  const handleCreateGoogleCampaign = async (data: CreateGoogleCampaignData) => {
    console.log("handleCreateGoogleCampaign called", {
      accountId,
      campaignFormMode,
      campaignId,
      data: { ...data, keywords: data.keywords ? "..." : undefined } // Don't log full keywords array
    });

    if (!accountId) {
      const errorMessage = "Account ID is missing";
      console.error(errorMessage);
      setCreateCampaignError(errorMessage);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
      throw new Error(errorMessage);
    }

    // If in edit mode, call update handler instead
    if (campaignFormMode === "edit" && campaignId) {
      console.log("Edit mode detected, calling handleUpdateGoogleCampaign");
      try {
        await handleUpdateGoogleCampaign(data);
        console.log("handleUpdateGoogleCampaign completed successfully");
      } catch (error: any) {
        console.error("Error in handleUpdateGoogleCampaign:", error);
        // Error is already handled in handleUpdateGoogleCampaign
        // But ensure it's displayed
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to update campaign. Please try again.";

        console.error("Update error:", errorMessage);

        // Show error in modal as well (if not already shown)
        if (!errorModal.isOpen) {
          setErrorModal({
            isOpen: true,
            title: "Update Failed",
            message: errorMessage,
            isSuccess: false,
          });
        }

        // Also set form error
        setCreateCampaignError(errorMessage);

        throw error; // Re-throw so form knows there was an error
      }
      return;
    }

    setCreateCampaignLoading(true);
    setCreateCampaignError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Prepare payload - filter out asset group fields if constant is false and campaign type is PERFORMANCE_MAX
      let payload: any = { ...(data as any) };

      if (
        data.campaign_type === "PERFORMANCE_MAX" &&
        !SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION
      ) {
        // Filter out asset group fields to prevent backend from creating asset group
        // BUT keep business_name and logo_url (and their asset IDs/resource names) because
        // they are required for Brand Guidelines, not just for asset groups
        const {
          asset_group_name,
          headlines,
          descriptions,
          long_headlines,
          marketing_image_url,
          square_marketing_image_url,
          headline_asset_resource_names,
          description_asset_resource_names,
          long_headline_asset_resource_names,
          marketing_image_asset_resource_name,
          square_marketing_image_asset_resource_name,
          video_asset_resource_names,
          sitelink_asset_resource_names,
          callout_asset_resource_names,
          headline_asset_ids,
          description_asset_ids,
          long_headline_asset_ids,
          marketing_image_asset_id,
          square_marketing_image_asset_id,
          video_asset_ids,
          sitelink_asset_ids,
          callout_asset_ids,
          // Keep business_name and logo_url for Brand Guidelines
          // business_name, logo_url, business_name_asset_id, business_name_asset_resource_name,
          // logo_asset_id, logo_asset_resource_name are NOT destructured, so they stay in rest
          ...rest
        } = payload;

        payload = rest;
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const response = await googleAdwordsCampaignsService.createGoogleCampaign(
        accountIdNum,
        channelIdNum,
        payload
      );

      console.log("Create Google campaign response:", response);

      // Extract campaign ID from response
      let newCampaignId: string | number | null = null;
      if (response?.campaign_id) {
        newCampaignId = response.campaign_id;
      }

      // Close the panel and stop loading
      setIsCreateCampaignPanelOpen(false);
      setCreateCampaignLoading(false);
      setCreateCampaignError(null);
      setInitialCampaignData(null);
      setCampaignFormMode("create");
      setCampaignId(undefined);

      // Check for language result info
      const languageResult = response?.language_result;
      let successMessage = `Campaign "${data.name}" created successfully!`;

      if (languageResult?.invalid_languages && languageResult.invalid_languages.length > 0) {
        const invalidCount = languageResult.invalid_languages.length;
        const invalidList = languageResult.invalid_languages.join(", ");
        successMessage += `\n\nNote: ${invalidCount} language(s) could not be targeted and were skipped: ${invalidList}`;
      }

      // Show success modal with navigation button if we have campaign ID
      if (newCampaignId) {
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage,
          isSuccess: true,
          actionButton: {
            text: "View Campaign",
            onClick: () => {
              setErrorModal({ isOpen: false, message: "" });
              const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
              if (channelIdNum) {
                navigate(
                  `/brands/${accountIdNum}/${channelIdNum}/google/campaigns/${newCampaignId}`
                );
              }
            },
          },
        });
        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (channelIdNum && !isNaN(channelIdNum)) {
          await loadCampaigns(accountIdNum, channelIdNum);
        }
      } else {
        // If no campaign ID, show success and reload campaigns
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage,
          isSuccess: true,
        });

        // Refresh campaigns to get updated data
        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (channelIdNum && !isNaN(channelIdNum)) {
          await loadCampaigns(accountIdNum, channelIdNum);
        }
      }
    } catch (error: any) {
      console.error("Failed to create Google campaign:", error);
      setCreateCampaignLoading(false);

      // Extract error message from backend response
      let errorMessage = "Failed to create campaign. Please try again.";
      let errorDetails: any = null;
      let fieldErrors: Record<string, string> | null = null;

      const responseData = error?.response?.data;

      if (responseData) {
        // Check for validation errors (400 status)
        if (error.response.status === 400) {
          if (responseData.error) {
            errorMessage = responseData.error;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          }
        } else {
          // Check for error message
          if (responseData.error) {
            errorMessage = responseData.error;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          }
        }

        // Check for detailed Google Ads error information
        if (responseData.details) {
          errorDetails = responseData.details;
        }

        const googleAdsErrors =
          responseData.google_ads_errors ||
          errorDetails?.google_ads_errors ||
          errorDetails?.errors;

        // Special-case handling: URL custom parameter key/value validation errors
        if (Array.isArray(googleAdsErrors) && googleAdsErrors.length > 0) {
          const urlParamErrors = googleAdsErrors.filter((err: any) => {
            const msg = String(err?.message || "");
            const loc = String(err?.location || "");
            return (
              msg.includes("disallowed characters") &&
              loc.includes("url_custom_parameters")
            );
          });

          if (urlParamErrors.length > 0) {
            const badParams: string[] = [];

            urlParamErrors.forEach((err: any) => {
              const loc = String(err?.location || "");
              const indexMatch = /index:\s*(\d+)/.exec(loc);
              let label = "";

              if (indexMatch) {
                const idx = parseInt(indexMatch[1], 10);
                const params = data.url_custom_parameters || [];
                if (idx >= 0 && idx < params.length) {
                  label = params[idx]?.key || `Custom parameter #${idx + 1}`;
                } else {
                  label = `Custom parameter #${idx + 1}`;
                }
              }

              if (label) {
                badParams.push(label);
              }
            });

            const uniqueLabels = Array.from(new Set(badParams));

            if (uniqueLabels.length === 1) {
              errorMessage = `URL custom parameter key "${uniqueLabels[0]}" contains characters that Google Ads does not allow. Try using letters, numbers, and allowed symbols only.`;
            } else if (uniqueLabels.length > 1) {
              errorMessage = `Some URL custom parameter keys contain characters that Google Ads does not allow: ${uniqueLabels.join(
                ", "
              )}. Try using letters, numbers, and allowed symbols only.`;
            } else {
              errorMessage =
                "One or more URL custom parameter keys contain characters that Google Ads does not allow. Try using letters, numbers, and allowed symbols only.";
            }

            fieldErrors = {
              url_custom_parameters: errorMessage,
            };
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // For the panel, send either a structured JSON string (for field errors)
      // or a plain message. The panel will parse fieldErrors if present.
      if (fieldErrors) {
        setCreateCampaignError(
          JSON.stringify({
            message: errorMessage,
            fieldErrors,
          })
        );
      } else {
        setCreateCampaignError(errorMessage);
      }

      // Don't close panel on error - let user fix and resubmit
      // Re-throw error so the form knows submission failed
      throw error;
    }
  };

  // Handle campaign updates in edit mode
  const handleUpdateGoogleCampaign = async (data: CreateGoogleCampaignData) => {
    console.log("handleUpdateGoogleCampaign called", { accountId, campaignId, data });

    if (!accountId || !campaignId) {
      console.error("Cannot update campaign: missing accountId or campaignId", {
        accountId,
        campaignId,
      });
      const errorMessage = "Missing account or campaign ID";
      setCreateCampaignError(errorMessage);
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: errorMessage,
        isSuccess: false,
      });
      throw new Error(errorMessage);
    }

    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) {
      const errorMessage = "Invalid account ID";
      setCreateCampaignError(errorMessage);
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: errorMessage,
        isSuccess: false,
      });
      throw new Error(errorMessage);
    }

    setCreateCampaignLoading(true);
    setCreateCampaignError(null);

    try {
      // Get original data to compare changes
      const original = initialCampaignData;
      if (!original) {
        const errorMessage = "Original campaign data not available. Please close and reopen the edit panel.";
        console.error(errorMessage);
        setCreateCampaignError(errorMessage);
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: errorMessage,
          isSuccess: false,
        });
        setCreateCampaignLoading(false);
        throw new Error(errorMessage);
      }

      console.log("Comparing original vs new data", {
        original: {
          bidding_strategy_type: original.bidding_strategy_type,
          target_impression_share_location: original.target_impression_share_location,
          target_impression_share_location_fraction_micros: original.target_impression_share_location_fraction_micros,
          target_impression_share_cpc_bid_ceiling_micros: original.target_impression_share_cpc_bid_ceiling_micros,
        },
        newData: {
          bidding_strategy_type: data.bidding_strategy_type,
          target_impression_share_location: data.target_impression_share_location,
          target_impression_share_location_fraction_micros: data.target_impression_share_location_fraction_micros,
          target_impression_share_cpc_bid_ceiling_micros: data.target_impression_share_cpc_bid_ceiling_micros,
        }
      });

      console.log("Updating campaign:", {
        campaignId,
        original,
        newData: data,
      });

      // Collect all changes to send in a single API call
      const updatePayload: any = {
        campaignIds: [campaignId],
      };

      // 1. Check if name changed
      const originalName = original.name || "";
      const newName = data.name || "";
      if (newName !== originalName && newName) {
        console.log("Name changed:", { originalName, newName });
        updatePayload.name = newName;
      }

      // 2. Check if status changed
      const originalStatus = original.status || "";
      const newStatus = data.status || "";
      if (newStatus !== originalStatus && newStatus) {
        console.log("Status changed:", { originalStatus, newStatus });
        updatePayload.status = newStatus;
      }

      // 3. Check if budget changed
      const originalBudget = original.budget_amount || 0;
      const newBudget = data.budget_amount || 0;
      if (Math.abs(newBudget - originalBudget) > 0.01) {
        console.log("Budget changed:", { originalBudget, newBudget });
        updatePayload.value = newBudget;
        updatePayload.budgetAction = "set";
        updatePayload.unit = "amount";
      }

      // 4. Check if start_date changed
      const originalStartDate = parseDateToYYYYMMDD(original.start_date) || "";
      const newStartDate = parseDateToYYYYMMDD(data.start_date) || "";
      if (newStartDate !== originalStartDate && newStartDate) {
        console.log("Start date changed:", { originalStartDate, newStartDate });
        updatePayload.start_date = newStartDate;
      }

      // 5. Check if end_date changed
      const originalEndDate = parseDateToYYYYMMDD(original.end_date) || "";
      const newEndDate = parseDateToYYYYMMDD(data.end_date) || "";
      if (newEndDate !== originalEndDate && newEndDate) {
        console.log("End date changed:", { originalEndDate, newEndDate });
        updatePayload.end_date = newEndDate;
      }

      // 6. Check if Shopping Settings changed (only for SHOPPING campaigns)
      if (data.campaign_type === "SHOPPING") {
        // Check merchant_id
        const originalMerchantId = original.merchant_id || "";
        const newMerchantId = data.merchant_id || "";
        if (newMerchantId !== originalMerchantId && newMerchantId) {
          console.log("Merchant ID changed:", {
            originalMerchantId,
            newMerchantId,
          });
          updatePayload.merchant_id = newMerchantId;
        }

        // Check sales_country
        const originalSalesCountry = original.sales_country || "US";
        const newSalesCountry = data.sales_country || "US";
        if (newSalesCountry !== originalSalesCountry) {
          console.log("Sales country changed:", {
            originalSalesCountry,
            newSalesCountry,
          });
          updatePayload.sales_country = newSalesCountry;
        }

        // Check campaign_priority
        const originalPriority = original.campaign_priority ?? 0;
        const newPriority = data.campaign_priority ?? 0;
        if (newPriority !== originalPriority) {
          console.log("Campaign priority changed:", {
            originalPriority,
            newPriority,
          });
          updatePayload.campaign_priority = newPriority;
        }

        // Check enable_local
        const originalEnableLocal = original.enable_local ?? false;
        const newEnableLocal = data.enable_local ?? false;
        if (newEnableLocal !== originalEnableLocal) {
          console.log("Enable local changed:", {
            originalEnableLocal,
            newEnableLocal,
          });
          updatePayload.enable_local = newEnableLocal;
        }
      }

      // 7. Check if bidding strategy changed
      const originalBiddingStrategy = original.bidding_strategy_type || "";
      const newBiddingStrategy = data.bidding_strategy_type || "";
      if (newBiddingStrategy !== originalBiddingStrategy && newBiddingStrategy) {
        console.log("Bidding strategy changed:", {
          originalBiddingStrategy,
          newBiddingStrategy,
        });
        updatePayload.action = "bidding_strategy";
        updatePayload.bidding_strategy_type = newBiddingStrategy;

        // Include target values if they exist
        if (data.target_cpa_micros !== undefined) {
          updatePayload.target_cpa_micros = data.target_cpa_micros;
        }
        if (data.target_roas !== undefined) {
          updatePayload.target_roas = data.target_roas;
        }

        // For TARGET_IMPRESSION_SHARE, location and fraction_micros are required together
        if (newBiddingStrategy === "TARGET_IMPRESSION_SHARE") {
          // Always include location (use form value or original)
          updatePayload.target_impression_share_location =
            data.target_impression_share_location || original.target_impression_share_location || "TOP_OF_PAGE";

          // Always include fraction_micros (required field)
          // Priority: form data > original data > default (100%)
          const fractionMicros = data.target_impression_share_location_fraction_micros !== undefined && data.target_impression_share_location_fraction_micros !== null
            ? data.target_impression_share_location_fraction_micros
            : (original.target_impression_share_location_fraction_micros !== undefined && original.target_impression_share_location_fraction_micros !== null
              ? original.target_impression_share_location_fraction_micros
              : 1000000); // Default to 100% if not provided
          updatePayload.target_impression_share_location_fraction_micros = fractionMicros;

          // Include CPC bid ceiling (use form value or original value)
          const cpcCeiling = data.target_impression_share_cpc_bid_ceiling_micros !== undefined && data.target_impression_share_cpc_bid_ceiling_micros !== null
            ? data.target_impression_share_cpc_bid_ceiling_micros
            : original.target_impression_share_cpc_bid_ceiling_micros;
          if (cpcCeiling !== undefined && cpcCeiling !== null) {
            updatePayload.target_impression_share_cpc_bid_ceiling_micros = cpcCeiling;
          }
        }
      } else if (newBiddingStrategy === originalBiddingStrategy && newBiddingStrategy) {
        // Bidding strategy type didn't change, but target values might have
        if (
          data.target_cpa_micros !== undefined &&
          data.target_cpa_micros !== original.target_cpa_micros
        ) {
          updatePayload.action = "bidding_strategy";
          updatePayload.bidding_strategy_type = newBiddingStrategy;
          updatePayload.target_cpa_micros = data.target_cpa_micros;
        }
        if (
          data.target_roas !== undefined &&
          data.target_roas !== original.target_roas
        ) {
          updatePayload.action = "bidding_strategy";
          updatePayload.bidding_strategy_type = newBiddingStrategy;
          updatePayload.target_roas = data.target_roas;
        }

        // For TARGET_IMPRESSION_SHARE, handle location and required fields together
        if (newBiddingStrategy === "TARGET_IMPRESSION_SHARE") {
          const locationChanged = data.target_impression_share_location &&
            data.target_impression_share_location !== original.target_impression_share_location;
          const fractionChanged = data.target_impression_share_location_fraction_micros !== undefined &&
            data.target_impression_share_location_fraction_micros !== original.target_impression_share_location_fraction_micros;
          const cpcCeilingChanged = data.target_impression_share_cpc_bid_ceiling_micros !== undefined &&
            data.target_impression_share_cpc_bid_ceiling_micros !== original.target_impression_share_cpc_bid_ceiling_micros;

          if (locationChanged || fractionChanged || cpcCeilingChanged) {
            updatePayload.action = "bidding_strategy";
            updatePayload.bidding_strategy_type = newBiddingStrategy;

            // Always include location (use form value or keep original)
            updatePayload.target_impression_share_location =
              data.target_impression_share_location || original.target_impression_share_location || "TOP_OF_PAGE";

            // Always include fraction_micros (required for TARGET_IMPRESSION_SHARE)
            // Priority: form data > original data > default (100%)
            const fractionMicros = data.target_impression_share_location_fraction_micros !== undefined && data.target_impression_share_location_fraction_micros !== null
              ? data.target_impression_share_location_fraction_micros
              : (original.target_impression_share_location_fraction_micros !== undefined && original.target_impression_share_location_fraction_micros !== null
                ? original.target_impression_share_location_fraction_micros
                : 1000000); // Default to 100%
            updatePayload.target_impression_share_location_fraction_micros = fractionMicros;

            // Include CPC bid ceiling (use form value or keep original)
            const cpcCeiling = data.target_impression_share_cpc_bid_ceiling_micros !== undefined && data.target_impression_share_cpc_bid_ceiling_micros !== null
              ? data.target_impression_share_cpc_bid_ceiling_micros
              : original.target_impression_share_cpc_bid_ceiling_micros;
            if (cpcCeiling !== undefined && cpcCeiling !== null) {
              updatePayload.target_impression_share_cpc_bid_ceiling_micros = cpcCeiling;
            }
          }
        }
      }

      // 8. Check if URL tracking fields changed
      const originalTrackingUrl = original.tracking_url_template || "";
      const newTrackingUrl = data.tracking_url_template || "";
      if (newTrackingUrl !== originalTrackingUrl) {
        updatePayload.tracking_url_template = newTrackingUrl;
      }

      const originalFinalUrlSuffix = original.final_url_suffix || "";
      const newFinalUrlSuffix = data.final_url_suffix || "";
      if (newFinalUrlSuffix !== originalFinalUrlSuffix) {
        updatePayload.final_url_suffix = newFinalUrlSuffix;
      }

      const originalUrlParams = original.url_custom_parameters || [];
      const newUrlParams = data.url_custom_parameters || [];
      if (
        JSON.stringify(originalUrlParams.sort()) !==
        JSON.stringify(newUrlParams.sort())
      ) {
        updatePayload.url_custom_parameters = newUrlParams;
      }

      // 9. Check if targeting fields changed
      const originalLocationIds = original.location_ids || [];
      const newLocationIds = data.location_ids || [];
      if (
        JSON.stringify([...originalLocationIds].sort()) !==
        JSON.stringify([...newLocationIds].sort())
      ) {
        updatePayload.location_ids = newLocationIds;
      }

      const originalExcludedLocationIds = original.excluded_location_ids || [];
      const newExcludedLocationIds = data.excluded_location_ids || [];
      if (
        JSON.stringify([...originalExcludedLocationIds].sort()) !==
        JSON.stringify([...newExcludedLocationIds].sort())
      ) {
        updatePayload.excluded_location_ids = newExcludedLocationIds;
      }

      const originalLanguageIds = original.language_ids || [];
      const newLanguageIds = data.language_ids || [];
      if (
        JSON.stringify([...originalLanguageIds].sort()) !==
        JSON.stringify([...newLanguageIds].sort())
      ) {
        updatePayload.language_ids = newLanguageIds;
      }

      const originalDeviceIds = original.device_ids || [];
      const newDeviceIds = data.device_ids || [];
      if (
        JSON.stringify([...originalDeviceIds].sort()) !==
        JSON.stringify([...newDeviceIds].sort())
      ) {
        updatePayload.device_ids = newDeviceIds;
      }

      // 10. Check if network settings changed (for SEARCH campaigns)
      if (data.campaign_type === "SEARCH") {
        const originalNetworkSettings = original.network_settings || {};
        const newNetworkSettings = data.network_settings || {};
        if (
          JSON.stringify(originalNetworkSettings) !==
          JSON.stringify(newNetworkSettings)
        ) {
          updatePayload.network_settings = newNetworkSettings;
        }
      }

      // 11. Check if PMAX fields changed (Brand Guidelines + assets)
      if (data.campaign_type === "PERFORMANCE_MAX") {
        // Initialize pmax_assets object if not already present
        if (!updatePayload.pmax_assets) {
          updatePayload.pmax_assets = {};
        }

        // Check if business_name changed
        const originalBusinessName = original.business_name || "";
        const newBusinessName = data.business_name || "";
        if (newBusinessName !== originalBusinessName && newBusinessName) {
          updatePayload.pmax_assets.business_name = newBusinessName;
        }

        // Check if logo_url changed
        const originalLogoUrl = original.logo_url || "";
        const newLogoUrl = data.logo_url || "";
        if (newLogoUrl !== originalLogoUrl && newLogoUrl) {
          updatePayload.pmax_assets.logo_url = newLogoUrl;
        }

        // Check if square_marketing_image_url changed
        const originalSquareMarketingImageUrl = original.square_marketing_image_url || "";
        const newSquareMarketingImageUrl = data.square_marketing_image_url || "";
        if (newSquareMarketingImageUrl !== originalSquareMarketingImageUrl && newSquareMarketingImageUrl) {
          updatePayload.pmax_assets.square_marketing_image_url = newSquareMarketingImageUrl;
        }

        // Check if final_url changed
        const originalFinalUrl = original.final_url || "";
        const newFinalUrl = data.final_url || "";
        if (newFinalUrl !== originalFinalUrl && newFinalUrl) {
          updatePayload.pmax_assets.final_url = newFinalUrl;
        }

        // Check if marketing_image_url changed
        const originalMarketingImageUrl = original.marketing_image_url || "";
        const newMarketingImageUrl = data.marketing_image_url || "";
        if (newMarketingImageUrl !== originalMarketingImageUrl && newMarketingImageUrl) {
          updatePayload.pmax_assets.marketing_image_url = newMarketingImageUrl;
        }

        // Check if headlines changed
        const originalHeadlines = original.headlines || [];
        const newHeadlines = data.headlines || [];
        if (JSON.stringify(originalHeadlines) !== JSON.stringify(newHeadlines)) {
          updatePayload.pmax_assets.headlines = newHeadlines;
        }

        // Check if descriptions changed
        const originalDescriptions = original.descriptions || [];
        const newDescriptions = data.descriptions || [];
        if (JSON.stringify(originalDescriptions) !== JSON.stringify(newDescriptions)) {
          updatePayload.pmax_assets.descriptions = newDescriptions;
        }
      }

      // Separate PMax assets from campaign update payload
      const pmaxAssets = updatePayload.pmax_assets;
      const campaignUpdatePayload = { ...updatePayload };
      delete campaignUpdatePayload.pmax_assets;

      // Check if we have any campaign-level changes (excluding PMax assets)
      const hasCampaignChanges = Object.keys(campaignUpdatePayload).some(
        (key) =>
          key !== "campaignIds" && campaignUpdatePayload[key] !== undefined
      );
      const hasPmaxChanges = !!pmaxAssets;

      // Execute single update if there are changes
      if (!hasCampaignChanges && !hasPmaxChanges) {
        // No changes detected, show message and don't close the panel
        console.log("No changes detected");
        const errorMessage =
          "No changes detected. Please modify at least one field (name, status, budget, start date, end date, bidding strategy, targeting, network settings, URL tracking, Shopping Settings, or Performance Max assets).";
        setCreateCampaignError(errorMessage);

        // Also show in modal for better visibility
        setErrorModal({
          isOpen: true,
          title: "No Changes",
          message: errorMessage,
          isSuccess: false,
        });

        setCreateCampaignLoading(false);
        throw new Error(errorMessage);
      }

      // Update campaign-level fields if there are any changes
      if (hasCampaignChanges || hasPmaxChanges) {
        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }

        // If only PMAX assets changed, include them in the payload
        let payloadToSend = hasCampaignChanges ? campaignUpdatePayload : updatePayload;
        
        console.log("Making bulkUpdateGoogleCampaigns call with:", {
          hasCampaignChanges,
          hasPmaxChanges,
          payloadKeys: Object.keys(payloadToSend),
          pmaxAssets: payloadToSend.pmax_assets
        });

        const result = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          payloadToSend
        );

        // Check for errors in the response
        if (result.errors && result.errors.length > 0) {
          // Handle both string errors (legacy) and object errors (new format with campaign_id, error, updated_fields)
          const firstError = result.errors[0];
          let errorMessage: string;
          let errorDetails: Array<{
            entity?: string;
            message?: string;
            campaign_id?: string;
            updated_fields?: string[];
            policy_name?: string;
          }> = [];

          if (typeof firstError === 'string') {
            // Legacy format: array of strings
            errorMessage = firstError || "Failed to update campaign";
            errorDetails = result.errors.map((err: string) => ({
              entity: "Campaign",
              message: err,
              policy_name: "Error"
            }));
          } else if (firstError && typeof firstError === 'object') {
            // New format: array of objects with {campaign_id, error, updated_fields}
            errorMessage = firstError.error || "Failed to update campaign";

            // Process each error object
            result.errors.forEach((err: any) => {
              const errorText = typeof err === 'string' ? err : err.error || 'Unknown error';
              const campaignId = err.campaign_id;
              const updatedFields = err.updated_fields && Array.isArray(err.updated_fields) ? err.updated_fields : null;

              // Split error message by semicolon to show each targeting error separately
              let errorParts = errorText.split(';').map((part: string) => part.trim()).filter((part: string) => part);

              // If no semicolons found or empty after filtering, use the whole message
              if (errorParts.length === 0) {
                errorParts = [errorText];
              }

              errorParts.forEach((part: string) => {
                // Determine error type from message (check for exact matches first)
                let errorType = "Error";
                const partLower = part.toLowerCase();
                if (part.includes('Language targeting:')) {
                  errorType = "Language Targeting";
                } else if (part.includes('Device targeting:')) {
                  errorType = "Device Targeting";
                } else if (part.includes('Location targeting:')) {
                  errorType = "Location Targeting";
                } else if (part.includes('Excluded location targeting:')) {
                  errorType = "Excluded Location";
                } else if (partLower.includes('language') && partLower.includes('target')) {
                  errorType = "Language Targeting";
                } else if (partLower.includes('device') && partLower.includes('target')) {
                  errorType = "Device Targeting";
                } else if (partLower.includes('location') && partLower.includes('target')) {
                  errorType = "Location Targeting";
                }

                errorDetails.push({
                  entity: campaignId ? `Campaign ${campaignId}` : "Campaign",
                  message: part,
                  campaign_id: campaignId,
                  updated_fields: updatedFields,
                  policy_name: errorType
                });
              });
            });
          } else {
            errorMessage = "Failed to update campaign";
          }

          // Debug: Log errorDetails to verify they're being created
          console.log("Error details created:", errorDetails);
          console.log("Error details length:", errorDetails.length);

          setCreateCampaignError(errorMessage);
          setErrorModal({
            isOpen: true,
            title: "Update Failed",
            message: errorDetails.length > 0 ? "Some fields failed to update. See details below:" : errorMessage,
            isSuccess: false,
            errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
          });
          setCreateCampaignLoading(false);

          // Only throw error if the update completely failed (no successful updates)
          // If there are partial successes (updated > 0), just show the modal without throwing
          if (result.updated === 0 && result.failed > 0) {
            throw new Error(errorMessage);
          }
          // If there are partial successes, return early without throwing
          return;
        }
      }

      // Asset group updates are not part of edit mode - removed

      console.log("Update completed successfully");

      // Show success message with detailed list of updated fields
      const updatedFields: Array<{ field: string; value: any }> = [];

      // Campaign-level fields
      if (campaignUpdatePayload.name) {
        updatedFields.push({ field: "Campaign Name", value: campaignUpdatePayload.name });
      }
      if (campaignUpdatePayload.status) {
        updatedFields.push({ field: "Status", value: campaignUpdatePayload.status });
      }
      if (campaignUpdatePayload.value !== undefined) {
        updatedFields.push({ field: "Budget", value: `$${campaignUpdatePayload.value.toFixed(2)}` });
      }
      if (campaignUpdatePayload.start_date) {
        updatedFields.push({ field: "Start Date", value: campaignUpdatePayload.start_date });
      }
      if (campaignUpdatePayload.end_date) {
        updatedFields.push({ field: "End Date", value: campaignUpdatePayload.end_date });
      }
      if (campaignUpdatePayload.bidding_strategy_type) {
        const biddingInfo: string[] = [campaignUpdatePayload.bidding_strategy_type];
        if (campaignUpdatePayload.target_cpa_micros) {
          biddingInfo.push(`Target CPA: $${(campaignUpdatePayload.target_cpa_micros / 1000000).toFixed(2)}`);
        }
        if (campaignUpdatePayload.target_roas) {
          biddingInfo.push(`Target ROAS: ${campaignUpdatePayload.target_roas}x`);
        }
        if (campaignUpdatePayload.target_impression_share_location) {
          biddingInfo.push(`Location: ${campaignUpdatePayload.target_impression_share_location}`);
          if (campaignUpdatePayload.target_impression_share_location_fraction_micros) {
            const percent = (campaignUpdatePayload.target_impression_share_location_fraction_micros / 10000).toFixed(1);
            biddingInfo.push(`Target: ${percent}%`);
          }
          if (campaignUpdatePayload.target_impression_share_cpc_bid_ceiling_micros) {
            biddingInfo.push(`Max CPC: $${(campaignUpdatePayload.target_impression_share_cpc_bid_ceiling_micros / 1000000).toFixed(2)}`);
          }
        }
        updatedFields.push({ field: "Bidding Strategy", value: biddingInfo.join(", ") });
      }

      // Shopping-specific fields
      if (campaignUpdatePayload.merchant_id) {
        updatedFields.push({ field: "Merchant ID", value: campaignUpdatePayload.merchant_id });
      }
      if (campaignUpdatePayload.sales_country) {
        updatedFields.push({ field: "Sales Country", value: campaignUpdatePayload.sales_country });
      }
      if (campaignUpdatePayload.campaign_priority !== undefined) {
        updatedFields.push({ field: "Campaign Priority", value: campaignUpdatePayload.campaign_priority.toString() });
      }
      if (campaignUpdatePayload.enable_local !== undefined) {
        updatedFields.push({ field: "Enable Local", value: campaignUpdatePayload.enable_local ? "Yes" : "No" });
      }

      // PMax asset fields - only show in create mode when asset groups are enabled
      if (campaignFormMode === "create" && SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION && pmaxAssets) {
        if (pmaxAssets?.headlines && pmaxAssets.headlines.length > 0) {
          updatedFields.push({ field: "Headlines", value: `${pmaxAssets.headlines.length} headline(s)` });
        }
        if (pmaxAssets?.descriptions && pmaxAssets.descriptions.length > 0) {
          updatedFields.push({ field: "Descriptions", value: `${pmaxAssets.descriptions.length} description(s)` });
        }
        if (pmaxAssets?.final_url) {
          updatedFields.push({ field: "Final URL", value: pmaxAssets.final_url });
        }
        if (pmaxAssets?.business_name) {
          updatedFields.push({ field: "Business Name", value: pmaxAssets.business_name });
        }
        if (pmaxAssets?.logo_url) {
          updatedFields.push({ field: "Logo URL", value: pmaxAssets.logo_url });
        }
        if (pmaxAssets?.marketing_image_url) {
          updatedFields.push({ field: "Marketing Image", value: pmaxAssets.marketing_image_url });
        }
        if (pmaxAssets?.square_marketing_image_url) {
          updatedFields.push({ field: "Square Marketing Image", value: pmaxAssets.square_marketing_image_url });
        }
        // Handle long_headlines (plural array) - backward compatible with long_headline (singular)
        if (pmaxAssets?.long_headlines && Array.isArray(pmaxAssets.long_headlines) && pmaxAssets.long_headlines.length > 0) {
          updatedFields.push({ field: "Long Headlines", value: pmaxAssets.long_headlines.join(", ") });
        } else if (pmaxAssets?.long_headline) {
          updatedFields.push({ field: "Long Headline", value: pmaxAssets.long_headline });
        }
        if (pmaxAssets?.asset_group_name) {
          updatedFields.push({ field: "Asset Group Name", value: pmaxAssets.asset_group_name });
        }
      }

      // Format updated fields as errorDetails for table display
      const updatedFieldsTable = updatedFields.map(item => ({
        entity: item.field,
        policy_name: undefined,
        message: String(item.value),
        error_code: undefined,
        policy_description: undefined,
        violating_text: undefined,
        type: undefined,
        is_exemptible: undefined,
        user_message: undefined,
      }));

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: updatedFields.length > 0
          ? "Campaign updated successfully! The following fields were updated:"
          : "Campaign updated successfully!",
        isSuccess: true,
        errorDetails: updatedFieldsTable.length > 0 ? updatedFieldsTable : undefined,
      });

      // Reload campaigns
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }

      // Close the panel after a short delay to show success message
      setTimeout(() => {
        setIsCreateCampaignPanelOpen(false);
        setInitialCampaignData(null);
        setCampaignFormMode("create");
        setCampaignId(undefined);
        setCreateCampaignLoading(false);
        setCreateCampaignError(null);
      }, 1500);
    } catch (error: any) {
      console.error("Failed to update campaign:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update campaign. Please try again.";

      // Extract detailed error information
      let errorDetails: any = null;
      if (error.response?.data?.details) {
        errorDetails = error.response.data.details;
      } else if (error.response?.data?.google_ads_errors) {
        errorDetails = error.response.data.google_ads_errors;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle both string errors (legacy) and object errors (new format)
        errorDetails = error.response.data.errors.map((err: any) => {
          if (typeof err === 'string') {
            return { message: err };
          } else if (err && typeof err === 'object') {
            return {
              message: err.error || 'Unknown error',
              campaign_id: err.campaign_id,
              updated_fields: err.updated_fields
            };
          }
          return { message: 'Unknown error' };
        });
      }

      // Set error in form
      setCreateCampaignError(errorMessage);

      // Also show error in modal for better visibility
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: errorMessage,
        isSuccess: false,
        errorDetails: errorDetails,
      });

      setCreateCampaignLoading(false);
      throw error;
    }
  };

  // Open edit mode for an existing campaign
  const handleOpenEditCampaign = async (row: IGoogleCampaign) => {
    if (!accountId) return;

    try {
      setEditLoadingCampaignId(row.campaign_id);
      setCampaignFormMode("edit");
      setIsCreateCampaignPanelOpen(true);
      setCreateCampaignError(null);
      setRefreshMessage({
        type: "loading",
        message: "Fetching latest campaign data from Google Ads API...",
      });

      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        setEditLoadingCampaignId(null);
        setRefreshMessage(null);
        return;
      }

      // Step 1: Refresh campaign from Google API to get latest data
      let refreshedCampaignData = null;
      try {
        const refreshResponse =
          await campaignsService.refreshGoogleCampaignFromAPI(
            accountIdNum,
            channelId ? parseInt(channelId, 10) : 0,
            row.campaign_id
          );
        refreshedCampaignData = refreshResponse.campaign;
        // Success - data refreshed from API
        setRefreshMessage({
          type: "success",
          message: "Campaign data refreshed from Google Ads API",
          details: refreshResponse.message || "Latest data loaded successfully",
        });
      } catch (refreshError: any) {
        // Failed to refresh from API, use cached data from database
        console.warn(
          "Failed to refresh campaign from API, using cached data:",
          refreshError
        );
        const errorMessage =
          refreshError?.response?.data?.error ||
          refreshError?.message ||
          "Could not fetch latest from Google API";
        setRefreshMessage({
          type: "error",
          message: "Using cached data",
          details: errorMessage,
        });
        // Fallback: Fetch from database
        try {
          const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
          if (!channelIdNum || isNaN(channelIdNum)) {
            throw new Error("Channel ID is required");
          }
          const campaignDetail = await googleAdwordsCampaignsService.getGoogleCampaignDetail(
            accountIdNum,
            channelIdNum,
            row.campaign_id
          );
          refreshedCampaignData = campaignDetail?.campaign || null;
        } catch (detailError) {
          console.warn("Failed to fetch campaign detail:", detailError);
        }
      }

      // Step 2: Use refreshed data or fallback to row data
      const campaignData = refreshedCampaignData || row;
      const extra_data = campaignData.extra_data || row.extra_data || {};
      const shopping_setting = extra_data.shopping_setting || {};
      const campaignType =
        ((campaignData.campaign_type ||
          campaignData.advertising_channel_type ||
          row.advertising_channel_type?.toUpperCase()) as any) ||
        "PERFORMANCE_MAX";

      // Map campaign data to CreateGoogleCampaignData format using refreshed data
      const initial: Partial<CreateGoogleCampaignData> = {
        name:
          campaignData.name ||
          campaignData.campaign_name ||
          row.campaign_name ||
          "",
        campaign_type: campaignType,
        budget_amount:
          campaignData.budget_amount ||
          campaignData.daily_budget ||
          row.daily_budget ||
          0,
        budget_name: campaignData.budget_name || undefined,
        status:
          (campaignData.status?.toUpperCase() as any) ||
          (row.status?.toUpperCase() as any) ||
          "PAUSED",
        start_date:
          parseDateToYYYYMMDD(campaignData.start_date) ||
          parseDateToYYYYMMDD(row.start_date) ||
          undefined,
        end_date:
          parseDateToYYYYMMDD(campaignData.end_date) ||
          parseDateToYYYYMMDD(row.end_date) ||
          undefined,
        // Bidding strategy fields
        bidding_strategy_type: campaignData.bidding_strategy_type || undefined,
        target_cpa_micros: campaignData.target_cpa_micros,
        target_roas: campaignData.target_roas,
        target_impression_share_location: campaignData.target_impression_share_location,
        target_impression_share_location_fraction_micros: campaignData.target_impression_share_location_fraction_micros,
        target_impression_share_cpc_bid_ceiling_micros: campaignData.target_impression_share_cpc_bid_ceiling_micros,
        // UTM parameters
        tracking_url_template: campaignData.tracking_url_template || undefined,
        final_url_suffix: campaignData.final_url_suffix || undefined,
        url_custom_parameters: campaignData.url_custom_parameters || undefined,
        // Targeting fields
        location_ids: campaignData.location_ids || [],
        excluded_location_ids: campaignData.excluded_location_ids || [],
        language_ids: campaignData.language_ids || [],
        device_ids: campaignData.device_ids || [],
        // Shopping-specific fields from extra_data or direct fields
        merchant_id: campaignData.merchant_id || shopping_setting.merchant_id,
        sales_country:
          campaignData.sales_country || shopping_setting.sales_country || "US",
        campaign_priority:
          campaignData.campaign_priority ??
          shopping_setting.campaign_priority ??
          0,
        enable_local:
          campaignData.enable_local ?? shopping_setting.enable_local ?? false,
        // SEARCH specific fields
        network_settings: campaignData.network_settings || undefined,
      };

      // For Performance Max campaigns, use data from refreshed extra_data
      if (campaignType === "PERFORMANCE_MAX") {
        // Use PMax data from refreshed extra_data (already fetched from API)
        if (extra_data.business_name) {
          initial.business_name = extra_data.business_name;
        }
        if (extra_data.logo_url) {
          initial.logo_url = extra_data.logo_url;
        }
        if (extra_data.final_url) {
          initial.final_url = extra_data.final_url;
        }
        if (extra_data.headlines && Array.isArray(extra_data.headlines)) {
          initial.headlines = extra_data.headlines;
        }
        if (extra_data.descriptions && Array.isArray(extra_data.descriptions)) {
          initial.descriptions = extra_data.descriptions;
        }
        // Handle long_headlines (plural array) - backward compatible with long_headline (singular)
        if (extra_data.long_headlines && Array.isArray(extra_data.long_headlines)) {
          initial.long_headlines = extra_data.long_headlines;
        } else if (extra_data.long_headline) {
          // Backward compatibility: if singular long_headline exists, convert to array
          initial.long_headlines = [extra_data.long_headline];
        }

        // Handle video, sitelink, and callout asset resource names
        if (extra_data.video_asset_resource_names && Array.isArray(extra_data.video_asset_resource_names)) {
          initial.video_asset_resource_names = extra_data.video_asset_resource_names;
        }
        if (extra_data.sitelink_asset_resource_names && Array.isArray(extra_data.sitelink_asset_resource_names)) {
          initial.sitelink_asset_resource_names = extra_data.sitelink_asset_resource_names;
        }
        if (extra_data.callout_asset_resource_names && Array.isArray(extra_data.callout_asset_resource_names)) {
          initial.callout_asset_resource_names = extra_data.callout_asset_resource_names;
        }
        if (extra_data.marketing_image_url) {
          initial.marketing_image_url = extra_data.marketing_image_url;
        }
        if (extra_data.square_marketing_image_url) {
          initial.square_marketing_image_url =
            extra_data.square_marketing_image_url;
        }
        if (extra_data.asset_group_name) {
          initial.asset_group_name = extra_data.asset_group_name;
        }

        // Ensure headlines and descriptions are arrays (even if empty)
        if (!initial.headlines || !Array.isArray(initial.headlines)) {
          initial.headlines = [""];
        }
        if (!initial.descriptions || !Array.isArray(initial.descriptions)) {
          initial.descriptions = [""];
        }
      }

      setInitialCampaignData(initial);
      setCampaignId(row.campaign_id);
      // After data is loaded and form state is set, smoothly scroll to top
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      setEditLoadingCampaignId(null);
    } catch (error) {
      console.error("Failed to load campaign for edit:", error);
      setCreateCampaignError("Failed to load campaign for edit");
      setEditLoadingCampaignId(null);
    } finally {
      setCreateCampaignLoading(false);
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
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!isNaN(accountIdNum) && channelIdNum && !isNaN(channelIdNum)) {
        try {
          const params: any = {
            sort_by: newSortBy,
            order: newSortOrder,
            page: 1,
            page_size: itemsPerPage,
            start_date: startDate
              ? startDateStr
              : undefined,
            end_date: endDate ? endDateStr : undefined,
            filters: filters, // Pass filters array directly
          };

          const response = await googleAdwordsCampaignsService.getGoogleCampaigns(
            accountIdNum,
            channelIdNum,
            params
          );
          setCampaigns(
            Array.isArray(response.campaigns) ? response.campaigns : []
          );
          setTotalPages(response.total_pages || 0);
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
      setSelectedCampaigns(new Set(filteredCampaigns.map((c) => c.campaign_id)));
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
  };

  // Inline edit handlers
  const startInlineEdit = (
    campaign: IGoogleCampaign,
    field:
      | "budget"
      | "status"
      | "start_date"
      | "end_date"
      | "bidding_strategy_type"
  ) => {
    // Don't allow editing status, budget, start_date, or end_date if campaign is REMOVED
    const campaignStatus = getStatusWithDefault(campaign.status).toUpperCase();
    if (campaignStatus === "REMOVED") {
      if (field === "status" || field === "budget" || field === "start_date" || field === "end_date") {
        return; // Silently prevent editing these fields for removed campaigns
      }
    }

    // Prevent editing start_date if it's in the past - silently do nothing
    if (field === "start_date") {
      const startDateStr = parseDateToYYYYMMDD(campaign.start_date);
      if (startDateStr) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        if (startDateStr < todayStr) {
          return; // Silently prevent editing past start dates
        }
      }
    }

    setEditingCell({ campaignId: campaign.campaign_id, field });
    if (field === "budget") {
      setEditedValue((campaign.daily_budget || 0).toString());
    } else if (field === "status") {
      setEditedValue(getStatusWithDefault(campaign.status));
    } else if (field === "start_date") {
      // Format date as YYYY-MM-DD for input using utility function to avoid timezone issues
      setEditedValue(parseDateToYYYYMMDD(campaign.start_date));
    } else if (field === "end_date") {
      // Format date as YYYY-MM-DD for input using utility function to avoid timezone issues
      setEditedValue(parseDateToYYYYMMDD(campaign.end_date));
    } else if (field === "bidding_strategy_type") {
      setEditedValue(campaign.bidding_strategy_type || "");
    }
  };

  const cancelInlineEdit = () => {
    isCancellingRef.current = true;
    setEditingCell(null);
    setEditedValue("");
    // Reset immediately after state updates
    isCancellingRef.current = false;
  };

  const handleInlineEditChange = (value: string) => {
    setEditedValue(value);
  };

  const confirmInlineEdit = (
    newValueOverride?: string,
    fieldOverride?: string,
    campaignIdOverride?: string | number
  ) => {
    console.log("[confirmInlineEdit] Called with:", {
      newValueOverride,
      fieldOverride,
      campaignIdOverride,
      editingCell,
      editedValue,
      accountId,
      isCancelling: isCancellingRef.current,
    });

    // Use override parameters if provided, otherwise fall back to editingCell state
    const campaignIdToUse = campaignIdOverride || editingCell?.campaignId;
    const fieldToUse = fieldOverride || editingCell?.field;

    if (!campaignIdToUse || !fieldToUse || !accountId || isCancellingRef.current) {
      console.log("[confirmInlineEdit] Early return:", {
        campaignIdToUse: !!campaignIdToUse,
        fieldToUse: !!fieldToUse,
        accountId: !!accountId,
        isCancelling: isCancellingRef.current,
      });
      return;
    }

    const campaign = campaigns.find(
      (c) => String(c.campaign_id) === String(campaignIdToUse)
    );
    if (!campaign) {
      console.log("[confirmInlineEdit] Campaign not found:", campaignIdToUse);
      return;
    }

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;
    console.log("[confirmInlineEdit] Resolved values:", {
      valueToCheck,
      fieldToUse,
      campaignId: campaign.campaign_id,
    });

    let hasChanged = false;
    let validationError = "";

    if (fieldToUse === "budget") {
      const newBudgetStr = valueToCheck.trim();
      const newBudget = newBudgetStr === "" ? 0 : parseFloat(newBudgetStr);
      const oldBudget = campaign.daily_budget || 0;
      if (isNaN(newBudget)) {
        cancelInlineEdit();
        return;
      }
      // Round to 2 decimal places to avoid floating point precision issues
      const roundedNew = Math.round(newBudget * 100) / 100;
      const roundedOld = Math.round(oldBudget * 100) / 100;
      // Use same threshold as table component (0.001) to ensure consistency
      // This ensures that if the table component detects a change, we will too
      hasChanged = Math.abs(roundedNew - roundedOld) > 0.001;
      console.log("[budget] Budget comparison:", {
        campaignId: campaignIdToUse,
        newBudgetStr,
        newBudget,
        roundedNew,
        oldBudget,
        roundedOld,
        difference: Math.abs(roundedNew - roundedOld),
        hasChanged,
      });
    } else if (fieldToUse === "status") {
      const oldValue = getStatusWithDefault(campaign.status).trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    } else if (fieldToUse === "start_date") {
      // Normalize dates to YYYY-MM-DD format for comparison using utility function
      const oldValue = parseDateToYYYYMMDD(campaign.start_date) || "";
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== "" && newValue !== oldValue;

      console.log("[start_date] Date comparison:", {
        campaignId: campaignIdToUse,
        oldValue,
        newValue,
        hasChanged,
        rawStartDate: campaign.start_date,
        valueToCheck,
      });

      // Validate: start date cannot be in the past
      if (newValue) {
        const validation = validateDateNotInPast(newValue);
        if (!validation.valid) {
          validationError = validation.error || "Start date cannot be in the past";
          alert(validationError);
          cancelInlineEdit();
          return;
        }
      }
    } else if (fieldToUse === "end_date") {
      // Normalize dates to YYYY-MM-DD format for comparison using utility function
      const oldValue = parseDateToYYYYMMDD(campaign.end_date) || "";
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== "" && newValue !== oldValue;

      console.log("[end_date] Date comparison:", {
        campaignId: campaignIdToUse,
        oldValue,
        newValue,
        hasChanged,
        rawEndDate: campaign.end_date,
        valueToCheck,
      });

      // Validate: end date cannot be in the past
      if (newValue) {
        const validation = validateDateNotInPast(newValue);
        if (!validation.valid) {
          validationError = validation.error || "End date cannot be in the past";
          alert(validationError);
          cancelInlineEdit();
          return;
        }
      }

      // Validate: end date cannot be before start date
      if (newValue) {
        const startDateStr = parseDateToYYYYMMDD(campaign.start_date);
        const validation = validateEndDateAfterStart(newValue, startDateStr);
        if (!validation.valid) {
          validationError = validation.error || "End date cannot be before start date";
          alert(validationError);
          cancelInlineEdit();
          return;
        }
      }
    } else if (fieldToUse === "bidding_strategy_type") {
      const oldValue = (campaign.bidding_strategy_type || "").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    }

    console.log("[confirmInlineEdit] hasChanged check:", {
      fieldToUse,
      hasChanged,
      valueToCheck,
    });

    if (!hasChanged) {
      console.log("[confirmInlineEdit] No change detected, cancelling");
      cancelInlineEdit();
      return;
    }

    // For status changes, show modal
    if (fieldToUse === "status") {
      const oldStatusRaw = getStatusWithDefault(campaign.status);
      const newStatusRaw = valueToCheck.trim();

      // Format status values for display
      const oldValue = formatStatusForDisplay(oldStatusRaw);
      const newValue = formatStatusForDisplay(newStatusRaw);

      setInlineEditCampaign(campaign);
      setInlineEditField(fieldToUse);
      setInlineEditOldValue(oldValue);
      setInlineEditNewValue(newValue);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For budget, show modal
    if (fieldToUse === "budget") {
      const newBudget = parseFloat(valueToCheck) || 0;
      const oldBudget = campaign.daily_budget || 0;

      console.log("[confirmInlineEdit] Opening budget modal:", {
        newBudget,
        oldBudget,
        formattedNew: formatCurrency(newBudget),
        formattedOld: formatCurrency(oldBudget),
      });

      setInlineEditCampaign(campaign);
      setInlineEditField(fieldToUse);
      setInlineEditOldValue(formatCurrency(oldBudget));
      setInlineEditNewValue(formatCurrency(newBudget));
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For bidding_strategy_type, show modal
    if (fieldToUse === "bidding_strategy_type") {
      const oldValue = campaign.bidding_strategy_type || "—";
      const newValue = valueToCheck.trim();

      // Reset bidding strategy parameters
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
      setInlineEditTargetSpend("");
      setInlineEditImpressionShareLocation("TOP_OF_PAGE");
      setInlineEditImpressionSharePercent("");
      setInlineEditImpressionShareCpcCeiling("");

      setInlineEditCampaign(campaign);
      setInlineEditField(fieldToUse);
      setInlineEditOldValue(formatBiddingStrategy(oldValue));
      setInlineEditNewValue(formatBiddingStrategy(newValue));
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For start_date and end_date, show modal
    if (
      fieldToUse === "start_date" ||
      fieldToUse === "end_date"
    ) {
      // Format dates for display
      const oldDateStr = parseDateToYYYYMMDD(campaign[fieldToUse]);
      const newDateStr = valueToCheck.trim();

      console.log("[confirmInlineEdit] Opening date modal:", {
        fieldToUse,
        oldDateStr,
        newDateStr,
        rawDate: campaign[fieldToUse],
      });

      // Store formatted values for display in modal
      const oldValue = formatDateForDisplayUtil(oldDateStr);

      setInlineEditCampaign(campaign);
      setInlineEditField(fieldToUse);
      setInlineEditOldValue(oldValue);
      // Store the raw YYYY-MM-DD value for API call (we'll format it for display in modal)
      setInlineEditNewValue(newDateStr);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // Fallback for any other fields (shouldn't happen, but keep modal for safety)
    const oldValue = "";
    const newValue = valueToCheck;

    setInlineEditCampaign(campaign);
    setInlineEditField(fieldToUse as "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type");
    setInlineEditOldValue(oldValue);
    setInlineEditNewValue(newValue);
    setShowInlineEditModal(true);
    setEditingCell(null);
  };

  // Direct confirmation for budget and date fields (skips modal)
  const confirmInlineEditDirect = (newValue: string, campaignIdParam?: string | number, fieldParam?: string) => {
    console.log("confirmInlineEditDirect called with:", { newValue, campaignIdParam, fieldParam, accountId, isCancelling: isCancellingRef.current, editingCell });
    if (!accountId || isCancellingRef.current) {
      console.log("confirmInlineEditDirect early return: missing accountId or cancelling");
      return;
    }

    // Use provided parameters or fall back to editingCell
    const campaignIdToUse = campaignIdParam || editingCell?.campaignId;
    const fieldToUse = fieldParam || editingCell?.field;

    console.log("confirmInlineEditDirect resolved values:", { campaignIdToUse, fieldToUse });

    if (!campaignIdToUse || !fieldToUse) {
      console.log("confirmInlineEditDirect early return: missing campaignId or field");
      return;
    }

    const campaign = campaigns.find(
      (c) => c.campaign_id === campaignIdToUse
    );
    if (!campaign) {
      console.log("confirmInlineEditDirect early return: campaign not found", campaignIdToUse);
      return;
    }

    console.log("confirmInlineEditDirect found campaign:", campaign.campaign_id);

    // Only allow direct confirmation for budget, date, status, and bidding_strategy_type fields
    if (
      fieldToUse !== "budget" &&
      fieldToUse !== "start_date" &&
      fieldToUse !== "end_date" &&
      fieldToUse !== "status" &&
      fieldToUse !== "bidding_strategy_type"
    ) {
      // Fall back to regular confirmation for other fields
      confirmInlineEdit(newValue, fieldToUse, campaignIdToUse);
      return;
    }

    // Clear any previous errors
    setInlineEditError(null);

    // Set updating field immediately to show loading in the correct row
    setUpdatingField({
      campaignId: campaignIdToUse,
      field: fieldToUse,
      newValue: newValue,
    });

    // Set the values for runInlineEdit
    setInlineEditCampaign(campaign);
    setInlineEditField(fieldToUse);
    setInlineEditNewValue(newValue);

    // Clear editingCell if it matches the current update (or if editingCell is set)
    if (!editingCell || (editingCell.campaignId === campaignIdToUse && editingCell.field === fieldToUse)) {
      setEditingCell(null);
    }

    // Directly call runInlineEdit with the values we have
    // Pass values directly to avoid state timing issues
    runInlineEditDirect(campaign, fieldToUse, newValue);
  };

  // Direct version that accepts parameters to avoid state timing issues
  const runInlineEditDirect = async (campaign: IGoogleCampaign, field: string, newValue: string) => {
    console.log("runInlineEditDirect called with:", { campaign: campaign?.campaign_id, field, newValue, accountId });
    if (!campaign || !field || !accountId) {
      console.log("runInlineEditDirect early return:", { campaign: !!campaign, field: !!field, accountId: !!accountId });
      return;
    }

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (field === "status") {
        // Convert display status to API format
        const statusValue = convertStatusToApi(newValue);

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          {
            campaignIds: [campaign.campaign_id],
            action: "status",
            status: statusValue,
          }
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      } else if (field === "budget") {
        const budgetValue = parseFloat(
          newValue.replace(/[^0-9.]/g, "")
        );
        if (isNaN(budgetValue)) {
          throw new Error("Invalid budget value");
        }

        console.log("Calling bulkUpdateGoogleCampaigns for budget:", {
          accountIdNum,
          campaignId: campaign.campaign_id,
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          {
            campaignIds: [campaign.campaign_id],
            action: "budget",
            budgetAction: "set",
            unit: "amount",
            value: budgetValue,
          }
        );

        console.log("Budget update response:", response);

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      } else if (
        field === "start_date" ||
        field === "end_date"
      ) {
        // newValue should already be in YYYY-MM-DD format from the date input
        let dateValue = newValue.trim();
        if (!dateValue || dateValue === "—") {
          dateValue = "";
        }

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          {
            campaignIds: [campaign.campaign_id],
            action: field,
            [field]: dateValue || undefined,
          }
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      } else if (field === "bidding_strategy_type") {
        // Convert formatted display value back to API format (e.g., "Maximize Conversions" -> "MAXIMIZE_CONVERSIONS")
        const biddingStrategyMap: Record<string, string> = {
          "Maximize Conversions": "MAXIMIZE_CONVERSIONS",
          "Maximize Conversion Value": "MAXIMIZE_CONVERSION_VALUE",
          "Target Cpa": "TARGET_CPA",
          "Target Roas": "TARGET_ROAS",
          "Target Impression Share": "TARGET_IMPRESSION_SHARE",
          "Target Spend": "TARGET_SPEND",
          "Manual Cpc": "MANUAL_CPC",
        };

        // Also handle if already in API format
        const strategyValue =
          biddingStrategyMap[newValue] ||
          newValue.toUpperCase().replace(/\s+/g, "_");

        // Build payload with strategy-specific parameters
        const payload: any = {
          campaignIds: [campaign.campaign_id],
          action: "bidding_strategy",
          bidding_strategy_type: strategyValue,
        };

        // Add strategy-specific parameters
        if (strategyValue === "TARGET_CPA" && inlineEditTargetCpa) {
          const targetCpaValue = parseFloat(inlineEditTargetCpa);
          if (!isNaN(targetCpaValue) && targetCpaValue > 0) {
            payload.target_cpa_micros = Math.round(targetCpaValue * 1000000); // Convert dollars to micros
          }
        }

        if (strategyValue === "TARGET_ROAS" && inlineEditTargetRoas) {
          const targetRoasValue = parseFloat(inlineEditTargetRoas);
          if (!isNaN(targetRoasValue) && targetRoasValue > 0) {
            payload.target_roas = targetRoasValue;
          }
        }

        if (strategyValue === "TARGET_SPEND") {
          // Validate required field
          if (!inlineEditTargetSpend || inlineEditTargetSpend.trim() === "") {
            alert("Target Spend ($) is required");
            setInlineEditLoading(false);
            return;
          }
          const targetSpendValue = parseFloat(inlineEditTargetSpend);
          if (isNaN(targetSpendValue) || targetSpendValue <= 0) {
            alert("Target Spend must be greater than 0");
            setInlineEditLoading(false);
            return;
          }
          payload.target_spend_micros = Math.round(targetSpendValue * 1000000); // Convert dollars to micros
        }

        if (strategyValue === "TARGET_IMPRESSION_SHARE") {
          // Validate required fields
          const validationErrors: { percent?: string; cpcCeiling?: string } = {};

          if (!inlineEditImpressionShareLocation) {
            validationErrors.percent = "Location is required";
          }

          if (!inlineEditImpressionSharePercent || inlineEditImpressionSharePercent.trim() === "") {
            validationErrors.percent = "Percent (%) impression share is required";
          } else {
            const percentValue = parseFloat(inlineEditImpressionSharePercent);
            if (isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
              validationErrors.percent = "Percent must be between 0 and 100";
            }
          }

          if (!inlineEditImpressionShareCpcCeiling || inlineEditImpressionShareCpcCeiling.trim() === "") {
            validationErrors.cpcCeiling = "Maximum CPC bid limit is required";
          } else {
            const cpcValue = parseFloat(inlineEditImpressionShareCpcCeiling);
            if (isNaN(cpcValue) || cpcValue <= 0) {
              validationErrors.cpcCeiling = "Maximum CPC bid limit must be greater than 0";
            }
          }

          // If there are validation errors, show them and stop
          if (Object.keys(validationErrors).length > 0) {
            setImpressionShareValidationErrors(validationErrors);
            setInlineEditLoading(false);
            return;
          }

          // Clear validation errors if all fields are valid
          setImpressionShareValidationErrors({});

          // Set the payload values
          if (inlineEditImpressionShareLocation) {
            payload.target_impression_share_location =
              inlineEditImpressionShareLocation;
          }
          if (inlineEditImpressionSharePercent) {
            const percentValue = parseFloat(inlineEditImpressionSharePercent);
            if (
              !isNaN(percentValue) &&
              percentValue >= 0 &&
              percentValue <= 100
            ) {
              payload.target_impression_share_location_fraction_micros =
                Math.round(percentValue * 10000); // Convert percentage to micros
            }
          }
          if (inlineEditImpressionShareCpcCeiling) {
            const cpcValue = parseFloat(inlineEditImpressionShareCpcCeiling);
            if (!isNaN(cpcValue) && cpcValue > 0) {
              payload.target_impression_share_cpc_bid_ceiling_micros =
                Math.round(cpcValue * 1000000); // Convert dollars to micros
            }
          }
        }

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          payload
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }

      // Clear any previous errors
      setInlineEditError(null);

      // Show success feedback
      setInlineEditSuccess({
        campaignId: campaign.campaign_id,
        field: field,
      });

      setShowInlineEditModal(false);
      setInlineEditCampaign(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
      setInlineEditTargetSpend("");
      setInlineEditImpressionShareLocation("TOP_OF_PAGE");
      setInlineEditImpressionSharePercent("");
      setInlineEditImpressionShareCpcCeiling("");
    } catch (error: any) {
      console.error("Error updating campaign:", error);

      // Clear any previous success
      setInlineEditSuccess(null);

      // Set error state for inline feedback (for budget/date/status/bidding_strategy_type fields)
      if (field === "budget" || field === "start_date" || field === "end_date" || field === "status" || field === "bidding_strategy_type") {
        let errorMessage = "Failed to update campaign. Please try again.";

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error?.response?.data) {
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (
            error.response.data.errors &&
            Array.isArray(error.response.data.errors) &&
            error.response.data.errors.length > 0
          ) {
            // Clean up error messages - remove "Campaign {id}:" prefix if present
            errorMessage = error.response.data.errors[0].replace(/^Campaign\s+\d+:\s*/i, "");
          }
        }

        setInlineEditError({
          campaignId: campaign.campaign_id,
          field: field,
          message: errorMessage,
        });
      } else {
        // For other fields, show modal (existing behavior)
        // Close the confirmation modal when there's an error
        setShowInlineEditModal(false);
      }

      // Don't clear campaign/field/values on error so user can see what they tried to change
      // But clear the strategy parameters
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
      setInlineEditTargetSpend("");
      setInlineEditImpressionShareLocation("TOP_OF_PAGE");
      setInlineEditImpressionSharePercent("");
      setInlineEditImpressionShareCpcCeiling("");

      let errorMessage = "Failed to update campaign. Please try again.";
      let genericErrors: string[] = [];

      if (error instanceof Error) {
        errorMessage = error.message;
        genericErrors = [error.message];
      } else if (error?.response?.data) {
        // Handle API error responses
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
          genericErrors = [error.response.data.error];
        } else if (
          error.response.data.errors &&
          Array.isArray(error.response.data.errors) &&
          error.response.data.errors.length > 0
        ) {
          // Clean up error messages - remove "Campaign {id}:" prefix if present
          genericErrors = error.response.data.errors.map((err: string) => {
            // Remove "Campaign {id}:" prefix for cleaner messages
            return err.replace(/^Campaign \d+:\s*/, "");
          });
          errorMessage = genericErrors[0];
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          genericErrors = [error.response.data.message];
        }
      }

      // Show error modal instead of alert
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message:
          genericErrors.length > 0
            ? genericErrors.length === 1
              ? genericErrors[0]
              : `${genericErrors.length} error(s) occurred while updating the campaign.`
            : errorMessage,
        genericErrors: genericErrors.length > 1 ? genericErrors : undefined,
        isSuccess: false,
      });
    } finally {
      setInlineEditLoading(false);
      setUpdatingField(null);
    }
  };

  // Original runInlineEdit for modal-based updates (status, bidding_strategy_type, budget, dates)
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

        console.log("Calling bulkUpdateGoogleCampaigns for budget:", {
          accountIdNum,
          campaignId: inlineEditCampaign.campaign_id,
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          {
            campaignIds: [inlineEditCampaign.campaign_id],
            action: "budget",
            budgetAction: "set",
            unit: "amount",
            value: budgetValue,
          }
        );

        console.log("Budget update response:", response);

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      } else if (
        inlineEditField === "start_date" ||
        inlineEditField === "end_date"
      ) {
        // inlineEditNewValue should already be in YYYY-MM-DD format from the date input
        let dateValue = inlineEditNewValue.trim();
        if (!dateValue || dateValue === "—") {
          dateValue = "";
        }

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          {
            campaignIds: [inlineEditCampaign.campaign_id],
            action: inlineEditField,
            [inlineEditField]: dateValue || undefined,
          }
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      } else if (inlineEditField === "status") {
        const statusValue = convertStatusToApi(inlineEditNewValue);

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          {
            campaignIds: [inlineEditCampaign.campaign_id],
            action: "status",
            status: statusValue,
          }
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      } else if (inlineEditField === "bidding_strategy_type") {
        const biddingStrategyMap: Record<string, string> = {
          "Maximize Conversions": "MAXIMIZE_CONVERSIONS",
          "Maximize Conversion Value": "MAXIMIZE_CONVERSION_VALUE",
          "Target Cpa": "TARGET_CPA",
          "Target Roas": "TARGET_ROAS",
          "Target Impression Share": "TARGET_IMPRESSION_SHARE",
          "Target Spend": "TARGET_SPEND",
          "Manual Cpc": "MANUAL_CPC",
        };

        const strategyValue =
          biddingStrategyMap[inlineEditNewValue] ||
          inlineEditNewValue.toUpperCase().replace(/\s+/g, "_");

        const payload: any = {
          campaignIds: [inlineEditCampaign.campaign_id],
          action: "bidding_strategy",
          bidding_strategy_type: strategyValue,
        };

        if (strategyValue === "TARGET_CPA" && inlineEditTargetCpa) {
          const targetCpaValue = parseFloat(inlineEditTargetCpa);
          if (!isNaN(targetCpaValue) && targetCpaValue > 0) {
            payload.target_cpa_micros = Math.round(targetCpaValue * 1000000);
          }
        }

        if (strategyValue === "TARGET_ROAS" && inlineEditTargetRoas) {
          const targetRoasValue = parseFloat(inlineEditTargetRoas);
          if (!isNaN(targetRoasValue) && targetRoasValue > 0) {
            payload.target_roas = targetRoasValue;
          }
        }

        if (strategyValue === "TARGET_SPEND") {
          // Validate required field
          if (!inlineEditTargetSpend || inlineEditTargetSpend.trim() === "") {
            alert("Target Spend ($) is required");
            setInlineEditLoading(false);
            return;
          }
          const targetSpendValue = parseFloat(inlineEditTargetSpend);
          if (isNaN(targetSpendValue) || targetSpendValue <= 0) {
            alert("Target Spend must be greater than 0");
            setInlineEditLoading(false);
            return;
          }
          payload.target_spend_micros = Math.round(targetSpendValue * 1000000); // Convert dollars to micros
        }

        if (strategyValue === "TARGET_IMPRESSION_SHARE") {
          // Validate required fields
          const validationErrors: { percent?: string; cpcCeiling?: string } = {};

          if (!inlineEditImpressionShareLocation) {
            validationErrors.percent = "Location is required";
          }

          if (!inlineEditImpressionSharePercent || inlineEditImpressionSharePercent.trim() === "") {
            validationErrors.percent = "Percent (%) impression share is required";
          } else {
            const percentValue = parseFloat(inlineEditImpressionSharePercent);
            if (isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
              validationErrors.percent = "Percent must be between 0 and 100";
            }
          }

          if (!inlineEditImpressionShareCpcCeiling || inlineEditImpressionShareCpcCeiling.trim() === "") {
            validationErrors.cpcCeiling = "Maximum CPC bid limit is required";
          } else {
            const cpcValue = parseFloat(inlineEditImpressionShareCpcCeiling);
            if (isNaN(cpcValue) || cpcValue <= 0) {
              validationErrors.cpcCeiling = "Maximum CPC bid limit must be greater than 0";
            }
          }

          // If there are validation errors, show them and stop
          if (Object.keys(validationErrors).length > 0) {
            setImpressionShareValidationErrors(validationErrors);
            setInlineEditLoading(false);
            return;
          }

          // Clear validation errors if all fields are valid
          setImpressionShareValidationErrors({});

          // Set the payload values
          if (inlineEditImpressionShareLocation) {
            payload.target_impression_share_location = inlineEditImpressionShareLocation;
          }
          if (inlineEditImpressionSharePercent) {
            const percentValue = parseFloat(inlineEditImpressionSharePercent);
            if (!isNaN(percentValue) && percentValue >= 0 && percentValue <= 100) {
              payload.target_impression_share_location_fraction_micros = Math.round(percentValue * 10000);
            }
          }
          if (inlineEditImpressionShareCpcCeiling) {
            const cpcValue = parseFloat(inlineEditImpressionShareCpcCeiling);
            if (!isNaN(cpcValue) && cpcValue > 0) {
              payload.target_impression_share_cpc_bid_ceiling_micros = Math.round(cpcValue * 1000000);
            }
          }
        }

        const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
        if (!channelIdNum || isNaN(channelIdNum)) {
          throw new Error("Channel ID is required");
        }
        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          channelIdNum,
          payload
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }

      setInlineEditError(null);
      setInlineEditSuccess({
        campaignId: inlineEditCampaign.campaign_id,
        field: inlineEditField,
      });

      setShowInlineEditModal(false);
      setInlineEditCampaign(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
      setInlineEditTargetSpend("");
      setInlineEditImpressionShareLocation("TOP_OF_PAGE");
      setInlineEditImpressionSharePercent("");
      setInlineEditImpressionShareCpcCeiling("");
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      setInlineEditSuccess(null);
      setShowInlineEditModal(false);

      let errorMessage = "Failed to update campaign. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
          errorMessage = error.response.data.errors[0].replace(/^Campaign\s+\d+:\s*/i, "");
        }
      }

      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setInlineEditLoading(false);
    }
  };

  const runBulkStatus = async (
    statusValue: "ENABLED" | "PAUSED"
  ) => {
    if (!accountId || selectedCampaigns.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, channelIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "status",
        status: statusValue,
      });

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Reload campaigns with loading state
      setSorting(true); // Show loading overlay
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update campaigns", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update campaigns. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedCampaigns.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkBiddingStrategy = async (strategy: {
    bidding_strategy_type: string;
    target_cpa_micros?: number;
    target_roas?: number;
    target_impression_share_location?: string;
    target_impression_share_location_fraction_micros?: number;
    target_impression_share_cpc_bid_ceiling_micros?: number;
  }) => {
    if (!accountId || selectedCampaigns.size === 0) return;
    
    // Store strategy and show confirmation modal
    setPendingBiddingStrategy(strategy);
    setIsBiddingStrategyChange(true);
    setIsBudgetChange(false);
    setPendingStatusAction(null);
    setShowBiddingStrategyPanel(false);
    setShowConfirmationModal(true);
  };

  const runBulkBiddingStrategy = async () => {
    if (!accountId || selectedCampaigns.size === 0 || !pendingBiddingStrategy) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
        accountIdNum,
        channelIdNum,
        {
          campaignIds: Array.from(selectedCampaigns),
          action: "bidding_strategy",
          ...pendingBiddingStrategy,
        }
      );

      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Reload campaigns
      setSorting(true);
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update bidding strategy", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update bidding strategy. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedCampaigns.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkConversionActions = async (conversionActionIds: string[]) => {
    if (!accountId || selectedCampaigns.size === 0 || conversionActionIds.length === 0) return;
    
    // Store conversion action IDs and show confirmation modal
    setPendingConversionActionIds(conversionActionIds);
    setIsBiddingStrategyChange(false);
    setIsBudgetChange(false);
    setPendingStatusAction(null);
    setShowConversionActionsPanel(false);
    setShowConfirmationModal(true);
  };

  const runBulkConversionActions = async () => {
    if (!accountId || selectedCampaigns.size === 0 || !pendingConversionActionIds || pendingConversionActionIds.length === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      const selectedCampaignsData = getSelectedCampaignsData();
      const results = {
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process campaigns in batches to avoid overwhelming the API
      const BATCH_SIZE = 10;
      for (let i = 0; i < selectedCampaignsData.length; i += BATCH_SIZE) {
        const batch = selectedCampaignsData.slice(i, i + BATCH_SIZE);
        
        await Promise.all(
          batch.map(async (campaign) => {
            try {
              await googleAdwordsCampaignsService.linkConversionActionsToCampaign(
                accountIdNum,
                channelIdNum,
                campaign.campaign_id,
                {
                  conversion_action_ids: pendingConversionActionIds,
                  customer_id: campaign.customer_id,
                }
              );
              results.updated++;
            } catch (error: any) {
              results.failed++;
              const errorMessage = error?.response?.data?.error || error?.message || "Failed to link conversion actions";
              results.errors.push(`Campaign ${campaign.campaign_id}: ${errorMessage}`);
            }
          })
        );
      }

      setBulkUpdateResults(results);

      // Reload campaigns
      setSorting(true);
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update conversion actions", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update conversion actions. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedCampaigns.size,
        errors: [errorMessage],
      });
      setShowConfirmationModal(true);
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
      setBulkUpdateResults(null);

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, channelIdNum, {
        campaignIds: Array.from(selectedCampaigns),
        action: "budget",
        budgetAction,
        unit: budgetUnit,
        value: valueNum,
        upperLimit: upper,
        lowerLimit: lower,
      });

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Reload campaigns with loading state
      setSorting(true); // Show loading overlay
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadCampaigns(accountIdNum, channelIdNum);
      }
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update campaigns", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update campaigns. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedCampaigns.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExport = async (exportType: "all_data" | "current_view" | "selected") => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    // Validate selected campaigns for selected export
    if (exportType === "selected" && selectedCampaigns.size === 0) {
      setErrorModal({
        isOpen: true,
        message: "Please select at least one campaign to export.",
      });
      return;
    }

    // Keep dropdown open and show loading
    setShowExportDropdown(true);
    setExportLoading(true);
    try {
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate
          ? startDateStr
          : undefined,
        end_date: endDate ? endDateStr : undefined,
        filters: filters, // Pass filters array directly
      };

      // Add pagination for current view export
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      // Add campaign IDs for selected export
      if (exportType === "selected") {
        params.campaign_ids = Array.from(selectedCampaigns);
      }

      // Call export API
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const result = await googleAdwordsCampaignsService.exportGoogleCampaigns(
        accountIdNum,
        channelIdNum,
        params,
        exportType
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

  const allSelected =
    filteredCampaigns.length > 0 && selectedCampaigns.size === filteredCampaigns.length;
  const someSelected =
    selectedCampaigns.size > 0 && selectedCampaigns.size < filteredCampaigns.length;

  // Memoize export options to prevent hooks order issues
  const exportOptions = useMemo(() => [
    { value: "bulk_export", label: "Export All" },
    {
      value: "current_view",
      label: "Export Current View",
    },
    {
      value: "selected",
      label: "Export Selected",
      disabled: selectedCampaigns.size === 0,
    },
  ], [selectedCampaigns.size]);

  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric as keyof typeof prev],
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
          } catch {
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
      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
        title={errorModal.title || (errorModal.isSuccess ? "Success" : "Error")}
        message={errorModal.message}
        isSuccess={errorModal.isSuccess}
        genericErrors={errorModal.genericErrors}
        errorDetails={errorModal.errorDetails}
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
            {/* Header with Filter Button + Sync */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                Campaigns
              </h1>
              <div className="flex items-center gap-2">
                <CreateGoogleCampaignSection
                  isOpen={isCreateCampaignPanelOpen}
                  onToggle={() => {
                    setIsCreateCampaignPanelOpen(!isCreateCampaignPanelOpen);
                    setIsFilterPanelOpen(false); // Close filter panel when opening create panel
                  }}
                />
                <button
                  onClick={() => {
                    setIsFilterPanelOpen(!isFilterPanelOpen);
                    setIsCreateCampaignPanelOpen(false); // Close create panel when opening filter panel
                  }}
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
                    className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""
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
            </div>

            {/* Create / Edit Campaign Panel */}
            {isCreateCampaignPanelOpen && (
              <>
                {/* Only show form when not loading (for edit mode) or in create mode */}
                {(!refreshMessage ||
                  refreshMessage.type !== "loading" ||
                  campaignFormMode === "create") && (
                    <CreateGoogleCampaignPanel
                      isOpen={isCreateCampaignPanelOpen}
                      onClose={() => {
                        setIsCreateCampaignPanelOpen(false);
                        setCreateCampaignError(null);
                        setInitialCampaignData(null);
                        setCampaignFormMode("create");
                        setCampaignId(undefined);
                        setRefreshMessage(null);
                      }}
                      onSubmit={handleCreateGoogleCampaign}
                      accountId={accountId}
                      channelId={channelId}
                      loading={createCampaignLoading}
                      submitError={createCampaignError}
                      mode={campaignFormMode}
                      initialData={initialCampaignData}
                      campaignId={campaignId}
                      refreshMessage={refreshMessage}
                    />
                  )}
              </>
            )}


            {/* Filter Panel - inline, matching Amazon layout */}
            {isFilterPanelOpen && accountId && (
              <DynamicFilterPanel
                isOpen={true}
                onClose={() => setIsFilterPanelOpen(false)}
                onApply={(newFilters) => {
                  // Convert DynamicFilterValues to FilterValues format for compatibility
                  const convertedFilters: FilterValues = newFilters.map((f) => ({
                    id: f.id,
                    field: f.field as FilterValues[0]["field"],
                    operator: f.operator,
                    value: f.value as string | number | string[] | { min: number; max: number },
                  })) as FilterValues;
                  setFilters(convertedFilters);
                  setCurrentPage(1);
                }}
                initialFilters={filters.map((f) => ({
                  id: f.id,
                  field: f.field as string,
                  operator: f.operator,
                  value: f.value,
                }))}
                accountId={accountId}
                marketplace="google_adwords"
                entityType="campaigns"
              />
            )}

            {/* Performance Trends Chart */}
            <div className="relative">
              <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={toggleChartMetric}
                title="Performance Trends"
                isCollapsed={isChartCollapsed}
                onCollapseToggle={toggleChartCollapse}
              />
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
              {loading && !isChartCollapsed && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <Loader size="md" message="Loading chart data..." />
                  </div>
                </div>
              )}
            </div>

            {/* Search, Edit and Export Buttons - Above Table */}
            <div className="relative">
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
                      Bulk Actions
                    </span>
                  </Button>
                  {showBulkActions && (
                    <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                      <div className="overflow-y-auto">
                        {[
                          { value: "ENABLED", label: "Enable" },
                          { value: "PAUSED", label: "Pause" },
                          // REMOVED cannot be set via status update - it's read-only
                          // To remove campaigns, use delete operation instead
                          { value: "edit_budget", label: "Edit Budget" },
                          { value: "edit_bidding_strategy", label: "Edit Bidding Strategy" },
                          { value: "edit_conversion_actions", label: "Edit Conversion Goals" },
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
                                setShowBiddingStrategyPanel(false);
                                setShowConversionActionsPanel(false);
                              } else if (opt.value === "edit_bidding_strategy") {
                                setShowBiddingStrategyPanel(true);
                                setShowBudgetPanel(false);
                                setShowConversionActionsPanel(false);
                              } else if (opt.value === "edit_conversion_actions") {
                                setShowConversionActionsPanel(true);
                                setShowBudgetPanel(false);
                                setShowBiddingStrategyPanel(false);
                              } else {
                                setShowBudgetPanel(false);
                                setShowBiddingStrategyPanel(false);
                                setShowConversionActionsPanel(false);
                                setPendingStatusAction(
                                  opt.value as "ENABLED" | "PAUSED"
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
                      disabled={
                        exportLoading || loading || campaigns.length === 0
                      }
                    >
                      {exportLoading ? (
                        <div className="flex items-center justify-center">
                          <Loader size="sm" showMessage={false} />
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
                          <Loader size="md" message="Exporting..." />
                          <p className="text-[11px] text-[#556179] text-center px-2">
                            Please wait while we prepare your file
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-y-auto">
                          {exportOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3 ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (opt.disabled) return;
                                const exportType =
                                  opt.value === "bulk_export"
                                    ? "all_data"
                                    : opt.value === "current_view"
                                      ? "current_view"
                                      : "selected";
                                // Keep dropdown open during export
                                await handleExport(exportType);
                              }}
                              disabled={exportLoading || opt.disabled}
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
                {/* <div className="relative inline-flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCustomizeColumns(true);
                    setShowBulkActions(false);
                    setShowExportDropdown(false);
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
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <span className="text-[10.64px] text-[#072929] font-normal">
                    Customize Columns
                  </span>
                </Button>
              </div> */}
              </div>
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[8px] cursor-not-allowed" />
              )}
            </div>

            {/* Google Campaigns Table Card with overlay when panel is open */}
            <div className="relative">
              {/* Bidding Strategy editor panel */}
              {selectedCampaigns.size > 0 && showBiddingStrategyPanel && (
                <BulkBiddingStrategyPanel
                  selectedCampaigns={selectedCampaigns}
                  campaigns={campaigns}
                  currencyCode={currencyCode}
                  onApply={handleBulkBiddingStrategy}
                  onCancel={() => {
                    setShowBiddingStrategyPanel(false);
                    setShowBulkActions(false);
                  }}
                />
              )}

              {/* Conversion Actions editor panel */}
              {selectedCampaigns.size > 0 && showConversionActionsPanel && accountId && channelId && (
                <BulkConversionActionsPanel
                  accountId={accountId}
                  channelId={channelId}
                  selectedCampaigns={selectedCampaigns}
                  campaigns={campaigns}
                  onApply={handleBulkConversionActions}
                  onCancel={() => {
                    setShowConversionActionsPanel(false);
                    setShowBulkActions(false);
                  }}
                />
              )}

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
                          buttonClassName="w-full bg-[#FEFEFB] edit-button"
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
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${budgetUnit === "percent"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                  }`}
                                onClick={() => setBudgetUnit("percent")}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${budgetUnit === "amount"
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
                          className="cancel-button"
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
                          className="create-entity-button btn-sm"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Modal - shared DRY component, full list */}
              <BulkUpdateConfirmationModal
                isOpen={showConfirmationModal}
                onClose={() => {
                  setShowConfirmationModal(false);
                  setShowBudgetPanel(false);
                  setShowBiddingStrategyPanel(false);
                  setShowConversionActionsPanel(false);
                  setShowBulkActions(false);
                  setPendingStatusAction(null);
                  setIsBudgetChange(false);
                  setIsBiddingStrategyChange(false);
                  setPendingBiddingStrategy(null);
                  setPendingConversionActionIds(null);
                  setBulkUpdateResults(null);
                }}
                entityLabel="campaign"
                entityNameColumn="Campaign Name"
                selectedCount={selectedCampaigns.size}
                bulkUpdateResults={bulkUpdateResults}
                isValueChange={isBudgetChange || isBiddingStrategyChange || pendingConversionActionIds !== null}
                valueChangeLabel={
                  isBudgetChange
                    ? "Budget"
                    : isBiddingStrategyChange
                    ? "Bidding Strategy"
                    : pendingConversionActionIds !== null
                    ? "Conversion Actions"
                    : "Status"
                }
                previewRows={(() => {
                  const selectedCampaignsData = getSelectedCampaignsData();
                  return selectedCampaignsData.map((campaign) => {
                    const oldBudget = campaign.daily_budget || 0;
                    const oldStatus = getStatusWithDefault(campaign.status);
                    const oldBiddingStrategy = formatBiddingStrategy(campaign.bidding_strategy_type || "");
                    
                    let oldValue: string;
                    let newValue: string;

                    if (isBudgetChange) {
                      const newBudget = calculateNewBudget(oldBudget);
                      oldValue = `$${oldBudget.toFixed(2)}`;
                      newValue = `$${newBudget.toFixed(2)}`;
                    } else if (isBiddingStrategyChange && pendingBiddingStrategy) {
                      const strategyLabel = pendingBiddingStrategy.bidding_strategy_type
                        .split("_")
                        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                        .join(" ");
                      let newStrategyText = strategyLabel;
                      if (pendingBiddingStrategy.target_cpa_micros) {
                        newStrategyText += ` (CPA: $${(pendingBiddingStrategy.target_cpa_micros / 1000000).toFixed(2)})`;
                      } else if (pendingBiddingStrategy.target_roas) {
                        newStrategyText += ` (ROAS: ${pendingBiddingStrategy.target_roas}x)`;
                      }
                      oldValue = oldBiddingStrategy || "—";
                      newValue = newStrategyText;
                    } else if (pendingConversionActionIds !== null) {
                      oldValue = "Current conversion actions";
                      newValue = `${pendingConversionActionIds.length} action(s) selected`;
                    } else {
                      const newStatus = pendingStatusAction || oldStatus;
                      oldValue = oldStatus;
                      newValue = newStatus;
                    }

                    return {
                      name: campaign.campaign_name || "Unnamed Campaign",
                      oldValue,
                      newValue,
                    } as BulkUpdatePreviewRow;
                  });
                })()}
                actionDetails={
                  !bulkUpdateResults
                    ? isBudgetChange
                      ? ({
                        type: "value",
                        action: budgetAction,
                        unit: budgetUnit,
                        value: budgetValue,
                        upperLimit,
                        lowerLimit,
                      } as BulkUpdateActionDetails)
                      : isBiddingStrategyChange && pendingBiddingStrategy
                        ? ({
                          type: "bidding_strategy",
                          bidding_strategy_type: pendingBiddingStrategy.bidding_strategy_type,
                          target_cpa: pendingBiddingStrategy.target_cpa_micros
                            ? `$${(pendingBiddingStrategy.target_cpa_micros / 1000000).toFixed(2)}`
                            : undefined,
                          target_roas: pendingBiddingStrategy.target_roas
                            ? `${pendingBiddingStrategy.target_roas}x`
                            : undefined,
                        } as any)
                        : pendingConversionActionIds !== null
                          ? ({
                            type: "conversion_actions",
                            count: pendingConversionActionIds.length,
                          } as any)
                          : pendingStatusAction
                            ? ({
                              type: "status",
                              newStatus:
                                pendingStatusAction.charAt(0) +
                                pendingStatusAction.slice(1).toLowerCase(),
                            } as BulkUpdateStatusDetails)
                            : null
                    : null
                }
                loading={bulkLoading}
                loadingMessage="Updating campaigns..."
                successMessage="All campaigns updated successfully!"
                onConfirm={async () => {
                  if (isBudgetChange) {
                    await runBulkBudget();
                  } else if (isBiddingStrategyChange && pendingBiddingStrategy) {
                    await runBulkBiddingStrategy();
                  } else if (pendingConversionActionIds !== null) {
                    await runBulkConversionActions();
                  } else if (pendingStatusAction) {
                    await runBulkStatus(pendingStatusAction);
                  }
                }}
              />

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
                        : inlineEditField === "status"
                          ? "Status"
                          : inlineEditField === "start_date"
                            ? "Start Date"
                            : inlineEditField === "end_date"
                              ? "End Date"
                              : "Bidding Strategy"}{" "}
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
                              : inlineEditField === "status"
                                ? "Status"
                                : inlineEditField === "start_date"
                                  ? "Start Date"
                                  : inlineEditField === "end_date"
                                    ? "End Date"
                                    : "Bidding Strategy"}
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
                              {inlineEditField === "start_date" ||
                                inlineEditField === "end_date"
                                ? (() => {
                                  // Format YYYY-MM-DD to MM/DD/YYYY for display
                                  if (
                                    !inlineEditNewValue ||
                                    inlineEditNewValue === "—"
                                  )
                                    return "—";
                                  const parts = inlineEditNewValue.split("-");
                                  if (parts.length === 3) {
                                    return `${parts[1]}/${parts[2]}/${parts[0]}`;
                                  }
                                  return inlineEditNewValue;
                                })()
                                : inlineEditNewValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bidding Strategy Parameters */}
                    {inlineEditField === "bidding_strategy_type" &&
                      (() => {
                        const strategyValue = inlineEditNewValue
                          .toUpperCase()
                          .replace(/\s+/g, "_");
                        const isTargetCpa = strategyValue === "TARGET_CPA";
                        const isTargetRoas = strategyValue === "TARGET_ROAS";
                        const isTargetSpend = strategyValue === "TARGET_SPEND";
                        const isTargetImpressionShare =
                          strategyValue === "TARGET_IMPRESSION_SHARE";

                        if (
                          !isTargetCpa &&
                          !isTargetRoas &&
                          !isTargetSpend &&
                          !isTargetImpressionShare
                        ) {
                          return null;
                        }

                        return (
                          <div className="mb-4 space-y-4">
                            {isTargetCpa && (
                              <div>
                                <label className="form-label-small">
                                  Target CPA ($)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={inlineEditTargetCpa}
                                  onChange={(e) =>
                                    setInlineEditTargetCpa(e.target.value)
                                  }
                                  placeholder="e.g., 2.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                />
                              </div>
                            )}

                            {isTargetRoas && (
                              <div>
                                <label className="form-label-small">
                                  Target ROAS
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={inlineEditTargetRoas}
                                  onChange={(e) =>
                                    setInlineEditTargetRoas(e.target.value)
                                  }
                                  placeholder="e.g., 4.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                />
                              </div>
                            )}

                            {isTargetSpend && (
                              <div>
                                <label className="form-label-small">
                                  Target Spend ($) *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={inlineEditTargetSpend}
                                  onChange={(e) =>
                                    setInlineEditTargetSpend(e.target.value)
                                  }
                                  placeholder="e.g., 10.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                />
                              </div>
                            )}

                            {isTargetImpressionShare && (
                              <>
                                <div>
                                  <label className="form-label-small">
                                    Where do you want your ads to appear? *
                                  </label>
                                  <select
                                    value={inlineEditImpressionShareLocation}
                                    onChange={(e) =>
                                      setInlineEditImpressionShareLocation(
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                  >
                                    <option value="TOP_OF_PAGE">
                                      Top of page
                                    </option>
                                    <option value="ABSOLUTE_TOP_OF_PAGE">
                                      Absolute top of page
                                    </option>
                                    <option value="ANYWHERE_ON_PAGE">
                                      Anywhere on page
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="form-label-small">
                                    Percent (%) impression share to target *
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={inlineEditImpressionSharePercent}
                                    onChange={(e) => {
                                      setInlineEditImpressionSharePercent(e.target.value);
                                      // Clear validation error when user types
                                      if (impressionShareValidationErrors.percent) {
                                        setImpressionShareValidationErrors(prev => ({ ...prev, percent: undefined }));
                                      }
                                    }}
                                    placeholder="e.g., 50"
                                    className={`w-full px-3 py-2 border rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D] ${impressionShareValidationErrors.percent
                                        ? "border-red-500"
                                        : "border-gray-300"
                                      }`}
                                  />
                                  {impressionShareValidationErrors.percent && (
                                    <p className="text-red-500 text-xs mt-1">{impressionShareValidationErrors.percent}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="form-label-small">
                                    Maximum CPC bid limit ($) *
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inlineEditImpressionShareCpcCeiling}
                                    onChange={(e) => {
                                      setInlineEditImpressionShareCpcCeiling(e.target.value);
                                      // Clear validation error when user types
                                      if (impressionShareValidationErrors.cpcCeiling) {
                                        setImpressionShareValidationErrors(prev => ({ ...prev, cpcCeiling: undefined }));
                                      }
                                    }}
                                    placeholder="e.g., 3.00"
                                    className={`w-full px-3 py-2 border rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D] ${impressionShareValidationErrors.cpcCeiling
                                        ? "border-red-500"
                                        : "border-gray-300"
                                      }`}
                                  />
                                  {impressionShareValidationErrors.cpcCeiling && (
                                    <p className="text-red-500 text-xs mt-1">{impressionShareValidationErrors.cpcCeiling}</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineEditModal(false);
                          setInlineEditCampaign(null);
                          setInlineEditField(null);
                          setInlineEditOldValue("");
                          setInlineEditNewValue("");
                          setInlineEditTargetCpa("");
                          setInlineEditTargetRoas("");
                          setInlineEditTargetSpend("");
                          setInlineEditImpressionShareLocation("TOP_OF_PAGE");
                          setInlineEditImpressionSharePercent("");
                          setInlineEditImpressionShareCpcCeiling("");
                          setImpressionShareValidationErrors({});
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={runInlineEdit}
                        disabled={
                          inlineEditLoading ||
                          (inlineEditField === "bidding_strategy_type" &&
                            (() => {
                              const strategyValue = inlineEditNewValue.toUpperCase().replace(/\s+/g, "_");
                              if (strategyValue === "TARGET_IMPRESSION_SHARE") {
                                return !inlineEditImpressionSharePercent || !inlineEditImpressionShareCpcCeiling || !inlineEditImpressionShareLocation;
                              }
                              if (strategyValue === "TARGET_SPEND") {
                                return !inlineEditTargetSpend || inlineEditTargetSpend.trim() === "";
                              }
                              return false;
                            })())
                        }
                        className="create-entity-button btn-sm"
                      >
                        {inlineEditLoading ? "Updating..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Customize Columns Modal */}
              {/* <CustomizeColumns
                columns={[
                  { key: "campaign_name", label: "Campaign Name", required: true },
                  { key: "account_name", label: "Account Name" },
                  { key: "advertising_channel_type", label: "Type" },
                  { key: "status", label: "State" },
                  { key: "budget", label: "Budget" },
                  { key: "start_date", label: "Start Date" },
                  { key: "end_date", label: "End Date" },
                  { key: "bidding_strategy_type", label: "Bid strategy type" },
                  { key: "impressions", label: "Impressions" },
                  { key: "clicks", label: "Clicks" },
                  { key: "spends", label: "Cost" },
                  { key: "sales", label: "Conv. value" },
                  { key: "roas", label: "Conv. value / cost" },
                  { key: "conversions", label: "Conversions" },
                  { key: "conversion_rate", label: "Conv. rate" },
                  { key: "cost_per_conversion", label: "Cost / conv." },
                  { key: "avg_cpc", label: "Avg. CPC" },
                  { key: "avg_cost", label: "Avg. cost" },
                  { key: "interaction_rate", label: "Interaction rate" },
                ]}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onColumnsChange={async (newVisibleColumns, newColumnOrder) => {
                  setVisibleColumns(newVisibleColumns);
                  setColumnOrder(newColumnOrder);
                  // Save preferences
                  // await savePreferencesMutation.mutateAsync({
                    visible_columns: Array.from(newVisibleColumns),
                    column_order: newColumnOrder,
                  });
                }}
                isOpen={showCustomizeColumns}
                onClose={() => setShowCustomizeColumns(false)}
                // isSaving={savePreferencesMutation.isPending}
              /> */}

              {/* Table */}
              <div className="table-container" style={{ position: 'relative', minHeight: loading ? '400px' : 'auto' }}>
                <div className="overflow-x-auto w-full">
                  <GoogleCampaignsTable
                    campaigns={filteredCampaigns}
                    loading={loading}
                    sorting={sorting}
                    accountId={accountId || ""}
                    channelId={channelId}
                    selectedCampaigns={selectedCampaigns}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    editingCell={editingCell}
                    editedValue={editedValue}
                    isCancelling={isCancellingRef.current}
                    summary={summary}
                    updatingField={updatingField}
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    inlineEditSuccess={inlineEditSuccess}
                    onSelectAll={handleSelectAll}
                    onSelectCampaign={handleSelectCampaign}
                    onSort={handleSort}
                    onStartInlineEdit={startInlineEdit}
                    onCancelInlineEdit={cancelInlineEdit}
                    onInlineEditChange={handleInlineEditChange}
                    onConfirmInlineEdit={confirmInlineEdit}
                    onConfirmInlineEditDirect={confirmInlineEditDirect}
                    inlineEditError={inlineEditError}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusBadge={getStatusBadgeLabel}
                    getChannelTypeLabel={getChannelTypeLabel}
                    getSortIcon={getSortIcon}
                    onEditCampaign={handleOpenEditCampaign}
                    editLoadingCampaignId={editLoadingCampaignId}
                    isPanelOpen={isCreateCampaignPanelOpen}
                    currencyCode={currencyCode}
                  />
                </div>
                {loading && (
                  <div className="loading-overlay">
                    <div className="loading-overlay-content">
                      <Loader size="md" message="Loading campaigns..." />
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {!loading && (
                <div className="flex items-center justify-end gap-3 mt-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10.64px] text-[#556179]">Show:</span>
                    <Dropdown<number>
                      options={[
                        { value: 10, label: "10" },
                        { value: 25, label: "25" },
                        { value: 50, label: "50" },
                        { value: 100, label: "100" },
                      ]}
                      value={itemsPerPage}
                      onChange={(value) => handlePageSizeChange(value)}
                      buttonClassName="px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#fefefb] text-[10.64px] text-black hover:bg-gray-50 min-w-[60px]"
                      menuClassName="border border-[#EBEBEB] rounded-lg bg-[#fefefb] shadow-lg"
                      width="w-auto"
                      align="right"
                    />
                  </div>
                  {totalPages > 1 && (
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
                      // Ensure pageNum is within valid range [1, totalPages]
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
                  )}
                </div>
              )}
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Fixed Loading Message Overlay - Centered in Viewport */}
      {isCreateCampaignPanelOpen &&
        refreshMessage &&
        refreshMessage.type === "loading" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-200 pointer-events-auto">
              <div className="flex items-center gap-3">
                <Loader size="sm" showMessage={false} className="!flex-row" />
                <span className="text-sm font-medium text-[#072929]">
                  {refreshMessage.message}
                </span>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
