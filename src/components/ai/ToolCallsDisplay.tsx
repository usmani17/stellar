/**
 * Rich tool call display for AI chat - inspired by agent-chat-ui.
 * Shows tool name, id, and args in a table. Expandable for large payloads.
 */
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { getDisplayName } from "../../utils/assistantDisplayNames";
const isLocal = import.meta.env.VITE_ENVIRONMENT === "local";


export interface ToolCallItem {
  id?: string;
  name: string;
  args?: Record<string, unknown>;
}

interface ToolCallsDisplayProps {
  toolCalls: ToolCallItem[];
  /** When true, show in compact collapsed style (e.g. "Ran X" with expand) */
  compact?: boolean;
}

export const ToolCallsDisplay: React.FC<ToolCallsDisplayProps> = ({
  toolCalls,
  compact = false,
}) => {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl">
      {toolCalls.map((tc, idx) => (
        <ToolCallCard
          key={tc.id ?? `tc-${idx}`}
          toolCall={tc}
          compact={compact}
        />
      ))}
    </div>
  );
};

function ToolCallCard({
  toolCall,
  compact,
}: {
  toolCall: ToolCallItem;
  compact: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const args = (toolCall.args ?? {}) as Record<string, unknown>;
  const hasArgs = Object.keys(args).length > 0;
  const displayName = getDisplayName(toolCall.name, "tool");
  return (
    <div className="rounded-lg border border-[#E8E8E3] bg-[#F9F9F6] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left gap-2 px-3 py-2 hover:bg-[#f0f0ed] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="w-4 h-4 text-[#136D6D] shrink-0" />
          <span className="text-sm font-medium text-[#072929] truncate">
            {displayName}
          </span>
        </div>
        {isLocal && (
          <span className="text-[#556179] shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
      </button>
      {isExpanded && isLocal && hasArgs && (
        <div className="border-t border-[#E8E8E3] p-3 bg-white">
          <pre className="text-xs text-[#072929] overflow-x-auto font-mono whitespace-pre-wrap">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

}
