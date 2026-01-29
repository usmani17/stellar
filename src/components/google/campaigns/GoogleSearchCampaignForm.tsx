// Search Campaign Form Component
// This component handles Search campaign-specific fields

import React, { useState } from "react";
import type { BaseCampaignFormProps } from "./types";
import { DEVICE_OPTIONS } from "./utils";
import { GoogleLanguageTargetingForm } from "./GoogleLanguageTargetingForm";
import { GoogleLocationTargetingForm } from "./GoogleLocationTargetingForm";
import { GoogleTrackingTemplateForm } from "./GoogleTrackingTemplateForm";
import { GoogleBiddingStrategyForm } from "./GoogleBiddingStrategyForm";
// import { GoogleConversionActionForm } from "./GoogleConversionActionForm"; // used when Conversion Actions section is enabled

interface GoogleSearchCampaignFormProps extends BaseCampaignFormProps {
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
  // Conversion action props
  selectedConversionActions?: Array<{ id: string; name: string }>;
  onSelectConversionActionsClick: () => void;
}

// Tab definitions
const TABS = [
  { id: "bidding", label: "Bidding Strategy" },
  { id: "network", label: "Network Settings" },
  { id: "device", label: "Device Targeting" },
  { id: "language", label: "Language Targeting" },
  { id: "location", label: "Location Targeting" },
  { id: "url-options", label: "Campaign URL Options" },
] as const;

type TabId = typeof TABS[number]["id"];

export const GoogleSearchCampaignForm: React.FC<GoogleSearchCampaignFormProps> = ({
  formData,
  onChange,
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
  selectedConversionActions: _selectedConversionActions = [], // used when Conversion Actions section is enabled
  onSelectConversionActionsClick: _onSelectConversionActionsClick, // used when Conversion Actions section is enabled
  errors = {},
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("bidding");

  return (
    <div className="tabs-container mt-2">
      <div className="">
        <div className="flex bg-[#FEFEFB] border-b border-[#e8e8e3]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab.id);
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
        {activeTab === "bidding" && (
          <div className="p-3">
            <GoogleBiddingStrategyForm
              formData={formData}
              errors={errors}
              onChange={onChange}
              showTitle={false}
            />
          </div>
        )}

        {/* Network Settings Tab */}
        {activeTab === "network" && (
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
                    when people search for terms that are relevant to your keywords.
                  </p>
                  <label 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={formData.network_settings?.target_search_network ?? false}
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

        {/* Device Targeting Tab */}
        {activeTab === "device" && (
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

        {/* Language Targeting Tab */}
        {activeTab === "language" && (
          <div className="p-3 tab-content">
            <GoogleLanguageTargetingForm
              languageIds={formData.language_ids}
              languageOptions={languageOptions}
              loadingLanguages={loadingLanguages}
              onLanguageIdsChange={(ids) => onChange("language_ids", ids)}
              errors={errors}
              showTitle={false}
            />
          </div>
        )}

        {/* Location Targeting Tab */}
        {activeTab === "location" && (
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

        {/* Campaign URL Options Tab */}
        {activeTab === "url-options" && (
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

      {/* Conversion Actions - at end of form (disabled for now; enable later) */}
      {/* <div className="mt-8 pt-6 p-3 border-t border-[#e8e8e3]">
        <GoogleConversionActionForm
          conversionActionIds={formData.conversion_action_ids}
          selectedConversionActions={selectedConversionActions}
          onConversionActionIdsChange={(ids) => onChange("conversion_action_ids", ids)}
          onSelectClick={onSelectConversionActionsClick}
          errors={errors}
          showTitle={false}
        />
      </div> */}
    </div>
  );
};
