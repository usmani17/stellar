import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Pencil,
  Check,
  X,
  Clock,
  Calendar,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import type {
  ActionRule,
  ActionProposal,
  ActionExecution,
  ActionCondition,
  CompoundActionCondition,
  ActionSchedule,
} from "../../types/dashboard";
import { previewActions, getActionHistory, updateActionStatus } from "../../../../services/dashboardActions";
import { formatMetricLabel } from "../../utils/formatDashboardValue";
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from "./actionTypeDisplay";
import {
  SCHEDULE_FREQUENCY_OPTIONS,
  TIME_OPTIONS,
  WEEKDAY_SHORT,
  snapTimeToHour,
} from "./dashboardConstants";
import { toWeekdaysArray, toMonthDaysArray } from "../../utils/scheduleUtils";
import { Dropdown } from "../../../../components/ui";

/**
 * When false, condition values in the "If …" row are read-only (no pencil / inline save).
 * Params like budget %, tCPA, and description can still be edited unless we narrow that later.
 */
export const DASHBOARD_ACTION_CONDITION_INLINE_EDIT = false;

// ── Inline editor for a single numeric field ───────────────────────────────

interface InlineEditProps {
  value: string | number;
  onSave: (val: string) => void;
  isDark: boolean;
  wide?: boolean;
  /** When true, show value only (used for conditions while inline condition edit is disabled). */
  readOnly?: boolean;
}

const InlineEdit: React.FC<InlineEditProps> = ({ value, onSave, isDark, wide, readOnly }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ? String(value) : "");

  if (readOnly) {
    const display =
      value !== undefined && value !== null && value !== ""
        ? String(value)
        : "—";
    return (
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-xs",
          wide ? "" : "font-mono",
          isDark ? "text-neutral-200" : "text-forest-f60"
        )}
      >
        {display}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-pointer transition-colors",
          wide ? "" : "font-mono",
          isDark
            ? "text-neutral-200 hover:bg-neutral-600/50"
            : "text-forest-f60 hover:bg-sandstorm-s20"
        )}
        aria-label="Edit value"
      >
        { !value ? "No condition" : String(value)}
        <Pencil className="w-3 h-3 opacity-50 shrink-0" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 w-full">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className={cn(
          "px-1.5 py-0.5 rounded text-xs border outline-none",
          wide ? "flex-1 min-w-0" : "w-16 font-mono",
          isDark
            ? "bg-neutral-700 border-neutral-500 text-neutral-100 focus:border-[#2DD4BF]"
            : "bg-white border-sandstorm-s40 text-forest-f60 focus:border-forest-f40"
        )}
      />
      <button
        type="button"
        onClick={() => { onSave(draft); setEditing(false); }}
        className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shrink-0"
        aria-label="Confirm"
      >
        <Check className="w-3 h-3 text-emerald-600" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
        aria-label="Cancel"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
    </span>
  );
};

// ── Inline confirmation popover ─────────────────────────────────────────────

interface InlineConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
  variant?: "danger" | "warning";
}

/** Explains what change_state will do (enable vs pause) so it is not confused with the "If" filters. */
function ChangeStateOutcomeBanner({ status, isDark }: { status: unknown; isDark: boolean }) {
  const raw = status != null && status !== "" ? String(status).trim() : "";
  const normalized = raw.toUpperCase();

  let title: string;
  let subtitle: string;

  if (normalized === "ENABLED") {
    title = "Turns the campaign on";
    subtitle = "Applies Enabled status when the conditions below match.";
  } else if (normalized === "PAUSED") {
    title = "Pauses the campaign";
    subtitle = "Applies Paused status when the conditions below match.";
  } else if (raw) {
    title = `Sets status to ${raw}`;
    subtitle = "Verify params.status in the rule configuration.";
  } else {
    title = "Target status missing";
    subtitle = "This action should include params.status (ENABLED or PAUSED).";
  }

  const tone =
    normalized === "ENABLED"
      ? isDark
        ? "border-emerald-800/45 bg-emerald-950/30 text-emerald-100"
        : "border-emerald-600/35 bg-emerald-50 text-emerald-950"
      : normalized === "PAUSED"
        ? isDark
          ? "border-amber-800/45 bg-amber-950/25 text-amber-100"
          : "border-amber-500/40 bg-amber-50 text-amber-950"
        : isDark
          ? "border-neutral-600 bg-neutral-800/60 text-neutral-200"
          : "border-sandstorm-s40 bg-sandstorm-s10 text-forest-f60";

  return (
    <div className={cn("rounded-md border px-2.5 py-1.5", tone)} role="status">
      <p className="font-semibold text-[11px] m-0">{title}</p>
      <p className={cn("text-[10px] m-0 mt-0.5 opacity-90", isDark ? "text-neutral-300" : "text-forest-f30")}>
        {subtitle}
        {raw ? (
          <>
            {" "}
            <span className="font-mono">({raw})</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

const InlineConfirm: React.FC<InlineConfirmProps> = ({ message, onConfirm, onCancel, isDark, variant = "danger" }) => (
  <div
    className={cn(
      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] animate-in fade-in slide-in-from-top-1 duration-150",
      isDark ? "bg-neutral-700 border border-neutral-600" : "bg-white border border-sandstorm-s40 shadow-sm"
    )}
  >
    <span className={cn("font-medium", isDark ? "text-neutral-200" : "text-forest-f60")}>{message}</span>
    <button
      type="button"
      onClick={onConfirm}
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
        variant === "danger"
          ? isDark ? "bg-red-900/50 text-red-300 hover:bg-red-900/70" : "bg-red-50 text-red-600 hover:bg-red-100"
          : isDark ? "bg-amber-900/50 text-amber-300 hover:bg-amber-900/70" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
      )}
    >
      Yes
    </button>
    <button
      type="button"
      onClick={onCancel}
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
        isDark ? "text-neutral-400 hover:bg-neutral-600" : "text-forest-f30 hover:bg-sandstorm-s10"
      )}
    >
      No
    </button>
  </div>
);

const DEFAULT_ACTION_SCHEDULE: ActionSchedule = {
  frequency: "daily",
  time: "09:00",
  timezone: "UTC",
  auto_execute: true,
};

