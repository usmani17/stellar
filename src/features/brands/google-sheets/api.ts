import api from "../../../services/api";

export interface GoogleSheetsIntegration {
  id: number;
  name: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_gid: string;
  sheet_name: string;
  header_row: number;
  range: string;
  created_at: string;
}

export interface GoogleSpreadsheet {
  id: string;
  name: string;
}

export interface GoogleSheetTab {
  gid: number;
  name: string;
}

export interface SheetPreviewRequest {
  spreadsheet_id: string;
  sheet_name: string;
  range: string;
  header_row: number;
}

export interface SheetPreviewResponse {
  columns: string[];
  rows: any[][];
}

export interface ColumnMapping {
  id?: number;
  column_name: string;
  type: string;
  role: string;
  ignore: boolean;
  is_key: boolean;
  position: number;
}

export async function getGoogleSheetsConnectUrl(accountId: number) {
  const res = await api.get<{ authorization_url: string }>(
    `/brands/${accountId}/google-sheets/connect`,
  );
  return res.data.authorization_url;
}

export async function listGoogleSheetsIntegrations(accountId: number) {
  const res = await api.get<GoogleSheetsIntegration[]>(
    `/brands/${accountId}/google-sheets/integrations`,
  );
  return res.data;
}

export async function getGoogleSheetsIntegration(
  accountId: number,
  integrationId: number,
) {
  const res = await api.get<GoogleSheetsIntegration>(
    `/brands/${accountId}/google-sheets/${integrationId}`,
  );
  return res.data;
}

export async function createGoogleSheetsIntegration(
  accountId: number,
  payload: Omit<
    GoogleSheetsIntegration,
    "id" | "created_at" | "sheet_gid" | "spreadsheet_name"
  > & { connection_id: number },
) {
  const res = await api.post<GoogleSheetsIntegration>(
    `/brands/${accountId}/google-sheets/integrations`,
    payload,
  );
  return res.data;
}

export async function listSpreadsheets(accountId: number) {
  const res = await api.get<GoogleSpreadsheet[]>(
    `/brands/${accountId}/google-sheets/spreadsheets`,
  );
  return res.data;
}

export async function listSheetTabs(
  accountId: number,
  spreadsheetId: string,
) {
  const res = await api.get<GoogleSheetTab[]>(
    `/brands/${accountId}/google-sheets/spreadsheets/${spreadsheetId}/tabs`,
  );
  return res.data;
}

export async function previewSheet(
  accountId: number,
  body: SheetPreviewRequest,
) {
  const res = await api.post<SheetPreviewResponse>(
    `/brands/${accountId}/google-sheets/preview`,
    body,
  );
  return res.data;
}

export async function getColumnMapping(integrationId: number) {
  const res = await api.get<ColumnMapping[]>(
    `/google-sheets/integrations/${integrationId}/mapping`,
  );
  return res.data;
}

export async function saveColumnMapping(
  integrationId: number,
  mapping: ColumnMapping[],
) {
  const res = await api.post<ColumnMapping[]>(
    `/google-sheets/integrations/${integrationId}/mapping`,
    mapping,
  );
  return res.data;
}

export async function triggerManualSync(integrationId: number) {
  const res = await api.post<{
    rows_processed: number;
    rows_inserted: number;
    rows_updated: number;
  }>(`/google-sheets/integrations/${integrationId}/sync`, {});
  return res.data;
}

