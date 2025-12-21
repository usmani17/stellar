import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface TargetInput {
  adGroupId: string;
  bid: number;
  expressionType: string;
  expressionValue: string;
  state: "ENABLED" | "PAUSED";
}

interface CreateTargetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targets: TargetInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
}

const EXPRESSION_TYPE_OPTIONS = [
  { value: "ASIN_AGE_RANGE_SAME_AS", label: "ASIN Age Range Same As" },
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_PRICE_BETWEEN", label: "ASIN Price Between" },
  { value: "ASIN_PRICE_GREATER_THAN", label: "ASIN Price Greater Than" },
  { value: "ASIN_PRICE_LESS_THAN", label: "ASIN Price Less Than" },
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
  { value: "QUERY_BROAD_REL_MATCH", label: "Query Broad Rel Match" },
  { value: "QUERY_EXACT_MATCH", label: "Query Exact Match" },
  { value: "QUERY_HIGH_REL_MATCH", label: "Query High Rel Match" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

export const CreateTargetPanel: React.FC<CreateTargetPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignId,
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

    onSubmit(addedTargets);
    // Reset everything
    setAddedTargets([]);
    setCurrentTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      bid: 0.1,
      expressionType: "ASIN_SAME_AS",
      expressionValue: "",
      state: "ENABLED",
    });
    setErrors({});
  };

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
                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {getAdGroupName(target.adGroupId)}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {EXPRESSION_TYPE_OPTIONS.find(
                              (opt) => opt.value === target.expressionType
                            )?.label || target.expressionType}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {target.expressionValue}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            ${target.bid.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {target.state}
                          </span>
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
          disabled={addedTargets.length === 0}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add All Targets
        </button>
      </div>
    </div>
  );
};
