import React from "react";

export type ConfirmationModalType = "danger" | "warning" | "info" | "success";
export type ConfirmationModalSize = "sm" | "md" | "lg";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  description?: string;
  warningText?: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  type?: ConfirmationModalType;
  size?: ConfirmationModalSize;
  isLoading?: boolean;
  isDangerous?: boolean; // If true, applies red styling (useful for delete/destructive actions)
  children?: React.ReactNode; // Custom content for the modal body
  confirmButtonClassName?: string; // Override confirm button styling
  icon?: React.ReactNode; // Custom icon/element to display
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  warningText,
  confirmButtonLabel = "Confirm",
  cancelButtonLabel = "Cancel",
  type = "info",
  size = "md",
  isLoading = false,
  isDangerous = false,
  children,
  confirmButtonClassName,
  icon,
}) => {
  if (!isOpen) return null;

  // Determine colors based on type and isDangerous
  const getTypeStyles = () => {
    if (isDangerous) {
      return {
        warningBg: "bg-red-50",
        warningBorder: "border-red-200",
        warningText: "text-red-800",
        buttonBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500 border-red-600",
      };
    }

    switch (type) {
      case "danger":
        return {
          warningBg: "bg-red-50",
          warningBorder: "border-red-200",
          warningText: "text-red-800",
          buttonBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500 border-red-600",
        };
      case "warning":
        return {
          warningBg: "bg-yellow-50",
          warningBorder: "border-yellow-200",
          warningText: "text-yellow-800",
          buttonBg: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 border-yellow-600",
        };
      case "success":
        return {
          warningBg: "bg-green-50",
          warningBorder: "border-green-200",
          warningText: "text-green-800",
          buttonBg: "bg-green-600 hover:bg-green-700 focus:ring-green-500 border-green-600",
        };
      case "info":
      default:
        return {
          warningBg: "bg-blue-50",
          warningBorder: "border-blue-200",
          warningText: "text-blue-800",
          buttonBg: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border-blue-600",
        };
    }
  };

  const typeStyles = getTypeStyles();

  // Determine modal width - use max-w-4xl for default, but allow size override
  const modalWidthClass = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-lg" : "max-w-4xl";

  // Determine confirm button color based on type
  const getConfirmButtonColor = () => {
    if (confirmButtonClassName) return "";
    if (isDangerous || type === "danger") {
      return "bg-red-600 hover:bg-red-700";
    }
    if (type === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }
    if (type === "success") {
      return "bg-green-600 hover:bg-green-700";
    }
    // Default for info or no type specified
    return "bg-[#136D6D] hover:bg-[#0f5a5a]";
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className={`bg-white rounded-xl shadow-lg ${modalWidthClass} w-full mx-4 p-6 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        {icon ? (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0">{icon}</div>
              <h3 className="text-[17.1px] font-semibold text-[#072929]">
                {title}
              </h3>
            </div>
            {(message || description) && (
              <p className="text-[14px] text-[#556179]">
                {message || description}
              </p>
            )}
          </div>
        ) : (
          <>
            <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
              {title}
            </h3>
            {(message || description) && (
              <p className="text-[14px] text-[#556179] mb-4">
                {message || description}
              </p>
            )}
          </>
        )}

        {/* Warning/Info Message */}
        {warningText && (
          <div
            className={`mb-6 p-4 ${typeStyles.warningBg} border ${typeStyles.warningBorder} rounded-lg`}
          >
            <p className={`text-[14px] ${typeStyles.warningText}`}>
              {warningText}
            </p>
          </div>
        )}

        {/* Custom Content */}
        {children && <div className="mb-6">{children}</div>}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-[12.16px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelButtonLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-[12.16px] text-white rounded-lg disabled:opacity-50 ${
              confirmButtonClassName || getConfirmButtonColor()
            }`}
          >
            {isLoading ? "Saving..." : confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
