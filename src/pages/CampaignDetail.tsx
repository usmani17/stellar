import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
  type CampaignDetail,
} from "../services/campaigns";
import { AdGroupsTable } from "../components/campaigns/AdGroupsTable";
import { KeywordsTable } from "../components/campaigns/KeywordsTable";
import { ProductAdsTable } from "../components/campaigns/ProductAdsTable";
import { SBAdsTable, type SBAd } from "../components/campaigns/SBAdsTable";
import { AssetsTable, type Asset } from "../components/campaigns/AssetsTable";
import { TargetsTable } from "../components/campaigns/TargetsTable";
import { NegativeKeywordsTable } from "../components/campaigns/NegativeKeywordsTable";
import { NegativeTargetsTable } from "../components/campaigns/NegativeTargetsTable";
import { LogsTable } from "../components/campaigns/LogsTable";
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
  CreateNegativeKeywordPanel,
  type NegativeKeywordInput,
} from "../components/campaigns/CreateNegativeKeywordPanel";
import {
  CreateNegativeTargetPanel,
  type NegativeTargetInput,
} from "../components/campaigns/CreateNegativeTargetPanel";
import {
  CreateProductAdPanel,
  type ProductAdInput,
} from "../components/productads/CreateProductAdPanel";
import {
  CreateSBAdPanel,
  type SBAdInput,
} from "../components/sbads/CreateSBAdPanel";
import {
  CreateAssetPanel,
  type AssetInput,
} from "../components/assets/CreateAssetPanel";
import { ErrorModal } from "../components/ui/ErrorModal";
import { Tooltip } from "../components/ui/Tooltip";
import { Button } from "../components/ui";
import { Dropdown } from "../components/ui/Dropdown";

