import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
} from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useSidebar } from "../contexts/SidebarContext";
import { useStrategy } from "../hooks/queries/useStrategies";
import {
  useCreateStrategy,
  useUpdateStrategy,
} from "../hooks/mutations/useStrategyMutations";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Banner, Checkbox, Dropdown, Loader } from "../components/ui";
import {
  StrategyAutomation,
  type FilterValues,
  type AutomationActionState,
  type AutomationScheduleState,
  DEFAULT_ACTION_STATE,
  DEFAULT_SCHEDULE_STATE,
} from "../components/StrategyAutomation";
import { ScheduleFields, WEEKDAYS } from "../components/ScheduleFields";
import { ChevronDown, X, Search } from "lucide-react";
import {
  strategiesService,
  type CreateStrategyData,
  type AutomationPreviewRow,
} from "../services/strategies";
import { formatCurrency } from "../utils/formatters";
import {
  useAllAccessibleProfiles,
  type AllAccessibleProfile,
} from "../hooks/queries/useAllAccessibleProfiles";
import GoalsIcon from "../assets/images/strategy/goals.svg";
import StrategyDetailIcon from "../assets/images/strategy/strategy-detail.svg";
import GuardrailIcon from "../assets/images/strategy/guardrail.svg";
import AutomationIcon from "../assets/images/strategy/automation.svg";
import DateIcon from "../assets/images/strategy/date.svg";
import ScheduleIcon from "../assets/images/strategy/schedule.svg";
import ApprovalIcon from "../assets/images/strategy/approval.svg";
import PlusIcon from "../assets/images/strategy/plus.svg";

const OPTIMIZATION_GOALS = [
  "Improve ROAS",
  "Reduce CPA",
  "Scale Winning Campaigns",
  "Reduce Wasted Spend",
  "Stabilize Performance",
  "Custom Optimization",
] as const;

/** Parse run_days from backend: array, JSON string "[0,1,2]", or comma-separated day names. */
function parseRunDays(value: number[] | string | null | undefined): number[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((d) => d >= 0 && d <= 6);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return Array.isArray(parsed)
          ? (parsed as number[]).filter(
              (d) => typeof d === "number" && d >= 0 && d <= 6,
            )
          : [];
      } catch {
        return [];
      }
    }
    const days = trimmed
      .split(",")
      .map((s) => (WEEKDAYS as readonly string[]).indexOf(s.trim()))
      .filter((i) => i >= 0);
    return days;
  }
  return [];
}

/** Parse automation conditions from backend: array or JSON string. Return FilterValues with ids. */
function parseConditionsToFilters(
  value: unknown,
  generateId: () => string,
): FilterValues {
  let arr: unknown[] = [];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = [];
    }
  }
  return arr.map((item) => {
    const obj =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const value = obj.value;
    const typedValue:
      | string
      | number
      | string[]
      | { min: number; max: number } =
      value === undefined || value === null
        ? ""
        : (value as string | number | string[] | { min: number; max: number });
    return {
      id: (obj.id as string) || generateId(),
      field: String(obj.field ?? ""),
      operator: obj.operator != null ? String(obj.operator) : undefined,
      value: typedValue,
    };
  });
}

/** Normalize API/label time (e.g. "12:00 AM", "08:00:00") to HH:mm for <input type="time"> */
function normalizeTimeForInput(value: string | unknown): string {
  if (value == null) return "00:00";
  const s = String(value).trim();
  const match12h = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12h) {
    let h = parseInt(match12h[1], 10);
    const m = match12h[2];
    const ampm = (match12h[3] ?? "").toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const match24h = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24h) {
    const h = String(parseInt(match24h[1], 10) % 24).padStart(2, "0");
    const m = String(parseInt(match24h[2], 10) % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  return "00:00";
}

/** Normalize backend frequency (e.g. "weekly") to display form ("Weekly") for dropdowns. */
function normalizeFrequencyDisplay(freq: string | null | undefined): string {
  if (freq == null || typeof freq !== "string") return "Weekly";
  const lower = freq.trim().toLowerCase();
  if (lower === "daily") return "Daily";
  if (lower === "weekly") return "Weekly";
  if (lower === "monthly") return "Monthly";
  return freq.charAt(0).toUpperCase() + lower.slice(1);
}

/** Parse approval_layer from API (JSON: { first_run?, campaigns_over?, change_exceeds? }). */
function parseApprovalLayer(value: string | null | undefined): {
  first_run?: boolean;
  campaigns_over?: number | null;
  change_exceeds?: number | null;
} {
  if (value == null || typeof value !== "string" || value.trim() === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      first_run: parsed.first_run === true,
      campaigns_over:
        typeof parsed.campaigns_over === "number"
          ? parsed.campaigns_over
          : typeof parsed.campaigns_over === "string"
            ? parseFloat(parsed.campaigns_over)
            : null,
      change_exceeds:
        typeof parsed.change_exceeds === "number"
          ? parsed.change_exceeds
          : typeof parsed.change_exceeds === "string"
            ? parseFloat(parsed.change_exceeds)
            : null,
    };
  } catch {
    return {};
  }
}

/** Build approval_layer JSON for API from form state. */
function buildApprovalLayer(state: {
  requireApprovalFirstRun: boolean;
  requireApprovalCampaignsOver: boolean;
  requireApprovalCampaignsOverValue: string;
  requireApprovalChangeExceeds: boolean;
  requireApprovalChangeExceedsValue: string;
}): string {
  const obj: Record<string, unknown> = {};
  if (state.requireApprovalFirstRun) obj.first_run = true;
  if (state.requireApprovalCampaignsOver) {
    const n = parseFloat(state.requireApprovalCampaignsOverValue);
    obj.campaigns_over = Number.isFinite(n) ? n : 20;
  }
  if (state.requireApprovalChangeExceeds) {
    const n = parseFloat(state.requireApprovalChangeExceedsValue);
    obj.change_exceeds = Number.isFinite(n) ? n : 25;
  }
  return Object.keys(obj).length === 0 ? "" : JSON.stringify(obj);
}

const STATE_OPTIONS = [
  { value: "Enable", label: "Enable" },
  { value: "Pause", label: "Pause" },
] as const;

type ProfileOption = AllAccessibleProfile;

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="border border-[#E8E8E3] rounded-[12px] px-3 py-6 flex flex-col gap-4 w-full">
    <div className="flex gap-2 items-center">
      <div className="shrink-0 w-6 h-6 [&>img]:w-full [&>img]:h-full">
        {icon}
      </div>
      <div>
        <h3 className="text-[18px] font-medium text-[#072929] leading-normal">
          {title}
        </h3>
      </div>
    </div>
    {description && <p className="text-[14px] text-[#072929]">{description}</p>}
    {children}
  </div>
);

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}> = ({ label, children, className = "", error }) => (
  <div className={`flex flex-col gap-1 w-full max-w-[360px] ${className}`}>
    <label className="text-[14px] text-[#072929]">{label}</label>
    {children}
    {error && <p className="text-[12px] text-red-600 mt-1">{error}</p>}
  </div>
);

