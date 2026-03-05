import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useSidebar } from "../contexts/SidebarContext";
import { useStrategy, useAutomations } from "../hooks/queries/useStrategies";
import { useCreateStrategy, useUpdateStrategy } from "../hooks/mutations/useStrategyMutations";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Checkbox, Dropdown } from "../components/ui";
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
import type { CreateStrategyData } from "../services/strategies";
import { accountsService } from "../services/accounts";
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

/** Normalize API/label time (e.g. "12:00 AM") to HH:mm for <input type="time"> */
function normalizeTimeForInput(value: string): string {
  const s = value.trim();
  const match12h = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12h) {
    let h = parseInt(match12h[1], 10);
    const m = match12h[2];
    const ampm = (match12h[3] ?? "").toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const match24h = s.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    const h = String(parseInt(match24h[1], 10) % 24).padStart(2, "0");
    const m = String(parseInt(match24h[2], 10) % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  return "00:00";
}

const STATE_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Enable", label: "Enable" },
  { value: "Pause", label: "Pause" },
] as const;

type ProfileOption = Awaited<
  ReturnType<typeof accountsService.getAllAccessibleProfiles>
>[number];

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
    {description && (
          <p className="text-[14px] text-[#072929]">{description}</p>
        )}
    {children}
  </div>
);

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = "" }) => (
  <div className={`flex flex-col gap-1 w-full max-w-[360px] ${className}`}>
    <label className="text-[16px] font-medium text-[#072929]">{label}</label>
    {children}
  </div>
);

