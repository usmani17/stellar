import { parseDateToYYYYMMDD } from "../../../utils/dateHelpers";
import type { CreateGoogleCampaignData } from "../../../components/google/campaigns/types";

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
  const row = campaignData;
  let extra_data: Record<string, any> = campaignData.extra_data ?? {};
  if (typeof extra_data === "string") {
    try {
      extra_data = JSON.parse(extra_data);
    } catch {
      extra_data = {};
    }
  }
  const creation_payload = extra_data?.creation_payload || {};
  const draft_state = extra_data?.draft_state ?? null;
  const draft_campaign =
    draft_state?.campaign && typeof draft_state.campaign === "object"
      ? draft_state.campaign
      : {};
  const draft_ad_group =
    draft_state?.ad_group && typeof draft_state.ad_group === "object"
      ? draft_state.ad_group
      : {};
  const draft_ad =
    draft_state?.ad && typeof draft_state.ad === "object" ? draft_state.ad : {};
  const shopping_setting = extra_data.shopping_setting || {};
  const campaignType =
    ((campaignData.campaign_type ||
      campaignData.advertising_channel_type ||
      row.advertising_channel_type?.toUpperCase() ||
      extra_data.campaign_type ||
      creation_payload.campaign_type) as any) ||
    "PERFORMANCE_MAX";

  const budgetFromMicros =
    campaignData.campaign_budget_amount_micros != null
      ? Number(campaignData.campaign_budget_amount_micros) / 1_000_000
      : undefined;
  const budgetAmount =
    campaignData.budget_amount ??
    campaignData.daily_budget ??
    row.daily_budget ??
    budgetFromMicros ??
    (typeof creation_payload.budget_amount === "number"
      ? creation_payload.budget_amount
      : undefined) ??
    0;

  const draft_asset_group =
    draft_state?.asset_group && typeof draft_state.asset_group === "object"
      ? draft_state.asset_group
      : {};

  const initial: Partial<CreateGoogleCampaignData> = {
    name:
      (campaignData.campaignName ?? row.campaignName) ??
      draft_campaign.name ??
      (campaignData.name ||
        campaignData.campaign_name ||
        row.campaign_name ||
        creation_payload.name ||
        ""),
    campaign_type: (draft_state?.campaign_type as any) || campaignType,
    budget_amount:
      (typeof draft_campaign.budget_amount === "number"
        ? draft_campaign.budget_amount
        : undefined) ?? budgetAmount,
    budget_name:
      (draft_campaign.budget_name as string | undefined) ??
      campaignData.budget_name ??
      campaignData.campaign_budget_name ??
      campaignData.campaignBudgetName ??
      creation_payload.budget_name ??
      undefined,
    budget_resource_name:
      (draft_campaign.budget_resource_name as string | undefined) ??
      campaignData.campaign_budget ??
      campaignData.campaign_budget_resource_name ??
      creation_payload.budget_resource_name ??
      undefined,
    status:
      (draft_campaign.status && draft_campaign.status.toUpperCase() !== "SAVED_DRAFT" ? draft_campaign.status.toUpperCase() as any : undefined) ??
      ((campaignData.status && campaignData.status.toUpperCase() !== "SAVED_DRAFT" ? campaignData.status.toUpperCase() as any : undefined) ||
        (row.status && row.status.toUpperCase() !== "SAVED_DRAFT" ? row.status.toUpperCase() as any : undefined) ||
        (creation_payload.status?.toUpperCase() as any) ||
        "PAUSED"),
    start_date:
      (draft_campaign.start_date
        ? parseDateToYYYYMMDD(draft_campaign.start_date)
        : undefined) ??
      ((parseDateToYYYYMMDD(campaignData.start_date) ||
        parseDateToYYYYMMDD(row.start_date) ||
        (creation_payload.start_date
          ? parseDateToYYYYMMDD(creation_payload.start_date)
          : undefined)) ??
        undefined),
    end_date:
      (draft_campaign.end_date
        ? parseDateToYYYYMMDD(draft_campaign.end_date)
        : undefined) ??
      ((parseDateToYYYYMMDD(campaignData.end_date) ||
        parseDateToYYYYMMDD(row.end_date) ||
        (creation_payload.end_date
          ? parseDateToYYYYMMDD(creation_payload.end_date)
          : undefined)) ??
        undefined),
    bidding_strategy_type:
      (draft_campaign.bidding_strategy_type as string) ??
      (creation_payload.bidding_strategy_type ||
        campaignData.bidding_strategy_type ||
        undefined),
    target_cpa_micros: (() => {
      const raw =
        (draft_campaign.target_cpa_micros != null ? Number(draft_campaign.target_cpa_micros) : undefined) ??
        campaignData.target_cpa_micros;
      if (raw == null || raw <= 0) return undefined;
      // If value < 1e6, treat as dollars and convert to micros (form expects micros, displays dollars)
      if (raw < 1_000_000) return Math.round(raw * 1_000_000);
      return raw;
    })(),
    target_roas: creation_payload.target_roas ?? campaignData.target_roas,
    target_impression_share_location: (() => {
      const raw = 
        (draft_campaign.target_impression_share_location as string) ??
        campaignData.target_impression_share_location ??
        creation_payload.target_impression_share_location;
      return raw || undefined;
    })(),
    target_impression_share_location_fraction_micros: (() => {
      // creation_payload values are already in display units (what user originally entered)
      const raw = creation_payload.target_impression_share_location_fraction_micros != null 
        ? Number(creation_payload.target_impression_share_location_fraction_micros) 
        : campaignData.target_impression_share_location_fraction_micros;
      if (raw == null || raw <= 0) return undefined;
      // Only convert from campaignData (which might be in micros from database)
      // creation_payload values are already in display units
      return raw;
    })(),
    target_impression_share_cpc_bid_ceiling_micros: (() => {
      // creation_payload values are already in display units (what user originally entered)
      const raw = creation_payload.target_impression_share_cpc_bid_ceiling_micros != null 
        ? Number(creation_payload.target_impression_share_cpc_bid_ceiling_micros) 
        : campaignData.target_impression_share_cpc_bid_ceiling_micros;
      if (raw == null || raw <= 0) return undefined;
      // Only convert from campaignData (which might be in micros from database)
      // creation_payload values are already in display units
      return raw;
    })(),
    tracking_url_template:
      (draft_campaign.tracking_url_template as string) ??
      (creation_payload.tracking_url_template != null
        ? String(creation_payload.tracking_url_template)
        : undefined) ??
      campaignData.tracking_url_template ??
      undefined,
    final_url_suffix:
      (draft_campaign.final_url_suffix as string) ??
      (creation_payload.final_url_suffix != null
        ? String(creation_payload.final_url_suffix)
        : undefined) ??
      campaignData.final_url_suffix ??
      undefined,
    url_custom_parameters:
      (draft_campaign.url_custom_parameters as any) ??
      (creation_payload.url_custom_parameters != null &&
      typeof creation_payload.url_custom_parameters === "object"
        ? Array.isArray(creation_payload.url_custom_parameters)
          ? creation_payload.url_custom_parameters.map(
              (p: { key?: string; value?: string }) => ({
                key: String(p?.key ?? ""),
                value: String(p?.value ?? ""),
              })
            )
          : Object.entries(creation_payload.url_custom_parameters).map(
              ([k, v]) => ({ key: k, value: String(v ?? "") })
            )
        : undefined) ??
      campaignData.url_custom_parameters ??
      undefined,
    location_ids:
      (creation_payload.location_ids && Array.isArray(creation_payload.location_ids)
        ? creation_payload.location_ids
            .map((id: number | string) =>
              typeof id === "string" ? parseInt(id, 10) : id
            )
            .filter((n: number) => !isNaN(n))
        : undefined) ??
      campaignData.location_ids ??
      [],
    excluded_location_ids:
      (creation_payload.excluded_location_ids &&
      Array.isArray(creation_payload.excluded_location_ids)
        ? creation_payload.excluded_location_ids.map((id: number | string) =>
            String(id)
          )
        : undefined) ??
      campaignData.excluded_location_ids ??
      [],
    language_ids:
      (creation_payload.language_ids &&
      Array.isArray(creation_payload.language_ids)
        ? creation_payload.language_ids.map((id: number | string) =>
            String(id)
          )
        : undefined) ??
      campaignData.language_ids ??
      [],
    device_ids:
      (creation_payload.device_ids &&
      Array.isArray(creation_payload.device_ids)
        ? creation_payload.device_ids.map((id: number | string) => String(id))
        : undefined) ??
      campaignData.device_ids ??
      [],
    merchant_id: campaignData.merchant_id || shopping_setting.merchant_id,
    sales_country:
      (creation_payload.sales_country as string | undefined) ??
      campaignData.sales_country ??
      shopping_setting.sales_country ??
      "US",
    campaign_priority:
      (typeof creation_payload.campaign_priority === "number"
        ? creation_payload.campaign_priority
        : undefined) ??
      campaignData.campaign_priority ??
      shopping_setting.campaign_priority ??
      0,
    enable_local:
      (creation_payload.enable_local === true ||
      creation_payload.enable_local === false
        ? creation_payload.enable_local
        : undefined) ?? campaignData.enable_local ?? shopping_setting.enable_local ?? false,
    network_settings:
      campaignData.network_settings ??
      (creation_payload?.network_settings && typeof creation_payload.network_settings === "object"
        ? creation_payload.network_settings
        : undefined) ??
      (extra_data?.network_settings && typeof extra_data.network_settings === "object"
        ? extra_data.network_settings
        : undefined) ??
      undefined,
  };

  if (creation_payload && typeof creation_payload === "object") {
    if (creation_payload.profile_id != null) {
      initial.profile_id = String(creation_payload.profile_id);
    }
    if (creation_payload.customer_id != null) {
      initial.customer_id = String(creation_payload.customer_id);
    }
  }

  if (campaignType === "PERFORMANCE_MAX") {
    const cp = creation_payload;
    if (extra_data.business_name) {
      initial.business_name = extra_data.business_name;
    } else if (cp?.business_name != null) {
      initial.business_name = String(cp.business_name);
    } else if (draft_asset_group.business_name != null) {
      initial.business_name = String(draft_asset_group.business_name);
    }
    if (extra_data.logo_url) {
      initial.logo_url = extra_data.logo_url;
    } else if (cp?.logo_url != null) {
      initial.logo_url = String(cp.logo_url);
    } else if (draft_asset_group.logo_url != null) {
      initial.logo_url = String(draft_asset_group.logo_url);
    }
    if (extra_data.final_url) {
      initial.final_url = extra_data.final_url;
    } else if (cp?.final_url != null) {
      initial.final_url = String(cp.final_url);
    }
    if (extra_data.headlines && Array.isArray(extra_data.headlines)) {
      initial.headlines = extra_data.headlines;
    } else if (cp?.headlines && Array.isArray(cp.headlines)) {
      initial.headlines = cp.headlines;
    }
    if (extra_data.descriptions && Array.isArray(extra_data.descriptions)) {
      initial.descriptions = extra_data.descriptions;
    } else if (cp?.descriptions && Array.isArray(cp.descriptions)) {
      initial.descriptions = cp.descriptions;
    }
    if (extra_data.long_headlines && Array.isArray(extra_data.long_headlines)) {
      initial.long_headlines = extra_data.long_headlines;
    } else if (extra_data.long_headline) {
      initial.long_headlines = [extra_data.long_headline];
    } else if (cp?.long_headlines && Array.isArray(cp.long_headlines)) {
      initial.long_headlines = cp.long_headlines;
    } else if (cp?.long_headline) {
      initial.long_headlines = [cp.long_headline];
    }
    if (extra_data.asset_group_name) {
      initial.asset_group_name = extra_data.asset_group_name;
    } else if (cp?.asset_group_name != null) {
      initial.asset_group_name = String(cp.asset_group_name);
    } else if (draft_asset_group.asset_group_name != null) {
      initial.asset_group_name = String(draft_asset_group.asset_group_name);
    }
    if (cp?.logo_asset_id != null) initial.logo_asset_id = String(cp.logo_asset_id);
    else if (draft_asset_group.logo_asset_id != null) initial.logo_asset_id = String(draft_asset_group.logo_asset_id);
    if (cp?.logo_asset_resource_name != null) initial.logo_asset_resource_name = String(cp.logo_asset_resource_name);
    if (cp?.business_name_asset_id != null) initial.business_name_asset_id = String(cp.business_name_asset_id);
    else if (draft_asset_group.business_name_asset_id != null) initial.business_name_asset_id = String(draft_asset_group.business_name_asset_id);
    if (cp?.business_name_asset_resource_name != null) initial.business_name_asset_resource_name = String(cp.business_name_asset_resource_name);
    else if (draft_asset_group.business_name_asset_resource_name != null) initial.business_name_asset_resource_name = String(draft_asset_group.business_name_asset_resource_name);
    if (extra_data.marketing_image_url) initial.marketing_image_url = extra_data.marketing_image_url;
    else if (cp?.marketing_image_url != null) initial.marketing_image_url = String(cp.marketing_image_url);
    if (extra_data.square_marketing_image_url) initial.square_marketing_image_url = extra_data.square_marketing_image_url;
    else if (cp?.square_marketing_image_url != null) initial.square_marketing_image_url = String(cp.square_marketing_image_url);
    if (extra_data.video_asset_resource_names && Array.isArray(extra_data.video_asset_resource_names)) initial.video_asset_resource_names = extra_data.video_asset_resource_names;
    else if (cp?.video_asset_resource_names && Array.isArray(cp.video_asset_resource_names)) initial.video_asset_resource_names = cp.video_asset_resource_names;
    if (extra_data.sitelink_asset_resource_names && Array.isArray(extra_data.sitelink_asset_resource_names)) initial.sitelink_asset_resource_names = extra_data.sitelink_asset_resource_names;
    else if (cp?.sitelink_asset_resource_names && Array.isArray(cp.sitelink_asset_resource_names)) initial.sitelink_asset_resource_names = cp.sitelink_asset_resource_names;
    if (extra_data.callout_asset_resource_names && Array.isArray(extra_data.callout_asset_resource_names)) initial.callout_asset_resource_names = extra_data.callout_asset_resource_names;
    else if (cp?.callout_asset_resource_names && Array.isArray(cp.callout_asset_resource_names)) initial.callout_asset_resource_names = cp.callout_asset_resource_names;
    if (!initial.headlines || !Array.isArray(initial.headlines)) initial.headlines = [""];
    if (!initial.descriptions || !Array.isArray(initial.descriptions)) initial.descriptions = [""];
  }

  if (campaignType === "DEMAND_GEN") {
    const cp = creation_payload;
    const cpCampaign = cp?.campaign && typeof cp.campaign === "object" ? cp.campaign : {};
    const cpAdGroup = cp?.ad_group && typeof cp.ad_group === "object" ? cp.ad_group : {};
    const cpAd = cp?.ad && typeof cp.ad === "object" ? cp.ad : {};
    const startDate = cpCampaign.start_date ?? cp.start_date;
    if (startDate) initial.start_date = parseDateToYYYYMMDD(startDate) || initial.start_date;
    const endDate = cpCampaign.end_date ?? cp.end_date;
    if (endDate) initial.end_date = parseDateToYYYYMMDD(endDate) || initial.end_date;
    if (typeof (cpCampaign.budget_amount ?? cp.budget_amount) === "number") initial.budget_amount = cpCampaign.budget_amount ?? cp.budget_amount;
    const budgetName = cpCampaign.budget_name ?? cp.budget_name;
    if (budgetName) initial.budget_name = budgetName;
    const biddingType = cpCampaign.bidding_strategy_type ?? cp.bidding_strategy_type;
    if (biddingType) initial.bidding_strategy_type = biddingType;
    if (cpCampaign.status != null) initial.status = String(cpCampaign.status).toUpperCase() as "ENABLED" | "PAUSED";
    if (cpCampaign.final_url_suffix != null) initial.final_url_suffix = String(cpCampaign.final_url_suffix);
    if (cpCampaign.tracking_url_template != null) initial.tracking_url_template = String(cpCampaign.tracking_url_template);
    if (cpCampaign.url_custom_parameters != null && typeof cpCampaign.url_custom_parameters === "object") initial.url_custom_parameters = cpCampaign.url_custom_parameters;
    const adGroupName = cpAdGroup.ad_group_name ?? cp.ad_group_name;
    if (adGroupName) initial.ad_group_name = adGroupName;
    const adName = cpAd.ad_name ?? cp.ad_name;
    if (adName) initial.ad_name = adName;
    const headlines = cpAd.headlines ?? cp.headlines;
    if (headlines && Array.isArray(headlines)) initial.headlines = headlines;
    const descriptions = cpAd.descriptions ?? cp.descriptions;
    if (descriptions && Array.isArray(descriptions)) initial.descriptions = descriptions;
    const longHeadlines = cpAd.long_headlines ?? cp.long_headlines;
    if (longHeadlines && Array.isArray(longHeadlines)) initial.long_headlines = longHeadlines;
    const videoId = cpAd.video_id ?? cp.video_id;
    if (videoId != null) initial.video_id = String(videoId);
    const videoUrl = cpAd.video_url ?? cp.video_url;
    if (videoUrl != null) initial.video_url = String(videoUrl);
    const finalUrl = cpAd.final_url ?? cp.final_url;
    if (finalUrl != null) initial.final_url = String(finalUrl);
    const businessName = cpAd.business_name ?? cp.business_name;
    if (businessName != null) initial.business_name = String(businessName);
    const logoUrl = cpAd.logo_url ?? cp.logo_url;
    if (logoUrl != null) initial.logo_url = String(logoUrl);
    const channelControls = cpAd.channel_controls ?? cp.channel_controls;
    if (channelControls && typeof channelControls === "object") {
      initial.channel_controls = { ...(initial.channel_controls || {}), ...channelControls };
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
      initial.keywords = draft_ad_group.keyword_targets.map((k: { text?: string }) => (k?.text != null ? String(k.text) : "")).filter(Boolean);
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
      initial.channel_controls = { ...initial.channel_controls, ...draft_ad.channel_controls };
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
        campaignData.customer_id ?? row.customer_id ?? extra_data?.account_id ?? draft_state?.account_id ?? ""
      ).replace(/-/g, "");
      if (cid) {
        initial.budget_resource_name = `customers/${cid}/campaignBudgets/${draft_campaign.budget_id}`;
      }
    }
    if (draft_campaign.final_url_suffix != null) initial.final_url_suffix = String(draft_campaign.final_url_suffix);
    if (draft_campaign.tracking_url_template != null) initial.tracking_url_template = String(draft_campaign.tracking_url_template);
    if (draft_campaign.url_custom_parameters != null && typeof draft_campaign.url_custom_parameters === "object") {
      const ucp = draft_campaign.url_custom_parameters;
      initial.url_custom_parameters = Array.isArray(ucp)
        ? ucp.map((p: { key?: string; value?: string }) => ({ key: String(p?.key ?? ""), value: String(p?.value ?? "") }))
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
      initial.network_settings = { ...(initial.network_settings || {}), ...draft_campaign.network_settings };
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
