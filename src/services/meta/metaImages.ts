import api from "../api";

export interface MetaImageAsset {
  image_id: string | number;
  hash?: string;
  url?: string;
  name?: string;
  permalink_url?: string;
}

export const metaImagesService = {
  listMetaImages: async (
    channelId: number,
    payload?: { page?: number; page_size?: number },
  ): Promise<{ images: MetaImageAsset[] }> => {
    const response = await api.post<{ images: MetaImageAsset[] }>(
      `/meta/channels/${channelId}/images/`,
      payload || { page: 1, page_size: 100 },
    );
    return response.data;
  },
};
