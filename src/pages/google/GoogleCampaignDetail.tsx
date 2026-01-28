import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { KPICard } from "../../components/ui/KPICard";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import { accountsService } from "../../services/accounts";
import type { FilterValues } from "../../components/filters/FilterPanel";
import { GoogleOverviewTab } from "./components/tabs/GoogleOverviewTab";
import { GoogleCampaignDetailAdGroupsTab } from "./components/tabs/GoogleCampaignDetailAdGroupsTab";
import { GoogleCampaignDetailAdsTab } from "./components/tabs/GoogleCampaignDetailAdsTab";
import { GoogleCampaignDetailKeywordsTab } from "./components/tabs/GoogleCampaignDetailKeywordsTab";
import { GoogleCampaignDetailNegativeKeywordsTab } from "./components/tabs/GoogleCampaignDetailNegativeKeywordsTab";
import { GoogleCampaignDetailAssetGroupsTab } from "./components/tabs/GoogleCampaignDetailAssetGroupsTab";
import { GoogleCampaignDetailProductGroupsTab } from "./components/tabs/GoogleCampaignDetailProductGroupsTab";
import { GoogleCampaignDetailLogsTab } from "./components/tabs/GoogleCampaignDetailLogsTab";
import { GoogleCampaignInformation } from "./components/GoogleCampaignInformation";
import { GoogleAssetManagementPanel } from "../../components/google/GoogleAssetManagementPanel";
import {
  CreateGoogleAdGroupPanel,
} from "../../components/google/CreateGoogleAdGroupPanel";
import {
  CreateGoogleAdPanel,
  type AdInput,
} from "../../components/google/CreateGoogleAdPanel";
import {
  CreateGoogleKeywordPanel,
  type KeywordInput,
} from "../../components/google/CreateGoogleKeywordPanel";
import {
  CreateGoogleNegativeKeywordPanel,
} from "../../components/google/CreateGoogleNegativeKeywordPanel";
import {
  CreateGooglePmaxAssetGroupPanel,
} from "../../components/google/CreateGooglePmaxAssetGroupPanel";
import {
  CreateGoogleShoppingEntitiesPanel,
  type ShoppingEntityInput,
} from "../../components/google/CreateGoogleShoppingEntitiesPanel";
import { CreateGooglePmaxAssetGroupSection } from "../../components/google/CreateGooglePmaxAssetGroupSection";
import { CreateGoogleShoppingEntitiesSection } from "../../components/google/CreateGoogleShoppingEntitiesSection";
import { CreateGoogleAdGroupSection } from "../../components/google/CreateGoogleAdGroupSection";
import { CreateGoogleAdSection } from "../../components/google/CreateGoogleAdSection";
import { CreateGoogleKeywordSection } from "../../components/google/CreateGoogleKeywordSection";
import { CreateGoogleNegativeKeywordSection } from "../../components/google/CreateGoogleNegativeKeywordSection";
import { ErrorModal } from "../../components/ui/ErrorModal";
import { Loader } from "../../components/ui/Loader";
import {
  formatCurrency2Decimals,
  formatPercentage,
  getSortIcon,
} from "./utils/campaignDetailHelpers";
import { useGoogleCampaignDetail } from "./hooks/useGoogleCampaignDetail";
import { useGoogleCampaignDetailAdGroups } from "./hooks/useGoogleCampaignDetailAdGroups";
import { useGoogleCampaignDetailAds } from "./hooks/useGoogleCampaignDetailAds";
import { useGoogleCampaignDetailKeywords } from "./hooks/useGoogleCampaignDetailKeywords";
import { useGoogleCampaignDetailNegativeKeywords } from "./hooks/useGoogleCampaignDetailNegativeKeywords";
import { useGoogleCampaignDetailAssetGroups } from "./hooks/useGoogleCampaignDetailAssetGroups";
import { useGoogleCampaignDetailProductGroups } from "./hooks/useGoogleCampaignDetailProductGroups";

interface GoogleCampaignDetail {
  campaign: {
    id: number;
    campaign_id: number;
    name: string;
    status: string;
    advertising_channel_type: string;
    advertising_channel_sub_type?: string;
    start_date?: string;
    end_date?: string;
    daily_budget: number;
    account_name?: string;
    customer_id?: string;
    last_sync?: string;
  };
  description?: string;
  chart_data?: Array<{
    date: string;
    spend?: number;
    sales?: number;
    clicks?: number;
    impressions?: number;
  }>;
  kpi_cards?: Array<{
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  }>;
}

// Types are now imported from ./components/tabs/GoogleTypes

