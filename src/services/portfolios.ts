import api from "./api";

// ── Types ────────────────────────────────────────────────────────────────

export interface PortfolioCampaign {
  id: number;
  campaignId: string;
  campaignName: string;
  campaignType: string;
  campaignStatus: string;
  createdAt: string;
}

export interface PortfolioMetric {
  id: number;
  metricName: string;
  metricType: "default" | "conversion";
  isRecommended: boolean;
  createdAt: string;
}

export interface PortfolioLatestTracking {
  totalSpend: number | null;
  totalBudget: number | null;
  pacingPercentage: number | null;
  targetSpendFtd: number | null;
  l7dKpiValue: number | null;
  health: string | null;
  achievementPercentage: number | null;
  clicks: number | null;
  impressions: number | null;
  conversions: number | null;
  revenue: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  roas: number | null;
  targetKpiValue: number | null;
  targetKpiName: string | null;
  trackedAt: string | null;
  isLive?: boolean;
}

export interface Portfolio {
  id: number;
  name: string;
  status: "enabled" | "disabled";
  platform: "google" | "meta" | "tiktok" | "amazon";
  totalBudget: number;
  startDate: string | null;
  endDate: string | null;
  budgetFrequency?: string | null;
  metricType: "default" | "conversion";
  targetType: string | null;
  targetValue: number | null;
  frequency: string | null;
  runAt: string | null;
  scheduleTimezone: string | null;
  emailNotifications: boolean;
  scheduleEnabled: boolean;
  tags: string[];
  guardrails: Record<string, unknown> | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  accountId: number;
  accountName: string;
  channelId: number | null;
  channelName: string;
  profileId: number | null;
  profileName: string;
  owner: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  campaigns?: PortfolioCampaign[];
  metrics?: PortfolioMetric[];
}

export interface PortfolioListItem extends Portfolio {
  campaignCount: number;
  dashboardCount?: number;
  /** Most recently updated dashboard linked to this portfolio, if any. */
  latestDashboardId?: number | null;
  /** First conversion metric name from portfolio setup (for KPI subtitle in list). */
  primaryConversionMetricName?: string | null;
  latestTracking: PortfolioLatestTracking | null;
}

export interface PortfolioPaginatedResponse {
  results: PortfolioListItem[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PortfolioSummary {
  totalPortfolios: number;
  livePortfolios: number;
  behindPacing: number;
  needAttention: number;
}

export interface TrackingSnapshot {
  id: number;
  trackedAt: string;
  triggeredBy: string;
  status: string;
  errorMessage: string | null;
  totalSpend: number | null;
  totalBudget: number | null;
  pacingPercentage: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  revenue: number | null;
  reach: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  roas: number | null;
  ctr: number | null;
  targetKpiValue: number | null;
  targetKpiName: string | null;
  targetSpendFtd?: number | null;
  l7dKpiValue?: number | null;
  health?: string | null;
  achievementPercentage?: number | null;
  campaignSnapshots: Record<string, unknown>[] | null;
  createdAt: string;
}

export interface TrackingPaginatedResponse {
  results: TrackingSnapshot[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreatePortfolioPayload {
  name: string;
  platform: "google" | "meta" | "tiktok" | "amazon";
  channelId: number;
  profileId?: number | null;
  totalBudget: number;
  startDate?: string | null;
  endDate?: string | null;
  metricType?: "default" | "conversion";
  targetType?: string | null;
  targetValue?: number | null;
  tags?: string[];
  guardrails?: Record<string, unknown> | null;
  budgetFrequency?: string | null;
  campaigns?: Array<{
    campaign_id: string;
    campaign_name: string;
    campaign_type?: string;
    campaign_status?: string;
  }>;
  metrics?: Array<{
    metric_name: string;
    metric_type?: "default" | "conversion";
    is_recommended?: boolean;
  }>;
}

export interface UpdatePortfolioPayload {
  name?: string;
  status?: "enabled" | "disabled";
  totalBudget?: number;
  startDate?: string | null;
  endDate?: string | null;
  metricType?: "default" | "conversion";
  targetType?: string | null;
  targetValue?: number | null;
  tags?: string[];
  guardrails?: Record<string, unknown> | null;
  budgetFrequency?: string | null;
  campaigns?: Array<{
    campaign_id: string;
    campaign_name: string;
    campaign_type?: string;
    campaign_status?: string;
  }>;
  metrics?: Array<{
    metric_name: string;
    metric_type?: "default" | "conversion";
    is_recommended?: boolean;
  }>;
}

export interface MetricsPreviewResponse {
  clicks: number;
  impressions: number;
  spend: number;
  conversions: number;
  revenue: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
}

// ── Service ──────────────────────────────────────────────────────────────

export const portfoliosService = {
  getPortfolios: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    account_id?: number;
  }): Promise<PortfolioPaginatedResponse> => {
    const { data } = await api.get<PortfolioPaginatedResponse>(
      "/assistant/portfolios/",
      { params },
    );
    return data;
  },

  getSummary: async (params?: {
    account_id?: number;
  }): Promise<PortfolioSummary> => {
    const { data } = await api.get<PortfolioSummary>(
      "/assistant/portfolios/summary/",
      { params },
    );
    return data;
  },

  getPortfolio: async (
    accountId: number,
    portfolioId: number,
  ): Promise<Portfolio> => {
    const { data } = await api.get<Portfolio>(
      `/assistant/${accountId}/portfolios/${portfolioId}/`,
    );
    return data;
  },

  createPortfolio: async (
    accountId: number,
    payload: CreatePortfolioPayload,
  ): Promise<Portfolio> => {
    const { data } = await api.post<Portfolio>(
      `/assistant/${accountId}/portfolios/`,
      payload,
    );
    return data;
  },

  updatePortfolio: async (
    accountId: number,
    portfolioId: number,
    payload: UpdatePortfolioPayload,
  ): Promise<Portfolio> => {
    const { data } = await api.patch<Portfolio>(
      `/assistant/${accountId}/portfolios/${portfolioId}/`,
      payload,
    );
    return data;
  },

  deletePortfolio: async (
    accountId: number,
    portfolioId: number,
  ): Promise<void> => {
    await api.delete(`/assistant/${accountId}/portfolios/${portfolioId}/`);
  },

  getTracking: async (
    accountId: number,
    portfolioId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<TrackingPaginatedResponse> => {
    const { data } = await api.get<TrackingPaginatedResponse>(
      `/assistant/${accountId}/portfolios/${portfolioId}/tracking/`,
      { params },
    );
    return data;
  },

  runPortfolio: async (
    accountId: number,
    portfolioId: number,
  ): Promise<{ status: string; message: string; portfolioId: number }> => {
    const { data } = await api.post(
      `/assistant/${accountId}/portfolios/${portfolioId}/run/`,
    );
    return data;
  },

  getMetricsPreview: async (
    accountId: number,
    payload: { platform: string; profileId: number; campaignIds: string[] },
  ): Promise<MetricsPreviewResponse> => {
    const { data } = await api.post<MetricsPreviewResponse>(
      `/assistant/${accountId}/portfolios/metrics-preview/`,
      payload,
    );
    return data;
  },

  getLiveMetrics: async (
    ids: number[],
  ): Promise<Record<string, PortfolioLatestTracking>> => {
    const { data } = await api.get<Record<string, PortfolioLatestTracking>>(
      "/assistant/portfolios/live-metrics/",
      { params: { ids: ids.join(",") } },
    );
    return data;
  },
};
