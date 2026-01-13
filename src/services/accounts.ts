import api from './api';

export interface Channel {
  id: number;
  channel_name: string;
  channel_type: 'amazon' | 'google' | 'walmart' | 'tiktok';
  status: 'active' | 'inactive' | 'pending';
  account: number;
  account_id?: number;
  account_name?: string;
  credentials_json?: any;
  created_at: string;
  updated_at: string;
  needs_profile_selection?: boolean;
  profile_counts?: {
    total: number;
    selected: number;
  };
}

export interface Account {
  id: number;
  name: string;
  channels_count?: number;
  channels?: Channel[];
  user_ids?: number[];
  users?: Array<{ id: number; name: string; email: string }>;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountData {
  name: string;
}

export const accountsService = {
  // Account methods
  getAccounts: async (): Promise<Account[]> => {
    const response = await api.get<Account[]>('/accounts/');
    // Ensure we always return an array
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    // If response is wrapped in an object, try to extract the array
    if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      return data.results;
    }
    // If data is an object but not an array, return empty array
    console.warn('Unexpected response format from /accounts/', data);
    return [];
  },

  createAccount: async (data: CreateAccountData): Promise<Account> => {
    const response = await api.post<Account>('/accounts/', data);
    return response.data;
  },

  updateAccount: async (id: number, data: Partial<CreateAccountData>): Promise<Account> => {
    const response = await api.put<Account>(`/accounts/${id}/`, data);
    return response.data;
  },

  deleteAccount: async (id: number): Promise<void> => {
    await api.delete(`/accounts/${id}/`);
  },

  // Account channels
  getAccountChannels: async (accountId: number): Promise<Channel[]> => {
    const response = await api.get<Channel[]>(`/accounts/${accountId}/channels/`);
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  },

  updateChannel: async (accountId: number, channelId: number, data: Partial<{ channel_name: string }>): Promise<Channel> => {
    const response = await api.put<Channel>(`/accounts/${accountId}/channels/${channelId}/`, data);
    return response.data;
  },

  deleteChannel: async (accountId: number, channelId: number): Promise<void> => {
    await api.delete(`/accounts/${accountId}/channels/${channelId}/`);
  },

  // Amazon OAuth
  initiateAmazonOAuth: async (accountId: number): Promise<{ auth_url: string }> => {
    const response = await api.get<{ auth_url: string }>(`/accounts/amazon-oauth/initiate/?account_id=${accountId}`);
    return response.data;
  },

  handleAmazonOAuthCallback: async (code: string, state?: string): Promise<Channel> => {
    const response = await api.post<Channel>('/accounts/amazon-oauth/callback/', {
      code,
      state,
    });
    console.log('OAuth callback service response:', response.data);
    return response.data;
  },

  // Google OAuth
  initiateGoogleOAuth: async (accountId: number): Promise<{ auth_url: string }> => {
    const response = await api.get<{ auth_url: string }>(`/accounts/google-oauth/initiate/?account_id=${accountId}`);
    return response.data;
  },

  handleGoogleOAuthCallback: async (code: string, state?: string): Promise<any> => {
    const response = await api.post<any>('/accounts/google-oauth/callback/', {
      code,
      state,
    });
    console.log('Google OAuth callback service response:', response.data);
    return response.data;
  },

  // TikTok OAuth
  initiateTikTokOAuth: async (accountId: number): Promise<{ auth_url: string }> => {
    const response = await api.get<{ auth_url: string }>(`/accounts/tiktok-oauth/initiate/?account_id=${accountId}`);
    return response.data;
  },

  handleTikTokOAuthCallback: async (code: string, state?: string): Promise<Channel> => {
    // TikTok sends auth_code, send it as auth_code to backend for clarity
    // Backend accepts both 'code' and 'auth_code' for compatibility
    const response = await api.post<Channel>('/accounts/tiktok-oauth/callback/', {
      auth_code: code, // Send as auth_code since that's what TikTok provides
      state,
    });
    console.log('TikTok OAuth callback service response:', response.data);
    return response.data;
  },

