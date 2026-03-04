import React from "react";

interface RadioProps {
  /** Whether the radio is checked */
  checked?: boolean;
  /** Whether the radio is disabled */
  disabled?: boolean;
  /** Label text (optional) */
  label?: string;
  /** Whether the field is required (shows asterisk) */
  required?: boolean;
  /** Callback when radio state changes */
  onChange?: (checked: boolean) => void;
  /** Additional CSS classes */
  className?: string;
  /** Radio name attribute */
  name?: string;
  /** Radio value attribute */
  value?: string;
}

export const Radio: React.FC<RadioProps> = ({
  checked = false,
  disabled = false,
  label,
  required = false,
  onChange,
  className = "",
  name,
  value,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  const containerClasses = `flex items-center gap-3 ${
    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
  } ${className}`;

  const inputClasses = `w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 accent-[#136D6D]`;

  const labelClasses = `text-[13px] font-medium text-[#072929] ${
    disabled ? "text-gray-400" : ""
  }`;

  if (label) {
    return (
      <label className={containerClasses}>
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className={inputClasses}
        />
        <span className={labelClasses}>
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </span>
      </label>
    );
  }

  return (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      className={`${inputClasses} ${className}`}
    />
  );
};
