import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { Checkbox } from "../ui/Checkbox";
import { accountsService } from "../../services/accounts";

interface CreateCampaignPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCampaignData) => Promise<void>;
  accountId?: string;
  loading?: boolean;
  submitError?: string | null;
  mode?: "create" | "edit";
  initialData?: Partial<CreateCampaignData> | null;
  campaignId?: string | number; // Campaign ID for edit mode (needed for updates)
  profiles?: Array<{ value: string; label: string }>; // Profiles passed from parent to avoid separate AJAX call
}

export interface CreateCampaignData {
  campaign_name: string;
  type: "SP" | "SB" | "SD" | "";
  budget: number;
  budgetType: "DAILY" | "LIFETIME" | "daily" | "lifetime";
  status: "Enabled" | "Paused" | "enabled" | "ENABLED" | "PAUSED";
  startDate?: string;
  endDate?: string;
  profileId?: string;
  // SB (Sponsored Brands) specific fields
  brandEntityId?: string;
  goal?: "PAGE_VISIT" | "BRAND_IMPRESSION_SHARE";
  productLocation?:
    | "SOLD_ON_AMAZON"
    | "NOT_SOLD_ON_AMAZON"
    | "SOLD_ON_DTC"
    | "";
  costType?: "cpc" | "vcpm" | "CPC" | "VCPM" | "FIXED_PRICE"; // SD: cpc/vcpm, SB: CPC/VCPM/FIXED_PRICE
  portfolioId?: string;
  targetedPGDealId?: string;
  tags?: Array<{ key: string; value: string }>;
  smartDefault?: "MANUAL" | "TARGETING";
  country?: string;
  // Bidding object
  bidding?: {
    strategy?: "LEGACY_FOR_SALES" | "AUTO_FOR_SALES" | "MANUAL";
    bidOptimization?: boolean;
    shopperCohortBidAdjustments?: Array<{
      shopperCohortType: "AUDIENCE_SEGMENT";
      percentage: number;
      audienceSegments: Array<{
        audienceId: string;
        audienceSegmentType: "SPONSORED_ADS_AMC" | "BEHAVIOR_DYNAMIC";
      }>;
    }>;
    bidAdjustmentsByPlacement?: Array<{
      percentage: number;
      placement:
        | "PLACEMENT_TOP"
        | "PLACEMENT_REST_OF_SEARCH"
        | "PLACEMENT_PRODUCT_PAGE"
        | "SITE_AMAZON_BUSINESS"
        | "TOP_OF_SEARCH"
        | "DETAIL_PAGE"
        | "OTHER"
        | "HOME";
    }>;
  };
  // SD (Sponsored Display) specific fields
  tactic?: "T00020" | "T00030";
  // Targeting Type (for SP campaigns)
  targetingType?: "AUTO" | "MANUAL";
  // Site Restrictions (for SP campaigns)
  siteRestrictions?: "AMAZON_BUSINESS";
}

const CAMPAIGN_TYPES = [
  { value: "SP", label: "Sponsored Products" },
  { value: "SB", label: "Sponsored Brands" },
  { value: "SD", label: "Sponsored Display" },
];

// SP campaigns only support DAILY budget type
const BUDGET_TYPES = [
  { value: "DAILY", label: "DAILY" },
  { value: "LIFETIME", label: "LIFETIME" }, // Only for SB/SD campaigns
];

const STATE_OPTIONS = [
  { value: "Enabled", label: "Enabled" },
  { value: "Paused", label: "Paused" },
];

// Helper function to get placement values based on campaign type
const getPlacementValues = (campaignType: string) => {
  if (campaignType === "SB") {
    // SB campaigns use: TOP_OF_SEARCH, DETAIL_PAGE, OTHER, HOME
    return {
      TOP_OF_SEARCH: "TOP_OF_SEARCH",
      DETAIL_PAGE: "DETAIL_PAGE",
      OTHER: "OTHER",
      HOME: "HOME",
      labels: {
        TOP_OF_SEARCH: "Top of search (TOP_OF_SEARCH)",
        DETAIL_PAGE: "Detail page (DETAIL_PAGE)",
        OTHER: "Other (OTHER)",
        HOME: "Home (HOME)",
      },
    };
  } else {
    // SP campaigns use: PLACEMENT_TOP, PLACEMENT_REST_OF_SEARCH, PLACEMENT_PRODUCT_PAGE, SITE_AMAZON_BUSINESS
    return {
      PLACEMENT_TOP: "PLACEMENT_TOP",
      PLACEMENT_REST_OF_SEARCH: "PLACEMENT_REST_OF_SEARCH",
      PLACEMENT_PRODUCT_PAGE: "PLACEMENT_PRODUCT_PAGE",
      SITE_AMAZON_BUSINESS: "SITE_AMAZON_BUSINESS",
      labels: {
        PLACEMENT_TOP: "Top of search (PLACEMENT_TOP)",
        PLACEMENT_REST_OF_SEARCH: "Rest of search (PLACEMENT_REST_OF_SEARCH)",
        PLACEMENT_PRODUCT_PAGE: "Product page (PLACEMENT_PRODUCT_PAGE)",
        SITE_AMAZON_BUSINESS: "Amazon Business (SITE_AMAZON_BUSINESS)",
      },
    };
  }
};

const TARGETING_TYPE_OPTIONS = [
  { value: "AUTO", label: "Auto" },
  { value: "MANUAL", label: "Manual" },
];

