import React, { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { BaseModal, Alert } from "../../../components/ui";
import { FileText, MessageSquare, X, Download, Loader2 } from "lucide-react";
import { StellarMarkDown } from "../../../components/ai/StellarMarkDown";
import { workflowsService } from "../../../services/workflows";
import type {
  WorkflowExecutePayload,
  WorkflowExecuteResponse,
} from "../../../services/workflows";

type TimelineItem =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; label: string }
  | { type: "assistant"; content: string };

function extractAssistantText(ev: Record<string, unknown>): string {
  try {
    const msg = ev.message as { content?: Array<{ text?: string }> } | undefined;
    const parts = msg?.content ?? [];
    if (parts[0] && typeof parts[0] === "object" && "text" in parts[0])
      return String(parts[0].text ?? "");
  } catch {
    // ignore
  }
  return "";
}

function getToolCallLabel(ev: Record<string, unknown>): string {
  const tc = ev.tool_call as Record<string, unknown> | undefined;
  if (!tc) return "Processing...";
  if (tc.shellToolCall) return "Running analysis...";
  if (tc.readToolCall) return "Reading data...";
  if (tc.writeToolCall) return "Writing output...";
  return "Processing...";
}

interface WorkflowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** User's prompt for the workflow */
  prompt: string;
  format: "pdf" | "docx";
  integrationName?: string;
  profileName?: string;
  /** When provided, enables Generate Preview. Required for execution. */
  accountId?: number;
  /** Execute payload for API call. Required when accountId is set. */
  executePayload?: WorkflowExecutePayload | null;
  workflowId?: number | null;
}

