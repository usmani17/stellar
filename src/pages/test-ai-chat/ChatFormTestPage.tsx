/**
 * Test page for CampaignFormForChat in chat context.
 * Preview how the form looks inside the Assistant chat layout.
 * Visit /test-chat-form to use.
 */
import React, { useState, useCallback, useEffect } from "react";
import { CampaignFormForChat } from "../../components/ai/CampaignFormForChat";
import { getFieldLabel } from "../../components/ai/campaignFormFieldLabels";
import type { CurrentQuestionSchemaItem } from "../../types/agent";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { campaignsService } from "../../services/campaigns";

const ALL_FIELD_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Base", keys: ["name", "campaign_type", "budget_amount", "budget_name", "start_date", "end_date", "status"] },
  { label: "Bidding", keys: ["bidding_strategy_type", "target_cpa_micros", "target_roas", "target_spend_micros", "target_impression_share_location", "target_impression_share_location_fraction_micros", "target_impression_share_cpc_bid_ceiling_micros"] },
  { label: "Demand Gen", keys: ["final_url", "video_id", "video_url", "logo_url", "business_name", "headlines", "descriptions", "long_headlines", "ad_group_name", "ad_name", "channel_controls"] },
  { label: "Performance Max", keys: ["asset_group_name", "marketing_image_url", "square_marketing_image_url"] },
  { label: "Search", keys: ["adgroup_name", "keywords", "match_type"] },
  { label: "Shopping", keys: ["merchant_id", "sales_country", "campaign_priority", "enable_local"] },
  {
    label: "Targeting (Network, Device, Language, Location, URL)",
    keys: [
      "network_settings",
      "device_ids",
      "language_ids",
      "location_ids",
      "excluded_location_ids",
      "tracking_url_template",
      "final_url_suffix",
      "url_custom_parameters",
    ],
  },
];

const CAMPAIGN_TYPES = ["SEARCH", "SHOPPING", "DEMAND_GEN", "PERFORMANCE_MAX"] as const;

const MOCK_AI_MESSAGE = "To create your campaign, I need a few details. Please fill in the form below.";

