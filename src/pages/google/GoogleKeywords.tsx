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
import { googleAdwordsKeywordsService } from "../../services/googleAdwords/googleAdwordsKeywords";
import { useGoogleSyncStatus } from "../../hooks/useGoogleSyncStatus";
import { useChartCollapse } from "../../hooks/useChartCollapse";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import {
  GoogleKeywordsTable,
  type GoogleKeyword,
} from "./components/GoogleKeywordsTable";
import { ErrorModal } from "../../components/ui/ErrorModal";
import { Loader } from "../../components/ui/Loader";

export const GoogleKeywords: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [keywords, setKeywords] = useState<GoogleKeyword[]>([]);
  const [summary, setSummary] = useState<{
    total_keywords: number;
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
    "google-keywords-chart-collapsed"
  );

  // Selection and bulk actions
  const [selectedKeywords, setSelectedKeywords] = useState<
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

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    keywordId: string | number;
    field: "bid" | "status" | "match_type" | "keyword_text";
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [updatingField] = useState<{
    keywordId: string | number;
    field: "bid" | "status" | "match_type";
  } | null>(null);
  const [inlineEditKeyword, setInlineEditKeyword] =
    useState<GoogleKeyword | null>(null);
  const [inlineEditField, setInlineEditField] = useState<
    "bid" | "status" | "match_type" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  
  // Keyword text edit modal state
  const [showKeywordTextEditModal, setShowKeywordTextEditModal] = useState(false);
  const [keywordTextEditKeyword, setKeywordTextEditKeyword] = useState<GoogleKeyword | null>(null);
  const [keywordTextEditValue, setKeywordTextEditValue] = useState<string>("");
  const [keywordTextEditLoading, setKeywordTextEditLoading] = useState(false);
  
  // Final URL edit modal state
  const [showFinalUrlModal, setShowFinalUrlModal] = useState(false);
  const [finalUrlKeyword, setFinalUrlKeyword] = useState<GoogleKeyword | null>(null);
  const [finalUrlValue, setFinalUrlValue] = useState<string>("");
  const [mobileFinalUrlValue, setMobileFinalUrlValue] = useState<string>("");
  const [useMobileFinalUrl, setUseMobileFinalUrl] = useState(false);
  const [finalUrlEditLoading, setFinalUrlEditLoading] = useState(false);
  
  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "Error",
    message: "",
  });

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
    setPageTitle("Google Keywords");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Removed buildFilterParams - now passing filters array directly to service

  const loadKeywords = useCallback(async (accountId: number) => {
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
        filters: filters, // Pass filters array directly
      };

      const response = await googleAdwordsKeywordsService.getGoogleKeywords(
        accountId,
        undefined,
        undefined,
        params
      );
      const keywordsArray = Array.isArray(response.keywords)
        ? response.keywords
        : [];
      
      // Debug: Log first keyword to check final URLs
      if (keywordsArray.length > 0 && import.meta.env.DEV) {
        console.log('First keyword from API:', {
          keyword_id: keywordsArray[0].keyword_id,
          keyword_text: keywordsArray[0].keyword_text,
          final_urls: keywordsArray[0].final_urls,
          final_mobile_urls: keywordsArray[0].final_mobile_urls,
          all_keys: Object.keys(keywordsArray[0]),
        });
      }
      
      setKeywords(keywordsArray);
      setTotalPages(response.total_pages || 0);
      setTotal(response.total || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      const responseWithChart = response as any;
      if (
        responseWithChart.chart_data &&
        Array.isArray(responseWithChart.chart_data)
      ) {
        setChartDataFromApi(responseWithChart.chart_data);
      } else {
        setChartDataFromApi([]);
      }
      setSelectedKeywords(new Set());
    } catch (error) {
      console.error("Failed to load Google keywords:", error);
      setKeywords([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [sortBy, sortOrder, currentPage, itemsPerPage, startDate?.toISOString(), endDate?.toISOString(), filters]);

  useEffect(() => {
    if (sorting) return;

    if (accountId) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadKeywords(accountIdNum);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [accountId, currentPage, filters, startDate?.toISOString(), endDate?.toISOString(), loadKeywords, sorting]);

  const loadKeywordsWithFilters = async (
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
        filters: filterList, // Pass filters array directly
      };

      const response = await googleAdwordsKeywordsService.getGoogleKeywords(
        accountId,
        undefined,
        undefined,
        params
      );
      setKeywords(Array.isArray(response.keywords) ? response.keywords : []);
      setTotalPages(response.total_pages || 0);
      setTotal(response.total || 0);
      if (response.summary) {
        setSummary(response.summary);
      }
      const responseWithChart = response as any;
      if (
        responseWithChart.chart_data &&
        Array.isArray(responseWithChart.chart_data)
      ) {
        setChartDataFromApi(responseWithChart.chart_data);
      } else {
        setChartDataFromApi([]);
      }
      setSelectedKeywords(new Set());
    } catch (error) {
      console.error("Failed to load Google keywords:", error);
      setKeywords([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Sync status hook (after loadKeywords is defined)
  const { SyncStatusBanner, checkSyncStatus } = useGoogleSyncStatus({
    accountId,
    entityType: "keywords",
    currentData: keywords,
    loadFunction: loadKeywords,
  });

  const handleSync = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncing(true);
      setSyncMessage(null);
      const result = await googleAdwordsKeywordsService.syncGoogleKeywords(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} keywords`;

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

      if (result.synced > 0) {
        setCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadKeywords(accountIdNum);

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage(null), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage(null), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keywords from Google Ads";
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
      
      const result = await googleAdwordsKeywordsService.syncGoogleKeywordAnalytics(
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

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadKeywords(accountIdNum);
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
        "Failed to sync keyword analytics from Google Ads";
      setAnalyticsSyncMessage(errorMessage);
      setTimeout(() => setAnalyticsSyncMessage(null), 8000);
    } finally {
      setSyncingAnalytics(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
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
            filters: filters, // Pass filters array directly
          };

          const response = await googleAdwordsKeywordsService.getGoogleKeywords(
            accountIdNum,
            undefined,
            undefined,
            params
          );
          setKeywords(
            Array.isArray(response.keywords) ? response.keywords : []
          );
          setTotalPages(response.total_pages || 0);
          setTotal(response.total || 0);
          if (response.summary) {
            setSummary(response.summary);
          }
          const responseWithChart = response as any;
          if (
            responseWithChart.chart_data &&
            Array.isArray(responseWithChart.chart_data)
          ) {
            setChartDataFromApi(responseWithChart.chart_data);
          } else {
            setChartDataFromApi([]);
          }
          setSelectedKeywords(new Set());
        } catch (error) {
          console.error("Failed to sort keywords:", error);
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
      setSelectedKeywords(new Set(keywords.map((k) => k.keyword_id)));
    } else {
      setSelectedKeywords(new Set());
    }
  };

  const handleSelectKeyword = (
    keywordId: string | number,
    checked: boolean
  ) => {
    const newSelected = new Set(selectedKeywords);
    if (checked) {
      newSelected.add(keywordId);
    } else {
      newSelected.delete(keywordId);
    }
    setSelectedKeywords(newSelected);
  };

  // Inline edit handlers
  const startInlineEdit = (
    keyword: GoogleKeyword,
    field: "bid" | "status" | "match_type" | "keyword_text"
  ) => {
    // For keyword_text, show modal directly instead of inline editing
    if (field === "keyword_text") {
      setKeywordTextEditKeyword(keyword);
      setKeywordTextEditValue(keyword.keyword_text || "");
      setShowKeywordTextEditModal(true);
      return;
    }
    
    setEditingCell({ keywordId: keyword.keyword_id, field });
    if (field === "bid") {
      setEditedValue((keyword.cpc_bid_dollars || 0).toString());
    } else if (field === "status") {
      setEditedValue(keyword.status || "ENABLED");
    } else if (field === "match_type") {
      setEditedValue(keyword.match_type || "EXACT");
    }
  };
  
  // Keyword text edit handler
  const handleKeywordTextEditSave = async () => {
    if (!keywordTextEditKeyword || !accountId) return;
    
    const trimmedText = keywordTextEditValue.trim();
    if (!trimmedText) {
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: "Keyword text cannot be empty. Please enter a keyword.",
      });
      return;
    }
    
    const oldText = (keywordTextEditKeyword.keyword_text || "").trim();
    if (trimmedText === oldText) {
      setShowKeywordTextEditModal(false);
      setKeywordTextEditKeyword(null);
      setKeywordTextEditValue("");
      return;
    }
    
    setKeywordTextEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Include adgroup_id to ensure we only update the specific keyword in the specific ad group
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: [keywordTextEditKeyword.keyword_id],
        action: "keyword_text",
        keyword_text: trimmedText,
        adgroupIds: keywordTextEditKeyword.adgroup_id ? [keywordTextEditKeyword.adgroup_id] : undefined,
      });

      if (response.errors && response.errors.length > 0) {
        // Format error message - check for duplicate keyword
        const errorMessage = response.errors[0];
        let title = "Update Failed";
        let message = errorMessage;
        
        if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
          title = "Duplicate Keyword";
          message = `The keyword "${trimmedText}" already exists in this ad group with the same match type. Please choose a different keyword text.`;
        } else {
          message = `Failed to update keyword text: ${errorMessage}`;
        }
        
        setErrorModal({
          isOpen: true,
          title,
          message,
        });
        return;
      }

      await loadKeywords(accountIdNum);
      setShowKeywordTextEditModal(false);
      setKeywordTextEditKeyword(null);
      setKeywordTextEditValue("");
    } catch (error: any) {
      console.error("Error updating keyword text:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred"; 
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update keyword text: ${errorMessage}`,
      });
    } finally {
      setKeywordTextEditLoading(false);
    }
  };
  
  // Final URL edit handlers
  const handleStartFinalUrlEdit = (keyword: GoogleKeyword) => {
    if (!keyword) {
      console.error("Cannot edit final URL: keyword is null");
      return;
    }
    
    setFinalUrlKeyword(keyword);
    // Get first URL from final_urls array if available
    const finalUrls = (keyword as any)?.final_urls || (keyword as any)?.finalUrls || null;
    let currentUrl = "";
    if (Array.isArray(finalUrls) && finalUrls.length > 0) {
      currentUrl = finalUrls[0] || "";
    } else if (typeof finalUrls === "string" && finalUrls.trim()) {
      currentUrl = finalUrls.trim();
    }
    setFinalUrlValue(currentUrl);
    
    const mobileUrls = (keyword as any)?.final_mobile_urls || (keyword as any)?.finalMobileUrls || null;
    let currentMobileUrl = "";
    if (Array.isArray(mobileUrls) && mobileUrls.length > 0) {
      currentMobileUrl = mobileUrls[0] || "";
    } else if (typeof mobileUrls === "string" && mobileUrls.trim()) {
      currentMobileUrl = mobileUrls.trim();
    }
    setMobileFinalUrlValue(currentMobileUrl);
    setUseMobileFinalUrl(!!currentMobileUrl);
    setShowFinalUrlModal(true);
  };
  
  const handleFinalUrlEditSave = async () => {
    if (!finalUrlKeyword || !accountId) return;
    
    const trimmedUrl = finalUrlValue.trim();
    if (!trimmedUrl) {
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: "Final URL cannot be empty. Please enter a URL.",
      });
      return;
    }
    
    // Validate URL format
    let finalUrl = trimmedUrl;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    
    try {
      new URL(finalUrl);
    } catch {
      setErrorModal({
        isOpen: true,
        title: "Invalid URL",
        message: "Please enter a valid URL. URLs should start with http:// or https://",
      });
      return;
    }
    
    let mobileUrl = "";
    if (useMobileFinalUrl) {
      const trimmedMobileUrl = mobileFinalUrlValue.trim();
      if (!trimmedMobileUrl) {
        setErrorModal({
          isOpen: true,
          title: "Validation Error",
          message: "Mobile final URL cannot be empty when the checkbox is checked. Please enter a mobile URL or uncheck the option.",
        });
        return;
      }
      mobileUrl = trimmedMobileUrl;
      if (!mobileUrl.startsWith("http://") && !mobileUrl.startsWith("https://")) {
        mobileUrl = "https://" + mobileUrl;
      }
      try {
        new URL(mobileUrl);
      } catch {
        setErrorModal({
          isOpen: true,
          title: "Invalid Mobile URL",
          message: "Please enter a valid mobile URL. URLs should start with http:// or https://",
        });
        return;
      }
    }
    
    setFinalUrlEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Include adgroup_id to ensure we only update the specific keyword in the specific ad group
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: [finalUrlKeyword.keyword_id],
        action: "final_urls",
        final_url: finalUrl,
        final_mobile_url: useMobileFinalUrl ? mobileUrl : undefined,
        adgroupIds: finalUrlKeyword.adgroup_id ? [finalUrlKeyword.adgroup_id] : undefined,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0];
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: `Failed to update final URL: ${errorMessage}`,
        });
        return;
      }

      await loadKeywords(accountIdNum);
      setShowFinalUrlModal(false);
      setFinalUrlKeyword(null);
      setFinalUrlValue("");
      setMobileFinalUrlValue("");
      setUseMobileFinalUrl(false);
    } catch (error: any) {
      console.error("Error updating final URL:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update final URL: ${errorMessage}`,
      });
    } finally {
      setFinalUrlEditLoading(false);
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

  const confirmInlineEdit = (
    newValueOverride?: string,
    skipModal: boolean = false
  ) => {
    if (!editingCell || !accountId || isCancelling) return;

    const keyword = keywords.find(
      (k) => k.keyword_id === editingCell.keywordId
    );
    if (!keyword) return;

    const valueToCheck =
      newValueOverride !== undefined ? newValueOverride : editedValue;
    let hasChanged = false;

    if (editingCell.field === "bid") {
      const newBidStr = valueToCheck.trim();
      const newBid = newBidStr === "" ? 0 : parseFloat(newBidStr);
      const oldBid = keyword.cpc_bid_dollars || 0;
      if (isNaN(newBid)) {
        cancelInlineEdit();
        return;
      }
      // Use a smaller threshold (0.001) to detect small bid changes like 0.02 to 0.03
      hasChanged = Math.abs(newBid - oldBid) > 0.001;
    } else if (editingCell.field === "status") {
      const oldValue = (keyword.status || "ENABLED").trim();
      const newValue = valueToCheck.trim();
      hasChanged = newValue !== oldValue;
    } else if (editingCell.field === "match_type") {
      const oldValue = (keyword.match_type || "EXACT").trim();
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

    // For all fields, show modal
    if (editingCell.field === "status") {
      const oldStatusRaw = keyword.status || "ENABLED";
      const newStatusRaw = valueToCheck.trim();
      
      // Format status values for display
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        Enabled: "Enabled",
        Paused: "Paused",
      };
      const oldValue = statusDisplayMap[oldStatusRaw] || oldStatusRaw;
      const newValue = statusDisplayMap[newStatusRaw] || newStatusRaw;
      
      setInlineEditKeyword(keyword);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(oldValue);
      setInlineEditNewValue(newValue);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For bid, show modal
    if (editingCell.field === "bid") {
      const newBid = parseFloat(valueToCheck) || 0;
      const oldBid = keyword.cpc_bid_dollars || 0;
      
      setInlineEditKeyword(keyword);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(formatCurrency(oldBid));
      // Store raw numeric value for API call, but format for display in modal
      setInlineEditNewValue(newBid.toString());
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }

    // For match_type, show modal
    if (editingCell.field === "match_type") {
      const oldValue = keyword.match_type || "EXACT";
      const newValue = valueToCheck.trim();
      
      const matchTypeDisplayMap: Record<string, string> = {
        EXACT: "Exact",
        PHRASE: "Phrase",
        BROAD: "Broad",
        Exact: "Exact",
        Phrase: "Phrase",
        Broad: "Broad",
      };
      const oldDisplayValue = matchTypeDisplayMap[oldValue] || oldValue;
      const newDisplayValue = matchTypeDisplayMap[newValue] || newValue;
      
      setInlineEditKeyword(keyword);
      setInlineEditField(editingCell.field);
      setInlineEditOldValue(oldDisplayValue);
      setInlineEditNewValue(newDisplayValue);
      setShowInlineEditModal(true);
      setEditingCell(null);
      return;
    }
  };

  const runInlineEdit = async () => {
    if (!inlineEditKeyword || !inlineEditField || !accountId) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "status") {
        // Map status values: Google API uses "ENABLED" | "PAUSED" (uppercase)
        const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
          ENABLED: "ENABLED",
          PAUSED: "PAUSED",
          Enabled: "ENABLED",
          Paused: "PAUSED",
        };
        const statusValue = statusMap[inlineEditNewValue] || "ENABLED";

        const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
          keywordIds: [inlineEditKeyword.keyword_id],
          action: "status",
          status: statusValue,
        });

        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0]);
        }
      } else if (inlineEditField === "bid") {
        // inlineEditNewValue is stored as raw numeric string
        const bidValue = parseFloat(inlineEditNewValue);
        if (isNaN(bidValue) || bidValue <= 0) {
          throw new Error("Invalid bid value");
        }

        const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
          keywordIds: [inlineEditKeyword.keyword_id],
          action: "bid",
          bid: bidValue,
        });

        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0]);
        }
      } else if (inlineEditField === "match_type") {
        // Map match type values
        const matchTypeMap: Record<string, "EXACT" | "PHRASE" | "BROAD"> = {
          EXACT: "EXACT",
          PHRASE: "PHRASE",
          BROAD: "BROAD",
          Exact: "EXACT",
          Phrase: "PHRASE",
          Broad: "BROAD",
        };
        const matchTypeValue = matchTypeMap[inlineEditNewValue] || "EXACT";

        const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
          keywordIds: [inlineEditKeyword.keyword_id],
          action: "match_type",
          match_type: matchTypeValue,
        });
        
        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0]);
        }
      }

      await loadKeywords(accountIdNum);
      setShowInlineEditModal(false);
      setInlineEditKeyword(null);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
    } catch (error) {
      console.error("Error updating keyword:", error);
      alert("Failed to update keyword. Please try again.");
    } finally {
      setInlineEditLoading(false);
    }
  };

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!accountId || selectedKeywords.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      // Show loading in modal
      setBulkLoading(true);
      setBulkUpdateResults(null);

      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: Array.from(selectedKeywords),
        action: "status",
        status: statusValue,
      });

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: response.updated || 0,
        failed: response.failed || 0,
        errors: response.errors || [],
      });

      // Reload keywords with loading state
      setSorting(true); // Show loading overlay
      await loadKeywords(accountIdNum);
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update keywords", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update keywords. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedKeywords.size,
        errors: [errorMessage],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getSelectedKeywordsData = () => {
    return keywords.filter((keyword) =>
      selectedKeywords.has(keyword.keyword_id)
    );
  };

  // Calculate new bid value for a keyword
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

    return Math.max(0, newBid);
  };

  const runBulkBid = async () => {
    if (!accountId || selectedKeywords.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(bidValue);
    if (isNaN(valueNum)) {
      return;
    }
    const upper = upperLimit ? parseFloat(upperLimit) : undefined;
    const lower = lowerLimit ? parseFloat(lowerLimit) : undefined;

    try {
      // Show loading in modal
      setBulkLoading(true);
      setBulkUpdateResults(null);

      let totalUpdated = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      if (bidAction === "set") {
        // For "set", we can update all keywords with the same bid in a single call
        try {
          const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
            keywordIds: Array.from(selectedKeywords),
            action: "bid",
            bid: valueNum,
          });
          totalUpdated = response.updated || 0;
          totalFailed = response.failed || 0;
          if (response.errors) {
            allErrors.push(...response.errors);
          }
        } catch (error: any) {
          totalFailed = selectedKeywords.size;
          const errorMessage = error?.response?.data?.error || error?.message || "Failed to update keywords";
          allErrors.push(errorMessage);
        }
      } else {
        // For "increase" or "decrease", calculate individual bids and group by bid value
        const keywordUpdates = getSelectedKeywordsData().map((keyword) => {
          const currentBid = keyword.cpc_bid_dollars || 0;
          let newBid = currentBid;

          if (bidAction === "increase") {
            if (bidUnit === "percent") {
              newBid = currentBid * (1 + valueNum / 100);
            } else {
              newBid = currentBid + valueNum;
            }
            if (upper !== undefined) {
              newBid = Math.min(newBid, upper);
            }
          } else if (bidAction === "decrease") {
            if (bidUnit === "percent") {
              newBid = currentBid * (1 - valueNum / 100);
            } else {
              newBid = currentBid - valueNum;
            }
            if (lower !== undefined) {
              newBid = Math.max(newBid, lower);
            }
          }

          return { keywordId: keyword.keyword_id, bid: Math.max(0, newBid) };
        });

        // Group keywords by their new bid value to batch them together
        const keywordsByBid = new Map<number, string[]>();
        for (const update of keywordUpdates) {
          const bidKey = Math.round(update.bid * 10000) / 10000; // Round to 4 decimal places to group similar bids
          if (!keywordsByBid.has(bidKey)) {
            keywordsByBid.set(bidKey, []);
          }
          keywordsByBid.get(bidKey)!.push(String(update.keywordId));
        }

        // Update keywords in batches grouped by bid value
        for (const [bidValue, keywordIds] of keywordsByBid.entries()) {
          try {
            const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
              keywordIds: keywordIds,
              action: "bid",
              bid: bidValue,
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
            totalFailed += keywordIds.length;
            const errorMessage = error?.response?.data?.error || error?.message || "Failed to update keywords";
            allErrors.push(`Keywords [${keywordIds.join(", ")}]: ${errorMessage}`);
          }
        }
      }

      // Store results and show them in modal
      setBulkUpdateResults({
        updated: totalUpdated,
        failed: totalFailed,
        errors: allErrors,
      });

      // Reload keywords with loading state
      setSorting(true); // Show loading overlay
      await loadKeywords(accountIdNum);
      // Hide loading overlay after a short delay
      setTimeout(() => {
        setSorting(false);
      }, 300);
    } catch (error: any) {
      console.error("Failed to update keywords", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update keywords. Please try again.";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedKeywords.size,
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

      await googleAdwordsKeywordsService.exportGoogleKeywords(
        accountIdNum,
        params,
        exportType
      );
      
      // Close dropdown after a short delay to show success
      setTimeout(() => {
        setShowExportDropdown(false);
      }, 500);
    } catch (error: any) {
      console.error("Failed to export keywords:", error);
      alert("Failed to export keywords. Please try again.");
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      ENABLED: "Enable",
      PAUSED: "Paused",
    };
    const statusLabel = statusMap[status.toUpperCase()] || "Paused";
    return <StatusBadge status={statusLabel} />;
  };

  const getMatchTypeLabel = (type?: string) => {
    if (!type) return "—";
    const typeMap: Record<string, string> = {
      EXACT: "Exact",
      PHRASE: "Phrase",
      BROAD: "Broad",
    };
    return typeMap[type] || type;
  };

  const allSelected =
    keywords.length > 0 && selectedKeywords.size === keywords.length;
  const someSelected =
    selectedKeywords.size > 0 && selectedKeywords.size < keywords.length;

  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric as keyof typeof prev],
    }));
  };

  // Chart data comes from backend
  const chartData = useMemo(() => {
    console.log(
      "📊 [CHART DEBUG] Processing chart data, chartDataFromApi length:",
      chartDataFromApi.length
    );
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
          acos: item.acos || 0,
          roas: item.roas || 0,
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
                Google Keyword Manager
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
                  // Removed direct call to loadKeywordsWithFilters - useEffect will handle it when filters change
                  // This prevents double requests
                  // if (accountId) {
                  //   const accountIdNum = parseInt(accountId, 10);
                  //   if (!isNaN(accountIdNum)) {
                  //     loadKeywordsWithFilters(accountIdNum, convertedFilters);
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
              isCollapsed={isChartCollapsed}
              onCollapseToggle={toggleChartCollapse}
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
                        { value: "edit_bid", label: "Edit Bid" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={selectedKeywords.size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedKeywords.size === 0) return;
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
                    disabled={exportLoading || loading || keywords.length === 0}
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

            {/* Google Keywords Table Card with overlay when panel is open */}
            <div className="relative">

              {/* Bid editor panel */}
              {selectedKeywords.size > 0 && showBidPanel && (
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
                        <Loader size="md" message="Updating keywords..." />
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
                              ✓ All keywords updated successfully!
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Confirmation Summary */
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.16px] text-[#556179]">
                            {selectedKeywords.size} keyword
                            {selectedKeywords.size !== 1 ? "s" : ""} will be
                            updated:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {isBidChange ? "Bid" : "Status"} change
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Keyword Preview Table - Only show before update */}
                    {!bulkUpdateResults && (() => {
                      const selectedKeywordsData = getSelectedKeywordsData();
                      const previewCount = Math.min(
                        10,
                        selectedKeywordsData.length
                      );
                      const hasMore = selectedKeywordsData.length > 10;

                      return (
                        <div className="mb-6">
                          <div className="mb-2">
                            <span className="text-[10.64px] text-[#556179]">
                              {hasMore
                                ? `Showing ${previewCount} of ${selectedKeywordsData.length} selected keywords`
                                : `${selectedKeywordsData.length} keyword${
                                    selectedKeywordsData.length !== 1 ? "s" : ""
                                  } selected`}
                            </span>
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-sandstorm-s20">
                                <tr>
                                  <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                                    Keyword
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
                                {selectedKeywordsData
                                  .slice(0, 10)
                                  .map((keyword) => {
                                    const oldBid = keyword.cpc_bid_dollars || 0;
                                    const oldStatus =
                                      keyword.status || "ENABLED";
                                    const newBid = isBidChange
                                      ? calculateNewBid(oldBid)
                                      : oldBid;
                                    const newStatus = pendingStatusAction
                                      ? pendingStatusAction
                                      : oldStatus;

                                    return (
                                      <tr
                                        key={keyword.keyword_id}
                                        className="border-b border-gray-200 last:border-b-0"
                                      >
                                        <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                          {keyword.keyword_text ||
                                            "Unnamed Keyword"}
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


              {/* Inline Edit Confirmation Modal */}
              {showInlineEditModal && inlineEditKeyword && inlineEditField && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowInlineEditModal(false);
                      setInlineEditKeyword(null);
                      setInlineEditField(null);
                      setInlineEditOldValue("");
                      setInlineEditNewValue("");
                    }
                  }}
                >
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
                    <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                      Confirm{" "}
                      {inlineEditField === "bid"
                        ? "Bid"
                        : inlineEditField === "status"
                        ? "Status"
                        : "Match Type"}{" "}
                      Change
                    </h3>
                    <div className="mb-4">
                      <p className="text-[12.8px] text-[#556179] mb-2">
                        Keyword:{" "}
                        <span className="font-semibold text-[#072929]">
                          {inlineEditKeyword.keyword_text ||
                            "Unnamed Keyword"}
                        </span>
                      </p>
                      <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[12.8px] text-[#556179]">
                            {inlineEditField === "bid"
                              ? "Bid"
                              : inlineEditField === "status"
                              ? "Status"
                              : "Match Type"}
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
                              {inlineEditField === "bid"
                                ? formatCurrency(parseFloat(inlineEditNewValue) || 0)
                                : inlineEditNewValue}
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
                          setInlineEditKeyword(null);
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

              {/* Keyword Text Edit Modal */}
              {showKeywordTextEditModal && keywordTextEditKeyword && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !keywordTextEditLoading) {
                      setShowKeywordTextEditModal(false);
                      setKeywordTextEditKeyword(null);
                      setKeywordTextEditValue("");
                    }
                  }}
                >
                  <div 
                    className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-[18px] font-semibold text-[#072929] mb-2">
                      Edit Keyword Text
                    </h3>
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-[12px] text-yellow-800">
                        <strong>Note:</strong> Google Ads doesn't allow updating keyword text directly. 
                        This will create a new keyword with the updated text and remove the old one. 
                        The keyword will appear with a new ID after the update.
                      </p>
                    </div>
                    <div className="mb-6">
                      <input
                        type="text"
                        value={keywordTextEditValue}
                        onChange={(e) => setKeywordTextEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !keywordTextEditLoading) {
                            handleKeywordTextEditSave();
                          } else if (e.key === "Escape" && !keywordTextEditLoading) {
                            setShowKeywordTextEditModal(false);
                            setKeywordTextEditKeyword(null);
                            setKeywordTextEditValue("");
                          }
                        }}
                        disabled={keywordTextEditLoading}
                        autoFocus
                        className="w-full px-4 py-2.5 text-[13.3px] text-black border-2 border-[#136D6D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter keyword text"
                        maxLength={255}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!keywordTextEditLoading) {
                            setShowKeywordTextEditModal(false);
                            setKeywordTextEditKeyword(null);
                            setKeywordTextEditValue("");
                          }
                        }}
                        disabled={keywordTextEditLoading}
                        className="cancel-button disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleKeywordTextEditSave}
                        disabled={keywordTextEditLoading || !keywordTextEditValue.trim()}
                        className="create-entity-button btn-sm"
                      >
                        {keywordTextEditLoading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Final URL Edit Modal */}
              {showFinalUrlModal && finalUrlKeyword && (
                <div
                  className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !finalUrlEditLoading) {
                      setShowFinalUrlModal(false);
                      setFinalUrlKeyword(null);
                      setFinalUrlValue("");
                      setMobileFinalUrlValue("");
                      setUseMobileFinalUrl(false);
                    }
                  }}
                >
                  <div 
                    className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
                      Edit Final URL
                    </h3>
                    <div className="mb-6 space-y-4">
                      <div>
                        <label className="block text-[11.2px] font-semibold text-[#136D6D] mb-2">
                          Final URL
                        </label>
                        <input
                          type="text"
                          value={finalUrlValue}
                          onChange={(e) => setFinalUrlValue(e.target.value)}
                          disabled={finalUrlEditLoading}
                          autoFocus
                          className="w-full px-4 py-2.5 text-[13.3px] text-black border-2 border-[#136D6D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="www.example.com"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="use-mobile-url"
                          checked={useMobileFinalUrl}
                          onChange={(e) => setUseMobileFinalUrl(e.target.checked)}
                          disabled={finalUrlEditLoading}
                          className="w-4 h-4 text-[#136D6D] border-gray-300 rounded focus:ring-[#136D6D] disabled:opacity-50"
                        />
                        <label 
                          htmlFor="use-mobile-url"
                          className="text-[13.3px] text-[#072929] cursor-pointer"
                        >
                          Use a different final URL for mobile
                        </label>
                      </div>
                      {useMobileFinalUrl && (
                        <div>
                          <label className="block text-[11.2px] font-semibold text-[#136D6D] mb-2">
                            Mobile Final URL
                          </label>
                          <input
                            type="text"
                            value={mobileFinalUrlValue}
                            onChange={(e) => setMobileFinalUrlValue(e.target.value)}
                            disabled={finalUrlEditLoading}
                            className="w-full px-4 py-2.5 text-[13.3px] text-black border-2 border-[#136D6D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="www.example.com"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!finalUrlEditLoading) {
                            setShowFinalUrlModal(false);
                            setFinalUrlKeyword(null);
                            setFinalUrlValue("");
                            setMobileFinalUrlValue("");
                            setUseMobileFinalUrl(false);
                          }
                        }}
                        disabled={finalUrlEditLoading}
                        className="px-4 py-2 text-[#136D6D] bg-transparent rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleFinalUrlEditSave}
                        disabled={finalUrlEditLoading || !finalUrlValue.trim()}
                        className="px-4 py-2 text-[#136D6D] bg-transparent rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {finalUrlEditLoading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="table-container">
                <div className="overflow-x-auto w-full">
                  <GoogleKeywordsTable
                    keywords={keywords}
                    loading={loading}
                    sorting={sorting}
                    accountId={accountId || ""}
                    selectedKeywords={selectedKeywords}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    editingCell={editingCell}
                    editedValue={editedValue}
                    isCancelling={isCancelling}
                    summary={summary}
                    updatingField={updatingField}
                    pendingBidChange={null}
                    pendingStatusChange={null}
                    pendingMatchTypeChange={null}
                    onSelectAll={handleSelectAll}
                    onSelectKeyword={handleSelectKeyword}
                    onSort={handleSort}
                    onStartInlineEdit={startInlineEdit}
                    onCancelInlineEdit={cancelInlineEdit}
                    onInlineEditChange={handleInlineEditChange}
                    onConfirmInlineEdit={confirmInlineEdit}
                    onStartFinalUrlEdit={handleStartFinalUrlEdit}
                    onConfirmBidChange={() => {}}
                    onCancelBidChange={() => {}}
                    onConfirmStatusChange={() => {}}
                    onCancelStatusChange={() => {}}
                    onConfirmMatchTypeChange={() => {}}
                    onCancelMatchTypeChange={() => {}}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusBadge={getStatusBadge}
                    getMatchTypeLabel={getMatchTypeLabel}
                    getSortIcon={getSortIcon}
                  />
                </div>
              </div>

              {/* Pagination */}
              {!loading && keywords.length > 0 && (
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
      
      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: "Error", message: "" })}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  );
};
