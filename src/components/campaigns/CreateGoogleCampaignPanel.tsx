import React, { useState, useEffect, useCallback } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";
import { accountsService } from "../../services/accounts";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";

interface RefreshMessage {
  type: "loading" | "success" | "error";
  message: string;
  details?: string;
}

interface CreateGoogleCampaignPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoogleCampaignData) => Promise<void>;
  accountId?: string;
  loading?: boolean;
  submitError?: string | null;
  mode?: "create" | "edit";
  initialData?: Partial<CreateGoogleCampaignData> | null;
  campaignId?: string | number;
  refreshMessage?: RefreshMessage | null;
}

export interface CreateGoogleCampaignData {
  campaign_type: "PERFORMANCE_MAX" | "SHOPPING" | "SEARCH" | "DEMAND_GEN" | "DISPLAY" | "VIDEO";
  customer_id?: string;
  name: string;
  budget_amount: number;
  budget_name?: string;
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  status?: "ENABLED" | "PAUSED";
  bidding_strategy_type?: string;
  target_cpa_micros?: number; // Target CPA in micros (e.g., 1000000 = $1.00)
  target_roas?: number; // Target ROAS (e.g., 3.0 = 300%)
  target_impression_share_location?: string; // TOP_OF_PAGE, ABSOLUTE_TOP_OF_PAGE, ANYWHERE_ON_PAGE
  target_impression_share_location_fraction_micros?: number; // Target impression share in micros (e.g., 800000 = 80%)
  target_impression_share_cpc_bid_ceiling_micros?: number; // Maximum CPC bid ceiling in micros (e.g., 1000000 = $1.00)
  // Performance Max fields
  final_url?: string;
  asset_group_name?: string;
  headlines?: string[];
  descriptions?: string[];
  business_name?: string;
  logo_url?: string;
  marketing_image_url?: string;
  square_marketing_image_url?: string;
  long_headline?: string;
  // URL options
  tracking_url_template?: string;
  final_url_suffix?: string;
  url_custom_parameters?: Array<{ key: string; value: string }>;
  // Shopping fields
  merchant_id?: string;
  sales_country?: string;
  campaign_priority?: number;
  enable_local?: boolean;
  location_ids?: string[];  // Array of location criterion IDs to target
  excluded_location_ids?: string[];  // Array of location criterion IDs to exclude
  language_ids?: string[];  // Array of language constant IDs to target
  device_ids?: string[];  // Array of device type IDs to target (MOBILE, DESKTOP, TABLET, CONNECTED_TV, OTHER)
  // Search fields
  adgroup_name?: string;
  keywords?: string[] | string; // Can be array or comma-separated string
  match_type?: "BROAD" | "PHRASE" | "EXACT";
  location_ids?: number[]; // Google Ads location IDs for geo-targeting
  language_codes?: string[]; // Language codes for language targeting
  conversion_action_ids?: string[]; // Conversion action IDs for selective optimization
  // Demand Gen fields
  video_url?: string;
  video_id?: string;
  ad_group_name?: string;
  ad_name?: string;
  ad_type?: string;
  channel_controls?: {
    gmail?: boolean;
    discover?: boolean;
    display?: boolean;
    youtube_in_feed?: boolean;
    youtube_in_stream?: boolean;
    youtube_shorts?: boolean;
  };
  // Display fields
  network_settings?: {
    target_content_network?: boolean;
    target_google_search?: boolean;
    target_search_network?: boolean;
    target_partner_search_network?: boolean;
  };
}

const CAMPAIGN_TYPES = [
  { value: "PERFORMANCE_MAX", label: "Performance Max" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "SEARCH", label: "Search" },
  // { value: "DEMAND_GEN", label: "Demand Gen" },
  // { value: "DISPLAY", label: "Display" },
  // { value: "VIDEO", label: "Video (Read-Only)", disabled: true },
];

const STATUS_OPTIONS = [
  { value: "ENABLED", label: "Enabled" },
  { value: "PAUSED", label: "Paused" },
];

const CAMPAIGN_PRIORITY_OPTIONS = [
  { value: 0, label: "Low (0)" },
  { value: 1, label: "Medium (1)" },
  { value: 2, label: "High (2)" },
];

const SALES_COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PL", label: "Poland" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
];

