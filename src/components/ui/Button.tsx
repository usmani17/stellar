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
    primary: 'bg-[#136d6d] text-white hover:bg-[#0e5a5a] focus:ring-[#136d6d]',
    secondary: 'bg-blue-b10 text-white hover:bg-blue-b20 focus:ring-blue-b30',
    outline: 'border-2 border-[#136d6d] text-[#136d6d] hover:bg-[#D6E5E5] focus:ring-[#136d6d]',
    ghost: 'text-[#072929] hover:bg-[#F0F0ED] focus:ring-[#136d6d]',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-[14px]',
    md: 'px-4 py-2 text-[16px]',
    lg: 'px-6 py-3 text-[18px]',
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

