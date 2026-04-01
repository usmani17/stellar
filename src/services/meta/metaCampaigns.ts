import api from "../api";
import type {
  CreateMetaCampaignPayload,
  UpdateMetaCampaignPayload,
  MetaCampaignCreateResponse,
} from "../../types/meta";

/**
 * Meta campaign create and update API.
 * List/bulk-update remain on accountsService; these are for create and single update.
 */
export const metaCampaignsService = {
  createMetaCampaign: async (
    channelId: number,
    payload: CreateMetaCampaignPayload
  ): Promise<MetaCampaignCreateResponse> => {
    const response = await api.post<MetaCampaignCreateResponse>(
      `/meta/channels/${channelId}/campaigns/create/`,
      payload
    );
    return response.data;
  },

  updateMetaCampaign: async (
    channelId: number,
    campaignId: string,
    payload: UpdateMetaCampaignPayload
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch<Record<string, unknown>>(
      `/meta/channels/${channelId}/campaigns/${encodeURIComponent(campaignId)}/update/`,
      payload
    );
    return response.data;
  },
};
