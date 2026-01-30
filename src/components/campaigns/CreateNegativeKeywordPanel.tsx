import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface NegativeKeywordInput {
  adGroupId: string;
  keywordText: string;
  matchType: "NEGATIVE_BROAD" | "NEGATIVE_EXACT" | "NEGATIVE_PHRASE" | "negativeExact" | "negativePhrase";
  nativeLanguageKeyword?: string;
  nativeLanguageLocale?: string;
  state?: "ENABLED" | "PAUSED"; // Optional for SB campaigns (cannot be set at creation)
}

interface NegativeKeywordError {
  index: number;
  field: keyof NegativeKeywordInput;
  message: string;
}

interface CreatedNegativeKeyword {
  keywordId?: string;
  adGroupId: string;
  keywordText: string;
  matchType: string;
  state: "ENABLED" | "PAUSED";
  index?: number;
}

interface FailedNegativeKeyword {
  index: number;
  negative_keyword: NegativeKeywordInput;
  errors: Array<{ field?: string; message: string }>;
}

interface CreateNegativeKeywordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (negativeKeywords: NegativeKeywordInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  campaignType?: "SP" | "SB" | "SD"; // Campaign type to determine match types and state field
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdNegativeKeywords?: CreatedNegativeKeyword[];
  failedCount?: number;
  failedNegativeKeywords?: FailedNegativeKeyword[];
}

// SP match types
const MATCH_TYPE_OPTIONS_SP = [
  { value: "NEGATIVE_BROAD", label: "NEGATIVE_BROAD" },
  { value: "NEGATIVE_EXACT", label: "NEGATIVE_EXACT" },
  { value: "NEGATIVE_PHRASE", label: "NEGATIVE_PHRASE" },
];

