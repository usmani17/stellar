import React, { useState } from "react";
import { AssetSelectorModal } from "./AssetSelectorModal";
import type { Asset } from "../../services/googleAdwords/googleAdwordsAssets";

export type AdType = "RESPONSIVE_SEARCH_AD" | "RESPONSIVE_DISPLAY_AD";

export interface AdFormData {
  ad_type: AdType;
  // RSA fields
  headlines: string[];
  descriptions: string[];
  path1?: string;
  path2?: string;
  headline_pins?: string[]; // HEADLINE_1, HEADLINE_2, etc.
  description_pins?: string[]; // DESCRIPTION_1, etc.
  headline_asset_ids?: (number | undefined)[];
  headline_asset_resource_names?: (string | undefined)[];
  description_asset_ids?: (number | undefined)[];
  description_asset_resource_names?: (string | undefined)[];
  // RDA fields
  marketing_image_urls?: string[];
  square_marketing_image_urls?: string[];
  marketing_image_asset_ids?: (number | undefined)[];
  marketing_image_asset_resource_names?: (string | undefined)[];
  square_marketing_image_asset_ids?: (number | undefined)[];
  square_marketing_image_asset_resource_names?: (string | undefined)[];
  long_headline?: string;
  long_headline_asset_id?: number;
  long_headline_asset_resource_name?: string;
  business_name?: string;
  // Common
  final_url?: string;
}

interface CreateGoogleSearchAdTypeFormProps {
  formData: AdFormData;
  errors: Record<string, string>;
  onChange: (field: keyof AdFormData, value: any) => void;
  profileId?: number | null;
  onAddHeadline: () => void;
  onRemoveHeadline: (index: number) => void;
  onUpdateHeadline: (index: number, value: string) => void;
  onAddDescription: () => void;
  onRemoveDescription: (index: number) => void;
  onUpdateDescription: (index: number, value: string) => void;
  onAddMarketingImage: () => void;
  onRemoveMarketingImage: (index: number) => void;
  onUpdateMarketingImage: (index: number, value: string) => void;
  onAddSquareMarketingImage: () => void;
  onRemoveSquareMarketingImage: (index: number) => void;
  onUpdateSquareMarketingImage: (index: number, value: string) => void;
}

