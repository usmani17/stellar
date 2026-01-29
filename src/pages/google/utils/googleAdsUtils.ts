/**
 * Shared utilities for Google Ads pages (Campaigns, AdGroups, Keywords, Ads)
 * Consolidates common functions, constants, and mappings to avoid code duplication
 */

// ============================================================================
// STATUS CONSTANTS AND MAPS
// ============================================================================

export const GOOGLE_STATUS_DEFAULT = "ENABLED" as const;

export type GoogleStatus = "ENABLED" | "PAUSED" | "REMOVED";

/**
 * Status dropdown options for Google Ads - reusable across all Google pages
 */
export const STATUS_DROPDOWN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ENABLED", label: "Enabled" },
  { value: "PAUSED", label: "Paused" },
  { value: "REMOVED", label: "Remove" },
];

/**
 * Maps API status values to display-friendly format
 */
export const STATUS_DISPLAY_MAP: Record<string, string> = {
  ENABLED: "Enabled",
  PAUSED: "Paused",
  REMOVED: "Removed",
  Enabled: "Enabled",
  Paused: "Paused",
  Removed: "Removed",
};

/**
 * Maps display status values back to API format (uppercase)
 */
export const STATUS_API_MAP: Record<string, GoogleStatus> = {
  ENABLED: "ENABLED",
  PAUSED: "PAUSED",
  REMOVED: "REMOVED",
  Enabled: "ENABLED",
  Paused: "PAUSED",
  Removed: "REMOVED",
};

/**
 * Gets status with default fallback
 */
export const getStatusWithDefault = (status?: string | null): string => {
  return status || GOOGLE_STATUS_DEFAULT;
};

/**
 * Formats status for display
 */
export const formatStatusForDisplay = (status?: string | null): string => {
  const statusValue = getStatusWithDefault(status);
  return STATUS_DISPLAY_MAP[statusValue] || statusValue;
};

/**
 * Converts display status to API format
 */
export const convertStatusToApi = (status: string): GoogleStatus => {
  return STATUS_API_MAP[status] || "ENABLED";
};

// ============================================================================
// MATCH TYPE CONSTANTS AND MAPS
// ============================================================================

export type MatchType = "EXACT" | "PHRASE" | "BROAD";

export const MATCH_TYPE_DEFAULT = "EXACT" as const;

/**
 * Maps API match type values to display-friendly format
 */
export const MATCH_TYPE_DISPLAY_MAP: Record<string, string> = {
  EXACT: "Exact",
  PHRASE: "Phrase",
  BROAD: "Broad",
  Exact: "Exact",
  Phrase: "Phrase",
  Broad: "Broad",
};

/**
 * Maps display match type values back to API format (uppercase)
 */
export const MATCH_TYPE_API_MAP: Record<string, MatchType> = {
  EXACT: "EXACT",
  PHRASE: "PHRASE",
  BROAD: "BROAD",
  Exact: "EXACT",
  Phrase: "PHRASE",
  Broad: "BROAD",
};

/**
 * Gets match type with default fallback
 */
export const getMatchTypeWithDefault = (matchType?: string | null): string => {
  return matchType || MATCH_TYPE_DEFAULT;
};

/**
 * Formats match type for display
 */
export const formatMatchTypeForDisplay = (matchType?: string | null): string => {
  const matchTypeValue = getMatchTypeWithDefault(matchType);
  return MATCH_TYPE_DISPLAY_MAP[matchTypeValue] || matchTypeValue;
};

/**
 * Converts display match type to API format
 */
export const convertMatchTypeToApi = (matchType: string): MatchType => {
  return MATCH_TYPE_API_MAP[matchType] || "EXACT";
};

// ============================================================================
// BIDDING STRATEGY FORMATTING
// ============================================================================

/**
 * Formats bidding strategy for display
 */
export const formatBiddingStrategy = (strategy?: string | null): string => {
  if (!strategy) return "—";
  return strategy
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Formats date string (YYYY-MM-DD or ISO format) for display (MM/DD/YYYY)
 */
export const formatDateForDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  try {
    // Handle ISO format (YYYY-MM-DDTHH:mm:ss) by extracting just the date part
    const dateOnly = dateStr.split("T")[0];
    const parts = dateOnly.split("-");
    if (parts.length !== 3) {
      // If not in expected format, try parsing as Date object
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
      return dateStr;
    }
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  } catch {
    // Fallback: try parsing as Date object
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
    } catch {
      // Ignore
    }
    return dateStr;
  }
};

