import React, { useState, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Dropdown } from "../ui/Dropdown";
import {
  type AudienceRule,
  type AudienceRuleSet,
  type AudienceRuleRule,
  type AudienceRuleEventSource,
  type AudienceRuleEventSourceType,
  type AudienceRuleFilterSet,
  type AudienceRuleFilter,
  type AudienceRuleAggregation,
  getDefaultAudienceRule,
} from "../../types/meta";

/** Optional lists of source IDs per type for dropdown selection. When provided, event source ID is chosen via dropdown instead of text input. */
export interface EventSourceIdOptions {
  pixel?: Array<{ id: string; name: string }>;
  app?: Array<{ id: string; name: string }>;
  video?: Array<{ id: string; name: string }>;
  page?: Array<{ id: string; name: string }>;
  lead?: Array<{ id: string; name: string }>;
  ig_lead_generation?: Array<{ id: string; name: string }>;
  canvas?: Array<{ id: string; name: string }>;
  shopping_page?: Array<{ id: string; name: string }>;
  shopping_ig?: Array<{ id: string; name: string }>;
  offline_events?: Array<{ id: string; name: string }>;
  store_visits?: Array<{ id: string; name: string }>;
}
import { cn } from "../../lib/cn";

const inputClass = "campaign-input w-full";
const dropdownButtonClass = "edit-button w-full";
const MAX_RULES_TOTAL = 10;
const MAX_FILTERS_PER_RULE = 100;
const RETENTION_SECONDS_MAX = 365 * 86400; // 365 days
const SECONDS_PER_DAY = 86400;

/** All event source types supported by Meta; subset is shown per audience subtype. */
const ALL_EVENT_SOURCE_TYPES: { value: AudienceRuleEventSourceType; label: string }[] = [
  { value: "pixel", label: "Pixel" },
  { value: "app", label: "App" },
  { value: "page", label: "Page" },
  { value: "video", label: "Video" },
  { value: "lead", label: "Lead form" },
  { value: "ig_lead_generation", label: "Instagram lead" },
  { value: "canvas", label: "Canvas" },
  { value: "shopping_page", label: "Shopping (FB)" },
  { value: "shopping_ig", label: "Shopping (IG)" },
  { value: "offline_events", label: "Offline events" },
  { value: "store_visits", label: "Store visits" },
];

/** Audience subtype → allowed event_sources.type. Used to show only relevant source types in the Type dropdown. */
export type AudienceSubtypeSourceType = "website" | "app" | "engagement" | "offline_conversion";

const EVENT_SOURCE_TYPES_BY_SUBTYPE: Record<AudienceSubtypeSourceType, AudienceRuleEventSourceType[]> = {
  website: ["pixel"],
  app: ["app"],
  engagement: ["page", "video", "lead", "ig_lead_generation", "canvas", "shopping_page", "shopping_ig", "store_visits"],
  offline_conversion: ["offline_events", "store_visits"],
};

function getEventSourceTypesForSubtype(sourceType: AudienceSubtypeSourceType): { value: AudienceRuleEventSourceType; label: string }[] {
  const allowed = EVENT_SOURCE_TYPES_BY_SUBTYPE[sourceType] ?? EVENT_SOURCE_TYPES_BY_SUBTYPE.website;
  return ALL_EVENT_SOURCE_TYPES.filter((t) => allowed.includes(t.value));
}

const WEBSITE_FILTER_FIELDS = [
  { value: "event", label: "Event" },
  { value: "url", label: "URL" },
  { value: "domain", label: "Domain" },
  { value: "path", label: "Path" },
  { value: "device_type", label: "Device type" },
  { value: "price", label: "Price" },
  { value: "customData", label: "Custom data" },
];

const APP_FILTER_FIELDS = [
  { value: "event", label: "Event" },
  { value: "_appVersion", label: "App version" },
  { value: "_value", label: "Value" },
  { value: "customData", label: "Custom data" },
];

const ENGAGEMENT_FILTER_FIELDS = [
  { value: "event", label: "Event" },
  { value: "view_time", label: "View time" },
  { value: "reaction_type", label: "Reaction type" },
  { value: "post_id", label: "Post ID" },
  { value: "video_id", label: "Video ID" },
];

