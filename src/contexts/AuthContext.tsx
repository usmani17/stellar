import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  authService,
  type User,
  type LoginCredentials,
  type RegisterData,
} from "../services/auth";
import { setAuth0TokenGetter } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithAuth0: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  registerWithAuth0: () => Promise<void>;
  registerWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Auth0 user with backend user
  useEffect(() => {
    const syncUser = async () => {
      if (auth0Loading) {
        setLoading(true);
        return;
      }

      if (isAuthenticated && auth0User) {
        try {
          // Get Auth0 access token with audience and scope
          // With audience configured, Auth0 returns a proper JWT access token (not encrypted)
          const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

          console.log("Auth0 Audience:", audience);
          const token = await getAccessTokenSilently({
            authorizationParams: audience
              ? {
                  audience,
                  scope: "openid profile email offline_access",
                }
              : { scope: "openid profile email offline_access" },
          });

          // Extract refresh token from Auth0 SDK's localStorage cache
          // Auth0 SDK stores tokens with keys starting with @@auth0spajs@@
          let refreshToken: string | null = null;
          try {
            // Try to find refresh token in all Auth0 cache entries
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('@@auth0spajs@@')) {
                try {
                  const cacheData = localStorage.getItem(key);
                  if (cacheData) {
                    const parsed = JSON.parse(cacheData);
                    // Auth0 SDK stores refresh token in different possible locations
                    if (parsed.refresh_token) {
                      refreshToken = parsed.refresh_token;
                      console.log("Found refresh token in Auth0 cache key:", key);
                      break;
                    } else if (parsed.body?.refresh_token) {
                      refreshToken = parsed.body.refresh_token;
                      console.log("Found refresh token in Auth0 cache body:", key);
                      break;
                    } else if (parsed.cache?.refresh_token) {
                      refreshToken = parsed.cache.refresh_token;
                      console.log("Found refresh token in Auth0 cache.cache:", key);
                      break;
                    }
                  }
                } catch (parseError) {
                  // Continue searching other keys
                  continue;
                }
              }
            }
            
            if (!refreshToken) {
              console.warn("Refresh token not found in Auth0 cache - checking all localStorage keys");
              // Debug: log all Auth0-related keys
              const auth0Keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
                .filter(key => key && (key.includes('auth0') || key.includes('@@auth0')));
              console.log("Auth0-related localStorage keys:", auth0Keys);
            } else {
              console.log("Successfully extracted refresh token from Auth0 cache");
            }
          } catch (error) {
            console.warn("Failed to extract refresh token from Auth0 cache:", error);
          }

          // Decode JWT token to see what's inside (without verification)
          if (token) {
            try {
              const base64Url = token.split(".")[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map(
                    (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                  )
                  .join("")
              );
              const decodedToken = JSON.parse(jsonPayload);
              console.log(
                "🔓 [FRONTEND] Decoded Access Token Payload:",
                decodedToken
              );
              console.log("🔓 [FRONTEND] Token Claims:", {
                sub: decodedToken.sub,
                email: decodedToken.email,
                aud: decodedToken.aud,
                iss: decodedToken.iss,
                exp: decodedToken.exp,
                iat: decodedToken.iat,
                allKeys: Object.keys(decodedToken),
              });
            } catch (error) {
              console.error("Failed to decode token:", error);
            }

            localStorage.setItem("accessToken", token);
            console.log("Stored access token for backend authentication", {
              hasAudience: !!audience,
            });

            // Save Auth0 tokens to backend database if refresh token is available
            if (refreshToken) {
              try {
                console.log("Saving Auth0 tokens to backend database...");
                await authService.saveAuth0Tokens(token, refreshToken);
                console.log("Auth0 tokens saved to database successfully");
              } catch (saveError: any) {
                console.warn("Failed to save Auth0 tokens to database:", saveError);
                // Don't block the flow if token saving fails
              }
            } else {
              console.warn("No refresh token found in Auth0 cache - tokens will not be saved to database");
            }

            // Fetch user profile from backend
            // The backend will automatically create the user if it doesn't exist
            try {
              console.log("Fetching user profile from backend...");
              const backendUser = await authService.getProfile();
              console.log("User profile fetched:", backendUser);
              setUser(backendUser);
              localStorage.setItem("user", JSON.stringify(backendUser));
              setLoading(false);
            } catch (error: any) {
              // If profile fetch fails, it might be because:
              // 1. User is being created (first request)
              // 2. Token validation issue
              // 3. Network error
              console.error("Error fetching user profile:", error);
              console.error("Error details:", {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
              });

              // Retry with exponential backoff
              const maxRetries = 3;
              const retry = async (retryCount: number) => {
                if (retryCount >= maxRetries) {
                  console.error(
                    "Max retries reached. User profile fetch failed."
                  );
                  setLoading(false);
                  return;
                }

                const attemptNumber = retryCount + 1;
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                console.log(
                  `Retrying user profile fetch (attempt ${attemptNumber}/${maxRetries}) after ${delay}ms...`
                );

                setTimeout(async () => {
                  try {
                    const backendUser = await authService.getProfile();
                    console.log("User profile fetched on retry:", backendUser);
                    setUser(backendUser);
                    localStorage.setItem("user", JSON.stringify(backendUser));
                    setLoading(false);
                  } catch (retryError: any) {
                    console.error(
                      `Error fetching user profile on retry ${attemptNumber}:`,
                      retryError
                    );
                    retry(retryCount + 1);
                  }
                }, delay);
              };

              // Start retry if it's a 403, 401, or network error
              if (
                error?.response?.status === 403 ||
                error?.response?.status === 401 ||
                error?.code === "NETWORK_ERROR" ||
                !error?.response
              ) {
                retry(0);
              } else {
                setLoading(false);
              }
            }
          } else {
            console.error("No token received from Auth0");
          }
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      } else {
        // Only clear if not authenticated via Auth0 AND not authenticated via traditional login
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("accessToken");
        if (!storedUser && !storedToken) {
          setUser(null);
        }
      }
      setLoading(false);
    };

    syncUser();
  }, [isAuthenticated, auth0User, auth0Loading, getAccessTokenSilently]);

  // Initialize from localStorage on mount (for traditional login)
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");

      if (storedUser && accessToken && !isAuthenticated) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
    };

    if (!auth0Loading && !isAuthenticated) {
      initAuth();
    }
  }, [auth0Loading, isAuthenticated]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    localStorage.setItem("accessToken", response.tokens.access);
    localStorage.setItem("refreshToken", response.tokens.refresh);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const loginWithAuth0 = async () => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: "login",
        scope: "openid profile email offline_access",
        ...(audience ? { audience } : {}),
      },
    });
  };

  const loginWithGoogle = async () => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
    await loginWithRedirect({
      authorizationParams: {
        connection: "google-oauth2",
        screen_hint: "login",
        scope: "openid profile email offline_access",
        ...(audience ? { audience } : {}),
      },
    });
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    localStorage.setItem("accessToken", response.tokens.access);
    localStorage.setItem("refreshToken", response.tokens.refresh);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const registerWithAuth0 = async () => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
        scope: "openid profile email offline_access",
        ...(audience ? { audience } : {}),
      },
    });
  };

  const registerWithGoogle = async () => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
    await loginWithRedirect({
      authorizationParams: {
        connection: "google-oauth2",
        screen_hint: "signup",
        scope: "openid profile email offline_access",
        ...(audience ? { audience } : {}),
      },
    });
  };

  const logout = () => {
    // If authenticated via Auth0, use Auth0 logout
    if (isAuthenticated) {
      auth0Logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      // Get access token with audience and scope (returns JWT when audience is configured)
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
      const token = await getAccessTokenSilently({
        authorizationParams: audience
          ? {
              audience,
              scope: "openid profile email offline_access",
            }
          : { scope: "openid profile email offline_access" },
      });
      if (token) {
        localStorage.setItem("accessToken", token);
      }
      return token || null;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  };

  // Set the token getter for API interceptor to use
  useEffect(() => {
    if (isAuthenticated) {
      setAuth0TokenGetter(getAccessToken);
    } else {
      setAuth0TokenGetter(null);
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithAuth0,
        loginWithGoogle,
        register,
        registerWithAuth0,
        registerWithGoogle,
        logout,
        updateUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
