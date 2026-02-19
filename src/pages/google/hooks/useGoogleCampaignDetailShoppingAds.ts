import { useState, useCallback, useEffect } from "react";
import { googleAdwordsAdsService } from "../../../services/googleAdwords/googleAdwordsAds";
import type { FilterValues } from "../../../components/filters/FilterPanel";
import { toLocalDateString } from "../../../utils/dateHelpers";

interface UseGoogleCampaignDetailShoppingAdsParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
}

export const useGoogleCampaignDetailShoppingAds = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onError,
}: UseGoogleCampaignDetailShoppingAdsParams) => {
  // Data state
  const [listingGroups, setListingGroups] = useState<any[]>([]);
  const [listingGroupsLoading, setListingGroupsLoading] = useState(false);
  const [listingGroupsSummary, setListingGroupsSummary] = useState<{
    total_ads?: number;
    total_spends?: number;
    total_sales?: number;
    total_impressions?: number;
    total_clicks?: number;
    avg_acos?: number;
    avg_roas?: number;
    total_conversions?: number;
    avg_conversion_rate?: number;
    avg_cost_per_conversion?: number;
    avg_cpc?: number;
    avg_cost?: number;
    avg_interaction_rate?: number;
  } | null>(null);
  const [selectedListingGroupIds, setSelectedListingGroupIds] = useState<Set<number>>(new Set());

  // Pagination state
  const [listingGroupsCurrentPage, setListingGroupsCurrentPage] = useState(1);
  const [listingGroupsTotalPages, setListingGroupsTotalPages] = useState(0);
  const [listingGroupsSortBy, setListingGroupsSortBy] = useState<string>("id");
  const [listingGroupsSortOrder, setListingGroupsSortOrder] = useState<"asc" | "desc">("asc");

  // Filter state
  const [isListingGroupsFilterPanelOpen, setIsListingGroupsFilterPanelOpen] = useState(false);
  const [listingGroupsFilters, setListingGroupsFilters] = useState<FilterValues>([]);

  // Draft-only switch (refetch with draft_only when toggled, like Product Groups)
  const [showDraftsOnlyShoppingAds, setShowDraftsOnlyShoppingAds] = useState(false);

  // Load listing groups. Optional options override page/sort for one request (e.g. after create to show newest first).
  const loadListingGroups = useCallback(
    async (options?: { page?: number; sortBy?: string; sortOrder?: "asc" | "desc" }) => {
      try {
        setListingGroupsLoading(true);
        const accountIdNum = parseInt(accountId!, 10);

        if (isNaN(accountIdNum) || !campaignId) {
          setListingGroupsLoading(false);
          return;
        }

        const page = options?.page ?? listingGroupsCurrentPage;
        const sortBy = options?.sortBy ?? listingGroupsSortBy;
        const sortOrder = options?.sortOrder ?? listingGroupsSortOrder;
        if (options?.page !== undefined) setListingGroupsCurrentPage(options.page);
        if (options?.sortBy !== undefined) setListingGroupsSortBy(options.sortBy);
        if (options?.sortOrder !== undefined) setListingGroupsSortOrder(options.sortOrder);

        // Shopping ads are stored in the ads table with ad_type = 'SHOPPING_PRODUCT_AD'
        // But we need to filter out product groups (is_product_group: true) to show only actual shopping ads
        // Add filters to get shopping ads (not product groups)
        const shoppingAdsFiltersWithType = [
          ...listingGroupsFilters,
          { field: "ad_type", value: "SHOPPING_PRODUCT_AD" },
          // Filter to exclude product groups - we want ads where is_product_group is false or not set
          // Note: This assumes the backend can filter by extra_data->>'is_product_group'
          // If not supported, we may need to filter on the frontend after fetching
        ];

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
            filters: shoppingAdsFiltersWithType,
            page,
            page_size: 10,
            sort_by: sortBy,
            order: sortOrder,
            start_date: startDate
              ? startDate.toISOString().split("T")[0]
              : undefined,
            end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
            draft_only: showDraftsOnlyShoppingAds,
          }
        );

      // Filter out product groups on the frontend if backend filtering doesn't support extra_data
      // Shopping ads should have is_product_group: false or not have the field
      const shoppingAds = (data.ads || []).filter((ad: any) => {
        const extraData = ad.extra_data || {};
        // Include ads where is_product_group is false or not set
        return extraData.is_product_group !== true;
      });

      setListingGroups(shoppingAds);
      setListingGroupsTotalPages(data.total_pages || 0);
      setListingGroupsSummary(data.summary ?? null);
    } catch (error) {
      console.error("Failed to load shopping ads:", error);
      setListingGroups([]);
      setListingGroupsTotalPages(0);
      setListingGroupsSummary(null);
    } finally {
      setListingGroupsLoading(false);
    }
  }, [
    accountId,
    channelId,
    campaignId,
    listingGroupsCurrentPage,
    listingGroupsSortBy,
    listingGroupsSortOrder,
    startDate,
    endDate,
    listingGroupsFilters,
    showDraftsOnlyShoppingAds,
  ]);

  // Load shopping ads when dependencies change
  useEffect(() => {
    if (accountId && channelId && campaignId && activeTab === "Shopping Ads") {
      loadListingGroups();
    }
  }, [
    accountId,
    channelId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    listingGroupsCurrentPage,
    listingGroupsSortBy,
    listingGroupsSortOrder,
    listingGroupsFilters,
    loadListingGroups,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    if (activeTab === "Shopping Ads") {
      setListingGroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, listingGroupsFilters]);

  // Selection handlers
  const handleSelectAllListingGroups = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedListingGroupIds(new Set(listingGroups.map((lg) => lg.id)));
    } else {
      setSelectedListingGroupIds(new Set());
    }
  }, [listingGroups]);

  const handleSelectListingGroup = useCallback((id: number, checked: boolean) => {
    setSelectedListingGroupIds((prev) => {
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
  const handleListingGroupsSort = useCallback((column: string) => {
    if (listingGroupsSortBy === column) {
      setListingGroupsSortOrder(listingGroupsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setListingGroupsSortBy(column);
      setListingGroupsSortOrder("asc");
    }
    setListingGroupsCurrentPage(1);
  }, [listingGroupsSortBy, listingGroupsSortOrder]);

  // Page change handler
  const handleListingGroupsPageChange = useCallback((page: number) => {
    setListingGroupsCurrentPage(page);
  }, []);

  // Update handler
  const handleUpdateListingGroupStatus = useCallback(async (listingGroupId: number, status: string) => {
    if (!accountId || !channelId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

      // Find the listing group to get ad_id
      // Listing groups are stored in the ads table, so they have ad_id
      const listingGroup = listingGroups.find((lg) => lg.id === listingGroupId);
      if (!listingGroup) {
        if (onError) {
          onError({
            title: "Error",
            message: "Listing group not found",
          });
        }
        return;
      }

      // Listing groups come from the ads table, so they should have ad_id
      // Try both snake_case and camelCase field names
      const adId =
        (listingGroup as any).ad_id ||
        (listingGroup as any).adId;
      if (!adId) {
        if (onError) {
          onError({
            title: "Error",
            message: "Listing group ad ID not found. Please sync listing groups first.",
          });
        }
        return;
      }

      // Get campaign_id and adgroup_id to filter the update to only this specific instance
      const campaignId =
        listingGroup.campaign_id ||
        (listingGroup as any).campaignId;
      const adGroupId =
        listingGroup.adgroup_id ||
        (listingGroup as any).adGroupId;

      // Update local state immediately for instant UI feedback
      setListingGroups((prevListingGroups) =>
        prevListingGroups.map((lg) =>
          lg.id === listingGroupId ? { ...lg, status } : lg
        )
      );

      // Call API - listing groups use the same bulkUpdateGoogleAds endpoint
      // Include campaignId and adGroupId to only update this specific instance
      await googleAdwordsAdsService.bulkUpdateGoogleAds(accountIdNum, channelIdNum, {
        adIds: [adId],
        action: "status",
        status: status as "ENABLED" | "PAUSED" | "REMOVED",
        campaignId: campaignId
          ? String(campaignId)
          : undefined,
        adGroupId: adGroupId
          ? String(adGroupId)
          : undefined,
      });
      
      // Reload after a short delay to ensure API has processed, but preserve status update
      setTimeout(async () => {
        try {
          const shoppingAdsFiltersWithTypeReload = [
            ...listingGroupsFilters,
            { field: "ad_type", value: "SHOPPING_PRODUCT_AD" },
          ];
          const data = await googleAdwordsAdsService.getGoogleAds(
            accountIdNum,
            channelIdNum,
            parseInt(campaignId!, 10),
            undefined,
            {
              filters: shoppingAdsFiltersWithTypeReload,
              page: listingGroupsCurrentPage,
              page_size: 10,
              sort_by: listingGroupsSortBy,
              order: listingGroupsSortOrder,
              start_date: startDate ? toLocalDateString(startDate) : undefined,
              end_date: endDate ? toLocalDateString(endDate) : undefined,
              draft_only: showDraftsOnlyShoppingAds,
            }
          );
          
          // Filter out product groups on the frontend (shopping ads should have is_product_group: false or not have the field)
          const shoppingAds = (data.ads || []).filter((ad: any) => {
            const extraData = ad.extra_data || {};
            return extraData.is_product_group !== true;
          });
          
          // Merge reloaded data but preserve our status update for this listing group
          setListingGroups((prevListingGroups) => {
            const updatedListingGroup = prevListingGroups.find((lg) => lg.id === listingGroupId);
            // Preserve status update if we still have it in local state (case-insensitive comparison)
            const normalizedStatus = status.toUpperCase();
            if (updatedListingGroup && updatedListingGroup.status?.toUpperCase() === normalizedStatus) {
              return shoppingAds.map((reloadedAd: any) => {
                // Match by id (which is the primary key from the database)
                if (reloadedAd.id === listingGroupId) {
                  return { ...reloadedAd, status };
                }
                return reloadedAd;
              });
            }
            return shoppingAds;
          });
          setListingGroupsTotalPages(data.total_pages || 0);
        } catch (error) {
          console.error("Failed to reload listing groups after status update:", error);
          // Keep the local update even if reload fails
        }
      }, 500);
    } catch (error: any) {
      console.error("Failed to update listing group status:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update listing group status";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
      throw error;
    }
  }, [accountId, channelId, campaignId, listingGroups, listingGroupsFilters, listingGroupsCurrentPage, listingGroupsSortBy, listingGroupsSortOrder, startDate, endDate, showDraftsOnlyShoppingAds, onError]);

  return {
    // Data
    listingGroups,
    listingGroupsLoading,
    listingGroupsSummary,
    selectedListingGroupIds,
    
    // Pagination
    listingGroupsCurrentPage,
    setListingGroupsCurrentPage,
    listingGroupsTotalPages,
    listingGroupsSortBy,
    listingGroupsSortOrder,
    
    // Filters
    isListingGroupsFilterPanelOpen,
    setIsListingGroupsFilterPanelOpen,
    listingGroupsFilters,
    setListingGroupsFilters,
    
    // Handlers
    loadListingGroups,
    handleSelectAllListingGroups,
    handleSelectListingGroup,
    handleListingGroupsSort,
    handleListingGroupsPageChange,
    handleUpdateListingGroupStatus,
    // Draft switch (refetch with draft_only when toggled)
    showDraftsOnlyShoppingAds,
    setShowDraftsOnlyShoppingAds,
  };
};
