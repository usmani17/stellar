import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Dropdown } from "../../../components/ui/Dropdown";
import { Loader } from "../../../components/ui/Loader";
import { formatDateString, parseDateToYYYYMMDD } from "../../../utils/dateHelpers";
import type { IColumnDefinition, IGoogleAdsTableProps } from "../../../types/google";


export function GoogleAdsTable<T = any>({
  data,
  loading,
  sorting,
  accountId,
  selectedItems,
  allSelected,
  someSelected,
  editingCell,
  editedValue,
  updatingField,
  pendingChanges,
  summary,
  columns,
  getId,
  emptyMessage,
  loadingMessage,
  onSelectAll,
  onSelectItem,
  onSort,
  onStartInlineEdit,
  onCancelInlineEdit,
  onInlineEditChange,
  onConfirmInlineEdit,
  onConfirmChange,
  onCancelChange,
  formatCurrency,
  formatPercentage,
  getStatusBadge,
  getSortIcon,
  isPanelOpen = false,
  inlineEditSuccess,
  inlineEditError,
}: IGoogleAdsTableProps<T>) {
  const navigate = useNavigate();
  // Ref to track if a status selection was made (matches Amazon pattern)
  const statusSelectionMadeRef = useRef<string | number | null>(null);

  const renderCell = (column: IColumnDefinition, row: T) => {
    const itemId = getId(row);
    const isEditing = editingCell?.itemId === itemId && editingCell?.field === column.key;
    const isUpdating = updatingField?.itemId === itemId && updatingField?.field === column.key;
    const pendingChange = pendingChanges[column.key];
    const hasPendingChange = pendingChange?.itemId === itemId;
    const isSuccess = inlineEditSuccess?.itemId === itemId && inlineEditSuccess?.field === column.key;
    const value = column.getValue(row);
    
    // Check if column is editable (can be boolean or function)
    const isEditable = typeof column.editable === 'function' 
      ? column.editable(row) 
      : column.editable === true;

    // For editable fields (status, budget, bid, start_date, end_date, bidding_strategy_type, match_type, adgroup_name, keyword_text), 
    // always show as editable controls (like Amazon campaigns)
    // Note: Loading and success states are now handled inside renderEditableCell for budget/date/status fields
    if (isEditable && (column.key === "status" || column.key === "budget" || column.key === "bid" ||
        column.key === "start_date" || column.key === "end_date" || column.key === "bidding_strategy_type" ||
        column.key === "match_type" || column.key === "adgroup_name" || column.key === "keyword_text")) {
    // For budget, bid, date, status, bidding_strategy_type, match_type, adgroup_name, and keyword_text fields, renderEditableCell handles loading/success states internally with floating indicators
    // Always show editable control (similar to Amazon campaigns)
    // Status, budget, bid, date, bidding_strategy_type, match_type, adgroup_name, and keyword_text fields will show floating indicators from renderEditableCell
    return renderEditableCell(column, value, row, itemId);
    }

    // Handle editing state for other editable fields (before custom render) so editable cells work properly
    const isEditableForRow = typeof column.editable === 'function' 
      ? column.editable(row) 
      : column.editable === true;
    if (isEditing && isEditableForRow) {
      return renderEditableCell(column, value, row, itemId);
    }

    // Handle updating state
    if (isUpdating) {
      return (
        <div className="flex items-center gap-2">
          {column.render ? column.render(value, row) : renderValue(column, value)}
          <Loader size="sm" showMessage={false} />
        </div>
      );
    }

    // Show success indicator if edit was successful
    if (isSuccess) {
      return (
        <div className="flex items-center gap-2">
          {column.render ? column.render(value, row) : renderValue(column, value)}
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"

          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    // Handle pending confirmation
    if (hasPendingChange) {
      return (
        <div className="flex items-center gap-2">
          {column.render ? column.render(pendingChange.newValue, row) : renderValue(column, pendingChange.newValue)}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onConfirmChange(itemId, column.key, pendingChange.newValue)}
              className="p-1 hover:bg-green-50 rounded transition-colors"
              title="Confirm"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => onCancelChange(column.key)}
              className="p-1 hover:bg-red-50 rounded transition-colors"
              title="Cancel"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    // Default render
    const cellContent = column.render ? column.render(value, row) : renderValue(column, value);
    const isClickable = isEditableForRow && !isEditing && !isPanelOpen; // Disable editing when panel is open

    // Only wrap in button if no custom render function is provided
    // Custom render functions should handle their own navigation/click handling
    if (column.navigateTo && !column.render) {
      const navPath = column.navigateTo(row, accountId);
      if (navPath) {
        return (
          <button
            onClick={() => navigate(navPath)}
            className="table-edit-link block w-full"
          >
            {cellContent}
          </button>
        );
      }
    }

    // If custom render is provided and column is editable, let the custom render handle the click
    // This allows custom renders to match exact styling (like TikTok's hover:underline)
    if (column.render && isClickable) {
      // Wrap in a div that handles the click, but don't add hover:bg-gray-50 to preserve custom styling
      return (
        <div
          onClick={() => onStartInlineEdit(row, column.key)}
          className="w-full"
          style={{ pointerEvents: 'auto' }}
        >
          {cellContent}
        </div>
      );
    }

    if (isClickable) {
      const whitespaceClass = (column.key === "bidding_strategy_type" || column.key === "advertising_channel_type") ? "whitespace-nowrap" : "";
      return (
        <div
          onClick={() => onStartInlineEdit(row, column.key)}
          className={`cursor-pointer hover:bg-gray-50 rounded px-2 py-1 w-full ${whitespaceClass}`}
          style={{ pointerEvents: 'auto' }}
        >
          {cellContent}
        </div>
      );
    }

    // When panel is open and field is editable, show as read-only (no hover effect)
    if (isEditableForRow && isPanelOpen && !isEditing) {
      const whitespaceClass = (column.key === "bidding_strategy_type" || column.key === "advertising_channel_type") ? "whitespace-nowrap" : "";
      return (
        <div className={`cursor-not-allowed opacity-60 rounded px-2 py-1 w-full ${whitespaceClass}`}>
          {cellContent}
        </div>
      );
    }

    const whitespaceClass = (column.key === "bidding_strategy_type" || column.key === "advertising_channel_type") ? "whitespace-nowrap" : "";
    return <div className={whitespaceClass}>{cellContent}</div>;
  };

  const renderValue = (column: IColumnDefinition, value: any): React.ReactNode => {
    switch (column.type) {
      case "status":
        // Special handling for match_type to show as purple text instead of badge
        if (column.key === "match_type") {
          const matchTypeMap: Record<string, string> = {
            EXACT: "Exact",
            PHRASE: "Phrase",
            BROAD: "Broad",
          };
          const label = matchTypeMap[value] || value || "—";
          return (
            <span className="table-text leading-[1.26] font-semibold text-[#7a4dff] pointer-events-none">
              {label}
            </span>
          );
        }
        // For status column, don't show default if value is empty (matches Amazon - no "—" in status)
        if (column.key === "status" && (!value || value === "")) {
          return <span className="table-text leading-[1.26]"></span>;
        }
        return getStatusBadge(value || "ENABLED");
      case "currency":
      case "budget":
      case "bid":
        return <span className="table-text leading-[1.26]" style={{ pointerEvents: 'none' }}>{formatCurrency(value || 0)}</span>;
      case "percentage":
        return <span className="table-text leading-[1.26]">{formatPercentage(value || 0)}</span>;
      case "number":
        return <span className="table-text leading-[1.26]">{((value || 0) as number).toLocaleString()}</span>;
      case "roas":
        return (
          <span className="table-text leading-[1.26]">
            {value ? `${(value as number).toFixed(2)} x` : "0.00 x"}
          </span>
        );
      case "start_date":
      case "end_date":
        return (
          <span className="table-text leading-[1.26] whitespace-nowrap">
            {formatDateString(value)}
          </span>
        );
      case "text":
        // For bidding_strategy_type, prevent wrapping
        if (column.key === "bidding_strategy_type") {
          return <span className="table-text leading-[1.26] whitespace-nowrap">{value || "—"}</span>;
        }
        // For adgroup_name and campaign_name, prevent wrapping to allow column to expand dynamically
        if (column.key === "adgroup_name" || column.key === "campaign_name") {
          return <span className="table-text leading-[1.26] whitespace-nowrap">{value || "—"}</span>;
        }
        return <span className="table-text leading-[1.26]">{value || "—"}</span>;
      default:
        return <span className="table-text leading-[1.26]">{value || "—"}</span>;
    }
  };

  // Helper function to format updating message based on field type
  const getUpdatingMessage = (column: IColumnDefinition, newValue: string | undefined): string => {
    if (!newValue) return "Updating...";
    
    switch (column.key) {
      case "status":
      case "match_type": {
        // Find the label for the status/match_type value
        const statusOption = column.statusOptions?.find(opt => opt.value === newValue);
        return statusOption ? `Updating to ${statusOption.label}` : `Updating to ${newValue}`;
      }
      case "budget":
      case "bid": {
        // Format budget/bid as currency
        const budgetNum = parseFloat(newValue);
        if (!isNaN(budgetNum)) {
          return `Updating to ${formatCurrency(budgetNum)}`;
        }
        return `Updating to ${newValue}`;
      }
      case "start_date":
      case "end_date": {
        // Format date using formatDateString
        const formattedDate = formatDateString(newValue);
        return formattedDate !== "—" ? `Updating to ${formattedDate}` : `Updating to ${newValue}`;
      }
      case "bidding_strategy_type": {
        // Find the label for the bidding strategy
        const strategyOption = column.statusOptions?.find(opt => opt.value === newValue);
        if (strategyOption) {
          return `Updating to ${strategyOption.label}`;
        }
        // Fallback: format the value (e.g., MAXIMIZE_CONVERSIONS -> Maximize Conversions)
        const formatted = newValue.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        return `Updating to ${formatted}`;
      }
      case "name":
      case "ad_name":
      case "campaign_name":
      case "adgroup_name":
      case "keyword_text": {
        // Show full name in update message
        return `Updating to ${newValue}`;
      }
      default:
        return `Updating to ${newValue}`;
    }
  };

  const renderEditableCell = (column: IColumnDefinition, value: any, row: T, itemId: string | number): React.ReactNode => {
    const isEditing = editingCell?.itemId === itemId && editingCell?.field === column.key;
    const isUpdating = updatingField?.itemId === itemId && updatingField?.field === column.key;
    const isSuccess = inlineEditSuccess?.itemId === itemId && inlineEditSuccess?.field === column.key;
    const isError = inlineEditError?.itemId === itemId && inlineEditError?.field === column.key;
    const updatingMessage = isUpdating ? getUpdatingMessage(column, updatingField?.newValue) : "Updating...";
    
    // Check if entity is removed or if parent entity is removed
    const rowStatus = (row as any).status?.toUpperCase();
    const campaignStatus = (row as any).campaign_status?.toUpperCase();
    const adgroupStatus = (row as any).adgroup_status?.toUpperCase();
    
    // Entity is removed if:
    // 1. Its own status is REMOVED, OR
    // 2. For adgroups: campaign status is REMOVED, OR
    // 3. For keywords/ads: campaign status is REMOVED OR adgroup status is REMOVED
    const isRemoved = 
      rowStatus === "REMOVED" ||
      campaignStatus === "REMOVED" ||
      adgroupStatus === "REMOVED";
    
    // Use editedValue if actively editing, otherwise use current value from row
    const displayValue = isEditing ? editedValue : (value !== undefined && value !== null ? value : "");
    
    // If column has statusOptions, show dropdown (for status, bidding_strategy_type, etc.)
    if (column.statusOptions && column.statusOptions.length > 0) {
      // Use wider width for bidding strategy (longer labels), and match column width for match_type
      const dropdownWidth = column.key === "bidding_strategy_type" 
        ? "w-[220px]" 
        : column.key === "match_type" 
        ? "w-[140px]" 
        : "w-[120px]";
      
      // Filter bidding strategy options based on campaign type
      let options = column.statusOptions;
      if (column.key === "bidding_strategy_type") {
        const campaignTypeRaw = (row as any).advertising_channel_type || "";
        // Handle enum format: "ADVERTISING_CHANNEL_TYPE_PERFORMANCE_MAX" -> "PERFORMANCE_MAX"
        let campaignType = campaignTypeRaw.toUpperCase();
        if (campaignType.includes("ADVERTISING_CHANNEL_TYPE_")) {
          campaignType = campaignType.replace("ADVERTISING_CHANNEL_TYPE_", "");
        }
        
        if (campaignType === "PERFORMANCE_MAX") {
          // Performance Max campaigns only support: MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE
          options = column.statusOptions.filter(
            (opt) => opt.value === "MAXIMIZE_CONVERSIONS" || opt.value === "MAXIMIZE_CONVERSION_VALUE"
          );
        } else if (campaignType === "SHOPPING") {
          // Shopping campaigns only support: MANUAL_CPC
          options = column.statusOptions.filter(
            (opt) => opt.value === "MANUAL_CPC"
          );
        } else if (campaignType === "SEARCH") {
          // SEARCH campaigns support: MANUAL_CPC, MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE,
          // TARGET_IMPRESSION_SHARE, TARGET_SPEND
          // Note: TARGET_CPA and TARGET_ROAS are not supported (require conversion tracking)
          options = column.statusOptions.filter(
            (opt) =>
              opt.value === "MANUAL_CPC" ||
              opt.value === "MAXIMIZE_CONVERSIONS" ||
              opt.value === "MAXIMIZE_CONVERSION_VALUE" ||
              opt.value === "TARGET_IMPRESSION_SHARE" ||
              opt.value === "TARGET_SPEND"
          );
        }
      }
      
      // For bidding_strategy_type, convert formatted value back to enum value
      // For match_type, normalize to uppercase to match option values
      let dropdownValue = displayValue;
      if (column.key === "bidding_strategy_type" && dropdownValue && typeof dropdownValue === "string") {
        // The getValue function returns formatted string (e.g., "Maximize Conversions")
        // but dropdown needs enum value (e.g., "MAXIMIZE_CONVERSIONS")
        // Try to find matching option by formatted label
        const enumValue = options.find(opt => {
          const formatted = opt.value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          return opt.value === dropdownValue || formatted === dropdownValue || opt.label === dropdownValue;
        });
        if (enumValue) {
          dropdownValue = enumValue.value;
        } else {
          // If no match found, try to get raw value from row
          const rawValue = (row as any).bidding_strategy_type;
          if (rawValue) {
            dropdownValue = rawValue;
          }
        }
      } else if (column.key === "match_type" && dropdownValue && typeof dropdownValue === "string") {
        // Normalize to uppercase to match option values
        const normalizedValue = dropdownValue.toUpperCase().trim();
        // Find matching option
        const matchedOption = options.find(opt => 
          opt.value === normalizedValue || 
          opt.value === dropdownValue ||
          opt.label === dropdownValue
        );
        if (matchedOption) {
          dropdownValue = matchedOption.value;
        }
      }
      
      return (
        <div className="relative w-full">
          <Dropdown
            options={options}
            value={dropdownValue}
            onChange={(val) => {
              if (isRemoved) return; // Disable editing for removed adgroups
              const newValue = val as string;
              
              // Get the original value for comparison
              let originalValue: string = "";
              if (column.key === "bidding_strategy_type") {
                // For bidding_strategy_type, compare with the raw enum value
                originalValue = (row as any).bidding_strategy_type || "";
              } else if (column.key === "match_type") {
                // For match_type, normalize to uppercase for comparison
                const rawValue = (row as any).match_type || "";
                originalValue = rawValue.toUpperCase();
              } else {
                // For status, use the current value
                originalValue = (value !== undefined && value !== null ? String(value) : "").toUpperCase();
              }
              
              // Normalize new value for comparison
              const newValueNormalized = newValue.toUpperCase();
              
              // Only confirm if value has actually changed
              if (newValueNormalized !== originalValue.toUpperCase()) {
                if (!isEditing) {
                  onStartInlineEdit(row, column.key);
                }
                onInlineEditChange(newValue);
                // For status and bidding_strategy_type dropdowns, use direct confirmation immediately (skip modal)
                // Pass itemId (campaign ID) and field directly to avoid state timing issues
                onConfirmInlineEdit(newValue, column.key, itemId);
              } else {
                // No change, just cancel if we were editing
                if (isEditing) {
                  onCancelInlineEdit();
                }
              }
            }}
            defaultOpen={isEditing}
            closeOnSelect={true}
            buttonClassName="inline-edit-dropdown min-w-0"
            width={dropdownWidth}
            align="left"
            className="w-full"
            menuClassName="z-[100000]"
            disabled={isRemoved}
            onClose={() => {
              // Don't cancel if we're updating or if there's a pending change
              if (isUpdating) return;
              if (!editedValue || editedValue === value) {
                onCancelInlineEdit();
              }
            }}
          />
          {isUpdating && (
            <div className="absolute top-full left-0 mt-1 z-10">
              <div className="flex items-center gap-1 text-gray-600 bg-white rounded shadow-sm border border-gray-200 px-2 py-1">
                <Loader size="sm" />
                <span className="text-[10px]">{updatingMessage}</span>
              </div>
            </div>
          )}
          {isSuccess && !isUpdating && (
            <div className="absolute top-full left-0 mt-1 z-10">
              <div className="text-green-600 text-xs flex items-center gap-1 animate-fade-in bg-white rounded shadow-sm border border-green-200 px-2 py-1">
                <Check size={12} /> Updated successfully
              </div>
            </div>
          )}
          {isError && inlineEditError?.message && !isUpdating && (
            <div className="absolute top-full left-0 mt-1 z-10">
              <div className="text-red-600 text-xs flex items-center gap-1 bg-white rounded shadow-sm border border-red-200 px-2 py-1">
                <X size={12} /> {inlineEditError.message}
              </div>
            </div>
          )}
        </div>
      );
    }

    switch (column.type) {
      case "status":
        // Status columns with statusOptions are handled in the statusOptions block above
        // This case should only be reached for status columns without statusOptions (shouldn't happen)
        // Use Amazon pattern here too for consistency
        return (
          <div className="relative w-full">
            <Dropdown
              options={column.statusOptions || [
                { value: "ENABLED", label: "Enabled" },
                { value: "PAUSED", label: "Paused" },
              ]}
              value={displayValue}
              onChange={(val) => {
                if (isRemoved) return; // Disable editing for removed adgroups
                
                const newValue = val as string;
                
                // Get the original status value for comparison
                const originalValue = (value !== undefined && value !== null ? String(value) : "").toUpperCase();
                const newValueNormalized = newValue.toUpperCase();
                
                // Only confirm if value has actually changed
                if (newValueNormalized !== originalValue) {
                  // Mark that a selection was made for this item (matches Amazon pattern)
                  statusSelectionMadeRef.current = itemId;
                  if (!isEditing) {
                    onStartInlineEdit(row, column.key);
                  }
                  onInlineEditChange(newValue);
                  // For status and bidding_strategy_type, use direct confirmation immediately (skip modal)
                  // Pass itemId (campaign ID) and field directly to avoid state timing issues
                  onConfirmInlineEdit(newValue, column.key, itemId);
                } else {
                  // No change, just cancel if we were editing
                  if (isEditing) {
                    onCancelInlineEdit();
                  }
                }
              }}
              defaultOpen={isEditing}
              closeOnSelect={true}
              buttonClassName="inline-edit-dropdown min-w-0"
              width="w-[120px]"
              align="left"
              className="w-full"
              menuClassName="z-[100000]"
              disabled={isRemoved}
              onClose={() => {
                // Don't cancel if we're updating or if there's a pending change
                if (isUpdating) return;
                if (!editedValue || editedValue === value) {
                  onCancelInlineEdit();
                }
              }}
            />
            {isUpdating && (
              <div className="absolute top-full left-0 mt-1 z-10">
                <div className="flex items-center gap-1 text-gray-600 bg-white rounded shadow-sm border border-gray-200 px-2 py-1">
                  <Loader size="sm" />
                  <span className="text-[10px]">{updatingMessage}</span>
                </div>
              </div>
            )}
            {isSuccess && !isUpdating && (
              <div className="absolute top-full left-0 mt-1 z-10">
                <div className="text-green-600 text-xs flex items-center gap-1 animate-fade-in bg-white rounded shadow-sm border border-green-200 px-2 py-1">
                  <Check size={12} /> Updated successfully
                </div>
              </div>
            )}
            {isError && inlineEditError?.message && !isUpdating && (
              <div className="absolute top-full left-0 mt-1 z-10">
                <div className="text-red-600 text-xs flex items-center gap-1 bg-white rounded shadow-sm border border-red-200 px-2 py-1">
                  <X size={12} /> {inlineEditError.message}
                </div>
              </div>
            )}
          </div>
        );

      case "text": {
        // For text fields like adgroup_name, keyword_text - use inline editing with tick/cross (same as bid)
        // Always show input field when editable (like budget/bid fields)
        // Check if column is editable for this row
        const isTextEditable = typeof column.editable === 'function' 
          ? column.editable(row) 
          : column.editable === true;
        if (isTextEditable) {
          // Always show input field, use editedValue when editing, otherwise use current value
          const textValue = isEditing ? editedValue : (value !== undefined && value !== null ? value : "");
          return (
            <div className="relative w-full">
              <input
                key={`text-${itemId}-${column.key}`}
                type="text"
                value={textValue}
                onFocus={() => {
                  if (isRemoved) return; // Disable editing for removed adgroups
                  if (!isEditing && isTextEditable) {
                    onStartInlineEdit(row, column.key);
                  }
                }}
                onChange={(e) => {
                  if (isRemoved) return; // Disable editing for removed adgroups
                  // Only update editedValue if this specific row is being edited
                  // Double-check by verifying editingCell matches this row's itemId and field
                  if (editingCell?.itemId === itemId && editingCell?.field === column.key) {
                    onInlineEditChange(e.target.value);
                  }
                }}
                onBlur={(e) => {
                  if (isEditing && isTextEditable) {
                    const inputValue = e.target.value.trim();
                    const originalValue = (value !== undefined && value !== null ? String(value) : "").trim();
                    // Only confirm if value has actually changed
                    if (inputValue !== originalValue && inputValue !== "") {
                      onConfirmInlineEdit(inputValue, column.key, itemId);
                    } else {
                      // No change, just cancel the edit
                      onCancelInlineEdit();
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    onCancelInlineEdit();
                  }
                }}
                autoFocus={isEditing}
                className="inline-edit-input w-full min-w-[150px]"
                disabled={!isTextEditable || isRemoved}
              />
              {(isUpdating || isSuccess || isError) && (
                <div className="absolute top-full left-0 mt-1 z-10">
                  {isUpdating && (
                    <div className="flex items-center gap-1 text-gray-600 bg-white rounded shadow-sm border border-gray-200 px-2 py-1">
                      <Loader size="sm" />
                      <span className="text-[10px]">{updatingMessage}</span>
                    </div>
                  )}
                  {isSuccess && (
                    <div className="text-green-600 text-xs flex items-center gap-1 animate-fade-in bg-white rounded shadow-sm border border-green-200 px-2 py-1">
                      <Check size={12} /> Updated successfully
                    </div>
                  )}
                  {isError && inlineEditError?.message && (
                    <div className="text-red-600 text-xs flex items-center gap-1 bg-white rounded shadow-sm border border-red-200 px-2 py-1">
                      <X size={12} /> {inlineEditError.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
        return renderValue(column, value);
      }
      case "budget":
      case "bid": {
        // Check if column is editable for this row
        const isBudgetEditable = typeof column.editable === 'function' 
          ? column.editable(row) 
          : column.editable === true;
        const budgetValue = isEditing ? editedValue : (value || 0).toString();
        // Include adgroup_id in key for budget inputs if available (for keywords with same keyword_id in different adgroups)
        const adgroupId = (row as any).adgroup_id;
        const budgetKey = adgroupId ? `budget-${itemId}-${adgroupId}-${column.key}` : `budget-${itemId}-${column.key}`;
        return (
          <div className="relative w-full">
            <input
              key={budgetKey}
              type="number"
              step="0.01"
              min="0"
              value={budgetValue}
              onFocus={() => {
                if (isRemoved) return; // Disable editing for removed adgroups
                if (!isEditing && isBudgetEditable) {
                  onStartInlineEdit(row, column.key);
                }
              }}
              onChange={(e) => {
                if (isRemoved) return; // Disable editing for removed adgroups
                // Only update editedValue if this specific row is being edited
                // Double-check by verifying editingCell matches this row's itemId and field
                if (editingCell?.itemId === itemId && editingCell?.field === column.key) {
                  onInlineEditChange(e.target.value);
                }
              }}
              onBlur={(e) => {
                if (isEditing && isBudgetEditable) {
                  // Capture the value directly from the input to ensure we get the latest value
                  // For number inputs, use the valueAsNumber or value property
                  // Use e.currentTarget.value for better reliability with number inputs
                  const inputElement = e.currentTarget as HTMLInputElement;
                  const inputValue = inputElement.value;
                  const inputValueAsNumber = inputElement.valueAsNumber;
                  
                  // Get the original value for comparison
                  const originalValue = value !== undefined && value !== null ? (typeof value === 'number' ? value : parseFloat(String(value)) || 0) : 0;
                  
                  // Only trigger confirmation if there's a value (not empty string) AND it has changed
                  if (inputValue !== undefined && inputValue !== null && inputValue !== "") {
                    // Check if the value has actually changed (use a small threshold for floating point comparison)
                    const newValueNum = isNaN(inputValueAsNumber) ? parseFloat(inputValue) || 0 : inputValueAsNumber;
                    const hasChanged = Math.abs(newValueNum - originalValue) > 0.001;
                    
                    if (hasChanged) {
                      onConfirmInlineEdit(inputValue, column.key, itemId);
                    } else {
                      // No change, just cancel the edit
                      onCancelInlineEdit();
                    }
                  } else {
                    // Empty value, cancel the edit
                    onCancelInlineEdit();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  onCancelInlineEdit();
                }
              }}
              autoFocus={isEditing}
              className="inline-edit-input w-full min-w-[120px]"
              disabled={!isBudgetEditable || isRemoved}
            />
            {(isUpdating || isSuccess || isError) && (
              <div className="absolute top-full left-0 mt-1 z-10">
                {isUpdating && (
                  <div className="flex items-center gap-1 text-gray-600 bg-white rounded shadow-sm border border-gray-200 px-2 py-1">
                    <Loader size="sm" />
                    <span className="text-[10px]">{updatingMessage}</span>
                  </div>
                )}
                {isSuccess && (
                  <div className="text-green-600 text-xs flex items-center gap-1 animate-fade-in bg-white rounded shadow-sm border border-green-200 px-2 py-1">
                    <Check size={12} /> Updated successfully
                  </div>
                )}
                {isError && inlineEditError?.message && (
                  <div className="text-red-600 text-xs flex items-center gap-1 bg-white rounded shadow-sm border border-red-200 px-2 py-1">
                    <X size={12} /> {inlineEditError.message}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case "start_date":
      case "end_date": {
        // Check if this date field is editable for this row
        const isDateEditable = typeof column.editable === 'function' 
          ? column.editable(row) 
          : column.editable === true;
        
        // If not editable (date is in the past), show as read-only text
        if (!isDateEditable) {
          return renderValue(column, value);
        }
        
        // Always show date input field (like Amazon campaigns budget fields)
        // Match Amazon pattern: always show input, editable on focus
        const isStartDate = column.type === "start_date";
        // For end_date, set min to the campaign's start_date if it exists
        let minDate: string | undefined;
        if (isStartDate) {
          // Use local date calculation to avoid timezone issues
          const today = new Date();
          minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        } else {
          // For end_date, get the start_date from the row
          const startDate = (row as any).start_date;
          if (startDate) {
            const parsedStartDate = parseDateToYYYYMMDD(startDate);
            if (parsedStartDate) {
              minDate = parsedStartDate;
            }
          }
          // Also ensure end_date cannot be in the past
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          if (!minDate || todayStr > minDate) {
            minDate = todayStr;
          }
        }
        // Format date value for input (YYYY-MM-DD)
        const dateValue = isEditing ? editedValue : (value ? parseDateToYYYYMMDD(value) : "");
        return (
          <div className="relative w-full">
            <input
              key={`date-${itemId}-${column.key}`}
              type="date"
              value={dateValue}
              min={minDate}
              onFocus={() => {
                if (isRemoved) return; // Disable editing for removed adgroups
                if (!isEditing && isDateEditable) {
                  onStartInlineEdit(row, column.key);
                }
              }}
              onChange={(e) => {
                if (isRemoved) return; // Disable editing for removed adgroups
                // Only update if this specific row is being edited
                // Double-check by verifying editingCell matches this row's itemId and field
                if (editingCell?.itemId === itemId && editingCell?.field === column.key && isDateEditable) {
                  const inputValue = e.target.value;
                  // Get the original date value for comparison
                  const originalDateValue = value ? parseDateToYYYYMMDD(value) : "";
                  // Only confirm if date has actually changed
                  if (inputValue !== originalDateValue && inputValue !== "") {
                    // Update the edited value
                    onInlineEditChange(inputValue);
                    // Immediately trigger confirmation modal on date change
                    onConfirmInlineEdit(inputValue, column.key, itemId);
                  } else {
                    // No change, just cancel the edit
                    onCancelInlineEdit();
                  }
                }
              }}
              onBlur={(e) => {
                // Blur handler kept for cleanup, but modal is triggered on onChange
                if (isEditing && isDateEditable && !e.target.value) {
                  onCancelInlineEdit();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  onCancelInlineEdit();
                }
              }}
              autoFocus={isEditing}
              className="inline-edit-input w-full min-w-[140px]"
              disabled={!isDateEditable || isRemoved}
            />
            {(isUpdating || isSuccess || isError) && (
              <div className="absolute top-full left-0 mt-1 z-10">
                {isUpdating && (
                  <div className="flex items-center gap-1 text-gray-600 bg-white rounded shadow-sm border border-gray-200 px-2 py-1">
                    <Loader size="sm" />
                    <span className="text-[10px]">{updatingMessage}</span>
                  </div>
                )}
                {isSuccess && (
                  <div className="text-green-600 text-xs flex items-center gap-1 animate-fade-in bg-white rounded shadow-sm border border-green-200 px-2 py-1">
                    <Check size={12} /> Updated successfully
                  </div>
                )}
                {isError && inlineEditError?.message && (
                  <div className="text-red-600 text-xs flex items-center gap-1 bg-white rounded shadow-sm border border-red-200 px-2 py-1">
                    <X size={12} /> {inlineEditError.message}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      default:
        return renderValue(column, value);
    }
  };

  const getStickyClasses = (column: IColumnDefinition, index: number): string => {
    if (!column.sticky) return "";
    
    // Calculate left offset based on previous sticky columns
    // Note: leftOffset calculation removed as it's not used
    
    // Use table-sticky-first-column class for first sticky column (matches Amazon campaigns)
    if (index === 0) {
      return "table-sticky-first-column";
    }
    // For more sticky columns, would need more specific handling
    return "sticky bg-[#f5f5f0] z-[120]";
  };

  return (
    <div>
      <div className="overflow-x-auto overflow-y-visible w-full">
        <div className="relative">
          <table className="min-w-[1200px] w-full" style={{ tableLayout: 'auto' }}>
            <thead className="sticky top-0 z-[90] bg-[#fefefb]">
              <tr className="border-b border-[#e8e8e3]">
                {/* Checkbox Header */}
                <th className="table-header w-[35px] sticky left-0 z-[120] bg-[#f5f5f0] border-r border-[#e8e8e3]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={onSelectAll}
                      size="small"
                    />
                  </div>
                </th>

                {/* Column Headers */}
                {columns.map((column, index) => {
                  const stickyClasses = getStickyClasses(column, index);
                  const widthClasses = column.width || column.minWidth || "";
                  const borderClass = column.sticky ? "border-r border-[#e8e8e3]" : "";
                  
                  return (
                    <th
                      key={column.key}
                      className={`table-header ${
                        column.sortable !== false ? "cursor-pointer hover:bg-gray-50" : ""
                      } ${stickyClasses} ${widthClasses} ${borderClass}`}
                      onClick={() => column.sortable !== false && onSort(column.key)}
                    >
                      <div className="flex items-center gap-1">
                        {column.label}
                        {column.sortable !== false && getSortIcon(column.key)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Show skeleton rows when loading and no data */}
              {loading && data.length === 0 ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="table-row">
                    <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div>
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className="table-cell">
                        <div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="table-cell">
                    <div className="text-center py-8">
                      <p className="text-[13.3px] text-[#556179] mb-4">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                {/* Summary Row */}
                {summary && (
                  <tr className="table-summary-row">
                    <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] border-r border-[#e8e8e3]"></td>
                    {columns.map((column, index) => {
                      const stickyClasses = getStickyClasses(column, index);
                      const borderClass = column.sticky ? "border-r border-[#e8e8e3]" : "";
                      
                      let summaryValue: React.ReactNode = "";
                      // Only show Total in the first column (index 0), which is typically name/adgroup_name/campaign_name/ad_id/keyword_text
                      if (index === 0 && (column.key === "name" || column.key === "adgroup_name" || column.key === "campaign_name" || column.key === "ad_id" || column.key === "keyword_text")) {
                        // Use the specific field from backend based on column key (no fallback hierarchy)
                        const summaryAny = summary as any;
                        let totalCount = 0;
                        if (column.key === "campaign_name") {
                          totalCount = summaryAny?.total_campaigns || 0;
                        } else if (column.key === "adgroup_name") {
                          totalCount = summaryAny?.total_adgroups || 0;
                        } else if (column.key === "keyword_text") {
                          totalCount = summaryAny?.total_keywords || 0;
                        } else if (column.key === "ad_id") {
                          totalCount = summaryAny?.total_ads || 0;
                        } else {
                          // Generic fallback for "name" or other first columns
                          totalCount = summaryAny?.total_count || 0;
                        }
                        summaryValue = `Total (${totalCount})`;
                      } else if (index !== 0 && (column.key === "campaign_name" || column.key === "adgroup_name" || column.key === "account_name")) {
                        // Navigation columns (except first column) should be empty
                        summaryValue = "";
                      } else if (column.key === "spends") {
                        summaryValue = formatCurrency(summary?.total_spends || 0);
                      } else if (column.key === "sales") {
                        summaryValue = formatCurrency(summary?.total_sales || 0);
                      } else if (column.key === "impressions") {
                        summaryValue = (summary?.total_impressions || 0).toLocaleString();
                      } else if (column.key === "clicks") {
                        summaryValue = (summary?.total_clicks || 0).toLocaleString();
                      } else if (column.key === "budget") {
                        // Budget should be empty in summary row (not summed)
                        summaryValue = "";
                      } else if (column.key === "roas") {
                        summaryValue = `${(summary?.avg_roas || 0).toFixed(2)}x`;
                      } else if (column.key === "ctr") {
                        // Calculate average CTR from summary
                        const avgCtr = summary?.total_impressions > 0 
                          ? (summary?.total_clicks / summary?.total_impressions) * 100 
                          : 0;
                        summaryValue = `${avgCtr.toFixed(2)}%`;
                      } else if (column.key === "cpc" || column.key === "avg_cpc") {
                        // Use avg_cpc from summary
                        summaryValue = summary?.avg_cpc !== undefined
                          ? formatCurrency(summary.avg_cpc)
                          : formatCurrency(0);
                      } else if (column.key === "conversions") {
                        // Use total conversions from summary
                        summaryValue = (summary?.total_conversions || 0).toLocaleString();
                      } else if (column.key === "conversion_rate") {
                        // Use avg conversion rate from summary
                        summaryValue = summary?.avg_conversion_rate !== undefined 
                          ? `${summary.avg_conversion_rate.toFixed(2)}%`
                          : "0.00%";
                      } else if (column.key === "cost_per_conversion") {
                        // Use avg cost per conversion from summary
                        summaryValue = summary?.avg_cost_per_conversion !== undefined
                          ? formatCurrency(summary.avg_cost_per_conversion)
                          : formatCurrency(0);
                      } else if (column.key === "interaction_rate") {
                        // Use avg interaction rate from summary
                        summaryValue = summary?.avg_interaction_rate !== undefined
                          ? `${summary.avg_interaction_rate.toFixed(2)}%`
                          : "0.00%";
                      } else if (column.key === "avg_cost") {
                        // Use avg cost from summary
                        summaryValue = summary?.avg_cost !== undefined
                          ? formatCurrency(summary.avg_cost)
                          : formatCurrency(0);
                      } else if (
                        column.key === "start_date" ||
                        column.key === "end_date" ||
                        column.key === "bidding_strategy_type" ||
                        column.key === "advertising_channel_type" ||
                        column.key === "status" ||
                        column.key === "bid" ||
                        column.key === "ad_type" ||
                        column.key === "match_type" ||
                        column.key === "final_url" ||
                        column.key === "account_name"
                      ) {
                        // Show empty for date, type, bidding strategy, status, bid, ad_type, match_type, final_url, and account_name in total row
                        summaryValue = "";
                      } else if (index !== 0 && (column.key === "campaign_name" || column.key === "adgroup_name")) {
                        // Navigation columns (campaign_name, adgroup_name) are empty except for the first column
                        summaryValue = "";
                      }
                      
                      return (
                        <td key={column.key} className={`table-cell table-text leading-[1.26] ${stickyClasses} ${borderClass}`}>
                          {summaryValue}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* Loading Overlay */}
                {sorting && (
                  <tr>
                    <td colSpan={columns.length + 1} className="relative">
                      <div className="absolute inset-0 bg-white bg-opacity-85 flex items-center justify-center z-20 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-3 bg-white px-6 py-4 rounded-lg shadow-lg border border-[#E6E6E6]">
                          <Loader size="md" message={loadingMessage} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data Rows */}
                {data.map((row, index) => {
                  const itemId = getId(row);
                  // Use combination of itemId and index to ensure unique keys
                  const uniqueKey = `${itemId}-${index}`;
                  
                  // Check if entity is removed or if parent entity is removed
                  const rowStatus = (row as any).status?.toUpperCase();
                  const campaignStatus = (row as any).campaign_status?.toUpperCase();
                  const adgroupStatus = (row as any).adgroup_status?.toUpperCase();
                  
                  // Entity is removed if:
                  // 1. Its own status is REMOVED, OR
                  // 2. For adgroups: campaign status is REMOVED, OR
                  // 3. For keywords/ads: campaign status is REMOVED OR adgroup status is REMOVED
                  const isRemoved = 
                    rowStatus === "REMOVED" ||
                    campaignStatus === "REMOVED" ||
                    adgroupStatus === "REMOVED";
                  
                  return (
                    <tr
                      key={uniqueKey}
                      className={`table-row group ${isRemoved ? "bg-gray-100 opacity-60" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedItems.has(itemId)}
                            onChange={(checked) => onSelectItem(itemId, checked)}
                            size="small"
                            disabled={isRemoved}
                          />
                        </div>
                      </td>

                      {/* Data Cells */}
                      {columns.map((column, colIndex) => {
                        const stickyClasses = getStickyClasses(column, colIndex);
                        const borderClass = column.sticky ? "border-r border-[#e8e8e3]" : "";
                        const widthClasses = column.width || column.minWidth || "";
                        const hoverClass = column.sticky && colIndex === 0 ? "group-hover:bg-gray-100" : "";
                        
                        return (
                          <td
                            key={column.key}
                            className={`table-cell ${stickyClasses} ${borderClass} ${widthClasses} ${hoverClass}`}
                          >
                            {renderCell(column, row)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

