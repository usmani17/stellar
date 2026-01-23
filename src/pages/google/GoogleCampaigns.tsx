import { parseDateToYYYYMMDD } from "../../utils/dateHelpers";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { formatCurrency, formatPercentage } from "../../utils/formatters";
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
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { GoogleCampaignsTable} from "./components/GoogleCampaignsTable";
import { CreateGoogleCampaignSection } from "../../components/campaigns/CreateGoogleCampaignSection";
import {
  CreateGoogleCampaignPanel,
  type CreateGoogleCampaignData,
} from "../../components/campaigns/CreateGoogleCampaignPanel";
import { ErrorModal } from "../../components/ui/ErrorModal";
import { Loader } from "../../components/ui/Loader";
import type { IGoogleCampaign, IGoogleCampaignsSummary } from "../../types/google/campaign";

// IGoogleCampaign interface is now imported from GoogleCampaignsTable

export const GoogleCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncingAnalytics, setSyncingAnalytics] = useState(false);
  const [analyticsSyncMessage, setAnalyticsSyncMessage] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);
  const isLoadingRef = useRef(false);
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
    "ENABLED" | "PAUSED" | null
  >(null);
  const [isBudgetChange, setIsBudgetChange] = useState(false);
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
  const [isCancelling, setIsCancelling] = useState(false);
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
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

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

  // Removed buildFilterParams - now passing filters array directly to service

  const loadCampaigns = useCallback(async (accountId: number) => {
    // Prevent duplicate concurrent calls
    if (isLoadingRef.current) {
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
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        filters: filters || [], // Pass filters array directly - ensure it's always an array
      };

      console.log("🔍 [FILTERS DEBUG] Sending filters to service:", {
        filters,
        filtersType: Array.isArray(filters) ? "array" : typeof filters,
        filtersLength: Array.isArray(filters) ? filters.length : "N/A",
        params,
      });

      const response = await googleAdwordsCampaignsService.getGoogleCampaigns(
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
      setTotal(0);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [sortBy, sortOrder, currentPage, itemsPerPage, startDate?.toISOString(), endDate?.toISOString(), filters]);

  // Sync status hook (after loadCampaigns is defined)
  const { syncStatus: campaignsSyncStatus, SyncStatusBanner, checkSyncStatus } = useGoogleSyncStatus({
    accountId,
    entityType: "campaigns",
    currentData: campaigns,
    loadFunction: loadCampaigns,
  });

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
  }, [accountId, currentPage, filters, startDate?.toISOString(), endDate?.toISOString(), loadCampaigns, sorting]);

  const loadCampaignsWithFilters = async (
    accountId: number,
    filterList: FilterValues
  ) => {
    try {
      setLoading(true);
      const params: any = {
        filters: filterList, // Pass filters array directly
        sort_by: sortBy,
        order: sortOrder,
        page: 1,
        page_size: itemsPerPage,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      };

      const response = await googleAdwordsCampaignsService.getGoogleCampaigns(
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

  const handleCreateGoogleCampaign = async (data: CreateGoogleCampaignData) => {
    if (!accountId) return;

    // If in edit mode, call update handler instead
    if (campaignFormMode === "edit" && campaignId) {
      return handleUpdateGoogleCampaign(data);
    }

    setCreateCampaignLoading(true);
    setCreateCampaignError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await googleAdwordsCampaignsService.createGoogleCampaign(
        accountIdNum,
        data
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

      // Show success modal with navigation button if we have campaign ID
      if (newCampaignId) {
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `Campaign "${data.name}" created successfully!`,
          isSuccess: true,
          actionButton: {
            text: "View Campaign",
            onClick: () => {
              setErrorModal({ isOpen: false, message: "" });
              navigate(
                `/accounts/${accountIdNum}/google-campaigns/${newCampaignId}`
              );
            },
          },
        });
        await loadCampaigns(accountIdNum);
      } else {
        // If no campaign ID, show success and reload campaigns
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `Campaign "${data.name}" created successfully!`,
          isSuccess: true,
        });

        // Refresh campaigns to get updated data
        await loadCampaigns(accountIdNum);
      }
    } catch (error: any) {
      console.error("Failed to create Google campaign:", error);
      setCreateCampaignLoading(false);

      // Extract error message from backend response
      let errorMessage = "Failed to create campaign. Please try again.";
      let errorDetails = null;
      let fieldErrors: Record<string, string> = {};

      if (error?.response?.data) {
        // Check for validation errors (400 status)
        if (error.response.status === 400) {
          // Check for field-specific validation errors
          if (error.response.data.field_errors) {
            fieldErrors = error.response.data.field_errors;
          }

          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        } else {
          // Check for error message
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }

          // Check for detailed error information
          if (error.response.data.details) {
            errorDetails = error.response.data.details;
            // If details is an object with errors, format it
            if (
              typeof errorDetails === "object" &&
              !Array.isArray(errorDetails)
            ) {
              if (errorDetails.errors) {
                errorMessage = `Google Ads API errors: ${JSON.stringify(
                  errorDetails.errors
                )}`;
              } else if (errorDetails.message) {
                errorMessage = `Google Ads API error: ${errorDetails.message}`;
              }
            }
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Store error message as plain string for display
      // Note: Field errors are handled separately by the panel if needed
      setCreateCampaignError(errorMessage);

      // Don't close panel on error - let user fix and resubmit
      // Re-throw error so the form knows submission failed
      throw error;
    }
  };

  // Handle campaign updates in edit mode
  const handleUpdateGoogleCampaign = async (data: CreateGoogleCampaignData) => {
    if (!accountId || !campaignId) {
      console.error("Cannot update campaign: missing accountId or campaignId", {
        accountId,
        campaignId,
      });
      const errorMessage = "Missing account or campaign ID";
      setCreateCampaignError(errorMessage);
      throw new Error(errorMessage);
    }

    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) {
      throw new Error("Invalid account ID");
    }

    setCreateCampaignLoading(true);
    setCreateCampaignError(null);

    try {
      // Get original data to compare changes
      const original = initialCampaignData;
      if (!original) {
        throw new Error("Original campaign data not available");
      }

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

      // 7. Check if PMax Asset fields changed (only for PERFORMANCE_MAX campaigns)
      if (data.campaign_type === "PERFORMANCE_MAX") {
        const originalExtraData = (original as any).extra_data || {};

        // Check headlines
        const originalHeadlines =
          original.headlines || originalExtraData.headlines || [];
        const newHeadlines = data.headlines || [];
        if (
          JSON.stringify(originalHeadlines.sort()) !==
          JSON.stringify(newHeadlines.sort())
        ) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.headlines = newHeadlines;
        }

        // Check descriptions
        const originalDescriptions =
          original.descriptions || originalExtraData.descriptions || [];
        const newDescriptions = data.descriptions || [];
        if (
          JSON.stringify(originalDescriptions.sort()) !==
          JSON.stringify(newDescriptions.sort())
        ) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.descriptions = newDescriptions;
        }

        // Check final_url
        const originalFinalUrl =
          original.final_url || originalExtraData.final_url || "";
        const newFinalUrl = data.final_url || "";
        if (newFinalUrl !== originalFinalUrl && newFinalUrl) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.final_url = newFinalUrl;
        }

        // Check business_name
        const originalBusinessName =
          original.business_name || originalExtraData.business_name || "";
        const newBusinessName = data.business_name || "";
        if (newBusinessName !== originalBusinessName && newBusinessName) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.business_name = newBusinessName;
        }

        // Check logo_url
        const originalLogoUrl =
          original.logo_url || originalExtraData.logo_url || "";
        const newLogoUrl = data.logo_url || "";
        if (newLogoUrl !== originalLogoUrl && newLogoUrl) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.logo_url = newLogoUrl;
        }

        // Check marketing_image_url
        const originalMarketingImage =
          original.marketing_image_url ||
          originalExtraData.marketing_image_url ||
          "";
        const newMarketingImage = data.marketing_image_url || "";
        if (newMarketingImage !== originalMarketingImage && newMarketingImage) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.marketing_image_url = newMarketingImage;
        }

        // Check square_marketing_image_url
        const originalSquareImage =
          original.square_marketing_image_url ||
          originalExtraData.square_marketing_image_url ||
          "";
        const newSquareImage = data.square_marketing_image_url || "";
        if (newSquareImage !== originalSquareImage && newSquareImage) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.square_marketing_image_url = newSquareImage;
        }

        // Check long_headline
        const originalLongHeadline =
          original.long_headline || originalExtraData.long_headline || "";
        const newLongHeadline = data.long_headline || "";
        if (newLongHeadline !== originalLongHeadline && newLongHeadline) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.long_headline = newLongHeadline;
        }

        // Check asset_group_name
        const originalAssetGroupName =
          original.asset_group_name || originalExtraData.asset_group_name || "";
        const newAssetGroupName = data.asset_group_name || "";
        if (newAssetGroupName !== originalAssetGroupName && newAssetGroupName) {
          updatePayload.pmax_assets = updatePayload.pmax_assets || {};
          updatePayload.pmax_assets.asset_group_name = newAssetGroupName;
        }
      }

      console.log("Update payload:", updatePayload);

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
          "No changes detected. Please modify at least one field (name, status, budget, start date, end date, Shopping Settings, or Performance Max assets).";
        setCreateCampaignError(errorMessage);
        setCreateCampaignLoading(false);
        throw new Error(errorMessage);
      }

      // Update campaign-level fields if there are any changes
      if (hasCampaignChanges) {
        console.log("Executing campaign update with changes...");
        const result = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          campaignUpdatePayload
        );
        console.log("Campaign update completed successfully", result);
      }

      // Update asset group if PMax assets changed
      if (hasPmaxChanges && campaignFormMode === "edit") {
        try {
          console.log("Executing asset group update with changes...");
          await campaignsService.updateGooglePmaxAssetGroup(
            accountIdNum,
            campaignId,
            pmaxAssets
          );
          console.log("Asset group updated successfully");
        } catch (assetError: any) {
          console.error("Failed to update asset group:", assetError);
          // Log error but don't fail the entire update
          // The campaign update succeeded, asset group update is separate
        }
      }

      console.log("Update completed successfully");

      // Show success message
      const updatedFields = [];
      if (campaignUpdatePayload.name) updatedFields.push("name");
      if (campaignUpdatePayload.status) updatedFields.push("status");
      if (campaignUpdatePayload.value !== undefined)
        updatedFields.push("budget");
      if (campaignUpdatePayload.start_date) updatedFields.push("start date");
      if (campaignUpdatePayload.end_date) updatedFields.push("end date");
      if (campaignUpdatePayload.merchant_id) updatedFields.push("merchant ID");
      if (campaignUpdatePayload.sales_country)
        updatedFields.push("sales country");
      if (campaignUpdatePayload.campaign_priority !== undefined)
        updatedFields.push("campaign priority");
      if (campaignUpdatePayload.enable_local !== undefined)
        updatedFields.push("enable local");
      // Add PMax asset fields
      if (pmaxAssets?.headlines) updatedFields.push("headlines");
      if (pmaxAssets?.descriptions) updatedFields.push("descriptions");
      if (pmaxAssets?.final_url) updatedFields.push("final URL");
      if (pmaxAssets?.business_name) updatedFields.push("business name");
      if (pmaxAssets?.logo_url) updatedFields.push("logo URL");
      if (pmaxAssets?.marketing_image_url)
        updatedFields.push("marketing image");
      if (pmaxAssets?.square_marketing_image_url)
        updatedFields.push("square marketing image");
      if (pmaxAssets?.long_headline) updatedFields.push("long headline");
      if (pmaxAssets?.asset_group_name) updatedFields.push("asset group name");

      const fieldsText =
        updatedFields.length > 0 ? updatedFields.join(", ") : "campaign";

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: `Campaign updated successfully! Updated fields: ${fieldsText}.`,
        isSuccess: true,
      });

      // Reload campaigns
      await loadCampaigns(accountIdNum);

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
        error.message ||
        "Failed to update campaign. Please try again.";
      setCreateCampaignError(errorMessage);
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
          const campaignDetail = await googleAdwordsCampaignsService.getGoogleCampaignDetail(
            accountIdNum,
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
        if (extra_data.long_headline) {
          initial.long_headline = extra_data.long_headline;
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

  const handleSync = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncing(true);
      setSyncMessage(null);
      const result = await googleAdwordsCampaignsService.syncGoogleCampaigns(accountIdNum);
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

      // Check sync status immediately after triggering sync
      await checkSyncStatus();

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

      // Always use 1 year date range for analytics sync (365 days)
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const result = await googleAdwordsCampaignsService.syncGoogleCampaignAnalytics(
        accountIdNum,
        oneYearAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0]
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
            filters: filters, // Pass filters array directly
          };

          const response = await googleAdwordsCampaignsService.getGoogleCampaigns(
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
      setEditedValue(campaign.status || "ENABLED");
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
    } else if (editingCell.field === "bidding_strategy_type") {
      const oldValue = (campaign.bidding_strategy_type || "").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
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

    // For status changes, show modal
    if (editingCell.field === "status") {
      const oldStatusRaw = campaign.status || "ENABLED";
      const newStatusRaw = valueToCheck.trim();

      // Format status values for display (convert ENABLED -> Enabled, PAUSED -> Paused, REMOVED -> Removed)
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        REMOVED: "Removed",
        Enabled: "Enabled",
        Paused: "Paused",
        Removed: "Removed",
      };
      const oldValue = statusDisplayMap[oldStatusRaw] || oldStatusRaw;
      const newValue = statusDisplayMap[newStatusRaw] || newStatusRaw;

      setInlineEditCampaign(campaign);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(oldValue);
      setInlineEditNewValue(newValue);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For budget, show modal
    if (editingCell.field === "budget") {
      const newBudget = parseFloat(valueToCheck) || 0;
      const oldBudget = campaign.daily_budget || 0;

      setInlineEditCampaign(campaign);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(formatCurrency(oldBudget));
      setInlineEditNewValue(formatCurrency(newBudget));
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For bidding_strategy_type, show modal
    if (editingCell.field === "bidding_strategy_type") {
      const oldValue = campaign.bidding_strategy_type || "—";
      const newValue = valueToCheck.trim();

      // Format bidding strategy for display
      const formatBiddingStrategy = (strategy: string) => {
        if (!strategy) return "—";
        return strategy
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
      };

      // Reset bidding strategy parameters
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
      setInlineEditImpressionShareLocation("TOP_OF_PAGE");
      setInlineEditImpressionSharePercent("");
      setInlineEditImpressionShareCpcCeiling("");

      setInlineEditCampaign(campaign);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(formatBiddingStrategy(oldValue));
      setInlineEditNewValue(formatBiddingStrategy(newValue));
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For start_date and end_date, show modal
    if (
      editingCell.field === "start_date" ||
      editingCell.field === "end_date"
    ) {
      // Format dates for display
      const oldDateStr = parseDateToYYYYMMDD(campaign[editingCell.field]);
      const newDateStr = valueToCheck.trim();

      // Format dates for display (MM/DD/YYYY format)
      const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return "—";
        try {
          const parts = dateStr.split("-");
          if (parts.length !== 3) {
            return dateStr;
          }
          const [year, month, day] = parts;
          return `${month}/${day}/${year}`;
        } catch (e) {
          return dateStr;
        }
      };

      // Store formatted values for display in modal
      const oldValue = oldDateStr ? formatDateForDisplay(oldDateStr) : "—";

      setInlineEditCampaign(campaign);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(oldValue);
      // Store the raw YYYY-MM-DD value for API call (we'll format it for display in modal)
      setInlineEditNewValue(newDateStr);
      setShowInlineEditModal(true);
      setEditingCell(null);
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

  const runInlineEdit = async () => {
    if (!inlineEditCampaign || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "status") {
        // Map status values: Google API uses "ENABLED" | "PAUSED" (uppercase)
        // REMOVED is read-only and cannot be set via update operation
        // Handle both formatted display values (from modal) and raw values
        const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
          ENABLED: "ENABLED",
          PAUSED: "PAUSED",
          Enabled: "ENABLED",
          Paused: "PAUSED",
          enable: "ENABLED",
          pause: "PAUSED",
        };
        const statusValue = statusMap[inlineEditNewValue] || "ENABLED";
        
        // REMOVED is not in statusMap, so it cannot be set via update operation
        // If user somehow selects REMOVED, it will be caught by backend validation

        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
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
      } else if (inlineEditField === "budget") {
        const budgetValue = parseFloat(
          inlineEditNewValue.replace(/[^0-9.]/g, "")
        );
        if (isNaN(budgetValue)) {
          throw new Error("Invalid budget value");
        }

        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          {
            campaignIds: [inlineEditCampaign.campaign_id],
            action: "budget",
            budgetAction: "set",
            unit: "amount",
            value: budgetValue,
          }
        );

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

        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
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
      } else if (inlineEditField === "bidding_strategy_type") {
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
          biddingStrategyMap[inlineEditNewValue] ||
          inlineEditNewValue.toUpperCase().replace(/\s+/g, "_");

        // Build payload with strategy-specific parameters
        const payload: any = {
          campaignIds: [inlineEditCampaign.campaign_id],
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

        if (strategyValue === "TARGET_IMPRESSION_SHARE") {
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

        const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
          accountIdNum,
          payload
        );

        if (response.errors && response.errors.length > 0) {
          const error = new Error(response.errors[0]);
          (error as any).response = { data: { errors: response.errors } };
          throw error;
        }
      }

      await loadCampaigns(accountIdNum);
      setShowInlineEditModal(false);
      setInlineEditCampaign(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
      setInlineEditImpressionShareLocation("TOP_OF_PAGE");
      setInlineEditImpressionSharePercent("");
      setInlineEditImpressionShareCpcCeiling("");
    } catch (error: any) {
      console.error("Error updating campaign:", error);

      // Close the confirmation modal when there's an error
      setShowInlineEditModal(false);
      // Don't clear campaign/field/values on error so user can see what they tried to change
      // But clear the strategy parameters
      setInlineEditTargetCpa("");
      setInlineEditTargetRoas("");
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

      const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
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
      await loadCampaigns(accountIdNum);
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

      const response = await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
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
      await loadCampaigns(accountIdNum);
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

  const handleExport = async (exportType: "all_data" | "current_view") => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    // Keep dropdown open and show loading
    setShowExportDropdown(true);
    setExportLoading(true);
    try {
      const params: any = {
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        filters: filters, // Pass filters array directly
      };

      // Add pagination for current view export
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      // Call export API
      const result = await googleAdwordsCampaignsService.exportGoogleCampaigns(
        accountIdNum,
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
    campaigns.length > 0 && selectedCampaigns.size === campaigns.length;
  const someSelected =
    selectedCampaigns.size > 0 && selectedCampaigns.size < campaigns.length;

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
          } catch  {
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
                Campaigns Overview
              </h1>
              <div className="flex items-center gap-3">
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

            {/* Sync Status Banner */}
            <SyncStatusBanner />

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
                  // Removed direct call to loadCampaignsWithFilters - useEffect will handle it when filters change
                  // This prevents double requests
                  // if (accountId) {
                  //   const accountIdNum = parseInt(accountId, 10);
                  //   if (!isNaN(accountIdNum)) {
                  //     loadCampaignsWithFilters(accountIdNum, convertedFilters);
                  //   }
                  // }
                }}
                initialFilters={filters.map((f) => ({
                  id: f.id,
                  field: f.field as string,
                  operator: f.operator,
                  value: f.value,
                }))}
                accountId={accountId}
                marketplace="google_adwords"
              />
            )}

            {/* Performance Trends Chart */}
            <div className="relative">
              <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={toggleChartMetric}
                title="Performance Trends"
              />
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
            </div>

            {/* Edit and Export Buttons - Above Table */}
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
                        { value: "ENABLED", label: "Enable" },
                        { value: "PAUSED", label: "Pause" },
                        // REMOVED cannot be set via status update - it's read-only
                        // To remove campaigns, use delete operation instead
                        { value: "edit_budget", label: "Edit Budget" },
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
                            } else {
                              setShowBudgetPanel(false);
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

            {/* Google Campaigns Table Card with overlay when panel is open */}
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
                  <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative">
                    {bulkLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
                        <Loader size="md" message="Updating campaigns..." />
                      </div>
                    )}
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      {bulkUpdateResults
                        ? "Update Results"
                        : isBudgetChange
                        ? "Confirm Budget Changes"
                        : "Confirm Status Changes"}
                    </h3>

                    {/* Results Summary */}
                    {bulkUpdateResults ? (
                      <div className="mb-6">
                        <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[12.16px] text-[#556179]">
                              Update Summary:
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-forest-f40"></div>
                              <span className="text-[12.16px] text-[#556179]">
                                Successfully updated:
                              </span>
                              <span className="text-[12.16px] font-semibold text-forest-f40">
                                {bulkUpdateResults.updated}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-r40"></div>
                              <span className="text-[12.16px] text-[#556179]">
                                Failed:
                              </span>
                              <span className="text-[12.16px] font-semibold text-red-r40">
                                {bulkUpdateResults.failed}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Errors */}
                        {bulkUpdateResults.errors.length > 0 && (
                          <div className="bg-red-r0 border border-red-r20 rounded-lg p-4 mb-4">
                            <div className="text-[12.16px] font-semibold text-red-r40 mb-2">
                              Errors ({bulkUpdateResults.errors.length}):
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              <ul className="list-disc list-inside space-y-1">
                                {bulkUpdateResults.errors.map((error, index) => (
                                  <li
                                    key={index}
                                    className="text-[11.2px] text-red-r40"
                                  >
                                    {error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Success message if all succeeded */}
                        {bulkUpdateResults.failed === 0 && bulkUpdateResults.updated > 0 && (
                          <div className="bg-forest-f0 border border-forest-f40 rounded-lg p-4 mb-4">
                            <div className="text-[12.16px] font-semibold text-forest-f60">
                              ✓ All campaigns updated successfully!
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Confirmation Summary */
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
                    )}

                    {/* Campaign Preview Table - Only show before update */}
                    {!bulkUpdateResults && (() => {
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

                    {/* Action Details - Only show before update */}
                    {!bulkUpdateResults && (
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
                              ? pendingStatusAction.charAt(0) +
                                pendingStatusAction.slice(1).toLowerCase()
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    )}

                    <div className="flex justify-end gap-3">
                      {bulkUpdateResults ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmationModal(false);
                            setShowBudgetPanel(false);
                            setShowBulkActions(false);
                            setPendingStatusAction(null);
                            setBulkUpdateResults(null);
                          }}
                          className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
                        >
                          Close
                        </button>
                      ) : (
                        <>
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
                              if (isBudgetChange) {
                                await runBulkBudget();
                              } else if (pendingStatusAction) {
                                await runBulkStatus(pendingStatusAction);
                              }
                            }}
                            disabled={bulkLoading}
                            className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {bulkLoading ? "Updating..." : "Confirm"}
                          </button>
                        </>
                      )}
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
                      setInlineEditCampaign(null);
                      setInlineEditField(null);
                      setInlineEditOldValue("");
                      setInlineEditNewValue("");
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
                        : inlineEditField === "end_date"
                        ? "End Date"
                        : "Bidding Strategy"}{" "}
                      Change
                    </h3>
                    <div className="mb-4">
                      <p className="text-[12.8px] text-[#556179] mb-2">
                        Campaign:{" "}
                        <span className="font-semibold text-[#072929]">
                          {inlineEditCampaign.campaign_name ||
                            "Unnamed Campaign"}
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
                              : inlineEditField === "end_date"
                              ? "End Date"
                              : "Bidding Strategy"}
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
                        const isTargetImpressionShare =
                          strategyValue === "TARGET_IMPRESSION_SHARE";

                        if (
                          !isTargetCpa &&
                          !isTargetRoas &&
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

                            {isTargetImpressionShare && (
                              <>
                                <div>
                                  <label className="form-label-small">
                                    Where do you want your ads to appear?
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
                                    Percent (%) impression share to target
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={inlineEditImpressionSharePercent}
                                    onChange={(e) =>
                                      setInlineEditImpressionSharePercent(
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., 50"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                  />
                                </div>
                                <div>
                                  <label className="form-label-small">
                                    Maximum CPC bid limit ($)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inlineEditImpressionShareCpcCeiling}
                                    onChange={(e) =>
                                      setInlineEditImpressionShareCpcCeiling(
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., 3.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[12.8px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                  />
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
                          setInlineEditImpressionShareLocation("TOP_OF_PAGE");
                          setInlineEditImpressionSharePercent("");
                          setInlineEditImpressionShareCpcCeiling("");
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
              <div className="table-container">
                <div className="overflow-x-auto w-full">
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
                    onSelectAll={handleSelectAll}
                    onSelectCampaign={handleSelectCampaign}
                    onSort={handleSort}
                    onStartInlineEdit={startInlineEdit}
                    onCancelInlineEdit={cancelInlineEdit}
                    onInlineEditChange={handleInlineEditChange}
                    onConfirmInlineEdit={confirmInlineEdit}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusBadge={getStatusBadgeLabel}
                    getChannelTypeLabel={getChannelTypeLabel}
                    getSortIcon={getSortIcon}
                    onEditCampaign={handleOpenEditCampaign}
                    editLoadingCampaignId={editLoadingCampaignId}
                    isPanelOpen={isCreateCampaignPanelOpen}
                  />
                </div>
              </div>

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
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <button
                        onClick={() => setCurrentPage(totalPages)}
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
              {isCreateCampaignPanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
            </div>

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
