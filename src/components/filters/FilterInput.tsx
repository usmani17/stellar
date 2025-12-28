import React from 'react';
import type { FilterDefinition } from '../../types/filters';

interface FilterInputProps {
  definition: FilterDefinition;
  value: string;
  onChange: (value: string) => void;
}

export const FilterInput: React.FC<FilterInputProps> = ({
  definition,
  value,
  onChange,
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${definition.label.toLowerCase()}`}
      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#FEFEFB]"
    />
  );
};

