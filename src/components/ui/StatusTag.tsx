import React from 'react';

export type StatusTagAppearance = 'default' | 'info' | 'success' | 'threat' | 'warning' | 'close' | 'wastedSpends';
export type StatusTagSize = 'small' | 'large';

interface StatusTagProps {
  /** The text content to display */
  children: React.ReactNode;
  /** Appearance/variant of the tag */
  appearance?: StatusTagAppearance;
  /** Size of the tag */
  size?: StatusTagSize;
  /** Show icon before text */
  iconBefore?: boolean;
  /** Show icon after text */
  iconAfter?: boolean;
  /** Custom icon component to display before text */
  iconBeforeComponent?: React.ReactNode;
  /** Custom icon component to display after text */
  iconAfterComponent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const appearanceStyles: Record<StatusTagAppearance, {
  bg: string;
  text: string;
}> = {
  default: {
    bg: '#e4e4d7', // sandstorm-s50
    text: '#072929', // forest-f60
  },
  info: {
    bg: '#072929', // forest-f60
    text: '#f9f9f6', // sandstorm-s0
  },
  success: {
    bg: '#136d6d', // forest-f40
    text: '#f9f9f6', // sandstorm-s0
  },
  threat: {
    bg: '#b51111', // red-r40
    text: '#f9f9f6', // sandstorm-s0
  },
  warning: {
    bg: '#e68f0d', // orange variant
    text: '#f9f9f6', // sandstorm-s0
  },
  wastedSpends: {
    bg: '#b55811', // brown/rust variant
    text: '#f9f9f6', // sandstorm-s0
  },
  close: {
    bg: '#e4e4d7', // sandstorm-s50
    text: '#072929', // forest-f60
  },
};

const sizeStyles: Record<StatusTagSize, {
  height: string;
  textSize: string;
  lineHeight: string;
}> = {
  small: {
    height: 'h-[18px]',
    textSize: 'text-[10px]',
    lineHeight: 'leading-[14px]',
  },
  large: {
    height: 'h-[22px]',
    textSize: 'text-[12px]',
    lineHeight: 'leading-[14px]',
  },
};

// Default icon component (copy icon)
const DefaultIcon: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="overflow-clip relative shrink-0 size-[12px]">
      <div className="absolute inset-[4.17%_10.42%]">
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M13.3333 6.66667H9.33333C8.59695 6.66667 8 7.26362 8 8V12C8 12.7364 8.59695 13.3333 9.33333 13.3333H13.3333C14.0697 13.3333 14.6667 12.7364 14.6667 12V8C14.6667 7.26362 14.0697 6.66667 13.3333 6.66667Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 9.33333H2.66667C1.93029 9.33333 1.33333 8.73638 1.33333 8V4C1.33333 3.26362 1.93029 2.66667 2.66667 2.66667H6.66667C7.40305 2.66667 8 3.26362 8 4V5.33333"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

// Close icon component
const CloseIcon: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="overflow-clip relative shrink-0 size-[12px]">
      <div className="absolute inset-[20.83%]">
        <svg
          width="8"
          height="8"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M9 3L3 9M3 3L9 9"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export const StatusTag: React.FC<StatusTagProps> = ({
  children,
  appearance = 'default',
  size = 'small',
  iconBefore = false,
  iconAfter = false,
  iconBeforeComponent,
  iconAfterComponent,
  className = '',
}) => {
  const appearanceStyle = appearanceStyles[appearance];
  const sizeStyle = sizeStyles[size];
  const isClose = appearance === 'close';

  // Determine icon color based on appearance
  const iconColor = appearance === 'default' || appearance === 'close' 
    ? appearanceStyle.text 
    : appearanceStyle.text;

  return (
    <div
      className={`
        flex
        gap-[2px]
        items-center
        justify-center
        px-[8px]
        py-[4px]
        relative
        rounded-[999px]
        ${sizeStyle.height}
        ${className}
      `}
      style={{
        backgroundColor: appearanceStyle.bg,
      }}
    >
      {/* Icon Before */}
      {iconBefore && (
        <div className="flex items-center justify-center overflow-clip p-[6px] relative rounded-bl-[4px] rounded-br-[4px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 size-[16px]">
          {iconBeforeComponent || <DefaultIcon color={iconColor} />}
        </div>
      )}

      {/* Text Content */}
      <div
        className={`
          flex
          flex-col
          justify-center
          relative
          shrink-0
          text-center
          uppercase
          whitespace-nowrap
          ${sizeStyle.textSize}
          ${sizeStyle.lineHeight}
        `}
        style={{
          color: appearanceStyle.text,
        }}
      >
        {children}
      </div>

      {/* Icon After or Close Icon */}
      {(iconAfter || isClose) && (
        <div className="flex items-center justify-center overflow-clip p-[6px] relative rounded-bl-[4px] rounded-br-[4px] rounded-tl-[4px] rounded-tr-[4px] shrink-0 size-[16px]">
          {isClose ? (
            <CloseIcon color={iconColor} />
          ) : (
            iconAfterComponent || <DefaultIcon color={iconColor} />
          )}
        </div>
      )}
    </div>
  );
};