const FILTER_OPERATORS = [
  { value: "=", label: "Equals" },
  { value: "eq", label: "Equals" },
  { value: "!=", label: "Not equals" },
  { value: "is_any", label: "Is any" },
  { value: "is_not_any", label: "Is not any" },
  { value: "i_is_any", label: "Is any (case insensitive)" },
  { value: "i_is_not_any", label: "Is not any (case insensitive)" },
  { value: ">", label: "Greater than" },
  { value: ">=", label: "Greater or equal" },
  { value: "<", label: "Less than" },
  { value: "<=", label: "Less or equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "i_contains", label: "Contains (case insensitive)" },
  { value: "i_not_contains", label: "Does not contain (case insensitive)" },
  { value: "starts_with", label: "Starts with" },
  { value: "i_starts_with", label: "Starts with (case insensitive)" },
  { value: "regex_match", label: "Regex match" },
];

const AGGREGATION_METHODS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "absolute", label: "Absolute" },
  { value: "percentile", label: "Percentile" },
];

function getFilterFieldsForSourceType(sourceType: AudienceSubtypeSourceType) {
  if (sourceType === "app") return APP_FILTER_FIELDS;
  if (sourceType === "engagement" || sourceType === "offline_conversion") return ENGAGEMENT_FILTER_FIELDS;
  return WEBSITE_FILTER_FIELDS;
}

function getEventSourcePlaceholder(type: AudienceRuleEventSourceType): string {
  switch (type) {
    case "pixel":
      return "Pixel ID";
    case "app":
      return "App ID";
    case "page":
      return "Page ID";
    case "video":
      return "Video ID";
    case "lead":
      return "Lead form ID";
    case "ig_lead_generation":
      return "Instagram lead form ID";
    case "canvas":
      return "Canvas ID";
    case "shopping_page":
      return "Shop page ID";
    case "shopping_ig":
      return "Instagram shopping ID";
    case "offline_events":
      return "Offline event set ID";
    case "store_visits":
      return "Source ID";
    default:
      return "ID";
  }
}

