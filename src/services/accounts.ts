import api from './api';

export interface AmazonAccount {
  id: number;
  account_name: string;
  amazon_account_id: string;
  connected_at: string;
  updated_at: string;
  needs_profile_selection?: boolean;
}

export interface CreateAmazonAccountData {
  account_name: string;
  amazon_account_id?: string;
}

export const accountsService = {
  getAccounts: async (): Promise<AmazonAccount[]> => {
    const response = await api.get<AmazonAccount[]>('/accounts/');
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

  createAccount: async (data: CreateAmazonAccountData): Promise<AmazonAccount> => {
    const response = await api.post<AmazonAccount>('/accounts/', data);
    return response.data;
  },

  updateAccount: async (id: number, data: Partial<CreateAmazonAccountData>): Promise<AmazonAccount> => {
    const response = await api.put<AmazonAccount>(`/accounts/${id}/`, data);
    return response.data;
  },

  deleteAccount: async (id: number): Promise<void> => {
    await api.delete(`/accounts/${id}/`);
  },

  // Amazon OAuth
  initiateAmazonOAuth: async (): Promise<{ auth_url: string }> => {
    const response = await api.get<{ auth_url: string }>('/accounts/amazon-oauth/initiate/');
    return response.data;
  },

  handleAmazonOAuthCallback: async (code: string, state?: string): Promise<AmazonAccount> => {
    const response = await api.post<AmazonAccount>('/accounts/amazon-oauth/callback/', {
      code,
      state,
    });
    console.log('OAuth callback service response:', response.data);
    return response.data;
  },

  // Amazon Profiles
  getProfiles: async (accountId: number): Promise<{ profiles: any[]; total: number; selected: number }> => {
    const response = await api.get<{ profiles: any[]; total: number; selected: number }>(`/accounts/${accountId}/profiles/`);
    return response.data;
  },

  fetchProfiles: async (accountId: number): Promise<any[]> => {
    const response = await api.get<{ profiles: any[] }>(`/accounts/${accountId}/profiles/fetch/`);
    return response.data.profiles || [];
  },

  saveProfiles: async (accountId: number, profileIds: string[], profiles?: any[]): Promise<any> => {
    const response = await api.post(`/accounts/${accountId}/profiles/save/`, {
      profile_ids: profileIds,
      profiles: profiles || [],
    });
    return response.data;
  },
};

