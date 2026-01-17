import React, { useState, useEffect, useRef } from "react";
import { Dropdown } from "../ui/Dropdown";
import { Chip } from "../ui/Chip";
import { Checkbox } from "../ui/Checkbox";
import { getFilterFields, getFilterOptions, type FilterField, type FilterOption } from "../../services/dynamicFiltersService";

export interface FilterItem {
  id: string;
  field: string;
  operator?: string;
  value: string | number | string[] | { min: number; max: number };
}

export type FilterValues = FilterItem[];

interface DynamicFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  accountId: string;
  marketplace: string; // e.g., "google_adwords", "amazon", "tiktok"
}

const STRING_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "equals", label: "Equals" },
];

const NUMERIC_OPERATORS = [
  { value: "lt", label: "<" },
  { value: "gt", label: ">" },
  { value: "eq", label: "=" },
  { value: "lte", label: "<=" },
  { value: "gte", label: ">=" },
  { value: "between", label: "Between" },
];

export const DynamicFilterPanel: React.FC<DynamicFilterPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = [],
  accountId,
  marketplace,
}) => {
  const [activeFilters, setActiveFilters] = useState<FilterValues>(initialFilters);
  const [filterFields, setFilterFields] = useState<FilterField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [filterValueMin, setFilterValueMin] = useState<string>("");
  const [filterValueMax, setFilterValueMax] = useState<string>("");
  const [selectedMultiValues, setSelectedMultiValues] = useState<string[]>([]);
  const [dynamicOptions, setDynamicOptions] = useState<FilterOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const loadingFieldsRef = useRef(false);
  const fieldsLoadedRef = useRef<string>(""); // Track which accountId+marketplace combo we've loaded

  // Load filter fields from backend on mount
  useEffect(() => {
    // Reset cache when panel closes
    if (!isOpen) {
      fieldsLoadedRef.current = "";
      loadingFieldsRef.current = false;
      return;
    }

    if (!accountId || !marketplace) {
      return;
    }

    // Create a unique key for this accountId+marketplace combination
    const cacheKey = `${accountId}-${marketplace}`;
    
    // Skip if already loading or already loaded for this combination
    if (loadingFieldsRef.current || fieldsLoadedRef.current === cacheKey) {
      return;
    }

    loadingFieldsRef.current = true;
    setLoadingFields(true);
    
    getFilterFields(accountId, marketplace)
      .then((fields) => {
        // Double-check we're still supposed to be loading (prevent race conditions)
        if (loadingFieldsRef.current && fieldsLoadedRef.current !== cacheKey) {
          setFilterFields(fields);
          fieldsLoadedRef.current = cacheKey; // Mark as loaded
          // Auto-select first field if available
          if (fields.length > 0 && !selectedField) {
            const firstField = fields[0];
            setSelectedField(firstField.field_name);
            if (firstField.default_operator) {
              setSelectedOperator(firstField.default_operator);
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error loading filter fields:", error);
        fieldsLoadedRef.current = ""; // Reset on error so we can retry
      })
      .finally(() => {
        setLoadingFields(false);
        loadingFieldsRef.current = false;
      });
  }, [isOpen, accountId, marketplace]);

  // Load dynamic options when field is selected
  useEffect(() => {
    if (selectedField && accountId && marketplace) {
      const field = filterFields.find((f) => f.field_name === selectedField);
      if (field?.type === "dynamic_dropdown") {
        setLoadingOptions(true);
        getFilterOptions(accountId, marketplace, selectedField)
          .then((options) => {
            setDynamicOptions(options);
          })
          .catch((error) => {
            console.error("Error loading filter options:", error);
            setDynamicOptions([]);
          })
          .finally(() => {
            setLoadingOptions(false);
          });
      } else {
        setDynamicOptions([]);
      }
    }
  }, [selectedField, accountId, marketplace, filterFields]);

  // Sync active filters with initialFilters on mount
  useEffect(() => {
    if (initialFilters.length > 0 && activeFilters.length === 0) {
      setActiveFilters(initialFilters);
    }
  }, [initialFilters]);

  const getCurrentField = (): FilterField | undefined => {
    return filterFields.find((f) => f.field_name === selectedField);
  };

  const needsOperator = (): boolean => {
    const field = getCurrentField();
    if (!field) return false;
    return field.operators.length > 0;
  };

  const isMultiSelect = (): boolean => {
    const field = getCurrentField();
    return field?.type === "multi_select" || false;
  };

  const isDropdown = (): boolean => {
    const field = getCurrentField();
    return field?.type === "static_dropdown" || field?.type === "dynamic_dropdown";
  };

  const resetForm = () => {
    setSelectedField("");
    setSelectedOperator("");
    setFilterValue("");
    setFilterValueMin("");
    setFilterValueMax("");
    setSelectedMultiValues([]);
    setDynamicOptions([]);
    setEditingFilterId(null);
    setValidationError(null);
  };

  const handleEditFilter = (filterId: string) => {
    const filter = activeFilters.find((f) => f.id === filterId);
    if (!filter) return;

    setEditingFilterId(filterId);
    setSelectedField(filter.field);
    setSelectedOperator(filter.operator || "");

    // Handle different value types
    if (filter.operator === "between" && typeof filter.value === "object" && !Array.isArray(filter.value) && "min" in filter.value && "max" in filter.value) {
      // Between operator - populate min and max
      setFilterValueMin(String(filter.value.min));
      setFilterValueMax(String(filter.value.max));
      setFilterValue("");
    } else if (Array.isArray(filter.value)) {
      // Multi-select
      setSelectedMultiValues(filter.value as string[]);
      setFilterValue("");
      setFilterValueMin("");
      setFilterValueMax("");
    } else {
      // Single value
      setFilterValue(String(filter.value));
      setFilterValueMin("");
      setFilterValueMax("");
      setSelectedMultiValues([]);
    }

    // Load dynamic options if needed
    const field = filterFields.find((f) => f.field_name === filter.field);
    if (field?.type === "dynamic_dropdown" && accountId && marketplace) {
      setLoadingOptions(true);
      getFilterOptions(accountId, marketplace, filter.field)
        .then((options) => {
          setDynamicOptions(options);
        })
        .catch((error) => {
          console.error("Error loading filter options:", error);
          setDynamicOptions([]);
        })
        .finally(() => {
          setLoadingOptions(false);
        });
    } else {
      setDynamicOptions([]);
    }
  };

  const handleAddFilter = () => {
    const field = getCurrentField();
    if (!field || !selectedField) return;

    // Validate value based on operator and field type
    if (selectedOperator === "between") {
      // Validate between operator
      if (!filterValueMin || !filterValueMax) {
        setValidationError("Both minimum and maximum values are required");
        return;
      }
      const min = parseFloat(filterValueMin);
      const max = parseFloat(filterValueMax);
      if (isNaN(min) || isNaN(max)) {
        setValidationError("Please enter valid numbers");
        return;
      }
      if (min >= max) {
        setValidationError("Minimum value must be less than maximum value");
        return;
      }
      setValidationError(null); // Clear error if validation passes
    } else if (isMultiSelect()) {
      if (selectedMultiValues.length === 0) return;
    } else if (isDropdown()) {
      if (!filterValue) return;
    } else {
      if (!filterValue) return;
      if (needsOperator() && !selectedOperator) return;
    }

    // Convert value based on type and operator
    let valueToStore: string | number | string[] | { min: number; max: number };
    if (selectedOperator === "between") {
      valueToStore = {
        min: parseFloat(filterValueMin),
        max: parseFloat(filterValueMax),
      };
    } else if (field.type === "number") {
      valueToStore = parseFloat(filterValue) || 0;
    } else if (isMultiSelect()) {
      valueToStore = selectedMultiValues;
    } else {
      valueToStore = filterValue;
    }

    const filterToAdd: FilterItem = {
      id: editingFilterId || `${selectedField}-${Date.now()}`,
      field: selectedField,
      operator: selectedOperator || undefined,
      value: valueToStore,
    };

    if (editingFilterId) {
      // Replace existing filter
      const updatedFilters = activeFilters.map((f) =>
        f.id === editingFilterId ? filterToAdd : f
      );
      setActiveFilters(updatedFilters);
    } else {
      // Add new filter
      setActiveFilters([...activeFilters, filterToAdd]);
    }

    // Clear validation error and reset form
    setValidationError(null);
    resetForm();

    // Auto-select next available field
    const usedFields = new Set(activeFilters.map((f) => f.field));
    const nextField = filterFields.find((f) => !usedFields.has(f.field_name));
    if (nextField) {
      setSelectedField(nextField.field_name);
      if (nextField.default_operator) {
        setSelectedOperator(nextField.default_operator);
      }
    }
  };

  const handleRemoveFilter = (filterId: string) => {
    const updatedFilters = activeFilters.filter((f) => f.id !== filterId);
    setActiveFilters(updatedFilters);
    // Don't auto-apply - let user click "Apply Filters" manually
    // If we were editing this filter, cancel edit mode
    if (editingFilterId === filterId) {
      setEditingFilterId(null);
      resetForm();
    }
  };

  const handleApply = () => {
    onApply(activeFilters);
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    onApply([]);
    onClose();
  };

  const getOperatorLabel = (operator: string): string => {
    const allOperators = [...STRING_OPERATORS, ...NUMERIC_OPERATORS];
    return allOperators.find((op) => op.value === operator)?.label || operator;
  };

  const getFieldLabel = (fieldName: string): string => {
    const field = filterFields.find((f) => f.field_name === fieldName);
    return field?.label || fieldName;
  };

  const getFilterDisplayValue = (filter: FilterItem): string => {
    if (Array.isArray(filter.value)) {
      return filter.value.join(", ");
    }
    if (filter.operator === "between" && typeof filter.value === "object" && !Array.isArray(filter.value) && "min" in filter.value && "max" in filter.value) {
      return `Between ${filter.value.min} and ${filter.value.max}`;
    }
    if (filter.operator) {
      return `${getOperatorLabel(filter.operator)} ${filter.value}`;
    }
    // For dropdowns, show label instead of value
    const field = filterFields.find((f) => f.field_name === filter.field);
    if (field?.options) {
      const option = field.options.find((opt) => opt.value === filter.value);
      return option?.label || String(filter.value);
    }
    return String(filter.value);
  };

  const getAvailableFields = () => {
    const usedFields = new Set(activeFilters.map((f) => f.field));
    return filterFields
      .filter((f) => {
        // For multi-select fields, allow multiple filters
        if (f.type === "multi_select") return true;
        // If we're editing a filter, allow the field being edited
        if (editingFilterId) {
          const editingFilter = activeFilters.find((f) => f.id === editingFilterId);
          if (editingFilter && editingFilter.field === f.field_name) {
            return true;
          }
        }
        return !usedFields.has(f.field_name);
      })
      .map((f) => ({
        value: f.field_name,
        label: f.label,
      }));
  };

  const getOperatorsForField = () => {
    const field = getCurrentField();
    if (!field) return [];
    
    // If field has operators defined, use those (respects backend configuration)
    if (field.operators && field.operators.length > 0) {
      const allOperators = [...STRING_OPERATORS, ...NUMERIC_OPERATORS];
      return allOperators.filter((op) => field.operators.includes(op.value));
    }
    
    // Fallback to type-based operators if no operators specified
    const isStringField = field.type === "string";
    return isStringField ? STRING_OPERATORS : NUMERIC_OPERATORS;
  };

  const getOptionsForField = (): FilterOption[] => {
    const field = getCurrentField();
    if (!field) return [];
    
    if (field.type === "static_dropdown" && field.options) {
      return field.options;
    }
    if (field.type === "dynamic_dropdown") {
      return dynamicOptions;
    }
    return [];
  };

  if (!isOpen) return null;

  const currentField = getCurrentField();
  const fieldNeedsOperator = needsOperator();
  const fieldIsMultiSelect = isMultiSelect();
  const fieldIsDropdown = isDropdown();

  return (
    <div
      ref={panelRef}
      className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]"
    >
      {/* Filter Builder */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start gap-2">
          {/* Field Dropdown */}
          <div className="w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Filter
            </label>
            {loadingFields ? (
              <div className="text-[11.2px] text-[#556179] py-2">Loading...</div>
            ) : (
              <Dropdown<string>
                options={getAvailableFields()}
                value={selectedField || undefined}
                placeholder="Select Filter"
                onChange={(value) => {
                  setSelectedField(value);
                  setFilterValue("");
                  setFilterValueMin("");
                  setFilterValueMax("");
                  setSelectedMultiValues([]);
                  setDynamicOptions([]);
                  setEditingFilterId(null);
                  
                  const field = filterFields.find((f) => f.field_name === value);
                  if (field?.default_operator) {
                    setSelectedOperator(field.default_operator);
                  } else {
                    setSelectedOperator("");
                  }
                }}
                buttonClassName="edit-button w-full"
              />
            )}
          </div>

          {/* Operator Dropdown */}
          {selectedField && (fieldNeedsOperator || selectedOperator) && (
            <div className="w-[150px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Operator
              </label>
              <Dropdown<string>
                options={getOperatorsForField().map((op) => ({
                  value: op.value,
                  label: op.label,
                }))}
                value={selectedOperator || undefined}
                placeholder="Select Operator"
                onChange={(value) => {
                  setSelectedOperator(value);
                  // Clear values and errors when operator changes
                  setFilterValue("");
                  setFilterValueMin("");
                  setFilterValueMax("");
                  setValidationError(null);
                }}
                buttonClassName="edit-button w-full"
              />
            </div>
          )}

          {/* Value Input */}
          {selectedField && (
            <div className={selectedOperator === "between" && currentField?.type === "number" ? "w-[300px]" : "w-[150px]"}>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Value
              </label>
              {fieldIsMultiSelect ? (
                <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg bg-[#FEFEFB] p-2">
                  {currentField?.options?.map((opt) => (
                    <div
                      key={opt.value}
                      className="py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('button[role="checkbox"]') ||
                          target.tagName === "LABEL" ||
                          target.closest("label")
                        ) {
                          return;
                        }
                        if (selectedMultiValues.includes(opt.value)) {
                          setSelectedMultiValues(
                            selectedMultiValues.filter((v) => v !== opt.value)
                          );
                        } else {
                          setSelectedMultiValues([...selectedMultiValues, opt.value]);
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedMultiValues.includes(opt.value)}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedMultiValues([...selectedMultiValues, opt.value]);
                          } else {
                            setSelectedMultiValues(
                              selectedMultiValues.filter((v) => v !== opt.value)
                            );
                          }
                        }}
                        label={opt.label}
                        size="small"
                        className="w-full [&_label]:text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              ) : fieldIsDropdown ? (
                <Dropdown<string>
                  options={getOptionsForField().map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  value={filterValue || undefined}
                  placeholder={
                    loadingOptions
                      ? "Loading..."
                      : `Select ${currentField?.label || ""}`
                  }
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="edit-button w-full"
                  disabled={loadingOptions}
                />
              ) : selectedOperator === "between" && currentField?.type === "number" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={filterValueMin}
                        onChange={(e) => {
                          setFilterValueMin(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="Min"
                        className={`campaign-input w-full ${
                          validationError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={filterValueMax}
                        onChange={(e) => {
                          setFilterValueMax(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="Max"
                        className={`campaign-input w-full ${
                          validationError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                  {validationError && (
                    <div className="text-red-500 text-[11px] mt-1">
                      {validationError}
                    </div>
                  )}
                </div>
              ) : currentField?.type === "number" ? (
                <input
                  type="number"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={`Enter ${currentField?.label || ""}`}
                  className="campaign-input"
                />
              ) : (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={`Enter ${currentField?.label || ""}`}
                  className="campaign-input"
                />
              )}
            </div>
          )}

          {/* Add Filter Button */}
          <div className="flex flex-col">
            <div className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase invisible">
              &nbsp;
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddFilter}
                disabled={
                  !selectedField ||
                  (selectedOperator === "between"
                    ? !filterValueMin || !filterValueMax
                    : fieldIsMultiSelect
                    ? selectedMultiValues.length === 0
                    : !filterValue) ||
                  (fieldNeedsOperator && !selectedOperator)
                }
                className="apply-button-add"
              >
                {editingFilterId ? "Update Filter" : "Add Filter"}
              </button>
              {editingFilterId && (
                <button
                  onClick={resetForm}
                  className="cancel-button"
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Chip
                key={filter.id}
                onClose={() => handleRemoveFilter(filter.id)}
                onClick={() => handleEditFilter(filter.id)}
                className={editingFilterId === filter.id ? "ring-2 ring-[#136D6D] ring-offset-1" : ""}
              >
                {getFieldLabel(filter.field)}: {getFilterDisplayValue(filter)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button onClick={handleClearAll} className="cancel-button">
          Clear All
        </button>
        <button type="button" onClick={handleApply} className="apply-button">
          Apply Filters
        </button>
      </div>
    </div>
  );
};
