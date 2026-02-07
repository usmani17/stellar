import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { threadsService, type Thread , type ThreadMessage } from "../services/ai/threads";
import { runsService } from "../services/ai/runs";


export interface SuggestedPrompt {
  id: string;
  text: string;
}

interface AssistantContextType {
  isOpen: boolean;
  toggleAssistant: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  messages: ThreadMessage[];
  addMessage: (type: "human" | "ai", content: string) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
  suggestedPrompts: SuggestedPrompt[];
  currentThinkingSteps: string[];
  isStreaming: boolean;
  // Thread history features
  threads: Thread[];
  currentThread: Thread | null;
  isLoadingThreads: boolean;
  loadThreads: () => Promise<void>;
  selectThread: (threadId: string) => Promise<void>;
  startNewThread: () => void;
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

export const AssistantProvider: React.FC<{ children: ReactNode; accountId: number; channelId: number }> = ({
  children,
  accountId, channelId
}) => {
  console.log("AssistantContext initialized with accountId:", accountId, "channelId:", channelId);
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentThinkingSteps, setCurrentThinkingSteps] = useState<string[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [suggestedPrompts] = useState<SuggestedPrompt[]>(
    DEFAULT_SUGGESTED_PROMPTS
  );
  
  // Thread history state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Load threads when user changes or assistant opens
  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingThreads(true);
    try {
      const threadList = await threadsService.searchThreads({
        metadata: { user_id: user.id },
        sort_by: 'updated_at',
        sort_order: 'desc',
        limit: 50
      });
      
      setThreads(threadList);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [user?.id]);

  // Load threads when assistant opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadThreads();
    }
  }, [isOpen, user?.id, loadThreads]);

  // Select and load a specific thread
  const selectThread = useCallback(async (selectedThreadId: string) => {
    setIsLoading(true);
    try {
      await runsService.getThreadRuns(selectedThreadId);
      await threadsService.getThreadHistory(selectedThreadId);
      await threadsService.getThread(selectedThreadId);
      // Find thread in list
      const thread = threads.find(t => t.thread_id === selectedThreadId);
      if (thread) {
        setCurrentThread(thread);
        setThreadId(selectedThreadId);
        setMessages(thread.values?.messages || []);
      } else {
        // Fallback if thread not found in local list
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to select thread:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [threads]);

  // Start a new thread
  const startNewThread = useCallback(() => {
    setThreadId(null);
    setCurrentThread(null);
    setMessages([]);
    setCurrentThinkingSteps([]);
  }, []);

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
    (type: "human" | "ai", content: string) => {
      const newMessage: ThreadMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setThreadId(null);
    setCurrentThread(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      addMessage("human", content);
      setInputValue("");
      setIsLoading(true);
      setIsStreaming(true);
      setCurrentThinkingSteps([]);

      try {
        let currentThreadId = threadId;

        // Create thread only if we don't have one
        if (!currentThreadId) {
          console.log("Creating new thread with title:", content.slice(0, 50));
          const threadData = await threadsService.createThread({
            metadata: {
              user_id: user?.id,
              account_id: accountId,
              channel_id: channelId,
              auth_token: '123123123',
              title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
            }
          });
          currentThreadId = threadData.thread_id;
          setThreadId(currentThreadId);
          
          // Set current thread info
          const newThreadItem: Thread = {
            thread_id: threadData.thread_id,
            metadata: {
              title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
            },
            created_at: threadData.created_at,
            updated_at: threadData.updated_at,
            status: threadData.status,
          };
          setCurrentThread(newThreadItem);
          setThreads(prev => [newThreadItem, ...prev]);
        }

        let currentAssistantMessage: ThreadMessage | null = null;

        // Start streaming with callbacks
        await runsService.streamRun(currentThreadId, {
          assistant_id: 'chat',
          input: { messages: [{ role: 'user', content }] },
          metadata: {
            user_id: user?.id,
            account_id: accountId,
            channel_id: channelId,
            auth_token: '123123123'
          },
          config: { configurable: {} },
          stream_mode: ['values', 'updates']
        }, {
          onLoadingChange: (loading) => {
            setIsLoading(loading);
          },
          onThinkingStep: (steps) => {
            setCurrentThinkingSteps(steps);
          },
          onMessage: (messageContent, runId) => {
            if (currentAssistantMessage) {
              // Update existing message
              setMessages(prev => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage && lastMessage.type === 'ai') {
                  lastMessage.content = messageContent;
                }
                return updated;
              });
            } else {
              // Create new assistant message
              currentAssistantMessage = {
                id: runId ? `msg-${runId}` : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'ai',
                content: messageContent,
              };
              setMessages(prev => [...prev, currentAssistantMessage!]);
            }
          },
          onError: (errorMsg) => {
            addMessage("ai", errorMsg);
            setMessages(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
              }
              return updated;
            });
          }
        });

      } catch (error) {
        console.error("Error sending message:", error);
        addMessage(
          "ai",
          `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
        );
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
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
        // Thread history features
        threads,
        currentThread,
        isLoadingThreads,
        loadThreads,
        selectThread,
        startNewThread,
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
