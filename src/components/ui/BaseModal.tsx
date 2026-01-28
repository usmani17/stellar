import React from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
  maxWidth?: string; // Custom max-width class (e.g., "max-w-[800px]")
  padding?: string; // Custom padding class (default: "p-6")
  maxHeight?: string; // Custom max-height class (default: "max-h-[90vh]")
  zIndex?: string; // Custom z-index class (default: "z-[200]")
  backdropOpacity?: string; // Custom backdrop opacity (default: "bg-black/60")
  closeOnBackdropClick?: boolean; // Whether to close when clicking backdrop (default: true)
  disableBackdropClick?: boolean; // Disable backdrop click when loading/processing (default: false)
  className?: string; // Additional classes for the modal container
  containerClassName?: string; // Additional classes for the inner content container
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  full: "max-w-full",
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  children,
  size = "md",
  maxWidth,
  padding = "p-6",
  maxHeight = "max-h-[90vh]",
  zIndex = "z-[200]",
  backdropOpacity = "bg-black/60",
  closeOnBackdropClick = true,
  disableBackdropClick = false,
  className,
  containerClassName,
}) => {
  if (!isOpen) return null;

  const modalWidthClass = maxWidth || sizeClasses[size];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      closeOnBackdropClick &&
      !disableBackdropClick &&
      e.target === e.currentTarget
    ) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 ${backdropOpacity} flex items-center justify-center ${zIndex}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-xl shadow-lg ${modalWidthClass} w-full mx-4 ${maxHeight} overflow-y-auto ${className || ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={containerClassName || padding}>{children}</div>
      </div>
    </div>
  );
};
