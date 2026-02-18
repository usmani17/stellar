import React from "react";
import { Check } from "lucide-react";

interface RanToolBadgesProps {
  tools: Array<{ label: string }>;
}

export const RanToolBadges: React.FC<RanToolBadgesProps> = ({ tools }) => {
  if (!tools?.length) return null;

  return (
    <div className="assistant-ran-tool-row">
      {tools.map((tool, idx) => (
        <div key={idx} className="assistant-ran-tool-badge">
          <span className="assistant-ran-tool-check" aria-hidden>
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </span>
          <span className="assistant-ran-tool-label">
            Ran &quot;{tool.label}&quot;
          </span>
        </div>
      ))}
    </div>
  );
};
