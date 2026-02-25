export type FilterOperator = '>' | '<' | '>=' | '<=' | '=' | 'between';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  field_name: string;
  label: string;
  type: 'text' | 'select' | 'date_range' | 'number_range' | 'boolean';
  options?: FilterOption[];
  operators?: FilterOperator[];
  default_operator?: FilterOperator;
}

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any; // For 'between' operator
}

export interface FilterDefinitionsResponse {
  filters: FilterDefinition[];
  page_type: string;
}
