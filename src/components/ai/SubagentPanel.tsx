import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import type { SubagentStep } from "../../services/ai/pixisChat";
import { ToolCallRow } from "./ToolCallRow";
import StellarMarkDown from "./StellarMarkDown";

interface SubagentPanelProps {
  callId: string;
  description: string;
  subagentType?: string;
  status: "running" | "completed";
  steps?: SubagentStep[];
  durationMs?: number;
  startedAtMs?: number;
  defaultExpanded?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function useElapsedTimer(running: boolean, startedAtMs?: number): string {
  const [elapsed, setElapsed] = useState("");
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!running) { setElapsed(""); return; }
    const origin = startedAtMs ?? mountTimeRef.current;

    const tick = () => {
      const ms = Date.now() - origin;
      setElapsed(formatDuration(Math.max(0, ms)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, startedAtMs]);

  return elapsed;
}

export const SubagentPanel: React.FC<SubagentPanelProps> = ({
  description,
  subagentType,
  status,
  steps,
  durationMs,
  startedAtMs,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const elapsed = useElapsedTimer(status === "running", startedAtMs);

  const lastAssistantIdx = steps
    ? steps.reduce((acc, s, i) => (s.assistantMessage ? i : acc), -1)
    : -1;

  return (
    <div className={`activity-card subagent-panel ${status === "running" ? "is-running" : ""}`}>
      <button
        type="button"
        className="subagent-panel-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="subagent-type-badge">
            {subagentType ? `Subagent · ${subagentType}` : "Subagent"}
          </span>
          <span className="subagent-description">{description}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status === "running" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-forest-f40" />
              {elapsed && <span className="subagent-elapsed">{elapsed}</span>}
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-forest-f40" />
              {durationMs != null && (
                <span className="subagent-duration">
                  {formatDuration(durationMs)}
                </span>
              )}
            </>
          )}
          <ChevronDown
            className={`w-3 h-3 text-forest-f30 transition-transform duration-200 ${
              expanded ? "" : "-rotate-90"
            }`}
          />
        </div>
      </button>
      {expanded && steps && steps.length > 0 && (
        <div className="subagent-steps">
          {steps.map((step, i) => {
            if (step.toolCall) {
              return (
                <ToolCallRow
                  key={`tc-${i}`}
                  label={step.toolCall.label}
                  status="completed"
                />
              );
            }
            if (step.assistantMessage?.text) {
              const isLast = i === lastAssistantIdx;
              return (
                <div
                  key={`am-${i}`}
                  className={`subagent-message ${
                    isLast ? "subagent-message-final" : ""
                  }`}
                >
                  <StellarMarkDown
                    content={step.assistantMessage.text}
                    type="ai"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};
