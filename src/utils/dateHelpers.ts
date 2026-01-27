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
  
  // Handle ISO format dates (e.g., "2025-12-24T00:00:00" or "2025-12-24T00:00:00Z")
  // Extract just the date part before 'T' or space
  const dateOnly = trimmedDate.split(/[T\s]/)[0];
  const parts = dateOnly.split("-");
  
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

/**
 * Formats a timestamp to a relative time string (e.g., "2 min ago", "1 hour ago")
 * Handles ISO format timestamps from the backend
 * 
 * @param dateString - ISO format timestamp string (e.g., "2026-01-26T10:30:00Z")
 * @returns Relative time string or "Never" if invalid/null
 */
export const formatTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString) return "Never";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Never";
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
  } catch (e) {
    return "Never";
  }
};

/**
 * Formats a timestamp to a beautiful date/time display
 * Handles ISO format timestamps from the backend
 * 
 * @param dateString - ISO format timestamp string (e.g., "2026-01-26T10:30:00Z")
 * @returns Formatted date/time string (e.g., "Jan 26, 2026 at 10:30 AM") or "Never" if invalid/null
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "Never";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Never";
    }
    
    // Format: "Jan 26, 2026 at 10:30 AM"
    const datePart = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    return `${datePart} at ${timePart}`;
  } catch (e) {
    return "Never";
  }
};