// SB match types
const MATCH_TYPE_OPTIONS_SB = [
  { value: "negativeExact", label: "negativeExact" },
  { value: "negativePhrase", label: "negativePhrase" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

export const CreateNegativeKeywordPanel: React.FC<
  CreateNegativeKeywordPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignType = "SP",
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdNegativeKeywords = [],
  failedCount = 0,
  failedNegativeKeywords = [],
}) => {
  // Determine match type options based on campaign type
  const matchTypeOptions = campaignType === "SB" ? MATCH_TYPE_OPTIONS_SB : MATCH_TYPE_OPTIONS_SP;
  const defaultMatchType = campaignType === "SB" ? "negativeExact" : "NEGATIVE_BROAD";
  const isSB = campaignType === "SB";
  
  const [currentNegativeKeyword, setCurrentNegativeKeyword] =
    useState<NegativeKeywordInput>({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      keywordText: "",
      matchType: defaultMatchType as any,
      state: "ENABLED", // Default to Enabled for both SP and SB
    });
  const [addedNegativeKeywords, setAddedNegativeKeywords] = useState<
    NegativeKeywordInput[]
  >([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof NegativeKeywordInput, string>>
  >({});
  const [negativeKeywordErrors, setNegativeKeywordErrors] = useState<
    NegativeKeywordError[]
  >([]);

  const handleChange = (
    field: keyof NegativeKeywordInput,
    value: string | undefined
  ) => {
    if (value === undefined) return;
    setCurrentNegativeKeyword((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NegativeKeywordInput, string>> = {};

    if (!currentNegativeKeyword.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    if (!currentNegativeKeyword.keywordText.trim()) {
      newErrors.keywordText = "Keyword text is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNegativeKeyword = () => {
    if (!validate()) {
      return;
    }

    setAddedNegativeKeywords([...addedNegativeKeywords, currentNegativeKeyword]);
    setCurrentNegativeKeyword({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      keywordText: "",
      matchType: defaultMatchType as any,
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleRemoveNegativeKeyword = (index: number) => {
    setAddedNegativeKeywords(
      addedNegativeKeywords.filter((_, i) => i !== index)
    );
    // Clear errors for this index
    setNegativeKeywordErrors(
      negativeKeywordErrors.filter((e) => e.index !== index)
    );
  };

  const handleSubmit = () => {
    if (addedNegativeKeywords.length === 0) {
      setErrors({ keywordText: "Please add at least one negative keyword" });
      return;
    }
    onSubmit(addedNegativeKeywords);
  };

  const handleCancel = () => {
    setAddedNegativeKeywords([]);
    setCurrentNegativeKeyword({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      keywordText: "",
      matchType: defaultMatchType as any,
      state: "ENABLED",
    });
    setErrors({});
    onClose();
  };

  const getAdGroupName = (adGroupId: string) => {
    const adgroup = adgroups.find((ag) => ag.adGroupId === adGroupId);
    return adgroup?.name || adGroupId;
  };

  // Handle failed keywords - map them to errors
  React.useEffect(() => {
    if (failedNegativeKeywords && failedNegativeKeywords.length > 0) {
      const newNegativeKeywordErrors: NegativeKeywordError[] = [];

      failedNegativeKeywords.forEach((failed) => {
        const failedIndex = failed.index;
        if (failedIndex === undefined || failedIndex === null) return;

        // Map errors to fields
        if (failed.errors && failed.errors.length > 0) {
          failed.errors.forEach((err) => {
            const field = err.field || "keywordText";
            if (field in currentNegativeKeyword) {
              newNegativeKeywordErrors.push({
                index: failedIndex,
                field: field as keyof NegativeKeywordInput,
                message: err.message,
              });
            }
          });
        } else {
          // If no specific errors, add a generic error
          const exists = newNegativeKeywordErrors.some(
            (e) => e.index === failedIndex && e.field === "keywordText"
          );
          if (!exists) {
            newNegativeKeywordErrors.push({
              index: failedIndex,
              field: "keywordText",
              message: "Failed to create negative keyword",
            });
          }
        }
      });

      setNegativeKeywordErrors(newNegativeKeywordErrors);
    }
  }, [failedNegativeKeywords, currentNegativeKeyword]);

  // Handle successful keywords - remove them from the list using index
  React.useEffect(() => {
    if (createdNegativeKeywords && createdNegativeKeywords.length > 0) {
      const createdIndices = new Set(
        createdNegativeKeywords
          .map((ck) => ck.index)
          .filter((idx) => idx !== undefined && idx !== null)
      );

      setAddedNegativeKeywords((prev) =>
        prev.filter((_, index) => !createdIndices.has(index))
      );
    }
  }, [createdNegativeKeywords]);

  // Parse field errors and map them to keywords
  React.useEffect(() => {
    if (
      submitError &&
      fieldErrors &&
      Object.keys(fieldErrors).length > 0 &&
      failedNegativeKeywords.length === 0
    ) {
      const newNegativeKeywordErrors: NegativeKeywordError[] = [];

      Object.entries(fieldErrors).forEach(([field, message]) => {
        const indexMatch = field.match(/_\$(\d+)$/);
        if (indexMatch) {
          const index = parseInt(indexMatch[1], 10);
          const baseField = field.replace(/_\$\d+$/, "");
          if (index < addedNegativeKeywords.length) {
            newNegativeKeywordErrors.push({
              index,
              field: baseField as keyof NegativeKeywordInput,
              message,
            });
          }
        } else {
          addedNegativeKeywords.forEach((keyword, index) => {
            if (field in keyword) {
              newNegativeKeywordErrors.push({
                index,
                field: field as keyof NegativeKeywordInput,
                message,
              });
            }
          });
        }
      });

      setNegativeKeywordErrors(newNegativeKeywordErrors);
    } else if (submitError && failedNegativeKeywords.length === 0) {
      setNegativeKeywordErrors([]);
    } else if (
      !submitError &&
      createdNegativeKeywords &&
      createdNegativeKeywords.length > 0 &&
      failedCount === 0
    ) {
      setNegativeKeywordErrors([]);
      setAddedNegativeKeywords([]);
      setCurrentNegativeKeyword({
        adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
        keywordText: "",
        matchType: "NEGATIVE_BROAD",
        state: "ENABLED",
      });
      setErrors({});
    }
  }, [
    submitError,
    fieldErrors,
    addedNegativeKeywords,
    adgroups,
    createdNegativeKeywords,
    failedCount,
    failedNegativeKeywords,
  ]);

  if (!isOpen) return null;

  return (
    <div className="create-panel">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Negative Keywords
        </h2>

        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {submitError}
          </div>
        )}

        {/* Single line inputs */}
        <div className="flex items-end gap-3">
          {/* Ad Group Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="form-label-small">
              Ad Group *
            </label>
            <Dropdown<string>
              options={adgroups.map((ag) => ({
                value: ag.adGroupId,
                label: ag.name,
              }))}
              value={currentNegativeKeyword.adGroupId}
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
              value={currentNegativeKeyword.keywordText}
              onChange={(e) => handleChange("keywordText", e.target.value)}
              placeholder="Enter keyword"
              className={`campaign-input bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
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
          <div className="w-[180px]">
            <label className="form-label-small">
              Match Type *
            </label>
            <Dropdown<string>
              options={matchTypeOptions}
              value={currentNegativeKeyword.matchType}
              onChange={(value) =>
                handleChange(
                  "matchType",
                  value as NegativeKeywordInput["matchType"]
                )
              }
              placeholder="Select match type"
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* State - default to Enabled */}
          <div className="w-[140px]">
            <label className="form-label-small">
              State *
            </label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentNegativeKeyword.state || "ENABLED"}
              onChange={(value: string) => {
                handleChange("state", value as NegativeKeywordInput["state"]);
              }}
              placeholder="Select state"
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Add Negative Keyword Button */}
          <div className="w-[160px]">
            <button
              type="button"
              onClick={handleAddNegativeKeyword}
              className="create-entity-button w-full text-[11px] justify-center"
            >
              Add Negative Keyword
            </button>
          </div>
        </div>
      </div>

      {/* Negative Keywords Table */}
      {addedNegativeKeywords.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Negative Keywords ({addedNegativeKeywords.length})
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
                      State
                    </th>
                    <th className="table-header">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addedNegativeKeywords.map((negativeKeyword, index) => {
                    const isLastRow =
                      index === addedNegativeKeywords.length - 1;
                    const rowErrors = negativeKeywordErrors.filter(
                      (e) => e.index === index
                    );
                    const hasError = rowErrors.length > 0;
                    const isFailedKeyword = failedNegativeKeywords.some(
                      (fk) => fk.index === index
                    );
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
                              {getAdGroupName(negativeKeyword.adGroupId)}
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
                              {negativeKeyword.keywordText}
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
                          <span className="table-text leading-[1.26]">
                            {negativeKeyword.matchType}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="table-text leading-[1.26]">
                            {negativeKeyword.state || "ENABLED"}
                          </span>
                        </td>
                        <td className="table-cell">
                          <button
                            type="button"
                            onClick={() => handleRemoveNegativeKeyword(index)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={addedNegativeKeywords.length === 0 || loading}
          className="px-4 py-2 text-[12.16px] text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Creating..."
            : `Create ${addedNegativeKeywords.length} Negative Keyword(s)`}
        </button>
      </div>
    </div>
  );
};
