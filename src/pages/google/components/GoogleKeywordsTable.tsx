import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { GoogleAdsTable } from "./GoogleAdsTable";
import type { IColumnDefinition } from "../../../types/google";

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
  // Final URLs
  final_urls?: string[] | string;
  final_mobile_urls?: string[] | string;
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
    field: "bid" | "status" | "match_type" | "keyword_text";
  } | null;
  editedValue: string;
  isCancelling: boolean;
  updatingField: {
    keywordId: string | number;
    field: "bid" | "status" | "match_type" | "keyword_text";
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
  onStartInlineEdit: (keyword: GoogleKeyword, field: "bid" | "status" | "match_type" | "keyword_text") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string) => void;
  onStartFinalUrlEdit?: (keyword: GoogleKeyword) => void;
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
  onStartFinalUrlEdit,
  onConfirmBidChange,
  onCancelBidChange,
  onConfirmStatusChange,
  onCancelStatusChange,
  onConfirmMatchTypeChange,
  onCancelMatchTypeChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getSortIcon,
}) => {
  const navigate = useNavigate();
  const params = useParams<{ accountId: string }>();
  const currentAccountId = accountId || params.accountId;
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
    total_campaigns: summary.total_keywords, // Map total_keywords to total_campaigns for compatibility
    total_count: summary.total_keywords,
    total_spends: summary.total_spends,
    total_sales: summary.total_sales,
    total_impressions: summary.total_impressions,
    total_clicks: summary.total_clicks,
    avg_acos: summary.avg_acos,
    avg_roas: summary.avg_roas,
  } : null;

  // Define columns for keywords - matching Amazon keyword table structure
  const columns: IColumnDefinition[] = useMemo(() => [
    {
      key: "keyword_text",
      label: "Keyword Name",
      type: "text",
      sortable: true,
      sticky: false,
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      editable: true,
      getValue: (row: GoogleKeyword) => row.keyword_text || "—",
    },
    {
      key: "status",
      label: "State",
      type: "status",
      sortable: true,
      minWidth: "min-w-[115px]",
      editable: true,
      statusOptions: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
      ],
      getValue: (row: GoogleKeyword) => row.status || "",
    },
    {
      key: "bid",
      label: "Keyword Bid",
      type: "budget",
      sortable: true,
      editable: true,
      getValue: (row: GoogleKeyword) => row.cpc_bid_dollars || 0,
    },
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      getValue: (row: GoogleKeyword) => row.campaign_name || "—",
      render: (value: any, row: GoogleKeyword) => {
        const campaignName = value === "—" ? "—" : value;
        const campaignId = row.campaign_id;
        
        if (campaignName === "—" || !campaignId || !currentAccountId) {
          return <span className="table-text">{campaignName}</span>;
        }
        
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/accounts/${currentAccountId}/google/campaigns/${campaignId}`);
            }}
            className="table-edit-link text-left truncate"
            title={`View campaign: ${campaignName}`}
          >
            {campaignName}
          </button>
        );
      },
    },
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      getValue: (row: GoogleKeyword) => row.adgroup_name || "—",
      render: (value: any, row: GoogleKeyword) => {
        const adgroupName = value === "—" ? "—" : value;
        const campaignId = row.campaign_id;
        
        if (adgroupName === "—" || !campaignId || !currentAccountId) {
          return <span className="table-text leading-[1.26]">{adgroupName}</span>;
        }
        
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to campaign detail page with adgroups tab
              navigate(`/accounts/${currentAccountId}/google/campaigns/${campaignId}?tab=Ad Groups`);
            }}
            className="table-edit-link text-left truncate block w-full"
            title={`View ad group: ${adgroupName}`}
          >
            {adgroupName}
          </button>
        );
      },
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
      getValue: (row: GoogleKeyword) => row.match_type || "EXACT",
    },
    {
      key: "final_url",
      label: "Final URL",
      type: "text",
      sortable: false,
      minWidth: "min-w-[250px]",
      editable: false,
      getValue: (row: GoogleKeyword) => {
        // Try multiple possible field names
        const finalUrls = (row as any).final_urls || (row as any).finalUrls || null;
        if (Array.isArray(finalUrls) && finalUrls.length > 0) {
          return finalUrls.join(", ");
        }
        if (typeof finalUrls === "string" && finalUrls.trim()) {
          return finalUrls.trim();
        }
        return "—";
      },
      render: (_value: any, row: GoogleKeyword) => {
        // Try multiple possible field names
        const finalUrls = (row as any).final_urls || (row as any).finalUrls || null;
        const finalMobileUrls = (row as any).final_mobile_urls || (row as any).finalMobileUrls || null;
        
        // Debug logging (remove in production)
        if (import.meta.env.DEV && keywords.length > 0 && row.keyword_id === keywords[0]?.keyword_id) {
          console.log('Final URL Debug:', {
            keyword_id: row.keyword_id,
            final_urls: finalUrls,
            final_mobile_urls: finalMobileUrls,
            row_keys: Object.keys(row),
            full_row: row,
          });
        }
        
        // Parse if string (comma-separated or single URL)
        const urlsArray = Array.isArray(finalUrls) 
          ? finalUrls.filter(u => u && u.trim())
          : (typeof finalUrls === "string" && finalUrls.trim() ? finalUrls.split(",").map(u => u.trim()).filter(u => u) : []);
        const mobileUrlsArray = Array.isArray(finalMobileUrls)
          ? finalMobileUrls.filter(u => u && u.trim())
          : (typeof finalMobileUrls === "string" && finalMobileUrls.trim() ? finalMobileUrls.split(",").map(u => u.trim()).filter(u => u) : []);
        
        const hasUrls = urlsArray.length > 0;
        const hasMobileUrls = mobileUrlsArray.length > 0;
        
        return (
          <div className="flex items-center gap-2 group">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {hasUrls && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500">Desktop:</span>
                  <span className="table-text truncate" title={urlsArray.join(", ")}>
                    {urlsArray.length > 1 ? `${urlsArray[0]} (+${urlsArray.length - 1} more)` : urlsArray[0]}
                  </span>
                </div>
              )}
              {hasMobileUrls && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500">Mobile:</span>
                  <span className="table-text truncate" title={mobileUrlsArray.join(", ")}>
                    {mobileUrlsArray.length > 1 ? `${mobileUrlsArray[0]} (+${mobileUrlsArray.length - 1} more)` : mobileUrlsArray[0]}
                  </span>
                </div>
              )}
              {!hasUrls && !hasMobileUrls && <span className="table-text">—</span>}
            </div>
            {onStartFinalUrlEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartFinalUrlEdit(row);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#136D6D] hover:text-[#0e5a5a] flex-shrink-0"
                title="Edit Final URL"
              >
                <svg
                  className="w-4 h-4"
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
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "spends",
      label: "Cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).spends || 0,
    },
    {
      key: "sales",
      label: "Conv. value",
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
      key: "ctr",
      label: "CTR",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).ctr || 0,
    },
    {
      key: "roas",
      label: "Conv. value / Cost",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).roas || 0,
    },
  ], [currentAccountId, navigate, onStartFinalUrlEdit]);

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
        return onStartInlineEdit(item, field as "bid" | "status" | "match_type" | "keyword_text");
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

