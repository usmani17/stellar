import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  History,
  X,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  CornerDownRight,
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import { Dropdown } from "../../../../components/ui";
import type { ActionHistoryParams, ActionHistoryResponse } from "../../../../services/dashboardActions";
import type { ActionExecution, ActionType } from "../../types/dashboard";
import { ACTION_TYPE_LABELS } from "./actionTypeDisplay";

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Types" },
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

const PAGE_SIZE = 15;
const CTRL_H = "h-8 min-h-[32px]";

const STATUS_MAP: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  dot: string;
  dotDark: string;
}> = {
  success:   { icon: CheckCircle2, label: "Success", dot: "text-emerald-600", dotDark: "text-emerald-400" },
  failed:    { icon: XCircle, label: "Failed", dot: "text-red-500", dotDark: "text-red-400" },
  executing: { icon: Clock3, label: "Running", dot: "text-amber-500", dotDark: "text-amber-400" },
  dry_run:   { icon: AlertTriangle, label: "Dry run", dot: "text-sky-500", dotDark: "text-sky-400" },
  previewed: { icon: Eye, label: "Preview", dot: "text-sky-500", dotDark: "text-sky-400" },
  proposed:  { icon: History, label: "Proposed", dot: "text-indigo-500", dotDark: "text-indigo-400" },
  rejected:  { icon: XCircle, label: "Rejected", dot: "text-neutral-400", dotDark: "text-neutral-500" },
};

function fmtTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return "Today, " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString())
    return "Yesterday, " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface ParsedEntity {
  id: string;
  name: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

function parseEntities(raw: unknown): ParsedEntity[] {
  if (raw == null) return [];
  let arr: unknown[];
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); arr = Array.isArray(p) ? p : []; } catch { return []; }
  } else if (Array.isArray(raw)) { arr = raw; }
  else return [];
  return arr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = String(o.id ?? o.ent_row_id ?? o.campaign_id ?? o.ad_group_id ?? "");
      const name = String(o.name ?? o.entity_name ?? "");
      if (!id && !name) return null;
      const entry: ParsedEntity = { id, name: name || id };
      if (o.before && typeof o.before === "object") entry.before = o.before as Record<string, unknown>;
      if (o.after && typeof o.after === "object") entry.after = o.after as Record<string, unknown>;
      return entry;
    })
    .filter((e): e is ParsedEntity => e != null);
}

function parseResult(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw) ?? {}; } catch { return {}; } }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function parseParams(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw) ?? {}; } catch { return {}; } }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function summarizeChange(actionType: string, params: Record<string, unknown>, result: Record<string, unknown>): string {
  if (actionType === "change_state") {
    const state = String(params.state ?? params.status ?? result.new_status ?? "").toUpperCase();
    return state ? `Status → ${state}` : "";
  }
  if (actionType === "adjust_budget") {
    const change = params.change_type ?? params.adjustment_type ?? "";
    const v = params.value ?? params.amount ?? "";
    const u = params.unit === "percent" ? "%" : "";
    return `Budget ${change} ${v}${u}`.trim();
  }
  if (actionType === "set_ad_schedule") {
    const desc = result.description ?? result.message ?? "";
    return desc ? String(desc) : "Ad schedule applied";
  }
  if (actionType === "add_negative_keyword" || actionType === "add_keyword") {
    const n = Array.isArray(params.keywords) ? params.keywords.length : 0;
    return n ? `${n} keyword${n > 1 ? "s" : ""} added` : "";
  }
  if (actionType === "adjust_bid") {
    const change = params.change_type ?? params.adjustment_type ?? "";
    const v = params.value ?? params.amount ?? "";
    return `Bid ${change} ${v}`.trim();
  }
  const msg = result.message ?? result.description ?? "";
  return msg ? String(msg) : "";
}

