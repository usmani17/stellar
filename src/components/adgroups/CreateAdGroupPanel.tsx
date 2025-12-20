import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface AdGroupInput {
  name: string;
  defaultBid: number;
  state: "ENABLED" | "PAUSED";
}

interface CreateAdGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adgroups: AdGroupInput[]) => void;
  campaignId: string;
}

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

export const CreateAdGroupPanel: React.FC<CreateAdGroupPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId,
}) => {
  const [currentAdGroup, setCurrentAdGroup] = useState<AdGroupInput>({
    name: "",
    defaultBid: 0.1,
    state: "ENABLED",
  });
  const [addedAdGroups, setAddedAdGroups] = useState<AdGroupInput[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof AdGroupInput, string>>>({});

  const handleChange = (field: keyof AdGroupInput, value: string | number) => {
    setCurrentAdGroup((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AdGroupInput, string>> = {};

    if (!currentAdGroup.name.trim()) {
      newErrors.name = "Ad Group name is required";
    }

    if (currentAdGroup.defaultBid <= 0) {
      newErrors.defaultBid = "Default bid must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAdGroup = () => {
    if (!validate()) {
      return;
    }

    // Add adgroup to the list
    setAddedAdGroups((prev) => [...prev, { ...currentAdGroup }]);

    // Reset form for next adgroup
    setCurrentAdGroup({
      name: "",
      defaultBid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleRemoveAdGroup = (index: number) => {
    setAddedAdGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (addedAdGroups.length === 0) {
      alert("Please add at least one ad group before submitting.");
      return;
    }

    onSubmit(addedAdGroups);
    // Reset everything
    setAddedAdGroups([]);
    setCurrentAdGroup({
      name: "",
      defaultBid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleCancel = () => {
    setAddedAdGroups([]);
    setCurrentAdGroup({
      name: "",
      defaultBid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Ad Groups
        </h2>

        {/* Single line inputs */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Ad Group Name */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Ad Group Name *
            </label>
            <input
              type="text"
              value={currentAdGroup.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter ad group name"
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.name ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Default Bid */}
          <div className="w-[140px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Default Bid *
            </label>
            <input
              type="number"
              value={currentAdGroup.defaultBid || ""}
              onChange={(e) =>
                handleChange("defaultBid", parseFloat(e.target.value) || 0)
              }
              placeholder="0.10"
              min="0"
              step="0.01"
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.defaultBid ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.defaultBid && (
              <p className="text-[10px] text-red-500 mt-1">{errors.defaultBid}</p>
            )}
          </div>

          {/* State */}
          <div className="w-[140px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              State *
            </label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentAdGroup.state}
              onChange={(value) => handleChange("state", value as AdGroupInput["state"])}
              placeholder="Select state"
              buttonClassName="w-full"
            />
          </div>

          {/* Add Ad Group Button */}
          <div className="w-[120px]">
            <button
              type="button"
              onClick={handleAddAdGroup}
              className="w-full px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors"
            >
              Add Ad Group
            </button>
          </div>
        </div>
      </div>

      {/* Ad Groups Table */}
      {addedAdGroups.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Ad Groups ({addedAdGroups.length})
          </h3>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Ad Group Name
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Default Bid
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
                  {addedAdGroups.map((adgroup, index) => {
                    const isLastRow = index === addedAdGroups.length - 1;
                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {adgroup.name}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            ${adgroup.defaultBid.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {adgroup.state}
                          </span>
                        </td>
                        <td className="py-[10px] px-[10px]">
                          <button
                            type="button"
                            onClick={() => handleRemoveAdGroup(index)}
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
          disabled={addedAdGroups.length === 0}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add All Ad Groups
        </button>
      </div>
    </div>
  );
};
