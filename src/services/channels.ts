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
    return response.data;
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

