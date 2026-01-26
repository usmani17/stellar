import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface NegativeTargetInput {
  adGroupId: string;
  expression: Array<{ type: string; value: string }>;
  state: "ENABLED" | "PAUSED" | "enabled" | "paused" | "archived";
  expressionType?: "manual" | "auto"; // Required for SD
}

interface NegativeTargetError {
  index: number;
  field: keyof NegativeTargetInput;
  message: string;
}

interface CreatedNegativeTarget {
  targetId?: string;
  adGroupId: string;
  expression: Array<{ type: string; value: string }>;
  state: "ENABLED" | "PAUSED";
  index?: number;
}

interface FailedNegativeTarget {
  index: number;
  negative_target: NegativeTargetInput;
  errors: Array<{ field?: string; message: string }>;
}

interface CreateNegativeTargetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (negativeTargets: NegativeTargetInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  campaignType?: "SP" | "SB" | "SD";
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdNegativeTargets?: CreatedNegativeTarget[];
  failedCount?: number;
  failedNegativeTargets?: FailedNegativeTarget[];
}

// Expression types for SP negative targets (uppercase with underscores)
const EXPRESSION_TYPE_OPTIONS_SP = [
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
];

// Expression types for SB negative targets (lowercase camelCase)
const EXPRESSION_TYPE_OPTIONS_SB = [
  { value: "asinBrandSameAs", label: "ASIN Brand Same As" },
  { value: "asinSameAs", label: "ASIN Same As" },
];

// Expression types for SD negative targets (same as SB)
const EXPRESSION_TYPE_OPTIONS_SD = [
  { value: "asinBrandSameAs", label: "ASIN Brand Same As" },
  { value: "asinSameAs", label: "ASIN Same As" },
];

// ExpressionType options for SD (manual/auto)
const EXPRESSION_TYPE_SD_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

