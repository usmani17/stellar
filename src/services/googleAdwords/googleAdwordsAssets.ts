import api from "../api";

// Asset Types
export type AssetType = "TEXT" | "IMAGE" | "YOUTUBE_VIDEO" | "SITELINK";

// Asset Interfaces
export interface TextAsset {
  id: string;
  name: string;
  type: "TEXT";
  resource_name: string;
  text: string;
}

export interface ImageAsset {
  id: string;
  name: string;
  type: "IMAGE";
  resource_name: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  image_url?: string; // URL to display the image
}

export interface YoutubeVideoAsset {
  id: string;
  name: string;
  type: "YOUTUBE_VIDEO";
  resource_name: string;
  youtube_video_id: string;
}

export interface SitelinkAsset {
  id: string;
  name: string;
  type: "SITELINK";
  resource_name: string;
  link_text: string;
  link_url?: string;
  description1?: string;
  description2?: string;
  final_urls?: string[];
}

export interface CalloutAsset {
  id: string;
  name: string;
  type: "TEXT";
  resource_name: string;
  text: string;
}

export type Asset = (TextAsset | ImageAsset | YoutubeVideoAsset | SitelinkAsset | CalloutAsset) & {
  usage?: string[]; // Array of field types where this asset is used (e.g., ["BUSINESS_NAME"], ["CALLOUT"])
  field_type?: string; // Primary field type (subtype) - e.g., "BUSINESS_NAME", "CALLOUT", "HEADLINE", "DESCRIPTION", "SITELINK", "LOGO", "AD_IMAGE"
};

// Campaign Asset Response
export interface CampaignAssets {
  campaign_id: string;
  business_name: Asset | null;
  logo: Asset | null;
  assets: Asset[];
}

// Asset Group Assets Response
export interface AssetGroupAssets {
  asset_group_id: string;
  campaign_id: string | null;
  headlines: Asset[];
  descriptions: Asset[];
  long_headlines: Asset[];
  marketing_images: Asset[];
  square_marketing_images: Asset[];
  videos: Asset[];
  sitelinks: Asset[];
  callouts: Asset[];
}

// Create Asset Payloads
export interface CreateTextAssetPayload {
  text: string;
  asset_name?: string;
}

export interface CreateImageAssetPayload {
  image_url: string;
  asset_name?: string;
}

export interface CreateYoutubeVideoAssetPayload {
  youtube_video_id: string;
  asset_name?: string;
}

export interface CreateSitelinkAssetPayload {
  link_text: string;
  link_url: string;
  description1?: string;
  description2?: string;
  asset_name?: string;
}

export interface CreateCalloutAssetPayload {
  text: string;
  asset_name?: string;
}

// Link Asset Payloads
export interface LinkAssetToCampaignPayload {
  asset_resource_name?: string;
  asset_id?: string;
  field_type: "BUSINESS_NAME" | "LOGO";
}

export interface LinkAssetToAssetGroupPayload {
  asset_resource_name?: string;
  asset_id?: string;
  field_type: "HEADLINE" | "DESCRIPTION" | "LONG_HEADLINE" | "MARKETING_IMAGE" | "SQUARE_MARKETING_IMAGE" | "VIDEO" | "SITELINK" | "CALLOUT";
}

export const googleAdwordsAssetsService = {
  // Asset Creation
  createTextAsset: async (
    profileId: number,
    payload: CreateTextAssetPayload,
    fieldType?: string
  ): Promise<{ success: boolean; asset: TextAsset }> => {
    const config = fieldType ? { params: { field_type: fieldType } } : undefined;
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/assets/text/`,
      payload,
      config
    );
    return response.data;
  },

  createImageAsset: async (
    profileId: number,
    payload: CreateImageAssetPayload,
    fieldType?: string
  ): Promise<{ success: boolean; asset: ImageAsset }> => {
    const params = fieldType ? { field_type: fieldType } : undefined;
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/assets/image/`,
      payload,
      params ? { params } : undefined
    );
    return response.data;
  },

  createYoutubeVideoAsset: async (
    profileId: number,
    payload: CreateYoutubeVideoAssetPayload
  ): Promise<{ success: boolean; asset: YoutubeVideoAsset }> => {
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/assets/youtube-video/`,
      payload
    );
    return response.data;
  },

  createSitelinkAsset: async (
    profileId: number,
    payload: CreateSitelinkAssetPayload
  ): Promise<{ success: boolean; asset: SitelinkAsset }> => {
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/assets/sitelink/`,
      payload
    );
    return response.data;
  },

  createCalloutAsset: async (
    profileId: number,
    payload: CreateCalloutAssetPayload
  ): Promise<{ success: boolean; asset: CalloutAsset }> => {
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/assets/callout/`,
      payload
    );
    return response.data;
  },

  // Asset Query
  listAssets: async (
    profileId: number,
    assetType?: AssetType
  ): Promise<{ success: boolean; assets: Asset[]; count: number }> => {
    const params = assetType ? { asset_type: assetType } : {};
    const response = await api.get(
      `/google-adwords/profiles/${profileId}/assets/`,
      { params }
    );
    return response.data;
  },

  getAsset: async (
    profileId: number,
    assetId: string
  ): Promise<{ success: boolean; asset: Asset }> => {
    const response = await api.get(
      `/google-adwords/profiles/${profileId}/assets/${assetId}/`
    );
    return response.data;
  },

  // Campaign Assets
  getCampaignAssets: async (
    profileId: number,
    campaignId: string
  ): Promise<{ success: boolean; campaign_assets: CampaignAssets }> => {
    const response = await api.get(
      `/google-adwords/profiles/${profileId}/campaigns/${campaignId}/assets/`
    );
    return response.data;
  },

  linkAssetToCampaign: async (
    profileId: number,
    campaignId: string,
    payload: LinkAssetToCampaignPayload
  ): Promise<{ success: boolean; campaign_asset: any }> => {
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/campaigns/${campaignId}/assets/link/`,
      payload
    );
    return response.data;
  },

  removeAssetFromCampaign: async (
    profileId: number,
    campaignId: string,
    assetId: string,
    fieldType: "BUSINESS_NAME" | "LOGO"
  ): Promise<{ success: boolean; result: any }> => {
    const response = await api.delete(
      `/google-adwords/profiles/${profileId}/campaigns/${campaignId}/assets/${assetId}/`,
      { params: { field_type: fieldType } }
    );
    return response.data;
  },

  // Asset Group Assets
  getAssetGroupAssets: async (
    profileId: number,
    assetGroupId: string,
    campaignId?: string
  ): Promise<{ success: boolean; asset_group_assets: AssetGroupAssets }> => {
    const params = campaignId ? { campaign_id: campaignId } : {};
    const response = await api.get(
      `/google-adwords/profiles/${profileId}/asset-groups/${assetGroupId}/assets/`,
      { params }
    );
    return response.data;
  },

  linkAssetToAssetGroup: async (
    profileId: number,
    assetGroupId: string,
    payload: LinkAssetToAssetGroupPayload
  ): Promise<{ success: boolean; asset_group_asset: any }> => {
    const response = await api.post(
      `/google-adwords/profiles/${profileId}/asset-groups/${assetGroupId}/assets/link/`,
      payload
    );
    return response.data;
  },

  removeAssetFromAssetGroup: async (
    profileId: number,
    assetGroupId: string,
    assetId: string
  ): Promise<{ success: boolean; result: any }> => {
    const response = await api.delete(
      `/google-adwords/profiles/${profileId}/asset-groups/${assetGroupId}/assets/${assetId}/`
    );
    return response.data;
  },
};
