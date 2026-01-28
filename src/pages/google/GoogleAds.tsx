import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import {
  getStatusWithDefault,
  formatStatusForDisplay,
  convertStatusToApi,
} from "./utils/googleAdsUtils";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Button } from "../../components/ui";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Banner } from "../../components/ui/Banner";
import {
  DynamicFilterPanel,
  type FilterValues,
} from "../../components/filters/DynamicFilterPanel";
import { googleAdwordsAdsService } from "../../services/googleAdwords/googleAdwordsAds";
import { useGoogleSyncStatus } from "../../hooks/useGoogleSyncStatus";
import { useChartCollapse } from "../../hooks/useChartCollapse";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { GoogleAdsListTable } from "./components/GoogleAdsListTable";
import { Loader } from "../../components/ui/Loader";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { TrashIcon } from "lucide-react";
import type { GoogleAd } from "./components/tabs/GoogleTypes";

export const GoogleAds: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
  const [ads, setAds] = useState<GoogleAd[]>([]);
  const [summary, setSummary] = useState<{
    total_ads: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
    total_conversions?: number;
    avg_conversion_rate?: number;
    avg_cost_per_conversion?: number;
    avg_cpc?: number;
    avg_cost?: number;
    avg_interaction_rate?: number;
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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [analyticsSyncMessage, setAnalyticsSyncMessage] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);
  const isLoadingRef = useRef(false);
  const lastRequestParamsRef = useRef<string>(""); // Track last request to prevent duplicate calls

  // Chart toggles
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
    "google-ads-chart-collapsed"
  );

  // Selection and bulk actions
  const [selectedAds, setSelectedAds] = useState<Set<string | number>>(
    new Set()
  );
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "ENABLED" | "PAUSED" | "REMOVED" | null
  >(null);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    adId: string | number;
    field: "status";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const isCancellingRef = useRef(false);
  const [updatingField, setUpdatingField] = useState<{
    adId: string | number;
    field: "status";
    newValue: string;
  } | null>(null);
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditAd, setInlineEditAd] = useState<GoogleAd | null>(null);
  const [inlineEditField, setInlineEditField] = useState<"status" | null>(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [inlineEditSuccess, setInlineEditSuccess] = useState<{
    adId: string | number;
    field: string;
  } | null>(null);
  const [inlineEditError, setInlineEditError] = useState<{
    adId: string | number;
    field: string;
    message: string;
  } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [pendingRemoveChange, setPendingRemoveChange] = useState<{
    adId: string | number;
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
    setPageTitle("Google Ads");
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

  // Removed buildFilterParams - now passing filters array directly to service

  const loadAds = useCallback(async (accountId: number) => {
    // Prevent duplicate concurrent calls
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      const params: any = {
        filters: filters, // Pass filters array directly
        sort_by: sortBy,
        order: sortOrder,
        page: currentPage,
        page_size: itemsPerPage,
        start_date: startDate
          ? startDateStr
          : undefined,
        end_date: endDate ? endDateStr : undefined,
      };

      const response = await googleAdwordsAdsService.getGoogleAds(
        accountId,
        undefined,
        undefined,
        params
      );
      console.log("Google ads API response:", response);
      const adsArray = Array.isArray(response.ads) ? response.ads : [];
      setAds(adsArray);
      setTotalPages(response.total_pages || 0);
      setTotal(response.total || 0);
      
      // Store chart data from API if available
      const responseWithChart = response as any;
      console.log("🔍 [CHART DEBUG] Checking for chart_data in response:", {
        hasChartData: !!responseWithChart.chart_data,
        chartDataType: typeof responseWithChart.chart_data,
        isArray: Array.isArray(responseWithChart.chart_data),
        chartDataLength: responseWithChart.chart_data?.length,
        chartDataPreview: responseWithChart.chart_data?.slice(0, 3),
        fullResponseKeys: Object.keys(responseWithChart),
        hasSummary: !!responseWithChart.summary,
        summaryKeys: responseWithChart.summary ? Object.keys(responseWithChart.summary) : [],
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
      if (responseWithChart.summary) {
        console.log("✅ [SUMMARY DEBUG] Setting summary:", responseWithChart.summary);
        setSummary(responseWithChart.summary);
      } else {
        console.log("❌ [SUMMARY DEBUG] No summary found in response");
        setSummary(null);
      }
      setSelectedAds(new Set());
    } catch (error) {
      console.error("Failed to load Google ads:", error);
      setAds([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [filters, sortBy, sortOrder, currentPage, itemsPerPage, startDate?.toISOString(), endDate?.toISOString()]);

  // Sync status hook (after loadAds is defined)
  const { SyncStatusBanner } = useGoogleSyncStatus({
    accountId,
    entityType: "ads",
    currentData: ads,
    loadFunction: loadAds,
  });

  useEffect(() => {
    if (sorting) return;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        // Create a unique key for this request to prevent duplicate calls
        const requestKey = JSON.stringify({
          accountId: accountIdNum,
          currentPage,
          filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
          startDate: startDate ? startDateStr : null,
          endDate: endDate ? endDateStr : null,
        });

        // Only call loadAds if the request parameters have actually changed
        if (lastRequestParamsRef.current !== requestKey) {
          lastRequestParamsRef.current = requestKey;
          loadAds(accountIdNum);
        }
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, currentPage, filters, startDate?.toISOString(), endDate?.toISOString(), sorting]);




  const handleSort = async (column: string) => {
    if (sorting) return;

    const newSortBy = column;
    const newSortOrder =
      sortBy === column ? (sortOrder === "asc" ? "desc" : "asc") : "asc";

    setSorting(true);
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);

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
              ? startDateStr
              : undefined,
            end_date: endDate ? endDateStr : undefined,
            filters: filters, // Pass filters array directly
          };

          const response = await googleAdwordsAdsService.getGoogleAds(
            accountIdNum,
            undefined,
            undefined,
            params
          );
          setAds(Array.isArray(response.ads) ? response.ads : []);
          setTotalPages(response.total_pages || 0);
          setTotal(response.total || 0);
          const responseWithChart = response as any;
          if (
            responseWithChart.chart_data &&
            Array.isArray(responseWithChart.chart_data)
          ) {
            setChartDataFromApi(responseWithChart.chart_data);
          } else {
            setChartDataFromApi([]);
          }
          if (responseWithChart.summary) {
            setSummary(responseWithChart.summary);
          } else {
            setSummary(null);
          }
          setSelectedAds(new Set());
        } catch (error) {
          console.error("Failed to sort ads:", error);
        } finally {
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
      setSelectedAds(new Set(ads.map((a) => a.ad_id || a.id)));
    } else {
      setSelectedAds(new Set());
    }
  };

  const handleSelectAd = (adId: string | number, checked: boolean) => {
    const newSelected = new Set(selectedAds);
    if (checked) {
      newSelected.add(adId);
    } else {
      newSelected.delete(adId);
    }
    setSelectedAds(newSelected);
  };

  // Inline edit handlers
  const startInlineEdit = (ad: GoogleAd, field: "status") => {
    setEditingCell({ adId: ad.ad_id || ad.id, field });
    if (field === "status") {
      setEditedValue(getStatusWithDefault(ad.status));
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
    field?: string,
    adIdOverride?: string | number
  ) => {
    // If called from dropdown with direct values, use those
    const adIdToUse = adIdOverride || editingCell?.adId;
    const fieldToUse = (field || editingCell?.field) as "status" | undefined;
    
    if (!adIdToUse || !fieldToUse || fieldToUse !== "status" || !accountId || isCancellingRef.current) return;

    const ad = ads.find((a) => (a.ad_id || a.id) === adIdToUse);
    if (!ad) return;

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;
    const oldValue = getStatusWithDefault(ad.status).trim();
    const newValue = valueToCheck.trim();
    const hasChanged = newValue !== oldValue;

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    // Check if status is being changed to REMOVED - show remove confirmation modal
    if (newValue.toUpperCase() === "REMOVED") {
      cancelInlineEdit();
      setPendingRemoveChange({ adId: adIdToUse });
      setShowRemoveConfirmation(true);
      return;
    }

    // Show modal for confirmation
    setInlineEditAd(ad);
    setInlineEditField("status");
    setInlineEditOldValue(oldValue);
    setInlineEditNewValue(newValue);
    setShowInlineEditModal(true);
    setEditingCell(null);
  };


  // Original runInlineEdit for modal-based updates (if needed in future)
  const runInlineEdit = async () => {
    if (!inlineEditAd || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "status") {
        // Convert display status to API format
        const statusValue = convertStatusToApi(inlineEditNewValue);

        const response = await googleAdwordsAdsService.bulkUpdateGoogleAds(accountIdNum, {
          adIds: [inlineEditAd.ad_id || inlineEditAd.id],
          action: "status",
          status: statusValue,
        });

        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0]);
        }
      }

      await loadAds(accountIdNum);
      
      setShowInlineEditModal(false);
      setInlineEditAd(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
      
      // Clear any previous errors
      setInlineEditError(null);
      
      // Show success feedback
      setInlineEditSuccess({
        adId: inlineEditAd.ad_id || inlineEditAd.id,
        field: inlineEditField,
      });
    } catch (error: any) {
      console.error("Error updating ad:", error);
      
      // Clear any previous success
      setInlineEditSuccess(null);
      
      // Set error state
      let errorMessage = "Failed to update ad. Please try again.";
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
          errorMessage = error.response.data.errors[0];
        }
      }
      
      setInlineEditError({
        adId: inlineEditAd.ad_id || inlineEditAd.id,
        field: inlineEditField || "status",
        message: errorMessage,
      });
    } finally {
      setInlineEditLoading(false);
    }
  };

  // Handle confirmation for REMOVED status change
  const handleConfirmRemove = async () => {
    if (!pendingRemoveChange || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const statusValue = convertStatusToApi("REMOVED");
      await googleAdwordsAdsService.bulkUpdateGoogleAds(accountIdNum, {
        adIds: [pendingRemoveChange.adId],
        action: "status",
        status: statusValue,
      });

      await loadAds(accountIdNum);
      
      setShowRemoveConfirmation(false);
      setPendingRemoveChange(null);
      
      // Clear any previous errors
      setInlineEditError(null);
      
      // Show success feedback
      setInlineEditSuccess({
        adId: pendingRemoveChange.adId,
        field: "status",
      });
    } catch (error: any) {
      console.error("Failed to remove ad:", error);
      
      // Clear any previous success
      setInlineEditSuccess(null);
      
      // Set error state for inline feedback
      let errorMessage = "Failed to remove ad. Please try again.";
      
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
          errorMessage = error.response.data.errors[0];
        }
      }
      
      setInlineEditError({
        adId: pendingRemoveChange.adId,
        field: "status",
        message: errorMessage,
      });
    } finally {
      setInlineEditLoading(false);
    }
  };

  // Handle cancel for REMOVED status change
  const handleCancelRemove = () => {
    setShowRemoveConfirmation(false);
    setPendingRemoveChange(null);
    // Cancel the inline edit
    cancelInlineEdit();
  };

  const runBulkStatus = async (
    statusValue: "ENABLED" | "PAUSED" | "REMOVED"
  ) => {
    if (!accountId || selectedAds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const response = await googleAdwordsAdsService.bulkUpdateGoogleAds(accountIdNum, {
        adIds: Array.from(selectedAds),
        action: "status",
        status: statusValue,
      });

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Reload ads after successful update
      setSorting(true); // Show loading overlay on table
      await loadAds(accountIdNum);
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update ads", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update ads. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedAds.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedAdsData = () => {
    return ads.filter((ad) => selectedAds.has(ad.ad_id || ad.id));
  };

  const handleExport = async (exportType: "all_data" | "current_view" | "selected") => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    // Validate selected ads for selected export
    if (exportType === "selected" && selectedAds.size === 0) {
      alert("Please select at least one ad to export.");
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

      // Add ad IDs for selected export
      if (exportType === "selected") {
        params.ad_ids = Array.from(selectedAds);
      }

      const result = await googleAdwordsAdsService.exportGoogleAds(accountIdNum, params, exportType);
      
      // Automatically download the file if result has url
      if (result?.url) {
        const link = document.createElement("a");
        link.href = result.url;
        link.download = result.filename || "ads_export.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Close dropdown after a short delay to show success
      setTimeout(() => {
        setShowExportDropdown(false);
      }, 500);
    } catch (error: any) {
      console.error("Failed to export ads:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export ads. Please try again.";
      alert(errorMessage);
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
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
      disabled: selectedAds.size === 0,
    },
  ], [selectedAds.size]);

  const getStatusBadge = (status: string) => {
    const statusLabel = formatStatusForDisplay(status) || "Paused";
    return <StatusBadge status={statusLabel} />;
  };

  const allSelected = ads.length > 0 && selectedAds.size === ads.length;
  const someSelected =
    selectedAds.size > 0 && selectedAds.size < ads.length;

  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric as keyof typeof prev],
    }));
  };

  // Chart data comes from backend
  const chartData = useMemo(() => {
    if (chartDataFromApi.length > 0) {
      const processed = chartDataFromApi.map((item) => {
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
          sales: item.sales || 0,
          spend: item.spend || 0,
          impressions: item.impressions || 0,
          clicks: Math.round(item.clicks || 0),
          acos: 0,
          roas: 0,
        };
      });
      return processed;
    }
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
                Ads
              </h1>
              <div className="flex items-center gap-2">
                <button
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


            {/* Filter Panel */}
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
                    value: f.value,
                  }));
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
                entityType="ads"
              />
            )}

            <div className="relative">
            {/* Performance Trends Chart */}
            <PerformanceChart
              data={chartData}
              toggles={chartToggles}
              onToggle={toggleChartMetric}
              title="Performance Trends"
              isCollapsed={isChartCollapsed}
              onCollapseToggle={toggleChartCollapse}
            />
            {loading && !isChartCollapsed && (
                  <div className="loading-overlay">
                    <div className="loading-overlay-content">
                      <Loader size="md" message="Loading chart data..." />
                    </div>
                  </div>
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
                        { value: "REMOVED", label: "Remove" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedAds.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedAds.size === 0) return;
                            setPendingStatusAction(
                              opt.value as "ENABLED" | "PAUSED" | "REMOVED"
                            );
                            setShowConfirmationModal(true);
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
                    }}
                    disabled={exportLoading || loading || ads.length === 0}
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
                            className={`w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3 ${
                              opt.disabled ? "opacity-50 cursor-not-allowed" : ""
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
            </div>

            {/* Google Ads Table Card with overlay when panel is open */}
            <div className="relative">

              {/* Confirmation Modal */}
              {showConfirmationModal && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !bulkLoading) {
                      setShowConfirmationModal(false);
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative">
                    {bulkLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
                        <Loader size="md" message="Updating ads..." />
                      </div>
                    )}
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      {bulkUpdateResults
                        ? "Update Results"
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
                              ✓ All ads updated successfully!
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Confirmation Summary */
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.16px] text-[#556179]">
                            {selectedAds.size} ad{selectedAds.size !== 1 ? "s" : ""}{" "}
                            will be updated:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            Status change
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Ads Preview Table - Only show before update */}
                    {!bulkUpdateResults && (() => {
                      const selectedAdsData = getSelectedAdsData();
                      const previewCount = Math.min(10, selectedAdsData.length);
                      const hasMore = selectedAdsData.length > 10;

                      return (
                        <div className="mb-6">
                          <div className="mb-2">
                            <span className="text-[10.64px] text-[#556179]">
                              {hasMore
                                ? `Showing ${previewCount} of ${selectedAdsData.length} selected ads`
                                : `${selectedAdsData.length} ad${
                                    selectedAdsData.length !== 1 ? "s" : ""
                                  } selected`}
                            </span>
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-sandstorm-s20">
                                <tr>
                                  <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                    Ad ID
                                  </th>
                                  <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                    Old Status
                                  </th>
                                  <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                    New Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedAdsData.slice(0, 10).map((ad) => {
                                  const oldStatus = getStatusWithDefault(ad.status);
                                  const newStatus = pendingStatusAction
                                    ? pendingStatusAction
                                    : oldStatus;

                                  return (
                                    <tr
                                      key={ad.ad_id || ad.id}
                                      className="border-b border-gray-200 last:border-b-0"
                                    >
                                      <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                        {ad.ad_id || ad.id}
                                      </td>
                                      <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                        {oldStatus}
                                      </td>
                                      <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                        {newStatus}
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
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 mb-6">
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

                    <div className="flex justify-end gap-3">
                      {bulkUpdateResults ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmationModal(false);
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
                              if (!bulkLoading) {
                                setShowConfirmationModal(false);
                                setPendingStatusAction(null);
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
                              if (pendingStatusAction && !bulkLoading) {
                                await runBulkStatus(pendingStatusAction);
                              }
                            }}
                            disabled={bulkLoading}
                            className="create-entity-button btn-sm"
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
              {showInlineEditModal && inlineEditAd && inlineEditField && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowInlineEditModal(false);
                      setInlineEditAd(null);
                      setInlineEditField(null);
                      setInlineEditOldValue("");
                      setInlineEditNewValue("");
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      Confirm Status Change
                    </h3>
                    <div className="mb-4">
                      <p className="text-[12.16px] text-[#556179] mb-2">
                        Ad ID:{" "}
                        <span className="font-semibold text-[#072929]">
                          {inlineEditAd.ad_id || inlineEditAd.id}
                        </span>
                      </p>
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[12.16px] text-[#556179]">
                            Status:
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
                          setInlineEditAd(null);
                          setInlineEditField(null);
                          setInlineEditOldValue("");
                          setInlineEditNewValue("");
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={runInlineEdit}
                        disabled={inlineEditLoading}
                        className="create-entity-button btn-sm"
                      >
                        {inlineEditLoading ? "Updating..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="table-container" style={{ position: 'relative', minHeight: loading ? '400px' : 'auto' }}>
                <div className="overflow-x-auto w-full">
                  <GoogleAdsListTable
                    ads={ads}
                    loading={loading}
                    sorting={sorting}
                    accountId={accountId || ""}
                    selectedAds={selectedAds}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    editingCell={editingCell}
                    editedValue={editedValue}
                    isCancelling={isCancellingRef.current}
                    updatingField={updatingField}
                    pendingStatusChange={null}
                    summary={summary}
                    inlineEditSuccess={inlineEditSuccess}
                    inlineEditError={inlineEditError}
                    onSelectAll={handleSelectAll}
                    onSelectAd={handleSelectAd}
                    onSort={handleSort}
                    onStartInlineEdit={startInlineEdit}
                    onCancelInlineEdit={cancelInlineEdit}
                    onInlineEditChange={handleInlineEditChange}
                    onConfirmInlineEdit={confirmInlineEdit}
                    onConfirmStatusChange={() => {}}
                    onCancelStatusChange={() => {}}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusBadge={getStatusBadge}
                    getSortIcon={getSortIcon}
                  />
                </div>
                {loading && (
                  <div className="loading-overlay">
                    <div className="loading-overlay-content">
                      <Loader size="md" message="Loading ads..." />
                    </div>
                  </div>
                )}
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
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showRemoveConfirmation}
        onClose={handleCancelRemove}
        onConfirm={handleConfirmRemove}
        title="Are you sure you want to remove this ad?"
        message="This action cannot be undone. All data associated with this ad will be permanently removed."
        type="danger"
        size="sm"
        isLoading={inlineEditLoading}
        icon={<TrashIcon className="w-6 h-6 text-red-600" />}
      />
    </div>
  );
};
