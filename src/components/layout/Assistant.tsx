import React, { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { useAssistant, ASSISTANT_PANEL_VIEW, type ThreadWithRuntime } from "../../contexts/AssistantContext";
import type { GraphId } from "../../services/ai/assistant";
import type { CurrentQuestionSchemaItem } from "../../types/agent";
import { Check, Square, X, GripVertical } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import type { Thread, ContentBlock, ThreadMessageContent } from "../../services/ai/threads";
import StellarMarkDown from "../ai/StellarMarkDown";
import { MessageContent } from "../ai/MessageContent";
import { isStringContent } from "../../utils/ai-formatter";
import ToolUseBlock from "../ai/ToolUseBlock";


// Helper function to check if content is a ContentBlock array
const isContentBlockArray = (content: ThreadMessageContent): content is ContentBlock[] => {
  return Array.isArray(content) && content.length > 0 && typeof content[0] === "object" && "type" in content[0];
};

// Helper function to extract plain text from content
const extractTextContent = (content: ThreadMessageContent): string => {
  if (isStringContent(content)) {
    return content;
  }
  if (isContentBlockArray(content)) {
    return content
      .filter((block) => "type" in block && block.type === "text")
      .map((block) => (block as any).text || "")
      .join("\n");
  }
  return "";
};


// Helper function to group threads by date, ordered by latest first
const groupThreadsByDate = (threads: Thread[]): Record<string, Thread[]> => {
  const groups: Record<string, Thread[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Sort threads by updated_at in descending order (latest first)
  const sortedThreads = [...threads].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  sortedThreads.forEach(thread => {
    const threadDate = new Date(thread.updated_at);
    const threadDateStr = threadDate.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    let groupKey: string;
    if (threadDateStr === todayStr) {
      groupKey = 'Today';
    } else if (threadDateStr === yesterdayStr) {
      groupKey = 'Yesterday';
    } else {
      // Format as "Jan 15, 2026"
      groupKey = threadDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(thread);
  });

  return groups;
};

export interface SchemaFormBlockHandle {
  getValues(): Record<string, string>;
  clear(): void;
}

/** Form block for current_questions_schema; keyed by schema so it remounts when schema changes. */
const SchemaFormBlock = forwardRef<SchemaFormBlockHandle, {
  questionsSchema: CurrentQuestionSchemaItem[];
  campaignDraft: Record<string, unknown> | undefined;
  onSend: (message: string) => void;
  disabled: boolean;
  /** When form is shown, pass current text input so "Send answers" can include it; and clear callback to clear input after send. */
  inputValue?: string;
  onInputClear?: () => void;
}>(({ questionsSchema, campaignDraft, onSend, disabled, inputValue = "", onInputClear }, ref) => {
  const initialValues = useMemo(() => {
    const next: Record<string, string> = {};
    questionsSchema.forEach((item) => {
      if (item.key) {
        const draftVal = campaignDraft?.[item.key];
        next[item.key] = draftVal != null ? String(draftVal) : "";
      }
    });
    return next;
  }, [questionsSchema, campaignDraft]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useImperativeHandle(ref, () => ({
    getValues: () => ({ ...values }),
    clear: () => setValues(questionsSchema.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.key]: "" }), {})),
  }), [values, questionsSchema]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const buildFormParts = (vals: Record<string, string>) =>
    questionsSchema
      .map((item) => {
        const v = vals[item.key]?.trim();
        if (v === "") return null;
        const label = item.label || item.key;
        return `${label}: ${v}`;
      })
      .filter(Boolean) as string[];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const formParts = buildFormParts(values);
    const textPart = inputValue?.trim() ?? "";
    const combined = [formParts.length > 0 ? formParts.join("\n") : null, textPart].filter(Boolean).join("\n\n");
    if (combined) {
      onSend(combined);
      setValues(questionsSchema.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.key]: "" }), {}));
      onInputClear?.();
    }
  };

  return (
    <div className="mt-2 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
      <p className="text-sm font-medium text-[#072929] mb-3" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
        Fill in the details
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {questionsSchema.map((item) => {
          const key = item.key;
          const label = item.label || key;
          const isRequired = item.required !== false;
          const inputType =
            item.ui_hint === "url" || item.ui_hint === "image_url"
              ? "url"
              : item.type === "number"
                ? "number"
                : "text";
          const value = values[key] ?? "";
          return (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={`schema-${key}`}
                className="text-xs font-medium text-[#072929]"
                style={{ fontFamily: "'GT America Trial', sans-serif" }}
              >
                {label}
                {isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                id={`schema-${key}`}
                type={inputType}
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={
                  item.ui_hint === "image_url" || item.ui_hint === "url" ? "https://..." : ""
                }
                className="w-full px-3 py-2 text-sm text-[#072929] bg-white border border-[#E8E8E3] rounded-[8px] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#136D6D]/40 focus:border-[#136D6D]"
                style={{ fontFamily: "'GT America Trial', sans-serif" }}
                disabled={disabled}
              />
            </div>
          );
        })}
        <button
          type="submit"
          disabled={disabled}
          className="self-start mt-1 px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-opacity"
          style={{ fontFamily: "'GT America Trial', sans-serif" }}
        >
          Send answers
        </button>
      </form>
    </div>
  );
});

