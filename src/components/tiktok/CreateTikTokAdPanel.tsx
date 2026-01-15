import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { campaignsService } from "../../services/campaigns";
import { Dropdown } from "../ui/Dropdown";

// Dropdown Options Constants
const AD_FORMAT_OPTIONS = [
    { value: "SINGLE_VIDEO", label: "Single Video" },
    { value: "SINGLE_IMAGE", label: "Single Image" },
    { value: "CAROUSEL_ADS", label: "Carousel" },
    { value: "CATALOG_CAROUSEL", label: "Catalog Carousel" },
    { value: "LIVE_CONTENT", label: "Live Content" },
];

const IDENTITY_TYPE_OPTIONS = [
    { value: "CUSTOMIZED_USER", label: "Customized User" },
    { value: "AUTH_CODE", label: "Auth Code" },
    { value: "TT_USER", label: "TikTok User" },
    { value: "BC_AUTH_TT", label: "Business Center Auth TikTok" },
];

const CALL_TO_ACTION_OPTIONS = [
    { value: "LEARN_MORE", label: "Learn More" },
    { value: "SHOP_NOW", label: "Shop Now" },
    { value: "SIGN_UP", label: "Sign Up" },
    { value: "CONTACT_US", label: "Contact Us" },
    { value: "APPLY_NOW", label: "Apply Now" },
    { value: "DOWNLOAD", label: "Download" },
    { value: "PLAY_GAME", label: "Play Game" },
    { value: "WATCH_MORE", label: "Watch More" },
    { value: "WATCH_LIVE", label: "Watch Live" },
];

const PRODUCT_SPECIFIC_TYPE_OPTIONS = [
    { value: "ALL", label: "All Products" },
    { value: "PRODUCT_SET", label: "Product Set" },
    { value: "CUSTOMIZED_PRODUCTS", label: "Customized Products" },
];

const VERTICAL_VIDEO_STRATEGY_OPTIONS = [
    { value: "UNSET", label: "Unset" },
    { value: "SINGLE_VIDEO", label: "Single Video" },
    { value: "CATALOG_VIDEOS", label: "Catalog Videos" },
    { value: "CATALOG_UPLOADED_VIDEOS", label: "Catalog Uploaded Videos" },
    { value: "LIVE_STREAM", label: "Live Stream" },
];

const CREATIVE_TYPE_OPTIONS = [
    { value: "SHORT_VIDEO_LIVE", label: "Short Video Live" },
    { value: "DIRECT_LIVE", label: "Direct Live" },
    { value: "CUSTOM_INSTANT_PAGE", label: "Custom Instant Page" },
];

const TIKTOK_PAGE_CATEGORY_OPTIONS = [
    { value: "TIKTOK_INSTANT_PAGE", label: "TikTok Instant Page" },
    { value: "OTHER_TIKTOK_PAGE", label: "Other TikTok Page" },
];

const DEEPLINK_FORMAT_TYPE_OPTIONS = [
    { value: "NORMAL", label: "Normal" },
    { value: "DEFERRED_DEEPLINK", label: "Deferred Deeplink" },
];

const FALLBACK_TYPE_OPTIONS = [
    { value: "APP_INSTALL", label: "App Install" },
    { value: "WEBSITE", label: "Website" },
];

const END_CARD_CTA_OPTIONS = [
    { value: "SEARCH_INVENTORY", label: "Search Inventory" },
    { value: "LEARN_MORE", label: "Learn More" },
    { value: "SHOP_NOW", label: "Shop Now" },
];

const DISCLAIMER_TYPE_OPTIONS = [
    { value: "EMISSION", label: "Emission" },
    { value: "DISCOUNT", label: "Discount" },
];

const ITEM_DUET_STATUS_OPTIONS = [
    { value: "ENABLE", label: "Enable" },
    { value: "DISABLE", label: "Disable" },
];

const ITEM_STITCH_STATUS_OPTIONS = [
    { value: "ENABLE", label: "Enable" },
    { value: "DISABLE", label: "Disable" },
];

export interface TikTokAdInput {
    adgroup_id: string;
    ad_name: string;
    ad_format: string;
    ad_text: string;
    identity_id: string;
    identity_type?: string;
    video_id?: string;
    image_ids?: string[];
    landing_page_url?: string;
    page_id?: string;
    call_to_action?: string;
    deeplink?: string;
    deeplink_type?: string;
    tracking_pixel_id?: string;
    catalog_id?: string;
    showcase_products?: Array<{
        item_group_id: string;
        store_id?: string;
        catalog_id?: string;
    }>;
    utm_params?: Array<{
        key: string;
        value: string;
    }>;
}

export interface AdGroupOption {
    adgroup_id: string;
    adgroup_name: string;
}

interface CreateTikTokAdPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: TikTokAdInput) => void;
    adgroupId: string;
    adgroups?: AdGroupOption[];
    onAdGroupChange?: (id: string) => void;
    loading?: boolean;
    submitError?: string | null;
    // NEW: Campaign and Ad Group context for conditional logic
    campaignId?: string;
    campaignData?: {
        objective_type?: string;
        catalog_enabled?: boolean;
        app_promotion_type?: string;
    };
    adGroupData?: {
        shopping_ads_type?: string;
        product_source?: string;
        promotion_type?: string;
        optimization_goal?: string;
        catalog_id?: string;
        promotion_target_type?: string;
        promotion_website_type?: string;
        messaging_app_type?: string;
        messaging_app_account_id?: string;
        app_id?: string;
        app_type?: string;
    };
}

