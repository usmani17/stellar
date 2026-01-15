import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Calendar, Search, Plus } from "lucide-react";
import { campaignsService } from "../../services/campaigns";

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

interface CreateTikTokAdGroupPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: TikTokAdGroupInput[]) => void;
    campaignId: string;
    campaignName?: string;
    objectiveType?: string;
    loading?: boolean;
    submitError?: string | null;
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

export const CreateTikTokAdGroupPanel: React.FC<CreateTikTokAdGroupPanelProps> = ({
    isOpen,
    onClose,
    onSubmit,
    campaignId,
    campaignName = "",
    objectiveType = "Website Conversions",
    loading: externalLoading = false,
    submitError: externalSubmitError = null,
}) => {
    const { accountId } = useParams<{ accountId: string }>();
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    // Use external loading/error if provided, otherwise use internal
    const loading = externalLoading || internalLoading;
    const error = externalSubmitError || internalError;

    // Form State for current ad group being created
    const [adgroupName, setAdgroupName] = useState("");
    const [state, setState] = useState("ENABLED");
    const [promotionLocation, setPromotionLocation] = useState("Website");
    const [placementType, setPlacementType] = useState("PLACEMENT_TYPE_AUTOMATIC");
    const [budgetType, setBudgetType] = useState("BUDGET_MODE_DAY");
    const [budget, setBudget] = useState("");
    const [scheduleType, setScheduleType] = useState("SCHEDULE_FROM_NOW");
    const [startDate, setStartDate] = useState("");
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

    // Ad Groups list (for "Add more" functionality)
    const [adGroups, setAdGroups] = useState<AdGroupFormData[]>([]);
    const [nextId, setNextId] = useState(1);

    // Update default optimization goal based on objective type
    useEffect(() => {
        const isAppPromotion = objectiveType === "App Promotion" || objectiveType === "APP_PROMOTION";
        if (isAppPromotion && optimizationGoal === "CONVERSION") {
            setOptimizationGoal("INSTALL");
        } else if (!isAppPromotion && optimizationGoal === "INSTALL") {
            setOptimizationGoal("CONVERSION");
        }
    }, [objectiveType]);

    const handleAddMore = () => {
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
        if (!accountId || !campaignId) return;

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
                            schedule_start_time: adGroupData.schedule_start_time || "",
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
                schedule_start_time: startDate ? formatDateForAPI(startDate, false) : "",
                schedule_end_time: scheduleType === "SCHEDULE_START_END" && endDate ? formatDateForAPI(endDate, true) : undefined,
                optimization_goal: isAppPromotion 
                    ? (APP_OPTIMIZATION_GOALS.find(og => og.value === optimizationGoal)?.value || "INSTALL")
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

            if (onSubmit) {
                onSubmit([adGroupData]);
            } else {
                setInternalLoading(true);
                setInternalError(null);

                try {
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

    // Check if objective is App Promotion (handle both display name and API value)
    const isAppPromotion = objectiveType === "App Promotion" || objectiveType === "APP_PROMOTION";

    // Toggle Component
    const Toggle = ({ enabled, setEnabled, label }: { enabled: boolean; setEnabled: (val: boolean) => void; label: string }) => (
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setEnabled(!enabled)}>
            <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ${enabled ? 'bg-teal-600' : 'bg-stone-300'}`}>
                <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-teal-950 text-base font-medium">{label}</span>
        </div>
    );

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
            <div className={`relative w-full h-12 px-3 py-2 rounded-xl border ${
                disabled ? 'bg-[#F0F0ED] border-[#D1D1C7]' : 'bg-white border-[#E3E3E3]'
            } flex items-center`}>
                {type === 'select' && options ? (
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={`flex-1 text-sm ${
                            disabled ? 'text-[#072929] cursor-not-allowed' : 'text-[#072929]'
                        } bg-transparent outline-none appearance-none`}
                    >
                        {options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`flex-1 text-sm ${
                            disabled ? 'text-[#072929] cursor-not-allowed' : 'text-[#072929]'
                        } ${placeholder && !value ? 'text-[#BFBFBF]' : ''} bg-transparent outline-none`}
                    />
                )}
                {!disabled && type === 'select' && options && (
                    <ChevronDown className="w-5 h-5 text-slate-600 rotate-0" />
                )}
                {type === 'date' && (
                    <Calendar className="w-5 h-5 text-[#136D6D]" />
                )}
            </div>
        </div>
    );

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
                <div className="flex justify-start items-center gap-4">
                    <div className="w-96">
                        <InputField
                            label="Campaign"
                            value={campaignName || campaignId}
                            onChange={() => {}}
                            disabled={true}
                        />
                    </div>
                    <div className="w-96">
                        <InputField
                            label="Ad Group Name"
                            value={adgroupName}
                            onChange={setAdgroupName}
                            placeholder="Enter ad group name"
                        />
                    </div>
                    <div className="flex-1">
                        <InputField
                            label="Objective"
                            value={objectiveType}
                            onChange={() => {}}
                            disabled={true}
                        />
                    </div>
                    <div className="flex-1">
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
                {isAppPromotion ? (
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
                                onChange={() => {}}
                                disabled={true}
                            />
                        </div>
                        <div className="w-96">
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

                {/* Row 2b: Budget fields for App Promotion */}
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
                {isAppPromotion ? (
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
                {isAppPromotion ? (
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
                                onChange={() => {}}
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

                {/* Add More Button */}
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
                                                    className="text-sm text-[#CE1313] hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div className="pt-6 border-t border-[#E8E8E3] flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="w-20 min-w-20 h-10 px-4 bg-[#F9F9F6] rounded-lg border border-[#E3E3E3] flex justify-center items-center"
                    >
                        <span className="text-sm font-medium text-[#072929] leading-5">Cancel</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || (adGroups.length === 0 && !adgroupName.trim())}
                        className={`h-10 px-4 py-2.5 rounded-lg shadow-sm flex justify-center items-center ${
                            loading || (adGroups.length === 0 && !adgroupName.trim())
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-teal-700 hover:bg-teal-800'
                        }`}
                    >
                        <span className="text-sm font-medium text-white leading-5">
                            {loading ? "Creating..." : adGroups.length > 0 ? "Add All Groups" : "Create Ad Group"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
