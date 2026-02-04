export interface RunStreamRequest {
  assistant_id: string;
  input: {
    messages: Array<{
      role: string;
      content: string;
    }>;
  };
  metadata?: {
    user_id?: number;
    account_id?: number;
    channel_id?: number;
    auth_token?: string;
    [key: string]: unknown;
  };
  config?: {
    configurable?: Record<string, unknown>;
  };
  stream_mode?: string[];
}

export interface StreamCallbacks {
  onThinkingStep?: (steps: string[]) => void;
  onMessage?: (content: string, analysisText?: string, thinkingSteps?: string[], runId?: string) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onRunId?: (runId: string | null) => void;
}

// Helper functions for AI agent integration
const extractText = (content: any): string => {
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

const looksLikeUpdates = (data: any): boolean => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  // Known node names from your AI agent workflow
  const knownNodes = ['Router', 'Clarify', 'kb_retriever', 'Analyst', 'neon_tool', 'evidence_set', 'Planner', 'Validator', 'Narrator'];
  return keys.some(k => knownNodes.includes(k));
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
            const data = JSON.parse(line.slice(6));

            // Handle metadata events (run_id, attempt, etc.)
            if (currentEvent === 'metadata') {
              if (data.run_id) {
                runId = data.run_id;
                callbacks.onRunId?.(runId);
              }
              continue;
            }

            if (data.error) {
              const errorMsg = data.message || data.error || 'Unknown error';
              callbacks.onError?.(errorMsg);
              return;
            }

            const isUpdates = currentEvent === 'updates' ||
              (currentEvent !== 'values' && looksLikeUpdates(data));

            if (isUpdates && data && typeof data === 'object') {
              // Handle thinking steps updates from Router, Narrator, etc.
              Object.keys(data).forEach(nodeName => {
                if (!thinkingSteps.includes(nodeName)) {
                  thinkingSteps.push(nodeName);
                  callbacks.onThinkingStep?.([...thinkingSteps]);
                }
              });
            }

            if (currentEvent === 'values' || !isUpdates) {
              // Handle analysis text
              if (data.analysis !== undefined || data.corrected_analysis !== undefined) {
                const newAnalysisText = (data.corrected_analysis && data.corrected_analysis.trim())
                  ? data.corrected_analysis
                  : (data.analysis || '');
                if (newAnalysisText && newAnalysisText.trim()) {
                  analysisText = newAnalysisText.trim();
                }
              }

              // Handle messages - find the latest AI message
              if (data.messages && Array.isArray(data.messages)) {
                let aiMessage = null;
                // Look for the latest AI message in the array
                for (let j = data.messages.length - 1; j >= 0; j--) {
                  const msg = data.messages[j];
                  if (msg && msg.type === 'ai' && msg.content) {
                    aiMessage = msg;
                    break;
                  }
                }

                if (aiMessage) {
                  const messageContent = extractText(aiMessage.content);
                  if (messageContent && messageContent.trim()) {
                    callbacks.onMessage?.(
                      messageContent,
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
};