export const StrategyDetail: React.FC = () => {
  const { strategyId } = useParams<{ strategyId: string }>();
  const isCreateMode = strategyId === "new";
  const id = strategyId && !isCreateMode ? parseInt(strategyId, 10) : undefined;
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { strategy, isLoading: strategyLoading, isError, error } = useStrategy(
    isCreateMode ? undefined : id
  );
  const { automations, isLoading: automationsLoading } = useAutomations(id);
  const createStrategyMutation = useCreateStrategy();
  const updateStrategyMutation = useUpdateStrategy(id ?? 0);

  const [optimizationGoal, setOptimizationGoal] = useState<string>("");
  const [customOptimizationText, setCustomOptimizationText] = useState("");
  const [formName, setFormName] = useState("");
  const [formState, setFormState] = useState("Draft");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [allProfiles, setAllProfiles] = useState<ProfileOption[] | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [maxChangePerDay, setMaxChangePerDay] = useState("");
  const [maxChangePerWeek, setMaxChangePerWeek] = useState("");
  const [maxChangePerDayUnit, setMaxChangePerDayUnit] = useState<"%" | "$">("%");
  const [maxChangePerWeekUnit, setMaxChangePerWeekUnit] = useState<"%" | "$">("$");
  const [minBudgetFloor, setMinBudgetFloor] = useState("");
  const [maxBudgetCap, setMaxBudgetCap] = useState("");
  const [minDataWindowDays, setMinDataWindowDays] = useState(30);
  const [minSpendThreshold, setMinSpendThreshold] = useState("");
  const [ignoreLast48Hours, setIgnoreLast48Hours] = useState(true);
  const [ignoreLastHoursValue, setIgnoreLastHoursValue] = useState("48");
  const [ignoreCampaigns7Days, setIgnoreCampaigns7Days] = useState(true);
  const [ignoreCampaignsDaysValue, setIgnoreCampaignsDaysValue] = useState("7");
  const [excludeLearningCampaigns, setExcludeLearningCampaigns] = useState(false);
  const [frequency, setFrequency] = useState("Weekly");
  const [runAt, setRunAt] = useState("00:00");
  const [runDays, setRunDays] = useState<number[]>([0, 2, 3]); // Mon, Wed, Thu
  const [requireApprovalFirstRun, setRequireApprovalFirstRun] = useState(false);
  const [requireApprovalCampaignsOver, setRequireApprovalCampaignsOver] = useState(false);
  const [requireApprovalCampaignsOverValue, setRequireApprovalCampaignsOverValue] = useState("20");
  const [requireApprovalChangeExceeds, setRequireApprovalChangeExceeds] = useState(false);
  const [requireApprovalChangeExceedsValue, setRequireApprovalChangeExceedsValue] = useState("25");
  const [formError, setFormError] = useState<string | null>(null);
  const [activeAutomationTab, setActiveAutomationTab] = useState(0);
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
    [runDays]
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
      case "Ads":
        return "ads";
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
      goal && !OPTIMIZATION_GOALS.includes(goal as (typeof OPTIMIZATION_GOALS)[number]);
    setOptimizationGoal(isCustomGoal ? "Custom Optimization" : goal);
    setCustomOptimizationText(isCustomGoal ? goal : "");
    setFormState(
      strategy.status === "Enabled" ? "Enable" : (strategy.status ?? "Draft")
    );
    setMaxChangePerDay(strategy.max_change_per_day ?? "");
    setMaxChangePerWeek(strategy.max_change_per_week ?? "");
    setMinDataWindowDays(
      strategy.min_data_window_days != null && strategy.min_data_window_days >= 1
        ? strategy.min_data_window_days
        : 30
    );
    setMinSpendThreshold(
      strategy.min_spend_threshold != null ? String(strategy.min_spend_threshold) : ""
    );
    setIgnoreLast48Hours(strategy.ignore_last_48_hours ?? true);
    setIgnoreCampaigns7Days(strategy.ignore_campaigns_in_last_7_days ?? true);
    setExcludeLearningCampaigns(strategy.exclude_learning_campaigns ?? false);
    setFrequency(strategy.frequency ?? "Weekly");
    setRunAt(normalizeTimeForInput(strategy.run_at ?? "00:00"));
    if (strategy.run_days && typeof strategy.run_days === "string") {
      const days = strategy.run_days
        .split(",")
        .map((s) => (WEEKDAYS as readonly string[]).indexOf(s.trim()))
        .filter((i) => i >= 0);
      if (days.length > 0) setRunDays(days);
    }
    if (strategy.profile_ids && strategy.profile_ids.length > 0) {
      setSelectedProfileIds(strategy.profile_ids.map(String));
    }
    if (strategy.automations && strategy.automations.length > 0) {
      setAutomationTabs(
        strategy.automations.map((a) => ({
          entity: a.entity ?? "Campaign",
          filters: (a.conditions ?? []) as unknown as FilterValues,
          actionState: {
            action: a.action ?? "",
            adjustmentValue: a.change_value != null ? String(a.change_value) : "",
            adjustmentValueUnit: a.change_unit === "absolute" ? "$" : "%",
            actionLimitValue:
              a.change_cap != null ? String(a.change_cap) : "",
          },
          scheduleState: {
            scheduleEnabled: a.schedule_enabled ?? false,
            frequency: a.schedule_frequency ?? "Weekly",
            runAt:
              typeof a.schedule_run_at === "string"
                ? a.schedule_run_at
                : "00:00",
            runDays: Array.isArray(a.schedule_run_days) ? a.schedule_run_days : [0, 2, 3],
          },
        }))
      );
    }
  }, [strategy]);

  const toggleRunDay = (dayIndex: number) => {
    setRunDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  // Fetch all accessible profiles (brand – integration – profile) for multi-select
  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    accountsService
      .getAllAccessibleProfiles()
      .then((list) => {
        if (!cancelled) setAllProfiles(list);
      })
      .finally(() => {
        if (!cancelled) setProfilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When editing, pre-select profiles linked to this strategy (profile_ids)
  useEffect(() => {
    if (!strategy?.profile_ids?.length || !allProfiles?.length) return;
    const profileIdSet = new Set(strategy.profile_ids.map(String));
    const ids = allProfiles
      .filter((p) => profileIdSet.has(p.id))
      .map((p) => p.id);
    setSelectedProfileIds((prev) => (prev.length === 0 ? ids : prev));
  }, [strategy?.profile_ids, allProfiles]);

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
      return () => document.removeEventListener("mousedown", handleClickOutside);
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
        p.profileName.toLowerCase().includes(q)
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
        prev.filter((id) => !filteredProfiles.some((p) => p.id === id))
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
        ? selectedProfileIds.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n))
        : undefined;
    const goalValue =
      optimizationGoal === "Custom Optimization"
        ? customOptimizationText.trim() || undefined
        : optimizationGoal.trim() || undefined;
    const automations = automationTabs.map((tab) => ({
      entity: tab.entity,
      action: tab.actionState.action || "pause",
      change_value: tab.actionState.adjustmentValue
        ? parseFloat(tab.actionState.adjustmentValue)
        : undefined,
      change_unit: tab.actionState.adjustmentValueUnit === "$" ? "absolute" : "percent",
      change_cap: tab.actionState.actionLimitValue
        ? parseFloat(tab.actionState.actionLimitValue)
        : undefined,
      conditions: (tab.filters as unknown) as Record<string, unknown>[],
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
    const payload: CreateStrategyData = {
      name: formName.trim(),
      goal: goalValue,
      status: formState === "Enable" ? "Enabled" : formState,
      max_change_per_day: maxChangePerDay.trim() || undefined,
      max_change_per_week: maxChangePerWeek.trim() || undefined,
      min_spend_threshold: minSpendThreshold ? parseFloat(minSpendThreshold) : undefined,
      min_data_window_days: minDataWindowDays,
      ignore_last_48_hours: ignoreLast48Hours,
      exclude_learning_campaigns: excludeLearningCampaigns,
      ignore_campaigns_in_last_7_days: ignoreCampaigns7Days,
      frequency,
      run_at: runAt,
      run_days: runDaysString,
      profile_ids: profileIds,
      automations,
    };
    return payload;
  };

  /** Returns an error message or null if valid. Used when status is Enable or Pause. */
  const validateBeforeEnableOrPause = (): string | null => {
    if (!formName.trim()) {
      return "Strategy name is required.";
    }
    if (selectedProfileIds.length === 0) {
      return "Select at least one profile (Brand / Integration / Profile).";
    }
    if (optimizationGoal === "Custom Optimization" && !customOptimizationText.trim()) {
      return "Enter a custom optimization goal.";
    }
    for (let t = 0; t < automationTabs.length; t++) {
      const tab = automationTabs[t];
      for (let i = 0; i < tab.filters.length; i++) {
        const f = tab.filters[i];
        const fieldSet = f.field != null && String(f.field).trim() !== "";
        const operatorSet = f.operator != null && String(f.operator).trim() !== "";
        let valueEmpty = f.value == null;
        if (!valueEmpty && typeof f.value === "string") valueEmpty = f.value.trim() === "";
        if (!valueEmpty && Array.isArray(f.value)) valueEmpty = f.value.length === 0;
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
        if (!fieldSet || !operatorSet || valueEmpty) {
          return `Automation ${t + 1}: complete all filter rows (field, operator, and value must be set).`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) {
      setFormError("Strategy name is required.");
      return;
    }
    const isEnableOrPause = formState === "Enable" || formState === "Pause";
    if (isEnableOrPause) {
      const validationError = validateBeforeEnableOrPause();
      if (validationError) {
        setFormError(validationError);
        return;
      }
    }
    const payload = buildPayload();
    try {
      if (isCreateMode) {
        const created = await createStrategyMutation.mutateAsync(payload);
        navigate(`/strategies/${created.id}`, { replace: true });
      } else if (id !== undefined && !isCreateMode) {
        await updateStrategyMutation.mutateAsync(payload);
        navigate(`/strategies/${id}`, { replace: true });
      }
    } catch (err: any) {
      setFormError(
        err?.response?.data?.name?.[0] ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to save strategy."
      );
    }
  };

  const isPending =
    createStrategyMutation.isPending || updateStrategyMutation.isPending;

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

  if (!isCreateMode && (isError || (!strategyLoading && id !== undefined && !strategy))) {
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

  const pageTitle = isCreateMode ? "Create Strategy" : (strategy?.name ?? "Edit Strategy");
  const submitLabel = isCreateMode ? "Create Strategy" : "Save";

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AccountsHeader />
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
          <div className="mb-6">
            <h1 className="text-[20px] sm:text-[22px] font-medium text-[#072929] leading-normal">
              {pageTitle}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] p-6 flex flex-col gap-6 w-full">
              {formError && (
                <p className="text-[14px] text-red-600">{formError}</p>
              )}

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
                      <span className="text-[13px] sm:text-[14px] lg:text-[16px] font-medium text-[#072929] min-w-0 text-left leading-tight max-h-[2.5em] overflow-hidden">
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
                  <FormField
                    label="Custom Optimization"
                    className="mt-2 max-w-full"
                  >
                    <input
                      type="text"
                      value={customOptimizationText}
                      onChange={(e) => setCustomOptimizationText(e.target.value)}
                      placeholder="Describe your optimization goal"
                      className="campaign-input h-12 rounded-[12px] px-3 border max-w-[360px] border-[#e3e3e3] bg-[#FEFEFB]"
                    />
                  </FormField>
                )}
              </SectionCard>

              {/* Strategy Details */}
              <SectionCard
                icon={<img src={StrategyDetailIcon} alt="" className="w-6 h-6" />}
                title="Strategy Details"
              >
                <div className="flex flex-wrap gap-4 w-full md:flex-nowrap">
                  <FormField label="Strategy Name" className="w-full md:flex-1 md:min-w-0">
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. High ACOS Protection"
                      className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB]"
                      required
                    />
                  </FormField>
                  <FormField label="State" className="w-full md:flex-1 md:min-w-0">
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
                  <FormField label="Brand / Integration / Profile" className="w-full md:flex-1 md:min-w-0">
                    <div className="relative w-full" ref={profileDropdownRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setProfileDropdownOpen((open) => !open)
                        }
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
                                          prev.filter((x) => x !== id)
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedProfileIds((prev) =>
                                            prev.filter((x) => x !== id)
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
                              {profilesLoading
                                ? "Loading…"
                                : "Select profile"}
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
                              onChange={(e) =>
                                setProfileSearch(e.target.value)
                              }
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
                              Select All (
                              {selectedProfileIds.length}/
                              {allProfiles?.length ?? 0})
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
                                        : [...prev, p.id]
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedProfileIds((prev) =>
                                        prev.includes(p.id)
                                          ? prev.filter((x) => x !== p.id)
                                          : [...prev, p.id]
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
                                      checked={selectedProfileIds.includes(p.id)}
                                      onChange={(checked) => {
                                        if (checked) {
                                          setSelectedProfileIds((prev) => [
                                            ...prev,
                                            p.id,
                                          ]);
                                        } else {
                                          setSelectedProfileIds((prev) =>
                                            prev.filter((x) => x !== p.id)
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
                  <FormField label="Max Change Per Day" className="flex-1 min-w-0 max-w-[180px]">
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
                        onClick={() => setMaxChangePerDayUnit((u) => (u === "%" ? "$" : "%"))}
                        className="flex items-center justify-center px-3 text-[14px] text-[#072929] border-l border-[#E8E8E3] h-full min-w-[44px] hover:bg-[#f5f5f0] transition-colors"
                      >
                        {maxChangePerDayUnit}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Max Change Per Week" className="flex-1 min-w-0 max-w-[180px]">
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
                        onClick={() => setMaxChangePerWeekUnit((u) => (u === "%" ? "$" : "%"))}
                        className="flex items-center justify-center px-3 text-[14px] text-[#072929] border-l border-[#E8E8E3] h-full min-w-[44px] hover:bg-[#f5f5f0] transition-colors"
                      >
                        {maxChangePerWeekUnit}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Minimum Budget Floor" className="flex-1 min-w-0 max-w-[180px]">
                    <input
                      type="number"
                      value={minBudgetFloor}
                      onChange={(e) => setMinBudgetFloor(e.target.value)}
                      placeholder="$50"
                      className="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB]"
                    />
                  </FormField>
                  <FormField label="Maximum Budget Cap" className="flex-1 min-w-0 max-w-[180px]">
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
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex items-center gap-4 border-b border-[#E8E8E3] pb-0">
                    <div className="flex rounded-lg overflow-hidden border border-[#E8E8E3]">
                      {automationTabs.map((_, index) => (
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
                          {automationTabs.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAutomationTabs((prev) => {
                                  const next = prev.filter((_, i) => i !== index);
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
                      ))}
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
                      <img src={PlusIcon} alt="add automation" className="w-5 h-5" />
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
                      actionState={
                        currentAutomation?.actionState ?? DEFAULT_ACTION_STATE
                      }
                      scheduleState={
                        currentAutomation?.scheduleState ?? DEFAULT_SCHEDULE_STATE
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
                              !Number.isNaN(v) && v >= 1 ? v : 1
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
                        onChange={(e) => setIgnoreLastHoursValue(e.target.value)}
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
                      onChange={(e) => setIgnoreCampaignsDaysValue(e.target.value)}
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
              <div className="flex gap-3 justify-end pt-6 border-t border-[#E8E8E3]">
                <Link
                  to="/strategies"
                  className="cancel-button inline-flex items-center justify-center min-w-[80px] h-10 rounded-lg bg-[#F9F9F6] border border-[#e3e3e3] text-[#072929] text-[14px] font-medium"
                >
                  Cancel
                </Link>
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
    </div>
  );
};
