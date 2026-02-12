/**
 * Campaign form for Assistant chat: reuses campaign form components and shows
 * only the fields the AI requested (from current_questions_schema).
 * Submits only the requested keys to keep messages focused.
 */
import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import type { CreateGoogleCampaignData } from "../google/campaigns/types";
import { GoogleBiddingStrategyForm } from "../google/campaigns/GoogleBiddingStrategyForm";
import { GoogleDemandGenCampaignForm } from "../google/campaigns/GoogleDemandGenCampaignForm";
import { Dropdown } from "../ui/Dropdown";
import { getFieldLabel } from "./campaignFormFieldLabels";
import { getDefaultFormData, SALES_COUNTRY_OPTIONS, CAMPAIGN_PRIORITY_OPTIONS } from "../google/campaigns/utils";
import { campaignsService } from "../../services/campaigns";
import type { CurrentQuestionSchemaItem } from "../../types/agent";

const inputBaseClass =
  "w-full px-3 py-2 text-sm text-[#072929] bg-white border border-[#E8E8E3] rounded-[8px] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#136D6D]/40 focus:border-[#136D6D]";

const BASE_FIELD_KEYS = ["name", "campaign_type", "budget_amount", "budget_name", "start_date", "end_date", "status"];

const BIDDING_FIELD_KEYS = [
  "bidding_strategy_type",
  "target_cpa_micros",
  "target_roas",
  "target_spend_micros",
  "target_impression_share_location",
  "target_impression_share_location_fraction_micros",
  "target_impression_share_cpc_bid_ceiling_micros",
];

const DEMAND_GEN_FIELD_KEYS = [
  "final_url",
  "video_id",
  "video_url",
  "logo_url",
  "business_name",
  "headlines",
  "descriptions",
  "long_headlines",
  "ad_group_name",
  "ad_name",
  "channel_controls",
];

const SEARCH_FIELD_KEYS = ["adgroup_name", "keywords", "match_type"];
const SHOPPING_FIELD_KEYS = ["merchant_id", "sales_country", "campaign_priority", "enable_local"];
const PMAX_FIELD_KEYS = [
  "final_url",
  "asset_group_name",
  "business_name",
  "logo_url",
  "headlines",
  "descriptions",
  "marketing_image_url",
  "square_marketing_image_url",
  "long_headlines",
];

function getKeysForForm(schema: CurrentQuestionSchemaItem[]): string[] {
  return schema.map((q) => q.key).filter(Boolean);
}

function pickKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined && obj[k] !== "") {
      out[k as keyof T] = obj[k];
    }
  }
  return out;
}

