import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'error' | 'success' | 'info' | 'warning';
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'error',
  className = ''
}) => {
  const variants = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <div className={`
      ${variants[variant]} 
      border 
      px-4 py-3 
      rounded-lg 
      text-h700
      font-poppins
      ${className}
    `}>
      {children}
    </div>
  );
};

