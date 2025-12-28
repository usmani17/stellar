import React from 'react';
import type { FilterDefinition, FilterOperator } from '../../types/filters';

interface FilterRangeProps {
  definition: FilterDefinition;
  operator: FilterOperator;
  value: number | string;
  value2?: number | string;
  onOperatorChange: (operator: FilterOperator) => void;
  onValueChange: (value: number | string) => void;
  onValue2Change?: (value2: number | string) => void;
}

export const FilterRange: React.FC<FilterRangeProps> = ({
  definition,
  operator,
  value,
  value2,
  onOperatorChange,
  onValueChange,
  onValue2Change,
}) => {
  const operators = definition.operators || ['>', '<', '>=', '<=', '=', 'between'];
  const defaultOperator = definition.default_operator || 'between';

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Operator Select */}
      <select
        value={operator}
        onChange={(e) => onOperatorChange(e.target.value as FilterOperator)}
        className="px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#FEFEFB] min-w-[80px]"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {op === '>' ? 'Greater than' : op === '<' ? 'Less than' : op === '>=' ? 'Greater or equal' : op === '<=' ? 'Less or equal' : op === '=' ? 'Equal to' : 'Between'}
          </option>
        ))}
      </select>

      {/* Value Input */}
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value ? parseFloat(e.target.value) : '')}
        placeholder="Value"
        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#FEFEFB]"
      />

      {/* Second Value Input (for 'between' operator) */}
      {operator === 'between' && onValue2Change && (
        <>
          <span className="text-[12px] text-gray-500">and</span>
          <input
            type="number"
            value={value2 || ''}
            onChange={(e) => onValue2Change(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder="Value"
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#FEFEFB]"
          />
        </>
      )}
    </div>
  );
};

