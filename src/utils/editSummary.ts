/**
 * Generic, reusable edit-summary types and helpers for inline/bulk edits
 * across Amazon pages (Campaigns, AdGroups, Keywords, Targets, CampaignDetail).
 */

import { formatCurrency } from "./formatters";

/** Format old/new value with currency when field is Budget or Bid. */
export function formatMoneyForEditSummary(
  value: string | number | undefined | null,
  currency?: string
): string {
  if (value == null || value === "" || value === "—") return "—";
  const num = typeof value === "number"
    ? value
    : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return String(value);
  return formatCurrency(num, currency ?? "USD");
}

/** Check if field is a money field (budget, bid, default_bid). */
export function isMoneyField(field: string | undefined): boolean {
  const f = (field ?? "").toLowerCase();
  return f === "budget" || f === "bid" || f === "default_bid";
}

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

/**
 * Row for the edit summary table.
 * Use label + field + oldValue + newValue for entity change rows.
 * Use label + value for legacy/summary rows (value maps to newValue when field empty).
 */
export interface EditSummaryDetail {
  /** Entity name (e.g. campaign name). */
  label: string;
  /** What changed (e.g. "State", "Budget"). Empty for summary rows. */
  field?: string;
  /** Previous value (e.g. "Enabled"). */
  oldValue?: string;
  /** New value (e.g. "Paused"). */
  newValue?: string;
  /** Legacy: single value (used when field/oldValue/newValue not provided). */
  value?: string;
}

export interface EditSummaryOptions {
  entityType: EntityType;
  action: EditAction;
  mode: "inline" | "bulk";
  /** Succeeded count. For inline, use 1. */
  succeededCount: number;
  /** Failed count. Omit when all succeeded. */
  failedCount?: number;
  /** Inline only: entity name to display (e.g. campaign name). Falls back to entity type label. */
  entityName?: string;
  /** Inline only: field changed (e.g. status, bid). */
  field?: string;
  /** Inline only: previous value. */
  oldValue?: string;
  /** Inline only: new value. */
  newValue?: string;
  /** Optional extra rows (e.g. for failed items). */
  details?: EditSummaryDetail[];
  /** Bulk only: succeeded entities (up to 10). field/oldValue/newValue for 4-column layout. */
  succeededItems?: Array<{
    label: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
  }>;
}

export interface EditSummaryResult {
  title: string;
  summary: string;
  details: EditSummaryDetail[];
  variant: "success" | "partial" | "error";
}

export function buildEditSummary(opts: EditSummaryOptions): EditSummaryResult {
  const { entityType, action, mode, succeededCount, failedCount = 0 } = opts;
  const singular = ENTITY_LABELS[entityType];
  const plural = ENTITY_LABELS_PLURAL[entityType];
  const details: EditSummaryDetail[] = [];

  if (mode === "inline") {
    const entityLabel = opts.entityName ?? singular;
    const base = `${singular} ${action} successfully.`;
    if (opts.field && (opts.oldValue != null || opts.newValue != null)) {
      const field = fieldLabel(opts.field);
      details.unshift({
        label: entityLabel,
        field,
        oldValue: opts.oldValue ?? "—",
        newValue: opts.newValue ?? "—",
      });
    }
    const summary =
      details.length > 0
        ? `${base} ${details.map((d) => `${d.field}: ${d.oldValue ?? ""} → ${d.newValue ?? ""}`).join(".")}`
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
  const allFailed = hasFailure && succeededCount === 0;
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
      summary = `All ${failedCount > 1 ? failedCount + " " : ""}${failedCount === 1 ? singular : plural} failed to ${verb}.`;
    }
  }

  // Add succeeded item rows (up to 10) with entity name | field | old value | new value
  const succeededItems = opts.succeededItems ?? [];
  const maxSucceededNames = 10;
  for (let i = 0; i < Math.min(succeededItems.length, maxSucceededNames); i++) {
    const item = succeededItems[i];
    details.push({
      label: item.label,
      field: item.field ?? "—",
      oldValue: item.oldValue ?? "—",
      newValue: item.newValue ?? "—",
    });
  }
  if (succeededItems.length > maxSucceededNames) {
    details.push({
      label: `... and ${succeededItems.length - maxSucceededNames} more`,
      field: "—",
      oldValue: "—",
      newValue: "—",
    });
  }

  details.push({
    label: "Succeeded",
    field: "—",
    oldValue: "—",
    newValue: String(succeededCount),
  });
  if (failedCount > 0) {
    details.push({
      label: "Failed",
      field: "—",
      oldValue: "—",
      newValue: String(failedCount),
    });
  }

  // Add failed item details (errors): entity name | Error | — | message
  if (opts.details?.length) {
    for (const d of opts.details) {
      details.push({
        label: d.label,
        field: "Error",
        oldValue: "—",
        newValue: d.value ?? d.newValue ?? "—",
      });
    }
  }

  // Determine variant: error if all failed, partial if some failed, success if none failed
  let variant: "success" | "partial" | "error";
  let title: string;
  if (allFailed) {
    variant = "error";
    title = "Update failed";
  } else if (hasFailure) {
    variant = "partial";
    title = "Partial success";
  } else {
    variant = "success";
    title = "Update complete";
  }

  return {
    title,
    summary,
    details,
    variant,
  };
}
