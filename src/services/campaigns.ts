import api from './api';

export interface Campaign {
  id: number;  // Database ID (for internal use)
  campaignId: string | number;  // Amazon campaign ID (e.g., '250760975023635')
  campaign_name: string;
  type: string;
  status: 'Enable' | 'Paused' | 'Archived';
  daily_budget: number;
  spends: number;
  sales: number;
  impressions?: number;
  clicks?: number;
  acos: number;
  roas: number;
  last_sync: string;
  startDate?: string;  // Campaign start date
  budgetType?: string;  // Budget type (e.g., 'daily', 'lifetime')
  profile_name?: string;  // Profile name
  profile_id?: string;  // Profile ID
  report_date?: string;  // Report date (YYYY-MM-DD) - one row per campaign per day
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
  order?: 'asc' | 'desc';
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
    clicks: number;
    orders: number;
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
  name: string;
  status: string;
  default_bid?: string;
  ctr: string;
  spends: string;
  sales: string;
  clicks?: number;
  impressions?: number;
  acos?: string;
  roas?: string;
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
  name: string;
  status: string;
  bid?: string;
  adgroup_name?: string;
  ctr: string;
  spends: string;
  sales: string;
  clicks?: number;
  impressions?: number;
  acos?: string;
  roas?: string;
}

export interface KeywordsResponse {
  keywords: Keyword[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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
      filters.campaign_name__not_icontains = params.campaign_name__not_icontains;
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

  getCampaignDetail: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string,
    campaignType?: string
  ): Promise<CampaignDetail> => {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
    }
    if (campaignType) {
      params.append('type', campaignType);
    }
    
