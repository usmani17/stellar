import React from "react";
import { Button } from "./Button";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  isSuccess?: boolean;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = "Error",
  message,
  isSuccess = false,
  actionButton,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSuccess ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {isSuccess ? (
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Header */}
          <div className="mb-4 text-center">
            <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
              {title}
            </h3>
            <div className="max-h-[200px] overflow-y-auto">
              <p className="text-[14px] text-[#556179] whitespace-pre-wrap break-words">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div
            className={`flex items-center justify-center mt-6 gap-3 ${
              actionButton ? "flex-row" : ""
            }`}
          >
            {actionButton && (
              <Button
                onClick={actionButton.onClick}
                variant="primary"
                size="md"
                className="min-w-[120px] rounded-lg justify-center"
              >
                {actionButton.text}
              </Button>
            )}
            <Button
              onClick={onClose}
              variant={actionButton ? "secondary" : "primary"}
              size="md"
              className="min-w-[120px] rounded-lg justify-center"
            >
              {actionButton ? "Close" : "OK"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