function fmtCurrency(v: unknown): string {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v ?? "");
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function entityChangeLabel(
  entity: ParsedEntity,
  actionType: string,
  params: Record<string, unknown>,
): React.ReactNode {
  const { before, after } = entity;

  if (actionType === "adjust_budget" && before?.budget != null && after?.budget != null) {
    return <>{fmtCurrency(before.budget)} → {fmtCurrency(after.budget)}</>;
  }
  if (actionType === "adjust_bid" && before?.bid != null && after?.bid != null) {
    return <>{fmtCurrency(before.bid)} → {fmtCurrency(after.bid)}</>;
  }
  if (actionType === "change_state" && before?.status != null && after?.status != null) {
    return <>{String(before.status)} → {String(after.status)}</>;
  }

  if (actionType === "adjust_budget") {
    const change = params.change_type ?? params.adjustment_type ?? "";
    const v = params.value ?? params.amount ?? "";
    const u = params.unit === "percent" ? "%" : "";
    return <>{`Budget ${change} ${v}${u}`.trim()}</>;
  }
  if (actionType === "change_state") {
    return <>→ {String(params.state ?? params.status ?? "ENABLED").toUpperCase()}</>;
  }
  if (actionType === "set_ad_schedule") return <>Schedule applied</>;
  if (actionType === "add_negative_keyword" || actionType === "add_keyword") {
    const kws = Array.isArray(params.keywords) ? params.keywords : [];
    return <>{kws.length ? kws.slice(0, 3).join(", ") + (kws.length > 3 ? ` +${kws.length - 3}` : "") : "Keywords added"}</>;
  }
  if (actionType === "adjust_bid") {
    const change = params.change_type ?? params.adjustment_type ?? "";
    const v = params.value ?? params.amount ?? "";
    return <>{`Bid ${change} ${v}`.trim()}</>;
  }
  return <>Updated</>;
}