    const url = `/accounts/${accountId}/campaigns/${campaignId}/${params.toString() ? `?${params.toString()}` : ''}`;
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
      order?: 'asc' | 'desc';
      // Filter parameters
      name?: string;
      name__icontains?: string;
      name__not_icontains?: string;
      state?: string;
      default_bid?: number | string;
      default_bid__lt?: number | string;
      default_bid__gt?: number | string;
      default_bid__lte?: number | string;
      default_bid__gte?: number | string;
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
  ): Promise<AdGroupsResponse> => {
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append('start_date', startDate);
    }
    if (endDate) {
      queryParams.append('end_date', endDate);
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    if (params?.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    if (params?.order) {
      queryParams.append('order', params.order);
    }
    // Filter parameters
    if (params?.name) {
      queryParams.append('name', params.name);
    }
    if (params?.name__icontains) {
      queryParams.append('name__icontains', params.name__icontains);
    }
    if (params?.name__not_icontains) {
      queryParams.append('name__not_icontains', params.name__not_icontains);
    }
    if (params?.state) {
      queryParams.append('state', params.state);
    }
    if (params?.default_bid !== undefined) {
      queryParams.append('default_bid', params.default_bid.toString());
    }
    if (params?.default_bid__lt !== undefined) {
      queryParams.append('default_bid__lt', params.default_bid__lt.toString());
    }
    if (params?.default_bid__gt !== undefined) {
      queryParams.append('default_bid__gt', params.default_bid__gt.toString());
    }
    if (params?.default_bid__lte !== undefined) {
      queryParams.append('default_bid__lte', params.default_bid__lte.toString());
    }
    if (params?.default_bid__gte !== undefined) {
      queryParams.append('default_bid__gte', params.default_bid__gte.toString());
    }
    if (params?.spends !== undefined) {
      queryParams.append('spends', params.spends.toString());
    }
    if (params?.spends__lt !== undefined) {
      queryParams.append('spends__lt', params.spends__lt.toString());
    }
    if (params?.spends__gt !== undefined) {
      queryParams.append('spends__gt', params.spends__gt.toString());
    }
    if (params?.spends__lte !== undefined) {
      queryParams.append('spends__lte', params.spends__lte.toString());
    }
    if (params?.spends__gte !== undefined) {
      queryParams.append('spends__gte', params.spends__gte.toString());
    }
    if (params?.sales !== undefined) {
      queryParams.append('sales', params.sales.toString());
    }
    if (params?.sales__lt !== undefined) {
      queryParams.append('sales__lt', params.sales__lt.toString());
    }
    if (params?.sales__gt !== undefined) {
      queryParams.append('sales__gt', params.sales__gt.toString());
    }
    if (params?.sales__lte !== undefined) {
      queryParams.append('sales__lte', params.sales__lte.toString());
    }
    if (params?.sales__gte !== undefined) {
      queryParams.append('sales__gte', params.sales__gte.toString());
    }
    if (params?.ctr !== undefined) {
      queryParams.append('ctr', params.ctr.toString());
    }
    if (params?.ctr__lt !== undefined) {
      queryParams.append('ctr__lt', params.ctr__lt.toString());
    }
    if (params?.ctr__gt !== undefined) {
      queryParams.append('ctr__gt', params.ctr__gt.toString());
    }
    if (params?.ctr__lte !== undefined) {
      queryParams.append('ctr__lte', params.ctr__lte.toString());
    }
    if (params?.ctr__gte !== undefined) {
      queryParams.append('ctr__gte', params.ctr__gte.toString());
    }
    
    const url = `/accounts/${accountId}/campaigns/${campaignId}/adgroups/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    try {
      const response = await api.get<AdGroupsResponse>(url);
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist yet, return empty response
      if (error.response?.status === 404) {
        return {
          adgroups: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        };
      }
      throw error;
    }
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
      order?: 'asc' | 'desc';
      // Filter parameters
      name?: string;
      name__icontains?: string;
      name__not_icontains?: string;
      state?: string;
      bid?: number | string;
      bid__lt?: number | string;
      bid__gt?: number | string;
      bid__lte?: number | string;
      bid__gte?: number | string;
      adgroup_name?: string;
      adgroup_name__icontains?: string;
      adgroup_name__not_icontains?: string;
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
  ): Promise<KeywordsResponse> => {
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append('start_date', startDate);
    }
    if (endDate) {
      queryParams.append('end_date', endDate);
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    if (params?.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    if (params?.order) {
      queryParams.append('order', params.order);
    }
    // Filter parameters
    if (params?.name) {
      queryParams.append('name', params.name);
    }
    if (params?.name__icontains) {
      queryParams.append('name__icontains', params.name__icontains);
    }
    if (params?.name__not_icontains) {
      queryParams.append('name__not_icontains', params.name__not_icontains);
    }
    if (params?.state) {
      queryParams.append('state', params.state);
    }
    if (params?.bid !== undefined) {
      queryParams.append('bid', params.bid.toString());
    }
    if (params?.bid__lt !== undefined) {
      queryParams.append('bid__lt', params.bid__lt.toString());
    }
    if (params?.bid__gt !== undefined) {
      queryParams.append('bid__gt', params.bid__gt.toString());
    }
    if (params?.bid__lte !== undefined) {
      queryParams.append('bid__lte', params.bid__lte.toString());
    }
    if (params?.bid__gte !== undefined) {
      queryParams.append('bid__gte', params.bid__gte.toString());
    }
    if (params?.adgroup_name) {
      queryParams.append('adgroup_name', params.adgroup_name);
    }
    if (params?.adgroup_name__icontains) {
      queryParams.append('adgroup_name__icontains', params.adgroup_name__icontains);
    }
    if (params?.adgroup_name__not_icontains) {
      queryParams.append('adgroup_name__not_icontains', params.adgroup_name__not_icontains);
    }
    if (params?.spends !== undefined) {
      queryParams.append('spends', params.spends.toString());
    }
    if (params?.spends__lt !== undefined) {
      queryParams.append('spends__lt', params.spends__lt.toString());
    }
    if (params?.spends__gt !== undefined) {
      queryParams.append('spends__gt', params.spends__gt.toString());
    }
    if (params?.spends__lte !== undefined) {
      queryParams.append('spends__lte', params.spends__lte.toString());
    }
    if (params?.spends__gte !== undefined) {
      queryParams.append('spends__gte', params.spends__gte.toString());
    }
    if (params?.sales !== undefined) {
      queryParams.append('sales', params.sales.toString());
    }
    if (params?.sales__lt !== undefined) {
      queryParams.append('sales__lt', params.sales__lt.toString());
    }
    if (params?.sales__gt !== undefined) {
      queryParams.append('sales__gt', params.sales__gt.toString());
    }
    if (params?.sales__lte !== undefined) {
      queryParams.append('sales__lte', params.sales__lte.toString());
    }
    if (params?.sales__gte !== undefined) {
      queryParams.append('sales__gte', params.sales__gte.toString());
    }
    if (params?.ctr !== undefined) {
      queryParams.append('ctr', params.ctr.toString());
    }
    if (params?.ctr__lt !== undefined) {
      queryParams.append('ctr__lt', params.ctr__lt.toString());
    }
    if (params?.ctr__gt !== undefined) {
      queryParams.append('ctr__gt', params.ctr__gt.toString());
    }
    if (params?.ctr__lte !== undefined) {
      queryParams.append('ctr__lte', params.ctr__lte.toString());
    }
    if (params?.ctr__gte !== undefined) {
      queryParams.append('ctr__gte', params.ctr__gte.toString());
    }
    
    const url = `/accounts/${accountId}/campaigns/${campaignId}/keywords/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    try {
      const response = await api.get<KeywordsResponse>(url);
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist yet, return empty response
      if (error.response?.status === 404) {
        return {
          keywords: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        };
      }
      throw error;
    }
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
      order?: 'asc' | 'desc';
      // Filter parameters
      adId?: string;
      adId__icontains?: string;
      adId__not_icontains?: string;
      asin?: string;
      asin__icontains?: string;
      asin__not_icontains?: string;
      sku?: string;
      sku__icontains?: string;
      sku__not_icontains?: string;
      state?: string;
      adGroupId?: string;
      adGroupId__icontains?: string;
      adGroupId__not_icontains?: string;
    }
  ): Promise<ProductAdsResponse> => {
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append('start_date', startDate);
    }
    if (endDate) {
      queryParams.append('end_date', endDate);
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    if (params?.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    if (params?.order) {
      queryParams.append('order', params.order);
    }
    // Filter parameters
    if (params?.adId) {
      queryParams.append('adId', params.adId);
    }
    if (params?.adId__icontains) {
      queryParams.append('adId__icontains', params.adId__icontains);
    }
    if (params?.adId__not_icontains) {
      queryParams.append('adId__not_icontains', params.adId__not_icontains);
    }
    if (params?.asin) {
      queryParams.append('asin', params.asin);
    }
    if (params?.asin__icontains) {
      queryParams.append('asin__icontains', params.asin__icontains);
    }
    if (params?.asin__not_icontains) {
      queryParams.append('asin__not_icontains', params.asin__not_icontains);
    }
    if (params?.sku) {
      queryParams.append('sku', params.sku);
    }
    if (params?.sku__icontains) {
      queryParams.append('sku__icontains', params.sku__icontains);
    }
    if (params?.sku__not_icontains) {
      queryParams.append('sku__not_icontains', params.sku__not_icontains);
    }
    if (params?.state) {
      queryParams.append('state', params.state);
    }
    if (params?.adGroupId) {
      queryParams.append('adGroupId', params.adGroupId);
    }
    if (params?.adGroupId__icontains) {
      queryParams.append('adGroupId__icontains', params.adGroupId__icontains);
    }
    if (params?.adGroupId__not_icontains) {
      queryParams.append('adGroupId__not_icontains', params.adGroupId__not_icontains);
    }
    
    const url = `/accounts/${accountId}/campaigns/${campaignId}/productads/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    try {
      const response = await api.get<ProductAdsResponse>(url);
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist yet, return empty response
      if (error.response?.status === 404) {
        return {
          productads: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        };
      }
      throw error;
    }
  },

  bulkUpdateCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action: 'status' | 'budget';
      status?: 'enable' | 'pause' | 'archive';
      budgetAction?: 'increase' | 'decrease' | 'set';
      unit?: 'percent' | 'amount';
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/campaigns/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  // Google Campaigns
  syncGoogleCampaigns: async (accountId: number): Promise<{synced: number; errors?: string[]; message?: string}> => {
    const response = await api.post(`/accounts/${accountId}/google-campaigns/sync/`);
    return response.data;
  },

  syncGoogleCampaignAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{synced: number; rows_inserted?: number; rows_updated?: number; rows_deleted?: number; errors?: string[]; message?: string; customer_stats?: any; date_range?: any}> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(`/accounts/${accountId}/google-campaigns/analytics-sync/`, payload);
    return response.data;
  },

  syncGoogleAdGroupAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{synced: number; rows_inserted?: number; rows_updated?: number; rows_deleted?: number; errors?: string[]; message?: string; customer_stats?: any; date_range?: any}> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(`/accounts/${accountId}/google-adgroups/analytics-sync/`, payload);
    return response.data;
  },

  syncGoogleAdAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{synced: number; rows_inserted?: number; rows_updated?: number; rows_deleted?: number; errors?: string[]; message?: string; customer_stats?: any; date_range?: any}> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(`/accounts/${accountId}/google-ads/analytics-sync/`, payload);
    return response.data;
  },

  syncGoogleKeywordAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{synced: number; rows_inserted?: number; rows_updated?: number; rows_deleted?: number; errors?: string[]; message?: string; customer_stats?: any; date_range?: any}> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(`/accounts/${accountId}/google-keywords/analytics-sync/`, payload);
    return response.data;
  },

  getGoogleCampaigns: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: 'asc' | 'desc';
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
    chart_data?: Array<{ date: string; spend: number; sales: number; impressions?: number; clicks?: number; }>;
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
    if (params?.campaign_name__icontains) filters.campaign_name__icontains = params.campaign_name__icontains;
    if (params?.campaign_name__not_icontains) filters.campaign_name__not_icontains = params.campaign_name__not_icontains;
    if (params?.status) filters.status = params.status;
    if (params?.advertising_channel_type) filters.advertising_channel_type = params.advertising_channel_type;
    if (params?.budget !== undefined) filters.budget = params.budget;
    if (params?.budget__lt !== undefined) filters.budget__lt = params.budget__lt;
    if (params?.budget__gt !== undefined) filters.budget__gt = params.budget__gt;
    if (params?.budget__lte !== undefined) filters.budget__lte = params.budget__lte;
    if (params?.budget__gte !== undefined) filters.budget__gte = params.budget__gte;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains) filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains) filters.account_name__not_icontains = params.account_name__not_icontains;
    
    const response = await api.post(`/accounts/${accountId}/google-campaigns/`, { filters });
    return response.data;
  },

  bulkUpdateGoogleCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action: 'status' | 'budget' | 'start_date' | 'end_date';
      status?: 'ENABLED' | 'PAUSED' | 'REMOVED';
      budget?: number;
      start_date?: string;
      end_date?: string;
      budgetAction?: 'increase' | 'decrease' | 'set';
      unit?: 'percent' | 'amount';
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
    }
  ) => {
    const url = `/accounts/${accountId}/google-campaigns/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  exportGoogleCampaigns: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: 'asc' | 'desc';
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
  ): Promise<void> => {
    const filters: any = {};
    
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.start_date) filters.start_date = params.start_date;
    if (params?.end_date) filters.end_date = params.end_date;
    if (params?.campaign_name) filters.campaign_name = params.campaign_name;
    if (params?.campaign_name__icontains) filters.campaign_name__icontains = params.campaign_name__icontains;
    if (params?.campaign_name__not_icontains) filters.campaign_name__not_icontains = params.campaign_name__not_icontains;
    if (params?.status) filters.status = params.status;
    if (params?.advertising_channel_type) filters.advertising_channel_type = params.advertising_channel_type;
    if (params?.budget !== undefined) filters.budget = params.budget;
    if (params?.budget__lt !== undefined) filters.budget__lt = params.budget__lt;
    if (params?.budget__gt !== undefined) filters.budget__gt = params.budget__gt;
    if (params?.budget__lte !== undefined) filters.budget__lte = params.budget__lte;
    if (params?.budget__gte !== undefined) filters.budget__gte = params.budget__gte;
    if (params?.account_name) filters.account_name = params.account_name;
    if (params?.account_name__icontains) filters.account_name__icontains = params.account_name__icontains;
    if (params?.account_name__not_icontains) filters.account_name__not_icontains = params.account_name__not_icontains;
    
    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/accounts/${accountId}/google-campaigns/export/`,
      { filters },
      {
        responseType: 'blob',
      }
    );
    
    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'google_campaigns_export.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
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
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    const url = `/accounts/${accountId}/google-campaigns/${campaignId}/${queryString ? `?${queryString}` : ''}`;
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
      order?: 'asc' | 'desc';
      campaign_id?: string | number;
      adgroup_name?: string;
      adgroup_name__icontains?: string;
      status?: string;
      type?: string;
    }
  ): Promise<{
    adgroups: any[];
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
    if (params?.campaign_id) filters.campaign_id = params.campaign_id;
    if (params?.adgroup_name) filters.adgroup_name = params.adgroup_name;
    if (params?.adgroup_name__icontains) filters.adgroup_name__icontains = params.adgroup_name__icontains;
    if (params?.status) filters.status = params.status;
    if (params?.type) filters.type = params.type;
    
    const response = await api.post(`/accounts/${accountId}/google-adgroups/`, { filters });
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
      order?: 'asc' | 'desc';
      campaign_id?: string | number;
      adgroup_id?: string | number;
      ad_type?: string;
      status?: string;
    }
  ): Promise<{
    ads: any[];
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
    
    const response = await api.post(`/accounts/${accountId}/google-ads/`, { filters });
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
      order?: 'asc' | 'desc';
      campaign_id?: string | number;
      adgroup_id?: string | number;
      keyword_text?: string;
      keyword_text__icontains?: string;
      match_type?: string;
      status?: string;
      negative?: boolean;
    }
  ): Promise<{
    keywords: any[];
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
    if (params?.keyword_text) filters.keyword_text = params.keyword_text;
    if (params?.keyword_text__icontains) filters.keyword_text__icontains = params.keyword_text__icontains;
    if (params?.match_type) filters.match_type = params.match_type;
    if (params?.status) filters.status = params.status;
    if (params?.negative !== undefined) filters.negative = params.negative;
    
    const response = await api.post(`/accounts/${accountId}/google-keywords/`, { filters });
    return response.data;
  },

  // Google Sync functions
  syncGoogleAdGroups: async (accountId: number): Promise<{synced: number; errors?: string[]; message?: string}> => {
    const response = await api.post(`/accounts/${accountId}/google-adgroups/sync/`);
    return response.data;
  },

  syncGoogleAds: async (accountId: number): Promise<{synced: number; errors?: string[]; message?: string}> => {
    const response = await api.post(`/accounts/${accountId}/google-ads/sync/`);
    return response.data;
  },

  syncGoogleKeywords: async (accountId: number): Promise<{synced: number; errors?: string[]; message?: string}> => {
    const response = await api.post(`/accounts/${accountId}/google-keywords/sync/`);
    return response.data;
  },

  // Bulk update functions
  bulkUpdateGoogleAds: async (
    accountId: number,
    payload: {
      adIds: Array<string | number>;
      action: 'status';
      status?: 'ENABLED' | 'PAUSED' | 'REMOVED';
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
      action: 'status' | 'bid';
      status?: 'ENABLED' | 'PAUSED';
      bid?: number;
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
      action: 'status';
      status?: 'ENABLED' | 'PAUSED';
    }
  ) => {
    const url = `/accounts/${accountId}/google-adgroups/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },
};

