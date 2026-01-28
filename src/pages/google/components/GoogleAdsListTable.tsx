import React, { useMemo } from "react";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { IColumnDefinition } from "../../../types/google";
import type { GoogleAd } from "./tabs/GoogleTypes";

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
    newValue: string;
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
    total_conversions?: number;
    avg_conversion_rate?: number;
    avg_cost_per_conversion?: number;
    avg_cpc?: number;
    avg_cost?: number;
    avg_interaction_rate?: number;
  } | null;
  inlineEditSuccess: {
    adId: string | number;
    field: string;
  } | null;
  inlineEditError: {
    adId: string | number;
    field: string;
    message: string;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectAd: (adId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (ad: GoogleAd, field: "status") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string, field?: string, adId?: string | number) => void;
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
  inlineEditSuccess,
  inlineEditError,
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
    newValue: updatingField.newValue || undefined,
  } : null;

  const sharedInlineEditSuccess = inlineEditSuccess ? {
    itemId: inlineEditSuccess.adId,
    field: inlineEditSuccess.field,
  } : null;

  const sharedInlineEditError = inlineEditError ? {
    itemId: inlineEditError.adId,
    field: inlineEditError.field,
    message: inlineEditError.message,
  } : null;

  // Map pending changes to shared format
  const pendingChanges = useMemo(() => ({
    status: pendingStatusChange ? {
      itemId: pendingStatusChange.adId,
      newValue: pendingStatusChange.newStatus,
      oldValue: pendingStatusChange.oldStatus,
    } : null,
  }), [pendingStatusChange]);

  // Map summary to shared format (IGoogleCampaignsSummary expects total_campaigns)
  const sharedSummary = summary ? {
    total_campaigns: summary.total_ads,
    total_count: summary.total_ads,
    total_ads: summary.total_ads,
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
  } : null;

  // Define columns for ads - reordered: ad_id, adgroup_name, campaign_name, status, ad_type
  const columns: IColumnDefinition[] = useMemo(() => [
    {
      key: "ad_id",
      label: "Ad ID",
      type: "text",
      sortable: true,
      sticky: true,
      minWidth: "min-w-[150px]",
      editable: false,
      getValue: (row: GoogleAd) => row.ad_id?.toString() || "—",
    },
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      navigateTo: (row: GoogleAd, accountId: string) => 
        row.adgroup_id ? `/brands/${accountId}/google-adgroups?adgroup_id=${row.adgroup_id}` : null,
      getValue: (row: GoogleAd) => row.adgroup_name || "—",
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      navigateTo: (row: GoogleAd, accountId: string) => 
        row.campaign_id ? `/brands/${accountId}/google-campaigns/${row.campaign_id}` : null,
      getValue: (row: GoogleAd) => row.campaign_name || "—",
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
        { value: "REMOVED", label: "Remove" },
      ],
      getValue: (row: GoogleAd) => row.status || "ENABLED",
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
      label: "Cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).spends || 0,
    },
    {
      key: "sales",
      label: "Conv. value",
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
      key: "avg_cpc",
      label: "Avg. CPC",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).avg_cpc || (row as any).cpc || 0,
    },
    {
      key: "roas",
      label: "Conv. value / cost",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).roas || 0,
    },
    {
      key: "conversions",
      label: "Conversions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).conversions || 0,
    },
    {
      key: "conversion_rate",
      label: "Conv. rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).conversion_rate || 0,
    },
    {
      key: "cost_per_conversion",
      label: "Cost / conv.",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).cost_per_conversion || 0,
    },
    {
      key: "avg_cost",
      label: "Avg. cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleAd) => {
        // Avg. cost = cost / interactions (for text ads, interactions = clicks)
        const interactions = (row as any).interactions || (row as any).clicks || 0;
        const spends = (row as any).spends || 0;
        return interactions > 0 ? spends / interactions : ((row as any).avg_cost || 0);
      },
    },
    {
      key: "interaction_rate",
      label: "Interaction rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleAd) => (row as any).interaction_rate || 0,
    },
  ], []);

  const handleConfirmInlineEdit = (value: string, field?: string, itemId?: string | number) => {
    if (field === "status") {
      // For REMOVED status, close the dropdown and let parent handle the modal
      if (value === "REMOVED") {
        // Close the dropdown immediately when modal appears
        if (onCancelInlineEdit) {
          onCancelInlineEdit();
        }
        // Pass to parent - it will handle showing the confirmation modal
        onConfirmInlineEdit(value, field, itemId);
        return;
      }
      onConfirmInlineEdit(value, field, itemId);
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
    <>
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
      inlineEditSuccess={sharedInlineEditSuccess}
      inlineEditError={sharedInlineEditError}
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
  </>
  );
};

