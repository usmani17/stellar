/**
 * Test page for CampaignFormForChat in chat context.
 * Preview how the form looks inside the Assistant chat layout.
 * Uses same component and props as AssistantPanel—test exact production experience.
 * Visit /test-chat-form to use.
 */
import React, { useState } from "react";
import { CampaignFormForChat } from "../../components/ai/CampaignFormForChat";
import { CampaignDraftPreview } from "../../components/ai/CampaignDraftPreview";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import {
  parseCampaignSetupJson,
  deriveCampaignStateFromContent,
  type CampaignSetupData,
} from "../../utils/chartJsonParser";
import type { CampaignDraftData } from "../../services/ai/pixisChat";

/** Keys CampaignFormForChat renders (asset IDs, targeting, URL options) */
const RENDERED_FIELD_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Asset IDs (Demand Gen & PMax)",
    keys: [
      "business_name_asset_id",
      "logo_asset_id",
      "marketing_image_asset_id",
      "square_marketing_image_asset_id",
      "headline_asset_ids",
      "description_asset_ids",
      "long_headline_asset_ids",
      "video_asset_ids",
      "sitelink_asset_ids",
      "callout_asset_ids",
    ],
  },
  {
    label: "Targeting & URL",
    keys: [
      "device_ids",
      "language_ids",
      "location_ids",
      "excluded_location_ids",
      "tracking_url_template",
      "final_url_suffix",
      "url_custom_parameters",
      "budget_name",
      "merchant_id",
      "sales_country",
    ],
  },
];

/** Keys server sends but form may not render (parity testing) */
const SERVER_ONLY_FIELD_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Server-only (form may not render)",
    keys: [
      "name",
      "campaign_type",
      "budget_amount",
      "bidding_strategy_type",
      "start_date",
      "end_date",
      "status",
      "target_cpa_micros",
      "target_roas",
      "network_settings",
      "final_url",
      "asset_group_name",
      "keywords",
      "match_type",
      "adgroup_name",
    ],
  },
];

const ALL_FIELD_GROUPS = [...RENDERED_FIELD_GROUPS, ...SERVER_ONLY_FIELD_GROUPS];

const CAMPAIGN_TYPES = ["SEARCH", "SHOPPING", "DEMAND_GEN", "PERFORMANCE_MAX"] as const;

const MOCK_AI_MESSAGE = "To create your campaign, I need a few details. Please fill in the form below.";

/** Flatten nested draft (campaign-setup format) to flat for CampaignFormForChat.
 * Uses bare key when entity is "campaign" so form finds formData[key].
 */
function flattenDraft(draft: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [entity, fields] of Object.entries(draft)) {
    if (fields && typeof fields === "object") {
      for (const [k, v] of Object.entries(fields)) {
        const outKey = entity === "campaign" || entity === "" ? k : `${entity}.${k}`;
        out[outKey] = v;
      }
    }
  }
  return out;
}

