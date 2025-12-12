import React from 'react';

export type AvatarVariant = 'entity' | 'user';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** The text/initial to display in the avatar */
  text?: string;
  /** The image URL (optional, if provided, image will be shown instead of text) */
  imageUrl?: string;
  /** Variant type: 'entity' for square-ish avatars, 'user' for circular avatars */
  variant?: AvatarVariant;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Show online status indicator */
  showStatus?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<AvatarSize, { 
  container: string; 
  text: string; 
  status: string;
}> = {
  xs: {
    container: 'w-4 h-4',
    text: 'text-[10px] leading-4',
    status: 'w-1.5 h-1.5 p-0.5 left-[14px] top-[14px]',
  },
  sm: {
    container: 'w-7 h-7',
    text: 'text-lg leading-7',
    status: 'w-3 h-3 p-1.5 left-[18px] top-[18px]',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-xl leading-10',
    status: 'w-4 h-4 p-1 left-[34px] top-[34px]',
  },
  lg: {
    container: 'w-16 h-16',
    text: 'text-4xl leading-16',
    status: 'w-6 h-6 p-1.5 left-[58px] top-[58px]',
  },
  xl: {
    container: 'w-32 h-32',
    text: 'text-6xl',
    status: 'w-11 h-11 p-1.5 left-[84px] top-[84px]',
  },
};

const variantClasses: Record<AvatarVariant, string> = {
  entity: 'rounded-lg',
  user: 'rounded-[999px]',
};

const getInitials = (text?: string): string => {
  if (!text) return '?';
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text[0].toUpperCase();
};

const StatusIndicator: React.FC<{ size: AvatarSize }> = ({ size }) => {
  if (size === 'xl') {
    return (
      <div className="w-9 h-9 relative overflow-hidden">
        <div className="w-6 h-4 left-[5.62px] top-[10.12px] absolute overflow-hidden">
          <div className="w-6 h-4 left-0 top-0 absolute bg-gradient-to-l from-sky-500 to-blue-700" />
          <div className="w-6 h-4 left-[2.11px] top-0 absolute bg-gradient-to-r from-blue-700 via-blue-700 to-sky-500" />
          <div className="w-2 h-3.5 left-0 top-0 absolute bg-gradient-to-l from-sky-500 to-blue-700" />
        </div>
      </div>
    );
  }

  if (size === 'lg' || size === 'md') {
    return (
      <div className="w-4 h-4 relative overflow-hidden">
        <div className="w-3 h-2 left-[2px] top-[4px] absolute overflow-hidden">
          <div className="w-3 h-2 left-0 top-0 absolute bg-gradient-to-l from-sky-500 to-blue-700" />
          <div className="w-3 h-2 left-[1px] top-0 absolute bg-gradient-to-r from-blue-700 via-blue-700 to-sky-500" />
          <div className="w-1 h-1.5 left-0 top-0 absolute bg-gradient-to-l from-sky-500 to-blue-700" />
        </div>
      </div>
    );
  }

  // For small sizes (sm, xs)
  return (
    <div className="w-2 h-2 relative overflow-hidden">
      <div className="w-1.5 h-1 left-[1.25px] top-[2.25px] absolute overflow-hidden">
        <div className="w-1.5 h-1 left-0 top-0 absolute bg-gradient-to-l from-sky-500 to-blue-700" />
        <div className="w-[5.03px] h-1 left-[0.47px] top-0 absolute bg-gradient-to-r from-blue-700 via-blue-700 to-sky-500" />
        <div className="w-[1.58px] h-[3.21px] left-0 top-0 absolute bg-gradient-to-l from-sky-500 to-blue-700" />
      </div>
    </div>
  );
};

export const Avatar: React.FC<AvatarProps> = ({
  text,
  imageUrl,
  variant = 'user',
  size = 'md',
  showStatus = false,
  className = '',
}) => {
  const sizeConfig = sizeClasses[size];
  const variantClass = variantClasses[variant];
  const initials = getInitials(text);

  // Special handling for User Avatar sm - uses flex layout with padding (matching Figma exactly)
  const isUserSm = variant === 'user' && size === 'sm';

  // Container classes - User sm uses different layout, all others use flex for centering
  const containerClasses = isUserSm
    ? `px-2 bg-black ${variantClass} inline-flex flex-col justify-center items-center gap-2.5 overflow-hidden ${sizeConfig.container} ${className}`
    : `relative bg-black overflow-hidden ${sizeConfig.container} ${variantClass} flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={text || 'Avatar'}
          className="w-full h-full object-cover"
        />
      ) : isUserSm ? (
        // User Avatar sm uses flex layout (matching Figma exactly)
        <div className="self-stretch justify-start text-white text-lg font-normal leading-7 font-agrandir">
          {initials}
        </div>
      ) : (
        // All other sizes use flexbox for perfect centering
        <div 
          className={`text-white font-normal ${sizeConfig.text} flex items-center justify-center font-agrandir`}
        >
          {initials}
        </div>
      )}
      
      {showStatus && (
        <div className={`${sizeConfig.status} absolute bg-white rounded inline-flex justify-center items-center gap-2.5 overflow-hidden`}>
          <StatusIndicator size={size} />
        </div>
      )}
    </div>
  );
};
