import React, { useState } from "react";

interface ChipProps {
  children: React.ReactNode;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "outline";
  editable?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  onClose,
  onClick,
  className = "",
  variant = "default",
  editable = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.2px] font-medium transition-all duration-200";

  const variantStyles = {
    default: "bg-forest-f60 text-white",
    outline: "bg-transparent border border-forest-f60 text-forest-f60",
  };

  // Enhanced hover styles for editable chips
  const getHoverStyles = () => {
    if (!editable || !onClick) {
      return onClick ? "cursor-pointer hover:opacity-80" : "";
    }

    // Editable hover styles - white background for both variants
    if (variant === "default") {
      // For dark background, change to white on hover with dark text
      return "cursor-pointer";
    } else {
      // For outline variant, use white background
      return "cursor-pointer";
    }
  };

  const clickableStyles = getHoverStyles();

  // Get dynamic styles for hover state
  const getDynamicStyles = () => {
    if (!editable || !onClick || !isHovered) {
      return variant === "default" ? { backgroundColor: "rgb(7, 41, 41)" } : {};
    }

    // Hover state styles
    if (variant === "default") {
      return {
        backgroundColor: "#ffffff",
        color: "#136D6D",
        border: "1px solid #136D6D",
      };
    } else {
      return {
        backgroundColor: "#ffffff",
        borderColor: "#136D6D",
      };
    }
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${clickableStyles} ${className} group`}
      style={getDynamicStyles()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      title={editable && onClick ? "Click to edit" : undefined}
    >
      {children}
      {editable && onClick && (
        <svg
          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#136D6D]"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      )}
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
