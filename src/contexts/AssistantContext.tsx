import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  analysisText?: string;
  thinkingSteps?: string[];
  isError?: boolean;
}

export interface SuggestedPrompt {
  id: string;
  text: string;
}

interface AssistantContextType {
  isOpen: boolean;
  toggleAssistant: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  messages: Message[];
  addMessage: (role: "user" | "assistant", content: string) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
  suggestedPrompts: SuggestedPrompt[];
  currentThinkingSteps: string[];
  isStreaming: boolean;
}

const AssistantContext = createContext<AssistantContextType | undefined>(
  undefined
);

const DEFAULT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "1", text: "Why is my ROAS dropping?" },
  { id: "2", text: "Suggest budget optimization" },
  { id: "3", text: "Analyze ACOS trends" },
  { id: "4", text: "Compare campaign efficiency" },
];

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

export const AssistantProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentThinkingSteps, setCurrentThinkingSteps] = useState<string[]>([]);
  const [suggestedPrompts] = useState<SuggestedPrompt[]>(
    DEFAULT_SUGGESTED_PROMPTS
  );

  // Get AI agent base URL from environment variable
  const getBaseUrl = (): string => {
    const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_AI_AGENT_BASE_URL environment variable is not set');
    }
    return baseUrl.replace(/\/$/, ''); // Remove trailing slash
  };

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      addMessage("user", content);
      setInputValue("");
      setIsLoading(true);
      setIsStreaming(true);
      setCurrentThinkingSteps([]);

      try {
        const baseUrl = getBaseUrl();

        // Create thread
        const threadResponse = await fetch(`${baseUrl}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        if (!threadResponse.ok) {
          throw new Error(`Failed to create thread: ${threadResponse.status}`);
        }

        const threadData = await threadResponse.json();
        const threadId = threadData.thread_id;

        // Start streaming
        const streamResponse = await fetch(`${baseUrl}/threads/${threadId}/runs/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistant_id: 'chat',
            input: { messages: [{ role: 'user', content }]},
            metadata : {
              account_id: accountId ? parseInt(accountId) : undefined, 
              channel_id: channelId ? parseInt(channelId) : undefined,
              auth_token: '123123123'
            },
            config: { configurable: {} },
            stream_mode: ['values', 'updates']
          })
        });

        if (!streamResponse.ok) {
          throw new Error(`Stream failed: ${streamResponse.status}`);
        }

        const reader = streamResponse.body?.getReader();
        if (!reader) {
          throw new Error('No stream reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent : any = null;
        let currentAssistantMessage: Message | null = null;
        let analysisText = '';
        let thinkingSteps: string[] = [];
        let runId: string | null = null;

        setIsLoading(false); // Switch from loading to streaming

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
                  }
                  continue;
                }
                
                if (data.error) {
                  const errorMsg = data.message || data.error || 'Unknown error';
                  addMessage("assistant", errorMsg);
                  setMessages(prev => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                      updated[updated.length - 1].isError = true;
                    }
                    return updated;
                  });
                  return;
                }

                const isUpdates = currentEvent === 'updates' || 
                  (currentEvent !== 'values' && looksLikeUpdates(data));

                if (isUpdates && data && typeof data === 'object') {
                  // Handle thinking steps updates from Router, Narrator, etc.
                  Object.keys(data).forEach(nodeName => {
                    if (!thinkingSteps.includes(nodeName)) {
                      thinkingSteps.push(nodeName);
                      setCurrentThinkingSteps([...thinkingSteps]);
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
                        if (currentAssistantMessage) {
                          // Update existing message
                          setMessages(prev => {
                            const updated = [...prev];
                            const lastMessage = updated[updated.length - 1];
                            if (lastMessage && lastMessage.role === 'assistant') {
                              lastMessage.content = messageContent;
                              lastMessage.analysisText = analysisText || undefined;
                              lastMessage.thinkingSteps = thinkingSteps.length > 0 ? [...thinkingSteps] : undefined;
                            }
                            return updated;
                          });
                        } else {
                          // Create new assistant message
                          currentAssistantMessage = {
                            id: runId ? `msg-${runId}` : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            role: 'assistant',
                            content: messageContent,
                            timestamp: new Date(),
                            analysisText: analysisText || undefined,
                            thinkingSteps: thinkingSteps.length > 0 ? [...thinkingSteps] : undefined
                          };
                          setMessages(prev => [...prev, currentAssistantMessage!]);
                        }
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

      } catch (error) {
        console.error("Error sending message:", error);
        addMessage(
          "assistant",
          `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
        );
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].isError = true;
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        setCurrentThinkingSteps([]);
      }
    },
    [addMessage]
  );

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        toggleAssistant,
        openAssistant,
        closeAssistant,
        messages,
        addMessage,
        clearMessages,
        isLoading,
        setIsLoading,
        inputValue,
        setInputValue,
        sendMessage,
        suggestedPrompts,
        currentThinkingSteps,
        isStreaming,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
};
