import api from './api';

export interface AmazonAccount {
  id: number;
  account_name: string;
  amazon_account_id: string;
  connected_at: string;
  updated_at: string;
}

export interface CreateAmazonAccountData {
  account_name: string;
  amazon_account_id?: string;
}

export const accountsService = {
  getAccounts: async (): Promise<AmazonAccount[]> => {
    const response = await api.get<AmazonAccount[]>('/accounts/');
    return response.data;
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
};

