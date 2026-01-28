import React from "react";

interface CreateGoogleShoppingAdSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const CreateGoogleShoppingAdSection: React.FC<
  CreateGoogleShoppingAdSectionProps
> = ({ isOpen, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="create-entity-button"
    >
      <span className="text-[10.64px] text-white font-normal">
        Create Shopping Ad
      </span>
      <svg
        className={`w-4 h-4 !text-white transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
};
