import api from "./api";

export interface SuperAdminWorkspace {
  id: number;
  name: string;
  team_size?: string;
  role?: string;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  users_count: number;
  owner: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface SuperAdminWorkspaceListResponse {
  count: number;
  page: number;
  page_size: number;
  results: SuperAdminWorkspace[];
}

export interface SuperAdminUserWorkspace {
  id: number;
  name: string;
  role: string;
}

export interface SuperAdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  workspaces: SuperAdminUserWorkspace[];
}

export interface SuperAdminAllUsersResponse {
  count: number;
  page: number;
  page_size: number;
  next_page: number | null;
  previous_page: number | null;
  results: SuperAdminUser[];
}

export const superAdminService = {
  listWorkspaces: async (params: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<SuperAdminWorkspaceListResponse> => {
    const response = await api.get<SuperAdminWorkspaceListResponse>(
      "/super-admin/workspaces/",
      { params },
    );
    return response.data;
  },

  impersonateWorkspace: async (workspaceId: number): Promise<{
    workspace: { id: number; name: string };
  }> => {
    const response = await api.post<{ workspace: { id: number; name: string } }>(
      "/super-admin/impersonate-workspace/",
      { workspace_id: workspaceId },
    );
    return response.data;
  },

  exitImpersonation: async (): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      "/super-admin/impersonation/exit/",
    );
    return response.data;
  },

  getAllUsers: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
    workspace?: number;
  }): Promise<SuperAdminAllUsersResponse> => {
    const response = await api.get<SuperAdminAllUsersResponse>(
      "/super-admin/all-users/",
      { params },
    );
    return response.data;
  },
};

