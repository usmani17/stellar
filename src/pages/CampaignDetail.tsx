import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { PerformanceChart } from "../components/charts/PerformanceChart";
import { KPICard } from "../components/ui/KPICard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Checkbox } from "../components/ui/Checkbox";
import { useDateRange } from "../contexts/DateRangeContext";
import { useSidebar } from "../contexts/SidebarContext";
import {
  campaignsService,
  type CampaignDetail as CampaignDetailData,
  type AdGroup,
  type Keyword,
  type ProductAd,
  type Target,
} from "../services/campaigns";
import { AdGroupsTable } from "../components/campaigns/AdGroupsTable";
import { KeywordsTable } from "../components/campaigns/KeywordsTable";
import { ProductAdsTable } from "../components/campaigns/ProductAdsTable";
import { TargetsTable } from "../components/campaigns/TargetsTable";
import {
  FilterPanel,
  type FilterValues,
} from "../components/filters/FilterPanel";
import { CreateAdGroupSection } from "../components/adgroups/CreateAdGroupSection";
import {
  CreateAdGroupPanel,
  type AdGroupInput,
} from "../components/adgroups/CreateAdGroupPanel";
import {
  CreateKeywordPanel,
  type KeywordInput,
} from "../components/keywords/CreateKeywordPanel";
import {
  CreateTargetPanel,
  type TargetInput,
} from "../components/targets/CreateTargetPanel";
import {
  CreateProductAdPanel,
  type ProductAdInput,
} from "../components/productads/CreateProductAdPanel";
import { ErrorModal } from "../components/ui/ErrorModal";
import { Tooltip } from "../components/ui/Tooltip";
import { Button } from "../components/ui";
import { Dropdown } from "../components/ui/Dropdown";

