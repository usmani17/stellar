import React, { useState } from "react";
import { useAgentConnection } from "../hooks/useAgentConnection";
import { useAgentChat } from "../hooks/useAgentChat";
import { MessageContent } from "../components/ai/MessageContent";

export const AgentChatPage: React.FC = () => {
  const { isConnected, isLoading: connectionLoading, error: connectionError, refetch } = useAgentConnection();
  const {
    messages,
    state,
    loading: chatLoading,
    error: chatError,
    thinkingSteps,
    sendMessage,
    resetConversation,
  } = useAgentChat();

  const [input, setInput] = useState("");

  if (connectionLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-gray-600">Checking agent connection…</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-gray-700 mb-4">
          Agent is not connected. Please check that the LangGraph server is running and try again.
        </p>
        {connectionError && <p className="text-red-600 text-sm mb-4">{connectionError}</p>}
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput("");
    sendMessage(text);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col min-h-[60vh]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Campaign setup</h1>
        <button
          type="button"
          onClick={resetConversation}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50 mb-4 min-h-[200px]">
        {messages.length === 0 && !chatLoading && (
          <p className="text-gray-500 text-sm">Send a message to start (e.g. &quot;Hi&quot; or &quot;Create a Demand Gen campaign&quot;).</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-3 ${m.role === "user" ? "text-right" : ""}`}
          >
            <span className="text-xs text-gray-500 mr-2">{m.role === "user" ? "You" : "Agent"}</span>
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm text-left ${
                m.role === "user" ? "bg-gray-800 text-white" : "bg-white border text-gray-800"
              }`}
            >
              <MessageContent content={m.content} />
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="text-gray-500 text-sm">
            {thinkingSteps.length > 0 ? `Thinking… ${thinkingSteps.join(" → ")}` : "Thinking…"}
          </div>
        )}
      </div>

      {chatError && <p className="text-red-600 text-sm mb-2">{chatError}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          disabled={chatLoading}
        />
        <button
          type="submit"
          disabled={chatLoading || !input.trim()}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          Send
        </button>
      </form>

      {state && (state.intent || state.phase || (state.validation_errors && state.validation_errors.length) || state.saved_draft_id) && (
        <details className="mt-4 border rounded-lg p-3 bg-gray-50">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">State (debug)</summary>
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            {state.intent != null && <div>intent: {String(state.intent)}</div>}
            {state.phase != null && <div>phase: {String(state.phase)}</div>}
            {state.campaign_type != null && <div>campaign_type: {String(state.campaign_type)}</div>}
            {state.validation_errors && state.validation_errors.length > 0 && (
              <div>validation_errors: {state.validation_errors.join(", ")}</div>
            )}
            {state.draft_plan != null && <div>draft_plan: {String(state.draft_plan).slice(0, 80)}…</div>}
            {state.saved_draft_id != null && <div>saved_draft_id: {state.saved_draft_id}</div>}
          </div>
        </details>
      )}
    </div>
  );
};
