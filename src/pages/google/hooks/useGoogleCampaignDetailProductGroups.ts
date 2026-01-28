import { useState, useCallback, useEffect } from "react";
import { googleAdwordsAdsService } from "../../../services/googleAdwords/googleAdwordsAds";
import type { FilterValues } from "../../../components/filters/FilterPanel";

interface UseGoogleCampaignDetailProductGroupsParams {
  accountId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
}

export const useGoogleCampaignDetailProductGroups = ({
  accountId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onError,
}: UseGoogleCampaignDetailProductGroupsParams) => {
  // Data state
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [productGroupsLoading, setProductGroupsLoading] = useState(false);
  const [selectedProductGroupIds, setSelectedProductGroupIds] = useState<Set<number>>(new Set());

  // Pagination state
  const [productGroupsCurrentPage, setProductGroupsCurrentPage] = useState(1);
  const [productGroupsTotalPages, setProductGroupsTotalPages] = useState(0);
  const [productGroupsSortBy, setProductGroupsSortBy] = useState<string>("id");
  const [productGroupsSortOrder, setProductGroupsSortOrder] = useState<"asc" | "desc">("asc");

  // Filter state
  const [isProductGroupsFilterPanelOpen, setIsProductGroupsFilterPanelOpen] = useState(false);
  const [productGroupsFilters, setProductGroupsFilters] = useState<FilterValues>([]);

  // Load product groups
  const loadProductGroups = useCallback(async () => {
    try {
      setProductGroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setProductGroupsLoading(false);
        return;
      }

      // Product groups are stored in the ads table with ad_type = 'SHOPPING_PRODUCT_AD'
      // AND extra_data->>'is_product_group' = 'true'
      // Add filters to get only product groups (not shopping ads)
      const productGroupsFiltersWithType = [
        ...productGroupsFilters,
        { field: "ad_type", value: "SHOPPING_PRODUCT_AD" },
      ];

      const data = await googleAdwordsAdsService.getGoogleAds(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          filters: productGroupsFiltersWithType,
          page: productGroupsCurrentPage,
          page_size: 10,
          sort_by: productGroupsSortBy,
          order: productGroupsSortOrder,
          start_date: startDate
            ? startDate.toISOString().split("T")[0]
            : undefined,
          end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        }
      );

      // Filter to only show product groups (is_product_group: true)
      // Shopping ads have is_product_group: false or not set
      const productGroups = (data.ads || []).filter((ad: any) => {
        const extraData = ad.extra_data || {};
        // Include only ads where is_product_group is true
        return extraData.is_product_group === true;
      });

      setProductGroups(productGroups);
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
    campaignId,
    productGroupsCurrentPage,
    productGroupsSortBy,
    productGroupsSortOrder,
    startDate,
    endDate,
    productGroupsFilters,
  ]);

  // Load product groups when dependencies change
  useEffect(() => {
    if (accountId && campaignId && activeTab === "Product Groups") {
      loadProductGroups();
    }
  }, [
    accountId,
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

  // Selection handlers
  const handleSelectAllProductGroups = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedProductGroupIds(new Set(productGroups.map((pg) => pg.id)));
    } else {
      setSelectedProductGroupIds(new Set());
    }
  }, [productGroups]);

  const handleSelectProductGroup = useCallback((id: number, checked: boolean) => {
    setSelectedProductGroupIds((prev) => {
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

  // Update handler
  const handleUpdateProductGroupStatus = useCallback(async (productGroupId: number, status: string) => {
    if (!accountId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      // Find the product group to get ad_id
      // Product groups are stored in the ads table, so they have ad_id
      const productGroup = productGroups.find((pg) => pg.id === productGroupId);
      if (!productGroup) {
        if (onError) {
          onError({
            title: "Error",
            message: "Product group not found",
          });
        }
        return;
      }

      // Product groups come from the ads table, so they should have ad_id
      // Try both snake_case and camelCase field names
      const adId =
        (productGroup as any).ad_id ||
        (productGroup as any).adId;
      if (!adId) {
        if (onError) {
          onError({
            title: "Error",
            message: "Product group ad ID not found. Please sync product groups first.",
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

      // Call API - product groups use the same bulkUpdateGoogleAds endpoint
      // Include campaignId and adGroupId to only update this specific instance
      await googleAdwordsAdsService.bulkUpdateGoogleAds(accountIdNum, {
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

      // Update local state
      setProductGroups((prevProductGroups) =>
        prevProductGroups.map((pg) =>
          pg.id === productGroupId ? { ...pg, status } : pg
        )
      );
      
      // Reload to ensure data consistency
      await loadProductGroups();
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
  }, [accountId, productGroups, loadProductGroups, onError]);

  return {
    // Data
    productGroups,
    productGroupsLoading,
    selectedProductGroupIds,
    
    // Pagination
    productGroupsCurrentPage,
    setProductGroupsCurrentPage,
    productGroupsTotalPages,
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
    handleProductGroupsSort,
    handleProductGroupsPageChange,
    handleUpdateProductGroupStatus,
  };
};
