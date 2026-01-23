import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Calendar, Search, Plus } from "lucide-react";
import { campaignsService } from "../../services/campaigns";
import { Dropdown } from "../ui/Dropdown";

export interface TikTokAdGroupInput {
    campaign_id: string;
    adgroup_name: string;
    budget_mode: string;
    budget: number;
    schedule_type: string;
    schedule_start_time?: string;
    schedule_end_time?: string;
    optimization_goal: string;
    billing_event: string;
    location_ids: string[];
    // Optional fields
    operation_status?: string;
    placement_type?: string;
    bid_type?: string;
    pacing?: string;
    pixel_id?: string;
    external_action?: string;
    // App Promotion fields
    app_id?: string;
    app_type?: string;
    is_smart_performance_campaign?: boolean;
    creative_material_mode?: string;
    // App Retargeting fields
    optimization_event?: string;
    optimization_event_window?: number;
    // Product Sales fields (only fields that exist in DB)
    product_source?: string; // CATALOG, STORE, or SHOWCASE
    shopping_ads_type?: string; // VIDEO, LIVE, or PRODUCT_SHOPPING_ADS (required for PRODUCT_SALES)
    // Note: catalog_id, promotion_target_type, store_id, catalog_authorized_bc_id, store_authorized_bc_id
    // are not stored in DB yet (ETL dependent) - removed from frontend
    // Note: sales_destination is campaign-level only, not ad group level
}

interface AdGroupFormData {
    id: number;
    adGroupName: string;
    objective: string;
    optimizationGoal: string;
    placement: string;
    startDate: string;
    budgetType: string;
    budget: string;
    status: string;
}

interface CreatedAdGroup {
    adGroupId?: string;
    name: string;
    index?: number;
}

interface FailedAdGroup {
    index: number;
    adgroup: TikTokAdGroupInput;
    errors: Array<{ field?: string; message: string }>;
}

interface CreateTikTokAdGroupPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: TikTokAdGroupInput[]) => void;
    campaignId: string;
    campaignName?: string;
    objectiveType?: string;
    loading?: boolean;
    submitError?: string | null;
    createdAdGroups?: CreatedAdGroup[];
    failedCount?: number;
    failedAdGroups?: FailedAdGroup[];
}

const BUDGET_TYPES = [
    { value: "BUDGET_MODE_DAY", label: "Daily" },
    { value: "BUDGET_MODE_TOTAL", label: "Lifetime" },
];

const SCHEDULE_TYPES = [
    { value: "SCHEDULE_FROM_NOW", label: "No End Date" },
    { value: "SCHEDULE_START_END", label: "Set Start/End Date" },
];

const PLACEMENT_TYPES = [
    { value: "PLACEMENT_TYPE_AUTOMATIC", label: "Automatic Placement (Recommended)" },
    { value: "PLACEMENT_TYPE_NORMAL", label: "Manual Placement" },
];

const OPTIMIZATION_GOALS = [
    { value: "CONVERSION", label: "Conversion" },
    { value: "CLICK", label: "Click" },
    { value: "INSTALL", label: "Install" },
    { value: "REACH", label: "Reach" },
    { value: "SHOW", label: "Show" },
    { value: "VIDEO_VIEW", label: "Video View" },
    { value: "LEAD_GENERATION", label: "Lead Generation" },
    { value: "VALUE", label: "Value" },
    { value: "ENGAGED_VIEW", label: "Engaged View" },
];

const BID_STRATEGIES = [
    { value: "BID_TYPE_NO_BID", label: "Lowest Cost" },
    { value: "BID_TYPE_CUSTOM", label: "Cost Cap" },
    { value: "BID_TYPE_MAX_CONVERSION", label: "Max Conversions" },
];


const DELIVERY_PACING = [
    { value: "PACING_MODE_SMOOTH", label: "Smooth" },
    { value: "PACING_MODE_FAST", label: "Accelerated" },
];

const TRACKING_PIXELS = [
    { value: "", label: "Select Pixel" },
    // Add actual pixel options here when available from API
];

const CONVERSION_EVENTS = [
    { value: "COMPLETE_PAYMENT", label: "Complete Payment (Purchase)" },
    { value: "ADD_TO_CART", label: "Add to Cart" },
    { value: "VIEW_CONTENT", label: "View Content" },
    { value: "CLICK", label: "Click" },
    { value: "SUBMIT_FORM", label: "Submit Form" },
    { value: "SIGN_UP", label: "Sign Up" },
    { value: "DOWNLOAD", label: "Download" },
    { value: "INSTALL", label: "Install" },
];

const STATUS_OPTIONS = [
    { value: "ENABLED", label: "Enable" },
    { value: "PAUSED", label: "Pause" },
];

const APP_PROMOTION_TYPES = [
    { value: "APP_INSTALL", label: "App Install" },
    { value: "APP_RETARGETING", label: "App Retargeting" },
    { value: "APP_PRE_REGISTRATION", label: "App Pre-Registration" },
];

const APP_STORES = [
    { value: "IOS", label: "iOS" },
    { value: "ANDROID", label: "Android" },
];

const APP_OPTIMIZATION_GOALS = [
    { value: "INSTALL", label: "App Install" },
    { value: "RETARGETING", label: "Retargeting" },
    { value: "RE_ENGAGEMENT", label: "Re-engagement" },
    { value: "CLICK", label: "Click" },
    { value: "CONVERSION", label: "Conversion" },
];

// Traffic-specific optimization goals
const TRAFFIC_OPTIMIZATION_GOALS = [
    { value: "CLICK", label: "Click" },
    { value: "LANDING_PAGE_VIEW", label: "Landing Page View" },
    { value: "CONVERSION", label: "Conversion" },
];

// Traffic-specific billing events
const TRAFFIC_BILLING_EVENTS = [
    { value: "CPC", label: "CPC (Cost Per Click)" },
    { value: "OCPM", label: "OCPM (Optimized Cost Per Mille)" },
];

// Reach-specific optimization goals
const REACH_OPTIMIZATION_GOALS = [
    { value: "REACH", label: "Reach" },
    { value: "SHOW", label: "Show" },
];

// Reach-specific billing events
const REACH_BILLING_EVENTS = [
    { value: "CPM", label: "CPM (Cost Per Mille)" },
];

// Lead Generation-specific optimization goals
const LEAD_GENERATION_OPTIMIZATION_GOALS = [
    { value: "LEAD_GENERATION", label: "Lead Generation" },
];

// Lead Generation-specific billing events
const LEAD_GENERATION_BILLING_EVENTS = [
    { value: "CPC", label: "CPC (Cost Per Click)" },
    { value: "OCPM", label: "OCPM (Optimized Cost Per Mille)" },
];

// Engagement-specific optimization goals
const ENGAGEMENT_OPTIMIZATION_GOALS = [
    { value: "ENGAGEMENT", label: "Engagement" },
    { value: "CLICK", label: "Click" },
    { value: "PROFILE_VIEW", label: "Profile View" },
    { value: "FOLLOW", label: "Follow" },
];

// Engagement-specific billing events
const ENGAGEMENT_BILLING_EVENTS = [
    { value: "CPC", label: "CPC (Cost Per Click)" },
    { value: "CPM", label: "CPM (Cost Per Mille)" },
    { value: "OCPM", label: "OCPM (Optimized Cost Per Mille)" },
];

// Product Sales-specific optimization goals
const PRODUCT_SALES_OPTIMIZATION_GOALS = [
    { value: "CONVERSION", label: "Conversion" },
    { value: "VALUE", label: "Value" },
    { value: "CLICK", label: "Click" },
];

