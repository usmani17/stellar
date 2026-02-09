import React, { useRef, useEffect, useState } from "react";
import { useAssistant, ASSISTANT_PANEL_VIEW,ASSISTANT_PANEL_WIDTH  } from "../../contexts/AssistantContext";
import { Plus, Mic, BarChart3, Pencil, ChevronDown, Check, Square } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
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


// Helper function to group threads by date
const groupThreadsByDate = (threads: Thread[]): Record<string, Thread[]> => {
  const groups: Record<string, Thread[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  threads.forEach(thread => {
    const threadDate = new Date(thread.created_at);
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-1" ref={dropdownRef}>
          <img src={StellarLogo} alt="Stellar" className="h-8 w-8" />

          {/* Thread Selector Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors max-w-[250px]"
            >
              <span className="truncate">
                {currentThread?.metadata?.title || 'New conversation'}
              </span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isThreadDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isThreadDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                {/* New Thread Button */}
                <button
                  onClick={handleNewThread}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New conversation</span>
                </button>

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
                  Object.entries(groupedThreads).map(([dateGroup, groupThreads]) => (
                    <div key={dateGroup}>
                      {/* Date Group Header */}
                      <div className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50">
                        {dateGroup}
                      </div>

                      {/* Threads in Group */}
                      {groupThreads.map((thread) => (
                        <button
                          key={thread.thread_id}
                          onClick={() => handleThreadSelect(thread.thread_id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors ${currentThread?.thread_id === thread.thread_id
                              ? 'bg-blue-50 text-blue-900'
                              : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <span className="truncate flex-1">{thread.metadata?.title || 'Untitled'}</span>
                          {currentThread?.thread_id === thread.thread_id && (
                            <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleNewThread}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="New conversation"
        >
          <Pencil className="w-5 h-5" />
        </button>
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
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${isStreaming
              ? 'bg-red-50 border-red-300 focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400'
              : 'bg-gray-50 border-gray-200 focus-within:border-[#136D6D] focus-within:ring-1 focus-within:ring-[#136D6D]'
            }`}>
            {/* Add Attachment Button */}
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add attachment"
              disabled={isStreaming}
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Input Field */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-base">{isStreaming ? '⏹️' : '👋'}</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? "Generating response..." : "Ask me anything about your campaigns..."}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                disabled={isLoading || isStreaming}
              />
            </div>

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
              <>
                {/* Voice Button */}
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Voice input"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Analytics Button */}
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View analytics"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
              </>
            )}
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


