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
 * Legacy: config by share ID. public dashboards.
 */
export async function getSharedDashboardConfig(
  shareId: string
): Promise<{ config: DashboardConfig; workflowName?: string } | null> {
    const { data } = await api.get<DashboardConfig>(
      `${API_BASE}/dashboards/share/${shareId}/`
    );
    // Backend returns full dashboard object, extract config and name
    if (data && typeof data === 'object' && 'config' in data) {
      return { 
        config: (data as any).config, 
        workflowName: (data as any).name 
      };
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

/** Payload for updating a single component; backend merges and keeps others as-is */
export interface DashboardComponentUpdatePayload {
  layout: DashboardConfig["layout"];
  component: Omit<DashboardComponent, "data">;
}

/**
 * Update a single dashboard component. Backend merges this component by id and leaves others unchanged.
 */
export async function updateDashboardComponent(
  accountId: number,
  dashboardId: number,
  payload: DashboardComponentUpdatePayload
): Promise<DashboardResponse> {
  const { data } = await api.patch<DashboardResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/`,
    { config: { layout: payload.layout, component: payload.component } }
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
 * Fetch data for a single dashboard component (authenticated).
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

/**
 * Fetch data for a single component on a shared (public) dashboard. No credentials required.
 */
export async function getSharedDashboardComponentData(
  shareId: string,
  componentId: string,
  _component: DashboardComponent,
  channelId?: number,
  profileId?: number,
  hardRefresh = false
): Promise<DashboardComponent> {
  const { data } = await api.get<DashboardComponent>(
    `${API_BASE}/dashboards/share/${shareId}/components/${componentId}/`,
    {
      params: {
        channelId,
        profileId,
        ...(hardRefresh && { refresh: 1 }),
      },
    }
  );
  return data ?? _component;
}

/** SSE progress event: stage id and optional payload (display = full component result). */
export interface DashboardComponentStreamEvent {
  stage: string;
  data: unknown;
}

/** Deduplicate concurrent stream requests (e.g. React StrictMode double-invokes effects) */
const componentStreamCache = new Map<string, Promise<DashboardComponent>>();
/** Keep resolved results briefly so Strict Mode remount can reuse (avoids duplicate API calls) */
const RESOLVED_STREAM_TTL_MS = 3000;
const componentStreamResolvedCache = new Map<string, { data: DashboardComponent; expires: number }>();

/**
 * Fetch component data via SSE stream; progress events drive the progress UI.
 * Calls onProgress for each event; when stage === "display", data is the DashboardComponent result.
 * Deduplicates concurrent identical requests and reuses recently resolved results (Strict Mode).
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
  const key = `stream:${accountId}-${dashboardId}-${componentId}-${channelId ?? ""}-${profileId ?? ""}-${hardRefresh}`;
  const now = Date.now();
  const resolvedEntry = componentStreamResolvedCache.get(key);
  if (resolvedEntry && resolvedEntry.expires > now) return resolvedEntry.data;
  if (resolvedEntry && resolvedEntry.expires <= now) {
    componentStreamResolvedCache.delete(key);
  }
  const cached = componentStreamCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const baseURL = (api.defaults.baseURL || "").replace(/\/$/, "");
      const params = new URLSearchParams();
      if (channelId != null) params.set("channelId", String(channelId));
      if (profileId != null) params.set("profileId", String(profileId));
      if (hardRefresh) params.set("refresh", "1");
      const qs = params.toString();
      const url = `${baseURL}${API_BASE}/${accountId}/dashboards/${dashboardId}/components/${componentId}/stream/${qs ? `?${qs}` : ""}`;
      const token = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }
      const result = await readDashboardComponentStream(response, onProgress);
      componentStreamResolvedCache.set(key, { data: result, expires: Date.now() + RESOLVED_STREAM_TTL_MS });
      return result;
    } finally {
      componentStreamCache.delete(key);
    }
  })();
  componentStreamCache.set(key, promise);
  return promise;
}

/** Deduplicate concurrent shared stream requests */
const sharedComponentStreamCache = new Map<string, Promise<DashboardComponent>>();
const sharedComponentStreamResolvedCache = new Map<string, { data: DashboardComponent; expires: number }>();

/**
 * Fetch component data via SSE stream for a shared (public) dashboard. No credentials required.
 * Deduplicates concurrent identical requests and reuses recently resolved results.
 */
export async function getSharedDashboardComponentDataStream(
  shareId: string,
  componentId: string,
  _component: DashboardComponent,
  onProgress: (event: DashboardComponentStreamEvent) => void,
  channelId?: number,
  profileId?: number,
  hardRefresh = false
): Promise<DashboardComponent> {
  const key = `shared-stream:${shareId}-${componentId}-${channelId ?? ""}-${profileId ?? ""}-${hardRefresh}`;
  const now = Date.now();
  const resolvedEntry = sharedComponentStreamResolvedCache.get(key);
  if (resolvedEntry && resolvedEntry.expires > now) return resolvedEntry.data;
  if (resolvedEntry && resolvedEntry.expires <= now) {
    sharedComponentStreamResolvedCache.delete(key);
  }
  const cached = sharedComponentStreamCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const baseURL = (api.defaults.baseURL || "").replace(/\/$/, "");
      const params = new URLSearchParams();
      if (channelId != null) params.set("channelId", String(channelId));
      if (profileId != null) params.set("profileId", String(profileId));
      if (hardRefresh) params.set("refresh", "1");
      const qs = params.toString();
      const url = `${baseURL}${API_BASE}/dashboards/share/${shareId}/components/${componentId}/stream/${qs ? `?${qs}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }
      const result = await readDashboardComponentStream(response, onProgress);
      sharedComponentStreamResolvedCache.set(key, { data: result, expires: Date.now() + RESOLVED_STREAM_TTL_MS });
      return result;
    } finally {
      sharedComponentStreamCache.delete(key);
    }
  })();
  sharedComponentStreamCache.set(key, promise);
  return promise;
}

function readDashboardComponentStream(
  response: Response,
  onProgress: (event: DashboardComponentStreamEvent) => void
): Promise<DashboardComponent> {
  const reader = response.body?.getReader();
  if (!reader) {
    return Promise.reject(new Error("No response body"));
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let lastData: DashboardComponent | null = null;
  return (async () => {
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
  })();
}


/**
 * Create a share link for a dashboard.
 */
export async function createDashboardShare(
  accountId: number,
  dashboardId: number,
  expiresAt?: string
): Promise<{ share_id: string; id: number }> {
  const { data } = await api.post(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/shares/`,
    { expires_at: expiresAt }
  );
  return data;
}