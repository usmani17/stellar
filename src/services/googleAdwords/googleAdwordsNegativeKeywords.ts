import api from "../api";

export interface GoogleNegativeKeyword {
  id: number;
  criterion_id: string;
  customer_id: string;
  campaign_id: string;
  adgroup_id?: string;
  keyword_text: string;
  match_type: string;
  status: string;
  level: "campaign" | "adgroup";
  resource_name: string;
  campaign_resource_name?: string;
  adgroup_resource_name?: string;
  account_name?: string;
  campaign_name?: string;
  adgroup_name?: string;
  last_updated?: string;
  extra_data?: any;
}

export interface GoogleNegativeKeywordsResponse {
  negative_keywords: GoogleNegativeKeyword[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GoogleNegativeKeywordsQueryParams {
  filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
  page?: number;
  page_size?: number;
  sort_by?: string;
  order?: "asc" | "desc";
  campaign_id?: string;
  adgroup_id?: string;
  draft_only?: boolean;
}

export interface CreateNegativeKeywordInput {
  text: string;
  matchType: string;
}

export interface CreateNegativeKeywordsRequest {
  negativeKeywords: CreateNegativeKeywordInput[];
  level: "campaign" | "adgroup";
  adGroupId?: string;
  save_as_draft?: boolean;
}

export interface BulkUpdateNegativeKeywordsRequest {
  negativeKeywordIds: string[];
  action: "status" | "match_type" | "keyword_text";
  value?: string;
  keyword_text?: string;
  level: "campaign" | "adgroup";
}

export interface BulkDeleteNegativeKeywordsRequest {
  negativeKeywordIds: string[];
}

export const googleAdwordsNegativeKeywordsService = {
  getGoogleNegativeKeywords: async (
    accountId: number,
    channelId: number,
    params?: GoogleNegativeKeywordsQueryParams
  ): Promise<GoogleNegativeKeywordsResponse> => {
    // Send filters array and params directly to backend - let backend handle conversion
    const payload: any = {
      filters: params?.filters || [],
      sort_by: params?.sort_by,
      order: params?.order,
      page: params?.page,
      page_size: params?.page_size,
    };
    
    // Add campaign_id, adgroup_id, and draft_only if provided (not part of filters array)
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;
    if (params?.adgroup_id) payload.adgroup_id = params.adgroup_id;
    if (params?.draft_only !== undefined) payload.draft_only = params.draft_only;
    
    const url = `/google-adwords/${accountId}/channels/${channelId}/negative-keywords/`;
    const response = await api.post<GoogleNegativeKeywordsResponse>(url, payload);
    return response.data;
  },

  syncGoogleNegativeKeywords: async (
    accountId: number,
    channelId: number
  ): Promise<{ synced: number; errors: string[]; total_errors: number }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/negative-keywords/sync/`;
    const response = await api.post<{ synced: number; errors: string[]; total_errors: number }>(url);
    return response.data;
  },

  createGoogleNegativeKeywords: async (
    accountId: number,
    channelId: number,
    campaignId: string,
    data: CreateNegativeKeywordsRequest
  ): Promise<{ created: number; negative_keywords: GoogleNegativeKeyword[] }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/campaigns/${campaignId}/negative-keywords/create/`;
    const response = await api.post<{ created: number; negative_keywords: GoogleNegativeKeyword[] }>(url, data);
    return response.data;
  },

  bulkUpdateGoogleNegativeKeywords: async (
    accountId: number,
    channelId: number,
    data: BulkUpdateNegativeKeywordsRequest
  ): Promise<{
    updated: number;
    failed: number;
    errors: string[];
    updated_negative_keywords: Array<{
      criterion_id: string;
      keyword_text: string;
      [key: string]: any;
    }>;
  }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/negative-keywords/bulk-update/`;
    const response = await api.post(url, data);
    return response.data;
  },

  bulkDeleteGoogleNegativeKeywords: async (
    accountId: number,
    channelId: number,
    data: BulkDeleteNegativeKeywordsRequest
  ): Promise<{
    deleted: number;
    failed: number;
    errors: string[];
  }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/negative-keywords/bulk-delete/`;
    const response = await api.post(url, data);
    return response.data;
  },
};
