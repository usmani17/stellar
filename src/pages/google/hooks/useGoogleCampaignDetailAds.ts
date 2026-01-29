import { useState, useCallback, useEffect } from "react";
import { googleAdwordsAdsService } from "../../../services/googleAdwords/googleAdwordsAds";
import type { GoogleAd } from "../components/tabs/GoogleTypes";
import type { FilterValues } from "../../../components/filters/FilterPanel";

interface UseGoogleCampaignDetailAdsParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onSyncMessage?: (message: { type: "ads" | null; message: string | null }) => void;
}

export const useGoogleCampaignDetailAds = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onSyncMessage,
}: UseGoogleCampaignDetailAdsParams) => {
  // Data state
  const [ads, setAds] = useState<GoogleAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [selectedAdIds, setSelectedAdIds] = useState<Set<number>>(new Set());

  // Pagination state
  const [adsCurrentPage, setAdsCurrentPage] = useState(1);
  const [adsTotalPages, setAdsTotalPages] = useState(0);
  const [adsSortBy, setAdsSortBy] = useState<string>("id");
  const [adsSortOrder, setAdsSortOrder] = useState<"asc" | "desc">("asc");

  // Filter state
  const [isAdsFilterPanelOpen, setIsAdsFilterPanelOpen] = useState(false);
  const [adsFilters, setAdsFilters] = useState<FilterValues>([]);

  // Sync state
  const [syncingAds, setSyncingAds] = useState(false);
  const [syncingAdsAnalytics, setSyncingAdsAnalytics] = useState(false);

  // Load ads
  const loadAds = useCallback(async () => {
    try {
      setAdsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdsLoading(false);
        return;
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const data = await googleAdwordsAdsService.getGoogleAds(
        accountIdNum,
        channelIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          filters: adsFilters,
          page: adsCurrentPage,
          page_size: 100,
          sort_by: adsSortBy,
          order: adsSortOrder,
        }
      );

      setAds(data.ads || []);
      setAdsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load ads:", error);
      setAds([]);
      setAdsTotalPages(0);
    } finally {
      setAdsLoading(false);
    }
  }, [accountId, channelId, campaignId, adsFilters, adsCurrentPage, adsSortBy, adsSortOrder]);

  // Load ads when dependencies change
  useEffect(() => {
    if (accountId && campaignId && activeTab === "Ads") {
      loadAds();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    adsCurrentPage,
    adsSortBy,
    adsSortOrder,
    adsFilters,
    loadAds,
  ]);

  // Selection handlers
  const handleSelectAllAds = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAdIds(new Set(ads.map((ad) => ad.id)));
    } else {
      setSelectedAdIds(new Set());
    }
  }, [ads]);

  const handleSelectAd = useCallback((id: number, checked: boolean) => {
    setSelectedAdIds((prev) => {
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
  const handleAdsSort = useCallback((column: string) => {
    if (adsSortBy === column) {
      setAdsSortOrder(adsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdsSortBy(column);
      setAdsSortOrder("asc");
    }
    setAdsCurrentPage(1);
  }, [adsSortBy, adsSortOrder]);

  // Page change handler
  const handleAdsPageChange = useCallback((page: number) => {
    setAdsCurrentPage(page);
  }, []);

  // Sync handlers
  const handleSyncAds = useCallback(async () => {
    if (!accountId || !channelId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
    if (!channelIdNum || isNaN(channelIdNum)) {
      throw new Error("Channel ID is required");
    }

    try {
      setSyncingAds(true);
      if (onSyncMessage) {
        onSyncMessage({ type: null, message: null });
      }
      const result = await googleAdwordsAdsService.syncGoogleAds(accountIdNum, channelIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} ads`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      if (onSyncMessage) {
        onSyncMessage({ type: "ads", message });
      }

      // Reset to first page and reload ads after sync
      if (result.synced > 0) {
        setAdsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAds();

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
      console.error("Failed to sync ads:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ads from Google Ads";
      if (onSyncMessage) {
        onSyncMessage({ type: "ads", message: errorMessage });
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 8000);
      }
    } finally {
      setSyncingAds(false);
    }
  }, [accountId, channelId, loadAds, onSyncMessage]);

  const handleSyncAdsAnalytics = useCallback(async () => {
    if (!accountId || !channelId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
    if (!channelIdNum || isNaN(channelIdNum)) {
      throw new Error("Channel ID is required");
    }

    try {
      setSyncingAdsAnalytics(true);
      if (onSyncMessage) {
        onSyncMessage({ type: null, message: null });
      }
      const result = await googleAdwordsAdsService.syncGoogleAdAnalytics(
        accountIdNum,
        channelIdNum,
        startDate ? startDate.toISOString() : undefined,
        endDate ? endDate.toISOString() : undefined
      );

      let message =
        result.message ||
        `Successfully synced ad analytics: ${result.rows_inserted || 0
        } inserted, ${result.rows_updated || 0} updated`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      if (onSyncMessage) {
        onSyncMessage({ type: "ads", message });
      }

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setAdsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadAds();
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
      console.error("Failed to sync ad analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ad analytics from Google Ads";
      if (onSyncMessage) {
        onSyncMessage({ type: "ads", message: errorMessage });
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 8000);
      }
    } finally {
      setSyncingAdsAnalytics(false);
    }
  }, [accountId, channelId, startDate, endDate, loadAds, onSyncMessage]);

  // Update handlers
  const handleUpdateAdStatus = useCallback(async (adId: number, status: string) => {
    if (!accountId || !channelId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      // Find the ad to get ad_id
      const ad = ads.find((a) => a.id === adId);
      if (!ad || !ad.ad_id) {
        console.error("Ad not found");
        return;
      }

      // Call API
      await googleAdwordsAdsService.bulkUpdateGoogleAds(accountIdNum, channelIdNum, {
        adIds: [ad.ad_id],
        action: "status",
        status: status as "ENABLED" | "PAUSED" | "REMOVED",
      });

      // Update local state
      setAds((prevAds) =>
        prevAds.map((a) =>
          a.id === adId ? { ...a, status } : a
        )
      );
      
      // Reload to ensure data consistency
      await loadAds();
    } catch (error: any) {
      console.error("Failed to update ad status:", error);
      throw error;
    }
  }, [accountId, channelId, ads, loadAds]);

  return {
    // Data
    ads,
    setAds,
    adsLoading,
    selectedAdIds,
    
    // Pagination
    adsCurrentPage,
    setAdsCurrentPage,
    adsTotalPages,
    adsSortBy,
    adsSortOrder,
    
    // Filters
    isAdsFilterPanelOpen,
    setIsAdsFilterPanelOpen,
    adsFilters,
    setAdsFilters,
    
    // Sync
    syncingAds,
    syncingAdsAnalytics,
    
    // Handlers
    loadAds,
    handleSelectAllAds,
    handleSelectAd,
    handleAdsSort,
    handleAdsPageChange,
    handleSyncAds,
    handleSyncAdsAnalytics,
    handleUpdateAdStatus,
  };
};
