/**
 * Assistant drafts service - fetches cur_session_drafts from stellar-backend.
 * Used when loading session history to restore campaign form state (history only has plain-text final_message).
 */

import type { CampaignSetupState } from "../../types/agent";
import { getFieldLabel } from "../../components/ai/campaignFormFieldLabels";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export interface AssistantDraft {
  id: string;
  session_db_id: string;
  draft_index: number;
  entity_draft_id?: string | null;
  platform?: string | null;
  campaign_type?: string | null;
  current_question_keys?: string[] | null;
  validation_error?: string | null;
  current_draft_state?: Record<string, unknown> | null;
  account_id?: number | null;
  channel_id?: number | null;
  profile_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function getSessionDrafts(
  sessionDbId: string,
  accessToken: string
): Promise<AssistantDraft[]> {
  const res = await fetch(
    `${API_BASE}/assistant/drafts?session_db_id=${encodeURIComponent(sessionDbId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drafts fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Convert the latest in-progress draft to CampaignSetupState for form display.
 */
export function draftToCampaignState(draft: AssistantDraft): CampaignSetupState {
  const keys = draft.current_question_keys ?? [];
  const draftState = draft.current_draft_state ?? {};
  const current_questions_schema = keys.map((key) => ({
    key,
    label: getFieldLabel(key),
    type: "string",
    ui_hint: "text",
  }));

  const validation_errors = draft.validation_error
    ? [draft.validation_error]
    : undefined;

  return {
    campaign_type: draft.campaign_type ?? undefined,
    campaign_draft: Object.keys(draftState).length > 0 ? draftState : undefined,
    draft_setup_json:
      Object.keys(draftState).length > 0 ? draftState : undefined,
    current_questions_schema:
      current_questions_schema.length > 0 ? current_questions_schema : undefined,
    validation_errors,
    saved_draft_id: draft.entity_draft_id ?? undefined,
  };
}
