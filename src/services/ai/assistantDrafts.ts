/**
 * Assistant drafts service - fetches cur_session_drafts from Pixis AI agent.
 * Used when loading session history to restore campaign form state (history only has plain-text final_message).
 * Uses VITE_AI_AGENT_BASE_URL (same as sessions API).
 */

import type { CampaignDraftData } from "./pixisChat";

const AI_AGENT_BASE =
  import.meta.env.VITE_AI_AGENT_BASE_URL || "http://localhost:8000";

export interface AssistantDraft {
  id: string;
  session_db_id: string;
  draft_index: number;
  entity_draft_id?: string | null;
  platform?: string | null;
  campaign_type?: string | null;
  /** Array of keys, or object like { campaign: { name, budget_amount, ... } } from API */
  current_question_keys?: string[] | Record<string, Record<string, unknown>> | null;
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

/** Flatten current_question_keys to string[] — API returns array or object { entity: { key: type } }. */
function toFlatKeys(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === "string");
  if (val && typeof val === "object") {
    const keys: string[] = [];
    for (const v of Object.values(val)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        keys.push(...Object.keys(v));
      }
    }
    return keys;
  }
  return [];
}

/**
 * Convert the latest in-progress draft to CampaignDraftData for form display.
 */
export function draftToCampaignState(draft: AssistantDraft): CampaignDraftData {
  const keys = toFlatKeys(draft.current_question_keys);
  const draftState = draft.current_draft_state ?? {};

  const validation_errors = draft.validation_error
    ? [draft.validation_error]
    : undefined;

  return {
    draft_id: draft.id,
    platform: draft.platform ?? "",
    campaign_type: draft.campaign_type ?? "",
    complete: draft.status === "completed",
    draft: draftState,
    questions: {},
    keys_for_form: keys,
    validation_error: validation_errors ? validation_errors.join("; ") : null,
  };
}
