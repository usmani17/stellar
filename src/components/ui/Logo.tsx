import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <Link to="/" className={`h-9 flex items-center ${className}`}>
      <h1 className="text-[36px] font-bold text-forest-f60 leading-[1]" className="font-poppins">
        PIXIS
      </h1>
    </Link>
  );
};

