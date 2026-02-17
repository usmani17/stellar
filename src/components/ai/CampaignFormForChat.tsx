/**
 * Campaign form for Assistant chat: reuses campaign form components and shows
 * only the fields the AI requested (from current_questions_schema).
 * Submits only the requested keys to keep messages focused.
 */
import React, { useState, forwardRef, useImperativeHandle } from "react";
import type { CreateGoogleCampaignData } from "../google/campaigns/types";
import { AssetSelectorModal } from "../google/AssetSelectorModal";
import type { Asset } from "../../services/googleAdwords/googleAdwordsAssets";
import { getFieldLabel } from "./campaignFormFieldLabels";
import type { CurrentQuestionSchemaItem } from "../../types/agent";



function getKeysForForm(schema: CurrentQuestionSchemaItem[]): string[] {
  return schema.map((q) => q.key).filter(Boolean);
}

/** Strip entity prefix (e.g. "ad.logo_url" → "logo_url") for field matching */
function stripEntityPrefix(key: string): string {
  const parts = key.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : key;
}

/** Check if field key matches any requested key (with or without entity prefix) */
function isFieldRequested(fieldKey: string, requestedKeys: string[]): boolean {
  // Check exact match first
  if (requestedKeys.includes(fieldKey)) return true;
  // Check if any requested key matches after stripping entity prefix
  const strippedField = stripEntityPrefix(fieldKey);
  return requestedKeys.some(k => stripEntityPrefix(k) === strippedField || k === fieldKey);
}

export interface CampaignFormForChatProps {
  questionsSchema: CurrentQuestionSchemaItem[];
  campaignDraft: Record<string, unknown> | undefined;
  campaignType: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  profileId?: string | number;
}

export interface CampaignFormForChatHandle {
  getValues(): Record<string, string>;
  clear(): void;
}

