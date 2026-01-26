// Google Language Targeting Form Component
// Reusable component for language targeting
// Used by SEARCH and PERFORMANCE_MAX campaigns

import React from "react";
import { Dropdown } from "../../ui/Dropdown";

export interface GoogleLanguageTargetingFormProps {
  languageIds?: string[];
  languageOptions: Array<{ value: string; label: string; id: string }>;
  loadingLanguages: boolean;
  onLanguageIdsChange: (ids: string[] | undefined) => void;
  errors?: {
    language_ids?: string;
  };
  showTitle?: boolean; // Whether to show "Language Targeting" title (default: true)
}

export const GoogleLanguageTargetingForm: React.FC<GoogleLanguageTargetingFormProps> = ({
  languageIds = [],
  languageOptions,
  loadingLanguages,
  onLanguageIdsChange,
  errors,
  showTitle = true,
}) => {
  return (
    <div className="mt-6">
      {showTitle && (
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Language Targeting
        </h3>
      )}

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
        <div>
        <label className="form-label">
          Target Languages
        </label>
        {errors?.language_ids && (
          <p className="text-[10px] text-red-500 -mt-1 mb-2">
            {errors.language_ids}
          </p>
        )}
        <Dropdown<string>
          options={languageOptions}
          value=""
          onChange={(value) => {
            if (!languageIds.includes(value)) {
              onLanguageIdsChange([...languageIds, value]);
            }
          }}
          placeholder={
            loadingLanguages
              ? "Loading languages..."
              : languageOptions.length === 0
              ? "No languages found"
              : "Select languages to target"
          }
          buttonClassName="edit-button w-full"
          searchable={true}
          searchPlaceholder="Search languages..."
          emptyMessage={
            loadingLanguages
              ? "Loading..."
              : "Start typing to search for languages"
          }
          disabled={loadingLanguages}
        />
        {languageIds && languageIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {languageIds.map((langId) => {
              const language = languageOptions.find(l => l.value === langId);
              return (
                <span
                  key={langId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                >
                  {language?.label || langId}
                  <button
                    type="button"
                    onClick={() => {
                      const newIds = languageIds.filter(id => id !== langId);
                      onLanguageIdsChange(newIds.length > 0 ? newIds : undefined);
                    }}
                    className="hover:text-red-200"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