export const CreateGoogleSearchAdTypeForm: React.FC<CreateGoogleSearchAdTypeFormProps> = ({
  formData,
  errors,
  onChange,
  profileId,
  onAddHeadline,
  onRemoveHeadline,
  onUpdateHeadline,
  onAddDescription,
  onRemoveDescription,
  onUpdateDescription,
  onAddMarketingImage,
  onRemoveMarketingImage,
  onUpdateMarketingImage,
  onAddSquareMarketingImage,
  onRemoveSquareMarketingImage,
  onUpdateSquareMarketingImage,
}) => {
  // Asset Selector Modal state
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorType, setAssetSelectorType] = useState<"HEADLINE" | "DESCRIPTION" | "LONG_HEADLINE" | "IMAGE" | "SQUARE_IMAGE" | null>(null);
  const [assetSelectorIndex, setAssetSelectorIndex] = useState<number | null>(null);
  const [assetSelectorError, setAssetSelectorError] = useState<string | null>(null);

  const handleSelectAsset = (asset: Asset) => {
    if (!assetSelectorType || !profileId) {
      console.warn("Asset selection failed: missing assetSelectorType or profileId", { assetSelectorType, profileId });
      return;
    }

    switch (assetSelectorType) {
      case "HEADLINE":
        if (asset.type === "TEXT" && "text" in asset && formData.headlines && assetSelectorIndex !== null) {
          const headlineAssetIds = formData.headline_asset_ids || [];
          
          // Check if this asset is already used in another headline - prevent duplicate selection
          const assetIdNum = parseInt(asset.id, 10);
          const existingIndex = headlineAssetIds.findIndex((id, idx) => id === assetIdNum && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in headline ${existingIndex + 1}. Please select a different asset.`);
            return;
          }
          
          setAssetSelectorError(null);
          
          // Update headline text - use onChange like PMax does
          const newHeadlines = [...(formData.headlines || [])];
          while (newHeadlines.length <= assetSelectorIndex) {
            newHeadlines.push("");
          }
          newHeadlines[assetSelectorIndex] = asset.text;
          onChange("headlines", newHeadlines);
          
          // Update asset IDs and resource names
          const headlineAssetResourceNames = formData.headline_asset_resource_names || [];
          const newHeadlineAssetIds = [...headlineAssetIds];
          const newHeadlineAssetResourceNames = [...headlineAssetResourceNames];
          while (newHeadlineAssetIds.length <= assetSelectorIndex) {
            newHeadlineAssetIds.push(undefined);
            newHeadlineAssetResourceNames.push(undefined);
          }
          
          newHeadlineAssetIds[assetSelectorIndex] = assetIdNum;
          newHeadlineAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("headline_asset_ids", newHeadlineAssetIds);
          onChange("headline_asset_resource_names", newHeadlineAssetResourceNames);
          
          setAssetSelectorOpen(false);
          setAssetSelectorType(null);
          setAssetSelectorIndex(null);
        } else {
          console.warn("Asset selection failed for HEADLINE:", { 
            assetType: asset.type, 
            hasText: "text" in asset, 
            hasHeadlines: !!formData.headlines, 
            assetSelectorIndex 
          });
        }
        break;
      case "DESCRIPTION":
        if (asset.type === "TEXT" && "text" in asset && formData.descriptions && assetSelectorIndex !== null) {
          const descriptionAssetIds = formData.description_asset_ids || [];
          
          // Check if this asset is already used in another description - prevent duplicate selection
          const assetIdNum = parseInt(asset.id, 10);
          const existingIndex = descriptionAssetIds.findIndex((id, idx) => id === assetIdNum && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in description ${existingIndex + 1}. Please select a different asset.`);
            return;
          }
          
          setAssetSelectorError(null);
          
          // Update description text - use onChange like PMax does
          const newDescriptions = [...formData.descriptions];
          while (newDescriptions.length <= assetSelectorIndex) {
            newDescriptions.push("");
          }
          newDescriptions[assetSelectorIndex] = asset.text;
          onChange("descriptions", newDescriptions);
          
          // Update asset IDs and resource names
          const descriptionAssetResourceNames = formData.description_asset_resource_names || [];
          const newDescriptionAssetIds = [...descriptionAssetIds];
          const newDescriptionAssetResourceNames = [...descriptionAssetResourceNames];
          while (newDescriptionAssetIds.length <= assetSelectorIndex) {
            newDescriptionAssetIds.push(undefined);
            newDescriptionAssetResourceNames.push(undefined);
          }
          
          newDescriptionAssetIds[assetSelectorIndex] = parseInt(asset.id, 10);
          newDescriptionAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("description_asset_ids", newDescriptionAssetIds);
          onChange("description_asset_resource_names", newDescriptionAssetResourceNames);
          
          setAssetSelectorOpen(false);
          setAssetSelectorType(null);
          setAssetSelectorIndex(null);
        }
        break;
      case "LONG_HEADLINE":
        if (asset.type === "TEXT" && "text" in asset) {
          onChange("long_headline", asset.text);
          onChange("long_headline_asset_id", parseInt(asset.id, 10));
          onChange("long_headline_asset_resource_name", asset.resource_name);
          
          setAssetSelectorOpen(false);
          setAssetSelectorType(null);
          setAssetSelectorIndex(null);
        }
        break;
      case "IMAGE":
        if (asset.type === "IMAGE" && "image_url" in asset && formData.marketing_image_urls && assetSelectorIndex !== null) {
          const marketingImageAssetIds = formData.marketing_image_asset_ids || [];
          
          // Check if this asset is already used in another marketing image - prevent duplicate selection
          const assetIdNum = parseInt(asset.id, 10);
          const existingIndex = marketingImageAssetIds.findIndex((id, idx) => id === assetIdNum && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in marketing image ${existingIndex + 1}. Please select a different asset.`);
            return;
          }
          
          setAssetSelectorError(null);
          
          const newMarketingImageUrls = [...formData.marketing_image_urls];
          while (newMarketingImageUrls.length <= assetSelectorIndex) {
            newMarketingImageUrls.push("");
          }
          newMarketingImageUrls[assetSelectorIndex] = asset.image_url || "";
          onChange("marketing_image_urls", newMarketingImageUrls);
          
          const marketingImageAssetResourceNames = formData.marketing_image_asset_resource_names || [];
          const newMarketingImageAssetIds = [...marketingImageAssetIds];
          const newMarketingImageAssetResourceNames = [...marketingImageAssetResourceNames];
          while (newMarketingImageAssetIds.length <= assetSelectorIndex) {
            newMarketingImageAssetIds.push(undefined);
            newMarketingImageAssetResourceNames.push(undefined);
          }
          
          newMarketingImageAssetIds[assetSelectorIndex] = parseInt(asset.id, 10);
          newMarketingImageAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("marketing_image_asset_ids", newMarketingImageAssetIds);
          onChange("marketing_image_asset_resource_names", newMarketingImageAssetResourceNames);
          
          setAssetSelectorOpen(false);
          setAssetSelectorType(null);
          setAssetSelectorIndex(null);
        }
        break;
      case "SQUARE_IMAGE":
        if (asset.type === "IMAGE" && "image_url" in asset && formData.square_marketing_image_urls && assetSelectorIndex !== null) {
          const squareImageAssetIds = formData.square_marketing_image_asset_ids || [];
          
          // Check if this asset is already used in another square marketing image - prevent duplicate selection
          const assetIdNum = parseInt(asset.id, 10);
          const existingIndex = squareImageAssetIds.findIndex((id, idx) => id === assetIdNum && idx !== assetSelectorIndex);
          if (existingIndex !== -1) {
            setAssetSelectorError(`This asset is already used in square marketing image ${existingIndex + 1}. Please select a different asset.`);
            return;
          }
          
          setAssetSelectorError(null);
          
          const newSquareImageUrls = [...formData.square_marketing_image_urls];
          while (newSquareImageUrls.length <= assetSelectorIndex) {
            newSquareImageUrls.push("");
          }
          newSquareImageUrls[assetSelectorIndex] = asset.image_url || "";
          onChange("square_marketing_image_urls", newSquareImageUrls);
          
          const squareImageAssetResourceNames = formData.square_marketing_image_asset_resource_names || [];
          const newSquareImageAssetIds = [...squareImageAssetIds];
          const newSquareImageAssetResourceNames = [...squareImageAssetResourceNames];
          while (newSquareImageAssetIds.length <= assetSelectorIndex) {
            newSquareImageAssetIds.push(undefined);
            newSquareImageAssetResourceNames.push(undefined);
          }
          
          newSquareImageAssetIds[assetSelectorIndex] = parseInt(asset.id, 10);
          newSquareImageAssetResourceNames[assetSelectorIndex] = asset.resource_name;
          onChange("square_marketing_image_asset_ids", newSquareImageAssetIds);
          onChange("square_marketing_image_asset_resource_names", newSquareImageAssetResourceNames);
          
          setAssetSelectorOpen(false);
          setAssetSelectorType(null);
          setAssetSelectorIndex(null);
        }
        break;
    }
  };

  const openAssetSelector = (type: "HEADLINE" | "DESCRIPTION" | "LONG_HEADLINE" | "IMAGE" | "SQUARE_IMAGE", index?: number) => {
    setAssetSelectorType(type);
    setAssetSelectorIndex(index ?? null);
    setAssetSelectorError(null);
    setAssetSelectorOpen(true);
  };

  const minHeadlines = 3;
  const maxHeadlines = 15;
  const minDescriptions = 2;
  const maxDescriptions = 4;

  return (
    <>
      {/* Ad Type Selection */}
      <div className="mb-6">
        <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
          Ad Type
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="ad_type"
              value="RESPONSIVE_SEARCH_AD"
              checked={formData.ad_type === "RESPONSIVE_SEARCH_AD"}
              onChange={(e) => onChange("ad_type", e.target.value as AdType)}
              className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D]"
            />
            <span className="text-[13.3px] text-[#072929]">Responsive Search Ad</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="ad_type"
              value="RESPONSIVE_DISPLAY_AD"
              checked={formData.ad_type === "RESPONSIVE_DISPLAY_AD"}
              onChange={(e) => onChange("ad_type", e.target.value as AdType)}
              className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D]"
            />
            <span className="text-[13.3px] text-[#072929]">Responsive Display Ad</span>
          </label>
        </div>
      </div>

      {/* Common Fields */}
      <div className="mb-6">
        <div className="mb-3">
          <label className="form-label-small">
            Final URL (Optional)
          </label>
          <input
            type="url"
            value={formData.final_url || ""}
            onChange={(e) => onChange("final_url", e.target.value)}
            placeholder="https://example.com"
            className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
          />
        </div>
      </div>

      {/* RSA Fields */}
      {formData.ad_type === "RESPONSIVE_SEARCH_AD" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[#072929]">
              Responsive Search Ad
            </h3>
          </div>

          {/* Headlines */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Headlines * ({minHeadlines}-{maxHeadlines} required)
                <span className="text-[10px] text-[#556179] font-normal ml-2">
                  ({formData.headlines?.filter((h) => h.trim()).length || 0}/{maxHeadlines})
                </span>
              </label>
            </div>
            <div className="space-y-2">
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
                    {/* Pinning Control for RSA */}
                    {formData.ad_type === "RESPONSIVE_SEARCH_AD" && (
                      <select
                        value={formData.headline_pins?.[index] || ""}
                        onChange={(e) => {
                          const selectedPin = e.target.value;
                          const newPins = [...(formData.headline_pins || [])];
                          while (newPins.length <= index) {
                            newPins.push("");
                          }
                          
                          // If selecting a pin, clear it from any other headline
                          if (selectedPin) {
                            for (let i = 0; i < newPins.length; i++) {
                              if (i !== index && newPins[i] === selectedPin) {
                                newPins[i] = "";
                              }
                            }
                          }
                          
                          newPins[index] = selectedPin;
                          onChange("headline_pins", newPins);
                        }}
                        className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                      >
                        <option value="">No Pin</option>
                        <option value="HEADLINE_1">Pin to Headline 1</option>
                        <option value="HEADLINE_2">Pin to Headline 2</option>
                        <option value="HEADLINE_3">Pin to Headline 3</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            {formData.headlines && formData.headlines.length < maxHeadlines && (
              <button
                type="button"
                onClick={onAddHeadline}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Headline
              </button>
            )}
            {errors.headlines && (
              <p className="text-[10px] text-red-500 mt-1">{errors.headlines}</p>
            )}
          </div>

          {/* Descriptions */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Descriptions * ({minDescriptions}-{maxDescriptions} required)
                <span className="text-[10px] text-[#556179] font-normal ml-2">
                  ({formData.descriptions?.filter((d) => d.trim()).length || 0}/{maxDescriptions})
                </span>
              </label>
            </div>
            <div className="space-y-2">
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
                        className="p-2 hover:bg-red-50 rounded transition-colors"
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
                    {/* Pinning Control for RSA */}
                    {formData.ad_type === "RESPONSIVE_SEARCH_AD" && (
                      <select
                        value={formData.description_pins?.[index] || ""}
                        onChange={(e) => {
                          const selectedPin = e.target.value;
                          const newPins = [...(formData.description_pins || [])];
                          while (newPins.length <= index) {
                            newPins.push("");
                          }
                          
                          // If selecting a pin, clear it from any other description
                          if (selectedPin) {
                            for (let i = 0; i < newPins.length; i++) {
                              if (i !== index && newPins[i] === selectedPin) {
                                newPins[i] = "";
                              }
                            }
                          }
                          
                          newPins[index] = selectedPin;
                          onChange("description_pins", newPins);
                        }}
                        className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                      >
                        <option value="">No Pin</option>
                        <option value="DESCRIPTION_1">Pin to Description 1</option>
                        <option value="DESCRIPTION_2">Pin to Description 2</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            {formData.descriptions && formData.descriptions.length < maxDescriptions && (
              <button
                type="button"
                onClick={onAddDescription}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Description
              </button>
            )}
            {errors.descriptions && (
              <p className="text-[10px] text-red-500 mt-1">{errors.descriptions}</p>
            )}
          </div>

          {/* Path1 and Path2 for RSA */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="form-label-small">
                Path 1 (Optional, max 15 chars)
              </label>
              <input
                type="text"
                value={formData.path1 || ""}
                onChange={(e) => onChange("path1", e.target.value)}
                maxLength={15}
                className="campaign-input w-full"
                placeholder="e.g., products"
              />
            </div>
            <div>
              <label className="form-label-small">
                Path 2 (Optional, max 15 chars)
              </label>
              <input
                type="text"
                value={formData.path2 || ""}
                onChange={(e) => onChange("path2", e.target.value)}
                maxLength={15}
                className="campaign-input w-full"
                placeholder="e.g., sale"
              />
            </div>
          </div>
        </div>
      )}

      {/* RDA Fields */}
      {formData.ad_type === "RESPONSIVE_DISPLAY_AD" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[#072929]">
              Responsive Display Ad
            </h3>
          </div>

          {/* Marketing Images */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Marketing Images * (1-15 required)
                <span className="text-[10px] text-[#556179] font-normal ml-2">
                  ({formData.marketing_image_urls?.filter((url) => url.trim()).length || 0}/15)
                </span>
              </label>
            </div>
            <div className="space-y-2">
              {formData.marketing_image_urls?.map((url, index) => {
                const imageAssetId = formData.marketing_image_asset_ids?.[index];
                return (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          onUpdateMarketingImage(index, e.target.value);
                          if (imageAssetId && e.target.value !== url) {
                            const newImageAssetIds = [...(formData.marketing_image_asset_ids || [])];
                            const newImageAssetResourceNames = [...(formData.marketing_image_asset_resource_names || [])];
                            newImageAssetIds[index] = undefined;
                            newImageAssetResourceNames[index] = undefined;
                            onChange("marketing_image_asset_ids", newImageAssetIds);
                            onChange("marketing_image_asset_resource_names", newImageAssetResourceNames);
                          }
                        }}
                        disabled={!!imageAssetId}
                        readOnly={!!imageAssetId}
                        className={`campaign-input w-full pr-28 ${
                          errors.marketing_images ? "border-red-500" : ""
                        } ${imageAssetId ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                        placeholder="https://example.com/image.jpg"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {imageAssetId && (
                          <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                            From Asset
                          </span>
                        )}
                        {profileId && !imageAssetId && (
                          <button
                            type="button"
                            onClick={() => openAssetSelector("IMAGE", index)}
                            className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                          >
                            Select Asset
                          </button>
                        )}
                        {imageAssetId && (
                          <button
                            type="button"
                            onClick={() => {
                              const newImageAssetIds = [...(formData.marketing_image_asset_ids || [])];
                              const newImageAssetResourceNames = [...(formData.marketing_image_asset_resource_names || [])];
                              newImageAssetIds[index] = undefined;
                              newImageAssetResourceNames[index] = undefined;
                              onChange("marketing_image_asset_ids", newImageAssetIds);
                              onChange("marketing_image_asset_resource_names", newImageAssetResourceNames);
                              onUpdateMarketingImage(index, "");
                            }}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                            title="Remove selected asset"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    {imageAssetId && url && (url.startsWith("http://") || url.startsWith("https://")) && (
                      <img
                        src={url}
                        alt="Marketing image preview"
                        className="w-12 h-12 object-contain border border-gray-200 rounded bg-white flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    {formData.marketing_image_urls && formData.marketing_image_urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (imageAssetId) {
                            const newImageAssetIds = [...(formData.marketing_image_asset_ids || [])];
                            const newImageAssetResourceNames = [...(formData.marketing_image_asset_resource_names || [])];
                            newImageAssetIds.splice(index, 1);
                            newImageAssetResourceNames.splice(index, 1);
                            onChange("marketing_image_asset_ids", newImageAssetIds);
                            onChange("marketing_image_asset_resource_names", newImageAssetResourceNames);
                          }
                          onRemoveMarketingImage(index);
                        }}
                        className="p-2 hover:bg-red-50 rounded transition-colors"
                        title="Remove image"
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
            </div>
            {formData.marketing_image_urls && formData.marketing_image_urls.length < 15 && (
              <button
                type="button"
                onClick={onAddMarketingImage}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Marketing Image
              </button>
            )}
            {errors.marketing_images && (
              <p className="text-[10px] text-red-500 mt-1">{errors.marketing_images}</p>
            )}
          </div>

          {/* Square Marketing Images */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Square Marketing Images * (1-15 required)
                <span className="text-[10px] text-[#556179] font-normal ml-2">
                  ({formData.square_marketing_image_urls?.filter((url) => url.trim()).length || 0}/15)
                </span>
              </label>
            </div>
            <div className="space-y-2">
              {formData.square_marketing_image_urls?.map((url, index) => {
                const imageAssetId = formData.square_marketing_image_asset_ids?.[index];
                return (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          onUpdateSquareMarketingImage(index, e.target.value);
                          if (imageAssetId && e.target.value !== url) {
                            const newImageAssetIds = [...(formData.square_marketing_image_asset_ids || [])];
                            const newImageAssetResourceNames = [...(formData.square_marketing_image_asset_resource_names || [])];
                            newImageAssetIds[index] = undefined;
                            newImageAssetResourceNames[index] = undefined;
                            onChange("square_marketing_image_asset_ids", newImageAssetIds);
                            onChange("square_marketing_image_asset_resource_names", newImageAssetResourceNames);
                          }
                        }}
                        disabled={!!imageAssetId}
                        readOnly={!!imageAssetId}
                        className={`campaign-input w-full pr-28 ${
                          errors.square_marketing_images ? "border-red-500" : ""
                        } ${imageAssetId ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                        placeholder="https://example.com/square-image.jpg"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {imageAssetId && (
                          <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                            From Asset
                          </span>
                        )}
                        {profileId && !imageAssetId && (
                          <button
                            type="button"
                            onClick={() => openAssetSelector("SQUARE_IMAGE", index)}
                            className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                          >
                            Select Asset
                          </button>
                        )}
                        {imageAssetId && (
                          <button
                            type="button"
                            onClick={() => {
                              const newImageAssetIds = [...(formData.square_marketing_image_asset_ids || [])];
                              const newImageAssetResourceNames = [...(formData.square_marketing_image_asset_resource_names || [])];
                              newImageAssetIds[index] = undefined;
                              newImageAssetResourceNames[index] = undefined;
                              onChange("square_marketing_image_asset_ids", newImageAssetIds);
                              onChange("square_marketing_image_asset_resource_names", newImageAssetResourceNames);
                              onUpdateSquareMarketingImage(index, "");
                            }}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                            title="Remove selected asset"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    {imageAssetId && url && (url.startsWith("http://") || url.startsWith("https://")) && (
                      <img
                        src={url}
                        alt="Square marketing image preview"
                        className="w-12 h-12 object-contain border border-gray-200 rounded bg-white flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    {formData.square_marketing_image_urls && formData.square_marketing_image_urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (imageAssetId) {
                            const newImageAssetIds = [...(formData.square_marketing_image_asset_ids || [])];
                            const newImageAssetResourceNames = [...(formData.square_marketing_image_asset_resource_names || [])];
                            newImageAssetIds.splice(index, 1);
                            newImageAssetResourceNames.splice(index, 1);
                            onChange("square_marketing_image_asset_ids", newImageAssetIds);
                            onChange("square_marketing_image_asset_resource_names", newImageAssetResourceNames);
                          }
                          onRemoveSquareMarketingImage(index);
                        }}
                        className="p-2 hover:bg-red-50 rounded transition-colors"
                        title="Remove image"
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
            </div>
            {formData.square_marketing_image_urls && formData.square_marketing_image_urls.length < 15 && (
              <button
                type="button"
                onClick={onAddSquareMarketingImage}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Square Marketing Image
              </button>
            )}
            {errors.square_marketing_images && (
              <p className="text-[10px] text-red-500 mt-1">{errors.square_marketing_images}</p>
            )}
          </div>

          {/* Headlines for RDA */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Headlines * ({minHeadlines}-{maxHeadlines} required)
                <span className="text-[10px] text-[#556179] font-normal ml-2">
                  ({formData.headlines?.filter((h) => h.trim()).length || 0}/{maxHeadlines})
                </span>
              </label>
            </div>
            <div className="space-y-2">
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
            </div>
            {formData.headlines && formData.headlines.length < maxHeadlines && (
              <button
                type="button"
                onClick={onAddHeadline}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Headline
              </button>
            )}
            {errors.headlines && (
              <p className="text-[10px] text-red-500 mt-1">{errors.headlines}</p>
            )}
          </div>

          {/* Long Headline for RDA */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Long Headline * (max 90 chars)
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formData.long_headline || ""}
                onChange={(e) => {
                  onChange("long_headline", e.target.value);
                  if (formData.long_headline_asset_id && e.target.value !== formData.long_headline) {
                    onChange("long_headline_asset_id", undefined);
                    onChange("long_headline_asset_resource_name", undefined);
                  }
                }}
                disabled={!!formData.long_headline_asset_id}
                readOnly={!!formData.long_headline_asset_id}
                maxLength={90}
                className={`campaign-input w-full pr-28 ${
                  errors.long_headline ? "border-red-500" : ""
                } ${formData.long_headline_asset_id ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                placeholder="Enter long headline (max 90 characters)"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {formData.long_headline_asset_id && (
                  <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                    From Asset
                  </span>
                )}
                {profileId && !formData.long_headline_asset_id && (
                  <button
                    type="button"
                    onClick={() => openAssetSelector("LONG_HEADLINE")}
                    className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                  >
                    Select Asset
                  </button>
                )}
                {formData.long_headline_asset_id && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("long_headline", "");
                      onChange("long_headline_asset_id", undefined);
                      onChange("long_headline_asset_resource_name", undefined);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                    title="Remove selected asset"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            {errors.long_headline && (
              <p className="text-[10px] text-red-500 mt-1">{errors.long_headline}</p>
            )}
          </div>

          {/* Descriptions for RDA */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label-small mb-0">
                Descriptions * ({minDescriptions}-{maxDescriptions} required)
                <span className="text-[10px] text-[#556179] font-normal ml-2">
                  ({formData.descriptions?.filter((d) => d.trim()).length || 0}/{maxDescriptions})
                </span>
              </label>
            </div>
            <div className="space-y-2">
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
                        className="p-2 hover:bg-red-50 rounded transition-colors"
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
            </div>
            {formData.descriptions && formData.descriptions.length < maxDescriptions && (
              <button
                type="button"
                onClick={onAddDescription}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Description
              </button>
            )}
            {errors.descriptions && (
              <p className="text-[10px] text-red-500 mt-1">{errors.descriptions}</p>
            )}
          </div>

          {/* Business Name for RDA */}
          <div className="mb-3">
            <label className="form-label-small">
              Business Name * (max 25 chars)
            </label>
            <input
              type="text"
              value={formData.business_name || ""}
              onChange={(e) => onChange("business_name", e.target.value)}
              maxLength={25}
              className={`campaign-input w-full ${
                errors.business_name ? "border-red-500" : ""
              }`}
              placeholder="Enter business name"
            />
            {errors.business_name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.business_name}</p>
            )}
          </div>
        </div>
      )}

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
            setAssetSelectorIndex(null);
            setAssetSelectorError(null);
          }}
          onSelect={handleSelectAsset}
          profileId={profileId}
          assetType={
            assetSelectorType === "IMAGE" || assetSelectorType === "SQUARE_IMAGE" ? "IMAGE" :
            assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION" || assetSelectorType === "LONG_HEADLINE" ? "TEXT" :
            undefined
          }
          title={
            assetSelectorType === "HEADLINE" ? `Select Headline ${assetSelectorIndex !== null ? assetSelectorIndex + 1 : ""} Asset` :
            assetSelectorType === "DESCRIPTION" ? `Select Description ${assetSelectorIndex !== null ? assetSelectorIndex + 1 : ""} Asset` :
            assetSelectorType === "LONG_HEADLINE" ? "Select Long Headline Asset" :
            assetSelectorType === "IMAGE" ? "Select Marketing Image Asset" :
            assetSelectorType === "SQUARE_IMAGE" ? "Select Square Marketing Image Asset" :
            "Select Asset"
          }
          initialTab={
            assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION" || assetSelectorType === "LONG_HEADLINE" ? "Text" :
            assetSelectorType === "IMAGE" || assetSelectorType === "SQUARE_IMAGE" ? "Image" :
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
