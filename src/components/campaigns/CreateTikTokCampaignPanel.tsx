import React, { useState } from "react";

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
    profiles?: Array<{ advertiser_id: string; advertiser_name: string }>;
}

const OBJECTIVE_TYPES = [
    { value: "WEB_CONVERSIONS", label: "Website Conversions" },
    { value: "TRAFFIC", label: "Traffic" },
    { value: "VIDEO_VIEWS", label: "Video Views" },
    { value: "REACH", label: "Reach" },
    { value: "ENGAGEMENT", label: "Engagement" },
    { value: "APP_PROMOTION", label: "App Promotion" },
    { value: "LEAD_GENERATION", label: "Lead Generation" },
    { value: "PRODUCT_SALES", label: "Product Sales" },
];

const APP_PROMOTION_TYPES = [
    { value: "UNSET", label: "Not Applicable" },
    { value: "APP_INSTALL", label: "App Install" },
    { value: "APP_RETARGETING", label: "App Retargeting" },
    { value: "APP_PRE_REGISTRATION", label: "App Pre-Registration" },
];

const BUDGET_MODES = [
    { value: "BUDGET_MODE_DAY", label: "Daily Budget" },
    { value: "BUDGET_MODE_TOTAL", label: "Lifetime Budget" },
    { value: "BUDGET_MODE_DYNAMIC_DAILY_BUDGET", label: "Dynamic Daily Budget" },
    { value: "BUDGET_MODE_INFINITE", label: "No Limit" },
];

// Toggle Switch Component
const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
}> = ({ enabled, onChange, label }) => (
    <div className="flex items-center gap-3">
        <button
            type="button"
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-forest-f60" : "bg-gray-300"
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"
                    }`}
            />
        </button>
        {label && <span className="text-sm text-gray-700">{label}</span>}
    </div>
);

export const CreateTikTokCampaignPanel: React.FC<CreateTikTokCampaignPanelProps> = ({
    isOpen,
    onClose,
    onSubmit,
    loading = false,
    profiles = [],
}) => {
    // Form state
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [objectiveType, setObjectiveType] = useState<string>("");
    const [campaignName, setCampaignName] = useState<string>("");
    const [appPromotionType, setAppPromotionType] = useState<string>("UNSET");
    const [budgetMode, setBudgetMode] = useState<string>("BUDGET_MODE_DAY");
    const [budget, setBudget] = useState<string>("");
    const [budgetOptimizeOn, setBudgetOptimizeOn] = useState<boolean>(false);
    const [isDedicatedCampaign, setIsDedicatedCampaign] = useState<boolean>(false);
    const [disableSkanCampaign, setDisableSkanCampaign] = useState<boolean>(false);

    const handleSubmit = async () => {
        if (!objectiveType) {
            alert("Please select a campaign objective");
            return;
        }

        const data: CreateTikTokCampaignData = {
            campaign_name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
            objective_type: objectiveType,
            budget_mode: budgetMode,
            budget: budget ? parseFloat(budget) : undefined,
            budget_optimize_on: budgetOptimizeOn,
            is_advanced_dedicated_campaign: isDedicatedCampaign,
            disable_skan_campaign: disableSkanCampaign,
        };

        if (selectedProfile) {
            data.advertiser_id = selectedProfile;
        }

        if (appPromotionType && appPromotionType !== "UNSET") {
            data.app_promotion_type = appPromotionType;
        }

        await onSubmit(data);

        // Reset form
        setSelectedProfile("");
        setObjectiveType("");
        setCampaignName("");
        setAppPromotionType("UNSET");
        setBudgetMode("BUDGET_MODE_DAY");
        setBudget("");
        setBudgetOptimizeOn(false);
        setIsDedicatedCampaign(false);
        setDisableSkanCampaign(false);
    };

    if (!isOpen) return null;

    return (
        <div className="bg-[#F9F9F6] rounded-xl border border-[#E8E8E3] p-6 mb-6">
            <h2 className="text-[16px] font-medium text-[#072929] mb-6">Create Campaign</h2>

            {/* Row 1: Profile & Campaign Objective */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-[#072929] mb-2">
                        Profile
                    </label>
                    <select
                        value={selectedProfile}
                        onChange={(e) => setSelectedProfile(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E3E3E3] rounded-xl bg-[#FEFEFB] text-sm text-[#072929] focus:outline-none focus:ring-2 focus:ring-forest-f60"
                    >
                        <option value="">Tricon Tech LLC</option>
                        {profiles.map((profile) => (
                            <option key={profile.advertiser_id} value={profile.advertiser_id}>
                                {profile.advertiser_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#072929] mb-2">
                        Campaign Objective
                    </label>
                    <select
                        value={objectiveType}
                        onChange={(e) => setObjectiveType(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E3E3E3] rounded-xl bg-[#FEFEFB] text-sm text-[#072929] focus:outline-none focus:ring-2 focus:ring-forest-f60"
                    >
                        <option value="">Select Campaign Objective Type</option>
                        {OBJECTIVE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Row 2: Campaign Name & App Promotion Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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
                    <label className="block text-sm font-medium text-[#072929] mb-2">
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

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 border border-gray-300 text-[#072929] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading || !objectiveType}
                    className="px-6 py-2.5 bg-forest-f60 text-white rounded-lg hover:bg-forest-f70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                    {loading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    Create Campaign
                </button>
            </div>
        </div>
    );
};
