// Performance Max Campaign Form Component
// This component handles Performance Max campaign-specific fields

import React, { useState } from "react";
import type { BaseCampaignFormProps } from "./types";
import { getMinHeadlines, getMaxHeadlines, getMinDescriptions, getMaxDescriptions, DEVICE_OPTIONS } from "./utils";
import { AssetSelectorModal } from "../AssetSelectorModal";
import type { Asset } from "../../../services/googleAdwords/googleAdwordsAssets";

interface GooglePerformanceMaxCampaignFormProps extends BaseCampaignFormProps {
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
  // Error setter for logo upload
  setErrors: (errors: any) => void;
  errors: any;
  // Profile selection (from BaseGoogleCampaignForm)
  selectedProfileId?: string;
  googleProfiles?: Array<{ value: string; label: string; customer_id: string; customer_id_raw: string; profile_id?: number }>;
}

export const GooglePerformanceMaxCampaignForm: React.FC<GooglePerformanceMaxCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  onAddHeadline,
  onRemoveHeadline,
  onUpdateHeadline,
  onAddDescription,
  onRemoveDescription,
  onUpdateDescription,
  logoPreview,
  setLogoPreview,
  marketingImagePreview,
  setMarketingImagePreview,
  squareMarketingImagePreview,
  setSquareMarketingImagePreview,
  setErrors,
  selectedProfileId,
  googleProfiles,
}) => {
  const minHeadlines = getMinHeadlines("PERFORMANCE_MAX");
  const maxHeadlines = getMaxHeadlines();
  const minDescriptions = getMinDescriptions("PERFORMANCE_MAX");
  const maxDescriptions = getMaxDescriptions();

  // Asset Selector Modal state
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorType, setAssetSelectorType] = useState<"BUSINESS_NAME" | "LOGO" | "HEADLINE" | "DESCRIPTION" | "IMAGE" | null>(null);

  // Get numeric profile ID from selected profile
  const selectedProfile = googleProfiles?.find((p: any) => p.value === selectedProfileId);
  const profileId = selectedProfile?.profile_id || null;

  const handleSelectAsset = (asset: Asset) => {
    if (!assetSelectorType || !profileId) return;

    switch (assetSelectorType) {
      case "BUSINESS_NAME":
        if (asset.type === "TEXT" && "text" in asset) {
          onChange("business_name", asset.text);
        }
        break;
      case "LOGO":
        if (asset.type === "IMAGE") {
          // For logo, we need to use the asset resource name since we can't get the image URL directly
          // The backend will handle linking the asset during campaign creation
          onChange("logo_asset_resource_name", asset.resource_name);
          // Also store asset ID for reference
          onChange("logo_asset_id", asset.id);
          // Note: Preview won't work without URL, but asset will be linked during creation
        }
        break;
      case "HEADLINE":
        if (asset.type === "TEXT" && "text" in asset && formData.headlines) {
          // Add headline if not at max
          if (formData.headlines.length < maxHeadlines) {
            const newHeadlines = [...formData.headlines];
            // Find first empty slot or add to end
            const emptyIndex = newHeadlines.findIndex(h => !h.trim());
            if (emptyIndex >= 0) {
              newHeadlines[emptyIndex] = asset.text;
            } else {
              newHeadlines.push(asset.text);
            }
            onChange("headlines", newHeadlines);
          } else {
            // Replace last headline
            const newHeadlines = [...formData.headlines];
            newHeadlines[newHeadlines.length - 1] = asset.text;
            onChange("headlines", newHeadlines);
          }
        }
        break;
      case "DESCRIPTION":
        if (asset.type === "TEXT" && "text" in asset && formData.descriptions) {
          // Add description if not at max
          if (formData.descriptions.length < maxDescriptions) {
            const newDescriptions = [...formData.descriptions];
            const emptyIndex = newDescriptions.findIndex(d => !d.trim());
            if (emptyIndex >= 0) {
              newDescriptions[emptyIndex] = asset.text;
            } else {
              newDescriptions.push(asset.text);
            }
            onChange("descriptions", newDescriptions);
          } else {
            // Replace last description
            const newDescriptions = [...formData.descriptions];
            newDescriptions[newDescriptions.length - 1] = asset.text;
            onChange("descriptions", newDescriptions);
          }
        }
        break;
      case "IMAGE":
        if (asset.type === "IMAGE") {
          // Store asset resource name for linking during campaign creation
          onChange("marketing_image_asset_resource_name", asset.resource_name);
          onChange("marketing_image_asset_id", asset.id);
          // Note: Preview won't work without URL, but asset will be linked during creation
        }
        break;
    }
    setAssetSelectorOpen(false);
    setAssetSelectorType(null);
  };

  const openAssetSelector = (type: "BUSINESS_NAME" | "LOGO" | "HEADLINE" | "DESCRIPTION" | "IMAGE") => {
    if (!profileId) {
      setErrors({ ...errors, general: "Please select a Google Ads account first" });
      return;
    }
    setAssetSelectorType(type);
    setAssetSelectorOpen(true);
  };

  return (
    <>
      {/* Performance Max Settings */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Performance Max Settings
        </h3>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 space-y-5">
          {/* Business Name and Logo - Campaign Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">
              Business Name *
            </label>
            {profileId && (
              <button
                type="button"
                onClick={() => openAssetSelector("BUSINESS_NAME")}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select Existing
              </button>
            )}
          </div>
          <input
            type="text"
            value={formData.business_name || ""}
            onChange={(e) => onChange("business_name", e.target.value)}
            className={`campaign-input w-full ${
              errors.business_name ? "border-red-300" : "border-gray-200"
            }`}
            placeholder="Required business name"
          />
          {errors.business_name && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.business_name}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">
              Logo (URL or Upload) *
            </label>
            {profileId && (
              <button
                type="button"
                onClick={() => openAssetSelector("LOGO")}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select Existing
              </button>
            )}
          </div>
          <div className="space-y-2">
            <input
              type="url"
              value={formData.logo_url || ""}
              onChange={(e) => {
                onChange("logo_url", e.target.value);
                const urlValue = e.target.value.trim();
                if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
                  setLogoPreview(urlValue);
                } else {
                  setLogoPreview(null);
                }
              }}
              className={`campaign-input w-full ${
                errors.logo_url ? "border-red-500" : ""
              }`}
              placeholder="https://example.com/logo.png"
            />
            {errors.logo_url && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.logo_url}
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      setErrors({ ...errors, logo_url: "File size must be less than 5MB" });
                      setLogoPreview(null);
                      return;
                    }
                    // Validate file type
                    if (!file.type.startsWith("image/")) {
                      setErrors({ ...errors, logo_url: "File must be an image" });
                      setLogoPreview(null);
                      return;
                    }
                    
                    // Validate image dimensions (must be square, minimum 128x128)
                    try {
                      const img = new Image();
                      const objectUrl = URL.createObjectURL(file);
                      
                      await new Promise((resolve, reject) => {
                        img.onload = () => {
                          URL.revokeObjectURL(objectUrl);
                          const width = img.width;
                          const height = img.height;
                          
                          // Check if square (1:1 aspect ratio)
                          if (width !== height) {
                            setErrors({ 
                              ...errors, 
                              logo_url: `Logo must be square (1:1 aspect ratio). Current dimensions: ${width}x${height}px. Please use a square image.` 
                            });
                            setLogoPreview(null);
                            reject(new Error("Not square"));
                            return;
                          }
                          
                          // Check minimum size
                          if (width < 128 || height < 128) {
                            setErrors({ 
                              ...errors, 
                              logo_url: `Logo must be at least 128x128 pixels. Current dimensions: ${width}x${height}px. Recommended: 128x128px or larger.` 
                            });
                            setLogoPreview(null);
                            reject(new Error("Too small"));
                            return;
                          }
                          
                          // Create preview using FileReader
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setLogoPreview(reader.result as string);
                          };
                          reader.onerror = () => {
                            setLogoPreview(null);
                          };
                          reader.readAsDataURL(file);
                          
                          resolve(null);
                        };
                        
                        img.onerror = () => {
                          URL.revokeObjectURL(objectUrl);
                          setErrors({ ...errors, logo_url: "Failed to load image. Please try a different file." });
                          setLogoPreview(null);
                          reject(new Error("Image load failed"));
                        };
                        
                        img.src = objectUrl;
                      });
                      
                      // If dimension validation passed, proceed with upload
                      try {
                        // Upload file
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/accounts/upload/logo/`, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                          },
                          body: formData,
                        });
                        
                        const responseData = await response.json();
                        
                        if (!response.ok) {
                          const errorMessage = responseData.error || responseData.message || "Upload failed";
                          setErrors({ ...errors, logo_url: errorMessage });
                          setLogoPreview(null);
                          return;
                        }
                        
                        if (responseData.url) {
                          onChange("logo_url", responseData.url);
                          setErrors({ ...errors, logo_url: undefined });
                          // Preview will be updated by handleChange
                        } else {
                          setErrors({ ...errors, logo_url: "Upload succeeded but no URL returned" });
                          setLogoPreview(null);
                        }
                      } catch (error: any) {
                        setErrors({ ...errors, logo_url: error.message || "Failed to upload logo. Please try again or use a URL." });
                        setLogoPreview(null);
                      }
                    } catch (error: any) {
                      // Dimension validation error already set
                      if (!error.message || (error.message !== "Not square" && error.message !== "Too small" && error.message !== "Image load failed")) {
                        setErrors({ ...errors, logo_url: "Failed to validate image dimensions. Please try a different file." });
                        setLogoPreview(null);
                      }
                    }
                  }
                }}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="edit-button"
              >
                Upload Logo
              </label>
            </div>
            {/* Logo Preview */}
            {logoPreview && (
              <div className="mt-2">
                <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 object-contain rounded"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = "none";
                      setTimeout(() => {
                        setLogoPreview(null);
                      }, 500);
                    }}
                  />
                </div>
              </div>
            )}
            <p className="text-[10px] text-[#556179] mt-1">
              Logo must be square (1:1 aspect ratio) and at least 128x128 pixels. Recommended: 128x128px or larger.
            </p>
          </div>
            </div>
          </div>

          {/* Asset Group Name and Final URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Headlines */}
        <div>
        <div className="flex items-center justify-between mb-1">
          <label className="form-label mb-0">
            Headlines * ({minHeadlines}-{maxHeadlines} required)
            <span className="text-[10px] text-[#556179] font-normal ml-2">
              ({formData.headlines?.filter((h) => h.trim()).length || 0}/{maxHeadlines})
            </span>
          </label>
          {profileId && (
            <button
              type="button"
              onClick={() => openAssetSelector("HEADLINE")}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Select Existing
            </button>
          )}
        </div>
        <div className="space-y-2" data-headlines-section>
          {formData.headlines?.map((headline, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={headline}
                onChange={(e) => onUpdateHeadline(index, e.target.value)}
                onKeyDown={(e) => {
                  // Add new headline on Enter if at the last headline and it has content
                  if (e.key === 'Enter' && 
                      formData.headlines &&
                      index === formData.headlines.length - 1 && 
                      headline.trim() &&
                      formData.headlines.length < maxHeadlines) {
                    e.preventDefault();
                    onAddHeadline();
                    // Focus the new headline input after a brief delay
                    setTimeout(() => {
                      // Find headline inputs in the headlines section only
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
                  // Auto-add new headline when user finishes typing in the last headline
                  if (formData.headlines &&
                      index === formData.headlines.length - 1 && 
                      e.target.value.trim() && 
                      formData.headlines.length < maxHeadlines) {
                    onAddHeadline();
                  }
                }}
                className={`campaign-input w-full ${
                  errors.headlines ? "border-red-500" : ""
                }`}
                placeholder={`Headline ${index + 1}`}
              />
              {formData.headlines && formData.headlines.length > minHeadlines && (
                <button
                  type="button"
                  onClick={() => onRemoveHeadline(index)}
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
          ))}
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
          {profileId && (
            <button
              type="button"
              onClick={() => openAssetSelector("DESCRIPTION")}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Select Existing
            </button>
          )}
        </div>
        <div className="space-y-2" data-descriptions-section>
          {formData.descriptions?.map((description, index) => (
            <div key={index} className="flex gap-2">
              <textarea
                value={description}
                onChange={(e) => onUpdateDescription(index, e.target.value)}
                onKeyDown={(e) => {
                  // Add new description on Ctrl+Enter or Cmd+Enter (but allow Shift+Enter for new line, regular Enter for new line)
                  if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) &&
                      formData.descriptions &&
                      index === formData.descriptions.length - 1 && 
                      description.trim() &&
                      formData.descriptions.length < maxDescriptions) {
                    e.preventDefault();
                    onAddDescription();
                    // Focus the new description textarea after a brief delay
                    setTimeout(() => {
                      // Find description textareas in the descriptions section only
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
                  // Auto-add new description when user finishes typing in the last description
                  if (formData.descriptions &&
                      index === formData.descriptions.length - 1 && 
                      e.target.value.trim() && 
                      formData.descriptions.length < maxDescriptions) {
                    onAddDescription();
                  }
                }}
                rows={2}
                className={`campaign-input w-full ${
                  errors.descriptions ? "border-red-500" : ""
                }`}
                placeholder={`Description ${index + 1}`}
              />
              {formData.descriptions && formData.descriptions.length > minDescriptions && (
                <button
                  type="button"
                  onClick={() => onRemoveDescription(index)}
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
          ))}
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

        {/* Optional Performance Max Fields */}
        {/* Long Headline - Full Width */}
        <div>
        <label className="form-label">
          Long Headline
        </label>
        <input
          type="text"
          value={formData.long_headline || ""}
          onChange={(e) => onChange("long_headline", e.target.value)}
          className={`campaign-input w-full ${
            errors.long_headline ? "border-red-500" : ""
          }`}
          placeholder="Optional long headline"
        />
        </div>

        {/* Marketing Image URLs - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">
              Marketing Image URL *
            </label>
            {profileId && (
              <button
                type="button"
                onClick={() => openAssetSelector("IMAGE")}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select Existing
              </button>
            )}
          </div>
          <input
            type="url"
            value={formData.marketing_image_url || ""}
            onChange={(e) => {
              onChange("marketing_image_url", e.target.value);
              const urlValue = e.target.value.trim();
              if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
                setMarketingImagePreview(urlValue);
              } else {
                setMarketingImagePreview(null);
              }
            }}
            className={`campaign-input w-full ${
              errors.marketing_image_url ? "border-red-500" : ""
            }`}
            placeholder="https://example.com/image.png"
          />
          {/* Marketing Image Preview */}
          {marketingImagePreview && (
            <div className="mt-2">
              <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
              <div className="inline-block border border-gray-200 rounded bg-white p-1">
                <img
                  src={marketingImagePreview}
                  alt="Marketing image preview"
                  className="max-w-48 max-h-32 w-auto h-auto object-contain block rounded"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    setMarketingImagePreview(null);
                  }}
                />
              </div>
            </div>
          )}
          {errors.marketing_image_url && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.marketing_image_url}
            </p>
          )}
          <p className="text-[10px] text-[#556179] mt-1">
            Required. Backend will not generate defaults. Recommended size: 1200x628px.
          </p>
        </div>

        <div>
          <label className="form-label">
            Square Marketing Image URL *
          </label>
          <input
            type="url"
            value={formData.square_marketing_image_url || ""}
            onChange={(e) => {
              onChange("square_marketing_image_url", e.target.value);
              const urlValue = e.target.value.trim();
              if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
                setSquareMarketingImagePreview(urlValue);
              } else {
                setSquareMarketingImagePreview(null);
              }
            }}
            className={`campaign-input w-full ${
              errors.square_marketing_image_url ? "border-red-500" : ""
            }`}
            placeholder="https://example.com/square-image.png"
          />
          {/* Square Marketing Image Preview */}
          {squareMarketingImagePreview && (
            <div className="mt-2">
              <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
              <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                <img
                  src={squareMarketingImagePreview}
                  alt="Square marketing image preview"
                  className="w-32 h-32 object-contain rounded"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    setSquareMarketingImagePreview(null);
                  }}
                />
              </div>
            </div>
          )}
          {errors.square_marketing_image_url && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.square_marketing_image_url}
            </p>
          )}
          <p className="text-[10px] text-[#556179] mt-1">
            Required. Backend will not generate defaults. Recommended size: 512x512px (square).
          </p>
          </div>
        </div>
        </div>
      </div>

      {/* Asset Selector Modal */}
      {profileId && (
        <AssetSelectorModal
          isOpen={assetSelectorOpen}
          onClose={() => {
            setAssetSelectorOpen(false);
            setAssetSelectorType(null);
          }}
          onSelect={handleSelectAsset}
          profileId={profileId}
          assetType={
            assetSelectorType === "IMAGE" ? "IMAGE" :
            assetSelectorType === "BUSINESS_NAME" || assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION" ? "TEXT" :
            undefined
          }
          title={
            assetSelectorType === "BUSINESS_NAME" ? "Select Business Name Asset" :
            assetSelectorType === "LOGO" ? "Select Logo Asset" :
            assetSelectorType === "HEADLINE" ? "Select Headline Asset" :
            assetSelectorType === "DESCRIPTION" ? "Select Description Asset" :
            assetSelectorType === "IMAGE" ? "Select Marketing Image Asset" :
            "Select Asset"
          }
        />
      )}

      {/* Device Targeting - Available for PERFORMANCE_MAX campaigns */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Device Targeting
        </h3>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEVICE_OPTIONS.map((device) => (
              <div key={device.value} className="border border-gray-200 rounded-lg p-4 bg-white">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="text-3xl mb-1">{device.icon}</div>
                  <input
                    type="checkbox"
                    checked={formData.device_ids?.includes(device.value) ?? false}
                    onChange={(e) => {
                      const currentIds = formData.device_ids || [];
                      if (e.target.checked) {
                        onChange("device_ids", [...currentIds, device.value]);
                      } else {
                        onChange("device_ids", currentIds.filter(id => id !== device.value));
                      }
                    }}
                    className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                  />
                  <span className="text-[12px] text-[#072929] font-medium">
                    {device.label}
                  </span>
                </label>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#556179] mt-4">
            Select devices to target. If none selected, ads will show on all devices.
          </p>
        </div>
      </div>
    </>
  );
};
