import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  /** Render tooltip in a portal to document.body so it appears above overflow/stacking (e.g. tables) */
  portal?: boolean;
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

const GAP_PX = 7;

function getPortalStyle(
  position: TooltipPosition,
  rect: DOMRect,
): React.CSSProperties {
  const { left, top, right, bottom, width, height } = rect;
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };
  switch (position) {
    case 'right':
      return { ...base, left: right + GAP_PX, top };
    case 'left':
      return { ...base, left: left - GAP_PX, top, transform: 'translateX(-100%)' };
    case 'topLeft':
      return { ...base, left, top: top - GAP_PX, transform: 'translateY(-100%)' };
    case 'topRight':
      return { ...base, left: right, top: top - GAP_PX, transform: 'translate(-100%, -100%)' };
    case 'bottomLeft':
      return { ...base, left, top: bottom + GAP_PX };
    case 'bottomRight':
      return { ...base, left: right, top: bottom + GAP_PX, transform: 'translateX(-100%)' };
    case 'topMiddle':
      return { ...base, left: left + width / 2, top: top - GAP_PX, transform: 'translate(-50%, -100%)' };
    case 'bottomMiddle':
      return { ...base, left: left + width / 2, top: bottom + GAP_PX, transform: 'translateX(-50%)' };
    default:
      return { ...base, left: right + GAP_PX, top };
  }
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  heading = 'Heading',
  description = 'It is a long established fact that a reader will be distracted.',
  position = 'left',
  visible: controlledVisible,
  onVisibleChange,
  className = '',
  triggerClassName = '',
  portal = false,
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledVisible !== undefined;
  const visible = isControlled ? controlledVisible : internalVisible;

  const updateRect = () => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (visible && portal) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }
    if (!visible && portal) {
      setTriggerRect(null);
    }
  }, [visible, portal]);

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

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={`
        z-[9999]
        ${!portal ? 'absolute' : ''}
        ${!portal && position === 'left' ? 'right-full mr-[7px]' : ''}
        ${!portal && position === 'right' ? 'left-full ml-[7px]' : ''}
        ${!portal && position === 'topLeft' ? 'bottom-full mb-[7px] left-0' : ''}
        ${!portal && position === 'topRight' ? 'bottom-full mb-[7px] right-0' : ''}
        ${!portal && position === 'bottomLeft' ? 'top-full mt-[7px] left-0' : ''}
        ${!portal && position === 'bottomRight' ? 'top-full mt-[7px] right-0' : ''}
        ${!portal && position === 'topMiddle' ? 'bottom-full mb-[7px] left-1/2 -translate-x-1/2' : ''}
        ${!portal && position === 'bottomMiddle' ? 'top-full mt-[7px] left-1/2 -translate-x-1/2' : ''}
        ${className}
      `}
      style={portal && triggerRect ? getPortalStyle(position, triggerRect) : undefined}
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
              className="font-gtAmerica font-medium relative shrink-0 w-full"
            >
              {heading}
            </p>
          )}
          {description && (
            <p
              className="font-gtAmerica font-normal relative shrink-0 w-full"
            >
              {description}
            </p>
          )}
        </div>
        <TooltipArrow position={position} />
      </div>
    </div>
  );

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
      {visible &&
        (portal && triggerRect && typeof document !== 'undefined' && document.body
          ? createPortal(tooltipContent, document.body)
          : !portal
            ? tooltipContent
            : null)}
    </div>
  );
};

