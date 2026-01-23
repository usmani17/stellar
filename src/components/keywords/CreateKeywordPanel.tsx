import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface KeywordInput {
  adGroupId: string;
  keywordText: string;
  matchType: "BROAD" | "PHRASE" | "EXACT";
  bid: number;
  state: "ENABLED" | "PAUSED";
}

interface KeywordError {
  index: number;
  field: keyof KeywordInput;
  message: string;
}

interface CreatedKeyword {
  keywordId?: string;
  adGroupId: string;
  keywordText: string;
  matchType: "BROAD" | "PHRASE" | "EXACT";
  bid: number;
  state: "ENABLED" | "PAUSED";
  index?: number; // Original index in the submitted array
}

interface FailedKeyword {
  index: number;
  keyword: KeywordInput;
  errors: Array<{ field?: string; message: string }>;
}

interface CreateKeywordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (keywords: KeywordInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdKeywords?: CreatedKeyword[]; // Keywords that were successfully created
  failedCount?: number; // Number of keywords that failed
  failedKeywords?: FailedKeyword[]; // Keywords that failed with their errors
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
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdKeywords = [],
  failedCount = 0,
  failedKeywords = [],
}) => {
  const [currentKeyword, setCurrentKeyword] = useState<KeywordInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    keywordText: "",
    matchType: "BROAD",
    bid: 0.1,
    state: "ENABLED",
  });
  const [addedKeywords, setAddedKeywords] = useState<KeywordInput[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof KeywordInput, string>>
  >({});
  const [keywordErrors, setKeywordErrors] = useState<KeywordError[]>([]);

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
    console.log("handleSubmit called, addedKeywords:", addedKeywords);

    if (addedKeywords.length === 0) {
      alert("Please add at least one keyword before submitting.");
      return;
    }

    // Clear previous errors
    setKeywordErrors([]);
    console.log("Calling onSubmit with", addedKeywords.length, "keywords");
    onSubmit(addedKeywords);
    // Don't reset keywords here - let parent handle success/error
  };

  // Helper function to compute adjusted index based on created keywords
  const getAdjustedErrorIndex = (originalIndex: number): number => {
    if (createdKeywords.length === 0) return originalIndex;
    const createdIndices = new Set(
      createdKeywords
        .map((ck) => ck.index)
        .filter((idx) => idx !== undefined && idx !== null)
    );
    const removedBefore = Array.from(createdIndices).filter(
      (idx) => idx < originalIndex
    ).length;
    return originalIndex - removedBefore;
  };

  // Map failed keywords to errors - adjust indices immediately
  React.useEffect(() => {
    if (failedKeywords && failedKeywords.length > 0) {
      const newKeywordErrors: KeywordError[] = [];

      failedKeywords.forEach((failedKw) => {
        // Use the index from the backend response directly
        const originalIndex = failedKw.index;

        // Only process if index is valid
        if (originalIndex !== undefined && originalIndex !== null) {
          // Adjust the index based on created keywords
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map errors to the keyword at this adjusted index
          if (failedKw.errors && failedKw.errors.length > 0) {
            failedKw.errors.forEach((err) => {
              if (err.field) {
                // Check if error already exists for this index+field to avoid duplicates
                const exists = newKeywordErrors.some(
                  (e) =>
                    e.index === adjustedIndex &&
                    e.field === (err.field as keyof KeywordInput)
                );
                if (!exists) {
                  newKeywordErrors.push({
                    index: adjustedIndex,
                    field: err.field as keyof KeywordInput,
                    message: err.message,
                  });
                }
              } else {
                // General error for this keyword - apply to first field
                const exists = newKeywordErrors.some(
                  (e) => e.index === adjustedIndex && e.field === "keywordText"
                );
                if (!exists) {
                  newKeywordErrors.push({
                    index: adjustedIndex,
                    field: "keywordText",
                    message: err.message,
                  });
                }
              }
            });
          } else {
            // If no specific errors, add a generic error to ensure the row is marked
            const exists = newKeywordErrors.some(
              (e) => e.index === adjustedIndex && e.field === "keywordText"
            );
            if (!exists) {
              newKeywordErrors.push({
                index: adjustedIndex,
                field: "keywordText",
                message: "Failed to create keyword",
              });
            }
          }
        }
      });

      setKeywordErrors(newKeywordErrors);
    }
  }, [failedKeywords, createdKeywords]);

  // Handle successful keywords - remove them from the list using index
  React.useEffect(() => {
    if (createdKeywords && createdKeywords.length > 0) {
      // Use index from response to remove only the specific keyword that was created
      setAddedKeywords((prev) => {
        const createdIndices = new Set(
          createdKeywords
            .map((ck) => ck.index)
            .filter((idx) => idx !== undefined && idx !== null)
        );

        // Remove keywords at the indices that were successfully created
        return prev.filter((_, index) => !createdIndices.has(index));
      });
    }
  }, [createdKeywords]);

  // Parse field errors and map them to keywords
  React.useEffect(() => {
    if (
      submitError &&
      fieldErrors &&
      Object.keys(fieldErrors).length > 0 &&
      failedKeywords.length === 0
    ) {
      const newKeywordErrors: KeywordError[] = [];

      // Map field errors to keywords by index
      // Field errors might be like "keywordText", "bid", etc.
      Object.entries(fieldErrors).forEach(([field, message]) => {
        // Check if field has index suffix (e.g., "keywordText_$0")
        const indexMatch = field.match(/_\$(\d+)$/);
        if (indexMatch) {
          const index = parseInt(indexMatch[1], 10);
          const baseField = field.replace(/_\$\d+$/, "");
          if (index < addedKeywords.length) {
            newKeywordErrors.push({
              index,
              field: baseField as keyof KeywordInput,
              message,
            });
          }
        } else {
          // Apply to all keywords with that field (fallback)
          addedKeywords.forEach((keyword, index) => {
            if (field in keyword) {
              newKeywordErrors.push({
                index,
                field: field as keyof KeywordInput,
                message,
              });
            }
          });
        }
      });

      setKeywordErrors(newKeywordErrors);
    } else if (submitError && failedKeywords.length === 0) {
      // General error - show at top
      setKeywordErrors([]);
    } else if (
      !submitError &&
      createdKeywords &&
      createdKeywords.length > 0 &&
      failedCount === 0
    ) {
      // Complete success - clear everything
      setKeywordErrors([]);
      setAddedKeywords([]);
      setCurrentKeyword({
        adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
        keywordText: "",
        matchType: "BROAD",
        bid: 0.1,
        state: "ENABLED",
      });
      setErrors({});
    }
  }, [
    submitError,
    fieldErrors,
    addedKeywords,
    adgroups,
    createdKeywords,
    failedCount,
    failedKeywords,
  ]);

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
        <div className="flex items-end gap-3">
          {/* Ad Group Dropdown */}
          <div className="flex-1 min-w-[180px] w-full">
            <label className="form-label-small">
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
              buttonClassName="edit-button w-full"
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.adGroupId}
              </p>
            )}
          </div>

          {/* Keyword Text */}
          <div className="flex-1 min-w-[200px]">
            <label className="form-label-small">
              Keyword Text *
            </label>
            <input
              type="text"
              value={currentKeyword.keywordText}
              onChange={(e) => handleChange("keywordText", e.target.value)}
              placeholder="Enter keyword"
              className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.keywordText ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.keywordText && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.keywordText}
              </p>
            )}
          </div>

          {/* Match Type */}
          <div className="w-[140px]">
            <label className="form-label-small">
              Match Type *
            </label>
            <Dropdown<string>
              options={MATCH_TYPE_OPTIONS}
              value={currentKeyword.matchType}
              onChange={(value) =>
                handleChange("matchType", value as KeywordInput["matchType"])
              }
              placeholder="Select match type"
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Bid */}
          <div className="w-[120px]">
            <label className="form-label-small">
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
              className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.bid ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.bid && (
              <p className="text-[10px] text-red-500 mt-1">{errors.bid}</p>
            )}
          </div>

          {/* State */}
          <div className="w-[140px]">
            <label className="form-label-small">
              State *
            </label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentKeyword.state}
              onChange={(value) =>
                handleChange("state", value as KeywordInput["state"])
              }
              placeholder="Select state"
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Add Keyword Button */}
          <div className="w-[120px]">
            <button
              type="button"
              onClick={handleAddKeyword}
              className="create-entity-button w-full text-[11px] justify-center"
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
                    <th className="table-header">
                      Ad Group
                    </th>
                    <th className="table-header">
                      Keyword Text
                    </th>
                    <th className="table-header">
                      Match Type
                    </th>
                    <th className="table-header">
                      Bid
                    </th>
                    <th className="table-header">
                      State
                    </th>
                    <th className="table-header">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addedKeywords.map((keyword, index) => {
                    const isLastRow = index === addedKeywords.length - 1;
                    const rowErrors = keywordErrors.filter(
                      (e) => e.index === index
                    );
                    const hasError = rowErrors.length > 0;
                    // Check if this keyword failed by comparing with adjusted indices
                    const isFailedKeyword = failedKeywords.some((fk) => {
                      if (fk.index === undefined || fk.index === null)
                        return false;
                      // Get the adjusted index for this failed keyword
                      const adjustedFailedIndex = getAdjustedErrorIndex(
                        fk.index
                      );
                      return adjustedFailedIndex === index;
                    });
                    // If a keyword failed but has no specific errors, we should still mark it
                    const shouldHighlight = hasError || isFailedKeyword;

                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } hover:bg-gray-50 transition-colors ${
                          shouldHighlight ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {getAdGroupName(keyword.adGroupId)}
                            </span>
                            {rowErrors.find((e) => e.field === "adGroupId") && (
                              <span className="text-[10px] text-red-500 mt-1">
                                {
                                  rowErrors.find((e) => e.field === "adGroupId")
                                    ?.message
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {keyword.keywordText}
                            </span>
                            {rowErrors.find(
                              (e) => e.field === "keywordText"
                            ) && (
                              <span className="text-[10px] text-red-500 mt-1">
                                {
                                  rowErrors.find(
                                    (e) => e.field === "keywordText"
                                  )?.message
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {keyword.matchType}
                            </span>
                            {rowErrors.find((e) => e.field === "matchType") && (
                              <span className="text-[10px] text-red-500 mt-1">
                                {
                                  rowErrors.find((e) => e.field === "matchType")
                                    ?.message
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              ${keyword.bid.toFixed(2)}
                            </span>
                            {rowErrors.find((e) => e.field === "bid") && (
                              <span className="text-[10px] text-red-500 mt-1">
                                {
                                  rowErrors.find((e) => e.field === "bid")
                                    ?.message
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {keyword.state}
                            </span>
                            {rowErrors.find((e) => e.field === "state") && (
                              <span className="text-[10px] text-red-500 mt-1">
                                {
                                  rowErrors.find((e) => e.field === "state")
                                    ?.message
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(index)}
                            className="text-red-500 hover:text-red-700 text-[13.3px]"
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
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={addedKeywords.length === 0 || loading}
          className="apply-button"
        >
          {loading ? "Creating..." : "Add All Keywords"}
        </button>
      </div>
    </div>
  );
};
