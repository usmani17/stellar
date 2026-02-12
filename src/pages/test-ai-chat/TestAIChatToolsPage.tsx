/**
 * Standalone test page for AI chat with campaign_setup graph.
 * Uses useStream from LangGraph SDK with hardcoded metadata.
 * Visit /test-ai-chat-tools to test streaming, tool calls, and flow.
 *
 * Inspired by agent-chat-ui but adapted for React (no Next.js).
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import {
  parseStreamMessages,
  mergeAccumulatedToolBlocks,
  applyThinkingStepsToLastAi,
  shouldSkipOnFinishMessages,
  extractToolBlocksFromContent,
  type AccumulatedToolContent,
} from "../../utils/aiStreamMessageParser";
import {
  type ThreadMessage,
  type ContentBlock,
  normalizeThreadMessages,
} from "../../services/ai/threads";
import StellarMarkDown from "../../components/ai/StellarMarkDown";
import { ToolCallsDisplay, type ToolCallItem } from "../../components/ai/ToolCallsDisplay";
import { ToolResultDisplay } from "../../components/ai/ToolResultDisplay";
import { getDisplayName } from "../../utils/assistantDisplayNames";
import type { CampaignSetupState } from "../../types/agent";
import type { CurrentQuestionSchemaItem } from "../../types/agent";
import { CampaignFormForChat } from "../../components/ai/CampaignFormForChat";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ArrowUp, Square, Check } from "lucide-react";

const streamApiUrl = (): string => {
  const base = import.meta.env.VITE_AI_AGENT_BASE_URL;
  return base ? String(base).replace(/\/$/, "") : "";
};

/** Hardcoded metadata for testing campaign_setup graph */
const TEST_METADATA = {
  user_id: 1,
  account_id: 20,
  channel_id: 31,
  profile_id: 21,
  workspace_id: 3,
  platform: "google",
  graph_id: "campaign_setup",
  intent: "create_campaign",
  assistant_id: "fe7a7d02-1d8e-582e-9564-a6d074386802",
  auth_token: "123123123",
} as const;

/** Same prompts as Assistant panel (CAMPAIGN_SUGGESTED_PROMPTS in AssistantContext) */
const SUGGESTED_PROMPTS = [
  { id: "c1", text: "Create a Demand Gen (YouTube) campaign" },
  { id: "c2", text: "Set up a Search campaign" },
  { id: "c3", text: "Create a Performance Max campaign" },
  { id: "c4", text: "Create a Shopping campaign" },
];

function extractTextContent(content: ThreadMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text?: string } => typeof b === "object" && b != null && b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");
  }
  return "";
}

function getToolCallsFromMessage(msg: ThreadMessage): ToolCallItem[] {
  if (msg.tool_calls?.length) {
    return msg.tool_calls.map((tc) => ({
      id: tc.id,
      name: tc.name ?? "",
      args: tc.args as Record<string, unknown>,
    }));
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b): b is ContentBlock => typeof b === "object" && b != null && (b as ContentBlock).type === "tool_use")
      .map((b) => ({
        id: (b as { id?: string }).id,
        name: (b as { name?: string }).name ?? "",
        args: ((b as { input?: Record<string, unknown> }).input ?? {}) as Record<string, unknown>,
      }));
  }
  return [];
}

function getTextBlocksFromContent(content: ThreadMessage["content"]): string[] {
  if (typeof content === "string" && content.trim()) return [content];
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text?: string } => typeof b === "object" && b != null && (b as { type?: string }).type === "text")
      .map((b) => (b as { text?: string }).text ?? "")
      .filter(Boolean);
  }
  return [];
}

