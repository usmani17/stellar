import { useState, useCallback, useEffect } from "react";
import { googleAdwordsKeywordsService } from "../../../services/googleAdwords/googleAdwordsKeywords";
import type { GoogleKeyword } from "../components/tabs/GoogleTypes";
import type { FilterValues } from "../../../components/filters/FilterPanel";

interface UseGoogleCampaignDetailKeywordsParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onSyncMessage?: (message: { type: "keywords" | null; message: string | null }) => void;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
}

export const useGoogleCampaignDetailKeywords = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onSyncMessage,
  onError,
}: UseGoogleCampaignDetailKeywordsParams) => {
  // Data state
  const [keywords, setKeywords] = useState<GoogleKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(
    new Set()
  );

  // Pagination state
  const [keywordsCurrentPage, setKeywordsCurrentPage] = useState(1);
  const [keywordsTotalPages, setKeywordsTotalPages] = useState(0);
  const [keywordsSortBy, setKeywordsSortBy] = useState<string>("id");
  const [keywordsSortOrder, setKeywordsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );

  // Filter state
  const [isKeywordsFilterPanelOpen, setIsKeywordsFilterPanelOpen] =
    useState(false);
  const [keywordsFilters, setKeywordsFilters] = useState<FilterValues>([]);

  // Sync state
  const [syncingKeywords, setSyncingKeywords] = useState(false);
  const [syncingKeywordsAnalytics, setSyncingKeywordsAnalytics] =
    useState(false);

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

  // Draft-only filter (switch above table)
  const [showDraftsOnlyKeywords, setShowDraftsOnlyKeywords] = useState(false);

  // Load keywords
  const loadKeywords = useCallback(async () => {
    try {
      setKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setKeywordsLoading(false);
        return;
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const data = await googleAdwordsKeywordsService.getGoogleKeywords(
        accountIdNum,
        channelIdNum,
        campaignId,
        undefined,
        {
          filters: keywordsFilters,
          page: keywordsCurrentPage,
          page_size: 100,
          sort_by: keywordsSortBy,
          order: keywordsSortOrder,
          draft_only: showDraftsOnlyKeywords,
        }
      );

      setKeywords(data.keywords || []);
      setKeywordsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
      setKeywordsTotalPages(0);
    } finally {
      setKeywordsLoading(false);
    }
  }, [accountId, campaignId, keywordsFilters, keywordsCurrentPage, keywordsSortBy, keywordsSortOrder, showDraftsOnlyKeywords]);

  // Load keywords when dependencies change
  useEffect(() => {
    if (accountId && campaignId && activeTab === "Keywords") {
      loadKeywords();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    keywordsCurrentPage,
    keywordsSortBy,
    keywordsSortOrder,
    keywordsFilters,
    showDraftsOnlyKeywords,
    loadKeywords,
  ]);

  // Selection handlers
  const handleSelectAllKeywords = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedKeywordIds(new Set(keywords.map((kw) => kw.id)));
    } else {
      setSelectedKeywordIds(new Set());
    }
  }, [keywords]);

  const handleSelectKeyword = useCallback((id: number, checked: boolean) => {
    setSelectedKeywordIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Sort handler
  const handleKeywordsSort = useCallback((column: string) => {
    if (keywordsSortBy === column) {
      setKeywordsSortOrder(keywordsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setKeywordsSortBy(column);
      setKeywordsSortOrder("asc");
    }
    setKeywordsCurrentPage(1);
  }, [keywordsSortBy, keywordsSortOrder]);

  // Page change handler
  const handleKeywordsPageChange = useCallback((page: number) => {
    setKeywordsCurrentPage(page);
  }, []);

  // Sync handlers
  const handleSyncKeywords = useCallback(async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
    if (!channelIdNum || isNaN(channelIdNum)) {
      throw new Error("Channel ID is required");
    }

    try {
      setSyncingKeywords(true);
      if (onSyncMessage) {
        onSyncMessage({ type: null, message: null });
      }
      const result = await googleAdwordsKeywordsService.syncGoogleKeywords(accountIdNum, channelIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} keywords`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      if (onSyncMessage) {
        onSyncMessage({ type: "keywords", message });
      }

      // Reset to first page and reload keywords after sync
      if (result.synced > 0) {
        setKeywordsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadKeywords();

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 5000);
      } else if (result.errors) {
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keywords from Google Ads";
      if (onSyncMessage) {
        onSyncMessage({ type: "keywords", message: errorMessage });
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 8000);
      }
    } finally {
      setSyncingKeywords(false);
    }
  }, [accountId, channelId, loadKeywords, onSyncMessage]);

  const handleSyncKeywordsAnalytics = useCallback(async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
    if (!channelIdNum || isNaN(channelIdNum)) {
      throw new Error("Channel ID is required");
    }

    try {
      setSyncingKeywordsAnalytics(true);
      if (onSyncMessage) {
        onSyncMessage({ type: null, message: null });
      }
      const result = await googleAdwordsKeywordsService.syncGoogleKeywordAnalytics(
        accountIdNum,
        channelIdNum,
        startDate ? startDate.toISOString() : undefined,
        endDate ? endDate.toISOString() : undefined
      );

      let message =
        result.message ||
        `Successfully synced keyword analytics: ${result.rows_inserted || 0
        } inserted, ${result.rows_updated || 0} updated`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      if (onSyncMessage) {
        onSyncMessage({ type: "keywords", message });
      }

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setKeywordsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadKeywords();
      }

      if ((result.rows_inserted || 0) > 0 && !result.errors) {
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 5000);
      } else if (result.errors) {
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keyword analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keyword analytics from Google Ads";
      if (onSyncMessage) {
        onSyncMessage({ type: "keywords", message: errorMessage });
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 8000);
      }
    } finally {
      setSyncingKeywordsAnalytics(false);
    }
  }, [accountId, channelId, startDate, endDate, loadKeywords, onSyncMessage]);

  // Keyword text edit handlers
  const handleStartKeywordTextEdit = useCallback((keyword: GoogleKeyword) => {
    setKeywordTextEditKeyword(keyword);
    setKeywordTextEditValue(keyword.keyword_text || "");
    setShowKeywordTextEditModal(true);
  }, []);

  const handleKeywordTextEditSave = useCallback(async () => {
    if (!keywordTextEditKeyword || !accountId) return;

    const trimmedText = keywordTextEditValue.trim();
    if (!trimmedText) {
      if (onError) {
        onError({
          title: "Validation Error",
          message: "Keyword text cannot be empty. Please enter a keyword.",
        });
      }
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
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, channelIdNum, {
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

        if (onError) {
          onError({
            title,
            message,
          });
        }
        return;
      }

      await loadKeywords();
      setShowKeywordTextEditModal(false);
      setKeywordTextEditKeyword(null);
      setKeywordTextEditValue("");
    } catch (error: any) {
      console.error("Error updating keyword text:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      if (onError) {
        onError({
          title: "Update Failed",
          message: `Failed to update keyword text: ${errorMessage}`,
        });
      }
    } finally {
      setKeywordTextEditLoading(false);
    }
  }, [keywordTextEditKeyword, keywordTextEditValue, accountId, loadKeywords, onError]);

  // Final URL edit handlers
  const handleStartFinalUrlEdit = useCallback((keyword: GoogleKeyword) => {
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
  }, []);

  const handleFinalUrlEditSave = useCallback(async () => {
    if (!finalUrlKeyword || !accountId) return;

    const trimmedUrl = finalUrlValue.trim();
    if (!trimmedUrl) {
      if (onError) {
        onError({
          title: "Validation Error",
          message: "Final URL cannot be empty. Please enter a URL.",
        });
      }
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
      if (onError) {
        onError({
          title: "Invalid URL",
          message: "Please enter a valid URL. URLs should start with http:// or https://",
        });
      }
      return;
    }

    let mobileUrl = "";
    if (useMobileFinalUrl) {
      const trimmedMobileUrl = mobileFinalUrlValue.trim();
      if (!trimmedMobileUrl) {
        if (onError) {
          onError({
            title: "Validation Error",
            message: "Mobile final URL cannot be empty when the checkbox is checked. Please enter a mobile URL or uncheck the option.",
          });
        }
        return;
      }
      mobileUrl = trimmedMobileUrl;
      if (!mobileUrl.startsWith("http://") && !mobileUrl.startsWith("https://")) {
        mobileUrl = "https://" + mobileUrl;
      }
      try {
        new URL(mobileUrl);
      } catch {
        if (onError) {
          onError({
            title: "Invalid Mobile URL",
            message: "Please enter a valid mobile URL. URLs should start with http:// or https://",
          });
        }
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
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, channelIdNum, {
        keywordIds: [finalUrlKeyword.keyword_id],
        action: "final_urls",
        final_url: finalUrl,
        final_mobile_url: useMobileFinalUrl ? mobileUrl : undefined,
        adgroupIds: finalUrlKeyword.adgroup_id ? [finalUrlKeyword.adgroup_id] : undefined,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0];
        if (onError) {
          onError({
            title: "Update Failed",
            message: `Failed to update final URL: ${errorMessage}`,
          });
        }
        return;
      }

      await loadKeywords();
      setShowFinalUrlModal(false);
      setFinalUrlKeyword(null);
      setFinalUrlValue("");
      setMobileFinalUrlValue("");
      setUseMobileFinalUrl(false);
    } catch (error: any) {
      console.error("Error updating final URL:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      if (onError) {
        onError({
          title: "Update Failed",
          message: `Failed to update final URL: ${errorMessage}`,
        });
      }
    } finally {
      setFinalUrlEditLoading(false);
    }
  }, [finalUrlKeyword, finalUrlValue, mobileFinalUrlValue, useMobileFinalUrl, accountId, loadKeywords, onError]);

  // Update handlers
  const handleUpdateKeywordStatus = useCallback(async (keywordId: number, status: string) => {
    if (!accountId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      // Find the keyword to get keyword_id
      const keyword = keywords.find((k) => k.id === keywordId);
      if (!keyword || !keyword.keyword_id) {
        if (onError) {
          onError({
            title: "Error",
            message: "Keyword not found",
          });
        }
        return;
      }

      // Call API
      await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, channelIdNum, {
        keywordIds: [keyword.keyword_id],
        action: "status",
        status: status as "ENABLED" | "PAUSED",
      });

      // Update local state
      setKeywords((prevKeywords) =>
        prevKeywords.map((k) =>
          k.id === keywordId ? { ...k, status } : k
        )
      );
      
      // Reload to ensure data consistency
      await loadKeywords();
    } catch (error: any) {
      console.error("Failed to update keyword status:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update keyword status";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
    }
  }, [accountId, channelId, keywords, loadKeywords, onError]);

  const handleUpdateKeywordBid = useCallback(async (keywordId: number, bid: number) => {
    if (!accountId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      // Find the keyword to get keyword_id
      const keyword = keywords.find((k) => k.id === keywordId);
      if (!keyword || !keyword.keyword_id) {
        if (onError) {
          onError({
            title: "Error",
            message: "Keyword not found",
          });
        }
        return;
      }

      // Call API
      await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, channelIdNum, {
        keywordIds: [keyword.keyword_id],
        action: "bid",
        bid: bid,
      });

      // Update local state
      setKeywords((prevKeywords) =>
        prevKeywords.map((k) =>
          k.id === keywordId
            ? { ...k, cpc_bid_dollars: bid }
            : k
        )
      );
      
      // Reload to ensure data consistency
      await loadKeywords();
    } catch (error: any) {
      console.error("Failed to update keyword bid:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update keyword bid";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
    }
  }, [accountId, channelId, keywords, loadKeywords, onError]);

  const handleUpdateKeywordMatchType = useCallback(async (keywordId: number, matchType: string) => {
    if (!accountId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      // Find the keyword to get keyword_id
      const keyword = keywords.find((k) => k.id === keywordId);
      if (!keyword || !keyword.keyword_id) {
        if (onError) {
          onError({
            title: "Error",
            message: "Keyword not found",
          });
        }
        return;
      }

      // Call API
      await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, channelIdNum, {
        keywordIds: [keyword.keyword_id],
        action: "match_type",
        match_type: matchType as "EXACT" | "PHRASE" | "BROAD",
      });

      // Update local state
      setKeywords((prevKeywords) =>
        prevKeywords.map((k) =>
          k.id === keywordId
            ? { ...k, match_type: matchType }
            : k
        )
      );
      
      // Reload to ensure data consistency
      await loadKeywords();
    } catch (error: any) {
      console.error("Failed to update keyword match type:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update keyword match type";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
    }
  }, [accountId, channelId, keywords, loadKeywords, onError]);

  return {
    // Data
    keywords,
    setKeywords,
    keywordsLoading,
    selectedKeywordIds,
    
    // Pagination
    keywordsCurrentPage,
    setKeywordsCurrentPage,
    keywordsTotalPages,
    keywordsSortBy,
    keywordsSortOrder,
    
    // Filters
    isKeywordsFilterPanelOpen,
    setIsKeywordsFilterPanelOpen,
    keywordsFilters,
    setKeywordsFilters,
    
    // Draft switch
    showDraftsOnlyKeywords,
    setShowDraftsOnlyKeywords,
    
    // Sync
    syncingKeywords,
    syncingKeywordsAnalytics,
    
    // Keyword text edit
    showKeywordTextEditModal,
    setShowKeywordTextEditModal,
    keywordTextEditKeyword,
    setKeywordTextEditKeyword,
    keywordTextEditValue,
    setKeywordTextEditValue,
    keywordTextEditLoading,
    setKeywordTextEditLoading,
    
    // Final URL edit
    showFinalUrlModal,
    setShowFinalUrlModal,
    finalUrlKeyword,
    setFinalUrlKeyword,
    finalUrlValue,
    setFinalUrlValue,
    mobileFinalUrlValue,
    setMobileFinalUrlValue,
    useMobileFinalUrl,
    setUseMobileFinalUrl,
    finalUrlEditLoading,
    
    // Handlers
    loadKeywords,
    handleSelectAllKeywords,
    handleSelectKeyword,
    handleKeywordsSort,
    handleKeywordsPageChange,
    handleSyncKeywords,
    handleSyncKeywordsAnalytics,
    handleStartKeywordTextEdit,
    handleKeywordTextEditSave,
    handleStartFinalUrlEdit,
    handleFinalUrlEditSave,
    handleUpdateKeywordStatus,
    handleUpdateKeywordBid,
    handleUpdateKeywordMatchType,
  };
};
