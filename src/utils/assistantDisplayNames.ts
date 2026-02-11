/**
 * Human-readable display names for LangGraph nodes and tools.
 * Used in AssistantPanel (thinking steps) and ToolUseBlock (tool calls).
 */

const NODE_DISPLAY_NAMES: Record<string, string> = {
  intent_router: "Understanding Your Request",
  respond: "Responding",
  load_kb: "Loading Knowledge Base",
  interview: "Collecting Campaign Details",
  build_draft: "Building Draft",
  output_plan: "Preparing Summary",
  save_draft: "Saving Draft",
  // Schema class names from structured outputs (can appear as node/tool names)
  IntentRouterSchema: "Understanding Your Request",
  Intentrouterschema: "Understanding Your Request",
  intent_router_schema: "Understanding Your Request",
  BuildDraftSchema: "Building Draft Plan",
  Builddraftschema: "Building Draft Plan",
  build_draft_schema: "Building Draft Plan",
};

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  set_questions_for_this_turn: "Setting Questions",
  validate_campaign_slots: "Validating Campaign Details",
  provide_suggestions: "Providing Suggestions",
  // Schema class names from structured outputs
  IntentRouterSchema: "Understanding Your Request",
  Intentrouterschema: "Understanding Your Request",
  intent_router_schema: "Understanding Your Request",
  BuildDraftSchema: "Building Draft Plan",
  Builddraftschema: "Building Draft Plan",
  build_draft_schema: "Building Draft Plan",
};

/** Format unknown IDs: intent_router → "Intent Router" */
function formatFallback(id: string): string {
  const acronyms: Record<string, string> = { kb: "KB" };
  return id
    .split("_")
    .map((w) => acronyms[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Get human-readable display name for a node or tool ID.
 * Falls back to formatted ID if not in the mapping.
 */
export function getDisplayName(id: string, type: "node" | "tool"): string {
  const map = type === "node" ? NODE_DISPLAY_NAMES : TOOL_DISPLAY_NAMES;
  return map[id] ?? formatFallback(id);
}
