import React from "react";
import DatePicker, { type ReactDatePickerCustomHeaderProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export type SingleDatePickerProps = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  dateFormat?: string;
  id?: string;
};

function SingleDatePickerHeader({
  monthDate,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: ReactDatePickerCustomHeaderProps) {
  const monthYear = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  return (
    <>
      <button
        type="button"
        className="react-datepicker__navigation react-datepicker__navigation--previous"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        aria-label="Previous month"
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous" />
      </button>
      <div className="react-datepicker__current-month">{monthYear}</div>
      <button
        type="button"
        className="react-datepicker__navigation react-datepicker__navigation--next"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        aria-label="Next month"
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next" />
      </button>
    </>
  );
}

/**
 * Single-date picker for campaign create/edit. Uses the same theme as the
 * header CustomDateRangePicker (custom-datepicker-single), with icon and
 * toggle-on-click behavior.
 */
export const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className = "",
  placeholder = "Select date",
  dateFormat = "yyyy-MM-dd",
  id,
}) => {
  const selected = value ? new Date(value + "T00:00:00") : null;

  const handleChange = (date: Date | null) => {
    onChange(date ? date.toISOString().split("T")[0] : "");
  };

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={handleChange}
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      // showIcon
      toggleCalendarOnIconClick
      // icon={<CalendarIcon />}
      calendarClassName="custom-datepicker-single"
      popperClassName="custom-datepicker-single-popper"
      popperPlacement="bottom-start"
      renderCustomHeader={(props) => <SingleDatePickerHeader {...props} />}
      className={className}
      placeholderText={placeholder}
      dateFormat={dateFormat}
      autoComplete="off"
    />
  );
};

export default SingleDatePicker;
