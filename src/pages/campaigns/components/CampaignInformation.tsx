import React from "react";
import { Dropdown } from "../../../components/ui/Dropdown";
import type { CampaignDetail } from "../../../services/campaigns";
import { toLocalDateString } from "../../../utils/dateHelpers";

interface CampaignInformationProps {
  campaignDetail: CampaignDetail | null;
  editingField: "budget" | "status" | "startDate" | "endDate" | null;
  editedValue: string;
  onEditField: (field: "budget" | "status" | "startDate" | "endDate") => void;
  onEditValueChange: (value: string) => void;
  onEditEnd: (value?: string, field?: "budget" | "status" | "startDate" | "endDate") => void;
  onEditCancel: () => void;
  loading?: boolean;
  /** When false, start date is read-only (e.g. Amazon campaign detail). Default true. */
  canEditStartDate?: boolean;
}

export const CampaignInformation: React.FC<CampaignInformationProps> = ({
  campaignDetail,
  editingField,
  editedValue,
  onEditField,
  onEditValueChange,
  onEditEnd,
  onEditCancel,
  loading = false,
  canEditStartDate = true,
}) => {
  if (loading) {
    return (
      <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">
          Campaign Information
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#136D6D] border-t-transparent"></div>
            <p className="text-[14px] text-[#556179]">
              Loading campaign information...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            buttonClassName="edit-button w-full"
            width="w-full"
          />
        </div>

        {/* Budget - Inline Input */}
        <div className="flex flex-col gap-1" style={{ width: "120px" }}>
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Budget
          </label>
          <div className="flex items-center gap-1.5">
            <span className="table-text text-gray-500 text-sm shrink-0" title="Currency">
              {campaignDetail.campaign.profile_currency_code?.trim() || "USD"}
            </span>
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
                    (campaignDetail.campaign.budget || 0).toString(),
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
              className="inline-edit-input w-32"
              style={{
                width: "150px",
              }}
            />
          </div>
        </div>

        {/* Start Date - read-only for Amazon (canEditStartDate false) */}
        {campaignDetail.campaign.startDate && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Start Date
            </label>
            {canEditStartDate ? (
              <input
                type="date"
                value={
                  editingField === "startDate"
                    ? editedValue
                    : toLocalDateString(new Date(campaignDetail.campaign.startDate + "T12:00:00"))
                }
                onFocus={() => {
                  if (editingField !== "startDate") {
                    onEditField("startDate");
                    onEditValueChange(
                      toLocalDateString(new Date(campaignDetail.campaign.startDate + "T12:00:00")),
                    );
                  }
                }}
                onChange={(e) => {
                  onEditValueChange(e.target.value);
                }}
                onBlur={() => {
                  if (editingField === "startDate") {
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
                className="inline-edit-input w-32"
                style={{
                  width: "150px",
                }}
              />
            ) : (
              <div className="table-text leading-[1.26]">
                {toLocalDateString(new Date(campaignDetail.campaign.startDate + "T12:00:00"))}
              </div>
            )}
          </div>
        )}

        {/* End Date */}
        {campaignDetail.campaign.endDate && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              End Date
            </label>
            <input
              type="date"
              value={
                editingField === "endDate"
                  ? editedValue
                  : toLocalDateString(new Date(campaignDetail.campaign.endDate + "T12:00:00"))
              }
              onFocus={() => {
                if (editingField !== "endDate") {
                  onEditField("endDate");
                  onEditValueChange(
                    toLocalDateString(new Date(campaignDetail.campaign.endDate + "T12:00:00")),
                  );
                }
              }}
              onChange={(e) => {
                onEditValueChange(e.target.value);
              }}
              onBlur={() => {
                if (editingField === "endDate") {
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
              className="inline-edit-input w-32"
              style={{
                width: "150px",
              }}
            />
          </div>
        )}

        {/* Targeting Type - Show only when value exists (SP/SB may have it; hide if missing) */}
        {campaignDetail.campaign.type !== "SD" &&
          (campaignDetail.campaign.targetingType ||
            campaignDetail.campaign.targeting_type) && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Targeting Type
            </label>
            <div className="table-text leading-[1.26]">
              {campaignDetail.campaign.targetingType ||
                campaignDetail.campaign.targeting_type}
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
