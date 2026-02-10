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

import type { CampaignSetupState } from "../../types/agent";

export interface StreamCallbacks {
  onThinkingStep?: (steps: string[]) => void;
  onMessage?: (content: string, analysisText?: string, thinkingSteps?: string[], runId?: string) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onRunId?: (runId: string | null) => void;
  /** Called when values event contains campaign_setup state (intent, phase, etc.) */
  onCampaignSetupState?: (state: CampaignSetupState) => void;
}

// Helper functions for AI agent integration
const extractText = (content: any): string => {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && part.text) return part.text;
      return '';
    }).filter(Boolean).join('');
  }
  return '';
};

/** Get display text from any message object (LangChain serialized or plain). */
const getMessageContent = (msg: any): string => {
  if (!msg || typeof msg !== 'object') return '';
  const raw = msg.content ?? msg.kwargs?.content ?? msg.data?.content;
  return extractText(raw);
};

/** True if message is from the assistant (LangChain AIMessage / ai / AIMessageChunk or id array). */
const isAIMessage = (msg: any): boolean => {
  if (!msg || typeof msg !== 'object') return false;
  const type = msg.type ?? (Array.isArray(msg.id) ? msg.id[msg.id.length - 1] : null);
  return type === 'ai' || type === 'AIMessage' || type === 'AIMessageChunk';
};

const looksLikeUpdates = (data: any): boolean => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  // Chat graph + campaign_setup graph node names
  const knownNodes = [
    'Router', 'Clarify', 'kb_retriever', 'Analyst', 'neon_tool', 'evidence_set', 'Planner', 'Validator', 'Narrator',
    'intent_router', 'respond', 'load_kb', 'interview', 'build_draft', 'output_plan', 'save_draft',
  ];
  return keys.some(k => knownNodes.includes(k));
};

/** LangGraph metadata object (second element in messages event) - not a message */
const isLangGraphMetadata = (obj: any): boolean => {
  return obj && typeof obj === 'object' && !Array.isArray(obj) &&
    (obj.langgraph_node != null || obj.created_by != null || obj.langgraph_step != null);
};

/** Extract displayable text from a stream message chunk (AIMessageChunk) */
const extractChunkText = (chunk: any): string => {
  const content = chunk?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part && part.type === 'text' && part.text != null)
      .map((part: any) => part.text)
      .join('');
  }
  return '';
};

// Get AI agent base URL from environment variable
const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_AI_AGENT_BASE_URL environment variable is not set');
  }
  return baseUrl.replace(/\/$/, ''); // Remove trailing slash
};

