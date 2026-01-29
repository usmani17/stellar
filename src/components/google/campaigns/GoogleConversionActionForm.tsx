// Google Conversion Action Form Component
// Reusable component for conversion action selection
// Used by SEARCH campaigns

import React from "react";

export interface GoogleConversionActionFormProps {
  conversionActionIds?: string[];
  selectedConversionActions?: Array<{ id: string; name: string }>;
  onConversionActionIdsChange: (ids: string[] | undefined) => void;
  onSelectClick: () => void;
  errors?: {
    conversion_action_ids?: string;
  };
  showTitle?: boolean; // Whether to show "Conversion Actions" title (default: true)
}

export const GoogleConversionActionForm: React.FC<GoogleConversionActionFormProps> = ({
  conversionActionIds = [],
  selectedConversionActions = [],
  onConversionActionIdsChange,
  onSelectClick,
  errors,
  showTitle = true,
}) => {
  return (
    <>
      {showTitle && (
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Conversion Actions
        </h3>
      )}

      <div>
        <div>
          <label className="form-label">
            Conversion Actions (Optional)
          </label>
          {errors?.conversion_action_ids && (
            <p className="text-[10px] text-red-500 -mt-1 mb-2">
              {errors.conversion_action_ids}
            </p>
          )}
          <button
            type="button"
            onClick={onSelectClick}
            className="edit-button w-full text-left"
          >
            {conversionActionIds.length === 0
              ? "Select conversion actions to optimize for"
              : `${conversionActionIds.length} conversion action(s) selected`}
          </button>
          {conversionActionIds && conversionActionIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedConversionActions.map((ca) => (
                <span
                  key={ca.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                >
                  {ca.name}
                  <button
                    type="button"
                    onClick={() => {
                      const newIds = conversionActionIds.filter(id => id !== ca.id);
                      onConversionActionIdsChange(newIds.length > 0 ? newIds : undefined);
                    }}
                    className="hover:text-red-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[#556179] mt-2">
            Select which conversion actions to optimize for this campaign. Conversion actions are account-level and can be used across multiple campaigns.
          </p>
        </div>
      </div>
    </>
  );
};
