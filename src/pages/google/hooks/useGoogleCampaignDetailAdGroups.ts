import { useState, useCallback, useEffect } from "react";
import { googleAdwordsAdGroupsService } from "../../../services/googleAdwords/googleAdwordsAdGroups";
import { googleAdwordsCampaignsService } from "../../../services/googleAdwords/googleAdwordsCampaigns";
import type { GoogleAdGroup } from "../components/tabs/GoogleTypes";
import type { FilterValues } from "../../../components/filters/FilterPanel";
import type { AdGroupInput } from "../../../components/google/CreateGoogleAdGroupPanel";
import type { ShoppingEntityInput } from "../../../components/google/CreateGoogleShoppingEntitiesPanel";

interface UseGoogleCampaignDetailAdGroupsParams {
  accountId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
  onError?: (error: { title: string; message: string; isSuccess?: boolean }) => void;
  onReloadAds?: () => Promise<void> | void;
}

export const useGoogleCampaignDetailAdGroups = ({
  accountId,
  campaignId,
  startDate,
  endDate,
  activeTab,
  onError,
  onReloadAds,
}: UseGoogleCampaignDetailAdGroupsParams) => {
  // Data state
  const [adgroups, setAdgroups] = useState<GoogleAdGroup[]>([]);
  const [adgroupsLoading, setAdgroupsLoading] = useState(false);
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<number>>(
    new Set()
  );

  // Pagination state
  const [adgroupsCurrentPage, setAdgroupsCurrentPage] = useState(1);
  const [adgroupsTotalPages, setAdgroupsTotalPages] = useState(0);
  const [adgroupsSortBy, setAdgroupsSortBy] = useState<string>("id");
  const [adgroupsSortOrder, setAdgroupsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );

  // Filter state
  const [isAdGroupsFilterPanelOpen, setIsAdGroupsFilterPanelOpen] =
    useState(false);
  const [adgroupsFilters, setAdgroupsFilters] = useState<FilterValues>([]);

  // Sync state
  const [syncingAdGroups, setSyncingAdGroups] = useState(false);
  const [syncingAdGroupsAnalytics, setSyncingAdGroupsAnalytics] =
    useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "adgroups" | null;
    message: string | null;
  }>({ type: null, message: null });

  // Create panel state (for SEARCH campaigns)
  const [isCreateSearchEntitiesPanelOpen, setIsCreateSearchEntitiesPanelOpen] =
    useState(false);
  const [createSearchEntitiesLoading, setCreateSearchEntitiesLoading] =
    useState(false);
  const [createSearchEntitiesError, setCreateSearchEntitiesError] = useState<
    string | null
  >(null);

  // Create panel state (for SHOPPING campaigns)
  const [
    isCreateShoppingEntitiesPanelOpen,
    setIsCreateShoppingEntitiesPanelOpen,
  ] = useState(false);
  const [createShoppingEntitiesLoading, setCreateShoppingEntitiesLoading] =
    useState(false);
  const [createShoppingEntitiesError, setCreateShoppingEntitiesError] =
    useState<string | null>(null);

  // Name edit modal state
  const [showAdGroupNameEditModal, setShowAdGroupNameEditModal] = useState(false);
  const [nameEditAdGroup, setNameEditAdGroup] = useState<GoogleAdGroup | null>(null);
  const [nameEditValue, setNameEditValue] = useState<string>("");
  const [nameEditLoading, setNameEditLoading] = useState(false);

  // Load ad groups
  const loadAdGroups = useCallback(async () => {
    try {
      setAdgroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdgroupsLoading(false);
        return;
      }

      const data = await googleAdwordsAdGroupsService.getGoogleAdGroups(
        accountIdNum,
        parseInt(campaignId, 10),
        {
          filters: adgroupsFilters,
          page: adgroupsCurrentPage,
          page_size: 100,
          sort_by: adgroupsSortBy,
          order: adgroupsSortOrder,
        }
      );

      setAdgroups(data.adgroups || []);
      setAdgroupsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load ad groups:", error);
      setAdgroups([]);
      setAdgroupsTotalPages(0);
    } finally {
      setAdgroupsLoading(false);
    }
  }, [accountId, campaignId, adgroupsFilters, adgroupsCurrentPage, adgroupsSortBy, adgroupsSortOrder]);

  // Load ad groups when dependencies change
  useEffect(() => {
    if (
      accountId &&
      campaignId &&
      (activeTab === "Ad Groups" || activeTab === "Negative Keywords")
    ) {
      loadAdGroups();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    adgroupsCurrentPage,
    adgroupsSortBy,
    adgroupsSortOrder,
    adgroupsFilters,
    loadAdGroups,
  ]);

  // Selection handlers
  const handleSelectAllAdGroups = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAdGroupIds(new Set(adgroups.map((ag) => ag.id)));
    } else {
      setSelectedAdGroupIds(new Set());
    }
  }, [adgroups]);

  const handleSelectAdGroup = useCallback((id: number, checked: boolean) => {
    setSelectedAdGroupIds((prev) => {
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
  const handleAdGroupsSort = useCallback((column: string) => {
    if (adgroupsSortBy === column) {
      setAdgroupsSortOrder(adgroupsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdgroupsSortBy(column);
      setAdgroupsSortOrder("asc");
    }
    setAdgroupsCurrentPage(1);
  }, [adgroupsSortBy, adgroupsSortOrder]);

  // Page change handler
  const handleAdGroupsPageChange = useCallback((page: number) => {
    setAdgroupsCurrentPage(page);
  }, []);

  // Sync handlers
  const handleSyncAdGroups = useCallback(async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAdGroups(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleAdwordsAdGroupsService.syncGoogleAdGroups(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} ad groups`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "adgroups", message });

      // Reset to first page and reload adgroups after sync
      if (result.synced > 0) {
        setAdgroupsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAdGroups();

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ad groups:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ad groups from Google Ads";
      setSyncMessage({ type: "adgroups", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingAdGroups(false);
    }
  }, [accountId, loadAdGroups]);

  const handleSyncAdGroupsAnalytics = useCallback(async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAdGroupsAnalytics(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleAdwordsAdGroupsService.syncGoogleAdGroupAnalytics(
        accountIdNum,
        startDate ? startDate.toISOString() : undefined,
        endDate ? endDate.toISOString() : undefined
      );

      let message =
        result.message ||
        `Successfully synced adgroup analytics: ${result.rows_inserted || 0
        } inserted, ${result.rows_updated || 0} updated`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "adgroups", message });

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setAdgroupsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadAdGroups();
      }

      if ((result.rows_inserted || 0) > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync adgroup analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync adgroup analytics from Google Ads";
      setSyncMessage({ type: "adgroups", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingAdGroupsAnalytics(false);
    }
  }, [accountId, startDate, endDate, loadAdGroups]);

  // Create handlers
  const handleCreateAdGroup = useCallback(async (entity: AdGroupInput) => {
    if (!accountId || !campaignId) return;

    setCreateSearchEntitiesLoading(true);
    setCreateSearchEntitiesError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        throw new Error("Invalid campaign ID");
      }

      const response = await googleAdwordsCampaignsService.createGoogleSearchEntities(
        accountIdNum,
        campaignIdNum,
        entity
      );

      // Build summary message
      const adgroupCount = response.adgroup ? 1 : 0;
      const adCount = response.ad ? 1 : 0;
      const keywordCount = response.keywords ? response.keywords.length : 0;
      const errorCount = response.errors ? response.errors.length : 0;

      const createdEntities = [];
      if (adgroupCount > 0)
        createdEntities.push(
          `${adgroupCount} ad group${adgroupCount !== 1 ? "s" : ""}`
        );
      if (adCount > 0)
        createdEntities.push(`${adCount} ad${adCount !== 1 ? "s" : ""}`);
      if (keywordCount > 0)
        createdEntities.push(
          `${keywordCount} keyword${keywordCount !== 1 ? "s" : ""}`
        );

      const totalCreated = adgroupCount + adCount + keywordCount;

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        const summaryParts = [];
        if (totalCreated > 0) {
          summaryParts.push(
            `Successfully created: ${totalCreated} ${totalCreated !== 1 ? "entities" : "entity"
            } (${createdEntities.join(", ")})`
          );
        }
        if (errorCount > 0) {
          summaryParts.push(
            `Failed: ${errorCount} ${errorCount !== 1 ? "entities" : "entity"}`
          );
        }

        const summaryMessage = summaryParts.join("\n\n");

        setIsCreateSearchEntitiesPanelOpen(false);
        setCreateSearchEntitiesError(null);
        
        if (onError) {
          onError({
            title: "Creation Summary",
            message: summaryMessage,
            isSuccess: false,
          });
        }

        // Reload data to show new entities even if there are errors
        await loadAdGroups();
        if (onReloadAds) {
          await onReloadAds();
        }
      } else {
        // Success
        setIsCreateSearchEntitiesPanelOpen(false);
        setCreateSearchEntitiesError(null);
        const successMessage = `Successfully created ${totalCreated} ${totalCreated !== 1 ? "entities" : "entity"
          }:\n${createdEntities.map((e) => `• ${e}`).join("\n")}`;
        
        if (onError) {
          onError({
            title: "Success",
            message: successMessage.trim(),
            isSuccess: true,
          });
        }

        // Reload data to show new entities
        await loadAdGroups();
        if (onReloadAds) {
          await onReloadAds();
        }
      }
    } catch (error: any) {
      console.error("Failed to create ad group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create ad group. Please try again.";
      
      setIsCreateSearchEntitiesPanelOpen(false);
      setCreateSearchEntitiesError(null);
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
          isSuccess: false,
        });
      }
    } finally {
      setCreateSearchEntitiesLoading(false);
    }
  }, [accountId, campaignId, loadAdGroups, onError, onReloadAds]);

  const handleCreateShoppingAdGroup = useCallback(async (entity: AdGroupInput) => {
    if (!accountId || !campaignId) return;

    setCreateShoppingEntitiesLoading(true);
    setCreateShoppingEntitiesError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        throw new Error("Invalid campaign ID");
      }

      // Convert AdGroupInput to ShoppingEntityInput (only adgroup, no product_group)
      const shoppingEntity = {
        adgroup: entity.adgroup,
        product_group: {
          cpc_bid: 0.01, // Default bid, but this won't be used since we're only creating ad group
        },
      };

      const response = await googleAdwordsCampaignsService.createGoogleShoppingEntities(
        accountIdNum,
        campaignIdNum,
        shoppingEntity
      );

      if (response.error) {
        setIsCreateShoppingEntitiesPanelOpen(false);
        setCreateShoppingEntitiesError(null);
        
        if (onError) {
          onError({
            title: "Error",
            message: response.error,
            isSuccess: false,
          });
        }
      } else {
        // Success
        setIsCreateShoppingEntitiesPanelOpen(false);
        setCreateShoppingEntitiesError(null);
        const adgroupName = response.adgroup?.name || "Ad group";
        
        if (onError) {
          onError({
            title: "Success",
            message: `Ad group "${adgroupName}" created successfully!`,
            isSuccess: true,
          });
        }

        // Reload data to show new entities
        await loadAdGroups();
      }
    } catch (error: any) {
      console.error("Failed to create shopping ad group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create ad group. Please try again.";
      
      setIsCreateShoppingEntitiesPanelOpen(false);
      setCreateShoppingEntitiesError(null);
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
          isSuccess: false,
        });
      }
    } finally {
      setCreateShoppingEntitiesLoading(false);
    }
  }, [accountId, campaignId, loadAdGroups, onError]);

  // Name edit handlers
  const handleStartAdGroupNameEdit = useCallback((adgroup: GoogleAdGroup) => {
    setNameEditAdGroup(adgroup);
    setNameEditValue(adgroup.adgroup_name || adgroup.name || "");
    setShowAdGroupNameEditModal(true);
  }, []);

  const handleAdGroupNameEditSave = useCallback(async () => {
    if (!nameEditAdGroup || !accountId) return;

    const trimmedName = nameEditValue.trim();
    if (!trimmedName) {
      if (onError) {
        onError({
          title: "Validation Error",
          message: "Name cannot be empty",
        });
      }
      return;
    }

    const oldName = (nameEditAdGroup.adgroup_name || nameEditAdGroup.name || "").trim();
    if (trimmedName === oldName) {
      setShowAdGroupNameEditModal(false);
      setNameEditAdGroup(null);
      setNameEditValue("");
      return;
    }

    setNameEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
        adgroupIds: [nameEditAdGroup.adgroup_id],
        action: "name",
        name: trimmedName,
      });

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0]);
      }

      await loadAdGroups();
      setShowAdGroupNameEditModal(false);
      setNameEditAdGroup(null);
      setNameEditValue("");
    } catch (error: any) {
      console.error("Error updating adgroup name:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      
      if (onError) {
        onError({
          title: "Update Failed",
          message: `Failed to update adgroup name: ${errorMessage}`,
        });
      }
    } finally {
      setNameEditLoading(false);
    }
  }, [nameEditAdGroup, nameEditValue, accountId, loadAdGroups, onError]);

  // Update handlers
  const handleUpdateAdGroupStatus = useCallback(async (adgroupId: number, status: string) => {
    if (!accountId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      // Find the adgroup to get adgroup_id
      const adgroup = adgroups.find((ag) => ag.id === adgroupId);
      if (!adgroup || !adgroup.adgroup_id) {
        if (onError) {
          onError({
            title: "Error",
            message: "Ad group not found",
          });
        }
        return;
      }

      // Call API
      await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
        adgroupIds: [adgroup.adgroup_id],
        action: "status",
        status: status as "ENABLED" | "PAUSED",
      });

      // Update local state instead of reloading
      setAdgroups((prevAdgroups) =>
        prevAdgroups.map((ag) =>
          ag.id === adgroupId ? { ...ag, status: status } : ag
        )
      );
      // Reload to ensure data consistency
      await loadAdGroups();
    } catch (error: any) {
      console.error("Failed to update adgroup status:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update adgroup status";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
      throw error;
    }
  }, [accountId, adgroups, loadAdGroups, onError]);

  const handleUpdateAdGroupBid = useCallback(async (adgroupId: number, bid: number) => {
    if (!accountId) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) return;

      // Find the adgroup to get adgroup_id
      const adgroup = adgroups.find((ag) => ag.id === adgroupId);
      if (!adgroup || !adgroup.adgroup_id) {
        if (onError) {
          onError({
            title: "Error",
            message: "Ad group not found",
          });
        }
        return;
      }

      // Call API
      await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(accountIdNum, {
        adgroupIds: [adgroup.adgroup_id],
        action: "bid",
        bid: bid,
      });

      // Update local state
      setAdgroups((prevAdgroups) =>
        prevAdgroups.map((ag) =>
          ag.id === adgroupId
            ? { ...ag, cpc_bid_dollars: bid }
            : ag
        )
      );
      // Reload to ensure data consistency
      await loadAdGroups();
    } catch (error: any) {
      console.error("Failed to update adgroup bid:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update adgroup bid";
      
      if (onError) {
        onError({
          title: "Error",
          message: errorMessage,
        });
      }
      throw error;
    }
  }, [accountId, adgroups, loadAdGroups, onError]);

  return {
    // Data
    adgroups,
    setAdgroups, // Expose setter for local state updates
    adgroupsLoading,
    selectedAdGroupIds,
    
    // Pagination
    adgroupsCurrentPage,
    setAdgroupsCurrentPage, // Expose setter for pagination
    adgroupsTotalPages,
    adgroupsSortBy,
    adgroupsSortOrder,
    
    // Filters
    isAdGroupsFilterPanelOpen,
    setIsAdGroupsFilterPanelOpen,
    adgroupsFilters,
    setAdgroupsFilters,
    
    // Sync
    syncingAdGroups,
    syncingAdGroupsAnalytics,
    syncMessage: syncMessage.type === "adgroups" ? syncMessage.message : null,
    
    // Create panels
    isCreateSearchEntitiesPanelOpen,
    setIsCreateSearchEntitiesPanelOpen,
    createSearchEntitiesLoading,
    setCreateSearchEntitiesLoading, // Expose setter for loading state
    createSearchEntitiesError,
    setCreateSearchEntitiesError, // Expose setter for error clearing
    isCreateShoppingEntitiesPanelOpen,
    setIsCreateShoppingEntitiesPanelOpen,
    createShoppingEntitiesLoading,
    createShoppingEntitiesError,
    setCreateShoppingEntitiesError, // Expose setter for error clearing
    
    // Name edit
    showAdGroupNameEditModal,
    setShowAdGroupNameEditModal,
    nameEditAdGroup,
    setNameEditAdGroup,
    nameEditValue,
    setNameEditValue,
    nameEditLoading,
    
    // Handlers
    loadAdGroups,
    handleSelectAllAdGroups,
    handleSelectAdGroup,
    handleAdGroupsSort,
    handleAdGroupsPageChange,
    handleSyncAdGroups,
    handleSyncAdGroupsAnalytics,
    handleCreateAdGroup,
    handleCreateShoppingAdGroup,
    handleStartAdGroupNameEdit,
    handleAdGroupNameEditSave,
    
    // Update handlers
    handleUpdateAdGroupStatus,
    handleUpdateAdGroupBid,
  };
};
