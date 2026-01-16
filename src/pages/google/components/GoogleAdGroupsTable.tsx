import React, { useMemo } from "react";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { ColumnDefinition } from "./GoogleAdsTable";

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
  } | null;
  summary: {
    total_adgroups: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectAdgroup: (adgroupId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (adgroup: GoogleAdGroup, field: "bid" | "status" | "name" | "adgroup_name") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
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
  summary,
  onSelectAll,
  onSelectAdgroup,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
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
  } : null;

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_count: summary.total_adgroups,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
  } : null;

  // Define columns for adgroups
  const columns: ColumnDefinition[] = useMemo(() => [
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      sticky: true,
      minWidth: "min-w-[300px]",
      maxWidth: "max-w-[400px]",
      editable: true,
      getValue: (row: GoogleAdGroup) => row.adgroup_name || row.name || "Unnamed Ad Group",
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      getValue: (row: GoogleAdGroup) => row.campaign_name || "—",
      navigateTo: (row: GoogleAdGroup, accountId: string) => {
        if (row.campaign_id) {
          return `/accounts/${accountId}/google/campaigns/${row.campaign_id}`;
        }
        return null;
      },
    },
    {
      key: "account_name",
      label: "Account Name",
      type: "text",
      sortable: true,
      width: "w-[120px]",
      maxWidth: "max-w-[120px]",
      getValue: (row: GoogleAdGroup) => row.account_name || row.customer_id || "—",
    },
    {
      key: "status",
      label: "Status",
      type: "status",
      sortable: true,
      width: "w-[140px]",
      maxWidth: "max-w-[140px]",
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
      width: "w-[120px]",
      minWidth: "min-w-[120px]",
      getValue: (row: GoogleAdGroup) => row.cpc_bid_dollars || 0,
    },
    {
      key: "spends",
      label: "Spends",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.spends || 0,
    },
    {
      key: "sales",
      label: "Sales",
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
      key: "acos",
      label: "ACOS",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.acos || 0,
    },
    {
      key: "roas",
      label: "ROAS",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.roas || 0,
    },
  ], [accountId]);

  // Handle confirm inline edit
  const handleConfirmInlineEdit = (value: string, _field: string) => {
    if (!editingCell) return;
    onConfirmInlineEdit(value);
  };

  // Empty pendingChanges since we're using modal confirmation now
  const pendingChanges = useMemo(() => ({}), []);

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
      pendingChanges={pendingChanges}
      summary={sharedSummary}
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
      onConfirmChange={() => {}}
      onCancelChange={() => {}}
      formatCurrency={formatCurrency}
      formatPercentage={formatPercentage}
      getStatusBadge={getStatusBadge}
      getSortIcon={getSortIcon}
    />
  );
};