export const runsService = {
  streamRun: async (threadId: string, params: RunStreamRequest, callbacks: StreamCallbacks): Promise<void> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/threads/${threadId}/runs/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No stream reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: any = null;
    let analysisText = '';
    let thinkingSteps: string[] = [];
    let runId: string | null = null;
    /** Accumulated text from event: messages chunks for the current run */
    let streamedContent = '';

    callbacks.onLoadingChange?.(false); // Switch from loading to streaming

    const processChunk = async (): Promise<void> => {
      const chunk = await reader.read();
      if (chunk.done) return;

      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith('data: ')) {
          try {
            const rawData = line.slice(6);
            if (rawData === '[DONE]' || rawData.trim() === '') {
              currentEvent = null;
              continue;
            }
            const data = JSON.parse(rawData);

            // Handle metadata events (run_id, attempt, etc.)
            if (currentEvent === 'metadata') {
              if (data.run_id) {
                runId = data.run_id;
                callbacks.onRunId?.(runId);
              }
              streamedContent = ''; // Reset accumulator for new run
              continue;
            }

            if (data.error) {
              const errorMsg = data.message || data.error || 'Unknown error';
              callbacks.onError?.(errorMsg);
              return;
            }

            // event: messages — data is [messageChunk, langgraphMetadata?]
            // Only the first element is the message; second is metadata (langgraph_node, etc.)
            if (currentEvent === 'messages' && Array.isArray(data)) {
              const messageChunk = data[0];
              if (messageChunk && !isLangGraphMetadata(messageChunk)) {
                const isAiChunk = messageChunk.type === 'AIMessageChunk' || messageChunk.type === 'ai';
                if (isAiChunk) {
                  const text = extractChunkText(messageChunk);
                  if (text) {
                    streamedContent += text;
                    callbacks.onMessage?.(
                      streamedContent,
                      analysisText || undefined,
                      thinkingSteps.length > 0 ? [...thinkingSteps] : undefined,
                      runId || undefined
                    );
                  }
                }
              }
              currentEvent = null;
              continue;
            }

            const isUpdates = currentEvent === 'updates' ||
              (currentEvent !== 'values' && typeof data === 'object' && !Array.isArray(data) && looksLikeUpdates(data));

            if (isUpdates && data && typeof data === 'object') {
              // Handle thinking steps updates from Router, Narrator, etc.
              Object.keys(data).forEach(nodeName => {
                if (!thinkingSteps.includes(nodeName)) {
                  thinkingSteps.push(nodeName);
                  callbacks.onThinkingStep?.([...thinkingSteps]);
                }
              });
            }

            if (currentEvent === 'values' || (currentEvent !== 'messages' && !isUpdates)) {
              // Campaign setup state: only on values event
              if (currentEvent === 'values') {
                const campaignSetupKeys = ['intent', 'phase', 'campaign_draft', 'reply_text', 'validation_errors', 'current_questions_schema', 'draft_plan', 'draft_setup_json', 'saved_draft_id', 'platform', 'campaign_type', 'messages'];
                const hasCampaignSetupState = campaignSetupKeys.some(k => data[k] !== undefined);
                if (hasCampaignSetupState && callbacks.onCampaignSetupState) {
                  const state: CampaignSetupState = {
                    messages: data.messages,
                    intent: data.intent,
                    platform: data.platform,
                    campaign_type: data.campaign_type,
                    documents: data.documents,
                    campaign_draft: data.campaign_draft,
                    phase: data.phase,
                    draft_plan: data.draft_plan,
                    draft_setup_json: data.draft_setup_json,
                    reply_text: data.reply_text,
                    validation_errors: data.validation_errors,
                    saved_draft_id: data.saved_draft_id,
                    current_questions_schema: data.current_questions_schema,
                  };
                  callbacks.onCampaignSetupState(state);
                  // Ensure UI gets the latest assistant reply (reply_text is the single source from agent)
                  const replyText = (data.reply_text ?? '').trim();
                  if (replyText && callbacks.onMessage) {
                    streamedContent = replyText;
                    callbacks.onMessage(
                      streamedContent,
                      analysisText || undefined,
                      thinkingSteps.length > 0 ? [...thinkingSteps] : undefined,
                      runId || undefined
                    );
                  }
                }
              }

              // Handle analysis text
              if (data.analysis !== undefined || data.corrected_analysis !== undefined) {
                const newAnalysisText = (data.corrected_analysis && data.corrected_analysis.trim())
                  ? data.corrected_analysis
                  : (data.analysis || '');
                if (newAnalysisText && newAnalysisText.trim()) {
                  analysisText = newAnalysisText.trim();
                }
              }

              // Handle values/state messages (e.g. final state with data.messages) — support LangChain serialized format
              if (data.messages && Array.isArray(data.messages)) {
                let aiMessage = null;
                for (let j = data.messages.length - 1; j >= 0; j--) {
                  const msg = data.messages[j];
                  if (msg && !isLangGraphMetadata(msg) && isAIMessage(msg)) {
                    aiMessage = msg;
                    break;
                  }
                }

                if (aiMessage) {
                  const messageContent = getMessageContent(aiMessage).trim();
                  if (messageContent) {
                    streamedContent = messageContent;
                    callbacks.onMessage?.(
                      streamedContent,
                      analysisText || undefined,
                      thinkingSteps.length > 0 ? [...thinkingSteps] : undefined,
                      runId || undefined
                    );
                  }
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
          currentEvent = null;
        }
      }

      return processChunk();
    };

    await processChunk();
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

  cancelRun: async (
    threadId: string,
    runId: string,
    options?: { wait?: boolean; action?: 'interrupt' | 'rollback' }
  ): Promise<ThreadRun> => {
    const baseUrl = getBaseUrl();
    const params = new URLSearchParams();

    if (options?.wait !== undefined) {
      params.append('wait', String(options.wait));
    }
    if (options?.action) {
      params.append('action', options.action);
    }

    const queryString = params.toString();
    const url = `${baseUrl}/threads/${threadId}/runs/${runId}/cancel${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel run: ${response.status}`);
    }

    return response.json();
  },
};