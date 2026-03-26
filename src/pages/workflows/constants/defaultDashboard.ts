import type { DashboardConfig } from "../types/dashboard";

/**
 * Hardcoded default dashboard config for workflow dashboards (MVP)
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  layout: {
    cols: 2,
    rows: 2,
  },
  components: [
    {
      id: "top-keywords",
      sort: {
        field: "metrics.cost_micros",
        order: "desc",
      },
      query: {
        gaql: "SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM keyword_view WHERE segments.date DURING LAST_30_DAYS AND ad_group_criterion.status != 'REMOVED' ORDER BY metrics.cost_micros DESC",
        format: "json",
      },
      title: "Top Keywords by Spend",
      filters: {},
      pagination: {
        page: 1,
        page_size: 25,
      },
      data_source: "google_ads",
      visualization_type: "table",
      refresh_interval_seconds: 300,
    },
    {
      id: "search-terms",
      sort: {
        field: "metrics.cost_micros",
        order: "desc",
      },
      query: {
        gaql: "SELECT search_term_view.search_term, search_term_view.status, campaign.name, ad_group.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC",
        format: "json",
      },
      title: "Top Search Terms",
      filters: {},
      pagination: {
        page: 1,
        page_size: 25,
      },
      data_source: "google_ads",
      visualization_type: "table",
      refresh_interval_seconds: 300,
    },
    {
      id: "keyword-spend-chart",
      sort: {
        field: "metrics.cost_micros",
        order: "desc",
      },
      query: {
        gaql: "SELECT ad_group_criterion.keyword.text, metrics.cost_micros FROM keyword_view WHERE segments.date DURING LAST_30_DAYS AND ad_group_criterion.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 10",
        format: "json",
      },
      title: "Keyword Spend (Last 30 Days)",
      filters: {},
      pagination: null,
      data_source: "google_ads",
      visualization_type: "bar_chart",
      refresh_interval_seconds: 300,
    },
    {
      id: "keyword-quality-score",
      sort: {
        field: "ad_group_criterion.quality_info.quality_score",
        order: "desc",
      },
      query: {
        gaql: "SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, campaign.name, ad_group.name, ad_group_criterion.quality_info.quality_score FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status = 'ENABLED' ORDER BY ad_group_criterion.quality_info.quality_score DESC LIMIT 25",
        format: "json",
      },
      title: "Keyword Quality Scores",
      filters: {},
      pagination: {
        page: 1,
        page_size: 25,
      },
      data_source: "google_ads",
      visualization_type: "table",
      refresh_interval_seconds: 300,
    },
  ],
};
