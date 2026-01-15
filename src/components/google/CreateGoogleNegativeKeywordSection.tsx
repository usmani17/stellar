import React from "react";
import { Button } from "../ui/Button";

interface CreateGoogleNegativeKeywordSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  onCreateClick: () => void;
  loading?: boolean;
}

export const CreateGoogleNegativeKeywordSection: React.FC<CreateGoogleNegativeKeywordSectionProps> = ({
  isOpen,
  onToggle,
  onCreateClick,
  loading = false,
}) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium"
      >
        <span>Create Negative Keywords</span>
        <span className="text-gray-400">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          <p className="text-gray-600 text-sm mb-4">
            Add negative keywords to exclude certain search terms from triggering your ads.
          </p>
          <Button onClick={onCreateClick} variant="primary" disabled={loading}>
            {loading ? "Creating..." : "Create Negative Keywords"}
          </Button>
        </div>
      )}
    </div>
  );
};
