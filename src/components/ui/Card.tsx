import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  actions,
}) => {
  return (
    <div className={`bg-[#F9F9F6] rounded-xl border border-[#E8E8E3] ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-6 border-b border-[#E8E8E3] flex items-center justify-between">
          {title && (
            <h3 className="text-[24px] font-medium text-[#072929]">{title}</h3>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-6 py-6">
        {children}
      </div>
    </div>
  );
};

