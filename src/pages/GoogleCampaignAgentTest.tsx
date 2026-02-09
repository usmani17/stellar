import React, { useState, useCallback, useRef } from "react";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { sendAgentMessageStream } from "../services/googleCampaignAgent";

const CLARIFY_PROMPT = "What would you like to do?";
const DEFAULT_OPTIONS = [
  "Create a Google campaign",
  "Add ad groups",
  "Add keywords",
  "Create asset group or other entities",
];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestedOptions?: string[] | null;
}

export const GoogleCampaignAgentTest: React.FC = () => {
  const { sidebarWidth } = useSidebar();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setLoading(true);
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setMessage("");
      scrollToBottom();

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        await sendAgentMessageStream(
          text.trim(),
          {
            onStatus: () => {},
            onResponse: (payload) => {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: payload.content || "(No response text)",
                  suggestedOptions: payload.suggestedOptions ?? null,
                },
              ]);
              if (payload.state != null) setState(payload.state);
              scrollToBottom();
            },
            onError: (errMessage) => setError(errMessage),
          },
          { history, state },
        );
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { error?: string } } }).response
                ?.data?.error
            : err instanceof Error
              ? err.message
              : "Request failed";
        setError(String(msg));
      } finally {
        setLoading(false);
      }
    },
    [messages, state, scrollToBottom],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(message.trim());
  };

  const handleOptionClick = (option: string) => {
    sendMessage(option);
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="flex-1 bg-white flex flex-col"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 max-w-2xl w-full mx-auto flex flex-col flex-1 min-h-0">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Google Campaign Agent (LangGraph)
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Chat with the agent. Try a greeting, or &quot;Create a Google
            campaign&quot;.
          </p>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[200px] rounded-md border border-gray-200 bg-gray-50/50 p-4">
            {messages.length === 0 && (
              <p className="text-gray-500 text-sm">Send a message to start.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "rounded-lg px-4 py-2 bg-blue-600 text-white max-w-[85%]"
                      : "rounded-lg px-4 py-2 bg-white border border-gray-200 text-gray-900 max-w-[85%]"
                  }
                >
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" &&
                    m.suggestedOptions &&
                    m.suggestedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.suggestedOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleOptionClick(option)}
                            disabled={loading}
                            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  {m.role === "assistant" &&
                    !m.suggestedOptions &&
                    m.content?.trim() === CLARIFY_PROMPT && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {DEFAULT_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleOptionClick(option)}
                            disabled={loading}
                            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-white border border-gray-200 text-gray-500 italic text-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
