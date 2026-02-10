/**
 * Agent-related types (LangGraph campaign_setup and connection).
 * UI-independent; no React imports.
 */

export interface AgentConnectionStatus {
  connected: boolean;
  error?: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

/** Schema for current questions (interview phase). */
export interface CurrentQuestionSchemaItem {
  key: string;
  type?: string;
  required?: boolean;
  label?: string;
  ui_hint?: string;
  [k: string]: unknown;
}

/**
 * Campaign setup state (mirrors backend CampaignSetupState).
 * Platform-agnostic; used by campaign_setup graph for Google, Amazon, etc.
 */
export interface CampaignSetupState {
  messages?: AgentMessage[] | Array<{ type?: string; content?: unknown; [k: string]: unknown }>;
  intent?: string;
  platform?: string;
  campaign_type?: string | null;
  documents?: Record<string, unknown>[];
  campaign_draft?: Record<string, unknown>;
  phase?: string;
  draft_plan?: string;
  draft_setup_json?: Record<string, unknown> | null;
  reply_text?: string;
  validation_errors?: string[];
  saved_draft_id?: string;
  current_questions_schema?: CurrentQuestionSchemaItem[];
  [k: string]: unknown;
}