const BIDDING_STRATEGY_OPTIONS = [
  { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
  { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
  { value: "TARGET_CPA", label: "Target CPA" },
  { value: "TARGET_ROAS", label: "Target ROAS" },
  { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
  { value: "TARGET_SPEND", label: "Target Spend" },
  { value: "MANUAL_CPC", label: "Manual CPC" },
];

const LOCATION_OPTIONS = [
  { id: 2840, name: "United States", code: "US" },
  { id: 2124, name: "Canada", code: "CA" },
  { id: 2826, name: "United Kingdom", code: "UK" },
  { id: 2392, name: "Japan", code: "JP" },
  { id: 2036, name: "India", code: "IN" },
  { id: 2276, name: "Brazil", code: "BR" },
  { id: 2250, name: "Argentina", code: "AR" },
  { id: 2380, name: "Italy", code: "IT" },
  { id: 2191, name: "France", code: "FR" },
  { id: 2287, name: "Germany", code: "DE" },
  { id: 2414, name: "South Korea", code: "KR" },
  { id: 2156, name: "China", code: "CN" },
  { id: 2344, name: "Mexico", code: "MX" },
  { id: 2234, name: "Australia", code: "AU" },
  { id: 2376, name: "Spain", code: "ES" },
];

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", languageConstantId: "1000" },
  { code: "es", name: "Spanish", languageConstantId: "1003" },
  { code: "fr", name: "French", languageConstantId: "1002" },
  { code: "de", name: "German", languageConstantId: "1001" },
  { code: "ja", name: "Japanese", languageConstantId: "1041" },
  { code: "zh", name: "Chinese (Simplified)", languageConstantId: "1017" },
  { code: "it", name: "Italian", languageConstantId: "1004" },
  { code: "pt", name: "Portuguese", languageConstantId: "1005" },
  { code: "ru", name: "Russian", languageConstantId: "1006" },
  { code: "ko", name: "Korean", languageConstantId: "1040" },
];

const MATCH_TYPE_OPTIONS = [
  { value: "BROAD", label: "Broad Match" },
  { value: "PHRASE", label: "Phrase Match" },
  { value: "EXACT", label: "Exact Match" },
];

export const CreateGoogleCampaignPanel: React.FC<CreateGoogleCampaignPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
  loading = false,
  submitError = null,
  mode = "create",
  initialData = null,
  refreshMessage = null,
}) => {
  const [showRefreshDetails, setShowRefreshDetails] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [marketingImagePreview, setMarketingImagePreview] = useState<string | null>(null);
  const [squareMarketingImagePreview, setSquareMarketingImagePreview] = useState<string | null>(null);
  const [merchantAccountOptions, setMerchantAccountOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingMerchantAccounts, setLoadingMerchantAccounts] = useState(false);
  const [merchantAccountsError, setMerchantAccountsError] = useState<string | null>(null);
  
  // Location targeting state
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string; id: string; type: string; countryCode: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Language targeting state
  const [languageOptions, setLanguageOptions] = useState<Array<{ value: string; label: string; id: string }>>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  
  // Profile selection state
  const [googleProfiles, setGoogleProfiles] = useState<Array<{ value: string; label: string; customer_id: string; customer_id_raw: string }>>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  
  // Budget selection state
  const [budgetOptions, setBudgetOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [useCustomBudgetName, setUseCustomBudgetName] = useState(false);
  const [formData, setFormData] = useState<CreateGoogleCampaignData>({
    campaign_type: "PERFORMANCE_MAX",
    name: "",
    budget_amount: 0,
    budget_name: "",
    status: "PAUSED",
    bidding_strategy_type: "MAXIMIZE_CONVERSIONS", // Default for Performance Max
    // Performance Max defaults
    final_url: "",
    headlines: [""],
    descriptions: [""],
    // URL options
    tracking_url_template: "",
    final_url_suffix: "",
    url_custom_parameters: [],
    // Shopping defaults
    sales_country: "US",
    campaign_priority: 0,
    enable_local: false,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateGoogleCampaignData, string>>
  >({});

  // Parse field errors from submitError
  useEffect(() => {
    if (submitError) {
      try {
        const parsed = JSON.parse(submitError);
        if (parsed.fieldErrors && typeof parsed.fieldErrors === "object") {
          setErrors(parsed.fieldErrors);
        }
      } catch {
        setErrors({});
      }
    } else {
      setErrors({});
    }
  }, [submitError]);

  // Fetch Google profiles when panel opens
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!isOpen || !accountId) {
        return;
      }

      setLoadingProfiles(true);
      setProfilesError(null);

      try {
        const accountIdNum = parseInt(accountId, 10);
        // Get channels for the account
        const channels = await accountsService.getAccountChannels(accountIdNum);
        const googleChannel = channels.find(ch => ch.channel_type === "google");
        
        if (!googleChannel) {
          setProfilesError("No Google channel found for this account");
          setLoadingProfiles(false);
          return;
        }

        // Get profiles for the Google channel - backend filters to only selected profiles
        const profilesData = await accountsService.getGoogleProfiles(googleChannel.id, true);
        const allProfiles = profilesData.profiles || [];
        
        const profiles = allProfiles.map((profile: any) => {
          const customerIdRaw = profile.customer_id_raw || profile.customer_id?.replace(/-/g, '') || '';
          const customerIdFormatted = profile.customer_id || customerIdRaw;
          const profileName = profile.name || customerIdFormatted;
          
          return {
            value: customerIdRaw,
            label: `${profileName} (${customerIdFormatted})${profile.is_manager ? ' - Manager' : ''}`,
            customer_id: customerIdFormatted,
            customer_id_raw: customerIdRaw,
          };
        }).filter((p: any) => p.value);

        setGoogleProfiles(profiles);

        // Auto-select first profile if available and none selected
        // If only one profile, always auto-select it
        if (profiles.length > 0 && !selectedProfileId) {
          const profileToSelect = profiles[0];
          setSelectedProfileId(profileToSelect.value);
          // Set customer_id in formData
          setFormData((prev) => ({
            ...prev,
            customer_id: profileToSelect.customer_id,
          }));
        }
        
        // If only one profile, ensure it's selected
        if (profiles.length === 1 && selectedProfileId !== profiles[0].value) {
          const profileToSelect = profiles[0];
          setSelectedProfileId(profileToSelect.value);
          setFormData((prev) => ({
            ...prev,
            customer_id: profileToSelect.customer_id,
          }));
        }
      } catch (error: any) {
        console.error("Error fetching Google profiles:", error);
        const errorMessage = error?.response?.data?.error || error?.message || "Failed to fetch Google profiles";
        setProfilesError(errorMessage);
        setGoogleProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [isOpen, accountId]);

  // Function to fetch budgets
  const fetchBudgets = useCallback(async () => {
    if (!accountId) {
      setBudgetOptions([]);
      return;
    }

    setLoadingBudgets(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const budgets = await googleAdwordsCampaignsService.getGoogleBudgets(accountIdNum);
      
      // Format budgets for dropdown
      const options = budgets.map((budget) => ({
        value: budget.name,
        label: `${budget.name} ($${budget.amount_dollars?.toFixed(2) || '0.00'})`,
      }));
      
      // Add "Custom" option at the beginning
      setBudgetOptions([
        { value: "__CUSTOM__", label: "Custom..." },
        ...options,
      ]);
    } catch (error: any) {
      console.error("Error fetching budgets:", error);
      // On error, still show custom option
      setBudgetOptions([{ value: "__CUSTOM__", label: "Custom..." }]);
    } finally {
      setLoadingBudgets(false);
    }
  }, [accountId]);

  // Fetch budgets when account is available
  useEffect(() => {
    if (isOpen && accountId) {
      fetchBudgets();
    }
  }, [isOpen, accountId, fetchBudgets]);

  // Function to fetch merchant accounts (can be called manually or automatically)
  const fetchMerchantAccounts = useCallback(async () => {
    if (
      !accountId ||
      formData.campaign_type !== "SHOPPING" ||
      !selectedProfileId
    ) {
      setMerchantAccountOptions([]);
      setMerchantAccountsError(null);
      return;
    }

    setLoadingMerchantAccounts(true);
    setMerchantAccountsError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      // Use selected profile's customer_id to fetch merchant accounts
      const accounts = await campaignsService.getGoogleMerchantAccounts(accountIdNum, selectedProfileId);
      setMerchantAccountOptions(accounts);
      
      if (accounts.length === 0) {
        setMerchantAccountsError("No Merchant Center accounts found. Please link a Merchant Center account to your Google Ads account.");
      } else {
        setMerchantAccountsError(null);
        // Auto-select first merchant account if none selected
        setFormData((prev) => {
          if (!prev.merchant_id && accounts.length > 0) {
            return {
              ...prev,
              merchant_id: accounts[0].value,
            };
          }
          return prev;
        });
      }
    } catch (error: any) {
      console.error("Error fetching merchant accounts:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to fetch Merchant Center accounts";
      setMerchantAccountsError(errorMessage);
      setMerchantAccountOptions([]);
    } finally {
      setLoadingMerchantAccounts(false);
    }
  }, [accountId, formData.campaign_type, selectedProfileId]);

  // Fetch merchant accounts when Shopping campaign type is selected and profile is selected
  useEffect(() => {
    if (
      !isOpen ||
      formData.campaign_type !== "SHOPPING" ||
      !accountId ||
      !selectedProfileId
    ) {
      // Reset when not needed
      if (formData.campaign_type !== "SHOPPING") {
        setMerchantAccountOptions([]);
        setMerchantAccountsError(null);
      }
      return;
    }

    fetchMerchantAccounts();
  }, [isOpen, formData.campaign_type, accountId, selectedProfileId, fetchMerchantAccounts]);

  // Update customer_id when profile changes
  useEffect(() => {
    if (selectedProfileId) {
      const selectedProfile = googleProfiles.find(p => p.value === selectedProfileId);
      if (selectedProfile) {
        setFormData((prev) => ({
          ...prev,
          customer_id: selectedProfile.customer_id,
        }));
        // Reset merchant accounts when profile changes
        setMerchantAccountOptions([]);
        setMerchantAccountsError(null);
        // Re-fetch merchant accounts if Shopping campaign type is selected
        if (formData.campaign_type === "SHOPPING") {
          fetchMerchantAccounts();
        }
      }
    }
  }, [selectedProfileId, googleProfiles, formData.campaign_type, fetchMerchantAccounts]);

  // Function to fetch location targets (loads initial set, Dropdown handles filtering)
  const fetchLocations = useCallback(async () => {
    if (
      !accountId ||
      (formData.campaign_type !== "SHOPPING" &&
        formData.campaign_type !== "SEARCH" &&
        formData.campaign_type !== "PERFORMANCE_MAX") ||
      !selectedProfileId
    ) {
      setLocationOptions([]);
      setLanguageOptions([]);
      return;
    }

    setLoadingLocations(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      // For SEARCH campaigns, use undefined country code (or could use a default like "US")
      // For SHOPPING campaigns, use sales_country
      const countryCode = formData.campaign_type === "SHOPPING" ? (formData.sales_country || undefined) : undefined;
      // Load up to 200 locations initially - Dropdown will filter them client-side
      const locations = await campaignsService.getGoogleGeoTargetConstants(
        accountIdNum,
        undefined, // No search query - load common locations
        countryCode,
        selectedProfileId
      );
      
      const formattedLocations = locations.map((loc) => ({
        value: loc.id,
        label: `${loc.name} (${loc.type})`,
        id: loc.id,
        type: loc.type,
        countryCode: loc.countryCode || "",
      }));
      
      setLocationOptions(formattedLocations);
    } catch (error: any) {
      console.error("Error fetching location targets:", error);
      setLocationOptions([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [accountId, formData.campaign_type, formData.sales_country, selectedProfileId]);

  // Fetch locations when Shopping / Search / Performance Max campaign is selected
  useEffect(() => {
    if (
      isOpen &&
      (formData.campaign_type === "SHOPPING" ||
        formData.campaign_type === "SEARCH" ||
        formData.campaign_type === "PERFORMANCE_MAX") &&
      accountId &&
      selectedProfileId
    ) {
      fetchLocations();
    } else {
      setLocationOptions([]);
      setLanguageOptions([]);
    }
  }, [isOpen, formData.campaign_type, accountId, selectedProfileId, fetchLocations]);

  // Function to fetch language constants
  const fetchLanguages = useCallback(async () => {
    // Languages are selectable for SEARCH and PERFORMANCE_MAX campaigns
    if (
      !accountId ||
      (formData.campaign_type !== "SEARCH" && formData.campaign_type !== "PERFORMANCE_MAX") ||
      !selectedProfileId
    ) {
      setLanguageOptions([]);
      return;
    }

    setLoadingLanguages(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      const languages = await campaignsService.getGoogleLanguageConstants(
        accountIdNum,
        selectedProfileId
      );
      
      const formattedLanguages = languages.map((lang) => ({
        value: lang.id,
        label: lang.name,
        id: lang.id,
      }));
      
      setLanguageOptions(formattedLanguages);
    } catch (error: any) {
      console.error("Error fetching language constants:", error);
      setLanguageOptions([]);
    } finally {
      setLoadingLanguages(false);
    }
  }, [accountId, formData.campaign_type, selectedProfileId]);

  // Fetch languages when SEARCH / PERFORMANCE_MAX campaign is selected
  useEffect(() => {
    if (
      isOpen &&
      (formData.campaign_type === "SEARCH" || formData.campaign_type === "PERFORMANCE_MAX") &&
      accountId &&
      selectedProfileId
    ) {
      fetchLanguages();
    } else {
      setLanguageOptions([]);
    }
  }, [isOpen, formData.campaign_type, accountId, selectedProfileId, fetchLanguages]);

  // Reset form when panel closes or load initial data when in edit mode
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else if (mode === "edit" && initialData) {
      // Load initial data for edit mode
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
      // Set logo preview if logo_url exists in initial data
      if (initialData.logo_url && typeof initialData.logo_url === "string") {
        const urlValue = initialData.logo_url.trim();
        if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
          setLogoPreview(urlValue);
        } else {
          setLogoPreview(null);
        }
      } else {
        setLogoPreview(null);
      }
      // Set marketing image preview if marketing_image_url exists in initial data
      if (initialData.marketing_image_url && typeof initialData.marketing_image_url === "string") {
        const urlValue = initialData.marketing_image_url.trim();
        if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
          setMarketingImagePreview(urlValue);
        } else {
          setMarketingImagePreview(null);
        }
      } else {
        setMarketingImagePreview(null);
      }
      // Set square marketing image preview if square_marketing_image_url exists in initial data
      if (initialData.square_marketing_image_url && typeof initialData.square_marketing_image_url === "string") {
        const urlValue = initialData.square_marketing_image_url.trim();
        if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
          setSquareMarketingImagePreview(urlValue);
        } else {
          setSquareMarketingImagePreview(null);
        }
      } else {
        setSquareMarketingImagePreview(null);
      }
    }
  }, [isOpen, mode, initialData]);

  const resetForm = () => {
    setFormData({
      campaign_type: "PERFORMANCE_MAX",
      name: "",
      budget_amount: 0,
      budget_name: "",
      status: "PAUSED",
      bidding_strategy_type: "MAXIMIZE_CONVERSIONS", // Default for Performance Max
      final_url: "",
      headlines: [""],
      descriptions: [""],
      tracking_url_template: "",
      final_url_suffix: "",
      url_custom_parameters: [],
      sales_country: "US",
      campaign_priority: 0,
      enable_local: true,
      video_url: "",
      video_id: "",
      channel_controls: {
        gmail: true,
        discover: true,
        display: true,
        youtube_in_feed: true,
        youtube_in_stream: true,
        youtube_shorts: true,
      },
      network_settings: {
        target_content_network: true,
        target_google_search: false,
        target_search_network: false,
        target_partner_search_network: false,
      },
    });
    setErrors({});
    setLogoPreview(null);
    setMarketingImagePreview(null);
    setSquareMarketingImagePreview(null);
    setSelectedProfileId("");
    setMerchantAccountOptions([]);
    setMerchantAccountsError(null);
    setLocationOptions([]);
    setLanguageOptions([]);
    setFormData((prev) => ({
      ...prev,
      location_ids: undefined,
      excluded_location_ids: undefined,
      language_ids: undefined,
      device_ids: undefined,
      network_settings: undefined,
      tracking_url_template: "",
      final_url_suffix: "",
      url_custom_parameters: [],
    }));
  };
  // Get available bidding strategies based on campaign type
  // Note: TARGET_CPA and TARGET_ROAS are not allowed during creation for SEARCH campaigns
  // per Google Ads API restrictions. They can only be set after campaign creation.
  // Reference: https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns
  const getAvailableBiddingStrategies = (campaignType: string) => {
    if (campaignType === "PERFORMANCE_MAX") {
      // Performance Max campaigns only support: MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE
      return BIDDING_STRATEGY_OPTIONS.filter(
        (opt) =>
          opt.value === "MAXIMIZE_CONVERSIONS" ||
          opt.value === "MAXIMIZE_CONVERSION_VALUE"
      );
    } else if (campaignType === "SHOPPING") {
      // Shopping campaigns: keep creation UI conservative to avoid API rejections.
      // We only allow MANUAL_CPC here (matches our inline edit restrictions and avoids conversion-value strategy errors).
      return BIDDING_STRATEGY_OPTIONS.filter(
        (opt) => opt.value === "MANUAL_CPC"
      );
    } else if (campaignType === "DEMAND_GEN") {
      // Demand Gen campaigns support: MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE, TARGET_CPA, TARGET_ROAS
      return BIDDING_STRATEGY_OPTIONS.filter(
        (opt) =>
          opt.value === "MAXIMIZE_CONVERSIONS" ||
          opt.value === "MAXIMIZE_CONVERSION_VALUE" ||
          opt.value === "TARGET_CPA" ||
          opt.value === "TARGET_ROAS"
      );
    } else if (campaignType === "DISPLAY") {
      // Display campaigns support all bidding strategies
      return BIDDING_STRATEGY_OPTIONS;
    } else {
      // SEARCH - TARGET_CPA and TARGET_ROAS are not supported
      // They require conversion tracking setup and historical conversion data
      return BIDDING_STRATEGY_OPTIONS.filter(
        (opt) =>
          opt.value === "MANUAL_CPC" ||
          opt.value === "MAXIMIZE_CONVERSIONS" ||
          opt.value === "MAXIMIZE_CONVERSION_VALUE" ||
          opt.value === "TARGET_IMPRESSION_SHARE" ||
          opt.value === "TARGET_SPEND"
      );
    }
  };

  // Get default bidding strategy for campaign type
  const getDefaultBiddingStrategy = (campaignType: string): string => {
    if (campaignType === "PERFORMANCE_MAX") {
      return "MAXIMIZE_CONVERSIONS";
    } else if (campaignType === "SHOPPING") {
      return "MANUAL_CPC";
    } else if (campaignType === "DEMAND_GEN") {
      return "MAXIMIZE_CONVERSIONS";
    } else if (campaignType === "DISPLAY") {
      return "MANUAL_CPC";
    } else {
      // SEARCH
      return "MANUAL_CPC";
    }
  };

  const handleChange = (
    field: keyof CreateGoogleCampaignData,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // When campaign type changes, update default bidding strategy
      if (field === "campaign_type") {
        // Prevent switching to VIDEO (read-only)
        if (value === "VIDEO") {
          setErrors({
            campaign_type: "VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.",
          });
          return prev; // Don't update if trying to select VIDEO
        }
        
        const defaultStrategy = getDefaultBiddingStrategy(value);
        // Only set default if bidding_strategy_type is not already set or if current value is not valid for new type
        const availableStrategies = getAvailableBiddingStrategies(value);
        const currentStrategyValid = availableStrategies.some(
          (opt) => opt.value === prev.bidding_strategy_type
        );
        if (!prev.bidding_strategy_type || !currentStrategyValid) {
          updated.bidding_strategy_type = defaultStrategy;
        }
        
        // Initialize headlines/descriptions for Performance Max and Demand Gen
        if (value === "PERFORMANCE_MAX" || value === "DEMAND_GEN") {
          if (!updated.headlines || updated.headlines.length < 3) {
            updated.headlines = Array(3).fill("");
          }
          if (!updated.descriptions || updated.descriptions.length < 2) {
            updated.descriptions = Array(2).fill("");
          }
        }
        
        // Initialize channel controls for Demand Gen
        if (value === "DEMAND_GEN" && !updated.channel_controls) {
          updated.channel_controls = {
            gmail: true,
            discover: true,
            display: true,
            youtube_in_feed: true,
            youtube_in_stream: true,
            youtube_shorts: true,
          };
        }
        
        // Initialize network settings for Display
        if (value === "DISPLAY" && !updated.network_settings) {
          updated.network_settings = {
            target_content_network: true,
            target_google_search: false,
            target_search_network: false,
            target_partner_search_network: false,
          };
        }
        
        // Initialize network settings for Search (Google Search and Search Network enabled by default)
        if (value === "SEARCH" && !updated.network_settings) {
          updated.network_settings = {
            target_google_search: true,
            target_search_network: true,
            target_content_network: false,
            target_partner_search_network: false,
          };
        }
      }
      
      // When bidding strategy changes, clear strategy-specific fields if not needed
      // and set defaults for strategies that need them
      if (field === "bidding_strategy_type") {
        if (value !== "TARGET_CPA") {
          updated.target_cpa_micros = undefined;
        }
        if (value !== "TARGET_ROAS") {
          updated.target_roas = undefined;
        }
        if (value === "TARGET_IMPRESSION_SHARE") {
          // Set default location if not already set
          if (!updated.target_impression_share_location) {
            updated.target_impression_share_location = "TOP_OF_PAGE";
          }
        } else {
          updated.target_impression_share_location = undefined;
          updated.target_impression_share_location_fraction_micros = undefined;
          updated.target_impression_share_cpc_bid_ceiling_micros = undefined;
        }
      }
      
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    
    // Update logo preview when logo_url changes (for Performance Max and Demand Gen)
    if (field === "logo_url" && (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN")) {
      const urlValue = typeof value === "string" ? value.trim() : "";
      // More lenient URL validation - accept any string that starts with http:// or https://
      if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
        setLogoPreview(urlValue);
      } else {
        setLogoPreview(null);
      }
    }
    
    // Update marketing image preview when marketing_image_url changes
    if (field === "marketing_image_url") {
      const urlValue = typeof value === "string" ? value.trim() : "";
      // More lenient URL validation - accept any string that starts with http:// or https://
      if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
        setMarketingImagePreview(urlValue);
      } else {
        setMarketingImagePreview(null);
      }
    }
    
    // Update square marketing image preview when square_marketing_image_url changes
    if (field === "square_marketing_image_url") {
      const urlValue = typeof value === "string" ? value.trim() : "";
      // More lenient URL validation - accept any string that starts with http:// or https://
      if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
        setSquareMarketingImagePreview(urlValue);
      } else {
        setSquareMarketingImagePreview(null);
      }
    }
  };

  const addHeadline = () => {
    // Ensure minimum headlines for Performance Max and Demand Gen
    if (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN") {
      if (!formData.headlines || formData.headlines.length < 3) {
        // Initialize with 3 empty headlines if less than 3
        const currentHeadlines = formData.headlines || [];
        const needed = 3 - currentHeadlines.length;
        setFormData((prev) => ({
          ...prev,
          headlines: [...currentHeadlines, ...Array(needed).fill("")],
        }));
        return;
      }
    }
    if (formData.headlines && formData.headlines.length < 15) {
      setFormData((prev) => ({
        ...prev,
        headlines: [...(prev.headlines || []), ""],
      }));
    }
  };

  const removeHeadline = (index: number) => {
    // For Performance Max and Demand Gen, minimum is 3 headlines
    const minHeadlines = (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN") ? 3 : 1;
    if (formData.headlines && formData.headlines.length > minHeadlines) {
      const newHeadlines = formData.headlines.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, headlines: newHeadlines }));
    }
  };

  const updateHeadline = (index: number, value: string) => {
    if (formData.headlines) {
      const newHeadlines = [...formData.headlines];
      newHeadlines[index] = value;
      setFormData((prev) => ({ ...prev, headlines: newHeadlines }));
    }
  };

  const addDescription = () => {
    // Ensure minimum descriptions for Performance Max and Demand Gen
    if (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN") {
      if (!formData.descriptions || formData.descriptions.length < 2) {
        // Initialize with 2 empty descriptions if less than 2
        const currentDescriptions = formData.descriptions || [];
        const needed = 2 - currentDescriptions.length;
        setFormData((prev) => ({
          ...prev,
          descriptions: [...currentDescriptions, ...Array(needed).fill("")],
        }));
        return;
      }
    }
    if (formData.descriptions && formData.descriptions.length < 4) {
      setFormData((prev) => ({
        ...prev,
        descriptions: [...(prev.descriptions || []), ""],
      }));
    }
  };

  const removeDescription = (index: number) => {
    // For Performance Max and Demand Gen, minimum is 2 descriptions
    const minDescriptions = (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN") ? 2 : 1;
    if (formData.descriptions && formData.descriptions.length > minDescriptions) {
      const newDescriptions = formData.descriptions.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, descriptions: newDescriptions }));
    }
  };

  const updateDescription = (index: number, value: string) => {
    if (formData.descriptions) {
      const newDescriptions = [...formData.descriptions];
      newDescriptions[index] = value;
      setFormData((prev) => ({ ...prev, descriptions: newDescriptions }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateGoogleCampaignData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Campaign name is required";
    }

    if (!formData.budget_amount || formData.budget_amount <= 0) {
      newErrors.budget_amount = "Budget must be greater than 0";
    }

    if (formData.campaign_type === "PERFORMANCE_MAX") {
      if (!selectedProfileId) {
        newErrors.customer_id = "Please select a Google Ads account first";
      }

      if (!formData.location_ids || formData.location_ids.length === 0) {
        newErrors.location_ids = "At least one target location is required";
      }

      if (!formData.language_ids || formData.language_ids.length === 0) {
        newErrors.language_ids = "At least one target language is required";
      }

      if (!formData.final_url?.trim()) {
        newErrors.final_url = "Final URL is required";
      } else if (!/^https?:\/\/.+/.test(formData.final_url)) {
        newErrors.final_url = "Final URL must be a valid URL (http:// or https://)";
      }

      if (!formData.business_name?.trim()) {
        newErrors.business_name = "Business name is required";
      }

      if (!formData.logo_url?.trim() || formData.logo_url === 'https://example.com') {
        newErrors.logo_url = "Logo URL is required. Please provide a logo URL or upload a logo.";
      } else if (!/^https?:\/\/.+/.test(formData.logo_url)) {
        newErrors.logo_url = "Logo URL must be a valid URL (http:// or https://)";
      }

      const validHeadlines = (formData.headlines || []).filter((h) => h.trim());
      if (validHeadlines.length < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      } else if (validHeadlines.length > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      const validDescriptions = (formData.descriptions || []).filter((d) => d.trim());
      if (validDescriptions.length < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      } else if (validDescriptions.length > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }
    } else if (formData.campaign_type === "SHOPPING") {
      if (!selectedProfileId) {
        newErrors.customer_id = "Please select a Google Ads account first";
      }
      if (!formData.merchant_id?.trim()) {
        newErrors.merchant_id = "Merchant ID is required";
      }
    } else if (formData.campaign_type === "SEARCH") {
      // Search campaign validation
      if (!formData.location_ids || formData.location_ids.length === 0) {
        newErrors.location_ids = "At least one target location is required";
      }
      if (!formData.language_codes || formData.language_codes.length === 0) {
        newErrors.language_codes = "At least one target language is required";
      }
    } else if (formData.campaign_type === "VIDEO") {
      // VIDEO campaigns cannot be created via API
      newErrors.campaign_type = "VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.";
    } else if (formData.campaign_type === "DEMAND_GEN") {
      // Demand Gen validation
      if (!formData.final_url?.trim()) {
        newErrors.final_url = "Final URL is required";
      } else if (!/^https?:\/\/.+/.test(formData.final_url)) {
        newErrors.final_url = "Final URL must be a valid URL (http:// or https://)";
      } else if (formData.final_url === "https://example.com") {
        newErrors.final_url = "Final URL cannot be https://example.com";
      }

      if (!formData.logo_url?.trim() || formData.logo_url === 'https://example.com') {
        newErrors.logo_url = "Logo URL is required. Please provide a valid logo URL.";
      } else if (!/^https?:\/\/.+/.test(formData.logo_url)) {
        newErrors.logo_url = "Logo URL must be a valid URL (http:// or https://)";
      }

      // Video validation: either video_url or video_id is required
      if (!formData.video_url?.trim() && !formData.video_id?.trim()) {
        newErrors.video_url = "Either video URL or video ID is required";
        newErrors.video_id = "Either video URL or video ID is required";
      } else if (formData.video_url?.trim() && !/^https?:\/\/.+/.test(formData.video_url)) {
        newErrors.video_url = "Video URL must be a valid URL (http:// or https://)";
      } else if (formData.video_id?.trim() && !/^[a-zA-Z0-9_-]{11}$/.test(formData.video_id)) {
        newErrors.video_id = "Video ID must be a valid YouTube video ID (11 characters)";
      }

      if (!formData.business_name?.trim()) {
        newErrors.business_name = "Business name is required";
      }

      const validHeadlines = (formData.headlines || []).filter((h) => h.trim());
      if (validHeadlines.length < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      } else if (validHeadlines.length > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      const validDescriptions = (formData.descriptions || []).filter((d) => d.trim());
      if (validDescriptions.length < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      } else if (validDescriptions.length > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }
    }

    // Validate bidding strategy specific fields
    if (formData.bidding_strategy_type === "TARGET_CPA") {
      if (!formData.target_cpa_micros || formData.target_cpa_micros <= 0) {
        newErrors.target_cpa_micros = "Target CPA is required and must be greater than 0";
      }
    }

    if (formData.bidding_strategy_type === "TARGET_ROAS") {
      if (!formData.target_roas || formData.target_roas <= 0) {
        newErrors.target_roas = "Target ROAS is required and must be greater than 0";
      }
    }

    if (formData.bidding_strategy_type === "TARGET_IMPRESSION_SHARE") {
      if (!formData.target_impression_share_location) {
        newErrors.target_impression_share_location = "Location is required";
      }
      if (!formData.target_impression_share_location_fraction_micros || formData.target_impression_share_location_fraction_micros <= 0) {
        newErrors.target_impression_share_location_fraction_micros = "Target impression share is required and must be greater than 0";
      }
      if (!formData.target_impression_share_cpc_bid_ceiling_micros || formData.target_impression_share_cpc_bid_ceiling_micros <= 0) {
        newErrors.target_impression_share_cpc_bid_ceiling_micros = "Maximum CPC bid ceiling is required and must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission of VIDEO campaigns
    if (formData.campaign_type === "VIDEO") {
      setErrors({
        campaign_type: "VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.",
      });
      return;
    }

    if (!validate()) {
      return;
    }

    // Filter out empty headlines and descriptions
    const payload: CreateGoogleCampaignData = {
      ...formData,
      headlines: (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN")
        ? (formData.headlines || []).filter((h) => h.trim())
        : undefined,
      descriptions: (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN")
        ? (formData.descriptions || []).filter((d) => d.trim())
        : undefined,
      // URL options - omit empty values
      tracking_url_template: formData.tracking_url_template?.trim()
        ? formData.tracking_url_template.trim()
        : undefined,
      final_url_suffix: formData.final_url_suffix?.trim()
        ? formData.final_url_suffix.trim()
        : undefined,
      url_custom_parameters:
        formData.url_custom_parameters && formData.url_custom_parameters.length > 0
          ? formData.url_custom_parameters.filter(
              (param) =>
                param &&
                typeof param.key === "string" &&
                typeof param.value === "string" &&
                param.key.trim() &&
                param.value.trim()
            )
          : undefined,
      // Remove fields for non-SEARCH campaigns
      adgroup_name: formData.campaign_type === "DISPLAY" ? formData.adgroup_name : formData.campaign_type === "SEARCH" ? formData.adgroup_name : undefined,
      keywords: formData.campaign_type === "SEARCH" ? formData.keywords : undefined,
      match_type: formData.campaign_type === "SEARCH" ? formData.match_type : undefined,
      location_ids: formData.campaign_type === "SEARCH" ? formData.location_ids : undefined,
      language_codes: formData.campaign_type === "SEARCH" ? formData.language_codes : undefined,
      conversion_action_ids: formData.campaign_type === "SEARCH" && formData.conversion_action_ids?.length ? formData.conversion_action_ids : undefined,
      // For Demand Gen, ensure only one of video_url or video_id is sent
      video_url: formData.campaign_type === "DEMAND_GEN" && formData.video_url?.trim() ? formData.video_url : undefined,
      video_id: formData.campaign_type === "DEMAND_GEN" && formData.video_id?.trim() ? formData.video_id : undefined,
    };

    try {
      await onSubmit(payload);
      resetForm();
      setErrors({});
    } catch {
      // Error handling is done in parent component
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date as "DD MMM YYYY" (e.g., "24 Dec 2025")
  const formatDateForName = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Quick fill functions for testing
  const quickFillPerformanceMax = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    setFormData({
      campaign_type: "PERFORMANCE_MAX",
      name: `PMAX Campaign Stellar FE - ${dateStr} - 1`,
      budget_amount: 10,
      budget_name: "Test PMax Budget",
      status: "PAUSED",
      bidding_strategy_type: "MAXIMIZE_CONVERSIONS",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      final_url: "https://techesthete.com",
      business_name: "Techesthete",
      logo_url: "https://placehold.co/128x128", // 128x128 PNG placeholder logo
      headlines: [
        "Great Software Solutions",
        "AI-Powered Development",
        "Expert Software Services",
        "Innovative Technology",
        "Professional Development Team"
      ],
      descriptions: [
        "We provide cutting-edge software solutions for your business needs",
        "Transform your business with our AI-powered development services"
      ],
      marketing_image_url: "",
      square_marketing_image_url: "",
      long_headline: "",
      asset_group_name: "",
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
    });
    setErrors({});
  };

  const quickFillShopping = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    setFormData({
      campaign_type: "SHOPPING",
      name: `Shopping Campaign Stellar FE - ${dateStr} - 1`,
      budget_amount: 10,
      budget_name: "Test Shopping Budget",
      status: "PAUSED",
      bidding_strategy_type: "MANUAL_CPC",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      merchant_id: "109055893",
      sales_country: "US",
      campaign_priority: 0, // Low priority by default
      enable_local: false,
      final_url: "",
      business_name: "",
      logo_url: "",
      headlines: [],
      descriptions: [],
    });
    setErrors({});
  };

  const quickFillSearch = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    setFormData({
      campaign_type: "SEARCH",
      name: `Search Campaign Stellar FE - ${dateStr} - 1`,
      budget_amount: 10,
      budget_name: "Test Search Budget",
      status: "PAUSED",
      bidding_strategy_type: "MANUAL_CPC",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      final_url: "",
      business_name: "",
      logo_url: "",
      headlines: [],
      descriptions: [],
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
      location_ids: [2840], // United States
      language_codes: ["en"], // English
      conversion_action_ids: [],
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
      <form onSubmit={handleSubmit}>
      <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-[#072929]">
          {mode === "edit" ? "Edit Google Campaign" : "Create Google Campaign"}
        </h2>
      </div>
      
          {/* Refresh Message */}
          {refreshMessage && mode === "edit" && (
            <div
              className={`mb-4 p-3 rounded-lg border cursor-pointer transition-all ${
                refreshMessage.type === "loading"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : refreshMessage.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
              }`}
              onClick={() => setShowRefreshDetails(!showRefreshDetails)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {refreshMessage.type === "loading" && (
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {refreshMessage.type === "success" && (
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {refreshMessage.type === "error" && (
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className="text-[12px] font-medium">
                    {refreshMessage.message}
                  </span>
                </div>
                {refreshMessage.details && (
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      showRefreshDetails ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
              {showRefreshDetails && refreshMessage.details && (
                <div className="mt-2 text-[11px] opacity-80">
                  {refreshMessage.details}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Google Ads Account (Profile) - Only show if more than one account */}
            {googleProfiles.length > 1 && (
              <div>
                <label className="form-label">
                  Google Ads Account *
                </label>
                <Dropdown<string>
                  options={googleProfiles}
                  value={selectedProfileId}
                  onChange={(value) => {
                    setSelectedProfileId(value);
                    if (profilesError) {
                      setProfilesError(null);
                    }
                  }}
                  placeholder={
                    loadingProfiles
                      ? "Loading accounts..."
                      : googleProfiles.length === 0
                      ? "No Google Ads accounts available"
                      : "Select Google Ads account"
                  }
                  buttonClassName="w-full"
                  searchable={googleProfiles.length > 5}
                  searchPlaceholder="Search accounts..."
                  emptyMessage={
                    loadingProfiles
                      ? "Loading..."
                      : profilesError
                      ? profilesError
                      : "No Google Ads accounts found. Please enable Google Ads accounts first."
                  }
                  disabled={loadingProfiles}
                />
                {profilesError && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {profilesError}
                  </p>
                )}
                {!loadingProfiles && googleProfiles.length > 0 && !profilesError && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {googleProfiles.length} account(s) available
                  </p>
                )}
              </div>
            )}

            {/* Campaign Type */}
            <div>
              <label className="form-label">
                Campaign Type *
              </label>
              <div className="space-y-2">
                <Dropdown<string>
                  options={CAMPAIGN_TYPES}
                  value={formData.campaign_type}
                  onChange={(value) => handleChange("campaign_type", value)}
                  placeholder="Select campaign type"
                  buttonClassName="edit-button w-full"
                  disabled={mode === "edit"}
                />
                {/* Quick Fill Buttons for Testing */}
                {mode !== "edit" && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={quickFillPerformanceMax}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] hover:bg-blue-200 transition-colors"
                    title="Quick fill Performance Max campaign with test data"
                  >
                    Quick Fill PMax
                  </button>
                  <button
                    type="button"
                    onClick={quickFillShopping}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] hover:bg-green-200 transition-colors"
                    title="Quick fill Shopping campaign with test data"
                  >
                    Quick Fill Shopping
                  </button>
                  <button
                    type="button"
                    onClick={quickFillSearch}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] hover:bg-purple-200 transition-colors"
                    title="Quick fill Search campaign with test data"
                  >
                    Quick Fill Search
                  </button>
                  {/* <button
                    type="button"
                    onClick={quickFillDemandGen}
                    className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] hover:bg-orange-200 transition-colors"
                    title="Quick fill Demand Gen campaign with test data"
                  >
                    Quick Fill Demand Gen
                  </button> */}
                  {/* <button
                    type="button"
                    onClick={quickFillDisplay}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] hover:bg-indigo-200 transition-colors"
                    title="Quick fill Display campaign with test data"
                  >
                    Quick Fill Display
                  </button> */}
                </div>
                )}
              </div>
              {errors.campaign_type && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.campaign_type}
                </p>
              )}
            </div>

            {/* Campaign Name */}
            <div>
              <label className="form-label">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`campaign-input w-full ${
                  errors.name ? "border-red-500" : ""
                }`}
                placeholder="Enter campaign name"
              />
              {errors.name && (
                <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Budget Amount */}
            <div>
              <label className="form-label">
                Budget Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_amount || ""}
                onChange={(e) =>
                  handleChange("budget_amount", parseFloat(e.target.value) || 0)
                }
                className={`campaign-input w-full ${
                  errors.budget_amount ? "border-red-500" : ""
                }`}
                placeholder="0.00"
              />
              {errors.budget_amount && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.budget_amount}
                </p>
              )}
            </div>

            {/* Budget Name */}
            <div>
              <label className="form-label">
                Budget Name
              </label>
              {useCustomBudgetName || selectedBudgetId === "__CUSTOM__" ? (
                <div>
                  <input
                    type="text"
                    value={formData.budget_name || ""}
                    onChange={(e) => {
                      handleChange("budget_name", e.target.value);
                    }}
                    className={`campaign-input w-full ${
                      errors.budget_name ? "border-red-500" : ""
                    }`}
                    placeholder="Enter custom budget name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomBudgetName(false);
                      setSelectedBudgetId("");
                      handleChange("budget_name", "");
                    }}
                    className="text-[10px] text-[#136D6D] mt-1 hover:underline"
                  >
                    ← Back to budget list
                  </button>
                </div>
              ) : (
                <Dropdown<string>
                  options={budgetOptions}
                  value={selectedBudgetId || (formData.budget_name && budgetOptions.find(opt => opt.value === formData.budget_name) ? formData.budget_name : "")}
                  placeholder={loadingBudgets ? "Loading budgets..." : "Select a budget or choose Custom..."}
                  onChange={(value) => {
                    if (value === "__CUSTOM__") {
                      setUseCustomBudgetName(true);
                      setSelectedBudgetId("__CUSTOM__");
                      handleChange("budget_name", "");
                    } else {
                      setUseCustomBudgetName(false);
                      setSelectedBudgetId(value);
                      handleChange("budget_name", value);
                    }
                  }}
                  disabled={loadingBudgets}
                  searchable={true}
                  searchPlaceholder="Search budgets..."
                  emptyMessage="No budgets found"
                  buttonClassName="edit-button w-full"
                />
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="form-label">
                Start Date
              </label>
              {(() => {
                // Check if start date is today or in the past (only in edit mode)
                const isReadonly = mode === "edit" && formData.start_date ? (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const startDate = new Date(formData.start_date);
                  startDate.setHours(0, 0, 0, 0);
                  return startDate <= today;
                })() : false;
                
                return (
                  <input
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    disabled={isReadonly}
                    className={`campaign-input w-full ${
                      isReadonly ? "bg-gray-100 cursor-not-allowed opacity-60" : ""
                    }`}
                    title={isReadonly ? "Start date cannot be changed if it's today or in the past" : ""}
                  />
                );
              })()}
            </div>

            {/* End Date */}
            <div>
              <label className="form-label">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date || ""}
                onChange={(e) => handleChange("end_date", e.target.value)}
                className={`campaign-input w-full ${
                  errors.end_date ? "border-red-500" : ""
                }`}
              />
            </div>

            {/* Status */}
            <div>
              <label className="form-label">
                Status
              </label>
              <Dropdown<string>
                options={STATUS_OPTIONS}
                value={formData.status || "PAUSED"}
                onChange={(value) => handleChange("status", value)}
                buttonClassName="edit-button w-full"
              />
            </div>

            {/* Bidding Strategy Type */}
            <div>
              <label className="form-label">
                Bidding Strategy
              </label>
              <Dropdown<string>
                options={getAvailableBiddingStrategies(formData.campaign_type)}
                value={formData.bidding_strategy_type || getDefaultBiddingStrategy(formData.campaign_type)}
                onChange={(value) => handleChange("bidding_strategy_type", value)}
                buttonClassName="edit-button w-full"
              />
            </div>

            {/* Target CPA (required when TARGET_CPA is selected) */}
            {formData.bidding_strategy_type === "TARGET_CPA" && (
              <div>
                <label className="form-label">
                  Target CPA ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.target_cpa_micros ? (formData.target_cpa_micros / 1000000).toFixed(2) : ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    handleChange("target_cpa_micros", Math.round(value * 1000000));
                  }}
                  className={`campaign-input w-full ${
                    errors.target_cpa_micros ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="1.00"
                />
                {errors.target_cpa_micros && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.target_cpa_micros}
                  </p>
                )}
                <p className="text-[10px] text-[#556179] mt-1">
                  The target cost per acquisition (CPA) in dollars
                </p>
              </div>
            )}

            {/* Target ROAS (required when TARGET_ROAS is selected) */}
            {formData.bidding_strategy_type === "TARGET_ROAS" && (
              <div>
                <label className="form-label">
                  Target ROAS *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.target_roas || ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    handleChange("target_roas", value);
                  }}
                  className={`campaign-input w-full ${
                    errors.target_roas ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="3.0"
                />
                {errors.target_roas && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.target_roas}
                  </p>
                )}
                <p className="text-[10px] text-[#556179] mt-1">
                  The target return on ad spend (ROAS). Example: 3.0 = 300% ROAS
                </p>
              </div>
            )}

            {/* Target Impression Share fields (required when TARGET_IMPRESSION_SHARE is selected) */}
            {formData.bidding_strategy_type === "TARGET_IMPRESSION_SHARE" && (
              <>
                <div>
                  <label className="form-label">
                    Where do you want your ads to appear? *
                  </label>
                  <Dropdown<string>
                    options={[
                      { value: "ANYWHERE_ON_PAGE", label: "Anywhere on results page" },
                      { value: "TOP_OF_PAGE", label: "Top of results page" },
                      { value: "ABSOLUTE_TOP_OF_PAGE", label: "Absolute top of results page" },
                    ]}
                    value={formData.target_impression_share_location || "TOP_OF_PAGE"}
                    onChange={(value) => handleChange("target_impression_share_location", value)}
                    buttonClassName="edit-button w-full"
                  />
                  {errors.target_impression_share_location && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.target_impression_share_location}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Percent (%) impression share to target *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.target_impression_share_location_fraction_micros ? (formData.target_impression_share_location_fraction_micros / 10000).toFixed(1) : ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleChange("target_impression_share_location_fraction_micros", Math.round(value * 10000));
                    }}
                    className={`campaign-input w-full ${
                      errors.target_impression_share_location_fraction_micros ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="2.0"
                  />
                  {errors.target_impression_share_location_fraction_micros && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.target_impression_share_location_fraction_micros}
                    </p>
                  )}
                  <p className="text-[10px] text-[#556179] mt-1">
                    Target impression share percentage (0-100). Example: 2.0 = 2%
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    Maximum CPC bid limit *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.target_impression_share_cpc_bid_ceiling_micros ? (formData.target_impression_share_cpc_bid_ceiling_micros / 1000000).toFixed(2) : ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleChange("target_impression_share_cpc_bid_ceiling_micros", Math.round(value * 1000000));
                    }}
                    className={`campaign-input w-full ${
                      errors.target_impression_share_cpc_bid_ceiling_micros ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="3.00"
                  />
                  {errors.target_impression_share_cpc_bid_ceiling_micros && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.target_impression_share_cpc_bid_ceiling_micros}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Performance Max Specific Fields */}
          {formData.campaign_type === "PERFORMANCE_MAX" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Performance Max Settings
              </h3>

              {/* Final URL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                <label className="form-label">
                  Final URL *
                </label>
                <input
                  type="url"
                  value={formData.final_url || ""}
                  onChange={(e) => handleChange("final_url", e.target.value)}
                  className={`campaign-input w-full ${
                    errors.final_url ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="https://example.com"
                />
                {errors.final_url && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.final_url}
                  </p>
                )}
                </div>
                <div>
                <label className="form-label">
                  Asset Group Name
                </label>
                <input
                  type="text"
                  value={formData.asset_group_name || ""}
                  onChange={(e) =>
                    handleChange("asset_group_name", e.target.value)
                  }
                  className={`campaign-input w-full ${
                    errors.asset_group_name ? "border-red-500" : ""
                  }`}
                  placeholder="Optional asset group name"
                />
                {errors.asset_group_name && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.asset_group_name}
                  </p>
                )}
              </div>

              </div>

              
              {/* Headlines */}
              <div>
                  <label className="form-label">
                  Headlines * (3-15 required)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.headlines?.filter((h) => h.trim()).length || 0}/15)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.headlines?.map((headline, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) =>
                          updateHeadline(index, e.target.value)
                        }
                        className={`campaign-input w-full ${
                          errors.headlines ? "border-red-500" : ""
                        }`}
                        placeholder={`Headline ${index + 1}`}
                      />
                      {formData.headlines && formData.headlines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHeadline(index)}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                          title="Remove headline"
                        >
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.headlines && formData.headlines.length < 15 && (
                    <button
                      type="button"
                      onClick={addHeadline}
                      className="edit-button"
                    >
                      + Add Headline
                    </button>
                  )}
                </div>
                {errors.headlines && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.headlines}
                  </p>
                )}
              </div>

              {/* Descriptions */}
              <div>
                <label className="form-label">
                  Descriptions * (2-4 required)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.descriptions?.filter((d) => d.trim()).length || 0}/4)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.descriptions?.map((description, index) => (
                    <div key={index} className="flex gap-2">
                      <textarea
                        value={description}
                        onChange={(e) =>
                          updateDescription(index, e.target.value)
                        }
                        rows={2}
                        className={`campaign-input w-full ${
                          errors.descriptions ? "border-red-500" : ""
                        }`}
                        placeholder={`Description ${index + 1}`}
                      />
                      {formData.descriptions &&
                        formData.descriptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDescription(index)}
                            className="p-2 hover:bg-red-50 rounded transition-colors"
                            title="Remove description"
                          >
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                    </div>
                  ))}
                  {formData.descriptions &&
                    formData.descriptions.length < 4 && (
                      <button
                        type="button"
                        onClick={addDescription}
                        className="edit-button"
                      >
                        + Add Description
                      </button>
                    )}
                </div>
                {errors.descriptions && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.descriptions}
                  </p>
                )}
              </div>

              {/* Optional Performance Max Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.business_name || ""}
                    onChange={(e) =>
                      handleChange("business_name", e.target.value)
                    }
                    className={`campaign-input w-full ${
                      errors.business_name ? "border-red-300" : "border-gray-200"
                    }`}
                    placeholder="Required business name"
                  />
                  {errors.business_name && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.business_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Long Headline
                  </label>
                  <input
                    type="text"
                    value={formData.long_headline || ""}
                    onChange={(e) =>
                      handleChange("long_headline", e.target.value)
                    }
                    className={`campaign-input w-full ${
                      errors.long_headline ? "border-red-500" : ""
                    }`}
                    placeholder="Optional long headline"
                  />
                </div>

                <div>
                    <label className="form-label">
                    Logo (URL or Upload) *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={formData.logo_url || ""}
                      onChange={(e) => handleChange("logo_url", e.target.value)}
                      className={`campaign-input w-full ${
                        errors.logo_url ? "border-red-500" : ""
                      }`}
                      placeholder="https://example.com/logo.png"
                    />
                    {errors.logo_url && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.logo_url}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (max 5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              setErrors({ ...errors, logo_url: "File size must be less than 5MB" });
                              setLogoPreview(null);
                              return;
                            }
                            // Validate file type
                            if (!file.type.startsWith("image/")) {
                              setErrors({ ...errors, logo_url: "File must be an image" });
                              setLogoPreview(null);
                              return;
                            }
                            
                            // Validate image dimensions (must be square, minimum 128x128)
                            try {
                              const img = new Image();
                              const objectUrl = URL.createObjectURL(file);
                              
                              await new Promise((resolve, reject) => {
                                img.onload = () => {
                                  URL.revokeObjectURL(objectUrl);
                                  const width = img.width;
                                  const height = img.height;
                                  
                                  // Check if square (1:1 aspect ratio)
                                  if (width !== height) {
                                    setErrors({ 
                                      ...errors, 
                                      logo_url: `Logo must be square (1:1 aspect ratio). Current dimensions: ${width}x${height}px. Please use a square image.` 
                                    });
                                    setLogoPreview(null);
                                    reject(new Error("Not square"));
                                    return;
                                  }
                                  
                                  // Check minimum size
                                  if (width < 128 || height < 128) {
                                    setErrors({ 
                                      ...errors, 
                                      logo_url: `Logo must be at least 128x128 pixels. Current dimensions: ${width}x${height}px. Recommended: 128x128px or larger.` 
                                    });
                                    setLogoPreview(null);
                                    reject(new Error("Too small"));
                                    return;
                                  }
                                  
                                  // Create preview using FileReader
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setLogoPreview(reader.result as string);
                                  };
                                  reader.onerror = () => {
                                    setLogoPreview(null);
                                  };
                                  reader.readAsDataURL(file);
                                  
                                  resolve(null);
                                };
                                
                                img.onerror = () => {
                                  URL.revokeObjectURL(objectUrl);
                                  setErrors({ ...errors, logo_url: "Failed to load image. Please try a different file." });
                                  setLogoPreview(null);
                                  reject(new Error("Image load failed"));
                                };
                                
                                img.src = objectUrl;
                              });
                              
                              // If dimension validation passed, proceed with upload
                              try {
                                // Upload file
                                const formData = new FormData();
                                formData.append("file", file);
                                
                                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/accounts/upload/logo/`, {
                                  method: "POST",
                                  headers: {
                                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                                  },
                                  body: formData,
                                });
                                
                                const responseData = await response.json();
                                
                                if (!response.ok) {
                                  const errorMessage = responseData.error || responseData.message || "Upload failed";
                                  setErrors({ ...errors, logo_url: errorMessage });
                                  setLogoPreview(null);
                                  return;
                                }
                                
                                if (responseData.url) {
                                  handleChange("logo_url", responseData.url);
                                  setErrors({ ...errors, logo_url: undefined });
                                  // Preview will be updated by handleChange
                                } else {
                                  setErrors({ ...errors, logo_url: "Upload succeeded but no URL returned" });
                                  setLogoPreview(null);
                                }
                              } catch (error: any) {
                                setErrors({ ...errors, logo_url: error.message || "Failed to upload logo. Please try again or use a URL." });
                                setLogoPreview(null);
                              }
                            } catch (error: any) {
                              // Dimension validation error already set
                              if (!error.message || (error.message !== "Not square" && error.message !== "Too small" && error.message !== "Image load failed")) {
                                setErrors({ ...errors, logo_url: "Failed to validate image dimensions. Please try a different file." });
                                setLogoPreview(null);
                              }
                            }
                          }
                        }}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="edit-button"
                      >
                        Upload Logo
                      </label>
                    </div>
                    {/* Logo Preview */}
                    {logoPreview && (
                      <div className="mt-2">
                        <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                        <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-32 h-32 object-contain rounded"
                            onError={(e) => {
                              // Hide preview on error (e.g., CORS issues, invalid URL)
                              const img = e.currentTarget;
                              img.style.display = "none";
                              // Clear preview after a short delay to allow for retries
                              setTimeout(() => {
                                setLogoPreview(null);
                              }, 500);
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {errors.logo_url && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.logo_url}
                      </p>
                    )}
                    <p className="text-[10px] text-[#556179] mt-1">
                      Logo must be square (1:1 aspect ratio) and at least 128x128 pixels. Recommended: 128x128px or larger.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Marketing Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.marketing_image_url || ""}
                    onChange={(e) =>
                      handleChange("marketing_image_url", e.target.value)
                    }
                    className={`campaign-input w-full ${
                      errors.marketing_image_url ? "border-red-500" : ""
                    }`}
                    placeholder="https://example.com/image.png"
                  />
                  {/* Marketing Image Preview */}
                  {marketingImagePreview && (
                    <div className="mt-2">
                      <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                      <div className="inline-block border border-gray-200 rounded bg-white p-1">
                        <img
                          src={marketingImagePreview}
                          alt="Marketing image preview"
                          className="max-w-48 max-h-32 w-auto h-auto object-contain block rounded"
                          onError={(e) => {
                            // Hide preview on error (e.g., CORS issues)
                            const img = e.currentTarget;
                            img.style.display = "none";
                            setMarketingImagePreview(null);
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {errors.marketing_image_url && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.marketing_image_url}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Square Marketing Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.square_marketing_image_url || ""}
                    onChange={(e) =>
                      handleChange("square_marketing_image_url", e.target.value)
                    }
                    className={`campaign-input w-full ${
                      errors.square_marketing_image_url ? "border-red-500" : ""
                    }`}
                    placeholder="https://example.com/square-image.png"
                  />
                  {/* Square Marketing Image Preview */}
                  {squareMarketingImagePreview && (
                    <div className="mt-2">
                      <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                      <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                        <img
                          src={squareMarketingImagePreview}
                          alt="Square marketing image preview"
                          className="w-32 h-32 object-contain rounded"
                          onError={(e) => {
                            // Hide preview on error (e.g., CORS issues)
                            const img = e.currentTarget;
                            img.style.display = "none";
                            setSquareMarketingImagePreview(null);
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {errors.square_marketing_image_url && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.square_marketing_image_url}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shopping Specific Fields */}
          {formData.campaign_type === "SHOPPING" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Shopping Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Merchant ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">
                      Merchant ID *
                    </label>
                    <button
                      type="button"
                      onClick={fetchMerchantAccounts}
                      disabled={loadingMerchantAccounts || !accountId || formData.campaign_type !== "SHOPPING"}
                      className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                      title="Refresh merchant accounts list"
                    >
                      <svg
                        className={`w-3 h-3 ${loadingMerchantAccounts ? "animate-spin" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      {loadingMerchantAccounts ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                  <Dropdown<string>
                    options={merchantAccountOptions}
                    value={formData.merchant_id || ""}
                    onChange={(value) => {
                      handleChange("merchant_id", value);
                      if (errors.merchant_id) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.merchant_id;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder={
                      loadingMerchantAccounts
                        ? "Loading merchant accounts..."
                        : merchantAccountOptions.length === 0
                        ? "No merchant accounts available"
                        : "Select merchant account"
                    }
                    buttonClassName="edit-button w-full"
                    searchable={true}
                    searchPlaceholder="Search merchant accounts..."
                    emptyMessage={
                      loadingMerchantAccounts
                        ? "Loading..."
                        : merchantAccountsError
                        ? merchantAccountsError
                        : "No Merchant Center accounts found. Please link a Merchant Center account to your Google Ads account."
                    }
                    disabled={loadingMerchantAccounts}
                  />
                  {errors.merchant_id && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.merchant_id}
                    </p>
                  )}
                  {merchantAccountsError && !errors.merchant_id && (
                    <p className="text-[10px] text-yellow-600 mt-1">
                      {merchantAccountsError}
                    </p>
                  )}
                  {!loadingMerchantAccounts && merchantAccountOptions.length > 0 && !merchantAccountsError && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      {merchantAccountOptions.length} merchant account(s) available
                    </p>
                  )}
                </div>

                {/* Sales Country */}
                <div>
                  <label className="form-label">
                    Sales Country
                  </label>
                  <Dropdown<string>
                    options={SALES_COUNTRY_OPTIONS}
                    value={formData.sales_country || "US"}
                    onChange={(value) => handleChange("sales_country", value)}
                    buttonClassName="edit-button w-full"
                  />
                </div>

                {/* Campaign Priority */}
                <div>
                  <label className="form-label">
                    Campaign Priority
                  </label>
                  <Dropdown<number>
                    options={CAMPAIGN_PRIORITY_OPTIONS}
                    value={formData.campaign_priority || 0}
                    onChange={(value) => handleChange("campaign_priority", value)}
                    buttonClassName="w-full edit-button"
                  />
                  <p className="text-[10px] text-[#556179] mt-1">
                    Priority determines how your Shopping campaigns compete with each other. Low (0) = lowest priority, High (2) = highest priority.
                  </p>
                </div>

                {/* Enable Local */}
                <div className="pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enable_local || false}
                      onChange={(e) =>
                        handleChange("enable_local", e.target.checked)
                      }
                      className={`w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40 ${
                        errors.enable_local ? "border-red-500" : ""
                      }`}
                    />
                    <span className="form-label mb-0">
                      Enable Local
                    </span>
                  </label>
                  <p className="text-[10px] text-[#556179] mt-1 ml-6">
                    Enable local inventory ads to show your products to nearby customers with local inventory available.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Location Targeting - Available for SHOPPING / SEARCH / PERFORMANCE_MAX campaigns */}
          {(formData.campaign_type === "SHOPPING" ||
            formData.campaign_type === "SEARCH" ||
            formData.campaign_type === "PERFORMANCE_MAX") && (
            <>
              <div className="mt-6 space-y-4">
                <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                  Location Targeting
                </h3>

                {/* Target Locations */}
                <div>
                  <label className="form-label">
                    Target Locations
                  </label>
                  {errors.location_ids && (
                    <p className="text-[10px] text-red-500 -mt-1 mb-2">
                      {errors.location_ids}
                    </p>
                  )}
                  <Dropdown<string>
                    options={locationOptions.filter(
                      (opt) => !formData.excluded_location_ids?.includes(opt.value)
                    )}
                    value=""
                    onChange={(value) => {
                      const currentIds = formData.location_ids || [];
                      if (!currentIds.includes(value)) {
                        // Remove from excluded locations if it exists there
                        const excludedIds = (formData.excluded_location_ids || []).filter(id => id !== value);
                        handleChange("excluded_location_ids", excludedIds.length > 0 ? excludedIds : undefined);
                        // Add to target locations
                        handleChange("location_ids", [...currentIds, value]);
                      }
                    }}
                    placeholder={
                      loadingLocations
                        ? "Loading locations..."
                        : locationOptions.length === 0
                        ? "No locations found"
                        : "Select locations to target"
                    }
                    buttonClassName="edit-button w-full"
                    searchable={true}
                    searchPlaceholder="Search locations..."
                    emptyMessage={
                      loadingLocations
                        ? "Loading..."
                        : "Start typing to search for locations"
                    }
                    disabled={loadingLocations}
                  />
                  {formData.location_ids && formData.location_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.location_ids.map((locId) => {
                        const location = locationOptions.find(l => l.value === locId);
                        return (
                          <span
                            key={locId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                          >
                            {location?.label || locId}
                            <button
                              type="button"
                              onClick={() => {
                                const newIds = (formData.location_ids || []).filter(id => id !== locId);
                                handleChange("location_ids", newIds.length > 0 ? newIds : undefined);
                              }}
                              className="hover:text-red-200"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Exclude Locations */}
                <div>
                  <label className="form-label">
                    Exclude Locations
                  </label>
                  <Dropdown<string>
                    options={locationOptions.filter(
                      (opt) => !formData.location_ids?.includes(opt.value)
                    )}
                    value=""
                    onChange={(value) => {
                      const currentIds = formData.excluded_location_ids || [];
                      if (!currentIds.includes(value)) {
                        // Remove from target locations if it exists there
                        const targetIds = (formData.location_ids || []).filter(id => id !== value);
                        handleChange("location_ids", targetIds.length > 0 ? targetIds : undefined);
                        // Add to excluded locations
                        handleChange("excluded_location_ids", [...currentIds, value]);
                      }
                    }}
                    placeholder="Select locations to exclude"
                    buttonClassName="edit-button w-full"
                    searchable={true}
                    searchPlaceholder="Search locations to exclude..."
                    emptyMessage={
                      loadingLocations
                        ? "Loading..."
                        : "Start typing to search for locations"
                    }
                    disabled={loadingLocations}
                  />
                  {formData.excluded_location_ids && formData.excluded_location_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.excluded_location_ids.map((locId) => {
                        const location = locationOptions.find(l => l.value === locId);
                        return (
                          <span
                            key={locId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-[11px] rounded"
                          >
                            {location?.label || locId}
                            <button
                              type="button"
                              onClick={() => {
                                const newIds = (formData.excluded_location_ids || []).filter(id => id !== locId);
                                handleChange("excluded_location_ids", newIds.length > 0 ? newIds : undefined);
                              }}
                              className="hover:text-red-200"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Language Targeting - Available for SEARCH and PERFORMANCE_MAX campaigns */}
              {(formData.campaign_type === "SEARCH" || formData.campaign_type === "PERFORMANCE_MAX") && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                    Language Targeting
                  </h3>

                  <div>
                    <label className="form-label">
                      Target Languages
                    </label>
                    {errors.language_ids && (
                      <p className="text-[10px] text-red-500 -mt-1 mb-2">
                        {errors.language_ids}
                      </p>
                    )}
                    <Dropdown<string>
                      options={languageOptions}
                      value=""
                      onChange={(value) => {
                        const currentIds = formData.language_ids || [];
                        if (!currentIds.includes(value)) {
                          handleChange("language_ids", [...currentIds, value]);
                        }
                      }}
                      placeholder={
                        loadingLanguages
                          ? "Loading languages..."
                          : languageOptions.length === 0
                          ? "No languages found"
                          : "Select languages to target"
                      }
                      buttonClassName="edit-button w-full"
                      searchable={true}
                      searchPlaceholder="Search languages..."
                      emptyMessage={
                        loadingLanguages
                          ? "Loading..."
                          : "Start typing to search for languages"
                      }
                      disabled={loadingLanguages}
                    />
                    {formData.language_ids && formData.language_ids.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.language_ids.map((langId) => {
                          const language = languageOptions.find(l => l.value === langId);
                          return (
                            <span
                              key={langId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                            >
                              {language?.label || langId}
                              <button
                                type="button"
                                onClick={() => {
                                  const newIds = (formData.language_ids || []).filter(id => id !== langId);
                                  handleChange("language_ids", newIds.length > 0 ? newIds : undefined);
                                }}
                                className="hover:text-red-200"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shopping Network info - matches Google UI (Search Network only) */}
              {formData.campaign_type === "SHOPPING" && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                    Network
                  </h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="text-[13px] font-semibold text-[#072929] mb-2">
                      Google Search Network
                    </h4>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded"
                      />
                      <span className="text-[12px] text-[#072929]">
                        Enabled by default for Shopping campaigns
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Network Settings and Device Targeting - Available for SEARCH campaigns */}
              {formData.campaign_type === "SEARCH" && (
                <>
                  {/* Network Settings */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                      Network Settings
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Search Network card (always on in Google UI) */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <h4 className="text-[13px] font-semibold text-[#072929] mb-1">
                          Search Network
                        </h4>
                        <p className="text-[11px] text-[#556179] mb-3">
                          Ads can appear near Google Search results and other Google sites
                          when people search for terms that are relevant to your keywords.
                          Search Network is always enabled for Search campaigns.
                        </p>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.network_settings?.target_partner_search_network ?? false}
                            onChange={(e) =>
                              handleChange("network_settings", {
                                // Always keep core Search network on; this checkbox only controls partners
                                target_google_search: true,
                                target_search_network: true,
                                target_content_network:
                                  formData.network_settings?.target_content_network ?? false,
                                target_partner_search_network: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                          />
                          <span className="text-[12px] text-[#072929]">
                            Include Google search partners
                          </span>
                        </label>
                      </div>

                      {/* Display Network card */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <h4 className="text-[13px] font-semibold text-[#072929] mb-1">
                          Display Network
                        </h4>
                        <p className="text-[11px] text-[#556179] mb-3">
                          Easy way to get additional conversions at similar or lower costs than
                          Search with unused Search budget.
                        </p>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.network_settings?.target_content_network ?? false}
                            onChange={(e) =>
                              handleChange("network_settings", {
                                // Keep core Search network on; this checkbox only controls Display Network
                                target_google_search: true,
                                target_search_network: true,
                                target_partner_search_network:
                                  formData.network_settings?.target_partner_search_network ?? false,
                                target_content_network: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                          />
                          <span className="text-[12px] text-[#072929]">
                            Include Google Display Network
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Device Targeting */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                      Device Targeting
                    </h3>

                    <div>
                      <label className="form-label">
                        Target Devices
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: "MOBILE", label: "Mobile" },
                          { value: "DESKTOP", label: "Desktop" },
                          { value: "TABLET", label: "Tablet" },
                          { value: "CONNECTED_TV", label: "Connected TV" },
                          { value: "OTHER", label: "Other" },
                        ].map((device) => (
                          <div key={device.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.device_ids?.includes(device.value) ?? false}
                              onChange={(e) => {
                                const currentIds = formData.device_ids || [];
                                if (e.target.checked) {
                                  handleChange("device_ids", [...currentIds, device.value]);
                                } else {
                                  handleChange("device_ids", currentIds.filter(id => id !== device.value));
                                }
                              }}
                              className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                            />
                            <label className="form-label mb-0">
                              {device.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#556179] mt-2">
                        Select devices to target. If none selected, ads will show on all devices.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Device Targeting - Available for PERFORMANCE_MAX campaigns */}
              {formData.campaign_type === "PERFORMANCE_MAX" && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                    Device Targeting
                  </h3>

                  <div>
                    <label className="form-label">
                      Target Devices
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: "MOBILE", label: "Mobile" },
                        { value: "DESKTOP", label: "Desktop" },
                        { value: "TABLET", label: "Tablet" },
                        { value: "CONNECTED_TV", label: "Connected TV" },
                        { value: "OTHER", label: "Other" },
                      ].map((device) => (
                        <div key={device.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.device_ids?.includes(device.value) ?? false}
                            onChange={(e) => {
                              const currentIds = formData.device_ids || [];
                              if (e.target.checked) {
                                handleChange("device_ids", [...currentIds, device.value]);
                              } else {
                                handleChange("device_ids", currentIds.filter(id => id !== device.value));
                              }
                            }}
                            className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                          />
                          <label className="form-label mb-0">
                            {device.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#556179] mt-2">
                      Select devices to target. If none selected, ads will show on all devices.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Campaign URL options - available for all API-created campaign types */}
          {formData.campaign_type !== "VIDEO" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Campaign URL options
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Tracking template
                  </label>
                  <input
                    type="text"
                    value={formData.tracking_url_template || ""}
                    onChange={(e) => handleChange("tracking_url_template", e.target.value)}
                    className="campaign-input w-full"
                    placeholder="{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}"
                  />
                  <p className="text-[10px] text-[#556179] mt-1">
                    Optional. Define a campaign-level tracking URL that can include ValueTrack parameters.
                  </p>
                </div>
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Final URL suffix
                  </label>
                  <input
                    type="text"
                    value={formData.final_url_suffix || ""}
                    onChange={(e) => handleChange("final_url_suffix", e.target.value)}
                    className="campaign-input w-full"
                    placeholder="utm_source=google&utm_medium=cpc&utm_campaign={campaignid}"
                  />
                  <p className="text-[10px] text-[#556179] mt-1">
                    Optional. Appended to your landing page URL after any existing query string.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Custom parameters (optional)
                </label>
                {formData.url_custom_parameters && formData.url_custom_parameters.length > 0 ? (
                  <div className="space-y-2">
                    {formData.url_custom_parameters.map((param, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 items-center"
                      >
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => {
                            const newParams = [...(formData.url_custom_parameters || [])];
                            newParams[index] = { ...newParams[index], key: e.target.value };
                            handleChange("url_custom_parameters", newParams);
                          }}
                          className="campaign-input w-full"
                          placeholder="utm_source"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => {
                            const newParams = [...(formData.url_custom_parameters || [])];
                            newParams[index] = { ...newParams[index], value: e.target.value };
                            handleChange("url_custom_parameters", newParams);
                          }}
                          className="campaign-input w-full"
                          placeholder="google"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newParams = (formData.url_custom_parameters || []).filter(
                              (_, i) => i !== index
                            );
                            handleChange(
                              "url_custom_parameters",
                              newParams.length > 0 ? newParams : undefined
                            );
                          }}
                          className="p-2 hover:bg-red-50 rounded transition-colors text-xs text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[#556179] mb-2">
                    Custom parameters are{" "}
                    <span className="font-semibold">tracking-only</span> labels that you define
                    (for example <code className="font-mono text-[10px]">_campaign</code> or{" "}
                    <code className="font-mono text-[10px]">_source</code>) and then reference
                    in your tracking template, like{" "}
                    <code className="font-mono text-[10px]">
                      {`{lpurl}?source_campaign={_campaign}`}
                    </code>
                    . They <span className="font-semibold">do not change the landing page</span>
                    — use the final URL / final URL suffix for content-modifying parameters
                    such as product IDs.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const current = formData.url_custom_parameters || [];
                    handleChange("url_custom_parameters", [...current, { key: "", value: "" }]);
                  }}
                  className="edit-button mt-1"
                >
                  + Add parameter
                </button>
              </div>
            </div>
          )}

          {/* Search Specific Fields */}
          {formData.campaign_type === "SEARCH" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Search Campaign Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ad Group Name */}
                <div>
                  <label className="form-label">
                    Ad Group Name
                  </label>
                  <input
                    type="text"
                    value={formData.adgroup_name || ""}
                    onChange={(e) => handleChange("adgroup_name", e.target.value)}
                    className={`campaign-input w-full ${
                      errors.adgroup_name ? "border-red-500" : ""
                    }`}
                    placeholder="Optional ad group name"
                  />
                  <p className="text-[10px] text-[#556179] mt-1">
                    The ad group organizes your keywords and ads
                  </p>
                </div>

                {/* Match Type */}
                <div>
                  <label className="form-label">
                    Default Match Type
                  </label>
                  <Dropdown<string>
                    options={MATCH_TYPE_OPTIONS}
                    value={formData.match_type || "BROAD"}
                    onChange={(value) => handleChange("match_type", value)}
                    buttonClassName="edit-button w-full"
                  />
                  <p className="text-[10px] text-[#556179] mt-1">
                    Controls how closely keywords must match user searches
                  </p>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="form-label">
                  Keywords (comma-separated or one per line)
                </label>
                <textarea
                  value={Array.isArray(formData.keywords) ? formData.keywords.join("\n") : formData.keywords || ""}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter(line => line.trim());
                    handleChange("keywords", lines);
                  }}
                  className={`campaign-input w-full h-24 resize-none ${
                    errors.keywords ? "border-red-500" : ""
                  }`}
                  placeholder="e.g., blue running shoes&#10;best athletic shoes&#10;women's sports shoes"
                />
                {errors.keywords && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.keywords}
                  </p>
                )}
                <p className="text-[10px] text-[#556179] mt-1">
                  Enter one keyword per line
                </p>
              </div>

              {/* Location Targeting */}
              <div>
                <label className="form-label">
                  Target Locations
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white border border-gray-200 rounded">
                  {LOCATION_OPTIONS.map((location) => (
                    <div key={location.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`location-${location.id}`}
                        checked={formData.location_ids?.includes(location.id) || false}
                        onChange={(e) => {
                          const newLocationIds = e.target.checked
                            ? [...(formData.location_ids || []), location.id]
                            : (formData.location_ids || []).filter(id => id !== location.id);
                          handleChange("location_ids", newLocationIds);
                        }}
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                      />
                      <label htmlFor={`location-${location.id}`} className="text-[12px] text-[#556179] cursor-pointer">
                        {location.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#556179] mt-2">
                  Select one or more countries/regions where your ads will be shown
                </p>
              </div>

              {/* Language Targeting */}
              <div>
                <label className="form-label">
                  Target Languages
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white border border-gray-200 rounded">
                  {LANGUAGE_OPTIONS.map((language) => (
                    <div key={language.code} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`language-${language.code}`}
                        checked={formData.language_codes?.includes(language.code) || false}
                        onChange={(e) => {
                          const newLanguageCodes = e.target.checked
                            ? [...(formData.language_codes || []), language.code]
                            : (formData.language_codes || []).filter(code => code !== language.code);
                          handleChange("language_codes", newLanguageCodes);
                        }}
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                      />
                      <label htmlFor={`language-${language.code}`} className="text-[12px] text-[#556179] cursor-pointer">
                        {language.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#556179] mt-2">
                  Select one or more languages for your target audience
                </p>
              </div>

              {/* Conversion Action IDs */}
              <div>
                <label className="form-label">
                  Conversion Actions (optional)
                </label>
                <textarea
                  value={formData.conversion_action_ids?.join("\n") || ""}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter(line => line.trim());
                    handleChange("conversion_action_ids", lines);
                  }}
                  className={`campaign-input w-full h-20 resize-none ${
                    errors.conversion_action_ids ? "border-red-500" : ""
                  }`}
                  placeholder="Enter conversion action IDs (one per line)&#10;e.g., 123456789&#10;987654321"
                />
                {errors.conversion_action_ids && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.conversion_action_ids}
                  </p>
                )}
                <p className="text-[10px] text-[#556179] mt-1">
                  Optional: Specify which conversions to optimize for. Leave empty to optimize for all conversions.
                </p>
              </div>
            </div>
          )}

          {/* Demand Gen Specific Fields */}
          {formData.campaign_type === "DEMAND_GEN" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Demand Gen Settings
              </h3>

              {/* Final URL */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Final URL *
                </label>
                <input
                  type="url"
                  value={formData.final_url || ""}
                  onChange={(e) => handleChange("final_url", e.target.value)}
                  className={`campaign-input w-full ${
                    errors.final_url ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="https://example.com"
                />
                {errors.final_url && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.final_url}
                  </p>
                )}
              </div>

              {/* Video Input - Radio to choose between video_url and video_id */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Video Asset *
                </label>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="video_type"
                        checked={!formData.video_url || !!formData.video_id}
                        onChange={() => {
                          handleChange("video_url", "");
                          if (!formData.video_id) {
                            handleChange("video_id", "");
                          }
                        }}
                        className="w-4 h-4 accent-forest-f40"
                      />
                      <span className="text-[13px] text-[#072929]">YouTube Video ID</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="video_type"
                        checked={!!formData.video_url && !formData.video_id}
                        onChange={() => {
                          handleChange("video_id", "");
                          if (!formData.video_url) {
                            handleChange("video_url", "");
                          }
                        }}
                        className="w-4 h-4 accent-forest-f40"
                      />
                      <span className="text-[13px] text-[#072929]">Video URL</span>
                    </label>
                  </div>
                  
                  {(!formData.video_url || formData.video_id) && (
                    <div>
                      <input
                        type="text"
                        value={formData.video_id || ""}
                        onChange={(e) => {
                          handleChange("video_id", e.target.value);
                          if (e.target.value) {
                            handleChange("video_url", "");
                          }
                        }}
                        className={`campaign-input w-full ${
                          errors.video_id ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="dQw4w9WgXcQ"
                      />
                      {errors.video_id && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.video_id}
                        </p>
                      )}
                      <p className="text-[10px] text-[#556179] mt-1">
                        Enter a YouTube video ID (11 characters, e.g., dQw4w9WgXcQ)
                      </p>
                    </div>
                  )}
                  
                  {(!formData.video_id || formData.video_url) && (
                    <div>
                      <input
                        type="url"
                        value={formData.video_url || ""}
                        onChange={(e) => {
                          handleChange("video_url", e.target.value);
                          if (e.target.value) {
                            handleChange("video_id", "");
                          }
                        }}
                        className={`campaign-input w-full ${
                          errors.video_url ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="https://example.com/video.mp4"
                      />
                      {errors.video_url && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.video_url}
                        </p>
                      )}
                      <p className="text-[10px] text-[#556179] mt-1">
                        Enter a valid video file URL
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Logo URL *
                </label>
                <input
                  type="url"
                  value={formData.logo_url || ""}
                  onChange={(e) => handleChange("logo_url", e.target.value)}
                  className={`campaign-input w-full ${
                    errors.logo_url ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="https://example.com/logo.png"
                />
                {errors.logo_url && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.logo_url}
                  </p>
                )}
                {logoPreview && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                    <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-contain rounded"
                        onError={() => setLogoPreview(null)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.business_name || ""}
                  onChange={(e) => handleChange("business_name", e.target.value)}
                  className={`campaign-input w-full ${
                    errors.business_name ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="My Business Name"
                />
                {errors.business_name && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.business_name}
                  </p>
                )}
              </div>

              {/* Headlines */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Headlines * (3-15 required)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.headlines?.filter((h) => h.trim()).length || 0}/15)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.headlines?.map((headline, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => updateHeadline(index, e.target.value)}
                        className="campaign-input flex-1"
                        placeholder={`Headline ${index + 1}`}
                      />
                      {formData.headlines && formData.headlines.length > 3 && (
                        <button
                          type="button"
                          onClick={() => removeHeadline(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.headlines && formData.headlines.length < 15 && (
                    <button
                      type="button"
                      onClick={addHeadline}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
                    >
                      + Add Headline
                    </button>
                  )}
                </div>
                {errors.headlines && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.headlines}
                  </p>
                )}
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Descriptions * (2-4 required)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.descriptions?.filter((d) => d.trim()).length || 0}/4)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.descriptions?.map((description, index) => (
                    <div key={index} className="flex gap-2">
                      <textarea
                        value={description}
                        onChange={(e) => updateDescription(index, e.target.value)}
                        rows={2}
                        className="campaign-input flex-1"
                        placeholder={`Description ${index + 1}`}
                      />
                      {formData.descriptions && formData.descriptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeDescription(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.descriptions && formData.descriptions.length < 4 && (
                    <button
                      type="button"
                      onClick={addDescription}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
                    >
                      + Add Description
                    </button>
                  )}
                </div>
                {errors.descriptions && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.descriptions}
                  </p>
                )}
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Long Headline
                  </label>
                  <input
                    type="text"
                    value={formData.long_headline || ""}
                    onChange={(e) => handleChange("long_headline", e.target.value)}
                    className="campaign-input w-full"
                    placeholder="Optional long headline"
                  />
                </div>

                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Ad Group Name
                  </label>
                  <input
                    type="text"
                    value={formData.ad_group_name || ""}
                    onChange={(e) => handleChange("ad_group_name", e.target.value)}
                    className="campaign-input w-full"
                    placeholder="Optional ad group name"
                  />
                </div>

                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Ad Name
                  </label>
                  <input
                    type="text"
                    value={formData.ad_name || ""}
                    onChange={(e) => handleChange("ad_name", e.target.value)}
                    className="campaign-input w-full"
                    placeholder="Optional ad name"
                  />
                </div>
              </div>

              {/* Channel Controls */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Channel Controls
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white border border-gray-200 rounded">
                  {[
                    { key: "gmail", label: "Gmail" },
                    { key: "discover", label: "Google Discover" },
                    { key: "display", label: "Display Network" },
                    { key: "youtube_in_feed", label: "YouTube Feed" },
                    { key: "youtube_in_stream", label: "YouTube In-Stream" },
                    { key: "youtube_shorts", label: "YouTube Shorts" },
                  ].map((channel) => (
                    <label key={channel.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.channel_controls?.[channel.key as keyof typeof formData.channel_controls] ?? true}
                        onChange={(e) => {
                          const current = formData.channel_controls || {};
                          handleChange("channel_controls", {
                            ...current,
                            [channel.key]: e.target.checked,
                          });
                        }}
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                      />
                      <span className="text-[13px] text-[#072929]">{channel.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-[#556179] mt-1">
                  Control where your Demand Gen ads appear. All channels are enabled by default.
                </p>
              </div>
            </div>
          )}

          {/* Display Specific Fields */}
          {formData.campaign_type === "DISPLAY" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Display Settings
              </h3>

              {/* Ad Group Name */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Ad Group Name
                </label>
                <input
                  type="text"
                  value={formData.adgroup_name || ""}
                  onChange={(e) => handleChange("adgroup_name", e.target.value)}
                  className="campaign-input w-full"
                  placeholder="Optional ad group name"
                />
              </div>

              {/* Network Settings */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Network Settings
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white border border-gray-200 rounded">
                  {[
                    { key: "target_content_network", label: "Display Network", default: true },
                    { key: "target_google_search", label: "Google Search", default: false },
                    { key: "target_search_network", label: "Search Network", default: false },
                    { key: "target_partner_search_network", label: "Partner Search Network", default: false },
                  ].map((network) => (
                    <label key={network.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.network_settings?.[network.key as keyof typeof formData.network_settings] ?? network.default}
                        onChange={(e) => {
                          const current = formData.network_settings || {};
                          handleChange("network_settings", {
                            ...current,
                            [network.key]: e.target.checked,
                          });
                        }}
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                      />
                      <span className="text-[13px] text-[#072929]">{network.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-[#556179] mt-1">
                  Control where your Display ads appear. Display Network is enabled by default.
                </p>
              </div>
            </div>
          )}

          {/* VIDEO Campaign - Read Only Message */}
          {formData.campaign_type === "VIDEO" && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-[13px] font-semibold text-yellow-800 mb-1">
                    Video Campaigns Cannot Be Created via API
                  </h4>
                  <p className="text-[12px] text-yellow-700">
                    VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-[13px] text-red-700">
              {(() => {
                try {
                  const parsed = JSON.parse(submitError);
                  return parsed.message || submitError;
                } catch {
                  return submitError;
                }
              })()}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="create-entity-button font-semibold text-[11.2px]"
            disabled={loading}
          >
            {loading ? (mode === "edit" ? "Updating..." : "Creating...") : (mode === "edit" ? "Update Campaign" : "Create Campaign")}
          </button>
        </div>
      </form>
    </div>
  );
};

