import React, { useState, useRef } from "react";

export interface FilterItem {
  id: string;
  field: "campaign_name" | "state" | "budget" | "type";
  operator?: string; // For campaign_name and budget
  value: string | number;
}

export type FilterValues = FilterItem[];

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

const FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "state", label: "State" },
  { value: "budget", label: "Budget" },
  { value: "type", label: "Type" },
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

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = [],
}) => {
  const [activeFilters, setActiveFilters] = useState<FilterValues>(initialFilters);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const panelRef = useRef<HTMLDivElement>(null);

  const handleAddFilter = () => {
    if (!selectedField || !filterValue) return;

    // For fields that require operators, ensure operator is selected
    if (
      (selectedField === "campaign_name" || selectedField === "budget") &&
      !selectedOperator
    ) {
      return;
    }

    const newFilter: FilterItem = {
      id: `${selectedField}-${Date.now()}`,
      field: selectedField as FilterItem["field"],
      operator: selectedOperator || undefined,
      value: selectedField === "budget" ? parseFloat(filterValue) || 0 : filterValue,
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

  const needsOperator = selectedField === "campaign_name" || selectedField === "budget";
  const isStateOrType = selectedField === "state" || selectedField === "type";

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="border border-[#E6E6E6] rounded-xl shadow-sm w-full"
      style={{ backgroundColor: "#F5F5F0" }}
    >
      {/* Filter Builder */}
      <div className="p-4 border-b border-[#E6E6E6]">
        <div className="flex items-end gap-2">
          {/* Field Dropdown */}
          <div className="flex-1">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Filter
            </label>
            <select
              value={selectedField}
              onChange={(e) => {
                setSelectedField(e.target.value);
                setSelectedOperator("");
                setFilterValue("");
              }}
              className="w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] bg-white"
            >
              <option value="">Select Filter</option>
              {FILTER_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Dropdown (for campaign_name and budget) */}
          {needsOperator && (
            <div className="flex-1">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Operator
              </label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] bg-white"
              >
                <option value="">Select Operator</option>
                {selectedField === "campaign_name" &&
                  STRING_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                {selectedField === "budget" &&
                  NUMERIC_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Value Input */}
          <div className="flex-1">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Value
            </label>
            {isStateOrType ? (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] bg-white"
              >
                <option value="">Select {selectedField === "state" ? "State" : "Type"}</option>
                {(selectedField === "state" ? STATE_OPTIONS : TYPE_OPTIONS).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : selectedField === "budget" ? (
              <input
                type="number"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Enter budget"
                className="w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            ) : (
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Enter value"
                className="w-full px-4 py-2.5 border border-[#E6E6E6] rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            )}
          </div>

          {/* Add Filter Button */}
          <button
            onClick={handleAddFilter}
            disabled={!selectedField || !filterValue || (needsOperator && !selectedOperator)}
            className="px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Add Filter
          </button>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="p-4 border-b border-[#E6E6E6]">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <div
                key={filter.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F0] border border-[#E6E6E6] rounded-lg"
              >
                <span className="text-[11.2px] font-medium text-black">
                  {getFieldLabel(filter.field)}: {getFilterDisplayValue(filter)}
                </span>
                <button
                  onClick={() => handleRemoveFilter(filter.id)}
                  className="text-[#556179] hover:text-black transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          onClick={handleClearAll}
          disabled={activeFilters.length === 0}
          className="px-4 py-2 text-[11.2px] font-medium text-[#556179] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] font-semibold rounded-lg hover:bg-[#0e5a5a] transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};