  // Google Profiles (now using channel_id, similar to Amazon profiles)
  getGoogleProfiles: async (channelId: number): Promise<{ profiles: any[]; total: number; selected: number }> => {
    const response = await api.get<{ profiles: any[]; total: number; selected: number }>(`/accounts/channels/${channelId}/google-profiles/`);
    return response.data;
  },

  fetchGoogleProfiles: async (channelId: number): Promise<any[]> => {
    const response = await api.get<{ profiles: any[] }>(`/accounts/channels/${channelId}/google-profiles/fetch/`);
    return response.data.profiles || [];
  },

  saveGoogleProfiles: async (channelId: number, profileIds: string[], profiles?: any[]): Promise<any> => {
    const response = await api.post(`/accounts/channels/${channelId}/google-profiles/save/`, {
      profile_ids: profileIds,
      profiles: profiles || [],
    });
    return response.data;
  },

  // Amazon Profiles (now using channel_id)
  getProfiles: async (channelId: number): Promise<{ profiles: any[]; total: number; selected: number }> => {
    const response = await api.get<{ profiles: any[]; total: number; selected: number }>(`/accounts/channels/${channelId}/profiles/`);
    return response.data;
  },

  fetchProfiles: async (channelId: number): Promise<any[]> => {
    const response = await api.get<{ profiles: any[] }>(`/accounts/channels/${channelId}/profiles/fetch/`);
    return response.data.profiles || [];
  },

  saveProfiles: async (channelId: number, profileIds: string[], profiles?: any[]): Promise<any> => {
    const response = await api.post(`/accounts/channels/${channelId}/profiles/save/`, {
      profile_ids: profileIds,
      profiles: profiles || [],
    });
    return response.data;
  },

  // TikTok Profiles (using channel_id)
  getTikTokProfiles: async (channelId: number): Promise<{ profiles: any[]; total: number; selected: number }> => {
    const response = await api.get<{ profiles: any[]; total: number; selected: number }>(`/accounts/channels/${channelId}/tiktok-profiles/`);
    return response.data;
  },

  fetchTikTokProfiles: async (channelId: number): Promise<any[]> => {
    const response = await api.get<{ profiles: any[] }>(`/accounts/channels/${channelId}/tiktok-profiles/fetch/`);
    return response.data.profiles || [];
  },

  saveTikTokProfiles: async (channelId: number, profileIds: string[], profiles?: any[]): Promise<any> => {
    const response = await api.post(`/accounts/channels/${channelId}/tiktok-profiles/save/`, {
      profile_ids: profileIds,
      profiles: profiles || [],
    });
    return response.data;
  },

  // Amazon Portfolios (per account, optionally filtered by profileId)
  getPortfolios: async (accountId: number, profileId?: string): Promise<Array<{ id: string; name: string }>> => {
    const params = profileId ? { profileId } : {};
    const response = await api.get<{ portfolios: Array<{ id: string; name: string }> }>(
      `/accounts/${accountId}/portfolios/`,
      { params }
    );
    return response.data.portfolios || [];
  },

  // Amazon Brand Entities (per account, optionally filtered by profileId)
  getBrandEntities: async (accountId: number, profileId?: string): Promise<Array<{ brandEntityId: string; brandRegistryName: string }>> => {
    const params = profileId ? { profileId } : {};
    const response = await api.get<{ brandEntities: Array<{ brandEntityId: string; brandRegistryName: string }> }>(
      `/accounts/${accountId}/brand-entities/`,
      { params }
    );
    return response.data.brandEntities || [];
  },

  // AWS Identity (public endpoint)
  getAWSIdentity: async (): Promise<{ UserId?: string; Account?: string; Arn?: string }> => {
    const response = await api.get<{ UserId?: string; Account?: string; Arn?: string }>('/accounts/aws-identity/');
    return response.data;
  },
};

