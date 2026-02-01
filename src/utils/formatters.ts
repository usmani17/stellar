/**
 * Normalize currency to ISO 4217 code for consistency.
 * Uses profile_currency_code from API; maps common symbols to codes.
 */
export const normalizeCurrencyCode = (currency: string | undefined | null): string => {
  const raw = (currency ?? "").trim().toUpperCase();
  if (!raw) return "USD";
  // Already a 3-letter ISO code
  if (raw.length === 3) return raw;
  // Map symbols to ISO codes for consistency ($ -> USD, MX$ -> MXN, CA$ -> CAD)
  const symbolMap: Record<string, string> = {
    "$": "USD",
    "US$": "USD",
    "MX$": "MXN",
    "CA$": "CAD",
  };
  if (symbolMap[raw]) return symbolMap[raw];
  // Pass through valid 3-letter ISO codes from profile_currency_code
  return raw.length === 3 ? raw : "USD";
};

/**
 * Format a number as currency.
 * Uses profile_currency_code from API response (USD, MXN, CAD, etc.)
 * @param value - The number to format
 * @param currency - ISO 4217 code or symbol from profile_currency_code
 * @returns Formatted currency string (e.g., "$1,234.56", "MX$1,234.56")
 */
export const formatCurrency = (
  value: number,
  currency: string = "USD"
): string => {
  const code = normalizeCurrencyCode(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a number as a percentage
 * @param value - The number to format (e.g., 15.5 for 15.5%)
 * @returns Formatted percentage string (e.g., "15.50%")
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

/**
 * Format a number with thousands separator
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format bytes to human readable size
 * @param bytes - Number of bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
