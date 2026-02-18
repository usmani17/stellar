import React, { useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import StellarMarkDown from "./StellarMarkDown";

interface ThoughtsSectionProps {
  content: string;
  defaultExpanded?: boolean;
}

export const ThoughtsSection: React.FC<ThoughtsSectionProps> = ({
  content,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!content?.trim()) return null;

  return (
    <div
      className="assistant-thoughts-section"
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
