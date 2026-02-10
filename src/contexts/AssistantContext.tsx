import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { threadsService, type Thread, type ThreadMessage, type ContentBlock, normalizeThreadMessages } from "../services/ai/threads";
import { runsService } from "../services/ai/runs";
import { assistantService, getAssistantIdForGraph, type AssistantSearchResult, type GraphId } from "../services/ai/assistant";
import type { CampaignSetupState } from "../types/agent";
import { campaignStateToThreadMessages } from "../services/ai/campaignStateUtils";

export const ASSISTANT_PANEL_WIDTH = "550px";
// "fixed" will make the main content shrink, while "floating" will be displayed over the main content.
export const ASSISTANT_PANEL_VIEW: "fixed" | "floating" = "floating";

export interface SuggestedPrompt {
  id: string;
  text: string;
}

/** User-selected scope in the assistant panel (overrides route params when set). */
export interface AssistantScope {
  accountId: string | null;
  channelId: string | null;
  profileId: string | null;
}

export type AssistantIntent = "analyze" | "create_campaign" | null;

// Extended Thread with runtime state (not from API). Exported so Assistant UI can read campaignState.
export interface ThreadWithRuntime extends Thread {
  isStreaming?: boolean;
  thinkingSteps?: string[];
  pendingMessageId?: string | null;
  campaignState?: CampaignSetupState;
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
  assistants: AssistantSearchResult[];
  selectedGraphId: GraphId;
  setSelectedGraphId: (id: GraphId) => void;
  onApplyDraft?: (draft: Record<string, unknown>) => void;

  /** Scope selected in panel (account, channel, profile). When set, overrides route params when sending. */
  assistantScope: AssistantScope;
  setAssistantScope: (updates: Partial<AssistantScope>) => void;
  /** Intent: Analyze or Create Campaign. When set, can drive suggested prompts and run metadata. */
  assistantIntent: AssistantIntent;
  setAssistantIntent: (intent: AssistantIntent) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const CHAT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "1", text: "Why is my ROAS dropping?" },
  { id: "2", text: "Suggest budget optimization" },
  { id: "3", text: "Analyze ACOS trends" },
  { id: "4", text: "Compare campaign efficiency" },
];

