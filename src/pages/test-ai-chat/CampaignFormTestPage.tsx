/**
 * Test page for CampaignFormForChat visibleKeys behavior.
 * Toggle field checkboxes to show/hide form fields – simulates what the AI sends via current_questions_schema.
 * Visit /test-campaign-form to use.
 */
import React, { useState } from "react";
import { CampaignFormForChat } from "../../components/ai/CampaignFormForChat";
import { getFieldLabel } from "../../components/ai/campaignFormFieldLabels";
import type { CurrentQuestionSchemaItem } from "../../types/agent";

const ALL_FIELD_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Base", keys: ["name", "campaign_type", "budget_amount", "budget_name", "start_date", "end_date", "status"] },
  { label: "Bidding", keys: ["bidding_strategy_type", "target_cpa_micros", "target_roas", "target_spend_micros", "target_impression_share_location", "target_impression_share_location_fraction_micros", "target_impression_share_cpc_bid_ceiling_micros"] },
  { label: "Demand Gen", keys: ["final_url", "video_id", "video_url", "logo_url", "business_name", "headlines", "descriptions", "long_headlines", "ad_group_name", "ad_name", "channel_controls"] },
  { label: "Search", keys: ["adgroup_name", "keywords", "match_type"] },
  { label: "Shopping", keys: ["merchant_id", "sales_country", "campaign_priority", "enable_local"] },
];

const CAMPAIGN_TYPES = ["SEARCH", "SHOPPING", "DEMAND_GEN", "PERFORMANCE_MAX"] as const;

export const CampaignFormTestPage: React.FC = () => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(["name", "budget_amount", "bidding_strategy_type"]));
  const [campaignType, setCampaignType] = useState<string>("SEARCH");
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [profileId, setProfileId] = useState("");

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectGroup = (keys: string[]) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const clearGroup = (keys: string[]) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(ALL_FIELD_GROUPS.flatMap((g) => g.keys)));
  const clearAll = () => setSelectedKeys(new Set());
  const biddingStrategyOnly = () =>
    setSelectedKeys(new Set(["name", "campaign_type", "budget_amount", "bidding_strategy_type"]));

  const questionsSchema: CurrentQuestionSchemaItem[] = Array.from(selectedKeys).map((key) => ({
    key,
    type: "string",
    required: false,
    ui_hint: "text",
    label: getFieldLabel(key),
  }));

  const campaignDraft: Record<string, unknown> = {
    campaign_type: campaignType,
    name: "Test Campaign",
    budget_amount: 50,
    status: "PAUSED",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-[#072929]">Campaign Form visibleKeys Test</h1>
        <p className="text-sm text-gray-600">
          Select which fields to show in the form. Only selected fields will appear below – simulates AI sending keys via current_questions_schema.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2 border border-amber-200">
          <strong>Bidding:</strong> Selecting only <code className="bg-amber-100 px-1 rounded">bidding_strategy_type</code> will show conditional fields (Target CPA, Target ROAS, Target Spend, etc.) based on the chosen strategy. Use &quot;Bidding strategy only&quot; preset to test.
        </p>
        <p className="text-sm text-blue-700 bg-blue-50 rounded px-3 py-2 border border-blue-200">
          <strong>Merchant dropdown:</strong> For Shopping + merchant_id, fill Account ID, Channel ID, and Profile ID below to load the merchant dropdown (falls back to text input when empty).
        </p>

        {/* Campaign type selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-[#072929]">Campaign type:</span>
          {CAMPAIGN_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => setCampaignType(ct)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                campaignType === ct ? "bg-[#136D6D] text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {ct}
            </button>
          ))}
        </div>

        {/* Optional: Account/Channel/Profile for merchant dropdown (Shopping campaigns) */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#072929] mb-1">Account ID (for merchant dropdown)</label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g. 123"
              className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#072929] mb-1">Channel ID</label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="e.g. 456"
              className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#072929] mb-1">Profile ID</label>
            <input
              type="text"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="e.g. 123-456-7890"
              className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Field selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={biddingStrategyOnly}
              className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 rounded hover:bg-amber-200"
            >
              Bidding strategy only (conditional fields)
            </button>
          </div>
          {ALL_FIELD_GROUPS.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-[#072929]">{group.label}</span>
                <button
                  type="button"
                  onClick={() => selectGroup(group.keys)}
                  className="text-xs text-[#136D6D] hover:underline"
                >
                  + Add all
                </button>
                <button
                  type="button"
                  onClick={() => clearGroup(group.keys)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  − Remove all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.keys.map((key) => (
                  <label
                    key={key}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-colors"
                    style={{
                      borderColor: selectedKeys.has(key) ? "#136D6D" : "#e5e7eb",
                      backgroundColor: selectedKeys.has(key) ? "#136D6D0D" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(key)}
                      onChange={() => toggleKey(key)}
                      className="rounded border-gray-300 text-[#136D6D focus:ring-[#136D6D]"
                    />
                    <span className="text-xs font-medium text-[#072929]">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected keys count */}
        <p className="text-sm text-gray-600">
          Showing {selectedKeys.size} field{selectedKeys.size !== 1 ? "s" : ""}: {Array.from(selectedKeys).join(", ") || "(none)"}
        </p>

        {/* Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-[#072929] mb-3">Form (visibleKeys only)</h2>
          {selectedKeys.size > 0 ? (
            <CampaignFormForChat
              questionsSchema={questionsSchema}
              campaignDraft={campaignDraft}
              campaignType={campaignType}
              onSend={(msg) => {
                setLastSubmit(msg);
                console.log("[CampaignFormTest] Submit:", msg);
              }}
              disabled={false}
              accountId={accountId.trim() || undefined}
              channelId={channelId.trim() || undefined}
              profileId={profileId.trim() || undefined}
            />
          ) : (
            <p className="text-sm text-gray-500 py-4">Select at least one field above to show the form.</p>
          )}
        </div>

        {/* Last submit */}
        {lastSubmit && (
          <div className="bg-[#F9F9F6] border border-[#E8E8E3] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#072929] mb-2">Last submit (only selected keys):</h3>
            <pre className="text-xs text-[#072929] whitespace-pre-wrap font-mono">{lastSubmit}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
