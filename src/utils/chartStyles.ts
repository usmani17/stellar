/**
 * Shared chart styling — used by ChartRender and dashboard charts
 */

export const CHART_COLORS = [
  "#136D6D", /* forest-f40, semantic-status-primary */
  "#0E4E4E", /* forest-f50 darker teal */
  "#506766", /* forest-f30 text-secondary */
  "#9BB1B0", /* forest-f20 lighter teal */
  "#169aa3", /* cyan accent */
  "#059669", /* semantic-status-success */
];

/** Brighter teal for dark mode accents — #136D6D is too muted on dark backgrounds */
export const ACCENT_DARK = "#2DD4BF"; /* teal-400 */

/** Brighter palette for dark mode — good contrast on dark backgrounds */
export const CHART_COLORS_DARK = [
  ACCENT_DARK,
  "#34D399", /* emerald-400 */
  "#60A5FA", /* blue-400 */
  "#A78BFA", /* violet-400 */
  "#F472B6", /* pink-400 */
  "#FBBF24", /* amber-400 */
];

export function getChartColors(isDark: boolean): string[] {
  return isDark ? CHART_COLORS_DARK : CHART_COLORS;
}

const METRIC_COLOR_MAP: Record<string, string> = {
  sales: CHART_COLORS[0],
  spend: CHART_COLORS[1],
  roas: CHART_COLORS[0],
  impressions: CHART_COLORS[2],
  clicks: CHART_COLORS[4],
  acos: CHART_COLORS[5],
};

export function getSeriesColor(seriesKey: string, index: number): string {
  const key = String(seriesKey).toLowerCase();
  return METRIC_COLOR_MAP[key] ?? CHART_COLORS[index % CHART_COLORS.length];
}

export const AXIS_STYLE = {
  stroke: "#556179",
  fontSize: 9.6,
  fill: "#556179",
  axisLine: false,
  tickLine: false,
};

export const AXIS_STYLE_DARK = {
  stroke: "#9ca3af",
  fontSize: 9.6,
  fill: "#d1d5db",
  axisLine: false,
  tickLine: false,
};

export const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: "9.6px",
  boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
};
