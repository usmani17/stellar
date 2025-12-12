import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const variants = {
    primary: 'bg-forest-f40 text-white hover:bg-forest-f50 focus:ring-forest-f40',
    secondary: 'bg-blue-b10 text-white hover:bg-blue-b20 focus:ring-blue-b30',
    outline: 'border border-forest-f40 text-forest-f40 hover:bg-forest-f0 focus:ring-forest-f40',
    ghost: 'text-forest-f60 hover:bg-sandstorm-s30 focus:ring-forest-f40',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-[14px]',
    md: 'px-4 py-2 text-[16px]',
    lg: 'px-6 py-3 text-[18px]',
  };
  
  // Check if custom background is provided in className
  const hasCustomBackground = className.includes('bg-[') || className.includes('bg-forest') || className.includes('bg-white') || className.includes('bg-gray');
  
  // For primary variant without custom background, use CSS custom properties
  // This allows hover states to work via CSS classes
  const isPrimaryWithoutCustomBg = variant === 'primary' && !hasCustomBackground;
  
  const buttonStyle: React.CSSProperties = isPrimaryWithoutCustomBg
    ? { 
        color: '#FFFFFF',
        '--btn-bg': '#136D6D',
        '--btn-bg-hover': '#0E4E4E',
        backgroundColor: 'var(--btn-bg)'
      } as React.CSSProperties
    : {};

  return (
    <>
      {isPrimaryWithoutCustomBg && (
        <style>{`
          button[data-button-primary="true"]:hover {
            background-color: var(--btn-bg-hover) !important;
          }
        `}</style>
      )}
      <button
        data-button-primary={isPrimaryWithoutCustomBg ? 'true' : undefined}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        style={buttonStyle}
        {...props}
      >
        {isPrimaryWithoutCustomBg ? (
          <span style={{ color: '#FFFFFF' }}>{children}</span>
        ) : (
          children
        )}
      </button>
    </>
  );
};

