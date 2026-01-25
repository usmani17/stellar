import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAdsTable } from "./GoogleAdsTable";
import { Loader } from "../../../components/ui/Loader";
import type { IGoogleCampaignsTableProps, IGoogleCampaign } from "../../../types/google/campaign";
import type { IColumnDefinition } from "../../../types/google";


export const GoogleCampaignsTable: React.FC<IGoogleCampaignsTableProps> = ({
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
  visibleColumns,
  columnOrder,
  inlineEditSuccess,
  inlineEditError,
  onSelectAll,
  onSelectCampaign,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  onConfirmInlineEditDirect,
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
    newValue: updatingField.newValue,
  } : null;

  // Map pending changes to shared format (dates now use modal, so no pending changes)
  const pendingChanges = useMemo(() => ({}), []);

  // Define columns for campaigns
  const allColumns: IColumnDefinition[] = useMemo(() => [
    {
      key: "campaign_name",
      label: "Campaign Name",
      type: "text",
      sortable: true,
      sticky: true,
      minWidth: "min-w-[300px]",
      maxWidth: "max-w-[400px]",
      editable: false,
      navigateTo: (row: IGoogleCampaign, accountId: string) =>
        `/brands/${accountId}/google-campaigns/${row.campaign_id}`,
      getValue: (row: IGoogleCampaign) => row.campaign_name || "Unnamed Campaign",
      render: (value: any, row: IGoogleCampaign) => {
        const navPath = `/brands/${accountId}/google-campaigns/${row.campaign_id}`;
        return (
          <div className="group relative flex items-center gap-2">
            {onEditCampaign && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCampaign(row);
                }}
                className="table-edit-icon flex-shrink-0"
                title="Edit Campaign Settings"
                disabled={editLoadingCampaignId === row.campaign_id}
              >
                {editLoadingCampaignId === row.campaign_id ? (
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
          </div>
        );
      },
    },
    {
      key: "account_name",
      label: "Brand Name",
      type: "text",
      sortable: true,
      minWidth: "min-w-[200px]",
      getValue: (row: IGoogleCampaign) => row.account_name || row.customer_id || "—",
    },
    {
      key: "advertising_channel_type",
      label: "Type",
      type: "text",
      sortable: true,
      render: (_value: any, row: IGoogleCampaign) => (
        <span className="table-text leading-[1.26] whitespace-nowrap">
          {getChannelTypeLabel(row.advertising_channel_type) || "—"}
        </span>
      ),
      getValue: (row: IGoogleCampaign) => row.advertising_channel_type,
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
        // REMOVED is read-only - cannot be set via update operation
        // It only appears when filtering/displaying campaigns that have been deleted
      ],
      getValue: (row: IGoogleCampaign) => row.status || "ENABLED",
    },
    {
      key: "budget",
      label: "Budget",
      type: "budget",
      sortable: true,
      editable: true,
      getValue: (row: IGoogleCampaign) => row.daily_budget || 0,
    },
    {
      key: "start_date",
      label: "Start Date",
      type: "start_date",
      sortable: true,
      editable: (row: IGoogleCampaign) => {
        // Make start_date non-editable if it's in the past
        const startDateStr = row.start_date;
        if (startDateStr) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startDate = new Date(startDateStr);
          startDate.setHours(0, 0, 0, 0);
          return startDate >= today;
        }
        return true; // If no start date, allow editing
      },
      getValue: (row: IGoogleCampaign) => row.start_date,
    },
    {
      key: "end_date",
      label: "End Date",
      type: "end_date",
      sortable: true,
      editable: (row: IGoogleCampaign) => {
        // Make end_date non-editable if it's in the past
        const endDateStr = row.end_date;
        if (endDateStr) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(endDateStr);
          endDate.setHours(0, 0, 0, 0);
          // Allow editing if end date is today or in the future
          return endDate >= today;
        }
        return true; // If no end date, allow editing
      },
      getValue: (row: IGoogleCampaign) => row.end_date,
    },
    {
      key: "bidding_strategy_type",
      label: "Bid strategy type",
      type: "text",
      sortable: true,
      editable: true,
      minWidth: "min-w-[180px]",
      statusOptions: [
        { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
        { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
        { value: "TARGET_CPA", label: "Target CPA" },
        { value: "TARGET_ROAS", label: "Target ROAS" },
        { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
        { value: "TARGET_SPEND", label: "Target Spend" },
        { value: "MANUAL_CPC", label: "Manual CPC" },
      ],
      getValue: (row: IGoogleCampaign) => {
        const strategy = (row as any).bidding_strategy_type;
        if (!strategy) return "—";
        // Format bidding strategy type (e.g., MAXIMIZE_CONVERSIONS -> Maximize conversions)
        return strategy.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      },
    },
    {
      key: "impressions",
      label: "Impressions",
      type: "number",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).impressions || 0,
    },
    {
      key: "clicks",
      label: "Clicks",
      type: "number",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).clicks || 0,
    },
    {
      key: "spends",
      label: "Cost",
      type: "currency",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).spends || 0,
    },
    {
      key: "sales",
      label: "Conv. value",
      type: "currency",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).sales || 0,
    },
    {
      key: "roas",
      label: "Conv. value / cost",
      type: "roas",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).roas || 0,
    },
    {
      key: "conversions",
      label: "Conversions",
      type: "number",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).conversions || 0,
    },
    {
      key: "conversion_rate",
      label: "Conv. rate",
      type: "percentage",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).conversion_rate || 0,
    },
    {
      key: "cost_per_conversion",
      label: "Cost / conv.",
      type: "currency",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).cost_per_conversion || 0,
    },
    {
      key: "avg_cpc",
      label: "Avg. CPC",
      type: "currency",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).avg_cpc || 0,
    },
    {
      key: "avg_cost",
      label: "Avg. cost",
      type: "currency",
      sortable: true,
      getValue: (row: IGoogleCampaign) => {
        // Avg. cost = cost / interactions (for text ads, interactions = clicks)
        const interactions = (row as any).interactions || (row as any).clicks || 0;
        const spends = (row as any).spends || 0;
        return interactions > 0 ? spends / interactions : 0;
      },
    },
    {
      key: "interaction_rate",
      label: "Interaction rate",
      type: "percentage",
      sortable: true,
      getValue: (row: IGoogleCampaign) => (row as any).interaction_rate || 0,
    },
  ], [getChannelTypeLabel, accountId, navigate, onEditCampaign, editLoadingCampaignId]);

  // Filter and sort columns based on visibility and order
  const columns: IColumnDefinition[] = useMemo(() => {
    // Create a map for quick column lookup
    const columnMap = new Map(allColumns.map((col) => [col.key, col]));
    
    // If no visibility preference, show all columns
    const visible = visibleColumns && visibleColumns.size > 0 
      ? Array.from(visibleColumns)
      : allColumns.map((col) => col.key);
    
    // If columnOrder is provided, use it to sort; otherwise use default order
    let orderedKeys: string[];
    if (columnOrder && columnOrder.length > 0) {
      // Filter columnOrder to only include visible columns, maintaining order
      orderedKeys = columnOrder.filter((key) => visible.includes(key));
      // Add any visible columns that weren't in columnOrder (shouldn't happen, but safety check)
      const missingKeys = visible.filter((key) => !orderedKeys.includes(key));
      orderedKeys = [...orderedKeys, ...missingKeys];
    } else {
      // No order preference, use default order but filter by visibility
      orderedKeys = allColumns
        .map((col) => col.key)
        .filter((key) => visible.includes(key));
    }
    
    // Return columns in the specified order
    return orderedKeys
      .map((key) => columnMap.get(key))
      .filter((col): col is IColumnDefinition => col !== undefined);
  }, [allColumns, visibleColumns, columnOrder]);

  // Handle confirm inline edit - route to appropriate handler
  // All fields (status, budget, end_date, bidding_strategy_type) now use modal confirmation
  const handleConfirmInlineEdit = (value: string, field?: string, itemIdParam?: string | number) => {
    // Use the field parameter if provided, otherwise fall back to editingCell
    const fieldToUse = field || editingCell?.field;
    if (!fieldToUse) {
      return;
    }
    
    // Use itemIdParam if provided, otherwise fall back to editingCell
    const campaignIdToUse = itemIdParam || editingCell?.campaignId;
    
    // All fields now use regular confirmation (with modal) - matches Amazon Campaign pattern
    onConfirmInlineEdit(value, fieldToUse, campaignIdToUse);
  };

  // Handle confirm change - route to appropriate handler (dates now use modal)
  const handleConfirmChange = (_itemId: string | number, _field: string, _newValue: any) => {
    // Dates are handled via modal, not inline confirmation
    // This handler is kept for compatibility but dates use modal confirmation
  };

  // Handle cancel change (dates now use modal)
  const handleCancelChange = (_field: string) => {
    // Dates are handled via modal, not inline confirmation
    // This handler is kept for compatibility but dates use modal confirmation
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
      summary={summary}
      columns={columns}
      inlineEditSuccess={inlineEditSuccess ? {
        itemId: inlineEditSuccess.campaignId,
        field: inlineEditSuccess.field,
      } : null}
      inlineEditError={inlineEditError ? {
        itemId: inlineEditError.campaignId,
        field: inlineEditError.field,
        message: inlineEditError.message,
      } : null}
      getId={(row: IGoogleCampaign) => row.campaign_id}
      getItemName={(row: IGoogleCampaign) => row.campaign_name || "Unnamed Campaign"}
      emptyMessage='No campaigns found. Click "Sync Campaigns from Google Ads" to fetch campaigns.'
      loadingMessage="Loading campaigns..."
      onSelectAll={onSelectAll}
      onSelectItem={onSelectCampaign}
      onSort={onSort}
      onStartInlineEdit={(item: IGoogleCampaign, field: string) => {
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

