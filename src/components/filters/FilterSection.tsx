import React from "react";
import { FilterPanel, type FilterValues } from "./FilterPanel";

interface FilterSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  filterFields: Array<{ value: string; label: string }>;
  initialFilters?: FilterValues;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  isOpen,
  onToggle,
  filters,
  onApply,
  filterFields,
  initialFilters,
}) => {
  return (
    <>
      {/* Add Filter Button */}
      <button
        onClick={onToggle}
        className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors"
      >
        <svg
          className="w-5 h-5 text-[#072929]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="text-[10.64px] text-[#072929] font-normal">
          Add Filter
        </span>
        <svg
          className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </>
  );
};

// Separate component for the filter panel to be rendered outside the header
export const FilterSectionPanel: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  filterFields: Array<{ value: string; label: string }>;
  initialFilters?: FilterValues;
  accountId?: string;
  channelType?: "amazon" | "google" | "walmart";
}> = ({
  isOpen,
  onToggle,
  onApply,
  filterFields,
  initialFilters,
  filters,
  accountId,
  channelType,
}) => {
  if (!isOpen) return null;

  return (
    <FilterPanel
      isOpen={true}
      onClose={onToggle}
      onApply={onApply}
      initialFilters={initialFilters || filters}
      filterFields={filterFields}
      accountId={accountId}
      channelType={channelType}
    />
  );
};
