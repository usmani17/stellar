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
          page_size: 10,
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
      const productGroupId = productGroup.id ?? productGroup.product_group_id;

      // Call API - use the dedicated product groups bulk update endpoint
      await googleAdwordsProductGroupsService.bulkUpdateGoogleProductGroups(accountIdNum, channelIdNum, {
        productGroupIds: [productGroupId],
        action: "status",
        status: status as "ENABLED" | "PAUSED" | "REMOVED",
        campaignId: campaignId
          ? String(campaignId)
          : undefined,
        adGroupId: adGroupId
          ? String(adGroupId)
          : undefined,
      });

      // Update local state (match by composite key)
      setProductGroups((prevProductGroups) =>
        prevProductGroups.map((pg) =>
          getProductGroupSelectionKey(pg) === selectionKey ? { ...pg, status } : pg
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
  }, [accountId, channelId, productGroups, loadProductGroups, onError, getProductGroupSelectionKey]);

  return {
    // Data
    productGroups,
    productGroupsLoading,
    getProductGroupSelectionKey,
    
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
    selectedProductGroupIds: selectedProductGroupKeys,
    handleProductGroupsSort,
    handleProductGroupsPageChange,
    handleUpdateProductGroupStatus,
  };
};
