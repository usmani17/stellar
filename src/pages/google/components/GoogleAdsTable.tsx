import React from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Dropdown } from "../../../components/ui/Dropdown";
import { formatDateString, parseDateToYYYYMMDD } from "../../../utils/dateHelpers";

export type FieldType = "status" | "budget" | "bid" | "start_date" | "end_date" | "text" | "currency" | "number" | "percentage" | "roas";

export interface ColumnDefinition {
  key: string;
  label: string;
  sortable?: boolean;
  type: FieldType;
  sticky?: boolean;
  minWidth?: string;
  maxWidth?: string;
  width?: string;
  // For editable fields
  editable?: boolean;
  // For status fields - options
  statusOptions?: Array<{ value: string; label: string }>;
  // For navigation
  navigateTo?: (row: any, accountId: string) => string | null;
  // Custom render function
  render?: (value: any, row: any) => React.ReactNode;
  // Get value from row
  getValue: (row: any) => any;
}

export interface GoogleAdsTableProps<T = any> {
  data: T[];
  loading: boolean;
  sorting: boolean;
  accountId: string;
  selectedItems: Set<string | number>;
  allSelected: boolean;
  someSelected: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  editingCell: {
    itemId: string | number;
    field: string;
  } | null;
  editedValue: string;
  isCancelling: boolean;
  updatingField: {
    itemId: string | number;
    field: string;
  } | null;
  pendingChanges: {
    [field: string]: {
      itemId: string | number;
      newValue: any;
      oldValue: any;
    } | null;
  };
  summary: {
    total_count: number;
    total_spends: number;
    total_sales: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions?: number;
    total_interactions?: number;
    total_budget?: number;
    avg_acos: number;
    avg_roas: number;
    avg_conversion_rate?: number;
    avg_cost_per_conversion?: number;
    avg_interaction_rate?: number;
    avg_cost?: number;
    avg_cpc?: number;
  } | null;
  columns: ColumnDefinition[];
  getId: (row: T) => string | number;
  getItemName: (row: T) => string;
  emptyMessage: string;
  loadingMessage: string;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (itemId: string | number, checked: boolean) => void;
  onSort: (column: string) => void;
  onStartInlineEdit: (item: T, field: string) => void;
  onCancelInlineEdit: () => void;
  onInlineEditChange: (value: string) => void;
  onConfirmInlineEdit: (value: string, field: string) => void;
  onConfirmChange: (itemId: string | number, field: string, newValue: any) => void;
  onCancelChange: (field: string) => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getSortIcon: (column: string) => React.ReactElement;
  isPanelOpen?: boolean; // When true, editable fields become read-only
}

