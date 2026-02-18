// Reusable Asset Group Form Component
// This component contains Business Information, Asset Group Settings, and Asset Tabs
// Can be used in both PMax campaign creation and standalone asset group creation

import React, { useState, useEffect, useRef } from "react";
import type { BaseCampaignFormProps } from "./types";
import { getMinHeadlines, getMaxHeadlines, getMinDescriptions, getMaxDescriptions } from "./utils";
import { AssetSelectorModal } from "../AssetSelectorModal";
import type { Asset } from "../../../services/googleAdwords/googleAdwordsAssets";

interface GooglePerformanceMaxAssetGroupFormProps extends BaseCampaignFormProps {
  // Headline and description handlers
  onAddHeadline: () => void;
  onRemoveHeadline: (index: number) => void;
  onUpdateHeadline: (index: number, value: string) => void;
  onAddDescription: () => void;
  onRemoveDescription: (index: number) => void;
  onUpdateDescription: (index: number, value: string) => void;
  // Preview state
  logoPreview: string | null;
  setLogoPreview: (preview: string | null) => void;
  marketingImagePreview: string | null;
  setMarketingImagePreview: (preview: string | null) => void;
  squareMarketingImagePreview: string | null;
  setSquareMarketingImagePreview: (preview: string | null) => void;
  // Error setter
  setErrors: (errors: any) => void;
  // Profile ID for asset selector
  profileId?: number | null;
  // Campaign type for min/max requirements (defaults to PERFORMANCE_MAX)
  campaignType?: "PERFORMANCE_MAX" | "SHOPPING" | "SEARCH" | "DEMAND_GEN" | "DISPLAY" | "VIDEO";
  /** When true, render only the Image Assets section (marketing + square marketing image). Used by Assistant chat form. */
  showOnlyImageAssets?: boolean;
  /** When provided with showOnlyImageAssets, if includes "asset_group_name" then also show asset group name input. */
  visibleKeys?: string[];
}

// Asset tab definitions
const ASSET_TABS = [
  { id: "text", label: "Text Assets" },
  { id: "images", label: "Image Assets" },
  { id: "videos", label: "Video Assets" },
  { id: "additional", label: "Additional Assets" },
] as const;

type AssetTabId = typeof ASSET_TABS[number]["id"];