export const CampaignFormForChat = forwardRef<CampaignFormForChatHandle, CampaignFormForChatProps>(({
  questionsSchema,
  campaignDraft,
  campaignType,
  onSend,
  disabled = false,
  profileId,

}, ref) => {
  const requestedKeys = getKeysForForm(questionsSchema);

  const [formData, setFormData] = useState<Partial<CreateGoogleCampaignData>>(campaignDraft || {});
  
  // Logo Asset
  const [isLogoAssetModalOpen, setIsLogoAssetModalOpen] = useState(false);
  const [selectedLogoAsset, setSelectedLogoAsset] = useState<Asset | null>(null);
  
  // Business Name Asset
  const [isBusinessNameAssetModalOpen, setIsBusinessNameAssetModalOpen] = useState(false);
  const [selectedBusinessNameAsset, setSelectedBusinessNameAsset] = useState<Asset | null>(null);
  
  // Marketing Image Assets
  const [isMarketingImageAssetModalOpen, setIsMarketingImageAssetModalOpen] = useState(false);
  const [selectedMarketingImageAsset, setSelectedMarketingImageAsset] = useState<Asset | null>(null);
  
  const [isSquareMarketingImageAssetModalOpen, setIsSquareMarketingImageAssetModalOpen] = useState(false);
  const [selectedSquareMarketingImageAsset, setSelectedSquareMarketingImageAsset] = useState<Asset | null>(null);
  
  // Text Assets (multiple)
  const [isHeadlineAssetsModalOpen, setIsHeadlineAssetsModalOpen] = useState(false);
  const [selectedHeadlineAssets, setSelectedHeadlineAssets] = useState<Asset[]>([]);
  
  const [isDescriptionAssetsModalOpen, setIsDescriptionAssetsModalOpen] = useState(false);
  const [selectedDescriptionAssets, setSelectedDescriptionAssets] = useState<Asset[]>([]);
  
  const [isLongHeadlineAssetsModalOpen, setIsLongHeadlineAssetsModalOpen] = useState(false);
  const [selectedLongHeadlineAssets, setSelectedLongHeadlineAssets] = useState<Asset[]>([]);
  
  // Video Assets (multiple)
  const [isVideoAssetsModalOpen, setIsVideoAssetsModalOpen] = useState(false);
  const [selectedVideoAssets, setSelectedVideoAssets] = useState<Asset[]>([]);
  
  // Sitelink Assets (multiple)
  const [isSitelinkAssetsModalOpen, setIsSitelinkAssetsModalOpen] = useState(false);
  const [selectedSitelinkAssets, setSelectedSitelinkAssets] = useState<Asset[]>([]);
  
  // Callout Assets (multiple)
  const [isCalloutAssetsModalOpen, setIsCalloutAssetsModalOpen] = useState(false);
  const [selectedCalloutAssets, setSelectedCalloutAssets] = useState<Asset[]>([]);

  const profileIdNum = profileId != null ? (typeof profileId === "number" ? profileId : parseInt(String(profileId), 10)) : null;

  useImperativeHandle(ref, () => ({
    getValues: () => {
      const vals: Record<string, string> = {};
      for (const k of requestedKeys) {
        const v = formData[k as keyof typeof formData];
        if (v !== undefined && v !== "" && v != null) {
          if (Array.isArray(v)) {
            vals[k] = v.join("\n");
          } else if (typeof v === "object") {
            vals[k] = JSON.stringify(v);
          } else {
            vals[k] = String(v);
          }
        }
      }
      return vals;
    },
    clear: () => {
      setFormData({});
      setSelectedLogoAsset(null);
      setSelectedBusinessNameAsset(null);
      setSelectedMarketingImageAsset(null);
      setSelectedSquareMarketingImageAsset(null);
      setSelectedHeadlineAssets([]);
      setSelectedDescriptionAssets([]);
      setSelectedLongHeadlineAssets([]);
      setSelectedVideoAssets([]);
      setSelectedSitelinkAssets([]);
      setSelectedCalloutAssets([]);
    },
  }), [formData, requestedKeys]);

  const onChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    const parts = requestedKeys
      .map((key) => {
        const v = formData[key as keyof typeof formData];
        if (v === undefined || v === "" || v == null) return null;
        const label = getFieldLabel(key);
        const displayValue = typeof v === "object" ? JSON.stringify(v) : String(v);
        return `${label}: ${displayValue}`;
      })
      .filter(Boolean) as string[];

    if (parts.length > 0) {
      onSend(parts.join("\n"));
    }
  };

  const hasLogoAssetIdField = isFieldRequested("logo_asset_id", requestedKeys);
  const hasBusinessNameAssetIdField = isFieldRequested("business_name_asset_id", requestedKeys);
  const hasMarketingImageAssetIdField = isFieldRequested("marketing_image_asset_id", requestedKeys);
  const hasSquareMarketingImageAssetIdField = isFieldRequested("square_marketing_image_asset_id", requestedKeys);
  const hasHeadlineAssetIdsField = isFieldRequested("headline_asset_ids", requestedKeys);
  const hasDescriptionAssetIdsField = isFieldRequested("description_asset_ids", requestedKeys);
  const hasLongHeadlineAssetIdsField = isFieldRequested("long_headline_asset_ids", requestedKeys);
  const hasVideoAssetIdsField = isFieldRequested("video_asset_ids", requestedKeys);
  const hasSitelinkAssetIdsField = isFieldRequested("sitelink_asset_ids", requestedKeys);
  const hasCalloutAssetIdsField = isFieldRequested("callout_asset_ids", requestedKeys);

  // Only render when we have at least one visible field. Asset fields need profileId to show; basic keys are not yet rendered in this component.
  const hasAnyVisibleAssetField =
    profileIdNum &&
    (hasLogoAssetIdField ||
      hasBusinessNameAssetIdField ||
      hasMarketingImageAssetIdField ||
      hasSquareMarketingImageAssetIdField ||
      hasHeadlineAssetIdsField ||
      hasDescriptionAssetIdsField ||
      hasLongHeadlineAssetIdsField ||
      hasVideoAssetIdsField ||
      hasSitelinkAssetIdsField ||
      hasCalloutAssetIdsField);
  const hasAnyVisibleField = !!hasAnyVisibleAssetField;

  if (requestedKeys.length === 0 || !hasAnyVisibleField) {
    return null;
  }

  return (
    <div className="mt-2 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
      <p className="text-sm font-medium text-[#072929] mb-3">Fill in the details</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Asset Selection Fields */}
        <div className="space-y-4">
          {/* Logo Asset */}
          {hasLogoAssetIdField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Logo Asset
              </label>
              <button
                type="button"
                onClick={() => setIsLogoAssetModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedLogoAsset ? `Selected: ${selectedLogoAsset.name}` : "Select Logo Asset"}
              </button>
              {selectedLogoAsset && (
                <p className="text-xs text-[#556179] mt-1">
                  Asset ID: {selectedLogoAsset.resource_name}
                </p>
              )}
            </div>
          )}

          {/* Business Name Asset */}
          {hasBusinessNameAssetIdField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Business Name Asset
              </label>
              <button
                type="button"
                onClick={() => setIsBusinessNameAssetModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedBusinessNameAsset ? `Selected: ${selectedBusinessNameAsset.name}` : "Select Business Name Asset"}
              </button>
              {selectedBusinessNameAsset && (
                <p className="text-xs text-[#556179] mt-1">
                  Asset ID: {selectedBusinessNameAsset.resource_name}
                </p>
              )}
            </div>
          )}

          {/* Marketing Image Asset */}
          {hasMarketingImageAssetIdField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Marketing Image Asset
              </label>
              <button
                type="button"
                onClick={() => setIsMarketingImageAssetModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedMarketingImageAsset ? `Selected: ${selectedMarketingImageAsset.name}` : "Select Marketing Image"}
              </button>
              {selectedMarketingImageAsset && (
                <p className="text-xs text-[#556179] mt-1">
                  Asset ID: {selectedMarketingImageAsset.resource_name}
                </p>
              )}
            </div>
          )}

          {/* Square Marketing Image Asset */}
          {hasSquareMarketingImageAssetIdField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Square Marketing Image Asset
              </label>
              <button
                type="button"
                onClick={() => setIsSquareMarketingImageAssetModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedSquareMarketingImageAsset ? `Selected: ${selectedSquareMarketingImageAsset.name}` : "Select Square Marketing Image"}
              </button>
              {selectedSquareMarketingImageAsset && (
                <p className="text-xs text-[#556179] mt-1">
                  Asset ID: {selectedSquareMarketingImageAsset.resource_name}
                </p>
              )}
            </div>
          )}

          {/* Headline Assets */}
          {hasHeadlineAssetIdsField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Headline Assets
              </label>
              <button
                type="button"
                onClick={() => setIsHeadlineAssetsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedHeadlineAssets.length > 0 ? `Selected ${selectedHeadlineAssets.length} headline(s)` : "Select Headline Assets"}
              </button>
              {selectedHeadlineAssets.length > 0 && (
                <p className="text-xs text-[#556179] mt-1">
                  {selectedHeadlineAssets.map(a => a.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Description Assets */}
          {hasDescriptionAssetIdsField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Description Assets
              </label>
              <button
                type="button"
                onClick={() => setIsDescriptionAssetsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedDescriptionAssets.length > 0 ? `Selected ${selectedDescriptionAssets.length} description(s)` : "Select Description Assets"}
              </button>
              {selectedDescriptionAssets.length > 0 && (
                <p className="text-xs text-[#556179] mt-1">
                  {selectedDescriptionAssets.map(a => a.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Long Headline Assets */}
          {hasLongHeadlineAssetIdsField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Long Headline Assets
              </label>
              <button
                type="button"
                onClick={() => setIsLongHeadlineAssetsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedLongHeadlineAssets.length > 0 ? `Selected ${selectedLongHeadlineAssets.length} long headline(s)` : "Select Long Headline Assets"}
              </button>
              {selectedLongHeadlineAssets.length > 0 && (
                <p className="text-xs text-[#556179] mt-1">
                  {selectedLongHeadlineAssets.map(a => a.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Video Assets */}
          {hasVideoAssetIdsField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Video Assets
              </label>
              <button
                type="button"
                onClick={() => setIsVideoAssetsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedVideoAssets.length > 0 ? `Selected ${selectedVideoAssets.length} video(s)` : "Select Video Assets"}
              </button>
              {selectedVideoAssets.length > 0 && (
                <p className="text-xs text-[#556179] mt-1">
                  {selectedVideoAssets.map(a => a.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Sitelink Assets */}
          {hasSitelinkAssetIdsField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Sitelink Assets
              </label>
              <button
                type="button"
                onClick={() => setIsSitelinkAssetsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedSitelinkAssets.length > 0 ? `Selected ${selectedSitelinkAssets.length} sitelink(s)` : "Select Sitelink Assets"}
              </button>
              {selectedSitelinkAssets.length > 0 && (
                <p className="text-xs text-[#556179] mt-1">
                  {selectedSitelinkAssets.map(a => a.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Callout Assets */}
          {hasCalloutAssetIdsField && profileIdNum && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Callout Assets
              </label>
              <button
                type="button"
                onClick={() => setIsCalloutAssetsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#136D6D] bg-white border border-[#136D6D] rounded-[8px] hover:bg-[#136D6D]/5"
              >
                {selectedCalloutAssets.length > 0 ? `Selected ${selectedCalloutAssets.length} callout(s)` : "Select Callout Assets"}
              </button>
              {selectedCalloutAssets.length > 0 && (
                <p className="text-xs text-[#556179] mt-1">
                  {selectedCalloutAssets.map(a => a.name).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="self-start mt-1 px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          Submit
        </button>
      </form>

      {/* Asset Selection Modals */}
      {profileIdNum && (
        <>
          {/* Logo Asset Modal */}
          <AssetSelectorModal
            isOpen={isLogoAssetModalOpen}
            onClose={() => setIsLogoAssetModalOpen(false)}
            onSelect={(asset) => {
              setSelectedLogoAsset(asset);
              onChange("logo_asset_id", asset.resource_name);
              setIsLogoAssetModalOpen(false);
            }}
            profileId={profileIdNum}
            assetType="IMAGE"
            title="Select Logo Asset"
            initialTab="Logo"
          />

          {/* Business Name Asset Modal */}
          <AssetSelectorModal
            isOpen={isBusinessNameAssetModalOpen}
            onClose={() => setIsBusinessNameAssetModalOpen(false)}
            onSelect={(asset) => {
              setSelectedBusinessNameAsset(asset);
              onChange("business_name_asset_id", asset.resource_name);
              setIsBusinessNameAssetModalOpen(false);
            }}
            profileId={profileIdNum}
            assetType="TEXT"
            title="Select Business Name Asset"
            initialTab="Business Name"
          />

          {/* Marketing Image Asset Modal */}
          <AssetSelectorModal
            isOpen={isMarketingImageAssetModalOpen}
            onClose={() => setIsMarketingImageAssetModalOpen(false)}
            onSelect={(asset) => {
              setSelectedMarketingImageAsset(asset);
              onChange("marketing_image_asset_id", asset.resource_name);
              setIsMarketingImageAssetModalOpen(false);
            }}
            profileId={profileIdNum}
            assetType="IMAGE"
            title="Select Marketing Image"
            initialTab="Marketing Image"
          />

          {/* Square Marketing Image Asset Modal */}
          <AssetSelectorModal
            isOpen={isSquareMarketingImageAssetModalOpen}
            onClose={() => setIsSquareMarketingImageAssetModalOpen(false)}
            onSelect={(asset) => {
              setSelectedSquareMarketingImageAsset(asset);
              onChange("square_marketing_image_asset_id", asset.resource_name);
              setIsSquareMarketingImageAssetModalOpen(false);
            }}
            profileId={profileIdNum}
            assetType="IMAGE"
            title="Select Square Marketing Image"
            initialTab="Square Marketing Image"
          />

          {/* Headline Assets Modal */}
          <AssetSelectorModal
            isOpen={isHeadlineAssetsModalOpen}
            onClose={() => setIsHeadlineAssetsModalOpen(false)}
            onSelect={(asset) => {
              const newAssets = [...selectedHeadlineAssets, asset];
              setSelectedHeadlineAssets(newAssets);
              onChange("headline_asset_ids", newAssets.map(a => a.resource_name));
            }}
            profileId={profileIdNum}
            assetType="TEXT"
            title="Select Headline Assets"
            initialTab="Headline"
            allowMultiple
          />

          {/* Description Assets Modal */}
          <AssetSelectorModal
            isOpen={isDescriptionAssetsModalOpen}
            onClose={() => setIsDescriptionAssetsModalOpen(false)}
            onSelect={(asset) => {
              const newAssets = [...selectedDescriptionAssets, asset];
              setSelectedDescriptionAssets(newAssets);
              onChange("description_asset_ids", newAssets.map(a => a.resource_name));
            }}
            profileId={profileIdNum}
            assetType="TEXT"
            title="Select Description Assets"
            initialTab="Description"
            allowMultiple
          />

          {/* Long Headline Assets Modal */}
          <AssetSelectorModal
            isOpen={isLongHeadlineAssetsModalOpen}
            onClose={() => setIsLongHeadlineAssetsModalOpen(false)}
            onSelect={(asset) => {
              const newAssets = [...selectedLongHeadlineAssets, asset];
              setSelectedLongHeadlineAssets(newAssets);
              onChange("long_headline_asset_ids", newAssets.map(a => a.resource_name));
            }}
            profileId={profileIdNum}
            assetType="TEXT"
            title="Select Long Headline Assets"
            initialTab="Long Headline"
            allowMultiple
          />

          {/* Video Assets Modal */}
          <AssetSelectorModal
            isOpen={isVideoAssetsModalOpen}
            onClose={() => setIsVideoAssetsModalOpen(false)}
            onSelect={(asset) => {
              const newAssets = [...selectedVideoAssets, asset];
              setSelectedVideoAssets(newAssets);
              onChange("video_asset_ids", newAssets.map(a => a.resource_name));
            }}
            profileId={profileIdNum}
            assetType="YOUTUBE_VIDEO"
            title="Select Video Assets"
            initialTab="Video"
            allowMultiple
          />

          {/* Sitelink Assets Modal */}
          <AssetSelectorModal
            isOpen={isSitelinkAssetsModalOpen}
            onClose={() => setIsSitelinkAssetsModalOpen(false)}
            onSelect={(asset) => {
              const newAssets = [...selectedSitelinkAssets, asset];
              setSelectedSitelinkAssets(newAssets);
              onChange("sitelink_asset_ids", newAssets.map(a => a.resource_name));
            }}
            profileId={profileIdNum}
            assetType="SITELINK"
            title="Select Sitelink Assets"
            initialTab="Sitelink"
            allowMultiple
          />

          {/* Callout Assets Modal */}
          <AssetSelectorModal
            isOpen={isCalloutAssetsModalOpen}
            onClose={() => setIsCalloutAssetsModalOpen(false)}
            onSelect={(asset) => {
              const newAssets = [...selectedCalloutAssets, asset];
              setSelectedCalloutAssets(newAssets);
              onChange("callout_asset_ids", newAssets.map(a => a.resource_name));
            }}
            profileId={profileIdNum}
            assetType="TEXT"
            title="Select Callout Assets"
            initialTab="Text"
            allowMultiple
          />
        </>
      )}
    </div>
  );
});

CampaignFormForChat.displayName = "CampaignFormForChat";
