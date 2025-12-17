/**
 * Formats a date string (YYYY-MM-DD) to a localized date string
 * without timezone conversion issues.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param options - Optional formatting options
 * @returns Formatted date string (e.g., "Dec 25, 2025") or "—" if invalid
 */
export const formatDateString = (
  dateStr: string | null | undefined,
  options: {
    month?: "short" | "long" | "numeric" | "2-digit";
    day?: "numeric" | "2-digit";
    year?: "numeric" | "2-digit";
  } = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string => {
  if (!dateStr) return "—";
  
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return "—";
    }
    
    // Create date in local timezone to avoid timezone conversion issues
    const date = new Date(year, month, day);
    
    // Validate the date is valid
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return "—";
    }
    
    return date.toLocaleDateString("en-US", options);
  }
  
  return "—";
};

/**
 * Parses a date string to YYYY-MM-DD format
 * Handles various date formats and returns normalized format
 * Avoids timezone conversion issues by parsing YYYY-MM-DD strings manually
 * 
 * @param dateStr - Date string in various formats (preferably YYYY-MM-DD)
 * @returns Date string in YYYY-MM-DD format or empty string if invalid
 */
export const parseDateToYYYYMMDD = (dateStr: string | null | undefined): string => {
  if (!dateStr || dateStr === "—" || dateStr.trim() === "") {
    return "";
  }
  
  const trimmedDate = dateStr.trim();
  const parts = trimmedDate.split("-");
  
  // If already in YYYY-MM-DD format, parse manually to avoid timezone issues
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    // Validate the date parts
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      // Reconstruct the date string to ensure it's in YYYY-MM-DD format
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  
  // If not in YYYY-MM-DD format, try to parse it with Date object
  try {
    const date = new Date(trimmedDate);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Fallback to original if parsing fails
    return trimmedDate;
  }
  
  return "";
};

