import React, { useRef, useEffect, useState } from "react";
import { useAssistant, ASSISTANT_PANEL_VIEW,ASSISTANT_PANEL_WIDTH  } from "../../contexts/AssistantContext";
import { Check, Square } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import type { Thread, ContentBlock, ThreadMessageContent } from "../../services/ai/threads";
import StellarMarkDown from "../ui/StellarMarkDown";
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
    // Thread history features
    threads,
    currentThread,
    isLoadingThreads,
    selectThread,
    startNewThread,
    cancelRun,
  } = useAssistant();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    cancelRun();
  };

  const handlePromptClick = (promptText: string) => {
    sendMessage(promptText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleThreadSelect = async (threadId: string) => {
    await selectThread(threadId);
    setIsThreadDropdownOpen(false);
  };

  const handleNewThread = () => {
    startNewThread();
    setIsThreadDropdownOpen(false);
  };

  const groupedThreads = groupThreadsByDate(threads);
  const hasMessages = messages.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-semantic-background-primary)] shadow-lg ${className}`}
    >
      {/* Header with Thread Selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e3]">
        <div className="flex items-center gap-2">
          <img src={ASSISTANT_ICONS.logo} alt="Stellar" className="h-6 w-6" />
          <span className="text-sm font-medium text-[#072929] truncate">
            {currentThread?.metadata?.title || 'New Chat'}
          </span>
        </div>

        <div className="flex items-center gap-2">
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
                          <svg className="w-4 h-4 flex-shrink-0 text-[#072929]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="truncate flex-1">{thread.metadata?.title || 'Untitled'}</span>
                          {currentThread?.thread_id === thread.thread_id && (
                            <Check className="w-4 h-4 text-[#072929] flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
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
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-[#136D6D] hover:bg-gray-50 transition-all"
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

                  {/* Human Message */}
                  {message.type === "human" && (
                    <div
                      className="text-[14px] font-normal leading-[20px] tracking-[0.1px] text-[#072929] whitespace-pre-wrap"
                      style={{ fontFamily: "'GT America Trial', sans-serif" }}
                    >
                      <StellarMarkDown content={extractTextContent(message.content)} type={message.type} />
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
                          <StellarMarkDown content={message.content} type="ai" />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}

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
          <div className={`bg-[var(--color-semantic-background-primary)] border rounded-[12px] p-3 transition-all ${isStreaming
              ? 'border-red-300 bg-red-50'
              : 'border-[var(--pixis-sandstorm-s40,#e8e8e3)]'
            }`}>
            <div className="flex flex-col gap-8">
              {/* Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? "Generating response..." : "👋 Ask me anything about your campaigns..."}
                className="w-full bg-transparent text-[14px] font-normal text-[#072929] placeholder:text-[#072929] focus:outline-none"
                style={{ fontFamily: "'GT America Trial', sans-serif" }}
                disabled={isLoading || isStreaming}
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

// Wrapper component that conditionally renders the Assistant panel
export const Assistant: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const { isOpen } = useAssistant();

  const isFixed = ASSISTANT_PANEL_VIEW === "fixed";

  return (
    <div className={`bg-[var(--color-semantic-background-primary)] overflow-x-hidden min-w-0 flex ${isFixed ? "relative" : ""}`}>
      {/* Main Content */}
      <div
        style={isOpen && isFixed ? { marginRight: ASSISTANT_PANEL_WIDTH } : undefined}
        className={`flex-1 overflow-x-hidden transition-all duration-300 interactive-scrollbar`}
      >
        {children}
      </div>

      {/* Assistant Sidebar */}
      {isOpen && (
        <div
          className={`${isFixed ? "fixed" : "absolute"} right-0 top-[80px] bottom-0 z-40 bg-[var(--color-semantic-background-primary)] ${
            isFixed ? "border-l border-gray-200" : "rounded-l-2xl shadow-[-8px_0_24px_rgba(0,0,0,0.15)]"
          }`}
          style={{ width: ASSISTANT_PANEL_WIDTH }}
        >
          <AssistantPanel className={`h-full ${isFixed ? "" : "rounded-l-2xl overflow-hidden"}`} />
        </div>
      )}
    </div>
  );
};


