import api from "../api";

export interface MetaPageOption {
  id: string;
  name: string;
  category?: string;
}

export const metaPagesService = {
  getMetaPages: async (
    channelId: number,
    profileId: number,
  ): Promise<{ pages: MetaPageOption[] }> => {
    const response = await api.get<{ pages: MetaPageOption[] }>(
      `/meta/channels/${channelId}/profiles/${profileId}/pages/`,
    );
    return response.data;
  },
};
