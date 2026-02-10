import api from './api';

export interface WorkspaceUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'team';
}

export interface WorkspaceUsersResponse {
  users: WorkspaceUser[];
  workspace_id: number;
  workspace_name: string;
}

export const workspaceService = {
  getUsers: async (workspaceId: number): Promise<WorkspaceUsersResponse> => {
    const response = await api.get<WorkspaceUsersResponse>(
      `/workspaces/${workspaceId}/users/`
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
  ): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
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
};
