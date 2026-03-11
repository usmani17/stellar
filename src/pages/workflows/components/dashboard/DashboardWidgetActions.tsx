import React, { useState, useCallback } from "react";
import {
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  Zap,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import type {
  ActionRule,
  ActionProposal,
  ActionCondition,
  CompoundActionCondition,
} from "../../types/dashboard";
import { previewActions } from "../../../../services/dashboardActions";

const ACTION_TYPE_LABELS: Record<string, string> = {
  change_state: "Change status",
  adjust_budget: "Adjust budget",
  adjust_bid: "Adjust bid",
  add_negative_keyword: "Add negative keywords",
};

const ACTION_TYPE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  change_state: { bg: "bg-amber-50", text: "text-amber-700", darkBg: "bg-amber-900/30", darkText: "text-amber-300" },
  adjust_budget: { bg: "bg-emerald-50", text: "text-emerald-700", darkBg: "bg-emerald-900/30", darkText: "text-emerald-300" },
  adjust_bid: { bg: "bg-blue-50", text: "text-blue-700", darkBg: "bg-blue-900/30", darkText: "text-blue-300" },
  add_negative_keyword: { bg: "bg-purple-50", text: "text-purple-700", darkBg: "bg-purple-900/30", darkText: "text-purple-300" },
};

// ── Inline editor for a single numeric field ───────────────────────────────

interface InlineEditProps {
  value: string | number;
  onSave: (val: string) => void;
  isDark: boolean;
  wide?: boolean;
}

