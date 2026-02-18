/**
 * Campaign form for Assistant chat: reuses campaign form components and shows
 * only the fields the AI requested (from current_questions_schema).
 * Submits only the requested keys to keep messages focused.
 */
import React, { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from "react";
import type { CreateGoogleCampaignData } from "../google/campaigns/types";
import { AssetSelectorModal } from "../google/AssetSelectorModal";
import type { Asset } from "../../services/googleAdwords/googleAdwordsAssets";
import { getFieldLabel } from "./campaignFormFieldLabels";
import { GoogleDeviceTargetingForm } from "../google/campaigns/GoogleDeviceTargetingForm";
import { GoogleLanguageTargetingForm } from "../google/campaigns/GoogleLanguageTargetingForm";
import { GoogleTrackingTemplateForm } from "../google/campaigns/GoogleTrackingTemplateForm";
import { Dropdown } from "../ui/Dropdown";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import { GoogleLocationTargetingForm } from "../google/campaigns/GoogleLocationTargetingForm";
import { campaignsService } from "../../services/campaigns";



function getKeysForForm(formKeys: string[]): string[] {
  return formKeys.map((q) => stripEntityPrefix(q));
}

/** Strip entity prefix (e.g. "ad.logo_url" → "logo_url") for field matching */
function stripEntityPrefix(key: string): string {
  const parts = key.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : key;
}

/** Check if field key matches any requested key (with or without entity prefix) */
function isFieldRequested(fieldKey: string, requestedKeys: string[]): boolean {
  return requestedKeys.includes(fieldKey);
}

export interface CampaignFormForChatProps {
  questionsSchema: string[];
  campaignDraft: Record<string, unknown> | undefined;
  campaignType: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  profileId?: string | number;
  accountId?: string | number;
  channelId?: string | number;
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
  accountId,
  channelId,
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

  // Device Targeting
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(
    (campaignDraft?.device_ids as string[]) || []
  );

  // Language Targeting
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>(
    (campaignDraft?.language_ids as string[]) || []
  );

  // URL Options
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState<string>(
    (campaignDraft?.tracking_url_template as string) || ""
  );
  const [finalUrlSuffix, setFinalUrlSuffix] = useState<string>(
    (campaignDraft?.final_url_suffix as string) || ""
  );
  const [urlCustomParameters, setUrlCustomParameters] = useState<Array<{ key: string; value: string }>>(
    (campaignDraft?.url_custom_parameters as Array<{ key: string; value: string }>) || []
  );

  // Budget Name and Options
  const [budgetName, setBudgetName] = useState<string>(
    (campaignDraft?.budget_name as string) || ""
  );
  const [budgetOptions, setBudgetOptions] = useState<Array<{ value: string; label: string; name?: string }>>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [useCustomBudgetName, setUseCustomBudgetName] = useState(false);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  // Location Targeting
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>(
    (campaignDraft?.location_ids as number[]) || []
  );
  const [selectedExcludedLocationIds, setSelectedExcludedLocationIds] = useState<string[]>(
    (campaignDraft?.excluded_location_ids as string[]) || []
  );
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string; id: string; type: string; countryCode: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const profileIdNum = profileId != null ? (typeof profileId === "number" ? profileId : parseInt(String(profileId), 10)) : null;
  const accountIdNum = accountId != null ? (typeof accountId === "number" ? accountId : parseInt(String(accountId), 10)) : null;
  const channelIdNum = channelId != null ? (typeof channelId === "number" ? channelId : parseInt(String(channelId), 10)) : null;

  // Function to fetch budgets
  const fetchBudgets = useCallback(async () => {
    if (!accountIdNum || !channelIdNum || !profileIdNum) {
      setBudgetOptions([]);
      return;
    }

    setLoadingBudgets(true);
    try {
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid accountId or channelId");
      }
      const budgets = await googleAdwordsCampaignsService.getGoogleBudgets(accountIdNum, channelIdNum, profileIdNum);
      
      // Format budgets for dropdown
      const options = budgets.map((budget: any) => ({
        value: budget.resource_name,
        label: `${budget.name} ($${budget.amount_dollars?.toFixed(2) || '0.00'})`,
        name: budget.name,
      }));
      
      // Add "Custom" option at the beginning
      setBudgetOptions([
        { value: "__CUSTOM__", label: "Custom..." },
        ...options,
      ]);
    } catch (error: any) {
      console.error("Error fetching budgets:", error);
      // On error, still show custom option
      setBudgetOptions([{ value: "__CUSTOM__", label: "Custom..." }]);
    } finally {
      setLoadingBudgets(false);
    }
  }, [accountIdNum, channelIdNum, profileIdNum]);

  // Fetch budgets when account, channel, and profile are available
  // Note: We fetch when these IDs are available, even though hasBudgetNameField may not be computed yet
  useEffect(() => {
    if (accountIdNum && channelIdNum && profileIdNum) {
      fetchBudgets();
    }
  }, [accountIdNum, channelIdNum, profileIdNum, fetchBudgets]);

  // Function to fetch locations
  const fetchLocations = useCallback(async () => {
    if (!accountIdNum || !channelIdNum || !profileIdNum) {
      setLocationOptions([]);
      return;
    }

    setLoadingLocations(true);
    try {
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid accountId or channelId");
      }
      const locations = await campaignsService.getGoogleGeoTargetConstants(
        accountIdNum,
        channelIdNum,
        profileIdNum,
        undefined,
        undefined // No country restriction for now
      );

      const formattedLocations = locations.map((loc: any) => ({
        value: loc.id,
        label: `${loc.name} (${loc.type})`,
        id: loc.id,
        type: loc.type,
        countryCode: loc.countryCode || "",
      }));

      setLocationOptions(formattedLocations);
    } catch (error: any) {
      console.error("Error fetching locations:", error);
      setLocationOptions([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [accountIdNum, channelIdNum, profileIdNum]);

  // Fetch locations when account, channel, and profile are available
  useEffect(() => {
    if (accountIdNum && channelIdNum && profileIdNum && hasLocationIdsField) {
      fetchLocations();
    }
  }, [accountIdNum, channelIdNum, profileIdNum, fetchLocations]);

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
      // Add non-formData fields
      if (isFieldRequested("device_ids", requestedKeys) && selectedDeviceIds.length > 0) {
        vals["device_ids"] = selectedDeviceIds.join("\n");
      }
      if (isFieldRequested("language_ids", requestedKeys) && selectedLanguageIds.length > 0) {
        vals["language_ids"] = selectedLanguageIds.join("\n");
      }
      if (isFieldRequested("tracking_url_template", requestedKeys) && trackingUrlTemplate) {
        vals["tracking_url_template"] = trackingUrlTemplate;
      }
      if (isFieldRequested("final_url_suffix", requestedKeys) && finalUrlSuffix) {
        vals["final_url_suffix"] = finalUrlSuffix;
      }
      if (isFieldRequested("url_custom_parameters", requestedKeys) && urlCustomParameters.length > 0) {
        vals["url_custom_parameters"] = JSON.stringify(urlCustomParameters);
      }
      if (isFieldRequested("budget_name", requestedKeys) && budgetName) {
        vals["budget_name"] = budgetName;
      }
      if (isFieldRequested("location_ids", requestedKeys) && selectedLocationIds.length > 0) {
        vals["location_ids"] = selectedLocationIds.join("\n");
      }
      if (isFieldRequested("excluded_location_ids", requestedKeys) && selectedExcludedLocationIds.length > 0) {
        vals["excluded_location_ids"] = selectedExcludedLocationIds.join("\n");
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
      setSelectedDeviceIds([]);
      setSelectedLanguageIds([]);
      setTrackingUrlTemplate("");
      setFinalUrlSuffix("");
      setUrlCustomParameters([]);
      setBudgetName("");
      setSelectedBudgetId("");
      setUseCustomBudgetName(false);
      setSelectedLocationIds([]);
      setSelectedExcludedLocationIds([]);
    },
  }), [formData, requestedKeys, selectedDeviceIds, selectedLanguageIds, trackingUrlTemplate, finalUrlSuffix, urlCustomParameters, budgetName, selectedBudgetId, useCustomBudgetName, selectedLocationIds, selectedExcludedLocationIds]);

  const onChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    const parts: string[] = [];

    // Add formData fields
    for (const key of requestedKeys) {
      const v = formData[key as keyof typeof formData];
      if (v !== undefined && v !== "" && v != null) {
        const label = getFieldLabel(key);
        const displayValue = typeof v === "object" ? JSON.stringify(v) : String(v);
        parts.push(`${label}: ${displayValue}`);
      }
    }

    // Add device_ids
    if (isFieldRequested("device_ids", requestedKeys) && selectedDeviceIds.length > 0) {
      const label = getFieldLabel("device_ids");
      parts.push(`${label}: ${selectedDeviceIds.join(", ")}`);
    }

    // Add language_ids
    if (isFieldRequested("language_ids", requestedKeys) && selectedLanguageIds.length > 0) {
      const label = getFieldLabel("language_ids");
      parts.push(`${label}: ${selectedLanguageIds.join(", ")}`);
    }

    // Add URL tracking fields (include all if form is rendered, regardless of individual field requests)
    const hasAnyTrackingFieldRequested = isFieldRequested("tracking_url_template", requestedKeys) || isFieldRequested("final_url_suffix", requestedKeys) || isFieldRequested("url_custom_parameters", requestedKeys);
    
    if (hasAnyTrackingFieldRequested) {
      if (trackingUrlTemplate) {
        const label = getFieldLabel("tracking_url_template");
        parts.push(`${label}: ${trackingUrlTemplate}`);
      }
      if (finalUrlSuffix) {
        const label = getFieldLabel("final_url_suffix");
        parts.push(`${label}: ${finalUrlSuffix}`);
      }
      if (urlCustomParameters.length > 0) {
        const label = getFieldLabel("url_custom_parameters");
        parts.push(`${label}: ${JSON.stringify(urlCustomParameters)}`);
      }
    }

    // Add budget_name
    if (isFieldRequested("budget_name", requestedKeys)) {
      let displayValue = budgetName;
      if (selectedBudgetId && selectedBudgetId !== "__CUSTOM__") {
        // Show selected budget name from dropdown
        const selectedOption = budgetOptions.find(opt => opt.value === selectedBudgetId);
        displayValue = selectedOption?.name || budgetName;
      }
      if (displayValue) {
        const label = getFieldLabel("budget_name");
        parts.push(`${label}: ${displayValue}`);
      }
    }

    // Add location_ids
    if (isFieldRequested("location_ids", requestedKeys) && selectedLocationIds.length > 0) {
      const label = getFieldLabel("location_ids");
      const locationNames = selectedLocationIds.map(locId => {
        const location = locationOptions.find(opt => opt.value === String(locId));
        return location?.label || locId;
      }).join(", ");
      parts.push(`${label}: ${locationNames}`);
    }

    // Add excluded_location_ids
    if (isFieldRequested("excluded_location_ids", requestedKeys) && selectedExcludedLocationIds.length > 0) {
      const label = getFieldLabel("excluded_location_ids");
      const locationNames = selectedExcludedLocationIds.map(locId => {
        const location = locationOptions.find(opt => opt.value === locId);
        return location?.label || locId;
      }).join(", ");
      parts.push(`${label}: ${locationNames}`);
    }
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

  // Targeting fields
  const hasDeviceIdsField = isFieldRequested("device_ids", requestedKeys);
  const hasLanguageIdsField = isFieldRequested("language_ids", requestedKeys);
  const hasTrackingUrlTemplateField = isFieldRequested("tracking_url_template", requestedKeys);
  const hasFinalUrlSuffixField = isFieldRequested("final_url_suffix", requestedKeys);
  const hasUrlCustomParametersField = isFieldRequested("url_custom_parameters", requestedKeys);
  const hasBudgetNameField = isFieldRequested("budget_name", requestedKeys);
  const hasLocationIdsField = isFieldRequested("location_ids", requestedKeys);
  const hasExcludedLocationIdsField = isFieldRequested("excluded_location_ids", requestedKeys);

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

  const hasAnyVisibleTargetingField = hasDeviceIdsField || hasLanguageIdsField || hasTrackingUrlTemplateField || hasFinalUrlSuffixField || hasUrlCustomParametersField || hasBudgetNameField || hasLocationIdsField || hasExcludedLocationIdsField;

  const hasAnyVisibleField = !!hasAnyVisibleAssetField || hasAnyVisibleTargetingField;

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

        {/* Targeting Fields */}
        <div className="space-y-4">
          {/* Device Targeting */}
          {hasDeviceIdsField && (
            <GoogleDeviceTargetingForm
              deviceIds={selectedDeviceIds}
              onChange={(field, value) => {
                if (field === "device_ids") {
                  setSelectedDeviceIds(value as string[]);
                }
              }}
              showTitle={true}
              disabled={disabled}
              flatLayout={true}
            />
          )}

          {/* Language Targeting */}
          {hasLanguageIdsField && (
            <GoogleLanguageTargetingForm
              languageIds={selectedLanguageIds}
              languageOptions={[
                { value: "1000", label: "English", id: "1000" },
                { value: "1001", label: "Spanish", id: "1001" },
                { value: "1002", label: "French", id: "1002" },
                { value: "1003", label: "German", id: "1003" },
                { value: "1004", label: "Italian", id: "1004" },
                { value: "1005", label: "Portuguese", id: "1005" },
                { value: "1006", label: "Chinese", id: "1006" },
                { value: "1007", label: "Japanese", id: "1007" },
                { value: "1008", label: "Korean", id: "1008" },
              ]}
              loadingLanguages={false}
              onLanguageIdsChange={(ids) => setSelectedLanguageIds(ids || [])}
              showTitle={true}
            />
          )}

          {/* URL Options (Tracking Template, Final URL Suffix, Custom Parameters) */}
          {(hasTrackingUrlTemplateField || hasFinalUrlSuffixField || hasUrlCustomParametersField) && (
            <GoogleTrackingTemplateForm
              trackingUrlTemplate={trackingUrlTemplate}
              finalUrlSuffix={finalUrlSuffix}
              urlCustomParameters={urlCustomParameters}
              onTrackingUrlTemplateChange={setTrackingUrlTemplate}
              onFinalUrlSuffixChange={setFinalUrlSuffix}
              onCustomParametersChange={(params) => setUrlCustomParameters(params || [])}
              title="Campaign URL Options"
              showTitle={true}
            />
          )}

          {/* Location Targeting */}
          {(hasLocationIdsField || hasExcludedLocationIdsField) && (
            <GoogleLocationTargetingForm
              locationIds={selectedLocationIds}
              excludedLocationIds={selectedExcludedLocationIds}
              locationOptions={locationOptions}
              loadingLocations={loadingLocations}
              onLocationIdsChange={(ids) => setSelectedLocationIds(ids || [])}
              onExcludedLocationIdsChange={(ids) => setSelectedExcludedLocationIds(ids || [])}
              showTitle={true}
            />
          )}

          {/* Budget Name */}
          {hasBudgetNameField && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#072929]">
                Budget Name
              </label>
              {useCustomBudgetName || selectedBudgetId === "__CUSTOM__" ? (
                <div>
                  <input
                    type="text"
                    value={budgetName}
                    onChange={(e) => setBudgetName(e.target.value)}
                    className="campaign-input w-full"
                    placeholder="Enter custom budget name"
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomBudgetName(false);
                      setSelectedBudgetId("");
                      setBudgetName("");
                    }}
                    className="text-[10px] text-[#136D6D] mt-1 hover:underline"
                  >
                    ← Back to budget list
                  </button>
                </div>
              ) : (
                <Dropdown<string>
                  options={budgetOptions}
                  value={selectedBudgetId || ""}
                  placeholder={loadingBudgets ? "Loading budgets..." : "Select a budget or choose Custom..."}
                  onChange={(value) => {
                    if (value === "__CUSTOM__") {
                      setUseCustomBudgetName(true);
                      setSelectedBudgetId("__CUSTOM__");
                      setBudgetName("");
                    } else {
                      const opt = budgetOptions.find((o) => o.value === value);
                      setUseCustomBudgetName(false);
                      setSelectedBudgetId(value);
                      setBudgetName(opt?.name ?? opt?.label ?? value);
                    }
                  }}
                  disabled={loadingBudgets || disabled}
                  searchable={true}
                  searchPlaceholder="Search budgets..."
                  emptyMessage="No budgets found"
                  buttonClassName="edit-button w-full"
                />
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
