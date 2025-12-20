import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

interface CreateAdGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAdGroupData) => void;
  campaignId: string;
}

export interface CreateAdGroupData {
  name: string;
  defaultBid: number;
  state: "ENABLED" | "PAUSED";
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
  const [formData, setFormData] = useState<CreateAdGroupData>({
    name: "",
    defaultBid: 0.1,
    state: "ENABLED",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateAdGroupData, string>>
  >({});

  const handleChange = (
    field: keyof CreateAdGroupData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateAdGroupData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Ad Group name is required";
    }

    if (formData.defaultBid <= 0) {
      newErrors.defaultBid = "Default bid must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(formData);
    // Reset form
    setFormData({
      name: "",
      defaultBid: 0.1,
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({
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
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
            Create Ad Group
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ad Group Name */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Ad Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
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
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Default Bid *
              </label>
              <input
                type="number"
                value={formData.defaultBid || ""}
                onChange={(e) =>
                  handleChange("defaultBid", parseFloat(e.target.value) || 0)
                }
                placeholder="Enter default bid"
                min="0"
                step="0.01"
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.defaultBid ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.defaultBid && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.defaultBid}
                </p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                State *
              </label>
              <Dropdown<string>
                options={STATE_OPTIONS}
                value={formData.state}
                onChange={(value) => handleChange("state", value)}
                placeholder="Select state"
                buttonClassName="w-full"
              />
            </div>
          </div>
        </div>

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
            type="submit"
            className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors"
          >
            Create Ad Group
          </button>
        </div>
      </form>
    </div>
  );
};
