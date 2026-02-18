/**
 * Standalone test page for AI chat.
 * LangGraph SDK has been removed; use the main Assistant panel instead.
 * Visit /test-ai-chat-tools for a redirect/message.
 * Includes preview of Thoughts & Ran tools UI.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ThoughtsSection } from "../../components/ai/ThoughtsSection";
import { RanToolBadges } from "../../components/ai/RanToolBadges";

const MOCK_THOUGHTS = `This is a complex request that requires several steps:

1. Get daily campaign performance data for January 1-31, 2026
2. Calculate 7-day rolling CPA for each campaign
3. Identify shifts where rolling CPA changed by +/- 30%
4. Separate into Search and Non-Search campaigns
5. Find the top 15 biggest shifts for each
6. Get change history data for the same period
7. Match changes within 48 hours of identified shifts

Let me break this down: First, I need to get daily campaign performance data for the specified period. I'll use the campaign performance tool with daily mode.

Then I'll need to:
- Calculate 7-day rolling averages for CPA
- Identify campaigns with 30%+ shifts
- Separate by campaign type
- Get top 15 for each category
- Pull change history
- Match timing

Let me start with getting the campaign performance data.`;

const MOCK_TOOLS = [
  { label: "get_campaign_performance_v2" },
  { label: "get_campaign_performance_v2" },
  { label: "get_campaign_performance_v2" },
];

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

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">
          Preview: Thoughts & Tools UI
        </h2>
        <div className="min-w-0 flex flex-col items-start p-4 gap-3 w-full max-w-full bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm">
          <ThoughtsSection content={MOCK_THOUGHTS} defaultExpanded />
          <RanToolBadges tools={MOCK_TOOLS} />
          <div className="assistant-message-content w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
            Here is the analysis of CPA shifts for January 2026. The top Search campaigns with the largest 7-day rolling CPA changes were…
          </div>
        </div>
      </section>
    </div>
  );
};
