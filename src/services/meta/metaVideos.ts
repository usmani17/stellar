import api from "../api";

export interface MetaVideoAsset {
  video_id: string | number;
  title?: string;
  permalink_url?: string;
  source?: string;
}

export const metaVideosService = {
  listMetaVideos: async (
    channelId: number,
    payload?: { page?: number; page_size?: number },
  ): Promise<{ videos: MetaVideoAsset[] }> => {
    const response = await api.post<{ videos: MetaVideoAsset[] }>(
      `/meta/channels/${channelId}/videos/`,
      payload || { page: 1, page_size: 100 },
    );
    return response.data;
  },
};
