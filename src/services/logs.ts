import api from "./api";

export interface LogEntry {
  id: number;
  profileId?: string;
  action?: string;
  campaignId?: string;
  ad_type?: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  status?: string;
  error_details?: string;
  method?: "Inline" | "AI" | "Bulk";
  changed_by?: number;
  changed_by_name?: string;
  changed_at?: string;
  marketplace?: string;
  // Legacy fields for backward compatibility
  entity?: string;
  field?: string;
  campaign_id?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LogsQueryParams {
  campaign_id?: string;
  marketplace?: string; // 'amazon', 'google', 'tiktok'
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}

export interface LogsExportParams {
  campaign_id?: string;
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  export_type?: "all_data" | "current_view";
}

export interface CreateLogData {
  campaign_id?: string;
  entity: string;
  field: string;
  old_value?: string;
  new_value?: string;
  method: "Inline" | "AI" | "Bulk";
}

export const logsService = {
  getLogs: async (
    accountId: number,
    params?: LogsQueryParams
  ): Promise<LogsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.campaign_id) {
      queryParams.append("campaign_id", params.campaign_id);
    }
    if (params?.marketplace) {
      queryParams.append("marketplace", params.marketplace);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.page_size) {
      queryParams.append("page_size", params.page_size.toString());
    }
    if (params?.start_date) {
      queryParams.append("start_date", params.start_date);
    }
    if (params?.end_date) {
      queryParams.append("end_date", params.end_date);
    }

    const queryString = queryParams.toString();
    const url = `/accounts/${accountId}/logs${
      queryString ? `?${queryString}` : ""
    }`;
    const response = await api.get<LogsResponse>(url);
    return response.data;
  },

  createLog: async (
    accountId: number,
    data: CreateLogData
  ): Promise<LogEntry> => {
    const response = await api.post<LogEntry>(
      `/accounts/${accountId}/logs/create/`,
      data
    );
    return response.data;
  },

  exportLogs: async (
    accountId: number,
    params?: LogsExportParams
  ): Promise<{ url: string; filename: string }> => {
    // Build filters object for POST request body
    const filters: any = {};

    if (params?.campaign_id) {
      filters.campaign_id = params.campaign_id;
    }
    if (params?.page) {
      filters.page = params.page;
    }
    if (params?.page_size) {
      filters.page_size = params.page_size;
    }
    if (params?.start_date) {
      filters.start_date = params.start_date;
    }
    if (params?.end_date) {
      filters.end_date = params.end_date;
    }

    // Send POST request with filters and export_type in body
    const url = `/accounts/${accountId}/logs/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, {
      filters,
      export_type: params?.export_type || "all_data",
    });
    return response.data;
  },
};
