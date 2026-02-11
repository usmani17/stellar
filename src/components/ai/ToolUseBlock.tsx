import React, { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { getDisplayName } from "../../utils/assistantDisplayNames";

const ToolUseBlock: React.FC<{ block: { name?: string; input?: unknown } }> = ({ block }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayName = getDisplayName(block.name ?? "", "tool");

  return (
    <div className="bg-[#F9F9F6] border border-[#E8E8E3] rounded-lg p-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Check className="w-4 h-4 text-[#136D6D] shrink-0" />
          <span className="text-sm font-medium text-[#072929] truncate">
            Ran {displayName}
          </span>
        </div>
        <span className="text-[#556179] shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-[#E8E8E3]">
          <pre className="text-xs bg-white p-2 rounded border border-[#E8E8E3] overflow-x-auto text-[#072929]">
            {JSON.stringify(block.input ?? {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ToolUseBlock;
