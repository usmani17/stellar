import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { KPICard } from "../components/ui/KPICard";
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
import { ProductAdsTable } from "../components/campaigns/ProductAdsTable";
import { SBAdsTable, type SBAd } from "../components/campaigns/SBAdsTable";
import { AssetsTable, type Asset } from "../components/campaigns/AssetsTable";
import { AssetPreviewModal } from "../components/campaigns/AssetPreviewModal";
import {
  CreativesTable,
  type Creative,
} from "../components/campaigns/CreativesTable";
import { NegativeKeywordsTable } from "../components/campaigns/NegativeKeywordsTable";
import { NegativeTargetsTable } from "../components/campaigns/NegativeTargetsTable";
import { LogsTable } from "../components/campaigns/LogsTable";
import {
  FilterPanel,
  type FilterValues,
} from "../components/filters/FilterPanel";
import { type AdGroupInput } from "../components/adgroups/CreateAdGroupPanel";
import { type KeywordInput } from "../components/keywords/CreateKeywordPanel";
import { type TargetInput } from "../components/targets/CreateTargetPanel";
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
import {
  CreateCreativePanel,
  type CreativeInput,
} from "../components/creatives/CreateCreativePanel";
import { ErrorModal } from "../components/ui/ErrorModal";
import { Tooltip } from "../components/ui/Tooltip";
import { Button } from "../components/ui";
import { Dropdown } from "../components/ui/Dropdown";
import {
  OverviewTab,
  AdGroupsTab,
  KeywordsTab,
  TargetsTab,
  NegativeKeywordsTab,
} from "./campaigns/components/tabs";
import { CampaignInformation } from "./campaigns/components/CampaignInformation";

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
  const [isAdGroupsBidChange, setIsAdGroupsBidChange] = useState(false);
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
  const [pendingProductAdsStatusAction, setPendingProductAdsStatusAction] =
    useState<"enable" | "pause" | "archive" | null>(null);
  const [
    showProductAdsStatusConfirmation,
    setShowProductAdsStatusConfirmation,
  ] = useState(false);
  const [productAdsBulkLoading, setProductAdsBulkLoading] = useState(false);
  const productAdsBulkActionsRef = useRef<HTMLDivElement>(null);

  // Target bulk edit state
  const [showTargetsBulkActions, setShowTargetsBulkActions] = useState(false);
  const [showTargetsBidPanel, setShowTargetsBidPanel] = useState(false);
  const [pendingTargetsStatusAction, setPendingTargetsStatusAction] = useState<
    "enable" | "pause" | "archive" | null
  >(null);
  const [isTargetsBidChange, setIsTargetsBidChange] = useState(false);
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
  const [pendingSBAdsStatusAction, setPendingSBAdsStatusAction] = useState<
    "enable" | "pause" | null
  >(null);
  const [showSBAdsConfirmationModal, setShowSBAdsConfirmationModal] =
    useState(false);

  // SB Ad inline edit state
  const [editingSBAdField, setEditingSBAdField] = useState<{
    id: number;
    field: "status" | "name";
  } | null>(null);
  const [editedSBAdValue, setEditedSBAdValue] = useState<string>("");
  const [sbAdEditLoading, setSbAdEditLoading] = useState<Set<number>>(
    new Set()
  );
  const [pendingSBAdChange, setPendingSBAdChange] = useState<{
    id: number;
    field: "status" | "name";
    newValue: string;
    oldValue: string;
  } | null>(null);

  // Assets state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [createAssetLoading, setCreateAssetLoading] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(
    new Set()
  );
  const [assetsCurrentPage, setAssetsCurrentPage] = useState(1);
  const [assetsTotalPages, setAssetsTotalPages] = useState(0);
  const [assetsSortBy, setAssetsSortBy] = useState<string>("creationTime");
  const [assetsSortOrder, setAssetsSortOrder] = useState<"asc" | "desc">(
    "desc"
  );
  const [isAssetsFilterPanelOpen, setIsAssetsFilterPanelOpen] = useState(false);
  const [assetsFilters, setAssetsFilters] = useState<FilterValues>([]);
  const [isCreateAssetPanelOpen, setIsCreateAssetPanelOpen] = useState(false);
  const [createAssetError, setCreateAssetError] = useState<string | null>(null);
  const [createAssetFieldErrors, setCreateAssetFieldErrors] = useState<
    Record<string, string>
  >({});

  // Creatives state
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [createCreativeLoading, setCreateCreativeLoading] = useState(false);
  const [selectedCreativeIds, setSelectedCreativeIds] = useState<Set<number>>(
    new Set()
  );
  const [creativesCurrentPage, setCreativesCurrentPage] = useState(1);
  const [creativesTotalPages, setCreativesTotalPages] = useState(0);
  const [creativesSortBy, setCreativesSortBy] = useState<string>("id");
  const [creativesSortOrder, setCreativesSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isCreateCreativePanelOpen, setIsCreateCreativePanelOpen] =
    useState(false);
  const [createCreativeError, setCreateCreativeError] = useState<string | null>(
    null
  );
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);

  // Asset preview modal state
  const [isAssetPreviewModalOpen, setIsAssetPreviewModalOpen] = useState(false);
  const [assetPreviewUrl, setAssetPreviewUrl] = useState<string | null>(null);
  const [assetPreviewContentType, setAssetPreviewContentType] = useState<
    string | null
  >(null);
  const [assetPreviewLoading, setAssetPreviewLoading] = useState(false);
  const [assetPreviewError, setAssetPreviewError] = useState<string | null>(
    null
  );

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
  ] = useState<"enable" | "pause" | "archive" | null>(null);
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
    fieldErrors?: Record<string, string>;
    genericErrors?: string[];
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

  // Product Ad inline edit state
  const [editingProductAdField, setEditingProductAdField] = useState<{
    id: number;
    field: "status";
  } | null>(null);
  const [editedProductAdValue, setEditedProductAdValue] = useState<string>("");
  const [pendingProductAdChange, setPendingProductAdChange] = useState<{
    id: number;
    field: "status";
    newValue: string;
    oldValue: string;
  } | null>(null);
  const [productAdEditLoading, setProductAdEditLoading] = useState<Set<number>>(
    new Set()
  );
  const [showProductAdsConfirmationModal, setShowProductAdsConfirmationModal] =
    useState(false);

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
    "Creatives",
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
    // Show Assets for SB and SD campaigns
    if (campaignType === "SB") {
      filteredTabs = filteredTabs.filter((tab) => tab !== "Product Ads");
    } else if (campaignType === "SP") {
      filteredTabs = filteredTabs.filter(
        (tab) => tab !== "Ads Collection" && tab !== "Assets"
      );
    } else {
      // SD campaigns - hide Ads Collection, but show Product Ads and Assets
      filteredTabs = filteredTabs.filter((tab) => tab !== "Ads Collection");
    }

    // For AUTO campaigns, hide Keywords and Targets tabs completely (as per user requirement)
    // But show Negative Keywords and Negative Targets before Logs
    if (campaignType === "SP" && isAutoCampaign) {
      filteredTabs = filteredTabs.filter(
        (tab) => tab !== "Keywords" && tab !== "Targets" && tab !== "Creatives"
      );
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
      if (
        negativeKeywordsIndex !== -1 &&
        !filteredTabs.includes("Negative Targets")
      ) {
        filteredTabs.splice(negativeKeywordsIndex + 1, 0, "Negative Targets");
      }
      // Hide Creatives tab for SB campaigns
      filteredTabs = filteredTabs.filter((tab) => tab !== "Creatives");
    } else if (campaignType === "SD") {
      // For SD campaigns, show Negative Targets tab (but not Negative Keywords since SD doesn't have keywords)
      // Insert Negative Targets right after Targets if not already present
      const targetsIndex = filteredTabs.indexOf("Targets");
      if (targetsIndex !== -1 && !filteredTabs.includes("Negative Targets")) {
        filteredTabs.splice(targetsIndex + 1, 0, "Negative Targets");
      }
      // Insert Creatives tab right after Assets if not already present
      const assetsIndex = filteredTabs.indexOf("Assets");
      if (assetsIndex !== -1 && !filteredTabs.includes("Creatives")) {
        filteredTabs.splice(assetsIndex + 1, 0, "Creatives");
      }
      // Hide Negative Keywords for SD campaigns
      filteredTabs = filteredTabs.filter((tab) => tab !== "Negative Keywords");
    } else {
      // For non-auto SP campaigns and other types, hide Negative Keywords, Negative Targets, and Creatives
      filteredTabs = filteredTabs.filter(
        (tab) =>
          tab !== "Negative Keywords" &&
          tab !== "Negative Targets" &&
          tab !== "Creatives"
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
    // Hide Targets tab for auto SP campaigns - switch to Overview if active
    if (campaignType === "SP" && isAutoCampaign && activeTab === "Targets") {
      setActiveTab("Overview");
    }
  }, [isAutoCampaign, hasKeywords, hasTargets, activeTab, campaignType]);

  useEffect(() => {
    if (accountId && campaignId) {
      loadCampaignDetail();
      // Load all adgroups when page first opens to ensure they're available for all tabs
      loadAllAdGroups();
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

  const buildSBAdsFilterParams = (filterList: FilterValues) => {
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
      } else if (filter.field === "status") {
        // Convert frontend status values to backend values
        const statusMap: Record<string, string> = {
          Enabled: "enabled",
          Paused: "paused",
          enabled: "enabled",
          paused: "paused",
          ENABLED: "enabled",
          PAUSED: "paused",
        };
        params.status = statusMap[filter.value as string] || filter.value;
        // Also support state for backward compatibility
        params.state = statusMap[filter.value as string] || filter.value;
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

  // Load assets when Assets tab is active (for SB and SD campaigns)
  useEffect(() => {
    if (
      accountId &&
      activeTab === "Assets" &&
      (campaignType === "SB" || campaignType === "SD")
    ) {
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

  // Load creatives function
  const loadCreatives = async () => {
    if (!accountId || !campaignId || campaignType !== "SD") return;

    setCreativesLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await campaignsService.getSdCreatives(
        accountIdNum,
        campaignId,
        {
          sort_by: creativesSortBy,
          order: creativesSortOrder,
          page: creativesCurrentPage,
          page_size: 10,
        }
      );

      // Log raw response from API
      console.log(
        "[loadCreatives] Raw response from API:",
        JSON.stringify(response, null, 2)
      );
      console.log("[loadCreatives] Raw creatives array:", response.creatives);
      if (response.creatives && response.creatives.length > 0) {
        response.creatives.forEach((c: any, idx: number) => {
          console.log(`[loadCreatives] Raw Creative ${idx + 1}:`, {
            id: c.id,
            creativeId: c.creativeId,
            creativeIdType: typeof c.creativeId,
            creativeIdValue: String(c.creativeId),
            adGroupId: c.adGroupId,
          });
        });
      }

      // Parse properties from JSON string to object if needed
      const creatives = (response.creatives || []).map((creative: any) => {
        // Log BEFORE transformation
        const originalCreativeId = creative.creativeId;
        const originalCreativeIdType = typeof creative.creativeId;

        // Parse properties if it's a string
        if (creative.properties && typeof creative.properties === "string") {
          try {
            creative.properties = JSON.parse(creative.properties);
          } catch (e) {
            console.warn("Failed to parse properties JSON:", e);
          }
        }

        // Keep creativeId as string to preserve precision (JavaScript Number.MAX_SAFE_INTEGER is 2^53 - 1)
        // Large integers like 871570822017087826 lose precision if converted to number
        // We'll convert to number only when needed (e.g., for API calls)
        // For display and storage, keep as string

        // Ensure adGroupId is a number (not string)
        if (creative.adGroupId && typeof creative.adGroupId === "string") {
          creative.adGroupId = parseInt(creative.adGroupId, 10);
        }

        // Log AFTER transformation
        if (
          originalCreativeId !== creative.creativeId ||
          originalCreativeIdType !== typeof creative.creativeId
        ) {
          console.warn(
            `[loadCreatives] CreativeId changed during transformation:`,
            {
              original: originalCreativeId,
              originalType: originalCreativeIdType,
              after: creative.creativeId,
              afterType: typeof creative.creativeId,
            }
          );
        }

        return creative;
      });

      // Log final creatives
      console.log(
        "[loadCreatives] Final creatives after transformation:",
        creatives
      );
      creatives.forEach((c: any, idx: number) => {
        console.log(`[loadCreatives] Final Creative ${idx + 1}:`, {
          id: c.id,
          creativeId: c.creativeId,
          creativeIdType: typeof c.creativeId,
          creativeIdValue: String(c.creativeId),
        });
      });

      setCreatives(creatives);
      setCreativesTotalPages(response.total_pages || 0);
    } catch (error: any) {
      console.error("Failed to load creatives:", error);
      setCreatives([]);
      setCreativesTotalPages(0);
    } finally {
      setCreativesLoading(false);
    }
  };

  // Load creatives when Creatives tab is active (for SD campaigns)
  useEffect(() => {
    if (accountId && activeTab === "Creatives" && campaignType === "SD") {
      loadCreatives();
    }
  }, [
    accountId,
    activeTab,
    campaignType,
    campaignId,
    creativesCurrentPage,
    creativesSortBy,
    creativesSortOrder,
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

  // Load negative targets for auto campaigns, SB campaigns, and SD campaigns
  useEffect(() => {
    if (
      accountId &&
      campaignId &&
      activeTab === "Negative Targets" &&
      campaignType &&
      ((campaignType === "SP" && isAutoCampaign) ||
        campaignType === "SB" ||
        campaignType === "SD")
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

  // Load negative targets for auto campaigns, SB campaigns, and SD campaigns (with filters)
  useEffect(() => {
    if (
      accountId &&
      campaignId &&
      activeTab === "Negative Targets" &&
      campaignType &&
      ((campaignType === "SP" && isAutoCampaign) ||
        campaignType === "SB" ||
        campaignType === "SD")
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

      // Load all adgroups by paginating through all pages
      // This ensures we get all adgroups, not just the first 1000
      const allAdgroupsList: AdGroup[] = [];
      let page = 1;
      const pageSize = 1000; // Fetch in batches of 1000
      let hasMore = true;

      while (hasMore) {
        const data = await campaignsService.getAdGroups(
          accountIdNum,
          campaignId,
          startDate.toISOString().split("T")[0],
          endDate.toISOString().split("T")[0],
          {
            page: page,
            page_size: pageSize,
            sort_by: "name",
            order: "asc",
            type: campaignType || undefined,
          }
        );

        const adgroups = data.adgroups || [];
        allAdgroupsList.push(...adgroups);

        // Check if we've fetched all records
        const total = data.total || 0;
        if (adgroups.length === 0 || allAdgroupsList.length >= total) {
          hasMore = false;
        } else {
          page++;
        }
      }

      setAllAdgroups(allAdgroupsList);
      console.log(
        `[loadAllAdGroups] Loaded ${allAdgroupsList.length} adgroups for dropdown`
      );
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
          // Only include defaultBid for SP and SD campaigns (not SB)
          if (campaignType !== "SB" && ag.defaultBid !== undefined) {
            adgroupData.defaultBid = ag.defaultBid;
          }
          // Include SD-specific fields
          if (campaignType === "SD") {
            if (ag.bidOptimization) {
              adgroupData.bidOptimization = ag.bidOptimization;
            }
            if (ag.creativeType !== undefined) {
              adgroupData.creativeType = ag.creativeType; // Can be null
            }
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
    if (
      !accountId ||
      !campaignId ||
      (campaignType !== "SP" && campaignType !== "SB" && campaignType !== "SD")
    )
      return;

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
        } else if (campaignType === "SD") {
          // SD: Build expression based on structure type
          let expression: any[] = [];

          // Use the expression array if it's already built (from handleAddTarget)
          if (
            tgt.expression &&
            Array.isArray(tgt.expression) &&
            tgt.expression.length > 0
          ) {
            expression = tgt.expression;
          } else if (tgt.sdExpressionStructureType === "TargetingPredicate") {
            // TargetingPredicate: array of {type, value}
            if (tgt.expression && tgt.expression.length > 0) {
              expression = tgt.expression.map((expr: any) => ({
                type: expr.type,
                value: expr.value,
              }));
            }
          } else if (
            tgt.sdExpressionStructureType === "ContentTargetingPredicate"
          ) {
            // ContentTargetingPredicate: {type: "contentCategorySameAs", value: category}
            if (tgt.sdContentCategory) {
              expression = [
                {
                  type: "contentCategorySameAs",
                  value: tgt.sdContentCategory,
                },
              ];
            }
          } else if (
            tgt.sdExpressionStructureType === "TargetingPredicateNested"
          ) {
            // TargetingPredicateNested: {type: "views"/"audience"/"purchases", value: array of predicates}
            if (
              tgt.sdNestedType &&
              tgt.sdNestedPredicates &&
              tgt.sdNestedPredicates.length > 0
            ) {
              expression = [
                {
                  type: tgt.sdNestedType,
                  value: tgt.sdNestedPredicates.map((pred: any) => ({
                    type: pred.type,
                    value: pred.value,
                  })),
                },
              ];
            }
          }

          if (expression.length === 0) {
            throw new Error("Expression is required for SD targets");
          }

          return {
            adGroupId: parseInt(tgt.adGroupId, 10),
            bid: tgt.bid,
            expression: expression,
            expressionType: (tgt.expressionType || "manual").toLowerCase(),
            state: (tgt.state || "enabled").toLowerCase(),
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
        if (
          errorData.errors &&
          Array.isArray(errorData.errors) &&
          errorData.errors.length > 0
        ) {
          // Use the first error message from the array
          errorMessage = errorData.errors[0];
        } else if (errorData.error) {
          // Fallback to error (singular) if errors array is not present
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        // Extract failed targets if available
        if (
          errorData.failed_targets &&
          Array.isArray(errorData.failed_targets)
        ) {
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
    if (!accountId || !campaignId) return;

    setCreateProductAdLoading(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      let response;
      if (campaignType === "SD") {
        // Use SD-specific endpoint
        response = await campaignsService.createSdProductAds(
          accountIdNum,
          campaignId,
          {
            productAds: productAds.map((pa) => ({
              state: pa.state as "enabled" | "paused" | "archived",
              adGroupId: parseInt(pa.adGroupId),
              campaignId: parseInt(campaignId),
              ...(pa.sku && { sku: pa.sku }),
              ...(pa.asin && { asin: pa.asin }),
              ...(pa.landingPageURL && { landingPageURL: pa.landingPageURL }),
              ...(pa.landingPageType && {
                landingPageType: pa.landingPageType,
              }),
              ...(pa.adName && { adName: pa.adName }),
            })),
          }
        );
      } else {
        // Use SP/SB endpoint
        response = await campaignsService.createProductAds(
          accountIdNum,
          campaignId,
          {
            productAds: productAds.map((pa) => ({
              adGroupId: pa.adGroupId,
              asin: pa.asin || "",
              sku: pa.sku || undefined,
              customText: pa.customText || undefined,
              globalStoreSetting: pa.catalogSourceCountryCode
                ? {
                    catalogSourceCountryCode: pa.catalogSourceCountryCode,
                  }
                : undefined,
              state: pa.state as "ENABLED" | "PAUSED",
            })),
          }
        );
      }

      // Check for partial success
      const created = response.created || 0;
      const failed = response.failed || 0;
      const failedProductAds = response.failed_productAds || [];
      const fieldErrors = response.field_errors || {};
      const errors = response.errors || [];

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
        // Partial success or all failed - show first error only
        let errorMessage = "";
        if (created > 0 && failed > 0) {
          errorMessage = `${created} product ad(s) created successfully. ${failed} product ad(s) failed.`;
        } else {
          errorMessage = `Failed to create ${failed} product ad(s).`;
        }

        // Get the first error - prioritize field errors, then generic errors, then failed_productAds errors
        let firstError: string | undefined = undefined;
        let firstFieldError: Record<string, string> | undefined = undefined;

        // First, try to get the first field error
        const fieldErrorEntries = Object.entries(fieldErrors);
        if (fieldErrorEntries.length > 0) {
          const [firstFieldKey, firstFieldValue] = fieldErrorEntries[0];
          firstFieldError = { [firstFieldKey]: firstFieldValue as string };
          firstError = firstFieldValue as string;
        }

        // If no field error, get the first generic error from errors array
        if (
          !firstError &&
          errors &&
          Array.isArray(errors) &&
          errors.length > 0
        ) {
          firstError = errors[0];
        }

        // If still no error, get the first error from failed_productAds
        if (!firstError && failedProductAds.length > 0) {
          const firstFailedAd = failedProductAds[0];
          if (
            firstFailedAd.errors &&
            Array.isArray(firstFailedAd.errors) &&
            firstFailedAd.errors.length > 0
          ) {
            const firstErr = firstFailedAd.errors[0];
            firstError =
              firstErr.message || firstErr.errorType || "Unknown error";
          }
        }

        // If we still don't have an error, use a default message
        if (!firstError) {
          firstError = "An error occurred while creating product ads.";
        }

        setErrorModal({
          isOpen: true,
          title: failed > 0 && created === 0 ? "Error" : "Summary",
          message: `${errorMessage}\n\n${firstError}`,
          isSuccess: false,
          fieldErrors: firstFieldError,
        });

        // Reload product ads even on partial success to show newly created ones
        if (created > 0) {
          await loadProductAds();
        }
      }
    } catch (error: any) {
      console.error("Failed to create product ads:", error);

      // Extract the first error message only
      let errorMessage = "Failed to create product ads. Please try again.";
      let fieldErrors: Record<string, string> | undefined = undefined;

      if (error?.response?.data) {
        // First, try to get the first field error
        if (error.response.data.field_errors) {
          const fieldErrorEntries = Object.entries(
            error.response.data.field_errors
          );
          if (fieldErrorEntries.length > 0) {
            const [firstFieldKey, firstFieldValue] = fieldErrorEntries[0];
            fieldErrors = { [firstFieldKey]: firstFieldValue as string };
            errorMessage = firstFieldValue as string;
          }
        }

        // If no field error, get the first generic error from errors array
        if (
          !fieldErrors &&
          error.response.data.errors &&
          Array.isArray(error.response.data.errors) &&
          error.response.data.errors.length > 0
        ) {
          errorMessage = error.response.data.errors[0];
        }

        // If still no error, check failed_productAds for the first error
        if (
          !fieldErrors &&
          error.response.data.failed_productAds &&
          Array.isArray(error.response.data.failed_productAds) &&
          error.response.data.failed_productAds.length > 0
        ) {
          const firstFailedAd = error.response.data.failed_productAds[0];
          if (
            firstFailedAd.errors &&
            Array.isArray(firstFailedAd.errors) &&
            firstFailedAd.errors.length > 0
          ) {
            const firstErr = firstFailedAd.errors[0];
            errorMessage =
              firstErr.message || firstErr.errorType || errorMessage;
          }
        }

        // If we have a main error message, use it (but only if we don't already have a more specific error)
        if (!fieldErrors && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (!fieldErrors && error.response.data.message) {
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
        fieldErrors,
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
          ...buildSBAdsFilterParams(sbAdsFilters),
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

      // Get profileId from campaign to filter assets
      const profileId = campaignDetail?.campaign?.profile_id;

      const data = await campaignsService.getAssets(accountIdNum, {
        page: assetsCurrentPage,
        page_size: 10,
        sort_by: assetsSortBy,
        order: assetsSortOrder,
        ...(profileId && { profileId }), // Include profileId if available
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

  // Creatives handlers
  const handleSelectAllCreatives = (checked: boolean) => {
    if (checked) {
      setSelectedCreativeIds(new Set(creatives.map((c) => c.id)));
    } else {
      setSelectedCreativeIds(new Set());
    }
  };

  const handleSelectCreative = (id: number, checked: boolean) => {
    setSelectedCreativeIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleCreativesSort = (column: string) => {
    if (creativesSortBy === column) {
      setCreativesSortOrder(creativesSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCreativesSortBy(column);
      setCreativesSortOrder("asc");
    }
    setCreativesCurrentPage(1);
  };

  const handleCreativesPageChange = (page: number) => {
    setCreativesCurrentPage(page);
  };

  const handleCreateCreative = async (
    creatives: CreativeInput[],
    adGroupId?: number
  ) => {
    if (!accountId || !campaignId) return;

    setCreateCreativeLoading(true);
    setCreateCreativeError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // adGroupId is passed as second parameter from CreateCreativePanel
      if (!adGroupId || adGroupId === 0) {
        throw new Error("Ad Group ID is required. Please select an ad group.");
      }

      // Transform properties to match backend expectations
      const transformProperties = (props: any) => {
        const transformed = { ...props };

        // Flatten headline structure: properties.headline.headline -> properties.headline
        // Backend expects: { headline: string, hasTermsAndConditions: boolean, originalHeadline: string }
        if (transformed.headline && typeof transformed.headline === "object") {
          // Store the headline object before we modify transformed.headline
          const headlineObj = transformed.headline;

          // Extract all headline-related fields from the object
          if (headlineObj.headline !== undefined) {
            transformed.headline = headlineObj.headline;
          }
          if (headlineObj.hasTermsAndConditions !== undefined) {
            transformed.hasTermsAndConditions =
              headlineObj.hasTermsAndConditions;
          }
          if (headlineObj.originalHeadline !== undefined) {
            transformed.originalHeadline = headlineObj.originalHeadline;
          }
        }

        // Move background.backgrounds to backgrounds directly under properties
        if (transformed.background?.backgrounds) {
          transformed.backgrounds = transformed.background.backgrounds;
          delete transformed.background;
        } else if (transformed.backgrounds) {
          // Already in correct format, keep it
        }

        return transformed;
      };

      const response = await campaignsService.createSdCreatives(accountIdNum, {
        adGroupId: adGroupId,
        creatives: creatives.map((c) => ({
          creativeType: c.creativeType,
          properties: transformProperties(c.properties),
          consentToTranslate: c.consentToTranslate,
        })),
      });

      if (response.success && response.success.length > 0) {
        // Close panel and reload creatives
        setIsCreateCreativePanelOpen(false);
        setEditingCreative(null);
        await loadCreatives();
      } else if (response.error && response.error.length > 0) {
        // Extract error messages
        const errorMessages = response.error
          .map(
            (e: any) => e.description || e.details || e.code || "Unknown error"
          )
          .filter((msg: string) => msg);

        // Show error in popup modal
        setErrorModal({
          isOpen: true,
          title: "Failed to Create Creatives",
          message:
            errorMessages.length > 0
              ? errorMessages.join("\n")
              : "Failed to create creatives. Please check the errors below.",
          isSuccess: false,
          genericErrors: errorMessages,
        });

        // Also set inline error for backward compatibility
        setCreateCreativeError(errorMessages.join(", "));
      }
    } catch (error: any) {
      console.error("Failed to create creatives:", error);

      // Extract error message
      let errorMessage = "Failed to create creatives. Please try again.";
      let genericErrors: string[] = [];

      if (error?.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
          genericErrors = [error.response.data.error];
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          genericErrors = [error.response.data.message];
        }

        // Check for error array in response
        if (
          error.response.data.error &&
          Array.isArray(error.response.data.error)
        ) {
          genericErrors = error.response.data.error.map(
            (e: any) => e.description || e.details || e.code || "Unknown error"
          );
          errorMessage = genericErrors.join("\n");
        }
      } else if (error?.message) {
        errorMessage = error.message;
        genericErrors = [error.message];
      }

      // Show error in popup modal
      setErrorModal({
        isOpen: true,
        title: "Failed to Create Creatives",
        message: errorMessage,
        isSuccess: false,
        genericErrors: genericErrors.length > 0 ? genericErrors : undefined,
      });

      // Also set inline error for backward compatibility
      setCreateCreativeError(errorMessage);
    } finally {
      setCreateCreativeLoading(false);
    }
  };

  const handleEditCreative = (creative: Creative) => {
    // Store the full creative object in state
    console.log("[handleEditCreative] Storing full creative object:", {
      id: creative.id,
      creativeId: creative.creativeId,
      adGroupId: creative.adGroupId,
      creativeType: creative.creativeType,
      properties: creative.properties,
      moderationStatus: creative.moderationStatus,
      fullObject: creative,
    });
    setEditingCreative(creative);
    setIsCreateCreativePanelOpen(true);
    setCreateCreativeError(null);
  };

  const handleUpdateCreative = async (
    creative: CreativeInput,
    adGroupId: number,
    creativeId: number | string
  ) => {
    if (!accountId) return;

    setCreateCreativeLoading(true);
    setCreateCreativeError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Keep creativeId as string to preserve precision
      // JavaScript Number.MAX_SAFE_INTEGER is 2^53 - 1, so large integers lose precision
      // We'll send it as string and let the backend convert it
      console.log(
        "[handleUpdateCreative] Creative ID (keeping as string to preserve precision):",
        {
          creativeId: creativeId,
          creativeIdType: typeof creativeId,
          creativeIdValue: String(creativeId),
        }
      );

      // Send creativeId as string to preserve precision
      // Backend will convert to int when needed
      const creativeIdStr = String(creativeId);

      console.log("[handleUpdateCreative] Update request payload:", {
        creativeId: creativeIdStr,
        creativeIdType: typeof creativeIdStr,
        creativeIdOriginal: creativeId,
        creativeType: creative.creativeType,
        adGroupId: adGroupId,
      });

      // Transform properties to match backend expectations
      const transformProperties = (props: any) => {
        const transformed = { ...props };

        // Flatten headline structure: properties.headline.headline -> properties.headline
        // Backend expects: { headline: string, hasTermsAndConditions: boolean, originalHeadline: string }
        if (transformed.headline && typeof transformed.headline === "object") {
          // Store the headline object before we modify transformed.headline
          const headlineObj = transformed.headline;

          // Extract all headline-related fields from the object
          if (headlineObj.headline !== undefined) {
            transformed.headline = headlineObj.headline;
          }
          if (headlineObj.hasTermsAndConditions !== undefined) {
            transformed.hasTermsAndConditions =
              headlineObj.hasTermsAndConditions;
          }
          if (headlineObj.originalHeadline !== undefined) {
            transformed.originalHeadline = headlineObj.originalHeadline;
          }
        }

        // Move background.backgrounds to backgrounds directly under properties
        if (transformed.background?.backgrounds) {
          transformed.backgrounds = transformed.background.backgrounds;
          delete transformed.background;
        } else if (transformed.backgrounds) {
          // Already in correct format, keep it
        }

        return transformed;
      };

      const response = await campaignsService.updateSdCreatives(accountIdNum, [
        {
          creativeId: creativeIdStr, // Send as string to preserve precision
          creativeType: creative.creativeType || null,
          properties: transformProperties(creative.properties),
        },
      ]);

      if (response.success && response.success.length > 0) {
        // Close panel and reload creatives
        setIsCreateCreativePanelOpen(false);
        setEditingCreative(null);
        await loadCreatives();
      } else if (response.error && response.error.length > 0) {
        // Extract error messages
        const errorMessages = response.error
          .map(
            (e: any) => e.description || e.details || e.code || "Unknown error"
          )
          .filter((msg: string) => msg);

        // Show error in popup modal
        setErrorModal({
          isOpen: true,
          title: "Failed to Update Creative",
          message:
            errorMessages.length > 0
              ? errorMessages.join("\n")
              : "Failed to update creative. Please check the errors below.",
          isSuccess: false,
          genericErrors: errorMessages,
        });

        // Also set inline error for backward compatibility
        setCreateCreativeError(errorMessages.join(", "));
      }
    } catch (error: any) {
      console.error("Failed to update creative:", error);

      // Extract error message
      let errorMessage = "Failed to update creative. Please try again.";
      let genericErrors: string[] = [];

      if (error?.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
          genericErrors = [error.response.data.error];
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          genericErrors = [error.response.data.message];
        }

        // Check for error array in response
        if (
          error.response.data.error &&
          Array.isArray(error.response.data.error)
        ) {
          genericErrors = error.response.data.error.map(
            (e: any) => e.description || e.details || e.code || "Unknown error"
          );
          errorMessage = genericErrors.join("\n");
        }
      } else if (error?.message) {
        errorMessage = error.message;
        genericErrors = [error.message];
      }

      // Show error in popup modal
      setErrorModal({
        isOpen: true,
        title: "Failed to Update Creative",
        message: errorMessage,
        isSuccess: false,
        genericErrors: genericErrors.length > 0 ? genericErrors : undefined,
      });

      // Also set inline error for backward compatibility
      setCreateCreativeError(errorMessage);
    } finally {
      setCreateCreativeLoading(false);
    }
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
        formData.append(
          "versionInfo[linkedAssetId]",
          asset.versionInfo.linkedAssetId
        );
        if (asset.versionInfo.versionNotes) {
          formData.append(
            "versionInfo[versionNotes]",
            asset.versionInfo.versionNotes
          );
        }
      }

      if (asset.registrationContext) {
        formData.append(
          "registrationContext[associatedPrograms][0][programName]",
          asset.registrationContext.associatedPrograms[0]?.programName ||
            "A_PLUS"
        );
        if (
          asset.registrationContext.associatedPrograms[0]?.metadata
            ?.dspAdvertiserId
        ) {
          formData.append(
            "registrationContext[associatedPrograms][0][metadata][dspAdvertiserId]",
            asset.registrationContext.associatedPrograms[0].metadata
              .dspAdvertiserId
          );
        }
      }

      if (asset.skipAssetSubTypesDetection !== undefined) {
        formData.append(
          "skipAssetSubTypesDetection",
          asset.skipAssetSubTypesDetection.toString()
        );
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
      if (field === "name") {
        params.name = filter.value;
      } else if (field === "mediaType") {
        params.mediaType = filter.value;
      } else if (field === "brandEntityId") {
        params.brandEntityId = filter.value;
      } else if (field === "contentType") {
        params.contentType = filter.value;
      } else if (field === "assetType") {
        params.assetType = filter.value;
      }
    });
    return params;
  };

  const handleAssetPreview = async (assetId: string) => {
    if (!accountId || !campaignDetail?.campaign?.profile_id) {
      setAssetPreviewError("Profile ID is required to preview asset");
      setIsAssetPreviewModalOpen(true);
      return;
    }

    setIsAssetPreviewModalOpen(true);
    setAssetPreviewLoading(true);
    setAssetPreviewError(null);
    setAssetPreviewUrl(null);
    setAssetPreviewContentType(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const profileId = campaignDetail.campaign.profile_id;
      const response = await campaignsService.getAssetPreview(
        accountIdNum,
        assetId,
        profileId
      );

      setAssetPreviewUrl(response.previewUrl);
      setAssetPreviewContentType(response.contentType || null);
    } catch (error: any) {
      console.error("Failed to load asset preview:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load asset preview. Please try again.";
      setAssetPreviewError(errorMessage);
    } finally {
      setAssetPreviewLoading(false);
    }
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

      // Separate image and video ads
      const imageAds = ads.filter((ad) => !ad.adType || ad.adType === "IMAGE");
      const videoAds = ads.filter((ad) => ad.adType === "VIDEO");

      let response: any = { created: 0, failed: 0, ads: [], failed_ads: [] };

      // Create image ads if any
      if (imageAds.length > 0) {
        const imageResponse = await campaignsService.createSBAds(
          accountIdNum,
          campaignId,
          { ads: imageAds }
        );
        response.created += imageResponse.created || 0;
        response.failed += imageResponse.failed || 0;
        response.ads = [...(response.ads || []), ...(imageResponse.ads || [])];
        response.failed_ads = [
          ...(response.failed_ads || []),
          ...(imageResponse.failed_ads || []),
        ];
      }

      // Create video ads if any
      if (videoAds.length > 0) {
        const videoResponse = await campaignsService.createSBVideoAds(
          accountIdNum,
          campaignId,
          { ads: videoAds }
        );
        response.created += videoResponse.created || 0;
        response.failed += videoResponse.failed || 0;
        response.ads = [...(response.ads || []), ...(videoResponse.ads || [])];
        response.failed_ads = [
          ...(response.failed_ads || []),
          ...(videoResponse.failed_ads || []),
        ];
      }

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

  const handleEditSBAd = async (ad: SBAd) => {
    if (!accountId || !campaignId || !ad.adId) return;

    // Toggle state between ENABLED and PAUSED
    const newState = ad.state === "ENABLED" ? "PAUSED" : "ENABLED";

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      await campaignsService.updateSBAds(accountIdNum, campaignId, {
        ads: [
          {
            adId: String(ad.adId),
            name: ad.name || "",
            state: newState,
          },
        ],
      });

      await loadSBAds();

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: "Ad updated successfully!",
        isSuccess: true,
      });
    } catch (error: any) {
      console.error("Failed to update SB ad:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message:
          error?.response?.data?.error ||
          "Failed to update ad. Please try again.",
        isSuccess: false,
      });
    }
  };

  const handleDeleteSBAd = async (ad: SBAd) => {
    if (!accountId || !campaignId || !ad.adId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ad "${ad.name || ad.adId}"?`
    );

    if (!confirmed) return;

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      await campaignsService.deleteSBAds(accountIdNum, campaignId, {
        adIds: [String(ad.adId)],
      });

      await loadSBAds();

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: "Ad deleted successfully!",
        isSuccess: true,
      });
    } catch (error: any) {
      console.error("Failed to delete SB ad:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message:
          error?.response?.data?.error ||
          "Failed to delete ad. Please try again.",
        isSuccess: false,
      });
    }
  };

  // SB Ad inline edit handlers
  const handleSBAdEditStart = (
    id: number,
    field: "status" | "name",
    currentValue: string
  ) => {
    setEditingSBAdField({ id, field });
    setEditedSBAdValue(currentValue);
    setPendingSBAdChange(null);
  };

  const handleSBAdEditChange = (value: string) => {
    setEditedSBAdValue(value);
  };

  const handleSBAdEditEnd = (newValue?: string) => {
    if (!editingSBAdField) return;
    const ad = sbAds.find((a) => a.id === editingSBAdField.id);
    if (!ad) {
      setEditingSBAdField(null);
      setEditedSBAdValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare = newValue !== undefined ? newValue : editedSBAdValue;

    let hasChanged = false;
    let oldValue = "";

    if (editingSBAdField.field === "status") {
      const statusLower = (ad.status || ad.state || "").toLowerCase();
      const currentStatus =
        statusLower === "enable" || statusLower === "enabled"
          ? "enabled"
          : "paused";
      oldValue = currentStatus;
      hasChanged = valueToCompare !== currentStatus;
    } else if (editingSBAdField.field === "name") {
      oldValue = ad.name || "";
      hasChanged =
        valueToCompare.trim() !== oldValue.trim() &&
        valueToCompare.trim() !== "";
    }

    if (hasChanged) {
      setPendingSBAdChange({
        id: editingSBAdField.id,
        field: editingSBAdField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setEditingSBAdField(null);
    } else {
      setEditingSBAdField(null);
      setEditedSBAdValue("");
    }
  };

  const confirmSBAdChange = async () => {
    if (!pendingSBAdChange || !accountId || !campaignId) return;

    const ad = sbAds.find((a) => a.id === pendingSBAdChange.id);
    if (!ad || !ad.adId) {
      alert("Ad ID not found");
      setPendingSBAdChange(null);
      return;
    }

    setSbAdEditLoading((prev) => new Set(prev).add(pendingSBAdChange.id));
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      if (pendingSBAdChange.field === "status") {
        // Map status values to uppercase
        const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
          enabled: "ENABLED",
          paused: "PAUSED",
          enable: "ENABLED",
          pause: "PAUSED",
        };
        const statusValue =
          statusMap[pendingSBAdChange.newValue.toLowerCase()] || "ENABLED";

        await campaignsService.updateSBAds(accountIdNum, campaignId, {
          ads: [
            {
              adId: String(ad.adId),
              name: ad.name || "",
              state: statusValue,
            },
          ],
        });
      } else if (pendingSBAdChange.field === "name") {
        // Get current status
        const statusLower = (ad.status || ad.state || "").toLowerCase();
        const statusValue =
          statusLower === "enable" || statusLower === "enabled"
            ? "ENABLED"
            : "PAUSED";

        await campaignsService.updateSBAds(accountIdNum, campaignId, {
          ads: [
            {
              adId: String(ad.adId),
              name: pendingSBAdChange.newValue.trim(),
              state: statusValue,
            },
          ],
        });
      }

      // Reload ads
      await loadSBAds();
      setPendingSBAdChange(null);
      setEditingSBAdField(null);
      setEditedSBAdValue("");
    } catch (error: any) {
      console.error("Error updating SB ad:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update ad. Please try again.";
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setSbAdEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingSBAdChange.id);
        return newSet;
      });
    }
  };

  const cancelSBAdChange = () => {
    setPendingSBAdChange(null);
    setEditingSBAdField(null);
    setEditedSBAdValue("");
  };

  const handleSBAdEditCancel = () => {
    setEditingSBAdField(null);
    setEditedSBAdValue("");
    setPendingSBAdChange(null);
  };

  // Bulk status handler for SB Ads
  const handleBulkSBAdsStatus = async (statusValue: "enable" | "pause") => {
    if (!accountId || !campaignId || selectedSBAdIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSbAdsDeleteLoading(true); // Reuse this loading state for bulk operations
      const selectedSBAdsData = sbAds.filter((ad) =>
        selectedSBAdIds.has(ad.id)
      );

      // Map status values to uppercase
      const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
        enabled: "ENABLED",
        paused: "PAUSED",
        enable: "ENABLED",
        pause: "PAUSED",
      };
      const statusValueUpper =
        statusMap[statusValue.toLowerCase()] || "ENABLED";

      // Prepare ads array for update
      const adsToUpdate = selectedSBAdsData
        .filter((ad) => ad.adId)
        .map((ad) => ({
          adId: String(ad.adId),
          name: ad.name || "",
          state: statusValueUpper,
        }));

      if (adsToUpdate.length > 0) {
        await campaignsService.updateSBAds(accountIdNum, campaignId, {
          ads: adsToUpdate,
        });

        await loadSBAds();
        setSelectedSBAdIds(new Set());
      }
      setShowSBAdsConfirmationModal(false);
      setPendingSBAdsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update SB ads", error);
      setShowSBAdsConfirmationModal(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update ads. Please try again.",
      });
    } finally {
      setSbAdsDeleteLoading(false);
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
    statusValue: "enable" | "pause" | "archive"
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

      if (statusValue === "archive" && campaignType === "SD") {
        // For SD negative targets, archive uses the dedicated DELETE endpoint
        for (const id of selectedNegativeTargetIdsArray) {
          await campaignsService.archiveSdNegativeTarget(accountIdNum, id);
        }
      } else {
        // For non-SD or enable/pause actions, use bulk update
        const statusMap: Record<string, "enable" | "pause"> = {
          enable: "enable",
          pause: "pause",
          enabled: "enable",
          paused: "pause",
        };
        const apiStatus = statusMap[statusValue.toLowerCase()] || "enable";
        await campaignsService.bulkUpdateNegativeTargets(accountIdNum, {
          targetIds: selectedNegativeTargetIdsArray,
          action: "status",
          status: apiStatus,
        });
      }

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
        // For SD campaigns, archive uses the archive endpoint
        if (
          campaignType === "SD" &&
          (pendingAdGroupChange.newValue.toLowerCase() === "archived" ||
            pendingAdGroupChange.newValue.toLowerCase() === "archive")
        ) {
          await campaignsService.archiveSdAdGroup(
            accountIdNum,
            adgroup.adGroupId
          );
        } else {
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
        }
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

  // Product Ad inline edit handlers
  const handleProductAdEditStart = (
    id: number,
    field: "status",
    currentValue: string
  ) => {
    setEditingProductAdField({ id, field });
    setEditedProductAdValue(currentValue);
    setPendingProductAdChange(null);
  };

  const handleProductAdEditChange = (value: string) => {
    setEditedProductAdValue(value);
  };

  const handleProductAdEditEnd = (newValue?: string) => {
    if (!editingProductAdField) return;
    const productad = productads.find(
      (pa) => pa.id === editingProductAdField.id
    );
    if (!productad) {
      setEditingProductAdField(null);
      setEditedProductAdValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare =
      newValue !== undefined ? newValue : editedProductAdValue;

    const statusLower = productad.status?.toLowerCase() || "enabled";
    const currentStatus =
      statusLower === "enable" || statusLower === "enabled"
        ? "enabled"
        : "paused";
    const oldValue = currentStatus;
    const hasChanged = valueToCompare !== currentStatus;

    if (hasChanged) {
      setPendingProductAdChange({
        id: editingProductAdField.id,
        field: editingProductAdField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setShowProductAdsConfirmationModal(true);
    } else {
      setEditingProductAdField(null);
      setEditedProductAdValue("");
    }
  };

  const confirmProductAdChange = async () => {
    if (!pendingProductAdChange || !accountId || !campaignId) return;

    const productad = productads.find(
      (pa) => pa.id === pendingProductAdChange.id
    );
    if (!productad || !productad.adId) {
      alert("Product Ad ID not found");
      setPendingProductAdChange(null);
      return;
    }

    setProductAdEditLoading((prev) =>
      new Set(prev).add(pendingProductAdChange.id)
    );
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // For SD campaigns, handle archive separately
      if (
        campaignType === "SD" &&
        (pendingProductAdChange.newValue.toLowerCase() === "archived" ||
          pendingProductAdChange.newValue.toLowerCase() === "archive")
      ) {
        // Use archive endpoint for SD product ads
        await campaignsService.archiveSdProductAd(
          accountIdNum,
          String(productad.adId)
        );
        await loadProductAds();
        setPendingProductAdChange(null);
        setEditingProductAdField(null);
        setEditedProductAdValue("");
        setShowProductAdsConfirmationModal(false);
        return;
      }

      // For non-archive updates, use regular update endpoint
      // Map status values to uppercase for API
      const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
        enabled: "ENABLED",
        paused: "PAUSED",
        enable: "ENABLED",
        pause: "PAUSED",
      };
      const statusValue =
        statusMap[pendingProductAdChange.newValue.toLowerCase()] || "ENABLED";

      // For SD campaigns, use SD-specific bulk update endpoint
      if (campaignType === "SD") {
        await campaignsService.bulkUpdateSdProductAds(accountIdNum, {
          adIds: [productad.adId || productad.id],
          status:
            pendingProductAdChange.newValue.toLowerCase() === "enabled"
              ? "enable"
              : "pause",
        });
        await loadProductAds();
        setPendingProductAdChange(null);
        setEditingProductAdField(null);
        setEditedProductAdValue("");
        setShowProductAdsConfirmationModal(false);
        return;
      }

      // Call API and check response for errors (partial success scenario)
      const response = await campaignsService.updateProductAds(
        accountIdNum,
        campaignId,
        {
          productAds: [
            {
              adId: String(productad.adId),
              state: statusValue,
            },
          ],
        }
      );

      // Check if there were any failures
      const failed = response.failed || 0;
      const failedProductAds = response.failed_productAds || [];
      const fieldErrors = response.field_errors || {};
      const errors = response.errors || [];

      if (failed > 0) {
        // Extract the first error only
        let firstError: string | undefined = undefined;
        let firstFieldError: Record<string, string> | undefined = undefined;

        // First, try to get the first field error
        const fieldErrorEntries = Object.entries(fieldErrors);
        if (fieldErrorEntries.length > 0) {
          const [firstFieldKey, firstFieldValue] = fieldErrorEntries[0];
          firstFieldError = { [firstFieldKey]: firstFieldValue as string };
          firstError = firstFieldValue as string;
        }

        // If no field error, get the first generic error from errors array
        if (
          !firstError &&
          errors &&
          Array.isArray(errors) &&
          errors.length > 0
        ) {
          firstError = errors[0];
        }

        // If still no error, get the first error from failed_productAds
        if (!firstError && failedProductAds.length > 0) {
          const firstFailedAd = failedProductAds[0];
          if (
            firstFailedAd.errors &&
            Array.isArray(firstFailedAd.errors) &&
            firstFailedAd.errors.length > 0
          ) {
            const firstErr = firstFailedAd.errors[0];
            firstError =
              firstErr.message || firstErr.errorType || "Unknown error";
          }
        }

        // If we still don't have an error, use a default message
        if (!firstError) {
          firstError = "An error occurred while updating product ad.";
        }

        setErrorModal({
          isOpen: true,
          title: "Error",
          message: firstError,
          isSuccess: false,
          fieldErrors: firstFieldError,
        });
        setShowProductAdsConfirmationModal(false);
        return;
      }

      // Reload product ads
      await loadProductAds();
      setPendingProductAdChange(null);
      setEditingProductAdField(null);
      setEditedProductAdValue("");
      setShowProductAdsConfirmationModal(false);
    } catch (error: any) {
      console.error("Error updating product ad:", error);

      // Extract the first error message only
      let errorMessage = "Failed to update product ad. Please try again.";
      let fieldErrors: Record<string, string> | undefined = undefined;

      if (error?.response?.data) {
        // First, try to get the first field error
        if (error.response.data.field_errors) {
          const fieldErrorEntries = Object.entries(
            error.response.data.field_errors
          );
          if (fieldErrorEntries.length > 0) {
            const [firstFieldKey, firstFieldValue] = fieldErrorEntries[0];
            fieldErrors = { [firstFieldKey]: firstFieldValue as string };
            errorMessage = firstFieldValue as string;
          }
        }

        // If no field error, get the first generic error from errors array
        if (
          !fieldErrors &&
          error.response.data.errors &&
          Array.isArray(error.response.data.errors) &&
          error.response.data.errors.length > 0
        ) {
          errorMessage = error.response.data.errors[0];
        }

        // If still no error, check failed_productAds for the first error
        if (
          !fieldErrors &&
          error.response.data.failed_productAds &&
          Array.isArray(error.response.data.failed_productAds) &&
          error.response.data.failed_productAds.length > 0
        ) {
          const firstFailedAd = error.response.data.failed_productAds[0];
          if (
            firstFailedAd.errors &&
            Array.isArray(firstFailedAd.errors) &&
            firstFailedAd.errors.length > 0
          ) {
            const firstErr = firstFailedAd.errors[0];
            errorMessage =
              firstErr.message || firstErr.errorType || errorMessage;
          }
        }

        // If we have a main error message, use it (but only if we don't already have a more specific error)
        if (!fieldErrors && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (!fieldErrors && error.response.data.message) {
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
        fieldErrors,
      });
      setShowProductAdsConfirmationModal(false);
    } finally {
      setProductAdEditLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingProductAdChange.id);
        return newSet;
      });
    }
  };

  const handleProductAdEditCancel = () => {
    setEditingProductAdField(null);
    setEditedProductAdValue("");
    setPendingProductAdChange(null);
    setShowProductAdsConfirmationModal(false);
  };

  // Target inline edit handlers
  const handleTargetEditStart = (
    id: number,
    field: "status" | "bid",
    currentValue: string
  ) => {
    console.log("handleTargetEditStart:", { id, field, currentValue });
    setEditingTargetField({ id, field });
    setEditedTargetValue(currentValue);
    setPendingTargetChange(null);
  };

  const handleTargetEditChange = (value: string) => {
    setEditedTargetValue(value);
  };

  const handleTargetEditEnd = (newValue?: string) => {
    console.log("handleTargetEditEnd:", {
      editingTargetField,
      newValue,
      editedTargetValue,
    });
    if (!editingTargetField) {
      console.log("handleTargetEditEnd: No editingTargetField, returning");
      return;
    }
    const target = targets.find((tgt) => tgt.id === editingTargetField.id);
    if (!target) {
      console.log("handleTargetEditEnd: Target not found");
      setEditingTargetField(null);
      setEditedTargetValue("");
      return;
    }

    // Use the passed value if provided, otherwise use the state value
    const valueToCompare =
      newValue !== undefined ? newValue : editedTargetValue;

    console.log("handleTargetEditEnd: valueToCompare:", valueToCompare);

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
      // Compare numeric values
      const currentBidNum = parseFloat(currentBid) || 0;
      const newBidNum = parseFloat(valueToCompare) || 0;
      hasChanged =
        Math.abs(newBidNum - currentBidNum) > 0.001 &&
        valueToCompare !== "" &&
        !isNaN(newBidNum);
      console.log("handleTargetEditEnd: bid comparison:", {
        currentBid,
        currentBidNum,
        valueToCompare,
        newBidNum,
        hasChanged,
      });
    }

    if (hasChanged) {
      console.log(
        "handleTargetEditEnd: Value changed, showing confirmation modal"
      );
      setPendingTargetChange({
        id: editingTargetField.id,
        field: editingTargetField.field,
        newValue: valueToCompare,
        oldValue: oldValue,
      });
      setShowTargetsConfirmationModal(true);
      setEditingTargetField(null);
    } else {
      console.log("handleTargetEditEnd: No change, clearing edit state");
      setEditingTargetField(null);
      setEditedTargetValue("");
    }
  };

  const confirmTargetChange = async () => {
    if (!pendingTargetChange || !accountId) {
      console.error(
        "confirmTargetChange: Missing pendingTargetChange or accountId",
        {
          pendingTargetChange,
          accountId,
        }
      );
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
        const newStatusLower = pendingTargetChange.newValue.toLowerCase();

        // For SD campaigns, handle archive separately
        if (
          campaignType === "SD" &&
          (newStatusLower === "archived" || newStatusLower === "archive")
        ) {
          console.log("confirmTargetChange: Archiving SD target", {
            targetId: target.targetId,
          });

          await campaignsService.archiveSdTarget(
            accountIdNum,
            String(target.targetId)
          );
        } else {
          // Map status values for enable/pause
          const statusMap: Record<string, "enable" | "pause"> = {
            enabled: "enable",
            paused: "pause",
          };
          const statusValue = statusMap[newStatusLower] || "enable";

          console.log("confirmTargetChange: Updating status", {
            targetId: target.targetId,
            statusValue,
          });

          await campaignsService.bulkUpdateTargets(accountIdNum, {
            targetIds: [String(target.targetId)],
            action: "status",
            status: statusValue,
          });
        }
      } else if (pendingTargetChange.field === "bid") {
        // Extract numeric value - clean any formatting
        const cleanedValue = pendingTargetChange.newValue.replace(
          /[^0-9.]/g,
          ""
        );
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
      // For SD campaigns, handle lowercase states (enabled, paused, archived)
      // For SP/SB campaigns, handle uppercase states (ENABLED, PAUSED)
      let currentStatus: string;
      if (campaignType === "SD") {
        currentStatus =
          statusLower === "enable" || statusLower === "enabled"
            ? "enabled"
            : statusLower === "pause" || statusLower === "paused"
            ? "paused"
            : statusLower === "archived" || statusLower === "archive"
            ? "archived"
            : "enabled";
      } else {
        currentStatus =
          statusLower === "enable" || statusLower === "enabled"
            ? "ENABLED"
            : "PAUSED";
      }
      oldValue = currentStatus;
      const newValueLower = valueToCompare.toLowerCase();
      const currentStatusLower = currentStatus.toLowerCase();
      hasChanged = newValueLower !== currentStatusLower;
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
        if (
          campaignType === "SD" &&
          pendingNegativeTargetChange.newValue.toLowerCase() === "archived"
        ) {
          // For SD, archive uses the dedicated DELETE endpoint
          await campaignsService.archiveSdNegativeTarget(
            accountIdNum,
            String(negativeTarget.targetId)
          );
        } else {
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
      state?: "ENABLED" | "PAUSED" | "enabled" | "paused" | "archived";
      expressionType?: "manual" | "auto";
    }>
  ) => {
    if (
      !accountId ||
      !campaignId ||
      (campaignType !== "SP" && campaignType !== "SB" && campaignType !== "SD")
    )
      return;

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
        } else if (campaignType === "SD") {
          // SD: use expression (singular), include state (lowercase), include expressionType
          return {
            adGroupId: ntg.adGroupId,
            expression: ntg.expression || [],
            state: (ntg.state || "enabled").toLowerCase(),
            expressionType: ntg.expressionType || "manual",
          };
        } else {
          // SP: use expression (singular), include state (uppercase)
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
        // Partial success or all failed - extract detailed error messages
        const errorMessages: string[] = [];

        // Extract error messages from failed_negative_targets
        if (
          failedNegativeTargetsData &&
          Array.isArray(failedNegativeTargetsData)
        ) {
          failedNegativeTargetsData.forEach((failed: any) => {
            if (failed.errors && Array.isArray(failed.errors)) {
              failed.errors.forEach((err: any) => {
                const errorMsg =
                  err.message || err.details || JSON.stringify(err);
                if (errorMsg && !errorMessages.includes(errorMsg)) {
                  errorMessages.push(errorMsg);
                }
              });
            }
          });
        }

        // Also check errors array from response
        if (response.errors && Array.isArray(response.errors)) {
          response.errors.forEach((err: string) => {
            if (err && !errorMessages.includes(err)) {
              errorMessages.push(err);
            }
          });
        }

        // Build error message
        let errorMessage = "";
        if (created > 0) {
          errorMessage = `${created} negative target(s) created successfully. ${failed} negative target(s) failed.`;
        } else {
          errorMessage = `All ${failed} negative target(s) failed to create.`;
        }

        // Append detailed error messages
        if (errorMessages.length > 0) {
          errorMessage += "\n\nErrors:\n" + errorMessages.join("\n");
        }

        setCreateNegativeTargetError(errorMessage);

        // Show summary popup with detailed errors
        setErrorModal({
          isOpen: true,
          title: created > 0 ? "Partial Success" : "Error",
          message: errorMessage,
          isSuccess: false,
        });
      }

      // Handle field errors if available
      if (response.field_errors) {
        setCreateNegativeTargetFieldErrors(response.field_errors);
      }
    } catch (error: any) {
      console.error("Error creating negative targets:", error);

      // Extract detailed error messages from response
      let errorMessage = "Failed to create negative targets. Please try again.";

      if (error?.response?.data) {
        const responseData = error.response.data;

        // Check for failed_negative_targets array with detailed errors
        if (
          responseData.failed_negative_targets &&
          Array.isArray(responseData.failed_negative_targets) &&
          responseData.failed_negative_targets.length > 0
        ) {
          const errorMessages = responseData.failed_negative_targets
            .map((failed: any) => {
              if (
                failed.errors &&
                Array.isArray(failed.errors) &&
                failed.errors.length > 0
              ) {
                return failed.errors
                  .map(
                    (err: any) =>
                      err.message || err.details || JSON.stringify(err)
                  )
                  .join("; ");
              }
              return null;
            })
            .filter((msg: string | null) => msg !== null);

          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join(" | ");
          }
        }

        // Fallback to errors array
        if (
          errorMessage ===
            "Failed to create negative targets. Please try again." &&
          responseData.errors &&
          Array.isArray(responseData.errors) &&
          responseData.errors.length > 0
        ) {
          errorMessage = responseData.errors.join(" | ");
        }

        // Fallback to error field
        if (
          errorMessage ===
            "Failed to create negative targets. Please try again." &&
          responseData.error
        ) {
          errorMessage = responseData.error;
        }
      }

      // Final fallback to error message
      if (
        errorMessage ===
          "Failed to create negative targets. Please try again." &&
        error?.message
      ) {
        errorMessage = error.message;
      }

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
  const handleBulkTargetsStatus = async (
    statusValue: "enable" | "pause" | "archive"
  ) => {
    if (!accountId || selectedTargetIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setTargetsBulkLoading(true);
      const selectedTargetIdsArray = Array.from(selectedTargetIds).map((id) => {
        const target = targets.find((tgt) => tgt.id === id);
        return target?.targetId ? String(target.targetId) : String(id);
      });

      // For SD campaigns, handle archive separately (one at a time)
      if (campaignType === "SD" && statusValue === "archive") {
        // Archive each target individually
        for (const targetId of selectedTargetIdsArray) {
          await campaignsService.archiveSdTarget(accountIdNum, targetId);
        }
      } else {
        // Use bulk update for enable/pause
        await campaignsService.bulkUpdateTargets(accountIdNum, {
          targetIds: selectedTargetIdsArray,
          action: "status",
          status: statusValue,
        });
      }

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
      setIsTargetsBidChange(false);
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
        return String(ad?.adId || id);
      });

      await campaignsService.deleteSBAds(accountIdNum, campaignId || "", {
        adIds: selectedSBAdIdsArray,
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

  const handleBulkProductAdsStatus = async (
    statusValue: "enable" | "pause" | "archive"
  ) => {
    if (!accountId || selectedProductAdIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setProductAdsBulkLoading(true);
      const selectedProductAdsData = productads.filter((pa) =>
        selectedProductAdIds.has(pa.id)
      );
      const adIds = selectedProductAdsData
        .map((pa) => pa.adId || pa.id)
        .filter(Boolean) as Array<string | number>;

      // For SD campaigns, handle archive separately
      if (statusValue === "archive" && campaignType === "SD") {
        // Archive each product ad individually (SD archive is per-ad)
        for (const adId of adIds) {
          try {
            await campaignsService.archiveSdProductAd(
              accountIdNum,
              String(adId)
            );
          } catch (error: any) {
            console.error(`Failed to archive product ad ${adId}:`, error);
            // Continue with other ads even if one fails
          }
        }
      } else if (campaignType === "SD") {
        // For SD campaigns, use SD-specific bulk update endpoint
        await campaignsService.bulkUpdateSdProductAds(accountIdNum, {
          adIds: adIds,
          status: statusValue === "enable" ? "enable" : "pause",
        });
      } else {
        // For SP/SB campaigns, use regular bulk update
        const statusMap: Record<"enable" | "pause", "ENABLED" | "PAUSED"> = {
          enable: "ENABLED",
          pause: "PAUSED",
        };
        const stateValue = statusMap[statusValue];

        await campaignsService.bulkUpdateProductAds(
          accountIdNum,
          campaignId || "",
          {
            productAds: adIds.map((adId) => ({
              adId: String(adId),
              state: stateValue,
            })),
          }
        );
      }

      await loadProductAds();
      setSelectedProductAdIds(new Set());
      setShowProductAdsStatusConfirmation(false);
      setPendingProductAdsStatusAction(null);
    } catch (error: any) {
      console.error("Failed to update product ads", error);
      setShowProductAdsStatusConfirmation(false);
      setErrorModal({
        isOpen: true,
        message:
          error?.response?.data?.error ||
          "Failed to update product ads. Please try again.",
      });
    } finally {
      setProductAdsBulkLoading(false);
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

      // For SD campaigns, archive uses bulk delete endpoint
      if (statusValue === "archive" && campaignType === "SD") {
        await campaignsService.bulkDeleteAdGroups(accountIdNum, {
          adGroupIdFilter: {
            include: selectedAdGroupIdsArray,
          },
        });
      } else {
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
      }

      await loadAdGroups();
      setSelectedAdGroupIds(new Set());
      setShowAdGroupsConfirmationModal(false);
      setPendingAdGroupsStatusAction(null);
      setIsAdGroupsBidChange(false);
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

  const calculateNewAdGroupBid = (currentBid: number): number => {
    const valueNum = parseFloat(adGroupsBidValue);
    if (isNaN(valueNum)) return currentBid;

    let newBid = currentBid;

    if (adGroupsBidAction === "increase") {
      if (adGroupsBidUnit === "percent") {
        newBid = currentBid * (1 + valueNum / 100);
      } else {
        newBid = currentBid + valueNum;
      }
      if (adGroupsBidUpperLimit) {
        const upper = parseFloat(adGroupsBidUpperLimit);
        if (!isNaN(upper)) {
          newBid = Math.min(newBid, upper);
        }
      }
    } else if (adGroupsBidAction === "decrease") {
      if (adGroupsBidUnit === "percent") {
        newBid = currentBid * (1 - valueNum / 100);
      } else {
        newBid = currentBid - valueNum;
      }
      if (adGroupsBidLowerLimit) {
        const lower = parseFloat(adGroupsBidLowerLimit);
        if (!isNaN(lower)) {
          newBid = Math.max(newBid, lower);
        }
      }
    } else if (adGroupsBidAction === "set") {
      newBid = valueNum;
    }

    // Prevent negative
    newBid = Math.max(newBid, 0);

    return Math.round(newBid * 100) / 100;
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
        selectedAdGroupIds.has(ag.adGroupId || ag.id)
      );
      const updates: Array<{ adgroupId: string | number; newBid: number }> = [];

      for (const adgroup of selectedAdGroupsData) {
        if (!adgroup.adGroupId) continue;

        const currentBid = parseFloat(
          (adgroup.default_bid || "$0.00").replace(/[^0-9.]/g, "")
        );
        const newBid = calculateNewAdGroupBid(currentBid);

        updates.push({
          adgroupId: adgroup.adGroupId,
          newBid: newBid,
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
          <CampaignInformation
            campaignDetail={campaignDetail}
            editingField={editingField}
            editedValue={editedValue}
            onEditField={(field) => {
              setEditingField(field);
              if (field === "status" && campaignDetail) {
                const statusLower =
                  campaignDetail.campaign.status?.toLowerCase() || "enabled";
                setEditedValue(
                  statusLower === "enable" || statusLower === "enabled"
                    ? "enabled"
                    : statusLower === "paused"
                    ? "paused"
                    : "archived"
                );
              } else if (field === "budget" && campaignDetail) {
                setEditedValue(
                  (campaignDetail.campaign.budget || 0).toString()
                );
              }
            }}
            onEditValueChange={setEditedValue}
            onEditEnd={() => {
              if (!campaignDetail) return;
              if (editingField === "status") {
                const currentStatus =
                  campaignDetail.campaign.status?.toLowerCase() || "enabled";
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
              } else if (editingField === "budget") {
                const budgetValue = parseFloat(editedValue);
                const oldBudget = campaignDetail.campaign.budget || 0;
                if (!isNaN(budgetValue) && budgetValue !== oldBudget) {
                  setInlineEditField("budget");
                  setInlineEditOldValue(`$${oldBudget.toLocaleString()}`);
                  setInlineEditNewValue(editedValue);
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
              <OverviewTab
                chartData={chartData}
                chartToggles={chartToggles}
                onToggleChartMetric={toggleChartMetric}
                campaignDetail={campaignDetail}
                loading={loading}
                campaignType={campaignType}
              />
            )}

            {activeTab === "Ad Groups" && (
              <AdGroupsTab
                adgroups={adgroups}
                adgroupsLoading={adgroupsLoading}
                campaignDetail={campaignDetail}
                campaignId={campaignId}
                campaignType={campaignType}
                selectedAdGroupIds={selectedAdGroupIds}
                onSelectAll={handleSelectAllAdGroups}
                onSelect={handleSelectAdGroup}
                currentPage={adgroupsCurrentPage}
                totalPages={adgroupsTotalPages}
                onPageChange={handleAdGroupsPageChange}
                sortBy={adgroupsSortBy}
                sortOrder={adgroupsSortOrder}
                onSort={handleAdGroupsSort}
                isFilterPanelOpen={isAdGroupsFilterPanelOpen}
                onToggleFilterPanel={() => {
                  setIsAdGroupsFilterPanelOpen(!isAdGroupsFilterPanelOpen);
                }}
                onCloseFilterPanel={() => {
                  setIsAdGroupsFilterPanelOpen(false);
                }}
                filters={adgroupsFilters}
                onApplyFilters={(newFilters) => {
                  const filtersStr = JSON.stringify(
                    [...newFilters].sort((a, b) => {
                      if (a.field !== b.field)
                        return a.field.localeCompare(b.field);
                      const aOp = a.operator || "";
                      const bOp = b.operator || "";
                      if (aOp !== bOp) return aOp.localeCompare(bOp);
                      return String(a.value).localeCompare(String(b.value));
                    })
                  );
                  if (lastAppliedFiltersRef.current === filtersStr) {
                    return;
                  }
                  lastAppliedFiltersRef.current = filtersStr;
                  setAdgroupsFilters(newFilters);
                  setAdgroupsCurrentPage(1);
                }}
                filtersString={adgroupsFiltersString}
                lastAppliedFiltersRef={lastAppliedFiltersRef}
                isCreatePanelOpen={isCreateAdGroupPanelOpen}
                onToggleCreatePanel={() => {
                  setIsCreateAdGroupPanelOpen(!isCreateAdGroupPanelOpen);
                }}
                onCloseCreatePanel={() => {
                  setIsCreateAdGroupPanelOpen(false);
                  setCreateAdGroupError(null);
                  setCreateAdGroupFieldErrors({});
                  setCreatedAdGroups([]);
                  setFailedAdGroupCount(0);
                  setFailedAdGroups([]);
                }}
                onCreateAdGroups={handleCreateAdGroups}
                createLoading={createAdGroupLoading}
                createError={createAdGroupError}
                createFieldErrors={createAdGroupFieldErrors}
                createdAdGroups={createdAdGroups}
                failedCount={failedAdGroupCount}
                failedAdGroups={failedAdGroups}
                showBulkActions={showAdGroupsBulkActions}
                onToggleBulkActions={() => {
                  setShowAdGroupsBulkActions((prev) => !prev);
                }}
                onCloseBulkActions={() => {
                  setShowAdGroupsBulkActions(false);
                  setShowAdGroupsBidPanel(false);
                }}
                bulkActionsRef={adGroupsBulkActionsRef}
                onBulkStatusAction={(action) => {
                  setShowAdGroupsBidPanel(false);
                  setPendingAdGroupsStatusAction(action);
                  setIsAdGroupsBidChange(false);
                  setShowAdGroupsConfirmationModal(true);
                }}
                onBulkDelete={() => {
                  setShowAdGroupsBidPanel(false);
                  setShowAdGroupsDeleteConfirmation(true);
                }}
                onBulkEditBid={() => {
                  setShowAdGroupsBidPanel(true);
                }}
                showBidPanel={showAdGroupsBidPanel}
                bidAction={adGroupsBidAction}
                bidUnit={adGroupsBidUnit}
                bidValue={adGroupsBidValue}
                bidUpperLimit={adGroupsBidUpperLimit}
                bidLowerLimit={adGroupsBidLowerLimit}
                onBidActionChange={(action) => {
                  setAdGroupsBidAction(action);
                  if (action === "set") {
                    setAdGroupsBidUnit("amount");
                  }
                }}
                onBidUnitChange={setAdGroupsBidUnit}
                onBidValueChange={setAdGroupsBidValue}
                onBidUpperLimitChange={setAdGroupsBidUpperLimit}
                onBidLowerLimitChange={setAdGroupsBidLowerLimit}
                onBidPanelCancel={() => {
                  setShowAdGroupsBidPanel(false);
                  setAdGroupsBidValue("");
                  setAdGroupsBidUpperLimit("");
                  setAdGroupsBidLowerLimit("");
                }}
                onBidPanelApply={() => {
                  setIsAdGroupsBidChange(true);
                  setPendingAdGroupsStatusAction(null);
                  setShowAdGroupsConfirmationModal(true);
                }}
                bulkLoading={adGroupsBulkLoading}
                editingField={editingAdGroupField}
                editedValue={editedAdGroupValue}
                onEditStart={handleAdGroupEditStart}
                onEditChange={handleAdGroupEditChange}
                onEditEnd={handleAdGroupEditEnd}
                onEditCancel={handleAdGroupEditCancel}
                editLoading={adGroupEditLoading}
                pendingChange={pendingAdGroupChange}
                onConfirmChange={confirmAdGroupChange}
                onCancelChange={cancelAdGroupChange}
                totalRow={adGroupsTotalRow || undefined}
              />
            )}

            {activeTab === "Keywords" && (
              <KeywordsTab
                keywords={keywords}
                keywordsLoading={keywordsLoading}
                allAdgroups={allAdgroups}
                adgroups={adgroups}
                campaignId={campaignId}
                selectedKeywordIds={selectedKeywordIds}
                onSelectAll={handleSelectAllKeywords}
                onSelect={handleSelectKeyword}
                currentPage={keywordsCurrentPage}
                totalPages={keywordsTotalPages}
                onPageChange={handleKeywordsPageChange}
                sortBy={keywordsSortBy}
                sortOrder={keywordsSortOrder}
                onSort={handleKeywordsSort}
                isFilterPanelOpen={isKeywordsFilterPanelOpen}
                onToggleFilterPanel={() => {
                  setIsKeywordsFilterPanelOpen(!isKeywordsFilterPanelOpen);
                }}
                onCloseFilterPanel={() => {
                  setIsKeywordsFilterPanelOpen(false);
                }}
                filters={keywordsFilters}
                onApplyFilters={(newFilters) => {
                  setKeywordsFilters(newFilters);
                  setKeywordsCurrentPage(1);
                }}
                isCreatePanelOpen={isCreateKeywordPanelOpen}
                onToggleCreatePanel={() => {
                  setIsCreateKeywordPanelOpen(!isCreateKeywordPanelOpen);
                }}
                onCloseCreatePanel={() => {
                  setIsCreateKeywordPanelOpen(false);
                  setCreateKeywordError(null);
                  setCreateKeywordFieldErrors({});
                  setCreatedKeywords([]);
                  setFailedKeywordCount(0);
                  setFailedKeywords([]);
                }}
                onCreateKeywords={handleCreateKeywords}
                onLoadAllAdGroups={loadAllAdGroups}
                createLoading={createKeywordLoading}
                createError={createKeywordError}
                createFieldErrors={createKeywordFieldErrors}
                createdKeywords={createdKeywords}
                failedCount={failedKeywordCount}
                failedKeywords={failedKeywords}
                showBulkActions={showKeywordsBulkActions}
                onToggleBulkActions={() => {
                  setShowKeywordsBulkActions((prev) => !prev);
                }}
                onCloseBulkActions={() => {
                  setShowKeywordsBulkActions(false);
                  setShowKeywordsBidPanel(false);
                }}
                bulkActionsRef={keywordsBulkActionsRef}
                onBulkStatusAction={(action) => {
                  setShowKeywordsBidPanel(false);
                  setPendingKeywordsStatusAction(action);
                  setShowKeywordsConfirmationModal(true);
                }}
                onBulkArchive={() => {
                  setShowKeywordsBidPanel(false);
                  setShowKeywordsDeleteConfirmation(true);
                }}
                onBulkEditBid={() => {
                  setShowKeywordsBidPanel(true);
                }}
                showBidPanel={showKeywordsBidPanel}
                bidAction={keywordsBidAction}
                bidUnit={keywordsBidUnit}
                bidValue={keywordsBidValue}
                bidUpperLimit={keywordsBidUpperLimit}
                bidLowerLimit={keywordsBidLowerLimit}
                onBidActionChange={(action) => {
                  setKeywordsBidAction(action);
                  if (action === "set") {
                    setKeywordsBidUnit("amount");
                  }
                }}
                onBidUnitChange={setKeywordsBidUnit}
                onBidValueChange={setKeywordsBidValue}
                onBidUpperLimitChange={setKeywordsBidUpperLimit}
                onBidLowerLimitChange={setKeywordsBidLowerLimit}
                onBidPanelCancel={() => {
                  setShowKeywordsBidPanel(false);
                  setKeywordsBidValue("");
                  setKeywordsBidUpperLimit("");
                  setKeywordsBidLowerLimit("");
                }}
                onBidPanelApply={() => {
                  setShowKeywordsConfirmationModal(true);
                }}
                bulkLoading={keywordsBulkLoading}
                editingField={editingKeywordField}
                editedValue={editedKeywordValue}
                onEditStart={handleKeywordEditStart}
                onEditChange={handleKeywordEditChange}
                onEditEnd={handleKeywordEditEnd}
                onEditCancel={handleKeywordEditCancel}
                editLoading={keywordEditLoading}
                pendingChange={pendingKeywordChange}
              />
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
                      className="create-entity-button"
                    >
                      <span className="text-[10.64px] text-white font-normal">
                        Create Ads
                      </span>
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
                          className="edit-button-large"
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
                          <div className="absolute top-[42px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
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
                                  disabled={selectedSBAdIds.size === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedSBAdIds.size === 0) return;
                                    if (opt.value === "delete") {
                                      setShowSBAdsDeleteConfirmation(true);
                                    } else {
                                      setPendingSBAdsStatusAction(
                                        opt.value as "enable" | "pause"
                                      );
                                      setShowSBAdsConfirmationModal(true);
                                    }
                                    setShowSBAdsBulkActions(false);
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
                    {/* Add Filter Button */}
                    <button
                      onClick={() =>
                        setIsSBAdsFilterPanelOpen(!isSBAdsFilterPanelOpen)
                      }
                      className="edit-button"
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
                    profileId={
                      campaignDetail?.campaign?.profile_id || undefined
                    }
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
                        { value: "status", label: "Status" },
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
                    editingField={editingSBAdField}
                    editedValue={editedSBAdValue}
                    onEditStart={handleSBAdEditStart}
                    onEditChange={handleSBAdEditChange}
                    onEditEnd={handleSBAdEditEnd}
                    onEditCancel={handleSBAdEditCancel}
                    inlineEditLoading={sbAdEditLoading}
                    pendingChange={pendingSBAdChange}
                    onConfirmChange={confirmSBAdChange}
                    onCancelChange={cancelSBAdChange}
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
                      className="create-entity-button"
                    >
                      <span className="text-[10.64px] text-white font-normal">
                        Create Product Ads
                      </span>
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
                    <div
                      className="relative inline-flex justify-end"
                      ref={productAdsBulkActionsRef}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="edit-button"
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
                        <div className="absolute top-[42px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                          <div className="overflow-y-auto">
                            {[
                              { value: "enable", label: "Enabled" },
                              { value: "pause", label: "Paused" },
                              ...(campaignType === "SD"
                                ? [{ value: "archive", label: "Archive" }]
                                : [{ value: "delete", label: "Delete" }]),
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                disabled={selectedProductAdIds.size === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedProductAdIds.size === 0) return;
                                  if (opt.value === "delete") {
                                    setShowProductAdsDeleteConfirmation(true);
                                  } else if (opt.value === "archive") {
                                    setPendingProductAdsStatusAction(
                                      "archive" as
                                        | "enable"
                                        | "pause"
                                        | "archive"
                                    );
                                    setShowProductAdsStatusConfirmation(true);
                                  } else if (
                                    opt.value === "enable" ||
                                    opt.value === "pause"
                                  ) {
                                    setPendingProductAdsStatusAction(
                                      opt.value as "enable" | "pause"
                                    );
                                    setShowProductAdsStatusConfirmation(true);
                                  }
                                  setShowProductAdsBulkActions(false);
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
                      onClick={() =>
                        setIsProductAdsFilterPanelOpen(
                          !isProductAdsFilterPanelOpen
                        )
                      }
                      className="edit-button"
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
                    campaignType={campaignType}
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
                    editingField={editingProductAdField}
                    editedValue={editedProductAdValue}
                    onEditStart={handleProductAdEditStart}
                    onEditChange={handleProductAdEditChange}
                    onEditEnd={handleProductAdEditEnd}
                    onEditCancel={handleProductAdEditCancel}
                    editLoading={productAdEditLoading}
                    pendingChange={pendingProductAdChange}
                    campaignType={campaignType}
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
              <TargetsTab
                targets={targets}
                targetsLoading={targetsLoading}
                allAdgroups={allAdgroups}
                adgroups={adgroups}
                campaignId={campaignId}
                campaignType={campaignType}
                selectedTargetIds={selectedTargetIds}
                onSelectAll={handleSelectAllTargets}
                onSelect={handleSelectTarget}
                currentPage={targetsCurrentPage}
                totalPages={targetsTotalPages}
                onPageChange={handleTargetsPageChange}
                sortBy={targetsSortBy}
                sortOrder={targetsSortOrder}
                onSort={handleTargetsSort}
                isFilterPanelOpen={isTargetsFilterPanelOpen}
                onToggleFilterPanel={() => {
                  setIsTargetsFilterPanelOpen(!isTargetsFilterPanelOpen);
                }}
                onCloseFilterPanel={() => {
                  setIsTargetsFilterPanelOpen(false);
                }}
                filters={targetsFilters}
                onApplyFilters={(newFilters) => {
                  setTargetsFilters(newFilters);
                  setTargetsCurrentPage(1);
                }}
                isCreatePanelOpen={isCreateTargetPanelOpen}
                onToggleCreatePanel={() => {
                  setIsCreateTargetPanelOpen(!isCreateTargetPanelOpen);
                }}
                onCloseCreatePanel={() => {
                  setIsCreateTargetPanelOpen(false);
                  setCreateTargetError(null);
                  setCreateTargetFieldErrors({});
                  setCreatedTargets([]);
                  setFailedTargetCount(0);
                  setFailedTargets([]);
                }}
                onCreateTargets={handleCreateTargets}
                onLoadAllAdGroups={loadAllAdGroups}
                createLoading={createTargetLoading}
                createError={createTargetError}
                createFieldErrors={createTargetFieldErrors}
                createdTargets={createdTargets}
                failedCount={failedTargetCount}
                failedTargets={failedTargets}
                showBulkActions={showTargetsBulkActions}
                onToggleBulkActions={() => {
                  setShowTargetsBulkActions((prev) => !prev);
                }}
                onCloseBulkActions={() => {
                  setShowTargetsBulkActions(false);
                  setShowTargetsBidPanel(false);
                }}
                bulkActionsRef={targetsBulkActionsRef}
                onBulkStatusAction={(action) => {
                  setShowTargetsBidPanel(false);
                  setPendingTargetsStatusAction(action);
                  setIsTargetsBidChange(false);
                  setShowTargetsConfirmationModal(true);
                }}
                onBulkDelete={() => {
                  setShowTargetsBidPanel(false);
                  setShowTargetsDeleteConfirmation(true);
                }}
                onBulkEditBid={() => {
                  console.log("onBulkEditBid");
                  setShowTargetsBidPanel(true);
                  setShowTargetsBulkActions(false);
                }}
                showBidPanel={showTargetsBidPanel}
                bidAction={targetsBidAction}
                bidUnit={targetsBidUnit}
                bidValue={targetsBidValue}
                bidUpperLimit={targetsBidUpperLimit}
                bidLowerLimit={targetsBidLowerLimit}
                onBidActionChange={(action) => {
                  setTargetsBidAction(action);
                  if (action === "set") {
                    setTargetsBidUnit("amount");
                  }
                }}
                onBidUnitChange={setTargetsBidUnit}
                onBidValueChange={setTargetsBidValue}
                onBidUpperLimitChange={setTargetsBidUpperLimit}
                onBidLowerLimitChange={setTargetsBidLowerLimit}
                onBidPanelCancel={() => {
                  setShowTargetsBidPanel(false);
                  setTargetsBidValue("");
                  setTargetsBidUpperLimit("");
                  setTargetsBidLowerLimit("");
                }}
                onBidPanelApply={() => {
                  setIsTargetsBidChange(true);
                  setPendingTargetsStatusAction(null);
                  setShowTargetsConfirmationModal(true);
                }}
                bulkLoading={targetsBulkLoading}
                editingField={editingTargetField}
                editedValue={editedTargetValue}
                onEditStart={handleTargetEditStart}
                onEditChange={handleTargetEditChange}
                onEditEnd={handleTargetEditEnd}
                onEditCancel={handleTargetEditCancel}
                editLoading={targetEditLoading}
                pendingChange={pendingTargetChange}
              />
            )}

            {activeTab === "Negative Keywords" && (
              <NegativeKeywordsTab
                negativeKeywords={negativeKeywords}
                negativeKeywordsLoading={negativeKeywordsLoading}
                allAdgroups={allAdgroups}
                adgroups={adgroups}
                campaignId={campaignId}
                campaignType={campaignType}
                selectedNegativeKeywordIds={selectedNegativeKeywordIds}
                onSelectAll={handleSelectAllNegativeKeywords}
                onSelect={handleSelectNegativeKeyword}
                currentPage={negativeKeywordsCurrentPage}
                totalPages={negativeKeywordsTotalPages}
                onPageChange={handleNegativeKeywordsPageChange}
                sortBy={negativeKeywordsSortBy}
                sortOrder={negativeKeywordsSortOrder}
                onSort={handleNegativeKeywordsSort}
                isFilterPanelOpen={isNegativeKeywordsFilterPanelOpen}
                onToggleFilterPanel={() => {
                  setIsNegativeKeywordsFilterPanelOpen(
                    !isNegativeKeywordsFilterPanelOpen
                  );
                }}
                onCloseFilterPanel={() => {
                  setIsNegativeKeywordsFilterPanelOpen(false);
                }}
                filters={negativeKeywordsFilters}
                onApplyFilters={(newFilters) => {
                  setNegativeKeywordsFilters(newFilters);
                  setNegativeKeywordsCurrentPage(1);
                }}
                isCreatePanelOpen={isCreateNegativeKeywordPanelOpen}
                onToggleCreatePanel={() => {
                  setIsCreateNegativeKeywordPanelOpen(
                    !isCreateNegativeKeywordPanelOpen
                  );
                }}
                onCloseCreatePanel={() => {
                  setIsCreateNegativeKeywordPanelOpen(false);
                  setCreateNegativeKeywordError(null);
                  setCreateNegativeKeywordFieldErrors({});
                  setCreatedNegativeKeywords([]);
                  setFailedNegativeKeywordCount(0);
                  setFailedNegativeKeywords([]);
                }}
                onCreateNegativeKeywords={handleCreateNegativeKeywords}
                onLoadAllAdGroups={loadAllAdGroups}
                createLoading={createNegativeKeywordLoading}
                createError={createNegativeKeywordError}
                createFieldErrors={createNegativeKeywordFieldErrors}
                createdNegativeKeywords={createdNegativeKeywords}
                failedCount={failedNegativeKeywordCount}
                failedNegativeKeywords={failedNegativeKeywords}
                showBulkActions={showNegativeKeywordsBulkActions}
                onToggleBulkActions={() => {
                  setShowNegativeKeywordsBulkActions((prev) => !prev);
                }}
                onCloseBulkActions={() => {
                  setShowNegativeKeywordsBulkActions(false);
                }}
                bulkActionsRef={negativeKeywordsBulkActionsRef}
                onBulkStatusAction={(action) => {
                  setPendingNegativeKeywordsStatusAction(action);
                  setShowNegativeKeywordsConfirmationModal(true);
                }}
                onBulkDelete={() => {
                  setShowNegativeKeywordsDeleteConfirmation(true);
                }}
                editingField={editingNegativeKeywordField}
                editedValue={editedNegativeKeywordValue}
                onEditStart={handleNegativeKeywordEditStart}
                onEditChange={handleNegativeKeywordEditChange}
                onEditEnd={handleNegativeKeywordEditEnd}
                onEditCancel={handleNegativeKeywordEditCancel}
                editLoading={negativeKeywordEditLoading}
                pendingChange={pendingNegativeKeywordChange}
              />
            )}

            {activeTab === "Negative Targets" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                      Negative Targets
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* Create Negative Target Button */}
                      <button
                        onClick={() =>
                          setIsCreateNegativeTargetPanelOpen(
                            !isCreateNegativeTargetPanelOpen
                          )
                        }
                        className="create-entity-button"
                      >
                        <span className="text-[10.64px] text-white font-normal">
                          Create Negative Targets
                        </span>
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
                      {/* Bulk Actions Button */}
                      <div
                        className="relative inline-flex justify-end"
                        ref={negativeTargetsBulkActionsRef}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          className="edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNegativeTargetsBulkActions(
                              !showNegativeTargetsBulkActions
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
                        {showNegativeTargetsBulkActions && (
                          <div className="absolute top-[42px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                            <div className="overflow-y-auto">
                              {[
                                { value: "enable", label: "Enabled" },
                                { value: "pause", label: "Paused" },
                                ...(campaignType === "SD"
                                  ? [{ value: "archive", label: "Archive" }]
                                  : []),
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
                                    if (selectedNegativeTargetIds.size === 0)
                                      return;
                                    if (opt.value === "delete") {
                                      setShowNegativeTargetsDeleteConfirmation(
                                        true
                                      );
                                    } else {
                                      setPendingNegativeTargetsStatusAction(
                                        opt.value as
                                          | "enable"
                                          | "pause"
                                          | "archive"
                                      );
                                      setShowNegativeTargetsConfirmationModal(
                                        true
                                      );
                                    }
                                    setShowNegativeTargetsBulkActions(false);
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
                        onClick={() =>
                          setIsNegativeTargetsFilterPanelOpen(
                            !isNegativeTargetsFilterPanelOpen
                          )
                        }
                        className="edit-button"
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
                      )
                        .filter((ag) => {
                          // Filter out archived ad groups
                          const status = (ag as any).status || ag.state || "";
                          return status.toLowerCase() !== "archived";
                        })
                        .map((ag) => ({
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
                    campaignType={campaignType}
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
                      className="create-entity-button"
                    >
                      <span className="text-[10.64px] text-white font-normal">
                        Create Asset
                      </span>
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
                      className="edit-button"
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
                        { value: "name", label: "Name" },
                        { value: "mediaType", label: "Media Type" },
                        { value: "brandEntityId", label: "Brand Entity ID" },
                        { value: "contentType", label: "Content Type" },
                        { value: "assetType", label: "Asset Type" },
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
                    onPreview={handleAssetPreview}
                  />
                </div>

                {/* Asset Preview Modal */}
                <AssetPreviewModal
                  isOpen={isAssetPreviewModalOpen}
                  onClose={() => {
                    setIsAssetPreviewModalOpen(false);
                    setAssetPreviewUrl(null);
                    setAssetPreviewContentType(null);
                    setAssetPreviewError(null);
                  }}
                  previewUrl={assetPreviewUrl}
                  contentType={assetPreviewContentType}
                  loading={assetPreviewLoading}
                  error={assetPreviewError}
                />

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

            {activeTab === "Creatives" && (
              <>
                {/* Header with Create Creative Button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
                    Creatives
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Create Creative Button */}
                    <button
                      onClick={() => {
                        setIsCreateCreativePanelOpen(
                          !isCreateCreativePanelOpen
                        );
                      }}
                      className="create-entity-button text-[10.64px] font-semibold"
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
                      Create Creative
                    </button>
                  </div>
                </div>

                {/* Create/Edit Creative Panel */}
                {isCreateCreativePanelOpen && (
                  <div className="mb-4">
                    <CreateCreativePanel
                      isOpen={isCreateCreativePanelOpen}
                      onClose={() => {
                        setIsCreateCreativePanelOpen(false);
                        setEditingCreative(null);
                        setCreateCreativeError(null);
                      }}
                      onSubmit={handleCreateCreative}
                      onUpdate={handleUpdateCreative}
                      adgroups={(allAdgroups.length > 0
                        ? allAdgroups
                        : adgroups
                      ).map((ag) => ({
                        adGroupId: ag.adGroupId,
                        name: ag.name || `Ad Group ${ag.adGroupId}`,
                      }))}
                      loading={createCreativeLoading}
                      editCreative={editingCreative}
                    />
                    {createCreativeError && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">
                          {createCreativeError}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <CreativesTable
                    creatives={creatives}
                    loading={creativesLoading}
                    onSelectAll={handleSelectAllCreatives}
                    onSelect={handleSelectCreative}
                    selectedIds={selectedCreativeIds}
                    sortBy={creativesSortBy}
                    sortOrder={creativesSortOrder}
                    onSort={handleCreativesSort}
                    onEdit={handleEditCreative}
                  />
                </div>

                {/* Pagination */}
                {!creativesLoading &&
                  creatives.length > 0 &&
                  creativesTotalPages > 0 && (
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() =>
                            handleCreativesPageChange(
                              Math.max(1, creativesCurrentPage - 1)
                            )
                          }
                          disabled={creativesCurrentPage === 1}
                          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, creativesTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (creativesTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (creativesCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              creativesCurrentPage >=
                              creativesTotalPages - 2
                            ) {
                              pageNum = creativesTotalPages - 4 + i;
                            } else {
                              pageNum = creativesCurrentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() =>
                                  handleCreativesPageChange(pageNum)
                                }
                                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                                  creativesCurrentPage === pageNum
                                    ? "bg-white text-[#136D6D] font-semibold"
                                    : "text-black hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        {creativesTotalPages > 5 &&
                          creativesCurrentPage < creativesTotalPages - 2 && (
                            <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                              ...
                            </span>
                          )}
                        {creativesTotalPages > 5 && (
                          <button
                            onClick={() =>
                              handleCreativesPageChange(creativesTotalPages)
                            }
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                              creativesCurrentPage === creativesTotalPages
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {creativesTotalPages}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleCreativesPageChange(
                              Math.min(
                                creativesTotalPages,
                                creativesCurrentPage + 1
                              )
                            )
                          }
                          disabled={
                            creativesCurrentPage === creativesTotalPages
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

            {activeTab === "Logs" && (
              <LogsTable
                accountId={accountId}
                campaignId={campaignId}
                marketplace="amazon"
                showHeader={false}
                showExport={true}
              />
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
              activeTab !== "Creatives" &&
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
        fieldErrors={errorModal.fieldErrors}
        genericErrors={errorModal.genericErrors}
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

      {/* Status Confirmation Modal for Product Ads */}
      {showProductAdsStatusConfirmation && pendingProductAdsStatusAction && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !productAdsBulkLoading) {
              setShowProductAdsStatusConfirmation(false);
              setPendingProductAdsStatusAction(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              Confirm Status Changes
            </h3>

            {/* Summary */}
            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[12.16px] text-[#556179]">
                  {selectedProductAdIds.size} product ad
                  {selectedProductAdIds.size !== 1 ? "s" : ""} will be updated:
                </span>
                <span className="text-[12.16px] font-semibold text-[#072929]">
                  Status change
                </span>
              </div>
            </div>

            {/* Product Ads Preview Table */}
            {(() => {
              const selectedProductAdsData = productads.filter((pa) =>
                selectedProductAdIds.has(pa.id)
              );
              const previewCount = Math.min(10, selectedProductAdsData.length);
              const hasMore = selectedProductAdsData.length > 10;

              return (
                <div className="mb-6">
                  <div className="mb-2">
                    <span className="text-[10.64px] text-[#556179]">
                      {hasMore
                        ? `Showing ${previewCount} of ${selectedProductAdsData.length} selected product ads`
                        : `${selectedProductAdsData.length} product ad${
                            selectedProductAdsData.length !== 1 ? "s" : ""
                          } selected`}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-sandstorm-s20">
                        <tr>
                          <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                            Product Ad Name
                          </th>
                          <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                            Old Value
                          </th>
                          <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProductAdsData
                          .slice(0, previewCount)
                          .map((pa) => {
                            const oldStatus = pa.status || "Enabled";
                            const newStatus =
                              pendingProductAdsStatusAction === "enable"
                                ? "Enabled"
                                : "Paused";

                            return (
                              <tr
                                key={pa.id}
                                className="border-b border-gray-200 last:border-b-0"
                              >
                                <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                  {pa.adId || pa.id || "Unnamed Product Ad"}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                  {oldStatus}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                  {newStatus}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Action Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-[12.16px] text-[#556179]">
                  New Status:
                </span>
                <span className="text-[12.16px] font-semibold text-[#072929]">
                  {pendingProductAdsStatusAction === "enable"
                    ? "Enabled"
                    : "Paused"}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowProductAdsStatusConfirmation(false);
                  setPendingProductAdsStatusAction(null);
                }}
                disabled={productAdsBulkLoading}
                className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleBulkProductAdsStatus(pendingProductAdsStatusAction)
                }
                disabled={productAdsBulkLoading}
                className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {productAdsBulkLoading ? "Updating..." : "Confirm"}
              </button>
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
        (pendingTargetsStatusAction ||
          isTargetsBidChange ||
          selectedTargetIds.size > 0) && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
            onClick={(e) => {
              if (e.target === e.currentTarget && !targetsBulkLoading) {
                setShowTargetsConfirmationModal(false);
                setPendingTargetsStatusAction(null);
                setIsTargetsBidChange(false);
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                {isTargetsBidChange
                  ? "Confirm Bid Changes"
                  : "Confirm Status Changes"}
              </h3>

              {/* Summary */}
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12.16px] text-[#556179]">
                    {selectedTargetIds.size} target
                    {selectedTargetIds.size !== 1 ? "s" : ""} will be updated:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    {isTargetsBidChange ? "Bid" : "Status"} change
                  </span>
                </div>
              </div>

              {/* Target Preview Table */}
              {(() => {
                const selectedTargetsData = targets.filter((tgt) =>
                  selectedTargetIds.has(tgt.id)
                );
                const previewCount = Math.min(10, selectedTargetsData.length);
                const hasMore = selectedTargetsData.length > 10;

                return (
                  <div className="mb-6">
                    <div className="mb-2">
                      <span className="text-[10.64px] text-[#556179]">
                        {hasMore
                          ? `Showing ${previewCount} of ${selectedTargetsData.length} selected targets`
                          : `${selectedTargetsData.length} target${
                              selectedTargetsData.length !== 1 ? "s" : ""
                            } selected`}
                      </span>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-sandstorm-s20">
                          <tr>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              Target Name
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              Old Value
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              New Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTargetsData
                            .slice(0, previewCount)
                            .map((tgt) => {
                              const oldBid = parseFloat(
                                (tgt.bid || "$0.00").replace(/[^0-9.]/g, "")
                              );
                              const oldStatus = tgt.status || "Enabled";
                              const calculateNewTargetBid = (
                                currentBid: number
                              ) => {
                                const valueNum = parseFloat(targetsBidValue);
                                if (isNaN(valueNum)) return currentBid;

                                let newBid = currentBid;

                                if (targetsBidAction === "set") {
                                  newBid = valueNum;
                                } else if (targetsBidAction === "increase") {
                                  if (targetsBidUnit === "percent") {
                                    newBid =
                                      currentBid * (1 + valueNum / 100.0);
                                  } else {
                                    newBid = currentBid + valueNum;
                                  }
                                } else if (targetsBidAction === "decrease") {
                                  if (targetsBidUnit === "percent") {
                                    newBid =
                                      currentBid * (1 - valueNum / 100.0);
                                  } else {
                                    newBid = currentBid - valueNum;
                                  }
                                }

                                if (targetsBidUpperLimit) {
                                  const upper =
                                    parseFloat(targetsBidUpperLimit);
                                  if (!isNaN(upper)) {
                                    newBid = Math.min(newBid, upper);
                                  }
                                }
                                if (targetsBidLowerLimit) {
                                  const lower =
                                    parseFloat(targetsBidLowerLimit);
                                  if (!isNaN(lower)) {
                                    newBid = Math.max(newBid, lower);
                                  }
                                }

                                newBid = Math.max(newBid, 0);

                                return Math.round(newBid * 100) / 100;
                              };
                              const newBid = isTargetsBidChange
                                ? calculateNewTargetBid(oldBid)
                                : oldBid;
                              const newStatus = pendingTargetsStatusAction
                                ? pendingTargetsStatusAction
                                    .charAt(0)
                                    .toUpperCase() +
                                  pendingTargetsStatusAction.slice(1)
                                : oldStatus;

                              return (
                                <tr
                                  key={tgt.id}
                                  className="border-b border-gray-200 last:border-b-0"
                                >
                                  <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                    {tgt.name || "Unnamed Target"}
                                  </td>
                                  <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                    {isTargetsBidChange
                                      ? `$${oldBid.toFixed(2)}`
                                      : oldStatus}
                                  </td>
                                  <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                    {isTargetsBidChange
                                      ? `$${newBid.toFixed(2)}`
                                      : newStatus}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Action Details */}
              <div className="space-y-3 mb-6">
                {isTargetsBidChange ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-[12.16px] text-[#556179]">
                        Action:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {targetsBidAction === "increase"
                          ? "Increase By"
                          : targetsBidAction === "decrease"
                          ? "Decrease By"
                          : "Set To"}
                      </span>
                    </div>

                    {(targetsBidAction === "increase" ||
                      targetsBidAction === "decrease") && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-[12.16px] text-[#556179]">
                          Unit:
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {targetsBidUnit === "percent"
                            ? "Percentage (%)"
                            : "Amount ($)"}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-[12.16px] text-[#556179]">
                        Value:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {targetsBidValue}{" "}
                        {targetsBidUnit === "percent" ? "%" : "$"}
                      </span>
                    </div>

                    {targetsBidAction === "increase" &&
                      targetsBidUpperLimit && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Upper Limit:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            ${targetsBidUpperLimit}
                          </span>
                        </div>
                      )}

                    {targetsBidAction === "decrease" &&
                      targetsBidLowerLimit && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Lower Limit:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            ${targetsBidLowerLimit}
                          </span>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-[12.16px] text-[#556179]">
                      New Status:
                    </span>
                    <span className="text-[12.16px] font-semibold text-[#072929]">
                      {pendingTargetsStatusAction
                        ? pendingTargetsStatusAction.charAt(0).toUpperCase() +
                          pendingTargetsStatusAction.slice(1)
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTargetsConfirmationModal(false);
                    setPendingTargetsStatusAction(null);
                    setIsTargetsBidChange(false);
                  }}
                  disabled={targetsBulkLoading}
                  className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (isTargetsBidChange) {
                      await handleBulkTargetsBid();
                    } else if (pendingTargetsStatusAction) {
                      await handleBulkTargetsStatus(pendingTargetsStatusAction);
                    }
                  }}
                  disabled={targetsBulkLoading}
                  className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0e5a5a] disabled:opacity-50"
                >
                  {targetsBulkLoading ? "Updating..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Confirmation Modal for Negative Keywords Bulk Actions */}
      {showNegativeKeywordsConfirmationModal &&
        pendingNegativeKeywordsStatusAction && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
            onClick={(e) => {
              if (
                e.target === e.currentTarget &&
                !negativeKeywordsBulkLoading
              ) {
                setShowNegativeKeywordsConfirmationModal(false);
                setPendingNegativeKeywordsStatusAction(null);
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                Confirm Status Changes
              </h3>

              {/* Summary */}
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12.16px] text-[#556179]">
                    {selectedNegativeKeywordIds.size} negative keyword
                    {selectedNegativeKeywordIds.size !== 1 ? "s" : ""} will be
                    updated:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    Status change
                  </span>
                </div>
              </div>

              {/* Negative Keywords Preview Table */}
              {(() => {
                const selectedNegativeKeywordsData = negativeKeywords.filter(
                  (nk) => selectedNegativeKeywordIds.has(nk.id)
                );
                const previewCount = Math.min(
                  10,
                  selectedNegativeKeywordsData.length
                );
                const hasMore = selectedNegativeKeywordsData.length > 10;

                return (
                  <div className="mb-6">
                    <div className="mb-2">
                      <span className="text-[10.64px] text-[#556179]">
                        {hasMore
                          ? `Showing ${previewCount} of ${selectedNegativeKeywordsData.length} selected negative keywords`
                          : `${
                              selectedNegativeKeywordsData.length
                            } negative keyword${
                              selectedNegativeKeywordsData.length !== 1
                                ? "s"
                                : ""
                            } selected`}
                      </span>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-sandstorm-s20">
                          <tr>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              Negative Keyword
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              Old Value
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              New Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedNegativeKeywordsData
                            .slice(0, previewCount)
                            .map((nk) => {
                              const oldStatus = nk.status || "Enabled";
                              const newStatus =
                                pendingNegativeKeywordsStatusAction === "enable"
                                  ? "Enabled"
                                  : "Paused";

                              return (
                                <tr
                                  key={nk.id}
                                  className="border-b border-gray-200 last:border-b-0"
                                >
                                  <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                    {nk.keywordText || "Unnamed Keyword"}
                                  </td>
                                  <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                    {oldStatus}
                                  </td>
                                  <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                    {newStatus}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Action Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-[12.16px] text-[#556179]">
                    New Status:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    {pendingNegativeKeywordsStatusAction === "enable"
                      ? "Enabled"
                      : "Paused"}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3">
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
                  {negativeKeywordsBulkLoading ? "Updating..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Confirmation Modal for Negative Targets Bulk Actions */}
      {showNegativeTargetsConfirmationModal &&
        pendingNegativeTargetsStatusAction && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
            onClick={(e) => {
              if (e.target === e.currentTarget && !negativeTargetsBulkLoading) {
                setShowNegativeTargetsConfirmationModal(false);
                setPendingNegativeTargetsStatusAction(null);
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                Confirm Status Changes
              </h3>

              {/* Summary */}
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12.16px] text-[#556179]">
                    {selectedNegativeTargetIds.size} negative target
                    {selectedNegativeTargetIds.size !== 1 ? "s" : ""} will be
                    updated:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    Status change
                  </span>
                </div>
              </div>

              {/* Negative Targets Preview Table */}
              {(() => {
                const selectedNegativeTargetsData = negativeTargets.filter(
                  (nt) => selectedNegativeTargetIds.has(nt.id)
                );
                const previewCount = Math.min(
                  10,
                  selectedNegativeTargetsData.length
                );
                const hasMore = selectedNegativeTargetsData.length > 10;

                return (
                  <div className="mb-6">
                    <div className="mb-2">
                      <span className="text-[10.64px] text-[#556179]">
                        {hasMore
                          ? `Showing ${previewCount} of ${selectedNegativeTargetsData.length} selected negative targets`
                          : `${
                              selectedNegativeTargetsData.length
                            } negative target${
                              selectedNegativeTargetsData.length !== 1
                                ? "s"
                                : ""
                            } selected`}
                      </span>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-sandstorm-s20">
                          <tr>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              Negative Target
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              Old Value
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                              New Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedNegativeTargetsData
                            .slice(0, previewCount)
                            .map((nt) => {
                              const oldStatus = nt.status || "Enabled";
                              const newStatus =
                                pendingNegativeTargetsStatusAction === "enable"
                                  ? "Enabled"
                                  : pendingNegativeTargetsStatusAction ===
                                    "archive"
                                  ? "Archived"
                                  : "Paused";

                              return (
                                <tr
                                  key={nt.id}
                                  className="border-b border-gray-200 last:border-b-0"
                                >
                                  <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                    {nt.targetId || nt.id || "Unnamed Target"}
                                  </td>
                                  <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                    {oldStatus}
                                  </td>
                                  <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                    {newStatus}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Action Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-[12.16px] text-[#556179]">
                    New Status:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    {pendingNegativeTargetsStatusAction === "enable"
                      ? "Enabled"
                      : pendingNegativeTargetsStatusAction === "archive"
                      ? "Archived"
                      : "Paused"}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3">
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
                        pendingNegativeTargetsStatusAction as
                          | "enable"
                          | "pause"
                          | "archive"
                      );
                    }
                  }}
                  disabled={negativeTargetsBulkLoading}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {negativeTargetsBulkLoading ? "Updating..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Confirmation Modal for Ad Groups Bulk Actions */}
      {showAdGroupsConfirmationModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !adGroupsBulkLoading) {
              setShowAdGroupsConfirmationModal(false);
              setPendingAdGroupsStatusAction(null);
              setIsAdGroupsBidChange(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              {isAdGroupsBidChange
                ? "Confirm Default Bid Changes"
                : "Confirm Status Changes"}
            </h3>

            {/* Summary */}
            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[12.16px] text-[#556179]">
                  {selectedAdGroupIds.size} ad group
                  {selectedAdGroupIds.size !== 1 ? "s" : ""} will be updated:
                </span>
                <span className="text-[12.16px] font-semibold text-[#072929]">
                  {isAdGroupsBidChange ? "Default Bid" : "Status"} change
                </span>
              </div>
            </div>

            {/* AdGroup Preview Table */}
            {(() => {
              const selectedAdGroupsData = adgroups.filter((ag) =>
                selectedAdGroupIds.has(ag.adGroupId || ag.id)
              );
              const previewCount = Math.min(10, selectedAdGroupsData.length);
              const hasMore = selectedAdGroupsData.length > 10;

              return (
                <div className="mb-6">
                  <div className="mb-2">
                    <span className="text-[10.64px] text-[#556179]">
                      {hasMore
                        ? `Showing ${previewCount} of ${selectedAdGroupsData.length} selected ad groups`
                        : `${selectedAdGroupsData.length} ad group${
                            selectedAdGroupsData.length !== 1 ? "s" : ""
                          } selected`}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-sandstorm-s20">
                        <tr>
                          <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                            Ad Group Name
                          </th>
                          <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                            Old Value
                          </th>
                          <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAdGroupsData
                          .slice(0, previewCount)
                          .map((ag) => {
                            const oldBid = parseFloat(
                              (ag.default_bid || "$0.00").replace(
                                /[^0-9.]/g,
                                ""
                              )
                            );
                            const oldStatus = ag.status || "Enabled";
                            const newBid = isAdGroupsBidChange
                              ? calculateNewAdGroupBid(oldBid)
                              : oldBid;
                            const newStatus = pendingAdGroupsStatusAction
                              ? pendingAdGroupsStatusAction
                                  .charAt(0)
                                  .toUpperCase() +
                                pendingAdGroupsStatusAction.slice(1)
                              : oldStatus;

                            return (
                              <tr
                                key={ag.id}
                                className="border-b border-gray-200 last:border-b-0"
                              >
                                <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                                  {ag.name || "Unnamed Ad Group"}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                                  {isAdGroupsBidChange
                                    ? `$${oldBid.toFixed(2)}`
                                    : oldStatus}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                                  {isAdGroupsBidChange
                                    ? `$${newBid.toFixed(2)}`
                                    : newStatus}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Action Details */}
            <div className="space-y-3 mb-6">
              {isAdGroupsBidChange ? (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-[12.16px] text-[#556179]">
                      Action:
                    </span>
                    <span className="text-[12.16px] font-semibold text-[#072929]">
                      {adGroupsBidAction === "increase"
                        ? "Increase By"
                        : adGroupsBidAction === "decrease"
                        ? "Decrease By"
                        : "Set To"}
                    </span>
                  </div>

                  {(adGroupsBidAction === "increase" ||
                    adGroupsBidAction === "decrease") && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-[12.16px] text-[#556179]">
                        Unit:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {adGroupsBidUnit === "percent"
                          ? "Percentage (%)"
                          : "Amount ($)"}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-[12.16px] text-[#556179]">
                      Value:
                    </span>
                    <span className="text-[12.16px] font-semibold text-[#072929]">
                      {adGroupsBidValue}{" "}
                      {adGroupsBidUnit === "percent" ? "%" : "$"}
                    </span>
                  </div>

                  {adGroupsBidAction === "increase" &&
                    adGroupsBidUpperLimit && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-[12.16px] text-[#556179]">
                          Upper Limit:
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          ${adGroupsBidUpperLimit}
                        </span>
                      </div>
                    )}

                  {adGroupsBidAction === "decrease" &&
                    adGroupsBidLowerLimit && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-[12.16px] text-[#556179]">
                          Lower Limit:
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          ${adGroupsBidLowerLimit}
                        </span>
                      </div>
                    )}
                </>
              ) : (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-[12.16px] text-[#556179]">
                    New Status:
                  </span>
                  <span className="text-[12.16px] font-semibold text-[#072929]">
                    {pendingAdGroupsStatusAction
                      ? pendingAdGroupsStatusAction.charAt(0).toUpperCase() +
                        pendingAdGroupsStatusAction.slice(1)
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAdGroupsConfirmationModal(false);
                  setPendingAdGroupsStatusAction(null);
                  setIsAdGroupsBidChange(false);
                }}
                disabled={adGroupsBulkLoading}
                className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (isAdGroupsBidChange) {
                    await handleBulkAdGroupsBid();
                  } else if (pendingAdGroupsStatusAction) {
                    await handleBulkAdGroupsStatus(pendingAdGroupsStatusAction);
                  }
                }}
                disabled={adGroupsBulkLoading}
                className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0e5a5a] disabled:opacity-50"
              >
                {adGroupsBulkLoading ? "Updating..." : "Confirm"}
              </button>
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
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
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
                  <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
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
                    className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAdGroupChange}
                    disabled={adGroupEditLoading.has(pendingAdGroupChange.id)}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
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

      {/* Inline Edit Confirmation Modal for Product Ads */}
      {pendingProductAdChange &&
        showProductAdsConfirmationModal &&
        (() => {
          const productad = productads.find(
            (pa) => pa.id === pendingProductAdChange.id
          );
          const productAdName =
            productad?.asin ||
            productad?.sku ||
            `Product Ad ${productad?.adId || ""}`;
          const fieldLabel = "Status";

          // Format old value
          let oldValueDisplay = "";
          if (pendingProductAdChange.field === "status") {
            oldValueDisplay =
              pendingProductAdChange.oldValue === "enabled"
                ? "Enabled"
                : "Paused";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingProductAdChange.field === "status") {
            newValueDisplay =
              pendingProductAdChange.newValue === "enabled"
                ? "Enabled"
                : "Paused";
          }

          return (
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !productAdEditLoading.has(pendingProductAdChange.id)
                ) {
                  handleProductAdEditCancel();
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
                    Product Ad:{" "}
                    <span className="font-semibold text-[#072929]">
                      {productAdName}
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
                    onClick={handleProductAdEditCancel}
                    disabled={productAdEditLoading.has(
                      pendingProductAdChange.id
                    )}
                    className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmProductAdChange}
                    disabled={productAdEditLoading.has(
                      pendingProductAdChange.id
                    )}
                    className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                  >
                    {productAdEditLoading.has(pendingProductAdChange.id)
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
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
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
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
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

      {/* Inline Edit Confirmation Modal for SB Ads */}
      {pendingSBAdChange &&
        (() => {
          const ad = sbAds.find((a) => a.id === pendingSBAdChange.id);
          const adName = ad?.name || ad?.adId || "Unnamed Ad";
          const fieldLabel =
            pendingSBAdChange.field === "status" ? "Status" : "Name";

          // Format old value
          let oldValueDisplay = "";
          if (pendingSBAdChange.field === "status") {
            oldValueDisplay =
              pendingSBAdChange.oldValue === "enabled" ? "Enabled" : "Paused";
          } else if (pendingSBAdChange.field === "name") {
            oldValueDisplay = pendingSBAdChange.oldValue || "—";
          }

          // Format new value
          let newValueDisplay = "";
          if (pendingSBAdChange.field === "status") {
            newValueDisplay =
              pendingSBAdChange.newValue === "enabled" ? "Enabled" : "Paused";
          } else if (pendingSBAdChange.field === "name") {
            newValueDisplay = pendingSBAdChange.newValue || "—";
          }

          return (
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !sbAdEditLoading.has(pendingSBAdChange.id)
                ) {
                  cancelSBAdChange();
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
                    Ad:{" "}
                    <span className="font-semibold text-[#072929]">
                      {adName}
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
                    onClick={cancelSBAdChange}
                    disabled={sbAdEditLoading.has(pendingSBAdChange.id)}
                    className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSBAdChange}
                    disabled={sbAdEditLoading.has(pendingSBAdChange.id)}
                    className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50"
                  >
                    {sbAdEditLoading.has(pendingSBAdChange.id)
                      ? "Updating..."
                      : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Bulk Actions Confirmation Modal for SB Ads */}
      {showSBAdsConfirmationModal &&
        pendingSBAdsStatusAction &&
        selectedSBAdIds.size > 0 && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
              onClick={() => {
                if (!sbAdsDeleteLoading) {
                  setShowSBAdsConfirmationModal(false);
                  setPendingSBAdsStatusAction(null);
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
                    Are you sure you want to{" "}
                    {pendingSBAdsStatusAction === "enable" ? "enable" : "pause"}{" "}
                    {selectedSBAdIds.size} ad(s)?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSBAdsConfirmationModal(false);
                      setPendingSBAdsStatusAction(null);
                    }}
                    disabled={sbAdsDeleteLoading}
                    className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingSBAdsStatusAction) {
                        await handleBulkSBAdsStatus(pendingSBAdsStatusAction);
                      }
                    }}
                    disabled={sbAdsDeleteLoading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sbAdsDeleteLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal for SB Ads */}
      {showSBAdsDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
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
