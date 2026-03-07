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
  platform: string;
  description?: string;
  accountId: number;
  channelId?: number;
  profileId?: number;
  workflowId?: number;
  channelName?: string;
  profileName?: string;
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
    platform: string;
  }
): Promise<DashboardResponse> {
  const { data } = await api.post<DashboardResponse>(
    `${API_BASE}/${accountId}/dashboards/`,
    payload
  );
  return data;
}

/**
 * Update dashboard config (layout, component order, visualization types, etc.).
 */
export async function updateDashboardConfig(
  accountId: number,
  dashboardId: number,
  config: DashboardConfig
): Promise<DashboardResponse> {
  const { data } = await api.patch<DashboardResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/`,
    { config }
  );
  return data;
}

/**
 * Soft-delete a dashboard (sets deleted_at; it will no longer appear in the list).
 */
export async function softDeleteDashboard(
  accountId: number,
  dashboardId: number
): Promise<void> {
  await api.delete(`${API_BASE}/${accountId}/dashboards/${dashboardId}/`);
}

/** Deduplicate concurrent requests (e.g. React StrictMode double-invokes effects) */
const componentDataCache = new Map<string, Promise<DashboardComponent>>();

/**
 * Fetch data for a single dashboard component.
 * Deduplicates concurrent identical requests so each widget makes only one API call.
 * @param hardRefresh - When true, sends refresh=1 to bypass backend cache (hard refresh).
 */
export async function getDashboardComponentData(
  accountId: number,
  dashboardId: number,
  componentId: string,
  _component: DashboardComponent,
  channelId?: number,
  profileId?: number,
  refreshTrigger = 0,
  hardRefresh = false
): Promise<DashboardComponent> {
  const key = `${accountId}-${dashboardId}-${componentId}-${refreshTrigger}-${hardRefresh}`;
  const cached = componentDataCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const { data } = await api.get<DashboardComponent>(
        `${API_BASE}/${accountId}/dashboards/${dashboardId}/components/${componentId}/`,
        {
          params: {
            channelId,
            profileId,
            ...(hardRefresh && { refresh: 1 }),
          },
        }
      );
      return data ?? _component;
    } finally {
      componentDataCache.delete(key);
    }
  })();
  componentDataCache.set(key, promise);
  return promise;
}

/** SSE progress event: stage id and optional payload (display = full component result). */
export interface DashboardComponentStreamEvent {
  stage: string;
  data: unknown;
}

/**
 * Fetch component data via SSE stream; progress events drive the progress UI.
 * Calls onProgress for each event; when stage === "display", data is the DashboardComponent result.
 * On stream error or non-2xx, rejects so caller can fall back to getDashboardComponentData.
 */
export async function getDashboardComponentDataStream(
  accountId: number,
  dashboardId: number,
  componentId: string,
  _component: DashboardComponent,
  onProgress: (event: DashboardComponentStreamEvent) => void,
  channelId?: number,
  profileId?: number,
  hardRefresh = false
): Promise<DashboardComponent> {
  const baseURL = (api.defaults.baseURL || "").replace(/\/$/, "");
  const params = new URLSearchParams();
  if (channelId != null) params.set("channelId", String(channelId));
  if (profileId != null) params.set("profileId", String(profileId));
  if (hardRefresh) params.set("refresh", "1");
  const qs = params.toString();
  const url = `${baseURL}${API_BASE}/${accountId}/dashboards/${dashboardId}/components/${componentId}/stream/${qs ? `?${qs}` : ""}`;
  const token = localStorage.getItem("accessToken");
  const headers: HeadersInit = {
    Accept: "text/event-stream",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Stream failed: ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let lastData: DashboardComponent | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const chunk of lines) {
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine.slice(6)) as DashboardComponentStreamEvent;
        onProgress(payload);
        if (payload.stage === "display" && payload.data != null) {
          lastData = payload.data as DashboardComponent;
        }
      } catch {
        // skip malformed
      }
    }
  }
  if (lastData) return lastData;
  throw new Error("No display event in stream");
}
