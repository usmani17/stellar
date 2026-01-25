import type { IGoogleCampaignsSummary } from "../../types/google/campaign";
import api from "../api";

export const googleAdwordsAdGroupsService = {
  getGoogleAdGroups: async (
    accountId: number,
    campaignId?: string | number,
    params?: {
      filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
    }
  ): Promise<{
    adgroups: any[];
    summary?: IGoogleCampaignsSummary | null;
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
    
    // Add campaign_id if provided
    if (campaignId) payload.campaign_id = campaignId;
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;

    const response = await api.post(`/google-adwords/${accountId}/adgroups/`, payload);
    return response.data;
  },

  syncGoogleAdGroupAnalytics: async (
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
      `/google-adwords/${accountId}/adgroups/analytics-sync/`,
      payload
    );
    return response.data;
  },

  exportGoogleAdGroups: async (
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
      adgroup_ids?: Array<string | number>; // For selected adgroups export
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
    
    // Add campaign_id if provided
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;

    // Add adgroup_ids for selected export
    if (exportType === "selected" && params?.adgroup_ids) {
      payload.adgroup_ids = params.adgroup_ids;
    }

    // Make request with responseType blob to handle CSV file
    const response = await api.post(
      `/google-adwords/${accountId}/adgroups/export/`,
      payload,
      {
        responseType: "blob",
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = "google_adgroups_export.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  syncGoogleAdGroups: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/adgroups/sync/`
    );
    return response.data;
  },

  bulkUpdateGoogleAdGroups: async (
    accountId: number,
    payload: {
      adgroupIds: Array<string | number>;
      action: "status" | "bid" | "name";
      status?: "ENABLED" | "PAUSED";
      bid?: number;
      name?: string;
    }
  ) => {
    const url = `/google-adwords/${accountId}/adgroups/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },
};