export const GooglePerformanceMaxAssetGroupForm: React.FC<GooglePerformanceMaxAssetGroupFormProps> = ({
  formData,
  errors,
  onChange,
  onAddHeadline,
  onRemoveHeadline,
  onUpdateHeadline,
  onAddDescription,
  onRemoveDescription,
  onUpdateDescription,
  logoPreview: _logoPreview,
  setLogoPreview: _setLogoPreview,
  marketingImagePreview,
  setMarketingImagePreview,
  squareMarketingImagePreview,
  setSquareMarketingImagePreview,
  setErrors,
  profileId,
  campaignType = "PERFORMANCE_MAX",
  showOnlyImageAssets = false,
  visibleKeys,
}) => {
  const minHeadlines = getMinHeadlines(campaignType);
  const maxHeadlines = getMaxHeadlines();
  const minDescriptions = getMinDescriptions(campaignType);
  const maxDescriptions = getMaxDescriptions();

  // Tab state
  const [activeAssetTab, setActiveAssetTab] = useState<AssetTabId>("text");

  // Asset Selector Modal state
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorType, setAssetSelectorType] = useState<"BUSINESS_NAME" | "LOGO" | "HEADLINE" | "DESCRIPTION" | "LONG_HEADLINE" | "IMAGE" | "SQUARE_IMAGE" | "VIDEO" | "SITELINK" | "CALLOUT" | null>(null);
  const [assetSelectorIndex, setAssetSelectorIndex] = useState<number | null>(null);
  const [assetSelectorError, setAssetSelectorError] = useState<string | null>(null);

  // Track if we've already auto-switched to prevent re-switching when user manually changes tabs
  const hasAutoSwitchedRef = useRef(false);
  const prevImageErrorsRef = useRef(false);

  // Helper function to check if a tab has errors
  const hasTabErrors = (tabId: AssetTabId): boolean => {
    if (tabId === "images") {
      return !!(errors.marketing_image_url || errors.square_marketing_image_url);
    } else if (tabId === "text") {
      return !!(errors.headlines || errors.descriptions || errors.long_headlines);
    }
    return false;
  };

  // Auto-switch to tab with errors when validation fails (only once when errors first appear)
  useEffect(() => {
    const hasImageErrors = hasTabErrors("images");
    const hadImageErrors = prevImageErrorsRef.current;

    // Only auto-switch if:
    // 1. Image errors just appeared (weren't there before)
    // 2. We haven't already auto-switched (this prevents re-switching when user manually changes tabs)
    // 3. We're not already on the images tab
    if (hasImageErrors && !hadImageErrors && !hasAutoSwitchedRef.current && activeAssetTab !== "images") {
      setActiveAssetTab("images");
      hasAutoSwitchedRef.current = true;
    }

    // Reset auto-switch flag when errors are cleared, so we can auto-switch again if errors reappear
    if (!hasImageErrors && hadImageErrors) {
      hasAutoSwitchedRef.current = false;
    }

    // Update ref for next comparison
    prevImageErrorsRef.current = hasImageErrors;
  }, [errors.marketing_image_url, errors.square_marketing_image_url, activeAssetTab]);

  const handleSelectAsset = (asset: Asset) => {
    if (!assetSelectorType || !profileId) return;

    switch (assetSelectorType) {
      case "BUSINESS_NAME":
        if (asset.type === "TEXT" && "text" in asset) {
          onChange("business_name", asset.text);
          onChange("business_name_asset_id", asset.id);
          onChange("business_name_asset_resource_name", asset.resource_name);
        }
        break;
      case "LOGO":
        if (asset.type === "IMAGE" && "image_url" in asset) {
          onChange("logo_url", asset.image_url || "");
          onChange("logo_asset_resource_name", asset.resource_name);
          onChange("logo_asset_id", asset.id);
        }
        break;
      case "HEADLINE":
        if (asset.type === "TEXT" && "text" in asset && formData.headlines && assetSelectorIndex !== null) {
          const headlineAssetIds = formData.headline_asset_ids || [];
          
          // Check if this asset is already used in another headline - prevent duplicate selection
          const existingIndex = headlineAssetIds.findIndex((id, idx) => id === asset.id && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in headline ${existingIndex + 1}. Please select a different asset.`);
            return; // Don't close modal, let user select a different asset
          }
          
          // Clear any previous error
          setAssetSelectorError(null);
          
          const newHeadlines = [...formData.headlines];
          while (newHeadlines.length <= assetSelectorIndex) {
            newHeadlines.push("");
          }
          newHeadlines[assetSelectorIndex] = asset.text;
          onChange("headlines", newHeadlines);
          
          const headlineAssetResourceNames = formData.headline_asset_resource_names || [];
          const newHeadlineAssetIds = [...headlineAssetIds];
          const newHeadlineAssetResourceNames = [...headlineAssetResourceNames];
          while (newHeadlineAssetIds.length <= assetSelectorIndex) {
            newHeadlineAssetIds.push(undefined);
            newHeadlineAssetResourceNames.push(undefined);
          }
          
          newHeadlineAssetIds[assetSelectorIndex] = asset.id;
          newHeadlineAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("headline_asset_ids", newHeadlineAssetIds);
          onChange("headline_asset_resource_names", newHeadlineAssetResourceNames);
          
          // Clear any previous error
          setAssetSelectorError(null);
        }
        break;
      case "DESCRIPTION":
        if (asset.type === "TEXT" && "text" in asset && formData.descriptions && assetSelectorIndex !== null) {
          const descriptionAssetIds = formData.description_asset_ids || [];
          
          // Check if this asset is already used in another description - prevent duplicate selection
          const existingIndex = descriptionAssetIds.findIndex((id, idx) => id === asset.id && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in description ${existingIndex + 1}. Please select a different asset.`);
            return; // Don't close modal, let user select a different asset
          }
          
          // Clear any previous error
          setAssetSelectorError(null);
          
          const newDescriptions = [...formData.descriptions];
          while (newDescriptions.length <= assetSelectorIndex) {
            newDescriptions.push("");
          }
          newDescriptions[assetSelectorIndex] = asset.text;
          onChange("descriptions", newDescriptions);
          
          const descriptionAssetResourceNames = formData.description_asset_resource_names || [];
          const newDescriptionAssetIds = [...descriptionAssetIds];
          const newDescriptionAssetResourceNames = [...descriptionAssetResourceNames];
          while (newDescriptionAssetIds.length <= assetSelectorIndex) {
            newDescriptionAssetIds.push(undefined);
            newDescriptionAssetResourceNames.push(undefined);
          }
          
          newDescriptionAssetIds[assetSelectorIndex] = asset.id;
          newDescriptionAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("description_asset_ids", newDescriptionAssetIds);
          onChange("description_asset_resource_names", newDescriptionAssetResourceNames);
          
          // Clear any previous error
          setAssetSelectorError(null);
        }
        break;
      case "LONG_HEADLINE":
        if (asset.type === "TEXT" && "text" in asset && assetSelectorIndex !== null) {
          const longHeadlineAssetIds = formData.long_headline_asset_ids || [];
          
          // Check if this asset is already used in another long headline - prevent duplicate selection
          const existingIndex = longHeadlineAssetIds.findIndex((id, idx) => id === asset.id && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in long headline ${existingIndex + 1}. Please select a different asset.`);
            return; // Don't close modal, let user select a different asset
          }
          
          // Clear any previous error
          setAssetSelectorError(null);
          
          const newLongHeadlines = formData.long_headlines || [];
          while (newLongHeadlines.length <= assetSelectorIndex) {
            newLongHeadlines.push("");
          }
          newLongHeadlines[assetSelectorIndex] = asset.text;
          onChange("long_headlines", newLongHeadlines);
          
          const longHeadlineAssetResourceNames = formData.long_headline_asset_resource_names || [];
          const newLongHeadlineAssetIds = [...longHeadlineAssetIds];
          const newLongHeadlineAssetResourceNames = [...longHeadlineAssetResourceNames];
          while (newLongHeadlineAssetIds.length <= assetSelectorIndex) {
            newLongHeadlineAssetIds.push(undefined);
            newLongHeadlineAssetResourceNames.push(undefined);
          }
          newLongHeadlineAssetIds[assetSelectorIndex] = asset.id;
          newLongHeadlineAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("long_headline_asset_ids", newLongHeadlineAssetIds);
          onChange("long_headline_asset_resource_names", newLongHeadlineAssetResourceNames);
          
          // Clear any previous error
          setAssetSelectorError(null);
        }
        break;
      case "IMAGE":
        if (asset.type === "IMAGE" && "image_url" in asset) {
          // Validate marketing image dimensions
          // Marketing Image: 1.91:1 aspect ratio (recommended: 1200x628, minimum: 600x314)
          if (asset.width && asset.height) {
            const aspectRatio = asset.width / asset.height;
            const targetAspectRatio = 1.91;
            const aspectRatioTolerance = 0.1; // Allow 10% tolerance
            
            if (Math.abs(aspectRatio - targetAspectRatio) > aspectRatioTolerance) {
              setAssetSelectorError(
                `This image has an aspect ratio of ${aspectRatio.toFixed(2)}:1. Marketing images must be 1.91:1 (landscape). Recommended: 1200x628 pixels, minimum: 600x314 pixels.`
              );
              return; // Don't close modal, prevent selection
            }
            
            if (asset.width < 600 || asset.height < 314) {
              setAssetSelectorError(
                `This image is ${asset.width}x${asset.height} pixels. Marketing images must be at least 600x314 pixels. Recommended: 1200x628 pixels.`
              );
              return; // Don't close modal, prevent selection
            }
          }
          // If dimensions are not available, allow selection - backend will validate
          
          // Clear any previous error before successful selection
          setAssetSelectorError(null);
          
          onChange("marketing_image_url", asset.image_url || "");
          onChange("marketing_image_asset_resource_name", asset.resource_name);
          onChange("marketing_image_asset_id", asset.id);
          if (asset.image_url) {
            setMarketingImagePreview(asset.image_url);
          }
        }
        break;
      case "SQUARE_IMAGE":
        if (asset.type === "IMAGE" && "image_url" in asset) {
          // Validate square marketing image dimensions
          // Square Marketing Image: 1:1 aspect ratio (recommended: 1200x1200, minimum: 300x300)
          if (asset.width && asset.height) {
            const aspectRatio = asset.width / asset.height;
            const targetAspectRatio = 1.0;
            const aspectRatioTolerance = 0.05; // Allow 5% tolerance for square images
            
            if (Math.abs(aspectRatio - targetAspectRatio) > aspectRatioTolerance) {
              setAssetSelectorError(
                `This image has an aspect ratio of ${aspectRatio.toFixed(2)}:1. Square marketing images must be 1:1 (square). Recommended: 1200x1200 pixels, minimum: 300x300 pixels.`
              );
              return; // Don't close modal, prevent selection
            }
            
            if (asset.width < 300 || asset.height < 300) {
              setAssetSelectorError(
                `This image is ${asset.width}x${asset.height} pixels. Square marketing images must be at least 300x300 pixels. Recommended: 1200x1200 pixels.`
              );
              return; // Don't close modal, prevent selection
            }
          }
          // If dimensions are not available, allow selection - backend will validate
          
          // Clear any previous error before successful selection
          setAssetSelectorError(null);
          
          onChange("square_marketing_image_url", asset.image_url || "");
          onChange("square_marketing_image_asset_resource_name", asset.resource_name);
          onChange("square_marketing_image_asset_id", asset.id);
          if (asset.image_url) {
            setSquareMarketingImagePreview(asset.image_url);
          }
        }
        break;
      case "VIDEO":
        if (asset.type === "YOUTUBE_VIDEO" && "youtube_video_id" in asset) {
          const currentVideos = formData.video_asset_resource_names || [];
          const currentVideoIds = formData.video_asset_ids || [];
          const maxVideos = 5; // Google requirement: max 5 videos per asset group
          
          // Check if we've reached the maximum
          if (currentVideos.length >= maxVideos) {
            setAssetSelectorError(
              `Maximum ${maxVideos} video assets allowed per asset group. Please remove a video before adding another.`
            );
            return; // Don't close modal, prevent selection
          }
          
          // Check if this video is already added (prevent duplicates)
          if (currentVideoIds.includes(asset.id)) {
            setAssetSelectorError(
              "This video asset is already added. Please select a different video."
            );
            return; // Don't close modal, prevent selection
          }
          
          // Add the new video to the array
          onChange("video_asset_resource_names", [...currentVideos, asset.resource_name]);
          onChange("video_asset_ids", [...currentVideoIds, asset.id]);
          
          // Clear any previous error on successful selection
          setAssetSelectorError(null);
        }
        break;
      case "SITELINK":
        if (asset.type === "SITELINK") {
          const currentSitelinks = formData.sitelink_asset_resource_names || [];
          const currentSitelinkIds = formData.sitelink_asset_ids || [];
          if (!currentSitelinks.includes(asset.resource_name)) {
            onChange("sitelink_asset_resource_names", [...currentSitelinks, asset.resource_name]);
            onChange("sitelink_asset_ids", [...currentSitelinkIds, asset.id]);
          }
        }
        break;
      case "CALLOUT":
        if (asset.type === "TEXT" && "text" in asset) {
          const currentCallouts = formData.callout_asset_resource_names || [];
          const currentCalloutIds = formData.callout_asset_ids || [];
          if (!currentCallouts.includes(asset.resource_name)) {
            onChange("callout_asset_resource_names", [...currentCallouts, asset.resource_name]);
            onChange("callout_asset_ids", [...currentCalloutIds, asset.id]);
          }
          return;
        }
        break;
    }
    setAssetSelectorOpen(false);
    setAssetSelectorType(null);
    setAssetSelectorIndex(null);
  };

  const openAssetSelector = (type: "BUSINESS_NAME" | "LOGO" | "HEADLINE" | "DESCRIPTION" | "LONG_HEADLINE" | "IMAGE" | "SQUARE_IMAGE" | "VIDEO" | "SITELINK" | "CALLOUT", index?: number) => {
    if (!profileId) {
      setErrors({ ...errors, general: "Please select a Google Ads account first" });
      return;
    }
    setAssetSelectorType(type);
    setAssetSelectorIndex(index !== undefined ? index : null);
    setAssetSelectorOpen(true);
  };

  const imageAssetsSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="form-label mb-1">
          Marketing Image URL * <span className="text-[10px] text-[#556179] font-normal">(1.91:1 aspect ratio, min 600x314px)</span>
        </label>
        {formData.marketing_image_asset_id ? (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="url"
                value={formData.marketing_image_url || ""}
                disabled
                readOnly
                className="campaign-input w-full pr-28 bg-gray-50 border-gray-200 cursor-not-allowed"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">From Asset</span>
                <button type="button" onClick={() => { onChange("marketing_image_url", ""); onChange("marketing_image_asset_id", undefined); onChange("marketing_image_asset_resource_name", undefined); setMarketingImagePreview(null); }} className="text-red-500 hover:text-red-700 text-sm font-medium" title="Remove selected asset">×</button>
              </div>
            </div>
            {marketingImagePreview && (
              <div><p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p><div className="inline-block border border-gray-200 rounded bg-white p-1"><img src={marketingImagePreview} alt="Marketing" className="max-w-48 max-h-32 w-auto h-auto object-contain block rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setMarketingImagePreview(null); }} /></div></div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <input type="url" value={formData.marketing_image_url || ""} onChange={(e) => { onChange("marketing_image_url", e.target.value); const v = e.target.value.trim(); setMarketingImagePreview((v && /^https?:\/\//.test(v)) ? v : null); }} className={`campaign-input w-full pr-28 ${errors.marketing_image_url ? "border-red-500" : ""}`} placeholder="https://example.com/image.png" />
              {profileId && <div className="absolute right-2 top-1/2 -translate-y-1/2"><button type="button" onClick={() => openAssetSelector("IMAGE")} className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap">Select Asset</button></div>}
            </div>
            {marketingImagePreview && <div><p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p><div className="inline-block border border-gray-200 rounded bg-white p-1"><img src={marketingImagePreview} alt="Marketing" className="max-w-48 max-h-32 w-auto h-auto object-contain block rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setMarketingImagePreview(null); }} /></div></div>}
          </div>
        )}
        {errors.marketing_image_url && <p className="text-[10px] text-red-500 mt-1">{errors.marketing_image_url}</p>}
        <p className="text-[10px] text-[#556179] mt-1">Landscape (1.91:1, min 600×314px).</p>
      </div>
      <div>
        <label className="form-label mb-1">
          Square Marketing Image URL * <span className="text-[10px] text-[#556179] font-normal">(1:1 aspect ratio, min 300x300px)</span>
        </label>
        {formData.square_marketing_image_asset_id ? (
          <div className="space-y-2">
            <div className="relative">
              <input type="url" value={formData.square_marketing_image_url || ""} disabled readOnly className="campaign-input w-full pr-28 bg-gray-50 border-gray-200 cursor-not-allowed" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">From Asset</span>
                <button type="button" onClick={() => { onChange("square_marketing_image_url", ""); onChange("square_marketing_image_asset_id", undefined); onChange("square_marketing_image_asset_resource_name", undefined); setSquareMarketingImagePreview(null); }} className="text-red-500 hover:text-red-700 text-sm font-medium" title="Remove selected asset">×</button>
              </div>
            </div>
            {squareMarketingImagePreview && <div><p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p><div className="inline-block border border-gray-200 rounded p-1 bg-white"><img src={squareMarketingImagePreview} alt="Square" className="w-32 h-32 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setSquareMarketingImagePreview(null); }} /></div></div>}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <input type="url" value={formData.square_marketing_image_url || ""} onChange={(e) => { onChange("square_marketing_image_url", e.target.value); const v = e.target.value.trim(); setSquareMarketingImagePreview((v && /^https?:\/\//.test(v)) ? v : null); }} className={`campaign-input w-full pr-28 ${errors.square_marketing_image_url ? "border-red-500" : ""}`} placeholder="https://example.com/square-image.png" />
              {profileId && <div className="absolute right-2 top-1/2 -translate-y-1/2"><button type="button" onClick={() => openAssetSelector("SQUARE_IMAGE")} className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap">Select Asset</button></div>}
            </div>
            {squareMarketingImagePreview && <div><p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p><div className="inline-block border border-gray-200 rounded p-1 bg-white"><img src={squareMarketingImagePreview} alt="Square" className="w-32 h-32 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setSquareMarketingImagePreview(null); }} /></div></div>}
          </div>
        )}
        {errors.square_marketing_image_url && <p className="text-[10px] text-red-500 mt-1">{errors.square_marketing_image_url}</p>}
        <p className="text-[10px] text-[#556179] mt-1">Square (1:1, min 300×300px).</p>
      </div>
    </div>
  );

  if (showOnlyImageAssets) {
    const showAssetGroupName = visibleKeys?.includes("asset_group_name");
    return (
      <>
        {showAssetGroupName && (
          <div className="mb-4">
            <label className="form-label">Asset group name</label>
            <input
              type="text"
              value={formData.asset_group_name || ""}
              onChange={(e) => onChange("asset_group_name", e.target.value)}
              className={`campaign-input w-full ${errors.asset_group_name ? "border-red-500" : "border-gray-200"}`}
              placeholder="e.g. My Asset Group"
            />
            {errors.asset_group_name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.asset_group_name}</p>
            )}
          </div>
        )}
        <div className="space-y-4 mt-4">{imageAssetsSection}</div>
        {assetSelectorError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-2">
            <p className="text-sm text-red-600">{assetSelectorError}</p>
            <button onClick={() => setAssetSelectorError(null)} className="text-red-600 hover:text-red-800 flex-shrink-0">×</button>
          </div>
        )}
        {profileId && (
          <AssetSelectorModal
            isOpen={assetSelectorOpen}
            onClose={() => { setAssetSelectorOpen(false); setAssetSelectorType(null); setAssetSelectorIndex(null); setAssetSelectorError(null); }}
            onSelect={handleSelectAsset}
            profileId={profileId}
            assetType={assetSelectorType === "IMAGE" || assetSelectorType === "SQUARE_IMAGE" ? "IMAGE" : undefined}
            title={assetSelectorType === "IMAGE" ? "Select Marketing Image (1.91:1)" : assetSelectorType === "SQUARE_IMAGE" ? "Select Square Image (1:1)" : "Select Asset"}
            initialTab="Image"
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Section 1: Business Information */}
      <div className="mt-6">
        <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
          Business Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">
                Business Name * <span className="text-[10px] text-[#556179] font-normal">(max 25 characters)</span>
              </label>
            </div>
            {formData.business_name_asset_id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.business_name || ""}
                  disabled
                  readOnly
                  maxLength={25}
                  className="campaign-input w-full bg-gray-50 border-gray-200 cursor-not-allowed"
                />
                <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                  From Asset
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onChange("business_name", "");
                    onChange("business_name_asset_id", undefined);
                    onChange("business_name_asset_resource_name", undefined);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                  title="Remove selected asset"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                onClick={() => openAssetSelector("BUSINESS_NAME")}
                className="campaign-input w-full cursor-pointer bg-white hover:border-[#136D6D] flex items-center justify-between"
              >
                <span className="text-[#556179]">Click to select Business Name asset</span>
                {profileId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAssetSelector("BUSINESS_NAME");
                    }}
                    className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium"
                  >
                    Select Asset
                  </button>
                )}
              </div>
            )}
            {errors.business_name && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.business_name}
              </p>
            )}
            <p className="text-[10px] text-[#556179] mt-1">
              Required. Select from assets or create a new Business Name asset in the asset selector.
            </p>
          </div>

          <div>
            <label className="form-label mb-1">
              Logo (URL) * <span className="text-[10px] text-[#556179] font-normal">(1:1 aspect ratio, min 128x128px)</span>
            </label>
            <div className="space-y-2">
              {formData.logo_asset_id ? (
                <div className="space-y-2">
                  <div className="relative group">
                    <input
                      type="url"
                      value={formData.logo_url || ""}
                      disabled
                      readOnly
                      className="campaign-input w-full pr-28 bg-gray-50 border-gray-200 cursor-not-allowed"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                        From Asset
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onChange("logo_url", "");
                          onChange("logo_asset_id", undefined);
                          onChange("logo_asset_resource_name", undefined);
                          _setLogoPreview(null);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                        title="Remove selected asset"
                      >
                        ×
                      </button>
                    </div>
                    {formData.logo_url && (formData.logo_url.startsWith("http://") || formData.logo_url.startsWith("https://")) && (
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                          <img
                            src={formData.logo_url}
                            alt="Logo preview"
                            className="w-32 h-32 object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {formData.logo_url && (formData.logo_url.startsWith("http://") || formData.logo_url.startsWith("https://")) && (
                    <div>
                      <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                      <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                        <img
                          src={formData.logo_url}
                          alt="Logo preview"
                          className="w-12 h-12 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.logo_url || ""}
                      onChange={(e) => {
                        onChange("logo_url", e.target.value);
                        const urlValue = e.target.value.trim();
                        if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
                          _setLogoPreview(urlValue);
                        } else {
                          _setLogoPreview(null);
                        }
                      }}
                      className={`campaign-input w-full pr-28 ${
                        errors.logo_url ? "border-red-500" : ""
                      }`}
                      placeholder="https://example.com/logo.png"
                    />
                    {profileId && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          onClick={() => openAssetSelector("LOGO")}
                          className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                        >
                          Select Asset
                        </button>
                      </div>
                    )}
                  </div>
                  {_logoPreview && (
                    <div>
                      <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                      <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                        <img
                          src={_logoPreview}
                          alt="Logo preview"
                          className="w-12 h-12 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            _setLogoPreview(null);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {errors.logo_url && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.logo_url}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Required. Enter logo URL directly or select from assets. Must be 1:1 aspect ratio, minimum 128x128px.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Asset Group Settings */}
      <div className="mt-6">
        <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
          Asset Group Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="form-label">
              Asset Group Name *
            </label>
            <input
              type="text"
              value={formData.asset_group_name || ""}
              onChange={(e) => onChange("asset_group_name", e.target.value)}
              className={`campaign-input w-full ${
                errors.asset_group_name ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="Required asset group name"
            />
            {errors.asset_group_name && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.asset_group_name}
              </p>
            )}
          </div>
          <div>
            <label className="form-label">
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
              <p className="text-[10px] text-red-500 mt-1">
                {errors.final_url}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Asset Tabs */}
      <div className="mt-6">
        <div className="mb-6 overflow-hidden">
          <div className="flex bg-[#FEFEFB] border-b border-[#e8e8e3]">
            {ASSET_TABS.map((tab) => {
              const isActive = activeAssetTab === tab.id;
              const hasErrors = hasTabErrors(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveAssetTab(tab.id);
                  }}
                  className={`px-4 py-2 text-[14px] transition-colors ${
                    hasErrors
                      ? "border-b-2 border-red-500"
                      : isActive
                        ? "text-[#072929] bg-[#FEFEFB] border-b-2 border-[#136D6D]"
                        : "text-[#556179] hover:text-[#072929] hover:bg-[#f5f5f0]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Text Assets Tab */}
          {activeAssetTab === "text" && (
            <div className="p-3">
              <div className="space-y-5">
                {/* Headlines */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">
                      Headlines * ({minHeadlines}-{maxHeadlines} required)
                      <span className="text-[10px] text-[#556179] font-normal ml-2">
                        ({formData.headlines?.filter((h) => h.trim()).length || 0}/{maxHeadlines})
                      </span>
                    </label>
                  </div>
                  <div className="space-y-2" data-headlines-section>
                    {formData.headlines?.map((headline, index) => {
                      const headlineAssetId = formData.headline_asset_ids?.[index];
                      return (
                        <div key={index} className="flex gap-2 items-center">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={headline}
                              onChange={(e) => {
                                onUpdateHeadline(index, e.target.value);
                                if (headlineAssetId && e.target.value !== headline) {
                                  const newHeadlineAssetIds = [...(formData.headline_asset_ids || [])];
                                  const newHeadlineAssetResourceNames = [...(formData.headline_asset_resource_names || [])];
                                  newHeadlineAssetIds[index] = undefined;
                                  newHeadlineAssetResourceNames[index] = undefined;
                                  onChange("headline_asset_ids", newHeadlineAssetIds);
                                  onChange("headline_asset_resource_names", newHeadlineAssetResourceNames);
                                }
                              }}
                              disabled={!!headlineAssetId}
                              readOnly={!!headlineAssetId}
                              maxLength={30}
                              className={`campaign-input w-full pr-28 ${
                                errors.headlines ? "border-red-500" : ""
                              } ${headlineAssetId ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                              placeholder={`Headline ${index + 1} (max 30 characters)`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && 
                                    formData.headlines &&
                                    index === formData.headlines.length - 1 && 
                                    headline.trim() &&
                                    formData.headlines.length < maxHeadlines) {
                                  e.preventDefault();
                                  onAddHeadline();
                                  setTimeout(() => {
                                    const headlinesSection = document.querySelector('[data-headlines-section]');
                                    if (headlinesSection) {
                                      const headlineInputs = headlinesSection.querySelectorAll('input[type="text"]');
                                      const lastInput = headlineInputs[headlineInputs.length - 1] as HTMLInputElement;
                                      lastInput?.focus();
                                    }
                                  }, 100);
                                }
                              }}
                              onBlur={(e) => {
                                if (formData.headlines &&
                                    index === formData.headlines.length - 1 && 
                                    e.target.value.trim() && 
                                    formData.headlines.length < maxHeadlines) {
                                  onAddHeadline();
                                }
                              }}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {headlineAssetId && (
                                <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                                  From Asset
                                </span>
                              )}
                              {profileId && !headlineAssetId && (
                                <button
                                  type="button"
                                  onClick={() => openAssetSelector("HEADLINE", index)}
                                  className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                                >
                                  Select Asset
                                </button>
                              )}
                              {headlineAssetId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newHeadlineAssetIds = [...(formData.headline_asset_ids || [])];
                                    const newHeadlineAssetResourceNames = [...(formData.headline_asset_resource_names || [])];
                                    newHeadlineAssetIds[index] = undefined;
                                    newHeadlineAssetResourceNames[index] = undefined;
                                    onChange("headline_asset_ids", newHeadlineAssetIds);
                                    onChange("headline_asset_resource_names", newHeadlineAssetResourceNames);
                                    onUpdateHeadline(index, "");
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                  title="Remove selected asset"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                          {formData.headlines && formData.headlines.length > minHeadlines && (
                            <button
                              type="button"
                              onClick={() => {
                                if (headlineAssetId) {
                                  const newHeadlineAssetIds = [...(formData.headline_asset_ids || [])];
                                  const newHeadlineAssetResourceNames = [...(formData.headline_asset_resource_names || [])];
                                  newHeadlineAssetIds.splice(index, 1);
                                  newHeadlineAssetResourceNames.splice(index, 1);
                                  onChange("headline_asset_ids", newHeadlineAssetIds);
                                  onChange("headline_asset_resource_names", newHeadlineAssetResourceNames);
                                }
                                onRemoveHeadline(index);
                              }}
                              className="p-2 hover:bg-red-50 rounded transition-colors"
                              title="Remove headline"
                            >
                              <svg
                                className="w-5 h-5 text-red-600"
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
                          )}
                        </div>
                      );
                    })}
                    {formData.headlines && formData.headlines.length < maxHeadlines && (
                      <button
                        type="button"
                        onClick={onAddHeadline}
                        className="edit-button"
                      >
                        + Add Headline
                      </button>
                    )}
                  </div>
                  {errors.headlines && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.headlines}
                    </p>
                  )}
                </div>

                {/* Descriptions */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">
                      Descriptions * ({minDescriptions}-{maxDescriptions} required)
                      <span className="text-[10px] text-[#556179] font-normal ml-2">
                        ({formData.descriptions?.filter((d) => d.trim()).length || 0}/{maxDescriptions})
                      </span>
                    </label>
                  </div>
                  <div className="space-y-2" data-descriptions-section>
                    {formData.descriptions?.map((description, index) => {
                      const descriptionAssetId = formData.description_asset_ids?.[index];
                      return (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 relative">
                            <textarea
                              value={description}
                              onChange={(e) => {
                                onUpdateDescription(index, e.target.value);
                                if (descriptionAssetId && e.target.value !== description) {
                                  const newDescriptionAssetIds = [...(formData.description_asset_ids || [])];
                                  const newDescriptionAssetResourceNames = [...(formData.description_asset_resource_names || [])];
                                  newDescriptionAssetIds[index] = undefined;
                                  newDescriptionAssetResourceNames[index] = undefined;
                                  onChange("description_asset_ids", newDescriptionAssetIds);
                                  onChange("description_asset_resource_names", newDescriptionAssetResourceNames);
                                }
                              }}
                              disabled={!!descriptionAssetId}
                              readOnly={!!descriptionAssetId}
                              maxLength={90}
                              onKeyDown={(e) => {
                                if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) &&
                                    formData.descriptions &&
                                    index === formData.descriptions.length - 1 && 
                                    description.trim() &&
                                    formData.descriptions.length < maxDescriptions) {
                                  e.preventDefault();
                                  onAddDescription();
                                  setTimeout(() => {
                                    const descriptionsSection = document.querySelector('[data-descriptions-section]');
                                    if (descriptionsSection) {
                                      const descriptionTextareas = descriptionsSection.querySelectorAll('textarea');
                                      const lastTextarea = descriptionTextareas[descriptionTextareas.length - 1] as HTMLTextAreaElement;
                                      lastTextarea?.focus();
                                    }
                                  }, 100);
                                }
                              }}
                              onBlur={(e) => {
                                if (formData.descriptions &&
                                    index === formData.descriptions.length - 1 && 
                                    e.target.value.trim() && 
                                    formData.descriptions.length < maxDescriptions) {
                                  onAddDescription();
                                }
                              }}
                              rows={2}
                              className={`campaign-input w-full pr-28 ${
                                errors.descriptions ? "border-red-500" : ""
                              } ${descriptionAssetId ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                              placeholder={`Description ${index + 1} (max 90 characters)`}
                            />
                            <div className="absolute right-2 top-2 flex items-center gap-2">
                              {descriptionAssetId && (
                                <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                                  From Asset
                                </span>
                              )}
                              {profileId && !descriptionAssetId && (
                                <button
                                  type="button"
                                  onClick={() => openAssetSelector("DESCRIPTION", index)}
                                  className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                                >
                                  Select Asset
                                </button>
                              )}
                              {descriptionAssetId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newDescriptionAssetIds = [...(formData.description_asset_ids || [])];
                                    const newDescriptionAssetResourceNames = [...(formData.description_asset_resource_names || [])];
                                    newDescriptionAssetIds[index] = undefined;
                                    newDescriptionAssetResourceNames[index] = undefined;
                                    onChange("description_asset_ids", newDescriptionAssetIds);
                                    onChange("description_asset_resource_names", newDescriptionAssetResourceNames);
                                    onUpdateDescription(index, "");
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                  title="Remove selected asset"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                          {formData.descriptions && formData.descriptions.length > minDescriptions && (
                            <button
                              type="button"
                              onClick={() => {
                                if (descriptionAssetId) {
                                  const newDescriptionAssetIds = [...(formData.description_asset_ids || [])];
                                  const newDescriptionAssetResourceNames = [...(formData.description_asset_resource_names || [])];
                                  newDescriptionAssetIds.splice(index, 1);
                                  newDescriptionAssetResourceNames.splice(index, 1);
                                  onChange("description_asset_ids", newDescriptionAssetIds);
                                  onChange("description_asset_resource_names", newDescriptionAssetResourceNames);
                                }
                                onRemoveDescription(index);
                              }}
                              className="p-2 hover:bg-red-50 rounded transition-colors mt-1"
                              title="Remove description"
                            >
                              <svg
                                className="w-5 h-5 text-red-600"
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
                          )}
                        </div>
                      );
                    })}
                    {formData.descriptions && formData.descriptions.length < maxDescriptions && (
                      <button
                        type="button"
                        onClick={onAddDescription}
                        className="edit-button"
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

                {/* Long Headlines */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">
                      Long Headlines * <span className="text-[10px] text-[#556179] font-normal">(at least 1 required, max 90 characters)</span>
                    </label>
                  </div>
                  <div className="space-y-2" data-long-headlines-section>
                    {(formData.long_headlines || []).map((longHeadline, index) => {
                      const longHeadlineAssetId = formData.long_headline_asset_ids?.[index];
                      return (
                        <div key={index} className="flex gap-2 items-center">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={longHeadline}
                              onChange={(e) => {
                                const newLongHeadlines = [...(formData.long_headlines || [])];
                                newLongHeadlines[index] = e.target.value;
                                onChange("long_headlines", newLongHeadlines);
                                if (longHeadlineAssetId && e.target.value !== longHeadline) {
                                  const newLongHeadlineAssetIds = [...(formData.long_headline_asset_ids || [])];
                                  const newLongHeadlineAssetResourceNames = [...(formData.long_headline_asset_resource_names || [])];
                                  newLongHeadlineAssetIds[index] = undefined;
                                  newLongHeadlineAssetResourceNames[index] = undefined;
                                  onChange("long_headline_asset_ids", newLongHeadlineAssetIds);
                                  onChange("long_headline_asset_resource_names", newLongHeadlineAssetResourceNames);
                                }
                              }}
                              disabled={!!longHeadlineAssetId}
                              readOnly={!!longHeadlineAssetId}
                              maxLength={90}
                              className={`campaign-input w-full pr-28 ${
                                errors.long_headlines ? "border-red-500" : ""
                              } ${longHeadlineAssetId ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                              placeholder={`Long Headline ${index + 1} (max 90 characters)`}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {longHeadlineAssetId && (
                                <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                                  From Asset
                                </span>
                              )}
                              {profileId && !longHeadlineAssetId && (
                                <button
                                  type="button"
                                  onClick={() => openAssetSelector("LONG_HEADLINE", index)}
                                  className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                                >
                                  Select Asset
                                </button>
                              )}
                              {longHeadlineAssetId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newLongHeadlineAssetIds = [...(formData.long_headline_asset_ids || [])];
                                    const newLongHeadlineAssetResourceNames = [...(formData.long_headline_asset_resource_names || [])];
                                    newLongHeadlineAssetIds[index] = undefined;
                                    newLongHeadlineAssetResourceNames[index] = undefined;
                                    onChange("long_headline_asset_ids", newLongHeadlineAssetIds);
                                    onChange("long_headline_asset_resource_names", newLongHeadlineAssetResourceNames);
                                    const newLongHeadlines = [...(formData.long_headlines || [])];
                                    newLongHeadlines[index] = "";
                                    onChange("long_headlines", newLongHeadlines);
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                  title="Remove selected asset"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                          {(formData.long_headlines?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (longHeadlineAssetId) {
                                  const newLongHeadlineAssetIds = [...(formData.long_headline_asset_ids || [])];
                                  const newLongHeadlineAssetResourceNames = [...(formData.long_headline_asset_resource_names || [])];
                                  newLongHeadlineAssetIds.splice(index, 1);
                                  newLongHeadlineAssetResourceNames.splice(index, 1);
                                  onChange("long_headline_asset_ids", newLongHeadlineAssetIds);
                                  onChange("long_headline_asset_resource_names", newLongHeadlineAssetResourceNames);
                                }
                                const newLongHeadlines = [...(formData.long_headlines || [])];
                                newLongHeadlines.splice(index, 1);
                                onChange("long_headlines", newLongHeadlines);
                              }}
                              className="p-2 hover:bg-red-50 rounded transition-colors"
                              title="Remove long headline"
                            >
                              <svg
                                className="w-5 h-5 text-red-600"
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
                          )}
                        </div>
                      );
                    })}
                    {(formData.long_headlines?.length || 0) === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onChange("long_headlines", [""]);
                        }}
                        className="edit-button"
                      >
                        + Add Long Headline
                      </button>
                    )}
                  </div>
                  {errors.long_headlines && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.long_headlines}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Image Assets Tab */}
          {activeAssetTab === "images" && (
            <div className="p-3">
              {imageAssetsSection}
            </div>
          )}

          {/* Video Assets Tab */}
          {activeAssetTab === "videos" && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-semibold text-[#072929]">
                  Video Assets (Optional)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.video_asset_resource_names?.length || 0}/5)
                  </span>
                </h4>
                {profileId && (
                  <button
                    type="button"
                    onClick={() => openAssetSelector("VIDEO")}
                    disabled={(formData.video_asset_resource_names?.length || 0) >= 5}
                    className={`text-xs font-medium ${
                      (formData.video_asset_resource_names?.length || 0) >= 5
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-[#136D6D] hover:text-[#0f5a5a]"
                    }`}
                  >
                    Select Asset
                  </button>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                {formData.video_asset_resource_names && formData.video_asset_resource_names.length > 0 ? (
                  <div className="space-y-2">
                    {formData.video_asset_resource_names.map((_resourceName, index) => {
                      const videoId = formData.video_asset_ids?.[index];
                      return (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#072929]">Video {index + 1}</span>
                            {videoId && (
                              <a
                                href={`https://www.youtube.com/watch?v=${videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#136D6D] hover:underline"
                              >
                                View on YouTube
                              </a>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newVideos = formData.video_asset_resource_names?.filter((_, i) => i !== index) || [];
                              const newVideoIds = formData.video_asset_ids?.filter((_, i) => i !== index) || [];
                              onChange("video_asset_resource_names", newVideos);
                              onChange("video_asset_ids", newVideoIds);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#556179]">No video asset selected. Click "Select Asset" to add a video (max 5 allowed).</p>
                )}
                {(formData.video_asset_resource_names?.length || 0) >= 5 && (
                  <p className="text-xs text-[#556179] mt-2">
                    Maximum 5 videos reached. Videos must be horizontal (16:9), square (1:1), or vertical (9:16) aspect ratio, and at least 10 seconds in duration.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Additional Assets Tab */}
          {activeAssetTab === "additional" && (
            <div className="p-3">
              <div className="space-y-5">
                {/* Sitelink Assets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-semibold text-[#072929]">
                      Sitelink Assets (Optional)
                    </h4>
                    {profileId && (
                      <button
                        type="button"
                        onClick={() => openAssetSelector("SITELINK")}
                        className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium"
                      >
                        Select Asset
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                    {formData.sitelink_asset_resource_names && formData.sitelink_asset_resource_names.length > 0 ? (
                      <div className="space-y-2">
                        {formData.sitelink_asset_resource_names.map((_resourceName, index) => {
                          const sitelinkId = formData.sitelink_asset_ids?.[index];
                          return (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                              <div>
                                <span className="text-sm text-[#072929] font-medium">Sitelink {index + 1}</span>
                                {sitelinkId && (
                                  <span className="text-xs text-[#556179] ml-2">ID: {sitelinkId}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newSitelinks = formData.sitelink_asset_resource_names?.filter((_, i) => i !== index) || [];
                                  const newSitelinkIds = formData.sitelink_asset_ids?.filter((_, i) => i !== index) || [];
                                  onChange("sitelink_asset_resource_names", newSitelinks);
                                  onChange("sitelink_asset_ids", newSitelinkIds);
                                }}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#556179]">No sitelink assets selected. Click "Select Asset" to add sitelinks.</p>
                    )}
                  </div>
                </div>

                {/* Callout Assets - COMMENTED OUT FOR NOW */}
                {/* <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-semibold text-[#072929]">
                      Callout Assets (Optional)
                    </h4>
                    {profileId && (
                      <button
                        type="button"
                        onClick={() => openAssetSelector("CALLOUT")}
                        className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium"
                      >
                        Select Asset
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                    {formData.callout_asset_resource_names && formData.callout_asset_resource_names.length > 0 ? (
                      <div className="space-y-2">
                        {formData.callout_asset_resource_names.map((_resourceName, index) => {
                          const calloutId = formData.callout_asset_ids?.[index];
                          return (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                              <div>
                                <span className="text-sm text-[#072929] font-medium">Callout {index + 1}</span>
                                {calloutId && (
                                  <span className="text-xs text-[#556179] ml-2">ID: {calloutId}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newCallouts = formData.callout_asset_resource_names?.filter((_, i) => i !== index) || [];
                                  const newCalloutIds = formData.callout_asset_ids?.filter((_, i) => i !== index) || [];
                                  onChange("callout_asset_resource_names", newCallouts);
                                  onChange("callout_asset_ids", newCalloutIds);
                                }}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#556179]">No callout assets selected. Click "Select Asset" to add callouts.</p>
                    )}
                  </div>
                </div> */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Selector Modal */}
      {assetSelectorError && (
        <div className="fixed top-4 right-4 z-[60] bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium">{assetSelectorError}</p>
            </div>
            <button
              onClick={() => setAssetSelectorError(null)}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {profileId && (
        <AssetSelectorModal
          isOpen={assetSelectorOpen}
          onClose={() => {
            setAssetSelectorOpen(false);
            setAssetSelectorType(null);
            setAssetSelectorError(null);
          }}
          onSelect={handleSelectAsset}
          profileId={profileId}
          assetType={
            assetSelectorType === "IMAGE" || assetSelectorType === "SQUARE_IMAGE" || assetSelectorType === "LOGO" ? "IMAGE" :
            assetSelectorType === "VIDEO" ? "YOUTUBE_VIDEO" :
            assetSelectorType === "SITELINK" ? "SITELINK" :
            assetSelectorType === "BUSINESS_NAME" || assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION" || assetSelectorType === "LONG_HEADLINE" || assetSelectorType === "CALLOUT" ? "TEXT" :
            undefined
          }
          title={
            assetSelectorType === "BUSINESS_NAME" ? "Select Business Name Asset" :
            assetSelectorType === "LOGO" ? "Select Logo Asset" :
            assetSelectorType === "HEADLINE" ? `Select Headline ${assetSelectorIndex !== null ? assetSelectorIndex + 1 : ""} Asset` :
            assetSelectorType === "DESCRIPTION" ? `Select Description ${assetSelectorIndex !== null ? assetSelectorIndex + 1 : ""} Asset` :
            assetSelectorType === "LONG_HEADLINE" ? `Select Long Headline ${assetSelectorIndex !== null ? assetSelectorIndex + 1 : ""} Asset` :
            assetSelectorType === "IMAGE" ? "Select Marketing Image Asset" :
            assetSelectorType === "SQUARE_IMAGE" ? "Select Square Marketing Image Asset" :
            assetSelectorType === "VIDEO" ? "Select Video Asset" :
            assetSelectorType === "SITELINK" ? "Select Sitelink Asset" :
            assetSelectorType === "CALLOUT" ? "Select Callout Asset" :
            "Select Asset"
          }
          allowMultiple={
            assetSelectorType === "CALLOUT"
          }
          initialTab={
            assetSelectorType === "BUSINESS_NAME" ? "Business Name" :
            assetSelectorType === "LOGO" ? "Logo" :
            assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION" || assetSelectorType === "LONG_HEADLINE" ? "Text" :
            assetSelectorType === "IMAGE" || assetSelectorType === "SQUARE_IMAGE" ? "Image" :
            assetSelectorType === "VIDEO" ? "YouTube Video" :
            assetSelectorType === "SITELINK" ? "Sitelink" :
            assetSelectorType === "CALLOUT" ? "Callout" :
            undefined
          }
          initialTextSubTab={
            assetSelectorType === "HEADLINE" ? "Headline" :
            assetSelectorType === "DESCRIPTION" ? "Description" :
            assetSelectorType === "LONG_HEADLINE" ? "Long Headline" :
            undefined
          }
        />
      )}
    </>
  );
};
