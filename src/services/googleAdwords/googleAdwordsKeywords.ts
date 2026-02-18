import api from "../api";
import { toLocalDateString } from "../../utils/dateHelpers";

export const googleAdwordsKeywordsService = {
  getGoogleKeywords: async (
    accountId: number,
    channelId: number,
    campaignId?: string | number,
    adgroupId?: string | number,
    params?: {
      filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
      adgroup_id?: string | number;
      draft_only?: boolean;
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
    // Send filters array and params directly to backend - let backend handle conversion
    const payload: any = {
      filters: params?.filters || [],
      sort_by: params?.sort_by,
      order: params?.order,
      page: params?.page,
      page_size: params?.page_size,
      start_date: params?.start_date,
      end_date: params?.end_date,
    };
    
    // Add campaign_id, adgroup_id, and draft_only if provided
    if (campaignId) payload.campaign_id = campaignId;
    if (adgroupId) payload.adgroup_id = adgroupId;
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;
    if (params?.adgroup_id) payload.adgroup_id = params.adgroup_id;
    if (params?.draft_only !== undefined) payload.draft_only = params.draft_only;

    const response = await api.post(`/google-adwords/${accountId}/channels/${channelId}/keywords/`, payload);
    return response.data;
  },

  syncGoogleKeywordAnalytics: async (
    accountId: number,
    channelId: number,
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
      `/google-adwords/${accountId}/channels/${channelId}/keywords/analytics-sync/`,
      payload
    );
    return response.data;
  },

  exportGoogleKeywords: async (
    accountId: number,
    channelId: number,
    params?: {
      filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
      adgroup_id?: string | number;
      keyword_ids?: Array<string | number>; // For selected keywords export
    },
    exportType: "current_view" | "all_data" | "selected" = "all_data"
  ): Promise<void> => {
    // Send filters array and params directly to backend - let backend handle conversion
    const payload: any = {
      filters: params?.filters || [],
      sort_by: params?.sort_by,
      order: params?.order,
      page: params?.page,
      page_size: params?.page_size,
      start_date: params?.start_date,
      end_date: params?.end_date,
      export_type: exportType,
    };
    
    // Add campaign_id and adgroup_id if provided
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;
    if (params?.adgroup_id) payload.adgroup_id = params.adgroup_id;

    // Add keyword_ids for selected export
    if (exportType === "selected" && params?.keyword_ids) {
      payload.keyword_ids = params.keyword_ids;
    }

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/google-adwords/${accountId}/channels/${channelId}/keywords/export/`,
      payload,
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
      `google-keywords-${toLocalDateString(new Date())}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  syncGoogleKeywords: async (
    accountId: number,
    channelId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/channels/${channelId}/keywords/sync/`
    );
    return response.data;
  },

  bulkUpdateGoogleKeywords: async (
    accountId: number,
    channelId: number,
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
    // Validate channelId before constructing URL
    if (!channelId || isNaN(channelId)) {
      throw new Error(`Invalid channelId: ${channelId}. channelId must be a valid number.`);
    }
    const url = `/google-adwords/${accountId}/channels/${channelId}/keywords/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  /** Publish a draft keyword: creates in Google Ads and removes draft row. */
  publishDraftKeyword: async (
    accountId: number,
    channelId: number,
    draftKeywordId: string
  ): Promise<{ keyword_id?: string; resource_name?: string }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/keywords/publish-draft/`;
    const response = await api.post(url, { keyword_id: draftKeywordId });
    return response.data;
  },

  updateDraftKeyword: async (
    accountId: number,
    channelId: number,
    payload: { draft_id: string; text?: string; match_type?: string; cpc_bid?: number; status?: string }
  ): Promise<{ updated: boolean; keyword_id: string }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/keywords/update-draft/`;
    const response = await api.patch(url, payload);
    return response.data;
  },
};
