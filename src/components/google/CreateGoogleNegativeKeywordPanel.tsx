import React, { useState, useMemo, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { Button } from "../ui";
import type { GoogleAdGroup } from "../../pages/google/components/tabs/GoogleTypes";

export interface NegativeKeywordInput {
  text: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
}

interface CreateGoogleNegativeKeywordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { negativeKeywords: NegativeKeywordInput[]; level: "campaign" | "adgroup"; adGroupId?: string; save_as_draft?: boolean }) => void;
  campaignId: string;
  accountId: string;
  campaignType?: string;
  adgroups?: GoogleAdGroup[];
  loading?: boolean;
  submitError?: string | null;
  createdNegativeKeywords?: any[];
  failedNegativeKeywords?: any[];
}

const MATCH_TYPE_OPTIONS = [
  { value: "BROAD", label: "BROAD" },
  { value: "PHRASE", label: "PHRASE" },
  { value: "EXACT", label: "EXACT" },
];

const LEVEL_OPTIONS = [
  { value: "campaign", label: "Campaign Level" },
  { value: "adgroup", label: "Ad Group Level" },
];

export const CreateGoogleNegativeKeywordPanel: React.FC<
  CreateGoogleNegativeKeywordPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId: _campaignId,
  accountId: _accountId,
  campaignType,
  adgroups = [],
  loading = false,
  submitError = null,
  createdNegativeKeywords: _createdNegativeKeywords = [],
  failedNegativeKeywords: _failedNegativeKeywords = [],
}) => {
  // Default to campaign level for negative keywords
  const [level, setLevel] = useState<"campaign" | "adgroup">("campaign");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [negativeKeywords, setNegativeKeywords] = useState<
    Array<{ text: string; match_type: "EXACT" | "PHRASE" | "BROAD" }>
  >([]);
  const [currentKeyword, setCurrentKeyword] = useState({
    text: "",
    match_type: "BROAD" as "EXACT" | "PHRASE" | "BROAD",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if this is a Performance Max campaign
  const isPerformanceMax = campaignType?.toUpperCase() === "PERFORMANCE_MAX";

  // Ensure level is always "campaign" for Performance Max campaigns
  useEffect(() => {
    if (isPerformanceMax) {
      setLevel("campaign");
      setSelectedAdGroupId(""); // Clear ad group selection
    }
  }, [isPerformanceMax, isOpen]);

  // Create ad group options for dropdown
  const adGroupOptions = useMemo(() => {
    if (!adgroups || adgroups.length === 0) {
      return [];
    }
    return adgroups
      .filter((adgroup) => adgroup.status !== "REMOVED" && adgroup.status !== "Removed")
      .map((adgroup) => ({
        value: adgroup.adgroup_id.toString(),
        label: adgroup.adgroup_name || adgroup.name || `Ad Group ${adgroup.adgroup_id}`,
      }));
  }, [adgroups]);

  const addKeyword = () => {
    if (!currentKeyword.text.trim()) {
      setErrors({ keyword: "Keyword text is required" });
      return;
    }

    setErrors({});
    setNegativeKeywords([...negativeKeywords, { ...currentKeyword }]);
    setCurrentKeyword({ text: "", match_type: "BROAD" });
  };

  const removeKeyword = (index: number) => {
    setNegativeKeywords(negativeKeywords.filter((_, i) => i !== index));
  };

  const handleDummyFill = () => {
    setNegativeKeywords([
      { text: "best products online", match_type: "BROAD" },
      { text: "shop now and save", match_type: "PHRASE" },
      { text: "quality products", match_type: "EXACT" },
      { text: "free shipping", match_type: "BROAD" },
      { text: "limited time offer", match_type: "PHRASE" },
    ]);
    setErrors({}); // Clear any existing errors
  };

  const handleSubmit = (asDraft?: boolean) => {
    if (negativeKeywords.length === 0) {
      setErrors({ keywords: "At least one negative keyword is required" });
      return;
    }

    if (level === "adgroup" && !selectedAdGroupId) {
      setErrors({ adGroupId: "Ad Group ID is required for ad group-level negative keywords" });
      return;
    }

    setErrors({});

    const keywordInputs: NegativeKeywordInput[] = negativeKeywords.map((kw) => ({
      text: kw.text,
      matchType: kw.match_type,
    }));

    onSubmit({
      negativeKeywords: keywordInputs,
      level,
      adGroupId: level === "adgroup" ? selectedAdGroupId : undefined,
      save_as_draft: asDraft ?? false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#072929]">Create Negative Keywords</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11.2px]">
            {submitError}
          </div>
        )}

        {/* Level Selection - Hidden for Performance Max campaigns */}
        {!isPerformanceMax && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Level
            </h3>
            <Dropdown
              options={LEVEL_OPTIONS}
              value={level}
              onChange={(val) => setLevel(val as "campaign" | "adgroup")}
              buttonClassName="w-full"
            />
          </div>
        )}

        {/* Ad Group Selection (only for ad group level) */}
        {level === "adgroup" && (
          <div className="mb-6">
            <label className="form-label-small">
              Select Ad Group *
            </label>
            <Dropdown<string>
              options={adGroupOptions}
              value={selectedAdGroupId}
              onChange={(value) => {
                setSelectedAdGroupId(value);
                if (errors.adGroupId) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.adGroupId;
                    return newErrors;
                  });
                }
              }}
              placeholder={adgroups && adgroups.length > 0 ? "Search and select an ad group" : "No ad groups available"}
              buttonClassName="w-full"
              searchable={true}
              searchPlaceholder="Search adgroups..."
              emptyMessage={adgroups && adgroups.length > 0 ? "No adgroups found. Try a different search." : "No ad groups available."}
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.adGroupId}
              </p>
            )}
            {adgroups && adgroups.length === 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                No ad groups available. Please create an ad group first.
              </p>
            )}
          </div>
        )}

        {/* Negative Keywords Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[#072929]">
              Negative Keywords
            </h3>
            <button
              type="button"
              onClick={handleDummyFill}
              className="ml-auto px-3 py-1 text-[10px] text-[#136D6D] bg-[#e6f2f2] rounded-md hover:bg-[#d9ecec] transition-colors"
            >
              Fill Dummy Values
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label-small">
                Keyword Text *
              </label>
              <input
                type="text"
                value={currentKeyword.text}
                onChange={(e) => setCurrentKeyword({ ...currentKeyword, text: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Enter keyword text"
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.keyword ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.keyword && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.keyword}
                </p>
              )}
            </div>
            <div className="w-[140px]">
              <label className="form-label-small">
                Match Type *
              </label>
              <Dropdown
                options={MATCH_TYPE_OPTIONS}
                value={currentKeyword.match_type}
                onChange={(val) => setCurrentKeyword({ ...currentKeyword, match_type: val as "EXACT" | "PHRASE" | "BROAD" })}
                buttonClassName="w-full text-[11.2px]"
              />
            </div>
            <div className="w-[80px]">
              <Button
                onClick={addKeyword}
                className="create-entity-button w-full text-[11.2px] justify-center"
              >
                Add
              </Button>
            </div>
          </div>

          {errors.keywords && (
            <p className="text-[10px] text-red-500 mb-3">{errors.keywords}</p>
          )}

          {/* Negative Keywords Table */}
          {negativeKeywords.length > 0 && (
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e3]">
                      <th className="table-header">
                        Keyword Text
                      </th>
                      <th className="table-header">
                        Match Type
                      </th>
                      <th className="table-header">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {negativeKeywords.map((kw, index) => (
                      <tr
                        key={index}
                        className={`${
                          index !== negativeKeywords.length - 1
                            ? "border-b border-[#e8e8e3]"
                            : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="table-cell table-text">
                          {kw.text}
                        </td>
                        <td className="table-cell table-text">
                          {kw.match_type}
                        </td>
                        <td className="table-cell">
                          <button
                            type="button"
                            onClick={() => removeKeyword(index)}
                            className="text-red-500 hover:text-red-700 text-[13.3px]"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* Error Message */}
      {submitError && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <p className="text-[12px] text-red-600">{submitError}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={loading || negativeKeywords.length === 0}
          className="cancel-button font-semibold text-[11.2px] flex items-center gap-2 px-4 py-2"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={loading || negativeKeywords.length === 0}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Negative Keywords"}
        </button>
      </div>
      </div>
    </div>
  );
};
