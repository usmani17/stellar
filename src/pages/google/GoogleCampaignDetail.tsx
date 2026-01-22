import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { KPICard } from "../../components/ui/KPICard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Dropdown } from "../../components/ui/Dropdown";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import { googleAdwordsAdGroupsService } from "../../services/googleAdwords/googleAdwordsAdGroups";
import { googleAdwordsAdsService } from "../../services/googleAdwords/googleAdwordsAds";
import { googleAdwordsKeywordsService } from "../../services/googleAdwords/googleAdwordsKeywords";
import type { FilterValues } from "../../components/filters/FilterPanel";
import { GoogleOverviewTab } from "./components/tabs/GoogleOverviewTab";
import { GoogleCampaignDetailAdGroupsTab } from "./components/tabs/GoogleCampaignDetailAdGroupsTab";
import { GoogleCampaignDetailAdsTab } from "./components/tabs/GoogleCampaignDetailAdsTab";
import { GoogleCampaignDetailKeywordsTab } from "./components/tabs/GoogleCampaignDetailKeywordsTab";
import { GoogleCampaignDetailNegativeKeywordsTab } from "./components/tabs/GoogleCampaignDetailNegativeKeywordsTab";
import { GoogleCampaignDetailAssetGroupsTab } from "./components/tabs/GoogleCampaignDetailAssetGroupsTab";
import { GoogleCampaignDetailProductGroupsTab } from "./components/tabs/GoogleCampaignDetailProductGroupsTab";
import { GoogleCampaignDetailLogsTab } from "./components/tabs/GoogleCampaignDetailLogsTab";
import type {
  GoogleAdGroup,
  GoogleAd,
  GoogleKeyword,
  GoogleNegativeKeyword,
} from "./components/tabs/GoogleTypes";
import {
  CreateGoogleAdGroupPanel,
  type AdGroupInput,
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
  type NegativeKeywordInput,
} from "../../components/google/CreateGoogleNegativeKeywordPanel";
import { googleAdwordsNegativeKeywordsService } from "../../services/googleAdwords/googleAdwordsNegativeKeywords";
import { googleAdwordsAssetGroupsService } from "../../services/googleAdwords/googleAdwordsAssetGroups";
import {
  CreateGooglePmaxAssetGroupPanel,
  type PmaxAssetGroupInput,
  type AssetGroupInitialData,
} from "../../components/google/CreateGooglePmaxAssetGroupPanel";
import { campaignsService } from "../../services/campaigns";
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
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] =
    useState<GoogleCampaignDetail | null>(null);
  const isLoadingRef = useRef(false);

  // Inline edit state
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

  // Ad Groups state
  const [adgroups, setAdgroups] = useState<GoogleAdGroup[]>([]);
  const [adgroupsLoading, setAdgroupsLoading] = useState(false);
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<number>>(
    new Set()
  );
  const [adgroupsCurrentPage, setAdgroupsCurrentPage] = useState(1);
  const [adgroupsTotalPages, setAdgroupsTotalPages] = useState(0);
  const [adgroupsSortBy, setAdgroupsSortBy] = useState<string>("id");
  const [adgroupsSortOrder, setAdgroupsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isAdGroupsFilterPanelOpen, setIsAdGroupsFilterPanelOpen] =
    useState(false);
  const [adgroupsFilters, setAdgroupsFilters] = useState<FilterValues>([]);

  // Ads state
  const [ads, setAds] = useState<GoogleAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [selectedAdIds, setSelectedAdIds] = useState<Set<number>>(new Set());
  const [adsCurrentPage, setAdsCurrentPage] = useState(1);
  const [adsTotalPages, setAdsTotalPages] = useState(0);
  const [adsSortBy, setAdsSortBy] = useState<string>("id");
  const [adsSortOrder, setAdsSortOrder] = useState<"asc" | "desc">("asc");
  const [isAdsFilterPanelOpen, setIsAdsFilterPanelOpen] = useState(false);
  const [adsFilters, setAdsFilters] = useState<FilterValues>([]);

  // Keywords state
  const [keywords, setKeywords] = useState<GoogleKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(
    new Set()
  );
  const [keywordsCurrentPage, setKeywordsCurrentPage] = useState(1);
  const [keywordsTotalPages, setKeywordsTotalPages] = useState(0);
  const [keywordsSortBy, setKeywordsSortBy] = useState<string>("id");
  const [keywordsSortOrder, setKeywordsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isKeywordsFilterPanelOpen, setIsKeywordsFilterPanelOpen] =
    useState(false);
  const [keywordsFilters, setKeywordsFilters] = useState<FilterValues>([]);

  // Negative Keywords state
  const [negativeKeywords, setNegativeKeywords] = useState<
    GoogleNegativeKeyword[]
  >([]);
  const [negativeKeywordsLoading, setNegativeKeywordsLoading] = useState(false);
  const [selectedNegativeKeywordIds, setSelectedNegativeKeywordIds] = useState<
    Set<number>
  >(new Set());
  const [negativeKeywordsCurrentPage, setNegativeKeywordsCurrentPage] =
    useState(1);
  const [negativeKeywordsTotalPages, setNegativeKeywordsTotalPages] =
    useState(0);
  const [negativeKeywordsSortBy, setNegativeKeywordsSortBy] =
    useState<string>("id");
  const [negativeKeywordsSortOrder, setNegativeKeywordsSortOrder] = useState<
    "asc" | "desc"
  >("asc");
  const [
    isNegativeKeywordsFilterPanelOpen,
    setIsNegativeKeywordsFilterPanelOpen,
  ] = useState(false);
  const [negativeKeywordsFilters, setNegativeKeywordsFilters] =
    useState<FilterValues>([]);
  const [syncingNegativeKeywords, setSyncingNegativeKeywords] = useState(false);
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

  // Sync state
  const [syncingAdGroups, setSyncingAdGroups] = useState(false);
  const [syncingAds, setSyncingAds] = useState(false);
  const [syncingKeywords, setSyncingKeywords] = useState(false);
  const [syncingAdGroupsAnalytics, setSyncingAdGroupsAnalytics] =
    useState(false);
  const [syncingAdsAnalytics, setSyncingAdsAnalytics] = useState(false);
  const [syncingKeywordsAnalytics, setSyncingKeywordsAnalytics] =
    useState(false);
  const [syncingAssetGroups, setSyncingAssetGroups] = useState(false);
  // Asset Groups state (for Performance Max)
  const [assetGroups, setAssetGroups] = useState<any[]>([]);
  const [assetGroupsLoading, setAssetGroupsLoading] = useState(false);
  const [selectedAssetGroupIds, setSelectedAssetGroupIds] = useState<
    Set<number>
  >(new Set());
  const [assetGroupsCurrentPage, setAssetGroupsCurrentPage] = useState(1);
  const [assetGroupsTotalPages, setAssetGroupsTotalPages] = useState(0);
  const [assetGroupsSortBy, setAssetGroupsSortBy] = useState<string>("id");
  const [assetGroupsSortOrder, setAssetGroupsSortOrder] = useState<
    "asc" | "desc"
  >("asc");
  const [isAssetGroupsFilterPanelOpen, setIsAssetGroupsFilterPanelOpen] =
    useState(false);
  const [assetGroupsFilters, setAssetGroupsFilters] = useState<FilterValues>(
    []
  );

  // Product Groups state (for Shopping)
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [productGroupsLoading, setProductGroupsLoading] = useState(false);
  const [selectedProductGroupIds, setSelectedProductGroupIds] = useState<
    Set<number>
  >(new Set());
  const [productGroupsCurrentPage, setProductGroupsCurrentPage] = useState(1);
  const [productGroupsTotalPages, setProductGroupsTotalPages] = useState(0);
  const [productGroupsSortBy, setProductGroupsSortBy] = useState<string>("id");
  const [productGroupsSortOrder, setProductGroupsSortOrder] = useState<
    "asc" | "desc"
  >("asc");
  const [isProductGroupsFilterPanelOpen, setIsProductGroupsFilterPanelOpen] =
    useState(false);
  const [productGroupsFilters, setProductGroupsFilters] =
    useState<FilterValues>([]);

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

  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });

  // Creation panel state
  const [isCreateSearchEntitiesPanelOpen, setIsCreateSearchEntitiesPanelOpen] =
    useState(false);
  const [isCreatePmaxAssetGroupPanelOpen, setIsCreatePmaxAssetGroupPanelOpen] =
    useState(false);
  const [
    isCreateShoppingEntitiesPanelOpen,
    setIsCreateShoppingEntitiesPanelOpen,
  ] = useState(false);

  // Creation loading and error state
  const [createSearchEntitiesLoading, setCreateSearchEntitiesLoading] =
    useState(false);
  const [_createSearchEntitiesError, setCreateSearchEntitiesError] = useState<
    string | null
  >(null);
  const [createPmaxAssetGroupLoading, setCreatePmaxAssetGroupLoading] =
    useState(false);
  const [createPmaxAssetGroupError, setCreatePmaxAssetGroupError] = useState<
    string | null
  >(null);
  const [createShoppingEntitiesLoading, setCreateShoppingEntitiesLoading] =
    useState(false);
  const [createShoppingEntitiesError, setCreateShoppingEntitiesError] =
    useState<string | null>(null);

  // Edit asset group state
  const [editingAssetGroupId, setEditingAssetGroupId] = useState<number | null>(
    null
  );
  const [editingAssetGroupData, setEditingAssetGroupData] =
    useState<AssetGroupInitialData | null>(null);
  const [isEditAssetGroupPanelOpen, setIsEditAssetGroupPanelOpen] =
    useState(false);
  const [editAssetGroupLoading, setEditAssetGroupLoading] = useState(false);
  const [editAssetGroupError, setEditAssetGroupError] = useState<string | null>(
    null
  );
  const [editLoadingAssetGroupId, setEditLoadingAssetGroupId] = useState<
    number | null
  >(null);
  const [refreshAssetGroupMessage, setRefreshAssetGroupMessage] = useState<{
    type: "loading" | "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

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

  // Ad Group name edit modal state
  const [showAdGroupNameEditModal, setShowAdGroupNameEditModal] = useState(false);
  const [nameEditAdGroup, setNameEditAdGroup] = useState<GoogleAdGroup | null>(null);
  const [nameEditValue, setNameEditValue] = useState<string>("");
  const [nameEditLoading, setNameEditLoading] = useState(false);

  // Keyword text edit modal state
  const [showKeywordTextEditModal, setShowKeywordTextEditModal] = useState(false);
  const [keywordTextEditKeyword, setKeywordTextEditKeyword] = useState<GoogleKeyword | null>(null);
  const [keywordTextEditValue, setKeywordTextEditValue] = useState<string>("");
  const [keywordTextEditLoading, setKeywordTextEditLoading] = useState(false);
  
  // Final URL edit modal state
  const [showFinalUrlModal, setShowFinalUrlModal] = useState(false);
  const [finalUrlKeyword, setFinalUrlKeyword] = useState<GoogleKeyword | null>(null);
  const [finalUrlValue, setFinalUrlValue] = useState<string>("");
  const [mobileFinalUrlValue, setMobileFinalUrlValue] = useState<string>("");
  const [useMobileFinalUrl, setUseMobileFinalUrl] = useState(false);
  const [finalUrlEditLoading, setFinalUrlEditLoading] = useState(false);

  // Compute available tabs based on campaign type
  const tabs = useMemo(() => {
    if (!campaignDetail?.campaign?.advertising_channel_type) {
      return ["Overview", "Ad Groups", "Ads", "Keywords", "Logs"];
    }

    const channelType =
      campaignDetail.campaign.advertising_channel_type.toUpperCase();

    if (channelType === "PERFORMANCE_MAX") {
      return ["Overview", "Asset Groups", "Logs"];
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

  const loadCampaignDetail = useCallback(async () => {
    // Prevent duplicate concurrent calls
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      // Clear previous data immediately
      setCampaignDetail(null);
      const accountIdNum = parseInt(accountId!, 10);
      const currentCampaignId = campaignId; // Capture current campaignId

      if (isNaN(accountIdNum) || !currentCampaignId) {
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Parse campaignId - it's a string from URL params
      const campaignIdNum = parseInt(currentCampaignId, 10);
      if (isNaN(campaignIdNum)) {
        console.error("Invalid campaign ID:", currentCampaignId);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      const data = await googleAdwordsCampaignsService.getGoogleCampaignDetail(
        accountIdNum,
        campaignIdNum,
        startDate ? startDate.toISOString().split("T")[0] : undefined,
        endDate ? endDate.toISOString().split("T")[0] : undefined
      );

      // Only set data if we're still on the same campaign (check for race conditions)
      if (currentCampaignId === campaignId) {
        setCampaignDetail(data);
      }
    } catch (error) {
      console.error("Failed to load Google campaign detail:", error);
      setCampaignDetail(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [accountId, campaignId, startDate, endDate]);

  useEffect(() => {
    // Reset state when campaignId changes
    setCampaignDetail(null);
    setAdgroups([]);
    setAds([]);
    setKeywords([]);
    setNegativeKeywords([]);
    setAssetGroups([]);
    setProductGroups([]);
    setSelectedAdGroupIds(new Set());
    setSelectedAdIds(new Set());
    setSelectedKeywordIds(new Set());
    setSelectedNegativeKeywordIds(new Set());
    setSelectedAssetGroupIds(new Set());
    setSelectedProductGroupIds(new Set());
    setAdgroupsCurrentPage(1);
    setAdsCurrentPage(1);
    setKeywordsCurrentPage(1);
    setNegativeKeywordsCurrentPage(1);
    setAssetGroupsCurrentPage(1);
    setProductGroupsCurrentPage(1);
    setSyncMessage({ type: null, message: null });
    // Reset edit asset group state
    setIsEditAssetGroupPanelOpen(false);
    setEditingAssetGroupId(null);
    setEditingAssetGroupData(null);
    setEditAssetGroupError(null);
    setRefreshAssetGroupMessage(null);
    setEditLoadingAssetGroupId(null);
    setIsCreatePmaxAssetGroupPanelOpen(false);
    setCreatePmaxAssetGroupError(null);

    if (accountId && campaignId) {
      loadCampaignDetail();
    }
  }, [accountId, campaignId, startDate?.toISOString(), endDate?.toISOString(), loadCampaignDetail]);

  // Reset pagination when date range, tab, or filters change
  useEffect(() => {
    if (activeTab === "Ad Groups") {
      setAdgroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, adgroupsFilters]);

  useEffect(() => {
    if (activeTab === "Ads") {
      setAdsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, adsFilters]);

  useEffect(() => {
    if (activeTab === "Keywords") {
      setKeywordsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, keywordsFilters]);

  useEffect(() => {
    if (activeTab === "Negative Keywords") {
      setNegativeKeywordsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, negativeKeywordsFilters]);

  useEffect(() => {
    if (activeTab === "Asset Groups") {
      setAssetGroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, assetGroupsFilters]);

  useEffect(() => {
    if (activeTab === "Product Groups") {
      setProductGroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, productGroupsFilters]);

  // Removed buildAssetGroupsFilterParams - now passing filters array directly to service

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
          filters: assetGroupsFilters, // Pass filters array directly
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
  ]);

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
  ]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Keywords") {
      loadKeywords();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    keywordsCurrentPage,
    keywordsSortBy,
    keywordsSortOrder,
    keywordsFilters,
  ]);

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
  ]);

  const loadProductGroups = useCallback(async () => {
    try {
      setProductGroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setProductGroupsLoading(false);
        return;
      }

      // Product groups are stored in the ads table with ad_type = 'SHOPPING_PRODUCT_AD'
      // Add ad_type filter to the filters array
      const productGroupsFiltersWithType = [
        ...productGroupsFilters,
        { field: "ad_type", value: "SHOPPING_PRODUCT_AD" },
      ];
      
      const data = await googleAdwordsAdsService.getGoogleAds(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          filters: productGroupsFiltersWithType, // Pass filters array directly
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
    campaignId,
    productGroupsCurrentPage,
    productGroupsSortBy,
    productGroupsSortOrder,
    startDate,
    endDate,
    productGroupsFilters,
  ]);

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

  // Switch away from hidden tabs when campaign type changes
  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab("Overview");
    }
  }, [tabs, activeTab]);

  // Removed all buildFilterParams functions - now passing filters array directly to services

  const loadAdGroups = async () => {
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
          filters: adgroupsFilters, // Pass filters array directly
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
  };

  const loadAds = async () => {
    try {
      setAdsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdsLoading(false);
        return;
      }

      const data = await googleAdwordsAdsService.getGoogleAds(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          filters: adsFilters, // Pass filters array directly
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
  };

  const loadKeywords = async () => {
    try {
      setKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setKeywordsLoading(false);
        return;
      }

      const data = await googleAdwordsKeywordsService.getGoogleKeywords(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          filters: keywordsFilters, // Pass filters array directly
          page: keywordsCurrentPage,
          page_size: 100,
          sort_by: keywordsSortBy,
          order: keywordsSortOrder,
        }
      );

      setKeywords(data.keywords || []);
      setKeywordsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
      setKeywordsTotalPages(0);
    } finally {
      setKeywordsLoading(false);
    }
  };

  const runInlineEdit = async () => {
    if (!inlineEditField || !accountId || !campaignDetail) return;

    setInlineEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (inlineEditField === "status") {
        const statusMap: Record<string, "ENABLED" | "PAUSED" | "REMOVED"> = {
          ENABLED: "ENABLED",
          PAUSED: "PAUSED",
          REMOVED: "REMOVED",
          Enabled: "ENABLED",
          Paused: "PAUSED",
          Removed: "REMOVED",
        };
        const statusValue = statusMap[inlineEditNewValue] || "ENABLED";

        await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaign_id],
          action: "status",
          status: statusValue,
        });
      } else if (inlineEditField === "budget") {
        const budgetValue = parseFloat(
          inlineEditNewValue.replace(/[^0-9.]/g, "")
        );
        if (isNaN(budgetValue)) {
          throw new Error("Invalid budget value");
        }

        await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaign_id],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });
      } else if (inlineEditField === "start_date") {
        await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaign_id],
          action: "start_date",
          start_date: inlineEditNewValue,
        });
      } else if (inlineEditField === "end_date") {
        await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaign_id],
          action: "end_date",
          end_date: inlineEditNewValue,
        });
      }

      await loadCampaignDetail();
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
  };

  const cancelInlineEdit = () => {
    setShowInlineEditModal(false);
    setInlineEditField(null);
    setInlineEditOldValue("");
    setInlineEditNewValue("");
    setEditingField(null);
    setEditedValue("");
  };

  const handleSelectAllAdGroups = (checked: boolean) => {
    if (checked) {
      setSelectedAdGroupIds(new Set(adgroups.map((ag) => ag.id)));
    } else {
      setSelectedAdGroupIds(new Set());
    }
  };

  const handleSelectAdGroup = (id: number, checked: boolean) => {
    setSelectedAdGroupIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAllAds = (checked: boolean) => {
    if (checked) {
      setSelectedAdIds(new Set(ads.map((ad) => ad.id)));
    } else {
      setSelectedAdIds(new Set());
    }
  };

  const handleSelectAd = (id: number, checked: boolean) => {
    setSelectedAdIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAllKeywords = (checked: boolean) => {
    if (checked) {
      setSelectedKeywordIds(new Set(keywords.map((kw) => kw.id)));
    } else {
      setSelectedKeywordIds(new Set());
    }
  };

  const handleSelectKeyword = (id: number, checked: boolean) => {
    setSelectedKeywordIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleAdGroupsSort = (column: string) => {
    if (adgroupsSortBy === column) {
      setAdgroupsSortOrder(adgroupsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdgroupsSortBy(column);
      setAdgroupsSortOrder("asc");
    }
    setAdgroupsCurrentPage(1);
  };

  const handleAdsSort = (column: string) => {
    if (adsSortBy === column) {
      setAdsSortOrder(adsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdsSortBy(column);
      setAdsSortOrder("asc");
    }
    setAdsCurrentPage(1);
  };

  const handleKeywordsSort = (column: string) => {
    if (keywordsSortBy === column) {
      setKeywordsSortOrder(keywordsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setKeywordsSortBy(column);
      setKeywordsSortOrder("asc");
    }
    setKeywordsCurrentPage(1);
  };

  const handleSelectAllNegativeKeywords = (checked: boolean) => {
    if (checked) {
      setSelectedNegativeKeywordIds(
        new Set(negativeKeywords.map((nkw) => nkw.id))
      );
    } else {
      setSelectedNegativeKeywordIds(new Set());
    }
  };

  const handleSelectNegativeKeyword = (id: number, checked: boolean) => {
    setSelectedNegativeKeywordIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleNegativeKeywordsSort = (column: string) => {
    if (negativeKeywordsSortBy === column) {
      setNegativeKeywordsSortOrder(
        negativeKeywordsSortOrder === "asc" ? "desc" : "asc"
      );
    } else {
      setNegativeKeywordsSortBy(column);
      setNegativeKeywordsSortOrder("asc");
    }
    setNegativeKeywordsCurrentPage(1);
  };

  const loadNegativeKeywords = async () => {
    try {
      setNegativeKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setNegativeKeywordsLoading(false);
        return;
      }

      const data =
        await googleAdwordsNegativeKeywordsService.getGoogleNegativeKeywords(
          accountIdNum,
          {
            filters: negativeKeywordsFilters, // Pass filters array directly
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
  };

  // Removed buildNegativeKeywordsFilterParams - now passing filters array directly to service

  // Ad Group name edit handlers
  const handleStartAdGroupNameEdit = (adgroup: GoogleAdGroup) => {
    setNameEditAdGroup(adgroup);
    setNameEditValue(adgroup.adgroup_name || adgroup.name || "");
    setShowAdGroupNameEditModal(true);
  };

  const handleAdGroupNameEditSave = async () => {
    if (!nameEditAdGroup || !accountId) return;

    const trimmedName = nameEditValue.trim();
    if (!trimmedName) {
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: "Name cannot be empty",
      });
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
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update adgroup name: ${errorMessage}`,
      });
    } finally {
      setNameEditLoading(false);
    }
  };

  // Keyword text edit handlers
  const handleStartKeywordTextEdit = (keyword: GoogleKeyword) => {
    setKeywordTextEditKeyword(keyword);
    setKeywordTextEditValue(keyword.keyword_text || "");
    setShowKeywordTextEditModal(true);
  };

  // Final URL edit handlers
  const handleStartFinalUrlEdit = (keyword: GoogleKeyword) => {
    if (!keyword) {
      console.error("Cannot edit final URL: keyword is null");
      return;
    }
    
    setFinalUrlKeyword(keyword);
    // Get first URL from final_urls array if available
    const finalUrls = (keyword as any)?.final_urls || (keyword as any)?.finalUrls || null;
    let currentUrl = "";
    if (Array.isArray(finalUrls) && finalUrls.length > 0) {
      currentUrl = finalUrls[0] || "";
    } else if (typeof finalUrls === "string" && finalUrls.trim()) {
      currentUrl = finalUrls.trim();
    }
    setFinalUrlValue(currentUrl);
    
    const mobileUrls = (keyword as any)?.final_mobile_urls || (keyword as any)?.finalMobileUrls || null;
    let currentMobileUrl = "";
    if (Array.isArray(mobileUrls) && mobileUrls.length > 0) {
      currentMobileUrl = mobileUrls[0] || "";
    } else if (typeof mobileUrls === "string" && mobileUrls.trim()) {
      currentMobileUrl = mobileUrls.trim();
    }
    setMobileFinalUrlValue(currentMobileUrl);
    setUseMobileFinalUrl(!!currentMobileUrl);
    setShowFinalUrlModal(true);
  };
  
  const handleFinalUrlEditSave = async () => {
    if (!finalUrlKeyword || !accountId) return;
    
    const trimmedUrl = finalUrlValue.trim();
    if (!trimmedUrl) {
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: "Final URL cannot be empty. Please enter a URL.",
      });
      return;
    }
    
    // Validate URL format
    let finalUrl = trimmedUrl;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    
    try {
      new URL(finalUrl);
    } catch {
      setErrorModal({
        isOpen: true,
        title: "Invalid URL",
        message: "Please enter a valid URL. URLs should start with http:// or https://",
      });
      return;
    }
    
    let mobileUrl = "";
    if (useMobileFinalUrl) {
      const trimmedMobileUrl = mobileFinalUrlValue.trim();
      if (!trimmedMobileUrl) {
        setErrorModal({
          isOpen: true,
          title: "Validation Error",
          message: "Mobile final URL cannot be empty when the checkbox is checked. Please enter a mobile URL or uncheck the option.",
        });
        return;
      }
      mobileUrl = trimmedMobileUrl;
      if (!mobileUrl.startsWith("http://") && !mobileUrl.startsWith("https://")) {
        mobileUrl = "https://" + mobileUrl;
      }
      try {
        new URL(mobileUrl);
      } catch {
        setErrorModal({
          isOpen: true,
          title: "Invalid Mobile URL",
          message: "Please enter a valid mobile URL. URLs should start with http:// or https://",
        });
        return;
      }
    }
    
    setFinalUrlEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Include adgroup_id to ensure we only update the specific keyword in the specific ad group
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: [finalUrlKeyword.keyword_id],
        action: "final_urls",
        final_url: finalUrl,
        final_mobile_url: useMobileFinalUrl ? mobileUrl : undefined,
        adgroupIds: finalUrlKeyword.adgroup_id ? [finalUrlKeyword.adgroup_id] : undefined,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0];
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: `Failed to update final URL: ${errorMessage}`,
        });
        return;
      }

      await loadKeywords();
      setShowFinalUrlModal(false);
      setFinalUrlKeyword(null);
      setFinalUrlValue("");
      setMobileFinalUrlValue("");
      setUseMobileFinalUrl(false);
    } catch (error: any) {
      console.error("Error updating final URL:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update final URL: ${errorMessage}`,
      });
    } finally {
      setFinalUrlEditLoading(false);
    }
  };

  const handleKeywordTextEditSave = async () => {
    if (!keywordTextEditKeyword || !accountId) return;

    const trimmedText = keywordTextEditValue.trim();
    if (!trimmedText) {
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: "Keyword text cannot be empty. Please enter a keyword.",
      });
      return;
    }

    const oldText = (keywordTextEditKeyword.keyword_text || "").trim();
    if (trimmedText === oldText) {
      setShowKeywordTextEditModal(false);
      setKeywordTextEditKeyword(null);
      setKeywordTextEditValue("");
      return;
    }

    setKeywordTextEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Include adgroup_id to ensure we only update the specific keyword in the specific ad group
      const response = await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: [keywordTextEditKeyword.keyword_id],
        action: "keyword_text",
        keyword_text: trimmedText,
        adgroupIds: keywordTextEditKeyword.adgroup_id ? [keywordTextEditKeyword.adgroup_id] : undefined,
      });

      if (response.errors && response.errors.length > 0) {
        // Format error message - check for duplicate keyword
        const errorMessage = response.errors[0];
        let title = "Update Failed";
        let message = errorMessage;

        if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
          title = "Duplicate Keyword";
          message = `The keyword "${trimmedText}" already exists in this ad group with the same match type. Please choose a different keyword text.`;
        } else {
          message = `Failed to update keyword text: ${errorMessage}`;
        }

        setErrorModal({
          isOpen: true,
          title,
          message,
        });
        return;
      }

      await loadKeywords();
      setShowKeywordTextEditModal(false);
      setKeywordTextEditKeyword(null);
      setKeywordTextEditValue("");
    } catch (error: any) {
      console.error("Error updating keyword text:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update keyword text: ${errorMessage}`,
      });
    } finally {
      setKeywordTextEditLoading(false);
    }
  };

  // Negative keyword text edit handler
  const handleUpdateNegativeKeywordText = async (criterionId: string, keywordText: string) => {
    if (!accountId) return;

    const trimmedText = keywordText.trim();
    if (!trimmedText) {
      setErrorModal({
        isOpen: true,
        title: "Validation Error",
        message: "Keyword text cannot be empty. Please enter a keyword.",
      });
      return;
    }

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
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
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update negative keyword text: ${errorMessage}`,
      });
      throw error; // Re-throw so the modal in the tab component can handle it
    }
  };

  const handleSyncNegativeKeywords = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingNegativeKeywords(true);
      setSyncMessage({ type: null, message: null });
      const result =
        await googleAdwordsNegativeKeywordsService.syncGoogleNegativeKeywords(
          accountIdNum
        );
      let message = `Successfully synced ${result.synced} negative keywords`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "negative_keywords", message });

      if (result.synced > 0) {
        setNegativeKeywordsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadNegativeKeywords();

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync negative keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync negative keywords from Google Ads";
      setSyncMessage({ type: "negative_keywords", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingNegativeKeywords(false);
    }
  };

  const handleCreateNegativeKeywords = async (data: {
    negativeKeywords: NegativeKeywordInput[];
    level: "campaign" | "adgroup";
    adGroupId?: string;
  }) => {
    if (!accountId || !campaignId) return;

    try {
      setCreateNegativeKeywordLoading(true);
      setCreateNegativeKeywordError(null);
      setCreatedNegativeKeywords([]);
      setFailedNegativeKeywords([]);

      const accountIdNum = parseInt(accountId, 10);
      const result =
        await googleAdwordsNegativeKeywordsService.createGoogleNegativeKeywords(
          accountIdNum,
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
  };

  const handleAdGroupsPageChange = (page: number) => {
    setAdgroupsCurrentPage(page);
  };

  const handleAdsPageChange = (page: number) => {
    setAdsCurrentPage(page);
  };

  const handleKeywordsPageChange = (page: number) => {
    setKeywordsCurrentPage(page);
  };

  const handleNegativeKeywordsPageChange = (page: number) => {
    setNegativeKeywordsCurrentPage(page);
  };

  const handleSyncAdGroups = async () => {
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
        // Small delay to ensure database is updated
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
  };

  const handleSyncAds = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAds(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleAdwordsAdsService.syncGoogleAds(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} ads`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "ads", message });

      // Reset to first page and reload ads after sync
      if (result.synced > 0) {
        setAdsCurrentPage(1);
        // Small delay to ensure database is updated
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAds();

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ads:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ads from Google Ads";
      setSyncMessage({ type: "ads", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingAds(false);
    }
  };

  const handleSyncKeywords = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingKeywords(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleAdwordsKeywordsService.syncGoogleKeywords(accountIdNum);
      let message =
        result.message || `Successfully synced ${result.synced} keywords`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "keywords", message });

      // Reset to first page and reload keywords after sync
      if (result.synced > 0) {
        setKeywordsCurrentPage(1);
        // Small delay to ensure database is updated
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadKeywords();

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keywords from Google Ads";
      setSyncMessage({ type: "keywords", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingKeywords(false);
    }
  };

  const handleSyncAdGroupsAnalytics = async () => {
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
        `Successfully synced adgroup analytics: ${
          result.rows_inserted || 0
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
  };

  const handleSyncAdsAnalytics = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAdsAnalytics(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleAdwordsAdsService.syncGoogleAdAnalytics(
        accountIdNum,
        startDate ? startDate.toISOString() : undefined,
        endDate ? endDate.toISOString() : undefined
      );

      let message =
        result.message ||
        `Successfully synced ad analytics: ${
          result.rows_inserted || 0
        } inserted, ${result.rows_updated || 0} updated`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "ads", message });

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setAdsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadAds();
      }

      if ((result.rows_inserted || 0) > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ad analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ad analytics from Google Ads";
      setSyncMessage({ type: "ads", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingAdsAnalytics(false);
    }
  };

  const handleSyncKeywordsAnalytics = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingKeywordsAnalytics(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleAdwordsKeywordsService.syncGoogleKeywordAnalytics(
        accountIdNum,
        startDate ? startDate.toISOString() : undefined,
        endDate ? endDate.toISOString() : undefined
      );

      let message =
        result.message ||
        `Successfully synced keyword analytics: ${
          result.rows_inserted || 0
        } inserted, ${result.rows_updated || 0} updated`;

      if (result.errors && result.errors.length > 0) {
        const errorText = result.errors.slice(0, 3).join("; ");
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }

      setSyncMessage({ type: "keywords", message });

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setKeywordsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadKeywords();
      }

      if ((result.rows_inserted || 0) > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keyword analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keyword analytics from Google Ads";
      setSyncMessage({ type: "keywords", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingKeywordsAnalytics(false);
    }
  };

  const handleSyncAssetGroups = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAssetGroups(true);
      setSyncMessage({ type: null, message: null });
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

      setSyncMessage({ type: "assetgroups", message });

      // Reset to first page and reload asset groups after sync
      if (result.synced > 0) {
        setAssetGroupsCurrentPage(1);
        // Small delay to ensure database is updated
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await loadAssetGroups();

      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync asset groups:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync asset groups from Google Ads";
      setSyncMessage({ type: "assetgroups", message: errorMessage });
      setTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingAssetGroups(false);
    }
  };

  const toggleChartMetric = (
    metric: "sales" | "spend" | "clicks" | "orders"
  ) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Handler for creating Ad Group (ad group + minimal ad)
  const handleCreateAdGroup = async (entity: AdGroupInput) => {
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
      const adgroupCount = response.adgroup ? 1 : 0;
      const adCount = response.ad ? 1 : 0;
      const keywordCount = response.keywords ? response.keywords.length : 0;
      const errorCount = response.errors ? response.errors.length : 0;

      // Only count entities that exist in response
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
            `Successfully created: ${totalCreated} ${
              totalCreated !== 1 ? "entities" : "entity"
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
        setCreateSearchEntitiesError(null);
        setErrorModal({
          isOpen: true,
          title: "Creation Summary",
          message: summaryMessage,
          isSuccess: false,
          errorDetails: response.error_details || undefined,
        });

        // Reload data to show new entities even if there are errors
        await loadAdGroups();
        await loadAds();
      } else {
        // Success - close panel and show success message
        setIsCreateSearchEntitiesPanelOpen(false);
        setCreateSearchEntitiesError(null);
        const successMessage = `Successfully created ${totalCreated} ${
          totalCreated !== 1 ? "entities" : "entity"
        }:\n${createdEntities.map((e) => `• ${e}`).join("\n")}`;
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage.trim(),
          isSuccess: true,
        });

        // Reload data to show new entities
        await loadAdGroups();
        await loadAds();
      }
    } catch (error: any) {
      console.error("Failed to create ad group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create ad group. Please try again.";
      // Close panel and show error modal
      setIsCreateSearchEntitiesPanelOpen(false);
      setCreateSearchEntitiesError(null);
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

  // Handler for creating Ad (ad group + ad)
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
      const adgroupCount = response.adgroup ? 1 : 0;
      const adCount = response.ad ? 1 : 0;
      const keywordCount = response.keywords ? response.keywords.length : 0;
      const errorCount = response.errors ? response.errors.length : 0;

      // Only count entities that exist in response
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
            `Successfully created: ${totalCreated} ${
              totalCreated !== 1 ? "entities" : "entity"
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
        await loadAdGroups();
        await loadAds();
      } else {
        // Success - close panel and show success message
        setIsCreateSearchEntitiesPanelOpen(false);
        setCreateSearchEntitiesError(null);
        const successMessage = `Successfully created ${totalCreated} ${
          totalCreated !== 1 ? "entities" : "entity"
        }:\n${createdEntities.map((e) => `• ${e}`).join("\n")}`;
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage.trim(),
          isSuccess: true,
        });

        // Reload data to show new entities
        await loadAdGroups();
        await loadAds();
      }
    } catch (error: any) {
      console.error("Failed to create ad:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create ad. Please try again.";
      // Close panel and show error modal
      setIsCreateSearchEntitiesPanelOpen(false);
      setCreateSearchEntitiesError(null);
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

  // Handler for creating Keywords (ad group + minimal ad + keywords)
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
      const adgroupCount = response.adgroup ? 1 : 0;
      const adCount = response.ad ? 1 : 0;
      const keywordCount = response.keywords ? response.keywords.length : 0;
      const errorCount = response.errors ? response.errors.length : 0;

      // Only count entities that exist in response
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
            `Successfully created: ${totalCreated} ${
              totalCreated !== 1 ? "entities" : "entity"
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
        setCreateSearchEntitiesError(null);
        setErrorModal({
          isOpen: true,
          title: "Creation Summary",
          message: summaryMessage,
          isSuccess: false,
          errorDetails: response.error_details || undefined,
        });

        // Reload data to show new entities even if there are errors
        await loadAdGroups();
        await loadKeywords();
      } else {
        // Success - close panel and show success message
        setIsCreateSearchEntitiesPanelOpen(false);
        setCreateSearchEntitiesError(null);
        const successMessage = `Successfully created ${totalCreated} ${
          totalCreated !== 1 ? "entities" : "entity"
        }:\n${createdEntities.map((e) => `• ${e}`).join("\n")}`;
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: successMessage.trim(),
          isSuccess: true,
        });

        // Reload data to show new entities
        await loadAdGroups();
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
      setCreateSearchEntitiesError(null);
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

  // Handler for creating Performance Max asset group
  const handleCreatePmaxAssetGroup = async (entity: PmaxAssetGroupInput) => {
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
        // Close panel and show error modal
        setIsCreatePmaxAssetGroupPanelOpen(false);
        setCreatePmaxAssetGroupError(null);
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: response.error,
          isSuccess: false,
        });
      } else {
        // Success - close panel and show success message
        setIsCreatePmaxAssetGroupPanelOpen(false);
        setCreatePmaxAssetGroupError(null);
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: "Asset group created successfully!",
          isSuccess: true,
        });

        // Reload asset groups to show the newly created one
        await loadAssetGroups();
      }
    } catch (error: any) {
      console.error("Failed to create asset group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create asset group. Please try again.";
      // Close panel and show error modal
      setIsCreatePmaxAssetGroupPanelOpen(false);
      setCreatePmaxAssetGroupError(null);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreatePmaxAssetGroupLoading(false);
    }
  };

  // Safe mapping function to convert API data to form data
  const mapApiDataToForm = (apiData: any): AssetGroupInitialData => {
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
  };

  // Handler for editing asset group (fetches data when edit button is clicked)
  const handleEditAssetGroup = async (assetGroup: any) => {
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

      // Step 3: Fetch data from API using refresh endpoint (same as campaigns page)
      // This returns campaign data with extra_data containing all asset group fields
      let refreshedCampaignData = null;
      try {
        const refreshResponse =
          await campaignsService.refreshGoogleCampaignFromAPI(
            accountIdNum,
            campaignIdNum
          );
        refreshedCampaignData = refreshResponse.campaign;
        // Success - data refreshed from API
        setRefreshAssetGroupMessage({
          type: "success",
          message: "Asset group data refreshed from Google Ads API",
          details: refreshResponse.message || "Latest data loaded successfully",
        });
      } catch (refreshError: any) {
        // Failed to refresh from API, use cached data from database
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

      // Step 4: Extract asset group data from extra_data (same as campaigns page)
      const extra_data = refreshedCampaignData?.extra_data || {};
      const mappedData = mapApiDataToForm(extra_data);
      setEditingAssetGroupData(mappedData);
      setEditingAssetGroupId(assetGroup.asset_group_id);

      // Scroll to edit panel section after data is loaded and panel is rendered
      // Use a small delay to ensure the panel is rendered before scrolling
      setTimeout(() => {
        // Find the edit panel element and scroll to it
        const editPanelElement = document.querySelector('[data-edit-asset-group-panel]');
        if (editPanelElement) {
          editPanelElement.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          // Fallback to scrolling to top if panel not found yet
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    } catch (error: any) {
      console.error("Failed to fetch asset group data:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Could not fetch latest from Google API";

      // On error: fallback to table row data if available
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
          headlines: ["", "", ""], // Minimum 3 required
          descriptions: ["", ""], // Minimum 2 required
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
  };

  // Handler for updating asset group status
  const handleUpdateAssetGroupStatus = async (
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
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
      throw error;
    }
  };

  // Handler for updating asset group
  const handleUpdateAssetGroup = async (entity: PmaxAssetGroupInput) => {
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

      // Map form data to backend format (all fields including business_name and logo_url)
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

      // Success - show success message
      setErrorModal({
        isOpen: true,
        title: "Success",
        message: "Asset group updated successfully!",
        isSuccess: true,
      });

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
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setEditAssetGroupLoading(false);
    }
  };

  // Handler to close edit panel and reset state
  const handleCloseEditPanel = () => {
    setIsEditAssetGroupPanelOpen(false);
    setEditingAssetGroupId(null);
    setEditingAssetGroupData(null);
    setEditAssetGroupError(null);
    setRefreshAssetGroupMessage(null);
    setEditLoadingAssetGroupId(null);
  };

  // Handler for creating Shopping ad group only (for Ad Groups tab)
  const handleCreateShoppingAdGroup = async (entity: AdGroupInput) => {
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
      // Note: This is for creating just an ad group, not a product ad
      // For product ads, use handleCreateShoppingEntities instead
      const shoppingEntity: ShoppingEntityInput = {
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
        // Close panel and show error modal
        setIsCreateShoppingEntitiesPanelOpen(false);
        setCreateShoppingEntitiesError(null);
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: response.error,
          isSuccess: false,
        });
      } else {
        // Success - close panel and show success message
        setIsCreateShoppingEntitiesPanelOpen(false);
        setCreateShoppingEntitiesError(null);
        const adgroupName = response.adgroup?.name || "Ad group";
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `Ad group "${adgroupName}" created successfully!`,
          isSuccess: true,
        });

        // Reload data to show new entities
        await loadAdGroups();
      }
    } catch (error: any) {
      console.error("Failed to create shopping ad group:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create ad group. Please try again.";
      // Close panel and show error modal
      setIsCreateShoppingEntitiesPanelOpen(false);
      setCreateShoppingEntitiesError(null);
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

  // Handler for creating Shopping entities (ad group + product group)
  const handleCreateShoppingEntities = async (entity: ShoppingEntityInput) => {
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

      const response = await googleAdwordsCampaignsService.createGoogleShoppingEntities(
        accountIdNum,
        campaignIdNum,
        entity
      );

      if (response.error) {
        // Close panel and show error modal
        setIsCreateShoppingEntitiesPanelOpen(false);
        setCreateShoppingEntitiesError(null);
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: response.error,
          isSuccess: false,
        });
      } else {
        // Success - close panel and show success message
        setIsCreateShoppingEntitiesPanelOpen(false);
        setCreateShoppingEntitiesError(null);
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
        await loadAdGroups();
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
      setCreateShoppingEntitiesError(null);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrency2Decimals = (value: number | string | undefined) => {
    if (value === undefined || value === null) return "$0.00";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const formatPercentage = (value: number | string | undefined) => {
    if (value === undefined || value === null) return "0.00%";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "0.00%";
    return `${numValue.toFixed(2)}%`;
  };

  const getSortIcon = (
    column: string,
    currentSortBy: string,
    currentSortOrder: "asc" | "desc"
  ) => {
    if (currentSortBy !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return currentSortOrder === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-[#556179]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#556179]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  // Use chart data from API, or generate fallback if empty
  const chartData = useMemo(() => {
    if (campaignDetail?.chart_data && campaignDetail.chart_data.length > 0) {
      return campaignDetail.chart_data.map((item) => ({
        date: item.date,
        sales: item.sales || 0,
        spend: item.spend || 0,
        clicks: item.clicks || 0,
        orders: 0, // Google doesn't have orders, but chart expects it
      }));
    }
    return [];
  }, [campaignDetail]);

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
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  navigate(`/accounts/${accountId}/google-campaigns`)
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
                <span className="text-[14px] font-medium">
                  Back to Campaigns
                </span>
              </button>
              <h1 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                {loading
                  ? "Loading..."
                  : campaignDetail
                  ? campaignDetail.campaign.name
                  : "Campaign Not Found"}
              </h1>
            </div>

            {/* Campaign Entity Information Card */}
            {campaignDetail && (
              <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
                <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">
                  Campaign Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Campaign Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Campaign Name
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.name || "—"}
                    </div>
                  </div>

                  {/* Campaign ID */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Campaign ID
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.campaign_id}
                    </div>
                  </div>

                  {/* Status - Editable */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Status
                    </label>
                    {editingField === "status" ? (
                      <div className="flex items-center gap-2">
                        <Dropdown
                          options={[
                            { value: "ENABLED", label: "Enabled" },
                            { value: "PAUSED", label: "Paused" },
                            // REMOVED is read-only - cannot be set via update operation
                          ]}
                          value={editedValue}
                          onChange={(val) => {
                            const newValue = val as string;
                            setEditedValue(newValue);
                            if (newValue !== campaignDetail.campaign.status) {
                              setInlineEditField("status");
                              setInlineEditOldValue(
                                campaignDetail.campaign.status
                              );
                              setInlineEditNewValue(newValue);
                              setShowInlineEditModal(true);
                            } else {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                          defaultOpen={true}
                          closeOnSelect={true}
                          buttonClassName="w-full text-[13.3px] px-2 py-1"
                          width="w-full"
                        />
                      </div>
                    ) : (
                      <div
                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingField("status");
                          setEditedValue(
                            campaignDetail.campaign.status || "ENABLED"
                          );
                        }}
                      >
                        <StatusBadge
                          status={
                            campaignDetail.campaign.status === "ENABLED"
                              ? "Enabled"
                              : campaignDetail.campaign.status === "PAUSED"
                              ? "Paused"
                              : "Removed"
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Budget - Editable */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Budget
                    </label>
                    {editingField === "budget" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-32"
                          autoFocus
                          onBlur={() => {
                            const budgetValue = parseFloat(editedValue);
                            const oldBudget =
                              campaignDetail.campaign.daily_budget || 0;
                            if (
                              !isNaN(budgetValue) &&
                              budgetValue !== oldBudget
                            ) {
                              setInlineEditField("budget");
                              setInlineEditOldValue(formatCurrency(oldBudget));
                              setInlineEditNewValue(editedValue);
                              setShowInlineEditModal(true);
                            } else {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const budgetValue = parseFloat(editedValue);
                              const oldBudget =
                                campaignDetail.campaign.daily_budget || 0;
                              if (
                                !isNaN(budgetValue) &&
                                budgetValue !== oldBudget
                              ) {
                                setInlineEditField("budget");
                                setInlineEditOldValue(
                                  formatCurrency(oldBudget)
                                );
                                setInlineEditNewValue(editedValue);
                                setShowInlineEditModal(true);
                              } else {
                                setEditingField(null);
                                setEditedValue("");
                              }
                            } else if (e.key === "Escape") {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingField("budget");
                          setEditedValue(
                            (
                              campaignDetail.campaign.daily_budget || 0
                            ).toString()
                          );
                        }}
                      >
                        {formatCurrency(
                          campaignDetail.campaign.daily_budget || 0
                        )}
                      </div>
                    )}
                  </div>

                  {/* Channel Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Channel Type
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.advertising_channel_type || "—"}
                    </div>
                  </div>

                  {/* Account Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Account
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.account_name ||
                        campaignDetail.campaign.customer_id ||
                        "—"}
                    </div>
                  </div>

                  {/* Start Date - Editable */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Start Date
                    </label>
                    {editingField === "start_date" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-40"
                          autoFocus
                          onBlur={() => {
                            const oldDate = campaignDetail.campaign.start_date
                              ? new Date(campaignDetail.campaign.start_date)
                                  .toISOString()
                                  .split("T")[0]
                              : "";
                            if (editedValue && editedValue !== oldDate) {
                              setInlineEditField("start_date");
                              setInlineEditOldValue(oldDate || "Not set");
                              setInlineEditNewValue(editedValue);
                              setShowInlineEditModal(true);
                            } else {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const oldDate = campaignDetail.campaign.start_date
                                ? new Date(campaignDetail.campaign.start_date)
                                    .toISOString()
                                    .split("T")[0]
                                : "";
                              if (editedValue && editedValue !== oldDate) {
                                setInlineEditField("start_date");
                                setInlineEditOldValue(oldDate || "Not set");
                                setInlineEditNewValue(editedValue);
                                setShowInlineEditModal(true);
                              } else {
                                setEditingField(null);
                                setEditedValue("");
                              }
                            } else if (e.key === "Escape") {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingField("start_date");
                          const startDate = campaignDetail.campaign.start_date
                            ? new Date(campaignDetail.campaign.start_date)
                                .toISOString()
                                .split("T")[0]
                            : "";
                          setEditedValue(startDate);
                        }}
                      >
                        {campaignDetail.campaign.start_date
                          ? new Date(
                              campaignDetail.campaign.start_date
                            ).toLocaleDateString()
                          : "—"}
                      </div>
                    )}
                  </div>

                  {/* End Date - Editable */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      End Date
                    </label>
                    {editingField === "end_date" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-40"
                          autoFocus
                          onBlur={() => {
                            const oldDate = campaignDetail.campaign.end_date
                              ? new Date(campaignDetail.campaign.end_date)
                                  .toISOString()
                                  .split("T")[0]
                              : "";
                            if (editedValue && editedValue !== oldDate) {
                              setInlineEditField("end_date");
                              setInlineEditOldValue(oldDate || "Not set");
                              setInlineEditNewValue(editedValue);
                              setShowInlineEditModal(true);
                            } else {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const oldDate = campaignDetail.campaign.end_date
                                ? new Date(campaignDetail.campaign.end_date)
                                    .toISOString()
                                    .split("T")[0]
                                : "";
                              if (editedValue && editedValue !== oldDate) {
                                setInlineEditField("end_date");
                                setInlineEditOldValue(oldDate || "Not set");
                                setInlineEditNewValue(editedValue);
                                setShowInlineEditModal(true);
                              } else {
                                setEditingField(null);
                                setEditedValue("");
                              }
                            } else if (e.key === "Escape") {
                              setEditingField(null);
                              setEditedValue("");
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingField("end_date");
                          const endDate = campaignDetail.campaign.end_date
                            ? new Date(campaignDetail.campaign.end_date)
                                .toISOString()
                                .split("T")[0]
                            : "";
                          setEditedValue(endDate);
                        }}
                      >
                        {campaignDetail.campaign.end_date
                          ? new Date(
                              campaignDetail.campaign.end_date
                            ).toLocaleDateString()
                          : "—"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            {loading ? (
              <div className="flex flex-col gap-4 mb-4">
                <div className="text-center py-8">Loading campaign data...</div>
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
                    // Default KPI cards with zero values if no data available - matching Amazon's 6 stats
                    <>
                      <KPICard
                        label="Spends "
                        value="$0"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                      <KPICard
                        label="Sales "
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
                        label="ACOS"
                        value="0.0%"
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                      />
                      <KPICard
                        label="ROAS"
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
                  {/* Create Asset Group Panel - Only for PERFORMANCE_MAX campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type ===
                    "PERFORMANCE_MAX" && (
                    <>
                      <div className="mb-4 flex justify-end">
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
                      </div>
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
                            />
                          </div>
                        )}
                    </>
                  )}
                  <GoogleCampaignDetailAssetGroupsTab
                    assetGroups={assetGroups}
                    loading={assetGroupsLoading}
                    selectedAssetGroupIds={selectedAssetGroupIds}
                    onSelectAll={(checked) => {
                      if (checked) {
                        setSelectedAssetGroupIds(
                          new Set(assetGroups.map((ag) => ag.id))
                        );
                      } else {
                        setSelectedAssetGroupIds(new Set());
                      }
                    }}
                    onSelectAssetGroup={(id, checked) => {
                      setSelectedAssetGroupIds((prev) => {
                        const newSet = new Set(prev);
                        if (checked) {
                          newSet.add(id);
                        } else {
                          newSet.delete(id);
                        }
                        return newSet;
                      });
                    }}
                    sortBy={assetGroupsSortBy}
                    sortOrder={assetGroupsSortOrder}
                    onSort={(column) => {
                      if (assetGroupsSortBy === column) {
                        setAssetGroupsSortOrder(
                          assetGroupsSortOrder === "asc" ? "desc" : "asc"
                        );
                      } else {
                        setAssetGroupsSortBy(column);
                        setAssetGroupsSortOrder("asc");
                      }
                      setAssetGroupsCurrentPage(1);
                    }}
                    currentPage={assetGroupsCurrentPage}
                    totalPages={assetGroupsTotalPages}
                    onPageChange={setAssetGroupsCurrentPage}
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
                    syncing={syncingAssetGroups}
                    onSync={handleSyncAssetGroups}
                    syncingAnalytics={false}
                    onSyncAnalytics={async () => {
                      // TODO: Implement asset groups analytics sync
                      console.log(
                        "Sync asset groups analytics not yet implemented"
                      );
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
                  />
                </>
              )}

              {activeTab === "Ad Groups" && (
                <>
                  {/* Create Ad Group Panel - For SEARCH and SHOPPING campaigns */}
                  {(campaignDetail?.campaign.advertising_channel_type ===
                    "SEARCH" ||
                    campaignDetail?.campaign.advertising_channel_type ===
                      "SHOPPING") && (
                    <>
                      <div className="mb-4 flex justify-end">
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
                      </div>
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
                    onUpdateAdGroupStatus={async (
                      adgroupId: number,
                      status: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the adgroup to get adgroup_id
                        const adgroup = adgroups.find(
                          (ag) => ag.id === adgroupId
                        );
                        if (!adgroup || !adgroup.adgroup_id) {
                          alert("Ad group not found");
                          return;
                        }

                        // Call API
                        await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
                          accountIdNum,
                          {
                            adgroupIds: [adgroup.adgroup_id],
                            action: "status",
                            status: status as "ENABLED" | "PAUSED",
                          }
                        );

                        // Update local state instead of reloading
                        setAdgroups((prevAdgroups) =>
                          prevAdgroups.map((ag) =>
                            ag.id === adgroupId ? { ...ag, status: status } : ag
                          )
                        );
                      } catch (error: any) {
                        console.error(
                          "Failed to update adgroup status:",
                          error
                        );
                        alert(
                          error.response?.data?.error ||
                            "Failed to update adgroup status"
                        );
                        throw error;
                      }
                    }}
                    onUpdateAdGroupBid={async (
                      adgroupId: number,
                      bid: number
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the adgroup to get adgroup_id
                        const adgroup = adgroups.find(
                          (ag) => ag.id === adgroupId
                        );
                        if (!adgroup || !adgroup.adgroup_id) {
                          alert("Ad group not found");
                          return;
                        }

                        // Call API
                        await googleAdwordsAdGroupsService.bulkUpdateGoogleAdGroups(
                          accountIdNum,
                          {
                            adgroupIds: [adgroup.adgroup_id],
                            action: "bid",
                            bid: bid,
                          }
                        );

                        // Update local state
                        setAdgroups((prevAdgroups) =>
                          prevAdgroups.map((ag) =>
                            ag.id === adgroupId
                              ? { ...ag, cpc_bid_dollars: bid }
                              : ag
                          )
                        );
                      } catch (error: any) {
                        console.error("Failed to update adgroup bid:", error);
                        alert(
                          error.response?.data?.error ||
                            "Failed to update adgroup bid"
                        );
                        throw error;
                      }
                    }}
                    onStartNameEdit={handleStartAdGroupNameEdit}
                    accountId={accountId}
                    onBulkUpdateComplete={loadAdGroups}
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
                        <div className="mb-4 flex justify-end">
                          <CreateGoogleAdSection
                            isOpen={isCreateSearchEntitiesPanelOpen}
                            onToggle={() => {
                              setIsCreateSearchEntitiesPanelOpen(
                                !isCreateSearchEntitiesPanelOpen
                              );
                              setIsAdsFilterPanelOpen(false);
                            }}
                          />
                        </div>
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
                        <div className="mb-4 flex justify-end">
                          <CreateGoogleShoppingEntitiesSection
                            isOpen={isCreateShoppingEntitiesPanelOpen}
                            onToggle={() => {
                              setIsCreateShoppingEntitiesPanelOpen(
                                !isCreateShoppingEntitiesPanelOpen
                              );
                              setIsAdsFilterPanelOpen(false);
                            }}
                          />
                        </div>
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
                      onUpdateAdStatus={async (
                        adId: number,
                        status: string
                      ) => {
                        try {
                          const accountIdNum = parseInt(accountId!, 10);
                          if (isNaN(accountIdNum)) return;

                          // Find the ad to get ad_id
                          const ad = ads.find((a) => a.id === adId);
                          if (!ad || !ad.ad_id) {
                            alert("Ad not found");
                            return;
                          }

                          // Call API
                          await googleAdwordsAdsService.bulkUpdateGoogleAds(
                            accountIdNum,
                            {
                              adIds: [ad.ad_id],
                              action: "status",
                              status: status as
                                | "ENABLED"
                                | "PAUSED"
                                | "REMOVED",
                            }
                          );

                          // Update local state
                          setAds((prevAds) =>
                            prevAds.map((a) =>
                              a.id === adId ? { ...a, status } : a
                            )
                          );
                        } catch (error: any) {
                          console.error("Failed to update ad status:", error);
                          alert(
                            error.response?.data?.error ||
                              "Failed to update ad status"
                          );
                        }
                      }}
                    />
                  </>
                )}

              {activeTab === "Keywords" && (
                <>
                  {/* Create Keywords Panel - Only for SEARCH campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type ===
                    "SEARCH" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGoogleKeywordSection
                          isOpen={isCreateSearchEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateSearchEntitiesPanelOpen(
                              !isCreateSearchEntitiesPanelOpen
                            );
                            setIsKeywordsFilterPanelOpen(false);
                          }}
                        />
                      </div>
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
                    onUpdateKeywordStatus={async (
                      keywordId: number,
                      status: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the keyword to get keyword_id
                        const keyword = keywords.find(
                          (k) => k.id === keywordId
                        );
                        if (!keyword || !keyword.keyword_id) {
                          alert("Keyword not found");
                          return;
                        }

                        // Call API
                        await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(
                          accountIdNum,
                          {
                            keywordIds: [keyword.keyword_id],
                            action: "status",
                            status: status as "ENABLED" | "PAUSED",
                          }
                        );

                        // Update local state
                        setKeywords((prevKeywords) =>
                          prevKeywords.map((k) =>
                            k.id === keywordId ? { ...k, status } : k
                          )
                        );
                      } catch (error: any) {
                        console.error(
                          "Failed to update keyword status:",
                          error
                        );
                        alert(
                          error.response?.data?.error ||
                            "Failed to update keyword status"
                        );
                      }
                    }}
                    onUpdateKeywordBid={async (
                      keywordId: number,
                      bid: number
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the keyword to get keyword_id
                        const keyword = keywords.find(
                          (k) => k.id === keywordId
                        );
                        if (!keyword || !keyword.keyword_id) {
                          alert("Keyword not found");
                          return;
                        }

                        // Call API
                        await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(
                          accountIdNum,
                          {
                            keywordIds: [keyword.keyword_id],
                            action: "bid",
                            bid: bid,
                          }
                        );

                        // Update local state
                        setKeywords((prevKeywords) =>
                          prevKeywords.map((k) =>
                            k.id === keywordId
                              ? { ...k, cpc_bid_dollars: bid }
                              : k
                          )
                        );
                      } catch (error: any) {
                        console.error("Failed to update keyword bid:", error);
                        alert(
                          error.response?.data?.error ||
                            "Failed to update keyword bid"
                        );
                      }
                    }}
                    onUpdateKeywordMatchType={async (
                      keywordId: number,
                      matchType: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the keyword to get keyword_id
                        const keyword = keywords.find(
                          (k) => k.id === keywordId
                        );
                        if (!keyword || !keyword.keyword_id) {
                          alert("Keyword not found");
                          return;
                        }

                        // Call API
                        await googleAdwordsKeywordsService.bulkUpdateGoogleKeywords(
                          accountIdNum,
                          {
                            keywordIds: [keyword.keyword_id],
                            action: "match_type",
                            match_type: matchType as
                              | "EXACT"
                              | "PHRASE"
                              | "BROAD",
                          }
                        );

                        // Update local state
                        setKeywords((prevKeywords) =>
                          prevKeywords.map((k) =>
                            k.id === keywordId
                              ? { ...k, match_type: matchType }
                              : k
                          )
                        );
                      } catch (error: any) {
                        console.error(
                          "Failed to update keyword match type:",
                          error
                        );
                        alert(
                          error.response?.data?.error ||
                            "Failed to update keyword match type"
                        );
                      }
                    }}
                    onStartKeywordTextEdit={handleStartKeywordTextEdit}
                    onStartFinalUrlEdit={handleStartFinalUrlEdit}
                  />
                </>
              )}

              {activeTab === "Negative Keywords" && (
                <>
                  {/* Create Negative Keywords Panel */}
                  <div className="mb-4 flex justify-end">
                    <CreateGoogleNegativeKeywordSection
                      isOpen={isCreateNegativeKeywordPanelOpen}
                      onToggle={() => {
                        setIsCreateNegativeKeywordPanelOpen(
                          !isCreateNegativeKeywordPanelOpen
                        );
                        setIsNegativeKeywordsFilterPanelOpen(false);
                      }}
                    />
                  </div>
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
                    onUpdateNegativeKeywordStatus={async (
                      criterionId: string,
                      status: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        await googleAdwordsNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(
                          accountIdNum,
                          {
                            negativeKeywordIds: [criterionId],
                            action: "status",
                            value: status,
                            level: "campaign", // Default to campaign level
                          }
                        );

                        await loadNegativeKeywords();
                      } catch (error: any) {
                        console.error(
                          "Failed to update negative keyword status:",
                          error
                        );
                        alert(
                          error.response?.data?.error ||
                            "Failed to update negative keyword status"
                        );
                      }
                    }}
                    onUpdateNegativeKeywordMatchType={async (
                      criterionId: string,
                      matchType: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        await googleAdwordsNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(
                          accountIdNum,
                          {
                            negativeKeywordIds: [criterionId],
                            action: "match_type",
                            value: matchType,
                            level: "campaign", // Default to campaign level
                          }
                        );

                        await loadNegativeKeywords();
                      } catch (error: any) {
                        console.error(
                          "Failed to update negative keyword match type:",
                          error
                        );
                        alert(
                          error.response?.data?.error ||
                            "Failed to update negative keyword match type"
                        );
                      }
                    }}
                    onUpdateNegativeKeywordText={handleUpdateNegativeKeywordText}
                  />
                </>
              )}

              {activeTab === "Product Groups" && (
                <>
                  {/* Create Shopping Entities Panel - Only for SHOPPING campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type ===
                    "SHOPPING" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGoogleShoppingEntitiesSection
                          isOpen={isCreateShoppingEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateShoppingEntitiesPanelOpen(
                              !isCreateShoppingEntitiesPanelOpen
                            );
                            // Close filter panel if exists
                          }}
                        />
                      </div>
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
                    onSelectAll={(checked) => {
                      if (checked) {
                        setSelectedProductGroupIds(
                          new Set(productGroups.map((pg) => pg.id))
                        );
                      } else {
                        setSelectedProductGroupIds(new Set());
                      }
                    }}
                    onSelectProductGroup={(id, checked) => {
                      setSelectedProductGroupIds((prev) => {
                        const newSet = new Set(prev);
                        if (checked) {
                          newSet.add(id);
                        } else {
                          newSet.delete(id);
                        }
                        return newSet;
                      });
                    }}
                    sortBy={productGroupsSortBy}
                    sortOrder={productGroupsSortOrder}
                    onSort={(column) => {
                      if (productGroupsSortBy === column) {
                        setProductGroupsSortOrder(
                          productGroupsSortOrder === "asc" ? "desc" : "asc"
                        );
                      } else {
                        setProductGroupsSortBy(column);
                        setProductGroupsSortOrder("asc");
                      }
                      setProductGroupsCurrentPage(1);
                    }}
                    currentPage={productGroupsCurrentPage}
                    totalPages={productGroupsTotalPages}
                    onPageChange={setProductGroupsCurrentPage}
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
                    onUpdateProductGroupStatus={async (
                      productGroupId: number,
                      status: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the product group to get ad_id
                        // Product groups are stored in the ads table, so they have ad_id (from GoogleAd interface)
                        const productGroup = productGroups.find(
                          (pg) => pg.id === productGroupId
                        );
                        if (!productGroup) {
                          alert("Product group not found");
                          return;
                        }

                        // Product groups come from the ads table, so they should have ad_id
                        // Try both snake_case and camelCase field names
                        const adId =
                          (productGroup as any).ad_id ||
                          (productGroup as any).adId;
                        if (!adId) {
                          alert(
                            "Product group ad ID not found. Please sync product groups first."
                          );
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
                        await googleAdwordsAdsService.bulkUpdateGoogleAds(
                          accountIdNum,
                          {
                            adIds: [adId],
                            action: "status",
                            status: status as "ENABLED" | "PAUSED" | "REMOVED",
                            campaignId: campaignId
                              ? String(campaignId)
                              : undefined,
                            adGroupId: adGroupId
                              ? String(adGroupId)
                              : undefined,
                          }
                        );

                        // Update local state
                        setProductGroups((prevProductGroups) =>
                          prevProductGroups.map((pg) =>
                            pg.id === productGroupId ? { ...pg, status } : pg
                          )
                        );
                      } catch (error: any) {
                        console.error(
                          "Failed to update product group status:",
                          error
                        );
                        alert(
                          error.response?.data?.error ||
                            "Failed to update product group status"
                        );
                        throw error;
                      }
                    }}
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

      {/* Inline Edit Confirmation Modal */}
      {showInlineEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Change</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {inlineEditField === "status"
                  ? "Status"
                  : inlineEditField === "budget"
                  ? "Budget"
                  : inlineEditField === "start_date"
                  ? "Start Date"
                  : "End Date"}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">From:</span>
                <span className="text-sm font-medium">
                  {inlineEditOldValue}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">To:</span>
                <span className="text-sm font-medium">
                  {inlineEditField === "status"
                    ? inlineEditNewValue
                    : inlineEditField === "budget"
                    ? `$${parseFloat(
                        inlineEditNewValue || "0"
                      ).toLocaleString()}`
                    : inlineEditNewValue}
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelInlineEdit}
                disabled={inlineEditLoading}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={runInlineEdit}
                disabled={inlineEditLoading}
                className="px-4 py-2 text-sm bg-[#136D6D] text-white rounded hover:bg-[#0f5a5a] disabled:opacity-50"
              >
                {inlineEditLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="cancel-button disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
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
                className="cancel-button disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
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
                className="px-4 py-2 text-[#136D6D] bg-transparent rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalUrlEditSave}
                disabled={finalUrlEditLoading || !finalUrlValue.trim()}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};
