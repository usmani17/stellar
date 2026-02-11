import api from './api';

export interface WorkspaceUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'team';
  assigned_brands_count?: number;
  assigned_integrations_count?: number;
}

export interface WorkspaceUsersResponse {
  users: WorkspaceUser[];
  workspace_id: number;
  workspace_name: string;
}

export interface WorkspaceUsersPaginatedParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
}

export interface WorkspaceUsersPaginatedResponse {
  count: number;
  page: number;
  page_size: number;
  next_page: number | null;
  previous_page: number | null;
  results: WorkspaceUser[];
  workspace_id: number;
  workspace_name: string;
}

export const workspaceService = {
  getUsers: async (workspaceId: number): Promise<WorkspaceUsersResponse> => {
    const data = await api.get<WorkspaceUsersPaginatedResponse>(
      `/workspaces/${workspaceId}/users/`,
      { params: { page: 1, page_size: 9999 } }
    ).then((r) => r.data);
    return {
      users: data.results,
      workspace_id: data.workspace_id,
      workspace_name: data.workspace_name,
    };
  },

  getUsersPaginated: async (
    workspaceId: number,
    params?: WorkspaceUsersPaginatedParams
  ): Promise<WorkspaceUsersPaginatedResponse> => {
    const response = await api.get<WorkspaceUsersPaginatedResponse>(
      `/workspaces/${workspaceId}/users/`,
      { params: params ?? {} }
    );
    return response.data;
  },

  invite: async (
    workspaceId: number,
    data: { email: string; role: 'manager' | 'team' }
  ): Promise<{ message: string; invite_id: number }> => {
    const response = await api.post<{ message: string; invite_id: number }>(
      `/workspaces/${workspaceId}/invite/`,
      data
    );
    return response.data;
  },

  createUser: async (
    workspaceId: number,
    data: {
      email: string;
      first_name: string;
      last_name: string;
      role: 'manager' | 'team';
      password: string;
      password2: string;
    }
  ): Promise<{ message: string; user: { id: number } }> => {
    const response = await api.post<{ message: string; user: { id: number } }>(
      `/workspaces/${workspaceId}/users/`,
      data
    );
    return response.data;
  },

  assignAccountsToManager: async (
    workspaceId: number,
    managerId: number,
    accountIds: number[]
  ): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `/workspaces/${workspaceId}/managers/${managerId}/assign-accounts/`,
      { account_ids: accountIds }
    );
    return response.data;
  },

  assignChannelsToTeam: async (
    workspaceId: number,
    teamId: number,
    channelIds: number[]
  ): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `/workspaces/${workspaceId}/team/${teamId}/assign-channels/`,
      { channel_ids: channelIds }
    );
    return response.data;
  },

  deleteUser: async (
    workspaceId: number,
    userId: number
  ): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(
      `/workspaces/${workspaceId}/users/${userId}/`
    );
    return response.data;
  },

  sendWelcomeEmail: async (
    workspaceId: number,
    userId: number
  ): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `/workspaces/${workspaceId}/users/${userId}/send-welcome-email/`
    );
    return response.data;
  },
};
