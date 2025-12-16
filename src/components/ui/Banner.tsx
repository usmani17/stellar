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

// Icon components
const WarningIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[18px]">
    <div 
      className="absolute"
      style={{
        width: '16.50px',
        height: '14.25px',
        left: '0.75px',
        top: '1.88px',
        backgroundColor: color
      }}
    />
  </div>
);

const InfoIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[18px]">
    <div 
      className="absolute"
      style={{
        width: '15px',
        height: '15px',
        left: '1.50px',
        top: '1.50px',
        backgroundColor: color
      }}
    />
  </div>
);

const ErrorIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[18px]">
    <div 
      className="absolute"
      style={{
        width: '15px',
        height: '15px',
        left: '1.50px',
        top: '1.50px',
        backgroundColor: color
      }}
    />
  </div>
);

const SuccessIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[18px]">
    <div 
      className="absolute"
      style={{
        width: '15px',
        height: '15px',
        left: '1.50px',
        top: '1.50px',
        backgroundColor: color
      }}
    />
  </div>
);

const CloseIcon: React.FC<{ color: string }> = ({ color }) => (
  <div className="overflow-hidden relative shrink-0 size-[18px]">
    <div 
      className="absolute"
      style={{
        width: '10.50px',
        height: '10.50px',
        left: '3.75px',
        top: '3.75px',
        backgroundColor: color
      }}
    />
  </div>
);

const typeStyles: Record<BannerType, {
  bg: string;
  text: string;
  iconColor: string;
  closeIconColor: string;
}> = {
  warning: {
    bg: 'bg-yellow-y10', // #FF991F
    text: 'text-forest-f60', // #072929
    iconColor: '#072929',
    closeIconColor: '#072929',
  },
  info: {
    bg: 'bg-sandstorm-s40', // #E8E8E3 (updated from s30)
    text: 'text-forest-f60', // #072929
    iconColor: '#072929',
    closeIconColor: '#072929',
  },
  error: {
    bg: 'bg-red-r40', // #B51111 (updated from r30)
    text: 'text-white',
    iconColor: '#FFFFFF',
    closeIconColor: '#FFFFFF',
  },
  success: {
    bg: 'bg-forest-f40', // #136D6D
    text: 'text-white',
    iconColor: '#FFFFFF',
    closeIconColor: '#FFFFFF',
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
        return <WarningIcon color={styles.iconColor} />;
      case 'info':
        return <InfoIcon color={styles.iconColor} />;
      case 'error':
        return <ErrorIcon color={styles.iconColor} />;
      case 'success':
        return <SuccessIcon color={styles.iconColor} />;
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
        h-[52px]
        rounded-[4px]
        overflow-hidden
        ${className}
      `}
    >
      {/* Icon and Message Container - Centered */}
      <div
        className={`
          absolute
          top-[14px]
          left-1/2
          -translate-x-1/2
          flex
          items-center
          gap-[4px]
          overflow-hidden
        `}
      >
        {/* Icon Container */}
        <div className="flex items-center justify-center overflow-hidden p-[6px] rounded-[4px] shrink-0 size-[24px]">
          {renderIcon()}
        </div>

        {/* Message */}
        <div
          className={`
            flex
            flex-col
            justify-center
            text-[14px]
            shrink-0
          `}
          style={{ 
            fontWeight: 700,
            lineHeight: '20px',
            color: type === 'error' || type === 'success' ? '#FFFFFF' : '#072929'
          }}
        >
          {message}
        </div>
      </div>

      {/* CTA Button */}
      {cta && (
        <button
          onClick={onCtaClick}
          className={`
            absolute
            top-[17px]
            right-[23px]
            flex
            flex-col
            justify-center
            text-[12px]
            text-right
            whitespace-nowrap
            hover:opacity-80
            transition-opacity
            shrink-0
          `}
          style={{
            fontWeight: 500,
            lineHeight: '18px',
            color: type === 'error' || type === 'success' ? '#FFFFFF' : '#072929'
          }}
        >
          {ctaText}
        </button>
      )}

      {/* Dismiss Button */}
      {dismissable && (
        <button
          onClick={handleDismiss}
          className={`
            absolute
            top-[14px]
            right-[23px]
            flex
            items-center
            justify-center
            overflow-hidden
            p-[6px]
            rounded-[4px]
            size-[24px]
            hover:opacity-80
            transition-opacity
            shrink-0
          `}
          aria-label="Dismiss"
        >
          <CloseIcon color={styles.closeIconColor} />
        </button>
      )}
    </div>
  );
};

