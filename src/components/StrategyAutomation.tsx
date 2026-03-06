import React, { useMemo } from "react";
import { DynamicFilterPanel, type FilterValues } from "./filters/DynamicFilterPanel";
import { Dropdown, Checkbox } from "./ui";
import { ScheduleFields } from "./ScheduleFields";

export type { FilterValues };

export interface StrategyAutomationProfile {
  accountId: string | number;
  channelId: string | number;
}

/** Action section state stored per automation tab so it persists when switching tabs. */
export interface AutomationActionState {
  action: string;
  adjustmentValue: string;
  adjustmentValueUnit: "%" | "$";
  actionLimitValue: string;
}

export const DEFAULT_ACTION_STATE: AutomationActionState = {
  action: "",
  adjustmentValue: "",
  adjustmentValueUnit: "%",
  actionLimitValue: "",
};

/** Schedule (optional) state per automation tab. */
export interface AutomationScheduleState {
  scheduleEnabled: boolean;
  frequency: string;
  runAt: string;
  runDays: number[];
}

export const DEFAULT_SCHEDULE_STATE: AutomationScheduleState = {
  scheduleEnabled: false,
  frequency: "Weekly",
  runAt: "00:00",
  runDays: [0, 2, 3],
};

export interface StrategyAutomationProps {
  /** Selected profile for this automation (needed for filter fields). Null shows "Select a profile" message. */
  profile: StrategyAutomationProfile | null;
  entity: string;
  filters: FilterValues;
  /** API entity_type for dynamic filters (e.g. "campaigns", "adgroups"). */
  entityType: string;
  /** Action section state (stored per tab in parent). */
  actionState: AutomationActionState;
  /** Schedule (optional) state per tab. */
  scheduleState: AutomationScheduleState;
  onEntityChange: (entity: string) => void;
  onFiltersApply: (filters: FilterValues) => void;
  onActionStateChange: (state: Partial<AutomationActionState>) => void;
  onScheduleStateChange: (state: Partial<AutomationScheduleState>) => void;
}

const ENTITY_OPTIONS = [
  { value: "Campaign", label: "Campaign" },
  { value: "Ad Group", label: "Ad Group" },
  { value: "Keyword", label: "Keyword" },
  { value: "Ads", label: "Ads" },
] as const;

const ALL_ACTION_OPTIONS = [
  { value: "pause", label: "Pause" },
  { value: "enable", label: "Enable" },
  { value: "increase_budget", label: "Increase budget" },
  { value: "decrease_budget", label: "Decrease budget" },
  { value: "increase_bid", label: "Increase bid" },
  { value: "decrease_bid", label: "Decrease bid" },
] as const;

/**
 * Body for a single strategy automation tab: entity selector, filters, and actions.
 * Render with a stable key per tab (e.g. key={tabIndex}) so each tab has isolated state.
 */
