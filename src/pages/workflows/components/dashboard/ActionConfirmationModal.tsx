import React, { useState, useEffect, useRef } from "react";
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  Sparkles,
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import type { ActionProposal, ActionEntityDiff, ActionRule, DashboardComponent } from "../../types/dashboard";
import {
  KeywordAnalysisResultView,
  parseKeywordAnalysisPayload,
  type KeywordAnalysisPersistContext,
  type KeywordAnalysisStoredPayload,
} from "./KeywordAnalysisResultView";
import {
  buildKeywordAnalysisPayloadFromProposal,
  extractKeywordAnalysisBlock,
  streamKeywordAnalysis,
  type ExecuteActionsResponse,
} from "../../../../services/dashboardActions";
import { getKeywordAnalysisDateRangeFromComponent } from "../../utils/keywordAnalysisDateRange";

const ACTION_TYPE_LABELS: Record<string, string> = {
  change_state: "Change status",
  adjust_budget: "Adjust budget",
  adjust_bid: "Adjust bid",
  add_keyword: "Add keywords",
  add_negative_keyword: "Add negative keywords",
  update_device_bid_modifier: "Adjust device bid",
};

function isKeywordAnalysisActionType(
  t: string
): t is "add_keyword" | "add_negative_keyword" {
  return t === "add_keyword" || t === "add_negative_keyword";
}

function ruleHasPersistedKeywordAnalysis(rule: ActionRule): boolean {
  if (rule.keyword_analysis != null) return true;
  const err = rule.keyword_analysis_error;
  return typeof err === "string" && err.length > 0;
}

/** Stable order from first appearance; one row per entity id with all diffs stacked. */
function groupEntityDiffsById(entities: ActionEntityDiff[]): Array<{
  entityId: string;
  displayName: string;
  rows: ActionEntityDiff[];
}> {
  const byId = new Map<string, ActionEntityDiff[]>();
  const order: string[] = [];
  entities.forEach((ent, idx) => {
    const raw = String(ent.id ?? "").trim();
    const key = raw || `__row_${idx}`;
    if (!byId.has(key)) {
      order.push(key);
      byId.set(key, []);
    }
    byId.get(key)!.push(ent);
  });
  return order.map((entityId) => {
    const rows = byId.get(entityId)!;
    const named = rows.find((r) => r.name && String(r.name).trim())?.name;
    const displayName = named
      ? String(named)
      : entityId.startsWith("__row_")
        ? String(rows[0]?.id ?? "") || "—"
        : entityId;
    return { entityId, displayName, rows };
  });
}

/** Unique entities in the preview table (matches grouping by `id`). */
function groupedEntityCount(proposal: ActionProposal): number {
  return groupEntityDiffsById(proposal.entities).length;
}

function shouldShowKeywordAnalysisSection(proposal: ActionProposal, rule: ActionRule): boolean {
  if (!isKeywordAnalysisActionType(rule.type)) return false;
  if (proposal.guardrail_blocks.length > 0) return false;
  if (groupedEntityCount(proposal) > 0) return true;
  return ruleHasPersistedKeywordAnalysis(rule);
}

export interface KeywordAnalysisModalContext {
  accountId: number;
  dashboardId: number;
  componentId: string;
  component: DashboardComponent;
}

