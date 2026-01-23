import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  message?: string;
  variant?: "default" | "white";
  showMessage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

export const Loader: React.FC<LoaderProps> = ({
  size = "md",
  className = "",
  message,
  variant = "default",
  showMessage = true,
}) => {
  const borderColor = variant === "white" ? "border-white" : "border-[#136D6D]";
  
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className={`animate-spin rounded-full ${borderColor} border-t-transparent ${sizeClasses[size]}`}
      />
      {message && showMessage && (
        <p className="text-[14px] text-[#556179]">{message}</p>
      )}
    </div>
  );
};

