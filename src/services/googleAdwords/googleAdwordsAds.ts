import api from "../api";

export const googleAdwordsAdsService = {
  getGoogleAds: async (
    accountId: number,
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
    
    // Add campaign_id and adgroup_id if provided
    if (campaignId) payload.campaign_id = campaignId;
    if (adgroupId) payload.adgroup_id = adgroupId;
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;
    if (params?.adgroup_id) payload.adgroup_id = params.adgroup_id;

    const response = await api.post(`/google-adwords/${accountId}/ads/`, payload);
    return response.data;
  },

  syncGoogleAdAnalytics: async (
    accountId: number,
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
      `/google-adwords/${accountId}/ads/analytics-sync/`,
      payload
    );
    return response.data;
  },

  exportGoogleAds: async (
    accountId: number,
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
    },
    exportType: "current_view" | "all_data" = "all_data"
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

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/google-adwords/${accountId}/ads/export/`,
      payload,
      {
        responseType: "blob",
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `google-ads-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  syncGoogleAds: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(`/google-adwords/${accountId}/ads/sync/`);
    return response.data;
  },

  bulkUpdateGoogleAds: async (
    accountId: number,
    payload: {
      adIds: Array<string | number>;
      action: "status";
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      campaignId?: string;  // Optional: filter by campaign (for product groups)
      adGroupId?: string;  // Optional: filter by ad group (for product groups)
    }
  ) => {
    const url = `/google-adwords/${accountId}/ads/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },
};
