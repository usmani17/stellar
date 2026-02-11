// Assistant service for interacting with the AI agent's assistant search API
// See runs.ts for structure and error handling patterns
/*
curl http://127.0.0.1:2024/assistants/fe7a7d02-1d8e-582e-9564-a6d074386802/schemas
{
  "graph_id": "chat",
  "input_schema": {},
  "output_schema": {},
  "state_schema": {},
  "config_schema": {},
  "context_schema": {}
}
*/

export type GraphId = "chat" | "campaign_setup";

/**
 * Resolve assistant_id for a graph. Uses search results when available; falls back to graph name (LangGraph convention).
 */
export function getAssistantIdForGraph(
	assistants: AssistantSearchResult[],
	graphId: GraphId
): string {
	const found = assistants.find((a) => a.graph_id === graphId);
	return found?.assistant_id ?? graphId;
}

interface AssistantSearchParams {
	metadata?: Record<string, unknown>;
	graph_id?: GraphId;
	name?: string;
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
	select?: string[];
}

export interface AssistantSearchResult {
	assistant_id: string;
	graph_id: GraphId;
	config: {
		tags: string[];
		recursion_limit: number;
		configurable: Record<string, unknown>;
	};
	context: Record<string, unknown>;
	created_at: string;
	updated_at: string;
	metadata: Record<string, unknown>;
	version: number;
	name: string;
	description: string | null;
}

const getBaseUrl = (): string => {
	const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
	if (!baseUrl) {
		throw new Error('VITE_AI_AGENT_BASE_URL environment variable is not set');
	}
	return baseUrl.replace(/\/$/, '');
};

export interface AssistantSchemas {
	graph_id: GraphId;
	input_schema: Record<string, unknown>;
	output_schema: Record<string, unknown>;
	state_schema: Record<string, unknown>;
	config_schema: Record<string, unknown>;
	context_schema: Record<string, unknown>;
}

export const assistantService = {
	/**
	 * Search for assistants using the AI agent API
	 */
	search: async (params: AssistantSearchParams): Promise<AssistantSearchResult[]> => {
		const baseUrl = getBaseUrl();
		const response = await fetch(`${baseUrl}/assistants/search`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(params),
		});
		if (!response.ok) {
			throw new Error(`Assistant search failed: ${response.status}`);
		}
		return response.json();
	},

	/**
	 * Fetch schemas for a specific assistant by assistant_id
	 */
	getSchemas: async (assistantId: string): Promise<AssistantSchemas> => {
		const baseUrl = getBaseUrl();
		const response = await fetch(`${baseUrl}/assistants/${assistantId}/schemas`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch assistant schemas: ${response.status}`);
		}
		return response.json();
	},
};
