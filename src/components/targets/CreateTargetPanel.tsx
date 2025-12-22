import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface TargetInput {
  adGroupId: string;
  bid: number;
  expressionType: string;
  expressionValue: string;
  state: "ENABLED" | "PAUSED" | "PROPOSED";
}

interface TargetError {
  index: number;
  field: keyof TargetInput;
  message: string;
}

interface CreatedTarget {
  targetId?: string;
  adGroupId: string;
  bid: number;
  expression: Array<{ type: string; value: string }>;
  expressionType: string;
  state: "ENABLED" | "PAUSED" | "PROPOSED";
  index?: number;
}

interface FailedTarget {
  index: number;
  target: TargetInput;
  errors: Array<{ field?: string; message: string }>;
}

interface CreateTargetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targets: TargetInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdTargets?: CreatedTarget[];
  failedCount?: number;
  failedTargets?: FailedTarget[];
}

const EXPRESSION_TYPE_OPTIONS = [
  // Query-based expressions
  { value: "QUERY_HIGH_REL_MATCHES", label: "Query High Rel Matches" },
  { value: "QUERY_BROAD_REL_MATCHES", label: "Query Broad Rel Matches" },
  { value: "QUERY_BROAD_MATCHES", label: "Query Broad Matches" },
  { value: "QUERY_PHRASE_MATCHES", label: "Query Phrase Matches" },
  { value: "QUERY_EXACT_MATCHES", label: "Query Exact Matches" },
  // ASIN-based expressions
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
  { value: "ASIN_SUBSTITUTE_RELATED", label: "ASIN Substitute Related" },
  { value: "ASIN_ACCESSORY_RELATED", label: "ASIN Accessory Related" },
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_CATEGORY_SAME_AS", label: "ASIN Category Same As" },
  { value: "ASIN_PRICE_LESS_THAN", label: "ASIN Price Less Than" },
  { value: "ASIN_PRICE_BETWEEN", label: "ASIN Price Between" },
  { value: "ASIN_PRICE_GREATER_THAN", label: "ASIN Price Greater Than" },
  {
    value: "ASIN_REVIEW_RATING_LESS_THAN",
    label: "ASIN Review Rating Less Than",
  },
  { value: "ASIN_REVIEW_RATING_BETWEEN", label: "ASIN Review Rating Between" },
  {
    value: "ASIN_REVIEW_RATING_GREATER_THAN",
    label: "ASIN Review Rating Greater Than",
  },
  {
    value: "ASIN_IS_PRIME_SHIPPING_ELIGIBLE",
    label: "ASIN Is Prime Shipping Eligible",
  },
  { value: "ASIN_AGE_RANGE_SAME_AS", label: "ASIN Age Range Same As" },
  { value: "ASIN_GENRE_SAME_AS", label: "ASIN Genre Same As" },
  { value: "ASIN_EXPANDED_FROM", label: "ASIN Expanded From" },
  { value: "KEYWORD_GROUP_SAME_AS", label: "Keyword Group Same As" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
  { value: "PROPOSED", label: "PROPOSED" },
];

export const CreateTargetPanel: React.FC<CreateTargetPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignId,
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdTargets = [],
  failedCount = 0,
  failedTargets = [],
}) => {
  const [currentTarget, setCurrentTarget] = useState<TargetInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    bid: 0.1,
    expressionType: "ASIN_SAME_AS",
    expressionValue: "",
    state: "ENABLED",
  });
  const [addedTargets, setAddedTargets] = useState<TargetInput[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof TargetInput, string>>
  >({});
  const [targetErrors, setTargetErrors] = useState<TargetError[]>([]);

  const handleChange = (field: keyof TargetInput, value: string | number) => {
    setCurrentTarget((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TargetInput, string>> = {};

    if (!currentTarget.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    if (!currentTarget.expressionValue.trim()) {
      newErrors.expressionValue = "Expression value is required";
    }

    if (currentTarget.bid <= 0) {
      newErrors.bid = "Bid must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTarget = () => {
    if (!validate()) {
      return;
    }

    // Add target to the list
    setAddedTargets((prev) => [...prev, { ...currentTarget }]);

    // Reset form for next target
    setCurrentTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      bid: 0.1,
      expressionType: "ASIN_SAME_AS",
      expressionValue: "",
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleRemoveTarget = (index: number) => {
    setAddedTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (addedTargets.length === 0) {
      alert("Please add at least one target before submitting.");
      return;
    }

    // Clear previous errors
    setTargetErrors([]);
    onSubmit(addedTargets);
    // Don't reset targets here - let parent handle success/error
  };

  // Handle successful targets - remove them from the list
  useEffect(() => {
    if (createdTargets && createdTargets.length > 0) {
      // Match created targets to addedTargets by content (since we don't have targetId initially)
      setAddedTargets((prev) => {
        return prev.filter((target) => {
          // Check if this target was successfully created by matching content
          const wasCreated = createdTargets.some((ct) => {
            return (
              ct.adGroupId === target.adGroupId &&
              ct.bid === target.bid &&
              ct.expressionType === target.expressionType &&
              ct.expression?.[0]?.value === target.expressionValue &&
              ct.state === target.state
            );
          });
          return !wasCreated;
        });
      });
    }
  }, [createdTargets]);

  // Process failed targets and field errors - map them to current addedTargets
  useEffect(() => {
    const newTargetErrors: TargetError[] = [];

    // Process failed targets - match them to addedTargets by content
    if (failedTargets && failedTargets.length > 0) {
      failedTargets.forEach((failedTarget) => {
        // Find the matching target in addedTargets by content
        const matchingIndex = addedTargets.findIndex(
          (tgt) =>
            tgt.adGroupId === failedTarget.target.adGroupId &&
            tgt.bid === failedTarget.target.bid &&
            tgt.expressionType === failedTarget.target.expressionType &&
            tgt.expressionValue === failedTarget.target.expressionValue &&
            tgt.state === failedTarget.target.state
        );

        if (matchingIndex !== -1) {
          // Map errors to the matching target
          failedTarget.errors.forEach((error) => {
            // Map error field to TargetInput field
            let field: keyof TargetInput = "expressionValue"; // Default
            if (error.field) {
              // Map Amazon API field names to frontend field names
              const fieldMap: Record<string, keyof TargetInput> = {
                expression: "expressionValue",
                expressionType: "expressionType",
                bid: "bid",
                state: "state",
                adGroupId: "adGroupId",
              };
              field =
                fieldMap[error.field] || (error.field as keyof TargetInput);
            }

            newTargetErrors.push({
              index: matchingIndex,
              field,
              message: error.message,
            });
          });
        }
      });
    }

    // Process field errors (format: "field_$index")
    Object.entries(fieldErrors).forEach(([key, message]) => {
      const match = key.match(/^(.+)_\$(\d+)$/);
      if (match) {
        const [, fieldName, indexStr] = match;
        const originalIndex = parseInt(indexStr, 10);
        if (!isNaN(originalIndex)) {
          // Find the matching target in addedTargets by original index
          // Since we might have removed some targets, we need to match by content
          // For now, use the original index if it's still valid
          if (originalIndex < addedTargets.length) {
            // Map field name to TargetInput field
            const fieldMap: Record<string, keyof TargetInput> = {
              expression: "expressionValue",
              expressionType: "expressionType",
              bid: "bid",
              state: "state",
              adGroupId: "adGroupId",
            };
            const field =
              fieldMap[fieldName] || (fieldName as keyof TargetInput);

            // Check if error already exists for this index+field
            const exists = newTargetErrors.some(
              (e) => e.index === originalIndex && e.field === field
            );
            if (!exists) {
              newTargetErrors.push({
                index: originalIndex,
                field,
                message,
              });
            }
          }
        }
      }
    });

    setTargetErrors(newTargetErrors);
  }, [failedTargets, fieldErrors, addedTargets]);

  const handleCancel = () => {
    setAddedTargets([]);
    setCurrentTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      bid: 0.1,
      expressionType: "ASIN_SAME_AS",
      expressionValue: "",
      state: "ENABLED",
    });
    setErrors({});
    setTargetErrors([]);
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
          Create Targets
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
              value={currentTarget.adGroupId}
              onChange={(value) => handleChange("adGroupId", value)}
              placeholder="Select ad group"
              buttonClassName="w-full"
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.adGroupId}
              </p>
            )}
          </div>

          {/* Expression Type */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Expression Type *
            </label>
            <Dropdown<string>
              options={EXPRESSION_TYPE_OPTIONS}
              value={currentTarget.expressionType}
              onChange={(value) => handleChange("expressionType", value)}
              placeholder="Select expression type"
              buttonClassName="w-full"
            />
          </div>

          {/* Expression Value */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Expression Value *
            </label>
            <input
              type="text"
              value={currentTarget.expressionValue}
              onChange={(e) => handleChange("expressionValue", e.target.value)}
              placeholder="Enter ASIN or value"
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.expressionValue ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.expressionValue && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.expressionValue}
              </p>
            )}
          </div>

          {/* Bid */}
          <div className="w-[120px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Bid *
            </label>
            <input
              type="number"
              value={currentTarget.bid || ""}
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
              value={currentTarget.state}
              onChange={(value) =>
                handleChange("state", value as TargetInput["state"])
              }
              placeholder="Select state"
              buttonClassName="w-full"
            />
          </div>

          {/* Add Target Button */}
          <div className="w-[120px]">
            <button
              type="button"
              onClick={handleAddTarget}
              className="w-full px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
            >
              Add Target
            </button>
          </div>
        </div>
      </div>

      {/* Error Summary */}
      {submitError && (
        <div className="p-4 border-b border-gray-200 bg-red-50">
          <p className="text-[13.3px] text-red-600">{submitError}</p>
          {createdTargets.length > 0 && failedCount > 0 && (
            <p className="text-[12px] text-red-600 mt-1">
              {createdTargets.length} target(s) created successfully.{" "}
              {failedCount} target(s) failed.
            </p>
          )}
        </div>
      )}

      {/* Success Summary */}
      {createdTargets.length > 0 && failedCount === 0 && (
        <div className="p-4 border-b border-gray-200 bg-green-50">
          <p className="text-[13.3px] text-green-600">
            {createdTargets.length} target(s) created successfully!
          </p>
        </div>
      )}

      {/* Targets Table */}
      {addedTargets.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Targets ({addedTargets.length})
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
                      Expression Type
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Expression Value
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
                  {addedTargets.map((target, index) => {
                    const isLastRow = index === addedTargets.length - 1;
                    // Check if this target has errors
                    const targetRowErrors = targetErrors.filter(
                      (e) => e.index === index
                    );
                    const hasErrors = targetRowErrors.length > 0;
                    const isFailedTarget = failedTargets.some(
                      (ft) => ft.index === index
                    );

                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${
                          hasErrors || isFailedTarget ? "bg-red-50" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="py-[10px] px-[10px]">
                          <div className="flex flex-col">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {getAdGroupName(target.adGroupId)}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "adGroupId")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <div className="flex flex-col">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {EXPRESSION_TYPE_OPTIONS.find(
                                (opt) => opt.value === target.expressionType
                              )?.label || target.expressionType}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "expressionType")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <div className="flex flex-col">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {target.expressionValue}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "expressionValue")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <div className="flex flex-col">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              ${target.bid.toFixed(2)}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "bid")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <div className="flex flex-col">
                            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                              {target.state}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "state")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <button
                            type="button"
                            onClick={() => handleRemoveTarget(index)}
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
          disabled={addedTargets.length === 0 || loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Add All Targets"}
        </button>
      </div>
    </div>
  );
};
