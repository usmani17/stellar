import React, { useState, useMemo, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  Clock,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Search,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Pause,
  Play,
  Trash2,
  Brain,
  Lightbulb,
  History,
  Pencil,
  Calendar,
  X,
  Eye,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Loader, Tooltip, BaseModal } from "../ui";
import { cn } from "../../lib/cn";
import { updateActionStatus } from "../../services/dashboardActions";
import {
  getPortfolioActionTrail,
  updatePortfolioAction,
  updatePortfolioActionStatus,
  previewPortfolioAction,
  executePortfolioAction,
} from "../../services/portfolioActions";
import type { ActionPreviewProposal, ActionPreviewEntity } from "../../services/portfolioActions";
import type { ActionStatusLogEntry } from "../../services/dashboard";
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPE_COLORS,
} from "../../pages/workflows/components/dashboard/actionTypeDisplay";

const OPERATOR_SYMBOLS: Record<string, string> = {
  lt: "<",
  gt: ">",
  eq: "=",
  lte: "≤",
  gte: "≥",
  in: "in",
  not_in: "not in",
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  pending_review: { label: "Pending Review", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  paused: { label: "Paused", dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-600" },
  disabled: { label: "Disabled", dot: "bg-red-400", bg: "bg-red-50", text: "text-red-600" },
};

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ActionItem {
  id: string;
  action_slug: string;
  action_id: number;
  dashboard_id: number;
  dashboard_name?: string;
  component_id?: string;
  type: string;
  platform: string;
  entity_type: string;
  status: string;
  description: string;
  condition?: Record<string, unknown>;
  params?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
  reasoning?: {
    detected: string;
    why_it_matters: string;
    conclusion: string;
  };
  learning?: {
    patterns?: unknown[];
    strategy_adjustments?: unknown[];
  };
  has_query?: boolean;
  query_source?: string | null;
  schedule?: {
    frequency: string;
    time?: string;
    date?: string;
    weekdays?: number[];
    monthDays?: number[];
    timezone: string;
    auto_execute: boolean;
    next_run_at?: string;
  };
}

type GroupMode = "dashboard" | "component" | "none";
type StatusFilter = "all" | "active" | "pending_review" | "paused" | "disabled";

interface ActionsListPanelProps {
  actions: ActionItem[];
  accountId: number;
  portfolioId?: number;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  groupBy?: GroupMode;
  showDashboardLink?: boolean;
  onActionStatusChange?: (actionId: string, newStatus: string) => void;
  onCreateActions?: () => void;
  onCreateActionsWithPrompt?: (prompt: string) => void;
  createActionsDefaultPrompt?: string;
  headerExtra?: React.ReactNode;
}

const DISPLAY_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DISPLAY_TZ_LABEL = (() => {
  const parts = new Date().toLocaleTimeString("en-US", { timeZoneName: "short", timeZone: DISPLAY_TZ }).split(" ");
  return parts[parts.length - 1] || "local";
})();

function utcTimeToDisplay(utcTime: string, refDate?: string): string {
  const [hh, mm] = utcTime.split(":").map(Number);
  const dateStr = refDate || "2026-01-15";
  const d = new Date(`${dateStr}T${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}:00Z`);
  if (isNaN(d.getTime())) return utcTime;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: DISPLAY_TZ });
}

function utcDateTimeToDisplay(utcDate: string, utcTime: string): { date: string; time: string } {
  const [hh, mm] = utcTime.split(":").map(Number);
  const d = new Date(`${utcDate}T${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}:00Z`);
  if (isNaN(d.getTime())) return { date: utcDate, time: utcTime };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    date: `${get("month")}/${get("day")}/${get("year")}`,
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: DISPLAY_TZ }),
  };
}

function fmtNextRun(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: DISPLAY_TZ })
    + " at "
    + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: DISPLAY_TZ })
    + ` ${DISPLAY_TZ_LABEL}`;
}

function formatScheduleLabel(schedule?: ActionItem["schedule"]): string {
  if (!schedule || !schedule.frequency) return "Not scheduled";
  const t = schedule.time ?? "09:00";
  const displayTime = utcTimeToDisplay(t);
  switch (schedule.frequency) {
    case "hourly":
      return `Hourly (${DISPLAY_TZ_LABEL})`;
    case "daily":
      return `Daily at ${displayTime} (${DISPLAY_TZ_LABEL})`;
    case "weekly": {
      const days = (schedule.weekdays ?? []).map((d) => WEEKDAY_SHORT[d] ?? "?").join(", ");
      return `Weekly ${days || "Mon"} at ${displayTime} (${DISPLAY_TZ_LABEL})`;
    }
    case "monthly": {
      const days = (schedule.monthDays ?? []).sort((a, b) => a - b).join(", ");
      return `Monthly on ${days || "1"} at ${displayTime} (${DISPLAY_TZ_LABEL})`;
    }
    case "once": {
      if (schedule.date) {
        const disp = utcDateTimeToDisplay(schedule.date, t);
        return `Once on ${disp.date} at ${disp.time} (${DISPLAY_TZ_LABEL})`;
      }
      return `Once at ${displayTime} (${DISPLAY_TZ_LABEL})`;
    }
    default:
      return `${schedule.frequency} at ${displayTime} (${DISPLAY_TZ_LABEL})`;
  }
}

function formatMetricLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const GUARDRAIL_LABELS: Record<string, string> = {
  limit: "Limit",
  max_entities_per_action: "Max entities",
  warn_threshold: "Warn threshold",
  max_decrease_percent: "Max decrease",
  max_increase_percent: "Max increase",
  min_budget_amount: "Min budget",
  min_bid_amount: "Min bid",
  min_cpa: "Min CPA",
  min_roas: "Min ROAS",
  min_modifier_percent: "Min modifier",
  max_modifier_percent: "Max modifier",
  max_keywords_per_action: "Max keywords",
  max_placements_per_action: "Max placements",
  max_targets_per_action: "Max targets",
  max_values_per_action: "Max values",
};

const GUARDRAIL_DESCRIPTIONS: Record<string, string> = {
  limit: "Maximum number of changes this action can make in a single run",
  max_entities_per_action: "Maximum campaigns, ad sets, or ads affected per execution",
  warn_threshold: "When this many entities are affected, a warning is shown before execution",
  max_decrease_percent: "Largest allowed percentage decrease per change (e.g. budget cut)",
  max_increase_percent: "Largest allowed percentage increase per change (e.g. budget raise)",
  min_budget_amount: "Floor budget — the action will never set budget below this amount",
  min_bid_amount: "Floor bid — the action will never set a bid below this amount",
  min_cpa: "Minimum CPA threshold — action only triggers when CPA is at or above this",
  min_roas: "Minimum ROAS threshold — action only triggers when ROAS is at or above this",
  min_modifier_percent: "Smallest allowed bid modifier adjustment",
  max_modifier_percent: "Largest allowed bid modifier adjustment",
  max_keywords_per_action: "Maximum keywords added or negated in a single execution",
  max_placements_per_action: "Maximum placements excluded in a single execution",
  max_targets_per_action: "Maximum targets added or negated in a single execution",
  max_values_per_action: "Maximum values changed in a single execution",
};

function formatGuardrailValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (key.includes("percent") || key.includes("modifier")) return `${value}%`;
    if (key.startsWith("min_") && (key.includes("budget") || key.includes("bid") || key === "min_cpa")) return `$${value}`;
    return String(value);
  }
  return formatParamValue(value);
}

function formatParamValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    const items = val.map((v) => {
      if (typeof v === "string") return v;
      if (typeof v === "number") return String(v);
      if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        if (typeof obj.text === "string") {
          const mt = obj.match_type ? ` [${String(obj.match_type)}]` : "";
          return `${obj.text}${mt}`;
        }
        if (typeof obj.keyword === "string") return obj.keyword;
        if (typeof obj.value === "string") return obj.value;
        if (typeof obj.name === "string") return obj.name;
        return JSON.stringify(v);
      }
      return String(v);
    });
    return items.join(", ");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") return obj.text;
    if ("value" in obj) return String(obj.value);
    return JSON.stringify(val);
  }
  return String(val);
}

function formatSmartParams(
  actionType: string,
  params: Record<string, unknown>,
  platform?: string,
): Array<{ key: string; label: string }> {
  const changeType = String(params.change_type ?? "").toLowerCase();
  const unit = String(params.unit ?? "").toLowerCase();
  const value = params.value;
  const unitSuffix = unit === "percent" ? "%" : unit === "amount" ? " (amount)" : "";
  const _platform = (platform ?? "google").toLowerCase();

  // Meta-specific action formatting will go here when Meta actions are added
  // if (_platform === "meta") { ... }
  void _platform;

  switch (actionType) {
    case "adjust_budget":
    case "adjust_bid":
    case "adjust_shared_budget":
    case "adjust_portfolio_bid_target": {
      const verb = changeType === "increase" ? "Increase" : changeType === "decrease" ? "Decrease" : changeType === "set" ? "Set to" : changeType;
      return [{ key: "_summary", label: `${verb} ${value}${unitSuffix}` }];
    }
    case "adjust_target": {
      const target = String(params.target_type ?? "").toUpperCase();
      const verb = changeType === "increase" ? "Increase" : changeType === "decrease" ? "Decrease" : changeType === "set" ? "Set to" : changeType;
      return [{ key: "_summary", label: `${verb} ${target} by ${value}${unitSuffix}` }];
    }
    case "change_bid_strategy": {
      const strategy = String(params.strategy ?? "").replace(/_/g, " ");
      const parts: Array<{ key: string; label: string }> = [{ key: "strategy", label: `Strategy: ${strategy}` }];
      if (params.target_cpa != null) parts.push({ key: "target_cpa", label: `Target CPA: $${params.target_cpa}` });
      if (params.target_roas != null) parts.push({ key: "target_roas", label: `Target ROAS: ${params.target_roas}` });
      return parts;
    }
    case "set_frequency_cap": {
      const imp = params.impressions ?? "?";
      const tu = String(params.time_unit ?? "DAY").toLowerCase();
      return [{ key: "_summary", label: `${imp} impressions per ${tu}` }];
    }
    case "add_keyword":
    case "add_negative_keyword": {
      const kws = params.keywords;
      const matchType = params.match_type ? String(params.match_type) : undefined;
      const chips: Array<{ key: string; label: string }> = [];
      if (Array.isArray(kws)) {
        kws.forEach((kw, i) => {
          if (typeof kw === "string") {
            const mt = matchType ? ` [${matchType}]` : "";
            chips.push({ key: `kw_${i}`, label: `${kw}${mt}` });
          } else if (kw && typeof kw === "object") {
            const obj = kw as Record<string, unknown>;
            const text = String(obj.text ?? obj.keyword ?? "");
            const mt = obj.match_type ? ` [${String(obj.match_type)}]` : matchType ? ` [${matchType}]` : "";
            if (text) chips.push({ key: `kw_${i}`, label: `${text}${mt}` });
          }
        });
      }
      return chips.length > 0 ? chips : Object.entries(params).map(([k, v]) => ({ key: k, label: `${formatMetricLabel(k)}: ${formatParamValue(v)}` }));
    }
    case "change_state": {
      const status = String(params.status ?? "");
      return [{ key: "status", label: status === "PAUSED" ? "Pause" : status === "ENABLED" ? "Enable" : status }];
    }
    case "add_asset": {
      const at = String(params.asset_type ?? "").replace(/_/g, " ");
      const parts: Array<{ key: string; label: string }> = [{ key: "asset_type", label: `Type: ${at}` }];
      if (params.callout_text) parts.push({ key: "callout_text", label: String(params.callout_text) });
      if (params.link_text) parts.push({ key: "link_text", label: String(params.link_text) });
      if (params.header) parts.push({ key: "header", label: `Header: ${params.header}` });
      if (params.phone_number) parts.push({ key: "phone_number", label: String(params.phone_number) });
      return parts;
    }
    case "update_ad_url": {
      if (params.final_url) return [{ key: "final_url", label: String(params.final_url) }];
      break;
    }
    case "remove_keyword": {
      if (params.keyword_ids) return [{ key: "keyword_ids", label: `Keyword IDs: ${formatParamValue(params.keyword_ids)}` }];
      break;
    }
    case "remove_negative_keyword": {
      if (params.criterion_ids) return [{ key: "criterion_ids", label: `Criterion IDs: ${formatParamValue(params.criterion_ids)}` }];
      if (params.keyword_ids) return [{ key: "keyword_ids", label: `Keyword IDs: ${formatParamValue(params.keyword_ids)}` }];
      break;
    }
    case "adjust_device_bid": {
      const device = String(params.device ?? "");
      const verb = changeType === "increase" ? "Increase" : changeType === "decrease" ? "Decrease" : changeType === "set" ? "Set" : changeType;
      return [{ key: "_summary", label: `${device}: ${verb} ${value}%` }];
    }
    case "toggle_ai_max": {
      return [{ key: "enabled", label: params.enabled ? "Enable AI Max" : "Disable AI Max" }];
    }
    case "add_product_group":
    case "exclude_product_group": {
      const pgType = String(params.product_group_type ?? "").replace(/_/g, " ");
      const pgVal = String(params.product_group_value ?? "");
      const parts: Array<{ key: string; label: string }> = [];
      if (pgType && pgVal) {
        parts.push({ key: "pg", label: `${pgType}: ${pgVal}` });
      } else if (pgVal) {
        parts.push({ key: "pg", label: pgVal });
      }
      if (params.bid_micros != null) {
        const bidDollars = (Number(params.bid_micros) / 1_000_000).toFixed(2);
        parts.push({ key: "bid", label: `Bid: $${bidDollars}` });
      }
      return parts.length > 0 ? parts : Object.entries(params).map(([k, v]) => ({ key: k, label: `${formatMetricLabel(k)}: ${formatParamValue(v)}` }));
    }
    case "exclude_placement": {
      const placements = params.placements;
      const pType = params.placement_type ? String(params.placement_type) : "";
      const chips: Array<{ key: string; label: string }> = [];
      if (pType) chips.push({ key: "type", label: `Type: ${pType}` });
      if (Array.isArray(placements)) {
        placements.slice(0, 5).forEach((p, i) => chips.push({ key: `p_${i}`, label: String(p) }));
        if (placements.length > 5) chips.push({ key: "more", label: `+${placements.length - 5} more` });
      }
      return chips.length > 0 ? chips : Object.entries(params).map(([k, v]) => ({ key: k, label: `${formatMetricLabel(k)}: ${formatParamValue(v)}` }));
    }
    case "assign_shared_budget":
    case "assign_portfolio_bid_strategy": {
      const id = params.budget_id ?? params.bidding_strategy_id ?? "";
      const label = params.budget_id ? "Budget ID" : "Strategy ID";
      return [{ key: "_id", label: `${label}: ${id}` }];
    }
    case "adjust_impression_share_target": {
      const parts: Array<{ key: string; label: string }> = [];
      if (params.location) parts.push({ key: "location", label: String(params.location).replace(/_/g, " ") });
      if (params.fraction_micros != null) {
        const pct = (Number(params.fraction_micros) / 10_000).toFixed(1);
        parts.push({ key: "fraction", label: `Target: ${pct}%` });
      }
      if (params.cpc_bid_ceiling_micros != null) {
        const ceiling = (Number(params.cpc_bid_ceiling_micros) / 1_000_000).toFixed(2);
        parts.push({ key: "ceiling", label: `CPC Ceiling: $${ceiling}` });
      }
      return parts.length > 0 ? parts : Object.entries(params).map(([k, v]) => ({ key: k, label: `${formatMetricLabel(k)}: ${formatParamValue(v)}` }));
    }
    default:
      break;
  }

  return Object.entries(params).map(([key, val]) => ({
    key,
    label: `${formatMetricLabel(key)}: ${formatParamValue(val)}`,
  }));
}

