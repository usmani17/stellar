import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { threadsService, type Thread, type ThreadMessage } from "../services/ai/threads";
import { runsService } from "../services/ai/runs";

export const ASSISTANT_PANEL_WIDTH = "550px";
// "fixed" will make the main content shrink, while "floating" will be displayed over the main content.
export const ASSISTANT_PANEL_VIEW: "fixed" | "floating" = "floating";

export interface SuggestedPrompt {
  id: string;
  text: string;
}

// Extended Thread with runtime state (not from API)
interface ThreadWithRuntime extends Thread {
  isStreaming?: boolean;
  thinkingSteps?: string[];
  pendingMessageId?: string | null; // Track streaming message ID
}

interface AssistantContextType {
  isOpen: boolean;
  toggleAssistant: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  
  // Single source of truth - all threads in one array with runtime state
  threads: ThreadWithRuntime[];
  
  // Current thread (derived from threads array)
  currentThread: ThreadWithRuntime | null;
  currentThreadId: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  cancelRun: () => Promise<void>;
  selectThread: (threadId: string) => Promise<void>;
  startNewThread: () => void;
  deleteThread: (threadId: string) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  
  // UI state
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  isLoadingThreads: boolean;
  suggestedPrompts: SuggestedPrompt[];
  
  // Backward compatibility - derived from currentThread
  messages: ThreadMessage[];
  addMessage: (type: "human" | "ai", content: string) => void;
  clearMessages: () => void;
  isStreaming: boolean;
  currentThinkingSteps: string[];
  currentRunId: string | null;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const DEFAULT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "1", text: "Why is my ROAS dropping?" },
  { id: "2", text: "Suggest budget optimization" },
  { id: "3", text: "Analyze ACOS trends" },
  { id: "4", text: "Compare campaign efficiency" },
];