export const StrategyAutomation: React.FC<StrategyAutomationProps> = ({
  profile,
  entity,
  filters,
  entityType,
  actionState,
  scheduleState,
  onEntityChange,
  onFiltersApply,
  onActionStateChange,
  onScheduleStateChange,
}) => {
  const { action, adjustmentValue, actionLimitValue } = actionState;
  const adjustmentValueUnit = actionState.adjustmentValueUnit === "$" ? "$" : "%";
  const { scheduleEnabled, frequency, runAt, runDays } = scheduleState;

  const isIncreaseAction = action === "increase_bid" || action === "increase_budget";
  const isDecreaseAction = action === "decrease_bid" || action === "decrease_budget";
  const showActionInputs = isIncreaseAction || isDecreaseAction;

  const actionOptions = useMemo(() => {
    if (entity === "Campaign") {
      return ALL_ACTION_OPTIONS.filter(
        (o) => o.value !== "increase_bid" && o.value !== "decrease_bid"
      );
    }
    return ALL_ACTION_OPTIONS.filter(
      (o) => o.value !== "increase_budget" && o.value !== "decrease_budget"
    );
  }, [entity]);

  if (!profile) {
    return (
      <p className="text-[14px] text-[#506766]">
        Select a profile to add filters
      </p>
    );
  }

  return (
    <div className="w-full self-stretch flex flex-col justify-center items-start gap-4">
      {/* Entity dropdown */}
      <div className="w-full flex flex-col gap-1 max-w-[360px]">
        <label className="text-[16px] font-medium text-text-primary">Entity</label>
        <Dropdown
          options={[...ENTITY_OPTIONS]}
          value={entity}
          onChange={(value) => onEntityChange(value)}
          placeholder="Select entity"
          buttonClassName="campaign-input w-full h-12 rounded-[12px] px-3 border border-border-default bg-background-field flex items-center justify-between"
          width="w-full"
          showCheckmark={true}
          closeOnSelect={true}
        />
      </div>
      {/* Filters – no border around container per Figma */}
      <DynamicFilterPanel
        isOpen={true}
        onClose={() => {}}
        onApply={onFiltersApply}
        initialFilters={filters}
        accountId={String(profile.accountId)}
        marketplace="google_adwords"
        entityType={entityType}
        channelId={profile.channelId}
        variant="rows"
        className="border-0 rounded-none shadow-none bg-transparent p-0 [&_.form-label-small]:text-[14px] [&_.form-label-small]:font-medium [&_.form-label-small]:text-text-primary"
      />
      {/* Actions section */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-[180px] max-w-[280px]">
            <label className="text-[16px] font-medium text-text-primary">Action</label>
            <Dropdown
              options={actionOptions}
              value={action}
              onChange={(value) => onActionStateChange({ action: value })}
              placeholder="Select action"
              buttonClassName="campaign-input w-full h-12 rounded-xl px-3 border border-border-default bg-background-field flex items-center justify-between text-sm text-text-primary"
              width="w-full"
              showCheckmark={true}
              closeOnSelect={true}
            />
          </div>
          {showActionInputs && (
            <>
              <div className="flex flex-col gap-1 min-w-[140px] flex-1 max-w-[200px]">
                <label className="text-[14px] font-medium text-text-primary">
                  Adjustment Value
                </label>
                <div className="flex h-10 rounded-[12px] border border-[#e3e3e3] bg-[#FEFEFB] overflow-hidden transition-colors focus-within:border focus-within:border-[#136D6D]">
                  <input
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) =>
                      onActionStateChange({ adjustmentValue: e.target.value })
                    }
                    placeholder={isIncreaseAction ? "20" : "10"}
                    className="flex-1 min-w-0 border-0 rounded-none h-full text-[12px] px-3 outline-none bg-transparent text-[#072929]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onActionStateChange({
                        adjustmentValueUnit: adjustmentValueUnit === "%" ? "$" : "%",
                      })
                    }
                    className="flex items-center justify-center px-3 text-[14px] font-medium text-[#072929] border-l border-[#E8E8E3] h-full min-w-[44px] hover:bg-[#f5f5f0] transition-colors shrink-0"
                    aria-label={`Unit: ${adjustmentValueUnit}. Click to switch to ${adjustmentValueUnit === "%" ? "$" : "%"}.`}
                  >
                    {adjustmentValueUnit}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-[120px] flex-1 max-w-[180px]">
                <div className="text-[14px] font-medium text-text-primary">
                  {isIncreaseAction ? "Max Cap (Optional)" : "Floor (Optional)"}
                </div>
                <input
                  type="number"
                  value={actionLimitValue}
                  onChange={(e) =>
                    onActionStateChange({ actionLimitValue: e.target.value })
                  }
                  placeholder={isIncreaseAction ? "e.g. 500" : "e.g. 50"}
                  className="campaign-input w-full h-10 rounded-[12px] px-3 border border-border-default bg-background-field text-text-primary text-[12px]"
                />
              </div>
            </>
          )}
        </div>
      </div>
      {/* Schedule (Optional) */}
      <div className="w-full flex flex-col gap-3">
        <Checkbox
          checked={scheduleEnabled}
          onChange={(checked) => onScheduleStateChange({ scheduleEnabled: checked })}
          label="Schedule (Optional)"
        />
        {scheduleEnabled && (
          <ScheduleFields
            frequency={frequency}
            onFrequencyChange={(value) => onScheduleStateChange({ frequency: value })}
            runAt={runAt}
            onRunAtChange={(value) => onScheduleStateChange({ runAt: value })}
            runDays={runDays}
            onToggleRunDay={(dayIndex) => {
              const next = runDays.includes(dayIndex)
                ? runDays.filter((d) => d !== dayIndex)
                : [...runDays, dayIndex];
              onScheduleStateChange({ runDays: next });
            }}
          />
        )}
      </div>
    </div>
  );
};
