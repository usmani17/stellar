import React from "react";
import { ConfirmationModal } from "./ConfirmationModal";

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
  const getWarningText = () => {
    if (itemType === "account") {
      return "All associated channels and their data will be permanently removed. This action cannot be undone.";
    }
    return "This action cannot be undone. All data associated with this channel will be permanently removed.";
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={`Are you sure you want to delete "${itemName}"?`}
      warningText={getWarningText()}
      confirmButtonLabel="Delete"
      cancelButtonLabel="Cancel"
      type="danger"
      isLoading={isLoading}
    />
  );
};
