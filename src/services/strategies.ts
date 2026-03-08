import api from "./api";

export interface StrategyAutomationPayload {
  id?: number;
  entity: string;
  action: string;
  change_value?: number | null;
  change_unit?: string;
  change_cap?: number | null;
  max_entity_delta?: number | null;
  /** Backend may return parsed array or JSON string. */
  conditions: Record<string, unknown>[] | string;
  sort_order?: number;
  schedule_enabled?: boolean;
  schedule_frequency?: string | null;
  schedule_run_at?: string | null;
  schedule_run_days?: number[] | string | null;
}

export interface Strategy {
  id: number;
  name: string;
  goal: string;
  status: string;
  platform: string;
  /** Backend may return number; form uses string. */
  max_change_per_day: string | number;
  max_change_per_week: string | number;
  /** Unit for max_change_per_day: "percent" | "absolute" */
  max_change_per_day_unit?: string | null;
  /** Unit for max_change_per_week: "percent" | "absolute" */
  max_change_per_week_unit?: string | null;
  min_budget_floor?: number | null;
  max_budget_cap?: number | null;
  min_execution_cap?: number | null;
  max_execution_cap?: number | null;
  min_data_window_days: number | null;
  min_spend_threshold: number | null;
  /** Backend sends ignore_last_hours (e.g. 48). Optional legacy for UI. */
  ignore_last_48_hours?: boolean;
  ignore_last_hours?: number | null;
  ignore_campaigns_created_in_last_days?: number | null;
  exclude_learning_campaigns: boolean;
  /** Legacy; backend uses ignore_campaigns_created_in_last_days (e.g. 7). */
  ignore_campaigns_in_last_7_days?: boolean;
  frequency: string;
  /** Backend may return number[] or JSON array string e.g. "[0,1,2,3,4]". */
  run_days: number[] | string;
  run_at: string | null;
  is_approved: boolean;
  approval_layer: string;
  last_run: string | null;
  /** True while a run is in progress (manual or scheduled). */
  is_running?: boolean;
  created_at: string;
  updated_at: string;
  profile_ids: number[];
  automations?: StrategyAutomationPayload[];
}

export interface CreateStrategyData {
  name: string;
  goal?: string;
  /** Backend: active | paused | archived */
  status?: string;
  /** Backend: google | amazon | meta | tiktok | walmart (required on create) */
  platform?: string;
  max_change_per_day?: string;
  max_change_per_week?: string;
  /** "percent" | "absolute" */
  max_change_per_day_unit?: string;
  /** "percent" | "absolute" */
  max_change_per_week_unit?: string;
  min_budget_floor?: number | null;
  max_budget_cap?: number | null;
  min_execution_cap?: number | null;
  max_execution_cap?: number | null;
  min_data_window_days?: number | null;
  min_spend_threshold?: number | null;
  /** Backend: int (e.g. 48). Sent instead of ignore_last_48_hours. */
  ignore_last_hours?: number | null;
  /** Backend: int (e.g. 7). Sent instead of ignore_campaigns_in_last_7_days. */
  ignore_campaigns_created_in_last_days?: number | null;
  exclude_learning_campaigns?: boolean;
  frequency?: string;
  /** Backend: list[int] weekdays (0=Mon..6=Sun) */
  run_days?: number[];
  run_at?: string | null;
  is_approved?: boolean;
  approval_layer?: string;
  profile_ids?: number[];
  automations?: StrategyAutomationPayload[];
}

export interface StrategiesPaginatedResponse {
  count: number;
  total_pages: number;
  results: Strategy[];
}

/** One automation run (from run history API). */
export interface AutomationRunHistoryItem {
  id: number;
  automation_id: number | null;
  automation_name: string | null;
  execution_run_at: string | null;
  number_of_changes: number | null;
  total_change_amount: number | string | null;
  total_change_amount_percentage: number | string | null;
  execution_time_ms: number | null;
  portfolio_value_before: number | string | null;
  portfolio_value_after: number | string | null;
  skipped: number;
  skipped_reason: string;
  guardrail_triggered: boolean;
  triggered_by: string;
}

export interface StrategyRunsResponse {
  count: number;
  total_pages: number;
  page: number;
  page_size: number;
  results: AutomationRunHistoryItem[];
}

/** Response from POST /strategies/:id/runs/ (trigger run). */
export interface StrategyRunTriggerResponse {
  status: string;
  message: string;
  strategy_id: number;
}

/** One row in automation preview (entity, column, old value, new value). */
export interface AutomationPreviewRow {
  entity_name: string;
  column: string;
  old_value: string;
  new_value: string;
}

/** Row for entities skipped in preview because old value = new value */
export interface AutomationPreviewSkippedUnchangedRow {
  entity_name: string;
  column: string;
  old_value: string;
  new_value: string;
  reason: string;
}

/** Response from GET /strategies/:id/automations/:automationId/preview/ */
export interface AutomationPreviewResponse {
  results: AutomationPreviewRow[];
  summary: string;
  skipped_unchanged?: AutomationPreviewSkippedUnchangedRow[];
}

