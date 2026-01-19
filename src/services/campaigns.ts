import api from "./api";

export interface Campaign {
  id: number; // Database ID (for internal use)
  campaignId: string | number; // Amazon campaign ID (e.g., '250760975023635')
  campaign_name: string;
  type: string;
  status: "Enable" | "Paused" | "Archived";
  daily_budget: number;
  spends: number;
  sales: number;
  impressions?: number;
  clicks?: number;
  acos: number;
  roas: number;
  last_sync: string;
  startDate?: string; // Campaign start date
  budgetType?: string; // Budget type (e.g., 'daily', 'lifetime')
  profile_name?: string; // Profile name
  profile_id?: string; // Profile ID
  profile_country_code?: string; // Profile country code
  report_date?: string; // Report date (YYYY-MM-DD) - one row per campaign per day
}

export interface CampaignSummary {
  total_campaigns: number;
  total_spends: number;
  total_sales: number;
  total_impressions: number;
  total_clicks: number;
  avg_acos: number;
  avg_roas: number;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  summary?: CampaignSummary;
  chart_data?: Array<{
    date: string;
    spend: number;
    sales: number;
    impressions?: number;
    clicks?: number;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CampaignsQueryParams {
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  // Campaign name filters with operators
  campaign_name?: string;
  campaign_name__icontains?: string;
  campaign_name__not_icontains?: string;
  // Budget filters with operators
  budget?: number | string;
  budget__lt?: number | string;
  budget__gt?: number | string;
  budget__lte?: number | string;
  budget__gte?: number | string;
  // State and Type filters (support arrays for multi-select)
  state?: string;
  state__in?: string[]; // For multi-select state filter
  type?: string;
  type__in?: string[]; // For multi-select type filter
  targeting_type?: string;
  targeting_type__in?: string[]; // For multi-select targeting_type filter
  // Profile name filters with operators
  profile_name?: string;
  profile_name__icontains?: string;
  profile_name__not_icontains?: string;
  profile_name__in?: string[]; // For multi-select profile filter
}

export interface CampaignDetail {
  campaign: {
    id: number;
    campaignId?: string | number;
    name: string;
    status: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    budgetType?: string;
    portfolioId?: string | number;
    description: string;
    targetingType?: string; // Only for SP campaigns: "AUTO" or "MANUAL" (camelCase)
    targeting_type?: string; // Only for SP campaigns: "AUTO" or "MANUAL" (snake_case)
    profile_id?: string; // Profile ID for the campaign
    profile_name?: string; // Profile name for the campaign
    type?: string; // Campaign type (SP, SB, SD)
  };
  kpi_cards: Array<{
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  }>;
  chart_data: Array<{
    date: string;
    spend: number;
    sales: number;
    impressions?: number;
    clicks: number;
    orders?: number;
    acos?: number;
    roas?: number;
  }>;
  top_keywords: Array<{
    name: string;
    ctr: string;
    status: string;
    spends: string;
    sales: string;
  }>;
  top_products: Array<{
    name: string;
    asin: string;
    sales: string;
  }>;
}

export interface AdGroup {
  id: number;
  adGroupId?: string;
  campaignId?: string;
  name: string;
  status: string;
  default_bid?: string;
  campaign_name?: string;
  profile_name?: string;
  profile_id?: string;
  type?: string;
  ctr: string;
  spends: string;
  sales: string;
  clicks?: number;
  impressions?: number;
  acos?: string;
  roas?: string;
}

export interface AdGroupsSummary {
  total_adgroups: number;
  total_spends: number;
  total_sales: number;
  total_impressions: number;
  total_clicks: number;
  avg_acos: number;
  avg_roas: number;
}

export interface AdGroupsListResponse {
  adgroups: AdGroup[];
  summary?: AdGroupsSummary;
  chart_data?: Array<{
    date: string;
    spend: number;
    sales: number;
    impressions?: number;
    clicks?: number;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdGroupsResponse {
  adgroups: AdGroup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Keyword {
  id: number;
  keywordId?: string | number;
  name: string;
  status: string;
  bid?: string;
  adgroup_name?: string;
  campaign_name?: string;
  campaignId?: string | number;
  profile_name?: string;
  type?: string;
  ctr: string;
  spends: string;
  sales: string;
  clicks?: number;
  impressions?: number;
  acos?: string;
  roas?: string;
}

export interface KeywordsSummary {
  total_keywords: number;
  total_spends: number;
  total_sales: number;
  total_impressions: number;
  total_clicks: number;
  avg_acos: number;
  avg_roas: number;
}

export interface KeywordsResponse {
  keywords: Keyword[];
  summary?: KeywordsSummary;
  chart_data?: Array<{
    date: string;
    spend: number;
    sales: number;
    impressions?: number;
    clicks?: number;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface KeywordsQueryParams {
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  // Name filters
  name?: string;
  name__icontains?: string;
  name__not_icontains?: string;
  // State and Type filters
  state?: string;
  type?: string;
  // Bid filters
  bid?: number | string;
  bid__lt?: number | string;
  bid__gt?: number | string;
  bid__lte?: number | string;
  bid__gte?: number | string;
  // Campaign name filters
  campaign_name?: string;
  campaign_name__icontains?: string;
  campaign_name__not_icontains?: string;
  // Adgroup name filters
  adgroup_name?: string;
  adgroup_name__icontains?: string;
  adgroup_name__not_icontains?: string;
  // Profile name filters
  profile_name?: string;
  profile_name__icontains?: string;
  profile_name__not_icontains?: string;
  // Spends, sales, ctr filters
  spends?: number | string;
  spends__lt?: number | string;
  spends__gt?: number | string;
  spends__lte?: number | string;
  spends__gte?: number | string;
  sales?: number | string;
  sales__lt?: number | string;
  sales__gt?: number | string;
  sales__lte?: number | string;
  sales__gte?: number | string;
  ctr?: number | string;
  ctr__lt?: number | string;
  ctr__gt?: number | string;
  ctr__lte?: number | string;
  ctr__gte?: number | string;
}

export interface TargetsQueryParams {
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  // Name filters
  name?: string;
  name__icontains?: string;
  name__not_icontains?: string;
  // State and Type filters
  state?: string;
  type?: string;
  // Bid filters
  bid?: number | string;
  bid__lt?: number | string;
  bid__gt?: number | string;
  bid__lte?: number | string;
  bid__gte?: number | string;
  // Campaign name filters
  campaign_name?: string;
  campaign_name__icontains?: string;
  campaign_name__not_icontains?: string;
  // Adgroup name filters
  adgroup_name?: string;
  adgroup_name__icontains?: string;
  adgroup_name__not_icontains?: string;
  // Profile name filters
  profile_name?: string;
  profile_name__icontains?: string;
  profile_name__not_icontains?: string;
  // Spends, sales, ctr filters
  spends?: number | string;
  spends__lt?: number | string;
  spends__gt?: number | string;
  spends__lte?: number | string;
  spends__gte?: number | string;
  sales?: number | string;
  sales__lt?: number | string;
  sales__gt?: number | string;
  sales__lte?: number | string;
  sales__gte?: number | string;
  ctr?: number | string;
  ctr__lt?: number | string;
  ctr__gt?: number | string;
  ctr__lte?: number | string;
  ctr__gte?: number | string;
}

export interface ProductAd {
  id: number;
  adId?: string;
  asin?: string;
  sku?: string;
  status: string;
  adGroupId?: string;
}

export interface ProductAdsResponse {
  productads: ProductAd[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Target {
  id: number;
  targetId?: string | number;
  name: string;
  status: string;
  bid?: string;
  adgroup_name?: string;
  campaign_name?: string;
  campaignId?: string | number;
  profile_name?: string;
  keyword?: string;
  keyword_type?: string;
  keyword_bid?: string;
  match_type?: string;
  targeting?: string;
  type?: string;
  ctr: string;
  spends: string;
  sales: string;
  clicks?: number;
  impressions?: number;
  acos?: string;
  roas?: string;
}

export interface TargetsSummary {
  total_targets: number;
  total_spends: number;
  total_sales: number;
  total_impressions: number;
  total_clicks: number;
  avg_acos: number;
  avg_roas: number;
}

export interface TargetsListResponse {
  targets: Target[];
  summary?: TargetsSummary;
  chart_data?: Array<{
    date: string;
    spend: number;
    sales: number;
    impressions?: number;
    clicks?: number;
    acos?: number;
    roas?: number;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TargetsResponse {
  targets: Target[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const campaignsService = {
  getCampaigns: async (
    accountId: number,
    params?: CampaignsQueryParams
  ): Promise<CampaignsResponse> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Budget filters
    if (params?.budget !== undefined) {
      filters.budget = params.budget;
    }
    if (params?.budget__lt !== undefined) {
      filters.budget__lt = params.budget__lt;
    }
    if (params?.budget__gt !== undefined) {
      filters.budget__gt = params.budget__gt;
    }
    if (params?.budget__lte !== undefined) {
      filters.budget__lte = params.budget__lte;
    }
    if (params?.budget__gte !== undefined) {
      filters.budget__gte = params.budget__gte;
    }
    // State and Type filters (support arrays for multi-select)
    if (params?.state__in) {
      filters.state__in = params.state__in;
    } else if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type__in) {
      filters.type__in = params.type__in;
    } else if (params?.type) {
      filters.type = params.type;
    }
    if (params?.targeting_type__in) {
      filters.targeting_type__in = params.targeting_type__in;
    } else if (params?.targeting_type) {
      filters.targeting_type = params.targeting_type;
    }
    // Profile name filters (support arrays for multi-select)
    if (params?.profile_name__in) {
      filters.profile_name__in = params.profile_name__in;
    } else if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }

    // Send POST request with filters in body
    const url = `/accounts/${accountId}/campaigns/`;
    const response = await api.post<CampaignsResponse>(url, { filters });
    return response.data;
  },

  exportCampaigns: async (
    accountId: number,
    params?: CampaignsQueryParams & {
      export_type?: "all_data" | "current_view";
    }
  ): Promise<{ url: string; filename: string }> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Budget filters
    if (params?.budget !== undefined) {
      filters.budget = params.budget;
    }
    if (params?.budget__lt !== undefined) {
      filters.budget__lt = params.budget__lt;
    }
    if (params?.budget__gt !== undefined) {
      filters.budget__gt = params.budget__gt;
    }
    if (params?.budget__lte !== undefined) {
      filters.budget__lte = params.budget__lte;
    }
    if (params?.budget__gte !== undefined) {
      filters.budget__gte = params.budget__gte;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    if (params?.targeting_type__in) {
      filters.targeting_type__in = params.targeting_type__in;
    } else if (params?.targeting_type) {
      filters.targeting_type = params.targeting_type;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }

    // Send POST request with filters and export_type in body
    const url = `/accounts/${accountId}/campaigns/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, {
      filters,
      export_type: params?.export_type || "all_data",
    });
    return response.data;
  },

  getAdGroupsList: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      // Name filters
      name?: string;
      name__icontains?: string;
      name__not_icontains?: string;
      // State and Type filters
      state?: string;
      type?: string;
      // Default bid filters
      default_bid?: number | string;
      default_bid__lt?: number | string;
      default_bid__gt?: number | string;
      default_bid__lte?: number | string;
      default_bid__gte?: number | string;
      // Campaign name filters
      campaign_name?: string;
      campaign_name__icontains?: string;
      campaign_name__not_icontains?: string;
      // Profile name filters
      profile_name?: string;
      profile_name__icontains?: string;
      profile_name__not_icontains?: string;
      // Spends, sales, ctr filters
      spends?: number | string;
      spends__lt?: number | string;
      spends__gt?: number | string;
      spends__lte?: number | string;
      spends__gte?: number | string;
      sales?: number | string;
      sales__lt?: number | string;
      sales__gt?: number | string;
      sales__lte?: number | string;
      sales__gte?: number | string;
      ctr?: number | string;
      ctr__lt?: number | string;
      ctr__gt?: number | string;
      ctr__lte?: number | string;
      ctr__gte?: number | string;
    }
  ): Promise<AdGroupsListResponse> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Name filters
    if (params?.name) {
      filters.name = params.name;
    }
    if (params?.name__icontains) {
      filters.name__icontains = params.name__icontains;
    }
    if (params?.name__not_icontains) {
      filters.name__not_icontains = params.name__not_icontains;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    // Default bid filters
    if (params?.default_bid !== undefined) {
      filters.default_bid = params.default_bid;
    }
    if (params?.default_bid__lt !== undefined) {
      filters.default_bid__lt = params.default_bid__lt;
    }
    if (params?.default_bid__gt !== undefined) {
      filters.default_bid__gt = params.default_bid__gt;
    }
    if (params?.default_bid__lte !== undefined) {
      filters.default_bid__lte = params.default_bid__lte;
    }
    if (params?.default_bid__gte !== undefined) {
      filters.default_bid__gte = params.default_bid__gte;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }
    // Spends, sales, ctr filters
    if (params?.spends !== undefined) {
      filters.spends = params.spends;
    }
    if (params?.spends__lt !== undefined) {
      filters.spends__lt = params.spends__lt;
    }
    if (params?.spends__gt !== undefined) {
      filters.spends__gt = params.spends__gt;
    }
    if (params?.spends__lte !== undefined) {
      filters.spends__lte = params.spends__lte;
    }
    if (params?.spends__gte !== undefined) {
      filters.spends__gte = params.spends__gte;
    }
    if (params?.sales !== undefined) {
      filters.sales = params.sales;
    }
    if (params?.sales__lt !== undefined) {
      filters.sales__lt = params.sales__lt;
    }
    if (params?.sales__gt !== undefined) {
      filters.sales__gt = params.sales__gt;
    }
    if (params?.sales__lte !== undefined) {
      filters.sales__lte = params.sales__lte;
    }
    if (params?.sales__gte !== undefined) {
      filters.sales__gte = params.sales__gte;
    }
    if (params?.ctr !== undefined) {
      filters.ctr = params.ctr;
    }
    if (params?.ctr__lt !== undefined) {
      filters.ctr__lt = params.ctr__lt;
    }
    if (params?.ctr__gt !== undefined) {
      filters.ctr__gt = params.ctr__gt;
    }
    if (params?.ctr__lte !== undefined) {
      filters.ctr__lte = params.ctr__lte;
    }
    if (params?.ctr__gte !== undefined) {
      filters.ctr__gte = params.ctr__gte;
    }

    const url = `/accounts/${accountId}/adgroups/`;
    const response = await api.post<AdGroupsListResponse>(url, { filters });
    return response.data;
  },

  exportAdGroups: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      export_type?: "all_data" | "current_view";
      // Name filters
      name?: string;
      name__icontains?: string;
      name__not_icontains?: string;
      // State and Type filters
      state?: string;
      type?: string;
      // Default bid filters
      default_bid?: number | string;
      default_bid__lt?: number | string;
      default_bid__gt?: number | string;
      default_bid__lte?: number | string;
      default_bid__gte?: number | string;
      // Campaign name filters
      campaign_name?: string;
      campaign_name__icontains?: string;
      campaign_name__not_icontains?: string;
      // Profile name filters
      profile_name?: string;
      profile_name__icontains?: string;
      profile_name__not_icontains?: string;
      // Spends, sales, ctr filters
      spends?: number | string;
      spends__lt?: number | string;
      spends__gt?: number | string;
      spends__lte?: number | string;
      spends__gte?: number | string;
      sales?: number | string;
      sales__lt?: number | string;
      sales__gt?: number | string;
      sales__lte?: number | string;
      sales__gte?: number | string;
      ctr?: number | string;
      ctr__lt?: number | string;
      ctr__gt?: number | string;
      ctr__lte?: number | string;
      ctr__gte?: number | string;
    }
  ): Promise<{ url: string; filename: string }> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Name filters
    if (params?.name) {
      filters.name = params.name;
    }
    if (params?.name__icontains) {
      filters.name__icontains = params.name__icontains;
    }
    if (params?.name__not_icontains) {
      filters.name__not_icontains = params.name__not_icontains;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    // Default bid filters
    if (params?.default_bid !== undefined) {
      filters.default_bid = params.default_bid;
    }
    if (params?.default_bid__lt !== undefined) {
      filters.default_bid__lt = params.default_bid__lt;
    }
    if (params?.default_bid__gt !== undefined) {
      filters.default_bid__gt = params.default_bid__gt;
    }
    if (params?.default_bid__lte !== undefined) {
      filters.default_bid__lte = params.default_bid__lte;
    }
    if (params?.default_bid__gte !== undefined) {
      filters.default_bid__gte = params.default_bid__gte;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }
    // Spends, sales, ctr filters
    if (params?.spends !== undefined) {
      filters.spends = params.spends;
    }
    if (params?.spends__lt !== undefined) {
      filters.spends__lt = params.spends__lt;
    }
    if (params?.spends__gt !== undefined) {
      filters.spends__gt = params.spends__gt;
    }
    if (params?.spends__lte !== undefined) {
      filters.spends__lte = params.spends__lte;
    }
    if (params?.spends__gte !== undefined) {
      filters.spends__gte = params.spends__gte;
    }
    if (params?.sales !== undefined) {
      filters.sales = params.sales;
    }
    if (params?.sales__lt !== undefined) {
      filters.sales__lt = params.sales__lt;
    }
    if (params?.sales__gt !== undefined) {
      filters.sales__gt = params.sales__gt;
    }
    if (params?.sales__lte !== undefined) {
      filters.sales__lte = params.sales__lte;
    }
    if (params?.sales__gte !== undefined) {
      filters.sales__gte = params.sales__gte;
    }
    if (params?.ctr !== undefined) {
      filters.ctr = params.ctr;
    }
    if (params?.ctr__lt !== undefined) {
      filters.ctr__lt = params.ctr__lt;
    }
    if (params?.ctr__gt !== undefined) {
      filters.ctr__gt = params.ctr__gt;
    }
    if (params?.ctr__lte !== undefined) {
      filters.ctr__lte = params.ctr__lte;
    }
    if (params?.ctr__gte !== undefined) {
      filters.ctr__gte = params.ctr__gte;
    }

    // Send POST request with filters and export_type in body
    const url = `/accounts/${accountId}/adgroups/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, {
      filters,
      export_type: params?.export_type || "all_data",
    });
    return response.data;
  },

  getCampaignDetail: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string,
    campaignType?: string
  ): Promise<CampaignDetail> => {
    const params = new URLSearchParams();
    if (startDate) {
      params.append("start_date", startDate);
    }
    if (endDate) {
      params.append("end_date", endDate);
    }
    if (campaignType) {
      params.append("type", campaignType);
    }

    const url = `/accounts/${accountId}/campaigns/${campaignId}/${params.toString() ? `?${params.toString()}` : ""
      }`;
    const response = await api.get<CampaignDetail>(url);
    return response.data;
  },

  getAdGroups: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      type?: string; // Campaign type (SP, SB, SD)
      // Filter parameters (flat object format expected by backend)
      [key: string]: any;
    }
  ): Promise<AdGroupsResponse> => {
    // Build filters object for POST request
    const filters: any = {
      ...params,
    };
    if (startDate) {
      filters.start_date = startDate;
    }
    if (endDate) {
      filters.end_date = endDate;
    }

    // Build URL with type query parameter if provided
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${campaignId}/adgroups/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.post<AdGroupsResponse>(url, { filters });
    return response.data;
  },

  getKeywords: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      type?: string; // Campaign type (SP, SB, SD)
      // Filter parameters (flat object format expected by backend)
      [key: string]: any;
    }
  ): Promise<KeywordsResponse> => {
    // Build filters object for POST request
    const filters: any = {
      ...params,
    };
    if (startDate) {
      filters.start_date = startDate;
    }
    if (endDate) {
      filters.end_date = endDate;
    }

    // Build URL with type query parameter if provided
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${campaignId}/keywords/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.post<KeywordsResponse>(url, { filters });
    return response.data;
  },

  getProductAds: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      type?: string; // Campaign type (SP, SB, SD)
      // Filter parameters (flat object format expected by backend)
      [key: string]: any;
    }
  ): Promise<ProductAdsResponse> => {
    // Build filters object for POST request
    const filters: any = {
      ...params,
    };
    if (startDate) {
      filters.start_date = startDate;
    }
    if (endDate) {
      filters.end_date = endDate;
    }

    // Build URL with type query parameter if provided
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${campaignId}/productads/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.post<ProductAdsResponse>(url, { filters });
    return response.data;
  },

  getTargets: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      type?: string; // Campaign type (SP, SB, SD)
      // Filter parameters (flat object format expected by backend)
      [key: string]: any;
    }
  ): Promise<TargetsResponse> => {
    // Build filters object for POST request
    const filters: any = {
      ...params,
    };
    if (startDate) {
      filters.start_date = startDate;
    }
    if (endDate) {
      filters.end_date = endDate;
    }

    // Build URL with type query parameter if provided
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${campaignId}/targets/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.post<TargetsResponse>(url, { filters });
    return response.data;
  },

