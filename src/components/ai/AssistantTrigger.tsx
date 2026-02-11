import React from "react";
import { useAssistant } from "../../contexts/AssistantContext";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";

// Trigger button to toggle Assistant panel
export const AssistantTrigger: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { toggleAssistant, isOpen } = useAssistant();

  return (
    <button
      onClick={toggleAssistant}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isOpen
          ? "bg-[#136D6D] text-white"
          : "text-gray-600 hover:bg-gray-100"
        } ${className}`}
    >
      <img
        src={StellarLogo}
        alt="Assistant"
        className="h-5 w-5"
        style={{ filter: isOpen ? "brightness(0) invert(1)" : "none" }}
      />
      <span>Assistant</span>
    </button>
  );
};
