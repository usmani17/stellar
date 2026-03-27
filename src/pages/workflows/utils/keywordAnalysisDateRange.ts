import type { DashboardComponent } from "../types/dashboard";
import {
  isGaqlQuery,
  isMetaInsightsQuery,
  isMultiMetaQuery,
} from "../types/dashboard";

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const PRESET_DAYS: Record<string, number> = {
  last3days: 3,
  last7days: 7,
  last30days: 30,
  last90days: 90,
  lastyear: 365,
  thisweek: 7,
  thismonth: 30,
};

/**
 * Best-effort ISO date range for keyword-analysis API from widget query config.
 * Falls back to last 30 days when not derivable.
 */
export function getKeywordAnalysisDateRangeFromComponent(
  component: DashboardComponent
): { start_date: string; end_date: string } {
  const end = new Date();
  const defaultStart = new Date();
  defaultStart.setUTCDate(end.getUTCDate() - 30);

  const q = component.query;

  if (isMetaInsightsQuery(q)) {
    const tr = q.meta_insights.time_range;
    if (tr && "since" in tr && "until" in tr && tr.since && tr.until) {
      return { start_date: String(tr.since), end_date: String(tr.until) };
    }
  }

  if (isMultiMetaQuery(q)) {
    const first = q.multi_meta.queries[0];
    const tr = first?.time_range;
    if (tr && "since" in tr && "until" in tr && tr.since && tr.until) {
      return { start_date: String(tr.since), end_date: String(tr.until) };
    }
  }

  if (isGaqlQuery(q) && q.date_range?.preset) {
    const n = PRESET_DAYS[q.date_range.preset] ?? 30;
    const s = new Date();
    s.setUTCDate(end.getUTCDate() - n);
    return { start_date: formatYmd(s), end_date: formatYmd(end) };
  }

  return { start_date: formatYmd(defaultStart), end_date: formatYmd(end) };
}
