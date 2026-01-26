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
  GoogleLocationTargetingForm,
  GoogleLanguageTargetingForm,
  type CreateGoogleCampaignPanelProps,
  type CreateGoogleCampaignData,
} from "./campaigns/index";
import {
  getAvailableBiddingStrategies,
  getDefaultBiddingStrategy,
  formatDate,
  formatDateForName,
} from "./campaigns/utils";

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
    campaign_type: "SEARCH",
    name: "",
    budget_amount: 0,
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
            profile_id: profile.id, // Include profile ID for asset API calls
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
  }, [isOpen, accountId, selectedProfileId]);

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
      campaign_type: "SEARCH",
      name: "",
      budget_amount: 0,
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

      if (!formData.asset_group_name?.trim()) {
        newErrors.asset_group_name = "Asset Group Name is required";
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
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      console.log("Validation failed with errors:", newErrors);
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit called", { mode, formData, loading });

    // Prevent submission of VIDEO campaigns
    if (formData.campaign_type === "VIDEO") {
      setErrors({
        campaign_type: "VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.",
      });
      return;
    }

    const validationResult = validate();
    if (!validationResult) {
      // Get the current errors (they were just set by validate())
      // Use a small timeout to ensure state has updated, or check errors state
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 0);
      return;
    }

    console.log("Validation passed, proceeding with submit");

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
      language_ids: formData.campaign_type === "SEARCH" ? formData.language_ids : undefined,
      // language_codes is kept for backward compatibility but language_ids is the primary field
      language_codes: formData.campaign_type === "SEARCH" && formData.language_ids && formData.language_ids.length > 0 ? undefined : formData.language_codes,
      conversion_action_ids: formData.campaign_type === "SEARCH" && formData.conversion_action_ids?.length ? formData.conversion_action_ids : undefined,
      // For Demand Gen, ensure only one of video_url or video_id is sent
      video_url: formData.campaign_type === "DEMAND_GEN" && formData.video_url?.trim() ? formData.video_url : undefined,
      video_id: formData.campaign_type === "DEMAND_GEN" && formData.video_id?.trim() ? formData.video_id : undefined,
    };

    try {
      console.log("Calling onSubmit with payload", payload);
      await onSubmit(payload);
      console.log("onSubmit completed successfully");
      resetForm();
      setErrors({});
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      // Error handling is done in parent component, but log it here for debugging
      // Re-throw so parent can handle it
      throw error;
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Quick fill functions for testing
  const quickFillPerformanceMax = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    const marketingImageUrl = "https://placehold.co/1200x628";
    const squareMarketingImageUrl = "https://placehold.co/512x512";
    const logoUrl = "https://placehold.co/128x128";
    
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
      long_headline: "Transform Your Business with Our Expert Software Solutions",
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
            />
          )}

          {/* Language Targeting for PERFORMANCE_MAX campaigns */}
          {formData.campaign_type === "PERFORMANCE_MAX" && (
            <GoogleLanguageTargetingForm
              languageIds={formData.language_ids}
              languageOptions={languageOptions}
              loadingLanguages={loadingLanguages}
              onLanguageIdsChange={(ids: string[] | undefined) => handleChange("language_ids", ids)}
              errors={errors}
            />
          )}

          {formData.campaign_type === "SHOPPING" && (
            <GoogleShoppingCampaignForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode={mode}
              merchantAccountOptions={merchantAccountOptions}
              loadingMerchantAccounts={loadingMerchantAccounts}
              merchantAccountsError={merchantAccountsError}
              onFetchMerchantAccounts={fetchMerchantAccounts}
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
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
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

          {/* Location Targeting - Only for PERFORMANCE_MAX campaigns (SEARCH/SHOPPING have it in tabs) */}
          {formData.campaign_type === "PERFORMANCE_MAX" && (
            <GoogleLocationTargetingForm
              locationIds={formData.location_ids}
              excludedLocationIds={formData.excluded_location_ids}
              locationOptions={locationOptions}
              loadingLocations={loadingLocations}
              onLocationIdsChange={(ids) => handleChange("location_ids", ids)}
              onExcludedLocationIdsChange={(ids) => handleChange("excluded_location_ids", ids)}
              errors={errors}
            />
          )}

          {/* Campaign URL options - Only for non-SEARCH/SHOPPING campaigns (SEARCH/SHOPPING have it in tabs) */}
          {formData.campaign_type !== "VIDEO" &&
           formData.campaign_type !== "SEARCH" &&
           formData.campaign_type !== "SHOPPING" && (
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

// Export types for backward compatibility
export type { CreateGoogleCampaignPanelProps, CreateGoogleCampaignData, RefreshMessage } from "./campaigns/index";
