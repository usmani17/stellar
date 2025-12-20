import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { accountsService } from "../../services/accounts";

interface CreateCampaignPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCampaignData) => void;
  accountId?: string;
}

export interface CreateCampaignData {
  campaign_name: string;
  type: "SP" | "SB" | "SD";
  budget: number;
  budgetType: "DAILY" | "LIFETIME";
  status: "Enabled" | "Paused";
  startDate?: string;
  endDate?: string;
  profile_name?: string;
}

const CAMPAIGN_TYPES = [
  { value: "SP", label: "SP" },
  { value: "SB", label: "SB" },
  { value: "SD", label: "SD" },
];

const BUDGET_TYPES = [
  { value: "DAILY", label: "DAILY" },
  { value: "LIFETIME", label: "LIFETIME" },
];

const STATUS_OPTIONS = [
  { value: "Enabled", label: "Enabled" },
  { value: "Paused", label: "Paused" },
];

export const CreateCampaignPanel: React.FC<CreateCampaignPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
}) => {
  const [formData, setFormData] = useState<CreateCampaignData>({
    campaign_name: "",
    type: "SP",
    budget: 0,
    budgetType: "DAILY",
    status: "Enabled",
    startDate: "",
    endDate: "",
    profile_name: "",
  });
  const [profileOptions, setProfileOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateCampaignData, string>>
  >({});

  // Load profiles when panel opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadProfiles();
    }
  }, [isOpen, accountId]);

  const loadProfiles = async () => {
    if (!accountId) return;

    try {
      setLoadingProfiles(true);
      const channels = await accountsService.getAccountChannels(
        parseInt(accountId)
      );
      const amazonChannel = channels.find((ch) => ch.channel_type === "amazon");

      if (amazonChannel) {
        const response = await accountsService.getProfiles(amazonChannel.id);
        const activeProfiles = (response.profiles || []).filter(
          (profile: any) => profile.is_selected && !profile.deleted_at
        );

        const options = activeProfiles.map((profile: any) => ({
          value: profile.name || profile.profileId || "",
          label: profile.name || profile.profileId || "",
        }));

        setProfileOptions(options);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfileOptions([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleChange = (
    field: keyof CreateCampaignData,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // If campaign type is changed to SP, automatically set budgetType to DAILY
      if (field === "type" && value === "SP") {
        updated.budgetType = "DAILY";
      }
      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCampaignData, string>> = {};

    if (!formData.campaign_name.trim()) {
      newErrors.campaign_name = "Campaign name is required";
    }

    if (formData.budget <= 0) {
      newErrors.budget = "Budget must be greater than 0";
    }

    if (profileOptions.length > 0 && !formData.profile_name) {
      newErrors.profile_name = "Profile is required";
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
      campaign_name: "",
      type: "SP",
      budget: 0,
      budgetType: "DAILY",
      status: "Enabled",
      startDate: "",
      endDate: "",
      profile_name: "",
    });
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({
      campaign_name: "",
      type: "SP",
      budget: 0,
      budgetType: "DAILY",
      status: "Enabled",
      startDate: "",
      endDate: "",
      profile_name: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
            Create Campaign
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campaign Name */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.campaign_name}
                onChange={(e) => handleChange("campaign_name", e.target.value)}
                placeholder="Enter campaign name"
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.campaign_name ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.campaign_name && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.campaign_name}
                </p>
              )}
            </div>

            {/* Campaign Type */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Campaign Type *
              </label>
              <Dropdown<string>
                options={CAMPAIGN_TYPES}
                value={formData.type}
                onChange={(value) => handleChange("type", value)}
                placeholder="Select type"
                buttonClassName="w-full"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Budget *
              </label>
              <input
                type="number"
                value={formData.budget || ""}
                onChange={(e) =>
                  handleChange("budget", parseFloat(e.target.value) || 0)
                }
                placeholder="Enter budget"
                min="0"
                step="0.01"
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.budget ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.budget && (
                <p className="text-[10px] text-red-500 mt-1">{errors.budget}</p>
              )}
            </div>

            {/* Budget Type - Hidden for SP campaigns */}
            {formData.type !== "SP" && (
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Budget Type *
                </label>
                <Dropdown<string>
                  options={BUDGET_TYPES}
                  value={formData.budgetType}
                  onChange={(value) => handleChange("budgetType", value)}
                  placeholder="Select budget type"
                  buttonClassName="w-full"
                />
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Status *
              </label>
              <Dropdown<string>
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={(value) => handleChange("status", value)}
                placeholder="Select status"
                buttonClassName="w-full"
              />
            </div>

            {/* Profile */}
            {profileOptions.length > 0 && (
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Profile {profileOptions.length > 0 ? "*" : ""}
                </label>
                <Dropdown<string>
                  options={profileOptions}
                  value={formData.profile_name || undefined}
                  onChange={(value) => handleChange("profile_name", value)}
                  placeholder={
                    loadingProfiles ? "Loading profiles..." : "Select profile"
                  }
                  buttonClassName="w-full"
                  disabled={loadingProfiles}
                />
                {errors.profile_name && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.profile_name}
                  </p>
                )}
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate || ""}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate || ""}
                onChange={(e) => handleChange("endDate", e.target.value)}
                min={formData.startDate || undefined}
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
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
            Create Campaign
          </button>
        </div>
      </form>
    </div>
  );
};
