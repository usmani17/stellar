import React, { useState } from "react";
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
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import type { ActionProposal, ActionEntityDiff } from "../../types/dashboard";

const ACTION_TYPE_LABELS: Record<string, string> = {
  change_state: "Change status",
  adjust_budget: "Adjust budget",
  adjust_bid: "Adjust bid",
  add_negative_keyword: "Add negative keywords",
};

interface ActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: ActionProposal[];
  onApply: (ruleIds: string[]) => Promise<void>;
  isDark: boolean;
}

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  onClose,
  proposals,
  onApply,
  isDark,
}) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(
    () => new Set(proposals.map((p) => p.action_rule_id))
  );
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  if (!isOpen) return null;

  const hasBlocks = proposals.some((p) => p.guardrail_blocks.length > 0);
  const hasWarnings = proposals.some((p) => p.guardrail_warnings.length > 0);
  const totalEntities = proposals.reduce((sum, p) => sum + p.entity_count, 0);
  const applicableRuleIds = proposals
    .filter((p) => p.guardrail_blocks.length === 0 && p.entity_count > 0)
    .map((p) => p.action_rule_id);

  const toggleExpand = (id: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (applicableRuleIds.length === 0) return;
    setIsApplying(true);
    setResult(null);
    try {
      await onApply(applicableRuleIds);
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      setIsApplying(false);
    }
  };

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
                          {proposal.entity_count} {rule.entity_type}{proposal.entity_count > 1 ? "s" : ""}
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
                          {proposal.entities.map((ent: ActionEntityDiff, idx: number) => (
                            <tr
                              key={ent.id || idx}
                              className={cn(
                                "border-t",
                                isDark ? "border-neutral-600" : "border-sandstorm-s40/40"
                              )}
                            >
                              <td className={cn("px-3 py-2", isDark ? "text-neutral-200" : "text-forest-f60")}>
                                <span className="block truncate max-w-[200px]" title={ent.name}>
                                  {ent.name || ent.id}
                                </span>
                              </td>
                              <td className={cn("px-3 py-2 font-mono", isDark ? "text-neutral-400" : "text-forest-f30")}>
                                {Object.entries(ent.before || {}).map(([k, v]) => (
                                  <span key={k} className="block">{k}: {String(v)}</span>
                                ))}
                              </td>
                              <td className={cn("px-3 py-2 font-mono font-medium", isDark ? "text-[#2DD4BF]" : "text-forest-f40")}>
                                {Object.entries(ent.after || {}).map(([k, v]) => (
                                  <span key={k} className="block">{k}: {String(v)}</span>
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
              </div>
            );
          })}
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
                Some actions failed. Check the history for details.
              </span>
            </div>
          ) : (
            <span className={cn("text-xs", isDark ? "text-neutral-400" : "text-forest-f30")}>
              {applicableRuleIds.length} action{applicableRuleIds.length !== 1 ? "s" : ""} ready to apply
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
