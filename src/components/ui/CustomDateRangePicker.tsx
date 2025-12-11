// components/CustomDateRangePicker.tsx
import React, { useState, useEffect } from "react";
import DatePicker, {
  type ReactDatePickerCustomHeaderProps,
  type DatePickerProps,
} from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type CustomDateRangePickerProps = {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: [Date | null, Date | null]) => void;
  onApply?: (dates: [Date | null, Date | null]) => void;
  onCancel?: () => void;
  monthsShown?: number;
} & Omit<
  DatePickerProps,
  | "selectsRange"
  | "startDate"
  | "endDate"
  | "onChange"
  | "inline"
  | "selected"
  | "showPopperArrow"
  | "fixedHeight"
  | "renderCustomHeader"
  | "formatWeekDay"
  | "monthsShown"
  | "selectsMultiple"
>;

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  startDate: propStartDate,
  endDate: propEndDate,
  onChange,
  onApply,
  onCancel,
  monthsShown = 2,
  ...datePickerProps
}) => {
  // Local state for temporary date range changes
  const [tempStartDate, setTempStartDate] = useState<Date | null>(
    propStartDate
  );
  const [tempEndDate, setTempEndDate] = useState<Date | null>(propEndDate);
  const [monthGridOpen, setMonthGridOpen] = useState<Record<number, boolean>>(
    {}
  );

  // Update local state when props change (e.g., when parent updates)
  useEffect(() => {
    setTempStartDate(propStartDate);
    setTempEndDate(propEndDate);
  }, [propStartDate, propEndDate]);

  // Handle date range changes locally
  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setTempStartDate(start);
    setTempEndDate(end);
  };

  // Apply the selected range to parent
  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      const dates: [Date | null, Date | null] = [tempStartDate, tempEndDate];
      onChange(dates);
      onApply?.(dates);
    }
  };

  // Cancel and reset to original values
  const handleCancel = () => {
    setTempStartDate(propStartDate);
    setTempEndDate(propEndDate);
    onCancel?.();
  };

  const renderHeader = ({
    monthDate,
    customHeaderCount,
    decreaseMonth,
    increaseMonth,
  }: ReactDatePickerCustomHeaderProps & { customHeaderCount: number }) => (
    <div className="flex items-center justify-between relative">
      {/* Previous button – only visible on the first (left) calendar */}
      <button
        type="button"
        onClick={decreaseMonth}
        className={`p-2 rounded-full hover:bg-gray-100 transition ${
          customHeaderCount === 0 ? "visible" : "invisible"
        }`}
      >
        <ChevronLeft />
      </button>

      {/* Month + Year with comma: "September, 2025" */}
      <div className="flex items-center gap-0 relative">
        <button
          type="button"
          className="month-grid-trigger text-lg font-semibold text-[#072929] rounded-[10px]  hover:border-[#072929] cursor-pointer"
          onClick={() =>
            setMonthGridOpen((prev) => ({
              ...prev,
              [customHeaderCount]: !prev[customHeaderCount],
            }))
          }
        >
          {monthDate.toLocaleDateString("en-US", { month: "short" })}
        </button>
        <span className="text-lg font-semibold text-[#072929]">
          , {monthDate.getFullYear()}
        </span>

        {monthGridOpen[customHeaderCount] && (
          <div className="month-grid">
            {[
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ].map((label, idx) => {
              const isSelected = idx === monthDate.getMonth();
              return (
                <button
                  key={label}
                  type="button"
                  className={`month-grid-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setMonthGridOpen((prev) => ({
                      ...prev,
                      [customHeaderCount]: false,
                    }));
                    // Update month while keeping year/day
                    const newDate = new Date(monthDate);
                    newDate.setMonth(idx);
                    // Use decrease/increase helpers by diff, simpler: set month on current start
                    const diff = idx - monthDate.getMonth();
                    if (diff > 0) {
                      for (let i = 0; i < diff; i++) increaseMonth();
                    } else if (diff < 0) {
                      for (let i = 0; i < Math.abs(diff); i++) decreaseMonth();
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Next button – only visible on the second (right) calendar */}
      <button
        type="button"
        onClick={increaseMonth}
        className={`p-2 rounded-full hover:bg-gray-100 transition ${
          customHeaderCount === 1 ? "visible" : "invisible"
        }`}
      >
        <ChevronRight />
      </button>
    </div>
  );

  // Filter out props that conflict with selectsRange
  const {
    showMonthYearDropdown,
    showYearDropdown,
    showMonthDropdown,
    formatMultipleDates,
    ...safeDatePickerProps
  } = datePickerProps;

  return (
    <div className="bg-white rounded-3xl border-none overflow-hidden select-none">
      <DatePicker
        selected={tempStartDate}
        onChange={handleDateChange}
        startDate={tempStartDate}
        endDate={tempEndDate}
        selectsRange
        inline
        monthsShown={monthsShown}
        showPopperArrow={false}
        fixedHeight
        renderCustomHeader={renderHeader}
        formatWeekDay={(name) => name[0].toUpperCase()}
        // Spread safe datePickerProps (minDate, maxDate, etc.)
        {...safeDatePickerProps}
      />

      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-[#f9f9f6]">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 text-sm font-medium text-[#374151] bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!tempStartDate || !tempEndDate}
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#072929] rounded-xl hover:bg-[#051c1c] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

const ChevronLeft = () => (
  <svg
    className="w-5 h-5 text-[#072929]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const ChevronRight = () => (
  <svg
    className="w-5 h-5 text-[#072929]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

export default CustomDateRangePicker;
