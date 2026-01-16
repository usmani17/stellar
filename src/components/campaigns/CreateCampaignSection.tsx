import React from "react";

interface CreateCampaignSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const CreateCampaignSection: React.FC<CreateCampaignSectionProps> = ({
  isOpen,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className="create-entity-button"
    >
      <span className="text-[10.64px] text-white font-normal">
        Create Campaign
      </span>
      <svg
        className={`w-5 h-5 text-white transition-transform ${
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
