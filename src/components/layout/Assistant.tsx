import React, { useRef, useEffect } from "react";
import { useAssistant } from "../../contexts/AssistantContext";
import { Plus, Mic, BarChart3, Pencil } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";

interface AssistantPanelProps {
  className?: string;
}

// Helper function to format message content with rich styling
const formatMessageContent = (content: string): string => {
  return content
    // Convert bullet points
    .replace(/^• (.+)$/gm, '<div class="flex items-start gap-2 mb-2"><span class="text-gray-500 mt-1">•</span><span class="text-gray-800">$1</span></div>')
    // Convert numbered lists
    .replace(/^(\d+\.)\s(.+)$/gm, '<div class="flex items-start gap-2 mb-2"><span class="text-gray-600 font-medium">$1</span><span class="text-gray-800">$2</span></div>')
    // Convert headers with emojis
    .replace(/^([🔴🟡🟢📊💡🎯]|\w+)\s(.+?):\s*$/gm, '<div class="font-semibold text-gray-800 mt-4 mb-3 flex items-center gap-2"><span>$1</span><span>$2:</span></div>')
    // Convert sections
    .replace(/^([A-Z][^:]+):$/gm, '<div class="font-semibold text-gray-800 mt-4 mb-2">$1:</div>')
    // Convert line breaks to HTML
    .replace(/\n/g, '<br>')
    // Handle special formatting for budget ranges, percentages, etc.
    .replace(/(\$[\d,]+\s*-\s*\$[\d,]+)/g, '<span class="font-medium text-gray-800">$1</span>')
    .replace(/([+-]?\d+(\.\d+)?%)/g, '<span class="font-medium text-gray-800">$1</span>')
    // Handle "Reviewed X sources" pattern with subtle blue
    .replace(/Reviewed\s+(\d+)\s+sources/g, '<div class="inline-flex items-center gap-2 text-sm text-blue-600 font-medium mb-3"><span class="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center"><svg class="w-2.5 h-2.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>Reviewed $1 sources <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg></div>');
};

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
    clearMessages,
    currentThinkingSteps,
    isStreaming,
  } = useAssistant();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handlePromptClick = (promptText: string) => {
    sendMessage(promptText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-semantic-background-primary)] shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src={StellarLogo} alt="Stellar" className="h-8 w-8" />
        </div>
        <button
          onClick={clearMessages}
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
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`${
                    message.role === "user"
                      ? "flex flex-col justify-between items-end p-3 gap-1 h-auto bg-[#e5e4e0] rounded-[10px]"
                      : "space-y-3"
                  }`}
                >
                  {message.role === "user" ? (
                    <p 
                      className="text-[14px] font-normal leading-[20px] tracking-[0.1px] text-[#072929] whitespace-pre-wrap"
                      style={{ fontFamily: "'GT America Trial', sans-serif" }}
                    >
                      {message.content}
                    </p>
                  ) : (
                    /* Assistant Message with Rich Content */
                    <div 
                      className="flex flex-col items-start h-auto"
                      style={{ 
                        padding: '0px 16px 0px 16px',
                        fontFamily: "'GT America Trial', sans-serif"
                      }}
                    >
                      {/* Currently analyzing section */}
                      {(message.thinkingSteps && message.thinkingSteps.length > 0) || message.analysisText && (
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
                              Brand: Sony<br/>
                              Account: Amazon US<br/>
                              Date Range: Jan 1 – Feb 22, 2025
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Reviewed sources section */}
                      <div className="flex items-center gap-1.5  h-5">
                        <img src={StellarLogo} alt="Stellar" className="w-5 h-5" />
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="text-[14px] font-normal leading-5 tracking-[0.1px] text-[#136D6D]"
                            style={{ fontFamily: "'GT America Trial', sans-serif" }}
                          >
                            Reviewed 10 sources
                          </span>
                          <div 
                            className="w-5 h-5 flex items-center justify-center transform rotate-90"
                          >
                            <svg className="w-[6.17px] h-2.5" fill="#556179" viewBox="0 0 10 16">
                              <path d="M2.5 0L0 2.5L5 7.5L0 12.5L2.5 15L10 7.5L2.5 0Z"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div 
                        className=" h-auto text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929] whitespace-pre-wrap"
                        style={{ fontFamily: "'GT America Trial', sans-serif" }}
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(message.content)
                        }}
                      />
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
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-[#136D6D] focus-within:ring-1 focus-within:ring-[#136D6D]">
            {/* Add Attachment Button */}
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add attachment"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Input Field */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-base">👋</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your campaigns..."
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                disabled={isLoading}
              />
            </div>

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

  return (
    <div className="bg-[var(--color-semantic-background-primary)] overflow-x-hidden min-w-0 flex">
      {/* Main Content */}
      <div
        className={`flex-1 overflow-x-hidden transition-all duration-300 interactive-scrollbar ${isOpen ? "mr-[440px]" : ""}`}
      >
        {children}
      </div>

      {/* Assistant Sidebar - Fixed position under header */}
      {isOpen && (
        <div className="fixed right-0 top-[80px] bottom-0 w-[440px] z-40 bg-[var(--color-semantic-background-primary)] border-l border-gray-200">
          <AssistantPanel className="h-full" />
        </div>
      )}
    </div>
  );
};

// Trigger button to toggle Assistant panel
export const AssistantTrigger: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { toggleAssistant, isOpen } = useAssistant();

  return (
    <button
      onClick={toggleAssistant}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isOpen
          ? "bg-[#136D6D] text-white"
          : "text-gray-600 hover:bg-gray-100"
      } ${className}`}
    >
      <img
        src={StellarLogo}
        alt="Assistant"
        className="h-5 w-5"
        style={{ filter: isOpen ? "brightness(0) invert(1)" : "none" }}
      />
      <span>Assistant</span>
    </button>
  );
};

