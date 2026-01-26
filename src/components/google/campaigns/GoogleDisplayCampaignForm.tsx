// Display Campaign Form Component
// This component handles Display campaign-specific fields

import React from "react";
import type { BaseCampaignFormProps } from "./types";

export const GoogleDisplayCampaignForm: React.FC<BaseCampaignFormProps> = ({
  formData,
  onChange,
}) => {
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
        Display Settings
      </h3>

      {/* Ad Group Name */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Ad Group Name
        </label>
        <input
          type="text"
          value={formData.adgroup_name || ""}
          onChange={(e) => onChange("adgroup_name", e.target.value)}
          className="campaign-input w-full"
          placeholder="Optional ad group name"
        />
      </div>

      {/* Network Settings */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Network Settings
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white border border-gray-200 rounded">
          {[
            { key: "target_content_network", label: "Display Network", default: true },
            { key: "target_google_search", label: "Google Search", default: false },
            { key: "target_search_network", label: "Search Network", default: false },
            { key: "target_partner_search_network", label: "Partner Search Network", default: false },
          ].map((network) => (
            <label key={network.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.network_settings?.[network.key as keyof typeof formData.network_settings] ?? network.default}
                onChange={(e) => {
                  const current = formData.network_settings || {};
                  onChange("network_settings", {
                    ...current,
                    [network.key]: e.target.checked,
                  });
                }}
                className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              />
              <span className="text-[13px] text-[#072929]">{network.label}</span>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-[#556179] mt-1">
          Control where your Display ads appear. Display Network is enabled by default.
        </p>
      </div>
    </div>
  );
};
