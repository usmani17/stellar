import { useState, useCallback, useEffect } from "react";
import { googleAdwordsNegativeKeywordsService } from "../../../services/googleAdwords/googleAdwordsNegativeKeywords";
import type { GoogleNegativeKeyword } from "../components/tabs/GoogleTypes";
import type { FilterValues } from "../../../components/filters/FilterPanel";
import type { NegativeKeywordInput } from "../../../components/google/CreateGoogleNegativeKeywordPanel";

interface UseGoogleCampaignDetailNegativeKeywordsParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onSyncMessage?: (message: { type: "negative_keywords" | null; message: string | null }) => void;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
}

export const useGoogleCampaignDetailNegativeKeywords = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onSyncMessage,
  onError,
}: UseGoogleCampaignDetailNegativeKeywordsParams) => {
  // Data state
  const [negativeKeywords, setNegativeKeywords] = useState<
    GoogleNegativeKeyword[]
  >([]);
  const [negativeKeywordsLoading, setNegativeKeywordsLoading] = useState(false);
  const [selectedNegativeKeywordIds, setSelectedNegativeKeywordIds] = useState<
    Set<number>
  >(new Set());

  // Pagination state
  const [negativeKeywordsCurrentPage, setNegativeKeywordsCurrentPage] =
    useState(1);
  const [negativeKeywordsTotalPages, setNegativeKeywordsTotalPages] = useState(0);
  const [negativeKeywordsSortBy, setNegativeKeywordsSortBy] =
    useState<string>("id");
  const [negativeKeywordsSortOrder, setNegativeKeywordsSortOrder] = useState<
    "asc" | "desc"
  >("asc");

  // Filter state
  const [
    isNegativeKeywordsFilterPanelOpen,
    setIsNegativeKeywordsFilterPanelOpen,
  ] = useState(false);
  const [negativeKeywordsFilters, setNegativeKeywordsFilters] =
    useState<FilterValues>([]);

  // Sync state
  const [syncingNegativeKeywords, setSyncingNegativeKeywords] = useState(false);

  // Create panel state
  const [
    isCreateNegativeKeywordPanelOpen,
    setIsCreateNegativeKeywordPanelOpen,
  ] = useState(false);
  const [createNegativeKeywordLoading, setCreateNegativeKeywordLoading] =
    useState(false);
  const [createNegativeKeywordError, setCreateNegativeKeywordError] = useState<
    string | null
  >(null);
  const [createdNegativeKeywords, setCreatedNegativeKeywords] = useState<any[]>(
    []
  );
  const [failedNegativeKeywords, setFailedNegativeKeywords] = useState<any[]>(
    []
  );

  // Load negative keywords
  const loadNegativeKeywords = useCallback(async () => {
    try {
      setNegativeKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);
      const channelIdNum = parseInt(channelId!, 10);

      if (isNaN(accountIdNum) || isNaN(channelIdNum) || !campaignId) {
        setNegativeKeywordsLoading(false);
        return;
      }

      const data =
        await googleAdwordsNegativeKeywordsService.getGoogleNegativeKeywords(
          accountIdNum,
          channelIdNum,
          {
            filters: negativeKeywordsFilters,
            campaign_id: campaignId,
            page: negativeKeywordsCurrentPage,
            page_size: 100,
            sort_by: negativeKeywordsSortBy,
            order: negativeKeywordsSortOrder,
          }
        );

      setNegativeKeywords(data.negative_keywords || []);
      setNegativeKeywordsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load negative keywords:", error);
      setNegativeKeywords([]);
      setNegativeKeywordsTotalPages(0);
    } finally {
      setNegativeKeywordsLoading(false);
    }
  }, [accountId, channelId, campaignId, negativeKeywordsFilters, negativeKeywordsCurrentPage, negativeKeywordsSortBy, negativeKeywordsSortOrder]);

  // Load negative keywords when dependencies change
  useEffect(() => {
    if (accountId && campaignId && activeTab === "Negative Keywords") {
      loadNegativeKeywords();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    negativeKeywordsCurrentPage,
    negativeKeywordsSortBy,
    negativeKeywordsSortOrder,
    negativeKeywordsFilters,
    loadNegativeKeywords,
  ]);

  // Selection handlers
  const handleSelectAllNegativeKeywords = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedNegativeKeywordIds(
        new Set(negativeKeywords.map((nkw) => nkw.id))
      );
    } else {
      setSelectedNegativeKeywordIds(new Set());
    }
  }, [negativeKeywords]);

  const handleSelectNegativeKeyword = useCallback((id: number, checked: boolean) => {
    setSelectedNegativeKeywordIds((prev) => {
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
  const handleNegativeKeywordsSort = useCallback((column: string) => {
    if (negativeKeywordsSortBy === column) {
      setNegativeKeywordsSortOrder(
        negativeKeywordsSortOrder === "asc" ? "desc" : "asc"
      );
    } else {
      setNegativeKeywordsSortBy(column);
      setNegativeKeywordsSortOrder("asc");
    }
    setNegativeKeywordsCurrentPage(1);
  }, [negativeKeywordsSortBy, negativeKeywordsSortOrder]);

  // Page change handler
  const handleNegativeKeywordsPageChange = useCallback((page: number) => {
    setNegativeKeywordsCurrentPage(page);
  }, []);

  // Sync handler
  const handleSyncNegativeKeywords = useCallback(async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    const channelIdNum = parseInt(channelId!, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

    try {
      setSyncingNegativeKeywords(true);
      if (onSyncMessage) {
        onSyncMessage({ type: null, message: null });
      }
      const result =
        await googleAdwordsNegativeKeywordsService.syncGoogleNegativeKeywords(
          accountIdNum,
          channelIdNum
        );
      let message = `Successfully synced ${result.synced} negative keywords`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      if (onSyncMessage) {
        onSyncMessage({ type: "negative_keywords", message });
      }

      if (result.synced > 0) {
        setNegativeKeywordsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadNegativeKeywords();

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
      console.error("Failed to sync negative keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync negative keywords from Google Ads";
      if (onSyncMessage) {
        onSyncMessage({ type: "negative_keywords", message: errorMessage });
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 8000);
      }
    } finally {
      setSyncingNegativeKeywords(false);
    }
  }, [accountId, channelId, loadNegativeKeywords, onSyncMessage]);

  // Create handler
  const handleCreateNegativeKeywords = useCallback(async (data: {
    negativeKeywords: NegativeKeywordInput[];
    level: "campaign" | "adgroup";
    adGroupId?: string;
  }) => {
    if (!accountId || !channelId || !campaignId) return;

    try {
      setCreateNegativeKeywordLoading(true);
      setCreateNegativeKeywordError(null);
      setCreatedNegativeKeywords([]);
      setFailedNegativeKeywords([]);

      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      const result =
        await googleAdwordsNegativeKeywordsService.createGoogleNegativeKeywords(
          accountIdNum,
          channelIdNum,
          campaignId,
          data
        );

      setCreatedNegativeKeywords(result.negative_keywords || []);
      setIsCreateNegativeKeywordPanelOpen(false);
      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Failed to create negative keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create negative keywords";
      setCreateNegativeKeywordError(errorMessage);
      if (error.response?.data?.failed_negative_keywords) {
        setFailedNegativeKeywords(error.response.data.failed_negative_keywords);
      }
    } finally {
      setCreateNegativeKeywordLoading(false);
    }
  }, [accountId, channelId, campaignId, loadNegativeKeywords]);

  // Update negative keyword text handler
  const handleUpdateNegativeKeywordText = useCallback(async (criterionId: string, keywordText: string) => {
    if (!accountId || !channelId) return;

    const trimmedText = keywordText.trim();
    if (!trimmedText) {
      if (onError) {
        onError({
          title: "Validation Error",
          message: "Keyword text cannot be empty. Please enter a keyword.",
        });
      }
      return;
    }

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid account ID or channel ID");
      }

      // Find the negative keyword to determine level
      const negativeKeyword = negativeKeywords.find(
        (nkw) => nkw.criterion_id === criterionId
      );
      if (!negativeKeyword) {
        throw new Error("Negative keyword not found");
      }

      const level = negativeKeyword.level || "campaign";

      const response = await googleAdwordsNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(
        accountIdNum,
        channelIdNum,
        {
          negativeKeywordIds: [criterionId],
          action: "keyword_text",
          keyword_text: trimmedText,
          level: level as "campaign" | "adgroup",
        }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0]);
      }

      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Error updating negative keyword text:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      if (onError) {
        onError({
          title: "Update Failed",
          message: `Failed to update negative keyword text: ${errorMessage}`,
        });
      }
      throw error; // Re-throw so the modal in the tab component can handle it
    }
  }, [accountId, channelId, negativeKeywords, loadNegativeKeywords, onError]);

  // Update handlers
  const handleUpdateNegativeKeywordStatus = useCallback(async (criterionId: string, status: string) => {
    if (!accountId || !channelId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

      await googleAdwordsNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(accountIdNum, channelIdNum, {
        negativeKeywordIds: [criterionId],
        action: "status",
        value: status,
        level: "campaign", // Default to campaign level
      });

      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Failed to update negative keyword status:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update negative keyword status";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
    }
  }, [accountId, channelId, loadNegativeKeywords, onError]);

  const handleUpdateNegativeKeywordMatchType = useCallback(async (criterionId: string, matchType: string) => {
    if (!accountId || !channelId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

      await googleAdwordsNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(accountIdNum, channelIdNum, {
        negativeKeywordIds: [criterionId],
        action: "match_type",
        value: matchType,
        level: "campaign", // Default to campaign level
      });

      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Failed to update negative keyword match type:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update negative keyword match type";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
    }
  }, [accountId, channelId, loadNegativeKeywords, onError]);

  return {
    // Data
    negativeKeywords,
    setNegativeKeywords,
    negativeKeywordsLoading,
    selectedNegativeKeywordIds,
    
    // Pagination
    negativeKeywordsCurrentPage,
    setNegativeKeywordsCurrentPage,
    negativeKeywordsTotalPages,
    negativeKeywordsSortBy,
    negativeKeywordsSortOrder,
    
    // Filters
    isNegativeKeywordsFilterPanelOpen,
    setIsNegativeKeywordsFilterPanelOpen,
    negativeKeywordsFilters,
    setNegativeKeywordsFilters,
    
    // Sync
    syncingNegativeKeywords,
    
    // Create panel
    isCreateNegativeKeywordPanelOpen,
    setIsCreateNegativeKeywordPanelOpen,
    createNegativeKeywordLoading,
    createNegativeKeywordError,
    setCreateNegativeKeywordError,
    createdNegativeKeywords,
    setCreatedNegativeKeywords,
    failedNegativeKeywords,
    setFailedNegativeKeywords,
    
    // Handlers
    loadNegativeKeywords,
    handleSelectAllNegativeKeywords,
    handleSelectNegativeKeyword,
    handleNegativeKeywordsSort,
    handleNegativeKeywordsPageChange,
    handleSyncNegativeKeywords,
    handleCreateNegativeKeywords,
    handleUpdateNegativeKeywordText,
    handleUpdateNegativeKeywordStatus,
    handleUpdateNegativeKeywordMatchType,
  };
};
