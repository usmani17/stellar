import React from "react";
import { Button } from "./Button";

interface ErrorDetail {
  entity?: string;
  type?: string;
  policy_name?: string;
  policy_description?: string;
  violating_text?: string;
  error_code?: string;
  message?: string;
  is_exemptible?: boolean;
  user_message?: string;
}

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  isSuccess?: boolean;
  errorDetails?: ErrorDetail[];
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
  errorDetails,
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
      <div
        className={`relative bg-white rounded-xl shadow-2xl ${
          errorDetails && errorDetails.length > 0 ? "max-w-2xl" : "max-w-md"
        } w-full mx-4 border border-[#E8E8E3]`}
      >
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
          <div className="mb-4">
            <h3 className="text-[20px] font-semibold text-[#072929] mb-3 text-center">
              {title}
            </h3>

            {/* Summary Message */}
            {message && (
              <div className="mb-4">
                <p className="text-[14px] text-[#556179] whitespace-pre-wrap break-words text-center">
                  {message}
                </p>
              </div>
            )}

            {/* Error Details Table */}
            {errorDetails && errorDetails.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto border border-[#e8e8e3] rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-[#f5f5f0] sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-[12px] font-semibold text-[#29303f] border-b border-[#e8e8e3]">
                        Entity
                      </th>
                      <th className="py-2 px-3 text-[12px] font-semibold text-[#29303f] border-b border-[#e8e8e3]">
                        Policy/Error
                      </th>
                      <th className="py-2 px-3 text-[12px] font-semibold text-[#29303f] border-b border-[#e8e8e3]">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorDetails.map((error, index) => (
                      <tr
                        key={index}
                        className={
                          index !== errorDetails.length - 1
                            ? "border-b border-[#e8e8e3]"
                            : ""
                        }
                      >
                        <td className="py-2 px-3 text-[13px] text-[#0b0f16]">
                          {error.entity || "—"}
                        </td>
                        <td className="py-2 px-3 text-[13px] text-[#0b0f16]">
                          {error.policy_name || error.error_code || "Error"}
                        </td>
                        <td className="py-2 px-3 text-[13px] text-[#0b0f16]">
                          <div className="space-y-1">
                            {error.violating_text && (
                              <div>
                                <span className="font-medium">
                                  Violating text:
                                </span>{" "}
                                "{error.violating_text}"
                              </div>
                            )}
                            {error.policy_description && (
                              <div className="text-[12px] text-[#556179]">
                                {error.policy_description}
                              </div>
                            )}
                            {error.message && !error.policy_description && (
                              <div className="text-[12px] text-[#556179]">
                                {error.message}
                              </div>
                            )}
                            {error.is_exemptible && (
                              <div className="text-[11px] text-blue-600 italic">
                                (This violation may be exemptible)
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