const InlineEdit: React.FC<InlineEditProps> = ({ value, onSave, isDark, wide }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

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
        {String(value)}
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

// ── Main component ─────────────────────────────────────────────────────────

interface DashboardWidgetActionsProps {
  actions: ActionRule[];
  accountId: number;
  dashboardId: number;
  componentId: string;
  isDark: boolean;
  onActionsChange?: (actions: ActionRule[]) => void;
  onReviewChanges?: (proposals: ActionProposal[]) => void;
}

export const DashboardWidgetActions: React.FC<DashboardWidgetActionsProps> = ({
  actions,
  accountId,
  dashboardId,
  componentId,
  isDark,
  onActionsChange,
  onReviewChanges,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(actions.filter((a) => a.status === "active").map((a) => a.id))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingPause, setConfirmingPause] = useState<string | null>(null);

  const visibleActions = actions.filter((a) => a.status !== "deleted");
  const activeActions = visibleActions.filter((a) => a.status === "active");
  const totalActive = activeActions.length;
  const selectedCount = [...selectedIds].filter((id) =>
    actions.find((a) => a.id === id && a.status === "active")
  ).length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePause = useCallback(
    (id: string) => {
      if (!onActionsChange) return;
      const rule = actions.find((a) => a.id === id);
      if (!rule) return;

      if (rule.status === "active") {
        setConfirmingPause(id);
        return;
      }
      const updated = actions.map((a) =>
        a.id === id ? { ...a, status: "active" as const } : a
      );
      onActionsChange(updated);
    },
    [actions, onActionsChange]
  );

  const confirmPause = useCallback(
    (id: string) => {
      if (!onActionsChange) return;
      const updated = actions.map((a) =>
        a.id === id ? { ...a, status: "paused" as const } : a
      );
      onActionsChange(updated);
      setConfirmingPause(null);
    },
    [actions, onActionsChange]
  );

  const softDeleteRule = useCallback(
    (id: string) => {
      if (!onActionsChange) return;
      const updated = actions.map((a) =>
        a.id === id ? { ...a, status: "deleted" as const } : a
      );
      onActionsChange(updated);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setConfirmingDelete(null);
    },
    [actions, onActionsChange]
  );

  const isCompound = (c: ActionCondition | CompoundActionCondition): c is CompoundActionCondition =>
    "logic" in c && "conditions" in c;

  const updateConditionValue = useCallback(
    (ruleId: string, newVal: string, subIndex?: number) => {
      if (!onActionsChange) return;
      const updated = actions.map((a) => {
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
      onActionsChange(updated);
    },
    [actions, onActionsChange]
  );

  const updateParamValue = useCallback(
    (ruleId: string, key: string, newVal: string) => {
      if (!onActionsChange) return;
      const updated = actions.map((a) => {
        if (a.id !== ruleId) return a;
        const parsed = isNaN(Number(newVal)) ? newVal : Number(newVal);
        return { ...a, params: { ...a.params, [key]: parsed } };
      });
      onActionsChange(updated);
    },
    [actions, onActionsChange]
  );

  const updateDescription = useCallback(
    (ruleId: string, newDesc: string) => {
      if (!onActionsChange || !newDesc.trim()) return;
      const updated = actions.map((a) =>
        a.id === ruleId ? { ...a, description: newDesc.trim() } : a
      );
      onActionsChange(updated);
    },
    [actions, onActionsChange]
  );

  const handleReviewChanges = useCallback(async () => {
    const selectedRuleIds = [...selectedIds].filter((id) =>
      actions.find((a) => a.id === id && a.status === "active")
    );
    if (selectedRuleIds.length === 0) return;

    setIsLoading(true);
    try {
      const { proposals } = await previewActions(accountId, dashboardId, {
        component_id: componentId,
        action_rule_ids: selectedRuleIds,
      });
      onReviewChanges?.(proposals);
    } catch (err) {
      console.error("Failed to preview actions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIds, actions, accountId, dashboardId, componentId, onReviewChanges]);

  if (visibleActions.length === 0) return null;

  return (
    <div
      className={cn(
        "border-t transition-colors",
        isDark ? "border-neutral-700 bg-neutral-800/50" : "border-sandstorm-s40/60 bg-sandstorm-s5/30"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 transition-colors",
          isDark ? "hover:bg-neutral-700/50" : "hover:bg-sandstorm-s10/50"
        )}
      >
        <div className="flex items-center gap-2">
          <Zap className={cn("w-3.5 h-3.5", isDark ? "text-[#2DD4BF]" : "text-forest-f40")} />
          <span className={cn("text-xs font-semibold", isDark ? "text-neutral-200" : "text-forest-f60")}>
            Actions
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              isDark ? "bg-neutral-600 text-neutral-300" : "bg-sandstorm-s20 text-forest-f30"
            )}
          >
            {totalActive} active
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className={cn("w-4 h-4", isDark ? "text-neutral-400" : "text-forest-f30")} />
        ) : (
          <ChevronDown className={cn("w-4 h-4", isDark ? "text-neutral-400" : "text-forest-f30")} />
        )}
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-3 space-y-2">
          {/* Rule list */}
          {visibleActions.map((rule) => {
            const colors = ACTION_TYPE_COLORS[rule.type] || ACTION_TYPE_COLORS.change_state;
            const isPaused = rule.status === "paused";
            const isSelected = selectedIds.has(rule.id) && !isPaused;

            return (
              <div key={rule.id} className="space-y-1.5">
                <div
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all",
                    isPaused && "opacity-50",
                    isDark
                      ? "bg-neutral-700/50 hover:bg-neutral-700"
                      : "bg-white hover:bg-sandstorm-s5 border border-sandstorm-s40/40"
                  )}
                >
                  {/* Checkbox */}
                  <label className="flex items-center pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isPaused}
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
                    </div>

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
                          <span className="font-mono">{rule.condition.field}</span>
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
                              <span className="font-mono">{sc.field}</span>
                              <span className="opacity-60">
                                {({lt: "<", gt: ">", eq: "=", lte: "<=", gte: ">=", in: "in", not_in: "not in"} as Record<string, string>)[sc.operator]}
                              </span>
                              <InlineEdit
                                value={Array.isArray(sc.value) ? sc.value.join(", ") : sc.value}
                                onSave={(v) => updateConditionValue(rule.id, v, idx)}
                                isDark={isDark}
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
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
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
              </div>
            );
          })}

          {/* Review changes button */}
          {totalActive > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className={cn("text-[10px]", isDark ? "text-neutral-400" : "text-forest-f30")}>
                {selectedCount} of {totalActive} selected
              </span>
              <button
                type="button"
                onClick={handleReviewChanges}
                disabled={selectedCount === 0 || isLoading}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-[#2DD4BF]/20 text-[#2DD4BF] hover:bg-[#2DD4BF]/30 border border-[#2DD4BF]/30"
                    : "bg-forest-f40 text-white hover:bg-forest-f50 shadow-sm"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                {isLoading ? "Loading..." : "Review Changes"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
