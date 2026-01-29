import React, { useRef, useEffect } from "react";
import { Button } from "../../../components/ui";

export interface BulkActionsDropdownOption {
  value: string;
  label: string;
}

interface BulkActionsDropdownProps {
  options: BulkActionsDropdownOption[];
  selectedCount: number;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export const BulkActionsDropdown: React.FC<BulkActionsDropdownProps> = ({
  options,
  selectedCount,
  onSelect,
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        className="edit-button"
        onClick={() => setShowDropdown((prev) => !prev)}
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
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
          />
        </svg>
        <span className="text-[10.64px] text-[#072929] font-normal">
          Bulk Actions
        </span>
      </Button>
      {showDropdown && (
        <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
          <div className="overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={disabled || selectedCount === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedCount === 0) return;
                  onSelect(opt.value);
                  setShowDropdown(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
