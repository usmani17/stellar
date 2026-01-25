import React, { useMemo } from "react";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { IColumnDefinition } from "../../../types/google";

export interface GoogleAdGroup {
  id: number;
  adgroup_id: number;
  customer_id: string;
  adgroup_name?: string;
  name?: string;
  account_name?: string;
  campaign_id?: number;
  campaign_name?: string;
  status: string;
  cpc_bid_dollars?: number;
  // Performance metrics
  spends?: number;
  sales?: number;
  impressions?: number;
  clicks?: number;
  acos?: number;
  roas?: number;
}

interface GoogleAdGroupsTableProps {
  adgroups: GoogleAdGroup[];
  loading: boolean;
  sorting: boolean;
  accountId: string;
  selectedAdgroups: Set<string | number>;
  allSelected: boolean;
  someSelected: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  editingCell: {
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
  } | null;
  editedValue: string;
  isCancelling: boolean;
  updatingField: {
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
    newValue?: string;
  } | null;
  inlineEditSuccess?: {
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
  } | null;
  inlineEditError?: {
    adgroupId: string | number;
    field: "bid" | "status" | "name" | "adgroup_name";
    message: string;
  } | null;
  summary: {
    total_adgroups: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
    total_conversions?: number;
    avg_conversion_rate?: number;
    avg_cost_per_conversion?: number;
    avg_cpc?: number;
    avg_cost?: number;
    avg_interaction_rate?: number;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectAdgroup: (adgroupId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (adgroup: GoogleAdGroup, field: "bid" | "status" | "name" | "adgroup_name") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string, fieldKey?: string, itemId?: string | number) => void;
  pendingChanges?: Record<string, { itemId: string | number; newValue: string }>;
  onConfirmChange?: (itemId: string | number, fieldKey: string, newValue: string) => void;
  onCancelChange?: (fieldKey: string) => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getSortIcon: (column: string) => React.ReactElement;
}

export const GoogleAdGroupsTable: React.FC<GoogleAdGroupsTableProps> = ({
  adgroups,
  loading,
  sorting,
  accountId,
  selectedAdgroups,
  allSelected,
  someSelected,
  sortBy,
  sortOrder,
  editingCell,
  editedValue,
  isCancelling,
  updatingField,
  inlineEditSuccess,
  inlineEditError,
  summary,
  onSelectAll,
  onSelectAdgroup,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  pendingChanges = {},
  onConfirmChange,
  onCancelChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getSortIcon,
}) => {
  // Map editingCell to shared component format
  const sharedEditingCell = editingCell ? {
    itemId: editingCell.adgroupId,
    field: editingCell.field,
  } : null;

  const sharedUpdatingField = updatingField ? {
    itemId: updatingField.adgroupId,
    field: updatingField.field,
    newValue: updatingField.newValue || undefined,
  } : null;

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_campaigns: summary.total_adgroups, // Map to total_campaigns for compatibility
    total_count: summary.total_adgroups,
    total_adgroups: summary.total_adgroups,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
    total_conversions: summary.total_conversions,
    avg_conversion_rate: summary.avg_conversion_rate,
    avg_cost_per_conversion: summary.avg_cost_per_conversion,
    avg_cpc: summary.avg_cpc,
    avg_cost: summary.avg_cost,
    avg_interaction_rate: summary.avg_interaction_rate,
  } as any : null;

