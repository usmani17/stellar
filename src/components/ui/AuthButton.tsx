import React from 'react';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'oauth';
  loading?: boolean;
  loadingText?: string;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  variant = 'primary',
  loading = false,
  loadingText,
  className = '',
  disabled,
  ...props
}) => {
  if (variant === 'oauth') {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        className={`
          w-full h-14 
          bg-white 
          border border-sandstorm-s40 
          rounded-2xl 
          flex items-center justify-center gap-2.5 
          hover:bg-sandstorm-s20
          hover:border-sandstorm-s60
          active:bg-sandstorm-s30
          active:border-sandstorm-s60
          focus:outline-none focus:ring-1 focus:ring-forest-f40 focus:ring-offset-1
          transition-all duration-200
          cursor-pointer
          disabled:opacity-50 
          disabled:cursor-not-allowed
          shadow-sm hover:shadow-md
          transform hover:scale-[1.01]
          text-black
          font-normal
          ${className}
        `}
        style={{ fontFamily: 'Poppins, sans-serif', color: 'black' }}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`
        self-stretch
        bg-forest-f40
        hover:bg-forest-f50
        active:bg-forest-f60
        font-semibold 
        text-base 
        px-6 py-5 
        rounded-xl 
        focus:outline-none focus:ring-1 focus:ring-forest-f40 focus:ring-offset-1
        transition-all duration-200
        cursor-pointer
        disabled:opacity-50 
        disabled:cursor-not-allowed
        inline-flex justify-center items-center gap-2.5
        shadow-md hover:shadow-lg active:shadow-sm
        transform hover:scale-[1.01] active:scale-[0.98]
        ${className}
      `}
      style={{ 
        fontFamily: 'Poppins, sans-serif', 
        fontWeight: 600,
        color: '#FFFFFF !important',
        backgroundColor: '#136D6D'
      }}
      {...props}
    >
      <span style={{ color: '#FFFFFF' }}>
        {loading ? (loadingText || 'Loading...') : children}
      </span>
    </button>
  );
};

