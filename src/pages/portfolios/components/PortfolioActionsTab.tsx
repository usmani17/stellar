import React, { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  listPortfolioActions,
  updatePortfolioActionStatus,
  getPortfolioAnalysisHistory,
  updatePortfolioRefreshSettings,
  getPortfolioRefreshSettings,
} from "../../../services/portfolioActions";
import type { PortfolioChatEntry } from "../../../services/portfolioActions";
import type { PortfolioAction } from "../../../services/dashboard";
import { ActionsListPanel } from "../../../components/actions/ActionsListPanel";
import type { ActionItem } from "../../../components/actions/ActionsListPanel";
import { BaseModal, Loader } from "../../../components/ui";
import {
  History,
  Clock,
  Settings,
  RefreshCw,
  Bot,
  X,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { useAssistant } from "../../../contexts/AssistantContext";

interface Props {
  accountId: number;
  portfolioId: number;
  portfolioName?: string;
}

function toActionItems(actions: PortfolioAction[]): ActionItem[] {
  return actions.map((a) => ({
    id: a.id,
    action_slug: a.action_slug,
    action_id: a.action_id,
    dashboard_id: a.dashboard_id ?? 0,
    dashboard_name: a.dashboard_name,
    component_id: a.component_id,
    type: a.type,
    platform: a.platform,
    entity_type: a.entity_type,
    status: a.status,
    description: a.description,
    condition: a.condition,
    params: a.params,
    guardrails: a.guardrails,
    reasoning: a.reasoning,
    learning: a.learning,
    query: a.query ? { source: a.query.source, sql: a.query.sql } : undefined,
    schedule: a.schedule,
  }));
}

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  initial: { label: "Initial Analysis", color: "bg-forest-f40/10 text-forest-f40" },
  reanalyze: { label: "Re-analysis", color: "bg-amber-50 text-amber-700" },
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

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily", desc: "Re-analyze every day" },
  { value: "weekly", label: "Weekly", desc: "Re-analyze once a week" },
  { value: "monthly", label: "Monthly", desc: "Re-analyze once a month" },
];

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

