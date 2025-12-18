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
  // State and Type filters
  state?: string;
  type?: string;
  // Profile name filters with operators
  profile_name?: string;
  profile_name__icontains?: string;
  profile_name__not_icontains?: string;
}

export interface CampaignDetail {
  campaign: {
    id: number;
    campaignId?: string | number;
    name: string;
    status: string;
    budget?: number;
    startDate?: string;
    budgetType?: string;
    description: string;
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
    // State and Type filters
    if (params?.state) {
      filters.state = params.state;
    }
    if (params?.type) {
      filters.type = params.type;
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

    const url = `/accounts/${accountId}/campaigns/${campaignId}/${
      params.toString() ? `?${params.toString()}` : ""
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
    const url = `/accounts/${accountId}/campaigns/${campaignId}/adgroups/${
      queryString ? `?${queryString}` : ""
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
    const url = `/accounts/${accountId}/campaigns/${campaignId}/keywords/${
      queryString ? `?${queryString}` : ""
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
    const url = `/accounts/${accountId}/campaigns/${campaignId}/productads/${
      queryString ? `?${queryString}` : ""
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
    const url = `/accounts/${accountId}/campaigns/${campaignId}/targets/${
      queryString ? `?${queryString}` : ""
    }`;
    const response = await api.post<TargetsResponse>(url, { filters });
    return response.data;
  },

  bulkUpdateCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action: "status" | "budget";
      status?: "enable" | "pause" | "archive";
      budgetAction?: "increase" | "decrease" | "set";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateAdGroups: async (
    accountId: number,
    payload: {
      adgroupIds: Array<string | number>;
      action: "status" | "default_bid";
      status?: "enable" | "pause" | "archive";
      value?: number;
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

  bulkUpdateKeywords: async (
    accountId: number,
    payload: {
      keywordIds: Array<string | number>;
      action: "status" | "bid";
      status?: "enable" | "pause" | "archive";
      bid?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/keywords/bulk-update/`;
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

  bulkUpdateTargets: async (
    accountId: number,
    payload: {
      targetIds: Array<string | number>;
      action: "status" | "bid";
      status?: "enable" | "pause" | "archive";
      bid?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/targets/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  // Google Campaigns
  syncGoogleCampaigns: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/accounts/${accountId}/google-campaigns/sync/`
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
      `/accounts/${accountId}/google-campaigns/analytics-sync/`,
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
      `/accounts/${accountId}/google-adgroups/analytics-sync/`,
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
      `/accounts/${accountId}/google-ads/analytics-sync/`,
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
      `/accounts/${accountId}/google-keywords/analytics-sync/`,
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
      avg_acos: number;
      avg_roas: number;
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
      `/accounts/${accountId}/google-campaigns/`,
      { filters }
    );
    return response.data;
  },

  bulkUpdateGoogleCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action: "status" | "budget" | "start_date" | "end_date";
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      budget?: number;
      start_date?: string;
      end_date?: string;
      budgetAction?: "increase" | "decrease" | "set";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/google-campaigns/bulk-update/`;
    const response = await api.post(url, payload);
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
      `/accounts/${accountId}/google-ads/export/`,
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
  ): Promise<void> => {
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

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/accounts/${accountId}/google-campaigns/export/`,
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
    let filename = "google_campaigns_export.csv";
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
    params?: GoogleAdGroupsQueryParams,
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
      `/accounts/${accountId}/google-adgroups/export/`,
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
    const url = `/accounts/${accountId}/google-campaigns/${campaignId}/${
      queryString ? `?${queryString}` : ""
    }`;
    const response = await api.get(url);
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

    const response = await api.post(`/accounts/${accountId}/google-adgroups/`, {
      filters,
    });
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

    const response = await api.post(`/accounts/${accountId}/google-ads/`, {
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

    const response = await api.post(`/accounts/${accountId}/google-keywords/`, {
      filters,
    });
    return response.data;
  },

  // Google Sync functions
  syncGoogleAdGroups: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/accounts/${accountId}/google-adgroups/sync/`
    );
    return response.data;
  },

  syncGoogleAds: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(`/accounts/${accountId}/google-ads/sync/`);
    return response.data;
  },

  syncGoogleKeywords: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/accounts/${accountId}/google-keywords/sync/`
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
    }
  ) => {
    const url = `/accounts/${accountId}/google-ads/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateGoogleKeywords: async (
    accountId: number,
    payload: {
      keywordIds: Array<string | number>;
      action: "status" | "bid" | "match_type";
      status?: "ENABLED" | "PAUSED";
      bid?: number;
      match_type?: "EXACT" | "PHRASE" | "BROAD";
    }
  ) => {
    const url = `/accounts/${accountId}/google-keywords/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  bulkUpdateGoogleAdGroups: async (
    accountId: number,
    payload: {
      adgroupIds: Array<string | number>;
      action: "status" | "bid";
      status?: "ENABLED" | "PAUSED";
      bid?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/google-adgroups/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  exportGoogleKeywords: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
      keyword_text?: string;
      keyword_text__icontains?: string;
      keyword_text__not_icontains?: string;
      match_type?: string;
      status?: string;
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
    if (params?.keyword_text) filters.keyword_text = params.keyword_text;
    if (params?.keyword_text__icontains)
      filters.keyword_text__icontains = params.keyword_text__icontains;
    if (params?.keyword_text__not_icontains)
      filters.keyword_text__not_icontains = params.keyword_text__not_icontains;
    if (params?.match_type) filters.match_type = params.match_type;
    if (params?.status) filters.status = params.status;
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

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/accounts/${accountId}/google-keywords/export/`,
      { filters, export_type: exportType },
      {
        responseType: "blob",
      }
    );

    // Create blob and download
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `google-keywords-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
