import api from "../../../services/api";

export interface GoogleConnection {
  id: number;
  google_user_id: string;
  email: string;
  created_at: string;
}

export interface GoogleSheetsIntegration {
  id: number;
  name: string;
  connection?: GoogleConnection;
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
  connection_id?: number;
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
    "id" | "created_at"
  > & { connection_id: number },
) {
  const res = await api.post<GoogleSheetsIntegration>(
    `/brands/${accountId}/google-sheets/integrations`,
    payload,
  );
  return res.data;
}

export async function listSpreadsheets(
  accountId: number,
  connectionId?: number,
) {
  const res = await api.get<GoogleSpreadsheet[]>(
    `/brands/${accountId}/google-sheets/spreadsheets${
      connectionId ? `?connection_id=${connectionId}` : ""
    }`,
  );
  return res.data;
}

export async function listSheetTabs(
  accountId: number,
  spreadsheetId: string,
  connectionId?: number,
) {
  const res = await api.get<GoogleSheetTab[]>(
    `/brands/${accountId}/google-sheets/spreadsheets/${spreadsheetId}/tabs${
      connectionId ? `?connection_id=${connectionId}` : ""
    }`,
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

export async function listGoogleConnections(accountId: number) {
  const res = await api.get<GoogleConnection[]>(
    `/brands/${accountId}/google-sheets/connections`,
  );
  return res.data;
}

export async function updateGoogleSheetsIntegration(
  accountId: number,
  integrationId: number,
  payload: Partial<{
    name: string;
    connection_id: number;
    spreadsheet_id: string;
    spreadsheet_name: string;
    sheet_name: string;
    sheet_gid: string;
    range: string;
    header_row: number;
  }>,
) {
  const res = await api.patch<GoogleSheetsIntegration>(
    `/brands/${accountId}/google-sheets/${integrationId}`,
    payload,
  );
  return res.data;
}

