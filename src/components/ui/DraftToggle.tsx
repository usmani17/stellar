import React from "react";
import { cn } from "../../lib/cn";

interface DraftToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const DraftToggle: React.FC<DraftToggleProps> = ({
  checked,
  onChange,
  className,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex items-center h-6 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#072929] focus:ring-offset-2 overflow-hidden",
        checked ? "bg-forest-f40" : "bg-gray-200",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 pointer-events-none text-[10.64px] font-medium whitespace-nowrap transition-all duration-200",
          checked
            ? "left-2 right-auto text-white"
            : "left-auto right-2 text-[#556179]",
        )}
      >
        Draft
      </span>
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 left-0.5 w-5 h-5 rounded-full bg-white shadow ring-0 transition-transform duration-200",
          checked ? "translate-x-[54px]" : "translate-x-0",
        )}
      />
    </button>
  );
};