export const CampaignDetail: React.FC = () => {
  const { accountId, campaignTypeAndId } = useParams<{
    accountId: string;
    campaignTypeAndId: string;
  }>();
  const [searchParams] = useSearchParams();
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
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(
    null
  );

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
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<
    Set<string | number>
  >(new Set());
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
  const [
    isCreateNegativeKeywordPanelOpen,
    setIsCreateNegativeKeywordPanelOpen,
  ] = useState(false);
  const [createNegativeKeywordLoading, setCreateNegativeKeywordLoading] =
    useState(false);
  const [createNegativeKeywordError, setCreateNegativeKeywordError] = useState<
    string | null
  >(null);
  const [
    createNegativeKeywordFieldErrors,
    setCreateNegativeKeywordFieldErrors,
  ] = useState<Record<string, string>>({});
  const [createdNegativeKeywords, setCreatedNegativeKeywords] = useState<any[]>(
    []
  );
  const [failedNegativeKeywordCount, setFailedNegativeKeywordCount] =
    useState(0);
  const [failedNegativeKeywords, setFailedNegativeKeywords] = useState<any[]>(
    []
  );
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
  const [showAdGroupsDeleteConfirmation, setShowAdGroupsDeleteConfirmation] =
    useState(false);
  const [adGroupsDeleteLoading, setAdGroupsDeleteLoading] = useState(false);
  const [showKeywordsConfirmationModal, setShowKeywordsConfirmationModal] =
    useState(false);
  const [showKeywordsBulkActions, setShowKeywordsBulkActions] = useState(false);
  const [showKeywordsBidPanel, setShowKeywordsBidPanel] = useState(false);
  const [pendingKeywordsStatusAction, setPendingKeywordsStatusAction] =
    useState<"enable" | "pause" | null>(null);
  const [keywordsBulkLoading, setKeywordsBulkLoading] = useState(false);
  const [showKeywordsDeleteConfirmation, setShowKeywordsDeleteConfirmation] =
    useState(false);
  const [keywordsDeleteLoading, setKeywordsDeleteLoading] = useState(false);

  // Product Ads bulk edit state
  const [showProductAdsBulkActions, setShowProductAdsBulkActions] =
    useState(false);
  const [
    showProductAdsDeleteConfirmation,
    setShowProductAdsDeleteConfirmation,
  ] = useState(false);
  const [productAdsDeleteLoading, setProductAdsDeleteLoading] = useState(false);
  const productAdsBulkActionsRef = useRef<HTMLDivElement>(null);

  // Target bulk edit state
  const [showTargetsBulkActions, setShowTargetsBulkActions] = useState(false);
  const [showTargetsBidPanel, setShowTargetsBidPanel] = useState(false);
  const [pendingTargetsStatusAction, setPendingTargetsStatusAction] = useState<
    "enable" | "pause" | null
  >(null);
  const [targetsBulkLoading, setTargetsBulkLoading] = useState(false);
  const [showTargetsDeleteConfirmation, setShowTargetsDeleteConfirmation] =
    useState(false);
  const [targetsDeleteLoading, setTargetsDeleteLoading] = useState(false);
  const [targetsBidAction, setTargetsBidAction] = useState<
    "increase" | "decrease" | "set"
  >("increase");
  const [targetsBidUnit, setTargetsBidUnit] = useState<"percent" | "amount">(
    "percent"
  );
  const [targetsBidValue, setTargetsBidValue] = useState<string>("");
  const [targetsBidUpperLimit, setTargetsBidUpperLimit] = useState<string>("");
  const [targetsBidLowerLimit, setTargetsBidLowerLimit] = useState<string>("");
  const targetsBulkActionsRef = useRef<HTMLDivElement>(null);
  const [keywordsBidAction, setKeywordsBidAction] = useState<
    "increase" | "decrease" | "set"
  >("increase");
  const [keywordsBidUnit, setKeywordsBidUnit] = useState<"percent" | "amount">(
    "percent"
  );
  const [keywordsBidValue, setKeywordsBidValue] = useState<string>("");
  const [keywordsBidUpperLimit, setKeywordsBidUpperLimit] =
    useState<string>("");
  const [keywordsBidLowerLimit, setKeywordsBidLowerLimit] =
    useState<string>("");
  const keywordsBulkActionsRef = useRef<HTMLDivElement>(null);
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
  const adgroupsLoadingRef = useRef(false);
  const adgroupsAbortControllerRef = useRef<AbortController | null>(null);
  const adgroupsRequestIdRef = useRef<string>("");
  const lastAppliedFiltersRef = useRef<string>("");
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

  // SB Ads state
  const [sbAds, setSbAds] = useState<SBAd[]>([]);
  const [sbAdsLoading, setSbAdsLoading] = useState(false);
  const [createSBAdLoading, setCreateSBAdLoading] = useState(false);
  const [selectedSBAdIds, setSelectedSBAdIds] = useState<Set<number>>(
    new Set()
  );
  const [sbAdsCurrentPage, setSbAdsCurrentPage] = useState(1);
  const [sbAdsTotalPages, setSbAdsTotalPages] = useState(0);
  const [sbAdsSortBy, setSbAdsSortBy] = useState<string>("id");
  const [sbAdsSortOrder, setSbAdsSortOrder] = useState<"asc" | "desc">("asc");
  const [isSBAdsFilterPanelOpen, setIsSBAdsFilterPanelOpen] = useState(false);
  const [sbAdsFilters, setSbAdsFilters] = useState<FilterValues>([]);
  const [isCreateSBAdPanelOpen, setIsCreateSBAdPanelOpen] = useState(false);
  const [createSBAdError, setCreateSBAdError] = useState<string | null>(null);
  const [createSBAdFieldErrors, setCreateSBAdFieldErrors] = useState<
    Record<string, string>
  >({});
  const [createdSBAds, setCreatedSBAds] = useState<any[]>([]);
  const [failedSBAdCount, setFailedSBAdCount] = useState(0);
  const [failedSBAds, setFailedSBAds] = useState<any[]>([]);

  // SB Ads bulk edit state
  const [showSBAdsBulkActions, setShowSBAdsBulkActions] = useState(false);
  const [showSBAdsDeleteConfirmation, setShowSBAdsDeleteConfirmation] =
    useState(false);
  const [sbAdsDeleteLoading, setSbAdsDeleteLoading] = useState(false);
  const sbAdsBulkActionsRef = useRef<HTMLDivElement>(null);

  // Assets state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [createAssetLoading, setCreateAssetLoading] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(
    new Set()
  );
  const [assetsCurrentPage, setAssetsCurrentPage] = useState(1);
  const [assetsTotalPages, setAssetsTotalPages] = useState(0);
  const [assetsSortBy, setAssetsSortBy] = useState<string>("id");
  const [assetsSortOrder, setAssetsSortOrder] = useState<"asc" | "desc">("asc");
  const [isAssetsFilterPanelOpen, setIsAssetsFilterPanelOpen] = useState(false);
  const [assetsFilters, setAssetsFilters] = useState<FilterValues>([]);
  const [isCreateAssetPanelOpen, setIsCreateAssetPanelOpen] = useState(false);
  const [createAssetError, setCreateAssetError] = useState<string | null>(null);
  const [createAssetFieldErrors, setCreateAssetFieldErrors] = useState<
    Record<string, string>
  >({});

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

  // Negative keywords and targets state (for auto campaigns)
  const [negativeKeywords, setNegativeKeywords] = useState<any[]>([]);
  const [negativeKeywordsLoading, setNegativeKeywordsLoading] = useState(false);
  const [selectedNegativeKeywordIds, setSelectedNegativeKeywordIds] = useState<
    Set<number>
  >(new Set());
  const [negativeKeywordsCurrentPage, setNegativeKeywordsCurrentPage] =
    useState(1);
  const [
    isNegativeKeywordsFilterPanelOpen,
    setIsNegativeKeywordsFilterPanelOpen,
  ] = useState(false);
  const [negativeKeywordsFilters, setNegativeKeywordsFilters] =
    useState<FilterValues>([]);
  const [negativeKeywordsTotalPages, setNegativeKeywordsTotalPages] =
    useState(0);
  const [negativeKeywordsSortBy, setNegativeKeywordsSortBy] =
    useState<string>("id");
  const [negativeKeywordsSortOrder, setNegativeKeywordsSortOrder] = useState<
    "asc" | "desc"
  >("asc");

  const [negativeTargets, setNegativeTargets] = useState<any[]>([]);
  const [negativeTargetsLoading, setNegativeTargetsLoading] = useState(false);
  const [selectedNegativeTargetIds, setSelectedNegativeTargetIds] = useState<
    Set<number>
  >(new Set());
  const [negativeTargetsCurrentPage, setNegativeTargetsCurrentPage] =
    useState(1);
  const [negativeTargetsTotalPages, setNegativeTargetsTotalPages] = useState(0);
  const [negativeTargetsSortBy, setNegativeTargetsSortBy] =
    useState<string>("id");
  const [negativeTargetsSortOrder, setNegativeTargetsSortOrder] = useState<
    "asc" | "desc"
  >("asc");
  const [
    isNegativeTargetsFilterPanelOpen,
    setIsNegativeTargetsFilterPanelOpen,
  ] = useState(false);
  const [negativeTargetsFilters, setNegativeTargetsFilters] =
    useState<FilterValues>([]);
  const [showNegativeTargetsBulkActions, setShowNegativeTargetsBulkActions] =
    useState(false);
  const [
    pendingNegativeTargetsStatusAction,
    setPendingNegativeTargetsStatusAction,
  ] = useState<"enable" | "pause" | null>(null);
  const [negativeTargetsBulkLoading, setNegativeTargetsBulkLoading] =
    useState(false);
  const [
    showNegativeTargetsDeleteConfirmation,
    setShowNegativeTargetsDeleteConfirmation,
  ] = useState(false);
  const [negativeTargetsDeleteLoading, setNegativeTargetsDeleteLoading] =
    useState(false);
  const negativeTargetsBulkActionsRef = useRef<HTMLDivElement>(null);

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
    field: "status" | "default_bid" | "name";
  } | null>(null);
  const [editedAdGroupValue, setEditedAdGroupValue] = useState<string>("");
  const [adGroupEditLoading, setAdGroupEditLoading] = useState<Set<number>>(
    new Set()
  );
  const [pendingAdGroupChange, setPendingAdGroupChange] = useState<{
    id: number;
    field: "status" | "default_bid" | "name";
    newValue: string;
    oldValue: string;
  } | null>(null);

  // Keyword inline edit state
  const [editingKeywordField, setEditingKeywordField] = useState<{
    id: number;
    field: "status" | "bid";
  } | null>(null);
  const [editedKeywordValue, setEditedKeywordValue] = useState<string>("");
  const [pendingKeywordChange, setPendingKeywordChange] = useState<{
    id: number;
    field: "status" | "bid";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [keywordEditLoading, setKeywordEditLoading] = useState<Set<number>>(
    new Set()
  );

  // Target inline edit state
  const [editingTargetField, setEditingTargetField] = useState<{
    id: number;
    field: "status" | "bid";
  } | null>(null);
  const [editedTargetValue, setEditedTargetValue] = useState<string>("");
  const [pendingTargetChange, setPendingTargetChange] = useState<{
    id: number;
    field: "status" | "bid";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [targetEditLoading, setTargetEditLoading] = useState<Set<number>>(
    new Set()
  );
  const [showTargetsConfirmationModal, setShowTargetsConfirmationModal] =
    useState(false);

  // Negative keyword inline edit state
  const [editingNegativeKeywordField, setEditingNegativeKeywordField] =
    useState<{
      id: number;
      field: "status";
    } | null>(null);
  const [editedNegativeKeywordValue, setEditedNegativeKeywordValue] =
    useState<string>("");
  const [pendingNegativeKeywordChange, setPendingNegativeKeywordChange] =
    useState<{
      id: number;
      field: "status";
      newValue: string;
      oldValue: string;
    } | null>(null);
  const [negativeKeywordEditLoading, setNegativeKeywordEditLoading] = useState<
    Set<number>
  >(new Set());
  const [
    showNegativeKeywordsConfirmationModal,
    setShowNegativeKeywordsConfirmationModal,
  ] = useState(false);

  // Negative target inline edit state
  const [editingNegativeTargetField, setEditingNegativeTargetField] = useState<{
    id: number;
    field: "status";
  } | null>(null);
  const [editedNegativeTargetValue, setEditedNegativeTargetValue] =
    useState<string>("");
  const [negativeTargetEditLoading, setNegativeTargetEditLoading] = useState<
    Set<number>
  >(new Set());
  const [pendingNegativeTargetChange, setPendingNegativeTargetChange] =
    useState<{
      id: number;
      field: "status";
      newValue: string;
      oldValue: string;
    } | null>(null);
  const [
    showNegativeTargetsConfirmationModal,
    setShowNegativeTargetsConfirmationModal,
  ] = useState(false);

  // Negative target creation state
  const [isCreateNegativeTargetPanelOpen, setIsCreateNegativeTargetPanelOpen] =
    useState(false);
  const [createNegativeTargetLoading, setCreateNegativeTargetLoading] =
    useState(false);
  const [createNegativeTargetError, setCreateNegativeTargetError] = useState<
    string | null
  >(null);
  const [createNegativeTargetFieldErrors, setCreateNegativeTargetFieldErrors] =
    useState<Record<string, string>>({});
  const [createdNegativeTargets, setCreatedNegativeTargets] = useState<any[]>(
    []
  );
  const [failedNegativeTargetCount, setFailedNegativeTargetCount] = useState(0);
  const [failedNegativeTargets, setFailedNegativeTargets] = useState<any[]>([]);

  // Negative keyword bulk edit state
  const [showNegativeKeywordsBulkActions, setShowNegativeKeywordsBulkActions] =
    useState(false);
  const [
    pendingNegativeKeywordsStatusAction,
    setPendingNegativeKeywordsStatusAction,
  ] = useState<"enable" | "pause" | null>(null);
  const [negativeKeywordsBulkLoading, setNegativeKeywordsBulkLoading] =
    useState(false);
  const [
    showNegativeKeywordsDeleteConfirmation,
    setShowNegativeKeywordsDeleteConfirmation,
  ] = useState(false);
  const [negativeKeywordsDeleteLoading, setNegativeKeywordsDeleteLoading] =
    useState(false);
  const negativeKeywordsBulkActionsRef = useRef<HTMLDivElement>(null);

  // Filter tabs based on campaign type - SD campaigns don't have keywords
  const allTabs = [
    "Overview",
    "Ad Groups",
    "Ads Collection",
    "Keywords",
    "Targets",
    "Product Ads",
    "Negative Keywords",
    "Negative Targets",
    "Assets",
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
    let filteredTabs = [...allTabs];

    if (campaignType === "SD") {
      filteredTabs = filteredTabs.filter((tab) => tab !== "Keywords");
    }

    // Show Ads Collection only for SB campaigns, Product Ads only for SP campaigns
    // Show Assets only for SB campaigns
    if (campaignType === "SB") {
      filteredTabs = filteredTabs.filter((tab) => tab !== "Product Ads");
    } else if (campaignType === "SP") {
      filteredTabs = filteredTabs.filter(
        (tab) => tab !== "Ads Collection" && tab !== "Assets"
      );
    } else {
      // SD campaigns - hide Ads Collection, Product Ads, and Assets
      filteredTabs = filteredTabs.filter(
        (tab) =>
          tab !== "Product Ads" && tab !== "Ads Collection" && tab !== "Assets"
      );
    }

    // For AUTO campaigns, hide Keywords tab completely (as per user requirement)
    // But show Negative Keywords and Negative Targets before Logs
    if (campaignType === "SP" && isAutoCampaign) {
      filteredTabs = filteredTabs.filter((tab) => tab !== "Keywords");
      // Ensure Negative Keywords and Negative Targets appear before Logs
      // They should only show for auto campaigns
      const logsIndex = filteredTabs.indexOf("Logs");
      if (logsIndex !== -1) {
        // Insert Negative Keywords and Negative Targets before Logs if not already present
        if (!filteredTabs.includes("Negative Keywords")) {
          filteredTabs.splice(logsIndex, 0, "Negative Keywords");
        }
        if (!filteredTabs.includes("Negative Targets")) {
          filteredTabs.splice(
            filteredTabs.indexOf("Negative Keywords") + 1,
            0,
            "Negative Targets"
          );
        }
      }
    } else if (campaignType === "SB") {
      // For SB campaigns, show Negative Keywords and Negative Targets tabs
      // Insert Negative Keywords right after Keywords if not already present
      const keywordsIndex = filteredTabs.indexOf("Keywords");
      if (keywordsIndex !== -1 && !filteredTabs.includes("Negative Keywords")) {
        filteredTabs.splice(keywordsIndex + 1, 0, "Negative Keywords");
      }
      // Insert Negative Targets right after Negative Keywords if not already present
      const negativeKeywordsIndex = filteredTabs.indexOf("Negative Keywords");
      if (negativeKeywordsIndex !== -1 && !filteredTabs.includes("Negative Targets")) {
        filteredTabs.splice(negativeKeywordsIndex + 1, 0, "Negative Targets");
      }
    } else {
      // For non-auto SP campaigns and other types, hide Negative Keywords and Negative Targets
      filteredTabs = filteredTabs.filter(
        (tab) => tab !== "Negative Keywords" && tab !== "Negative Targets"
      );
    }

    return filteredTabs;
  }, [campaignType, isAutoCampaign]);

  // Read tab from query parameter on mount (one-directional: URL → tab, not tab → URL)
  // Use a ref to track if we've read the query param for this campaign
  const hasReadTabParam = useRef<string | null>(null);
  useEffect(() => {
    // Reset ref when campaign changes
    const campaignKey = `${accountId}-${campaignId}`;
    if (hasReadTabParam.current !== campaignKey) {
      hasReadTabParam.current = null; // Reset to allow reading for new campaign
    }

    // Only read query parameter once per campaign
    if (hasReadTabParam.current === campaignKey) return;

    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.length > 0) {
      // Map query parameter to tab name (e.g., "keywords" -> "Keywords")
      const tabNameMap: Record<string, string> = {
        overview: "Overview",
        "ad-groups": "Ad Groups",
        keywords: "Keywords",
        "product-ads": "Product Ads",
        "ads-collection": "Ads Collection",
        targets: "Targets",
        "negative-keywords": "Negative Keywords",
        "negative-targets": "Negative Targets",
        assets: "Assets",
        logs: "Logs",
      };

      // Also support direct tab names (case-insensitive)
      const normalizedParam = tabParam.toLowerCase();
      const mappedTab =
        tabNameMap[normalizedParam] ||
        tabParam.charAt(0).toUpperCase() + tabParam.slice(1); // Capitalize first letter

      // Only set tab if it exists in the available tabs list
      if (tabs.includes(mappedTab)) {
        setActiveTab(mappedTab);
      }
      hasReadTabParam.current = campaignKey;
    } else if (!tabParam) {
      // If no tab param, mark as read to avoid re-checking
      hasReadTabParam.current = campaignKey;
    }
  }, [accountId, campaignId, searchParams, tabs]); // Run when campaign changes, tabs are computed, or searchParams change

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

  // Memoize filter string to prevent unnecessary re-renders
  // Use a deep comparison by sorting and stringifying to ensure stable comparison
  const adgroupsFiltersString = useMemo(() => {
    const sorted = [...adgroupsFilters].sort((a, b) => {
      if (a.field !== b.field) return a.field.localeCompare(b.field);
      const aOp = a.operator || "";
      const bOp = b.operator || "";
      if (aOp !== bOp) return aOp.localeCompare(bOp);
      return String(a.value).localeCompare(String(b.value));
    });
    return JSON.stringify(sorted);
  }, [adgroupsFilters]);

  // Memoize date strings to prevent unnecessary re-renders
  const startDateStr = useMemo(
    () => startDate.toISOString().split("T")[0],
    [startDate]
  );
  const endDateStr = useMemo(
    () => endDate.toISOString().split("T")[0],
    [endDate]
  );

  // Reset pagination when date range or tab changes (but NOT filters - that's handled in onApply)
  useEffect(() => {
    if (activeTab === "Ad Groups") {
      setAdgroupsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate]);

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

  useEffect(() => {
    if (activeTab === "Ads Collection") {
      setSbAdsCurrentPage(1);
    }
  }, [activeTab, startDate, endDate, sbAdsFilters]);

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

  const buildNegativeKeywordsFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    // Add filters to params
    filterList.forEach((filter) => {
      if (filter.field === "keywordText") {
        if (filter.operator === "contains") {
          params.keywordText__icontains = filter.value;
        } else if (filter.operator === "not_contains") {
          params.keywordText__not_icontains = filter.value;
        } else if (filter.operator === "equals") {
          params.keywordText = filter.value;
        }
      } else if (filter.field === "state") {
        // State values are already uppercase (PAUSED, ENABLED) from FilterPanel with useUppercaseState=true
        // But ensure uppercase for any edge cases
        params.state = String(filter.value).toUpperCase();
      }
    });
    return params;
  };

  const buildNegativeTargetsFilterParams = (filterList: FilterValues) => {
    const params: any = {};

    // Add filters to params
    filterList.forEach((filter) => {
      if (filter.field === "expression") {
        // For expression, the operator contains the expression type (ASIN_BRAND_SAME_AS or ASIN_SAME_AS)
        // and the value contains the ASIN
        // We need to search for expressions that contain this type and value
        // The backend expects expression__icontains to search in the JSON expression array
        const expressionType = filter.operator || "ASIN_SAME_AS";
        const asinValue = String(filter.value).trim();

        // Build a search pattern that matches the expression structure
        // The expression is stored as JSON: [{"type":"ASIN_SAME_AS","value":"B08N5WRWNW"}]
        // We'll search for the ASIN value in the expression
        if (asinValue) {
          params.expression__icontains = asinValue;
        }
        // Optionally, we could also filter by type, but the backend might need to support that
        // For now, we'll just search by ASIN value
      } else if (filter.field === "state") {
        // State values are already uppercase (PAUSED, ENABLED) from FilterPanel with useUppercaseState=true
        // But ensure uppercase for any edge cases
        params.state = String(filter.value).toUpperCase();
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
    // Cancel any pending request when dependencies change
    if (adgroupsAbortControllerRef.current) {
      adgroupsAbortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    adgroupsAbortControllerRef.current = new AbortController();
    const currentController = adgroupsAbortControllerRef.current;

    // Generate a unique request ID based on all dependencies to prevent duplicate requests
    const requestId = JSON.stringify({
      accountId,
      campaignId,
      activeTab,
      startDate: startDateStr,
      endDate: endDateStr,
      adgroupsCurrentPage,
      adgroupsSortBy,
      adgroupsSortOrder,
      adgroupsFilters: adgroupsFiltersString,
      campaignType, // Include campaignType in request ID
    });

    // Skip if this is the same request as the last one (prevents React StrictMode double calls and infinite loops)
    if (adgroupsRequestIdRef.current === requestId) {
      return;
    }

    adgroupsRequestIdRef.current = requestId;

    if (accountId && campaignId && activeTab === "Ad Groups") {
      // Prevent multiple simultaneous calls
      if (adgroupsLoadingRef.current) {
        return;
      }
      loadAdGroups();
    }

    // Cleanup function to cancel request if component unmounts or dependencies change
    return () => {
      if (currentController) {
        currentController.abort();
      }
      // Don't reset loadingRef here - it will be reset in loadAdGroups finally block
      // Resetting it here can cause race conditions
    };
  }, [
    accountId,
    campaignId,
    activeTab,
    startDateStr, // Use memoized date string instead of Date object
    endDateStr, // Use memoized date string instead of Date object
    adgroupsCurrentPage,
    adgroupsSortBy,
    adgroupsSortOrder,
    adgroupsFiltersString, // Use memoized string to ensure stable reference comparison
    campaignType, // Add campaignType since it's used in loadAdGroups
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

  // Load assets when Assets tab is active (only for SB campaigns)
  useEffect(() => {
    if (accountId && activeTab === "Assets" && campaignType === "SB") {
      loadAssets();
    }
  }, [
    accountId,
    activeTab,
    campaignType,
    assetsCurrentPage,
    assetsSortBy,
    assetsSortOrder,
    assetsFilters,
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

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Ads Collection") {
      loadSBAds();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    startDate,
    endDate,
    sbAdsCurrentPage,
    sbAdsSortBy,
    sbAdsSortOrder,
    sbAdsFilters,
  ]);

  // Load negative keywords for auto campaigns and SB campaigns
  useEffect(() => {
    if (
      accountId &&
      campaignId &&
      activeTab === "Negative Keywords" &&
      campaignType &&
      ((campaignType === "SP" && isAutoCampaign) || campaignType === "SB")
    ) {
      loadNegativeKeywords();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    negativeKeywordsCurrentPage,
    negativeKeywordsSortBy,
    negativeKeywordsSortOrder,
    isAutoCampaign,
    campaignType,
    negativeKeywordsFilters,
  ]);

  // Load negative targets for auto campaigns and SB campaigns
  useEffect(() => {
    if (
      accountId &&
      campaignId &&
      activeTab === "Negative Targets" &&
      campaignType &&
      ((campaignType === "SP" && isAutoCampaign) || campaignType === "SB")
    ) {
      loadNegativeTargets();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    negativeTargetsCurrentPage,
    negativeTargetsSortBy,
    negativeTargetsSortOrder,
    isAutoCampaign,
    campaignType,
  ]);

  // Load negative targets for auto campaigns and SB campaigns (with filters)
  useEffect(() => {
    if (
      accountId &&
      campaignId &&
      activeTab === "Negative Targets" &&
      campaignType &&
      ((campaignType === "SP" && isAutoCampaign) || campaignType === "SB")
    ) {
      loadNegativeTargets();
    }
  }, [
    accountId,
    campaignId,
    activeTab,
    negativeTargetsCurrentPage,
    negativeTargetsSortBy,
    negativeTargetsSortOrder,
    isAutoCampaign,
    campaignType,
    negativeTargetsFilters,
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
    // Prevent multiple simultaneous calls
    if (adgroupsLoadingRef.current) {
      return;
    }

    try {
      adgroupsLoadingRef.current = true;
      setAdgroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdgroupsLoading(false);
        adgroupsLoadingRef.current = false;
        return;
      }

      // Check if request was aborted
      if (adgroupsAbortControllerRef.current?.signal.aborted) {
        return;
      }

      // campaignId is now the Amazon campaignId (string), pass it directly
      const data = await campaignsService.getAdGroups(
        accountIdNum,
        campaignId,
        startDateStr,
        endDateStr,
        {
          page: adgroupsCurrentPage,
          page_size: 10,
          sort_by: adgroupsSortBy,
          order: adgroupsSortOrder,
          type: campaignType || undefined, // Pass campaign type to API
          ...buildAdGroupsFilterParams(adgroupsFilters),
        }
      );

      // Check if request was aborted before updating state
      if (adgroupsAbortControllerRef.current?.signal.aborted) {
        return;
      }

      setAdgroups(data.adgroups);
      setAdgroupsTotalPages(data.total_pages || 0);
    } catch (error) {
      // Don't log aborted requests as errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to load ad groups:", error);
      // Only update state if request wasn't aborted
      if (!adgroupsAbortControllerRef.current?.signal.aborted) {
        setAdgroups([]);
        setAdgroupsTotalPages(0);
      }
    } finally {
      setAdgroupsLoading(false);
      adgroupsLoadingRef.current = false;
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
        adgroups: adgroups.map((ag) => {
          const adgroupData: any = {
            name: ag.name,
            state: ag.state,
          };
          // Only include defaultBid for SP campaigns (not SB)
          if (campaignType !== "SB" && ag.defaultBid !== undefined) {
            adgroupData.defaultBid = ag.defaultBid;
          }
          return adgroupData;
        }),
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
    if (!accountId || !campaignId || (campaignType !== "SP" && campaignType !== "SB")) return;

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

      // Format targets based on campaign type
      const formattedTargets = targets.map((tgt) => {
        if (campaignType === "SB") {
          // SB: use expressions (plural), no expressionType, no state at creation
          return {
            adGroupId: tgt.adGroupId,
            campaignId: campaignId,
            bid: tgt.bid,
            expressions: [
              {
                type: tgt.expressionType,
                value: tgt.expressionValue,
              },
            ],
          };
        } else {
          // SP: use expression (singular), include expressionType and state
          return {
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
          };
        }
      });

      const response = await campaignsService.createTargets(
        accountIdNum,
        campaignId,
        {
          targets: formattedTargets,
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
      let failedTargetsData: any[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Check for field errors first
        if (errorData.field_errors) {
          fieldErrors = errorData.field_errors;
        }
        
        // Check for errors array (plural) - this contains the actual error messages
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          // Use the first error message from the array
          errorMessage = errorData.errors[0];
        } else if (errorData.error) {
          // Fallback to error (singular) if errors array is not present
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // Extract failed targets if available
        if (errorData.failed_targets && Array.isArray(errorData.failed_targets)) {
          failedTargetsData = errorData.failed_targets;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setCreateTargetError(errorMessage);
      setCreateTargetFieldErrors(fieldErrors);
      setFailedTargetCount(targets.length); // All failed
      setFailedTargets(failedTargetsData); // Use failed targets from response if available
      // Don't close panel on error - let user fix and resubmit
    } finally {
      setCreateTargetLoading(false);
    }
  };

  const handleCreateNegativeKeywords = async (
    negativeKeywords: NegativeKeywordInput[]
  ) => {
    if (
      !accountId ||
      !campaignId ||
      (campaignType !== "SP" && campaignType !== "SB")
    )
      return;

    setCreateNegativeKeywordLoading(true);
    setCreateNegativeKeywordError(null);
    setCreateNegativeKeywordFieldErrors({});
    setCreatedNegativeKeywords([]);
    setFailedNegativeKeywordCount(0);
    setFailedNegativeKeywords([]);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.createNegativeKeywords(
        accountIdNum,
        campaignId,
        {
          negativeKeywords: negativeKeywords.map((nkw) => ({
            adGroupId: nkw.adGroupId,
            keywordText: nkw.keywordText,
            matchType: nkw.matchType,
            nativeLanguageKeyword: nkw.nativeLanguageKeyword,
            nativeLanguageLocale: nkw.nativeLanguageLocale,
            state: nkw.state,
          })),
        }
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;
      const failedNegativeKeywordsData =
        response.failed_negative_keywords || [];

      setCreatedNegativeKeywords(response.negative_keywords || []);
      setFailedNegativeKeywordCount(failed);
      setFailedNegativeKeywords(failedNegativeKeywordsData);

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateNegativeKeywordPanelOpen(false);
        setCreateNegativeKeywordError(null);
        setCreateNegativeKeywordFieldErrors({});
        setCreatedNegativeKeywords([]);
        setFailedNegativeKeywordCount(0);
        setFailedNegativeKeywords([]);
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} negative keyword(s) created successfully!`,
          isSuccess: true,
        });

        // Reload negative keywords to show the new ones
        await loadNegativeKeywords();
      } else {
        // Partial success or all failed - show summary and keep panel open
        // Don't close panel - let user fix errors and resubmit
        const successMessage =
          created > 0
            ? `${created} negative keyword(s) created successfully. ${failed} negative keyword(s) failed.`
            : `All ${failed} negative keyword(s) failed to create.`;

        setCreateNegativeKeywordError(successMessage);
        // Field errors will be set below if available

        // Show summary popup for partial success
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} negative keyword(s) created successfully. ${failed} negative keyword(s) failed.`,
            isSuccess: false,
          });
        }

        // Reload negative keywords even on partial success to show newly created ones
        if (created > 0) {
          await loadNegativeKeywords();
        }
      }

      // Extract field errors if available
      if (response.field_errors) {
        setCreateNegativeKeywordFieldErrors(response.field_errors);
      }

      if (response.errors && response.errors.length > 0) {
        // Set general error if no field-specific errors
        if (
          !response.field_errors ||
          Object.keys(response.field_errors).length === 0
        ) {
          setCreateNegativeKeywordError(
            response.errors[0] || "Failed to create some negative keywords."
          );
        }
      }
    } catch (error: any) {
      console.error("Failed to create negative keywords:", error);

      // Extract error message and field errors
      let errorMessage =
        "Failed to create negative keywords. Please try again.";
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

      setCreateNegativeKeywordError(errorMessage);
      setCreateNegativeKeywordFieldErrors(fieldErrors);
      setFailedNegativeKeywordCount(negativeKeywords.length); // All failed
      setFailedNegativeKeywords([]); // No specific failed negative keywords data in error case
      // Don't close panel on error - let user fix and resubmit
    } finally {
      setCreateNegativeKeywordLoading(false);
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
      const ids = adgroups
        .map((ag) => ag.adGroupId || ag.id)
        .filter((id): id is string | number => id !== undefined && id !== null);
      setSelectedAdGroupIds(new Set(ids));
    } else {
      setSelectedAdGroupIds(new Set());
    }
  };

  const handleSelectAdGroup = (id: string | number, checked: boolean) => {
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

  const loadSBAds = async () => {
    try {
      setSbAdsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setSbAdsLoading(false);
        return;
      }

      // Use the same endpoint as product ads but with campaign type SB
      const data = await campaignsService.getProductAds(
        accountIdNum,
        campaignId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        {
          page: sbAdsCurrentPage,
          page_size: 10,
          sort_by: sbAdsSortBy,
          order: sbAdsSortOrder,
          type: "SB", // Force SB type for SB ads
          ...buildProductAdsFilterParams(sbAdsFilters),
        }
      );

      setSbAds(data.productads as SBAd[]);
      setSbAdsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load SB ads:", error);
      setSbAds([]);
      setSbAdsTotalPages(0);
    } finally {
      setSbAdsLoading(false);
    }
  };

  const handleSelectAllSBAds = (checked: boolean) => {
    if (checked) {
      setSelectedSBAdIds(new Set(sbAds.map((ad) => ad.id)));
    } else {
      setSelectedSBAdIds(new Set());
    }
  };

  const handleSelectSBAd = (id: number, checked: boolean) => {
    setSelectedSBAdIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSBAdsSort = (column: string) => {
    if (sbAdsSortBy === column) {
      setSbAdsSortOrder(sbAdsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setSbAdsSortBy(column);
      setSbAdsSortOrder("asc");
    }
    setSbAdsCurrentPage(1);
  };

  const handleSBAdsPageChange = (page: number) => {
    setSbAdsCurrentPage(page);
  };

  const loadAssets = async () => {
    try {
      setAssetsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum)) {
        setAssetsLoading(false);
        return;
      }

      const data = await campaignsService.getAssets(accountIdNum, {
        page: assetsCurrentPage,
        page_size: 10,
        sort_by: assetsSortBy,
        order: assetsSortOrder,
        ...buildAssetsFilterParams(assetsFilters),
      });

      setAssets(data.assets || []);
      setAssetsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load assets:", error);
      setAssets([]);
      setAssetsTotalPages(0);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleSelectAllAssets = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(new Set(assets.map((asset) => asset.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

  const handleSelectAsset = (id: number, checked: boolean) => {
    setSelectedAssetIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleAssetsSort = (column: string) => {
    if (assetsSortBy === column) {
      setAssetsSortOrder(assetsSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAssetsSortBy(column);
      setAssetsSortOrder("asc");
    }
    setAssetsCurrentPage(1);
  };

  const handleAssetsPageChange = (page: number) => {
    setAssetsCurrentPage(page);
  };

  const handleCreateAsset = async (asset: AssetInput) => {
    if (!accountId) return;

    setCreateAssetLoading(true);
    setCreateAssetError(null);
    setCreateAssetFieldErrors({});

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const formData = new FormData();
      
      // Required fields
      formData.append("assetName", asset.assetName);
      formData.append("assetType", asset.assetType);
      // For arrays, use repeated keys without brackets - Django QueryDict handles this
      asset.assetSubTypeList.forEach((subType) => {
        formData.append("assetSubTypeList", subType);
      });
      formData.append("brandEntityId", asset.brandEntityId);
      
      // Optional fields - only append if provided
      if (asset.asinList && asset.asinList.length > 0) {
        asset.asinList.forEach((asin) => {
          formData.append("asinList", asin);
        });
      }
      
      if (asset.tags && asset.tags.length > 0) {
        asset.tags.forEach((tag) => {
          formData.append("tags", tag);
        });
      }
      
      if (asset.versionInfo) {
        formData.append("versionInfo[linkedAssetId]", asset.versionInfo.linkedAssetId);
        if (asset.versionInfo.versionNotes) {
          formData.append("versionInfo[versionNotes]", asset.versionInfo.versionNotes);
        }
      }
      
      if (asset.registrationContext) {
        formData.append(
          "registrationContext[associatedPrograms][0][programName]",
          asset.registrationContext.associatedPrograms[0]?.programName || "A_PLUS"
        );
        if (asset.registrationContext.associatedPrograms[0]?.metadata?.dspAdvertiserId) {
          formData.append(
            "registrationContext[associatedPrograms][0][metadata][dspAdvertiserId]",
            asset.registrationContext.associatedPrograms[0].metadata.dspAdvertiserId
          );
        }
      }
      
      if (asset.skipAssetSubTypesDetection !== undefined) {
        formData.append("skipAssetSubTypesDetection", asset.skipAssetSubTypesDetection.toString());
      }
      
      if (asset.url) {
        formData.append("url", asset.url);
      }

      if (asset.file) {
        formData.append("file", asset.file);
      }

      // Backward compatibility - include mediaType if provided
      if (asset.mediaType) {
        formData.append("mediaType", asset.mediaType);
      }

      const response = await campaignsService.createAsset(
        accountIdNum,
        formData
      );

      setIsCreateAssetPanelOpen(false);

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: "Asset uploaded successfully!",
        isSuccess: true,
      });

      // Reload assets to show the new one
      await loadAssets();
    } catch (error: any) {
      console.error("Failed to create asset:", error);

      let errorMessage = "Failed to upload asset. Please try again.";

      if (error?.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(", ");
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setCreateAssetError(errorMessage);

      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateAssetLoading(false);
    }
  };

  const buildAssetsFilterParams = (filterList: FilterValues) => {
    const params: any = {};
    filterList.forEach((filter) => {
      const field = filter.field as string;
      if (field === "mediaType") {
        params.mediaType = filter.value;
      } else if (field === "brandEntityId") {
        params.brandEntityId = filter.value;
      }
    });
    return params;
  };

  const handleCreateSBAds = async (ads: SBAdInput[]) => {
    if (!accountId || !campaignId) return;

    setCreateSBAdLoading(true);
    setCreateSBAdError(null);
    setCreateSBAdFieldErrors({});

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.createSBAds(
        accountIdNum,
        campaignId,
        { ads }
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateSBAdPanelOpen(false);

        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} ad(s) created successfully!`,
          isSuccess: true,
        });

        // Reload SB ads to show the new ones
        await loadSBAds();
      } else {
        // Partial success or all failed - show summary and keep panel open
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} ad(s) created successfully. ${failed} ad(s) failed.`,
            isSuccess: false,
          });
        }

        // Reload SB ads even on partial success to show newly created ones
        if (created > 0) {
          await loadSBAds();
        }
      }

      // Set response data for display in panel
      setCreatedSBAds(response.ads || []);
      setFailedSBAdCount(failed);
      setFailedSBAds(response.failed_ads || []);

      // Handle field errors
      if (response.field_errors) {
        setCreateSBAdFieldErrors(response.field_errors);
      }
    } catch (error: any) {
      console.error("Failed to create SB ads:", error);

      // Extract error message
      let errorMessage = "Failed to create ads. Please try again.";

      if (error?.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(", ");
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setCreateSBAdError(errorMessage);

      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage,
        isSuccess: false,
      });
    } finally {
      setCreateSBAdLoading(false);
    }
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

  const handleSelectAllNegativeTargets = (checked: boolean) => {
    if (checked) {
      setSelectedNegativeTargetIds(
        new Set(negativeTargets.map((ntg) => ntg.id))
      );
    } else {
      setSelectedNegativeTargetIds(new Set());
    }
  };

  const handleSelectNegativeTarget = (id: number, checked: boolean) => {
    setSelectedNegativeTargetIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // Negative target bulk action handlers
  const handleBulkNegativeTargetsStatus = async (
    statusValue: "enable" | "pause"
  ) => {
    if (!accountId || selectedNegativeTargetIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setNegativeTargetsBulkLoading(true);
      const selectedNegativeTargetIdsArray = Array.from(
        selectedNegativeTargetIds
      ).map((id) => {
        const negativeTarget = negativeTargets.find((ntg) => ntg.id === id);
        return negativeTarget?.targetId
          ? String(negativeTarget.targetId)
          : String(id);
      });

      await campaignsService.bulkUpdateNegativeTargets(accountIdNum, {
        targetIds: selectedNegativeTargetIdsArray,
        action: "status",
        status: statusValue,
      });

      await loadNegativeTargets();
      setSelectedNegativeTargetIds(new Set());
      setShowNegativeTargetsConfirmationModal(false);
      setPendingNegativeTargetsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update negative targets", error);
      setShowNegativeTargetsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update negative targets. Please try again.",
      });
    } finally {
      setNegativeTargetsBulkLoading(false);
    }
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

  const loadNegativeKeywords = async () => {
    try {
      setNegativeKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId || !campaignType) {
        setNegativeKeywordsLoading(false);
        return;
      }

      const data = await campaignsService.getNegativeKeywords(
        accountIdNum,
        campaignId,
        {
          page: negativeKeywordsCurrentPage,
          page_size: 10,
          sort_by: negativeKeywordsSortBy,
          order: negativeKeywordsSortOrder,
          type: campaignType,
          ...buildNegativeKeywordsFilterParams(negativeKeywordsFilters),
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

  const loadNegativeTargets = async () => {
    try {
      setNegativeTargetsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId || !campaignType) {
        setNegativeTargetsLoading(false);
        return;
      }

      const data = await campaignsService.getNegativeTargets(
        accountIdNum,
        campaignId,
        {
          page: negativeTargetsCurrentPage,
          page_size: 10,
          sort_by: negativeTargetsSortBy,
          order: negativeTargetsSortOrder,
          type: campaignType,
          ...buildNegativeTargetsFilterParams(negativeTargetsFilters),
        }
      );

      setNegativeTargets(data.negative_targets || []);
      setNegativeTargetsTotalPages(data.total_pages || 0);
    } catch (error) {
      console.error("Failed to load negative targets:", error);
      setNegativeTargets([]);
      setNegativeTargetsTotalPages(0);
    } finally {
      setNegativeTargetsLoading(false);
    }
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

  const handleNegativeKeywordsPageChange = (page: number) => {
    setNegativeKeywordsCurrentPage(page);
  };

  const handleNegativeTargetsSort = (column: string) => {
    if (negativeTargetsSortBy === column) {
      setNegativeTargetsSortOrder(
        negativeTargetsSortOrder === "asc" ? "desc" : "asc"
      );
    } else {
      setNegativeTargetsSortBy(column);
      setNegativeTargetsSortOrder("asc");
    }
    setNegativeTargetsCurrentPage(1);
  };

  const handleNegativeTargetsPageChange = (page: number) => {
    setNegativeTargetsCurrentPage(page);
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
    field: "status" | "default_bid" | "name",
    currentValue: string
  ) => {
    setEditingAdGroupField({ id, field });
    setEditedAdGroupValue(currentValue);
    setPendingAdGroupChange(null);
  };

  const handleAdGroupEditChange = (value: string) => {
    setEditedAdGroupValue(value);
  };

  const handleAdGroupEditEnd = (newValue?: string) => {
    if (!editingAdGroupField) return;
    const adgroup = adgroups.find((ag) => ag.id === editingAdGroupField.id);
    if (!adgroup) {
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    // This handles the case where onEditEnd is called immediately after onChange
    // before React state has updated
    const valueToCompare =
      newValue !== undefined ? newValue : editedAdGroupValue;

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
      hasChanged = valueToCompare !== currentStatus;
    } else if (editingAdGroupField.field === "default_bid") {
      const currentBid = adgroup.default_bid
        ? adgroup.default_bid.replace(/[^0-9.]/g, "")
        : "0";
      oldValue = adgroup.default_bid || "$0.00";
      // if (
      //   Number(currentBid) > campaignDetail?.campaign?.budget ||
      //   currentBid < 0
      // ) {
      //   setErrorModal({
      //     isOpen: true,
      //     message: `Bid value is out of range. Please enter a value between 0 and the campaign budget. ${campaignDetail?.campaign?.budget}`,
      //   });
      //   return;
      // }
      hasChanged = valueToCompare !== currentBid && valueToCompare !== "";
    } else if (editingAdGroupField.field === "name") {
      oldValue = adgroup.name || "";
      hasChanged =
        valueToCompare.trim() !== oldValue.trim() &&
        valueToCompare.trim() !== "";
    }

    if (hasChanged) {
      setPendingAdGroupChange({
        id: editingAdGroupField.id,
        field: editingAdGroupField.field,
        newValue: valueToCompare,
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
        // Map status values to uppercase
        const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
          enabled: "ENABLED",
          paused: "PAUSED",
          enable: "ENABLED",
          pause: "PAUSED",
        };
        const statusValue =
          statusMap[pendingAdGroupChange.newValue.toLowerCase()] || "ENABLED";

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
      } else if (pendingAdGroupChange.field === "name") {
        await campaignsService.bulkUpdateAdGroups(accountIdNum, {
          adgroupIds: [adgroup.adGroupId],
          action: "name",
          name: pendingAdGroupChange.newValue.trim(),
        });
      }

      // Reload ad groups
      await loadAdGroups();
      setPendingAdGroupChange(null);
      setEditingAdGroupField(null);
      setEditedAdGroupValue("");
    } catch (error: any) {
      console.error("Error updating ad group:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update ad group. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
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

  const handleAdGroupEditCancel = () => {
    setEditingAdGroupField(null);
    setEditedAdGroupValue("");
    setPendingAdGroupChange(null);
  };

  // Keyword inline edit handlers
  const handleKeywordEditStart = (
    id: number,
    field: "status" | "bid",
    currentValue: string
  ) => {
    setEditingKeywordField({ id, field });
    setEditedKeywordValue(currentValue);
    setPendingKeywordChange(null);
  };

  const handleKeywordEditChange = (value: string) => {
    setEditedKeywordValue(value);
  };

  const handleKeywordEditEnd = (newValue?: string) => {
    if (!editingKeywordField) return;
    const keyword = keywords.find((kw) => kw.id === editingKeywordField.id);
    if (!keyword) {
      setEditingKeywordField(null);
      setEditedKeywordValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare =
      newValue !== undefined ? newValue : editedKeywordValue;

    let hasChanged = false;
    let oldValue = "";

    if (editingKeywordField.field === "status") {
      const statusLower = keyword.status?.toLowerCase() || "enabled";
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : "paused";
      oldValue = currentStatus;
      hasChanged = valueToCompare !== currentStatus;
    } else if (editingKeywordField.field === "bid") {
      const currentBid = keyword.bid
        ? keyword.bid.replace(/[^0-9.]/g, "")
        : "0";
      oldValue = keyword.bid || "$0.00";
      hasChanged = valueToCompare !== currentBid && valueToCompare !== "";
    }

    if (hasChanged) {
      setPendingKeywordChange({
        id: editingKeywordField.id,
        field: editingKeywordField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setShowKeywordsConfirmationModal(true);
      setEditingKeywordField(null);
    } else {
      setEditingKeywordField(null);
      setEditedKeywordValue("");
    }
  };

  const confirmKeywordChange = async () => {
    if (!pendingKeywordChange || !accountId) return;

    const keyword = keywords.find((kw) => kw.id === pendingKeywordChange.id);
    if (!keyword || !keyword.keywordId) {
      alert("Keyword ID not found");
      setPendingKeywordChange(null);
      return;
    }

    setKeywordEditLoading((prev) => new Set(prev).add(pendingKeywordChange.id));
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (pendingKeywordChange.field === "status") {
        const newValueLower = pendingKeywordChange.newValue.toLowerCase();

        // Handle archive separately (uses DELETE endpoint)
        if (newValueLower === "archive") {
          await campaignsService.bulkUpdateKeywords(accountIdNum, {
            keywordIds: [keyword.keywordId],
            action: "archive",
          });
        } else {
          // Map status values for enable/pause
          const statusMap: Record<string, "enable" | "pause"> = {
            enabled: "enable",
            paused: "pause",
          };
          const statusValue = statusMap[newValueLower] || "enable";

          await campaignsService.bulkUpdateKeywords(accountIdNum, {
            keywordIds: [keyword.keywordId],
            action: "status",
            status: statusValue,
          });
        }
      } else if (pendingKeywordChange.field === "bid") {
        // Extract numeric value
        const bidValue = parseFloat(pendingKeywordChange.newValue);
        if (isNaN(bidValue)) {
          throw new Error("Invalid bid value");
        }

        await campaignsService.bulkUpdateKeywords(accountIdNum, {
          keywordIds: [keyword.keywordId],
          action: "bid",
          bid: bidValue,
        });
      }

      // Reload keywords
      await loadKeywords();
      setPendingKeywordChange(null);
      setEditingKeywordField(null);
      setEditedKeywordValue("");
    } catch (error: any) {
      console.error("Error updating keyword:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update keyword. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowKeywordsConfirmationModal(false);
    } finally {
      setKeywordEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingKeywordChange.id);
        return newSet;
      });
    }
  };

  const cancelKeywordChange = () => {
    setPendingKeywordChange(null);
    setEditingKeywordField(null);
    setEditedKeywordValue("");
    setShowKeywordsConfirmationModal(false);
  };

  const handleKeywordEditCancel = () => {
    setEditingKeywordField(null);
    setEditedKeywordValue("");
    setPendingKeywordChange(null);
  };

  // Target inline edit handlers
  const handleTargetEditStart = (
    id: number,
    field: "status" | "bid",
    currentValue: string
  ) => {
    setEditingTargetField({ id, field });
    setEditedTargetValue(currentValue);
    setPendingTargetChange(null);
  };

  const handleTargetEditChange = (value: string) => {
    setEditedTargetValue(value);
  };

  const handleTargetEditEnd = (newValue?: string) => {
    if (!editingTargetField) return;
    const target = targets.find((tgt) => tgt.id === editingTargetField.id);
    if (!target) {
      setEditingTargetField(null);
      setEditedTargetValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare =
      newValue !== undefined ? newValue : editedTargetValue;

    let hasChanged = false;
    let oldValue = "";

    if (editingTargetField.field === "status") {
      const statusLower = target.status?.toLowerCase() || "enabled";
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : "paused";
      oldValue = currentStatus;
      hasChanged = valueToCompare !== currentStatus;
    } else if (editingTargetField.field === "bid") {
      const currentBid = target.bid ? target.bid.replace(/[^0-9.]/g, "") : "0";
      oldValue = target.bid || "$0.00";
      hasChanged = valueToCompare !== currentBid && valueToCompare !== "";
    }

    if (hasChanged) {
      setPendingTargetChange({
        id: editingTargetField.id,
        field: editingTargetField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setShowTargetsConfirmationModal(true);
      setEditingTargetField(null);
    } else {
      setEditingTargetField(null);
      setEditedTargetValue("");
    }
  };

  const confirmTargetChange = async () => {
    if (!pendingTargetChange || !accountId) {
      console.error("confirmTargetChange: Missing pendingTargetChange or accountId", {
        pendingTargetChange,
        accountId,
      });
      return;
    }

    const target = targets.find((tgt) => tgt.id === pendingTargetChange.id);
    if (!target || !target.targetId) {
      console.error("confirmTargetChange: Target not found", {
        targetId: pendingTargetChange.id,
        target,
      });
      setErrorModal({
        isOpen: true,
        message: "Target ID not found",
      });
      setPendingTargetChange(null);
      setShowTargetsConfirmationModal(false);
      return;
    }

    console.log("confirmTargetChange: Starting update", {
      targetId: target.targetId,
      field: pendingTargetChange.field,
      newValue: pendingTargetChange.newValue,
    });

    setTargetEditLoading((prev) => new Set(prev).add(pendingTargetChange.id));
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (pendingTargetChange.field === "status") {
        // Map status values
        const statusMap: Record<string, "enable" | "pause"> = {
          enabled: "enable",
          paused: "pause",
        };
        const statusValue =
          statusMap[pendingTargetChange.newValue.toLowerCase()] || "enable";

        console.log("confirmTargetChange: Updating status", {
          targetId: target.targetId,
          statusValue,
        });

        await campaignsService.bulkUpdateTargets(accountIdNum, {
          targetIds: [String(target.targetId)],
          action: "status",
          status: statusValue,
        });
      } else if (pendingTargetChange.field === "bid") {
        // Extract numeric value - clean any formatting
        const cleanedValue = pendingTargetChange.newValue.replace(/[^0-9.]/g, "");
        const bidValue = parseFloat(cleanedValue);
        if (isNaN(bidValue) || bidValue < 0) {
          throw new Error("Invalid bid value");
        }

        console.log("confirmTargetChange: Updating bid", {
          targetId: target.targetId,
          bidValue,
          originalValue: pendingTargetChange.newValue,
          cleanedValue,
        });

        await campaignsService.bulkUpdateTargets(accountIdNum, {
          targetIds: [String(target.targetId)],
          action: "bid",
          bid: bidValue,
        });
      }

      console.log("confirmTargetChange: Update successful, reloading targets");
      // Reload targets
      await loadTargets();
      setPendingTargetChange(null);
      setEditingTargetField(null);
      setEditedTargetValue("");
      setShowTargetsConfirmationModal(false);
    } catch (error: any) {
      console.error("Error updating target:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update target. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowTargetsConfirmationModal(false);
    } finally {
      setTargetEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingTargetChange.id);
        return newSet;
      });
    }
  };

  const cancelTargetChange = () => {
    setPendingTargetChange(null);
    setEditingTargetField(null);
    setEditedTargetValue("");
    setShowTargetsConfirmationModal(false);
  };

  const handleTargetEditCancel = () => {
    setEditingTargetField(null);
    setEditedTargetValue("");
    setPendingTargetChange(null);
  };

  // Negative keyword bulk action handlers
  const handleBulkNegativeKeywordsStatus = async (
    statusValue: "enable" | "pause"
  ) => {
    if (!accountId || selectedNegativeKeywordIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setNegativeKeywordsBulkLoading(true);
      const selectedNegativeKeywordIdsArray = Array.from(
        selectedNegativeKeywordIds
      ).map((id) => {
        const negativeKeyword = negativeKeywords.find((nkw) => nkw.id === id);
        return negativeKeyword?.keywordId
          ? String(negativeKeyword.keywordId)
          : String(id);
      });

      await campaignsService.bulkUpdateNegativeKeywords(accountIdNum, {
        keywordIds: selectedNegativeKeywordIdsArray,
        action: "status",
        status: statusValue,
      });

      await loadNegativeKeywords();
      setSelectedNegativeKeywordIds(new Set());
      setShowNegativeKeywordsConfirmationModal(false);
      setPendingNegativeKeywordsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update negative keywords", error);
      setShowNegativeKeywordsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update negative keywords. Please try again.",
      });
    } finally {
      setNegativeKeywordsBulkLoading(false);
    }
  };

  // Negative keyword inline edit handlers
  const handleNegativeKeywordEditStart = (
    id: number,
    field: "status",
    currentValue: string
  ) => {
    setEditingNegativeKeywordField({ id, field });
    setEditedNegativeKeywordValue(currentValue);
    setPendingNegativeKeywordChange(null);
  };

  const handleNegativeKeywordEditChange = (value: string) => {
    setEditedNegativeKeywordValue(value);
  };

  const handleNegativeKeywordEditEnd = (newValue?: string) => {
    if (!editingNegativeKeywordField) return;
    const negativeKeyword = negativeKeywords.find(
      (nkw) => nkw.id === editingNegativeKeywordField.id
    );
    if (!negativeKeyword) {
      setEditingNegativeKeywordField(null);
      setEditedNegativeKeywordValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare =
      newValue !== undefined ? newValue : editedNegativeKeywordValue;

    let hasChanged = false;
    let oldValue = "";

    if (editingNegativeKeywordField.field === "status") {
      const statusLower = negativeKeyword.status?.toLowerCase() || "enabled";
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : "paused";
      oldValue = currentStatus;
      hasChanged = valueToCompare !== currentStatus;
    }

    if (hasChanged) {
      setPendingNegativeKeywordChange({
        id: editingNegativeKeywordField.id,
        field: editingNegativeKeywordField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setShowNegativeKeywordsConfirmationModal(true);
      setEditingNegativeKeywordField(null);
    } else {
      setEditingNegativeKeywordField(null);
      setEditedNegativeKeywordValue("");
    }
  };

  const confirmNegativeKeywordChange = async () => {
    if (!pendingNegativeKeywordChange || !accountId) return;

    const negativeKeyword = negativeKeywords.find(
      (nkw) => nkw.id === pendingNegativeKeywordChange.id
    );
    if (!negativeKeyword || !negativeKeyword.keywordId) {
      alert("Negative keyword ID not found");
      setPendingNegativeKeywordChange(null);
      return;
    }

    setNegativeKeywordEditLoading((prev) =>
      new Set(prev).add(pendingNegativeKeywordChange.id)
    );
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (pendingNegativeKeywordChange.field === "status") {
        // Map status values
        const statusMap: Record<string, "enable" | "pause"> = {
          enabled: "enable",
          paused: "pause",
        };
        const statusValue =
          statusMap[pendingNegativeKeywordChange.newValue.toLowerCase()] ||
          "enable";

        await campaignsService.bulkUpdateNegativeKeywords(accountIdNum, {
          keywordIds: [negativeKeyword.keywordId],
          action: "status",
          status: statusValue,
        });
      }

      // Reload negative keywords
      await loadNegativeKeywords();
      setPendingNegativeKeywordChange(null);
      setEditingNegativeKeywordField(null);
      setEditedNegativeKeywordValue("");
      setShowNegativeKeywordsConfirmationModal(false);
    } catch (error: any) {
      console.error("Error updating negative keyword:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update negative keyword. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowNegativeKeywordsConfirmationModal(false);
    } finally {
      setNegativeKeywordEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingNegativeKeywordChange.id);
        return newSet;
      });
    }
  };

  const cancelNegativeKeywordChange = () => {
    setPendingNegativeKeywordChange(null);
    setEditingNegativeKeywordField(null);
    setEditedNegativeKeywordValue("");
    setShowNegativeKeywordsConfirmationModal(false);
  };

  const handleNegativeKeywordEditCancel = () => {
    setEditingNegativeKeywordField(null);
    setEditedNegativeKeywordValue("");
    setPendingNegativeKeywordChange(null);
  };

  // Negative target inline edit handlers
  const handleNegativeTargetEditStart = (
    id: number,
    field: "status",
    currentValue: string
  ) => {
    setEditingNegativeTargetField({ id, field });
    setEditedNegativeTargetValue(currentValue);
    setPendingNegativeTargetChange(null);
  };

  const handleNegativeTargetEditChange = (value: string) => {
    setEditedNegativeTargetValue(value);
  };

  const handleNegativeTargetEditEnd = (newValue?: string) => {
    if (!editingNegativeTargetField) return;
    const negativeTarget = negativeTargets.find(
      (ntg) => ntg.id === editingNegativeTargetField.id
    );
    if (!negativeTarget) {
      setEditingNegativeTargetField(null);
      setEditedNegativeTargetValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare =
      newValue !== undefined ? newValue : editedNegativeTargetValue;

    let hasChanged = false;
    let oldValue = "";

    if (editingNegativeTargetField.field === "status") {
      const statusLower =
        negativeTarget.status?.toLowerCase() ||
        negativeTarget.state?.toLowerCase() ||
        "enabled";
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : "paused";
      oldValue = currentStatus;
      hasChanged = valueToCompare.toUpperCase() !== currentStatus.toUpperCase();
    }

    if (hasChanged) {
      setPendingNegativeTargetChange({
        id: editingNegativeTargetField.id,
        field: editingNegativeTargetField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setShowNegativeTargetsConfirmationModal(true);
      setEditingNegativeTargetField(null);
    } else {
      setEditingNegativeTargetField(null);
      setEditedNegativeTargetValue("");
    }
  };

  const confirmNegativeTargetChange = async () => {
    if (!pendingNegativeTargetChange || !accountId) return;

    const negativeTarget = negativeTargets.find(
      (ntg) => ntg.id === pendingNegativeTargetChange.id
    );
    if (!negativeTarget || !negativeTarget.targetId) {
      alert("Negative target ID not found");
      setPendingNegativeTargetChange(null);
      return;
    }

    setNegativeTargetEditLoading((prev) =>
      new Set(prev).add(pendingNegativeTargetChange.id)
    );
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (pendingNegativeTargetChange.field === "status") {
        // Map status values
        const statusMap: Record<string, "enable" | "pause"> = {
          enabled: "enable",
          paused: "pause",
        };
        const statusValue =
          statusMap[pendingNegativeTargetChange.newValue.toLowerCase()] ||
          "enable";

        await campaignsService.bulkUpdateNegativeTargets(accountIdNum, {
          targetIds: [String(negativeTarget.targetId)],
          action: "status",
          status: statusValue,
        });
      }

      // Reload negative targets
      await loadNegativeTargets();
      setPendingNegativeTargetChange(null);
      setEditingNegativeTargetField(null);
      setEditedNegativeTargetValue("");
      setShowNegativeTargetsConfirmationModal(false);
    } catch (error: any) {
      console.error("Error updating negative target:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update negative target. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShowNegativeTargetsConfirmationModal(false);
    } finally {
      setNegativeTargetEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingNegativeTargetChange.id);
        return newSet;
      });
    }
  };

  const cancelNegativeTargetChange = () => {
    setPendingNegativeTargetChange(null);
    setEditingNegativeTargetField(null);
    setEditedNegativeTargetValue("");
    setShowNegativeTargetsConfirmationModal(false);
  };

  const handleNegativeTargetEditCancel = () => {
    setEditingNegativeTargetField(null);
    setEditedNegativeTargetValue("");
    setPendingNegativeTargetChange(null);
  };

  const handleCreateNegativeTargets = async (
    negativeTargets: Array<{
      adGroupId: string;
      expression?: Array<{ type: string; value: string }>;
      expressions?: Array<{ type: string; value: string }>;
      state?: "ENABLED" | "PAUSED";
    }>
  ) => {
    if (!accountId || !campaignId || (campaignType !== "SP" && campaignType !== "SB")) return;

    setCreateNegativeTargetLoading(true);
    setCreateNegativeTargetError(null);
    setCreateNegativeTargetFieldErrors({});
    setCreatedNegativeTargets([]);
    setFailedNegativeTargetCount(0);
    setFailedNegativeTargets([]);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Format negative targets based on campaign type
      const formattedNegativeTargets = negativeTargets.map((ntg) => {
        if (campaignType === "SB") {
          // SB: use expressions (plural), no state at creation
          return {
            adGroupId: ntg.adGroupId,
            expressions: ntg.expressions || ntg.expression || [],
          };
        } else {
          // SP: use expression (singular), include state
          return {
            adGroupId: ntg.adGroupId,
            expression: ntg.expression || [],
            state: ntg.state || "ENABLED",
          };
        }
      });

      const response = await campaignsService.createNegativeTargets(
        accountIdNum,
        campaignId,
        {
          negativeTargetingClauses: formattedNegativeTargets,
        }
      );

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;
      const failedNegativeTargetsData = response.failed_negative_targets || [];

      setCreatedNegativeTargets(response.negative_targets || []);
      setFailedNegativeTargetCount(failed);
      setFailedNegativeTargets(failedNegativeTargetsData);

      if (failed === 0) {
        // Complete success - close panel and show success message
        setIsCreateNegativeTargetPanelOpen(false);
        setCreateNegativeTargetError(null);
        setCreateNegativeTargetFieldErrors({});
        setCreatedNegativeTargets([]);
        setFailedNegativeTargetCount(0);
        setFailedNegativeTargets([]);
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: `${created} negative target(s) created successfully!`,
          isSuccess: true,
        });

        // Reload negative targets to show the new ones
        await loadNegativeTargets();
      } else {
        // Partial success or all failed - show summary and keep panel open
        const successMessage =
          created > 0
            ? `${created} negative target(s) created successfully. ${failed} negative target(s) failed.`
            : `All ${failed} negative target(s) failed to create.`;

        setCreateNegativeTargetError(successMessage);

        // Show summary popup for partial success
        if (created > 0 && failed > 0) {
          setErrorModal({
            isOpen: true,
            title: "Summary",
            message: `${created} negative target(s) created successfully. ${failed} negative target(s) failed.`,
            isSuccess: false,
          });
        }
      }

      // Handle field errors if available
      if (response.field_errors) {
        setCreateNegativeTargetFieldErrors(response.field_errors);
      }
    } catch (error: any) {
      console.error("Error creating negative targets:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create negative targets. Please try again.";
      setCreateNegativeTargetError(errorMessage);
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setCreateNegativeTargetLoading(false);
    }
  };

  // Bulk action handlers for Targets
  const handleBulkTargetsStatus = async (statusValue: "enable" | "pause") => {
    if (!accountId || selectedTargetIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setTargetsBulkLoading(true);
      const selectedTargetIdsArray = Array.from(selectedTargetIds).map((id) => {
        const target = targets.find((tgt) => tgt.id === id);
        return target?.targetId ? String(target.targetId) : String(id);
      });

      await campaignsService.bulkUpdateTargets(accountIdNum, {
        targetIds: selectedTargetIdsArray,
        action: "status",
        status: statusValue,
      });

      await loadTargets();
      setSelectedTargetIds(new Set());
      setShowTargetsConfirmationModal(false);
      setPendingTargetsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update targets", error);
      setShowTargetsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update targets. Please try again.",
      });
    } finally {
      setTargetsBulkLoading(false);
    }
  };

  const handleBulkTargetsBid = async () => {
    if (!accountId || selectedTargetIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(targetsBidValue);
    if (isNaN(valueNum)) {
      return;
    }

    try {
      setTargetsBulkLoading(true);

      const selectedTargetsData = targets.filter((tgt) =>
        selectedTargetIds.has(tgt.id)
      );
      const updates: Array<{ targetId: string | number; newBid: number }> = [];

      for (const target of selectedTargetsData) {
        if (!target.targetId) continue;

        const currentBid = parseFloat(
          (target.bid || "$0.00").replace(/[^0-9.]/g, "")
        );
        let newBid = currentBid;

        if (targetsBidAction === "set") {
          newBid = valueNum;
        } else if (targetsBidAction === "increase") {
          if (targetsBidUnit === "percent") {
            newBid = currentBid * (1 + valueNum / 100.0);
          } else {
            newBid = currentBid + valueNum;
          }
        } else if (targetsBidAction === "decrease") {
          if (targetsBidUnit === "percent") {
            newBid = currentBid * (1 - valueNum / 100.0);
          } else {
            newBid = currentBid - valueNum;
          }
        }

        if (targetsBidUpperLimit) {
          const upper = parseFloat(targetsBidUpperLimit);
          if (!isNaN(upper)) {
            newBid = Math.min(newBid, upper);
          }
        }
        if (targetsBidLowerLimit) {
          const lower = parseFloat(targetsBidLowerLimit);
          if (!isNaN(lower)) {
            newBid = Math.max(newBid, lower);
          }
        }

        newBid = Math.max(newBid, 0);

        updates.push({
          targetId: String(target.targetId),
          newBid: Math.round(newBid * 100) / 100,
        });
      }

      for (const update of updates) {
        await campaignsService.bulkUpdateTargets(accountIdNum, {
          targetIds: [update.targetId],
          action: "bid",
          bid: update.newBid,
        });
      }

      await loadTargets();
      setSelectedTargetIds(new Set());
      setShowTargetsConfirmationModal(false);
      setShowTargetsBidPanel(false);
      setTargetsBidValue("");
      setTargetsBidUpperLimit("");
      setTargetsBidLowerLimit("");
    } catch (error: any) {
      console.error("Failed to update targets", error);
      setShowTargetsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update targets. Please try again.",
      });
    } finally {
      setTargetsBulkLoading(false);
    }
  };

  // Bulk action handlers for Keywords
  const handleBulkKeywordsStatus = async (statusValue: "enable" | "pause") => {
    if (!accountId || selectedKeywordIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setKeywordsBulkLoading(true);
      const selectedKeywordIdsArray = Array.from(selectedKeywordIds).map(
        (id) => {
          const keyword = keywords.find((kw) => kw.id === id);
          return keyword?.keywordId || id;
        }
      );

      await campaignsService.bulkUpdateKeywords(accountIdNum, {
        keywordIds: selectedKeywordIdsArray,
        action: "status",
        status: statusValue,
      });

      await loadKeywords();
      setSelectedKeywordIds(new Set());
      setShowKeywordsConfirmationModal(false);
      setPendingKeywordsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update keywords", error);
      setShowKeywordsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update keywords. Please try again.",
      });
    } finally {
      setKeywordsBulkLoading(false);
    }
  };

  const handleBulkKeywordsBid = async () => {
    if (!accountId || selectedKeywordIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    const valueNum = parseFloat(keywordsBidValue);
    if (isNaN(valueNum)) {
      return;
    }

    try {
      setKeywordsBulkLoading(true);

      const selectedKeywordsData = keywords.filter((kw) =>
        selectedKeywordIds.has(kw.id)
      );
      const updates: Array<{ keywordId: string | number; newBid: number }> = [];

      for (const keyword of selectedKeywordsData) {
        if (!keyword.keywordId) continue;

        const currentBid = parseFloat(
          (keyword.bid || "$0.00").replace(/[^0-9.]/g, "")
        );
        let newBid = currentBid;

        if (keywordsBidAction === "set") {
          newBid = valueNum;
        } else if (keywordsBidAction === "increase") {
          if (keywordsBidUnit === "percent") {
            newBid = currentBid * (1 + valueNum / 100.0);
          } else {
            newBid = currentBid + valueNum;
          }
        } else if (keywordsBidAction === "decrease") {
          if (keywordsBidUnit === "percent") {
            newBid = currentBid * (1 - valueNum / 100.0);
          } else {
            newBid = currentBid - valueNum;
          }
        }

        if (keywordsBidUpperLimit) {
          const upper = parseFloat(keywordsBidUpperLimit);
          if (!isNaN(upper)) {
            newBid = Math.min(newBid, upper);
          }
        }
        if (keywordsBidLowerLimit) {
          const lower = parseFloat(keywordsBidLowerLimit);
          if (!isNaN(lower)) {
            newBid = Math.max(newBid, lower);
          }
        }

        newBid = Math.max(newBid, 0);

        updates.push({
          keywordId: keyword.keywordId,
          newBid: Math.round(newBid * 100) / 100,
        });
      }

      for (const update of updates) {
        await campaignsService.bulkUpdateKeywords(accountIdNum, {
          keywordIds: [update.keywordId],
          action: "bid",
          bid: update.newBid,
        });
      }

      await loadKeywords();
      setSelectedKeywordIds(new Set());
      setShowKeywordsConfirmationModal(false);
      setShowKeywordsBidPanel(false);
      setKeywordsBidValue("");
      setKeywordsBidUpperLimit("");
      setKeywordsBidLowerLimit("");
    } catch (error: any) {
      console.error("Failed to update keywords", error);
      setShowKeywordsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update keywords. Please try again.",
      });
    } finally {
      setKeywordsBulkLoading(false);
    }
  };

  const handleBulkKeywordsArchive = async () => {
    if (!accountId || selectedKeywordIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setKeywordsDeleteLoading(true);
      const selectedKeywordsData = keywords.filter((kw) =>
        selectedKeywordIds.has(kw.id)
      );
      const keywordIds = selectedKeywordsData
        .map((k) => k.keywordId || k.id)
        .filter(Boolean) as Array<string | number>;

      // Use bulkUpdateKeywords with archive action
      const response = await campaignsService.bulkUpdateKeywords(accountIdNum, {
        keywordIds: keywordIds,
        action: "archive",
      });

      // Handle response - archive returns updated/failed counts
      if (response?.updated !== undefined) {
        if (response.failed > 0 && response.errors) {
          const errorMessages = Array.isArray(response.errors)
            ? response.errors.join("; ")
            : response.errors;
          setErrorModal({
            isOpen: true,
            message: `Some keywords could not be archived: ${errorMessages}`,
          });
        }

        if (response.updated > 0) {
          await loadKeywords();
          setSelectedKeywordIds(new Set());
        }
      } else {
        // If response format is different, just reload
        await loadKeywords();
        setSelectedKeywordIds(new Set());
      }

      setShowKeywordsDeleteConfirmation(false);
    } catch (error: any) {
      console.error("Failed to archive keywords", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to archive keywords. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setKeywordsDeleteLoading(false);
    }
  };

  const handleBulkSBAdsDelete = async () => {
    if (!accountId || selectedSBAdIds.size === 0) return;

    setSbAdsDeleteLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const selectedSBAdIdsArray = Array.from(selectedSBAdIds).map((id) => {
        const ad = sbAds.find((a) => a.id === id);
        return ad?.adId || id;
      });

      await campaignsService.bulkDeleteProductAds(accountIdNum, {
        adIdFilter: {
          include: selectedSBAdIdsArray,
        },
      });

      await loadSBAds();
      setSelectedSBAdIds(new Set());
      setShowSBAdsDeleteConfirmation(false);

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: "Ads deleted successfully!",
        isSuccess: true,
      });
    } catch (error: any) {
      console.error("Failed to delete SB ads", error);
      setShowSBAdsDeleteConfirmation(false);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message:
          error?.response?.data?.error ||
          "Failed to delete ads. Please try again.",
        isSuccess: false,
      });
    } finally {
      setSbAdsDeleteLoading(false);
    }
  };

  const handleBulkProductAdsDelete = async () => {
    if (!accountId || selectedProductAdIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setProductAdsDeleteLoading(true);
      const selectedProductAdsData = productads.filter((pa) =>
        selectedProductAdIds.has(pa.id)
      );
      const adIds = selectedProductAdsData
        .map((pa) => pa.adId || pa.id)
        .filter(Boolean) as Array<string | number>;

      const response = await campaignsService.bulkDeleteProductAds(
        accountIdNum,
        {
          adIdFilter: {
            include: adIds,
          },
        }
      );

      // Handle response with success/error arrays
      // Note: Log creation is handled by the backend
      if (response?.productAds) {
        const errors = response.productAds.error || [];
        const successes = response.productAds.success || [];

        if (errors.length > 0) {
          const errorMessages = errors
            .map((err: any) => {
              const errorDetails = err.errors?.[0]?.errorValue;
              if (errorDetails) {
                return Object.values(errorDetails)
                  .map((e: any) => e?.message || "Unknown error")
                  .join(", ");
              }
              return "Unknown error";
            })
            .join("; ");
          setErrorModal({
            isOpen: true,
            message: `Some product ads could not be deleted: ${errorMessages}`,
          });
        }

        if (successes.length > 0) {
          await loadProductAds();
          setSelectedProductAdIds(new Set());
        }
      } else {
        // If response format is different, just reload
        await loadProductAds();
        setSelectedProductAdIds(new Set());
      }

      setShowProductAdsDeleteConfirmation(false);
    } catch (error: any) {
      console.error("Failed to delete product ads", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete product ads. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setProductAdsDeleteLoading(false);
    }
  };

  const handleBulkAdGroupsDelete = async () => {
    if (!accountId || selectedAdGroupIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setAdGroupsDeleteLoading(true);
      // Filter adgroups by checking both id and adGroupId against selectedAdGroupIds
      // The selectedAdGroupIds might contain either id or adGroupId values
      const selectedAdGroupsData = adgroups.filter((ag) => {
        const agId = ag.id;
        const agAdGroupId = ag.adGroupId;
        return (
          selectedAdGroupIds.has(agId) ||
          (agAdGroupId !== undefined &&
            selectedAdGroupIds.has(agAdGroupId as number))
        );
      });

      // Extract adGroupId values (prefer adGroupId over id for API call)
      const adGroupIds = selectedAdGroupsData
        .map((ag) => ag.adGroupId || ag.id)
        .filter(Boolean) as Array<string | number>;

      // If still no IDs found, the selectedAdGroupIds might already be adGroupIds
      if (adGroupIds.length === 0 && selectedAdGroupIds.size > 0) {
        // Use the selected IDs directly as they might already be adGroupIds
        const directIds = Array.from(selectedAdGroupIds).filter(
          (id): id is string | number => id !== undefined && id !== null
        );
        adGroupIds.push(...directIds);
      }

      if (adGroupIds.length === 0) {
        console.error("No adGroup IDs found for deletion");
        setAdGroupsDeleteLoading(false);
        return;
      }

      const response = await campaignsService.bulkDeleteAdGroups(accountIdNum, {
        adGroupIdFilter: {
          include: adGroupIds,
        },
      });

      // Handle response with success/error arrays
      // Note: Log creation is handled by the backend
      if (response?.adGroups || response?.adgroups) {
        const adGroupsResponse = response.adGroups || response.adgroups;
        const errors = adGroupsResponse.error || [];
        const successes = adGroupsResponse.success || [];

        if (errors.length > 0) {
          const errorMessages = errors
            .map((err: any) => {
              const errorDetails = err.errors?.[0]?.errorValue;
              if (errorDetails) {
                return Object.values(errorDetails)
                  .map((e: any) => e?.message || "Unknown error")
                  .join(", ");
              }
              return "Unknown error";
            })
            .join("; ");
          setErrorModal({
            isOpen: true,
            message: `Some ad groups could not be deleted: ${errorMessages}`,
          });
        }

        if (successes.length > 0) {
          await loadAdGroups();
          setSelectedAdGroupIds(new Set());
        }
      } else {
        await loadAdGroups();
        setSelectedAdGroupIds(new Set());
      }

      setShowAdGroupsDeleteConfirmation(false);
    } catch (error: any) {
      console.error("Failed to delete ad groups", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete ad groups. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setAdGroupsDeleteLoading(false);
    }
  };

  const handleBulkTargetsDelete = async () => {
    if (!accountId || selectedTargetIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setTargetsDeleteLoading(true);
      const selectedTargetsData = targets.filter((t) =>
        selectedTargetIds.has(t.id)
      );
      const targetIds = selectedTargetsData
        .map((t) => t.targetId || t.id)
        .filter(Boolean) as Array<string | number>;

      const response = await campaignsService.bulkDeleteTargets(accountIdNum, {
        targetIdFilter: {
          include: targetIds,
        },
      });

      // Handle response with success/error arrays
      // Note: Log creation is handled by the backend
      if (response?.targets || response?.targetingClauses) {
        const targetsResponse = response.targets || response.targetingClauses;
        const errors = targetsResponse.error || [];
        const successes = targetsResponse.success || [];

        if (errors.length > 0) {
          const errorMessages = errors
            .map((err: any) => {
              const errorDetails = err.errors?.[0]?.errorValue;
              if (errorDetails) {
                return Object.values(errorDetails)
                  .map((e: any) => e?.message || "Unknown error")
                  .join(", ");
              }
              return "Unknown error";
            })
            .join("; ");
          setErrorModal({
            isOpen: true,
            message: `Some targets could not be deleted: ${errorMessages}`,
          });
        }

        if (successes.length > 0) {
          await loadTargets();
          setSelectedTargetIds(new Set());
        }
      } else {
        await loadTargets();
        setSelectedTargetIds(new Set());
      }

      setShowTargetsDeleteConfirmation(false);
    } catch (error: any) {
      console.error("Failed to delete targets", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete targets. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setTargetsDeleteLoading(false);
    }
  };

  const handleBulkNegativeKeywordsDelete = async () => {
    if (!accountId || selectedNegativeKeywordIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setNegativeKeywordsDeleteLoading(true);
      const selectedNegativeKeywordsData = negativeKeywords.filter((nk) =>
        selectedNegativeKeywordIds.has(nk.id)
      );
      const negativeKeywordIds = selectedNegativeKeywordsData
        .map((nk) => nk.keywordId || nk.id)
        .filter(Boolean) as Array<string | number>;

      const response = await campaignsService.bulkDeleteNegativeKeywords(
        accountIdNum,
        {
          negativeKeywordIdFilter: {
            include: negativeKeywordIds,
          },
          ...(campaignType && { campaignType }),
          ...(campaignId && { campaignId }),
        }
      );

      // Handle response with success/error arrays
      // Note: Log creation is handled by the backend
      if (response?.negativeKeywords || response?.negative_keywords) {
        const negativeKeywordsResponse =
          response.negativeKeywords || response.negative_keywords;
        const errors = negativeKeywordsResponse.error || [];
        const successes = negativeKeywordsResponse.success || [];

        if (errors.length > 0) {
          const errorMessages = errors
            .map((err: any) => {
              const errorDetails = err.errors?.[0]?.errorValue;
              if (errorDetails) {
                return Object.values(errorDetails)
                  .map((e: any) => e?.message || "Unknown error")
                  .join(", ");
              }
              return "Unknown error";
            })
            .join("; ");
          setErrorModal({
            isOpen: true,
            message: `Some negative keywords could not be deleted: ${errorMessages}`,
          });
        }

        if (successes.length > 0) {
          await loadNegativeKeywords();
          setSelectedNegativeKeywordIds(new Set());
        }
      } else {
        await loadNegativeKeywords();
        setSelectedNegativeKeywordIds(new Set());
      }

      setShowNegativeKeywordsDeleteConfirmation(false);
    } catch (error: any) {
      console.error("Failed to delete negative keywords", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete negative keywords. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setNegativeKeywordsDeleteLoading(false);
    }
  };

  const handleBulkNegativeTargetsDelete = async () => {
    if (!accountId || selectedNegativeTargetIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setNegativeTargetsDeleteLoading(true);
      const selectedNegativeTargetsData = negativeTargets.filter((nt) =>
        selectedNegativeTargetIds.has(nt.id)
      );
      const negativeTargetIds = selectedNegativeTargetsData
        .map((nt) => nt.targetId || nt.id)
        .filter(Boolean) as Array<string | number>;

      const response = await campaignsService.bulkDeleteNegativeTargets(
        accountIdNum,
        {
          negativeTargetIdFilter: {
            include: negativeTargetIds,
          },
        }
      );

      // Handle response with success/error arrays
      // Note: Log creation is handled by the backend
      if (response?.negativeTargets || response?.negative_targets) {
        const negativeTargetsResponse =
          response.negativeTargets || response.negative_targets;
        const errors = negativeTargetsResponse.error || [];
        const successes = negativeTargetsResponse.success || [];

        if (errors.length > 0) {
          const errorMessages = errors
            .map((err: any) => {
              const errorDetails = err.errors?.[0]?.errorValue;
              if (errorDetails) {
                return Object.values(errorDetails)
                  .map((e: any) => e?.message || "Unknown error")
                  .join(", ");
              }
              return "Unknown error";
            })
            .join("; ");
          setErrorModal({
            isOpen: true,
            message: `Some negative targets could not be deleted: ${errorMessages}`,
          });
        }

        if (successes.length > 0) {
          await loadNegativeTargets();
          setSelectedNegativeTargetIds(new Set());
        }
      } else {
        await loadNegativeTargets();
        setSelectedNegativeTargetIds(new Set());
      }

      setShowNegativeTargetsDeleteConfirmation(false);
    } catch (error: any) {
      console.error("Failed to delete negative targets", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete negative targets. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setNegativeTargetsDeleteLoading(false);
    }
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

      // Convert to uppercase for API: enable -> ENABLED, pause -> PAUSED
      const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
        enable: "ENABLED",
        pause: "PAUSED",
        enabled: "ENABLED",
        paused: "PAUSED",
      };
      const apiStatus = statusMap[statusValue.toLowerCase()] || "ENABLED";

      await campaignsService.bulkUpdateAdGroups(accountIdNum, {
        adgroupIds: selectedAdGroupIdsArray,
        action: "status",
        status: apiStatus,
      });

      await loadAdGroups();
      setSelectedAdGroupIds(new Set());
      setShowAdGroupsConfirmationModal(false);
      setPendingAdGroupsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update ad groups", error);
      setShowAdGroupsConfirmationModal(false);
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
      setShowAdGroupsConfirmationModal(false);
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
      if (
        keywordsBulkActionsRef.current &&
        !keywordsBulkActionsRef.current.contains(event.target as Node)
      ) {
        setShowKeywordsBulkActions(false);
      }
      if (
        targetsBulkActionsRef.current &&
        !targetsBulkActionsRef.current.contains(event.target as Node)
      ) {
        setShowTargetsBulkActions(false);
      }
      if (
        negativeKeywordsBulkActionsRef.current &&
        !negativeKeywordsBulkActionsRef.current.contains(event.target as Node)
      ) {
        setShowNegativeKeywordsBulkActions(false);
      }
      if (
        negativeTargetsBulkActionsRef.current &&
        !negativeTargetsBulkActionsRef.current.contains(event.target as Node)
      ) {
        setShowNegativeTargetsBulkActions(false);
      }
      if (
        productAdsBulkActionsRef.current &&
        !productAdsBulkActionsRef.current.contains(event.target as Node)
      ) {
        setShowProductAdsBulkActions(false);
      }
    };

    if (
      showAdGroupsBulkActions ||
      showKeywordsBulkActions ||
      showTargetsBulkActions ||
      showNegativeKeywordsBulkActions ||
      showNegativeTargetsBulkActions ||
      showProductAdsBulkActions
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showAdGroupsBulkActions,
    showKeywordsBulkActions,
    showTargetsBulkActions,
    showNegativeKeywordsBulkActions,
    showNegativeTargetsBulkActions,
    showProductAdsBulkActions,
  ]);

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
                              // Only show "Archived" and "Edit Default Bid" for SP campaigns
                              ...(campaignType !== "SB"
                                ? [
                                    { value: "archive", label: "Archived" },
                                    {
                                      value: "edit_bid",
                                      label: "Edit Default Bid",
                                    },
                                  ]
                                : []),
                              { value: "delete", label: "Delete" },
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
                                  } else if (opt.value === "delete") {
                                    setShowAdGroupsBidPanel(false);
                                    setShowAdGroupsDeleteConfirmation(true);
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
                      className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
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
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
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
                          <input
                            type="number"
                            value={adGroupsBidValue}
                            onChange={(e) =>
                              setAdGroupsBidValue(e.target.value)
                            }
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                          />
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
                      key={`adgroups-filter-${adgroupsFiltersString}`}
                      isOpen={true}
                      onClose={() => {
                        // Check if filters changed before closing
                        // The FilterPanel will have already applied changes via onApply when chips are removed
                        setIsAdGroupsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        // Create a stable string representation of the filters
                        const filtersStr = JSON.stringify(
                          [...newFilters].sort((a, b) => {
                            if (a.field !== b.field)
                              return a.field.localeCompare(b.field);
                            const aOp = a.operator || "";
                            const bOp = b.operator || "";
                            if (aOp !== bOp) return aOp.localeCompare(bOp);
                            return String(a.value).localeCompare(
                              String(b.value)
                            );
                          })
                        );

                        // Prevent applying the same filters multiple times
                        if (lastAppliedFiltersRef.current === filtersStr) {
                          return;
                        }

                        lastAppliedFiltersRef.current = filtersStr;
                        setAdgroupsFilters(newFilters);
                        setAdgroupsCurrentPage(1); // Reset to first page when applying filters
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
                    campaignDetail={campaignDetail}
                    campaignId={campaignId} // Pass campaignId to hide Campaign Name column
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
                    onEditCancel={handleAdGroupEditCancel}
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
                    {/* Bulk Actions Dropdown */}
                    {selectedKeywordIds.size > 0 && (
                      <div className="relative" ref={keywordsBulkActionsRef}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowKeywordsBulkActions((prev) => !prev);
                            setShowKeywordsBidPanel(false);
                            setIsKeywordsFilterPanelOpen(false);
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
                        {showKeywordsBulkActions && (
                          <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                            <div className="overflow-y-auto">
                              {[
                                { value: "enable", label: "Enabled" },
                                { value: "pause", label: "Paused" },
                                { value: "edit_bid", label: "Edit Bid" },
                                { value: "archive", label: "Archive" },
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  disabled={selectedKeywordIds.size === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedKeywordIds.size === 0) return;
                                    if (opt.value === "edit_bid") {
                                      setShowKeywordsBidPanel(true);
                                    } else if (opt.value === "archive") {
                                      setShowKeywordsBidPanel(false);
                                      setShowKeywordsDeleteConfirmation(true);
                                    } else {
                                      setShowKeywordsBidPanel(false);
                                      setPendingKeywordsStatusAction(
                                        opt.value as "enable" | "pause"
                                      );
                                      setShowKeywordsConfirmationModal(true);
                                    }
                                    setShowKeywordsBulkActions(false);
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                      className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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

                {/* Bid editor panel for Keywords */}
                {selectedKeywordIds.size > 0 && showKeywordsBidPanel && (
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
                            value={keywordsBidAction}
                            onChange={(val) => {
                              const action = val as typeof keywordsBidAction;
                              setKeywordsBidAction(action);
                              if (action === "set") {
                                setKeywordsBidUnit("amount");
                              }
                            }}
                            buttonClassName="w-full"
                            width="w-full"
                          />
                        </div>
                        {(keywordsBidAction === "increase" ||
                          keywordsBidAction === "decrease") && (
                          <div className="w-[140px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Unit
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                                  keywordsBidUnit === "percent"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setKeywordsBidUnit("percent")}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                                  keywordsBidUnit === "amount"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setKeywordsBidUnit("amount")}
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
                          <input
                            type="number"
                            value={keywordsBidValue}
                            onChange={(e) =>
                              setKeywordsBidValue(e.target.value)
                            }
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                          />
                        </div>
                        {keywordsBidAction === "increase" && (
                          <div className="w-[160px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Upper Limit (Optional)
                            </label>
                            <input
                              type="number"
                              value={keywordsBidUpperLimit}
                              onChange={(e) =>
                                setKeywordsBidUpperLimit(e.target.value)
                              }
                              placeholder="$0.00"
                              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                            />
                          </div>
                        )}
                        {keywordsBidAction === "decrease" && (
                          <div className="w-[160px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Lower Limit (Optional)
                            </label>
                            <input
                              type="number"
                              value={keywordsBidLowerLimit}
                              onChange={(e) =>
                                setKeywordsBidLowerLimit(e.target.value)
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
                              setShowKeywordsBidPanel(false);
                              setKeywordsBidValue("");
                              setKeywordsBidUpperLimit("");
                              setKeywordsBidLowerLimit("");
                            }}
                            className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setShowKeywordsConfirmationModal(true);
                            }}
                            disabled={!keywordsBidValue || keywordsBulkLoading}
                            className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                    adgroups={(allAdgroups.length > 0 ? allAdgroups : adgroups)
                      .filter((ag) => {
                        // Only show ENABLED adgroups for keyword creation
                        const status = ag.status || ag.state || "";
                        return status.toUpperCase() === "ENABLED";
                      })
                      .map((ag) => ({
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
                    editingField={editingKeywordField}
                    editedValue={editedKeywordValue}
                    onEditStart={handleKeywordEditStart}
                    onEditChange={handleKeywordEditChange}
                    onEditEnd={handleKeywordEditEnd}
                    onEditCancel={handleKeywordEditCancel}
                    inlineEditLoading={keywordEditLoading}
                    pendingChange={pendingKeywordChange}
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

            {activeTab === "Ads Collection" && (
              <>
                {/* Header with Filter Button and Create SB Ad Button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Ads Collection
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Create SB Ad Button */}
                    <button
                      onClick={async () => {
                        const newState = !isCreateSBAdPanelOpen;
                        setIsCreateSBAdPanelOpen(newState);
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
                      Create Ads
                      <svg
                        className={`w-4 h-4 !text-white transition-transform ${
                          isCreateSBAdPanelOpen ? "rotate-180" : ""
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
                    {/* Bulk Edit Button */}
                    {selectedSBAdIds.size > 0 && (
                      <div
                        className="relative inline-flex justify-end"
                        ref={sbAdsBulkActionsRef}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSBAdsBulkActions((prev) => !prev);
                            setIsSBAdsFilterPanelOpen(false);
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
                        {showSBAdsBulkActions && (
                          <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                            <div className="overflow-y-auto">
                              {[{ value: "delete", label: "Delete" }].map(
                                (opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    disabled={selectedSBAdIds.size === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (selectedSBAdIds.size === 0) return;
                                      if (opt.value === "delete") {
                                        setShowSBAdsDeleteConfirmation(true);
                                      }
                                      setShowSBAdsBulkActions(false);
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Add Filter Button */}
                    <button
                      onClick={() =>
                        setIsSBAdsFilterPanelOpen(!isSBAdsFilterPanelOpen)
                      }
                      className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                        Filter
                      </span>
                    </button>
                  </div>
                </div>

                {/* Create SB Ad Panel */}
                {isCreateSBAdPanelOpen && (
                  <CreateSBAdPanel
                    isOpen={isCreateSBAdPanelOpen}
                    accountId={parseInt(accountId || "0", 10)}
                    onClose={() => {
                      setIsCreateSBAdPanelOpen(false);
                      setCreateSBAdError(null);
                      setCreateSBAdFieldErrors({});
                      setCreatedSBAds([]);
                      setFailedSBAdCount(0);
                      setFailedSBAds([]);
                    }}
                    onSubmit={handleCreateSBAds}
                    adgroups={(allAdgroups.length > 0 ? allAdgroups : adgroups)
                      .filter((ag) => {
                        // Only show ENABLED adgroups for SB ad creation
                        const statusValue =
                          (ag as any).status || (ag as any).state || "";
                        return statusValue.toUpperCase() === "ENABLED";
                      })
                      .map((ag) => ({
                        adGroupId: ag.adGroupId || String(ag.id),
                        name: ag.name,
                      }))}
                    campaignId={campaignId || ""}
                    loading={createSBAdLoading}
                    submitError={createSBAdError}
                    fieldErrors={createSBAdFieldErrors}
                    createdAds={createdSBAds}
                    failedCount={failedSBAdCount}
                    failedAds={failedSBAds}
                  />
                )}

                {/* Filter Panel */}
                {isSBAdsFilterPanelOpen && (
                  <div className="mb-4">
                    <FilterPanel
                      isOpen={true}
                      onClose={() => {
                        setIsSBAdsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        setSbAdsFilters(newFilters);
                        setSbAdsCurrentPage(1);
                      }}
                      initialFilters={sbAdsFilters}
                      filterFields={[
                        { value: "name", label: "Ad Name" },
                        { value: "state", label: "State" },
                        { value: "adGroupId", label: "Ad Group ID" },
                      ]}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <SBAdsTable
                    ads={sbAds}
                    loading={sbAdsLoading}
                    onSelectAll={handleSelectAllSBAds}
                    onSelect={handleSelectSBAd}
                    selectedIds={selectedSBAdIds}
                    sortBy={sbAdsSortBy}
                    sortOrder={sbAdsSortOrder}
                    onSort={handleSBAdsSort}
                  />
                </div>

                {/* Pagination */}
                {!sbAdsLoading && sbAds.length > 0 && sbAdsTotalPages > 0 && (
                  <div className="flex items-center justify-end mt-4">
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() =>
                          handleSBAdsPageChange(
                            Math.max(1, sbAdsCurrentPage - 1)
                          )
                        }
                        disabled={sbAdsCurrentPage === 1}
                        className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from(
                        { length: Math.min(5, sbAdsTotalPages) },
                        (_, i) => {
                          let pageNum;
                          if (sbAdsTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (sbAdsCurrentPage <= 3) {
                            pageNum = i + 1;
                          } else if (sbAdsCurrentPage >= sbAdsTotalPages - 2) {
                            pageNum = sbAdsTotalPages - 4 + i;
                          } else {
                            pageNum = sbAdsCurrentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleSBAdsPageChange(pageNum)}
                              className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                sbAdsCurrentPage === pageNum
                                  ? "bg-white text-[#136D6D] font-semibold"
                                  : "text-black hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                      {sbAdsTotalPages > 5 &&
                        sbAdsCurrentPage < sbAdsTotalPages - 2 && (
                          <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                            ...
                          </span>
                        )}
                      {sbAdsTotalPages > 5 && (
                        <button
                          onClick={() => handleSBAdsPageChange(sbAdsTotalPages)}
                          className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                            sbAdsCurrentPage === sbAdsTotalPages
                              ? "bg-white text-[#136D6D] font-semibold"
                              : "text-black hover:bg-gray-50"
                          }`}
                        >
                          {sbAdsTotalPages}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleSBAdsPageChange(
                            Math.min(sbAdsTotalPages, sbAdsCurrentPage + 1)
                          )
                        }
                        disabled={sbAdsCurrentPage === sbAdsTotalPages}
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
                    {/* Bulk Edit Button */}
                    {selectedProductAdIds.size > 0 && (
                      <div
                        className="relative inline-flex justify-end"
                        ref={productAdsBulkActionsRef}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowProductAdsBulkActions((prev) => !prev);
                            setIsProductAdsFilterPanelOpen(false);
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
                        {showProductAdsBulkActions && (
                          <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                            <div className="overflow-y-auto">
                              {[{ value: "delete", label: "Delete" }].map(
                                (opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    disabled={selectedProductAdIds.size === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (selectedProductAdIds.size === 0)
                                        return;
                                      if (opt.value === "delete") {
                                        setShowProductAdsDeleteConfirmation(
                                          true
                                        );
                                      }
                                      setShowProductAdsBulkActions(false);
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Add Filter Button */}
                    <button
                      onClick={() =>
                        setIsProductAdsFilterPanelOpen(
                          !isProductAdsFilterPanelOpen
                        )
                      }
                      className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                    {/* Bulk Actions Dropdown */}
                    {selectedTargetIds.size > 0 && (
                      <div className="relative" ref={targetsBulkActionsRef}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTargetsBulkActions((prev) => !prev);
                            setShowTargetsBidPanel(false);
                            setIsTargetsFilterPanelOpen(false);
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
                        {showTargetsBulkActions && (
                          <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                            <div className="overflow-y-auto">
                              {[
                                { value: "enable", label: "Enabled" },
                                { value: "pause", label: "Paused" },
                                { value: "edit_bid", label: "Edit Bid" },
                                { value: "delete", label: "Delete" },
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  disabled={selectedTargetIds.size === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedTargetIds.size === 0) return;
                                    if (opt.value === "edit_bid") {
                                      setShowTargetsBidPanel(true);
                                    } else if (opt.value === "delete") {
                                      setShowTargetsBidPanel(false);
                                      setShowTargetsDeleteConfirmation(true);
                                    } else {
                                      setShowTargetsBidPanel(false);
                                      setPendingTargetsStatusAction(
                                        opt.value as "enable" | "pause"
                                      );
                                      setShowTargetsConfirmationModal(true);
                                    }
                                    setShowTargetsBulkActions(false);
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                      className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                    campaignType={campaignType}
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

                {/* Bid editor panel for Targets */}
                {selectedTargetIds.size > 0 && showTargetsBidPanel && (
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
                            value={targetsBidAction}
                            onChange={(val) => {
                              const action = val as typeof targetsBidAction;
                              setTargetsBidAction(action);
                              if (action === "set") {
                                setTargetsBidUnit("amount");
                              }
                            }}
                            buttonClassName="w-full"
                            width="w-full"
                          />
                        </div>
                        {(targetsBidAction === "increase" ||
                          targetsBidAction === "decrease") && (
                          <div className="w-[140px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Unit
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                                  targetsBidUnit === "percent"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setTargetsBidUnit("percent")}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                                  targetsBidUnit === "amount"
                                    ? "bg-forest-f40  border-forest-f40"
                                    : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setTargetsBidUnit("amount")}
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
                          <input
                            type="number"
                            value={targetsBidValue}
                            onChange={(e) => setTargetsBidValue(e.target.value)}
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                          />
                        </div>
                        {targetsBidAction === "increase" && (
                          <div className="w-[160px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Upper Limit (Optional)
                            </label>
                            <input
                              type="number"
                              value={targetsBidUpperLimit}
                              onChange={(e) =>
                                setTargetsBidUpperLimit(e.target.value)
                              }
                              placeholder="$0.00"
                              className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                            />
                          </div>
                        )}
                        {targetsBidAction === "decrease" && (
                          <div className="w-[160px]">
                            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                              Lower Limit (Optional)
                            </label>
                            <input
                              type="number"
                              value={targetsBidLowerLimit}
                              onChange={(e) =>
                                setTargetsBidLowerLimit(e.target.value)
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
                              setShowTargetsBidPanel(false);
                              setTargetsBidValue("");
                              setTargetsBidUpperLimit("");
                              setTargetsBidLowerLimit("");
                            }}
                            className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setShowTargetsConfirmationModal(true);
                            }}
                            disabled={!targetsBidValue || targetsBulkLoading}
                            className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    editingField={editingTargetField}
                    editedValue={editedTargetValue}
                    onEditStart={handleTargetEditStart}
                    onEditChange={handleTargetEditChange}
                    onEditEnd={handleTargetEditEnd}
                    onEditCancel={handleTargetEditCancel}
                    inlineEditLoading={targetEditLoading}
                    pendingChange={pendingTargetChange}
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

            {activeTab === "Negative Keywords" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                      Negative Keywords
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* Bulk Actions Dropdown */}
                      {selectedNegativeKeywordIds.size > 0 && (
                        <div
                          className="relative"
                          ref={negativeKeywordsBulkActionsRef}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowNegativeKeywordsBulkActions(
                                (prev) => !prev
                              );
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
                          {showNegativeKeywordsBulkActions && (
                            <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                              <div className="overflow-y-auto">
                                {[
                                  { value: "enable", label: "Enabled" },
                                  { value: "pause", label: "Paused" },
                                  { value: "delete", label: "Delete" },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    disabled={
                                      selectedNegativeKeywordIds.size === 0
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (selectedNegativeKeywordIds.size === 0)
                                        return;
                                      if (opt.value === "delete") {
                                        setShowNegativeKeywordsDeleteConfirmation(
                                          true
                                        );
                                      } else {
                                        setPendingNegativeKeywordsStatusAction(
                                          opt.value as "enable" | "pause"
                                        );
                                        setShowNegativeKeywordsConfirmationModal(
                                          true
                                        );
                                      }
                                      setShowNegativeKeywordsBulkActions(false);
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Create Negative Keyword Button */}
                      <button
                        onClick={async () => {
                          const newState = !isCreateNegativeKeywordPanelOpen;
                          setIsCreateNegativeKeywordPanelOpen(newState);
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
                        Create Negative Keywords
                        <svg
                          className={`w-4 h-4 !text-white transition-transform ${
                            isCreateNegativeKeywordPanelOpen ? "rotate-180" : ""
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
                          setIsNegativeKeywordsFilterPanelOpen(
                            !isNegativeKeywordsFilterPanelOpen
                          )
                        }
                        className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                            isNegativeKeywordsFilterPanelOpen
                              ? "rotate-180"
                              : ""
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
                  {isNegativeKeywordsFilterPanelOpen && (
                    <div className="mb-4">
                      <FilterPanel
                        isOpen={true}
                        onClose={() => {
                          setIsNegativeKeywordsFilterPanelOpen(false);
                        }}
                        onApply={(newFilters) => {
                          setNegativeKeywordsFilters(newFilters);
                          setNegativeKeywordsCurrentPage(1); // Reset to first page when applying filters
                          // Data will refresh automatically via useEffect dependency on negativeKeywordsFilters
                        }}
                        initialFilters={negativeKeywordsFilters}
                        filterFields={[
                          { value: "keywordText", label: "Text" },
                          { value: "state", label: "Status" },
                        ]}
                        useUppercaseState={true}
                      />
                    </div>
                  )}

                  {/* Create Negative Keyword Panel */}
                  {isCreateNegativeKeywordPanelOpen && (
                    <CreateNegativeKeywordPanel
                      isOpen={isCreateNegativeKeywordPanelOpen}
                      onClose={() => {
                        setIsCreateNegativeKeywordPanelOpen(false);
                        // Reset error states when closing
                        setCreateNegativeKeywordError(null);
                        setCreateNegativeKeywordFieldErrors({});
                        setCreatedNegativeKeywords([]);
                        setFailedNegativeKeywordCount(0);
                        setFailedNegativeKeywords([]);
                      }}
                      onSubmit={handleCreateNegativeKeywords}
                      adgroups={(allAdgroups.length > 0
                        ? allAdgroups
                        : adgroups
                      ).map((ag) => ({
                        adGroupId: ag.adGroupId || String(ag.id),
                        name: ag.name,
                      }))}
                      campaignId={campaignId || ""}
                      campaignType={campaignType || undefined}
                      loading={createNegativeKeywordLoading}
                      submitError={createNegativeKeywordError}
                      fieldErrors={createNegativeKeywordFieldErrors}
                      createdNegativeKeywords={createdNegativeKeywords}
                      failedCount={failedNegativeKeywordCount}
                      failedNegativeKeywords={failedNegativeKeywords}
                    />
                  )}

                  <div className="mb-4">
                    <NegativeKeywordsTable
                      negativeKeywords={negativeKeywords}
                      loading={negativeKeywordsLoading}
                      onSelectAll={handleSelectAllNegativeKeywords}
                      onSelect={handleSelectNegativeKeyword}
                      selectedIds={selectedNegativeKeywordIds}
                      sortBy={negativeKeywordsSortBy}
                      sortOrder={negativeKeywordsSortOrder}
                      onSort={handleNegativeKeywordsSort}
                      editingField={editingNegativeKeywordField}
                      editedValue={editedNegativeKeywordValue}
                      onEditStart={handleNegativeKeywordEditStart}
                      onEditChange={handleNegativeKeywordEditChange}
                      onEditEnd={handleNegativeKeywordEditEnd}
                      onEditCancel={handleNegativeKeywordEditCancel}
                      inlineEditLoading={negativeKeywordEditLoading}
                      pendingChange={pendingNegativeKeywordChange}
                    />
                  </div>
                </div>
                {/* Pagination */}
                {!negativeKeywordsLoading &&
                  negativeKeywords.length > 0 &&
                  negativeKeywordsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleNegativeKeywordsPageChange(
                              Math.max(1, negativeKeywordsCurrentPage - 1)
                            )
                          }
                          disabled={negativeKeywordsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, negativeKeywordsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (negativeKeywordsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (negativeKeywordsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              negativeKeywordsCurrentPage >=
                              negativeKeywordsTotalPages - 2
                            ) {
                              pageNum = negativeKeywordsTotalPages - 4 + i;
                            } else {
                              pageNum = negativeKeywordsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() =>
                                  handleNegativeKeywordsPageChange(pageNum)
                                }
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  negativeKeywordsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {negativeKeywordsTotalPages > 5 &&
                          negativeKeywordsCurrentPage <
                            negativeKeywordsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {negativeKeywordsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleNegativeKeywordsPageChange(
                                negativeKeywordsTotalPages
                              )
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              negativeKeywordsCurrentPage ===
                              negativeKeywordsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {negativeKeywordsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleNegativeKeywordsPageChange(
                              Math.min(
                                negativeKeywordsTotalPages,
                                negativeKeywordsCurrentPage + 1
                              )
                            )
                          }
                          disabled={
                            negativeKeywordsCurrentPage ===
                            negativeKeywordsTotalPages
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

            {activeTab === "Negative Targets" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                      Negative Targets
                    </h2>
                    <div className="flex items-center gap-3">
                      {/* Bulk Actions Button */}
                      {selectedNegativeTargetIds.size > 0 && (
                        <div
                          className="relative"
                          ref={negativeTargetsBulkActionsRef}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setShowNegativeTargetsBulkActions(
                                !showNegativeTargetsBulkActions
                              )
                            }
                            className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors text-[10.64px] font-normal"
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
                            {showNegativeTargetsBulkActions && (
                              <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                                <div className="overflow-y-auto">
                                  {[
                                    { value: "enable", label: "Enabled" },
                                    { value: "pause", label: "Paused" },
                                    { value: "delete", label: "Delete" },
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      disabled={
                                        selectedNegativeTargetIds.size === 0
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (
                                          selectedNegativeTargetIds.size === 0
                                        )
                                          return;
                                        if (opt.value === "delete") {
                                          setShowNegativeTargetsDeleteConfirmation(
                                            true
                                          );
                                        } else {
                                          setPendingNegativeTargetsStatusAction(
                                            opt.value as "enable" | "pause"
                                          );
                                          setShowNegativeTargetsConfirmationModal(
                                            true
                                          );
                                        }
                                        setShowNegativeTargetsBulkActions(
                                          false
                                        );
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </button>
                        </div>
                      )}
                      {/* Create Negative Target Button */}
                      <button
                        onClick={() =>
                          setIsCreateNegativeTargetPanelOpen(
                            !isCreateNegativeTargetPanelOpen
                          )
                        }
                        className="px-3 py-2 bg-[#136D6D] text-white rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] transition-colors text-[11.2px] font-semibold"
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
                        Create Negative Targets
                        <svg
                          className={`w-4 h-4 !text-white transition-transform ${
                            isCreateNegativeTargetPanelOpen ? "rotate-180" : ""
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
                          setIsNegativeTargetsFilterPanelOpen(
                            !isNegativeTargetsFilterPanelOpen
                          )
                        }
                        className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                            isNegativeTargetsFilterPanelOpen ? "rotate-180" : ""
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
                  {isNegativeTargetsFilterPanelOpen && (
                    <div className="mb-4">
                      <FilterPanel
                        isOpen={true}
                        onClose={() => {
                          setIsNegativeTargetsFilterPanelOpen(false);
                        }}
                        onApply={(newFilters) => {
                          setNegativeTargetsFilters(newFilters);
                          setNegativeTargetsCurrentPage(1); // Reset to first page when applying filters
                          // Data will refresh automatically via useEffect dependency on negativeTargetsFilters
                        }}
                        initialFilters={negativeTargetsFilters}
                        filterFields={[
                          { value: "expression", label: "Expression" },
                          { value: "state", label: "Status" },
                        ]}
                        useUppercaseState={true}
                      />
                    </div>
                  )}

                  {/* Create Negative Target Panel */}
                  {isCreateNegativeTargetPanelOpen && (
                    <CreateNegativeTargetPanel
                      isOpen={isCreateNegativeTargetPanelOpen}
                      campaignType={campaignType}
                      onClose={() => {
                        setIsCreateNegativeTargetPanelOpen(false);
                        // Reset error states when closing
                        setCreateNegativeTargetError(null);
                        setCreateNegativeTargetFieldErrors({});
                        setCreatedNegativeTargets([]);
                        setFailedNegativeTargetCount(0);
                        setFailedNegativeTargets([]);
                      }}
                      onSubmit={handleCreateNegativeTargets}
                      adgroups={(allAdgroups.length > 0
                        ? allAdgroups
                        : adgroups
                      ).map((ag) => ({
                        adGroupId: ag.adGroupId || String(ag.id),
                        name: ag.name,
                      }))}
                      campaignId={campaignId || ""}
                      loading={createNegativeTargetLoading}
                      submitError={createNegativeTargetError}
                      fieldErrors={createNegativeTargetFieldErrors}
                      createdNegativeTargets={createdNegativeTargets}
                      failedCount={failedNegativeTargetCount}
                      failedNegativeTargets={failedNegativeTargets}
                    />
                  )}

                  <NegativeTargetsTable
                    negativeTargets={negativeTargets}
                    loading={negativeTargetsLoading}
                    onSelectAll={handleSelectAllNegativeTargets}
                    onSelect={handleSelectNegativeTarget}
                    selectedIds={selectedNegativeTargetIds}
                    sortBy={negativeTargetsSortBy}
                    sortOrder={negativeTargetsSortOrder}
                    onSort={handleNegativeTargetsSort}
                    editingField={editingNegativeTargetField}
                    editedValue={editedNegativeTargetValue}
                    onEditStart={handleNegativeTargetEditStart}
                    onEditChange={handleNegativeTargetEditChange}
                    onEditEnd={handleNegativeTargetEditEnd}
                    onEditCancel={handleNegativeTargetEditCancel}
                    inlineEditLoading={negativeTargetEditLoading}
                    pendingChange={pendingNegativeTargetChange}
                  />
                </div>
                {/* Pagination */}
                {!negativeTargetsLoading &&
                  negativeTargets.length > 0 &&
                  negativeTargetsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleNegativeTargetsPageChange(
                              Math.max(1, negativeTargetsCurrentPage - 1)
                            )
                          }
                          disabled={negativeTargetsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, negativeTargetsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (negativeTargetsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (negativeTargetsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              negativeTargetsCurrentPage >=
                              negativeTargetsTotalPages - 2
                            ) {
                              pageNum = negativeTargetsTotalPages - 4 + i;
                            } else {
                              pageNum = negativeTargetsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() =>
                                  handleNegativeTargetsPageChange(pageNum)
                                }
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  negativeTargetsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {negativeTargetsTotalPages > 5 &&
                          negativeTargetsCurrentPage <
                            negativeTargetsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {negativeTargetsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleNegativeTargetsPageChange(
                                negativeTargetsTotalPages
                              )
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              negativeTargetsCurrentPage ===
                              negativeTargetsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {negativeTargetsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleNegativeTargetsPageChange(
                              Math.min(
                                negativeTargetsTotalPages,
                                negativeTargetsCurrentPage + 1
                              )
                            )
                          }
                          disabled={
                            negativeTargetsCurrentPage ===
                            negativeTargetsTotalPages
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

            {activeTab === "Assets" && (
              <>
                {/* Header with Filter Button and Create Asset Button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Assets
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Create Asset Button */}
                    <button
                      onClick={() => {
                        setIsCreateAssetPanelOpen(!isCreateAssetPanelOpen);
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
                      Create Asset
                      <svg
                        className={`w-4 h-4 !text-white transition-transform ${
                          isCreateAssetPanelOpen ? "rotate-180" : ""
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
                        setIsAssetsFilterPanelOpen(!isAssetsFilterPanelOpen)
                      }
                      className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
                        Filter
                      </span>
                    </button>
                  </div>
                </div>

                {/* Create Asset Panel */}
                {isCreateAssetPanelOpen && (
                  <CreateAssetPanel
                    isOpen={isCreateAssetPanelOpen}
                    onClose={() => {
                      setIsCreateAssetPanelOpen(false);
                      setCreateAssetError(null);
                      setCreateAssetFieldErrors({});
                    }}
                    onSubmit={handleCreateAsset}
                    accountId={accountId}
                    profileId={
                      campaignDetail?.campaign?.profile_id || undefined
                    }
                    loading={createAssetLoading}
                    submitError={createAssetError}
                    fieldErrors={createAssetFieldErrors}
                  />
                )}

                {/* Filter Panel */}
                {isAssetsFilterPanelOpen && (
                  <div className="mb-4">
                    <FilterPanel
                      isOpen={true}
                      onClose={() => {
                        setIsAssetsFilterPanelOpen(false);
                      }}
                      onApply={(newFilters) => {
                        setAssetsFilters(newFilters);
                        setAssetsCurrentPage(1);
                      }}
                      initialFilters={assetsFilters}
                      filterFields={[
                        { value: "mediaType", label: "Media Type" },
                        { value: "brandEntityId", label: "Brand Entity ID" },
                      ]}
                    />
                  </div>
                )}

                <div className="mb-4">
                  <AssetsTable
                    assets={assets}
                    loading={assetsLoading}
                    onSelectAll={handleSelectAllAssets}
                    onSelect={handleSelectAsset}
                    selectedIds={selectedAssetIds}
                    sortBy={assetsSortBy}
                    sortOrder={assetsSortOrder}
                    onSort={handleAssetsSort}
                  />
                </div>

                {/* Pagination */}
                {!assetsLoading &&
                  assets.length > 0 &&
                  assetsTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleAssetsPageChange(
                              Math.max(1, assetsCurrentPage - 1)
                            )
                          }
                          disabled={assetsCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, assetsTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (assetsTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (assetsCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              assetsCurrentPage >=
                              assetsTotalPages - 2
                            ) {
                              pageNum = assetsTotalPages - 4 + i;
                            } else {
                              pageNum = assetsCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handleAssetsPageChange(pageNum)}
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  assetsCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {assetsTotalPages > 5 &&
                          assetsCurrentPage < assetsTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {assetsTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleAssetsPageChange(assetsTotalPages)
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              assetsCurrentPage === assetsTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {assetsTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleAssetsPageChange(
                              Math.min(assetsTotalPages, assetsCurrentPage + 1)
                            )
                          }
                          disabled={assetsCurrentPage === assetsTotalPages}
                          className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}

            {activeTab === "Logs" && (
              <div className="mt-6">
                <LogsTable
                  accountId={accountId}
                  campaignId={campaignId}
                  showHeader={false}
                  showExport={true}
                />
              </div>
            )}

            {activeTab !== "Overview" &&
              activeTab !== "Ad Groups" &&
              activeTab !== "Keywords" &&
              activeTab !== "Product Ads" &&
              activeTab !== "Ads Collection" &&
              activeTab !== "Targets" &&
              activeTab !== "Negative Keywords" &&
              activeTab !== "Negative Targets" &&
              activeTab !== "Assets" &&
              activeTab !== "Logs" && (
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

      {/* Confirmation Modal for Keywords Bulk Actions */}
      {/* Bulk Actions Confirmation Modal - Only show when NOT doing inline edit */}
      {showKeywordsConfirmationModal &&
        !pendingKeywordChange &&
        (pendingKeywordsStatusAction || selectedKeywordIds.size > 0) && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
              onClick={() => {
                if (!keywordsBulkLoading) {
                  setShowKeywordsConfirmationModal(false);
                  setPendingKeywordsStatusAction(null);
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
                    {pendingKeywordsStatusAction
                      ? `Are you sure you want to ${
                          pendingKeywordsStatusAction === "enable"
                            ? "enable"
                            : "pause"
                        } ${selectedKeywordIds.size} keyword(s)?`
                      : `Are you sure you want to update the bid for ${selectedKeywordIds.size} keyword(s)?`}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeywordsConfirmationModal(false);
                      setPendingKeywordsStatusAction(null);
                    }}
                    disabled={keywordsBulkLoading}
                    className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingKeywordsStatusAction) {
                        await handleBulkKeywordsStatus(
                          pendingKeywordsStatusAction
                        );
                      } else {
                        await handleBulkKeywordsBid();
                      }
                    }}
                    disabled={keywordsBulkLoading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {keywordsBulkLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal for Keywords */}
      {showKeywordsDeleteConfirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!keywordsDeleteLoading) {
                setShowKeywordsDeleteConfirmation(false);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Delete
                </h3>
                <p className="text-[14px] text-[#556179]">
                  Are you sure you want to archive {selectedKeywordIds.size}{" "}
                  selected keyword{selectedKeywordIds.size !== 1 ? "s" : ""}?
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowKeywordsDeleteConfirmation(false);
                  }}
                  disabled={keywordsDeleteLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkKeywordsArchive}
                  disabled={keywordsDeleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[11.2px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {keywordsDeleteLoading ? "Archiving..." : "Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Product Ads */}
      {showProductAdsDeleteConfirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!productAdsDeleteLoading) {
                setShowProductAdsDeleteConfirmation(false);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Delete
                </h3>
                <p className="text-[14px] text-[#556179]">
                  Are you sure you want to delete {selectedProductAdIds.size}{" "}
                  selected product ad
                  {selectedProductAdIds.size !== 1 ? "s" : ""}? This action
                  cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductAdsDeleteConfirmation(false);
                  }}
                  disabled={productAdsDeleteLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkProductAdsDelete}
                  disabled={productAdsDeleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[11.2px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {productAdsDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Ad Groups */}
      {showAdGroupsDeleteConfirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!adGroupsDeleteLoading) {
                setShowAdGroupsDeleteConfirmation(false);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Delete
                </h3>
                <p className="text-[14px] text-[#556179]">
                  Are you sure you want to delete {selectedAdGroupIds.size}{" "}
                  selected ad group{selectedAdGroupIds.size !== 1 ? "s" : ""}?
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdGroupsDeleteConfirmation(false);
                  }}
                  disabled={adGroupsDeleteLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAdGroupsDelete}
                  disabled={adGroupsDeleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[11.2px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adGroupsDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Targets */}
      {showTargetsDeleteConfirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!targetsDeleteLoading) {
                setShowTargetsDeleteConfirmation(false);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Delete
                </h3>
                <p className="text-[14px] text-[#556179]">
                  Are you sure you want to delete {selectedTargetIds.size}{" "}
                  selected target{selectedTargetIds.size !== 1 ? "s" : ""}? This
                  action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetsDeleteConfirmation(false);
                  }}
                  disabled={targetsDeleteLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkTargetsDelete}
                  disabled={targetsDeleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[11.2px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {targetsDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Negative Keywords */}
      {showNegativeKeywordsDeleteConfirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!negativeKeywordsDeleteLoading) {
                setShowNegativeKeywordsDeleteConfirmation(false);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Delete
                </h3>
                <p className="text-[14px] text-[#556179]">
                  Are you sure you want to delete{" "}
                  {selectedNegativeKeywordIds.size} selected negative keyword
                  {selectedNegativeKeywordIds.size !== 1 ? "s" : ""}? This
                  action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNegativeKeywordsDeleteConfirmation(false);
                  }}
                  disabled={negativeKeywordsDeleteLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkNegativeKeywordsDelete}
                  disabled={negativeKeywordsDeleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[11.2px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {negativeKeywordsDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Negative Targets */}
      {showNegativeTargetsDeleteConfirmation && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!negativeTargetsDeleteLoading) {
                setShowNegativeTargetsDeleteConfirmation(false);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
                  Confirm Delete
                </h3>
                <p className="text-[14px] text-[#556179]">
                  Are you sure you want to delete{" "}
                  {selectedNegativeTargetIds.size} selected negative target
                  {selectedNegativeTargetIds.size !== 1 ? "s" : ""}? This action
                  cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNegativeTargetsDeleteConfirmation(false);
                  }}
                  disabled={negativeTargetsDeleteLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkNegativeTargetsDelete}
                  disabled={negativeTargetsDeleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[11.2px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {negativeTargetsDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Targets Bulk Actions */}
      {showTargetsConfirmationModal && 
       !pendingTargetChange && 
       (pendingTargetsStatusAction || selectedTargetIds.size > 0) && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
            onClick={() => {
              if (!targetsBulkLoading) {
                setShowTargetsConfirmationModal(false);
                setPendingTargetsStatusAction(null);
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
                  {pendingTargetsStatusAction
                    ? `Are you sure you want to ${
                        pendingTargetsStatusAction === "enable"
                          ? "enable"
                          : "pause"
                      } ${selectedTargetIds.size} target(s)?`
                    : `Are you sure you want to update the bid for ${selectedTargetIds.size} target(s)?`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetsConfirmationModal(false);
                    setPendingTargetsStatusAction(null);
                  }}
                  disabled={targetsBulkLoading}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (pendingTargetsStatusAction) {
                      await handleBulkTargetsStatus(pendingTargetsStatusAction);
                    } else {
                      await handleBulkTargetsBid();
                    }
                  }}
                  disabled={targetsBulkLoading}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {targetsBulkLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Negative Keywords Bulk Actions */}
      {showNegativeKeywordsConfirmationModal &&
        pendingNegativeKeywordsStatusAction && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
              onClick={() => {
                if (!negativeKeywordsBulkLoading) {
                  setShowNegativeKeywordsConfirmationModal(false);
                  setPendingNegativeKeywordsStatusAction(null);
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
                    {pendingNegativeKeywordsStatusAction
                      ? `Are you sure you want to ${
                          pendingNegativeKeywordsStatusAction === "enable"
                            ? "enable"
                            : "pause"
                        } ${
                          selectedNegativeKeywordIds.size
                        } negative keyword(s)?`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNegativeKeywordsConfirmationModal(false);
                      setPendingNegativeKeywordsStatusAction(null);
                    }}
                    disabled={negativeKeywordsBulkLoading}
                    className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingNegativeKeywordsStatusAction) {
                        await handleBulkNegativeKeywordsStatus(
                          pendingNegativeKeywordsStatusAction
                        );
                      }
                    }}
                    disabled={negativeKeywordsBulkLoading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {negativeKeywordsBulkLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Confirmation Modal for Negative Targets Bulk Actions */}
      {showNegativeTargetsConfirmationModal &&
        pendingNegativeTargetsStatusAction && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
              onClick={() => {
                if (!negativeTargetsBulkLoading) {
                  setShowNegativeTargetsConfirmationModal(false);
                  setPendingNegativeTargetsStatusAction(null);
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
                    {pendingNegativeTargetsStatusAction
                      ? `Are you sure you want to ${
                          pendingNegativeTargetsStatusAction === "enable"
                            ? "enable"
                            : "pause"
                        } ${selectedNegativeTargetIds.size} negative target(s)?`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNegativeTargetsConfirmationModal(false);
                      setPendingNegativeTargetsStatusAction(null);
                    }}
                    disabled={negativeTargetsBulkLoading}
                    className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingNegativeTargetsStatusAction) {
                        await handleBulkNegativeTargetsStatus(
                          pendingNegativeTargetsStatusAction
                        );
                      }
                    }}
                    disabled={negativeTargetsBulkLoading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {negativeTargetsBulkLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    : campaignType !== "SB"
                    ? `Are you sure you want to update the default bid for ${selectedAdGroupIds.size} ad group(s)?`
                    : ""}
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
                    } else if (campaignType !== "SB") {
                      // Only allow default bid edit for non-SB campaigns
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

      {/* Inline Edit Confirmation Modal for Ad Groups */}
      {pendingAdGroupChange &&
        (() => {
          const adgroup = adgroups.find(
            (ag) => ag.id === pendingAdGroupChange.id
          );
          const adgroupName = adgroup?.name || "Unnamed Ad Group";
          const fieldLabel =
            pendingAdGroupChange.field === "status"
              ? "Status"
              : pendingAdGroupChange.field === "default_bid"
              ? "Default Bid"
              : "Name";

          // Format old value
          let oldValueDisplay = "";
          if (pendingAdGroupChange.field === "default_bid") {
            oldValueDisplay = pendingAdGroupChange.oldValue.startsWith("$")
              ? pendingAdGroupChange.oldValue
              : `$${parseFloat(
                  pendingAdGroupChange.oldValue || "0"
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
          } else if (pendingAdGroupChange.field === "status") {
            oldValueDisplay =
              pendingAdGroupChange.oldValue === "enabled"
                ? "Enabled"
                : pendingAdGroupChange.oldValue === "paused"
                ? "Paused"
                : pendingAdGroupChange.oldValue === "archived"
                ? "Archived"
                : pendingAdGroupChange.oldValue;
          } else {
            // name
            oldValueDisplay = pendingAdGroupChange.oldValue || "—";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingAdGroupChange.field === "default_bid") {
            newValueDisplay = pendingAdGroupChange.newValue.startsWith("$")
              ? pendingAdGroupChange.newValue
              : `$${parseFloat(
                  pendingAdGroupChange.newValue || "0"
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
          } else if (pendingAdGroupChange.field === "status") {
            newValueDisplay =
              pendingAdGroupChange.newValue === "enabled"
                ? "Enabled"
                : pendingAdGroupChange.newValue === "paused"
                ? "Paused"
                : pendingAdGroupChange.newValue === "archived"
                ? "Archived"
                : pendingAdGroupChange.newValue;
          } else {
            // name
            newValueDisplay = pendingAdGroupChange.newValue || "—";
          }

          return (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !adGroupEditLoading.has(pendingAdGroupChange.id)
                ) {
                  cancelAdGroupChange();
                }
              }}
            >
              <div
                className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                  Confirm {fieldLabel} Change
                </h3>

                <div className="mb-4">
                  <p className="text-[12.16px] text-[#556179] mb-2">
                    Ad Group:{" "}
                    <span className="font-semibold text-[#072929]">
                      {adgroupName}
                    </span>
                  </p>
                  <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[12.16px] text-[#556179]">
                        {fieldLabel}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.16px] text-[#556179]">
                          {oldValueDisplay}
                        </span>
                        <span className="text-[12.16px] text-[#556179]">→</span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {newValueDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelAdGroupChange}
                    disabled={adGroupEditLoading.has(pendingAdGroupChange.id)}
                    className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAdGroupChange}
                    disabled={adGroupEditLoading.has(pendingAdGroupChange.id)}
                    className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                  >
                    {adGroupEditLoading.has(pendingAdGroupChange.id)
                      ? "Updating..."
                      : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Inline Edit Confirmation Modal for Keywords */}
      {pendingKeywordChange &&
        showKeywordsConfirmationModal &&
        (() => {
          const keyword = keywords.find(
            (kw) => kw.id === pendingKeywordChange.id
          );
          const keywordName = keyword?.name || "Unnamed Keyword";
          const fieldLabel =
            pendingKeywordChange.field === "status" ? "Status" : "Bid";

          // Format old value
          let oldValueDisplay = "";
          if (pendingKeywordChange.field === "bid") {
            oldValueDisplay = pendingKeywordChange.oldValue.startsWith("$")
              ? pendingKeywordChange.oldValue
              : `$${parseFloat(
                  pendingKeywordChange.oldValue || "0"
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
          } else if (pendingKeywordChange.field === "status") {
            oldValueDisplay =
              pendingKeywordChange.oldValue === "enabled"
                ? "Enabled"
                : pendingKeywordChange.oldValue === "paused"
                ? "Paused"
                : "Archived";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingKeywordChange.field === "bid") {
            newValueDisplay = `$${parseFloat(
              pendingKeywordChange.newValue || "0"
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          } else if (pendingKeywordChange.field === "status") {
            const newValueLower = pendingKeywordChange.newValue.toLowerCase();
            newValueDisplay =
              newValueLower === "enabled"
                ? "Enabled"
                : newValueLower === "paused"
                ? "Paused"
                : newValueLower === "archive"
                ? "Archived"
                : "Archived";
          }

          return (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !keywordEditLoading.has(pendingKeywordChange.id)
                ) {
                  cancelKeywordChange();
                }
              }}
            >
              <div
                className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                  Confirm {fieldLabel} Change
                </h3>

                <div className="mb-4">
                  <p className="text-[12.16px] text-[#556179] mb-2">
                    Keyword:{" "}
                    <span className="font-semibold text-[#072929]">
                      {keywordName}
                    </span>
                  </p>
                  <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[12.16px] text-[#556179]">
                        {fieldLabel}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.16px] text-[#556179]">
                          {oldValueDisplay}
                        </span>
                        <span className="text-[12.16px] text-[#556179]">→</span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {newValueDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelKeywordChange}
                    disabled={keywordEditLoading.has(pendingKeywordChange.id)}
                    className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmKeywordChange}
                    disabled={keywordEditLoading.has(pendingKeywordChange.id)}
                    className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                  >
                    {keywordEditLoading.has(pendingKeywordChange.id)
                      ? "Updating..."
                      : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Inline Edit Confirmation Modal for Negative Keywords */}
      {pendingNegativeKeywordChange &&
        showNegativeKeywordsConfirmationModal &&
        (() => {
          const negativeKeyword = negativeKeywords.find(
            (nkw) => nkw.id === pendingNegativeKeywordChange.id
          );
          const keywordText =
            negativeKeyword?.keywordText || "Unnamed Negative Keyword";
          const fieldLabel = "Status";

          // Format old value
          let oldValueDisplay = "";
          if (pendingNegativeKeywordChange.field === "status") {
            oldValueDisplay =
              pendingNegativeKeywordChange.oldValue === "enabled"
                ? "Enabled"
                : "Paused";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingNegativeKeywordChange.field === "status") {
            newValueDisplay =
              pendingNegativeKeywordChange.newValue === "enabled"
                ? "Enabled"
                : "Paused";
          }

          return (
            <div className="fixed inset-0 z-[400] flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
                onClick={() => {
                  if (
                    !negativeKeywordEditLoading.has(
                      pendingNegativeKeywordChange.id
                    )
                  ) {
                    cancelNegativeKeywordChange();
                  }
                }}
              />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
                <div className="p-6">
                  <h3 className="text-[20px] font-semibold text-[#072929] mb-4">
                    Confirm {fieldLabel} Change
                  </h3>

                  <div className="mb-4">
                    <p className="text-[12.16px] text-[#556179] mb-2">
                      Negative Keyword:{" "}
                      <span className="font-semibold text-[#072929]">
                        {keywordText}
                      </span>
                    </p>
                    <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[12.16px] text-[#556179]">
                          {fieldLabel}:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12.16px] text-[#556179]">
                            {oldValueDisplay}
                          </span>
                          <span className="text-[12.16px] text-[#556179]">
                            →
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            {newValueDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelNegativeKeywordChange}
                      disabled={negativeKeywordEditLoading.has(
                        pendingNegativeKeywordChange.id
                      )}
                      className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmNegativeKeywordChange}
                      disabled={negativeKeywordEditLoading.has(
                        pendingNegativeKeywordChange.id
                      )}
                      className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                    >
                      {negativeKeywordEditLoading.has(
                        pendingNegativeKeywordChange.id
                      )
                        ? "Updating..."
                        : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Inline Edit Confirmation Modal for Targets */}
      {pendingTargetChange &&
        showTargetsConfirmationModal &&
        (() => {
          const target = targets.find(
            (tgt) => tgt.id === pendingTargetChange.id
          );
          const targetName = target?.name || "Unnamed Target";
          const fieldLabel =
            pendingTargetChange.field === "status" ? "Status" : "Bid";

          // Format old value
          let oldValueDisplay = "";
          if (pendingTargetChange.field === "bid") {
            oldValueDisplay = pendingTargetChange.oldValue.startsWith("$")
              ? pendingTargetChange.oldValue
              : `$${parseFloat(
                  pendingTargetChange.oldValue || "0"
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
          } else if (pendingTargetChange.field === "status") {
            oldValueDisplay =
              pendingTargetChange.oldValue === "enabled" ? "Enabled" : "Paused";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingTargetChange.field === "bid") {
            newValueDisplay = `$${parseFloat(
              pendingTargetChange.newValue || "0"
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          } else if (pendingTargetChange.field === "status") {
            newValueDisplay =
              pendingTargetChange.newValue === "enabled" ? "Enabled" : "Paused";
          }

          return (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !targetEditLoading.has(pendingTargetChange.id)
                ) {
                  cancelTargetChange();
                }
              }}
            >
              <div
                className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                  Confirm {fieldLabel} Change
                </h3>

                <div className="mb-4">
                  <p className="text-[12.16px] text-[#556179] mb-2">
                    Target:{" "}
                    <span className="font-semibold text-[#072929]">
                      {targetName}
                    </span>
                  </p>
                  <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[12.16px] text-[#556179]">
                        {fieldLabel}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.16px] text-[#556179]">
                          {oldValueDisplay}
                        </span>
                        <span className="text-[12.16px] text-[#556179]">→</span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {newValueDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelTargetChange}
                    disabled={targetEditLoading.has(pendingTargetChange.id)}
                    className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmTargetChange}
                    disabled={targetEditLoading.has(pendingTargetChange.id)}
                    className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                  >
                    {targetEditLoading.has(pendingTargetChange.id)
                      ? "Updating..."
                      : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Inline Edit Confirmation Modal for Negative Targets */}
      {pendingNegativeTargetChange &&
        showNegativeTargetsConfirmationModal &&
        (() => {
          const negativeTarget = negativeTargets.find(
            (ntg) => ntg.id === pendingNegativeTargetChange.id
          );
          const targetId =
            negativeTarget?.targetId || "Unnamed Negative Target";
          const fieldLabel = "Status";

          // Format old value
          let oldValueDisplay = "";
          if (pendingNegativeTargetChange.field === "status") {
            oldValueDisplay =
              pendingNegativeTargetChange.oldValue === "enabled"
                ? "Enabled"
                : "Paused";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingNegativeTargetChange.field === "status") {
            newValueDisplay =
              pendingNegativeTargetChange.newValue.toUpperCase() === "ENABLED"
                ? "Enabled"
                : "Paused";
          }

          return (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !negativeTargetEditLoading.has(pendingNegativeTargetChange.id)
                ) {
                  cancelNegativeTargetChange();
                }
              }}
            >
              <div
                className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                  Confirm {fieldLabel} Change
                </h3>

                <div className="mb-4">
                  <p className="text-[12.16px] text-[#556179] mb-2">
                    Negative Target:{" "}
                    <span className="font-semibold text-[#072929]">
                      {targetId}
                    </span>
                  </p>
                  <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[12.16px] text-[#556179]">
                        {fieldLabel}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.16px] text-[#556179]">
                          {oldValueDisplay}
                        </span>
                        <span className="text-[12.16px] text-[#556179]">→</span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {newValueDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelNegativeTargetChange}
                    disabled={negativeTargetEditLoading.has(
                      pendingNegativeTargetChange.id
                    )}
                    className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmNegativeTargetChange}
                    disabled={negativeTargetEditLoading.has(
                      pendingNegativeTargetChange.id
                    )}
                    className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                  >
                    {negativeTargetEditLoading.has(
                      pendingNegativeTargetChange.id
                    )
                      ? "Updating..."
                      : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Delete Confirmation Modal for SB Ads */}
      {showSBAdsDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm Delete
            </h3>
            <p className="text-[12.16px] text-[#556179] mb-6">
              Are you sure you want to delete {selectedSBAdIds.size} ad(s)? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSBAdsDeleteConfirmation(false)}
                disabled={sbAdsDeleteLoading}
                className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSBAdsDelete}
                disabled={sbAdsDeleteLoading}
                className="px-4 py-2 text-[12.16px] text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {sbAdsDeleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
