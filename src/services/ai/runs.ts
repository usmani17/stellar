export interface ThreadRun {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  status: "pending" | "running" | "error" | "success" | "timeout" | "interrupted";
  metadata: RunMetadata;
  kwargs: Record<string, unknown>;
  multitask_strategy: string;
}
type StreamMode =
  | "values"
  | "updates"
  | "messages-tuple"
  | "debug"
  | "custom"
  | "events";
export interface RunStreamRequest {
  assistant_id: string;
  input: {
    messages?: Array<{
      role: string;
      content: string;
    }>;
    [key: string]: unknown;
  };
  checkpoint?: {
    thread_id?: string;
    checkpoint_ns?: string;
    checkpoint_id?: string;
    checkpoint_map?: Record<string, unknown>;
    [key: string]: unknown;
  };
  command?: {
    update?: unknown;
    resume?: unknown;
    goto?: {
      node?: string;
      input?: unknown;
    };
    [key: string]: unknown;
  };
  metadata?: RunMetadata;
  config?: {
    tags?: string[];
    recursion_limit?: number;
    configurable?: Record<string, unknown>;
    [key: string]: unknown;
  };
  context?: Record<string, unknown>;
  webhook?: string;
  interrupt_before?: string;
  interrupt_after?: string;
  stream_mode?: StreamMode[];
  stream_subgraphs?: boolean;
  stream_resumable?: boolean;
  on_disconnect?: "continue" | "stop";
  feedback_keys?: string[];
  multitask_strategy?: string;
  if_not_exists?: string;
  after_seconds?: number;
  checkpoint_during?: boolean;
  durability?: string;
}

export interface RunMetadata {
  user_id?: number;
  account_id?: number;
  channel_id?: number;
  auth_token?: string;
  [key: string]: unknown;
}

// Get AI agent base URL from environment variable
const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_AI_AGENT_BASE_URL environment variable is not set');
  }
  return baseUrl.replace(/\/$/, ''); // Remove trailing slash
};

export const runsService = {
 

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