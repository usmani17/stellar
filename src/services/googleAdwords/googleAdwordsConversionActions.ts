import api from "../api";

// Conversion Action Interfaces
export interface GoogleConversionAction {
  id: string;
  name: string;
  type: string | null;
  category: string | null;
  status: string | null;
  resource_name: string;
  primary_for_goal?: boolean;
  counting_type?: string | null;
  click_lookback_days?: number | null;
  view_lookback_days?: number | null;
  default_value?: number | null;
  currency?: string | null;
}

// Create Conversion Action Payload
export interface CreateGoogleConversionActionPayload {
  name: string;
  category: string;
  type?: string;
  counting_type?: string;
  click_lookback_days?: number;
  view_lookback_days?: number;
  default_value?: number;
  currency?: string;
}

export const googleAdwordsConversionActionsService = {
  // List conversion actions (account-level)
  listConversionActions: async (
    accountId: number,
    channelId: number,
    profileId: number
  ): Promise<{ success: boolean; conversion_actions: GoogleConversionAction[]; count: number }> => {
    const response = await api.get(
      `/google-adwords/${accountId}/channels/${channelId}/conversion-actions/`,
      { params: { profile_id: profileId } }
    );
    return response.data;
  },

  // Create conversion action (account-level)
  createConversionAction: async (
    accountId: number,
    channelId: number,
    profileId: number,
    payload: CreateGoogleConversionActionPayload
  ): Promise<{ success: boolean; conversion_action: GoogleConversionAction }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/channels/${channelId}/conversion-actions/create/`,
      {
        ...payload,
        profile_id: profileId,
      }
    );
    return response.data;
  },
};
