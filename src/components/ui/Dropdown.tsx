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
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width?: number;
    maxHeight?: number;
  } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Max height for dropdown menu (px) - match common Tailwind max-h-[300px]
  const MENU_MAX_HEIGHT = 300;
  const VIEWPORT_PADDING = 8;

  // Detect if dropdown is in a scrollable container or table and calculate fixed position
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        if (!dropdownRef.current) return;

        const buttonRect = dropdownRef.current.getBoundingClientRect();
        
        // Check if dropdown is inside a table (td, th, tr, tbody, thead, tfoot, table)
        const isInTable = (() => {
          let element: HTMLElement | null = dropdownRef.current;
          while (element) {
            const tagName = element.tagName;
            if (
              tagName === "TD" || 
              tagName === "TH" || 
              tagName === "TR" || 
              tagName === "TBODY" || 
              tagName === "THEAD" || 
              tagName === "TFOOT" || 
              tagName === "TABLE"
            ) {
              return true;
            }
            // Also check for table-related classes
            if (element.classList.contains("table-container") || 
                element.classList.contains("table-cell")) {
              return true;
            }
            element = element.parentElement;
          }
          return false;
        })();

        const scrollableParent = (() => {
          let parent = dropdownRef.current?.parentElement;
          while (parent) {
            const style = window.getComputedStyle(parent);
            // Check for overflow properties that could clip content
            if (
              style.overflow === "auto" ||
              style.overflow === "scroll" ||
              style.overflow === "hidden" ||
              style.overflowY === "auto" ||
              style.overflowY === "scroll" ||
              style.overflowY === "hidden" ||
              style.overflowX === "auto" ||
              style.overflowX === "scroll" ||
              style.overflowX === "hidden"
            ) {
              return parent;
            }
            // Check for position that creates a stacking context
            if (style.position === "relative" || style.position === "absolute" || style.position === "fixed") {
              // If it's a positioned element with overflow, it could clip
              const overflow = style.overflow || style.overflowY || style.overflowX;
              if (overflow && overflow !== "visible") {
                return parent;
              }
            }
            parent = parent.parentElement;
          }
          return null;
        })();

        // Always use fixed positioning to ensure dropdown is not clipped
        // This ensures proper positioning relative to viewport, not parent containers
          // Use fixed positioning to escape overflow container
          // Estimate menu height based on options (36px per option + padding)
          const estimatedMenuHeight = Math.min(
            options.length * 36 + 8, // 36px per option + 8px padding
            MENU_MAX_HEIGHT
          );
          const actualMenuHeight = menuRef.current?.offsetHeight ?? estimatedMenuHeight;
          
          const spaceBelow = window.innerHeight - buttonRect.bottom - VIEWPORT_PADDING;
          const spaceAbove = buttonRect.top - VIEWPORT_PADDING;

          // Calculate exact height needed for all options
          const exactHeightNeeded = options.length * 36 + 16; // 36px per option + 16px padding

          let top: number;
          let maxHeight: number;
          let shouldOpenAbove = false;

          if (position === "top") {
            // Force open above
            shouldOpenAbove = true;
            top = buttonRect.top - actualMenuHeight - VIEWPORT_PADDING;
            maxHeight = Math.min(MENU_MAX_HEIGHT, spaceAbove);
          } else if (position === "bottom") {
            // Force open below
            top = buttonRect.bottom + VIEWPORT_PADDING;
            if (options.length <= 4) {
              maxHeight = Math.max(exactHeightNeeded, Math.min(MENU_MAX_HEIGHT, Math.max(spaceBelow, exactHeightNeeded)));
            } else {
              maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(spaceBelow, 200));
            }
          } else {
            // Auto: Choose direction based on available space
            // For small lists (<= 4), prefer showing all options without scrolling
            if (options.length <= 4) {
              // Add buffer to account for taskbar and other UI elements (50px buffer)
              const buffer = 50;
              const spaceNeeded = exactHeightNeeded + buffer;
              
              // Check if we have enough space below for all options (with buffer)
              if (spaceBelow >= spaceNeeded) {
                // Enough space below, open downward
                top = buttonRect.bottom + VIEWPORT_PADDING;
                maxHeight = Math.max(exactHeightNeeded, Math.min(MENU_MAX_HEIGHT, spaceBelow));
              } else if (spaceAbove >= exactHeightNeeded) {
                // Not enough space below (even with buffer), but enough above - open upward
                shouldOpenAbove = true;
                top = buttonRect.top - exactHeightNeeded - VIEWPORT_PADDING;
                maxHeight = Math.max(exactHeightNeeded, Math.min(MENU_MAX_HEIGHT, spaceAbove));
              } else {
                // Not enough space in either direction, use the one with more space
                if (spaceAbove > spaceBelow) {
                  shouldOpenAbove = true;
                  top = buttonRect.top - Math.min(exactHeightNeeded, spaceAbove) - VIEWPORT_PADDING;
                  maxHeight = Math.min(MENU_MAX_HEIGHT, spaceAbove);
                } else {
                  top = buttonRect.bottom + VIEWPORT_PADDING;
                  maxHeight = Math.min(MENU_MAX_HEIGHT, spaceBelow);
                }
              }
            } else {
              // For larger lists, use available space with preference for below
              if (spaceBelow >= 200 || spaceBelow > spaceAbove) {
                top = buttonRect.bottom + VIEWPORT_PADDING;
                maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(spaceBelow, 200));
              } else {
                shouldOpenAbove = true;
                top = buttonRect.top - actualMenuHeight - VIEWPORT_PADDING;
                maxHeight = Math.min(MENU_MAX_HEIGHT, spaceAbove);
              }
            }
          }

          // Clamp top so menu stays in viewport
          if (shouldOpenAbove) {
            // Opening upward - ensure bottom of menu doesn't go below viewport
            // The menu height is maxHeight, so ensure top + maxHeight <= window.innerHeight
            const minTop = VIEWPORT_PADDING;
            const maxTopForUpward = window.innerHeight - maxHeight - VIEWPORT_PADDING;
            top = Math.max(minTop, Math.min(top, maxTopForUpward));
          } else {
            // Opening downward - ensure we don't go below viewport
            const maxTop = window.innerHeight - maxHeight - VIEWPORT_PADDING;
            top = Math.max(VIEWPORT_PADDING, Math.min(top, maxTop));
          }

          const menuWidth = buttonRect.width;
          let left: number;
          if (align === "center") {
            left = buttonRect.left + buttonRect.width / 2;
          } else if (align === "right") {
            // Align menu right edge with button right edge
            left = buttonRect.right - menuWidth;
          } else {
            left = buttonRect.left;
          }
          // Clamp horizontal so menu stays in viewport
          left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING));

          setMenuPosition({ top, left, width: menuWidth, maxHeight });
      };

      // Calculate position after a short delay to ensure menu is rendered
      const timeoutId = setTimeout(updatePosition, 0);
      // Second pass once menu has layout (for correct height)
      const timeoutId2 = setTimeout(updatePosition, 50);
      // Third pass after menu is fully rendered and measured
      const timeoutId3 = setTimeout(updatePosition, 100);
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    } else {
      setMenuPosition(null);
    }
  }, [isOpen, align, position, options.length]);

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
            (buttonClassName?.includes("edit-button")
              ? "w-full"
              : "w-full edit-button"),
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
          position: "fixed" as const,
          top: `${menuPosition.top}px`,
          left: align === "center" ? `${menuPosition.left}px` : `${menuPosition.left}px`,
          transform: align === "center" ? "translateX(-50%)" : "none",
          width: menuPosition.width ? `${menuPosition.width}px` : undefined,
          minWidth: menuPosition.width ? `${menuPosition.width}px` : undefined,
          ...(menuPosition.maxHeight != null
            ? { maxHeight: `${menuPosition.maxHeight}px` }
            : {}),
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
          <div className="p-2 border-b border-gray-200 flex-shrink-0">
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
              ? { 
                  minHeight: `${filteredOptions.length * 36}px`
                }
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
