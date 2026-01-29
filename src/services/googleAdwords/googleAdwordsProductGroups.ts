import api from "../api";

export const googleAdwordsProductGroupsService = {
  getGoogleProductGroups: async (
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
    }
  ): Promise<{
    ads: any[];
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
      total_ads: number;
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
    
    // Add campaign_id and adgroup_id if provided
    if (campaignId) payload.campaign_id = campaignId;
    if (adgroupId) payload.adgroup_id = adgroupId;
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;
    if (params?.adgroup_id) payload.adgroup_id = params.adgroup_id;

    const response = await api.post(`/google-adwords/${accountId}/channels/${channelId}/product-groups/`, payload);
    return response.data;
  },

  syncGoogleProductGroupAnalytics: async (
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
      `/google-adwords/${accountId}/channels/${channelId}/product-groups/analytics-sync/`,
      payload
    );
    return response.data;
  },

  exportGoogleProductGroups: async (
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
      productGroupIds?: Array<string | number>; // For selected product groups export
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

    // Add productGroupIds for selected export
    if (exportType === "selected" && params?.productGroupIds) {
      payload.productGroupIds = params.productGroupIds;
    }

    const url = `/google-adwords/${accountId}/channels/${channelId}/product-groups/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, payload);
    return response.data;
  },

  syncGoogleProductGroups: async (
    accountId: number,
    channelId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/channels/${channelId}/product-groups/sync/`
    );
    return response.data;
  },

  bulkUpdateGoogleProductGroups: async (
    accountId: number,
    channelId: number,
    payload: {
      productGroupIds: Array<string | number>;
      action: "status";
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      campaignId?: string;  // Optional: filter by campaign
      adGroupId?: string;  // Optional: filter by ad group
    }
  ) => {
    // Validate channelId before constructing URL
    if (!channelId || isNaN(channelId)) {
      throw new Error(`Invalid channelId: ${channelId}. channelId must be a valid number.`);
    }
    const url = `/google-adwords/${accountId}/channels/${channelId}/product-groups/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },
};