SchemaFormBlock.displayName = "SchemaFormBlock";

interface AssistantPanelProps {
  className?: string;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  className = "",
}) => {
  const {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    suggestedPrompts,
    currentThinkingSteps,
    isStreaming,
    threads,
    currentThread,
    isLoadingThreads,
    selectThread,
    startNewThread,
    cancelRun,
    selectedGraphId,
    setSelectedGraphId,
    onApplyDraft,
    closeAssistant,
  } = useAssistant();

  const threadWithRuntime = currentThread as ThreadWithRuntime | null;
  const campaignState = threadWithRuntime?.campaignState;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const schemaFormRef = useRef<SchemaFormBlockHandle | null>(null);
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsThreadDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isStreaming) return;
    const textPart = inputValue.trim();
    const formValues = hasQuestionsSchema && schemaFormRef.current ? schemaFormRef.current.getValues() : {};
    const schema = hasQuestionsSchema ? (questionsSchema as CurrentQuestionSchemaItem[]) : [];
    const formParts =
      schema.length > 0 && Object.keys(formValues).length > 0
        ? (schema
            .map((item) => {
              const v = formValues[item.key]?.trim();
              if (!v) return null;
              return `${item.label || item.key}: ${v}`;
            })
            .filter(Boolean) as string[])
        : [];
    const formBlock = formParts.length > 0 ? formParts.join("\n") : "";
    const combined = [formBlock, textPart].filter(Boolean).join("\n\n");
    if (combined) {
      sendMessage(combined);
      setInputValue("");
      if (formParts.length > 0) schemaFormRef.current?.clear();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    cancelRun();
  };

  const handlePromptClick = (promptText: string) => {
    sendMessage(promptText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Shift+Enter: allow default (insert newline)
  };

  const handleThreadSelect = async (threadId: string) => {
    await selectThread(threadId);
    setIsThreadDropdownOpen(false);
  };

  const handleNewThread = () => {
    startNewThread();
    setIsThreadDropdownOpen(false);
  };

  const handleGraphChange = (graphId: GraphId) => {
    if (graphId === selectedGraphId) return;
    setSelectedGraphId(graphId);
    startNewThread();
    setIsThreadDropdownOpen(false);
  };

  const questionsSchema = campaignState?.current_questions_schema;
  const hasQuestionsSchema = questionsSchema && questionsSchema.length > 0;
  const schemaFormKey = hasQuestionsSchema
    ? (questionsSchema as CurrentQuestionSchemaItem[]).map((q) => q.key).join(",")
    : "";

  const groupedThreads = groupThreadsByDate(threads);
  const hasMessages = messages.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-semantic-background-primary)] shadow-lg ${className}`}
    >
      {/* Header with Thread Selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e3]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src={ASSISTANT_ICONS.logo} alt="Stellar" className="h-6 w-6 shrink-0" />
          <span className="text-sm font-medium text-[#072929] truncate">
            {currentThread?.metadata?.title || "New Chat"}
          </span>
        </div>

        {/* Graph selector: Chat | Campaign setup */}
        <div className="flex items-center rounded-lg border border-[#e8e8e3] p-0.5 shrink-0 mx-2">
          <button
            type="button"
            onClick={() => handleGraphChange("chat")}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${selectedGraphId === "chat" ? "bg-[#136D6D] text-white" : "text-[#072929] hover:bg-[#f0f0f0]"}`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => handleGraphChange("campaign_setup")}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${selectedGraphId === "campaign_setup" ? "bg-[#136D6D] text-white" : "text-[#072929] hover:bg-[#f0f0f0]"}`}
          >
            Campaign
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* New Thread Button */}
          <button
            onClick={handleNewThread}
            className="p-2 hover:opacity-70 transition-opacity"
            title="New conversation"
          >
            <img src={ASSISTANT_ICONS.newThread} alt="New thread" className="w-5 h-5" />
          </button>

          {/* Chat History Button */}
          <button
            onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
            className="p-2 relative"
            title="Chat history"
          >
            <img src={ASSISTANT_ICONS.chatHistory} alt="Chat history" className="w-5 h-5" />

            {/* Dropdown Menu */}
            {isThreadDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-[#e8e8e3] z-50 max-h-[600px] overflow-y-auto">
                {/* History Header */}
                <div className="sticky top-0 px-4 py-3 border-b border-[#e8e8e3] bg-white rounded-t-xl">
                  <h3 className="text-lg font-medium text-[#072929]">History</h3>
                </div>

                {/* Loading State */}
                {isLoadingThreads ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Loading conversations...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No previous conversations
                  </div>
                ) : (
                  /* Thread List Grouped by Date */
                  Object.entries(groupedThreads)
                    .sort(([keyA], [keyB]) => {
                      // Order: Today, Yesterday, then by date descending
                      const order: Record<string, number> = { 'Today': 0, 'Yesterday': 1 };
                      const orderA = order[keyA] ?? 2;
                      const orderB = order[keyB] ?? 2;

                      if (orderA !== orderB) return orderA - orderB;

                      // If both are dates, sort by date descending
                      if (orderA === 2) {
                        return new Date(keyB).getTime() - new Date(keyA).getTime();
                      }
                      return 0;
                    })
                    .map(([dateGroup, groupThreads]) => (
                      <div key={dateGroup}>
                        {/* Date Group Header with Count */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-[#e8e8e3] bg-[#f9f9f6]">
                          <span className="text-sm font-medium text-[#072929]">{dateGroup}</span>
                          <span className="text-sm text-[#072929]">{groupThreads.length} Total</span>
                        </div>

                        {/* Threads in Group */}
                        {groupThreads.map((thread) => (
                          <button
                            key={thread.thread_id}
                            onClick={() => handleThreadSelect(thread.thread_id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-b border-[#f0f0f0] ${currentThread?.thread_id === thread.thread_id
                              ? 'bg-[#f0f0f0] text-[#072929]'
                              : 'text-[#072929] hover:bg-[#f9f9f6]'
                              }`}
                          >
                            {/* Chat Bubble Icon */}
                            <svg className="w-4 h-4 shrink-0 text-[#072929]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span className="truncate flex-1">{thread.metadata?.title || 'Untitled'}</span>
                            {currentThread?.thread_id === thread.thread_id && (
                              <Check className="w-4 h-4 text-[#072929] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                )}
              </div>
            )}
          </button>

          {/* Close Assistant */}
          <button
            type="button"
            onClick={closeAssistant}
            className="p-2 rounded-md text-[#072929] hover:bg-[#f0f0f0] transition-colors"
            title="Close assistant"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto interactive-scrollbar px-4 py-4">
        {!hasMessages ? (
          /* Empty State - Initial View */
          <div className="flex flex-col items-center justify-center h-full">
            {/* Assistant Icon */}
            <div className="mb-4">
              <img src={StellarLogo} alt="Assistant" className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-8">
              Assistant
            </h3>

            {/* Suggested Prompts */}
            <div className="w-full max-w-sm">
              <p className="text-sm text-gray-600 mb-3">Would you like to:</p>
              <div className="flex flex-col gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptClick(prompt.text)}
                    className="assistant-prompt-button"
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages List */
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "human" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] ${message.type === "human"
                    ? "flex flex-col justify-between items-end p-3 gap-1 h-auto bg-[#e5e4e0] rounded-[10px]"
                    : "space-y-3"
                    }`}
                >
                  {/* Tool Response Message === SKIP THIS FOR NOW */}
                  {/* {message.type === "tool" && (
                    <ToolResponseBlock message={message} />
                  )} */}

                  {/* Human Message: MessageContent for multiline + JSON (same as test agent) */}
                  {message.type === "human" && (
                    <div
                      className="text-[14px] font-normal leading-[20px] tracking-[0.1px] text-[#072929]"
                      style={{ fontFamily: "'GT America Trial', sans-serif" }}
                    >
                      <MessageContent content={extractTextContent(message.content)} />
                    </div>
                  )}

                  {/* AI Message with Rich Content */}
                  {message.type === "ai" && (
                    <div
                      className="flex flex-col items-start h-auto"
                      style={{
                        padding: '0px 16px 0px 16px',
                        fontFamily: "'GT America Trial', sans-serif"
                      }}
                    >
                      {/* Currently analyzing section */}
                      {message.additional_kwargs && Object.keys(message.additional_kwargs).length > 0 && (
                        <div className="flex flex-col items-start gap-1.5 w-60 h-auto">
                          <div
                            className="text-[14px] font-normal leading-5 text-center tracking-[0.1px] text-[#072929]"
                            style={{ fontFamily: "'GT America Trial', sans-serif" }}
                          >
                            Currently analyzing:
                          </div>
                          <div
                            className="flex flex-col justify-center items-center p-3 gap-1 w-60 h-auto bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]"
                          >
                            <div
                              className="text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929] w-full"
                              style={{ fontFamily: "'GT America Trial', sans-serif" }}
                            >
                              {Object.entries(message.additional_kwargs).map(([key, value]) => (
                                <div key={key}>{key}: {String(value)}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Render Content Blocks */}
                      {isContentBlockArray(message.content) ? (
                        <div className="w-full">
                          {(message.content as ContentBlock[]).map((block, idx) => (
                            <div key={idx}>
                              {block.type === "text" && (
                                <div
                                  className="h-auto text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929]"
                                  style={{ fontFamily: "'GT America Trial', sans-serif" }}
                                >
                                  <StellarMarkDown content={(block as any).text} type="ai" />
                                </div>
                              )}
                              {block.type === "tool_use" && (
                                <ToolUseBlock block={block} />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : isStringContent(message.content) ? (
                        <div
                          className="h-auto text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929]"
                          style={{ fontFamily: "'GT America Trial', sans-serif" }}
                        >
                          <MessageContent content={message.content} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Campaign: Apply draft + validation errors */}
            {campaignState && (campaignState.draft_setup_json || (campaignState.validation_errors && campaignState.validation_errors.length > 0)) && (
              <div className="flex flex-col gap-2 mt-2 p-3 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
                {campaignState.validation_errors && campaignState.validation_errors.length > 0 && (
                  <div className="text-xs text-red-600">
                    {campaignState.validation_errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}
                {campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0 && onApplyDraft && (
                  <button
                    type="button"
                    onClick={() => onApplyDraft(campaignState.draft_setup_json!)}
                    className="self-start px-3 py-1.5 text-xs font-medium bg-[#136D6D] text-white rounded-md hover:opacity-90"
                  >
                    Apply draft
                  </button>
                )}
                {campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0 && !onApplyDraft && (
                  <span className="text-xs text-[#072929]">Draft ready (use Apply draft from campaign form to fill)</span>
                )}
              </div>
            )}

            {/* Campaign: current_questions_schema form fields */}
            {hasQuestionsSchema && schemaFormKey && (
              <SchemaFormBlock
                ref={schemaFormRef}
                key={schemaFormKey}
                questionsSchema={questionsSchema as CurrentQuestionSchemaItem[]}
                campaignDraft={campaignState?.campaign_draft as Record<string, unknown> | undefined}
                onSend={sendMessage}
                disabled={isLoading || isStreaming}
                inputValue={inputValue}
                onInputClear={() => setInputValue("")}
              />
            )}

            {/* Streaming State */}
            {(isLoading || isStreaming) && (
              <div className="flex justify-start">
                <div className="max-w-[85%] space-y-3">
                  {/* Current Thinking Steps */}
                  {currentThinkingSteps.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Currently analyzing:
                      </p>
                      <div className="space-y-2">
                        {currentThinkingSteps.map((step, index) => (
                          <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading Indicator */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={StellarLogo}
                        alt="Assistant"
                        className="h-4 w-4"
                      />
                      <span className="text-xs font-medium text-gray-500">
                        PIVY AI
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[var(--color-semantic-background-primary)] border border-[var(--pixis-sandstorm-s40,#e8e8e3)] rounded-[12px] p-3 transition-all">
            <div className="flex flex-col gap-8">
              {/* Input Field: textarea for multi-line; Shift+Enter = new line, Enter = send */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? "Generating response..." : "👋 Ask me anything about your campaigns... (Shift+Enter for new line)"}
                className="w-full min-h-[24px] max-h-[120px] resize-y bg-transparent text-[14px] font-normal text-[#072929] placeholder:text-[#072929] focus:outline-none"
                style={{ fontFamily: "'GT America Trial', sans-serif" }}
                disabled={isLoading || isStreaming}
                rows={1}
              />

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                {/* Add Attachment Button */}
                <button
                  type="button"
                  className="p-1 hover:opacity-70 transition-opacity"
                  title="Add attachment"
                  disabled={isStreaming}
                >
                  <img src={ASSISTANT_ICONS.addCircle} alt="Add attachment" className="w-5 h-5" />
                </button>

                {/* Stop Button - shown during streaming */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                    title="Stop generating"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5">
                    {/* Voice Button */}
                    <button
                      type="button"
                      className="p-1 hover:opacity-70 transition-opacity"
                      title="Voice input"
                    >
                      <img src={ASSISTANT_ICONS.mic} alt="Voice input" className="w-5 h-5" />
                    </button>

                    {/* Analytics Button */}
                    <button
                      type="button"
                      className="p-1 hover:opacity-70 transition-opacity"
                      title="View analytics"
                    >
                      <img src={ASSISTANT_ICONS.voice} alt="View analytics" className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const DEFAULT_PANEL_WIDTH = 550;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 900;

// Wrapper component that renders the Assistant panel with slide-up/slide-down animation
export const Assistant: React.FC<React.PropsWithChildren<Record<string, never>>> = ({
  children,
}) => {
  const { isOpen } = useAssistant();
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const isFixed = ASSISTANT_PANEL_VIEW === "fixed";
  const widthCss = `${panelWidth}px`;

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: panelWidth };
    const onMove = (ev: MouseEvent) => {
      const start = dragRef.current;
      if (!start) return;
      const delta = start.startX - ev.clientX;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, start.startWidth + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleResizeDoubleClick = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
  };

  return (
    <div className={`bg-[var(--color-semantic-background-primary)] overflow-x-hidden min-w-0 flex ${isFixed ? "relative" : ""}`}>
      {/* Main Content */}
      <div
        style={isOpen && isFixed ? { marginRight: widthCss } : undefined}
        className={`flex-1 overflow-x-hidden transition-all duration-300 interactive-scrollbar`}
      >
        {children}
      </div>

      {/* Assistant Sidebar - always mounted, animated from bottom */}
      <div
        className={`${isFixed ? "fixed" : "absolute"} right-0 top-[80px] bottom-0 z-[45] bg-[var(--color-semantic-background-primary)] transition-[transform,width] duration-200 ease-out ${
          isFixed ? "border-l border-gray-200" : "rounded-l-2xl shadow-[-8px_0_24px_rgba(0,0,0,0.15)]"
        } ${isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"}`}
        style={{ width: widthCss }}
        aria-hidden={!isOpen}
      >
        {/* Resize handle - left edge, vertically centered */}
        <div
          onMouseDown={handleResizeMouseDown}
          onDoubleClick={handleResizeDoubleClick}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-6 h-14 flex items-center justify-center rounded-r-md bg-[#E8E8E3] border border-[#d0d0cc] border-l-0 cursor-col-resize hover:bg-[#136D6D] hover:text-white text-[#072929] transition-colors shadow-sm"
          title="Drag to resize · Double-click to reset"
          aria-label="Resize assistant panel"
        >
          <GripVertical className="w-4 h-4" strokeWidth={2} />
        </div>
        <AssistantPanel className={`h-full ${isFixed ? "" : "rounded-l-2xl overflow-hidden"}`} />
      </div>
    </div>
  );
};


