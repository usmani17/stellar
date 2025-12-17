import React, { useMemo } from "react";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { ColumnDefinition } from "./GoogleAdsTable";
import type { GoogleAd } from "./tabs/types";

export interface GoogleAdsListTableProps {
  ads: GoogleAd[];
  loading: boolean;
  sorting: boolean;
  accountId: string;
  selectedAds: Set<string | number>;
  allSelected: boolean;
  someSelected: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  editingCell: {
    adId: string | number;
    field: "status";
  } | null;
  editedValue: string;
  isCancelling: boolean;
  updatingField: {
    adId: string | number;
    field: "status";
  } | null;
  pendingStatusChange: {
    adId: string | number;
    newStatus: string;
    oldStatus: string;
  } | null;
  summary: {
    total_ads: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectAd: (adId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (ad: GoogleAd, field: "status") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
  onConfirmStatusChange: (adId: string | number, newStatus: string) => void;
  onCancelStatusChange: () => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getSortIcon: (column: string) => React.ReactElement;
}

export const GoogleAdsListTable: React.FC<GoogleAdsListTableProps> = ({
  ads,
  loading,
  sorting,
  accountId,
  selectedAds,
  allSelected,
  someSelected,
  sortBy,
  sortOrder,
  editingCell,
  editedValue,
  isCancelling,
  updatingField,
  pendingStatusChange,
  summary,
  onSelectAll,
  onSelectAd,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  onConfirmStatusChange,
  onCancelStatusChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getSortIcon,
}) => {
  // Map editingCell to shared component format
  const sharedEditingCell = editingCell ? {
    itemId: editingCell.adId,
    field: editingCell.field,
  } : null;

  const sharedUpdatingField = updatingField ? {
    itemId: updatingField.adId,
    field: updatingField.field,
  } : null;

  // Map pending changes to shared format
  const pendingChanges = useMemo(() => ({
    status: pendingStatusChange ? {
      itemId: pendingStatusChange.adId,
      newValue: pendingStatusChange.newStatus,
      oldValue: pendingStatusChange.oldStatus,
    } : null,
  }), [pendingStatusChange]);

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_count: summary.total_ads,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
  } : null;

  // Define columns for ads
  const columns: ColumnDefinition[] = useMemo(() => [
    {
      key: "ad_id",
      label: "Ad ID",
      type: "text",
      sortable: true,
      sticky: true,
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      editable: false,
      getValue: (row: GoogleAd) => row.ad_id?.toString() || "—",
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      navigateTo: (row: GoogleAd, accountId: string) => 
        row.campaign_id ? `/accounts/${accountId}/google/campaigns/${row.campaign_id}` : null,
      getValue: (row: GoogleAd) => row.campaign_name || "—",
    },
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      navigateTo: (row: GoogleAd, accountId: string) => 
        row.adgroup_id ? `/accounts/${accountId}/google/adgroups?adgroup_id=${row.adgroup_id}` : null,
      getValue: (row: GoogleAd) => row.adgroup_name || "—",
    },
    {
      key: "ad_type",
      label: "Ad Type",
      type: "text",
      sortable: true,
      minWidth: "min-w-[150px]",
      getValue: (row: GoogleAd) => row.ad_type || "—",
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
        { value: "REMOVED", label: "Removed" },
      ],
      getValue: (row: GoogleAd) => row.status || "ENABLED",
    },
    {
      key: "impressions",
      label: "Impressions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).impressions || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      type: "number",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).clicks || 0,
    },
    {
      key: "spends",
      label: "Spends",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).spends || 0,
    },
    {
      key: "sales",
      label: "Sales",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).sales || 0,
    },
    {
      key: "ctr",
      label: "CTR",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).ctr || 0,
    },
    {
      key: "cpc",
      label: "CPC",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).cpc || 0,
    },
    {
      key: "roas",
      label: "ROAS",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).roas || 0,
    },
    {
      key: "acos",
      label: "ACOS",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).acos || 0,
    },
  ], []);

  const handleConfirmInlineEdit = (value: string, field: string) => {
    if (field === "status") {
      onConfirmInlineEdit(value);
    }
  };

  const handleConfirmChange = (itemId: string | number, field: string, newValue: any) => {
    if (field === "status") {
      onConfirmStatusChange(itemId, newValue);
    }
  };

  const handleCancelChange = (field: string) => {
    if (field === "status") {
      onCancelStatusChange();
    }
  };

  return (
    <GoogleAdsTable
      data={ads}
      loading={loading}
      sorting={sorting}
      accountId={accountId}
      selectedItems={selectedAds}
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
      getId={(row: GoogleAd) => row.ad_id || row.id}
      getItemName={(row: GoogleAd) => `Ad ${row.ad_id || row.id}`}
      emptyMessage="No ads found"
      loadingMessage="Loading ads..."
      onSelectAll={onSelectAll}
      onSelectItem={onSelectAd}
      onSort={onSort}
      onStartInlineEdit={(item: GoogleAd, field: string) => {
        if (field === "status") {
          onStartInlineEdit(item, "status");
        }
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

