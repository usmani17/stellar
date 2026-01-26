// Search Campaign Form Component
// This component handles Search campaign-specific fields

import React from "react";
import type { BaseCampaignFormProps } from "./types";
import { DEVICE_OPTIONS } from "./utils";
import { GoogleLanguageTargetingForm } from "./GoogleLanguageTargetingForm";

interface GoogleSearchCampaignFormProps extends BaseCampaignFormProps {
  // Language targeting props
  languageOptions: Array<{ value: string; label: string; id: string }>;
  loadingLanguages: boolean;
}

export const GoogleSearchCampaignForm: React.FC<GoogleSearchCampaignFormProps> = ({
  formData,
  onChange,
  languageOptions,
  loadingLanguages,
  errors = {},
}) => {
  return (
    <>
      {/* Network Settings */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Network Settings
        </h3>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
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

      {/* Device Targeting */}
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

      {/* Language Targeting */}
      <GoogleLanguageTargetingForm
        languageIds={formData.language_ids}
        languageOptions={languageOptions}
        loadingLanguages={loadingLanguages}
        onLanguageIdsChange={(ids) => onChange("language_ids", ids)}
        errors={errors}
      />
    </>
  );
};
