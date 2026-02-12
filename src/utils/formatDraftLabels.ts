/**
 * Display labels for draft entity fields (platform, level, status).
 * Single status column holds draft, approved, rejected, pending_apply, applying, applied, failed.
 */

const PLATFORM_MAP: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  amazon: "Amazon",
};

const LEVEL_MAP: Record<string, string> = {
  campaign: "Campaign",
  ad_group: "Ad Group",
  ad: "Ad",
};

/** Single status column: lifecycle + workflow values. */
const STATUS_MAP: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  applied: "Applied",
  published: "Published",
  pending_apply: "Pending Apply",
  applying: "Applying",
  failed: "Failed",
};

function capitalizeFirst(val: string): string {
  if (!val) return val;
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
}

function titleCase(val: string): string {
  if (!val) return val;
  return val
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => capitalizeFirst(w))
    .join(" ");
}

export function formatPlatform(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const v = value.toLowerCase();
  return PLATFORM_MAP[v] ?? capitalizeFirst(value);
}

export function formatLevel(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const v = value.toLowerCase();
  return LEVEL_MAP[v] ?? titleCase(value);
}

export function formatStatus(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const v = value.toLowerCase();
  return STATUS_MAP[v] ?? capitalizeFirst(value);
}

/** Format the single status column (same as formatStatus; alias for "current status" display). */
export function formatCurrentStatus(value: string | null | undefined): string {
  return formatStatus(value);
}

const CAMPAIGN_TYPE_MAP: Record<string, string> = {
  DEMAND_GEN: "Demand Gen",
  PERFORMANCE_MAX: "Performance Max",
  SEARCH: "Search",
  SHOPPING: "Shopping",
  VIDEO: "Video",
};

export function formatCampaignType(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const v = (value || "").toUpperCase().replace(/-/g, "_");
  return CAMPAIGN_TYPE_MAP[v] ?? titleCase(String(value));
}
