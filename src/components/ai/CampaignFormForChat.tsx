/**
 * Campaign form for Assistant chat: reuses campaign form components and shows
 * only the fields the AI requested (from current_questions_schema).
 * Submits only the requested keys to keep messages focused.
 */
import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import type { CreateGoogleCampaignData } from "../google/campaigns/types";
import { BaseGoogleCampaignForm } from "../google/campaigns/BaseGoogleCampaignForm";
import { GoogleBiddingStrategyForm } from "../google/campaigns/GoogleBiddingStrategyForm";
import { GoogleDemandGenCampaignForm } from "../google/campaigns/GoogleDemandGenCampaignForm";
import { GoogleSearchCampaignForm } from "../google/campaigns/GoogleSearchCampaignForm";
import { GoogleShoppingCampaignForm } from "../google/campaigns/GoogleShoppingCampaignForm";
import { GoogleLanguageTargetingForm } from "../google/campaigns/GoogleLanguageTargetingForm";
import { GoogleLocationTargetingForm } from "../google/campaigns/GoogleLocationTargetingForm";
import { GoogleTrackingTemplateForm } from "../google/campaigns/GoogleTrackingTemplateForm";
import { GoogleDeviceTargetingForm } from "../google/campaigns/GoogleDeviceTargetingForm";
import { GooglePerformanceMaxAssetGroupForm } from "../google/campaigns/GooglePerformanceMaxAssetGroupForm";
import { getFieldLabel } from "./campaignFormFieldLabels";
import { getDefaultFormData } from "../google/campaigns/utils";
import { campaignsService } from "../../services/campaigns";
import { googleAdwordsCampaignsService } from "../../services/googleAdwords/googleAdwordsCampaigns";
import type { CurrentQuestionSchemaItem } from "../../types/agent";

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
const TARGETING_FIELD_KEYS = [
  "network_settings",
  "device_ids",
  "language_ids",
  "location_ids",
  "excluded_location_ids",
  "tracking_url_template",
  "final_url_suffix",
  "url_custom_parameters",
];

/** Campaign types that support each targeting field */
const TARGETING_BY_CAMPAIGN_TYPE: Record<string, string[]> = {
  SEARCH: TARGETING_FIELD_KEYS,
  SHOPPING: ["device_ids", "language_ids", "location_ids", "excluded_location_ids", "tracking_url_template", "final_url_suffix", "url_custom_parameters"],
  PERFORMANCE_MAX: ["device_ids", "language_ids", "location_ids", "excluded_location_ids", "tracking_url_template", "final_url_suffix", "url_custom_parameters"],
  DEMAND_GEN: ["tracking_url_template", "final_url_suffix", "url_custom_parameters"],
};

function targetingKeySupported(campaignType: string, key: string): boolean {
  const allowed = TARGETING_BY_CAMPAIGN_TYPE[campaignType];
  if (!allowed) return false;
  return allowed.includes(key);
}

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

function isRequested(key: string, requestedKeys: string[]): boolean {
  return requestedKeys.includes(key);
}

function pickKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) {
    const val = obj[k];
    if (k in obj && val !== undefined && val !== null && val !== "") {
      out[k as keyof T] = val as T[keyof T];
    }
  }
  return out;
}

