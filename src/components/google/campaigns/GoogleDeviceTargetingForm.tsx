// Reusable Device Targeting Form
// Used by GoogleSearchCampaignForm, GooglePerformanceMaxCampaignForm, GoogleShoppingCampaignForm, CampaignFormForChat

import React from "react";
import type { CreateGoogleCampaignData } from "./types";
import { DEVICE_OPTIONS } from "./utils";

interface GoogleDeviceTargetingFormProps {
  deviceIds: string[] | undefined;
  onChange: (field: keyof CreateGoogleCampaignData, value: unknown) => void;
  showTitle?: boolean;
  disabled?: boolean;
  /** When true, render device options one per line. Used by Assistant chat. */
  flatLayout?: boolean;
}

export const GoogleDeviceTargetingForm: React.FC<GoogleDeviceTargetingFormProps> = ({
  deviceIds,
  onChange,
  showTitle = true,
  disabled = false,
  flatLayout = false,
}) => {
  const gridClass = flatLayout ? "flex flex-col gap-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
  return (
    <div className="space-y-3">
      {showTitle && (
        <h3 className="text-[13px] font-semibold text-[#072929]">Device Targeting</h3>
      )}
      <div className={gridClass}>
        {DEVICE_OPTIONS.map((device) => (
          <div key={device.value} className="border border-gray-200 rounded-lg p-4 bg-white">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="text-3xl mb-1">{device.icon}</div>
              <input
                type="checkbox"
                checked={deviceIds?.includes(device.value) ?? false}
                onChange={(e) => {
                  const currentIds = deviceIds || [];
                  if (e.target.checked) {
                    onChange("device_ids", [...currentIds, device.value]);
                  } else {
                    onChange("device_ids", currentIds.filter((id) => id !== device.value));
                  }
                }}
                className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                disabled={disabled}
              />
              <span className="text-[12px] text-[#072929] font-medium">{device.label}</span>
            </label>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#556179]">
        Select devices to target. If none selected, ads will show on all devices.
      </p>
    </div>
  );
};
