import React from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import StellarMarkDown from "./StellarMarkDown";
import { ToolCallRow } from "./ToolCallRow";
import { SubagentPanel } from "./SubagentPanel";
import type { PixisTimelineItem } from "../../services/ai/pixisChat";

interface AssistantActivityBlockProps {
  items: PixisTimelineItem[];
  defaultThoughtsExpanded?: boolean;
  placeholder?: React.ReactNode;
  workingOnRequest?: boolean;
}

const ACTIVITY_TYPES = new Set(["thinking", "tool_call", "subagent"]);

export const AssistantActivityBlock: React.FC<AssistantActivityBlockProps> = ({
  items,
  defaultThoughtsExpanded = true,
  placeholder,
  workingOnRequest = false,
}) => {
  const activityItems = items.filter((i) => {
    if (i.type === "thinking") return !!i.content?.trim();
    return ACTIVITY_TYPES.has(i.type);
  });

  if (activityItems.length === 0 && !placeholder) return null;

  return (
    <div className="assistant-activity-block">
      <div className="assistant-activity-block-scroll interactive-scrollbar">
        {placeholder && activityItems.length === 0 ? (
          <div className="assistant-activity-block-placeholder">{placeholder}</div>
        ) : (
          <div className="assistant-activity-block-content">
            {activityItems.map((item, idx) => {
              if (item.type === "thinking" && item.content?.trim()) {
                return (
                  <ThoughtsRow
                    key={`t-${idx}`}
                    content={item.content}
                    defaultExpanded={defaultThoughtsExpanded}
                  />
                );
              }
              if (item.type === "tool_call") {
                return (
                  <ToolCallRow
                    key={item.call_id ?? `tc-${idx}`}
                    label={item.label}
                    status={item.status}
                  />
                );
              }
              if (item.type === "subagent") {
                return (
                  <SubagentPanel
                    key={item.call_id}
                    callId={item.call_id}
                    description={item.description}
                    subagentType={item.subagentType}
                    status={item.status}
                    steps={item.steps}
                    durationMs={item.durationMs}
                  />
                );
              }
              return null;
            })}
            {workingOnRequest && activityItems.length > 0 && (
              <div className="assistant-working-indicator text-[11px] text-forest-f30 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-forest-f40 rounded-full animate-pulse" aria-hidden />
                <span>Working on request...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ThoughtsRowProps {
  content: string;
  defaultExpanded?: boolean;
}

const ThoughtsRow: React.FC<ThoughtsRowProps> = ({
  content,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div
      className="assistant-thoughts-section assistant-activity-thought"
      data-collapsed={!expanded}
    >
      <button
        type="button"
        className="assistant-thoughts-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="assistant-thoughts-body"
      >
        <span className="assistant-thoughts-header-icon" aria-hidden>
          <Lightbulb className="w-3.5 h-3.5" />
        </span>
        <span className="assistant-thoughts-header-title text-[11px]">Thoughts</span>
        <ChevronDown className="assistant-thoughts-header-chevron" aria-hidden />
      </button>
      <div
        id="assistant-thoughts-body"
        className="assistant-thoughts-body"
        role="region"
        aria-label="AI reasoning"
      >
        <div className="assistant-thoughts-content text-[11px]">
          <StellarMarkDown content={content} type="ai" />
        </div>
      </div>
    </div>
  );
};
