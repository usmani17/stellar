import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  listPortfolioActions,
  getPortfolioAnalysisHistory,
  getPortfolioTrail,
  getPortfolioActionHistory,
  updatePortfolioRefreshSettings,
  getPortfolioRefreshSettings,
  getPortfolioRefreshStatus,
} from "../../../services/portfolioActions";
import type { PortfolioChatEntry, PortfolioTrailEntry } from "../../../services/portfolioActions";
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
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Zap,
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
    has_query: a.has_query ?? false,
    query_source: a.query_source ?? null,
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

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const LOCAL_TZ_LABEL = (() => {
  const parts = new Date().toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ");
  return parts[parts.length - 1] || LOCAL_TZ;
})();

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

function utcTimeToLocal(utcTime: string): string {
  const [h, m] = utcTime.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localTimeToUtc(localTime: string): string {
  const [h, m] = localTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
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
  interface SettingsState {
    enabled: boolean;
    frequency: string;
    refreshTime: string;
    weekday: number;
    monthDay: number;
    nextAt: string | null;
    lastAt: string | null;
  }

  const defaultSettings: SettingsState = {
    enabled: false, frequency: "daily", refreshTime: "09:00",
    weekday: 0, monthDay: 1, nextAt: null, lastAt: null,
  };

  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState(false);

  const { enabled, frequency, refreshTime, weekday, monthDay, nextAt, lastAt } = settings;

  const toSettingsState = (r: {
    actionRefreshEnabled: boolean;
    actionRefreshFrequency: string;
    actionRefreshTime: string;
    actionRefreshWeekday: number;
    actionRefreshMonthDay: number;
    actionRefreshNextAt: string | null;
    actionRefreshLastAt: string | null;
  }): SettingsState => ({
    enabled: r.actionRefreshEnabled,
    frequency: r.actionRefreshFrequency,
    refreshTime: r.actionRefreshTime || "09:00",
    weekday: r.actionRefreshWeekday ?? 0,
    monthDay: r.actionRefreshMonthDay ?? 1,
    nextAt: r.actionRefreshNextAt,
    lastAt: r.actionRefreshLastAt,
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getPortfolioRefreshSettings(accountId, portfolioId)
      .then((result) => {
        if (!cancelled) setSettings(toSettingsState(result));
      })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, [isOpen, accountId, portfolioId]);

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
        setSettings(toSettingsState(result));
      } catch {
        /* ignore */
      } finally {
        setSaving(false);
      }
    },
    [accountId, portfolioId],
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
                  setSettings((s) => ({ ...s, enabled: next }));
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
                    setSettings((s) => ({ ...s, frequency: opt.value }));
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
                  What time to run the analysis ({LOCAL_TZ_LABEL})
                </p>
              </div>
              <select
                value={utcTimeToLocal(refreshTime)}
                onChange={(e) => {
                  const localVal = e.target.value;
                  const utcVal = localTimeToUtc(localVal);
                  setSettings((s) => ({ ...s, refreshTime: utcVal }));
                  save({ time: utcVal });
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
                    setSettings((s) => ({ ...s, weekday: v }));
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
                    setSettings((s) => ({ ...s, monthDay: v }));
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
                    <span className="text-forest-f60 font-medium">{formatDate(nextAt)} {LOCAL_TZ_LABEL}</span>
                  </div>
                )}
                {lastAt && (
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-forest-f30" />
                    <span className="text-forest-f30">Last run:</span>
                    <span className="text-forest-f60 font-medium">{formatDate(lastAt)} {LOCAL_TZ_LABEL}</span>
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

type TrailTab = "trail" | "executions";

function PortfolioExecutionHistoryModal({
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
  const [activeSubTab, setActiveSubTab] = useState<TrailTab>("trail");
  const [trail, setTrail] = useState<PortfolioTrailEntry[]>([]);
  const [executions, setExecutions] = useState<Array<Record<string, unknown>>>([]);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [loadingExec, setLoadingExec] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingTrail(true);
    setLoadingExec(true);
    getPortfolioTrail(accountId, portfolioId, { limit: 200 })
      .then(setTrail)
      .catch(() => setTrail([]))
      .finally(() => setLoadingTrail(false));
    getPortfolioActionHistory(accountId, portfolioId, { limit: 100 })
      .then((r) => setExecutions(r.executions))
      .catch(() => setExecutions([]))
      .finally(() => setLoadingExec(false));
  }, [isOpen, accountId, portfolioId]);

  const loading = activeSubTab === "trail" ? loadingTrail : loadingExec;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="2xl" padding="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-forest-f40" />
          <div>
            <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir">
              Portfolio Activity
            </h2>
            <p className="text-[12px] text-forest-f20 mt-0.5">
              {loading ? "Loading..." : activeSubTab === "trail"
                ? `${trail.length} event${trail.length !== 1 ? "s" : ""}`
                : `${executions.length} execution${executions.length !== 1 ? "s" : ""}`}
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

      {/* Sub-tabs */}
      <div className="flex border-b border-sandstorm-s40 px-6">
        <button
          onClick={() => setActiveSubTab("trail")}
          className={cn(
            "px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors",
            activeSubTab === "trail"
              ? "border-forest-f40 text-forest-f60"
              : "border-transparent text-forest-f30 hover:text-forest-f60",
          )}
        >
          Activity Trail ({trail.length})
        </button>
        <button
          onClick={() => setActiveSubTab("executions")}
          className={cn(
            "px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors",
            activeSubTab === "executions"
              ? "border-forest-f40 text-forest-f60"
              : "border-transparent text-forest-f30 hover:text-forest-f60",
          )}
        >
          Execution History ({executions.length})
        </button>
      </div>

      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {activeSubTab === "trail" && (
          <>
            {loadingTrail ? (
              <div className="flex justify-center py-8"><Loader size="sm" /></div>
            ) : trail.length === 0 ? (
              <p className="text-center text-forest-f20 text-sm py-8">No activity recorded yet</p>
            ) : (
              <div className="relative pl-2">
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-sandstorm-s40" />
                {trail.map((entry) => (
                  <div key={entry.id} className="relative flex gap-3 pb-5">
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border border-sandstorm-s40 flex items-center justify-center shadow-sm">
                      {EVENT_ICON[entry.event_type] || <Activity className="w-3.5 h-3.5 text-forest-f30" />}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-forest-f60">
                          {EVENT_LABEL[entry.event_type] || entry.event_type}
                        </span>
                        {entry.old_status && entry.new_status && entry.old_status !== entry.new_status && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-forest-f30">
                            <span className="px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f20">{entry.old_status}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="px-1.5 py-0.5 rounded bg-forest-f40/10 text-forest-f40 font-medium">{entry.new_status}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-forest-f20 ml-auto flex-shrink-0">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                      <p className="text-[12px] text-forest-f40 font-medium mt-0.5 truncate">
                        {entry.action_description || entry.action_slug}
                      </p>
                      {entry.note && (
                        <p className="text-[11px] text-forest-f30 mt-1 leading-relaxed">{entry.note}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f20 font-mono">
                          {entry.action_type}
                        </span>
                        <span className="text-[10px] text-forest-f20">#{entry.action_id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSubTab === "executions" && (
          <>
            {loadingExec ? (
              <div className="flex justify-center py-8"><Loader size="sm" /></div>
            ) : executions.length === 0 ? (
              <p className="text-center text-forest-f20 text-sm py-8">No executions recorded yet</p>
            ) : (
              <div className="space-y-3">
                {executions.map((exec) => {
                  const execStatus = String(exec.status ?? "unknown");
                  const isSuccess = execStatus === "success";
                  const isFailed = execStatus === "failed" || execStatus === "error";
                  const entityIds = Array.isArray(exec.entity_ids) ? exec.entity_ids as string[] : [];
                  const result = exec.result as Record<string, unknown> | null | undefined;
                  const error = exec.error as string | null | undefined;

                  return (
                    <div
                      key={String(exec.id)}
                      className={cn(
                        "border rounded-lg p-4 space-y-2",
                        isSuccess ? "border-green-200 bg-green-50/30" : isFailed ? "border-red-200 bg-red-50/30" : "border-sandstorm-s40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : isFailed ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                          <span className={cn(
                            "text-[12px] font-semibold",
                            isSuccess ? "text-green-700" : isFailed ? "text-red-600" : "text-forest-f60",
                          )}>
                            {execStatus.charAt(0).toUpperCase() + execStatus.slice(1)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f20 font-mono">
                            {String(exec.action_type ?? "")}
                          </span>
                          <span className="text-[10px] text-forest-f20">
                            {String(exec.platform ?? "")} / {String(exec.entity_type ?? "")}
                          </span>
                        </div>
                        <span className="text-[10px] text-forest-f20">
                          {exec.executed_at ? formatDate(String(exec.executed_at)) : exec.proposed_at ? formatDate(String(exec.proposed_at)) : ""}
                        </span>
                      </div>

                      {exec.action_rule_id != null && (
                        <p className="text-[12px] text-forest-f40 font-medium">
                          {String(exec.action_rule_id)}
                        </p>
                      )}

                      {entityIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] text-forest-f30 font-medium">Entities:</span>
                          {entityIds.slice(0, 8).map((eid, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-forest-f40/10 text-forest-f40 font-mono">
                              {String(eid)}
                            </span>
                          ))}
                          {entityIds.length > 8 && (
                            <span className="text-[10px] text-forest-f20">+{entityIds.length - 8} more</span>
                          )}
                        </div>
                      )}

                      {result && typeof result === "object" && Object.keys(result).length > 0 && (
                        <div className="text-[11px] text-forest-f30 bg-white rounded p-2 border border-sandstorm-s40">
                          <span className="font-medium text-forest-f40">Result: </span>
                          {JSON.stringify(result).slice(0, 300)}
                        </div>
                      )}

                      {error && (
                        <div className="text-[11px] text-red-600 bg-red-50 rounded p-2 border border-red-200">
                          <span className="font-medium">Error: </span>{String(error)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </BaseModal>
  );
}

export const PortfolioActionsTab: React.FC<Props> = ({ accountId, portfolioId, portfolioName: _portfolioName }) => {
  const [actions, setActions] = useState<PortfolioAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trailOpen, setTrailOpen] = useState(false);
  const { openAssistant, startNewSession } = useAssistant();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const prevAnalyzing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const status = await getPortfolioRefreshStatus(accountId, portfolioId);
        if (cancelled) return;
        setIsAnalyzing(status.isAnalyzing);

        if (prevAnalyzing.current && !status.isAnalyzing) {
          fetchActions(true);
        }
        prevAnalyzing.current = status.isAnalyzing;

        if (!status.isAnalyzing && timer) {
          clearInterval(timer);
          timer = null;
        }
      } catch {
        /* ignore polling errors */
      }
    };

    poll();
    timer = setInterval(poll, 60_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [accountId, portfolioId]);

  const handleCreateActions = useCallback(() => {
    startNewSession();
    openAssistant();
  }, [startNewSession, openAssistant]);

  const handleReanalyze = useCallback(() => {
    startNewSession();
    openAssistant();
  }, [startNewSession, openAssistant]);

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
            {isAnalyzing && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-forest-f40 bg-forest-f40/10 border border-forest-f40/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Analyzing...
              </span>
            )}
            {actions.length > 0 && (
              <button
                type="button"
                onClick={handleReanalyze}
                disabled={isAnalyzing}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                  isAnalyzing
                    ? "text-forest-f30 bg-sandstorm-s20 cursor-not-allowed"
                    : "text-white bg-forest-f40 hover:bg-forest-f50",
                )}
                aria-label="Re-analyze portfolio actions"
              >
                <RefreshCw className="w-3 h-3" />
                Re-analyze
              </button>
            )}
            {/* Activity Trail — hidden, accessible via trail modal state */}
            {false && (
              <button
                type="button"
                onClick={() => setTrailOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-forest-f40 hover:text-forest-f50 border border-sandstorm-s40 hover:border-forest-f40/30 transition-colors bg-white"
                aria-label="View activity trail"
              >
                <Activity className="w-3 h-3" />
                Activity Trail
              </button>
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-forest-f40 hover:text-forest-f50 border border-sandstorm-s40 hover:border-forest-f40/30 transition-colors bg-white"
              aria-label="View analysis history"
            >
              <History className="w-3 h-3" />
              Analysis History
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-forest-f40 hover:text-forest-f50 border border-sandstorm-s40 hover:border-forest-f40/30 transition-colors bg-white"
              aria-label="Open action settings"
            >
              <Settings className="w-3 h-3" />
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
      <PortfolioExecutionHistoryModal
        isOpen={trailOpen}
        onClose={() => setTrailOpen(false)}
        accountId={accountId}
        portfolioId={portfolioId}
      />
    </div>
  );
};
