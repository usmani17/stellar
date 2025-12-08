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
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-forest-f60 text-white hover:bg-forest-f50 focus:ring-forest-f40',
    secondary: 'bg-blue-b10 text-white hover:bg-blue-b20 focus:ring-blue-b30',
    outline: 'border-2 border-forest-f60 text-forest-f60 hover:bg-forest-f0 focus:ring-forest-f40',
    ghost: 'text-forest-f60 hover:bg-sandstorm-s20 focus:ring-forest-f40',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-h700',
    md: 'px-4 py-2 text-h800',
    lg: 'px-6 py-3 text-h900',
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

