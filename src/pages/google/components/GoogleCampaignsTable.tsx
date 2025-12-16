import React from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Dropdown } from "../../../components/ui/Dropdown";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export interface GoogleCampaign {
  id: number;
  campaign_id: number;
  customer_id: string;
  campaign_name: string;
  account_name?: string;
  status: string;
  advertising_channel_type: string;
  advertising_channel_sub_type?: string;
  start_date?: string;
  end_date?: string;
  daily_budget: number;
  budget_amount_micros?: number;
  budget_delivery_method?: string;
  bidding_strategy_type?: string;
  serving_status?: string;
  last_sync?: string;
  // Performance metrics
  spends?: number;
  sales?: number;
  impressions?: number;
  clicks?: number;
  acos?: number;
  roas?: number;
}

interface GoogleCampaignsTableProps {
  campaigns: GoogleCampaign[];
  loading: boolean;
  sorting: boolean;
  accountId: string;
  selectedCampaigns: Set<string | number>;
  allSelected: boolean;
  someSelected: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  editingCell: {
    campaignId: string | number;
    field: "budget" | "status" | "start_date" | "end_date";
  } | null;
  editedValue: string;
  isCancelling: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectCampaign: (campaignId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (campaign: GoogleCampaign, field: "budget" | "status" | "start_date" | "end_date") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getChannelTypeLabel: (type?: string) => string;
  getSortIcon: (column: string) => React.ReactElement;
}

export const GoogleCampaignsTable: React.FC<GoogleCampaignsTableProps> = ({
  campaigns,
  loading,
  sorting,
  accountId,
  selectedCampaigns,
  allSelected,
  someSelected,
  sortBy,
  sortOrder,
  editingCell,
  editedValue,
  isCancelling,
  onSelectAll,
  onSelectCampaign,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getChannelTypeLabel,
  getSortIcon,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No campaigns found. Click "Sync Campaigns from Google Ads" to fetch campaigns.
            </p>
          </div>
        ) : (
          <div className="relative">
            <table className="min-w-[1200px] w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  {/* Checkbox Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px] sticky left-0 bg-white z-10">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={onSelectAll}
                        size="small"
                      />
                    </div>
                  </th>

                  {/* Campaign Name Header - Sticky */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[300px] max-w-[400px] sticky left-[35px] bg-white z-10 border-r border-[#e8e8e3]"
                    onClick={() => onSort("campaign_name")}
                  >
                    <div className="flex items-center gap-1">
                      Campaign Name
                      {getSortIcon("campaign_name")}
                    </div>
                  </th>

                  {/* Account Name Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 min-w-[200px]"
                    onClick={() => onSort("account_name")}
                  >
                    <div className="flex items-center gap-1">
                      Account Name
                      {getSortIcon("account_name")}
                    </div>
                  </th>

                  {/* Type Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("advertising_channel_type")}
                  >
                    <div className="flex items-center gap-1">
                      Type
                      {getSortIcon("advertising_channel_type")}
                    </div>
                  </th>

                  {/* State Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      State
                      {getSortIcon("status")}
                    </div>
                  </th>

                  {/* Budget Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("daily_budget")}
                  >
                    <div className="flex items-center gap-1">
                      Budget
                      {getSortIcon("daily_budget")}
                    </div>
                  </th>

                  {/* Start Date Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                    onClick={() => onSort("start_date")}
                  >
                    <div className="flex items-center gap-1">
                      Start Date
                      {getSortIcon("start_date")}
                    </div>
                  </th>

                  {/* Spends Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("spends")}
                  >
                    <div className="flex items-center gap-1">
                      Spends
                      {getSortIcon("spends")}
                    </div>
                  </th>

                  {/* Sales Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("sales")}
                  >
                    <div className="flex items-center gap-1">
                      Sales
                      {getSortIcon("sales")}
                    </div>
                  </th>

                  {/* Impressions Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("impressions")}
                  >
                    <div className="flex items-center gap-1">
                      Impressions
                      {getSortIcon("impressions")}
                    </div>
                  </th>

                  {/* Clicks Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("clicks")}
                  >
                    <div className="flex items-center gap-1">
                      Clicks
                      {getSortIcon("clicks")}
                    </div>
                  </th>

                  {/* ACOS Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("acos")}
                  >
                    <div className="flex items-center gap-1">
                      ACOS
                      {getSortIcon("acos")}
                    </div>
                  </th>

                  {/* ROAS Header */}
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("roas")}
                  >
                    <div className="flex items-center gap-1">
                      ROAS
                      {getSortIcon("roas")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorting && (
                  <tr>
                    <td colSpan={13} className="relative">
                      <div className="absolute inset-0 bg-white bg-opacity-85 flex items-center justify-center z-20 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-3 bg-white px-6 py-4 rounded-lg shadow-lg border border-[#E6E6E6]">
                          <div className="relative">
                            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#136D6D] border-t-transparent"></div>
                          </div>
                          <span className="text-[12.8px] font-medium text-[#136D6D]">
                            Sorting campaigns...
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {campaigns.map((campaign, index) => {
                  const isLastRow = index === campaigns.length - 1;
                  return (
                    <tr
                      key={campaign.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      {/* Checkbox - Sticky */}
                      <td className="py-[10px] px-[10px] sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedCampaigns.has(campaign.campaign_id)}
                            onChange={(checked) =>
                              onSelectCampaign(campaign.campaign_id, checked)
                            }
                            size="small"
                          />
                        </div>
                      </td>

                      {/* Campaign Name - Sticky */}
                      <td className="py-[10px] px-[10px] min-w-[300px] max-w-[400px] sticky left-[35px] bg-white z-10 border-r border-[#e8e8e3]">
                        <button
                          onClick={() =>
                            navigate(
                              `/accounts/${accountId}/google-campaigns/${campaign.campaign_id}`
                            )
                          }
                          className="text-[13.3px] text-[#0b0f16] leading-[1.26] hover:text-[#136d6d] hover:underline cursor-pointer text-left truncate block w-full"
                        >
                          {campaign.campaign_name || "Unnamed Campaign"}
                        </button>
                      </td>

                      {/* Account Name */}
                      <td className="py-[10px] px-[10px] min-w-[200px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
                          {campaign.account_name ||
                          (campaign.customer_id && campaign.customer_id.trim() !== "")
                            ? campaign.account_name || campaign.customer_id
                            : "—"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-semibold text-[#7a4dff]">
                          {getChannelTypeLabel(campaign.advertising_channel_type) || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-[10px] px-[10px]">
                        {editingCell?.campaignId === campaign.campaign_id &&
                        editingCell?.field === "status" ? (
                          <Dropdown
                            options={[
                              { value: "ENABLED", label: "Enabled" },
                              { value: "PAUSED", label: "Paused" },
                              { value: "REMOVED", label: "Removed" },
                            ]}
                            value={editedValue}
                            onChange={(val) => {
                              const newValue = val as string;
                              onInlineEditChange(newValue);
                              setTimeout(() => {
                                onConfirmInlineEdit(newValue);
                              }, 100);
                            }}
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="w-full text-[13.3px] px-2 py-1"
                            width="w-full"
                            align="center"
                          />
                        ) : (
                          <div
                            onClick={() => onStartInlineEdit(campaign, "status")}
                            className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                          >
                            {getStatusBadge(campaign.status)}
                          </div>
                        )}
                      </td>

                      {/* Daily Budget */}
                      <td className="py-[10px] px-[10px]">
                        {editingCell?.campaignId === campaign.campaign_id &&
                        editingCell?.field === "budget" ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              value={editedValue}
                              onChange={(e) => onInlineEditChange(e.target.value)}
                              onBlur={(e) => {
                                const inputValue = e.target.value;
                                onConfirmInlineEdit(inputValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                } else if (e.key === "Escape") {
                                  onCancelInlineEdit();
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
                            />
                          </div>
                        ) : (
                          <p
                            onClick={() => onStartInlineEdit(campaign, "budget")}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                          >
                            {formatCurrency(campaign.daily_budget || 0)}
                          </p>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="py-[10px] px-[10px]">
                        {editingCell?.campaignId === campaign.campaign_id &&
                        editingCell?.field === "start_date" ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="date"
                              value={editedValue}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) => onInlineEditChange(e.target.value)}
                              onBlur={(e) => {
                                if (isCancelling) {
                                  return;
                                }
                                const inputValue = e.target.value;
                                const oldValue = campaign.start_date
                                  ? new Date(campaign.start_date).toISOString().split("T")[0]
                                  : "";
                                if (inputValue === oldValue) {
                                  onCancelInlineEdit();
                                } else {
                                  onConfirmInlineEdit(inputValue);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                } else if (e.key === "Escape") {
                                  onCancelInlineEdit();
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
                            />
                          </div>
                        ) : (
                          <p
                            onClick={() => onStartInlineEdit(campaign, "start_date")}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:text-[#136d6d] hover:underline whitespace-nowrap"
                          >
                            {campaign.start_date
                              ? new Date(campaign.start_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </p>
                        )}
                      </td>

                      {/* Spends */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency((campaign as any).spends || 0)}
                        </span>
                      </td>

                      {/* Sales */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency((campaign as any).sales || 0)}
                        </span>
                      </td>

                      {/* Impressions */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {((campaign as any).impressions || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Clicks */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {((campaign as any).clicks || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* ACOS */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatPercentage((campaign as any).acos || 0)}
                        </span>
                      </td>

                      {/* ROAS */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {(campaign as any).roas
                            ? `${((campaign as any).roas).toFixed(2)} x`
                            : "0.00 x"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

