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
  campaignType?: "SP" | "SB" | "SD";
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdTargets?: CreatedTarget[];
  failedCount?: number;
  failedTargets?: FailedTarget[];
}

// Expression types for SP campaigns
const EXPRESSION_TYPE_OPTIONS_SP = [
  { value: "ASIN_AGE_RANGE_SAME_AS", label: "ASIN Age Range Same As" },
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_CATEGORY_SAME_AS", label: "ASIN Category Same As" },
  { value: "ASIN_EXPANDED_FROM", label: "ASIN Expanded From" },
  { value: "ASIN_GENRE_SAME_AS", label: "ASIN Genre Same As" },
  {
    value: "ASIN_IS_PRIME_SHIPPING_ELIGIBLE",
    label: "ASIN Is Prime Shipping Eligible",
  },
  { value: "ASIN_PRICE_BETWEEN", label: "ASIN Price Between" },
  { value: "ASIN_PRICE_GREATER_THAN", label: "ASIN Price Greater Than" },
  { value: "ASIN_PRICE_LESS_THAN", label: "ASIN Price Less Than" },
  { value: "ASIN_REVIEW_RATING_BETWEEN", label: "ASIN Review Rating Between" },
  {
    value: "ASIN_REVIEW_RATING_GREATER_THAN",
    label: "ASIN Review Rating Greater Than",
  },
  {
    value: "ASIN_REVIEW_RATING_LESS_THAN",
    label: "ASIN Review Rating Less Than",
  },
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
  { value: "KEYWORD_GROUP_SAME_AS", label: "Keyword Group Same As" },
];

// Expression types for SB campaigns (only asinBrandSameAs and asinSameAs)
const EXPRESSION_TYPE_OPTIONS_SB = [
  { value: "asinBrandSameAs", label: "ASIN Brand Same As" },
  { value: "asinSameAs", label: "ASIN Same As" },
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
  campaignType = "SP",
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdTargets = [],
  failedCount = 0,
  failedTargets = [],
}) => {
  // Get expression type options based on campaign type
  const EXPRESSION_TYPE_OPTIONS = campaignType === "SB" 
    ? EXPRESSION_TYPE_OPTIONS_SB 
    : EXPRESSION_TYPE_OPTIONS_SP;
  
  const [currentTarget, setCurrentTarget] = useState<TargetInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    bid: 0.1,
    expressionType: campaignType === "SB" ? "asinSameAs" : "ASIN_SAME_AS",
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
    // Clear all previous target errors when adding a new target
    setTargetErrors([]);
  };

  const handleRemoveTarget = (index: number) => {
    // Remove the target from the list
    setAddedTargets((prev) => prev.filter((_, i) => i !== index));
    
    // Clear all previous target errors when removing a target
    // This ensures a clean slate since the user is actively fixing issues
    setTargetErrors([]);
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

  // Helper function to compute adjusted index based on created targets
  const getAdjustedErrorIndex = (originalIndex: number): number => {
    if (createdTargets.length === 0) return originalIndex;
    const createdIndices = new Set(
      createdTargets
        .map((ct) => ct.index)
        .filter((idx) => idx !== undefined && idx !== null)
    );
    const removedBefore = Array.from(createdIndices).filter(
      (idx) => idx < originalIndex
    ).length;
    return originalIndex - removedBefore;
  };

  // Process failed targets and field errors - adjust indices immediately
  useEffect(() => {
    const newTargetErrors: TargetError[] = [];

    // Process failed targets - use index from backend response and adjust immediately
    if (failedTargets && failedTargets.length > 0) {
      failedTargets.forEach((failedTarget) => {
        // Use the index from the backend response directly
        const originalIndex = failedTarget.index;

        // Only process if index is valid
        if (originalIndex !== undefined && originalIndex !== null) {
          // Adjust the index based on created targets
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map errors to the target at this adjusted index
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

            // Check if error already exists for this index+field to avoid duplicates
            const exists = newTargetErrors.some(
              (e) => e.index === adjustedIndex && e.field === field
            );
            if (!exists) {
              newTargetErrors.push({
                index: adjustedIndex,
                field,
                message: error.message,
              });
            }
          });
        }
      });
    }

    // Process field errors (format: "field_$index") - adjust indices immediately
    Object.entries(fieldErrors).forEach(([key, message]) => {
      const match = key.match(/^(.+)_\$(\d+)$/);
      if (match) {
        const [, fieldName, indexStr] = match;
        const originalIndex = parseInt(indexStr, 10);
        if (!isNaN(originalIndex)) {
          // Adjust the index based on created targets
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map field name to TargetInput field
          const fieldMap: Record<string, keyof TargetInput> = {
            expression: "expressionValue",
            expressionType: "expressionType",
            bid: "bid",
            state: "state",
            adGroupId: "adGroupId",
          };
          const field = fieldMap[fieldName] || (fieldName as keyof TargetInput);

          // Check if error already exists for this index+field
          const exists = newTargetErrors.some(
            (e) => e.index === adjustedIndex && e.field === field
          );
          if (!exists) {
            newTargetErrors.push({
              index: adjustedIndex,
              field,
              message,
            });
          }
        }
      }
    });

    setTargetErrors(newTargetErrors);
  }, [failedTargets, fieldErrors, createdTargets]);

  // Handle successful targets - remove them from the list using index
  useEffect(() => {
    if (createdTargets && createdTargets.length > 0) {
      // Use index from response to remove only the specific target that was created
      setAddedTargets((prev) => {
        const createdIndices = new Set(
          createdTargets
            .map((ct) => ct.index)
            .filter((idx) => idx !== undefined && idx !== null)
        );

        // Remove targets at the indices that were successfully created
        return prev.filter((_, index) => !createdIndices.has(index));
      });
    }
  }, [createdTargets]);

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
          {/* State field - hidden for SB campaigns (state cannot be set at creation) */}
          {campaignType !== "SB" && (
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
          )}

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
                    <th className="table-header">
                      Ad Group
                    </th>
                    <th className="table-header">
                      Expression Type
                    </th>
                    <th className="table-header">
                      Expression Value
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
                  {addedTargets.map((target, index) => {
                    const isLastRow = index === addedTargets.length - 1;
                    // Check if this target has errors
                    const targetRowErrors = targetErrors.filter(
                      (e) => e.index === index
                    );
                    const hasErrors = targetRowErrors.length > 0;
                    // Check if this target failed by comparing with adjusted indices
                    const isFailedTarget = failedTargets.some((ft) => {
                      if (ft.index === undefined || ft.index === null)
                        return false;
                      // Get the adjusted index for this failed target
                      const adjustedFailedIndex = getAdjustedErrorIndex(
                        ft.index
                      );
                      return adjustedFailedIndex === index;
                    });

                    // If a target failed but has no specific errors, we should still mark it
                    const shouldHighlight = hasErrors || isFailedTarget;

                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${
                          shouldHighlight ? "bg-red-50" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
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
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
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
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
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
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
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
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
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
                        <td className="table-cell">
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
