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

  return (
    <>
      {/* Section 1: Campaign Settings Tabs */}
      <div className="mt-6">
        <div className="mb-6 overflow-hidden">
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
                  className={`px-4 py-2 text-[14px] transition-colors ${
                    isActive
                      ? "text-[#072929] bg-[#FEFEFB] border-b-2 border-[#136D6D]"
                      : "text-[#556179] hover:text-[#072929] hover:bg-[#f5f5f0]"
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
            <div className="p-3">
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
            <div className="p-3">
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
            <div className="p-3">
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
            <div className="p-3">
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
            <div className="p-3">
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

      {/* Section 2: Business Information, Asset Group Settings, and Asset Tabs (Reusable Component) */}
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
    </>
  );
};
