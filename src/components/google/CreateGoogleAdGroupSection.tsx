import React from "react";

interface CreateGoogleAdGroupSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const CreateGoogleAdGroupSection: React.FC<
  CreateGoogleAdGroupSectionProps
> = ({ isOpen, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] hover:!text-white transition-colors"
    >
      <svg
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
      </svg>
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

