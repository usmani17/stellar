import { StatusBadge } from "../components/ui/StatusBadge";

/**
 * Convert campaign status to human-readable label
 * @param status - The status string (e.g., "ENABLED", "PAUSED")
 * @returns Human-readable status label
 */
export const getStatusBadgeLabel = (status: string): any => {
  const statusMap: Record<string, string> = {
    ENABLED: "Enable",
    PAUSED: "Paused",
    REMOVED: "Removed",
  };
    const statusLabel = statusMap[status.toUpperCase()] || "Paused";
    return <StatusBadge status={statusLabel} />;
};

/**
 * Convert channel/campaign type to human-readable label
 * @param type - The channel type string (e.g., "SEARCH", "DISPLAY")
 * @returns Human-readable type label
 */
export const getChannelTypeLabel = (type?: string): string => {
  if (!type) return "—";
  const typeMap: Record<string, string> = {
    SEARCH: "Search",
    DISPLAY: "Display",
    SHOPPING: "Shopping",
    PERFORMANCE_MAX: "Performance Max",
    DEMAND_GEN: "Demand Gen (YouTube)",
    VIDEO: "Video",
    HOTEL: "Hotel",
    MULTI_CHANNEL: "Multi Channel",
    LOCAL: "Local",
    SMART: "Smart",
  };
  return typeMap[type] || type;
};

/**
 * Convert campaign status to human-readable label
 * @param status - The status string (e.g., "ENABLED", "PAUSED")
 * @returns Human-readable status label
 */
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    ENABLED: "Enabled",
    PAUSED: "Paused",
    REMOVED: "Removed",
    PENDING: "Pending",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  };
  return statusMap[status.toUpperCase()] || status;
};

/**
 * Get status color for UI display
 * @param status - The status string
 * @returns CSS class name for the status color
 */
export const getStatusColor = (status: string): string => {
  const statusColorMap: Record<string, string> = {
    ENABLED: "bg-green-100 text-green-800",
    ACTIVE: "bg-green-100 text-green-800",
    PAUSED: "bg-yellow-100 text-yellow-800",
    PENDING: "bg-blue-100 text-blue-800",
    REMOVED: "bg-red-100 text-red-800",
    INACTIVE: "bg-gray-100 text-gray-800",
  };
  return statusColorMap[status.toUpperCase()] || "bg-gray-100 text-gray-800";
};
