import React from "react";

interface ChipProps {
  children: React.ReactNode;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "outline";
}

export const Chip: React.FC<ChipProps> = ({
  children,
  onClose,
  onClick,
  className = "",
  variant = "default",
}) => {
  const baseStyles =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.2px] font-medium transition-colors";

  const variantStyles = {
    default: "bg-forest-f60 text-white",
    outline: "bg-transparent border border-forest-f60 text-forest-f60",
  };

  const clickableStyles = onClick ? "cursor-pointer hover:opacity-80" : "";

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${clickableStyles} ${className}`}
      style={
        variant === "default"
          ? { backgroundColor: "rgb(7, 41, 41)" }
          : undefined
      }
      onClick={onClick}
    >
      {children}
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-1 hover:opacity-70 transition-opacity focus:outline-none"
          aria-label="Remove"
        >
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
};
