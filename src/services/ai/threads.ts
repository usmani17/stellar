export interface ThreadCreateRequest {
  thread_id?: string;
  metadata?: ThreadMetaData;
  if_exists?: "raise" | "replace" | "do_nothing";
  ttl?: {
    strategy: "delete" | "archive";
    ttl: number;
  };
  supersteps?: Array<{
    updates: Array<{
      values: object[];
      command: {
        update?: any;
        resume?: any;
        goto?: {
          node: string;
          input?: any;
        };
      };
      as_node: string;
    }>;
  }>;
}

export interface ThreadSearchRequest {
  ids?: string[];
  metadata?: Record<string, unknown>;
  values?: Record<string, unknown>;
  status?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  select?: string[];
}


export interface CacheCreation {
  ephemeral_1h_input_tokens: number;
  ephemeral_5m_input_tokens: number;
}

export interface Usage {
  cache_creation?: CacheCreation;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  input_tokens: number;
  output_tokens: number;
  server_tool_use?: any;
  service_tier: string;
  inference_geo: string;
}

export interface ResponseMetadata {
  id: string;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: Usage;
  model_name: string;
}

export interface InputTokenDetails {
  cache_read: number;
  cache_creation: number;
  ephemeral_5m_input_tokens: number;
  ephemeral_1h_input_tokens: number;
}

export interface UsageMetadata {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_token_details: InputTokenDetails;
}

export interface ToolCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  type?: string;
  [key: string]: unknown;
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ContentBlock = TextContent | ToolUseContent | { [key: string]: unknown };

export type ThreadMessageContent =
  | string
  | ContentBlock[]
  | { [key: string]: unknown }
  | Array<{ [key: string]: unknown }>
  | Array<string>
  | Array<number>
  | Array<boolean>;

export interface ThreadMessage {
  id: string;
  type: "human" | "ai" | "tool" | "system";
  content: ThreadMessageContent;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: ResponseMetadata | Record<string, unknown>;
  name?: string | null;
  example?: boolean;
  tool_calls?: ToolCall[];
  invalid_tool_calls?: ToolCall[];
  usage_metadata?: UsageMetadata;
  tool_call_id?: string; // For tool response messages
  artifact?: null | unknown;
  status?: "success" | "error"; // For tool response messages
  [key: string]: unknown;
}

/** Normalize raw message content to string or ContentBlock[] for display (used by stream and history) */
export function normalizeMessageContent(content: ThreadMessageContent): string | ContentBlock[] {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) {
    return typeof (content as any).text === 'string' ? (content as any).text : '';
  }
  const blocks: ContentBlock[] = [];
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    if (part.type === 'text' && typeof (part as any).text === 'string') {
      blocks.push({ type: 'text', text: (part as any).text });
    } else if (part.type === 'tool_use' && (part as any).name) {
      blocks.push({
        type: 'tool_use',
        id: (part as any).id || `tool-${blocks.length}`,
        name: (part as any).name,
        input: typeof (part as any).input === 'object' ? (part as any).input : {},
      });
    }
  }
  return blocks.length ? blocks : '';
}

/** Normalize full AI message (content + tool_calls) so tool calls from message.tool_calls are included for display */
export function normalizeAIMessageToContent(msg: { content?: ThreadMessageContent; tool_calls?: ToolCall[] }): string | ContentBlock[] {
  const fromContent = normalizeMessageContent(msg.content ?? '');
  const toolCalls = msg.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return fromContent;
  }
  const toolBlocks: ContentBlock[] = toolCalls
    .filter((tc): tc is ToolCall => tc && typeof tc === 'object' && !!tc.name)
    .map((tc, i) => ({
      type: 'tool_use' as const,
      id: (tc.id as string) || `tool-${i}`,
      name: tc.name as string,
      input: (typeof tc.args === 'object' && tc.args != null ? tc.args : {}) as Record<string, unknown>,
    }));
  if (typeof fromContent === 'string') {
    return toolBlocks.length > 0 ? [...toolBlocks, { type: 'text' as const, text: fromContent }] : fromContent;
  }
  const contentBlocks = fromContent as ContentBlock[];
  return [...toolBlocks, ...contentBlocks];
}

/** Normalize a message from API/history so content is string or ContentBlock[] for consistent display */
export function normalizeThreadMessage(msg: ThreadMessage | { type?: string; content?: ThreadMessageContent; id?: string; tool_calls?: ToolCall[];[k: string]: unknown }): ThreadMessage {
  if (!msg || typeof msg !== 'object') return msg as ThreadMessage;
  const rawType = (msg as { type?: string }).type;
  const type = rawType === 'AIMessageChunk' ? 'ai' : (rawType ?? 'ai');
  const validTypes: Array<ThreadMessage['type']> = ['human', 'ai', 'tool', 'system'];
  const normalizedType = validTypes.includes(type as ThreadMessage['type']) ? (type as ThreadMessage['type']) : 'ai';

  const content = normalizedType === 'ai'
    ? normalizeAIMessageToContent({ content: (msg as { content?: ThreadMessageContent }).content, tool_calls: (msg as { tool_calls?: ToolCall[] }).tool_calls })
    : normalizeMessageContent((msg as { content?: ThreadMessageContent }).content ?? '');

  const base = msg as ThreadMessage;
  return {
    ...base,
    id: typeof base.id === 'string' ? base.id : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: normalizedType,
    content,
  };
}

