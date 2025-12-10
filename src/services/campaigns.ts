import api from './api';

export interface Campaign {
  id: number;
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

export const campaignsService = {
  getCampaigns: async (
    accountId: number,
    params?: CampaignsQueryParams
  ): Promise<CampaignsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    if (params?.order) {
      queryParams.append('order', params.order);
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    // Campaign name filters
    if (params?.campaign_name) {
      queryParams.append('campaign_name', params.campaign_name);
    }
    if (params?.campaign_name__icontains) {
      queryParams.append('campaign_name__icontains', params.campaign_name__icontains);
    }
    if (params?.campaign_name__not_icontains) {
      queryParams.append('campaign_name__not_icontains', params.campaign_name__not_icontains);
    }
    // Budget filters
    if (params?.budget !== undefined) {
      queryParams.append('budget', params.budget.toString());
    }
    if (params?.budget__lt !== undefined) {
      queryParams.append('budget__lt', params.budget__lt.toString());
    }
    if (params?.budget__gt !== undefined) {
      queryParams.append('budget__gt', params.budget__gt.toString());
    }
    if (params?.budget__lte !== undefined) {
      queryParams.append('budget__lte', params.budget__lte.toString());
    }
    if (params?.budget__gte !== undefined) {
      queryParams.append('budget__gte', params.budget__gte.toString());
    }
    // State and Type filters
    if (params?.state) {
      queryParams.append('state', params.state);
    }
    if (params?.type) {
      queryParams.append('type', params.type);
    }
    
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<CampaignsResponse>(url);
    return response.data;
  },
};

