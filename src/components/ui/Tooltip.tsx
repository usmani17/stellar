import React, { useState, useRef, useEffect } from 'react';

export type TooltipPosition = 
  | 'left' 
  | 'right' 
  | 'topLeft' 
  | 'topRight' 
  | 'bottomLeft' 
  | 'bottomRight' 
  | 'topMiddle' 
  | 'bottomMiddle';

interface TooltipProps {
  /** The content to trigger the tooltip */
  children: React.ReactNode;
  /** Tooltip heading text */
  heading?: string;
  /** Tooltip description text */
  description?: string;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Whether the tooltip is visible (controlled) */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibleChange?: (visible: boolean) => void;
  /** Additional CSS classes for tooltip */
  className?: string;
  /** Additional CSS classes for trigger */
  triggerClassName?: string;
}

// Arrow component for different positions
const TooltipArrow: React.FC<{ position: TooltipPosition }> = ({ position }) => {
  const arrowClasses: Record<TooltipPosition, string> = {
    left: 'absolute h-[14px] left-[-7px] top-[10px] w-[7.069px]',
    right: 'absolute h-[14px] right-[-7.07px] top-[10px] w-[7.069px] flex items-center justify-center rotate-180 scale-y-[-100%]',
    topLeft: 'absolute flex h-[7.069px] items-center justify-center left-[10px] top-[-7px] w-[14px] rotate-[90deg] scale-y-[-100%]',
    topRight: 'absolute flex h-[7.069px] items-center justify-center right-[10px] top-[-7px] w-[14px] rotate-[90deg] scale-y-[-100%]',
    bottomLeft: 'absolute bottom-[-7.07px] flex h-[7.069px] items-center justify-center left-[10px] w-[14px] rotate-[270deg]',
    bottomRight: 'absolute bottom-[-7.07px] flex h-[7.069px] items-center justify-center right-[10px] w-[14px] rotate-[270deg]',
    topMiddle: 'absolute flex h-[7.069px] items-center justify-center left-1/2 top-[-7px] translate-x-[-50%] w-[14px] rotate-[90deg] scale-y-[-100%]',
    bottomMiddle: 'absolute bottom-[-7.07px] flex h-[7.069px] items-center justify-center left-1/2 translate-x-[-50%] w-[14px] rotate-[270deg]',
  };

  // Create arrow using SVG
  const ArrowSVG = () => (
    <svg
      width="14"
      height="7"
      viewBox="0 0 14 7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <path
        d="M7 7L0 0H14L7 7Z"
        fill="#072929"
      />
    </svg>
  );

  return (
    <div className={arrowClasses[position]}>
      {position === 'left' ? (
        <svg
          width="7"
          height="14"
          viewBox="0 0 7 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M7 0L0 7L7 14V0Z"
            fill="#072929"
          />
        </svg>
      ) : (
        <ArrowSVG />
      )}
    </div>
  );
};

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  heading = 'Heading',
  description = 'It is a long established fact that a reader will be distracted.',
  position = 'left',
  visible: controlledVisible,
  onVisibleChange,
  className = '',
  triggerClassName = '',
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledVisible !== undefined;
  const visible = isControlled ? controlledVisible : internalVisible;

  const handleMouseEnter = () => {
    if (!isControlled) {
      setInternalVisible(true);
    }
    onVisibleChange?.(true);
  };

  const handleMouseLeave = () => {
    if (!isControlled) {
      setInternalVisible(false);
    }
    onVisibleChange?.(false);
  };

  const handleFocus = () => {
    if (!isControlled) {
      setInternalVisible(true);
    }
    onVisibleChange?.(true);
  };

  const handleBlur = () => {
    if (!isControlled) {
      setInternalVisible(false);
    }
    onVisibleChange?.(false);
  };

  // Determine tooltip width based on position
  const tooltipWidth = position === 'topLeft' ? 'w-full' : 'w-[212px]';

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${triggerClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      
      {visible && (
        <div
          ref={tooltipRef}
          className={`
            absolute
            z-50
            ${position === 'left' ? 'right-full mr-[7px]' : ''}
            ${position === 'right' ? 'left-full ml-[7px]' : ''}
            ${position === 'topLeft' ? 'bottom-full mb-[7px] left-0' : ''}
            ${position === 'topRight' ? 'bottom-full mb-[7px] right-0' : ''}
            ${position === 'bottomLeft' ? 'top-full mt-[7px] left-0' : ''}
            ${position === 'bottomRight' ? 'top-full mt-[7px] right-0' : ''}
            ${position === 'topMiddle' ? 'bottom-full mb-[7px] left-1/2 -translate-x-1/2' : ''}
            ${position === 'bottomMiddle' ? 'top-full mt-[7px] left-1/2 -translate-x-1/2' : ''}
            ${className}
          `}
        >
          <div
            className={`
              bg-[#072929]
              flex
              items-start
              overflow-clip
              px-[12px]
              py-[10px]
              relative
              rounded-[4px]
              shrink-0
              ${tooltipWidth}
            `}
          >
            <div
              className={`
                flex
                flex-[1_0_0]
                flex-col
                gap-[2px]
                items-start
                leading-[18px]
                min-h-px
                min-w-px
                relative
                shrink-0
                text-[12px]
                text-white
                whitespace-pre-wrap
              `}
            >
              {heading && (
                <p
                  className="font-medium relative shrink-0 w-full"
                  className="font-gtAmerica"
                >
                  {heading}
                </p>
              )}
              {description && (
                <p
                  className="font-normal relative shrink-0 w-full"
                  className="font-gtAmerica"
                >
                  {description}
                </p>
              )}
            </div>
            <TooltipArrow position={position} />
          </div>
        </div>
      )}
    </div>
  );
};