export const TestAIChatToolsPage: React.FC = () => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const accumulatedToolContentRef = useRef<Map<string, ThreadMessage["content"]>>(new Map());
  const accumulatedByAiIndexRef = useRef<ThreadMessage["content"][]>([]);
  const lastMergedMessagesRef = useRef<ThreadMessage[] | null>(null);
  const lastMergedThreadIdRef = useRef<string | null>(null);
  /** Persisted history across turns so tool calls don't vanish when sending a new message */
  const persistedMessagesRef = useRef<ThreadMessage[]>([]);
  const prevLoadingRef = useRef(false);
  const thinkingStepsRef = useRef<string[]>([]);

  const apiUrl = useMemo(() => streamApiUrl(), []);
  const assistantId = TEST_METADATA.assistant_id;

  const stream = useStream({
    apiUrl: apiUrl || undefined,
    assistantId,
    threadId,
    throttle: 16,
    onThreadId: useCallback((id: string) => setThreadId(id), []),
    messagesKey: "messages",
    onError: useCallback((err: unknown) => console.error("[TestAIChatTools] Stream error:", err), []),
    onFinish: useCallback((state: unknown, run?: { thread_id?: string }) => {
      const tid = run?.thread_id ?? threadId;
      if (!tid) return;
      const s = state != null && typeof state === "object" ? (state as Record<string, unknown>) : {};
      const values = s.values != null && typeof s.values === "object" ? (s.values as Record<string, unknown>) : null;
      const rawMessages = values?.messages ?? s.messages;
      const accumulated: AccumulatedToolContent = {
        byId: accumulatedToolContentRef.current,
        byAiIndex: accumulatedByAiIndexRef.current,
      };
      const skip = shouldSkipOnFinishMessages(accumulated);
      if (Array.isArray(rawMessages) && rawMessages.length > 0 && !skip) {
        const normalized = normalizeThreadMessages(rawMessages);
        const steps = thinkingStepsRef.current;
        const merged = applyThinkingStepsToLastAi(
          mergeAccumulatedToolBlocks(normalized, accumulated),
          steps
        );
        lastMergedMessagesRef.current = merged;
        lastMergedThreadIdRef.current = tid;
        persistedMessagesRef.current = merged;
      }
    }, [threadId]),
    onUpdateEvent: useCallback((data: Record<string, unknown>) => {
      const exclude = ["messages", "analysis", "corrected_analysis", "build_draft"];
      const keys = data && typeof data === "object"
        ? Object.keys(data).filter((k) => !exclude.includes(k))
        : [];
      if (keys.length > 0) {
        setThinkingSteps((prev) => {
          const newKeys = keys.filter((k) => !prev.includes(k));
          return newKeys.length > 0 ? [...prev, ...newKeys] : prev;
        });
      }
    }, []),
  });

  const getToolCalls = (stream as { getToolCalls?: (m: unknown) => Array<{ call: { id?: string; name: string; args?: Record<string, unknown> } }> }).getToolCalls;

  const streamMessages: ThreadMessage[] = useMemo(
    () => parseStreamMessages(stream.messages ?? [], getToolCalls),
    [stream.messages, getToolCalls]
  );

  const isStreaming = stream.isLoading;
  const isStreamThread = threadId != null;

  const mergedForDisplay = useMemo(() => {
    if (stream.isLoading || !threadId || !streamMessages.length) return null;
    const accum: AccumulatedToolContent = {
      byId: accumulatedToolContentRef.current,
      byAiIndex: accumulatedByAiIndexRef.current,
    };
    if (shouldSkipOnFinishMessages(accum)) {
      return applyThinkingStepsToLastAi(
        mergeAccumulatedToolBlocks(streamMessages, accum),
        thinkingSteps
      );
    }
    return null;
  }, [stream.isLoading, streamMessages, threadId, thinkingSteps]);

  const lastMergedForThread =
    lastMergedThreadIdRef.current === threadId ? lastMergedMessagesRef.current : null;

  /** When loading (new turn), prepend persisted history so tool calls from previous turns stay visible */
  const baseMessages: ThreadMessage[] = useMemo(() => {
    const currentRunMessages = isStreamThread && stream.isLoading ? streamMessages : (mergedForDisplay ?? lastMergedForThread ?? streamMessages ?? []);
    if (stream.isLoading && persistedMessagesRef.current.length > 0 && currentRunMessages.length > 0) {
      const prev = persistedMessagesRef.current;
      const currentIds = new Set((currentRunMessages as { id?: string }[]).map((m) => m.id));
      const prevOnly = prev.filter((m) => !currentIds.has(m.id));
      return [...prevOnly, ...currentRunMessages];
    }
    return currentRunMessages;
  }, [isStreamThread, stream.isLoading, streamMessages, mergedForDisplay, lastMergedForThread]);

  const messages: ThreadMessage[] = baseMessages;

  const campaignState = useMemo((): CampaignSetupState | undefined => {
    const vals = stream.values != null && typeof stream.values === "object" ? stream.values as Record<string, unknown> : undefined;
    if (!vals) return undefined;
    if ("campaign_draft" in vals || "reply_text" in vals || "current_questions_schema" in vals) {
      return vals as CampaignSetupState;
    }
    return undefined;
  }, [stream.values]);

  const questionsSchema = campaignState?.current_questions_schema;
  const hasQuestionsSchema = questionsSchema && questionsSchema.length > 0;
  const schemaFormKey = hasQuestionsSchema ? (questionsSchema as CurrentQuestionSchemaItem[]).map((q) => q.key).join(",") : "";
  const campaignFormRef = React.useRef<{ getValues(): Record<string, string>; clear(): void } | null>(null);

  if (prevLoadingRef.current && !stream.isLoading) {
    prevLoadingRef.current = false;
    setThinkingSteps([]);
  } else if (!prevLoadingRef.current && stream.isLoading) {
    accumulatedToolContentRef.current.clear();
    accumulatedByAiIndexRef.current = [];
    lastMergedMessagesRef.current = null;
    lastMergedThreadIdRef.current = null;
    prevLoadingRef.current = true;
  }

  thinkingStepsRef.current = thinkingSteps;

  useEffect(() => {
    if (!stream.isLoading) return;
    const byId = accumulatedToolContentRef.current;
    const byIndex: ThreadMessage["content"][] = [];
    streamMessages.forEach((msg) => {
      if ((msg as { type?: string }).type !== "ai") return;
      const c = msg.content;
      if (Array.isArray(c) && extractToolBlocksFromContent(c).length > 0) {
        byId.set(msg.id ?? `ai-${byIndex.length}`, c);
        byIndex.push(c);
      }
    });
    accumulatedByAiIndexRef.current = byIndex;
  }, [streamMessages, stream.isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendChatMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming || !apiUrl || !assistantId) return;

      setInputValue("");
      setThinkingSteps([]);
      campaignFormRef.current?.clear();

      const humanMessage = {
        type: "human" as const,
        content: content.trim(),
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };

      const configurable: Record<string, unknown> = {
        user_id: TEST_METADATA.user_id,
        account_id: TEST_METADATA.account_id,
        integration_id: TEST_METADATA.channel_id,
        profile_id: TEST_METADATA.profile_id,
        marketplace: TEST_METADATA.platform,
        intent: TEST_METADATA.intent,
        ...(threadId ? { thread_id: threadId } : {}),
      };

      try {
        await stream.submit(
          { messages: [humanMessage] },
          {
            metadata: { ...TEST_METADATA },
            config: { recursion_limit: 75, configurable },
            streamResumable: true,
            streamSubgraphs: true,
            onDisconnect: "continue",
            streamMode: ["messages-tuple", "updates", "values"],
            threadId: threadId ?? undefined,
            optimisticValues: (prev: { messages?: unknown[] }) => ({
              ...prev,
              messages: [...(prev.messages ?? []), humanMessage],
            }),
          }
        );
      } catch (err) {
        console.error("[TestAIChatTools] Submit error:", err);
      }
    },
    [isStreaming, apiUrl, assistantId, threadId, stream]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const textPart = inputValue.trim();
      const formValues = hasQuestionsSchema && campaignFormRef.current ? campaignFormRef.current.getValues() : {};
      const formParts =
        hasQuestionsSchema && Object.keys(formValues).length > 0
          ? (questionsSchema as CurrentQuestionSchemaItem[])
            .map((item) => {
              const v = formValues[item.key];
              if (v === undefined || v === "") return null;
              const label = item.label || item.key;
              return `${label}: ${v}`;
            })
            .filter(Boolean) as string[]
          : [];
      const formBlock = formParts.length > 0 ? formParts.join("\n") : "";
      const combined = [formBlock, textPart].filter(Boolean).join("\n\n");
      if (combined) {
        await sendChatMessage(combined);
      }
    },
    [inputValue, hasQuestionsSchema, questionsSchema, sendChatMessage]
  );

  const handleStop = useCallback(() => {
    stream.stop?.();
  }, [stream]);

  const handleNewThread = useCallback(() => {
    setThreadId(null);
    persistedMessagesRef.current = [];
    lastMergedMessagesRef.current = null;
    lastMergedThreadIdRef.current = null;
  }, []);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-[#072929] mb-2">Configuration needed</h2>
          <p className="text-sm text-gray-600">
            Set <code className="bg-gray-200 px-1 rounded">VITE_AI_AGENT_BASE_URL</code> in your env to point to the LangGraph API (e.g. http://localhost:2024).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#072929]">
          Test AI Chat Tools – campaign_setup
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Metadata: user=1, account=20, channel=31, profile=21
          </span>
          <button
            type="button"
            onClick={handleNewThread}
            className="text-sm text-[#136D6D] hover:underline font-medium"
          >
            New chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center gap-6 py-16">
            <img src={StellarLogo} alt="Stellar" className="h-16 w-16 opacity-90" />
            <h3 className="text-lg font-medium text-[#072929]">Campaign Setup Assistant</h3>
            <p className="text-sm text-gray-600 text-center max-w-sm">
              Test the campaign creation flow with proper streaming and tool call display.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-md">
              <p className="text-sm text-gray-600 mb-3">Would you like to:</p>
              <div className="flex flex-col gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => sendChatMessage(prompt.text)}
                    className="assistant-prompt-button"
                    disabled={isStreaming}
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, messageIndex) => {
              const isHuman = (message as { type?: string }).type === "human";
              const isTool = (message as { type?: string }).type === "tool";
              const isAi = (message as { type?: string }).type === "ai";
              const lastHumanIdx = messages
                .map((m, i) => ((m as { type?: string }).type === "human" ? i : -1))
                .filter((i) => i >= 0)
                .pop() ?? -1;
              const isStreamingThisBubble = isStreaming && isAi && messageIndex === lastHumanIdx + 1;

              if (isHuman) {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-3 rounded-[12px] bg-[#e8e8e3] shadow-sm">
                      <p className="text-sm text-[#072929] whitespace-pre-wrap">
                        {extractTextContent(message.content)}
                      </p>
                    </div>
                  </div>
                );
              }

              if (isTool) {
                const toolMsg = message as { name?: string; tool_call_id?: string; content?: unknown };
                return (
                  <div key={message.id} className="flex justify-start">
                    <ToolResultDisplay
                      name={toolMsg.name}
                      toolCallId={toolMsg.tool_call_id}
                      content={toolMsg.content ?? ""}
                    />
                  </div>
                );
              }

              if (isAi) {
                const toolCalls = getToolCallsFromMessage(message);
                const textParts = getTextBlocksFromContent(message.content);
                const completedSteps = (message.additional_kwargs?.thinkingSteps as string[] | undefined) ?? [];
                const hasStreamingSteps = isStreamingThisBubble && thinkingSteps.length > 0;
                const steps = hasStreamingSteps ? thinkingSteps : completedSteps;

                return (
                  <div key={message.id} className="flex justify-start">
                    <div className="max-w-[85%] w-full flex flex-col gap-3 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm">
                      {steps.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-[#556179]">
                            {completedSteps.length > 0 && !isStreamingThisBubble ? "Steps taken" : "Currently analyzing"}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {steps.map((step, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1.5 rounded-md border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929] ${
                                  completedSteps.length > 0 && !isStreamingThisBubble ? "bg-[#E8E8E3]/50" : "bg-white"
                                }`}
                              >
                                {completedSteps.length > 0 && !isStreamingThisBubble ? (
                                  <Check className="w-3 h-3 text-[#136D6D] shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full animate-pulse shrink-0" />
                                )}
                                {getDisplayName(step, "node")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {toolCalls.length > 0 && (
                        <ToolCallsDisplay toolCalls={toolCalls} compact />
                      )}

                      {textParts.map((text, idx) => (
                        <div key={idx} className="text-sm text-[#072929] leading-5">
                          <StellarMarkDown content={text} type="ai" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {isStreaming && messages.length > 0 && (messages[messages.length - 1] as { type?: string })?.type === "ai" && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] flex items-center gap-2">
                  <img src={StellarLogo} alt="" className="h-4 w-4 opacity-80" />
                  <span className="text-xs font-medium text-[#556179]">Thinking</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}

            {(isStreaming || stream.isLoading) && !(messages.length > 0 && (messages[messages.length - 1] as { type?: string })?.type === "ai") && (
              <div className="flex justify-start">
                <div className="max-w-[85%] w-full p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] flex flex-col gap-3">
                  {thinkingSteps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {thinkingSteps.map((step, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929]"
                        >
                          <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full animate-pulse" />
                          {getDisplayName(step, "node")}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#556179]">
                    <img src={StellarLogo} alt="" className="h-4 w-4 opacity-80" />
                    <span className="text-xs font-medium">Thinking</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasQuestionsSchema && schemaFormKey && !isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] w-full">
                  <CampaignFormForChat
                    ref={campaignFormRef}
                    key={schemaFormKey}
                    questionsSchema={questionsSchema as CurrentQuestionSchemaItem[]}
                    campaignDraft={campaignState?.campaign_draft as Record<string, unknown> | undefined}
                    campaignType={((campaignState?.campaign_draft ?? campaignState) as Record<string, unknown>)?.campaign_type as string || (campaignState?.campaign_type as string) || "SEARCH"}
                    onSend={sendChatMessage}
                    disabled={isStreaming}
                    profileId={TEST_METADATA.profile_id}
                    accountId={String(TEST_METADATA.account_id)}
                    channelId={String(TEST_METADATA.channel_id)}
                    googleProfiles={[]}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.target.closest("form") as HTMLFormElement)?.requestSubmit();
                }
              }}
              placeholder={isStreaming ? "Generating..." : (hasQuestionsSchema ? "Add a message or use the form below..." : "Ask to create a campaign...")}
              className="flex-1 min-h-[44px] max-h-[200px] resize-y px-4 py-3 rounded-xl border border-[#E8E8E3] bg-[#F9F9F6] text-sm text-[#072929] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#136D6D]/30 focus:border-[#136D6D]"
              disabled={isStreaming}
              rows={1}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white shrink-0"
                title="Stop"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-[#136D6D] hover:bg-[#0f5858] text-white shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                title="Send"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
