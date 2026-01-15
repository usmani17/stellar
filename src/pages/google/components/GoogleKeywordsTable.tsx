import React, { useMemo } from "react";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { ColumnDefinition } from "./GoogleAdsTable";

export interface GoogleKeyword {
  id: number;
  keyword_id: number;
  keyword_text?: string;
  match_type?: string;
  status?: string;
  cpc_bid_dollars?: number;
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
  // Performance metrics
  spends?: number;
  sales?: number;
  impressions?: number;
  clicks?: number;
  acos?: number;
  roas?: number;
}

interface GoogleKeywordsTableProps {
  keywords: GoogleKeyword[];
  loading: boolean;
  sorting: boolean;
  accountId: string;
  selectedKeywords: Set<string | number>;
  allSelected: boolean;
  someSelected: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  editingCell: {
    keywordId: string | number;
    field: "bid" | "status" | "match_type";
  } | null;
  editedValue: string;
  isCancelling: boolean;
  updatingField: {
    keywordId: string | number;
    field: "bid" | "status" | "match_type";
  } | null;
  pendingBidChange: {
    keywordId: string | number;
    newBid: number;
    oldBid: number;
  } | null;
  pendingStatusChange: {
    keywordId: string | number;
    newStatus: string;
    oldStatus: string;
  } | null;
  pendingMatchTypeChange: {
    keywordId: string | number;
    newMatchType: string;
    oldMatchType: string;
  } | null;
  summary: {
    total_keywords: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    avg_acos: number;
    avg_roas: number;
  } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectKeyword: (keywordId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (keyword: GoogleKeyword, field: "bid" | "status" | "match_type") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
  onConfirmBidChange: (keywordId: string | number, newBid: number) => void;
  onCancelBidChange: () => void;
  onConfirmStatusChange: (keywordId: string | number, newStatus: string) => void;
  onCancelStatusChange: () => void;
  onConfirmMatchTypeChange: (keywordId: string | number, newMatchType: string) => void;
  onCancelMatchTypeChange: () => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getMatchTypeLabel: (type?: string) => string;
  getSortIcon: (column: string) => React.ReactElement;
}

export const GoogleKeywordsTable: React.FC<GoogleKeywordsTableProps> = ({
  keywords,
  loading,
  sorting,
  accountId,
  selectedKeywords,
  allSelected,
  someSelected,
  sortBy,
  sortOrder,
  editingCell,
  editedValue,
  isCancelling,
  updatingField,
  pendingBidChange,
  pendingStatusChange,
  pendingMatchTypeChange,
  summary,
  onSelectAll,
  onSelectKeyword,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  onConfirmBidChange,
  onCancelBidChange,
  onConfirmStatusChange,
  onCancelStatusChange,
  onConfirmMatchTypeChange,
  onCancelMatchTypeChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getMatchTypeLabel,
  getSortIcon,
}) => {
  // Map editingCell to shared component format
  const sharedEditingCell = editingCell ? {
    itemId: editingCell.keywordId,
    field: editingCell.field,
  } : null;

  const sharedUpdatingField = updatingField ? {
    itemId: updatingField.keywordId,
    field: updatingField.field,
  } : null;

  // Map pending changes to shared format
  const pendingChanges = useMemo(() => ({
    bid: pendingBidChange ? {
      itemId: pendingBidChange.keywordId,
      newValue: pendingBidChange.newBid,
      oldValue: pendingBidChange.oldBid,
    } : null,
    status: pendingStatusChange ? {
      itemId: pendingStatusChange.keywordId,
      newValue: pendingStatusChange.newStatus,
      oldValue: pendingStatusChange.oldStatus,
    } : null,
    match_type: pendingMatchTypeChange ? {
      itemId: pendingMatchTypeChange.keywordId,
      newValue: pendingMatchTypeChange.newMatchType,
      oldValue: pendingMatchTypeChange.oldMatchType,
    } : null,
  }), [pendingBidChange, pendingStatusChange, pendingMatchTypeChange]);

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_count: summary.total_keywords,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
  } : null;

  // Define columns for keywords
  const columns: ColumnDefinition[] = useMemo(() => [
    {
      key: "keyword_text",
      label: "Keyword",
      type: "text",
      sortable: true,
      sticky: true,
      minWidth: "min-w-[300px]",
      maxWidth: "max-w-[400px]",
      editable: false,
      getValue: (row: GoogleKeyword) => row.keyword_text || "—",
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      getValue: (row: GoogleKeyword) => row.campaign_name || "—",
    },
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      getValue: (row: GoogleKeyword) => row.adgroup_name || "—",
    },
    {
      key: "match_type",
      label: "Match Type",
      type: "status",
      sortable: true,
      editable: true,
      width: "w-[140px]",
      maxWidth: "max-w-[140px]",
      statusOptions: [
        { value: "EXACT", label: "Exact" },
        { value: "PHRASE", label: "Phrase" },
        { value: "BROAD", label: "Broad" },
      ],
      // Remove custom render to allow editable behavior - use default status rendering
      // The purple styling can be added via CSS if needed
      getValue: (row: GoogleKeyword) => row.match_type || "EXACT",
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
      ],
      getValue: (row: GoogleKeyword) => row.status || "ENABLED",
    },
    {
      key: "bid",
      label: "Bid",
      type: "budget",
      sortable: true,
      editable: true,
      getValue: (row: GoogleKeyword) => row.cpc_bid_dollars || 0,
    },
    {
      key: "spends",
      label: "Spends",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).spends || 0,
    },
    {
      key: "sales",
      label: "Sales",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).sales || 0,
    },
    {
      key: "impressions",
      label: "Impressions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).impressions || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      type: "number",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).clicks || 0,
    },
    {
      key: "acos",
      label: "ACOS",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).acos || 0,
    },
    {
      key: "roas",
      label: "ROAS",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).roas || 0,
    },
  ], [getMatchTypeLabel]);

  // Handle confirm inline edit - route to appropriate handler
  const handleConfirmInlineEdit = (value: string, _field: string) => {
    if (!editingCell) return;
    onConfirmInlineEdit(value);
  };

  // Handle confirm change - route to appropriate handler
  const handleConfirmChange = (itemId: string | number, field: string, newValue: any) => {
    if (field === "status") {
      onConfirmStatusChange(itemId, newValue);
    } else if (field === "bid") {
      onConfirmBidChange(itemId, newValue);
    } else if (field === "match_type") {
      onConfirmMatchTypeChange(itemId, newValue);
    }
  };

  // Handle cancel change
  const handleCancelChange = (field: string) => {
    if (field === "status") {
      onCancelStatusChange();
    } else if (field === "bid") {
      onCancelBidChange();
    } else if (field === "match_type") {
      onCancelMatchTypeChange();
    }
  };

  return (
    <GoogleAdsTable
      data={keywords}
      loading={loading}
      sorting={sorting}
      accountId={accountId}
      selectedItems={selectedKeywords}
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
      getId={(row: GoogleKeyword) => row.keyword_id}
      getItemName={(row: GoogleKeyword) => row.keyword_text || "Unnamed Keyword"}
      emptyMessage='No keywords found. Click "Sync Keywords from Google Ads" to fetch keywords.'
      loadingMessage="Loading keywords..."
      onSelectAll={onSelectAll}
      onSelectItem={onSelectKeyword}
      onSort={onSort}
      onStartInlineEdit={(item: GoogleKeyword, field: string) => {
        return onStartInlineEdit(item, field as "bid" | "status" | "match_type");
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

