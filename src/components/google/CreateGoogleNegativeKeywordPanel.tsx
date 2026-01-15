import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface NegativeKeywordInput {
  keyword_text: string;
  match_type: "BROAD" | "PHRASE" | "EXACT";
}

interface CreateGoogleNegativeKeywordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    negativeKeywords: NegativeKeywordInput[];
    level: "campaign" | "adgroup";
    adGroupId?: string;
  }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  adGroups?: Array<{ id: number; name: string }>;
}

export const CreateGoogleNegativeKeywordPanel: React.FC<CreateGoogleNegativeKeywordPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  error = null,
  adGroups = [],
}) => {
  const [keywords, setKeywords] = useState<NegativeKeywordInput[]>([
    { keyword_text: "", match_type: "BROAD" },
  ]);
  const [level, setLevel] = useState<"campaign" | "adgroup">("campaign");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleKeywordChange = (index: number, field: keyof NegativeKeywordInput, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { ...newKeywords[index], [field]: value };
    setKeywords(newKeywords);
  };

  const handleAddKeyword = () => {
    setKeywords([...keywords, { keyword_text: "", match_type: "BROAD" }]);
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (keywords.some((k) => !k.keyword_text.trim())) {
      alert("Please fill in all keyword text fields");
      return;
    }

    if (level === "adgroup" && !selectedAdGroupId) {
      alert("Please select an ad group");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        negativeKeywords: keywords,
        level,
        adGroupId: level === "adgroup" ? selectedAdGroupId : undefined,
      });
      setKeywords([{ keyword_text: "", match_type: "BROAD" }]);
      setLevel("campaign");
      setSelectedAdGroupId("");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Negative Keywords
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Level Selection */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Select Level
          </h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={level === "campaign"}
                onChange={() => {
                  setLevel("campaign");
                  setSelectedAdGroupId("");
                }}
              />
              <span className="text-[14px]">Campaign Level</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={level === "adgroup"}
                onChange={() => setLevel("adgroup")}
              />
              <span className="text-[14px]">Ad Group Level</span>
            </label>
          </div>
        </div>

        {/* Ad Group Selection */}
        {level === "adgroup" && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Select Ad Group
            </h3>
            <select
              value={selectedAdGroupId}
              onChange={(e) => setSelectedAdGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px]"
            >
              <option value="">-- Select an Ad Group --</option>
              {adGroups.map((ag) => (
                <option key={ag.id} value={ag.id.toString()}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Keywords */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[14px] font-semibold text-[#072929]">Negative Keywords</h3>
            <button
              onClick={handleAddKeyword}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-[12px] font-medium hover:bg-blue-100"
            >
              + Add Keyword
            </button>
          </div>

          <div className="space-y-3">
            {keywords.map((keyword, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter keyword"
                  value={keyword.keyword_text}
                  onChange={(e) => handleKeywordChange(index, "keyword_text", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[14px]"
                />
                <select
                  value={keyword.match_type}
                  onChange={(e) => handleKeywordChange(index, "match_type", e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-[14px]"
                >
                  <option value="BROAD">Broad</option>
                  <option value="PHRASE">Phrase</option>
                  <option value="EXACT">Exact</option>
                </select>
                {keywords.length > 1 && (
                  <button
                    onClick={() => handleRemoveKeyword(index)}
                    className="px-3 py-2 border border-red-300 text-red-700 rounded-lg text-[12px] hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with Actions */}
      <div className="p-4 bg-white flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={submitting || loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-[14px] font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-[14px] font-medium hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Negative Keywords"}
        </button>
      </div>
    </div>
  );
};
