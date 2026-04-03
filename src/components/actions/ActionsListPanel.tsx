import React, { useState, useMemo, useCallback } from "react";
import {
  Zap,
  Clock,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Search,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { Loader } from "../ui";
import { cn } from "../../lib/cn";
import { updateActionStatus } from "../../services/dashboardActions";
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPE_COLORS,
} from "../../pages/workflows/components/dashboard/actionTypeDisplay";

const OPERATOR_SYMBOLS: Record<string, string> = {
  lt: "<",
  gt: ">",
  eq: "=",
  lte: "≤",
  gte: "≥",
  in: "in",
  not_in: "not in",
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  pending_review: { label: "Pending Review", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  paused: { label: "Paused", dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-600" },
  disabled: { label: "Disabled", dot: "bg-red-400", bg: "bg-red-50", text: "text-red-600" },
};

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ActionItem {
  id: string;
  action_slug: string;
  action_id: number;
  dashboard_id: number;
  dashboard_name?: string;
  component_id?: string;
  type: string;
  platform: string;
  entity_type: string;
  status: string;
  description: string;
  condition?: Record<string, unknown>;
  params?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
  schedule?: {
    frequency: string;
    time?: string;
    date?: string;
    weekdays?: number[];
    monthDays?: number[];
    timezone: string;
    auto_execute: boolean;
    next_run_at?: string;
  };
}

type GroupMode = "dashboard" | "component" | "none";
type StatusFilter = "all" | "active" | "pending_review" | "paused" | "disabled";

interface ActionsListPanelProps {
  actions: ActionItem[];
  accountId: number;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  groupBy?: GroupMode;
  showDashboardLink?: boolean;
  onActionStatusChange?: (actionId: string, newStatus: string) => void;
}

function formatScheduleLabel(schedule?: ActionItem["schedule"]): string {
  if (!schedule || !schedule.frequency) return "Not scheduled";
  const t = schedule.time ?? "09:00";
  const tz = schedule.timezone ?? "UTC";
  switch (schedule.frequency) {
    case "hourly":
      return `Hourly (${tz})`;
    case "daily":
      return `Daily at ${t} (${tz})`;
    case "weekly": {
      const days = (schedule.weekdays ?? []).map((d) => WEEKDAY_SHORT[d] ?? "?").join(", ");
      return `Weekly ${days || "Mon"} at ${t} (${tz})`;
    }
    case "monthly": {
      const days = (schedule.monthDays ?? []).sort((a, b) => a - b).join(", ");
      return `Monthly on ${days || "1"} at ${t} (${tz})`;
    }
    case "once":
      return `Once on ${schedule.date ?? "TBD"} at ${t} (${tz})`;
    default:
      return `${schedule.frequency} at ${t} (${tz})`;
  }
}

function formatMetricLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGuardrailLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const InlineConfirm: React.FC<{
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "warning" | "danger";
}> = ({ message, onConfirm, onCancel, variant = "warning" }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-[11px]",
      variant === "danger"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-800"
    )}
  >
    <span className="font-medium">{message}</span>
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={onConfirm}
        className={cn(
          "px-2 py-0.5 rounded text-[10px] font-semibold text-white",
          variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        No
      </button>
    </div>
  </div>
);

export const ActionsListPanel: React.FC<ActionsListPanelProps> = ({
  actions: externalActions,
  accountId,
  loading = false,
  refreshing = false,
  onRefresh,
  groupBy = "dashboard",
  showDashboardLink = true,
  onActionStatusChange,
}) => {
  const [localActions, setLocalActions] = useState<ActionItem[]>(externalActions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [statusUpdating, setStatusUpdating] = useState<Set<string>>(new Set());
  const [confirmingApprove, setConfirmingApprove] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState<string | null>(null);
  const [confirmingPause, setConfirmingPause] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalActions(externalActions);
    const groupKeys = new Set(
      externalActions.map((a) =>
        groupBy === "dashboard" ? String(a.dashboard_id) : (a.component_id ?? "default")
      )
    );
    setExpandedGroups(groupKeys);
  }, [externalActions, groupBy]);

  const visibleActions = useMemo(
    () => localActions.filter((a) => a.status !== "deleted" && a.status !== "disabled"),
    [localActions]
  );

  const filtered = useMemo(() => {
    let result = visibleActions;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.action_slug.toLowerCase().includes(q) ||
          (a.dashboard_name ?? "").toLowerCase().includes(q) ||
          (ACTION_TYPE_LABELS[a.type] ?? a.type).toLowerCase().includes(q)
      );
    }
    return result;
  }, [visibleActions, statusFilter, searchQuery]);

  const grouped = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All Actions", actions: filtered }];
    }
    const map = new Map<string, { label: string; actions: ActionItem[] }>();
    for (const a of filtered) {
      const key =
        groupBy === "dashboard" ? String(a.dashboard_id) : (a.component_id ?? "default");
      const label =
        groupBy === "dashboard" ? (a.dashboard_name ?? `Dashboard ${a.dashboard_id}`) : `Widget ${a.component_id ?? "?"}`;
      if (!map.has(key)) {
        map.set(key, { label, actions: [] });
      }
      map.get(key)!.actions.push(a);
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [filtered, groupBy]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of visibleActions) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return counts;
  }, [visibleActions]);

  const pendingReviewActions = useMemo(
    () => visibleActions.filter((a) => a.status === "pending_review"),
    [visibleActions]
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const doStatusUpdate = useCallback(
    async (action: ActionItem, newStatus: "active" | "disabled" | "paused") => {
      if (!action.action_id) return;
      setStatusUpdating((prev) => new Set([...prev, action.id]));
      try {
        await updateActionStatus(accountId, action.dashboard_id, {
          action_ids: [action.action_id],
          status: newStatus,
        });
        setLocalActions((prev) =>
          prev.map((a) => (a.id === action.id ? { ...a, status: newStatus } : a))
        );
        onActionStatusChange?.(action.id, newStatus);
      } catch (err) {
        console.error(`Failed to update action status to ${newStatus}:`, err);
      } finally {
        setStatusUpdating((prev) => {
          const n = new Set(prev);
          n.delete(action.id);
          return n;
        });
      }
    },
    [accountId, onActionStatusChange]
  );

  const handleApprove = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "active");
      setConfirmingApprove(null);
    },
    [doStatusUpdate]
  );

  const handleDecline = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "disabled");
      setConfirmingDecline(null);
    },
    [doStatusUpdate]
  );

  const handlePause = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "paused");
      setConfirmingPause(null);
    },
    [doStatusUpdate]
  );

  const handleResume = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "active");
    },
    [doStatusUpdate]
  );

  const handleDelete = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "disabled");
      setConfirmingDelete(null);
    },
    [doStatusUpdate]
  );

  const handleApproveAll = useCallback(async () => {
    const pending = pendingReviewActions.filter((a) => a.action_id);
    if (pending.length === 0) return;
    const byDashboard = new Map<number, ActionItem[]>();
    for (const a of pending) {
      if (!byDashboard.has(a.dashboard_id)) byDashboard.set(a.dashboard_id, []);
      byDashboard.get(a.dashboard_id)!.push(a);
    }
    setStatusUpdating((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
    try {
      await Promise.all(
        Array.from(byDashboard.entries()).map(([dashId, actions]) =>
          updateActionStatus(accountId, dashId, {
            action_ids: actions.map((a) => a.action_id),
            status: "active",
          })
        )
      );
      const ids = new Set(pending.map((a) => a.id));
      setLocalActions((prev) =>
        prev.map((a) => (ids.has(a.id) ? { ...a, status: "active" } : a))
      );
    } catch (err) {
      console.error("Failed to approve all actions:", err);
    } finally {
      setStatusUpdating(new Set());
    }
  }, [pendingReviewActions, accountId]);

  const handleDeclineAll = useCallback(async () => {
    const pending = pendingReviewActions.filter((a) => a.action_id);
    if (pending.length === 0) return;
    const byDashboard = new Map<number, ActionItem[]>();
    for (const a of pending) {
      if (!byDashboard.has(a.dashboard_id)) byDashboard.set(a.dashboard_id, []);
      byDashboard.get(a.dashboard_id)!.push(a);
    }
    setStatusUpdating((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
    try {
      await Promise.all(
        Array.from(byDashboard.entries()).map(([dashId, actions]) =>
          updateActionStatus(accountId, dashId, {
            action_ids: actions.map((a) => a.action_id),
            status: "disabled",
          })
        )
      );
      const ids = new Set(pending.map((a) => a.id));
      setLocalActions((prev) =>
        prev.map((a) => (ids.has(a.id) ? { ...a, status: "disabled" } : a))
      );
    } catch (err) {
      console.error("Failed to decline all actions:", err);
    } finally {
      setStatusUpdating(new Set());
    }
  }, [pendingReviewActions, accountId]);

  return (
    <div className="space-y-4">
      {/* Pending review banner */}
      {pendingReviewActions.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="text-xs font-medium">
              {pendingReviewActions.length} action{pendingReviewActions.length !== 1 ? "s" : ""} pending review
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={statusUpdating.size > 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ShieldCheck className="w-3 h-3" />
              Approve All
            </button>
            <button
              type="button"
              onClick={handleDeclineAll}
              disabled={statusUpdating.size > 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ShieldX className="w-3 h-3" />
              Decline All
            </button>
          </div>
        </div>
      )}

      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : (key as StatusFilter))}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                  statusFilter === key
                    ? `${cfg.bg} ${cfg.text} border-current`
                    : "bg-white text-forest-f30 border-sandstorm-s40 hover:bg-sandstorm-s5"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label} ({count})
              </button>
            );
          })}
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="text-[11px] text-forest-f20 hover:text-forest-f40 underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest-f20" />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[12px] border border-sandstorm-s40 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-forest-f40 w-48"
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-forest-f40 border border-sandstorm-s40 rounded-lg hover:bg-sandstorm-s5 transition-colors disabled:opacity-50"
              aria-label="Refresh actions"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin")} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {(loading || refreshing) && (
        <div className="flex items-center justify-center py-12">
          <Loader size="md" message={loading ? "Loading actions..." : "Refreshing..."} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !refreshing && visibleActions.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-10 h-10 mx-auto mb-3 text-forest-f20" />
          <p className="text-[14px] text-forest-f30 mb-1">No actions configured</p>
          <p className="text-[12px] text-forest-f20">
            Create a dashboard with actions to see them here.
          </p>
        </div>
      )}

      {/* No filter results */}
      {!loading && !refreshing && visibleActions.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8">
          <Filter className="w-8 h-8 mx-auto mb-2 text-forest-f20" />
          <p className="text-[13px] text-forest-f30">No actions match the current filter.</p>
        </div>
      )}

      {/* Grouped actions */}
      {!loading &&
        grouped.map((group) => (
          <div
            key={group.key}
            className="border border-sandstorm-s40 rounded-lg overflow-hidden"
          >
            {/* Group header */}
            {groupBy !== "none" && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-sandstorm-s5 hover:bg-sandstorm-s10 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-forest-f60">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-forest-f20">
                    ({group.actions.length} action{group.actions.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showDashboardLink && groupBy === "dashboard" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const dashId = group.actions[0]?.dashboard_id;
                        if (dashId) window.open(`/brands/${accountId}/dashboards/${dashId}`, "_blank");
                      }}
                      className="p-1 rounded hover:bg-sandstorm-s40 transition-colors"
                      aria-label="Open dashboard"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-forest-f20" />
                    </button>
                  )}
                  {expandedGroups.has(group.key) ? (
                    <ChevronUp className="w-4 h-4 text-forest-f20" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-forest-f20" />
                  )}
                </div>
              </button>
            )}

            {/* Action cards */}
            {(groupBy === "none" || expandedGroups.has(group.key)) && (
              <div className="divide-y divide-sandstorm-s40">
                {group.actions.map((action) => (
                  <ActionCard
                    key={`${action.dashboard_id}-${action.action_slug}`}
                    action={action}
                    isUpdating={statusUpdating.has(action.id)}
                    confirmingApprove={confirmingApprove === action.id}
                    confirmingDecline={confirmingDecline === action.id}
                    confirmingPause={confirmingPause === action.id}
                    confirmingDelete={confirmingDelete === action.id}
                    onApproveClick={() => setConfirmingApprove(action.id)}
                    onApproveConfirm={() => handleApprove(action)}
                    onApproveCancel={() => setConfirmingApprove(null)}
                    onDeclineClick={() => setConfirmingDecline(action.id)}
                    onDeclineConfirm={() => handleDecline(action)}
                    onDeclineCancel={() => setConfirmingDecline(null)}
                    onPauseClick={() => setConfirmingPause(action.id)}
                    onPauseConfirm={() => handlePause(action)}
                    onPauseCancel={() => setConfirmingPause(null)}
                    onResumeClick={() => handleResume(action)}
                    onDeleteClick={() => setConfirmingDelete(action.id)}
                    onDeleteConfirm={() => handleDelete(action)}
                    onDeleteCancel={() => setConfirmingDelete(null)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

interface ActionCardProps {
  action: ActionItem;
  isUpdating: boolean;
  confirmingApprove: boolean;
  confirmingDecline: boolean;
  confirmingPause: boolean;
  confirmingDelete: boolean;
  onApproveClick: () => void;
  onApproveConfirm: () => void;
  onApproveCancel: () => void;
  onDeclineClick: () => void;
  onDeclineConfirm: () => void;
  onDeclineCancel: () => void;
  onPauseClick: () => void;
  onPauseConfirm: () => void;
  onPauseCancel: () => void;
  onResumeClick: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  action,
  isUpdating,
  confirmingApprove,
  confirmingDecline,
  confirmingPause,
  confirmingDelete,
  onApproveClick,
  onApproveConfirm,
  onApproveCancel,
  onDeclineClick,
  onDeclineConfirm,
  onDeclineCancel,
  onPauseClick,
  onPauseConfirm,
  onPauseCancel,
  onResumeClick,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  const typeLabel = ACTION_TYPE_LABELS[action.type] ?? action.type;
  const typeColors = ACTION_TYPE_COLORS[action.type] ?? { bg: "bg-gray-50", text: "text-gray-700" };
  const statusCfg = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.active;
  const scheduleText = formatScheduleLabel(action.schedule);
  const isPaused = action.status === "paused";
  const isPendingReview = action.status === "pending_review";

  return (
    <div className={cn("px-4 py-3 space-y-2.5 hover:bg-sandstorm-s0 transition-colors", isPaused && "opacity-50")}>
      {/* Top row: badges + status + buttons */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", typeColors.bg, typeColors.text)}>
            {typeLabel}
          </span>
          <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
            {action.entity_type}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-gray-50 text-[10px] text-gray-500">
            {action.platform}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium", statusCfg.bg, statusCfg.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {isPendingReview ? (
            <>
              <button
                type="button"
                onClick={onApproveClick}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Approve action"
                title="Approve — makes action active"
              >
                <ShieldCheck className="w-3 h-3" />
                Approve
              </button>
              <button
                type="button"
                onClick={onDeclineClick}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decline action"
                title="Decline — disables action"
              >
                <ShieldX className="w-3 h-3" />
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={isPaused ? onResumeClick : onPauseClick}
                disabled={isUpdating}
                className="p-1 rounded hover:bg-sandstorm-s20 transition-colors disabled:opacity-50"
                aria-label={isPaused ? "Resume action" : "Pause action"}
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                )}
              </button>
              <button
                type="button"
                onClick={onDeleteClick}
                disabled={isUpdating}
                className="p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                aria-label="Delete action"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] text-forest-f60 leading-relaxed">
        {action.description || "No description"}
      </p>

      {/* Condition */}
      {action.condition && Object.keys(action.condition).length > 0 && (
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-forest-f20 mt-0.5 shrink-0" />
          <div className="text-[11px] text-forest-f30">
            <span className="text-forest-f20 font-medium">Trigger: </span>
            <ConditionDisplay condition={action.condition} />
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="flex items-center gap-2">
        <Clock className={cn("w-3.5 h-3.5 shrink-0", action.schedule ? "text-forest-f20" : "text-amber-400")} />
        <span className="text-[11px] text-forest-f30">{scheduleText}</span>
        {action.schedule?.next_run_at && (
          <span className="text-[10px] text-forest-f20">
            · Next: {new Date(action.schedule.next_run_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Guardrails */}
      {action.guardrails && Object.keys(action.guardrails).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Shield className="w-3 h-3 text-forest-f20 shrink-0" />
          {Object.entries(action.guardrails).map(([key, val]) => (
            <span
              key={key}
              className="px-1.5 py-0.5 rounded bg-sandstorm-s5 border border-sandstorm-s40 text-[10px] text-forest-f30"
            >
              {formatGuardrailLabel(key)}: {String(val)}
            </span>
          ))}
        </div>
      )}

      {/* Inline confirmations */}
      {confirmingApprove && (
        <InlineConfirm message="Approve this action?" onConfirm={onApproveConfirm} onCancel={onApproveCancel} variant="warning" />
      )}
      {confirmingDecline && (
        <InlineConfirm message="Decline this action?" onConfirm={onDeclineConfirm} onCancel={onDeclineCancel} variant="danger" />
      )}
      {confirmingPause && (
        <InlineConfirm message="Pause this action?" onConfirm={onPauseConfirm} onCancel={onPauseCancel} variant="warning" />
      )}
      {confirmingDelete && (
        <InlineConfirm message="Delete this action?" onConfirm={onDeleteConfirm} onCancel={onDeleteCancel} variant="danger" />
      )}
    </div>
  );
};

const ConditionDisplay: React.FC<{ condition?: Record<string, unknown> }> = ({ condition }) => {
  if (!condition) return null;

  if ("logic" in condition && Array.isArray(condition.conditions)) {
    const subs = condition.conditions as Array<Record<string, unknown>>;
    const logic = String(condition.logic).toUpperCase();
    return (
      <span>
        {subs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="font-semibold text-forest-f40 mx-1">{logic}</span>}
            <span>
              {formatMetricLabel(String(c.field))} {OPERATOR_SYMBOLS[String(c.operator)] ?? c.operator}{" "}
              <span className="font-medium text-forest-f50">{String(c.value)}</span>
            </span>
          </React.Fragment>
        ))}
      </span>
    );
  }

  if ("field" in condition) {
    const op = OPERATOR_SYMBOLS[String(condition.operator)] ?? condition.operator;
    return (
      <span>
        {formatMetricLabel(String(condition.field))} {op}{" "}
        <span className="font-medium text-forest-f50">{String(condition.value)}</span>
      </span>
    );
  }

  return null;
};
