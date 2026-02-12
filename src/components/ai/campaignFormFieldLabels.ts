/**
 * Human-readable labels for campaign form fields.
 * Used by CampaignFormForChat when building submit messages.
 */
export const CAMPAIGN_FIELD_LABELS: Record<string, string> = {
  // Base
  name: "Campaign name",
  campaign_type: "Campaign type",
  budget_amount: "Daily budget",
  budget_name: "Budget name",
  start_date: "Start date",
  end_date: "End date",
  status: "Status",
  // Bidding
  bidding_strategy_type: "Strategy Type",
  target_cpa_micros: "Target CPA ($)",
  target_roas: "Target ROAS",
  target_spend_micros: "Target Spend ($)",
  target_impression_share_location: "Where ads appear",
  target_impression_share_location_fraction_micros: "Percent (%) impression share",
  target_impression_share_cpc_bid_ceiling_micros: "Maximum CPC bid limit ($)",
  // Demand Gen
  final_url: "Landing page URL",
  video_id: "YouTube video ID",
  video_url: "Video URL",
  logo_url: "Logo URL",
  business_name: "Business name",
  headlines: "Headlines",
  descriptions: "Descriptions",
  long_headlines: "Long headlines",
  ad_group_name: "Ad group name",
  ad_name: "Ad name",
  channel_controls: "Channel controls",
  // Search
  adgroup_name: "Ad group name",
  keywords: "Keywords",
  match_type: "Match type",
  // Shopping
  merchant_id: "Merchant ID",
  sales_country: "Sales country",
  campaign_priority: "Campaign priority",
  enable_local: "Enable local",
  // PMax
  asset_group_name: "Asset group name",
  marketing_image_url: "Marketing image URL",
  square_marketing_image_url: "Square marketing image URL",
  // Targeting (Network, Device, Language, Location, URL)
  network_settings: "Network Settings",
  device_ids: "Device Targeting",
  language_ids: "Language Targeting",
  location_ids: "Location Targeting",
  excluded_location_ids: "Excluded Locations",
  tracking_url_template: "Tracking URL Template",
  final_url_suffix: "Final URL Suffix",
  url_custom_parameters: "Custom URL Parameters",
};

export function getFieldLabel(key: string): string {
  return CAMPAIGN_FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}
