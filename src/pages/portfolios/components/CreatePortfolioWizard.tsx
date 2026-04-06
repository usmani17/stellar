import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Check,
  Star,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { BaseModal, Button, Loader, Radio, Checkbox, Chip } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { useCreatePortfolio, useUpdatePortfolio } from "../../../hooks/mutations/usePortfolioMutations";
import { portfoliosService } from "../../../services/portfolios";
import { googleAdwordsConversionActionsService } from "../../../services/googleAdwords/googleAdwordsConversionActions";
import type { CreatePortfolioPayload, UpdatePortfolioPayload, MetricsPreviewResponse, Portfolio } from "../../../services/portfolios";
import type { GoogleConversionAction } from "../../../services/googleAdwords/googleAdwordsConversionActions";

interface Campaign {
  campaignId: string;
  campaignName: string;
  campaignType?: string;
  campaignStatus?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accountId: number;
  channelId: number;
  profileId?: number | null;
  platform: "google" | "meta" | "tiktok" | "amazon";
  preSelectedCampaigns?: Campaign[];
  editPortfolio?: Portfolio | null;
}

const CREATE_STEPS = [
  { id: 1, label: "Select Campaigns" },
  { id: 2, label: "Portfolio Settings" },
  { id: 3, label: "Review & Create" },
];

const EDIT_STEPS = [
  { id: 2, label: "Portfolio Settings" },
  { id: 3, label: "Review & Save" },
];

const TARGET_TYPES = [
  { value: "CPC", label: "CPC", fullLabel: "Target CPC" },
  { value: "CPM", label: "CPM", fullLabel: "Target CPM" },
  { value: "CPA", label: "CPA", fullLabel: "Target Cost Per Action" },
  { value: "ROAS", label: "ROAS", fullLabel: "Target ROAS" },
];

interface DefaultMetricDef {
  metric_name: string;
  key: keyof MetricsPreviewResponse;
}

const COMMON_METRICS: DefaultMetricDef[] = [
  { metric_name: "Clicks", key: "clicks" },
  { metric_name: "Impressions", key: "impressions" },
  { metric_name: "Spend", key: "spend" },
  { metric_name: "CTR", key: "ctr" },
  { metric_name: "CPC", key: "cpc" },
  { metric_name: "CPM", key: "cpm" },
  { metric_name: "Conversions", key: "conversions" },
  { metric_name: "Revenue", key: "revenue" },
  { metric_name: "ROAS", key: "roas" },
];

