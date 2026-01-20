import api from "../api";

export interface TikTokLogEntry {
    id: number;
    advertiser_id: string;
    action: string;
    campaign_id?: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    field_name: string;
    old_value?: string;
    new_value?: string;
    status: string;
    error_details?: string;
    method: "Inline" | "Bulk";
    changed_by?: number;
    changed_by_name: string;
    changed_at: string;
}

export interface TikTokLogsResponse {
    logs: TikTokLogEntry[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface TikTokLogsQueryParams {
    campaign_id?: string;
    entity_type?: string;
    entity_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
}

export interface TikTokLogsExportParams extends TikTokLogsQueryParams {
    export_type?: "all_data" | "current_view";
}

export const tiktokLogsService = {
    getTikTokLogs: async (
        accountId: number,
        params?: TikTokLogsQueryParams
    ): Promise<TikTokLogsResponse> => {
        const queryParams = new URLSearchParams();

        if (params?.campaign_id) {
            queryParams.append("campaign_id", params.campaign_id);
        }
        if (params?.entity_type) {
            queryParams.append("entity_type", params.entity_type);
        }
        if (params?.entity_id) {
            queryParams.append("entity_id", params.entity_id);
        }
        if (params?.search) {
            queryParams.append("search", params.search);
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
        const url = `/tiktok/${accountId}/logs/${queryString ? `?${queryString}` : ""}`;
        const response = await api.get<TikTokLogsResponse>(url);
        return response.data;
    },

    exportTikTokLogs: async (
        accountId: number,
        params?: TikTokLogsExportParams
    ): Promise<{ url: string; filename: string; count: number }> => {
        const filters: Record<string, unknown> = {};

        if (params?.campaign_id) {
            filters.campaign_id = params.campaign_id;
        }
        if (params?.entity_type) {
            filters.entity_type = params.entity_type;
        }
        if (params?.entity_id) {
            filters.entity_id = params.entity_id;
        }
        if (params?.search) {
            filters.search = params.search;
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

        const url = `/tiktok/${accountId}/logs/export/`;
        const response = await api.post<{ url: string; filename: string; count: number }>(url, {
            filters,
            export_type: params?.export_type || "all_data",
        });
        return response.data;
    },
};
