/**
 * Network settings for a campaign (target channels and networks)
 */
export interface INetworkSettings {
  target_youtube: boolean | null;
  target_google_search: boolean | null;
  target_search_network: boolean | null;
  target_content_network: boolean | null;
  target_google_tv_network: boolean | null;
  target_partner_search_network: boolean | null;
}

/**
 * Campaign-level draft data structure
 */
export interface ICampaign {
  name: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  final_url: string | null;
  final_url_suffix: string | null;
  tracking_url_template: string | null;
  url_custom_parameters: string | null;
  budget_name: string | null;
  budget_amount: number | null;
  budget_id?: string;
  bidding_strategy_type: string | null;
  target_roas: number | null;
  target_cpa_micros: number | null;
  target_spend_micros: number | null;
  target_impression_share_location: string | null;
  target_impression_share_cpc_bid_ceiling_micros: number | null;
  target_impression_share_location_fraction_micros: number | null;
  device_ids: string[] | null;
  language_ids: string[] | null;
  location_ids: string[] | null;
  excluded_location_ids: string[] | null;
  network_settings: INetworkSettings;
  headlines: string[] | null;
  descriptions: string[] | null;
  merchant_id: string | null;
  enable_local: boolean | null;
  sales_country: string | null;
  campaign_priority: number | null;
}

/**
 * Channel controls for ad targeting (platform-specific channel restrictions)
 */
export interface IChannelControls {
  maps: boolean | null;
  gmail: boolean | null;
  display: boolean | null;
  discover: boolean | null;
  youtube_shorts: boolean | null;
  youtube_in_feed: boolean | null;
  youtube_in_stream: boolean | null;
}

/**
 * Ad-level draft data structure
 */
export interface IAd {
  ad_name: string | null;
  logo_url: string | null;
  logo_asset_id: string | null;
  video_id: string | null;
  video_url: string | null;
  final_url: string | null;
  headlines: string[] | null;
  descriptions: string[] | null;
  business_name: string | null;
  business_name_asset_id: string | null;
  long_headlines: string[] | null;
  channel_controls: IChannelControls;
}

/**
 * Keyword target for an ad group
 */
export interface IKeywordTarget {
  bid: number | null;
  text: string | null;
  match_type: string | null;
}

/**
 * Ad group-level draft data structure
 */
export interface IAdGroup {
  status: string | null;
  default_bid: number | null;
  adgroup_name: string | null;
  ad_group_name: string | null;
  keyword_targets: IKeywordTarget[];
}

/**
 * Asset group-level draft data structure (for Performance Max campaigns)
 */
export interface IAssetGroup {
  logo_url: string | null;
  logo_asset_id: string | null;
  headlines: string[] | null;
  descriptions: string[] | null;
  business_name: string | null;
  long_headlines: string[] | null;
  video_asset_ids: string[] | null;
  asset_group_name: string | null;
  callout_asset_ids: string[] | null;
  headline_asset_ids: string[] | null;
  sitelink_asset_ids: string[] | null;
  marketing_image_url: string | null;
  description_asset_ids: string[] | null;
  business_name_asset_id: string | null;
  long_headline_asset_ids: string[] | null;
  marketing_image_asset_id: string | null;
  square_marketing_image_url: string | null;
  square_marketing_image_asset_id: string | null;
}

/**
 * Product group-level draft data structure (for Shopping campaigns)
 */
export interface IProductGroup {
  cpc_bid_micros: number | null;
  product_group_type: string | null;
  product_group_value: string | null;
}

/**
 * Complete campaign draft state
 * Represents all possible fields that can be in a draft campaign created by the agent or user
 */
export interface ICampaignDraft {
  status: string | null;
  platform: string | null;
  account_id: string | number | null;
  profile_id: string | number | null;
  channel_id: string | number | null;
  entity_ids: string[] | null;
  campaign_type: string | null;
  campaign: ICampaign;
  ad: IAd;
  ad_group: IAdGroup;
  asset_group: IAssetGroup;
  product_group: IProductGroup;
}
