/**
 * Campaign-specific wrapper for grouped payload.
 * Uses the generic buildGroupedPayload from groupedPayload.ts.
 * Structure: payload[profile_id][SP|SB|SD][campaign_ids]
 */

import {
  buildGroupedPayload,
  type GroupedPayload,
  type CampaignTypeKey,
} from "./groupedPayload";

export type { CampaignTypeKey, GroupedPayload };

export interface CampaignForPayload {
  campaignId: string | number;
  profile_id?: string;
  type?: string;
}

/** @deprecated Use buildGroupedPayload from utils/groupedPayload.ts with campaign mapping */
export type GroupedCampaignPayload = GroupedPayload;

/**
 * Group campaigns by profile_id and campaign type for bulk update payload.
 * Returns structure: { [profile_id]: { SP: [ids], SB: [ids], SD: [ids] } }
 *
 * Prefer using buildGroupedPayload from groupedPayload.ts for new code.
 */
export function buildGroupedCampaignPayload(
  campaigns: CampaignForPayload[]
): GroupedPayload {
  return buildGroupedPayload(
    campaigns.map((c) => ({
      entityId: c.campaignId,
      profile_id: c.profile_id,
      type: c.type,
    }))
  );
}
