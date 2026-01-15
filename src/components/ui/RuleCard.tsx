import React from 'react';
import { Radio } from './Radio';

export type RuleCardType = 'default' | 'hover' | 'selected';

interface RuleCardProps {
  /** Title of the card */
  title: string;
  /** Description text */
  description: string;
  /** Icon component or image */
  icon?: React.ReactNode;
  /** Type/state of the card */
  type?: RuleCardType;
  /** Whether the card is selected */
  selected?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const typeStyles: Record<RuleCardType, {
  bg: string;
  border: string;
}> = {
  default: {
    bg: 'bg-white',
    border: 'border-neutral-n40', // #DFE1E6
  },
  hover: {
    bg: 'bg-white',
    border: 'border-sandstorm-s50', // #E4E4D7
  },
  selected: {
    bg: 'bg-blue-b0', // #E3EEFF
    border: 'border-blue-b20', // #0350C3
  },
};

export const RuleCard: React.FC<RuleCardProps> = ({
  title,
  description,
  icon,
  type = 'default',
  selected = false,
  onClick,
  className = '',
}) => {
  const styles = typeStyles[type];

  return (
    <div
      onClick={onClick}
      className={`
        flex
        items-center
        gap-3
        p-4
        rounded-lg
        border
        border-solid
        ${styles.bg}
        ${styles.border}
        ${onClick ? 'cursor-pointer hover:opacity-90' : ''}
        transition-colors
        ${className}
      `}
    >
      {/* Icon Container */}
      <div className="flex items-center justify-center overflow-hidden p-[6px] rounded-[4px] shrink-0 size-[32px]">
        <div className="relative shrink-0 size-[24px]">
          {icon || (
            <div className="w-full h-full bg-neutral-n200 rounded flex items-center justify-center">
              <span className="text-xs text-neutral-n400">Icon</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-[1_0_0] gap-3 items-center min-h-0 min-w-0 relative shrink-0">
        <div className="flex flex-[1_0_0] flex-col gap-1 items-start justify-center leading-[0] min-h-0 min-w-0 not-italic relative shrink-0">
          <div
            className="flex flex-col justify-center relative shrink-0 text-forest-f60 text-sm w-full font-gtAmerica font-medium"
          >
            <p className="leading-[20px]">{title}</p>
          </div>
          <div
            className="flex flex-col justify-center relative shrink-0 text-neutral-n300 text-xs w-full font-gtAmerica font-normal"
          >
            <p className="leading-[18px]">{description}</p>
          </div>
        </div>
      </div>

      {/* Radio Button */}
      <div className="flex h-[60px] items-start justify-center relative shrink-0 w-6">
        <div className="flex gap-1 items-center relative shrink-0">
          <Radio
            size="large"
            checked={selected}
            onChange={() => onClick?.()}
          />
        </div>
      </div>
    </div>
  );
};






