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
  campaign_status?: string;
  adgroup_id?: number;
  adgroup_name?: string;
  adgroup_status?: string;
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
  channelId?: string;
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
    newValue?: string;
  } | null;
  pendingChanges?: Record<string, { itemId: string | number; newValue: string }>;
  inlineEditSuccess?: {
    keywordId: string | number;
    field: string;
  } | null;
  inlineEditError?: {
    keywordId: string | number;
    field: string;
    message: string;
  } | null;
  summary: {
    total_keywords: number;
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
  onSelectKeyword: (keywordId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (keyword: GoogleKeyword, field: "bid" | "status" | "match_type" | "keyword_text") => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string, fieldKey?: string, itemId?: string | number) => void;
  onStartFinalUrlEdit?: (keyword: GoogleKeyword) => void;
  onConfirmChange?: (itemId: string | number, fieldKey: string, newValue: string) => void;
  onCancelChange?: (fieldKey: string) => void;
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
  channelId,
  selectedKeywords,
  allSelected,
  someSelected,
  sortBy,
  sortOrder,
  editingCell,
  editedValue,
  isCancelling,
  updatingField,
  pendingChanges = {},
  inlineEditSuccess,
  inlineEditError,
  summary,
  onSelectAll,
  onSelectKeyword,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  onStartFinalUrlEdit,
  onConfirmChange,
  onCancelChange,
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
    newValue: (updatingField as any).newValue || undefined,
  } : null;

  // Map inline success/error to shared format
  const sharedInlineEditSuccess = inlineEditSuccess ? {
    itemId: inlineEditSuccess.keywordId,
    field: inlineEditSuccess.field,
  } : null;

  const sharedInlineEditError = inlineEditError ? {
    itemId: inlineEditError.keywordId,
    field: inlineEditError.field,
    message: inlineEditError.message,
  } : null;

  // Map summary to shared format
  const sharedSummary = summary ? {
    total_campaigns: summary.total_keywords, // Map total_keywords to total_campaigns for compatibility
    total_count: summary.total_keywords,
    total_keywords: summary.total_keywords,
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

  // Define columns for keywords - matching Google AdWords UI
  const columns: IColumnDefinition[] = useMemo(() => [
    {
      key: "keyword_text",
      label: "Keywords",
      type: "text",
      sortable: true,
      sticky: false,
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      editable: true,
      getValue: (row: GoogleKeyword) => row.keyword_text || "—",
    },
    {
      key: "adgroup_name",
      label: "Ad Group Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[150px]",
      maxWidth: "max-w-[200px]",
      editable: false, // Not editable, just plain text
      getValue: (row: GoogleKeyword) => row.adgroup_name || "—",
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
              const navPath = channelId 
                ? `/brands/${currentAccountId}/${channelId}/google/campaigns/${campaignId}`
                : `/brands/${currentAccountId}/google-campaigns/${campaignId}`;
              navigate(navPath);
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
      key: "status",
      label: "Status",
      type: "status",
      sortable: true,
      minWidth: "min-w-[115px]",
      editable: true,
      statusOptions: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
        { value: "REMOVED", label: "Remove" },
      ],
      getValue: (row: GoogleKeyword) => row.status || "",
    },
    {
      key: "bid",
      label: "Max. CPC",
      type: "budget",
      sortable: true,
      editable: true,
      getValue: (row: GoogleKeyword) => {
        // Handle null/undefined properly - only default to 0 if truly missing
        const bid = row.cpc_bid_dollars;
        return bid !== undefined && bid !== null ? bid : 0;
      },
    },
    {
      key: "match_type",
      label: "Match Type",
      type: "status",
      sortable: true,
      editable: false, // Disabled: Google Ads API doesn't allow updating keyword match type
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
      label: "Conv. value / cost",
      type: "roas",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).roas || 0,
    },
    {
      key: "avg_cpc",
      label: "Avg. CPC",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).avg_cpc || (row as any).cpc || 0,
    },
    {
      key: "conversions",
      label: "Conversions",
      type: "number",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).conversions || 0,
    },
    {
      key: "conversion_rate",
      label: "Conv. rate",
      type: "percentage",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).conversion_rate || 0,
    },
    {
      key: "cost_per_conversion",
      label: "Cost / conv.",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleKeyword) => (row as any).cost_per_conversion || 0,
    },
    {
      key: "avg_cost",
      label: "Avg. cost",
      type: "currency",
      sortable: true,
      getValue: (row: GoogleKeyword) => {
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
      getValue: (row: GoogleKeyword) => (row as any).interaction_rate || 0,
    },
  ], [currentAccountId, navigate, onStartFinalUrlEdit]);

  // Handle confirm inline edit - route to appropriate handler
  const handleConfirmInlineEdit = (value: string, field?: string, itemIdParam?: string | number) => {
    // Use the field parameter if provided, otherwise fall back to editingCell
    const fieldToUse = field || editingCell?.field;
    if (!fieldToUse) {
      return;
    }

    // Use itemIdParam if provided, otherwise fall back to editingCell
    const keywordIdToUse = itemIdParam || editingCell?.keywordId;
    if (!keywordIdToUse) {
      return;
    }

    // For REMOVED status, close the dropdown and let parent handle the modal
    if (fieldToUse === "status" && value && value.toUpperCase() === "REMOVED") {
      // Close the dropdown immediately when modal appears
      if (onCancelInlineEdit) {
        onCancelInlineEdit();
      }
      // Pass to parent - it will handle showing the confirmation modal
      onConfirmInlineEdit(value, fieldToUse, keywordIdToUse);
      return;
    }

    // Pass all parameters to parent handler
    onConfirmInlineEdit(value, fieldToUse, keywordIdToUse);
  };

  // Handle confirm change - route to parent handler
  const handleConfirmChange = (itemId: string | number, field: string, newValue: any) => {
    if (onConfirmChange) {
      onConfirmChange(itemId, field, newValue);
    }
  };

  // Handle cancel change - route to parent handler
  const handleCancelChange = (field: string) => {
    if (onCancelChange) {
      onCancelChange(field);
    }
  };

  return (
    <>
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
      pendingChanges={pendingChanges as any}
      summary={sharedSummary}
      inlineEditSuccess={sharedInlineEditSuccess}
      inlineEditError={sharedInlineEditError}
      columns={columns}
      getId={(row: GoogleKeyword) => {
        // Use composite key (keyword_id:adgroup_id) to ensure uniqueness
        // when same keyword_id exists in different adgroups
        if (row.adgroup_id) {
          return `${row.keyword_id}:${row.adgroup_id}`;
        }
        return row.keyword_id;
      }}
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
  </>
  );
};

