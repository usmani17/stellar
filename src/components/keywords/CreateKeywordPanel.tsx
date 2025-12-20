import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface KeywordInput {
  adGroupId: string;
  keywordText: string;
  matchType: "BROAD" | "PHRASE" | "EXACT";
  bid: number;
  state: "ENABLED" | "PAUSED";
}

interface CreateKeywordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (keywords: KeywordInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
}

const MATCH_TYPE_OPTIONS = [
  { value: "BROAD", label: "BROAD" },
  { value: "PHRASE", label: "PHRASE" },
  { value: "EXACT", label: "EXACT" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

export const CreateKeywordPanel: React.FC<CreateKeywordPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignId,
}) => {
  const [currentKeyword, setCurrentKeyword] = useState<KeywordInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    keywordText: "",
    matchType: "BROAD",
    bid: 0.1,
    state: "ENABLED",
  });
  const [addedKeywords, setAddedKeywords] = useState<KeywordInput[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof KeywordInput, string>>>({});

  const handleChange = (field: keyof KeywordInput, value: string | number) => {
    setCurrentKeyword((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof KeywordInput, string>> = {};

    if (!currentKeyword.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    if (!currentKeyword.keywordText.trim()) {
      newErrors.keywordText = "Keyword text is required";
    }

    if (currentKeyword.bid <= 0) {
      newErrors.bid = "Bid must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddKeyword = () => {
    if (!validate()) {
      return;
    }

    // Add keyword to the list
    setAddedKeywords((prev) => [...prev, { ...currentKeyword }]);

    // Reset form for next keyword
    setCurrentKeyword({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      keywordText: "",
      matchType: "BROAD",
      bid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleRemoveKeyword = (index: number) => {
    setAddedKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (addedKeywords.length === 0) {
      alert("Please add at least one keyword before submitting.");
      return;
    }

    onSubmit(addedKeywords);
    // Reset everything
    setAddedKeywords([]);
    setCurrentKeyword({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      keywordText: "",
      matchType: "BROAD",
      bid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleCancel = () => {
    setAddedKeywords([]);
    setCurrentKeyword({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      keywordText: "",
      matchType: "BROAD",
      bid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
    onClose();
  };

  const getAdGroupName = (adGroupId: string) => {
    const adgroup = adgroups.find((ag) => ag.adGroupId === adGroupId);
    return adgroup?.name || adGroupId;
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Keywords
        </h2>

        {/* Single line inputs */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Ad Group Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Ad Group *
            </label>
            <Dropdown<string>
              options={adgroups.map((ag) => ({
                value: ag.adGroupId,
                label: ag.name,
              }))}
              value={currentKeyword.adGroupId}
              onChange={(value) => handleChange("adGroupId", value)}
              placeholder="Select ad group"
              buttonClassName="w-full"
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">{errors.adGroupId}</p>
            )}
          </div>

          {/* Keyword Text */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Keyword Text *
            </label>
            <input
              type="text"
              value={currentKeyword.keywordText}
              onChange={(e) => handleChange("keywordText", e.target.value)}
              placeholder="Enter keyword"
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.keywordText ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.keywordText && (
              <p className="text-[10px] text-red-500 mt-1">{errors.keywordText}</p>
            )}
          </div>

          {/* Match Type */}
          <div className="w-[140px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Match Type *
            </label>
            <Dropdown<string>
              options={MATCH_TYPE_OPTIONS}
              value={currentKeyword.matchType}
              onChange={(value) => handleChange("matchType", value as KeywordInput["matchType"])}
              placeholder="Select match type"
              buttonClassName="w-full"
            />
          </div>

          {/* Bid */}
          <div className="w-[120px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Bid *
            </label>
            <input
              type="number"
              value={currentKeyword.bid || ""}
              onChange={(e) =>
                handleChange("bid", parseFloat(e.target.value) || 0)
              }
              placeholder="0.10"
              min="0"
              step="0.01"
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.bid ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.bid && (
              <p className="text-[10px] text-red-500 mt-1">{errors.bid}</p>
            )}
          </div>

          {/* State */}
          <div className="w-[140px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              State *
            </label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentKeyword.state}
              onChange={(value) => handleChange("state", value as KeywordInput["state"])}
              placeholder="Select state"
              buttonClassName="w-full"
            />
          </div>

          {/* Add Keyword Button */}
          <div className="w-[120px]">
            <button
              type="button"
              onClick={handleAddKeyword}
              className="w-full px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors"
            >
              Add Keyword
            </button>
          </div>
        </div>
      </div>

      {/* Keywords Table */}
      {addedKeywords.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Keywords ({addedKeywords.length})
          </h3>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Ad Group
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Keyword Text
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Match Type
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Bid
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      State
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addedKeywords.map((keyword, index) => {
                    const isLastRow = index === addedKeywords.length - 1;
                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {getAdGroupName(keyword.adGroupId)}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {keyword.keywordText}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {keyword.matchType}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            ${keyword.bid.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {keyword.state}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(index)}
                            className="text-red-500 hover:text-red-700 text-[13.3px] font-semibold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={addedKeywords.length === 0}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add All Keywords
        </button>
      </div>
    </div>
  );
};