export const ChatFormTestPage: React.FC = () => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(["name", "budget_amount", "bidding_strategy_type"]));
  const [campaignType, setCampaignType] = useState<string>("SEARCH");
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("20");
  const [channelId, setChannelId] = useState("31");
  const [profileId, setProfileId] = useState("21");
  const [showControls, setShowControls] = useState(true);
  const [languageOptions, setLanguageOptions] = useState<Array<{ value: string; label: string; id: string }>>([]);
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string; id: string; type: string; countryCode: string }>>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const needsTargeting =
    campaignType === "SEARCH" || campaignType === "SHOPPING" || campaignType === "PERFORMANCE_MAX";

  const fetchLanguages = useCallback(async () => {
    const aid = accountId.trim();
    const cid = channelId.trim();
    const pid = profileId.trim();
    if (!aid || !cid || !pid || !needsTargeting) {
      setLanguageOptions([]);
      return;
    }
    const accountIdNum = parseInt(aid, 10);
    const channelIdNum = parseInt(cid, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
      setLanguageOptions([]);
      return;
    }
    setLoadingLanguages(true);
    try {
      const languages = await campaignsService.getGoogleLanguageConstants(
        accountIdNum,
        channelIdNum,
        pid
      );
      setLanguageOptions(
        languages.map((lang) => ({ value: lang.id, label: lang.name, id: lang.id }))
      );
    } catch (err) {
      console.error("Error fetching languages:", err);
      setLanguageOptions([]);
    } finally {
      setLoadingLanguages(false);
    }
  }, [accountId, channelId, profileId, needsTargeting]);

  const fetchLocations = useCallback(async () => {
    const aid = accountId.trim();
    const cid = channelId.trim();
    const pid = profileId.trim();
    if (!aid || !cid || !pid || !needsTargeting) {
      setLocationOptions([]);
      return;
    }
    const accountIdNum = parseInt(aid, 10);
    const channelIdNum = parseInt(cid, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
      setLocationOptions([]);
      return;
    }
    const countryCode = campaignType === "SHOPPING" ? "US" : undefined;
    setLoadingLocations(true);
    try {
      const locations = await campaignsService.getGoogleGeoTargetConstants(
        accountIdNum,
        channelIdNum,
        pid,
        undefined,
        countryCode
      );
      setLocationOptions(
        locations.map((loc) => ({
          value: loc.id,
          label: `${loc.name} (${loc.type})`,
          id: loc.id,
          type: loc.type,
          countryCode: loc.countryCode || "",
        }))
      );
    } catch (err) {
      console.error("Error fetching locations:", err);
      setLocationOptions([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [accountId, channelId, profileId, needsTargeting, campaignType]);

  useEffect(() => {
    if (needsTargeting && accountId.trim() && channelId.trim() && profileId.trim()) {
      fetchLanguages();
    } else {
      setLanguageOptions([]);
    }
  }, [needsTargeting, accountId, channelId, profileId, fetchLanguages]);

  useEffect(() => {
    if (needsTargeting && accountId.trim() && channelId.trim() && profileId.trim()) {
      fetchLocations();
    } else {
      setLocationOptions([]);
    }
  }, [needsTargeting, accountId, channelId, profileId, fetchLocations]);

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
  const performanceMaxPreset = () => {
    setCampaignType("PERFORMANCE_MAX");
    setSelectedKeys(
      new Set([
        "name",
        "campaign_type",
        "budget_amount",
        "budget_name",
        "start_date",
        "end_date",
        "status",
        "final_url",
        "asset_group_name",
        "business_name",
        "logo_url",
        "headlines",
        "descriptions",
        "marketing_image_url",
        "square_marketing_image_url",
        "long_headlines",
      ])
    );
  };
  const searchWithTargeting = () =>
    setSelectedKeys(
      new Set([
        "name",
        "campaign_type",
        "budget_amount",
        "bidding_strategy_type",
        "adgroup_name",
        "keywords",
        "match_type",
        "network_settings",
        "device_ids",
        "language_ids",
        "location_ids",
        "excluded_location_ids",
        "tracking_url_template",
        "final_url_suffix",
        "url_custom_parameters",
      ])
    );

  const questionsSchema: string[] = Array.from(selectedKeys);

  const campaignDraft: Record<string, unknown> = {
    campaign_type: campaignType,
    name: "Test Campaign",
    budget_amount: 50,
    status: "PAUSED",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Controls panel */}
      {showControls && (
        <div className="w-96 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#072929]">Configuration</h2>
            <button
              type="button"
              onClick={() => setShowControls(false)}
              className="text-xs text-gray-500 hover:text-[#072929]"
            >
              Hide
            </button>
          </div>
          <p className="text-xs text-gray-600">Adjust to preview form in chat context.</p>

          <div>
            <span className="text-xs font-medium text-[#072929] block mb-2">Campaign type</span>
            <div className="flex flex-wrap gap-1">
              {CAMPAIGN_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setCampaignType(ct)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    campaignType === ct ? "bg-[#136D6D] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-[#072929] block mb-2">Account / Channel / Profile (for Select asset, merchant, language & location)</span>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Account ID"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
              />
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Channel ID"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
              />
              <input
                type="text"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                placeholder="Profile ID"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#072929]">Fields to show</span>
                <div className="flex gap-1 flex-wrap">
                <button type="button" onClick={selectAll} className="text-[10px] text-[#136D6D] hover:underline">All</button>
                <button type="button" onClick={clearAll} className="text-[10px] text-gray-500 hover:underline">Clear</button>
                <button type="button" onClick={biddingStrategyOnly} className="text-[10px] text-amber-600 hover:underline">Bidding only</button>
                <button type="button" onClick={performanceMaxPreset} className="text-[10px] text-emerald-600 hover:underline">PMax</button>
                <button type="button" onClick={searchWithTargeting} className="text-[10px] text-purple-600 hover:underline">Search + Targeting</button>
              </div>
            </div>
            {ALL_FIELD_GROUPS.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-medium text-gray-500">{group.label}</span>
                  <button type="button" onClick={() => selectGroup(group.keys)} className="text-[10px] text-[#136D6D]">+</button>
                  <button type="button" onClick={() => clearGroup(group.keys)} className="text-[10px] text-gray-400">−</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.keys.map((key) => (
                    <label
                      key={key}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] ${
                        selectedKeys.has(key) ? "border-[#136D6D] bg-[#136D6D]/10" : "border-gray-200"
                      }`}
                    >
                      <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleKey(key)} className="rounded" />
                      {key.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat preview */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <h1 className="text-lg font-semibold text-[#072929]">Chat Form Test – Assistant preview</h1>
          {!showControls && (
            <button
              type="button"
              onClick={() => setShowControls(true)}
              className="text-sm text-[#136D6D] hover:underline"
            >
              Show controls
            </button>
          )}
        </div>

        {/* Chat panel mock – matches Assistant panel width & layout */}
        <div className="flex-1 flex justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-[550px] flex flex-col min-h-[400px] bg-[var(--color-semantic-background-primary)] rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Messages area – same structure as AssistantPanel */}
            <div className="flex-1 overflow-y-auto interactive-scrollbar px-4 py-4">
              <div className="flex flex-col gap-4">
                {/* Mock AI message bubble */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] min-w-0 flex flex-col items-start p-4 gap-3 h-auto bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm">
                    <div className="flex items-center gap-2 text-[#556179] mb-1">
                      <img src={StellarLogo} alt="" className="h-4 w-4 opacity-80" />
                      <span className="text-[11px] font-medium uppercase tracking-wider">Assistant</span>
                    </div>
                    <div className="text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929] w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                      {MOCK_AI_MESSAGE}
                    </div>
                  </div>
                </div>

                {/* Campaign form – same as in AssistantPanel */}
                {selectedKeys.size > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] w-full">
                      <CampaignFormForChat
                        questionsSchema={questionsSchema}
                        campaignDraft={campaignDraft}
                        campaignType={campaignType}
                        onSend={(msg) => {
                          setLastSubmit(msg);
                          console.log("[ChatFormTest] Submit:", msg);
                        }}
                        disabled={false}
                        accountId={accountId.trim() || undefined}
                        channelId={channelId.trim() || undefined}
                        profileId={profileId.trim() || undefined}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mock input area */}
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="rounded-[12px] p-3 bg-[#f9f9f6] border border-[#E8E8E3]">
                <textarea
                  placeholder="Ask me anything... (test page)"
                  className="w-full min-h-[60px] resize-none bg-transparent text-[14px] text-[#072929] placeholder:text-gray-400 focus:outline-none"
                  style={{ fontFamily: "'GT America Trial', sans-serif" }}
                  disabled
                  rows={2}
                />
                <div className="flex justify-end mt-2">
                  <span className="text-[10px] text-gray-400">Send button appears here</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last submit */}
        {lastSubmit && (
          <div className="mx-6 mb-4 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-lg">
            <h3 className="text-sm font-semibold text-[#072929] mb-2">Last submit:</h3>
            <pre className="text-xs text-[#072929] whitespace-pre-wrap font-mono">{lastSubmit}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
