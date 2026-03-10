/**
 * Meta Marketing API – create/update payload and response types.
 * Maps to backend POST/PATCH endpoints and Meta Graph API fields.
 */

/** Campaign objective (Meta API). */
export type MetaCampaignObjective =
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_LEADS"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_SALES"
  | "OUTCOME_APP_PROMOTION"
  | "LINK_CLICKS"
  | "BRAND_AWARENESS"
  | "REACH"
  | "VIDEO_VIEWS"
  | "CONVERSIONS"
  | "MESSAGES";

/** Campaign status. */
export type MetaCampaignStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface CreateMetaCampaignPayload {
  profile_id: number;
  name: string;
  objective: string;
  status?: MetaCampaignStatus;
  daily_budget?: number;
  lifetime_budget?: number;
  special_ad_categories?: string[];
  special_ad_category_country?: string[];
  buying_type?: string;
  bid_strategy?: string;
}

export interface UpdateMetaCampaignPayload {
  name?: string;
  status?: MetaCampaignStatus;
  daily_budget?: number;
}

export interface MetaCampaignCreateResponse {
  id: string;
  [key: string]: unknown;
}

/** Ad set create – targeting matches Meta Targeting spec. */
export interface MetaGeoLocations {
  countries?: string[];
  regions?: Array<{ key: string }>;
  cities?: Array<{ key: string; radius?: number; distance_unit?: string }>;
  location_types?: string[];
  [key: string]: unknown;
}

export interface MetaTargetingSpec {
  geo_locations?: MetaGeoLocations;
  age_min?: number;
  age_max?: number;
  genders?: number[]; // 1 male, 2 female
  interests?: Array<{ id: string; name?: string }>;
  behaviors?: Array<{ id: string; name?: string }>;
  custom_audiences?: Array<{ id: string }>;
  excluded_custom_audiences?: Array<{ id: string }>;
  publisher_platforms?: string[];
  device_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  audience_network_positions?: string[];
  flexible_spec?: unknown[];
  exclusions?: unknown;
  [key: string]: unknown;
}

/** Promoted object for ad set (varies by campaign objective). */
export interface MetaPromotedObject {
  page_id?: string;
  pixel_id?: string;
  custom_event_type?: string;
  custom_event_str?: string;
  application_id?: string;
  object_store_url?: string;
  event_id?: string;
  product_set_id?: string;
  offline_conversion_data_set_id?: string;
  [key: string]: unknown;
}

export type MetaAdSetStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface CreateMetaAdSetPayload {
  profile_id: number;
  campaign_id: string;
  name: string;
  status?: MetaAdSetStatus;
  daily_budget?: number;
  lifetime_budget?: number;
  billing_event?: string;
  optimization_goal?: string;
  targeting?: MetaTargetingSpec;
  start_time?: string;
  end_time?: string;
  bid_amount?: number;
  destination_type?: string;
  promoted_object?: MetaPromotedObject;
  pacing_type?: string[];
}

export interface UpdateMetaAdSetPayload {
  name?: string;
  status?: MetaAdSetStatus;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
}

export interface MetaAdSetCreateResponse {
  id: string;
  [key: string]: unknown;
}

/** Ad creative – object_story_spec matches Meta Ad Creative Object Story Spec. */
export interface MetaLinkData {
  message?: string;
  link?: string;
  picture?: string;
  caption?: string;
  call_to_action?: { type: string; value?: unknown };
  [key: string]: unknown;
}

export interface MetaObjectStorySpec {
  page_id: string;
  link_data?: MetaLinkData;
  photo_data?: Record<string, unknown>;
  video_data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreateMetaCreativePayload {
  profile_id: number;
  name: string;
  object_story_spec: MetaObjectStorySpec;
}

export interface MetaCreativeCreateResponse {
  id: string;
  [key: string]: unknown;
}

/** Ad create. */
export type MetaAdStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface CreateMetaAdPayload {
  profile_id: number;
  adset_id: string;
  name: string;
  creative_id?: string;
  creative?: { creative_id: string };
  status?: MetaAdStatus;
}

export interface MetaAdCreateResponse {
  id: string;
  [key: string]: unknown;
}

/** Custom Audience subtype (Meta API). */
export type MetaCustomAudienceSubtype =
  | "CUSTOM"
  | "WEBSITE"
  | "APP"
  | "OFFLINE_EVENT"
  | "LOOKALIKE"
  | "ENGAGEMENT";

/** Customer file source (for customer list uploads). */
export type MetaCustomerFileSource =
  | "USER_PROVIDED_ONLY"
  | "PARTNER_PROVIDED_ONLY"
  | "BOTH_USER_AND_PARTNER_PROVIDED";

export interface CustomAudienceCreatePayload {
  name: string;
  subtype: MetaCustomAudienceSubtype;
  description?: string;
  customer_file_source?: MetaCustomerFileSource;
  retention_days?: number;
  rule?: string;
  prefill?: boolean;
  /** Required when subtype is WEBSITE or APP to resolve ad account. */
  profile_id?: number;
}

export interface LookalikeSpec {
  country: string;
  ratio: number;
}

export interface LookalikeAudienceCreatePayload {
  name?: string;
  origin_audience_id: string;
  lookalike_spec: LookalikeSpec;
}

export interface MetaAudienceRow {
  id?: number;
  audience_id: string;
  name: string;
  subtype?: string;
  type?: "custom" | "lookalike";
  description?: string;
  status?: string;
  created_time?: string;
  approximate_count_lower_bound?: number;
  [key: string]: unknown;
}

export interface MetaAudiencesListResponse {
  audiences: MetaAudienceRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  next_cursor?: string | null;
}

export interface MetaAudienceCreateResponse {
  id: string;
  [key: string]: unknown;
}

/** Audience rule structure for Meta Custom Audiences (WEBSITE/APP). */
export interface AudienceRuleEventSource {
  id: string;
  type: "pixel" | "app";
}

export interface AudienceRuleFilter {
  field: string;
  operator: string;
  value: string;
}

export interface AudienceRuleFilterSet {
  operator: "and" | "or";
  filters: AudienceRuleFilter[];
}

export type AudienceRuleAggregationType =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "time_spent"
  | "last_event_time_field";

export interface AudienceRuleAggregation {
  type: AudienceRuleAggregationType;
  field?: string;
  operator: string;
  value: string | number;
}

export interface AudienceRuleRule {
  event_sources: AudienceRuleEventSource[];
  retention_seconds: number;
  filter: AudienceRuleFilterSet;
  aggregation?: AudienceRuleAggregation;
}

export interface AudienceRuleSet {
  operator: "and" | "or";
  rules: AudienceRuleRule[];
}

export interface AudienceRule {
  inclusions: AudienceRuleSet;
  exclusions: AudienceRuleSet;
}

const DEFAULT_RULE_SET: AudienceRuleSet = {
  operator: "and",
  rules: [],
};

export function getDefaultAudienceRule(): AudienceRule {
  return {
    inclusions: { ...DEFAULT_RULE_SET },
    exclusions: { ...DEFAULT_RULE_SET },
  };
}

export function audienceRuleToJsonString(rule: AudienceRule): string {
  return JSON.stringify(rule);
}
