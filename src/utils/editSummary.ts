/**
 * Generic, reusable edit-summary types and helpers for inline/bulk edits
 * across Amazon pages (Campaigns, AdGroups, Keywords, Targets, CampaignDetail).
 */

export type EntityType =
  | "campaign"
  | "adGroup"
  | "keyword"
  | "target"
  | "negativeKeyword"
  | "negativeTarget"
  | "productAd"
  | "sbAd"
  | "creative"
  | "asset";

export type EditAction = "updated" | "created" | "deleted" | "archived";

const ENTITY_LABELS: Record<EntityType, string> = {
  campaign: "Campaign",
  adGroup: "Ad group",
  keyword: "Keyword",
  target: "Target",
  negativeKeyword: "Negative keyword",
  negativeTarget: "Negative target",
  productAd: "Product ad",
  sbAd: "Sponsored Brands ad",
  creative: "Creative",
  asset: "Asset",
};

const ENTITY_LABELS_PLURAL: Record<EntityType, string> = {
  campaign: "Campaigns",
  adGroup: "Ad groups",
  keyword: "Keywords",
  target: "Targets",
  negativeKeyword: "Negative keywords",
  negativeTarget: "Negative targets",
  productAd: "Product ads",
  sbAd: "Sponsored Brands ads",
  creative: "Creatives",
  asset: "Assets",
};

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    status: "Status",
    bid: "Bid",
    default_bid: "Default bid",
    name: "Name",
    budget: "Budget",
    budgetType: "Budget type",
    startDate: "Start date",
    endDate: "End date",
    state: "Status",
  };
  return map[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export interface EditSummaryDetail {
  label: string;
  value: string;
}

export interface EditSummaryOptions {
  entityType: EntityType;
  action: EditAction;
  mode: "inline" | "bulk";
  /** Succeeded count. For inline, use 1. */
  succeededCount: number;
  /** Failed count. Omit when all succeeded. */
  failedCount?: number;
  /** Inline only: field changed (e.g. status, bid). */
  field?: string;
  /** Inline only: previous value. */
  oldValue?: string;
  /** Inline only: new value. */
  newValue?: string;
  /** Optional extra rows. */
  details?: EditSummaryDetail[];
}

export interface EditSummaryResult {
  title: string;
  summary: string;
  details: EditSummaryDetail[];
  variant: "success" | "partial";
}

export function buildEditSummary(opts: EditSummaryOptions): EditSummaryResult {
  const { entityType, action, mode, succeededCount, failedCount = 0 } = opts;
  const singular = ENTITY_LABELS[entityType];
  const plural = ENTITY_LABELS_PLURAL[entityType];
  const details: EditSummaryDetail[] = [...(opts.details ?? [])];

  if (mode === "inline") {
    const base = `${singular} ${action} successfully.`;
    if (opts.field && (opts.oldValue != null || opts.newValue != null)) {
      const field = fieldLabel(opts.field);
      const change =
        opts.oldValue != null && opts.newValue != null
          ? `${opts.oldValue} → ${opts.newValue}`
          : opts.newValue != null
            ? opts.newValue
            : opts.oldValue ?? "";
      details.unshift({ label: field, value: change });
    }
    const summary =
      details.length > 0
        ? `${base} ${details.map((d) => `${d.label}: ${d.value}`).join(".")}`
        : base;
    return {
      title: "Update complete",
      summary,
      details,
      variant: "success",
    };
  }

  // Bulk
  const hasFailure = failedCount > 0;
  let summary: string;
  if (!hasFailure) {
    const n = succeededCount;
    const noun = n === 1 ? singular : plural;
    summary = `${n} ${noun} ${action} successfully.`;
  } else {
    if (succeededCount > 0) {
      summary = `${succeededCount} ${plural} ${action} successfully. ${failedCount} failed.`;
    } else {
      const verb = { updated: "update", created: "create", deleted: "delete", archived: "archive" }[action] ?? action;
      summary = `All ${failedCount} ${plural} failed to ${verb}.`;
    }
  }

  details.push({ label: "Succeeded", value: String(succeededCount) });
  if (failedCount > 0) {
    details.push({ label: "Failed", value: String(failedCount) });
  }

  return {
    title: hasFailure ? "Summary" : "Update complete",
    summary,
    details,
    variant: hasFailure ? "partial" : "success",
  };
}
