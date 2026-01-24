import type { IGoogleCampaignsSummary } from "./campaign";


export type FieldType = "status" | "budget" | "bid" | "start_date" | "end_date" | "text" | "currency" | "number" | "percentage" | "roas";

export interface IColumnDefinition {
  key: string;
  label: string;
  sortable?: boolean;
  type: FieldType;
  sticky?: boolean;
  minWidth?: string;
  maxWidth?: string;
  width?: string;
  // For editable fields - can be boolean or function that takes row and returns boolean
  editable?: boolean | ((row: any) => boolean);
  // For status fields - options
  statusOptions?: Array<{ value: string; label: string }>;
  // For navigation
  navigateTo?: (row: any, accountId: string) => string | null;
  // Custom render function
  render?: (value: any, row: any) => React.ReactNode;
  // Get value from row
  getValue: (row: any) => any;
}

export interface IGoogleAdsTableProps<T = any> {
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
    newValue?: string;
  } | null;
  pendingChanges: {
    [field: string]: {
      itemId: string | number;
      newValue: any;
      oldValue: any;
    } | null;
  };
  summary: IGoogleCampaignsSummary | null;
  columns: IColumnDefinition[];
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
  onConfirmInlineEdit: (value: string, field?: string, itemId?: string | number) => void;
  onConfirmChange: (itemId: string | number, field: string, newValue: any) => void;
  onCancelChange: (field: string) => void;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getSortIcon: (column: string) => React.ReactElement;
  isPanelOpen?: boolean; // When true, editable fields become read-only
  inlineEditSuccess?: {
    itemId: string | number;
    field: string;
  } | null;
  inlineEditError?: {
    itemId: string | number;
    field: string;
    message: string;
  } | null;
}
