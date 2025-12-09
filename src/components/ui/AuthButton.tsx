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
          border border-[#e8e8e3] 
          rounded-2xl 
          flex items-center justify-center gap-2.5 
          hover:bg-sandstorm-s5 
          transition-colors
          disabled:opacity-50 
          disabled:cursor-not-allowed
          ${className}
        `}
        style={{ fontFamily: 'Poppins, sans-serif' }}
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
        bg-[#136D6D]
        hover:bg-[#0e5a5a] 
        active:bg-[#0e5a5a]
        text-white 
        font-semibold 
        text-base 
        px-6 py-5 
        rounded-xl 
        transition-colors 
        disabled:opacity-50 
        disabled:cursor-not-allowed
        inline-flex justify-center items-center gap-2.5
        ${className}
      `}
      style={{ 
        fontFamily: 'Poppins, sans-serif', 
        fontWeight: 600,
        backgroundColor: '#136D6D'
      }}
      {...props}
    >
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  );
};

