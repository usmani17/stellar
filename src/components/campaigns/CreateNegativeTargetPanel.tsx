import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface NegativeTargetInput {
  adGroupId: string;
  expression: Array<{ type: string; value: string }>;
  state: "ENABLED" | "PAUSED";
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
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdNegativeTargets?: CreatedNegativeTarget[];
  failedCount?: number;
  failedNegativeTargets?: FailedNegativeTarget[];
}

// Only supported expression types for negative targets as per Amazon API documentation
// For negative targets, only ASIN_BRAND_SAME_AS and ASIN_SAME_AS are supported
const EXPRESSION_TYPE_OPTIONS = [
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

export const CreateNegativeTargetPanel: React.FC<
  CreateNegativeTargetPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdNegativeTargets = [],
  failedCount = 0,
  failedNegativeTargets = [],
}) => {
  const [currentNegativeTarget, setCurrentNegativeTarget] = useState<{
    adGroupId: string;
    expressionType: string;
    expressionValue: string;
    state: "ENABLED" | "PAUSED";
  }>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    expressionType: "ASIN_SAME_AS",
    expressionValue: "",
    state: "ENABLED",
  });
  const [addedNegativeTargets, setAddedNegativeTargets] = useState<
    NegativeTargetInput[]
  >([]);
  const [errors, setErrors] = useState<
    Partial<Record<"adGroupId" | "expressionType" | "expressionValue", string>>
  >({});
  const [negativeTargetErrors, setNegativeTargetErrors] = useState<
    NegativeTargetError[]
  >([]);

  const handleChange = (
    field: "adGroupId" | "expressionType" | "expressionValue" | "state",
    value: string
  ) => {
    setCurrentNegativeTarget((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<
      Record<"adGroupId" | "expressionType" | "expressionValue", string>
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

    // Validate ASIN format for ASIN-related types
    // For negative targets, only ASIN_SAME_AS and ASIN_BRAND_SAME_AS are supported
    const asinTypes = [
      "ASIN_SAME_AS",
      "ASIN_BRAND_SAME_AS",
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

    const negativeTarget: NegativeTargetInput = {
      adGroupId: currentNegativeTarget.adGroupId,
      expression: [
        {
          type: currentNegativeTarget.expressionType,
          value: currentNegativeTarget.expressionValue.trim(),
        },
      ],
      state: currentNegativeTarget.state,
    };

    setAddedNegativeTargets([...addedNegativeTargets, negativeTarget]);
    setCurrentNegativeTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      expressionType: "ASIN_SAME_AS",
      expressionValue: "",
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleRemoveNegativeTarget = (index: number) => {
    setAddedNegativeTargets(
      addedNegativeTargets.filter((_, i) => i !== index)
    );
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
      expressionType: "ASIN_SAME_AS",
      expressionValue: "",
      state: "ENABLED",
    });
    setErrors({});
    setNegativeTargetErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Ad Group */}
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Ad Group
          </label>
          <Dropdown
            options={adgroups.map((ag) => ({
              value: ag.adGroupId,
              label: ag.name || ag.adGroupId,
            }))}
            value={currentNegativeTarget.adGroupId}
            onChange={(value) => handleChange("adGroupId", value)}
            placeholder="Select Ad Group"
            buttonClassName="w-full bg-[#FEFEFB]"
          />
          {errors.adGroupId && (
            <p className="mt-1 text-[11.2px] text-red-600">{errors.adGroupId}</p>
          )}
          {fieldErrors.adGroupId && (
            <p className="mt-1 text-[11.2px] text-red-600">
              {fieldErrors.adGroupId}
            </p>
          )}
        </div>

        {/* Expression Type */}
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Expression Type
          </label>
          <Dropdown
            options={EXPRESSION_TYPE_OPTIONS}
            value={currentNegativeTarget.expressionType}
            onChange={(value) => handleChange("expressionType", value)}
            placeholder="Select Type"
            buttonClassName="w-full bg-[#FEFEFB]"
          />
          {errors.expressionType && (
            <p className="mt-1 text-[11.2px] text-red-600">
              {errors.expressionType}
            </p>
          )}
          {fieldErrors.expressionType && (
            <p className="mt-1 text-[11.2px] text-red-600">
              {fieldErrors.expressionType}
            </p>
          )}
        </div>

        {/* Expression Value */}
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Expression Value
          </label>
          <input
            type="text"
            value={currentNegativeTarget.expressionValue}
            onChange={(e) => handleChange("expressionValue", e.target.value)}
            placeholder="Enter value"
            className={`w-full px-3 py-2 border rounded-lg text-[13.3px] bg-[#FEFEFB] ${
              errors.expressionValue || fieldErrors.expressionValue
                ? "border-red-300"
                : "border-gray-200"
            }`}
          />
          {errors.expressionValue && (
            <p className="mt-1 text-[11.2px] text-red-600">
              {errors.expressionValue}
            </p>
          )}
          {fieldErrors.expressionValue && (
            <p className="mt-1 text-[11.2px] text-red-600">
              {fieldErrors.expressionValue}
            </p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            State
          </label>
          <Dropdown
            options={STATE_OPTIONS}
            value={currentNegativeTarget.state}
            onChange={(value) =>
              handleChange("state", value as "ENABLED" | "PAUSED")
            }
            placeholder="Select State"
            buttonClassName="w-full bg-[#FEFEFB]"
          />
        </div>
      </div>

      {/* Add Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleAddNegativeTarget}
          className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors text-[11.2px] font-semibold"
        >
          Add Negative Target
        </button>
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
                <th className="px-4 py-2 text-left text-[11.2px] font-semibold text-[#556179]">
                  State
                </th>
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
                const expressionType = EXPRESSION_TYPE_OPTIONS.find(
                  (opt) => opt.value === ntg.expression[0]?.type
                );
                return (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-4 py-2 text-[13.3px] text-[#0b0f16]">
                      {adgroup?.name || ntg.adGroupId}
                    </td>
                    <td className="px-4 py-2 text-[13.3px] text-[#0b0f16]">
                      {expressionType?.label || ntg.expression[0]?.type}
                    </td>
                    <td className="px-4 py-2 text-[13.3px] text-[#0b0f16]">
                      {ntg.expression[0]?.value}
                    </td>
                    <td className="px-4 py-2 text-[13.3px] text-[#0b0f16]">
                      {ntg.state}
                    </td>
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
          className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || addedNegativeTargets.length === 0}
          className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {loading ? "Creating..." : "Add All Negative Targets"}
        </button>
      </div>
    </div>
  );
};

