import React from 'react';

export type AutopilotCardType = 'info' | 'warning' | 'success';
export type AutopilotCardState = 'default' | 'hover' | 'press';

interface AutopilotCardProps {
  /** Number to display */
  number: string | number;
  /** Description text */
  description: string;
  /** Type of the card */
  type?: AutopilotCardType;
  /** State of the card */
  state?: AutopilotCardState;
  /** Icon component (optional, will use default if not provided) */
  icon?: React.ReactNode;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Icon components
const InfoIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[28px]">
    <div className="absolute inset-[8.33%]">
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const WarningIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[28px]">
    <div className="absolute inset-[12.5%]">
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const SuccessIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[28px]">
    <div className="absolute inset-[6.25%_4.17%]">
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const typeStyles: Record<AutopilotCardType, {
  default: { bg: string; border: string; iconColor: string };
  hover: { bg: string; border: string; iconColor: string };
  press: { bg: string; border: string; iconColor: string };
}> = {
  info: {
    default: {
      bg: 'bg-white',
      border: 'border-sandstorm-s40',
      iconColor: '#0350C3', // blue-b20
    },
    hover: {
      bg: 'bg-blue-b0',
      border: 'border-blue-b20',
      iconColor: '#0350C3',
    },
    press: {
      bg: 'bg-blue-b0',
      border: 'border-blue-b20',
      iconColor: '#0350C3',
    },
  },
  warning: {
    default: {
      bg: 'bg-white',
      border: 'border-sandstorm-s40',
      iconColor: '#C58400', // yellow/orange
    },
    hover: {
      bg: 'bg-yellow-y0', // #FFECD6
      border: 'border-yellow-y10',
      iconColor: '#C58400',
    },
    press: {
      bg: 'bg-yellow-y0',
      border: 'border-yellow-y10',
      iconColor: '#C58400',
    },
  },
  success: {
    default: {
      bg: 'bg-white',
      border: 'border-sandstorm-s40',
      iconColor: '#0E4E4E', // forest-f50
    },
    hover: {
      bg: 'bg-forest-f0', // #DCF1E8
      border: 'border-forest-f40',
      iconColor: '#0E4E4E',
    },
    press: {
      bg: 'bg-forest-f0',
      border: 'border-forest-f40',
      iconColor: '#0E4E4E',
    },
  },
};

export const AutopilotCard: React.FC<AutopilotCardProps> = ({
  number,
  description,
  type = 'info',
  state = 'default',
  icon,
  onClick,
  className = '',
}) => {
  const styles = typeStyles[type][state];

  const renderIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'info':
        return <InfoIcon color={styles.iconColor} />;
      case 'warning':
        return <WarningIcon color={styles.iconColor} />;
      case 'success':
        return <SuccessIcon color={styles.iconColor} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex
        flex-col
        gap-1
        items-start
        relative
        shrink-0
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
      {/* Number and Icon */}
      <div className="flex gap-1 items-center relative shrink-0">
        <p className="font-gtAmerica font-medium leading-[40px] not-italic relative shrink-0 text-forest-f60 text-[28px] tracking-tight">
          {number}
        </p>
        <div className="flex items-center justify-center overflow-hidden p-[6px] relative rounded-[4px] shrink-0 size-[36px]">
          {renderIcon()}
        </div>
      </div>

      {/* Description */}
      <p className="font-gtAmerica font-normal leading-[28px] not-italic relative shrink-0 text-forest-f60 text-base">
        {description}
      </p>
    </div>
  );
};







