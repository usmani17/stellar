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

export const strategiesService = {
  getStrategies: async (): Promise<Strategy[]> => {
    const response = await api.get<Strategy[] | { results: Strategy[] }>(
      "/strategies/"
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "results" in data) {
      return (data as { results: Strategy[] }).results ?? [];
    }
    return [];
  },

  getStrategy: async (id: number): Promise<Strategy> => {
    const response = await api.get<Strategy>(`/strategies/${id}/`);
    return response.data;
  },

  createStrategy: async (data: CreateStrategyData): Promise<Strategy> => {
    const response = await api.post<Strategy>("/strategies/", data);
    return response.data;
  },

  updateStrategy: async (
    id: number,
    data: Partial<CreateStrategyData>
  ): Promise<Strategy> => {
    const response = await api.patch<Strategy>(
      `/strategies/${id}/`,
      data
    );
    return response.data;
  },

  deleteStrategy: async (id: number): Promise<void> => {
    await api.delete(`/strategies/${id}/`);
  },
};
