import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { ColumnDefinition } from "./GoogleAdsTable";

export interface GoogleCampaign {
  id: number;
  campaign_id: number;
  customer_id: string;
  campaign_name: string;
  account_name?: string;
  status: string;
  advertising_channel_type: string;
  advertising_channel_sub_type?: string;
  bidding_strategy_type?: string;
  start_date?: string;
  end_date?: string;
  daily_budget: number;
  budget_amount_micros?: number;
  budget_delivery_method?: string;
  serving_status?: string;
  last_sync?: string;
  // Performance metrics
  spends?: number;
  sales?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  interactions?: number;
  conversion_rate?: number;
  interaction_rate?: number;
  avg_cpc?: number;
  cost_per_conversion?: number;
  acos?: number;
  roas?: number;
  // Extra data (JSONB) - contains shopping_setting, network_settings, etc.
  extra_data?: {
    shopping_setting?: {
      merchant_id?: string;
      sales_country?: string;
      campaign_priority?: number;
      enable_local?: boolean;
    };
    network_settings?: {
      target_google_search?: boolean;
      target_search_network?: boolean;
      target_content_network?: boolean;
      target_partner_search_network?: boolean;
    };
    [key: string]: any;
  };
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
    field: "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type";
  } | null;
  editedValue: string;
  isCancelling: boolean;
  updatingField: {
    campaignId: string | number;
    field: "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type";
  } | null;
  summary: {
    total_campaigns: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions?: number;
    total_interactions?: number;
    total_budget?: number;
    avg_acos: number;
    avg_roas: number;
    avg_conversion_rate?: number;
    avg_cost_per_conversion?: number;
    avg_interaction_rate?: number;
    avg_cost?: number;
    avg_cpc?: number;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectCampaign: (campaignId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (campaign: GoogleCampaign, field: "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getChannelTypeLabel: (type?: string) => string;
  getSortIcon: (column: string) => React.ReactElement;
  onEditCampaign?: (campaign: GoogleCampaign) => void;
  editLoadingCampaignId?: string | number | null;
  isPanelOpen?: boolean; // When true, editable fields become read-only
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
  updatingField,
  summary,
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
  onEditCampaign,
  editLoadingCampaignId,
  isPanelOpen = false,
}) => {
  const navigate = useNavigate();
  // Map editingCell to shared component format
  const sharedEditingCell = editingCell ? {
    itemId: editingCell.campaignId,
    field: editingCell.field,
  } : null;

  const sharedUpdatingField = updatingField ? {
    itemId: updatingField.campaignId,
    field: updatingField.field,
  } : null;

  // Map pending changes to shared format (dates now use modal, so no pending changes)
  const pendingChanges = useMemo(() => ({}), []);

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_count: summary.total_campaigns,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    total_conversions: summary.total_conversions,
    total_interactions: summary.total_interactions,
    total_budget: summary.total_budget,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
    avg_conversion_rate: summary.avg_conversion_rate,
    avg_cost_per_conversion: summary.avg_cost_per_conversion,
    avg_interaction_rate: summary.avg_interaction_rate,
    avg_cost: summary.avg_cost,
    avg_cpc: summary.avg_cpc,
  } : null;

  // Define columns for campaigns
  const columns: ColumnDefinition[] = useMemo(() => [
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      sticky: true,
      minWidth: "min-w-[300px]",
      maxWidth: "max-w-[400px]",
      editable: false,
      navigateTo: (row: GoogleCampaign, accountId: string) => 
        `/accounts/${accountId}/google-campaigns/${row.campaign_id}`,
      getValue: (row: GoogleCampaign) => row.campaign_name || "Unnamed Campaign",
      render: (value: any, row: GoogleCampaign) => {
        const navPath = `/accounts/${accountId}/google-campaigns/${row.campaign_id}`;
        return (
          <div className="group relative flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(navPath);
              }}
              className="table-edit-link"
            >
              {value}
            </button>
            {onEditCampaign && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCampaign(row);
                }}
className="table-edit-icon flex-shrink-0"
                title="Edit campaign"
                disabled={editLoadingCampaignId === row.campaign_id}
              >
                {editLoadingCampaignId === row.campaign_id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
                ) : (
                  <svg
                    className="w-4 h-4 text-[#072929]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "account_name",
      label: "Account Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      getValue: (row: GoogleCampaign) => row.account_name || row.customer_id || "—",
    },
    {
      key: "advertising_channel_type",
      label: "Type",
      type: "text",
      sortable: true,
      render: (_value: any, row: GoogleCampaign) => (
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-semibold text-[#7a4dff]">
          {getChannelTypeLabel(row.advertising_channel_type) || "—"}
                        </span>
      ),
      getValue: (row: GoogleCampaign) => row.advertising_channel_type,
    },
    {
      key: "status",
      label: "State",
      type: "status",
      sortable: true,
      width: "w-[140px]",
      maxWidth: "max-w-[140px]",
      editable: true,
      statusOptions: [
                              { value: "ENABLED", label: "Enabled" },
                              { value: "PAUSED", label: "Paused" },
                              { value: "REMOVED", label: "Removed" },
      ],
      getValue: (row: GoogleCampaign) => row.status || "ENABLED",
    },
    {
      key: "budget",
      label: "Budget",
      type: "budget",
      sortable: true,
      editable: true,
      getValue: (row: GoogleCampaign) => row.daily_budget || 0,
    },
    {
      key: "start_date",
      label: "Start Date",
      type: "start_date",
      sortable: true,
      editable: true,
      getValue: (row: GoogleCampaign) => row.start_date,
    },
    {
      key: "end_date",
      label: "End Date",
      type: "end_date",
      sortable: true,
      editable: true,
      getValue: (row: GoogleCampaign) => row.end_date,
    },
    {
      key: "bidding_strategy_type",
      label: "Bid strategy type",
      type: "text",
      sortable: true,
      editable: true,
      statusOptions: [
        { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
        { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
        { value: "TARGET_CPA", label: "Target CPA" },
        { value: "TARGET_ROAS", label: "Target ROAS" },
        { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
        { value: "TARGET_SPEND", label: "Target Spend" },
        { value: "MANUAL_CPC", label: "Manual CPC" },
      ],
      getValue: (row: GoogleCampaign) => {
        const strategy = (row as any).bidding_strategy_type;
        if (!strategy) return "—";
        // Format bidding strategy type (e.g., MAXIMIZE_CONVERSIONS -> Maximize conversions)
        return strategy.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      },
    },
    {
      key: "interaction_rate",
      label: "Interaction rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).interaction_rate || 0,
    },
    {
      key: "avg_cost",
      label: "Avg. cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => {
        // Avg. cost = cost / interactions (for text ads, interactions = clicks)
        const interactions = (row as any).interactions || (row as any).clicks || 0;
        const spends = (row as any).spends || 0;
        return interactions > 0 ? spends / interactions : 0;
      },
    },
    {
      key: "spends",
      label: "Cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).spends || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      type: "number",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).clicks || 0,
    },
    {
      key: "conversion_rate",
      label: "Conv. rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).conversion_rate || 0,
    },
    {
      key: "sales",
      label: "Conv. value",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).sales || 0,
    },
    {
      key: "roas",
      label: "Conv. value / cost",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).roas || 0,
    },
    {
      key: "conversions",
      label: "Conversions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).conversions || 0,
    },
    {
      key: "avg_cpc",
      label: "Avg. CPC",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).avg_cpc || 0,
    },
    {
      key: "cost_per_conversion",
      label: "Cost / conv.",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).cost_per_conversion || 0,
    },
    {
      key: "impressions",
      label: "Impressions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).impressions || 0,
    },
    {
      key: "acos",
      label: "ACOS",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).acos || 0,
    },
  ], [getChannelTypeLabel]);

  // Handle confirm inline edit - route to appropriate handler
  const handleConfirmInlineEdit = (value: string, _field: string) => {
    if (!editingCell) return;
    onConfirmInlineEdit(value);
  };

  // Handle confirm change - route to appropriate handler (dates now use modal)
  const handleConfirmChange = (itemId: string | number, field: string, newValue: any) => {
    // Dates are handled via modal, not inline confirmation
  };

  // Handle cancel change (dates now use modal)
  const handleCancelChange = (field: string) => {
    // Dates are handled via modal, not inline confirmation
  };

  return (
    <GoogleAdsTable
      data={campaigns}
      loading={loading}
      sorting={sorting}
      accountId={accountId}
      selectedItems={selectedCampaigns}
      allSelected={allSelected}
      someSelected={someSelected}
      sortBy={sortBy}
      sortOrder={sortOrder}
      editingCell={sharedEditingCell}
      editedValue={editedValue}
      isCancelling={isCancelling}
      updatingField={sharedUpdatingField}
      pendingChanges={pendingChanges}
      summary={sharedSummary}
      columns={columns}
      getId={(row: GoogleCampaign) => row.campaign_id}
      getItemName={(row: GoogleCampaign) => row.campaign_name || "Unnamed Campaign"}
      emptyMessage='No campaigns found. Click "Sync Campaigns from Google Ads" to fetch campaigns.'
      loadingMessage="Loading campaigns..."
      onSelectAll={onSelectAll}
      onSelectItem={onSelectCampaign}
      onSort={onSort}
      onStartInlineEdit={(item: GoogleCampaign, field: string) => {
        return onStartInlineEdit(item, field as "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type");
      }}
      onCancelInlineEdit={onCancelInlineEdit}
      onInlineEditChange={onInlineEditChange}
      onConfirmInlineEdit={handleConfirmInlineEdit}
      onConfirmChange={handleConfirmChange}
      onCancelChange={handleCancelChange}
      formatCurrency={formatCurrency}
      formatPercentage={formatPercentage}
      getStatusBadge={getStatusBadge}
      getSortIcon={getSortIcon}
      isPanelOpen={isPanelOpen}
    />
  );
};

