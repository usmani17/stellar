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
    <div className={`bg-white rounded-lg border border-sandstorm-s50 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-sandstorm-s30 flex items-center justify-between">
          {title && (
            <h3 className="text-h1000 font-semibold text-forest-f60">{title}</h3>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  );
};