function formatValue(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export interface CampaignFormForChatProps {
  questionsSchema: CurrentQuestionSchemaItem[];
  campaignDraft: Record<string, unknown> | undefined;
  campaignType: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  profileId?: string | number;
  accountId?: string;
  channelId?: string;
  googleProfiles?: Array<{ value: string; label: string; customer_id: string; customer_id_raw: string; profile_id?: number }>;
}

export interface CampaignFormForChatHandle {
  getValues(): Record<string, string>;
  clear(): void;
}

export const CampaignFormForChat = forwardRef<CampaignFormForChatHandle, CampaignFormForChatProps>(({
  questionsSchema,
  campaignDraft,
  campaignType,
  onSend,
  disabled = false,
  profileId,
  accountId,
  channelId,
  googleProfiles = [],
}, ref) => {
  const requestedKeys = getKeysForForm(questionsSchema);
  const ct = (campaignType || "").toUpperCase();

  const defaults = getDefaultFormData(ct) as CreateGoogleCampaignData;
  const initialFormData: CreateGoogleCampaignData = {
    ...defaults,
    campaign_type: (defaults.campaign_type || ct || "SEARCH") as CreateGoogleCampaignData["campaign_type"],
    ...(campaignDraft as Partial<CreateGoogleCampaignData>),
  };

  const [formData, setFormData] = useState<CreateGoogleCampaignData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merchantAccountOptions, setMerchantAccountOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingMerchantAccounts, setLoadingMerchantAccounts] = useState(false);
  const [merchantAccountsError, setMerchantAccountsError] = useState<string | null>(null);

  const fetchMerchantAccounts = useCallback(async () => {
    if (!accountId || ct !== "SHOPPING" || !profileId || !channelId) {
      setMerchantAccountOptions([]);
      setMerchantAccountsError(null);
      return;
    }
    setLoadingMerchantAccounts(true);
    setMerchantAccountsError(null);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid account or channel");
      }
      const accounts = await campaignsService.getGoogleMerchantAccounts(accountIdNum, channelIdNum, profileId);
      const options = accounts.map((a) => ({
        value: a.merchant_id ?? a.value,
        label: a.label || a.merchant_id || a.value,
      }));
      setMerchantAccountOptions(options);
      if (accounts.length === 0) {
        setMerchantAccountsError("No Merchant Center accounts found.");
      } else {
        setFormData((prev) => {
          if (!prev.merchant_id && options.length > 0) return { ...prev, merchant_id: options[0].value };
          return prev;
        });
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to fetch merchant accounts";
      setMerchantAccountsError(msg);
      setMerchantAccountOptions([]);
    } finally {
      setLoadingMerchantAccounts(false);
    }
  }, [accountId, channelId, profileId, ct]);

  useEffect(() => {
    if (ct === "SHOPPING" && accountId && channelId && profileId) {
      fetchMerchantAccounts();
    } else if (ct !== "SHOPPING") {
      setMerchantAccountOptions([]);
      setMerchantAccountsError(null);
    }
  }, [ct, accountId, channelId, profileId, fetchMerchantAccounts]);

  useImperativeHandle(ref, () => ({
    getValues: () => {
      let keysToUse = [...requestedKeys];
      if (requestedKeys.includes("bidding_strategy_type")) {
        const strat = formData.bidding_strategy_type;
        if (strat === "TARGET_CPA" && formData.target_cpa_micros != null) keysToUse.push("target_cpa_micros");
        if (strat === "TARGET_ROAS" && formData.target_roas != null) keysToUse.push("target_roas");
        if (strat === "TARGET_SPEND" && formData.target_spend_micros != null) keysToUse.push("target_spend_micros");
        if (strat === "TARGET_IMPRESSION_SHARE") {
          if (formData.target_impression_share_location) keysToUse.push("target_impression_share_location");
          if (formData.target_impression_share_location_fraction_micros != null) keysToUse.push("target_impression_share_location_fraction_micros");
          if (formData.target_impression_share_cpc_bid_ceiling_micros != null) keysToUse.push("target_impression_share_cpc_bid_ceiling_micros");
        }
        keysToUse = [...new Set(keysToUse)];
      }
      const vals: Record<string, string> = {};
      for (const k of keysToUse) {
        const v = formData[k as keyof CreateGoogleCampaignData];
        if (v !== undefined && v !== "" && v != null) {
          vals[k] = Array.isArray(v) ? v.join("\n") : typeof v === "object" ? JSON.stringify(v) : String(v);
        }
      }
      return vals;
    },
    clear: () => {
      setFormData(initialFormData);
      setErrors({});
    },
  }), [formData, requestedKeys]);

  const onChange = useCallback((field: keyof CreateGoogleCampaignData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    // When bidding_strategy_type is requested, include strategy-specific keys that have values (conditional fields)
    let keysToSubmit = [...requestedKeys];
    if (requestedKeys.includes("bidding_strategy_type")) {
      const strat = formData.bidding_strategy_type;
      if (strat === "TARGET_CPA" && formData.target_cpa_micros != null && formData.target_cpa_micros !== "")
        keysToSubmit.push("target_cpa_micros");
      if (strat === "TARGET_ROAS" && formData.target_roas != null && formData.target_roas !== "")
        keysToSubmit.push("target_roas");
      if (strat === "TARGET_SPEND" && formData.target_spend_micros != null && formData.target_spend_micros !== "")
        keysToSubmit.push("target_spend_micros");
      if (strat === "TARGET_IMPRESSION_SHARE") {
        if (formData.target_impression_share_location) keysToSubmit.push("target_impression_share_location");
        if (formData.target_impression_share_location_fraction_micros != null && formData.target_impression_share_location_fraction_micros !== "")
          keysToSubmit.push("target_impression_share_location_fraction_micros");
        if (formData.target_impression_share_cpc_bid_ceiling_micros != null && formData.target_impression_share_cpc_bid_ceiling_micros !== "")
          keysToSubmit.push("target_impression_share_cpc_bid_ceiling_micros");
      }
      keysToSubmit = [...new Set(keysToSubmit)];
    }

    const values = pickKeys(formData, keysToSubmit);
    const parts = keysToSubmit
      .map((key) => {
        const v = values[key];
        if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return null;
        const label = getFieldLabel(key);
        return `${label}: ${formatValue(v)}`;
      })
      .filter(Boolean) as string[];

    if (parts.length > 0) {
      onSend(parts.join("\n"));
    }
  };

  const baseKeys = requestedKeys.filter((k) => BASE_FIELD_KEYS.includes(k));
  // When bidding_strategy_type is requested, pass ALL bidding keys so conditional fields can show based on selected strategy
  const biddingKeys = requestedKeys.includes("bidding_strategy_type")
    ? BIDDING_FIELD_KEYS
    : requestedKeys.filter((k) => BIDDING_FIELD_KEYS.includes(k));
  const demandGenKeys = requestedKeys.filter((k) => DEMAND_GEN_FIELD_KEYS.includes(k));
  const searchKeys = requestedKeys.filter((k) => SEARCH_FIELD_KEYS.includes(k));
  const shoppingKeys = requestedKeys.filter((k) => SHOPPING_FIELD_KEYS.includes(k));
  const pmaxKeys = requestedKeys.filter((k) => PMAX_FIELD_KEYS.includes(k));

  const hasHeadlines = formData.headlines && Array.isArray(formData.headlines);
  const hasDescriptions = formData.descriptions && Array.isArray(formData.descriptions);
  const hasLongHeadlines = formData.long_headlines && Array.isArray(formData.long_headlines);

  const onAddHeadline = () => {
    const arr = [...(formData.headlines || [""])];
    if (arr.length < 15) arr.push("");
    onChange("headlines", arr);
  };
  const onRemoveHeadline = (i: number) => {
    const arr = (formData.headlines || []).filter((_, j) => j !== i);
    onChange("headlines", arr.length ? arr : [""]);
  };
  const onUpdateHeadline = (i: number, v: string) => {
    const arr = [...(formData.headlines || [""])];
    arr[i] = v;
    onChange("headlines", arr);
  };
  const onAddDescription = () => {
    const arr = [...(formData.descriptions || [""])];
    if (arr.length < 5) arr.push("");
    onChange("descriptions", arr);
  };
  const onRemoveDescription = (i: number) => {
    const arr = (formData.descriptions || []).filter((_, j) => j !== i);
    onChange("descriptions", arr.length ? arr : [""]);
  };
  const onUpdateDescription = (i: number, v: string) => {
    const arr = [...(formData.descriptions || [""])];
    arr[i] = v;
    onChange("descriptions", arr);
  };
  const onAddLongHeadline = () => {
    const arr = [...(formData.long_headlines || [""])];
    if (arr.length < 5) arr.push("");
    onChange("long_headlines", arr);
  };
  const onRemoveLongHeadline = (i: number) => {
    const arr = (formData.long_headlines || []).filter((_, j) => j !== i);
    onChange("long_headlines", arr.length ? arr : [""]);
  };
  const onUpdateLongHeadline = (i: number, v: string) => {
    const arr = [...(formData.long_headlines || [""])];
    arr[i] = v;
    onChange("long_headlines", arr);
  };

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  return (
    <div className="mt-2 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
      <p className="text-sm font-medium text-[#072929] mb-3">Fill in the details</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Base fields (name, budget, dates, status) */}
        {baseKeys.length > 0 && (
          <div className="space-y-3">
            {baseKeys.includes("name") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Campaign name *</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder="Enter campaign name"
                  className={inputBaseClass}
                  disabled={disabled}
                />
              </div>
            )}
            {baseKeys.includes("budget_amount") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Daily budget ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget_amount ?? ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange("budget_amount", !isNaN(v) ? v : 0);
                  }}
                  placeholder="0.00"
                  className={inputBaseClass}
                  disabled={disabled}
                />
              </div>
            )}
            {baseKeys.includes("start_date") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Start date</label>
                <input
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) => onChange("start_date", e.target.value)}
                  className={inputBaseClass}
                  disabled={disabled}
                />
              </div>
            )}
            {baseKeys.includes("end_date") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">End date</label>
                <input
                  type="date"
                  value={formData.end_date || ""}
                  onChange={(e) => onChange("end_date", e.target.value)}
                  className={inputBaseClass}
                  disabled={disabled}
                />
              </div>
            )}
            {baseKeys.includes("status") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Status</label>
                <select
                  value={formData.status || "PAUSED"}
                  onChange={(e) => onChange("status", e.target.value)}
                  className={inputBaseClass}
                  disabled={disabled}
                >
                  <option value="ENABLED">Enabled</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Bidding */}
        {biddingKeys.length > 0 && (
          <GoogleBiddingStrategyForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            showTitle={true}
            visibleKeys={biddingKeys}
          />
        )}

        {/* Demand Gen */}
        {demandGenKeys.length > 0 && ct === "DEMAND_GEN" && (
          <GoogleDemandGenCampaignForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            onAddHeadline={onAddHeadline}
            onRemoveHeadline={onRemoveHeadline}
            onUpdateHeadline={onUpdateHeadline}
            onAddDescription={onAddDescription}
            onRemoveDescription={onRemoveDescription}
            onUpdateDescription={onUpdateDescription}
            onAddLongHeadline={onAddLongHeadline}
            onRemoveLongHeadline={onRemoveLongHeadline}
            onUpdateLongHeadline={onUpdateLongHeadline}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            selectedProfileId={profileId != null ? String(profileId) : undefined}
            googleProfiles={googleProfiles}
            visibleKeys={demandGenKeys}
          />
        )}

        {/* Search-specific (simple inputs; full form has tabs) */}
        {searchKeys.length > 0 && ct === "SEARCH" && (
          <div className="space-y-3">
            {searchKeys.includes("adgroup_name") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Ad group name</label>
                <input
                  type="text"
                  value={formData.adgroup_name || ""}
                  onChange={(e) => onChange("adgroup_name", e.target.value)}
                  placeholder="Ad Group 1"
                  className={inputBaseClass}
                  disabled={disabled}
                />
              </div>
            )}
            {searchKeys.includes("keywords") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Keywords</label>
                <input
                  type="text"
                  value={Array.isArray(formData.keywords) ? formData.keywords.join(", ") : (formData.keywords as string) || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange("keywords", v.includes(",") ? v.split(",").map((s) => s.trim()).filter(Boolean) : v);
                  }}
                  placeholder="One per line or comma-separated"
                  className={inputBaseClass}
                  disabled={disabled}
                />
              </div>
            )}
            {searchKeys.includes("match_type") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Match type</label>
                <select
                  value={formData.match_type || "BROAD"}
                  onChange={(e) => onChange("match_type", e.target.value)}
                  className={inputBaseClass}
                  disabled={disabled}
                >
                  <option value="BROAD">Broad</option>
                  <option value="PHRASE">Phrase</option>
                  <option value="EXACT">Exact</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Shopping-specific */}
        {shoppingKeys.length > 0 && ct === "SHOPPING" && (
          <div className="space-y-3">
            {shoppingKeys.includes("merchant_id") && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#072929]">Merchant ID *</label>
                  {accountId && channelId && profileId && (
                    <button
                      type="button"
                      onClick={fetchMerchantAccounts}
                      disabled={loadingMerchantAccounts}
                      className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <svg className={`w-3 h-3 ${loadingMerchantAccounts ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {loadingMerchantAccounts ? "Refreshing..." : "Refresh"}
                    </button>
                  )}
                </div>
                {accountId && channelId && profileId ? (
                  <Dropdown<string>
                    options={merchantAccountOptions}
                    value={formData.merchant_id || ""}
                    onChange={(v) => onChange("merchant_id", v)}
                    placeholder={
                      loadingMerchantAccounts
                        ? "Loading merchant accounts..."
                        : merchantAccountOptions.length === 0
                        ? "No merchant accounts available"
                        : "Select merchant account"
                    }
                    buttonClassName="edit-button w-full"
                    searchable={true}
                    searchPlaceholder="Search merchant accounts..."
                    emptyMessage={loadingMerchantAccounts ? "Loading..." : merchantAccountsError || "No Merchant Center accounts found."}
                    disabled={loadingMerchantAccounts || disabled}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.merchant_id || ""}
                    onChange={(e) => onChange("merchant_id", e.target.value)}
                    placeholder="Select account & profile above to load merchants, or enter ID"
                    className={inputBaseClass}
                    disabled={disabled}
                  />
                )}
                {merchantAccountsError && accountId && channelId && profileId && (
                  <p className="text-[10px] text-yellow-600 mt-1">{merchantAccountsError}</p>
                )}
              </div>
            )}
            {shoppingKeys.includes("sales_country") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Sales country</label>
                <Dropdown<string>
                  options={SALES_COUNTRY_OPTIONS}
                  value={formData.sales_country || "US"}
                  onChange={(v) => onChange("sales_country", v)}
                  buttonClassName="edit-button w-full"
                  disabled={disabled}
                />
              </div>
            )}
            {shoppingKeys.includes("campaign_priority") && (
              <div>
                <label className="block text-xs font-medium text-[#072929] mb-1">Campaign Priority</label>
                <Dropdown<number>
                  options={CAMPAIGN_PRIORITY_OPTIONS}
                  value={formData.campaign_priority ?? 0}
                  onChange={(v) => onChange("campaign_priority", v)}
                  buttonClassName="edit-button w-full"
                  disabled={disabled}
                />
              </div>
            )}
            {shoppingKeys.includes("enable_local") && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_local || false}
                    onChange={(e) => onChange("enable_local", e.target.checked)}
                    className="w-4 h-4 accent-[#136D6D] border-gray-300 rounded"
                    disabled={disabled}
                  />
                  <span className="text-xs font-medium text-[#072929]">Enable Local</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* PMax: reuse Demand Gen form for overlapping fields */}
        {pmaxKeys.length > 0 && ct === "PERFORMANCE_MAX" && (
          <GoogleDemandGenCampaignForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            onAddHeadline={onAddHeadline}
            onRemoveHeadline={onRemoveHeadline}
            onUpdateHeadline={onUpdateHeadline}
            onAddDescription={onAddDescription}
            onRemoveDescription={onRemoveDescription}
            onUpdateDescription={onUpdateDescription}
            onAddLongHeadline={onAddLongHeadline}
            onRemoveLongHeadline={onRemoveLongHeadline}
            onUpdateLongHeadline={onUpdateLongHeadline}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            selectedProfileId={profileId != null ? String(profileId) : undefined}
            googleProfiles={googleProfiles}
            visibleKeys={pmaxKeys}
          />
        )}

        <button
          type="submit"
          disabled={disabled}
          className="self-start mt-1 px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          Send answers
        </button>
      </form>
    </div>
  );
});

CampaignFormForChat.displayName = "CampaignFormForChat";
