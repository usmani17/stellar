import api from "./api";

export const googleNegativeKeywordsService = {
  getGoogleNegativeKeywords: async (
    accountId: number,
    options: {
      filters?: {
        campaign_id?: string;
        page?: number;
        page_size?: number;
        sort_by?: string;
        order?: "asc" | "desc";
        [key: string]: any;
      };
    }
  ) => {
    const filters = options.filters || {};
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });

    const response = await api.get(
      `/google/accounts/${accountId}/negative-keywords/?${params.toString()}`
    );
    return response.data;
  },

  syncGoogleNegativeKeywords: async (accountId: number) => {
    const response = await api.post(
      `/google/accounts/${accountId}/negative-keywords/sync/`
    );
    return response.data;
  },

  createGoogleNegativeKeywords: async (
    accountId: number,
    campaignId: string,
    data: {
      negativeKeywords: Array<{
        keyword_text: string;
        match_type: string;
      }>;
      level: "campaign" | "adgroup";
      adGroupId?: string;
    }
  ) => {
    const response = await api.post(
      `/google/accounts/${accountId}/campaigns/${campaignId}/negative-keywords/`,
      data
    );
    return response.data;
  },

  bulkUpdateGoogleNegativeKeywords: async (
    accountId: number,
    campaignId: string,
    data: {
      negativeKeywordIds: number[];
      action: string;
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      [key: string]: any;
    }
  ) => {
    const response = await api.post(
      `/google/accounts/${accountId}/campaigns/${campaignId}/negative-keywords/bulk-update/`,
      data
    );
    return response.data;
  },

  bulkDeleteGoogleNegativeKeywords: async (
    accountId: number,
    campaignId: string,
    negativeKeywordIds: number[]
  ) => {
    const response = await api.post(
      `/google/accounts/${accountId}/campaigns/${campaignId}/negative-keywords/bulk-delete/`,
      { negative_keyword_ids: negativeKeywordIds }
    );
    return response.data;
  },
};
