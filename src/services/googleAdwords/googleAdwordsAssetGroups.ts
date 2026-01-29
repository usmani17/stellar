import api from "../api";

export const googleAdwordsAssetGroupsService = {
  getGoogleAssetGroups: async (
    accountId: number,
    channelId: number,
    profileId: number,
    campaignId?: string | number,
    params?: {
      filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
      page?: number;
      page_size?: number;
      sort_by?: string;
      order?: "asc" | "desc";
      start_date?: string;
      end_date?: string;
      campaign_id?: string | number;
    }
  ): Promise<{
    asset_groups: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    // Send filters array and params directly to backend - let backend handle conversion
    const payload: any = {
      filters: params?.filters || [],
      sort_by: params?.sort_by,
      order: params?.order,
      page: params?.page,
      page_size: params?.page_size,
      start_date: params?.start_date,
      end_date: params?.end_date,
      profile_id: profileId,
    };
    
    // Add campaign_id if provided
    if (campaignId) payload.campaign_id = campaignId;
    if (params?.campaign_id) payload.campaign_id = params.campaign_id;

    const response = await api.post(
      `/google-adwords/${accountId}/channels/${channelId}/asset-groups/`,
      payload
    );
    return response.data;
  },

  // Get asset group with assets (for Performance Max edit)
  getGoogleAssetGroupAssets: async (
    accountId: number,
    channelId: number,
    profileId: number,
    assetGroupId: string | number,
    campaignId?: string | number
  ): Promise<{
    asset_group_id: string | number;
    headlines: string[];
    descriptions: string[];
    business_name?: string;
    logo_url?: string;
    long_headline?: string;
    marketing_image_url?: string;
    square_marketing_image_url?: string;
    final_urls: string[];
    video_assets?: Array<{
      id: number;
      name?: string;
      youtube_video_id?: string;
    }>;
    asset_group_name?: string;
  }> => {
    const params = new URLSearchParams();
    if (campaignId) params.append("campaign_id", String(campaignId));
    params.append("profile_id", String(profileId));
    const queryString = params.toString();
    const url = `/google-adwords/${accountId}/channels/${channelId}/asset-groups/${assetGroupId}/assets/${
      queryString ? `?${queryString}` : ""
    }`;
    const response = await api.get(url);
    return response.data;
  },

  syncGoogleAssetGroups: async (
    accountId: number,
    channelId: number,
    profileId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/channels/${channelId}/asset-groups/sync/`,
      { profile_id: profileId }
    );
    return response.data;
  },

  // Update asset group status
  updateAssetGroupStatus: async (
    accountId: number,
    channelId: number,
    profileId: number,
    assetGroupId: string | number,
    campaignId: string | number,
    status: "ENABLED" | "PAUSED"
  ): Promise<any> => {
    const url = `/google-adwords/${accountId}/channels/${channelId}/campaigns/${campaignId}/update-asset-group/`;
    const response = await api.post(url, {
      status: status,
      profile_id: profileId,
    });
    return response.data;
  },
};
