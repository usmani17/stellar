import api from "./api";

export interface LogEntry {
  id: number;
  entity: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  method: "Inline" | "AI" | "Bulk";
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
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
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
};
