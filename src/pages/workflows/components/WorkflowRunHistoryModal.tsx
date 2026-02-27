import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BaseModal } from "../../../components/ui";
import {
  History,
  X,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import type { Workflow, WorkflowRun } from "../../../services/workflows";
import { useWorkflowRuns } from "../hooks/useWorkflowRuns";
import { queryKeys } from "../../../hooks/queries/queryKeys";
import { useSessionHistory } from "../hooks/useSessionHistory";
import { formatDateInTimezone } from "../utils/scheduleUtils";
import { Loader } from "../../../components/ui";
import { MessageContent } from "../../../components/ai/MessageContent";
import { ContentWithCharts } from "../../../components/ai/ContentWithCharts";
import { AssistantActivityBlock } from "../../../components/ai/AssistantActivityBlock";
import {
  isEventStream,
  extractDisplayContentFromEvents,
  eventsToTimeline,
} from "../../../utils/chartJsonParser";
import type { PixisTimelineItem } from "../../../services/ai/pixisChat";
interface SessionHistoryTurn {
  id: string;
  user_query?: string;
  final_message?: string;
}

interface WorkflowRunHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow | null;
}

const RUNS_PER_PAGE = 10;

const statusConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string; label: string }
> = {
  success: { icon: CheckCircle, className: "text-forest-f40", label: "Success" },
  failed: { icon: XCircle, className: "text-red-r30", label: "Failed" },
  skipped: { icon: MinusCircle, className: "text-forest-f30", label: "Skipped" },
  in_progress: { icon: MinusCircle, className: "text-forest-f30", label: "In progress" },
};

function historyToMessages(history: SessionHistoryTurn[]) {
  const msgs: Array<
    | { type: "human"; id: string; content: string }
    | { type: "ai"; id: string; content: string; timeline: PixisTimelineItem[]; isStreaming: false }
  > = [];
  for (const turn of history) {
    if (turn.user_query) {
      msgs.push({ type: "human", id: `h-${turn.id}`, content: turn.user_query });
    }
    if (turn.final_message) {
      const isEvents = isEventStream(turn.final_message);
      let displayContent: string;
      let timeline: PixisTimelineItem[];
      if (isEvents) {
        const events = JSON.parse(turn.final_message) as unknown[];
        displayContent = extractDisplayContentFromEvents(events);
        timeline = eventsToTimeline(events) as PixisTimelineItem[];
      } else {
        displayContent = turn.final_message;
        timeline = [{ type: "text", content: displayContent }];
      }
      msgs.push({
        type: "ai",
        id: `a-${turn.id}`,
        content: displayContent,
        timeline,
        isStreaming: false,
      });
    }
  }
  return msgs;
}

interface RunDetailContentProps {
  run: WorkflowRun;
  workflow: Workflow;
}

