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
  /** When not using campaign budget, Meta requires this flag to be explicitly true or false. */
  is_adset_budget_sharing_enabled?: boolean;
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
  /** In account's smallest currency unit (e.g. cents for USD; 1000 = $10.00). */
  daily_budget?: number;
  /** In account's smallest currency unit. Required end_time when used. */
  lifetime_budget?: number;
  billing_event?: string;
  optimization_goal?: string;
  targeting?: MetaTargetingSpec;
  start_time?: string;
  end_time?: string;
  bid_amount?: number;
  /** LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS. Required bid_amount when LOWEST_COST_WITH_BID_CAP or COST_CAP. */
  bid_strategy?: string;
  destination_type?: string;
  promoted_object?: MetaPromotedObject;
  pacing_type?: string[];
  /** e.g. ["validate_only"] to validate without creating. */
  execution_options?: string[];
}

export interface UpdateMetaAdSetPayload {
  name?: string;
  status?: MetaAdSetStatus | "DELETED";
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  optimization_goal?: string;
  billing_event?: string;
  targeting?: MetaTargetingSpec;
  bid_amount?: number;
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

/** Custom Audience subtype for create. We support only these five; Lookalike uses a dedicated panel. */
export type MetaCustomAudienceSubtype =
  | "CUSTOM"
  | "WEBSITE"
  | "APP"
  | "ENGAGEMENT"
  | "OFFLINE_CONVERSION";

/** Customer file source (for CUSTOM subtype when creating customer-file/CRM audiences). Required by Meta in that case. */
export type MetaCustomerFileSource =
  | "USER_PROVIDED_ONLY"
  | "PARTNER_PROVIDED_ONLY"
  | "BOTH_USER_AND_PARTNER_PROVIDED";

/** Lookalike spec shape (serialized as JSON string for API). */
export interface LookalikeSpecForCreate {
  type?: string;
  country: string;
  ratio: number;
  origin_audience_id: string;
}

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
  pixel_id?: string;
  lookalike_spec?: string;
  /** Required for LOOKALIKE subtype: seed Custom Audience ID (top-level per Meta API). */
  origin_audience_id?: string;
  claim_objective?: string;
  content_type?: string;
  opt_out_link?: string;
  allowed_domains?: string[];
  rule_aggregation?: string;
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

/**
 * Event source types for Meta Custom Audience rules.
 * Mapped to audience subtypes: WEBSITE=pixel; APP=app; ENGAGEMENT=page,video,lead,...; OFFLINE_CONVERSION=offline_events,store_visits.
 */
export type AudienceRuleEventSourceType =
  | "pixel"
  | "app"
  | "page"
  | "video"
  | "lead"
  | "ig_lead_generation"
  | "canvas"
  | "shopping_page"
  | "shopping_ig"
  | "offline_events"
  | "store_visits";

export interface AudienceRuleEventSource {
  id: string;
  type: AudienceRuleEventSourceType;
}

export interface AudienceRuleFilter {
  field: string;
  operator: string;
  /** String (event name, etc.), number (e.g. _value, price), or array for is_any/is_not_any. */
  value: string | number | string[];
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

export type AudienceRuleAggregationMethod = "absolute" | "percentile";

export interface AudienceRuleAggregation {
  type: AudienceRuleAggregationType;
  field?: string;
  operator: string;
  value: string | number;
  /** Optional: absolute vs percentile (Meta API). */
  method?: AudienceRuleAggregationMethod;
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

/** Example rule templates for Meta audience rules (lowercase operators, Meta-valid structure). */
export type ExampleAudienceRuleTemplate =
  | "website_pageview_30d"
  | "website_purchase_60d"
  | "app_achieve_level"
  | "app_purchase_30d"
  | "video_50pct";

const SECONDS_PER_DAY = 86400;

function makeInclusionsRule(rule: AudienceRuleRule): AudienceRuleSet {
  return { operator: "or", rules: [rule] };
}

export function getExampleAudienceRule(
  template: ExampleAudienceRuleTemplate,
  options?: { pixelId?: string; videoId?: string; appId?: string }
): AudienceRule {
  const pixelId = options?.pixelId ?? "<PIXEL_ID>";
  const videoId = options?.videoId ?? "<VIDEO_ID>";
  const appId = options?.appId ?? "<APP_ID>";
  const emptyExclusions: AudienceRuleSet = { operator: "and", rules: [] };

  switch (template) {
    case "website_pageview_30d": {
      const rule: AudienceRuleRule = {
        event_sources: [{ id: pixelId, type: "pixel" }],
        retention_seconds: 30 * SECONDS_PER_DAY,
        filter: {
          operator: "or",
          filters: [{ field: "event", operator: "=", value: "PageView" }],
        },
      };
      return {
        inclusions: makeInclusionsRule(rule),
        exclusions: emptyExclusions,
      };
    }
    case "website_purchase_60d": {
      const rule: AudienceRuleRule = {
        event_sources: [{ id: pixelId, type: "pixel" }],
        retention_seconds: 60 * SECONDS_PER_DAY,
        filter: {
          operator: "and",
          filters: [
            { field: "event", operator: "=", value: "Purchase" },
            { field: "price", operator: ">", value: "50" },
          ],
        },
      };
      return {
        inclusions: makeInclusionsRule(rule),
        exclusions: emptyExclusions,
      };
    }
    case "app_achieve_level": {
      const rule: AudienceRuleRule = {
        event_sources: [{ id: appId, type: "app" }],
        retention_seconds: 30 * SECONDS_PER_DAY,
        filter: {
          operator: "or",
          filters: [{ field: "event", operator: "eq", value: "AchieveLevel" }],
        },
      };
      return {
        inclusions: makeInclusionsRule(rule),
        exclusions: emptyExclusions,
      };
    }
    case "app_purchase_30d": {
      const rule: AudienceRuleRule = {
        event_sources: [{ id: appId, type: "app" }],
        retention_seconds: 30 * SECONDS_PER_DAY,
        filter: {
          operator: "and",
          filters: [{ field: "event", operator: "eq", value: "fb_mobile_purchase" }],
        },
      };
      return {
        inclusions: makeInclusionsRule(rule),
        exclusions: emptyExclusions,
      };
    }
    case "video_50pct": {
      const rule: AudienceRuleRule = {
        event_sources: [{ id: videoId, type: "video" }],
        retention_seconds: 30 * SECONDS_PER_DAY,
        filter: {
          operator: "or",
          filters: [{ field: "view_time", operator: ">", value: "50" }],
        },
        aggregation: {
          type: "count",
          operator: ">",
          value: "1",
        },
      };
      return {
        inclusions: makeInclusionsRule(rule),
        exclusions: emptyExclusions,
      };
    }
    default:
      return getDefaultAudienceRule();
  }
}