interface EventSourceRowProps {
  source: AudienceRuleEventSource;
  sourceType: AudienceSubtypeSourceType;
  eventSourceIdOptions?: EventSourceIdOptions;
  onChange: (source: AudienceRuleEventSource) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

function EventSourceRow({
  source,
  sourceType,
  eventSourceIdOptions,
  onChange,
  onRemove,
  disabled,
}: EventSourceRowProps) {
  const allowedEventSourceTypes = getEventSourceTypesForSubtype(sourceType);
  const currentTypeValid = allowedEventSourceTypes.some((t) => t.value === source.type);
  const firstAllowedType = allowedEventSourceTypes[0]?.value ?? "pixel";
  const displayType = currentTypeValid ? source.type : firstAllowedType;

  // When subtype only allows certain types, coerce invalid source type to first allowed
  React.useEffect(() => {
    if (!currentTypeValid && firstAllowedType && source.type !== firstAllowedType) {
      onChange({ ...source, type: firstAllowedType });
    }
  }, [sourceType, firstAllowedType]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionsForType = eventSourceIdOptions?.[source.type];
  const hasOptions = Array.isArray(optionsForType) && optionsForType.length > 0;
  const dropdownOptions = hasOptions
    ? [
        ...optionsForType.map((o) => ({ value: o.id, label: o.name ? `${o.name} (${o.id})` : o.id })),
        { value: CUSTOM_SOURCE_ID_VALUE, label: "Custom ID..." },
      ]
    : [];
  const isCustomId = hasOptions && (source.id === "" || !optionsForType!.some((o) => o.id === source.id));
  const selectedValue = hasOptions
    ? isCustomId
      ? CUSTOM_SOURCE_ID_VALUE
      : source.id
    : source.id;

  return (
    <div className="flex gap-2 items-end mb-2 flex-wrap">
      <div className={hasOptions ? "w-[220px]" : "w-[180px]"}>
        {hasOptions ? (
          <>
            <label className="form-label-small">Source</label>
            <Dropdown<string>
              options={dropdownOptions}
              value={selectedValue}
              placeholder={`Select ${getEventSourcePlaceholder(source.type)}`}
              onChange={(val) => {
                if (val === CUSTOM_SOURCE_ID_VALUE) {
                  onChange({ ...source, id: "" });
                } else if (val != null) {
                  onChange({ ...source, id: val });
                }
              }}
              buttonClassName={dropdownButtonClass}
              disabled={disabled}
              searchable={dropdownOptions.length > 8}
              searchPlaceholder="Search..."
            />
            {selectedValue === CUSTOM_SOURCE_ID_VALUE && (
              <input
                type="text"
                value={source.id}
                onChange={(e) => onChange({ ...source, id: e.target.value })}
                placeholder={getEventSourcePlaceholder(source.type)}
                className={cn(inputClass, "mt-2")}
                disabled={disabled}
              />
            )}
          </>
        ) : (
          <>
            <label className="form-label-small">Source ID</label>
            <input
              type="text"
              value={source.id}
              onChange={(e) => onChange({ ...source, id: e.target.value })}
              placeholder={getEventSourcePlaceholder(source.type)}
              className={inputClass}
              disabled={disabled}
            />
          </>
        )}
      </div>
      <div className="w-[140px]">
        <label className="form-label-small">Type</label>
        <Dropdown<AudienceRuleEventSourceType>
          options={allowedEventSourceTypes}
          value={displayType}
          onChange={(val) => val != null && onChange({ ...source, type: val })}
          buttonClassName={dropdownButtonClass}
          disabled={disabled}
        />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-1 text-[#556179] hover:text-red-r30 h-[40px] flex items-center"
          aria-label="Remove source"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const AGGREGATION_TYPES_WEBSITE = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "time_spent", label: "Time spent" },
  { value: "last_event_time_field", label: "Last event time" },
];

const AGGREGATION_TYPES_APP = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

function createEmptyEventSource(sourceType: AudienceSubtypeSourceType): AudienceRuleEventSource {
  const allowed = EVENT_SOURCE_TYPES_BY_SUBTYPE[sourceType] ?? EVENT_SOURCE_TYPES_BY_SUBTYPE.website;
  const firstType = allowed[0] ?? "pixel";
  return { id: "", type: firstType };
}

function createEmptyFilter(): AudienceRuleFilter {
  return { field: "event", operator: "=", value: "" };
}

function createEmptyFilterSet(): AudienceRuleFilterSet {
  return { operator: "and", filters: [createEmptyFilter()] };
}

function createEmptyRule(sourceType: AudienceSubtypeSourceType): AudienceRuleRule {
  return {
    event_sources: [createEmptyEventSource(sourceType)],
    retention_seconds: 30 * SECONDS_PER_DAY,
    filter: createEmptyFilterSet(),
  };
}

export interface CustomAudienceRuleBuilderProps {
  value: AudienceRule | null;
  onChange: (rule: AudienceRule | null) => void;
  disabled?: boolean;
  /** Audience subtype for rule builder: determines which event source types (pixel, app, video, etc.) are shown. */
  sourceType?: AudienceSubtypeSourceType;
  /** When provided, event source ID is selected via dropdown (e.g. pixels for website, apps for app). */
  eventSourceIdOptions?: EventSourceIdOptions;
}

export const CustomAudienceRuleBuilder: React.FC<CustomAudienceRuleBuilderProps> = ({
  value,
  onChange,
  disabled = false,
  sourceType = "website",
  eventSourceIdOptions,
}) => {
  const rule = value ?? getDefaultAudienceRule();
  const totalRules = rule.inclusions.rules.length + rule.exclusions.rules.length;

  const updateInclusions = useCallback(
    (next: AudienceRuleSet) => {
      onChange({ ...rule, inclusions: next });
    },
    [rule, onChange]
  );

  const updateExclusions = useCallback(
    (next: AudienceRuleSet) => {
      onChange({ ...rule, exclusions: next });
    },
    [rule, onChange]
  );

  const addRuleToSet = useCallback(
    (setKey: "inclusions" | "exclusions") => {
      if (totalRules >= MAX_RULES_TOTAL) return;
      const set = setKey === "inclusions" ? rule.inclusions : rule.exclusions;
      const nextRules = [...set.rules, createEmptyRule(sourceType)];
      const nextSet = { ...set, rules: nextRules };
      if (setKey === "inclusions") updateInclusions(nextSet);
      else updateExclusions(nextSet);
    },
    [rule, totalRules, sourceType, updateInclusions, updateExclusions]
  );

  const removeRule = useCallback(
    (setKey: "inclusions" | "exclusions", index: number) => {
      const set = setKey === "inclusions" ? rule.inclusions : rule.exclusions;
      const nextRules = set.rules.filter((_, i) => i !== index);
      const nextSet = { ...set, rules: nextRules };
      if (setKey === "inclusions") updateInclusions(nextSet);
      else updateExclusions(nextSet);
    },
    [rule, updateInclusions, updateExclusions]
  );

  const updateRule = useCallback(
    (setKey: "inclusions" | "exclusions", index: number, nextRule: AudienceRuleRule) => {
      const set = setKey === "inclusions" ? rule.inclusions : rule.exclusions;
      const nextRules = set.rules.map((r, i) => (i === index ? nextRule : r));
      const nextSet = { ...set, rules: nextRules };
      if (setKey === "inclusions") updateInclusions(nextSet);
      else updateExclusions(nextSet);
    },
    [rule, updateInclusions, updateExclusions]
  );

  const setSetOperator = useCallback(
    (setKey: "inclusions" | "exclusions", operator: "and" | "or") => {
      const set = setKey === "inclusions" ? rule.inclusions : rule.exclusions;
      const nextSet = { ...set, operator };
      if (setKey === "inclusions") updateInclusions(nextSet);
      else updateExclusions(nextSet);
    },
    [rule, updateInclusions, updateExclusions]
  );

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <p className="text-[11px] text-[#556179]">
          Inclusion/exclusion criteria for website or app audiences. Max {MAX_RULES_TOTAL} rules total, max {MAX_FILTERS_PER_RULE} filters per rule.
        </p>
      </div>

      <RuleSetSection
        title="Inclusions"
        set={rule.inclusions}
        setKey="inclusions"
        totalRules={totalRules}
        onAddRule={addRuleToSet}
        onRemoveRule={removeRule}
        onUpdateRule={updateRule}
        onSetOperator={setSetOperator}
        disabled={disabled}
        sourceType={sourceType}
        eventSourceIdOptions={eventSourceIdOptions}
      />

      <RuleSetSection
        title="Exclusions"
        set={rule.exclusions}
        setKey="exclusions"
        totalRules={totalRules}
        onAddRule={addRuleToSet}
        onRemoveRule={removeRule}
        onUpdateRule={updateRule}
        onSetOperator={setSetOperator}
        disabled={disabled}
        sourceType={sourceType}
        eventSourceIdOptions={eventSourceIdOptions}
      />
    </div>
  );
};

interface RuleSetSectionProps {
  title: string;
  set: AudienceRuleSet;
  setKey: "inclusions" | "exclusions";
  totalRules: number;
  onAddRule: (key: "inclusions" | "exclusions") => void;
  onRemoveRule: (key: "inclusions" | "exclusions", index: number) => void;
  onUpdateRule: (key: "inclusions" | "exclusions", index: number, rule: AudienceRuleRule) => void;
  onSetOperator: (key: "inclusions" | "exclusions", operator: "and" | "or") => void;
  disabled?: boolean;
  sourceType: AudienceSubtypeSourceType;
  eventSourceIdOptions?: EventSourceIdOptions;
}

function RuleSetSection({
  title,
  set,
  setKey,
  totalRules,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
  onSetOperator,
  disabled,
  sourceType,
  eventSourceIdOptions,
}: RuleSetSectionProps) {
  const canAdd = totalRules < MAX_RULES_TOTAL;

  return (
    <div className="p-4 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-[#072929]">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="form-label-small mb-0">Match</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["and", "or"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onSetOperator(setKey, op)}
                disabled={disabled}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-medium transition-colors",
                  set.operator === op
                    ? "bg-forest-f60 text-white"
                    : "bg-[#FEFEFB] text-[#556179] hover:bg-gray-100"
                )}
              >
                {op.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onAddRule(setKey)}
            disabled={disabled || !canAdd}
            className="apply-button-add flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add rule
          </button>
        </div>
      </div>
      {!canAdd && (
        <p className="text-[11px] text-red-r30 mb-2">Maximum {MAX_RULES_TOTAL} rules total. Remove a rule from Inclusions or Exclusions to add more.</p>
      )}
      <div className="space-y-3">
        {set.rules.map((r, idx) => (
          <RuleCard
            key={`${setKey}-${idx}`}
            rule={r}
            onUpdate={(next) => onUpdateRule(setKey, idx, next)}
            onRemove={() => onRemoveRule(setKey, idx)}
            disabled={disabled}
            sourceType={sourceType}
            eventSourceIdOptions={eventSourceIdOptions}
          />
        ))}
      </div>
    </div>
  );
}

