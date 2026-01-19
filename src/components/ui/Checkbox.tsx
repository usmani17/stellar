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
        return "bg-forest-f40 border-forest-f40 opacity-50";
      }
      return "";
    }

    if (checked || indeterminate) {
      return "bg-forest-f40 border-forest-f40";
    }

    return "";
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
          "checkbox-button",
          sizeClasses[size],
          getStateClasses(),
          !disabled &&
            (checked || indeterminate) &&
            "hover:bg-[#169aa3] hover:border-[#169aa3]"
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
          onClick={(e) => {
            // Prevent htmlFor from triggering button click when we have our own handler
            e.preventDefault();
            if (!disabled && handleClick) {
              handleClick();
            }
          }}
        >
          {label}
        </label>
      )}
    </div>
  );
};
