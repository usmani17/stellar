import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
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
}

export interface CreateCampaignData {
  campaign_name: string;
  type: "SP" | "SB" | "SD" | "";
  budget: number;
  budgetType: "DAILY" | "LIFETIME" | "daily";
  status: "Enabled" | "Paused" | "enabled" | "ENABLED" | "PAUSED";
  startDate?: string;
  endDate?: string;
  profileId?: string;
  // SB (Sponsored Brands) specific fields
  brandEntityId?: string;
  goal?:
    | "DRIVE_PAGE_VISITS"
    | "GROW_BRAND_IMPRESSION_SHARE"
    | "RESERVE_SHARE_OF_VOICE";
  productLocation?: "SOLD_ON_AMAZON" | "NOT_SOLD_ON_AMAZON" | "SOLD_ON_DTC";
  costType?: string;
  portfolioId?: string;
  targetedPGDealId?: string;
  tags?: Record<string, string>;
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
      placement: "HOME" | "DETAIL_PAGE" | "OTHER" | "TOP_OF_SEARCH";
    }>;
  };
  // SD (Sponsored Display) specific fields
  tactic?: string;
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
    goal: "DRIVE_PAGE_VISITS", // Default to Drive page visits
    productLocation: "SOLD_ON_AMAZON",
    costType: "CPC",
    portfolioId: "",
    targetedPGDealId: "",
    tags: {},
    smartDefault: undefined,
    // SD fields
    tactic: "",
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
    useState<boolean>(true);
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [audiencePercentage, setAudiencePercentage] = useState<number>(100);
  const [profileOptions, setProfileOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [portfolioOptions, setPortfolioOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateCampaignData, string>>
  >({});

  // Load profiles when panel opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadProfiles();
    }
  }, [isOpen, accountId]);

  // Load portfolios when panel opens (not campaign-type specific)
  useEffect(() => {
    if (isOpen) {
      loadPortfolios();
    }
  }, [isOpen]);

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

  // When opening in edit mode, pre-populate form with initial data
  useEffect(() => {
    if (isOpen && mode === "edit" && initialData) {
      const newFormData = {
        ...initialData,
        // Ensure type is a valid value (fallback to previous if not provided)
        type: (initialData.type as any) || "",
        // Convert endDate from YYYYMMDD to YYYY-MM-DD format if needed
        endDate: convertDateToInputFormat(initialData.endDate),
        // Ensure SP campaigns always have DAILY budget type
        budgetType:
          initialData.type === "SP"
            ? "DAILY"
            : initialData.budgetType || "DAILY",
      };
      setFormData((prev) => ({
        ...prev,
        ...newFormData,
      }));
      // Store original data for comparison (with original endDate format)
      setOriginalData({ ...initialData });
    }
    if (isOpen && mode === "create" && !initialData) {
      // For fresh create opens, reset the form
      resetForm();
      setOriginalData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, initialData]);

  // Parse field errors from submitError
  useEffect(() => {
    if (submitError) {
      try {
        // Try to parse as JSON (if it contains field errors)
        const parsed = JSON.parse(submitError);
        if (parsed.fieldErrors && typeof parsed.fieldErrors === "object") {
          // Set field-specific errors
          setErrors(parsed.fieldErrors);
        }
      } catch (e) {
        // If not JSON, it's just a plain error message
        // Clear field errors but keep the general error message
        setErrors({});
      }
    } else {
      // Clear errors when submitError is cleared
      setErrors({});
    }
  }, [submitError]);

  const loadProfiles = async () => {
    if (!accountId) return;

    try {
      setLoadingProfiles(true);
      const channels = await accountsService.getAccountChannels(
        parseInt(accountId)
      );
      const amazonChannel = channels.find((ch) => ch.channel_type === "amazon");

      if (amazonChannel) {
        const response = await accountsService.getProfiles(amazonChannel.id);
        const activeProfiles = (response.profiles || []).filter(
          (profile: any) => profile.is_selected && !profile.deleted_at
        );

        const options = activeProfiles.map((profile: any) => ({
          value: profile.profileId || profile.id || "",
          label: profile.name || profile.profileId || profile.id || "",
        }));

        setProfileOptions(options);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfileOptions([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadPortfolios = async () => {
    if (!accountId) return;

    try {
      setLoadingPortfolios(true);
      const portfolios = await accountsService.getPortfolios(
        parseInt(accountId)
      );
      const options =
        portfolios?.map((p) => ({
          value: p.id,
          label: `${p.name} (${p.id})`,
        })) || [];
      setPortfolioOptions(options);
    } catch (error) {
      console.error("Failed to load portfolios:", error);
      setPortfolioOptions([]);
    } finally {
      setLoadingPortfolios(false);
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
    value: string | number | string[] | Record<string, string>
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
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
          updated.goal = "DRIVE_PAGE_VISITS"; // Default goal for SB campaigns
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

      // Validate end date for SP campaigns (must be today or in the future, can be empty)
      if (formData.type === "SP" && formData.endDate) {
        const selectedDate = new Date(formData.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          newErrors.endDate = "End date must be today or in the future";
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
    }

    // SD specific validation
    if (formData.type === "SD" && !formData.tactic?.trim()) {
      newErrors.tactic = "Tactic is required for Sponsored Display campaigns";
    }

    // SP specific: strategy is required if dynamicBidding (bidding) is provided (only for create mode)
    if (
      formData.type === "SP" &&
      formData.bidding &&
      !formData.bidding.strategy
    ) {
      // Strategy is required for create requests if dynamicBidding is provided
      // This prevents submission - error message is shown in the Strategy tab UI
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildFilteredPayload = (
    data: CreateCampaignData
  ): CreateCampaignData => {
    const basePayload: CreateCampaignData = {
      campaign_name: data.campaign_name,
      type: data.type as "SP" | "SB" | "SD",
      budget: data.budget,
      budgetType: data.budgetType,
      status: data.status,
      profileId: data.profileId,
      startDate: data.startDate,
      endDate: data.endDate,
    };

    // Campaign type specific fields
    if (data.type === "SP") {
      // SP specific fields
      if (data.targetingType) {
        basePayload.targetingType = data.targetingType;
      }
      if (data.portfolioId) {
        basePayload.portfolioId = data.portfolioId;
      }
      if (data.siteRestrictions) {
        basePayload.siteRestrictions = data.siteRestrictions;
      }
      if (data.tags && Object.keys(data.tags).length > 0) {
        basePayload.tags = data.tags;
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
      if (data.brandEntityId) {
        basePayload.brandEntityId = data.brandEntityId;
      }
      if (data.goal) {
        basePayload.goal = data.goal;
      }
      if (data.productLocation) {
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
      if (data.tags && Object.keys(data.tags).length > 0) {
        basePayload.tags = data.tags;
      }
      if (data.smartDefault) {
        basePayload.smartDefault = data.smartDefault;
      }
      if (data.bidding) {
        basePayload.bidding = data.bidding;
      }

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

    if (!validate()) {
      return;
    }

    // Filter payload to only include campaign-type-specific fields
    const filteredPayload = buildFilteredPayload(formData);
    try {
      await onSubmit(filteredPayload);
      // Only reset form and close on success
      resetForm();
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
      // Don't reset form or close panel on error - let user fix and resubmit
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
      productLocation: "SOLD_ON_AMAZON",
      costType: "CPC",
      portfolioId: "",
      targetedPGDealId: "",
      tags: {},
      smartDefault: undefined,
      tactic: "",
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
          <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
            {mode === "edit" ? "Edit Campaign" : "Create Campaign"}
          </h2>

          {/* Form Fields - Layout matching Figma */}
          <div className="space-y-6">
            {/* Row 1: Profile | Campaign Type | State (only for SB) */}
            {formData.type === "SB" ? (
              <div className="grid grid-cols-3 gap-6">
                {/* Profile */}
                {profileOptions.length > 0 && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Profile
                    </label>
                    <Dropdown<string>
                      options={profileOptions}
                      value={formData.profileId || undefined}
                      onChange={(value) => handleChange("profileId", value)}
                      placeholder={
                        loadingProfiles
                          ? "Loading profiles..."
                          : "Select profile"
                      }
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      disabled={loadingProfiles || mode === "edit"}
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
                )}

                {/* Campaign Type */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                    Campaign Type
                  </label>
                  <Dropdown<string>
                    options={CAMPAIGN_TYPES}
                    value={formData.type}
                    onChange={(value) => handleChange("type", value)}
                    placeholder="Select campaign type"
                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
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

                {/* State - Only shown in Row 1 for SB */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                    State
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
                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {/* Profile */}
                {profileOptions.length > 0 && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Profile
                    </label>
                    <Dropdown<string>
                      options={profileOptions}
                      value={formData.profileId || undefined}
                      onChange={(value) => handleChange("profileId", value)}
                      placeholder={
                        loadingProfiles
                          ? "Loading profiles..."
                          : "Select profile"
                      }
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      disabled={loadingProfiles || mode === "edit"}
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
                )}

                {/* Campaign Type */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                    Campaign Type
                  </label>
                  <Dropdown<string>
                    options={CAMPAIGN_TYPES}
                    value={formData.type}
                    onChange={(value) => handleChange("type", value)}
                    placeholder="Select campaign type"
                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
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
                  <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                    Goals
                  </label>
                  <p className="text-[12px] text-[#556179] mb-4">
                    Choose a campaign outcome that aligns with your business
                    goals. We'll make bidding and targeting recommendations to
                    help achieve this outcome.
                  </p>
                  <Dropdown
                    options={[
                      {
                        value: "DRIVE_PAGE_VISITS",
                        label: "Drive page visits",
                      },
                      {
                        value: "GROW_BRAND_IMPRESSION_SHARE",
                        label: "Grow brand impression share",
                      },
                      {
                        value: "RESERVE_SHARE_OF_VOICE",
                        label: "Reserve share of voice",
                      },
                    ]}
                    value={formData.goal}
                    onChange={(value) => handleChange("goal", value as any)}
                    disabled={mode === "edit"}
                    placeholder="Select a goal"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Show fields only when campaign type is selected */}
            {formData.type && (
              <>
                {/* Row 2: Campaign Name | Budget | Budget Type | State (for SB: 4 columns, for others: 3 columns) */}
                {formData.type === "SB" ? (
                  <div className="grid grid-cols-12 gap-6">
                    {/* Campaign Name - spans 4 columns */}
                    <div className="col-span-4">
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Campaign Name
                      </label>
                      <input
                        type="text"
                        value={formData.campaign_name}
                        onChange={(e) =>
                          handleChange("campaign_name", e.target.value)
                        }
                        placeholder="Enter campaign name"
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          errors.campaign_name
                            ? "border-red-500"
                            : "border-gray-200"
                        }`}
                      />
                      {errors.campaign_name && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.campaign_name}
                        </p>
                      )}
                    </div>

                    {/* Budget - spans 2 columns */}
                    <div className="col-span-2">
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Budget
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
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          errors.budget ? "border-red-500" : "border-gray-200"
                        }`}
                      />
                      {errors.budget && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <span>!</span>
                          <span>{errors.budget}</span>
                        </p>
                      )}
                    </div>

                    {/* Budget Type - spans 2 columns */}
                    <div className="col-span-2">
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Budget Type
                      </label>
                      <Dropdown<string>
                        options={BUDGET_TYPES}
                        value={formData.budgetType}
                        onChange={(value) => handleChange("budgetType", value)}
                        placeholder="Select"
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      />
                    </div>

                    {/* State - spans 4 columns */}
                    <div className="col-span-4">
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        State
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
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Campaign Name */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Campaign Name
                      </label>
                      <input
                        type="text"
                        value={formData.campaign_name}
                        onChange={(e) =>
                          handleChange("campaign_name", e.target.value)
                        }
                        placeholder="Enter campaign name"
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          errors.campaign_name
                            ? "border-red-500"
                            : "border-gray-200"
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
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Budget
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
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          errors.budget ? "border-red-500" : "border-gray-200"
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
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        State
                      </label>
                      <Dropdown<string>
                        options={STATE_OPTIONS}
                        value={
                          formData.type === "SD"
                            ? formData.status === "enabled"
                              ? "Enabled"
                              : String(formData.status).toLowerCase() ===
                                "paused"
                              ? "Paused"
                              : formData.status
                            : formData.status
                        }
                        onChange={(value) => {
                          if (formData.type === "SD") {
                            handleChange(
                              "status",
                              value.toLowerCase() as "enabled" | "paused"
                            );
                          } else {
                            handleChange("status", value);
                          }
                        }}
                        placeholder="Select state"
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      />
                      {errors.status && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.status}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Budget Type - Hidden for SP and SB campaigns (SB has it integrated in Budget field) */}
                {/* Note: Budget Type is editable in edit mode for SD campaigns */}
                {formData.type === "SD" && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Budget Type
                    </label>
                    <Dropdown<string>
                      options={BUDGET_TYPES}
                      value={formData.budgetType}
                      onChange={(value) => handleChange("budgetType", value)}
                      placeholder="Select budget type"
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      disabled={false} // Budget Type is editable in edit mode
                    />
                  </div>
                )}

                {/* Row 3: Targeting Type | Start Date | End Date (for SP campaigns) */}
                {formData.type === "SP" && (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Targeting Type */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Targeting Type
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
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      />
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
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
                          className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
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
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.endDate || ""}
                          onChange={(e) =>
                            handleChange("endDate", e.target.value)
                          }
                          min={new Date().toISOString().split("T")[0]} // Minimum date is today
                          className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                            errors.endDate
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                        />
                        {/* Clear button to remove end date */}
                        {formData.endDate && (
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
                      <p className="text-[10px] text-[#556179] mt-1">
                        Optional - Leave empty for no end date
                      </p>
                      {errors.endDate && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.endDate}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Start Date and End Date - For SB and SD campaigns */}
                {(formData.type === "SB" || formData.type === "SD") && (
                  <div
                    className={`grid gap-6 ${
                      formData.type === "SB" ? "grid-cols-2" : "grid-cols-3"
                    }`}
                  >
                    {/* Start Date */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        {formData.type === "SB" ? "Start" : "Start Date"}
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.startDate || ""}
                          onChange={(e) =>
                            handleChange("startDate", e.target.value)
                          }
                          disabled={mode === "edit"}
                          className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
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
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        {formData.type === "SB" ? "End" : "End Date"}
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.endDate || ""}
                          onChange={(e) =>
                            handleChange("endDate", e.target.value)
                          }
                          min={formData.startDate || undefined}
                          disabled={mode === "edit"}
                          className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
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

                {/* Row 4: Portfolio ID - Full Width Dropdown */}
                {formData.type === "SP" && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Portfolio ID
                    </label>
                    <Dropdown<string>
                      options={portfolioOptions}
                      value={formData.portfolioId || undefined}
                      onChange={(value) => handleChange("portfolioId", value)}
                      placeholder={
                        loadingPortfolios
                          ? "Loading portfolios..."
                          : "Select portfolio (optional)"
                      }
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      disabled={
                        loadingPortfolios || portfolioOptions.length === 0
                      }
                    />
                    {errors.portfolioId && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.portfolioId}
                      </p>
                    )}
                  </div>
                )}

                {/* SP Dynamic Bidding Section */}
                {formData.type === "SP" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-semibold text-[#072929]">
                        Dynamic Bidding
                      </h3>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Bid Optimization Field */}
                    <div className="mb-6">
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                        Bid Optimization
                      </label>
                      <div className="flex items-center gap-3">
                        <label
                          className={`flex items-center gap-2 ${
                            mode === "edit"
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.bidding?.bidOptimization ?? true}
                            onChange={(e) => {
                              const newBidOptimization = e.target.checked;
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
                                        .bidAdjustmentsByPlacement || [],
                                  };
                                }
                                return updated;
                              });
                            }}
                            disabled={mode === "edit"}
                            className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 rounded"
                          />
                          <span className="text-[13.3px] font-medium text-[#072929]">
                            Automatic placement optimization
                          </span>
                        </label>
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
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
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
                              buttonClassName="w-full bg-[#FEFEFB] text-[14px] text-[#072929]"
                              disabled={mode === "edit"}
                            />
                            {mode === "create" &&
                              formData.bidding &&
                              !formData.bidding.strategy && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  Strategy is required when Dynamic Bidding is
                                  provided
                                </p>
                              )}
                          </div>
                        </div>
                      )}

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
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                            {/* Top of search */}
                            <div>
                              <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                Top of search
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1 max-w-[120px]">
                                  <input
                                    type="number"
                                    value={
                                      formData.bidding?.bidAdjustmentsByPlacement?.find(
                                        (adj) =>
                                          adj.placement === "TOP_OF_SEARCH"
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
                                              .bidAdjustmentsByPlacement || []),
                                          ];
                                          const existingIndex =
                                            adjustments.findIndex(
                                              (adj) =>
                                                adj.placement ===
                                                "TOP_OF_SEARCH"
                                            );
                                          if (existingIndex >= 0) {
                                            adjustments[
                                              existingIndex
                                            ].percentage = value;
                                          } else {
                                            adjustments.push({
                                              percentage: value,
                                              placement: "TOP_OF_SEARCH",
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
                                    disabled={mode === "edit"}
                                    className={`bg-[#FEFEFB] w-full px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                      mode === "edit"
                                        ? "bg-gray-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  />
                                </div>
                                <span className="text-[13px] text-[#072929]">
                                  %
                                </span>
                              </div>
                            </div>

                            {/* Rest of search */}
                            <div>
                              <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                Rest of search
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1 max-w-[120px]">
                                  <input
                                    type="number"
                                    value={
                                      formData.bidding?.bidAdjustmentsByPlacement?.find(
                                        (adj) => adj.placement === "OTHER"
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
                                              .bidAdjustmentsByPlacement || []),
                                          ];
                                          const existingIndex =
                                            adjustments.findIndex(
                                              (adj) => adj.placement === "OTHER"
                                            );
                                          if (existingIndex >= 0) {
                                            adjustments[
                                              existingIndex
                                            ].percentage = value;
                                          } else {
                                            adjustments.push({
                                              percentage: value,
                                              placement: "OTHER",
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
                                    disabled={mode === "edit"}
                                    className={`bg-[#FEFEFB] w-full px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                      mode === "edit"
                                        ? "bg-gray-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  />
                                </div>
                                <span className="text-[13px] text-[#072929]">
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Audiences Tab Content */}
                      {activeBiddingTab === "audiences" && (
                        <div className="space-y-4">
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
                                disabled={mode === "edit"}
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
                                disabled={mode === "edit"}
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
                                  <label className="block text-[13px] font-semibold text-[#072929] mb-2">
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
                                      buttonClassName="w-full bg-[#FEFEFB] text-[14px] text-[#072929]"
                                      disabled={mode === "edit"}
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
                                        disabled={mode === "edit"}
                                        className={`bg-[#FEFEFB] w-24 px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                          mode === "edit"
                                            ? "bg-gray-50 cursor-not-allowed"
                                            : ""
                                        }`}
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
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Site Restrictions
                      </label>
                      <Dropdown<string>
                        options={[
                          {
                            value: "AMAZON_BUSINESS",
                            label: "AMAZON_BUSINESS",
                          },
                        ]}
                        value={formData.siteRestrictions || undefined}
                        onChange={(value) =>
                          handleChange("siteRestrictions", value)
                        }
                        placeholder="Select site restrictions (optional)"
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                        disabled={mode === "edit"}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Tags (Key-Value Pairs) - Max 50
                      </label>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mb-2 italic">
                          Read-only in edit mode
                        </p>
                      )}
                      <div className="space-y-2">
                        {Object.entries(formData.tags || {}).map(
                          ([key, value], index) => (
                            <div
                              key={index}
                              className="flex gap-2 items-center"
                            >
                              <input
                                type="text"
                                value={key}
                                onChange={(e) => {
                                  const newTags = { ...formData.tags };
                                  const oldKey = key;
                                  delete newTags[oldKey];
                                  if (e.target.value) {
                                    newTags[e.target.value] = value;
                                  }
                                  handleChange("tags", newTags);
                                }}
                                placeholder="Key"
                                disabled={mode === "edit"}
                                className={`bg-[#FEFEFB] flex-1 px-3 py-2 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                  mode === "edit"
                                    ? "bg-gray-50 cursor-not-allowed"
                                    : ""
                                }`}
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => {
                                  const newTags = { ...formData.tags };
                                  newTags[key] = e.target.value;
                                  handleChange("tags", newTags);
                                }}
                                placeholder="Value"
                                disabled={mode === "edit"}
                                className={`bg-[#FEFEFB] flex-1 px-3 py-2 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                  mode === "edit"
                                    ? "bg-gray-50 cursor-not-allowed"
                                    : ""
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = { ...formData.tags };
                                  delete newTags[key];
                                  handleChange("tags", newTags);
                                }}
                                disabled={mode === "edit"}
                                className={`px-3 py-2 text-red-500 hover:text-red-700 transition-colors ${
                                  mode === "edit"
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          )
                        )}
                        {(!formData.tags ||
                          Object.keys(formData.tags).length < 50) && (
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = { ...(formData.tags || {}) };
                              const newKey = `key${
                                Object.keys(newTags).length + 1
                              }`;
                              newTags[newKey] = "";
                              handleChange("tags", newTags);
                            }}
                            disabled={mode === "edit"}
                            className={`px-4 py-2 text-[#136D6D] border border-[#136D6D] rounded-lg hover:bg-[#f0f9f9] transition-colors text-[14px] ${
                              mode === "edit"
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            + Add Tag
                          </button>
                        )}
                        {formData.tags &&
                          Object.keys(formData.tags).length >= 50 && (
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
                  <>
                    {/* Tactic */}
                    <div>
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                        Tactic *
                      </label>
                      <input
                        type="text"
                        value={formData.tactic || ""}
                        onChange={(e) => handleChange("tactic", e.target.value)}
                        placeholder="Enter tactic (e.g., T00030)"
                        disabled={mode === "edit"}
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 border rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          errors.tactic ? "border-red-500" : "border-gray-200"
                        } ${
                          mode === "edit" ? "bg-gray-50 cursor-not-allowed" : ""
                        }`}
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
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                        Cost Type
                      </label>
                      <input
                        type="text"
                        value={formData.costType || ""}
                        onChange={(e) =>
                          handleChange("costType", e.target.value)
                        }
                        placeholder="Enter cost type (e.g., cpc)"
                        disabled={mode === "edit"}
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          mode === "edit" ? "bg-gray-50 cursor-not-allowed" : ""
                        }`}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Portfolio ID */}
                    <div>
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                        Portfolio ID
                      </label>
                      <Dropdown<string>
                        options={portfolioOptions}
                        value={formData.portfolioId || undefined}
                        onChange={(value) => handleChange("portfolioId", value)}
                        placeholder={
                          loadingPortfolios
                            ? "Loading portfolios..."
                            : "Select portfolio (optional)"
                        }
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                        disabled={
                          loadingPortfolios || portfolioOptions.length === 0
                        }
                      />
                      {errors.portfolioId && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.portfolioId}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Row 4: Brand Entity ID | Targeted PG Deal ID (for SB campaigns) */}
                {formData.type === "SB" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Brand Entity ID */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Brand Entity ID
                      </label>
                      <input
                        type="text"
                        value={formData.brandEntityId || ""}
                        onChange={(e) =>
                          handleChange("brandEntityId", e.target.value)
                        }
                        placeholder="Enter brand entity ID"
                        disabled={mode === "edit"}
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                          mode === "edit" ? "bg-gray-50 cursor-not-allowed" : ""
                        }`}
                      />
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] mt-1 italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Targeted PG Deal ID */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
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
                        className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
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
                  <div className="grid grid-cols-3 gap-6">
                    {/* Product Location */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                        Product Location
                      </label>
                          <Dropdown<string>
                            options={[
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
                            value={formData.productLocation || "SOLD_ON_AMAZON"}
                            onChange={(value) =>
                              handleChange("productLocation", value as any)
                            }
                      placeholder="Select product location"
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
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
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Cost Type
                    </label>
                    <Dropdown<string>
                      options={[
                        {
                          value: "CPC",
                          label: "CPC - Cost per click (Default)",
                        },
                        {
                          value: "VCPM",
                          label:
                            "VCPM - Cost per 1000 viewable impressions",
                        },
                        {
                          value: "FIXED_PRICE",
                          label:
                            "FIXED_PRICE - Sale price for a specific ad placement (requires targetedPGDealId)",
                        },
                      ]}
                      value={formData.costType || "CPC"}
                      onChange={(value) => handleChange("costType", value)}
                      placeholder="Select cost type"
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      disabled={mode === "edit"}
                    />
                    {mode === "edit" && (
                      <p className="text-[10px] text-[#556179] mt-1 italic">
                        Read-only in edit mode
                      </p>
                    )}
                  </div>

                  {/* Portfolio ID */}
                  <div>
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Portfolio ID
                    </label>
                    <Dropdown<string>
                      options={portfolioOptions}
                      value={formData.portfolioId || undefined}
                      onChange={(value) => handleChange("portfolioId", value)}
                      placeholder={
                        loadingPortfolios
                          ? "Loading portfolios..."
                          : "Select portfolio (optional)"
                      }
                      buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                      disabled={
                        loadingPortfolios || portfolioOptions.length === 0
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
                  <div className="grid grid-cols-3 gap-6">
                    {/* Smart Default */}
                    <div>
                      <label className="block text-[13px] font-semibold text-[#072929] mb-2">
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
                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
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

                {/* Tags Section - For SB campaigns */}
                {formData.type === "SB" && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                      Tags (Key-Value Pairs) - Max 50
                    </label>
                    {mode === "edit" && (
                      <p className="text-[10px] text-[#556179] mb-2 italic">
                        Read-only in edit mode
                      </p>
                    )}
                    <div className="space-y-2">
                      {Object.entries(formData.tags || {}).map(
                        ([key, value], index) => (
                          <div
                            key={index}
                            className="flex gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={key}
                              onChange={(e) => {
                                const newTags = { ...formData.tags };
                                const oldKey = key;
                                delete newTags[oldKey];
                                if (e.target.value) {
                                  newTags[e.target.value] = value;
                                }
                                handleChange("tags", newTags);
                              }}
                              placeholder="Key"
                              disabled={mode === "edit"}
                              className={`bg-[#FEFEFB] flex-1 px-3 py-2 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                mode === "edit"
                                  ? "bg-gray-50 cursor-not-allowed"
                                  : ""
                              }`}
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => {
                                const newTags = { ...formData.tags };
                                newTags[key] = e.target.value;
                                handleChange("tags", newTags);
                              }}
                              placeholder="Value"
                              disabled={mode === "edit"}
                              className={`bg-[#FEFEFB] flex-1 px-3 py-2 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                mode === "edit"
                                  ? "bg-gray-50 cursor-not-allowed"
                                  : ""
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = { ...formData.tags };
                                delete newTags[key];
                                handleChange("tags", newTags);
                              }}
                              disabled={mode === "edit"}
                              className={`px-3 py-2 text-red-500 hover:text-red-700 transition-colors ${
                                mode === "edit"
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        )
                      )}
                      {(!formData.tags ||
                        Object.keys(formData.tags).length < 50) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = { ...(formData.tags || {}) };
                            const newKey = `key${
                              Object.keys(newTags).length + 1
                            }`;
                            newTags[newKey] = "";
                            handleChange("tags", newTags);
                          }}
                          disabled={mode === "edit"}
                          className={`px-4 py-2 text-[#136D6D] border border-[#136D6D] rounded-lg hover:bg-[#f0f9f9] transition-colors text-[14px] ${
                            mode === "edit"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          + Add Tag
                        </button>
                      )}
                      {formData.tags &&
                        Object.keys(formData.tags).length >= 50 && (
                          <p className="text-[11px] text-[#556179]">
                            Maximum of 50 tags reached
                          </p>
                        )}
                    </div>
                  </div>
                )}

                {/* SB Dynamic Bidding Section */}
                {formData.type === "SB" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-semibold text-[#072929]">
                        Dynamic Bidding
                      </h3>
                      {mode === "edit" && (
                        <p className="text-[10px] text-[#556179] italic">
                          Read-only in edit mode
                        </p>
                      )}
                    </div>

                    {/* Bid Optimization Field */}
                    <div className="mb-6">
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                        Bid Optimization
                      </label>
                      <div className="flex items-center gap-3">
                        <label
                          className={`flex items-center gap-2 ${
                            mode === "edit"
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              formData.bidding?.bidOptimization ?? true
                            }
                            onChange={(e) => {
                              const newBidOptimization = e.target.checked;
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
                                        .bidAdjustmentsByPlacement || [],
                                  };
                                }
                                return updated;
                              });
                            }}
                            disabled={mode === "edit"}
                            className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 rounded"
                          />
                          <span className="text-[13.3px] font-medium text-[#072929]">
                            Automatic placement optimization
                          </span>
                        </label>
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

                            {/* Placement Inputs */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                              {/* Top of search */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Top of search
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 max-w-[120px]">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) =>
                                            adj.placement === "TOP_OF_SEARCH"
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
                                                  "TOP_OF_SEARCH"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement: "TOP_OF_SEARCH",
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
                                      disabled={mode === "edit"}
                                      className={`bg-[#FEFEFB] w-full px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                        mode === "edit"
                                          ? "bg-gray-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>

                              {/* Rest of search */}
                              <div>
                                <label className="block text-[13px] font-medium text-[#072929] mb-2">
                                  Rest of search
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 max-w-[120px]">
                                    <input
                                      type="number"
                                      value={
                                        formData.bidding?.bidAdjustmentsByPlacement?.find(
                                          (adj) => adj.placement === "OTHER"
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
                                                  adj.placement === "OTHER"
                                              );
                                            if (existingIndex >= 0) {
                                              adjustments[
                                                existingIndex
                                              ].percentage = value;
                                            } else {
                                              adjustments.push({
                                                percentage: value,
                                                placement: "OTHER",
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
                                      disabled={mode === "edit"}
                                      className={`bg-[#FEFEFB] w-full px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                        mode === "edit"
                                          ? "bg-gray-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[13px] text-[#072929]">
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Audiences Tab Content */}
                        {activeBiddingTab === "audiences" && (
                          <div className="space-y-4">
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
                                  disabled={mode === "edit"}
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
                                  disabled={mode === "edit"}
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
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
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
                                        buttonClassName="w-full bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        disabled={mode === "edit"}
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
                                          disabled={mode === "edit"}
                                          className={`bg-[#FEFEFB] w-24 px-3 py-2 border border-gray-200 rounded text-[14px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                            mode === "edit"
                                              ? "bg-gray-50 cursor-not-allowed"
                                              : ""
                                          }`}
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
                                    A A$0.80 cost-per-click can increase up to
                                    A$
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
            className="px-4 py-2 text-[#556179] bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
              ? "Save Changes"
              : "Create Campaign"}
          </button>
        </div>

        {/* Submit Error Display */}
        {submitError && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[13px] text-red-600">
                {(() => {
                  try {
                    const parsed = JSON.parse(submitError);
                    return parsed.message || submitError;
                  } catch (e) {
                    return submitError;
                  }
                })()}
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
