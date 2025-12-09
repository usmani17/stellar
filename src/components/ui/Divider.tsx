import React from 'react';

interface DividerProps {
  text?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ 
  text = 'or', 
  className = '' 
}) => {
  return (
    <div className={`self-stretch inline-flex justify-start items-center gap-2.5 ${className}`}>
      <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
      <span 
        className="justify-start text-black text-sm font-medium leading-5"
        style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
      >
        {text}
      </span>
      <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
    </div>
  );
};