/** Normalize messages array from history/API for consistent display with streamed messages */
export function normalizeThreadMessages(
  messages: Array<ThreadMessage | { type?: string; content?: ThreadMessageContent; id?: string;[k: string]: unknown }> | undefined
): ThreadMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.map(normalizeThreadMessage);
}

export interface ThreadContext {
  account_id?: string;
  channel_id?: string;
  advertiser_id?: string;
  user_id?: number;
  workspace_id?: string | null;
  folder_id?: string | null;
  session_id?: string | null;
  meta_account_id?: string;
  [key: string]: unknown;
}

export interface ThreadValues {
  messages: ThreadMessage[];
  context?: ThreadContext;
  intent?: string;
  router?: Record<string, unknown>;
  platforms?: string[];
  documents?: any[];
  clarification_question?: string;
  analysis?: string;
  export_datasets?: [string, string[], object[]][];
  [key: string]: unknown;
}

export interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: ThreadMetaData;
  config?: Record<string, unknown>;
  status: "idle" | "busy" | "interrupted" | "error";
  values?: ThreadValues;
  interrupts?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ContextMetadata {
  user_id?: number;
  account_id?: number;
  channel_id?: number;
  profile_id?: number;
  workspace_id?: number;
  folder_id?: number;
  session_id?: string;
  platform?: string;
  auth_token?: string;
  [key: string]: unknown;
}
export interface ThreadMetaData extends ContextMetadata {
  title?: string;
  assistant_id?: string;
  graph_id?: string;
}



export interface ThreadSearchResponse {
  threads: Thread[];
}

export interface ThreadHistoryTask {
  id: string;
  name: string;
  path: string[];
  error: any;
  interrupts: any[];
  checkpoint: any;
  state: any;
  result: any;
}

export interface ThreadHistoryCheckpoint {
  checkpoint_id: string;
  thread_id: string;
  checkpoint_ns: string;
}

export interface ThreadHistoryMetadata {
  graph_id: string;
  assistant_id: string;
  user_id: number;
  created_by: string;
  auth_token: string;
  title: string;
  run_attempt: number;
  langgraph_version: string;
  langgraph_api_version: string;
  langgraph_plan: string;
  langgraph_host: string;
  langgraph_api_url: string;
  run_id: string;
  thread_id: string;
  source: string;
  step: number;
  parents: Record<string, unknown>;
  langgraph_request_id: string;
  langgraph_auth_user_id: string;
}

export interface ThreadHistoryItem {
  values: ThreadValues;
  next: string[];
  tasks: ThreadHistoryTask[];
  metadata: ThreadHistoryMetadata;
  created_at: string;
  checkpoint: ThreadHistoryCheckpoint;
  parent_checkpoint: ThreadHistoryCheckpoint | null;
  interrupts: any[];
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
}


// Get AI agent base URL from environment variable
const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_AI_AGENT_BASE_URL environment variable is not set');
  }
  return baseUrl.replace(/\/$/, ''); // Remove trailing slash
};

export const threadsService = {
  createThread: async (params: ThreadCreateRequest): Promise<Thread> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.status}`);
    }

    return response.json() as Promise<Thread>;
  },

  searchThreads: async (params: ThreadSearchRequest): Promise<Thread[]> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to search threads: ${response.status}`);
    }

    return response.json() as Promise<Thread[]>;
  },

  getThreadHistory: async (
    threadId: string,
    body: Record<string, any> = { limit: 1000 }
  ): Promise<ThreadHistoryItem[]> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/${threadId}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to get thread history: ${response.status}`);
    }

    return response.json() as Promise<ThreadHistoryItem[]>;
  },

  getThread: async (threadId: string): Promise<Thread> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/${threadId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to get thread: ${response.status}`);
    }
    return response.json() as Promise<Thread>;
  },

  /** Update thread metadata (e.g. title) so it persists across reloads */
  updateThread: async (threadId: string, updates: { metadata?: Partial<ThreadMetaData> }): Promise<Thread> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/${threadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`Failed to update thread: ${response.status}`);
    }
    return response.json() as Promise<Thread>;
  },

  /** Delete a thread on the backend so it does not reappear after reload */
  deleteThread: async (threadId: string): Promise<void> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/${threadId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to delete thread: ${response.status}`);
    }
  },
};