/** Parse input: markdown block, campaign-setup JSON, or campaign-draft event JSON */
function parseServerInput(input: string): CampaignSetupData | CampaignDraftData | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Markdown with ```campaign-setup block
  if (trimmed.includes("```campaign-setup") || trimmed.includes("```\ncampaign-setup")) {
    const derived = deriveCampaignStateFromContent(trimmed);
    return derived;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    // campaign-draft event format (SSE event body)
    if (parsed.type === "campaign-draft") {
      return {
        draft_id: String(parsed.draft_id ?? ""),
        platform: String(parsed.platform ?? ""),
        campaign_type: String(parsed.campaign_type ?? ""),
        complete: Boolean(parsed.complete),
        draft: (parsed.draft as Record<string, unknown>) ?? {},
        questions: (parsed.questions as Record<string, unknown>) ?? {},
        keys_for_form: Array.isArray(parsed.keys_for_form) ? parsed.keys_for_form.map(String) : [],
        validation_error: parsed.validation_error as string | null ?? null,
      };
    }
    // campaign-setup JSON format
    const setup = parseCampaignSetupJson(trimmed);
    return setup;
  } catch {
    return null;
  }
}

type InputMode = "manual" | "parse";

export const ChatFormTestPage: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [parseInput, setParseInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCampaignState, setParsedCampaignState] = useState<CampaignDraftData | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(["budget_name", "location_ids", "language_ids", "tracking_url_template"])
  );
  const [campaignType, setCampaignType] = useState<string>("SEARCH");
  const [campaignDraft, setCampaignDraft] = useState<Record<string, unknown>>({
    campaign_type: "SEARCH",
    name: "Test Campaign",
    budget_amount: 50,
    status: "PAUSED",
  });
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("20");
  const [channelId, setChannelId] = useState("31");
  const [profileId, setProfileId] = useState("21");
  const [showControls, setShowControls] = useState(true);

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
  const biddingStrategyOnly = () => {
    setInputMode("manual");
    setSelectedKeys(new Set(["budget_name", "tracking_url_template", "final_url_suffix", "url_custom_parameters"]));
    setCampaignType("SEARCH");
  };
  const performanceMaxPreset = () => {
    setInputMode("manual");
    setCampaignType("PERFORMANCE_MAX");
    setSelectedKeys(
      new Set([
        "budget_name",
        "marketing_image_asset_id",
        "square_marketing_image_asset_id",
        "business_name_asset_id",
        "logo_asset_id",
        "headline_asset_ids",
        "description_asset_ids",
        "long_headline_asset_ids",
      ])
    );
    setCampaignDraft({ campaign_type: "PERFORMANCE_MAX", name: "PMax Test", budget_amount: 50, status: "PAUSED" });
  };
  const searchWithTargeting = () => {
    setInputMode("manual");
    setSelectedKeys(
      new Set([
        "budget_name",
        "device_ids",
        "language_ids",
        "location_ids",
        "excluded_location_ids",
        "tracking_url_template",
        "final_url_suffix",
        "url_custom_parameters",
      ])
    );
    setCampaignType("SEARCH");
  };

  /** Server-style presets (simulate campaign-draft event payloads) */
  const serverDemandGenTargeting = () => {
    setInputMode("manual");
    setCampaignType("DEMAND_GEN");
    setSelectedKeys(
      new Set([
        "budget_name",
        "location_ids",
        "language_ids",
        "device_ids",
        "tracking_url_template",
        "headline_asset_ids",
        "description_asset_ids",
      ])
    );
    setCampaignDraft({
      campaign_type: "DEMAND_GEN",
      name: "Demand Gen Test",
      budget_amount: 100,
      status: "PAUSED",
    });
    setParsedCampaignState(null);
  };
  const serverPmaxAssets = () => {
    setInputMode("manual");
    setCampaignType("PERFORMANCE_MAX");
    setSelectedKeys(
      new Set([
        "marketing_image_asset_id",
        "square_marketing_image_asset_id",
        "business_name_asset_id",
        "logo_asset_id",
        "headline_asset_ids",
        "description_asset_ids",
        "long_headline_asset_ids",
      ])
    );
    setCampaignDraft({
      campaign_type: "PERFORMANCE_MAX",
      name: "PMax Assets Test",
      budget_amount: 50,
      status: "PAUSED",
    });
    setParsedCampaignState(null);
  };
  const serverShopping = () => {
    setInputMode("manual");
    setCampaignType("SHOPPING");
    setSelectedKeys(new Set(["merchant_id", "sales_country", "budget_name", "location_ids"]));
    setCampaignDraft({
      campaign_type: "SHOPPING",
      name: "Shopping Test",
      budget_amount: 75,
      status: "PAUSED",
    });
    setParsedCampaignState(null);
  };

  const handleParse = () => {
    setParseError(null);
    setParsedCampaignState(null);
    const result = parseServerInput(parseInput);
    if (!result) {
      setParseError("Could not parse. Paste campaign-setup JSON, markdown with ```campaign-setup block, or campaign-draft event JSON.");
      return;
    }
    const keys = result.keys_for_form ?? [];
    if (keys.length === 0) {
      setParseError("Parsed but keys_for_form is empty.");
      return;
    }
    setSelectedKeys(new Set(keys));
    setInputMode("manual");
    const ct = result.campaign_type || campaignType;
    setCampaignType(ct);

    const draft = result.draft;
    if (draft) {
      const dr = draft as Record<string, unknown>;
      const isNested = Object.values(dr).every(
        (v) => v != null && typeof v === "object" && !Array.isArray(v)
      ) && Object.keys(dr).length > 0;
      const flat = isNested
        ? flattenDraft(draft as unknown as Record<string, Record<string, unknown>>)
        : dr;
      setCampaignDraft({ ...flat, campaign_type: flat.campaign_type ?? ct });
      setParsedCampaignState({
        draft_id: result.draft_id ?? "",
        platform: result.platform ?? "google",
        campaign_type: ct,
        complete: result.complete ?? false,
        draft: flat,
        questions: result.questions ?? {},
        keys_for_form: keys,
        validation_error: result.validation_error ?? null,
      });
    } else {
      setCampaignDraft((prev) => ({ ...prev, campaign_type: ct }));
    }
  };

  const questionsSchema: string[] = Array.from(selectedKeys);

  const effectiveCampaignDraft: Record<string, unknown> = {
    ...campaignDraft,
    campaign_type: campaignDraft.campaign_type ?? campaignType,
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

          {/* Input mode: Manual vs Parse from server */}
          <div>
            <span className="text-xs font-medium text-[#072929] block mb-2">Input mode</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  inputMode === "manual" ? "bg-[#136D6D] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setInputMode("parse")}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  inputMode === "parse" ? "bg-[#136D6D] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Parse
              </button>
            </div>
          </div>

          {inputMode === "parse" && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-[#072929] block">
                Paste campaign-setup JSON, markdown with &#96;&#96;&#96;campaign-setup block, or campaign-draft event JSON
              </span>
              <textarea
                value={parseInput}
                onChange={(e) => {
                  setParseInput(e.target.value);
                  setParseError(null);
                }}
                placeholder='{"keys_for_form":["budget_name","location_ids"],"platform":"google","campaign_type":"DEMAND_GEN",...}'
                className="w-full min-h-[120px] px-2 py-1.5 text-xs font-mono border border-gray-300 rounded"
              />
              <button
                type="button"
                onClick={handleParse}
                className="px-3 py-1.5 text-xs font-medium bg-[#136D6D] text-white rounded hover:opacity-90"
              >
                Parse
              </button>
              {parseError && <p className="text-xs text-red-600">{parseError}</p>}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#072929]">Fields to show</span>
              <div className="flex gap-1 flex-wrap">
                <button type="button" onClick={selectAll} className="text-[10px] text-[#136D6D] hover:underline">All</button>
                <button type="button" onClick={clearAll} className="text-[10px] text-gray-500 hover:underline">Clear</button>
                <button type="button" onClick={biddingStrategyOnly} className="text-[10px] text-amber-600 hover:underline">URL</button>
                <button type="button" onClick={performanceMaxPreset} className="text-[10px] text-emerald-600 hover:underline">PMax</button>
                <button type="button" onClick={searchWithTargeting} className="text-[10px] text-purple-600 hover:underline">Targeting</button>
                <button type="button" onClick={serverDemandGenTargeting} className="text-[10px] text-blue-600 hover:underline">Server: Demand Gen</button>
                <button type="button" onClick={serverPmaxAssets} className="text-[10px] text-teal-600 hover:underline">Server: PMax</button>
                <button type="button" onClick={serverShopping} className="text-[10px] text-indigo-600 hover:underline">Server: Shopping</button>
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

                {/* CampaignDraftPreview – when parsed from server */}
                {parsedCampaignState && parsedCampaignState.draft && Object.keys(parsedCampaignState.draft).length > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] w-full">
                      <CampaignDraftPreview
                        campaignState={parsedCampaignState}
                        visible={true}
                        layout="expandable"
                        title={
                          <div className="flex items-center gap-2 mb-2">
                            <strong className="text-sm text-[#072929]">
                              Parsed draft · {parsedCampaignState.platform} · {parsedCampaignState.campaign_type}
                            </strong>
                          </div>
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Campaign form – same component and props as AssistantPanel */}
                {selectedKeys.size > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] w-full">
                      <CampaignFormForChat
                        questionsSchema={questionsSchema}
                        campaignDraft={effectiveCampaignDraft}
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
