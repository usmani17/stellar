import axios from "axios";
import { clearAccountIdFromStorage } from "../utils/urlHelpers";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/** Clear auth state and redirect to login. Use when token is invalid/expired or refresh fails. */
function logoutAndRedirectToLogin(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  clearAccountIdFromStorage();
  const path = window.location.pathname + window.location.search + (window.location.hash || "");
  if (path && path !== "/login") {
    sessionStorage.setItem("loginRedirect", path);
  }
  window.location.href = "/login";
}

// Store a reference to the Auth0 getAccessTokenSilently function
// This will be set by AuthContext
let auth0GetToken: (() => Promise<string | null>) | null = null;

export const setAuth0TokenGetter = (getter: () => Promise<string | null>) => {
  auth0GetToken = getter;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies in requests (needed for session-based state storage)
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // For FormData (file uploads), remove Content-Type so browser sets multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Try to get token from Auth0 first, fallback to localStorage
    const token = localStorage.getItem("accessToken");

    // If no token in localStorage, try to get it from Auth0
    if (!token) {
      try {
        // This will work if we're in an Auth0 context
        // We'll handle this in the component level for now
        // The token should already be in localStorage from AuthContext
      } catch (error) {
        // Not in Auth0 context, continue with localStorage token
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        `[API] Making ${config.method?.toUpperCase()} request to ${config.url}`,
        {
          hasToken: !!token,
          tokenPreview: token.substring(0, 20) + "...",
        }
      );
    } else {
      console.warn(
        `[API] Making ${config.method?.toUpperCase()} request to ${
          config.url
        } without token`
      );
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API] Response from ${response.config.url}:`,
      response.status,
      response.statusText
    );
    return response;
  },
  async (error) => {
    console.error(`[API] Error from ${error.config?.url}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    const originalRequest = error.config;
    const data = error.response?.data;

    // Whenever backend says token is invalid/expired, logout and redirect (any status code)
    const isTokenInvalid =
      data &&
      (data.code === "token_not_valid" ||
        (typeof data.detail === "string" && data.detail.toLowerCase().includes("token not valid")));
    if (isTokenInvalid) {
      logoutAndRedirectToLogin();
      return Promise.reject(error);
    }

    // Don't try to refresh token for login/register/auth endpoints - these are authentication attempts
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login/') || 
                          originalRequest?.url?.includes('/auth/register/') ||
                          originalRequest?.url?.includes('/auth/password-reset/') ||
                          originalRequest?.url?.includes('/auth/password-reset-confirm/') ||
                          originalRequest?.url?.includes('/auth/verify-email/');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {

      originalRequest._retry = true;

      // Check if this is Auth0 authentication (no refresh token in localStorage)
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        // Traditional login - use backend refresh endpoint
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem("accessToken", access);
          originalRequest.headers.Authorization = `Bearer ${access}`;

          return api(originalRequest);
        } catch (refreshError) {
          logoutAndRedirectToLogin();
          return Promise.reject(refreshError);
        }
      } else {
        // Auth0 or no refresh token - try refresh-auth0 if we have a token, otherwise logout
        const auth0RefreshToken = localStorage.getItem("refreshToken");
        if (auth0RefreshToken) {
          try {
            const refreshResponse = await api.post('/users/refresh-auth0/', {
              refresh_token: auth0RefreshToken,
            });
            const newAccessToken = refreshResponse.data.access_token;
            if (newAccessToken) {
              localStorage.setItem("accessToken", newAccessToken);
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return api(originalRequest);
            }
          } catch (auth0Error) {
            console.error("Auth0 token refresh failed:", auth0Error);
          }
        }
        // No refresh token or refresh failed — logout and redirect
        logoutAndRedirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
