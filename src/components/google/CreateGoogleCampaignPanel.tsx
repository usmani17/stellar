// CreateGoogleCampaignPanel - Refactored version using modular components
// Original file backed up as CreateGoogleCampaignPanel.old.tsx

import React, { useState, useEffect, useCallback } from "react";
import { campaignsService } from "../../services/campaigns";
import { accountsService } from "../../services/accounts";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import {
  BaseGoogleCampaignForm,
  GoogleVideoCampaignForm,
  GoogleShoppingCampaignForm,
  GoogleDisplayCampaignForm,
  GoogleSearchCampaignForm,
  GooglePerformanceMaxCampaignForm,
  GoogleDemandGenCampaignForm,
  GoogleTrackingTemplateForm,
  type CreateGoogleCampaignPanelProps,
  type CreateGoogleCampaignData,
} from "./campaigns/index";
import {
  getAvailableBiddingStrategies,
  getDefaultBiddingStrategy,
  formatDate,
  formatDateForName,
} from "./campaigns/utils";
import { SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION } from "./CreateGooglePmaxAssetGroupPanel";
import { GoogleConversionActionSelectorModal } from "./GoogleConversionActionSelectorModal";
import { type GoogleConversionAction } from "../../services/googleAdwords/googleAdwordsConversionActions";