// Product Sales-specific billing events
const PRODUCT_SALES_BILLING_EVENTS = [
    { value: "CPC", label: "CPC (Cost Per Click)" },
    { value: "OCPM", label: "OCPM (Optimized Cost Per Mille)" },
];

// Product Sources (per TikTok API: CATALOG, STORE, SHOWCASE)
const PRODUCT_SOURCES = [
    { value: "STORE", label: "TikTok Shop" },
    { value: "CATALOG", label: "Product Catalog" },
    { value: "SHOWCASE", label: "TikTok Showcase" },
];

// Shopping Ads Types (required for PRODUCT_SALES)
const SHOPPING_ADS_TYPES = [
    { value: "VIDEO", label: "Video Shopping Ads" },
    { value: "LIVE", label: "Live Shopping Ads" },
    { value: "PRODUCT_SHOPPING_ADS", label: "Product Shopping Ads" },
];

// Promotion Target Types (for LEAD_GENERATION)
// Note: PROMOTION_TARGET_TYPES removed - promotion_target_type field not in DB yet (ETL dependent)

// Sales Merged-specific optimization goals (same as Product Sales)
const SALES_MERGED_OPTIMIZATION_GOALS = [
    { value: "CONVERSION", label: "Conversion" },
    { value: "VALUE", label: "Value" },
    { value: "CLICK", label: "Click" },
];

// Sales Merged-specific billing events (same as Product Sales)
const SALES_MERGED_BILLING_EVENTS = [
    { value: "CPC", label: "CPC (Cost Per Click)" },
    { value: "OCPM", label: "OCPM (Optimized Cost Per Mille)" },
];

// Note: sales_destination is campaign-level only, not ad group level

// RF Reach-specific optimization goals
const RF_REACH_OPTIMIZATION_GOALS = [
    { value: "REACH", label: "Reach" },
];

// RF Reach-specific billing events
const RF_REACH_BILLING_EVENTS = [
    { value: "CPM", label: "CPM (Cost Per Mille)" },
];

// Retargeting Events (for APP_RETARGETING)
const RETARGETING_EVENTS = [
    { value: "INSTALL", label: "Install" },
    { value: "REGISTER", label: "Register" },
    { value: "PURCHASE", label: "Purchase" },
    { value: "ACTIVATE", label: "Activate" },
    { value: "RETAIN", label: "Retain" },
    { value: "CUSTOM", label: "Custom" },
];

// Lookback Window options (in days)
const LOOKBACK_WINDOW_OPTIONS = [
    { value: "1", label: "1 Day" },
    { value: "7", label: "7 Days" },
    { value: "14", label: "14 Days" },
    { value: "30", label: "30 Days" },
    { value: "60", label: "60 Days" },
    { value: "90", label: "90 Days" },
];

// Helper function to normalize objective type for comparison
const normalizeObjectiveType = (objType: string | undefined): string => {
    if (!objType) return "";
    // Normalize to uppercase and replace underscores with spaces for comparison
    return objType.toUpperCase().replace(/_/g, " ").trim();
};

// Toggle Component
const Toggle = ({ enabled, setEnabled, label }: { enabled: boolean; setEnabled: (val: boolean) => void; label: string }) => (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setEnabled(!enabled)}>
        <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ${enabled ? 'bg-teal-600' : 'bg-stone-300'}`}>
            <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <span className="text-teal-950 text-base font-medium">{label}</span>
    </div>
);

// Helper function to format date for display (MM-DD-YYYY)
const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
        // If already in MM-DD-YYYY format, return as is
        if (dateStr.includes('-') && dateStr.split('-').length === 3) {
            const parts = dateStr.split('-');
            if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                return dateStr;
            }
        }
        // Handle YYYY-MM-DD format (from date input)
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
    } catch {
        return dateStr;
    }
};

// Helper function to convert MM-DD-YYYY to YYYY-MM-DD for date input
const convertToDateInputFormat = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
        // If in MM-DD-YYYY format, convert to YYYY-MM-DD
        if (dateStr.includes('-') && dateStr.split('-').length === 3) {
            const parts = dateStr.split('-');
            if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                const [month, day, year] = parts;
                return `${year}-${month}-${day}`;
            }
        }
        return dateStr;
    } catch {
        return dateStr;
    }
};

const InputField = ({
    label,
    value,
    onChange,
    placeholder,
    disabled = false,
    type = 'text',
    options,
    className = ""
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    type?: 'text' | 'date' | 'select';
    options?: Array<{ value: string; label: string }>;
    className?: string;
}) => (
    <div className={`flex flex-col justify-start items-start ${className}`}>
        <label className="self-stretch pb-1 text-base font-medium text-[#072929] mb-2">
            {label}
        </label>
        {type === 'date' ? (
            <div className="relative w-full h-12 px-3 py-2 bg-white rounded-xl outline outline-1 outline-offset-[-1px] outline-neutral-200 inline-flex justify-start items-center gap-2">
                <div className={`flex-1 h-5 justify-start text-sm font-normal ${value ? 'text-teal-950' : 'text-stone-400'
                    }`}>
                    {value ? formatDateForDisplay(value) : (placeholder || "MM-DD-YYYY")}
                </div>
                <input
                    type="date"
                    value={convertToDateInputFormat(value)}
                    onChange={(e) => {
                        const dateValue = e.target.value;
                        if (dateValue) {
                            const formatted = formatDateForDisplay(dateValue);
                            onChange(formatted);
                        } else {
                            onChange("");
                        }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-5 h-5 relative flex-shrink-0">
                    <Calendar className="w-5 h-5 text-[#136D6D]" />
                </div>
            </div>
        ) : type === 'select' && options ? (
            <Dropdown<string>
                options={options}
                value={value}
                onChange={(val: string) => onChange(val)}
                placeholder={placeholder || `Select ${label.toLowerCase()}`}
                disabled={disabled}
                buttonClassName={`w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                className="w-full"
            />
        ) : (
            <div className={`relative w-full h-12 px-3 py-2 rounded-xl border ${disabled ? 'bg-[#F0F0ED] border-[#D1D1C7]' : 'bg-white border-[#E3E3E3]'
                } flex items-center`}>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`flex-1 text-sm ${disabled ? 'text-[#072929] cursor-not-allowed' : 'text-[#072929]'
                        } ${placeholder && !value ? 'text-[#BFBFBF]' : ''} bg-transparent outline-none`}
                />
            </div>
        )}
    </div>
);

