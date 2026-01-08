import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Calendar } from "lucide-react";
import { campaignsService } from "../../services/campaigns";

export interface TikTokAdGroupInput {
    campaign_id: string;
    adgroup_name: string;
    budget_mode: string;
    budget: number;
    schedule_type: string;
    schedule_start_time?: string;
    optimization_goal: string;
    billing_event: string;
    location_ids: string[];
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
    { value: "PURCHASE", label: "Purchase" },
    { value: "ADD_TO_CART", label: "Add to Cart" },
    { value: "COMPLETE_PAYMENT", label: "Complete Payment" },
    { value: "VIEW_CONTENT", label: "View Content" },
    { value: "CLICK", label: "Click" },
    { value: "CONVERSION", label: "Conversion" },
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

const STATUS_OPTIONS = [
    { value: "ENABLED", label: "Enable" },
    { value: "PAUSED", label: "Pause" },
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
    const [optimizationGoal, setOptimizationGoal] = useState("PURCHASE");
    const [bidStrategy, setBidStrategy] = useState("BID_TYPE_NO_BID");
    const [billingEvent, setBillingEvent] = useState("CPC");
    const [deliveryPacing, setDeliveryPacing] = useState("PACING_MODE_SMOOTH");
    const [trackingPixel, setTrackingPixel] = useState("");
    const [conversionEvent, setConversionEvent] = useState("Purchase");

    // Ad Groups list (for "Add more" functionality)
    const [adGroups, setAdGroups] = useState<AdGroupFormData[]>([]);
    const [nextId, setNextId] = useState(1);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !campaignId) return;

        // If there are ad groups in the list, submit all of them
        if (adGroups.length > 0) {
            const adGroupsData: TikTokAdGroupInput[] = adGroups.map(group => ({
                campaign_id: campaignId,
                adgroup_name: group.adGroupName,
                budget_mode: BUDGET_TYPES.find(bt => bt.label === group.budgetType)?.value || "BUDGET_MODE_DAY",
                budget: group.budget === "CBO" ? 0 : parseFloat(group.budget) || 0,
                schedule_type: scheduleType,
                schedule_start_time: group.startDate ? (() => {
                    // Convert MM-DD-YYYY to ISO format
                    try {
                        const [month, day, year] = group.startDate.split('-');
                        return `${year}-${month}-${day}T00:00:00`;
                    } catch {
                        return group.startDate;
                    }
                })() : "",
                optimization_goal: OPTIMIZATION_GOALS.find(og => og.label === group.optimizationGoal)?.value || "PURCHASE",
                billing_event: billingEvent,
                location_ids: [], // Location should be set per ad group if needed
            }));

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
                schedule_start_time: startDate || "",
                optimization_goal: optimizationGoal,
                billing_event: billingEvent,
                location_ids: [],
            };

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
        setOptimizationGoal("PURCHASE");
        setBidStrategy("BID_TYPE_NO_BID");
        setBillingEvent("CPC");
        setDeliveryPacing("PACING_MODE_SMOOTH");
        setTrackingPixel("");
        setConversionEvent("Purchase");
        setAdGroups([]);
        setNextId(1);
        setInternalError(null);
    };

    const handleCancel = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

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
                {!disabled && type !== 'date' && (
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

                {/* Row 2: Promotion Location, Placement Type, Budget Type, Budget */}
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

                {/* Row 3: Schedule Type, Start Date, Optimization Goal, Bid Strategy */}
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

                {/* Row 4: Billing Event, Delivery Pacing, Tracking Pixel, Conversion Event */}
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
                            placeholder="Enter pixel ID"
                        />
                    </div>
                    <div className="w-96">
                        <InputField
                            label="Conversion Event"
                            value={conversionEvent}
                            onChange={setConversionEvent}
                            placeholder="Enter conversion event"
                        />
                    </div>
                </div>

                {/* Add More Button */}
                <div 
                    className="flex justify-start items-center gap-2 cursor-pointer"
                    onClick={handleAddMore}
                >
                    <div className="w-5 h-5 bg-[#136D6D] rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
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
