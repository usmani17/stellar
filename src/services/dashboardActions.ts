/**
 * Dashboard Actions API service — preview, execute, and history for widget action rules.
 */

import api from "./api";
import { getCurrentWorkspaceId } from "../lib/workspace";
import type {
  ActionExecution,
  ActionProposal,
  ActionRule,
  DashboardComponent,
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

/** One entry in errors[] can be a string or { campaign_id, error } from the API */
export type ExecuteActionErrorItem =
  | string
  | { campaign_id?: string; error: string };

export interface ExecuteActionResult {
  action_rule_id: string;
  status: "success" | "failed";
  updated?: number;
  failed?: number;
  errors?: ExecuteActionErrorItem[];
  error?: string;
  message?: string;
  /** Staggered Google keyword apply queued via Celery (or mock of that path). */
  scheduled?: boolean;
  mock?: boolean;
  total_keywords?: number;
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
  action_type?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ActionHistoryResponse {
  executions: ActionExecution[];
  total: number;
  limit: number;
  offset: number;
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

export interface PatchKeywordAnalysisRequest {
  component_id: string;
  action_id: number;
  /** Full analysis object; null clears stored analysis. */
  keyword_analysis: Record<string, unknown> | null;
}

export interface PatchKeywordAnalysisResponse {
  keyword_analysis: Record<string, unknown> | null;
}

/**
 * Persist user-edited keyword analysis on assistant.actions (separate from AI stream).
 */
export async function patchKeywordAnalysis(
  accountId: number,
  dashboardId: number,
  body: PatchKeywordAnalysisRequest
): Promise<PatchKeywordAnalysisResponse> {
  const { data } = await api.patch<PatchKeywordAnalysisResponse>(
    `${API_BASE}/${accountId}/dashboards/${dashboardId}/actions/keyword-analysis/`,
    body
  );
  return data;
}

// ── Keyword analysis (SSE over POST) ───────────────────────────────────────

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export interface KeywordAnalysisStreamEntity {
  id: string;
  name?: string;
  campaign_id?: string;
  campaign_name?: string;
}

export interface KeywordAnalysisStreamRequest {
  component_id: string;
  analysis_kind: "add_keyword" | "add_negative_keyword";
  entity_type: string;
  entities: KeywordAnalysisStreamEntity[];
  date_range: { start_date: string; end_date: string };
  platform?: string;
  action_rule_id?: string;
  /** assistant.actions.id for Pixis persistence tool. */
  action_id?: number;
  seed_keywords?: string[];
  constraints?: Record<string, unknown>;
  /** Passed to Prism; merged into the Pixis keyword-analysis text prompt (not raw JSON). */
  guardrails?: Record<string, unknown>;
  prompt?: string;
  customer_id?: string;
  login_customer_id?: string;
}

export interface KeywordAnalysisStreamResult {
  session_id: string | null;
  full_message: string;
  /** Last parsed SSE JSON event (e.g. keyword_analysis_result). */
  terminal_event: Record<string, unknown> | null;
}

/**
 * Parse ```keyword-analysis ... ``` JSON from agent final message (Pixis contract).
 */
export function extractKeywordAnalysisBlock(fullMessage: string): unknown | null {
  const re = /```keyword-analysis\s*\n([\s\S]*?)\n```/;
  const m = fullMessage.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim()) as unknown;
  } catch {
    return null;
  }
}

/**
 * POST keyword-analysis stream; reads SSE until the connection closes.
 * Uses fetch + Bearer token (same as axios api) because EventSource cannot POST.
 */
export async function streamKeywordAnalysis(
  accountId: number,
  dashboardId: number,
  payload: KeywordAnalysisStreamRequest,
  options?: {
    onSseEvent?: (data: Record<string, unknown>) => void;
    signal?: AbortSignal;
  }
): Promise<KeywordAnalysisStreamResult> {
  const token = localStorage.getItem("accessToken");
  const workspaceId = getCurrentWorkspaceId();
  const url = `${API_BASE_URL}${API_BASE}/${accountId}/dashboards/${dashboardId}/actions/keyword-analysis/stream/?mode=run`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId != null ? { "X-Workspace-Id": String(workspaceId) } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
    signal: options?.signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = (await res.json()) as { error?: string; detail?: unknown };
      if (typeof errBody.error === "string") detail = errBody.error;
      else if (errBody.detail) detail = JSON.stringify(errBody.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";
  let sessionId: string | null = null;
  let terminalEvent: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const raw of parts) {
      const block = raw.trim();
      if (!block.startsWith("data:")) continue;
      const jsonStr = block.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const data = JSON.parse(jsonStr) as Record<string, unknown>;
        options?.onSseEvent?.(data);
        if (data.type === "keyword_analysis_result") {
          terminalEvent = data;
          if (typeof data.full_message === "string") {
            fullMessage = data.full_message;
          }
          if (data.session_id != null) {
            sessionId = String(data.session_id);
          }
        }
        if (data.type === "error") {
          const msg = typeof data.error === "string" ? data.error : "Stream error";
          throw new Error(msg);
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          continue;
        }
        throw e;
      }
    }
  }

  return { session_id: sessionId, full_message: fullMessage, terminal_event: terminalEvent };
}

/** Build stream payload from a preview proposal + widget context. */
export function buildKeywordAnalysisPayloadFromProposal(
  _component: DashboardComponent,
  componentId: string,
  proposal: ActionProposal,
  dateRange: { start_date: string; end_date: string }
): KeywordAnalysisStreamRequest {
  const rule = proposal.action_rule;
  const kind =
    rule.type === "add_keyword"
      ? "add_keyword"
      : rule.type === "add_negative_keyword"
        ? "add_negative_keyword"
        : null;
  if (!kind) {
    throw new Error("Not a keyword analysis action type");
  }

  const seen = new Set<string>();
  const entities: KeywordAnalysisStreamEntity[] = [];
  for (const ent of proposal.entities) {
    const id = String(ent.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    entities.push({
      id,
      name: ent.name || undefined,
    });
  }
  if (entities.length === 0) {
    throw new Error("No entities to analyze");
  }

  const params = rule.params as { keywords?: string[]; match_type?: string };
  const ruleExt = rule as ActionRule & {
    guardrails?: Record<string, unknown>;
    limit?: number;
  };
  const constraints: Record<string, unknown> = {};
  if (params?.match_type) constraints.match_type = params.match_type;
  if (ruleExt.guardrails?.max_keywords_per_action != null) {
    constraints.max_keywords_per_action = ruleExt.guardrails.max_keywords_per_action;
  }
  if (ruleExt.guardrails?.limit != null) {
    constraints.limit = ruleExt.guardrails.limit;
  } else if (ruleExt.limit != null) {
    constraints.limit = ruleExt.limit;
  }

  const payload: KeywordAnalysisStreamRequest = {
    component_id: componentId,
    analysis_kind: kind,
    entity_type: rule.entity_type,
    entities,
    date_range: dateRange,
    platform: rule.platform,
    action_rule_id: proposal.action_rule_id,
  };

  if (typeof rule.action_id === "number" && Number.isFinite(rule.action_id)) {
    payload.action_id = rule.action_id;
  }

  if (Array.isArray(params?.keywords) && params.keywords.length > 0) {
    payload.seed_keywords = params.keywords.map(String);
  }
  if (Object.keys(constraints).length > 0) {
    payload.constraints = constraints;
  }

  if (ruleExt.guardrails && Object.keys(ruleExt.guardrails).length > 0) {
    payload.guardrails = { ...ruleExt.guardrails };
  }

  return payload;
}
