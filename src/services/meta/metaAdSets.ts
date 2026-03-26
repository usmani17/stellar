import api from "../api";
import type {
  CreateMetaAdSetPayload,
  UpdateMetaAdSetPayload,
  MetaAdSetCreateResponse,
} from "../../types/meta";

/**
 * Meta ad set create, update, and get-by-id API.
 */
export const metaAdSetsService = {
  getMetaAdSet: async (
    channelId: number,
    adsetId: string
  ): Promise<Record<string, unknown>> => {
    const response = await api.get<Record<string, unknown>>(
      `/meta/channels/${channelId}/adsets/${encodeURIComponent(adsetId)}/`
    );
    return response.data;
  },

  createMetaAdSet: async (
    channelId: number,
    payload: CreateMetaAdSetPayload
  ): Promise<MetaAdSetCreateResponse> => {
    const response = await api.post<MetaAdSetCreateResponse>(
      `/meta/channels/${channelId}/adsets/create/`,
      payload
    );
    return response.data;
  },

  updateMetaAdSet: async (
    channelId: number,
    adsetId: string,
    payload: UpdateMetaAdSetPayload
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch<Record<string, unknown>>(
      `/meta/channels/${channelId}/adsets/${encodeURIComponent(adsetId)}/update/`,
      payload
    );
    return response.data;
  },
};
