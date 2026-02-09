import React from "react";

interface CreateGoogleAdSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const CreateGoogleAdSection: React.FC<
  CreateGoogleAdSectionProps
> = ({ isOpen, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="create-entity-button"
    >
      {/* <svg
        className="w-5 h-5 !text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg> */}
      <span className="text-[10.64px] text-white font-normal">
        Create Ad
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