export const GoogleCampaignDetail: React.FC = () => {
  const { accountId, campaignId } = useParams<{
    accountId: string;
    campaignId: string;
  }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [activeTab, setActiveTab] = useState("Overview");
  const [campaignAssetPanelOpen, setCampaignAssetPanelOpen] = useState(false);

  // Use campaign detail hook
  const {
    campaignDetail,
    loading,
    chartData,
    chartToggles,
    toggleChartMetric,
    handleUpdateCampaign,
  } = useGoogleCampaignDetail({
    accountId,
    campaignId,
    startDate,
    endDate,
  });

  // Get profileId for asset management (using customer_id to find profile)
  const [profileId, setProfileId] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchProfileId = async () => {
      if (!accountId || !campaignDetail?.campaign.customer_id) return;
      
      try {
        const accountIdNum = parseInt(accountId, 10);
        // Get channels for the account
        const channels = await accountsService.getAccountChannels(accountIdNum);
        // Find Google channel
        const googleChannel = channels.find(c => c.channel_type === "google");
        if (googleChannel?.id) {
          const profilesData = await accountsService.getGoogleProfiles(googleChannel.id, true);
          const profiles = profilesData.profiles || [];
          // Find profile matching customer_id
          const matchingProfile = profiles.find((p: any) => {
            const profileCustomerId = p.customer_id_raw || p.customer_id?.replace(/-/g, '');
            const campaignCustomerId = campaignDetail.campaign.customer_id?.replace(/-/g, '');
            return profileCustomerId === campaignCustomerId;
          });
          if (matchingProfile?.id) {
            setProfileId(matchingProfile.id);
          } else {
            // Fallback: use first profile or default to 21 for testing
            setProfileId(profiles[0]?.id || 21);
          }
        } else {
          // Default to 21 for testing if no channel found
          setProfileId(21);
        }
      } catch (err) {
        console.error("Failed to fetch profile ID:", err);
        // Default to 21 for testing
        setProfileId(21);
      }
    };
    
    if (campaignDetail?.campaign.customer_id) {
      fetchProfileId();
    }
  }, [accountId, campaignDetail?.campaign.customer_id]);

  // Use Negative Keywords hook
  const negativeKeywordsHook = useGoogleCampaignDetailNegativeKeywords({
    accountId,
    campaignId,
    startDate,
    endDate,
    activeTab,
    onSyncMessage: (message) => {
      setSyncMessage(message);
    },
    onError: (error) => {
      setErrorModal({
        isOpen: true,
        title: error.title,
        message: error.message,
        isSuccess: error.isSuccess || false,
      });
    },
  });

  // Destructure Negative Keywords hook values
  const {
    negativeKeywords,
    negativeKeywordsLoading,
    selectedNegativeKeywordIds,
    negativeKeywordsCurrentPage,
    setNegativeKeywordsCurrentPage,
    negativeKeywordsTotalPages,
    negativeKeywordsSortBy,
    negativeKeywordsSortOrder,
    isNegativeKeywordsFilterPanelOpen,
    setIsNegativeKeywordsFilterPanelOpen,
    negativeKeywordsFilters,
    setNegativeKeywordsFilters,
    syncingNegativeKeywords,
    isCreateNegativeKeywordPanelOpen,
    setIsCreateNegativeKeywordPanelOpen,
    createNegativeKeywordLoading,
    createNegativeKeywordError,
    setCreateNegativeKeywordError,
    createdNegativeKeywords,
    setCreatedNegativeKeywords,
    failedNegativeKeywords,
    setFailedNegativeKeywords,
    handleSelectAllNegativeKeywords,
    handleSelectNegativeKeyword,
    handleNegativeKeywordsSort,
    handleNegativeKeywordsPageChange,
    handleSyncNegativeKeywords,
    handleCreateNegativeKeywords,
    handleUpdateNegativeKeywordText,
    handleUpdateNegativeKeywordStatus,
    handleUpdateNegativeKeywordMatchType,
  } = negativeKeywordsHook;

  // Sync state (for entities not yet extracted to hooks)

  const [syncMessage, setSyncMessage] = useState<{
    type:
    | "adgroups"
    | "ads"
    | "keywords"
    | "negative_keywords"
    | "assetgroups"
    | "productgroups"
    | null;
    message: string | null;
  }>({ type: null, message: null });

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    isSuccess?: boolean;
    errorDetails?: Array<{
      entity?: string;
      type?: string;
      policy_name?: string;
      policy_description?: string;
      violating_text?: string;
      error_code?: string;
      message?: string;
      is_exemptible?: boolean;
      user_message?: string;
    }>;
  }>({ isOpen: false, message: "" });



  // Compute available tabs based on campaign type
  const tabs = useMemo(() => {
    if (!campaignDetail?.campaign?.advertising_channel_type) {
      return ["Overview", "Ad Groups", "Ads", "Keywords", "Logs"];
    }

    const channelType =
      campaignDetail.campaign.advertising_channel_type.toUpperCase();

    if (channelType === "PERFORMANCE_MAX") {
      return ["Overview", "Asset Groups", "Audience Signal", "Negative Keywords", "Logs"];
    } else if (channelType === "SHOPPING") {
      return ["Overview", "Ad Groups", "Product Groups", "Logs"];
    } else {
      // SEARCH or default
      return [
        "Overview",
        "Ad Groups",
        "Ads",
        "Keywords",
        "Negative Keywords",
        "Logs",
      ];
    }
  }, [campaignDetail?.campaign?.advertising_channel_type]);

  // Set page title
  useEffect(() => {
    const title = campaignDetail?.campaign?.name
      ? campaignDetail.campaign.name
      : "Google Campaign Detail";
    setPageTitle(title);
    return () => {
      resetPageTitle();
    };
  }, [campaignDetail]);


  const startDateStr = startDate?.toISOString();
  const endDateStr = endDate?.toISOString();

  useEffect(() => {
    // Reset state when campaignId changes
    setSyncMessage({ type: null, message: null });
  }, [accountId, campaignId, startDateStr, endDateStr]);

  // Reset pagination when date range, tab, or filters change
  // AdGroups pagination is now handled by useGoogleCampaignDetailAdGroups hook

  // Ads pagination reset is now handled by useGoogleCampaignDetailAds hook

  // Keywords pagination reset is now handled by useGoogleCampaignDetailKeywords hook

  useEffect(() => {
    if (activeTab === "Negative Keywords") {
      setNegativeKeywordsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, negativeKeywordsFilters]);


  // Removed buildAssetGroupsFilterParams - now passing filters array directly to service

  // Use Ads hook (after loadAds is defined - but we'll use the hook's loadAds)
  const adsHook = useGoogleCampaignDetailAds({
    accountId,
    campaignId,
    startDate,
    endDate,
    activeTab,
    onSyncMessage: (message) => {
      setSyncMessage(message);
    },
  });

  // Destructure Ads hook values
  const {
    ads,
    adsLoading,
    selectedAdIds,
    adsCurrentPage,
    setAdsCurrentPage,
    adsTotalPages,
    adsSortBy,
    adsSortOrder,
    isAdsFilterPanelOpen,
    setIsAdsFilterPanelOpen,
    adsFilters,
    setAdsFilters,
    syncingAds,
    syncingAdsAnalytics,
    handleSelectAllAds,
    handleSelectAd,
    handleAdsSort,
    handleAdsPageChange,
    handleSyncAds,
    handleSyncAdsAnalytics,
    handleUpdateAdStatus,
    loadAds: loadAdsFromHook,
  } = adsHook;

  // Use AdGroups hook (after loadAds is defined)
  const adGroupsHook = useGoogleCampaignDetailAdGroups({
    accountId,
    campaignId,
    startDate,
    endDate,
    activeTab,
    onError: (error) => {
      setErrorModal({
        isOpen: true,
        title: error.title,
        message: error.message,
        isSuccess: error.isSuccess || false,
      });
    },
    onReloadAds: loadAdsFromHook,
  });

  // Destructure AdGroups hook values for easier access
  const {
    adgroups,
    adgroupsLoading,
    selectedAdGroupIds,
    adgroupsCurrentPage,
    setAdgroupsCurrentPage,
    adgroupsTotalPages,
    adgroupsSortBy,
    adgroupsSortOrder,
    isAdGroupsFilterPanelOpen,
    setIsAdGroupsFilterPanelOpen,
    adgroupsFilters,
    setAdgroupsFilters,
    syncingAdGroups,
    syncingAdGroupsAnalytics,
    isCreateSearchEntitiesPanelOpen,
    setIsCreateSearchEntitiesPanelOpen,
    createSearchEntitiesLoading,
    setCreateSearchEntitiesLoading,
    setCreateSearchEntitiesError,
    isCreateShoppingEntitiesPanelOpen,
    setIsCreateShoppingEntitiesPanelOpen,
    createShoppingEntitiesLoading,
    createShoppingEntitiesError,
    setCreateShoppingEntitiesError,
    showAdGroupNameEditModal,
    setShowAdGroupNameEditModal,
    nameEditAdGroup,
    setNameEditAdGroup,
    nameEditValue,
    setNameEditValue,
    nameEditLoading,
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
    handleUpdateAdGroupStatus,
    handleUpdateAdGroupBid,
    loadAdGroups,
  } = adGroupsHook;

  // Use Keywords hook
  const keywordsHook = useGoogleCampaignDetailKeywords({
    accountId,
    campaignId,
    startDate,
    endDate,
    activeTab,
    onSyncMessage: (message) => {
      setSyncMessage(message);
    },
    onError: (error) => {
      setErrorModal({
        isOpen: true,
        title: error.title,
        message: error.message,
        isSuccess: error.isSuccess || false,
      });
    },
  });

  // Destructure Keywords hook values
  const {
    keywords,
    keywordsLoading,
    selectedKeywordIds,
    keywordsCurrentPage,
    setKeywordsCurrentPage,
    keywordsTotalPages,
    keywordsSortBy,
    keywordsSortOrder,
    isKeywordsFilterPanelOpen,
    setIsKeywordsFilterPanelOpen,
    keywordsFilters,
    setKeywordsFilters,
    syncingKeywords,
    syncingKeywordsAnalytics,
    showKeywordTextEditModal,
    setShowKeywordTextEditModal,
    keywordTextEditKeyword,
    setKeywordTextEditKeyword,
    keywordTextEditValue,
    setKeywordTextEditValue,
    keywordTextEditLoading,
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
    loadKeywords,
  } = keywordsHook;



  // Use Asset Groups hook
  const assetGroupsHook = useGoogleCampaignDetailAssetGroups({
    accountId,
    campaignId,
    startDate,
    endDate,
    activeTab,
    onSyncMessage: (message) => {
      setSyncMessage(message);
    },
    onError: (error) => {
      setErrorModal({
        isOpen: true,
        title: error.title,
        message: error.message,
        isSuccess: error.isSuccess || false,
      });
    },
  });

  // Destructure Asset Groups hook values
  const {
    assetGroups,
    assetGroupsLoading,
    selectedAssetGroupIds,
    assetGroupsCurrentPage,
    setAssetGroupsCurrentPage,
    assetGroupsTotalPages,
    assetGroupsSortBy,
    assetGroupsSortOrder,
    isAssetGroupsFilterPanelOpen,
    setIsAssetGroupsFilterPanelOpen,
    assetGroupsFilters,
    setAssetGroupsFilters,
    syncingAssetGroups,
    isCreatePmaxAssetGroupPanelOpen,
    setIsCreatePmaxAssetGroupPanelOpen,
    createPmaxAssetGroupLoading,
    createPmaxAssetGroupError,
    setCreatePmaxAssetGroupError,
    editingAssetGroupId,
    editingAssetGroupData,
    isEditAssetGroupPanelOpen,
    editAssetGroupLoading,
    editAssetGroupError,
    editLoadingAssetGroupId,
    refreshAssetGroupMessage,
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
    handleViewAssets,
    handleCloseViewAssetsModal,
    viewAssetsModalOpen,
    viewingAssetGroupName,
    assetGroupAssets,
    loadingAssets,
  } = assetGroupsHook;

  // Use Product Groups hook
  const productGroupsHook = useGoogleCampaignDetailProductGroups({
    accountId,
    campaignId,
    startDate,
    endDate,
    activeTab,
    onError: (error) => {
      setErrorModal({
        isOpen: true,
        title: error.title,
        message: error.message,
        isSuccess: error.isSuccess || false,
      });
    },
  });

  // Destructure Product Groups hook values
  const {
    productGroups,
    productGroupsLoading,
    selectedProductGroupIds,
    productGroupsCurrentPage,
    setProductGroupsCurrentPage,
    productGroupsTotalPages,
    productGroupsSortBy,
    productGroupsSortOrder,
    isProductGroupsFilterPanelOpen,
    setIsProductGroupsFilterPanelOpen,
    productGroupsFilters,
    setProductGroupsFilters,
    handleSelectAllProductGroups,
    handleSelectProductGroup,
    handleProductGroupsSort,
    handleProductGroupsPageChange,
    handleUpdateProductGroupStatus,
    loadProductGroups,
  } = productGroupsHook;

  // Switch away from hidden tabs when campaign type changes
  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab("Overview");
    }
  }, [tabs, activeTab]);

  // Removed all buildFilterParams functions - now passing filters array directly to services
  // Removed buildNegativeKeywordsFilterParams - now passing filters array directly to service
  // Keyword text edit handlers


  // handleCreateAdGroup is now in useGoogleCampaignDetailAdGroups hook

  // Handler for creating Ad (using existing adgroup)
  const handleCreateAd = async (entity: AdInput) => {
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

      // Build summary message - only count entities that were actually created
      // Note: We don't create adgroups anymore, only use existing ones
      const adCount = response.ad ? 1 : 0;
      const keywordCount = response.keywords ? response.keywords.length : 0;
      const errorCount = response.errors ? response.errors.length : 0;

      // Only count entities that exist in response
      const createdEntities: string[] = [];
      if (adCount > 0)
        createdEntities.push(`${adCount} ad${adCount !== 1 ? "s" : ""}`);
      if (keywordCount > 0)
        createdEntities.push(
          `${keywordCount} keyword${keywordCount !== 1 ? "s" : ""}`
        );

      const totalCreated = adCount + keywordCount;

        // Check for errors in response
        if (response.errors && response.errors.length > 0) {
          const summaryParts: string[] = [];
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

        // Don't set submitError - errors are shown in modal
        setErrorModal({
          isOpen: true,
          title: "Creation Summary",
          message: summaryMessage,
          isSuccess: false,
          errorDetails: response.error_details || undefined,
        });

        // Reload data to show new entities even if there are errors
        if (loadAdGroups) await loadAdGroups();
        await loadAdsFromHook();
      } else {
        // Success - close panel and show success message
        setIsCreateSearchEntitiesPanelOpen(false);
        const successMessage = totalCreated > 0
          ? `Successfully created ${totalCreated} ${totalCreated !== 1 ? "entities" : "entity"
            }:\n${createdEntities.map((e) => `• ${e}`).join("\n")}`
          : "Ad created successfully!";
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage.trim(),
          isSuccess: true,
        });

        // Reload data to show new entities
        if (loadAdGroups) await loadAdGroups();
        await loadAdsFromHook();
      }
    } catch (error: any) {
      console.error("Failed to create ad:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create ad. Please try again.";
      // Close panel and show error modal
      setIsCreateSearchEntitiesPanelOpen(false);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateSearchEntitiesLoading(false);
    }
  };

  // Handler for creating Keywords (using existing adgroup)
  const handleCreateKeywords = async (entity: KeywordInput) => {
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

      // Build summary message - only count entities that were actually created
      // Note: We don't create adgroups anymore, only use existing ones
      const adCount = response.ad ? 1 : 0;
      const keywordCount = response.keywords ? response.keywords.length : 0;
      const errorCount = response.errors ? response.errors.length : 0;

      // Only count entities that exist in response
      const createdEntities: string[] = [];
      if (adCount > 0)
        createdEntities.push(`${adCount} ad${adCount !== 1 ? "s" : ""}`);
      if (keywordCount > 0)
        createdEntities.push(
          `${keywordCount} keyword${keywordCount !== 1 ? "s" : ""}`
        );

      const totalCreated = adCount + keywordCount;

        // Check for errors in response
        if (response.errors && response.errors.length > 0) {
          const summaryParts: string[] = [];
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

        // Close panel and show error modal
        setIsCreateSearchEntitiesPanelOpen(false);
        setErrorModal({
          isOpen: true,
          title: "Creation Summary",
          message: summaryMessage,
          isSuccess: false,
          errorDetails: response.error_details || undefined,
        });

        // Reload data to show new entities even if there are errors
        if (loadAdGroups) await loadAdGroups();
        await loadKeywords();
      } else {
        // Success - close panel and show success message
        setIsCreateSearchEntitiesPanelOpen(false);
        const successMessage = totalCreated > 0
          ? `Successfully created ${totalCreated} ${totalCreated !== 1 ? "entities" : "entity"
            }:\n${createdEntities.map((e) => `• ${e}`).join("\n")}`
          : "Keywords created successfully!";
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage.trim(),
          isSuccess: true,
        });

        // Reload data to show new entities
        if (loadAdGroups) await loadAdGroups();
        await loadKeywords();
      }
    } catch (error: any) {
      console.error("Failed to create keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create keywords. Please try again.";
      // Close panel and show error modal
      setIsCreateSearchEntitiesPanelOpen(false);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateSearchEntitiesLoading(false);
    }
  };


  // handleCreateShoppingAdGroup is now in useGoogleCampaignDetailAdGroups hook

  // Handler for creating Shopping entities (ad group + product group)
  const handleCreateShoppingEntities = async (entity: ShoppingEntityInput) => {
    if (!accountId || !campaignId) return;

    setIsCreateShoppingEntitiesPanelOpen(true);
    // Note: createShoppingEntitiesLoading is managed by the hook

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        throw new Error("Invalid campaign ID");
      }

      const response = await googleAdwordsCampaignsService.createGoogleShoppingEntities(
        accountIdNum,
        campaignIdNum,
        entity
      );

      if (response.error) {
        // Close panel and show error modal
        setIsCreateShoppingEntitiesPanelOpen(false);
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: response.error,
          isSuccess: false,
        });
      } else {
        // Success - close panel and show success message
        setIsCreateShoppingEntitiesPanelOpen(false);
        const adgroupName = response.adgroup?.name || "Ad group";
        const successMessage = response.product_group
          ? `Product ad created successfully in "${adgroupName}"!`
          : `Ad group "${adgroupName}" created successfully!`;
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage,
          isSuccess: true,
        });

        // Reload data to show new entities
        if (loadAdGroups) await loadAdGroups();
        // Reload product groups if we're on the Product Groups tab
        if (activeTab === "Product Groups") {
          await loadProductGroups();
        }
      }
    } catch (error: any) {
      console.error("Failed to create shopping entities:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create entities. Please try again.";
      // Close panel and show error modal
      setIsCreateShoppingEntitiesPanelOpen(false);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    }
  };



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
            {/* Campaign Header - Matching Campaigns page style */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    navigate(`/brands/${accountId}/google-campaigns`)
                  }
                  className="flex items-center gap-2 text-[#072929] hover:text-[#136D6D] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h1 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                  {loading
                    ? "Loading..."
                    : campaignDetail
                      ? campaignDetail.campaign.name
                      : "Campaign Not Found"}
                </h1>
              </div>
              {/* View Campaign Assets Button - Only for PERFORMANCE_MAX campaigns */}
              {campaignDetail?.campaign.advertising_channel_type === "PERFORMANCE_MAX" && profileId && campaignId && (
                <button
                  onClick={() => setCampaignAssetPanelOpen(true)}
                  className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors text-sm font-medium"
                >
                  View Campaign Assets
                </button>
              )}
            </div>

            {/* Campaign Entity Information Card */}
            <GoogleCampaignInformation
              campaignDetail={campaignDetail}
              onUpdateCampaign={handleUpdateCampaign}
            />

            {/* KPI Cards */}
            {loading ? (
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-center py-8">
                  <Loader size="lg" message="Loading campaign data..." />
                </div>
              </div>
            ) : campaignDetail ? (
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-wrap gap-4 md:gap-7">
                  {campaignDetail.kpi_cards &&
                    campaignDetail.kpi_cards.length > 0 ? (
                    campaignDetail.kpi_cards.map((card, index) => (
                      <KPICard
                        key={index}
                        label={card.label}
                        value={card.value}
                        change={card.change}
                        isPositive={card.isPositive}
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                    ))
                  ) : (
                    // Default KPI cards with zero values if no data available - matching Google Ads terminology
                    <>
                      <KPICard
                        label="Cost"
                        value="$0"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                      <KPICard
                        label="Conv. value"
                        value="$0"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                      <KPICard
                        label="Impressions"
                        value="0"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                      <KPICard
                        label="Clicks"
                        value="0"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                      <KPICard
                        label="Conv. value / Cost"
                        value="0.00 x"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mb-4">
                <div className="text-center py-8 text-red-500">
                  Campaign not found
                </div>
              </div>
            )}

            {/* Tab Navigation & Chart Section */}
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
              {/* Tabs */}
              <div className="flex items-center gap-2 mb-8 border-b border-[#E6E6E6]">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-[16px] font-medium transition-colors border-b-2 cursor-pointer ${activeTab === tab
                      ? "border-[#136D6D] text-[#136D6D]"
                      : "border-transparent text-[#556179] hover:text-[#072929]"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "Overview" && (
                <GoogleOverviewTab
                  chartData={chartData}
                  chartToggles={chartToggles}
                  onToggleChartMetric={toggleChartMetric}
                />
              )}

              {activeTab === "Asset Groups" && (
                <>
                  {/* Create Asset Group Panel - Only for PERFORMANCE_MAX campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type ===
                    "PERFORMANCE_MAX" && (
                      <>
                        {isCreatePmaxAssetGroupPanelOpen && campaignId && (
                          <CreateGooglePmaxAssetGroupPanel
                            isOpen={isCreatePmaxAssetGroupPanelOpen}
                            onClose={() => {
                              setIsCreatePmaxAssetGroupPanelOpen(false);
                              setCreatePmaxAssetGroupError(null);
                            }}
                            onSubmit={handleCreatePmaxAssetGroup}
                            campaignId={campaignId}
                            loading={createPmaxAssetGroupLoading}
                            submitError={createPmaxAssetGroupError}
                            profileId={profileId}
                          />
                        )}
                        {isEditAssetGroupPanelOpen &&
                          editingAssetGroupId !== null &&
                          campaignId && (
                            <div data-edit-asset-group-panel>
                              <CreateGooglePmaxAssetGroupPanel
                                isOpen={isEditAssetGroupPanelOpen}
                                onClose={handleCloseEditPanel}
                                onSubmit={handleUpdateAssetGroup}
                                campaignId={campaignId}
                                loading={editAssetGroupLoading}
                                submitError={editAssetGroupError}
                                editMode={true}
                                initialData={editingAssetGroupData}
                                assetGroupId={editingAssetGroupId}
                                refreshMessage={refreshAssetGroupMessage}
                                profileId={profileId}
                              />
                            </div>
                          )}
                      </>
                    )}
                  <GoogleCampaignDetailAssetGroupsTab
                    assetGroups={assetGroups}
                    loading={assetGroupsLoading}
                    selectedAssetGroupIds={selectedAssetGroupIds}
                    onSelectAll={handleSelectAllAssetGroups}
                    onSelectAssetGroup={handleSelectAssetGroup}
                    sortBy={assetGroupsSortBy}
                    sortOrder={assetGroupsSortOrder}
                    onSort={handleAssetGroupsSort}
                    currentPage={assetGroupsCurrentPage}
                    totalPages={assetGroupsTotalPages}
                    onPageChange={handleAssetGroupsPageChange}
                    isFilterPanelOpen={isAssetGroupsFilterPanelOpen}
                    onToggleFilterPanel={() =>
                      setIsAssetGroupsFilterPanelOpen(
                        !isAssetGroupsFilterPanelOpen
                      )
                    }
                    filters={assetGroupsFilters}
                    onApplyFilters={(newFilters) => {
                      setAssetGroupsFilters(newFilters);
                      setAssetGroupsCurrentPage(1);
                    }}
                    syncMessage={
                      syncMessage.type === "assetgroups"
                        ? syncMessage.message
                        : null
                    }
                    formatPercentage={formatPercentage}
                    formatCurrency2Decimals={formatCurrency2Decimals}
                    getSortIcon={getSortIcon}
                    onEditAssetGroup={handleEditAssetGroup}
                    editLoadingAssetGroupId={editLoadingAssetGroupId}
                    onUpdateAssetGroupStatus={handleUpdateAssetGroupStatus}
                    profileId={profileId || undefined}
                    campaignId={campaignId}
                    onViewAssets={handleViewAssets}
                    viewAssetsModalOpen={viewAssetsModalOpen}
                    viewingAssetGroupName={viewingAssetGroupName}
                    assetGroupAssets={assetGroupAssets}
                    loadingAssets={loadingAssets}
                    onCloseViewAssetsModal={handleCloseViewAssetsModal}
                    createButton={
                      campaignDetail?.campaign.advertising_channel_type ===
                        "PERFORMANCE_MAX" ? (
                        <CreateGooglePmaxAssetGroupSection
                          isOpen={isCreatePmaxAssetGroupPanelOpen}
                          onToggle={() => {
                            setIsCreatePmaxAssetGroupPanelOpen(
                              !isCreatePmaxAssetGroupPanelOpen
                            );
                            setIsAssetGroupsFilterPanelOpen(false);
                            // Close edit panel when opening create panel
                            if (!isCreatePmaxAssetGroupPanelOpen) {
                              handleCloseEditPanel();
                            }
                          }}
                        />
                      ) : undefined
                    }
                  />
                </>
              )}

              {activeTab === "Audience Signal" && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-[14px] text-[#556179]">
                      Audience Signal functionality will be available soon.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "Ad Groups" && (
                <>
                  {/* Create Ad Group Panel - For SEARCH and SHOPPING campaigns */}
                  {(campaignDetail?.campaign.advertising_channel_type ===
                    "SEARCH" ||
                    campaignDetail?.campaign.advertising_channel_type ===
                    "SHOPPING") && (
                      <>
                        {campaignDetail?.campaign.advertising_channel_type ===
                          "SEARCH" &&
                          isCreateSearchEntitiesPanelOpen &&
                          campaignId && (
                            <CreateGoogleAdGroupPanel
                              isOpen={isCreateSearchEntitiesPanelOpen}
                              onClose={() => {
                                setIsCreateSearchEntitiesPanelOpen(false);
                                setCreateSearchEntitiesError(null);
                              }}
                              onSubmit={handleCreateAdGroup}
                              campaignId={campaignId}
                              campaignName={campaignDetail?.campaign.name}
                              loading={createSearchEntitiesLoading}
                              submitError={null}
                            />
                          )}
                        {campaignDetail?.campaign.advertising_channel_type ===
                          "SHOPPING" &&
                          isCreateShoppingEntitiesPanelOpen &&
                          campaignId && (
                            <CreateGoogleAdGroupPanel
                              isOpen={isCreateShoppingEntitiesPanelOpen}
                              onClose={() => {
                                setIsCreateShoppingEntitiesPanelOpen(false);
                                setCreateShoppingEntitiesError(null);
                              }}
                              onSubmit={handleCreateShoppingAdGroup}
                              campaignId={campaignId}
                              campaignName={campaignDetail?.campaign.name}
                              loading={createShoppingEntitiesLoading}
                              submitError={createShoppingEntitiesError}
                            />
                          )}
                      </>
                    )}
                  <GoogleCampaignDetailAdGroupsTab
                    adgroups={adgroups}
                    loading={adgroupsLoading}
                    selectedAdGroupIds={selectedAdGroupIds}
                    onSelectAll={handleSelectAllAdGroups}
                    onSelectAdGroup={handleSelectAdGroup}
                    sortBy={adgroupsSortBy}
                    sortOrder={adgroupsSortOrder}
                    onSort={handleAdGroupsSort}
                    currentPage={adgroupsCurrentPage}
                    totalPages={adgroupsTotalPages}
                    onPageChange={handleAdGroupsPageChange}
                    isFilterPanelOpen={isAdGroupsFilterPanelOpen}
                    onToggleFilterPanel={() =>
                      setIsAdGroupsFilterPanelOpen(!isAdGroupsFilterPanelOpen)
                    }
                    filters={adgroupsFilters}
                    onApplyFilters={(newFilters) => {
                      setAdgroupsFilters(newFilters);
                      setAdgroupsCurrentPage(1);
                    }}
                    syncing={syncingAdGroups}
                    onSync={handleSyncAdGroups}
                    syncingAnalytics={syncingAdGroupsAnalytics}
                    onSyncAnalytics={handleSyncAdGroupsAnalytics}
                    syncMessage={
                      syncMessage.type === "adgroups"
                        ? syncMessage.message
                        : null
                    }
                    formatPercentage={formatPercentage}
                    formatCurrency2Decimals={formatCurrency2Decimals}
                    getSortIcon={getSortIcon}
                    onUpdateAdGroupStatus={handleUpdateAdGroupStatus}
                    onUpdateAdGroupBid={handleUpdateAdGroupBid}
                    onStartNameEdit={handleStartAdGroupNameEdit}
                    accountId={accountId}
                    onBulkUpdateComplete={loadAdGroups}
                    createButton={
                      (campaignDetail?.campaign.advertising_channel_type ===
                        "SEARCH" ||
                        campaignDetail?.campaign.advertising_channel_type ===
                        "SHOPPING") ? (
                        <CreateGoogleAdGroupSection
                          isOpen={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SEARCH"
                              ? isCreateSearchEntitiesPanelOpen
                              : isCreateShoppingEntitiesPanelOpen
                          }
                          onToggle={() => {
                            if (
                              campaignDetail?.campaign
                                .advertising_channel_type === "SEARCH"
                            ) {
                              setIsCreateSearchEntitiesPanelOpen(
                                !isCreateSearchEntitiesPanelOpen
                              );
                            } else {
                              setIsCreateShoppingEntitiesPanelOpen(
                                !isCreateShoppingEntitiesPanelOpen
                              );
                            }
                            setIsAdGroupsFilterPanelOpen(false);
                          }}
                        />
                      ) : undefined
                    }
                  />
                </>
              )}

              {activeTab === "Ads" &&
                campaignDetail?.campaign.advertising_channel_type !==
                "PERFORMANCE_MAX" && (
                  <>
                    {/* Create Ad Panel - For SEARCH campaigns */}
                    {campaignDetail?.campaign.advertising_channel_type ===
                      "SEARCH" && (
                        <>
                          {isCreateSearchEntitiesPanelOpen && campaignId && (
                            <CreateGoogleAdPanel
                              isOpen={isCreateSearchEntitiesPanelOpen}
                              onClose={() => {
                                setIsCreateSearchEntitiesPanelOpen(false);
                                setCreateSearchEntitiesError(null);
                              }}
                              onSubmit={handleCreateAd}
                              campaignId={campaignId}
                              accountId={accountId || ""}
                              loading={createSearchEntitiesLoading}
                              submitError={null}
                            />
                          )}
                        </>
                      )}
                    {/* Create Product Ad Panel - For SHOPPING campaigns */}
                    {campaignDetail?.campaign.advertising_channel_type ===
                      "SHOPPING" && (
                        <>
                          {isCreateShoppingEntitiesPanelOpen &&
                            campaignId &&
                            accountId && (
                              <CreateGoogleShoppingEntitiesPanel
                                isOpen={isCreateShoppingEntitiesPanelOpen}
                                onClose={() => {
                                  setIsCreateShoppingEntitiesPanelOpen(false);
                                  setCreateShoppingEntitiesError(null);
                                }}
                                onSubmit={handleCreateShoppingEntities}
                                campaignId={campaignId}
                                accountId={accountId}
                                loading={createShoppingEntitiesLoading}
                                submitError={createShoppingEntitiesError}
                              />
                            )}
                        </>
                      )}
                    <GoogleCampaignDetailAdsTab
                      ads={ads}
                      loading={adsLoading}
                      selectedAdIds={selectedAdIds}
                      onSelectAll={handleSelectAllAds}
                      onSelectAd={handleSelectAd}
                      sortBy={adsSortBy}
                      sortOrder={adsSortOrder}
                      onSort={handleAdsSort}
                      currentPage={adsCurrentPage}
                      totalPages={adsTotalPages}
                      onPageChange={handleAdsPageChange}
                      isFilterPanelOpen={isAdsFilterPanelOpen}
                      onToggleFilterPanel={() =>
                        setIsAdsFilterPanelOpen(!isAdsFilterPanelOpen)
                      }
                      filters={adsFilters}
                      onApplyFilters={(newFilters) => {
                        setAdsFilters(newFilters);
                        setAdsCurrentPage(1);
                      }}
                      syncing={syncingAds}
                      onSync={handleSyncAds}
                      syncingAnalytics={syncingAdsAnalytics}
                      onSyncAnalytics={handleSyncAdsAnalytics}
                      syncMessage={
                        syncMessage.type === "ads" ? syncMessage.message : null
                      }
                      getSortIcon={getSortIcon}
                      onUpdateAdStatus={handleUpdateAdStatus}
                      formatCurrency={formatCurrency2Decimals}
                      formatPercentage={formatPercentage}
                      createButton={
                        campaignDetail?.campaign.advertising_channel_type ===
                          "SEARCH" ? (
                          <CreateGoogleAdSection
                            isOpen={isCreateSearchEntitiesPanelOpen}
                            onToggle={() => {
                              setIsCreateSearchEntitiesPanelOpen(
                                !isCreateSearchEntitiesPanelOpen
                              );
                              setIsAdsFilterPanelOpen(false);
                            }}
                          />
                        ) : campaignDetail?.campaign.advertising_channel_type ===
                          "SHOPPING" ? (
                          <CreateGoogleShoppingEntitiesSection
                            isOpen={isCreateShoppingEntitiesPanelOpen}
                            onToggle={() => {
                              setIsCreateShoppingEntitiesPanelOpen(
                                !isCreateShoppingEntitiesPanelOpen
                              );
                              setIsAdsFilterPanelOpen(false);
                            }}
                          />
                        ) : undefined
                      }
                    />
                  </>
                )}

              {activeTab === "Keywords" && (
                <>
                  {/* Create Keywords Panel - Only for SEARCH campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type ===
                    "SEARCH" && (
                      <>
                        {isCreateSearchEntitiesPanelOpen &&
                          campaignId &&
                          accountId && (
                            <CreateGoogleKeywordPanel
                              isOpen={isCreateSearchEntitiesPanelOpen}
                              onClose={() => {
                                setIsCreateSearchEntitiesPanelOpen(false);
                                setCreateSearchEntitiesError(null);
                              }}
                              onSubmit={handleCreateKeywords}
                              campaignId={campaignId}
                              accountId={accountId}
                              loading={createSearchEntitiesLoading}
                              submitError={null}
                            />
                          )}
                      </>
                    )}
                  <GoogleCampaignDetailKeywordsTab
                    keywords={keywords}
                    loading={keywordsLoading}
                    selectedKeywordIds={selectedKeywordIds}
                    onSelectAll={handleSelectAllKeywords}
                    onSelectKeyword={handleSelectKeyword}
                    sortBy={keywordsSortBy}
                    sortOrder={keywordsSortOrder}
                    onSort={handleKeywordsSort}
                    currentPage={keywordsCurrentPage}
                    totalPages={keywordsTotalPages}
                    onPageChange={handleKeywordsPageChange}
                    isFilterPanelOpen={isKeywordsFilterPanelOpen}
                    onToggleFilterPanel={() =>
                      setIsKeywordsFilterPanelOpen(!isKeywordsFilterPanelOpen)
                    }
                    accountId={accountId!}
                    filters={keywordsFilters}
                    onApplyFilters={(newFilters) => {
                      // Convert DynamicFilterValues to FilterValues format
                      const convertedFilters = newFilters.map((f) => ({
                        id: f.id,
                        field: f.field as FilterValues[0]["field"],
                        operator: f.operator,
                        value: f.value,
                      }));
                      setKeywordsFilters(convertedFilters);
                      setKeywordsCurrentPage(1);
                    }}
                    syncing={syncingKeywords}
                    onSync={handleSyncKeywords}
                    syncingAnalytics={syncingKeywordsAnalytics}
                    onSyncAnalytics={handleSyncKeywordsAnalytics}
                    syncMessage={
                      syncMessage.type === "keywords"
                        ? syncMessage.message
                        : null
                    }
                    getSortIcon={getSortIcon}
                    onUpdateKeywordStatus={handleUpdateKeywordStatus}
                    onUpdateKeywordBid={handleUpdateKeywordBid}
                    onUpdateKeywordMatchType={handleUpdateKeywordMatchType}
                    onStartKeywordTextEdit={handleStartKeywordTextEdit}
                    onStartFinalUrlEdit={handleStartFinalUrlEdit}
                    formatCurrency2Decimals={formatCurrency2Decimals}
                    createButton={
                      campaignDetail?.campaign.advertising_channel_type ===
                        "SEARCH" ? (
                        <CreateGoogleKeywordSection
                          isOpen={isCreateSearchEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateSearchEntitiesPanelOpen(
                              !isCreateSearchEntitiesPanelOpen
                            );
                            setIsKeywordsFilterPanelOpen(false);
                          }}
                        />
                      ) : undefined
                    }
                  />
                </>
              )}

              {activeTab === "Negative Keywords" && (
                <>
                  {/* Create Negative Keywords Panel */}
                  {isCreateNegativeKeywordPanelOpen &&
                    campaignId &&
                    accountId && (
                      <CreateGoogleNegativeKeywordPanel
                        isOpen={isCreateNegativeKeywordPanelOpen}
                        onClose={() => {
                          setIsCreateNegativeKeywordPanelOpen(false);
                          setCreateNegativeKeywordError(null);
                          setCreatedNegativeKeywords([]);
                          setFailedNegativeKeywords([]);
                        }}
                        onSubmit={handleCreateNegativeKeywords}
                        campaignId={campaignId}
                        accountId={accountId}
                        campaignType={
                          campaignDetail?.campaign?.advertising_channel_type
                        }
                        adgroups={adgroups}
                        loading={createNegativeKeywordLoading}
                        submitError={createNegativeKeywordError}
                        createdNegativeKeywords={createdNegativeKeywords}
                        failedNegativeKeywords={failedNegativeKeywords}
                      />
                    )}
                  <GoogleCampaignDetailNegativeKeywordsTab
                    negativeKeywords={negativeKeywords}
                    loading={negativeKeywordsLoading}
                    selectedNegativeKeywordIds={selectedNegativeKeywordIds}
                    onSelectAll={handleSelectAllNegativeKeywords}
                    onSelectNegativeKeyword={handleSelectNegativeKeyword}
                    sortBy={negativeKeywordsSortBy}
                    sortOrder={negativeKeywordsSortOrder}
                    onSort={handleNegativeKeywordsSort}
                    currentPage={negativeKeywordsCurrentPage}
                    totalPages={negativeKeywordsTotalPages}
                    onPageChange={handleNegativeKeywordsPageChange}
                    isFilterPanelOpen={isNegativeKeywordsFilterPanelOpen}
                    onToggleFilterPanel={() =>
                      setIsNegativeKeywordsFilterPanelOpen(
                        !isNegativeKeywordsFilterPanelOpen
                      )
                    }
                    filters={negativeKeywordsFilters}
                    onApplyFilters={(newFilters) => {
                      setNegativeKeywordsFilters(newFilters);
                      setNegativeKeywordsCurrentPage(1);
                    }}
                    syncing={syncingNegativeKeywords}
                    onSync={handleSyncNegativeKeywords}
                    syncMessage={
                      syncMessage.type === "negative_keywords"
                        ? syncMessage.message
                        : null
                    }
                    getSortIcon={getSortIcon}
                    onUpdateNegativeKeywordStatus={handleUpdateNegativeKeywordStatus}
                    onUpdateNegativeKeywordMatchType={handleUpdateNegativeKeywordMatchType}
                    onUpdateNegativeKeywordText={handleUpdateNegativeKeywordText}
                    campaignType={campaignDetail?.campaign?.advertising_channel_type}
                    createButton={
                      <CreateGoogleNegativeKeywordSection
                        isOpen={isCreateNegativeKeywordPanelOpen}
                        onToggle={() => {
                          setIsCreateNegativeKeywordPanelOpen(
                            !isCreateNegativeKeywordPanelOpen
                          );
                          setIsNegativeKeywordsFilterPanelOpen(false);
                        }}
                      />
                    }
                  />
                </>
              )}

              {activeTab === "Product Groups" && (
                <>
                  {/* Create Shopping Entities Panel - Only for SHOPPING campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type ===
                    "SHOPPING" && (
                      <>
                        {isCreateShoppingEntitiesPanelOpen &&
                          campaignId &&
                          accountId && (
                            <CreateGoogleShoppingEntitiesPanel
                              isOpen={isCreateShoppingEntitiesPanelOpen}
                              onClose={() => {
                                setIsCreateShoppingEntitiesPanelOpen(false);
                                setCreateShoppingEntitiesError(null);
                              }}
                              onSubmit={handleCreateShoppingEntities}
                              campaignId={campaignId}
                              accountId={accountId}
                              loading={createShoppingEntitiesLoading}
                              submitError={createShoppingEntitiesError}
                            />
                          )}
                      </>
                    )}
                  <GoogleCampaignDetailProductGroupsTab
                    productGroups={productGroups}
                    loading={productGroupsLoading}
                    selectedProductGroupIds={selectedProductGroupIds}
                    onSelectAll={handleSelectAllProductGroups}
                    onSelectProductGroup={handleSelectProductGroup}
                    sortBy={productGroupsSortBy}
                    sortOrder={productGroupsSortOrder}
                    onSort={handleProductGroupsSort}
                    currentPage={productGroupsCurrentPage}
                    totalPages={productGroupsTotalPages}
                    onPageChange={handleProductGroupsPageChange}
                    isFilterPanelOpen={isProductGroupsFilterPanelOpen}
                    onToggleFilterPanel={() =>
                      setIsProductGroupsFilterPanelOpen(
                        !isProductGroupsFilterPanelOpen
                      )
                    }
                    filters={productGroupsFilters}
                    onApplyFilters={(newFilters) => {
                      setProductGroupsFilters(newFilters);
                      setProductGroupsCurrentPage(1);
                    }}
                    syncing={syncingAds}
                    onSync={handleSyncAds}
                    syncingAnalytics={syncingAdsAnalytics}
                    onSyncAnalytics={handleSyncAdsAnalytics}
                    syncMessage={
                      syncMessage.type === "ads" ? syncMessage.message : null
                    }
                    getSortIcon={getSortIcon}
                    formatCurrency2Decimals={formatCurrency2Decimals}
                    formatPercentage={formatPercentage}
                    onUpdateProductGroupStatus={handleUpdateProductGroupStatus}
                    createButton={
                      campaignDetail?.campaign.advertising_channel_type ===
                        "SHOPPING" ? (
                        <CreateGoogleShoppingEntitiesSection
                          isOpen={isCreateShoppingEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateShoppingEntitiesPanelOpen(
                              !isCreateShoppingEntitiesPanelOpen
                            );
                            // Close filter panel if exists
                          }}
                        />
                      ) : undefined
                    }
                  />
                </>
              )}

              {activeTab === "Logs" && accountId && (
                <GoogleCampaignDetailLogsTab
                  accountId={accountId}
                  campaignId={campaignId}
                />
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Ad Group Name Edit Modal */}
      {showAdGroupNameEditModal && nameEditAdGroup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !nameEditLoading) {
              setShowAdGroupNameEditModal(false);
              setNameEditAdGroup(null);
              setNameEditValue("");
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
              Edit Ad Group Name
            </h3>
            <div className="mb-6">
              <input
                type="text"
                value={nameEditValue}
                onChange={(e) => setNameEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !nameEditLoading) {
                    handleAdGroupNameEditSave();
                  } else if (e.key === "Escape" && !nameEditLoading) {
                    setShowAdGroupNameEditModal(false);
                    setNameEditAdGroup(null);
                    setNameEditValue("");
                  }
                }}
                disabled={nameEditLoading}
                autoFocus
                className="w-full px-4 py-2.5 text-[13.3px] text-black border-2 border-[#136D6D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter ad group name"
                maxLength={255}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!nameEditLoading) {
                    setShowAdGroupNameEditModal(false);
                    setNameEditAdGroup(null);
                    setNameEditValue("");
                  }
                }}
                disabled={nameEditLoading}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdGroupNameEditSave}
                disabled={nameEditLoading || !nameEditValue.trim()}
                className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {nameEditLoading ? (
                  <>
                    <Loader size="sm" variant="white" showMessage={false} className="!flex-row" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
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
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleKeywordTextEditSave}
                disabled={keywordTextEditLoading || !keywordTextEditValue.trim()}
                className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {keywordTextEditLoading ? (
                  <>
                    <Loader size="sm" variant="white" showMessage={false} className="!flex-row" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
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
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalUrlEditSave}
                disabled={finalUrlEditLoading || !finalUrlValue.trim()}
                className="create-entity-button btn-sm"
              >
                {finalUrlEditLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
        title={errorModal.title || (errorModal.isSuccess ? "Success" : "Error")}
        message={errorModal.message}
        isSuccess={errorModal.isSuccess}
        errorDetails={errorModal.errorDetails}
      />

      {/* Campaign Asset Management Panel */}
      {profileId && campaignId && (
        <GoogleAssetManagementPanel
          isOpen={campaignAssetPanelOpen}
          onClose={() => setCampaignAssetPanelOpen(false)}
          profileId={profileId}
          campaignId={campaignId}
          mode="campaign"
        />
      )}
    </div>
  );
};