function hasRealCondition(condition?: Record<string, unknown>): boolean {
  if (!condition || Object.keys(condition).length === 0) return false;
  if ("logic" in condition && Array.isArray(condition.conditions)) {
    const subs = condition.conditions as Array<Record<string, unknown>>;
    return subs.length > 0 && subs.some((c) => c.field && String(c.field).trim() !== "");
  }
  if ("field" in condition && String(condition.field ?? "").trim() !== "") return true;
  return false;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  campaign: "Campaigns",
  adgroup: "Ad Groups",
  keyword: "Keywords",
  ad: "Ads",
  asset: "Assets",
  asset_group: "Asset Groups",
  product_group: "Product Groups",
};

function getActionTargetDescription(actionType: string, entityType: string): string | null {
  const entityLabel = ENTITY_TYPE_LABELS[entityType] || entityType.replace(/_/g, " ");

  switch (actionType) {
    case "add_keyword":
      return entityType === "campaign"
        ? `Adding keywords to ad groups within matched ${entityLabel}`
        : `Adding keywords to matched ${entityLabel}`;
    case "add_negative_keyword":
      return entityType === "campaign"
        ? `Adding negative keywords at campaign level on matched ${entityLabel}`
        : `Adding negative keywords to matched ${entityLabel}`;
    case "remove_keyword":
      return `Removing keywords from matched ${entityLabel}`;
    case "remove_negative_keyword":
      return entityType === "campaign"
        ? `Removing negative keywords from matched ${entityLabel}`
        : `Removing negative keywords from matched ${entityLabel}`;
    case "add_asset":
      return `Linking asset to matched ${entityLabel}`;
    case "remove_asset":
      return `Unlinking asset from matched ${entityLabel}`;
    case "adjust_budget":
    case "adjust_shared_budget":
      return `Adjusting budget on matched ${entityLabel}`;
    case "adjust_bid":
      return `Adjusting bids on matched ${entityLabel}`;
    case "adjust_target":
      return `Adjusting target on matched ${entityLabel}`;
    case "change_bid_strategy":
      return `Switching bid strategy on matched ${entityLabel}`;
    case "change_state":
      return `Changing status on matched ${entityLabel}`;
    case "set_frequency_cap":
      return `Setting frequency cap on matched ${entityLabel}`;
    case "exclude_placement":
      return `Excluding placements on matched ${entityLabel}`;
    case "update_ad_url":
      return `Updating URLs on matched ${entityLabel}`;
    case "adjust_device_bid":
      return `Adjusting device bids on matched ${entityLabel}`;
    case "adjust_demographic_bid":
      return `Adjusting demographic bids on matched ${entityLabel}`;
    case "set_ad_schedule":
      return `Setting ad schedule on matched ${entityLabel}`;
    default:
      return `Applies to matched ${entityLabel}`;
  }
}

function getFormattedGuardrails(guardrails?: Record<string, unknown>): Array<{ key: string; label: string; value: string; description: string }> {
  if (!guardrails || typeof guardrails !== "object") return [];
  return Object.entries(guardrails)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => ({
      key,
      label: GUARDRAIL_LABELS[key] || formatMetricLabel(key),
      value: formatGuardrailValue(key, value),
      description: GUARDRAIL_DESCRIPTIONS[key] || `Safety limit for ${(GUARDRAIL_LABELS[key] || key).toLowerCase()}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function toStringList(items: unknown[] | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return item;
    if (item != null && typeof item === "object" && "text" in item) return String((item as Record<string, unknown>).text);
    if (item != null && typeof item === "object" && "value" in item) return String((item as Record<string, unknown>).value);
    return String(item);
  });
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: "Created",
  approved: "Approved",
  declined: "Declined",
  paused: "Paused",
  resumed: "Resumed",
  disabled: "Disabled",
  executed: "Executed",
  reanalyzed: "Re-analyzed",
  status_changed: "Status changed",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  created: "bg-forest-f0 text-forest-f50 border-forest-f40/25",
  approved: "bg-forest-f0 text-forest-f40 border-forest-f40/30",
  declined: "bg-red-r0 text-red-r30 border-red-r30/30",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-300",
  resumed: "bg-forest-f0 text-forest-f40 border-forest-f40/25",
  disabled: "bg-sandstorm-s20 text-forest-f30 border-sandstorm-s40",
  executed: "bg-forest-f0 text-forest-f50 border-forest-f40/40",
  reanalyzed: "bg-forest-f0/60 text-forest-f40 border-forest-f40/25",
  status_changed: "bg-sandstorm-s10 text-forest-f60 border-sandstorm-s40",
};

const TYPE_ACCENT_COLORS: Record<string, string> = {
  budget: "border-l-blue-500",
  bidding: "border-l-violet-500",
  targeting: "border-l-amber-500",
  creative: "border-l-pink-500",
  status: "border-l-emerald-500",
  keyword: "border-l-cyan-500",
  schedule: "border-l-orange-500",
};

interface ConditionEntry {
  field: string;
  operator: string;
  value: string | number;
  label: string;
}

function parseConditions(condition?: Record<string, unknown>): { logic: string; entries: ConditionEntry[] } {
  if (!condition || Object.keys(condition).length === 0) return { logic: "and", entries: [] };
  if ("logic" in condition && Array.isArray(condition.conditions)) {
    const entries = (condition.conditions as Array<Record<string, unknown>>).map((c) => ({
      field: String(c.field ?? ""),
      operator: String(c.operator ?? "gt"),
      value: c.value as string | number ?? "",
      label: String(c.label ?? ""),
    }));
    return { logic: String(condition.logic ?? "and"), entries };
  }
  if ("field" in condition) {
    return {
      logic: "and",
      entries: [{
        field: String(condition.field ?? ""),
        operator: String(condition.operator ?? "gt"),
        value: condition.value as string | number ?? "",
        label: String(condition.label ?? ""),
      }],
    };
  }
  return { logic: "and", entries: [] };
}

function conditionsToPayload(logic: string, entries: ConditionEntry[]): Record<string, unknown> {
  if (entries.length === 0) return {};
  const conditions = entries.map((e) => {
    const c: Record<string, unknown> = { field: e.field, operator: e.operator, value: e.value };
    if (e.label) c.label = e.label;
    return c;
  });
  return { logic, conditions };
}

const CONDITION_OPERATORS = [
  { value: "gt", label: "> greater than" },
  { value: "gte", label: "≥ greater or equal" },
  { value: "lt", label: "< less than" },
  { value: "lte", label: "≤ less or equal" },
  { value: "eq", label: "= equals" },
  { value: "neq", label: "≠ not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "in", label: "in (list)" },
  { value: "not_in", label: "not in (list)" },
];

const LIST_OPERATORS = new Set(["in", "not_in"]);

interface MetricGroup {
  group: string;
  options: Array<{ value: string; label: string }>;
}

const GOOGLE_DB_METRICS: MetricGroup[] = [
  {
    group: "Cost & Spend",
    options: [
      { value: "cost", label: "Cost" },
      { value: "cost_micros", label: "Cost (Micros)" },
      { value: "average_cpc", label: "Avg CPC" },
      { value: "average_cpm", label: "Avg CPM" },
      { value: "average_cost", label: "Avg Cost" },
    ],
  },
  {
    group: "Conversions",
    options: [
      { value: "conversions", label: "Conversions" },
      { value: "conversions_value", label: "Conversion Value" },
      { value: "cost_per_conversion", label: "Cost / Conversion" },
      { value: "conversion_rate", label: "Conversion Rate" },
      { value: "all_conversions", label: "All Conversions" },
      { value: "all_conversions_value", label: "All Conv. Value" },
    ],
  },
  {
    group: "Performance",
    options: [
      { value: "impressions", label: "Impressions" },
      { value: "clicks", label: "Clicks" },
      { value: "ctr", label: "CTR" },
      { value: "interaction_rate", label: "Interaction Rate" },
      { value: "search_impression_share", label: "Search Impression Share" },
      { value: "search_top_impression_share", label: "Search Top IS" },
    ],
  },
  {
    group: "Status & Entity",
    options: [
      { value: "status", label: "Status" },
      { value: "campaign_status", label: "Campaign Status" },
      { value: "ad_group_status", label: "Ad Group Status" },
      { value: "campaign_id", label: "Campaign ID" },
      { value: "ad_group_id", label: "Ad Group ID" },
    ],
  },
];

const META_DB_METRICS: MetricGroup[] = [
  {
    group: "Cost & Spend",
    options: [
      { value: "spend", label: "Spend" },
      { value: "cpc", label: "CPC" },
      { value: "cpm", label: "CPM" },
      { value: "cpp", label: "CPP" },
    ],
  },
  {
    group: "Conversions",
    options: [
      { value: "conversions", label: "Conversions" },
      { value: "cost_per_conversion", label: "Cost / Conversion" },
      { value: "roas", label: "ROAS" },
      { value: "purchase_roas", label: "Purchase ROAS" },
      { value: "cost_per_action_type", label: "Cost per Action" },
    ],
  },
  {
    group: "Performance",
    options: [
      { value: "impressions", label: "Impressions" },
      { value: "clicks", label: "Clicks" },
      { value: "ctr", label: "CTR" },
      { value: "reach", label: "Reach" },
      { value: "frequency", label: "Frequency" },
      { value: "actions", label: "Actions" },
    ],
  },
  {
    group: "Status & Entity",
    options: [
      { value: "status", label: "Status" },
      { value: "effective_status", label: "Effective Status" },
      { value: "campaign_id", label: "Campaign ID" },
      { value: "adset_id", label: "Ad Set ID" },
    ],
  },
];

function extractSqlColumns(sql?: string): string[] {
  if (!sql) return [];
  const selectMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!selectMatch) return [];
  return selectMatch[1]
    .split(",")
    .map((col) => {
      const trimmed = col.trim();
      const asMatch = trimmed.match(/\bAS\s+["']?(\w+)["']?\s*$/i);
      if (asMatch) return asMatch[1];
      const parts = trimmed.split(".");
      return parts[parts.length - 1].replace(/["'`]/g, "").trim();
    })
    .filter((c) => c && !c.includes("(") && !c.includes("*"));
}

