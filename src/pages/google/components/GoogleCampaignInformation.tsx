import React from "react";
import { Dropdown } from "../../../components/ui/Dropdown";
import { formatCurrency2Decimals } from "../utils/campaignDetailHelpers";
import {
  getStatusWithDefault,
  formatDateForDisplay,
} from "../utils/googleAdsUtils";

interface GoogleCampaignDetail {
  campaign: {
    id: number;
    campaign_id: number;
    name: string;
    status: string;
    advertising_channel_type: string;
    advertising_channel_sub_type?: string;
    start_date?: string;
    end_date?: string;
    daily_budget: number;
    account_name?: string;
    customer_id?: string;
    last_sync?: string;
  };
}

interface GoogleCampaignInformationProps {
  campaignDetail: GoogleCampaignDetail | null;
  editingField: "budget" | "status" | "start_date" | "end_date" | null;
  editedValue: string;
  onEditField: (field: "budget" | "status" | "start_date" | "end_date") => void;
  onEditValueChange: (value: string) => void;
  onEditEnd: (
    value?: string,
    field?: "budget" | "status" | "start_date" | "end_date",
  ) => void;
  onEditCancel: () => void;
  loading?: boolean;
  /** For draft campaigns: the intended publish status (ENABLED/PAUSED) from draft_state. Overrides campaign.status which is SAVED_DRAFT. */
  draftPublishStatus?: "ENABLED" | "PAUSED";
}

export const GoogleCampaignInformation: React.FC<
  GoogleCampaignInformationProps
> = ({
  campaignDetail,
  editingField,
  editedValue,
  onEditField,
  onEditValueChange,
  onEditEnd,
  onEditCancel,
  loading = false,
  draftPublishStatus,
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

  // Check if campaign is REMOVED
  const campaignStatus = getStatusWithDefault(
    campaignDetail.campaign.status,
  ).toUpperCase();
  const isRemoved = campaignStatus === "REMOVED";

  // Check if dates are in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = campaignDetail.campaign.start_date
    ? new Date(campaignDetail.campaign.start_date)
    : null;
  if (startDate) {
    startDate.setHours(0, 0, 0, 0);
  }
  const isStartDateInPast = startDate && startDate < today;

  const endDate = campaignDetail.campaign.end_date
    ? new Date(campaignDetail.campaign.end_date)
    : null;
  if (endDate) {
    endDate.setHours(0, 0, 0, 0);
  }
  const isEndDateInPast = endDate && endDate < today;

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
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Campaign ID
          </label>
          <div className="table-text leading-[1.26]">
            {campaignDetail.campaign.campaign_id}
          </div>
        </div>

        {/* Campaign Type */}
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Campaign Type
          </label>
          <div className="table-text leading-[1.26]">
            {campaignDetail.campaign.advertising_channel_type || "—"}
          </div>
        </div>

        {/* State - Inline Dropdown */}
        <div className="flex flex-col gap-1" style={{ width: "120px" }}>
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            State
          </label>
          {!isRemoved ? (
            <Dropdown
              options={[
                { value: "ENABLED", label: "Enabled" },
                { value: "PAUSED", label: "Paused" },
              ]}
              value={
                editingField === "status"
                  ? editedValue
                  : (draftPublishStatus ?? campaignDetail.campaign.status) === "ENABLED"
                    ? "ENABLED"
                    : (draftPublishStatus ?? campaignDetail.campaign.status) === "PAUSED"
                      ? "PAUSED"
                      : "ENABLED"
              }
              onChange={(value) => {
                const newValue = value as string;
                const wasEditing = editingField === "status";

                if (!wasEditing) {
                  onEditField("status");
                }
                onEditValueChange(newValue);
                // Pass the value and field directly to avoid state timing issues
                onEditEnd(newValue, "status");
              }}
              buttonClassName="edit-button google-table-dropdown w-full"
              width="w-full"
              disabled={isRemoved}
            />
          ) : (
            <div className="table-text leading-[1.26]">
              {campaignDetail.campaign.status === "ENABLED"
                ? "Enabled"
                : campaignDetail.campaign.status === "PAUSED"
                  ? "Paused"
                  : "Removed"}
            </div>
          )}
        </div>

        {/* Budget - Inline Input */}
        <div className="flex flex-col gap-1" style={{ width: "120px" }}>
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
            Budget
          </label>
          {!isRemoved ? (
            <input
              type="number"
              step="0.01"
              min="0"
              value={
                editingField === "budget"
                  ? editedValue.replace(/[^0-9.]/g, "")
                  : (campaignDetail.campaign.daily_budget || 0).toString()
              }
              onFocus={() => {
                if (editingField !== "budget") {
                  onEditField("budget");
                  onEditValueChange(
                    (campaignDetail.campaign.daily_budget || 0).toString(),
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
          ) : (
            <div className="table-text leading-[1.26]">
              {formatCurrency2Decimals(
                campaignDetail.campaign.daily_budget || 0,
              )}
            </div>
          )}
        </div>

        {/* Start Date */}
        {campaignDetail.campaign.start_date && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Start Date
            </label>
            {!isRemoved && !isStartDateInPast ? (
              <input
                type="date"
                value={
                  editingField === "start_date"
                    ? editedValue
                    : campaignDetail.campaign.start_date
                      ? new Date(campaignDetail.campaign.start_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                }
                onFocus={() => {
                  if (editingField !== "start_date") {
                    onEditField("start_date");
                    onEditValueChange(
                      campaignDetail.campaign.start_date
                        ? new Date(campaignDetail.campaign.start_date)
                            .toISOString()
                            .split("T")[0]
                        : "",
                    );
                  }
                }}
                onChange={(e) => {
                  onEditValueChange(e.target.value);
                }}
                onBlur={() => {
                  if (editingField === "start_date") {
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
                {formatDateForDisplay(campaignDetail.campaign.start_date)}
              </div>
            )}
          </div>
        )}

        {/* End Date */}
        {campaignDetail.campaign.end_date && (
          <div className="flex flex-col gap-1">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              End Date
            </label>
            {!isRemoved && !isEndDateInPast ? (
              <input
                type="date"
                value={
                  editingField === "end_date"
                    ? editedValue
                    : campaignDetail.campaign.end_date
                      ? new Date(campaignDetail.campaign.end_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                }
                onFocus={() => {
                  if (editingField !== "end_date") {
                    onEditField("end_date");
                    onEditValueChange(
                      campaignDetail.campaign.end_date
                        ? new Date(campaignDetail.campaign.end_date)
                            .toISOString()
                            .split("T")[0]
                        : "",
                    );
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  onEditValueChange(value);
                  onEditEnd(value, "end_date");
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
                {formatDateForDisplay(campaignDetail.campaign.end_date)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
