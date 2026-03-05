/**
 * Dashboard API service — follows real flow:
 * 1. Fetch dashboard config (layout + components) by account/workflow or dashboard ID
 * 2. Fetch each component's data separately (account_id + dashboard_id + component_id)
 */

import api from "./api";
import type { DashboardConfig, DashboardComponent } from "../pages/workflows/types/dashboard";
import { getMockDataForComponent } from "../pages/workflows/utils/dashboardMockData";

const API_BASE = "/assistant";
const USE_REAL_API = import.meta.env.VITE_USE_DASHBOARD_API === "true";

export interface DashboardResponse {
  id: number;
  name: string;
  accountId: number;
  channelId?: number;
  profileId?: number;
  workflowId?: number;
  config: DashboardConfig;
  createdAt: string;
  updatedAt: string;
}

// ── List/Fetch ────────────────────────────────────────────────────────────

/**
 * Fetch all dashboards for an account.
 */
export async function getDashboards(accountId: number): Promise<DashboardResponse[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<DashboardResponse[]>(
      `${API_BASE}/${accountId}/dashboards/`
    );
    return data;
  }
  return [];
}

/**
 * Fetch dashboard config by workflow ID.
 */
export async function getDashboardForWorkflow(
  accountId: number,
  workflowId: number
): Promise<DashboardResponse | null> {
  if (USE_REAL_API) {
    const dashboards = await getDashboards(accountId);
    return dashboards.find((d) => d.workflowId === workflowId) ?? null;
  }
  return null;
}

/**
 * Fetch dashboard detail by ID.
 */
export async function getDashboardDetail(
  accountId: number,
  dashboardId: number
): Promise<DashboardResponse | null> {
  if (USE_REAL_API) {
    const { data } = await api.get<DashboardResponse>(
      `${API_BASE}/${accountId}/dashboards/${dashboardId}/`
    );
    return data;
  }
  return null;
}

/**
 * Legacy: config by share ID.
 * TODO: Backend needs to support shareId specifically if we want public dashboards.
 */
export async function getDashboardConfig(
  shareId: string
): Promise<{ config: DashboardConfig; workflowName?: string } | null> {
  if (USE_REAL_API) {
    // Current backend doesn't have /dashboards/share/{shareId} yet
    // fallback or error
    return null;
  }
  return null;
}

// ── Component data ──────────────────────────────────────────────────────────

/**
 * Create a dashboard for a workflow via the backend (proxied to Pixis Agent).
 */
export async function createDashboard(
  accountId: number,
  payload: {
    name: string;
    config: DashboardConfig;
    workflowId?: number;
    channelId?: number;
    profileId?: number;
  }
): Promise<DashboardResponse> {
  const { data } = await api.post<DashboardResponse>(
    `${API_BASE}/${accountId}/dashboards/`,
    payload
  );
  return data;
}

/**
 * Fetch data for a single dashboard component.
 */
export async function getDashboardComponentData(
  accountId: number,
  dashboardId: number,
  componentId: string,
  _component: DashboardComponent
): Promise<Record<string, unknown>[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<{ data: Record<string, unknown>[] }>(
      `${API_BASE}/${accountId}/dashboards/${dashboardId}/components/${componentId}/`
    );
    return data?.data ?? [];
  }

  return getMockDataForComponent(_component);
}
