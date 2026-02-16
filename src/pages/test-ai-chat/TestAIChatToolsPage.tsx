/**
 * Standalone test page for AI chat.
 * LangGraph SDK has been removed; use the main Assistant panel instead.
 * Visit /test-ai-chat-tools for a redirect/message.
 */
import React from "react";
import { Link } from "react-router-dom";

export const TestAIChatToolsPage: React.FC = () => {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">AI Chat Test</h1>
      <p className="text-gray-600 mb-4">
        The AI chat has been migrated to use the Pixis API. Use the main Assistant
        panel (chat icon in the sidebar) to test AI chat, charts, and campaign setup.
      </p>
      <Link to="/" className="text-[#136D6D] hover:underline">
        Go to Dashboard
      </Link>
    </div>
  );
};