  getNegativeKeywords: async (
    accountId: number,
    campaignId: string | number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      type?: string; // Campaign type (SP, SB, SD) - required
      // Filter parameters
      [key: string]: any;
    }
  ): Promise<{
    negative_keywords: Array<{
      id: number;
      keywordId?: number;
      name: string;
      matchType: string;
      status: string;
      adGroupId?: number;
      campaignId?: string | number;
      creationDateTime?: string;
      lastUpdateDateTime?: string;
      servingStatus?: string;
      servingStatusDetails?: string;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    // Build filters object for POST request
    const filters: any = {
      ...params,
    };

    // Build URL with type query parameter (required)
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${campaignId}/negative-keywords/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.post(url, { filters });
    return response.data;
  },

  getNegativeTargets: async (
    accountId: number,
    campaignId: string | number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      type?: string; // Campaign type (SP, SB, SD) - required
      // Filter parameters
      [key: string]: any;
    }
  ): Promise<{
    negative_targets: Array<{
      id: number;
      targetId?: number;
      name: string;
      expression: string;
      resolvedExpression?: string;
      status: string;
      adGroupId?: number;
      campaignId?: string | number;
      creationDateTime?: string;
      lastUpdateDateTime?: string;
      servingStatus?: string;
      servingStatusDetails?: string;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    // Build filters object for POST request
    const filters: any = {
      ...params,
    };

    // Build URL with type query parameter (required)
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${campaignId}/negative-targets/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.post(url, { filters });
    return response.data;
  },

  bulkUpdateCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action:
      | "status"
      | "budget"
      | "budgetType"
      | "name"
      | "portfolioId"
      | "endDate"
      | "targetingType";
      status?: "enable" | "pause" | "archive";
      budgetAction?: "increase" | "decrease" | "set";
      budgetType?: "DAILY" | "LIFETIME";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
      name?: string;
      portfolioId?: string | null;
      endDate?: string | null;
      targetingType?: "AUTO" | "MANUAL";
      tags?: Array<{ key: string; value: string }>;
      siteRestrictions?: string | null;
      dynamicBidding?: any;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  updateCampaign: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      name?: string;
      status?: "enable" | "pause";
      budget?: number;
      budgetType?: "DAILY" | "LIFETIME";
      endDate?: string | null;
      portfolioId?: string | null;
      targetingType?: "AUTO" | "MANUAL";
      tags?: Array<{ key: string; value: string }>;
      siteRestrictions?: string | null;
      dynamicBidding?: any;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/update/`;
    const response = await api.put(url, payload);
    return response.data;
  },

  bulkUpdateAdGroups: async (
    accountId: number,
    payload: {
      adgroupIds: Array<string | number>;
      action: "status" | "default_bid" | "name";
      status?: "ENABLED" | "PAUSED";
      value?: number;
      name?: string;
    }
  ) => {
    const url = `/accounts/${accountId}/adgroups/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  getKeywordsList: async (
    accountId: number,
    params?: KeywordsQueryParams
  ): Promise<KeywordsResponse> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Name filters
    if (params?.name) {
      filters.name = params.name;
    }
    if (params?.name__icontains) {
      filters.name__icontains = params.name__icontains;
    }
    if (params?.name__not_icontains) {
      filters.name__not_icontains = params.name__not_icontains;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    // Bid filters
    if (params?.bid !== undefined) {
      filters.bid = params.bid;
    }
    if (params?.bid__lt !== undefined) {
      filters.bid__lt = params.bid__lt;
    }
    if (params?.bid__gt !== undefined) {
      filters.bid__gt = params.bid__gt;
    }
    if (params?.bid__lte !== undefined) {
      filters.bid__lte = params.bid__lte;
    }
    if (params?.bid__gte !== undefined) {
      filters.bid__gte = params.bid__gte;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Adgroup name filters
    if (params?.adgroup_name) {
      filters.adgroup_name = params.adgroup_name;
    }
    if (params?.adgroup_name__icontains) {
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    }
    if (params?.adgroup_name__not_icontains) {
      filters.adgroup_name__not_icontains = params.adgroup_name__not_icontains;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }
    // Spends, sales, ctr filters
    if (params?.spends !== undefined) {
      filters.spends = params.spends;
    }
    if (params?.spends__lt !== undefined) {
      filters.spends__lt = params.spends__lt;
    }
    if (params?.spends__gt !== undefined) {
      filters.spends__gt = params.spends__gt;
    }
    if (params?.spends__lte !== undefined) {
      filters.spends__lte = params.spends__lte;
    }
    if (params?.spends__gte !== undefined) {
      filters.spends__gte = params.spends__gte;
    }
    if (params?.sales !== undefined) {
      filters.sales = params.sales;
    }
    if (params?.sales__lt !== undefined) {
      filters.sales__lt = params.sales__lt;
    }
    if (params?.sales__gt !== undefined) {
      filters.sales__gt = params.sales__gt;
    }
    if (params?.sales__lte !== undefined) {
      filters.sales__lte = params.sales__lte;
    }
    if (params?.sales__gte !== undefined) {
      filters.sales__gte = params.sales__gte;
    }
    if (params?.ctr !== undefined) {
      filters.ctr = params.ctr;
    }
    if (params?.ctr__lt !== undefined) {
      filters.ctr__lt = params.ctr__lt;
    }
    if (params?.ctr__gt !== undefined) {
      filters.ctr__gt = params.ctr__gt;
    }
    if (params?.ctr__lte !== undefined) {
      filters.ctr__lte = params.ctr__lte;
    }
    if (params?.ctr__gte !== undefined) {
      filters.ctr__gte = params.ctr__gte;
    }

    // Send POST request with filters in body
    const url = `/accounts/${accountId}/keywords/`;
    const response = await api.post<KeywordsResponse>(url, { filters });
    return response.data;
  },

  exportKeywords: async (
    accountId: number,
    params?: KeywordsQueryParams & {
      export_type?: "all_data" | "current_view";
    }
  ): Promise<{ url: string; filename: string }> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Name filters
    if (params?.name) {
      filters.name = params.name;
    }
    if (params?.name__icontains) {
      filters.name__icontains = params.name__icontains;
    }
    if (params?.name__not_icontains) {
      filters.name__not_icontains = params.name__not_icontains;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    // Bid filters
    if (params?.bid !== undefined) {
      filters.bid = params.bid;
    }
    if (params?.bid__lt !== undefined) {
      filters.bid__lt = params.bid__lt;
    }
    if (params?.bid__gt !== undefined) {
      filters.bid__gt = params.bid__gt;
    }
    if (params?.bid__lte !== undefined) {
      filters.bid__lte = params.bid__lte;
    }
    if (params?.bid__gte !== undefined) {
      filters.bid__gte = params.bid__gte;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Adgroup name filters
    if (params?.adgroup_name) {
      filters.adgroup_name = params.adgroup_name;
    }
    if (params?.adgroup_name__icontains) {
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    }
    if (params?.adgroup_name__not_icontains) {
      filters.adgroup_name__not_icontains = params.adgroup_name__not_icontains;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }
    // Spends, sales, ctr filters
    if (params?.spends !== undefined) {
      filters.spends = params.spends;
    }
    if (params?.spends__lt !== undefined) {
      filters.spends__lt = params.spends__lt;
    }
    if (params?.spends__gt !== undefined) {
      filters.spends__gt = params.spends__gt;
    }
    if (params?.spends__lte !== undefined) {
      filters.spends__lte = params.spends__lte;
    }
    if (params?.spends__gte !== undefined) {
      filters.spends__gte = params.spends__gte;
    }
    if (params?.sales !== undefined) {
      filters.sales = params.sales;
    }
    if (params?.sales__lt !== undefined) {
      filters.sales__lt = params.sales__lt;
    }
    if (params?.sales__gt !== undefined) {
      filters.sales__gt = params.sales__gt;
    }
    if (params?.sales__lte !== undefined) {
      filters.sales__lte = params.sales__lte;
    }
    if (params?.sales__gte !== undefined) {
      filters.sales__gte = params.sales__gte;
    }
    if (params?.ctr !== undefined) {
      filters.ctr = params.ctr;
    }
    if (params?.ctr__lt !== undefined) {
      filters.ctr__lt = params.ctr__lt;
    }
    if (params?.ctr__gt !== undefined) {
      filters.ctr__gt = params.ctr__gt;
    }
    if (params?.ctr__lte !== undefined) {
      filters.ctr__lte = params.ctr__lte;
    }
    if (params?.ctr__gte !== undefined) {
      filters.ctr__gte = params.ctr__gte;
    }

    // Send POST request with filters and export_type in body
    const url = `/accounts/${accountId}/keywords/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, {
      filters,
      export_type: params?.export_type || "all_data",
    });
    return response.data;
  },

  bulkUpdateKeywords: async (
    accountId: number,
    payload: {
      keywordIds: Array<string | number>;
      action: "status" | "bid" | "archive";
      status?: "enable" | "pause";
      bid?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/keywords/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteKeywords: async (
    accountId: number,
    payload: {
      keywordIdFilter: {
        include: Array<string | number>;
      };
    }
  ) => {
    const url = `/accounts/${accountId}/keywords/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteNegativeKeywords: async (
    accountId: number,
    payload: {
      negativeKeywordIdFilter: {
        include: Array<string | number>;
      };
      campaignType?: string;
      campaignId?: string | number;
    }
  ) => {
    const url = `/accounts/${accountId}/negative-keywords/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteTargets: async (
    accountId: number,
    payload: {
      targetIdFilter: {
        include: Array<string | number>;
      };
    }
  ) => {
    const url = `/accounts/${accountId}/targets/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteAdGroups: async (
    accountId: number,
    payload: {
      adGroupIdFilter: {
        include: Array<string | number>;
      };
    }
  ) => {
    const url = `/accounts/${accountId}/adgroups/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteNegativeTargets: async (
    accountId: number,
    payload: {
      negativeTargetIdFilter: {
        include: Array<string | number>;
      };
    }
  ) => {
    const url = `/accounts/${accountId}/negative-targets/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkDeleteProductAds: async (
    accountId: number,
    payload: {
      adIdFilter: {
        include: Array<string | number>;
      };
    }
  ) => {
    const url = `/accounts/${accountId}/productads/bulk-delete/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateProductAds: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      productAds: Array<{
        adId: string;
        state: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/productads/update/`;
    const response = await api.put(url, payload);
    return response.data;
  },

  createAdGroups: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      adgroups: Array<{
        name: string;
        defaultBid: number;
        state: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/adgroups/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createKeywords: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      keywords: Array<{
        adGroupId: string;
        keywordText: string;
        matchType: "BROAD" | "PHRASE" | "EXACT";
        bid: number;
        state: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/keywords/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createTargets: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      targets: Array<{
        adGroupId: string;
        bid: number;
        expression: Array<{
          type: string;
          value: string;
        }>;
        expressionType: "MANUAL";
        state: "ENABLED" | "PAUSED" | "PROPOSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/targets/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createSBAds: async (
    accountId: number,
    campaignId: string,
    data: { ads: any[] }
  ): Promise<any> => {
    const response = await api.post(
      `/accounts/${accountId}/campaigns/${campaignId}/sb-ads/create/`,
      data
    );
    return response.data;
  },

  createSBVideoAds: async (
    accountId: number,
    campaignId: string,
    data: { ads: any[] }
  ): Promise<any> => {
    // Add adType parameter to indicate this is a video ad request
    const response = await api.post(
      `/accounts/${accountId}/campaigns/${campaignId}/sb-video-ads/create/`,
      { ...data, adType: 'VIDEO' }
    );
    return response.data;
  },

  updateSBAds: async (
    accountId: number,
    campaignId: string,
    data: { ads: any[] }
  ): Promise<any> => {
    const response = await api.put(
      `/accounts/${accountId}/campaigns/${campaignId}/sb-ads/update/`,
      data
    );
    return response.data;
  },

  deleteSBAds: async (
    accountId: number,
    campaignId: string,
    data: { adIds: string[] }
  ): Promise<any> => {
    const response = await api.delete(
      `/accounts/${accountId}/campaigns/${campaignId}/sb-ads/delete/`,
      { data }
    );
    return response.data;
  },

  getAssets: async (
    accountId: number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      mediaType?: string;
      brandEntityId?: string;
      profileId?: string;
    }
  ): Promise<any> => {
    const response = await api.get(`/accounts/${accountId}/assets/`, {
      params,
    });
    return response.data;
  },

  createAsset: async (
    accountId: number,
    formData: FormData,
    onUploadProgress?: (progress: number) => void
  ): Promise<any> => {
    const response = await api.post(
      `/accounts/${accountId}/assets/create/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(progress);
          }
        },
      }
    );
    return response.data;
  },

  getAssetPreview: async (
    accountId: number,
    assetId: string,
    profileId: string
  ): Promise<{ previewUrl: string; contentType?: string | null; assetData: any }> => {
    const response = await api.get(
      `/accounts/${accountId}/assets/${assetId}/preview/`,
      {
        params: { profileId },
      }
    );
    return response.data;
  },

  createProductAds: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      productAds: Array<{
        adGroupId: string;
        asin: string;
        sku?: string;
        customText?: string;
        globalStoreSetting?: {
          catalogSourceCountryCode?: string;
        };
        state: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/productads/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  updateProductAds: async (
    accountId: number,
    campaignId: string | number,
    payload: {
      productAds: Array<{
        adId: string;
        state: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/productads/update/`;
    const response = await api.put(url, payload);
    return response.data;
  },

  createCampaign: async (
    accountId: number,
    payload: {
      campaign_name: string;
      type: "SP" | "SB" | "SD";
      budget: number;
      budgetType?: "DAILY" | "LIFETIME" | "daily";
      status: "Enabled" | "Paused" | "enabled" | "ENABLED" | "PAUSED";
      startDate?: string;
      endDate?: string;
      profile_name?: string;
      // SB specific fields
      brandEntityId?: string;
      goal?: string;
      productLocation?: "SOLD_ON_AMAZON" | "NOT_SOLD_ON_AMAZON" | "SOLD_ON_DTC";
      costType?: string;
      portfolioId?: string;
      siteRestrictions?: string[];
      targetedPGDealId?: string;
      tags?: Array<{ key: string; value: string }>;
      smartDefault?: "MANUAL" | "TARGETING";
      bidding?: {
        bidOptimization?: boolean;
        shopperCohortBidAdjustments?: Array<{
          shopperCohortType: string;
          percentage: number;
          audienceSegments: Array<{
            audienceId: string;
            audienceSegmentType: string;
          }>;
        }>;
        bidAdjustmentsByPlacement?: Array<{
          percentage: number;
          placement: string;
        }>;
      };
      // SD specific fields
      tactic?: string;
      // SP specific fields
      targetingType?: "AUTO" | "MANUAL";
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  getTargetsList: async (
    accountId: number,
    params?: TargetsQueryParams
  ): Promise<TargetsListResponse> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Name filters
    if (params?.name) {
      filters.name = params.name;
    }
    if (params?.name__icontains) {
      filters.name__icontains = params.name__icontains;
    }
    if (params?.name__not_icontains) {
      filters.name__not_icontains = params.name__not_icontains;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    // Bid filters
    if (params?.bid !== undefined) {
      filters.bid = params.bid;
    }
    if (params?.bid__lt !== undefined) {
      filters.bid__lt = params.bid__lt;
    }
    if (params?.bid__gt !== undefined) {
      filters.bid__gt = params.bid__gt;
    }
    if (params?.bid__lte !== undefined) {
      filters.bid__lte = params.bid__lte;
    }
    if (params?.bid__gte !== undefined) {
      filters.bid__gte = params.bid__gte;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Adgroup name filters
    if (params?.adgroup_name) {
      filters.adgroup_name = params.adgroup_name;
    }
    if (params?.adgroup_name__icontains) {
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    }
    if (params?.adgroup_name__not_icontains) {
      filters.adgroup_name__not_icontains = params.adgroup_name__not_icontains;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }
    // Spends, sales, ctr filters
    if (params?.spends !== undefined) {
      filters.spends = params.spends;
    }
    if (params?.spends__lt !== undefined) {
      filters.spends__lt = params.spends__lt;
    }
    if (params?.spends__gt !== undefined) {
      filters.spends__gt = params.spends__gt;
    }
    if (params?.spends__lte !== undefined) {
      filters.spends__lte = params.spends__lte;
    }
    if (params?.spends__gte !== undefined) {
      filters.spends__gte = params.spends__gte;
    }
    if (params?.sales !== undefined) {
      filters.sales = params.sales;
    }
    if (params?.sales__lt !== undefined) {
      filters.sales__lt = params.sales__lt;
    }
    if (params?.sales__gt !== undefined) {
      filters.sales__gt = params.sales__gt;
    }
    if (params?.sales__lte !== undefined) {
      filters.sales__lte = params.sales__lte;
    }
    if (params?.sales__gte !== undefined) {
      filters.sales__gte = params.sales__gte;
    }
    if (params?.ctr !== undefined) {
      filters.ctr = params.ctr;
    }
    if (params?.ctr__lt !== undefined) {
      filters.ctr__lt = params.ctr__lt;
    }
    if (params?.ctr__gt !== undefined) {
      filters.ctr__gt = params.ctr__gt;
    }
    if (params?.ctr__lte !== undefined) {
      filters.ctr__lte = params.ctr__lte;
    }
    if (params?.ctr__gte !== undefined) {
      filters.ctr__gte = params.ctr__gte;
    }

    // Send POST request with filters in body
    const url = `/accounts/${accountId}/targets/`;
    const response = await api.post<TargetsListResponse>(url, { filters });
    return response.data;
  },

  exportTargets: async (
    accountId: number,
    params?: TargetsQueryParams & {
      export_type?: "all_data" | "current_view";
    }
  ): Promise<{ url: string; filename: string }> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    // Name filters
    if (params?.name) {
      filters.name = params.name;
    }
    if (params?.name__icontains) {
      filters.name__icontains = params.name__icontains;
    }
    if (params?.name__not_icontains) {
      filters.name__not_icontains = params.name__not_icontains;
    }
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
    }
    // Bid filters
    if (params?.bid !== undefined) {
      filters.bid = params.bid;
    }
    if (params?.bid__lt !== undefined) {
      filters.bid__lt = params.bid__lt;
    }
    if (params?.bid__gt !== undefined) {
      filters.bid__gt = params.bid__gt;
    }
    if (params?.bid__lte !== undefined) {
      filters.bid__lte = params.bid__lte;
    }
    if (params?.bid__gte !== undefined) {
      filters.bid__gte = params.bid__gte;
    }
    // Campaign name filters
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.campaign_name__icontains) {
      filters.campaign_name__icontains = params.campaign_name__icontains;
    }
    if (params?.campaign_name__not_icontains) {
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    }
    // Adgroup name filters
    if (params?.adgroup_name) {
      filters.adgroup_name = params.adgroup_name;
    }
    if (params?.adgroup_name__icontains) {
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    }
    if (params?.adgroup_name__not_icontains) {
      filters.adgroup_name__not_icontains = params.adgroup_name__not_icontains;
    }
    // Profile name filters
    if (params?.profile_name) {
      filters.profile_name = params.profile_name;
    }
    if (params?.profile_name__icontains) {
      filters.profile_name__icontains = params.profile_name__icontains;
    }
    if (params?.profile_name__not_icontains) {
      filters.profile_name__not_icontains = params.profile_name__not_icontains;
    }
    // Spends, sales, ctr filters
    if (params?.spends !== undefined) {
      filters.spends = params.spends;
    }
    if (params?.spends__lt !== undefined) {
      filters.spends__lt = params.spends__lt;
    }
    if (params?.spends__gt !== undefined) {
      filters.spends__gt = params.spends__gt;
    }
    if (params?.spends__lte !== undefined) {
      filters.spends__lte = params.spends__lte;
    }
    if (params?.spends__gte !== undefined) {
      filters.spends__gte = params.spends__gte;
    }
    if (params?.sales !== undefined) {
      filters.sales = params.sales;
    }
    if (params?.sales__lt !== undefined) {
      filters.sales__lt = params.sales__lt;
    }
    if (params?.sales__gt !== undefined) {
      filters.sales__gt = params.sales__gt;
    }
    if (params?.sales__lte !== undefined) {
      filters.sales__lte = params.sales__lte;
    }
    if (params?.sales__gte !== undefined) {
      filters.sales__gte = params.sales__gte;
    }
    if (params?.ctr !== undefined) {
      filters.ctr = params.ctr;
    }
    if (params?.ctr__lt !== undefined) {
      filters.ctr__lt = params.ctr__lt;
    }
    if (params?.ctr__gt !== undefined) {
      filters.ctr__gt = params.ctr__gt;
    }
    if (params?.ctr__lte !== undefined) {
      filters.ctr__lte = params.ctr__lte;
    }
    if (params?.ctr__gte !== undefined) {
      filters.ctr__gte = params.ctr__gte;
    }

    // Send POST request with filters and export_type in body
    const url = `/accounts/${accountId}/targets/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, {
      filters,
      export_type: params?.export_type || "all_data",
    });
    return response.data;
  },

  bulkUpdateTargets: async (
    accountId: number,
    payload: {
      targetIds: Array<string | number>;
      action: "status" | "bid";
      status?: "enable" | "pause"; // ARCHIVED is not supported for targets
      bid?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/targets/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createNegativeKeywords: async (
    accountId: number,
    campaignId: string,
    payload: {
      negativeKeywords: Array<{
        adGroupId: string;
        keywordText: string;
        matchType: "NEGATIVE_BROAD" | "NEGATIVE_EXACT" | "NEGATIVE_PHRASE";
        nativeLanguageKeyword?: string;
        nativeLanguageLocale?: string;
        state?: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/negative-keywords/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateNegativeKeywords: async (
    accountId: number,
    payload: {
      keywordIds: Array<string | number>;
      action: "status";
      status: "enable" | "pause";
    }
  ) => {
    const url = `/accounts/${accountId}/negative-keywords/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createNegativeTargets: async (
    accountId: number,
    campaignId: string,
    payload: {
      negativeTargetingClauses: Array<{
        adGroupId: string;
        expression: Array<{
          type: string;
          value: string;
        }>;
        state?: "ENABLED" | "PAUSED";
      }>;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/negative-targets/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateNegativeTargets: async (
    accountId: number,
    payload: {
      targetIds: Array<string | number>;
      action: "status";
      status: "enable" | "pause";
    }
  ) => {
    const url = `/accounts/${accountId}/negative-targets/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  // Google Campaigns
  syncGoogleCampaigns: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/campaigns/sync/`
    );
    return response.data;
  },

  syncGoogleCampaignAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    synced: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_deleted?: number;
    errors?: string[];
    message?: string;
    customer_stats?: any;
    date_range?: any;
  }> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(
      `/google-adwords/${accountId}/campaigns/analytics-sync/`,
      payload
    );
    return response.data;
  },

  syncGoogleAdGroupAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    synced: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_deleted?: number;
    errors?: string[];
    message?: string;
    customer_stats?: any;
    date_range?: any;
  }> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(
      `/google-adwords/${accountId}/adgroups/analytics-sync/`,
      payload
    );
    return response.data;
  },

  syncGoogleAdAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    synced: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_deleted?: number;
    errors?: string[];
    message?: string;
    customer_stats?: any;
    date_range?: any;
  }> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(
      `/google-adwords/${accountId}/ads/analytics-sync/`,
      payload
    );
    return response.data;
  },

  syncGoogleKeywordAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    synced: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_deleted?: number;
    errors?: string[];
    message?: string;
    customer_stats?: any;
    date_range?: any;
  }> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(
      `/google-adwords/${accountId}/keywords/analytics-sync/`,
      payload
    );
    return response.data;
  },

  getGoogleCampaigns: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      campaign_name?: string;
      campaign_name__icontains?: string;
      campaign_name__not_icontains?: string;
      status?: string;
      advertising_channel_type?: string;
      budget?: number | string;
      budget__lt?: number | string;
      budget__gt?: number | string;
      budget__lte?: number | string;
      budget__gte?: number | string;
      account_name?: string;
      account_name__icontains?: string;
      account_name__not_icontains?: string;
    }
  ): Promise<{
    campaigns: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    chart_data?: Array<{
      date: string;
      spend: number;
      sales: number;
      impressions?: number;
      clicks?: number;
    }>;
    summary?: {
      total_campaigns: number;
      total_spends: number;
      total_sales: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions?: number;
      total_interactions?: number;
      total_budget?: number;
      avg_acos: number;
      avg_roas: number;
      avg_conversion_rate?: number;
      avg_cost_per_conversion?: number;
      avg_interaction_rate?: number;
      avg_cost?: number;
      avg_cpc?: number;
    };
  }> => {
    const filters: any = {};

    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.campaign_name) filters.campaign_name = params.campaign_name;
    if (params?.campaign_name__icontains)
      filters.campaign_name__icontains = params.campaign_name__icontains;
    if (params?.campaign_name__not_icontains)
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    if (params?.status) filters.status = params.status;
    if (params?.advertising_channel_type)
      filters.advertising_channel_type = params.advertising_channel_type;
    if (params?.budget !== undefined) filters.budget = params.budget;
    if (params?.budget__lt !== undefined)
      filters.budget__lt = params.budget__lt;
    if (params?.budget__gt !== undefined)
      filters.budget__gt = params.budget__gt;
    if (params?.budget__lte !== undefined)
      filters.budget__lte = params.budget__lte;
    if (params?.budget__gte !== undefined)
      filters.budget__gte = params.budget__gte;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains)
      filters.account_name__not_icontains = params.account_name__not_icontains;

    const response = await api.post(
      `/google-adwords/${accountId}/campaigns/`,
      { filters }
    );
    return response.data;
  },

  bulkUpdateGoogleCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action: "name" | "status" | "budget" | "start_date" | "end_date" | "bidding_strategy";
      name?: string;
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      budget?: number;
      start_date?: string;
      end_date?: string;
      bidding_strategy_type?: string;
      target_cpa_micros?: number;
      target_roas?: number;
      target_impression_share_location?: string;
      target_impression_share_location_fraction_micros?: number;
      target_impression_share_cpc_bid_ceiling_micros?: number;
      budgetAction?: "increase" | "decrease" | "set";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
    }
  ) => {
    const url = `/google-adwords/${accountId}/campaigns/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  updateGooglePmaxAssetGroup: async (
    accountId: number,
    campaignId: string | number,
    assetData: {
      asset_group_name?: string;
      final_url?: string;
      headlines?: string[];
      descriptions?: string[];
      long_headline?: string;
      marketing_image_url?: string;
      square_marketing_image_url?: string;
      business_name?: string;
      logo_url?: string;
    }
  ) => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/update-asset-group/`;
    const response = await api.post(url, assetData);
    return response.data;
  },

  exportGoogleAds: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
      ad_type?: string;
      status?: string;
      campaign_id?: string | number;
      adgroup_id?: string | number;
      account_name?: string;
      account_name__icontains?: string;
      account_name__not_icontains?: string;
    },
    exportType: "current_view" | "all_data" = "all_data"
  ): Promise<void> => {
    const filters: any = {};

    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.page !== undefined) filters.page = params.page;
    if (params?.page_size !== undefined) filters.page_size = params.page_size;
    if (params?.ad_type) filters.ad_type = params.ad_type;
    if (params?.status) filters.status = params.status;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.adgroup_id) filters.adgroup_id = params.adgroup_id;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains)
      filters.account_name__not_icontains = params.account_name__not_icontains;

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/google-adwords/${accountId}/ads/export/`,
      {
        filters,
        export_type: exportType,
      },
      {
        responseType: "blob",
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `google-ads-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  exportGoogleCampaigns: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
      campaign_name?: string;
      campaign_name__icontains?: string;
      campaign_name__not_icontains?: string;
      status?: string;
      advertising_channel_type?: string;
      budget?: number | string;
      budget__lt?: number | string;
      budget__gt?: number | string;
      budget__lte?: number | string;
      budget__gte?: number | string;
      account_name?: string;
      account_name__icontains?: string;
      account_name__not_icontains?: string;
    },
    exportType: "current_view" | "all_data" = "all_data"
  ): Promise<{ url: string; filename: string }> => {
    const filters: any = {};

    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.page !== undefined) filters.page = params.page;
    if (params?.page_size !== undefined) filters.page_size = params.page_size;
    if (params?.campaign_name) filters.campaign_name = params.campaign_name;
    if (params?.campaign_name__icontains)
      filters.campaign_name__icontains = params.campaign_name__icontains;
    if (params?.campaign_name__not_icontains)
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    if (params?.status) filters.status = params.status;
    if (params?.advertising_channel_type)
      filters.advertising_channel_type = params.advertising_channel_type;
    if (params?.budget !== undefined) filters.budget = params.budget;
    if (params?.budget__lt !== undefined)
      filters.budget__lt = params.budget__lt;
    if (params?.budget__gt !== undefined)
      filters.budget__gt = params.budget__gt;
    if (params?.budget__lte !== undefined)
      filters.budget__lte = params.budget__lte;
    if (params?.budget__gte !== undefined)
      filters.budget__gte = params.budget__gte;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains)
      filters.account_name__not_icontains = params.account_name__not_icontains;

    // Send POST request with filters and export_type in body
    const url = `/google-adwords/${accountId}/campaigns/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, {
      filters,
      export_type: exportType,
    });
    return response.data;
  },

  exportTikTokCampaigns: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
      campaign_name?: string;
      operation_status?: string;
      objective_type?: string;
      advertiser_id?: string;
      export_type?: "all_data" | "current_view";
      include_deleted?: boolean;
    }
  ): Promise<void> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.operation_status) {
      filters.operation_status = params.operation_status;
    }
    if (params?.objective_type) {
      filters.objective_type = params.objective_type;
    }
    if (params?.advertiser_id) {
      filters.advertiser_id = params.advertiser_id;
    }
    if (params?.include_deleted) {
      filters.include_deleted = true;
    }

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/accounts/${accountId}/tiktok-campaigns/export/`,
      { filters, export_type: params?.export_type || "all_data" },
      {
        responseType: "blob",
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = "tiktok_campaigns_export.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  exportTikTokAdGroups: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
      adgroup_name?: string;
      campaign_name?: string;
      operation_status?: string;
      advertiser_id?: string;
      export_type?: "all_data" | "current_view";
      include_deleted?: boolean;
    }
  ): Promise<void> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.sort_by) {
      filters.sort_by = params.sort_by;
    }
    if (params?.order) {
      filters.order = params.order;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }
    if (params?.adgroup_name) {
      filters.adgroup_name = params.adgroup_name;
    }
    if (params?.campaign_name) {
      filters.campaign_name = params.campaign_name;
    }
    if (params?.operation_status) {
      filters.operation_status = params.operation_status;
    }
    if (params?.advertiser_id) {
      filters.advertiser_id = params.advertiser_id;
    }
    if (params?.include_deleted) {
      filters.include_deleted = true;
    }

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/accounts/${accountId}/tiktok-adgroups/export/`,
      { filters, export_type: params?.export_type || "all_data" },
      {
        responseType: "blob",
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = "tiktok_adgroups_export.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  exportGoogleAdGroups: async (
    accountId: number,
    params?: Record<string, any>,
    exportType: "current_view" | "all_data" = "all_data"
  ): Promise<void> => {
    const filters: any = {};

    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.page !== undefined) filters.page = params.page;
    if (params?.page_size !== undefined) filters.page_size = params.page_size;
    if (params?.adgroup_name) filters.adgroup_name = params.adgroup_name;
    if (params?.adgroup_name__icontains)
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    if (params?.status) filters.status = params.status;
    if (params?.cpc_bid_dollars !== undefined)
      filters.cpc_bid_dollars = params.cpc_bid_dollars;
    if (params?.cpc_bid_dollars__lt !== undefined)
      filters.cpc_bid_dollars__lt = params.cpc_bid_dollars__lt;
    if (params?.cpc_bid_dollars__gt !== undefined)
      filters.cpc_bid_dollars__gt = params.cpc_bid_dollars__gt;
    if (params?.cpc_bid_dollars__lte !== undefined)
      filters.cpc_bid_dollars__lte = params.cpc_bid_dollars__lte;
    if (params?.cpc_bid_dollars__gte !== undefined)
      filters.cpc_bid_dollars__gte = params.cpc_bid_dollars__gte;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains)
      filters.account_name__not_icontains = params.account_name__not_icontains;
    if (params?.campaign_name) filters.campaign_name = params.campaign_name;
    if (params?.campaign_name__icontains)
      filters.campaign_name__icontains = params.campaign_name__icontains;
    if (params?.campaign_name__not_icontains)
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    if (params?.spends !== undefined) filters.spends = params.spends;
    if (params?.spends__lt !== undefined)
      filters.spends__lt = params.spends__lt;
    if (params?.spends__gt !== undefined)
      filters.spends__gt = params.spends__gt;
    if (params?.spends__lte !== undefined)
      filters.spends__lte = params.spends__lte;
    if (params?.spends__gte !== undefined)
      filters.spends__gte = params.spends__gte;
    if (params?.sales !== undefined) filters.sales = params.sales;
    if (params?.sales__lt !== undefined) filters.sales__lt = params.sales__lt;
    if (params?.sales__gt !== undefined) filters.sales__gt = params.sales__gt;
    if (params?.sales__lte !== undefined)
      filters.sales__lte = params.sales__lte;
    if (params?.sales__gte !== undefined)
      filters.sales__gte = params.sales__gte;
    if (params?.impressions !== undefined)
      filters.impressions = params.impressions;
    if (params?.impressions__lt !== undefined)
      filters.impressions__lt = params.impressions__lt;
    if (params?.impressions__gt !== undefined)
      filters.impressions__gt = params.impressions__gt;
    if (params?.impressions__lte !== undefined)
      filters.impressions__lte = params.impressions__lte;
    if (params?.impressions__gte !== undefined)
      filters.impressions__gte = params.impressions__gte;
    if (params?.clicks !== undefined) filters.clicks = params.clicks;
    if (params?.clicks__lt !== undefined)
      filters.clicks__lt = params.clicks__lt;
    if (params?.clicks__gt !== undefined)
      filters.clicks__gt = params.clicks__gt;
    if (params?.clicks__lte !== undefined)
      filters.clicks__lte = params.clicks__lte;
    if (params?.clicks__gte !== undefined)
      filters.clicks__gte = params.clicks__gte;
    if (params?.acos !== undefined) filters.acos = params.acos;
    if (params?.acos__lt !== undefined) filters.acos__lt = params.acos__lt;
    if (params?.acos__gt !== undefined) filters.acos__gt = params.acos__gt;
    if (params?.acos__lte !== undefined) filters.acos__lte = params.acos__lte;
    if (params?.acos__gte !== undefined) filters.acos__gte = params.acos__gte;
    if (params?.roas !== undefined) filters.roas = params.roas;
    if (params?.roas__lt !== undefined) filters.roas__lt = params.roas__lt;
    if (params?.roas__gt !== undefined) filters.roas__gt = params.roas__gt;
    if (params?.roas__lte !== undefined) filters.roas__lte = params.roas__lte;
    if (params?.roas__gte !== undefined) filters.roas__gte = params.roas__gte;

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/google-adwords/${accountId}/adgroups/export/`,
      { filters, export_type: exportType },
      {
        responseType: "blob",
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = "google_adgroups_export.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Google Campaign Detail
  getGoogleCampaignDetail: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const queryString = params.toString();
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.get(url);
    return response.data;
  },

  // Refresh Google Campaign from API
  refreshGoogleCampaignFromAPI: async (
    accountId: number,
    campaignId: string | number
  ): Promise<{
    success: boolean;
    message: string;
    campaign: {
      campaign_id: string | number;
      name: string;
      status: string;
      campaign_type: string;
      budget_amount: number;
      daily_budget: number;
      start_date?: string;
      end_date?: string;
      extra_data: {
        headlines?: string[];
        descriptions?: string[];
        final_url?: string;
        business_name?: string;
        logo_url?: string;
        marketing_image_url?: string;
        square_marketing_image_url?: string;
        long_headline?: string;
        asset_group_name?: string;
        shopping_setting?: {
          merchant_id?: string;
          sales_country?: string;
          campaign_priority?: number;
          enable_local?: boolean;
        };
      };
      merchant_id?: string;
      sales_country?: string;
      campaign_priority?: number;
      enable_local?: boolean;
    };
  }> => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/refresh/`;
    const response = await api.post(url);
    return response.data;
  },

  // Google Ad Groups
  getGoogleAdGroups: async (
    accountId: number,
    campaignId?: string | number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
      adgroup_name?: string;
      adgroup_name__icontains?: string;
      status?: string;
      type?: string;
      bid?: number | string;
      bid__lt?: number | string;
      bid__gt?: number | string;
      bid__lte?: number | string;
      bid__gte?: number | string;
      account_name?: string;
      account_name__icontains?: string;
      account_name__not_icontains?: string;
    }
  ): Promise<{
    adgroups: any[];
    summary?: {
      total_adgroups: number;
      total_spends: number;
      total_sales: number;
      total_impressions: number;
      total_clicks: number;
      avg_acos: number;
      avg_roas: number;
    };
    chart_data?: Array<{
      date: string;
      spend: number;
      sales: number;
      impressions?: number;
      clicks?: number;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (campaignId) filters.campaign_id = campaignId;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.adgroup_name) filters.adgroup_name = params.adgroup_name;
    if (params?.adgroup_name__icontains)
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    if (params?.status) filters.status = params.status;
    if (params?.type) filters.type = params.type;
    if (params?.bid !== undefined) filters.bid = params.bid;
    if (params?.bid__lt !== undefined) filters.bid__lt = params.bid__lt;
    if (params?.bid__gt !== undefined) filters.bid__gt = params.bid__gt;
    if (params?.bid__lte !== undefined) filters.bid__lte = params.bid__lte;
    if (params?.bid__gte !== undefined) filters.bid__gte = params.bid__gte;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains)
      filters.account_name__not_icontains = params.account_name__not_icontains;

    const response = await api.post(`/google-adwords/${accountId}/adgroups/`, {
      filters,
    });
    return response.data;
  },

  // Google Asset Groups
  getGoogleAssetGroups: async (
    accountId: number,
    campaignId?: string | number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
      asset_group_name?: string;
      asset_group_name__icontains?: string;
      name?: string;
      name__icontains?: string;
      status?: string;
      account_name?: string;
      account_name__icontains?: string;
    }
  ): Promise<{
    asset_groups: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (campaignId) filters.campaign_id = campaignId;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.asset_group_name)
      filters.asset_group_name = params.asset_group_name;
    if (params?.asset_group_name__icontains)
      filters.asset_group_name__icontains = params.asset_group_name__icontains;
    if (params?.name) filters.name = params.name;
    if (params?.name__icontains)
      filters.name__icontains = params.name__icontains;
    if (params?.status) filters.status = params.status;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;

    const response = await api.post(
      `/google-adwords/${accountId}/asset-groups/`,
      {
        filters,
      }
    );
    return response.data;
  },

  // Get asset group with assets (for Performance Max edit)
  getGoogleAssetGroupAssets: async (
    accountId: number,
    assetGroupId: string | number,
    campaignId?: string | number
  ): Promise<{
    asset_group_id: string | number;
    headlines: string[];
    descriptions: string[];
    business_name?: string;
    logo_url?: string;
    long_headline?: string;
    marketing_image_url?: string;
    square_marketing_image_url?: string;
    final_urls: string[];
    asset_group_name?: string;
  }> => {
    const params = new URLSearchParams();
    if (campaignId) params.append("campaign_id", String(campaignId));
    const queryString = params.toString();
    const url = `/google-adwords/${accountId}/asset-groups/${assetGroupId}/assets/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.get(url);
    return response.data;
  },

  // Google Ads
  getGoogleAds: async (
    accountId: number,
    campaignId?: string | number,
    adgroupId?: string | number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
      adgroup_id?: string | number;
      ad_type?: string;
      status?: string;
      account_name?: string;
      account_name__icontains?: string;
      account_name__not_icontains?: string;
    }
  ): Promise<{
    ads: any[];
    summary?: {
      total_ads: number;
      total_spends: number;
      total_sales: number;
      total_impressions: number;
      total_clicks: number;
      avg_acos: number;
      avg_roas: number;
    };
    chart_data?: Array<{
      date: string;
      spend: number;
      sales: number;
      impressions?: number;
      clicks?: number;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (campaignId) filters.campaign_id = campaignId;
    if (adgroupId) filters.adgroup_id = adgroupId;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.adgroup_id) filters.adgroup_id = params.adgroup_id;
    if (params?.ad_type) filters.ad_type = params.ad_type;
    if (params?.status) filters.status = params.status;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains)
      filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains)
      filters.account_name__not_icontains = params.account_name__not_icontains;

    const response = await api.post(`/google-adwords/${accountId}/ads/`, {
      filters,
    });
    return response.data;
  },

  // Google Keywords
  getGoogleKeywords: async (
    accountId: number,
    campaignId?: string | number,
    adgroupId?: string | number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
      adgroup_id?: string | number;
      keyword_text?: string;
      keyword_text__icontains?: string;
      keyword_text__not_icontains?: string;
      match_type?: string;
      status?: string;
      negative?: boolean;
      bid?: number | string;
      bid__lt?: number | string;
      bid__gt?: number | string;
      bid__lte?: number | string;
      bid__gte?: number | string;
      campaign_name?: string;
      campaign_name__icontains?: string;
      campaign_name__not_icontains?: string;
      adgroup_name?: string;
      adgroup_name__icontains?: string;
      adgroup_name__not_icontains?: string;
    }
  ): Promise<{
    keywords: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    chart_data?: Array<{
      date: string;
      spend: number;
      sales: number;
      impressions?: number;
      clicks?: number;
      acos?: number;
      roas?: number;
    }>;
    summary?: {
      total_keywords: number;
      total_spends: number;
      total_sales: number;
      total_impressions: number;
      total_clicks: number;
      avg_acos: number;
      avg_roas: number;
    };
  }> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (campaignId) filters.campaign_id = campaignId;
    if (adgroupId) filters.adgroup_id = adgroupId;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.adgroup_id) filters.adgroup_id = params.adgroup_id;
    if (params?.keyword_text) filters.keyword_text = params.keyword_text;
    if (params?.keyword_text__icontains)
      filters.keyword_text__icontains = params.keyword_text__icontains;
    if (params?.keyword_text__not_icontains)
      filters.keyword_text__not_icontains = params.keyword_text__not_icontains;
    if (params?.match_type) filters.match_type = params.match_type;
    if (params?.status) filters.status = params.status;
    if (params?.negative !== undefined) filters.negative = params.negative;
    if (params?.bid !== undefined) filters.bid = params.bid;
    if (params?.bid__lt !== undefined) filters.bid__lt = params.bid__lt;
    if (params?.bid__gt !== undefined) filters.bid__gt = params.bid__gt;
    if (params?.bid__lte !== undefined) filters.bid__lte = params.bid__lte;
    if (params?.bid__gte !== undefined) filters.bid__gte = params.bid__gte;
    if (params?.campaign_name) filters.campaign_name = params.campaign_name;
    if (params?.campaign_name__icontains)
      filters.campaign_name__icontains = params.campaign_name__icontains;
    if (params?.campaign_name__not_icontains)
      filters.campaign_name__not_icontains =
        params.campaign_name__not_icontains;
    if (params?.adgroup_name) filters.adgroup_name = params.adgroup_name;
    if (params?.adgroup_name__icontains)
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    if (params?.adgroup_name__not_icontains)
      filters.adgroup_name__not_icontains = params.adgroup_name__not_icontains;

    const response = await api.post(`/google-adwords/${accountId}/keywords/`, {
      filters,
    });
    return response.data;
  },

  // Google Sync functions
  syncGoogleAdGroups: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/adgroups/sync/`
    );
    return response.data;
  },

  syncGoogleAds: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(`/google-adwords/${accountId}/ads/sync/`);
    return response.data;
  },

  syncGoogleKeywords: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/keywords/sync/`
    );
    return response.data;
  },

  syncGoogleAssetGroups: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/asset-groups/sync/`
    );
    return response.data;
  },

  // Bulk update functions
  bulkUpdateGoogleAds: async (
    accountId: number,
    payload: {
      adIds: Array<string | number>;
      action: "status";
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      campaignId?: string;  // Optional: filter by campaign (for product groups)
      adGroupId?: string;  // Optional: filter by ad group (for product groups)
    }
  ) => {
    const url = `/google-adwords/${accountId}/ads/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateGoogleKeywords: async (
    accountId: number,
    payload: {
      keywordIds: Array<string | number>;
      action: "status" | "bid" | "match_type" | "keyword_text" | "final_urls";
      status?: "ENABLED" | "PAUSED";
      bid?: number;
      match_type?: "EXACT" | "PHRASE" | "BROAD";
      keyword_text?: string;
      final_url?: string;
      final_mobile_url?: string;
      adgroupIds?: Array<string | number>; // Optional: for filtering keywords by ad group
    }
  ) => {
    const url = `/google-adwords/${accountId}/keywords/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateGoogleAdGroups: async (
    accountId: number,
    payload: {
      adgroupIds: Array<string | number>;
      action: "status" | "bid" | "name";
      status?: "ENABLED" | "PAUSED";
      bid?: number;
      name?: string;
    }
  ) => {
    const url = `/google-adwords/${accountId}/adgroups/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  // TikTok Campaign Methods
  getTikTokCampaigns: async (
    accountId: number,
    params?: {
      page?: number;
      page_size?: number;
      operation_status?: string;
      advertiser_id?: string;
      start_date?: string;
      end_date?: string;
      include_deleted?: boolean;
    }
  ): Promise<{ campaigns: any[]; total: number; page: number; page_size: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.page_size) queryParams.append("page_size", String(params.page_size));
    if (params?.operation_status) queryParams.append("operation_status", params.operation_status);
    if (params?.advertiser_id) queryParams.append("advertiser_id", params.advertiser_id);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.include_deleted) queryParams.append("include_deleted", "true");

    const url = `/accounts/${accountId}/tiktok-campaigns/?${queryParams.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  createTikTokCampaign: async (
    accountId: number,
    data: {
      // Core Required
      campaign_name: string;
      objective_type: string;
      // Conditionally Required
      advertiser_id?: string;
      app_promotion_type?: string;
      virtual_objective_type?: string;
      sales_destination?: string;
      campaign_product_source?: string;
      app_id?: string;
      // Optional & Advanced
      budget?: number;
      budget_mode?: string;
      campaign_type?: string;
      budget_optimize_on?: boolean;
      special_industries?: string[];
      is_search_campaign?: boolean;
      is_advanced_dedicated_campaign?: boolean;
      disable_skan_campaign?: boolean;
      campaign_app_profile_page_state?: string;
      rf_campaign_type?: string;
      catalog_enabled?: boolean;
      request_id?: string;
      operation_status?: string;
      postback_window_mode?: string;
      rta_id?: string;
      rta_bid_enabled?: boolean;
      rta_product_selection_enabled?: boolean;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-campaigns/create/`;
    const response = await api.post(url, data);
    return response.data;
  },

  updateTikTokCampaign: async (
    accountId: number,
    campaignId: string | number,
    data: {
      campaign_name?: string;
      budget?: number;
      special_industries?: string[];
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-campaigns/${campaignId}/update/`;
    const response = await api.put(url, data);
    return response.data;
  },

  // TikTok Campaign Status Update
  updateTikTokCampaignStatus: async (
    accountId: number,
    data: {
      campaign_ids: Array<string | number>;
      operation_status: "ENABLE" | "DISABLE" | "DELETE";
      advertiser_id?: string;
      postback_window_mode?: string;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-campaigns/status/update/`;
    const response = await api.post(url, data);
    return response.data;
  },

  // TikTok Campaign Detail
  getTikTokCampaignDetail: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    campaign: {
      id: number;
      campaign_id: string;
      advertiser_id: string;
      campaign_name: string;
      operation_status: string;
      objective_type: string;
      budget_mode: string;
      budget: number;
      create_time: string;
      modify_time: string;
    };
    kpi_cards: Array<{ label: string; value: string }>;
    chart_data: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>;
  }> => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const queryString = params.toString();
    const url = `/accounts/${accountId}/tiktok-campaigns/${campaignId}/${queryString ? `?${queryString}` : ""}`;
    const response = await api.get(url);
    return response.data;
  },

  // TikTok Ad Groups
  getTikTokAdGroups: async (
    accountId: number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      campaign_id?: string;
      advertiser_id?: string;
      operation_status?: string;
      optimization_goal?: string;
      adgroup_name?: string;
      adgroup_name__icontains?: string;
    }
  ): Promise<{
    adgroups: any[];
    summary?: {
      total_adgroups: number;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      avg_ctr: number;
      avg_cpc: number;
    };
    chart_data?: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.advertiser_id) filters.advertiser_id = params.advertiser_id;
    if (params?.operation_status) filters.operation_status = params.operation_status;
    if (params?.optimization_goal) filters.optimization_goal = params.optimization_goal;
    if (params?.adgroup_name) filters.adgroup_name = params.adgroup_name;
    if (params?.adgroup_name__icontains)
      filters.adgroup_name__icontains = params.adgroup_name__icontains;

    const response = await api.post(`/accounts/${accountId}/tiktok-adgroups/`, {
      filters,
    });
    return response.data;
  },

  createTikTokAdGroup: async (
    accountId: number,
    data: {
      campaign_id: string;
      adgroup_name: string;
      location_ids: string[];
      budget_mode: string;
      budget: number;
      schedule_type: string;
      schedule_start_time: string;
      optimization_goal: string;
      billing_event: string;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-adgroups/create/`;
    const response = await api.post(url, data);
    return response.data;
  },

  // TikTok Ad Group Update
  updateTikTokAdGroup: async (
    accountId: number,
    adgroupId: string | number,
    data: {
      adgroup_name?: string;
      operation_status?: "ENABLE" | "DISABLE" | "DELETE";
      budget?: number;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-adgroups/${adgroupId}/update/`;
    const response = await api.put(url, data);
    return response.data;
  },

  // TikTok Ad Group Status Update
  updateTikTokAdGroupStatus: async (
    accountId: number,
    data: {
      adgroup_ids: Array<string | number>;
      operation_status: "ENABLE" | "DISABLE" | "DELETE";
      advertiser_id?: string;
      allow_partial_success?: boolean;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-adgroups/status/update/`;
    const response = await api.post(url, data);
    return response.data;
  },

  // TikTok Ad Group Budget Update
  updateTikTokAdGroupBudget: async (
    accountId: number,
    data: {
      budget?: Array<{ adgroup_id: string | number; budget: number }>;
      scheduled_budget?: Array<{ adgroup_id: string | number; scheduled_budget: number }>;
      advertiser_id?: string;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-adgroups/budget/update/`;
    const response = await api.post(url, data);
    return response.data;
  },

  // TikTok Ads
  getTikTokAds: async (
    accountId: number,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      ad_id?: string;
      adgroup_id?: string;
      campaign_id?: string;
      advertiser_id?: string;
      operation_status?: string;
      ad_format?: string;
      ad_name?: string;
      ad_name__icontains?: string;
      adgroup_name__icontains?: string;
      campaign_name__icontains?: string;
      filters?: any;
    }
  ): Promise<{
    ads: any[];
    summary?: {
      total_ads: number;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      avg_ctr: number;
      avg_cpc: number;
    };
    chart_data?: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.ad_id) filters.ad_id = params.ad_id;
    if (params?.adgroup_id) filters.adgroup_id = params.adgroup_id;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.advertiser_id) filters.advertiser_id = params.advertiser_id;
    if (params?.operation_status) filters.operation_status = params.operation_status;
    if (params?.ad_format) filters.ad_format = params.ad_format;
    if (params?.ad_name) filters.ad_name = params.ad_name;
    if (params?.ad_name__icontains)
      filters.ad_name__icontains = params.ad_name__icontains;
    if (params?.adgroup_name__icontains)
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    if (params?.campaign_name__icontains)
      filters.campaign_name__icontains = params.campaign_name__icontains;

    // Merge any additional filters from params.filters
    if (params?.filters) {
      Object.assign(filters, params.filters);
    }

    const response = await api.post(`/accounts/${accountId}/tiktok-ads/`, {
      filters,
    });
    return response.data;
  },

  createTikTokAd: async (
    accountId: number,
    data: {
      adgroup_id: string;
      ad_name: string;
      ad_format: string;
      ad_text: string;
      identity_id: string;
      video_id?: string;
      image_ids?: string[];
      landing_page_url?: string;
      call_to_action?: string;
      deeplink?: string;
      tracking_pixel_id?: string;
      advertiser_id?: string;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-ads/create/`;
    const response = await api.post(url, data);
    return response.data;
  },

  // TikTok Ad Update
  updateTikTokAd: async (
    accountId: number,
    adId: string,
    data: {
      ad_name?: string;
      operation_status?: "ENABLE" | "DISABLE" | "DELETE";
      // Add other updateable fields as needed
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-ads/${adId}/update/`;
    const response = await api.put(url, data);
    return response.data;
  },

  // TikTok Ad Status Update
  updateTikTokAdStatus: async (
    accountId: number,
    data: {
      ad_ids: Array<string | number>;
      operation_status: "ENABLE" | "DISABLE" | "DELETE";
      advertiser_id?: string;
      allow_partial_success?: boolean;
    }
  ): Promise<any> => {
    const url = `/accounts/${accountId}/tiktok-ads/status/update/`;
    const response = await api.post(url, data);
    return response.data;
  },

  // Export TikTok Ads
  exportTikTokAds: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
      ad_id?: string;
      adgroup_id?: string;
      campaign_id?: string;
      advertiser_id?: string;
      operation_status?: string;
      ad_format?: string;
      ad_name?: string;
      ad_name__icontains?: string;
      adgroup_name__icontains?: string;
      campaign_name__icontains?: string;
      filters?: any;
    },
    exportType: "current_view" | "all_data" = "all_data"
  ): Promise<void> => {
    const filters: any = {};

    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.ad_id) filters.ad_id = params.ad_id;
    if (params?.adgroup_id) filters.adgroup_id = params.adgroup_id;
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.advertiser_id) filters.advertiser_id = params.advertiser_id;
    if (params?.operation_status) filters.operation_status = params.operation_status;
    if (params?.ad_format) filters.ad_format = params.ad_format;
    if (params?.ad_name) filters.ad_name = params.ad_name;
    if (params?.ad_name__icontains)
      filters.ad_name__icontains = params.ad_name__icontains;
    if (params?.adgroup_name__icontains)
      filters.adgroup_name__icontains = params.adgroup_name__icontains;
    if (params?.campaign_name__icontains)
      filters.campaign_name__icontains = params.campaign_name__icontains;

    // Merge any additional filters from params.filters
    if (params?.filters) {
      Object.assign(filters, params.filters);
    }

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/accounts/${accountId}/tiktok-ads/export/`,
      { filters, export_type: exportType },
      {
        responseType: "blob",
      }
    );

    // Create a download link for the CSV file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    const filename =
      response.headers["content-disposition"]
        ?.split("filename=")[1]
        ?.replace(/"/g, "") || "tiktok_ads_export.csv";
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

};
