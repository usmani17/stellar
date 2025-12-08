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
    
    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/campaigns/${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<CampaignsResponse>(url);
    return response.data;
  },
};

