import type { DashboardConfig } from "../types/dashboard";

/**
 * Full-fledged test dashboard — exercises all query types and viz types.
 * Demo order: KPIs, charts/graphs, new viz types, then tables.
 */
export const FULL_TEST_DASHBOARD_CONFIG: DashboardConfig = {
  layout: {
    cols: 2,
    rows: 10,
  },
  components: [
    // ── First 4 in demo: Daily spend, Keyword Spend, Spend by campaign (pie), Impressions over time ──
    {
      id: "daily-spend",
      title: "Daily spend",
      data_source: "internal_db",
      query: {
        sql: "SELECT date, SUM(cost_micros) AS cost_micros FROM reports_campaign WHERE workspace_id = %(workspace_id)s AND date >= %(since)s GROUP BY date ORDER BY date ASC",
        params: { since: "2025-02-01" },
      },
      filters: {},
      visualization_type: "line_chart",
      sort: { field: "date", order: "asc" },
      pagination: null,
      refresh_interval_seconds: 300,
    },
    {
      id: "keyword-spend-chart",
      title: "Keyword Spend (Last 30 Days)",
      data_source: "google_ads",
      query: {
        gaql:
          "SELECT ad_group_criterion.keyword.text, metrics.cost_micros FROM keyword_view WHERE segments.date DURING LAST_30_DAYS AND ad_group_criterion.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 10",
        format: "json",
      },
      filters: {},
      pagination: null,
      visualization_type: "bar_chart",
      sort: { field: "metrics.cost_micros", order: "desc" },
      refresh_interval_seconds: 300,
    },
    {
      id: "spend-by-campaign-pie",
      title: "Spend by campaign (pie)",
      data_source: "google_ads",
      query: {
        gaql:
          "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 5",
        format: "json",
      },
      filters: {},
      pagination: null,
      visualization_type: "pie_chart",
      sort: { field: "metrics.cost_micros", order: "desc" },
      refresh_interval_seconds: 300,
    },
    {
      id: "impressions-over-time",
      title: "Impressions over time",
      data_source: "google_ads",
      query: {
        gaql:
          "SELECT segments.date, metrics.impressions FROM campaign WHERE segments.date DURING LAST_14_DAYS ORDER BY segments.date ASC",
        format: "json",
      },
      filters: {},
      pagination: null,
      visualization_type: "area_chart",
      sort: { field: "segments.date", order: "asc" },
      refresh_interval_seconds: 300,
    },
    {
      id: "spend-by-campaign-bar",
      title: "Spend by campaign (bar)",
      data_source: "google_ads",
      query: {
        gaql:
          "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 5",
        format: "json",
      },
      filters: {},
      pagination: null,
      visualization_type: "bar_chart",
      sort: { field: "metrics.cost_micros", order: "desc" },
      refresh_interval_seconds: 300,
    },
    // ── Single Metric KPI Row ──
    {
      id: "total-spend-kpi",
      title: "Total Spend (KPI)",
      data_source: "google_ads",
      query: {
        gaql: "SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS",
        format: "json",
      },
      filters: {},
      visualization_type: "single_metric",
      data_keys: { x: "", series: ["metrics.impressions", "metrics.clicks", "metrics.costMicros", "metrics.conversions"] },
      sort: { field: "metrics.costMicros", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 2,
    },
    // ── Combo Chart ──
    {
      id: "spend-ctr-combo",
      title: "Spend (bars) + CTR (line)",
      data_source: "google_ads",
      query: {
        gaql: "SELECT segments.date, metrics.cost_micros, metrics.ctr FROM campaign WHERE segments.date DURING LAST_14_DAYS ORDER BY segments.date ASC",
        format: "json",
      },
      filters: {},
      visualization_type: "combo_chart",
      data_keys: { x: "segments.date", series: ["metrics.costMicros", "metrics.ctr"] },
      sort: { field: "segments.date", order: "asc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Comparison Chart ──
    {
      id: "month-comparison",
      title: "This month vs last month",
      data_source: "google_ads",
      query: {
        gaql: "SELECT campaign.name, metrics.clicks, metrics.impressions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC LIMIT 5",
        format: "json",
      },
      filters: {},
      visualization_type: "comparison_chart",
      data_keys: { x: "campaign.name", series: ["metrics.clicks", "metrics.impressions"] },
      sort: { field: "metrics.clicks", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Stacked Bar Chart ──
    {
      id: "spend-stacked",
      title: "Spend by campaign type (stacked)",
      data_source: "google_ads",
      query: {
        gaql: "SELECT segments.date, metrics.cost_micros, metrics.clicks FROM campaign WHERE segments.date DURING LAST_7_DAYS ORDER BY segments.date ASC",
        format: "json",
      },
      filters: {},
      visualization_type: "stacked_bar_chart",
      data_keys: { x: "segments.date", series: ["metrics.costMicros", "metrics.clicks"] },
      sort: { field: "segments.date", order: "asc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Donut Chart ──
    {
      id: "budget-donut",
      title: "Budget allocation",
      data_source: "google_ads",
      query: {
        gaql: "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 5",
        format: "json",
      },
      filters: {},
      visualization_type: "donut_chart",
      data_keys: { x: "campaign.name", series: ["metrics.costMicros"] },
      sort: { field: "metrics.costMicros", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Funnel Chart ──
    {
      id: "conversion-funnel",
      title: "Conversion funnel",
      data_source: "google_ads",
      query: {
        gaql: "SELECT metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS",
        format: "json",
      },
      filters: {},
      visualization_type: "funnel_chart",
      sort: { field: "value", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Scatter Plot ──
    {
      id: "spend-vs-conversions",
      title: "Spend vs Conversions",
      data_source: "google_ads",
      query: {
        gaql: "SELECT campaign.name, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 20",
        format: "json",
      },
      filters: {},
      visualization_type: "scatter_plot",
      data_keys: { x: "metrics.costMicros", series: ["metrics.conversions"] },
      sort: { field: "metrics.costMicros", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Gauge Chart ──
    {
      id: "budget-utilization",
      title: "Budget utilization",
      data_source: "internal_db",
      query: {
        sql: "SELECT ROUND(SUM(cost_micros)::numeric / NULLIF(SUM(budget_micros), 0) * 100, 1) AS utilization FROM reports_campaign WHERE workspace_id = %(workspace_id)s AND date >= %(since)s",
        params: { since: "2025-02-01" },
      },
      filters: {},
      visualization_type: "gauge_chart",
      data_keys: { x: "", series: ["utilization"] },
      sort: { field: "utilization", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Horizontal Bar Chart ──
    {
      id: "top-campaigns-horizontal",
      title: "Top 10 campaigns by spend",
      data_source: "google_ads",
      query: {
        gaql: "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 10",
        format: "json",
      },
      filters: {},
      visualization_type: "horizontal_bar_chart",
      data_keys: { x: "campaign.name", series: ["metrics.costMicros"] },
      sort: { field: "metrics.costMicros", order: "desc" },
      pagination: null,
      refresh_interval_seconds: 300,
      rows: 1,
      cols: 1,
    },
    // ── Tables ──
    {
      id: "campaign-perf",
      title: "Campaign performance",
      data_source: "google_ads",
      query: {
        gaql:
          "SELECT campaign.id, campaign.name, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC",
        format: "json",
      },
      filters: {},
      visualization_type: "table",
      sort: { field: "metrics.clicks", order: "desc" },
      pagination: { page: 1, page_size: 25 },
      refresh_interval_seconds: 300,
    },
    {
      id: "campaign-perf-date-range",
      title: "Campaign performance (date preset)",
      data_source: "google_ads",
      query: {
        gaql:
          "SELECT campaign.id, campaign.name, metrics.clicks FROM campaign WHERE segments.date BETWEEN '{{date_start}}' AND '{{date_end}}'",
        format: "json",
        date_range: { preset: "last30days" },
      },
      filters: {},
      visualization_type: "table",
      sort: { field: "metrics.clicks", order: "desc" },
      pagination: { page: 1, page_size: 25 },
      refresh_interval_seconds: 300,
    },
    {
      id: "campaign-keyword-summary",
      title: "Campaign and keyword totals (joined + aggregated)",
      data_source: "google_ads",
      query: {
        multi_gaql: {
          queries: [
            {
              id: "campaigns",
              gaql:
                "SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS",
            },
            {
              id: "keywords",
              gaql:
                "SELECT campaign.id, metrics.clicks AS keyword_clicks, metrics.cost_micros AS keyword_cost_micros FROM keyword_view WHERE segments.date DURING LAST_7_DAYS",
            },
          ],
          join: {
            type: "inner",
            on: [["campaigns.campaign.id", "keywords.campaign.id"]],
          },
          aggregation: {
            group_by: ["campaigns.campaign.name", "campaigns.campaign.id"],
            metrics: {
              total_impressions: {
                op: "sum",
                field: "campaigns.metrics.impressions",
              },
              total_clicks: { op: "sum", field: "campaigns.metrics.clicks" },
              total_cost_micros: {
                op: "sum",
                field: "campaigns.metrics.cost_micros",
              },
              keyword_clicks: {
                op: "sum",
                field: "keywords.metrics.keyword_clicks",
              },
              campaign_count: { op: "count" },
            },
          },
        },
      },
      filters: {},
      visualization_type: "table",
      sort: { field: "total_clicks", order: "desc" },
      pagination: { page: 1, page_size: 25 },
      refresh_interval_seconds: 300,
    },
    {
      id: "workflow-runs",
      title: "Recent workflow runs",
      data_source: "internal_db",
      query: {
        sql: "SELECT id, workflow_id, ran_at, status, output_url FROM assistant.workflow_run_history h JOIN assistant.workflow w ON w.id = h.workflow_id WHERE w.workspace_id = %(workspace_id)s AND w.account_id = %(account_id)s ORDER BY h.ran_at DESC LIMIT %(limit)s",
        params: { limit: 50 },
      },
      filters: {},
      visualization_type: "table",
      sort: { field: "ran_at", order: "desc" },
      pagination: { page: 1, page_size: 20 },
      refresh_interval_seconds: 60,
    },
  ],
};
