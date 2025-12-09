import React, { type ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-[#f5f7fa] border border-[#e6e6e6] rounded-2xl p-10 ${className}`}>
      <div className="flex flex-col gap-16 w-[576px]">
        {children}
      </div>
    </div>
  );
};

