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
  onCreateNew,
}) => {
  const { settings: brandSettings } = useBrandSettings(accountId);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [pauseTarget, setPauseTarget] = useState<Workflow | null>(null);
  const [historyWorkflow, setHistoryWorkflow] = useState<Workflow | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<Workflow | null>(null);
  const [runWorkflow, setRunWorkflow] = useState<Workflow | null>(null);
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
          <div className="w-16 h-16 rounded-full bg-sandstorm-s20 flex items-center justify-center mb-4">
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
                "rounded-xl border border-sandstorm-s40 p-0 min-w-0 w-full overflow-hidden",
                "bg-white transition-all duration-200 shadow-sm hover:shadow-md",
                "border-l-4",
                wf.status === "active" ? "border-l-forest-f40" : "border-l-sandstorm-s60"
              )}
            >
              {/* Header: Name + status badges */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                <h3 className="text-base font-agrandir font-semibold text-forest-f60 truncate min-w-0">
                  {wf.name || "Untitled workflow"}
                </h3>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="inline-flex items-center px-2 py-1 rounded border border-sandstorm-s40 bg-white text-[11px] font-medium uppercase text-forest-f30">
                    {wf.format}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium",
                      wf.status === "active"
                        ? "bg-forest-f40/10 text-forest-f40"
                        : "bg-sandstorm-s20 text-forest-f30"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        wf.status === "active" ? "bg-forest-f40" : "bg-forest-f30"
                      )}
                    />
                    {wf.status === "active" ? "Active" : "Paused"}
                  </span>
                </div>
              </div>

              {/* Details: 3 columns - Integration, Profile, Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 sm:px-5 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link2 className="w-4 h-4 shrink-0 text-forest-f30" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Integration
                    </p>
                    <p className="truncate text-sm text-forest-f60" title={wf.channelName || "All Channels"}>
                      {wf.channelName || "All Channels"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <User className="w-4 h-4 shrink-0 text-forest-f30" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Profile
                    </p>
                    <p className="truncate text-sm text-forest-f60" title={wf.profileName || "All Profiles"}>
                      {wf.profileName || "All Profiles"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 shrink-0 text-forest-f30" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                      Schedule
                    </p>
                    <p className="truncate text-sm text-forest-f60" title={formatSchedule(wf.schedule)}>
                      {formatSchedule(wf.schedule)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Run band */}
              <div className="flex items-center gap-2 mx-4 sm:mx-5 mb-4 py-2.5 px-3 rounded-lg bg-sandstorm-s10 border border-sandstorm-s40">
                <Clock className="w-4 h-4 shrink-0 text-forest-f30" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                  Next run:
                </span>
                {wf.status === "paused" ? (
                  <span className="text-sm text-forest-f30">—</span>
                ) : nextRun && nextRunsTooltip ? (
                  <Tooltip
                    heading="Upcoming runs"
                    description={nextRunsTooltip}
                    position="topLeft"
                  >
                    <span className="text-sm text-forest-f60 cursor-help border-b border-dotted border-forest-f30">
                      {nextRun.formatted}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-sm text-forest-f60">
                    {nextRun ? nextRun.formatted : "—"}
                  </span>
                )}
              </div>

              {/* Actions: left = Preview, History, Pause, More | right = Run Now, Edit, Delete */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-sandstorm-s40">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewWorkflow(wf)}
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-forest-f60 hover:bg-sandstorm-s20 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => setHistoryWorkflow(wf)}
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-forest-f60 hover:bg-sandstorm-s20 transition-colors"
                    title="History"
                  >
                    <History className="w-4 h-4" />
                    History
                  </button>
                  {wf.status === "active" && (
                    <button
                      onClick={() => setPauseTarget(wf)}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-forest-f60 hover:bg-sandstorm-s20 transition-colors disabled:opacity-50"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRunWorkflow(wf)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-forest-f40 text-white hover:bg-forest-f50 transition-colors disabled:opacity-50"
                    title="Run Now"
                  >
                    <Zap className="w-4 h-4" />
                    Run Now
                  </button>
                  <button
                    onClick={() => onEdit(wf)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium border border-sandstorm-s60 bg-white text-forest-f60 hover:bg-sandstorm-s10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(wf)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium border border-red-r30 bg-red-r0 text-red-r30 hover:bg-red-r10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  {wf.status === "paused" && (
                    <button
                      onClick={() => onTogglePause(wf)}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium border border-sandstorm-s60 bg-white text-forest-f60 hover:bg-sandstorm-s10 transition-colors disabled:opacity-50"
                      title="Resume"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                </div>
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
        mode="preview"
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
                workflowName: previewWorkflow.name,
                logoUrl: brandSettings?.logoUrl || undefined,
                primaryColor: brandSettings?.primaryColor || undefined,
              }
            : undefined
        }
        workflowId={previewWorkflow?.id ?? undefined}
      />

      <WorkflowPreviewModal
        isOpen={!!runWorkflow}
        onClose={() => setRunWorkflow(null)}
        mode="run"
        prompt={runWorkflow?.prompt ?? ""}
        format={runWorkflow?.format ?? "pdf"}
        integrationName={runWorkflow?.channelName || "All Channels"}
        profileName={runWorkflow?.profileName || "All Profiles"}
        accountId={runWorkflow ? accountId : undefined}
        executePayload={
          runWorkflow
            ? {
                accountId: runWorkflow.accountId,
                channelId: runWorkflow.channelId ?? undefined,
                profileId: runWorkflow.profileId ?? undefined,
                accountName: runWorkflow.accountName,
                channelName: runWorkflow.channelName,
                profileName: runWorkflow.profileName,
                prompt: runWorkflow.prompt,
                format: runWorkflow.format,
                workflowId: runWorkflow.id,
                workflowName: runWorkflow.name,
                logoUrl: brandSettings?.logoUrl || undefined,
                primaryColor: brandSettings?.primaryColor || undefined,
              }
            : undefined
        }
        workflowId={runWorkflow?.id ?? undefined}
      />
    </>
  );
};
