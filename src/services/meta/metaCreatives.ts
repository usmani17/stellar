import api from "../api";
import type {
  CreateMetaCreativePayload,
  MetaCreativeCreateResponse,
} from "../../types/meta";

/**
 * Meta ad creative create API.
 */
export const metaCreativesService = {
  createMetaCreative: async (
    channelId: number,
    payload: CreateMetaCreativePayload
  ): Promise<MetaCreativeCreateResponse> => {
    const response = await api.post<MetaCreativeCreateResponse>(
      `/meta/channels/${channelId}/creatives/create/`,
      payload
    );
    return response.data;
  },
};
