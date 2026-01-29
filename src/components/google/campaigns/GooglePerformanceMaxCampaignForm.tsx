// Performance Max Campaign Form Component
// This component handles Performance Max campaign-specific fields

import React, { useState } from "react";
import type { BaseCampaignFormProps } from "./types";
import { DEVICE_OPTIONS } from "./utils";
import { GoogleLanguageTargetingForm } from "./GoogleLanguageTargetingForm";
import { GoogleLocationTargetingForm } from "./GoogleLocationTargetingForm";
import { GoogleTrackingTemplateForm } from "./GoogleTrackingTemplateForm";
import { GoogleBiddingStrategyForm } from "./GoogleBiddingStrategyForm";
import { GooglePerformanceMaxAssetGroupForm } from "./GooglePerformanceMaxAssetGroupForm";
import { SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION } from "../CreateGooglePmaxAssetGroupPanel";
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
  // Language targeting props
  languageOptions: Array<{ value: string; label: string; id: string }>;
  loadingLanguages: boolean;
  // Location targeting props
  locationOptions: Array<{ value: string; label: string; id: string; type: string; countryCode: string }>;
  loadingLocations: boolean;
  onLocationIdsChange: (ids: number[] | undefined) => void;
  onExcludedLocationIdsChange: (ids: string[] | undefined) => void;
  // Campaign URL options props
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  urlCustomParameters?: Array<{ key: string; value: string }>;
  onTrackingUrlTemplateChange: (value: string) => void;
  onFinalUrlSuffixChange: (value: string) => void;
  onCustomParametersChange: (params: Array<{ key: string; value: string }> | undefined) => void;
}

// Campaign settings tab definitions
const CAMPAIGN_SETTINGS_TABS = [
  { id: "bidding", label: "Bidding Strategy" },
  { id: "device", label: "Device Targeting" },
  { id: "network", label: "Network Settings" },
  { id: "location", label: "Location Targeting" },
  { id: "language", label: "Language Targeting" },
  { id: "url-options", label: "Campaign URL Options" },
] as const;

type CampaignSettingsTabId = typeof CAMPAIGN_SETTINGS_TABS[number]["id"];