const CAMPAIGN_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "c1", text: "Create a Demand Gen campaign" },
  { id: "c2", text: "Set up a Search campaign" },
  { id: "c3", text: "Create a Performance Max campaign" },
  { id: "c4", text: "I want to create a YouTube video campaign" },
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
  const [selectedGraphId, setSelectedGraphId] = useState<GraphId>("chat");
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [assistants, setAssistants] = useState<AssistantSearchResult[]>([]);

  const [assistantScope, setAssistantScopeState] = useState<AssistantScope>({
    accountId: null,
    channelId: null,
    profileId: null,
  });
  const [assistantIntent, setAssistantIntent] = useState<AssistantIntent>(null);

  const setAssistantScope = useCallback((updates: Partial<AssistantScope>) => {
    setAssistantScopeState((prev) => ({ ...prev, ...updates }));
  }, []);

  const suggestedPrompts = selectedGraphId === "campaign_setup" ? CAMPAIGN_SUGGESTED_PROMPTS : CHAT_SUGGESTED_PROMPTS;
  const currentAssistantId = getAssistantIdForGraph(assistants, selectedGraphId);

  // Derived: get current thread directly from array
  const currentThread = threads.find(t => t.thread_id === currentThreadId) || null;

  // Derived: backward compatibility
  const messages = currentThread?.values?.messages || [];
  const isStreaming = currentThread?.isStreaming || false;
  const currentThinkingSteps = currentThread?.thinkingSteps || [];

  // Load all assistants on mount
  useEffect(() => {
    (async () => {
      try {
        const results = await assistantService.search({ metadata: { created_by: "system" }, limit: 100 });
        setAssistants(results);
      } catch (err) {
        console.error("Failed to load assistants", err);
      }
    })();
  }, []);
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
        const existingRuntime = new Map(prev.map(t => [t.thread_id, { isStreaming: t.isStreaming, thinkingSteps: t.thinkingSteps, campaignState: t.campaignState }]));

        return threadList.map(t => ({
          ...t,
          isStreaming: existingRuntime.get(t.thread_id)?.isStreaming || false,
          thinkingSteps: existingRuntime.get(t.thread_id)?.thinkingSteps || [],
          campaignState: existingRuntime.get(t.thread_id)?.campaignState,
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

  // Pre-fill scope from route when on a channel page (user can still change in panel)
  useEffect(() => {
    if (propAccountId || propChannelId) {
      setAssistantScopeState((prev) => ({
        ...prev,
        ...(propAccountId && { accountId: propAccountId }),
        ...(propChannelId && { channelId: propChannelId }),
      }));
    }
  }, [propAccountId, propChannelId]);

  // Sync selectedGraphId when user selects a thread (so graph selector matches the thread's graph)
  useEffect(() => {
    if (!currentThreadId || !currentThread) return;
    const graphId = (currentThread.metadata as { graph_id?: GraphId })?.graph_id;
    if (graphId === "chat" || graphId === "campaign_setup") {
      setSelectedGraphId(graphId);
    }
  }, [currentThreadId, currentThread?.metadata, currentThread]);

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
        // @ts-ignore
        const threadRuns = await runsService.getThreadRuns(threadId);

        if (history.length > 0) {
          // Get latest state from history; normalize messages for consistent display with stream
          const latestState = history[history.length - 1];
          const values = latestState.values
            ? {
              ...latestState.values,
              messages: normalizeThreadMessages(latestState.values.messages),
            }
            : latestState.values;

          setThreads(prev => prev.map(t =>
            t.thread_id === threadId
              ? {
                ...t,
                ...fullThread,
                values: values ?? fullThread.values,
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
    setCurrentThreadId(null);
  }, []);

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

  // Update streaming message content - directly modify last message in array (string or ContentBlock[] including tool_use).
  // When we receive a string (from stream chunks), merge into existing content so we never wipe tool_use blocks.
  // When the last message is human (we just sent), ignore content from values events so we don't show the previous run's reply.
  const updateStreamingContent = useCallback((threadId: string, content: string | ContentBlock[], runId?: string, isFromValues?: boolean) => {
    setThreads(prev => prev.map(t => {
      if (t.thread_id !== threadId) return t;

      const currentValues = t.values || { messages: [] };
      const currentMessages = currentValues.messages || [];
      const lastIndex = currentMessages.length - 1;
      const lastMessage = currentMessages[lastIndex];

      // When last message is human, skip only string-from-values (often stale). Allow ContentBlock[] so tool_use from values is shown.
      if (lastMessage?.type === 'human' && isFromValues && typeof content === 'string') return t;

      // If last message is AI, update it; otherwise add new
      if (lastMessage?.type === 'ai') {
        const updatedMessages = [...currentMessages];
        let newContent: string | ContentBlock[] = content;

        // Merge: when stream sends only text (string), keep existing tool_use blocks so they don't disappear
        if (typeof content === 'string' && Array.isArray(lastMessage.content) && lastMessage.content.length > 0) {
          const existing = lastMessage.content as ContentBlock[];
          const toolBlocks = existing.filter((b): b is ContentBlock => b && typeof b === 'object' && (b as ContentBlock).type === 'tool_use');
          if (toolBlocks.length > 0) {
            newContent = [...toolBlocks, { type: 'text' as const, text: content }];
          }
        }

        updatedMessages[lastIndex] = { ...lastMessage, content: newContent };
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

  // Effective scope: panel selection overrides route params
  const effectiveAccountId = assistantScope.accountId ?? propAccountId ?? null;
  const effectiveChannelId = assistantScope.channelId ?? propChannelId ?? null;
  const effectiveProfileId = assistantScope.profileId;

  // Main send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !user?.id) return;

    const accountIdNum = effectiveAccountId ? parseInt(effectiveAccountId, 10) : undefined;
    const channelIdNum = effectiveChannelId ? parseInt(effectiveChannelId, 10) : undefined;

    // Ensure we have a current thread
    let activeThreadId = currentThreadId;

    if (!activeThreadId) {
      const threadData = await threadsService.createThread({
        metadata: {
          user_id: user.id,
          account_id: accountIdNum,
          channel_id: channelIdNum,
          profile_id: effectiveProfileId ?? undefined,
          intent: assistantIntent ?? undefined,
          auth_token: '123123123',
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          graph_id: selectedGraphId,
        }
      });
      activeThreadId = threadData.thread_id;
      setThreads(prev => [...prev, {
        ...threadData,
        metadata: { ...threadData.metadata, graph_id: selectedGraphId },
        campaignState: undefined,
      } as ThreadWithRuntime]);
      setCurrentThreadId(activeThreadId);
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

      return {
        ...t,
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
      setCurrentRunId(null);

      await runsService.streamRun(activeThreadId, {
        assistant_id: currentAssistantId,
        input: { messages: [{ role: "user", content }] },
        metadata: {
          user_id: user.id,
          account_id: accountIdNum,
          channel_id: channelIdNum,
          profile_id: effectiveProfileId ?? undefined,
          intent: assistantIntent ?? undefined,
          auth_token: "123123123",
        },
        config: { recursion_limit: 75, configurable: {} },
        stream_resumable: true,
        stream_subgraphs: true,
        on_disconnect: "continue",
        stream_mode: ["messages-tuple", "updates", "values"],
      }, {
        onLoadingChange: setIsLoading,
        onThinkingStep: (steps) => updateThreadRuntime(activeThreadId, { thinkingSteps: steps }),
        onMessage: (messageContent, _a, _s, runId, isFromValues) => updateStreamingContent(activeThreadId, messageContent, runId, isFromValues),
        onError: (errorMsg) => {
          updateStreamingContent(activeThreadId, `Error: ${errorMsg}`);
          updateThreadRuntime(activeThreadId, { isStreaming: false, thinkingSteps: [] });
        },
        onRunId: (runId) => setCurrentRunId(runId),
        onCampaignSetupState: (state: CampaignSetupState) => {
          const normalized = campaignStateToThreadMessages(state);
          setThreads(prev => prev.map(t => {
            if (t.thread_id !== activeThreadId) return t;
            return {
              ...t,
              values: { ...(t.values || { messages: [] }), messages: normalized },
              campaignState: state,
              updated_at: new Date().toISOString(),
            };
          }));
          if (state.reply_text?.trim()) {
            updateStreamingContent(activeThreadId, state.reply_text.trim());
          }
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      updateStreamingContent(activeThreadId, `Sorry, I encountered an error. Please try again.`);
    } finally {
      setIsLoading(false);
      setCurrentRunId(null);
      updateThreadRuntime(activeThreadId, { isStreaming: false, thinkingSteps: [] });
    }
  }, [currentThreadId, threads, user?.id, effectiveAccountId, effectiveChannelId, effectiveProfileId, assistantIntent, selectedGraphId, currentAssistantId, updateThreadRuntime, updateStreamingContent]);

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

        assistants,
        selectedGraphId,
        setSelectedGraphId,
        onApplyDraft: undefined,

        assistantScope,
        setAssistantScope,
        assistantIntent,
        setAssistantIntent,
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