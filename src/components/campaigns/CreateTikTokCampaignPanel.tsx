import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface CreateTikTokCampaignData {
    // Core Required
    campaign_name: string;
    objective_type: string;
    // Conditionally Required
    advertiser_id?: string;
    app_promotion_type?: string;
    virtual_objective_type?: string;
    sales_destination?: string;
    campaign_product_source?: string;
    app_id?: string;
    // Optional & Advanced
    budget?: number;
    budget_mode?: string;
    campaign_type?: string;
    budget_optimize_on?: boolean;
    special_industries?: string[];
    is_search_campaign?: boolean;
    is_advanced_dedicated_campaign?: boolean;
    disable_skan_campaign?: boolean;
    campaign_app_profile_page_state?: string;
    rf_campaign_type?: string;
    catalog_enabled?: boolean;
    request_id?: string;
    operation_status?: string;
    postback_window_mode?: string;
    rta_id?: string;
    rta_bid_enabled?: boolean;
    rta_product_selection_enabled?: boolean;
}

interface CreateTikTokCampaignPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateTikTokCampaignData) => Promise<void>;
    loading?: boolean;
    submitError?: string | null;
    profiles?: Array<{ advertiser_id: string; advertiser_name: string }>;
    mode?: "create" | "edit";
    initialData?: Partial<CreateTikTokCampaignData> | null;
    campaignId?: string | number;
}

const OBJECTIVE_TYPES = [
    // Objective types with implemented forms (shown first)
    { value: "WEB_CONVERSIONS", label: "Website Conversions" },
    { value: "APP_PROMOTION", label: "App Promotion" },
    { value: "PRODUCT_SALES", label: "Product Sales" },
    { value: "SALES_MERGED", label: "Sales (Merged – Website / App / TikTok Shop)" },
    { value: "REACH", label: "Reach" },
    { value: "TRAFFIC", label: "Traffic" },
    { value: "VIDEO_VIEWS", label: "Video Views" },
    { value: "LEAD_GENERATION", label: "Lead Generation" },
    { value: "ENGAGEMENT", label: "Engagement" },
];

const APP_PROMOTION_TYPES = [
    { value: "UNSET", label: "Not Applicable" },
    { value: "APP_INSTALL", label: "App Install" },
    { value: "APP_RETARGETING", label: "App Retargeting" },
    { value: "APP_PRE_REGISTRATION", label: "App Pre-Registration" },
];

const APP_PLATFORMS = [
    { value: "IOS", label: "iOS" },
    { value: "ANDROID", label: "Android" },
];

const BUDGET_MODES = [
    { value: "BUDGET_MODE_DAY", label: "Daily" },
    { value: "BUDGET_MODE_TOTAL", label: "Lifetime" },
    { value: "BUDGET_MODE_DYNAMIC_DAILY_BUDGET", label: "Dynamic Daily Budget" },
    { value: "BUDGET_MODE_INFINITE", label: "No Limit" },
];

const PRODUCT_SOURCES = [
    { value: "TIKTOK_SHOP", label: "TikTok Shop" },
    { value: "PRODUCT_CATALOG_WEBSITE", label: "Product Catalog – Website" },
    { value: "PRODUCT_CATALOG_APP", label: "Product Catalog – App" },
];

const SALES_DESTINATIONS = [
    { value: "TIKTOK_SHOP", label: "TikTok Shop" },
    { value: "WEBSITE", label: "Website" },
    { value: "APP", label: "App" },
];

const STATUS_OPTIONS = [
    { value: "ENABLE", label: "Enable" },
    { value: "DISABLE", label: "Disable" },
];

// Toggle Switch Component
const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
    description?: string;
}> = ({ enabled, onChange, label, description }) => (
    <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`w-7 h-4 rounded-lg p-[1.56px] flex items-center transition-all ${
                    enabled ? "bg-[#136D6D] justify-end" : "bg-gray-300 justify-start"
                }`}
            >
                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
            </button>
            {label && <span className="text-[16px] font-medium text-[#072929]">{label}</span>}
        </div>
            {description && (
                <div className="pl-11">
                    <p className="text-xs text-[#BFBFBF] leading-4 tracking-tight">{description}</p>
                </div>
            )}
    </div>
);

