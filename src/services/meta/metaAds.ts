import api from "../api";
import type {
  CreateMetaAdPayload,
  MetaAdCreateResponse,
} from "../../types/meta";

/**
 * Meta ad create API.
 */
export const metaAdsService = {
  createMetaAd: async (
    channelId: number,
    payload: CreateMetaAdPayload
  ): Promise<MetaAdCreateResponse> => {
    const response = await api.post<MetaAdCreateResponse>(
      `/meta/channels/${channelId}/ads/create/`,
      payload
    );
    return response.data;
  },
};
