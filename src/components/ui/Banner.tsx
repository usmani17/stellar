import React, { useState } from 'react';

export type BannerType = 'warning' | 'info' | 'error' | 'success';

interface BannerProps {
  /** The type of banner */
  type?: BannerType;
  /** The message text to display */
  message: string;
  /** Whether the banner can be dismissed */
  dismissable?: boolean;
  /** Whether to show a CTA button */
  cta?: boolean;
  /** CTA button text */
  ctaText?: string;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Callback when CTA is clicked */
  onCtaClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Icon components with proper SVG icons
const WarningIcon: React.FC = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const InfoIcon: React.FC = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const SuccessIcon: React.FC = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const typeStyles: Record<BannerType, {
  bg: string;
  text: string;
  iconColor: string;
  closeIconColor: string;
  borderColor?: string;
}> = {
  warning: {
    bg: 'bg-yellow-y10', // #FF991F
    text: 'text-forest-f60', // #072929
    iconColor: '#072929',
    closeIconColor: '#072929',
  },
  info: {
    bg: 'bg-sandstorm-s40', // #E8E8E3
    text: 'text-forest-f60', // #072929
    iconColor: '#072929',
    closeIconColor: '#072929',
  },
  error: {
    bg: 'bg-red-r40', // #B51111
    text: 'text-white',
    iconColor: '#FFFFFF',
    closeIconColor: '#FFFFFF',
  },
  success: {
    bg: 'bg-forest-f0', // #DCF1E8 - lighter green background
    text: 'text-forest-f60', // #072929 - dark text
    iconColor: '#136D6D', // forest-f40 for icon
    closeIconColor: '#072929',
    borderColor: '#136D6D', // forest-f40 border
  },
};

export const Banner: React.FC<BannerProps> = ({
  type = 'warning',
  message,
  dismissable = false,
  cta = false,
  ctaText = 'Retry',
  onDismiss,
  onCtaClick,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const styles = typeStyles[type];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const renderIcon = () => {
    switch (type) {
      case 'warning':
        return <WarningIcon />;
      case 'info':
        return <InfoIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'success':
        return <SuccessIcon />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        relative
        ${styles.bg}
        ${styles.text}
        ${type === 'success' ? 'border' : ''}
        min-h-[52px]
        px-4
        py-3
        rounded-lg
        flex
        items-center
        gap-3
        ${className}
      `}
      style={type === 'success' && styles.borderColor ? {
        borderColor: styles.borderColor,
        borderWidth: '1px'
      } : {}}
    >
      {/* Icon Container */}
      <div 
        className="flex items-center justify-center shrink-0"
        style={{ color: styles.iconColor }}
      >
        {renderIcon()}
      </div>

      {/* Message */}
      <div
        className={`
          flex-1
          text-[14px]
          leading-5
          font-medium
        `}
        style={{ 
          color: styles.text === 'text-white' ? '#FFFFFF' : '#072929'
        }}
      >
        {message}
      </div>

      {/* Action Buttons Container */}
      <div className="flex items-center gap-2 shrink-0">
        {/* CTA Button */}
        {cta && (
          <button
            onClick={onCtaClick}
            className={`
              px-3
              py-1.5
              rounded-md
              text-[12px]
              font-medium
              whitespace-nowrap
              transition-all
              shrink-0
              ${
                type === 'error'
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : type === 'success'
                  ? 'bg-forest-f40 hover:bg-forest-f50 text-white'
                  : 'bg-forest-f60 hover:bg-forest-f50 text-white'
              }
            `}
          >
            {ctaText}
          </button>
        )}

        {/* Dismiss Button */}
        {dismissable && (
          <button
            onClick={handleDismiss}
            className={`
              flex
              items-center
              justify-center
              p-1
              rounded-md
              hover:opacity-70
              transition-opacity
              shrink-0
              ${
                type === 'error'
                  ? 'hover:bg-white/20'
                  : type === 'success'
                  ? 'hover:bg-forest-f40/10'
                  : 'hover:bg-forest-f60/10'
              }
            `}
            aria-label="Dismiss"
            style={{ color: styles.closeIconColor }}
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
};

