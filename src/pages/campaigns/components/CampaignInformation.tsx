import React from "react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { CampaignDetail } from "../../../services/campaigns";

interface CampaignInformationProps {
  campaignDetail: CampaignDetail | null;
  editingField: "budget" | "status" | null;
  editedValue: string;
  onEditField: (field: "budget" | "status") => void;
  onEditValueChange: (value: string) => void;
  onEditEnd: () => void;
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

        {/* Status - Editable */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Status
            </label>
            <button
              onClick={() => {
                onEditField("status");
                const statusLower =
                  campaignDetail.campaign.status?.toLowerCase() || "enabled";
                onEditValueChange(
                  statusLower === "enable" || statusLower === "enabled"
                    ? "enabled"
                    : statusLower === "paused"
                    ? "paused"
                    : "archived"
                );
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit status"
            >
              <svg
                className="w-4 h-4 text-[#556179]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
          {editingField === "status" ? (
            <div className="flex items-center gap-2">
              <select
                value={editedValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1"
                autoFocus
                onBlur={onEditEnd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onEditEnd();
                  } else if (e.key === "Escape") {
                    onEditCancel();
                  }
                }}
              >
                <option value="enabled">Enabled</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          ) : (
            <div className="table-text leading-[1.26]">
              <StatusBadge
                status={
                  campaignDetail.campaign.status?.toLowerCase() === "enabled" ||
                  campaignDetail.campaign.status === "Enable"
                    ? "Enable"
                    : campaignDetail.campaign.status?.toLowerCase() ===
                        "paused" ||
                      campaignDetail.campaign.status === "Paused"
                    ? "Paused"
                    : "Archived"
                }
                uppercase={true}
              />
            </div>
          )}
        </div>

        {/* Budget - Editable */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
              Budget
            </label>
            <button
              onClick={() => {
                onEditField("budget");
                onEditValueChange(
                  (campaignDetail.campaign.budget || 0).toString()
                );
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit budget"
            >
              <svg
                className="w-4 h-4 text-[#556179]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
          {editingField === "budget" ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editedValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-32"
                autoFocus
                onBlur={onEditEnd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onEditEnd();
                  } else if (e.key === "Escape") {
                    onEditCancel();
                  }
                }}
              />
            </div>
          ) : (
            <div className="table-text leading-[1.26]">
              ${(campaignDetail.campaign.budget || 0).toLocaleString()}
            </div>
          )}
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

        {/* Targeting Type - Only for SP campaigns */}
        {(campaignDetail.campaign.targetingType ||
          campaignDetail.campaign.targeting_type) && (
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

