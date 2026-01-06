import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { campaignsService } from "../../services/campaigns";

export interface TikTokAdInput {
    adgroup_id: string;
    ad_name: string;
    ad_format: string;
    ad_text: string;
    identity_id: string;
    video_id?: string;
    image_ids?: string[];
    landing_page_url?: string;
    call_to_action?: string;
    deeplink?: string;
    tracking_pixel_id?: string;
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
}) => {
    const { accountId } = useParams<{ accountId: string }>();
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    // Use external loading/error if provided, otherwise use internal
    const loading = externalLoading || internalLoading;
    const error = externalSubmitError || internalError;

    // Form State
    const [adName, setAdName] = useState("");
    const [adFormat, setAdFormat] = useState("SINGLE_VIDEO");
    const [adText, setAdText] = useState("");
    const [identityId, setIdentityId] = useState("");
    const [videoId, setVideoId] = useState("");
    const [imageIds, setImageIds] = useState("");
    const [landingPageUrl, setLandingPageUrl] = useState("");
    const [callToAction, setCallToAction] = useState("LEARN_MORE");
    const [deeplink, setDeeplink] = useState("");
    const [trackingPixelId, setTrackingPixelId] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !adgroupId) return;

        // Validate required fields
        if (!adName.trim()) {
            setInternalError("Ad name is required");
            return;
        }
        if (!adText.trim()) {
            setInternalError("Ad text is required");
            return;
        }
        if (!identityId.trim()) {
            setInternalError("Identity ID is required");
            return;
        }

        // Validate format-specific requirements
        if (adFormat === "SINGLE_VIDEO" && !videoId.trim()) {
            setInternalError("Video ID is required for video format");
            return;
        }
        if ((adFormat === "SINGLE_IMAGE" || adFormat === "CAROUSEL") && !imageIds.trim()) {
            setInternalError("Image IDs are required for image/carousel format");
            return;
        }

        const adData: TikTokAdInput = {
            adgroup_id: adgroupId,
            ad_name: adName,
            ad_format: adFormat,
            ad_text: adText,
            identity_id: identityId,
            ...(videoId && { video_id: videoId }),
            ...(imageIds && { image_ids: imageIds.split(",").map(id => id.trim()).filter(id => id) }),
            ...(landingPageUrl && { landing_page_url: landingPageUrl }),
            ...(callToAction && { call_to_action: callToAction }),
            ...(deeplink && { deeplink }),
            ...(trackingPixelId && { tracking_pixel_id: trackingPixelId }),
        };

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
        setAdName("");
        setAdFormat("SINGLE_VIDEO");
        setAdText("");
        setIdentityId("");
        setVideoId("");
        setImageIds("");
        setLandingPageUrl("");
        setCallToAction("LEARN_MORE");
        setDeeplink("");
        setTrackingPixelId("");
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
                    Create TikTok Ad
                </h2>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Row 1: Ad Group (read-only), Ad Name, Ad Format */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {/* Ad Group (read-only) */}
                    {/* Ad Group Selection */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Ad Group *
                        </label>
                        {adgroups.length > 0 ? (
                            <select
                                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                value={adgroupId}
                                onChange={(e) => onAdGroupChange && onAdGroupChange(e.target.value)}
                            >
                                <option value="" disabled>Select Ad Group</option>
                                {adgroups.map((group) => (
                                    <option key={group.adgroup_id} value={group.adgroup_id}>
                                        {group.adgroup_name}
                                    </option>
                                ))}
                            </select>
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
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Ad Name *
                        </label>
                        <input
                            type="text"
                            value={adName}
                            onChange={(e) => setAdName(e.target.value)}
                            placeholder="Enter ad name"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            required
                        />
                    </div>

                    {/* Ad Format */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Ad Format *
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={adFormat}
                            onChange={(e) => setAdFormat(e.target.value)}
                        >
                            <option value="SINGLE_VIDEO">Single Video</option>
                            <option value="SINGLE_IMAGE">Single Image</option>
                            <option value="CAROUSEL">Carousel</option>
                        </select>
                    </div>
                </div>

                {/* Row 2: Ad Text, Identity ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {/* Ad Text */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Ad Text *
                        </label>
                        <textarea
                            value={adText}
                            onChange={(e) => setAdText(e.target.value)}
                            placeholder="Enter ad text/description"
                            rows={3}
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            required
                        />
                    </div>

                    {/* Identity ID */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Identity ID *
                        </label>
                        <input
                            type="text"
                            value={identityId}
                            onChange={(e) => setIdentityId(e.target.value)}
                            placeholder="TikTok identity/page ID"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            required
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                            The TikTok account/page identity to use for this ad
                        </p>
                    </div>
                </div>

                {/* Row 3: Video ID / Image IDs (conditional) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {/* Video ID (for video formats) */}
                    {adFormat === "SINGLE_VIDEO" && (
                        <div>
                            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                                Video ID *
                            </label>
                            <input
                                type="text"
                                value={videoId}
                                onChange={(e) => setVideoId(e.target.value)}
                                placeholder="TikTok video ID"
                                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                required
                            />
                        </div>
                    )}

                    {/* Image IDs (for image/carousel formats) */}
                    {(adFormat === "SINGLE_IMAGE" || adFormat === "CAROUSEL") && (
                        <div className={adFormat === "CAROUSEL" ? "md:col-span-2" : ""}>
                            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                                Image IDs *
                            </label>
                            <input
                                type="text"
                                value={imageIds}
                                onChange={(e) => setImageIds(e.target.value)}
                                placeholder="Comma-separated image IDs (e.g., 123456, 789012)"
                                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                                required
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                                {adFormat === "CAROUSEL" ? "Enter multiple image IDs separated by commas" : "Enter single image ID"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Row 4: Landing Page URL, Call to Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {/* Landing Page URL */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Call to Action
                        </label>
                        <select
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                            value={callToAction}
                            onChange={(e) => setCallToAction(e.target.value)}
                        >
                            <option value="LEARN_MORE">Learn More</option>
                            <option value="SHOP_NOW">Shop Now</option>
                            <option value="SIGN_UP">Sign Up</option>
                            <option value="DOWNLOAD">Download</option>
                            <option value="CONTACT_US">Contact Us</option>
                            <option value="APPLY_NOW">Apply Now</option>
                            <option value="WATCH_MORE">Watch More</option>
                            <option value="PLAY_GAME">Play Game</option>
                        </select>
                    </div>
                </div>

                {/* Row 5: Deeplink, Tracking Pixel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {/* Deeplink */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                            Deeplink (Optional)
                        </label>
                        <input
                            type="text"
                            value={deeplink}
                            onChange={(e) => setDeeplink(e.target.value)}
                            placeholder="app://deeplink"
                            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                    </div>

                    {/* Tracking Pixel */}
                    <div>
                        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