function formatTime12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function PortfolioSettingsModal({
  isOpen,
  onClose,
  accountId,
  portfolioId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  portfolioId: number;
}) {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [refreshTime, setRefreshTime] = useState("09:00");
  const [weekday, setWeekday] = useState(0);
  const [monthDay, setMonthDay] = useState(1);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const applyResult = useCallback((result: {
    actionRefreshEnabled: boolean;
    actionRefreshFrequency: string;
    actionRefreshTime: string;
    actionRefreshWeekday: number;
    actionRefreshMonthDay: number;
    actionRefreshNextAt: string | null;
    actionRefreshLastAt: string | null;
  }) => {
    setEnabled(result.actionRefreshEnabled);
    setFrequency(result.actionRefreshFrequency);
    setRefreshTime(result.actionRefreshTime || "09:00");
    setWeekday(result.actionRefreshWeekday ?? 0);
    setMonthDay(result.actionRefreshMonthDay ?? 1);
    setNextAt(result.actionRefreshNextAt);
    setLastAt(result.actionRefreshLastAt);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getPortfolioRefreshSettings(accountId, portfolioId);
        if (!cancelled) applyResult(result);
      } catch {
        /* ignore — keep defaults */
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, accountId, portfolioId, applyResult]);

  const save = useCallback(
    async (updates: {
      enabled?: boolean;
      frequency?: string;
      time?: string;
      weekday?: number;
      monthDay?: number;
    }) => {
      setSaving(true);
      try {
        const result = await updatePortfolioRefreshSettings(accountId, portfolioId, updates);
        applyResult(result);
      } catch {
        /* ignore */
      } finally {
        setSaving(false);
      }
    },
    [accountId, portfolioId, applyResult],
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-forest-f40" />
          <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir">
            Action Settings
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-forest-f20 hover:bg-sandstorm-s5 hover:text-forest-f60 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="rounded-lg border border-sandstorm-s40 divide-y divide-sandstorm-s40 overflow-hidden">
          {/* Row: Auto-Refresh toggle */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-white">
            <div>
              <p className="text-[13px] font-medium text-forest-f60">Auto-Refresh</p>
              <p className="text-[11px] text-forest-f30 mt-0.5">
                Agent will periodically re-analyze your portfolio and suggest new actions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Clock className="w-3.5 h-3.5 animate-spin text-forest-f30" />}
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => {
                  const next = !enabled;
                  setEnabled(next);
                  save({ enabled: next });
                }}
                disabled={saving}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:ring-offset-2 disabled:opacity-50",
                  enabled ? "bg-forest-f40" : "bg-sandstorm-s40",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>

          {/* Row: Frequency */}
          <div className={cn("px-4 py-3.5 bg-white transition-opacity", !enabled && "opacity-40 pointer-events-none")}>
            <p className="text-[13px] font-medium text-forest-f60 mb-2.5">Frequency</p>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFrequency(opt.value);
                    save({ frequency: opt.value });
                  }}
                  disabled={saving || !enabled}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-all",
                    frequency === opt.value
                      ? "border-forest-f40 bg-forest-f0 ring-1 ring-forest-f40"
                      : "border-sandstorm-s40 bg-white hover:border-forest-f30",
                  )}
                >
                  <span className={cn(
                    "text-[12px] font-semibold block",
                    frequency === opt.value ? "text-forest-f40" : "text-forest-f60",
                  )}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-forest-f30">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row: Time of day */}
          <div className={cn("px-4 py-3.5 bg-white transition-opacity", !enabled && "opacity-40 pointer-events-none")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-forest-f60">Time of Day</p>
                <p className="text-[11px] text-forest-f30 mt-0.5">
                  What time to run the analysis (UTC)
                </p>
              </div>
              <select
                value={refreshTime}
                onChange={(e) => {
                  setRefreshTime(e.target.value);
                  save({ time: e.target.value });
                }}
                disabled={saving || !enabled}
                className="text-[12px] border border-sandstorm-s40 rounded-md px-3 py-1.5 bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 min-w-[100px]"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{formatTime12h(t)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Day of week (weekly only) */}
          {frequency === "weekly" && (
            <div className={cn("px-4 py-3.5 bg-white transition-opacity", !enabled && "opacity-40 pointer-events-none")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-forest-f60">Day of Week</p>
                  <p className="text-[11px] text-forest-f30 mt-0.5">
                    Which day to run the weekly analysis
                  </p>
                </div>
                <select
                  value={weekday}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setWeekday(v);
                    save({ weekday: v });
                  }}
                  disabled={saving || !enabled}
                  className="text-[12px] border border-sandstorm-s40 rounded-md px-3 py-1.5 bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 min-w-[130px]"
                >
                  {WEEKDAY_LABELS.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Row: Day of month (monthly only) */}
          {frequency === "monthly" && (
            <div className={cn("px-4 py-3.5 bg-white transition-opacity", !enabled && "opacity-40 pointer-events-none")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-forest-f60">Day of Month</p>
                  <p className="text-[11px] text-forest-f30 mt-0.5">
                    Which day to run the monthly analysis (1–28)
                  </p>
                </div>
                <select
                  value={monthDay}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMonthDay(v);
                    save({ monthDay: v });
                  }}
                  disabled={saving || !enabled}
                  className="text-[12px] border border-sandstorm-s40 rounded-md px-3 py-1.5 bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 min-w-[80px]"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Row: Schedule Info */}
          {enabled && (nextAt || lastAt) && (
            <div className="px-4 py-3 bg-sandstorm-s5/60">
              <div className="flex items-center gap-4 flex-wrap text-[12px]">
                {nextAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-forest-f30" />
                    <span className="text-forest-f30">Next run:</span>
                    <span className="text-forest-f60 font-medium">{formatDate(nextAt)}</span>
                  </div>
                )}
                {lastAt && (
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-forest-f30" />
                    <span className="text-forest-f30">Last run:</span>
                    <span className="text-forest-f60 font-medium">{formatDate(lastAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-forest-f20 leading-relaxed">
          When enabled, the Agent will automatically re-analyze your portfolio's performance data
          at the chosen schedule and propose new optimization actions. Sessions are recorded in Analysis History.
        </p>
      </div>
    </BaseModal>
  );
}

function PortfolioAnalysisHistoryModal({
  isOpen,
  onClose,
  accountId,
  portfolioId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  portfolioId: number;
}) {
  const [chats, setChats] = useState<PortfolioChatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    getPortfolioAnalysisHistory(accountId, portfolioId)
      .then((data) => {
        if (!cancelled) setChats(data);
      })
      .catch(() => {
        if (!cancelled) setChats([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, accountId, portfolioId]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="2xl" padding="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-forest-f40" />
          <div>
            <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir">
              Analysis History
            </h2>
            <p className="text-[12px] text-forest-f20 mt-0.5">
              {loading
                ? "Loading..."
                : `${chats.length} session${chats.length !== 1 ? "s" : ""} recorded`}
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

      <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader size="sm" message="Loading history..." />
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div className="text-center py-10">
            <Bot className="w-8 h-8 mx-auto mb-2 text-forest-f20" />
            <p className="text-[13px] text-forest-f30">No analysis sessions recorded yet.</p>
            <p className="text-[11px] text-forest-f20 mt-0.5">
              Use the Agent to analyze this portfolio and sessions will appear here.
            </p>
          </div>
        )}

        {!loading &&
          chats.map((chat) => {
            const typeInfo =
              SESSION_TYPE_LABELS[chat.sessionType] || SESSION_TYPE_LABELS.initial;
            return (
              <div
                key={chat.id}
                className="border border-sandstorm-s40 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                        typeInfo.color,
                      )}
                    >
                      {chat.sessionType === "reanalyze" && (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      {typeInfo.label}
                    </span>
                    {chat.actionsAdded > 0 && (
                      <span className="text-[11px] text-forest-f40 font-medium">
                        +{chat.actionsAdded} action{chat.actionsAdded !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-forest-f20">
                    {formatDate(chat.createdAt)}
                  </span>
                </div>
                {chat.summary ? (
                  <div className="prose prose-sm max-w-none text-[12px] text-forest-f30 leading-relaxed [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:text-forest-f60 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-forest-f60 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-forest-f50 [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:text-forest-f50 [&_code]:text-[11px] [&_code]:bg-sandstorm-s5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_hr]:my-2 [&_hr]:border-sandstorm-s40">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {chat.summary}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-[12px] text-forest-f20 italic">No summary available.</p>
                )}
              </div>
            );
          })}
      </div>
    </BaseModal>
  );
}

export const PortfolioActionsTab: React.FC<Props> = ({ accountId, portfolioId, portfolioName }) => {
  const [actions, setActions] = useState<PortfolioAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { openAssistant, startNewSession, setInputValue } = useAssistant();

  const handleCreateActions = useCallback(() => {
    startNewSession();
    setInputValue("Create optimization actions for this portfolio");
    openAssistant();
  }, [startNewSession, setInputValue, openAssistant]);

  const handleReanalyze = useCallback(() => {
    startNewSession();
    setInputValue("Re-analyze portfolio actions and suggest new optimizations");
    openAssistant();
  }, [startNewSession, setInputValue, openAssistant]);

  const fetchActions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await listPortfolioActions(accountId, portfolioId);
      setActions(data);
    } catch {
      if (!isRefresh) setActions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchActions().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, portfolioId]);

  const handleStatusChange = useCallback(async (actionIds: number[], newStatus: string) => {
    try {
      await updatePortfolioActionStatus(accountId, portfolioId, actionIds, newStatus);
      fetchActions(true);
    } catch {
      // status update failed silently
    }
  }, [accountId, portfolioId]);

  return (
    <div className="space-y-4">
      <ActionsListPanel
        actions={toActionItems(actions)}
        accountId={accountId}
        portfolioId={portfolioId}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchActions(true)}
        groupBy="none"
        showDashboardLink={false}
        onActionStatusChange={() => fetchActions(true)}
        onCreateActions={handleCreateActions}
        headerExtra={
          <div className="flex items-center gap-1.5">
            {actions.length > 0 && (
              <button
                type="button"
                onClick={handleReanalyze}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-forest-f40 hover:bg-forest-f50 rounded-lg transition-colors"
                aria-label="Re-analyze portfolio actions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-analyze
              </button>
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-forest-f40 hover:text-forest-f50 border border-sandstorm-s40 hover:border-forest-f40/30 rounded-lg transition-colors bg-white"
              aria-label="View analysis history"
            >
              <History className="w-3.5 h-3.5" />
              Analysis History
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-forest-f40 hover:text-forest-f50 border border-sandstorm-s40 hover:border-forest-f40/30 rounded-lg transition-colors bg-white"
              aria-label="Open action settings"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        }
      />

      <PortfolioSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        accountId={accountId}
        portfolioId={portfolioId}
      />
      <PortfolioAnalysisHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        accountId={accountId}
        portfolioId={portfolioId}
      />
    </div>
  );
};
