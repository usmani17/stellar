import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/cn";

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  [key: string]: any; // Allow additional properties for custom rendering
}

export interface DropdownProps<T = string> {
  options: DropdownOption<T>[];
  value?: T;
  placeholder?: string;
  onChange?: (value: T, option: DropdownOption<T>) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  renderButton?: (
    option: DropdownOption<T> | null,
    isOpen: boolean,
    toggle: () => void
  ) => React.ReactNode;
  renderOption?: (
    option: DropdownOption<T>,
    isSelected: boolean
  ) => React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  align?: "left" | "right" | "center";
  position?: "bottom" | "top";
  maxHeight?: string;
  width?: string;
  showCheckmark?: boolean;
  closeOnSelect?: boolean;
  defaultOpen?: boolean;
}

export const Dropdown = <T extends string | number = string>({
  options,
  value,
  placeholder = "Select an option",
  onChange,
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  optionClassName,
  renderButton,
  renderOption,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No options available",
  align = "left",
  position = "bottom",
  maxHeight = "max-h-96",
  width = "w-full",
  showCheckmark = true,
  closeOnSelect = true,
  defaultOpen = false,
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Open dropdown if defaultOpen is true
  useEffect(() => {
    if (defaultOpen && !disabled) {
      setIsOpen(true);
    }
  }, [defaultOpen, disabled]);

  // Filter options based on search query
  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      if (searchable && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, searchable]);

  const handleSelect = (option: DropdownOption<T>) => {
    if (option.disabled) return;
    onChange?.(option.value, option);
    if (closeOnSelect) {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery("");
      }
    }
  };

  // Default button renderer
  const defaultRenderButton = (
    option: DropdownOption<T> | null,
    isOpen: boolean
  ) => {
    return (
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-[10px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] bg-white transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:border-[#556179] cursor-pointer",
          buttonClassName
        )}
      >
        <span className="truncate">{option ? option.label : placeholder}</span>
        <svg
          className={cn(
            "w-4 h-4 text-[#072929] transition-transform",
            isOpen && "rotate-180"
          )}
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
    );
  };

  // Default option renderer
  const defaultRenderOption = (
    option: DropdownOption<T>,
    isSelected: boolean
  ) => {
    return (
      <div className="flex items-center justify-between w-full">
        <span>{option.label}</span>
        {isSelected && showCheckmark && (
          <svg
            className="w-4 h-4 text-[#136D6D]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  };

  const alignClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  };

  const positionClasses = {
    bottom: "top-full mt-2",
    top: "bottom-full mb-2",
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {renderButton
        ? renderButton(selectedOption, isOpen, toggleDropdown)
        : defaultRenderButton(selectedOption, isOpen)}

      {isOpen && (
        <div
          className={cn(
            "absolute z-[100000] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden",
            width,
            maxHeight,
            alignClasses[align],
            positionClasses[position],
            menuClassName
          )}
          style={{ zIndex: 100000 }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 text-[10px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto" style={{ maxHeight: "inherit" }}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-[#556179] text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[10px] text-text-primary bg-background-field hover:bg-gray-50 transition-colors",
                      isSelected && "bg-[#F0F0ED] text-[#072929] font-medium",
                      !isSelected && "text-[#313850]",
                      option.disabled && "opacity-50 cursor-not-allowed",
                      !option.disabled && "cursor-pointer",
                      optionClassName
                    )}
                  >
                    {renderOption
                      ? renderOption(option, isSelected)
                      : defaultRenderOption(option, isSelected)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
