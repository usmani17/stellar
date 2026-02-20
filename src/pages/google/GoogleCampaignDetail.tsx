import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Assistant } from "../../components/layout/Assistant";
import { KPICard } from "../../components/ui/KPICard";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import { googleAdwordsAdGroupsService } from "../../services/googleAdwords/googleAdwordsAdGroups";
import { accountsService } from "../../services/accounts";
import type { FilterValues } from "../../components/filters/FilterPanel";
import { GoogleOverviewTab } from "./components/tabs/GoogleOverviewTab";
import { GoogleCampaignDetailAdGroupsTab } from "./components/tabs/GoogleCampaignDetailAdGroupsTab";
import { GoogleCampaignDetailAdsTab } from "./components/tabs/GoogleCampaignDetailAdsTab";
import { GoogleCampaignDetailAssetsTab } from "./components/tabs/GoogleCampaignDetailAssetsTab";
import { GoogleCampaignDetailKeywordsTab } from "./components/tabs/GoogleCampaignDetailKeywordsTab";
import { GoogleCampaignDetailNegativeKeywordsTab } from "./components/tabs/GoogleCampaignDetailNegativeKeywordsTab";
import { GoogleCampaignDetailAssetGroupsTab } from "./components/tabs/GoogleCampaignDetailAssetGroupsTab";
import { GoogleCampaignDetailProductGroupsTab } from "./components/tabs/GoogleCampaignDetailProductGroupsTab";
import { GoogleCampaignDetailShoppingAdsTab } from "./components/tabs/GoogleCampaignDetailShoppingAdsTab";
import { GoogleCampaignDetailLogsTab } from "./components/tabs/GoogleCampaignDetailLogsTab";
import { GoogleCampaignInformation } from "./components/GoogleCampaignInformation";
import { GoogleAssetManagementPanel } from "../../components/google/GoogleAssetManagementPanel";
import { CreateGoogleAdGroupPanel } from "../../components/google/CreateGoogleAdGroupPanel";
import {
  CreateGoogleAdPanel,
  type AdInput,
} from "../../components/google/CreateGoogleAdPanel";
import {
  CreateGoogleKeywordPanel,
  type KeywordInput,
} from "../../components/google/CreateGoogleKeywordPanel";
import { CreateGoogleNegativeKeywordPanel } from "../../components/google/CreateGoogleNegativeKeywordPanel";
import { CreateGooglePmaxAssetGroupPanel } from "../../components/google/CreateGooglePmaxAssetGroupPanel";
import {
  CreateGoogleShoppingEntitiesPanel,
  type ShoppingEntityInput,
} from "../../components/google/CreateGoogleShoppingEntitiesPanel";
import {
  CreateGoogleShoppingAdPanel,
  type ShoppingAdInput,
} from "../../components/google/CreateGoogleShoppingAdPanel";
import { CreateGooglePmaxAssetGroupSection } from "../../components/google/CreateGooglePmaxAssetGroupSection";
import { CreateGoogleShoppingEntitiesSection } from "../../components/google/CreateGoogleShoppingEntitiesSection";
import { CreateGoogleShoppingAdSection } from "../../components/google/CreateGoogleShoppingAdSection";
import { CreateGoogleAdGroupSection } from "../../components/google/CreateGoogleAdGroupSection";
import { CreateGoogleDemandGenAdGroupPanel } from "../../components/google/CreateGoogleDemandGenAdGroupPanel";
import { CreateGoogleAdSection } from "../../components/google/CreateGoogleAdSection";
import { CreateGoogleKeywordSection } from "../../components/google/CreateGoogleKeywordSection";
import { CreateGoogleNegativeKeywordSection } from "../../components/google/CreateGoogleNegativeKeywordSection";
import { CreateGoogleDemandGenAdSection } from "../../components/google/CreateGoogleDemandGenAdSection";
import { CreateGoogleDemandGenAdPanel } from "../../components/google/CreateGoogleDemandGenAdPanel";
import { ErrorModal } from "../../components/ui/ErrorModal";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { Loader } from "../../components/ui/Loader";
import { Send } from "lucide-react";
import { CreateGoogleCampaignPanel } from "../../components/google/CreateGoogleCampaignPanel";
import type { CreateGoogleCampaignData } from "../../components/google/campaigns/types";
import { CAMPAIGN_STATUS_SAVED_DRAFT } from "../../constants/google";
import { googleAdwordsAdsService } from "../../services/googleAdwords/googleAdwordsAds";
import { googleAdwordsKeywordsService } from "../../services/googleAdwords/googleAdwordsKeywords";
import { googleAdwordsNegativeKeywordsService } from "../../services/googleAdwords/googleAdwordsNegativeKeywords";
import {
  formatCurrency2Decimals,
  formatPercentage,
  getSortIcon,
} from "./utils/campaignDetailHelpers";
import { useGoogleProfiles } from "../../hooks/queries/useGoogleProfiles";
import { useGoogleCampaignDetail } from "./hooks/useGoogleCampaignDetail";
import { useGoogleCampaignDetailAdGroups } from "./hooks/useGoogleCampaignDetailAdGroups";
import { useGoogleCampaignDetailAds } from "./hooks/useGoogleCampaignDetailAds";
import { useGoogleCampaignDetailKeywords } from "./hooks/useGoogleCampaignDetailKeywords";
import { useGoogleCampaignDetailNegativeKeywords } from "./hooks/useGoogleCampaignDetailNegativeKeywords";
import { useGoogleCampaignDetailAssetGroups } from "./hooks/useGoogleCampaignDetailAssetGroups";
import { useGoogleCampaignDetailProductGroups } from "./hooks/useGoogleCampaignDetailProductGroups";
import { useGoogleCampaignDetailShoppingAds } from "./hooks/useGoogleCampaignDetailShoppingAds";

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
  const { accountId, channelId, campaignId } = useParams<{
    accountId: string;
    channelId: string;
    campaignId: string;
  }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
  const { data: profilesData } = useGoogleProfiles(channelIdNum);
  const currencyCode = useMemo(() => {
    const profiles = profilesData?.profiles || [];
    const selected = profiles.find((p) => p.is_selected);
    return selected?.currency_code || undefined;
  }, [profilesData?.profiles]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [campaignAssetPanelOpen, setCampaignAssetPanelOpen] = useState(false);

  // Inline edit state management
  const [editingField, setEditingField] = useState<
    "budget" | "status" | "start_date" | "end_date" | null
  >(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditField, setInlineEditField] = useState<
    "budget" | "status" | "start_date" | "end_date" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");

  // Use campaign detail hook
  const {
    campaignDetail,
    loading,
    chartData,
    chartToggles,
    toggleChartMetric,
    handleUpdateCampaign,
    loadCampaignDetail,
  } = useGoogleCampaignDetail({
    accountId,
    channelId,
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
        const googleChannel = channels.find((c) => c.channel_type === "google");
        if (googleChannel?.id) {
          const profilesData = await accountsService.getGoogleProfiles(
            googleChannel.id,
            true,
          );
          const profiles = profilesData.profiles || [];
          // Find profile matching customer_id
          const matchingProfile = profiles.find((p: any) => {
            const profileCustomerId =
              p.customer_id_raw || p.customer_id?.replace(/-/g, "");
            const campaignCustomerId =
              campaignDetail.campaign.customer_id?.replace(/-/g, "");
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
    channelId,
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
    showDraftsOnlyNegativeKeywords,
    setShowDraftsOnlyNegativeKeywords,
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

  // Shopping Ad creation state
  const [isCreateShoppingAdPanelOpen, setIsCreateShoppingAdPanelOpen] =
    useState(false);
  const [createShoppingAdLoading, setCreateShoppingAdLoading] = useState(false);
  const [createShoppingAdError, setCreateShoppingAdError] = useState<
    string | null
  >(null);

  // Demand Gen Ad creation state
  const [isCreateDemandGenAdSectionOpen, setIsCreateDemandGenAdSectionOpen] =
    useState(false);
  const [createDemandGenAdLoading, setCreateDemandGenAdLoading] =
    useState(false);
  const [createDemandGenAdError, setCreateDemandGenAdError] = useState<
    string | null
  >(null);

  const handleCreateDemandGenAd = async (
    data: any,
    options?: { saveAsDraft?: boolean },
  ) => {
    setCreateDemandGenAdLoading(true);
    setCreateDemandGenAdError(null);

    try {
      const cid = campaignId ?? "";
      const { adgroup_id, ...adData } = data;
      const payload: any = {
        ad: adData,
        ...(adgroup_id != null && adgroup_id !== "" && { adgroup_id: Number(adgroup_id) || adgroup_id }),
        ...(options?.saveAsDraft && { save_as_draft: true }),
      };
      const response = await googleAdwordsAdsService.createDemandGenAd(
        parseInt(accountId || "", 10),
        parseInt(channelId, 10),
        cid,
        payload,
      );

      if (response?.ad) {
        setIsCreateDemandGenAdSectionOpen(false);
        loadAdsFromHook?.();
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: "Demand Gen ad created successfully!",
          isSuccess: true,
        });
      } else {
        setCreateDemandGenAdError(response?.error || "Failed to create ad");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ??
        err.message ??
        "An error occurred while creating the ad";
      setCreateDemandGenAdError(msg);
    } finally {
      setCreateDemandGenAdLoading(false);
    }
  };

  // Sync state (for entities not yet extracted to hooks)

  const [syncMessage, setSyncMessage] = useState<{
    type:
      | "adgroups"
      | "ads"
      | "assets"
      | "keywords"
      | "negative_keywords"
      | "assetgroups"
      | "productgroups"
      | "shoppingads"
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

  const isDraftCampaign = useMemo(() => {
    const status = (campaignDetail?.campaign?.status || "").toUpperCase();
    return (
      !loading &&
      !!campaignDetail &&
      (status === CAMPAIGN_STATUS_SAVED_DRAFT || status === "DRAFT")
    );
  }, [loading, campaignDetail]);

  const [publishDraftLoading, setPublishDraftLoading] = useState(false);
  const [isDraftCampaignEditPanelOpen, setIsDraftCampaignEditPanelOpen] =
    useState(false);
  const [draftCampaignFormLoading, setDraftCampaignFormLoading] =
    useState(false);

  // Publish draft sub-entity: show confirmation then call same creation endpoint (backend creates in Google and removes draft row)
  type PublishDraftEntity =
    | {
        type: "ad_group";
        entity: {
          id: number;
          adgroup_id?: number;
          adgroup_name?: string;
          name?: string;
        };
      }
    | {
        type: "keyword";
        entity: { id: number; keyword_id?: number; keyword_text?: string };
      }
    | { type: "ad"; entity: { id: number; ad_id?: number; ad_type?: string } }
    | {
        type: "negative_keyword";
        entity: { id: number; criterion_id?: string; keyword_text?: string };
      };
  const [publishDraftEntity, setPublishDraftEntity] =
    useState<PublishDraftEntity | null>(null);
  const [publishDraftSubmitting, setPublishDraftSubmitting] = useState(false);
  const [publishLoadingNegativeKeywordId, setPublishLoadingNegativeKeywordId] =
    useState<string | number | null>(null);

  const runPublishNegativeKeywordDraft = useCallback(
    async (n: { id: number; criterion_id?: string; keyword_text?: string }) => {
      if (!accountId || !channelId || !campaignId) return;
      const campaignIdStr = String(campaignId);
      if (campaignIdStr.toLowerCase().startsWith("draft-")) {
        setErrorModal({
          isOpen: true,
          message:
            "Publish the campaign first, then you can publish negative keywords.",
        });
        return;
      }
      const draftId = String(n.criterion_id ?? n.id);
      if (!draftId.startsWith("draft-")) {
        setErrorModal({
          isOpen: true,
          message: "Not a draft negative keyword.",
        });
        return;
      }
      setPublishLoadingNegativeKeywordId(n.criterion_id ?? n.id);
      try {
        await googleAdwordsNegativeKeywordsService.publishDraftNegativeKeyword(
          parseInt(accountId, 10),
          parseInt(channelId, 10),
          campaignIdStr,
          draftId,
        );
        setErrorModal({
          isOpen: true,
          message:
            "Draft negative keyword published successfully. The draft row will be removed.",
          isSuccess: true,
        });
        if (negativeKeywordsHook.loadNegativeKeywords)
          await negativeKeywordsHook.loadNegativeKeywords();
      } catch (err: any) {
        const raw =
          err?.response?.data?.error ??
          err?.response?.data?.message ??
          err?.message ??
          "Failed to publish draft.";
        const message =
          typeof raw === "string"
            ? raw
            : typeof (raw as any)?.user_message === "string"
              ? (raw as any).user_message
              : typeof (raw as any)?.message === "string"
                ? (raw as any).message
                : JSON.stringify(raw);
        setErrorModal({ isOpen: true, message });
      } finally {
        setPublishLoadingNegativeKeywordId(null);
      }
    },
    [
      accountId,
      channelId,
      campaignId,
      negativeKeywordsHook.loadNegativeKeywords,
    ],
  );

  const handlePublishAdGroupDraft = (adgroup: {
    id: number;
    adgroup_id?: number;
    adgroup_name?: string;
    name?: string;
  }) => {
    setPublishDraftEntity({ type: "ad_group", entity: adgroup });
  };

  /** Publish multiple draft ad groups to Google Ads (same logic as single publish, one by one). */
  const handleBulkPublishAdGroupDrafts = async (
    adgroups: Array<{ id: number; adgroup_id?: number }>
  ) => {
    if (!accountId || !channelId || !campaignId) return;
    const campaignIdStr = String(campaignId ?? "");
    if (campaignIdStr.toLowerCase().startsWith("draft-")) {
      throw new Error("Publish the campaign first, then you can publish ad groups.");
    }
    const accountIdNum = parseInt(accountId, 10);
    const channelIdNum = parseInt(channelId, 10);
    const campaignChannelType = (campaignDetail?.campaign?.advertising_channel_type ?? "")
      .toString()
      .toUpperCase()
      .replace(/\s+/g, "_");
    const isDemandGen = campaignChannelType === "DEMAND_GEN";
    for (const ag of adgroups) {
      const draftId = String(ag.adgroup_id ?? ag.id);
      if (!draftId.startsWith("draft-")) continue;
      if (isDemandGen) {
        const result = await googleAdwordsAdGroupsService.publishDemandGenDraftAdGroup(
          accountIdNum,
          channelIdNum,
          campaignId,
          draftId
        );
        if (result.error) {
          throw new Error(typeof result.error === "string" ? result.error : String(result.error));
        }
      } else {
        await googleAdwordsCampaignsService.publishGoogleSearchEntitiesDraft(
          accountIdNum,
          channelIdNum,
          campaignId,
          draftId
        );
      }
    }
    if (loadAdGroups) await loadAdGroups();
  };

  const handlePublishKeywordDraft = (keyword: {
    id: number;
    keyword_id?: number;
    keyword_text?: string;
  }) => {
    setPublishDraftEntity({ type: "keyword", entity: keyword });
  };
  const handlePublishAdDraft = (ad: {
    id: number;
    ad_id?: number;
    ad_type?: string;
    adgroup_id?: string | number;
  }) => {
    setPublishDraftEntity({ type: "ad", entity: ad });
  };
  /** Product groups: no dedicated publish API; prompt user to publish the ad group first. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature matches onPublishDraft prop
  const handlePublishProductGroupDraft = (_productGroup: unknown) => {
    setErrorModal({
      isOpen: true,
      message:
        "Publish the ad group that contains this product group first. Then the product group will be published with it.",
    });
  };
  const handlePublishNegativeKeywordDraft = (n: {
    id: number;
    criterion_id?: string;
    keyword_text?: string;
  }) => {
    setPublishDraftEntity({ type: "negative_keyword", entity: n });
  };

  const runPublishDraftEntity = async () => {
    if (!publishDraftEntity || !accountId || !channelId || !campaignId) return;
    setPublishDraftSubmitting(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (publishDraftEntity.type === "ad_group") {
        const campaignIdStr = String(campaignId ?? "");
        if (campaignIdStr.toLowerCase().startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message:
              "Publish the campaign first, then you can publish ad groups.",
          });
          return;
        }
        const draftId = String(
          publishDraftEntity.entity.adgroup_id ?? publishDraftEntity.entity.id,
        );
        if (!draftId.startsWith("draft-")) {
          setErrorModal({ isOpen: true, message: "Not a draft ad group." });
          return;
        }
        const campaignChannelType = (campaignDetail?.campaign?.advertising_channel_type ?? "").toString().toUpperCase().replace(/\s+/g, "_");
        const isDemandGen = campaignChannelType === "DEMAND_GEN";
        if (isDemandGen) {
          const result = await googleAdwordsAdGroupsService.publishDemandGenDraftAdGroup(
            accountIdNum,
            channelIdNum,
            campaignId,
            draftId,
          );
          if (result.error) {
            setErrorModal({ isOpen: true, message: typeof result.error === "string" ? result.error : String(result.error) });
            return;
          }
        } else {
          await googleAdwordsCampaignsService.publishGoogleSearchEntitiesDraft(
            accountIdNum,
            channelIdNum,
            campaignId,
            draftId,
          );
        }
        setErrorModal({
          isOpen: true,
          message:
            "Draft ad group published successfully. The draft row will be removed.",
          isSuccess: true,
        });
        if (loadAdGroups) await loadAdGroups();
      } else if (publishDraftEntity.type === "ad") {
        const campaignIdStr = String(campaignId ?? "");
        if (campaignIdStr.toLowerCase().startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message: "Publish the campaign first, then you can publish ads.",
          });
          return;
        }
        const adEntity = publishDraftEntity.entity as { adgroup_id?: string | number };
        if (adEntity.adgroup_id != null && String(adEntity.adgroup_id).toLowerCase().startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message: "Publish the ad group first before publishing this ad.",
          });
          return;
        }
        const draftId = String(
          publishDraftEntity.entity.ad_id ?? publishDraftEntity.entity.id,
        );
        if (!draftId.startsWith("draft-")) {
          setErrorModal({ isOpen: true, message: "Not a draft ad." });
          return;
        }
        await googleAdwordsAdsService.publishDemandGenDraftAd(
          accountIdNum,
          channelIdNum,
          campaignId,
          draftId,
          { adGroupId: adEntity.adgroup_id },
        );
        setErrorModal({
          isOpen: true,
          message:
            "Draft ad published successfully. The draft row will be removed.",
          isSuccess: true,
        });
        if (loadAdsFromHook) await loadAdsFromHook();
        if (loadShoppingAds) await loadShoppingAds();
      } else if (publishDraftEntity.type === "keyword") {
        const campaignIdStr = String(campaignId ?? "");
        if (campaignIdStr.toLowerCase().startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message:
              "Publish the campaign first, then you can publish keywords.",
          });
          return;
        }
        const kwEntity = publishDraftEntity.entity as { adgroup_id?: string | number };
        if (kwEntity.adgroup_id != null && String(kwEntity.adgroup_id).toLowerCase().startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message: "Publish the ad group first before publishing this keyword.",
          });
          return;
        }
        const draftId = String(
          publishDraftEntity.entity.keyword_id ?? publishDraftEntity.entity.id,
        );
        if (!draftId.startsWith("draft-")) {
          setErrorModal({ isOpen: true, message: "Not a draft keyword." });
          return;
        }
        await googleAdwordsKeywordsService.publishDraftKeyword(
          accountIdNum,
          channelIdNum,
          draftId,
          { campaignId: campaignIdStr, adGroupId: kwEntity.adgroup_id },
        );
        setErrorModal({
          isOpen: true,
          message:
            "Draft keyword published successfully. The draft row will be removed.",
          isSuccess: true,
        });
        if (loadKeywords) await loadKeywords();
      } else if (publishDraftEntity.type === "negative_keyword") {
        const campaignIdStr = String(campaignId ?? "");
        if (campaignIdStr.toLowerCase().startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message:
              "Publish the campaign first, then you can publish negative keywords.",
          });
          return;
        }
        const draftId = String(
          publishDraftEntity.entity.criterion_id ??
            publishDraftEntity.entity.id,
        );
        if (!draftId.startsWith("draft-")) {
          setErrorModal({
            isOpen: true,
            message: "Not a draft negative keyword.",
          });
          return;
        }
        await googleAdwordsNegativeKeywordsService.publishDraftNegativeKeyword(
          accountIdNum,
          channelIdNum,
          campaignIdStr,
          draftId,
        );
        setErrorModal({
          isOpen: true,
          message:
            "Draft negative keyword published successfully. The draft row will be removed.",
          isSuccess: true,
        });
        if (negativeKeywordsHook.loadNegativeKeywords)
          await negativeKeywordsHook.loadNegativeKeywords();
      }
    } catch (err: any) {
      const raw =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        "Failed to publish draft.";
      const message =
        typeof raw === "string"
          ? raw
          : typeof (raw as any)?.user_message === "string"
            ? (raw as any).user_message
            : typeof (raw as any)?.message === "string"
              ? (raw as any).message
              : JSON.stringify(raw);
      setErrorModal({
        isOpen: true,
        message,
      });
    } finally {
      setPublishDraftSubmitting(false);
      setPublishDraftEntity(null);
    }
  };

  const handlePublishDraftFromDetail = async (
    formData?: CreateGoogleCampaignData,
  ) => {
    if (!accountId || !channelId || !campaignId) return;
    const draftId = String(campaignId);
    if (!draftId.startsWith("draft-")) return;
    setPublishDraftLoading(true);
    try {
      await googleAdwordsCampaignsService.publishGoogleCampaignDraft(
        parseInt(accountId, 10),
        parseInt(channelId, 10),
        draftId,
        formData,
      );
      setIsDraftCampaignEditPanelOpen(false);
      setErrorModal({
        isOpen: true,
        message: "Draft published successfully. Redirecting to campaigns list.",
        isSuccess: true,
      });
      const channelIdNum = parseInt(channelId, 10);
      navigate(`/brands/${accountId}/${channelIdNum}/google/campaigns`);
    } catch (err: any) {
      const raw =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        "Failed to publish draft.";
      const message =
        typeof raw === "string"
          ? raw
          : typeof (raw as any)?.user_message === "string"
            ? (raw as any).user_message
            : typeof (raw as any)?.message === "string"
              ? (raw as any).message
              : JSON.stringify(raw);
      setErrorModal({ isOpen: true, message });
    } finally {
      setPublishDraftLoading(false);
    }
  };

  const handleUpdateDraftCampaign = async (data: CreateGoogleCampaignData) => {
    if (!accountId || !channelId || !campaignId) return;
    setDraftCampaignFormLoading(true);
    try {
      await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
        parseInt(accountId, 10),
        parseInt(channelId, 10),
        {
          campaignIds: [campaignId],
          name: data.name,
          status: data.status as "ENABLED" | "PAUSED",
          start_date: data.start_date,
          end_date: data.end_date,
          value: data.budget_amount,
          budget_name: data.budget_name,
          budget_resource_name: data.budget_resource_name,
          bidding_strategy_type: data.bidding_strategy_type,
        },
      );
      setIsDraftCampaignEditPanelOpen(false);
      setErrorModal({ isOpen: true, message: "Draft saved.", isSuccess: true });
      await loadCampaignDetail?.();
    } catch (err: any) {
      const raw =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        "Failed to save draft.";
      const message =
        typeof raw === "string"
          ? raw
          : typeof (raw as any)?.user_message === "string"
            ? (raw as any).user_message
            : typeof (raw as any)?.message === "string"
              ? (raw as any).message
              : JSON.stringify(raw);
      setErrorModal({ isOpen: true, message });
    } finally {
      setDraftCampaignFormLoading(false);
    }
  };

  const draftCampaignInitialData =
    useMemo((): Partial<CreateGoogleCampaignData> | null => {
      if (!campaignDetail?.campaign || !isDraftCampaign) return null;
      const c = campaignDetail.campaign as any;
      const extra =
        c.extra_data && typeof c.extra_data === "object" ? c.extra_data : {};
      const creationPayload =
        extra.creation_payload && typeof extra.creation_payload === "object"
          ? extra.creation_payload
          : {};
      return {
        name: c.name || "",
        status: (c.status?.toUpperCase() as "ENABLED" | "PAUSED") || "PAUSED",
        budget_amount: c.daily_budget ?? c.budget_amount,
        budget_name:
          c.budget_name ??
          c.campaign_budget_name ??
          c.campaignBudgetName ??
          creationPayload.budget_name,
        budget_resource_name:
          c.campaign_budget ??
          c.campaign_budget_resource_name ??
          creationPayload.budget_resource_name,
        start_date: c.start_date,
        end_date: c.end_date,
        campaign_type: (c.advertising_channel_type ||
          c.campaign_type ||
          "SEARCH") as any,
        bidding_strategy_type: c.bidding_strategy_type,
      };
    }, [campaignDetail?.campaign, isDraftCampaign]);

  // Normalized campaign channel type (DB may return "Demand Gen" or "DEMAND_GEN")
  const campaignChannelType = useMemo(() => {
    const raw = campaignDetail?.campaign?.advertising_channel_type;
    if (!raw) return "";
    return String(raw).toUpperCase().replace(/\s+/g, "_");
  }, [campaignDetail?.campaign?.advertising_channel_type]);

  // Compute available tabs based on campaign type
  const tabs = useMemo(() => {
    if (!campaignChannelType) {
      return ["Overview", "Ad Groups", "Ads", "Keywords", "Logs"];
    }

    if (campaignChannelType === "PERFORMANCE_MAX") {
      return ["Overview", "Asset Groups", "Negative Keywords", "Logs"];
    } else if (campaignChannelType === "SHOPPING") {
      return [
        "Overview",
        "Ad Groups",
        "Product Groups",
        "Shopping Ads",
        "Logs",
      ];
    } else if (campaignChannelType === "DEMAND_GEN") {
      return ["Overview", "Ad Groups", "Ads", "Assets", "Logs"];
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
  }, [campaignChannelType]);

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
    channelId,
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
    showDraftsOnlyAds,
    setShowDraftsOnlyAds,
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
    channelId,
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
    showDraftsOnlyAdGroups,
    setShowDraftsOnlyAdGroups,
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
    setCreateShoppingEntitiesLoading,
    createShoppingEntitiesError,
    setCreateShoppingEntitiesError,
    isCreateDemandGenAdGroupPanelOpen,
    setIsCreateDemandGenAdGroupPanelOpen,
    createDemandGenAdGroupLoading,
    createDemandGenAdGroupError,
    setCreateDemandGenAdGroupError,
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
    handleCreateDemandGenAdGroup,
    handleStartAdGroupNameEdit,
    handleAdGroupNameEditSave,
    handleUpdateAdGroupStatus,
    handleUpdateAdGroupBid,
    loadAdGroups,
  } = adGroupsHook;

  // Use Keywords hook
  const keywordsHook = useGoogleCampaignDetailKeywords({
    accountId,
    channelId,
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
    showDraftsOnlyKeywords,
    setShowDraftsOnlyKeywords,
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
    channelId,
    profileId,
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
    handleBulkUpdateAssetGroupStatus,
    handleUpdateAssetGroup,
    handleCloseEditPanel,
    handleViewAssets,
    handleCloseViewAssetsModal,
    handlePublishDraftAssetGroup,
    viewAssetsModalOpen,
    viewingAssetGroupName,
    assetGroupAssets,
    loadingAssets,
    showDraftsOnlyAssetGroups,
    setShowDraftsOnlyAssetGroups,
  } = assetGroupsHook;

  // Use Product Groups hook
  const productGroupsHook = useGoogleCampaignDetailProductGroups({
    accountId,
    channelId,
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
    getProductGroupSelectionKey,
    productGroupsCurrentPage,
    setProductGroupsCurrentPage,
    productGroupsTotalPages,
    productGroupsPageSize,
    handleProductGroupsPageSizeChange,
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
    showDraftsOnlyProductGroups,
    setShowDraftsOnlyProductGroups,
  } = productGroupsHook;

  // Use Shopping Ads hook
  const shoppingAdsHook = useGoogleCampaignDetailShoppingAds({
    accountId,
    channelId,
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

  // Destructure Shopping Ads hook values
  const {
    listingGroups: shoppingAds,
    listingGroupsLoading: shoppingAdsLoading,
    listingGroupsSummary: shoppingAdsSummary,
    selectedListingGroupIds: selectedShoppingAdIds,
    listingGroupsCurrentPage: shoppingAdsCurrentPage,
    setListingGroupsCurrentPage: setShoppingAdsCurrentPage,
    listingGroupsTotalPages: shoppingAdsTotalPages,
    listingGroupsSortBy: shoppingAdsSortBy,
    listingGroupsSortOrder: shoppingAdsSortOrder,
    isListingGroupsFilterPanelOpen: isShoppingAdsFilterPanelOpen,
    setIsListingGroupsFilterPanelOpen: setIsShoppingAdsFilterPanelOpen,
    listingGroupsFilters: shoppingAdsFilters,
    setListingGroupsFilters: setShoppingAdsFilters,
    handleSelectAllListingGroups: handleSelectAllShoppingAds,
    handleSelectListingGroup: handleSelectShoppingAd,
    handleListingGroupsSort: handleShoppingAdsSort,
    handleListingGroupsPageChange: handleShoppingAdsPageChange,
    handleUpdateListingGroupStatus: handleUpdateShoppingAdStatus,
    loadListingGroups: loadShoppingAds,
    showDraftsOnlyShoppingAds,
    setShowDraftsOnlyShoppingAds,
  } = shoppingAdsHook;

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
  const handleCreateAd = async (
    entity: AdInput,
    options?: { saveAsDraft?: boolean },
  ) => {
    if (!accountId || !campaignId) return;

    setCreateSearchEntitiesLoading(true);
    setCreateSearchEntitiesError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Invalid channel ID");
      }

      const campaignIdForApi = String(campaignId)
        .toLowerCase()
        .startsWith("draft-")
        ? campaignId
        : parseInt(campaignId, 10);
      if (typeof campaignIdForApi === "number" && isNaN(campaignIdForApi)) {
        throw new Error("Invalid campaign ID");
      }

      const payload = {
        ...entity,
        ...(options?.saveAsDraft && { save_as_draft: true }),
      };

      const response =
        await googleAdwordsCampaignsService.createGoogleSearchEntities(
          accountIdNum,
          channelIdNum,
          campaignIdForApi,
          payload,
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
          `${keywordCount} keyword${keywordCount !== 1 ? "s" : ""}`,
        );

      const totalCreated = adCount + keywordCount;

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        const summaryParts: string[] = [];
        if (totalCreated > 0) {
          summaryParts.push(
            `Successfully created: ${totalCreated} ${
              totalCreated !== 1 ? "entities" : "entity"
            } (${createdEntities.join(", ")})`,
          );
        }
        if (errorCount > 0) {
          summaryParts.push(
            `Failed: ${errorCount} ${errorCount !== 1 ? "entities" : "entity"}`,
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
        const successMessage =
          totalCreated > 0
            ? `Successfully created ${totalCreated} ${
                totalCreated !== 1 ? "entities" : "entity"
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
      // Keep panel open on error; show error modal
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
  const handleCreateKeywords = async (
    entity: KeywordInput,
    options?: { saveAsDraft?: boolean },
  ) => {
    if (!accountId || !campaignId) return;

    setCreateSearchEntitiesLoading(true);
    setCreateSearchEntitiesError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Invalid channel ID");
      }

      const campaignIdForApi = String(campaignId)
        .toLowerCase()
        .startsWith("draft-")
        ? campaignId
        : parseInt(campaignId, 10);
      if (typeof campaignIdForApi === "number" && isNaN(campaignIdForApi)) {
        throw new Error("Invalid campaign ID");
      }

      const payload = {
        ...entity,
        ...(options?.saveAsDraft && { save_as_draft: true }),
      };

      const response =
        await googleAdwordsCampaignsService.createGoogleSearchEntities(
          accountIdNum,
          channelIdNum,
          campaignIdForApi,
          payload,
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
          `${keywordCount} keyword${keywordCount !== 1 ? "s" : ""}`,
        );

      const totalCreated = adCount + keywordCount;

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        const summaryParts: string[] = [];
        if (totalCreated > 0) {
          summaryParts.push(
            `Successfully created: ${totalCreated} ${
              totalCreated !== 1 ? "entities" : "entity"
            } (${createdEntities.join(", ")})`,
          );
        }
        if (errorCount > 0) {
          summaryParts.push(
            `Failed: ${errorCount} ${errorCount !== 1 ? "entities" : "entity"}`,
          );
        }

        const summaryMessage = summaryParts.join("\n\n");

        // Keep panel open on error; show error modal
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
        const successMessage =
          totalCreated > 0
            ? `Successfully created ${totalCreated} ${
                totalCreated !== 1 ? "entities" : "entity"
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
      // Keep panel open on error; show error modal
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
  const handleCreateShoppingEntities = async (
    entity: ShoppingEntityInput,
    options?: { saveAsDraft?: boolean },
  ) => {
    if (!accountId || !campaignId) return;

    setIsCreateShoppingEntitiesPanelOpen(true);
    setCreateShoppingEntitiesError(null);
    setCreateShoppingEntitiesLoading(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Invalid channel ID");
      }

      const campaignIdForApi = String(campaignId).startsWith("draft-")
        ? campaignId
        : parseInt(campaignId, 10);
      if (typeof campaignIdForApi === "number" && isNaN(campaignIdForApi)) {
        throw new Error("Invalid campaign ID");
      }

      const payload = {
        ...entity,
        ...(options?.saveAsDraft && { save_as_draft: true }),
      };

      const response =
        await googleAdwordsCampaignsService.createGoogleShoppingEntities(
          accountIdNum,
          channelIdNum,
          campaignIdForApi as number,
          payload,
        );

      if (response.error) {
        // Keep panel open on error; show error modal
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
        const isDraftPg =
          options?.saveAsDraft ||
          response.product_group?.id?.toString().startsWith("draft-");
        const successMessage = response.product_group
          ? isDraftPg
            ? "Listing group saved as draft."
            : `Listing group created successfully in "${adgroupName}"!`
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
        // Reload shopping ads if we're on the Shopping Ads tab
        if (activeTab === "Shopping Ads") {
          await loadShoppingAds();
        }
      }
    } catch (error: any) {
      console.error("Failed to create shopping entities:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create entities. Please try again.";
      // Keep panel open on error; show error modal
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateShoppingEntitiesLoading(false);
    }
  };

  // Handler for creating Shopping Ad
  const handleCreateShoppingAd = async (
    entity: ShoppingAdInput,
    options?: { saveAsDraft?: boolean },
  ) => {
    if (!accountId || !campaignId) return;

    setIsCreateShoppingAdPanelOpen(true);
    setCreateShoppingAdError(null);
    setCreateShoppingAdLoading(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Invalid channel ID");
      }

      const campaignIdForApi = String(campaignId).startsWith("draft-")
        ? campaignId
        : parseInt(campaignId, 10);
      if (typeof campaignIdForApi === "number" && isNaN(campaignIdForApi)) {
        throw new Error("Invalid campaign ID");
      }

      const payload = {
        ...entity,
        ...(options?.saveAsDraft && { save_as_draft: true }),
      };

      const response =
        await googleAdwordsCampaignsService.createGoogleShoppingAd(
          accountIdNum,
          channelIdNum,
          campaignIdForApi as number,
          payload,
        );

      if (response.error) {
        // Keep panel open on error; show error modal
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: response.error,
          isSuccess: false,
        });
      } else {
        // Success - close panel and show success message
        setIsCreateShoppingAdPanelOpen(false);
        const adgroupName = response.adgroup?.name || "Ad group";
        const isDraft =
          options?.saveAsDraft ||
          response.ad?.id?.toString().startsWith("draft-");
        const successMessage = isDraft
          ? "Shopping ad saved as draft."
          : `Shopping ad created successfully in "${adgroupName}"!`;
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage,
          isSuccess: true,
        });

        // Reload data to show new entities
        if (loadAdGroups) await loadAdGroups();
        // Reload shopping ads if we're on the Shopping Ads tab; use page 1 and newest-first so the new ad appears
        if (activeTab === "Shopping Ads") {
          await loadShoppingAds({ page: 1, sortBy: "id", sortOrder: "desc" });
        }
      }
    } catch (error: any) {
      console.error("Failed to create shopping ad:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create shopping ad. Please try again.";
      // Keep panel open on error; show error modal
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateShoppingAdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 min-w-0 w-full h-screen flex flex-col"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <DashboardHeader />
        <Assistant>
          {/* Main Content Area */}
          <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
            <div className="space-y-6">
              {/* Campaign Header - Matching Campaigns page style */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const channelIdNum = channelId
                        ? parseInt(channelId, 10)
                        : undefined;
                      if (channelIdNum) {
                        navigate(
                          `/brands/${accountId}/${channelIdNum}/google/campaigns`,
                        );
                      }
                    }}
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
                {/* View Campaign Assets Button - Only for PERFORMANCE_MAX campaigns, not for drafts */}
                {campaignDetail?.campaign.advertising_channel_type ===
                  "PERFORMANCE_MAX" &&
                  !isDraftCampaign &&
                  profileId &&
                  campaignId && (
                    <button
                      onClick={() => setCampaignAssetPanelOpen(true)}
                      className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors text-sm font-medium"
                    >
                      View Campaign Assets
                    </button>
                  )}
              </div>

              {/* Draft campaign: show message and Edit/Publish button */}
              {isDraftCampaign && (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 max-w-2xl mb-4">
                  <p className="text-[#072929] text-base mb-4">
                    Edit & Publish
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const campaign = campaignDetail?.campaign as Record<string, unknown> | undefined;
                      if (!accountId || !channelId || !campaign) return;
                      navigate(
                        `/brands/${accountId}/${channelId}/google/campaigns`,
                        { state: { openCampaignForEdit: campaign } }
                      );
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5656] text-sm font-medium"
                  >
                    <Send className="w-4 h-4" aria-hidden />
                    Edit & Publish
                  </button>
                </div>
              )}

              {/* Campaign Entity Information Card - show for all campaigns (including draft) so inline edit works */}
              <GoogleCampaignInformation
                campaignDetail={campaignDetail}
                editingField={editingField}
                editedValue={editedValue}
                loading={loading}
                onEditField={(field) => {
                  setEditingField(field);
                  if (field === "status" && campaignDetail) {
                    const statusUpper =
                      campaignDetail.campaign.status?.toUpperCase() ||
                      "ENABLED";
                    setEditedValue(
                      statusUpper === "ENABLED" ? "ENABLED" : "PAUSED",
                    );
                  } else if (field === "budget" && campaignDetail) {
                    setEditedValue(
                      (campaignDetail.campaign.daily_budget || 0).toString(),
                    );
                  } else if (field === "start_date" && campaignDetail) {
                    setEditedValue(
                      campaignDetail.campaign.start_date
                        ? new Date(campaignDetail.campaign.start_date)
                            .toISOString()
                            .split("T")[0]
                        : "",
                    );
                  } else if (field === "end_date" && campaignDetail) {
                    setEditedValue(
                      campaignDetail.campaign.end_date
                        ? new Date(campaignDetail.campaign.end_date)
                            .toISOString()
                            .split("T")[0]
                        : "",
                    );
                  }
                }}
                onEditValueChange={setEditedValue}
                onEditEnd={(value, field) => {
                  if (!campaignDetail) return;
                  // Use the passed value and field if provided, otherwise use the state values
                  const valueToCompare =
                    value !== undefined ? value : editedValue;
                  const fieldToUse = field !== undefined ? field : editingField;

                  if (fieldToUse === "status") {
                    const rawCurrent = campaignDetail.campaign.status ?? "";
                    const rawNew = String(valueToCompare ?? "").trim();
                    const norm = (s: string) => {
                      const v = s.trim().toUpperCase();
                      if (v === "ENABLED") return "ENABLED";
                      if (v === "PAUSED") return "PAUSED";
                      return v || "ENABLED";
                    };
                    if (norm(rawCurrent) !== norm(rawNew)) {
                      setInlineEditField("status");
                      setInlineEditOldValue(
                        campaignDetail.campaign.status || "Enabled",
                      );
                      setInlineEditNewValue(valueToCompare);
                      setShowInlineEditModal(true);
                    } else {
                      setEditingField(null);
                      setEditedValue("");
                    }
                  } else if (fieldToUse === "budget") {
                    const budgetValue = parseFloat(valueToCompare);
                    const oldBudget = campaignDetail.campaign.daily_budget || 0;
                    if (!isNaN(budgetValue) && budgetValue !== oldBudget) {
                      setInlineEditField("budget");
                      setInlineEditOldValue(formatCurrency2Decimals(oldBudget));
                      setInlineEditNewValue(valueToCompare);
                      setShowInlineEditModal(true);
                    } else {
                      setEditingField(null);
                      setEditedValue("");
                    }
                  } else if (fieldToUse === "start_date") {
                    const oldStartDate = campaignDetail.campaign.start_date
                      ? new Date(campaignDetail.campaign.start_date)
                          .toISOString()
                          .split("T")[0]
                      : "";
                    const newStartDate = String(valueToCompare ?? "").trim();
                    if (newStartDate && newStartDate !== oldStartDate) {
                      setInlineEditField("start_date");
                      setInlineEditOldValue(
                        oldStartDate
                          ? new Date(oldStartDate).toLocaleDateString()
                          : "—",
                      );
                      setInlineEditNewValue(newStartDate);
                      setShowInlineEditModal(true);
                    } else {
                      setEditingField(null);
                      setEditedValue("");
                    }
                  } else if (fieldToUse === "end_date") {
                    const oldEndDate = campaignDetail.campaign.end_date
                      ? new Date(campaignDetail.campaign.end_date)
                          .toISOString()
                          .split("T")[0]
                      : "";
                    const newEndDate = String(valueToCompare ?? "").trim();
                    if (newEndDate && newEndDate !== oldEndDate) {
                      setInlineEditField("end_date");
                      setInlineEditOldValue(
                        oldEndDate
                          ? new Date(oldEndDate).toLocaleDateString()
                          : "—",
                      );
                      setInlineEditNewValue(newEndDate);
                      setShowInlineEditModal(true);
                    } else {
                      setEditingField(null);
                      setEditedValue("");
                    }
                  }
                }}
                onEditCancel={() => {
                  setEditingField(null);
                  setEditedValue("");
                }}
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

              {!loading && campaignDetail && !isDraftCampaign && (
                <>
                  {/* Tab Navigation & Chart Section - only visible once campaign is loaded */}
                  <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-8 border-b border-[#E6E6E6]">
                      {tabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 text-[16px] font-medium transition-colors border-b-2 cursor-pointer ${
                            activeTab === tab
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
                              !isAssetGroupsFilterPanelOpen,
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
                          onUpdateAssetGroupStatus={
                            handleUpdateAssetGroupStatus
                          }
                          onBulkUpdateAssetGroupStatus={
                            handleBulkUpdateAssetGroupStatus
                          }
                          profileId={profileId || undefined}
                          campaignId={campaignId}
                          onViewAssets={handleViewAssets}
                          viewAssetsModalOpen={viewAssetsModalOpen}
                          viewingAssetGroupName={viewingAssetGroupName}
                          assetGroupAssets={assetGroupAssets}
                          loadingAssets={loadingAssets}
                          onCloseViewAssetsModal={handleCloseViewAssetsModal}
                          showDraftsOnly={showDraftsOnlyAssetGroups}
                          onToggleDraftsOnly={() =>
                            setShowDraftsOnlyAssetGroups((v) => !v)
                          }
                          onPublishDraftAssetGroup={handlePublishDraftAssetGroup}
                          onBulkUpdateComplete={assetGroupsHook.loadAssetGroups}
                          createButton={
                            campaignDetail?.campaign
                              .advertising_channel_type ===
                            "PERFORMANCE_MAX" ? (
                              <CreateGooglePmaxAssetGroupSection
                                isOpen={isCreatePmaxAssetGroupPanelOpen}
                                onToggle={() => {
                                  setIsCreatePmaxAssetGroupPanelOpen(
                                    !isCreatePmaxAssetGroupPanelOpen,
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
                          createPanel={
                            campaignDetail?.campaign
                              .advertising_channel_type ===
                            "PERFORMANCE_MAX" ? (
                              <>
                                {isCreatePmaxAssetGroupPanelOpen &&
                                  campaignId && (
                                    <CreateGooglePmaxAssetGroupPanel
                                      isOpen={isCreatePmaxAssetGroupPanelOpen}
                                      onClose={() => {
                                        setIsCreatePmaxAssetGroupPanelOpen(
                                          false,
                                        );
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
                                        refreshMessage={
                                          refreshAssetGroupMessage
                                        }
                                        profileId={profileId}
                                      />
                                    </div>
                                  )}
                              </>
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
                            Audience Signal functionality will be available
                            soon.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === "Ad Groups" && (
                      <>
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
                            setIsAdGroupsFilterPanelOpen(
                              !isAdGroupsFilterPanelOpen,
                            )
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
                          onUpdateAdGroupName={async (
                            adgroupId: number,
                            name: string,
                          ) => {
                            if (!accountId || !channelId) return;
                            const accountIdNum = parseInt(accountId, 10);
                            const channelIdNum = parseInt(channelId, 10);
                            if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
                              throw new Error(
                                "Invalid account ID or channel ID",
                              );
                            }

                            // Find the adgroup to get adgroup_id
                            const adgroup = adgroups.find(
                              (ag) => ag.id === adgroupId,
                            );
                            if (!adgroup || !adgroup.adgroup_id) {
                              throw new Error("Ad group not found");
                            }

                            const trimmedName = name.trim();
                            if (!trimmedName) {
                              throw new Error("Name cannot be empty");
                            }

                            const response =
                              await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
                                accountIdNum,
                                channelIdNum,
                                {
                                  adgroupIds: [adgroup.adgroup_id],
                                  action: "name",
                                  name: trimmedName,
                                },
                              );

                            if (response.errors && response.errors.length > 0) {
                              throw new Error(response.errors[0]);
                            }

                            // Reload ad groups
                            if (loadAdGroups) {
                              await loadAdGroups();
                            }
                          }}
                          accountId={accountId}
                          channelId={channelId}
                          onBulkUpdateComplete={loadAdGroups}
                          showDraftsOnly={showDraftsOnlyAdGroups}
                          onToggleDraftsOnly={() => {
                            setShowDraftsOnlyAdGroups((p) => !p);
                            setAdgroupsCurrentPage(1);
                          }}
                          onPublishDraft={handlePublishAdGroupDraft}
                          publishLoadingId={
                            publishDraftEntity?.type === "ad_group" &&
                            publishDraftSubmitting
                              ? (publishDraftEntity.entity.adgroup_id ??
                                publishDraftEntity.entity.id)
                              : undefined
                          }
                          onBulkPublishDrafts={handleBulkPublishAdGroupDrafts}
                          createButton={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SEARCH" ||
                            campaignDetail?.campaign
                              .advertising_channel_type === "SHOPPING" ||
                            campaignDetail?.campaign
                              .advertising_channel_type === "DEMAND_GEN" ? (
                              <CreateGoogleAdGroupSection
                                isOpen={
                                  campaignDetail?.campaign
                                    .advertising_channel_type === "SEARCH"
                                    ? isCreateSearchEntitiesPanelOpen
                                    : campaignDetail?.campaign
                                          .advertising_channel_type ===
                                        "SHOPPING"
                                      ? isCreateShoppingEntitiesPanelOpen
                                      : isCreateDemandGenAdGroupPanelOpen
                                }
                                onToggle={() => {
                                  if (
                                    campaignDetail?.campaign
                                      .advertising_channel_type === "SEARCH"
                                  ) {
                                    setIsCreateSearchEntitiesPanelOpen(
                                      !isCreateSearchEntitiesPanelOpen,
                                    );
                                  } else if (
                                    campaignDetail?.campaign
                                      .advertising_channel_type === "SHOPPING"
                                  ) {
                                    setIsCreateShoppingEntitiesPanelOpen(
                                      !isCreateShoppingEntitiesPanelOpen,
                                    );
                                  } else {
                                    setIsCreateDemandGenAdGroupPanelOpen(
                                      !isCreateDemandGenAdGroupPanelOpen,
                                    );
                                  }
                                  setIsAdGroupsFilterPanelOpen(false);
                                }}
                              />
                            ) : undefined
                          }
                          createPanel={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SEARCH" ||
                            campaignDetail?.campaign
                              .advertising_channel_type === "SHOPPING" ||
                            campaignDetail?.campaign
                              .advertising_channel_type === "DEMAND_GEN" ? (
                              <>
                                {campaignDetail?.campaign
                                  .advertising_channel_type === "SEARCH" &&
                                  isCreateSearchEntitiesPanelOpen &&
                                  campaignId && (
                                    <CreateGoogleAdGroupPanel
                                      isOpen={isCreateSearchEntitiesPanelOpen}
                                      onClose={() => {
                                        setIsCreateSearchEntitiesPanelOpen(
                                          false,
                                        );
                                        setCreateSearchEntitiesError(null);
                                      }}
                                      onSubmit={handleCreateAdGroup}
                                      campaignId={campaignId}
                                      campaignName={
                                        campaignDetail?.campaign.name
                                      }
                                      loading={createSearchEntitiesLoading}
                                      submitError={null}
                                    />
                                  )}
                                {campaignDetail?.campaign
                                  .advertising_channel_type === "SHOPPING" &&
                                  isCreateShoppingEntitiesPanelOpen &&
                                  campaignId && (
                                    <CreateGoogleAdGroupPanel
                                      isOpen={isCreateShoppingEntitiesPanelOpen}
                                      onClose={() => {
                                        setIsCreateShoppingEntitiesPanelOpen(
                                          false,
                                        );
                                        setCreateShoppingEntitiesError(null);
                                      }}
                                      onSubmit={handleCreateShoppingAdGroup}
                                      campaignId={campaignId}
                                      campaignName={
                                        campaignDetail?.campaign.name
                                      }
                                      loading={createShoppingEntitiesLoading}
                                      submitError={createShoppingEntitiesError}
                                    />
                                  )}
                                {campaignDetail?.campaign
                                  .advertising_channel_type === "DEMAND_GEN" &&
                                  isCreateDemandGenAdGroupPanelOpen &&
                                  campaignId && (
                                    <CreateGoogleDemandGenAdGroupPanel
                                      isOpen={isCreateDemandGenAdGroupPanelOpen}
                                      onClose={() => {
                                        setIsCreateDemandGenAdGroupPanelOpen(
                                          false,
                                        );
                                        setCreateDemandGenAdGroupError(null);
                                      }}
                                      onSubmit={handleCreateDemandGenAdGroup}
                                      campaignId={campaignId}
                                      campaignName={
                                        campaignDetail?.campaign.name
                                      }
                                      loading={createDemandGenAdGroupLoading}
                                      submitError={createDemandGenAdGroupError}
                                    />
                                  )}
                              </>
                            ) : undefined
                          }
                        />
                      </>
                    )}

                    {activeTab === "Ads" &&
                      campaignDetail?.campaign.advertising_channel_type !==
                        "PERFORMANCE_MAX" && (
                        <>
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
                              syncMessage.type === "ads"
                                ? syncMessage.message
                                : null
                            }
                            getSortIcon={getSortIcon}
                            onUpdateAdStatus={handleUpdateAdStatus}
                            accountId={accountId}
                            channelId={channelId}
                            campaignId={campaignId}
                            onBulkUpdateComplete={loadAdsFromHook}
                            formatCurrency={formatCurrency2Decimals}
                            formatPercentage={formatPercentage}
                            showDraftsOnly={showDraftsOnlyAds}
                            onToggleDraftsOnly={() => {
                              setShowDraftsOnlyAds((p) => !p);
                              setAdsCurrentPage(1);
                            }}
                            onPublishDraft={handlePublishAdDraft}
                            publishLoadingId={
                              publishDraftEntity?.type === "ad" &&
                              publishDraftSubmitting
                                ? (publishDraftEntity.entity.ad_id ??
                                  publishDraftEntity.entity.id)
                                : undefined
                            }
                            createButton={
                              campaignDetail?.campaign
                                .advertising_channel_type === "SEARCH" ? (
                                <CreateGoogleAdSection
                                  isOpen={isCreateSearchEntitiesPanelOpen}
                                  onToggle={() => {
                                    setIsCreateSearchEntitiesPanelOpen(
                                      !isCreateSearchEntitiesPanelOpen,
                                    );
                                    setIsAdsFilterPanelOpen(false);
                                  }}
                                />
                              ) : campaignDetail?.campaign
                                  .advertising_channel_type === "SHOPPING" ? (
                                <CreateGoogleShoppingEntitiesSection
                                  isOpen={isCreateShoppingEntitiesPanelOpen}
                                  onToggle={() => {
                                    setIsCreateShoppingEntitiesPanelOpen(
                                      !isCreateShoppingEntitiesPanelOpen,
                                    );
                                    setIsAdsFilterPanelOpen(false);
                                  }}
                                />
                              ) : campaignChannelType === "DEMAND_GEN" ? (
                                <CreateGoogleDemandGenAdSection
                                  isOpen={isCreateDemandGenAdSectionOpen}
                                  onToggle={() => {
                                    setIsCreateDemandGenAdSectionOpen(
                                      !isCreateDemandGenAdSectionOpen,
                                    );
                                    setIsAdsFilterPanelOpen(false);
                                  }}
                                />
                              ) : undefined
                            }
                            createPanel={
                              campaignDetail?.campaign
                                .advertising_channel_type === "SEARCH" &&
                              isCreateSearchEntitiesPanelOpen &&
                              campaignId ? (
                                <CreateGoogleAdPanel
                                  isOpen={isCreateSearchEntitiesPanelOpen}
                                  onClose={() => {
                                    setIsCreateSearchEntitiesPanelOpen(false);
                                    setCreateSearchEntitiesError(null);
                                  }}
                                  onSubmit={handleCreateAd}
                                  campaignId={campaignId}
                                  accountId={accountId || ""}
                                  channelId={channelId}
                                  profileId={profileId}
                                  loading={createSearchEntitiesLoading}
                                  submitError={null}
                                />
                              ) : campaignDetail?.campaign
                                  .advertising_channel_type === "SHOPPING" &&
                                isCreateShoppingEntitiesPanelOpen &&
                                campaignId &&
                                accountId ? (
                                <CreateGoogleShoppingEntitiesPanel
                                  isOpen={isCreateShoppingEntitiesPanelOpen}
                                  onClose={() => {
                                    setIsCreateShoppingEntitiesPanelOpen(false);
                                    setCreateShoppingEntitiesError(null);
                                  }}
                                  onSubmit={handleCreateShoppingEntities}
                                  campaignId={campaignId}
                                  accountId={accountId}
                                  channelId={channelId}
                                  loading={createShoppingEntitiesLoading}
                                  submitError={createShoppingEntitiesError}
                                />
                              ) : campaignChannelType === "DEMAND_GEN" &&
                                isCreateDemandGenAdSectionOpen &&
                                campaignId &&
                                accountId ? (
                                <CreateGoogleDemandGenAdPanel
                                  isOpen={isCreateDemandGenAdSectionOpen}
                                  onClose={() => {
                                    setIsCreateDemandGenAdSectionOpen(false);
                                    setCreateDemandGenAdError(null);
                                  }}
                                  onSubmit={handleCreateDemandGenAd}
                                  loading={createDemandGenAdLoading}
                                  submitError={createDemandGenAdError}
                                  profileId={profileId}
                                  adgroups={adgroups}
                                />
                              ) : undefined
                            }
                          />
                        </>
                      )}

                    {activeTab === "Assets" &&
                      campaignChannelType === "DEMAND_GEN" && (
                        <GoogleCampaignDetailAssetsTab
                          profileId={profileId}
                          accountId={accountId}
                          channelId={channelId}
                        />
                      )}

                    {activeTab === "Keywords" &&
                      campaignChannelType !== "DEMAND_GEN" && (
                        <>
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
                              setIsKeywordsFilterPanelOpen(
                                !isKeywordsFilterPanelOpen,
                              )
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
                            onUpdateKeywordMatchType={
                              handleUpdateKeywordMatchType
                            }
                            onStartKeywordTextEdit={handleStartKeywordTextEdit}
                            onStartFinalUrlEdit={handleStartFinalUrlEdit}
                            channelId={channelId}
                            onBulkUpdateComplete={loadKeywords}
                            formatCurrency2Decimals={formatCurrency2Decimals}
                            showDraftsOnly={showDraftsOnlyKeywords}
                            onToggleDraftsOnly={() => {
                              setShowDraftsOnlyKeywords((p) => !p);
                              setKeywordsCurrentPage(1);
                            }}
                            onPublishDraft={handlePublishKeywordDraft}
                            publishLoadingId={
                              publishDraftEntity?.type === "keyword" &&
                              publishDraftSubmitting
                                ? (publishDraftEntity.entity.keyword_id ??
                                  publishDraftEntity.entity.id)
                                : undefined
                            }
                            createButton={
                              campaignDetail?.campaign
                                .advertising_channel_type === "SEARCH" ? (
                                <CreateGoogleKeywordSection
                                  isOpen={isCreateSearchEntitiesPanelOpen}
                                  onToggle={() => {
                                    setIsCreateSearchEntitiesPanelOpen(
                                      !isCreateSearchEntitiesPanelOpen,
                                    );
                                    setIsKeywordsFilterPanelOpen(false);
                                  }}
                                />
                              ) : undefined
                            }
                            createPanel={
                              campaignDetail?.campaign
                                .advertising_channel_type === "SEARCH" &&
                              isCreateSearchEntitiesPanelOpen &&
                              campaignId &&
                              accountId ? (
                                <CreateGoogleKeywordPanel
                                  isOpen={isCreateSearchEntitiesPanelOpen}
                                  onClose={() => {
                                    setIsCreateSearchEntitiesPanelOpen(false);
                                    setCreateSearchEntitiesError(null);
                                  }}
                                  onSubmit={handleCreateKeywords}
                                  campaignId={campaignId}
                                  accountId={accountId}
                                  channelId={channelId}
                                  loading={createSearchEntitiesLoading}
                                  submitError={null}
                                />
                              ) : undefined
                            }
                          />
                        </>
                      )}

                    {activeTab === "Negative Keywords" &&
                      campaignChannelType !== "DEMAND_GEN" && (
                        <>
                          <GoogleCampaignDetailNegativeKeywordsTab
                            negativeKeywords={negativeKeywords}
                            loading={negativeKeywordsLoading}
                            selectedNegativeKeywordIds={
                              selectedNegativeKeywordIds
                            }
                            onSelectAll={handleSelectAllNegativeKeywords}
                            onSelectNegativeKeyword={
                              handleSelectNegativeKeyword
                            }
                            sortBy={negativeKeywordsSortBy}
                            sortOrder={negativeKeywordsSortOrder}
                            onSort={handleNegativeKeywordsSort}
                            currentPage={negativeKeywordsCurrentPage}
                            totalPages={negativeKeywordsTotalPages}
                            onPageChange={handleNegativeKeywordsPageChange}
                            isFilterPanelOpen={
                              isNegativeKeywordsFilterPanelOpen
                            }
                            onToggleFilterPanel={() =>
                              setIsNegativeKeywordsFilterPanelOpen(
                                !isNegativeKeywordsFilterPanelOpen,
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
                            onUpdateNegativeKeywordStatus={
                              handleUpdateNegativeKeywordStatus
                            }
                            onUpdateNegativeKeywordMatchType={
                              handleUpdateNegativeKeywordMatchType
                            }
                            onUpdateNegativeKeywordText={
                              handleUpdateNegativeKeywordText
                            }
                            campaignType={
                              campaignDetail?.campaign?.advertising_channel_type
                            }
                            accountId={accountId}
                            channelId={channelId}
                            onBulkUpdateComplete={
                              negativeKeywordsHook.loadNegativeKeywords
                            }
                            showDraftsOnly={showDraftsOnlyNegativeKeywords}
                            onToggleDraftsOnly={() => {
                              setShowDraftsOnlyNegativeKeywords((p) => !p);
                              setNegativeKeywordsCurrentPage(1);
                            }}
                            onPublishDraft={handlePublishNegativeKeywordDraft}
                            onConfirmPublishDraft={
                              runPublishNegativeKeywordDraft
                            }
                            publishLoadingId={
                              publishLoadingNegativeKeywordId ??
                              (publishDraftEntity?.type ===
                                "negative_keyword" && publishDraftSubmitting
                                ? (publishDraftEntity.entity.criterion_id ??
                                  publishDraftEntity.entity.id)
                                : undefined)
                            }
                            createButton={
                              <CreateGoogleNegativeKeywordSection
                                isOpen={isCreateNegativeKeywordPanelOpen}
                                onToggle={() => {
                                  setIsCreateNegativeKeywordPanelOpen(
                                    !isCreateNegativeKeywordPanelOpen,
                                  );
                                  setIsNegativeKeywordsFilterPanelOpen(false);
                                }}
                              />
                            }
                            createPanel={
                              isCreateNegativeKeywordPanelOpen &&
                              campaignId &&
                              accountId ? (
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
                                    campaignDetail?.campaign
                                      ?.advertising_channel_type
                                  }
                                  isDraftCampaign={isDraftCampaign}
                                  adgroups={adgroups}
                                  loading={createNegativeKeywordLoading}
                                  submitError={createNegativeKeywordError}
                                  createdNegativeKeywords={
                                    createdNegativeKeywords
                                  }
                                  failedNegativeKeywords={
                                    failedNegativeKeywords
                                  }
                                />
                              ) : undefined
                            }
                          />
                        </>
                      )}

                    {activeTab === "Product Groups" && (
                      <>
                        <GoogleCampaignDetailProductGroupsTab
                          productGroups={productGroups}
                          loading={productGroupsLoading}
                          showDraftsOnly={showDraftsOnlyProductGroups}
                          onToggleDraftsOnly={() =>
                            setShowDraftsOnlyProductGroups(
                              (prev) => !prev,
                            )
                          }
                          selectedProductGroupIds={selectedProductGroupIds}
                          getProductGroupSelectionKey={
                            getProductGroupSelectionKey
                          }
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
                              !isProductGroupsFilterPanelOpen,
                            )
                          }
                          filters={productGroupsFilters}
                          onApplyFilters={(newFilters) => {
                            setProductGroupsFilters(newFilters);
                            setProductGroupsCurrentPage(1);
                          }}
                          syncing={false}
                          onSync={() => {}}
                          syncingAnalytics={undefined}
                          onSyncAnalytics={undefined}
                          syncMessage={null}
                          getSortIcon={getSortIcon}
                          formatCurrency2Decimals={formatCurrency2Decimals}
                          formatPercentage={formatPercentage}
                          onUpdateProductGroupStatus={
                            handleUpdateProductGroupStatus
                          }
                          onPublishDraft={handlePublishProductGroupDraft}
                          accountId={accountId}
                          channelId={channelId}
                          onBulkUpdateComplete={loadProductGroups}
                          createButton={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SHOPPING" ? (
                              <CreateGoogleShoppingEntitiesSection
                                isOpen={isCreateShoppingEntitiesPanelOpen}
                                onToggle={() => {
                                  setIsCreateShoppingEntitiesPanelOpen(
                                    !isCreateShoppingEntitiesPanelOpen,
                                  );
                                  // Close filter panel if exists
                                }}
                              />
                            ) : undefined
                          }
                          createPanel={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SHOPPING" &&
                            isCreateShoppingEntitiesPanelOpen &&
                            campaignId &&
                            accountId ? (
                              <CreateGoogleShoppingEntitiesPanel
                                isOpen={isCreateShoppingEntitiesPanelOpen}
                                onClose={() => {
                                  setIsCreateShoppingEntitiesPanelOpen(false);
                                  setCreateShoppingEntitiesError(null);
                                }}
                                onSubmit={handleCreateShoppingEntities}
                                campaignId={campaignId}
                                accountId={accountId}
                                channelId={channelId}
                                loading={createShoppingEntitiesLoading}
                                submitError={createShoppingEntitiesError}
                              />
                            ) : undefined
                          }
                        />
                      </>
                    )}

                    {activeTab === "Shopping Ads" && (
                      <>
                        <GoogleCampaignDetailShoppingAdsTab
                          listingGroups={shoppingAds}
                          loading={shoppingAdsLoading}
                          showDraftsOnly={showDraftsOnlyShoppingAds}
                          onToggleDraftsOnly={() =>
                            setShowDraftsOnlyShoppingAds((prev) => !prev)
                          }
                          selectedListingGroupIds={selectedShoppingAdIds}
                          onSelectAll={handleSelectAllShoppingAds}
                          onSelectListingGroup={handleSelectShoppingAd}
                          sortBy={shoppingAdsSortBy}
                          sortOrder={shoppingAdsSortOrder}
                          onSort={handleShoppingAdsSort}
                          currentPage={shoppingAdsCurrentPage}
                          totalPages={shoppingAdsTotalPages}
                          onPageChange={handleShoppingAdsPageChange}
                          isFilterPanelOpen={isShoppingAdsFilterPanelOpen}
                          onToggleFilterPanel={() =>
                            setIsShoppingAdsFilterPanelOpen(
                              !isShoppingAdsFilterPanelOpen,
                            )
                          }
                          filters={shoppingAdsFilters}
                          onApplyFilters={(newFilters) => {
                            setShoppingAdsFilters(newFilters);
                            setShoppingAdsCurrentPage(1);
                          }}
                          syncing={false}
                          onSync={() => {}}
                          syncingAnalytics={undefined}
                          onSyncAnalytics={undefined}
                          syncMessage={null}
                          getSortIcon={getSortIcon}
                          formatCurrency2Decimals={formatCurrency2Decimals}
                          formatPercentage={formatPercentage}
                          onUpdateListingGroupStatus={
                            handleUpdateShoppingAdStatus
                          }
                          onPublishDraft={(lg) =>
                            handlePublishAdDraft({
                              id: lg.id,
                              ad_id: lg.ad_id ?? lg.listing_group_id,
                              adgroup_id: lg.adgroup_id,
                            })
                          }
                          publishLoadingId={
                            publishDraftEntity?.type === "ad" &&
                            publishDraftSubmitting
                              ? (publishDraftEntity.entity.ad_id ??
                                publishDraftEntity.entity.id)
                              : undefined
                          }
                          onBulkUpdateComplete={loadShoppingAds}
                          currencyCode={currencyCode}
                          summary={shoppingAdsSummary}
                          createButton={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SHOPPING" ? (
                              <CreateGoogleShoppingAdSection
                                isOpen={isCreateShoppingAdPanelOpen}
                                onToggle={() => {
                                  setIsCreateShoppingAdPanelOpen(
                                    !isCreateShoppingAdPanelOpen,
                                  );
                                  // Close filter panel if exists
                                }}
                              />
                            ) : undefined
                          }
                          createPanel={
                            campaignDetail?.campaign
                              .advertising_channel_type === "SHOPPING" &&
                            isCreateShoppingAdPanelOpen &&
                            campaignId &&
                            accountId ? (
                              <CreateGoogleShoppingAdPanel
                                isOpen={isCreateShoppingAdPanelOpen}
                                onClose={() => {
                                  setIsCreateShoppingAdPanelOpen(false);
                                  setCreateShoppingAdError(null);
                                }}
                                onSubmit={handleCreateShoppingAd}
                                campaignId={campaignId}
                                accountId={accountId}
                                channelId={channelId}
                                loading={createShoppingAdLoading}
                                submitError={createShoppingAdError}
                              />
                            ) : undefined
                          }
                        />
                      </>
                    )}

                    {activeTab === "Logs" && accountId && (
                      <GoogleCampaignDetailLogsTab
                        accountId={accountId}
                        channelId={channelId}
                        campaignId={campaignId}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Assistant>
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
                    <Loader
                      size="sm"
                      variant="white"
                      showMessage={false}
                      className="!flex-row"
                    />
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
                <strong>Note:</strong> Google Ads doesn't allow updating keyword
                text directly. This will create a new keyword with the updated
                text and remove the old one. The keyword will appear with a new
                ID after the update.
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
                disabled={
                  keywordTextEditLoading || !keywordTextEditValue.trim()
                }
                className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {keywordTextEditLoading ? (
                  <>
                    <Loader
                      size="sm"
                      variant="white"
                      showMessage={false}
                      className="!flex-row"
                    />
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

      {/* Inline Edit Confirmation Modal */}
      {showInlineEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            {/* Header */}
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm{" "}
              {inlineEditField === "status"
                ? "Status"
                : inlineEditField === "budget"
                  ? "Budget"
                  : inlineEditField === "start_date"
                    ? "Start Date"
                    : "End Date"}{" "}
              Change
            </h3>

            {/* Campaign name */}
            <p className="text-[12.16px] text-[#556179] mb-3">
              Campaign:{" "}
              <span className="font-semibold text-[#072929]">
                {campaignDetail?.campaign?.name || "Unnamed Campaign"}
              </span>
            </p>

            {/* Field change */}
            <div className="mb-4">
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.16px] text-[#556179]">
                    {inlineEditField === "status"
                      ? "Status"
                      : inlineEditField === "budget"
                        ? "Budget"
                        : inlineEditField === "start_date"
                          ? "Start Date"
                          : "End Date"}
                    :
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[12.16px] text-[#556179]">
                      {typeof inlineEditOldValue === "string"
                        ? inlineEditOldValue
                            .toLowerCase()
                            .replace(/^\w/, (c) => c.toUpperCase())
                        : inlineEditOldValue}
                    </span>

                    <span className="text-[12.16px] text-[#556179]">→</span>
                    <span className="text-[12.16px] font-semibold text-[#072929]">
                      {inlineEditField === "status"
                        ? typeof inlineEditNewValue === "string"
                          ? inlineEditNewValue
                              .toLowerCase()
                              .replace(/^\w/, (c) => c.toUpperCase())
                          : inlineEditNewValue
                        : inlineEditField === "budget"
                          ? formatCurrency2Decimals(
                              parseFloat(inlineEditNewValue || "0"),
                            )
                          : inlineEditNewValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInlineEditModal(false);
                  setInlineEditField(null);
                  setInlineEditOldValue("");
                  setInlineEditNewValue("");
                  setEditingField(null);
                  setEditedValue("");
                }}
                disabled={inlineEditLoading}
                className="cancel-button"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!inlineEditField || !campaignDetail) return;

                  setInlineEditLoading(true);
                  try {
                    await handleUpdateCampaign(
                      inlineEditField,
                      inlineEditNewValue,
                    );
                    setShowInlineEditModal(false);
                    setInlineEditField(null);
                    setInlineEditOldValue("");
                    setInlineEditNewValue("");
                    setEditingField(null);
                    setEditedValue("");
                  } catch (error) {
                    console.error("Error updating campaign:", error);
                    alert("Failed to update campaign. Please try again.");
                  } finally {
                    setInlineEditLoading(false);
                  }
                }}
                disabled={inlineEditLoading}
                className="create-entity-button btn-sm"
              >
                {inlineEditLoading ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish draft sub-entity confirmation */}
      <ConfirmationModal
        isOpen={publishDraftEntity !== null}
        onClose={() => setPublishDraftEntity(null)}
        onConfirm={runPublishDraftEntity}
        isLoading={publishDraftSubmitting}
        loadingLabel="Publishing..."
        title="Publish this draft to Google Ads?"
        message={
          publishDraftEntity
            ? publishDraftEntity.type === "ad_group"
              ? `Ad group "${publishDraftEntity.entity.adgroup_name || publishDraftEntity.entity.name || "Unnamed"}" will be created in Google Ads and the draft row will be removed.`
              : publishDraftEntity.type === "keyword"
                ? `Keyword "${publishDraftEntity.entity.keyword_text || "Unnamed"}" will be published. The draft row will be removed.`
                : publishDraftEntity.type === "ad"
                  ? `Ad (${publishDraftEntity.entity.ad_type || "Unnamed"}) will be created in Google Ads and the draft row will be removed.`
                  : publishDraftEntity.type === "negative_keyword"
                    ? `Negative keyword "${publishDraftEntity.entity.keyword_text || "Unnamed"}" will be published. The draft row will be removed.`
                    : ""
            : ""
        }
        type="info"
        size="sm"
        icon={<Send className="w-6 h-6 text-[#136D6D]" />}
      />

      {/* Draft campaign edit panel (Edit or Publish) */}
      {accountId && channelId && campaignId && isDraftCampaign && (
        <CreateGoogleCampaignPanel
          isOpen={isDraftCampaignEditPanelOpen}
          onClose={() => setIsDraftCampaignEditPanelOpen(false)}
          onSubmit={handleUpdateDraftCampaign}
          accountId={accountId}
          channelId={channelId}
          mode="edit"
          campaignId={campaignId}
          initialData={draftCampaignInitialData ?? undefined}
          onPublishDraft={handlePublishDraftFromDetail}
          loading={draftCampaignFormLoading}
          hideProfileSelector
          hideCampaignType
        />
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
