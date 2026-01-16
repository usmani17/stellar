import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { KPICard } from "../../components/ui/KPICard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Dropdown } from "../../components/ui/Dropdown";
import { useDateRange } from "../../contexts/DateRangeContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { campaignsService } from "../../services/campaigns";
import type { FilterValues } from "../../components/filters/FilterPanel";
import { OverviewTab } from "./components/tabs/OverviewTab";
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
} from "./components/tabs/types";
import { CreateGoogleAdGroupPanel, type AdGroupInput } from "../../components/google/CreateGoogleAdGroupPanel";
import { CreateGoogleAdPanel, type AdInput } from "../../components/google/CreateGoogleAdPanel";
import { CreateGoogleKeywordPanel, type KeywordInput } from "../../components/google/CreateGoogleKeywordPanel";
import { CreateGoogleNegativeKeywordPanel, type NegativeKeywordInput } from "../../components/google/CreateGoogleNegativeKeywordPanel";
import { googleNegativeKeywordsService } from "../../services/googleNegativeKeywords";
import { CreateGooglePmaxAssetGroupPanel, type PmaxAssetGroupInput } from "../../components/google/CreateGooglePmaxAssetGroupPanel";
import { CreateGoogleShoppingEntitiesPanel, type ShoppingEntityInput } from "../../components/google/CreateGoogleShoppingEntitiesPanel";
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

// Types are now imported from ./components/tabs/types

