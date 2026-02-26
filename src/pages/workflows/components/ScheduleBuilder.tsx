import React from "react";
import { SingleDatePicker } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import {
  toWeekdaysArray,
  toMonthDaysArray,
} from "../utils/scheduleUtils";
import type { ScheduleConfig } from "../../../services/workflows";

interface ScheduleBuilderProps {
  value: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
}

const FREQUENCIES: { value: ScheduleConfig["frequency"]; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  value,
  onChange,
}) => {
  const toggleWeekday = (day: number) => {
    const current = toWeekdaysArray(value.weekdays);
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, weekdays: updated });
  };

  const toggleMonthDay = (day: number) => {
    const current = toMonthDaysArray(value.monthDays);
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, monthDays: updated });
  };

  return (
    <div className="space-y-3">
      {/* Frequency pills */}
      <div>
        <label className="block text-[13px] font-medium text-forest-f60 mb-1">
          Frequency
        </label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  frequency: f.value,
                  ...(f.value !== "once" && { date: undefined }),
                  ...(f.value !== "weekly" && { weekdays: undefined }),
                  ...(f.value !== "monthly" && { monthDays: undefined }),
                })
              }
              className={cn(
                "px-3 py-1 rounded-full text-[13px] font-medium transition-colors border",
                value.frequency === f.value
                  ? "bg-forest-f60 text-white border-forest-f60 hover:bg-forest-f50"
                  : "bg-white text-forest-f60 border-sandstorm-s40 hover:bg-sandstorm-s30 hover:border-forest-f40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time of day */}
      <div>
        <label className="block text-[13px] font-medium text-forest-f60 mb-1">
          Time
        </label>
        <input
          type="time"
          value={value.time || "09:00"}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
          className="campaign-input w-full"
        />
      </div>

      {/* Conditional fields */}
      {value.frequency === "once" && (
        <div>
          <label className="block text-[13px] font-medium text-forest-f60 mb-1">
            Date
          </label>
          <SingleDatePicker
            value={value.date ?? ""}
            onChange={(d) => onChange({ ...value, date: d })}
            minDate={new Date()}
            placeholder="Select date"
          />
        </div>
      )}

      {value.frequency === "weekly" && (
        <div>
          <label className="block text-[13px] font-medium text-forest-f60 mb-1">
            Days of the Week
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleWeekday(idx)}
                className={cn(
                  "w-11 h-11 rounded-full text-xs font-medium transition-colors border",
                  toWeekdaysArray(value.weekdays).includes(idx)
                    ? "bg-forest-f60 text-white border-forest-f60 hover:bg-forest-f50"
                    : "bg-white text-forest-f60 border-sandstorm-s40 hover:bg-sandstorm-s30 hover:border-forest-f40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {value.frequency === "monthly" && (
        <div>
          <label className="block text-[13px] font-medium text-forest-f60 mb-1">
            Days of the Month
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleMonthDay(day)}
                className={cn(
                  "h-9 rounded-lg text-xs font-medium transition-colors border",
                  toMonthDaysArray(value.monthDays).includes(day)
                    ? "bg-forest-f60 text-white border-forest-f60 hover:bg-forest-f50"
                    : "bg-white text-forest-f60 border-sandstorm-s40 hover:bg-sandstorm-s30 hover:border-forest-f40"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
