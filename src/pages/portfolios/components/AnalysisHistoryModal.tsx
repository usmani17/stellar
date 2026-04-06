import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, History, Bot, ChevronDown, ChevronUp, FileText, RefreshCw } from "lucide-react";
import { BaseModal, Loader } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import type { DashboardChatEntry } from "../../../services/dashboard";
import { getDashboardAnalysisHistory } from "../../../services/dashboard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  dashboards: Array<{ id: number; name: string }>;
}

interface DashboardHistoryGroup {
  dashboardId: number;
  dashboardName: string;
  chats: DashboardChatEntry[];
  loading: boolean;
  error: string | null;
}

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  original: { label: "Initial Analysis", color: "bg-forest-f40/10 text-forest-f40" },
  portfolio_actions: { label: "Initial Analysis", color: "bg-forest-f40/10 text-forest-f40" },
  reanalyze: { label: "Re-analysis", color: "bg-amber-50 text-amber-700" },
  reanalyze_portfolio_actions: { label: "Re-analysis", color: "bg-amber-50 text-amber-700" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const AnalysisHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  accountId,
  dashboards,
}) => {
  const [groups, setGroups] = useState<DashboardHistoryGroup[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen || dashboards.length === 0) return;

    const initial = dashboards.map((d) => ({
      dashboardId: d.id,
      dashboardName: d.name,
      chats: [] as DashboardChatEntry[],
      loading: true,
      error: null as string | null,
    }));
    setGroups(initial);
    setExpandedIds(new Set(dashboards.map((d) => d.id)));

    dashboards.forEach((d) => {
      getDashboardAnalysisHistory(accountId, d.id)
        .then((chats) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.dashboardId === d.id ? { ...g, chats, loading: false } : g,
            ),
          );
        })
        .catch(() => {
          setGroups((prev) =>
            prev.map((g) =>
              g.dashboardId === d.id
                ? { ...g, loading: false, error: "Failed to load" }
                : g,
            ),
          );
        });
    });
  }, [isOpen, accountId, dashboards]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalChats = groups.reduce((sum, g) => sum + g.chats.length, 0);
  const anyLoading = groups.some((g) => g.loading);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="2xl" padding="p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-forest-f40" />
          <div>
            <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir">
              Analysis History
            </h2>
            <p className="text-[12px] text-forest-f20 mt-0.5">
              {anyLoading
                ? "Loading..."
                : `${totalChats} session${totalChats !== 1 ? "s" : ""} across ${groups.length} dashboard${groups.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-forest-f20 hover:bg-sandstorm-s5 hover:text-forest-f60 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-4">
        {groups.length === 0 && (
          <div className="text-center py-10">
            <Bot className="w-8 h-8 mx-auto mb-2 text-forest-f20" />
            <p className="text-[13px] text-forest-f30">No dashboards to show history for.</p>
          </div>
        )}

        {groups.map((group) => (
          <div
            key={group.dashboardId}
            className="border border-sandstorm-s40 rounded-lg overflow-hidden"
          >
            {/* Dashboard header (collapsible) */}
            <button
              onClick={() => toggleExpand(group.dashboardId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-sandstorm-s5 hover:bg-sandstorm-s10 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-forest-f40 shrink-0" />
                <span className="text-[13px] font-medium text-forest-f60">
                  {group.dashboardName}
                </span>
                {!group.loading && (
                  <span className="text-[11px] text-forest-f20 ml-1">
                    ({group.chats.length} session{group.chats.length !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              {expandedIds.has(group.dashboardId) ? (
                <ChevronUp className="w-4 h-4 text-forest-f20" />
              ) : (
                <ChevronDown className="w-4 h-4 text-forest-f20" />
              )}
            </button>

            {/* Expanded content */}
            {expandedIds.has(group.dashboardId) && (
              <div className="px-4 py-3 space-y-3">
                {group.loading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader size="sm" message="Loading history..." />
                  </div>
                )}

                {group.error && (
                  <p className="text-[12px] text-red-r30 py-2">{group.error}</p>
                )}

                {!group.loading && !group.error && group.chats.length === 0 && (
                  <p className="text-[12px] text-forest-f20 py-2 text-center">
                    No analysis sessions recorded yet.
                  </p>
                )}

                {group.chats.map((chat) => {
                  const typeInfo =
                    SESSION_TYPE_LABELS[chat.session_type] ||
                    SESSION_TYPE_LABELS.original;
                  return (
                    <div
                      key={chat.id}
                      className="border border-sandstorm-s40 rounded-lg p-3 space-y-2"
                    >
                      {/* Session meta row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                              typeInfo.color,
                            )}
                          >
                            {chat.session_type?.includes("reanalyze") && (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            {typeInfo.label}
                          </span>
                          {chat.actions_added > 0 && (
                            <span className="text-[11px] text-forest-f40 font-medium">
                              +{chat.actions_added} action{chat.actions_added !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-forest-f20">
                          {formatDate(chat.created_at)}
                        </span>
                      </div>

                      {/* Summary */}
                      {chat.summary ? (
                        <div className="overflow-x-auto">
                        <div className="prose prose-sm max-w-none text-[12px] text-forest-f30 leading-relaxed [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:text-forest-f60 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-forest-f60 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-forest-f50 [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:text-forest-f50 [&_code]:text-[11px] [&_code]:bg-sandstorm-s5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_hr]:my-2 [&_hr]:border-sandstorm-s40 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-sandstorm-s40 [&_table]:text-[11px] [&_th]:border [&_th]:border-sandstorm-s40 [&_th]:bg-sandstorm-s5 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-sandstorm-s40 [&_td]:px-2 [&_td]:py-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {chat.summary}
                          </ReactMarkdown>
                        </div>
                        </div>
                      ) : (
                        <p className="text-[12px] text-forest-f20 italic">
                          No summary available.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </BaseModal>
  );
};
