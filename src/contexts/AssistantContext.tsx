import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { streamPixisChat, type PixisTimelineItem, type CampaignDraftData } from "../services/ai/pixisChat";
import {
  pixisAiSessionsService,
  type PixisSession,
  type PixisThreadHistory,
} from "../services/ai/pixisAiSessions";
import {
  getSessionActiveDraft,
  draftToCampaignState,
} from "../services/ai/assistantDrafts";
import {
  deriveCampaignStateFromContent,
  isEventStream,
  extractDisplayContentFromEvents,
  eventsToTimeline,
} from "../utils/chartJsonParser";

export const ASSISTANT_PANEL_WIDTH = "550px";
export const ASSISTANT_PANEL_VIEW: "fixed" | "floating" = "floating";

export interface SuggestedPrompt {
  id: string;
  text: string;
}

export interface AssistantScope {
  accountId: string | null;
  channelId: string | null;
  profileId: number | null;
  profileName?: string | null;
  marketplace?: string | null;
}

/** Session with runtime state (messages, etc.) */
export interface SessionWithMessages extends PixisSession {
  messages?: ChatMessage[];
  campaignState?: CampaignDraftData;
}

export type ChatMessage =
  | { type: "human"; id: string; content: string }
  | {
      type: "ai";
      id: string;
      content: string;
      timeline: PixisTimelineItem[];
      isStreaming: boolean;
      error?: string;
    };

interface AssistantContextType {
  isOpen: boolean;
  toggleAssistant: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;

  sessions: SessionWithMessages[];
  currentSession: SessionWithMessages | null;
  currentSessionId: string | null;

  sendMessage: (content: string) => Promise<void>;
  cancelRun: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => void;

  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  isLoadingSessions: boolean;
  deletingSessionId: string | null;
  suggestedPrompts: SuggestedPrompt[];

  messages: ChatMessage[];
  isStreaming: boolean;

  assistantScope: AssistantScope;
  setAssistantScope: (updates: Partial<AssistantScope>) => void;

  /** Campaign state from last AI response (e.g. from campaign-setup block) */
  campaignState: CampaignDraftData | undefined;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const CHAT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "1", text: "Why is my ROAS dropping?" },
  { id: "2", text: "Suggest budget optimization" },
  { id: "3", text: "Analyze ACOS trends" },
  { id: "4", text: "Compare campaign efficiency" },
  { id: "5", text: "Create campaign" },
];

function msgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const AssistantProvider: React.FC<{
  children: ReactNode;
  accountId?: string;
  channelId?: string;
}> = ({ children, accountId: propAccountId, channelId: propChannelId }) => {
  const { user, getAccessToken } = useAuth();

  const [sessions, setSessions] = useState<SessionWithMessages[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pendingConversation, setPendingConversation] = useState<{
    messages: ChatMessage[];
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const [assistantScope, setAssistantScopeState] = useState<AssistantScope>({
    accountId: null,
    channelId: null,
    profileId: null,
    profileName: null,
    marketplace: null,
  });

  const setAssistantScope = useCallback((updates: Partial<AssistantScope>) => {
    setAssistantScopeState((prev) => ({ ...prev, ...updates }));
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sendingNewSessionRef = useRef(false);
  const streamingSessionIdRef = useRef<string | null>(null);
  const pendingNewSessionRef = useRef<{ id: string; cursor_session_id: string } | null>(null);
  const isNewSessionFlowRef = useRef(false);
  const sessionsRef = useRef<SessionWithMessages[]>([]);
  sessionsRef.current = sessions;

  useEffect(() => {
    if (
      assistantScope.accountId &&
      assistantScope.channelId &&
      assistantScope.profileId
    ) {
      // Ready to chat
    }
  }, [assistantScope.accountId, assistantScope.channelId, assistantScope.profileId]);

  const effectiveAccountId = assistantScope.accountId ?? propAccountId ?? null;
  const effectiveChannelId = assistantScope.channelId ?? propChannelId ?? null;
  const effectiveProfileId = assistantScope.profileId;
  const effectiveMarketplace = assistantScope.marketplace ?? null;

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) ?? null;

  const messages: ChatMessage[] =
    pendingConversation?.messages ?? currentSession?.messages ?? [];
  const isStreaming =
    messages.length > 0 &&
    messages[messages.length - 1]?.type === "ai" &&
    (messages[messages.length - 1] as Extract<ChatMessage, { type: "ai" }>)
      .isStreaming;

  // Helper to extract campaign state from messages
  const extractCampaignStateFromMessages = (msgs: ChatMessage[], fromSession?: CampaignDraftData): CampaignDraftData | undefined => {
    let fromEvent: CampaignDraftData | undefined;
    for (const msg of [...msgs].reverse()) {
      if (msg.type === "ai" && "timeline" in msg && msg.timeline) {
        const draftEvent = msg.timeline.find(
          (item) => item.type === "campaign-draft"
        );
        if (draftEvent && draftEvent.type === "campaign-draft") {
          fromEvent = draftEvent.data;
          break;
        }
      }
    }
    
    const lastAi = [...msgs].reverse().find((m) => m.type === "ai");
    const content = lastAi?.type === "ai" ? (lastAi.content || "") : "";
    const derived = content ? deriveCampaignStateFromContent(content) : null;

    if (!fromSession && !fromEvent && !derived) return undefined;
    return {
      ...fromSession,
      ...fromEvent,
      ...derived,
    } as CampaignDraftData;
  };

  const initialcampaignState = extractCampaignStateFromMessages(messages, currentSession?.campaignState as CampaignDraftData | undefined);
  const [campaignState, setCampaignState] = useState<CampaignDraftData | undefined>(initialcampaignState);

  const loadSessions = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || !effectiveAccountId) return;
    const accountIdNum = parseInt(effectiveAccountId, 10);
    if (Number.isNaN(accountIdNum)) return;

    setIsLoadingSessions(true);
    try {
      const { sessions: list } = await pixisAiSessionsService.list(
        accountIdNum,
        token,
        { limit: 50 }
      );
      setSessions((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        const fromApi = list.map((api) => {
          const existing = byId.get(api.id);
          return {
            ...api,
            messages: existing?.messages,
            campaignState: existing?.campaignState,
          } as SessionWithMessages;
        });
        return fromApi;
      });
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [effectiveAccountId, getAccessToken]);

  useEffect(() => {
    if (isOpen && effectiveAccountId && user?.id) {
      loadSessions();
    }
  }, [isOpen, effectiveAccountId, user?.id, loadSessions]);

  useEffect(() => {
    if (propAccountId || propChannelId) {
      setAssistantScopeState((prev) => ({
        ...prev,
        ...(propAccountId && { accountId: propAccountId }),
        ...(propChannelId && { channelId: propChannelId }),
      }));
    }
  }, [propAccountId, propChannelId]);

  const selectSession = useCallback(
    async (sessionId: string) => {
      const sel = sessionsRef.current.find((s) => s.id === sessionId);
      setCurrentSessionId(sessionId);
      if (sel) {
        setAssistantScopeState((prev) => {
          const nextAccountId = sel.account_id?.toString() ?? prev.accountId;
          const nextChannelId = sel.channel_id?.toString() ?? prev.channelId;
          const nextProfileId = (sel.profile_id != null ? Number(sel.profile_id) : undefined) ?? prev.profileId;
          if (prev.accountId === nextAccountId && prev.channelId === nextChannelId && prev.profileId === nextProfileId) {
            return prev;
          }
          return {
            ...prev,
            accountId: nextAccountId,
            channelId: nextChannelId,
            profileId: nextProfileId,
          };
        });
      }
      const existing = sessionsRef.current.find((s) => s.id === sessionId);
      const needsHistory = !existing?.messages?.length;

      if (!needsHistory) return;

      setIsLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) return;

        const [{ history }, activeDraft] = await Promise.all([
          pixisAiSessionsService.getHistory(sessionId, token),
          getSessionActiveDraft(sessionId, token).catch(() => null),
        ]);
        const msgs: ChatMessage[] = [];
        for (const turn of history as PixisThreadHistory[]) {
          if (turn.user_query) {
            msgs.push({
              type: "human",
              id: `h-${turn.id}`,
              content: turn.user_query,
            });
          }
          if (turn.final_message) {
            const isEvents = isEventStream(turn.final_message);
            let displayContent: string;
            let timeline: PixisTimelineItem[];
            if (isEvents) {
              const events = JSON.parse(turn.final_message) as unknown[];
              displayContent = extractDisplayContentFromEvents(events);
              timeline = eventsToTimeline(events) as PixisTimelineItem[];
            } else {
              displayContent = turn.final_message;
              timeline = [{ type: "text", content: displayContent }];
            }
            msgs.push({
              type: "ai",
              id: `a-${turn.id}`,
              content: displayContent,
              timeline,
              isStreaming: false,
            });
          }
        }
        
        // Use helper to extract campaign state from messages + activeDraft
        const initialDraft = activeDraft ? draftToCampaignState(activeDraft) : undefined;
        const _campaignState = extractCampaignStateFromMessages(msgs, initialDraft);
        setCampaignState(_campaignState);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: msgs, campaignState: _campaignState }
              : s
          )
        );
      } catch (err) {
        console.error("Failed to select session:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [getAccessToken]
  );

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setPendingConversation(null);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      setDeletingSessionId(sessionId);
      try {
        const token = await getAccessToken();
        if (token) {
          await pixisAiSessionsService.delete(sessionId, token);
        }
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
        }
      } catch (err) {
        console.warn("Failed to delete session:", err);
      } finally {
        setDeletingSessionId(null);
      }
    },
    [currentSessionId, getAccessToken]
  );

  const updateSessionTitle = useCallback(
    (sessionId: string, title: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, title, updated_at: new Date().toISOString() }
            : s
        )
      );
      getAccessToken().then((token) => {
        if (token) {
          pixisAiSessionsService
            .patch(sessionId, { title }, token)
            .catch((err) =>
              console.warn("Failed to update session title:", err)
            );
        }
      });
    },
    [getAccessToken]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const token = await getAccessToken();
      if (!token || !user?.id) return;

      const trimmed = content.trim();
      if (!trimmed) return;

      const accountIdNum = effectiveAccountId
        ? parseInt(effectiveAccountId, 10)
        : undefined;
      const channelIdNum = effectiveChannelId
        ? parseInt(effectiveChannelId, 10)
        : undefined;

      if (!accountIdNum) return;

      setInputValue("");
      abortControllerRef.current = new AbortController();

      const humanMsg: ChatMessage = {
        type: "human",
        id: msgId(),
        content: trimmed,
      };

      const aiMsg: Extract<ChatMessage, { type: "ai" }> = {
        type: "ai",
        id: msgId(),
        content: "",
        timeline: [],
        isStreaming: true,
      };

      const appendToCurrent = (updates: Partial<SessionWithMessages>) => {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId ? { ...s, ...updates } : s
          )
        );
      };

      if (currentSessionId) {
        streamingSessionIdRef.current = currentSessionId;
        const session = sessions.find((s) => s.id === currentSessionId);
        const msgs = [...(session?.messages ?? []), humanMsg, { ...aiMsg }];
        appendToCurrent({ messages: msgs });
      } else {
        sendingNewSessionRef.current = true;
        isNewSessionFlowRef.current = true;
        streamingSessionIdRef.current = null;
        setPendingConversation({ messages: [humanMsg, { ...aiMsg }] });
      }

      setIsLoading(true);

      const timelineRef = { current: [...aiMsg.timeline] };
      const updateTimeline = (item: PixisTimelineItem) => {
        if (item.type === "text") {
          const last = timelineRef.current[timelineRef.current.length - 1];
          if (last?.type === "text") {
            timelineRef.current[timelineRef.current.length - 1] = item;
          } else {
            timelineRef.current.push(item);
          }
        } else if (item.type === "thinking" && item.content !== undefined) {
          const last = timelineRef.current[timelineRef.current.length - 1];
          if (last?.type === "thinking") {
            timelineRef.current[timelineRef.current.length - 1] = item;
          } else {
            timelineRef.current.push(item);
          }
        } else {
          timelineRef.current.push(item);
        }
        if (streamingSessionIdRef.current === null) {
          setPendingConversation((p) => {
            if (!p) return p;
            const msgs = p.messages;
            const last = msgs[msgs.length - 1];
            if (last?.type !== "ai" || !last.isStreaming) return p;
            return {
              messages: [
                ...msgs.slice(0, -1),
                { ...last, timeline: [...timelineRef.current] },
              ],
            };
          });
        } else {
          setSessions((prev) =>
            prev.map((s) => {
              const msgs = s.messages ?? [];
              const last = msgs[msgs.length - 1];
              if (
                last?.type === "ai" &&
                last.isStreaming &&
                s.id === streamingSessionIdRef.current
              ) {
                return {
                  ...s,
                  messages: [
                    ...msgs.slice(0, -1),
                    { ...last, timeline: [...timelineRef.current] },
                  ],
                };
              }
              return s;
            })
          );
        }
      };

      try {
        await streamPixisChat(
          {
            query: trimmed,
            session_id: (sessions.find((s) => s.id === currentSessionId) as
              | (PixisSession & { cursor_session_id?: string })
              | undefined)?.cursor_session_id ?? currentSessionId ?? undefined,
            account_id: accountIdNum,
            channel_id: channelIdNum,
        profile_id: effectiveProfileId != null ? String(effectiveProfileId) : undefined,
        workspace_id: user?.workspace?.id ?? undefined,
            user_id: user?.id != null ? String(user.id) : undefined,
            platform: effectiveMarketplace ?? undefined,
          },
          token,
          {
            onInit: (data) => {
              const cursorSid = data.session_id;
              const dbId = data.session_db_id;
              if (cursorSid && sendingNewSessionRef.current) {
                // Store real ids in ref for onResult; keep streamingSessionIdRef as __pending__
                // so onMessage/onTimelineItem find the session (React may not have applied replacement yet)
                const id = dbId ?? cursorSid;
                pendingNewSessionRef.current = { id, cursor_session_id: cursorSid };
                sendingNewSessionRef.current = false;
              }
            },
            onMessage: (text) => {
              if (streamingSessionIdRef.current === null) {
                setPendingConversation((p) => {
                  if (!p) return p;
                  const msgs = p.messages;
                  const last = msgs[msgs.length - 1];
                  if (last?.type !== "ai" || !last.isStreaming) return p;
                  return {
                    messages: [
                      ...msgs.slice(0, -1),
                      { ...last, content: text },
                    ],
                  };
                });
              } else {
                setSessions((prev) =>
                  prev.map((s) => {
                    const msgs = s.messages ?? [];
                    const last = msgs[msgs.length - 1];
                    if (
                      last?.type === "ai" &&
                      last.isStreaming &&
                      s.id === streamingSessionIdRef.current
                    ) {
                      return {
                        ...s,
                        messages: [
                          ...msgs.slice(0, -1),
                          { ...last, content: text },
                        ],
                      };
                    }
                    return s;
                  })
                );
              }
            },
            onTimelineItem: updateTimeline,
            onCampaignDraft: (data) => {
              setCampaignState(data);
            },
            onResult: (ev) => {
              const finalContent = ev.full_message ?? "";
              const pending = pendingNewSessionRef.current;
              const realId = pending?.id ?? ev.session_db_id ?? ev.session_id ?? ev.sessionId;

              if (isNewSessionFlowRef.current) {
                setPendingConversation((p) => {
                  if (!p) return p;
                  const msgs = p.messages;
                  const last = msgs[msgs.length - 1];
                  if (last?.type !== "ai") return p;
                  const timeline = [...(last.timeline ?? [])];
                  const lastTl = timeline[timeline.length - 1];
                  if (lastTl?.type === "text") {
                    timeline[timeline.length - 1] = { type: "text", content: finalContent };
                  } else if (finalContent) {
                    timeline.push({ type: "text", content: finalContent });
                  }
                  const finalizedMessages: ChatMessage[] = [
                    ...msgs.slice(0, -1),
                    { ...last, content: finalContent, timeline, isStreaming: false },
                  ];
                  const newSession: SessionWithMessages = {
                    id: realId ?? `new-${Date.now()}`,
                    cursor_session_id: pending?.cursor_session_id ?? null,
                    user_id: user?.id?.toString() ?? null,
                    workspace_id: user?.workspace?.id ?? null,
                    account_id: accountIdNum ?? null,
                    channel_id: channelIdNum ?? null,
                    profile_id: effectiveProfileId != null ? String(effectiveProfileId) : null,
                    created_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    title: (msgs[0]?.type === "human" ? msgs[0].content : "New chat").slice(0, 50),
                    messages: finalizedMessages,
                  };
                  setSessions((prev) => {
                    const withoutDup = realId ? prev.filter((s) => s.id !== realId) : prev;
                    return [...withoutDup, newSession];
                  });
                  setCurrentSessionId(realId ?? newSession.id);
                  sendingNewSessionRef.current = false;
                  isNewSessionFlowRef.current = false;
                  pendingNewSessionRef.current = null;
                  return null;
                });
              } else {
                setSessions((prev) => {
                  const streamId = streamingSessionIdRef.current;
                  const target = prev.find((s) => {
                    if (s.id !== streamId) return false;
                    const m = s.messages ?? [];
                    const last = m[m.length - 1];
                    return last?.type === "ai" && last.isStreaming;
                  });
                  if (!target) return prev;
                  const msgs = target.messages ?? [];
                  const last = msgs[msgs.length - 1];
                  const aiLast = last?.type === "ai" ? last : null;
                  if (!aiLast) return prev;
                  const timeline = [...(aiLast.timeline ?? [])];
                  const lastTl = timeline[timeline.length - 1];
                  if (lastTl?.type === "text") {
                    timeline[timeline.length - 1] = { type: "text", content: finalContent };
                  } else if (finalContent) {
                    timeline.push({ type: "text", content: finalContent });
                  }
                  const updated = {
                    ...target,
                    messages: [
                      ...msgs.slice(0, -1),
                      { ...aiLast, content: finalContent, timeline, isStreaming: false },
                    ],
                    updated_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString(),
                  };
                  return prev.map((s) => (s.id === target.id ? updated : s));
                });
              }
            },
            onError: (err) => {
              if (isNewSessionFlowRef.current) {
                setPendingConversation((p) => {
                  if (!p) return p;
                  const msgs = p.messages;
                  const last = msgs[msgs.length - 1];
                  if (last?.type !== "ai" || !last.isStreaming) return p;
                  return {
                    messages: [
                      ...msgs.slice(0, -1),
                      { ...last, isStreaming: false, error: err.message },
                    ],
                  };
                });
                isNewSessionFlowRef.current = false;
              } else {
                setSessions((prev) =>
                  prev.map((s) => {
                    const msgs = s.messages ?? [];
                    const last = msgs[msgs.length - 1];
                    if (
                      last?.type === "ai" &&
                      last.isStreaming &&
                      s.id === streamingSessionIdRef.current
                    ) {
                      return {
                        ...s,
                        messages: [
                          ...msgs.slice(0, -1),
                          { ...last, isStreaming: false, error: err.message },
                        ],
                      };
                    }
                    return s;
                  })
                );
              }
            },
          },
          { signal: abortControllerRef.current?.signal }
        );

      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          if (isNewSessionFlowRef.current) {
            setPendingConversation((p) => {
              if (!p) return p;
              const msgs = p.messages;
              const last = msgs[msgs.length - 1];
              if (last?.type !== "ai" || !last.isStreaming) return p;
              return {
                messages: [
                  ...msgs.slice(0, -1),
                  { ...last, isStreaming: false, error: (e as Error).message },
                ],
              };
            });
            isNewSessionFlowRef.current = false;
          } else {
            setSessions((prev) =>
              prev.map((s) => {
                const msgs = s.messages ?? [];
                const last = msgs[msgs.length - 1];
                if (
                  last?.type === "ai" &&
                  last.isStreaming &&
                  s.id === streamingSessionIdRef.current
                ) {
                  return {
                    ...s,
                    messages: [
                      ...msgs.slice(0, -1),
                      { ...last, isStreaming: false, error: (e as Error).message },
                    ],
                  };
                }
                return s;
              })
            );
          }
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        sendingNewSessionRef.current = false;
        streamingSessionIdRef.current = null;
      }
    },
    [
      user?.id,
      user?.workspace?.id,
      effectiveAccountId,
      effectiveChannelId,
      effectiveProfileId,
      effectiveMarketplace,
      currentSessionId,
      sessions,
      getAccessToken,
    ]
  );

  const cancelRun = useCallback(async () => {
    abortControllerRef.current?.abort();
  }, []);

  const toggleAssistant = useCallback(() => setIsOpen((prev) => !prev), []);
  const openAssistant = useCallback(() => setIsOpen(true), []);
  const closeAssistant = useCallback(() => setIsOpen(false), []);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        toggleAssistant,
        openAssistant,
        closeAssistant,
        sessions,
        currentSession,
        currentSessionId,
        sendMessage,
        cancelRun,
        selectSession,
        startNewSession,
        deleteSession,
        updateSessionTitle,
        inputValue,
        setInputValue,
        isLoading,
        isLoadingSessions,
        deletingSessionId,
        suggestedPrompts: CHAT_SUGGESTED_PROMPTS,
        messages,
        isStreaming,
        assistantScope,
        setAssistantScope,
        campaignState,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- context file exports provider + hook
export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
};
