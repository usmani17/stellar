import React, { useState } from "react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatCurrency2Decimals } from "../utils/campaignDetailHelpers";

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
  onUpdateCampaign: (
    field: "budget" | "status" | "start_date" | "end_date",
    newValue: string
  ) => Promise<void>;
}

export const GoogleCampaignInformation: React.FC<
  GoogleCampaignInformationProps
> = ({ campaignDetail, onUpdateCampaign }) => {
  // Inline edit state
  const [editingField, setEditingField] = useState<
    "budget" | "status" | "start_date" | "end_date" | null
  >(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [showInlineEditModal, setShowInlineEditModal] = useState(false);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditField, setInlineEditField] = useState<
    "budget" | "status" | "start_date" | "end_date" | null
  >(null);
  const [inlineEditOldValue, setInlineEditOldValue] = useState<string>("");
  const [inlineEditNewValue, setInlineEditNewValue] = useState<string>("");

  const runInlineEdit = async () => {
    if (!inlineEditField || !campaignDetail) return;

    setInlineEditLoading(true);
    try {
      await onUpdateCampaign(inlineEditField, inlineEditNewValue);
      setShowInlineEditModal(false);
      setInlineEditField(null);
      setInlineEditOldValue("");
      setInlineEditNewValue("");
      setEditingField(null);
      setEditedValue("");
    } catch (error) {
      console.error("Error updating campaign:", error);
      alert("Failed to update campaign. Please try again.");
    } finally {
      setInlineEditLoading(false);
    }
  };

  const cancelInlineEdit = () => {
    setShowInlineEditModal(false);
    setInlineEditField(null);
    setInlineEditOldValue("");
    setInlineEditNewValue("");
    setEditingField(null);
    setEditedValue("");
  };

  if (!campaignDetail) return null;

  return (
    <>
      <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">
          Campaign Information
        </h2>
        <div className="space-y-4">
          {/* First Row: Campaign Name, Campaign ID, Campaign Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Campaign Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                Campaign Name
              </label>
              <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                {campaignDetail.campaign.name || "—"}
              </div>
            </div>

            {/* Campaign ID */}
            <div className="flex flex-col gap-1">
              <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                Campaign ID
              </label>
              <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                {campaignDetail.campaign.campaign_id}
              </div>
            </div>

            {/* Campaign Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                Campaign Type
              </label>
              <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                {campaignDetail.campaign.advertising_channel_type || "—"}
              </div>
            </div>
          </div>

          {/* Second Row: Budget, State, Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Budget - Editable */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Budget
                </label>
                <button
                  onClick={() => {
                    setEditingField("budget");
                    setEditedValue(
                      (campaignDetail.campaign.daily_budget || 0).toString()
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
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-32"
                    autoFocus
                    onBlur={() => {
                      const budgetValue = parseFloat(editedValue);
                      const oldBudget =
                        campaignDetail.campaign.daily_budget || 0;
                      if (
                        !isNaN(budgetValue) &&
                        budgetValue !== oldBudget
                      ) {
                        setInlineEditField("budget");
                        setInlineEditOldValue(formatCurrency2Decimals(oldBudget));
                        setInlineEditNewValue(editedValue);
                        setShowInlineEditModal(true);
                      } else {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const budgetValue = parseFloat(editedValue);
                        const oldBudget =
                          campaignDetail.campaign.daily_budget || 0;
                        if (
                          !isNaN(budgetValue) &&
                          budgetValue !== oldBudget
                        ) {
                          setInlineEditField("budget");
                          setInlineEditOldValue(formatCurrency2Decimals(oldBudget));
                          setInlineEditNewValue(editedValue);
                          setShowInlineEditModal(true);
                        } else {
                          setEditingField(null);
                          setEditedValue("");
                        }
                      } else if (e.key === "Escape") {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                  {formatCurrency2Decimals(
                    campaignDetail.campaign.daily_budget || 0
                  )}
                </div>
              )}
            </div>

            {/* State - Editable */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  State
                </label>
                <button
                  onClick={() => {
                    setEditingField("status");
                    setEditedValue(
                      campaignDetail.campaign.status || "ENABLED"
                    );
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Edit state"
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
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditedValue(newValue);
                      if (newValue !== campaignDetail.campaign.status) {
                        setInlineEditField("status");
                        setInlineEditOldValue(
                          campaignDetail.campaign.status
                        );
                        setInlineEditNewValue(newValue);
                        setShowInlineEditModal(true);
                      } else {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                    className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-auto"
                    autoFocus
                    onBlur={() => {
                      if (editedValue === campaignDetail.campaign.status) {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                  >
                    <option value="ENABLED">Enabled</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>
              ) : (
                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                  <StatusBadge
                    status={
                      campaignDetail.campaign.status === "ENABLED"
                        ? "Enabled"
                        : campaignDetail.campaign.status === "PAUSED"
                          ? "Paused"
                          : "Removed"
                    }
                  />
                </div>
              )}
            </div>

            {/* Start Date - Editable */}
            <div className="flex flex-col gap-1">
              <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                Start Date
              </label>
              {editingField === "start_date" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-40"
                    autoFocus
                    onBlur={() => {
                      const oldDate = campaignDetail.campaign.start_date
                        ? new Date(campaignDetail.campaign.start_date)
                          .toISOString()
                          .split("T")[0]
                        : "";
                      if (editedValue && editedValue !== oldDate) {
                        setInlineEditField("start_date");
                        setInlineEditOldValue(oldDate || "Not set");
                        setInlineEditNewValue(editedValue);
                        setShowInlineEditModal(true);
                      } else {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const oldDate = campaignDetail.campaign.start_date
                          ? new Date(campaignDetail.campaign.start_date)
                            .toISOString()
                            .split("T")[0]
                          : "";
                        if (editedValue && editedValue !== oldDate) {
                          setInlineEditField("start_date");
                          setInlineEditOldValue(oldDate || "Not set");
                          setInlineEditNewValue(editedValue);
                          setShowInlineEditModal(true);
                        } else {
                          setEditingField(null);
                          setEditedValue("");
                        }
                      } else if (e.key === "Escape") {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                  onClick={() => {
                    setEditingField("start_date");
                    const startDate = campaignDetail.campaign.start_date
                      ? new Date(campaignDetail.campaign.start_date)
                        .toISOString()
                        .split("T")[0]
                      : "";
                    setEditedValue(startDate);
                  }}
                >
                  {campaignDetail.campaign.start_date
                    ? new Date(
                        campaignDetail.campaign.start_date
                      ).toLocaleDateString()
                    : "—"}
                </div>
              )}
            </div>
          </div>

          {/* Third Row: End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* End Date - Editable */}
            <div className="flex flex-col gap-1">
              <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                End Date
              </label>
              {editingField === "end_date" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-40"
                    autoFocus
                    onBlur={() => {
                      const oldDate = campaignDetail.campaign.end_date
                        ? new Date(campaignDetail.campaign.end_date)
                          .toISOString()
                          .split("T")[0]
                        : "";
                      if (editedValue && editedValue !== oldDate) {
                        setInlineEditField("end_date");
                        setInlineEditOldValue(oldDate || "Not set");
                        setInlineEditNewValue(editedValue);
                        setShowInlineEditModal(true);
                      } else {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const oldDate = campaignDetail.campaign.end_date
                          ? new Date(campaignDetail.campaign.end_date)
                            .toISOString()
                            .split("T")[0]
                          : "";
                        if (editedValue && editedValue !== oldDate) {
                          setInlineEditField("end_date");
                          setInlineEditOldValue(oldDate || "Not set");
                          setInlineEditNewValue(editedValue);
                          setShowInlineEditModal(true);
                        } else {
                          setEditingField(null);
                          setEditedValue("");
                        }
                      } else if (e.key === "Escape") {
                        setEditingField(null);
                        setEditedValue("");
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                  onClick={() => {
                    setEditingField("end_date");
                    const endDate = campaignDetail.campaign.end_date
                      ? new Date(campaignDetail.campaign.end_date)
                        .toISOString()
                        .split("T")[0]
                      : "";
                    setEditedValue(endDate);
                  }}
                >
                  {campaignDetail.campaign.end_date
                    ? new Date(
                        campaignDetail.campaign.end_date
                      ).toLocaleDateString()
                    : "—"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline Edit Confirmation Modal */}
      {showInlineEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Change</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {inlineEditField === "status"
                  ? "State"
                  : inlineEditField === "budget"
                    ? "Budget"
                    : inlineEditField === "start_date"
                      ? "Start Date"
                      : "End Date"}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">From:</span>
                <span className="text-sm font-medium">
                  {inlineEditOldValue}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">To:</span>
                <span className="text-sm font-medium">
                  {inlineEditField === "status"
                    ? inlineEditNewValue
                    : inlineEditField === "budget"
                      ? formatCurrency2Decimals(
                          parseFloat(inlineEditNewValue || "0")
                        )
                      : inlineEditNewValue}
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelInlineEdit}
                disabled={inlineEditLoading}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={runInlineEdit}
                disabled={inlineEditLoading}
                className="create-entity-button btn-sm"
              >
                {inlineEditLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
