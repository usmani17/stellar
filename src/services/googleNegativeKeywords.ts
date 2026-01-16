import api from "./api";

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
  filters?: {
    keyword_text?: string;
    keyword_text__icontains?: string;
    match_type?: string;
    status?: string;
    level?: "campaign" | "adgroup";
    campaign_id?: string;
    adgroup_id?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    order?: "asc" | "desc";
  };
}

export interface CreateNegativeKeywordInput {
  text: string;
  matchType: string;
}

export interface CreateNegativeKeywordsRequest {
  negativeKeywords: CreateNegativeKeywordInput[];
  level: "campaign" | "adgroup";
  adGroupId?: string;
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

export const googleNegativeKeywordsService = {
  getGoogleNegativeKeywords: async (
    accountId: number,
    params?: GoogleNegativeKeywordsQueryParams
  ): Promise<GoogleNegativeKeywordsResponse> => {
    const url = `/accounts/${accountId}/google-negative-keywords/`;
    const response = await api.post<GoogleNegativeKeywordsResponse>(url, params || {});
    return response.data;
  },

  syncGoogleNegativeKeywords: async (
    accountId: number
  ): Promise<{ synced: number; errors: string[]; total_errors: number }> => {
    const url = `/accounts/${accountId}/google-negative-keywords/sync/`;
    const response = await api.post<{ synced: number; errors: string[]; total_errors: number }>(url);
    return response.data;
  },

  createGoogleNegativeKeywords: async (
    accountId: number,
    campaignId: string,
    data: CreateNegativeKeywordsRequest
  ): Promise<{ created: number; negative_keywords: GoogleNegativeKeyword[] }> => {
    const url = `/accounts/${accountId}/campaigns/${campaignId}/google-negative-keywords/create/`;
    const response = await api.post<{ created: number; negative_keywords: GoogleNegativeKeyword[] }>(url, data);
    return response.data;
  },

  bulkUpdateGoogleNegativeKeywords: async (
    accountId: number,
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
    const url = `/accounts/${accountId}/google-negative-keywords/bulk-update/`;
    const response = await api.post(url, data);
    return response.data;
  },

  bulkDeleteGoogleNegativeKeywords: async (
    accountId: number,
    data: BulkDeleteNegativeKeywordsRequest
  ): Promise<{
    deleted: number;
    failed: number;
    errors: string[];
  }> => {
    const url = `/accounts/${accountId}/google-negative-keywords/bulk-delete/`;
    const response = await api.post(url, data);
    return response.data;
  },
};
