/**
 * Generic grouped payload builder for Amazon entity bulk/inline updates.
 * Structure: payload[profile_id][SP|SB|SD][entity_ids]
 * Reusable for Campaigns, Ad Groups, Keywords, Targets, etc.
 */

export type CampaignTypeKey = "SP" | "SB" | "SD";

export interface EntityForGroupedPayload {
  /** Entity ID (campaignId, adgroupId, keywordId, targetId, etc.) */
  entityId: string | number;
  /** Profile ID for grouping */
  profile_id?: string;
  /** Campaign type: SP, SB, SD */
  type?: string;
}

export type GroupedPayload = Record<
  string,
  Partial<Record<CampaignTypeKey, Array<string | number>>>
>;

/**
 * Group entities by profile_id and campaign type for bulk update payload.
 * Returns structure: { [profile_id]: { SP: [ids], SB: [ids], SD: [ids] } }
 *
 * Use for both inline (single entity) and bulk updates.
 *
 * @example Campaigns
 *   buildGroupedPayload(campaigns.map(c => ({
 *     entityId: c.campaignId,
 *     profile_id: c.profile_id,
 *     type: c.type,
 *   })))
 *
 * @example Ad Groups / Keywords / Targets (need profile_id and type from parent campaign)
 *   buildGroupedPayload(entities.map(e => ({
 *     entityId: e.adgroupId,
 *     profile_id: e.profile_id,
 *     type: e.campaign_type,
 *   })))
 */
export function buildGroupedPayload(
  entities: EntityForGroupedPayload[]
): GroupedPayload {
  const payload: GroupedPayload = {};

  for (const e of entities) {
    const profileId = e.profile_id ? String(e.profile_id) : null;
    const campaignType = (e.type?.toUpperCase() || "SP") as CampaignTypeKey;
    const entityId = e.entityId;

    if (!profileId || !entityId) continue;

    if (!payload[profileId]) {
      payload[profileId] = {};
    }
    const byType = payload[profileId][campaignType];
    if (!byType) {
      (payload[profileId] as Record<CampaignTypeKey, Array<string | number>>)[
        campaignType
      ] = [entityId];
    } else if (!byType.includes(entityId)) {
      byType.push(entityId);
    }
  }

  // Remove empty arrays and empty profile entries
  for (const profileId of Object.keys(payload)) {
    const byType = payload[profileId];
    for (const k of Object.keys(byType || {}) as CampaignTypeKey[]) {
      const arr = byType?.[k];
      if (arr && arr.length === 0) {
        delete byType![k];
      }
    }
    if (Object.keys(byType || {}).length === 0) {
      delete payload[profileId];
    }
  }

  return payload;
}
