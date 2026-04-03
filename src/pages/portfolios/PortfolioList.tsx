import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  ActionCondition,
  ActionRule,
  ActionType,
  CompoundActionCondition,
  DashboardComponent,
} from "../workflows/types/dashboard";
import { formatMetricLabel } from "../workflows/utils/formatDashboardValue";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  MoreVertical,
  Trash2,
  Eye,
  Pencil,
  LayoutDashboard,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Shield,
  ExternalLink,
  Sparkles,
  Bot,
} from "lucide-react";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAssistant } from "../../contexts/AssistantContext";
import { usePortfolios, usePortfolioSummary, usePortfolioLiveMetrics } from "../../hooks/queries/usePortfolios";
import { useDeletePortfolio } from "../../hooks/mutations/usePortfolioMutations";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";

import { Assistant } from "../../components/layout/Assistant";
import {
  Banner,
  Button,
  KPICard,
  Loader,
  Tooltip,
  ConfirmationModal,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../hooks/queries/queryKeys";
import {
  getDashboardsByPortfolio,
  getDashboardDetail,
  type DashboardResponse,
} from "../../services/dashboard";
import { portfoliosService, type PortfolioListItem } from "../../services/portfolios";

const PAGE_SIZE = 25;

/** Fixed widths so sticky second column aligns with the first */
const COL = {
  portfolio: "w-56 min-w-[14rem] max-w-[14rem]",
  brand: "w-28 min-w-[7rem] max-w-[7rem]",
  brandSticky: "left-56",
  tags: "min-w-[5.5rem] max-w-[6.5rem]",
  adAccount: "min-w-[13rem] w-52 max-w-[15rem]",
} as const;

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  amazon: "Amazon",
};

/**
 * Column / group hover text — mirrors backend `portfolio_executor.run` (ETL per platform,
 * optional Google live API fallback, then rollup + snapshot to `assistant.portfolio_tracking`).
 */
const PORTFOLIO_TRACKING_TIPS = {
  budgetGroup:
    "Spend columns use the portfolio period (start/end in settings) through the snapshot date.",
  performanceGroup:
    "From the latest tracking snapshot: each run loads linked campaigns, pulls metrics from your data warehouse (Google may call the Ads API if ETL has no rows), rolls up totals, and saves one row.",
  totalBudget: "Total portfolio budget for the configured period — planning figure, not necessarily live platform caps.",
  targetFtd:
    "Target spend for ‘period to date’ if budget were spent evenly (linear pacing from period start through today).",
  actualFtd:
    "Actual sum of campaign spend from period start through the snapshot (rolled up from linked campaigns).",
  pacing: "Actual FTD spend ÷ target FTD spend × 100. Near 100% means close to an even daily burn.",
  ftdConv: "Conversions summed across linked campaigns for the portfolio period to date.",
  ftdRev: "Conversion value / revenue summed for the portfolio period to date.",
  targetKpi: "Goal you set (CPA, ROAS, CPC, or CPM).",
  ftdKpi:
    "Portfolio KPI for period-to-date: same type as your target, computed from rolled-up spend, clicks, impressions, conversions, and revenue.",
  l7dKpi:
    "Same KPI type, using only the last 7 calendar days (from today minus 6 through today).",
  achievement:
    "How the FTD KPI compares to your target (backend formula depends on type, e.g. CPA uses target ÷ actual).",
  health: "Combined pacing + achievement label from the latest successful snapshot.",
} as const;

