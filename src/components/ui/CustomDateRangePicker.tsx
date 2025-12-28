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
  const [isCustomSelection, setIsCustomSelection] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    "last30days"
  );

  // Initialize with Last 30 Days if no dates provided
  useEffect(() => {
    if (!propStartDate && !propEndDate && !tempStartDate && !tempEndDate) {
      // Set default to Last 30 Days on initial mount only
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);

      setTempStartDate(start);
      setTempEndDate(today);
      setSelectedPreset("last30days");
      setIsCustomSelection(false);

      // Apply default range
      onChange([start, today]);
    } else if (propStartDate || propEndDate) {
      setTempStartDate(propStartDate);
      setTempEndDate(propEndDate);
      // Reset custom selection when props change (preset was applied externally)
      setIsCustomSelection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propStartDate, propEndDate]);

  // Handle date range changes locally
  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setTempStartDate(start);
    setTempEndDate(end);
    // Mark as custom selection when user manually selects dates
    if (start || end) {
      setIsCustomSelection(true);
    }
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

  // Quick date range handlers
  const handleQuickRange = (range: string) => {
    // If "Select Dates" (custom), just show calendar without auto-applying
    if (range === "custom") {
      setIsCustomSelection(true);
      setSelectedPreset(null);
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    let start: Date;
    let end: Date = today;

    switch (range) {
      case "last7days":
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "last14days":
        start = new Date();
        start.setDate(start.getDate() - 14);
        start.setHours(0, 0, 0, 0);
        break;
      case "last30days":
        start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case "thismonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      case "thisyear":
        start = new Date(today.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case "lastyear":
        start = new Date(today.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(today.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        return;
    }

    // Auto-apply preset ranges immediately
    setIsCustomSelection(false);
    setSelectedPreset(range);
    setTempStartDate(start);
    setTempEndDate(end);

    // Apply immediately
    const dates: [Date | null, Date | null] = [start, end];
    onChange(dates);
    onApply?.(dates);
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
        className={`p-1 border border-gray-200 rounded-md items-center hover:bg-gray-50 transition ${
          customHeaderCount === 0 ? "visible" : "invisible"
        }`}
      >
        <ChevronLeft />
      </button>

      {/* Month + Year with comma: "September, 2025" */}
      <div className="flex items-center gap-1 relative">
        <button
          type="button"
          className="month-grid-trigger text-sm font-semibold text-[#072929] rounded-[7px] cursor-pointer"
          onClick={() =>
            setMonthGridOpen((prev) => ({
              ...prev,
              [customHeaderCount]: !prev[customHeaderCount],
            }))
          }
        >
          <span className="inline-flex items-center gap-1">
            <svg
              className="w-3 h-3 text-[#072929]"
              viewBox="0 0 12 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1.5L6 6.5L11 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {monthDate.toLocaleDateString("en-US", { month: "short" })},
          </span>
        </button>
        <span className="text-sm font-semibold text-[#072929]">
          {monthDate.getFullYear()}
        </span>

        {monthGridOpen[customHeaderCount] && (
          <div
            className="month-grid"
            style={
              customHeaderCount === 1
                ? { right: 0, left: "auto" }
                : { left: 0, right: "auto" }
            }
          >
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
        className={`p-1 border border-gray-200 rounded-md items-center hover:bg-gray-50 transition ${
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
    <div className="bg-[#FEFEFB] rounded-lg border border-gray-200 overflow-hidden select-none shadow-lg min-w-[240px]">
      {/* Quick Date Range Options - Vertical List like Accounts Dropdown */}
      {/* Hide options when "Select Dates" is active */}
      {!isCustomSelection && (
        <div className="py-1 bg-[#FEFEFB]">
          {[
            { value: "last7days", label: "Last 7 Days" },
            { value: "last14days", label: "Last 14 Days" },
            { value: "last30days", label: "Last 30 Days" },
            { value: "thismonth", label: "This Month" },
            { value: "thisyear", label: "This Year" },
            { value: "lastyear", label: "Last Year" },
            { value: "custom", label: "Select Dates" },
          ].map((option) => {
            const isSelected = option.value === selectedPreset;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleQuickRange(option.value)}
                className={`w-full text-left px-2 py-1.5 text-[13.2px] transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-gray-50 text-[#072929] font-medium"
                    : "text-[#313850] bg-[#FEFEFB] hover:bg-gray-50"
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-[#136d6d] flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Only show calendar when "Select Dates" is clicked */}
      {isCustomSelection && (
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
          maxDate={new Date()} // Prevent selecting future dates
          // Spread safe datePickerProps (minDate, maxDate, etc.)
          {...safeDatePickerProps}
        />
      )}

      {/* Only show Apply/Cancel buttons for custom date selection */}
      {isCustomSelection && (
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-[#FEFEFB]">
          <button
            type="button"
            onClick={() => {
              handleCancel();
              setIsCustomSelection(false);
            }}
            className="bg-[#FEFEFB] border border-[#072929] h-[24px] px-2 py-1 rounded-[6px] flex items-center justify-center transition"
          >
            <span className="text-[10px] font-semibold text-[#072929]">
              Cancel
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleApply();
              setIsCustomSelection(false);
            }}
            disabled={!tempStartDate || !tempEndDate}
            className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1 h-[24px] rounded-lg flex items-center gap-1.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span className="text-[10px] font-medium">Apply</span>
          </button>
        </div>
      )}
    </div>
  );
};

const ChevronLeft = () => (
  <svg
    className="w-3.5 h-3.5 text-[#072929] cursor-pointer"
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
    className="w-3.5 h-3.5 text-[#072929]"
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