  // Define columns for adgroups - match Amazon column sizes exactly
  const columns: IColumnDefinition[] = useMemo(() => [
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      sticky: false, // Not sticky in Amazon - scrolls horizontally with table
      // Set minWidth to ensure column doesn't get too narrow, but no maxWidth to allow dynamic expansion
      // Use a larger minWidth to accommodate longer ad group names
      minWidth: "min-w-[250px]",
      editable: true, // Make editable inline (same pattern as bid editing)
      getValue: (row: GoogleAdGroup) => row.adgroup_name || row.name || "Unnamed Ad Group",
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      // Set minWidth but no maxWidth to allow dynamic expansion
      minWidth: "min-w-[200px]",
      getValue: (row: GoogleAdGroup) => row.campaign_name || "—",
      navigateTo: (row: GoogleAdGroup, accountId: string) => {
        if (row.campaign_id) {
          return `/brands/${accountId}/google-campaigns/${row.campaign_id}`;
        }
        return null;
      },
    },
    {
      key: "account_name",
      label: "Brand Name",
      type: "text",
      sortable: true,
      // Amazon doesn't have this column, but keep it compact
      width: "w-[120px]",
      maxWidth: "max-w-[120px]",
      getValue: (row: GoogleAdGroup) => row.account_name || row.customer_id || "—",
    },
    {
      key: "status",
      label: "Status",
      type: "status",
      sortable: true,
      // Amazon State column: min-w-[115px]
      minWidth: "min-w-[115px]",
      editable: true,
      statusOptions: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
      ],
      getValue: (row: GoogleAdGroup) => row.status || "ENABLED",
    },
    {
      key: "bid",
      label: "Default max. CPC",
      type: "bid",
      sortable: true,
      editable: true,
      // Amazon Default Bid: no specific width constraint, let it size naturally
      getValue: (row: GoogleAdGroup) => row.cpc_bid_dollars || 0,
    },
    {
      key: "spends",
      label: "Cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.spends || 0,
    },
    {
      key: "sales",
      label: "Conv. value",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.sales || 0,
    },
    {
      key: "impressions",
      label: "Impressions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.impressions || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      type: "number",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.clicks || 0,
    },
    {
      key: "roas",
      label: "Conv. value / cost",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.roas || 0,
    },
    {
      key: "ctr",
      label: "CTR",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAdGroup) => (row as any).ctr || 0,
    },
    {
      key: "avg_cpc",
      label: "Avg. CPC",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAdGroup) => (row as any).avg_cpc || (row as any).cpc || 0,
    },
    {
      key: "conversions",
      label: "Conversions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleAdGroup) => (row as any).conversions || 0,
    },
    {
      key: "conversion_rate",
      label: "Conv. rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAdGroup) => (row as any).conversion_rate || 0,
    },
    {
      key: "cost_per_conversion",
      label: "Cost / conv.",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAdGroup) => (row as any).cost_per_conversion || 0,
    },
    {
      key: "avg_cost",
      label: "Avg. cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAdGroup) => {
        // Avg. cost = cost / interactions (for text ads, interactions = clicks)
        const interactions = (row as any).interactions || row.clicks || 0;
        const spends = row.spends || 0;
        return interactions > 0 ? spends / interactions : ((row as any).avg_cost || 0);
      },
    },
    {
      key: "interaction_rate",
      label: "Interaction rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAdGroup) => (row as any).interaction_rate || 0,
    },
  ], [accountId]);

  // Handle confirm inline edit - route to appropriate handler
  const handleConfirmInlineEdit = (value: string, field?: string, itemIdParam?: string | number) => {
    // Pass all parameters to parent handler
    onConfirmInlineEdit(value, field, itemIdParam);
  };

  // pendingChanges is now passed as a prop

  return (
    <GoogleAdsTable
      data={adgroups}
      loading={loading}
      sorting={sorting}
      accountId={accountId}
      selectedItems={selectedAdgroups}
      allSelected={allSelected}
      someSelected={someSelected}
      sortBy={sortBy}
      sortOrder={sortOrder}
      editingCell={sharedEditingCell}
      editedValue={editedValue}
      isCancelling={isCancelling}
      updatingField={sharedUpdatingField}
      pendingChanges={pendingChanges as any}
      summary={sharedSummary}
      inlineEditSuccess={inlineEditSuccess ? {
        itemId: inlineEditSuccess.adgroupId,
        field: inlineEditSuccess.field,
      } : null}
      inlineEditError={inlineEditError ? {
        itemId: inlineEditError.adgroupId,
        field: inlineEditError.field,
        message: inlineEditError.message,
      } : null}
      columns={columns}
      getId={(row: GoogleAdGroup) => row.adgroup_id}
      getItemName={(row: GoogleAdGroup) => row.adgroup_name || row.name || "Unnamed Ad Group"}
      emptyMessage='No adgroups found. Click "Sync AdGroups from Google Ads" to fetch adgroups.'
      loadingMessage="Loading adgroups..."
      onSelectAll={onSelectAll}
      onSelectItem={onSelectAdgroup}
      onSort={onSort}
      onStartInlineEdit={(item: GoogleAdGroup, field: string) => {
        return onStartInlineEdit(item, field as "bid" | "status" | "name" | "adgroup_name");
      }}
      onCancelInlineEdit={onCancelInlineEdit}
      onInlineEditChange={onInlineEditChange}
      onConfirmInlineEdit={handleConfirmInlineEdit}
      onConfirmChange={onConfirmChange || (() => {})}
      onCancelChange={onCancelChange || (() => {})}
      formatCurrency={formatCurrency}
      formatPercentage={formatPercentage}
      getStatusBadge={getStatusBadge}
      getSortIcon={getSortIcon}
    />
  );
};

