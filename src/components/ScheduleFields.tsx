import React from "react";
import { Dropdown } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const FREQUENCY_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
] as const;

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

export interface ScheduleFieldsProps {
  /** Selected frequency: "Daily" | "Weekly" */
  frequency: string;
  onFrequencyChange: (value: string) => void;
  /** Time value in HH:mm for the time input */
  runAt: string;
  onRunAtChange: (value: string) => void;
  /** Indices of selected days (0 = Mon, 6 = Sun) */
  runDays: number[];
  onToggleRunDay: (dayIndex: number) => void;
}

export const ScheduleFields: React.FC<ScheduleFieldsProps> = ({
  frequency,
  onFrequencyChange,
  runAt,
  onRunAtChange,
  runDays,
  onToggleRunDay,
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-wrap gap-4">
      <FormField label="Frequency">
        <Dropdown
          options={[...FREQUENCY_OPTIONS]}
          value={frequency}
          onChange={(value) => onFrequencyChange(value)}
          placeholder="Select frequency"
          buttonClassName="campaign-input w-full h-12 rounded-[12px] px-3 border border-[#e3e3e3] bg-[#FEFEFB] flex items-center justify-between text-[14px] text-[#072929]"
          width="w-full"
          showCheckmark={true}
          closeOnSelect={true}
        />
      </FormField>
      <FormField label="At What Time?">
        <input
          type="time"
          value={runAt}
          onChange={(e) => onRunAtChange(e.target.value)}
          className="campaign-input w-full h-12 rounded-[12px] px-3 border border-border-default bg-background-field"
          step="300"
        />
      </FormField>
    </div>
    {frequency === "Weekly" && (
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day, index) => (
          <button
            key={day}
            type="button"
            onClick={() => onToggleRunDay(index)}
            className={`w-[80px] h-9 rounded-[12px] text-[14px] border ${
              runDays.includes(index)
                ? "bg-[#136D6D] text-[#F9F9F6] border-[#e3e3e3]"
                : "bg-[#FEFEFB] text-[#072929] border-[#e3e3e3]"
            }`}
          >
            {day}
          </button>
        ))}
      </div>
    )}
  </div>
);

export { WEEKDAYS };