export const CreateTikTokCampaignPanel: React.FC<CreateTikTokCampaignPanelProps> = ({
    isOpen,
    onClose,
    onSubmit,
    loading = false,
    submitError = null,
    profiles = [],
    mode = "create",
    initialData = null,
    campaignId,
}) => {
    // Form state
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [objectiveType, setObjectiveType] = useState<string>("");
    const [campaignName, setCampaignName] = useState<string>("");
    const [errors, setErrors] = useState<Partial<Record<keyof CreateTikTokCampaignData, string>>>({});
    const [genericErrors, setGenericErrors] = useState<string[]>([]);
    const [appPromotionType, setAppPromotionType] = useState<string>("UNSET");
    const [appPlatform, setAppPlatform] = useState<string>("");
    const [appSelection, setAppSelection] = useState<string>("");
    const [ios14Dedicated, setIos14Dedicated] = useState<boolean>(false);
    const [smartPlusCampaign, setSmartPlusCampaign] = useState<boolean>(false);
    const [productSource, setProductSource] = useState<string>("");
    const [tiktokShopAccount, setTiktokShopAccount] = useState<string>("");
    const [productCatalog, setProductCatalog] = useState<string>("");
    const [productCatalogAppPlatform, setProductCatalogAppPlatform] = useState<string>("");
    const [appId, setAppId] = useState<string>("");
    const [optimizationLocation, setOptimizationLocation] = useState<string>("Website (Read-only (Auto))");
    const [currency, setCurrency] = useState<string>("USD (auto)");
    const [checkout, setCheckout] = useState<string>("In-app (auto)");
    const [upgradeSalesObjective, setUpgradeSalesObjective] = useState<boolean>(true);
    const [salesDestination, setSalesDestination] = useState<string>("");
    const [budgetMode, setBudgetMode] = useState<string>("BUDGET_MODE_DAY");
    const [budget, setBudget] = useState<string>("");
    const [budgetOptimizeOn, setBudgetOptimizeOn] = useState<boolean>(false);
    const [isDedicatedCampaign, setIsDedicatedCampaign] = useState<boolean>(false);
    const [disableSkanCampaign, setDisableSkanCampaign] = useState<boolean>(false);
    const [status, setStatus] = useState<string>("ENABLE");

    // Load initial data when in edit mode
    useEffect(() => {
        if (isOpen && mode === "edit" && initialData) {
            if (initialData.campaign_name) setCampaignName(initialData.campaign_name);
            if (initialData.objective_type) setObjectiveType(initialData.objective_type);
            if (initialData.advertiser_id) setSelectedProfile(initialData.advertiser_id);
            if (initialData.budget_mode) setBudgetMode(initialData.budget_mode);
            if (initialData.budget !== undefined) setBudget(String(initialData.budget));
            if (initialData.budget_optimize_on !== undefined) setBudgetOptimizeOn(initialData.budget_optimize_on);
            if ((initialData as any).operation_status) setStatus((initialData as any).operation_status);
        } else if (!isOpen || mode === "create") {
            // Reset form when closing or switching to create mode
            setSelectedProfile("");
            setObjectiveType("");
            setCampaignName("");
            setBudgetMode("BUDGET_MODE_DAY");
            setBudget("");
            setBudgetOptimizeOn(false);
            setStatus("ENABLE");
        }
    }, [isOpen, mode, initialData]);

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

    // Auto-switch budget mode when CBO is toggled off for objectives where Daily is deprecated
    useEffect(() => {
        const deprecatedDailyObjectives = ["REACH", "VIDEO_VIEWS", "ENGAGEMENT"];
        if (deprecatedDailyObjectives.includes(objectiveType) && 
            !budgetOptimizeOn && 
            budgetMode === "BUDGET_MODE_DAY") {
            setBudgetMode("BUDGET_MODE_DYNAMIC_DAILY_BUDGET");
        }
    }, [budgetOptimizeOn, objectiveType, budgetMode]);

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof CreateTikTokCampaignData, string>> = {};

        // In edit mode, only validate editable fields
        if (mode === "edit") {
            if (!campaignName.trim()) {
                newErrors.campaign_name = "Campaign name is required";
            } else if (campaignName.length > 512) {
                newErrors.campaign_name = "Campaign name must be 512 characters or less";
            }

            if (budgetMode !== "BUDGET_MODE_INFINITE") {
                const budgetValue = budget ? parseFloat(budget) : 0;
                if (budgetValue <= 0) {
                    newErrors.budget = "Budget must be greater than 0";
                } else if (budgetValue < 0.01) {
                    newErrors.budget = "Budget must be at least 0.01";
                }
            }

            setErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        }

        // Create mode - full validation
        if (!campaignName.trim()) {
            newErrors.campaign_name = "Campaign name is required";
        } else if (campaignName.length > 512) {
            newErrors.campaign_name = "Campaign name must be 512 characters or less";
        }

        if (!objectiveType) {
            newErrors.objective_type = "Campaign objective is required";
        }

        // Budget validation
        if (budgetMode !== "BUDGET_MODE_INFINITE") {
            if (!budget || budget.trim() === "") {
                newErrors.budget = "Budget is required when budget mode is not 'No Limit'";
            } else {
                const budgetValue = parseFloat(budget);
                if (isNaN(budgetValue)) {
                    newErrors.budget = "Budget must be a valid number";
                } else if (budgetValue <= 0) {
                    newErrors.budget = "Budget must be greater than 0";
                } else if (budgetValue < 0.01) {
                    newErrors.budget = "Budget must be at least 0.01";
                }
            }
        }

        // Conditionally required fields based on objective_type
        if (objectiveType === "APP_PROMOTION") {
            if (!appPromotionType || appPromotionType === "UNSET") {
                newErrors.app_promotion_type = "App promotion type is required for App Promotion objective";
            }
        }

        if (objectiveType === "PRODUCT_SALES") {
            if (!productSource) {
                newErrors.campaign_product_source = "Product source is required for Product Sales objective";
            }
        }

        if (objectiveType === "SALES_MERGED") {
            if (!salesDestination) {
                newErrors.sales_destination = "Sales destination is required for Sales (Merged) objective";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resetForm = () => {
        setSelectedProfile("");
        setObjectiveType("");
        setCampaignName("");
        setAppPromotionType("UNSET");
        setAppPlatform("");
        setAppSelection("");
        setIos14Dedicated(false);
        setSmartPlusCampaign(false);
        setProductSource("");
        setTiktokShopAccount("");
        setProductCatalog("");
        setProductCatalogAppPlatform("");
        setAppId("");
        setOptimizationLocation("Website (Read-only (Auto))");
        setCurrency("USD (auto)");
        setCheckout("In-app (auto)");
        setUpgradeSalesObjective(true);
        setSalesDestination("");
        setBudgetMode("BUDGET_MODE_DAY");
        setBudget("");
        setBudgetOptimizeOn(false);
        setIsDedicatedCampaign(false);
        setDisableSkanCampaign(false);
        setStatus("ENABLED");
        setErrors({});
        setGenericErrors([]);
    };

    const handleSubmit = async () => {
        // Validate before submitting
        if (!validate()) {
            return;
        }

        if (mode === "edit") {
            // In edit mode, only send updatable fields (campaign_name, budget, objective_type)
            const data: CreateTikTokCampaignData = {
                campaign_name: campaignName.trim(),
                budget: budget ? parseFloat(budget) : undefined,
                objective_type: objectiveType,
            };
            try {
                await onSubmit(data);
                // Only reset on success - parent component handles closing
                resetForm();
            } catch (error) {
                // Error handling is done in parent component
                // Don't reset form on error - let user fix and resubmit
                console.error("Submit error:", error);
            }
            return;
        }

        // Create mode - full validation and data

        const data: CreateTikTokCampaignData = {
            campaign_name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
            objective_type: objectiveType,
            budget_mode: budgetMode,
            budget: budget ? parseFloat(budget) : undefined,
            budget_optimize_on: budgetOptimizeOn,
            is_advanced_dedicated_campaign: isDedicatedCampaign,
            disable_skan_campaign: disableSkanCampaign,
            operation_status: status,
        };

        if (selectedProfile) {
            data.advertiser_id = selectedProfile;
        }

        if (appPromotionType && appPromotionType !== "UNSET") {
            data.app_promotion_type = appPromotionType;
        }

        // App Promotion iOS specific fields
        if (objectiveType === "APP_PROMOTION") {
            if (appPlatform) {
                (data as any).app_platform = appPlatform;
            }
            if (appSelection) {
                (data as any).app_id = appSelection;
            }
            // Set campaign_type for iOS14 Dedicated campaigns
            if (ios14Dedicated && appPlatform === "IOS" && appPromotionType === "APP_INSTALL") {
                data.campaign_type = "IOS14_CAMPAIGN";
            }
            if (smartPlusCampaign) {
                (data as any).smart_plus_campaign = smartPlusCampaign;
            }
        }

        // Product Sales specific fields
        if (objectiveType === "PRODUCT_SALES") {
            if (productSource) {
                // Map UI values to TikTok API values
                const apiProductSource = productSource === "TIKTOK_SHOP" ? "STORE" : "CATALOG";
                (data as any).campaign_product_source = apiProductSource;
                
                // Auto-enable catalog for catalog-based product sources
                if (productSource === "PRODUCT_CATALOG_WEBSITE" || productSource === "PRODUCT_CATALOG_APP") {
                    data.catalog_enabled = true;
                }
            }
            if (isTikTokShop && tiktokShopAccount) {
                (data as any).tiktok_shop_account = tiktokShopAccount;
            }
            if ((isProductCatalogWebsite || isProductCatalogApp) && productCatalog) {
                (data as any).product_catalog = productCatalog;
            }
            if (isProductCatalogApp) {
                if (productCatalogAppPlatform) {
                    (data as any).app_platform = productCatalogAppPlatform;
                }
                if (appId) {
                    (data as any).app_id = appId;
                }
            }
            if (salesDestination) {
                data.sales_destination = salesDestination;
            }
            if (upgradeSalesObjective) {
                (data as any).upgrade_sales_objective = upgradeSalesObjective;
            }
        }

        // Sales Merged specific fields
        if (objectiveType === "SALES_MERGED") {
            // Set virtual_objective_type for the new Sales objective
            data.virtual_objective_type = "SALES";
            if (salesDestination) {
                data.sales_destination = salesDestination;
            }
        }

        try {
            await onSubmit(data);
            // Only reset form on success - parent component handles closing
            resetForm();
        } catch (error) {
            // Error handling is done in parent component
            // Don't reset form on error - let user fix and resubmit
            console.error("Submit error:", error);
        }
    };

    if (!isOpen) return null;

    // In edit mode, only show editable fields (campaign_name, budget)
    // In create mode, show all fields based on objective selection
    const showAdditionalFields = mode === "edit" ? true : !!objectiveType;
    const isWebConversions = objectiveType === "WEB_CONVERSIONS";
    const isAppPromotion = objectiveType === "APP_PROMOTION";
    const isAppPromotionIOS = isAppPromotion && appPlatform === "IOS";
    const isAppPromotionAndroid = isAppPromotion && appPlatform === "ANDROID";
    const isAppInstall = appPromotionType === "APP_INSTALL";
    const isProductSales = objectiveType === "PRODUCT_SALES";
    const isProductCatalogWebsite = isProductSales && productSource === "PRODUCT_CATALOG_WEBSITE";
    const isProductCatalogApp = isProductSales && productSource === "PRODUCT_CATALOG_APP";
    const isTikTokShop = isProductSales && productSource === "TIKTOK_SHOP";
    const isSalesMerged = objectiveType === "SALES_MERGED";
    const isReach = objectiveType === "REACH";
    const isTraffic = objectiveType === "TRAFFIC";
    const isVideoViews = objectiveType === "VIDEO_VIEWS";
    const isLeadGeneration = objectiveType === "LEAD_GENERATION";
    const isEngagement = objectiveType === "ENGAGEMENT";

    // Auto-set Sales Destination and Optimization Location based on Product Source
    useEffect(() => {
        if (isProductCatalogWebsite) {
            if (salesDestination !== "WEBSITE") {
                setSalesDestination("WEBSITE");
            }
            if (optimizationLocation !== "Website (Read-only (Auto))") {
                setOptimizationLocation("Website (Read-only (Auto))");
            }
        } else if (isProductCatalogApp) {
            if (salesDestination !== "APP") {
                setSalesDestination("APP");
            }
            if (optimizationLocation !== "App (Read-only (Auto))") {
                setOptimizationLocation("App (Read-only (Auto))");
            }
        }
    }, [isProductCatalogWebsite, isProductCatalogApp, salesDestination, optimizationLocation]);

    return (
        <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-6">
            <div className="p-4 border-b border-gray-200">

                <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
                    {mode === "edit" ? "Edit Campaign" : "Create Campaign"}
                </h2>

                {/* Validation Errors Banner */}
                {(Object.values(errors).filter(Boolean).length > 0 || genericErrors.length > 0) && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-[13px] font-semibold text-red-600 mb-2">
                            Please fix the following errors:
                        </p>
                        {Object.values(errors).filter(Boolean).length > 0 && (
                            <ul className="list-disc list-inside text-[12px] text-red-600 space-y-1 mb-2">
                                {Object.entries(errors)
                                    .filter(([_, error]) => error)
                                    .map(([field, error]) => (
                                        <li key={field}>{error}</li>
                                    ))}
                            </ul>
                        )}
                        {genericErrors.length > 0 && (
                            <ul className="list-disc list-inside text-[12px] text-red-600 space-y-1">
                                {genericErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Profile & Campaign Objective Row */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Profile */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Profile
                            </label>
                            <Dropdown
                                options={profiles.map((profile) => ({
                                    value: profile.advertiser_id,
                                    label: profile.advertiser_name,
                                }))}
                                value={selectedProfile}
                                onChange={(val) => setSelectedProfile(val as string)}
                                placeholder="Tricon Tech LLC"
                                buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${mode === "edit" ? "opacity-60 cursor-not-allowed" : ""}`}
                                disabled={mode === "edit"}
                            />
                        </div>

                        {/* Campaign Objective */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                Campaign Objective
                            </label>
                            <Dropdown
                                options={OBJECTIVE_TYPES}
                                value={objectiveType}
                                onChange={(val) => {
                                    setObjectiveType(val as string);
                                    if (errors.objective_type) {
                                        setErrors({ ...errors, objective_type: undefined });
                                    }
                                }}
                                placeholder="Select Campaign Objective Type"
                                buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${mode === "edit" ? "opacity-60 cursor-not-allowed" : ""} ${
                                    errors.objective_type ? 'border-red-500' : ''
                                }`}
                                disabled={mode === "edit"}
                            />
                            {errors.objective_type && (
                                <p className="mt-1 text-[12px] text-red-600">{errors.objective_type}</p>
                            )}
                        </div>
                    </div>

                    {/* Additional Fields - Show when Objective is selected (or in edit mode) */}
                    {showAdditionalFields && (
                        <>
                            {mode === "edit" ? (
                                <>
                                    {/* Edit Mode - Only show editable fields (campaign_name, budget) */}
                                    {/* Row 2: Campaign Name - Edit Mode Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => {
                                                    setCampaignName(e.target.value);
                                                    if (errors.campaign_name) {
                                                        setErrors({ ...errors, campaign_name: undefined });
                                                    }
                                                }}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    errors.campaign_name ? 'border-red-500' : 'border-gray-200'
                                                }`}
                                            />
                                            {errors.campaign_name && (
                                                <p className="mt-1 text-[12px] text-red-600">{errors.campaign_name}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 3: Budget Type, Budget - Edit Mode Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => m.value !== "BUDGET_MODE_INFINITE")}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] opacity-60 cursor-not-allowed"
                                                disabled={true}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                {budgetMode === "BUDGET_MODE_DAY" ? "Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Dynamic Daily Budget" : "Budget"}
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => {
                                                    setBudget(e.target.value);
                                                    if (errors.budget) {
                                                        setErrors({ ...errors, budget: undefined });
                                                    }
                                                }}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Enter Dynamic Daily Budget" : "Enter Budget"}
                                                className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    errors.budget ? 'border-red-500' : 'border-gray-200'
                                                }`}
                                            />
                                            {errors.budget && (
                                                <p className="mt-1 text-[12px] text-red-600">{errors.budget}</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : isProductSales ? (
                                <>
                                    {/* Row 2: Campaign Name, Product Source - Product Sales Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => {
                                                    setCampaignName(e.target.value);
                                                    if (errors.campaign_name) {
                                                        setErrors({ ...errors, campaign_name: undefined });
                                                    }
                                                }}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className={`bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                                    errors.campaign_name ? 'border-red-500' : 'border-gray-200'
                                                }`}
                                            />
                                            {errors.campaign_name && (
                                                <p className="mt-1 text-[12px] text-red-600">{errors.campaign_name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Product Source
                                            </label>
                                            <Dropdown
                                                options={PRODUCT_SOURCES}
                                                value={productSource}
                                                onChange={(val) => setProductSource(val as string)}
                                                placeholder="Select Product Source"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Conditional fields based on Product Source */}
                                    {isTikTokShop ? (
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                    TikTok Shop Account
                                                </label>
                                                <Dropdown
                                                    options={[]} // TODO: Link to TikTok Shop accounts
                                                    value={tiktokShopAccount}
                                                    onChange={(val) => setTiktokShopAccount(val as string)}
                                                    placeholder="Select TikTok Shop Account"
                                                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                    Currency
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currency}
                                                    readOnly
                                                    className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#BFBFBF] focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                    Checkout
                                                </label>
                                                <input
                                                    type="text"
                                                    value={checkout}
                                                    readOnly
                                                    className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#BFBFBF] focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    ) : isProductCatalogWebsite ? (
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                    Product Catalog
                                                </label>
                                                <Dropdown
                                                    options={[]} // TODO: Link to product catalogs
                                                    value={productCatalog}
                                                    onChange={(val) => setProductCatalog(val as string)}
                                                    placeholder="Select Product Catalog"
                                                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                    Optimization Location
                                                </label>
                                                <input
                                                    type="text"
                                                    value={optimizationLocation}
                                                    readOnly
                                                    disabled
                                                    className="bg-[#F0F0ED] w-full px-4 py-2.5 h-[38px] border border-[#D1D1C7] rounded-lg text-[14px] text-[#072929] focus:outline-none cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    ) : isProductCatalogApp ? (
                                        <>
                                            {/* Row 2: Product Catalog - Product Catalog App Only */}
                                            <div className="grid grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        Product Catalog
                                                    </label>
                                                    <Dropdown
                                                        options={[]} // TODO: Link to product catalogs
                                                        value={productCatalog}
                                                        onChange={(val) => setProductCatalog(val as string)}
                                                        placeholder="Select Product Catalog"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 3: App Platform, App ID, Optimization Location - Product Catalog App Only */}
                                            <div className="grid grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        App Platform
                                                    </label>
                                                    <Dropdown
                                                        options={APP_PLATFORMS}
                                                        value={productCatalogAppPlatform}
                                                        onChange={(val) => setProductCatalogAppPlatform(val as string)}
                                                        placeholder="Select iOS / Android"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        App ID
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={appId}
                                                        onChange={(e) => setAppId(e.target.value)}
                                                        placeholder="Enter the package name (Android) or bundle ID (iOS)"
                                                        className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        Optimization Location
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={optimizationLocation}
                                                        readOnly
                                                        disabled
                                                        className="bg-[#F0F0ED] w-full px-4 py-2.5 h-[38px] border border-[#D1D1C7] rounded-lg text-[14px] text-[#072929] focus:outline-none cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : null}

                                    {/* Row 4: Upgrade to Sales Objective, Sales Destination - Product Sales Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setUpgradeSalesObjective(!upgradeSalesObjective)}
                                                    className={`w-7 h-4 rounded-lg p-[1.56px] flex items-center transition-all ${
                                                        upgradeSalesObjective ? "bg-[#136D6D] justify-end" : "bg-gray-300 justify-start"
                                                    }`}
                                                >
                                                    <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                                </button>
                                                <span className="text-[16px] font-medium text-[#072929]">
                                                    Upgrade to Sales Objective (Recommended)
                                                </span>
                                            </div>
                                        </div>

                                        {upgradeSalesObjective && (
                                            <div>
                                                <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                    Sales Destination
                                                </label>
                                                <Dropdown
                                                    options={SALES_DESTINATIONS}
                                                    value={salesDestination}
                                                    onChange={(val) => setSalesDestination(val as string)}
                                                    placeholder={
                                                        isProductCatalogWebsite 
                                                            ? "Website" 
                                                            : isProductCatalogApp 
                                                            ? "App" 
                                                            : "Select Sales Destination"
                                                    }
                                                    buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 5: Enable CBO, Budget Type - Product Sales Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => m.value === "BUDGET_MODE_INFINITE")}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 6: Status - Product Sales Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isSalesMerged ? (
                                <>
                                    {/* Row 2: Campaign Name, Sales Destination, Info Box - Sales Merged */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Sales Destination
                                            </label>
                                            <Dropdown
                                                options={SALES_DESTINATIONS}
                                                value={salesDestination}
                                                onChange={(val) => setSalesDestination(val as string)}
                                                placeholder="Select Sales Destination"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div className="flex flex-col pt-6">
                                            <div className="flex items-start gap-2">
                                                <svg
                                                    className="w-4 h-4 text-[#136D6D] flex-shrink-0 mt-0.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-xs text-[#072929] leading-4 tracking-tight">
                                                        TikTok Pixel required<br />
                                                        Conversion events (Purchase, Add to Cart) must be configured
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 3: Enable CBO, Budget Type, Budget - Sales Merged */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => m.value !== "BUDGET_MODE_INFINITE")}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : "Enter Dynamic Daily Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Sales Merged */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isAppPromotion ? (
                                <>
                                    {/* Row 2: Campaign Name, App Promotion Type, App Platform - App Promotion */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                App Promotion Type
                                            </label>
                                            <Dropdown
                                                options={APP_PROMOTION_TYPES.filter(t => t.value !== "UNSET")}
                                                value={appPromotionType}
                                                onChange={(val) => setAppPromotionType(val as string)}
                                                placeholder="Select App Promotion Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                App Platform
                                            </label>
                                            <Dropdown
                                                options={APP_PLATFORMS}
                                                value={appPlatform}
                                                onChange={(val) => setAppPlatform(val as string)}
                                                placeholder="Select App Platform"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>

                                    {/* Platform-specific fields - Show based on App Platform selection */}
                                    {isAppPromotionAndroid ? (
                                        <>
                                            {/* Row 3: App Selection - Android Only (no iOS14 or Smart+ toggles) */}
                                            <div className="grid grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        App Selection
                                                    </label>
                                                    <Dropdown
                                                        options={[]} // TODO: Link to TikTok app list
                                                        value={appSelection}
                                                        onChange={(val) => setAppSelection(val as string)}
                                                        placeholder="Dropdown (linked to TikTok app list)"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 4: Enable CBO, Budget Type, Average Daily Budget - Android Only */}
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="flex flex-col gap-1">
                                                    <ToggleSwitch
                                                        enabled={budgetOptimizeOn}
                                                        onChange={setBudgetOptimizeOn}
                                                        label="Enable Campaign Budget Optimization"
                                                        description="Distribute budget automatically across ad groups for better performance."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        Budget Type
                                                    </label>
                                                    <Dropdown
                                                        options={BUDGET_MODES}
                                                        value={budgetMode}
                                                        onChange={(val) => setBudgetMode(val as string)}
                                                        placeholder="Select Budget Type"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        {budgetMode === "BUDGET_MODE_DAY" 
                                                            ? "Average Daily Budget" 
                                                            : budgetMode === "BUDGET_MODE_TOTAL"
                                                            ? "Lifetime Budget"
                                                            : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET"
                                                            ? "Dynamic Daily Budget"
                                                            : "Budget"}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={budget}
                                                        onChange={(e) => setBudget(e.target.value)}
                                                        placeholder={
                                                            budgetMode === "BUDGET_MODE_DAY"
                                                                ? "Enter Daily Budget"
                                                                : budgetMode === "BUDGET_MODE_TOTAL"
                                                                ? "Enter Lifetime Budget"
                                                                : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET"
                                                                ? "Enter Dynamic Daily Budget"
                                                                : "Enter Budget"
                                                        }
                                                        className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 5: Status - Android Only */}
                                            <div className="grid grid-cols-1 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        Status
                                                    </label>
                                                    <Dropdown
                                                        options={STATUS_OPTIONS}
                                                        value={status}
                                                        onChange={(val) => setStatus(val as string)}
                                                        placeholder="Select Status"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : isAppPromotionIOS ? (
                                        <>
                                            {/* Row 3: App Selection, iOS14 Dedicated Campaign, Smart+ Campaign - App Promotion iOS Only */}
                                            <div className="grid grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        App Selection
                                                    </label>
                                                    <Dropdown
                                                        options={[]} // TODO: Link to TikTok app list
                                                        value={appSelection}
                                                        onChange={(val) => setAppSelection(val as string)}
                                                        placeholder="Dropdown (linked to TikTok app list)"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>

                                                {/* iOS14 Dedicated Campaign - Only show for App Install */}
                                                {isAppInstall && (
                                                    <div className="flex flex-col gap-1">
                                                        <ToggleSwitch
                                                            enabled={ios14Dedicated}
                                                            onChange={setIos14Dedicated}
                                                            label="iOS14 Dedicated Campaign"
                                                            description="Allowed only if App Promotion Type = App Install. Not allowed for App Retargeting / Pre-Registration"
                                                        />
                                                    </div>
                                                )}

                                                {/* Smart+ Campaign - Only show for App Install */}
                                                {isAppInstall && (
                                                    <div className="flex flex-col gap-1">
                                                        <ToggleSwitch
                                                            enabled={smartPlusCampaign}
                                                            onChange={setSmartPlusCampaign}
                                                            label="Smart+ Campaign (Optional)"
                                                            description="Supported only for App Install. Not supported for Retargeting / Pre-Registration"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Row 4: Enable CBO, Budget Type, Budget - App Promotion iOS Only */}
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="flex flex-col gap-1">
                                                    <ToggleSwitch
                                                        enabled={budgetOptimizeOn}
                                                        onChange={setBudgetOptimizeOn}
                                                        label="Enable Campaign Budget Optimization"
                                                        description="Distribute budget automatically across ad groups for better performance."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        Budget Type
                                                    </label>
                                                    <Dropdown
                                                        options={BUDGET_MODES.filter(m => m.value === "BUDGET_MODE_DAY" || m.value === "BUDGET_MODE_TOTAL")}
                                                        value={budgetMode}
                                                        onChange={(val) => setBudgetMode(val as string)}
                                                        placeholder="Select Budget Type"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        {budgetMode === "BUDGET_MODE_DAY" 
                                                            ? "Daily Budget" 
                                                            : budgetMode === "BUDGET_MODE_TOTAL"
                                                            ? "Lifetime Budget"
                                                            : "Budget"}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={budget}
                                                        onChange={(e) => setBudget(e.target.value)}
                                                        placeholder={
                                                            budgetMode === "BUDGET_MODE_DAY"
                                                                ? "Enter Daily Budget"
                                                                : budgetMode === "BUDGET_MODE_TOTAL"
                                                                ? "Enter Lifetime Budget"
                                                                : "Enter Budget"
                                                        }
                                                        className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 5: Status - App Promotion iOS Only */}
                                            <div className="grid grid-cols-1 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                        Status
                                                    </label>
                                                    <Dropdown
                                                        options={STATUS_OPTIONS}
                                                        value={status}
                                                        onChange={(val) => setStatus(val as string)}
                                                        placeholder="Select Status"
                                                        buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </>
                            ) : isReach ? (
                                <>
                                    {/* Row 2: Campaign Name - Reach Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Enable CBO, Budget Type, Budget - Reach Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => {
                                                    if (m.value === "BUDGET_MODE_INFINITE") return false;
                                                    // BUDGET_MODE_DAY is deprecated for REACH when CBO is disabled
                                                    if (!budgetOptimizeOn && m.value === "BUDGET_MODE_DAY") return false;
                                                    return true;
                                                })}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : "Enter Dynamic Daily Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Reach Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isTraffic ? (
                                <>
                                    {/* Row 2: Campaign Name - Traffic Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Enable CBO, Budget Type, Budget - Traffic Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => m.value !== "BUDGET_MODE_INFINITE")}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                {budgetMode === "BUDGET_MODE_DAY" ? "Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Dynamic Daily Budget" : "Budget"}
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Enter Dynamic Daily Budget" : "Enter Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Traffic Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isVideoViews ? (
                                <>
                                    {/* Row 2: Campaign Name - Video Views Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Enable CBO, Budget Type, Budget - Video Views Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => {
                                                    if (m.value === "BUDGET_MODE_INFINITE") return false;
                                                    // BUDGET_MODE_DAY is deprecated for VIDEO_VIEWS when CBO is disabled
                                                    if (!budgetOptimizeOn && m.value === "BUDGET_MODE_DAY") return false;
                                                    return true;
                                                })}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                {budgetMode === "BUDGET_MODE_DAY" ? "Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Dynamic Daily Budget" : "Budget"}
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Enter Dynamic Daily Budget" : "Enter Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Video Views Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isLeadGeneration ? (
                                <>
                                    {/* Row 2: Campaign Name - Lead Generation Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Enable CBO, Budget Type, Budget - Lead Generation Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => m.value !== "BUDGET_MODE_INFINITE")}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                {budgetMode === "BUDGET_MODE_DAY" ? "Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Dynamic Daily Budget" : "Budget"}
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Enter Dynamic Daily Budget" : "Enter Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Lead Generation Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isEngagement ? (
                                <>
                                    {/* Row 2: Campaign Name - Engagement Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Enable CBO, Budget Type, Budget - Engagement Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => {
                                                    if (m.value === "BUDGET_MODE_INFINITE") return false;
                                                    // BUDGET_MODE_DAY is deprecated for ENGAGEMENT when CBO is disabled
                                                    if (!budgetOptimizeOn && m.value === "BUDGET_MODE_DAY") return false;
                                                    return true;
                                                })}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                {budgetMode === "BUDGET_MODE_DAY" ? "Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Dynamic Daily Budget" : "Budget"}
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET" ? "Enter Dynamic Daily Budget" : "Enter Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Engagement Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : isWebConversions ? (
                                <>
                                    {/* Row 2: Campaign Name - Website Conversions Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: CBO Toggle, Budget Type, Budget - Website Conversions Only */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <ToggleSwitch
                                                enabled={budgetOptimizeOn}
                                                onChange={setBudgetOptimizeOn}
                                                label="Enable Campaign Budget Optimization"
                                                description="Distribute budget automatically across ad groups for better performance."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <Dropdown
                                                options={BUDGET_MODES.filter(m => m.value === "BUDGET_MODE_DAY" || m.value === "BUDGET_MODE_TOTAL")}
                                                value={budgetMode}
                                                onChange={(val) => setBudgetMode(val as string)}
                                                placeholder="Select Budget Type"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                {budgetMode === "BUDGET_MODE_DAY" ? "Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Lifetime Budget" : "Budget"}
                                            </label>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder={budgetMode === "BUDGET_MODE_DAY" ? "Enter Daily Budget" : budgetMode === "BUDGET_MODE_TOTAL" ? "Enter Lifetime Budget" : "Enter Budget"}
                                                className="bg-[#FEFEFB] w-full px-4 py-2.5 h-[38px] border border-gray-200 rounded-lg text-[14px] text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Status - Website Conversions Only */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Status
                                            </label>
                                            <Dropdown
                                                options={STATUS_OPTIONS}
                                                value={status}
                                                onChange={(val) => setStatus(val as string)}
                                                placeholder="Select Status"
                                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Row 2: Campaign Name & App Promotion Type */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="Some - TikTok - 22/12/2025"
                                                className="w-full px-4 py-3 border border-[#E3E3E3] rounded-xl bg-[#FEFEFB] text-sm text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-forest-f60"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                App Promotion Type
                                            </label>
                                            <select
                                                value={appPromotionType}
                                                onChange={(e) => setAppPromotionType(e.target.value)}
                                                className="w-full px-4 py-3 border border-[#E3E3E3] rounded-xl bg-[#FEFEFB] text-sm text-[#072929] focus:outline-none focus:ring-2 focus:ring-forest-f60"
                                            >
                                                {APP_PROMOTION_TYPES.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 3: Budget Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Daily Budget
                                            </label>
                                            <input
                                                type="number"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder="0"
                                                min="0"
                                                className="w-full px-4 py-3 border border-[#E3E3E3] rounded-xl bg-[#FEFEFB] text-sm text-[#072929] placeholder-[#BFBFBF] focus:outline-none focus:ring-2 focus:ring-forest-f60"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Type
                                            </label>
                                            <select
                                                value={budgetMode}
                                                onChange={(e) => setBudgetMode(e.target.value)}
                                                className="w-full px-4 py-3 border border-[#E3E3E3] rounded-xl bg-[#FEFEFB] text-sm text-[#072929] focus:outline-none focus:ring-2 focus:ring-forest-f60"
                                            >
                                                {BUDGET_MODES.map((mode) => (
                                                    <option key={mode.value} value={mode.value}>
                                                        {mode.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Budget Optimize
                                            </label>
                                            <div className="h-[48px] flex items-center">
                                                <ToggleSwitch
                                                    enabled={budgetOptimizeOn}
                                                    onChange={setBudgetOptimizeOn}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 4: Toggle Options */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                Enable Dedicated Campaign
                                            </label>
                                            <div className="h-[48px] flex items-center">
                                                <ToggleSwitch
                                                    enabled={isDedicatedCampaign}
                                                    onChange={setIsDedicatedCampaign}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-[#072929] mb-2">
                                                iOS 14 Dedicated Campaign
                                            </label>
                                            <div className="h-[48px] flex items-center">
                                                <ToggleSwitch
                                                    enabled={disableSkanCampaign}
                                                    onChange={setDisableSkanCampaign}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>


            {/* Actions */}

            <div className="p-4 flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 text-[#556179] bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading
                        ? mode === "edit" ? "Saving..." : "Creating..."
                        : mode === "edit" ? "Save Changes" : "Create Campaign"}
                </button>
            </div>
        </div>
    );
};
