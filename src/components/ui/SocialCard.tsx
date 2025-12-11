import React from 'react';

export type SocialCardState = 'default' | 'hover' | 'press';

interface SocialCardProps {
  /** Title of the card */
  title: string;
  /** Description text */
  description: string;
  /** Icon component or image */
  icon?: React.ReactNode;
  /** Button text */
  buttonText?: string;
  /** State of the card */
  state?: SocialCardState;
  /** Callback when button is clicked */
  onButtonClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const stateStyles: Record<SocialCardState, {
  bg: string;
  border: string;
}> = {
  default: {
    bg: 'bg-white',
    border: 'border-sandstorm-s40', // #E8E8E3
  },
  hover: {
    bg: 'bg-blue-b0', // #E3EEFF
    border: 'border-blue-b20', // #0350C3
  },
  press: {
    bg: 'bg-blue-b10', // #3370FF
    border: 'border-blue-b20',
  },
};

export const SocialCard: React.FC<SocialCardProps> = ({
  title,
  description,
  icon,
  buttonText = 'Connect',
  state = 'default',
  onButtonClick,
  className = '',
}) => {
  const styles = stateStyles[state];

  return (
    <div
      className={`
        flex
        gap-2
        items-center
        relative
        shrink-0
        w-full
        p-4
        rounded-lg
        border
        border-solid
        ${styles.bg}
        ${styles.border}
        ${className}
      `}
    >
      {/* Icon Container */}
      <div className="flex items-center justify-center overflow-hidden p-[6px] rounded-[4px] shrink-0 size-[44px]">
        <div className="overflow-hidden relative shrink-0 size-[36px]">
          {icon || (
            <div className="w-full h-full bg-neutral-n200 rounded flex items-center justify-center">
              <span className="text-xs text-neutral-n400">Icon</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-[1_0_0] flex-col gap-1 items-start min-h-0 min-w-0 not-italic relative shrink-0">
        <p
          className="font-bold leading-[28px] relative shrink-0 text-forest-f60 text-base w-full"
          style={{ fontFamily: 'GT America Trial, sans-serif' }}
        >
          {title}
        </p>
        <p
          className="font-medium leading-[18px] relative shrink-0 text-neutral-n300 text-xs w-full"
          style={{ fontFamily: 'GT America Trial, sans-serif' }}
        >
          {description}
        </p>
      </div>

      {/* Button */}
      <button
        onClick={onButtonClick}
        className="bg-forest-f60 flex gap-1 h-9 items-center justify-center min-w-[80px] px-2 py-0 relative rounded-lg shrink-0 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center justify-center relative shrink-0">
          <div
            className="flex flex-col justify-center leading-[0] not-italic relative shrink-0 text-sm text-center text-white whitespace-nowrap"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            <p className="leading-[20px]">{buttonText}</p>
          </div>
        </div>
      </button>
    </div>
  );
};

