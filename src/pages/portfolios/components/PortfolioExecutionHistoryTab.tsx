import React, { useEffect, useState, useMemo } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Loader } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import {
  getPortfolioTrail,
  getPortfolioActionHistory,
} from "../../../services/portfolioActions";
import type { PortfolioTrailEntry } from "../../../services/portfolioActions";

type SubTab = "trail" | "executions";

const EVENT_ICON: Record<string, React.ReactNode> = {
  created: <Zap className="w-3.5 h-3.5 text-forest-f40" />,
  approved: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  declined: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  paused: <PauseCircle className="w-3.5 h-3.5 text-amber-500" />,
  resumed: <PlayCircle className="w-3.5 h-3.5 text-green-500" />,
  disabled: <XCircle className="w-3.5 h-3.5 text-forest-f20" />,
  executed: <CheckCircle2 className="w-3.5 h-3.5 text-forest-f40" />,
  reanalyzed: <RefreshCw className="w-3.5 h-3.5 text-blue-500" />,
  status_changed: <ArrowRight className="w-3.5 h-3.5 text-forest-f30" />,
  evaluated: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
};

const EVENT_LABEL: Record<string, string> = {
  created: "Created",
  approved: "Approved",
  declined: "Declined",
  paused: "Paused",
  resumed: "Resumed",
  disabled: "Disabled",
  executed: "Executed",
  reanalyzed: "Re-analyzed",
  status_changed: "Status Changed",
  evaluated: "Evaluated",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "success"
      ? "bg-green-100 text-green-700 border-green-300"
      : s === "failed" || s === "error"
        ? "bg-red-100 text-red-700 border-red-300"
        : s === "queued"
          ? "bg-blue-100 text-blue-700 border-blue-300"
          : s === "skipped"
            ? "bg-sandstorm-s20 text-forest-f30 border-sandstorm-s40"
            : "bg-amber-100 text-amber-700 border-amber-300";
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cls)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface PreviewEntity {
  id: string;
  name: string;
  before?: Record<string, number>;
  after?: Record<string, number>;
  data?: Record<string, unknown>;
}