export const CreateGoogleCampaignPanel: React.FC<CreateGoogleCampaignPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
  channelId,
  loading = false,
  submitError = null,
  mode = "create",
  initialData = null,
  campaignId,
  refreshMessage = null,
  hideProfileSelector = false,
  hideCampaignType = false,
  onPublishDraft,
}) => {
  const [showRefreshDetails, setShowRefreshDetails] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [marketingImagePreview, setMarketingImagePreview] = useState<string | null>(null);
  const [squareMarketingImagePreview, setSquareMarketingImagePreview] = useState<string | null>(null);
  // Location targeting state
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string; id: string; type: string; countryCode: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Language targeting state
  const [languageOptions, setLanguageOptions] = useState<Array<{ value: string; label: string; id: string }>>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  
  // Conversion action state
  const [selectedConversionActions, setSelectedConversionActions] = useState<Array<{ id: string; name: string }>>([]);
  const [conversionActionModalOpen, setConversionActionModalOpen] = useState(false);
  
  // Profile selection state
  const [googleProfiles, setGoogleProfiles] = useState<Array<{ value: string; label: string; customer_id: string; customer_id_raw: string; currency_code?: string }>>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  
  // Budget selection state
  const [budgetOptions, setBudgetOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [useCustomBudgetName, setUseCustomBudgetName] = useState(false);
  const [formData, setFormData] = useState<CreateGoogleCampaignData>({
    campaign_type: "SEARCH",
    name: "",
    budget_amount: undefined,
    budget_name: "",
    status: "PAUSED",
    bidding_strategy_type: "MANUAL_CPC", // Default for Search
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
  const [publishLoading, setPublishLoading] = useState(false);

  // Scroll to first error field when errors are set
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      // Find the first error field
      const firstErrorField = Object.keys(errors)[0] as keyof CreateGoogleCampaignData;
      
      // Try multiple selectors to find the field
      let fieldElement: HTMLElement | null = null;
      
      // First try: input/select with name attribute
      const inputSelector = `input[name="${firstErrorField}"]`;
      const selectSelector = `select[name="${firstErrorField}"]`;
      const textareaSelector = `textarea[name="${firstErrorField}"]`;
      fieldElement = document.querySelector(inputSelector) as HTMLElement ||
                    document.querySelector(selectSelector) as HTMLElement ||
                    document.querySelector(textareaSelector) as HTMLElement;
      
      // Second try: element with data-field attribute
      if (!fieldElement) {
        fieldElement = document.querySelector(
          `[data-field="${firstErrorField}"]`
        ) as HTMLElement;
      }
      
      // Third try: find by label text (for fields like campaign_type in dropdown)
      if (!fieldElement) {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(l => {
          const text = l.textContent?.toLowerCase() || '';
          const fieldName = firstErrorField.toLowerCase().replace(/_/g, ' ');
          return text.includes(fieldName) || text.includes(firstErrorField.toLowerCase());
        });
        if (label) {
          // Find the associated input/select
          const inputId = label.getAttribute('for');
          if (inputId) {
            const found = document.getElementById(inputId);
            if (found) fieldElement = found as HTMLElement;
          } else {
            // Try to find input/select next to the label
            const nextSibling = label.nextElementSibling?.querySelector('input, select, textarea');
            if (nextSibling) {
              fieldElement = nextSibling as HTMLElement;
            } else {
              const parentInput = label.parentElement?.querySelector('input, select, textarea');
              if (parentInput) fieldElement = parentInput as HTMLElement;
            }
          }
        }
      }
      
      if (fieldElement) {
        // Scroll to the field with smooth behavior
        setTimeout(() => {
          fieldElement?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Focus the field if it's an input
          if (fieldElement instanceof HTMLInputElement || 
              fieldElement instanceof HTMLSelectElement || 
              fieldElement instanceof HTMLTextAreaElement) {
            fieldElement.focus();
          }
        }, 100);
      } else {
        // Fallback: scroll to first error message
        const firstErrorMsg = document.querySelector('.text-red-500');
        if (firstErrorMsg) {
          setTimeout(() => {
            firstErrorMsg.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 100);
        }
      }
    }
  }, [errors]);

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
      if (!isOpen || !accountId || !channelId) {
        return;
      }

      setLoadingProfiles(true);
      setProfilesError(null);

      try {
        const accountIdNum = parseInt(accountId, 10);
        const channelIdNum = parseInt(channelId, 10);
        if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
          setProfilesError("Invalid account ID or channel ID");
          setLoadingProfiles(false);
          return;
        }

        // Get profiles for the specified Google channel - backend filters to only selected profiles
        const profilesData = await accountsService.getGoogleProfiles(channelIdNum, true);
        const allProfiles = profilesData.profiles || [];
        
        const profiles = allProfiles.map((profile: any) => {
          const customerIdRaw = profile.customer_id_raw || profile.customer_id?.replace(/-/g, '') || '';
          const customerIdFormatted = profile.customer_id || customerIdRaw;
          const profileName = profile.name || customerIdFormatted;
          
          return {
            value: String(profile.id), // Use profile.id as value (backend expects profile_id)
            label: `${profileName} (${customerIdFormatted})${profile.is_manager ? ' - Manager' : ''}`,
            customer_id: customerIdFormatted,
            customer_id_raw: customerIdRaw,
            profile_id: profile.id, // Include profile ID for API calls
            currency_code: profile.currency_code || undefined,
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
  }, [isOpen, accountId, channelId, selectedProfileId]);

  // Function to fetch budgets
  const fetchBudgets = useCallback(async () => {
    if (!accountId || !channelId || !selectedProfileId) {
      setBudgetOptions([]);
      return;
    }

    setLoadingBudgets(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid accountId or channelId");
      }
      const budgets = await googleAdwordsCampaignsService.getGoogleBudgets(accountIdNum, channelIdNum, selectedProfileId);
      
      // Format budgets for dropdown: value=resource_name for linking, name for display
      const options = budgets.map((budget: any) => ({
        value: budget.resource_name,
        label: `${budget.name} ($${budget.amount_dollars?.toFixed(2) || '0.00'})`,
        name: budget.name,
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
  }, [accountId, channelId, selectedProfileId]);

  // Fetch budgets when account, channel, and profile are available
  useEffect(() => {
    if (isOpen && accountId && channelId && selectedProfileId) {
      fetchBudgets();
    }
  }, [isOpen, accountId, channelId, selectedProfileId, fetchBudgets]);

  // Set selectedProfileId from initialData in edit/create mode when profiles are loaded
  useEffect(() => {
    if (googleProfiles.length === 0 || selectedProfileId) return;
    if (mode === "edit" && initialData?.customer_id) {
      const matchingProfile = googleProfiles.find(p => {
        return p.customer_id === initialData.customer_id ||
               p.customer_id_raw === initialData.customer_id?.replace(/-/g, '') ||
               p.value === initialData.customer_id?.replace(/-/g, '');
      });
      if (matchingProfile) setSelectedProfileId(matchingProfile.value);
    } else if (mode === "create" && initialData?.profile_id) {
      const profileIdStr = String(initialData.profile_id).trim();
      const matchingProfile = googleProfiles.find(p => p.value === profileIdStr);
      if (matchingProfile) setSelectedProfileId(matchingProfile.value);
    }
  }, [mode, initialData, googleProfiles, selectedProfileId]);

  // Update customer_id when profile changes
  useEffect(() => {
    if (selectedProfileId) {
      const selectedProfile = googleProfiles.find(p => p.value === selectedProfileId);
      if (selectedProfile) {
        setFormData((prev) => ({
          ...prev,
          customer_id: selectedProfile.customer_id,
        }));
      }
    }
  }, [selectedProfileId, googleProfiles]);

  // Function to fetch location targets (loads initial set, Dropdown handles filtering)
  const fetchLocations = useCallback(async () => {
    if (
      !accountId ||
      (formData.campaign_type !== "SHOPPING" &&
        formData.campaign_type !== "SEARCH" &&
        formData.campaign_type !== "PERFORMANCE_MAX") ||
      !selectedProfileId
    ) {
      // Only clear location options, not language options (they're managed separately)
      if (formData.campaign_type !== "SHOPPING" &&
          formData.campaign_type !== "SEARCH" &&
          formData.campaign_type !== "PERFORMANCE_MAX") {
        setLocationOptions([]);
      }
      return;
    }

    setLoadingLocations(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      // For SEARCH campaigns, use undefined country code (or could use a default like "US")
      // For SHOPPING campaigns, use sales_country
      const countryCode = formData.campaign_type === "SHOPPING" ? (formData.sales_country || undefined) : undefined;
      // Load up to 200 locations initially - Dropdown will filter them client-side
      const locations = await campaignsService.getGoogleGeoTargetConstants(
        accountIdNum,
        channelIdNum,
        selectedProfileId,
        undefined, // No search query - load common locations
        countryCode
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
  }, [accountId, channelId, formData.campaign_type, formData.sales_country, selectedProfileId]);

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
    // Languages are selectable for SEARCH, PERFORMANCE_MAX, and SHOPPING campaigns
    if (
      !accountId ||
      (formData.campaign_type !== "SEARCH" && 
       formData.campaign_type !== "PERFORMANCE_MAX" && 
       formData.campaign_type !== "SHOPPING") ||
      !selectedProfileId
    ) {
      setLanguageOptions([]);
      return;
    }

    setLoadingLanguages(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const languages = await campaignsService.getGoogleLanguageConstants(
        accountIdNum,
        channelIdNum,
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
  }, [accountId, channelId, formData.campaign_type, selectedProfileId]);

  // Fetch languages when SEARCH / PERFORMANCE_MAX / SHOPPING campaign is selected
  useEffect(() => {
    if (
      isOpen &&
      (formData.campaign_type === "SEARCH" || 
       formData.campaign_type === "PERFORMANCE_MAX" || 
       formData.campaign_type === "SHOPPING") &&
      accountId &&
      selectedProfileId
    ) {
      fetchLanguages();
    } else {
      setLanguageOptions([]);
    }
  }, [isOpen, formData.campaign_type, accountId, selectedProfileId, fetchLanguages]);

  // Reset form when panel closes or load initial data when in edit/create mode
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else if ((mode === "edit" || mode === "create") && initialData) {
      // Convert micros to dollars for bidding strategy fields
      const convertedData = {
        ...initialData,
        // Convert micro amounts to dollars
        target_cpa_micros: initialData.target_cpa_micros ? initialData.target_cpa_micros / 1000000 : undefined,
        target_spend_micros: initialData.target_spend_micros ? initialData.target_spend_micros / 1000000 : undefined,
        target_impression_share_location_fraction_micros: initialData.target_impression_share_location_fraction_micros 
          ? initialData.target_impression_share_location_fraction_micros / 10000 
          : undefined,
        target_impression_share_cpc_bid_ceiling_micros: initialData.target_impression_share_cpc_bid_ceiling_micros 
          ? initialData.target_impression_share_cpc_bid_ceiling_micros / 1000000 
          : undefined,
      };
      
      // Load initial data for edit mode
      setFormData((prev) => ({
        ...prev,
        ...convertedData,
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
      campaign_type: "SEARCH",
      name: "",
      budget_amount: undefined,
      budget_name: "",
      status: "PAUSED",
      bidding_strategy_type: "MANUAL_CPC", // Default for Search
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
        
        // Initialize channel controls and long_headlines for Demand Gen
        if (value === "DEMAND_GEN") {
          if (!updated.channel_controls) {
            updated.channel_controls = {
              gmail: true,
              discover: true,
              display: true,
              youtube_in_feed: true,
              youtube_in_stream: true,
              youtube_shorts: true,
            };
          }
          if (!updated.long_headlines || updated.long_headlines.length === 0) {
            updated.long_headlines = [""];
          }
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
        
        // Initialize network settings for Search (defaults, but user can change)
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

  const addLongHeadline = () => {
    const cur = formData.long_headlines || [""];
    if (cur.length < 5) {
      setFormData((prev) => ({ ...prev, long_headlines: [...(prev.long_headlines || [""]), ""] }));
    }
  };

  const removeLongHeadline = (index: number) => {
    const cur = formData.long_headlines || [""];
    if (cur.length > 1) {
      const next = cur.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, long_headlines: next }));
    }
  };

  const updateLongHeadline = (index: number, value: string) => {
    const cur = formData.long_headlines || [""];
    const next = [...cur];
    if (next[index] !== undefined) next[index] = value;
    else next[index] = value;
    setFormData((prev) => ({ ...prev, long_headlines: next }));
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

      // Location targeting is optional for PERFORMANCE_MAX campaigns

      // Language targeting is optional for PERFORMANCE_MAX campaigns

      // Brand Guidelines requires business_name and logo_url (square logo) for Performance Max campaigns
      if (!formData.business_name?.trim()) {
        newErrors.business_name = "Business name is required for Performance Max campaigns with Brand Guidelines enabled";
      }

      if (!formData.logo_url?.trim() || formData.logo_url === 'https://example.com') {
        newErrors.logo_url = "Square logo URL is required for Performance Max campaigns with Brand Guidelines enabled. Must be 1:1 aspect ratio.";
      } else if (!/^https?:\/\/.+/.test(formData.logo_url)) {
        newErrors.logo_url = "Logo URL must be a valid URL (http:// or https://)";
      }

      // final_url is optional for Performance Max campaigns - no validation needed

      // Only validate asset group fields if SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION is true
      if (SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION) {
        if (!formData.asset_group_name?.trim()) {
          newErrors.asset_group_name = "Asset Group Name is required";
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

        // Marketing image URLs are required for Performance Max
        if (!formData.marketing_image_url?.trim() || formData.marketing_image_url === 'https://example.com') {
          newErrors.marketing_image_url = "Marketing Image URL is required. Backend will not generate defaults.";
        } else if (!/^https?:\/\/.+/.test(formData.marketing_image_url)) {
          newErrors.marketing_image_url = "Marketing Image URL must be a valid URL (http:// or https://)";
        }

        if (!formData.square_marketing_image_url?.trim() || formData.square_marketing_image_url === 'https://example.com') {
          newErrors.square_marketing_image_url = "Square Marketing Image URL is required. Backend will not generate defaults.";
        } else if (!/^https?:\/\/.+/.test(formData.square_marketing_image_url)) {
          newErrors.square_marketing_image_url = "Square Marketing Image URL must be a valid URL (http:// or https://)";
        }
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
      // Language targeting is optional for SEARCH campaigns
      // No validation required for languages
    } else if (formData.campaign_type === "VIDEO") {
      // VIDEO campaigns cannot be created via API
      newErrors.campaign_type = "VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.";
    } else if (formData.campaign_type === "DEMAND_GEN") {
      if (!selectedProfileId) {
        newErrors.customer_id = "Please select a Google Ads account first";
      }
      // Demand Gen validation
      if (!formData.final_url?.trim()) {
        newErrors.final_url = "Final URL is required";
      } else if (!/^https?:\/\/.+/.test(formData.final_url)) {
        newErrors.final_url = "Final URL must be a valid URL (http:// or https://)";
      } else if (/^https?:\/\/example\.com(\/|$)/i.test(formData.final_url.trim())) {
        newErrors.final_url = "Use a real, working landing page URL. Google Ads rejects example.com (policy: DESTINATION_NOT_WORKING).";
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

      const longHeadlinesSource = (formData.long_headlines || []).length
        ? (formData.long_headlines || []).filter((h) => h && String(h).trim())
        : formData.long_headline?.trim()
          ? [formData.long_headline.trim()]
          : [];
      if (longHeadlinesSource.length < 1) {
        newErrors.long_headlines = "At least 1 long headline is required for Demand Gen (In-Feed placements). Max 90 characters each.";
      } else if (longHeadlinesSource.length > 5) {
        newErrors.long_headlines = "Maximum 5 long headlines allowed";
      } else {
        const over = longHeadlinesSource.find((h) => String(h).length > 90);
        if (over !== undefined) {
          newErrors.long_headlines = "Each long headline must be 90 characters or less";
        }
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
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      console.log("Validation failed with errors:", newErrors);
    }
    return isValid;
  };

  /** Build submit payload after validation. Returns null if validation fails. */
  const buildSubmitPayload = (): CreateGoogleCampaignData | null => {
    if (formData.campaign_type === "VIDEO") {
      setErrors({
        campaign_type: "VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.",
      });
      return null;
    }
    const validationResult = validate();
    if (!validationResult) {
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 0);
      return null;
    }
    // Filter out empty headlines and descriptions, and align asset ID arrays
    let filteredHeadlines: string[] | undefined;
    let filteredHeadlineAssetIds: (string | undefined)[] | undefined;
    let filteredHeadlineAssetResourceNames: (string | undefined)[] | undefined;
    
    if (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN") {
      const headlines = (formData.headlines || []).filter((h) => h.trim());
      const headlineAssetIds = formData.headline_asset_ids || [];
      const headlineAssetResourceNames = formData.headline_asset_resource_names || [];
      
      // Filter asset IDs to match filtered headlines (duplicates are prevented at selection time)
      filteredHeadlines = headlines;
      filteredHeadlineAssetIds = headlines.map((_, index) => headlineAssetIds[index]);
      filteredHeadlineAssetResourceNames = headlines.map((_, index) => headlineAssetResourceNames[index]);
    }
    
    let filteredDescriptions: string[] | undefined;
    let filteredDescriptionAssetIds: (string | undefined)[] | undefined;
    let filteredDescriptionAssetResourceNames: (string | undefined)[] | undefined;
    
    if (formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "DEMAND_GEN") {
      const descriptions = (formData.descriptions || []).filter((d) => d.trim());
      const descriptionAssetIds = formData.description_asset_ids || [];
      const descriptionAssetResourceNames = formData.description_asset_resource_names || [];
      
      // Filter asset IDs to match filtered descriptions (duplicates are prevented at selection time)
      filteredDescriptions = descriptions;
      filteredDescriptionAssetIds = descriptions.map((_, index) => descriptionAssetIds[index]);
      filteredDescriptionAssetResourceNames = descriptions.map((_, index) => descriptionAssetResourceNames[index]);
    }
    
    const payload: CreateGoogleCampaignData = {
      ...formData,
      profile_id: selectedProfileId || undefined,
      headlines: filteredHeadlines,
      descriptions: filteredDescriptions,
      // Keep arrays aligned with headlines/descriptions
      headline_asset_ids: filteredHeadlineAssetIds,
      headline_asset_resource_names: filteredHeadlineAssetResourceNames,
      description_asset_ids: filteredDescriptionAssetIds,
      description_asset_resource_names: filteredDescriptionAssetResourceNames,
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
      // Include location_ids for SEARCH, PERFORMANCE_MAX, and SHOPPING campaigns
      location_ids: (formData.campaign_type === "SEARCH" || formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "SHOPPING") 
        ? (formData.location_ids && formData.location_ids.length > 0 ? formData.location_ids : undefined)
        : undefined,
      // Include excluded_location_ids for SEARCH, PERFORMANCE_MAX, and SHOPPING campaigns
      excluded_location_ids: (formData.campaign_type === "SEARCH" || formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "SHOPPING")
        ? (formData.excluded_location_ids && formData.excluded_location_ids.length > 0 ? formData.excluded_location_ids : undefined)
        : undefined,
      // Include language_ids for SEARCH, PERFORMANCE_MAX, and SHOPPING campaigns
      language_ids: (formData.campaign_type === "SEARCH" || formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "SHOPPING")
        ? (formData.language_ids && formData.language_ids.length > 0 ? formData.language_ids : undefined)
        : undefined,
      // Include device_ids for SEARCH, PERFORMANCE_MAX, and SHOPPING campaigns
      device_ids: (formData.campaign_type === "SEARCH" || formData.campaign_type === "PERFORMANCE_MAX" || formData.campaign_type === "SHOPPING")
        ? (formData.device_ids && formData.device_ids.length > 0 ? formData.device_ids : undefined)
        : undefined,
      // Include network_settings for SHOPPING campaigns
      network_settings: formData.campaign_type === "SHOPPING" && formData.network_settings
        ? formData.network_settings
        : (formData.campaign_type === "SEARCH" || formData.campaign_type === "DISPLAY") && formData.network_settings
        ? formData.network_settings
        : undefined,
      // Brand Guidelines required fields for Performance Max campaigns - always include if campaign type is PERFORMANCE_MAX
      ...(formData.campaign_type === "PERFORMANCE_MAX" ? {
        business_name: formData.business_name?.trim() || formData.business_name,
        business_name_asset_id: formData.business_name_asset_id,
        business_name_asset_resource_name: formData.business_name_asset_resource_name,
        logo_url: formData.logo_url && formData.logo_url !== 'https://example.com' ? formData.logo_url.trim() : formData.logo_url,
        logo_asset_resource_name: formData.logo_asset_resource_name,
        logo_asset_id: formData.logo_asset_id,
      } : {}),
      // language_codes is kept for backward compatibility but language_ids is the primary field
      language_codes: formData.campaign_type === "SEARCH" && formData.language_ids && formData.language_ids.length > 0 ? undefined : formData.language_codes,
      conversion_action_ids: formData.campaign_type === "SEARCH" && formData.conversion_action_ids?.length ? formData.conversion_action_ids : undefined,
      // For Demand Gen, ensure only one of video_url or video_id is sent
      video_url: formData.campaign_type === "DEMAND_GEN" && formData.video_url?.trim() ? formData.video_url : undefined,
      video_id: formData.campaign_type === "DEMAND_GEN" && formData.video_id?.trim() ? formData.video_id : undefined,
      long_headlines:
        formData.campaign_type === "DEMAND_GEN"
          ? (formData.long_headlines && formData.long_headlines.length
              ? (formData.long_headlines || []).filter((h) => h && String(h).trim()).map((h) => String(h).trim().slice(0, 90))
              : formData.long_headline?.trim()
                ? [String(formData.long_headline).trim().slice(0, 90)]
                : undefined)
          : undefined,
      // Convert dollars back to micros for bidding strategy fields
      target_cpa_micros: formData.target_cpa_micros ? Math.round(formData.target_cpa_micros * 1000000) : undefined,
      target_spend_micros: formData.target_spend_micros ? Math.round(formData.target_spend_micros * 1000000) : undefined,
      target_impression_share_location_fraction_micros: formData.target_impression_share_location_fraction_micros 
        ? Math.round(formData.target_impression_share_location_fraction_micros * 10000) 
        : undefined,
      target_impression_share_cpc_bid_ceiling_micros: formData.target_impression_share_cpc_bid_ceiling_micros 
        ? Math.round(formData.target_impression_share_cpc_bid_ceiling_micros * 1000000) 
        : undefined,
    };
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit called", { mode, formData, loading });
    const payload = buildSubmitPayload();
    if (!payload) return;
    console.log("Validation passed, proceeding with submit");
    try {
      await onSubmit(payload);
      console.log("onSubmit completed successfully");
      resetForm();
      setErrors({});
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      throw error;
    }
  };

  const handleSaveAsDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildSubmitPayload();
    if (!payload) return;
    try {
      await onSubmit(payload, { saveAsDraft: true });
      resetForm();
      setErrors({});
    } catch (error: any) {
      console.error("Error in handleSaveAsDraft:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Handle conversion action selection
  const handleConversionActionsSelect = (conversionActions: GoogleConversionAction[]) => {
    const ids = conversionActions.map(ca => ca.id);
    const selected = conversionActions.map(ca => ({ id: ca.id, name: ca.name }));
    handleChange("conversion_action_ids", ids);
    setSelectedConversionActions(selected);
    setConversionActionModalOpen(false);
  };

  // Quick fill functions for testing
  const quickFillPerformanceMax = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    const marketingImageUrl = "https://placehold.co/1200x628/png";
    const squareMarketingImageUrl = "https://placehold.co/512x512/png";
    const logoUrl = "https://placehold.co/128x128/png";
    
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
      logo_url: logoUrl, // 128x128 PNG placeholder logo
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
      marketing_image_url: marketingImageUrl,
      square_marketing_image_url: squareMarketingImageUrl,
      long_headlines: ["Transform Your Business with Our Expert Software Solutions"],
      asset_group_name: `PMAX Asset Group - ${dateStr}`,
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
      // Device Targeting - Enable all devices for testing
      device_ids: ["MOBILE", "DESKTOP", "TABLET", "CONNECTED_TV"],
      // Location Targeting - Will be populated when locations are loaded
      location_ids: undefined,
      excluded_location_ids: undefined,
      // Language Targeting - Will be populated when languages are loaded
      language_ids: undefined,
      // Campaign URL options
      tracking_url_template: "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}",
      final_url_suffix: "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}",
      url_custom_parameters: [
        { key: "campaign", value: "pmax_test" },
        { key: "source", value: "google_ads" }
      ],
    });
    
    // Set previews for images
    setLogoPreview(logoUrl);
    setMarketingImagePreview(marketingImageUrl);
    setSquareMarketingImagePreview(squareMarketingImageUrl);
    
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
      // Network Settings - Enable all for testing
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: true,
        target_partner_search_network: true,
      },
      // Device Targeting - Enable all devices for testing
      device_ids: ["MOBILE", "DESKTOP", "TABLET", "CONNECTED_TV"],
      // Location Targeting - Will be populated when locations are loaded
      location_ids: undefined,
      excluded_location_ids: undefined,
      // Language Targeting - Will be populated when languages are loaded
      language_ids: undefined,
      // Campaign URL options
      tracking_url_template: "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}",
      final_url_suffix: "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}",
      url_custom_parameters: [
        { key: "campaign", value: "shopping_test" },
        { key: "source", value: "google_ads" }
      ],
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
      // Network Settings - Enable all for testing
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: true,
        target_partner_search_network: true,
      },
      // Device Targeting - Enable all devices for testing
      device_ids: ["MOBILE", "DESKTOP", "TABLET", "CONNECTED_TV"],
      // Location Targeting - Will be populated when locations are loaded
      location_ids: undefined,
      excluded_location_ids: undefined,
      // Language Targeting - Will be populated when languages are loaded
      language_ids: undefined,
      language_codes: ["en"], // English (fallback)
      conversion_action_ids: [],
      // Campaign URL options
      tracking_url_template: "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}",
      final_url_suffix: "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}",
      url_custom_parameters: [
        { key: "campaign", value: "search_test" },
        { key: "source", value: "google_ads" }
      ],
    });
    setErrors({});
  };

  const quickFillDemandGen = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    const endDate = new Date(today);
    endDate.setFullYear(today.getFullYear() + 1);

    setFormData({
      campaign_type: "DEMAND_GEN",
      name: `Demand Gen YouTube - ${dateStr}`,
      budget_amount: 20,
      budget_name: "Demand Gen Budget",
      status: "PAUSED",
      bidding_strategy_type: "MAXIMIZE_CONVERSIONS",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      final_url: "https://techesthete.com/",
      business_name: "Educational Videos",
      logo_url: "https://placehold.co/128x128/png",
      headlines: ["Django", "Django MVT", "Python framework"],
      descriptions: ["Python is a backend language", "Python helps in building AI application"],
      long_headlines: ["Discover Test Excellence", "Ultimate guide to learn python"],
      video_id: "LHkZpjnXOH8",
      video_url: "",
      ad_group_name: "Django tutorials",
      ad_name: "Django instructor - education",
      channel_controls: {
        gmail: false,
        discover: false,
        display: false,
        youtube_in_feed: true,
        youtube_in_stream: true,
        youtube_shorts: true,
      },
      tracking_url_template: "",
      final_url_suffix: "",
      url_custom_parameters: [],
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
      headline_asset_ids: [undefined, undefined, undefined],
      headline_asset_resource_names: [undefined, undefined, undefined],
      description_asset_ids: [undefined, undefined],
      description_asset_resource_names: [undefined, undefined],
    });
    setLogoPreview("https://placehold.co/128x128/png");
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

          {/* Base Form - Common Fields */}
          <BaseGoogleCampaignForm
            formData={formData}
            errors={errors}
            onChange={handleChange}
            mode={mode}
            googleProfiles={googleProfiles}
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            loadingProfiles={loadingProfiles}
            profilesError={profilesError}
            budgetOptions={budgetOptions}
            selectedBudgetId={selectedBudgetId}
            setSelectedBudgetId={setSelectedBudgetId}
            useCustomBudgetName={useCustomBudgetName}
            setUseCustomBudgetName={setUseCustomBudgetName}
            loadingBudgets={loadingBudgets}
            onQuickFillPerformanceMax={quickFillPerformanceMax}
            onQuickFillShopping={quickFillShopping}
            onQuickFillSearch={quickFillSearch}
            onQuickFillDemandGen={quickFillDemandGen}
            hideProfileSelector={hideProfileSelector}
            hideCampaignType={hideCampaignType}
          />

          {/* Campaign Type Specific Components */}
          {formData.campaign_type === "PERFORMANCE_MAX" && (
            <GooglePerformanceMaxCampaignForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode={mode}
              onAddHeadline={addHeadline}
              onRemoveHeadline={removeHeadline}
              onUpdateHeadline={updateHeadline}
              onAddDescription={addDescription}
              onRemoveDescription={removeDescription}
              onUpdateDescription={updateDescription}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              marketingImagePreview={marketingImagePreview}
              setMarketingImagePreview={setMarketingImagePreview}
              squareMarketingImagePreview={squareMarketingImagePreview}
              setSquareMarketingImagePreview={setSquareMarketingImagePreview}
              setErrors={setErrors}
              selectedProfileId={selectedProfileId}
              googleProfiles={googleProfiles}
              languageOptions={languageOptions}
              loadingLanguages={loadingLanguages}
              locationOptions={locationOptions}
              loadingLocations={loadingLocations}
              onLocationIdsChange={(ids) => handleChange("location_ids", ids)}
              onExcludedLocationIdsChange={(ids) => handleChange("excluded_location_ids", ids)}
              trackingUrlTemplate={formData.tracking_url_template}
              finalUrlSuffix={formData.final_url_suffix}
              urlCustomParameters={formData.url_custom_parameters}
              onTrackingUrlTemplateChange={(value) => handleChange("tracking_url_template", value)}
              onFinalUrlSuffixChange={(value) => handleChange("final_url_suffix", value)}
              onCustomParametersChange={(params) => handleChange("url_custom_parameters", params)}
            />
          )}

          {formData.campaign_type === "SHOPPING" && (
            <GoogleShoppingCampaignForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode={mode}
              accountId={accountId}
              channelId={channelId}
              selectedProfileId={selectedProfileId}
              isOpen={isOpen}
              languageOptions={languageOptions}
              loadingLanguages={loadingLanguages}
              locationOptions={locationOptions}
              loadingLocations={loadingLocations}
              onLocationIdsChange={(ids) => handleChange("location_ids", ids)}
              onExcludedLocationIdsChange={(ids) => handleChange("excluded_location_ids", ids)}
              trackingUrlTemplate={formData.tracking_url_template}
              finalUrlSuffix={formData.final_url_suffix}
              urlCustomParameters={formData.url_custom_parameters}
              onTrackingUrlTemplateChange={(value) => handleChange("tracking_url_template", value)}
              onFinalUrlSuffixChange={(value) => handleChange("final_url_suffix", value)}
              onCustomParametersChange={(params) => handleChange("url_custom_parameters", params)}
            />
          )}

          {formData.campaign_type === "SEARCH" && (
            <GoogleSearchCampaignForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode={mode}
              languageOptions={languageOptions}
              loadingLanguages={loadingLanguages}
              locationOptions={locationOptions}
              loadingLocations={loadingLocations}
              onLocationIdsChange={(ids) => handleChange("location_ids", ids)}
              onExcludedLocationIdsChange={(ids) => handleChange("excluded_location_ids", ids)}
              trackingUrlTemplate={formData.tracking_url_template}
              finalUrlSuffix={formData.final_url_suffix}
              urlCustomParameters={formData.url_custom_parameters}
              onTrackingUrlTemplateChange={(value) => handleChange("tracking_url_template", value)}
              onFinalUrlSuffixChange={(value) => handleChange("final_url_suffix", value)}
              onCustomParametersChange={(params) => handleChange("url_custom_parameters", params)}
              selectedConversionActions={selectedConversionActions}
              onSelectConversionActionsClick={() => setConversionActionModalOpen(true)}
            />
          )}

          {formData.campaign_type === "DEMAND_GEN" && (
            <GoogleDemandGenCampaignForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode={mode}
              onAddHeadline={addHeadline}
              onRemoveHeadline={removeHeadline}
              onUpdateHeadline={updateHeadline}
              onAddDescription={addDescription}
              onRemoveDescription={removeDescription}
              onUpdateDescription={updateDescription}
              onAddLongHeadline={addLongHeadline}
              onRemoveLongHeadline={removeLongHeadline}
              onUpdateLongHeadline={updateLongHeadline}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              selectedProfileId={selectedProfileId}
              googleProfiles={googleProfiles}
              onFillTest={quickFillDemandGen}
            />
          )}

          {formData.campaign_type === "DISPLAY" && (
            <GoogleDisplayCampaignForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode={mode}
            />
          )}

          {formData.campaign_type === "VIDEO" && (
            <GoogleVideoCampaignForm />
          )}

          {/* Campaign URL options - Only for non-SEARCH/SHOPPING/PERFORMANCE_MAX campaigns (they have it in tabs) */}
          {formData.campaign_type !== "VIDEO" &&
           formData.campaign_type !== "SEARCH" &&
           formData.campaign_type !== "SHOPPING" &&
           formData.campaign_type !== "PERFORMANCE_MAX" && (
            <GoogleTrackingTemplateForm
              trackingUrlTemplate={formData.tracking_url_template}
              finalUrlSuffix={formData.final_url_suffix}
              urlCustomParameters={formData.url_custom_parameters}
              onTrackingUrlTemplateChange={(value) => handleChange("tracking_url_template", value)}
              onFinalUrlSuffixChange={(value) => handleChange("final_url_suffix", value)}
              onCustomParametersChange={(params) => handleChange("url_custom_parameters", params)}
              title="Campaign URL options"
            />
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
            disabled={loading || publishLoading}
          >
            Cancel
          </button>
          {mode === "edit" && campaignId && String(campaignId).startsWith("draft-") && onPublishDraft && (
            <button
              type="button"
              onClick={async () => {
                setPublishLoading(true);
                try {
                  await onPublishDraft(formData);
                } finally {
                  setPublishLoading(false);
                }
              }}
              className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2 bg-[#136D6D] hover:bg-[#0f5a5a] text-white px-4 py-2 rounded-lg"
              disabled={loading || publishLoading}
            >
              {publishLoading && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {publishLoading ? "Publishing..." : "Publish"}
            </button>
          )}
          {mode === "create" && (
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className="cancel-button font-semibold text-[11.2px] flex items-center gap-2"
              disabled={loading || publishLoading}
            >
              Save as Draft
            </button>
          )}
          <button
            type="submit"
            className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
            disabled={loading || publishLoading}
          >
            {loading && (
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
            {loading ? (mode === "edit" ? "Updating..." : "Creating...") : (mode === "edit" ? "Update Campaign" : "Create Campaign")}
          </button>
        </div>
      </form>

      {/* Conversion Action Selector Modal */}
      {selectedProfileId && accountId != null && channelId != null && (
        <GoogleConversionActionSelectorModal
          isOpen={conversionActionModalOpen}
          onClose={() => setConversionActionModalOpen(false)}
          onSelect={handleConversionActionsSelect}
          accountId={Number(accountId)}
          channelId={Number(channelId)}
          profileId={parseInt(selectedProfileId)}
          selectedIds={formData.conversion_action_ids || []}
          profileCurrencyCode={googleProfiles.find((p) => p.value === selectedProfileId)?.currency_code}
        />
      )}
    </div>
  );
};

// Export types for backward compatibility
export type { CreateGoogleCampaignPanelProps, CreateGoogleCampaignData, RefreshMessage } from "./campaigns/index";
