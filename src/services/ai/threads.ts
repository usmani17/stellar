export interface ThreadCreateRequest {
  thread_id?: string;
  metadata?: {
    user_id?: number;
    account_id?: number;
    channel_id?: number;
    auth_token?: string;
    title?: string;
    [key: string]: unknown;
  };
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

export interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  config?: Record<string, unknown>;
  status: "idle" | "busy" | "interrupted" | "error";
  values?: Record<string, unknown>;
  interrupts?: Record<string, unknown>;
}

export interface ThreadRun {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  status: "pending" | "running" | "error" | "success" | "timeout" | "interrupted";
  metadata: Record<string, unknown>;
  kwargs: Record<string, unknown>;
  multitask_strategy: string;
}

export interface ThreadSearchResponse {
  threads: Thread[];
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

    return response.json();
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

    return response.json();
  },

  getThreadRuns: async (threadId: string): Promise<ThreadRun[]> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/${threadId}/runs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get thread runs: ${response.status}`);
    }

    return response.json();
  },
};