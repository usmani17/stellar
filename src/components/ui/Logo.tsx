import React from "react";
import { Link } from "react-router-dom";
import PrismLogo from "../../assets/images/prism-logo.svg";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "" }) => {
  return (
    <Link to="/" className={`h-9 flex items-center ${className}`}>
      <img src={PrismLogo} alt="Prism" className="h-[200px] w-auto" />
    </Link>
  );
};
