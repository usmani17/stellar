/**
 * Normalize status values to consistent display format for Amazon entities.
 * Frontend UI should always show: "Enabled", "Paused", "Archived"
 */
export function normalizeStatusDisplay(status: string | null | undefined): string {
  if (!status) return "Enabled";
  
  const normalized = status.toLowerCase().trim();
  
  switch (normalized) {
    case "enable":
    case "enabled":
      return "Enabled";
    case "pause":
    case "paused":
      return "Paused";
    case "archive":
    case "archived":
      return "Archived";
    default:
      // Fallback: capitalize first letter
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}
