import api from "./api";

/** List item - minimal fields from list endpoint (no draft_json, generation_prompt, ai_reasoning) */
export interface EntityDraftListItem {
  draft_id: string;
  name: string | null;
  platform: string | null;
  level: string | null;
  status: string;
  account_id: number | null;
  integration_id: number | null;
  profile_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  /** Resolved display names from API */
  account_name?: string | null;
  integration_name?: string | null;
  profile_name?: string | null;
  user_name?: string | null;
  /** Optional (lang_graph / demand gen) */
  channel_id?: number | null;
  google_profiles_id?: number | null;
  campaign_type?: string | null;
}

/** Full draft - detail endpoint (includes draft_json and all fields) */
export interface EntityDraft extends EntityDraftListItem {
  workspace_id: string | null;
  user_id: string | null;
  session_id: string | null;
  thread_id: string | null;
  draft_json: Record<string, unknown> | string;
  entity_id: string | null;
  generation_prompt: string | null;
  ai_reasoning: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  applied_entity_id: string | null;
  applied_at: string | null;
}

export interface EntityDraftsListResponse {
  drafts: EntityDraftListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EntityDraftsListParams {
  workspace_id?: string | number;
  session_id?: string;
  status?: string;
  account_id?: number;
  integration_id?: number;
  page?: number;
  page_size?: number;
  order_by?: string;
  order?: "asc" | "desc";
}

export interface EntityDraftsFilterOption {
  id: number;
  name: string;
}

export interface EntityDraftsFilterOptionsResponse {
  account_options: EntityDraftsFilterOption[];
  integration_options: EntityDraftsFilterOption[];
}

export const entitiesDraftsService = {
  list: async (
    params?: EntityDraftsListParams
  ): Promise<EntityDraftsListResponse> => {
    const response = await api.get<EntityDraftsListResponse>(
      "assistant/entities-drafts/",
      { params: params ?? {} }
    );
    return response.data;
  },

  getFilterOptions: async (workspaceId?: string): Promise<EntityDraftsFilterOptionsResponse> => {
    const response = await api.get<EntityDraftsFilterOptionsResponse>(
      "assistant/entities-drafts/filter-options/",
      { params: workspaceId ? { workspace_id: workspaceId } : {} }
    );
    return response.data;
  },

  getById: async (draftId: string): Promise<EntityDraft> => {
    const response = await api.get<EntityDraft>(
      `assistant/entities-drafts/${draftId}/`
    );
    return response.data;
  },
};
