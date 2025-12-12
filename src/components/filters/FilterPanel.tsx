import React, { useState, useRef } from "react";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { Chip } from "../ui/Chip";

export interface FilterItem {
  id: string;
  field: "campaign_name" | "state" | "budget" | "type" | "profile_name" | "status" | "advertising_channel_type" | "account_name";
  operator?: string; // For campaign_name, budget, profile_name, and account_name
  value: string | number;
}

export type FilterValues = FilterItem[];

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  filterFields?: Array<{ value: string; label: string }>;
}

const DEFAULT_FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "state", label: "State" },
  { value: "budget", label: "Budget" },
  { value: "type", label: "Type" },
  { value: "profile_name", label: "Profile Name" },
] as const;

const GOOGLE_FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "status", label: "Status" },
  { value: "budget", label: "Budget" },
  { value: "advertising_channel_type", label: "Channel Type" },
  { value: "account_name", label: "Account Name" },
] as const;

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
];

const STATE_OPTIONS = ["Enable", "Paused", "Archived"];
const TYPE_OPTIONS = ["SP", "SB", "SD"];
const STATUS_OPTIONS = ["ENABLED", "PAUSED", "REMOVED"];
const CHANNEL_TYPE_OPTIONS = ["SEARCH", "DISPLAY", "SHOPPING", "PERFORMANCE_MAX", "VIDEO", "HOTEL", "MULTI_CHANNEL", "LOCAL", "SMART"];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = [],
  filterFields,
}) => {
  const [activeFilters, setActiveFilters] =
    useState<FilterValues>(initialFilters);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const panelRef = useRef<HTMLDivElement>(null);
  
  const FILTER_FIELDS = filterFields || DEFAULT_FILTER_FIELDS;

  const handleAddFilter = () => {
    if (!selectedField || !filterValue) return;

    // For fields that require operators, ensure operator is selected
    if (
      (selectedField === "campaign_name" ||
        selectedField === "budget" ||
        selectedField === "profile_name" ||
        selectedField === "account_name") &&
      !selectedOperator
    ) {
      return;
    }

    const newFilter: FilterItem = {
      id: `${selectedField}-${Date.now()}`,
      field: selectedField as FilterItem["field"],
      operator: selectedOperator || undefined,
      value:
        selectedField === "budget" ? parseFloat(filterValue) || 0 : filterValue,
    };

    setActiveFilters([...activeFilters, newFilter]);
    setSelectedField("");
    setSelectedOperator("");
    setFilterValue("");
  };

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters(activeFilters.filter((f) => f.id !== filterId));
  };

  const handleApply = () => {
    onApply(activeFilters);
    // Don't auto-close - let user toggle with button
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    onApply([]);
  };

  const getOperatorLabel = (operator: string) => {
    const allOperators = [...STRING_OPERATORS, ...NUMERIC_OPERATORS];
    return allOperators.find((op) => op.value === operator)?.label || operator;
  };

  const getFieldLabel = (field: string) => {
    return FILTER_FIELDS.find((f) => f.value === field)?.label || field;
  };

  const getFilterDisplayValue = (filter: FilterItem) => {
    if (filter.field === "state" || filter.field === "type") {
      return filter.value;
    }
    if (filter.operator) {
      return `${getOperatorLabel(filter.operator)} ${filter.value}`;
    }
    return filter.value.toString();
  };

  const needsOperator =
    selectedField === "campaign_name" ||
    selectedField === "budget" ||
    selectedField === "profile_name" ||
    selectedField === "account_name";
  const isStateOrType = selectedField === "state" || selectedField === "type";
  const isStatusOrChannelType = selectedField === "status" || selectedField === "advertising_channel_type";

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="border border-gray-200 rounded-xl shadow-sm w-full"
      style={{ backgroundColor: "#F5F5F0" }}
    >
      {/* Filter Builder */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-end gap-2">
          {/* Field Dropdown */}
          <div className="w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Filter
            </label>
            <Dropdown<string>
              options={FILTER_FIELDS.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
              value={selectedField || undefined}
              placeholder="Select Filter"
              onChange={(value) => {
                setSelectedField(value);
                setSelectedOperator("");
                setFilterValue("");
              }}
              buttonClassName="w-full"
            />
          </div>

          {/* Operator Dropdown (for campaign_name and budget) */}
          {selectedField && needsOperator && (
            <div className="w-[150px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Operator
              </label>
              <Dropdown<string>
                options={
                  selectedField === "campaign_name" ||
                  selectedField === "profile_name" ||
                  selectedField === "account_name"
                    ? STRING_OPERATORS.map((op) => ({
                        value: op.value,
                        label: op.label,
                      }))
                    : NUMERIC_OPERATORS.map((op) => ({
                        value: op.value,
                        label: op.label,
                      }))
                }
                value={selectedOperator || undefined}
                placeholder="Select Operator"
                onChange={(value) => setSelectedOperator(value)}
                buttonClassName="w-full"
              />
            </div>
          )}

          {/* Value Input - Only show when a field is selected */}
          {selectedField && (
            <div className="w-[200px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Value
              </label>
              {isStateOrType ? (
                <Dropdown<string>
                  options={(selectedField === "state"
                    ? STATE_OPTIONS
                    : TYPE_OPTIONS
                  ).map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder={`Select ${
                    selectedField === "state" ? "State" : "Type"
                  }`}
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="w-full"
                />
              ) : isStatusOrChannelType ? (
                <Dropdown<string>
                  options={(selectedField === "status"
                    ? STATUS_OPTIONS
                    : CHANNEL_TYPE_OPTIONS
                  ).map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder={`Select ${
                    selectedField === "status" ? "Status" : "Channel Type"
                  }`}
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="w-full"
                />
              ) : selectedField === "budget" ? (
                <input
                  type="number"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter budget"
                  className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              ) : (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter value"
                  className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              )}
            </div>
          )}

          {/* Add Filter Button */}
          <button
            onClick={handleAddFilter}
            disabled={
              !selectedField ||
              !filterValue ||
              (needsOperator && !selectedOperator)
            }
            className="px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Add Filter
          </button>
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
              >
                {getFieldLabel(filter.field)}: {getFilterDisplayValue(filter)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          onClick={handleClearAll}
          disabled={activeFilters.length === 0}
          className="text-color-f60 bg-background-field px-2 py-1  text-normal   border border-gray-200 rounded-lg items-center hover:bg-gray-50 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px]  rounded-lg hover:bg-[#0e5a5a] transition-colors text-normal"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};