export const AssistantProvider: React.FC<{ children: ReactNode; accountId?: string; channelId?: string }> = ({
  children,
  accountId: propAccountId,
  channelId: propChannelId,
}) => {
  const { user } = useAuth();
  
  // Single array holds ALL threads with runtime state
  const [threads, setThreads] = useState<ThreadWithRuntime[]>([]);
  
  // Current thread ID reference
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  
  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [suggestedPrompts] = useState<SuggestedPrompt[]>(DEFAULT_SUGGESTED_PROMPTS);

  // Derived: get current thread directly from array
  const currentThread = threads.find(t => t.thread_id === currentThreadId) || null;

  // Derived: backward compatibility
  const messages = currentThread?.values?.messages || [];
  const isStreaming = currentThread?.isStreaming || false;
  const currentThinkingSteps = currentThread?.thinkingSteps || [];
  
  // Track current run for cancellation
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  // Load threads from API
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
      
      // Merge with existing runtime state if any
      setThreads(prev => {
        const existingRuntime = new Map(prev.map(t => [t.thread_id, { isStreaming: t.isStreaming, thinkingSteps: t.thinkingSteps }]));
        
        return threadList.map(t => ({
          ...t,
          isStreaming: existingRuntime.get(t.thread_id)?.isStreaming || false,
          thinkingSteps: existingRuntime.get(t.thread_id)?.thinkingSteps || [],
        }));
      });
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

  // Select thread - load full history if needed
  const selectThread = useCallback(async (threadId: string) => {
    setIsLoading(true);
    try {
      // Check if we need to load full history
      const existingThread = threads.find(t => t.thread_id === threadId);
      const needsHistory = !existingThread?.values?.messages?.length;
      
      if (needsHistory) {
        const history = await threadsService.getThreadHistory(threadId, { limit: 1000 });
        const fullThread = await threadsService.getThread(threadId);
        
        if (history.length > 0) {
          // Get latest state from history
          const latestState = history[history.length - 1];
          
          setThreads(prev => prev.map(t => 
            t.thread_id === threadId
              ? { 
                  ...t, 
                  ...fullThread,
                  values: latestState.values,
                  updated_at: fullThread.updated_at 
                }
              : t
          ));
        }
      }
      
      setCurrentThreadId(threadId);
    } catch (error) {
      console.error('Failed to select thread:', error);
    } finally {
      setIsLoading(false);
    }
  }, [threads]);

  // Start new thread - add to array immediately
  const startNewThread = useCallback(() => {
    // Check if a temp thread already exists
    const existingTempThread = threads.find(t => t.thread_id.startsWith('temp-'));
    if (existingTempThread) {
      setCurrentThreadId(existingTempThread.thread_id);
      return;
    }
    
    const tempThreadId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newThread: ThreadWithRuntime = {
      thread_id: tempThreadId,
      created_at: now,
      updated_at: now,
      metadata: {
        user_id: user?.id,
        account_id: propAccountId ? parseInt(propAccountId) : undefined,
        channel_id: propChannelId ? parseInt(propChannelId) : undefined,
        title: 'New Chat'
      },
      status: 'idle',
      values: { messages: [] },
      isStreaming: false,
      thinkingSteps: [],
    };
    
    setThreads(prev => [newThread, ...prev]);
    setCurrentThreadId(tempThreadId);
  }, [user?.id, propAccountId, propChannelId, threads]);

  // Delete thread from array
  const deleteThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(t => t.thread_id !== threadId));
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
  }, [currentThreadId]);

  // Update thread title
  const updateThreadTitle = useCallback((threadId: string, title: string) => {
    setThreads(prev => prev.map(t => 
      t.thread_id === threadId
        ? { ...t, metadata: { ...t.metadata, title }, updated_at: new Date().toISOString() }
        : t
    ));
  }, []);

  // Update thread runtime state directly in array
  const updateThreadRuntime = useCallback((threadId: string, updates: Partial<ThreadWithRuntime>) => {
    setThreads(prev => prev.map(t => 
      t.thread_id === threadId
        ? { ...t, ...updates, updated_at: new Date().toISOString() }
        : t
    ));
  }, []);

  // Add message to current thread - directly modify array
  const addMessage = useCallback((type: "human" | "ai", content: string) => {
    if (!currentThreadId) return;
    
    const newMessage: ThreadMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
    };
    
    setThreads(prev => prev.map(t => {
      if (t.thread_id !== currentThreadId) return t;
      
      const currentValues = t.values || { messages: [] };
      const currentMessages = currentValues.messages || [];
      
      return {
        ...t,
        values: {
          ...currentValues,
          messages: [...currentMessages, newMessage]
        },
        updated_at: new Date().toISOString()
      };
    }));
  }, [currentThreadId]);

  // Clear messages
  const clearMessages = useCallback(() => {
    if (!currentThreadId) return;
    
    setThreads(prev => prev.map(t => 
      t.thread_id === currentThreadId
        ? { 
            ...t, 
            values: { ...t.values, messages: [] },
            isStreaming: false,
            thinkingSteps: [],
            pendingMessageId: null
          }
        : t
    ));
  }, [currentThreadId]);

  // Update streaming message content - directly modify last message in array
  const updateStreamingContent = useCallback((threadId: string, content: string, runId?: string) => {
    setThreads(prev => prev.map(t => {
      if (t.thread_id !== threadId) return t;
      
      const currentValues = t.values || { messages: [] };
      const currentMessages = currentValues.messages || [];
      const lastIndex = currentMessages.length - 1;
      const lastMessage = currentMessages[lastIndex];
      
      // If last message is AI, update it; otherwise add new
      if (lastMessage?.type === 'ai') {
        const updatedMessages = [...currentMessages];
        updatedMessages[lastIndex] = { ...lastMessage, content };
        return {
          ...t,
          values: { ...currentValues, messages: updatedMessages },
          pendingMessageId: runId ? `msg-${runId}` : t.pendingMessageId
        };
      } else {
        const newMessage: ThreadMessage = {
          id: runId ? `msg-${runId}` : `msg-${Date.now()}`,
          type: 'ai',
          content,
        };
        return {
          ...t,
          values: { ...currentValues, messages: [...currentMessages, newMessage] },
          pendingMessageId: runId ? `msg-${runId}` : null
        };
      }
    }));
  }, []);

  // Main send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !user?.id) return;

    // Ensure we have a current thread
    let activeThreadId = currentThreadId;
    
    if (!activeThreadId || !threads.find(t => t.thread_id === activeThreadId)) {
      startNewThread();
      // Get the temp thread we just created (first in array)
      const newThread = threads[0];
      if (newThread?.thread_id?.startsWith('temp-')) {
        activeThreadId = newThread.thread_id;
      } else {
        return; // Should not happen
      }
    }

    // Add user message directly to threads array
    const userMessage: ThreadMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'human',
      content,
    };
    
    setThreads(prev => prev.map(t => {
      if (t.thread_id !== activeThreadId) return t;
      
      const currentValues = t.values || { messages: [] };
      const currentMessages = currentValues.messages || [];
      const isFirstMessage = currentMessages.length === 0;
      
      return {
        ...t,
        metadata: {
          ...t.metadata,
          title: isFirstMessage ? content.slice(0, 50) + (content.length > 50 ? '...' : '') : t.metadata?.title
        },
        values: {
          ...currentValues,
          messages: [...currentMessages, userMessage]
        },
        updated_at: new Date().toISOString()
      };
    }));
    
    setInputValue("");
    setIsLoading(true);
    updateThreadRuntime(activeThreadId, { isStreaming: true, thinkingSteps: [] });

    try {
      let serverThreadId = activeThreadId;
      
      // Create thread on server if temp
      if (activeThreadId.startsWith('temp-')) {
        const threadData = await threadsService.createThread({
          metadata: {
            user_id: user.id,
            account_id: propAccountId ? parseInt(propAccountId) : undefined,
            channel_id: propChannelId ? parseInt(propChannelId) : undefined,
            auth_token: '123123123',
            title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
          }
        });
        
        serverThreadId = threadData.thread_id;
        
        // Replace temp thread ID with real one in array
        setThreads(prev => prev.map(t => 
          t.thread_id === activeThreadId
            ? { ...t, thread_id: serverThreadId, status: threadData.status, updated_at: threadData.updated_at }
            : t
        ));
        setCurrentThreadId(serverThreadId);
        activeThreadId = serverThreadId;
      }

      // Stream response
      setCurrentRunId(null); // Reset before starting
      await runsService.streamRun(serverThreadId, {
        assistant_id: 'chat',
        input: { messages: [{ role: 'user', content }] },
        metadata: {
          user_id: user.id,
          account_id: propAccountId ? parseInt(propAccountId) : undefined,
          channel_id: propChannelId ? parseInt(propChannelId) : undefined,
          auth_token: '123123123'
        },
        config: { configurable: {} },
        stream_mode: ['values', 'updates']
      }, {
        onLoadingChange: setIsLoading,
        onThinkingStep: (steps) => {
          updateThreadRuntime(serverThreadId, { thinkingSteps: steps });
        },
        onMessage: (messageContent, _analysis, _steps, runId) => {
          updateStreamingContent(serverThreadId, messageContent, runId);
        },
        onError: (errorMsg) => {
          updateStreamingContent(serverThreadId, `Error: ${errorMsg}`);
          updateThreadRuntime(serverThreadId, { isStreaming: false, thinkingSteps: [] });
        },
        onRunId: (runId) => {
          setCurrentRunId(runId);
        }
      });

    } catch (error) {
      console.error("Error sending message:", error);
      updateStreamingContent(activeThreadId, `Sorry, I encountered an error. Please try again.`);
    } finally {
      setIsLoading(false);
      setCurrentRunId(null);
      updateThreadRuntime(activeThreadId, { isStreaming: false, thinkingSteps: [] });
    }
  }, [currentThreadId, threads, user?.id, propAccountId, propChannelId, startNewThread, updateThreadRuntime, updateStreamingContent]);

  // Cancel the current run
  const cancelRun = useCallback(async () => {
    if (!currentThreadId || !currentRunId) return;
    
    try {
      await runsService.cancelRun(currentThreadId, currentRunId, { action: 'interrupt' });
    } catch (error) {
      console.error('Failed to cancel run:', error);
    } finally {
      setIsLoading(false);
      setCurrentRunId(null);
      updateThreadRuntime(currentThreadId, { isStreaming: false, thinkingSteps: [] });
    }
  }, [currentThreadId, currentRunId, updateThreadRuntime]);

  // UI actions
  const toggleAssistant = useCallback(() => setIsOpen(prev => !prev), []);
  const openAssistant = useCallback(() => setIsOpen(true), []);
  const closeAssistant = useCallback(() => setIsOpen(false), []);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        toggleAssistant,
        openAssistant,
        closeAssistant,
        
        // Single array source of truth
        threads,
        
        // Current state derived from array
        currentThread,
        currentThreadId,
        
        // Actions
        sendMessage,
        selectThread,
        startNewThread,
        deleteThread,
        updateThreadTitle,
        
        // UI state
        inputValue,
        setInputValue,
        isLoading,
        isLoadingThreads,
        suggestedPrompts,
        
        // Backward compatibility
        messages,
        addMessage,
        clearMessages,
        isStreaming,
        currentThinkingSteps,
        currentRunId,
        cancelRun,
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