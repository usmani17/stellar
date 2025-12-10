import api from './api';

export interface Account {
  id: number;
  name: string;
  channels_count?: number;
  channels?: Channel[];
  created_at: string;
  updated_at: string;
}

export interface CreateAccountData {
  name: string;
}

export interface Channel {
  id: number;
  channel_name: string;
  channel_type: 'amazon' | 'google' | 'walmart';
  status: 'active' | 'inactive' | 'pending';
  account: number;
  account_id?: number;
  account_name?: string;
  credentials_json?: any;
  created_at: string;
  updated_at: string;
  needs_profile_selection?: boolean;
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
};

