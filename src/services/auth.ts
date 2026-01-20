import api from './api';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  password: string;
  password2: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register/', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/', credentials);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await api.post<{ access: string }>('/auth/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/password-reset/', {
      email,
    });
    return response.data;
  },

  confirmPasswordReset: async (token: string, uid: string, newPassword: string, newPassword2: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/password-reset-confirm/', {
      token: `${uid}/${token}`,
      new_password: newPassword,
      new_password2: newPassword2,
    });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/profile/');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<User>('/users/profile/', data);
    return response.data;
  },

  saveAuth0Tokens: async (accessToken: string, refreshToken: string): Promise<{ message: string; user_id: number }> => {
    const response = await api.post<{ message: string; user_id: number }>('/users/save-auth0-tokens/', {
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Backend Auth0 OAuth endpoints
  getAuth0LoginUrl: async (options?: { connection?: string; screen_hint?: string }): Promise<{ auth_url: string; state: string }> => {
    const params = new URLSearchParams();
    if (options?.connection) params.append('connection', options.connection);
    if (options?.screen_hint) params.append('screen_hint', options.screen_hint);
    // Don't pass redirect_uri - backend will use its own callback URL from settings
    
    const response = await api.get<{ auth_url: string; state: string }>(`/users/auth0/login/?${params.toString()}`);
    return response.data;
  },

  getAuth0LogoutUrl: async (): Promise<{ logout_url: string }> => {
    const response = await api.get<{ logout_url: string }>('/users/auth0/logout/');
    return response.data;
  },
};
