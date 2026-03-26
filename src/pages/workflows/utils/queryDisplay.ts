import type { DashboardQuery } from "../types/dashboard";
import { isGaqlQuery, isMultiGaqlQuery, isSqlQuery } from "../types/dashboard";

export function getQuerySummary(component: { query: DashboardQuery; data_source: string }): {
  type: string;
  preview: string;
  full: string;
} {
  const q = component.query;
  if (isGaqlQuery(q)) {
    const hasDateRange = q.date_range ? ` + date_range: ${q.date_range.preset}` : "";
    return {
      type: "GAQL",
      preview: q.gaql.slice(0, 80) + (q.gaql.length > 80 ? "…" : ""),
      full: q.gaql + hasDateRange,
    };
  }
  if (isMultiGaqlQuery(q)) {
    const m = q.multi_gaql;
    const queryList = m.queries
      .map((x) => `[${x.id}]: ${x.gaql}`)
      .join("\n\n");
    const agg = m.aggregation
      ? `\n\nAggregation: group_by [${m.aggregation.group_by.join(", ")}]`
      : "";
    return {
      type: "Multi-GAQL",
      preview: `${m.queries.length} queries → join on ${m.join.on.map((p) => p.join("=")).join(", ")}`,
      full: queryList + agg,
    };
  }
  if (isSqlQuery(q)) {
    return {
      type: "SQL",
      preview: q.sql.slice(0, 80) + (q.sql.length > 80 ? "…" : ""),
      full: q.sql + (q.params ? `\nParams: ${JSON.stringify(q.params)}` : ""),
    };
  }
  return { type: "Unknown", preview: "", full: "" };
}