interface ActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: ActionProposal[];
  onApply: (ruleIds: string[]) => Promise<ExecuteActionsResponse>;
  isDark: boolean;
  /** When set, keyword / negative-keyword proposals can run the AI analysis stream (testing). */
  keywordAnalysisContext?: KeywordAnalysisModalContext;
}

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  onClose,
  proposals,
  onApply,
  isDark,
  keywordAnalysisContext,
}) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(
    () => new Set(proposals.map((p) => p.action_rule_id))
  );
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [executeResponse, setExecuteResponse] = useState<ExecuteActionsResponse | null>(null);
  const [errorsPanelExpanded, setErrorsPanelExpanded] = useState(false);
  const [keywordAnalysisUi, setKeywordAnalysisUi] = useState<
    Record<
      string,
      {
        loading: boolean;
        error?: string;
        /** After a stream finishes; undefined means “use DB on the rule”. */
        streamedPayload?: KeywordAnalysisStoredPayload | null;
        streamMessage?: string;
      }
    >
  >({});
  const keywordAbortRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setExecuteResponse(null);
      setKeywordAnalysisUi({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      keywordAbortRef.current.forEach((c) => c.abort());
      keywordAbortRef.current.clear();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasBlocks = proposals.some((p) => p.guardrail_blocks.length > 0);
  const hasWarnings = proposals.some((p) => p.guardrail_warnings.length > 0);
  const totalEntities = proposals.reduce((sum, p) => sum + groupedEntityCount(p), 0);
  const applicableProposals = proposals.filter(
    (p) => p.guardrail_blocks.length === 0 && groupedEntityCount(p) > 0
  );
  const applicableRuleIds = applicableProposals.map((p) => p.action_rule_id);
  const applicableEntityCount = applicableProposals.reduce((sum, p) => sum + groupedEntityCount(p), 0);

  const toggleExpand = (id: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRunKeywordAnalysis = async (proposal: ActionProposal) => {
    if (!keywordAnalysisContext) return;
    const id = proposal.action_rule_id;
    if (!isKeywordAnalysisActionType(proposal.action_rule.type)) return;
    if (proposal.guardrail_blocks.length > 0 || groupedEntityCount(proposal) === 0) return;

    keywordAbortRef.current.get(id)?.abort();
    const ac = new AbortController();
    keywordAbortRef.current.set(id, ac);

    setKeywordAnalysisUi((prev) => ({
      ...prev,
      [id]: { loading: true },
    }));

    try {
      const { accountId, dashboardId, componentId, component } = keywordAnalysisContext;
      const dateRange = getKeywordAnalysisDateRangeFromComponent(component);
      const payload = buildKeywordAnalysisPayloadFromProposal(
        component,
        componentId,
        proposal,
        dateRange
      );
      const { full_message } = await streamKeywordAnalysis(accountId, dashboardId, payload, {
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      const raw = extractKeywordAnalysisBlock(full_message);
      const streamedPayload = raw != null ? parseKeywordAnalysisPayload(raw) : null;
      const streamMessage =
        raw == null
          ? "No ```keyword-analysis``` JSON block found in the model output."
          : streamedPayload == null
            ? "Analysis response could not be parsed."
            : undefined;
      setKeywordAnalysisUi((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          streamedPayload,
          streamMessage,
        },
      }));
    } catch (e) {
      if (ac.signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setKeywordAnalysisUi((prev) => ({
        ...prev,
        [id]: { loading: false, error: msg },
      }));
    } finally {
      keywordAbortRef.current.delete(id);
    }
  };

  const handleApply = async () => {
    if (applicableRuleIds.length === 0) return;
    setIsApplying(true);
    setResult(null);
    setExecuteResponse(null);
    try {
      const response = await onApply(applicableRuleIds);
      setExecuteResponse(response);
      const hasFailure = response.results?.some(
        (r) =>
          r.status === "failed" ||
          (r.failed ?? 0) > 0 ||
          (Array.isArray(r.errors) && r.errors.length > 0)
      );
      setResult(hasFailure ? "error" : "success");
    } catch {
      setResult("error");
    } finally {
      setIsApplying(false);
    }
  };

  const hasErrorDetails =
    result === "error" &&
    executeResponse?.results?.some(
      (r) =>
        (Array.isArray(r.errors) && r.errors.length > 0) ||
        (typeof r.error === "string" && r.error.length > 0)
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden",
          isDark ? "bg-neutral-800 border border-neutral-700" : "bg-white border border-sandstorm-s40"
        )}
      >
        {/* Header */}
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
              <Zap className={cn("w-5 h-5", isDark ? "text-[#2DD4BF]" : "text-forest-f40")} />
            </div>
            <div>
              <h2 className={cn("text-sm font-semibold", isDark ? "text-neutral-100" : "text-forest-f60")}>
                Review & Apply Changes
              </h2>
              <p className={cn("text-xs mt-0.5", isDark ? "text-neutral-400" : "text-forest-f30")}>
                {proposals.length} action{proposals.length > 1 ? "s" : ""} affecting {totalEntities} entit{totalEntities === 1 ? "y" : "ies"}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Global warnings/blocks */}
          {hasBlocks && (
            <div
              className={cn(
                "flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs",
                isDark ? "bg-red-900/20 text-red-300 border border-red-800/40" : "bg-red-r0 text-red-r30 border border-red-200"
              )}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Some actions are blocked by safety guardrails</p>
                <p className="mt-1 opacity-80">
                  Blocked actions cannot be executed. Adjust the action rules to resolve.
                </p>
              </div>
            </div>
          )}

          {hasWarnings && !hasBlocks && (
            <div
              className={cn(
                "flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs",
                isDark ? "bg-amber-900/20 text-amber-300 border border-amber-800/40" : "bg-amber-50 text-amber-800 border border-amber-200"
              )}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Some actions have warnings. Please review carefully before applying.</p>
            </div>
          )}

          {/* Proposals list */}
          {proposals.map((proposal) => {
            const isBlocked = proposal.guardrail_blocks.length > 0;
            const isExpanded = expandedRules.has(proposal.action_rule_id);
            const rule = proposal.action_rule;
            const nEntities = groupedEntityCount(proposal);

            return (
              <div
                key={proposal.action_rule_id}
                className={cn(
                  "rounded-xl border overflow-hidden transition-colors",
                  isBlocked
                    ? isDark ? "border-red-800/60 bg-red-900/10" : "border-red-200 bg-red-50/50"
                    : isDark ? "border-neutral-700 bg-neutral-700/30" : "border-sandstorm-s40/60 bg-white"
                )}
              >
                {/* Proposal header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(proposal.action_rule_id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    isDark ? "hover:bg-neutral-700/50" : "hover:bg-sandstorm-s5"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isBlocked ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <ShieldCheck className={cn("w-4 h-4 shrink-0", isDark ? "text-emerald-400" : "text-emerald-600")} />
                    )}
                    <div className="min-w-0">
                      <span className={cn("text-xs font-semibold block truncate", isDark ? "text-neutral-100" : "text-forest-f60")}>
                        {ACTION_TYPE_LABELS[rule.type] || rule.type}
                        <span className={cn("font-normal ml-1.5", isDark ? "text-neutral-400" : "text-forest-f30")}>
                          {nEntities} {rule.entity_type}{nEntities !== 1 ? "s" : ""}
                        </span>
                      </span>
                      <span className={cn("text-[10px] block truncate mt-0.5", isDark ? "text-neutral-400" : "text-forest-f30")}>
                        {proposal.description}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className={cn("w-4 h-4 shrink-0 ml-2", isDark ? "text-neutral-500" : "text-forest-f30")} />
                  ) : (
                    <ChevronDown className={cn("w-4 h-4 shrink-0 ml-2", isDark ? "text-neutral-500" : "text-forest-f30")} />
                  )}
                </button>

                {/* Guardrail messages */}
                {(proposal.guardrail_blocks.length > 0 || proposal.guardrail_warnings.length > 0) && (
                  <div className="px-4 pb-2 space-y-1">
                    {proposal.guardrail_blocks.map((msg, i) => (
                      <p key={`block-${i}`} className={cn("text-[10px] flex items-start gap-1.5", isDark ? "text-red-300" : "text-red-600")}>
                        <XCircle className="w-3 h-3 mt-0.5 shrink-0" /> {msg}
                      </p>
                    ))}
                    {proposal.guardrail_warnings.map((msg, i) => (
                      <p key={`warn-${i}`} className={cn("text-[10px] flex items-start gap-1.5", isDark ? "text-amber-300" : "text-amber-700")}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {msg}
                      </p>
                    ))}
                  </div>
                )}

                {/* Entity diff table */}
                {isExpanded && proposal.entities.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className={cn("rounded-lg border overflow-hidden", isDark ? "border-neutral-600" : "border-sandstorm-s40/60")}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className={cn(isDark ? "bg-neutral-700" : "bg-sandstorm-s10")}>
                            <th className={cn("px-3 py-2 text-left font-semibold", isDark ? "text-neutral-300" : "text-forest-f60")}>
                              Entity
                            </th>
                            <th className={cn("px-3 py-2 text-left font-semibold", isDark ? "text-neutral-300" : "text-forest-f60")}>
                              Before
                            </th>
                            <th className={cn("px-3 py-2 text-left font-semibold", isDark ? "text-neutral-300" : "text-forest-f60")}>
                              After
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupEntityDiffsById(proposal.entities).map((group) => (
                            <tr
                              key={group.entityId}
                              className={cn(
                                "border-t align-top",
                                isDark ? "border-neutral-600" : "border-sandstorm-s40/40"
                              )}
                            >
                              <td className={cn("px-3 py-2", isDark ? "text-neutral-200" : "text-forest-f60")}>
                                <span className="block truncate max-w-[200px]" title={group.displayName}>
                                  {group.displayName}
                                </span>
                                {group.rows.length > 1 ? (
                                  <span
                                    className={cn(
                                      "block text-[10px] mt-0.5",
                                      isDark ? "text-neutral-500" : "text-forest-f30"
                                    )}
                                  >
                                    {group.rows.length} updates
                                  </span>
                                ) : null}
                              </td>
                              <td className={cn("px-3 py-2 font-mono", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                {group.rows.map((ent, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      i > 0 && "mt-2 pt-2 border-t border-dashed",
                                      i > 0 && (isDark ? "border-neutral-600" : "border-sandstorm-s40/50")
                                    )}
                                  >
                                    {Object.entries(ent.before || {}).map(([k, v]) => (
                                      <span key={k} className="block">
                                        {k}: {String(v)}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 font-mono font-medium",
                                  isDark ? "text-[#2DD4BF]" : "text-forest-f40"
                                )}
                              >
                                {group.rows.map((ent, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      i > 0 && "mt-2 pt-2 border-t border-dashed",
                                      i > 0 && (isDark ? "border-neutral-600" : "border-sandstorm-s40/50")
                                    )}
                                  >
                                    {Object.entries(ent.after || {}).map(([k, v]) => (
                                      <span key={k} className="block">
                                        {k}: {String(v)}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isExpanded && proposal.entities.length === 0 && (
                  <p className={cn("px-4 pb-3 text-xs italic", isDark ? "text-neutral-500" : "text-forest-f30")}>
                    No matching entities found for this action.
                  </p>
                )}

                {isExpanded && shouldShowKeywordAnalysisSection(proposal, rule) && (
                    <div
                      className={cn(
                        "px-4 pb-3 space-y-2 border-t border-dashed pt-3 mt-1",
                        isDark ? "border-neutral-600" : "border-sandstorm-s40/50"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide",
                          isDark ? "text-neutral-400" : "text-forest-f30"
                        )}
                      >
                        AI keyword analysis
                      </p>
                      {keywordAnalysisContext && nEntities > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRunKeywordAnalysis(proposal)}
                          disabled={keywordAnalysisUi[proposal.action_rule_id]?.loading === true}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            isDark
                              ? "bg-neutral-700 text-neutral-100 hover:bg-neutral-600 border border-neutral-600"
                              : "bg-sandstorm-s5 text-forest-f60 hover:bg-sandstorm-s20 border border-sandstorm-s40"
                          )}
                          aria-busy={keywordAnalysisUi[proposal.action_rule_id]?.loading === true}
                        >
                          {keywordAnalysisUi[proposal.action_rule_id]?.loading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden />
                              Running analysis…
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              Run AI analysis
                            </>
                          )}
                        </button>
                      )}
                      {keywordAnalysisUi[proposal.action_rule_id]?.error && (
                        <p
                          className={cn(
                            "text-[11px] rounded-lg px-2 py-1.5",
                            isDark ? "bg-red-900/25 text-red-200" : "bg-red-r0 text-red-r30"
                          )}
                        >
                          {keywordAnalysisUi[proposal.action_rule_id]?.error}
                        </p>
                      )}
                      {(() => {
                        const rid = proposal.action_rule_id;
                        const u = keywordAnalysisUi[rid];
                        let display: KeywordAnalysisStoredPayload | null = null;
                        let emptyNote: string | undefined;
                        let dbError: string | undefined;
                        if (u?.streamedPayload !== undefined) {
                          display = u.streamedPayload;
                          emptyNote = u.streamMessage;
                        } else {
                          display = parseKeywordAnalysisPayload(rule.keyword_analysis);
                          if (
                            typeof rule.keyword_analysis_error === "string" &&
                            rule.keyword_analysis_error.length > 0
                          ) {
                            dbError = rule.keyword_analysis_error;
                          }
                        }
                        if (display) {
                          let persistContext: KeywordAnalysisPersistContext | undefined;
                          if (
                            keywordAnalysisContext &&
                            typeof rule.action_id === "number" &&
                            rule.action_id > 0
                          ) {
                            persistContext = {
                              accountId: keywordAnalysisContext.accountId,
                              dashboardId: keywordAnalysisContext.dashboardId,
                              componentId: keywordAnalysisContext.componentId,
                              actionId: rule.action_id,
                            };
                          }
                          return (
                            <div
                              className={cn(
                                "rounded-xl border p-3 max-h-[min(420px,55vh)] overflow-y-auto",
                                isDark
                                  ? "border-neutral-600 bg-neutral-900/30"
                                  : "border-sandstorm-s40 bg-white"
                              )}
                            >
                              <KeywordAnalysisResultView
                                data={display}
                                isDark={isDark}
                                persistContext={persistContext}
                                onPersisted={(payload) => {
                                  setKeywordAnalysisUi((prev) => ({
                                    ...prev,
                                    [rid]: {
                                      ...prev[rid],
                                      streamedPayload: payload,
                                    },
                                  }));
                                }}
                              />
                            </div>
                          );
                        }
                        if (emptyNote) {
                          return (
                            <p
                              className={cn(
                                "text-[11px] rounded-lg px-2 py-1.5",
                                isDark ? "bg-amber-900/20 text-amber-200" : "bg-amber-50 text-amber-900"
                              )}
                            >
                              {emptyNote}
                            </p>
                          );
                        }
                        if (dbError) {
                          return (
                            <p
                              className={cn(
                                "text-[11px] rounded-lg px-2 py-1.5",
                                isDark ? "bg-red-900/25 text-red-200" : "bg-red-r0 text-red-r30"
                              )}
                            >
                              {dbError}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
              </div>
            );
          })}

          {/* Collapsible error details when apply failed */}
          {hasErrorDetails && (
            <div
              className={cn(
                "rounded-xl border overflow-hidden",
                isDark ? "border-red-800/60 bg-red-900/10" : "border-red-200 bg-red-r0/50"
              )}
            >
              <button
                type="button"
                onClick={() => setErrorsPanelExpanded((prev) => !prev)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                  isDark ? "hover:bg-red-900/20" : "hover:bg-red-50"
                )}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className={isDark ? "text-red-200" : "text-red-r30"}>
                    Error details
                  </span>
                </div>
                {errorsPanelExpanded ? (
                  <ChevronUp className={cn("w-4 h-4 shrink-0", isDark ? "text-neutral-500" : "text-forest-f30")} />
                ) : (
                  <ChevronDown className={cn("w-4 h-4 shrink-0", isDark ? "text-neutral-500" : "text-forest-f30")} />
                )}
              </button>
              {errorsPanelExpanded && (
                <div className="px-4 pb-3 space-y-3 max-h-48 overflow-y-auto">
                  {executeResponse?.results?.map((r) => {
                    const errs = Array.isArray(r.errors) ? r.errors : [];
                    const singleError = typeof r.error === "string" && r.error.length > 0 ? r.error : null;
                    if (errs.length === 0 && !singleError) return null;
                    const ruleType = proposals.find((p) => p.action_rule_id === r.action_rule_id)?.action_rule?.type ?? "";
                    const ruleLabel =
                      ACTION_TYPE_LABELS[ruleType] ??
                      r.action_rule_id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div key={r.action_rule_id} className="space-y-1.5">
                        <p className={cn("text-[11px] font-semibold", isDark ? "text-neutral-300" : "text-forest-f60")}>
                          {ruleLabel}
                          {r.updated !== undefined || r.failed !== undefined ? (
                            <span className={cn("font-normal ml-1", isDark ? "text-neutral-400" : "text-forest-f30")}>
                              ({r.updated ?? 0} updated, {r.failed ?? 0} failed)
                            </span>
                          ) : null}
                        </p>
                        <ul className="list-none space-y-1 pl-0">
                          {singleError && (
                            <li
                              className={cn(
                                "text-[11px]",
                                isDark ? "text-red-200" : "text-red-r30"
                              )}
                            >
                              {singleError}
                            </li>
                          )}
                          {errs.map((item, idx) => {
                            const msg = typeof item === "string" ? item : item.error;
                            const id = typeof item === "string" ? undefined : (item as { campaign_id?: string }).campaign_id;
                            return (
                              <li
                                key={idx}
                                className={cn(
                                  "text-[11px] flex flex-wrap gap-x-2 gap-y-0.5",
                                  isDark ? "text-red-200" : "text-red-r30"
                                )}
                              >
                                {id != null && id !== "" && (
                                  <span className={cn("shrink-0", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                    Campaign {id}:
                                  </span>
                                )}
                                <span className="min-w-0 break-words">{msg}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4 border-t shrink-0",
            isDark ? "border-neutral-700 bg-neutral-800" : "border-sandstorm-s40/60 bg-sandstorm-s5/30"
          )}
        >
          {result === "success" ? (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className={cn("font-medium", isDark ? "text-emerald-300" : "text-emerald-700")}>
                Actions applied successfully
              </span>
            </div>
          ) : result === "error" ? (
            <div className="flex items-center gap-2 text-xs">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className={cn("font-medium", isDark ? "text-red-300" : "text-red-600")}>
                {hasErrorDetails
                  ? "Some actions failed. See error details above."
                  : "Some actions failed. Check the history for details."}
              </span>
            </div>
          ) : (
            <span className={cn("text-xs", isDark ? "text-neutral-400" : "text-forest-f30")}>
              {applicableRuleIds.length} action{applicableRuleIds.length !== 1 ? "s" : ""} ready to apply
              {applicableEntityCount > 0 ? (
                <>
                  {" "}
                  · {applicableEntityCount} entit{applicableEntityCount === 1 ? "y" : "ies"}
                </>
              ) : null}
            </span>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                isDark
                  ? "text-neutral-300 hover:bg-neutral-700 border border-neutral-600"
                  : "text-forest-f60 hover:bg-sandstorm-s20 border border-sandstorm-s40"
              )}
            >
              {result ? "Close" : "Cancel"}
            </button>
            {!result && (
              <button
                type="button"
                onClick={handleApply}
                disabled={applicableRuleIds.length === 0 || isApplying}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-[#2DD4BF] text-neutral-900 hover:bg-[#2DD4BF]/90"
                    : "bg-forest-f40 text-white hover:bg-forest-f50 shadow-sm"
                )}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Apply Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
