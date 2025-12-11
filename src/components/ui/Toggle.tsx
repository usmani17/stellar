import React, { useState } from 'react';

export type ToggleSize = 'regular' | 'large';
export type ToggleState = 'default' | 'hover' | 'focus' | 'indeterminate';

interface ToggleProps {
  /** Whether the toggle is checked */
  checked?: boolean;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Whether the toggle is in indeterminate state */
  indeterminate?: boolean;
  /** Size of the toggle */
  size?: ToggleSize;
  /** Callback when toggle state changes */
  onChange?: (checked: boolean) => void;
  /** Controlled state (if not provided, uses internal state) */
  state?: ToggleState;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<ToggleSize, {
  width: string;
  height: string;
  dotSize: string;
  dotCheckedLeft: string;
  dotUncheckedLeft: string;
  dotUncheckedTop: string;
  dotCheckedTop: string;
  dotDisabledInset?: string;
}> = {
  regular: {
    width: 'w-[32px]',
    height: 'h-[16px]',
    dotSize: 'size-[12px]',
    dotCheckedLeft: 'left-[18px]',
    dotUncheckedLeft: 'left-px',
    dotUncheckedTop: 'top-px',
    dotCheckedTop: 'top-[2px]',
    dotDisabledInset: 'inset-[12.5%_6.25%_12.5%_56.25%]', // checked disabled
  },
  large: {
    width: 'w-[40px]',
    height: 'h-[20px]',
    dotSize: 'size-[16px]',
    dotCheckedLeft: 'left-[22px]',
    dotUncheckedLeft: 'left-[2px]',
    dotUncheckedTop: 'top-[2px]',
    dotCheckedTop: 'top-[2px]',
  },
};

export const Toggle: React.FC<ToggleProps> = ({
  checked = false,
  disabled = false,
  indeterminate = false,
  size = 'regular',
  onChange,
  state: controlledState,
  className = '',
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const [internalFocus, setInternalFocus] = useState(false);

  const currentState = controlledState || 
    (internalFocus ? 'focus' : 
     internalHover ? 'hover' : 'default');

  const sizeConfig = sizeStyles[size];
  const isChecked = checked && !indeterminate;
  const isIndeterminate = indeterminate;

  // Determine background, border, and dot colors based on state
  let trackBg: string | undefined;
  let trackBorder: string | undefined;
  let dotBg: string;
  let showFocusRing = false;

  if (disabled) {
    if (isChecked || isIndeterminate) {
      trackBg = '#89B6B6'; // Disabled checked - lighter teal
      dotBg = '#FFFFFF';
    } else {
      trackBg = '#E8E8E3'; // Disabled unchecked - sandstorm-s40
      dotBg = '#FFFFFF';
    }
    trackBorder = undefined;
  } else if (isIndeterminate) {
    trackBg = '#313B50'; // neutral-n500 - indeterminate
    dotBg = '#FFFFFF';
    trackBorder = undefined;
  } else if (isChecked) {
    // Checked states
    if (currentState === 'hover' || currentState === 'focus') {
      trackBg = '#0E4E4E'; // forest-f50 - hover/focus checked
    } else {
      trackBg = '#072929'; // forest-f60 - default checked
    }
    dotBg = '#FFFFFF';
    showFocusRing = currentState === 'focus';
    trackBorder = undefined;
  } else {
    // Unchecked states
    if (currentState === 'hover' || currentState === 'focus') {
      trackBg = '#73726C'; // sandstorm-s70 - hover/focus unchecked (filled)
      trackBorder = undefined;
    } else {
      // Default unchecked - has border, no background fill
      trackBg = undefined;
      trackBorder = '#73726C'; // sandstorm-s70 - border only
    }
    dotBg = '#FFFFFF';
    showFocusRing = currentState === 'focus';
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

  // Determine dot position
  let dotPosition: string;
  if (disabled && isChecked) {
    // Disabled checked uses inset positioning
    dotPosition = sizeConfig.dotDisabledInset || `${sizeConfig.dotCheckedLeft} ${sizeConfig.dotCheckedTop}`;
  } else if (disabled && !isChecked) {
    // Disabled unchecked uses inset positioning
    dotPosition = size === 'regular' 
      ? 'inset-[12.5%_56.25%_12.5%_6.25%]' 
      : `${sizeConfig.dotUncheckedLeft} ${sizeConfig.dotUncheckedTop}`;
  } else if (isIndeterminate) {
    dotPosition = 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
  } else if (isChecked) {
    dotPosition = `${sizeConfig.dotCheckedLeft} ${sizeConfig.dotCheckedTop}`;
  } else {
    dotPosition = `${sizeConfig.dotUncheckedLeft} ${sizeConfig.dotUncheckedTop}`;
  }

  return (
    <div
      className={`
        relative
        ${sizeConfig.width}
        ${sizeConfig.height}
        rounded-[999px]
        ${trackBorder ? 'border border-solid' : ''}
        ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed'}
        transition-colors
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="switch"
      aria-checked={isIndeterminate ? 'mixed' : checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={{
        backgroundColor: trackBg,
        borderColor: trackBorder,
      }}
    >
      {/* Dot/Handle */}
      <div
        className={`
          absolute
          ${sizeConfig.dotSize}
          ${dotPosition}
          rounded-full
          transition-all
          duration-200
        `}
        style={{
          backgroundColor: dotBg,
        }}
      >
        {/* Indeterminate indicator (dash) */}
        {isIndeterminate && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[6px] h-[1.5px] rounded-full"
            style={{
              backgroundColor: '#072929',
            }}
          />
        )}
      </div>

      {/* Focus Ring */}
      {showFocusRing && (
        <div
          className={`
            absolute
            border-2
            border-[#072929]
            border-solid
            inset-[-2px]
            rounded-[100px]
            pointer-events-none
          `}
        />
      )}
    </div>
  );
};
