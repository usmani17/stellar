import React from 'react';
import type { FilterDefinition } from '../../types/filters';

interface FilterSelectProps {
  definition: FilterDefinition;
  value: string;
  onChange: (value: string) => void;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  definition,
  value,
  onChange,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#FEFEFB]"
    >
      <option value="">Select {definition.label}</option>
      {definition.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

