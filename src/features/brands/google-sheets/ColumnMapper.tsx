import React, { useEffect, useMemo } from "react";
import type { ColumnMapping } from "./api";

interface Props {
  mapping: ColumnMapping[];
  previewColumns: string[];
  onChange: (next: ColumnMapping[]) => void;
  /** Ignored: no Save button. Kept for parent compatibility. */
  loading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  int8: "Integer (int8)",
  boolean: "Boolean",
  date: "Date",
  datetime: "DateTime",
  currency: "Currency",
  percentage: "Percentage",
};

function typeDisplayLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/** System columns always present in mapping. */
const SYSTEM_COLUMNS = ["created_at", "updated_at"];

/**
 * Access pattern: key columns are campaignid, Ad ID, adset id (if present), and any column ending in "ID".
 * We decide key ourselves; user does not set it.
 */
function isKeyColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase().trim();
  const normalized = lower.replace(/\s+/g, "_");
  if (normalized === "campaignid" || normalized === "campaign_id") return true;
  if (normalized === "ad_id" || lower === "ad id") return true;
  if (normalized === "adset_id" || lower === "adset id") return true;
  // All columns ending in "ID": "Campaign ID", "Ad ID", "account_id", "CampaignID"
  if (lower.endsWith(" id") || normalized.endsWith("_id")) return true;
  if (normalized.length >= 2 && normalized.endsWith("id")) return true;
  return false;
}

/** Infer column type from column name (e.g. Month → datetime, campaignID → text). */
function inferColumnType(columnName: string): string {
  const lower = columnName.toLowerCase().trim().replace(/\s+/g, " ");
  const normalized = lower.replace(/\s+/g, "_");

  // campaignID / campaign_id → text (identifier, not numeric)
  if (
    normalized === "campaignid" ||
    normalized === "campaign_id" ||
    lower === "campaign id"
  ) {
    return "text";
  }

  // Month → timestamp (datetime)
  if (normalized === "month" || lower === "month") {
    return "datetime";
  }

  // created_at / updated_at → datetime
  if (SYSTEM_COLUMNS.includes(normalized) || SYSTEM_COLUMNS.includes(lower)) {
    return "datetime";
  }

  // int8 columns by name
  const int8Patterns = [
    "total spend dollars",
    "total enrolled member count",
    "30 day dder count",
    "30 day dd cac",
    "30 day pa cac",
  ];
  if (int8Patterns.some((p) => lower.includes(p))) return "int8";

  const datePatterns = [
    "date",
    "day",
    "year",
    "week",
    "quarter",
  ];
  if (datePatterns.some((p) => lower.includes(p)) && !lower.includes("datetime")) {
    if (lower.includes("time") || lower.includes("timestamp")) return "datetime";
    return "date";
  }
  if (lower.includes("created") || lower.includes("updated")) {
    return "datetime";
  }

  const currencyPatterns = [
    "price",
    "cost",
    "amount",
    "revenue",
    "spend",
    "budget",
    "fee",
    "sales",
    "total",
    "balance",
    "payment",
  ];
  if (currencyPatterns.some((p) => lower.includes(p))) return "currency";
  const percentagePatterns = [
    "percent",
    "rate",
    "acos",
    "roas",
    "ctr",
    "cvr",
    "margin",
    "pct",
    "%",
  ];
  if (percentagePatterns.some((p) => lower.includes(p))) return "percentage";
  const numberPatterns = [
    "count",
    "quantity",
    "qty",
    "number",
    "num",
    "impressions",
    "clicks",
    "orders",
    "units",
  ];
  if (numberPatterns.some((p) => lower.includes(p))) return "number";
  return "text";
}

export const ColumnMapper: React.FC<Props> = ({
  mapping,
  previewColumns,
  onChange,
  loading: _loading,
}) => {
  const displayMapping = useMemo(() => {
    const base = mapping.length
      ? [...mapping]
      : previewColumns.map((name, idx) => ({
          column_name: name,
          type: inferColumnType(name) as ColumnMapping["type"],
          ignore: false,
          is_key: isKeyColumn(name),
          position: idx + 1,
        }));

    // Ensure system columns created_at and updated_at are always present
    let nextPosition = base.length + 1;
    const systemToAdd = SYSTEM_COLUMNS.filter(
      (name) => !base.some((c) => c.column_name === name),
    );
    const appended = systemToAdd.map((name) => ({
      column_name: name,
      type: "datetime" as const,
      ignore: false,
      is_key: false,
      position: nextPosition++,
    }));
    const combined = appended.length ? [...base, ...appended] : base;
    return combined.map((col) => ({
      ...col,
      is_key: isKeyColumn(col.column_name),
      ignore: false,
    }));
  }, [mapping, previewColumns]);

  const sourceKey = `${previewColumns.join(",")}-${mapping.length}`;
  useEffect(() => {
    if (previewColumns.length > 0 || mapping.length > 0) {
      onChange(displayMapping);
    }
    // Only run when preview or mapping source changes, not when parent updates mapping after save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  return (
    <div className="overflow-x-auto border border-sandstorm-s40 rounded-[8px]">
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10">
              Column
            </th>
            <th className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {displayMapping.map((col) => (
            <tr key={col.column_name} className="border-t border-sandstorm-s40">
              <td className="px-3 py-1 text-[13px] text-forest-f60">
                {col.column_name}
              </td>
              <td className="px-3 py-1 text-[12px] text-forest-f30">
                {typeDisplayLabel(col.type)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ColumnMapper;