// State options for SD (lowercase)
const STATE_OPTIONS_SD = [
  { value: "enabled", label: "Enabled" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export const CreateNegativeTargetPanel: React.FC<
  CreateNegativeTargetPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignType = "SP",
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdNegativeTargets = [],
  failedCount = 0,
  failedNegativeTargets = [],
}) => {
  // Get expression type options based on campaign type
  const EXPRESSION_TYPE_OPTIONS =
    campaignType === "SB"
      ? EXPRESSION_TYPE_OPTIONS_SB
      : campaignType === "SD"
      ? EXPRESSION_TYPE_OPTIONS_SD
      : EXPRESSION_TYPE_OPTIONS_SP;

  const [currentNegativeTarget, setCurrentNegativeTarget] = useState<{
    adGroupId: string;
    expressionType: string;
    expressionValue: string;
    state: "ENABLED" | "PAUSED" | "enabled" | "paused" | "archived";
    sdExpressionType?: "manual" | "auto"; // For SD campaigns
  }>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    expressionType:
      campaignType === "SB"
        ? "asinSameAs"
        : campaignType === "SD"
        ? "asinSameAs"
        : "ASIN_SAME_AS",
    expressionValue: "",
    state: campaignType === "SD" ? "enabled" : "ENABLED",
    sdExpressionType: campaignType === "SD" ? "manual" : undefined,
  });
  const [addedNegativeTargets, setAddedNegativeTargets] = useState<
    NegativeTargetInput[]
  >([]);
  const [errors, setErrors] = useState<
    Partial<
      Record<
        "adGroupId" | "expressionType" | "expressionValue" | "sdExpressionType",
        string
      >
    >
  >({});
  const [negativeTargetErrors, setNegativeTargetErrors] = useState<
    NegativeTargetError[]
  >([]);

  const handleChange = (
    field:
      | "adGroupId"
      | "expressionType"
      | "expressionValue"
      | "state"
      | "sdExpressionType",
    value: string
  ) => {
    if (value === undefined) return;
    setCurrentNegativeTarget((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<
      Record<
        "adGroupId" | "expressionType" | "expressionValue" | "sdExpressionType",
        string
      >
    > = {};

    if (!currentNegativeTarget.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    if (!currentNegativeTarget.expressionType) {
      newErrors.expressionType = "Expression type is required";
    }

    if (!currentNegativeTarget.expressionValue.trim()) {
      newErrors.expressionValue = "Expression value is required";
    }

    // For SD campaigns, expressionType (manual/auto) is required
    if (campaignType === "SD" && !currentNegativeTarget.sdExpressionType) {
      newErrors.sdExpressionType =
        "Expression Type (manual/auto) is required for SD campaigns";
    }

    // Validate ASIN format for ASIN-related types
    // For negative targets, only ASIN_SAME_AS, ASIN_BRAND_SAME_AS, asinSameAs, asinBrandSameAs are supported
    const asinTypes = [
      "ASIN_SAME_AS",
      "ASIN_BRAND_SAME_AS",
      "asinSameAs",
      "asinBrandSameAs",
    ];
    if (
      asinTypes.includes(currentNegativeTarget.expressionType) &&
      currentNegativeTarget.expressionValue.trim()
    ) {
      const asinValue = currentNegativeTarget.expressionValue.trim();
      if (asinValue.length !== 10 || !/^[A-Z0-9]{10}$/i.test(asinValue)) {
        newErrors.expressionValue =
          "ASIN must be exactly 10 alphanumeric characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNegativeTarget = () => {
    if (!validate()) {
      return;
    }

    const expressionData = [
      {
        type: currentNegativeTarget.expressionType,
        value: currentNegativeTarget.expressionValue.trim(),
      },
    ];

    const negativeTarget: NegativeTargetInput = {
      adGroupId: currentNegativeTarget.adGroupId,
      ...(campaignType === "SB"
        ? { expressions: expressionData } // SB uses expressions (plural)
        : campaignType === "SD"
        ? {
            expression: expressionData, // SD uses expression (singular)
            state: currentNegativeTarget.state as
              | "enabled"
              | "paused"
              | "archived",
            expressionType: currentNegativeTarget.sdExpressionType as
              | "manual"
              | "auto",
          }
        : {
            expression: expressionData, // SP uses expression (singular)
            state: currentNegativeTarget.state as "ENABLED" | "PAUSED",
          }),
    } as NegativeTargetInput;

    setAddedNegativeTargets([...addedNegativeTargets, negativeTarget]);
    setCurrentNegativeTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      expressionType:
        campaignType === "SB"
          ? "asinSameAs"
          : campaignType === "SD"
          ? "asinSameAs"
          : "ASIN_SAME_AS",
      expressionValue: "",
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      sdExpressionType: campaignType === "SD" ? "manual" : undefined,
    });
    setErrors({});
  };

  const handleRemoveNegativeTarget = (index: number) => {
    setAddedNegativeTargets(addedNegativeTargets.filter((_, i) => i !== index));
    // Clear errors for this index
    setNegativeTargetErrors(
      negativeTargetErrors.filter((e) => e.index !== index)
    );
  };

  const handleSubmit = () => {
    if (addedNegativeTargets.length === 0) {
      setErrors({ expressionValue: "Please add at least one negative target" });
      return;
    }
    onSubmit(addedNegativeTargets);
  };

  const handleCancel = () => {
    setAddedNegativeTargets([]);
    setCurrentNegativeTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      expressionType:
        campaignType === "SB"
          ? "asinSameAs"
          : campaignType === "SD"
          ? "asinSameAs"
          : "ASIN_SAME_AS",
      expressionValue: "",
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      sdExpressionType: campaignType === "SD" ? "manual" : undefined,
    });
    setErrors({});
    setNegativeTargetErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-[#072929]">
          Create Negative Targets
        </h3>
        <button
          onClick={handleCancel}
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

      {/* Error Message */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-[13.3px]">
          {submitError}
        </div>
      )}

      {/* Form */}
      <div className="flex items-end gap-3 mb-4">
        {/* Ad Group */}
        <div className="flex-1 min-w-[180px]">
          <label className="form-label-small">
            Ad Group *
          </label>
          <Dropdown
            options={adgroups.map((ag) => ({
              value: ag.adGroupId,
              label: ag.name || ag.adGroupId,
            }))}
            value={currentNegativeTarget.adGroupId}
            onChange={(value) => handleChange("adGroupId", value)}
            placeholder="Select Ad Group"
            buttonClassName="edit-button w-full"
          />
          {errors.adGroupId && (
            <p className="mt-1 text-[10px] text-red-500">{errors.adGroupId}</p>
          )}
          {fieldErrors.adGroupId && (
            <p className="mt-1 text-[10px] text-red-500">
              {fieldErrors.adGroupId}
            </p>
          )}
        </div>

        {/* Expression Type */}
        <div className="w-[180px]">
          <label className="form-label-small">
            Expression Type *
          </label>
          <Dropdown
            options={EXPRESSION_TYPE_OPTIONS}
            value={currentNegativeTarget.expressionType}
            onChange={(value) => handleChange("expressionType", value)}
            placeholder="Select Type"
            buttonClassName="edit-button w-full"
          />
          {errors.expressionType && (
            <p className="mt-1 text-[10px] text-red-500">
              {errors.expressionType}
            </p>
          )}
          {fieldErrors.expressionType && (
            <p className="mt-1 text-[10px] text-red-500">
              {fieldErrors.expressionType}
            </p>
          )}
        </div>

        {/* Expression Type (Manual/Auto) - Only for SD */}
        {campaignType === "SD" && (
          <div>
            <label className="form-label-small">
              Expression Type  *
            </label>
            <Dropdown
              options={EXPRESSION_TYPE_SD_OPTIONS}
              value={currentNegativeTarget.sdExpressionType || ""}
              onChange={(value) => handleChange("sdExpressionType", value)}
              placeholder="Select Type"
              buttonClassName="w-full edit-button"
            />
            {errors.sdExpressionType && (
              <p className="mt-1 text-[11.2px] text-red-600">
                {errors.sdExpressionType}
              </p>
            )}
            {fieldErrors.expressionType && (
              <p className="mt-1 text-[11.2px] text-red-600">
                {fieldErrors.expressionType}
              </p>
            )}
          </div>
        )}

        {/* Expression Value */}
        <div className="flex-1 min-w-[200px]">
          <label className="form-label-small">
            Expression Value *
          </label>
          <input
            type="text"
            value={currentNegativeTarget.expressionValue}
            onChange={(e) => handleChange("expressionValue", e.target.value)}
            placeholder="Enter value"
            className={`campaign-input bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
              errors.expressionValue || fieldErrors.expressionValue
                ? "border-red-500"
                : "border-gray-200"
            }`}
          />
          {errors.expressionValue && (
            <p className="mt-1 text-[10px] text-red-500">
              {errors.expressionValue}
            </p>
          )}
          {fieldErrors.expressionValue && (
            <p className="mt-1 text-[10px] text-red-500">
              {fieldErrors.expressionValue}
            </p>
          )}
        </div>

        {/* State - hidden for SB campaigns (state cannot be set at creation) */}
        {campaignType !== "SB" && (
          <div className="w-[140px]">
            <label className="form-label-small">
              State *
            </label>
            <Dropdown
              options={campaignType === "SD" ? STATE_OPTIONS_SD : STATE_OPTIONS}
              value={currentNegativeTarget.state}
              onChange={(value) => handleChange("state", value)}
              placeholder="Select State"
              buttonClassName="edit-button w-full"
            />
          </div>
        )}

        {/* Add Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAddNegativeTarget}
            className="create-entity-button"
          >
            Add
          </button>
        </div>
      </div>

      {/* Added Negative Targets Table */}
      {addedNegativeTargets.length > 0 && (
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-[11.2px] font-semibold text-[#556179]">
                  Ad Group
                </th>
                <th className="px-4 py-2 text-left text-[11.2px] font-semibold text-[#556179]">
                  Expression Type
                </th>
                <th className="px-4 py-2 text-left text-[11.2px] font-semibold text-[#556179]">
                  Expression Value
                </th>
                {/* State column - only show for SP campaigns */}
                {campaignType !== "SB" && (
                  <th className="px-4 py-2 text-left text-[11.2px] font-semibold text-[#556179]">
                    State
                  </th>
                )}
                <th className="px-4 py-2 text-left text-[11.2px] font-semibold text-[#556179]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {addedNegativeTargets.map((ntg, index) => {
                const adgroup = adgroups.find(
                  (ag) => ag.adGroupId === ntg.adGroupId
                );
                // For SB, use expressions (plural), for SP use expression (singular)
                const expressionArray =
                  campaignType === "SB"
                    ? (ntg as any).expressions || []
                    : ntg.expression || [];
                const firstExpression = expressionArray[0];
                const expressionType = EXPRESSION_TYPE_OPTIONS.find(
                  (opt) => opt.value === firstExpression?.type
                );
                return (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-4 py-2 table-text">
                      {adgroup?.name || ntg.adGroupId}
                    </td>
                    <td className="px-4 py-2 table-text">
                      {expressionType?.label || firstExpression?.type || "—"}
                    </td>
                    <td className="px-4 py-2 table-text">
                      {firstExpression?.value || "—"}
                    </td>
                    {/* ExpressionType column - only show for SD campaigns */}
                    {campaignType === "SD" && (
                      <td className="px-4 py-2 table-text">
                        {(ntg as any).expressionType || "—"}
                      </td>
                    )}
                    {/* State column - only show for SP/SD campaigns */}
                    {campaignType !== "SB" && (
                      <td className="px-4 py-2 table-text">
                        {ntg.state || "—"}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveNegativeTarget(index)}
                        className="text-red-600 hover:text-red-800 text-[11.2px]"
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
      )}

      {/* Success/Error Messages */}
      {createdNegativeTargets.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-[13.3px]">
          Successfully created {createdNegativeTargets.length} negative
          target(s)
        </div>
      )}

      {failedCount > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-[13.3px]">
          Failed to create {failedCount} negative target(s)
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || addedNegativeTargets.length === 0}
          className="create-entity-button"
        >
          {loading ? "Creating..." : "Create Negative Targets"}
        </button>
      </div>
    </div>
  );
};
