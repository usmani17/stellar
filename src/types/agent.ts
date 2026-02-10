/**
 * Campaign setup / interview state from the AI agent (e.g. stream.values.interview).
 */
export interface CampaignSetupState {
  messages?: unknown[];
  reply_text?: string;
  validation_errors?: string[];
  draft_setup_json?: Record<string, unknown>;
  campaign_draft?: Record<string, unknown>;
  current_questions_schema?: unknown[];
  phase?: string;
  intent?: string;
  saved_draft_id?: string;
  [key: string]: unknown;
}
