import React, { useState } from "react";

// Component to render tool use blocks
const ToolUseBlock: React.FC<{ block: any }> = ({ block }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-20 border border-blue-200 rounded-lg p-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400">🔧 {block.name}</span>
        </div>
        <span className="text-xs text-gray-300">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <pre className="text-xs bg-white p-2 rounded border border-blue-100 overflow-x-auto">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ToolUseBlock;
