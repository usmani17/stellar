import React, { useState, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Dropdown } from "../ui/Dropdown";
import {
  type AudienceRule,
  type AudienceRuleSet,
  type AudienceRuleRule,
  type AudienceRuleEventSource,
  type AudienceRuleFilterSet,
  type AudienceRuleFilter,
  type AudienceRuleAggregation,
  getDefaultAudienceRule,
} from "../../types/meta";
import { cn } from "../../lib/cn";

const inputClass = "campaign-input w-full";
const MAX_RULES_TOTAL = 10;
const MAX_FILTERS_PER_RULE = 100;
const RETENTION_SECONDS_MAX = 365 * 86400; // 365 days
const SECONDS_PER_DAY = 86400;

const EVENT_SOURCE_TYPES = [
  { value: "pixel" as const, label: "Pixel" },
  { value: "app" as const, label: "App" },
];

const FILTER_FIELDS = [
  { value: "event", label: "Event" },
  { value: "url", label: "URL" },
  { value: "domain", label: "Domain" },
  { value: "path", label: "Path" },
  { value: "device_type", label: "Device type" },
  { value: "customData", label: "Custom data" },
];

const FILTER_OPERATORS = [
  { value: "=", label: "Equals" },
  { value: "!=", label: "Not equals" },
  { value: "is_any", label: "Is any" },
  { value: "is_not_any", label: "Is not any" },
  { value: ">", label: "Greater than" },
  { value: ">=", label: "Greater or equal" },
  { value: "<", label: "Less than" },
  { value: "<=", label: "Less or equal" },
  { value: "contains", label: "Contains" },
  { value: "i_contains", label: "Contains (case insensitive)" },
  { value: "starts_with", label: "Starts with" },
  { value: "regex_match", label: "Regex match" },
];

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

function createEmptyEventSource(): AudienceRuleEventSource {
  return { id: "", type: "pixel" };
}

function createEmptyFilter(): AudienceRuleFilter {
  return { field: "event", operator: "=", value: "" };
}

function createEmptyFilterSet(): AudienceRuleFilterSet {
  return { operator: "and", filters: [createEmptyFilter()] };
}

function createEmptyRule(): AudienceRuleRule {
  return {
    event_sources: [createEmptyEventSource()],
    retention_seconds: 30 * SECONDS_PER_DAY,
    filter: createEmptyFilterSet(),
  };
}

export interface CustomAudienceRuleBuilderProps {
  value: AudienceRule | null;
  onChange: (rule: AudienceRule | null) => void;
  disabled?: boolean;
  /** "website" | "app" to show website vs app aggregation types */
  sourceType?: "website" | "app";
}

export const CustomAudienceRuleBuilder: React.FC<CustomAudienceRuleBuilderProps> = ({
  value,
  onChange,
  disabled = false,
  sourceType = "website",
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
      const nextRules = [...set.rules, createEmptyRule()];
      const nextSet = { ...set, rules: nextRules };
      if (setKey === "inclusions") updateInclusions(nextSet);
      else updateExclusions(nextSet);
    },
    [rule, totalRules, updateInclusions, updateExclusions]
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
    <div className="space-y-4">
      <p className="text-[11px] text-[#556179]">
        Inclusion/exclusion criteria for website or app audiences. Max {MAX_RULES_TOTAL} rules total, max {MAX_FILTERS_PER_RULE} filters per rule.
      </p>

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
  sourceType: "website" | "app";
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
}: RuleSetSectionProps) {
  const canAdd = totalRules < MAX_RULES_TOTAL;

  return (
    <div className="border border-gray-200 rounded-lg bg-[#f9f9f6] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-[#072929]">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#556179]">Match</span>
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
            className="add-button flex items-center gap-1 text-[11px]"
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
          />
        ))}
      </div>
    </div>
  );
}

interface RuleCardProps {
  rule: AudienceRuleRule;
  onUpdate: (rule: AudienceRuleRule) => void;
  onRemove: () => void;
  disabled?: boolean;
  sourceType: "website" | "app";
}