export const GooglePerformanceMaxCampaignForm: React.FC<GooglePerformanceMaxCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  mode,
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
  selectedProfileId,
  googleProfiles,
  languageOptions,
  loadingLanguages,
  locationOptions,
  loadingLocations,
  onLocationIdsChange,
  onExcludedLocationIdsChange,
  trackingUrlTemplate,
  finalUrlSuffix,
  urlCustomParameters,
  onTrackingUrlTemplateChange,
  onFinalUrlSuffixChange,
  onCustomParametersChange,
}) => {
  // Tab state for Campaign Settings
  const [activeCampaignSettingsTab, setActiveCampaignSettingsTab] = useState<CampaignSettingsTabId>("bidding");

  // Get numeric profile ID from selected profile
  const selectedProfile = googleProfiles?.find((p: any) => p.value === selectedProfileId);
  const profileId = selectedProfile?.profile_id || null;

  // Asset Selector Modal state for business_name and logo
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorType, setAssetSelectorType] = useState<"BUSINESS_NAME" | "LOGO" | null>(null);

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
          if (asset.image_url) {
            _setLogoPreview(asset.image_url);
          }
        }
        break;
    }
    setAssetSelectorOpen(false);
    setAssetSelectorType(null);
  };

  const openAssetSelector = (type: "BUSINESS_NAME" | "LOGO") => {
    if (!profileId) {
      setErrors({ ...errors, general: "Please select a Google Ads account first" });
      return;
    }
    setAssetSelectorType(type);
    setAssetSelectorOpen(true);
  };

  return (
    <>
      {/* Section 1: Brand Guidelines Required Fields (Business Name & Square Logo) */}
      <div className="mt-2">
        <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
          Brand Guidelines Required Fields
        </h3>
        <p className="text-[11px] text-[#556179] mt-2 mb-4">
          Performance Max campaigns with Brand Guidelines enabled require a business name and square logo (1:1 aspect ratio).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Business Name Field */}
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
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={formData.business_name || ""}
                    onChange={(e) => onChange("business_name", e.target.value)}
                    maxLength={25}
                    className={`campaign-input w-full pr-28 ${
                      errors.business_name ? "border-red-500" : ""
                    }`}
                    placeholder="Enter business name"
                  />
                  {profileId && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        onClick={() => openAssetSelector("BUSINESS_NAME")}
                        className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                      >
                        Select Asset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {errors.business_name && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.business_name}
              </p>
            )}
            <p className="text-[10px] text-[#556179] mt-1">
              Required. Enter business name directly or select from assets.
            </p>
          </div>

          {/* Square Logo Field */}
          <div>
            <label className="form-label mb-1">
              Square Logo (URL) * <span className="text-[10px] text-[#556179] font-normal">(1:1 aspect ratio, min 128x128px)</span>
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
                Required. Enter square logo URL directly or select from assets. Must be 1:1 aspect ratio, minimum 128x128px.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Campaign Settings Tabs */}
      <div className="tabs-container mt-6">
        <div className="">
          <div className="flex bg-[#FEFEFB] border-b border-[#e8e8e3]">
            {CAMPAIGN_SETTINGS_TABS.map((tab) => {
              const isActive = activeCampaignSettingsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveCampaignSettingsTab(tab.id);
                  }}
                  className={`tab-button cursor-pointer ${
                    isActive
                      ? "tab-button-active"
                      : "tab-button-inactive"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Bidding Strategy Tab */}
          {activeCampaignSettingsTab === "bidding" && (
            <div className="p-3">
              <GoogleBiddingStrategyForm
                formData={formData}
                errors={errors}
                onChange={onChange}
                showTitle={false}
              />
            </div>
          )}

          {/* Device Targeting Tab */}
          {activeCampaignSettingsTab === "device" && (
            <div className="p-3 tab-content">
              <div>
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
          )}

          {/* Network Settings Tab */}
          {activeCampaignSettingsTab === "network" && (
            <div className="p-3 tab-content">
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Search Network card */}
                  <div 
                    className={`border rounded-lg p-4 bg-white transition-colors cursor-pointer ${
                      formData.network_settings?.target_search_network
                        ? "border-forest-f40 bg-forest-f40/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      onChange("network_settings", {
                        target_google_search: formData.network_settings?.target_google_search ?? true,
                        target_search_network: !formData.network_settings?.target_search_network,
                        target_content_network:
                          formData.network_settings?.target_content_network ?? false,
                        target_partner_search_network:
                          formData.network_settings?.target_partner_search_network ?? false,
                      })
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[13px] font-semibold text-[#072929]">
                        Search Network
                      </h4>
                      {formData.network_settings?.target_search_network && (
                        <span className="text-[10px] px-2 py-0.5 bg-forest-f40/20 text-forest-f40 rounded font-medium">
                          Enabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#556179] mb-3">
                      Ads can appear near Google Search results and other Google sites
                      when people search for terms that are relevant to your products.
                    </p>
                    <label 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={formData.network_settings?.target_search_network ?? true}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChange("network_settings", {
                            target_google_search: formData.network_settings?.target_google_search ?? true,
                            target_search_network: e.target.checked,
                            target_content_network:
                              formData.network_settings?.target_content_network ?? false,
                            target_partner_search_network:
                              formData.network_settings?.target_partner_search_network ?? false,
                          });
                        }}
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                      />
                      <span className="text-[12px] text-[#072929]">
                        Include Google search partners
                      </span>
                    </label>
                  </div>

                  {/* Display Network card */}
                  <div 
                    className={`border rounded-lg p-4 bg-white transition-colors cursor-pointer ${
                      formData.network_settings?.target_content_network
                        ? "border-forest-f40 bg-forest-f40/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      onChange("network_settings", {
                        target_google_search: formData.network_settings?.target_google_search ?? true,
                        target_search_network:
                          formData.network_settings?.target_search_network ?? true,
                        target_content_network: !formData.network_settings?.target_content_network,
                        target_partner_search_network:
                          formData.network_settings?.target_partner_search_network ?? false,
                      })
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[13px] font-semibold text-[#072929]">
                        Display Network
                      </h4>
                      {formData.network_settings?.target_content_network && (
                        <span className="text-[10px] px-2 py-0.5 bg-forest-f40/20 text-forest-f40 rounded font-medium">
                          Enabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#556179] mb-3">
                      Easy way to get additional conversions at similar or lower costs than
                      Search with unused Search budget.
                    </p>
                    <label 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={formData.network_settings?.target_content_network ?? false}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChange("network_settings", {
                            target_google_search: formData.network_settings?.target_google_search ?? true,
                            target_search_network:
                              formData.network_settings?.target_search_network ?? true,
                            target_content_network: e.target.checked,
                            target_partner_search_network:
                              formData.network_settings?.target_partner_search_network ?? false,
                          });
                        }}
                        className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                      />
                      <span className="text-[12px] text-[#072929]">
                        Include Google Display Network
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location Targeting Tab */}
          {activeCampaignSettingsTab === "location" && (
            <div className="p-3 tab-content">
              <GoogleLocationTargetingForm
                locationIds={formData.location_ids}
                excludedLocationIds={formData.excluded_location_ids}
                locationOptions={locationOptions}
                loadingLocations={loadingLocations}
                onLocationIdsChange={onLocationIdsChange}
                onExcludedLocationIdsChange={onExcludedLocationIdsChange}
                errors={errors}
                showTitle={false}
              />
            </div>
          )}

          {/* Language Targeting Tab */}
          {activeCampaignSettingsTab === "language" && (
            <div className="p-3 tab-content">
              {languageOptions && languageOptions.length > 0 && (
                <GoogleLanguageTargetingForm
                  languageIds={formData.language_ids}
                  languageOptions={languageOptions}
                  loadingLanguages={loadingLanguages || false}
                  onLanguageIdsChange={(ids: string[] | undefined) => onChange("language_ids", ids)}
                  errors={errors}
                  showTitle={false}
                />
              )}
            </div>
          )}

          {/* Campaign URL Options Tab */}
          {activeCampaignSettingsTab === "url-options" && (
            <div className="p-3 tab-content">
              <GoogleTrackingTemplateForm
                trackingUrlTemplate={trackingUrlTemplate}
                finalUrlSuffix={finalUrlSuffix}
                urlCustomParameters={urlCustomParameters}
                onTrackingUrlTemplateChange={onTrackingUrlTemplateChange}
                onFinalUrlSuffixChange={onFinalUrlSuffixChange}
                onCustomParametersChange={onCustomParametersChange}
                title="Campaign URL Options"
                showTitle={false}
              />
            </div>
          )}
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
          assetType={assetSelectorType === "BUSINESS_NAME" ? "TEXT" : assetSelectorType === "LOGO" ? "IMAGE" : undefined}
          profileId={profileId}
          initialTab={assetSelectorType === "BUSINESS_NAME" ? "Business Name" : assetSelectorType === "LOGO" ? "Logo" : undefined}
        />
      )}

      {/* Section 3: Business Information, Asset Group Settings, and Asset Tabs (Reusable Component) */}
      {SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION && (
        <GooglePerformanceMaxAssetGroupForm
          formData={formData}
          errors={errors}
          onChange={onChange}
          mode={mode}
          onAddHeadline={onAddHeadline}
          onRemoveHeadline={onRemoveHeadline}
          onUpdateHeadline={onUpdateHeadline}
          onAddDescription={onAddDescription}
          onRemoveDescription={onRemoveDescription}
          onUpdateDescription={onUpdateDescription}
          logoPreview={_logoPreview}
          setLogoPreview={_setLogoPreview}
          marketingImagePreview={marketingImagePreview}
          setMarketingImagePreview={setMarketingImagePreview}
          squareMarketingImagePreview={squareMarketingImagePreview}
          setSquareMarketingImagePreview={setSquareMarketingImagePreview}
          setErrors={setErrors}
          profileId={profileId}
          campaignType="PERFORMANCE_MAX"
        />
      )}
    </>
  );
};
