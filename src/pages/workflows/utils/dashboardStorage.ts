/**
 * Dashboard storage utilities — localStorage for MVP (no backend)
 */

import type { DashboardConfig } from "../types/dashboard";

const WORKFLOW_DASHBOARD_PREFIX = "stellar-workflow-dashboard-";
const SHARE_PREFIX = "stellar-dashboard-share-";

export function hasDashboardForWorkflow(workflowId: number): boolean {
  try {
    const raw = localStorage.getItem(`${WORKFLOW_DASHBOARD_PREFIX}${workflowId}`);
    return raw != null && raw.length > 0;
  } catch {
    return false;
  }
}

export function getDashboardForWorkflow(workflowId: number): DashboardConfig | null {
  try {
    const raw = localStorage.getItem(`${WORKFLOW_DASHBOARD_PREFIX}${workflowId}`);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardConfig;
  } catch {
    return null;
  }
}

export function setDashboardForWorkflow(workflowId: number, config: DashboardConfig): void {
  try {
    localStorage.setItem(`${WORKFLOW_DASHBOARD_PREFIX}${workflowId}`, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save dashboard:", e);
  }
}

export interface SharePayload {
  workflowId: number;
  accountId: number;
  config: DashboardConfig;
  workflowName?: string;
}

export function getShareConfig(shareId: string): SharePayload | null {
  try {
    const raw = localStorage.getItem(`${SHARE_PREFIX}${shareId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SharePayload;
  } catch {
    return null;
  }
}

export function setShareConfig(shareId: string, payload: SharePayload): void {
  try {
    localStorage.setItem(`${SHARE_PREFIX}${shareId}`, JSON.stringify(payload));
  } catch (e) {
    console.error("Failed to save share config:", e);
  }
}

const DEMO_LAYOUT_KEY = "stellar-dashboard-demo-layout";
/** Bump when config order changes — invalidates saved layout so charts show first */
const DEMO_LAYOUT_VERSION = 4;

import type { VisualizationType } from "../types/dashboard";

export interface DemoLayoutState {
  version?: number;
  componentIds: string[];
  expandedId: string | null;
  /** Per-component chart type overrides (e.g. user switched line → bar) */
  visualizationOverrides?: Record<string, VisualizationType>;
}

export function getDemoLayoutState(): DemoLayoutState | null {
  try {
    const raw = localStorage.getItem(DEMO_LAYOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoLayoutState;
    if (parsed.version !== DEMO_LAYOUT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDemoLayoutState(state: DemoLayoutState): void {
  try {
    const withVersion = { ...state, version: DEMO_LAYOUT_VERSION };
    localStorage.setItem(DEMO_LAYOUT_KEY, JSON.stringify(withVersion));
  } catch (e) {
    console.error("Failed to save demo layout:", e);
  }
}

export function clearDemoLayoutState(): void {
  try {
    localStorage.removeItem(DEMO_LAYOUT_KEY);
  } catch {
    // ignore
  }
}