type SortKey =
  | "name"
  | "totalBudget"
  | "pacing"
  | "achievement"
  | "brand";

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val: number | null | undefined): string {
  if (val == null) return "—";
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPacing(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
}

function formatKpiValue(
  targetType: string | null | undefined,
  val: number | null | undefined,
): string {
  if (val == null) return "—";
  const t = (targetType || "").toUpperCase();
  if (t === "ROAS") return `${val.toFixed(2)}x`;
  if (t === "CPC" || t === "CPM" || t === "CPA") {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTargetKpiLabel(
  targetType: string | null | undefined,
  targetValue: number | null | undefined,
): string {
  if (targetValue == null || !targetType) return "—";
  return formatKpiValue(targetType, targetValue);
}

/** Subtitle under target value, e.g. "(CPA - BP | Website Form Fill)" or "(CPC)". */
function formatTargetKpiSubtitle(
  targetType: string | null | undefined,
  metricType: string | null | undefined,
  _trackingKpiName: string | null | undefined,
  primaryConversionMetricName: string | null | undefined,
): string | null {
  if (!targetType?.trim()) return null;
  const tt = targetType.trim().toUpperCase();
  const convName = primaryConversionMetricName?.trim();
  if (metricType === "conversion" && convName) {
    return `${tt} - ${convName}`;
  }
  return tt;
}

function pacingTextClass(pacing: number | null | undefined): string {
  if (pacing == null) return "text-forest-f30";
  if (pacing >= 80 && pacing <= 120) return "text-forest-f40";
  if (pacing >= 50 && pacing <= 150) return "text-yellow-y10";
  return "text-red-r30";
}

function healthBadgeClasses(health: string | null | undefined): string {
  if (!health) return "bg-sandstorm-s20 text-forest-f30 border-sandstorm-s40";
  const h = health.toLowerCase();
  if (h.includes("excellent")) {
    return "bg-forest-f0 text-forest-f50 border-forest-f40/40";
  }
  if (h.includes("good")) {
    return "bg-forest-f0/80 text-forest-f60 border-forest-f40/25";
  }
  if (h.includes("warning")) {
    return "bg-yellow-y10/15 text-forest-f60 border-yellow-y10/50";
  }
  if (h.includes("critical")) {
    return "bg-red-r0 text-red-r30 border-red-r30/30";
  }
  return "bg-sandstorm-s20 text-forest-f30 border-sandstorm-s40";
}

function EmptyValue() {
  return <span className="text-forest-f20 tabular-nums">—</span>;
}

function MetricSkeleton() {
  return (
    <span className="inline-block h-3.5 w-14 rounded bg-sandstorm-s20 animate-pulse" />
  );
}

/** Normalize API guardrails (object, JSON string, or missing). */
function parseGuardrails(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t) as unknown;
      if (p !== null && typeof p === "object" && !Array.isArray(p)) {
        return p as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function guardrailsHasDataRaw(raw: unknown): boolean {
  const g = parseGuardrails(raw);
  return g != null && Object.keys(g).length > 0;
}

const GUARDRAIL_DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const GUARDRAIL_DAY_LABEL: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function guardrailDaySortKey(day: string): number {
  const i = GUARDRAIL_DAY_ORDER.indexOf(day as (typeof GUARDRAIL_DAY_ORDER)[number]);
  return i === -1 ? 999 : i;
}

function asStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function numFromOptional(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? undefined : n;
}

function genderReadable(v: string): string {
  const m: Record<string, string> = {
    male: "Male",
    female: "Female",
    all: "All",
    other: "Other",
  };
  return m[v.toLowerCase()] ?? v;
}

function schedulePresetReadable(preset: string): string {
  const p = preset.toLowerCase();
  if (p === "weekdays") return "Weekdays";
  if (p === "weekends") return "Weekends";
  if (p === "all") return "All days";
  if (p === "custom") return "Custom";
  return preset ? preset.charAt(0).toUpperCase() + preset.slice(1) : "—";
}

const GUARDRAIL_CHIP_SM =
  "inline-flex items-center px-1.5 py-0 rounded border border-forest-f40/20 bg-forest-f0 text-forest-f60 text-[10px] font-medium leading-tight";

function GuardrailSegLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[9px] font-semibold text-forest-f30 uppercase tracking-wide mb-0.5 leading-none">
      {children}
    </span>
  );
}

function GuardrailChipRowCompact({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <GuardrailSegLabel>{label}</GuardrailSegLabel>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span key={`${label}-${v}`} className={GUARDRAIL_CHIP_SM}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function GuardrailsDetailPanel({ guardrails }: { guardrails: unknown }) {
  const gr = parseGuardrails(guardrails);
  if (!gr || Object.keys(gr).length === 0) {
    return (
      <p className="text-[12px] text-forest-f30 m-0">
        No guardrails on this portfolio. Edit the portfolio to add budget limits, schedule, audience rules, and more.
      </p>
    );
  }

  const segments: { key: string; node: React.ReactNode }[] = [];

  if (gr.budget && typeof gr.budget === "object" && gr.budget !== null && !Array.isArray(gr.budget)) {
    const b = gr.budget as Record<string, unknown>;
    const min = numFromOptional(b.minSpend);
    const max = numFromOptional(b.maxSpend);
    if (min != null || max != null) {
      const parts = [
        min != null ? `Min ${formatCurrency(min)}` : null,
        max != null ? `Max ${formatCurrency(max)}` : null,
      ].filter(Boolean);
      segments.push({
        key: "budget",
        node: (
          <>
            <GuardrailSegLabel>Budget</GuardrailSegLabel>
            <p className="m-0 text-[11px] text-forest-f60 tabular-nums leading-snug">{parts.join(" · ")}</p>
          </>
        ),
      });
    }
  }

  if (gr.changePercentage && typeof gr.changePercentage === "object" && gr.changePercentage !== null) {
    const ch = gr.changePercentage as Record<string, unknown>;
    const maxCh = numFromOptional(ch.maxChange);
    if (maxCh != null) {
      segments.push({
        key: "change",
        node: (
          <>
            <GuardrailSegLabel>Change cap</GuardrailSegLabel>
            <p className="m-0 text-[11px] font-semibold text-forest-f60 tabular-nums leading-snug">
              ≤ {maxCh}%
            </p>
          </>
        ),
      });
    }
  }

  if (gr.targeting && typeof gr.targeting === "object") {
    const tgt = gr.targeting as Record<string, unknown>;
    const demo = tgt.demographics;
    let demographics: Record<string, unknown> | null = null;
    if (demo && typeof demo === "object" && !Array.isArray(demo)) {
      demographics = demo as Record<string, unknown>;
    }
    const geos = demographics ? asStrArray(demographics.geo) : [];
    const genders = demographics ? asStrArray(demographics.gender).map(genderReadable) : [];
    const ages = demographics ? asStrArray(demographics.ageRanges) : [];
    if (geos.length || genders.length || ages.length) {
      segments.push({
        key: "targeting",
        node: (
          <>
            <GuardrailSegLabel>Targeting</GuardrailSegLabel>
            <div className="flex flex-col gap-1.5">
              <GuardrailChipRowCompact label="Geo" values={geos} />
              <GuardrailChipRowCompact label="Gender" values={genders} />
              <GuardrailChipRowCompact label="Age" values={ages} />
            </div>
          </>
        ),
      });
    }
  }

  if (typeof gr.adRules === "string" && gr.adRules.trim()) {
    segments.push({
      key: "adRules",
      node: (
        <>
          <GuardrailSegLabel>Ad rules</GuardrailSegLabel>
          <p className="m-0 text-[11px] text-forest-f60 leading-snug line-clamp-3 whitespace-pre-wrap">
            {gr.adRules.trim()}
          </p>
        </>
      ),
    });
  }

  if (gr.audienceRules && typeof gr.audienceRules === "object" && gr.audienceRules !== null) {
    const ar = gr.audienceRules as Record<string, unknown>;
    const inc = asStrArray(ar.include);
    const exc = asStrArray(ar.exclude);
    if (inc.length || exc.length) {
      segments.push({
        key: "audience",
        node: (
          <>
            <GuardrailSegLabel>Audience</GuardrailSegLabel>
            <div className="flex flex-col gap-1.5">
              {inc.length > 0 ? (
                <div>
                  <span className="text-[9px] text-forest-f30 uppercase tracking-wide">In</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {inc.map((name) => (
                      <span key={`inc-${name}`} className={GUARDRAIL_CHIP_SM}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {exc.length > 0 ? (
                <div>
                  <span className="text-[9px] text-forest-f30 uppercase tracking-wide">Out</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {exc.map((name) => (
                      <span
                        key={`exc-${name}`}
                        className="inline-flex items-center px-1.5 py-0 rounded border border-sandstorm-s40 bg-white text-forest-f60 text-[10px] font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ),
      });
    }
  }

  if (gr.schedule && typeof gr.schedule === "object" && gr.schedule !== null) {
    const sch = gr.schedule as Record<string, unknown>;
    const presetRaw = sch.preset != null ? String(sch.preset) : "";
    const daysRaw = asStrArray(sch.days).map((d) => d.toLowerCase());
    const sortedDays = [...daysRaw].sort((a, b) => guardrailDaySortKey(a) - guardrailDaySortKey(b));
    if (presetRaw || sortedDays.length > 0) {
      segments.push({
        key: "schedule",
        node: (
          <>
            <GuardrailSegLabel>Schedule</GuardrailSegLabel>
            <div className="flex flex-col gap-1">
              {presetRaw ? (
                <p className="m-0 text-[11px] text-forest-f60 leading-snug">
                  <span className="text-forest-f30">Preset </span>
                  <span className="font-medium">{schedulePresetReadable(presetRaw)}</span>
                </p>
              ) : null}
              {sortedDays.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {sortedDays.map((d) => (
                    <span key={d} className={GUARDRAIL_CHIP_SM}>
                      {GUARDRAIL_DAY_LABEL[d] ?? d}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ),
      });
    }
  }

  const known = new Set([
    "budget",
    "changePercentage",
    "targeting",
    "adRules",
    "audienceRules",
    "schedule",
  ]);
  const other = Object.fromEntries(Object.entries(gr).filter(([k]) => !known.has(k)));
  if (Object.keys(other).length > 0) {
    segments.push({
      key: "other",
      node: (
        <>
          <GuardrailSegLabel>Other</GuardrailSegLabel>
          <dl className="grid gap-1 m-0">
            {Object.entries(other).map(([key, val]) => (
              <div key={key} className="min-w-0">
                <dt className="text-[9px] font-medium text-forest-f30 uppercase tracking-wide m-0 leading-none">
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()}
                </dt>
                <dd className="m-0 mt-0.5 text-[10px] text-forest-f60 break-words leading-snug">
                  {val != null && typeof val === "object" ? (
                    <span className="font-mono text-[9px]">{JSON.stringify(val)}</span>
                  ) : (
                    String(val ?? "—")
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ),
    });
  }

  if (segments.length === 0) {
    return (
      <p className="text-[12px] text-forest-f30 m-0">
        Guardrails are present but use an unexpected shape.{" "}
        <span className="font-mono text-[10px] text-forest-f60 break-all">{JSON.stringify(gr)}</span>
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-sandstorm-s40 bg-white/95 px-2 py-2 sm:px-2.5 shadow-[0_1px_2px_rgba(7,41,41,0.04)]">
      <div className="flex flex-wrap items-start gap-y-2 gap-x-0">
        {segments.map((seg, i) => (
          <div
            key={seg.key}
            className={cn(
              "min-w-0 flex-1 basis-[8.5rem] max-w-full sm:max-w-[15.5rem]",
              i > 0 && "sm:border-l sm:border-sandstorm-s40/80 sm:pl-3 sm:ml-0",
            )}
          >
            {seg.node}
          </div>
        ))}
      </div>
    </div>
  );
}

function openDashboardPath(accountId: number, dashboardId: number): string {
  return `/brands/${accountId}/dashboards/${dashboardId}`;
}

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  change_state: "Change state",
  adjust_budget: "Adjust budget",
  adjust_bid: "Adjust bid",
  add_negative_keyword: "Add negative keyword",
  change_bid_strategy: "Change bid strategy",
  adjust_target: "Adjust target",
  add_keyword: "Add keyword",
  exclude_placement: "Exclude placement",
  add_negative_target: "Add negative target",
  update_targeting: "Update targeting",
  set_ad_schedule: "Set ad schedule",
  adjust_device_bid: "Adjust device bid",
  adjust_demographic_bid: "Adjust demographic bid",
  adjust_age_targeting: "Adjust age targeting",
};

const CONDITION_OP_LABEL: Record<ActionCondition["operator"], string> = {
  lt: "<",
  gt: ">",
  eq: "=",
  lte: "≤",
  gte: "≥",
  in: "in",
  not_in: "not in",
};

function isCompoundActionCondition(
  c: ActionCondition | CompoundActionCondition,
): c is CompoundActionCondition {
  return (
    c != null &&
    typeof c === "object" &&
    "logic" in c &&
    Array.isArray((c as CompoundActionCondition).conditions)
  );
}

function formatConditionValue(value: ActionCondition["value"]): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return String(value);
}

/** Human-readable row filter (tooltip / aria). */
function formatActionRuleCondition(cond: ActionCondition | CompoundActionCondition | undefined): string | null {
  if (!cond) return null;
  if (isCompoundActionCondition(cond)) {
    const parts = cond.conditions
      .filter((sc) => sc && typeof sc.field === "string")
      .map((sc) => {
        const field = formatMetricLabel(sc.field);
        const op = CONDITION_OP_LABEL[sc.operator] ?? sc.operator;
        return `${field} ${op} ${formatConditionValue(sc.value)}`;
      });
    if (parts.length === 0) return null;
    const joiner = cond.logic === "or" ? " OR " : " AND ";
    return parts.join(joiner);
  }
  if (!cond.field) return null;
  const field = formatMetricLabel(cond.field);
  const op = CONDITION_OP_LABEL[cond.operator] ?? cond.operator;
  return `${field} ${op} ${formatConditionValue(cond.value)}`;
}

type ConditionClauseRow = { field: string; op: string; value: string };

function actionConditionClauses(
  cond: ActionCondition | CompoundActionCondition | undefined,
): { logic: "and" | "or" | null; clauses: ConditionClauseRow[] } {
  if (!cond) return { logic: null, clauses: [] };
  if (isCompoundActionCondition(cond)) {
    const clauses = cond.conditions
      .filter((sc) => sc && typeof sc.field === "string")
      .map((sc) => ({
        field: formatMetricLabel(sc.field),
        op: CONDITION_OP_LABEL[sc.operator] ?? sc.operator,
        value: formatConditionValue(sc.value),
      }));
    const logic = cond.logic === "or" ? "or" : "and";
    return { logic: clauses.length > 1 ? logic : null, clauses };
  }
  if (!cond.field) return { logic: null, clauses: [] };
  return {
    logic: null,
    clauses: [
      {
        field: formatMetricLabel(cond.field),
        op: CONDITION_OP_LABEL[cond.operator] ?? cond.operator,
        value: formatConditionValue(cond.value),
      },
    ],
  };
}

function ExpandPanelActionConditionChips({
  cond,
}: {
  cond: ActionCondition | CompoundActionCondition | undefined;
}) {
  const { logic, clauses } = actionConditionClauses(cond);
  const condText = formatActionRuleCondition(cond);
  if (clauses.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-md border border-sandstorm-s40/90 bg-white/90 px-2 py-1.5"
      title={condText ?? undefined}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[9px] font-semibold text-forest-f30 uppercase tracking-wide shrink-0">
          Conditions
        </span>
        {logic === "or" ? (
          <span className="text-[9px] font-medium text-forest-f40 bg-forest-f0/80 px-1.5 py-0.5 rounded border border-forest-f40/20">
            Any match
          </span>
        ) : clauses.length > 1 ? (
          <span className="text-[9px] font-medium text-forest-f30">All must match</span>
        ) : null}
      </div>
      <ul className="m-0 mt-1.5 p-0 list-none flex flex-wrap gap-1.5">
        {clauses.map((c, idx) => (
          <li key={`${c.field}-${idx}`}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-sandstorm-s40 bg-sandstorm-s5 text-[10px] text-forest-f60 leading-tight max-w-full">
              <span className="font-medium text-forest-f50 whitespace-nowrap">{c.field}</span>
              <span className="text-forest-f30 shrink-0">{c.op}</span>
              <span className="font-mono text-[10px] text-forest-f60 break-all min-w-0">{c.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function visualizationLabel(viz: string): string {
  return viz
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function activeDashboardComponents(config: DashboardResponse["config"] | undefined): DashboardComponent[] {
  const raw = config?.components;
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c != null && !c.deleted_at);
}

function activeActionsForComponent(c: DashboardComponent): ActionRule[] {
  return (c.actions ?? []).filter((a) => a.status !== "deleted");
}

/** Widgets that have at least one non-deleted action (for compact expand preview). */
function dashboardComponentsWithActions(components: DashboardComponent[]): DashboardComponent[] {
  return components.filter((c) => activeActionsForComponent(c).length > 0);
}

function ExpandPanelDashboardSummaryCard({
  d,
  onOpen,
}: {
  d: DashboardResponse;
  onOpen: (id: number) => void;
}) {
  const meta = dashboardMetaLine(d);
  const updated =
    d.updatedAt != null
      ? `Updated ${new Date(d.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : null;
  const metaLine = [meta, updated].filter(Boolean).join(" · ") || null;
  const desc = d.description?.trim() || null;
  const strategicSummary = typeof d.summary === "string" ? d.summary.trim() : "";
  const platformLabel = PLATFORM_LABELS[d.platform] ?? d.platform ?? null;
  const components = activeDashboardComponents(d.config);
  const actionComponents = dashboardComponentsWithActions(components);
  const maxWidgets = 8;
  const shown = actionComponents.slice(0, maxWidgets);
  const restWidgets = Math.max(0, actionComponents.length - maxWidgets);
  const totalActionCount = actionComponents.reduce((n, c) => n + activeActionsForComponent(c).length, 0);

  return (
    <div
      className={cn(
        "w-full max-w-none rounded-xl border border-sandstorm-s40 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(7,41,41,0.04)]",
      )}
    >
      <div className="flex gap-2 min-w-0 w-full">
        <LayoutDashboard className="w-4 h-4 text-forest-f40 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="text-[13px] font-semibold text-forest-f40 hover:text-forest-f50 m-0 leading-snug break-words text-left transition-colors inline-flex items-center gap-1.5 group"
            title={d.name ?? undefined}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(d.id);
            }}
          >
            {d.name?.trim() || `Dashboard ${d.id}`}
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </button>
          {metaLine ? (
            <p className="text-[11px] text-forest-f30 m-0 mt-0.5 leading-snug">{metaLine}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {platformLabel ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border border-sandstorm-s40 bg-sandstorm-s5 text-forest-f60">
                {platformLabel}
              </span>
            ) : null}
            {components.length > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border border-forest-f40/20 bg-forest-f0 text-forest-f50">
                {totalActionCount > 0
                  ? `${totalActionCount} action${totalActionCount === 1 ? "" : "s"} across ${actionComponents.length} widget${actionComponents.length === 1 ? "" : "s"}`
                  : `${components.length} widget${components.length === 1 ? "" : "s"} · no actions yet`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {strategicSummary ? (
        <StrategicContextCard content={strategicSummary} />
      ) : null}

      {desc ? (
        <p className="text-[11px] text-forest-f30 m-0 mt-2 leading-snug line-clamp-2">{desc}</p>
      ) : null}

      {shown.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-sandstorm-s40/80 w-full min-w-0">
          <p className="text-[10px] font-semibold text-forest-f30 uppercase tracking-wide m-0 mb-2">
            Actions by widget
          </p>
          <ul className="m-0 p-0 list-none space-y-2">
            {shown.map((c) => {
              const actions = activeActionsForComponent(c);
              const maxActions = 6;
              const showActions = actions.slice(0, maxActions);
              const restActions = Math.max(0, actions.length - maxActions);
              return (
                <li
                  key={c.id}
                  className="rounded-lg border border-sandstorm-s40/90 bg-sandstorm-s5/60 px-3 py-2 min-w-0 w-full"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="text-[12px] font-medium text-forest-f60">{c.title || "Untitled widget"}</span>
                    <span className="text-[10px] text-forest-f30 shrink-0">
                      {visualizationLabel(c.visualization_type)}
                    </span>
                  </div>
                  <ol className="m-0 mt-2 p-0 list-none space-y-2.5">
                    {showActions.map((a: ActionRule, ai: number) => {
                      const n = ai + 1;
                      return (
                        <li
                          key={a.id}
                          className="rounded-lg border border-sandstorm-s40/80 bg-white/95 px-2.5 py-2 min-w-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]"
                        >
                          <div className="flex gap-2 min-w-0">
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold tabular-nums",
                                "border-forest-f40/25 bg-forest-f0 text-forest-f50",
                              )}
                              aria-hidden
                            >
                              {n}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                <span className="text-[12px] font-semibold text-forest-f60 leading-snug">
                                  {ACTION_TYPE_LABELS[a.type] ?? a.type}
                                </span>
                                <span className="text-[10px] text-forest-f30 uppercase tracking-wide px-1.5 py-px rounded border border-sandstorm-s40 bg-sandstorm-s5 whitespace-nowrap">
                                  {a.platform}
                                </span>
                                <span className="text-[10px] text-forest-f30">{a.entity_type}</span>
                                {a.status !== "active" ? (
                                  <span className="text-[10px] font-medium text-yellow-y10 bg-yellow-y10/10 px-1.5 py-px rounded border border-yellow-y10/30">
                                    {a.status}
                                  </span>
                                ) : null}
                              </div>
                              <ExpandPanelActionConditionChips cond={a.condition} />
                              {a.description ? (
                                <p
                                  className="text-[11px] text-forest-f30 m-0 mt-2 leading-relaxed line-clamp-3"
                                  title={a.description}
                                >
                                  {a.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {restActions > 0 ? (
                      <li className="text-[10px] text-forest-f30 italic pl-1 py-0.5">
                        +{restActions} more for this widget — open dashboard
                      </li>
                    ) : null}
                  </ol>
                </li>
              );
            })}
          </ul>
          {restWidgets > 0 ? (
            <p className="text-[11px] text-forest-f30 m-0 mt-2 mb-0">
              +{restWidgets} more widget{restWidgets === 1 ? "" : "s"} with actions — open dashboard for the full list.
            </p>
          ) : null}
        </div>
      ) : components.length > 0 ? (
        <p className="text-[11px] text-forest-f30 m-0 mt-3 pt-3 border-t border-sandstorm-s40/80 w-full">
          No action rules on widgets yet — open the dashboard to add or sync actions.
        </p>
      ) : (
        <p className="text-[11px] text-forest-f30 m-0 mt-3 pt-3 border-t border-sandstorm-s40/80 w-full">
          No widgets in this dashboard config yet — open to build the layout.
        </p>
      )}
    </div>
  );
}

function dashboardMetaLine(d: DashboardResponse): string | null {
  const parts = [d.channelName, d.profileName].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function PortfolioExpandDashboards({
  portfolio: p,
  dashboards,
  latestDashboardId,
  dashboardCount,
  dashLoading,
  dashError,
}: {
  portfolio: PortfolioListItem;
  dashboards: DashboardResponse[];
  latestDashboardId: number | null | undefined;
  dashboardCount: number;
  dashLoading: boolean;
  dashError: boolean;
}) {
  const navigate = useNavigate();
  const { openAssistant, startNewSession, setInputValue, setPortfolioScope } = useAssistant();
  const accountId = p.accountId;
  const portfolioId = p.id;
  const portfolioName = p.name;

  const manageHref = `/brands/${accountId}/portfolios/${portfolioId}?tab=dashboards`;

  const needLatestDetail =
    dashboards.length === 0 && latestDashboardId != null && typeof latestDashboardId === "number";

  const { data: latestDetail, isLoading: latestDetailLoading } = useQuery({
    queryKey: ["assistant", "dashboards", "detail", accountId, latestDashboardId],
    queryFn: () => getDashboardDetail(accountId, latestDashboardId!),
    enabled: needLatestDetail,
    staleTime: 60_000,
  });

  const listLoading = dashLoading || (needLatestDetail && latestDetailLoading);

  const openDash = (id: number) => window.open(openDashboardPath(accountId, id), "_blank");

  const countLabel =
    dashboards.length > 0
      ? `${dashboards.length} linked`
      : (dashboardCount ?? 0) > 0
        ? `${dashboardCount} in portfolio`
        : "None linked";

  const renderSummary = (d: DashboardResponse) => (
    <ExpandPanelDashboardSummaryCard
      key={d.id}
      d={d}
      onOpen={openDash}
    />
  );

  return (
    <div className="w-full min-w-0">
      <h4 className="text-[13px] font-semibold text-forest-f60 m-0 mb-2 flex items-center gap-2 flex-wrap">
        <LayoutDashboard className="w-4 h-4 text-forest-f40 shrink-0" aria-hidden />
        Dashboards
        <span
          className={cn(
            "text-[11px] font-medium normal-case px-2 py-0.5 rounded border",
            dashboards.length > 0 || (dashboardCount ?? 0) > 0
              ? "text-forest-f40 bg-forest-f0 border-forest-f40/25"
              : "text-forest-f30 border-transparent",
          )}
        >
          {countLabel}
        </span>
      </h4>

      {dashError ? (
        <p className="text-[12px] text-forest-f30 m-0 mb-2">
          Could not load the dashboard list. You can still open the portfolio Dashboards tab below.
        </p>
      ) : null}

      {listLoading ? (
        <div className="w-full rounded-xl border border-sandstorm-s40 h-32 animate-pulse bg-sandstorm-s20" />
      ) : dashboards.length > 0 ? (
        <div className="space-y-3 w-full">{dashboards.map((d) => renderSummary(d))}</div>
      ) : needLatestDetail && latestDetail ? (
        <div className="space-y-3 w-full">{renderSummary(latestDetail)}</div>
      ) : needLatestDetail && !latestDetail && !latestDetailLoading ? (
        <div className="w-full rounded-xl border border-sandstorm-s40 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(7,41,41,0.04)]">
          <button
            type="button"
            className="text-[12px] font-medium text-forest-f40 hover:text-forest-f50 m-0 text-left transition-colors inline-flex items-center gap-1.5 group"
            onClick={() => openDash(latestDashboardId!)}
          >
            Dashboard #{latestDashboardId}
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </button>
          <p className="text-[11px] text-forest-f30 m-0 mt-1">
            Full details could not be loaded. Click the name above to open.
          </p>
        </div>
      ) : (dashboardCount ?? 0) > 0 ? (
        <div className="w-full rounded-xl border border-sandstorm-s40 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(7,41,41,0.04)]">
          <p className="text-[12px] text-forest-f30 m-0 mb-3 leading-snug">
            {dashError
              ? "Dashboard list failed to load, but this portfolio has linked dashboards."
              : "Linked dashboards exist. Open the portfolio Dashboards tab to see details."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[12px]"
            onClick={(e) => {
              e.stopPropagation();
              navigate(manageHref);
            }}
          >
            Open portfolio · Dashboards
          </Button>
        </div>
      ) : (dashboardCount ?? 0) === 0 ? (
        <div className="w-full rounded-xl border border-sandstorm-s40 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(7,41,41,0.04)]">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-forest-f40/[0.07] shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-forest-f40/70" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-forest-f60 font-medium m-0 mb-1">
                No dashboards linked yet
              </p>
              <p className="text-[11.5px] text-forest-f30 m-0 mb-3 leading-relaxed">
                Use the Assistant to create a dashboard with actions for this portfolio.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="text-[12px] inline-flex items-center gap-1.5 bg-forest-f40 text-white hover:bg-forest-f50 border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    startNewSession();
                    setPortfolioScope(portfolioId, portfolioName, {
                      accountId,
                      channelId: p.channelId ?? undefined,
                      profileId: p.profileId ?? undefined,
                      profileName: p.profileName ?? undefined,
                      platform: p.platform ?? undefined,
                      portfolioDetail: {
                        status: p.status,
                        platform: p.platform,
                        totalBudget: p.totalBudget ?? undefined,
                        targetType: p.targetType ?? undefined,
                        startDate: p.startDate!,
                        endDate: p.endDate!,
                        campaignCount: p.campaignCount ?? 0,
                      },
                    });
                    setInputValue(
                      `Create a dashboard for portfolio "${portfolioName}" (ID: ${portfolioId}). Analyze the campaigns, set up relevant KPI widgets, and suggest actions.`,
                    );
                    openAssistant();
                  }}
                >
                  <Bot className="w-3.5 h-3.5" />
                  Create Dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[12px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(manageHref);
                  }}
                >
                  Go to portfolio
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Fetches full portfolio + dashboards when row is expanded so guardrails and links match the API. */
function PortfolioExpandPanel({ portfolio: p }: { portfolio: PortfolioListItem }) {
  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
  } = useQuery({
    queryKey: queryKeys.portfolios.expandRow(p.accountId, p.id),
    queryFn: () => portfoliosService.getPortfolio(p.accountId, p.id),
    staleTime: 60_000,
  });

  const {
    data: dashboardRows,
    isLoading: dashLoading,
    isError: dashError,
  } = useQuery({
    queryKey: ["assistant", "dashboards", "byPortfolio", p.accountId, p.id],
    queryFn: () => getDashboardsByPortfolio(p.accountId, p.id),
    staleTime: 60_000,
  });

  const effectiveGuardrails = useMemo(() => {
    const listG = parseGuardrails(p.guardrails);
    if (detail === undefined) {
      return listG && Object.keys(listG).length > 0 ? listG : null;
    }
    const detailG = parseGuardrails(detail.guardrails);
    if (detailG && Object.keys(detailG).length > 0) return detailG;
    if (listG && Object.keys(listG).length > 0) return listG;
    return null;
  }, [detail, p.guardrails]);

  const dashboards = dashboardRows ?? [];

  return (
    <div
      className={cn(
        "px-4 py-4 sm:px-6 sm:py-5 border-l-[3px] border-forest-f40/80",
        "bg-gradient-to-r from-forest-f0/45 via-sandstorm-s20/95 to-sandstorm-s20",
      )}
      onClick={(e) => e.stopPropagation()}
      role="region"
      aria-label={`Details for ${p.name}`}
    >
      {(detailLoading || dashLoading) && (
        <p className="text-[12px] text-forest-f30 mb-3 m-0">Loading latest portfolio and dashboard data…</p>
      )}
      {detailError && (
        <p className="text-[12px] text-red-r30 mb-3 m-0">
          Could not refresh portfolio from the server. Showing list data where available.
        </p>
      )}

      <div className="w-full max-w-none min-w-0 space-y-5">
        <div>
          <h4 className="flex items-center gap-2 text-[13px] font-semibold text-forest-f60 m-0 flex-wrap">
            <Shield className="w-4 h-4 text-forest-f40 shrink-0" aria-hidden />
            Guardrails
            {guardrailsHasDataRaw(effectiveGuardrails) ? (
              <span className="text-[11px] font-medium normal-case text-forest-f40 bg-forest-f0 px-2 py-0.5 rounded border border-forest-f40/25">
                Configured
              </span>
            ) : (
              <span className="text-[11px] font-medium normal-case text-forest-f30">None</span>
            )}
          </h4>
          <div className="mt-3">
            <GuardrailsDetailPanel guardrails={effectiveGuardrails} />
          </div>
        </div>

        <PortfolioExpandDashboards
          portfolio={p}
          dashboards={dashboards}
          latestDashboardId={p.latestDashboardId}
          dashboardCount={p.dashboardCount ?? 0}
          dashLoading={dashLoading}
          dashError={dashError}
        />
      </div>
    </div>
  );
}

function achievementClass(pct: number | null | undefined, targetType: string | null | undefined): string {
  if (pct == null) return "text-forest-f30";
  const t = (targetType || "").toUpperCase();
  const lowerBetter = t === "CPC" || t === "CPA" || t === "CPM";
  if (lowerBetter) {
    if (pct < 110) return "text-forest-f40";
    if (pct < 130) return "text-yellow-y10";
    return "text-red-r30";
  }
  if (pct > 90) return "text-forest-f40";
  if (pct > 70) return "text-forest-f60";
  if (pct > 50) return "text-yellow-y10";
  return "text-red-r30";
}

export const PortfolioList: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue, searchQuery] = useDebouncedSearch();
  const [deletingPortfolio, setDeletingPortfolio] = useState<PortfolioListItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });

  const accountId: number | undefined = undefined;

  const {
    portfolios,
    count,
    totalPages,
    isLoading,
    isFetching,
    refetch,
  } = usePortfolios(currentPage, PAGE_SIZE, searchQuery, accountId);

  const needsLiveIds = useMemo(
    () => portfolios.filter((p) => !p.latestTracking).map((p) => p.id),
    [portfolios],
  );

  const { data: liveMetrics, isLoading: liveMetricsLoading } =
    usePortfolioLiveMetrics(needsLiveIds, { enabled: needsLiveIds.length > 0 });

  const { data: summary } = usePortfolioSummary(accountId);
  const deleteMutation = useDeletePortfolio();

  const sortedPortfolios = useMemo(() => {
    const list = portfolios.map((p) => {
      if (p.latestTracking) return p;
      const live = liveMetrics?.[String(p.id)];
      if (live) return { ...p, latestTracking: live };
      return p;
    });
    const mul = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const ta = a.latestTracking;
      const tb = b.latestTracking;
      switch (sort.key) {
        case "brand":
          return mul * a.accountName.localeCompare(b.accountName);
        case "totalBudget":
          return mul * ((a.totalBudget ?? 0) - (b.totalBudget ?? 0));
        case "pacing":
          return (
            mul *
            ((ta?.pacingPercentage ?? -999) - (tb?.pacingPercentage ?? -999))
          );
        case "achievement":
          return (
            mul *
            ((ta?.achievementPercentage ?? -999) -
              (tb?.achievementPercentage ?? -999))
          );
        default:
          return mul * a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [portfolios, sort, liveMetrics]);

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  useEffect(() => {
    setPageTitle("Portfolios");
    return () => resetPageTitle();
  }, []);

  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery);
    setCurrentPage(1);
  }

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const [deleteBannerMsg, setDeleteBannerMsg] = useState("");
  const [deleteBannerType, setDeleteBannerType] = useState<"success" | "error">("success");

  const handleDelete = async () => {
    if (!deletingPortfolio) return;
    const portfolioName = deletingPortfolio.name;
    try {
      await deleteMutation.mutateAsync({
        accountId: deletingPortfolio.accountId,
        portfolioId: deletingPortfolio.id,
      });
      setDeletingPortfolio(null);
      setDeleteBannerType("success");
      setDeleteBannerMsg(`"${portfolioName}" has been deleted.`);
      setTimeout(() => setDeleteBannerMsg(""), 5000);
    } catch {
      setDeletingPortfolio(null);
      setDeleteBannerType("error");
      setDeleteBannerMsg(`Failed to delete "${portfolioName}". Please try again.`);
      setTimeout(() => setDeleteBannerMsg(""), 5000);
    }
  };

  const colHead = (label: string, sk?: SortKey, className?: string, tip?: string) => (
    <th
      className={cn(
        "table-header whitespace-nowrap text-left",
        sk ? "cursor-pointer select-none hover:text-forest-f60" : "!cursor-default",
        className,
      )}
      onClick={sk ? () => toggleSort(sk) : undefined}
      title={tip}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sk && <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-sandstorm-s0 flex">
      <Sidebar />

      <div
        className="flex-1 w-full min-w-0 flex flex-col"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />

        <div className="px-4 pt-24 pb-10 sm:px-6 sm:pt-28 lg:px-8 lg:pt-28 lg:pb-10 bg-white flex-1 min-h-0">
          <Assistant>
            <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white flex-1 pb-10">
              <div className="space-y-6">
                {deleteBannerMsg && (
                  <Banner
                    type={deleteBannerType}
                    message={deleteBannerMsg}
                    dismissable
                    onDismiss={() => setDeleteBannerMsg("")}
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h1 className="text-[22px] sm:text-[24px] font-medium text-forest-f60 leading-[normal]">
                    Portfolios
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className="search-input-container h-[40px] w-full md:w-[272px] flex items-center gap-2 px-[10px]">
                      <Search className="w-4 h-4 text-forest-f30 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search portfolios..."
                        className="bg-transparent border-none outline-none text-[13px] text-forest-f60 w-full placeholder:text-forest-f30/60"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                    </div>
                    <Tooltip description="Refresh">
                      <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg border border-sandstorm-s40 hover:bg-sandstorm-s10 transition-colors"
                        aria-label="Refresh"
                      >
                        <RefreshCw
                          className={cn(
                            "w-4 h-4 text-forest-f30",
                            isFetching && "animate-spin",
                          )}
                        />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KPICard label="Total Portfolios" value={summary?.totalPortfolios ?? 0} />
                  <KPICard label="Live" value={summary?.livePortfolios ?? 0} />
                  <KPICard label="Behind Pacing" value={summary?.behindPacing ?? 0} />
                  <KPICard label="Need Attention" value={summary?.needAttention ?? 0} />
                </div>

                <div
                  className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-hidden relative"
                  style={{ minHeight: isLoading ? "400px" : undefined }}
                >
                  {(isLoading || isFetching) && (
                    <div className="loading-overlay">
                      <div className="loading-overlay-content">
                        <Loader
                          size="md"
                          message={isLoading ? "Loading portfolios..." : "Updating..."}
                        />
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto isolate max-w-full">
                    <table className="min-w-[1100px] w-full border-collapse">
                      <thead>
                        <tr className="bg-sandstorm-s0 border-b border-sandstorm-s40">
                          <th
                            colSpan={4}
                            className="table-header !cursor-default text-left sticky left-0 z-30 bg-sandstorm-s10 border-r border-sandstorm-s40 shadow-[2px_0_6px_rgba(7,41,41,0.08)] text-forest-f60 font-semibold"
                          >
                            Portfolio
                          </th>
                          <th
                            colSpan={4}
                            className="table-header !cursor-default text-center bg-sandstorm-s10/90 text-forest-f60 font-semibold border-r border-sandstorm-s40"
                            title={PORTFOLIO_TRACKING_TIPS.budgetGroup}
                          >
                            Budget
                          </th>
                          <th
                            colSpan={7}
                            className="table-header !cursor-default text-center bg-sandstorm-s0 text-forest-f60 font-semibold"
                            title={PORTFOLIO_TRACKING_TIPS.performanceGroup}
                          >
                            Performance
                          </th>
                          <th className="table-header w-11 min-w-[2.75rem] !cursor-default bg-sandstorm-s0 border-l border-sandstorm-s40" />
                        </tr>
                        <tr className="border-b border-sandstorm-s40">
                          <th
                            className={cn(
                              "table-header sticky left-0 z-20 bg-sandstorm-s5 border-r border-sandstorm-s40 shadow-[2px_0_6px_rgba(7,41,41,0.06)]",
                              COL.portfolio,
                            )}
                            onClick={() => toggleSort("name")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Portfolio
                              <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                            </span>
                          </th>
                          <th
                            className={cn(
                              "table-header sticky z-20 bg-sandstorm-s5 border-r border-sandstorm-s40 shadow-[2px_0_6px_rgba(7,41,41,0.06)]",
                              COL.brandSticky,
                              COL.brand,
                            )}
                            onClick={() => toggleSort("brand")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Brand
                              <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                            </span>
                          </th>
                          <th className={cn("table-header !cursor-default", COL.tags)}>Tags</th>
                          <th className={cn("table-header !cursor-default", COL.adAccount)}>Ad account</th>
                          {colHead("Total", "totalBudget", undefined, PORTFOLIO_TRACKING_TIPS.totalBudget)}
                          {colHead("Target (FTD)", undefined, undefined, PORTFOLIO_TRACKING_TIPS.targetFtd)}
                          {colHead("Actual (FTD)", undefined, undefined, PORTFOLIO_TRACKING_TIPS.actualFtd)}
                          {colHead("Pacing", "pacing", undefined, PORTFOLIO_TRACKING_TIPS.pacing)}
                          {colHead("FTD conv.", undefined, undefined, PORTFOLIO_TRACKING_TIPS.ftdConv)}
                          {colHead("FTD rev.", undefined, undefined, PORTFOLIO_TRACKING_TIPS.ftdRev)}
                          {colHead("Target (KPI)", undefined, undefined, PORTFOLIO_TRACKING_TIPS.targetKpi)}
                          {colHead("FTD (KPI)", undefined, undefined, PORTFOLIO_TRACKING_TIPS.ftdKpi)}
                          {colHead("L7D (KPI)", undefined, undefined, PORTFOLIO_TRACKING_TIPS.l7dKpi)}
                          {colHead("Achieve. %", "achievement", undefined, PORTFOLIO_TRACKING_TIPS.achievement)}
                          {colHead("Health", undefined, undefined, PORTFOLIO_TRACKING_TIPS.health)}
                          <th className="table-header w-11 min-w-[2.75rem] !cursor-default" aria-label="Row actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={`skeleton-${i}`} className="table-row">
                              {Array.from({ length: 16 }).map((_, j) => (
                                <td key={j} className="table-cell">
                                  <div className="h-4 bg-sandstorm-s20 rounded animate-pulse w-20" />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : sortedPortfolios.length === 0 ? (
                          <tr>
                            <td colSpan={16} className="table-cell text-center py-12">
                              <p className="text-[14px] text-forest-f30 mb-2">
                                {searchQuery
                                  ? "No portfolios match your search."
                                  : "No portfolios yet."}
                              </p>
                              {!searchQuery && (
                                <p className="text-[13px] text-forest-f30">
                                  Go to a campaign page, select campaigns, and use
                                  &quot;Create Portfolio&quot; from bulk actions.
                                </p>
                              )}
                            </td>
                          </tr>
                        ) : (
                          sortedPortfolios.map((p) => (
                            <React.Fragment key={p.id}>
                              <PortfolioRow
                                portfolio={p}
                                metricsLoading={
                                  !p.latestTracking && liveMetricsLoading && needsLiveIds.includes(p.id)
                                }
                                expanded={expandedRowId === p.id}
                                onToggleExpand={() =>
                                  setExpandedRowId((id) => (id === p.id ? null : p.id))
                                }
                                onView={() =>
                                  navigate(`/brands/${p.accountId}/portfolios/${p.id}`)
                                }
                                onAgents={() =>
                                  navigate(
                                    `/brands/${p.accountId}/portfolios/${p.id}?tab=dashboards`,
                                  )
                                }
                                onEdit={() =>
                                  navigate(
                                    `/brands/${p.accountId}/portfolios/${p.id}?edit=true`,
                                  )
                                }
                                onDelete={() => setDeletingPortfolio(p)}
                                menuOpen={menuOpenId === p.id}
                                onMenuToggle={() =>
                                  setMenuOpenId(menuOpenId === p.id ? null : p.id)
                                }
                              />
                              {expandedRowId === p.id ? (
                                <tr className="border-t border-forest-f40/20 bg-sandstorm-s20">
                                  <td colSpan={16} className="p-0 align-top sticky left-0">
                                    <div style={{ width: `calc(100vw - ${sidebarWidth}px - 3.5rem)` }}>
                                      <PortfolioExpandPanel portfolio={p} />
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-forest-f30">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, count)} of {count}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="text-[12px] px-3 py-1.5"
                      >
                        Previous
                      </Button>
                      <span className="text-[13px] text-forest-f30">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="text-[12px] px-3 py-1.5"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Assistant>
        </div>

        <ConfirmationModal
          isOpen={deletingPortfolio !== null}
          onClose={() => !deleteMutation.isPending && setDeletingPortfolio(null)}
          onConfirm={handleDelete}
          title="Delete Portfolio"
          message={`Are you sure you want to delete "${deletingPortfolio?.name}"? This action cannot be undone.`}
          confirmButtonLabel="Delete"
          isDangerous
          isLoading={deleteMutation.isPending}
          loadingLabel="Deleting..."
        />
      </div>
    </div>
  );
};

interface PortfolioRowProps {
  portfolio: PortfolioListItem;
  metricsLoading?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onView: () => void;
  onAgents: () => void;
  onEdit: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

      const PortfolioRow: React.FC<PortfolioRowProps> = ({
        portfolio: p,
        metricsLoading = false,
        expanded,
        onToggleExpand,
        onView,
        onAgents,
        onEdit,
        onDelete,
        menuOpen,
        onMenuToggle,
}) => {
  const navigate = useNavigate();
        const t = p.latestTracking;
        const dashCount = p.dashboardCount ?? 0;
        const latestDashboardId = p.latestDashboardId ?? null;

  const stickyCell = (extra: string) =>
        cn("table-cell align-top bg-sandstorm-s5", extra);

        const health = t?.health ?? null;
        const targetKpiLabel = formatTargetKpiLabel(p.targetType, p.targetValue);
        const targetKpiSubtitle = formatTargetKpiSubtitle(
        p.targetType,
        p.metricType,
        t?.targetKpiName ?? null,
        p.primaryConversionMetricName ?? null,
        );
        const ftdKpi = formatKpiValue(p.targetType, t?.targetKpiValue);
        const l7dKpi = formatKpiValue(p.targetType, t?.l7dKpiValue);

        return (
        <tr
          className="table-row cursor-pointer hover:bg-sandstorm-s10/60"
          onClick={onView}
        >
          <td
            className={cn(
              stickyCell(
                cn(
                  "sticky left-0 z-10 border-r border-sandstorm-s40 shadow-[2px_0_6px_rgba(7,41,41,0.06)]",
                  COL.portfolio,
                ),
              ),
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <div className="flex gap-2 items-start">
              <button
                type="button"
                className={cn(
                  "mt-0.5 shrink-0 rounded-md p-1 text-forest-f30 transition-colors",
                  "border border-transparent hover:border-sandstorm-s40 hover:bg-sandstorm-s10",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-f40",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? `Collapse guardrails and dashboards for ${p.name}`
                    : `Expand guardrails and dashboards for ${p.name}`
                }
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4" aria-hidden />
                ) : (
                  <ChevronRight className="w-4 h-4" aria-hidden />
                )}
              </button>
              <div className="flex flex-col gap-1.5 py-0.5 min-w-0 flex-1">
                <span className="text-[13px] font-medium text-forest-f60 leading-snug">{p.name}</span>
                <span className="text-[12px] text-forest-f30 leading-normal">
                  {p.campaignCount} campaigns · {PLATFORM_LABELS[p.platform] ?? p.platform}
                </span>
                {dashCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAgents();
                    }}
                    className="inline-flex items-center gap-1 self-start mt-0.5 text-[11px] font-medium text-forest-f40 hover:text-forest-f50"
                    aria-label={`Open dashboards tab, ${dashCount} dashboards`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {dashCount} dashboard{dashCount === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            </div>
          </td>
          <td
            className={cn(
              stickyCell(
                cn(
                  "sticky z-10 border-r border-sandstorm-s40 shadow-[2px_0_6px_rgba(7,41,41,0.06)]",
                  COL.brandSticky,
                  COL.brand,
                ),
              ),
            )}
          >
            <span className="text-[12px] text-forest-f60 truncate block" title={p.accountName}>
              {p.accountName}
            </span>
          </td>
          <td className={cn("table-cell align-top", COL.tags)}>
            <div className="flex flex-wrap gap-1">
              {(p.tags ?? []).slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded bg-sandstorm-s10 text-[10px] text-forest-f30 truncate max-w-[96px]"
                >
                  {tag}
                </span>
              ))}
              {(p.tags?.length ?? 0) > 4 && (
                <span className="text-[10px] text-forest-f30">+{p.tags!.length - 4}</span>
              )}
            </div>
          </td>
          <td className={cn("table-cell align-top", COL.adAccount)}>
            <div className="flex flex-col gap-0.5 text-[12px] leading-snug text-forest-f60">
              <span className="text-forest-f60">{p.channelName}</span>
              {p.profileName && (
                <span className="text-forest-f30 line-clamp-2" title={p.profileName}>
                  {p.profileName}
                </span>
              )}
            </div>
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {p.totalBudget != null ? formatCurrency(p.totalBudget) : <EmptyValue />}
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {metricsLoading ? <MetricSkeleton /> : t?.targetSpendFtd != null ? formatCurrency(t.targetSpendFtd) : <EmptyValue />}
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {metricsLoading ? <MetricSkeleton /> : t?.totalSpend != null ? formatCurrency(t.totalSpend) : <EmptyValue />}
          </td>
          <td className="table-cell whitespace-nowrap align-middle tabular-nums">
            {metricsLoading ? (
              <MetricSkeleton />
            ) : t?.pacingPercentage != null ? (
              <span className={cn("text-[12px] font-medium", pacingTextClass(t.pacingPercentage))}>
                {formatPacing(t.pacingPercentage)}
              </span>
            ) : (
              <EmptyValue />
            )}
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {metricsLoading ? <MetricSkeleton /> : t?.conversions != null ? formatNumber(t.conversions) : <EmptyValue />}
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {metricsLoading ? <MetricSkeleton /> : t?.revenue != null ? formatCurrency(t.revenue) : <EmptyValue />}
          </td>
          <td
            className={cn(
              "table-cell align-top min-w-[6.75rem] max-w-[12rem]",
            )}
          >
            <div className="flex flex-col gap-1 py-0.5">
              {targetKpiLabel !== "—" ? (
                <>
                  <span className="text-[13px] font-semibold text-forest-f60 tabular-nums leading-tight">
                    {targetKpiLabel}
                  </span>
                  {targetKpiSubtitle ? (
                    <span
                      className="text-[11px] text-forest-f40 leading-snug break-words"
                      title={`(${targetKpiSubtitle})`}
                    >
                      ({targetKpiSubtitle})
                    </span>
                  ) : null}
                </>
              ) : (
                <EmptyValue />
              )}
            </div>
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {metricsLoading ? <MetricSkeleton /> : ftdKpi !== "—" ? ftdKpi : <EmptyValue />}
          </td>
          <td className="table-cell text-[12px] text-forest-f60 whitespace-nowrap tabular-nums align-middle">
            {metricsLoading ? <MetricSkeleton /> : l7dKpi !== "—" ? l7dKpi : <EmptyValue />}
          </td>
          <td className="table-cell whitespace-nowrap align-middle tabular-nums">
            {metricsLoading ? (
              <MetricSkeleton />
            ) : t?.achievementPercentage != null ? (
              <span
                className={cn(
                  "text-[12px] font-medium",
                  achievementClass(t.achievementPercentage, p.targetType),
                )}
              >
                {t.achievementPercentage.toFixed(1)}%
              </span>
            ) : (
              <EmptyValue />
            )}
          </td>
          <td className="table-cell whitespace-nowrap align-middle">
            {metricsLoading ? (
              <MetricSkeleton />
            ) : health ? (
              <span
                className={cn(
                  "inline-flex max-w-[10rem] whitespace-normal px-2 py-0.5 text-center text-[10px] font-medium leading-tight border",
                  healthBadgeClasses(health),
                )}
                title={health}
              >
                {health}
              </span>
            ) : (
              <EmptyValue />
            )}
          </td>
          <td
            className="table-cell relative z-20 w-11 min-w-[2.75rem] align-middle bg-sandstorm-s5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle();
              }}
              className="p-1 rounded hover:bg-sandstorm-s20 transition-colors"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4 text-forest-f30" />
            </button>
            {menuOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full z-[100] mt-1 min-w-[168px] rounded-lg border border-sandstorm-s40 bg-white py-1 shadow-lg",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {latestDashboardId != null ? (
                  <button
                    onClick={() => {
                      navigate(`/brands/${p.accountId}/dashboards/${latestDashboardId}`);
                      onMenuToggle();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0 text-forest-f40" />
                    Open dashboard
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    onView();
                    onMenuToggle();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => {
                    onEdit();
                    onMenuToggle();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    onMenuToggle();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-r30 hover:bg-red-r0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </td>
        </tr>
        );
};

        // ── Strategic Context Card ────────────────────────────────────────────────

        const StrategicContextCard: React.FC<{ content: string }> = ({content}) => (
        <div
          className={cn(
            "mt-3 rounded-[10px] w-full min-w-0",
            "border border-sandstorm-s40/70 border-l-[3px] border-l-forest-f40/30",
            "bg-gradient-to-br from-[#f6f9f8] to-sandstorm-s5",
            "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
            "px-3.5 pt-2.5 pb-2.5",
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center justify-center w-4 h-4 rounded bg-forest-f40/[0.08]">
              <Sparkles className="w-2.5 h-2.5 text-forest-f40/70" />
            </div>
            <span className="text-[9px] font-bold text-forest-f30/70 uppercase tracking-[0.08em]">
              Strategic context
            </span>
          </div>
          <div className="text-[11.5px] text-forest-f50 leading-[1.75] break-words [&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="m-0 mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-forest-f60">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="m-0 mb-2 pl-4 list-disc last:mb-0 space-y-0.5 [&_li::marker]:text-forest-f30/40">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="m-0 mb-2 pl-4 list-decimal last:mb-0 space-y-0.5 [&_li::marker]:text-forest-f30/40 [&_li::marker]:text-[11px]">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="m-0 pl-0.5">{children}</li>
                ),
                h1: ({ children }) => (
                  <p className="m-0 mb-1.5 text-[12px] font-semibold text-forest-f60">{children}</p>
                ),
                h2: ({ children }) => (
                  <p className="m-0 mb-1.5 text-[12px] font-semibold text-forest-f60">{children}</p>
                ),
                h3: ({ children }) => (
                  <p className="m-0 mb-1 text-[11.5px] font-semibold text-forest-f60">{children}</p>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-forest-f40 underline decoration-forest-f40/30 hover:decoration-forest-f40/60 transition-colors">{children}</a>
                ),
                code: ({ children }) => (
                  <code className="px-1 py-px rounded bg-forest-f40/[0.06] text-[10.5px] font-mono text-forest-f50">{children}</code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="m-0 mb-2 pl-2.5 border-l-2 border-forest-f40/15 text-forest-f30 italic last:mb-0">{children}</blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
        );
