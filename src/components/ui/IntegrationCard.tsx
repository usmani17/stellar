import React from 'react';

export type IntegrationCardState = 'default' | 'hover' | 'press';
export type IntegrationCardStyle = 'default' | 'hover' | 'press';

interface IntegrationCardProps {
  /** Title of the card */
  title: string;
  /** Description text */
  description: string;
  /** Icon component or image */
  icon?: React.ReactNode;
  /** Whether the integration is connected */
  connected?: boolean;
  /** Style/state of the card */
  style?: IntegrationCardStyle;
  /** Callback when button is clicked */
  onButtonClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const getStateStyles = (style: IntegrationCardStyle, connected: boolean) => {
  if (connected) {
    return {
      default: {
        bg: 'bg-white',
        border: 'border-sandstorm-s40',
        shadow: 'shadow-[inset_0px_-6px_0px_0px_#136d6d]',
      },
      hover: {
        bg: 'bg-blue-b0',
        border: 'border-blue-b20',
        shadow: 'shadow-[inset_0px_-6px_0px_0px_#136d6d]',
      },
      press: {
        bg: 'bg-blue-b0',
        border: 'border-blue-b20',
        shadow: 'shadow-[inset_0px_-6px_0px_0px_#136d6d]',
      },
    }[style];
  } else {
    return {
      default: {
        bg: 'bg-white',
        border: 'border-sandstorm-s40',
      },
      hover: {
        bg: 'bg-blue-b0',
        border: 'border-blue-b20',
        shadow: 'shadow-[inset_0px_-6px_0px_0px_#0350c3]',
      },
      press: {
        bg: 'bg-blue-b0',
        border: 'border-blue-b20',
        shadow: 'shadow-[inset_0px_-6px_0px_0px_#0350c3]',
      },
    }[style];
  }
};

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title,
  description,
  icon,
  connected = false,
  style = 'default',
  onButtonClick,
  className = '',
}) => {
  const styles = getStateStyles(style, connected);

  return (
    <div
      className={`
        relative
        flex
        flex-col
        gap-4
        items-start
        justify-center
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
      {/* Top Section: Icon and Button */}
      <div className="flex items-center justify-between relative shrink-0 w-full">
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

        {/* Button */}
        {connected ? (
          <button
            onClick={onButtonClick}
            className="bg-sandstorm-s0 border border-gray-200 flex gap-1 h-7 items-center justify-center min-w-[80px] px-3 py-0 relative rounded-lg shrink-0 hover:bg-gray-50 transition-colors"
          >
            <div
              className="font-gtAmerica font-medium flex flex-col justify-center leading-[0] not-italic relative shrink-0 text-sm text-center text-forest-f60 whitespace-nowrap"
            >
              <p className="leading-[20px]">Manage</p>
            </div>
          </button>
        ) : (
          <button
            onClick={onButtonClick}
            className="flex gap-1 h-7 items-center justify-center min-w-[80px] px-3 py-0 relative border border-gray-200 rounded-lg shrink-0 hover:bg-gray-50 transition-colors"
          >
            <div
              className="font-gtAmerica font-medium flex flex-col justify-center leading-[0] not-italic relative shrink-0 text-sm text-center text-blue-b10Alt whitespace-nowrap"
            >
              <p className="leading-[20px]">Connect</p>
            </div>
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col items-start relative shrink-0 w-full">
        <div className="flex flex-col gap-1 items-start not-italic relative shrink-0 w-full">
          <p
            className="font-gtAmerica font-bold leading-[28px] relative shrink-0 text-forest-f60 text-lg tracking-tighter w-full"
          >
            {title}
          </p>
          <p
            className="font-gtAmerica font-medium leading-[20px] relative shrink-0 text-neutral-n300 text-sm w-full"
          >
            {description}
          </p>
        </div>
      </div>

      {/* Bottom border shadow for hover/press states */}
      {styles.shadow && (
        <div className={`absolute inset-0 pointer-events-none ${styles.shadow}`} />
      )}
    </div>
  );
};