export const CreateTikTokAdPanel: React.FC<CreateTikTokAdPanelProps> = ({
    isOpen,
    onClose,
    onSubmit,
    adgroupId,
    adgroups = [],
    onAdGroupChange,
    loading: externalLoading = false,
    submitError: externalSubmitError = null,
    campaignId,
    campaignData: externalCampaignData,
    adGroupData: externalAdGroupData,
}) => {
    const { accountId } = useParams<{ accountId: string }>();
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    // Use external loading/error if provided, otherwise use internal
    const loading = externalLoading || internalLoading;
    const error = externalSubmitError || internalError;

    // ============================================================================
    // STEP 2: FETCH CAMPAIGN AND AD GROUP DATA
    // ============================================================================
    // State for fetched campaign and ad group data
    // These are fetched when campaignId/adgroupId are provided but external data is not
    // ============================================================================
    
    const [fetchedCampaignData, setFetchedCampaignData] = useState<{
        objective_type?: string;
        catalog_enabled?: boolean;
        app_promotion_type?: string;
    } | null>(null);
    
    const [fetchedAdGroupData, setFetchedAdGroupData] = useState<{
        shopping_ads_type?: string;
        product_source?: string;
        promotion_type?: string;
        optimization_goal?: string;
        catalog_id?: string;
        promotion_target_type?: string;
        promotion_website_type?: string;
        messaging_app_type?: string;
        messaging_app_account_id?: string;
        app_id?: string;
        app_type?: string;
    } | null>(null);
    
    // Loading states for data fetching
    const [fetchingCampaignData, setFetchingCampaignData] = useState(false);
    const [fetchingAdGroupData, setFetchingAdGroupData] = useState(false);

    // ============================================================================
    // Data Merging: External data takes precedence over fetched data
    // ============================================================================
    // This allows parent components to pass data directly (more efficient) or
    // let the component fetch it automatically (more convenient)
    // ============================================================================
    const campaignData = externalCampaignData || fetchedCampaignData;
    const adGroupData = externalAdGroupData || fetchedAdGroupData;
    
    // ============================================================================
    // END OF STEP 2: DATA FETCHING
    // ============================================================================
    // Summary:
    // - Two useEffect hooks for fetching campaign and ad group data
    // - Loading states: fetchingCampaignData, fetchingAdGroupData
    // - Automatic cleanup when panel closes or external data provided
    // - Error handling: fails gracefully, allows form to work without data
    // - Data merging: external data takes precedence over fetched data
    // ============================================================================

    // ============================================================================
    // useEffect: Fetch Campaign Details
    // ============================================================================
    // Fetches campaign data when:
    // - Panel is open
    // - campaignId is provided
    // - External campaign data is NOT provided (to avoid unnecessary API calls)
    // - accountId is available
    // ============================================================================
    useEffect(() => {
        // Skip if panel is closed, external data provided, or missing required params
        if (!isOpen || externalCampaignData || !campaignId || !accountId) {
            // Reset fetched data when panel closes or external data is provided
            if (!isOpen || externalCampaignData) {
                setFetchedCampaignData(null);
            }
            return;
        }

        const fetchCampaignData = async () => {
            setFetchingCampaignData(true);
            try {
                const accountIdNum = parseInt(accountId, 10);
                if (isNaN(accountIdNum)) {
                    setFetchingCampaignData(false);
                    return;
                }

                const data = await campaignsService.getTikTokCampaignDetail(
                    accountIdNum,
                    campaignId
                );
                
                // Extract only the fields we need for conditional logic
                setFetchedCampaignData({
                    objective_type: data.campaign?.objective_type,
                    catalog_enabled: (data.campaign as any)?.catalog_enabled,
                    app_promotion_type: (data.campaign as any)?.app_promotion_type,
                });
            } catch (error) {
                console.error("Failed to fetch campaign data:", error);
                // Don't set error state - allow form to work without campaign data
                // Set to null so flags will be undefined (safe fallback)
                setFetchedCampaignData(null);
            } finally {
                setFetchingCampaignData(false);
            }
        };

        fetchCampaignData();
    }, [isOpen, campaignId, accountId, externalCampaignData]);

    // ============================================================================
    // useEffect: Fetch Ad Group Details
    // ============================================================================
    // Fetches ad group data when:
    // - Panel is open
    // - adgroupId is provided
    // - External ad group data is NOT provided (to avoid unnecessary API calls)
    // - accountId is available
    // 
    // Note: Since there's no dedicated ad group detail endpoint, we fetch the list
    // and filter by adgroupId. This is efficient if campaign_id is provided.
    // ============================================================================
    useEffect(() => {
        // Skip if panel is closed, external data provided, or missing required params
        if (!isOpen || externalAdGroupData || !adgroupId || !accountId) {
            // Reset fetched data when panel closes or external data is provided
            if (!isOpen || externalAdGroupData) {
                setFetchedAdGroupData(null);
            }
            return;
        }

        const fetchAdGroupData = async () => {
            setFetchingAdGroupData(true);
            try {
                const accountIdNum = parseInt(accountId, 10);
                if (isNaN(accountIdNum)) {
                    setFetchingAdGroupData(false);
                    return;
                }

                // Build query params - use campaign_id if available for more efficient filtering
                const queryParams: any = {
                    page: 1,
                    page_size: 100, // Fetch enough to find the ad group
                };
                
                // If campaignId is available, filter by it to reduce API response size
                if (campaignId) {
                    queryParams.campaign_id = campaignId;
                }

                // Fetch ad groups and find the one matching adgroupId
                const response = await campaignsService.getTikTokAdGroups(
                    accountIdNum,
                    queryParams
                );

                // Find ad group by adgroup_id (string) or id (number, converted to string)
                const adGroup = response.adgroups?.find(
                    (ag: any) => 
                        ag.adgroup_id === adgroupId || 
                        ag.adgroup_id?.toString() === adgroupId ||
                        ag.id?.toString() === adgroupId
                );

                if (adGroup) {
                    // Extract all fields needed for conditional logic
                    setFetchedAdGroupData({
                        shopping_ads_type: adGroup.shopping_ads_type,
                        product_source: adGroup.product_source,
                        promotion_type: adGroup.promotion_type,
                        optimization_goal: adGroup.optimization_goal,
                        catalog_id: adGroup.catalog_id,
                        promotion_target_type: adGroup.promotion_target_type,
                        promotion_website_type: adGroup.promotion_website_type,
                        messaging_app_type: adGroup.messaging_app_type,
                        messaging_app_account_id: adGroup.messaging_app_account_id,
                        app_id: adGroup.app_id,
                        app_type: adGroup.app_type,
                    });
                } else {
                    // Ad group not found - set to null (flags will be undefined, safe fallback)
                    console.warn(`Ad group ${adgroupId} not found in fetched list`);
                    setFetchedAdGroupData(null);
                }
            } catch (error) {
                console.error("Failed to fetch ad group data:", error);
                // Don't set error state - allow form to work without ad group data
                // Set to null so flags will be undefined (safe fallback)
                setFetchedAdGroupData(null);
            } finally {
                setFetchingAdGroupData(false);
            }
        };

        fetchAdGroupData();
    }, [isOpen, adgroupId, accountId, campaignId, externalAdGroupData]);

    // Form State - Core Fields
    const [adName, setAdName] = useState("");
    const [adFormat, setAdFormat] = useState("SINGLE_VIDEO");
    const [adText, setAdText] = useState("");
    const [identityId, setIdentityId] = useState("");
    const [identityType, setIdentityType] = useState("CUSTOMIZED_USER");
    const [videoId, setVideoId] = useState("");
    const [imageIds, setImageIds] = useState("");
    const [landingPageUrl, setLandingPageUrl] = useState("");
    const [callToAction, setCallToAction] = useState("LEARN_MORE");
    const [deeplink, setDeeplink] = useState("");
    const [trackingPixelId, setTrackingPixelId] = useState("");
    
    // Form State - Product Sales Fields
    const [productSpecificType, setProductSpecificType] = useState("ALL");
    const [itemGroupIds, setItemGroupIds] = useState("");
    const [productSetId, setProductSetId] = useState("");
    const [skuIds, setSkuIds] = useState("");
    const [vehicleIds, setVehicleIds] = useState("");
    const [showcaseProducts, setShowcaseProducts] = useState("");
    const [verticalVideoStrategy, setVerticalVideoStrategy] = useState("UNSET");
    const [endCardCta, setEndCardCta] = useState("");
    const [productDisplayFieldList, setProductDisplayFieldList] = useState<string[]>([]);
    const [autoDisclaimerTypes, setAutoDisclaimerTypes] = useState<string[]>([]);
    
    // Form State - Lead Generation Fields
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneRegionCode, setPhoneRegionCode] = useState("");
    const [phoneRegionCallingCode, setPhoneRegionCallingCode] = useState("");
    const [autoMessageId, setAutoMessageId] = useState("");
    const [trackingMessageEventSetId, setTrackingMessageEventSetId] = useState("");
    
    // Form State - App Promotion Fields
    const [creativeType, setCreativeType] = useState("");
    const [appName, setAppName] = useState("");
    const [cppUrl, setCppUrl] = useState("");
    const [deeplinkFormatType, setDeeplinkFormatType] = useState("");
    const [fallbackType, setFallbackType] = useState("");
    
    // Form State - Optimization Goal Fields
    const [tiktokPageCategory, setTiktokPageCategory] = useState("");
    const [pageId, setPageId] = useState("");
    
    // Form State - UTM Params (array of {key, value} objects)
    const [utmParams, setUtmParams] = useState<Array<{key: string; value: string}>>([]);
    const [utmParamKey, setUtmParamKey] = useState("");
    const [utmParamValue, setUtmParamValue] = useState("");
    
    // Form State - Disclaimer Fields (allowlist-only)
    const [disclaimerType, setDisclaimerType] = useState("");
    const [disclaimerText, setDisclaimerText] = useState("");
    const [disclaimerClickableTexts, setDisclaimerClickableTexts] = useState("");
    
    // Form State - Spark Ads Fields
    const [tiktokItemId, setTiktokItemId] = useState("");
    const [promotionalMusicDisabled, setPromotionalMusicDisabled] = useState(false);
    const [itemDuetStatus, setItemDuetStatus] = useState("");
    const [itemStitchStatus, setItemStitchStatus] = useState("");
    
    // Form State - Other Fields
    const [musicId, setMusicId] = useState("");
    const [carouselImageIndex, setCarouselImageIndex] = useState("");
    const [scheduleId, setScheduleId] = useState("");
    
    // Field-specific error messages (Step 5: Validation)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    
    // Helper function to clear field error on change
    const clearFieldError = (fieldName: string) => {
        if (fieldErrors[fieldName]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    // ============================================================================
    // STEP 3: CREATE CONDITIONAL BOOLEAN FLAGS
    // ============================================================================
    //
    // This section defines ALL boolean flags needed for conditional form rendering.
    // These flags are derived from:
    // - Campaign-level settings (objective_type, catalog_enabled, app_promotion_type)
    // - Ad Group-level settings (shopping_ads_type, product_source, promotion_type, etc.)
    // - Ad-level settings (ad_format, identity_type)
    //
    // Total flags: ~60+ flags covering all combinations
    // ============================================================================

    // ----------------------------------------------------------------------------
    // Campaign-Level Flags - ALL Objective Types
    // ----------------------------------------------------------------------------
    const isProductSales = campaignData?.objective_type === "PRODUCT_SALES";
    const isSalesMerged = campaignData?.objective_type === "SALES_MERGED";
    const isLeadGeneration = campaignData?.objective_type === "LEAD_GENERATION";
    const isAppPromotion = campaignData?.objective_type === "APP_PROMOTION";
    const isWebConversions = campaignData?.objective_type === "WEB_CONVERSIONS";
    const isReach = campaignData?.objective_type === "REACH";
    const isTraffic = campaignData?.objective_type === "TRAFFIC";
    const isVideoViews = campaignData?.objective_type === "VIDEO_VIEWS";
    const isEngagement = campaignData?.objective_type === "ENGAGEMENT";
    const isRfReach = campaignData?.objective_type === "RF_REACH";

    // Special campaign flags
    const isCatalogEnabled = campaignData?.catalog_enabled === true;
    const isAppPreRegistration = campaignData?.app_promotion_type === "APP_PREREGISTRATION";

    // ----------------------------------------------------------------------------
    // Ad Group-Level Flags - Product Sales
    // ----------------------------------------------------------------------------
    const isVideoShoppingAds = adGroupData?.shopping_ads_type === "VIDEO";
    const isLiveShoppingAds = adGroupData?.shopping_ads_type === "LIVE";
    const isProductShoppingAds = adGroupData?.shopping_ads_type === "PRODUCT_SHOPPING_ADS";
    const productSource = adGroupData?.product_source; // CATALOG, STORE, SHOWCASE
    const isProductSourceCatalog = productSource === "CATALOG";
    const isProductSourceStore = productSource === "STORE";
    const isProductSourceShowcase = productSource === "SHOWCASE";
    const catalogId = adGroupData?.catalog_id;

    // ----------------------------------------------------------------------------
    // Ad Group-Level Flags - Promotion Type
    // ----------------------------------------------------------------------------
    const promotionType = adGroupData?.promotion_type;
    const isPromotionWebsite = promotionType === "WEBSITE";
    const isPromotionAppAndroid = promotionType === "APP_ANDROID";
    const isPromotionAppIos = promotionType === "APP_IOS";
    const isPromotionLiveShopping = promotionType === "LIVE_SHOPPING";
    const isPromotionClickToCall = promotionType === "LEAD_GEN_CLICK_TO_CALL";
    const isPromotionDirectMessage = promotionType === "LEAD_GEN_CLICK_TO_TT_DIRECT_MESSAGE";
    const isPromotionSocialMessage = promotionType === "LEAD_GEN_CLICK_TO_SOCIAL_MEDIA_APP_MESSAGE";
    const promotionTargetType = adGroupData?.promotion_target_type; // EXTERNAL_WEBSITE, TIKTOK_NATIVE_PAGE
    const promotionWebsiteType = adGroupData?.promotion_website_type;

    // ----------------------------------------------------------------------------
    // Ad Group-Level Flags - Optimization Goal
    // ----------------------------------------------------------------------------
    const optimizationGoal = adGroupData?.optimization_goal;
    const isOptimizationPageVisit = optimizationGoal === "PAGE_VISIT";
    const isOptimizationDestinationVisit = optimizationGoal === "DESTINATION_VISIT";
    const isOptimizationClick = optimizationGoal === "CLICK";
    const isOptimizationLandingPageView = optimizationGoal === "LANDING_PAGE_VIEW";
    // Additional optimization goals (beyond the core 4 listed in spec)
    const isOptimizationConversion = optimizationGoal === "CONVERSION";
    const isOptimizationInstall = optimizationGoal === "INSTALL";
    const isOptimizationReach = optimizationGoal === "REACH";
    const isOptimizationEngagement = optimizationGoal === "ENGAGEMENT";
    const isOptimizationLeadGeneration = optimizationGoal === "LEAD_GENERATION";
    const isOptimizationValue = optimizationGoal === "VALUE";

    // ----------------------------------------------------------------------------
    // Ad Group-Level Flags - Messaging
    // ----------------------------------------------------------------------------
    const messagingAppType = adGroupData?.messaging_app_type; // MESSENGER, WHATSAPP
    const messagingAppAccountId = adGroupData?.messaging_app_account_id;

    // ----------------------------------------------------------------------------
    // Ad Group-Level Flags - App (for APP_PROMOTION)
    // ----------------------------------------------------------------------------
    const appId = adGroupData?.app_id;
    const appType = adGroupData?.app_type; // IOS, ANDROID

    // ----------------------------------------------------------------------------
    // Ad-Level Flags
    // ----------------------------------------------------------------------------
    const isSingleVideo = adFormat === "SINGLE_VIDEO";
    const isSingleImage = adFormat === "SINGLE_IMAGE";
    const isCarousel = adFormat === "CAROUSEL_ADS";
    const isCatalogCarousel = adFormat === "CATALOG_CAROUSEL";
    const isLiveContent = adFormat === "LIVE_CONTENT";
    
    // Identity Type: using state variable 'identityType' (not 'adIdentityType')
    // This is the form state variable that tracks the selected identity type
    // Values: CUSTOMIZED_USER, AUTH_CODE, TT_USER, BC_AUTH_TT
    const adIdentityType = identityType; // Alias for clarity in conditional logic
    
    // Identity Type boolean flags (for use in combined scenario flags)
    const isIdentityCustomizedUser = identityType === "CUSTOMIZED_USER";
    const isIdentityAuthCode = identityType === "AUTH_CODE";
    const isIdentityTtUser = identityType === "TT_USER";
    const isIdentityBcAuthTt = identityType === "BC_AUTH_TT";

    // ----------------------------------------------------------------------------
    // Combined Scenario Flags (for easier conditional rendering)
    // These combine multiple flags to represent complete scenarios
    // ----------------------------------------------------------------------------
    
    // Product Sales scenarios (5 combinations)
    const isVideoShoppingAdsCatalog = isProductSales && isVideoShoppingAds && isProductSourceCatalog;
    const isVideoShoppingAdsStore = isProductSales && isVideoShoppingAds && isProductSourceStore;
    const isVideoShoppingAdsShowcase = isProductSales && isVideoShoppingAds && isProductSourceShowcase;
    const isLiveShoppingAdsScenario = isProductSales && isLiveShoppingAds;
    const isProductShoppingAdsScenario = isProductSales && isProductShoppingAds;

    // Lead Generation scenarios (8+ combinations)
    const isLeadGenStandard = isLeadGeneration && !isCatalogEnabled;
    const isLeadGenWithCatalog = isLeadGeneration && isCatalogEnabled;
    const isLeadGenAutomotive = isLeadGeneration && isCatalogEnabled && isCatalogCarousel;
    const isLeadGenPhoneCall = isLeadGeneration && isPromotionClickToCall;
    const isLeadGenDirectMessage = isLeadGeneration && isPromotionDirectMessage;
    const isLeadGenSocialMessage = isLeadGeneration && isPromotionSocialMessage;

    // App Promotion scenarios (6+ combinations)
    const isAppPromotionWebsite = isAppPromotion && isPromotionWebsite;
    const isAppPromotionAndroid = isAppPromotion && isPromotionAppAndroid;
    const isAppPromotionIos = isAppPromotion && isPromotionAppIos;
    const isAppPromotionPreRegistration = isAppPromotion && isAppPreRegistration;

    // Traffic scenarios (2 combinations: standard vs destination visit)
    const isTrafficDestinationVisit = isTraffic && isOptimizationDestinationVisit;

    // Spark Ads scenarios (2 combinations: push vs pull)
    const isSparkAdsPush = isIdentityCustomizedUser && (isSingleVideo || isCarousel);
    const isSparkAdsPull = (isIdentityAuthCode || isIdentityBcAuthTt) && (isSingleVideo || isCarousel);

    // ----------------------------------------------------------------------------
    // Feature Support Flags (cross-cutting concerns)
    // ----------------------------------------------------------------------------
    
    // UTM params support (varies by objective and ad group settings)
    const supportsUtmParams = isReach || isTraffic || isVideoViews || 
        (isLeadGeneration && !isCatalogEnabled) || isEngagement || 
        (isAppPromotion && isAppPreRegistration) || isWebConversions || isRfReach ||
        (isProductSales && isVideoShoppingAds && isProductSourceCatalog && isPromotionWebsite) ||
        (isLeadGeneration && isCatalogEnabled && promotionTargetType === "EXTERNAL_WEBSITE");

    // Disclaimer support (allowlist-only, but flag for UI)
    const supportsDisclaimers = isAppPromotion || isWebConversions || isReach || 
        isTraffic || isVideoViews || isEngagement || isLeadGeneration || isRfReach;

    // ============================================================================
    // END OF STEP 3: CONDITIONAL BOOLEAN FLAGS
    // ============================================================================
    // Summary:
    // - Campaign-level flags: 10 objective types + 2 special flags = 12 flags
    // - Ad group-level flags: ~25 flags (Product Sales, Promotion, Optimization, Messaging, App)
    // - Ad-level flags: 5 format flags + 4 identity type flags = 9 flags
    // - Combined scenario flags: ~15 flags (for easier conditional rendering)
    // - Feature support flags: 2 flags (UTM params, Disclaimers)
    // Total: ~63 boolean flags covering all ad group variations
    // 
    // All flags are now ready for use in conditional form rendering (Step 4)
    // ============================================================================

    // ============================================================================
    // STEP 5: CONDITIONAL VALIDATION LOGIC
    // ============================================================================
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        
        // Always required fields
        if (!adName.trim()) {
            errors.adName = "Ad name is required";
        } else if (adName.length > 512) {
            errors.adName = "Ad name must be 512 characters or less";
        }
        
        if (!adText.trim()) {
            errors.adText = "Ad text is required";
        }
        
        if (!identityId.trim()) {
            errors.identityId = "Identity ID is required";
        }
        
        // Format-specific validation
        if (isSingleVideo && !videoId.trim()) {
            errors.videoId = "Video ID is required for video format";
        }
        
        if ((isSingleImage || isCarousel || isCatalogCarousel) && !imageIds.trim()) {
            errors.imageIds = "Image IDs are required for image/carousel format";
        }
        
        // Conditional validation based on campaign objective and ad group settings
        
        // Product Sales - Video Shopping Ads with Catalog
        if (isVideoShoppingAdsCatalog && isPromotionWebsite) {
            if (!landingPageUrl.trim()) {
                errors.landingPageUrl = "Landing page URL is required for Video Shopping Ads with Catalog";
            } else if (!landingPageUrl.match(/^https?:\/\/.+/)) {
                errors.landingPageUrl = "Landing page URL must be a valid URL";
            }
        }
        
        // Lead Generation - Standard (without catalog)
        if (isLeadGenStandard && promotionWebsiteType !== "TIKTOK_NATIVE_PAGE") {
            if (!landingPageUrl.trim()) {
                errors.landingPageUrl = "Landing page URL is required for Lead Generation ads";
            } else if (!landingPageUrl.match(/^https?:\/\/.+/)) {
                errors.landingPageUrl = "Landing page URL must be a valid URL";
            }
        }
        
        // Lead Generation - With Catalog (External Website)
        if (isLeadGenWithCatalog && promotionTargetType === "EXTERNAL_WEBSITE") {
            if (!landingPageUrl.trim()) {
                errors.landingPageUrl = "Landing page URL is required for Lead Generation with External Website";
            } else if (!landingPageUrl.match(/^https?:\/\/.+/)) {
                errors.landingPageUrl = "Landing page URL must be a valid URL";
            }
        }
        
        // App Promotion - Android / iOS (Deeplink required)
        if ((isAppPromotionAndroid || isAppPromotionIos) && !deeplink.trim()) {
            errors.deeplink = "Deeplink is required for App Promotion (Android/iOS)";
        }
        
        // Traffic - Standard (not destination visit)
        if (isTraffic && !isTrafficDestinationVisit) {
            if (!landingPageUrl.trim()) {
                errors.landingPageUrl = "Landing page URL is required for Traffic ads";
            } else if (!landingPageUrl.match(/^https?:\/\/.+/)) {
                errors.landingPageUrl = "Landing page URL must be a valid URL";
            }
        }
        
        // Validate image IDs format (comma-separated)
        if (imageIds.trim()) {
            const ids = imageIds.split(",").map(id => id.trim()).filter(id => id);
            if (ids.length === 0) {
                errors.imageIds = "At least one image ID is required";
            } else if ((isCarousel || isCatalogCarousel) && ids.length < 2) {
                errors.imageIds = "Carousel format requires at least 2 image IDs";
            } else if (isCarousel && ids.length > 35) {
                errors.imageIds = "Carousel format supports maximum 35 image IDs";
            }
        }
        
        // Product Sales - Catalog specific validations
        if (isVideoShoppingAdsCatalog) {
            if (!productSpecificType) {
                errors.productSpecificType = "Product specific type is required for Video Shopping Ads with Catalog";
            }
            if (productSpecificType === "PRODUCT_SET" && !productSetId.trim()) {
                errors.productSetId = "Product Set ID is required when Product Specific Type is PRODUCT_SET";
            }
            if (productSpecificType === "CUSTOMIZED_PRODUCTS") {
                if (!skuIds.trim()) {
                    errors.skuIds = "SKU IDs are required when Product Specific Type is CUSTOMIZED_PRODUCTS";
                } else {
                    const skuIdArray = skuIds.split(",").map(id => id.trim()).filter(id => id);
                    if (skuIdArray.length === 0) {
                        errors.skuIds = "At least one SKU ID is required";
                    } else if (skuIdArray.length > 20) {
                        errors.skuIds = "Maximum 20 SKU IDs allowed";
                    }
                }
            }
            if (productSpecificType === "ALL" || productSpecificType === "PRODUCT_SET") {
                if (!itemGroupIds.trim()) {
                    errors.itemGroupIds = "Item Group IDs are required";
                } else {
                    const itemGroupIdArray = itemGroupIds.split(",").map(id => id.trim()).filter(id => id);
                    if (itemGroupIdArray.length === 0) {
                        errors.itemGroupIds = "At least one Item Group ID is required";
                    } else if (itemGroupIdArray.length > 50) {
                        errors.itemGroupIds = "Maximum 50 Item Group IDs allowed";
                    }
                }
            }
        }
        
        // Product Sales - Showcase validations
        if (isVideoShoppingAdsShowcase && !showcaseProducts.trim()) {
            errors.showcaseProducts = "Showcase products are required for Video Shopping Ads with Showcase";
        }
        
        // Lead Generation - Phone Call validations
        if (isLeadGenPhoneCall) {
            if (!phoneNumber.trim()) {
                errors.phoneNumber = "Phone number is required for Phone Call ads";
            }
            if (!phoneRegionCode.trim()) {
                errors.phoneRegionCode = "Phone region code is required";
            }
            if (!phoneRegionCallingCode.trim()) {
                errors.phoneRegionCallingCode = "Phone region calling code is required";
            }
        }
        
        // Lead Generation - Direct Message validations
        if (isLeadGenDirectMessage && !autoMessageId.trim()) {
            errors.autoMessageId = "Auto Message ID is required for Direct Message ads";
        }
        
        // Lead Generation - Social Message validations
        if (isLeadGenSocialMessage && isOptimizationClick && 
            messagingAppType && ["MESSENGER", "WHATSAPP"].includes(messagingAppType) && !pageId.trim()) {
            if (!trackingMessageEventSetId.trim()) {
                errors.trackingMessageEventSetId = "Tracking Message Event Set ID is required";
            }
        }
        
        // Lead Generation - Automotive validations
        if (isLeadGenAutomotive && isCatalogCarousel) {
            if (!endCardCta) {
                errors.endCardCta = "End Card CTA is required for Automotive Catalog Carousel ads";
            }
            if (productSpecificType === "CUSTOMIZED_PRODUCTS" && !vehicleIds.trim()) {
                errors.vehicleIds = "Vehicle IDs are required for Automotive ads with CUSTOMIZED_PRODUCTS";
            } else if (vehicleIds.trim()) {
                const vehicleIdArray = vehicleIds.split(",").map(id => id.trim()).filter(id => id);
                if (vehicleIdArray.length > 20) {
                    errors.vehicleIds = "Maximum 20 Vehicle IDs allowed";
                }
            }
        }
        
        // App Promotion - Pre-registration validations
        if (isAppPromotionPreRegistration && promotionWebsiteType === "TIKTOK_NATIVE_PAGE" && !creativeType) {
            errors.creativeType = "Creative type is required for App Pre-registration with TikTok Instant Page";
        }
        
        // Traffic - Destination Visit validations
        if (isTrafficDestinationVisit) {
            if (!deeplinkFormatType) {
                errors.deeplinkFormatType = "Deeplink format type is required for Destination Visit";
            }
            if (!deeplink.trim()) {
                errors.deeplink = "Deeplink is required for Destination Visit";
            }
        }
        
        // Optimization Goal - PAGE_VISIT validations
        if (isOptimizationPageVisit) {
            if (!tiktokPageCategory) {
                errors.tiktokPageCategory = "TikTok Page Category is required for PAGE_VISIT optimization";
            }
            if (tiktokPageCategory === "OTHER_TIKTOK_PAGE" && !landingPageUrl.trim()) {
                errors.landingPageUrl = "Landing page URL is required when Page Category is OTHER_TIKTOK_PAGE";
            }
            if (tiktokPageCategory === "TIKTOK_INSTANT_PAGE" && !pageId.trim()) {
                errors.pageId = "Page ID is required when Page Category is TIKTOK_INSTANT_PAGE";
            }
        }
        
        // Carousel - Music ID validation
        if (isCarousel && !musicId.trim()) {
            errors.musicId = "Music ID is required for Carousel ads";
        }
        
        // Catalog Carousel - Music ID validation
        if (isCatalogCarousel && !musicId.trim()) {
            errors.musicId = "Music ID is required for Catalog Carousel ads";
        }
        
        // Live Content - Creative Type validation
        if (isLiveContent && !creativeType) {
            errors.creativeType = "Creative type is required for Live Content ads (SHORT_VIDEO_LIVE or DIRECT_LIVE)";
        }
        
        // Live Content - Call to Action validation
        if (isLiveContent && callToAction !== "WATCH_LIVE") {
            errors.callToAction = "Call to Action must be WATCH_LIVE for Live Content ads";
        }
        
        // Spark Ads Pull - TikTok Item ID validation
        if (isSparkAdsPull && !tiktokItemId.trim()) {
            errors.tiktokItemId = "TikTok Item ID is required for Spark Ads Pull";
        }
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ============================================================================
    // STEP 6: CONDITIONAL SUBMISSION LOGIC
    // ============================================================================
    const buildAdPayload = (): any => {
        const payload: any = {
            adgroup_id: adgroupId,
            ad_name: adName.trim(),
            ad_format: adFormat,
            ad_text: adText.trim(),
            identity_id: identityId.trim(),
            identity_type: identityType,
        };
        
        // Format-specific fields
        if (isSingleVideo && videoId.trim()) {
            payload.video_id = videoId.trim();
        }
        
        if ((isSingleImage || isCarousel || isCatalogCarousel) && imageIds.trim()) {
            const ids = imageIds.split(",").map(id => id.trim()).filter(id => id);
            if (ids.length > 0) {
                payload.image_ids = ids;
            }
        }
        
        // Conditional fields based on campaign objective and ad group settings
        
        // Landing Page URL (conditional)
        if (landingPageUrl.trim()) {
            // For TikTok Instant Page, use page_id instead of landing_page_url
            if (promotionWebsiteType === "TIKTOK_NATIVE_PAGE" && isLeadGeneration) {
                payload.page_id = landingPageUrl.trim();
            } else {
                payload.landing_page_url = landingPageUrl.trim();
            }
        }
        
        // Call to Action (conditional - not all scenarios need it)
        if (callToAction && callToAction !== "LEARN_MORE") {
            payload.call_to_action = callToAction;
        } else if (
            // Always include CTA for these scenarios
            isProductSales ||
            isLeadGeneration ||
            isAppPromotion ||
            (isTraffic && !isTrafficDestinationVisit)
        ) {
            payload.call_to_action = callToAction;
        }
        
        // Deeplink (conditional - required for App Promotion Android/iOS)
        if (deeplink.trim()) {
            payload.deeplink = deeplink.trim();
            // Set deeplink_type based on app type if available
            if (appType === "IOS") {
                payload.deeplink_type = "IOS";
            } else if (appType === "ANDROID") {
                payload.deeplink_type = "ANDROID";
            }
        }
        
        // Tracking Pixel (optional for all)
        if (trackingPixelId.trim()) {
            payload.tracking_pixel_id = trackingPixelId.trim();
        }
        
        // Product Sales specific fields
        if (isProductSales) {
            // Catalog ID (if available from ad group)
            if (catalogId) {
                payload.catalog_id = catalogId;
            }
            
            // Product Specific Type (for Video Shopping Ads with Catalog)
            if (isVideoShoppingAdsCatalog && productSpecificType) {
                payload.product_specific_type = productSpecificType;
                
                // Item Group IDs (for ALL or PRODUCT_SET)
                if ((productSpecificType === "ALL" || productSpecificType === "PRODUCT_SET") && itemGroupIds.trim()) {
                    const ids = itemGroupIds.split(",").map(id => id.trim()).filter(id => id);
                    if (ids.length > 0) {
                        payload.item_group_ids = ids;
                    }
                }
                
                // Product Set ID (for PRODUCT_SET)
                if (productSpecificType === "PRODUCT_SET" && productSetId.trim()) {
                    payload.product_set_id = productSetId.trim();
                }
                
                // SKU IDs (for CUSTOMIZED_PRODUCTS)
                if (productSpecificType === "CUSTOMIZED_PRODUCTS" && skuIds.trim()) {
                    const ids = skuIds.split(",").map(id => id.trim()).filter(id => id);
                    if (ids.length > 0) {
                        payload.sku_ids = ids;
                    }
                }
            }
            
            // Vertical Video Strategy (for Video Shopping Ads)
            if (isVideoShoppingAds && verticalVideoStrategy && verticalVideoStrategy !== "UNSET") {
                payload.vertical_video_strategy = verticalVideoStrategy;
            }
            
            // Showcase Products (for Video Shopping Ads with Showcase)
            if (isVideoShoppingAdsShowcase && showcaseProducts.trim()) {
                try {
                    // Parse JSON string to array of objects
                    const parsed = JSON.parse(showcaseProducts);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        payload.showcase_products = parsed;
                    }
                } catch (e) {
                    // If JSON parsing fails, try to construct from comma-separated format
                    // Format: "item_group_id1,store_id1,catalog_id1|item_group_id2,store_id2,catalog_id2"
                    const products = showcaseProducts.split("|").map(productStr => {
                        const parts = productStr.split(",");
                        return {
                            item_group_id: parts[0]?.trim() || "",
                            store_id: parts[1]?.trim(),
                            catalog_id: parts[2]?.trim()
                        };
                    }).filter(p => p.item_group_id);
                    if (products.length > 0) {
                        payload.showcase_products = products;
                    }
                }
            }
            
            // End Card CTA (for Catalog Carousel)
            if (isCatalogCarousel && endCardCta) {
                payload.end_card_cta = endCardCta;
            }
            
            // Product Display Field List (for Auto-Inventory)
            if (isCatalogCarousel && productDisplayFieldList.length > 0) {
                payload.product_display_field_list = productDisplayFieldList;
            }
            
            // Auto Disclaimer Types (for Auto-Model)
            if (isCatalogCarousel && autoDisclaimerTypes.length > 0) {
                payload.auto_disclaimer_types = autoDisclaimerTypes;
            }
        }
        
        // Lead Generation specific fields
        if (isLeadGeneration) {
            // Phone Call fields
            if (isLeadGenPhoneCall) {
                if (phoneNumber.trim()) payload.phone_number = phoneNumber.trim();
                if (phoneRegionCode.trim()) payload.phone_region_code = phoneRegionCode.trim();
                if (phoneRegionCallingCode.trim()) payload.phone_region_calling_code = phoneRegionCallingCode.trim();
            }
            
            // Direct Message fields
            if (isLeadGenDirectMessage && autoMessageId.trim()) {
                payload.auto_message_id = autoMessageId.trim();
            }
            
            // Social Message fields
            if (isLeadGenSocialMessage && trackingMessageEventSetId.trim()) {
                payload.tracking_message_event_set_id = trackingMessageEventSetId.trim();
            }
            
            // Automotive fields
            if (isLeadGenAutomotive) {
                if (vehicleIds.trim()) {
                    const ids = vehicleIds.split(",").map(id => id.trim()).filter(id => id);
                    if (ids.length > 0) {
                        payload.vehicle_ids = ids;
                    }
                }
            }
        }
        
        // App Promotion specific fields
        if (isAppPromotion) {
            // Creative Type (for Pre-registration with TikTok Instant Page)
            if (isAppPromotionPreRegistration && promotionWebsiteType === "TIKTOK_NATIVE_PAGE" && creativeType) {
                payload.creative_type = creativeType;
            }
            
            // App Name (if provided)
            if (appName.trim()) {
                payload.app_name = appName.trim();
            }
            
            // Custom Product Page URL (allowlist-only)
            if (cppUrl.trim()) {
                payload.cpp_url = cppUrl.trim();
            }
            
            // Deeplink Format Type (for Destination Visit)
            if (deeplinkFormatType) {
                payload.deeplink_format_type = deeplinkFormatType;
            }
            
            // Fallback Type
            if (fallbackType) {
                payload.fallback_type = fallbackType;
            }
        }
        
        // Optimization Goal specific fields
        if (isOptimizationPageVisit) {
            if (tiktokPageCategory) {
                payload.tiktok_page_category = tiktokPageCategory;
            }
            if (pageId.trim()) {
                payload.page_id = pageId.trim();
            }
        }
        
        // Ad Format specific fields
        if (isCarousel || isCatalogCarousel) {
            if (musicId.trim()) {
                payload.music_id = musicId.trim();
            }
        }
        
        if (isCatalogCarousel && carouselImageIndex.trim()) {
            const index = parseInt(carouselImageIndex);
            if (!isNaN(index) && index >= 0 && index <= 9) {
                payload.carousel_image_index = index;
            }
        }
        
        // Live Content specific fields
        if (isLiveContent) {
            if (creativeType) {
                payload.creative_type = creativeType;
            }
        }
        
        // Spark Ads specific fields
        if (isSparkAdsPull && tiktokItemId.trim()) {
            payload.tiktok_item_id = tiktokItemId.trim();
        }
        
        if (isIdentityAuthCode || isIdentityBcAuthTt) {
            if (promotionalMusicDisabled !== undefined) {
                payload.promotional_music_disabled = promotionalMusicDisabled;
            }
            if (itemDuetStatus) {
                payload.item_duet_status = itemDuetStatus;
            }
            if (itemStitchStatus) {
                payload.item_stitch_status = itemStitchStatus;
            }
        }
        
        // RF_REACH specific fields
        if (isRfReach && scheduleId.trim()) {
            payload.schedule_id = scheduleId.trim();
        }
        
        // UTM Params (conditional - supported for certain scenarios)
        if (supportsUtmParams && utmParams.length > 0) {
            payload.utm_params = utmParams;
        }
        
        // Disclaimer fields (allowlist-only)
        if (supportsDisclaimers) {
            if (disclaimerType) {
                payload.disclaimer_type = disclaimerType;
            }
            if (disclaimerText.trim()) {
                payload.disclaimer_text = disclaimerText.trim();
            }
            if (disclaimerClickableTexts.trim()) {
                payload.disclaimer_clickable_texts = disclaimerClickableTexts.trim();
            }
        }
        
        return payload;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !adgroupId) return;
        
        // Clear previous errors
        setFieldErrors({});
        setInternalError(null);
        
        // Validate form (Step 5)
        if (!validateForm()) {
            // Show first error as general error message
            const firstError = Object.values(fieldErrors)[0];
            setInternalError(firstError || "Please fix the errors below");
            return;
        }
        
        // Build payload conditionally (Step 6)
        const adData = buildAdPayload();

        // If parent provides onSubmit, use that (parent handles API call)
        if (onSubmit) {
            onSubmit(adData);
        } else {
            // Otherwise, handle API call internally
            setInternalLoading(true);
            setInternalError(null);

            try {
                await campaignsService.createTikTokAd(parseInt(accountId), adData);
                handleReset();
                onClose();
            } catch (err: any) {
                console.error("Error creating ad:", err);
                setInternalError(err.message || "Failed to create ad");
            } finally {
                setInternalLoading(false);
            }
        }
    };

    const handleReset = () => {
        // Core fields
        setAdName("");
        setAdFormat("SINGLE_VIDEO");
        setAdText("");
        setIdentityId("");
        setIdentityType("CUSTOMIZED_USER");
        setVideoId("");
        setImageIds("");
        setLandingPageUrl("");
        setCallToAction("LEARN_MORE");
        setDeeplink("");
        setTrackingPixelId("");
        
        // Product Sales fields
        setProductSpecificType("ALL");
        setItemGroupIds("");
        setProductSetId("");
        setSkuIds("");
        setVehicleIds("");
        setShowcaseProducts("");
        setVerticalVideoStrategy("UNSET");
        setEndCardCta("");
        setProductDisplayFieldList([]);
        setAutoDisclaimerTypes([]);
        
        // Lead Generation fields
        setPhoneNumber("");
        setPhoneRegionCode("");
        setPhoneRegionCallingCode("");
        setAutoMessageId("");
        setTrackingMessageEventSetId("");
        
        // App Promotion fields
        setCreativeType("");
        setAppName("");
        setCppUrl("");
        setDeeplinkFormatType("");
        setFallbackType("");
        
        // Optimization Goal fields
        setTiktokPageCategory("");
        setPageId("");
        
        // UTM Params
        setUtmParams([]);
        setUtmParamKey("");
        setUtmParamValue("");
        
        // Disclaimer fields
        setDisclaimerType("");
        setDisclaimerText("");
        setDisclaimerClickableTexts("");
        
        // Spark Ads fields
        setTiktokItemId("");
        setPromotionalMusicDisabled(false);
        setItemDuetStatus("");
        setItemStitchStatus("");
        
        // Other fields
        setMusicId("");
        setCarouselImageIndex("");
        setScheduleId("");
        
        setInternalError(null);
        setFieldErrors({});
        // Note: We don't reset fetched campaign/adGroup data as it may be reused
        // The useEffect hooks will handle resetting when panel closes
    };

    const handleCancel = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
            {/* Form */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
                    Create TikTok Ad
                </h2>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-[13px] font-semibold text-red-600 mb-2">
                            Please fix the following errors:
                        </p>
                        <ul className="list-disc list-inside text-[12px] text-red-600 space-y-1">
                            <li>{error}</li>
                        </ul>
                    </div>
                )}

                {/* Row 1: Ad Group (read-only), Ad Name, Ad Format */}
                <div className="grid grid-cols-3 gap-6 mb-4">
                    {/* Ad Group (read-only) */}
                    {/* Ad Group Selection */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Ad Group *
                        </label>
                        {adgroups.length > 0 ? (
                            <Dropdown
                                options={adgroups.map((group) => ({
                                    value: group.adgroup_id,
                                    label: group.adgroup_name,
                                }))}
                                value={adgroupId}
                                onChange={(val) => onAdGroupChange && onAdGroupChange(val as string)}
                                placeholder="Select Ad Group"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                            />
                        ) : (
                            <input
                                type="text"
                                value={adgroupId}
                                disabled
                                className="bg-gray-100 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-gray-600 cursor-not-allowed"
                            />
                        )}
                    </div>

                    {/* Ad Name */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Ad Name *
                        </label>
                        <input
                            type="text"
                            value={adName}
                            onChange={(e) => {
                                setAdName(e.target.value);
                                clearFieldError("adName");
                            }}
                            placeholder="Enter ad name"
                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                fieldErrors.adName ? "border-red-500" : "border-gray-200"
                            }`}
                            required
                        />
                        {fieldErrors.adName && (
                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.adName}</p>
                        )}
                    </div>

                    {/* Ad Format */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Ad Format *
                        </label>
                        <Dropdown
                            options={AD_FORMAT_OPTIONS}
                            value={adFormat}
                            onChange={(val) => setAdFormat(val as string)}
                            placeholder="Select Ad Format"
                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                        />
                    </div>
                </div>

                {/* ============================================================================
                    STEP 4: CONDITIONAL FORM SECTIONS
                    ============================================================================
                    Form sections are conditionally rendered based on:
                    - Campaign objective type (PRODUCT_SALES, LEAD_GENERATION, etc.)
                    - Ad group settings (shopping_ads_type, product_source, promotion_type)
                    - Ad format (SINGLE_VIDEO, SINGLE_IMAGE, CAROUSEL, etc.)
                    - Identity type (CUSTOMIZED_USER, AUTH_CODE, etc.)
                    ============================================================================ */}

                {/* Common Fields: Ad Text, Identity Type, Identity ID */}
                <div className="grid grid-cols-3 gap-6 mb-4">
                    {/* Ad Text */}
                    <div className="md:col-span-2">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Ad Text *
                        </label>
                        <textarea
                            value={adText}
                            onChange={(e) => {
                                setAdText(e.target.value);
                                clearFieldError("adText");
                            }}
                            placeholder="Enter ad text/description"
                            rows={5}
                            className={`bg-[#FEFEFB] w-full px-4 py-2.5 border rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                fieldErrors.adText ? "border-red-500" : "border-gray-200"
                            }`}
                            required
                        />
                        {fieldErrors.adText && (
                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.adText}</p>
                        )}
                    </div>

                    {/* Identity Type & Identity ID */}
                    <div className="space-y-3">
                        {/* Identity Type */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Identity Type *
                            </label>
                            <Dropdown
                                options={IDENTITY_TYPE_OPTIONS}
                                value={identityType}
                                onChange={(val) => setIdentityType(val as string)}
                                placeholder="Select Identity Type"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                            />
                        </div>

                        {/* Identity ID */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Identity ID *
                            </label>
                            <input
                                type="text"
                                value={identityId}
                                onChange={(e) => {
                                    setIdentityId(e.target.value);
                                    clearFieldError("identityId");
                                }}
                                placeholder="TikTok identity/page ID"
                                className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                    fieldErrors.identityId ? "border-red-500" : "border-gray-200"
                                }`}
                                required
                            />
                            {fieldErrors.identityId ? (
                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.identityId}</p>
                            ) : (
                                <p className="text-[10px] text-gray-500 mt-1">
                                    The TikTok account/page identity to use for this ad
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Conditional Creative Fields: Video ID / Image IDs based on Ad Format */}
                <div className="grid grid-cols-3 gap-6 mb-4">
                    {/* Video ID (for video formats) */}
                    {isSingleVideo && (
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Video ID *
                            </label>
                            <input
                                type="text"
                                value={videoId}
                                onChange={(e) => {
                                    setVideoId(e.target.value);
                                    clearFieldError("videoId");
                                }}
                                placeholder="TikTok video ID"
                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                    fieldErrors.videoId ? "border-red-500" : "border-gray-200"
                                }`}
                                required
                            />
                            {fieldErrors.videoId && (
                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.videoId}</p>
                            )}
                        </div>
                    )}

                    {/* Image IDs (for image/carousel formats) */}
                    {(isSingleImage || isCarousel || isCatalogCarousel) && (
                        <div className={isCarousel || isCatalogCarousel ? "md:col-span-2" : ""}>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Image IDs *
                            </label>
                            <input
                                type="text"
                                value={imageIds}
                                onChange={(e) => {
                                    setImageIds(e.target.value);
                                    clearFieldError("imageIds");
                                }}
                                placeholder={isCarousel || isCatalogCarousel ? "Comma-separated image IDs (e.g., 123456, 789012)" : "Enter single image ID"}
                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                    fieldErrors.imageIds ? "border-red-500" : "border-gray-200"
                                }`}
                                required
                            />
                            {fieldErrors.imageIds ? (
                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.imageIds}</p>
                            ) : (
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {isCarousel || isCatalogCarousel ? "Enter multiple image IDs separated by commas" : "Enter single image ID"}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ============================================================================
                    CONDITIONAL SECTIONS BY CAMPAIGN OBJECTIVE & AD GROUP SETTINGS
                    ============================================================================ */}
                
                {isProductSales ? (
                    // PRODUCT_SALES Campaign
                    <>
                        {/* Video Shopping Ads with Catalog */}
                        {isVideoShoppingAdsCatalog && (
                            <>
                                {/* Product Specific Type */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Product Specific Type *
                                        </label>
                                        <Dropdown
                                            options={PRODUCT_SPECIFIC_TYPE_OPTIONS}
                                            value={productSpecificType}
                                            onChange={(val) => {
                                                setProductSpecificType(val as string);
                                                clearFieldError("productSpecificType");
                                            }}
                                            placeholder="Select Product Specific Type"
                                            buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${
                                                fieldErrors.productSpecificType ? "border-red-500" : ""
                                            }`}
                                        />
                                        {fieldErrors.productSpecificType && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.productSpecificType}</p>
                                        )}
                                    </div>

                                    {/* Product Set ID (conditional) */}
                                    {productSpecificType === "PRODUCT_SET" && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Product Set ID *
                                            </label>
                                            <input
                                                type="text"
                                                value={productSetId}
                                                onChange={(e) => {
                                                    setProductSetId(e.target.value);
                                                    clearFieldError("productSetId");
                                                }}
                                                placeholder="Product Set ID"
                                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    fieldErrors.productSetId ? "border-red-500" : "border-gray-200"
                                                }`}
                                                required
                                            />
                                            {fieldErrors.productSetId && (
                                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.productSetId}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Item Group IDs (for ALL or PRODUCT_SET) */}
                                {(productSpecificType === "ALL" || productSpecificType === "PRODUCT_SET") && (
                                    <div className="mb-4">
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Item Group IDs * (comma-separated, max 50)
                                        </label>
                                        <input
                                            type="text"
                                            value={itemGroupIds}
                                            onChange={(e) => {
                                                setItemGroupIds(e.target.value);
                                                clearFieldError("itemGroupIds");
                                            }}
                                            placeholder="123456, 789012, ..."
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.itemGroupIds ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.itemGroupIds && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.itemGroupIds}</p>
                                        )}
                                    </div>
                                )}

                                {/* SKU IDs (for CUSTOMIZED_PRODUCTS) */}
                                {productSpecificType === "CUSTOMIZED_PRODUCTS" && (
                                    <div className="mb-4">
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            SKU IDs * (comma-separated, max 20)
                                        </label>
                                        <input
                                            type="text"
                                            value={skuIds}
                                            onChange={(e) => {
                                                setSkuIds(e.target.value);
                                                clearFieldError("skuIds");
                                            }}
                                            placeholder="SKU1, SKU2, ..."
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.skuIds ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.skuIds && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.skuIds}</p>
                                        )}
                                    </div>
                                )}

                                {/* Vertical Video Strategy */}
                                <div className="mb-4">
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                        Vertical Video Strategy
                                    </label>
                                    <Dropdown
                                        options={VERTICAL_VIDEO_STRATEGY_OPTIONS}
                                        value={verticalVideoStrategy}
                                        onChange={(val) => setVerticalVideoStrategy(val as string)}
                                        placeholder="Select Vertical Video Strategy"
                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                    />
                                </div>

                                {/* Landing Page URL (required for Catalog Video Shopping Ads) */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Landing Page URL *
                                        </label>
                                        <input
                                            type="url"
                                            value={landingPageUrl}
                                            onChange={(e) => {
                                                setLandingPageUrl(e.target.value);
                                                clearFieldError("landingPageUrl");
                                            }}
                                            placeholder="https://example.com/landing"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.landingPageUrl ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.landingPageUrl && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.landingPageUrl}</p>
                                        )}
                                    </div>

                                    {/* Call to Action */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "SHOP_NOW", "SIGN_UP"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Video Shopping Ads with Store */}
                        {isVideoShoppingAdsStore && (
                            <>
                                {/* Item Group IDs for Store */}
                                <div className="mb-4">
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                        Item Group IDs (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={itemGroupIds}
                                        onChange={(e) => setItemGroupIds(e.target.value)}
                                        placeholder="123456, 789012, ..."
                                        className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                    />
                                </div>

                                {/* Landing Page URL (optional for Store) */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Landing Page URL
                                        </label>
                                        <input
                                            type="url"
                                            value={landingPageUrl}
                                            onChange={(e) => setLandingPageUrl(e.target.value)}
                                            placeholder="https://example.com/landing"
                                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                        />
                                    </div>

                                    {/* Call to Action */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "SHOP_NOW"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Video Shopping Ads with Showcase */}
                        {isVideoShoppingAdsShowcase && (
                            <>
                                {/* Showcase Products */}
                                <div className="mb-4">
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                        Showcase Products * (JSON array or pipe-separated: item_group_id,store_id,catalog_id|...)
                                    </label>
                                    <textarea
                                        value={showcaseProducts}
                                        onChange={(e) => {
                                            setShowcaseProducts(e.target.value);
                                            clearFieldError("showcaseProducts");
                                        }}
                                        placeholder='[{"item_group_id":"123","store_id":"456","catalog_id":"789"}] or "123,456,789|321,654,987"'
                                        rows={4}
                                        className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                            fieldErrors.showcaseProducts ? "border-red-500" : "border-gray-200"
                                        }`}
                                        required
                                    />
                                    {fieldErrors.showcaseProducts && (
                                        <p className="mt-1 text-[12px] text-red-600">{fieldErrors.showcaseProducts}</p>
                                    )}
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Max 20 products. Format: JSON array or pipe-separated values
                                    </p>
                                </div>

                                {/* Landing Page URL (optional for Showcase) */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Landing Page URL
                                        </label>
                                        <input
                                            type="url"
                                            value={landingPageUrl}
                                            onChange={(e) => setLandingPageUrl(e.target.value)}
                                            placeholder="https://example.com/landing"
                                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                        />
                                    </div>

                                    {/* Call to Action */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "SHOP_NOW"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Live Shopping Ads */}
                        {isLiveShoppingAdsScenario && (
                            <>
                                {/* Live Shopping Ads typically don't need landing page URL */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "SHOP_NOW"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Product Shopping Ads */}
                        {isProductShoppingAdsScenario && (
                            <>
                                {/* Product Shopping Ads - similar to Video Shopping Ads with Store */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Landing Page URL
                                        </label>
                                        <input
                                            type="url"
                                            value={landingPageUrl}
                                            onChange={(e) => setLandingPageUrl(e.target.value)}
                                            placeholder="https://example.com/landing"
                                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["SHOP_NOW", "LEARN_MORE"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : isLeadGeneration ? (
                    // LEAD_GENERATION Campaign
                    <>
                        {/* Standard Lead Generation (without catalog) */}
                        {isLeadGenStandard && (
                            <>
                                {/* Landing Page URL or TikTok Instant Page */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    {promotionWebsiteType === "TIKTOK_NATIVE_PAGE" ? (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                TikTok Instant Page ID
                                            </label>
                                            <input
                                                type="text"
                                                value={landingPageUrl}
                                                onChange={(e) => {
                                                    setLandingPageUrl(e.target.value);
                                                    clearFieldError("landingPageUrl");
                                                }}
                                                placeholder="TikTok Instant Page ID"
                                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    fieldErrors.landingPageUrl ? "border-red-500" : "border-gray-200"
                                                }`}
                                            />
                                            {fieldErrors.landingPageUrl && (
                                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.landingPageUrl}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Landing Page URL *
                                            </label>
                                            <input
                                                type="url"
                                                value={landingPageUrl}
                                                onChange={(e) => {
                                                    setLandingPageUrl(e.target.value);
                                                    clearFieldError("landingPageUrl");
                                                }}
                                                placeholder="https://example.com/landing"
                                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    fieldErrors.landingPageUrl ? "border-red-500" : "border-gray-200"
                                                }`}
                                                required
                                            />
                                            {fieldErrors.landingPageUrl && (
                                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.landingPageUrl}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Call to Action */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "SIGN_UP", "CONTACT_US", "APPLY_NOW"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lead Generation with Catalog (Automotive) */}
                        {isLeadGenWithCatalog && (
                            <>
                                {/* Catalog-based Lead Gen fields */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    {promotionTargetType === "EXTERNAL_WEBSITE" ? (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Landing Page URL *
                                            </label>
                                            <input
                                                type="url"
                                                value={landingPageUrl}
                                                onChange={(e) => {
                                                    setLandingPageUrl(e.target.value);
                                                    clearFieldError("landingPageUrl");
                                                }}
                                                placeholder="https://example.com/landing"
                                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    fieldErrors.landingPageUrl ? "border-red-500" : "border-gray-200"
                                                }`}
                                                required
                                            />
                                            {fieldErrors.landingPageUrl && (
                                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.landingPageUrl}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                TikTok Instant Page ID
                                            </label>
                                            <input
                                                type="text"
                                                value={landingPageUrl}
                                                onChange={(e) => {
                                                    setLandingPageUrl(e.target.value);
                                                    clearFieldError("landingPageUrl");
                                                }}
                                                placeholder="TikTok Instant Page ID"
                                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    fieldErrors.landingPageUrl ? "border-red-500" : "border-gray-200"
                                                }`}
                                            />
                                            {fieldErrors.landingPageUrl && (
                                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.landingPageUrl}</p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "CONTACT_US"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lead Generation - Phone Call */}
                        {isLeadGenPhoneCall && (
                            <>
                                {/* Phone Call Fields */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                setPhoneNumber(e.target.value);
                                                clearFieldError("phoneNumber");
                                            }}
                                            placeholder="Phone number"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.phoneNumber ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.phoneNumber && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.phoneNumber}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Region Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={phoneRegionCode}
                                            onChange={(e) => {
                                                setPhoneRegionCode(e.target.value);
                                                clearFieldError("phoneRegionCode");
                                            }}
                                            placeholder="US"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.phoneRegionCode ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.phoneRegionCode && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.phoneRegionCode}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Calling Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={phoneRegionCallingCode}
                                            onChange={(e) => {
                                                setPhoneRegionCallingCode(e.target.value);
                                                clearFieldError("phoneRegionCallingCode");
                                            }}
                                            placeholder="+1"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.phoneRegionCallingCode ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.phoneRegionCallingCode && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.phoneRegionCallingCode}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                opt.value === "CONTACT_US"
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lead Generation - Direct Message */}
                        {isLeadGenDirectMessage && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                        Auto Message ID *
                                    </label>
                                    <input
                                        type="text"
                                        value={autoMessageId}
                                        onChange={(e) => {
                                            setAutoMessageId(e.target.value);
                                            clearFieldError("autoMessageId");
                                        }}
                                        placeholder="Auto Message ID"
                                        className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                            fieldErrors.autoMessageId ? "border-red-500" : "border-gray-200"
                                        }`}
                                        required
                                    />
                                    {fieldErrors.autoMessageId && (
                                        <p className="mt-1 text-[12px] text-red-600">{fieldErrors.autoMessageId}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "CONTACT_US"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lead Generation - Social Message */}
                        {isLeadGenSocialMessage && (
                            <>
                                {isOptimizationClick && messagingAppType && ["MESSENGER", "WHATSAPP"].includes(messagingAppType) && !pageId.trim() && (
                                    <div className="mb-4">
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Tracking Message Event Set ID *
                                        </label>
                                        <input
                                            type="text"
                                            value={trackingMessageEventSetId}
                                            onChange={(e) => {
                                                setTrackingMessageEventSetId(e.target.value);
                                                clearFieldError("trackingMessageEventSetId");
                                            }}
                                            placeholder="Tracking Message Event Set ID"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.trackingMessageEventSetId ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.trackingMessageEventSetId && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.trackingMessageEventSetId}</p>
                                        )}
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "CONTACT_US"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lead Generation - Automotive (Catalog Carousel) */}
                        {isLeadGenAutomotive && isCatalogCarousel && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                        End Card CTA *
                                    </label>
                                    <Dropdown
                                        options={END_CARD_CTA_OPTIONS}
                                        value={endCardCta}
                                        onChange={(val) => {
                                            setEndCardCta(val as string);
                                            clearFieldError("endCardCta");
                                        }}
                                        placeholder="Select End Card CTA"
                                        buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${
                                            fieldErrors.endCardCta ? "border-red-500" : ""
                                        }`}
                                    />
                                    {fieldErrors.endCardCta && (
                                        <p className="mt-1 text-[12px] text-red-600">{fieldErrors.endCardCta}</p>
                                    )}
                                </div>
                                {productSpecificType === "CUSTOMIZED_PRODUCTS" && (
                                    <div className="mb-4">
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Vehicle IDs * (comma-separated, max 20)
                                        </label>
                                        <input
                                            type="text"
                                            value={vehicleIds}
                                            onChange={(e) => {
                                                setVehicleIds(e.target.value);
                                                clearFieldError("vehicleIds");
                                            }}
                                            placeholder="Vehicle ID 1, Vehicle ID 2, ..."
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.vehicleIds ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.vehicleIds && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.vehicleIds}</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : isAppPromotion ? (
                    // APP_PROMOTION Campaign
                    <>
                        {/* App Promotion - Website */}
                        {isAppPromotionWebsite && (
                            <>
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Landing Page URL
                                        </label>
                                        <input
                                            type="url"
                                            value={landingPageUrl}
                                            onChange={(e) => setLandingPageUrl(e.target.value)}
                                            placeholder="https://example.com/landing"
                                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["DOWNLOAD", "LEARN_MORE"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>

                                {/* Deeplink for App Promotion */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Deeplink
                                        </label>
                                        <input
                                            type="text"
                                            value={deeplink}
                                            onChange={(e) => {
                                                setDeeplink(e.target.value);
                                                clearFieldError("deeplink");
                                            }}
                                            placeholder="app://deeplink"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.deeplink ? "border-red-500" : "border-gray-200"
                                            }`}
                                        />
                                        {fieldErrors.deeplink && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.deeplink}</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* App Promotion - Android / iOS */}
                        {(isAppPromotionAndroid || isAppPromotionIos) && (
                            <>
                                {/* App install/retargeting - deeplink required */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Deeplink *
                                        </label>
                                        <input
                                            type="text"
                                            value={deeplink}
                                            onChange={(e) => {
                                                setDeeplink(e.target.value);
                                                clearFieldError("deeplink");
                                            }}
                                            placeholder="app://deeplink"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.deeplink ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.deeplink && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.deeplink}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["DOWNLOAD", "PLAY_GAME"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>

                                {/* Deeplink Format Type and Fallback Type */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Deeplink Format Type
                                        </label>
                                        <Dropdown
                                            options={DEEPLINK_FORMAT_TYPE_OPTIONS}
                                            value={deeplinkFormatType}
                                            onChange={(val) => setDeeplinkFormatType(val as string)}
                                            placeholder="Select Type"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Fallback Type
                                        </label>
                                        <Dropdown
                                            options={FALLBACK_TYPE_OPTIONS}
                                            value={fallbackType}
                                            onChange={(val) => setFallbackType(val as string)}
                                            placeholder="Select Fallback"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>

                                {/* Custom Product Page URL (allowlist-only) */}
                                {isAppPromotionIos && (
                                    <div className="mb-4">
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Custom Product Page URL (Allowlist Only)
                                        </label>
                                        <input
                                            type="url"
                                            value={cppUrl}
                                            onChange={(e) => setCppUrl(e.target.value)}
                                            placeholder="https://example.com/cpp"
                                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* App Promotion - Pre-registration */}
                        {isAppPromotionPreRegistration && promotionWebsiteType === "TIKTOK_NATIVE_PAGE" && (
                            <div className="mb-4">
                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                    Creative Type *
                                </label>
                                <Dropdown
                                    options={CREATIVE_TYPE_OPTIONS.filter(opt => opt.value === "CUSTOM_INSTANT_PAGE")}
                                    value={creativeType}
                                    onChange={(val) => {
                                        setCreativeType(val as string);
                                        clearFieldError("creativeType");
                                    }}
                                    placeholder="Select Creative Type"
                                    buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${
                                        fieldErrors.creativeType ? "border-red-500" : ""
                                    }`}
                                />
                                {fieldErrors.creativeType && (
                                    <p className="mt-1 text-[12px] text-red-600">{fieldErrors.creativeType}</p>
                                )}
                            </div>
                        )}
                    </>
                ) : isTraffic ? (
                    // TRAFFIC Campaign
                    <>
                        {/* Traffic - Destination Visit */}
                        {isTrafficDestinationVisit ? (
                            <>
                                {/* Destination Visit - Deeplink Format Type and Deeplink required */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Deeplink Format Type *
                                        </label>
                                        <Dropdown
                                            options={DEEPLINK_FORMAT_TYPE_OPTIONS}
                                            value={deeplinkFormatType}
                                            onChange={(val) => {
                                                setDeeplinkFormatType(val as string);
                                                clearFieldError("deeplinkFormatType");
                                            }}
                                            placeholder="Select Type"
                                            buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${
                                                fieldErrors.deeplinkFormatType ? "border-red-500" : ""
                                            }`}
                                        />
                                        {fieldErrors.deeplinkFormatType && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.deeplinkFormatType}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Deeplink *
                                        </label>
                                        <input
                                            type="text"
                                            value={deeplink}
                                            onChange={(e) => {
                                                setDeeplink(e.target.value);
                                                clearFieldError("deeplink");
                                            }}
                                            placeholder="app://deeplink"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.deeplink ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.deeplink && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.deeplink}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "WATCH_MORE"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Standard Traffic - Landing Page URL required */}
                                <div className="grid grid-cols-3 gap-6 mb-4">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Landing Page URL *
                                        </label>
                                        <input
                                            type="url"
                                            value={landingPageUrl}
                                            onChange={(e) => {
                                                setLandingPageUrl(e.target.value);
                                                clearFieldError("landingPageUrl");
                                            }}
                                            placeholder="https://example.com/landing"
                                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                fieldErrors.landingPageUrl ? "border-red-500" : "border-gray-200"
                                            }`}
                                            required
                                        />
                                        {fieldErrors.landingPageUrl && (
                                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.landingPageUrl}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                            Call to Action
                                        </label>
                                        <Dropdown
                                            options={CALL_TO_ACTION_OPTIONS.filter(opt => 
                                                ["LEARN_MORE", "SHOP_NOW", "SIGN_UP"].includes(opt.value)
                                            )}
                                            value={callToAction}
                                            onChange={(val) => setCallToAction(val as string)}
                                            placeholder="Select Call to Action"
                                            buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    // DEFAULT: Other Campaign Types (REACH, VIDEO_VIEWS, ENGAGEMENT, WEB_CONVERSIONS, etc.)
                    <>
                        {/* Common fields for other campaign types */}
                        <div className="grid grid-cols-3 gap-6 mb-4">
                            {/* Landing Page URL (conditional based on promotion type) */}
                            {isPromotionWebsite && (
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                        Landing Page URL
                                    </label>
                                    <input
                                        type="url"
                                        value={landingPageUrl}
                                        onChange={(e) => setLandingPageUrl(e.target.value)}
                                        placeholder="https://example.com/landing"
                                        className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                    />
                                </div>
                            )}

                            {/* Call to Action */}
                            <div>
                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                    Call to Action
                                </label>
                                <Dropdown
                                    options={CALL_TO_ACTION_OPTIONS}
                                    value={callToAction}
                                    onChange={(val) => setCallToAction(val as string)}
                                    placeholder="Select Call to Action"
                                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Optimization Goal - PAGE_VISIT Fields */}
                {isOptimizationPageVisit && (
                    <div className="grid grid-cols-3 gap-6 mb-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                TikTok Page Category *
                            </label>
                            <Dropdown
                                options={TIKTOK_PAGE_CATEGORY_OPTIONS}
                                value={tiktokPageCategory}
                                onChange={(val) => {
                                    setTiktokPageCategory(val as string);
                                    clearFieldError("tiktokPageCategory");
                                }}
                                placeholder="Select Category"
                                buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${
                                    fieldErrors.tiktokPageCategory ? "border-red-500" : ""
                                }`}
                            />
                            {fieldErrors.tiktokPageCategory && (
                                <p className="mt-1 text-[12px] text-red-600">{fieldErrors.tiktokPageCategory}</p>
                            )}
                        </div>
                        {tiktokPageCategory === "TIKTOK_INSTANT_PAGE" && (
                            <div>
                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                    Page ID *
                                </label>
                                <input
                                    type="text"
                                    value={pageId}
                                    onChange={(e) => {
                                        setPageId(e.target.value);
                                        clearFieldError("pageId");
                                    }}
                                    placeholder="TikTok Instant Page ID"
                                    className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                        fieldErrors.pageId ? "border-red-500" : "border-gray-200"
                                    }`}
                                    required
                                />
                                {fieldErrors.pageId && (
                                    <p className="mt-1 text-[12px] text-red-600">{fieldErrors.pageId}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Ad Format Specific Fields */}
                {/* Music ID for Carousel */}
                {(isCarousel || isCatalogCarousel) && (
                    <div className="mb-4">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Music ID * (required for Carousel)
                        </label>
                        <input
                            type="text"
                            value={musicId}
                            onChange={(e) => {
                                setMusicId(e.target.value);
                                clearFieldError("musicId");
                            }}
                            placeholder="Music ID"
                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                fieldErrors.musicId ? "border-red-500" : "border-gray-200"
                            }`}
                            required
                        />
                        {fieldErrors.musicId && (
                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.musicId}</p>
                        )}
                    </div>
                )}

                {/* Creative Type for Live Content */}
                {isLiveContent && (
                    <div className="mb-4">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Creative Type * (required for Live Content)
                        </label>
                        <Dropdown
                            options={CREATIVE_TYPE_OPTIONS.filter(opt => 
                                ["SHORT_VIDEO_LIVE", "DIRECT_LIVE"].includes(opt.value)
                            )}
                            value={creativeType}
                            onChange={(val) => {
                                setCreativeType(val as string);
                                clearFieldError("creativeType");
                            }}
                            placeholder="Select Creative Type"
                            buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${
                                fieldErrors.creativeType ? "border-red-500" : ""
                            }`}
                        />
                        {fieldErrors.creativeType && (
                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.creativeType}</p>
                        )}
                        {isLiveContent && callToAction !== "WATCH_LIVE" && (
                            <p className="text-[10px] text-yellow-600 mt-1">
                                Note: Call to Action will be automatically set to WATCH_LIVE for Live Content
                            </p>
                        )}
                    </div>
                )}

                {/* Catalog Carousel Image Index */}
                {isCatalogCarousel && (
                    <div className="mb-4">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Carousel Image Index (0-9, optional)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="9"
                            value={carouselImageIndex}
                            onChange={(e) => setCarouselImageIndex(e.target.value)}
                            placeholder="0"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>
                )}

                {/* Spark Ads Pull - TikTok Item ID */}
                {isSparkAdsPull && (
                    <div className="mb-4">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            TikTok Item ID * (required for Spark Ads Pull)
                        </label>
                        <input
                            type="text"
                            value={tiktokItemId}
                            onChange={(e) => {
                                setTiktokItemId(e.target.value);
                                clearFieldError("tiktokItemId");
                            }}
                            placeholder="TikTok Item ID"
                            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                fieldErrors.tiktokItemId ? "border-red-500" : "border-gray-200"
                            }`}
                            required
                        />
                        {fieldErrors.tiktokItemId && (
                            <p className="mt-1 text-[12px] text-red-600">{fieldErrors.tiktokItemId}</p>
                        )}
                    </div>
                )}

                {/* Spark Ads - Promotional Music and Duet/Stitch Settings */}
                {(isIdentityAuthCode || isIdentityBcAuthTt) && (
                    <div className="grid grid-cols-3 gap-6 mb-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Promotional Music Disabled
                            </label>
                            <Dropdown
                                options={[
                                    { value: "false", label: "Enabled" },
                                    { value: "true", label: "Disabled" },
                                ]}
                                value={promotionalMusicDisabled ? "true" : "false"}
                                onChange={(val) => setPromotionalMusicDisabled(val === "true")}
                                placeholder="Select Status"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Item Duet Status
                            </label>
                            <Dropdown
                                options={ITEM_DUET_STATUS_OPTIONS}
                                value={itemDuetStatus}
                                onChange={(val) => setItemDuetStatus(val as string)}
                                placeholder="Select Status"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Item Stitch Status
                            </label>
                            <Dropdown
                                options={ITEM_STITCH_STATUS_OPTIONS}
                                value={itemStitchStatus}
                                onChange={(val) => setItemStitchStatus(val as string)}
                                placeholder="Select Status"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                            />
                        </div>
                    </div>
                )}

                {/* RF_REACH - Schedule ID */}
                {isRfReach && (
                    <div className="mb-4">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Schedule ID (for sequenced delivery)
                        </label>
                        <input
                            type="text"
                            value={scheduleId}
                            onChange={(e) => setScheduleId(e.target.value)}
                            placeholder="Schedule ID"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>
                )}

                {/* UTM Params (conditional - supported for certain scenarios) */}
                {supportsUtmParams && (
                    <div className="mb-4">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            UTM Parameters (optional)
                        </label>
                        <div className="space-y-2">
                            {utmParams.map((param, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={param.key}
                                        readOnly
                                        className="flex-1 bg-gray-100 px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-gray-600"
                                    />
                                    <input
                                        type="text"
                                        value={param.value}
                                        readOnly
                                        className="flex-1 bg-gray-100 px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setUtmParams(utmParams.filter((_, i) => i !== index))}
                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-[11.2px]"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={utmParamKey}
                                    onChange={(e) => setUtmParamKey(e.target.value)}
                                    placeholder="UTM Key (e.g., utm_source)"
                                    className="flex-1 bg-white px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                />
                                <input
                                    type="text"
                                    value={utmParamValue}
                                    onChange={(e) => setUtmParamValue(e.target.value)}
                                    placeholder="UTM Value"
                                    className="flex-1 bg-white px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (utmParamKey.trim() && utmParamValue.trim()) {
                                            setUtmParams([...utmParams, { key: utmParamKey.trim(), value: utmParamValue.trim() }]);
                                            setUtmParamKey("");
                                            setUtmParamValue("");
                                        }
                                    }}
                                    className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] text-[11.2px]"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Disclaimer Fields (allowlist-only) */}
                {supportsDisclaimers && (
                    <div className="mb-4 space-y-3">
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Disclaimer Fields (Allowlist Only)
                        </label>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Disclaimer Type
                            </label>
                            <Dropdown
                                options={DISCLAIMER_TYPE_OPTIONS}
                                value={disclaimerType}
                                onChange={(val) => setDisclaimerType(val as string)}
                                placeholder="Select Type"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Disclaimer Text
                            </label>
                            <textarea
                                value={disclaimerText}
                                onChange={(e) => setDisclaimerText(e.target.value)}
                                placeholder="Disclaimer text"
                                rows={2}
                                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Disclaimer Clickable Texts
                            </label>
                            <input
                                type="text"
                                value={disclaimerClickableTexts}
                                onChange={(e) => setDisclaimerClickableTexts(e.target.value)}
                                placeholder="Clickable text"
                                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            />
                        </div>
                    </div>
                )}

                {/* Common Optional Fields: Tracking Pixel (shown for all scenarios) */}
                <div className="grid grid-cols-3 gap-6 mb-4">
                    {/* Tracking Pixel (optional for all) */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                            Tracking Pixel ID
                        </label>
                        <input
                            type="text"
                            value={trackingPixelId}
                            onChange={(e) => setTrackingPixelId(e.target.value)}
                            placeholder="Pixel ID for tracking"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Ad"}
                </button>
            </div>
        </div>
    );
};
