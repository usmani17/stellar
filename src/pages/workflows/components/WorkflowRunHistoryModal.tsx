import React, { useState, useEffect, useMemo } from "react";
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
  MessageSquare,
  FileText,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import type { Workflow, WorkflowRun } from "../../../services/workflows";
import { useWorkflowRuns } from "../hooks/useWorkflowRuns";
import { Loader } from "../../../components/ui";

interface WorkflowRunHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow | null;
}

const DUMMY_ASSISTANT_MESSAGES = [
  { role: "assistant" as const, content: "Fetching performance data from your connected account...", time: "9:00 AM" },
  { role: "assistant" as const, content: "Data fetched. Analyzing metrics and building the report structure.", time: "9:01 AM" },
  { role: "assistant" as const, content: "Report generated successfully. Your report is ready for download.", time: "9:02 AM" },
];

const RUNS_PER_PAGE = 10;

const statusConfig = {
  success: { icon: CheckCircle, className: "text-forest-f40", label: "Success" },
  failed: { icon: XCircle, className: "text-red-r30", label: "Failed" },
  skipped: { icon: MinusCircle, className: "text-forest-f30", label: "Skipped" },
};

interface RunDetailContentProps {
  run: WorkflowRun;
  workflow: Workflow;
}

const RunDetailContent: React.FC<RunDetailContentProps> = ({
  run,
  workflow,
}) => {
  const runTime = new Date(run.ranAt);
  const timeStr = runTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="px-4 pb-4 pt-0 border-t border-sandstorm-s40 bg-white">
      <div className="space-y-4 mt-3">
        {/* Assistant Messages */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-forest-f40" />
            <h4 className="text-xs font-medium text-forest-f60 uppercase tracking-wider">
              Assistant Messages
            </h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-forest-f40 px-3 py-2 text-sm text-white">
                <p className="whitespace-pre-wrap text-xs">
                  {workflow.prompt || "Generate a report..."}
                </p>
                <span className="text-xs opacity-80 mt-1 block">You · {timeStr}</span>
              </div>
            </div>
            {DUMMY_ASSISTANT_MESSAGES.map((msg, i) => (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-sandstorm-s5 border border-sandstorm-s40 text-forest-f60">
                  <p className="whitespace-pre-wrap text-xs">{msg.content}</p>
                  <span className="text-xs text-forest-f30 mt-1 block">
                    Assistant · {msg.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

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
                  workflow.format === "pdf" ? "bg-red-r0 text-red-r30" : "bg-blue-50 text-blue-700"
                )}
              >
                {workflow.format.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forest-f60">
                  {workflow.channelName || "All Channels"} — {workflow.profileName || "All Profiles"} Report
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
  const { data: runs = [], isLoading } = useWorkflowRuns(
    workflow?.accountId,
    workflow?.id
  );
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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
                          {new Date(run.ranAt).toLocaleString("en-US", {
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
