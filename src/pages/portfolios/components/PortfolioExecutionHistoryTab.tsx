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
    <div className="space-y-4 mt-4">
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
            <div className="space-y-2">
              {filteredExecutions.map((exec) => {
                const execStatus = String(exec.status ?? "unknown");
                const isSuccess = execStatus === "success";
                const isFailed = execStatus === "failed" || execStatus === "error";
                const entityIds = Array.isArray(exec.entity_ids) ? (exec.entity_ids as string[]) : [];
                const result = exec.result as Record<string, unknown> | null | undefined;
                const error = exec.error as string | null | undefined;
                const actionParams = exec.action_params as Record<string, unknown> | null | undefined;

                return (
                  <div
                    key={String(exec.id)}
                    className={cn(
                      "border rounded-xl p-4 transition-colors",
                      isSuccess
                        ? "border-green-200 bg-green-50/20 hover:bg-green-50/40"
                        : isFailed
                          ? "border-red-200 bg-red-50/20 hover:bg-red-50/40"
                          : "border-sandstorm-s40 bg-white hover:bg-sandstorm-s5",
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        {isSuccess ? (
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                        ) : isFailed ? (
                          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red-500" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-500" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-forest-f60">
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
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-forest-f30">
                          {exec.executed_at
                            ? formatDate(String(exec.executed_at))
                            : exec.proposed_at
                              ? formatDate(String(exec.proposed_at))
                              : ""}
                        </p>
                        {exec.executed_at != null && exec.proposed_at != null && String(exec.executed_at) !== String(exec.proposed_at) && (
                          <p className="text-[9px] text-forest-f20 mt-0.5">
                            Proposed: {formatDate(String(exec.proposed_at))}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Affected entities */}
                    {entityIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-sandstorm-s40/50">
                        <span className="text-[10px] text-forest-f30 font-medium mr-1">Affected entities:</span>
                        {entityIds.slice(0, 10).map((eid, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-forest-f40/10 text-forest-f40 font-mono"
                          >
                            {String(eid)}
                          </span>
                        ))}
                        {entityIds.length > 10 && (
                          <span className="text-[10px] text-forest-f20">+{entityIds.length - 10} more</span>
                        )}
                      </div>
                    )}

                    {/* Action params summary */}
                    {actionParams && typeof actionParams === "object" && Object.keys(actionParams).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-sandstorm-s40/50">
                        <p className="text-[10px] font-medium text-forest-f30 mb-1">Parameters:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(actionParams)
                            .filter(([k]) => !k.startsWith("_"))
                            .slice(0, 6)
                            .map(([k, v]) => (
                              <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-sandstorm-s10 text-forest-f30">
                                <span className="font-medium">{k}:</span> {JSON.stringify(v)}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Result */}
                    {result && typeof result === "object" && Object.keys(result).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-sandstorm-s40/50">
                        <p className="text-[10px] font-medium text-green-600 mb-1">Result:</p>
                        <div className="text-[11px] text-forest-f30 bg-white rounded-lg p-2.5 border border-sandstorm-s40">
                          {JSON.stringify(result, null, 2).slice(0, 400)}
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="mt-2 pt-2 border-t border-sandstorm-s40/50">
                        <p className="text-[10px] font-medium text-red-600 mb-1">Error:</p>
                        <div className="text-[11px] text-red-600 bg-red-50 rounded-lg p-2.5 border border-red-200">
                          {String(error)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            <div className="relative pl-3">
              <div className="absolute left-[21px] top-4 bottom-4 w-px bg-sandstorm-s40" />
              {filteredTrail.map((entry) => (
                <div key={entry.id} className="relative flex gap-3.5 pb-5">
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border border-sandstorm-s40 flex items-center justify-center shadow-sm">
                    {EVENT_ICON[entry.event_type] || <Activity className="w-3.5 h-3.5 text-forest-f30" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5 bg-white border border-sandstorm-s40 rounded-xl px-4 py-3">
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
                    <p className="text-[12px] text-forest-f40 font-medium mt-1 truncate">
                      {entry.action_description || entry.action_slug}
                    </p>
                    {entry.note && (
                      <p className="text-[11px] text-forest-f30 mt-1.5 leading-relaxed">{entry.note}</p>
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
