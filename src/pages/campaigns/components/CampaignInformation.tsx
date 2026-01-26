import React from "react";
import { Dropdown } from "../../../components/ui/Dropdown";
import type { CampaignDetail } from "../../../services/campaigns";

interface CampaignInformationProps {
  campaignDetail: CampaignDetail | null;
  editingField: "budget" | "status" | null;
  editedValue: string;
  onEditField: (field: "budget" | "status") => void;
  onEditValueChange: (value: string) => void;
  onEditEnd: (value?: string, field?: "budget" | "status") => void;
  onEditCancel: () => void;
}

export const CampaignInformation: React.FC<CampaignInformationProps> = ({
  campaignDetail,
  editingField,
  editedValue,
  onEditField,
  onEditValueChange,
  onEditEnd,
  onEditCancel,
}) => {
  if (!campaignDetail) return null;

  return (
    <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
      <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">
        Campaign Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Campaign Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Campaign Name
          </label>
          <div className="table-text leading-[1.26]">
            {campaignDetail.campaign.name || "—"}
          </div>
        </div>

        {/* Campaign ID */}
        {campaignDetail.campaign.campaignId && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Campaign ID
            </label>
            <div className="table-text leading-[1.26]">
              {campaignDetail.campaign.campaignId}
            </div>
          </div>
        )}

        {/* Profile Name - Show for all campaign types */}
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Profile
          </label>
          <div className="table-text leading-[1.26]">
            {campaignDetail.campaign.profile_name || "—"}
          </div>
        </div>

        {/* Campaign Type - Show for all campaign types */}
        {campaignDetail.campaign.type && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Type
            </label>
            <div className="table-text leading-[1.26]">
              {campaignDetail.campaign.type}
            </div>
          </div>
        )}

        {/* State - Inline Dropdown */}
        <div className="flex flex-col gap-1" style={{ width: "120px" }}>
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            State
          </label>
          <Dropdown
            options={[
              { value: "enabled", label: "Enabled" },
              { value: "paused", label: "Paused" },
              { value: "archived", label: "Archived" },
            ]}
            value={
              campaignDetail.campaign.status?.toLowerCase() === "enabled" ||
                campaignDetail.campaign.status === "Enable" ||
                campaignDetail.campaign.status?.toLowerCase() === "enable"
                ? "enabled"
                : campaignDetail.campaign.status?.toLowerCase() === "paused" ||
                  campaignDetail.campaign.status === "Paused"
                  ? "paused"
                  : "archived"
            }
            onChange={(value) => {
              const newValue = value as string;
              const wasEditing = editingField === "status";
              
              if (!wasEditing) {
                onEditField("status");
              }
              onEditValueChange(newValue);
              // Pass the value and field directly to avoid state timing issues
              // This matches the pattern from Campaigns.tsx
              onEditEnd(newValue, "status");
            }}
            buttonClassName="inline-edit-dropdown w-full"
            width="w-full"
          />
        </div>

        {/* Budget - Inline Input */}
        <div className="flex flex-col gap-1" style={{ width: "120px" }}>
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Budget
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={
              editingField === "budget"
                ? editedValue.replace(/[^0-9.]/g, "")
                : (campaignDetail.campaign.budget || 0).toString()
            }
            onFocus={() => {
              if (editingField !== "budget") {
                onEditField("budget");
                onEditValueChange(
                  (campaignDetail.campaign.budget || 0).toString()
                );
              }
            }}
            onChange={(e) => {
              onEditValueChange(e.target.value);
            }}
            onBlur={() => {
              if (editingField === "budget") {
                onEditEnd();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                onEditCancel();
              }
            }}
            className="inline-edit-input w-full"
          />
        </div>

        {/* Start Date */}
        {campaignDetail.campaign.startDate && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Start Date
            </label>
            <div className="table-text leading-[1.26]">
              {new Date(
                campaignDetail.campaign.startDate
              ).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* End Date */}
        {campaignDetail.campaign.endDate && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              End Date
            </label>
            <div className="table-text leading-[1.26]">
              {new Date(campaignDetail.campaign.endDate).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Targeting Type - Show for SP and SB campaigns only (not SD) */}
        {campaignDetail.campaign.type !== "SD" && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Targeting Type
            </label>
            <div className="table-text leading-[1.26]">
              {campaignDetail.campaign.targetingType ||
                campaignDetail.campaign.targeting_type ||
                "—"}
            </div>
          </div>
        )}

        {/* Budget Type */}
        {campaignDetail.campaign.budgetType && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Budget Type
            </label>
            <div className="table-text leading-[1.26]">
              {campaignDetail.campaign.budgetType}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


