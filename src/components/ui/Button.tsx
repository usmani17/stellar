import React, { useEffect } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}) => {
  const baseStyles =
    "font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center";

  const variants = {
    primary:
      "bg-[#136d6d] text-white hover:bg-[#0e5a5a] hover:!text-white focus:ring-[#136d6d]",
    secondary:
      "bg-blue-b10 text-white hover:bg-blue-b20 focus:ring-blue-b30 border border-gray-200 rounded-lg items-center hover:bg-gray-50",
    outline:
      "border border-gray-200 rounded-lg items-center hover:bg-gray-50 text-[#136d6d] focus:ring-[#136d6d]",
    ghost:
      "border border-gray-200 rounded-lg items-center hover:bg-gray-50 text-[#072929] focus:ring-[#136d6d]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[14px]",
    md: "px-4 py-2 text-[16px]",
    lg: "px-6 py-3 text-[18px]",
  };

  // Check if custom background is provided in className
  const hasCustomBackground =
    className.includes("bg-[") ||
    className.includes("bg-forest") ||
    className.includes("bg-white") ||
    className.includes("bg-gray");

  // For primary variant without custom background, use CSS custom properties
  // This allows hover states to work via CSS classes
  const isPrimaryWithoutCustomBg =
    variant === "primary" && !hasCustomBackground;

  const buttonStyle: React.CSSProperties = isPrimaryWithoutCustomBg
    ? ({
        color: "#FFFFFF",
        "--btn-bg": "#136D6D",
        "--btn-bg-hover": "#0E4E4E",
        backgroundColor: "var(--btn-bg)",
      } as React.CSSProperties)
    : {};

  // Check if this is a primary button with custom bg that needs hover text color fix
  const isPrimaryWithCustomBg = variant === "primary" && hasCustomBackground;

  // Add global style for primary buttons with custom bg (only once)
  useEffect(() => {
    if (
      isPrimaryWithCustomBg &&
      !document.getElementById("primary-custom-bg-hover-style")
    ) {
      const style = document.createElement("style");
      style.id = "primary-custom-bg-hover-style";
      style.textContent = `
        button.primary-custom-bg:hover,
        button.primary-custom-bg:hover *,
        button.primary-custom-bg:hover span {
          color: white !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, [isPrimaryWithCustomBg]);

  return (
    <>
      {isPrimaryWithoutCustomBg && (
        <style>{`
          button[data-button-primary="true"]:hover {
            background-color: var(--btn-bg-hover) !important;
          }
        `}</style>
      )}
      <button
        data-button-primary={isPrimaryWithoutCustomBg ? "true" : undefined}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${
          isPrimaryWithCustomBg ? "primary-custom-bg" : ""
        } ${className}`}
        style={buttonStyle}
        {...props}
      >
        {isPrimaryWithoutCustomBg ? (
          <span style={{ color: "#FFFFFF" }}>{children}</span>
        ) : (
          children
        )}
      </button>
    </>
  );
};
