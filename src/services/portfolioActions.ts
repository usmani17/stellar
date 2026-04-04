import api from "./api";
import type { PortfolioAction, ActionStatusLogEntry } from "./dashboard";

const API_BASE = "/assistant";

export async function listPortfolioActions(
  accountId: number,
  portfolioId: number,
): Promise<PortfolioAction[]> {
  const { data } = await api.get<{ actions: PortfolioAction[] }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/`
  );
  return data.actions;
}

export async function createPortfolioAction(
  accountId: number,
  portfolioId: number,
  payload: Record<string, unknown>,
): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/create/`,
    payload,
  );
  return data;
}

export async function getPortfolioAction(
  accountId: number,
  portfolioId: number,
  actionId: number,
): Promise<PortfolioAction> {
  const { data } = await api.get<{ action: PortfolioAction }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/${actionId}/`
  );
  return data.action;
}

export async function updatePortfolioAction(
  accountId: number,
  portfolioId: number,
  actionId: number,
  updates: Record<string, unknown>,
): Promise<{ updated: boolean }> {
  const { data } = await api.patch<{ updated: boolean }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/${actionId}/`,
    updates,
  );
  return data;
}

export async function deletePortfolioAction(
  accountId: number,
  portfolioId: number,
  actionId: number,
): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<{ deleted: boolean }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/${actionId}/`
  );
  return data;
}

export async function updatePortfolioActionStatus(
  accountId: number,
  portfolioId: number,
  actionIds: number[],
  newStatus: string,
): Promise<{ updated: number }> {
  const { data } = await api.patch<{ updated: number }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/status/`,
    { action_ids: actionIds, status: newStatus },
  );
  return data;
}

export interface ExecutionHistoryResponse {
  executions: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
}

export async function getPortfolioActionHistory(
  accountId: number,
  portfolioId: number,
  params?: {
    status?: string;
    action_type?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  },
): Promise<ExecutionHistoryResponse> {
  const { data } = await api.get<ExecutionHistoryResponse>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/history/`,
    { params },
  );
  return data;
}

export async function getPortfolioActionTrail(
  accountId: number,
  portfolioId: number,
  actionId: number,
  params?: { limit?: number; offset?: number },
): Promise<ActionStatusLogEntry[]> {
  const { data } = await api.get<{ trail: ActionStatusLogEntry[] }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/${actionId}/trail/`,
    { params },
  );
  return data.trail;
}

export interface ActionPreviewEntity {
  id: string;
  name: string;
  data: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ActionPreviewProposal {
  action_id: number;
  action_slug: string;
  type: string;
  description: string;
  total_rows: number;
  matched_rows: number;
  entities: ActionPreviewEntity[];
}

export async function previewPortfolioAction(
  accountId: number,
  portfolioId: number,
  actionId: number,
): Promise<ActionPreviewProposal | null> {
  const { data } = await api.post<{ proposal: ActionPreviewProposal | null }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/${actionId}/preview/`,
  );
  return data.proposal;
}

export async function executePortfolioAction(
  accountId: number,
  portfolioId: number,
  actionId: number,
): Promise<{ status: string; message: string; proposal?: ActionPreviewProposal }> {
  const { data } = await api.post<{ status: string; message: string; proposal?: ActionPreviewProposal }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/actions/${actionId}/execute/`,
  );
  return data;
}

export interface PortfolioChatEntry {
  id: number;
  portfolioId: number;
  sessionId: string;
  sessionType: string;
  accountId: number;
  actionsAdded: number;
  summary: string | null;
  createdAt: string;
}

export async function getPortfolioAnalysisHistory(
  accountId: number,
  portfolioId: number,
): Promise<PortfolioChatEntry[]> {
  const { data } = await api.get<{ chats: PortfolioChatEntry[] }>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/analysis-history/`,
  );
  return data.chats;
}

export interface RefreshSettings {
  actionRefreshEnabled: boolean;
  actionRefreshFrequency: string;
  actionRefreshTime: string;
  actionRefreshWeekday: number;
  actionRefreshMonthDay: number;
  actionRefreshNextAt: string | null;
  actionRefreshLastAt: string | null;
}

export async function getPortfolioRefreshSettings(
  accountId: number,
  portfolioId: number,
): Promise<RefreshSettings> {
  const { data } = await api.get<RefreshSettings>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/refresh-settings/`,
  );
  return data;
}

export async function updatePortfolioRefreshSettings(
  accountId: number,
  portfolioId: number,
  settings: {
    enabled?: boolean;
    frequency?: string;
    time?: string;
    weekday?: number;
    monthDay?: number;
  },
): Promise<RefreshSettings> {
  const { data } = await api.patch<RefreshSettings>(
    `${API_BASE}/${accountId}/portfolios/${portfolioId}/refresh-settings/`,
    settings,
  );
  return data;
}
