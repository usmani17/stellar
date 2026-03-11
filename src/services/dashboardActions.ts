/**
 * Dashboard Actions API service — preview, execute, and history for widget action rules.
 */

import api from "./api";
import type {
  ActionProposal,
  ActionExecution,
} from "../pages/workflows/types/dashboard";

const API_BASE = "/assistant";

// ── Preview ────────────────────────────────────────────────────────────────

export interface PreviewActionsRequest {
  component_id: string;
  action_rule_ids?: string[];
}

export interface PreviewActionsResponse {
  proposals: ActionProposal[];
}

/**
 * Re-run the widget query and generate before/after proposals for action rules.
 * No changes are made — this is a dry run.
 */
export async function previewActions(
  accountId: number,
  dashboardId: number,
  payload: PreviewActionsRequest
): Promise<PreviewActionsResponse> {
  const { data } = await api.post<PreviewActionsResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/actions/preview/`,
    payload
  );
  return data;
}

// ── Execute ────────────────────────────────────────────────────────────────

export interface ExecuteActionsRequest {
  component_id: string;
  action_rule_ids: string[];
}

export interface ExecuteActionResult {
  action_rule_id: string;
  status: "success" | "failed";
  updated?: number;
  failed?: number;
  errors?: string[];
  error?: string;
  message?: string;
  guardrail_warnings?: string[];
  guardrail_blocks?: string[];
}

export interface ExecuteActionsResponse {
  results: ExecuteActionResult[];
}

/**
 * Re-run the widget query with fresh data and execute the specified action rules
 * via the platform API (e.g. Google Ads).
 */
export async function executeActions(
  accountId: number,
  dashboardId: number,
  payload: ExecuteActionsRequest
): Promise<ExecuteActionsResponse> {
  const { data } = await api.post<ExecuteActionsResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/actions/execute/`,
    payload
  );
  return data;
}

// ── History ────────────────────────────────────────────────────────────────

export interface ActionHistoryParams {
  component_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ActionHistoryResponse {
  executions: ActionExecution[];
}

/**
 * Fetch execution history for a dashboard, optionally filtered by component or status.
 */
export async function getActionHistory(
  accountId: number,
  dashboardId: number,
  params?: ActionHistoryParams
): Promise<ActionHistoryResponse> {
  const { data } = await api.get<ActionHistoryResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/actions/history/`,
    { params }
  );
  return data;
}
