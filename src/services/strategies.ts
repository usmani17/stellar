import api from "./api";

export interface StrategyAutomationPayload {
  entity: string;
  action: string;
  change_value?: number | null;
  change_unit?: string;
  change_cap?: number | null;
  conditions: Record<string, unknown>[];
  schedule_enabled?: boolean;
  schedule_frequency?: string | null;
  schedule_run_at?: string | null;
  schedule_run_days?: number[] | null;
}

export interface Strategy {
  id: number;
  name: string;
  goal: string;
  status: string;
  platform: string;
  max_change_per_day: string;
  max_change_per_week: string;
  min_data_window_days: number | null;
  min_spend_threshold: number | null;
  ignore_last_48_hours?: boolean;
  ignore_last_hours?: number | null;
  ignore_campaigns_created_in_last_days?: number | null;
  exclude_learning_campaigns: boolean;
  ignore_campaigns_in_last_7_days?: boolean;
  frequency: string;
  run_days: string;
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
  status?: string;
  platform?: string;
  max_change_per_day?: string;
  max_change_per_week?: string;
  min_data_window_days?: number | null;
  min_spend_threshold?: number | null;
  ignore_last_48_hours?: boolean;
  ignore_campaigns_in_last_7_days?: boolean;
  exclude_learning_campaigns?: boolean;
  frequency?: string;
  run_days?: string;
  run_at?: string | null;
  is_approved?: boolean;
  approval_layer?: string;
  /** Profile IDs (Brand/Integration/Profile selection). Stored in strategies_app_strategyprofile. */
  profile_ids?: number[];
  /** Automation tabs: entity, action, conditions (filters), schedule, etc. */
  automations?: StrategyAutomationPayload[];
}

export const strategiesService = {
  getStrategies: async (): Promise<Strategy[]> => {
    const response = await api.get<Strategy[] | { results: Strategy[] }>(
      "/accounts/strategies/"
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "results" in data) {
      return (data as { results: Strategy[] }).results ?? [];
    }
    return [];
  },

  getStrategy: async (id: number): Promise<Strategy> => {
    const response = await api.get<Strategy>(`/accounts/strategies/${id}/`);
    return response.data;
  },

  createStrategy: async (data: CreateStrategyData): Promise<Strategy> => {
    const response = await api.post<Strategy>("/accounts/strategies/", data);
    return response.data;
  },

  updateStrategy: async (
    id: number,
    data: Partial<CreateStrategyData>
  ): Promise<Strategy> => {
    const response = await api.patch<Strategy>(
      `/accounts/strategies/${id}/`,
      data
    );
    return response.data;
  },

  deleteStrategy: async (id: number): Promise<void> => {
    await api.delete(`/accounts/strategies/${id}/`);
  },
};

export interface Automation {
  id: number;
  strategy: number;
  entity: string;
  action: string;
  change_value: number | null;
  change_cap: number | null;
  conditions: string;
  created_at: string;
  updated_at: string;
}

export const automationsService = {
  getAutomations: async (strategyId: number): Promise<Automation[]> => {
    const response = await api.get<Automation[]>(
      `/accounts/strategies/${strategyId}/automations/`
    );
    return response.data;
  },
};