export const CreateCampaignPanel: React.FC<CreateCampaignPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
  loading = false,
  submitError = null,
  mode = "create",
  initialData = null,
  campaignId,
  profiles: profilesProp = [],
}) => {
  // Store original data for comparison in edit mode
  const [originalData, setOriginalData] =
    useState<Partial<CreateCampaignData> | null>(null);
  const [formData, setFormData] = useState<CreateCampaignData>({
    campaign_name: "",
    type: "", // Start with empty to hide all fields
    budget: 0,
    budgetType: "DAILY",
    status: "Enabled",
    startDate: "",
    endDate: "",
    profileId: "",
    // SB fields
    brandEntityId: "",
    goal: "PAGE_VISIT", // Default to Page visit
    productLocation: "",
    costType: "cpc",
    portfolioId: "",
    targetedPGDealId: "",
    tags: [],
    smartDefault: undefined,
    // SD fields
    tactic: undefined,
    // Targeting Type
    targetingType: "AUTO",
    // Site Restrictions
    siteRestrictions: undefined,
    // Bidding
    bidding: {
      bidOptimization: true,
      shopperCohortBidAdjustments: [],
      bidAdjustmentsByPlacement: [],
    },
  });
  const [activeBiddingTab, setActiveBiddingTab] = useState<
    "strategy" | "placements" | "audiences"
  >("placements");
  const [increaseBidsForAudiences, setIncreaseBidsForAudiences] =
    useState<boolean>(false);
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [audiencePercentage, setAudiencePercentage] = useState<number>(100);
  const [profileOptions, setProfileOptions] =
    useState<Array<{ value: string; label: string }>>(profilesProp);
  const [portfolioOptions, setPortfolioOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [brandEntityOptions, setBrandEntityOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingBrandEntities, setLoadingBrandEntities] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateCampaignData, string>>
  >({});
  const [genericErrors, setGenericErrors] = useState<string[]>([]);

  // Check if test mode is enabled
  const isTestMode =
    import.meta.env.VITE_TEST_FAKE === "true" ||
    import.meta.env.VITE_TEST_FAKE === true;

  // Function to fill form with fake/test data
  const fillTestData = async () => {
    // Get first available profile if any
    const firstProfile =
      profileOptions.length > 0 ? profileOptions[0].value : "";

    // Determine campaign type - use existing selection or default to SP
    const campaignType = formData.type || "SP";

    // Determine budget type - SB and SD can use LIFETIME
    const budgetType =
      campaignType === "SB" || campaignType === "SD" ? "LIFETIME" : "DAILY";

    // Calculate dates
    const startDate = new Date().toISOString().split("T")[0];
    // If LIFETIME budget, ensure end date is provided (30 days from now)
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Base fake data common to all campaign types
    // Note: bidOptimization is true, so bidAdjustmentsByPlacement should NOT be included
    let fakeData: CreateCampaignData = {
      campaign_name: `Test ${campaignType} Campaign ${new Date().toLocaleTimeString()}`,
      type: campaignType as "SP" | "SB" | "SD",
      budget: 100,
      budgetType: budgetType as "DAILY" | "LIFETIME",
      status: "ENABLED", // Valid value: ENABLED or PAUSED
      startDate: startDate,
      endDate: endDate, // Always set end date, especially required for LIFETIME
      profileId: firstProfile,
      // Bidding (common) - bidOptimization is true, so no bidAdjustmentsByPlacement
      bidding: {
        strategy: "LEGACY_FOR_SALES",
        bidOptimization: true,
        shopperCohortBidAdjustments: [],
        // Do NOT include bidAdjustmentsByPlacement when bidOptimization is true
      },
    };

    // Campaign type specific fields
    if (campaignType === "SB") {
      // SB (Sponsored Brands) specific fields
      fakeData = {
        ...fakeData,
        goal: "PAGE_VISIT",
        productLocation: "SOLD_ON_AMAZON",
        costType: "CPC", // SB uses uppercase CPC/VCPM/FIXED_PRICE
        smartDefault: "MANUAL",
        tags: [
          { key: "test_key_1", value: "test_value_1" },
          { key: "test_key_2", value: "test_value_2" },
        ],
        // Note: bidOptimization is true, so bidAdjustmentsByPlacement is not included
      };
    } else if (campaignType === "SD") {
      // SD (Sponsored Display) specific fields
      fakeData = {
        ...fakeData,
        tactic: "T00020",
        costType: "cpc", // SD uses lowercase cpc/vcpm
        targetingType: "AUTO",
      };
    } else {
      // SP (Sponsored Products) specific fields
      fakeData = {
        ...fakeData,
        targetingType: "AUTO",
        costType: "cpc",
        // Note: bidOptimization is true, so bidAdjustmentsByPlacement is not included
      };
    }

    // If profile is set, load portfolios and brand entities first
    if (firstProfile && accountId) {
      try {
        const [portfolios, brandEntities] = await Promise.all([
          accountsService
            .getPortfolios(parseInt(accountId), firstProfile)
            .catch(() => []),
          accountsService
            .getBrandEntities(parseInt(accountId), firstProfile)
            .catch(() => []),
        ]);

        // Update options
        const portfolioOpts =
          portfolios?.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.id})`,
          })) || [];
        const brandEntityOpts =
          brandEntities?.map((be) => ({
            value: be.brandEntityId,
            label: `${be.brandRegistryName} (${be.brandEntityId})`,
          })) || [];

        setPortfolioOptions(portfolioOpts);
        setBrandEntityOptions(brandEntityOpts);

        // Update fake data with first available options
        if (portfolioOpts.length > 0) {
          fakeData.portfolioId = portfolioOpts[0].value;
        }
        // Brand Entity is required for SB campaigns
        if (campaignType === "SB" && brandEntityOpts.length > 0) {
          fakeData.brandEntityId = brandEntityOpts[0].value;
        }
      } catch (error) {
        console.error(
          "Failed to load portfolios/brand entities for test data:",
          error
        );
      }
    }

    setFormData(fakeData);
    setErrors({});
    setGenericErrors([]);
  };

  // Use profiles from props (loaded by parent component)
  useEffect(() => {
    console.log("CreateCampaignPanel received profiles:", profilesProp);
    console.log("Profile options count:", profilesProp.length);
    if (profilesProp && profilesProp.length > 0) {
      console.log("Setting profile options:", profilesProp);
    }
    setProfileOptions(profilesProp || []);
  }, [profilesProp]);

  // Load portfolios when profileId is selected
  useEffect(() => {
    if (!isOpen) return;

    if (formData.profileId) {
      loadPortfolios(formData.profileId);
      loadBrandEntities(formData.profileId);
    } else {
      // Clear portfolios and brand entities when profile is deselected
      setPortfolioOptions([]);
      setBrandEntityOptions([]);
      setFormData((prev) => ({ ...prev, portfolioId: "", brandEntityId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.profileId]);

  // Helper function to convert YYYYMMDD to YYYY-MM-DD format (for date input)
  const convertDateToInputFormat = (dateStr: string | undefined): string => {
    if (!dateStr) return "";
    // If already in YYYY-MM-DD format, return as is
    if (dateStr.includes("-")) return dateStr;
    // If in YYYYMMDD format, convert to YYYY-MM-DD
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(
        4,
        6
      )}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  };

  // Track the campaign ID that was used to initialize the form
  const [initializedCampaignId, setInitializedCampaignId] = useState<
    string | number | undefined
  >(undefined);
  // Store a snapshot of initialData when form is initialized to prevent re-initialization
  const [snapshotInitialData, setSnapshotInitialData] =
    useState<Partial<CreateCampaignData> | null>(null);

  // Prevent formData from being reset when in edit mode - preserve all data
  useEffect(() => {
    // If we're in edit mode and we have snapshot data but formData.type is missing,
    // restore formData from snapshot to prevent fields from disappearing when reopening
    // This handles the case when the panel is closed and reopened with the same campaign
    if (
      isOpen &&
      mode === "edit" &&
      snapshotInitialData &&
      campaignId &&
      (!formData.type || (formData.type as string) === "")
    ) {
      console.warn(
        "Form data type is empty in edit mode, restoring from snapshot"
      );
      const restoredFormData = {
        ...formData,
        type: snapshotInitialData.type || formData.type,
        campaign_name:
          snapshotInitialData.campaign_name || formData.campaign_name,
        budget: snapshotInitialData.budget || formData.budget,
        budgetType: snapshotInitialData.budgetType || formData.budgetType,
        status: snapshotInitialData.status || formData.status,
        startDate: snapshotInitialData.startDate || formData.startDate,
        endDate: snapshotInitialData.endDate
          ? convertDateToInputFormat(snapshotInitialData.endDate)
          : formData.endDate,
        profileId: snapshotInitialData.profileId || formData.profileId,
        portfolioId: snapshotInitialData.portfolioId || formData.portfolioId,
        targetingType:
          snapshotInitialData.targetingType || formData.targetingType,
        bidding: snapshotInitialData.bidding || formData.bidding,
        tags: snapshotInitialData.tags || formData.tags,
        siteRestrictions:
          snapshotInitialData.siteRestrictions || formData.siteRestrictions,
        // Preserve tactic for SD campaigns
        tactic: snapshotInitialData.tactic || formData.tactic,
        // Preserve SB-specific fields
        brandEntityId: snapshotInitialData.brandEntityId || formData.brandEntityId,
        goal: snapshotInitialData.goal || formData.goal,
        productLocation: snapshotInitialData.productLocation || formData.productLocation,
        costType: snapshotInitialData.costType || formData.costType,
        targetedPGDealId: snapshotInitialData.targetedPGDealId || formData.targetedPGDealId,
        smartDefault: snapshotInitialData.smartDefault || formData.smartDefault,
      };
      setFormData(restoredFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, campaignId, formData.type]);

  // When opening in edit mode, pre-populate form with initial data
  useEffect(() => {
    // Only initialize form once per campaign ID when entering edit mode
    // Use snapshot to prevent re-initialization if initialData reference changes
    const shouldInitialize =
      isOpen &&
      mode === "edit" &&
      initialData &&
      campaignId &&
      initializedCampaignId !== campaignId;

    if (shouldInitialize) {
      const newFormData = {
        ...initialData,
        // Ensure type is a valid value (fallback to previous if not provided)
        type: (initialData.type as any) || "",
        // Convert endDate from YYYYMMDD to YYYY-MM-DD format if needed
        endDate: convertDateToInputFormat(initialData.endDate),
        // Normalize budgetType based on campaign type
        budgetType: ((): "DAILY" | "LIFETIME" | "daily" | "lifetime" => {
          const rawBudgetType = initialData.budgetType;
          if (!rawBudgetType) {
            // Default based on campaign type
            return initialData.type === "SD" ? "daily" : "DAILY";
          }
          // Normalize budgetType based on campaign type
          if (initialData.type === "SD") {
            // SD campaigns use lowercase
            return String(rawBudgetType).toLowerCase() === "lifetime"
              ? "lifetime"
              : "daily";
          } else {
            // SP and SB campaigns use uppercase
            return String(rawBudgetType).toUpperCase() === "LIFETIME"
              ? "LIFETIME"
              : "DAILY";
          }
        })(),
        // Populate bidding from initialData (mapped from dynamicBidding)
        bidding: initialData.bidding || {
          bidOptimization: true,
          shopperCohortBidAdjustments: [],
          bidAdjustmentsByPlacement: [],
        },
        // Populate tags from initialData - ensure it's always an array
        tags: (() => {
          const tagsData = initialData.tags;
          if (Array.isArray(tagsData)) {
            return tagsData;
          }
          if (tagsData && typeof tagsData === "object") {
            // Convert object to array format
            return Object.entries(tagsData).map(([key, value]) => ({
              key,
              value: value as string,
            }));
          }
          return [];
        })(),
        // Populate siteRestrictions from initialData
        siteRestrictions: initialData.siteRestrictions || undefined,
        // Populate tactic from initialData for SD campaigns
        tactic: initialData.tactic || undefined,
      };
      console.log("Setting form data with initialData:", {
        initialData,
        newFormData,
        bidding: newFormData.bidding,
        tactic: newFormData.tactic,
      });

      setFormData((prev) => {
        const updated = {
          ...prev,
          ...newFormData,
        };
        console.log("Updated formData:", updated);
        return updated;
      });

      // Store original data for comparison (with original endDate format)
      setOriginalData({ ...initialData });

      // Set active tab based on what data exists
      if (initialData.bidding?.strategy) {
        setActiveBiddingTab("strategy");
      } else if (
        initialData.bidding?.bidAdjustmentsByPlacement &&
        initialData.bidding.bidAdjustmentsByPlacement.length > 0
      ) {
        setActiveBiddingTab("placements");
      } else if (
        initialData.bidding?.shopperCohortBidAdjustments &&
        initialData.bidding.shopperCohortBidAdjustments.length > 0
      ) {
        setActiveBiddingTab("audiences");
      }

      // Set increaseBidsForAudiences based on existing bidding data
      // If there are shopperCohortBidAdjustments, set to true, otherwise false (default)
      if (
        initialData.bidding?.shopperCohortBidAdjustments &&
        initialData.bidding.shopperCohortBidAdjustments.length > 0
      ) {
        setIncreaseBidsForAudiences(true);
        // Set selectedAudience and audiencePercentage from existing data if available
        const firstAdjustment =
          initialData.bidding.shopperCohortBidAdjustments[0];
        if (
          firstAdjustment.audienceSegments &&
          firstAdjustment.audienceSegments.length > 0
        ) {
          const audienceSegment = firstAdjustment.audienceSegments[0];
          setSelectedAudience(audienceSegment.audienceId || "");
        }
        if (firstAdjustment.percentage !== undefined) {
          setAudiencePercentage(firstAdjustment.percentage);
        }
      } else {
        setIncreaseBidsForAudiences(false);
        setSelectedAudience("");
        setAudiencePercentage(100);
      }

      // Mark this campaign as initialized and store snapshot
      setInitializedCampaignId(campaignId);
      setSnapshotInitialData({ ...initialData }); // Store snapshot to prevent re-initialization
    }

    // Only reset form when explicitly switching to create mode (not just when panel closes)
    if (isOpen && mode === "create" && !initialData) {
      // For fresh create opens, reset the form
      resetForm();
      setOriginalData(null);
      // Reset audience-related state to defaults
      setIncreaseBidsForAudiences(false);
      setSelectedAudience("");
      setAudiencePercentage(100);
      setInitializedCampaignId(undefined); // Reset when switching to create mode
      setSnapshotInitialData(null);
    }

    // IMPORTANT: Never reset form data when in edit mode, even if panel closes
    // This ensures form data persists even when modals open/close
    // However, we need to allow re-initialization when reopening the same campaign
    // So we reset the initialization flag when panel closes, but keep the snapshot
    // This way, when reopening, the restoration logic will kick in
    if (!isOpen && mode === "edit") {
      // Reset initializedCampaignId so form can be re-initialized on reopen
      // But keep snapshotInitialData for restoration
      setInitializedCampaignId(undefined);
    } else if (!isOpen && mode !== "edit") {
      // When switching away from edit mode, clear everything
      setInitializedCampaignId(undefined);
      setSnapshotInitialData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, campaignId]);

  // Parse field errors and generic errors from submitError
  useEffect(() => {
    if (submitError) {
      try {
        // Try to parse as JSON (if it contains field errors and generic errors)
        const parsed = JSON.parse(submitError);
        if (parsed.fieldErrors && typeof parsed.fieldErrors === "object") {
          // Set field-specific errors
          setErrors(parsed.fieldErrors);
        } else {
          setErrors({});
        }

        // Extract generic errors
        if (parsed.genericErrors && Array.isArray(parsed.genericErrors)) {
          setGenericErrors(parsed.genericErrors);
        } else if (parsed.message && !parsed.fieldErrors) {
          // If there's a message but no field errors, treat it as a generic error
          setGenericErrors([parsed.message]);
        } else {
          setGenericErrors([]);
        }
      } catch (e) {
        // If not JSON, it's just a plain error message
        // Clear field errors but treat the message as a generic error
        setErrors({});
        setGenericErrors([submitError]);
      }
    } else {
      // Clear errors when submitError is cleared
      setErrors({});
      setGenericErrors([]);
    }
  }, [submitError]);

  const loadPortfolios = async (profileId: string) => {
    if (!accountId || !profileId) {
      setPortfolioOptions([]);
      return;
    }

    try {
      setLoadingPortfolios(true);
      const portfolios = await accountsService.getPortfolios(
        parseInt(accountId),
        profileId
      );
      const options =
        portfolios?.map((p) => ({
          value: p.id,
          label: `${p.name} (${p.id})`,
        })) || [];
      setPortfolioOptions(options);
      // Clear portfolioId if it's no longer in the options
      if (
        formData.portfolioId &&
        !options.find((opt) => opt.value === formData.portfolioId)
      ) {
        setFormData((prev) => ({ ...prev, portfolioId: "" }));
      }
    } catch (error) {
      console.error("Failed to load portfolios:", error);
      setPortfolioOptions([]);
    } finally {
      setLoadingPortfolios(false);
    }
  };

  const loadBrandEntities = async (profileId: string) => {
    if (!accountId || !profileId) {
      setBrandEntityOptions([]);
      return;
    }

    try {
      setLoadingBrandEntities(true);
      const brandEntities = await accountsService.getBrandEntities(
        parseInt(accountId),
        profileId
      );
      const options =
        brandEntities?.map((be) => ({
          value: be.brandEntityId,
          label: `${be.brandRegistryName} (${be.brandEntityId})`,
        })) || [];
      setBrandEntityOptions(options);
      // Clear brandEntityId if it's no longer in the options
      if (
        formData.brandEntityId &&
        !options.find((opt) => opt.value === formData.brandEntityId)
      ) {
        setFormData((prev) => ({ ...prev, brandEntityId: "" }));
      }
    } catch (error) {
      console.error("Failed to load brand entities:", error);
      setBrandEntityOptions([]);
    } finally {
      setLoadingBrandEntities(false);
    }
  };

  const generateDefaultCampaignName = (campaignType: string): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    const dateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;

    const typePrefix =
      campaignType === "SP" ? "SP" : campaignType === "SB" ? "SB" : "SD";
    return `${typePrefix} Campaign - ${dateTime}`;
  };

  const handleChange = (
    field: keyof CreateCampaignData,
    value:
      | string
      | number
      | string[]
      | Record<string, string>
      | Array<{ key: string; value: string }>
      | undefined
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // If profileId is changed, clear portfolioId and reload portfolios
      if (field === "profileId") {
        updated.portfolioId = ""; // Clear portfolio when profile changes
        // Load portfolios for the new profile
        if (value && typeof value === "string") {
          loadPortfolios(value);
        } else {
          setPortfolioOptions([]);
        }
      }

      // If campaign type is changed, automatically set budgetType and generate default name
      if (field === "type") {
        if (value === "SP") {
          // SP campaigns ONLY support DAILY budget type
          updated.budgetType = "DAILY";
          updated.status = "Enabled";
          // Set active bidding tab to "strategy" for SP campaigns
          setActiveBiddingTab("strategy");
        } else if (value === "SD") {
          updated.budgetType = "daily"; // SD uses lowercase
          updated.status = "enabled"; // SD uses lowercase
        } else if (value === "SB") {
          updated.budgetType = "DAILY"; // Default for SB
          updated.status = "ENABLED"; // SB uses uppercase
          updated.goal = "PAGE_VISIT"; // Default goal for SB campaigns
          // Set active bidding tab to "placements" for SB campaigns (no strategy tab)
          setActiveBiddingTab("placements");
        }
        // Generate default campaign name with type and timestamp
        if (value && typeof value === "string") {
          updated.campaign_name = generateDefaultCampaignName(value);
        }
      }

      // Ensure SP campaigns always use DAILY budget type (prevent any changes to LIFETIME)
      if (
        updated.type === "SP" &&
        field === "budgetType" &&
        value !== "DAILY"
      ) {
        updated.budgetType = "DAILY";
      }
      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCampaignData, string>> = {};

    // In edit mode, only validate editable fields: name, status, budget, endDate
    if (mode === "edit") {
      if (!formData.campaign_name.trim()) {
        newErrors.campaign_name = "Campaign name is required";
      }

      if (formData.budget <= 0) {
        newErrors.budget = "Budget must be greater than 0";
      }

      // Status is a dropdown, so it should always have a value, but validate just in case
      if (!formData.status) {
        newErrors.status = "Status is required";
      }

      // Validate end date for SP campaigns
      if (
        formData.type === "SP" &&
        formData.endDate &&
        formData.endDate.trim()
      ) {
        const endDate = new Date(formData.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < today) {
          newErrors.endDate = "End date must be today or in the future";
        }

        // Also validate end date is after start date if start date exists
        if (formData.startDate && formData.startDate.trim()) {
          const startDate = new Date(formData.startDate);
          startDate.setHours(0, 0, 0, 0);

          if (endDate <= startDate) {
            newErrors.endDate = "End date must be greater than start date";
          }
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Create mode: validate all required fields
    if (!formData.type) {
      newErrors.type = "Campaign type is required";
    }

    if (!formData.campaign_name.trim()) {
      newErrors.campaign_name = "Campaign name is required";
    }

    if (formData.budget <= 0) {
      newErrors.budget = "Budget must be greater than 0";
    }

    if (profileOptions.length > 0 && !formData.profileId) {
      newErrors.profileId = "Profile is required";
    }

    // Portfolio is required when portfolios exist
    if (portfolioOptions.length > 0 && !formData.portfolioId) {
      newErrors.portfolioId = "Portfolio is required";
    }

    // Start Date is required
    if (!formData.startDate || !formData.startDate.trim()) {
      newErrors.startDate = "Start Date is required";
    } else {
      // Validate start date is not in the past
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        newErrors.startDate = "Start date cannot be in the past";
      }

      // Validate end date is after start date (if both are provided)
      // All campaign types now support endDate
      if (formData.endDate && formData.endDate.trim()) {
        const endDate = new Date(formData.endDate);
        endDate.setHours(0, 0, 0, 0);

        if (endDate <= startDate) {
          newErrors.endDate = "End date must be greater than start date";
        }
      }
      
      // SB campaigns with LIFETIME budget type require endDate
      if (formData.type === "SB" && 
          (formData.budgetType?.toUpperCase() === "LIFETIME" || formData.budgetType === "lifetime")) {
        if (!formData.endDate || !formData.endDate.trim()) {
          newErrors.endDate = "End date is required for campaigns with LIFETIME budget type";
        }
      }
    }

    // SB specific validation
    if (formData.type === "SB") {
      if (!formData.brandEntityId || !formData.brandEntityId.trim()) {
        newErrors.brandEntityId = "Brand Entity ID is required for Sponsored Brands campaigns";
      }
      if (!formData.costType || !formData.costType.trim()) {
        newErrors.costType = "Cost Type is required for Sponsored Brands campaigns";
      } else {
        // Validate that costType is one of the valid SB values
        const validCostTypes = ["CPC", "VCPM", "FIXED_PRICE"];
        if (!validCostTypes.includes(formData.costType.toUpperCase())) {
          newErrors.costType = "Cost Type must be CPC, VCPM, or FIXED_PRICE for Sponsored Brands campaigns";
        }
      }
    }

    // SD specific validation
    if (formData.type === "SD") {
      if (
        !formData.tactic ||
        (formData.tactic !== "T00020" && formData.tactic !== "T00030")
      ) {
        newErrors.tactic =
          "Tactic is required for Sponsored Display campaigns. Please select T00020 or T00030.";
      }
    }

    // SP specific: strategy is required if dynamicBidding (bidding) is provided (only for create mode)
    // Only validate strategy requirement if bidding object has placementBidding or shopperCohortBidding
    // If bidding only has bidOptimization, strategy is not required
    if (
      mode === "create" &&
      formData.type === "SP" &&
      formData.bidding &&
      ((formData.bidding.bidAdjustmentsByPlacement?.length ?? 0) > 0 ||
        (formData.bidding.shopperCohortBidAdjustments?.length ?? 0) > 0) &&
      !formData.bidding.strategy
    ) {
      // Strategy is required for create requests if dynamicBidding with placements/audiences is provided
      // This prevents submission - error message is shown in the Strategy tab UI
      newErrors.bidding =
        "Strategy is required when placement or audience bid adjustments are provided";
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildFilteredPayload = (
    data: CreateCampaignData
  ): CreateCampaignData & {
    tags?: Array<{ key: string; value: string }> | Record<string, string>;
  } => {
    const basePayload: CreateCampaignData & {
      tags?: Array<{ key: string; value: string }> | Record<string, string>;
    } = {
      campaign_name: data.campaign_name,
      type: data.type as "SP" | "SB" | "SD",
      budget: data.budget,
      budgetType: data.budgetType,
      status: data.status,
      profileId: data.profileId,
      startDate: data.startDate,
      // Include endDate for all campaign types (SB campaigns now support endDate)
      endDate: data.endDate,
    };

    // Campaign type specific fields
    if (data.type === "SP") {
      // SP specific fields
      // targetingType is not editable in edit mode (Amazon API doesn't allow updating it)
      if (data.targetingType && mode !== "edit") {
        basePayload.targetingType = data.targetingType;
      }
      if (data.portfolioId) {
        basePayload.portfolioId = data.portfolioId;
      }
      if (data.siteRestrictions) {
        basePayload.siteRestrictions = data.siteRestrictions;
      }
      // Convert tags array to object for Amazon API
      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        const tagsObject: Record<string, string> = {};
        data.tags.forEach((tag) => {
          if (tag.key && tag.value) {
            tagsObject[tag.key] = tag.value;
          }
        });
        if (Object.keys(tagsObject).length > 0) {
          basePayload.tags = tagsObject as any;
        }
      }
      // SP campaigns ONLY support DAILY budget type - always set to DAILY
      basePayload.budgetType = "DAILY";

      // Format endDate as YYYYMMDD if provided (convert from YYYY-MM-DD)
      // Amazon API expects YYYYMMDD format (e.g., "20261231")
      if (data.endDate && data.endDate.trim()) {
        // Convert from YYYY-MM-DD to YYYYMMDD
        const dateFormatted = data.endDate.replace(/-/g, "");
        if (dateFormatted.length === 8) {
          basePayload.endDate = dateFormatted;
        } else {
          // If format is unexpected, try to use as-is or log warning
          console.warn("Unexpected endDate format:", data.endDate);
          basePayload.endDate = data.endDate;
        }
      } else {
        // If empty, send empty string (API will handle null/empty to remove end date)
        basePayload.endDate = "";
      }
      if (data.bidding) {
        basePayload.bidding = data.bidding;
      }

      return basePayload;
    } else if (data.type === "SB") {
      // SB specific fields
      // In edit mode, only include editable fields: portfolioId, bidding, name, state, startDate, budget, tags
      if (mode === "edit") {
        // Only include editable fields for SB campaigns in edit mode
        if (data.portfolioId) {
          basePayload.portfolioId = data.portfolioId;
        }
        // Convert tags array to object for Amazon API
        if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
          const tagsObject: Record<string, string> = {};
          data.tags.forEach((tag) => {
            if (tag.key && tag.value) {
              tagsObject[tag.key] = tag.value;
            }
          });
          if (Object.keys(tagsObject).length > 0) {
            basePayload.tags = tagsObject as any;
          }
        }
        if (data.bidding) {
          basePayload.bidding = data.bidding;
        }
        // Format startDate as YYYYMMDD if provided (convert from YYYY-MM-DD)
        if (data.startDate && data.startDate.trim()) {
          const dateFormatted = data.startDate.replace(/-/g, "");
          if (dateFormatted.length === 8) {
            basePayload.startDate = dateFormatted;
          } else {
            basePayload.startDate = data.startDate;
          }
        }
      } else {
        // Create mode - include all fields
        // Only include brandEntityId if it's selected (not empty)
        if (data.brandEntityId && data.brandEntityId.trim() !== "") {
          basePayload.brandEntityId = data.brandEntityId;
        }
        if (data.goal) {
          basePayload.goal = data.goal;
        }
        // Only include productLocation if it's selected (not empty)
        if (data.productLocation && data.productLocation.trim() !== "") {
          basePayload.productLocation = data.productLocation;
        }
        if (data.costType) {
          basePayload.costType = data.costType;
        }
        if (data.portfolioId) {
          basePayload.portfolioId = data.portfolioId;
        }
        if (data.targetedPGDealId) {
          basePayload.targetedPGDealId = data.targetedPGDealId;
        }
        // Convert tags array to object for Amazon API
        if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
          const tagsObject: Record<string, string> = {};
          data.tags.forEach((tag) => {
            if (tag.key && tag.value) {
              tagsObject[tag.key] = tag.value;
            }
          });
          if (Object.keys(tagsObject).length > 0) {
            basePayload.tags = tagsObject as any;
          }
        }
        if (data.smartDefault) {
          basePayload.smartDefault = data.smartDefault;
        }
        if (data.bidding) {
          basePayload.bidding = data.bidding;
        }
        if (data.siteRestrictions) {
          basePayload.siteRestrictions = data.siteRestrictions;
        }
      }
      // All campaign types now support endDate (included in basePayload above)

      return basePayload;
    } else if (data.type === "SD") {
      // SD specific fields
      if (data.tactic) {
        basePayload.tactic = data.tactic;
      }
      if (data.costType) {
        basePayload.costType = data.costType;
      }
      if (data.portfolioId) {
        basePayload.portfolioId = data.portfolioId;
      }

      return basePayload;
    }

    return basePayload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted, mode:", mode);
    console.log("Form data:", formData);

    const isValid = validate();
    console.log("Validation result:", isValid, "Errors:", errors);
    if (!isValid) {
      console.log("Validation failed. Errors:", errors);
      // Scroll to first error field (no alert needed - errors are shown inline)
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        // Try to find the input or dropdown for this field
        const errorElement =
          document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector(`input[placeholder*="${firstErrorField}"]`) ||
          document
            .querySelector(`label:contains("${firstErrorField}")`)
            ?.closest("div");
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    // Filter payload to only include campaign-type-specific fields
    const filteredPayload = buildFilteredPayload(formData);

    try {
      await onSubmit(filteredPayload);
      console.log("onSubmit completed successfully");
      // Only reset form and close on success
      resetForm();
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
      // Don't reset form or close panel on error - let user fix and resubmit
      console.error("Submit error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_name: "",
      type: "",
      budget: 0,
      budgetType: "DAILY",
      status: "Enabled",
      startDate: "",
      endDate: "",
      profileId: "",
      brandEntityId: "",
      goal: undefined,
      productLocation: "",
      costType: "cpc",
      portfolioId: "",
      targetedPGDealId: "",
      tags: [],
      smartDefault: undefined,
      tactic: undefined,
      // Targeting Type
      targetingType: "AUTO",
      // Site Restrictions
      siteRestrictions: undefined,
      // Bidding
      bidding: {
        bidOptimization: true,
        shopperCohortBidAdjustments: [],
        bidAdjustmentsByPlacement: [],
      },
    });
  };

  const handleCancel = () => {
    resetForm();
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-[#072929]">
              {mode === "edit" ? "Edit Campaign" : "Create Campaign"}
            </h2>
            {isTestMode && mode === "create" && (
              <button
                type="button"
                onClick={fillTestData}
                className="px-3 py-1.5 text-[12px] bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors"
                title="Fill form with test data"
              >
                🧪 Fill Test Data
              </button>
            )}
          </div>

          {/* Validation Errors Banner */}
          {Object.values(errors).filter(Boolean).length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[13px] font-semibold text-red-600 mb-2">
                Please fix the following errors:
              </p>
              <ul className="list-disc list-inside text-[12px] text-red-600 space-y-1">
                {Object.entries(errors)
                  .filter(([_, error]) => error)
                  .map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Form Fields - Layout matching Figma */}
          <div className="space-y-6">
            {/* Row 1: Profile | Campaign Type (all campaign types use 4-column grid) */}
            {formData.type === "SB" ? (
              <div className="grid grid-cols-4 gap-6">
                {/* Profile */}
                <div>
                  <label className="form-label">
                    Profile <span>*</span>
                  </label>
                  <Dropdown<string>
                    options={profileOptions}
                    value={formData.profileId || undefined}
                    onChange={(value) => handleChange("profileId", value)}
                    placeholder="Select profile"
                    buttonClassName="edit-button w-full"
                    disabled={mode === "edit"}
                    emptyMessage={
                      profileOptions.length === 0
                        ? "Loading profiles..."
                        : "No profiles available"
                    }
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-[#556179] mt-1 italic">
                      Read-only in edit mode
                    </p>
                  )}
                  {errors.profileId && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.profileId}
                    </p>
                  )}
                </div>

                {/* Campaign Type */}
                <div>
                  <label className="form-label">
                    Campaign Type <span>*</span>
                  </label>
                  <Dropdown<string>
                    options={CAMPAIGN_TYPES}
                    value={formData.type}
                    onChange={(value) => handleChange("type", value)}
                    placeholder="Select campaign type"
                    buttonClassName="edit-button w-full"
                    disabled={mode === "edit"}
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-[#556179] mt-1 italic">
                      Read-only in edit mode
                    </p>
                  )}
                  {errors.type && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.type}
                    </p>
                  )}
                </div>
              </div>
            ) : formData.type === "SD" ? (
              // SD Campaign: Profile | Campaign Type (2 columns in 4-column grid for consistency)
              <div className="grid grid-cols-4 gap-6">
                {/* Profile */}
                <div>
                  <label className="form-label">
                    Profile
                  </label>
                  <Dropdown<string>
                    options={profileOptions}
                    value={formData.profileId || undefined}
                    onChange={(value) => handleChange("profileId", value)}
                    placeholder="Select profile"
                    buttonClassName="edit-button w-full"
                    disabled={mode === "edit"}
                    emptyMessage={
                      profileOptions.length === 0
                        ? "Loading profiles..."
                        : "No profiles available"
                    }
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-[#556179] mt-1 italic">
                      Read-only in edit mode
                    </p>
                  )}
                  {errors.profileId && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.profileId}
                    </p>
                  )}
                </div>

                {/* Campaign Type */}
                <div>
                  <label className="form-label">
                    Campaign Type
                  </label>
                  <Dropdown<string>
                    options={CAMPAIGN_TYPES}
                    value={formData.type}
                    onChange={(value) => handleChange("type", value)}
                    placeholder="Select campaign type"
                    buttonClassName="edit-button w-full"
                    disabled={mode === "edit"}
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-[#556179] mt-1 italic">
                      Read-only in edit mode
                    </p>
                  )}
                  {errors.type && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.type}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // SP Campaign: Profile | Campaign Type (4-column grid for consistency)
              <div className="grid grid-cols-4 gap-6">
                {/* Profile */}
                <div>
                  <label className="form-label">
                    Profile <span>*</span>
                  </label>
                  <Dropdown<string>
                    options={profileOptions}
                    value={formData.profileId || undefined}
                    onChange={(value) => handleChange("profileId", value)}
                    placeholder="Select profile"
                    buttonClassName="edit-button w-full"
                    disabled={mode === "edit"}
                    emptyMessage={
                      profileOptions.length === 0
                        ? "Loading profiles..."
                        : "No profiles available"
                    }
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-[#556179] mt-1 italic">
                      Read-only in edit mode
                    </p>
                  )}
                  {errors.profileId && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.profileId}
                    </p>
                  )}
                </div>

                {/* Campaign Type */}
                <div>
                  <label className="form-label">
                    Campaign Type <span>*</span>
                  </label>
                  <Dropdown<string>
                    options={CAMPAIGN_TYPES}
                    value={formData.type}
                    onChange={(value) => handleChange("type", value)}
                    placeholder="Select campaign type"
                    buttonClassName="edit-button w-full"
                    disabled={mode === "edit"}
                  />
                  {mode === "edit" && (
                    <p className="text-[10px] text-[#556179] mt-1 italic">
                      Read-only in edit mode
                    </p>
                  )}
                  {errors.type && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.type}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* SB Goals Section - Right after Campaign Type */}
            {formData.type === "SB" && (
              <div>
                <div className="mb-4">
                  <label className="form-label">
                    Goals <span>*</span>
                  </label>
                  <p className="text-[12px] text-[#556179] mb-4">
                    Choose a campaign outcome that aligns with your business
                    goals. We'll make bidding and targeting recommendations to
                    help achieve this outcome.
                  </p>
                  <div className="grid grid-cols-4 ">
                    <Dropdown
                      options={[
                        {
                          value: "PAGE_VISIT",
                          label: "Page visit",
                        },
                        {
                          value: "BRAND_IMPRESSION_SHARE",
                          label: "Brand impression share",
                        },
                      ]}
                      value={formData.goal}
                      onChange={(value) => handleChange("goal", value as any)}
                      disabled={mode === "edit"}
                      placeholder="Select a goal"
                      className="w-full"
                      buttonClassName="edit-button w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Show fields only when campaign type is selected */}
            {formData.type && (
              <>
                {/* Row 2: Campaign Name | Budget | Budget Type | State (for SB: 4 columns) */}
                {formData.type === "SB" ? (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Campaign Name */}
                    <div>
                      <label className="form-label">
                        Campaign Name <span>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.campaign_name}
                        onChange={(e) =>
                          handleChange("campaign_name", e.target.value)
                        }
                        placeholder="Enter campaign name"
                        className={`campaign-input w-full ${
                          errors.campaign_name ? "border-red-500" : ""
                        }`}
                      />
                      {errors.campaign_name && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.campaign_name}
                        </p>
                      )}
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="form-label">
                        Budget <span>*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.budget || ""}
                        onChange={(e) =>
                          handleChange(
                            "budget",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Enter budget"
                        min="0"
                        step="0.01"
                        className={`campaign-input w-full ${
                          errors.budget ? "border-red-500" : ""
                        }`}
                      />
                      {errors.budget && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <span>!</span>
                          <span>{errors.budget}</span>
                        </p>
                      )}
                    </div>

                    {/* Budget Type */}
                    <div>
                      <label className="form-label">
                        Budget Type <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={(() => {
                          const campaignType: string = formData.type;
                          if (campaignType === "SD") {
                            return [
                              { value: "DAILY", label: "DAILY" },
                              // Note: SD campaigns only support "DAILY" budget type per Amazon API
                            ];
                          } else if (campaignType === "SP") {
                            return [
                              { value: "DAILY", label: "DAILY" },
                              // SP campaigns only support DAILY
                            ];
                          } else {
                            return BUDGET_TYPES;
                          }
                        })()}
                        value={formData.budgetType}
                        onChange={(value) => handleChange("budgetType", value)}
                        placeholder="Select"
                        buttonClassName="edit-button w-full"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="form-label">
                        State <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={STATE_OPTIONS}
                        value={
                          formData.status === "ENABLED"
                            ? "Enabled"
                            : String(formData.status).toLowerCase() === "paused"
                            ? "Paused"
                            : formData.status
                        }
                        onChange={(value) => {
                          handleChange(
                            "status",
                            value.toUpperCase() as "ENABLED" | "PAUSED"
                          );
                        }}
                        placeholder="Select state"
                        buttonClassName="edit-button w-full"
                      />
                      {errors.status && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.status}
                        </p>
                      )}
                    </div>
                  </div>
                ) : formData.type === "SD" ? (
                  // SD Campaign: Campaign Name | Budget | Budget Type | State (4 columns)
                  <div className="grid grid-cols-4 gap-6">
                    {/* Campaign Name */}
                    <div>
                      <label className="form-label">
                        Campaign Name <span>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.campaign_name}
                        onChange={(e) =>
                          handleChange("campaign_name", e.target.value)
                        }
                        placeholder="Enter campaign name"
                        className={`campaign-input w-full ${
                          errors.campaign_name ? "border-red-500" : ""
                        }`}
                      />
                      {errors.campaign_name && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.campaign_name}
                        </p>
                      )}
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="form-label">
                        Budget <span>*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.budget || ""}
                        onChange={(e) =>
                          handleChange(
                            "budget",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Enter budget"
                        min="0"
                        step="0.01"
                        className={`campaign-input w-full ${
                          errors.budget ? "border-red-500" : ""
                        }`}
                      />
                      {errors.budget && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <span>!</span>
                          <span>{errors.budget}</span>
                        </p>
                      )}
                    </div>

                    {/* Budget Type */}
                    <div>
                      <label className="form-label">
                        Budget Type <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={[
                          { value: "daily", label: "DAILY" },
                          // Note: SD campaigns only support "daily" budget type per Amazon API
                        ]}
                        value={formData.budgetType}
                        onChange={(value) => handleChange("budgetType", value)}
                        placeholder="Select budget type"
                        buttonClassName="edit-button w-full"
                        disabled={false} // Budget Type is editable in edit mode
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="form-label">
                        State <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={STATE_OPTIONS}
                        value={
                          formData.status === "enabled"
                            ? "Enabled"
                            : String(formData.status).toLowerCase() === "paused"
                            ? "Paused"
                            : formData.status
                        }
                        onChange={(value) => {
                          handleChange(
                            "status",
                            value.toLowerCase() as "enabled" | "paused"
                          );
                        }}
                        placeholder="Select state"
                        buttonClassName="edit-button w-full"
                      />
                      {errors.status && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.status}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // SP Campaign: Campaign Name | Budget | State (4-column grid for consistency)
                  <div className="grid grid-cols-4 gap-6">
                    {/* Campaign Name */}
                    <div>
                      <label className="form-label">
                        Campaign Name <span>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.campaign_name}
                        onChange={(e) =>
                          handleChange("campaign_name", e.target.value)
                        }
                        placeholder="Enter campaign name"
                        className={`campaign-input w-full ${
                          errors.campaign_name ? "border-red-500" : ""
                        }`}
                      />
                      {errors.campaign_name && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.campaign_name}
                        </p>
                      )}
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="form-label">
                        Budget <span>*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.budget || ""}
                        onChange={(e) =>
                          handleChange(
                            "budget",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Enter budget"
                        min="0"
                        step="0.01"
                        className={`campaign-input w-full ${
                          errors.budget ? "border-red-500" : ""
                        }`}
                      />
                      {errors.budget && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <span>!</span>
                          <span>{errors.budget}</span>
                        </p>
                      )}
                    </div>

                    {/* State */}
                    <div>
                      <label className="form-label">
                        State <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={STATE_OPTIONS}
                        value={formData.status}
                        onChange={(value) => handleChange("status", value)}
                        placeholder="Select state"
                        buttonClassName="edit-button w-full"
                      />
                      {errors.status && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.status}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 3: Targeting Type | Start Date | End Date (for SP campaigns) */}
                {formData.type === "SP" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Targeting Type */}
                    <div>
                      <label className="form-label">
                        Targeting Type <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={TARGETING_TYPE_OPTIONS}
                        value={formData.targetingType || "AUTO"}
                        onChange={(value) =>
                          handleChange(
                            "targetingType",
                            value as "AUTO" | "MANUAL"
                          )
                        }
                        placeholder="Select targeting type"
                        buttonClassName="edit-button w-full"
                        disabled={mode === "edit"}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="form-label">
                        Start Date <span>*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.startDate || ""}
                          onChange={(e) =>
                            handleChange("startDate", e.target.value)
                          }
                          disabled={mode === "edit"}
                          min={new Date().toISOString().split("T")[0]} // Prevent selecting past dates
                          className={`campaign-input w-full ${
                            errors.startDate
                              ? "border-red-500"
                              : "border-gray-200"
                          } ${
                            mode === "edit"
                              ? "bg-gray-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      </div>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {errors.startDate && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.startDate}
                        </p>
                      )}
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="form-label">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.endDate || ""}
                          onChange={(e) =>
                            handleChange("endDate", e.target.value)
                          }
                          disabled={mode === "edit"}
                          min={
                            formData.startDate ||
                            new Date().toISOString().split("T")[0]
                          } // Must be after start date or today
                          className={`campaign-input w-full ${
                            errors.endDate
                              ? "border-red-500"
                              : "border-gray-200"
                          } ${
                            mode === "edit"
                              ? "bg-gray-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                        {/* Clear button to remove end date */}
                        {formData.endDate && mode !== "edit" && (
                          <button
                            type="button"
                            onClick={() => handleChange("endDate", "")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#556179] hover:text-[#072929] text-[12px] font-medium"
                            title="Clear end date"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {mode !== "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1">
                          Optional - Leave empty for no end date
                        </p>
                      )}
                      {errors.endDate && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.endDate}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Start Date and End Date - For SB campaigns */}
                {formData.type === "SB" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Start Date */}
                    <div>
                      <label className="form-label">
                        Start Date <span>*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.startDate || ""}
                          onChange={(e) =>
                            handleChange("startDate", e.target.value)
                          }
                          className={`campaign-input w-full ${
                            errors.startDate
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                        />
                      </div>
                      {errors.startDate && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.startDate}
                        </p>
                      )}
                    </div>

                    {/* End Date - Required for LIFETIME budget type */}
                    {(formData.budgetType?.toUpperCase() === "LIFETIME" || formData.budgetType === "lifetime") && (
                      <div>
                        <label className="form-label">
                          End Date <span>*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.endDate || ""}
                            onChange={(e) =>
                              handleChange("endDate", e.target.value)
                            }
                            min={
                              formData.startDate ||
                              new Date().toISOString().split("T")[0]
                            } // Must be after start date or today
                            className={`campaign-input w-full ${
                              errors.endDate
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {errors.endDate ? (
                          <p className="text-[10px] text-red-500 mt-1">
                            {errors.endDate}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#556179] mt-1">
                            Required for LIFETIME budget type
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Start Date and End Date - For SD campaigns */}
                {formData.type === "SD" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Start Date */}
                    <div>
                      <label className="form-label">
                        Start Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.startDate || ""}
                          onChange={(e) =>
                            handleChange("startDate", e.target.value)
                          }
                          disabled={mode === "edit"}
                          className={`campaign-input w-full ${
                            errors.startDate
                              ? "border-red-500"
                              : "border-gray-200"
                          } ${
                            mode === "edit"
                              ? "bg-gray-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      </div>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {errors.startDate && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.startDate}
                        </p>
                      )}
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="form-label">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.endDate || ""}
                          onChange={(e) =>
                            handleChange("endDate", e.target.value)
                          }
                          min={
                            formData.startDate ||
                            new Date().toISOString().split("T")[0]
                          } // Must be after start date or today
                          disabled={mode === "edit"}
                          className={`campaign-input w-full ${
                            errors.endDate
                              ? "border-red-500"
                              : "border-gray-200"
                          } ${
                            mode === "edit"
                              ? "bg-gray-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      </div>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {errors.endDate && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.endDate}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 4: Portfolio ID */}
                {formData.type === "SP" && (
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="form-label">
                        Portfolio
                      </label>
                      <Dropdown<string>
                        options={portfolioOptions}
                        value={formData.portfolioId || undefined}
                        onChange={(value) => handleChange("portfolioId", value)}
                        placeholder={
                          !formData.profileId
                            ? "Select profile first"
                            : loadingPortfolios
                            ? "Loading portfolios..."
                            : "Select portfolio (optional)"
                        }
                        buttonClassName="edit-button w-full"
                        disabled={
                          !formData.profileId ||
                          loadingPortfolios ||
                          portfolioOptions.length === 0
                        }
                      />
                      {errors.portfolioId && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.portfolioId}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* SP Dynamic Bidding Section */}
                {formData.type === "SP" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-semibold text-[#072929]">
                        Dynamic Bidding
                      </h3>
                    </div>

                    {/* Placement Bid Adjustments - Always visible and enabled */}
                    <div className="mb-6">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 mb-4">
                        <button
                          type="button"
                          onClick={() => setActiveBiddingTab("strategy")}
                          className={`px-4 py-2 text-[14px] transition-colors ${
                            activeBiddingTab === "strategy"
                              ? "text-[#072929] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929]"
                          }`}
                        >
                          Strategy
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBiddingTab("placements")}
                          className={`px-4 py-2 text-[14px] transition-colors ${
                            activeBiddingTab === "placements"
                              ? "text-[#072929] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929]"
                          }`}
                        >
                          Placements
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBiddingTab("audiences")}
                          className={`px-4 py-2 text-[14px] transition-colors ${
                            activeBiddingTab === "audiences"
                              ? "text-[#072929] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929]"
                          }`}
                        >
                          Audiences
                        </button>
                      </div>

                      {/* Strategy Tab Content */}
                      {activeBiddingTab === "strategy" && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-4 gap-6">
                            <div>
                              <label className="form-label">
                                Strategy
                              </label>
                              <Dropdown<string>
                                options={[
                                  {
                                    value: "LEGACY_FOR_SALES",
                                    label: "LEGACY_FOR_SALES",
                                  },
                                  {
                                    value: "AUTO_FOR_SALES",
                                    label: "AUTO_FOR_SALES",
                                  },
                                  { value: "MANUAL", label: "MANUAL" },
                                ]}
                                value={formData.bidding?.strategy || undefined}
                                onChange={(value) => {
                                  setFormData((prev) => {
                                    const updated = { ...prev };
                                    if (!updated.bidding) {
                                      updated.bidding = {
                                        strategy: value as
                                          | "LEGACY_FOR_SALES"
                                          | "AUTO_FOR_SALES"
                                          | "MANUAL",
                                        bidOptimization: true,
                                        shopperCohortBidAdjustments: [],
                                        bidAdjustmentsByPlacement: [],
                                      };
                                    } else {
                                      updated.bidding = {
                                        ...updated.bidding,
                                        strategy: value as
                                          | "LEGACY_FOR_SALES"
                                          | "AUTO_FOR_SALES"
                                          | "MANUAL",
                                      };
                                    }
                                    return updated;
                                  });
                                }}
                                placeholder="Select strategy"
                                buttonClassName="edit-button w-full"
                              />
                              {mode === "create" &&
                                formData.bidding &&
                                !formData.bidding.strategy &&
                                ((formData.bidding.bidAdjustmentsByPlacement
                                  ?.length ?? 0) > 0 ||
                                  (formData.bidding.shopperCohortBidAdjustments
                                    ?.length ?? 0) > 0) && (
                                  <p className="text-[10px] text-[#556179] mt-1">
                                    Strategy is required when Dynamic Bidding is
                                    provided
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Placements Tab Content */}
                      {activeBiddingTab === "placements" && (
                        <>
                          {/* Placement Inputs */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                            {/* Instructions */}
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] text-[#072929]">
                                Increase your bid for specific Amazon
                                placements.
                              </p>
                              <svg
                                className="w-4 h-4 text-[#556179] cursor-help"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>

                            {/* Bid Optimization Field - Only for SP campaigns */}
                            {formData.type === "SP" && (
                              <div>
                                <label className="form-label-small">
                                  Bid Optimization
                                </label>
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={
                                      formData.bidding?.bidOptimization ?? true
                                    }
                                    onChange={(checked) => {
                                      const newBidOptimization = checked;
                                      setFormData((prev) => {
                                        const updated = { ...prev };
                                        if (!updated.bidding) {
                                          updated.bidding = {
                                            bidOptimization: newBidOptimization,
                                            shopperCohortBidAdjustments: [],
                                            bidAdjustmentsByPlacement: [],
                                          };
                                        } else {
                                          updated.bidding = {
                                            ...updated.bidding,
                                            bidOptimization: newBidOptimization,
                                            // Keep bidAdjustmentsByPlacement regardless of bidOptimization
                                            bidAdjustmentsByPlacement:
                                              updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                              [],
                                          };
                                        }
                                        return updated;
                                      });
                                    }}
                                    label="Automatic placement optimization"
                                    className="[&_label]:text-[13.3px] [&_label]:font-medium [&_label]:text-[#072929]"
                                  />
                                </div>
                                <p className="text-[12px] text-[#556179] mt-1">
                                  When enabled, placement adjustments are
                                  ignored
                                </p>
                              </div>
                            )}
                            {/* Placement Fields - 2 per row */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Top of search (PLACEMENT_TOP) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Top of search (PLACEMENT_TOP)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement === "PLACEMENT_TOP"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "PLACEMENT_TOP"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement: "PLACEMENT_TOP",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Rest of search (PLACEMENT_REST_OF_SEARCH) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Rest of search (PLACEMENT_REST_OF_SEARCH)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement ===
                                            "PLACEMENT_REST_OF_SEARCH"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "PLACEMENT_REST_OF_SEARCH"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement:
                                                  "PLACEMENT_REST_OF_SEARCH",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Product page (PLACEMENT_PRODUCT_PAGE) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Product page (PLACEMENT_PRODUCT_PAGE)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement ===
                                            "PLACEMENT_PRODUCT_PAGE"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "PLACEMENT_PRODUCT_PAGE"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement:
                                                  "PLACEMENT_PRODUCT_PAGE",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Amazon Business (SITE_AMAZON_BUSINESS) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Amazon Business (SITE_AMAZON_BUSINESS)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement ===
                                            "SITE_AMAZON_BUSINESS"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "SITE_AMAZON_BUSINESS"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement:
                                                  "SITE_AMAZON_BUSINESS",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Audiences Tab Content */}
                      {activeBiddingTab === "audiences" && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                          {/* Radio Buttons */}
                          <div className="space-y-3">
                            <label
                              className={`flex items-center gap-3 ${
                                mode === "edit"
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="radio"
                                name="audienceBidOption"
                                checked={increaseBidsForAudiences}
                                onChange={() =>
                                  setIncreaseBidsForAudiences(true)
                                }
                                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300"
                              />
                              <span className="text-[13px] font-medium text-[#072929]">
                                Increase bids for audiences built by Amazon
                              </span>
                            </label>
                            <label
                              className={`flex items-center gap-3 ${
                                mode === "edit"
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="radio"
                                name="audienceBidOption"
                                checked={!increaseBidsForAudiences}
                                onChange={() =>
                                  setIncreaseBidsForAudiences(false)
                                }
                                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300"
                              />
                              <span className="text-[13px] font-medium text-[#072929]">
                                Don't increase bids for an audience
                              </span>
                            </label>
                          </div>

                          {/* Audience Selection and Percentage - Only show when "Increase bids" is selected */}
                          {increaseBidsForAudiences && (
                            <div className="space-y-4">
                              <div className="flex gap-4 items-end">
                                {/* Audience Dropdown */}
                                <div className="flex-1">
                                  <label className="form-label">
                                    Audience
                                  </label>
                                  <div className="relative">
                                    <Dropdown<string>
                                      options={[
                                        {
                                          value: "40836",
                                          label:
                                            "Clicked or Added brand's product to cart - 40836...",
                                        },
                                        {
                                          value: "40837",
                                          label:
                                            "Viewed brand's product detail page - 40837...",
                                        },
                                        {
                                          value: "40838",
                                          label:
                                            "Purchased brand's product - 40838...",
                                        },
                                      ]}
                                      value={selectedAudience}
                                      onChange={(value) =>
                                        setSelectedAudience(value)
                                      }
                                      placeholder="Select audience"
                                      buttonClassName="edit-button w-full"
                                    />
                                    <svg
                                      className="w-4 h-4 text-[#556179] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </div>
                                </div>

                                {/* Percentage Input */}
                                <div className="flex-shrink-0">
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={audiencePercentage}
                                        onChange={(e) => {
                                          const value =
                                            parseFloat(e.target.value) || 0;
                                          if (value >= 0 && value <= 900) {
                                            setAudiencePercentage(value);
                                          }
                                        }}
                                        min="0"
                                        max="900"
                                        step="1"
                                        className="bg-[#FEFEFB] w-24 px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                      />
                                    </div>
                                    <span className="text-[13px] text-[#072929]">
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Helper Text */}
                              {selectedAudience && audiencePercentage > 0 && (
                                <p className="text-[12px] text-[#556179]">
                                  A A$0.80 cost-per-click can increase up to A$
                                  {(
                                    0.8 *
                                    (1 + audiencePercentage / 100)
                                  ).toFixed(2)}{" "}
                                  for this audience.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SP Site Restrictions and Tags Section */}
                {formData.type === "SP" && (
                  <>
                    {/* Site Restrictions */}
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <label className="form-label">
                          Site Restrictions
                        </label>
                        {mode === "edit" && (
                          <p className="text-[10px] text-[#556179] mb-2 italic">
                            Read-only: Site restrictions cannot be changed after
                            campaign creation
                          </p>
                        )}
                        <Dropdown<string>
                          options={[
                            {
                              value: "",
                              label: "Select Site Restrictions",
                            },
                            {
                              value: "AMAZON_BUSINESS",
                              label: "AMAZON_BUSINESS",
                            },
                          ]}
                          value={formData.siteRestrictions || ""}
                          onChange={(value) =>
                            handleChange("siteRestrictions", value || undefined)
                          }
                          placeholder="Select site restrictions (optional)"
                          buttonClassName={`w-full h-[38px] text-[14px] text-[#072929] ${
                            mode === "edit"
                              ? "bg-gray-50 cursor-not-allowed"
                              : "bg-[#FEFEFB]"
                          }`}
                          disabled={mode === "edit"}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="form-label">
                        Tags - Max 50
                      </label>
                      <div className="space-y-2">
                        {(formData.tags || []).map((tag, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={tag.key || ""}
                              onChange={(e) => {
                                const newTags = [...(formData.tags || [])];
                                newTags[index] = {
                                  ...newTags[index],
                                  key: e.target.value,
                                };
                                handleChange("tags", newTags);
                              }}
                              placeholder="Key"
                              className="campaign-input w-full"
                            />
                            <input
                              type="text"
                              value={tag.value || ""}
                              onChange={(e) => {
                                const newTags = [...(formData.tags || [])];
                                newTags[index] = {
                                  ...newTags[index],
                                  value: e.target.value,
                                };
                                handleChange("tags", newTags);
                              }}
                              placeholder="Value"
                              className="campaign-input w-full"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = [...(formData.tags || [])];
                                newTags.splice(index, 1);
                                handleChange("tags", newTags);
                              }}
                              className="px-3 py-2 text-red-500 hover:text-red-700 transition-colors"
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {(!formData.tags || formData.tags.length < 50) && (
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = [...(formData.tags || [])];
                              newTags.push({ key: "", value: "" });
                              handleChange("tags", newTags);
                            }}
                            className="px-4 py-2 text-[#136D6D] border border-[#136D6D] rounded-lg hover:bg-[#f0f9f9] transition-colors text-[14px]"
                          >
                            + Add Tag
                          </button>
                        )}
                        {formData.tags && formData.tags.length >= 50 && (
                          <p className="text-[11px] text-[#556179]">
                            Maximum of 50 tags reached
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* SD (Sponsored Display) Specific Fields */}
                {formData.type === "SD" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Tactic */}
                    <div>
                      <label className="form-label-small">
                        Tactic *
                      </label>
                      <Dropdown<string>
                        options={[
                          {
                            value: "T00020",
                            label: "T00020",
                          },
                          {
                            value: "T00030",
                            label: "T00030",
                          },
                        ]}
                        value={formData.tactic || ""}
                        onChange={(value) =>
                          handleChange("tactic", value as "T00020" | "T00030")
                        }
                        placeholder="Select tactic"
                        buttonClassName="edit-button w-full"
                        disabled={mode === "edit"}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {errors.tactic && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.tactic}
                        </p>
                      )}
                    </div>

                    {/* Cost Type */}
                    <div>
                      <label className="form-label-small">
                        Cost Type
                      </label>
                      <Dropdown<string>
                        options={[
                          {
                            value: "cpc",
                            label: "CPC - Cost Per Click",
                          },
                          {
                            value: "vcpm",
                            label: "VCPM",
                          },
                        ]}
                        value={formData.costType || "cpc"}
                        onChange={(value) =>
                          handleChange("costType", value as "cpc" | "vcpm")
                        }
                        placeholder="Select cost type"
                        buttonClassName="edit-button w-full"
                        disabled={false} // costType is editable in edit mode
                      />
                    </div>

                    {/* Portfolio ID */}
                    <div>
                      <label className="form-label-small">
                        Portfolio
                      </label>
                      <Dropdown<string>
                        options={portfolioOptions}
                        value={formData.portfolioId || undefined}
                        onChange={(value) => handleChange("portfolioId", value)}
                        placeholder={
                          !formData.profileId
                            ? "Select profile first"
                            : loadingPortfolios
                            ? "Loading portfolios..."
                            : "Select portfolio (optional)"
                        }
                        buttonClassName="edit-button w-full"
                        disabled={
                          !formData.profileId ||
                          loadingPortfolios ||
                          portfolioOptions.length === 0
                        }
                      />
                      {errors.portfolioId && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.portfolioId}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 4: Brand Entity ID | Targeted PG Deal ID (for SB campaigns) */}
                {formData.type === "SB" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Brand Entity ID */}
                    <div>
                      <label className="form-label">
                        Brand Entity ID <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={[
                          {
                            value: "",
                            label: "Select Brand entity ID",
                          },
                          ...brandEntityOptions,
                        ]}
                        value={formData.brandEntityId || ""}
                        onChange={(value) =>
                          handleChange("brandEntityId", value)
                        }
                        placeholder={
                          loadingBrandEntities
                            ? "Loading brand entities..."
                            : "Select Brand entity ID"
                        }
                        buttonClassName="edit-button w-full"
                        disabled={
                          mode === "edit" ||
                          loadingBrandEntities ||
                          brandEntityOptions.length === 0
                        }
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {errors.brandEntityId && (
                        <p className="text-[11px] text-red-600 mt-1">
                          {errors.brandEntityId}
                        </p>
                      )}
                    </div>

                    {/* Targeted PG Deal ID */}
                    <div>
                      <label className="form-label">
                        Targeted PG Deal ID
                      </label>
                      <input
                        type="text"
                        value={formData.targetedPGDealId || ""}
                        onChange={(e) =>
                          handleChange("targetedPGDealId", e.target.value)
                        }
                        placeholder="Enter DealId"
                        disabled={mode === "edit"}
                        className={`campaign-input w-full ${
                          mode === "edit" ? "bg-gray-50 cursor-not-allowed" : ""
                        }`}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 5: Product Location | Cost Type | Portfolio ID (for SB campaigns) */}
                {formData.type === "SB" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Product Location */}
                    <div>
                      <label className="form-label">
                        Product Location
                      </label>
                      <Dropdown<string>
                        options={[
                          {
                            value: "",
                            label: "Select Product Location",
                          },
                          {
                            value: "SOLD_ON_AMAZON",
                            label:
                              "SOLD_ON_AMAZON - For products sold on Amazon websites",
                          },
                          {
                            value: "NOT_SOLD_ON_AMAZON",
                            label:
                              "NOT_SOLD_ON_AMAZON - For products not sold on Amazon websites",
                          },
                          {
                            value: "SOLD_ON_DTC",
                            label:
                              "SOLD_ON_DTC - Deprecated (For products sold on DTC websites)",
                          },
                        ]}
                        value={formData.productLocation || ""}
                        onChange={(value) =>
                          handleChange("productLocation", value as any)
                        }
                        placeholder="Select Product Location"
                        buttonClassName="edit-button w-full"
                        disabled={mode === "edit"}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Cost Type */}
                    <div>
                      <label className="form-label">
                        Cost Type <span>*</span>
                      </label>
                      <Dropdown<string>
                        options={[
                          {
                            value: "CPC",
                            label: "CPC - Cost per click (Default)",
                          },
                          {
                            value: "VCPM",
                            label: "VCPM - Cost per 1000 viewable impressions",
                          },
                          {
                            value: "FIXED_PRICE",
                            label:
                              "FIXED_PRICE - Sale price for a specific ad placement (requires targetedPGDealId)",
                          },
                        ]}
                        value={formData.costType || "cpc"}
                        onChange={(value) => handleChange("costType", value)}
                        placeholder="Select cost type"
                        buttonClassName="edit-button w-full"
                        disabled={mode === "edit"}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      {errors.costType && (
                        <p className="text-[11px] text-red-600 mt-1">
                          {errors.costType}
                        </p>
                      )}
                    </div>

                    {/* Portfolio ID - Editable for SB campaigns in edit mode */}
                    <div>
                      <label className="form-label">
                        Portfolio
                      </label>
                      <Dropdown<string>
                        options={portfolioOptions}
                        value={formData.portfolioId || undefined}
                        onChange={(value) => handleChange("portfolioId", value)}
                        placeholder={
                          !formData.profileId
                            ? "Select profile first"
                            : loadingPortfolios
                            ? "Loading portfolios..."
                            : "Select portfolio (optional)"
                        }
                        buttonClassName="edit-button w-full"
                        disabled={
                          !formData.profileId ||
                          loadingPortfolios ||
                          portfolioOptions.length === 0
                        }
                      />
                      {errors.portfolioId && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.portfolioId}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 6: Smart Default (for SB campaigns) */}
                {formData.type === "SB" && (
                  <div className="grid grid-cols-4 gap-6">
                    {/* Smart Default */}
                    <div>
                      <label className="form-label">
                        Smart Default
                      </label>
                      <Dropdown<string>
                        options={[
                          { value: "MANUAL", label: "MANUAL" },
                          { value: "TARGETING", label: "TARGETING" },
                        ]}
                        value={formData.smartDefault || ""}
                        onChange={(value) =>
                          handleChange("smartDefault", value as any)
                        }
                        placeholder="Select smart default (optional)"
                        buttonClassName="edit-button w-full"
                        disabled={mode === "edit"}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>
                    {/* Empty columns for spacing */}
                    <div></div>
                    <div></div>
                  </div>
                )}

                {/* SB Dynamic Bidding Section (editable in edit mode) */}
                {formData.type === "SB" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-semibold text-[#072929]">
                        Dynamic Bidding
                      </h3>
                    </div>

                    {/* Bid Optimization Field */}
                    <div className="mb-6">
                      <label className="form-label-small">
                        Bid Optimization
                      </label>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={formData.bidding?.bidOptimization ?? true}
                          onChange={(checked) => {
                            const newBidOptimization = checked;
                            setFormData((prev) => {
                              const updated = { ...prev };
                              if (!updated.bidding) {
                                updated.bidding = {
                                  bidOptimization: newBidOptimization,
                                  shopperCohortBidAdjustments: [],
                                  bidAdjustmentsByPlacement: [],
                                };
                              } else {
                                updated.bidding = {
                                  ...updated.bidding,
                                  bidOptimization: newBidOptimization,
                                  // Keep bidAdjustmentsByPlacement regardless of bidOptimization
                                  bidAdjustmentsByPlacement:
                                    updated.bidding.bidAdjustmentsByPlacement ||
                                    [],
                                };
                              }
                              return updated;
                            });
                          }}
                          label="Automatic placement optimization"
                          className="[&_label]:text-[13.3px] [&_label]:font-medium [&_label]:text-[#072929]"
                        />
                      </div>
                      <p className="text-[12px] text-[#556179] mt-1">
                        When enabled, placement adjustments are ignored
                      </p>
                    </div>

                    {/* Placement Bid Adjustments - Always visible and enabled */}
                    <div className="mb-6">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 mb-4">
                        <button
                          type="button"
                          onClick={() => setActiveBiddingTab("placements")}
                          className={`px-4 py-2 text-[14px] transition-colors ${
                            activeBiddingTab === "placements"
                              ? "text-[#072929] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929]"
                          }`}
                        >
                          Placements
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBiddingTab("audiences")}
                          className={`px-4 py-2 text-[14px] transition-colors ${
                            activeBiddingTab === "audiences"
                              ? "text-[#072929] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929]"
                          }`}
                        >
                          Audiences
                        </button>
                      </div>

                      {/* Placements Tab Content */}
                      {activeBiddingTab === "placements" && (
                        <>
                          {/* Instructions */}
                          <div className="flex items-center gap-2 mb-4">
                            <p className="text-[13px] text-[#072929]">
                              Increase your bid for specific Amazon placements.
                            </p>
                            <svg
                              className="w-4 h-4 text-[#556179] cursor-help"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>

                          {/* Placement Inputs */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            {/* Placement Fields - 2 per row */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Top of search (PLACEMENT_TOP) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Top of search (PLACEMENT_TOP)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement === "PLACEMENT_TOP"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "PLACEMENT_TOP"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement: "PLACEMENT_TOP",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Rest of search (PLACEMENT_REST_OF_SEARCH) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Rest of search (PLACEMENT_REST_OF_SEARCH)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement ===
                                            "PLACEMENT_REST_OF_SEARCH"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "PLACEMENT_REST_OF_SEARCH"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement:
                                                  "PLACEMENT_REST_OF_SEARCH",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Product page (PLACEMENT_PRODUCT_PAGE) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Product page (PLACEMENT_PRODUCT_PAGE)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement ===
                                            "PLACEMENT_PRODUCT_PAGE"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "PLACEMENT_PRODUCT_PAGE"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement:
                                                  "PLACEMENT_PRODUCT_PAGE",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Amazon Business (SITE_AMAZON_BUSINESS) */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Amazon Business (SITE_AMAZON_BUSINESS)
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement ===
                                            "SITE_AMAZON_BUSINESS"
                                        )?.percentage || 0
                                      }
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        if (value >= -99 && value <= 900) {
                                          setFormData((prev) => {
                                            const updated = { ...prev };
                                            if (!updated.bidding) {
                                              updated.bidding = {
                                                bidOptimization: true,
                                                shopperCohortBidAdjustments: [],
                                                bidAdjustmentsByPlacement: [],
                                              };
                                            }
                                            const adjustments = [
                                              ...(updated.bidding
                                                .bidAdjustmentsByPlacement ||
                                                []),
                                            ];
                                            const existingIndex =
                                              adjustments.findIndex(
                                                (adj) =>
                                                  adj.placement ===
                                                  "SITE_AMAZON_BUSINESS"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement:
                                                  "SITE_AMAZON_BUSINESS",
                                              });
                                            }
                                            updated.bidding.bidAdjustmentsByPlacement =
                                              adjustments;
                                            return updated;
                                          });
                                        }
                                      }}
                                      min="-99"
                                      max="900"
                                      step="1"
                                      className="campaign-input w-full"
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Audiences Tab Content */}
                      {activeBiddingTab === "audiences" && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                          {/* Radio Buttons */}
                          <div className="space-y-3">
                            <label
                              className={`flex items-center gap-3 ${
                                mode === "edit"
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="radio"
                                name="audienceBidOption"
                                checked={increaseBidsForAudiences}
                                onChange={() =>
                                  setIncreaseBidsForAudiences(true)
                                }
                                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300"
                              />
                              <span className="text-[13px] font-medium text-[#072929]">
                                Increase bids for audiences built by Amazon
                              </span>
                            </label>
                            <label
                              className={`flex items-center gap-3 ${
                                mode === "edit"
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="radio"
                                name="audienceBidOption"
                                checked={!increaseBidsForAudiences}
                                onChange={() =>
                                  setIncreaseBidsForAudiences(false)
                                }
                                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300"
                              />
                              <span className="text-[13px] font-medium text-[#072929]">
                                Don't increase bids for an audience
                              </span>
                            </label>
                          </div>

                          {/* Audience Selection and Percentage - Only show when "Increase bids" is selected */}
                          {increaseBidsForAudiences && (
                            <div className="space-y-4">
                              <div className="flex gap-4 items-end">
                                {/* Audience Dropdown */}
                                <div className="flex-1">
                                  <label className="form-label">
                                    Audience
                                  </label>
                                  <div className="relative">
                                    <Dropdown<string>
                                      options={[
                                        {
                                          value: "40836",
                                          label:
                                            "Clicked or Added brand's product to cart - 40836...",
                                        },
                                        {
                                          value: "40837",
                                          label:
                                            "Viewed brand's product detail page - 40837...",
                                        },
                                        {
                                          value: "40838",
                                          label:
                                            "Purchased brand's product - 40838...",
                                        },
                                      ]}
                                      value={selectedAudience}
                                      onChange={(value) =>
                                        setSelectedAudience(value)
                                      }
                                      placeholder="Select audience"
                                      buttonClassName="edit-button w-full"
                                    />
                                    <svg
                                      className="w-4 h-4 text-[#556179] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </div>
                                </div>

                                {/* Percentage Input */}
                                <div className="flex-shrink-0">
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={audiencePercentage}
                                        onChange={(e) => {
                                          const value =
                                            parseFloat(e.target.value) || 0;
                                          if (value >= 0 && value <= 900) {
                                            setAudiencePercentage(value);
                                          }
                                        }}
                                        min="0"
                                        max="900"
                                        step="1"
                                        className="bg-[#FEFEFB] w-24 px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                      />
                                    </div>
                                    <span className="text-[13px] text-[#072929]">
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Helper Text */}
                              {selectedAudience && audiencePercentage > 0 && (
                                <p className="text-[12px] text-[#556179]">
                                  A A$0.80 cost-per-click can increase up to A$
                                  {(
                                    0.8 *
                                    (1 + audiencePercentage / 100)
                                  ).toFixed(2)}{" "}
                                  for this audience.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags Section - For SB campaigns (editable in edit mode) */}
                {formData.type === "SB" && (
                  <div className="mt-4">
                    <label className="form-label">
                      Tags  - Max 50
                    </label>
                    <div className="space-y-2">
                      {(formData.tags || []).map((tag, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={tag.key || ""}
                            onChange={(e) => {
                              const newTags = [...(formData.tags || [])];
                              newTags[index] = {
                                ...newTags[index],
                                key: e.target.value,
                              };
                              handleChange("tags", newTags);
                            }}
                            placeholder="Key"
                            className="bg-[#FEFEFB] flex-1 px-3 py-2 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                          />
                          <input
                            type="text"
                            value={tag.value || ""}
                            onChange={(e) => {
                              const newTags = [...(formData.tags || [])];
                              newTags[index] = {
                                ...newTags[index],
                                value: e.target.value,
                              };
                              handleChange("tags", newTags);
                            }}
                            placeholder="Value"
                            className="bg-[#FEFEFB] flex-1 px-3 py-2 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = [...(formData.tags || [])];
                              newTags.splice(index, 1);
                              handleChange("tags", newTags);
                            }}
                            className="px-3 py-2 text-red-500 hover:text-red-700 transition-colors"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {(!formData.tags || formData.tags.length < 50) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = [...(formData.tags || [])];
                            newTags.push({ key: "", value: "" });
                            handleChange("tags", newTags);
                          }}
                          className="px-4 py-2 text-[#136D6D] border border-[#136D6D] rounded-lg hover:bg-[#f0f9f9] transition-colors text-[14px]"
                        >
                          + Add Tag
                        </button>
                      )}
                      {formData.tags && formData.tags.length >= 50 && (
                        <p className="text-[11px] text-[#556179]">
                          Maximum of 50 tags reached
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="cancel-button"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="apply-button">
            {loading
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
              ? "Save Changes"
              : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
};
