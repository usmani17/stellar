import React, { useMemo } from "react";
import { GoogleAdsTable } from "./GoogleAdsTable";
import { Loader } from "../../../components/ui/Loader";
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
  onConfirmInlineEdit: (value: string, fieldKey?: string) => void;
  pendingChanges?: Record<string, { itemId: string | number; newValue: string }>;
  onConfirmChange?: (itemId: string | number, fieldKey: string, newValue: string) => void;
  onCancelChange?: (fieldKey: string) => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getSortIcon: (column: string) => React.ReactElement;
  onEditAdGroup?: (adgroup: GoogleAdGroup) => void;
  editLoadingAdGroupId?: string | number | null;
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
  pendingChanges = {},
  onConfirmChange,
  onCancelChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getSortIcon,
  onEditAdGroup,
  editLoadingAdGroupId,
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

  // Define columns for adgroups - match Amazon column sizes exactly
  const columns: IColumnDefinition[] = useMemo(() => [
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      sticky: false, // Not sticky in Amazon - scrolls horizontally with table
      // Amazon: header has NO width constraint, only cell has min-w-[150px] max-w-[200px]
      // Don't set minWidth/maxWidth here - header should have no width constraint
      editable: false, // Name is not editable via click - use pencil icon instead
      getValue: (row: GoogleAdGroup) => row.adgroup_name || row.name || "Unnamed Ad Group",
      render: (value: any, row: GoogleAdGroup) => {
        // Match campaigns page pattern: pencil icon + non-clickable name
        const adgroupName = value || "Unnamed Ad Group";
        return (
          <div className="group relative flex items-center gap-2">
            {onEditAdGroup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditAdGroup(row);
                }}
                className="table-edit-icon flex-shrink-0"
                title="Edit Ad Group Name"
                disabled={editLoadingAdGroupId === row.adgroup_id}
              >
                {editLoadingAdGroupId === row.adgroup_id ? (
                  <Loader size="sm" showMessage={false} />
                ) : (
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
                )}
              </button>
            )}
            <span
              className="text-[13.3px] text-[#0b0f16] text-left truncate block w-full whitespace-nowrap"
              title={adgroupName}
            >
              {adgroupName}
            </span>
          </div>
        );
      },
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      // Amazon: min-w-[150px] max-w-[200px]
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      getValue: (row: GoogleAdGroup) => row.campaign_name || "—",
      navigateTo: (row: GoogleAdGroup, accountId: string) => {
        if (row.campaign_id) {
          return `/brands/${accountId}/google/campaigns/${row.campaign_id}`;
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
      label: "Conv. value / Cost",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleAdGroup) => row.roas || 0,
    },
  ], [accountId, onEditAdGroup, editLoadingAdGroupId]);

  // Handle confirm inline edit
  const handleConfirmInlineEdit = (value: string, _field: string) => {
    if (!editingCell) return;
    onConfirmInlineEdit(value);
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
      onConfirmChange={onConfirmChange || (() => {})}
      onCancelChange={onCancelChange || (() => {})}
      formatCurrency={formatCurrency}
      formatPercentage={formatPercentage}
      getStatusBadge={getStatusBadge}
      getSortIcon={getSortIcon}
    />
  );
};