const BUDGET_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const AGE_RANGE_OPTIONS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeDefaultPeriodEnd(startIso: string, frequency: string): string {
  if (!startIso) return "";
  const d = new Date(`${startIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const end = new Date(d);
  switch (frequency) {
    case "daily":
      break;
    case "weekly":
      end.setDate(end.getDate() + 6);
      break;
    case "bi-weekly":
      end.setDate(end.getDate() + 13);
      break;
    case "monthly":
    default:
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
  }
  return toISODateLocal(end);
}

const PLATFORM_METRICS: Record<string, DefaultMetricDef[]> = {
  google: COMMON_METRICS,
  amazon: COMMON_METRICS,
  tiktok: COMMON_METRICS,
  meta: [
    { metric_name: "Clicks", key: "clicks" },
    { metric_name: "Impressions", key: "impressions" },
    { metric_name: "Spend", key: "spend" },
    { metric_name: "Reach", key: "reach" },
    { metric_name: "CTR", key: "ctr" },
    { metric_name: "CPC", key: "cpc" },
    { metric_name: "CPM", key: "cpm" },
    { metric_name: "Conversions", key: "conversions" },
    { metric_name: "Revenue", key: "revenue" },
    { metric_name: "ROAS", key: "roas" },
  ],
};

const WEEKDAY_KEYS: Set<string> = new Set(DAY_KEYS.slice(0, 5) as unknown as string[]);

function isDefaultWeekdaySchedule(
  preset: "weekdays" | "weekends" | "all" | "custom" | null,
  days: string[],
): boolean {
  if (preset !== "weekdays") return false;
  if (days.length !== 5) return false;
  return (
    DAY_KEYS.slice(0, 5).every((d) => days.includes(d)) &&
    !days.some((d) => !WEEKDAY_KEYS.has(d))
  );
}

function formatDayReviewLabel(d: string): string {
  const map: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };
  return map[d.toLowerCase()] ?? d;
}

function genderLabels(values: string[]): string {
  return values
    .map((v) => GENDER_OPTIONS.find((g) => g.value === v)?.label ?? v)
    .join(", ");
}

function formatL30D(value: number | undefined | null, key: string): string {
  if (value === undefined || value === null) return "--";
  if (value === 0) return "0";
  if (["spend", "revenue", "cpc", "cpm", "cpa"].includes(key)) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (["ctr"].includes(key)) {
    return `${value.toFixed(2)}%`;
  }
  if (["roas"].includes(key)) {
    return `${value.toFixed(2)}x`;
  }
  return value.toLocaleString();
}

export const CreatePortfolioWizard: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  channelId,
  profileId,
  platform,
  preSelectedCampaigns = [],
  editPortfolio,
}) => {
  const navigate = useNavigate();
  const isEditMode = !!editPortfolio;
  const [createdPortfolio, setCreatedPortfolio] = useState<Portfolio | null>(null);
  const editCampaigns: Campaign[] = useMemo(
    () =>
      editPortfolio?.campaigns?.map((c) => ({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        campaignType: c.campaignType,
        campaignStatus: c.campaignStatus,
      })) ?? [],
    [editPortfolio],
  );

  const initialCampaigns = isEditMode ? editCampaigns : preSelectedCampaigns;

  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [campaignSearch, setCampaignSearch] = useState("");

  const [name, setName] = useState(editPortfolio?.name ?? "");
  const [totalBudget, setTotalBudget] = useState(
    editPortfolio?.totalBudget != null ? String(editPortfolio.totalBudget) : "",
  );
  const [budgetFrequency, setBudgetFrequency] = useState(
    (editPortfolio?.budgetFrequency as string) || "monthly",
  );
  const [autoPeriodEnd, setAutoPeriodEnd] = useState(true);
  const [startDate, setStartDate] = useState(editPortfolio?.startDate ?? "");
  const [endDate, setEndDate] = useState(editPortfolio?.endDate ?? "");

  const editMetricType = editPortfolio?.metricType ?? "default";
  const [metricType, setMetricType] = useState<"default" | "conversion">(editMetricType);
  const [metricSearch, setMetricSearch] = useState("");
  const [selectedDefaultMetric, setSelectedDefaultMetric] = useState(
    editMetricType === "default" && editPortfolio?.metrics?.length
      ? editPortfolio.metrics[0].metricName
      : "Clicks",
  );
  const [selectedConversionMetrics, setSelectedConversionMetrics] = useState<string[]>(
    editMetricType === "conversion" && editPortfolio?.metrics
      ? editPortfolio.metrics.map((m) => m.metricName)
      : [],
  );

  const [targetType, setTargetType] = useState(editPortfolio?.targetType ?? "");
  const [targetValue, setTargetValue] = useState(
    editPortfolio?.targetValue != null ? String(editPortfolio.targetValue) : "",
  );

  const [parsedTags, setParsedTags] = useState<string[]>(editPortfolio?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [grOpen, setGrOpen] = useState<Record<string, boolean>>({
    budget: false,
    change: false,
    demo: false,
    ad: false,
    aud: false,
    sched: false,
  });
  const [grBudgetMin, setGrBudgetMin] = useState("");
  const [grBudgetMax, setGrBudgetMax] = useState("");
  const [grMaxChange, setGrMaxChange] = useState("");
  const [grGeos, setGrGeos] = useState<string[]>([]);
  const [grGeoInput, setGrGeoInput] = useState("");
  const [grGenders, setGrGenders] = useState<string[]>([]);
  const [grAgeRanges, setGrAgeRanges] = useState<string[]>([]);
  const [grAdRules, setGrAdRules] = useState("");
  const [grAudInclude, setGrAudInclude] = useState<string[]>([]);
  const [grAudExclude, setGrAudExclude] = useState<string[]>([]);
  const [grAudIncInput, setGrAudIncInput] = useState("");
  const [grAudExcInput, setGrAudExcInput] = useState("");
  const [grSchedulePreset, setGrSchedulePreset] = useState<
    "weekdays" | "weekends" | "all" | "custom" | null
  >(null);
  const [grScheduleDays, setGrScheduleDays] = useState<string[]>([]);

  const [portfolioInstructions, setPortfolioInstructions] = useState(
    editPortfolio?.portfolioInstructions ?? "",
  );

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // L30D metrics preview
  const [l30dData, setL30dData] = useState<MetricsPreviewResponse | null>(null);
  const [l30dLoading, setL30dLoading] = useState(false);

  // Conversion actions from API
  const [conversionActions, setConversionActions] = useState<GoogleConversionAction[]>([]);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionFetched, setConversionFetched] = useState(false);

  const createMutation = useCreatePortfolio(accountId);
  const updateMutation = useUpdatePortfolio(accountId, editPortfolio?.id ?? 0);

  const campaignFingerprint = useMemo(
    () => campaigns.map((c) => c.campaignId).sort().join(","),
    [campaigns],
  );

  useEffect(() => {
    setL30dData(null);
  }, [campaignFingerprint]);

  useEffect(() => {
    if (!autoPeriodEnd || !startDate) return;
    setEndDate(computeDefaultPeriodEnd(startDate, budgetFrequency));
  }, [autoPeriodEnd, startDate, budgetFrequency]);

  useEffect(() => {
    if (!isOpen || !editPortfolio?.guardrails || typeof editPortfolio.guardrails !== "object") {
      return;
    }
    const g = editPortfolio.guardrails as Record<string, unknown>;
    const b = g.budget as Record<string, unknown> | undefined;
    if (b?.minSpend != null) setGrBudgetMin(String(b.minSpend));
    if (b?.maxSpend != null) setGrBudgetMax(String(b.maxSpend));
    const ch = g.changePercentage as Record<string, unknown> | undefined;
    if (ch?.maxChange != null) setGrMaxChange(String(ch.maxChange));
    const tgt = g.targeting as Record<string, unknown> | undefined;
    const demo = tgt?.demographics as Record<string, unknown> | undefined;
    if (Array.isArray(demo?.geo)) setGrGeos((demo.geo as unknown[]).map(String));
    if (Array.isArray(demo?.gender)) setGrGenders((demo.gender as unknown[]).map(String));
    if (Array.isArray(demo?.ageRanges)) setGrAgeRanges((demo.ageRanges as unknown[]).map(String));
    if (typeof g.adRules === "string") setGrAdRules(g.adRules);
    const ar = g.audienceRules as Record<string, unknown> | undefined;
    if (Array.isArray(ar?.include)) setGrAudInclude((ar.include as unknown[]).map(String));
    if (Array.isArray(ar?.exclude)) setGrAudExclude((ar.exclude as unknown[]).map(String));
    const sch = g.schedule as Record<string, unknown> | undefined;
    if (typeof sch?.preset === "string") {
      const p = sch.preset as string;
      if (p === "weekdays" || p === "weekends" || p === "all" || p === "custom") {
        setGrSchedulePreset(p);
      }
    }
    if (Array.isArray(sch?.days)) {
      setGrScheduleDays((sch.days as unknown[]).map((d) => String(d).toLowerCase()));
    }
  }, [isOpen, editPortfolio?.id, editPortfolio?.guardrails]);

  // Fetch L30D metrics when entering Step 2
  const fetchL30d = useCallback(async () => {
    if (!profileId || campaigns.length === 0) return;
    setL30dLoading(true);
    try {
      const data = await portfoliosService.getMetricsPreview(accountId, {
        platform,
        profileId,
        campaignIds: campaigns.map((c) => c.campaignId),
      });
      setL30dData(data);
    } catch {
      setL30dData(null);
    } finally {
      setL30dLoading(false);
    }
  }, [accountId, platform, profileId, campaigns]);

  useEffect(() => {
    if (step === 2 && !l30dData && !l30dLoading) {
      fetchL30d();
    }
  }, [step, l30dData, l30dLoading, fetchL30d]);

  // Fetch conversion actions when user switches to "Conversion Metrics"
  const fetchConversionActions = useCallback(async () => {
    if (!profileId || conversionFetched) return;
    if (platform !== "google") return;
    setConversionLoading(true);
    try {
      const resp = await googleAdwordsConversionActionsService.listConversionActions(
        accountId,
        channelId,
        profileId,
      );
      setConversionActions(resp.conversion_actions || []);
    } catch {
      setConversionActions([]);
    } finally {
      setConversionLoading(false);
      setConversionFetched(true);
    }
  }, [accountId, channelId, profileId, platform, conversionFetched]);

  useEffect(() => {
    if (metricType === "conversion" && !conversionFetched && !conversionLoading) {
      fetchConversionActions();
    }
  }, [metricType, conversionFetched, conversionLoading, fetchConversionActions]);

  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns;
    const q = campaignSearch.toLowerCase();
    return campaigns.filter((c) => c.campaignName.toLowerCase().includes(q));
  }, [campaigns, campaignSearch]);

  const platformMetrics = PLATFORM_METRICS[platform] || COMMON_METRICS;

  const filteredDefaultMetrics = useMemo(() => {
    if (!metricSearch.trim()) return platformMetrics;
    const q = metricSearch.toLowerCase();
    return platformMetrics.filter((m) => m.metric_name.toLowerCase().includes(q));
  }, [metricSearch, platformMetrics]);

  const filteredConversionActions = useMemo(() => {
    if (!metricSearch.trim()) return conversionActions;
    const q = metricSearch.toLowerCase();
    return conversionActions.filter((a) => a.name.toLowerCase().includes(q));
  }, [conversionActions, metricSearch]);

  const removeCampaign = (campaignId: string) => {
    setCampaigns((prev) => prev.filter((c) => c.campaignId !== campaignId));
  };

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !parsedTags.includes(val)) {
      setParsedTags((prev) => [...prev, val]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setParsedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Backspace" && tagInput === "" && parsedTags.length > 0) {
      setParsedTags((prev) => prev.slice(0, -1));
    }
  };

  const toggleConversionMetric = (metricName: string) => {
    setSelectedConversionMetrics((prev) =>
      prev.includes(metricName)
        ? prev.filter((m) => m !== metricName)
        : [...prev, metricName],
    );
  };

  const handleSelectAllConversion = () => {
    if (selectedConversionMetrics.length === conversionActions.length) {
      setSelectedConversionMetrics([]);
    } else {
      setSelectedConversionMetrics(conversionActions.map((a) => a.name));
    }
  };

  const handleClearMetrics = () => {
    if (metricType === "default") {
      setSelectedDefaultMetric("");
    } else {
      setSelectedConversionMetrics([]);
    }
  };

  const canProceedStep1 = campaigns.length > 0;
  const canProceedStep2 =
    name.trim() !== "" &&
    totalBudget !== "" &&
    parseFloat(totalBudget) > 0 &&
    Boolean(budgetFrequency) &&
    Boolean(startDate) &&
    Boolean(endDate);

  const buildGuardrails = (): Record<string, unknown> | null => {
    const out: Record<string, unknown> = {};
    const minV = grBudgetMin.trim() ? parseFloat(grBudgetMin) : NaN;
    const maxV = grBudgetMax.trim() ? parseFloat(grBudgetMax) : NaN;
    if (!Number.isNaN(minV) || !Number.isNaN(maxV)) {
      const b: Record<string, number> = {};
      if (!Number.isNaN(minV)) b.minSpend = minV;
      if (!Number.isNaN(maxV)) b.maxSpend = maxV;
      if (Object.keys(b).length) out.budget = b;
    }
    const mc = grMaxChange.trim() ? parseFloat(grMaxChange) : NaN;
    if (!Number.isNaN(mc)) out.changePercentage = { maxChange: mc };
    if (grGeos.length || grGenders.length || grAgeRanges.length) {
      out.targeting = {
        demographics: {
          ...(grGeos.length ? { geo: grGeos } : {}),
          ...(grGenders.length ? { gender: grGenders } : {}),
          ...(grAgeRanges.length ? { ageRanges: grAgeRanges } : {}),
        },
      };
    }
    if (grAdRules.trim()) out.adRules = grAdRules.trim();
    if (grAudInclude.length || grAudExclude.length) {
      out.audienceRules = {
        ...(grAudInclude.length ? { include: grAudInclude } : {}),
        ...(grAudExclude.length ? { exclude: grAudExclude } : {}),
      };
    }
    if (grSchedulePreset && grScheduleDays.length) {
      out.schedule = { preset: grSchedulePreset, days: grScheduleDays };
    }
    return Object.keys(out).length ? out : null;
  };

  const guardrailsReviewSections = useMemo(() => {
    const hasBudget = Boolean(grBudgetMin.trim() || grBudgetMax.trim());
    const hasChange = Boolean(grMaxChange.trim());
    const hasDemo = grGeos.length > 0 || grGenders.length > 0 || grAgeRanges.length > 0;
    const hasAd = Boolean(grAdRules.trim());
    const hasAud = grAudInclude.length > 0 || grAudExclude.length > 0;
    const scheduleCustomized = !isDefaultWeekdaySchedule(grSchedulePreset, grScheduleDays);

    const fmtMoney = (raw: string) => {
      const n = parseFloat(raw);
      if (Number.isNaN(n)) return raw;
      return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const presetLabel =
      grSchedulePreset === "weekdays"
        ? "Weekdays"
        : grSchedulePreset === "weekends"
          ? "Weekends"
          : grSchedulePreset === "all"
            ? "All days"
            : grSchedulePreset === "custom"
              ? "Custom"
              : "Not set";

    const sortedDays = [...grScheduleDays].sort(
      (a, b) =>
        DAY_KEYS.indexOf(a as (typeof DAY_KEYS)[number]) -
        DAY_KEYS.indexOf(b as (typeof DAY_KEYS)[number]),
    );

    type SectionVariant = "set" | "default" | "empty";

    type Section = {
      id: string;
      title: string;
      variant: SectionVariant;
      body: React.ReactNode;
    };

    const schedVariant: SectionVariant =
      sortedDays.length === 0 ? "empty" : scheduleCustomized ? "set" : "default";

    const sections: Section[] = [
      {
        id: "budget",
        title: "Budget constraints",
        variant: hasBudget ? "set" : "empty",
        body: hasBudget ? (
          <ul className="space-y-1.5 list-none m-0 p-0">
            {grBudgetMin.trim() ? (
              <li>
                <span className="text-forest-f30">Min spend: </span>
                <span className="font-medium tabular-nums text-forest-f60">{fmtMoney(grBudgetMin)}</span>
              </li>
            ) : null}
            {grBudgetMax.trim() ? (
              <li>
                <span className="text-forest-f30">Max spend: </span>
                <span className="font-medium tabular-nums text-forest-f60">{fmtMoney(grBudgetMax)}</span>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-forest-f30 m-0">No min or max spend limits.</p>
        ),
      },
      {
        id: "change",
        title: "Change percentage cap",
        variant: hasChange ? "set" : "empty",
        body: hasChange ? (
          <p className="m-0">
            <span className="text-forest-f30">Max single change: </span>
            <span className="font-medium tabular-nums text-forest-f60">{grMaxChange.trim()}%</span>
          </p>
        ) : (
          <p className="text-forest-f30 m-0">No cap on how large a single bid or budget change can be.</p>
        ),
      },
      {
        id: "demo",
        title: "Demographics & geo",
        variant: hasDemo ? "set" : "empty",
        body: hasDemo ? (
          <ul className="space-y-1.5 list-none m-0 p-0">
            {grGeos.length > 0 ? (
              <li>
                <span className="text-forest-f30">Geo: </span>
                <span className="font-medium text-forest-f60">{grGeos.join(", ")}</span>
              </li>
            ) : null}
            {grGenders.length > 0 ? (
              <li>
                <span className="text-forest-f30">Gender: </span>
                <span className="font-medium text-forest-f60">{genderLabels(grGenders)}</span>
              </li>
            ) : null}
            {grAgeRanges.length > 0 ? (
              <li>
                <span className="text-forest-f30">Age ranges: </span>
                <span className="font-medium text-forest-f60">{grAgeRanges.join(", ")}</span>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-forest-f30 m-0">No geographic or demographic boundaries.</p>
        ),
      },
      {
        id: "ad",
        title: "Ad rules",
        variant: hasAd ? "set" : "empty",
        body: hasAd ? (
          <p className="m-0 whitespace-pre-wrap text-forest-f60 leading-relaxed">{grAdRules.trim()}</p>
        ) : (
          <p className="text-forest-f30 m-0">No extra instructions for ad copy or campaign structure.</p>
        ),
      },
      {
        id: "aud",
        title: "Audience rules",
        variant: hasAud ? "set" : "empty",
        body: hasAud ? (
          <div className="space-y-2">
            {grAudInclude.length > 0 ? (
              <div>
                <p className="text-[11px] text-forest-f30 m-0 mb-1">Include</p>
                <div className="flex flex-wrap gap-1">
                  {grAudInclude.map((t) => (
                    <Chip key={t} variant="default">
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            {grAudExclude.length > 0 ? (
              <div>
                <p className="text-[11px] text-forest-f30 m-0 mb-1">Exclude</p>
                <div className="flex flex-wrap gap-1">
                  {grAudExclude.map((t) => (
                    <Chip key={t} variant="outline">
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-forest-f30 m-0">No audience include or exclude lists.</p>
        ),
      },
      {
        id: "sched",
        title: "Preferred schedule",
        variant: schedVariant,
        body:
          sortedDays.length > 0 ? (
            <div className="space-y-2">
              <p className="m-0">
                <span className="text-forest-f30">Preset: </span>
                <span className="font-medium text-forest-f60">{presetLabel}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sortedDays.map((d) => (
                  <span
                    key={d}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] border font-medium",
                      scheduleCustomized
                        ? "border-forest-f40 bg-forest-f0 text-forest-f60"
                        : "border-forest-f40/30 bg-forest-f0/40 text-forest-f60",
                    )}
                  >
                    {formatDayReviewLabel(d)}
                  </span>
                ))}
              </div>
              {schedVariant === "default" ? (
                <p className="text-[11px] text-forest-f30 m-0">
                  Using the default weekday pattern. Adjust in Portfolio Settings if you need weekends or custom
                  days.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-forest-f30 m-0">No schedule set — choose a preset or toggle individual days in Portfolio Settings.</p>
          ),
      },
    ];

    return sections;
  }, [
    grBudgetMin,
    grBudgetMax,
    grMaxChange,
    grGeos,
    grGenders,
    grAgeRanges,
    grAdRules,
    grAudInclude,
    grAudExclude,
    grSchedulePreset,
    grScheduleDays,
  ]);

  const applySchedulePreset = (p: "weekdays" | "weekends" | "all") => {
    setGrSchedulePreset(p);
    if (p === "weekdays") {
      setGrScheduleDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    } else if (p === "weekends") {
      setGrScheduleDays(["saturday", "sunday"]);
    } else if (p === "all") {
      setGrScheduleDays([...DAY_KEYS]);
    }
  };

  const toggleScheduleDay = (d: string) => {
    setGrSchedulePreset("custom");
    setGrScheduleDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const addGeoChip = () => {
    const v = grGeoInput.trim().toUpperCase();
    if (v && !grGeos.includes(v)) setGrGeos((p) => [...p, v]);
    setGrGeoInput("");
  };

  const selectedMetricNames = metricType === "default"
    ? (selectedDefaultMetric ? [selectedDefaultMetric] : [])
    : selectedConversionMetrics;

  const handleSubmit = async () => {
    setError("");
    if (!startDate || !endDate) {
      setError("Period start and end dates are required.");
      return;
    }
    const gPayload = buildGuardrails();
    const campaignsPayload = campaigns.map((c) => ({
      campaign_id: c.campaignId,
      campaign_name: c.campaignName,
      campaign_type: c.campaignType || "",
      campaign_status: c.campaignStatus || "",
    }));
    const metricsPayload = selectedMetricNames.map((m) => ({
      metric_name: m,
      metric_type: metricType,
      is_recommended: metricType === "default" && ["Clicks", "Impressions", "Spend"].includes(m),
    }));

    try {
      if (isEditMode) {
        const payload: UpdatePortfolioPayload = {
          name: name.trim(),
          totalBudget: parseFloat(totalBudget),
          startDate: startDate || null,
          endDate: endDate || null,
          budgetFrequency,
          metricType,
          targetType: targetType || null,
          targetValue: targetValue ? parseFloat(targetValue) : null,
          tags: parsedTags,
          guardrails: gPayload,
          portfolioInstructions,
          campaigns: campaignsPayload,
          metrics: metricsPayload,
        };
        await updateMutation.mutateAsync(payload);
        setSuccessMessage(`Portfolio "${name.trim()}" updated successfully!`);
      } else {
        const payload: CreatePortfolioPayload = {
          name: name.trim(),
          platform,
          channelId,
          profileId: profileId ?? undefined,
          totalBudget: parseFloat(totalBudget),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          budgetFrequency,
          metricType,
          targetType: targetType || undefined,
          targetValue: targetValue ? parseFloat(targetValue) : undefined,
          tags: parsedTags,
          guardrails: gPayload,
          portfolioInstructions: portfolioInstructions || undefined,
          campaigns: campaignsPayload,
          metrics: metricsPayload,
        };
        const created = await createMutation.mutateAsync(payload);
        setCreatedPortfolio(created);
        setSuccessMessage(`Portfolio "${name.trim()}" created successfully!`);
      }
      onSuccess?.();
      if (isEditMode) {
        setTimeout(() => {
          setSuccessMessage("");
          handleClose();
        }, 1500);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to ${isEditMode ? "update" : "create"} portfolio`;
      setError(msg);
    }
  };

  const handleClose = () => {
    if (!isEditMode) {
      setStep(1);
      setName("");
      setTotalBudget("");
      setStartDate("");
      setEndDate("");
      setMetricType("default");
      setMetricSearch("");
      setSelectedDefaultMetric("Clicks");
      setSelectedConversionMetrics([]);
      setTargetType("");
      setTargetValue("");
      setParsedTags([]);
      setTagInput("");
      setBudgetFrequency("monthly");
      setAutoPeriodEnd(true);
      setGrBudgetMin("");
      setGrBudgetMax("");
      setGrMaxChange("");
      setGrGeos([]);
      setGrGeoInput("");
      setGrGenders([]);
      setGrAgeRanges([]);
      setGrAdRules("");
      setGrAudInclude([]);
      setGrAudExclude([]);
      setGrAudIncInput("");
      setGrAudExcInput("");
      setGrSchedulePreset(null);
      setGrScheduleDays([]);
      setGrOpen({ budget: false, change: false, demo: false, ad: false, aud: false, sched: false });
      setL30dData(null);
      setConversionActions([]);
      setConversionFetched(false);
      setCreatedPortfolio(null);
    }
    setError("");
    setSuccessMessage("");
    onClose();
  };

  const STEPS = isEditMode ? EDIT_STEPS : CREATE_STEPS;
  const targetLabel = TARGET_TYPES.find((t) => t.value === targetType)?.fullLabel ?? "Target";

  // Find the "recommended" conversion action (highest primary_for_goal or first)
  const recommendedConversionName = useMemo(() => {
    const primary = conversionActions.find((a) => a.primary_for_goal);
    return primary?.name || conversionActions[0]?.name || null;
  }, [conversionActions]);

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="4xl" padding="p-0">
      <div className="flex flex-col" style={{ minHeight: "600px" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
          <h2 className="text-[18px] font-medium text-forest-f60">
            {isEditMode ? "Edit Portfolio" : "Create Portfolio"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-sandstorm-s10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-forest-f30" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-sandstorm-s40 bg-sandstorm-s0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium",
                    step === s.id
                      ? "bg-forest-f40 text-white"
                      : step > s.id
                        ? "bg-forest-f40/20 text-forest-f40"
                        : "bg-sandstorm-s20 text-forest-f30",
                  )}
                >
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-[13px]",
                    step === s.id ? "text-forest-f60 font-medium" : "text-forest-f30",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-forest-f30 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Success overlay */}
          {successMessage && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-full bg-forest-f0 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-forest-f40" />
              </div>
              <p className="text-[16px] font-medium text-forest-f60">{successMessage}</p>
              {createdPortfolio ? (
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    className="text-[13px] inline-flex items-center gap-1.5 bg-forest-f40 text-white hover:bg-forest-f50 border-0"
                    onClick={() => {
                      handleClose();
                      navigate(`/brands/${createdPortfolio.accountId}/portfolios/${createdPortfolio.id}`);
                    }}
                  >
                    Go to Portfolio
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[13px]"
                    onClick={handleClose}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <p className="text-[13px] text-forest-f30">Redirecting...</p>
              )}
            </div>
          )}

          {/* ── Step 1: Select Campaigns ── */}
          {!successMessage && step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-[14px] text-forest-f60 font-medium mb-1">
                  Selected Campaigns ({campaigns.length})
                </p>
                <p className="text-[13px] text-forest-f30 mb-3">
                  These campaigns were selected from the campaign listing.
                  You can remove any before continuing.
                </p>
              </div>

              {campaigns.length > 5 && (
                <div className="search-input-container h-[36px] w-full flex items-center gap-2 px-[10px]">
                  <Search className="w-4 h-4 text-forest-f30 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    className="bg-transparent border-none outline-none text-[13px] text-forest-f60 w-full"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                  />
                </div>
              )}

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[14px] text-forest-f30">
                    No campaigns selected. Please go back to the campaign page and select campaigns first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {filteredCampaigns.map((c) => (
                    <div
                      key={c.campaignId}
                      className="flex items-center justify-between px-3 py-2.5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-forest-f60 truncate">
                          {c.campaignName}
                        </p>
                        <p className="text-[11px] text-forest-f30">
                          {c.campaignType} &middot; {c.campaignStatus}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCampaign(c.campaignId)}
                        className="ml-2 p-1 rounded hover:bg-sandstorm-s20 transition-colors"
                        aria-label={`Remove ${c.campaignName}`}
                      >
                        <X className="w-4 h-4 text-forest-f30" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Portfolio Settings ── */}
          {!successMessage && step === 2 && (
            <div className="space-y-6">
              {/* Portfolio Name + budget frequency + amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Portfolio Name *</label>
                    <input
                      type="text"
                      className="campaign-input w-full"
                      placeholder="e.g. Q4 Performance Campaign Group"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Budget Frequency *</label>
                    <select
                      className="campaign-input w-full"
                      value={budgetFrequency}
                      onChange={(e) => setBudgetFrequency(e.target.value)}
                    >
                      {BUDGET_FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Budget per Period *</label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-[14px] top-1/2 z-10 -translate-y-1/2 text-[12px] text-forest-f30"
                      aria-hidden
                    >
                      $
                    </span>
                    <input
                      type="number"
                      className={cn("campaign-input w-full !pl-[2.5rem]")}
                      placeholder="10000"
                      min={0}
                      step="0.01"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Period Start *</label>
                  <input
                    type="date"
                    className="campaign-input w-full"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Period End *</label>
                  <input
                    type="date"
                    className="campaign-input w-full"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={autoPeriodEnd}
                    required
                  />
                  <div className="mt-2">
                    <Checkbox
                      checked={autoPeriodEnd}
                      onChange={(c) => setAutoPeriodEnd(c)}
                      label="Auto-calculate period end from frequency"
                    />
                  </div>
                </div>
              </div>

              {/* Track Performance By */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="form-label !mb-0">Track Performance By</label>
                  <button
                    type="button"
                    onClick={handleClearMetrics}
                    className="text-[13px] font-semibold text-forest-f60 hover:text-forest-f40 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-5 mb-3">
                  <Radio
                    name="metricType"
                    value="default"
                    checked={metricType === "default"}
                    onChange={() => { setMetricType("default"); setMetricSearch(""); }}
                    label="Default Metrics"
                  />
                  <Radio
                    name="metricType"
                    value="conversion"
                    checked={metricType === "conversion"}
                    onChange={() => { setMetricType("conversion"); setMetricSearch(""); }}
                    label="Conversion Metrics"
                  />
                </div>

                {/* Metrics searchable list */}
                <div className="border border-sandstorm-s40 rounded-lg bg-sandstorm-s0 overflow-hidden">
                  <div className="search-input-container !rounded-none !border-x-0 !border-t-0 h-[40px] flex items-center gap-2 px-3">
                    <Search className="w-4 h-4 text-forest-f30 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search metrics..."
                      className="bg-transparent border-none outline-none text-[12px] text-forest-f60 w-full"
                      value={metricSearch}
                      onChange={(e) => setMetricSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[220px] overflow-y-auto">
                    {/* Default Metrics */}
                    {metricType === "default" && (
                      <>
                        {l30dLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size="sm" />
                            <span className="ml-2 text-[12px] text-forest-f30">Loading metrics...</span>
                          </div>
                        ) : (
                          filteredDefaultMetrics.map((m) => (
                            <div
                              key={m.metric_name}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 border-b border-sandstorm-s40 last:border-b-0 hover:bg-sandstorm-s5 transition-colors cursor-pointer",
                                selectedDefaultMetric === m.metric_name && "bg-sandstorm-s5",
                              )}
                              onClick={() => setSelectedDefaultMetric(m.metric_name)}
                            >
                              <Radio
                                name="defaultMetric"
                                value={m.metric_name}
                                checked={selectedDefaultMetric === m.metric_name}
                                onChange={() => setSelectedDefaultMetric(m.metric_name)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-forest-f60">{m.metric_name}</p>
                                <p className="text-[11px] text-forest-f30">
                                  L30D: {l30dData ? formatL30D(l30dData[m.key], m.key) : "--"}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        {!l30dLoading && filteredDefaultMetrics.length === 0 && (
                          <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                            No metrics found
                          </div>
                        )}
                      </>
                    )}

                    {/* Conversion Metrics */}
                    {metricType === "conversion" && (
                      <>
                        {conversionLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size="sm" />
                            <span className="ml-2 text-[12px] text-forest-f30">Loading conversion actions...</span>
                          </div>
                        ) : platform !== "google" ? (
                          <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                            Conversion metrics are available for Google accounts. Support for {platform} coming soon.
                          </div>
                        ) : conversionActions.length === 0 ? (
                          <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                            No conversion actions found for this account.
                          </div>
                        ) : (
                          <>
                            {!metricSearch.trim() && (
                              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-sandstorm-s40">
                                <Checkbox
                                  checked={selectedConversionMetrics.length === conversionActions.length && conversionActions.length > 0}
                                  indeterminate={selectedConversionMetrics.length > 0 && selectedConversionMetrics.length < conversionActions.length}
                                  onChange={handleSelectAllConversion}
                                />
                                <span className="text-[13px] font-medium text-forest-f40">
                                  Select All ({conversionActions.length})
                                </span>
                              </div>
                            )}

                            <div className="px-4 pt-2 pb-1">
                              <span className="text-[11px] font-semibold text-forest-f40 uppercase tracking-wide">
                                All Metrics
                              </span>
                            </div>

                            {filteredConversionActions.map((action) => (
                              <div
                                key={action.id}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 border-b border-sandstorm-s40 last:border-b-0 hover:bg-sandstorm-s5 transition-colors cursor-pointer",
                                  selectedConversionMetrics.includes(action.name) && "bg-sandstorm-s5",
                                )}
                                onClick={() => toggleConversionMetric(action.name)}
                              >
                                <Checkbox
                                  checked={selectedConversionMetrics.includes(action.name)}
                                  onChange={() => toggleConversionMetric(action.name)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-medium text-forest-f60">{action.name}</p>
                                    {recommendedConversionName === action.name && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-f40">
                                        (<Star className="w-3 h-3 fill-forest-f40" /> Recommended)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-forest-f30">
                                    {action.category ? action.category.replace(/_/g, " ").toLowerCase() : "conversion"}
                                    {action.status ? ` \u00B7 ${action.status.toLowerCase()}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}

                            {filteredConversionActions.length === 0 && (
                              <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                                No conversion actions match your search
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Type + Target Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Target Type</label>
                  <div className="flex items-center gap-4 mt-1">
                    {TARGET_TYPES.map((t) => (
                      <Radio
                        key={t.value}
                        name="targetType"
                        value={t.value}
                        checked={targetType === t.value}
                        onChange={() => setTargetType(t.value)}
                        label={t.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">{targetLabel}</label>
                  <input
                    type="number"
                    className="campaign-input w-full"
                    placeholder={targetLabel}
                    min={0}
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="form-label">Tags</label>
                <div
                  className="flex flex-wrap items-center gap-2 min-h-[40px] px-3 py-2 bg-[#FEFEFB] border border-[#e5e7eb] rounded-lg transition-all focus-within:border-[#136D6D] focus-within:shadow-[0_0_0_1px_rgba(19,109,109,0.1)]"
                >
                  {parsedTags.map((tag) => (
                    <Chip key={tag} variant="default" onClose={() => handleRemoveTag(tag)}>
                      {tag}
                    </Chip>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[12px] text-forest-f60 placeholder:text-sandstorm-s40"
                    placeholder={parsedTags.length === 0 ? "Type and press Enter to add tags..." : "Add more..."}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={handleAddTag}
                  />
                </div>
              </div>

              {/* Guardrails */}
              <div className="space-y-3">
                <p className="text-[14px] text-forest-f60 font-medium">Guardrails</p>
                <p className="text-[12px] text-forest-f30 -mt-1 leading-relaxed">
                  Optional constraints the assistant respects when optimizing this portfolio. Open a section
                  below for short guidance on how to fill each field.
                </p>

                {(
                  [
                    { id: "budget", title: "Budget constraints" },
                    { id: "change", title: "Change percentage cap" },
                    { id: "demo", title: "Demographics" },
                    { id: "ad", title: "Ad rules" },
                    { id: "aud", title: "Audience rules" },
                    { id: "sched", title: "Preferred schedule" },
                  ] as const
                ).map((sec) => (
                  <div
                    key={sec.id}
                    className="border border-sandstorm-s40 rounded-lg bg-sandstorm-s0 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
                      onClick={() =>
                        setGrOpen((o) => ({ ...o, [sec.id]: !o[sec.id] }))
                      }
                      aria-expanded={grOpen[sec.id]}
                    >
                      {sec.title}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-forest-f30 shrink-0 transition-transform",
                          grOpen[sec.id] && "rotate-180",
                        )}
                      />
                    </button>
                    {grOpen[sec.id] && (
                      <div className="px-4 pb-4 pt-0 border-t border-sandstorm-s40 space-y-3">
                        {sec.id === "budget" && (
                          <div className="grid grid-cols-2 gap-3 pt-3">
                            <p className="col-span-2 text-[11px] text-forest-f30 leading-relaxed">
                              Set optional spend floors and ceilings (in account currency) so recommendations stay
                              within your allowed range.
                            </p>
                            <div>
                              <label className="form-label">Min spend ($)</label>
                              <input
                                type="number"
                                className="campaign-input w-full"
                                min={0}
                                step="0.01"
                                value={grBudgetMin}
                                onChange={(e) => setGrBudgetMin(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="form-label">Max spend ($)</label>
                              <input
                                type="number"
                                className="campaign-input w-full"
                                min={0}
                                step="0.01"
                                value={grBudgetMax}
                                onChange={(e) => setGrBudgetMax(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        {sec.id === "change" && (
                          <div className="pt-3 space-y-2">
                            <p className="text-[11px] text-forest-f30 leading-relaxed">
                              Upper bound on how large a single bid or budget change can be (e.g. 20 means do not
                              suggest jumps greater than 20% at once).
                            </p>
                            <label className="form-label">Max change (%)</label>
                            <input
                              type="number"
                              className="campaign-input w-full max-w-xs"
                              min={0}
                              max={100}
                              step="0.5"
                              value={grMaxChange}
                              onChange={(e) => setGrMaxChange(e.target.value)}
                            />
                          </div>
                        )}
                        {sec.id === "demo" && (
                          <div className="space-y-3 pt-3">
                            <p className="text-[11px] text-forest-f30 leading-relaxed">
                              Restrict targeting context: add geo codes (e.g. US, CA), pick genders and age bands.
                              The assistant treats these as boundaries for suggestions.
                            </p>
                            <div>
                              <label className="form-label">Geo (regions)</label>
                              <div className="flex flex-wrap gap-2 min-h-[40px] px-3 py-2 bg-sandstorm-s5 border border-sandstorm-s40 rounded-lg">
                                {grGeos.map((g) => (
                                  <Chip key={g} variant="default" onClose={() => setGrGeos((p) => p.filter((x) => x !== g))}>
                                    {g}
                                  </Chip>
                                ))}
                                <input
                                  type="text"
                                  className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-[12px] text-forest-f60"
                                  placeholder="e.g. US — Enter"
                                  value={grGeoInput}
                                  onChange={(e) => setGrGeoInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addGeoChip();
                                    }
                                  }}
                                  onBlur={addGeoChip}
                                />
                              </div>
                            </div>
                            <div>
                              <p className="form-label">Gender</p>
                              <div className="flex flex-wrap gap-3 mt-1">
                                {GENDER_OPTIONS.map((g) => (
                                  <Checkbox
                                    key={g.value}
                                    checked={grGenders.includes(g.value)}
                                    onChange={(c) =>
                                      setGrGenders((prev) =>
                                        c ? [...prev, g.value] : prev.filter((x) => x !== g.value),
                                      )
                                    }
                                    label={g.label}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="form-label">Age ranges</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {AGE_RANGE_OPTIONS.map((a) => (
                                  <button
                                    key={a}
                                    type="button"
                                    onClick={() =>
                                      setGrAgeRanges((prev) =>
                                        prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                                      )
                                    }
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-[12px] border transition-colors",
                                      grAgeRanges.includes(a)
                                        ? "border-forest-f40 bg-forest-f0 text-forest-f60"
                                        : "border-sandstorm-s40 text-forest-f30 hover:bg-sandstorm-s5",
                                    )}
                                  >
                                    {a}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {sec.id === "ad" && (
                          <div className="pt-3 space-y-2">
                            <label className="form-label">Instructions for the assistant</label>
                            <textarea
                              className="campaign-input w-full min-h-[100px] text-[13px]"
                              placeholder="e.g. Do not pause ads tied to the spring sale. Only optimize ads in the remarketing ad group."
                              value={grAdRules}
                              onChange={(e) => setGrAdRules(e.target.value)}
                            />
                          </div>
                        )}
                        {sec.id === "aud" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                            <p className="col-span-full text-[11px] text-forest-f30 leading-relaxed">
                              Use one chip per audience. Type the name as it appears in your ad account (or a label
                              you use internally), press Enter to add, and use the chip’s close control to remove.
                              Include lists audiences that should stay in scope; Exclude lists audiences the assistant
                              must not target or must not suggest undoing protections for.
                            </p>
                            <div>
                              <label className="form-label">Include</label>
                              <div className="flex flex-wrap gap-2 min-h-[40px] px-3 py-2 bg-sandstorm-s5 border border-sandstorm-s40 rounded-lg">
                                {grAudInclude.map((t) => (
                                  <Chip key={t} variant="default" onClose={() => setGrAudInclude((p) => p.filter((x) => x !== t))}>
                                    {t}
                                  </Chip>
                                ))}
                                <input
                                  type="text"
                                  className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-[12px]"
                                  placeholder="Type name, press Enter"
                                  value={grAudIncInput}
                                  onChange={(e) => setGrAudIncInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const v = grAudIncInput.trim();
                                      if (v && !grAudInclude.includes(v)) {
                                        setGrAudInclude((p) => [...p, v]);
                                        setGrAudIncInput("");
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="form-label">Exclude</label>
                              <div className="flex flex-wrap gap-2 min-h-[40px] px-3 py-2 bg-sandstorm-s5 border border-sandstorm-s40 rounded-lg">
                                {grAudExclude.map((t) => (
                                  <Chip key={t} variant="default" onClose={() => setGrAudExclude((p) => p.filter((x) => x !== t))}>
                                    {t}
                                  </Chip>
                                ))}
                                <input
                                  type="text"
                                  className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-[12px]"
                                  placeholder="Type name, press Enter"
                                  value={grAudExcInput}
                                  onChange={(e) => setGrAudExcInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const v = grAudExcInput.trim();
                                      if (v && !grAudExclude.includes(v)) {
                                        setGrAudExclude((p) => [...p, v]);
                                        setGrAudExcInput("");
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {sec.id === "sched" && (
                          <div className="space-y-3 pt-3">
                            <p className="text-[11px] text-forest-f30 leading-relaxed">
                              Pick which days optimization and recommendations should assume the portfolio is active.
                              This guides the assistant on pacing and “when to act”; it does not change platform ad
                              schedules by itself. Use a preset or toggle individual days—custom picks override the
                              preset until you choose another preset.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(
                                [
                                  { p: "weekdays" as const, label: "Weekdays" },
                                  { p: "weekends" as const, label: "Weekends" },
                                  { p: "all" as const, label: "All days" },
                                ]
                              ).map((x) => (
                                <button
                                  key={x.p}
                                  type="button"
                                  onClick={() => applySchedulePreset(x.p)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
                                    grSchedulePreset === x.p
                                      ? "border-forest-f40 bg-forest-f0 text-forest-f60"
                                      : "border-sandstorm-s40 text-forest-f30 hover:bg-sandstorm-s5",
                                  )}
                                >
                                  {x.label}
                                </button>
                              ))}
                            </div>
                            <p className="text-[11px] text-forest-f30">
                              Or refine by day (switches to custom when you toggle):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {DAY_KEYS.map((d) => {
                                const label = d.charAt(0).toUpperCase() + d.slice(1, 3);
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => toggleScheduleDay(d)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-[11px] border transition-colors capitalize",
                                      grScheduleDays.includes(d)
                                        ? "border-forest-f40 bg-forest-f0 text-forest-f60"
                                        : "border-sandstorm-s40 text-forest-f30",
                                    )}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Portfolio Instructions */}
              <div className="space-y-1.5">
                <label className="form-label">Portfolio Instructions</label>
                <p className="text-[12px] text-forest-f30 leading-relaxed">
                  Goals, context, and guidance for the AI agent during analysis and action creation
                </p>
                <textarea
                  value={portfolioInstructions}
                  onChange={(e) => setPortfolioInstructions(e.target.value)}
                  placeholder="e.g. Focus on reducing CPA below $50. Don't pause brand campaigns. Prioritize scaling top converters..."
                  rows={3}
                  className="w-full text-[13px] border border-sandstorm-s40 rounded-lg px-3 py-2.5 bg-sandstorm-s5 text-forest-f60 placeholder:text-forest-f20 focus:ring-1 focus:ring-forest-f40 focus:border-forest-f40 resize-y"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Create ── */}
          {!successMessage && step === 3 && (
            <div className="space-y-5">
              <h3 className="text-[15px] font-medium text-forest-f60">
                Review Portfolio
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
                <div>
                  <span className="text-forest-f30">Name</span>
                  <p className="text-forest-f60 font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-forest-f30">Platform</span>
                  <p className="text-forest-f60 font-medium capitalize">{platform}</p>
                </div>
                <div>
                  <span className="text-forest-f30">Budget per period</span>
                  <p className="text-forest-f60 font-medium">
                    ${parseFloat(totalBudget || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-forest-f30">Budget frequency</span>
                  <p className="text-forest-f60 font-medium capitalize">
                    {budgetFrequency.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-forest-f30">Campaigns</span>
                  <p className="text-forest-f60 font-medium">{campaigns.length}</p>
                </div>
                {startDate && (
                  <div>
                    <span className="text-forest-f30">Period start</span>
                    <p className="text-forest-f60 font-medium">{startDate}</p>
                  </div>
                )}
                {endDate && (
                  <div>
                    <span className="text-forest-f30">Period end</span>
                    <p className="text-forest-f60 font-medium">{endDate}</p>
                  </div>
                )}
                <div className="col-span-2 space-y-2 pt-1">
                  <div>
                    <span className="text-forest-f30">Guardrails</span>
                    <p className="text-[12px] text-forest-f30 mt-0.5 leading-snug max-w-2xl">
                      Everything the assistant will treat as a boundary for this portfolio.{" "}
                      <span className="text-forest-f60 font-medium">Set</span> means you entered a limit or rule;{" "}
                      <span className="text-forest-f60 font-medium">Default</span> is the standard schedule pattern;{" "}
                      <span className="text-forest-f60 font-medium">Not set</span> means nothing extra is saved for
                      that category.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {guardrailsReviewSections.map((sec) => {
                      const badge =
                        sec.variant === "set"
                          ? {
                              text: "Set",
                              pill:
                                "text-forest-f40 bg-forest-f0 border border-forest-f40/35",
                            }
                          : sec.variant === "default"
                            ? {
                                text: "Default",
                                pill:
                                  "text-forest-f50 bg-forest-f0/80 border border-forest-f40/25",
                              }
                            : {
                                text: "Not set",
                                pill: "text-forest-f30 bg-sandstorm-s10 border border-sandstorm-s40",
                              };
                      return (
                        <div
                          key={sec.id}
                          className={cn(
                            "rounded-lg border p-3.5 transition-colors",
                            sec.variant === "set" &&
                              "border-forest-f40/50 bg-forest-f0/45 shadow-[inset_0_0_0_1px_rgba(19,109,109,0.06)]",
                            sec.variant === "default" &&
                              "border-forest-f40/35 bg-forest-f0/25 shadow-[inset_0_0_0_1px_rgba(19,109,109,0.04)]",
                            sec.variant === "empty" && "border-sandstorm-s40 bg-sandstorm-s5/50",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {sec.variant === "set" ? (
                              <ShieldCheck
                                className="w-4 h-4 text-forest-f40 shrink-0 mt-0.5"
                                aria-hidden
                              />
                            ) : sec.variant === "default" ? (
                              <ShieldCheck
                                className="w-4 h-4 text-forest-f40/50 shrink-0 mt-0.5"
                                aria-hidden
                              />
                            ) : (
                              <span className="w-4 shrink-0" aria-hidden />
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-[12px] font-semibold m-0 flex flex-wrap items-center gap-2",
                                  sec.variant === "empty" ? "text-forest-f30" : "text-forest-f50",
                                )}
                              >
                                {sec.title}
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                                    badge.pill,
                                  )}
                                >
                                  {badge.text}
                                </span>
                              </p>
                              <div className="mt-2">{sec.body}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {targetType && (
                  <>
                    <div>
                      <span className="text-forest-f30">Target</span>
                      <p className="text-forest-f60 font-medium">{targetType}</p>
                    </div>
                    {targetValue && (
                      <div>
                        <span className="text-forest-f30">Target Value</span>
                        <p className="text-forest-f60 font-medium">{targetValue}</p>
                      </div>
                    )}
                  </>
                )}
                <div className="col-span-2">
                  <span className="text-forest-f30">Performance Tracking</span>
                  <p className="text-forest-f60 font-medium capitalize">{metricType} Metrics</p>
                </div>
                <div className="col-span-2">
                  <span className="text-forest-f30">Tracked Metrics</span>
                  <p className="text-forest-f60 font-medium">
                    {selectedMetricNames.length > 0 ? selectedMetricNames.join(", ") : "None selected"}
                  </p>
                </div>
                {parsedTags.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-forest-f30">Tags</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {parsedTags.map((tag) => (
                        <Chip key={tag} variant="outline">{tag}</Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {portfolioInstructions.trim() && (
                <div>
                  <p className="text-[13px] text-forest-f30 mb-1">Portfolio Instructions</p>
                  <div className="px-3 py-2.5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-lg text-[12px] text-forest-f60 leading-relaxed whitespace-pre-wrap">
                    {portfolioInstructions}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[13px] text-forest-f30 mb-2">Campaigns</p>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {campaigns.map((c) => (
                    <div
                      key={c.campaignId}
                      className="px-3 py-2 bg-sandstorm-s5 border border-sandstorm-s40 rounded text-[12px] text-forest-f60"
                    >
                      {c.campaignName}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-r0 border border-red-200 rounded-lg text-[13px] text-red-r30">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successMessage && <div className="flex items-center justify-between px-6 py-4 border-t border-sandstorm-s40">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-[13px] text-forest-f30 hover:text-forest-f60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[13px] text-forest-f30 hover:text-forest-f60 transition-colors"
            >
              Cancel
            </button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="create-entity-button"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isEditMode ? updateMutation.isPending : createMutation.isPending}
                className="create-entity-button"
              >
                {(isEditMode ? updateMutation.isPending : createMutation.isPending) ? (
                  <span className="flex items-center gap-2">
                    <Loader size="sm" /> {isEditMode ? "Updating..." : "Creating..."}
                  </span>
                ) : isEditMode ? (
                  "Update Portfolio"
                ) : (
                  "Create Portfolio"
                )}
              </Button>
            )}
          </div>
        </div>}
      </div>
    </BaseModal>
  );
};
