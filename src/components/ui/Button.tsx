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
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
  };

  const sizeClasses = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
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
        className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${
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