/**
 * Parses date to YYYY-MM-DD format
 */
export const parseDateToYYYYMMDD = (date?: string | Date | null): string => {
  if (!date) return "";
  
  try {
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    
    if (typeof date === "string") {
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // Try to parse other formats
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
    
    return "";
  } catch {
    return "";
  }
};

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

const DEFAULT_CURRENCY = "USD";

/** Common symbols. All dollar currencies (USD, CAD, AUD, NZD) use $. */
const CURRENCY_SYMBOL_OVERRIDES: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  NZD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  JPY: "¥",
};

/**
 * Returns the currency symbol for a given ISO 4217 currency code.
 * Dollar currencies (USD, CAD, AUD, NZD) return "$". Uses overrides then Intl. Defaults to USD if code is missing/invalid.
 */
export const getCurrencySymbol = (currencyCode?: string | null): string => {
  const code = (currencyCode || DEFAULT_CURRENCY).toUpperCase().trim();
  if (!code) return "$";
  if (CURRENCY_SYMBOL_OVERRIDES[code]) return CURRENCY_SYMBOL_OVERRIDES[code];
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const parts = formatter.formatToParts(0);
    const symbol = parts.find((p) => p.type === "currency")?.value ?? "$";
    return symbol;
  } catch {
    return "$";
  }
};

/**
 * Formats currency value for display.
 * Dollar currencies (USD, CAD, AUD, NZD) use "$" symbol. Uses overrides when available.
 * @param value - The number to format
 * @param currencyCode - ISO 4217 currency code (e.g. USD, EUR). Defaults to USD.
 */
export const formatCurrency = (
  value?: number | null,
  currencyCode?: string | null
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return formatCurrency(0, currencyCode);
  }
  const code = (currencyCode || DEFAULT_CURRENCY).toUpperCase().trim();
  if (!code) return `$${value.toFixed(2)}`;
  
  // If we have an override (e.g. AUD -> "$"), use it to ensure consistent symbol
  if (CURRENCY_SYMBOL_OVERRIDES[code]) {
    const symbol = CURRENCY_SYMBOL_OVERRIDES[code];
    // Format number with locale-aware number formatting, then prepend symbol
    const formattedNumber = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${symbol}${formattedNumber}`;
  }
  
  // For currencies without overrides, use Intl with currency style
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

/**
 * Returns a label for metrics that use currency, using the currency **symbol** (e.g. "Spend ($)", "Sales (€)").
 * Use in column headers or summary. We show symbol only, not currency code.
 * When multiple profiles with different currencies: use first selected profile's currency for the page/summary.
 */
export const getCurrencyMetricLabel = (
  metricName: string,
  currencyCode?: string | null
): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${metricName} (${symbol})`;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a date is not in the past
 */
export const validateDateNotInPast = (dateStr: string): { valid: boolean; error?: string } => {
  if (!dateStr) {
    return { valid: true };
  }
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  
  if (dateStr < todayStr) {
    return { valid: false, error: "Date cannot be in the past" };
  }
  
  return { valid: true };
};

/**
 * Validates that end date is not before start date
 */
export const validateEndDateAfterStart = (endDateStr: string, startDateStr?: string | null): { valid: boolean; error?: string } => {
  if (!endDateStr || !startDateStr) {
    return { valid: true };
  }
  
  if (endDateStr < startDateStr) {
    return { valid: false, error: "End date cannot be before start date" };
  }
  
  return { valid: true };
};

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parses Google API error messages and extracts the error message for display
 * Shows the error message as-is from the API response
 */
export const parseGoogleApiError = (error: any): { title: string; message: string } => {
  let errorMessage = "An unexpected error occurred";
  const title = "Update Failed";

  // Handle Error instance
  if (error instanceof Error) {
    errorMessage = error.message;
  }
  // Handle API response with errors array
  else if (error?.response?.data) {
    if (error.response.data.error) {
      errorMessage = error.response.data.error;
    } else if (error.response.data.errors && Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
      // Just use the first error message as-is
      errorMessage = error.response.data.errors[0];
    }
  }
  // Handle string errors
  else if (typeof error === "string") {
    errorMessage = error;
  }
  // Handle object with message property
  else if (error?.message) {
    errorMessage = error.message;
  }

  return { title, message: errorMessage };
};