function getMetricGroups(platform: string, querySql?: string, existingConditions?: Record<string, unknown>): MetricGroup[] {
  const groups: MetricGroup[] = [];

  const condFields: Array<{ value: string; label: string }> = [];
  if (existingConditions) {
    const conds = (existingConditions.conditions ?? []) as Array<{ field?: string; label?: string }>;
    const seen = new Set<string>();
    for (const c of conds) {
      if (c.field && !seen.has(c.field)) {
        seen.add(c.field);
        condFields.push({ value: c.field, label: c.label || formatMetricLabel(c.field) });
      }
    }
  }
  if (condFields.length > 0) {
    groups.push({ group: "Current Conditions", options: condFields });
  }

  const sqlCols = extractSqlColumns(querySql);
  if (sqlCols.length > 0) {
    const alreadyAdded = new Set(condFields.map((f) => f.value));
    const newCols = sqlCols.filter((c) => !alreadyAdded.has(c));
    if (newCols.length > 0) {
      groups.push({
        group: "From Query",
        options: newCols.map((c) => ({ value: c, label: formatMetricLabel(c) })),
      });
    }
  }

  const platformGroups = platform === "meta" ? META_DB_METRICS : GOOGLE_DB_METRICS;
  groups.push(...platformGroups);
  return groups;
}

function flatMetricValues(groups: MetricGroup[]): Array<{ value: string; label: string }> {
  return groups.flatMap((g) => g.options);
}

const TriggerEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  condition?: Record<string, unknown>;
  platform: string;
  querySql?: string;
  accountId: number;
  portfolioId: number;
  actionId: number;
  onSaved: () => void;
}> = ({ isOpen, onClose, condition, platform, querySql, accountId, portfolioId, actionId, onSaved }) => {
  const parsed = useMemo(() => parseConditions(condition), [condition]);
  const metricGroups = useMemo(() => getMetricGroups(platform, querySql, condition), [platform, querySql, condition]);
  const flatMetrics = useMemo(() => flatMetricValues(metricGroups), [metricGroups]);
  const [logic, setLogic] = useState(parsed.logic);
  const [entries, setEntries] = useState<ConditionEntry[]>(parsed.entries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const p = parseConditions(condition);
      setLogic(p.logic);
      const ents = p.entries.length > 0 ? p.entries : [{ field: "", operator: "gt", value: "", label: "" }];
      setEntries(ents);
      setError(null);
    }
  }, [isOpen, condition]);

  const updateEntry = (idx: number, patch: Partial<ConditionEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { field: "", operator: "gt", value: "", label: "" }]);
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    const validEntries = entries.filter((e) => e.field.trim());
    if (validEntries.length === 0) {
      setError("At least one condition with a field name is required");
      return;
    }
    for (const e of validEntries) {
      if (!e.field.trim()) { setError("Field name cannot be empty"); return; }
      if (e.value === "" || e.value === null || e.value === undefined) { setError(`Value for "${e.field}" is required`); return; }
    }
    const typedEntries = validEntries.map((e) => {
      if (LIST_OPERATORS.has(e.operator)) {
        const items = String(e.value).split(",").map((s) => s.trim()).filter(Boolean);
        const typedItems = items.map((v) => (isNaN(Number(v)) ? v : Number(v)));
        return { ...e, value: typedItems as unknown as string | number };
      }
      const v = e.value;
      return { ...e, value: (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "") ? Number(v) : v };
    });

    setSaving(true);
    setError(null);
    try {
      await updatePortfolioAction(accountId, portfolioId, actionId, {
        condition: conditionsToPayload(logic, typedEntries),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-forest-f40" />
          <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir">Edit Trigger Conditions</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-forest-f20 hover:bg-sandstorm-s5 hover:text-forest-f60 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        <p className="text-[12px] text-forest-f30 leading-relaxed">
          Define when this action should trigger. Each condition references a metric field. All conditions must be met ({logic.toUpperCase()}) for the action to execute.
        </p>

        {/* Logic toggle */}
        {entries.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-forest-f30 font-medium">Logic:</span>
            {["and", "or"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLogic(l)}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-semibold border transition-colors",
                  logic === l
                    ? "bg-forest-f40 text-white border-forest-f40"
                    : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10",
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Condition entries */}
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={idx} className="rounded-lg border border-sandstorm-s40 p-3 space-y-2.5 bg-sandstorm-s0/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-forest-f50">
                  Condition {idx + 1}
                </span>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Remove condition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Metric field — full width */}
              <div>
                <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">
                  Metric
                </label>
                <select
                  value={entry.field}
                  onChange={(e) => {
                    const match = flatMetrics.find((m) => m.value === e.target.value);
                    updateEntry(idx, { field: e.target.value, label: match?.label ?? formatMetricLabel(e.target.value) });
                  }}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40"
                >
                  <option value="">Select metric…</option>
                  {metricGroups.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((m) => (
                        <option key={`${grp.group}-${m.value}`} value={m.value}>
                          {m.label} ({m.value})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Display label — full width */}
              <div>
                <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">
                  Display label
                </label>
                <input
                  type="text"
                  value={entry.label}
                  onChange={(e) => updateEntry(idx, { label: e.target.value })}
                  placeholder="e.g. Cost"
                  className="w-full px-2.5 py-1.5 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20"
                />
              </div>

              {/* Operator + Value — side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">
                    Operator
                  </label>
                  <select
                    value={entry.operator}
                    onChange={(e) => updateEntry(idx, { operator: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40"
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">
                    {LIST_OPERATORS.has(entry.operator) ? "Values (comma-separated)" : "Value"}
                  </label>
                  {LIST_OPERATORS.has(entry.operator) ? (
                    <textarea
                      value={Array.isArray(entry.value) ? (entry.value as unknown as string[]).join(", ") : String(entry.value)}
                      onChange={(e) => updateEntry(idx, { value: e.target.value })}
                      placeholder="value1, value2, value3"
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(entry.value)}
                      onChange={(e) => updateEntry(idx, { value: e.target.value })}
                      placeholder="e.g. 1000000"
                      className="w-full px-2.5 py-1.5 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addEntry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-forest-f40 hover:text-forest-f50 border border-dashed border-forest-f40/30 hover:border-forest-f40/60 rounded-lg transition-colors"
        >
          <Zap className="w-3 h-3" />
          Add condition
        </button>

        {error && (
          <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-sandstorm-s40">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] font-semibold text-forest-f60 border border-sandstorm-s40 rounded-md hover:bg-sandstorm-s10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-forest-f40 hover:bg-forest-f50 rounded-md disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Conditions"}
        </button>
      </div>
    </BaseModal>
  );
};

interface ScheduleEditorState {
  frequency: string;
  time: string;
  weekdays: number[];
  monthDays: number[];
  date: string;
}

const FREQ_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "once", label: "Once" },
];

const SCHED_TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return { value: `${h}:00`, label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM` };
});

const SCHED_WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function utcToEtEditorValues(utcTime: string, utcDate?: string): { time: string; date: string } {
  const dateStr = utcDate || new Date().toISOString().slice(0, 10);
  const [hh, mm] = utcTime.split(":").map(Number);
  const d = new Date(`${dateStr}T${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}:00Z`);
  if (isNaN(d.getTime())) return { time: utcTime, date: dateStr };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const localHour = get("hour") === "24" ? "00" : get("hour");
  return {
    time: `${localHour}:${get("minute")}`,
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function scheduleToEditorState(schedule?: ActionItem["schedule"]): ScheduleEditorState {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (!schedule?.time) {
    return {
      frequency: schedule?.frequency || "daily",
      time: "09:00",
      weekdays: schedule?.weekdays ?? [0],
      monthDays: schedule?.monthDays ?? [1],
      date: todayStr,
    };
  }
  const et = utcToEtEditorValues(schedule.time, schedule.date);
  return {
    frequency: schedule.frequency || "daily",
    time: et.time,
    weekdays: schedule.weekdays ?? [0],
    monthDays: schedule.monthDays ?? [1],
    date: schedule.frequency === "once" ? et.date : (schedule.date || todayStr),
  };
}

function etToUtc(etTime: string, etDate: string): { utcTime: string; utcDate: string; utcIso: string } {
  const [hh, mm] = etTime.split(":").map(Number);
  const [yy, mo, dd] = etDate.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const target = new Date(yy, mo - 1, dd, hh, mm || 0, 0);
  let lo = target.getTime() - 24 * 3600_000;
  let hi = target.getTime() + 24 * 3600_000;
  for (let i = 0; i < 20; i++) {
    const mid = Math.round((lo + hi) / 2);
    const probe = new Date(mid);
    const parts = formatter.formatToParts(probe);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    const pH = get("hour") === 24 ? 0 : get("hour");
    const diff = (pH * 60 + get("minute")) - (hh * 60 + (mm || 0));
    if (diff === 0) {
      const utcH = String(probe.getUTCHours()).padStart(2, "0");
      const utcM = String(probe.getUTCMinutes()).padStart(2, "0");
      const utcY = probe.getUTCFullYear();
      const utcMo = String(probe.getUTCMonth() + 1).padStart(2, "0");
      const utcD = String(probe.getUTCDate()).padStart(2, "0");
      return {
        utcTime: `${utcH}:${utcM}`,
        utcDate: `${utcY}-${utcMo}-${utcD}`,
        utcIso: `${utcY}-${utcMo}-${utcD}T${utcH}:${utcM}:00Z`,
      };
    }
    if (diff > 0) hi = mid; else lo = mid;
  }
  return { utcTime: etTime, utcDate: etDate, utcIso: `${etDate}T${etTime}:00Z` };
}

function editorStateToPayload(s: ScheduleEditorState): Record<string, unknown> {
  const refDate = s.date || new Date().toISOString().slice(0, 10);
  const { utcTime } = etToUtc(s.time, refDate);

  const base: Record<string, unknown> = {
    schedule_auto_execute: true,
    schedule_frequency: s.frequency,
    schedule_time: utcTime,
    schedule_timezone: "UTC",
  };
  if (s.frequency === "weekly") base.schedule_weekdays = s.weekdays;
  else if (s.frequency === "monthly") base.schedule_month_days = s.monthDays;
  else if (s.frequency === "once" && s.date) {
    const once = etToUtc(s.time, s.date);
    base.schedule_time = once.utcTime;
    base.schedule_date = once.utcDate;
    base.schedule_next_run_at = once.utcIso;
  }
  return base;
}

// ── Params Edit Modal ─────────────────────────────────────────────────────────

const PARAM_FIELD_CONFIG: Record<string, {
  label: string;
  type: "text" | "url" | "number" | "boolean" | "select" | "textarea" | "string-list";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  helperText?: string;
  readonly?: boolean;
}> = {
  // ── User-facing content (editable) ──────────────────────────────────────────
  final_url: { label: "Final URL", type: "url", placeholder: "https://example.com/landing-page", helperText: "Must start with http:// or https://" },
  final_urls: { label: "Final URLs", type: "string-list", placeholder: "https://example.com/page", helperText: "One URL per line" },
  link_text: { label: "Link Text", type: "text", placeholder: "e.g. Shop Now" },
  description1: { label: "Description Line 1", type: "text", placeholder: "e.g. Free shipping on orders $50+" },
  description2: { label: "Description Line 2", type: "text", placeholder: "e.g. 30-day returns" },
  callout_text: { label: "Callout Text", type: "text", placeholder: "e.g. Free Shipping" },
  header: {
    label: "Header", type: "select", readonly: true, helperText: "Structured snippet header — set by Agent analysis",
    options: [
      { value: "Amenities", label: "Amenities" },
      { value: "Brands", label: "Brands" },
      { value: "Courses", label: "Courses" },
      { value: "Degree programs", label: "Degree programs" },
      { value: "Destinations", label: "Destinations" },
      { value: "Featured hotels", label: "Featured hotels" },
      { value: "Insurance coverage", label: "Insurance coverage" },
      { value: "Models", label: "Models" },
      { value: "Neighborhoods", label: "Neighborhoods" },
      { value: "Service catalog", label: "Service catalog" },
      { value: "Shows", label: "Shows" },
      { value: "Styles", label: "Styles" },
      { value: "Types", label: "Types" },
    ],
  },
  values: { label: "Values", type: "string-list", placeholder: "e.g. Nike, Adidas, Puma", helperText: "One value per line" },
  phone_number: { label: "Phone Number", type: "text", placeholder: "+15551234567" },
  promotion_target: { label: "Promotion Target", type: "text", placeholder: "e.g. Summer Sale" },
  percent_off: { label: "Percent Off", type: "number", placeholder: "20" },
  product_group_value: { label: "Product Group Value", type: "text", readonly: true, helperText: "Must match your Merchant Center feed — set by Agent analysis" },
  keywords: { label: "Keywords", type: "string-list", placeholder: "One keyword per line" },

  // ── Numeric values (editable) ───────────────────────────────────────────────
  value: { label: "Value", type: "number", placeholder: "e.g. 20" },
  impressions: { label: "Impressions", type: "number", placeholder: "e.g. 3" },
  target_cpa: { label: "Target CPA ($)", type: "number", placeholder: "e.g. 15" },
  target_roas: { label: "Target ROAS", type: "number", placeholder: "e.g. 3.0" },
  bid_micros: { label: "CPC Bid (micros)", type: "number", placeholder: "500000 = $0.50", helperText: "1,000,000 micros = $1.00" },
  cpc_bid_micros: { label: "CPC Bid (micros)", type: "number", placeholder: "500000 = $0.50", helperText: "1,000,000 micros = $1.00" },
  fraction_micros: { label: "Target Fraction (micros)", type: "number", placeholder: "700000 = 70%" },
  cpc_bid_ceiling_micros: { label: "CPC Bid Ceiling (micros)", type: "number", placeholder: "5000000 = $5.00" },

  // ── Selects the user can change (editable) ─────────────────────────────────
  change_type: {
    label: "Change Type", type: "select",
    options: [
      { value: "increase", label: "Increase" },
      { value: "decrease", label: "Decrease" },
      { value: "set", label: "Set to value" },
    ],
  },
  unit: {
    label: "Unit", type: "select",
    options: [{ value: "percent", label: "Percent (%)" }, { value: "amount", label: "Amount ($)" }],
  },
  status: {
    label: "Status", type: "select",
    options: [{ value: "PAUSED", label: "Paused" }, { value: "ENABLED", label: "Enabled" }],
  },
  enabled: { label: "Enabled", type: "boolean" },
  match_type: {
    label: "Match Type", type: "select",
    options: [
      { value: "EXACT", label: "Exact" },
      { value: "PHRASE", label: "Phrase" },
      { value: "BROAD", label: "Broad" },
    ],
  },
  strategy: {
    label: "Strategy", type: "select",
    options: [
      { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
      { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
      { value: "TARGET_CPA", label: "Target CPA" },
      { value: "TARGET_ROAS", label: "Target ROAS" },
      { value: "MANUAL_CPC", label: "Manual CPC" },
      { value: "MANUAL_CPM", label: "Manual CPM" },
      { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    ],
  },
  time_unit: {
    label: "Time Unit", type: "select",
    options: [
      { value: "DAY", label: "Per Day" },
      { value: "WEEK", label: "Per Week" },
      { value: "MONTH", label: "Per Month" },
    ],
  },
  location: {
    label: "Target Location", type: "select",
    options: [
      { value: "ANYWHERE_ON_PAGE", label: "Anywhere on page" },
      { value: "TOP_OF_PAGE", label: "Top of page" },
      { value: "ABSOLUTE_TOP_OF_PAGE", label: "Absolute top of page" },
    ],
  },
  targeting_action: {
    label: "Action", type: "select",
    options: [
      { value: "add", label: "Add" },
      { value: "remove", label: "Remove" },
      { value: "replace", label: "Replace" },
    ],
  },

  // ── Structural / system fields (READONLY — never let user free-type) ────────
  asset_type: {
    label: "Asset Type", type: "select", readonly: true,
    options: [
      { value: "SITELINK", label: "Sitelink" },
      { value: "CALLOUT", label: "Callout" },
      { value: "STRUCTURED_SNIPPET", label: "Structured Snippet" },
      { value: "CALL", label: "Call" },
      { value: "PROMOTION", label: "Promotion" },
      { value: "PRICE", label: "Price" },
    ],
  },
  asset_resource_name: { label: "Asset Resource Name", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
  target_type: {
    label: "Target Type", type: "select", readonly: true,
    options: [{ value: "cpa", label: "CPA" }, { value: "roas", label: "ROAS" }],
  },
  level: { label: "Level", type: "text", readonly: true },
  country_code: { label: "Country Code", type: "text", readonly: true },
  device: {
    label: "Device", type: "select", readonly: true,
    options: [
      { value: "MOBILE", label: "Mobile" },
      { value: "DESKTOP", label: "Desktop" },
      { value: "TABLET", label: "Tablet" },
      { value: "CONNECTED_TV", label: "Connected TV" },
    ],
  },
  demographic_type: {
    label: "Demographic Type", type: "select", readonly: true,
    options: [
      { value: "age", label: "Age" },
      { value: "gender", label: "Gender" },
      { value: "income", label: "Income" },
      { value: "parental_status", label: "Parental Status" },
    ],
  },
  segment: { label: "Segment", type: "text", readonly: true },
  product_group_type: {
    label: "Product Group Type", type: "select", readonly: true,
    options: [
      { value: "BRAND", label: "Brand" },
      { value: "CATEGORY", label: "Category" },
      { value: "PRODUCT_TYPE", label: "Product Type" },
      { value: "CUSTOM_LABEL", label: "Custom Label" },
    ],
  },
  targeting_type: {
    label: "Targeting Type", type: "select", readonly: true,
    options: [
      { value: "location", label: "Location" },
      { value: "language", label: "Language" },
      { value: "audience", label: "Audience" },
      { value: "interest", label: "Interest" },
    ],
  },
  placement_type: {
    label: "Placement Type", type: "select", readonly: true,
    options: [
      { value: "SITE", label: "Site" },
      { value: "APP", label: "App" },
      { value: "DEVICE_TYPE", label: "Device Type" },
      { value: "CHANNEL", label: "Channel" },
    ],
  },
  price_type: { label: "Price Type", type: "text", readonly: true },

  // ── System IDs (READONLY — breaking these breaks execution) ─────────────────
  budget_id: { label: "Budget ID", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
  bidding_strategy_id: { label: "Bidding Strategy ID", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
  strategy_id: { label: "Strategy ID", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
  keyword_ids: { label: "Keyword IDs", type: "text", readonly: true, helperText: "IDs of keywords that will be affected" },
  criterion_ids: { label: "Criterion IDs", type: "text", readonly: true, helperText: "IDs of criteria that will be affected" },
  resource_names: { label: "Resource Names", type: "string-list", readonly: true },
  placements: { label: "Placements", type: "string-list", readonly: true },
  age_ranges: { label: "Age Ranges", type: "string-list", readonly: true },
  listing_group_id: { label: "Listing Group ID", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
  ad_group_id: { label: "Ad Group ID", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
  campaign_id: { label: "Campaign ID", type: "text", readonly: true, helperText: "System identifier — set by Agent analysis" },
};

function KeywordChipsEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: Array<{ idx: number; text: string; match_type?: string }>;
  onChange: (updated: Array<{ text: string; match_type?: string }>) => void;
}) {
  const allItemsRef = useRef(items);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());

  const toggleRemoval = (idx: number) => {
    setRemovedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      const remaining = allItemsRef.current
        .filter((_, i) => !next.has(i))
        .map(({ text, match_type }) => ({ text, match_type }));
      onChange(remaining);
      return next;
    });
  };

  const displayed = allItemsRef.current;

  return (
    <div>
      <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 rounded-md border border-sandstorm-s40 bg-white">
        {displayed.length === 0 && (
          <span className="text-[11px] text-forest-f20 italic">No keywords</span>
        )}
        {displayed.map((item, i) => {
          const isRemoved = removedIndices.has(i);
          return (
            <span
              key={`${item.text}-${i}`}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                isRemoved
                  ? "bg-red-50 border border-red-200 text-red-400 line-through"
                  : "bg-forest-f0/50 border border-forest-f40/20 text-forest-f50",
              )}
            >
              <span>{item.text}</span>
              {item.match_type && (
                <span className={cn(
                  "text-[9px] uppercase font-semibold px-1 py-0.5 rounded",
                  isRemoved ? "text-red-300 bg-red-50" : "text-forest-f30 bg-sandstorm-s10",
                )}>
                  {item.match_type}
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleRemoval(i)}
                className={cn(
                  "ml-0.5 p-0.5 rounded-full transition-colors",
                  isRemoved
                    ? "text-red-400 hover:text-red-600 hover:bg-red-100"
                    : "text-forest-f20 hover:text-red-500 hover:bg-red-50",
                )}
                aria-label={isRemoved ? "Undo remove" : "Remove keyword"}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      {removedIndices.size > 0 && (
        <p className="text-[10px] text-red-500 mt-1">
          {removedIndices.size} keyword{removedIndices.size > 1 ? "s" : ""} marked for removal
        </p>
      )}
    </div>
  );
}

const ParamsEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  actionType: string;
  params: Record<string, unknown>;
  accountId: number;
  portfolioId: number;
  actionId: number;
  onSaved: () => void;
}> = ({ isOpen, onClose, actionType, params, accountId, portfolioId, actionId, onSaved }) => {
  const [editParams, setEditParams] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditParams({ ...params });
      setError(null);
    }
  }, [isOpen, params]);

  const updateParam = (key: string, value: unknown) => {
    setEditParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const urlFields = ["final_url"];
    for (const f of urlFields) {
      const v = editParams[f];
      if (typeof v === "string" && v.trim() && !v.startsWith("http://") && !v.startsWith("https://")) {
        setError(`${PARAM_FIELD_CONFIG[f]?.label || f} must start with http:// or https://`);
        return;
      }
    }
    const urlListFields = ["final_urls"];
    for (const f of urlListFields) {
      const v = editParams[f];
      if (Array.isArray(v)) {
        for (const u of v) {
          if (typeof u === "string" && u.trim() && !u.startsWith("http://") && !u.startsWith("https://")) {
            setError(`Each URL in ${PARAM_FIELD_CONFIG[f]?.label || f} must start with http:// or https://`);
            return;
          }
        }
      }
    }

    setSaving(true);
    setError(null);
    try {
      await updatePortfolioAction(accountId, portfolioId, actionId, { params: editParams });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const PARAM_DISPLAY_ORDER: Record<string, number> = {
    change_type: 1,
    value: 2,
    unit: 3,
    target_type: 10,
    strategy: 11,
    target_cpa: 12,
    target_roas: 13,
    status: 15,
    enabled: 16,
    device: 17,
    demographic_type: 18,
    segment: 19,
    asset_type: 20,
    callout_text: 21,
    link_text: 22,
    description1: 23,
    description2: 24,
    header: 25,
    values: 26,
    final_url: 27,
    final_urls: 28,
    phone_number: 29,
    country_code: 30,
    promotion_target: 31,
    percent_off: 32,
    keywords: 35,
    match_type: 36,
    impressions: 40,
    time_unit: 41,
    level: 42,
    location: 43,
    fraction_micros: 44,
    cpc_bid_ceiling_micros: 45,
    product_group_type: 50,
    product_group_value: 51,
    bid_micros: 52,
    cpc_bid_micros: 53,
    budget_id: 90,
    bidding_strategy_id: 91,
    strategy_id: 92,
    asset_resource_name: 93,
    keyword_ids: 94,
    criterion_ids: 95,
    resource_names: 96,
    placements: 97,
    age_ranges: 98,
    listing_group_id: 99,
    ad_group_id: 100,
    campaign_id: 101,
  };

  const paramKeys = Object.keys(editParams).sort((a, b) => {
    const oa = PARAM_DISPLAY_ORDER[a] ?? 80;
    const ob = PARAM_DISPLAY_ORDER[b] ?? 80;
    return oa - ob;
  });

  const renderField = (key: string) => {
    const config = PARAM_FIELD_CONFIG[key];
    const value = editParams[key];
    const label = config?.label || formatMetricLabel(key);
    const fieldType = config?.type || (typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text");
    const isReadonly = config?.readonly === true;

    if (isReadonly) {
      let displayVal = formatParamValue(value);
      if (fieldType === "select" && config?.options) {
        const strVal = String(value ?? "").toUpperCase();
        const match = config.options.find((o) => o.value.toUpperCase() === strVal);
        if (match) displayVal = match.label;
      }
      return (
        <div key={key}>
          <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
          <div className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40/50 rounded-md bg-sandstorm-s10/50 text-forest-f30 cursor-not-allowed">
            {displayVal}
          </div>
          {config?.helperText && <p className="text-[10px] text-forest-f20 mt-0.5">{config.helperText}</p>}
        </div>
      );
    }

    if (fieldType === "boolean") {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <label className="text-[12px] font-medium text-forest-f60">{label}</label>
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => updateParam(key, !value)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              value ? "bg-forest-f40" : "bg-sandstorm-s40",
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
              value ? "translate-x-5" : "translate-x-0",
            )} />
          </button>
        </div>
      );
    }

    if (fieldType === "select" && config?.options) {
      const strVal = String(value ?? "");
      const normalizedVal = config.options.find(
        (o) => o.value.toUpperCase() === strVal.toUpperCase(),
      )?.value ?? strVal;
      return (
        <div key={key}>
          <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
          <select
            value={normalizedVal}
            onChange={(e) => updateParam(key, e.target.value)}
            className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40"
          >
            <option value="">Select…</option>
            {config.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (fieldType === "string-list") {
      const hasObjects = Array.isArray(value) && value.some((v) => v && typeof v === "object");

      if (key === "keywords" && hasObjects) {
        const items = (value as Array<Record<string, unknown>>).map((kw, i) => ({
          idx: i,
          text: String(kw.text ?? kw.keyword ?? ""),
          match_type: kw.match_type ? String(kw.match_type) : undefined,
        }));
        return (
          <KeywordChipsEditor
            key={key}
            label={label}
            items={items}
            onChange={(updated) => {
              const newKws = updated.map((item) => {
                const kw: Record<string, unknown> = { text: item.text };
                if (item.match_type) kw.match_type = item.match_type;
                return kw;
              });
              updateParam(key, newKws);
            }}
          />
        );
      }

      const listVal = Array.isArray(value)
        ? (value as unknown[]).map((v) => {
            if (typeof v === "string") return v;
            if (v && typeof v === "object") {
              const obj = v as Record<string, unknown>;
              return String(obj.text ?? obj.value ?? obj.keyword ?? obj.name ?? JSON.stringify(v));
            }
            return String(v);
          }).join("\n")
        : String(value ?? "");
      return (
        <div key={key}>
          <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
          <textarea
            value={listVal}
            onChange={(e) => {
              const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
              updateParam(key, lines.length > 0 ? lines : []);
            }}
            rows={3}
            placeholder={config?.placeholder}
            className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20 resize-none font-mono"
          />
          {config?.helperText && <p className="text-[10px] text-forest-f20 mt-0.5">{config.helperText}</p>}
        </div>
      );
    }

    if (fieldType === "url") {
      return (
        <div key={key}>
          <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
          <input
            type="url"
            value={String(value ?? "")}
            onChange={(e) => updateParam(key, e.target.value)}
            placeholder={config?.placeholder}
            className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20 font-mono"
          />
          {config?.helperText && <p className="text-[10px] text-forest-f20 mt-0.5">{config.helperText}</p>}
        </div>
      );
    }

    if (fieldType === "number") {
      return (
        <div key={key}>
          <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
          <input
            type="number"
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => updateParam(key, e.target.value === "" ? null : Number(e.target.value))}
            placeholder={config?.placeholder}
            className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20"
          />
        </div>
      );
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return (
        <div key={key}>
          <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try { updateParam(key, JSON.parse(e.target.value)); } catch { /* keep current */ }
            }}
            rows={4}
            className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 resize-none font-mono"
          />
        </div>
      );
    }

    return (
      <div key={key}>
        <label className="text-[10px] font-medium text-forest-f30 uppercase tracking-wide block mb-1">{label}</label>
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateParam(key, e.target.value)}
          placeholder={config?.placeholder}
          className="w-full px-2.5 py-2 text-[12px] border border-sandstorm-s40 rounded-md bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 placeholder:text-forest-f20"
        />
      </div>
    );
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <Pencil className="w-5 h-5 text-forest-f40" />
          <div>
            <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir">Edit Parameters</h2>
            <p className="text-[12px] text-forest-f20 mt-0.5">
              {ACTION_TYPE_LABELS[actionType] || actionType} — modify values before approving or executing
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-forest-f20 hover:bg-sandstorm-s5 hover:text-forest-f60 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {paramKeys.map(renderField)}

        {error && (
          <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-sandstorm-s40">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] font-semibold text-forest-f60 border border-sandstorm-s40 rounded-md hover:bg-sandstorm-s10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-forest-f40 hover:bg-forest-f50 rounded-md disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Parameters"}
        </button>
      </div>
    </BaseModal>
  );
};

