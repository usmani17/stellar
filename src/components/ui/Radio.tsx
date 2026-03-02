import React, { useState } from "react";

export type RadioSize = "small" | "large";
export type RadioState = "default" | "hover" | "press" | "focus";

interface RadioProps {
  /** Whether the radio is checked */
  checked?: boolean;
  /** Whether the radio is disabled */
  disabled?: boolean;
  /** Whether the radio is invalid (error state) */
  invalid?: boolean;
  /** Size of the radio */
  size?: RadioSize;
  /** Label text (optional) */
  label?: string;
  /** Whether the field is required (shows asterisk) */
  required?: boolean;
  /** Callback when radio state changes */
  onChange?: (checked: boolean) => void;
  /** Controlled state (if not provided, uses internal state) */
  state?: RadioState;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<
  RadioSize,
  {
    container: string;
    radio: string;
    focusRing: string;
  }
> = {
  small: {
    container: "size-[24px]",
    radio: "size-[14px]",
    focusRing: "size-[14px]",
  },
  large: {
    container: "w-[32px] h-[24px]",
    radio: "size-[20px]",
    focusRing: "size-[14px]",
  },
};

export const Radio: React.FC<RadioProps> = ({
  checked = false,
  disabled = false,
  invalid = false,
  size = "small",
  label,
  required = false,
  onChange,
  state: controlledState,
  className = "",
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const [internalPress, setInternalPress] = useState(false);
  const [internalFocus, setInternalFocus] = useState(false);

  // Determine current state
  const currentState =
    controlledState ||
    (internalFocus
      ? "focus"
      : internalPress
      ? "press"
      : internalHover
      ? "hover"
      : "default");

  const sizeConfig = sizeClasses[size];

  // Determine background and border color classes based on state
  const getBgColorClass = (): string => {
    if (disabled) {
      if (checked) {
        return "bg-[#89B6B6]"; // Disabled checked - lighter teal
      }
      return "bg-white";
    } else if (checked) {
      return "bg-forest-f60";
    } else {
      switch (currentState) {
        case "hover":
          return "bg-sandstorm-s30";
        case "press":
        case "focus":
          return "bg-sandstorm-s0";
        default:
          return "bg-white";
      }
    }
  };

  const getBorderColorClass = (): string => {
    if (disabled) {
      if (checked) {
        return "border-[#89B6B6]";
      }
      return "border-sandstorm-s30";
    } else if (checked) {
      if (invalid || currentState === "hover") {
        return "border-[#FF5630]"; // Red border for invalid/hover
      }
      return "border-forest-f60";
    } else {
      switch (currentState) {
        case "hover":
          return "border-sandstorm-s50";
        case "press":
          return "border-sandstorm-s70";
        case "focus":
          return "border-sandstorm-s30";
        default:
          return "border-sandstorm-s50";
      }
    }
  };

  const getTextColorClass = (): string => {
    if (disabled) {
      return "text-[#CFCDC6]"; // Disabled text
    }
    return "text-forest-f60";
  };

  const showFocusRing =
    (!disabled && checked && currentState === "focus") ||
    (!disabled && !checked && currentState === "focus");

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleMouseEnter = () => {
    if (!disabled && !controlledState) {
      setInternalHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (!controlledState) {
      setInternalHover(false);
      setInternalPress(false);
    }
  };

  const handleMouseDown = () => {
    if (!disabled && !controlledState) {
      setInternalPress(true);
    }
  };

  const handleMouseUp = () => {
    if (!controlledState) {
      setInternalPress(false);
    }
  };

  const handleFocus = () => {
    if (!disabled && !controlledState) {
      setInternalFocus(true);
    }
  };

  const handleBlur = () => {
    if (!controlledState) {
      setInternalFocus(false);
    }
  };

  const radioElement = (
    <div
      className={`
        flex
        gap-[4px]
        items-center
        justify-center
        relative
        shrink-0
        ${sizeConfig.container}
        ${!disabled ? "cursor-pointer" : "cursor-not-allowed"}
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      {checked ? (
        // Checked state - outer circle with inner dot
        <div className={`relative shrink-0 ${sizeConfig.radio}`}>
          {/* Outer circle */}
          <div
            className={`
              rounded-[50%]
              absolute
              inset-0
              w-full
              h-full
              ${getBgColorClass()}
              ${
                invalid || currentState === "hover"
                  ? `border-2 ${getBorderColorClass()}`
                  : "border-none"
              }
            `}
          />
          {/* Inner dot - centered (28.57% size, 35.71% inset on all sides) */}
          <div
            className={`
              rounded-[50%]
              absolute
              top-[35.71%]
              right-[35.71%]
              bottom-[35.71%]
              left-[35.71%]
              bg-sandstorm-s0
            `}
          />
          {showFocusRing && (
            <div
              className={`
              absolute
              border-2
              border-forest-f50
              border-solid
              rounded-[20px]
              left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]
              ${sizeConfig.focusRing}
            `}
            />
          )}
        </div>
      ) : (
        // Unchecked state
        <div className="relative">
          <div
            className={`
              rounded-[20px]
              shrink-0
              ${sizeConfig.radio}
              border-2
              border-solid
              ${getBgColorClass()}
              ${getBorderColorClass()}
            `}
          />
          {showFocusRing && (
            <div
              className={`
                absolute
                border-2
                border-forest-f50
                border-solid
                rounded-[20px]
                left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]
                ${sizeConfig.focusRing}
              `}
            />
          )}
        </div>
      )}
    </div>
  );

  if (label) {
    return (
      <div
        className={`
          flex
          flex-row
          gap-[4px]
          items-center
          justify-start
          h-6
          relative
          ${!disabled ? "cursor-pointer" : "cursor-not-allowed"}
          ${className}
        `}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {radioElement}
        <div
          className={`
            flex
            flex-row
            gap-0
            items-center
            justify-start
            self-stretch
            shrink-0
            relative
          `}
        >
          <div
            className={`
              text-left
              text-sm
              leading-5
              font-normal
              relative
              self-stretch
              flex
              items-center
              justify-start
              font-gtAmerica ${getTextColorClass()}
            `}
          >
            {label}
          </div>
          {required && (
            <span
              className="text-[#ae2a19] text-[12px] leading-[16px] font-semibold ml-1 font-sans"
            >
              *
            </span>
          )}
        </div>
      </div>
    );
  }

  return <div className={className}>{radioElement}</div>;
};
