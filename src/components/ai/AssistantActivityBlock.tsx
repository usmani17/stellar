import React from "react";
import { Lightbulb, ChevronDown, Check } from "lucide-react";
import StellarMarkDown from "./StellarMarkDown";
import type { PixisTimelineItem } from "../../services/ai/pixisChat";

interface AssistantActivityBlockProps {
  /** Timeline items: thinking and tool_call only. Preserves order. */
  items: PixisTimelineItem[];
  defaultThoughtsExpanded?: boolean;
  /** Optional placeholder when streaming but no items yet */
  placeholder?: React.ReactNode;
}

/** Quote-like scrollable block showing all thoughts and ran tools. */
export const AssistantActivityBlock: React.FC<AssistantActivityBlockProps> = ({
  items,
  defaultThoughtsExpanded = true,
  placeholder,
}) => {
  const activityItems = items.filter(
    (i): i is PixisTimelineItem & { type: "thinking" | "tool_call" } =>
      i.type === "thinking" || i.type === "tool_call"
  );

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
                  <div key={`tc-${idx}`} className="assistant-ran-tool-badge">
                    <span className="assistant-ran-tool-check" aria-hidden>
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                    <span className="assistant-ran-tool-label">
                      Ran &quot;{item.label}&quot;
                    </span>
                  </div>
                );
              }
              return null;
            })}
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
          <Lightbulb className="w-4 h-4" />
        </span>
        <span className="assistant-thoughts-header-title">Thoughts</span>
        <ChevronDown className="assistant-thoughts-header-chevron" aria-hidden />
      </button>
      <div
        id="assistant-thoughts-body"
        className="assistant-thoughts-body"
        role="region"
        aria-label="AI reasoning"
      >
        <div className="assistant-thoughts-content">
          <StellarMarkDown content={content} type="ai" />
        </div>
      </div>
    </div>
  );
};