export const StrategyDetail: React.FC = () => {
  const { strategyId } = useParams<{ strategyId: string }>();
  const isCreateMode = strategyId === "new";
  const id = strategyId && !isCreateMode ? parseInt(strategyId, 10) : undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { sidebarWidth } = useSidebar();
  const {
    strategy,
    isLoading: strategyLoading,
    isError,
    error,
  } = useStrategy(isCreateMode ? undefined : id);
  const createStrategyMutation = useCreateStrategy();
  const updateStrategyMutation = useUpdateStrategy(id ?? 0);
  const { profiles: allProfiles, isLoading: profilesLoading } =
    useAllAccessibleProfiles();

  const [optimizationGoal, setOptimizationGoal] = useState<string>("");
  const [customOptimizationText, setCustomOptimizationText] = useState("");
  const [formName, setFormName] = useState("");
  const [formState, setFormState] = useState("Pause");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const customOptimizationRef = useRef<HTMLDivElement>(null);
  const automationSectionRef = useRef<HTMLDivElement>(null);
  const [maxChangePerDay, setMaxChangePerDay] = useState("");
  const [maxChangePerWeek, setMaxChangePerWeek] = useState("");
  const [maxChangePerDayUnit, setMaxChangePerDayUnit] = useState<"%" | "$">(
    "%",
  );
  const [maxChangePerWeekUnit, setMaxChangePerWeekUnit] = useState<"%" | "$">(
    "$",
  );
  const [minBudgetFloor, setMinBudgetFloor] = useState("");
  const [maxBudgetCap, setMaxBudgetCap] = useState("");
  const [minDataWindowDays, setMinDataWindowDays] = useState(30);
  const [minSpendThreshold, setMinSpendThreshold] = useState("");
  const [ignoreLast48Hours, setIgnoreLast48Hours] = useState(true);
  const [ignoreLastHoursValue, setIgnoreLastHoursValue] = useState("48");
  const [ignoreCampaigns7Days, setIgnoreCampaigns7Days] = useState(true);
  const [ignoreCampaignsDaysValue, setIgnoreCampaignsDaysValue] = useState("7");
  const [excludeLearningCampaigns, setExcludeLearningCampaigns] =
    useState(false);
  const [frequency, setFrequency] = useState("Weekly");
  const [runAt, setRunAt] = useState("00:00");
  const [runDays, setRunDays] = useState<number[]>([0, 2, 3]); // Mon, Wed, Thu
  const [requireApprovalFirstRun, setRequireApprovalFirstRun] = useState(false);
  const [requireApprovalCampaignsOver, setRequireApprovalCampaignsOver] =
    useState(false);
  const [
    requireApprovalCampaignsOverValue,
    setRequireApprovalCampaignsOverValue,
  ] = useState("20");
  const [requireApprovalChangeExceeds, setRequireApprovalChangeExceeds] =
    useState(false);
  const [
    requireApprovalChangeExceedsValue,
    setRequireApprovalChangeExceedsValue,
  ] = useState("25");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeAutomationTab, setActiveAutomationTab] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<AutomationPreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  /** One automation = one tab; each has its own entity, filters, action state, and schedule. */
  const [automationTabs, setAutomationTabs] = useState<
    {
      entity: string;
      filters: FilterValues;
      actionState: AutomationActionState;
      scheduleState: AutomationScheduleState;
    }[]
  >([
    {
      entity: "Campaign",
      filters: [],
      actionState: DEFAULT_ACTION_STATE,
      scheduleState: DEFAULT_SCHEDULE_STATE,
    },
  ]);

  const runDaysString = useMemo(
    () =>
      runDays
        .sort((a, b) => a - b)
        .map((d) => WEEKDAYS[d])
        .join(", ") || "—",
    [runDays],
  );

  // Map Entity dropdown to API entity_type for dynamic filters (Google Campaigns / Ad Groups / Keywords / Ads)
  const currentAutomation = automationTabs[activeAutomationTab];
  const filterEntityType = useMemo(() => {
    const entity = currentAutomation?.entity ?? "Campaign";
    switch (entity) {
      case "Campaign":
        return "campaigns";
      case "Ad Group":
        return "adgroups";
      case "Keyword":
        return "keywords";
      default:
        return "campaigns";
    }
  }, [currentAutomation?.entity]);

  const firstSelectedProfile = useMemo(() => {
    if (!allProfiles || selectedProfileIds.length === 0) return null;
    return allProfiles.find((p) => selectedProfileIds.includes(p.id)) ?? null;
  }, [allProfiles, selectedProfileIds]);

  useEffect(() => {
    if (isCreateMode) {
      setPageTitle("Create Strategy");
    } else if (strategy?.name) {
      setPageTitle(strategy.name);
    } else {
      setPageTitle("Strategy");
    }
    return () => resetPageTitle();
  }, [isCreateMode, strategy?.name]);

  // Sync form state from loaded strategy (edit mode).
  useEffect(() => {
    if (!strategy) return;
    /* eslint-disable react-hooks/set-state-in-effect -- Syncing server strategy to form when strategy loads in edit mode */
    setFormName(strategy.name ?? "");
    const goal = strategy.goal ?? "";
    const isCustomGoal =
      goal &&
      !OPTIMIZATION_GOALS.includes(goal as (typeof OPTIMIZATION_GOALS)[number]);
    setOptimizationGoal(isCustomGoal ? "Custom Optimization" : goal);
    setCustomOptimizationText(isCustomGoal ? goal : "");
    const statusVal = strategy.status ?? "";
    setFormState(
        statusVal.toLowerCase() === "enabled"
        ? "Enable"
        : "Pause",
    );
    setMaxChangePerDay(
      strategy.max_change_per_day != null
        ? String(strategy.max_change_per_day)
        : "",
    );
    setMaxChangePerWeek(
      strategy.max_change_per_week != null
        ? String(strategy.max_change_per_week)
        : "",
    );
    const dayUnit = (
      strategy.max_change_per_day_unit ??
      strategy.max_change_unit ??
      "percent"
    ).toLowerCase();
    const weekUnit = (
      strategy.max_change_per_week_unit ??
      strategy.max_change_unit ??
      "percent"
    ).toLowerCase();
    setMaxChangePerDayUnit(dayUnit === "absolute" ? "$" : "%");
    setMaxChangePerWeekUnit(weekUnit === "absolute" ? "$" : "%");
    setMinBudgetFloor(
      strategy.min_budget_floor != null
        ? String(strategy.min_budget_floor)
        : "",
    );
    setMaxBudgetCap(
      strategy.max_budget_cap != null ? String(strategy.max_budget_cap) : "",
    );
    setMinDataWindowDays(
      strategy.min_data_window_days != null &&
        strategy.min_data_window_days >= 1
        ? strategy.min_data_window_days
        : 30,
    );
    setMinSpendThreshold(
      strategy.min_spend_threshold != null
        ? String(strategy.min_spend_threshold)
        : "",
    );
    const ignoreHours =
      strategy.ignore_last_hours ?? (strategy.ignore_last_48_hours ? 48 : null);
    setIgnoreLast48Hours(ignoreHours != null && ignoreHours > 0);
    setIgnoreLastHoursValue(
      ignoreHours != null && ignoreHours > 0 ? String(ignoreHours) : "48",
    );
    const ignoreDays =
      strategy.ignore_campaigns_created_in_last_days ??
      (strategy.ignore_campaigns_in_last_7_days ? 7 : null);
    setIgnoreCampaigns7Days(ignoreDays != null && ignoreDays > 0);
    setIgnoreCampaignsDaysValue(
      ignoreDays != null && ignoreDays > 0 ? String(ignoreDays) : "7",
    );
    setExcludeLearningCampaigns(strategy.exclude_learning_campaigns ?? false);
    setFrequency(normalizeFrequencyDisplay(strategy.frequency ?? undefined));
    setRunAt(normalizeTimeForInput(strategy.run_at ?? "00:00"));
    const parsedRunDays = parseRunDays(strategy.run_days);
    if (parsedRunDays.length > 0) setRunDays(parsedRunDays);
    if (strategy.profile_ids && strategy.profile_ids.length > 0) {
      setSelectedProfileIds(strategy.profile_ids.map(String));
    }
    const approval = parseApprovalLayer(strategy.approval_layer);
    setRequireApprovalFirstRun(approval.first_run ?? false);
    setRequireApprovalCampaignsOver(approval.campaigns_over != null);
    setRequireApprovalCampaignsOverValue(
      approval.campaigns_over != null ? String(approval.campaigns_over) : "20",
    );
    setRequireApprovalChangeExceeds(approval.change_exceeds != null);
    setRequireApprovalChangeExceedsValue(
      approval.change_exceeds != null ? String(approval.change_exceeds) : "25",
    );
    const apiEntityToUi: Record<string, string> = {
      campaign: "Campaign",
      ad_group: "Ad Group",
      keyword: "Keyword",
      ad: "Campaign", // Ads entity removed from UI; map to Campaign when loading
    };
    const apiActionToUi: Record<string, string> = {
      pause: "pause",
      enable: "enable",
      increase_budget_pct: "increase_budget",
      decrease_budget_pct: "decrease_budget",
      set_budget: "set_budget",
      increase_bid_pct: "increase_bid",
      decrease_bid_pct: "decrease_bid",
    };
    const globalFrequency = normalizeFrequencyDisplay(
      strategy.frequency ?? undefined,
    );
    const globalRunAt = normalizeTimeForInput(strategy.run_at ?? "00:00");
    const globalRunDays = parsedRunDays.length > 0 ? parsedRunDays : [0, 2, 3];

    if (strategy.automations && strategy.automations.length > 0) {
      setAutomationTabs(
        strategy.automations.map((a) => {
          const hasScheduleFields =
            (a.schedule_frequency != null &&
              String(a.schedule_frequency).trim() !== "") ||
            (a.schedule_run_at != null &&
              String(a.schedule_run_at).trim() !== "") ||
            (Array.isArray(a.schedule_run_days) &&
              a.schedule_run_days.length > 0);
          const hasOwnSchedule =
            a.schedule_enabled === true || hasScheduleFields;

          let scheduleRunDays: number[] = globalRunDays;
          if (hasOwnSchedule && a.schedule_run_days != null) {
            const scheduleRunDaysRaw = a.schedule_run_days;
            if (
              Array.isArray(scheduleRunDaysRaw) &&
              scheduleRunDaysRaw.length > 0
            ) {
              scheduleRunDays = scheduleRunDaysRaw.filter(
                (d) => d >= 0 && d <= 6,
              );
            } else if (
              typeof scheduleRunDaysRaw === "string" &&
              scheduleRunDaysRaw.trim().startsWith("[")
            ) {
              try {
                const parsed = JSON.parse(scheduleRunDaysRaw) as unknown;
                scheduleRunDays = Array.isArray(parsed)
                  ? (parsed as number[]).filter(
                      (d) => typeof d === "number" && d >= 0 && d <= 6,
                    )
                  : globalRunDays;
              } catch {
                // keep global
              }
            }
          }

          const frequency =
            hasOwnSchedule &&
            a.schedule_frequency != null &&
            String(a.schedule_frequency).trim() !== ""
              ? normalizeFrequencyDisplay(a.schedule_frequency)
              : globalFrequency;
          const runAtNormalized =
            hasOwnSchedule &&
            a.schedule_run_at != null &&
            String(a.schedule_run_at).trim() !== ""
              ? normalizeTimeForInput(a.schedule_run_at)
              : globalRunAt;

          return {
            ...(typeof (a as { id?: number }).id === "number" && {
              id: (a as { id?: number }).id,
            }),
            entity: apiEntityToUi[a.entity ?? ""] ?? "Campaign",
            filters: parseConditionsToFilters(
              a.conditions,
              () =>
                `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            ),
            actionState: {
              action: apiActionToUi[a.action ?? ""] ?? "",
              adjustmentValue:
                a.change_value != null ? String(a.change_value) : "",
              adjustmentValueUnit: a.change_unit === "absolute" ? "$" : "%",
              actionLimitValue:
                a.change_cap != null ? String(a.change_cap) : "",
            },
            scheduleState: {
              scheduleEnabled: hasOwnSchedule,
              frequency,
              runAt: runAtNormalized,
              runDays: scheduleRunDays,
            },
          };
        }),
      );
    }
  }, [strategy]);

  const toggleRunDay = (dayIndex: number) => {
    setRunDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex],
    );
  };

  // When editing, pre-select profiles linked to this strategy (profile_ids)
  useEffect(() => {
    if (!strategy?.profile_ids?.length || !allProfiles?.length) return;
    const profileIdSet = new Set(strategy.profile_ids.map(String));
    const ids = allProfiles
      .filter((p) => profileIdSet.has(p.id))
      .map((p) => p.id);
    setSelectedProfileIds((prev) => (prev.length === 0 ? ids : prev));
  }, [strategy?.profile_ids, allProfiles]);

  // Open a specific automation tab when navigated from list (state.automationIndex or ?automation=1). Only apply once per strategy load.
  const appliedInitialAutomationTabRef = useRef(false);
  useEffect(() => {
    appliedInitialAutomationTabRef.current = false;
  }, [id]);
  useEffect(() => {
    if (isCreateMode || !strategy || automationTabs.length === 0) return;
    if (appliedInitialAutomationTabRef.current) return;
    const fromState = (location.state as { automationIndex?: number } | null)
      ?.automationIndex;
    const fromQuery = searchParams.get("automation");
    const rawIndex =
      fromState ??
      (fromQuery != null ? parseInt(fromQuery, 10) - 1 : null);
    if (rawIndex == null || Number.isNaN(rawIndex)) return;
    appliedInitialAutomationTabRef.current = true;
    const index = Math.max(
      0,
      Math.min(rawIndex, automationTabs.length - 1),
    );
    setActiveAutomationTab(index);
  }, [
    isCreateMode,
    strategy,
    location.state,
    searchParams,
    automationTabs.length,
  ]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileDropdownOpen]);

  const filteredProfiles = useMemo(() => {
    if (!allProfiles) return [];
    const q = profileSearch.trim().toLowerCase();
    if (!q) return allProfiles;
    return allProfiles.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.accountName.toLowerCase().includes(q) ||
        p.channelName.toLowerCase().includes(q) ||
        p.profileName.toLowerCase().includes(q),
    );
  }, [allProfiles, profileSearch]);

  const allFilteredSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedProfileIds.includes(p.id));
  const someFilteredSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.some((p) => selectedProfileIds.includes(p.id));
  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedProfileIds((prev) =>
        prev.filter((id) => !filteredProfiles.some((p) => p.id === id)),
      );
    } else {
      const toAdd = filteredProfiles
        .map((p) => p.id)
        .filter((id) => !selectedProfileIds.includes(id));
      setSelectedProfileIds((prev) => [...prev, ...toAdd]);
    }
  };

  const buildPayload = (): CreateStrategyData => {
    const profileIds =
      selectedProfileIds.length > 0
        ? selectedProfileIds
            .map((id) => parseInt(id, 10))
            .filter((n) => !Number.isNaN(n))
        : undefined;
    const goalValue =
      optimizationGoal === "Custom Optimization"
        ? customOptimizationText.trim() || undefined
        : optimizationGoal.trim() || undefined;

    const entityToApi: Record<string, string> = {
      Campaign: "campaign",
      "Ad Group": "ad_group",
      Keyword: "keyword",
    };
    const actionToApi: Record<string, string> = {
      pause: "pause",
      enable: "enable",
      increase_budget: "increase_budget_pct",
      decrease_budget: "decrease_budget_pct",
      set_budget: "set_budget",
      increase_bid: "increase_bid_pct",
      decrease_bid: "decrease_bid_pct",
    };

    const isFilterRowComplete = (f: FilterValues[number]): boolean => {
      const fieldSet = f.field != null && String(f.field).trim() !== "";
      const operatorSet =
        f.operator != null && String(f.operator).trim() !== "";
      let valueEmpty = f.value == null;
      if (!valueEmpty && typeof f.value === "string")
        valueEmpty = f.value.trim() === "";
      if (!valueEmpty && Array.isArray(f.value))
        valueEmpty = f.value.length === 0;
      if (
        !valueEmpty &&
        typeof f.value === "object" &&
        f.value !== null &&
        !Array.isArray(f.value) &&
        "min" in f.value &&
        "max" in f.value
      ) {
        const range = f.value as { min?: number; max?: number };
        valueEmpty = range.min == null || range.max == null;
      }
      return fieldSet && operatorSet && !valueEmpty;
    };

    const automations = automationTabs.map((tab, index) => ({
      ...(typeof (tab as { id?: number }).id === "number" && {
        id: (tab as { id?: number }).id,
      }),
      entity: entityToApi[tab.entity] ?? "campaign",
      action: actionToApi[tab.actionState.action] ?? "pause",
      change_value: tab.actionState.adjustmentValue
        ? parseFloat(tab.actionState.adjustmentValue)
        : undefined,
      change_unit:
        tab.actionState.adjustmentValueUnit === "$" ? "absolute" : "percent",
      change_cap: tab.actionState.actionLimitValue
        ? parseFloat(tab.actionState.actionLimitValue)
        : undefined,
      conditions: tab.filters.filter(isFilterRowComplete) as unknown as Record<
        string,
        unknown
      >[],
      sort_order: index,
      schedule_enabled: tab.scheduleState.scheduleEnabled,
      schedule_frequency: tab.scheduleState.scheduleEnabled
        ? tab.scheduleState.frequency
        : undefined,
      schedule_run_at: tab.scheduleState.scheduleEnabled
        ? tab.scheduleState.runAt
        : undefined,
      schedule_run_days: tab.scheduleState.scheduleEnabled
        ? tab.scheduleState.runDays
        : undefined,
    }));

    const platformFromProfile = firstSelectedProfile?.channelType
      ? String(firstSelectedProfile.channelType).toLowerCase()
      : "google";
    const runAtFormatted =
      /^\d{1,2}:\d{2}(:\d{2})?$/.test(runAt) && runAt.length <= 8
        ? runAt.length === 5
          ? `${runAt}:00`
          : runAt
        : "00:00:00";

    const approvalLayerJson = buildApprovalLayer({
      requireApprovalFirstRun,
      requireApprovalCampaignsOver,
      requireApprovalCampaignsOverValue,
      requireApprovalChangeExceeds,
      requireApprovalChangeExceedsValue,
    });
    const payload: CreateStrategyData = {
      name: formName.trim(),
      goal: goalValue,
      status:
        formState === "Enable"
          ? "enabled"
          : formState === "Pause"
            ? "paused"
            : "paused",
      platform: platformFromProfile,
      max_change_per_day: maxChangePerDay.trim() || undefined,
      max_change_per_week: maxChangePerWeek.trim() || undefined,
      max_change_per_day_unit:
        maxChangePerDayUnit === "$" ? "absolute" : "percent",
      max_change_per_week_unit:
        maxChangePerWeekUnit === "$" ? "absolute" : "percent",
      min_budget_floor: minBudgetFloor.trim()
        ? parseFloat(minBudgetFloor)
        : null,
      max_budget_cap: maxBudgetCap.trim() ? parseFloat(maxBudgetCap) : null,
      min_spend_threshold: minSpendThreshold
        ? parseFloat(minSpendThreshold)
        : undefined,
      min_data_window_days: minDataWindowDays,
      ignore_last_hours: ignoreLast48Hours
        ? parseInt(ignoreLastHoursValue, 10) || 48
        : 0,
      ignore_campaigns_created_in_last_days: ignoreCampaigns7Days
        ? parseInt(ignoreCampaignsDaysValue, 10) || 7
        : 0,
      exclude_learning_campaigns: excludeLearningCampaigns,
      is_approved: approvalLayerJson === "",
      approval_layer: approvalLayerJson,
      frequency,
      run_at: runAtFormatted,
      run_days: runDays,
      profile_ids: profileIds,
      automations,
    };
    return payload;
  };

  /** Returns field-level validation errors. Used when status is Enable or Pause. */
  const getValidationFieldErrors = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = "Strategy name is required.";
      return errors;
    }
    if (selectedProfileIds.length === 0) {
      errors.profile_ids =
        "Select at least one profile (Brand / Integration / Profile).";
      return errors;
    }
    if (
      optimizationGoal === "Custom Optimization" &&
      !customOptimizationText.trim()
    ) {
      errors.custom_optimization = "Enter a custom optimization goal.";
      return errors;
    }
    for (let t = 0; t < automationTabs.length; t++) {
      const tab = automationTabs[t];
      for (let i = 0; i < tab.filters.length; i++) {
        const f = tab.filters[i];
        const fieldSet = f.field != null && String(f.field).trim() !== "";
        const operatorSet =
          f.operator != null && String(f.operator).trim() !== "";
        let valueEmpty = f.value == null;
        if (!valueEmpty && typeof f.value === "string")
          valueEmpty = f.value.trim() === "";
        if (!valueEmpty && Array.isArray(f.value))
          valueEmpty = f.value.length === 0;
        if (
          !valueEmpty &&
          typeof f.value === "object" &&
          f.value !== null &&
          !Array.isArray(f.value) &&
          "min" in f.value &&
          "max" in f.value
        ) {
          const range = f.value as { min?: number; max?: number };
          valueEmpty = range.min == null || range.max == null;
        }
        const rowStarted = fieldSet || operatorSet || !valueEmpty;
        if (rowStarted && (!fieldSet || !operatorSet || valueEmpty)) {
          errors.automation = `Automation ${t + 1}: complete all filter rows (field, operator, and value must be set).`;
          return errors;
        }
      }
    }
    return errors;
  };

  const scrollToErrorField = (errorKey: string) => {
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      name: nameFieldRef,
      profile_ids: profileDropdownRef,
      custom_optimization: customOptimizationRef,
      automation: automationSectionRef,
    };
    const ref = refMap[errorKey];
    const el = ref?.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!formName.trim()) {
      setFieldErrors({ name: "Strategy name is required." });
      setTimeout(() => scrollToErrorField("name"), 0);
      return;
    }
    const isEnableOrPause = formState === "Enable" || formState === "Pause";
    if (isEnableOrPause) {
      const validationErrors = getValidationFieldErrors();
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        const firstKey = Object.keys(validationErrors)[0];
        setTimeout(() => scrollToErrorField(firstKey), 0);
        return;
      }
    }
    const payload = buildPayload();
    try {
      if (isCreateMode) {
        const created = await createStrategyMutation.mutateAsync(payload);
        navigate("/strategies", {
          replace: true,
          state: { strategyCreated: true },
        });
      } else if (id !== undefined && !isCreateMode) {
        await updateStrategyMutation.mutateAsync(payload);
        setSaveSuccessMessage("Strategy saved successfully.");
        navigate(`/strategies/${id}`, { replace: true });
      }
    } catch (err: any) {
      setSaveSuccessMessage(null);
      const data = err?.response?.data;
      const next: Record<string, string> = {};
      if (data && typeof data === "object" && !Array.isArray(data)) {
        for (const key of Object.keys(data)) {
          const val = data[key];
          const msg = Array.isArray(val)
            ? val[0]
            : typeof val === "string"
              ? val
              : null;
          if (msg) next[key] = msg;
        }
      }
      if (Object.keys(next).length === 0) {
        next._form =
          data?.detail ||
          data?.name?.[0] ||
          err?.message ||
          "Failed to save strategy.";
      }
      setFieldErrors(next);
      const firstKey = Object.keys(next)[0];
      if (firstKey && firstKey !== "_form") {
        setTimeout(() => scrollToErrorField(firstKey), 0);
      }
    }
  };

  const isPending =
    createStrategyMutation.isPending || updateStrategyMutation.isPending;

  const [testCreatePending, setTestCreatePending] = useState(false);
  const [testCreateMessage, setTestCreateMessage] = useState<string | null>(
    null,
  );

  const getFakeCreatePayload = (): CreateStrategyData => {
    const profileId =
      allProfiles.length > 0 ? parseInt(allProfiles[0].id, 10) : 1;
    return {
      name: `Test strategy ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
      goal: "Maximize conversions",
      status: "paused",
      platform: "google",
      profile_ids: [profileId],
      max_change_per_day: "50",
      max_change_per_week: "200",
      min_data_window_days: 31,
      min_spend_threshold: 1,
      ignore_last_hours: 48,
      ignore_campaigns_created_in_last_days: 7,
      exclude_learning_campaigns: false,
      frequency: "daily",
      run_days: [0, 1, 2, 3, 4],
      run_at: "09:00:00",
      automations: [
        {
          entity: "campaign",
          action: "increase_budget_pct",
          conditions: [
            { field: "campaign_advertising_channel_type", value: "SEARCH" },
            { field: "campaign_status", value: "ENABLED" },
          ],
          change_value: 20,
          change_unit: "percent",
          change_cap: 500,
          max_entity_delta: 50,
          sort_order: 0,
        },
      ],
    };
  };

  /** Full dummy payload for "Fill form & create": includes guardrails and one automation. */
  const getDummyPayload = (): CreateStrategyData => {
    const profileId =
      allProfiles && allProfiles.length > 0
        ? parseInt(allProfiles[0].id, 10)
        : 1;
    return {
      name: `Dummy strategy ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
      goal: "Improve ROAS",
      status: "paused",
      platform: "google",
      profile_ids: [profileId],
      max_change_per_day: "25",
      max_change_per_week: "100",
      min_budget_floor: 50,
      max_budget_cap: 5000,
      min_data_window_days: 30,
      min_spend_threshold: 10,
      ignore_last_hours: 48,
      ignore_campaigns_created_in_last_days: 7,
      exclude_learning_campaigns: true,
      frequency: "Weekly",
      run_days: [0, 1, 2, 3, 4],
      run_at: "09:00:00",
      automations: [
        {
          entity: "campaign",
          action: "increase_budget_pct",
          conditions: [
            {
              id: "dummy-f1",
              field: "campaign_advertising_channel_type",
              operator: "eq",
              value: "SEARCH",
            },
            {
              id: "dummy-f2",
              field: "campaign_status",
              operator: "eq",
              value: "ENABLED",
            },
          ],
          change_value: 20,
          change_unit: "percent",
          change_cap: 500,
          sort_order: 0,
          schedule_enabled: true,
          schedule_frequency: "Weekly",
          schedule_run_at: "08:00:00",
          schedule_run_days: [1, 3, 5],
        },
      ],
    };
  };

  /** Set all form state from a create payload (used by "Fill form & create"). */
  const fillFormFromPayload = (payload: CreateStrategyData) => {
    setFormName(payload.name ?? "");
    const goal = payload.goal ?? "";
    setOptimizationGoal(
      goal &&
        OPTIMIZATION_GOALS.includes(goal as (typeof OPTIMIZATION_GOALS)[number])
        ? goal
        : goal
          ? "Custom Optimization"
          : "Improve ROAS",
    );
    setCustomOptimizationText(
      goal &&
        !OPTIMIZATION_GOALS.includes(
          goal as (typeof OPTIMIZATION_GOALS)[number],
        )
        ? goal
        : "",
    );
    setFormState(
      payload.status?.toLowerCase() === "enabled"
        ? "Enable"
        : "Pause",
    );
    setSelectedProfileIds((payload.profile_ids ?? []).map((id) => String(id)));
    setMaxChangePerDay(payload.max_change_per_day ?? "");
    setMaxChangePerWeek(payload.max_change_per_week ?? "");
    setMinBudgetFloor(
      payload.min_budget_floor != null ? String(payload.min_budget_floor) : "",
    );
    setMaxBudgetCap(
      payload.max_budget_cap != null ? String(payload.max_budget_cap) : "",
    );
    setMinDataWindowDays(payload.min_data_window_days ?? 30);
    setMinSpendThreshold(
      payload.min_spend_threshold != null
        ? String(payload.min_spend_threshold)
        : "",
    );
    setIgnoreLast48Hours((payload.ignore_last_hours ?? 0) > 0);
    setIgnoreLastHoursValue("48");
    setIgnoreCampaigns7Days(
      (payload.ignore_campaigns_created_in_last_days ?? 0) > 0,
    );
    setIgnoreCampaignsDaysValue("7");
    setExcludeLearningCampaigns(payload.exclude_learning_campaigns ?? false);
    setFrequency(payload.frequency ?? "Weekly");
    const runAtRaw = payload.run_at ?? "00:00:00";
    setRunAt(
      /^\d{1,2}:\d{2}(:\d{2})?$/.test(runAtRaw)
        ? runAtRaw.slice(0, 5)
        : "00:00",
    );
    setRunDays(Array.isArray(payload.run_days) ? payload.run_days : []);
    const apiEntityToUi: Record<string, string> = {
      campaign: "Campaign",
      ad_group: "Ad Group",
      keyword: "Keyword",
      ad: "Campaign", // Ads entity removed from UI; map to Campaign when loading
    };
    const apiActionToUi: Record<string, string> = {
      pause: "pause",
      enable: "enable",
      increase_budget_pct: "increase_budget",
      decrease_budget_pct: "decrease_budget",
      set_budget: "set_budget",
      increase_bid_pct: "increase_bid",
      decrease_bid_pct: "decrease_bid",
    };
    const tabs = (payload.automations ?? []).map((a) => {
      const hasOwnSchedule =
        a.schedule_enabled &&
        (a.schedule_run_at != null ||
          (a.schedule_run_days != null &&
            (a.schedule_run_days as number[]).length > 0));
      const scheduleRunDays = Array.isArray(a.schedule_run_days)
        ? a.schedule_run_days
        : typeof a.schedule_run_days === "string"
          ? (() => {
              try {
                const p = JSON.parse(a.schedule_run_days as string) as unknown;
                return Array.isArray(p) ? p : [];
              } catch {
                return [];
              }
            })()
          : [];
      const scheduleRunAtRaw =
        hasOwnSchedule && a.schedule_run_at != null
          ? String(a.schedule_run_at)
          : "00:00:00";
      const runAtNormalized = /^\d{1,2}:\d{2}(:\d{2})?$/.test(scheduleRunAtRaw)
        ? scheduleRunAtRaw.slice(0, 5)
        : "00:00";
      return {
        entity: apiEntityToUi[a.entity ?? ""] ?? "Campaign",
        filters: parseConditionsToFilters(
          a.conditions,
          () => `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ),
        actionState: {
          action: apiActionToUi[a.action ?? ""] ?? "",
          adjustmentValue: a.change_value != null ? String(a.change_value) : "",
          adjustmentValueUnit: a.change_unit === "absolute" ? "$" : "%",
          actionLimitValue: a.change_cap != null ? String(a.change_cap) : "",
        },
        scheduleState: {
          scheduleEnabled: !!a.schedule_enabled,
          frequency: a.schedule_frequency ?? "Weekly",
          runAt: runAtNormalized,
          runDays: scheduleRunDays,
        },
      };
    });
    if (tabs.length > 0) {
      setAutomationTabs(tabs);
      setActiveAutomationTab(0);
    }
  };

  const [fillAndCreatePending, setFillAndCreatePending] = useState(false);
  const handleFillFormAndCreate = async () => {
    setFieldErrors({});
    const payload = getDummyPayload();
    fillFormFromPayload(payload);
    setFillAndCreatePending(true);
    try {
      const created = await createStrategyMutation.mutateAsync(payload);
      navigate("/strategies", {
        replace: true,
        state: { strategyCreated: true },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string; name?: string[] } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { name?: string[] } } })?.response?.data
          ?.name?.[0] ||
        (err as Error)?.message ||
        "Create failed.";
      setFieldErrors({ _form: message });
    } finally {
      setFillAndCreatePending(false);
    }
  };

  const handleTestCreateApi = async () => {
    setTestCreateMessage(null);
    setFieldErrors({});
    setTestCreatePending(true);
    try {
      const payload = getFakeCreatePayload();
      const created = await strategiesService.createStrategy(payload);
      setTestCreateMessage(`Created strategy ID: ${created.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string; name?: string[] } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { name?: string[] } } })?.response?.data
          ?.name?.[0] ||
        (err as Error)?.message ||
        "Request failed.";
      setTestCreateMessage(`Error: ${message}`);
    } finally {
      setTestCreatePending(false);
    }
  };

  if (id !== undefined && !isCreateMode && (isNaN(id) || id < 0)) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
          <AccountsHeader />
          <div className="px-4 py-6 sm:px-6 lg:p-8">
            <p className="text-[14px] text-neutral-n300">Invalid strategy.</p>
            <Link
              to="/strategies"
              className="text-[#136D6D] hover:underline mt-2 inline-block"
            >
              ← Back to Strategies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isCreateMode && strategyLoading && !strategy) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
          <AccountsHeader />
          <div className="px-4 py-6 sm:px-6 lg:p-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (
    !isCreateMode &&
    (isError || (!strategyLoading && id !== undefined && !strategy))
  ) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
          <AccountsHeader />
          <div className="px-4 py-6 sm:px-6 lg:p-8">
            <p className="text-[14px] text-red-600">
              {error?.message || "Strategy not found."}
            </p>
            <Link
              to="/strategies"
              className="text-[#136D6D] hover:underline mt-2 inline-block"
            >
              ← Back to Strategies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle = isCreateMode
    ? "Create Strategy"
    : (strategy?.name ?? "Edit Strategy");
  const submitLabel = isCreateMode ? "Create Strategy" : "Save";

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="flex-1 w-full relative"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {isPending && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader size="lg" message="Saving..." showMessage={true} />
          </div>
        )}
        <AccountsHeader />
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
          <div className="space-y-4 mb-6">
            {saveSuccessMessage && (
              <Banner
                type="success"
                message={saveSuccessMessage}
                dismissable
                onDismiss={() => setSaveSuccessMessage(null)}
              />
            )}
            {fieldErrors._form && (
              <Banner
                type="error"
                message={fieldErrors._form}
                dismissable
                onDismiss={() =>
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next._form;
                    return next;
                  })
                }
              />
            )}
          </div>
          <div className="mb-6">
            <h1 className="text-[20px] sm:text-[22px] font-medium text-[#072929] leading-normal">
              {pageTitle}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] p-6 flex flex-col gap-6 w-full">

              {/* Optimization Goal (Optional) */}
              <SectionCard
                icon={<img src={GoalsIcon} alt="" className="w-6 h-6" />}
                title="Optimization Goal (Optional)"
              >
                <div className="flex flex-wrap gap-4">
                  {OPTIMIZATION_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setOptimizationGoal(goal)}
                      className={`
                        flex-1 min-w-[120px] sm:min-w-[140px] h-[62px] px-3 sm:px-4 rounded-[20px] flex items-center justify-between gap-2 sm:gap-4
                        border-2 transition-all
                        ${
                          optimizationGoal === goal
                            ? "bg-[#f0f0ed] border-[#136D6D] shadow-[0px_4px_0px_0px_#136D6D]"
                            : "bg-[#F9F9F6] border-[#E8E8E3] hover:border-[#d0d0cb]"
                        }
                      `}
                    >
                      <span className="text-[13px] sm:text-[14px] lg:text-[14px] text-[#072929] min-w-0 text-left leading-tight max-h-[2.5em] overflow-hidden">
                        {goal}
                      </span>
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          optimizationGoal === goal
                            ? "border-[#136D6D] bg-[#136D6D]"
                            : "border-[#E8E8E3]"
                        }`}
                      >
                        {optimizationGoal === goal && (
                          <span className="w-2 h-2 rounded-full bg-[#F9F9F6]" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                {optimizationGoal === "Custom Optimization" && (
                  <div ref={customOptimizationRef}>
                    <FormField
                      label="Custom Optimization"
                      className="mt-2 max-w-full"
                      error={fieldErrors.custom_optimization}
                    >
                      <input
                        type="text"
                        value={customOptimizationText}
                        onChange={(e) =>
                          setCustomOptimizationText(e.target.value)
                        }
                        placeholder="Describe your optimization goal"
                        className="campaign-input h-12 rounded-[12px] px-3 border max-w-[360px] border-[#e3e3e3] bg-[#FEFEFB]"
                      />
                    </FormField>
                  </div>
                )}
              </SectionCard>

              {/* Strategy Details */}
              <SectionCard
                icon={
                  <img src={StrategyDetailIcon} alt="" className="w-6 h-6" />
                }
                title="Strategy Details"
              >
                <div className="flex flex-wrap gap-4 w-full md:flex-nowrap">
                  <div ref={nameFieldRef} className="w-full md:flex-1 md:min-w-0">
                    <FormField
                      label="Strategy Name"
                      className="w-full"
                      error={fieldErrors.name}
                    >
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. High ACOS Protection"
                        className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB]"
                        required
                      />
                    </FormField>
                  </div>
                  <FormField
                    label="State"
                    className="w-full md:flex-1 md:min-w-0"
                  >
                    <Dropdown
                      options={[...STATE_OPTIONS]}
                      value={formState}
                      onChange={(value) => setFormState(value)}
                      placeholder="Select state"
                      buttonClassName="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB] flex items-center justify-between"
                      width="w-full"
                      showCheckmark={true}
                      closeOnSelect={true}
                    />
                  </FormField>
                  <FormField
                    label="Brand / Integration / Profile"
                    className="w-full md:flex-1 md:min-w-0"
                    error={fieldErrors.profile_ids}
                  >
                    <div className="relative w-full" ref={profileDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setProfileDropdownOpen((open) => !open)}
                        className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB] flex items-center justify-between gap-2 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {selectedProfileIds.length > 0 && allProfiles ? (
                            selectedProfileIds.length <= 1 ? (
                              selectedProfileIds.map((id) => {
                                const p = allProfiles.find((x) => x.id === id);
                                return p ? (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1.5 bg-[#D6E5E5] text-[#072929] text-[12px] px-2 py-0.5 rounded-full"
                                  >
                                    {p.label}
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProfileIds((prev) =>
                                          prev.filter((x) => x !== id),
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedProfileIds((prev) =>
                                            prev.filter((x) => x !== id),
                                          );
                                        }
                                      }}
                                      className="p-0.5 hover:opacity-70 cursor-pointer"
                                      aria-label="Remove profile"
                                    >
                                      <X className="w-3 h-3" />
                                    </span>
                                  </span>
                                ) : null;
                              })
                            ) : (
                              <span className="text-[14px] text-[#072929]">
                                {selectedProfileIds.length} selected
                              </span>
                            )
                          ) : (
                            <span className="text-[14px] text-[#072929]">
                              {profilesLoading ? "Loading…" : "Select profile"}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-[#e3e3e3] shrink-0 transition-transform ${
                            profileDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {profileDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-[12px] border border-[#E8E8E3] bg-[#FEFEFB] p-3 shadow-[0px_20px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-0 max-h-[320px]">
                          <div className="bg-sandstorm-s30 border border-[#E8E8E3] rounded-lg flex items-center gap-2 h-10 px-2.5 shrink-0">
                            <Search className="w-4 h-4 text-neutral-n300 shrink-0" />
                            <input
                              type="text"
                              value={profileSearch}
                              onChange={(e) => setProfileSearch(e.target.value)}
                              placeholder="Search for brands"
                              className="bg-transparent flex-1 min-w-0 text-[14px] text-[#072929] placeholder:text-neutral-n300 outline-none"
                            />
                          </div>
                          <div className="flex gap-2 h-10 items-center px-3 shrink-0">
                            <Checkbox
                              checked={allFilteredSelected}
                              indeterminate={
                                someFilteredSelected && !allFilteredSelected
                              }
                              onChange={toggleSelectAllFiltered}
                            />
                            <span className="text-[14px] font-medium text-neutral-n600">
                              Select All ({selectedProfileIds.length}/
                              {filteredProfiles.length})
                            </span>
                          </div>
                          <div className="overflow-auto flex-1 min-h-0 mt-1">
                            {filteredProfiles.length === 0 ? (
                              <div className="py-4 text-[14px] text-neutral-n300 text-center">
                                {profileSearch.trim()
                                  ? "No profiles match your search"
                                  : "No profiles available"}
                              </div>
                            ) : (
                              filteredProfiles.map((p) => (
                                <div
                                  key={p.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setSelectedProfileIds((prev) =>
                                      prev.includes(p.id)
                                        ? prev.filter((x) => x !== p.id)
                                        : [...prev, p.id],
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedProfileIds((prev) =>
                                        prev.includes(p.id)
                                          ? prev.filter((x) => x !== p.id)
                                          : [...prev, p.id],
                                      );
                                    }
                                  }}
                                  className="w-full flex gap-2 h-10 items-center px-3 rounded hover:bg-[#F9F9F6] text-left cursor-pointer"
                                >
                                  <span
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0"
                                  >
                                    <Checkbox
                                      checked={selectedProfileIds.includes(
                                        p.id,
                                      )}
                                      onChange={(checked) => {
                                        if (checked) {
                                          setSelectedProfileIds((prev) => [
                                            ...prev,
                                            p.id,
                                          ]);
                                        } else {
                                          setSelectedProfileIds((prev) =>
                                            prev.filter((x) => x !== p.id),
                                          );
                                        }
                                      }}
                                    />
                                  </span>
                                  <span className="text-[14px] text-[#072929] truncate">
                                    {p.label}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormField>
                </div>
              </SectionCard>

              {/* Guardrails */}
              <SectionCard
                icon={<img src={GuardrailIcon} alt="" className="w-6 h-6" />}
                title="Guardrails"
                description="Protect budgets and enforce data stability."
              >
                <div className="flex flex-nowrap gap-4">
                  <FormField
                    label="Max Change Per Day"
                    className="flex-1 min-w-0 max-w-[180px]"
                  >
                    <div className="flex h-10 rounded-[12px] border border-[#e3e3e3] bg-[#FEFEFB] overflow-hidden transition-colors focus-within:border focus-within:border-[#136D6D]">
                      <input
                        type="number"
                        value={maxChangePerDay}
                        onChange={(e) => setMaxChangePerDay(e.target.value)}
                        placeholder="20"
                        className="flex-1 border-0 rounded-none h-full text-[12px] px-3 outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMaxChangePerDayUnit((u) => (u === "%" ? "$" : "%"))
                        }
                        className="flex items-center justify-center px-3 text-[14px] text-[#072929] border-l border-[#E8E8E3] h-full min-w-[44px] hover:bg-[#f5f5f0] transition-colors"
                      >
                        {maxChangePerDayUnit}
                      </button>
                    </div>
                  </FormField>
                  <FormField
                    label="Max Change Per Week"
                    className="flex-1 min-w-0 max-w-[180px]"
                  >
                    <div className="flex h-10 rounded-[12px] border border-[#e3e3e3] bg-[#FEFEFB] overflow-hidden transition-colors focus-within:border focus-within:border-[#136D6D]">
                      <input
                        type="number"
                        value={maxChangePerWeek}
                        onChange={(e) => setMaxChangePerWeek(e.target.value)}
                        placeholder="10,000"
                        className="flex-1 border-0 rounded-none h-full text-[12px] px-3 outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMaxChangePerWeekUnit((u) =>
                            u === "%" ? "$" : "%",
                          )
                        }
                        className="flex items-center justify-center px-3 text-[14px] text-[#072929] border-l border-[#E8E8E3] h-full min-w-[44px] hover:bg-[#f5f5f0] transition-colors"
                      >
                        {maxChangePerWeekUnit}
                      </button>
                    </div>
                  </FormField>
                  <FormField
                    label="Minimum Budget Floor"
                    className="flex-1 min-w-0 max-w-[180px]"
                  >
                    <input
                      type="number"
                      value={minBudgetFloor}
                      onChange={(e) => setMinBudgetFloor(e.target.value)}
                      placeholder="$50"
                      className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB]"
                    />
                  </FormField>
                  <FormField
                    label="Maximum Budget Cap"
                    className="flex-1 min-w-0 max-w-[180px]"
                  >
                    <input
                      type="number"
                      value={maxBudgetCap}
                      onChange={(e) => setMaxBudgetCap(e.target.value)}
                      placeholder="$10,000"
                      className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB]"
                    />
                  </FormField>
                </div>
              </SectionCard>

              {/* Automation */}
              <SectionCard
                icon={<img src={AutomationIcon} alt="" className="w-6 h-6" />}
                title="Automation"
                description="Define the automation."
              >
                <div ref={automationSectionRef} className="flex flex-col gap-4 w-full">
                  {fieldErrors.automation && (
                    <p className="text-[12px] text-red-600">
                      {fieldErrors.automation}
                    </p>
                  )}
                  <div className="flex items-center gap-4 border-b border-[#E8E8E3] pb-0">
                    <div className="flex rounded-lg overflow-hidden border border-[#E8E8E3]">
                      {automationTabs.map((_, index) => {
                        const automationIdForTab =
                          strategy?.automations?.[index] != null
                            ? (strategy.automations[index] as { id?: number }).id
                            : undefined;
                        const canPreview =
                          !isCreateMode &&
                          strategy?.id != null &&
                          automationIdForTab != null;
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-1 px-3 py-1 text-[14px] border-l border-[#E8E8E3] first:border-l-0 ${
                              activeAutomationTab === index
                                ? "bg-[#136D6D] text-[#F9F9F6]"
                                : "bg-white text-neutral-n300"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveAutomationTab(index)}
                              className="py-0.5"
                            >
                              Automation {index + 1}
                            </button>
                            {canPreview && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewOpen(true);
                                  setPreviewLoading(true);
                                  setPreviewError(null);
                                  setPreviewResults([]);
                                  setPreviewSummary("");
                                  strategiesService
                                    .getAutomationPreview(
                                      strategy!.id,
                                      automationIdForTab!,
                                    )
                                    .then((res) => {
                                      setPreviewResults(res.results ?? []);
                                      setPreviewSummary(res.summary ?? "");
                                    })
                                    .catch((err: unknown) => {
                                      const msg =
                                        (err as { response?: { data?: { summary?: string } } })?.response?.data?.summary ??
                                        (err as Error)?.message ??
                                        "Failed to load preview.";
                                      setPreviewError(msg);
                                      setPreviewResults([]);
                                      setPreviewSummary("");
                                    })
                                    .finally(() => setPreviewLoading(false));
                                }}
                                className="py-0.5 px-1 rounded hover:bg-black/20 focus:outline-none text-[12px] underline"
                                aria-label={`Preview automation ${index + 1}`}
                              >
                                Preview
                              </button>
                            )}
                            {automationTabs.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAutomationTabs((prev) => {
                                    const next = prev.filter(
                                      (_, i) => i !== index,
                                    );
                                    return next;
                                  });
                                  setActiveAutomationTab((prev) => {
                                    if (prev === index)
                                      return Math.max(0, index - 1);
                                    if (prev > index) return prev - 1;
                                    return prev;
                                  });
                                }}
                                className="p-0.5 rounded hover:bg-black/20 focus:outline-none"
                                aria-label="Close tab"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAutomationTabs((prev) => [
                          ...prev,
                          {
                            entity: "Campaign",
                            filters: [],
                            actionState: DEFAULT_ACTION_STATE,
                            scheduleState: DEFAULT_SCHEDULE_STATE,
                          },
                        ]);
                        setActiveAutomationTab(automationTabs.length);
                      }}
                      className="flex justify-start items-center gap-2 cursor-pointer text-[#072929] hover:opacity-80"
                    >
                      <img
                        src={PlusIcon}
                        alt="add automation"
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium leading-5 tracking-tight">
                        Add
                      </span>
                    </button>
                  </div>
                  <div className="w-full">
                    <StrategyAutomation
                      key={activeAutomationTab}
                      profile={firstSelectedProfile ?? null}
                      entity={currentAutomation?.entity ?? "Campaign"}
                      filters={currentAutomation?.filters ?? []}
                      actionState={(() => {
                        const raw =
                          currentAutomation?.actionState ??
                          DEFAULT_ACTION_STATE;
                        return {
                          ...DEFAULT_ACTION_STATE,
                          ...raw,
                          adjustmentValueUnit:
                            raw.adjustmentValueUnit === "$" ? "$" : "%",
                        };
                      })()}
                      scheduleState={
                        currentAutomation?.scheduleState ??
                        DEFAULT_SCHEDULE_STATE
                      }
                      entityType={filterEntityType}
                      onEntityChange={(newEntity) => {
                        setAutomationTabs((prev) => {
                          const next = [...prev];
                          if (
                            activeAutomationTab < 0 ||
                            activeAutomationTab >= next.length
                          )
                            return prev;
                          next[activeAutomationTab] = {
                            ...next[activeAutomationTab],
                            entity: newEntity,
                          };
                          return next;
                        });
                      }}
                      onFiltersApply={(newFilters) => {
                        setAutomationTabs((prev) => {
                          const next = [...prev];
                          if (
                            activeAutomationTab < 0 ||
                            activeAutomationTab >= next.length
                          )
                            return prev;
                          next[activeAutomationTab] = {
                            ...next[activeAutomationTab],
                            filters: newFilters,
                          };
                          return next;
                        });
                      }}
                      onActionStateChange={(state) => {
                        setAutomationTabs((prev) => {
                          const next = [...prev];
                          if (
                            activeAutomationTab < 0 ||
                            activeAutomationTab >= next.length
                          )
                            return prev;
                          next[activeAutomationTab] = {
                            ...next[activeAutomationTab],
                            actionState: {
                              ...(next[activeAutomationTab].actionState ??
                                DEFAULT_ACTION_STATE),
                              ...state,
                            },
                          };
                          return next;
                        });
                      }}
                      onScheduleStateChange={(state) => {
                        setAutomationTabs((prev) => {
                          const next = [...prev];
                          if (
                            activeAutomationTab < 0 ||
                            activeAutomationTab >= next.length
                          )
                            return prev;
                          next[activeAutomationTab] = {
                            ...next[activeAutomationTab],
                            scheduleState: {
                              ...(next[activeAutomationTab].scheduleState ??
                                DEFAULT_SCHEDULE_STATE),
                              ...state,
                            },
                          };
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Date Range */}
              <SectionCard
                icon={<img src={DateIcon} alt="" className="w-6 h-6" />}
                title="Date Range"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4">
                    <FormField label="Minimum Data Window">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={minDataWindowDays}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setMinDataWindowDays(
                              !Number.isNaN(v) && v >= 1 ? v : 1,
                            );
                          }}
                          className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB] text-[14px] text-[#072929]"
                        />
                        <span className="text-[14px] text-[#072929]">days</span>
                      </div>
                    </FormField>
                    <FormField label="Minimum Spend Threshold">
                      <input
                        type="number"
                        min="0"
                        value={minSpendThreshold}
                        onChange={(e) => setMinSpendThreshold(e.target.value)}
                        placeholder="$500"
                        className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB]"
                      />
                    </FormField>
                  </div>
                  <div className="flex flex-wrap gap-6 items-center">
                    <Checkbox
                      checked={ignoreLast48Hours}
                      onChange={setIgnoreLast48Hours}
                      label="Ignore data from the last (hours)"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={ignoreLastHoursValue}
                        onChange={(e) =>
                          setIgnoreLastHoursValue(e.target.value)
                        }
                        disabled={!ignoreLast48Hours}
                        className="campaign-input w-[100px] h-12 rounded-[12px] px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <Checkbox
                      checked={ignoreCampaigns7Days}
                      onChange={setIgnoreCampaigns7Days}
                      label="Ignore campaigns created in the last days"
                    />
                    <input
                      type="number"
                      min="0"
                      value={ignoreCampaignsDaysValue}
                      onChange={(e) =>
                        setIgnoreCampaignsDaysValue(e.target.value)
                      }
                      disabled={!ignoreCampaigns7Days}
                      className="campaign-input w-[100px] h-12 rounded-[12px] px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <Checkbox
                      checked={excludeLearningCampaigns}
                      onChange={setExcludeLearningCampaigns}
                      label="Exclude campaigns in learning phase"
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Global Schedule */}
              <SectionCard
                icon={<img src={ScheduleIcon} alt="" className="w-6 h-6" />}
                title="Global Schedule"
                description="Applies to all automations unless overridden at the automation level."
              >
                <ScheduleFields
                  frequency={frequency}
                  onFrequencyChange={setFrequency}
                  runAt={runAt}
                  onRunAtChange={setRunAt}
                  runDays={runDays}
                  onToggleRunDay={toggleRunDay}
                />
              </SectionCard>

              {/* Approval Layer */}
              <SectionCard
                icon={<img src={ApprovalIcon} alt="" className="w-6 h-6" />}
                title="Approval Layer"
              >
                <div className="flex flex-wrap gap-6 items-center">
                  <Checkbox
                    checked={requireApprovalFirstRun}
                    onChange={setRequireApprovalFirstRun}
                    label="Require approval before first run"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={requireApprovalCampaignsOver}
                      onChange={setRequireApprovalCampaignsOver}
                      label="Require approval if affecting campaigns >"
                    />
                    <input
                      type="number"
                      min="0"
                      value={requireApprovalCampaignsOverValue}
                      onChange={(e) =>
                        setRequireApprovalCampaignsOverValue(e.target.value)
                      }
                      disabled={!requireApprovalCampaignsOver}
                      className="campaign-input w-[100px] h-12 rounded-[12px] px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={requireApprovalChangeExceeds}
                      onChange={setRequireApprovalChangeExceeds}
                      label="Require approval if change exceeds"
                    />
                    <input
                      type="number"
                      min="0"
                      value={requireApprovalChangeExceedsValue}
                      onChange={(e) =>
                        setRequireApprovalChangeExceedsValue(e.target.value)
                      }
                      disabled={!requireApprovalChangeExceeds}
                      className="campaign-input w-[100px] h-12 rounded-[12px] px-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <span className="text-[14px] text-[#072929]">%</span>
                  </div>
                </div>
              </SectionCard>

              {/* Footer */}
              {testCreateMessage && (
                <p
                  className={
                    testCreateMessage.startsWith("Error")
                      ? "text-[14px] text-red-600"
                      : "text-[14px] text-green-700"
                  }
                >
                  {testCreateMessage}
                </p>
              )}
              <div className="flex gap-3 justify-end pt-6 border-t border-[#E8E8E3]">
                <Link
                  to="/strategies"
                  className="cancel-button inline-flex items-center justify-center min-w-[80px] h-10 rounded-lg bg-[#F9F9F6] border border-[#e3e3e3] text-[#072929] text-[14px] font-medium"
                >
                  Cancel
                </Link>
                {isCreateMode && (
                  <>
                    <button
                      type="button"
                      onClick={handleFillFormAndCreate}
                      disabled={fillAndCreatePending || isPending}
                      className="h-10 px-4 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-[14px] font-medium hover:bg-emerald-200 disabled:opacity-50"
                    >
                      {fillAndCreatePending
                        ? "Creating..."
                        : "Fill form & create"}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestCreateApi}
                      disabled={testCreatePending}
                      className="h-10 px-4 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-[14px] font-medium hover:bg-amber-200 disabled:opacity-50"
                    >
                      {testCreatePending ? "Testing..." : "Test Create API"}
                    </button>
                  </>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="create-entity-button h-10 px-4 rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)]"
                >
                  {isPending ? "Saving..." : submitLabel}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Preview automation results modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-automation-title-detail"
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="preview-automation-title-detail"
              className="text-[17.1px] font-semibold text-[#072929] mb-4"
            >
              Preview automation results
            </h3>
            {previewLoading ? (
              <div className="mb-6 py-8 text-center text-[12.16px] text-forest-f30">
                Loading preview...
              </div>
            ) : previewError ? (
              <div className="mb-6 py-4 px-4 bg-red-r0 border border-red-r30 rounded-lg text-[12.16px] text-red-r30">
                {previewError}
              </div>
            ) : (
              <>
                <div className="bg-[#f5f5f0] border border-[#e8e8e3] rounded-lg p-4 mb-4">
                  <span className="text-[12.16px] text-forest-f30">
                    {previewSummary || "No entities would be updated."}
                  </span>
                </div>
                {previewResults.length > 0 ? (
                  <div className="mb-6">
                    <div className="mb-2 text-[10.64px] text-forest-f30">
                      {previewResults.length > 10
                        ? `Showing 10 of ${previewResults.length} entities`
                        : `${previewResults.length} entit${previewResults.length !== 1 ? "ies" : "y"} would be updated`}
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full table-fixed">
                        <thead className="bg-[#f5f5f0]">
                          <tr>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[28%] max-w-[200px]">
                              Entity
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[18%]">
                              Column
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[27%]">
                              Old value
                            </th>
                            <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-forest-f30 uppercase w-[27%]">
                              New value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(previewResults.length > 10
                            ? previewResults.slice(0, 10)
                            : previewResults
                          ).map((row, i) => {
                            const isBudgetOrBid =
                              row.column === "Budget" || row.column === "Bid";
                            const numOld = isBudgetOrBid
                              ? parseFloat(String(row.old_value))
                              : NaN;
                            const numNew = isBudgetOrBid
                              ? parseFloat(String(row.new_value))
                              : NaN;
                            const oldDisplay =
                              isBudgetOrBid && !Number.isNaN(numOld)
                                ? formatCurrency(numOld)
                                : row.old_value;
                            const newDisplay =
                              isBudgetOrBid && !Number.isNaN(numNew)
                                ? formatCurrency(numNew)
                                : row.new_value;
                            return (
                              <tr
                                key={`${row.entity_name}-${i}`}
                                className="border-b border-gray-200 last:border-b-0"
                              >
                                <td className="px-4 py-2 text-[10.64px] text-forest-f60 max-w-[200px] truncate" title={row.entity_name}>
                                  {row.entity_name}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-forest-f30">
                                  {row.column}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] text-forest-f30">
                                  {oldDisplay}
                                </td>
                                <td className="px-4 py-2 text-[10.64px] font-semibold text-forest-f60">
                                  {newDisplay}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 py-4 text-[12.16px] text-forest-f30">
                    No entities match the automation filters.
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="cancel-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
