import React from "react";

interface CreateAdGroupSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const CreateAdGroupSection: React.FC<CreateAdGroupSectionProps> = ({
  isOpen,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="create-entity-button"
      disabled={disabled}
      title={
        disabled
          ? "Ad groups cannot be created when the campaign is archived"
          : undefined
      }
    >
      <span className="text-[10.64px] text-white font-normal">
        Create Ad Group
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
