// Shopping Campaign Form Component
// This component handles Shopping campaign-specific fields

import React, { useState } from "react";
import { Dropdown } from "../../ui/Dropdown";
import { MerchantIdDropdown } from "../MerchantIdDropdown";
import type { ShoppingCampaignFormProps } from "./types";
import { SALES_COUNTRY_OPTIONS, CAMPAIGN_PRIORITY_OPTIONS, DEVICE_OPTIONS } from "./utils";
import { GoogleLanguageTargetingForm } from "./GoogleLanguageTargetingForm";
import { GoogleLocationTargetingForm } from "./GoogleLocationTargetingForm";
import { GoogleTrackingTemplateForm } from "./GoogleTrackingTemplateForm";
import { GoogleBiddingStrategyForm } from "./GoogleBiddingStrategyForm";

function shouldShowShoppingField(key: string, visibleKeys?: string[]): boolean {
  if (!visibleKeys || visibleKeys.length === 0) return true;
  return visibleKeys.includes(key);
}

interface GoogleShoppingCampaignFormProps extends ShoppingCampaignFormProps {
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
  /** When provided, only render shopping setting fields in this list. Used by Assistant chat. */
  visibleKeys?: string[];
  /** When true, only show Shopping Settings section (no tabs). Used by Assistant chat. */
  flatMode?: boolean;
  /** When true, render fields one per line (single column). Used by Assistant chat. */
  flatLayout?: boolean;
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

export const GoogleShoppingCampaignForm: React.FC<GoogleShoppingCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  isDraftCampaign = false,
  mode = "create",
  accountId,
  channelId,
  selectedProfileId,
  isOpen = true,
  languageOptions = [],
  loadingLanguages = false,
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
  visibleKeys,
  flatMode = false,
  flatLayout = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("bidding");
  const showField = (k: string) => shouldShowShoppingField(k, visibleKeys);

  if (flatMode) {
    const gridClass = flatLayout ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4";
    return (
      <div className="space-y-4">
        <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">Shopping Settings</h3>
        <div className={gridClass}>
          {showField("merchant_id") && (
            <MerchantIdDropdown
              value={formData.merchant_id || ""}
              onChange={(v) => onChange("merchant_id", v)}
              accountId={accountId}
              channelId={channelId}
              selectedProfileId={selectedProfileId}
              campaignType={formData.campaign_type}
              isOpen={isOpen}
              errors={errors}
              mode={mode}
              showAccountCount={false}
            />
          )}
          {showField("sales_country") && (
            <div>
              <label className="form-label">Sales Country</label>
              <Dropdown<string>
                options={SALES_COUNTRY_OPTIONS}
                value={formData.sales_country || "US"}
                onChange={(v) => onChange("sales_country", v)}
                buttonClassName="edit-button w-full"
              />
            </div>
          )}
          {showField("campaign_priority") && (
            <div>
              <label className="form-label">Campaign Priority</label>
              <Dropdown<number>
                options={CAMPAIGN_PRIORITY_OPTIONS}
                value={formData.campaign_priority || 0}
                onChange={(v) => onChange("campaign_priority", v)}
                buttonClassName="w-full edit-button"
              />
            </div>
          )}
          {showField("enable_local") && (
            <div className="pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enable_local || false}
                  onChange={(e) => onChange("enable_local", e.target.checked)}
                  className="w-4 h-4 accent-forest-f40 border-gray-300 rounded"
                />
                <span className="form-label mb-0">Enable Local</span>
              </label>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Shopping-specific fields - Keep at top before tabs */}
      <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
        Shopping Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Merchant ID */}
        {showField("merchant_id") && (
          <MerchantIdDropdown
            value={formData.merchant_id || ""}
            onChange={(value) => onChange("merchant_id", value)}
            accountId={accountId}
            channelId={channelId}
            selectedProfileId={selectedProfileId}
            campaignType={formData.campaign_type}
            isOpen={isOpen}
            errors={errors}
            mode={mode}
            showAccountCount={true}
          />
        )}

        {/* Sales Country */}
        {showField("sales_country") && (
        <div>
          <label className="form-label">
            Sales Country
          </label>
          <Dropdown<string>
            options={SALES_COUNTRY_OPTIONS}
            value={formData.sales_country || "US"}
            onChange={(value) => onChange("sales_country", value)}
            buttonClassName="edit-button w-full"
            disabled={mode === "edit" && formData.campaign_type === "SHOPPING" && !isDraftCampaign}
          />
        </div>
        )}

        {/* Campaign Priority */}
        {showField("campaign_priority") && (
        <div>
          <label className="form-label">
            Campaign Priority
          </label>
          <Dropdown<number>
            options={CAMPAIGN_PRIORITY_OPTIONS}
            value={formData.campaign_priority || 0}
            onChange={(value) => onChange("campaign_priority", value)}
            buttonClassName="w-full edit-button"
          />
          <p className="text-[10px] text-[#556179] mt-1">
            Priority determines how your Shopping campaigns compete with each other. Low (0) = lowest priority, High (2) = highest priority.
          </p>
        </div>
        )}

        {/* Enable Local */}
        {showField("enable_local") && (
        <div className="pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enable_local || false}
              onChange={(e) =>
                onChange("enable_local", e.target.checked)
              }
              className={`w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40 ${
                errors.enable_local ? "border-red-500" : ""
              }`}
            />
            <span className="form-label mb-0">
              Enable Local
            </span>
          </label>
          <p className="text-[10px] text-[#556179] mt-1 ml-6">
            Enable local inventory ads to show your products to nearby customers with local inventory available.
          </p>
        </div>
        )}
      </div>

      {/* Advanced Settings Tabs */}
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
      </div>
    </div>
  );
};
