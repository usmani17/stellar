import React from "react";
import { Button } from "./Button";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: "account" | "channel";
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<
  DeleteConfirmationModalProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getWarningText = () => {
    if (itemType === "account") {
      return "All associated channels and their data will be permanently removed. This action cannot be undone.";
    }
    return "This action cannot be undone. All data associated with this channel will be permanently removed.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Light Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900 bg-opacity-20 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-[20px] font-semibold text-[#072929] mb-2">
              {title}
            </h3>
            <p className="text-[14px] text-[#556179]">
              Are you sure you want to delete{" "}
              <span className="font-medium text-[#313850]">"{itemName}"</span>?
            </p>
          </div>

          {/* Warning Message */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-[14px] text-red-800">{getWarningText()}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              variant="primary"
              size="sm"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-red-600 rounded-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
