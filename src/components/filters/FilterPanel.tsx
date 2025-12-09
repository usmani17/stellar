import React, { useState, useEffect } from 'react';
import type { FilterDefinition, Filter, FilterOperator } from '../../types/filters';
import { FilterInput } from './FilterInput';
import { FilterSelect } from './FilterSelect';
import { FilterRange } from './FilterRange';

interface FilterPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  pageType: string;
  filterDefinitions: FilterDefinition[];
  activeFilters: Filter[];
  onApply: (filters: Filter[]) => void;
  onClear: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  pageType,
  filterDefinitions,
  activeFilters,
  onApply,
  onClear,
}) => {
  const [filters, setFilters] = useState<Filter[]>(activeFilters);
  const [availableDefinitions, setAvailableDefinitions] = useState<FilterDefinition[]>(filterDefinitions);

  useEffect(() => {
    setFilters(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    setAvailableDefinitions(filterDefinitions);
  }, [filterDefinitions]);

  const handleAddFilter = () => {
    // Find first available filter definition that's not already in use
    const usedFields = new Set(filters.map(f => f.field));
    const availableDef = availableDefinitions.find(def => !usedFields.has(def.field_name));
    
    if (availableDef) {
      const defaultOperator = availableDef.default_operator || (availableDef.type === 'number_range' ? 'between' : '=');
      const newFilter: Filter = {
        field: availableDef.field_name,
        operator: defaultOperator,
        value: '',
        ...(defaultOperator === 'between' && { value2: '' }),
      };
      setFilters([...filters, newFilter]);
    }
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, updates: Partial<Filter>) => {
    const updatedFilters = [...filters];
    updatedFilters[index] = { ...updatedFilters[index], ...updates };
    setFilters(updatedFilters);
  };

  const handleApply = () => {
    // Filter out empty filters
    const validFilters = filters.filter(f => {
      if (f.operator === 'between') {
        return f.value !== '' && f.value !== null && f.value !== undefined &&
               f.value2 !== '' && f.value2 !== null && f.value2 !== undefined;
      }
      return f.value !== '' && f.value !== null && f.value !== undefined;
    });
    onApply(validFilters);
  };

  const handleClearAll = () => {
    setFilters([]);
    onClear();
  };

  const getFilterDefinition = (fieldName: string): FilterDefinition | undefined => {
    return availableDefinitions.find(def => def.field_name === fieldName);
  };

  const renderFilterInput = (filter: Filter, index: number) => {
    const definition = getFilterDefinition(filter.field);
    if (!definition) return null;

    switch (definition.type) {
      case 'text':
        return (
          <FilterInput
            definition={definition}
            value={filter.value as string}
            onChange={(value) => handleFilterChange(index, { value })}
          />
        );
      case 'select':
        return (
          <FilterSelect
            definition={definition}
            value={filter.value as string}
            onChange={(value) => handleFilterChange(index, { value })}
          />
        );
      case 'number_range':
        return (
          <FilterRange
            definition={definition}
            operator={filter.operator}
            value={filter.value as number | string}
            value2={filter.value2 as number | string}
            onOperatorChange={(operator) => handleFilterChange(index, { operator })}
            onValueChange={(value) => handleFilterChange(index, { value })}
            onValue2Change={(value2) => handleFilterChange(index, { value2 })}
          />
        );
      default:
        return null;
    }
  };

  const usedFields = new Set(filters.map(f => f.field));
  const hasAvailableFilters = availableDefinitions.some(def => !usedFields.has(def.field_name));

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-[221px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-black">
            Filter {pageType.charAt(0).toUpperCase() + pageType.slice(1)}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter Rows */}
      <div className="max-h-[400px] overflow-y-auto">
        {filters.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-[12px]">
            No filters applied
          </div>
        ) : (
          <div>
            {filters.map((filter, index) => {
              const definition = getFilterDefinition(filter.field);
              if (!definition) return null;

              return (
                <div key={index} className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] font-medium text-gray-700">
                        {definition.label}
                      </label>
                      <button
                        onClick={() => handleRemoveFilter(index)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Remove filter"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-[12px]">
                      {renderFilterInput(filter, index)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Actions */}
      <div className="px-4 py-3 border-t border-gray-200 space-y-2">
        {hasAvailableFilters && (
          <button
            onClick={handleAddFilter}
            className="w-full text-left text-[12px] font-normal text-[#0066ff] hover:text-[#0052cc] hover:underline"
          >
            + Add Filter
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="flex-1 px-3 py-1.5 text-[12px] text-[#0066ff] hover:text-[#0052cc] font-medium border border-[#0066ff] rounded-lg hover:bg-blue-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-3 py-1.5 bg-[#0066ff] text-white rounded-lg text-[12px] font-medium hover:bg-[#0052cc] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