export const strategiesService = {
  getStrategies: async (): Promise<Strategy[]> => {
    const response = await api.get<Strategy[] | { results: Strategy[] }>(
      "/strategies/",
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "results" in data) {
      return (data as { results: Strategy[] }).results ?? [];
    }
    return [];
  },

  getStrategiesPaginated: async (params: {
    page: number;
    page_size: number;
    search?: string;
  }): Promise<StrategiesPaginatedResponse> => {
    const queryParams: Record<string, string | number> = {
      page: params.page,
      page_size: params.page_size,
    };
    if (params.search != null && params.search.trim() !== "") {
      queryParams.search = params.search.trim();
    }
    const response = await api.get<StrategiesPaginatedResponse>(
      "/strategies/",
      {
        params: queryParams,
      },
    );
    const data = response.data;
    if (
      data &&
      typeof data === "object" &&
      "results" in data &&
      "count" in data &&
      "total_pages" in data
    ) {
      return data as StrategiesPaginatedResponse;
    }
    return { count: 0, total_pages: 1, results: [] };
  },

  getStrategy: async (id: number): Promise<Strategy> => {
    const response = await api.get<Strategy>(`/strategies/${id}/`);
    return response.data;
  },

  /** Preview automation result (no run). Returns entity, column, old/new value rows. */
  getAutomationPreview: async (
    strategyId: number,
    automationId: number,
  ): Promise<AutomationPreviewResponse> => {
    const response = await api.get<AutomationPreviewResponse>(
      `/strategies/${strategyId}/automations/${automationId}/preview/`,
    );
    return response.data;
  },

  getStrategyRuns: async (
    strategyId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<StrategyRunsResponse> => {
    const response = await api.get<StrategyRunsResponse>(
      `/strategies/${strategyId}/runs/`,
      { params: params ?? {} },
    );
    const data = response.data;
    if (
      data &&
      typeof data === "object" &&
      "results" in data &&
      "count" in data &&
      "total_pages" in data
    ) {
      return data as StrategyRunsResponse;
    }
    return {
      count: 0,
      total_pages: 1,
      page: 1,
      page_size: params?.page_size ?? 20,
      results: [],
    };
  },

  /** Trigger a strategy run (Run button). Pass automationIds to run only those automations. Returns 202; run executes async. */
  runStrategy: async (
    strategyId: number,
    automationIds?: number[],
  ): Promise<StrategyRunTriggerResponse> => {
    const response = await api.post<StrategyRunTriggerResponse>(
      `/strategies/${strategyId}/runs/`,
      automationIds?.length ? { automation_ids: automationIds } : {},
    );
    return response.data;
  },

  createStrategy: async (data: CreateStrategyData): Promise<Strategy> => {
    const response = await api.post<Strategy>("/strategies/", data);
    return response.data;
  },

  updateStrategy: async (
    id: number,
    data: Partial<CreateStrategyData>,
  ): Promise<Strategy> => {
    const response = await api.patch<Strategy>(`/strategies/${id}/`, data);
    return response.data;
  },

  deleteStrategy: async (id: number): Promise<void> => {
    await api.delete(`/strategies/${id}/`);
  },

  /**
   * Duplicate a strategy: fetches full strategy then creates a new one with
   * name "Copy of {name}", status Paused, and same settings/automations/profile_ids.
   */
  duplicateStrategy: async (sourceId: number): Promise<Strategy> => {
    const source = await api
      .get<Strategy>(`/strategies/${sourceId}/`)
      .then((r) => r.data);
    const automations = (source.automations ?? []).map((a) => {
      let conditions: Record<string, unknown>[] = [];
      if (Array.isArray(a.conditions)) {
        conditions = a.conditions;
      } else if (typeof a.conditions === "string" && a.conditions.trim()) {
        try {
          const parsed = JSON.parse(a.conditions) as unknown;
          conditions = Array.isArray(parsed) ? parsed : [];
        } catch {
          conditions = [];
        }
      }
      return {
        entity: a.entity,
        action: a.action,
        change_value: a.change_value ?? null,
        change_unit: a.change_unit ?? "percent",
        change_cap: a.change_cap ?? null,
        conditions,
        schedule_enabled: a.schedule_enabled ?? false,
        schedule_frequency: a.schedule_frequency ?? undefined,
        schedule_run_at: a.schedule_run_at ?? undefined,
        schedule_run_days: Array.isArray(a.schedule_run_days)
          ? a.schedule_run_days
          : undefined,
      };
    });
    const payload: CreateStrategyData = {
      name: `Copy of ${source.name || "Strategy"}`,
      goal: source.goal,
      status: "paused",
      platform: source.platform,
      max_change_per_day: String(source.max_change_per_day ?? ""),
      max_change_per_week: String(source.max_change_per_week ?? ""),
      min_budget_floor: source.min_budget_floor ?? undefined,
      max_budget_cap: source.max_budget_cap ?? undefined,
      min_execution_cap: source.min_execution_cap ?? undefined,
      max_execution_cap: source.max_execution_cap ?? undefined,
      min_data_window_days: source.min_data_window_days ?? undefined,
      min_spend_threshold: source.min_spend_threshold ?? undefined,
      ignore_last_hours: source.ignore_last_hours ?? undefined,
      ignore_campaigns_created_in_last_days:
        source.ignore_campaigns_created_in_last_days ?? undefined,
      exclude_learning_campaigns: source.exclude_learning_campaigns,
      frequency: source.frequency,
      run_days: Array.isArray(source.run_days) ? source.run_days : undefined,
      run_at: source.run_at ?? undefined,
      is_approved: source.is_approved,
      approval_layer: source.approval_layer,
      profile_ids: source.profile_ids?.length ? source.profile_ids : undefined,
      automations,
    };
    // Backend only accepts status: enabled | paused | archived (no "Draft")
    payload.status = "paused";
    const created = await api
      .post<Strategy>("/strategies/", payload)
      .then((r) => r.data);
    return created;
  },
};