export const GoogleCampaignDetail: React.FC = () => {
  const { accountId, campaignId } = useParams<{
    accountId: string;
    campaignId: string;
  }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("Overview");
  
  // Read tab from URL params on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      const validTabs = ["Overview", "Ad Groups", "Ads", "Keywords", "Negative Keywords", "Asset Groups", "Product Groups", "Logs"];
      if (validTabs.includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] =
    useState<GoogleCampaignDetail | null>(null);

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
  const [negativeKeywords, setNegativeKeywords] = useState<GoogleNegativeKeyword[]>([]);
  const [negativeKeywordsLoading, setNegativeKeywordsLoading] = useState(false);
  const [selectedNegativeKeywordIds, setSelectedNegativeKeywordIds] = useState<Set<number>>(
    new Set()
  );
  const [negativeKeywordsCurrentPage, setNegativeKeywordsCurrentPage] = useState(1);
  const [negativeKeywordsTotalPages, setNegativeKeywordsTotalPages] = useState(0);
  const [negativeKeywordsSortBy, setNegativeKeywordsSortBy] = useState<string>("id");
  const [negativeKeywordsSortOrder, setNegativeKeywordsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isNegativeKeywordsFilterPanelOpen, setIsNegativeKeywordsFilterPanelOpen] =
    useState(false);
  const [negativeKeywordsFilters, setNegativeKeywordsFilters] = useState<FilterValues>([]);
  const [syncingNegativeKeywords, setSyncingNegativeKeywords] = useState(false);
  const [isCreateNegativeKeywordPanelOpen, setIsCreateNegativeKeywordPanelOpen] = useState(false);
  const [createNegativeKeywordLoading, setCreateNegativeKeywordLoading] = useState(false);
  const [createNegativeKeywordError, setCreateNegativeKeywordError] = useState<string | null>(null);
  const [createdNegativeKeywords, setCreatedNegativeKeywords] = useState<any[]>([]);
  const [failedNegativeKeywords, setFailedNegativeKeywords] = useState<any[]>([]);

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
  const [selectedAssetGroupIds, setSelectedAssetGroupIds] = useState<Set<number>>(
    new Set()
  );
  const [assetGroupsCurrentPage, setAssetGroupsCurrentPage] = useState(1);
  const [assetGroupsTotalPages, setAssetGroupsTotalPages] = useState(0);
  const [assetGroupsSortBy, setAssetGroupsSortBy] = useState<string>("id");
  const [assetGroupsSortOrder, setAssetGroupsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isAssetGroupsFilterPanelOpen, setIsAssetGroupsFilterPanelOpen] =
    useState(false);
  const [assetGroupsFilters, setAssetGroupsFilters] = useState<FilterValues>([]);

  // Product Groups state (for Shopping)
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [productGroupsLoading, setProductGroupsLoading] = useState(false);
  const [selectedProductGroupIds, setSelectedProductGroupIds] = useState<Set<number>>(
    new Set()
  );
  const [productGroupsCurrentPage, setProductGroupsCurrentPage] = useState(1);
  const [productGroupsTotalPages, setProductGroupsTotalPages] = useState(0);
  const [productGroupsSortBy, setProductGroupsSortBy] = useState<string>("id");
  const [productGroupsSortOrder, setProductGroupsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isProductGroupsFilterPanelOpen, setIsProductGroupsFilterPanelOpen] =
    useState(false);
  const [productGroupsFilters, setProductGroupsFilters] = useState<FilterValues>([]);

  const [syncMessage, setSyncMessage] = useState<{
    type: "adgroups" | "ads" | "keywords" | "negative_keywords" | "assetgroups" | "productgroups" | null;
    message: string | null;
  }>({ type: null, message: null });

  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });

  // Creation panel state
  const [isCreateSearchEntitiesPanelOpen, setIsCreateSearchEntitiesPanelOpen] = useState(false);
  const [isCreatePmaxAssetGroupPanelOpen, setIsCreatePmaxAssetGroupPanelOpen] = useState(false);
  const [isCreateShoppingEntitiesPanelOpen, setIsCreateShoppingEntitiesPanelOpen] = useState(false);
  
  // Creation loading and error state
  const [createSearchEntitiesLoading, setCreateSearchEntitiesLoading] = useState(false);
  const [createSearchEntitiesError, setCreateSearchEntitiesError] = useState<string | null>(null);
  const [createPmaxAssetGroupLoading, setCreatePmaxAssetGroupLoading] = useState(false);
  const [createPmaxAssetGroupError, setCreatePmaxAssetGroupError] = useState<string | null>(null);
  const [createShoppingEntitiesLoading, setCreateShoppingEntitiesLoading] = useState(false);
  const [createShoppingEntitiesError, setCreateShoppingEntitiesError] = useState<string | null>(null);
  
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

  // Final URL edit modal state
  const [showFinalUrlModal, setShowFinalUrlModal] = useState(false);
  const [finalUrlKeyword, setFinalUrlKeyword] = useState<GoogleKeyword | null>(null);
  const [finalUrlValue, setFinalUrlValue] = useState<string>("");
  const [mobileFinalUrlValue, setMobileFinalUrlValue] = useState<string>("");
  const [useMobileFinalUrl, setUseMobileFinalUrl] = useState(false);
  const [finalUrlEditLoading, setFinalUrlEditLoading] = useState(false);

  // Keyword text edit modal state
  const [showKeywordTextEditModal, setShowKeywordTextEditModal] = useState(false);
  const [keywordTextEditKeyword, setKeywordTextEditKeyword] = useState<GoogleKeyword | null>(null);
  const [keywordTextEditValue, setKeywordTextEditValue] = useState<string>("");
  const [keywordTextEditLoading, setKeywordTextEditLoading] = useState(false);

  // Bid edit modal state (for confirmation)
  const [showBidConfirmationModal, setShowBidConfirmationModal] = useState(false);
  const [bidConfirmationKeyword, setBidConfirmationKeyword] = useState<GoogleKeyword | null>(null);
  const [bidConfirmationOldValue, setBidConfirmationOldValue] = useState<number>(0);
  const [bidConfirmationNewValue, setBidConfirmationNewValue] = useState<number>(0);
  const [bidConfirmationLoading, setBidConfirmationLoading] = useState(false);

  // Track if component is mounted to prevent state updates on unmounted components
  const isMountedRef = useRef(true);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear all pending timeouts
      timeoutIdsRef.current.forEach(id => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  // Compute available tabs based on campaign type
  const tabs = useMemo(() => {
    if (!campaignDetail?.campaign?.advertising_channel_type) {
      return ["Overview", "Ad Groups", "Ads", "Keywords", "Logs"];
    }

    const channelType = (campaignDetail.campaign.advertising_channel_type || "").toUpperCase().trim();

    if (channelType === "PERFORMANCE_MAX") {
      return ["Overview", "Asset Groups", "Logs"];
    } else if (channelType === "SHOPPING") {
      return ["Overview", "Ad Groups", "Product Groups", "Logs"];
    } else {
      // SEARCH or default
      return ["Overview", "Ad Groups", "Ads", "Keywords", "Negative Keywords", "Logs"];
    }
  }, [campaignDetail?.campaign?.advertising_channel_type]);

  // Helper function to safely set timeout with cleanup
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

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

    if (accountId && campaignId) {
      setLoading(true);
      loadCampaignDetail();
    } else {
      setLoading(false);
    }
  }, [accountId, campaignId, startDate, endDate]);

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

  const buildAssetGroupsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      if (filter.field === "name") {
        // Map "name" field to "asset_group_name" or "name" for Asset Groups
        if (filter.operator === "contains") {
          params.name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.name = filter.value;
        }
      } else if (filter.field === "status") {
        params.status = filter.value;
      }
    });
    return params;
  };

  const loadAssetGroups = useCallback(async () => {
    try {
      setAssetGroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAssetGroupsLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleAssetGroups(
        accountIdNum,
        parseInt(campaignId, 10),
        {
          page: assetGroupsCurrentPage,
          page_size: 100,
          sort_by: assetGroupsSortBy,
          order: assetGroupsSortOrder,
          ...buildAssetGroupsFilterParams(assetGroupsFilters),
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
    if (accountId && campaignId && (activeTab === "Ad Groups" || activeTab === "Negative Keywords")) {
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
      const data = await campaignsService.getGoogleAds(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          page: productGroupsCurrentPage,
          page_size: 100,
          sort_by: productGroupsSortBy,
          order: productGroupsSortOrder,
          ad_type: 'SHOPPING_PRODUCT_AD', // Filter for product groups only
          start_date: startDate ? startDate.toISOString().split("T")[0] : undefined,
          end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
          ...buildProductGroupsFilterParams(productGroupsFilters),
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

  const loadCampaignDetail = async () => {
    try {
      // Clear previous data immediately
      setCampaignDetail(null);
      const accountIdNum = parseInt(accountId!, 10);
      const currentCampaignId = campaignId; // Capture current campaignId

      if (isNaN(accountIdNum) || !currentCampaignId) {
        setLoading(false);
        return;
      }

      // Parse campaignId - it's a string from URL params
      const campaignIdNum = parseInt(currentCampaignId, 10);
      if (isNaN(campaignIdNum)) {
        console.error("Invalid campaign ID:", currentCampaignId);
        setLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleCampaignDetail(
        accountIdNum,
        campaignIdNum,
        startDate ? startDate.toISOString().split("T")[0] : undefined,
        endDate ? endDate.toISOString().split("T")[0] : undefined
      );

      // Set data if campaign ID matches (race condition check)
      if (currentCampaignId === campaignId) {
        setCampaignDetail(data);
      } 
      setLoading(false);
    } catch (error) {
      console.error("Failed to load Google campaign detail:", error);
      setCampaignDetail(null);
      setLoading(false);
    }
  };

  const buildAdGroupsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      } else if (filter.field === "status") {
        params.status = filter.value;
      }
    });
    return params;
  };

  const buildAdsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      if (filter.field === "name") {
        // Map "name" field to "ad_type" for Google Ads
        params.ad_type = filter.value;
      } else if (filter.field === "status") {
        params.status = filter.value;
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      }
    });
    return params;
  };

  const buildProductGroupsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      // Product groups only support status filtering
      // Note: "name" field should not map to "ad_type" for product groups
      // since we already filter by ad_type: 'SHOPPING_PRODUCT_AD'
      if (filter.field === "status") {
        params.status = filter.value;
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      }
    });
    return params;
  };

  const buildKeywordsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      if (filter.field === "name") {
        // Map "name" field to "keyword_text" for Google Keywords
        if (filter.operator === "contains") {
          params.keyword_text__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.keyword_text__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.keyword_text = filter.value;
        }
      } else if (filter.field === "type") {
        // Map "type" field to "match_type" for Google Keywords
        params.match_type = filter.value;
      } else if (filter.field === "status") {
        params.status = filter.value;
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      }
    });
    return params;
  };

  const loadAdGroups = async () => {
    try {
      setAdgroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdgroupsLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleAdGroups(
        accountIdNum,
        parseInt(campaignId, 10),
        {
          page: adgroupsCurrentPage,
          page_size: 100,
          sort_by: adgroupsSortBy,
          order: adgroupsSortOrder,
          ...buildAdGroupsFilterParams(adgroupsFilters),
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

      const data = await campaignsService.getGoogleAds(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          page: adsCurrentPage,
          page_size: 100,
          sort_by: adsSortBy,
          order: adsSortOrder,
          ...buildAdsFilterParams(adsFilters),
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

  const loadKeywords = async (page?: number) => {
    try {
      setKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setKeywordsLoading(false);
        return;
      }

      const pageToUse = page !== undefined ? page : keywordsCurrentPage;
      if (page !== undefined && page !== keywordsCurrentPage) {
        setKeywordsCurrentPage(page);
      }

      const data = await campaignsService.getGoogleKeywords(
        accountIdNum,
        parseInt(campaignId, 10),
        undefined,
        {
          page: pageToUse,
          page_size: 100,
          sort_by: keywordsSortBy,
          order: keywordsSortOrder,
          ...buildKeywordsFilterParams(keywordsFilters),
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

        await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
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

        await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaign_id],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });
      } else if (inlineEditField === "start_date") {
        await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaign_id],
          action: "start_date",
          start_date: inlineEditNewValue,
        });
      } else if (inlineEditField === "end_date") {
        await campaignsService.bulkUpdateGoogleCampaigns(accountIdNum, {
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
      setSelectedNegativeKeywordIds(new Set(negativeKeywords.map((nkw) => nkw.id)));
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
      setNegativeKeywordsSortOrder(negativeKeywordsSortOrder === "asc" ? "desc" : "asc");
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

      const data = await googleNegativeKeywordsService.getGoogleNegativeKeywords(
        accountIdNum,
        {
          filters: {
            campaign_id: campaignId,
            page: negativeKeywordsCurrentPage,
            page_size: 100,
            sort_by: negativeKeywordsSortBy,
            order: negativeKeywordsSortOrder,
            ...buildNegativeKeywordsFilterParams(negativeKeywordsFilters),
          },
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

  const buildNegativeKeywordsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      if (filter.field === "keyword_text" || filter.field === "name") {
        // Map "name" field to "keyword_text" for Negative Keywords
        if (filter.operator === "contains") {
          params.keyword_text__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.keyword_text__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.keyword_text = filter.value;
        }
      } else if (filter.field === "match_type" || filter.field === "type") {
        // Map "type" field to "match_type" for Negative Keywords
        params.match_type = filter.value;
      } else if (filter.field === "status") {
        params.status = filter.value;
      } else if ((filter.field as string) === "level") {
        params.level = filter.value;
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      }
    });
    return params;
  };

  const handleSyncNegativeKeywords = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingNegativeKeywords(true);
      setSyncMessage({ type: null, message: null });
      const result = await googleNegativeKeywordsService.syncGoogleNegativeKeywords(accountIdNum);
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync negative keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync negative keywords from Google Ads";
      setSyncMessage({ type: "negative_keywords", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
    } finally {
      setSyncingNegativeKeywords(false);
    }
  };

  const handleCreateNegativeKeywords = async (
    data: { negativeKeywords: NegativeKeywordInput[]; level: "campaign" | "adgroup"; adGroupId?: string }
  ) => {
    if (!accountId || !campaignId) return;

    try {
      setCreateNegativeKeywordLoading(true);
      setCreateNegativeKeywordError(null);
      setCreatedNegativeKeywords([]);
      setFailedNegativeKeywords([]);

      const accountIdNum = parseInt(accountId, 10);
      const result = await googleNegativeKeywordsService.createGoogleNegativeKeywords(
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
      setIsCreateNegativeKeywordPanelOpen(false); // Close panel on error
      if (error.response?.data?.failed_negative_keywords) {
        setFailedNegativeKeywords(error.response.data.failed_negative_keywords);
      }
    } finally {
      setCreateNegativeKeywordLoading(false);
    }
  };

  const handleUpdateNegativeKeywordStatus = async (criterionId: string, status: string) => {
    if (!accountId) return;

    try {
      // Find the negative keyword to get its level
      const negativeKeyword = negativeKeywords.find((nkw) => nkw.criterion_id === criterionId);
      if (!negativeKeyword || !negativeKeyword.level) {
        throw new Error("Negative keyword not found or level is missing");
      }

      const accountIdNum = parseInt(accountId, 10);
      await googleNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(accountIdNum, {
        negativeKeywordIds: [criterionId],
        action: "status",
        value: status,
        level: negativeKeyword.level,
      });
      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Failed to update negative keyword status:", error);
      throw error;
    }
  };

  const handleUpdateNegativeKeywordMatchType = async (criterionId: string, matchType: string) => {
    if (!accountId) return;

    try {
      // Find the negative keyword to get its level
      const negativeKeyword = negativeKeywords.find((nkw) => nkw.criterion_id === criterionId);
      if (!negativeKeyword || !negativeKeyword.level) {
        throw new Error("Negative keyword not found or level is missing");
      }

      const accountIdNum = parseInt(accountId, 10);
      await googleNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(accountIdNum, {
        negativeKeywordIds: [criterionId],
        action: "match_type",
        value: matchType,
        level: negativeKeyword.level,
      });
      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Failed to update negative keyword match type:", error);
      throw error;
    }
  };

  const handleUpdateNegativeKeywordText = async (criterionId: string, keywordText: string) => {
    if (!accountId) return;

    try {
      // Find the negative keyword to get its level
      const negativeKeyword = negativeKeywords.find((nkw) => nkw.criterion_id === criterionId);
      if (!negativeKeyword || !negativeKeyword.level) {
        throw new Error("Negative keyword not found or level is missing");
      }

      const accountIdNum = parseInt(accountId, 10);
      await googleNegativeKeywordsService.bulkUpdateGoogleNegativeKeywords(accountIdNum, {
        negativeKeywordIds: [criterionId],
        action: "keyword_text",
        keyword_text: keywordText,
        level: negativeKeyword.level,
      });
      await loadNegativeKeywords();
    } catch (error: any) {
      console.error("Failed to update negative keyword text:", error);
      throw error;
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

  // Final URL edit handler
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
      const response = await campaignsService.bulkUpdateGoogleKeywords(accountIdNum, {
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

  // Keyword text edit handler
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
      const response = await campaignsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: [keywordTextEditKeyword.keyword_id],
        action: "keyword_text",
        keyword_text: trimmedText,
        adgroupIds: keywordTextEditKeyword.adgroup_id ? [keywordTextEditKeyword.adgroup_id] : undefined,
      });

      if (response.errors && response.errors.length > 0) {
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

      // Verify the update was successful
      if (response.updated === 0) {
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: "Keyword update did not complete successfully. Please try again.",
        });
        return;
      }

      // Reload keywords table to reflect the update (keyword is already inserted in database by backend)
      // Reset to page 1 to ensure the new keyword is visible
      await loadKeywords(1);
      
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

  // Bid confirmation handler for keywords
  const handleBidConfirmation = (keyword: GoogleKeyword, oldBid: number, newBid: number) => {
    setBidConfirmationKeyword(keyword);
    setBidConfirmationOldValue(oldBid);
    setBidConfirmationNewValue(newBid);
    setShowBidConfirmationModal(true);
  };

  // Adgroup bid confirmation modal state
  const [showAdgroupBidConfirmationModal, setShowAdgroupBidConfirmationModal] = useState(false);
  const [adgroupBidConfirmationAdgroup, setAdgroupBidConfirmationAdgroup] = useState<any | null>(null);
  const [adgroupBidConfirmationOldValue, setAdgroupBidConfirmationOldValue] = useState<number>(0);
  const [adgroupBidConfirmationNewValue, setAdgroupBidConfirmationNewValue] = useState<number>(0);
  const [adgroupBidConfirmationLoading, setAdgroupBidConfirmationLoading] = useState(false);

  // Adgroup name edit modal state
  const [showAdgroupNameEditModal, setShowAdgroupNameEditModal] = useState(false);
  const [adgroupNameEditAdgroup, setAdgroupNameEditAdgroup] = useState<any | null>(null);
  const [adgroupNameEditValue, setAdgroupNameEditValue] = useState<string>("");
  const [adgroupNameEditLoading, setAdgroupNameEditLoading] = useState(false);

  // Adgroup bid confirmation handler
  const handleAdgroupBidConfirmation = (adgroup: any, oldBid: number, newBid: number) => {
    setAdgroupBidConfirmationAdgroup(adgroup);
    setAdgroupBidConfirmationOldValue(oldBid);
    setAdgroupBidConfirmationNewValue(newBid);
    setShowAdgroupBidConfirmationModal(true);
  };

  // Adgroup name edit handler - opens modal for editing
  const handleAdgroupNameEdit = (adgroup: any) => {
    setAdgroupNameEditAdgroup(adgroup);
    setAdgroupNameEditValue(adgroup.adgroup_name || adgroup.name || "");
    setShowAdgroupNameEditModal(true);
  };

  const handleAdgroupBidConfirmationSave = async () => {
    if (!adgroupBidConfirmationAdgroup || !accountId) return;
    
    setAdgroupBidConfirmationLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.bulkUpdateGoogleAdGroups(accountIdNum, {
        adgroupIds: [adgroupBidConfirmationAdgroup.adgroup_id],
        action: "bid",
        bid: adgroupBidConfirmationNewValue,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0];
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: `Failed to update bid: ${errorMessage}`,
        });
        setShowAdgroupBidConfirmationModal(false);
        return;
      }

      // Update local state
      setAdgroups((prevAdgroups) =>
        prevAdgroups.map((ag) =>
          ag.id === adgroupBidConfirmationAdgroup.id
            ? { ...ag, cpc_bid_dollars: adgroupBidConfirmationNewValue }
            : ag
        )
      );

      setShowAdgroupBidConfirmationModal(false);
      setAdgroupBidConfirmationAdgroup(null);
      setAdgroupBidConfirmationOldValue(0);
      setAdgroupBidConfirmationNewValue(0);
    } catch (error: any) {
      console.error("Error updating adgroup bid:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update bid: ${errorMessage}`,
      });
    } finally {
      setAdgroupBidConfirmationLoading(false);
    }
  };

  const handleAdgroupNameEditSave = async () => {
    if (!adgroupNameEditAdgroup || !accountId) return;
    
    const trimmedName = adgroupNameEditValue.trim();
    if (!trimmedName) {
      alert("Ad group name cannot be empty. Please enter a name.");
      return;
    }
    
    const oldName = (adgroupNameEditAdgroup.adgroup_name || adgroupNameEditAdgroup.name || "").trim();
    if (trimmedName === oldName) {
      setShowAdgroupNameEditModal(false);
      setAdgroupNameEditAdgroup(null);
      setAdgroupNameEditValue("");
      return;
    }
    
    setAdgroupNameEditLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.bulkUpdateGoogleAdGroups(accountIdNum, {
        adgroupIds: [adgroupNameEditAdgroup.adgroup_id],
        action: "name",
        name: trimmedName,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0];
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: `Failed to update adgroup name: ${errorMessage}`,
        });
        setShowAdgroupNameEditModal(false);
        return;
      }

      // Update local state
      setAdgroups((prevAdgroups) =>
        prevAdgroups.map((ag) =>
          ag.id === adgroupNameEditAdgroup.id
            ? { ...ag, adgroup_name: trimmedName, name: trimmedName }
            : ag
        )
      );

      setShowAdgroupNameEditModal(false);
      setAdgroupNameEditAdgroup(null);
      setAdgroupNameEditValue("");
    } catch (error: any) {
      console.error("Error updating adgroup name:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update adgroup name: ${errorMessage}`,
      });
    } finally {
      setAdgroupNameEditLoading(false);
    }
  };

  const handleBidConfirmationSave = async () => {
    if (!bidConfirmationKeyword || !accountId) return;
    
    setBidConfirmationLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.bulkUpdateGoogleKeywords(accountIdNum, {
        keywordIds: [bidConfirmationKeyword.keyword_id],
        action: "bid",
        bid: bidConfirmationNewValue,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0];
        setErrorModal({
          isOpen: true,
          title: "Update Failed",
          message: `Failed to update bid: ${errorMessage}`,
        });
        setShowBidConfirmationModal(false);
        return;
      }

      // Update local state
      setKeywords((prevKeywords) =>
        prevKeywords.map((k) =>
          k.id === bidConfirmationKeyword.id
            ? { ...k, cpc_bid_dollars: bidConfirmationNewValue }
            : k
        )
      );

      setShowBidConfirmationModal(false);
      setBidConfirmationKeyword(null);
      setBidConfirmationOldValue(0);
      setBidConfirmationNewValue(0);
    } catch (error: any) {
      console.error("Error updating bid:", error);
      const errorMessage = error?.message || error?.toString() || "An unexpected error occurred";
      setErrorModal({
        isOpen: true,
        title: "Update Failed",
        message: `Failed to update bid: ${errorMessage}`,
      });
    } finally {
      setBidConfirmationLoading(false);
    }
  };

  const handleSyncAdGroups = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAdGroups(true);
      setSyncMessage({ type: null, message: null });
      const result = await campaignsService.syncGoogleAdGroups(accountIdNum);
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ad groups:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ad groups from Google Ads";
      setSyncMessage({ type: "adgroups", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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
      const result = await campaignsService.syncGoogleAds(accountIdNum);
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ads:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ads from Google Ads";
      setSyncMessage({ type: "ads", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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
      const result = await campaignsService.syncGoogleKeywords(accountIdNum);
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keywords:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keywords from Google Ads";
      setSyncMessage({ type: "keywords", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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
      const result = await campaignsService.syncGoogleAdGroupAnalytics(
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync adgroup analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync adgroup analytics from Google Ads";
      setSyncMessage({ type: "adgroups", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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
      const result = await campaignsService.syncGoogleAdAnalytics(
        accountIdNum,
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

      setSyncMessage({ type: "ads", message });

      if ((result.rows_inserted || 0) > 0 || (result.rows_updated || 0) > 0) {
        setAdsCurrentPage(1);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadAds();
      }

      if ((result.rows_inserted || 0) > 0 && !result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ad analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync ad analytics from Google Ads";
      setSyncMessage({ type: "ads", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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
      const result = await campaignsService.syncGoogleKeywordAnalytics(
        accountIdNum,
        startDate ? startDate.toISOString() : undefined,
        endDate ? endDate.toISOString() : undefined
      );

      let message =
        result.message ||
        `Successfully synced keyword analytics: ${result.rows_inserted || 0
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keyword analytics:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync keyword analytics from Google Ads";
      setSyncMessage({ type: "keywords", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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
      const result = await campaignsService.syncGoogleAssetGroups(accountIdNum);
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
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 5000);
      } else if (result.errors) {
        safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync asset groups:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync asset groups from Google Ads";
      setSyncMessage({ type: "assetgroups", message: errorMessage });
      safeSetTimeout(() => setSyncMessage({ type: null, message: null }), 8000);
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

      const response = await campaignsService.createGoogleSearchEntities(
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
      if (adgroupCount > 0) createdEntities.push(`${adgroupCount} ad group${adgroupCount !== 1 ? 's' : ''}`);
      if (adCount > 0) createdEntities.push(`${adCount} ad${adCount !== 1 ? 's' : ''}`);
      if (keywordCount > 0) createdEntities.push(`${keywordCount} keyword${keywordCount !== 1 ? 's' : ''}`);

      const totalCreated = adgroupCount + adCount + keywordCount;

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        const summaryParts = [];
        if (totalCreated > 0) {
          summaryParts.push(`Successfully created: ${totalCreated} ${totalCreated !== 1 ? 'entities' : 'entity'} (${createdEntities.join(', ')})`);
        }
        if (errorCount > 0) {
          summaryParts.push(`Failed: ${errorCount} ${errorCount !== 1 ? 'entities' : 'entity'}`);
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
        const successMessage = `Successfully created ${totalCreated} ${totalCreated !== 1 ? 'entities' : 'entity'}:\n${createdEntities.map(e => `• ${e}`).join('\n')}`;
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

      const response = await campaignsService.createGoogleSearchEntities(
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
      if (adgroupCount > 0) createdEntities.push(`${adgroupCount} ad group${adgroupCount !== 1 ? 's' : ''}`);
      if (adCount > 0) createdEntities.push(`${adCount} ad${adCount !== 1 ? 's' : ''}`);
      if (keywordCount > 0) createdEntities.push(`${keywordCount} keyword${keywordCount !== 1 ? 's' : ''}`);

      const totalCreated = adgroupCount + adCount + keywordCount;

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        const summaryParts = [];
        if (totalCreated > 0) {
          summaryParts.push(`Successfully created: ${totalCreated} ${totalCreated !== 1 ? 'entities' : 'entity'} (${createdEntities.join(', ')})`);
        }
        if (errorCount > 0) {
          summaryParts.push(`Failed: ${errorCount} ${errorCount !== 1 ? 'entities' : 'entity'}`);
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
        const successMessage = `Successfully created ${totalCreated} ${totalCreated !== 1 ? 'entities' : 'entity'}:\n${createdEntities.map(e => `• ${e}`).join('\n')}`;
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

      const response = await campaignsService.createGoogleSearchEntities(
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
      if (adgroupCount > 0) createdEntities.push(`${adgroupCount} ad group${adgroupCount !== 1 ? 's' : ''}`);
      if (adCount > 0) createdEntities.push(`${adCount} ad${adCount !== 1 ? 's' : ''}`);
      if (keywordCount > 0) createdEntities.push(`${keywordCount} keyword${keywordCount !== 1 ? 's' : ''}`);

      const totalCreated = adgroupCount + adCount + keywordCount;

      // Check for errors in response
      if (response.errors && response.errors.length > 0) {
        const summaryParts = [];
        if (totalCreated > 0) {
          summaryParts.push(`Successfully created: ${totalCreated} ${totalCreated !== 1 ? 'entities' : 'entity'} (${createdEntities.join(', ')})`);
        }
        if (errorCount > 0) {
          summaryParts.push(`Failed: ${errorCount} ${errorCount !== 1 ? 'entities' : 'entity'}`);
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
        const successMessage = `Successfully created ${totalCreated} ${totalCreated !== 1 ? 'entities' : 'entity'}:\n${createdEntities.map(e => `• ${e}`).join('\n')}`;
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

      const response = await campaignsService.createGooglePmaxAssetGroup(
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

      const response = await campaignsService.createGoogleShoppingEntities(
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

      const response = await campaignsService.createGoogleShoppingEntities(
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
                    <div className="table-text leading-[1.26]">
                      {campaignDetail.campaign.name || "—"}
                    </div>
                  </div>

                  {/* Campaign ID */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Campaign ID
                    </label>
                    <div className="table-text leading-[1.26]">
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
                            { value: "REMOVED", label: "Removed" },
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
                        className="table-text leading-[1.26] cursor-pointer hover:underline"
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
                          className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-32"
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
                        className="table-text leading-[1.26] cursor-pointer hover:underline"
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
                    <div className="table-text leading-[1.26]">
                      {campaignDetail.campaign.advertising_channel_type || "—"}
                    </div>
                  </div>

                  {/* Account Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Account
                    </label>
                    <div className="table-text leading-[1.26]">
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
                          className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-40"
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
                        className="table-text leading-[1.26] cursor-pointer hover:underline"
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
                          className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-40"
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
                        className="table-text leading-[1.26] cursor-pointer hover:underline"
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
                    onClick={() => {
                      setActiveTab(tab);
                      // Update URL param when tab changes
                      const newSearchParams = new URLSearchParams(searchParams);
                      if (tab === "Overview") {
                        newSearchParams.delete("tab");
                      } else {
                        newSearchParams.set("tab", tab);
                      }
                      setSearchParams(newSearchParams, { replace: true });
                    }}
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
                <OverviewTab
                  chartData={chartData}
                  chartToggles={chartToggles}
                  onToggleChartMetric={toggleChartMetric}
                />
              )}

              {activeTab === "Asset Groups" && (
                <>
                  {/* Create Asset Group Panel - Only for PERFORMANCE_MAX campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type === "PERFORMANCE_MAX" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGooglePmaxAssetGroupSection
                          isOpen={isCreatePmaxAssetGroupPanelOpen}
                          onToggle={() => {
                            setIsCreatePmaxAssetGroupPanelOpen(!isCreatePmaxAssetGroupPanelOpen);
                            setIsAssetGroupsFilterPanelOpen(false);
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
                    </>
                  )}
                  <GoogleCampaignDetailAssetGroupsTab
                    assetGroups={assetGroups}
                    loading={assetGroupsLoading}
                    selectedAssetGroupIds={selectedAssetGroupIds}
                    onSelectAll={(checked) => {
                      if (checked) {
                        setSelectedAssetGroupIds(new Set(assetGroups.map((ag) => ag.id)));
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
                        setAssetGroupsSortOrder(assetGroupsSortOrder === "asc" ? "desc" : "asc");
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
                      setIsAssetGroupsFilterPanelOpen(!isAssetGroupsFilterPanelOpen)
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
                      console.log("Sync asset groups analytics not yet implemented");
                    }}
                    syncMessage={
                      syncMessage.type === "assetgroups" ? syncMessage.message : null
                    }
                    formatPercentage={formatPercentage}
                    formatCurrency2Decimals={formatCurrency2Decimals}
                    getSortIcon={getSortIcon}
                  />
                </>
              )}

              {activeTab === "Ad Groups" && (
                <>
                  {/* Create Ad Group Panel - For SEARCH and SHOPPING campaigns */}
                  {(campaignDetail?.campaign.advertising_channel_type === "SEARCH" ||
                    campaignDetail?.campaign.advertising_channel_type === "SHOPPING") && (
                      <>
                        <div className="mb-4 flex justify-end">
                          <CreateGoogleAdGroupSection
                            isOpen={
                              campaignDetail?.campaign.advertising_channel_type === "SEARCH"
                                ? isCreateSearchEntitiesPanelOpen
                                : isCreateShoppingEntitiesPanelOpen
                            }
                            onToggle={() => {
                              if (campaignDetail?.campaign.advertising_channel_type === "SEARCH") {
                                setIsCreateSearchEntitiesPanelOpen(!isCreateSearchEntitiesPanelOpen);
                              } else {
                                setIsCreateShoppingEntitiesPanelOpen(!isCreateShoppingEntitiesPanelOpen);
                              }
                              setIsAdGroupsFilterPanelOpen(false);
                            }}
                          />
                        </div>
                        {campaignDetail?.campaign.advertising_channel_type === "SEARCH" &&
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
                        {campaignDetail?.campaign.advertising_channel_type === "SHOPPING" &&
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
                      syncMessage.type === "adgroups" ? syncMessage.message : null
                    }
                    onRefresh={loadAdGroups}
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
                        await campaignsService.bulkUpdateGoogleAdGroups(
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
                            ag.id === adgroupId
                              ? { ...ag, status: status }
                              : ag
                          )
                        );
                      } catch (error: any) {
                        console.error("Failed to update adgroup status:", error);
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
                        await campaignsService.bulkUpdateGoogleAdGroups(
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
                    onUpdateAdGroupName={async (
                      adgroupId: number,
                      name: string
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
                        await campaignsService.bulkUpdateGoogleAdGroups(
                          accountIdNum,
                          {
                            adgroupIds: [adgroup.adgroup_id],
                            action: "name",
                            name: name,
                          }
                        );

                        // Update local state
                        setAdgroups((prevAdgroups) =>
                          prevAdgroups.map((ag) =>
                            ag.id === adgroupId
                              ? { ...ag, adgroup_name: name, name: name }
                              : ag
                          )
                        );
                      } catch (error: any) {
                        console.error("Failed to update adgroup name:", error);
                        alert(
                          error.response?.data?.error ||
                          "Failed to update adgroup name"
                        );
                        throw error;
                      }
                    }}
                    onStartBidConfirmation={handleAdgroupBidConfirmation}
                    onStartNameEdit={handleAdgroupNameEdit}
                  />
                </>
              )}

              {activeTab === "Ads" && campaignDetail?.campaign.advertising_channel_type !== "PERFORMANCE_MAX" && (
                <>
                  {/* Create Ad Panel - For SEARCH campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type === "SEARCH" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGoogleAdSection
                          isOpen={isCreateSearchEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateSearchEntitiesPanelOpen(!isCreateSearchEntitiesPanelOpen);
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
                  {campaignDetail?.campaign.advertising_channel_type === "SHOPPING" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGoogleShoppingEntitiesSection
                          isOpen={isCreateShoppingEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateShoppingEntitiesPanelOpen(!isCreateShoppingEntitiesPanelOpen);
                            setIsAdsFilterPanelOpen(false);
                          }}
                        />
                      </div>
                      {isCreateShoppingEntitiesPanelOpen && campaignId && accountId && (
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
                    onRefresh={loadAds}
                    getSortIcon={getSortIcon}
                    onUpdateAdStatus={async (adId: number, status: string) => {
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
                        await campaignsService.bulkUpdateGoogleAds(accountIdNum, {
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
                  {campaignDetail?.campaign.advertising_channel_type === "SEARCH" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGoogleKeywordSection
                          isOpen={isCreateSearchEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateSearchEntitiesPanelOpen(!isCreateSearchEntitiesPanelOpen);
                            setIsKeywordsFilterPanelOpen(false);
                          }}
                        />
                      </div>
                      {isCreateSearchEntitiesPanelOpen && campaignId && accountId && (
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
                    filters={keywordsFilters}
                    onApplyFilters={(newFilters) => {
                      setKeywordsFilters(newFilters);
                      setKeywordsCurrentPage(1);
                    }}
                    syncing={syncingKeywords}
                    onSync={handleSyncKeywords}
                    syncingAnalytics={syncingKeywordsAnalytics}
                    onSyncAnalytics={handleSyncKeywordsAnalytics}
                    syncMessage={
                      syncMessage.type === "keywords" ? syncMessage.message : null
                    }
                    onRefresh={loadKeywords}
                    getSortIcon={getSortIcon}
                    onUpdateKeywordStatus={async (
                      keywordId: number,
                      status: string
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the keyword to get keyword_id
                        const keyword = keywords.find((k) => k.id === keywordId);
                        if (!keyword || !keyword.keyword_id) {
                          alert("Keyword not found");
                          return;
                        }

                        // Call API
                        await campaignsService.bulkUpdateGoogleKeywords(
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
                        console.error("Failed to update keyword status:", error);
                        alert(
                          error.response?.data?.error ||
                          "Failed to update keyword status"
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
                        const keyword = keywords.find((k) => k.id === keywordId);
                        if (!keyword || !keyword.keyword_id) {
                          alert("Keyword not found");
                          return;
                        }

                        // Call API
                        await campaignsService.bulkUpdateGoogleKeywords(
                          accountIdNum,
                          {
                            keywordIds: [keyword.keyword_id],
                            action: "match_type",
                            match_type: matchType as 'EXACT' | 'PHRASE' | 'BROAD',
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
                        console.error("Failed to update keyword match type:", error);
                        alert(
                          error.response?.data?.error ||
                          "Failed to update keyword match type"
                        );
                      }
                    }}
                    onStartKeywordTextEdit={(keyword: GoogleKeyword) => {
                      setKeywordTextEditKeyword(keyword);
                      setKeywordTextEditValue(keyword.keyword_text || "");
                      setShowKeywordTextEditModal(true);
                    }}
                    onUpdateKeywordBid={async (
                      keywordId: number,
                      bid: number
                    ) => {
                      try {
                        const accountIdNum = parseInt(accountId!, 10);
                        if (isNaN(accountIdNum)) return;

                        // Find the keyword to get keyword_id
                        const keyword = keywords.find((k) => k.id === keywordId);
                        if (!keyword || !keyword.keyword_id) {
                          alert("Keyword not found");
                          return;
                        }

                        // Call API
                        await campaignsService.bulkUpdateGoogleKeywords(
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
                        throw error;
                      }
                    }}
                    onStartBidConfirmation={handleBidConfirmation}
                    onStartFinalUrlEdit={(keyword: GoogleKeyword) => {
                      setFinalUrlKeyword(keyword);
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
                    }}
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
                        setIsCreateNegativeKeywordPanelOpen(!isCreateNegativeKeywordPanelOpen);
                        setIsNegativeKeywordsFilterPanelOpen(false);
                      }}
                    />
                  </div>
                  {isCreateNegativeKeywordPanelOpen && campaignId && accountId && (
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
                      campaignType={campaignDetail?.campaign.advertising_channel_type}
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
                      setIsNegativeKeywordsFilterPanelOpen(!isNegativeKeywordsFilterPanelOpen)
                    }
                    filters={negativeKeywordsFilters}
                    onApplyFilters={(newFilters) => {
                      setNegativeKeywordsFilters(newFilters);
                      setNegativeKeywordsCurrentPage(1);
                    }}
                    syncing={syncingNegativeKeywords}
                    onSync={handleSyncNegativeKeywords}
                    syncMessage={
                      syncMessage.type === "negative_keywords" ? syncMessage.message : null
                    }
                    onRefresh={loadNegativeKeywords}
                    getSortIcon={getSortIcon}
                    onUpdateNegativeKeywordStatus={handleUpdateNegativeKeywordStatus}
                    onUpdateNegativeKeywordMatchType={handleUpdateNegativeKeywordMatchType}
                    onUpdateNegativeKeywordText={handleUpdateNegativeKeywordText}
                  />
                </>
              )}

              {activeTab === "Product Groups" && (
                <>
                  {/* Create Shopping Entities Panel - Only for SHOPPING campaigns */}
                  {campaignDetail?.campaign.advertising_channel_type === "SHOPPING" && (
                    <>
                      <div className="mb-4 flex justify-end">
                        <CreateGoogleShoppingEntitiesSection
                          isOpen={isCreateShoppingEntitiesPanelOpen}
                          onToggle={() => {
                            setIsCreateShoppingEntitiesPanelOpen(!isCreateShoppingEntitiesPanelOpen);
                            // Close filter panel if exists
                          }}
                        />
                      </div>
                      {isCreateShoppingEntitiesPanelOpen && campaignId && accountId && (
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
                        setSelectedProductGroupIds(new Set(productGroups.map((pg) => pg.id)));
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
                        setProductGroupsSortOrder(productGroupsSortOrder === "asc" ? "desc" : "asc");
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
                      setIsProductGroupsFilterPanelOpen(!isProductGroupsFilterPanelOpen)
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
                        const adId = (productGroup as any).ad_id || (productGroup as any).adId;
                        if (!adId) {
                          alert("Product group ad ID not found. Please sync product groups first.");
                          return;
                        }

                        // Get campaign_id and adgroup_id to filter the update to only this specific instance
                        const campaignId = productGroup.campaign_id || (productGroup as any).campaignId;
                        const adGroupId = productGroup.adgroup_id || (productGroup as any).adGroupId;

                        // Call API - product groups use the same bulkUpdateGoogleAds endpoint
                        // Include campaignId and adGroupId to only update this specific instance
                        await campaignsService.bulkUpdateGoogleAds(accountIdNum, {
                          adIds: [adId],
                          action: "status",
                          status: status as "ENABLED" | "PAUSED" | "REMOVED",
                          campaignId: campaignId ? String(campaignId) : undefined,
                          adGroupId: adGroupId ? String(adGroupId) : undefined,
                        });

                        // Update local state
                        setProductGroups((prevProductGroups) =>
                          prevProductGroups.map((pg) =>
                            pg.id === productGroupId ? { ...pg, status } : pg
                          )
                        );
                      } catch (error: any) {
                        console.error("Failed to update product group status:", error);
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

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
        title={errorModal.title || (errorModal.isSuccess ? "Success" : "Error")}
        message={errorModal.message}
        isSuccess={errorModal.isSuccess}
        errorDetails={errorModal.errorDetails}
      />

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
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleKeywordTextEditSave}
                disabled={keywordTextEditLoading || !keywordTextEditValue.trim()}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {keywordTextEditLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Confirmation Modal */}
      {showBidConfirmationModal && bidConfirmationKeyword && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bidConfirmationLoading) {
              setShowBidConfirmationModal(false);
              setBidConfirmationKeyword(null);
              setBidConfirmationOldValue(0);
              setBidConfirmationNewValue(0);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
              Confirm Max. CPC Change
            </h3>
            <div className="mb-4">
              <p className="text-[12.8px] text-[#556179] mb-2">
                Keyword:{" "}
                <span className="font-semibold text-[#072929]">
                  {bidConfirmationKeyword.keyword_text || "Unnamed Keyword"}
                </span>
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.8px] text-[#556179]">Max. CPC:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.8px] text-[#556179]">
                      ${bidConfirmationOldValue.toFixed(2)}
                    </span>
                    <span className="text-[12.8px] text-[#556179]">→</span>
                    <span className="text-[12.8px] font-semibold text-[#072929]">
                      ${bidConfirmationNewValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!bidConfirmationLoading) {
                    setShowBidConfirmationModal(false);
                    setBidConfirmationKeyword(null);
                    setBidConfirmationOldValue(0);
                    setBidConfirmationNewValue(0);
                  }
                }}
                disabled={bidConfirmationLoading}
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBidConfirmationSave}
                disabled={bidConfirmationLoading}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bidConfirmationLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adgroup Bid Confirmation Modal */}
      {showAdgroupBidConfirmationModal && adgroupBidConfirmationAdgroup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !adgroupBidConfirmationLoading) {
              setShowAdgroupBidConfirmationModal(false);
              setAdgroupBidConfirmationAdgroup(null);
              setAdgroupBidConfirmationOldValue(0);
              setAdgroupBidConfirmationNewValue(0);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
              Confirm Default max. CPC Change
            </h3>
            <div className="mb-4">
              <p className="text-[12.8px] text-[#556179] mb-2">
                Ad Group:{" "}
                <span className="font-semibold text-[#072929]">
                  {adgroupBidConfirmationAdgroup.adgroup_name || adgroupBidConfirmationAdgroup.name || "Unnamed Ad Group"}
                </span>
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.8px] text-[#556179]">Default max. CPC:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.8px] text-[#556179]">
                      ${adgroupBidConfirmationOldValue.toFixed(2)}
                    </span>
                    <span className="text-[12.8px] text-[#556179]">→</span>
                    <span className="text-[12.8px] font-semibold text-[#072929]">
                      ${adgroupBidConfirmationNewValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!adgroupBidConfirmationLoading) {
                    setShowAdgroupBidConfirmationModal(false);
                    setAdgroupBidConfirmationAdgroup(null);
                    setAdgroupBidConfirmationOldValue(0);
                    setAdgroupBidConfirmationNewValue(0);
                  }
                }}
                disabled={adgroupBidConfirmationLoading}
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdgroupBidConfirmationSave}
                disabled={adgroupBidConfirmationLoading}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adgroupBidConfirmationLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adgroup Name Edit Modal */}
      {showAdgroupNameEditModal && adgroupNameEditAdgroup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !adgroupNameEditLoading) {
              setShowAdgroupNameEditModal(false);
              setAdgroupNameEditAdgroup(null);
              setAdgroupNameEditValue("");
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#072929] mb-2">
              Edit Ad Group Name
            </h3>
            <div className="mb-6">
              <input
                type="text"
                value={adgroupNameEditValue}
                onChange={(e) => setAdgroupNameEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !adgroupNameEditLoading) {
                    handleAdgroupNameEditSave();
                  } else if (e.key === "Escape" && !adgroupNameEditLoading) {
                    setShowAdgroupNameEditModal(false);
                    setAdgroupNameEditAdgroup(null);
                    setAdgroupNameEditValue("");
                  }
                }}
                disabled={adgroupNameEditLoading}
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
                  if (!adgroupNameEditLoading) {
                    setShowAdgroupNameEditModal(false);
                    setAdgroupNameEditAdgroup(null);
                    setAdgroupNameEditValue("");
                  }
                }}
                disabled={adgroupNameEditLoading}
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-[#072929] rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdgroupNameEditSave}
                disabled={adgroupNameEditLoading || !adgroupNameEditValue.trim()}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adgroupNameEditLoading ? (
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
                className="px-4 py-2 text-[#136D6D] bg-transparent rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {finalUrlEditLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
