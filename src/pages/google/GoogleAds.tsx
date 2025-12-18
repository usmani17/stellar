import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import { GoogleAdsListTable } from "./components/GoogleAdsListTable";
import type { GoogleAd } from "./components/tabs/types";

export const GoogleAds: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [ads, setAds] = useState<GoogleAd[]>([]);
  const [summary, setSummary] = useState<{
    total_ads: number;
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

  // Chart toggles
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    impressions: false,
    clicks: false,
    acos: false,
    roas: false,
  });

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    adId: string | number;
    field: "status";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [updatingField, setUpdatingField] = useState<{
    adId: string | number;
    field: "status";
  } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    adId: string | number;
    newStatus: string;
    oldStatus: string;
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

  // Cancel inline edit when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingCell) {
        const target = event.target as HTMLElement;
        const isDropdownMenu =
          target.closest('[class*="z-50"]') ||
          target.closest('[class*="shadow-lg"]') ||
          target.closest('button[type="button"]');
        const isInput = target.closest("input");
        const isModal = target.closest('[class*="fixed"]');

        if (!isInput && !isDropdownMenu && !isModal) {
          setTimeout(() => {
            if (editingCell) {
              cancelInlineEdit();
            }
          }, 150);
        }
      }
    };

    if (editingCell) {
      const timeout = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 200);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [editingCell]);

  // Set page title
  useEffect(() => {
    setPageTitle("Google Ads");
    return () => {
      resetPageTitle();
    };
  }, []);

  useEffect(() => {
    if (sorting) return;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadAds(accountIdNum);
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
      if (filter.field === "ad_type") {
        params.ad_type = filter.value;
      } else if (filter.field === "status") {
        params.status = filter.value;
      } else if (filter.field === "campaign_id") {
        params.campaign_id = filter.value;
      } else if (filter.field === "adgroup_id") {
        params.adgroup_id = filter.value;
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

  const loadAdsWithFilters = async (
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

      const response = await campaignsService.getGoogleAds(
        accountId,
        undefined,
        undefined,
        params
      );
      setAds(Array.isArray(response.ads) ? response.ads : []);
      setTotalPages(response.total_pages || 0);
      setTotal(response.total || 0);
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
          if (responseWithChart.summary) {
            setSummary(responseWithChart.summary);
          } else {
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
    }
  };

  const loadAds = async (accountId: number) => {
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

      const response = await campaignsService.getGoogleAds(
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
    }
  };

  const handleSync = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncing(true);
      setSyncMessage(null);
      const result = await campaignsService.syncGoogleAds(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} ads`;

      if (result.errors && result.errors.length > 0) {
        const errorDetails = (result as any).error_details || result.errors;
        const errorText = errorDetails.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage(message);

      if (result.synced > 0) {
        setCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAds(accountIdNum);

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage(null), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage(null), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ads:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ads from Google Ads";
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

      const result = await campaignsService.syncGoogleAdAnalytics(
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

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadAds(accountIdNum);
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
        "Failed to sync ad analytics from Google Ads";
      setAnalyticsSyncMessage(errorMessage);
      setTimeout(() => setAnalyticsSyncMessage(null), 8000);
    } finally {
      setSyncingAnalytics(false);
    }
  };

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
              ? startDate.toISOString().split("T")[0]
              : undefined,
            end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
            ...buildFilterParams(filters),
          };

          const response = await campaignsService.getGoogleAds(
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
      setEditedValue(ad.status || "ENABLED");
    }
  };

  const cancelInlineEdit = () => {
    setIsCancelling(true);
    setEditingCell(null);
    setEditedValue("");
    setTimeout(() => {
      setIsCancelling(false);
    }, 100);
  };

  const handleInlineEditChange = (value: string) => {
    setEditedValue(value);
  };

  const confirmInlineEdit = (value: string) => {
    if (!editingCell || !accountId || isCancelling) return;

    const ad = ads.find((a) => (a.ad_id || a.id) === editingCell.adId);
    if (!ad) return;

    const oldValue = (ad.status || "ENABLED").trim();
    const newValue = value.trim();
    const hasChanged = newValue !== oldValue;

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    // For status changes, show inline confirmation
    setPendingStatusChange({
      adId: editingCell.adId,
      newStatus: newValue,
      oldStatus: oldValue,
    });
    setEditingCell(null);
    setEditedValue("");
  };

  const runInlineStatusUpdate = async (
    adId: string | number,
    newStatus: string
  ) => {
    if (!accountId) return;

    setUpdatingField({ adId, field: "status" });

    // Optimistically update the local state
    setAds((prevAds) =>
      prevAds.map((ad) =>
        (ad.ad_id || ad.id) === adId ? { ...ad, status: newStatus } : ad
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

      const response = await campaignsService.bulkUpdateGoogleAds(
        accountIdNum,
        {
          adIds: [adId],
          action: "status",
          status: statusValue,
        }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0]);
      }

      setPendingStatusChange(null);
      setEditingCell(null);
      setEditedValue("");
    } catch (error) {
      console.error("Error updating ad status:", error);
      // Revert optimistic update on error
      const ad = ads.find((a) => (a.ad_id || a.id) === adId);
      if (ad) {
        setAds((prevAds) =>
          prevAds.map((a) =>
            (a.ad_id || a.id) === adId
              ? { ...a, status: pendingStatusChange?.oldStatus || ad.status }
              : a
          )
        );
      }
      alert("Failed to update ad status. Please try again.");
    } finally {
      setUpdatingField(null);
    }
  };

  const runBulkStatus = async (
    statusValue: "ENABLED" | "PAUSED" | "REMOVED"
  ) => {
    if (!accountId || selectedAds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setBulkLoading(true);
      await campaignsService.bulkUpdateGoogleAds(accountIdNum, {
        adIds: Array.from(selectedAds),
        action: "status",
        status: statusValue,
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
      alert("Failed to update ads. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedAdsData = () => {
    return ads.filter((ad) => selectedAds.has(ad.ad_id || ad.id));
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

      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      await campaignsService.exportGoogleAds(accountIdNum, params, exportType);
      setShowExportModal(false);
    } catch (error: any) {
      console.error("Failed to export ads:", error);
      alert("Failed to export ads. Please try again.");
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      ENABLED: "Enable",
      PAUSED: "Paused",
      REMOVED: "Removed",
    };
    const statusLabel = statusMap[status.toUpperCase()] || "Paused";
    return <StatusBadge status={statusLabel} />;
  };

  const allSelected = ads.length > 0 && selectedAds.size === ads.length;
  const someSelected =
    selectedAds.size > 0 && selectedAds.size < ads.length;

  const toggleChartMetric = (
    metric: "sales" | "spend" | "impressions" | "clicks" | "acos" | "roas"
  ) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
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
          } catch (e) {
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
                Google Ads Manager
              </h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                    "Sync Ads"
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

            {/* Filter Panel */}
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
                      loadAdsWithFilters(accountIdNum, newFilters);
                    }
                  }
                }}
                initialFilters={filters}
                filterFields={[
                  { value: "ad_type", label: "Ad Type" },
                  { value: "status", label: "Status" },
                  { value: "campaign_id", label: "Campaign ID" },
                  { value: "adgroup_id", label: "Ad Group ID" },
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

            {/* Google Ads Table Card */}
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6 flex flex-col gap-6 max-w-full overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  Ads{" "}
                  <span className="text-[12.8px] font-normal text-[#727272]">
                    ({total} total)
                  </span>
                </h2>
                <div
                  className="relative inline-flex justify-end gap-2"
                  ref={dropdownRef}
                >
                  <Button
                    type="button"
                    className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:bg-gray-50 hover:!text-[#072929] transition-colors text-[9.5px] text-[#072929] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowExportModal(true)}
                    disabled={exporting || loading || ads.length === 0}
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
                  <Button
                    type="button"
                    className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:bg-gray-50 hover:!text-[#072929] transition-colors text-[9.5px] text-[#072929] font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBulkActions((prev) => !prev);
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
                          { value: "ENABLED", label: "Enable" },
                          { value: "PAUSED", label: "Pause" },
                          { value: "REMOVED", label: "Remove" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
              </div>

              {/* Confirmation Modal */}
              {showConfirmationModal && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !bulkLoading) {
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
                            Updating ads...
                          </span>
                        </div>
                      </div>
                    )}
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      Confirm Status Changes
                    </h3>

                    {/* Summary */}
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

                    {/* Ads Preview Table */}
                    {(() => {
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
                                  const oldStatus = ad.status || "ENABLED";
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

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!bulkLoading) {
                            setShowConfirmationModal(false);
                            setPendingStatusAction(null);
                          }
                        }}
                        disabled={bulkLoading}
                        className="px-4 py-2 bg-background-field border border-gray-200 text-button-text text-text-primary font-semibold rounded-lg items-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (pendingStatusAction && !bulkLoading) {
                            await runBulkStatus(pendingStatusAction);
                            setShowConfirmationModal(false);
                            setShowBulkActions(false);
                            setPendingStatusAction(null);
                          }
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
                      Export Ads
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
                          ? `Exporting ${ads.length} ad${ads.length !== 1 ? "s" : ""} from the current page (${total} total available)`
                          : `Exporting all ${total} ad${total !== 1 ? "s" : ""} matching your filters`}
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
                        className="px-4 py-2 bg-background-field border border-gray-200 text-[11.2px] font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Table */}
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
                isCancelling={isCancelling}
                updatingField={updatingField}
                pendingStatusChange={pendingStatusChange}
                summary={summary}
                onSelectAll={handleSelectAll}
                onSelectAd={handleSelectAd}
                onSort={handleSort}
                onStartInlineEdit={startInlineEdit}
                onCancelInlineEdit={cancelInlineEdit}
                onInlineEditChange={handleInlineEditChange}
                onConfirmInlineEdit={confirmInlineEdit}
                onConfirmStatusChange={runInlineStatusUpdate}
                onCancelStatusChange={() => {
                  setPendingStatusChange(null);
                  cancelInlineEdit();
                }}
                formatCurrency={formatCurrency}
                formatPercentage={formatPercentage}
                getStatusBadge={getStatusBadge}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