export const ActionHistoryModal: React.FC<ActionHistoryModalProps> = ({
  isOpen, onClose, executions, isDark, onShowHistory,
}) => {
  const [filters, setFilters] = useState<ActionHistoryParams>({ status: "", action_type: "", search: "", date_from: "", date_to: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const statusOpts = [
    { value: "", label: "All Status" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "executing", label: "Running" },
    { value: "dry_run", label: "Dry Run" },
    { value: "proposed", label: "Proposed" },
  ];

  const sorted = useMemo(
    () => [...executions].sort((a, b) => new Date(b.proposed_at).getTime() - new Date(a.proposed_at).getTime()),
    [executions]
  );

  const fetchHistory = useCallback(async (page: number) => {
    if (!onShowHistory) return;
    try {
      const result = await onShowHistory({
        status: filters.status || undefined, action_type: filters.action_type || undefined,
        search: filters.search || undefined, date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
      });
      setTotalPages(Math.ceil((result?.total ?? 0) / PAGE_SIZE));
    } catch (err) { console.error("Failed to fetch action history:", err); }
  }, [filters, onShowHistory]);

  useEffect(() => { if (isOpen) setCurrentPage(1); }, [isOpen]);
  useEffect(() => { if (isOpen) void fetchHistory(currentPage); }, [currentPage, isOpen, fetchHistory]);

  if (!isOpen) return null;

  const dropdownBtn = cn(
    CTRL_H,
    "w-full px-2.5 py-0 border rounded-md text-[11.5px] focus:outline-none inline-flex items-center justify-between gap-1.5",
    isDark ? "border-neutral-600 bg-neutral-900 text-neutral-200" : "border-sandstorm-s40 bg-white text-forest-f60"
  );

  const thCls = cn(
    "px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] border-b whitespace-nowrap",
    isDark ? "text-neutral-500 border-neutral-800" : "text-forest-f30/70 border-sandstorm-s40/50"
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className={cn(
        "relative w-full max-w-[92vw] xl:max-w-7xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col",
        isDark ? "bg-neutral-900 border border-neutral-700/80" : "bg-white border border-sandstorm-s40/80"
      )}>

        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-5 py-3 border-b shrink-0",
          isDark ? "border-neutral-800" : "border-sandstorm-s40/50"
        )}>
          <div className="flex items-center gap-2.5">
            <History className={cn("w-4 h-4", isDark ? "text-[#2DD4BF]" : "text-forest-f40")} />
            <h2 className={cn("text-[13px] font-semibold", isDark ? "text-neutral-100" : "text-forest-f60")}>
              Execution History
            </h2>
            <span className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-full font-medium tabular-nums",
              isDark ? "bg-neutral-800 text-neutral-400" : "bg-sandstorm-s5 text-forest-f30"
            )}>{sorted.length}</span>
          </div>
          <button type="button" onClick={onClose} className={cn(
            "p-1.5 rounded-md transition-colors",
            isDark ? "hover:bg-neutral-800 text-neutral-500" : "hover:bg-sandstorm-s20 text-forest-f30"
          )} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className={cn("px-5 py-2 border-b shrink-0", isDark ? "border-neutral-800" : "border-sandstorm-s40/30")}>
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
            <Dropdown options={statusOpts} value={filters.status ?? ""} onChange={(v) => setFilters((p) => ({ ...p, status: v }))}
              placeholder="All Status" closeOnSelect className="w-28"
              buttonClassName={dropdownBtn} menuClassName={cn(isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40")} />
            <Dropdown options={ACTION_TYPE_OPTIONS} value={filters.action_type ?? ""} onChange={(v) => setFilters((p) => ({ ...p, action_type: v }))}
              placeholder="All Types" closeOnSelect className="w-36"
              buttonClassName={dropdownBtn} menuClassName={cn(isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40")} />
            <input type="text" placeholder="Search rule…" value={filters.search ?? ""}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className={cn(CTRL_H, "px-2.5 text-[11.5px] border rounded-md flex-1 min-w-[100px]",
                isDark ? "bg-neutral-900 border-neutral-600 text-neutral-200 placeholder:text-neutral-600" : "bg-white border-sandstorm-s40 text-forest-f60 placeholder:text-forest-f30/40"
              )} />
            <input type="date" value={filters.date_from ?? ""} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
              className={cn(CTRL_H, "px-2 text-[11px] border rounded-md w-[7.5rem]",
                isDark ? "bg-neutral-900 border-neutral-600 text-neutral-200" : "bg-white border-sandstorm-s40 text-forest-f60"
              )} />
            <span className={cn("text-[10px]", isDark ? "text-neutral-600" : "text-forest-f30/40")}>–</span>
            <input type="date" value={filters.date_to ?? ""} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
              className={cn(CTRL_H, "px-2 text-[11px] border rounded-md w-[7.5rem]",
                isDark ? "bg-neutral-900 border-neutral-600 text-neutral-200" : "bg-white border-sandstorm-s40 text-forest-f60"
              )} />
            <button type="button"
              onClick={() => { if (currentPage !== 1) setCurrentPage(1); else void fetchHistory(1); }}
              className={cn(CTRL_H, "px-3 text-[11px] font-medium rounded-md whitespace-nowrap",
                isDark ? "bg-[#2DD4BF]/15 text-[#2DD4BF] hover:bg-[#2DD4BF]/25" : "bg-forest-f40 text-white hover:bg-forest-f50"
              )}>
              Apply
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {sorted.length === 0 ? (
            <div className={cn("py-16 text-center", isDark ? "text-neutral-500" : "text-forest-f30/60")}>
              <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">No executions yet</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className={cn("sticky top-0 z-10 text-left", isDark ? "bg-neutral-900" : "bg-[#F7F7F4]")}>
                  <th className={cn(thCls, "w-[90px]")}>Status</th>
                  <th className={cn(thCls)}>Rule</th>
                  <th className={cn(thCls, "w-[150px]")}>Type</th>
                  <th className={cn(thCls)}>Summary</th>
                  <th className={cn(thCls, "w-[180px] text-right pr-5")}>Executed</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((exec) => {
                  const st = STATUS_MAP[exec.status] ?? STATUS_MAP.proposed;
                  const StIcon = st.icon;
                  const entities = parseEntities(exec.entity_ids);
                  const params = parseParams(exec.action_params);
                  const result = parseResult(exec.result);
                  const summary = summarizeChange(exec.action_type, params, result);
                  const isFailed = exec.status === "failed";

                  return (
                    <React.Fragment key={exec.id}>
                      {/* Parent row */}
                      <tr className={cn(
                        "border-b transition-colors",
                        isDark ? "border-neutral-800/60 hover:bg-neutral-800/40" : "border-sandstorm-s40/30 hover:bg-sandstorm-s5/50",
                        isFailed && (isDark ? "bg-red-950/10" : "bg-red-50/30")
                      )}>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <StIcon className={cn("w-3.5 h-3.5", isDark ? st.dotDark : st.dot)} />
                            <span className={cn("text-[11px] font-medium", isDark ? st.dotDark : st.dot)}>{st.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-[12px] font-semibold", isDark ? "text-neutral-100" : "text-forest-f60")}>
                            {exec.action_rule_id}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-[11px]", isDark ? "text-neutral-400" : "text-forest-f30")}>
                            {ACTION_TYPE_LABELS[exec.action_type] || exec.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {exec.error ? (
                            <span className="text-[11px] text-red-500 truncate block max-w-[400px]" title={exec.error}>
                              {exec.error}
                            </span>
                          ) : summary ? (
                            <span className={cn("text-[11.5px]", isDark ? "text-neutral-300" : "text-forest-f50")}>
                              {summary}
                            </span>
                          ) : (
                            <span className={cn("text-[11px]", isDark ? "text-neutral-600" : "text-forest-f30/40")}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right pr-5">
                          <span className={cn("text-[11.5px] tabular-nums", isDark ? "text-neutral-300" : "text-forest-f50")}>
                            {fmtTime(exec.executed_at || exec.proposed_at)}
                          </span>
                        </td>
                      </tr>

                      {/* Child rows — always visible, indented */}
                      {entities.map((entity, idx) => (
                        <tr
                          key={`${exec.id}-${entity.id}-${idx}`}
                          className={cn(
                            idx === entities.length - 1 ? "border-b" : "",
                            isDark
                              ? "border-neutral-800/40 bg-neutral-800/15"
                              : "border-sandstorm-s40/15 bg-[#FCFCF9]"
                          )}
                        >
                          {/* Indent — empty status area */}
                          <td className="py-1.5" />

                          {/* Entity name — indented with icon */}
                          <td className="py-1.5 pr-4" colSpan={2}>
                            <div className="flex items-center gap-2 pl-6">
                              <CornerDownRight className={cn(
                                "w-3 h-3 shrink-0",
                                isDark ? "text-neutral-700" : "text-sandstorm-s40"
                              )} />
                              <span className={cn("text-[11.5px]", isDark ? "text-neutral-200" : "text-forest-f60")}>
                                {entity.name}
                              </span>
                              {entity.id && entity.id !== entity.name && (
                                <span className={cn("text-[10px] tabular-nums", isDark ? "text-neutral-600" : "text-forest-f30/35")}>
                                  {entity.id}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Change detail */}
                          <td className="px-4 py-1.5">
                            <span className={cn("text-[11px] tabular-nums", isDark ? "text-neutral-400" : "text-forest-f30/70")}>
                              {entityChangeLabel(entity, exec.action_type, params)}
                            </span>
                          </td>

                          {/* Empty time */}
                          <td className="py-1.5 pr-5" />
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Pagination */}
        {(totalPages > 1 || sorted.length > 0) && (
          <div className={cn(
            "flex items-center justify-between px-5 py-2.5 border-t shrink-0",
            isDark ? "border-neutral-800 bg-neutral-900" : "border-sandstorm-s40/40 bg-[#FAFAF7]"
          )}>
            <p className={cn("text-[11px] tabular-nums", isDark ? "text-neutral-500" : "text-forest-f30/60")}>
              {sorted.length} result{sorted.length === 1 ? "" : "s"}
              {totalPages > 1 && <> &middot; Page {currentPage}/{totalPages}</>}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className={cn("p-1 rounded-md transition-colors disabled:opacity-20",
                    isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-sandstorm-s20 text-forest-f30"
                  )}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pg = i + 1;
                  if (totalPages > 5 && currentPage > 3) pg = Math.min(totalPages - 4, currentPage - 2) + i;
                  return (
                    <button key={pg} type="button" onClick={() => setCurrentPage(pg)}
                      className={cn("w-6 h-6 rounded-md text-[11px] font-medium transition-colors",
                        currentPage === pg
                          ? isDark ? "bg-[#2DD4BF]/15 text-[#2DD4BF]" : "bg-forest-f40/10 text-forest-f40"
                          : isDark ? "text-neutral-500 hover:bg-neutral-800" : "text-forest-f30/60 hover:bg-sandstorm-s20"
                      )}>
                      {pg}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className={cn("p-1 rounded-md transition-colors disabled:opacity-20",
                    isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-sandstorm-s20 text-forest-f30"
                  )}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
