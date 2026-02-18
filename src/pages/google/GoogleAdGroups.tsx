import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Assistant } from "../../components/layout/Assistant";
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
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import { useGoogleSyncStatus } from "../../hooks/useGoogleSyncStatus";
import { useChartCollapse } from "../../hooks/useChartCollapse";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import {
  GoogleAdGroupsTable,
  type GoogleAdGroup,
} from "./components/GoogleAdGroupsTable";
import { Loader } from "../../components/ui/Loader";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { ErrorModal } from "../../components/ui/ErrorModal";
import { TrashIcon } from "lucide-react";
import {
  getStatusWithDefault,
  formatStatusForDisplay,
  convertStatusToApi,
  formatCurrency as formatCurrencyUtil,
} from "./utils/googleAdsUtils";
import { useGoogleProfiles } from "../../hooks/queries/useGoogleProfiles";

// GoogleAdGroup interface is now imported from GoogleAdGroupsTable

export const GoogleAdGroups: React.FC = () => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
  const { data: profilesData } = useGoogleProfiles(channelIdNum);
  const currencyCode = useMemo(() => {
    const profiles = profilesData?.profiles || [];
    const selected = profiles.find((p) => p.is_selected);
    return selected?.currency_code || undefined;
  }, [profilesData?.profiles]);
  const formatCurrency = useCallback(
    (value: number) => formatCurrencyUtil(value, currencyCode),
    [currencyCode]
  );
  const [adgroups, setAdgroups] = useState<GoogleAdGroup[]>([]);
  const [summary, setSummary] = useState<{
    total_adgroups: number;
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
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('google_adgroups_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [totalPages, setTotalPages] = useState(0);
  const [, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [publishAdgroup, setPublishAdgroup] = useState<GoogleAdGroup | null>(null);
  const [publishLoadingId, setPublishLoadingId] = useState<string | number | undefined>(undefined);
  const [publishError, setPublishError] = useState<{ title: string; message: string } | null>(null);
  const isLoadingRef = useRef(false);
  const lastRequestParamsRef = useRef<string>(""); // Track last request to prevent duplicate calls

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
    "google-adgroups-chart-collapsed"
  );

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
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [pendingRemoveChange, setPendingRemoveChange] = useState<{
    value: string;
    adgroupId: string | number;
    field: string;
  } | null>(null);
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
  const isCancellingRef = useRef(false);
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditAdGroup, setInlineEditAdGroup] = useState<GoogleAdGroup | null>(null);
  const [inlineEditField, setInlineEditField] = useState<"bid" | "status" | "name" | "adgroup_name" | null>(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [updatingField, setUpdatingField] = useState<{
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
    newValue?: string;
  } | null>(null);
  const [inlineEditSuccess, setInlineEditSuccess] = useState<{
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
  } | null>(null);
  const [inlineEditError, setInlineEditError] = useState<{
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
    message: string;
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
  // Name edit modal
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [nameEditAdgroup, setNameEditAdgroup] = useState<GoogleAdGroup | null>(null);
  const [nameEditValue, setNameEditValue] = useState<string>("");
  const [nameEditLoading, setNameEditLoading] = useState(false);
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

  const loadAdgroups = useCallback(async (accountId: number, channelId: number) => {
    // Validate channelId before making API call
    if (!channelId || isNaN(channelId)) {
      throw new Error(`Invalid channelId: ${channelId}. channelId must be a valid number.`);
    }

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
        draft_only: showDraftsOnly,
      };

      const response = await googleAdwordsAdGroupsService.getGoogleAdGroups(
        accountId,
        channelId,
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
        // Map IGoogleCampaignsSummary to adgroups summary format
        setSummary({
          ...response.summary,
          total_adgroups: response.summary.total_campaigns || 0,
        } as any);
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
  }, [filters, sortBy, sortOrder, currentPage, itemsPerPage, startDate?.toISOString(), endDate?.toISOString(), accountId, showDraftsOnly]);

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
          showDraftsOnly,
        });

        // Only call loadAdgroups if the request parameters have actually changed
        if (lastRequestParamsRef.current !== requestKey) {
          lastRequestParamsRef.current = requestKey;
          const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
          if (channelIdNum && !isNaN(channelIdNum)) {
            loadAdgroups(accountIdNum, channelIdNum);
          }
        }
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, currentPage, itemsPerPage, filters, startDate?.toISOString(), endDate?.toISOString(), sorting, showDraftsOnly]);


  // Wrapper function for useGoogleSyncStatus hook (it expects only accountId)
  const loadAdgroupsWrapper = useCallback(async (accountId: number) => {
    const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
    if (channelIdNum && !isNaN(channelIdNum)) {
      await loadAdgroups(accountId, channelIdNum);
    }
  }, [channelId, loadAdgroups]);

  // Sync status hook (after loadAdgroups is defined)
  const { SyncStatusBanner } = useGoogleSyncStatus({
    accountId,
    entityType: "adgroups",
    currentData: adgroups,
    loadFunction: loadAdgroupsWrapper,
  });



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
              ? startDateStr
              : undefined,
            end_date: endDate ? endDateStr : undefined,
            filters: filters, // Pass filters array directly
            draft_only: showDraftsOnly,
          };

          const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
          if (!channelIdNum || isNaN(channelIdNum)) {
            throw new Error("Channel ID is required");
          }
          const response = await googleAdwordsAdGroupsService.getGoogleAdGroups(
            accountIdNum,
            channelIdNum,
            undefined,
            params
          );
          setAdgroups(
            Array.isArray(response.adgroups) ? response.adgroups : []
          );
          setTotalPages(response.total_pages || 0);
          setTotal(response.total || 0);
          if (response.summary) {
            // Map IGoogleCampaignsSummary to adgroups summary format
            setSummary({
              ...response.summary,
              total_adgroups: response.summary.total_campaigns || 0,
            } as any);
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

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
    localStorage.setItem('google_adgroups_page_size', newPageSize.toString());
    // Clear the request params ref to force a reload in useEffect
    lastRequestParamsRef.current = "";
  }, []);

  // Draft detection: DB-only updates for drafts; publish only when user clicks publish
  const isDraftAdGroup = (row: GoogleAdGroup) => {
    const s = (row.status || "").toUpperCase();
    return s === "SAVED_DRAFT" || s === "DRAFT" || String(row.adgroup_id ?? row.id).startsWith("draft-");
  };

  // Inline edit handlers - match Amazon pattern (no modal, inline editing)
  const startInlineEdit = (adgroup: GoogleAdGroup, field: "bid" | "status" | "name" | "adgroup_name") => {
    setEditingCell({ adgroupId: adgroup.adgroup_id, field });
    if (field === "bid") {
      setEditedValue((adgroup.cpc_bid_dollars || 0).toString());
    } else if (field === "status") {
      setEditedValue(getStatusWithDefault(adgroup.status));
    } else if (field === "name" || field === "adgroup_name") {
      setEditedValue(adgroup.adgroup_name || adgroup.name || "");
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
    fieldKey?: string,
    adgroupIdParam?: string | number
  ) => {
    // If adgroupIdParam and fieldKey are provided, show modal for confirmation
    if (adgroupIdParam && fieldKey && (fieldKey === "bid" || fieldKey === "adgroup_name" || fieldKey === "status" || fieldKey === "name")) {
      const adgroup = adgroups.find((a) => a.adgroup_id === adgroupIdParam);
      if (!adgroup) return;

      const valueToCheck = newValueOverride !== undefined ? newValueOverride : editedValue;
      let oldValue = "";
      let newValue = valueToCheck.trim();

      if (fieldKey === "bid") {
        const newBid = parseFloat(valueToCheck) || 0;
        const oldBid = adgroup.cpc_bid_dollars || 0;
        oldValue = formatCurrency(oldBid);
        newValue = formatCurrency(newBid);
      } else if (fieldKey === "status") {
        oldValue = formatStatusForDisplay(adgroup.status);
        const newStatusRaw = valueToCheck.trim();
        newValue = formatStatusForDisplay(newStatusRaw);

        // Check if status is being changed to REMOVED - show confirmation modal
        if (newStatusRaw.toUpperCase() === "REMOVED") {
          // Close the dropdown immediately when modal appears
          cancelInlineEdit();
          setPendingRemoveChange({ value: "REMOVED", adgroupId: adgroupIdParam!, field: fieldKey });
          setShowRemoveConfirmation(true);
          return;
        }
      } else if (fieldKey === "name" || fieldKey === "adgroup_name") {
        oldValue = adgroup.adgroup_name || adgroup.name || "";
        newValue = valueToCheck.trim();
      }

      setInlineEditAdGroup(adgroup);
      setInlineEditField(fieldKey === "adgroup_name" ? "name" : fieldKey);
      setInlineEditOldValue(oldValue);
      setInlineEditNewValue(newValue);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    if (!editingCell || !accountId || isCancellingRef.current) return;

    const adgroup = adgroups.find(
      (a) => a.adgroup_id === editingCell.adgroupId
    );
    if (!adgroup) return;

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;
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
      const oldValue = getStatusWithDefault(adgroup.status).trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;

      // For status changes, show modal
      if (hasChanged) {
        // Check if status is being changed to REMOVED - show confirmation modal
        if (newValue.toUpperCase() === "REMOVED") {
          // Close the dropdown immediately when modal appears
          cancelInlineEdit();
          setPendingRemoveChange({ value: "REMOVED", adgroupId: editingCell.adgroupId, field: "status" });
          setShowRemoveConfirmation(true);
          return;
        }

        // Format status values for display
        const oldValueDisplay = formatStatusForDisplay(oldValue);
        const newValueDisplay = formatStatusForDisplay(newValue);

        setInlineEditAdGroup(adgroup);
        setInlineEditField("status");
        setInlineEditOldValue(oldValueDisplay);
        setInlineEditNewValue(newValueDisplay);
        setShowInlineEditModal(true);
        setEditingCell(null);
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

    // For bid and name fields, show modal
    if (editingCell.field === "bid") {
      const newBid = parseFloat(valueToCheck) || 0;
      const oldBid = adgroup.cpc_bid_dollars || 0;

      setInlineEditAdGroup(adgroup);
      setInlineEditField("bid");
      setInlineEditOldValue(formatCurrency(oldBid));
      setInlineEditNewValue(formatCurrency(newBid));
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    } else if (editingCell.field === "name" || editingCell.field === "adgroup_name") {
      const oldValue = (adgroup.adgroup_name || adgroup.name || "").trim();
      const newValue = valueToCheck.trim();

      setInlineEditAdGroup(adgroup);
      setInlineEditField("name");
      setInlineEditOldValue(oldValue);
      setInlineEditNewValue(newValue);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
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
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
        adgroupIds: [pendingRemoveChange.adgroupId],
        action: "status",
        status: statusValue,
      });

      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadAdgroups(accountIdNum, channelIdNum);
      }

      setShowRemoveConfirmation(false);
      setPendingRemoveChange(null);

      // Clear any previous errors
      setInlineEditError(null);

      // Show success feedback
      setInlineEditSuccess({
        adgroupId: pendingRemoveChange.adgroupId,
        field: "status",
      });
    } catch (error: any) {
      console.error("Failed to remove adgroup:", error);

      // Clear any previous success
      setInlineEditSuccess(null);

      // Set error state for inline feedback
      let errorMessage = "Failed to remove adgroup. Please try again.";

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
          errorMessage = error.response.data.errors[0].replace(/^AdGroup\s+\d+:\s*/i, "");
        }
      }

      setInlineEditError({
        adgroupId: pendingRemoveChange.adgroupId,
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

  // Publish draft ad group (global table): show confirmation then call create endpoint
  const handlePublishDraftClick = (row: GoogleAdGroup) => setPublishAdgroup(row);
  const handleCancelPublishDraft = () => setPublishAdgroup(null);
  const handleConfirmPublishDraft = async () => {
    const row = publishAdgroup;
    if (!row || !accountId || !channelId) return;
    const campaignId = row.campaign_id;
    const draftId = String(row.adgroup_id ?? row.id);
    if (!campaignId) return;
    setPublishLoadingId(draftId);
    setPublishError(null);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
      await googleAdwordsCampaignsService.publishGoogleSearchEntitiesDraft(
        accountIdNum,
        channelIdNum,
        campaignId,
        draftId
      );
      setPublishAdgroup(null);
      setPublishLoadingId(undefined);
      await loadAdgroups(accountIdNum, channelIdNum);
    } catch (err: any) {
      console.error("Failed to publish draft ad group:", err);
      setPublishLoadingId(undefined);
      setPublishAdgroup(null);
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to publish draft ad group. Please try again.";
      setPublishError({ title: "Publish failed", message });
    }
  };

  // Run inline edit from modal confirmation (draft → DB-only update; published → bulk update to Google)
  const runInlineEdit = async () => {
    if (!inlineEditAdGroup || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const draftId = String(inlineEditAdGroup.adgroup_id ?? inlineEditAdGroup.id);
      const isDraft = isDraftAdGroup(inlineEditAdGroup);

      if (isDraft && draftId.startsWith("draft-")) {
        // Draft: update DB only (no publish to Google)
        const adgroupPayload: { name?: string; cpc_bid?: number; status?: string } = {};
        if (inlineEditField === "bid") {
          const bidValue = parseFloat(inlineEditNewValue.replace(/[^0-9.]/g, ""));
          if (isNaN(bidValue) || bidValue <= 0) throw new Error("Invalid bid value");
          adgroupPayload.cpc_bid = bidValue;
        } else if (inlineEditField === "status") {
          adgroupPayload.status = convertStatusToApi(inlineEditNewValue);
        } else if (inlineEditField === "name") {
          const trimmedName = inlineEditNewValue.trim();
          if (!trimmedName) throw new Error("Ad group name cannot be empty");
          adgroupPayload.name = trimmedName;
        }
        await googleAdwordsAdGroupsService.updateDraftAdgroup(accountIdNum, channelIdNum, {
          draft_id: draftId,
          adgroup: adgroupPayload,
        });
      } else {
        // Published: use bulk update (sends to Google)
        if (inlineEditField === "bid") {
          const bidValue = parseFloat(inlineEditNewValue.replace(/[^0-9.]/g, ""));
          if (isNaN(bidValue) || bidValue <= 0) throw new Error("Invalid bid value");
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
            adgroupIds: [inlineEditAdGroup.adgroup_id],
            action: "bid",
            bid: bidValue,
          });
        } else if (inlineEditField === "status") {
          const statusValue = convertStatusToApi(inlineEditNewValue);
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
            adgroupIds: [inlineEditAdGroup.adgroup_id],
            action: "status",
            status: statusValue,
          });
        } else if (inlineEditField === "name") {
          const trimmedName = inlineEditNewValue.trim();
          if (!trimmedName) throw new Error("Ad group name cannot be empty");
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
            adgroupIds: [inlineEditAdGroup.adgroup_id],
            action: "name",
            name: trimmedName,
          });
        }
      }

      // Update list in place so order is preserved
      const agId = inlineEditAdGroup.adgroup_id;
      setAdgroups((prev) =>
        prev.map((ag) => {
          if (ag.adgroup_id !== agId) return ag;
          if (inlineEditField === "status") return { ...ag, status: convertStatusToApi(inlineEditNewValue) };
          if (inlineEditField === "name") return { ...ag, adgroup_name: inlineEditNewValue.trim(), name: inlineEditNewValue.trim() };
          if (inlineEditField === "bid") {
            const bidNum = parseFloat(inlineEditNewValue.replace(/[^0-9.]/g, ""));
            return { ...ag, cpc_bid_dollars: isNaN(bidNum) ? ag.cpc_bid_dollars : bidNum };
          }
          return ag;
        })
      );

      setShowInlineEditModal(false);
      setInlineEditAdGroup(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");

      // Clear any previous errors
      setInlineEditError(null);

      // Show success feedback
      setInlineEditSuccess({
        adgroupId: inlineEditAdGroup.adgroup_id,
        field: inlineEditField,
      });
      // Clear success feedback after 3 seconds
    } catch (error: any) {
      console.error("Failed to update adgroup:", error);

      // Clear any previous success
      setInlineEditSuccess(null);

      // Set error state for inline feedback
      let errorMessage = "Failed to update adgroup. Please try again.";

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
          errorMessage = error.response.data.errors[0].replace(/^AdGroup\s+\d+:\s*/i, "");
        }
      }

      setInlineEditError({
        adgroupId: inlineEditAdGroup.adgroup_id,
        field: inlineEditField,
        message: errorMessage,
      });
    } finally {
      setInlineEditLoading(false);
    }
  };


  // Handler for confirming a pending change (clicking the checkmark). Draft → DB-only; published → Google API.
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
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const draftId = String(adgroup.adgroup_id ?? adgroup.id);
      const isDraft = isDraftAdGroup(adgroup);

      if (isDraft && draftId.startsWith("draft-")) {
        const adgroupPayload: { name?: string; cpc_bid?: number; status?: string } = {};
        if (fieldKey === "status") {
          adgroupPayload.status = convertStatusToApi(newValue);
        } else if (fieldKey === "adgroup_name" || fieldKey === "name") {
          adgroupPayload.name = newValue.trim();
        } else if (fieldKey === "bid") {
          const bidValue = parseFloat(newValue.replace(/[^0-9.]/g, ""));
          if (isNaN(bidValue)) throw new Error("Invalid bid value");
          adgroupPayload.cpc_bid = bidValue;
        }
        await googleAdwordsAdGroupsService.updateDraftAdgroup(accountIdNum, channelIdNum, {
          draft_id: draftId,
          adgroup: adgroupPayload,
        });
      } else {
        if (fieldKey === "status") {
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
            adgroupIds: [itemId],
            action: "status",
            status: convertStatusToApi(newValue),
          });
        } else if (fieldKey === "adgroup_name" || fieldKey === "name") {
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
            adgroupIds: [itemId],
            action: "name",
            name: newValue,
          });
        } else if (fieldKey === "bid") {
          const bidValue = parseFloat(newValue.replace(/[^0-9.]/g, ""));
          if (isNaN(bidValue)) throw new Error("Invalid bid value");
          await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
            adgroupIds: [itemId],
            action: "bid",
            bid: bidValue,
          });
        }
      }

      // Remove pending change and update list in place so order is preserved
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
      setAdgroups((prev) =>
        prev.map((ag) => {
          if (ag.adgroup_id !== itemId) return ag;
          if (fieldKey === "status") return { ...ag, status: convertStatusToApi(newValue) };
          if (fieldKey === "adgroup_name" || fieldKey === "name") return { ...ag, adgroup_name: newValue.trim(), name: newValue.trim() };
          if (fieldKey === "bid") {
            const bidNum = parseFloat(newValue.replace(/[^0-9.]/g, ""));
            return { ...ag, cpc_bid_dollars: isNaN(bidNum) ? ag.cpc_bid_dollars : bidNum };
          }
          return ag;
        })
      );
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

  // Handler for saving name edit from modal
  const handleNameEditSave = async () => {
    if (!nameEditAdgroup || !nameEditValue.trim() || nameEditLoading || !accountId) return;

    setNameEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      await handleConfirmChange(nameEditAdgroup.adgroup_id, "adgroup_name", nameEditValue.trim());

      // Close modal and reset state
      setShowNameEditModal(false);
      setNameEditAdgroup(null);
      setNameEditValue("");
    } catch (error) {
      console.error("Failed to update adgroup name:", error);
      alert("Failed to update adgroup name. Please try again.");
    } finally {
      setNameEditLoading(false);
    }
  };


  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!accountId || selectedAdgroups.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      // Show loading in modal
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
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
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadAdgroups(accountIdNum, channelIdNum);
      }
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

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      // Update each adgroup individually (bulk update doesn't support increase/decrease)
      for (const update of updates) {
        try {
          const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
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
      if (channelIdNum && !isNaN(channelIdNum)) {
        await loadAdgroups(accountIdNum, channelIdNum);
      }
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

  const handleExport = async (exportType: "all_data" | "current_view" | "selected") => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    // Validate selected adgroups for selected export
    if (exportType === "selected" && selectedAdgroups.size === 0) {
      alert("Please select at least one ad group to export.");
      return;
    }

    // Keep dropdown open and show loading
    setShowExportDropdown(true);
    setExportLoading(true);
    try {
      const params: any = {
        filters: filters, // Pass filters array directly
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate
          ? startDateStr
          : undefined,
        end_date: endDate ? endDateStr : undefined,
      };

      // Add pagination for current view export
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = itemsPerPage;
      }

      // Add adgroup IDs for selected export
      if (exportType === "selected") {
        params.adgroup_ids = Array.from(selectedAdgroups);
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      await googleAdwordsAdGroupsService.exportGoogleAdGroups(
        accountIdNum,
        channelIdNum,
        params,
        exportType
      );
      // Close dropdown after a short delay to show success
      setTimeout(() => {
        setShowExportDropdown(false);
      }, 500);
    } catch (error: any) {
      console.error("Failed to export adgroups:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export adgroups. Please try again.";
      alert(errorMessage);
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const statusLabel = formatStatusForDisplay(status) || "Paused";
    return <StatusBadge status={statusLabel} />;
  };

  const allSelected =
    adgroups.length > 0 && selectedAdgroups.size === adgroups.length;
  const someSelected =
    selectedAdgroups.size > 0 && selectedAdgroups.size < adgroups.length;

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
      disabled: selectedAdgroups.size === 0,
    },
  ], [selectedAdgroups.size]);

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
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 min-w-0 w-full h-screen flex flex-col"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <DashboardHeader />

        <Assistant>
          {/* Main Content Area - Add top padding for fixed header */}
          <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
            <div className="space-y-6">
              {/* Header with Filter Button + Sync */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  AdGroups
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
                  }}
                  initialFilters={filters.map((f) => ({
                    id: f.id,
                    field: f.field as string,
                    operator: f.operator,
                    value: f.value,
                  }))}
                  accountId={accountId}
                  marketplace="google_adwords"
                  entityType="adgroups"
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

              {/* Draft switch, Bulk Actions, Export - Above Table (full width row) */}
              <div className="flex flex-col w-full gap-4">
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showDraftsOnly}
                    onClick={() => {
                      setShowDraftsOnly((prev) => !prev);
                      setCurrentPage(1);
                    }}
                    className={`relative inline-flex items-center h-6 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#072929] focus:ring-offset-2 overflow-hidden ${
                      showDraftsOnly ? "bg-forest-f40" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-[10.64px] font-medium whitespace-nowrap transition-all duration-200 ${
                        showDraftsOnly
                          ? "left-2 right-auto text-white"
                          : "left-auto right-2 text-[#556179]"
                      }`}
                    >
                      Draft
                    </span>
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-5 h-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                        showDraftsOnly ? "translate-x-10" : "translate-x-0"
                      }`}
                    />
                  </button>
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
                      Bulk Actions
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
                        setShowBidPanel(false);
                      }}
                      disabled={
                        exportLoading || loading || adgroups.length === 0
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
              </div>
              </div>

              {/* Google AdGroups Table Card with overlay when panel is open */}
              <div className="relative w-full">

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
                            buttonClassName="w-full bg-[#FEFEFB] edit-button"
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
                                  className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "percent"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                    }`}
                                  onClick={() => setBidUnit("percent")}
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "amount"
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
                                  : `${selectedAdgroupsData.length} adgroup${selectedAdgroupsData.length !== 1 ? "s" : ""
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
                                        getStatusWithDefault(adgroup.status);
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
                          className="cancel-button"
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
                              const statusValue = convertStatusToApi(statusEditData.newValue);

                              const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
                              if (!channelIdNum || isNaN(channelIdNum)) {
                                throw new Error("Channel ID is required");
                              }

                              const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, channelIdNum, {
                                adgroupIds: [statusEditData.adgroup.adgroup_id],
                                action: "status",
                                status: statusValue,
                              });

                              if (response.errors && response.errors.length > 0) {
                                throw new Error(response.errors[0]);
                              }

                              await loadAdgroups(accountIdNum, channelIdNum);
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

                {/* Inline Edit Confirmation Modal */}
                {showInlineEditModal && inlineEditAdGroup && inlineEditField && (
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
                        {inlineEditField === "bid"
                          ? "Bid"
                          : inlineEditField === "status"
                            ? "Status"
                            : "Name"}{" "}
                        Change
                      </h3>
                      <div className="mb-4">
                        <p className="text-[12.16px] text-[#556179] mb-2">
                          Ad Group:{" "}
                          <span className="font-semibold text-[#072929]">
                            {inlineEditAdGroup.adgroup_name ||
                              inlineEditAdGroup.name ||
                              "Unnamed Ad Group"}
                          </span>
                        </p>
                        <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[12.16px] text-[#556179]">
                              {inlineEditField === "bid"
                                ? "Bid"
                                : inlineEditField === "status"
                                  ? "Status"
                                  : "Name"}
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
                            setInlineEditAdGroup(null);
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
                    <GoogleAdGroupsTable
                      adgroups={adgroups}
                      loading={loading}
                      sorting={sorting}
                      accountId={accountId || ""}
                      channelId={channelId}
                      selectedAdgroups={selectedAdgroups}
                      allSelected={allSelected}
                      someSelected={someSelected}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      editingCell={editingCell}
                      editedValue={editedValue}
                      isCancelling={isCancellingRef.current}
                      updatingField={updatingField}
                      inlineEditSuccess={inlineEditSuccess}
                      inlineEditError={inlineEditError}
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
                      currencyCode={currencyCode}
                      onPublishDraft={handlePublishDraftClick}
                      publishLoadingId={publishLoadingId}
                      draftFilterOn={showDraftsOnly}
                    />
                  </div>
                  {loading && (
                    <div className="loading-overlay">
                      <div className="loading-overlay-content">
                        <Loader size="md" message="Loading adgroups..." />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination - Match Amazon style exactly */}
                {!loading && adgroups.length > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-end mt-4 w-full">
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
                  </div>
                )}
              </div>

              </div>
            </div>
          </div>
        </Assistant>
      </div>
      <ConfirmationModal
        isOpen={showRemoveConfirmation}
        onClose={handleCancelRemove}
        onConfirm={handleConfirmRemove}
        title="Are you sure you want to remove this ad group?"
        message="This action cannot be undone. All data associated with this ad group will be permanently removed."
        type="danger"
        size="sm"
        isLoading={inlineEditLoading}
        icon={<TrashIcon className="w-6 h-6 text-red-600" />}
      />
      <ConfirmationModal
        isOpen={publishAdgroup !== null}
        onClose={handleCancelPublishDraft}
        onConfirm={handleConfirmPublishDraft}
        title="Publish draft ad group"
        message={publishAdgroup ? `Ad group "${publishAdgroup.adgroup_name || publishAdgroup.name || "Unnamed"}" will be created in Google Ads and the draft row will be removed.` : ""}
        type="info"
        size="sm"
        isLoading={publishLoadingId !== undefined}
        confirmButtonLabel="Publish"
      />
      <ErrorModal
        isOpen={publishError !== null}
        onClose={() => setPublishError(null)}
        title={publishError?.title ?? "Publish failed"}
        message={publishError?.message ?? ""}
      />
    </div>
  );
};
