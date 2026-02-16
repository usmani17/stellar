/**
 * Assistant drafts service - fetches cur_session_drafts from Pixis AI agent.
 * Used when loading session history to restore campaign form state (history only has plain-text final_message).
 * Uses VITE_AI_AGENT_BASE_URL (same as sessions API).
 */

import type { CampaignSetupState } from "../../types/agent";
import { getFieldLabel } from "../../components/ai/campaignFormFieldLabels";

const AI_AGENT_BASE =
  import.meta.env.VITE_AI_AGENT_BASE_URL || "http://localhost:8000";

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
  /** True for the current active (in_progress) draft when listing all drafts. */
  is_active?: boolean;
}

export async function getSessionDrafts(
  sessionDbId: string,
  accessToken: string
): Promise<AssistantDraft[]> {
  const res = await fetch(
    `${AI_AGENT_BASE}/sessions/${encodeURIComponent(sessionDbId)}/drafts`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drafts fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Get the current active (in_progress) draft for a session. Returns null if none. */
export async function getSessionActiveDraft(
  sessionDbId: string,
  accessToken: string
): Promise<AssistantDraft | null> {
  const res = await fetch(
    `${AI_AGENT_BASE}/sessions/${encodeURIComponent(sessionDbId)}/drafts/active`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Active draft fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data ?? null;
}

/** Get the active draft from a list (one with is_active: true), or the latest in_progress by draft_index. */
export function getActiveDraftFromList(drafts: AssistantDraft[]): AssistantDraft | undefined {
  const byFlag = drafts.find((d) => d.is_active);
  if (byFlag) return byFlag;
  return drafts
    .filter((d) => d.status === "in_progress")
    .sort((a, b) => (b.draft_index ?? 0) - (a.draft_index ?? 0))[0];
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
