export interface ThreadCreateRequest {
  thread_id?: string;
  metadata?: ThreadMetaData ;
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

export interface ThreadMetaData {
    user_id?: number;
    account_id?: number;
    channel_id?: number;
    auth_token?: string;
    title?: string;
    [key: string]: unknown;
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
};