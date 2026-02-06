import { useState, useCallback, useEffect } from "react";
import { googleAdwordsProductGroupsService } from "../../../services/googleAdwords/googleAdwordsProductGroups";
import type { FilterValues } from "../../../components/filters/FilterPanel";
import { toLocalDateString } from "../../../utils/dateHelpers";

interface UseGoogleCampaignDetailProductGroupsParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
}

export const useGoogleCampaignDetailProductGroups = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onError,
}: UseGoogleCampaignDetailProductGroupsParams) => {
  // Data state
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [productGroupsLoading, setProductGroupsLoading] = useState(false);
  /** Composite key "adgroup_id-product_group_id" so selection is unique per row (same product_group_id can exist in multiple ad groups). */
  const [selectedProductGroupKeys, setSelectedProductGroupKeys] = useState<Set<string>>(new Set());

  const getProductGroupSelectionKey = useCallback((pg: { adgroup_id?: number; product_group_id?: number; id?: number }) => {
    const adgroupId = pg.adgroup_id ?? (pg as any).adGroupId ?? "";
    const productGroupId = pg.product_group_id ?? pg.id ?? "";
    return `${adgroupId}-${productGroupId}`;
  }, []);

  // Pagination state
  const [productGroupsCurrentPage, setProductGroupsCurrentPage] = useState(1);
  const [productGroupsTotalPages, setProductGroupsTotalPages] = useState(0);
  const [productGroupsSortBy, setProductGroupsSortBy] = useState<string>("id");
  const [productGroupsSortOrder, setProductGroupsSortOrder] = useState<"asc" | "desc">("asc");
  
  // Page size with localStorage persistence
  const [productGroupsPageSize, setProductGroupsPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('google_product_groups_page_size');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Filter state
  const [isProductGroupsFilterPanelOpen, setIsProductGroupsFilterPanelOpen] = useState(false);
  const [productGroupsFilters, setProductGroupsFilters] = useState<FilterValues>([]);

  // Load product groups
  const loadProductGroups = useCallback(async () => {
    try {
      setProductGroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;

      if (isNaN(accountIdNum) || !channelIdNum || !campaignId) {
        setProductGroupsLoading(false);
        return;
      }

      const data = await googleAdwordsProductGroupsService.getGoogleProductGroups(
        accountIdNum,
        channelIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          filters: productGroupsFilters,
          page: productGroupsCurrentPage,
          page_size: productGroupsPageSize,
          sort_by: productGroupsSortBy,
          order: productGroupsSortOrder,
          start_date: startDate ? toLocalDateString(startDate) : undefined,
          end_date: endDate ? toLocalDateString(endDate) : undefined,
        }
      );

      setProductGroups(data.ads || []);
      setProductGroupsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load product groups:", error);
      setProductGroups([]);
      setProductGroupsTotalPages(0);
    } finally {
      setProductGroupsLoading(false);
    }
  }, [
    accountId,
    channelId,
    campaignId,
    productGroupsCurrentPage,
    productGroupsPageSize,
    productGroupsSortBy,
    productGroupsSortOrder,
    startDate,
    endDate,
    productGroupsFilters,
  ]);

  // Load product groups when dependencies change
  useEffect(() => {
    if (accountId && channelId && campaignId && activeTab === "Product Groups") {
      loadProductGroups();
    }
  }, [
    accountId,
    channelId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    productGroupsCurrentPage,
    productGroupsSortBy,
    productGroupsSortOrder,
    productGroupsFilters,
    loadProductGroups,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    if (activeTab === "Product Groups") {
      setProductGroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, productGroupsFilters]);

  // Selection handlers (use composite key so one row doesn't select all rows with same product_group_id)
  const handleSelectAllProductGroups = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedProductGroupKeys(new Set(productGroups.map((pg) => getProductGroupSelectionKey(pg))));
    } else {
      setSelectedProductGroupKeys(new Set());
    }
  }, [productGroups, getProductGroupSelectionKey]);

  const handleSelectProductGroup = useCallback((key: string, checked: boolean) => {
    setSelectedProductGroupKeys((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  }, []);

  // Sort handler
  const handleProductGroupsSort = useCallback((column: string) => {
    if (productGroupsSortBy === column) {
      setProductGroupsSortOrder(productGroupsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setProductGroupsSortBy(column);
      setProductGroupsSortOrder("asc");
    }
    setProductGroupsCurrentPage(1);
  }, [productGroupsSortBy, productGroupsSortOrder]);

  // Page change handler
  const handleProductGroupsPageChange = useCallback((page: number) => {
    setProductGroupsCurrentPage(page);
  }, []);
  
  // Page size change handler with localStorage persistence
  const handleProductGroupsPageSizeChange = useCallback((newPageSize: number) => {
    setProductGroupsPageSize(newPageSize);
    setProductGroupsCurrentPage(1); // Reset to first page when page size changes
    localStorage.setItem('google_product_groups_page_size', newPageSize.toString());
  }, []);

  // Update handler (key = "adgroup_id-product_group_id")
  const handleUpdateProductGroupStatus = useCallback(async (selectionKey: string, status: string) => {
    if (!accountId || !channelId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

      // Find the product group by composite key
      const productGroup = productGroups.find((pg: any) => getProductGroupSelectionKey(pg) === selectionKey);
      if (!productGroup) {
        if (onError) {
          onError({
            title: "Error",
            message: "Product group not found",
          });
        }
        return;
      }

      // Get campaign_id and adgroup_id to filter the update to only this specific instance
      const campaignId =
        productGroup.campaign_id ||
        (productGroup as any).campaignId;
      const adGroupId =
        productGroup.adgroup_id ||
        (productGroup as any).adGroupId;
      // Use ad_id (which maps to adId in database) - this is the correct field for API calls
      const productGroupAdId = productGroup.ad_id ?? productGroup.id ?? productGroup.product_group_id;
      
      if (!productGroupAdId) {
        if (onError) {
          onError({
            title: "Error",
            message: "Product group ad ID not found. Please sync product groups first.",
          });
        }
        return;
      }

      // Update local state immediately for instant UI feedback
      setProductGroups((prevProductGroups) =>
        prevProductGroups.map((pg) =>
          getProductGroupSelectionKey(pg) === selectionKey ? { ...pg, status } : pg
        )
      );

      // Call API - use the dedicated product groups bulk update endpoint
      // Convert to string since backend expects text type for adId
      await googleAdwordsProductGroupsService.bulkUpdateGoogleProductGroups(accountIdNum, channelIdNum, {
        productGroupIds: [String(productGroupAdId)],
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
          const data = await googleAdwordsProductGroupsService.getGoogleProductGroups(
            accountIdNum,
            channelIdNum,
            parseInt(campaignId!, 10),
            undefined,
            {
              filters: productGroupsFilters,
              page: productGroupsCurrentPage,
              page_size: productGroupsPageSize,
              sort_by: productGroupsSortBy,
              order: productGroupsSortOrder,
              start_date: startDate ? toLocalDateString(startDate) : undefined,
              end_date: endDate ? toLocalDateString(endDate) : undefined,
            }
          );
          
          // Merge reloaded data but preserve our status update for this product group
          setProductGroups((prevProductGroups) => {
            const updatedProductGroup = prevProductGroups.find((pg) => getProductGroupSelectionKey(pg) === selectionKey);
            // Preserve status update if we still have it in local state (case-insensitive comparison)
            const normalizedStatus = status.toUpperCase();
            if (updatedProductGroup && updatedProductGroup.status?.toUpperCase() === normalizedStatus) {
              // Note: getGoogleProductGroups returns data.ads (product groups are stored in ads table)
              return (data.ads || []).map((reloadedPg) => {
                if (getProductGroupSelectionKey(reloadedPg) === selectionKey) {
                  return { ...reloadedPg, status };
                }
                return reloadedPg;
              });
            }
            return data.ads || [];
          });
          setProductGroupsTotalPages(data.total_pages || 0);
        } catch (error) {
          console.error("Failed to reload product groups after status update:", error);
          // Keep the local update even if reload fails
        }
      }, 500);
    } catch (error: any) {
      console.error("Failed to update product group status:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update product group status";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
      throw error;
    }
  }, [accountId, channelId, campaignId, productGroups, productGroupsFilters, productGroupsCurrentPage, productGroupsPageSize, productGroupsSortBy, productGroupsSortOrder, startDate, endDate, getProductGroupSelectionKey, onError]);

  return {
    // Data
    productGroups,
    productGroupsLoading,
    getProductGroupSelectionKey,
    
    // Pagination
    productGroupsCurrentPage,
    setProductGroupsCurrentPage,
    productGroupsTotalPages,
    productGroupsPageSize,
    handleProductGroupsPageSizeChange,
    productGroupsSortBy,
    productGroupsSortOrder,
    
    // Filters
    isProductGroupsFilterPanelOpen,
    setIsProductGroupsFilterPanelOpen,
    productGroupsFilters,
    setProductGroupsFilters,
    
    // Handlers
    loadProductGroups,
    handleSelectAllProductGroups,
    handleSelectProductGroup,
    selectedProductGroupIds: selectedProductGroupKeys,
    handleProductGroupsSort,
    handleProductGroupsPageChange,
    handleUpdateProductGroupStatus,
  };
};