const CUSTOM_SOURCE_ID_VALUE = "__custom__";

interface RuleCardProps {
  rule: AudienceRuleRule;
  onUpdate: (rule: AudienceRuleRule) => void;
  onRemove: () => void;
  disabled?: boolean;
  sourceType: AudienceSubtypeSourceType;
  eventSourceIdOptions?: EventSourceIdOptions;
}

function RuleCard({ rule, onUpdate, onRemove, disabled, sourceType, eventSourceIdOptions }: RuleCardProps) {
  const [showAggregation, setShowAggregation] = useState(!!rule.aggregation);

  const updateEventSource = (idx: number, source: AudienceRuleEventSource) => {
    const next = rule.event_sources.map((s, i) => (i === idx ? source : s));
    onUpdate({ ...rule, event_sources: next });
  };

  const addEventSource = () => {
    onUpdate({ ...rule, event_sources: [...rule.event_sources, createEmptyEventSource(sourceType)] });
  };

  const removeEventSource = (idx: number) => {
    if (rule.event_sources.length <= 1) return;
    const next = rule.event_sources.filter((_, i) => i !== idx);
    onUpdate({ ...rule, event_sources: next });
  };

  const retentionDays = Math.round(rule.retention_seconds / SECONDS_PER_DAY);
  const setRetentionDays = (days: number) => {
    const sec = Math.min(RETENTION_SECONDS_MAX, Math.max(1, days) * SECONDS_PER_DAY);
    onUpdate({ ...rule, retention_seconds: sec });
  };

  const filterCount = rule.filter.filters.length;
  const atFilterLimit = filterCount >= MAX_FILTERS_PER_RULE;

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-4">
      <div className="flex justify-between items-center">
        <span className="form-label-small mb-0">Rule</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-[#556179] hover:text-red-r30 p-1"
          aria-label="Remove rule"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="form-label-small block mb-2">Event sources</label>
        {rule.event_sources.map((src, idx) => (
          <EventSourceRow
            key={idx}
            source={src}
            sourceType={sourceType}
            eventSourceIdOptions={eventSourceIdOptions}
            onChange={(next) => updateEventSource(idx, next)}
            onRemove={rule.event_sources.length > 1 ? () => removeEventSource(idx) : undefined}
            disabled={disabled}
          />
        ))}
        <button
          type="button"
          onClick={addEventSource}
          disabled={disabled}
          className="apply-button-add flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add source
        </button>
      </div>

      <div>
        <label className="form-label-small block mb-2">Retention (days)</label>
        <input
          type="number"
          min={1}
          max={365}
          value={retentionDays}
          onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 1)}
          className={cn(inputClass, "w-24")}
          disabled={disabled}
        />
        <p className="text-[11px] text-[#556179] mt-1">
          {rule.retention_seconds} seconds (max 365 days). Person stays in audience for this long after last event.
        </p>
      </div>

      <FilterBuilder
        filterSet={rule.filter}
        onChange={(filter) => onUpdate({ ...rule, filter })}
        disabled={disabled}
        atLimit={atFilterLimit}
        sourceType={sourceType}
      />

      <div>
        <button
          type="button"
          onClick={() => setShowAggregation(!showAggregation)}
          className="flex items-center gap-1 text-[12px] font-medium text-[#072929]"
        >
          {showAggregation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Aggregation (optional)
        </button>
        {showAggregation && (
          <AggregationEditor
            aggregation={rule.aggregation}
            onChange={(agg) => onUpdate({ ...rule, aggregation: agg })}
            disabled={disabled}
            sourceType={sourceType}
          />
        )}
      </div>
    </div>
  );
}

