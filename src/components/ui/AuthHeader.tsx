import React from 'react';

interface AuthHeaderProps {
  title: string;
  description: string | React.ReactNode;
  className?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ 
  title, 
  description, 
  className = '' 
}) => {
  return (
    <div className={`self-stretch flex flex-col justify-start items-start gap-4 ${className}`}>
      <h2 
        className="self-stretch justify-start text-black text-3xl font-semibold"
        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
      >
        {title}
      </h2>
      <div 
        className="self-stretch justify-start text-[#808080] text-xl font-normal"
        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
      >
        {typeof description === 'string' ? (
          <p>{description}</p>
        ) : (
          description
        )}
      </div>
    </div>
  );
};