function formatValue(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    const first = v[0];
    if (first && typeof first === "object" && "key" in first && "value" in first) {
      return (v as Array<{ key: string; value: string }>)
        .filter((p) => p.key || p.value)
        .map((p) => `${p.key}=${p.value}`)
        .join(", ");
    }
    return v.filter(Boolean).join(", ");
  }
  if (typeof v === "object" && v !== null && "target_search_network" in v) {
    const ns = v as { target_search_network?: boolean; target_content_network?: boolean };
    const parts: string[] = [];
    if (ns.target_search_network) parts.push("Search Network");
    if (ns.target_content_network) parts.push("Display Network");
    return parts.length > 0 ? parts.join(", ") : "None";
  }
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
  /** Optional: language options for Language Targeting (required for language_ids to work) */
  languageOptions?: Array<{ value: string; label: string; id: string }>;
  /** Optional: location options for Location Targeting (required for location_ids to work) */
  locationOptions?: Array<{ value: string; label: string; id: string; type: string; countryCode: string }>;
  /** Optional: loading state for language options (shows Loading... in dropdown) */
  loadingLanguages?: boolean;
  /** Optional: loading state for location options (shows Loading... in dropdown) */
  loadingLocations?: boolean;
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
  languageOptions = [],
  locationOptions = [],
  loadingLanguages = false,
  loadingLocations = false,
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
  const [budgetOptions, setBudgetOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [useCustomBudgetName, setUseCustomBudgetName] = useState(false);

  const fetchBudgets = useCallback(async () => {
    if (!accountId || !channelId || !profileId) {
      setBudgetOptions([]);
      return;
    }
    setLoadingBudgets(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid account or channel");
      }
      const pid = String(profileId);
      const budgets = await googleAdwordsCampaignsService.getGoogleBudgets(accountIdNum, channelIdNum, pid);
      const options = budgets.map((budget) => ({
        value: budget.resource_name,
        label: `${budget.name} ($${budget.amount_dollars?.toFixed(2) || "0.00"})`,
        name: budget.name,
      }));
      setBudgetOptions([
        { value: "__CUSTOM__", label: "Custom..." },
        ...options,
      ]);
    } catch (err) {
      console.error("Error fetching budgets:", err);
      setBudgetOptions([{ value: "__CUSTOM__", label: "Custom..." }]);
    } finally {
      setLoadingBudgets(false);
    }
  }, [accountId, channelId, profileId]);

  useEffect(() => {
    if (accountId && channelId && profileId) {
      fetchBudgets();
    } else {
      setBudgetOptions([]);
    }
  }, [accountId, channelId, profileId, fetchBudgets]);

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
      if (
        requestedKeys.includes("tracking_url_template") ||
        requestedKeys.includes("final_url_suffix") ||
        requestedKeys.includes("url_custom_parameters")
      ) {
        keysToUse.push("tracking_url_template", "final_url_suffix", "url_custom_parameters");
        keysToUse = [...new Set(keysToUse)];
      }
      if (requestedKeys.includes("budget_name") && formData.budget_resource_name) {
        keysToUse.push("budget_resource_name");
        keysToUse = [...new Set(keysToUse)];
      }
      const vals: Record<string, string> = {};
      for (const k of keysToUse) {
        const v = formData[k as keyof CreateGoogleCampaignData];
        if (v !== undefined && v !== "" && v != null) {
          if (k === "url_custom_parameters" && Array.isArray(v)) {
            vals[k] = (v as Array<{ key: string; value: string }>)
              .filter((p) => p.key || p.value)
              .map((p) => `${p.key}=${p.value}`)
              .join("\n");
          } else if (Array.isArray(v)) {
            vals[k] = v.join("\n");
          } else if (typeof v === "object") {
            vals[k] = JSON.stringify(v);
          } else {
            vals[k] = String(v);
          }
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

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    const req = (key: string) => isRequested(key, requestedKeys);

    // Base required fields (when requested)
    if (req("name") && (!formData.name?.trim())) {
      newErrors.name = "Campaign name is required";
    }
    if (req("budget_amount") && (!formData.budget_amount || formData.budget_amount <= 0)) {
      newErrors.budget_amount = "Budget must be greater than 0";
    }

    const ct = (formData.campaign_type || "").toUpperCase();

    if (ct === "DEMAND_GEN") {
      if (req("final_url") && (!formData.final_url?.trim())) {
        newErrors.final_url = "Final URL is required";
      } else if (req("final_url") && formData.final_url?.trim() && !/^https?:\/\/.+/.test(formData.final_url)) {
        newErrors.final_url = "Final URL must be a valid URL (http:// or https://)";
      }
      if (req("logo_url") && (!formData.logo_url?.trim() || formData.logo_url === "https://example.com")) {
        newErrors.logo_url = "Logo URL is required. Please provide a valid logo URL.";
      } else if (req("logo_url") && formData.logo_url?.trim() && !/^https?:\/\/.+/.test(formData.logo_url)) {
        newErrors.logo_url = "Logo URL must be a valid URL (http:// or https://)";
      }
      if ((req("video_id") || req("video_url")) && !formData.video_url?.trim() && !formData.video_id?.trim()) {
        newErrors.video_id = "Either video URL or video ID is required";
        newErrors.video_url = "Either video URL or video ID is required";
      } else if (req("video_url") && formData.video_url?.trim() && !/^https?:\/\/.+/.test(formData.video_url)) {
        newErrors.video_url = "Video URL must be a valid URL (http:// or https://)";
      } else if (req("video_id") && formData.video_id?.trim() && !/^[a-zA-Z0-9_-]{11}$/.test(formData.video_id)) {
        newErrors.video_id = "Video ID must be a valid YouTube video ID (11 characters)";
      }
      if (req("business_name") && !formData.business_name?.trim()) {
        newErrors.business_name = "Business name is required";
      }
      if (req("headlines")) {
        const valid = (formData.headlines || []).filter((h) => h?.trim());
        if (valid.length < 3) newErrors.headlines = "At least 3 headlines are required";
        else if (valid.length > 15) newErrors.headlines = "Maximum 15 headlines allowed";
      }
      if (req("descriptions")) {
        const valid = (formData.descriptions || []).filter((d) => d?.trim());
        if (valid.length < 2) newErrors.descriptions = "At least 2 descriptions are required";
        else if (valid.length > 4) newErrors.descriptions = "Maximum 4 descriptions allowed";
      }
      if (req("long_headlines")) {
        const src = (formData.long_headlines || []).filter((h) => h && String(h).trim());
        if (src.length < 1) newErrors.long_headlines = "At least 1 long headline is required. Max 90 characters each.";
        else if (src.length > 5) newErrors.long_headlines = "Maximum 5 long headlines allowed";
        else if (src.some((h) => String(h).length > 90)) newErrors.long_headlines = "Each long headline must be 90 characters or less";
      }
    }

    if (ct === "SHOPPING" && req("merchant_id") && !formData.merchant_id?.trim()) {
      newErrors.merchant_id = "Merchant ID is required";
    }

    if (ct === "PERFORMANCE_MAX") {
      if (req("business_name") && !formData.business_name?.trim()) {
        newErrors.business_name = "Business name is required";
      }
      if (req("logo_url") && (!formData.logo_url?.trim() || formData.logo_url === "https://example.com")) {
        newErrors.logo_url = "Square logo URL is required. Must be 1:1 aspect ratio.";
      } else if (req("logo_url") && formData.logo_url?.trim() && !/^https?:\/\/.+/.test(formData.logo_url)) {
        newErrors.logo_url = "Logo URL must be a valid URL (http:// or https://)";
      }
      if (req("headlines")) {
        const valid = (formData.headlines || []).filter((h) => h?.trim());
        if (valid.length < 3) newErrors.headlines = "At least 3 headlines are required";
        else if (valid.length > 15) newErrors.headlines = "Maximum 15 headlines allowed";
      }
      if (req("descriptions")) {
        const valid = (formData.descriptions || []).filter((d) => d?.trim());
        if (valid.length < 2) newErrors.descriptions = "At least 2 descriptions are required";
        else if (valid.length > 4) newErrors.descriptions = "Maximum 4 descriptions allowed";
      }
      if (req("marketing_image_url") && (!formData.marketing_image_url?.trim() || formData.marketing_image_url === "https://example.com")) {
        newErrors.marketing_image_url = "Marketing Image URL is required";
      } else if (req("marketing_image_url") && formData.marketing_image_url?.trim() && !/^https?:\/\/.+/.test(formData.marketing_image_url)) {
        newErrors.marketing_image_url = "Marketing Image URL must be a valid URL";
      }
      if (req("square_marketing_image_url") && (!formData.square_marketing_image_url?.trim() || formData.square_marketing_image_url === "https://example.com")) {
        newErrors.square_marketing_image_url = "Square Marketing Image URL is required";
      } else if (req("square_marketing_image_url") && formData.square_marketing_image_url?.trim() && !/^https?:\/\/.+/.test(formData.square_marketing_image_url)) {
        newErrors.square_marketing_image_url = "Square Marketing Image URL must be a valid URL";
      }
    }

    // Bidding strategy conditional
    if (req("bidding_strategy_type")) {
      if (formData.bidding_strategy_type === "TARGET_CPA" && req("target_cpa_micros") && (!formData.target_cpa_micros || formData.target_cpa_micros <= 0)) {
        newErrors.target_cpa_micros = "Target CPA is required and must be greater than 0";
      }
      if (formData.bidding_strategy_type === "TARGET_ROAS" && req("target_roas") && (!formData.target_roas || formData.target_roas <= 0)) {
        newErrors.target_roas = "Target ROAS is required and must be greater than 0";
      }
      if (formData.bidding_strategy_type === "TARGET_SPEND" && req("target_spend_micros") && (!formData.target_spend_micros || formData.target_spend_micros <= 0)) {
        newErrors.target_spend_micros = "Target Spend is required and must be greater than 0";
      }
      if (formData.bidding_strategy_type === "TARGET_IMPRESSION_SHARE") {
        if (req("target_impression_share_location") && !formData.target_impression_share_location) {
          newErrors.target_impression_share_location = "Location is required";
        }
        if (req("target_impression_share_location_fraction_micros") && (!formData.target_impression_share_location_fraction_micros || formData.target_impression_share_location_fraction_micros <= 0)) {
          newErrors.target_impression_share_location_fraction_micros = "Target impression share is required and must be greater than 0";
        }
        if (req("target_impression_share_cpc_bid_ceiling_micros") && (!formData.target_impression_share_cpc_bid_ceiling_micros || formData.target_impression_share_cpc_bid_ceiling_micros <= 0)) {
          newErrors.target_impression_share_cpc_bid_ceiling_micros = "Maximum CPC bid ceiling is required and must be greater than 0";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, requestedKeys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!validate()) return;

    // When bidding_strategy_type is requested, include strategy-specific keys that have values (conditional fields)
    let keysToSubmit = [...requestedKeys];
    if (requestedKeys.includes("bidding_strategy_type")) {
      const strat = formData.bidding_strategy_type;
      if (strat === "TARGET_CPA" && typeof formData.target_cpa_micros === "number")
        keysToSubmit.push("target_cpa_micros");
      if (strat === "TARGET_ROAS" && typeof formData.target_roas === "number")
        keysToSubmit.push("target_roas");
      if (strat === "TARGET_SPEND" && typeof formData.target_spend_micros === "number")
        keysToSubmit.push("target_spend_micros");
      if (strat === "TARGET_IMPRESSION_SHARE") {
        if (formData.target_impression_share_location) keysToSubmit.push("target_impression_share_location");
        if (typeof formData.target_impression_share_location_fraction_micros === "number")
          keysToSubmit.push("target_impression_share_location_fraction_micros");
        if (typeof formData.target_impression_share_cpc_bid_ceiling_micros === "number")
          keysToSubmit.push("target_impression_share_cpc_bid_ceiling_micros");
      }
      keysToSubmit = [...new Set(keysToSubmit)];
    }

    // When any tracking URL key is requested, include all tracking elements in submit (tracking_url_template, final_url_suffix, url_custom_parameters)
    const hasAnyTrackingKey =
      requestedKeys.includes("tracking_url_template") ||
      requestedKeys.includes("final_url_suffix") ||
      requestedKeys.includes("url_custom_parameters");
    if (hasAnyTrackingKey) {
      keysToSubmit.push("tracking_url_template", "final_url_suffix", "url_custom_parameters");
      keysToSubmit = [...new Set(keysToSubmit)];
    }

    const values = pickKeys(formData as unknown as Record<string, unknown>, keysToSubmit);
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
  const targetingKeys = requestedKeys.filter((k) => TARGETING_FIELD_KEYS.includes(k) && targetingKeySupported(ct, k));

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
  const [marketingImagePreview, setMarketingImagePreview] = useState<string | null>(null);
  const [squareMarketingImagePreview, setSquareMarketingImagePreview] = useState<string | null>(null);

  const profileIdNum = profileId != null ? (typeof profileId === "number" ? profileId : parseInt(String(profileId), 10)) : null;

  useEffect(() => {
    const m = formData.marketing_image_url?.trim();
    setMarketingImagePreview(m && /^https?:\/\//.test(m) ? m : null);
  }, [formData.marketing_image_url]);
  useEffect(() => {
    const s = formData.square_marketing_image_url?.trim();
    setSquareMarketingImagePreview(s && /^https?:\/\//.test(s) ? s : null);
  }, [formData.square_marketing_image_url]);

  const hasValidationErrors = Object.keys(errors).length > 0;

  return (
    <div className="mt-2 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
      <p className="text-sm font-medium text-[#072929] mb-3">Fill in the details</p>
      {hasValidationErrors && (
        <p className="text-xs text-red-500 mb-2" role="alert">
          Please fix the required fields below before submitting.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Base fields */}
        {baseKeys.length > 0 && (
          <BaseGoogleCampaignForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            mode="create"
            hideProfileSelector
            simpleBudgetMode={!(accountId && channelId && profileId)}
            budgetOptions={budgetOptions}
            selectedBudgetId={selectedBudgetId}
            setSelectedBudgetId={setSelectedBudgetId}
            useCustomBudgetName={useCustomBudgetName}
            setUseCustomBudgetName={setUseCustomBudgetName}
            loadingBudgets={loadingBudgets}
            visibleKeys={baseKeys}
            flatLayout
          />
        )}

        {/* Bidding */}
        {biddingKeys.length > 0 && (
          <GoogleBiddingStrategyForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            showTitle={true}
            visibleKeys={biddingKeys}
            flatLayout
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
            profileId={profileIdNum ?? undefined}
            googleProfiles={googleProfiles}
            visibleKeys={demandGenKeys}
            flatLayout
          />
        )}

        {/* Search-specific + targeting for SEARCH */}
        {ct === "SEARCH" && (searchKeys.length > 0 || targetingKeys.length > 0) && (
          <GoogleSearchCampaignForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            languageOptions={languageOptions}
            loadingLanguages={loadingLanguages}
            locationOptions={locationOptions}
            loadingLocations={loadingLocations}
            onLocationIdsChange={(ids) => onChange("location_ids", ids)}
            onExcludedLocationIdsChange={(ids) => onChange("excluded_location_ids", ids)}
            trackingUrlTemplate={formData.tracking_url_template || ""}
            finalUrlSuffix={formData.final_url_suffix || ""}
            urlCustomParameters={formData.url_custom_parameters || []}
            onTrackingUrlTemplateChange={(v) => onChange("tracking_url_template", v)}
            onFinalUrlSuffixChange={(v) => onChange("final_url_suffix", v)}
            onCustomParametersChange={(p) => onChange("url_custom_parameters", p ?? [])}
            onSelectConversionActionsClick={() => { }}
            visibleKeys={[...searchKeys, ...targetingKeys]}
            flatMode
            flatLayout
          />
        )}

        {/* Shopping-specific */}
        {shoppingKeys.length > 0 && ct === "SHOPPING" && (
          <GoogleShoppingCampaignForm
            formData={formData}
            errors={errors}
            onChange={onChange}
            mode="create"
            merchantAccountOptions={merchantAccountOptions}
            loadingMerchantAccounts={loadingMerchantAccounts}
            merchantAccountsError={merchantAccountsError}
            onFetchMerchantAccounts={fetchMerchantAccounts}
            languageOptions={languageOptions}
            loadingLanguages={loadingLanguages}
            locationOptions={locationOptions}
            loadingLocations={loadingLocations}
            onLocationIdsChange={(ids) => onChange("location_ids", ids)}
            onExcludedLocationIdsChange={(ids) => onChange("excluded_location_ids", ids)}
            trackingUrlTemplate={formData.tracking_url_template || ""}
            finalUrlSuffix={formData.final_url_suffix || ""}
            urlCustomParameters={formData.url_custom_parameters || []}
            onTrackingUrlTemplateChange={(v) => onChange("tracking_url_template", v)}
            onFinalUrlSuffixChange={(v) => onChange("final_url_suffix", v)}
            onCustomParametersChange={(p) => onChange("url_custom_parameters", p ?? [])}
            visibleKeys={shoppingKeys}
            flatMode
            flatLayout
          />
        )}

        {/* PMax: reuse Demand Gen form for overlapping fields */}
        {pmaxKeys.length > 0 && ct === "PERFORMANCE_MAX" && (
          <>
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
              profileId={profileIdNum ?? undefined}
              googleProfiles={googleProfiles}
              visibleKeys={pmaxKeys}
              sectionTitle="Performance Max Settings"
              flatLayout
            />
            {/* Performance Max–only: asset group name, marketing image URLs (reuse existing form with Select asset) */}
            {(requestedKeys.includes("asset_group_name") ||
              requestedKeys.includes("marketing_image_url") ||
              requestedKeys.includes("square_marketing_image_url")) && (
                <GooglePerformanceMaxAssetGroupForm
                  formData={formData}
                  errors={errors}
                  onChange={onChange}
                  onAddHeadline={onAddHeadline}
                  onRemoveHeadline={onRemoveHeadline}
                  onUpdateHeadline={onUpdateHeadline}
                  onAddDescription={onAddDescription}
                  onRemoveDescription={onRemoveDescription}
                  onUpdateDescription={onUpdateDescription}
                  logoPreview={logoPreview}
                  setLogoPreview={setLogoPreview}
                  marketingImagePreview={marketingImagePreview}
                  setMarketingImagePreview={setMarketingImagePreview}
                  squareMarketingImagePreview={squareMarketingImagePreview}
                  setSquareMarketingImagePreview={setSquareMarketingImagePreview}
                  setErrors={setErrors}
                  profileId={profileIdNum ?? undefined}
                  campaignType={ct as "PERFORMANCE_MAX"}
                  showOnlyImageAssets
                  visibleKeys={requestedKeys.filter((k) =>
                    ["asset_group_name", "marketing_image_url", "square_marketing_image_url"].includes(k)
                  )}
                />
              )}
          </>
        )}

        {/* Targeting: Device, Language, Location, Campaign URL Options (for SHOPPING/PMax; SEARCH uses GoogleSearchCampaignForm) */}
        {targetingKeys.length > 0 && (ct === "SHOPPING" || ct === "PERFORMANCE_MAX") && (
          <div className="space-y-4">
            {targetingKeys.includes("device_ids") && (
              <GoogleDeviceTargetingForm
                deviceIds={formData.device_ids}
                onChange={onChange}
                showTitle={true}
                disabled={disabled}
                flatLayout
              />
            )}

            {targetingKeys.includes("language_ids") && (
              <GoogleLanguageTargetingForm
                languageIds={formData.language_ids}
                languageOptions={languageOptions}
                loadingLanguages={loadingLanguages}
                onLanguageIdsChange={(ids) => onChange("language_ids", ids)}
                errors={errors}
                showTitle={true}
              />
            )}

            {targetingKeys.includes("location_ids") && (
              <GoogleLocationTargetingForm
                locationIds={formData.location_ids}
                excludedLocationIds={formData.excluded_location_ids}
                locationOptions={locationOptions}
                loadingLocations={loadingLocations}
                onLocationIdsChange={(ids) => onChange("location_ids", ids)}
                onExcludedLocationIdsChange={(ids) => onChange("excluded_location_ids", ids)}
                errors={errors}
                showTitle={true}
              />
            )}

            {(targetingKeys.includes("tracking_url_template") || targetingKeys.includes("final_url_suffix") || targetingKeys.includes("url_custom_parameters")) && (
              <GoogleTrackingTemplateForm
                trackingUrlTemplate={formData.tracking_url_template || ""}
                finalUrlSuffix={formData.final_url_suffix || ""}
                urlCustomParameters={formData.url_custom_parameters || []}
                onTrackingUrlTemplateChange={(v) => onChange("tracking_url_template", v)}
                onFinalUrlSuffixChange={(v) => onChange("final_url_suffix", v)}
                onCustomParametersChange={(p) => onChange("url_custom_parameters", p ?? [])}
                title="Campaign URL Options"
                showTitle={true}
              />
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="self-start mt-1 px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          Submit
        </button>
      </form>

    </div>
  );
});

CampaignFormForChat.displayName = "CampaignFormForChat";
