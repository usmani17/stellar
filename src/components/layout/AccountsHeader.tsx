import React from "react";
import { AssistantTrigger } from "../ai/AssistantTrigger";

export const AccountsHeader: React.FC = () => {
  return (
    <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center justify-between px-7">
      {/* Left: reserved for future breadcrumbs / title if needed */}
      <div className="flex items-center gap-6" />
      {/* Right: Assistant trigger */}
      <div className="flex items-center gap-4">
        <AssistantTrigger />
      </div>
    </div>
  );
};
