import React, { useState } from 'react';

export type RadioSize = 'small' | 'large';
export type RadioState = 'default' | 'hover' | 'press' | 'focus';

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

const sizeClasses: Record<RadioSize, {
  container: string;
  radio: string;
  focusRing: string;
}> = {
  small: {
    container: 'size-[24px]',
    radio: 'size-[14px]',
    focusRing: 'size-[14px]',
  },
  large: {
    container: 'w-[32px] h-[24px]',
    radio: 'size-[20px]',
    focusRing: 'size-[14px]',
  },
};

export const Radio: React.FC<RadioProps> = ({
  checked = false,
  disabled = false,
  invalid = false,
  size = 'small',
  label,
  required = false,
  onChange,
  state: controlledState,
  className = '',
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const [internalPress, setInternalPress] = useState(false);
  const [internalFocus, setInternalFocus] = useState(false);

  // Determine current state
  const currentState = controlledState || 
    (internalFocus ? 'focus' : 
     internalPress ? 'press' : 
     internalHover ? 'hover' : 'default');

  const sizeConfig = sizeClasses[size];

  // Determine background and border colors based on state
  let bgColor: string;
  let borderColor: string;
  let textColor: string;
  let showFocusRing = false;

  if (disabled) {
    if (checked) {
      // Disabled checked - lighter teal
      bgColor = '#89B6B6';
      borderColor = '#89B6B6';
    } else {
      bgColor = '#FFFFFF';
      borderColor = '#F0F0ED';
    }
    textColor = '#CFCDC6'; // Disabled text
  } else if (checked) {
    if (invalid) {
      // Invalid checked - red border
      bgColor = '#072929';
      borderColor = '#FF5630'; // Red border for invalid
    } else {
      bgColor = '#072929';
      borderColor = currentState === 'hover' ? '#FF5630' : '#072929';
    }
    textColor = '#072929';
    showFocusRing = currentState === 'focus';
  } else {
    // Unchecked states
    switch (currentState) {
      case 'hover':
        bgColor = '#F0F0ED';
        borderColor = '#E4E4D7';
        break;
      case 'press':
        bgColor = '#F9F9F6';
        borderColor = '#73726C';
        break;
      case 'focus':
        bgColor = '#F9F9F6';
        borderColor = '#F0F0ED';
        showFocusRing = true;
        break;
      default:
        bgColor = '#FFFFFF';
        borderColor = '#E4E4D7';
    }
    textColor = '#072929';
  }

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
        ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed'}
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
            `}
            style={{
              backgroundColor: bgColor,
              border: invalid || currentState === 'hover' ? `2px solid ${borderColor}` : 'none',
            }}
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
            `}
            style={{
              backgroundColor: '#F9F9F6',
            }}
          />
          {showFocusRing && (
            <div
              className={`
                absolute
                border-2
                border-[#0e4e4e]
                border-solid
                rounded-[20px]
                ${size === 'small' ? 'left-[5px] top-[5px]' : 'left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]'}
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
            `}
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
            }}
          />
          {showFocusRing && (
            <div
              className={`
                absolute
                border-2
                border-[#0e4e4e]
                border-solid
                rounded-[20px]
                ${size === 'small' ? 'bottom-[5px] left-1/2 top-[5px] translate-x-[-50%]' : 'bottom-[5px] left-1/2 top-[5px] translate-x-[-50%]'}
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
          ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed'}
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
            `}
            style={{
              fontFamily: 'GT America Trial, sans-serif',
              color: textColor,
            }}
          >
            {label}
          </div>
          {required && (
            <span
              className="text-[#ae2a19] text-[12px] leading-[16px] font-semibold ml-1"
              style={{ fontFamily: 'SF Pro, sans-serif' }}
            >
              *
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {radioElement}
    </div>
  );
};

