import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
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
  /** Multi-select: one or more profiles for cross-platform analysis. When set, overrides single profileId. */
  selectedProfiles?: Array<{
    accountId: string;
    channelId: string;
    profileId: number;
    profileName?: string | null;
    marketplace?: string | null;
  }>;
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
  /** True when keepalive received during streaming (long tool run); show "Working on request..." */
  workingOnRequest: boolean;

  assistantScope: AssistantScope;
  setAssistantScope: (updates: Partial<AssistantScope>) => void;

  /** Campaign state from last AI response (e.g. from campaign-setup block) */
  campaignState: CampaignDraftData | undefined;

  /** Manually trigger session list reload (e.g. when chat history sidebar expands) */
  loadSessions: () => Promise<void>;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const CHAT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "1", text: "Why is my ROAS dropping?" },
  { id: "2", text: "Suggest budget optimization" },
  { id: "3", text: "Analyze ACOS trends" },
  { id: "4", text: "Compare campaign efficiency" },
  { id: "5", text: "Create campaign" },
];

/** Set to "stream-json" | "stream-json-partial" | "json" to override; undefined = use backend default (stream-json-partial). */
const OUTPUT_FORMAT_FOR_TESTING: string | undefined = undefined;

function msgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const AssistantProvider: React.FC<{
  children: ReactNode;
  accountId?: string;
  channelId?: string;
}> = ({ children, accountId: propAccountId, channelId: propChannelId }) => {
  const { user, getAccessToken } = useAuth();
  const location = useLocation();
  const isChatPage = location.pathname === "/chat";

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
  const [workingOnRequest, setWorkingOnRequest] = useState(false);

  const [assistantScope, setAssistantScopeState] = useState<AssistantScope>({
    accountId: null,
    channelId: null,
    profileId: null,
    profileName: null,
    marketplace: null,
    selectedProfiles: [],
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
  const campaignStateRef = useRef<CampaignDraftData | undefined>(undefined);

  useEffect(() => {
    if (
      assistantScope.accountId &&
      assistantScope.channelId &&
      assistantScope.profileId
    ) {
      // Ready to chat (single profile)
    }
    if (assistantScope.selectedProfiles && assistantScope.selectedProfiles.length > 0) {
      // Ready to chat (multi-profile)
    }
  }, [assistantScope.accountId, assistantScope.channelId, assistantScope.profileId, assistantScope.selectedProfiles]);

  const effectiveAccountId = assistantScope.accountId ?? propAccountId ?? null;
  const effectiveChannelId = assistantScope.channelId ?? propChannelId ?? null;
  const effectiveProfileId = assistantScope.profileId;
  const effectiveMarketplace = assistantScope.marketplace ?? null;
  /** When set, use for multi-profile analyze; otherwise single profile from effective* fields. */
  const effectiveSelectedProfiles = assistantScope.selectedProfiles?.length
    ? assistantScope.selectedProfiles
    : null;

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
    if (!token) return;

    setIsLoadingSessions(true);
    try {
      // Always fetch all user sessions (backend ignores account_id for listing)
      const { sessions: list } = await pixisAiSessionsService.list(token, {
        limit: 50,
      });
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
  }, [getAccessToken]);

  useEffect(() => {
    if ((isOpen || isChatPage) && user?.id) {
      loadSessions();
    }
  }, [isOpen, isChatPage, user?.id, loadSessions]);

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
          const oneProfile = nextAccountId && nextChannelId && nextProfileId != null
            ? [{ accountId: nextAccountId, channelId: nextChannelId, profileId: nextProfileId, profileName: prev.profileName ?? undefined, marketplace: prev.marketplace ?? undefined }]
            : [];
          return {
            ...prev,
            accountId: nextAccountId,
            channelId: nextChannelId,
            profileId: nextProfileId,
            selectedProfiles: oneProfile,
          };
        });
      }
      const existing = sessionsRef.current.find((s) => s.id === sessionId);
      const needsHistory = !existing?.messages?.length;

      if (!needsHistory) {
        const synced = extractCampaignStateFromMessages(
          existing?.messages ?? [],
          existing?.campaignState as CampaignDraftData | undefined
        );
        setCampaignState(synced);
        return;
      }

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
    setCampaignState(undefined);
    campaignStateRef.current = undefined;
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

      let accountIdNum: number | undefined = effectiveAccountId
        ? parseInt(effectiveAccountId, 10)
        : undefined;
      let channelIdNum: number | undefined = effectiveChannelId
        ? parseInt(effectiveChannelId, 10)
        : undefined;
      let profileIdForReq: string | undefined = effectiveProfileId != null ? String(effectiveProfileId) : undefined;
      let platformForReq: string | undefined = effectiveMarketplace ?? undefined;
      let platformsForReq: Array<{ platform: string; profile_id: string; channel_id: number; account_id: number }> | undefined;

      if (effectiveSelectedProfiles?.length) {
        platformsForReq = effectiveSelectedProfiles
          .map((p) => ({
            platform: (p.marketplace ?? "google").toLowerCase(),
            profile_id: String(p.profileId),
            channel_id: parseInt(p.channelId, 10),
            account_id: parseInt(p.accountId, 10),
          }))
          .filter((p) => !Number.isNaN(p.channel_id) && !Number.isNaN(p.account_id));
        if (platformsForReq.length === 0) return;
        const first = platformsForReq[0];
        accountIdNum = first.account_id;
        channelIdNum = first.channel_id;
        profileIdForReq = first.profile_id;
        platformForReq = first.platform;
      } else if (!accountIdNum) {
        return;
      }

      setInputValue("");
      setWorkingOnRequest(false);
      abortControllerRef.current = new AbortController();
      setCampaignState(undefined);
      campaignStateRef.current = undefined;

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
          const arr = timelineRef.current;
          const lastIdx = arr.length - 1;
          const last = arr[lastIdx];
          if (last?.type === "text") {
            arr[lastIdx] = item; // same message growing — update in place
          } else {
            // Last is tool_call/thinking: append new text block to preserve server order (text → tool → text → tool)
            timelineRef.current = [...arr, item] as typeof timelineRef.current;
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
            profile_id: profileIdForReq,
            workspace_id: user?.workspace?.id ?? undefined,
            user_id: user?.id != null ? String(user.id) : undefined,
            platform: platformForReq,
            ...(platformsForReq && platformsForReq.length > 0 ? { platforms: platformsForReq } : {}),
            ...(OUTPUT_FORMAT_FOR_TESTING && { output_format: OUTPUT_FORMAT_FOR_TESTING }),
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
            onKeepalive: () => setWorkingOnRequest(true),
            onCampaignDraft: (data) => {
              campaignStateRef.current = data;
              setCampaignState(data);
            },
            onResult: (ev) => {
              setWorkingOnRequest(false);
              console.log("onResult called with:", ev);
              // Handle aborted case (when user clicks stop)
              if (ev.aborted) {
                console.log("Handling aborted result event");
                if (isNewSessionFlowRef.current) {
                  setPendingConversation((p) => {
                    if (!p) return p;
                    const msgs = p.messages;
                    const last = msgs[msgs.length - 1];
                    if (last?.type !== "ai" || !last.isStreaming) return p;
                    return {
                      messages: [
                        ...msgs.slice(0, -1),
                        { ...last, isStreaming: false },
                      ],
                    };
                  });
                  isNewSessionFlowRef.current = false;
                  sendingNewSessionRef.current = false;
                  pendingNewSessionRef.current = null;
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
                            { ...last, isStreaming: false },
                          ],
                        };
                      }
                      return s;
                    })
                  );
                }
                return;
              }

              const finalContent = ev.full_message ?? "";
              const pending = pendingNewSessionRef.current;
              const realId = pending?.id ?? ev.session_db_id ?? ev.session_id ?? ev.sessionId;
              const resultTs = typeof (ev as { timestamp_ms?: number }).timestamp_ms === "number"
                ? (ev as { timestamp_ms?: number }).timestamp_ms
                : Date.now();

              if (isNewSessionFlowRef.current) {
                setPendingConversation((p) => {
                  if (!p) return p;
                  const msgs = p.messages;
                  const last = msgs[msgs.length - 1];
                  if (last?.type !== "ai") return p;
                  const timeline = [...(last.timeline ?? [])];
                  if (finalContent) {
                    const lastTl = timeline[timeline.length - 1];
                    if (lastTl?.type === "text") {
                      timeline[timeline.length - 1] = { type: "text", content: finalContent, timestamp_ms: resultTs };
                    } else {
                      const kept = timeline.filter((t) => t?.type !== "text");
                      timeline.length = 0;
                      timeline.push(...kept, { type: "text", content: finalContent, timestamp_ms: resultTs });
                    }
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
                    profile_id: profileIdForReq ?? null,
                    created_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    title: (msgs[0]?.type === "human" ? msgs[0].content : "New chat").slice(0, 50),
                    messages: finalizedMessages,
                    campaignState: campaignStateRef.current,
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
                  if (finalContent) {
                    const lastTl = timeline[timeline.length - 1];
                    if (lastTl?.type === "text") {
                      timeline[timeline.length - 1] = { type: "text", content: finalContent, timestamp_ms: resultTs };
                    } else {
                      const kept = timeline.filter((t) => t?.type !== "text");
                      timeline.length = 0;
                      timeline.push(...kept, { type: "text", content: finalContent, timestamp_ms: resultTs });
                    }
                  }
                  const updated = {
                    ...target,
                    messages: [
                      ...msgs.slice(0, -1),
                      { ...aiLast, content: finalContent, timeline, isStreaming: false },
                    ],
                    campaignState: campaignStateRef.current ?? target.campaignState,
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
        const isAbort = (e as Error).name === "AbortError";
        const errorMsg = isAbort ? undefined : (e as Error).message;

        if (isNewSessionFlowRef.current) {
          setPendingConversation((p) => {
            if (!p) return p;
            const msgs = p.messages;
            const last = msgs[msgs.length - 1];
            if (last?.type !== "ai" || !last.isStreaming) return p;
            return {
              messages: [
                ...msgs.slice(0, -1),
                { ...last, isStreaming: false, ...(errorMsg ? { error: errorMsg } : {}) },
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
                    { ...last, isStreaming: false, ...(errorMsg ? { error: errorMsg } : {}) },
                  ],
                };
              }
              return s;
            })
          );
        }
      } finally {
        setWorkingOnRequest(false);
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
      effectiveSelectedProfiles,
      currentSessionId,
      sessions,
      getAccessToken,
    ]
  );

  const cancelRun = useCallback(async () => {
    setWorkingOnRequest(false);
    console.log("cancelRun called, aborting current request");
    // Capture refs BEFORE abort — the finally block in sendMessage will clear them
    const streamId = streamingSessionIdRef.current;
    const wasNewSession = isNewSessionFlowRef.current;
    const pendingSession = pendingNewSessionRef.current;

    abortControllerRef.current?.abort();

    // Eagerly reset streaming state. We can't rely on onResult/catch because:
    // 1. pixisChat.ts catches AbortError internally and calls onResult (doesn't rethrow)
    // 2. streamPixisChat resolves normally → sendMessage's finally block clears streamingSessionIdRef
    // 3. React processes onResult's setSessions callback AFTER the ref is already null
    // 4. setSessions callback reads streamingSessionIdRef.current (now null) → no target found
    if (wasNewSession) {
      // Promote pending conversation to a real session so context is preserved
      setPendingConversation((p) => {
        if (!p) return p;
        const msgs = p.messages;
        const last = msgs[msgs.length - 1];
        const finalizedMessages: ChatMessage[] = last?.type === "ai" && last.isStreaming
          ? [...msgs.slice(0, -1), { ...last, isStreaming: false }]
          : msgs;

        // If onInit already provided IDs, create a real session
        if (pendingSession?.id) {
          const newSession: SessionWithMessages = {
            id: pendingSession.id,
            cursor_session_id: pendingSession.cursor_session_id ?? null,
            user_id: null,
            workspace_id: null,
            account_id: null,
            channel_id: null,
            profile_id: null,
            created_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            title: (msgs[0]?.type === "human" ? msgs[0].content : "New chat").slice(0, 50),
            messages: finalizedMessages,
            campaignState: campaignStateRef.current,
          };
          setSessions((prev) => {
            const withoutDup = prev.filter((s) => s.id !== pendingSession.id);
            return [...withoutDup, newSession];
          });
          setCurrentSessionId(pendingSession.id);
        }
        return null; // clear pending
      });
      isNewSessionFlowRef.current = false;
      sendingNewSessionRef.current = false;
      pendingNewSessionRef.current = null;
    } else if (streamId) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== streamId) return s;
          const msgs = s.messages ?? [];
          const last = msgs[msgs.length - 1];
          if (last?.type !== "ai" || !last.isStreaming) return s;
          return {
            ...s,
            messages: [
              ...msgs.slice(0, -1),
              { ...last, isStreaming: false },
            ],
          };
        })
      );
    }
    setIsLoading(false);
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
        workingOnRequest,
        assistantScope,
        setAssistantScope,
        campaignState,
        loadSessions,
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
