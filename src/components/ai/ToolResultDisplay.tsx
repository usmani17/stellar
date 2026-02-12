/**
 * Tool result display - shows output from tool execution.
 * Inspired by agent-chat-ui ToolResult. Expandable for long content.
 */
import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

function isComplexValue(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

interface ToolResultDisplayProps {
  /** Tool name (if from tool message) */
  name?: string;
  /** Tool call ID (if available) */
  toolCallId?: string;
  /** Raw content - can be string or JSON string */
  content: unknown;
}

export const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({
  name,
  toolCallId,
  content,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let parsedContent: unknown;
  let isJsonContent = false;

  try {
    if (typeof content === "string") {
      parsedContent = JSON.parse(content) as unknown;
      isJsonContent = isComplexValue(parsedContent);
    } else {
      parsedContent = content;
      isJsonContent = isComplexValue(parsedContent);
    }
  } catch {
    parsedContent = content;
  }

  const contentStr = isJsonContent
    ? JSON.stringify(parsedContent, null, 2)
    : String(content);
  const contentLines = contentStr.split("\n");
  const shouldTruncate = contentLines.length > 6 || contentStr.length > 500;
  const displayedContent =
    shouldTruncate && !isExpanded
      ? contentStr.length > 500
        ? contentStr.slice(0, 500) + "..."
        : contentLines.slice(0, 6).join("\n") + "\n..."
      : contentStr;

  const entries: [string, unknown][] | null =
    isJsonContent && typeof parsedContent === "object" && parsedContent !== null
      ? Array.isArray(parsedContent)
        ? (parsedContent as unknown[]).map((item, i) => [String(i), item])
        : Object.entries(parsedContent as Record<string, unknown>)
      : null;

  const showAsTable = entries && entries.length > 0 && entries.length <= 20;
  const tableEntries = showAsTable ? (isExpanded ? entries : entries.slice(0, 5)) : [];

  return (
    <div className="rounded-lg border border-[#E8E8E3] bg-[#F9F9F6] overflow-hidden max-w-2xl">
      <div className="border-b border-[#E8E8E3] bg-[#f0f0ed] px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-medium text-[#072929] text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#136D6D] shrink-0" />
          {name ? (
            <>
              Result: <code className="rounded bg-[#E8E8E3] px-2 py-0.5 text-xs">{name}</code>
            </>
          ) : (
            "Tool Result"
          )}
        </h3>
        {toolCallId && (
          <code className="rounded bg-[#E8E8E3] px-2 py-0.5 text-xs font-mono">
            {toolCallId}
          </code>
        )}
      </div>
      <div className="p-3">
        {showAsTable ? (
          <div className="space-y-2">
            {tableEntries.map(([key, value], idx) => (
              <div key={idx} className="flex gap-2 text-sm">
                <span className="font-medium text-[#072929] shrink-0 min-w-[80px]">{key}:</span>
                <span className="text-[#556179] break-all">
                  {isComplexValue(value) ? (
                    <code className="rounded bg-[#E8E8E3] px-2 py-1 font-mono text-xs block">
                      {JSON.stringify(value, null, 2)}
                    </code>
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="text-xs text-[#072929] font-mono whitespace-pre-wrap break-words">
            {displayedContent}
          </pre>
        )}
        {(shouldTruncate || (showAsTable && entries.length > 5)) && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs text-[#556179] hover:text-[#072929] hover:bg-[#E8E8E3]/50 rounded transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
