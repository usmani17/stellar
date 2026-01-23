import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface SearchEntityInput {
  adgroup_id?: number; // Optional: use existing adgroup
  adgroup?: {
    name: string;
    cpc_bid?: number;
  };
  ad?: {
    headlines: string[];
    descriptions: string[];
    final_url?: string;
  };
  keywords?: Array<{
    text: string;
    match_type: "EXACT" | "PHRASE" | "BROAD";
    cpc_bid?: number;
  }>;
}

interface CreateGoogleSearchEntitiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: SearchEntityInput) => void;
  campaignId: string;
  loading?: boolean;
  submitError?: string | null;
}

const MATCH_TYPE_OPTIONS = [
  { value: "BROAD", label: "BROAD" },
  { value: "PHRASE", label: "PHRASE" },
  { value: "EXACT", label: "EXACT" },
];

export const CreateGoogleSearchEntitiesPanel: React.FC<
  CreateGoogleSearchEntitiesPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId: _campaignId,
  loading = false,
  submitError = null,
}) => {
    const generateDefaultAdGroupName = (): string => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
      const dateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
      return `Search Ad Group - ${dateTime}`;
    };

    const [adgroupName, setAdgroupName] = useState(generateDefaultAdGroupName());
    const [adgroupBid, setAdgroupBid] = useState<number | undefined>(undefined);
    const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
    const [descriptions, setDescriptions] = useState<string[]>(["", ""]);
    const [finalUrl, setFinalUrl] = useState<string>("");
    const [keywords, setKeywords] = useState<
      Array<{ text: string; match_type: "EXACT" | "PHRASE" | "BROAD"; cpc_bid?: number }>
    >([]);
    const [currentKeyword, setCurrentKeyword] = useState({
      text: "",
      match_type: "BROAD" as "EXACT" | "PHRASE" | "BROAD",
      cpc_bid: undefined as number | undefined,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!adgroupName.trim()) {
        newErrors.adgroupName = "Ad Group name is required";
      }

      const validHeadlines = headlines.filter((h) => h.trim()).length;
      if (validHeadlines < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      }
      if (validHeadlines > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      const validDescriptions = descriptions.filter((d) => d.trim()).length;
      if (validDescriptions < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      }
      if (validDescriptions > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleAddHeadline = () => {
      if (headlines.length < 15) {
        setHeadlines([...headlines, ""]);
      }
    };

    const handleRemoveHeadline = (index: number) => {
      if (headlines.length > 3) {
        setHeadlines(headlines.filter((_, i) => i !== index));
      }
    };

    const handleAddDescription = () => {
      if (descriptions.length < 4) {
        setDescriptions([...descriptions, ""]);
      }
    };

    const handleRemoveDescription = (index: number) => {
      if (descriptions.length > 2) {
        setDescriptions(descriptions.filter((_, i) => i !== index));
      }
    };

    const handleAddKeyword = () => {
      if (!currentKeyword.text.trim()) {
        setErrors((prev) => ({ ...prev, keywordText: "Keyword text is required" }));
        return;
      }

      setKeywords([...keywords, { ...currentKeyword }]);
      setCurrentKeyword({ text: "", match_type: "BROAD", cpc_bid: undefined });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.keywordText;
        return newErrors;
      });
    };

    const handleRemoveKeyword = (index: number) => {
      setKeywords(keywords.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
      if (!validate()) {
        return;
      }

      const filteredHeadlines = headlines.filter((h) => h.trim());
      const filteredDescriptions = descriptions.filter((d) => d.trim());

      const entity: SearchEntityInput = {};

      // Include adgroup_id if provided, otherwise include adgroup data if name provided
      // Note: This panel always creates new adgroup, so we don't support adgroup_id here
      // But the interface supports it for other use cases
      if (adgroupName.trim()) {
        entity.adgroup = {
          name: adgroupName.trim(),
          ...(adgroupBid !== undefined && adgroupBid > 0 && { cpc_bid: adgroupBid }),
        };
      }

      // Only include ad if there are at least 3 headlines and 2 descriptions (minimum required)
      // This ensures we only send ad data when user has filled in meaningful content
      if (filteredHeadlines.length >= 3 && filteredDescriptions.length >= 2) {
        entity.ad = {
          headlines: filteredHeadlines,
          descriptions: filteredDescriptions,
          ...(finalUrl.trim() && { final_url: finalUrl.trim() }),
        };
      }

      // Only include keywords if array has items
      if (keywords.length > 0) {
        entity.keywords = keywords;
      }

      onSubmit(entity);
    };

    const handleCancel = () => {
      setAdgroupName(generateDefaultAdGroupName());
      setAdgroupBid(undefined);
      setHeadlines(["", "", ""]);
      setDescriptions(["", ""]);
      setFinalUrl("");
      setKeywords([]);
      setCurrentKeyword({ text: "", match_type: "BROAD", cpc_bid: undefined });
      setErrors({});
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
        {/* Form */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
            Create Ad Group, Ad & Keywords
          </h2>

          {/* Ad Group Section */}
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Ad Group
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Ad Group Name *
                </label>
                <input
                  type="text"
                  value={adgroupName}
                  onChange={(e) => {
                    setAdgroupName(e.target.value);
                    if (errors.adgroupName) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.adgroupName;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter ad group name"
                  className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.adgroupName ? "border-red-500" : "border-gray-200"
                    }`}
                />
                {errors.adgroupName && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.adgroupName}
                  </p>
                )}
              </div>
              <div className="w-[140px]">
                <label className="form-label-small">
                  CPC Bid (Optional)
                </label>
                <input
                  type="number"
                  value={adgroupBid || ""}
                  onChange={(e) =>
                    setAdgroupBid(
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder="0.10"
                  min="0"
                  step="0.01"
                  className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              </div>
            </div>
          </div>

          {/* Ad Section */}
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Responsive Search Ad
            </h3>
            <div className="mb-3">
              <label className="form-label-small">
                Headlines * (3-15 required)
              </label>
              <div className="space-y-2">
                {headlines.map((headline, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => {
                        const newHeadlines = [...headlines];
                        newHeadlines[index] = e.target.value;
                        setHeadlines(newHeadlines);
                        if (errors.headlines) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.headlines;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder={`Headline ${index + 1}`}
                      maxLength={30}
                      className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.headlines ? "border-red-500" : "border-gray-200"
                        }`}
                    />
                    {headlines.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHeadline(index)}
                        className="text-red-500 hover:text-red-700 transition-colors px-2"
                        title="Remove"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {headlines.length < 15 && (
                <button
                  type="button"
                  onClick={handleAddHeadline}
                  className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
                >
                  + Add Headline
                </button>
              )}
              {errors.headlines && (
                <p className="text-[10px] text-red-500 mt-1">{errors.headlines}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label-small">
                Descriptions * (2-4 required)
              </label>
              <div className="space-y-2">
                {descriptions.map((description, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <textarea
                      value={description}
                      onChange={(e) => {
                        const newDescriptions = [...descriptions];
                        newDescriptions[index] = e.target.value;
                        setDescriptions(newDescriptions);
                        if (errors.descriptions) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.descriptions;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder={`Description ${index + 1}`}
                      maxLength={90}
                      rows={2}
                      className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.descriptions ? "border-red-500" : "border-gray-200"
                        }`}
                    />
                    {descriptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDescription(index)}
                        className="text-red-500 hover:text-red-700 transition-colors px-2"
                        title="Remove"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {descriptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddDescription}
                  className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
                >
                  + Add Description
                </button>
              )}
              {errors.descriptions && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.descriptions}
                </p>
              )}
            </div>

            <div className="w-full">
              <label className="form-label-small">
                Final URL (Optional)
              </label>
              <input
                type="url"
                value={finalUrl}
                onChange={(e) => setFinalUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
          </div>

          {/* Keywords Section */}
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Keywords (Optional)
            </h3>
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Keyword Text
                </label>
                <input
                  type="text"
                  value={currentKeyword.text}
                  onChange={(e) => {
                    setCurrentKeyword({ ...currentKeyword, text: e.target.value });
                    if (errors.keywordText) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.keywordText;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter keyword"
                  className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.keywordText ? "border-red-500" : "border-gray-200"
                    }`}
                />
                {errors.keywordText && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.keywordText}
                  </p>
                )}
              </div>
              <div className="w-[140px]">
                <label className="form-label-small">
                  Match Type
                </label>
                <Dropdown<string>
                  options={MATCH_TYPE_OPTIONS}
                  value={currentKeyword.match_type}
                  onChange={(value) =>
                    setCurrentKeyword({
                      ...currentKeyword,
                      match_type: value as "EXACT" | "PHRASE" | "BROAD",
                    })
                  }
                  placeholder="Select match type"
                  buttonClassName="w-full"
                />
              </div>
              <div className="w-[120px]">
                <label className="form-label-small">
                  CPC Bid (Optional)
                </label>
                <input
                  type="number"
                  value={currentKeyword.cpc_bid || ""}
                  onChange={(e) =>
                    setCurrentKeyword({
                      ...currentKeyword,
                      cpc_bid: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="0.10"
                  min="0"
                  step="0.01"
                  className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              </div>
              <div className="w-[120px]">
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="w-full px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
                >
                  Add Keyword
                </button>
              </div>
            </div>

            {/* Keywords Table */}
            {keywords.length > 0 && (
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
                          CPC Bid
                        </th>
                        <th className="table-header">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((keyword, index) => (
                        <tr
                          key={index}
                          className={`${index !== keywords.length - 1
                              ? "border-b border-[#e8e8e3]"
                              : ""
                            } hover:bg-gray-50 transition-colors`}
                        >
                          <td className="table-cell table-text">
                            {keyword.text}
                          </td>
                          <td className="table-cell table-text">
                            {keyword.match_type}
                          </td>
                          <td className="table-cell table-text">
                            {keyword.cpc_bid
                              ? `$${keyword.cpc_bid.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="table-cell">
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Remove"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
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
            onClick={handleCancel}
            className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Entities"}
          </button>
        </div>
      </div>
    );
  };