function RuleCard({ rule, onUpdate, onRemove, disabled, sourceType }: RuleCardProps) {
  const [showAggregation, setShowAggregation] = useState(!!rule.aggregation);

  const updateEventSource = (idx: number, source: AudienceRuleEventSource) => {
    const next = rule.event_sources.map((s, i) => (i === idx ? source : s));
    onUpdate({ ...rule, event_sources: next });
  };

  const addEventSource = () => {
    onUpdate({ ...rule, event_sources: [...rule.event_sources, createEmptyEventSource()] });
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
        <span className="text-[12px] font-medium text-[#072929]">Rule</span>
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
          <div key={idx} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              value={src.id}
              onChange={(e) => updateEventSource(idx, { ...src, id: e.target.value })}
              placeholder={src.type === "pixel" ? "Pixel ID" : "App ID"}
              className={cn(inputClass, "flex-1")}
              disabled={disabled}
            />
            <Dropdown<"pixel" | "app">
              options={EVENT_SOURCE_TYPES}
              value={src.type}
              onChange={(val) => updateEventSource(idx, { ...src, type: val })}
              buttonClassName={cn(inputClass, "w-[100px]")}
              disabled={disabled}
            />
            {rule.event_sources.length > 1 && (
              <button
                type="button"
                onClick={() => removeEventSource(idx)}
                disabled={disabled}
                className="p-1 text-[#556179] hover:text-red-r30"
                aria-label="Remove source"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEventSource}
          disabled={disabled}
          className="text-[11px] text-forest-f60 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add source
        </button>
      </div>

      <div>
        <label className="form-label-small block mb-1">Retention (days)</label>
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
}

function FilterBuilder({ filterSet, onChange, disabled, atLimit }: FilterBuilderProps) {
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
      <label className="form-label-small block mb-2">Filters</label>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-[#556179]">Match</span>
        <div className="flex rounded border border-gray-200 overflow-hidden">
          {(["and", "or"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => updateOperator(op)}
              disabled={disabled}
              className={cn(
                "px-2 py-1 text-[11px]",
                filterSet.operator === op ? "bg-forest-f60 text-white" : "bg-[#FEFEFB] text-[#556179]"
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
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addFilter}
        disabled={disabled || atLimit}
        className="text-[11px] text-forest-f60 hover:underline flex items-center gap-1 mt-2"
      >
        <Plus className="w-3 h-3" /> Add filter
      </button>
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
}

function FilterRow({ filter, onChange, onRemove, disabled, canRemove }: FilterRowProps) {
  const isEvent = filter.field === "event";
  const operatorOptions = isEvent
    ? FILTER_OPERATORS.filter((o) => o.value === "=")
    : FILTER_OPERATORS;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Dropdown<string>
        options={FILTER_FIELDS}
        value={filter.field}
        onChange={(field) => onChange({ ...filter, field, operator: field === "event" ? "=" : filter.operator })}
        buttonClassName={cn(inputClass, "w-[130px]")}
        disabled={disabled}
      />
      <Dropdown<string>
        options={operatorOptions}
        value={filter.operator}
        onChange={(operator) => onChange({ ...filter, operator })}
        buttonClassName={cn(inputClass, "w-[140px]")}
        disabled={disabled}
      />
      <input
        type="text"
        value={filter.value}
        onChange={(e) => onChange({ ...filter, value: e.target.value })}
        placeholder="Value"
        className={cn(inputClass, "flex-1 min-w-[120px]")}
        disabled={disabled}
      />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-1 text-[#556179] hover:text-red-r30"
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
  sourceType: "website" | "app";
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
        <label className="form-label-small block mb-1">Type</label>
        <Dropdown<string>
          options={types}
          value={current.type}
          onChange={(type) => onChange({ ...current, type: type as AudienceRuleAggregation["type"] })}
          buttonClassName={inputClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="form-label-small block mb-1">Field (optional)</label>
        <input
          type="text"
          value={current.field ?? ""}
          onChange={(e) => onChange({ ...current, field: e.target.value || undefined })}
          placeholder="e.g. value"
          className={inputClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="form-label-small block mb-1">Operator</label>
        <Dropdown<string>
          options={[
            { value: ">", label: ">" },
            { value: ">=", label: ">=" },
            { value: "<", label: "<" },
            { value: "<=", label: "<=" },
            { value: "=", label: "=" },
          ]}
          value={current.operator}
          onChange={(operator) => onChange({ ...current, operator })}
          buttonClassName={inputClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="form-label-small block mb-1">Value</label>
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
