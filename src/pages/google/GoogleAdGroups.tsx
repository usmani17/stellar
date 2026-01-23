import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  DynamicFilterPanel,
  type FilterValues,
} from "../../components/filters/DynamicFilterPanel";
import { googleAdwordsAdGroupsService } from "../../services/googleAdwords/googleAdwordsAdGroups";
import { useGoogleSyncStatus } from "../../hooks/useGoogleSyncStatus";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import {
  GoogleAdGroupsTable,
  type GoogleAdGroup,
} from "./components/GoogleAdGroupsTable";
import { Loader } from "../../components/ui/Loader";

// GoogleAdGroup interface is now imported from GoogleAdGroupsTable

export const GoogleAdGroups: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [adgroups, setAdgroups] = useState<GoogleAdGroup[]>([]);
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
  const [selectedAdgroups, setSelectedAdgroups] = useState<
    Set<string | number>
  >(new Set());
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
    "ENABLED" | "PAUSED" | null
  >(null);
  const [isBidChange, setIsBidChange] = useState(false);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline edit state - match Amazon pattern
  const [editingCell, setEditingCell] = useState<{
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [updatingField, setUpdatingField] = useState<{
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
  } | null>(null);
  // Pending changes - match Amazon pattern (no modal, show confirm/cancel buttons inline)
  const [pendingChanges, setPendingChanges] = useState<Record<string, {
    itemId: string | number;
    newValue: string;
  }>>({});
  // Status edit modal - match TikTok/Amazon pattern (show modal for status confirmation)
  const [showStatusEditModal, setShowStatusEditModal] = useState(false);
  const [statusEditData, setStatusEditData] = useState<{
    adgroup: GoogleAdGroup;
    oldValue: string;
    newValue: string;
  } | null>(null);
  const [statusEditLoading, setStatusEditLoading] = useState(false);
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
    setPageTitle("Google Ad Groups");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Removed buildFilterParams - now passing filters array directly to service

  const loadAdgroups = useCallback(async (accountId: number) => {
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
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      };

      const response = await googleAdwordsAdGroupsService.getGoogleAdGroups(
        accountId,
        undefined,
        params
      );
      const adgroupsArray = Array.isArray(response.adgroups)
        ? response.adgroups
        : [];
      setAdgroups(adgroupsArray);
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
      // Clear selection when adgroups reload
      setSelectedAdgroups(new Set());
    } catch (error) {
      console.error("Failed to load Google adgroups:", error);
      setAdgroups([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [filters, sortBy, sortOrder, currentPage, itemsPerPage, startDate?.toISOString(), endDate?.toISOString()]);

  useEffect(() => {
    // Don't reload if we're currently sorting (handleSort will handle the reload)
    // Also don't reload when sortBy/sortOrder changes (handleSort handles that)
    if (sorting) return;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadAdgroups(accountIdNum);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [accountId, currentPage, filters, startDate?.toISOString(), endDate?.toISOString(), loadAdgroups, sorting]);

  const loadAdgroupsWithFilters = async (
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

      const response = await googleAdwordsAdGroupsService.getGoogleAdGroups(
        accountId,
        undefined,
        params
      );
      setAdgroups(Array.isArray(response.adgroups) ? response.adgroups : []);
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
      setSelectedAdgroups(new Set());
    } catch (error) {
      console.error("Failed to load Google adgroups:", error);
      setAdgroups([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Sync status hook (after loadAdgroups is defined)
  const { SyncStatusBanner, checkSyncStatus } = useGoogleSyncStatus({
    accountId,
    entityType: "adgroups",
    currentData: adgroups,
    loadFunction: loadAdgroups,
  });

  const handleSync = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncing(true);
      setSyncMessage(null);
      const result = await googleAdwordsAdGroupsService.syncGoogleAdGroups(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} adgroups`;

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

      // Reset to first page and reload adgroups after sync
      if (result.synced > 0) {
        setCurrentPage(1);
        // Small delay to ensure database is updated
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAdgroups(accountIdNum);

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
        "Failed to sync adgroups from Google Ads";
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
      
      const result = await googleAdwordsAdGroupsService.syncGoogleAdGroupAnalytics(
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

      // Reload adgroups to show updated analytics
      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadAdgroups(accountIdNum);
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
        "Failed to sync adgroup analytics from Google Ads";
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

    // Reload adgroups with new sort
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

          const response = await googleAdwordsAdGroupsService.getGoogleAdGroups(
            accountIdNum,
            undefined,
            params
          );
          setAdgroups(
            Array.isArray(response.adgroups) ? response.adgroups : []
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
          setSelectedAdgroups(new Set()); // Clear selection
        } catch (error) {
          console.error("Failed to sort adgroups:", error);
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
      setSelectedAdgroups(new Set(adgroups.map((a) => a.adgroup_id)));
    } else {
      setSelectedAdgroups(new Set());
    }
  };

  const handleSelectAdgroup = (
    adgroupId: string | number,
    checked: boolean
  ) => {
    const newSelected = new Set(selectedAdgroups);
    if (checked) {
      newSelected.add(adgroupId);
    } else {
      newSelected.delete(adgroupId);
    }
    setSelectedAdgroups(newSelected);
  };

  // Inline edit handlers - match Amazon pattern (no modal, inline editing)
  const startInlineEdit = (adgroup: GoogleAdGroup, field: "bid" | "status" | "name" | "adgroup_name") => {
    setEditingCell({ adgroupId: adgroup.adgroup_id, field });
    if (field === "bid") {
      setEditedValue((adgroup.cpc_bid_dollars || 0).toString());
    } else if (field === "status") {
      setEditedValue(adgroup.status || "ENABLED");
    } else if (field === "name" || field === "adgroup_name") {
      setEditedValue(adgroup.adgroup_name || adgroup.name || "");
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
    fieldKey?: string
  ) => {
    if (!editingCell || !accountId || isCancelling) return;

    const adgroup = adgroups.find(
      (a) => a.adgroup_id === editingCell.adgroupId
    );
    if (!adgroup) return;

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;
    const field = fieldKey || editingCell.field;
    let hasChanged = false;

    if (editingCell.field === "bid") {
      const newBidStr = valueToCheck.trim();
      const newBid = newBidStr === "" ? 0 : parseFloat(newBidStr);
      const oldBid = adgroup.cpc_bid_dollars || 0;
      if (isNaN(newBid)) {
        cancelInlineEdit();
        return;
      }
      // Use a smaller threshold (0.001) to detect small bid changes like 0.02 to 0.03
      hasChanged = Math.abs(newBid - oldBid) > 0.001;
    } else if (editingCell.field === "status") {
      const oldValue = (adgroup.status || "ENABLED").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
      
      // For status changes, show confirmation modal (match TikTok/Amazon pattern)
      if (hasChanged) {
        // Format status values for display
        const statusDisplayMap: Record<string, string> = {
          ENABLED: "Enabled",
          PAUSED: "Paused",
          Enabled: "Enabled",
          Paused: "Paused",
        };
        const oldValueDisplay = statusDisplayMap[oldValue] || oldValue;
        const newValueDisplay = statusDisplayMap[newValue] || newValue;
        
        setStatusEditData({
          adgroup,
          oldValue: oldValueDisplay,
          newValue: newValueDisplay,
        });
        setShowStatusEditModal(true);
        setEditingCell(null);
        setEditedValue("");
        return;
      }
    } else if (editingCell.field === "name" || editingCell.field === "adgroup_name") {
      const oldValue = (adgroup.adgroup_name || adgroup.name || "").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue && newValue !== "";
    }

    if (!hasChanged) {
      cancelInlineEdit();
      return;
    }

    // For non-status fields, create pending change (inline confirm/cancel buttons)
    setPendingChanges((prev) => ({
      ...prev,
      [field]: {
        itemId: adgroup.adgroup_id,
        newValue: valueToCheck.trim(),
      },
    }));
    setEditingCell(null);
    setEditedValue("");
  };

  // Handler for confirming a pending change (clicking the checkmark)
  const handleConfirmChange = async (itemId: string | number, fieldKey: string, newValue: string) => {
    if (!accountId) return;

    const adgroup = adgroups.find((a) => a.adgroup_id === itemId);
    if (!adgroup) return;

    setUpdatingField({ adgroupId: itemId, field: fieldKey as any });
    
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (fieldKey === "status" || fieldKey === "adgroup_name" || fieldKey === "name") {
        if (fieldKey === "status") {
          const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
            ENABLED: "ENABLED",
            PAUSED: "PAUSED",
            Enabled: "ENABLED",
            Paused: "PAUSED",
          };
          const statusValue = statusMap[newValue] || "ENABLED";
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
            adgroupIds: [itemId],
            action: "status",
            status: statusValue,
          });
        } else if (fieldKey === "adgroup_name" || fieldKey === "name") {
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
            adgroupIds: [itemId],
            action: "name",
            name: newValue,
          });
        }
      } else if (fieldKey === "bid") {
        const bidValue = parseFloat(newValue.replace(/[^0-9.]/g, ""));
        if (isNaN(bidValue)) {
          throw new Error("Invalid bid value");
        }
        await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
          adgroupIds: [itemId],
          action: "bid",
          bid: bidValue,
        });
      }

      // Remove pending change and reload
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
      await loadAdgroups(accountIdNum);
    } catch (error) {
      console.error("Failed to update adgroup:", error);
      alert("Failed to update adgroup. Please try again.");
    } finally {
      setUpdatingField(null);
    }
  };

  // Handler for canceling a pending change (clicking the X)
  const handleCancelChange = (fieldKey: string) => {
    setPendingChanges((prev) => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  // Removed runInlineEdit and handleNameEditSave - replaced by handleConfirmChange

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!accountId || selectedAdgroups.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      // Show loading in modal
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
        adgroupIds: Array.from(selectedAdgroups),
        action: "status",
        status: statusValue,
      });

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Reload adgroups with loading state
      setSorting(true); // Show loading overlay
      await loadAdgroups(accountIdNum);
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update adgroups", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update adgroups. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedAdgroups.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedAdgroupsData = () => {
    return adgroups.filter((adgroup) =>
      selectedAdgroups.has(adgroup.adgroup_id)
    );
  };

  // Calculate new bid value for an adgroup
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

    return Math.max(0, newBid); // Ensure non-negative
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
      // Show loading in modal
      setBulkLoading(true);
      setBulkUpdateResults(null);

      // For each selected adgroup, calculate new bid and update
      const selectedAdgroupsData = getSelectedAdgroupsData();
      const updates = selectedAdgroupsData.map((adgroup) => {
        const currentBid = adgroup.cpc_bid_dollars || 0;
        const newBid = calculateNewBid(currentBid);
        return { adgroupId: adgroup.adgroup_id, newBid };
      });

      // Track results
      let totalUpdated = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      // Update each adgroup individually (bulk update doesn't support increase/decrease)
      for (const update of updates) {
        try {
          const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
            adgroupIds: [update.adgroupId],
            action: "bid",
            bid: update.newBid,
          });
          if (response.updated && response.updated > 0) {
            totalUpdated += response.updated;
          }
          if (response.failed && response.failed > 0) {
            totalFailed += response.failed;
          }
          if (response.errors && response.errors.length > 0) {
            allErrors.push(...response.errors);
          }
        } catch (error: any) {
          totalFailed += 1;
          const errorMessage = error?.response?.data?.error || error?.message || "Failed to update adgroup";
          allErrors.push(`Adgroup ${update.adgroupId}: ${errorMessage}`);
        }
      }

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: totalUpdated,
        failed: totalFailed,
        errors: allErrors,
      });

      // Reload adgroups with loading state
      setSorting(true); // Show loading overlay
      await loadAdgroups(accountIdNum);
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update adgroups", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update adgroups. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedAdgroups.size,
        errors: [errorMessage],
      });
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
        filters: filters, // Pass filters array directly
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      };

      // Add pagination for current view export
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      await googleAdwordsAdGroupsService.exportGoogleAdGroups(
        accountIdNum,
        params,
        exportType
      );
      setShowExportModal(false);
    } catch (error: any) {
      console.error("Failed to export adgroups:", error);
      alert("Failed to export adgroups. Please try again.");
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

  const allSelected =
    adgroups.length > 0 && selectedAdgroups.size === adgroups.length;
  const someSelected =
    selectedAdgroups.size > 0 && selectedAdgroups.size < adgroups.length;

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
                Google Ad Group Manager
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
                    value: f.value,
                  }));
                  setFilters(convertedFilters);
                  setCurrentPage(1);
                  // Removed direct call to loadAdgroupsWithFilters - useEffect will handle it when filters change
                  // This prevents double requests
                  // if (accountId) {
                  //   const accountIdNum = parseInt(accountId, 10);
                  //   if (!isNaN(accountIdNum)) {
                  //     loadAdgroupsWithFilters(accountIdNum, convertedFilters);
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
                  variant="ghost"
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBulkActions((prev) => !prev);
                    setShowBidPanel(false);
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
                        { value: "edit_bid", label: "Default max. CPC" },
                      ].map((opt) => (
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
                                opt.value as "ENABLED" | "PAUSED"
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
                ref={dropdownRef}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="edit-button"
                  onClick={() => setShowExportModal(true)}
                  disabled={exporting || loading || adgroups.length === 0}
                >
                  {exporting ? (
                    <>
                      <div className="flex items-center justify-center">
                        <Loader size="sm" showMessage={false} />
                      </div>
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
              </div>
            </div>

            {/* Google AdGroups Table Card with overlay when panel is open */}
            <div className="relative">

              {/* Bid editor panel */}
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
                            if (action === "set") {
                              setBidUnit("amount");
                            }
                          }}
                          buttonClassName="w-full bg-[#FEFEFB]"
                          width="w-full"
                        />
                      </div>
                      {(bidAction === "increase" ||
                        bidAction === "decrease") && (
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
                          className="cancel-button"
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
                          className="create-entity-button btn-sm"
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
                        <Loader size="md" message="Updating adgroups..." />
                      </div>
                    )}
                    <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                      {bulkUpdateResults
                        ? "Update Results"
                        : isBidChange
                        ? "Confirm Bid Changes"
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
                              ✓ All ad groups updated successfully!
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Confirmation Summary */
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.16px] text-[#556179]">
                            {selectedAdgroups.size} adgroup
                            {selectedAdgroups.size !== 1 ? "s" : ""} will be
                            updated:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {isBidChange ? "Bid" : "Status"} change
                          </span>
                        </div>
                      </div>
                    )}

                    {/* AdGroup Preview Table - Only show before update */}
                    {!bulkUpdateResults && (() => {
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
                                ? `Showing ${previewCount} of ${selectedAdgroupsData.length} selected adgroups`
                                : `${selectedAdgroupsData.length} adgroup${
                                    selectedAdgroupsData.length !== 1 ? "s" : ""
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
                                  .slice(0, 10)
                                  .map((adgroup) => {
                                    const oldBid = adgroup.cpc_bid_dollars || 0;
                                    const oldStatus =
                                      adgroup.status || "ENABLED";
                                    const newBid = isBidChange
                                      ? calculateNewBid(oldBid)
                                      : oldBid;
                                    const newStatus = pendingStatusAction
                                      ? pendingStatusAction
                                      : oldStatus;

                                    return (
                                      <tr
                                        key={adgroup.adgroup_id}
                                        className="border-b border-gray-200 last:border-b-0"
                                      >
                                        <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                          {adgroup.adgroup_name ||
                                            adgroup.name ||
                                            "Unnamed Ad Group"}
                                        </td>
                                        <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                          {isBidChange
                                            ? `$${oldBid.toFixed(2)}`
                                            : oldStatus}
                                        </td>
                                        <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                          {isBidChange
                                            ? `$${newBid.toFixed(2)}`
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
                            setShowBidPanel(false);
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
                            className="cancel-button"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (isBidChange) {
                                await runBulkBid();
                              } else if (pendingStatusAction) {
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

              {/* Export Modal */}
              {showExportModal && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowExportModal(false);
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                    <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                      Export Ad Groups
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
                          ? `Exporting ${adgroups.length} adgroup${
                              adgroups.length !== 1 ? "s" : ""
                            } from the current page (${total} total available)`
                          : `Exporting all ${total} adgroup${
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
                        className="cancel-button disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <Loader size="sm" variant="white" showMessage={false} className="!flex-row" />
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

              {/* Status Edit Confirmation Modal - Match TikTok/Amazon pattern */}
              {showStatusEditModal && statusEditData && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !statusEditLoading) {
                      setShowStatusEditModal(false);
                      setStatusEditData(null);
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                    <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                      Confirm Status Change
                    </h3>
                    <div className="mb-4">
                      <p className="text-[12.8px] text-[#556179] mb-2">
                        Ad Group:{" "}
                        <span className="font-semibold text-[#072929]">
                          {statusEditData.adgroup.adgroup_name ||
                            statusEditData.adgroup.name ||
                            "Unnamed Ad Group"}
                        </span>
                      </p>
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[12.8px] text-[#556179]">
                            Status:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12.8px] text-[#556179]">
                              {statusEditData.oldValue}
                            </span>
                            <span className="text-[12.8px] text-[#556179]">
                              →
                            </span>
                            <span className="text-[12.8px] font-semibold text-[#072929]">
                              {statusEditData.newValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!statusEditLoading) {
                            setShowStatusEditModal(false);
                            setStatusEditData(null);
                          }
                        }}
                        disabled={statusEditLoading}
                        className="cancel-button disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!statusEditData || !accountId || statusEditLoading) return;
                          
                          setStatusEditLoading(true);
                          try {
                            const accountIdNum = parseInt(accountId, 10);
                            if (isNaN(accountIdNum)) {
                              throw new Error("Invalid account ID");
                            }

                            // Map status values: Google API uses "ENABLED" | "PAUSED" (uppercase)
                            const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
                              ENABLED: "ENABLED",
                              PAUSED: "PAUSED",
                              Enabled: "ENABLED",
                              Paused: "PAUSED",
                            };
                            const statusValue = statusMap[statusEditData.newValue] || "ENABLED";

                            const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
                              adgroupIds: [statusEditData.adgroup.adgroup_id],
                              action: "status",
                              status: statusValue,
                            });

                            if (response.errors && response.errors.length > 0) {
                              throw new Error(response.errors[0]);
                            }

                            await loadAdgroups(accountIdNum);
                            setShowStatusEditModal(false);
                            setStatusEditData(null);
                          } catch (error) {
                            console.error("Failed to update adgroup status:", error);
                            alert("Failed to update adgroup status. Please try again.");
                          } finally {
                            setStatusEditLoading(false);
                          }
                        }}
                        disabled={statusEditLoading}
                        className="create-entity-button btn-sm"
                      >
                        {statusEditLoading ? "Updating..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Name Edit Modal - Rendered via Portal to avoid z-index issues with sticky columns */}
              {showNameEditModal && nameEditAdgroup && typeof document !== 'undefined' && createPortal(
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center"
                  style={{ zIndex: 99999 }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !nameEditLoading) {
                      setShowNameEditModal(false);
                      setNameEditAdgroup(null);
                      setNameEditValue("");
                    }
                  }}
                >
                  <div 
                    className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
                    style={{ zIndex: 100000 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                      Ad group
                    </h3>
                    <div className="mb-6">
                      <input
                        type="text"
                        value={nameEditValue}
                        onChange={(e) => setNameEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !nameEditLoading) {
                            handleNameEditSave();
                          } else if (e.key === "Escape" && !nameEditLoading) {
                            setShowNameEditModal(false);
                            setNameEditAdgroup(null);
                            setNameEditValue("");
                          }
                        }}
                        disabled={nameEditLoading}
                        autoFocus
                        className="w-full px-4 py-2.5 text-[13.3px] text-black border-2 border-[#136D6D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter ad group name"
                        maxLength={255}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!nameEditLoading) {
                            setShowNameEditModal(false);
                            setNameEditAdgroup(null);
                            setNameEditValue("");
                          }
                        }}
                        disabled={nameEditLoading}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleNameEditSave}
                        disabled={nameEditLoading || !nameEditValue.trim()}
                        className="create-entity-button btn-sm"
                      >
                        {nameEditLoading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}

              {/* Table */}
              <div className="table-container">
                <div className="overflow-x-auto w-full">
                  <GoogleAdGroupsTable
                    adgroups={adgroups}
                    loading={loading}
                    sorting={sorting}
                    accountId={accountId || ""}
                    selectedAdgroups={selectedAdgroups}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    editingCell={editingCell}
                    editedValue={editedValue}
                    isCancelling={isCancelling}
                    updatingField={updatingField}
                    summary={summary}
                    onSelectAll={handleSelectAll}
                    onSelectAdgroup={handleSelectAdgroup}
                    onSort={handleSort}
                    onStartInlineEdit={startInlineEdit}
                    onCancelInlineEdit={cancelInlineEdit}
                    onInlineEditChange={handleInlineEditChange}
                    onConfirmInlineEdit={confirmInlineEdit}
                    pendingChanges={pendingChanges}
                    onConfirmChange={handleConfirmChange}
                    onCancelChange={handleCancelChange}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusBadge={getStatusBadge}
                    getSortIcon={getSortIcon}
                  />
                </div>
              </div>

              {/* Pagination - Match Amazon style exactly */}
              {!loading && adgroups.length > 0 && totalPages > 1 && (
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
