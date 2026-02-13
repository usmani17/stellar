/**
 * Google Ads constants.
 * Use SAVED_DRAFT for draft campaigns in our DB so the value does not collide with
 * Google Ads API CampaignStatus enum (DRAFT, ENABLED, PAUSED, REMOVED).
 */
export const CAMPAIGN_STATUS_SAVED_DRAFT = "SAVED_DRAFT" as const;
