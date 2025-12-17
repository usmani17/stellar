import React, { useMemo } from "react";
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
  updatingField: {
    campaignId: string | number;
    field: "budget" | "status" | "start_date" | "end_date";
  } | null;
  pendingBudgetChange: {
    campaignId: string | number;
    newBudget: number;
    oldBudget: number;
  } | null;
  pendingStatusChange: {
    campaignId: string | number;
    newStatus: string;
    oldStatus: string;
  } | null;
  pendingDateChange: {
    campaignId: string | number;
    field: "start_date" | "end_date";
    newDate: string;
    oldDate: string;
  } | null;
  summary: {
    total_campaigns: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectCampaign: (campaignId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (campaign: GoogleCampaign, field: "budget" | "status" | "start_date" | "end_date") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
  onConfirmBudgetChange: (campaignId: string | number, newBudget: number) => void;
  onCancelBudgetChange: () => void;
  onConfirmStatusChange: (campaignId: string | number, newStatus: string) => void;
  onCancelStatusChange: () => void;
  onConfirmDateChange: (campaignId: string | number, field: "start_date" | "end_date", newDate: string) => void;
  onCancelDateChange: () => void;
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
  updatingField,
  pendingBudgetChange,
  pendingStatusChange,
  pendingDateChange,
  summary,
  onSelectAll,
  onSelectCampaign,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  onConfirmBudgetChange,
  onCancelBudgetChange,
  onConfirmStatusChange,
  onCancelStatusChange,
  onConfirmDateChange,
  onCancelDateChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getChannelTypeLabel,
  getSortIcon,
}) => {
  // Map editingCell to shared component format
  const sharedEditingCell = editingCell ? {
    itemId: editingCell.campaignId,
    field: editingCell.field,
  } : null;

  const sharedUpdatingField = updatingField ? {
    itemId: updatingField.campaignId,
    field: updatingField.field,
  } : null;

  // Map pending changes to shared format
  const pendingChanges = useMemo(() => ({
    budget: pendingBudgetChange ? {
      itemId: pendingBudgetChange.campaignId,
      newValue: pendingBudgetChange.newBudget,
      oldValue: pendingBudgetChange.oldBudget,
    } : null,
    status: pendingStatusChange ? {
      itemId: pendingStatusChange.campaignId,
      newValue: pendingStatusChange.newStatus,
      oldValue: pendingStatusChange.oldStatus,
    } : null,
    start_date: pendingDateChange?.field === "start_date" ? {
      itemId: pendingDateChange.campaignId,
      newValue: pendingDateChange.newDate,
      oldValue: pendingDateChange.oldDate,
    } : null,
    end_date: pendingDateChange?.field === "end_date" ? {
      itemId: pendingDateChange.campaignId,
      newValue: pendingDateChange.newDate,
      oldValue: pendingDateChange.oldDate,
    } : null,
  }), [pendingBudgetChange, pendingStatusChange, pendingDateChange]);

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_count: summary.total_campaigns,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
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
      key: "spends",
      label: "Spends",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).spends || 0,
    },
    {
      key: "sales",
      label: "Sales",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).sales || 0,
    },
    {
      key: "impressions",
      label: "Impressions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).impressions || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      type: "number",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).clicks || 0,
    },
    {
      key: "acos",
      label: "ACOS",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).acos || 0,
    },
    {
      key: "roas",
      label: "ROAS",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleCampaign) => (row as any).roas || 0,
    },
  ], [getChannelTypeLabel]);

  // Handle confirm inline edit - route to appropriate handler
  const handleConfirmInlineEdit = (value: string, _field: string) => {
    if (!editingCell) return;
    onConfirmInlineEdit(value);
  };

  // Handle confirm change - route to appropriate handler
  const handleConfirmChange = (itemId: string | number, field: string, newValue: any) => {
    if (field === "status") {
      onConfirmStatusChange(itemId, newValue);
    } else if (field === "budget") {
      onConfirmBudgetChange(itemId, newValue);
    } else if (field === "start_date" || field === "end_date") {
      onConfirmDateChange(itemId, field as "start_date" | "end_date", newValue);
    }
  };

  // Handle cancel change
  const handleCancelChange = (field: string) => {
    if (field === "status") {
      onCancelStatusChange();
    } else if (field === "budget") {
      onCancelBudgetChange();
    } else if (field === "start_date" || field === "end_date") {
      onCancelDateChange();
    }
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
        return onStartInlineEdit(item, field as "budget" | "status" | "start_date" | "end_date");
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
    />
  );
};

