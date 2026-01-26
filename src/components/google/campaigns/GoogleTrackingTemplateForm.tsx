// Google Tracking Template Form Component
// Reusable component for tracking template, final URL suffix, and custom parameters
// Can be used in campaigns and ad groups

import React from "react";

export interface GoogleTrackingTemplateFormProps {
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  urlCustomParameters?: Array<{ key: string; value: string }>;
  onTrackingUrlTemplateChange: (value: string) => void;
  onFinalUrlSuffixChange: (value: string) => void;
  onCustomParametersChange: (params: Array<{ key: string; value: string }> | undefined) => void;
  title?: string; // Optional title (default: "URL options")
  showTitle?: boolean; // Whether to show title section (default: true)
}

export const GoogleTrackingTemplateForm: React.FC<GoogleTrackingTemplateFormProps> = ({
  trackingUrlTemplate = "",
  finalUrlSuffix = "",
  urlCustomParameters = [],
  onTrackingUrlTemplateChange,
  onFinalUrlSuffixChange,
  onCustomParametersChange,
  title = "URL options",
  showTitle = true,
}) => {
  return (
    <div className="mt-6">
      {showTitle && (
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          {title}
        </h3>
      )}

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Tracking template
          </label>
          <input
            type="text"
            value={trackingUrlTemplate}
            onChange={(e) => onTrackingUrlTemplateChange(e.target.value)}
            className="campaign-input w-full"
            placeholder="{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}"
          />
          <p className="text-[10px] text-[#556179] mt-1">
            Optional. Define a tracking URL that can include ValueTrack parameters.
          </p>
        </div>
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Final URL suffix
          </label>
          <input
            type="text"
            value={finalUrlSuffix}
            onChange={(e) => onFinalUrlSuffixChange(e.target.value)}
            className="campaign-input w-full"
            placeholder="utm_source=google&utm_medium=cpc&utm_campaign={campaignid}"
          />
          <p className="text-[10px] text-[#556179] mt-1">
            Optional. Appended to your landing page URL after any existing query string.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Custom parameters (optional)
        </label>
        {urlCustomParameters && urlCustomParameters.length > 0 ? (
          <div className="space-y-2">
            {urlCustomParameters.map((param, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 items-center"
              >
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) => {
                    const newParams = [...urlCustomParameters];
                    newParams[index] = { ...newParams[index], key: e.target.value };
                    onCustomParametersChange(newParams);
                  }}
                  className="campaign-input w-full"
                  placeholder="utm_source"
                />
                <input
                  type="text"
                  value={param.value}
                  onChange={(e) => {
                    const newParams = [...urlCustomParameters];
                    newParams[index] = { ...newParams[index], value: e.target.value };
                    onCustomParametersChange(newParams);
                  }}
                  className="campaign-input w-full"
                  placeholder="google"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newParams = urlCustomParameters.filter(
                      (_, i) => i !== index
                    );
                    onCustomParametersChange(newParams.length > 0 ? newParams : undefined);
                  }}
                  className="p-2 hover:bg-red-50 rounded transition-colors text-xs text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-[#556179] mb-2">
            Custom parameters are{" "}
            <span className="font-semibold">tracking-only</span> labels that you define
            (for example <code className="font-mono text-[10px]">campaign</code> or{" "}
            <code className="font-mono text-[10px]">source</code>) and then reference
            in your tracking template, like{" "}
            <code className="font-mono text-[10px]">
              {`{lpurl}?source_campaign={campaign}`}
            </code>
            . They <span className="font-semibold">do not change the landing page</span>
            — use the final URL / final URL suffix for content-modifying parameters
            such as product IDs. <span className="font-semibold">Note:</span> Parameter keys cannot start with underscores or contain special characters.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            const current = urlCustomParameters || [];
            onCustomParametersChange([...current, { key: "", value: "" }]);
          }}
          className="edit-button mt-1"
        >
          + Add parameter
        </button>
      </div>
      </div>
    </div>
  );
};
