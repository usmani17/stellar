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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width?: number } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Detect if dropdown is in a scrollable container and calculate fixed position
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        if (!dropdownRef.current) return;
        
        const buttonRect = dropdownRef.current.getBoundingClientRect();
        const scrollableParent = (() => {
          let parent = dropdownRef.current?.parentElement;
          while (parent) {
            const style = window.getComputedStyle(parent);
            if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                style.overflowX === 'auto' || style.overflowX === 'scroll') {
              return parent;
            }
            parent = parent.parentElement;
          }
          return null;
        })();

        if (scrollableParent) {
          // Use fixed positioning to escape overflow container
          const menuHeight = menuRef.current?.offsetHeight || 200;
          const top = position === 'top' 
            ? buttonRect.top - menuHeight - 8
            : buttonRect.bottom + 8;
          const left = align === 'center'
            ? buttonRect.left + buttonRect.width / 2
            : align === 'right'
            ? buttonRect.right
            : buttonRect.left;
          
          setMenuPosition({ top, left, width: buttonRect.width });
        } else {
          setMenuPosition(null);
        }
      };

      // Calculate position after a short delay to ensure menu is rendered
      const timeoutId = setTimeout(updatePosition, 0);
      // Also update on window resize/scroll
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setMenuPosition(null);
    }
  }, [isOpen, align, position]);

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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
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
          // Only apply default styles if edit-button is not in buttonClassName
          !buttonClassName?.includes("edit-button") &&
            (buttonClassName?.includes("inline-edit-dropdown")
              ? "w-full"
              : "w-full inline-edit-dropdown"),
          disabled && "opacity-50 cursor-not-allowed",
          buttonClassName
        )}
      >
        <span className="truncate flex-1 min-w-0 text-left">
          {option ? option.label : placeholder}
        </span>
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

    const useFixedPosition = menuPosition !== null;
    const optionCount = filteredOptions.length;
    const minMenuHeight =
      useFixedPosition && optionCount > 0 && optionCount <= 8
        ? optionCount * 36
        : undefined;
    const positionStyle = useFixedPosition
      ? {
          position: 'fixed' as const,
          top: `${menuPosition.top}px`,
          left: align === 'center' ? `${menuPosition.left}px` : `${menuPosition.left}px`,
          transform: align === 'center' ? 'translateX(-50%)' : 'none',
          width: menuPosition.width ? `${menuPosition.width}px` : undefined,
          minWidth: menuPosition.width ? `${menuPosition.width}px` : undefined,
          ...(minMenuHeight != null ? { minHeight: `${minMenuHeight}px` } : {}),
        }
      : {};

    const menuContent = (
      <div
        ref={menuRef}
        className={cn(
          useFixedPosition ? "fixed" : "absolute",
          "z-[999999] bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col",
          !useFixedPosition && alignClasses[align],
          !useFixedPosition && positionClasses[position],
          width,
          maxHeight,
          menuClassName
        )}
        style={positionStyle}
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

        {/* Options List - minHeight so all options are visible when menu uses fixed positioning (e.g. in table cells) */}
        <div
          className="overflow-y-auto flex-1"
          style={{
            ...(filteredOptions.length > 0 && filteredOptions.length <= 8
              ? { minHeight: `${filteredOptions.length * 36}px` }
              : {}),
          }}
        >
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

    if (useFixedPosition && typeof document !== "undefined" && document.body) {
      return createPortal(menuContent, document.body);
    }
    return menuContent;
  };

  return (
    <div ref={dropdownRef} className={cn("relative", width === "w-full" ? "w-full" : "", className)}>
      {renderButton
        ? renderButton(selectedOption, isOpen, toggleDropdown)
        : defaultRenderButton(selectedOption, isOpen)}
      {renderMenu()}
    </div>
  );
};
