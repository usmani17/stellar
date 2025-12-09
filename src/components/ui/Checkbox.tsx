import React from "react";
import { cn } from "../../lib/cn";

export type CheckboxSize = "small" | "large";

export type CheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  size?: CheckboxSize;
  label?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  indeterminate = false,
  disabled = false,
  size = "small",
  label,
  onChange,
  className,
  id,
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    large: "w-5 h-5",
  };

  const iconSizeClasses = {
    small: "w-2.5 h-2.5",
    large: "w-3 h-3",
  };

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const getStateClasses = () => {
    if (disabled) {
      if (checked || indeterminate) {
        return "bg-[#74AAFD] border-[#74AAFD]";
      }
      return "bg-white border-[#A3A8B3] opacity-50";
    }

    if (checked || indeterminate) {
      return "bg-[#0350C3] border-[#0350C3] hover:bg-[#3C88FC] hover:border-[#3C88FC]";
    }

    return "bg-white border-[#A3A8B3] hover:border-[#556179]";
  };

  const checkboxId =
    id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex items-center justify-center rounded-[12px] border transition-colors focus:outline-none focus:ring-2 focus:ring-[#0350C3] focus:ring-offset-1",
          sizeClasses[size],
          getStateClasses(),
          disabled && "cursor-not-allowed",
          !disabled && "cursor-pointer"
        )}
        id={checkboxId}
      >
        {/* Checkmark icon */}
        {(checked || indeterminate) && (
          <span className={cn("text-white", iconSizeClasses[size])}>
            {indeterminate ? (
              <svg
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M2 6H10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M2 6L5 9L10 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}
      </button>
      {label && (
        <label
          htmlFor={checkboxId}
          className={cn(
            "text-h400 font-body text-n-900 cursor-pointer select-none",
            disabled && "text-n-300 cursor-not-allowed"
          )}
          onClick={!disabled ? handleClick : undefined}
        >
          {label}
        </label>
      )}
    </div>
  );
};
