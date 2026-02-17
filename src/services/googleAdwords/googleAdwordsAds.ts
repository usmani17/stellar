import api from "../api";

export const googleAdwordsAdsService = {
  getGoogleAds: async (
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

    const response = await api.post(`/google-adwords/${accountId}/channels/${channelId}/ads/`, payload);
    return response.data;
  },

  syncGoogleAdAnalytics: async (
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
      `/google-adwords/${accountId}/channels/${channelId}/ads/analytics-sync/`,
      payload
    );
    return response.data;
  },

  exportGoogleAds: async (
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
      ad_ids?: Array<string | number>; // For selected ads export
    },
    exportType: "current_view" | "all_data" | "selected" = "all_data"
  ): Promise<{ url: string; filename: string }> => {
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

    // Add ad_ids for selected export
    if (exportType === "selected" && params?.ad_ids) {
      payload.ad_ids = params.ad_ids;
    }

    const url = `/google-adwords/${accountId}/channels/${channelId}/ads/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, payload);
    return response.data;
  },

  syncGoogleAds: async (
    accountId: number,
    channelId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(`/google-adwords/${accountId}/channels/${channelId}/ads/sync/`);
    return response.data;
  },

  bulkUpdateGoogleAds: async (
    accountId: number,
    channelId: number,
    payload: {
      adIds: Array<string | number>;
      action: "status";
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      campaignId?: string;  // Optional: filter by campaign (for product groups)
      adGroupId?: string;  // Optional: filter by ad group (for product groups)
    }
  ) => {
    // Validate channelId before constructing URL
    if (!channelId || isNaN(channelId)) {
      throw new Error(`Invalid channelId: ${channelId}. channelId must be a valid number.`);
    }
    const url = `/google-adwords/${accountId}/channels/${channelId}/ads/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createDemandGenAd: async (
    accountId: number,
    channelId: number,
    campaignId: string | number,
    payload: {
      adgroup_id?: string | number;
      save_as_draft?: boolean;
      ad: {
        ad_type: "DemandGenVideoResponsiveAdInfo" | "DemandGenMultiAssetAdInfo" | "DemandGenCarouselAdInfo";
        final_urls: string[];
        business_name: string;
        videos?: string[];
        logo_images?: string[];
        headlines: string[];
        descriptions: string[];
        long_headlines?: string[];
        images?: string[];
        carousel_cards?: Array<{
          asset: string;
          headline?: string;
          description?: string;
        }>;
      };
    }
  ) => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/campaigns/${String(campaignId)}/demand-gen-entities/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  /** Publish a draft Demand Gen ad: creates in Google Ads and removes draft row. */
  publishDemandGenDraftAd: async (
    accountId: number,
    channelId: number,
    campaignId: string | number,
    draftAdId: string
  ): Promise<{ ad?: { id?: string; resource_name?: string }; errors?: string[] }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/campaigns/${String(campaignId)}/demand-gen-entities/create/`;
    const response = await api.post(url, { ad_id: draftAdId });
    return response.data;
  },

  updateDraftAd: async (
    accountId: number,
    channelId: number,
    payload: { draft_id: string; ad: Record<string, unknown> }
  ): Promise<{ updated: boolean; ad_id: string }> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/ads/update-draft/`;
    const response = await api.patch(url, payload);
    return response.data;
  },
};
