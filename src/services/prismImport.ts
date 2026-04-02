import api from "./api";

export interface ResolvePrismImportSheetTab {
  gid: number | string;
  name: string;
}

export interface ResolvePrismImportSheetResponse {
  spreadsheet_id: string;
  spreadsheet_name: string;
  tabs: ResolvePrismImportSheetTab[];
}

export const prismImportService = {
  resolveSheet: async (params: {
    sheet_url: string;
  }): Promise<ResolvePrismImportSheetResponse> => {
    const response = await api.post<ResolvePrismImportSheetResponse>(
      "/import_from_prism/resolve-sheet",
      {
        sheet_url: params.sheet_url,
      },
    );
    return response.data;
  },

  startImport: async (params: {
    sheet_url: string;
    tab_name: string;
    header_row?: number;
  }): Promise<{ job_id: string; status: string }> => {
    const response = await api.post<{ job_id: string; status: string }>(
      "/import_from_prism/",
      {
        sheet_url: params.sheet_url,
        tab_name: params.tab_name,
        header_row: params.header_row ?? 1,
      },
    );
    return response.data;
  },
};

