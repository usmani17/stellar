import React from "react";

/**
 * Format a number as currency with 0 decimal places
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format a number or string as currency with 2 decimal places
 */
export const formatCurrency2Decimals = (
  value: number | string | undefined
): string => {
  if (value === undefined || value === null) return "$0.00";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

/**
 * Format a number or string as percentage with 2 decimal places
 */
export const formatPercentage = (
  value: number | string | undefined
): string => {
  if (value === undefined || value === null) return "0.00%";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "0.00%";
  return `${numValue.toFixed(2)}%`;
};

/**
 * Get the sort icon for a table column
 * Returns different icons based on whether the column is currently sorted and the sort order
 */
export const getSortIcon = (
  column: string,
  currentSortBy: string,
  currentSortOrder: "asc" | "desc"
): React.ReactElement => {
  if (currentSortBy !== column) {
    return (
      <svg
        className="w-4 h-4 ml-1 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }
  return currentSortOrder === "asc" ? (
    <svg
      className="w-4 h-4 ml-1 text-[#556179]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  ) : (
    <svg
      className="w-4 h-4 ml-1 text-[#556179]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
};
