import api from './api';

export interface Channel {
  id: number;
  channel_name: string;
  channel_type: 'amazon' | 'google';
  status: 'active' | 'inactive' | 'pending';
  amazon_account: number | null;
  amazon_account_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelData {
  channel_name: string;
  channel_type: 'amazon' | 'google';
  status?: 'active' | 'inactive' | 'pending';
  amazon_account?: number | null;
}

export const channelsService = {
  getChannels: async (): Promise<Channel[]> => {
    const response = await api.get<Channel[]>('/accounts/channels/');
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

  createChannel: async (data: CreateChannelData): Promise<Channel> => {
    const response = await api.post<Channel>('/accounts/channels/', data);
    return response.data;
  },

  updateChannel: async (id: number, data: Partial<CreateChannelData>): Promise<Channel> => {
    const response = await api.put<Channel>(`/accounts/channels/${id}/`, data);
    return response.data;
  },

  deleteChannel: async (id: number): Promise<void> => {
    await api.delete(`/accounts/channels/${id}/`);
  },
};

