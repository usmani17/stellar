// Demand Gen Campaign Form Component
// This component handles Demand Gen campaign-specific fields

import React, { useState } from "react";
import type { BaseCampaignFormProps } from "./types";
import {
  getMinHeadlines,
  getMaxHeadlines,
  getMinDescriptions,
  getMaxDescriptions,
} from "./utils";
import { AssetSelectorModal } from "../AssetSelectorModal";
import { CreateImageAssetModal } from "../CreateImageAssetModal";
import {
  ImageCropModal,
  type CropCoordinates,
  type CropSourceArea,
} from "../../ui/ImageCropModal";
import type { Asset } from "../../../services/googleAdwords/googleAdwordsAssets";

interface GoogleDemandGenCampaignFormProps extends BaseCampaignFormProps {
  // Headline and description handlers
  onAddHeadline: () => void;
  onRemoveHeadline: (index: number) => void;
  onUpdateHeadline: (index: number, value: string) => void;
  onAddDescription: () => void;
  onRemoveDescription: (index: number) => void;
  onUpdateDescription: (index: number, value: string) => void;
  onAddLongHeadline?: () => void;
  onRemoveLongHeadline?: (index: number) => void;
  onUpdateLongHeadline?: (index: number, value: string) => void;
  // Preview state
  logoPreview: string | null;
  setLogoPreview: (preview: string | null) => void;
  // Profile for asset selector / create asset
  selectedProfileId?: string;
  googleProfiles?: Array<{
    value: string;
    label: string;
    customer_id: string;
    customer_id_raw: string;
    profile_id?: number;
  }>;
  // Test button – fill entire form with test data
  onFillTest?: () => void;
  /** When provided, only render fields whose keys are in this list. Used by Assistant chat. */
  visibleKeys?: string[];
}

function shouldShowField(key: string, visibleKeys?: string[]): boolean {
  if (!visibleKeys || visibleKeys.length === 0) return true;
  return visibleKeys.includes(key);
}

/** Create a blob from an image URL and crop region (for upload). */
async function getCroppedImageBlob(
  imageUrl: string,
  sourceArea: CropSourceArea,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = sourceArea.width;
      canvas.height = sourceArea.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }
      ctx.drawImage(
        img,
        sourceArea.x,
        sourceArea.y,
        sourceArea.width,
        sourceArea.height,
        0,
        0,
        sourceArea.width,
        sourceArea.height,
      );
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Failed to create blob")),
        "image/png",
        0.95,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

export const GoogleDemandGenCampaignForm: React.FC<
  GoogleDemandGenCampaignFormProps