const RunDetailContent: React.FC<RunDetailContentProps> = ({ run, workflow }) => {
  const sessionId = run.sessionId;
  const {
    data: history = [],
    isLoading: isLoadingHistory,
    isError: isHistoryError,
  } = useSessionHistory(sessionId, !!sessionId);
  const messages = useMemo(() => historyToMessages(history), [history]);

  return (
    <div className="px-4 pb-4 pt-0 border-t border-sandstorm-s40 bg-white">
      <div className="space-y-4 mt-3">
        {/* Assistant activity and response - only show when we have messages */}
        {sessionId && !isHistoryError && !isLoadingHistory && messages.length > 0 && (
        <div>
          <div className="space-y-3">
              {messages.map((msg) => {
                if (msg.type === "human") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="min-w-0 max-w-[85%] rounded-xl p-3 bg-sandstorm-s40 border border-sandstorm-s50 shadow-sm">
                        <div className="text-sm text-forest-f60 font-normal">
                          <MessageContent content={msg.content} />
                        </div>
                      </div>
                    </div>
                  );
                }
                if (msg.type === "ai") {
                  const { content, timeline } = msg;
                  const sortedTimeline = [...timeline].sort((a, b) => {
                    const tsA =
                      "timestamp_ms" in a && typeof a.timestamp_ms === "number"
                        ? a.timestamp_ms
                        : Number.MAX_SAFE_INTEGER;
                    const tsB =
                      "timestamp_ms" in b && typeof b.timestamp_ms === "number"
                        ? b.timestamp_ms
                        : Number.MAX_SAFE_INTEGER;
                    return tsA - tsB;
                  });
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="min-w-0 max-w-[85%] rounded-xl p-4 bg-sandstorm-s5 border border-sandstorm-s40 shadow-sm flex flex-col gap-3">
                        {(() => {
                          const activityItems = sortedTimeline.filter(
                            (
                              i
                            ): i is PixisTimelineItem & {
                              type: "thinking" | "tool_call";
                            } =>
                              (i.type === "thinking" &&
                                !!i.content?.trim()) ||
                              i.type === "tool_call"
                          );
                          return activityItems.length > 0 ? (
                            <AssistantActivityBlock
                              items={activityItems}
                              defaultThoughtsExpanded
                            />
                          ) : null;
                        })()}
                        {sortedTimeline.map((item, idx) => {
                          if (item.type === "text" && item.content) {
                            return (
                              <div key={`txt-${idx}`} className="w-full">
                                <ContentWithCharts
                                  content={item.content}
                                  type="ai"
                                />
                              </div>
                            );
                          }
                          return null;
                        })}
                        {timeline.length === 0 && content && (
                          <div className="w-full">
                            <ContentWithCharts content={content} type="ai" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
        </div>
        )}

        {/* Generated Report */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-forest-f40" />
            <h4 className="text-xs font-medium text-forest-f60 uppercase tracking-wider">
              Generated Report
            </h4>
          </div>
          <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-12 rounded flex items-center justify-center shrink-0 text-xs font-bold",
                  workflow.format === "pdf"
                    ? "bg-red-r0 text-red-r30"
                    : "border border-sandstorm-s60 text-forest-f60"
                )}
              >
                {workflow.format.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forest-f60">
                  {workflow.channelName || "All Channels"} —{" "}
                  {workflow.profileName || "All Profiles"} Report
                </p>
                <p className="text-xs text-forest-f30 mt-1">
                  {run.status === "success" && run.outputUrl
                    ? "Report generated. Download available."
                    : "Report generation completed."}
                </p>
                {run.outputUrl && run.status === "success" && (
                  <a
                    href={run.outputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-3 py-1.5 rounded bg-forest-f40 text-white text-xs font-medium hover:bg-forest-f50"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorkflowRunHistoryModal: React.FC<WorkflowRunHistoryModalProps> = ({
  isOpen,
  onClose,
  workflow,
}) => {
  const queryClient = useQueryClient();
  const { data: runs = [], isLoading } = useWorkflowRuns(
    workflow?.accountId,
    workflow?.id
  );
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isOpen && workflow?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.runs(workflow.id) });
    }
  }, [isOpen, workflow?.id, queryClient]);

  const totalPages = Math.max(1, Math.ceil(runs.length / RUNS_PER_PAGE));
  const paginatedRuns = useMemo(() => {
    const start = (page - 1) * RUNS_PER_PAGE;
    return runs.slice(start, start + RUNS_PER_PAGE);
  }, [runs, page]);

  useEffect(() => {
    if (!isOpen) {
      setExpandedRunId(null);
      setPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      maxWidth="max-w-xl"
      maxHeight="max-h-[85vh]"
      className="min-h-[50vh]"
      padding="p-0"
      containerClassName=""
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sandstorm-s40">
          <div className="min-w-0">
            <h2 className="text-base font-agrandir font-medium text-forest-f60">
              Run History
            </h2>
            {workflow && (
              <p className="text-xs text-forest-f30 mt-0.5 truncate">
                {workflow.name || "Untitled workflow"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sandstorm-s10 text-forest-f30 transition-colors shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="md" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex items-center gap-3 py-3 px-4 rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 text-forest-f30 text-sm">
              <History className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium text-forest-f60">No runs yet</p>
                <p className="text-xs mt-0.5">
                  Runs will appear here after the first execution.
                </p>
              </div>
            </div>
          ) : (
            <>
            <ul className="space-y-2">
              {paginatedRuns.map((run) => {
                const config = statusConfig[run.status];
                const Icon = config?.icon ?? MinusCircle;
                const isExpanded = expandedRunId === run.id;
                return (
                  <li
                    key={run.id}
                    className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRunId(isExpanded ? null : run.id)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sandstorm-s10 transition-colors"
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 ${config?.className ?? "text-forest-f30"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-forest-f60 font-medium">
                          {workflow
                            ? formatDateInTimezone(
                                run.ranAt,
                                workflow.schedule?.timezone ?? ""
                              )
                            : new Date(run.ranAt).toLocaleString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                        </p>
                        <p className="text-xs text-forest-f30 capitalize">
                          {config?.label ?? run.status}
                        </p>
                      </div>
                      {run.outputUrl && run.status === "success" && (
                        <a
                          href={run.outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-forest-f40 hover:underline shrink-0"
                        >
                          Download
                        </a>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-forest-f30 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-forest-f30 shrink-0" />
                      )}
                    </button>
                    {isExpanded && workflow && (
                      <RunDetailContent
                        run={run}
                        workflow={workflow}
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {runs.length > RUNS_PER_PAGE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-sandstorm-s40">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-forest-f60 hover:bg-sandstorm-s10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-forest-f30">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-forest-f60 hover:bg-sandstorm-s10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
