import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useAuth } from "./AuthContext";
import { threadsService, type Thread, type ThreadMessage, type ContentBlock, type ThreadMetaData, type ContextMetadata, normalizeThreadMessages } from "../services/ai/threads";
import {
  parseStreamMessages,
  mergeAccumulatedToolBlocks,
  applyThinkingStepsToLastAi,
  shouldSkipOnFinishMessages,
  extractToolBlocksFromContent,
  type AccumulatedToolContent,
} from "../utils/aiStreamMessageParser";
import { runsService } from "../services/ai/runs";
import { assistantService, getAssistantIdForGraph, type AssistantSearchResult, type GraphId } from "../services/ai/assistant";
import type { CampaignSetupState } from "../types/agent";

const getStreamApiUrl = (): string => {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl) return "";
  return String(baseUrl).replace(/\/$/, "");
};

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
  profileId: number | null;
  /** Profile display name (from selected integration/profile). */
  profileName?: string | null;
  /** Channel/marketplace type (e.g. google, meta, tiktok) for LangGraph context. */
  marketplace?: string | null;
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
  { id: "c1", text: "Create a Demand Gen (YouTube) campaign" },
  { id: "c2", text: "Set up a Search campaign" },
  { id: "c3", text: "Create a Performance Max campaign" },
  { id: "c4", text: "Create a Shopping campaign" },
  { id: "c-analyze-1", text: "Analyze my campaigns and create a Search campaign for me" },
  { id: "c-analyze-2", text: "Analyze my top campaigns, find budget waste, and create a new campaign optimized for my account" },
  
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
  const [assistants, setAssistants] = useState<AssistantSearchResult[]>([]);

  const [assistantScope, setAssistantScopeState] = useState<AssistantScope>({
    accountId: null,
    channelId: null,
    profileId: null,
    profileName: null,
    marketplace: null,
  });
  const [assistantIntent, setAssistantIntent] = useState<AssistantIntent>(null);

  const setAssistantScope = useCallback((updates: Partial<AssistantScope>) => {
    setAssistantScopeState((prev) => ({ ...prev, ...updates }));
  }, []);

  const suggestedPrompts = selectedGraphId === "campaign_setup" ? CAMPAIGN_SUGGESTED_PROMPTS : CHAT_SUGGESTED_PROMPTS;
  const currentAssistantId = getAssistantIdForGraph(assistants, selectedGraphId);
  const streamApiUrl = useMemo(() => getStreamApiUrl(), []);

  // When stream creates a new thread, use first message as title if we have it
  const pendingThreadTitleRef = React.useRef<string | null>(null);

  // Accumulate tool-rich content during streaming (LangGraph SDK drops tool_calls when merging)
  const accumulatedToolContentRef = React.useRef<Map<string, ThreadMessage["content"]>>(new Map());
  const accumulatedByAiIndexRef = React.useRef<ThreadMessage["content"][]>([]);

  // Effective scope: panel selection overrides route params
  const effectiveAccountId = assistantScope.accountId ?? propAccountId ?? null;
  const effectiveChannelId = assistantScope.channelId ?? propChannelId ?? null;
  const effectiveProfileId = assistantScope.profileId;
  const effectiveProfileName = assistantScope.profileName ?? null;
  const effectiveMarketplace = assistantScope.marketplace ?? null;

  const onThreadIdFromStream = useCallback((threadId: string) => {
    const title = pendingThreadTitleRef.current
      ? (pendingThreadTitleRef.current.length > 50
          ? pendingThreadTitleRef.current.slice(0, 47) + "..."
          : pendingThreadTitleRef.current)
      : undefined;
    if (pendingThreadTitleRef.current) pendingThreadTitleRef.current = null;

    const accountIdNum = effectiveAccountId ? parseInt(effectiveAccountId, 10) : undefined;
    const channelIdNum = effectiveChannelId ? parseInt(effectiveChannelId, 10) : undefined;
    
    const threadMetadata: ThreadMetaData = {
      title,
      graph_id: selectedGraphId,
      user_id: user?.id,
      account_id: accountIdNum,
      channel_id: channelIdNum,
      profile_id: effectiveProfileId ?? undefined,
      workspace_id: user?.workspace?.id,
      folder_id: undefined, // Add when available
      session_id: undefined, // Add when available
      platform: effectiveMarketplace ?? undefined,
      auth_token: "123123123", // Consider making this dynamic
      assistant_id: currentAssistantId,
    };

    setThreads(prev => {
      if (prev.some(t => t.thread_id === threadId)) return prev;
      return [...prev, {
        thread_id: threadId,
        metadata: threadMetadata,
        values: { messages: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "idle",
      } as ThreadWithRuntime];
    });
    setCurrentThreadId(threadId);
    if (title) {
      threadsService.updateThread(threadId, { metadata: threadMetadata }).catch((err) =>
        console.warn("[Assistant] Failed to persist thread title:", err)
      );
    }
  }, [selectedGraphId, effectiveAccountId, effectiveChannelId, effectiveProfileId, effectiveMarketplace, user?.id, user?.workspace?.id]);

  const stream = useStream({
    apiUrl: streamApiUrl || undefined,
    assistantId: currentAssistantId ?? "",
    threadId: currentThreadId,
    throttle: 16,
    fetchStateHistory: true,
    onThreadId: onThreadIdFromStream,
    messagesKey: "messages",
    onError: useCallback((err: unknown) => {
      console.error("Stream error:", err);
    }, []),
    onFinish: useCallback((state: unknown, run?: { thread_id?: string }) => {
      const threadId = run?.thread_id ?? currentThreadId;
      if (!threadId) return;
      const s = state != null && typeof state === "object" ? (state as Record<string, unknown>) : {};
      const values = s.values != null && typeof s.values === "object" ? (s.values as Record<string, unknown>) : null;
      const rawMessages = values?.messages ?? s.messages;
      const hasCampaignState = values && ("campaign_draft" in values || "reply_text" in values || "current_questions_schema" in values);
      const campaignState = hasCampaignState ? (values as CampaignSetupState) : undefined;
      const normalized = Array.isArray(rawMessages) && rawMessages.length > 0
        ? normalizeThreadMessages(rawMessages as Parameters<typeof normalizeThreadMessages>[0])
        : null;
      const skipMessages = shouldSkipOnFinishMessages({
        byId: accumulatedToolContentRef.current,
        byAiIndex: accumulatedByAiIndexRef.current,
      });
      setThreads(prev => prev.map(t => {
        if (t.thread_id !== threadId) return t;
        const next: ThreadWithRuntime = { ...t, updated_at: new Date().toISOString() };
        if (normalized && !skipMessages) next.values = { ...(t.values || {}), messages: normalized };
        if (campaignState) next.campaignState = campaignState;
        return next;
      }));
    }, [currentThreadId]),
    onUpdateEvent: useCallback((data: Record<string, unknown>) => {
      const excludeFromSteps = ["messages", "analysis", "corrected_analysis", "build_draft"];
      const keys = data && typeof data === "object" ? Object.keys(data).filter(k => !excludeFromSteps.includes(k)) : [];
      if (keys.length > 0 && currentThreadId) {
        setThreads(prev => prev.map(t => {
          if (t.thread_id !== currentThreadId) return t;
          const existing = t.thinkingSteps ?? [];
          const newKeys = keys.filter(k => !existing.includes(k));
          const merged = newKeys.length > 0 ? [...existing, ...newKeys] : existing;
          return { ...t, thinkingSteps: merged, updated_at: new Date().toISOString() };
        }));
      }
    }, [currentThreadId]),
  });

  // Derived: get current thread directly from array
  const currentThread = threads.find(t => t.thread_id === currentThreadId) || null;

  // When we're on the stream's thread, use stream.messages; otherwise use thread history from our list
  const streamMessages: ThreadMessage[] = useMemo(() => {
    const getToolCalls = (stream as { getToolCalls?: (msg: unknown) => Array<{ call: { id?: string; name: string; args?: Record<string, unknown> } }> }).getToolCalls;
    return parseStreamMessages(stream.messages ?? [], getToolCalls);
  }, [stream.messages, stream]);

  const isStreamThread = currentThreadId != null; // stream is bound to currentThreadId when set
  const prevLoadingRefForAccum = React.useRef<boolean>(stream.isLoading);
  const lastMergedMessagesRef = React.useRef<ThreadMessage[] | null>(null);
  const lastMergedThreadIdRef = React.useRef<string | null>(null);
  const persistedMessagesRef = React.useRef<ThreadMessage[]>([]);
  const persistedForThreadIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (currentThreadId !== persistedForThreadIdRef.current) {
      persistedMessagesRef.current = [];
      persistedForThreadIdRef.current = currentThreadId;
    }
  }, [currentThreadId]);

  const mergedForDisplay = React.useMemo(() => {
    if (stream.isLoading || !currentThreadId || !streamMessages.length) return null;
    const accumulated: AccumulatedToolContent = {
      byId: accumulatedToolContentRef.current,
      byAiIndex: accumulatedByAiIndexRef.current,
    };
    if (shouldSkipOnFinishMessages(accumulated)) {
      const merged = mergeAccumulatedToolBlocks(streamMessages, accumulated);
      return applyThinkingStepsToLastAi(merged, currentThread?.thinkingSteps ?? []);
    }
    return null;
  }, [stream.isLoading, streamMessages, currentThreadId, currentThread?.thinkingSteps]);
  const lastMergedForThread =
    lastMergedThreadIdRef.current === currentThreadId ? lastMergedMessagesRef.current : null;

  const baseMessages: ThreadMessage[] = React.useMemo(() => {
    const currentRun = isStreamThread && stream.isLoading ? streamMessages : (mergedForDisplay ?? lastMergedForThread ?? streamMessages ?? currentThread?.values?.messages ?? []);
    if (stream.isLoading && persistedMessagesRef.current.length > 0 && currentRun.length > 0) {
      const prev = persistedMessagesRef.current;
      const currentIds = new Set((currentRun as { id?: string }[]).map((m) => m.id));
      const prevOnly = prev.filter((m) => !currentIds.has(m.id));
      return [...prevOnly, ...currentRun];
    }
    return currentRun;
  }, [isStreamThread, stream.isLoading, streamMessages, mergedForDisplay, lastMergedForThread, currentThread?.values?.messages]);

  // When campaign has reply_text but last AI message lacks text, inject it (e.g. "Fill in YouTube video ID")
  const messages: ThreadMessage[] = useMemo(() => {
    const replyText = currentThread?.campaignState?.reply_text?.trim();
    if (!replyText || !baseMessages.length) return baseMessages;
    const lastIdx = baseMessages.length - 1;
    const last = baseMessages[lastIdx];
    if ((last as { type?: string }).type !== "ai") return baseMessages;
    const content = last.content;
    const hasText =
      typeof content === "string" ? !!content?.trim() : Array.isArray(content) && content.some((b: unknown) => typeof b === "object" && b != null && (b as { type?: string }).type === "text" && (b as { text?: string }).text);
    if (hasText) return baseMessages;
    const textBlock: ContentBlock = { type: "text", text: replyText };
    const toolBlocks = Array.isArray(content)
      ? content.filter((b): b is ContentBlock => typeof b === "object" && b != null && (b as { type?: string }).type === "tool_use")
      : [];
    const newContent: ThreadMessage["content"] = toolBlocks.length > 0 ? [...toolBlocks, textBlock] : replyText;
    return [
      ...baseMessages.slice(0, lastIdx),
      { ...last, content: newContent },
    ];
  }, [baseMessages, currentThread?.campaignState?.reply_text]);

  const isStreaming = stream.isLoading;

  if (prevLoadingRefForAccum.current && !stream.isLoading) {
    prevLoadingRefForAccum.current = false;
  } else if (!prevLoadingRefForAccum.current && stream.isLoading) {
    const toPersist = lastMergedMessagesRef.current ?? persistedMessagesRef.current;
    if (toPersist.length > 0) persistedMessagesRef.current = toPersist;
    accumulatedToolContentRef.current.clear();
    accumulatedByAiIndexRef.current = [];
    lastMergedMessagesRef.current = null;
    lastMergedThreadIdRef.current = null;
    prevLoadingRefForAccum.current = true;
  }
  useEffect(() => {
    if (!stream.isLoading) return;
    const byId = accumulatedToolContentRef.current;
    const byIndex = [...accumulatedByAiIndexRef.current];
    let aiIdx = 0;
    streamMessages.forEach((msg) => {
      if ((msg as { type?: string }).type !== "ai") return;
      const c = msg.content;
      if (Array.isArray(c) && extractToolBlocksFromContent(c).length > 0) {
        byId.set(msg.id ?? `ai-${aiIdx}`, c);
        byIndex[aiIdx] = c;
      }
      aiIdx += 1;
    });
    accumulatedByAiIndexRef.current = byIndex;
  }, [streamMessages, stream.isLoading]);

  const currentThinkingSteps = currentThread?.thinkingSteps ?? [];

  // Persist stream messages (including tool calls) into thread when stream finishes, so tool calls don't vanish.
  // Also persist thinking steps on the last AI message and clear from thread.
  const prevLoadingRef = React.useRef<boolean>(stream.isLoading);
  const streamMessagesRef = React.useRef<ThreadMessage[]>([]);
  streamMessagesRef.current = streamMessages;
  useEffect(() => {
    const justFinished = prevLoadingRef.current && !stream.isLoading;
    prevLoadingRef.current = stream.isLoading;
    if (!justFinished || !currentThreadId) return;
    const latest = streamMessagesRef.current;
    if (!latest?.length) return;
    const accumulated: AccumulatedToolContent = {
      byId: accumulatedToolContentRef.current,
      byAiIndex: accumulatedByAiIndexRef.current,
    };
    const newMessages = applyThinkingStepsToLastAi(
      mergeAccumulatedToolBlocks(latest, accumulated),
      currentThread?.thinkingSteps ?? []
    );
    accumulatedToolContentRef.current.clear();
    accumulatedByAiIndexRef.current = [];
    lastMergedMessagesRef.current = newMessages;
    lastMergedThreadIdRef.current = currentThreadId;
    persistedMessagesRef.current = newMessages;
    setThreads(prev => prev.map(t => {
      if (t.thread_id !== currentThreadId) return t;
      return {
        ...t,
        values: { ...(t.values || {}), messages: newMessages },
        thinkingSteps: [],
        updated_at: new Date().toISOString(),
      };
    }));
  }, [stream.isLoading, currentThreadId, currentThread?.thinkingSteps]);

  // Sync campaign state from stream.values into current thread (backend sends campaign_draft etc. at top level of values)
  useEffect(() => {
    if (stream.isLoading) return;
    const vals = stream.values != null && typeof stream.values === "object" ? (stream.values as Record<string, unknown>) : undefined;
    if (!currentThreadId || !vals) return;
    const hasCampaignState = "campaign_draft" in vals || "reply_text" in vals || "current_questions_schema" in vals;
    if (!hasCampaignState) return;
    const campaignState = vals as CampaignSetupState;
    setThreads(prev => prev.map(t =>
      t.thread_id === currentThreadId
        ? { ...t, campaignState, updated_at: new Date().toISOString() }
        : t
    ));
  }, [currentThreadId, stream.values, stream.isLoading]);

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

      // Merge with existing runtime state; preserve local messages with tool blocks when API has fewer
      const countToolBlocks = (msgs: ThreadMessage[] | undefined) =>
        (msgs ?? []).reduce((n, m) => {
          const c = m.content;
          return n + (Array.isArray(c) ? c.filter((b: unknown) => typeof b === "object" && b != null && (b as { type?: string }).type === "tool_use").length : 0);
        }, 0);
      setThreads(prev => {
        const existingByThread = new Map(prev.map(t => [t.thread_id, t]));
        return threadList.map(apiThread => {
          const existing = existingByThread.get(apiThread.thread_id);
          const existingToolCount = countToolBlocks(existing?.values?.messages);
          const apiToolCount = countToolBlocks(apiThread.values?.messages);
          const preserveMessages = existingToolCount > apiToolCount && existing?.values?.messages;
          const values = preserveMessages
            ? { ...(apiThread.values ?? {}), messages: existing!.values!.messages }
            : apiThread.values;
          return {
            ...apiThread,
            values,
            isStreaming: existing?.isStreaming || false,
            thinkingSteps: existing?.thinkingSteps ?? [],
            campaignState: existing?.campaignState,
          };
        });
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
  }, []);

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

      // Sync context state from selected thread's metadata
      const selectedThread = threads.find(t => t.thread_id === threadId);
      if (selectedThread?.metadata) {
        const metadata = selectedThread.metadata as ThreadMetaData;
        
        // Update assistant scope from thread metadata
        setAssistantScopeState(prev => ({
          ...prev,
          accountId: metadata.account_id?.toString() ?? null,
          channelId: metadata.channel_id?.toString() ?? null,
          profileId: metadata.profile_id ?? null,
          marketplace: metadata.platform ?? null,
        }));

        // Update assistant intent from thread metadata
        if (metadata.intent && (metadata.intent === "analyze" || metadata.intent === "create_campaign")) {
          setAssistantIntent(metadata.intent);
        }

        // Update selected graph ID from thread metadata
        if (metadata.graph_id && (metadata.graph_id === "chat" || metadata.graph_id === "campaign_setup")) {
          setSelectedGraphId(metadata.graph_id);
        }
      }
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

  // Delete thread from UI and persist deletion to backend
  const deleteThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(t => t.thread_id !== threadId));
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
    threadsService.deleteThread(threadId).catch((err) =>
      console.warn("[Assistant] Failed to delete thread on backend:", err)
    );
  }, [currentThreadId]);

  // Update thread title (local state + persist to backend)
  const updateThreadTitle = useCallback((threadId: string, title: string) => {
    setThreads(prev => prev.map(t =>
      t.thread_id === threadId
        ? { ...t, metadata: { ...t.metadata, title } as ThreadMetaData, updated_at: new Date().toISOString() }
        : t
    ));
    const updatedMetadata: Partial<ThreadMetaData> = { title };
    threadsService.updateThread(threadId, { metadata: updatedMetadata }).catch((err) =>
      console.warn("[Assistant] Failed to persist thread title:", err)
    );
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

  // Main send message (useStream path)
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !user?.id || !currentAssistantId || !streamApiUrl) return;

    const trimmed = content.trim();
    const titleFromContent = trimmed.length > 50 ? trimmed.slice(0, 47) + "..." : trimmed;

    // Name the chat from the first message: for new thread, store for onThreadId; for existing thread with no title, set now
    if (!currentThreadId) {
      pendingThreadTitleRef.current = trimmed;
    } else {
      const thread = threads.find(t => t.thread_id === currentThreadId);
      if (thread && !thread.metadata?.title) {
        const updatedMetadata: ThreadMetaData = { ...thread.metadata, title: titleFromContent } as ThreadMetaData;
        setThreads(prev => prev.map(t =>
          t.thread_id === currentThreadId
            ? { ...t, metadata: updatedMetadata, updated_at: new Date().toISOString() }
            : t
        ));
        threadsService.updateThread(currentThreadId, { metadata: { title: titleFromContent } }).catch((err) =>
          console.warn("[Assistant] Failed to persist thread title:", err)
        );
      }
    }

    const accountIdNum = effectiveAccountId ? parseInt(effectiveAccountId, 10) : undefined;
    const channelIdNum = effectiveChannelId ? parseInt(effectiveChannelId, 10) : undefined;

    setInputValue("");

    // Clear thinking steps when starting new turn so next run gets a fresh list
    if (currentThreadId) {
      setThreads(prev => prev.map(t =>
        t.thread_id === currentThreadId ? { ...t, thinkingSteps: [] } : t
      ));
    }

    const humanMessage = { type: "human" as const, content, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
    const configurable: Record<string, unknown> = {
      user_id: user.id,
      account_id: accountIdNum ?? effectiveAccountId ?? undefined,
      integration_id: channelIdNum ?? effectiveChannelId ?? undefined,
      profile_id: effectiveProfileId ?? undefined,
      marketplace: effectiveMarketplace ?? undefined,
      intent: assistantIntent ?? "analyze",
      ...(currentThreadId ? { thread_id: currentThreadId } : {}),
    };
    if (effectiveProfileName != null || effectiveMarketplace != null) {
      configurable.profile = {
        id: effectiveProfileId,
        name: effectiveProfileName,
        channel_type: effectiveMarketplace,
      };
    }

    const contextMetadata: ContextMetadata = {
      user_id: user.id,
      account_id: accountIdNum,
      channel_id: channelIdNum,
      profile_id: effectiveProfileId ?? undefined,
      workspace_id: user?.workspace?.id,
      folder_id: undefined, // Add when available
      session_id: undefined, // Add when available
      platform: effectiveMarketplace ?? undefined,
      auth_token: "123123123", // Consider making this dynamic
      intent: assistantIntent ?? "analyze",
      assistant_id: currentAssistantId,
      graph_id: selectedGraphId,
    };

    try {
      await stream.submit(
        { messages: [humanMessage] },
        {
          metadata: contextMetadata,
          config: { recursion_limit: 75, configurable },
          streamResumable: true,
          streamSubgraphs: true,
          onDisconnect: "continue",
          streamMode: ["messages-tuple", "updates", "values"],
          threadId: currentThreadId ?? undefined,
          optimisticValues: (prev: { messages?: unknown[] }) => ({
            ...prev,
            messages: [...(prev.messages ?? []), humanMessage],
          }),
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [user?.id, currentAssistantId, streamApiUrl, effectiveAccountId, effectiveChannelId, effectiveProfileId, effectiveProfileName, effectiveMarketplace, assistantIntent, currentThreadId, threads, stream]);

  const cancelRun = useCallback(async () => {
    try {
      await stream.stop();
    } catch (error) {
      console.error("Failed to stop stream:", error);
    }
  }, [stream]);

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