export function GoogleAdsTable<T = any>({
  data,
  loading,
  sorting,
  accountId,
  selectedItems,
  allSelected,
  someSelected,
  sortBy,
  sortOrder,
  editingCell,
  editedValue,
  isCancelling,
  updatingField,
  pendingChanges,
  summary,
  columns,
  getId,
  getItemName,
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
}: GoogleAdsTableProps<T>) {
  const navigate = useNavigate();

  const renderCell = (column: ColumnDefinition, row: T, index: number) => {
    const itemId = getId(row);
    const isEditing = editingCell?.itemId === itemId && editingCell?.field === column.key;
    const isUpdating = updatingField?.itemId === itemId && updatingField?.field === column.key;
    const pendingChange = pendingChanges[column.key];
    const hasPendingChange = pendingChange?.itemId === itemId;
    const value = column.getValue(row);

    // Handle editing state first (before custom render) so editable cells work properly
    if (isEditing && column.editable) {
      return renderEditableCell(column, value, row, itemId);
    }

    // Handle updating state
    if (isUpdating) {
      return (
        <div className="flex items-center gap-2">
          {column.render ? column.render(value, row) : renderValue(column, value)}
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#136D6D] border-t-transparent"></div>
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
    const isClickable = column.editable && !isEditing && !isPanelOpen; // Disable editing when panel is open

    // Only wrap in button if no custom render function is provided
    // Custom render functions should handle their own navigation/click handling
    if (column.navigateTo && !column.render) {
      const navPath = column.navigateTo(row, accountId);
      if (navPath) {
        return (
          <button
            onClick={() => navigate(navPath)}
            className="text-[13.3px] text-[#0b0f16] leading-[1.26] hover:text-[#136d6d] hover:underline cursor-pointer text-left truncate block w-full"
          >
            {cellContent}
          </button>
        );
      }
    }

    if (isClickable) {
      return (
        <div
          onClick={() => onStartInlineEdit(row, column.key)}
          className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1 w-full"
          style={{ pointerEvents: 'auto' }}
        >
          {cellContent}
        </div>
      );
    }

    // When panel is open and field is editable, show as read-only (no hover effect)
    if (column.editable && isPanelOpen && !isEditing) {
      return (
        <div className="cursor-not-allowed opacity-60 rounded px-2 py-1 w-full">
          {cellContent}
        </div>
      );
    }

    return <div>{cellContent}</div>;
  };

  const renderValue = (column: ColumnDefinition, value: any): React.ReactNode => {
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
            <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] font-semibold text-[#7a4dff] pointer-events-none">
              {label}
            </span>
          );
        }
        return getStatusBadge(value || "ENABLED");
      case "currency":
      case "budget":
      case "bid":
        return <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]" style={{ pointerEvents: 'none' }}>{formatCurrency(value || 0)}</span>;
      case "percentage":
        return <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">{formatPercentage(value || 0)}</span>;
      case "number":
        return <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">{((value || 0) as number).toLocaleString()}</span>;
      case "roas":
        return (
          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
            {value ? `${(value as number).toFixed(2)} x` : "0.00 x"}
          </span>
        );
      case "start_date":
      case "end_date":
        return (
          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] whitespace-nowrap">
            {formatDateString(value)}
          </span>
        );
      case "text":
      default:
        return <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">{value || "—"}</span>;
    }
  };

  const renderEditableCell = (column: ColumnDefinition, value: any, row: T, itemId: string | number): React.ReactNode => {
    // If column has statusOptions, show dropdown (for status, bidding_strategy_type, etc.)
    if (column.statusOptions && column.statusOptions.length > 0) {
      // Use wider width for bidding strategy (longer labels)
      const dropdownWidth = column.key === "bidding_strategy_type" ? "w-[220px]" : "w-[120px]";
      return (
        <div className="relative w-full z-[100000]">
          <Dropdown
            options={column.statusOptions}
            value={editedValue}
            onChange={(val) => {
              const newValue = val as string;
              onInlineEditChange(newValue);
              onConfirmInlineEdit(newValue, column.key);
            }}
            defaultOpen={true}
            closeOnSelect={true}
            buttonClassName="w-full text-[13.3px] px-2 py-1 min-w-0"
            width={dropdownWidth}
            align="left"
            className="w-full"
            menuClassName="z-[100000]"
          />
        </div>
      );
    }

    switch (column.type) {
      case "status":
        return (
          <div className="relative w-full z-[100000]">
            <Dropdown
              options={column.statusOptions || [
                { value: "ENABLED", label: "Enabled" },
                { value: "PAUSED", label: "Paused" },
              ]}
              value={editedValue}
              onChange={(val) => {
                const newValue = val as string;
                onInlineEditChange(newValue);
                onConfirmInlineEdit(newValue, column.key);
              }}
              defaultOpen={true}
              closeOnSelect={true}
              buttonClassName="w-full text-[13.3px] px-2 py-1 min-w-0"
              width="w-[120px]"
              align="left"
              className="w-full"
              menuClassName="z-[100000]"
            />
          </div>
        );

      case "budget":
      case "bid":
        return (
          <div className="flex items-center">
            <input
              type="number"
              step="0.01"
              min="0"
              value={editedValue}
              onChange={(e) => onInlineEditChange(e.target.value)}
              onBlur={(e) => {
                if (isCancelling) return;
                const inputValue = e.target.value;
                const oldValue = (value || 0).toString();
                if (inputValue === oldValue || inputValue === "") {
                  onCancelInlineEdit();
                } else {
                  onConfirmInlineEdit(inputValue, column.key);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  onCancelInlineEdit();
                }
              }}
              autoFocus
              className="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
            />
          </div>
        );

      case "start_date":
      case "end_date":
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
        }
        return (
          <div className="flex items-center">
            <input
              type="date"
              value={editedValue}
              min={minDate}
              onChange={(e) => onInlineEditChange(e.target.value)}
              onBlur={(e) => {
                if (isCancelling) return;
                const inputValue = e.target.value;
                const oldValue = parseDateToYYYYMMDD(value);
                if (inputValue === oldValue) {
                  onCancelInlineEdit();
                } else {
                  onConfirmInlineEdit(inputValue, column.key);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  onCancelInlineEdit();
                }
              }}
              autoFocus
              className="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-forest-f40"
            />
          </div>
        );

      default:
        return renderValue(column, value);
    }
  };

  const getStickyClasses = (column: ColumnDefinition, index: number): string => {
    if (!column.sticky) return "";
    
    // Calculate left offset based on previous sticky columns
    let leftOffset = 35; // Checkbox width
    for (let i = 0; i < index; i++) {
      if (columns[i]?.sticky) {
        // Estimate width - use minWidth or default
        const minWidth = columns[i]?.minWidth;
        const width = minWidth ? parseInt(minWidth.replace('px', '').replace('min-w-[', '').replace(']', '')) : 300;
        leftOffset += width;
      }
    }
    
    // Use Tailwind classes directly - first sticky column is at 35px (after checkbox)
    if (index === 0) {
      return "sticky left-[35px] bg-white z-10";
    }
    // For more sticky columns, would need more specific handling
    return "sticky bg-white z-10";
  };

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto overflow-y-visible w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            {loadingMessage}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">{emptyMessage}</p>
          </div>
        ) : (
          <div className="relative">
            <table className="min-w-[1200px] w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  {/* Checkbox Header */}
                  <th className="table-header w-[35px] sticky left-0 bg-white z-10">
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
                {/* Summary Row */}
                {summary && (
                  <tr className="table-summary-row">
                    <td className="table-cell sticky left-0 bg-[#f5f5f0] z-10"></td>
                    {columns.map((column, index) => {
                      const stickyClasses = getStickyClasses(column, index).replace("bg-white", "bg-[#f5f5f0]");
                      const borderClass = column.sticky ? "border-r border-[#e8e8e3]" : "";
                      
                      let summaryValue: React.ReactNode = "";
                      // Only show Total in the first column (index 0), which is typically name/adgroup_name/campaign_name/ad_id
                      if (index === 0 && (column.key === "name" || column.key === "adgroup_name" || column.key === "campaign_name" || column.key === "ad_id")) {
                        summaryValue = `Total (${summary?.total_count || 0})`;
                      } else if (column.key === "spends") {
                        summaryValue = formatCurrency(summary?.total_spends || 0);
                      } else if (column.key === "sales") {
                        summaryValue = formatCurrency(summary?.total_sales || 0);
                      } else if (column.key === "impressions") {
                        summaryValue = (summary?.total_impressions || 0).toLocaleString();
                      } else if (column.key === "clicks") {
                        summaryValue = (summary?.total_clicks || 0).toLocaleString();
                      } else if (column.key === "budget") {
                        // Use total budget from summary
                        summaryValue = formatCurrency(summary?.total_budget || 0);
                      } else if (column.key === "acos") {
                        summaryValue = `${(summary?.avg_acos || 0).toFixed(2)}%`;
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
                        column.key === "status"
                      ) {
                        // Show "—" for date, type, bidding strategy, and status columns in total row
                        summaryValue = "—";
                      }
                      
                      return (
                        <td key={column.key} className={`table-cell text-[13.3px] text-[#0b0f16] leading-[1.26] ${stickyClasses} ${borderClass}`}>
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
                          <div className="relative">
                            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#136D6D] border-t-transparent"></div>
                          </div>
                          <span className="text-[12.8px] font-medium text-[#136D6D]">{loadingMessage}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data Rows */}
                {data.map((row, index) => {
                  const isLastRow = index === data.length - 1;
                  const itemId = getId(row);
                  
                  return (
                    <tr
                      key={itemId}
                      className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""} hover:bg-gray-50 transition-colors`}
                    >
                      {/* Checkbox */}
                      <td className="table-cell sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedItems.has(itemId)}
                            onChange={(checked) => onSelectItem(itemId, checked)}
                            size="small"
                          />
                        </div>
                      </td>

                      {/* Data Cells */}
                      {columns.map((column, colIndex) => {
                        const stickyClasses = getStickyClasses(column, colIndex);
                        const borderClass = column.sticky ? "border-r border-[#e8e8e3]" : "";
                        const widthClasses = column.width || column.minWidth || "";
                        
                        return (
                          <td
                            key={column.key}
                            className={`table-cell ${stickyClasses} ${borderClass} ${widthClasses}`}
                          >
                            {renderCell(column, row, index)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