interface FilterBuilderProps {
  filterSet: AudienceRuleFilterSet;
  onChange: (filterSet: AudienceRuleFilterSet) => void;
  disabled?: boolean;
  atLimit?: boolean;
  sourceType: AudienceSubtypeSourceType;
}

function FilterBuilder({ filterSet, onChange, disabled, atLimit, sourceType }: FilterBuilderProps) {
  const updateOperator = (operator: "and" | "or") => {
    onChange({ ...filterSet, operator });
  };

  const updateFilter = (idx: number, f: AudienceRuleFilter) => {
    const next = filterSet.filters.map((x, i) => (i === idx ? f : x));
    onChange({ ...filterSet, filters: next });
  };

  const addFilter = () => {
    if (filterSet.filters.length >= MAX_FILTERS_PER_RULE) return;
    onChange({ ...filterSet, filters: [...filterSet.filters, createEmptyFilter()] });
  };

  const removeFilter = (idx: number) => {
    if (filterSet.filters.length <= 1) return;
    const next = filterSet.filters.filter((_, i) => i !== idx);
    onChange({ ...filterSet, filters: next });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="form-label-small mb-0">Filters</label>
        <span className="form-label-small mb-0">Match</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["and", "or"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => updateOperator(op)}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 text-[11px] font-medium transition-colors",
                filterSet.operator === op
                  ? "bg-forest-f60 text-white"
                  : "bg-[#FEFEFB] text-[#556179] hover:bg-gray-100"
              )}
            >
              {op.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {filterSet.filters.map((f, idx) => (
          <FilterRow
            key={idx}
            filter={f}
            onChange={(next) => updateFilter(idx, next)}
            onRemove={() => removeFilter(idx)}
            disabled={disabled}
            canRemove={filterSet.filters.length > 1}
            sourceType={sourceType}
          />
        ))}
      </div>
      <div className="mt-2">
        <button
          type="button"
          onClick={addFilter}
          disabled={disabled || atLimit}
          className="apply-button-add flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add filter
        </button>
      </div>
      {atLimit && (
        <p className="text-[11px] text-red-r30 mt-1">Maximum {MAX_FILTERS_PER_RULE} filters per rule.</p>
      )}
    </div>
  );
}