> = ({
  formData,
  errors,
  onChange,
  onAddHeadline,
  onRemoveHeadline,
  onUpdateHeadline,
  onAddDescription,
  onRemoveDescription,
  onUpdateDescription,
  onAddLongHeadline,
  onRemoveLongHeadline,
  onUpdateLongHeadline,
  logoPreview,
  setLogoPreview,
  selectedProfileId,
  googleProfiles,
  onFillTest,
  visibleKeys,
}) => {
  const minHeadlines = getMinHeadlines("DEMAND_GEN");
  const maxHeadlines = getMaxHeadlines();
  const minDescriptions = getMinDescriptions("DEMAND_GEN");
  const maxDescriptions = getMaxDescriptions();

  const selectedProfile = googleProfiles?.find(
    (p) => p.value === selectedProfileId,
  );
  const profileId = selectedProfile?.profile_id ?? null;

  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [createImageAssetOpen, setCreateImageAssetOpen] = useState(false);
  const [logoCropModalOpen, setLogoCropModalOpen] = useState(false);
  const [logoCropImageUrl, setLogoCropImageUrl] = useState("");
  /** When both video_id and video_url are empty, which input to show (id vs url). */
  const [videoPreferredMode, setVideoPreferredMode] = useState<"id" | "url">(
    "id",
  );

  const handleSelectAsset = (asset: Asset) => {
    if (asset.type === "IMAGE" && "image_url" in asset) {
      onChange("logo_url", asset.image_url || "");
      onChange("logo_asset_resource_name", asset.resource_name);
      onChange("logo_asset_id", asset.id);
      if (asset.image_url) setLogoPreview(asset.image_url);
    }
    setAssetSelectorOpen(false);
  };

  const handleCreateImageSuccess = (asset: {
    id: string;
    resource_name: string;
    image_url?: string;
  }) => {
    onChange("logo_url", asset.image_url || "");
    onChange("logo_asset_id", asset.id);
    onChange("logo_asset_resource_name", asset.resource_name);
    if (asset.image_url) setLogoPreview(asset.image_url);
    setCreateImageAssetOpen(false);
  };

  const openAssetSelector = () => {
    if (!profileId) return;
    setAssetSelectorOpen(true);
  };

  const handleCropConfirm = async (
    _crop: CropCoordinates,
    sourceArea?: CropSourceArea,
  ) => {
    if (!sourceArea || !logoCropImageUrl) {
      setLogoCropModalOpen(false);
      setLogoCropImageUrl("");
      return;
    }
    try {
      const blob = await getCroppedImageBlob(logoCropImageUrl, sourceArea);
      const file = new File([blob], "logo-crop.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
      const response = await fetch(
        `${baseUrl}/accounts/upload/logo/?marketplace=google`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: formData,
        },
      );
      const data = await response.json();
      if (response.ok && data.url) {
        onChange("logo_url", data.url || undefined);
        setLogoPreview(data.url);
        onChange("logo_asset_id", undefined);
        onChange("logo_asset_resource_name", undefined);
      }
    } finally {
      setLogoCropModalOpen(false);
      setLogoCropImageUrl("");
    }
  };

  const openCropModal = () => {
    const url = formData.logo_url?.trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setLogoCropImageUrl(url);
      setLogoCropModalOpen(true);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <h3 className="text-[14px] font-semibold text-[#072929]">
          Demand Gen Settings
        </h3>
        {onFillTest && (
          <button
            type="button"
            onClick={onFillTest}
            className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded text-[12px] hover:bg-amber-200 transition-colors"
            title="Fill entire Demand Gen form with test data"
          >
            Test
          </button>
        )}
      </div>

      {/* Final URL */}
      {shouldShowField("final_url", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Final URL *
          </label>
          <input
            type="url"
            value={formData.final_url || ""}
            onChange={(e) => onChange("final_url", e.target.value)}
            className={`campaign-input w-full ${
              errors.final_url ? "border-red-500" : "border-gray-200"
            }`}
            placeholder="https://example.com"
          />
          {errors.final_url && (
            <p className="text-[10px] text-red-500 mt-1">{errors.final_url}</p>
          )}
        </div>
      )}

      {/* Video Input - Radio to choose between video_url and video_id */}
      {(shouldShowField("video_id", visibleKeys) ||
        shouldShowField("video_url", visibleKeys)) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Video Asset *
          </label>
          <div className="space-y-3">
            {/* Only show radio when both keys are visible; otherwise show single input */}
            {shouldShowField("video_id", visibleKeys) &&
              shouldShowField("video_url", visibleKeys) && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="video_type"
                      checked={
                        !!formData.video_id ||
                        (!formData.video_url &&
                          !formData.video_id &&
                          videoPreferredMode === "id")
                      }
                      onChange={() => {
                        setVideoPreferredMode("id");
                        onChange("video_url", "");
                      }}
                      className="w-4 h-4 accent-forest-f40"
                    />
                    <span className="text-[13px] text-[#072929]">
                      YouTube Video ID
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="video_type"
                      checked={
                        !!formData.video_url ||
                        (!formData.video_url &&
                          !formData.video_id &&
                          videoPreferredMode === "url")
                      }
                      onChange={() => {
                        setVideoPreferredMode("url");
                        onChange("video_id", "");
                      }}
                      className="w-4 h-4 accent-forest-f40"
                    />
                    <span className="text-[13px] text-[#072929]">
                      Video URL
                    </span>
                  </label>
                </div>
              )}

            {/* YouTube Video ID input - show when only video_id requested, or when Video ID mode selected */}
            {shouldShowField("video_id", visibleKeys) &&
              (!shouldShowField("video_url", visibleKeys) ||
                !!formData.video_id ||
                (!formData.video_url &&
                  !formData.video_id &&
                  videoPreferredMode === "id")) && (
                <div>
                  <input
                    type="text"
                    value={formData.video_id || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange("video_id", v);
                      if (v) onChange("video_url", "");
                    }}
                    className={`campaign-input w-full ${
                      errors.video_id ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="dQw4w9WgXcQ"
                  />
                  {errors.video_id && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.video_id}
                    </p>
                  )}
                  <p className="text-[10px] text-[#556179] mt-1">
                    Enter a YouTube video ID (11 characters, e.g., dQw4w9WgXcQ)
                  </p>
                </div>
              )}

            {/* Video URL input - show when only video_url requested, or when Video URL mode selected */}
            {shouldShowField("video_url", visibleKeys) &&
              (!shouldShowField("video_id", visibleKeys) ||
                !!formData.video_url ||
                (!formData.video_url &&
                  !formData.video_id &&
                  videoPreferredMode === "url")) && (
                <div>
                  <input
                    type="url"
                    value={formData.video_url || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange("video_url", v);
                      if (v) onChange("video_id", "");
                    }}
                    className={`campaign-input w-full ${
                      errors.video_url ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="https://example.com/video.mp4"
                  />
                  {errors.video_url && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.video_url}
                    </p>
                  )}
                  <p className="text-[10px] text-[#556179] mt-1">
                    Enter a valid video file URL
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Logo URL – Select existing asset, Create/Upload, or paste URL; optional crop to square */}
      {shouldShowField("logo_url", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Logo URL *
          </label>
          {formData.logo_asset_id ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={formData.logo_url || ""}
                disabled
                readOnly
                className="campaign-input w-full flex-1 min-w-0 bg-gray-50 border-gray-200"
              />
              <span className="text-[10px] text-[#556179] whitespace-nowrap">
                From Asset
              </span>
              <button
                type="button"
                onClick={() => {
                  onChange("logo_url", "");
                  onChange("logo_asset_id", undefined);
                  onChange("logo_asset_resource_name", undefined);
                  setLogoPreview(null);
                }}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
                title="Remove selected asset"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative flex gap-2 items-center">
                <input
                  type="url"
                  value={formData.logo_url || ""}
                  onChange={(e) => {
                    onChange("logo_url", e.target.value);
                    const urlValue = e.target.value.trim();
                    if (
                      urlValue &&
                      (urlValue.startsWith("http://") ||
                        urlValue.startsWith("https://"))
                    ) {
                      setLogoPreview(urlValue);
                    } else {
                      setLogoPreview(null);
                    }
                  }}
                  className={`campaign-input w-full flex-1 ${
                    errors.logo_url ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="https://example.com/logo.png"
                />
                {profileId && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={openAssetSelector}
                      className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap px-2 py-1.5 border border-[#136D6D] rounded"
                    >
                      Select asset
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateImageAssetOpen(true)}
                      className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap px-2 py-1.5 border border-[#136D6D] rounded"
                    >
                      Create / Upload
                    </button>
                    {formData.logo_url?.trim() && (
                      <button
                        type="button"
                        onClick={openCropModal}
                        className="text-xs text-[#556179] hover:text-[#072929] font-medium whitespace-nowrap px-2 py-1.5 border border-gray-300 rounded"
                        title="Crop to 1:1 square"
                      >
                        Crop
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {errors.logo_url && (
            <p className="text-[10px] text-red-500 mt-1">{errors.logo_url}</p>
          )}
          {logoPreview && (
            <div className="mt-2">
              <p className="text-[10px] text-[#556179] mb-1 font-medium">
                Preview:
              </p>
              <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-32 h-32 object-contain rounded"
                  onError={() => setLogoPreview(null)}
                />
              </div>
            </div>
          )}
          <p className="text-[10px] text-[#556179] mt-1">
            Enter URL, select existing asset, or create/upload. Logo must be 1:1
            (min 128×128). Use Crop to square if needed.
          </p>
        </div>
      )}

      {/* Business Name */}
      {shouldShowField("business_name", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.business_name || ""}
            onChange={(e) => onChange("business_name", e.target.value)}
            className={`campaign-input w-full ${
              errors.business_name ? "border-red-500" : "border-gray-200"
            }`}
            placeholder="My Business Name"
          />
          {errors.business_name && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.business_name}
            </p>
          )}
        </div>
      )}

      {/* Headlines */}
      {shouldShowField("headlines", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Headlines * ({minHeadlines}-{maxHeadlines} required)
            <span className="text-[10px] text-[#556179] font-normal ml-2">
              ({formData.headlines?.filter((h) => h.trim()).length || 0}/
              {maxHeadlines})
            </span>
          </label>
          <div className="space-y-2">
            {formData.headlines?.map((headline, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => onUpdateHeadline(index, e.target.value)}
                  className="campaign-input flex-1"
                  placeholder={`Headline ${index + 1}`}
                />
                {formData.headlines &&
                  formData.headlines.length > minHeadlines && (
                    <button
                      type="button"
                      onClick={() => onRemoveHeadline(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                    >
                      Remove
                    </button>
                  )}
              </div>
            ))}
            {(formData.headlines || []).length < maxHeadlines && (
              <button
                type="button"
                onClick={onAddHeadline}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
              >
                + Add Headline
              </button>
            )}
          </div>
          {errors.headlines && (
            <p className="text-[10px] text-red-500 mt-1">{errors.headlines}</p>
          )}
        </div>
      )}

      {/* Descriptions */}
      {shouldShowField("descriptions", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Descriptions * ({minDescriptions}-{maxDescriptions} required)
            <span className="text-[10px] text-[#556179] font-normal ml-2">
              ({formData.descriptions?.filter((d) => d.trim()).length || 0}/
              {maxDescriptions})
            </span>
          </label>
          <div className="space-y-2">
            {formData.descriptions?.map((description, index) => (
              <div key={index} className="flex gap-2">
                <textarea
                  value={description}
                  onChange={(e) => onUpdateDescription(index, e.target.value)}
                  rows={2}
                  className="campaign-input flex-1"
                  placeholder={`Description ${index + 1}`}
                />
                {formData.descriptions &&
                  formData.descriptions.length > minDescriptions && (
                    <button
                      type="button"
                      onClick={() => onRemoveDescription(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                    >
                      Remove
                    </button>
                  )}
              </div>
            ))}
            {(formData.descriptions || []).length < maxDescriptions && (
              <button
                type="button"
                onClick={onAddDescription}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
              >
                + Add Description
              </button>
            )}
          </div>
          {errors.descriptions && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.descriptions}
            </p>
          )}
        </div>
      )}

      {/* Long Headlines (required for In-Feed: 1-5, max 90 chars each) */}
      {shouldShowField("long_headlines", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Long Headlines * (1-5 required for In-Feed, max 90 chars each)
          </label>
          <div className="space-y-2">
            {(formData.long_headlines || [""]).map((text, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={text}
                  maxLength={90}
                  onChange={(e) =>
                    onUpdateLongHeadline?.(index, e.target.value)
                  }
                  className={`campaign-input flex-1 ${errors.long_headlines ? "border-red-500" : "border-gray-200"}`}
                  placeholder={`Long headline ${index + 1}`}
                />
                {(formData.long_headlines || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveLongHeadline?.(index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {(formData.long_headlines || []).length < 5 && (
              <button
                type="button"
                onClick={() => onAddLongHeadline?.()}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
              >
                + Add long headline
              </button>
            )}
          </div>
          {errors.long_headlines && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.long_headlines}
            </p>
          )}
        </div>
      )}

      {/* Optional Fields */}
      {(shouldShowField("ad_group_name", visibleKeys) ||
        shouldShowField("ad_name", visibleKeys)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shouldShowField("ad_group_name", visibleKeys) && (
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Ad Group Name
              </label>
              <input
                type="text"
                value={formData.ad_group_name || ""}
                onChange={(e) => onChange("ad_group_name", e.target.value)}
                className="campaign-input w-full"
                placeholder="Optional ad group name"
              />
            </div>
          )}
          {shouldShowField("ad_name", visibleKeys) && (
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Ad Name
              </label>
              <input
                type="text"
                value={formData.ad_name || ""}
                onChange={(e) => onChange("ad_name", e.target.value)}
                className="campaign-input w-full"
                placeholder="Optional ad name"
              />
            </div>
          )}
        </div>
      )}

      {/* Channel Controls */}
      {shouldShowField("channel_controls", visibleKeys) && (
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Channel Controls
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() =>
                onChange("channel_controls", {
                  gmail: false,
                  discover: false,
                  display: false,
                  youtube_in_feed: true,
                  youtube_in_stream: true,
                  youtube_shorts: true,
                })
              }
              className="px-3 py-2 bg-red-100 text-red-700 rounded text-[12px] hover:bg-red-200 transition-colors"
              title="Show ads on YouTube only (Feed, In-Stream, Shorts)"
            >
              YouTube only
            </button>
            <button
              type="button"
              onClick={() =>
                onChange("channel_controls", {
                  gmail: true,
                  discover: true,
                  display: true,
                  youtube_in_feed: true,
                  youtube_in_stream: true,
                  youtube_shorts: true,
                })
              }
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-[12px] hover:bg-gray-200 transition-colors"
              title="Show ads on all Demand Gen channels"
            >
              All channels
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white border border-gray-200 rounded">
            {[
              { key: "gmail", label: "Gmail" },
              { key: "discover", label: "Google Discover" },
              { key: "display", label: "Display Network" },
              { key: "youtube_in_feed", label: "YouTube Feed" },
              { key: "youtube_in_stream", label: "YouTube In-Stream" },
              { key: "youtube_shorts", label: "YouTube Shorts" },
            ].map((channel) => (
              <label key={channel.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    formData.channel_controls?.[
                      channel.key as keyof typeof formData.channel_controls
                    ] ?? true
                  }
                  onChange={(e) => {
                    const current = formData.channel_controls || {};
                    onChange("channel_controls", {
                      ...current,
                      [channel.key]: e.target.checked,
                    });
                  }}
                  className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                />
                <span className="text-[13px] text-[#072929]">
                  {channel.label}
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-[#556179] mt-1">
            Control where your Demand Gen ads appear. All channels are enabled
            by default.
          </p>
        </div>
      )}

      {/* Asset Selector Modal (select existing logo assets) */}
      {profileId && (
        <AssetSelectorModal
          isOpen={assetSelectorOpen}
          onClose={() => setAssetSelectorOpen(false)}
          onSelect={handleSelectAsset}
          profileId={profileId}
          assetType="IMAGE"
          title="Select Logo"
          initialTab="Logo"
        />
      )}

      {/* Create / Upload image asset – on success fill logo fields */}
      {profileId && (
        <CreateImageAssetModal
          isOpen={createImageAssetOpen}
          onClose={() => setCreateImageAssetOpen(false)}
          onSuccess={handleCreateImageSuccess}
          profileId={profileId}
          title="Create Logo Asset"
        />
      )}

      {/* Crop logo to 1:1 square */}
      <ImageCropModal
        isOpen={logoCropModalOpen}
        onClose={() => {
          setLogoCropModalOpen(false);
          setLogoCropImageUrl("");
        }}
        imageUrl={logoCropImageUrl}
        requiredWidth={1200}
        requiredHeight={1200}
        title="Crop Logo to Square (1:1)"
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};
