import { parseDateToYYYYMMDD } from "../../../utils/dateHelpers";
import type { CreateGoogleCampaignData } from "../../../components/google/campaigns/types";
import type {
  IAd,
  IAdGroup,
  IAssetGroup,
  IChannelControls,
  ICampaign,
  ICampaignDraft,
  IKeywordTarget,
  INetworkSettings,
} from "../../../types/google/campaignDraft";

/** Normalize network settings: convert null to undefined for CreateGoogleCampaignData. */
function normalizeNetworkSettings(
  ns: INetworkSettings | Record<string, unknown> | null | undefined
): Record<string, boolean | undefined> | undefined {
  if (ns == null || typeof ns !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(ns).map(([k, v]) => [k, v === null ? undefined : v])
  ) as Record<string, boolean | undefined>;
}

/** Normalize channel controls: convert null to undefined for CreateGoogleCampaignData. */
function normalizeChannelControls(
  cc: IChannelControls | Record<string, unknown> | null | undefined
): Record<string, boolean | undefined> | undefined {
  if (cc == null || typeof cc !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(cc).map(([k, v]) => [k, v === null ? undefined : v])
  ) as Record<string, boolean | undefined>;
}

/** Parse asset value: supports numeric ID or resource name (customers/X/assets/Y). */
export function parseAssetValue(val: string | number): { id: string; resourceName: string } {
  const str = String(val).trim();
  const m = str.match(/^customers\/[^/]+\/assets\/(\d+)$/);
  if (m) return { id: m[1], resourceName: str };
  return { id: str, resourceName: str };
}

/**
 * Build initial CreateGoogleCampaignData from a campaign object (list row or campaign detail).
 * Used when opening a campaign in edit mode from the campaigns listing (e.g. after navigating
 * from campaign detail "Edit & Publish").
 */
