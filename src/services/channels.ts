import api from './api';

export interface Channel {
  id: number;
  channel_name: string;
  channel_type: 'amazon' | 'google' | 'walmart';
  account: number;
  account_id?: number;
  account_name?: string;
  credentials_json?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelData {
  channel_name: string;
  channel_type: 'amazon' | 'google' | 'walmart';
  account: number;
}

export const channelsService = {
  getChannels: async (accountId: number): Promise<Channel[]> => {
    const response = await api.get<Channel[]>(`/accounts/${accountId}/channels/`);
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
    console.warn('Unexpected response format from /accounts/channels/', data);
    return [];
  },

  createChannel: async (accountId: number, data: CreateChannelData): Promise<Channel> => {
    const response = await api.post<Channel>(`/accounts/${accountId}/channels/`, data);
    return response.data;
  },

  updateChannel: async (accountId: number, id: number, data: Partial<CreateChannelData>): Promise<Channel> => {
    const response = await api.put<Channel>(`/accounts/${accountId}/channels/${id}/`, data);
    return response.data;
  },

  deleteChannel: async (accountId: number, id: number): Promise<void> => {
    await api.delete(`/accounts/${accountId}/channels/${id}/`);
  },
};