/** Frequency for display/edit; missing frequency with time/next/last treated as daily (legacy / partial API). */
function effectiveScheduleFrequency(schedule?: ActionSchedule): ActionSchedule["frequency"] | undefined {
  if (!schedule) return undefined;
  const hasTiming =
    Boolean(schedule.time && String(schedule.time).trim()) ||
    Boolean(schedule.next_run_at) ||
    Boolean(schedule.last_run_at);
  return schedule.frequency ?? (hasTiming ? "daily" : undefined);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Format Date to YYYY-MM-DD in local time (avoids UTC date shifts). */
function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalYmdOrToday(raw?: string): Date {
  if (raw) {
    const [y, m, d] = raw.split("-").map((part) => Number(part));
    if (
      Number.isFinite(y) &&
      Number.isFinite(m) &&
      Number.isFinite(d) &&
      y > 0 &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= 31
    ) {
      const parsed = new Date(y, m - 1, d);
      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed.getFullYear() === y &&
        parsed.getMonth() === m - 1 &&
        parsed.getDate() === d
      ) {
        return startOfLocalDay(parsed);
      }
    }
  }
  return startOfLocalDay(new Date());
}

function clampDayToMonth(year: number, monthIndex: number, day: number): number {
  const maxDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), maxDay);
}

function getScheduleLabel(schedule?: ActionSchedule): string {
  const frequency = effectiveScheduleFrequency(schedule);
  if (!frequency || !schedule) {
    return "Execution schedule — click to set";
  }
  const normalized: ActionSchedule = { ...DEFAULT_ACTION_SCHEDULE, ...schedule, frequency };
  const timezone = normalized.timezone || "UTC";
  const t = snapTimeToHour(normalized.time);

  if (normalized.frequency === "hourly") {
    return `Execution Schedule: Hourly (${timezone})`;
  }

  if (normalized.frequency === "weekly") {
    const w = toWeekdaysArray(normalized.weekdays);
    const daysLabel =
      w.length > 0
        ? w.map((d) => WEEKDAY_SHORT[d] ?? "?").join(", ")
        : normalized.day_of_week != null
          ? WEEKDAY_SHORT[((Number(normalized.day_of_week) + 6) % 7)] ?? "Mon"
          : "Mon";
    return `Execution Schedule: Weekly ${daysLabel} ${t} (${timezone})`;
  }

  if (normalized.frequency === "monthly") {
    const md = toMonthDaysArray(normalized.monthDays);
    const daysPart = md.length > 0 ? md.sort((a, b) => a - b).join(", ") : "1";
    return `Execution Schedule: Monthly ${daysPart} @ ${t} (${timezone})`;
  }

  if (normalized.frequency === "once") {
    const date = normalized.date || "No date set";
    return `Execution Schedule: Once on ${date} ${t} (${timezone})`;
  }

  return `Execution Schedule: Daily ${t} (${timezone})`;
}

const GUARDRAIL_LABELS: Record<string, string> = {
  limit: "Limit",
  max_entities_per_action: "Max entities",
  warn_threshold: "Warn threshold",
  max_decrease_percent: "Max decrease",
  max_increase_percent: "Max increase",
  min_budget_amount: "Min budget",
  min_bid_amount: "Min bid",
  min_cpa: "Min CPA",
  min_roas: "Min ROAS",
  min_modifier_percent: "Min modifier",
  max_modifier_percent: "Max modifier",
  max_keywords_per_action: "Max keywords",
  max_placements_per_action: "Max placements",
  max_targets_per_action: "Max targets",
  max_values_per_action: "Max values",
};

function formatGuardrailValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (key.includes("percent") || key.includes("modifier")) {
      return `${value}%`;
    }
    if (key.startsWith("min_") && (key.includes("budget") || key.includes("bid") || key === "min_cpa")) {
      return `$${value}`;
    }
    return String(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function getFormattedGuardrails(guardrails?: Record<string, unknown>): Array<{ label: string; value: string }> {
  if (!guardrails || typeof guardrails !== "object") {
    return [];
  }
  return Object.entries(guardrails)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      label: GUARDRAIL_LABELS[key] || formatMetricLabel(key),
      value: formatGuardrailValue(key, value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Main component ─────────────────────────────────────────────────────────

interface DashboardWidgetActionsProps {
  actions: ActionRule[];
  accountId: number;
  dashboardId: number;
  componentId: string;
  isDark: boolean;
  onActionsChange?: (actions: ActionRule[]) => void | Promise<void>;
  onReviewChanges?: (proposals: ActionProposal[]) => void;
  onShowHistory?: (executions: ActionExecution[]) => void;
}

export const DashboardWidgetActions: React.FC<DashboardWidgetActionsProps> = ({
  actions,
  accountId,
  dashboardId,
  componentId,
  isDark,
  onActionsChange,
  onReviewChanges,
  onShowHistory,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [draftActions, setDraftActions] = useState<ActionRule[]>(actions);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(actions.filter((a) => a.status === "active").map((a) => a.id))
  );
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingPause, setConfirmingPause] = useState<string | null>(null);
  const [confirmingApprove, setConfirmingApprove] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Set<string>>(new Set());
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  /** Snapshot of `rule.schedule` when the editor opened; used to revert on Cancel / Escape / click-outside. */
  const scheduleEditorBaselineRef = useRef<Map<string, ActionSchedule | undefined>>(new Map());
  const scheduleEditorAnchorRef = useRef<HTMLSpanElement | null>(null);
  const schedulePopoverPanelRef = useRef<HTMLDivElement | null>(null);
  const [schedulePopoverLayout, setSchedulePopoverLayout] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setDraftActions(actions);
  }, [actions]);

  const visibleActions = draftActions.filter((a) => a.status !== "deleted" && a.status !== "disabled");
  const activeActions = visibleActions.filter((a) => a.status === "active");
  const pendingReviewActions = visibleActions.filter((a) => a.status === "pending_review");
  const totalActive = activeActions.length;
  const totalPendingReview = pendingReviewActions.length;
  const selectedCount = [...selectedIds].filter((id) =>
    draftActions.find((a) => a.id === id && a.status === "active")
  ).length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApproveAction = useCallback(
    async (ruleId: string) => {
      const rule = draftActions.find((a) => a.id === ruleId);
      if (!rule?.action_id) return;
      setStatusUpdating((prev) => new Set([...prev, ruleId]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: [rule.action_id],
          status: "active",
        });
        setDraftActions((prev) => prev.map((a) =>
          a.id === ruleId ? { ...a, status: "active" as const } : a
        ));
        setSelectedIds((prev) => new Set([...prev, ruleId]));
      } catch (err) {
        console.error("Failed to approve action:", err);
      } finally {
        setStatusUpdating((prev) => { const n = new Set(prev); n.delete(ruleId); return n; });
        setConfirmingApprove(null);
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const handleDeclineAction = useCallback(
    async (ruleId: string) => {
      const rule = draftActions.find((a) => a.id === ruleId);
      if (!rule?.action_id) return;
      setStatusUpdating((prev) => new Set([...prev, ruleId]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: [rule.action_id],
          status: "disabled",
        });
        setDraftActions((prev) => prev.map((a) =>
          a.id === ruleId ? { ...a, status: "disabled" as const } : a
        ));
      } catch (err) {
        console.error("Failed to decline action:", err);
      } finally {
        setStatusUpdating((prev) => { const n = new Set(prev); n.delete(ruleId); return n; });
        setConfirmingDecline(null);
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const handleApproveAll = useCallback(
    async () => {
      const pending = draftActions.filter((a) => a.status === "pending_review" && a.action_id);
      if (pending.length === 0) return;
      const ids = pending.map((a) => a.action_id!);
      setStatusUpdating((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: ids,
          status: "active",
        });
        const pendingIds = new Set(pending.map((a) => a.id));
        setDraftActions((prev) => prev.map((a) =>
          pendingIds.has(a.id) ? { ...a, status: "active" as const } : a
        ));
        setSelectedIds((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
      } catch (err) {
        console.error("Failed to approve all actions:", err);
      } finally {
        setStatusUpdating(new Set());
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const handleDeclineAll = useCallback(
    async () => {
      const pending = draftActions.filter((a) => a.status === "pending_review" && a.action_id);
      if (pending.length === 0) return;
      const ids = pending.map((a) => a.action_id!);
      setStatusUpdating((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: ids,
          status: "disabled",
        });
        const pendingIds = new Set(pending.map((a) => a.id));
        setDraftActions((prev) => prev.map((a) =>
          pendingIds.has(a.id) ? { ...a, status: "disabled" as const } : a
        ));
      } catch (err) {
        console.error("Failed to decline all actions:", err);
      } finally {
        setStatusUpdating(new Set());
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const togglePause = useCallback(
    async (id: string) => {
      const rule = draftActions.find((a) => a.id === id);
      if (!rule) return;

      if (rule.status === "active") {
        setConfirmingPause(id);
        return;
      }
      if (!rule.action_id) return;
      setStatusUpdating((prev) => new Set([...prev, id]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: [rule.action_id],
          status: "active",
        });
        setDraftActions((prev) => prev.map((a) =>
          a.id === id ? { ...a, status: "active" as const } : a
        ));
        setSelectedIds((prev) => new Set([...prev, id]));
      } catch (err) {
        console.error("Failed to resume action:", err);
      } finally {
        setStatusUpdating((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const updateSchedule = useCallback(
    (id: string, schedule: ActionRule["schedule"]) => {
      setDraftActions((prev) => prev.map((a) => {
        if (a.id !== id) return a;
        if (schedule === undefined) {
          const next = { ...a };
          delete next.schedule;
          return next;
        }
        return { ...a, schedule };
      }));
    },
    []
  );

  const discardScheduleEdit = useCallback(
    (ruleId: string) => {
      const baseline = scheduleEditorBaselineRef.current.get(ruleId);
      scheduleEditorBaselineRef.current.delete(ruleId);
      setDraftActions((prev) => prev.map((a) => {
        if (a.id !== ruleId) return a;
        if (baseline === undefined) {
          const next = { ...a };
          delete next.schedule;
          return next;
        }
        return {
          ...a,
          schedule: JSON.parse(JSON.stringify(baseline)) as ActionSchedule,
        };
      }));
      setEditingSchedule(null);
    },
    []
  );

  const commitScheduleEditClose = useCallback(
    async (ruleId: string) => {
      const baseline = scheduleEditorBaselineRef.current.get(ruleId);
      scheduleEditorBaselineRef.current.delete(ruleId);
      setEditingSchedule(null);
      if (!onActionsChange) return;
      const current = draftActions.find((a) => a.id === ruleId)?.schedule;
      const changed = JSON.stringify(baseline ?? null) !== JSON.stringify(current ?? null);
      if (!changed) return;
      await onActionsChange(draftActions);
    },
    [draftActions, onActionsChange]
  );

  useLayoutEffect(() => {
    if (!editingSchedule) {
      setSchedulePopoverLayout(null);
      return;
    }
    const updatePosition = () => {
      const el = scheduleEditorAnchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = 16;
      const width = Math.min(288, Math.max(200, window.innerWidth - pad * 2));
      const left = Math.max(pad, Math.min(r.right - width, window.innerWidth - width - pad));
      const gap = 6;
      setSchedulePopoverLayout({ top: r.bottom + gap, left, width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [editingSchedule]);

  useEffect(() => {
    if (!editingSchedule) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target instanceof Element && target.closest("[data-stellar-dropdown-menu]")) {
        return;
      }
      if (schedulePopoverPanelRef.current?.contains(target as Node)) return;
      const anchor = scheduleEditorAnchorRef.current;
      if (anchor?.contains(target as Node)) return;
      discardScheduleEdit(editingSchedule);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [editingSchedule, discardScheduleEdit]);

  useEffect(() => {
    if (!editingSchedule) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        discardScheduleEdit(editingSchedule);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingSchedule, discardScheduleEdit]);

  const confirmPause = useCallback(
    async (id: string) => {
      const rule = draftActions.find((a) => a.id === id);
      if (!rule?.action_id) {
        setConfirmingPause(null);
        return;
      }
      setStatusUpdating((prev) => new Set([...prev, id]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: [rule.action_id],
          status: "paused",
        });
        setDraftActions((prev) => prev.map((a) =>
          a.id === id ? { ...a, status: "paused" as const } : a
        ));
      } catch (err) {
        console.error("Failed to pause action:", err);
      } finally {
        setStatusUpdating((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setConfirmingPause(null);
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const softDeleteRule = useCallback(
    async (id: string) => {
      const rule = draftActions.find((a) => a.id === id);
      if (!rule?.action_id) {
        setConfirmingDelete(null);
        return;
      }
      setStatusUpdating((prev) => new Set([...prev, id]));
      try {
        await updateActionStatus(accountId, dashboardId, {
          action_ids: [rule.action_id],
          status: "disabled",
        });
        setDraftActions((prev) => prev.map((a) =>
          a.id === id ? { ...a, status: "disabled" as const } : a
        ));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        console.error("Failed to delete action:", err);
      } finally {
        setStatusUpdating((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setConfirmingDelete(null);
      }
    },
    [draftActions, accountId, dashboardId]
  );

  const isCompound = (c: ActionCondition | CompoundActionCondition): c is CompoundActionCondition =>
    "logic" in c && "conditions" in c;

  const updateConditionValue = useCallback(
    (ruleId: string, newVal: string, subIndex?: number) => {
      const updated = draftActions.map((a) => {
        if (a.id !== ruleId || !a.condition) return a;
        const parsed = isNaN(Number(newVal)) ? newVal : Number(newVal);

        if (isCompound(a.condition) && subIndex !== undefined) {
          const newConditions = a.condition.conditions.map((sc, i) =>
            i === subIndex ? { ...sc, value: parsed as ActionCondition["value"] } : sc
          );
          return { ...a, condition: { ...a.condition, conditions: newConditions } };
        }

        return { ...a, condition: { ...a.condition, value: parsed as ActionCondition["value"] } };
      });
      setDraftActions(updated);
      void onActionsChange?.(updated);
    },
    [draftActions, onActionsChange]
  );

  const updateParamValue = useCallback(
    (ruleId: string, key: string, newVal: string) => {
      const updated = draftActions.map((a) => {
        if (a.id !== ruleId) return a;
        const parsed = isNaN(Number(newVal)) ? newVal : Number(newVal);
        return { ...a, params: { ...a.params, [key]: parsed } };
      });
      setDraftActions(updated);
      void onActionsChange?.(updated);
    },
    [draftActions, onActionsChange]
  );

  const updateDescription = useCallback(
    (ruleId: string, newDesc: string) => {
      if (!newDesc.trim()) return;
      const updated = draftActions.map((a) =>
        a.id === ruleId ? { ...a, description: newDesc.trim() } : a
      );
      setDraftActions(updated);
      void onActionsChange?.(updated);
    },
    [draftActions, onActionsChange]
  );

  const handleReviewChanges = useCallback(async () => {
    const selectedRuleIds = [...selectedIds].filter((id) =>
      draftActions.find((a) => a.id === id && a.status === "active")
    );
    if (selectedRuleIds.length === 0) return;

    setIsReviewLoading(true);
    try {
      const { proposals } = await previewActions(accountId, dashboardId, {
        component_id: componentId,
        action_rule_ids: selectedRuleIds,
      });
      onReviewChanges?.(proposals);
    } catch (err) {
      console.error("Failed to preview actions:", err);
    } finally {
      setIsReviewLoading(false);
    }
  }, [selectedIds, draftActions, accountId, dashboardId, componentId, onReviewChanges]);

  const handleShowHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const { executions } = await getActionHistory(accountId, dashboardId, {
        component_id: componentId,
        limit: 50,
      });
      // Show executions in modal or expandable section
      onShowHistory?.(executions);
    } catch (err) {
      console.error("Failed to fetch action history:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [accountId, dashboardId, componentId, onShowHistory]);

  const selectAllActive = useCallback(() => {
    const allActiveIds = new Set(activeActions.map((a) => a.id));
    setSelectedIds(allActiveIds);
  }, [activeActions]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelectableSelected =
    activeActions.length > 0 &&
    activeActions.every((a) => selectedIds.has(a.id));
  const someSelectableSelected =
    activeActions.length > 0 &&
    activeActions.some((a) => selectedIds.has(a.id)) &&
    !allSelectableSelected;

  if (visibleActions.length === 0) return null;

  return (
    <div
      className={cn(
        "border-t transition-colors",
        isDark ? "border-neutral-700 bg-neutral-800/50" : "border-sandstorm-s40/60 bg-sandstorm-s5/30"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
          isDark ? "hover:bg-neutral-700/50" : "hover:bg-sandstorm-s10/50"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Select All / Deselect All checkbox */}
          {isOpen && totalActive > 0 && (
            <label className="flex items-center ml-2 shrink-0" title={allSelectableSelected ? "Deselect all" : "Select all"}>
              <input
                type="checkbox"
                checked={allSelectableSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelectableSelected;
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  if (allSelectableSelected) {
                    deselectAll();
                  } else {
                    selectAllActive();
                  }
                }}
                className={cn(
                  "w-3.5 h-3.5 rounded border cursor-pointer",
                  isDark
                    ? "border-neutral-500 bg-neutral-600 checked:bg-[#2DD4BF] checked:border-[#2DD4BF]"
                    : "border-sandstorm-s40 bg-white checked:bg-forest-f40 checked:border-forest-f40"
                )}
                aria-label="Select all actions"
              />
            </label>
          )}

          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold", isDark ? "text-neutral-200" : "text-forest-f60")}>
              Actions
            </span>
            {totalActive > 0 && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  isDark ? "bg-neutral-600 text-neutral-300" : "bg-sandstorm-s20 text-forest-f30"
                )}
              >
                {totalActive} active
              </span>
            )}
            {totalPendingReview > 0 && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  isDark ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700 border border-amber-200"
                )}
              >
                {totalPendingReview} pending review
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-neutral-700" : "hover:bg-sandstorm-s20"
          )}
          aria-label={isOpen ? "Collapse actions" : "Expand actions"}
        >
          {isOpen ? (
            <ChevronUp className={cn("w-4 h-4", isDark ? "text-neutral-400" : "text-forest-f30")} />
          ) : (
            <ChevronDown className={cn("w-4 h-4", isDark ? "text-neutral-400" : "text-forest-f30")} />
          )}
        </button>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-3 space-y-4">
          {/* Pending review banner */}
          {totalPendingReview > 0 && (
            <div
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border",
                isDark
                  ? "border-amber-800/50 bg-amber-950/25 text-amber-100"
                  : "border-amber-300 bg-amber-50 text-amber-900"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className={cn("w-4 h-4 shrink-0", isDark ? "text-amber-400" : "text-amber-600")} />
                <span className="text-xs font-medium">
                  {totalPendingReview} action{totalPendingReview !== 1 ? "s" : ""} pending review
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleApproveAll}
                  disabled={statusUpdating.size > 0}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isDark
                      ? "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700/40"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  <ShieldCheck className="w-3 h-3" />
                  Approve All
                </button>
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  disabled={statusUpdating.size > 0}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isDark
                      ? "bg-red-900/40 text-red-300 hover:bg-red-900/60 border border-red-700/40"
                      : "bg-white text-red-600 hover:bg-red-50 border border-red-200"
                  )}
                >
                  <ShieldX className="w-3 h-3" />
                  Decline All
                </button>
              </div>
            </div>
          )}
          {/* Rule list */}
          {visibleActions.map((rule) => {
            const colors = ACTION_TYPE_COLORS[rule.type] || ACTION_TYPE_COLORS.change_state;
            const isPaused = rule.status === "paused";
            const isPendingReview = rule.status === "pending_review";
            const isSelected = selectedIds.has(rule.id) && !isPaused && !isPendingReview;
            const isScheduleSet = Boolean(effectiveScheduleFrequency(rule.schedule));
            const schedEditing: ActionSchedule = { ...DEFAULT_ACTION_SCHEDULE, ...rule.schedule };
            const onceSelectedDate = parseLocalYmdOrToday(schedEditing.date);
            const onceMonthStart = new Date(onceSelectedDate.getFullYear(), onceSelectedDate.getMonth(), 1);
            const onceDaysInMonth = new Date(onceSelectedDate.getFullYear(), onceSelectedDate.getMonth() + 1, 0).getDate();
            const todayLocal = startOfLocalDay(new Date());
            const currentMonthStart = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1);
            const canMoveToPreviousOnceMonth = onceMonthStart > currentMonthStart;
            const formattedGuardrails = getFormattedGuardrails(rule.guardrails);

            return (
              <div
                key={rule.id}
                className={cn(
                  "space-y-1.5 pb-3 border-b last:border-b-0 last:pb-0",
                  isDark ? "border-neutral-600/50" : "border-sandstorm-s40/70"
                )}
              >
                <div
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all",
                    isPaused && "opacity-50",
                    isPendingReview && (isDark ? "border-amber-700/40" : "border-amber-300"),
                    isDark
                      ? "bg-neutral-700/50 hover:bg-neutral-700 border border-neutral-600/40"
                      : "bg-white hover:bg-sandstorm-s5 border border-sandstorm-s40 shadow-sm"
                  )}
                >
                  {/* Checkbox */}
                  <label className="flex items-center pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isPaused || isPendingReview}
                      onChange={() => toggleSelect(rule.id)}
                      className={cn(
                        "w-3.5 h-3.5 rounded border cursor-pointer",
                        isDark
                          ? "border-neutral-500 bg-neutral-600 checked:bg-[#2DD4BF] checked:border-[#2DD4BF]"
                          : "border-sandstorm-s40 bg-white checked:bg-forest-f40 checked:border-forest-f40"
                      )}
                    />
                  </label>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide",
                          isDark ? colors.darkBg + " " + colors.darkText : colors.bg + " " + colors.text
                        )}
                      >
                        {ACTION_TYPE_LABELS[rule.type] || rule.type}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          isDark ? "bg-neutral-600 text-neutral-300" : "bg-sandstorm-s10 text-forest-f30"
                        )}
                      >
                        {rule.entity_type}
                      </span>
                      {isPaused && (
                        <span className="text-[10px] font-medium text-amber-500 flex items-center gap-0.5">
                          <Pause className="w-3 h-3" /> Paused
                        </span>
                      )}
                      {isPendingReview && (
                        <span className={cn(
                          "text-[10px] font-medium flex items-center gap-0.5",
                          isDark ? "text-amber-300" : "text-amber-600"
                        )}>
                          <ShieldAlert className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </div>

                    {rule.type === "change_state" ? (
                      <ChangeStateOutcomeBanner status={rule.params?.status} isDark={isDark} />
                    ) : null}

                    <div className={cn("text-xs leading-relaxed", isDark ? "text-neutral-300" : "text-forest-f50")}>
                      <InlineEdit
                        value={rule.description}
                        onSave={(v) => updateDescription(rule.id, v)}
                        isDark={isDark}
                        wide
                      />
                    </div>

                    <div className={cn("flex items-center gap-3 text-[10px] flex-wrap", isDark ? "text-neutral-400" : "text-forest-f30")}>
                      {rule.condition && !isCompound(rule.condition) && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">If</span>
                          <span className="font-medium">{formatMetricLabel(rule.condition.field)}</span>
                          <span className="opacity-60">
                            {({lt: "<", gt: ">", eq: "=", lte: "<=", gte: ">=", in: "in", not_in: "not in"} as Record<string, string>)[rule.condition.operator]}
                          </span>
                          <InlineEdit
                            value={
                              Array.isArray(rule.condition.value)
                                ? rule.condition.value.join(", ")
                                : rule.condition.value
                            }
                            onSave={(v) => updateConditionValue(rule.id, v)}
                            isDark={isDark}
                            readOnly={!DASHBOARD_ACTION_CONDITION_INLINE_EDIT}
                          />
                        </span>
                      )}
                      {rule.condition && isCompound(rule.condition) && (
                        <span className="flex items-center gap-1 flex-wrap">
                          <span className="opacity-60">If</span>
                          {rule.condition.conditions.map((sc, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && (
                                <span className={cn(
                                  "font-semibold px-1",
                                  isDark ? "text-[#2DD4BF]" : "text-forest-f40"
                                )}>
                                  {(rule.condition as CompoundActionCondition).logic.toUpperCase()}
                                </span>
                              )}
                              <span className="font-medium">{formatMetricLabel(sc.field)}</span>
                              <span className="opacity-60">
                                {({lt: "<", gt: ">", eq: "=", lte: "<=", gte: ">=", in: "in", not_in: "not in"} as Record<string, string>)[sc.operator]}
                              </span>
                              <InlineEdit
                                value={Array.isArray(sc.value) ? sc.value.join(", ") : sc.value}
                                onSave={(v) => updateConditionValue(rule.id, v, idx)}
                                isDark={isDark}
                                readOnly={!DASHBOARD_ACTION_CONDITION_INLINE_EDIT}
                              />
                            </React.Fragment>
                          ))}
                        </span>
                      )}
                      {(rule.type === "adjust_budget" || rule.type === "adjust_bid") && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">{rule.params.change_type as string}:</span>
                          <InlineEdit
                            value={rule.params.value as number}
                            onSave={(v) => updateParamValue(rule.id, "value", v)}
                            isDark={isDark}
                          />
                          <span className="opacity-60">{(rule.params.unit as string) === "amount" ? "$" : "%"}</span>
                        </span>
                      )}
                      {rule.type === "change_bid_strategy" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">Strategy:</span>
                          <span className="font-mono">{rule.params.strategy as string}</span>
                          {Boolean(rule.params.target_cpa) && (
                            <>
                              <span className="opacity-60">tCPA:</span>
                              <InlineEdit
                                value={rule.params.target_cpa as number}
                                onSave={(v) => updateParamValue(rule.id, "target_cpa", v)}
                                isDark={isDark}
                              />
                            </>
                          )}
                          {Boolean(rule.params.target_roas) && (
                            <>
                              <span className="opacity-60">tROAS:</span>
                              <InlineEdit
                                value={rule.params.target_roas as number}
                                onSave={(v) => updateParamValue(rule.id, "target_roas", v)}
                                isDark={isDark}
                              />
                            </>
                          )}
                        </span>
                      )}
                      {rule.type === "adjust_target" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {(rule.params.target_type as string)?.toUpperCase()} {rule.params.change_type as string}:
                          </span>
                          <InlineEdit
                            value={rule.params.value as number}
                            onSave={(v) => updateParamValue(rule.id, "value", v)}
                            isDark={isDark}
                          />
                          <span className="opacity-60">{(rule.params.unit as string) === "amount" ? "$" : "%"}</span>
                        </span>
                      )}
                      {(rule.type === "add_keyword" || rule.type === "add_negative_keyword") && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {(rule.params.match_type as string) || "EXACT"} match,{" "}
                            {(rule.params.keywords as string[])?.length || 0} keywords
                          </span>
                        </span>
                      )}
                      {rule.type === "adjust_device_bid" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">Device:</span>
                          <span className="font-mono">{(rule.params.device as string) || "—"}</span>
                          <span className="opacity-60">{rule.params.change_type as string}:</span>
                          <InlineEdit
                            value={rule.params.value as number}
                            onSave={(v) => updateParamValue(rule.id, "value", v)}
                            isDark={isDark}
                          />
                          <span className="opacity-60">%</span>
                        </span>
                      )}
                      {rule.type === "adjust_demographic_bid" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {(rule.params.demographic_type as string) || "—"}:
                          </span>
                          <span className="font-mono">{(rule.params.segment as string) || "—"}</span>
                          {(rule.params.change_type as string) !== "exclude" ? (
                            <>
                              <span className="opacity-60">{rule.params.change_type as string}:</span>
                              <InlineEdit
                                value={rule.params.value as number}
                                onSave={(v) => updateParamValue(rule.id, "value", v)}
                                isDark={isDark}
                              />
                              <span className="opacity-60">%</span>
                            </>
                          ) : (
                            <span className="opacity-60 font-semibold text-red-500">exclude</span>
                          )}
                        </span>
                      )}
                      {rule.type === "exclude_placement" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {(rule.params.placement_type as string) || "SITE"},{" "}
                            {(rule.params.placements as string[])?.length || 0} exclusions
                          </span>
                        </span>
                      )}
                      {rule.type === "update_targeting" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {rule.params.action as string} {rule.params.targeting_type as string}:{" "}
                            {(rule.params.values as string[])?.length || 0} values
                          </span>
                        </span>
                      )}
                      {rule.type === "set_ad_schedule" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {((rule.params.schedule as Record<string, unknown>)?.days as string[])
                              ?.map((d: string) => d.slice(0, 3))
                              .join(", ") || "—"}{" "}
                            {String((rule.params.schedule as Record<string, unknown>)?.start_hour ?? 0).padStart(2, "0")}:00–
                            {String((rule.params.schedule as Record<string, unknown>)?.end_hour ?? 24).padStart(2, "0")}:00
                          </span>
                        </span>
                      )}
                      {rule.type === "add_negative_target" && (
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">
                            {(rule.params.target_type as string) || "asin"},{" "}
                            {(rule.params.targets as string[])?.length || 0} negatives
                          </span>
                        </span>
                      )}
                      <span
                        className="relative inline-flex shrink-0"
                        ref={editingSchedule === rule.id ? scheduleEditorAnchorRef : null}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (editingSchedule === rule.id) {
                              commitScheduleEditClose(rule.id);
                              return;
                            }
                            const prev = rule.schedule;
                            scheduleEditorBaselineRef.current.set(
                              rule.id,
                              prev
                                ? (JSON.parse(JSON.stringify(prev)) as ActionSchedule)
                                : undefined
                            );
                            if (!effectiveScheduleFrequency(rule.schedule)) {
                              updateSchedule(rule.id, { ...DEFAULT_ACTION_SCHEDULE });
                            } else if (rule.schedule?.frequency === "hourly") {
                              updateSchedule(rule.id, {
                                ...DEFAULT_ACTION_SCHEDULE,
                                ...rule.schedule,
                                frequency: "daily",
                                timezone: rule.schedule.timezone ?? "UTC",
                                auto_execute: rule.schedule.auto_execute ?? true,
                              });
                            }
                            setEditingSchedule(rule.id);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors",
                            isScheduleSet
                              ? isDark
                                ? "border-neutral-600 hover:bg-neutral-700/40 text-neutral-300"
                                : "border-sandstorm-s40 hover:bg-sandstorm-s10 text-forest-f40"
                              : isDark
                                ? "border-yellow-y10/40 text-yellow-y10 hover:bg-yellow-y10/10"
                                : "border-yellow-y10/40 text-yellow-y10 hover:bg-yellow-y10/10"
                          )}
                          title="Edit execution schedule"
                          aria-expanded={editingSchedule === rule.id}
                        >
                          <Clock className={cn("w-3 h-3", isDark ? "text-neutral-400" : "text-forest-f30")} />
                          <span className="opacity-80">{getScheduleLabel(rule.schedule)}</span>
                        </button>
                        {editingSchedule === rule.id && schedulePopoverLayout
                          ? createPortal(
                              <div
                                ref={schedulePopoverPanelRef}
                                data-stellar-schedule-popover=""
                                style={{
                                  top: schedulePopoverLayout.top,
                                  left: schedulePopoverLayout.left,
                                  width: schedulePopoverLayout.width,
                                }}
                                className={cn(
                                  "fixed z-[100000] max-h-[min(70vh,520px)] overflow-y-auto p-2.5 rounded-lg border shadow-lg",
                                  isDark ? "bg-neutral-900 border-neutral-600" : "bg-white border-sandstorm-s40"
                                )}
                                role="dialog"
                                aria-label="Execution schedule editor"
                              >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Calendar className={cn("w-3 h-3 shrink-0", isDark ? "text-neutral-400" : "text-forest-f30")} />
                                <span className={cn("text-xs font-medium", isDark ? "text-neutral-300" : "text-forest-f60")}>
                                  Execution Schedule
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => discardScheduleEdit(rule.id)}
                                className={cn(
                                  "shrink-0 rounded p-0.5 transition-colors",
                                  isDark
                                    ? "text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                                    : "text-forest-f30 hover:bg-sandstorm-s10 hover:text-forest-f60"
                                )}
                                aria-label="Cancel and close schedule editor"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="min-w-[86px]">
                                <Dropdown
                                  options={SCHEDULE_FREQUENCY_OPTIONS}
                                  value={schedEditing.frequency || "daily"}
                                  onChange={(value) => {
                                    const frequency = value as ActionSchedule["frequency"];
                                    const next: ActionSchedule = {
                                      ...DEFAULT_ACTION_SCHEDULE,
                                      ...rule.schedule,
                                      frequency,
                                      timezone: "UTC",
                                      auto_execute: true,
                                    };
                                    if (frequency === "weekly") {
                                      const w = toWeekdaysArray(next.weekdays);
                                      next.weekdays = w.length > 0 ? w : [0];
                                      delete next.day_of_week;
                                      delete next.monthDays;
                                      delete next.date;
                                    } else if (frequency === "monthly") {
                                      const m = toMonthDaysArray(next.monthDays);
                                      next.monthDays = m.length > 0 ? m : [1];
                                      delete next.weekdays;
                                      delete next.day_of_week;
                                      delete next.date;
                                    } else if (frequency === "once") {
                                      if (!next.date) {
                                        next.date = toLocalYmd(new Date());
                                      }
                                      delete next.weekdays;
                                      delete next.monthDays;
                                      delete next.day_of_week;
                                    } else {
                                      delete next.weekdays;
                                      delete next.monthDays;
                                      delete next.day_of_week;
                                      delete next.date;
                                    }
                                    updateSchedule(rule.id, next);
                                  }}
                                  buttonClassName={cn(
                                    "h-6 min-h-6 px-2 py-0 text-[11px] rounded",
                                    isDark
                                      ? "bg-neutral-700 border border-neutral-600 text-neutral-200"
                                      : "bg-white border border-sandstorm-s40 text-forest-f60"
                                  )}
                                  menuClassName={cn(
                                    "text-[11px]",
                                    isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40"
                                  )}
                                  optionClassName={cn(
                                    "text-[11px] py-1",
                                    isDark ? "text-neutral-200 hover:bg-neutral-700" : "text-forest-f60 hover:bg-sandstorm-s10"
                                  )}
                                  align="left"
                                />
                              </div>

                              {schedEditing.frequency !== "hourly" && (
                                <div className="min-w-[90px]">
                                  <Dropdown
                                    options={TIME_OPTIONS}
                                    value={snapTimeToHour(schedEditing.time)}
                                    onChange={(time) => {
                                      updateSchedule(rule.id, {
                                        ...schedEditing,
                                        time,
                                        timezone: "UTC",
                                        auto_execute: true,
                                      });
                                    }}
                                    buttonClassName={cn(
                                      "h-6 min-h-6 px-2 py-0 text-[11px] rounded",
                                      isDark
                                        ? "bg-neutral-700 border border-neutral-600 text-neutral-200"
                                        : "bg-white border border-sandstorm-s40 text-forest-f60"
                                    )}
                                    menuClassName={cn(
                                      "text-[11px]",
                                      isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40"
                                    )}
                                    optionClassName={cn(
                                      "text-[11px] py-1",
                                      isDark ? "text-neutral-200 hover:bg-neutral-700" : "text-forest-f60 hover:bg-sandstorm-s10"
                                    )}
                                    align="left"
                                  />
                                </div>
                              )}

                              {schedEditing.frequency === "once" && (
                                <div>
                                  <span className={cn("text-[10px] block mb-1", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                    Date
                                  </span>
                                  <div className="flex items-center justify-between mb-1 max-w-[220px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!canMoveToPreviousOnceMonth) return;
                                        const targetMonth = new Date(
                                          onceSelectedDate.getFullYear(),
                                          onceSelectedDate.getMonth() - 1,
                                          1
                                        );
                                        const day = clampDayToMonth(
                                          targetMonth.getFullYear(),
                                          targetMonth.getMonth(),
                                          onceSelectedDate.getDate()
                                        );
                                        const targetDate = startOfLocalDay(
                                          new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day)
                                        );
                                        const boundedDate = targetDate < todayLocal ? todayLocal : targetDate;
                                        updateSchedule(rule.id, {
                                          ...schedEditing,
                                          date: toLocalYmd(boundedDate),
                                          timezone: "UTC",
                                          auto_execute: true,
                                        });
                                      }}
                                      disabled={!canMoveToPreviousOnceMonth}
                                      className={cn(
                                        "w-6 h-6 rounded border text-[11px] font-semibold transition-colors",
                                        !canMoveToPreviousOnceMonth
                                          ? isDark
                                            ? "border-neutral-700 text-neutral-600 cursor-not-allowed"
                                            : "border-sandstorm-s30 text-sandstorm-s50 cursor-not-allowed"
                                          : isDark
                                            ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                                            : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10"
                                      )}
                                      aria-label="Previous month"
                                    >
                                      {"<"}
                                    </button>
                                    <span className={cn("text-[10px] font-medium", isDark ? "text-neutral-300" : "text-forest-f60")}>
                                      {onceSelectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const targetMonth = new Date(
                                          onceSelectedDate.getFullYear(),
                                          onceSelectedDate.getMonth() + 1,
                                          1
                                        );
                                        const day = clampDayToMonth(
                                          targetMonth.getFullYear(),
                                          targetMonth.getMonth(),
                                          onceSelectedDate.getDate()
                                        );
                                        updateSchedule(rule.id, {
                                          ...schedEditing,
                                          date: toLocalYmd(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day)),
                                          timezone: "UTC",
                                          auto_execute: true,
                                        });
                                      }}
                                      className={cn(
                                        "w-6 h-6 rounded border text-[11px] font-semibold transition-colors",
                                        isDark
                                          ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                                          : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10"
                                      )}
                                      aria-label="Next month"
                                    >
                                      {">"}
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-7 gap-1 max-w-[220px]">
                                    {Array.from({ length: onceDaysInMonth }, (_, i) => i + 1).map((day) => {
                                      const candidateDate = startOfLocalDay(
                                        new Date(onceSelectedDate.getFullYear(), onceSelectedDate.getMonth(), day)
                                      );
                                      const isPast = candidateDate < todayLocal;
                                      const sel = day === onceSelectedDate.getDate();
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          disabled={isPast}
                                          onClick={() => {
                                            updateSchedule(rule.id, {
                                              ...schedEditing,
                                              frequency: "once",
                                              date: toLocalYmd(candidateDate),
                                              timezone: "UTC",
                                              auto_execute: true,
                                            });
                                          }}
                                          className={cn(
                                            "h-7 rounded text-[10px] font-medium border transition-colors",
                                            isPast
                                              ? isDark
                                                ? "border-neutral-700 text-neutral-600 cursor-not-allowed"
                                                : "border-sandstorm-s30 text-sandstorm-s50 cursor-not-allowed"
                                              : sel
                                                ? isDark
                                                  ? "bg-[#2DD4BF]/25 border-[#2DD4BF]/50 text-[#2DD4BF]"
                                                  : "bg-forest-f40 text-white border-forest-f40"
                                                : isDark
                                                  ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                                                  : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10"
                                          )}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {schedEditing.frequency === "weekly" && (
                                <div>
                                  <span className={cn("text-[10px] block mb-1", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                    Days (Mon–Sun)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {WEEKDAY_SHORT.map((label, idx) => {
                                      const sel = toWeekdaysArray(schedEditing.weekdays).includes(idx);
                                      return (
                                        <button
                                          key={label}
                                          type="button"
                                          onClick={() => {
                                            const cur = toWeekdaysArray(schedEditing.weekdays);
                                            let nxt = sel ? cur.filter((d) => d !== idx) : [...cur, idx].sort((a, b) => a - b);
                                            if (nxt.length === 0) nxt = [idx];
                                            updateSchedule(rule.id, {
                                              ...schedEditing,
                                              frequency: "weekly",
                                              weekdays: nxt,
                                              timezone: "UTC",
                                              auto_execute: true,
                                            });
                                          }}
                                          className={cn(
                                            "w-9 h-9 rounded-md text-[10px] font-semibold border transition-colors",
                                            sel
                                              ? isDark
                                                ? "bg-[#2DD4BF]/25 border-[#2DD4BF]/50 text-[#2DD4BF]"
                                                : "bg-forest-f40 text-white border-forest-f40"
                                              : isDark
                                                ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                                                : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10"
                                          )}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {schedEditing.frequency === "monthly" && (
                                <div>
                                  <span className={cn("text-[10px] block mb-1", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                    Days of month
                                  </span>
                                  <div className="grid grid-cols-7 gap-1 max-w-[220px]">
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                      const sel = toMonthDaysArray(schedEditing.monthDays).includes(day);
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() => {
                                            const cur = toMonthDaysArray(schedEditing.monthDays);
                                            let nxt = sel ? cur.filter((d) => d !== day) : [...cur, day].sort((a, b) => a - b);
                                            if (nxt.length === 0) nxt = [day];
                                            updateSchedule(rule.id, {
                                              ...schedEditing,
                                              frequency: "monthly",
                                              monthDays: nxt,
                                              timezone: "UTC",
                                              auto_execute: true,
                                            });
                                          }}
                                          className={cn(
                                            "h-7 rounded text-[10px] font-medium border transition-colors",
                                            sel
                                              ? isDark
                                                ? "bg-[#2DD4BF]/25 border-[#2DD4BF]/50 text-[#2DD4BF]"
                                                : "bg-forest-f40 text-white border-forest-f40"
                                              : isDark
                                                ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                                                : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10"
                                          )}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-dashed border-sandstorm-s40/50 dark:border-neutral-600">
                              <p className={cn("text-[10px] opacity-80 m-0", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                UTC • auto-execution
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => discardScheduleEdit(rule.id)}
                                  className={cn(
                                    "px-2 py-1 rounded text-[10px] font-medium border transition-colors",
                                    isDark
                                      ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                                      : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10"
                                  )}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => commitScheduleEditClose(rule.id)}
                                  className={cn(
                                    "px-2 py-1 rounded text-[10px] font-medium",
                                    isDark ? "bg-neutral-600 hover:bg-neutral-500 text-neutral-100" : "bg-forest-f40 hover:bg-forest-f50 text-white"
                                  )}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </div>,
                              document.body
                            )
                        : null}
                      </span>
                    </div>

                    {formattedGuardrails.length > 0 && (
                      <div className={cn("flex items-center gap-2 text-[10px] flex-wrap", isDark ? "text-neutral-400" : "text-forest-f30")}>
                        <span className="opacity-60">Guardrails:</span>
                        {formattedGuardrails.map((item) => (
                          <span
                            key={`${rule.id}-${item.label}`}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border",
                              isDark
                                ? "border-neutral-600 bg-neutral-700/40 text-neutral-300"
                                : "border-sandstorm-s40 bg-sandstorm-s5 text-forest-f50"
                            )}
                          >
                            <span className="opacity-70">{item.label}:</span>
                            <span className="font-medium">{item.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {isPendingReview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmingApprove(rule.id)}
                          disabled={statusUpdating.has(rule.id)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            isDark
                              ? "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          )}
                          aria-label="Approve action"
                          title="Approve — makes action active"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDecline(rule.id)}
                          disabled={statusUpdating.has(rule.id)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            isDark
                              ? "bg-red-900/40 text-red-300 hover:bg-red-900/60"
                              : "bg-white text-red-600 hover:bg-red-50 border border-red-200"
                          )}
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
                          onClick={() => togglePause(rule.id)}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isDark ? "hover:bg-neutral-600" : "hover:bg-sandstorm-s20"
                          )}
                          aria-label={isPaused ? "Resume action" : "Pause action"}
                          title={isPaused ? "Resume" : "Pause"}
                        >
                          {isPaused ? (
                            <Play className={cn("w-3.5 h-3.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
                          ) : (
                            <Pause className={cn("w-3.5 h-3.5", isDark ? "text-amber-400" : "text-amber-600")} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(rule.id)}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isDark ? "hover:bg-red-900/30" : "hover:bg-red-50"
                          )}
                          aria-label="Delete action rule"
                          title="Delete"
                        >
                          <Trash2 className={cn("w-3.5 h-3.5", isDark ? "text-red-400" : "text-red-500")} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmingDelete === rule.id && (
                  <InlineConfirm
                    message="Delete this action rule?"
                    onConfirm={() => softDeleteRule(rule.id)}
                    onCancel={() => setConfirmingDelete(null)}
                    isDark={isDark}
                    variant="danger"
                  />
                )}
                {/* Pause confirmation */}
                {confirmingPause === rule.id && (
                  <InlineConfirm
                    message="Pause this action rule?"
                    onConfirm={() => confirmPause(rule.id)}
                    onCancel={() => setConfirmingPause(null)}
                    isDark={isDark}
                    variant="warning"
                  />
                )}
                {/* Approve confirmation */}
                {confirmingApprove === rule.id && (
                  <InlineConfirm
                    message="Approve this action rule?"
                    onConfirm={() => handleApproveAction(rule.id)}
                    onCancel={() => setConfirmingApprove(null)}
                    isDark={isDark}
                    variant="warning"
                  />
                )}
                {/* Decline confirmation */}
                {confirmingDecline === rule.id && (
                  <InlineConfirm
                    message="Decline this action rule?"
                    onConfirm={() => handleDeclineAction(rule.id)}
                    onCancel={() => setConfirmingDecline(null)}
                    isDark={isDark}
                    variant="danger"
                  />
                )}
              </div>
            );
          })}

          {/* Review changes button */}
          {totalActive > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className={cn("text-[10px]", isDark ? "text-neutral-400" : "text-forest-f30")}>
                {selectedCount} of {totalActive} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReviewChanges}
                  disabled={selectedCount === 0 || isReviewLoading}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    isDark
                      ? "bg-[#2DD4BF]/20 text-[#2DD4BF] hover:bg-[#2DD4BF]/30 border border-[#2DD4BF]/30"
                      : "bg-forest-f40 text-white hover:bg-forest-f50 shadow-sm"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isReviewLoading ? "Loading..." : "Review Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleShowHistory}
                  disabled={isHistoryLoading}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    isDark
                      ? "bg-[#2DD4BF]/20 text-[#2DD4BF] hover:bg-[#2DD4BF]/30 border border-[#2DD4BF]/30"
                      : "bg-forest-f40 text-white hover:bg-forest-f50 shadow-sm"
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  {isHistoryLoading ? "Loading..." : "View History"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