interface FilterRowProps {
  filter: AudienceRuleFilter;
  onChange: (f: AudienceRuleFilter) => void;
  onRemove: () => void;
  disabled?: boolean;
  canRemove: boolean;
  sourceType: AudienceSubtypeSourceType;
}

function FilterRow({ filter, onChange, onRemove, disabled, canRemove, sourceType }: FilterRowProps) {
  const isEvent = filter.field === "event";
  const operatorOptions = isEvent
    ? FILTER_OPERATORS.filter((o) => o.value === "eq")
    : FILTER_OPERATORS;
  const fieldOptions = getFilterFieldsForSourceType(sourceType);
  // Backend/Meta prefer "eq" for event; normalize "=" to "eq" for display.
  const displayOperator = isEvent && filter.operator === "=" ? "eq" : filter.operator;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-[140px]">
        <label className="form-label-small">Field</label>
        <Dropdown<string>
          options={fieldOptions}
          value={filter.field}
          onChange={(field) => onChange({ ...filter, field, operator: field === "event" ? "eq" : filter.operator })}
          buttonClassName={dropdownButtonClass}
          disabled={disabled}
        />
      </div>
      <div className="w-[150px]">
        <label className="form-label-small">Operator</label>
        <Dropdown<string>
          options={operatorOptions}
          value={displayOperator}
          onChange={(operator) => onChange({ ...filter, operator })}
          buttonClassName={dropdownButtonClass}
          disabled={disabled}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="form-label-small">Value</label>
        <input
          type="text"
          value={
            typeof filter.value === "string"
              ? filter.value
              : Array.isArray(filter.value)
                ? filter.value.join(", ")
                : String(filter.value ?? "")
          }
          onChange={(e) => {
            const v = e.target.value;
            if (filter.operator === "is_any" || filter.operator === "is_not_any") {
              const arr = v.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
              onChange({ ...filter, value: arr.length ? arr : v });
            } else if (
              (filter.field === "_value" || filter.field === "price") &&
              v !== "" &&
              /^-?\d+(\.\d+)?$/.test(v)
            ) {
              const num = Number(v);
              onChange({ ...filter, value: Number.isNaN(num) ? v : num });
            } else {
              onChange({ ...filter, value: v });
            }
          }}
          placeholder={
            sourceType === "app" && filter.field === "event"
              ? "e.g. Purchase, fb_mobile_purchase"
              : filter.operator === "is_any" || filter.operator === "is_not_any"
                ? "e.g. red, blue"
                : "Enter value"
          }
          className={inputClass}
          disabled={disabled}
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-1 text-[#556179] hover:text-red-r30 h-[40px] flex items-center"
          aria-label="Remove filter"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface AggregationEditorProps {
  aggregation: AudienceRuleAggregation | undefined;
  onChange: (a: AudienceRuleAggregation | undefined) => void;
  disabled?: boolean;
  sourceType: AudienceSubtypeSourceType;
}

function AggregationEditor({ aggregation, onChange, disabled, sourceType }: AggregationEditorProps) {
  const types = sourceType === "app" ? AGGREGATION_TYPES_APP : AGGREGATION_TYPES_WEBSITE;
  const current = aggregation ?? {
    type: "count" as const,
    operator: ">",
    value: 0,
  };

  return (
    <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-[#f9f9f6] grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="form-label-small block mb-2">Type</label>
        <Dropdown<string>
          options={types}
          value={current.type}
          onChange={(type) => onChange({ ...current, type: type as AudienceRuleAggregation["type"] })}
          buttonClassName={dropdownButtonClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="form-label-small block mb-2">Method (optional)</label>
        <Dropdown<string>
          options={AGGREGATION_METHODS}
          value={current.method ?? ""}
          onChange={(method) =>
            onChange({
              ...current,
              method: (method === "absolute" || method === "percentile" ? method : undefined) as
                | "absolute"
                | "percentile"
                | undefined,
            })
          }
          buttonClassName={dropdownButtonClass}
          disabled={disabled}
          placeholder="—"
        />
      </div>
      <div>
        <label className="form-label-small block mb-2">Field (optional)</label>
        <input
          type="text"
          value={current.field ?? ""}
          onChange={(e) => onChange({ ...current, field: e.target.value || undefined })}
          placeholder={
            sourceType === "app" && current.type === "count"
              ? "Omit for count; use _value for sum/avg"
              : "e.g. _value, price"
          }
          className={inputClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="form-label-small block mb-2">Operator</label>
        <Dropdown<string>
          options={[
            { value: ">", label: ">" },
            { value: ">=", label: ">=" },
            { value: "<", label: "<" },
            { value: "<=", label: "<=" },
            { value: "=", label: "=" },
            { value: "!=", label: "!=" },
          ]}
          value={current.operator}
          onChange={(operator) => onChange({ ...current, operator })}
          buttonClassName={dropdownButtonClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="form-label-small block mb-2">Value</label>
        <input
          type="text"
          value={String(current.value ?? "")}
          onChange={(e) => {
            const v = e.target.value;
            const num = Number(v);
            onChange({ ...current, value: Number.isNaN(num) ? v : num });
          }}
          placeholder="Number or string"
          className={inputClass}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
