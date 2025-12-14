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

  getGoogleCampaigns: async (
    accountId: number,
    params?: {
      sort_by?: string;
      order?: 'asc' | 'desc';
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
    }
  ): Promise<{
    campaigns: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const filters: any = {};
    
    if (params?.sort_by) filters.sort_by = params.sort_by;
    if (params?.order) filters.order = params.order;
    if (params?.page) filters.page = params.page;
    if (params?.page_size) filters.page_size = params.page_size;
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

  // Google Campaign Detail
  getGoogleCampaignDetail: async (
    accountId: number,
    campaignId: string | number
  ): Promise<any> => {
    const url = `/accounts/${accountId}/google-campaigns/${campaignId}/`;
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
};

