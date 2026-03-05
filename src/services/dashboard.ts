/**
 * Dashboard API service — follows real flow:
 * 1. Fetch dashboard config (layout + components) by account/workflow or dashboard ID
 * 2. Fetch each component's data separately (account_id + dashboard_id + component_id)
 */

import api from "./api";
import type { DashboardConfig, DashboardComponent } from "../pages/workflows/types/dashboard";

const API_BASE = "/assistant";

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
  const { data } = await api.get<DashboardResponse[]>(
    `${API_BASE}/${accountId}/dashboards/`
  );
  return data;
}

/**
 * Fetch dashboard config by workflow ID.
 */
export async function getDashboardForWorkflow(
  accountId: number,
  workflowId: number
): Promise<DashboardResponse | null> {
    const dashboards = await getDashboards(accountId);
    return dashboards.find((d) => d.workflowId === workflowId) ?? null;
}

/**
 * Fetch dashboard detail by ID.
 */
export async function getDashboardDetail(
  accountId: number,
  dashboardId: number
): Promise<DashboardResponse | null> {
  const { data } = await api.get<DashboardResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/`
  );
  return data;
}

/**
 * Legacy: config by share ID.
 * TODO: Backend needs to support shareId specifically if we want public dashboards.
 */
export async function getDashboardConfig(
  shareId: string
): Promise<{ config: DashboardConfig; workflowName?: string } | null> {
    const { data } = await api.get<DashboardConfig>(
      `${API_BASE}/dashboards/share/${shareId}/`
    );
    return { config: data };
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
): Promise<DashboardComponent> {
    const  {data}  = await api.get<DashboardComponent>(
      `${API_BASE}/${accountId}/dashboards/${dashboardId}/components/${componentId}/`
    );
    const resp = data ?? _component;
    return resp;
}