export function buildInitialCampaignDataFromCampaign(
  campaignData: Record<string, any>
): Partial<CreateGoogleCampaignData> {
  // Support both flat campaign object and wrapped API response { campaign: {...} }
  const row: Record<string, any> =
    campaignData.campaign != null && typeof campaignData.campaign === "object"
      ? campaignData.campaign
      : campaignData;

  let extra_data: Record<string, any> = row.extra_data ?? campaignData.extra_data ?? {};
  if (typeof extra_data === "string") {
    try {
      extra_data = JSON.parse(extra_data);
    } catch {
      extra_data = {};
    }
  }
  const draft_state: ICampaignDraft | null = extra_data?.draft_state ?? null;
  const draft_campaign: Partial<ICampaign> = draft_state?.campaign ?? {};
  const draft_ad_group: Partial<IAdGroup> =
    draft_state?.ad_group && typeof draft_state.ad_group === "object"
      ? draft_state.ad_group
      : {};
  const draft_ad: Partial<IAd> =
    draft_state?.ad && typeof draft_state.ad === "object" ? draft_state.ad : {};
  const shopping_setting = extra_data.shopping_setting || {};
  const campaignType =
    ((draft_state?.campaign_type as any) ||
      row.campaign_type ||
      row.advertising_channel_type?.toUpperCase() ||
      extra_data.campaign_type) as any ||
    "PERFORMANCE_MAX";

  const budgetFromMicros =
    row.campaign_budget_amount_micros != null
      ? Number(row.campaign_budget_amount_micros) / 1_000_000
      : undefined;
  const budgetAmount =
    (typeof draft_campaign.budget_amount === "number"
      ? draft_campaign.budget_amount
      : undefined) ??
    row.budget_amount ??
    row.daily_budget ??
    budgetFromMicros ??
    0;

  const draft_asset_group: Partial<IAssetGroup> =
    draft_state?.asset_group && typeof draft_state.asset_group === "object"
      ? draft_state.asset_group
      : {};

  const initial: Partial<CreateGoogleCampaignData> = {
    name:
      draft_campaign.name ??
      (row.campaignName ?? row.name) ??
      (row.name || row.campaign_name || ""),
    campaign_type: (draft_state?.campaign_type as any) || campaignType,
    budget_amount:
      (typeof draft_campaign.budget_amount === "number"
        ? draft_campaign.budget_amount
        : undefined) ?? budgetAmount,
    budget_name:
      (draft_campaign.budget_name as string | undefined) ??
      row.budget_name ??
      row.campaign_budget_name ??
      row.campaignBudgetName ??
      undefined,
    budget_resource_name: draft_campaign.budget_id ?? row.campaign_budget_resource_name ?? row.budget_resource_name,
    status:
      (draft_campaign.status && draft_campaign.status.toUpperCase() !== "SAVED_DRAFT" ? draft_campaign.status.toUpperCase() as any : undefined) ??
      (row.status && row.status.toUpperCase() !== "SAVED_DRAFT" ? row.status.toUpperCase() as any : undefined) ??
      "PAUSED",
    start_date:
      (draft_campaign.start_date
        ? parseDateToYYYYMMDD(draft_campaign.start_date)
        : undefined) ??
      parseDateToYYYYMMDD(row.start_date) ??
      undefined,
    end_date:
      (draft_campaign.end_date
        ? parseDateToYYYYMMDD(draft_campaign.end_date)
        : undefined) ??
      parseDateToYYYYMMDD(row.end_date) ??
      undefined,
    bidding_strategy_type:
      (draft_campaign.bidding_strategy_type as string) ??
      row.bidding_strategy_type ??
      undefined,
    target_cpa_micros: (() => {
      const raw =
        (draft_campaign.target_cpa_micros != null ? Number(draft_campaign.target_cpa_micros) : undefined) ??
        row.target_cpa_micros;
      if (raw == null || raw <= 0) return undefined;
      // If value < 1e6, treat as dollars and convert to micros (form expects micros, displays dollars)
      if (raw < 1_000_000) return Math.round(raw * 1_000_000);
      return raw;
    })(),
    target_roas: draft_campaign.target_roas ?? row.target_roas,
    target_spend_micros: (() => {
      const raw =
        (draft_campaign.target_spend_micros != null ? Number(draft_campaign.target_spend_micros) : undefined) ??
        row.target_spend_micros;
      if (raw == null || raw <= 0) return undefined;
      if (raw < 1_000_000) return Math.round(raw * 1_000_000);
      return raw;
    })(),
    target_impression_share_location: (() => {
      const raw = 
        (draft_campaign.target_impression_share_location as string) ??
        row.target_impression_share_location;
      return raw || undefined;
    })(),
    target_impression_share_location_fraction_micros: (() => {
      // draft_state values are already in display units (what user originally entered)
      const raw = draft_campaign.target_impression_share_location_fraction_micros != null 
        ? Number(draft_campaign.target_impression_share_location_fraction_micros) 
        : row.target_impression_share_location_fraction_micros;
      if (raw == null || raw <= 0) return undefined;
      // Only convert from campaignData (which might be in micros from database)
      // draft_state values are already in display units
      return raw;
    })(),
    target_impression_share_cpc_bid_ceiling_micros: (() => {
      // draft_state values are already in display units (what user originally entered)
      const raw = draft_campaign.target_impression_share_cpc_bid_ceiling_micros != null 
        ? Number(draft_campaign.target_impression_share_cpc_bid_ceiling_micros) 
        : row.target_impression_share_cpc_bid_ceiling_micros;
      if (raw == null || raw <= 0) return undefined;
      // Only convert from campaignData (which might be in micros from database)
      // draft_state values are already in display units
      return raw;
    })(),
    tracking_url_template:
      (draft_campaign.tracking_url_template as string) ??
      row.tracking_url_template ??
      undefined,
    final_url_suffix:
      (draft_campaign.final_url_suffix as string) ??
      row.final_url_suffix ??
      undefined,
    url_custom_parameters:
      (draft_campaign.url_custom_parameters as any) ??
      row.url_custom_parameters ??
      undefined,
    location_ids:
      (draft_campaign.location_ids && Array.isArray(draft_campaign.location_ids)
        ? draft_campaign.location_ids
            .map((id: number | string) =>
              typeof id === "string" ? parseInt(id, 10) : id
            )
            .filter((n: number) => !isNaN(n))
        : undefined) ??
      row.location_ids ??
      [],
    excluded_location_ids:
      (draft_campaign.excluded_location_ids &&
      Array.isArray(draft_campaign.excluded_location_ids)
        ? draft_campaign.excluded_location_ids.map((id: number | string) =>
            String(id)
          )
        : undefined) ??
      row.excluded_location_ids ??
      [],
    language_ids:
      (draft_campaign.language_ids &&
      Array.isArray(draft_campaign.language_ids)
        ? draft_campaign.language_ids.map((id: number | string) =>
            String(id)
          )
        : undefined) ??
      row.language_ids ??
      [],
    device_ids:
      (draft_campaign.device_ids &&
      Array.isArray(draft_campaign.device_ids)
        ? draft_campaign.device_ids.map((id: number | string) => String(id))
        : undefined) ??
      row.device_ids ??
      [],
    merchant_id:
      (draft_campaign.merchant_id != null ? String(draft_campaign.merchant_id) : undefined) ??
      row.merchant_id ??
      shopping_setting.merchant_id,
    sales_country:
      (draft_campaign.sales_country as string | undefined) ??
      row.sales_country ??
      shopping_setting.sales_country ??
      "US",
    campaign_priority:
      (typeof draft_campaign.campaign_priority === "number"
        ? draft_campaign.campaign_priority
        : undefined) ??
      row.campaign_priority ??
      shopping_setting.campaign_priority ??
      0,
    enable_local:
      (draft_campaign.enable_local === true ||
      draft_campaign.enable_local === false
        ? draft_campaign.enable_local
        : undefined) ?? row.enable_local ?? shopping_setting.enable_local ?? false,
    network_settings:
      normalizeNetworkSettings(draft_campaign.network_settings) ??
      normalizeNetworkSettings(row.network_settings) ??
      normalizeNetworkSettings(extra_data?.network_settings) ??
      undefined,
  };

  if (draft_state && typeof draft_state === "object") {
    if (draft_state.profile_id != null) {
      initial.profile_id = String(draft_state.profile_id);
    }
    if (row.customer_id != null) {
      initial.customer_id = String(row.customer_id);
    }
  }

  if (campaignType === "PERFORMANCE_MAX") {
    const draft_ag = draft_asset_group;
    const dad = draft_ad;
    if (draft_ag.business_name != null) {
      initial.business_name = String(draft_ag.business_name);
    } else if (dad.business_name != null) {
      initial.business_name = String(dad.business_name);
    } else if (extra_data.business_name) {
      initial.business_name = extra_data.business_name;
    }
    if (draft_ag.logo_url != null) {
      initial.logo_url = String(draft_ag.logo_url);
    } else if (dad.logo_url != null) {
      initial.logo_url = String(dad.logo_url);
    } else if (extra_data.logo_url) {
      initial.logo_url = extra_data.logo_url;
    }
    if (draft_campaign.final_url) {
      initial.final_url = String(draft_campaign.final_url);
    } else if (extra_data.final_url) {
      initial.final_url = extra_data.final_url;
    }
    if (draft_campaign.headlines && Array.isArray(draft_campaign.headlines)) {
      initial.headlines = draft_campaign.headlines;
    } else if (draft_ag.headlines && Array.isArray(draft_ag.headlines)) {
      initial.headlines = draft_ag.headlines;
    } else if (extra_data.headlines && Array.isArray(extra_data.headlines)) {
      initial.headlines = extra_data.headlines;
    }
    if (draft_campaign.descriptions && Array.isArray(draft_campaign.descriptions)) {
      initial.descriptions = draft_campaign.descriptions;
    } else if (draft_ag.descriptions && Array.isArray(draft_ag.descriptions)) {
      initial.descriptions = draft_ag.descriptions;
    } else if (extra_data.descriptions && Array.isArray(extra_data.descriptions)) {
      initial.descriptions = extra_data.descriptions;
    }
    if (draft_ag.long_headlines && Array.isArray(draft_ag.long_headlines)) {
      initial.long_headlines = draft_ag.long_headlines;
    } else if (dad.long_headlines && Array.isArray(dad.long_headlines)) {
      initial.long_headlines = dad.long_headlines;
    } else if (extra_data.long_headlines && Array.isArray(extra_data.long_headlines)) {
      initial.long_headlines = extra_data.long_headlines;
    } else if (extra_data.long_headline) {
      initial.long_headlines = [extra_data.long_headline];
    }
    if (draft_ag.asset_group_name != null) {
      initial.asset_group_name = String(draft_ag.asset_group_name);
    } else if (extra_data.asset_group_name) {
      initial.asset_group_name = extra_data.asset_group_name;
    }
    if (draft_ag.logo_asset_id != null) {
      const parsed = parseAssetValue(String(draft_ag.logo_asset_id));
      initial.logo_asset_id = parsed.id;
      initial.logo_asset_resource_name = parsed.resourceName;
    }
    if (draft_ag.business_name_asset_id != null) {
      const parsed = parseAssetValue(String(draft_ag.business_name_asset_id));
      initial.business_name_asset_id = parsed.id;
      initial.business_name_asset_resource_name = parsed.resourceName;
    }
    if (draft_ag.marketing_image_url != null) initial.marketing_image_url = String(draft_ag.marketing_image_url);
    else if (extra_data.marketing_image_url) initial.marketing_image_url = extra_data.marketing_image_url;
    if (draft_ag.square_marketing_image_url != null) initial.square_marketing_image_url = String(draft_ag.square_marketing_image_url);
    else if (extra_data.square_marketing_image_url) initial.square_marketing_image_url = extra_data.square_marketing_image_url;
    if (draft_ag.video_asset_ids != null && Array.isArray(draft_ag.video_asset_ids)) initial.video_asset_ids = draft_ag.video_asset_ids.map(String);
    if (extra_data.video_asset_resource_names && Array.isArray(extra_data.video_asset_resource_names)) initial.video_asset_resource_names = extra_data.video_asset_resource_names;
    if (draft_ag.headline_asset_ids != null && Array.isArray(draft_ag.headline_asset_ids)) initial.headline_asset_ids = draft_ag.headline_asset_ids.map((id) => id ?? undefined);
    if (draft_ag.description_asset_ids != null && Array.isArray(draft_ag.description_asset_ids)) initial.description_asset_ids = draft_ag.description_asset_ids.map((id) => id ?? undefined);
    if (draft_ag.long_headline_asset_ids != null && Array.isArray(draft_ag.long_headline_asset_ids)) initial.long_headline_asset_ids = draft_ag.long_headline_asset_ids.map((id) => id ?? undefined);
    if (draft_ag.callout_asset_ids != null && Array.isArray(draft_ag.callout_asset_ids)) initial.callout_asset_ids = draft_ag.callout_asset_ids.map(String);
    if (draft_ag.sitelink_asset_ids != null && Array.isArray(draft_ag.sitelink_asset_ids)) initial.sitelink_asset_ids = draft_ag.sitelink_asset_ids.map(String);
    if (draft_ag.marketing_image_asset_id != null) initial.marketing_image_asset_id = String(draft_ag.marketing_image_asset_id);
    if (draft_ag.square_marketing_image_asset_id != null) initial.square_marketing_image_asset_id = String(draft_ag.square_marketing_image_asset_id);
    if (!initial.headlines || !Array.isArray(initial.headlines)) initial.headlines = [""];
    if (!initial.descriptions || !Array.isArray(initial.descriptions)) initial.descriptions = [""];
  }

  if (campaignType === "DEMAND_GEN") {
    const dcampaign = draft_campaign;
    const dadgroup = draft_ad_group;
    const dad = draft_ad;
    const startDate = dcampaign.start_date;
    if (startDate) initial.start_date = parseDateToYYYYMMDD(startDate) || initial.start_date;
    const endDate = dcampaign.end_date;
    if (endDate) initial.end_date = parseDateToYYYYMMDD(endDate) || initial.end_date;
    if (typeof dcampaign.budget_amount === "number") initial.budget_amount = dcampaign.budget_amount;
    const budgetName = dcampaign.budget_name;
    if (budgetName) initial.budget_name = budgetName;
    const biddingType = dcampaign.bidding_strategy_type;
    if (biddingType) initial.bidding_strategy_type = biddingType;
    if (dcampaign.status != null) initial.status = String(dcampaign.status).toUpperCase() as "ENABLED" | "PAUSED";
    if (dcampaign.final_url_suffix != null) initial.final_url_suffix = String(dcampaign.final_url_suffix);
    if (dcampaign.tracking_url_template != null) initial.tracking_url_template = String(dcampaign.tracking_url_template);
    if (dcampaign.url_custom_parameters != null && typeof dcampaign.url_custom_parameters === "object") initial.url_custom_parameters = dcampaign.url_custom_parameters;
    const adGroupName = dadgroup.ad_group_name ?? dadgroup.adgroup_name;
    if (adGroupName) initial.ad_group_name = adGroupName;
    const adName = dad.ad_name;
    if (adName) initial.ad_name = adName;
    const headlines = dad.headlines;
    if (headlines && Array.isArray(headlines)) initial.headlines = headlines;
    const descriptions = dad.descriptions;
    if (descriptions && Array.isArray(descriptions)) initial.descriptions = descriptions;
    const longHeadlines = dad.long_headlines;
    if (longHeadlines && Array.isArray(longHeadlines)) initial.long_headlines = longHeadlines;
    const videoId = dad.video_id;
    if (videoId != null) initial.video_id = String(videoId);
    const videoUrl = dad.video_url;
    if (videoUrl != null) initial.video_url = String(videoUrl);
    const finalUrl = dad.final_url;
    if (finalUrl != null) initial.final_url = String(finalUrl);
    const businessName = dad.business_name;
    if (businessName != null) initial.business_name = String(businessName);
    const logoUrl = dad.logo_url;
    if (logoUrl != null) initial.logo_url = String(logoUrl);
    const channelControls = dad.channel_controls;
    if (channelControls && typeof channelControls === "object") {
      const normalized = normalizeChannelControls(channelControls);
      if (normalized) {
        initial.channel_controls = { ...(initial.channel_controls || {}), ...normalized };
      }
    }
    if (!initial.headlines || !Array.isArray(initial.headlines)) initial.headlines = [""];
    if (!initial.descriptions || !Array.isArray(initial.descriptions)) initial.descriptions = [""];
  }

  if (draft_state && (Object.keys(draft_campaign).length > 0 || Object.keys(draft_ad_group).length > 0 || Object.keys(draft_ad).length > 0)) {
    const agName = draft_ad_group.adgroup_name ?? draft_ad_group.ad_group_name;
    if (agName != null) {
      initial.ad_group_name = String(agName);
      initial.adgroup_name = String(agName);
    }
    if (draft_ad_group.keyword_targets && Array.isArray(draft_ad_group.keyword_targets)) {
      const targets = draft_ad_group.keyword_targets;
      initial.keywords = targets
        .map((k: IKeywordTarget) => (k?.text != null ? String(k.text) : ""))
        .filter(Boolean);
      const firstWithMatchType = targets.find((k) => k?.match_type != null && String(k.match_type).trim() !== "");
      if (firstWithMatchType?.match_type != null) {
        const mt = String(firstWithMatchType.match_type).toUpperCase();
        if (mt === "BROAD" || mt === "PHRASE" || mt === "EXACT") initial.match_type = mt;
      }
    }
    if (draft_ad.ad_name != null) initial.ad_name = String(draft_ad.ad_name);
    if (draft_ad.video_id != null) initial.video_id = String(draft_ad.video_id);
    if (draft_ad.video_url != null) initial.video_url = String(draft_ad.video_url);
    if (draft_ad.final_url != null) initial.final_url = String(draft_ad.final_url);
    if (draft_ad.business_name != null) initial.business_name = String(draft_ad.business_name);
    if (draft_ad.logo_url != null) initial.logo_url = String(draft_ad.logo_url);
    if (draft_ad.headlines && Array.isArray(draft_ad.headlines)) initial.headlines = draft_ad.headlines;
    if (draft_ad.descriptions && Array.isArray(draft_ad.descriptions)) initial.descriptions = draft_ad.descriptions;
    if (draft_ad.long_headlines && Array.isArray(draft_ad.long_headlines)) initial.long_headlines = draft_ad.long_headlines;
    if (draft_ad.channel_controls && typeof draft_ad.channel_controls === "object") {
      const normalized = normalizeChannelControls(draft_ad.channel_controls);
      if (normalized) {
        initial.channel_controls = { ...(initial.channel_controls || {}), ...normalized };
      }
    }
    if (draft_ad.logo_asset_id != null) {
      const parsed = parseAssetValue(draft_ad.logo_asset_id);
      initial.logo_asset_id = parsed.id;
      initial.logo_asset_resource_name = parsed.resourceName;
    }
    if (draft_ad.business_name_asset_id != null) {
      const parsed = parseAssetValue(draft_ad.business_name_asset_id);
      initial.business_name_asset_id = parsed.id;
      initial.business_name_asset_resource_name = parsed.resourceName;
    }
    if (draft_campaign.budget_id != null && !initial.budget_resource_name) {
      const cid = String(
        row.customer_id ?? extra_data?.account_id ?? draft_state?.account_id ?? ""
      ).replace(/-/g, "");
      if (cid) {
        initial.budget_resource_name = `customers/${cid}/campaignBudgets/${draft_campaign.budget_id}`;
      }
    }
    if (draft_campaign.final_url_suffix != null) initial.final_url_suffix = String(draft_campaign.final_url_suffix);
    if (draft_campaign.tracking_url_template != null) initial.tracking_url_template = String(draft_campaign.tracking_url_template);
    const ucpRaw = draft_campaign.url_custom_parameters as unknown;
    if (ucpRaw != null && typeof ucpRaw === "object") {
      const ucp = ucpRaw as Record<string, unknown> | Array<{ key?: string; value?: string }>;
      initial.url_custom_parameters = Array.isArray(ucp)
        ? ucp.map((p) => ({ key: String(p?.key ?? ""), value: String(p?.value ?? "") }))
        : Object.entries(ucp).map(([key, value]) => ({ key, value: String(value ?? "") }));
    }
    if (draft_campaign.final_url != null) initial.final_url = String(draft_campaign.final_url);
    if (draft_campaign.location_ids != null && Array.isArray(draft_campaign.location_ids)) {
      initial.location_ids = draft_campaign.location_ids.map((id: number | string) => (typeof id === "string" ? parseInt(id, 10) : id)).filter((n: number) => !isNaN(n));
    }
    if (draft_campaign.excluded_location_ids != null && Array.isArray(draft_campaign.excluded_location_ids)) {
      initial.excluded_location_ids = draft_campaign.excluded_location_ids.map((id: number | string) => String(id));
    }
    if (draft_campaign.language_ids != null && Array.isArray(draft_campaign.language_ids)) {
      initial.language_ids = draft_campaign.language_ids.map((id: number | string) => String(id));
    }
    if (draft_campaign.device_ids != null && Array.isArray(draft_campaign.device_ids)) {
      initial.device_ids = draft_campaign.device_ids.map((id: number | string) => String(id));
    }
    if (draft_campaign.network_settings != null && typeof draft_campaign.network_settings === "object") {
      const normalized = normalizeNetworkSettings(draft_campaign.network_settings);
      if (normalized) {
        initial.network_settings = { ...(initial.network_settings || {}), ...normalized };
      }
    }
    if (campaignType === "SEARCH") {
      if (draft_campaign.headlines && Array.isArray(draft_campaign.headlines)) initial.headlines = draft_campaign.headlines;
      if (draft_campaign.descriptions && Array.isArray(draft_campaign.descriptions)) initial.descriptions = draft_campaign.descriptions;
    }
    if (campaignType === "DEMAND_GEN") {
      if (!initial.headlines || !Array.isArray(initial.headlines)) initial.headlines = [""];
      if (!initial.descriptions || !Array.isArray(initial.descriptions)) initial.descriptions = [""];
    }
  }

  return initial;
}