function ExecutionCard({ exec }: { exec: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true);

  const execStatus = String(exec.status ?? "unknown");
  const isSuccess = execStatus === "success";
  const isFailed = execStatus === "failed" || execStatus === "error";
  const entityIds = Array.isArray(exec.entity_ids) ? (exec.entity_ids as string[]) : [];
  const result = exec.result as Record<string, unknown> | null | undefined;
  const error = exec.error as string | null | undefined;
  const actionParams = exec.action_params as Record<string, unknown> | null | undefined;

  const previewResult = useMemo<PreviewEntity[]>(() => {
    if (Array.isArray(exec.preview_result) && exec.preview_result.length > 0) {
      return exec.preview_result as PreviewEntity[];
    }
    if (result && Array.isArray(result.proposal)) {
      return result.proposal as PreviewEntity[];
    }
    if (result && Array.isArray((result as Record<string, unknown>).entities)) {
      return (result as Record<string, unknown>).entities as PreviewEntity[];
    }
    return [];
  }, [exec.preview_result, result]);

  const hasDetails = previewResult.length > 0 || entityIds.length > 0;

  return (
    <div
      className={cn(
        "border rounded-xl overflow-hidden transition-colors",
        isSuccess
          ? "border-green-200 bg-green-50/20"
          : isFailed
            ? "border-red-200 bg-red-50/20"
            : "border-sandstorm-s40 bg-white",
      )}
    >
      {/* Header row — clickable to toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left",
          isSuccess ? "hover:bg-green-50/40" : isFailed ? "hover:bg-red-50/40" : "hover:bg-sandstorm-s5",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isSuccess ? (
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          ) : isFailed ? (
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-semibold text-forest-f60 truncate">
                {String(exec.action_rule_id ?? `Execution #${exec.id}`)}
              </span>
              <StatusBadge status={execStatus} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f20 font-mono">
                {String(exec.action_type ?? "—")}
              </span>
              <span className="text-[10px] text-forest-f20">
                {String(exec.platform ?? "")} / {String(exec.entity_type ?? "")}
              </span>
              {exec.action_id != null && (
                <span className="text-[10px] text-forest-f20">Action #{String(exec.action_id)}</span>
              )}
              {entityIds.length > 0 && (
                <span className="text-[10px] text-forest-f30 font-medium">
                  · {entityIds.length} {entityIds.length === 1 ? "entity" : "entities"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-[11px] text-forest-f30">
              {exec.executed_at
                ? formatDate(String(exec.executed_at))
                : exec.proposed_at
                  ? formatDate(String(exec.proposed_at))
                  : ""}
            </p>
          </div>
          {hasDetails && (
            expanded
              ? <ChevronDown className="w-4 h-4 text-forest-f20" />
              : <ChevronRight className="w-4 h-4 text-forest-f20" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Action params */}
          {actionParams && typeof actionParams === "object" && Object.keys(actionParams).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium text-forest-f30">Parameters:</span>
              {Object.entries(actionParams)
                .filter(([k]) => !k.startsWith("_"))
                .slice(0, 8)
                .map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-sandstorm-s10 text-forest-f30">
                    <span className="font-medium">{k}:</span> {JSON.stringify(v)}
                  </span>
                ))}
            </div>
          )}

          {/* Entity detail table from preview_result */}
          {previewResult.length > 0 && (
            <div className="border border-sandstorm-s40 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-sandstorm-s10 border-b border-sandstorm-s40">
                    <th className="px-3 py-2 text-[10px] font-semibold text-forest-f30 uppercase tracking-wider">Entity</th>
                    {previewResult.some((e) => e.before) && (
                      <th className="px-3 py-2 text-[10px] font-semibold text-forest-f30 uppercase tracking-wider">Was</th>
                    )}
                    {previewResult.some((e) => e.after) && (
                      <th className="px-3 py-2 text-[10px] font-semibold text-forest-f30 uppercase tracking-wider">Changed to</th>
                    )}
                    <th className="px-3 py-2 text-[10px] font-semibold text-forest-f30 uppercase tracking-wider w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.map((entity, i) => {
                    const hasBefore = previewResult.some((e) => e.before);
                    const hasAfter = previewResult.some((e) => e.after);
                    return (
                      <tr key={entity.id || i} className={cn("border-b border-sandstorm-s40/50 last:border-b-0", i % 2 === 0 ? "bg-white" : "bg-sandstorm-s5/50")}>
                        <td className="px-3 py-2">
                          <div className="text-[11px] font-medium text-forest-f60">{entity.name || entity.id}</div>
                          {entity.name && entity.id && (
                            <div className="text-[10px] text-forest-f20 font-mono">ID: {entity.id}</div>
                          )}
                        </td>
                        {hasBefore && (
                          <td className="px-3 py-2 text-[11px] text-forest-f30">
                            {entity.before
                              ? Object.entries(entity.before).map(([k, v]) => (
                                  <div key={k} className="text-[11px]">
                                    <span className="text-forest-f20">{k}:</span>{" "}
                                    <span className="font-medium text-forest-f30 line-through">{typeof v === "number" ? v.toLocaleString() : String(v)}</span>
                                  </div>
                                ))
                              : "—"}
                          </td>
                        )}
                        {hasAfter && (
                          <td className="px-3 py-2">
                            {entity.after
                              ? Object.entries(entity.after).map(([k, v]) => (
                                  <div key={k} className="text-[11px]">
                                    <span className="text-forest-f20">{k}:</span>{" "}
                                    <span className="font-semibold text-emerald-600">{typeof v === "number" ? v.toLocaleString() : String(v)}</span>
                                  </div>
                                ))
                              : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Updated
                            </span>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          ) : (
                            <span className="text-[10px] text-forest-f20">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Fallback: show entity ID badges when no preview_result */}
          {previewResult.length === 0 && entityIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-sandstorm-s40/50">
              <span className="text-[10px] text-forest-f30 font-medium mr-1">Affected entities:</span>
              {entityIds.slice(0, 20).map((eid, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-forest-f40/10 text-forest-f40 font-mono"
                >
                  {String(eid)}
                </span>
              ))}
              {entityIds.length > 20 && (
                <span className="text-[10px] text-forest-f20">+{entityIds.length - 20} more</span>
              )}
            </div>
          )}

          {/* Execution summary from result */}
          {isSuccess && result && typeof result === "object" && (() => {
            const execRes = (result.exec_result ?? result) as Record<string, unknown>;
            const updated = typeof execRes.updated === "number" ? execRes.updated : null;
            const failed = typeof execRes.failed === "number" ? execRes.failed : null;
            const errors = Array.isArray(execRes.errors) ? execRes.errors.filter(Boolean) : [];
            if (updated === null && failed === null) return null;
            return (
              <div className="flex items-center gap-2 pt-1 border-t border-sandstorm-s40/50">
                {updated !== null && updated > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {updated} updated
                  </span>
                )}
                {failed !== null && failed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-medium">
                    <XCircle className="w-3 h-3" /> {failed} failed
                  </span>
                )}
                {failed === 0 && updated !== null && (
                  <span className="text-[10px] text-green-600">No errors</span>
                )}
                {errors.length > 0 && errors.map((err, i) => (
                  <span key={i} className="text-[10px] text-red-500">{String(err)}</span>
                ))}
              </div>
            );
          })()}

          {/* Error */}
          {error && (
            <div className="pt-1 border-t border-sandstorm-s40/50">
              <p className="text-[10px] font-medium text-red-600 mb-1">Error:</p>
              <div className="text-[11px] text-red-600 bg-red-50 rounded-lg p-2.5 border border-red-200 break-words overflow-hidden">
                {String(error)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PortfolioExecutionHistoryTab({
  accountId,
  portfolioId,
}: {
  accountId: number;
  portfolioId: number;
}) {
  const [subTab, setSubTab] = useState<SubTab>("executions");
  const [trail, setTrail] = useState<PortfolioTrailEntry[]>([]);
  const [executions, setExecutions] = useState<Array<Record<string, unknown>>>([]);
  const [loadingTrail, setLoadingTrail] = useState(true);
  const [loadingExec, setLoadingExec] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [trailRes, execRes] = await Promise.all([
          getPortfolioTrail(accountId, portfolioId, { limit: 500 }),
          getPortfolioActionHistory(accountId, portfolioId, { limit: 200 }),
        ]);
        if (!cancelled) {
          setTrail(trailRes);
          setExecutions(execRes.executions);
        }
      } catch {
        if (!cancelled) {
          setTrail([]);
          setExecutions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTrail(false);
          setLoadingExec(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [accountId, portfolioId]);

  const filteredExecutions = useMemo(() => {
    let items = executions;
    if (statusFilter) {
      items = items.filter((e) => String(e.status) === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          String(e.action_rule_id ?? "").toLowerCase().includes(q) ||
          String(e.action_type ?? "").toLowerCase().includes(q) ||
          String(e.entity_type ?? "").toLowerCase().includes(q) ||
          String(e.platform ?? "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [executions, statusFilter, searchQuery]);

  const filteredTrail = useMemo(() => {
    if (!searchQuery.trim()) return trail;
    const q = searchQuery.toLowerCase();
    return trail.filter(
      (t) =>
        (t.action_slug ?? "").toLowerCase().includes(q) ||
        (t.action_description ?? "").toLowerCase().includes(q) ||
        (t.action_type ?? "").toLowerCase().includes(q) ||
        (t.event_type ?? "").toLowerCase().includes(q),
    );
  }, [trail, searchQuery]);

  const execStats = useMemo(() => {
    const total = executions.length;
    const success = executions.filter((e) => String(e.status) === "success").length;
    const failed = executions.filter((e) => String(e.status) === "failed" || String(e.status) === "error").length;
    const pending = executions.filter((e) => String(e.status) === "queued" || String(e.status) === "pending").length;
    return { total, success, failed, pending };
  }, [executions]);

  return (
    <div className="space-y-4 mt-4 overflow-hidden">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-sandstorm-s40 rounded-lg p-3">
          <p className="text-[10px] text-forest-f20 uppercase tracking-wider font-medium">Total Executions</p>
          <p className="text-xl font-semibold text-forest-f60 mt-1">{execStats.total}</p>
        </div>
        <div className="bg-green-50/50 border border-green-200 rounded-lg p-3">
          <p className="text-[10px] text-green-600 uppercase tracking-wider font-medium">Successful</p>
          <p className="text-xl font-semibold text-green-700 mt-1">{execStats.success}</p>
        </div>
        <div className="bg-red-50/50 border border-red-200 rounded-lg p-3">
          <p className="text-[10px] text-red-600 uppercase tracking-wider font-medium">Failed</p>
          <p className="text-xl font-semibold text-red-700 mt-1">{execStats.failed}</p>
        </div>
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
          <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">Pending / Queued</p>
          <p className="text-xl font-semibold text-amber-700 mt-1">{execStats.pending}</p>
        </div>
      </div>

      {/* Sub-tabs + filters */}
      <div className="flex items-center justify-between border-b border-sandstorm-s40 pb-0">
        <div className="flex gap-0">
          <button
            onClick={() => setSubTab("executions")}
            className={cn(
              "px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors",
              subTab === "executions"
                ? "border-forest-f40 text-forest-f60"
                : "border-transparent text-forest-f30 hover:text-forest-f60",
            )}
          >
            Execution Runs ({executions.length})
          </button>
          <button
            onClick={() => setSubTab("trail")}
            className={cn(
              "px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors",
              subTab === "trail"
                ? "border-forest-f40 text-forest-f60"
                : "border-transparent text-forest-f30 hover:text-forest-f60",
            )}
          >
            Activity Trail ({trail.length})
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-forest-f20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-[12px] border border-sandstorm-s40 rounded-lg w-48 focus:outline-none focus:border-forest-f40 bg-white"
            />
          </div>
          {subTab === "executions" && (
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-forest-f20" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-6 py-1.5 text-[12px] border border-sandstorm-s40 rounded-lg bg-white appearance-none focus:outline-none focus:border-forest-f40"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="error">Error</option>
                <option value="queued">Queued</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {subTab === "executions" && (
        <div>
          {loadingExec ? (
            <div className="flex justify-center py-12"><Loader size="sm" /></div>
          ) : filteredExecutions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 text-forest-f20 mx-auto mb-2" />
              <p className="text-forest-f30 text-sm">
                {statusFilter || searchQuery ? "No matching executions found" : "No executions recorded yet"}
              </p>
              <p className="text-forest-f20 text-[11px] mt-1">
                Executions appear here when actions are run (manually or automatically)
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-hidden">
              {filteredExecutions.map((exec) => (
                <ExecutionCard key={String(exec.id)} exec={exec} />
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "trail" && (
        <div>
          {loadingTrail ? (
            <div className="flex justify-center py-12"><Loader size="sm" /></div>
          ) : filteredTrail.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 text-forest-f20 mx-auto mb-2" />
              <p className="text-forest-f30 text-sm">
                {searchQuery ? "No matching events found" : "No activity recorded yet"}
              </p>
              <p className="text-forest-f20 text-[11px] mt-1">
                Status changes, approvals, and other action events appear here
              </p>
            </div>
          ) : (
            <div className="relative pl-3 overflow-hidden">
              <div className="absolute left-[21px] top-4 bottom-4 w-px bg-sandstorm-s40" />
              {filteredTrail.map((entry) => (
                <div key={entry.id} className="relative flex gap-3.5 pb-5 min-w-0">
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border border-sandstorm-s40 flex items-center justify-center shadow-sm">
                    {EVENT_ICON[entry.event_type] || <Activity className="w-3.5 h-3.5 text-forest-f30" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5 bg-white border border-sandstorm-s40 rounded-xl px-4 py-3 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-forest-f60">
                        {EVENT_LABEL[entry.event_type] || entry.event_type}
                      </span>
                      {entry.old_status && entry.new_status && entry.old_status !== entry.new_status && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-forest-f30">
                          <span className="px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f20">
                            {entry.old_status}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="px-1.5 py-0.5 rounded bg-forest-f40/10 text-forest-f40 font-medium">
                            {entry.new_status}
                          </span>
                        </span>
                      )}
                      <span className="text-[10px] text-forest-f20 ml-auto flex-shrink-0">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-[12px] text-forest-f40 font-medium mt-1 truncate" title={entry.action_description || entry.action_slug}>
                      {entry.action_description || entry.action_slug}
                    </p>
                    {entry.note && (
                      <p className="text-[11px] text-forest-f30 mt-1.5 leading-relaxed line-clamp-2 break-words" title={entry.note}>{entry.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f20 font-mono">
                        {entry.action_type}
                      </span>
                      <span className="text-[10px] text-forest-f20">Action #{entry.action_id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
