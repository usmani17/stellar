/**
 * One item in current_questions_schema: describes a single form field for the assistant.
 * Backend sends key, type, required, label, ui_hint, and optionally min, max, max_length, options, suggested_value.
 */
export interface CurrentQuestionSchemaItem {
  key: string;
  type: string;
  required?: boolean;
  label?: string;
  ui_hint: string;
  min?: number;
  max?: number;
  max_length?: number;
  options?: Array<{ value: string; label?: string }>;
  allowed_values?: string[];
  suggested_value?: unknown;
}

/**
 * Campaign setup / interview state from the AI agent (e.g. stream.values.interview).
 */
export interface CampaignSetupState {
  messages?: unknown[];
  reply_text?: string;
  validation_errors?: string[];
  draft_setup_json?: Record<string, unknown>;
  campaign_draft?: Record<string, unknown>;
  current_questions_schema?: string[];
  phase?: string;
  intent?: string;
  saved_draft_id?: string;
  [key: string]: unknown;
}
