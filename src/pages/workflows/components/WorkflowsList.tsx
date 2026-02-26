import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Pencil,
  Trash2,
  Pause,
  Play,
  CalendarClock,
  Plus,
  History,
  Eye,
  Calendar,
  Link2,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Loader, ConfirmationModal, Tooltip } from "../../../components/ui";
import { WorkflowRunHistoryModal } from "./WorkflowRunHistoryModal";
import { WorkflowPreviewModal } from "./WorkflowPreviewModal";
import { cn } from "../../../lib/cn";
import type { Workflow } from "../../../services/workflows";
import { formatSchedule, computeNextRuns } from "../utils/scheduleUtils";
import { useBrandSettings } from "../hooks/useBrandSettings";

interface WorkflowsListProps {
  accountId: number | undefined;
  workflows: Workflow[];
  isLoading: boolean;
  onEdit: (workflow: Workflow) => void;
  onDelete: (id: number) => Promise<void>;
  isDeleting: boolean;
  onTogglePause: (workflow: Workflow) => void;
  isUpdating: boolean;
  onRunNow: (workflowId: number) => Promise<unknown>;
  isRunning: boolean;
  onCreateNew: () => void;
}

export const WorkflowsList: React.FC<WorkflowsListProps> = ({
  accountId,
  workflows,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
  onTogglePause,
  isUpdating,
  onRunNow,
  isRunning,
  onCreateNew,
}) => {
  const { settings: brandSettings } = useBrandSettings(accountId);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [pauseTarget, setPauseTarget] = useState<Workflow | null>(null);
  const [historyWorkflow, setHistoryWorkflow] = useState<Workflow | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<Workflow | null>(null);
  const [runningWorkflowId, setRunningWorkflowId] = useState<number | null>(null);
  const runInProgressRef = useRef(false);
  const [page, setPage] = useState(1);

  const WORKFLOWS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(workflows.length / WORKFLOWS_PER_PAGE));
  const paginatedWorkflows = useMemo(() => {
    const start = (page - 1) * WORKFLOWS_PER_PAGE;
    return workflows.slice(start, start + WORKFLOWS_PER_PAGE);
  }, [workflows, page]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="text-center py-20">
        <p className="text-forest-f30 text-sm">
          Select a brand to view workflows.
        </p>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-sandstorm-s10 flex items-center justify-center mb-4">
            <CalendarClock className="w-8 h-8 text-forest-f30" />
          </div>
          <h3 className="text-lg font-medium text-forest-f60 mb-2">
            No workflows yet
          </h3>
          <p className="text-sm text-forest-f30 mb-6 max-w-md">
            Schedule your first automated report to start generating insights on
            autopilot.
          </p>
          <button onClick={onCreateNew} className="create-entity-button">
            <Plus className="w-5 h-5 text-white" />
            <span className="text-[10.64px] text-white font-normal">
              Create Workflow
            </span>
          </button>
        </div>
      </>
    );
  }

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleConfirmPause = async () => {
    if (pauseTarget) {
      await onTogglePause(pauseTarget);
      setPauseTarget(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 min-w-0 overflow-x-hidden">
        {paginatedWorkflows.map((wf) => {
          const nextRuns = computeNextRuns(wf.schedule, 5);
          const nextRun = nextRuns[0];
          const nextRunsTooltip = nextRuns
            .map((r) => r.formatted)
            .join("\n");

          return (
            <div
              key={wf.id}
              className={cn(
                "rounded-xl border-2 p-4 sm:p-5 min-w-0 w-full overflow-hidden",
                "bg-white transition-all duration-200",
                "shadow-[0_1px_3px_rgba(7,41,41,0.06)]",
                "hover:shadow-[0_4px_12px_rgba(7,41,41,0.08)] hover:border-sandstorm-s50",
                wf.status === "paused"
                  ? "border-sandstorm-s40 border-l-4 border-l-yellow-y10 bg-yellow-y50/50"
                  : "border-sandstorm-s40 border-l-4 border-l-forest-f40"
              )}
            >
              {/* Header: Name + badges */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-4">
                <h3 className="text-base font-agrandir font-semibold text-forest-f60 truncate min-w-0">
                  {wf.name || "Untitled workflow"}
                </h3>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-1 rounded text-xs font-medium uppercase",
                      wf.format === "pdf"
                        ? "bg-red-r0 text-red-r30"
                        : "bg-blue-50 text-blue-700"
                    )}
                  >
                    {wf.format}
                  </span>
                  <span
                    className={cn(
                      "status-badge",
                      wf.status === "active"
                        ? "status-badge-enabled"
                        : "status-badge-paused"
                    )}
                  >
                    {wf.status === "active" ? "Active" : "Paused"}
                  </span>
                </div>
              </div>

              {/* Meta: 1 col on mobile, 2 cols on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4">
                <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg bg-sandstorm-s5 border border-sandstorm-s40 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-forest-f40/10">
                    <Link2 className="w-4 h-4 text-forest-f40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Integration
                    </p>
                    <p className="truncate text-sm text-forest-f60" title={wf.channelName || "All Channels"}>
                      {wf.channelName || "All Channels"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg bg-sandstorm-s5 border border-sandstorm-s40 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-forest-f40/10">
                    <User className="w-4 h-4 text-forest-f40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Profile
                    </p>
                    <p className="truncate text-sm text-forest-f60" title={wf.profileName || "All Profiles"}>
                      {wf.profileName || "All Profiles"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg bg-sandstorm-s5 border border-sandstorm-s40 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-forest-f40/10">
                    <Calendar className="w-4 h-4 text-forest-f40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Schedule
                    </p>
                    <p className="truncate text-sm text-forest-f60" title={formatSchedule(wf.schedule)}>
                      {formatSchedule(wf.schedule)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg bg-sandstorm-s5 border border-sandstorm-s40 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-forest-f40/10">
                    <Clock className="w-4 h-4 text-forest-f40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Next run
                    </p>
                    {wf.status === "paused" ? (
                      <p className="truncate text-sm text-forest-f30">
                        —
                      </p>
                    ) : nextRun && nextRunsTooltip ? (
                      <Tooltip
                        heading="Upcoming runs"
                        description={nextRunsTooltip}
                        position="topLeft"
                      >
                        <p className="truncate text-sm text-forest-f60 cursor-help border-b border-dotted border-forest-f40 w-fit">
                          {nextRun.formatted}
                        </p>
                      </Tooltip>
                    ) : (
                      <p className="truncate text-sm text-forest-f60">
                        {nextRun ? nextRun.formatted : "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions - wrap with adequate touch targets on mobile */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-1.5 pt-4 mt-1 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 px-4 py-3 sm:px-5 sm:py-3 rounded-b-xl border-t-2 border-sandstorm-s30 bg-sandstorm-s5/60">
                <button
                  onClick={() => setPreviewWorkflow(wf)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[10.64px] text-forest-f60 hover:bg-sandstorm-s20 transition-colors min-h-[36px] sm:min-h-0"
                  title="Preview workflow run"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => onEdit(wf)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[10.64px] text-forest-f60 hover:bg-sandstorm-s20 transition-colors min-h-[36px] sm:min-h-0"
                  title="Edit workflow"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setHistoryWorkflow(wf)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[10.64px] text-forest-f60 hover:bg-sandstorm-s20 transition-colors min-h-[36px] sm:min-h-0"
                  title="View run history"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </button>
                <button
                  onClick={async () => {
                    if (runInProgressRef.current) return;
                    runInProgressRef.current = true;
                    setRunningWorkflowId(wf.id);
                    try {
                      await onRunNow(wf.id);
                    } finally {
                      runInProgressRef.current = false;
                      setRunningWorkflowId(null);
                    }
                  }}
                  disabled={!!runningWorkflowId}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[10.64px] text-forest-f40 hover:bg-forest-f0 transition-colors min-h-[36px] sm:min-h-0 disabled:opacity-50"
                  title="Run workflow now"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isRunning && runningWorkflowId === wf.id ? "Running..." : "Run Now"}
                </button>
                <button
                  onClick={() =>
                    wf.status === "active"
                      ? setPauseTarget(wf)
                      : onTogglePause(wf)
                  }
                  disabled={isUpdating}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[10.64px] transition-colors disabled:opacity-50 min-h-[36px] sm:min-h-0",
                    wf.status === "active"
                      ? "text-yellow-y10 hover:bg-yellow-y0"
                      : "text-forest-f60 hover:bg-sandstorm-s20"
                  )}
                  title={wf.status === "active" ? "Pause workflow" : "Resume workflow"}
                >
                  {wf.status === "active" ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(wf)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-[10.64px] text-red-r30 hover:bg-red-r0 transition-colors min-h-[36px] sm:min-h-0"
                  title="Delete workflow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {workflows.length > WORKFLOWS_PER_PAGE && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-sandstorm-s40">
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

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Workflow"
        message="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmButtonLabel="Delete"
        cancelButtonLabel="Cancel"
        type="danger"
        isDangerous
        isLoading={isDeleting}
        loadingLabel="Deleting..."
      />

      <ConfirmationModal
        isOpen={!!pauseTarget}
        onClose={() => setPauseTarget(null)}
        onConfirm={handleConfirmPause}
        title="Pause Workflow"
        message="Are you sure you want to pause this workflow? It will stop running on the scheduled times until you resume it."
        confirmButtonLabel="Pause"
        cancelButtonLabel="Cancel"
        type="info"
        isLoading={isUpdating}
        loadingLabel="Pausing..."
      />

      <WorkflowRunHistoryModal
        isOpen={!!historyWorkflow}
        onClose={() => setHistoryWorkflow(null)}
        workflow={historyWorkflow}
      />

      <WorkflowPreviewModal
        isOpen={!!previewWorkflow}
        onClose={() => setPreviewWorkflow(null)}
        prompt={previewWorkflow?.prompt ?? ""}
        format={previewWorkflow?.format ?? "pdf"}
        integrationName={previewWorkflow?.channelName || "All Channels"}
        profileName={previewWorkflow?.profileName || "All Profiles"}
        accountId={previewWorkflow ? accountId : undefined}
        executePayload={
          previewWorkflow
            ? {
                accountId: previewWorkflow.accountId,
                channelId: previewWorkflow.channelId ?? undefined,
                profileId: previewWorkflow.profileId ?? undefined,
                accountName: previewWorkflow.accountName,
                channelName: previewWorkflow.channelName,
                profileName: previewWorkflow.profileName,
                prompt: previewWorkflow.prompt,
                format: previewWorkflow.format,
                workflowId: previewWorkflow.id,
                logoUrl: brandSettings?.logoUrl || undefined,
                primaryColor: brandSettings?.primaryColor || undefined,
              }
            : undefined
        }
        workflowId={previewWorkflow?.id ?? undefined}
      />
    </>
  );
};