export const WorkflowPreviewModal: React.FC<WorkflowPreviewModalProps> = ({
  isOpen,
  onClose,
  prompt,
  format,
  integrationName = "All Channels",
  profileName = "All Profiles",
  accountId,
  executePayload,
  workflowId,
}) => {
  const [result, setResult] = useState<WorkflowExecuteResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [timeline]);

  const handleStreamEvent = useCallback((ev: Record<string, unknown>) => {
    if (ev.type === "thinking") {
      const text = (ev.text as string) || "";
      if (text.trim())
        setTimeline((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type === "thinking")
            return [...prev.slice(0, -1), { type: "thinking" as const, content: last.content + text }];
          return [...prev, { type: "thinking", content: text }];
        });
    } else if (ev.type === "tool_call") {
      const label = getToolCallLabel(ev);
      setTimeline((prev) => [...prev, { type: "tool_call", label }]);
    } else if (ev.type === "assistant") {
      const text = extractAssistantText(ev);
      if (text)
        setTimeline((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type === "assistant" && text.startsWith(last.content))
            return [...prev.slice(0, -1), { type: "assistant", content: text }];
          if (last?.type === "assistant" && last.content.startsWith(text)) return prev;
          if (last?.type === "assistant" && text.length > last.content.length)
            return [...prev.slice(0, -1), { type: "assistant", content: text }];
          return [...prev, { type: "assistant", content: text }];
        });
    }
  }, []);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!accountId || !executePayload)
        throw new Error("Account and payload required for preview");
      setTimeline([{ type: "tool_call", label: "Starting..." }]);
      return workflowsService.executeWorkflow(
        accountId,
        { ...executePayload, workflowId: workflowId ?? undefined },
        "preview",
        { onEvent: handleStreamEvent }
      );
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const canExecute = Boolean(accountId && executePayload);
  const isExecuting = previewMutation.isPending;
  const lastError =
    previewMutation.error instanceof Error ? previewMutation.error.message : null;

  const handleClose = () => {
    setResult(null);
    setTimeline([]);
    previewMutation.reset();
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      maxWidth="max-w-2xl"
      maxHeight="max-h-[85vh]"
      zIndex="z-[210]"
      padding="p-0"
      containerClassName=""
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
          <h2 className="text-lg font-agrandir font-medium text-forest-f60">
            Workflow Preview
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-sandstorm-s10 text-forest-f30 transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Intro text */}
          {canExecute && !isExecuting && !result && (
            <p className="text-sm text-forest-f30">
              Generate a sample {format.toUpperCase()} report from your prompt
              using the agent.
            </p>
          )}
          {!canExecute && (
            <p className="text-sm text-forest-f30">
              Select a brand and configure your workflow to enable preview.
            </p>
          )}

          {/* User prompt — label above, prompt below, aligned left */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-forest-f40" />
              <h3 className="text-sm font-medium text-forest-f60">Your prompt</h3>
            </div>
            <div className="rounded-xl border border-sandstorm-s40 bg-sandstorm-s5 px-4 py-3 text-sm text-forest-f60 shadow-sm [&_a]:text-forest-f40 [&_a]:underline">
              <div className="[&_p]:mb-1 [&_p:last-child]:mb-0">
                <StellarMarkDown
                  content={prompt || "Generate a performance report..."}
                  type="human"
                />
              </div>
            </div>
          </div>

          {/* Generate Preview Report — primary CTA, centered */}
          {canExecute && !result && (
            <div className="flex justify-center">
              <button
                onClick={() => previewMutation.mutate()}
                disabled={isExecuting}
                className="create-entity-button inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-sm font-medium"
              >
                <FileText className="w-5 h-5" />
                <span>Generate Preview Report</span>
              </button>
            </div>
          )}

          {/* Assistant messages — scrollable, appends as they arrive */}
          {isExecuting && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-forest-f40" />
                <h3 className="text-sm font-medium text-forest-f60">
                  Assistant
                </h3>
              </div>
              <div
                ref={scrollRef}
                className="max-h-[280px] overflow-y-auto rounded-xl border border-sandstorm-s40 bg-sandstorm-s5 p-4 space-y-3 shadow-sm"
              >
                {timeline.map((item, i) => (
                  <div key={i} className="flex justify-start">
                    {item.type === "thinking" && (
                      <div className="max-w-full rounded-lg px-3 py-2 text-xs text-forest-f30 bg-sandstorm-s10 border border-sandstorm-s30 italic">
                        {item.content}
                      </div>
                    )}
                    {item.type === "tool_call" && (
                      <div className="rounded-lg px-3 py-2 text-sm text-forest-f60 bg-sandstorm-s10 border border-sandstorm-s30">
                        {item.label}
                      </div>
                    )}
                    {item.type === "assistant" && (
                      <div className="max-w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-sandstorm-s40 text-forest-f60">
                        <div className="[&_p]:mb-1 [&_p:last-child]:mb-0">
                          <StellarMarkDown content={item.content} type="ai" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Single loading indicator at bottom while streaming */}
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-forest-f30">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Generating...</span>
                </div>
              </div>
              <p className="text-xs text-forest-f30 mt-2">
                This may take a few minutes. The agent is gathering data and
                generating your {format.toUpperCase()} report.
              </p>
            </div>
          )}

          {lastError && <Alert variant="error">{lastError}</Alert>}

          {/* Report result — only when we have the report */}
          {result?.url && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-forest-f40" />
              <h3 className="text-sm font-medium text-forest-f60">
                Generated Report
              </h3>
            </div>
            <div className="rounded-xl border border-sandstorm-s40 bg-sandstorm-s5 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-14 rounded flex items-center justify-center shrink-0 bg-forest-f40/10">
                  <span className="font-bold text-xs text-forest-f40">
                    {format.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-forest-f60">
                    {result.title ||
                      `${integrationName} — ${profileName} Report`}
                  </p>
                  <p className="text-xs text-forest-f30 mt-1">
                    {result.generated_at
                      ? `Generated ${new Date(result.generated_at).toLocaleString()}.`
                      : "Your report is ready."}
                  </p>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="create-entity-button inline-flex items-center gap-2 mt-3"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[10.64px]">Download report</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
