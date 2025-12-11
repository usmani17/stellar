// components/CustomDateRangePicker.tsx
import React from "react";
import DatePicker, {
  type ReactDatePickerCustomHeaderProps,
  type DatePickerProps,
} from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type CustomDateRangePickerProps = {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: [Date | null, Date | null]) => void;
  onApply: () => void;
  onCancel: () => void;
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
  startDate,
  endDate,
  onChange,
  onApply,
  onCancel,
  monthsShown = 2,
  ...datePickerProps
}) => {
  const renderHeader = ({
    monthDate,
    customHeaderCount,
    decreaseMonth,
    increaseMonth,
  }: ReactDatePickerCustomHeaderProps & { customHeaderCount: number }) => (
    <div className="flex items-center justify-between ">
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
      <h2 className="text-lg font-semibold text-[#030712]">
        {monthDate.toLocaleDateString("en-US", { month: "long" })},{" "}
        {monthDate.getFullYear()}
      </h2>

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
        selected={startDate}
        onChange={onChange}
        startDate={startDate}
        endDate={endDate}
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
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-[#374151] bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!startDate || !endDate}
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
