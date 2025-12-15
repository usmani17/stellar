import React from "react";
import { Link } from "react-router-dom";
import StellarLogo from "../../assets/images/stellar-logo-v2 1.svg";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "" }) => {
  return (
    <Link to="/" className={`h-9 flex items-center ${className}`}>
      <img src={StellarLogo} alt="Stellar" className="h-[200px] w-auto" />
    </Link>
  );
};
