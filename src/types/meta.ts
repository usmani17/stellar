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
  buying_type?: string;
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
export interface MetaTargetingSpec {
  geo_locations?: { countries?: string[]; cities?: unknown; regions?: unknown };
  age_min?: number;
  age_max?: number;
  facebook_positions?: string[];
  publisher_platforms?: string[];
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
  promoted_object?: { page_id?: string; [key: string]: unknown };
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
