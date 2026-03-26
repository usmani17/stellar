import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  History,
  X,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import { Dropdown } from "../../../../components/ui";
import type { ActionHistoryParams, ActionHistoryResponse } from "../../../../services/dashboardActions";
import type { ActionExecution, ActionType } from "../../types/dashboard";
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from "./actionTypeDisplay";

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Actions" },
  ...(Object.entries(ACTION_TYPE_LABELS) as [ActionType, string][])
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label)),
];

interface ActionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  executions: ActionExecution[];
  isDark: boolean;
  onShowHistory?: (filters: ActionHistoryParams) => ActionHistoryResponse | Promise<ActionHistoryResponse>;
}

const PAGE_SIZE = 10;

/** Uniform height for filter bar controls (36px including border). */
const FILTER_CTRL_H = "h-9 min-h-9 box-border";

const STATUS_STYLES: Record<string, { dot: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
  success: { dot: "bg-emerald-500", text: "text-emerald-500", Icon: CheckCircle2 },
  failed: { dot: "bg-red-500", text: "text-red-500", Icon: XCircle },
  executing: { dot: "bg-amber-500", text: "text-amber-500", Icon: Clock3 },
  previewed: { dot: "bg-sky-500", text: "text-sky-500", Icon: History },
  proposed: { dot: "bg-indigo-500", text: "text-indigo-500", Icon: History },
  rejected: { dot: "bg-neutral-500", text: "text-neutral-500", Icon: XCircle },
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function parseActionParams(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/** History API may return `result` as an object or a JSON string (e.g. staggered keyword Celery steps). */
function parseExecutionResultPayload(raw: unknown): unknown {
  if (raw == null) return raw;
  if (typeof raw !== "string") return raw;
  const t = raw.trim();
  if (!t) return raw;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return raw;
  }
}

/** Internal Celery stagger metadata (e.g. `_keyword_stagger`); hide from history UI. */
function isStaggerMetaParamKey(key: string): boolean {
  if (key === "_keyword_stagger") return true;
  return key.startsWith("_") && key.toLowerCase().includes("stagger");
}

function formatActionParamValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderActionParamsDetail(
  params: Record<string, unknown>,
  isDark: boolean,
  omitKeys?: string[]
): React.ReactNode {
  const omit = new Set(omitKeys ?? []);
  const entries = Object.keys(params)
    .filter((k) => !isStaggerMetaParamKey(k) && !omit.has(k))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, display: formatActionParamValue(params[key]) }));

  if (entries.length === 0) return null;

  const textClass = isDark ? "text-neutral-300" : "text-forest-f50";
  const labelClass = isDark ? "text-neutral-200" : "text-forest-f60";

  return (
    <div className="text-[11px] space-y-1.5">
      {entries.map(({ key, display }) => (
        <div
          key={key}
          className="flex flex-wrap items-baseline gap-x-1 font-mono text-[10px] leading-snug"
        >
          <span className={cn("font-medium shrink-0", labelClass)}>{key}</span>
          <span className={cn("shrink-0", textClass)}> : </span>
          <span className={cn("min-w-0 break-words", textClass)}>{display}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Map one `entity_ids[]` / preview row to display id + label.
 * - Legacy API shape: `{ id, name }`
 * - Google staggered keyword apply (`enqueue_google_staggered_keyword_execution_rows`): rich snapshot with
 *   `keyword` { text, match_type }, `ent_row_id`, `entity_name`, `ad_group_id`, and for negative campaign-level
 *   also `level`, `campaign_id` (see `google_action_executor.entity_snapshot`).
 */
function mapExecutionEntityItem(raw: unknown): { id: string; name: string } | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s ? { id: s, name: s } : null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;

  const legacyId = item.id != null ? String(item.id) : "";
  const legacyName = item.name != null ? String(item.name) : "";
  if (legacyId || legacyName) {
    return {
      id: legacyId || legacyName,
      name: legacyName || legacyId || "—",
    };
  }

  const kwRaw = item.keyword;
  if (kwRaw != null && typeof kwRaw === "object" && !Array.isArray(kwRaw)) {
    const kw = kwRaw as Record<string, unknown>;
    const text =
      (typeof kw.text === "string" && kw.text) ||
      (typeof kw.keyword === "string" && kw.keyword) ||
      (typeof kw.term === "string" && kw.term) ||
      "";
    const matchType = typeof kw.match_type === "string" ? kw.match_type : "";
    const entityName = typeof item.entity_name === "string" ? item.entity_name : "";
    const level = typeof item.level === "string" ? item.level : "";

    const nameParts: string[] = [];
    if (text) {
      nameParts.push(matchType ? `"${text}" [${matchType}]` : `"${text}"`);
    }
    if (entityName) nameParts.push(entityName);
    else if (level) nameParts.push(level);

    const name = nameParts.length > 0 ? nameParts.join(" · ") : "—";

    const entRowId = item.ent_row_id != null ? String(item.ent_row_id) : "";
    const adGroupId = item.ad_group_id != null ? String(item.ad_group_id) : "";
    const campaignId = item.campaign_id != null ? String(item.campaign_id) : "";
    const id = entRowId || adGroupId || campaignId;

    if (!id && name === "—") return null;
    return {
      id: id || `kw:${text || entityName || "entity"}`,
      name,
    };
  }

  const entRowId = item.ent_row_id != null ? String(item.ent_row_id) : "";
  const entityName = typeof item.entity_name === "string" ? item.entity_name : "";
  const adGroupId = item.ad_group_id != null ? String(item.ad_group_id) : "";
  const campaignId = item.campaign_id != null ? String(item.campaign_id) : "";
  const id = entRowId || adGroupId || campaignId;
  if (id || entityName) {
    return { id: id || entityName, name: entityName || id || "—" };
  }

  return null;
}

function parseExecutionEntityList(raw: unknown): Array<{ id: string; name: string }> {
  let arr: unknown[] = [];
  if (raw == null) {
    arr = [];
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  }

  return arr.map(mapExecutionEntityItem).filter((e): e is { id: string; name: string } => e != null);
}

function parseEntityIds(raw: unknown): Array<{ id: string; name: string }> {
  return parseExecutionEntityList(raw);
}

function parsePreviewEntities(raw: unknown): Array<{ id: string; name: string }> {
  return parseExecutionEntityList(raw);
}

function getDisplayEntities(execution: ActionExecution): Array<{ id: string; name: string }> {
  const fromEntityIds = parseEntityIds(execution.entity_ids as unknown);
  const fromPreview = parsePreviewEntities(execution.preview_result as unknown);
  const merged = [...fromEntityIds, ...fromPreview];
  const unique = new Map<string, { id: string; name: string }>();
  for (const entity of merged) {
    const key = `${entity.id}\u0001${entity.name}`;
    if (!unique.has(key)) unique.set(key, entity);
  }
  return Array.from(unique.values());
}

function renderActionParams(
  actionType: string,
  params: Record<string, unknown>,
  isDark: boolean
): React.ReactNode {
  const textClass = isDark ? "text-neutral-300" : "text-forest-f50";
  const labelClass = isDark ? "text-neutral-200" : "text-forest-f60";

  if (actionType === "add_negative_keyword") {
    const keywords = Array.isArray(params.keywords)
      ? params.keywords.filter((k): k is string => typeof k === "string")
      : [];
    const matchType = typeof params.match_type === "string" ? params.match_type : "—";
    return (
      <div className={cn("text-[11px] space-y-1", textClass)}>
        <p><span className={cn("font-semibold", labelClass)}>Keywords:</span> {keywords.length ? keywords.join(", ") : "—"}</p>
        <p><span className={cn("font-semibold", labelClass)}>Match Type:</span> {matchType}</p>
      </div>
    );
  }

  if (actionType === "change_state") {
    return null;
  }

  if (actionType === "adjust_budget") {
    const adjustmentType =
      (typeof params.adjustment_type === "string" && params.adjustment_type) ||
      (typeof params.change_type === "string" && params.change_type) ||
      "—";
    const amount =
      (typeof params.amount === "number" || typeof params.amount === "string" ? String(params.amount) : "") ||
      (typeof params.value === "number" || typeof params.value === "string" ? String(params.value) : "—");
    return (
      <div className={cn("text-[11px]", textClass)}>
        <p><span className={cn("font-semibold", labelClass)}>Budget Change:</span> {adjustmentType} {amount}</p>
      </div>
    );
  }

  return null;
}

export const ActionHistoryModal: React.FC<ActionHistoryModalProps> = ({
  isOpen,
  onClose,
  executions,
  isDark,
  onShowHistory,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set());
  const [filters, setFilters] = useState<ActionHistoryParams>({
    status: "",
    action_type: "",
    search: "",
    date_from: "",
    date_to: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "proposed", label: "Proposed" },
    { value: "executing", label: "Executing" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
  ];

  const sortedExecutions = useMemo(
    () => [...executions].sort((a, b) => new Date(b.proposed_at).getTime() - new Date(a.proposed_at).getTime()),
    [executions]
  );

  const fetchHistory = useCallback(async (page: number) => {
    if (!onShowHistory) return;
    try {
      const result = await onShowHistory({
        status: filters.status || undefined,
        action_type: filters.action_type || undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      const pages = Math.ceil((result?.total ?? 0) / PAGE_SIZE);
      setTotalPages(pages);
    } catch (err) {
      console.error("Failed to fetch action history:", err);
    }
  }, [filters, onShowHistory]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setExpandedRows(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchHistory(currentPage);
  }, [currentPage, isOpen, fetchHistory]);

  if (!isOpen) return null;

  const toggleExpanded = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          "relative w-full max-w-[calc(100vw-2rem)] sm:max-w-5xl xl:max-w-6xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col",
          isDark ? "bg-neutral-800 border border-neutral-700" : "bg-white border border-sandstorm-s40"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4 border-b shrink-0",
            isDark ? "border-neutral-700 bg-neutral-800" : "border-sandstorm-s40/60 bg-sandstorm-s5/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                isDark ? "bg-[#2DD4BF]/15" : "bg-forest-f40/10"
              )}
            >
              <History className={cn("w-5 h-5", isDark ? "text-[#2DD4BF]" : "text-forest-f40")} />
            </div>
            <div>
              <h2 className={cn("text-sm font-semibold", isDark ? "text-neutral-100" : "text-forest-f60")}>
                Action Execution History
              </h2>
              <p className={cn("text-xs mt-0.5", isDark ? "text-neutral-400" : "text-forest-f30")}>
                {sortedExecutions.length} execution{sortedExecutions.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDark ? "hover:bg-neutral-700 text-neutral-400" : "hover:bg-sandstorm-s20 text-forest-f30"
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div
            className={cn(
              "flex flex-col gap-2 p-4 border-b sm:flex-row sm:flex-wrap sm:items-center sm:gap-2",
              "lg:flex-nowrap lg:items-center lg:gap-3",
              isDark ? "border-neutral-700" : "border-sandstorm-s40/60"
            )}
          >
            <Dropdown
              options={statusOptions}
              value={filters.status ?? ""}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              placeholder="All Status"
              closeOnSelect
              className="w-full min-w-0 sm:min-w-[140px] sm:max-w-[220px] lg:w-40 lg:max-w-none lg:flex-shrink-0"
              buttonClassName={cn(
                FILTER_CTRL_H,
                "w-full px-2 py-0 border rounded text-[12px] focus:outline-none inline-flex items-center justify-between gap-2",
                isDark
                  ? "border-neutral-600 bg-neutral-800 text-neutral-200"
                  : "border-gray-300 bg-[#FEFEFB] text-forest-f60"
              )}
              menuClassName={cn(
                isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40"
              )}
            />

            <Dropdown
              options={ACTION_TYPE_OPTIONS}
              value={filters.action_type ?? ""}
              onChange={(value) => setFilters((prev) => ({ ...prev, action_type: value }))}
              placeholder="All Actions"
              closeOnSelect
              className="w-full min-w-0 sm:min-w-[160px] sm:max-w-[260px] lg:w-52 lg:max-w-none lg:flex-shrink-0"
              buttonClassName={cn(
                FILTER_CTRL_H,
                "w-full px-2 py-0 border rounded text-[12px] focus:outline-none inline-flex items-center justify-between gap-2",
                isDark
                  ? "border-neutral-600 bg-neutral-800 text-neutral-200"
                  : "border-gray-300 bg-[#FEFEFB] text-forest-f60"
              )}
              menuClassName={cn(
                isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40"
              )}
            />

            <input
              type="text"
              placeholder="Search..."
              value={filters.search ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className={cn(
                FILTER_CTRL_H,
                "px-2 py-0 text-xs border rounded min-w-0 w-full leading-normal sm:min-w-[160px] lg:flex-1 lg:min-w-[12rem]",
                isDark ? "bg-neutral-800 border-neutral-600 text-neutral-200 placeholder:text-neutral-500" : "bg-white border-sandstorm-s40 text-forest-f60"
              )}
            />

            <input
              type="date"
              value={filters.date_from ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className={cn(
                FILTER_CTRL_H,
                "px-2 py-0 text-xs border rounded w-full sm:w-auto lg:w-[9.5rem] lg:flex-shrink-0 leading-normal",
                isDark ? "bg-neutral-800 border-neutral-600 text-neutral-200" : "bg-white border-sandstorm-s40 text-forest-f60"
              )}
            />

            <input
              type="date"
              value={filters.date_to ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className={cn(
                FILTER_CTRL_H,
                "px-2 py-0 text-xs border rounded w-full sm:w-auto lg:w-[9.5rem] lg:flex-shrink-0 leading-normal",
                isDark ? "bg-neutral-800 border-neutral-600 text-neutral-200" : "bg-white border-sandstorm-s40 text-forest-f60"
              )}
            />

            <button
              type="button"
              onClick={() => {
                if (currentPage !== 1) {
                  setCurrentPage(1);
                } else {
                  void fetchHistory(1);
                }
              }}
              className={cn(
                FILTER_CTRL_H,
                "px-3 py-0 text-xs rounded-lg transition-all whitespace-nowrap w-full sm:w-auto lg:flex-shrink-0 inline-flex items-center justify-center",
                isDark
                  ? "bg-[#2DD4BF]/20 text-[#2DD4BF] hover:bg-[#2DD4BF]/30 border border-[#2DD4BF]/30"
                  : "bg-forest-f40 text-white hover:bg-forest-f50 shadow-sm"
              )}
            >
              Apply Filters
            </button>
          </div>

          {sortedExecutions.length === 0 ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-6 text-center text-sm",
                isDark ? "border-neutral-700 bg-neutral-700/20 text-neutral-300" : "border-sandstorm-s40 bg-sandstorm-s5 text-forest-f50"
              )}
            >
              No execution history found.
            </div>
          ) : (
            sortedExecutions.map((execution) => {
              const style = STATUS_STYLES[execution.status] || STATUS_STYLES.proposed;
              const isExpanded = expandedRows.has(execution.id);
              const entityIds = getDisplayEntities(execution);
              const entityCount = entityIds.length;
              const params = parseActionParams(execution.action_params);
              const resultForDisplay = parseExecutionResultPayload(execution.result);
              const actionTypeColors =
                ACTION_TYPE_COLORS[execution.action_type] || ACTION_TYPE_COLORS.change_state;
              const actionSummary = renderActionParams(execution.action_type, params, isDark);

              return (
                <div
                  key={execution.id}
                  className={cn(
                    "rounded-xl border overflow-hidden",
                    isDark ? "border-neutral-700 bg-neutral-700/20" : "border-sandstorm-s40 bg-white"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(execution.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center justify-between gap-3",
                      isDark ? "hover:bg-neutral-700/50" : "hover:bg-sandstorm-s5"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("w-2 h-2 rounded-full", style.dot)} />
                        <style.Icon className={cn("w-3.5 h-3.5", style.text)} />
                        <span className={cn("text-xs font-semibold uppercase", style.text)}>{execution.status}</span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide",
                            isDark
                              ? actionTypeColors.darkBg + " " + actionTypeColors.darkText
                              : actionTypeColors.bg + " " + actionTypeColors.text
                          )}
                        >
                          {ACTION_TYPE_LABELS[execution.action_type] || execution.action_type}
                        </span>
                        <span className={cn("text-[11px]", isDark ? "text-neutral-400" : "text-forest-f30")}>
                          • {entityCount} entit{entityCount === 1 ? "y" : "ies"}
                        </span>
                      </div>
                      <p className={cn("text-[11px] mt-1", isDark ? "text-neutral-400" : "text-forest-f30")}>
                        Proposed: {formatDateTime(execution.proposed_at)}
                        {execution.executed_at ? ` • Executed: ${formatDateTime(execution.executed_at)}` : ""}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={cn("w-4 h-4 shrink-0", isDark ? "text-neutral-500" : "text-forest-f30")} />
                    ) : (
                      <ChevronDown className={cn("w-4 h-4 shrink-0", isDark ? "text-neutral-500" : "text-forest-f30")} />
                    )}
                  </button>

                  {isExpanded && (
                    <div className={cn("px-4 py-3 border-t space-y-3", isDark ? "border-neutral-700" : "border-sandstorm-s40/60")}>
                      <div className="text-[11px]">
                        <p className={cn("font-semibold mb-1", isDark ? "text-neutral-200" : "text-forest-f60")}>
                          Entities:
                        </p>
                        {entityIds.length > 0 ? (
                          <ul className={cn("ml-4 list-disc space-y-0.5", isDark ? "text-neutral-300" : "text-forest-f50")}>
                            {entityIds.map((entity, idx) => (
                              <li key={`${entity.id}-${idx}`} className="text-sm">
                                {entity.name || "—"} ({entity.id || "—"})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={cn(isDark ? "text-neutral-400" : "text-forest-f30")}>—</p>
                        )}
                      </div>

                      {execution.action_type === "change_state" ? (
                        <div className="text-[11px]">
                          <p className={cn("font-semibold mb-1", isDark ? "text-neutral-200" : "text-forest-f60")}>
                            New State:
                          </p>
                        </div>
                      ) : actionSummary ? (
                        <div className="text-[11px]">
                          <p className={cn("font-semibold mb-1", isDark ? "text-neutral-200" : "text-forest-f60")}>
                            Action:
                          </p>
                          {actionSummary}
                        </div>
                      ) : 
                      <div className="text-[11px]">
                        <p className={cn("font-semibold mb-1", isDark ? "text-neutral-200" : "text-forest-f60")}>
                          New Values:
                        </p>
                      </div>
                    }

                      {renderActionParamsDetail(
                        params,
                        isDark,
                        execution.action_type === "change_state" ? ["state"] : undefined
                      )}


                      <div className="text-[11px]">
                        <p className={cn("font-semibold mb-1", isDark ? "text-neutral-200" : "text-forest-f60")}>Rule:</p>
                        <p className={cn(isDark ? "text-neutral-400" : "text-forest-f30")}>ID: {execution.action_rule_id}</p>
                        <p className={cn(isDark ? "text-neutral-400" : "text-forest-f30")}>Entity type: {execution.entity_type}</p>
                        <p className={cn(isDark ? "text-neutral-400" : "text-forest-f30")}>Platform: {execution.platform}</p>
                      </div>

                      {execution.error && (
                        <div className={cn(
                          "rounded-lg px-3 py-2 text-[11px]",
                          isDark ? "bg-red-900/20 text-red-300 border border-red-800/40" : "bg-red-r0 text-red-r30 border border-red-200"
                        )}>
                          {execution.error}
                        </div>
                      )}

                      {execution.result != null && (
                        <details>
                          <summary className={cn("cursor-pointer text-[11px] font-medium", isDark ? "text-neutral-300" : "text-forest-f50")}>Result payload</summary>
                          <pre className={cn(
                            "mt-2 text-[10px] p-2 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap break-words",
                            isDark ? "bg-neutral-900 text-neutral-300" : "bg-sandstorm-s5 text-forest-f60"
                          )}>
                            {formatActionParamValue(resultForDisplay)}
                          </pre>
                        </details>
                      )}

                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="flex items-center justify-end mt-4">
            <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                type="button"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = Math.min(totalPages - 4, currentPage - 2) + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-white text-[#136D6D] font-semibold"
                        : "text-black hover:bg-gray-50"
                    }`}
                    type="button"
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(Math.max(1, totalPages), prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
