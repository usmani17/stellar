import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAdsTable } from "./GoogleAdsTable";
import { Loader } from "../../../components/ui/Loader";
import { ConfirmationModal } from "../../../components/ui/ConfirmationModal";
import type { IGoogleCampaignsTableProps, IGoogleCampaign } from "../../../types/google/campaign";
import type { IColumnDefinition } from "../../../types/google";
import { TrashIcon, Send } from "lucide-react";
import { getStatusWithDefault } from "../utils/googleAdsUtils";
import { CAMPAIGN_STATUS_SAVED_DRAFT } from "../../../constants/google";


export const GoogleCampaignsTable: React.FC<IGoogleCampaignsTableProps> = ({
  campaigns,
  loading,
  sorting,
  accountId,
  channelId,
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
  onPublishDraft,
  publishLoadingCampaignId,
  isPanelOpen = false,
  currencyCode,
}) => {
  const navigate = useNavigate();
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [showPublishDraftConfirmation, setShowPublishDraftConfirmation] = useState(false);
  const [campaignToPublish, setCampaignToPublish] = useState<IGoogleCampaign | null>(null);
  const wasPublishLoadingRef = useRef(false);
  useEffect(() => {
    const isLoading = !!campaignToPublish && publishLoadingCampaignId === campaignToPublish.campaign_id;
    if (wasPublishLoadingRef.current && !isLoading) {
      setShowPublishDraftConfirmation(false);
      setCampaignToPublish(null);
    }
    wasPublishLoadingRef.current = isLoading;
  }, [campaignToPublish, publishLoadingCampaignId]);
  const [pendingRemoveChange, setPendingRemoveChange] = useState<{
    value: string;
    campaignId: string | number;
    field: string;
  } | null>(null);

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
        channelId ? `/brands/${accountId}/${channelId}/google/campaigns/${row.campaign_id}` : `/brands/${accountId}/google-campaigns/${row.campaign_id}`,
      getValue: (row: IGoogleCampaign) => row.campaign_name || "Unnamed Campaign",
      render: (value: any, row: IGoogleCampaign) => {
        const navPath = channelId ? `/brands/${accountId}/${channelId}/google/campaigns/${row.campaign_id}` : `/brands/${accountId}/google-campaigns/${row.campaign_id}`;
        return (
          <div className="group relative flex items-center gap-2 z-10">
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
            {(getStatusWithDefault(row.status).toUpperCase() === CAMPAIGN_STATUS_SAVED_DRAFT || getStatusWithDefault(row.status).toUpperCase() === "DRAFT") ? (
              <span className="table-edit-link cursor-default">{value}</span>
            ) : (
              <a
                href={navPath}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!e.metaKey && !e.ctrlKey && e.button !== 1) {
                    e.preventDefault();
                    navigate(navPath);
                  }
                }}
                className="table-edit-link"
              >
                {value}
              </a>
            )}
            {(getStatusWithDefault(row.status).toUpperCase() === CAMPAIGN_STATUS_SAVED_DRAFT || getStatusWithDefault(row.status).toUpperCase() === "DRAFT") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onPublishDraft) {
                    setCampaignToPublish(row);
                    setShowPublishDraftConfirmation(true);
                  }
                }}
                className="table-edit-icon flex-shrink-0 relative z-10 cursor-pointer !opacity-100 pointer-events-auto"
                title="Publish draft to Google Ads"
                disabled={!onPublishDraft || publishLoadingCampaignId === row.campaign_id}
              >
                <Send className="w-4 h-4 text-[#136D6D]" aria-hidden />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "account_name",
      label: "Profile",
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
      editable: (row: IGoogleCampaign) => {
        // Don't allow editing status if campaign is REMOVED or DRAFT (use Publish for drafts)
        const status = getStatusWithDefault(row.status).toUpperCase();
        return status !== "REMOVED" && status !== CAMPAIGN_STATUS_SAVED_DRAFT && status !== "DRAFT";
      },
      statusOptions: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
        { value: "REMOVED", label: "Remove" },
        { value: CAMPAIGN_STATUS_SAVED_DRAFT, label: "Draft" },
      ],
      getValue: (row: IGoogleCampaign) => getStatusWithDefault(row.status),
    },
    {
      key: "budget",
      label: "Budget",
      type: "budget",
      sortable: true,
      editable: (row: IGoogleCampaign) => {
        // Don't allow editing budget if campaign is REMOVED
        const status = getStatusWithDefault(row.status).toUpperCase();
        return status !== "REMOVED";
      },
      getValue: (row: IGoogleCampaign) => row.daily_budget || 0,
    },
    {
      key: "start_date",
      label: "Start Date",
      type: "start_date",
      sortable: true,
      editable: (row: IGoogleCampaign) => {
        // Don't allow editing start_date if campaign is REMOVED
        const status = getStatusWithDefault(row.status).toUpperCase();
        if (status === "REMOVED") {
          return false;
        }
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
        // Don't allow editing end_date if campaign is REMOVED
        const status = getStatusWithDefault(row.status).toUpperCase();
        if (status === "REMOVED") {
          return false;
        }
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
      key: "currency",
      label: "Currency",
      type: "text",
      sortable: false,
      getValue: () => currencyCode ?? "—",
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
  ], [getChannelTypeLabel, accountId, navigate, onEditCampaign, editLoadingCampaignId, currencyCode]);

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
  // For budget, date, status, and bidding_strategy_type, use direct confirmation
  const handleConfirmInlineEdit = (value: string, field?: string, itemIdParam?: string | number) => {
    // Use the field parameter if provided, otherwise fall back to editingCell
    const fieldToUse = field || editingCell?.field;
    if (!fieldToUse) {
      return;
    }

    // Use itemIdParam if provided, otherwise fall back to editingCell
    const campaignIdToUse = itemIdParam || editingCell?.campaignId;

    // Check if status is being changed to REMOVED - show confirmation modal
    if (fieldToUse === "status" && value === "REMOVED") {
      // Close the dropdown immediately when modal appears (matches ENABLED/PAUSED behavior)
      if (onCancelInlineEdit) {
        onCancelInlineEdit();
      }
      setPendingRemoveChange({ value: "REMOVED", campaignId: campaignIdToUse!, field: fieldToUse });
      setShowRemoveConfirmation(true);
      return;
    }

    // All fields now use modal confirmation (onConfirmInlineEdit)
    if (onConfirmInlineEdit) {
      // For budget, dates, status, bidding_strategy_type, and other fields, use modal confirmation
      onConfirmInlineEdit(value, fieldToUse, campaignIdToUse);
    } else if (onConfirmInlineEditDirect) {
      // Fallback to direct if modal handler not available
      onConfirmInlineEditDirect(value, campaignIdToUse, fieldToUse);
    }
  };

  // Handle confirmation for REMOVED status change
  const handleConfirmRemove = () => {
    if (pendingRemoveChange && onConfirmInlineEditDirect) {
      onConfirmInlineEditDirect(
        "REMOVED",
        pendingRemoveChange.campaignId,
        "status"
      );
      console.log("handleConfirmRemove called with:", { value: "REMOVED", campaignId: pendingRemoveChange.campaignId, field: "status" });
    }
    setShowRemoveConfirmation(false);
    setPendingRemoveChange(null);
  };

  // Handle cancel for REMOVED status change
  const handleCancelRemove = () => {
    setShowRemoveConfirmation(false);
    setPendingRemoveChange(null);
    // Cancel the inline edit
    if (onCancelInlineEdit) {
      onCancelInlineEdit();
    }
  };

  // Handle confirm change - route to appropriate handler
  const handleConfirmChange = (_itemId: string | number, _field: string, _newValue: any) => {
    console.warn("handleConfirmChange is not implemented", _itemId, _field, _newValue);
  };

  // Handle cancel change
  const handleCancelChange = (_field: string) => {
    console.warn("handleCancelChange is not implemented", _field);
  };

  return (
    <>
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
        emptyMessage='No campaigns found.'
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
        currencyCode={currencyCode}
      />
      <ConfirmationModal
        isOpen={showRemoveConfirmation}
        onClose={handleCancelRemove}
        onConfirm={handleConfirmRemove}
        title="Are you sure you want to remove this campaign?"
        message="This action cannot be undone. All data associated with this campaign will be permanently removed."
        type="danger"
        size="sm"
        icon={<TrashIcon className="w-6 h-6 text-red-600" />}
      />
      <ConfirmationModal
        isOpen={showPublishDraftConfirmation}
        onClose={() => {
          setShowPublishDraftConfirmation(false);
          setCampaignToPublish(null);
        }}
        onConfirm={() => {
          if (campaignToPublish && onPublishDraft) {
            onPublishDraft(campaignToPublish);
          }
        }}
        isLoading={!!campaignToPublish && publishLoadingCampaignId === campaignToPublish.campaign_id}
        loadingLabel="Publishing..."
        title="Publish this draft to Google Ads?"
        message={
          campaignToPublish
            ? `"${campaignToPublish.campaign_name || "Unnamed Campaign"}" will be created in Google Ads and will appear as a live campaign.`
            : ""
        }
        type="primary"
        size="sm"
        icon={<Send className="w-6 h-6 text-[#136D6D]" />}
      />
    </>
  );
};

