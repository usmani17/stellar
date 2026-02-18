// Google Tracking Template Form Component
// Reusable component for tracking template, final URL suffix, and custom parameters
// Can be used in campaigns and ad groups

import React, { useMemo } from "react";

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
  // Validate URL custom parameters
  const validateUrlCustomParameters = (): string | null => {
    const params = urlCustomParameters;
    if (!params || params.length === 0) return null;

    // Check count (max 8)
    if (params.length > 8) {
      return `Maximum 8 custom parameters allowed (found ${params.length})`;
    }

    // Check for duplicates using Set
    const keySet = new Set<string>();
    for (const param of params) {
      const key = param.key?.trim();
      if (key) {
        if (keySet.has(key.toLowerCase())) {
          return `Duplicate parameter key: "${key}" (keys are case-insensitive)`;
        }
        keySet.add(key.toLowerCase());
      }
    }

    // Validate each parameter
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const key = param.key?.trim() || "";
      const value = param.value?.trim() || "";

      // Skip empty entries
      if (!key && !value) continue;

      // If one exists, both should exist
      if (!key || !value) {
        return `Parameter ${i + 1}: Both key and value are required`;
      }

      // Validate key length (max 16)
      if (key.length > 16) {
        return `Parameter "${key}": Key length must be ≤ 16 characters (current: ${key.length})`;
      }

      // Validate key format (alphanumeric only)
      if (!/^[a-zA-Z0-9]+$/.test(key)) {
        return `Parameter "${key}": Key must contain only alphanumeric characters (a-z, A-Z, 0-9)`;
      }

      // Validate value length (max 200)
      if (value.length > 200) {
        return `Parameter "${key}": Value length must be ≤ 200 characters (current: ${value.length})`;
      }
    }

    // Optional: Validate parameter references in tracking_template or final_url
    const urlContent = (trackingUrlTemplate + finalUrlSuffix).toLowerCase();

    // Extract declared parameter keys
    const declaredKeys = new Set<string>();
    for (const param of params) {
      const key = param.key?.trim();
      if (key) declaredKeys.add(`_${key.toLowerCase()}`);
    }

    // Check for references in URL fields (pattern: {_paramkey})
    const referenceRegex = /\{_([a-zA-Z0-9]+)\}/gi;
    let match;
    const foundReferences = new Set<string>();
    while ((match = referenceRegex.exec(urlContent)) !== null) {
      foundReferences.add(`_${match[1].toLowerCase()}`);
    }

    // Warn about undeclared references (but don't fail)
    const undeclaredRefs = Array.from(foundReferences).filter(ref => !declaredKeys.has(ref));
    if (undeclaredRefs.length > 0) {
      // This is just informational; we log but don't prevent submission
      console.warn(`Unused parameter references found: ${undeclaredRefs.join(", ")}. These won't be replaced.`);
    }

    return null;
  };

  // Memoize validation error
  const validationError = useMemo(() => validateUrlCustomParameters(), [urlCustomParameters, trackingUrlTemplate, finalUrlSuffix]);

  // Get individual field validation errors
  const getFieldValidationErrors = (index: number) => {
    const param = urlCustomParameters[index];
    if (!param) return { keyError: "", valueError: "" };

    const key = param.key?.trim() || "";
    const value = param.value?.trim() || "";

    let keyError = "";
    let valueError = "";

    // Skip validation for empty entries
    if (!key && !value) {
      return { keyError, valueError };
    }

    // Validate key
    if (!key || !value) {
      if (!key) keyError = "Key required";
      if (!value) valueError = "Value required";
    } else {
      if (key.length > 16) keyError = `Max 16 chars (${key.length})`;
      if (!/^[a-zA-Z0-9]+$/.test(key)) keyError = "Alphanumeric only";
      if (value.length > 200) valueError = `Max 200 chars (${value.length})`;
    }

    // Check for duplicates
    if (key && key.trim()) {
      const keyLower = key.toLowerCase();
      for (let i = 0; i < urlCustomParameters.length; i++) {
        if (i !== index) {
          const otherKey = urlCustomParameters[i].key?.trim();
          if (otherKey && otherKey.toLowerCase() === keyLower) {
            keyError = "Duplicate key";
            break;
          }
        }
      }
    }

    return { keyError, valueError };
  };

  return (
    <>
      {showTitle && (
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          {title}
        </h3>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
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
            <label className="form-label">
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
          <label className="form-label">
            Custom parameters (optional)
            <span className="text-[10px] text-[#556179] font-normal ml-2">
              ({urlCustomParameters?.filter((p) => p.key?.trim() && p.value?.trim()).length || 0}/8)
            </span>
          </label>
          {validationError && (
            <p className="text-[10px] text-red-500 mb-2 p-2 bg-red-50 rounded border border-red-200">
              {validationError}
            </p>
          )}
          {urlCustomParameters && urlCustomParameters.length > 0 ? (
            <div className="space-y-2">
              {urlCustomParameters.map((param, index) => {
                const { keyError, valueError } = getFieldValidationErrors(index);
                return (
                  <div
                    key={index}
                    className={`grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 items-start ${
                      keyError || valueError ? "p-2 bg-red-50 rounded border border-red-200" : ""
                    }`}
                  >
                    <div>
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => {
                          const newParams = [...urlCustomParameters];
                          newParams[index] = { ...newParams[index], key: e.target.value };
                          onCustomParametersChange(newParams);
                        }}
                        className={`campaign-input w-full ${keyError ? "border-red-500" : ""}`}
                        placeholder="utm_source"
                      />
                      {keyError && <p className="text-[9px] text-red-600 mt-0.5">{keyError}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => {
                          const newParams = [...urlCustomParameters];
                          newParams[index] = { ...newParams[index], value: e.target.value };
                          onCustomParametersChange(newParams);
                        }}
                        className={`campaign-input w-full ${valueError ? "border-red-500" : ""}`}
                        placeholder="google"
                      />
                      {valueError && <p className="text-[9px] text-red-600 mt-0.5">{valueError}</p>}
                    </div>
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
                );
              })}
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
              if (current.length < 8) {
                onCustomParametersChange([...current, { key: "", value: "" }]);
              }
            }}
            disabled={(urlCustomParameters?.filter((p) => p.key?.trim() && p.value?.trim()).length || 0) >= 8}
            className="edit-button mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add parameter
          </button>
          <p className="text-[10px] text-[#556179] mt-1">
            Max 8 parameters. Keys: alphanumeric only, ≤16 chars. Values: ≤200 chars. No duplicate keys.
          </p>
        </div>
      </div>
    </>
  );
};
