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
  acos: number;
  roas: number;
  last_sync: string;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
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
}

export interface CampaignDetail {
  campaign: {
    id: number;
    name: string;
    status: string;
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
    
    // Send POST request with filters in body
    const url = `/accounts/${accountId}/campaigns/`;
    const response = await api.post<CampaignsResponse>(url, { filters });
    return response.data;
  },

  getCampaignDetail: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<CampaignDetail> => {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
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
};