const ScheduleEditorPopover: React.FC<{
  anchorEl: HTMLElement | null;
  schedule: ScheduleEditorState;
  onChange: (s: ScheduleEditorState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ anchorEl, schedule, onChange, onSave, onCancel, saving }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      const w = 280;
      const panelH = panelRef.current?.offsetHeight || 360;
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const openAbove = spaceBelow < panelH && spaceAbove > spaceBelow;
      const top = openAbove ? r.top - panelH - 6 : r.bottom + 6;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setLayout({ top: Math.max(8, top), left, width: w });
    };
    update();
    requestAnimationFrame(update);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorEl?.contains(t)) return;
      onCancel();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [anchorEl, onCancel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  if (!layout) return null;

  const parsedDate = new Date(schedule.date + "T00:00:00");
  const daysInMonth = new Date(parsedDate.getFullYear(), parsedDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: layout.top, left: layout.left, width: layout.width, zIndex: 9999 }}
      className="bg-white rounded-lg shadow-xl border border-sandstorm-s40 p-3 space-y-3"
      role="dialog"
      aria-label="Schedule editor"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-forest-f30" />
          <span className="text-[12px] font-semibold text-forest-f60">Execution Schedule</span>
        </div>
        <button type="button" onClick={onCancel} className="p-0.5 rounded text-forest-f30 hover:text-forest-f60 hover:bg-sandstorm-s10 transition-colors" aria-label="Close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Frequency */}
      <div className="grid grid-cols-4 gap-1">
        {FREQ_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...schedule, frequency: opt.value })}
            className={cn(
              "px-2 py-1.5 rounded-md text-[10px] font-semibold border transition-colors",
              schedule.frequency === opt.value
                ? "bg-forest-f40 text-white border-forest-f40"
                : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Time */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-forest-f30">Time ({DISPLAY_TZ_LABEL})</span>
        <select
          value={schedule.time}
          onChange={(e) => onChange({ ...schedule, time: e.target.value })}
          className="text-[11px] border border-sandstorm-s40 rounded-md px-2 py-1 bg-white text-forest-f60 focus:ring-1 focus:ring-forest-f40"
        >
          {SCHED_TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Weekly: day selector */}
      {schedule.frequency === "weekly" && (
        <div>
          <span className="text-[10px] text-forest-f30 block mb-1">Days</span>
          <div className="flex gap-1">
            {SCHED_WEEKDAY_SHORT.map((d, i) => {
              const sel = schedule.weekdays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    let nxt = sel ? schedule.weekdays.filter((x) => x !== i) : [...schedule.weekdays, i].sort((a, b) => a - b);
                    if (nxt.length === 0) nxt = [i];
                    onChange({ ...schedule, weekdays: nxt });
                  }}
                  className={cn(
                    "w-8 h-8 rounded-md text-[10px] font-semibold border transition-colors",
                    sel ? "bg-forest-f40 text-white border-forest-f40" : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly: day grid */}
      {schedule.frequency === "monthly" && (
        <div>
          <span className="text-[10px] text-forest-f30 block mb-1">Days of month</span>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const sel = schedule.monthDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    let nxt = sel ? schedule.monthDays.filter((d) => d !== day) : [...schedule.monthDays, day].sort((a, b) => a - b);
                    if (nxt.length === 0) nxt = [day];
                    onChange({ ...schedule, monthDays: nxt });
                  }}
                  className={cn(
                    "h-7 rounded text-[10px] font-medium border transition-colors",
                    sel ? "bg-forest-f40 text-white border-forest-f40" : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Once: date calendar */}
      {schedule.frequency === "once" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(parsedDate.getFullYear(), parsedDate.getMonth() - 1, Math.min(parsedDate.getDate(), new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 0).getDate()));
                if (prev >= today) onChange({ ...schedule, date: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}` });
              }}
              className="w-6 h-6 rounded border border-sandstorm-s40 text-[11px] font-semibold text-forest-f60 hover:bg-sandstorm-s10"
            >
              &lt;
            </button>
            <span className="text-[10px] font-medium text-forest-f60">
              {parsedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new Date(parsedDate.getFullYear(), parsedDate.getMonth() + 1, Math.min(parsedDate.getDate(), new Date(parsedDate.getFullYear(), parsedDate.getMonth() + 2, 0).getDate()));
                onChange({ ...schedule, date: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}` });
              }}
              className="w-6 h-6 rounded border border-sandstorm-s40 text-[11px] font-semibold text-forest-f60 hover:bg-sandstorm-s10"
            >
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const d = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), day);
              const isPast = d < today;
              const sel = day === parsedDate.getDate();
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => onChange({ ...schedule, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` })}
                  className={cn(
                    "h-7 rounded text-[10px] font-medium border transition-colors",
                    isPast ? "border-sandstorm-s30 text-sandstorm-s50 cursor-not-allowed"
                      : sel ? "bg-forest-f40 text-white border-forest-f40"
                      : "border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-sandstorm-s40">
        <span className="text-[10px] text-forest-f20" title="Time sent to server">
          {(() => {
            const ref = schedule.date || new Date().toISOString().slice(0, 10);
            const { utcTime, utcDate } = etToUtc(schedule.time, ref);
            return schedule.frequency === "once"
              ? `UTC: ${utcDate} ${utcTime}`
              : `UTC: ${utcTime}`;
          })()}
          {" · auto-execution"}
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onCancel} className="px-2 py-1 rounded text-[10px] font-medium border border-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s10 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-2 py-1 rounded text-[10px] font-medium bg-forest-f40 hover:bg-forest-f50 text-white disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const PopoverConfirm: React.FC<{
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "warning" | "danger";
}> = ({ message, onConfirm, onCancel, variant = "warning" }) => (
  <div
    className={cn(
      "absolute right-0 top-full mt-1.5 z-50 min-w-[180px] rounded-lg border shadow-lg p-2.5 text-[11px] animate-in fade-in slide-in-from-top-1 duration-150",
      variant === "danger"
        ? "border-red-200 bg-white text-red-800"
        : "border-amber-200 bg-white text-amber-800"
    )}
  >
    <p className="font-medium mb-2">{message}</p>
    <div className="flex items-center gap-1.5 justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={cn(
          "px-2.5 py-1 rounded-md text-[10px] font-semibold text-white transition-colors",
          variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        Confirm
      </button>
    </div>
    <div className={cn(
      "absolute -top-1.5 right-4 w-3 h-3 rotate-45 border-l border-t",
      variant === "danger" ? "bg-white border-red-200" : "bg-white border-amber-200"
    )} />
  </div>
);

function CreateActionsEmptyState({
  onCreateActions,
  onCreateActionsWithPrompt,
  createActionsDefaultPrompt = "",
}: {
  onCreateActions?: () => void;
  onCreateActionsWithPrompt?: (prompt: string) => void;
  createActionsDefaultPrompt?: string;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [prompt, setPrompt] = useState(createActionsDefaultPrompt);

  const hasPromptFlow = !!onCreateActionsWithPrompt;

  const handleClick = () => {
    if (hasPromptFlow) {
      setPrompt(createActionsDefaultPrompt);
      setPopoverOpen(true);
    } else if (onCreateActions) {
      onCreateActions();
    }
  };

  const handleConfirm = () => {
    setPopoverOpen(false);
    if (onCreateActionsWithPrompt) {
      onCreateActionsWithPrompt(prompt.trim() || createActionsDefaultPrompt);
    }
  };

  return (
    <div className="text-center py-12">
      <Zap className="w-10 h-10 mx-auto mb-3 text-forest-f20" />
      <p className="text-[14px] text-forest-f30 mb-1">No actions configured</p>
      <p className="text-[12px] text-forest-f20 mb-4">
        Use the AI assistant to analyze your portfolio and create optimization actions.
      </p>
      {(onCreateActions || onCreateActionsWithPrompt) && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-forest-f40 hover:bg-forest-f50 rounded-md transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Create Actions
          </button>

          {popoverOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPopoverOpen(false)} />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 w-80 rounded-lg border border-sandstorm-s40 bg-white shadow-lg p-4 space-y-3">
                <p className="text-[12px] font-semibold text-forest-f60">Analyze Portfolio</p>
                <p className="text-[11px] text-forest-f30 leading-relaxed">
                  Edit the prompt below to guide the analysis, or start with defaults.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-2.5 py-2 text-[12px] text-forest-f60 placeholder:text-forest-f30/50 focus:border-forest-f40 focus:outline-none focus:ring-1 focus:ring-forest-f40 resize-none"
                  placeholder="What should the agent focus on..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPopoverOpen(false)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-forest-f30 hover:text-forest-f60 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-forest-f40 hover:bg-forest-f50 transition-colors"
                  >
                    Start Analysis
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const ActionsListPanel: React.FC<ActionsListPanelProps> = ({
  actions: externalActions,
  accountId,
  portfolioId: _portfolioId,
  loading = false,
  refreshing = false,
  onRefresh,
  groupBy = "dashboard",
  showDashboardLink = true,
  onActionStatusChange,
  onCreateActions,
  onCreateActionsWithPrompt,
  createActionsDefaultPrompt = "",
  headerExtra,
}) => {
  const [localActions, setLocalActions] = useState<ActionItem[]>(externalActions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [statusUpdating, setStatusUpdating] = useState<Set<string>>(new Set());
  const [confirmingApprove, setConfirmingApprove] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState<string | null>(null);
  const [confirmingPause, setConfirmingPause] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingBulk, setConfirmingBulk] = useState<"approve" | "decline" | null>(null);

  React.useEffect(() => {
    setLocalActions(externalActions);
    const groupKeys = new Set(
      externalActions.map((a) =>
        groupBy === "dashboard" ? String(a.dashboard_id) : (a.component_id ?? "default")
      )
    );
    setExpandedGroups(groupKeys);
  }, [externalActions, groupBy]);

  const visibleActions = useMemo(
    () => localActions.filter((a) => a.status !== "deleted" && a.status !== "disabled"),
    [localActions]
  );

  const filtered = useMemo(() => {
    let result = visibleActions;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.action_slug.toLowerCase().includes(q) ||
          (a.dashboard_name ?? "").toLowerCase().includes(q) ||
          (ACTION_TYPE_LABELS[a.type] ?? a.type).toLowerCase().includes(q)
      );
    }
    return result;
  }, [visibleActions, statusFilter, searchQuery]);

  const grouped = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All Actions", actions: filtered }];
    }
    const map = new Map<string, { label: string; actions: ActionItem[] }>();
    for (const a of filtered) {
      const key =
        groupBy === "dashboard" ? String(a.dashboard_id) : (a.component_id ?? "default");
      const label =
        groupBy === "dashboard" ? (a.dashboard_name ?? `Dashboard ${a.dashboard_id}`) : `Widget ${a.component_id ?? "?"}`;
      if (!map.has(key)) {
        map.set(key, { label, actions: [] });
      }
      map.get(key)!.actions.push(a);
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [filtered, groupBy]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of visibleActions) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return counts;
  }, [visibleActions]);

  const pendingReviewActions = useMemo(
    () => visibleActions.filter((a) => a.status === "pending_review"),
    [visibleActions]
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const doStatusUpdate = useCallback(
    async (action: ActionItem, newStatus: "active" | "disabled" | "paused") => {
      if (!action.action_id) return;
      setStatusUpdating((prev) => new Set([...prev, action.id]));
      try {
        if (_portfolioId) {
          await updatePortfolioActionStatus(accountId, _portfolioId, [action.action_id], newStatus);
        } else {
          await updateActionStatus(accountId, action.dashboard_id, {
            action_ids: [action.action_id],
            status: newStatus,
          });
        }
        setLocalActions((prev) =>
          prev.map((a) => (a.id === action.id ? { ...a, status: newStatus } : a))
        );
        onActionStatusChange?.(action.id, newStatus);
      } catch (err) {
        console.error(`Failed to update action status to ${newStatus}:`, err);
      } finally {
        setStatusUpdating((prev) => {
          const n = new Set(prev);
          n.delete(action.id);
          return n;
        });
      }
    },
    [accountId, _portfolioId, onActionStatusChange]
  );

  const handleApprove = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "active");
      setConfirmingApprove(null);
    },
    [doStatusUpdate]
  );

  const handleDecline = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "disabled");
      setConfirmingDecline(null);
    },
    [doStatusUpdate]
  );

  const handlePause = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "paused");
      setConfirmingPause(null);
    },
    [doStatusUpdate]
  );

  const handleResume = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "active");
    },
    [doStatusUpdate]
  );

  const handleDelete = useCallback(
    (action: ActionItem) => {
      doStatusUpdate(action, "disabled");
      setConfirmingDelete(null);
    },
    [doStatusUpdate]
  );

  const handleApproveAll = useCallback(async () => {
    const pending = pendingReviewActions.filter((a) => a.action_id);
    if (pending.length === 0) return;
    setStatusUpdating((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
    try {
      if (_portfolioId) {
        await updatePortfolioActionStatus(
          accountId, _portfolioId, pending.map((a) => a.action_id), "active",
        );
      } else {
        const byDashboard = new Map<number, ActionItem[]>();
        for (const a of pending) {
          if (!byDashboard.has(a.dashboard_id)) byDashboard.set(a.dashboard_id, []);
          byDashboard.get(a.dashboard_id)!.push(a);
        }
        await Promise.all(
          Array.from(byDashboard.entries()).map(([dashId, actions]) =>
            updateActionStatus(accountId, dashId, {
              action_ids: actions.map((a) => a.action_id),
              status: "active",
            })
          )
        );
      }
      const ids = new Set(pending.map((a) => a.id));
      setLocalActions((prev) =>
        prev.map((a) => (ids.has(a.id) ? { ...a, status: "active" } : a))
      );
    } catch (err) {
      console.error("Failed to approve all actions:", err);
    } finally {
      setStatusUpdating(new Set());
    }
  }, [pendingReviewActions, accountId, _portfolioId]);

  const handleDeclineAll = useCallback(async () => {
    const pending = pendingReviewActions.filter((a) => a.action_id);
    if (pending.length === 0) return;
    setStatusUpdating((prev) => new Set([...prev, ...pending.map((a) => a.id)]));
    try {
      if (_portfolioId) {
        await updatePortfolioActionStatus(
          accountId, _portfolioId, pending.map((a) => a.action_id), "disabled",
        );
      } else {
        const byDashboard = new Map<number, ActionItem[]>();
        for (const a of pending) {
          if (!byDashboard.has(a.dashboard_id)) byDashboard.set(a.dashboard_id, []);
          byDashboard.get(a.dashboard_id)!.push(a);
        }
        await Promise.all(
          Array.from(byDashboard.entries()).map(([dashId, actions]) =>
            updateActionStatus(accountId, dashId, {
              action_ids: actions.map((a) => a.action_id),
              status: "disabled",
            })
          )
        );
      }
      const ids = new Set(pending.map((a) => a.id));
      setLocalActions((prev) =>
        prev.map((a) => (ids.has(a.id) ? { ...a, status: "disabled" } : a))
      );
    } catch (err) {
      console.error("Failed to decline all actions:", err);
    } finally {
      setStatusUpdating(new Set());
    }
  }, [pendingReviewActions, accountId, _portfolioId]);

  return (
    <div className="space-y-4">
      {/* Pending review banner */}
      {pendingReviewActions.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="text-xs font-medium">
              {pendingReviewActions.length} action{pendingReviewActions.length !== 1 ? "s" : ""} pending review
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setConfirmingBulk((p) => (p === "approve" ? null : "approve"))}
                disabled={statusUpdating.size > 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShieldCheck className="w-3 h-3" />
                Approve All
              </button>
              {confirmingBulk === "approve" && (
                <PopoverConfirm
                  message={`Approve all ${pendingReviewActions.length} actions?`}
                  onConfirm={() => { setConfirmingBulk(null); handleApproveAll(); }}
                  onCancel={() => setConfirmingBulk(null)}
                  variant="warning"
                />
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setConfirmingBulk((p) => (p === "decline" ? null : "decline"))}
                disabled={statusUpdating.size > 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShieldX className="w-3 h-3" />
                Decline All
              </button>
              {confirmingBulk === "decline" && (
                <PopoverConfirm
                  message={`Decline all ${pendingReviewActions.length} actions?`}
                  onConfirm={() => { setConfirmingBulk(null); handleDeclineAll(); }}
                  onCancel={() => setConfirmingBulk(null)}
                  variant="danger"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : (key as StatusFilter))}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                  statusFilter === key
                    ? `${cfg.bg} ${cfg.text} border-current`
                    : "bg-white text-forest-f30 border-sandstorm-s40 hover:bg-sandstorm-s5"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label} ({count})
              </button>
            );
          })}
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="text-[11px] text-forest-f20 hover:text-forest-f40 underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest-f20" />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[12px] border border-sandstorm-s40 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-forest-f40 w-48"
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-forest-f40 border border-sandstorm-s40 hover:bg-sandstorm-s5 transition-colors disabled:opacity-50"
              aria-label="Refresh actions"
            >
              <RefreshCw className={cn("w-3 h-3", (refreshing || loading) && "animate-spin")} />
              Refresh
            </button>
          )}
          {headerExtra}
        </div>
      </div>

      {/* Loading */}
      {(loading || refreshing) && (
        <div className="flex items-center justify-center py-12">
          <Loader size="md" message={loading ? "Loading actions..." : "Refreshing..."} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !refreshing && visibleActions.length === 0 && (
        <CreateActionsEmptyState
          onCreateActions={onCreateActions}
          onCreateActionsWithPrompt={onCreateActionsWithPrompt}
          createActionsDefaultPrompt={createActionsDefaultPrompt}
        />
      )}

      {/* No filter results */}
      {!loading && !refreshing && visibleActions.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8">
          <Filter className="w-8 h-8 mx-auto mb-2 text-forest-f20" />
          <p className="text-[13px] text-forest-f30">No actions match the current filter.</p>
        </div>
      )}

      {/* Grouped actions */}
      {!loading &&
        grouped.map((group) => (
          <div
            key={group.key}
            className="border border-sandstorm-s40 rounded-lg overflow-hidden"
          >
            {/* Group header */}
            {groupBy !== "none" && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-sandstorm-s5 hover:bg-sandstorm-s10 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-forest-f60">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-forest-f20">
                    ({group.actions.length} action{group.actions.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showDashboardLink && groupBy === "dashboard" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const dashId = group.actions[0]?.dashboard_id;
                        if (dashId) window.open(`/brands/${accountId}/dashboards/${dashId}`, "_blank");
                      }}
                      className="p-1 rounded hover:bg-sandstorm-s40 transition-colors"
                      aria-label="Open dashboard"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-forest-f20" />
                    </button>
                  )}
                  {expandedGroups.has(group.key) ? (
                    <ChevronUp className="w-4 h-4 text-forest-f20" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-forest-f20" />
                  )}
                </div>
              </button>
            )}

            {/* Action cards */}
            {(groupBy === "none" || expandedGroups.has(group.key)) && (
              <div className="space-y-5 py-2">
                {group.actions.map((action, idx) => (
                  <ActionCard
                    key={`${action.dashboard_id}-${action.action_slug}`}
                    action={action}
                    index={idx + 1}
                    accountId={accountId}
                    portfolioId={_portfolioId}
                    onRefresh={onRefresh}
                    isUpdating={statusUpdating.has(action.id)}
                    confirmingApprove={confirmingApprove === action.id}
                    confirmingDecline={confirmingDecline === action.id}
                    confirmingPause={confirmingPause === action.id}
                    confirmingDelete={confirmingDelete === action.id}
                    onApproveClick={() => setConfirmingApprove(action.id)}
                    onApproveConfirm={() => handleApprove(action)}
                    onApproveCancel={() => setConfirmingApprove(null)}
                    onDeclineClick={() => setConfirmingDecline(action.id)}
                    onDeclineConfirm={() => handleDecline(action)}
                    onDeclineCancel={() => setConfirmingDecline(null)}
                    onPauseClick={() => setConfirmingPause(action.id)}
                    onPauseConfirm={() => handlePause(action)}
                    onPauseCancel={() => setConfirmingPause(null)}
                    onResumeClick={() => handleResume(action)}
                    onDeleteClick={() => setConfirmingDelete(action.id)}
                    onDeleteConfirm={() => handleDelete(action)}
                    onDeleteCancel={() => setConfirmingDelete(null)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

interface ActionCardProps {
  action: ActionItem;
  index: number;
  accountId: number;
  portfolioId?: number;
  onRefresh?: () => void;
  isUpdating: boolean;
  confirmingApprove: boolean;
  confirmingDecline: boolean;
  confirmingPause: boolean;
  confirmingDelete: boolean;
  onApproveClick: () => void;
  onApproveConfirm: () => void;
  onApproveCancel: () => void;
  onDeclineClick: () => void;
  onDeclineConfirm: () => void;
  onDeclineCancel: () => void;
  onPauseClick: () => void;
  onPauseConfirm: () => void;
  onPauseCancel: () => void;
  onResumeClick: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  action,
  index,
  accountId,
  portfolioId,
  onRefresh,
  isUpdating,
  confirmingApprove,
  confirmingDecline,
  confirmingPause,
  confirmingDelete,
  onApproveClick,
  onApproveConfirm,
  onApproveCancel,
  onDeclineClick,
  onDeclineConfirm,
  onDeclineCancel,
  onPauseClick,
  onPauseConfirm,
  onPauseCancel,
  onResumeClick,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  const [showTrail, setShowTrail] = useState(false);
  const [trail, setTrail] = useState<ActionStatusLogEntry[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [paramsModalOpen, setParamsModalOpen] = useState(false);
  const [localParams, setLocalParams] = useState<Record<string, unknown> | undefined>(action.params);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleState, setScheduleState] = useState<ScheduleEditorState>(() => scheduleToEditorState(action.schedule));
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [localSchedule, setLocalSchedule] = useState<ActionItem["schedule"] | undefined>(action.schedule);
  const scheduleAnchorRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLocalSchedule(action.schedule);
  }, [action.schedule]);

  React.useEffect(() => {
    setLocalParams(action.params);
  }, [action.params]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<ActionPreviewProposal | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const handlePreview = useCallback(async () => {
    if (!portfolioId) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewProposal(null);
    setExecuted(false);
    try {
      const proposal = await previewPortfolioAction(accountId, portfolioId, action.action_id);
      setPreviewProposal(proposal);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }, [accountId, portfolioId, action.action_id]);

  const [executeResult, setExecuteResult] = useState<{ status: string; message: string; proposal?: ActionPreviewProposal } | null>(null);

  const handleExecute = useCallback(async () => {
    if (!portfolioId) return;
    setExecuting(true);
    setPreviewError(null);
    try {
      const result = await executePortfolioAction(accountId, portfolioId, action.action_id);
      setExecuteResult(result);
      if (result.proposal) setPreviewProposal(result.proposal);
      setExecuted(true);
      onRefresh?.();
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  }, [accountId, portfolioId, action.action_id, onRefresh]);

  const saveSchedule = useCallback(async () => {
    if (!portfolioId) return;
    setScheduleSaving(true);
    try {
      const payload = editorStateToPayload(scheduleState);
      const resp = await updatePortfolioAction(accountId, portfolioId, action.action_id, payload);

      if (resp.action?.schedule) {
        setLocalSchedule(resp.action.schedule);
      } else {
        const fallback: ActionItem["schedule"] = {
          frequency: scheduleState.frequency,
          time: (payload.schedule_time as string) || scheduleState.time,
          timezone: "UTC",
          auto_execute: true,
        };
        if (scheduleState.frequency === "weekly") fallback.weekdays = scheduleState.weekdays;
        if (scheduleState.frequency === "monthly") fallback.monthDays = scheduleState.monthDays;
        if (scheduleState.frequency === "once") {
          fallback.date = (payload.schedule_date as string) || scheduleState.date;
          fallback.next_run_at = payload.schedule_next_run_at as string;
        }
        setLocalSchedule(fallback);
      }
      setEditingSchedule(false);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to save schedule:", err);
    } finally {
      setScheduleSaving(false);
    }
  }, [accountId, portfolioId, action.action_id, scheduleState, onRefresh]);

  const typeLabel = ACTION_TYPE_LABELS[action.type] ?? action.type;
  const typeColors = ACTION_TYPE_COLORS[action.type] ?? { bg: "bg-gray-50", text: "text-gray-700" };
  const statusCfg = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.active;
  const scheduleText = formatScheduleLabel(localSchedule);
  const isPaused = action.status === "paused";
  const isPendingReview = action.status === "pending_review";
  const accentColor = TYPE_ACCENT_COLORS[action.type] || "border-l-forest-f40";
  const formattedGuardrails = useMemo(() => getFormattedGuardrails(action.guardrails), [action.guardrails]);

  const hasReasoning = !!action.reasoning;
  const patterns = toStringList(action.learning?.patterns);
  const adjustments = toStringList(action.learning?.strategy_adjustments);
  const hasLearning = patterns.length > 0 || adjustments.length > 0;

  const loadTrail = useCallback(async () => {
    if (!portfolioId || trail.length > 0) return;
    setTrailLoading(true);
    try {
      const data = await getPortfolioActionTrail(accountId, portfolioId, action.action_id);
      setTrail(data);
    } catch {
      setTrail([]);
    } finally {
      setTrailLoading(false);
    }
  }, [accountId, portfolioId, action.action_id, trail.length]);

  return (
    <div
      className={cn(
        "px-4 py-4 space-y-3 rounded-lg border border-sandstorm-s40 hover:shadow-sm transition-all border-l-[3px]",
        accentColor,
        isPaused && "opacity-50",
      )}
    >
      {/* Top row: number + badges + status + buttons */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-forest-f40 text-white text-[10px] font-bold shrink-0">
            {index}
          </span>
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", typeColors.bg, typeColors.text)}>
            {typeLabel}
          </span>
          <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
            {action.entity_type}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-gray-50 text-[10px] text-gray-500">
            {action.platform}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium", statusCfg.bg, statusCfg.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-forest-f20 bg-sandstorm-s5 border border-sandstorm-s40">
            {action.action_slug}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {action.has_query && portfolioId && (
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-forest-f40/10 text-forest-f40 hover:bg-forest-f40/20 border border-forest-f40/20 transition-colors"
              aria-label="Preview changes"
              title="Preview what this action will do"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          )}
          {isPendingReview ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={onApproveClick}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Approve action"
                  title="Approve — makes action active"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Approve
                </button>
                {confirmingApprove && (
                  <PopoverConfirm message="Approve this action?" onConfirm={onApproveConfirm} onCancel={onApproveCancel} variant="warning" />
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={onDeclineClick}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decline action"
                  title="Decline — disables action"
                >
                  <ShieldX className="w-3 h-3" />
                  Decline
                </button>
                {confirmingDecline && (
                  <PopoverConfirm message="Decline this action?" onConfirm={onDeclineConfirm} onCancel={onDeclineCancel} variant="danger" />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={isPaused ? onResumeClick : onPauseClick}
                  disabled={isUpdating}
                  className="p-1 rounded hover:bg-sandstorm-s20 transition-colors disabled:opacity-50"
                  aria-label={isPaused ? "Resume action" : "Pause action"}
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? (
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
                {confirmingPause && (
                  <PopoverConfirm message="Pause this action?" onConfirm={onPauseConfirm} onCancel={onPauseCancel} variant="warning" />
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={onDeleteClick}
                  disabled={isUpdating}
                  className="p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                  aria-label="Delete action"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
                {confirmingDelete && (
                  <PopoverConfirm message="Delete this action?" onConfirm={onDeleteConfirm} onCancel={onDeleteCancel} variant="danger" />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] text-forest-f60 leading-relaxed">
        {action.description || "No description"}
      </p>

      {/* Reasoning + Learning — side by side on lg screens */}
      {(hasReasoning || hasLearning) && (
        <div className={cn("grid gap-3", hasReasoning && hasLearning ? "lg:grid-cols-2" : "grid-cols-1")}>
          {hasReasoning && (
            <div className="rounded-lg border border-sandstorm-s40 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-forest-f40/10 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-forest-f40" />
                </div>
                <span className="text-[12px] font-semibold text-forest-f60">Reasoning</span>
              </div>
              <div className="grid gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-forest-f50 block mb-0.5">Detected</span>
                  <p className="text-[12px] text-forest-f60 m-0 leading-relaxed">{action.reasoning!.detected}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-forest-f50 block mb-0.5">Why it matters</span>
                  <p className="text-[12px] text-forest-f60 m-0 leading-relaxed">{action.reasoning!.why_it_matters}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-forest-f50 block mb-0.5">Conclusion</span>
                  <p className="text-[12px] text-forest-f60 m-0 leading-relaxed">{action.reasoning!.conclusion}</p>
                </div>
              </div>
            </div>
          )}

          {hasLearning && (
            <div className="rounded-lg border border-sandstorm-s40 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-[12px] font-semibold text-forest-f60">Learning</span>
              </div>
              {patterns.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-forest-f50 block mb-1">Patterns discovered</span>
                  <ul className="m-0 pl-4 list-disc space-y-1">
                    {patterns.map((p, i) => (
                      <li key={i} className="text-[12px] text-forest-f60 leading-relaxed">{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {adjustments.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-forest-f50 block mb-1">Strategy adjustments</span>
                  <ul className="m-0 pl-4 list-disc space-y-1">
                    {adjustments.map((s, i) => (
                      <li key={i} className="text-[12px] text-forest-f60 leading-relaxed">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Condition */}
      {hasRealCondition(action.condition) ? (
        <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s0/60 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Tooltip
              heading="Trigger Condition"
              description="When these conditions are met, the action is eligible for execution"
              position="topMiddle"
              portal
            >
              <div className="flex items-center gap-2 cursor-help">
                <Shield className="w-4 h-4 text-forest-f40" />
                <span className="text-[12px] font-semibold text-forest-f60">Trigger</span>
              </div>
            </Tooltip>
            {/* {portfolioId && (
              <button
                type="button"
                onClick={() => setTriggerModalOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-sandstorm-s40 text-[11px] font-medium text-forest-f40 hover:bg-sandstorm-s10 hover:text-forest-f60 transition-colors shrink-0"
                title="Edit trigger conditions"
                aria-label="Edit trigger conditions"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )} */}
          </div>
          <ConditionDisplay condition={action.condition} />
        </div>
      ) : null}
      {/* : portfolioId ? (
        <button
          type="button"
          onClick={() => setTriggerModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-forest-f40 hover:text-forest-f50 transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          Add trigger condition
        </button>
      ) : null */}
      {triggerModalOpen && portfolioId && (
        <TriggerEditModal
          isOpen={triggerModalOpen}
          onClose={() => setTriggerModalOpen(false)}
          condition={action.condition}
          platform={action.platform}
          querySql={undefined}
          accountId={accountId}
          portfolioId={portfolioId}
          actionId={action.action_id}
          onSaved={() => onRefresh?.()}
        />
      )}

      {/* Params */}
      {localParams && Object.keys(localParams).length > 0 && (
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-forest-f20 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-[11px] text-forest-f30 flex items-center gap-1.5 flex-wrap">
              <span className="text-forest-f20 font-medium">Applies:</span>
              {formatSmartParams(action.type, localParams, action.platform).map((chip) => (
                <span
                  key={chip.key}
                  className="px-1.5 py-0.5 rounded bg-forest-f0/50 border border-forest-f40/15 text-[10px] text-forest-f50 font-medium"
                >
                  {chip.label}
                </span>
              ))}
              {portfolioId && (
                <button
                  type="button"
                  onClick={() => setParamsModalOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-forest-f30 hover:text-forest-f40 transition-colors"
                  title="Edit action parameters"
                  aria-label="Edit action parameters"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  Edit
                </button>
              )}
            </div>
            {action.entity_type && (
              <p className="text-[10px] text-forest-f20 leading-relaxed">
                {getActionTargetDescription(action.type, action.entity_type)}
              </p>
            )}
          </div>
        </div>
      )}
      {paramsModalOpen && portfolioId && localParams && (
        <ParamsEditModal
          isOpen={paramsModalOpen}
          onClose={() => setParamsModalOpen(false)}
          actionType={action.type}
          params={localParams}
          accountId={accountId}
          portfolioId={portfolioId}
          actionId={action.action_id}
          onSaved={() => {
            onRefresh?.();
          }}
        />
      )}

      {/* Schedule */}
      <div ref={scheduleAnchorRef} className="flex items-center gap-2">
        <Clock className={cn("w-3.5 h-3.5 shrink-0", localSchedule ? "text-forest-f20" : "text-amber-400")} />
        <span className="text-[11px] text-forest-f30">{scheduleText}</span>
        {localSchedule?.next_run_at && (
          <span className="text-[10px] text-forest-f20">
            · Next: {fmtNextRun(localSchedule.next_run_at)}
          </span>
        )}
        {portfolioId && (
          <button
            type="button"
            onClick={() => {
              if (editingSchedule) {
                setEditingSchedule(false);
              } else {
                setScheduleState(scheduleToEditorState(localSchedule));
                setEditingSchedule(true);
              }
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-sandstorm-s40 text-[10px] font-medium text-forest-f40 hover:bg-sandstorm-s10 hover:text-forest-f60 transition-colors"
            title="Edit execution schedule"
            aria-label="Edit execution schedule"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>
      {editingSchedule && (
        <ScheduleEditorPopover
          anchorEl={scheduleAnchorRef.current}
          schedule={scheduleState}
          onChange={setScheduleState}
          onSave={saveSchedule}
          onCancel={() => setEditingSchedule(false)}
          saving={scheduleSaving}
        />
      )}

      {/* Guardrails with Tooltips */}
      {formattedGuardrails.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-forest-f30 mr-0.5">
            Guardrails:
          </span>
          {formattedGuardrails.map((item) => (
            <Tooltip
              key={item.key}
              heading={item.label}
              description={item.description}
              position="topMiddle"
              portal
            >
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-sandstorm-s40 bg-white text-forest-f60 shadow-[0_1px_2px_rgba(7,41,41,0.06)] hover:border-forest-f40/30 cursor-help transition-colors">
                <span className="text-[10px] font-medium text-forest-f30">{item.label}:</span>
                <span className="text-[10px] font-bold tabular-nums">{item.value}</span>
              </span>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Inline Action Trail toggle */}
      {portfolioId && (
        <button
          type="button"
          onClick={() => {
            setShowTrail(!showTrail);
            if (!showTrail) loadTrail();
          }}
          className="flex items-center gap-1.5 text-[11px] font-medium text-forest-f40 hover:text-forest-f50 transition-colors"
        >
          {showTrail ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <History className="w-3.5 h-3.5" />
          Action Trail
        </button>
      )}

      {showTrail && (
        <div className="rounded-lg border border-sandstorm-s40 bg-white p-3">
          {trailLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-forest-f30">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              Loading trail...
            </div>
          ) : trail.length === 0 ? (
            <p className="text-[11px] text-forest-f30 m-0">No trail events yet.</p>
          ) : (
            <div className="space-y-2">
              {trail.map((entry) => (
                <div key={entry.id} className="flex gap-2 items-start">
                  <div className="flex flex-col items-center mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-forest-f40/60 shrink-0" />
                    <span className="w-px flex-1 bg-sandstorm-s40 min-h-[16px]" />
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-px rounded border",
                        EVENT_TYPE_COLORS[entry.event_type] || EVENT_TYPE_COLORS.status_changed,
                      )}>
                        {EVENT_TYPE_LABELS[entry.event_type] || entry.event_type}
                      </span>
                      {entry.old_status && entry.new_status && (
                        <span className="text-[10px] text-forest-f30">
                          {entry.old_status} → {entry.new_status}
                        </span>
                      )}
                    </div>
                    {entry.note && (
                      <p className="text-[10px] text-forest-f30 m-0 mt-0.5 leading-relaxed">{entry.note}</p>
                    )}
                    <span className="text-[9px] text-forest-f20 mt-0.5 block">
                      {new Date(entry.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {entry.changed_by ? ` · User #${entry.changed_by}` : " · Agent"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmations are rendered as popovers next to their buttons */}

      {/* Preview modal */}
      <ActionPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        action={action}
        localParams={localParams}
        proposal={previewProposal}
        loading={previewLoading}
        error={previewError}
        onExecute={handleExecute}
        executing={executing}
        executed={executed}
        executeResult={executeResult}
      />
    </div>
  );
};

function conditionFieldLabel(c: Record<string, unknown>): string {
  if (c.label && typeof c.label === "string") return c.label;
  return formatMetricLabel(String(c.field));
}

// ── Action Preview Modal ─────────────────────────────────────────────────────

const ActionPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  action: ActionItem;
  localParams: Record<string, unknown> | undefined;
  proposal: ActionPreviewProposal | null;
  loading: boolean;
  error: string | null;
  onExecute: () => void;
  executing: boolean;
  executed: boolean;
  executeResult?: { status: string; message: string; proposal?: ActionPreviewProposal } | null;
}> = ({ isOpen, onClose, action, localParams, proposal, loading, error, onExecute, executing, executed, executeResult }) => {
  const smartChips = localParams ? formatSmartParams(action.type, localParams, action.platform) : [];
  const typeLabel = ACTION_TYPE_LABELS[action.type] || action.type.replace(/_/g, " ");
  const typeColor = ACTION_TYPE_COLORS[action.type];
  const entityLabel = ENTITY_TYPE_LABELS[action.entity_type] || action.entity_type;
  const hasConditions = action.condition && hasRealCondition(action.condition);
  const guardrails = action.guardrails;
  const hasGuardrails = guardrails && Object.keys(guardrails).length > 0;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="4xl" padding="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
        <div className="flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-forest-f40" />
          <div>
            <h2 className="text-[16px] font-semibold text-forest-f60 font-agrandir m-0">Action Preview</h2>
            <p className="text-[11px] text-forest-f30 m-0 mt-0.5">{action.description}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-forest-f20 hover:bg-sandstorm-s5 hover:text-forest-f60 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader size="md" message="Running query and evaluating conditions…" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-[13px] text-red-700 m-0">{error}</p>
          </div>
        )}

        {!loading && !error && proposal && (
          <div className="space-y-5">

            {/* Action summary bar */}
            <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s0/50 px-4 py-3 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn(
                  "inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                  typeColor?.bg || "bg-gray-50", typeColor?.text || "text-gray-700",
                )}>
                  {typeLabel}
                </span>
                <span className="text-[10px] text-forest-f20">•</span>
                <span className="text-[11px] text-forest-f40 font-medium">{entityLabel} level</span>
                <span className="text-[10px] text-forest-f20">•</span>
                <span className="text-[11px] text-forest-f30">{action.platform}</span>
              </div>

              {/* What will change */}
              {smartChips.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-forest-f20 font-medium uppercase tracking-wider">Changes:</span>
                  {smartChips.map((chip) => (
                    <span key={chip.key} className="px-1.5 py-0.5 rounded bg-forest-f0/50 border border-forest-f40/15 text-[10px] text-forest-f50 font-medium">
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Guardrails */}
              {hasGuardrails && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-forest-f20 font-medium uppercase tracking-wider">Guardrails:</span>
                  {Object.entries(guardrails!).map(([k, v]) => (
                    <span key={k} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/60 text-[10px] text-amber-700 font-medium">
                      {formatMetricLabel(k)}: {String(v)}
                    </span>
                  ))}
                </div>
              )}

              {/* Trigger conditions */}
              {hasConditions && (() => {
                const cond = action.condition!;
                const conditionItems = (cond.conditions || cond.rules || (cond.field ? [cond] : [])) as Record<string, unknown>[];
                if (conditionItems.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-forest-f20 font-medium uppercase tracking-wider">Trigger:</span>
                    {conditionItems.map((c, i) => {
                      const field = conditionFieldLabel(c);
                      const op = OPERATOR_SYMBOLS[String(c.operator || c.op || "")] || String(c.operator || c.op || "");
                      const val = c.value ?? c.threshold ?? "";
                      return (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/60 text-[10px] text-blue-700 font-medium">
                          {field} {op} {String(val)}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Execution success banner */}
            {executed && executeResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[13px] font-semibold text-emerald-800 m-0">Execution complete</p>
                  <p className="text-[11px] text-emerald-700 m-0">{executeResult.message}</p>
                </div>
              </div>
            )}

            {/* Executing spinner */}
            {executing && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                <p className="text-[12px] text-blue-700 m-0">Executing action on {proposal.matched_rows} matched entities…</p>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-sandstorm-s40 bg-white p-3 text-center">
                <p className="text-[22px] font-bold text-forest-f60 m-0">{proposal.total_rows}</p>
                <p className="text-[11px] text-forest-f20 m-0 mt-0.5">Total from query</p>
              </div>
              <div className="rounded-lg border border-sandstorm-s40 bg-white p-3 text-center">
                <p className={cn("text-[22px] font-bold m-0", proposal.matched_rows > 0 ? "text-amber-600" : "text-forest-f30")}>{proposal.matched_rows}</p>
                <p className="text-[11px] text-forest-f20 m-0 mt-0.5">Matched conditions</p>
              </div>
              <div className={cn("rounded-lg border p-3 text-center", executed ? "border-emerald-200 bg-emerald-50" : "border-sandstorm-s40 bg-white")}>
                <p className={cn("text-[22px] font-bold m-0", executed ? "text-emerald-600" : proposal.matched_rows > 0 ? "text-forest-f40" : "text-forest-f30")}>{proposal.matched_rows}</p>
                <p className="text-[11px] text-forest-f20 m-0 mt-0.5">{executed ? "Updated" : "Will be updated"}</p>
              </div>
            </div>

            {/* Entities table */}
            {proposal.entities.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-[12px] font-semibold text-forest-f60 m-0">
                  {executed ? "Updated entities" : "Matched entities"} ({proposal.entities.length})
                </h3>
                <div className="rounded-lg border border-sandstorm-s40 overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-sandstorm-s0 border-b border-sandstorm-s40">
                        <th className="text-left px-3 py-2 font-semibold text-forest-f50">Entity</th>
                        {proposal.entities[0]?.before && (
                          <th className="text-left px-3 py-2 font-semibold text-forest-f50">{executed ? "Was" : "Current"}</th>
                        )}
                        {proposal.entities[0]?.after && (
                          <th className="text-left px-3 py-2 font-semibold text-forest-f50">{executed ? "Changed to" : "After change"}</th>
                        )}
                        {executed && (
                          <th className="text-left px-3 py-2 font-semibold text-forest-f50 w-16">Status</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.entities.slice(0, 50).map((entity: ActionPreviewEntity, i: number) => (
                        <tr key={entity.id || i} className="border-b border-sandstorm-s40 last:border-b-0 hover:bg-sandstorm-s0/40">
                          <td className="px-3 py-2">
                            <div className="font-medium text-forest-f60">{entity.name || entity.id}</div>
                            {entity.name && entity.id && (
                              <div className="text-[10px] text-forest-f20">ID: {entity.id}</div>
                            )}
                          </td>
                          {entity.before && (
                            <td className="px-3 py-2 text-forest-f30">
                              {Object.entries(entity.before).map(([k, v]) => (
                                <div key={k} className="text-[11px]">{formatMetricLabel(k)}: <span className={cn("font-medium", executed ? "text-forest-f30 line-through" : "text-forest-f60")}>{String(v)}</span></div>
                              ))}
                            </td>
                          )}
                          {entity.after && (
                            <td className="px-3 py-2">
                              {Object.entries(entity.after).map(([k, v]) => (
                                <div key={k} className="text-[11px]">{formatMetricLabel(k)}: <span className={cn("font-semibold", executed ? "text-emerald-600" : "text-forest-f40")}>{String(v)}</span></div>
                              ))}
                            </td>
                          )}
                          {executed && (
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" /> Done
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {proposal.entities.length > 50 && (
                    <div className="px-3 py-2 text-[11px] text-forest-f30 bg-sandstorm-s0 border-t border-sandstorm-s40">
                      Showing 50 of {proposal.entities.length} entities
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-sandstorm-s40 bg-sandstorm-s0/50">
                <CheckCircle2 className="w-4 h-4 text-forest-f30" />
                <p className="text-[12px] text-forest-f30 m-0">No entities matched the trigger conditions. The action would not execute.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "flex items-center justify-between px-6 py-3.5 border-t",
        executed ? "border-emerald-200 bg-emerald-50/50" : "border-sandstorm-s40",
      )}>
        <p className="text-[11px] text-forest-f30 m-0">
          {executed
            ? `Successfully updated ${proposal?.matched_rows || 0} ${entityLabel.toLowerCase()}`
            : executing
              ? "Executing action — please wait…"
              : "Review the preview above before running"}
        </p>
        <div className="flex items-center gap-2">
          {executed ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-forest-f40 rounded-md hover:bg-forest-f50 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={executing}
                className="px-3 py-1.5 text-[11px] font-semibold text-forest-f60 border border-sandstorm-s40 rounded-md hover:bg-sandstorm-s10 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              {proposal && proposal.matched_rows > 0 && (
                <button
                  type="button"
                  onClick={onExecute}
                  disabled={executing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-forest-f40 rounded-md hover:bg-forest-f50 disabled:opacity-50 transition-colors"
                >
                  {executing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing…
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      Run Now
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

const ConditionPill: React.FC<{ c: Record<string, unknown> }> = ({ c }) => {
  const op = OPERATOR_SYMBOLS[String(c.operator)] ?? String(c.operator);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-sandstorm-s40 text-[12px]">
      <span className="font-semibold text-forest-f60">{conditionFieldLabel(c)}</span>
      <span className="text-forest-f30">{op}</span>
      <span className="font-semibold text-forest-f50">{String(c.value)}</span>
    </span>
  );
};

const ConditionDisplay: React.FC<{ condition?: Record<string, unknown> }> = ({ condition }) => {
  if (!condition) return null;

  if ("logic" in condition && Array.isArray(condition.conditions)) {
    const subs = condition.conditions as Array<Record<string, unknown>>;
    const logic = String(condition.logic).toUpperCase();
    return (
      <div className="flex flex-wrap items-center gap-2">
        {subs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="px-2 py-0.5 rounded bg-forest-f40/10 text-[11px] font-bold text-forest-f40">
                {logic}
              </span>
            )}
            <ConditionPill c={c} />
          </React.Fragment>
        ))}
      </div>
    );
  }

  if ("field" in condition) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ConditionPill c={condition} />
      </div>
    );
  }

  return null;
};
