import { useState, useCallback, useEffect } from "react";
import { googleAdwordsAssetGroupsService } from "../../../services/googleAdwords/googleAdwordsAssetGroups";
import { googleAdwordsCampaignsService } from "../../../services/googleAdwords/googleAdwordsCampaigns";
import { campaignsService } from "../../../services/campaigns";
import type { FilterValues } from "../../../components/filters/FilterPanel";
import type { PmaxAssetGroupInput, AssetGroupInitialData } from "../../../components/google/CreateGooglePmaxAssetGroupPanel";

interface UseGoogleCampaignDetailAssetGroupsParams {
  accountId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onSyncMessage?: (message: { type: "assetgroups" | null; message: string | null }) => void;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
}

export const useGoogleCampaignDetailAssetGroups = ({
  accountId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onSyncMessage,
  onError,
}: UseGoogleCampaignDetailAssetGroupsParams) => {
  // Data state
  const [assetGroups, setAssetGroups] = useState<any[]>([]);
  const [assetGroupsLoading, setAssetGroupsLoading] = useState(false);
  const [selectedAssetGroupIds, setSelectedAssetGroupIds] = useState<Set<number>>(new Set());

  // Pagination state
  const [assetGroupsCurrentPage, setAssetGroupsCurrentPage] = useState(1);
  const [assetGroupsTotalPages, setAssetGroupsTotalPages] = useState(0);
  const [assetGroupsSortBy, setAssetGroupsSortBy] = useState<string>("id");
  const [assetGroupsSortOrder, setAssetGroupsSortOrder] = useState<"asc" | "desc">("asc");

  // Filter state
  const [isAssetGroupsFilterPanelOpen, setIsAssetGroupsFilterPanelOpen] = useState(false);
  const [assetGroupsFilters, setAssetGroupsFilters] = useState<FilterValues>([]);

  // Sync state
  const [syncingAssetGroups, setSyncingAssetGroups] = useState(false);

  // Create panel state
  const [isCreatePmaxAssetGroupPanelOpen, setIsCreatePmaxAssetGroupPanelOpen] = useState(false);
  const [createPmaxAssetGroupLoading, setCreatePmaxAssetGroupLoading] = useState(false);
  const [createPmaxAssetGroupError, setCreatePmaxAssetGroupError] = useState<string | null>(null);

  // Edit panel state
  const [editingAssetGroupId, setEditingAssetGroupId] = useState<number | null>(null);
  const [editingAssetGroupData, setEditingAssetGroupData] = useState<AssetGroupInitialData | null>(null);
  const [isEditAssetGroupPanelOpen, setIsEditAssetGroupPanelOpen] = useState(false);
  const [editAssetGroupLoading, setEditAssetGroupLoading] = useState(false);
  const [editAssetGroupError, setEditAssetGroupError] = useState<string | null>(null);
  const [editLoadingAssetGroupId, setEditLoadingAssetGroupId] = useState<number | null>(null);
  const [refreshAssetGroupMessage, setRefreshAssetGroupMessage] = useState<{
    type: "loading" | "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  // Load asset groups
  const loadAssetGroups = useCallback(async () => {
    try {
      setAssetGroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAssetGroupsLoading(false);
        return;
      }

      const data = await googleAdwordsAssetGroupsService.getGoogleAssetGroups(
        accountIdNum,
        parseInt(campaignId, 10),
        {
          filters: assetGroupsFilters,
          page: assetGroupsCurrentPage,
          page_size: 10,
          sort_by: assetGroupsSortBy,
          order: assetGroupsSortOrder,
        }
      );

      setAssetGroups(data.asset_groups || []);
      setAssetGroupsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load asset groups:", error);
      setAssetGroups([]);
      setAssetGroupsTotalPages(0);
    } finally {
      setAssetGroupsLoading(false);
    }
  }, [
    accountId,
    campaignId,
    assetGroupsCurrentPage,
    assetGroupsSortBy,
    assetGroupsSortOrder,
    assetGroupsFilters,
  ]);

  // Load asset groups when dependencies change
  useEffect(() => {
    if (accountId && campaignId && activeTab === "Asset Groups") {
      loadAssetGroups();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    assetGroupsCurrentPage,
    assetGroupsSortBy,
    assetGroupsSortOrder,
    assetGroupsFilters,
    loadAssetGroups,
  ]);

  // Selection handlers
  const handleSelectAllAssetGroups = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAssetGroupIds(new Set(assetGroups.map((ag) => ag.id)));
    } else {
      setSelectedAssetGroupIds(new Set());
    }
  }, [assetGroups]);

  const handleSelectAssetGroup = useCallback((id: number, checked: boolean) => {
    setSelectedAssetGroupIds((prev) => {
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
  const handleAssetGroupsSort = useCallback((column: string) => {
    if (assetGroupsSortBy === column) {
      setAssetGroupsSortOrder(assetGroupsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAssetGroupsSortBy(column);
      setAssetGroupsSortOrder("asc");
    }
    setAssetGroupsCurrentPage(1);
  }, [assetGroupsSortBy, assetGroupsSortOrder]);

  // Page change handler
  const handleAssetGroupsPageChange = useCallback((page: number) => {
    setAssetGroupsCurrentPage(page);
  }, []);

  // Sync handler
  const handleSyncAssetGroups = useCallback(async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAssetGroups(true);
      if (onSyncMessage) {
        onSyncMessage({ type: null, message: null });
      }
      const result = await googleAdwordsAssetGroupsService.syncGoogleAssetGroups(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} asset groups`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      if (onSyncMessage) {
        onSyncMessage({ type: "assetgroups", message });
      }

      // Reset to first page and reload asset groups after sync
      if (result.synced > 0) {
        setAssetGroupsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAssetGroups();

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
      console.error("Failed to sync asset groups:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync asset groups from Google Ads";
      if (onSyncMessage) {
        onSyncMessage({ type: "assetgroups", message: errorMessage });
        setTimeout(() => {
          if (onSyncMessage) {
            onSyncMessage({ type: null, message: null });
          }
        }, 8000);
      }
    } finally {
      setSyncingAssetGroups(false);
    }
  }, [accountId, loadAssetGroups, onSyncMessage]);

  // Safe mapping function to convert API data to form data
  const mapApiDataToForm = useCallback((apiData: any): AssetGroupInitialData => {
    // Ensure minimum arrays for headlines (3 required) and descriptions (2 required)
    let headlinesArray: string[] = [];
    if (Array.isArray(apiData?.headlines) && apiData.headlines.length > 0) {
      headlinesArray = apiData.headlines;
    }
    // Pad to minimum 3 if needed
    while (headlinesArray.length < 3) {
      headlinesArray.push("");
    }

    let descriptionsArray: string[] = [];
    if (Array.isArray(apiData?.descriptions) && apiData.descriptions.length > 0) {
      descriptionsArray = apiData.descriptions;
    }
    // Pad to minimum 2 if needed
    while (descriptionsArray.length < 2) {
      descriptionsArray.push("");
    }

    return {
      asset_group_name: apiData?.asset_group_name || "",
      final_url: apiData?.final_urls?.[0] || apiData?.final_url || "",
      headlines: headlinesArray,
      descriptions: descriptionsArray,
      long_headline: apiData?.long_headline || "",
      marketing_image_url: apiData?.marketing_image_url || "",
      square_marketing_image_url: apiData?.square_marketing_image_url || "",
      business_name: apiData?.business_name || "",
      logo_url: apiData?.logo_url || "",
    };
  }, []);

  // Handler for creating Performance Max asset group
  const handleCreatePmaxAssetGroup = useCallback(async (entity: PmaxAssetGroupInput) => {
    if (!accountId || !campaignId) return;

    setCreatePmaxAssetGroupLoading(true);
    setCreatePmaxAssetGroupError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        throw new Error("Invalid campaign ID");
      }

      const response = await googleAdwordsCampaignsService.createGooglePmaxAssetGroup(
        accountIdNum,
        campaignIdNum,
        entity
      );

      if (response.error) {
        setIsCreatePmaxAssetGroupPanelOpen(false);
        setCreatePmaxAssetGroupError(null);
        if (onError) {
          onError({
            title: "Error",
            message: response.error,
            isSuccess: false,
          });
        }
      } else {
        setIsCreatePmaxAssetGroupPanelOpen(false);
        setCreatePmaxAssetGroupError(null);
        if (onError) {
          onError({
            title: "Success",
            message: "Asset group created successfully!",
            isSuccess: true,
          });
        }

        // Reload asset groups to show the newly created one
        await loadAssetGroups();
      }
    } catch (error: any) {
      console.error("Failed to create asset group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create asset group. Please try again.";
      setIsCreatePmaxAssetGroupPanelOpen(false);
      setCreatePmaxAssetGroupError(null);
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
          isSuccess: false,
        });
      }
    } finally {
      setCreatePmaxAssetGroupLoading(false);
    }
  }, [accountId, campaignId, loadAssetGroups, onError]);

  // Handler for editing asset group (fetches data when edit button is clicked)
  const handleEditAssetGroup = useCallback(async (assetGroup: any) => {
    if (!accountId || !campaignId) return;

    try {
      // Step 1: Show loading state immediately
      setEditLoadingAssetGroupId(assetGroup.id);
      setRefreshAssetGroupMessage({
        type: "loading",
        message: "Fetching latest asset group data from Google Ads API...",
      });
      setEditAssetGroupLoading(true);

      // Step 2: Open panel and close create panel
      setIsCreatePmaxAssetGroupPanelOpen(false);
      setCreatePmaxAssetGroupError(null);
      setIsEditAssetGroupPanelOpen(true);

      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        throw new Error("Invalid campaign ID");
      }

      // Step 3: Fetch data from API using refresh endpoint
      let refreshedCampaignData: any = null;
      try {
        const refreshResponse =
          await campaignsService.refreshGoogleCampaignFromAPI(
            accountIdNum,
            campaignIdNum
          );
        refreshedCampaignData = refreshResponse.campaign;
        setRefreshAssetGroupMessage({
          type: "success",
          message: "Asset group data refreshed from Google Ads API",
          details: refreshResponse.message || "Latest data loaded successfully",
        });
      } catch (refreshError: any) {
        console.warn(
          "Failed to refresh campaign from API, using cached data:",
          refreshError
        );
        const errorMessage =
          refreshError?.response?.data?.error ||
          refreshError?.message ||
          "Could not fetch latest from Google API";
        setRefreshAssetGroupMessage({
          type: "error",
          message: "Using cached data",
          details: errorMessage,
        });
        // Fallback: Fetch from database
        try {
          const campaignDetail = await googleAdwordsCampaignsService.getGoogleCampaignDetail(
            accountIdNum,
            campaignIdNum
          );
          refreshedCampaignData = campaignDetail?.campaign || null;
        } catch (detailError) {
          console.warn("Failed to fetch campaign detail:", detailError);
        }
      }

      // Step 4: Extract asset group data from extra_data
      const extra_data: any = refreshedCampaignData?.extra_data || {};
      const mappedData = mapApiDataToForm(extra_data);
      setEditingAssetGroupData(mappedData);
      setEditingAssetGroupId(assetGroup.asset_group_id);

      // Scroll to edit panel section after data is loaded
      setTimeout(() => {
        const editPanelElement = document.querySelector('[data-edit-asset-group-panel]');
        if (editPanelElement) {
          editPanelElement.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    } catch (error: any) {
      console.error("Failed to fetch asset group data:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Could not fetch latest from Google API";

      setRefreshAssetGroupMessage({
        type: "error",
        message: "Using cached data",
        details: errorMessage,
      });

      // Try to map from table row data as fallback
      if (assetGroup) {
        const fallbackData: AssetGroupInitialData = {
          asset_group_name: assetGroup.name || "",
          final_url: assetGroup.final_urls?.[0] || "",
          headlines: ["", "", ""],
          descriptions: ["", ""],
          long_headline: "",
          marketing_image_url: "",
          square_marketing_image_url: "",
          business_name: "",
          logo_url: "",
        };
        setEditingAssetGroupData(fallbackData);
        setEditingAssetGroupId(assetGroup.asset_group_id);
      }
    } finally {
      setEditAssetGroupLoading(false);
      setEditLoadingAssetGroupId(null);
    }
  }, [accountId, campaignId, mapApiDataToForm]);

  // Handler for updating asset group status
  const handleUpdateAssetGroupStatus = useCallback(async (
    assetGroupId: number,
    status: string
  ) => {
    if (!accountId || !campaignId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      const campaignIdNum = parseInt(campaignId, 10);

      if (isNaN(accountIdNum) || isNaN(campaignIdNum)) {
        throw new Error("Invalid account or campaign ID");
      }

      // Find the asset group to get asset_group_id
      const assetGroup = assetGroups.find((ag) => ag.id === assetGroupId);
      if (!assetGroup || !assetGroup.asset_group_id) {
        throw new Error("Asset group not found");
      }

      // Call API to update status
      await googleAdwordsAssetGroupsService.updateAssetGroupStatus(
        accountIdNum,
        assetGroup.asset_group_id,
        campaignIdNum,
        status as "ENABLED" | "PAUSED"
      );

      // Update local state
      setAssetGroups((prevAssetGroups) =>
        prevAssetGroups.map((ag) =>
          ag.id === assetGroupId ? { ...ag, status: status } : ag
        )
      );
    } catch (error: any) {
      console.error("Failed to update asset group status:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update asset group status";
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
          isSuccess: false,
        });
      }
      throw error;
    }
  }, [accountId, campaignId, assetGroups, onError]);

  // Handler for updating asset group
  const handleUpdateAssetGroup = useCallback(async (entity: PmaxAssetGroupInput) => {
    if (!accountId || !campaignId || !editingAssetGroupId) return;

    setEditAssetGroupLoading(true);
    setEditAssetGroupError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        throw new Error("Invalid campaign ID");
      }

      // Map form data to backend format
      const assetData = {
        asset_group_name: entity.asset_group.name,
        final_url: entity.asset_group.final_url,
        headlines: entity.assets.headlines,
        descriptions: entity.assets.descriptions,
        long_headline: entity.assets.long_headline,
        marketing_image_url: entity.assets.marketing_image_url,
        square_marketing_image_url: entity.assets.square_marketing_image_url,
        business_name: entity.assets.business_name,
        logo_url: entity.assets.logo_url,
      };

      // Call existing API
      await campaignsService.updateGooglePmaxAssetGroup(
        accountIdNum,
        campaignIdNum,
        assetData
      );

      if (onError) {
        onError({
          title: "Success",
          message: "Asset group updated successfully!",
          isSuccess: true,
        });
      }

      // Reload asset groups after successful update
      await loadAssetGroups();

      // Close panel and reset state on success
      handleCloseEditPanel();
    } catch (error: any) {
      console.error("Failed to update asset group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update asset group. Please try again.";
      setEditAssetGroupError(errorMessage);
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
          isSuccess: false,
        });
      }
    } finally {
      setEditAssetGroupLoading(false);
    }
  }, [accountId, campaignId, editingAssetGroupId, loadAssetGroups, onError]);

  // Handler to close edit panel and reset state
  const handleCloseEditPanel = useCallback(() => {
    setIsEditAssetGroupPanelOpen(false);
    setEditingAssetGroupId(null);
    setEditingAssetGroupData(null);
    setEditAssetGroupError(null);
    setRefreshAssetGroupMessage(null);
    setEditLoadingAssetGroupId(null);
  }, []);

  return {
    // Data
    assetGroups,
    setAssetGroups,
    assetGroupsLoading,
    selectedAssetGroupIds,
    
    // Pagination
    assetGroupsCurrentPage,
    setAssetGroupsCurrentPage,
    assetGroupsTotalPages,
    assetGroupsSortBy,
    assetGroupsSortOrder,
    
    // Filters
    isAssetGroupsFilterPanelOpen,
    setIsAssetGroupsFilterPanelOpen,
    assetGroupsFilters,
    setAssetGroupsFilters,
    
    // Sync
    syncingAssetGroups,
    
    // Create panel
    isCreatePmaxAssetGroupPanelOpen,
    setIsCreatePmaxAssetGroupPanelOpen,
    createPmaxAssetGroupLoading,
    createPmaxAssetGroupError,
    setCreatePmaxAssetGroupError,
    
    // Edit panel
    editingAssetGroupId,
    editingAssetGroupData,
    isEditAssetGroupPanelOpen,
    editAssetGroupLoading,
    editAssetGroupError,
    editLoadingAssetGroupId,
    refreshAssetGroupMessage,
    
    // Handlers
    loadAssetGroups,
    handleSelectAllAssetGroups,
    handleSelectAssetGroup,
    handleAssetGroupsSort,
    handleAssetGroupsPageChange,
    handleSyncAssetGroups,
    handleCreatePmaxAssetGroup,
    handleEditAssetGroup,
    handleUpdateAssetGroupStatus,
    handleUpdateAssetGroup,
    handleCloseEditPanel,
  };
};
