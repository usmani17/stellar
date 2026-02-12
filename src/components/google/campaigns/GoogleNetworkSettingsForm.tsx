// Reusable Network Settings Form (Search Network / Display Network)
// Used by GoogleSearchCampaignForm, GooglePerformanceMaxCampaignForm, CampaignFormForChat

import React from "react";
import type { CreateGoogleCampaignData } from "./types";

interface GoogleNetworkSettingsFormProps {
  networkSettings: CreateGoogleCampaignData["network_settings"];
  onChange: (field: keyof CreateGoogleCampaignData, value: unknown) => void;
  showTitle?: boolean;
  disabled?: boolean;
}

export const GoogleNetworkSettingsForm: React.FC<GoogleNetworkSettingsFormProps> = ({
  networkSettings,
  onChange,
  showTitle = true,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      {showTitle && (
        <h3 className="text-[13px] font-semibold text-[#072929]">Network Settings</h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`border rounded-lg p-4 bg-white transition-colors cursor-pointer ${
            networkSettings?.target_search_network ? "border-forest-f40 bg-forest-f40/5" : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() =>
            !disabled &&
            onChange("network_settings", {
              target_google_search: networkSettings?.target_google_search ?? true,
              target_search_network: !networkSettings?.target_search_network,
              target_content_network: networkSettings?.target_content_network ?? false,
              target_partner_search_network: networkSettings?.target_partner_search_network ?? false,
            })
          }
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[13px] font-semibold text-[#072929]">Search Network</h4>
            {networkSettings?.target_search_network && (
              <span className="text-[10px] px-2 py-0.5 bg-forest-f40/20 text-forest-f40 rounded font-medium">Enabled</span>
            )}
          </div>
          <p className="text-[11px] text-[#556179] mb-3">
            Ads can appear near Google Search results and other Google sites when people search for terms that are relevant to your keywords.
          </p>
          <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={networkSettings?.target_search_network ?? false}
              onChange={(e) => {
                onChange("network_settings", {
                  target_google_search: networkSettings?.target_google_search ?? true,
                  target_search_network: e.target.checked,
                  target_content_network: networkSettings?.target_content_network ?? false,
                  target_partner_search_network: networkSettings?.target_partner_search_network ?? false,
                });
              }}
              className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              disabled={disabled}
            />
            <span className="text-[12px] text-[#072929]">Include Google search partners</span>
          </label>
        </div>
        <div
          className={`border rounded-lg p-4 bg-white transition-colors cursor-pointer ${
            networkSettings?.target_content_network ? "border-forest-f40 bg-forest-f40/5" : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() =>
            !disabled &&
            onChange("network_settings", {
              target_google_search: networkSettings?.target_google_search ?? true,
              target_search_network: networkSettings?.target_search_network ?? true,
              target_content_network: !networkSettings?.target_content_network,
              target_partner_search_network: networkSettings?.target_partner_search_network ?? false,
            })
          }
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[13px] font-semibold text-[#072929]">Display Network</h4>
            {networkSettings?.target_content_network && (
              <span className="text-[10px] px-2 py-0.5 bg-forest-f40/20 text-forest-f40 rounded font-medium">Enabled</span>
            )}
          </div>
          <p className="text-[11px] text-[#556179] mb-3">
            Easy way to get additional conversions at similar or lower costs than Search with unused Search budget.
          </p>
          <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={networkSettings?.target_content_network ?? false}
              onChange={(e) => {
                onChange("network_settings", {
                  target_google_search: networkSettings?.target_google_search ?? true,
                  target_search_network: networkSettings?.target_search_network ?? true,
                  target_content_network: e.target.checked,
                  target_partner_search_network: networkSettings?.target_partner_search_network ?? false,
                });
              }}
              className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              disabled={disabled}
            />
            <span className="text-[12px] text-[#072929]">Include Google Display Network</span>
          </label>
        </div>
      </div>
    </div>
  );
};
