/**
 * Dashboard API service — follows real flow:
 * 1. Fetch dashboard config (layout + components) by share ID
 * 2. Fetch each component's data separately (dashboard_id + component_id)
 *
 * Mock implementation until backend is ready. Swap to real API by setting
 * VITE_USE_DASHBOARD_API=true or when backend endpoints exist.
 */

import api from "./api";
import type { DashboardConfig, DashboardComponent } from "../pages/workflows/types/dashboard";
import { getMockDataForComponent } from "../pages/workflows/utils/dashboardMockData";
import { getShareConfig } from "../pages/workflows/utils/dashboardStorage";

const API_BASE = "/assistant";
const USE_REAL_API = import.meta.env.VITE_USE_DASHBOARD_API === "true";

// ── Config ────────────────────────────────────────────────────────────────

/**
 * Fetch dashboard config by share ID.
 * Real: GET /api/assistant/dashboards/share/{shareId}/
 * Mock: localStorage or fallback
 */
export async function getDashboardConfig(
  shareId: string
): Promise<{ config: DashboardConfig; workflowName?: string } | null> {
  if (USE_REAL_API) {
    const { data } = await api.get<DashboardConfig>(
      `${API_BASE}/dashboards/share/${shareId}/`
    );
    return { config: data };
  }

  const payload = getShareConfig(shareId);
  if (payload) {
    return { config: payload.config, workflowName: payload.workflowName };
  }
  return null;
}

// ── Component data ──────────────────────────────────────────────────────────

/**
 * Fetch data for a single dashboard component.
 * Real: GET /api/assistant/dashboards/share/{shareId}/components/{componentId}/data/
 *      or POST with body { dashboard_id, component_id }
 * Mock: getMockDataForComponent
 */
export async function getDashboardComponentData(
  shareId: string,
  componentId: string,
  component: DashboardComponent
): Promise<Record<string, unknown>[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<{ rows: Record<string, unknown>[] }>(
      `${API_BASE}/dashboards/share/${shareId}/components/${componentId}/data/`
    );
    return data?.rows ?? [];
  }

  return getMockDataForComponent(component);
}