export const CreateTikTokAdGroupPanel: React.FC<CreateTikTokAdGroupPanelProps> = ({
    isOpen,
    onClose,
    onSubmit,
    campaignId,
    campaignName = "",
    objectiveType = "Website Conversions",
    loading: externalLoading = false,
    submitError: externalSubmitError = null,
    createdAdGroups = [],
    failedCount = 0,
    failedAdGroups = [],
}) => {
    const { accountId } = useParams<{ accountId: string }>();
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    // Use external loading/error if provided, otherwise use internal
    const loading = externalLoading || internalLoading;
    const error = externalSubmitError || internalError;

    // Normalize objective type for consistent comparison
    const normalizedObjectiveType = normalizeObjectiveType(objectiveType);

    // Objective type flags - moved to top for consistent access
    const isAppPromotion = normalizedObjectiveType === "APP PROMOTION" ||
        normalizedObjectiveType === "APP_PROMOTION" ||
        objectiveType === "App Promotion";
    const isVideoViews = normalizedObjectiveType === "VIDEO VIEWS" ||
        normalizedObjectiveType === "VIDEO_VIEWS" ||
        objectiveType === "Video Views";
    const isTraffic = normalizedObjectiveType === "TRAFFIC" ||
        objectiveType === "Traffic";
    const isReach = normalizedObjectiveType === "REACH" ||
        objectiveType === "Reach";
    const isLeadGeneration = normalizedObjectiveType === "LEAD GENERATION" ||
        normalizedObjectiveType === "LEAD_GENERATION" ||
        objectiveType === "Lead Generation";
    const isEngagement = normalizedObjectiveType === "ENGAGEMENT" ||
        objectiveType === "Engagement";
    const isProductSales = normalizedObjectiveType === "PRODUCT SALES" ||
        normalizedObjectiveType === "PRODUCT_SALES" ||
        objectiveType === "Product Sales";
    const isSalesMerged = normalizedObjectiveType === "SALES MERGED" ||
        normalizedObjectiveType === "SALES_MERGED" ||
        objectiveType === "Sales (Merged – Website / App / TikTok Shop)";
    const isRFReach = normalizedObjectiveType === "RF REACH" ||
        normalizedObjectiveType === "RF_REACH" ||
        objectiveType === "RF_REACH";

    // Form State for current ad group being created
    const [adgroupName, setAdgroupName] = useState("");
    const [state, setState] = useState("ENABLED");
    const [promotionLocation, setPromotionLocation] = useState("Website");
    const [placementType, setPlacementType] = useState("PLACEMENT_TYPE_AUTOMATIC");
    const [budgetType, setBudgetType] = useState("BUDGET_MODE_DAY");
    const [budget, setBudget] = useState("");
    const [scheduleType, setScheduleType] = useState("SCHEDULE_FROM_NOW");

    // Default start date to today
    const getTodayFormatted = () => {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        return `${month}-${day}-${year}`;
    };
    const [startDate, setStartDate] = useState(getTodayFormatted());

    const [optimizationGoal, setOptimizationGoal] = useState("CONVERSION");
    const [bidStrategy, setBidStrategy] = useState("BID_TYPE_NO_BID");
    const [billingEvent, setBillingEvent] = useState("CPC");
    const [deliveryPacing, setDeliveryPacing] = useState("PACING_MODE_SMOOTH");
    const [trackingPixel, setTrackingPixel] = useState("");
    const [conversionEvent, setConversionEvent] = useState("COMPLETE_PAYMENT");
    const [endDate, setEndDate] = useState("");

    // App Promotion specific fields
    const [appPromotionType, setAppPromotionType] = useState("APP_INSTALL");
    const [appStore, setAppStore] = useState("IOS");
    const [appId, setAppId] = useState("");
    const [optimizeProfile, setOptimizeProfile] = useState(false);
    const [smartPerformance, setSmartPerformance] = useState(true);
    // App Retargeting specific fields
    const [retargetingEvent, setRetargetingEvent] = useState("INSTALL");
    const [lookbackWindow, setLookbackWindow] = useState("30");
    // Product Sales specific fields (only fields that exist in DB)
    const [productSource, setProductSource] = useState("STORE"); // STORE, CATALOG, or SHOWCASE
    const [shoppingAdsType, setShoppingAdsType] = useState("VIDEO"); // VIDEO, LIVE, or PRODUCT_SHOPPING_ADS
    // Note: catalog_id, promotion_target_type, store_id, catalog_authorized_bc_id, store_authorized_bc_id
    // are not stored in DB yet (ETL dependent) - removed from frontend

    // Ad Groups list (for "Add more" functionality)
    const [adGroups, setAdGroups] = useState<AdGroupFormData[]>([]);
    const [nextId, setNextId] = useState(1);

    // Update default optimization goal based on objective type
    useEffect(() => {
        if (isAppPromotion && optimizationGoal === "CONVERSION") {
            setOptimizationGoal("INSTALL");
        } else if (isVideoViews && optimizationGoal !== "VIDEO_VIEW") {
            setOptimizationGoal("VIDEO_VIEW");
        } else if (isTraffic && !["CLICK", "LANDING_PAGE_VIEW", "CONVERSION"].includes(optimizationGoal)) {
            setOptimizationGoal("CLICK");
        } else if (isReach && !["REACH", "SHOW"].includes(optimizationGoal)) {
            setOptimizationGoal("REACH");
        } else if (isLeadGeneration && optimizationGoal !== "LEAD_GENERATION") {
            setOptimizationGoal("LEAD_GENERATION");
        } else if (isEngagement && !["ENGAGEMENT", "CLICK", "PROFILE_VIEW", "FOLLOW"].includes(optimizationGoal)) {
            setOptimizationGoal("ENGAGEMENT");
        } else if (isProductSales && !["CONVERSION", "VALUE", "CLICK"].includes(optimizationGoal)) {
            setOptimizationGoal("CONVERSION");
        } else if (isSalesMerged && !["CONVERSION", "VALUE", "CLICK"].includes(optimizationGoal)) {
            setOptimizationGoal("CONVERSION");
        } else if (isRFReach && optimizationGoal !== "REACH") {
            setOptimizationGoal("REACH");
        } else if (!isAppPromotion && !isVideoViews && !isTraffic && !isReach && !isLeadGeneration && !isEngagement && !isProductSales && !isSalesMerged && !isRFReach && optimizationGoal === "INSTALL") {
            setOptimizationGoal("CONVERSION");
        }
    }, [objectiveType, optimizationGoal, isAppPromotion, isVideoViews, isTraffic, isReach, isLeadGeneration, isEngagement, isProductSales, isSalesMerged, isRFReach]);

    const handleAddMore = () => {
        console.log("Adding more ad group:", adgroupName);
        if (!adgroupName.trim()) {
            setInternalError("Ad Group Name is required");
            return;
        }

        // Format date for display (MM-DD-YYYY)
        let formattedDate = "";
        if (startDate) {
            try {
                const dateObj = new Date(startDate);
                if (!isNaN(dateObj.getTime())) {
                    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    const day = dateObj.getDate().toString().padStart(2, '0');
                    const year = dateObj.getFullYear();
                    formattedDate = `${month}-${day}-${year}`;
                }
            } catch (e) {
                formattedDate = startDate;
            }
        } else {
            const today = new Date();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const year = today.getFullYear();
            formattedDate = `${month}-${day}-${year}`;
        }

        const newAdGroup: AdGroupFormData = {
            id: nextId,
            adGroupName: adgroupName,
            objective: objectiveType,
            optimizationGoal: OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.label || optimizationGoal,
            placement: PLACEMENT_TYPES.find(pt => pt.value === placementType)?.label || "Automatic",
            startDate: formattedDate,
            budgetType: BUDGET_TYPES.find(bt => bt.value === budgetType)?.label || "Daily",
            budget: budget || "CBO",
            status: STATUS_OPTIONS.find(s => s.value === state)?.label || "Enable",
        };

        setAdGroups([...adGroups, newAdGroup]);
        setNextId(nextId + 1);

        // Reset form for next ad group
        setAdgroupName("");
        setState("ENABLED");
        setBudget("");
        setStartDate("");
        setInternalError(null);
    };

    const handleRemoveAdGroup = (id: number) => {
        setAdGroups(adGroups.filter(group => group.id !== id));
    };

    // Helper function to map state to operation_status
    const mapStateToOperationStatus = (stateValue: string): string => {
        if (stateValue === "ENABLED") return "ENABLE";
        if (stateValue === "PAUSED") return "DISABLE";
        return stateValue;
    };

    // Helper function to format date to TikTok API format (YYYY-MM-DD HH:MM:SS)
    const formatDateForAPI = (dateStr: string, isEndDate: boolean = false): string => {
        if (!dateStr) return "";
        try {
            // Handle MM-DD-YYYY format (from adGroups list)
            if (dateStr.includes('-') && dateStr.split('-').length === 3) {
                const parts = dateStr.split('-');
                if (parts[0].length === 2 && parts[1].length === 2) {
                    // MM-DD-YYYY format
                    const [month, day, year] = parts;
                    const time = isEndDate ? "23:59:59" : "00:00:00";
                    return `${year}-${month}-${day} ${time}`;
                }
            }
            // Handle standard date format
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const time = isEndDate ? "23:59:59" : "00:00:00";
            return `${year}-${month}-${day} ${time}`;
        } catch {
            return dateStr;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting TikTok Ad Groups. accountId:", accountId, "campaignId:", campaignId);
        if (!accountId || !campaignId) {
            console.warn("Submitting failed: accountId or campaignId is missing");
            return;
        }

        // If there are ad groups in the list, submit all of them
        if (adGroups.length > 0) {
            const adGroupsData: TikTokAdGroupInput[] = adGroups.map(group => {
                const baseData: TikTokAdGroupInput = {
                    campaign_id: campaignId,
                    adgroup_name: group.adGroupName,
                    budget_mode: BUDGET_TYPES.find(bt => bt.label === group.budgetType)?.value || "BUDGET_MODE_DAY",
                    budget: group.budget === "CBO" ? 0 : parseFloat(group.budget) || 0,
                    schedule_type: scheduleType,
                    schedule_start_time: group.startDate ? formatDateForAPI(group.startDate, false) : "",
                    schedule_end_time: scheduleType === "SCHEDULE_START_END" && endDate ? formatDateForAPI(endDate, true) : undefined,
                    optimization_goal: isAppPromotion
                        ? (APP_OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "INSTALL")
                        : isVideoViews
                            ? (OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "VIDEO_VIEW")
                            : isTraffic
                                ? (TRAFFIC_OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "CLICK")
                                : isReach
                                    ? (REACH_OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "REACH")
                                    : isEngagement
                                        ? (ENGAGEMENT_OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "ENGAGEMENT")
                                        : isLeadGeneration
                                            ? (LEAD_GENERATION_OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "LEAD_GENERATION")
                                            : (isProductSales || isSalesMerged)
                                                ? (PRODUCT_SALES_OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "CONVERSION")
                                                : (OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "CONVERSION"),
                    billing_event: billingEvent,
                    location_ids: [], // Location should be set per ad group if needed
                };

                // Add optional fields (only if they have values)
                if (state) {
                    baseData.operation_status = mapStateToOperationStatus(state);
                }
                if (placementType) {
                    baseData.placement_type = placementType;
                }
                if (bidStrategy) {
                    baseData.bid_type = bidStrategy;
                }
                if (deliveryPacing) {
                    baseData.pacing = deliveryPacing;
                }

                // Add conversion-related fields for WEB_CONVERSIONS objective
                // Note: pixel_id and external_action are important for conversion tracking
                if (objectiveType === "Website Conversions" || objectiveType === "WEB_CONVERSIONS") {
                    if (trackingPixel && trackingPixel.trim() !== "") {
                        baseData.pixel_id = trackingPixel.trim();
                    }
                    if (conversionEvent && conversionEvent.trim() !== "") {
                        baseData.external_action = conversionEvent;
                    }
                }

                // Add video views fields for VIDEO_VIEWS objective
                const normalizedObjType = normalizeObjectiveType(objectiveType);
                const currentIsVideoViews = normalizedObjType === "VIDEO VIEWS" ||
                    normalizedObjType === "VIDEO_VIEWS" ||
                    objectiveType === "Video Views";
                if (currentIsVideoViews) {
                    // App-related fields for Video Views
                    if (appId && appId.trim() !== "") {
                        baseData.app_id = appId.trim();
                    }
                    if (appStore) {
                        baseData.app_type = appStore;
                    }
                    if (smartPerformance !== undefined) {
                        baseData.is_smart_performance_campaign = smartPerformance;
                    }
                    if (optimizeProfile) {
                        baseData.creative_material_mode = optimizeProfile ? "PROFILE" : undefined;
                    }
                    // For Video Views, always use SCHEDULE_START_END when dates are provided
                    if (group.startDate) {
                        baseData.schedule_type = "SCHEDULE_START_END";
                        baseData.schedule_start_time = formatDateForAPI(group.startDate, false);
                    }
                    if (endDate) {
                        baseData.schedule_end_time = formatDateForAPI(endDate, true);
                    }
                }

                // Add app promotion fields for APP_PROMOTION objective
                const currentIsAppPromotion = objectiveType === "App Promotion" || objectiveType === "APP_PROMOTION";
                if (currentIsAppPromotion) {
                    if (appId && appId.trim() !== "") {
                        baseData.app_id = appId.trim();
                    }
                    if (appStore) {
                        baseData.app_type = appStore;
                    }
                    if (smartPerformance !== undefined) {
                        baseData.is_smart_performance_campaign = smartPerformance;
                    }
                    if (optimizeProfile) {
                        // This might map to creative_material_mode or another field
                        // Based on TikTok API, optimizeProfile typically affects creative_material_mode
                        baseData.creative_material_mode = optimizeProfile ? "PROFILE" : undefined;
                    }
                    // Add retargeting fields when app promotion type is APP_RETARGETING
                    if (appPromotionType === "APP_RETARGETING") {
                        if (retargetingEvent) {
                            baseData.optimization_event = retargetingEvent;
                        }
                        if (lookbackWindow) {
                            baseData.optimization_event_window = parseInt(lookbackWindow);
                        }
                    }
                }

                // Add lead generation fields for LEAD_GENERATION objective
                // Note: promotion_target_type removed - field not in DB yet (ETL dependent)
                // Lead Generation ad groups will use default TikTok API behavior

                // Add product sales fields for PRODUCT_SALES objective
                const currentIsProductSales = normalizedObjectiveType === "PRODUCT SALES" ||
                    normalizedObjectiveType === "PRODUCT_SALES" ||
                    objectiveType === "Product Sales";
                if (currentIsProductSales) {
                    // shopping_ads_type is REQUIRED for PRODUCT_SALES
                    if (shoppingAdsType) {
                        baseData.shopping_ads_type = shoppingAdsType;
                    }
                    if (productSource) {
                        baseData.product_source = productSource;
                    }
                    // Note: catalog_id, store_id, catalog_authorized_bc_id, store_authorized_bc_id
                    // removed - fields not in DB yet (ETL dependent)
                    // Add pixel_id and optimization_event for CATALOG source (website/app catalogs)
                    if (productSource === "CATALOG") {
                        if (trackingPixel && trackingPixel.trim() !== "") {
                            baseData.pixel_id = trackingPixel.trim();
                        }
                        if (conversionEvent && conversionEvent.trim() !== "") {
                            baseData.optimization_event = conversionEvent;
                        }
                    }
                }

                // Note: sales_destination is campaign-level only, not ad group level
                // For SALES_MERGED, when sales_destination is WEB_AND_APP at campaign level,
                // ad groups use app_config instead. We'll handle this if needed.
                // For now, SALES_MERGED ad groups follow similar logic to PRODUCT_SALES
                const currentIsSalesMerged = normalizedObjectiveType === "SALES MERGED" ||
                    normalizedObjectiveType === "SALES_MERGED" ||
                    objectiveType === "Sales (Merged – Website / App / TikTok Shop)";
                if (currentIsSalesMerged) {
                    // Similar to PRODUCT_SALES, but sales_destination is set at campaign level
                    // Ad groups may need app_id, pixel_id based on campaign settings
                    // Note: catalog_id removed - field not in DB yet (ETL dependent)
                    if (appId && appId.trim() !== "") {
                        baseData.app_id = appId.trim();
                    }
                    if (appStore) {
                        baseData.app_type = appStore;
                    }
                    if (trackingPixel && trackingPixel.trim() !== "") {
                        baseData.pixel_id = trackingPixel.trim();
                    }
                    if (conversionEvent && conversionEvent.trim() !== "") {
                        baseData.optimization_event = conversionEvent;
                    }
                }

                return baseData;
            });

            // If parent provides onSubmit, use that (parent handles API call)
            if (onSubmit) {
                onSubmit(adGroupsData);
            } else {
                // Otherwise, handle API call internally
                setInternalLoading(true);
                setInternalError(null);

                try {
                    // Create all ad groups
                    for (const adGroupData of adGroupsData) {
                        await campaignsService.createTikTokAdGroup(parseInt(accountId), {
                            ...adGroupData,
                            schedule_start_time: adGroupData.schedule_start_time || undefined,
                        });
                    }
                    handleReset();
                    onClose();
                } catch (err: any) {
                    console.error("Error creating ad groups:", err);
                    setInternalError(err.message || "Failed to create ad groups");
                } finally {
                    setInternalLoading(false);
                }
            }
        } else {
            // If no ad groups in list, create from current form
            const adGroupData: TikTokAdGroupInput = {
                campaign_id: campaignId,
                adgroup_name: adgroupName,
                budget_mode: budgetType,
                budget: budget === "CBO" ? 0 : parseFloat(budget) || 0,
                schedule_type: scheduleType,
                schedule_start_time: startDate ? formatDateForAPI(startDate, false) : undefined,
                schedule_end_time: scheduleType === "SCHEDULE_START_END" && endDate ? formatDateForAPI(endDate, true) : undefined,
                optimization_goal: isAppPromotion
                    ? (APP_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "INSTALL")
                    : isVideoViews
                        ? (OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "VIDEO_VIEW")
                        : isTraffic
                            ? (TRAFFIC_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "CLICK")
                            : isReach
                                ? (REACH_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "REACH")
                                : isEngagement
                                    ? (ENGAGEMENT_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "ENGAGEMENT")
                                    : isLeadGeneration
                                        ? (LEAD_GENERATION_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "LEAD_GENERATION")
                                        : (isProductSales || isSalesMerged)
                                            ? (PRODUCT_SALES_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "CONVERSION")
                                            : optimizationGoal,
                billing_event: billingEvent,
                location_ids: [],
            };

            // Add optional fields (only if they have values)
            if (state) {
                adGroupData.operation_status = mapStateToOperationStatus(state);
            }
            if (placementType) {
                adGroupData.placement_type = placementType;
            }
            if (bidStrategy) {
                adGroupData.bid_type = bidStrategy;
            }
            if (deliveryPacing) {
                adGroupData.pacing = deliveryPacing;
            }

            // Add conversion-related fields for WEB_CONVERSIONS objective
            // Note: pixel_id and external_action are important for conversion tracking
            if (objectiveType === "Website Conversions" || objectiveType === "WEB_CONVERSIONS") {
                if (trackingPixel && trackingPixel.trim() !== "") {
                    adGroupData.pixel_id = trackingPixel.trim();
                }
                if (conversionEvent && conversionEvent.trim() !== "") {
                    adGroupData.external_action = conversionEvent;
                }
            }

            // Add video views fields for VIDEO_VIEWS objective
            const normalizedObjTypeForSubmit = normalizeObjectiveType(objectiveType);
            const isVideoViewsForSubmit = normalizedObjTypeForSubmit === "VIDEO VIEWS" ||
                normalizedObjTypeForSubmit === "VIDEO_VIEWS" ||
                objectiveType === "Video Views";
            if (isVideoViewsForSubmit) {
                // App-related fields for Video Views
                if (appId && appId.trim() !== "") {
                    adGroupData.app_id = appId.trim();
                }
                if (appStore) {
                    adGroupData.app_type = appStore;
                }
                if (smartPerformance !== undefined) {
                    adGroupData.is_smart_performance_campaign = smartPerformance;
                }
                if (optimizeProfile) {
                    adGroupData.creative_material_mode = optimizeProfile ? "PROFILE" : undefined;
                }
                // For Video Views, always use SCHEDULE_START_END when dates are provided
                if (startDate) {
                    adGroupData.schedule_type = "SCHEDULE_START_END";
                    adGroupData.schedule_start_time = formatDateForAPI(startDate, false);
                }
                if (endDate) {
                    adGroupData.schedule_end_time = formatDateForAPI(endDate, true);
                }
            }

            // Add app promotion fields for APP_PROMOTION objective
            if (isAppPromotion) {
                if (appId && appId.trim() !== "") {
                    adGroupData.app_id = appId.trim();
                }
                if (appStore) {
                    adGroupData.app_type = appStore;
                }
                if (smartPerformance !== undefined) {
                    adGroupData.is_smart_performance_campaign = smartPerformance;
                }
                if (optimizeProfile) {
                    // This might map to creative_material_mode or another field
                    adGroupData.creative_material_mode = optimizeProfile ? "PROFILE" : undefined;
                }
                // Add retargeting fields when app promotion type is APP_RETARGETING
                if (appPromotionType === "APP_RETARGETING") {
                    if (retargetingEvent) {
                        adGroupData.optimization_event = retargetingEvent;
                    }
                    if (lookbackWindow) {
                        adGroupData.optimization_event_window = parseInt(lookbackWindow);
                    }
                }
            }

            // Note: promotion_target_type removed - field not in DB yet (ETL dependent)
            // Lead Generation ad groups will use default TikTok API behavior

            // Add product sales fields for PRODUCT_SALES objective
            const currentIsProductSales = normalizedObjTypeForSubmit === "PRODUCT SALES" ||
                normalizedObjTypeForSubmit === "PRODUCT_SALES" ||
                objectiveType === "Product Sales";
            if (currentIsProductSales) {
                // shopping_ads_type is REQUIRED for PRODUCT_SALES
                if (shoppingAdsType) {
                    adGroupData.shopping_ads_type = shoppingAdsType;
                }
                if (productSource) {
                    adGroupData.product_source = productSource;
                }
                // Note: catalog_id, store_id, catalog_authorized_bc_id, store_authorized_bc_id
                // removed - fields not in DB yet (ETL dependent)
                // Add pixel_id and optimization_event for CATALOG source
                if (productSource === "CATALOG") {
                    if (trackingPixel && trackingPixel.trim() !== "") {
                        adGroupData.pixel_id = trackingPixel.trim();
                    }
                    if (conversionEvent && conversionEvent.trim() !== "") {
                        adGroupData.optimization_event = conversionEvent;
                    }
                }
            }

            if (onSubmit) {
                onSubmit([adGroupData]);
            } else {
                setInternalLoading(true);
                setInternalError(null);

                try {
                    // Force cast undefined to string (or make interface optional)
                    // We updated interface, so this should be fine now.
                    await campaignsService.createTikTokAdGroup(parseInt(accountId), {
                        ...adGroupData,
                        schedule_start_time: adGroupData.schedule_start_time || "",
                    });
                    handleReset();
                    onClose();
                } catch (err: any) {
                    console.error("Error creating ad group:", err);
                    setInternalError(err.message || "Failed to create ad group");
                } finally {
                    setInternalLoading(false);
                }
            }
        }
    };

    const handleReset = () => {
        setAdgroupName("");
        setState("ENABLED");
        setPromotionLocation("Website");
        setPlacementType("PLACEMENT_TYPE_AUTOMATIC");
        setBudgetType("BUDGET_MODE_DAY");
        setBudget("");
        setScheduleType("SCHEDULE_FROM_NOW");
        setStartDate("");
        setOptimizationGoal("CONVERSION");
        setBidStrategy("BID_TYPE_NO_BID");
        setBillingEvent("CPC");
        setDeliveryPacing("PACING_MODE_SMOOTH");
        setTrackingPixel("");
        setConversionEvent("COMPLETE_PAYMENT");
        setEndDate("");
        // Reset App Promotion fields
        setAppPromotionType("APP_INSTALL");
        setAppStore("IOS");
        setProductSource("STORE");
        setShoppingAdsType("VIDEO");
        setAppId("");
        setOptimizeProfile(false);
        setSmartPerformance(true);
        // Reset App Retargeting fields
        setRetargetingEvent("INSTALL");
        setLookbackWindow("30");
        setAdGroups([]);
        setNextId(1);
        setInternalError(null);
    };

    const handleCancel = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    if (!isOpen) return null;


    return (
        <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#F9F9F6] mb-4">
            <div className="p-6 flex flex-col gap-6">
                {/* Title */}
                <div className="text-xl font-medium text-[#072929]">
                    Create Ad Group
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Row 1: Campaign, Ad Group Name, Objective, State */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="w-full md:w-96">
                        <InputField
                            label="Campaign"
                            value={campaignName || campaignId}
                            onChange={() => { }}
                            disabled={true}
                        />
                    </div>
                    <div className="w-full md:w-96">
                        <InputField
                            label="Ad Group Name"
                            value={adgroupName}
                            onChange={setAdgroupName}
                            placeholder="Enter ad group name"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <InputField
                            label="Objective"
                            value={objectiveType}
                            onChange={() => { }}
                            disabled={true}
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <InputField
                            label="State"
                            value={state}
                            onChange={setState}
                            type="select"
                            options={STATUS_OPTIONS}
                        />
                    </div>
                </div>

                {/* Row 2: Conditional based on objective type */}
                {isSalesMerged ? (
                    // Sales Merged Row 2: Note - sales_destination is campaign-level only
                    // Ad groups may need app_id, pixel_id based on campaign settings
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="App Store / OS"
                                value={appStore}
                                onChange={setAppStore}
                                type="select"
                                options={APP_STORES}
                            />
                        </div>
                        <div className="w-full md:w-96">
                            <div className="flex flex-col justify-start items-start">
                                <label className="self-stretch pb-1 text-base font-medium text-[#072929] mb-2">
                                    App ID
                                </label>
                                <div className="relative w-full h-12 px-3 py-2 rounded-xl border bg-white border-[#E3E3E3] flex items-center">
                                    <input
                                        type="text"
                                        value={appId}
                                        onChange={(e) => setAppId(e.target.value)}
                                        placeholder="Enter App ID (if needed)"
                                        className="flex-1 text-sm text-[#072929] bg-transparent outline-none"
                                    />
                                    <Search className="w-5 h-5 text-[#136D6D]" />
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isRFReach ? (
                    // RF Reach Row 2: Placement Type, Budget Type, Budget
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isProductSales ? (
                    // Product Sales Row 2: Shopping Ads Type, Product Source, Placement Type, Budget Type, Budget
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="Shopping Ads Type"
                                value={shoppingAdsType}
                                onChange={setShoppingAdsType}
                                type="select"
                                options={SHOPPING_ADS_TYPES}
                            />
                        </div>
                        <div className="w-full md:w-96">
                            <InputField
                                label="Product Source"
                                value={productSource}
                                onChange={setProductSource}
                                type="select"
                                options={PRODUCT_SOURCES}
                            />
                        </div>
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isLeadGeneration ? (
                    // Lead Generation Row 2: Placement Type, Budget Type, Budget
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isEngagement ? (
                    // Engagement Row 2: Placement Type, Budget Type, Budget
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isReach ? (
                    // Reach Row 2: Placement Type, Budget Type, Budget
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isTraffic ? (
                    // Traffic Row 2: Placement Type, Budget Type, Budget
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                ) : isVideoViews ? (
                    // Video Views Row 2: App Promotion Type (readOnly), App Store/OS, App ID
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96">
                            <InputField
                                label="App Promotion Type"
                                value={APP_PROMOTION_TYPES.find(apt => apt.value === appPromotionType)?.label || "App Install"}
                                onChange={() => { }}
                                disabled={true}
                            />
                        </div>
                        <div className="w-full md:w-96">
                            <InputField
                                label="App Store / OS"
                                value={appStore}
                                onChange={setAppStore}
                                type="select"
                                options={APP_STORES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <div className="flex flex-col justify-start items-start">
                                <label className="self-stretch pb-1 text-base font-medium text-[#072929] mb-2">
                                    App ID
                                </label>
                                <div className="relative w-full h-12 px-3 py-2 rounded-xl border bg-white border-[#E3E3E3] flex items-center">
                                    <input
                                        type="text"
                                        value={appId}
                                        onChange={(e) => setAppId(e.target.value)}
                                        placeholder="Enter App ID"
                                        className="flex-1 text-sm text-[#072929] bg-transparent outline-none"
                                    />
                                    <ChevronDown className="w-4 h-4 text-slate-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : isAppPromotion ? (
                    <>
                        {/* App Promotion Row 2: App Promotion Type, App Store/OS, App ID */}
                        <div className="flex justify-start items-center gap-4">
                            <div className="w-96">
                                <InputField
                                    label="App Promotion Type"
                                    value={appPromotionType}
                                    onChange={setAppPromotionType}
                                    type="select"
                                    options={APP_PROMOTION_TYPES}
                                />
                            </div>
                            <div className="w-96">
                                <InputField
                                    label="App Store / OS"
                                    value={appStore}
                                    onChange={setAppStore}
                                    type="select"
                                    options={APP_STORES}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-col justify-start items-start">
                                    <label className="self-stretch pb-1 text-base font-medium text-[#072929] mb-2">
                                        App ID
                                    </label>
                                    <div className="relative w-full h-12 px-3 py-2 rounded-xl border bg-white border-[#E3E3E3] flex items-center">
                                        <input
                                            type="text"
                                            value={appId}
                                            onChange={(e) => setAppId(e.target.value)}
                                            placeholder="Enter App ID"
                                            className="flex-1 text-sm text-[#072929] bg-transparent outline-none"
                                        />
                                        <Search className="w-5 h-5 text-[#136D6D]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Retargeting Fields - Only show when App Promotion Type is APP_RETARGETING */}
                        {appPromotionType === "APP_RETARGETING" && (
                            <div className="flex justify-start items-center gap-4">
                                <div className="w-96">
                                    <InputField
                                        label="Retargeting Event"
                                        value={retargetingEvent}
                                        onChange={setRetargetingEvent}
                                        type="select"
                                        options={RETARGETING_EVENTS}
                                    />
                                </div>
                                <div className="w-96">
                                    <InputField
                                        label="Lookback Window"
                                        value={lookbackWindow}
                                        onChange={setLookbackWindow}
                                        type="select"
                                        options={LOOKBACK_WINDOW_OPTIONS}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // Website Conversions Row 2: Promotion Location, Placement Type, Budget Type, Budget
                    <div className="flex justify-start items-center gap-4">
                        <div className="w-96">
                            <InputField
                                label="Promotion / Optimization Location"
                                value={promotionLocation}
                                onChange={() => { }}
                                disabled={true}
                            />
                        </div>
                        <div className="w-96 flex flex-col justify-start items-start">
                            <label className="self-stretch pb-1 text-base font-medium text-[#072929] mb-2">
                                Placement Type
                            </label>
                            <Dropdown<string>
                                options={PLACEMENT_TYPES}
                                value={placementType}
                                onChange={(val: string) => setPlacementType(val)}
                                placeholder="Select Placement Type"
                                buttonClassName="w-full h-[38px] bg-[#FEFEFB] text-[14px] text-[#072929]"
                                className="w-full"
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                )}

                {/* Row 2b: Budget fields for App Promotion only */}
                {isAppPromotion && (
                    <div className="flex justify-start items-center gap-4">
                        <div className="flex-1">
                            <InputField
                                label="Budget Type"
                                value={budgetType}
                                onChange={setBudgetType}
                                type="select"
                                options={BUDGET_TYPES}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                placeholder="Enter Budget"
                            />
                        </div>
                    </div>
                )}

                {/* Row 3: Conditional based on objective type */}
                {isSalesMerged ? (
                    // Sales Merged Row 3: Schedule Type, Start Date, End Date, and conditional Pixel/Event fields
                    <>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="Schedule Type"
                                    value={scheduleType}
                                    onChange={setScheduleType}
                                    type="select"
                                    options={SCHEDULE_TYPES}
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="Start Date"
                                    value={startDate}
                                    onChange={setStartDate}
                                    type="date"
                                />
                            </div>
                            {scheduleType === "SCHEDULE_START_END" && (
                                <div className="flex-1 min-w-[200px]">
                                    <InputField
                                        label="End Date"
                                        value={endDate}
                                        onChange={setEndDate}
                                        type="date"
                                        placeholder="MM-DD-YYYY"
                                    />
                                </div>
                            )}
                        </div>
                        {/* Show Pixel and Conversion Event only for WEBSITE destination */}
                        {false && (
                            <div className="flex flex-wrap gap-4 items-center mt-4">
                                <div className="w-96">
                                    <InputField
                                        label="Tracking Pixel"
                                        value={trackingPixel}
                                        onChange={setTrackingPixel}
                                        type="select"
                                        options={TRACKING_PIXELS}
                                        placeholder="Select Pixel"
                                    />
                                </div>
                                <div className="w-96">
                                    <InputField
                                        label="Conversion Event"
                                        value={conversionEvent}
                                        onChange={setConversionEvent}
                                        type="select"
                                        options={CONVERSION_EVENTS}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : isRFReach ? (
                    // RF Reach Row 3: Schedule Type, Start Date, End Date
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Schedule Type"
                                value={scheduleType}
                                onChange={setScheduleType}
                                type="select"
                                options={SCHEDULE_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        {scheduleType === "SCHEDULE_START_END" && (
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    type="date"
                                    placeholder="MM-DD-YYYY"
                                />
                            </div>
                        )}
                    </div>
                ) : isProductSales ? (
                    // Product Sales Row 3: Schedule Type, Start Date, End Date, and conditional Pixel/Event fields
                    <>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="Schedule Type"
                                    value={scheduleType}
                                    onChange={setScheduleType}
                                    type="select"
                                    options={SCHEDULE_TYPES}
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="Start Date"
                                    value={startDate}
                                    onChange={setStartDate}
                                    type="date"
                                />
                            </div>
                            {scheduleType === "SCHEDULE_START_END" && (
                                <div className="flex-1 min-w-[200px]">
                                    <InputField
                                        label="End Date"
                                        value={endDate}
                                        onChange={setEndDate}
                                        type="date"
                                        placeholder="MM-DD-YYYY"
                                    />
                                </div>
                            )}
                        </div>
                        {/* Show Pixel and Conversion Event only for Website/App catalogs */}
                        {(productSource === "PRODUCT_CATALOG_WEBSITE" || productSource === "PRODUCT_CATALOG_APP") && (
                            <div className="flex flex-wrap gap-4 items-center mt-4">
                                <div className="w-96">
                                    <InputField
                                        label="Tracking Pixel"
                                        value={trackingPixel}
                                        onChange={setTrackingPixel}
                                        type="select"
                                        options={TRACKING_PIXELS}
                                        placeholder="Select Pixel"
                                    />
                                </div>
                                <div className="w-96">
                                    <InputField
                                        label="Conversion Event"
                                        value={conversionEvent}
                                        onChange={setConversionEvent}
                                        type="select"
                                        options={CONVERSION_EVENTS}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : isEngagement ? (
                    // Engagement Row 3: Schedule Type, Start Date, End Date
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Schedule Type"
                                value={scheduleType}
                                onChange={setScheduleType}
                                type="select"
                                options={SCHEDULE_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        {scheduleType === "SCHEDULE_START_END" && (
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    type="date"
                                    placeholder="MM-DD-YYYY"
                                />
                            </div>
                        )}
                    </div>
                ) : isLeadGeneration ? (
                    // Lead Generation Row 3: Schedule Type, Start Date, End Date
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Schedule Type"
                                value={scheduleType}
                                onChange={setScheduleType}
                                type="select"
                                options={SCHEDULE_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        {scheduleType === "SCHEDULE_START_END" && (
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    type="date"
                                    placeholder="MM-DD-YYYY"
                                />
                            </div>
                        )}
                    </div>
                ) : isReach ? (
                    // Reach Row 3: Schedule Type, Start Date, End Date
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Schedule Type"
                                value={scheduleType}
                                onChange={setScheduleType}
                                type="select"
                                options={SCHEDULE_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        {scheduleType === "SCHEDULE_START_END" && (
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    type="date"
                                    placeholder="MM-DD-YYYY"
                                />
                            </div>
                        )}
                    </div>
                ) : isTraffic ? (
                    // Traffic Row 3: Schedule Type, Start Date, End Date
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Schedule Type"
                                value={scheduleType}
                                onChange={setScheduleType}
                                type="select"
                                options={SCHEDULE_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        {scheduleType === "SCHEDULE_START_END" && (
                            <div className="flex-1 min-w-[200px]">
                                <InputField
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    type="date"
                                    placeholder="MM-DD-YYYY"
                                />
                            </div>
                        )}
                    </div>
                ) : isVideoViews ? (
                    // Video Views Row 3: Toggles (Optimize via App Profile Page, Smart+), Placement Type, Dates
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="w-full md:w-96 flex flex-col gap-4">
                            <Toggle enabled={optimizeProfile} setEnabled={setOptimizeProfile} label="Optimize via App Profile Page" />
                            <Toggle enabled={smartPerformance} setEnabled={setSmartPerformance} label="Smart+ / Smart Performance" />
                        </div>
                        <div className="w-full md:w-96">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="End Date"
                                value={endDate}
                                onChange={setEndDate}
                                type="date"
                                placeholder="MM-DD-YYYY"
                            />
                        </div>
                    </div>
                ) : isAppPromotion ? (
                    // App Promotion Row 3: Toggles, Placement Type, Dates
                    <div className="flex justify-start items-center gap-6">
                        <div className="w-96 flex flex-col gap-4">
                            <Toggle enabled={optimizeProfile} setEnabled={setOptimizeProfile} label="Optimize via App Profile Page" />
                            <Toggle enabled={smartPerformance} setEnabled={setSmartPerformance} label="Smart+ / Smart Performance" />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Placement Type"
                                value={placementType}
                                onChange={setPlacementType}
                                type="select"
                                options={PLACEMENT_TYPES}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="End Date"
                                value={endDate}
                                onChange={setEndDate}
                                type="date"
                                placeholder="MM-DD-YYYY"
                            />
                        </div>
                    </div>
                ) : (
                    // Website Conversions Row 3: Schedule Type, Start Date, Optimization Goal, Bid Strategy
                    <div className="flex justify-start items-center gap-4">
                        <div className="flex-1">
                            <InputField
                                label="Schedule Type"
                                value={scheduleType}
                                onChange={setScheduleType}
                                type="select"
                                options={SCHEDULE_TYPES}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                type="date"
                            />
                        </div>
                        {scheduleType === "SCHEDULE_START_END" && (
                            <div className="flex-1">
                                <InputField
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    type="date"
                                />
                            </div>
                        )}
                        <div className="w-96">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="w-96">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                    </div>
                )}

                {/* Row 4: Conditional based on objective type */}
                {isSalesMerged ? (
                    // Sales Merged Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={SALES_MERGED_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={SALES_MERGED_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isRFReach ? (
                    // RF Reach Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={RF_REACH_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={RF_REACH_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isProductSales ? (
                    // Product Sales Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={PRODUCT_SALES_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={PRODUCT_SALES_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isEngagement ? (
                    // Engagement Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={ENGAGEMENT_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={ENGAGEMENT_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isLeadGeneration ? (
                    // Lead Generation Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={LEAD_GENERATION_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={LEAD_GENERATION_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isReach ? (
                    // Reach Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={REACH_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={REACH_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isTraffic ? (
                    // Traffic Row 4: Optimization Goal, Bid Strategy, Billing Event, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={TRAFFIC_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={setBillingEvent}
                                type="select"
                                options={TRAFFIC_BILLING_EVENTS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isVideoViews ? (
                    // Video Views Row 4: Optimization Goal, Bid Strategy, Delivery Pacing
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : isAppPromotion ? (
                    // App Promotion Row 4: Optimization Goal, Bid Strategy, Delivery Pacing
                    <div className="flex justify-start items-center gap-4">
                        <div className="flex-1">
                            <InputField
                                label="Optimization Goal"
                                value={optimizationGoal}
                                onChange={setOptimizationGoal}
                                type="select"
                                options={APP_OPTIMIZATION_GOALS}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Bid Strategy"
                                value={bidStrategy}
                                onChange={setBidStrategy}
                                type="select"
                                options={BID_STRATEGIES}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                    </div>
                ) : (
                    // Website Conversions Row 4: Billing Event, Delivery Pacing, Tracking Pixel, Conversion Event
                    <div className="flex justify-start items-center gap-4">
                        <div className="flex-1">
                            <InputField
                                label="Billing Event"
                                value={billingEvent}
                                onChange={() => { }}
                                disabled={true}
                            />
                        </div>
                        <div className="flex-1">
                            <InputField
                                label="Delivery Pacing"
                                value={deliveryPacing}
                                onChange={setDeliveryPacing}
                                type="select"
                                options={DELIVERY_PACING}
                            />
                        </div>
                        <div className="w-96">
                            <InputField
                                label="Tracking Pixel"
                                value={trackingPixel}
                                onChange={setTrackingPixel}
                                type="select"
                                options={TRACKING_PIXELS}
                                placeholder="Select Pixel"
                            />
                        </div>
                        <div className="w-96">
                            <InputField
                                label="Conversion Event"
                                value={conversionEvent}
                                onChange={setConversionEvent}
                                type="select"
                                options={CONVERSION_EVENTS}
                            />
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div
                    className="flex justify-start items-center gap-2 cursor-pointer"
                    onClick={handleAddMore}
                >
                    <div className="w-5 h-5 bg-[#136D6D] rounded flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="text-[#136D6D] text-sm font-medium leading-5 tracking-tight">
                        Add more
                    </div>
                </div>

                {/* Divider */}
                {adGroups.length > 0 && (
                    <>
                        <div className="pt-6 border-t border-[#E8E8E3]">
                            <div className="text-xl font-medium text-[#072929]">
                                Ad Groups
                            </div>
                        </div>

                        {/* Ad Groups Table */}
                        <div className="bg-white rounded-xl border border-[#E3E3E3] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#E3E3E3]">
                                        <th className="h-14 px-5 py-3 text-left text-sm font-medium text-slate-800">
                                            Ad Group
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-base font-medium text-slate-800">
                                            Objective
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-base font-medium text-slate-800">
                                            Optimization Goal
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-sm font-medium text-slate-800">
                                            Placement
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-sm font-medium text-slate-800">
                                            Start Date
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-sm font-medium text-slate-800">
                                            Budget
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-sm font-medium text-slate-800">
                                            Status
                                        </th>
                                        <th className="h-14 px-5 py-3 text-left text-sm font-medium text-slate-800 w-24">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adGroups.map((group) => (
                                        <tr key={group.id} className="border-b border-[#E3E3E3]">
                                            <td className="h-14 px-5 py-2 text-sm text-gray-950">
                                                {group.adGroupName}
                                            </td>
                                            <td className="h-14 px-5 py-2 text-sm text-gray-950">
                                                {group.objective}
                                            </td>
                                            <td className="h-14 px-5 py-2 text-sm text-gray-950 w-24">
                                                {group.optimizationGoal}
                                            </td>
                                            <td className="h-14 px-5 py-2 text-sm text-gray-950">
                                                {group.placement}
                                            </td>
                                            <td className="h-14 px-5 py-2 text-sm text-[#072929]">
                                                {group.startDate}
                                            </td>
                                            <td className="h-14 px-5 py-2 text-sm text-gray-950">
                                                {group.budget}
                                            </td>
                                            <td className="h-14 px-5 py-2 text-sm text-gray-950">
                                                {group.status}
                                            </td>
                                            <td className="h-14 px-5 py-2 w-24">
                                                <button
                                                    onClick={() => handleRemoveAdGroup(group.id)}
                                                    className="text-[#CE1313] hover:text-red-700 transition-colors"
                                                    title="Remove"
                                                >
                                                    <svg
                                                        className="w-4 h-4"
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
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Error Summary */}
                {error && (
                    <div className="p-4 border-b border-gray-200 bg-red-50">
                        <p className="text-[13.3px] text-red-600">{error}</p>
                        {createdAdGroups.length > 0 && failedCount > 0 && (
                            <p className="text-[12px] text-red-600 mt-1">
                                {createdAdGroups.length} ad group(s) created successfully.{" "}
                                {failedCount} ad group(s) failed.
                            </p>
                        )}
                    </div>
                )}

                {/* Success Summary */}
                {createdAdGroups.length > 0 && failedCount === 0 && (
                    <div className="p-4 border-b border-gray-200 bg-green-50">
                        <p className="text-[13.3px] text-green-600">
                            {createdAdGroups.length} ad group(s) created successfully!
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 border-t border-[#E8E8E3] flex justify-end items-center gap-3">
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
                        disabled={loading || (adGroups.length === 0 && !adgroupName.trim())}
                        className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating..." : adGroups.length > 0 ? "Add All Ad Groups" : "Add Ad Group"}
                    </button>
                </div>
            </div>
        </div>
    );
};
