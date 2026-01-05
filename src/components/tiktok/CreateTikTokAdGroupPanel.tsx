import React, { useState } from "react";
import { useParams } from "react-router-dom";
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

interface CreateTikTokAdGroupPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: TikTokAdGroupInput) => void;
    campaignId: string;
    loading?: boolean;
    submitError?: string | null;
}

export const CreateTikTokAdGroupPanel: React.FC<CreateTikTokAdGroupPanelProps> = ({
    isOpen,
    onClose,
    onSubmit,
    campaignId,
    loading: externalLoading = false,
    submitError: externalSubmitError = null,
}) => {
    const { accountId } = useParams<{ accountId: string }>();
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    // Use external loading/error if provided, otherwise use internal
    const loading = externalLoading || internalLoading;
    const error = externalSubmitError || internalError;

    // Form State
    const [adgroupName, setAdgroupName] = useState("");
    const [objective, setObjective] = useState("TRAFFIC");
    const [state, setState] = useState("ENABLED");
    const [location, setLocation] = useState("");
    const [placementType, setPlacementType] = useState("PLACEMENT_TYPE_AUTOMATIC");
    const [scheduleType, setScheduleType] = useState("SCHEDULE_FROM_NOW");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [optimizationGoal, setOptimizationGoal] = useState("CLICK");
    const [bidStrategy, setBidStrategy] = useState("BID_TYPE_NO_BID");
    const [billingEvent, setBillingEvent] = useState("CPC");
    const [deliveryPacing, setDeliveryPacing] = useState("PACING_MODE_SMOOTH");
    const [trackingPixel, setTrackingPixel] = useState("");
    const [conversionEvent, setConversionEvent] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !campaignId) return;

        const adGroupData: TikTokAdGroupInput = {
            campaign_id: campaignId,
            adgroup_name: adgroupName,
            budget_mode: "BUDGET_MODE_DAY", // Keep for backward compatibility
            budget: 0, // Keep for backward compatibility
            schedule_type: scheduleType,
            schedule_start_time: startDate || "",
            optimization_goal: optimizationGoal,
            billing_event: billingEvent,
            location_ids: location.split(",").map(id => id.trim()).filter(id => id),
        };

        // If parent provides onSubmit, use that (parent handles API call)
        if (onSubmit) {
            onSubmit(adGroupData);
        } else {
            // Otherwise, handle API call internally
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
    };

    const handleReset = () => {
        setAdgroupName("");
        setObjective("TRAFFIC");
        setState("ENABLED");
        setLocation("");
        setPlacementType("PLACEMENT_TYPE_AUTOMATIC");
        setScheduleType("SCHEDULE_FROM_NOW");
        setStartDate("");
        setEndDate("");
        setOptimizationGoal("CLICK");
        setBidStrategy("BID_TYPE_NO_BID");
        setBillingEvent("CPC");
        setDeliveryPacing("PACING_MODE_SMOOTH");
        setTrackingPixel("");
        setConversionEvent("");
        setInternalError(null);
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
                    Create Ad Group
                </h2>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Row 1: Campaign (read-only), Ad Group Name, Objective, State */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {/* Campaign (read-only) */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Campaign
                        </label>
                        <input
                            type="text"
                            value={campaignId}
                            disabled
                            className="bg-gray-100 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-gray-600 cursor-not-allowed"
                        />
                    </div>

                    {/* Ad Group Name */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Ad Group Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={adgroupName}
                            onChange={(e) => setAdgroupName(e.target.value)}
                            placeholder="Enter ad group name"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>

                    {/* Objective */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Objective *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                        >
                            <option value="TRAFFIC">Traffic</option>
                            <option value="CONVERSIONS">Conversions</option>
                            <option value="APP_PROMOTION">App Promotion</option>
                            <option value="REACH">Reach</option>
                            <option value="VIDEO_VIEWS">Video Views</option>
                        </select>
                    </div>

                    {/* State */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            State *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                        >
                            <option value="ENABLED">Enabled</option>
                            <option value="PAUSED">Paused</option>
                        </select>
                    </div>
                </div>

                {/* Row 2: Location, Placement Type, Schedule Type, Start Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {/* Location */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Location IDs *
                        </label>
                        <input
                            type="text"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="6252001"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Comma separated</p>
                    </div>

                    {/* Placement Type */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Placement Type *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={placementType}
                            onChange={(e) => setPlacementType(e.target.value)}
                        >
                            <option value="PLACEMENT_TYPE_AUTOMATIC">Automatic</option>
                            <option value="PLACEMENT_TYPE_NORMAL">Manual</option>
                        </select>
                    </div>

                    {/* Schedule Type */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Schedule Type *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={scheduleType}
                            onChange={(e) => setScheduleType(e.target.value)}
                        >
                            <option value="SCHEDULE_FROM_NOW">Run Continuously</option>
                            <option value="SCHEDULE_START_END">Set Start/End Date</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Start Date
                        </label>
                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>
                </div>

                {/* Row 3: End Date, Optimization Goal, Bid Strategy, Billing Event */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {/* End Date */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            End Date
                        </label>
                        <input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>

                    {/* Optimization Goal */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Optimization Goal *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={optimizationGoal}
                            onChange={(e) => setOptimizationGoal(e.target.value)}
                        >
                            <option value="CLICK">Click</option>
                            <option value="CONVERSION">Conversion</option>
                            <option value="REACH">Reach</option>
                            <option value="VIDEO_VIEW">Video View</option>
                        </select>
                    </div>

                    {/* Bid Strategy */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Bid Strategy *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={bidStrategy}
                            onChange={(e) => setBidStrategy(e.target.value)}
                        >
                            <option value="BID_TYPE_NO_BID">Lowest Cost</option>
                            <option value="BID_TYPE_CUSTOM">Cost Cap</option>
                            <option value="BID_TYPE_MAX_CONVERSION">Max Conversions</option>
                        </select>
                    </div>

                    {/* Billing Event */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Billing Event *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={billingEvent}
                            onChange={(e) => setBillingEvent(e.target.value)}
                        >
                            <option value="CPC">CPC</option>
                            <option value="CPM">CPM</option>
                            <option value="OCPM">oCPM</option>
                            <option value="CPV">CPV</option>
                        </select>
                    </div>
                </div>

                {/* Row 4: Delivery Pacing, Tracking Pixel, Conversion Event */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {/* Delivery Pacing */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Delivery Pacing *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={deliveryPacing}
                            onChange={(e) => setDeliveryPacing(e.target.value)}
                        >
                            <option value="PACING_MODE_SMOOTH">Standard</option>
                            <option value="PACING_MODE_FAST">Accelerated</option>
                        </select>
                    </div>

                    {/* Tracking Pixel */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Tracking Pixel
                        </label>
                        <input
                            type="text"
                            value={trackingPixel}
                            onChange={(e) => setTrackingPixel(e.target.value)}
                            placeholder="Pixel ID"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>

                    {/* Conversion Event */}
                    <div className="lg:col-span-2">
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Conversion Event
                        </label>
                        <input
                            type="text"
                            value={conversionEvent}
                            onChange={(e) => setConversionEvent(e.target.value)}
                            placeholder="Event name"
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
                    {loading ? "Creating..." : "Create Ad Group"}
                </button>
            </div>
        </div>
    );
};
