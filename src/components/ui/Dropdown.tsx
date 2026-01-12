import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  onClose?: () => void;
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
  onSearchChange?: (query: string) => void; // Callback for external search
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
  onClose,
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
  onSearchChange,
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width?: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Open dropdown if defaultOpen is true
  useEffect(() => {
    if (defaultOpen && !disabled) {
      setIsOpen(true);
    }
  }, [defaultOpen, disabled]);

  // Filter options based on search query
  // If onSearchChange is provided, still filter locally for immediate UI feedback
  // while the parent handles external search and updates options prop
  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Calculate menu position for portal rendering when defaultOpen is true
  useEffect(() => {
    if (isOpen && defaultOpen && dropdownRef.current) {
      const triggerRect = dropdownRef.current.getBoundingClientRect();
      // Use the trigger width for the menu width when width is "w-full"
      const menuWidth = width === "w-full" ? triggerRect.width : 200;
      const menuHeight = Math.min(filteredOptions.length * 40 + (searchable ? 50 : 0), 400);
      
      let top = triggerRect.bottom + 8; // mt-2 = 8px
      let left = triggerRect.left;
      
      if (position === "top") {
        top = triggerRect.top - menuHeight - 8; // mb-2 = 8px
      }
      
      if (align === "right") {
        left = triggerRect.right - menuWidth;
      } else if (align === "center") {
        left = triggerRect.left + (triggerRect.width / 2) - (menuWidth / 2);
      }
      
      // Ensure menu stays within viewport
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (left < 8) {
        left = 8;
      }
      if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight - 8;
      }
      if (top < 8) {
        top = 8;
      }
      
      setMenuPosition({ top, left, width: menuWidth });
    } else {
      setMenuPosition(null);
    }
  }, [isOpen, defaultOpen, filteredOptions.length, searchable, align, position, width]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        (!defaultOpen || (menuRef.current && !menuRef.current.contains(event.target as Node)))
      ) {
        setIsOpen(false);
        setSearchQuery("");
        onClose?.();
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
  }, [isOpen, searchable, onClose, defaultOpen]);

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
      } else if (isOpen) {
        // When closing via toggle, call onClose
        onClose?.();
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
        <span className="truncate flex-1 min-w-0 text-left">{option ? option.label : placeholder}</span>
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

  const renderMenu = () => {
    if (!isOpen) return null;
    
    return (
      <div
        ref={menuRef}
        className={cn(
          "z-[100000] bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg overflow-hidden",
          !defaultOpen && width, // Only apply width class when not using portal
          maxHeight,
          !defaultOpen && "absolute",
          !defaultOpen && alignClasses[align],
          !defaultOpen && positionClasses[position],
          menuClassName
        )}
        style={
          defaultOpen && menuPosition
            ? {
                zIndex: 100000,
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: menuPosition.width ? `${menuPosition.width}px` : undefined,
              }
            : { zIndex: 100000 }
        }
      >
        {/* Search Input */}
        {searchable && (
          <div className="p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                // Call external search callback if provided
                if (onSearchChange) {
                  onSearchChange(query);
                }
              }}
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
                    "w-full text-left px-3 py-2 text-[10px] text-text-primary bg-[#FEFEFB] hover:bg-gray-50 transition-colors",
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
    );
  };

  return (
    <>
      <div ref={dropdownRef} className={cn("relative", className)}>
        {renderButton
          ? renderButton(selectedOption, isOpen, toggleDropdown)
          : defaultRenderButton(selectedOption, isOpen)}
        {!defaultOpen && renderMenu()}
      </div>
      {defaultOpen && menuPosition && isOpen && createPortal(renderMenu(), document.body)}
    </>
  );
};