export const CampaignDetail: React.FC = () => {
  const { accountId, campaignTypeAndId } = useParams<{
    accountId: string;
    campaignTypeAndId: string;
  }>();
  const { startDate, endDate } = useDateRange();
  const { sidebarWidth } = useSidebar();

  // Parse campaign type and ID from URL format: sp_123456, sb_123456, or sd_123456
  const parseCampaignTypeAndId = (typeAndId: string | undefined) => {
    if (!typeAndId) return { type: null, campaignId: null };

    const parts = typeAndId.split("_");
    if (parts.length >= 2) {
      const type = parts[0].toUpperCase(); // sp -> SP, sb -> SB, sd -> SD
      const campaignId = parts.slice(1).join("_"); // In case campaignId contains underscores
      return { type, campaignId };
    }
    // Fallback: treat entire string as campaignId (backward compatibility)
    return { type: null, campaignId: typeAndId };
  };

  const { type: campaignType, campaignId } =
    parseCampaignTypeAndId(campaignTypeAndId);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] =
    useState<CampaignDetailData | null>(null);

  // Inline edit state
  const [editingField, setEditingField] = useState<"budget" | "status" | null>(
    null
  );
  const [editedValue, setEditedValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditField, setInlineEditField] = useState<
    "budget" | "status" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");
  const [adgroups, setAdgroups] = useState<AdGroup[]>([]);
  const [allAdgroups, setAllAdgroups] = useState<AdGroup[]>([]);
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
  const [keywords, setKeywords] = useState<Keyword[]>([]);
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
  const [isAdGroupsFilterPanelOpen, setIsAdGroupsFilterPanelOpen] =
    useState(false);
  const [adgroupsFilters, setAdgroupsFilters] = useState<FilterValues>([]);
  const [isCreateAdGroupPanelOpen, setIsCreateAdGroupPanelOpen] =
    useState(false);
  const [isCreateKeywordPanelOpen, setIsCreateKeywordPanelOpen] =
    useState(false);
  const [isCreateTargetPanelOpen, setIsCreateTargetPanelOpen] = useState(false);
  const [isCreateProductAdPanelOpen, setIsCreateProductAdPanelOpen] =
    useState(false);

  // Bulk edit state for Ad Groups
  const [showAdGroupsBulkActions, setShowAdGroupsBulkActions] = useState(false);
  const [showAdGroupsBidPanel, setShowAdGroupsBidPanel] = useState(false);
  const [pendingAdGroupsStatusAction, setPendingAdGroupsStatusAction] =
    useState<"enable" | "pause" | "archive" | null>(null);
  const [showAdGroupsConfirmationModal, setShowAdGroupsConfirmationModal] =
    useState(false);
  const [adGroupsBulkLoading, setAdGroupsBulkLoading] = useState(false);
  const [adGroupsBidAction, setAdGroupsBidAction] = useState<
    "increase" | "decrease" | "set"
  >("increase");
  const [adGroupsBidUnit, setAdGroupsBidUnit] = useState<"percent" | "amount">(
    "percent"
  );
  const [adGroupsBidValue, setAdGroupsBidValue] = useState<string>("");
  const [adGroupsBidUpperLimit, setAdGroupsBidUpperLimit] =
    useState<string>("");
  const [adGroupsBidLowerLimit, setAdGroupsBidLowerLimit] =
    useState<string>("");
  const adGroupsBulkActionsRef = useRef<HTMLDivElement>(null);
  const [isKeywordsFilterPanelOpen, setIsKeywordsFilterPanelOpen] =
    useState(false);
  const [keywordsFilters, setKeywordsFilters] = useState<FilterValues>([]);
  const [productads, setProductads] = useState<ProductAd[]>([]);
  const [productadsLoading, setProductadsLoading] = useState(false);
  const [createProductAdLoading, setCreateProductAdLoading] = useState(false);
  const [selectedProductAdIds, setSelectedProductAdIds] = useState<Set<number>>(
    new Set()
  );
  const [productadsCurrentPage, setProductadsCurrentPage] = useState(1);
  const [productadsTotalPages, setProductadsTotalPages] = useState(0);
  const [productadsSortBy, setProductadsSortBy] = useState<string>("id");
  const [productadsSortOrder, setProductadsSortOrder] = useState<
    "asc" | "desc"
  >("asc");
  const [isProductAdsFilterPanelOpen, setIsProductAdsFilterPanelOpen] =
    useState(false);
  const [productadsFilters, setProductadsFilters] = useState<FilterValues>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<number>>(
    new Set()
  );
  const [targetsCurrentPage, setTargetsCurrentPage] = useState(1);
  const [targetsTotalPages, setTargetsTotalPages] = useState(0);
  const [targetsSortBy, setTargetsSortBy] = useState<string>("id");
  const [targetsSortOrder, setTargetsSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  // Track if AUTO campaign has keywords or targets
  const [autoCampaignHasKeywords, setAutoCampaignHasKeywords] = useState(false);
  const [autoCampaignHasTargets, setAutoCampaignHasTargets] = useState(false);
  const [isTargetsFilterPanelOpen, setIsTargetsFilterPanelOpen] =
    useState(false);
  const [targetsFilters, setTargetsFilters] = useState<FilterValues>([]);
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    impressions: false,
    clicks: false,
    acos: false,
    roas: false,
    orders: false,
  });
  // Error Modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    isSuccess?: boolean;
    details?: any;
  }>({ isOpen: false, message: "" });
  const [createAdGroupLoading, setCreateAdGroupLoading] = useState(false);
  const [createAdGroupError, setCreateAdGroupError] = useState<string | null>(
    null
  );
  const [createAdGroupFieldErrors, setCreateAdGroupFieldErrors] = useState<
    Record<string, string>
  >({});
  const [createdAdGroups, setCreatedAdGroups] = useState<any[]>([]);
  const [failedAdGroupCount, setFailedAdGroupCount] = useState(0);
  const [failedAdGroups, setFailedAdGroups] = useState<any[]>([]);

  // Ad Group inline edit state
  const [editingAdGroupField, setEditingAdGroupField] = useState<{
    id: number;
    field: "status" | "default_bid";
  } | null>(null);
  const [editedAdGroupValue, setEditedAdGroupValue] = useState<string>("");
  const [adGroupEditLoading, setAdGroupEditLoading] = useState<Set<number>>(
    new Set()
  );
  const [pendingAdGroupChange, setPendingAdGroupChange] = useState<{
    id: number;
    field: "status" | "default_bid";
    newValue: string;
    oldValue: string;
  } | null>(null);

  // Filter tabs based on campaign type - SD campaigns don't have keywords
  const allTabs = [
    "Overview",
    "Ad Groups",
    "Keywords",
    "Targets",
    "Product Ads",
    "Logs",
  ];

  // Check if campaign is Auto (for SP campaigns only)
  // SB and SD campaigns don't have targetingType column
  const isAutoCampaign = useMemo(() => {
    if (campaignType !== "SP" || !campaignDetail) return false;
    // Check targetingType field - only exists for SP campaigns
    const campaign = campaignDetail.campaign;
    const targetingType = campaign?.targetingType;

    return targetingType === "AUTO";
  }, [campaignType, campaignDetail]);

  // Check if AUTO campaign has keywords or targets
  // AUTO campaigns can have either Keywords OR Targets, but not both
  const hasKeywords = useMemo(() => {
    if (!isAutoCampaign) return false;
    // Check both loaded keywords and the tracked state
    return keywords.length > 0 || autoCampaignHasKeywords;
  }, [isAutoCampaign, keywords, autoCampaignHasKeywords]);

  const hasTargets = useMemo(() => {
    if (!isAutoCampaign) return false;
    // Check both loaded targets and the tracked state
    return targets.length > 0 || autoCampaignHasTargets;
  }, [isAutoCampaign, targets, autoCampaignHasTargets]);

  const tabs = useMemo(() => {
    if (campaignType === "SD") {
      return allTabs.filter((tab) => tab !== "Keywords");
    }
    // For AUTO campaigns, hide Keywords tab completely (as per user requirement)
    if (campaignType === "SP" && isAutoCampaign) {
      return allTabs.filter((tab) => tab !== "Keywords");
    }
    return allTabs;
  }, [campaignType, isAutoCampaign]);

  // Switch away from Keywords tab if campaign type is SD
  useEffect(() => {
    if (campaignType === "SD" && activeTab === "Keywords") {
      setActiveTab("Overview");
    }
  }, [campaignType, activeTab]);

  // Switch away from disabled tabs for AUTO campaigns
  useEffect(() => {
    if (isAutoCampaign) {
      // If Keywords tab is active but has targets, switch to Overview
      if (activeTab === "Keywords" && hasTargets) {
        setActiveTab("Overview");
      }
      // If Targets tab is active but has keywords, switch to Overview
      if (activeTab === "Targets" && hasKeywords) {
        setActiveTab("Overview");
      }
    }
  }, [isAutoCampaign, hasKeywords, hasTargets, activeTab]);

  useEffect(() => {
    if (accountId && campaignId) {
      loadCampaignDetail();
    }
  }, [accountId, campaignId, startDate, endDate]);

  // For AUTO campaigns, check if keywords or targets exist to determine tab availability
  useEffect(() => {
    if (isAutoCampaign && accountId && campaignId) {
      // Load keywords and targets to check if they exist
      const checkKeywordsAndTargets = async () => {
        try {
          const accountIdNum = parseInt(accountId!, 10);
          if (isNaN(accountIdNum)) return;

          // Load first page of keywords to check if any exist
          const keywordsData = await campaignsService.getKeywords(
            accountIdNum,
            campaignId,
            startDate.toISOString().split("T")[0],
            endDate.toISOString().split("T")[0],
            {
              page: 1,
              page_size: 1,
              type: campaignType || undefined,
            }
          );

          // Load first page of targets to check if any exist
          const targetsData = await campaignsService.getTargets(
            accountIdNum,
            campaignId,
            startDate.toISOString().split("T")[0],
            endDate.toISOString().split("T")[0],
            {
              page: 1,
              page_size: 1,
              type: campaignType || undefined,
            }
          );

          // Update state to reflect existence
          setAutoCampaignHasKeywords(
            keywordsData.keywords && keywordsData.keywords.length > 0
          );
          setAutoCampaignHasTargets(
            targetsData.targets && targetsData.targets.length > 0
          );
        } catch (error) {
          console.error(
            "Failed to check keywords/targets for AUTO campaign:",
            error
          );
        }
      };

      checkKeywordsAndTargets();
    } else {
      // Reset when not AUTO campaign
      setAutoCampaignHasKeywords(false);
      setAutoCampaignHasTargets(false);
    }
  }, [isAutoCampaign, accountId, campaignId, startDate, endDate, campaignType]);

  // Reset pagination when date range, tab, or filters change
  useEffect(() => {
    if (activeTab === "Ad Groups") {
      setAdgroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, adgroupsFilters]);

  useEffect(() => {
    if (activeTab === "Keywords") {
      setKeywordsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, keywordsFilters]);

  useEffect(() => {
    if (activeTab === "Product Ads") {
      setProductadsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, productadsFilters]);

  useEffect(() => {
    if (activeTab === "Targets") {
      setTargetsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, targetsFilters]);

  const buildKeywordsFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    // Add filters to params
    filterList.forEach((filter) => {
      if (filter.field === "name") {
        if (filter.operator === "contains") {
          params.name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.name = filter.value;
        }
      } else if (filter.field === "state") {
        params.state = filter.value;
      } else if (filter.field === "bid") {
        if (filter.operator === "lt") {
          params.bid__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.bid__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.bid = filter.value;
        } else if (filter.operator === "lte") {
          params.bid__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.bid__gte = filter.value;
        }
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      } else if (filter.field === "spends") {
        if (filter.operator === "lt") {
          params.spends__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.spends__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.spends = filter.value;
        } else if (filter.operator === "lte") {
          params.spends__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.spends__gte = filter.value;
        }
      } else if (filter.field === "sales") {
        if (filter.operator === "lt") {
          params.sales__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.sales__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.sales = filter.value;
        } else if (filter.operator === "lte") {
          params.sales__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.sales__gte = filter.value;
        }
      } else if (filter.field === "ctr") {
        if (filter.operator === "lt") {
          params.ctr__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.ctr__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.ctr = filter.value;
        } else if (filter.operator === "lte") {
          params.ctr__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.ctr__gte = filter.value;
        }
      }
    });

    return params;
  };

  const buildAdGroupsFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    // Add filters to params
    filterList.forEach((filter) => {
      if (filter.field === "name") {
        if (filter.operator === "contains") {
          params.name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.name = filter.value;
        }
      } else if (filter.field === "state") {
        params.state = filter.value;
      } else if (filter.field === "default_bid") {
        if (filter.operator === "lt") {
          params.default_bid__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.default_bid__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.default_bid = filter.value;
        } else if (filter.operator === "lte") {
          params.default_bid__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.default_bid__gte = filter.value;
        }
      } else if (filter.field === "spends") {
        if (filter.operator === "lt") {
          params.spends__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.spends__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.spends = filter.value;
        } else if (filter.operator === "lte") {
          params.spends__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.spends__gte = filter.value;
        }
      } else if (filter.field === "sales") {
        if (filter.operator === "lt") {
          params.sales__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.sales__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.sales = filter.value;
        } else if (filter.operator === "lte") {
          params.sales__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.sales__gte = filter.value;
        }
      } else if (filter.field === "ctr") {
        if (filter.operator === "lt") {
          params.ctr__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.ctr__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.ctr = filter.value;
        } else if (filter.operator === "lte") {
          params.ctr__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.ctr__gte = filter.value;
        }
      }
    });

    return params;
  };

  const buildProductAdsFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    // Add filters to params
    filterList.forEach((filter) => {
      if (filter.field === "adId") {
        if (filter.operator === "contains") {
          params.adId__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adId__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adId = filter.value;
        }
      } else if (filter.field === "asin") {
        if (filter.operator === "contains") {
          params.asin__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.asin__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.asin = filter.value;
        }
      } else if (filter.field === "sku") {
        if (filter.operator === "contains") {
          params.sku__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.sku__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.sku = filter.value;
        }
      } else if (filter.field === "state") {
        params.state = filter.value;
      } else if (filter.field === "adGroupId") {
        if (filter.operator === "contains") {
          params.adGroupId__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adGroupId__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adGroupId = filter.value;
        }
      }
    });

    return params;
  };

  const buildTargetsFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    // Add filters to params
    filterList.forEach((filter) => {
      if (filter.field === "name") {
        if (filter.operator === "contains") {
          params.name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.name = filter.value;
        }
      } else if (filter.field === "state") {
        // Convert frontend state values to backend values
        const stateMap: Record<string, string> = {
          Enabled: "enabled",
          Paused: "paused",
          Archived: "archived",
        };
        params.state = stateMap[filter.value as string] || filter.value;
      } else if (filter.field === "bid") {
        if (filter.operator === "lt") {
          params.bid__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.bid__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.bid = filter.value;
        } else if (filter.operator === "lte") {
          params.bid__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.bid__gte = filter.value;
        }
      } else if (filter.field === "adgroup_name") {
        if (filter.operator === "contains") {
          params.adgroup_name__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.adgroup_name__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.adgroup_name = filter.value;
        }
      } else if (filter.field === "spends") {
        if (filter.operator === "lt") {
          params.spends__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.spends__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.spends = filter.value;
        } else if (filter.operator === "lte") {
          params.spends__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.spends__gte = filter.value;
        }
      } else if (filter.field === "sales") {
        if (filter.operator === "lt") {
          params.sales__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.sales__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.sales = filter.value;
        } else if (filter.operator === "lte") {
          params.sales__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.sales__gte = filter.value;
        }
      } else if (filter.field === "ctr") {
        if (filter.operator === "lt") {
          params.ctr__lt = filter.value;
        } else if (filter.operator === "gt") {
          params.ctr__gt = filter.value;
        } else if (filter.operator === "eq") {
          params.ctr = filter.value;
        } else if (filter.operator === "lte") {
          params.ctr__lte = filter.value;
        } else if (filter.operator === "gte") {
          params.ctr__gte = filter.value;
        }
      }
    });

    return params;
  };

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Ad Groups") {
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
    if (accountId && campaignId && activeTab === "Product Ads") {
      loadProductAds();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    productadsCurrentPage,
    productadsSortBy,
    productadsSortOrder,
    productadsFilters,
  ]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Targets") {
      loadTargets();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    targetsCurrentPage,
    targetsSortBy,
    targetsSortOrder,
    targetsFilters,
  ]);

  const loadCampaignDetail = async () => {
    try {
      setLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      // Include campaign type if available
      const data = await campaignsService.getCampaignDetail(
        accountIdNum,
        campaignId!,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        campaignType || undefined
      );

      setCampaignDetail(data);
    } catch (error) {
      console.error("Failed to load campaign detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdGroups = async () => {
    try {
      setAdgroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdgroupsLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getAdGroups(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        {
          page: adgroupsCurrentPage,
          page_size: 10,
          sort_by: adgroupsSortBy,
          order: adgroupsSortOrder,
          type: campaignType || undefined, // Pass campaign type to API
          ...buildAdGroupsFilterParams(adgroupsFilters),
        }
      );

      setAdgroups(data.adgroups);
      setAdgroupsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load ad groups:", error);
      setAdgroups([]);
      setAdgroupsTotalPages(0);
    } finally {
      setAdgroupsLoading(false);
    }
  };

  const loadAllAdGroups = async () => {
    try {
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        return;
      }

      // Load all adgroups with a large page size
      const data = await campaignsService.getAdGroups(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        {
          page: 1,
          page_size: 1000, // Large page size to get all adgroups
          sort_by: "name",
          order: "asc",
          type: campaignType || undefined,
        }
      );

      setAllAdgroups(data.adgroups || []);
    } catch (error) {
      console.error("Failed to load all ad groups:", error);
      setAllAdgroups([]);
    }
  };

  const handleCreateAdGroups = async (adgroups: AdGroupInput[]) => {
    if (!accountId || !campaignId) return;

    setCreateAdGroupLoading(true);
    setCreateAdGroupError(null);
    setCreateAdGroupFieldErrors({});
    setCreatedAdGroups([]);
    setFailedAdGroupCount(0);
    setFailedAdGroups([]);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const payload = {
        adgroups: adgroups.map((ag) => ({
          name: ag.name,
          defaultBid: ag.defaultBid,
          state: ag.state,
        })),
      };

      const response = await campaignsService.createAdGroups(
        accountIdNum,
        campaignId,
        payload
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;
      const failedAdGroupsData = response.failed_adgroups || [];

      setCreatedAdGroups(response.adgroups || []);
      setFailedAdGroupCount(failed);
      setFailedAdGroups(failedAdGroupsData);

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateAdGroupPanelOpen(false);
        setCreateAdGroupError(null);
        setCreateAdGroupFieldErrors({});
        setCreatedAdGroups([]);
        setFailedAdGroupCount(0);
        setFailedAdGroups([]);

        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} ad group(s) created successfully!`,
          isSuccess: true,
        });

        // Reload ad groups to show the new ones
        await loadAdGroups();
      } else {
        // Partial success or all failed - show summary and keep panel open
        // Don't close panel - let user fix errors and resubmit
        const successMessage =
          created > 0
            ? `${created} ad group(s) created successfully. ${failed} ad group(s) failed.`
            : `All ${failed} ad group(s) failed to create.`;

        setCreateAdGroupError(successMessage);
        // Field errors will be set below if available

        // Show summary popup for partial success
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} ad group(s) created successfully. ${failed} ad group(s) failed.`,
            isSuccess: false,
          });
        }

        // Reload ad groups even on partial success to show newly created ones
        if (created > 0) {
          await loadAdGroups();
        }
      }

      // Extract field errors if available
      if (response.field_errors) {
        setCreateAdGroupFieldErrors(response.field_errors);
      }

      if (response.errors && response.errors.length > 0) {
        // Set general error if no field-specific errors
        if (
          !response.field_errors ||
          Object.keys(response.field_errors).length === 0
        ) {
          setCreateAdGroupError(
            response.errors[0] || "Failed to create some ad groups."
          );
        }
      }
    } catch (error: any) {
      console.error("Failed to create ad groups:", error);
      setCreateAdGroupLoading(false);

      // Extract error message and field errors
      let errorMessage = "Failed to create ad groups. Please try again.";
      let fieldErrors: Record<string, string> = {};

      if (error?.response?.data) {
        if (error.response.data.field_errors) {
          fieldErrors = error.response.data.field_errors;
          errorMessage = error.response.data.error || errorMessage;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setCreateAdGroupError(errorMessage);
      setCreateAdGroupFieldErrors(fieldErrors);
      setFailedAdGroupCount(adgroups.length); // All failed
      setFailedAdGroups([]); // No specific failed adgroups data in error case
      // Don't close panel on error - let user fix and resubmit
    } finally {
      setCreateAdGroupLoading(false);
    }
  };

  const [createKeywordLoading, setCreateKeywordLoading] = useState(false);
  const [createKeywordError, setCreateKeywordError] = useState<string | null>(
    null
  );
  const [createKeywordFieldErrors, setCreateKeywordFieldErrors] = useState<
    Record<string, string>
  >({});
  const [createdKeywords, setCreatedKeywords] = useState<any[]>([]);
  const [failedKeywordCount, setFailedKeywordCount] = useState(0);
  const [failedKeywords, setFailedKeywords] = useState<any[]>([]);

  const handleCreateKeywords = async (keywords: KeywordInput[]) => {
    if (!accountId || !campaignId) {
      console.error("Missing accountId or campaignId");
      setCreateKeywordError("Missing account or campaign information");
      setCreateKeywordLoading(false);
      return;
    }

    if (campaignType !== "SP") {
      console.error("Keywords can only be created for SP campaigns");
      setCreateKeywordError(
        "Keywords can only be created for Sponsored Products (SP) campaigns"
      );
      setCreateKeywordLoading(false);
      return;
    }

    if (!keywords || keywords.length === 0) {
      console.error("No keywords provided");
      setCreateKeywordError(
        "Please add at least one keyword before submitting"
      );
      setCreateKeywordLoading(false);
      return;
    }

    setCreateKeywordLoading(true);
    setCreateKeywordError(null);
    setCreateKeywordFieldErrors({});
    setCreatedKeywords([]);
    setFailedKeywordCount(0);
    setFailedKeywords([]);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.createKeywords(
        accountIdNum,
        campaignId,
        {
          keywords: keywords.map((kw) => ({
            adGroupId: kw.adGroupId,
            keywordText: kw.keywordText,
            matchType: kw.matchType,
            bid: kw.bid,
            state: kw.state,
          })),
        }
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;
      const failedKeywordsData = response.failed_keywords || [];

      setCreatedKeywords(response.keywords || []);
      setFailedKeywordCount(failed);
      setFailedKeywords(failedKeywordsData);
      setCreateKeywordLoading(false);

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateKeywordPanelOpen(false);
        setCreateKeywordError(null);
        setCreateKeywordFieldErrors({});
        setCreatedKeywords([]);
        setFailedKeywordCount(0);
        setFailedKeywords([]);

        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} keyword(s) created successfully!`,
          isSuccess: true,
        });

        // Reload keywords to show the new ones
        await loadKeywords();
      } else {
        // Partial success or all failed - show summary and keep panel open
        const successMessage =
          created > 0
            ? `${created} keyword(s) created successfully. ${failed} keyword(s) failed.`
            : `All ${failed} keyword(s) failed to create.`;

        setCreateKeywordError(successMessage);

        // Set field errors if available
        if (response.field_errors) {
          setCreateKeywordFieldErrors(response.field_errors);
        }

        // Show summary popup for partial success or all failed
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} keyword(s) created successfully. ${failed} keyword(s) failed.`,
            isSuccess: false,
          });
        } else if (failed > 0 && created === 0) {
          // All failed - show summary popup
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `All ${failed} keyword(s) failed to create.`,
            isSuccess: false,
          });
        }

        // Reload keywords even on partial success to show newly created ones
        if (created > 0) {
          await loadKeywords();
        }
      }
    } catch (error: any) {
      console.error("Failed to create keywords:", error);
      setCreateKeywordLoading(false);

      // Check if error response has structured data (e.g., from 400 with failed entities)
      if (error?.response?.data && error.response.data.failed_keywords) {
        // This is a structured error response with failed keywords
        const response = error.response.data;
        const created = response.created || 0;
        const failed = response.failed || 0;
        const failedKeywordsData = response.failed_keywords || [];

        setCreatedKeywords(response.keywords || []);
        setFailedKeywordCount(failed);
        setFailedKeywords(failedKeywordsData);

        // Set field errors if available
        if (response.field_errors) {
          setCreateKeywordFieldErrors(response.field_errors);
        }

        // Show summary popup for all failed
        if (failed > 0 && created === 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `All ${failed} keyword(s) failed to create.`,
            isSuccess: false,
          });
        }

        const errorMessage =
          created > 0
            ? `${created} keyword(s) created successfully. ${failed} keyword(s) failed.`
            : `All ${failed} keyword(s) failed to create.`;
        setCreateKeywordError(errorMessage);
      } else {
        // Generic error - extract error message and field errors
        let errorMessage = "Failed to create keywords. Please try again.";
        let fieldErrors: Record<string, string> = {};

        if (error?.response?.data) {
          if (error.response.data.field_errors) {
            fieldErrors = error.response.data.field_errors;
            errorMessage = error.response.data.error || errorMessage;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        setCreateKeywordError(errorMessage);
        setCreateKeywordFieldErrors(fieldErrors);
        setFailedKeywordCount(keywords.length); // All failed
        setFailedKeywords([]); // No specific failed keywords data in error case
      }
      // Don't close panel on error - let user fix and resubmit
    }
  };

  const [createTargetLoading, setCreateTargetLoading] = useState(false);
  const [createTargetError, setCreateTargetError] = useState<string | null>(
    null
  );
  const [createTargetFieldErrors, setCreateTargetFieldErrors] = useState<
    Record<string, string>
  >({});
  const [createdTargets, setCreatedTargets] = useState<any[]>([]);
  const [failedTargetCount, setFailedTargetCount] = useState(0);
  const [failedTargets, setFailedTargets] = useState<any[]>([]);

  const handleCreateTargets = async (targets: TargetInput[]) => {
    if (!accountId || !campaignId || campaignType !== "SP") return;

    setCreateTargetLoading(true);
    setCreateTargetError(null);
    setCreateTargetFieldErrors({});
    setCreatedTargets([]);
    setFailedTargetCount(0);
    setFailedTargets([]);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.createTargets(
        accountIdNum,
        campaignId,
        {
          targets: targets.map((tgt) => ({
            adGroupId: tgt.adGroupId,
            campaignId: campaignId,
            bid: tgt.bid,
            expression: [
              {
                type: tgt.expressionType,
                value: tgt.expressionValue,
              },
            ],
            expressionType: "MANUAL",
            state: tgt.state,
          })),
        }
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;
      const failedTargetsData = response.failed_targets || [];

      setCreatedTargets(response.targets || []);
      setFailedTargetCount(failed);
      setFailedTargets(failedTargetsData);

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateTargetPanelOpen(false);
        setCreateTargetError(null);
        setCreateTargetFieldErrors({});
        setCreatedTargets([]);
        setFailedTargetCount(0);
        setFailedTargets([]);

        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} target(s) created successfully!`,
          isSuccess: true,
        });

        // Reload targets to show the new ones
        await loadTargets();
      } else {
        // Partial success or all failed - show summary and keep panel open
        // Don't close panel - let user fix errors and resubmit
        const successMessage =
          created > 0
            ? `${created} target(s) created successfully. ${failed} target(s) failed.`
            : `All ${failed} target(s) failed to create.`;

        setCreateTargetError(successMessage);
        // Field errors will be set below if available

        // Show summary popup for partial success
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} target(s) created successfully. ${failed} target(s) failed.`,
            isSuccess: false,
          });
        }

        // Reload targets even on partial success to show newly created ones
        if (created > 0) {
          await loadTargets();
        }
      }

      // Extract field errors if available
      if (response.field_errors) {
        setCreateTargetFieldErrors(response.field_errors);
      }

      if (response.errors && response.errors.length > 0) {
        // Set general error if no field-specific errors
        if (
          !response.field_errors ||
          Object.keys(response.field_errors).length === 0
        ) {
          setCreateTargetError(
            response.errors[0] || "Failed to create some targets."
          );
        }
      }
    } catch (error: any) {
      console.error("Failed to create targets:", error);

      // Extract error message and field errors
      let errorMessage = "Failed to create targets. Please try again.";
      let fieldErrors: Record<string, string> = {};

      if (error?.response?.data) {
        if (error.response.data.field_errors) {
          fieldErrors = error.response.data.field_errors;
          errorMessage = error.response.data.error || errorMessage;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setCreateTargetError(errorMessage);
      setCreateTargetFieldErrors(fieldErrors);
      setFailedTargetCount(targets.length); // All failed
      setFailedTargets([]); // No specific failed targets data in error case
      // Don't close panel on error - let user fix and resubmit
    } finally {
      setCreateTargetLoading(false);
    }
  };

  const handleCreateProductAds = async (productAds: ProductAdInput[]) => {
    if (!accountId || !campaignId || campaignType !== "SP") return;

    setCreateProductAdLoading(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.createProductAds(
        accountIdNum,
        campaignId,
        {
          productAds: productAds.map((pa) => ({
            adGroupId: pa.adGroupId,
            asin: pa.asin,
            sku: pa.sku || undefined,
            customText: pa.customText || undefined,
            globalStoreSetting: pa.catalogSourceCountryCode
              ? {
                  catalogSourceCountryCode: pa.catalogSourceCountryCode,
                }
              : undefined,
            state: pa.state,
          })),
        }
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateProductAdPanelOpen(false);

        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} product ad(s) created successfully!`,
          isSuccess: true,
        });

        // Reload product ads to show the new ones
        await loadProductAds();
      } else {
        // Partial success or all failed - show summary and keep panel open
        // Show summary popup for partial success
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} product ad(s) created successfully. ${failed} product ad(s) failed.`,
            isSuccess: false,
          });
        }

        // Reload product ads even on partial success to show newly created ones
        if (created > 0) {
          await loadProductAds();
        }
      }
    } catch (error: any) {
      console.error("Failed to create product ads:", error);

      // Extract error message
      let errorMessage = "Failed to create product ads. Please try again.";

      if (error?.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateProductAdLoading(false);
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
        // Map status values
        const statusMap: Record<string, "enable" | "pause" | "archive"> = {
          enabled: "enable",
          paused: "pause",
          archived: "archive",
        };
        const statusValue =
          statusMap[inlineEditNewValue.toLowerCase()] || "enable";

        await campaignsService.bulkUpdateCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaignId || campaignId!],
          action: "status",
          status: statusValue,
        });
      } else if (inlineEditField === "budget") {
        // Extract numeric value
        const budgetValue = parseFloat(inlineEditNewValue);
        if (isNaN(budgetValue)) {
          throw new Error("Invalid budget value");
        }

        await campaignsService.bulkUpdateCampaigns(accountIdNum, {
          campaignIds: [campaignDetail.campaign.campaignId || campaignId!],
          action: "budget",
          budgetAction: "set",
          unit: "amount",
          value: budgetValue,
        });
      }

      // Reload campaign detail
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

  const loadKeywords = async () => {
    try {
      setKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setKeywordsLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getKeywords(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        {
          page: keywordsCurrentPage,
          page_size: 10,
          sort_by: keywordsSortBy,
          order: keywordsSortOrder,
          type: campaignType || undefined, // Pass campaign type to API
          ...buildKeywordsFilterParams(keywordsFilters),
        }
      );

      setKeywords(data.keywords);
      setKeywordsTotalPages(data.total_pages || 0);
      // Update AUTO campaign keywords state
      if (isAutoCampaign && data.keywords && data.keywords.length > 0) {
        setAutoCampaignHasKeywords(true);
      } else if (
        isAutoCampaign &&
        data.keywords &&
        data.keywords.length === 0
      ) {
        setAutoCampaignHasKeywords(false);
      }
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
      setKeywordsTotalPages(0);
      if (isAutoCampaign) {
        setAutoCampaignHasKeywords(false);
      }
    } finally {
      setKeywordsLoading(false);
    }
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

  const handleKeywordsSort = (column: string) => {
    if (keywordsSortBy === column) {
      setKeywordsSortOrder(keywordsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setKeywordsSortBy(column);
      setKeywordsSortOrder("asc");
    }
    setKeywordsCurrentPage(1);
  };

  const handleAdGroupsPageChange = (page: number) => {
    setAdgroupsCurrentPage(page);
  };

  const handleKeywordsPageChange = (page: number) => {
    setKeywordsCurrentPage(page);
  };

  const loadProductAds = async () => {
    try {
      setProductadsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setProductadsLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getProductAds(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        {
          page: productadsCurrentPage,
          page_size: 10,
          sort_by: productadsSortBy,
          order: productadsSortOrder,
          type: campaignType || undefined, // Pass campaign type to API
          ...buildProductAdsFilterParams(productadsFilters),
        }
      );

      setProductads(data.productads);
      setProductadsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load product ads:", error);
      setProductads([]);
      setProductadsTotalPages(0);
    } finally {
      setProductadsLoading(false);
    }
  };

  const handleSelectAllProductAds = (checked: boolean) => {
    if (checked) {
      setSelectedProductAdIds(new Set(productads.map((pa) => pa.id)));
    } else {
      setSelectedProductAdIds(new Set());
    }
  };

  const handleSelectProductAd = (id: number, checked: boolean) => {
    setSelectedProductAdIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleProductAdsSort = (column: string) => {
    if (productadsSortBy === column) {
      setProductadsSortOrder(productadsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setProductadsSortBy(column);
      setProductadsSortOrder("asc");
    }
    setProductadsCurrentPage(1);
  };

  const handleProductAdsPageChange = (page: number) => {
    setProductadsCurrentPage(page);
  };

  const loadTargets = async () => {
    try {
      setTargetsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setTargetsLoading(false);
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getTargets(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        {
          page: targetsCurrentPage,
          page_size: 10,
          sort_by: targetsSortBy,
          order: targetsSortOrder,
          type: campaignType || undefined, // Pass campaign type to API
          ...buildTargetsFilterParams(targetsFilters),
        }
      );

      setTargets(data.targets);
      setTargetsTotalPages(data.total_pages || 0);
      // Update AUTO campaign targets state
      if (isAutoCampaign && data.targets && data.targets.length > 0) {
        setAutoCampaignHasTargets(true);
      } else if (isAutoCampaign && data.targets && data.targets.length === 0) {
        setAutoCampaignHasTargets(false);
      }
    } catch (error) {
      console.error("Failed to load targets:", error);
      setTargets([]);
      setTargetsTotalPages(0);
      if (isAutoCampaign) {
        setAutoCampaignHasTargets(false);
      }
    } finally {
      setTargetsLoading(false);
    }
  };

  const handleSelectAllTargets = (checked: boolean) => {
    if (checked) {
      setSelectedTargetIds(new Set(targets.map((tgt) => tgt.id)));
    } else {
      setSelectedTargetIds(new Set());
    }
  };

  const handleSelectTarget = (id: number, checked: boolean) => {
    setSelectedTargetIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleTargetsSort = (column: string) => {
    if (targetsSortBy === column) {
      setTargetsSortOrder(targetsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setTargetsSortBy(column);
      setTargetsSortOrder("asc");
    }
    setTargetsCurrentPage(1);
  };

  const handleTargetsPageChange = (page: number) => {
    setTargetsCurrentPage(page);
  };

  const toggleChartMetric = (
    metric:
      | "sales"
      | "spend"
      | "impressions"
      | "clicks"
      | "orders"
      | "acos"
      | "roas"
  ) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Use chart data from API, or generate fallback if empty
  const chartData = useMemo(() => {
    if (campaignDetail?.chart_data && campaignDetail.chart_data.length > 0) {
      return campaignDetail.chart_data;
    }

    // Fallback: generate empty data structure
    return [];
  }, [campaignDetail]);

  // Calculate total row for ad groups
  const adGroupsTotalRow = useMemo(() => {
    if (adgroups.length === 0) return null;

    let totalSpends = 0;
    let totalSales = 0;
    let totalClicks = 0;
    let totalImpressions = 0;

    adgroups.forEach((ag) => {
      const spends = parseFloat(ag.spends?.replace(/[^0-9.]/g, "") || "0");
      const sales = parseFloat(ag.sales?.replace(/[^0-9.]/g, "") || "0");
      totalSpends += spends;
      totalSales += sales;
      totalClicks += ag.clicks || 0;
      totalImpressions += ag.impressions || 0;
    });

    const totalCTR =
      totalImpressions > 0
        ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%`
        : "0.00%";

    return {
      spends: `$${totalSpends.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      sales: `$${totalSales.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      ctr: totalCTR,
    };
  }, [adgroups]);

  // Ad Group inline edit handlers
  const handleAdGroupEditStart = (
    id: number,
    field: "status" | "default_bid",
    currentValue: string
  ) => {
    setEditingAdGroupField({ id, field });
    setEditedAdGroupValue(currentValue);
    setPendingAdGroupChange(null);
  };

  const handleAdGroupEditChange = (value: string) => {
    setEditedAdGroupValue(value);
  };

  const handleAdGroupEditEnd = () => {
    if (!editingAdGroupField) return;

    const adgroup = adgroups.find((ag) => ag.id === editingAdGroupField.id);
    if (!adgroup) {
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
      return;
    }

    let hasChanged = false;
    let oldValue = "";

    if (editingAdGroupField.field === "status") {
      const statusLower = adgroup.status?.toLowerCase() || "enabled";
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : statusLower === "paused"
          ? "paused"
          : "archived";
      oldValue = currentStatus;
      hasChanged = editedAdGroupValue !== currentStatus;
    } else if (editingAdGroupField.field === "default_bid") {
      const currentBid = adgroup.default_bid
        ? adgroup.default_bid.replace(/[^0-9.]/g, "")
        : "0";
      oldValue = adgroup.default_bid || "$0.00";
      hasChanged =
        editedAdGroupValue !== currentBid && editedAdGroupValue !== "";
    }

    if (hasChanged) {
      setPendingAdGroupChange({
        id: editingAdGroupField.id,
        field: editingAdGroupField.field,
        newValue: editedAdGroupValue,
        oldValue: oldValue,
      });
      setEditingAdGroupField(null);
    } else {
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
    }
  };

  const confirmAdGroupChange = async () => {
    if (!pendingAdGroupChange || !accountId) return;

    const adgroup = adgroups.find((ag) => ag.id === pendingAdGroupChange.id);
    if (!adgroup || !adgroup.adGroupId) {
      alert("Ad group ID not found");
      setPendingAdGroupChange(null);
      return;
    }

    setAdGroupEditLoading((prev) => new Set(prev).add(pendingAdGroupChange.id));
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (pendingAdGroupChange.field === "status") {
        // Map status values
        const statusMap: Record<string, "enable" | "pause" | "archive"> = {
          enabled: "enable",
          paused: "pause",
          archived: "archive",
        };
        const statusValue =
          statusMap[pendingAdGroupChange.newValue.toLowerCase()] || "enable";

        await campaignsService.bulkUpdateAdGroups(accountIdNum, {
          adgroupIds: [adgroup.adGroupId],
          action: "status",
          status: statusValue,
        });
      } else if (pendingAdGroupChange.field === "default_bid") {
        // Extract numeric value
        const bidValue = parseFloat(pendingAdGroupChange.newValue);
        if (isNaN(bidValue)) {
          throw new Error("Invalid bid value");
        }

        await campaignsService.bulkUpdateAdGroups(accountIdNum, {
          adgroupIds: [adgroup.adGroupId],
          action: "default_bid",
          value: bidValue,
        });
      }

      // Reload ad groups
      await loadAdGroups();
      setPendingAdGroupChange(null);
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
    } catch (error) {
      console.error("Error updating ad group:", error);
      alert("Failed to update ad group. Please try again.");
    } finally {
      setAdGroupEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingAdGroupChange.id);
        return newSet;
      });
    }
  };

  const cancelAdGroupChange = () => {
    setPendingAdGroupChange(null);
    setEditingAdGroupField(null);
    setEditedAdGroupValue("");
  };

  // Bulk action handlers for Ad Groups
  const handleBulkAdGroupsStatus = async (
    statusValue: "enable" | "pause" | "archive"
  ) => {
    if (!accountId || selectedAdGroupIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setAdGroupsBulkLoading(true);
      const selectedAdGroupIdsArray = Array.from(selectedAdGroupIds).map(
        (id) => {
          const adgroup = adgroups.find((ag) => ag.id === id);
          return adgroup?.adGroupId || id;
        }
      );

      await campaignsService.bulkUpdateAdGroups(accountIdNum, {
        adgroupIds: selectedAdGroupIdsArray,
        action: "status",
        status: statusValue,
      });

      await loadAdGroups();
      setSelectedAdGroupIds(new Set());
      setShowAdGroupsConfirmationModal(false);
      setPendingAdGroupsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update ad groups", error);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update ad groups. Please try again.",
      });
    } finally {
      setAdGroupsBulkLoading(false);
    }
  };

  const handleBulkAdGroupsBid = async () => {
    if (!accountId || selectedAdGroupIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(adGroupsBidValue);
    if (isNaN(valueNum)) {
      return;
    }

    try {
      setAdGroupsBulkLoading(true);

      const selectedAdGroupsData = adgroups.filter((ag) =>
        selectedAdGroupIds.has(ag.id)
      );
      const updates: Array<{ adgroupId: string | number; newBid: number }> = [];

      for (const adgroup of selectedAdGroupsData) {
        if (!adgroup.adGroupId) continue;

        const currentBid = parseFloat(
          (adgroup.default_bid || "$0.00").replace(/[^0-9.]/g, "")
        );
        let newBid = currentBid;

        if (adGroupsBidAction === "set") {
          newBid = valueNum;
        } else if (adGroupsBidAction === "increase") {
          if (adGroupsBidUnit === "percent") {
            newBid = currentBid * (1 + valueNum / 100.0);
          } else {
            newBid = currentBid + valueNum;
          }
        } else if (adGroupsBidAction === "decrease") {
          if (adGroupsBidUnit === "percent") {
            newBid = currentBid * (1 - valueNum / 100.0);
          } else {
            newBid = currentBid - valueNum;
          }
        }

        if (adGroupsBidUpperLimit) {
          const upper = parseFloat(adGroupsBidUpperLimit);
          if (!isNaN(upper)) {
            newBid = Math.min(newBid, upper);
          }
        }
        if (adGroupsBidLowerLimit) {
          const lower = parseFloat(adGroupsBidLowerLimit);
          if (!isNaN(lower)) {
            newBid = Math.max(newBid, lower);
          }
        }

        newBid = Math.max(newBid, 0);

        updates.push({
          adgroupId: adgroup.adGroupId,
          newBid: Math.round(newBid * 100) / 100,
        });
      }

      for (const update of updates) {
        await campaignsService.bulkUpdateAdGroups(accountIdNum, {
          adgroupIds: [update.adgroupId],
          action: "default_bid",
          value: update.newBid,
        });
      }

      await loadAdGroups();
      setSelectedAdGroupIds(new Set());
      setShowAdGroupsConfirmationModal(false);
      setShowAdGroupsBidPanel(false);
      setAdGroupsBidValue("");
      setAdGroupsBidUpperLimit("");
      setAdGroupsBidLowerLimit("");
    } catch (error: any) {
      console.error("Failed to update ad groups", error);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update ad groups. Please try again.",
      });
    } finally {
      setAdGroupsBulkLoading(false);
    }
  };

  // Close bulk actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        adGroupsBulkActionsRef.current &&
        !adGroupsBulkActionsRef.current.contains(event.target as Node)
      ) {
        setShowAdGroupsBulkActions(false);
      }
    };

    if (showAdGroupsBulkActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAdGroupsBulkActions]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 min-w-0 overflow-x-hidden"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white space-y-6 overflow-x-hidden">
          {/* Campaign Header - Matching Campaigns page style */}
          <div>
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
                {campaignDetail.campaign.campaignId && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Campaign ID
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.campaignId}
                    </div>
                  </div>
                )}

                {/* Status - Editable */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Status
                    </label>
                    <button
                      onClick={() => {
                        setEditingField("status");
                        // Map status to lowercase for the select dropdown
                        const statusLower =
                          campaignDetail.campaign.status?.toLowerCase() ||
                          "enabled";
                        setEditedValue(
                          statusLower === "enable" || statusLower === "enabled"
                            ? "enabled"
                            : statusLower === "paused"
                            ? "paused"
                            : "archived"
                        );
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Edit status"
                    >
                      <svg
                        className="w-4 h-4 text-[#556179]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                  {editingField === "status" ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1"
                        autoFocus
                        onBlur={() => {
                          // Normalize both values to lowercase for comparison
                          const currentStatus =
                            campaignDetail.campaign.status?.toLowerCase() ||
                            "enabled";
                          const newEditedValue = editedValue.toLowerCase();

                          if (newEditedValue !== currentStatus) {
                            setInlineEditField("status");
                            setInlineEditOldValue(
                              campaignDetail.campaign.status || "Enabled"
                            );
                            setInlineEditNewValue(editedValue);
                            setShowInlineEditModal(true);
                          } else {
                            setEditingField(null);
                            setEditedValue("");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            // Normalize both values to lowercase for comparison
                            const currentStatus =
                              campaignDetail.campaign.status?.toLowerCase() ||
                              "enabled";
                            const newEditedValue = editedValue.toLowerCase();

                            if (newEditedValue !== currentStatus) {
                              setInlineEditField("status");
                              setInlineEditOldValue(
                                campaignDetail.campaign.status || "Enabled"
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
                      >
                        <option value="enabled">Enabled</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  ) : (
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      <StatusBadge
                        status={
                          campaignDetail.campaign.status?.toLowerCase() ===
                            "enabled" ||
                          campaignDetail.campaign.status === "Enable"
                            ? "Enable"
                            : campaignDetail.campaign.status?.toLowerCase() ===
                                "paused" ||
                              campaignDetail.campaign.status === "Paused"
                            ? "Paused"
                            : "Archived"
                        }
                        uppercase={true}
                      />
                    </div>
                  )}
                </div>

                {/* Budget - Editable */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Budget
                    </label>
                    <button
                      onClick={() => {
                        setEditingField("budget");
                        setEditedValue(
                          (campaignDetail.campaign.budget || 0).toString()
                        );
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Edit budget"
                    >
                      <svg
                        className="w-4 h-4 text-[#556179]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
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
                          const oldBudget = campaignDetail.campaign.budget || 0;
                          if (
                            !isNaN(budgetValue) &&
                            budgetValue !== oldBudget
                          ) {
                            setInlineEditField("budget");
                            setInlineEditOldValue(
                              `$${oldBudget.toLocaleString()}`
                            );
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
                              campaignDetail.campaign.budget || 0;
                            if (
                              !isNaN(budgetValue) &&
                              budgetValue !== oldBudget
                            ) {
                              setInlineEditField("budget");
                              setInlineEditOldValue(
                                `$${oldBudget.toLocaleString()}`
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
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      ${(campaignDetail.campaign.budget || 0).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Start Date */}
                {campaignDetail.campaign.startDate && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Start Date
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {new Date(
                        campaignDetail.campaign.startDate
                      ).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* End Date */}
                {campaignDetail.campaign.endDate && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      End Date
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {new Date(
                        campaignDetail.campaign.endDate
                      ).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Targeting Type - Only for SP campaigns */}
                {(campaignDetail.campaign.targetingType ||
                  campaignDetail.campaign.targeting_type) && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Targeting Type
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.targetingType ||
                        campaignDetail.campaign.targeting_type ||
                        "—"}
                    </div>
                  </div>
                )}

                {/* Budget Type */}
                {campaignDetail.campaign.budgetType && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Budget Type
                    </label>
                    <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {campaignDetail.campaign.budgetType}
                    </div>
                  </div>
                )}
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
                {campaignDetail.kpi_cards.map((card, index) => (
                  <KPICard
                    key={index}
                    label={card.label}
                    value={card.value}
                    change={card.change}
                    isPositive={card.isPositive}
                    className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-1.3125rem)] lg:w-[calc(25%-1.3125rem)]"
                  />
                ))}
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
              {tabs.map((tab) => {
                // Determine if tab should be disabled
                let isDisabled = false;
                let disabledTooltip = "";

                if (isAutoCampaign) {
                  if (tab === "Keywords" && hasTargets) {
                    isDisabled = true;
                    disabledTooltip =
                      "This AUTO campaign already has targets. AUTO campaigns can have either Keywords or Targets, but not both.";
                  } else if (tab === "Targets" && hasKeywords) {
                    isDisabled = true;
                    disabledTooltip =
                      "This AUTO campaign already has keywords. AUTO campaigns can have either Keywords or Targets, but not both.";
                  }
                }

                const button = (
                  <button
                    key={tab}
                    onClick={() => {
                      if (!isDisabled) {
                        setActiveTab(tab);
                      }
                    }}
                    disabled={isDisabled}
                    className={`px-4 py-2 text-[16px] font-medium transition-colors border-b-2 ${
                      isDisabled
                        ? "cursor-not-allowed opacity-50 text-[#9CA3AF] border-transparent"
                        : "cursor-pointer"
                    } ${
                      activeTab === tab && !isDisabled
                        ? "border-[#136D6D] text-[#136D6D]"
                        : !isDisabled
                        ? "border-transparent text-[#556179] hover:text-[#072929]"
                        : ""
                    }`}
                  >
                    {tab}
                  </button>
                );

                if (isDisabled && disabledTooltip) {
                  return (
                    <Tooltip
                      key={tab}
                      description={disabledTooltip}
                      position="bottomMiddle"
                    >
                      {button}
                    </Tooltip>
                  );
                }

                return button;
              })}
            </div>

            {/* Tab Content */}
            {activeTab === "Overview" && (
              <>
                {/* Chart Section */}
                <PerformanceChart
                  data={chartData}
                  toggles={chartToggles}
                  onToggle={toggleChartMetric}
                  title="Performance Trends"
                />

                {/* Top Keywords & Top Products */}
                <div className="flex gap-6 mb-4">
                  {/* Top Keywords Table - Hidden for SD campaigns */}
                  {campaignType !== "SD" && (
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                          Top Keywords
                        </h3>
                      </div>
                      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                        <div className="overflow-x-auto w-full">
                          {loading ? (
                            <div className="text-center py-8 text-[#556179] text-[13.3px]">
                              Loading keywords...
                            </div>
                          ) : campaignDetail &&
                            campaignDetail.top_keywords.length > 0 ? (
                            <table className="min-w-full w-full">
                              <thead>
                                <tr className="border-b border-[#e8e8e3]">
                                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                                    <div className="flex items-center justify-center">
                                      <Checkbox
                                        checked={false}
                                        onChange={() => {}}
                                        size="small"
                                      />
                                    </div>
                                  </th>
                                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Keyword Name
                                  </th>
                                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    CTR
                                  </th>
                                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Status
                                  </th>
                                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Spends
                                  </th>
                                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                    Sales
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {campaignDetail.top_keywords.map(
                                  (keyword, index) => {
                                    const isLastRow =
                                      index ===
                                      campaignDetail.top_keywords.length - 1;
                                    return (
                                      <tr
                                        key={index}
                                        className={`${
                                          !isLastRow
                                            ? "border-b border-[#e8e8e3]"
                                            : ""
                                        } hover:bg-gray-50 transition-colors`}
                                      >
                                        <td className="py-[10px] px-[10px]">
                                          <div className="flex items-center justify-center">
                                            <Checkbox
                                              checked={false}
                                              onChange={() => {}}
                                              size="small"
                                            />
                                          </div>
                                        </td>
                                        <td className="py-[10px] px-[10px]">
                                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {keyword.name}
                                          </span>
                                        </td>
                                        <td className="py-[10px] px-[10px]">
                                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {keyword.ctr}
                                          </span>
                                        </td>
                                        <td className="py-[10px] px-[10px]">
                                          <StatusBadge
                                            status={keyword.status}
                                          />
                                        </td>
                                        <td className="py-[10px] px-[10px]">
                                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {keyword.spends}
                                          </span>
                                        </td>
                                        <td className="py-[10px] px-[10px]">
                                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {keyword.sales}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-[13.3px] text-[#556179] mb-4">
                                No keywords data available
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Products Table */}
                  <div className={campaignType === "SD" ? "w-full" : "flex-1"}>
                    <div className="mb-2">
                      <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                        Top Products
                      </h3>
                    </div>
                    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                      <div className="overflow-x-auto w-full">
                        {loading ? (
                          <div className="text-center py-8 text-[#556179] text-[13.3px]">
                            Loading products...
                          </div>
                        ) : campaignDetail &&
                          campaignDetail.top_products.length > 0 ? (
                          <table className="min-w-full w-full">
                            <thead>
                              <tr className="border-b border-[#e8e8e3]">
                                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={false}
                                      onChange={() => {}}
                                      size="small"
                                    />
                                  </div>
                                </th>
                                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                  Product Name
                                </th>
                                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                  ASIN
                                </th>
                                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                                  Sales
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {campaignDetail.top_products.map(
                                (product, index) => {
                                  const isLastRow =
                                    index ===
                                    campaignDetail.top_products.length - 1;
                                  return (
                                    <tr
                                      key={index}
                                      className={`${
                                        !isLastRow
                                          ? "border-b border-[#e8e8e3]"
                                          : ""
                                      } hover:bg-gray-50 transition-colors`}
                                    >
                                      <td className="py-[10px] px-[10px]">
                                        <div className="flex items-center justify-center">
                                          <Checkbox
                                            checked={false}
                                            onChange={() => {}}
                                            size="small"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-[10px] px-[10px]">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                          {product.name}
                                        </span>
                                      </td>
                                      <td className="py-[10px] px-[10px]">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                          {product.asin}
                                        </span>
                                      </td>
                                      <td className="py-[10px] px-[10px]">
                                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                          {product.sales}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-[13.3px] text-[#556179] mb-4">
                              No products data available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "Ad Groups" && (
              <>
                {/* Header with Create Adgroup, Bulk Edit, and Filter Buttons */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Ad Groups
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Create Adgroup Button */}
                    <CreateAdGroupSection
                      isOpen={isCreateAdGroupPanelOpen}
                      onToggle={() => {
                        setIsCreateAdGroupPanelOpen(!isCreateAdGroupPanelOpen);
                        setIsAdGroupsFilterPanelOpen(false); // Close filter panel when opening create panel
                        setShowAdGroupsBulkActions(false); // Close bulk actions when opening create panel
                      }}
                    />
                    {/* Bulk Edit Button */}
                    <div
                      className="relative inline-flex justify-end"
                      ref={adGroupsBulkActionsRef}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdGroupsBulkActions((prev) => !prev);
                          setShowAdGroupsBidPanel(false);
                          setIsAdGroupsFilterPanelOpen(false);
                        }}
                      >
                        <svg
                          className="w-4 h-4 text-[#072929]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                          />
                        </svg>
                        <span className="text-[10.64px] text-[#072929] font-normal">
                          Edit
                        </span>
                      </Button>
                      {showAdGroupsBulkActions && (
                        <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                          <div className="overflow-y-auto">
                            {[
                              { value: "enable", label: "Enabled" },
                              { value: "pause", label: "Paused" },
                              { value: "archive", label: "Archived" },
                              { value: "edit_bid", label: "Edit Default Bid" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                disabled={selectedAdGroupIds.size === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedAdGroupIds.size === 0) return;
                                  if (opt.value === "edit_bid") {
                                    setShowAdGroupsBidPanel(true);
                                  } else {
                                    setShowAdGroupsBidPanel(false);
                                    setPendingAdGroupsStatusAction(
                                      opt.value as
                                        | "enable"
                                        | "pause"
                                        | "archive"
                                    );
                                    setShowAdGroupsConfirmationModal(true);
                                  }
                                  setShowAdGroupsBulkActions(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Add Filter Button */}
                    <button
                      onClick={() => {
                        setIsAdGroupsFilterPanelOpen(
                          !isAdGroupsFilterPanelOpen
                        );
                        setIsCreateAdGroupPanelOpen(false); // Close create panel when opening filter panel
                        setShowAdGroupsBulkActions(false); // Close bulk actions when opening filter panel
                      }}
                      className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-[#072929]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      <span className="text-[10.64px] text-[#072929] font-normal">
                        Add Filter
                      </span>
                      <svg
                        className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                          isAdGroupsFilterPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                  </div>
                </div>

                {/* Bid editor panel for Ad Groups */}
                {selectedAdGroupIds.size > 0 && showAdGroupsBidPanel && (
                  <div className="px-6 mb-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-wrap items-end gap-3 justify-between">
                        <div className="w-[160px]">
                          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                            Action
                          </label>
                          <Dropdown
                            options={[
                              { value: "increase", label: "Increase By" },
                              { value: "decrease", label: "Decrease By" },
                              { value: "set", label: "Set To" },
                            ]}
                            value={adGroupsBidAction}
                            onChange={(val) => {
                              const action = val as typeof adGroupsBidAction;
                              setAdGroupsBidAction(action);
                              if (action === "set") {
                                setAdGroupsBidUnit("amount");
                              }
                            }}
                            buttonClassName="w-full"
                            width="w-full"
                          />
                        </div>
                        {(adGroupsBidAction === "increase" ||
                          adGroupsBidAction === "decrease") && (
                          <div className="w-[140px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Unit
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                                  adGroupsBidUnit === "percent"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-background-field text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setAdGroupsBidUnit("percent")}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                                  adGroupsBidUnit === "amount"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-background-field text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setAdGroupsBidUnit("amount")}
                              >
                                $
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="w-[160px]">
                          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                            Value
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={adGroupsBidValue}
                              onChange={(e) =>
                                setAdGroupsBidValue(e.target.value)
                              }
                              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                              {adGroupsBidUnit === "percent" ? "%" : "$"}
                            </span>
                          </div>
                        </div>
                        {adGroupsBidAction === "increase" && (
                          <div className="w-[160px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Upper Limit (Optional)
                            </label>
                            <input
                              type="number"
                              value={adGroupsBidUpperLimit}
                              onChange={(e) =>
                                setAdGroupsBidUpperLimit(e.target.value)
                              }
                              placeholder="$0.00"
                              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                            />
                          </div>
                        )}
                        {adGroupsBidAction === "decrease" && (
                          <div className="w-[160px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Lower Limit (Optional)
                            </label>
                            <input
                              type="number"
                              value={adGroupsBidLowerLimit}
                              onChange={(e) =>
                                setAdGroupsBidLowerLimit(e.target.value)
                              }
                              placeholder="$0.00"
                              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdGroupsBidPanel(false);
                              setAdGroupsBidValue("");
                              setAdGroupsBidUpperLimit("");
                              setAdGroupsBidLowerLimit("");
                            }}
                            className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setShowAdGroupsConfirmationModal(true);
                            }}
                            disabled={!adGroupsBidValue || adGroupsBulkLoading}
                            className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Adgroup Panel */}
                {isCreateAdGroupPanelOpen && campaignId && (
                  <CreateAdGroupPanel
                    isOpen={isCreateAdGroupPanelOpen}
                    onClose={() => {
                      setIsCreateAdGroupPanelOpen(false);
                      // Reset error states when closing
                      setCreateAdGroupError(null);
                      setCreateAdGroupFieldErrors({});
                      setCreatedAdGroups([]);
                      setFailedAdGroupCount(0);
                      setFailedAdGroups([]);
                    }}
                    onSubmit={handleCreateAdGroups}
                    campaignId={campaignId}
                    campaignType={campaignType || "SP"}
                    loading={createAdGroupLoading}
                    submitError={createAdGroupError}
                    fieldErrors={createAdGroupFieldErrors}
                    createdAdGroups={createdAdGroups}
                    failedCount={failedAdGroupCount}
                    failedAdGroups={failedAdGroups}
                  />
                )}

                {/* Filter Panel */}
                {isAdGroupsFilterPanelOpen && (
                  <div className="mb-4">
                    <FilterPanel
                      isOpen={true}
                      onClose={() => {
                        // Check if filters changed before closing
                        // The FilterPanel will have already applied changes via onApply when chips are removed
                        setIsAdGroupsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        setAdgroupsFilters(newFilters);
                        setAdgroupsCurrentPage(1); // Reset to first page when applying filters
                        // Data will refresh automatically via useEffect dependency on adgroupsFilters
                      }}
                      initialFilters={adgroupsFilters}
                      filterFields={[
                        { value: "name", label: "Ad Group Name" },
                        { value: "state", label: "State" },
                        { value: "default_bid", label: "Default Bid" },
                      ]}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <AdGroupsTable
                    adgroups={adgroups}
                    loading={adgroupsLoading}
                    onSelectAll={handleSelectAllAdGroups}
                    onSelect={handleSelectAdGroup}
                    selectedIds={selectedAdGroupIds}
                    sortBy={adgroupsSortBy}
                    sortOrder={adgroupsSortOrder}
                    onSort={handleAdGroupsSort}
                    editingField={editingAdGroupField}
                    editedValue={editedAdGroupValue}
                    onEditStart={handleAdGroupEditStart}
                    onEditChange={handleAdGroupEditChange}
                    onEditEnd={handleAdGroupEditEnd}
                    inlineEditLoading={adGroupEditLoading}
                    pendingChange={pendingAdGroupChange}
                    onConfirmChange={confirmAdGroupChange}
                    onCancelChange={cancelAdGroupChange}
                    showTotalRow={adgroups.length > 0}
                    totalRow={adGroupsTotalRow || undefined}
                  />
                </div>
                {/* Pagination */}
                {!adgroupsLoading &&
                  adgroups.length > 0 &&
                  adgroupsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleAdGroupsPageChange(
                              Math.max(1, adgroupsCurrentPage - 1)
                            )
                          }
                          disabled={adgroupsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, adgroupsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (adgroupsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (adgroupsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              adgroupsCurrentPage >=
                              adgroupsTotalPages - 2
                            ) {
                              pageNum = adgroupsTotalPages - 4 + i;
                            } else {
                              pageNum = adgroupsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() =>
                                  handleAdGroupsPageChange(pageNum)
                                }
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  adgroupsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {adgroupsTotalPages > 5 &&
                          adgroupsCurrentPage < adgroupsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {adgroupsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleAdGroupsPageChange(adgroupsTotalPages)
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              adgroupsCurrentPage === adgroupsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {adgroupsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleAdGroupsPageChange(
                              Math.min(
                                adgroupsTotalPages,
                                adgroupsCurrentPage + 1
                              )
                            )
                          }
                          disabled={adgroupsCurrentPage === adgroupsTotalPages}
                          className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}

            {activeTab === "Keywords" && (
              <>
                {/* Header with Filter Button and Create Keyword Button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Keywords
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Create Keyword Button */}
                    <button
                      onClick={async () => {
                        const newState = !isCreateKeywordPanelOpen;
                        setIsCreateKeywordPanelOpen(newState);
                        if (newState) {
                          await loadAllAdGroups();
                        }
                      }}
                      className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] hover:!text-white transition-colors text-[10.64px] font-semibold"
                    >
                      <svg
                        className="w-4 h-4 !text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Create Keywords
                      <svg
                        className={`w-4 h-4 !text-white transition-transform ${
                          isCreateKeywordPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                    {/* Add Filter Button */}
                    <button
                      onClick={() =>
                        setIsKeywordsFilterPanelOpen(!isKeywordsFilterPanelOpen)
                      }
                      className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-[#072929]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      <span className="text-[10.64px] text-[#072929] font-normal">
                        Add Filter
                      </span>
                      <svg
                        className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                          isKeywordsFilterPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                  </div>
                </div>

                {/* Filter Panel */}
                {isKeywordsFilterPanelOpen && (
                  <div className="mb-4">
                    <FilterPanel
                      isOpen={true}
                      onClose={() => {
                        // Check if filters changed before closing
                        // The FilterPanel will have already applied changes via onApply when chips are removed
                        setIsKeywordsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        setKeywordsFilters(newFilters);
                        setKeywordsCurrentPage(1); // Reset to first page when applying filters
                        // Data will refresh automatically via useEffect dependency on keywordsFilters
                      }}
                      initialFilters={keywordsFilters}
                      filterFields={[
                        { value: "name", label: "Keyword" },
                        { value: "state", label: "State" },
                        { value: "bid", label: "Bid" },
                        { value: "adgroup_name", label: "Ad Group" },
                      ]}
                    />
                  </div>
                )}

                {/* Create Keyword Panel */}
                {isCreateKeywordPanelOpen && (
                  <CreateKeywordPanel
                    isOpen={isCreateKeywordPanelOpen}
                    onClose={() => {
                      setIsCreateKeywordPanelOpen(false);
                      setCreateKeywordError(null);
                      setCreateKeywordFieldErrors({});
                      setCreatedKeywords([]);
                      setFailedKeywordCount(0);
                      setFailedKeywords([]);
                    }}
                    onSubmit={handleCreateKeywords}
                    adgroups={(allAdgroups.length > 0
                      ? allAdgroups
                      : adgroups
                    ).map((ag) => ({
                      adGroupId: ag.adGroupId || String(ag.id),
                      name: ag.name,
                    }))}
                    campaignId={campaignId || ""}
                    loading={createKeywordLoading}
                    submitError={createKeywordError}
                    fieldErrors={createKeywordFieldErrors}
                    createdKeywords={createdKeywords}
                    failedCount={failedKeywordCount}
                    failedKeywords={failedKeywords}
                  />
                )}

                <div className="mb-4">
                  <KeywordsTable
                    keywords={keywords}
                    loading={keywordsLoading}
                    onSelectAll={handleSelectAllKeywords}
                    onSelect={handleSelectKeyword}
                    selectedIds={selectedKeywordIds}
                    sortBy={keywordsSortBy}
                    sortOrder={keywordsSortOrder}
                    onSort={handleKeywordsSort}
                  />
                </div>
                {/* Pagination */}
                {!keywordsLoading &&
                  keywords.length > 0 &&
                  keywordsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleKeywordsPageChange(
                              Math.max(1, keywordsCurrentPage - 1)
                            )
                          }
                          disabled={keywordsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, keywordsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (keywordsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (keywordsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              keywordsCurrentPage >=
                              keywordsTotalPages - 2
                            ) {
                              pageNum = keywordsTotalPages - 4 + i;
                            } else {
                              pageNum = keywordsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() =>
                                  handleKeywordsPageChange(pageNum)
                                }
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  keywordsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {keywordsTotalPages > 5 &&
                          keywordsCurrentPage < keywordsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {keywordsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleKeywordsPageChange(keywordsTotalPages)
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              keywordsCurrentPage === keywordsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {keywordsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleKeywordsPageChange(
                              Math.min(
                                keywordsTotalPages,
                                keywordsCurrentPage + 1
                              )
                            )
                          }
                          disabled={keywordsCurrentPage === keywordsTotalPages}
                          className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}

            {activeTab === "Product Ads" && (
              <>
                {/* Header with Filter Button and Create Product Ad Button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Product Ads
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Create Product Ad Button */}
                    <button
                      onClick={async () => {
                        const newState = !isCreateProductAdPanelOpen;
                        setIsCreateProductAdPanelOpen(newState);
                        if (newState) {
                          await loadAllAdGroups();
                        }
                      }}
                      className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] hover:!text-white transition-colors text-[10.64px] font-semibold"
                    >
                      <svg
                        className="w-4 h-4 !text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Create Product Ads
                      <svg
                        className={`w-4 h-4 !text-white transition-transform ${
                          isCreateProductAdPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                    {/* Add Filter Button */}
                    <button
                      onClick={() =>
                        setIsProductAdsFilterPanelOpen(
                          !isProductAdsFilterPanelOpen
                        )
                      }
                      className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-[#072929]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      <span className="text-[10.64px] text-[#072929] font-normal">
                        Add Filter
                      </span>
                      <svg
                        className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                          isProductAdsFilterPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                  </div>
                </div>

                {/* Create Product Ad Panel */}
                {isCreateProductAdPanelOpen && (
                  <CreateProductAdPanel
                    isOpen={isCreateProductAdPanelOpen}
                    onClose={() => setIsCreateProductAdPanelOpen(false)}
                    onSubmit={handleCreateProductAds}
                    adgroups={(allAdgroups.length > 0
                      ? allAdgroups
                      : adgroups
                    ).map((ag) => ({
                      adGroupId: ag.adGroupId || String(ag.id),
                      name: ag.name,
                    }))}
                    campaignId={campaignId || ""}
                    loading={createProductAdLoading}
                  />
                )}

                {/* Filter Panel */}
                {isProductAdsFilterPanelOpen && (
                  <div className="mb-4">
                    <FilterPanel
                      isOpen={true}
                      onClose={() => {
                        // Check if filters changed before closing
                        // The FilterPanel will have already applied changes via onApply when chips are removed
                        setIsProductAdsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        setProductadsFilters(newFilters);
                        setProductadsCurrentPage(1); // Reset to first page when applying filters
                        // Data will refresh automatically via useEffect dependency on productadsFilters
                      }}
                      initialFilters={productadsFilters}
                      filterFields={[
                        { value: "adId", label: "Ad ID" },
                        { value: "asin", label: "ASIN" },
                        { value: "sku", label: "SKU" },
                        { value: "state", label: "State" },
                        { value: "adGroupId", label: "Ad Group ID" },
                      ]}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <ProductAdsTable
                    productads={productads}
                    loading={productadsLoading}
                    onSelectAll={handleSelectAllProductAds}
                    onSelect={handleSelectProductAd}
                    selectedIds={selectedProductAdIds}
                    sortBy={productadsSortBy}
                    sortOrder={productadsSortOrder}
                    onSort={handleProductAdsSort}
                  />
                </div>
                {/* Pagination */}
                {!productadsLoading &&
                  productads.length > 0 &&
                  productadsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleProductAdsPageChange(
                              Math.max(1, productadsCurrentPage - 1)
                            )
                          }
                          disabled={productadsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, productadsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (productadsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (productadsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              productadsCurrentPage >=
                              productadsTotalPages - 2
                            ) {
                              pageNum = productadsTotalPages - 4 + i;
                            } else {
                              pageNum = productadsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() =>
                                  handleProductAdsPageChange(pageNum)
                                }
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  productadsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {productadsTotalPages > 5 &&
                          productadsCurrentPage < productadsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {productadsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleProductAdsPageChange(productadsTotalPages)
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              productadsCurrentPage === productadsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {productadsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleProductAdsPageChange(
                              Math.min(
                                productadsTotalPages,
                                productadsCurrentPage + 1
                              )
                            )
                          }
                          disabled={
                            productadsCurrentPage === productadsTotalPages
                          }
                          className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}

            {activeTab === "Targets" && (
              <>
                {/* Header with Filter Button and Create Target Button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Targets
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Create Target Button */}
                    <button
                      onClick={async () => {
                        const newState = !isCreateTargetPanelOpen;
                        setIsCreateTargetPanelOpen(newState);
                        if (newState) {
                          await loadAllAdGroups();
                        }
                      }}
                      className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] hover:!text-white transition-colors text-[10.64px] font-semibold"
                    >
                      <svg
                        className="w-4 h-4 !text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Create Targets
                      <svg
                        className={`w-4 h-4 !text-white transition-transform ${
                          isCreateTargetPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                    {/* Add Filter Button */}
                    <button
                      onClick={() =>
                        setIsTargetsFilterPanelOpen(!isTargetsFilterPanelOpen)
                      }
                      className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-[#072929]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      <span className="text-[10.64px] text-[#072929] font-normal">
                        Add Filter
                      </span>
                      <svg
                        className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                          isTargetsFilterPanelOpen ? "rotate-180" : ""
                        }`}
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
                    </button>
                  </div>
                </div>

                {/* Create Target Panel */}
                {isCreateTargetPanelOpen && (
                  <CreateTargetPanel
                    isOpen={isCreateTargetPanelOpen}
                    onClose={() => {
                      setIsCreateTargetPanelOpen(false);
                      // Reset error states when closing
                      setCreateTargetError(null);
                      setCreateTargetFieldErrors({});
                      setCreatedTargets([]);
                      setFailedTargetCount(0);
                      setFailedTargets([]);
                    }}
                    onSubmit={handleCreateTargets}
                    adgroups={(allAdgroups.length > 0
                      ? allAdgroups
                      : adgroups
                    ).map((ag) => ({
                      adGroupId: ag.adGroupId || String(ag.id),
                      name: ag.name,
                    }))}
                    campaignId={campaignId || ""}
                    loading={createTargetLoading}
                    submitError={createTargetError}
                    fieldErrors={createTargetFieldErrors}
                    createdTargets={createdTargets}
                    failedCount={failedTargetCount}
                    failedTargets={failedTargets}
                  />
                )}

                {/* Filter Panel */}
                {isTargetsFilterPanelOpen && (
                  <div className="mb-4">
                    <FilterPanel
                      isOpen={true}
                      onClose={() => {
                        // Check if filters changed before closing
                        // The FilterPanel will have already applied changes via onApply when chips are removed
                        setIsTargetsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        setTargetsFilters(newFilters);
                        setTargetsCurrentPage(1); // Reset to first page when applying filters
                        // Data will refresh automatically via useEffect dependency on targetsFilters
                      }}
                      initialFilters={targetsFilters}
                      filterFields={[
                        { value: "name", label: "Target" },
                        { value: "state", label: "State" },
                        { value: "bid", label: "Bid" },
                        { value: "adgroup_name", label: "Ad Group" },
                      ]}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <TargetsTable
                    targets={targets}
                    loading={targetsLoading}
                    onSelectAll={handleSelectAllTargets}
                    onSelect={handleSelectTarget}
                    selectedIds={selectedTargetIds}
                    sortBy={targetsSortBy}
                    sortOrder={targetsSortOrder}
                    onSort={handleTargetsSort}
                  />
                </div>
                {/* Pagination */}
                {!targetsLoading &&
                  targets.length > 0 &&
                  targetsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleTargetsPageChange(
                              Math.max(1, targetsCurrentPage - 1)
                            )
                          }
                          disabled={targetsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, targetsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (targetsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (targetsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              targetsCurrentPage >=
                              targetsTotalPages - 2
                            ) {
                              pageNum = targetsTotalPages - 4 + i;
                            } else {
                              pageNum = targetsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handleTargetsPageChange(pageNum)}
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  targetsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {targetsTotalPages > 5 &&
                          targetsCurrentPage < targetsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {targetsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleTargetsPageChange(targetsTotalPages)
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              targetsCurrentPage === targetsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {targetsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleTargetsPageChange(
                              Math.min(
                                targetsTotalPages,
                                targetsCurrentPage + 1
                              )
                            )
                          }
                          disabled={targetsCurrentPage === targetsTotalPages}
                          className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}

            {activeTab !== "Overview" &&
              activeTab !== "Ad Groups" &&
              activeTab !== "Keywords" &&
              activeTab !== "Product Ads" &&
              activeTab !== "Targets" && (
                <div className="p-8 text-center text-[#556179]">
                  {activeTab} tab content coming soon...
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Campaign Inline Edit Confirmation Modal */}
      {showInlineEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Change</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {inlineEditField === "status" ? "Status" : "Budget"}
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
                    : `$${parseFloat(
                        inlineEditNewValue || "0"
                      ).toLocaleString()}`}
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
      />

      {/* Confirmation Modal for Ad Groups Bulk Actions */}
      {showAdGroupsConfirmationModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!adGroupsBulkLoading) {
                setShowAdGroupsConfirmationModal(false);
                setPendingAdGroupsStatusAction(null);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Action
                </h3>
                <p className="text-[14px] text-[#556179]">
                  {pendingAdGroupsStatusAction
                    ? `Are you sure you want to ${
                        pendingAdGroupsStatusAction === "enable"
                          ? "enable"
                          : pendingAdGroupsStatusAction === "pause"
                          ? "pause"
                          : "archive"
                      } ${selectedAdGroupIds.size} ad group(s)?`
                    : `Are you sure you want to update the default bid for ${selectedAdGroupIds.size} ad group(s)?`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdGroupsConfirmationModal(false);
                    setPendingAdGroupsStatusAction(null);
                  }}
                  disabled={adGroupsBulkLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (pendingAdGroupsStatusAction) {
                      await handleBulkAdGroupsStatus(
                        pendingAdGroupsStatusAction
                      );
                    } else {
                      await handleBulkAdGroupsBid();
                    }
                  }}
                  disabled={adGroupsBulkLoading}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adGroupsBulkLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
