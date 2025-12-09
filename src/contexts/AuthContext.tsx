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
          // Get Auth0 access token with audience
          // With audience configured, Auth0 returns a proper JWT access token (not encrypted)
          const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
          const token = await getAccessTokenSilently({
            authorizationParams: audience ? { audience } : undefined,
          });
          
          if (token) {
            localStorage.setItem("accessToken", token);
            console.log("Stored access token for backend authentication", { hasAudience: !!audience });
            
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
                message: error?.message
              });
              
              // Retry with exponential backoff
              const maxRetries = 3;
              const retry = async (retryCount: number) => {
                if (retryCount >= maxRetries) {
                  console.error("Max retries reached. User profile fetch failed.");
                  setLoading(false);
                  return;
                }
                
                const attemptNumber = retryCount + 1;
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                console.log(`Retrying user profile fetch (attempt ${attemptNumber}/${maxRetries}) after ${delay}ms...`);
                
                setTimeout(async () => {
                  try {
                    const backendUser = await authService.getProfile();
                    console.log("User profile fetched on retry:", backendUser);
                    setUser(backendUser);
                    localStorage.setItem("user", JSON.stringify(backendUser));
                    setLoading(false);
                  } catch (retryError: any) {
                    console.error(`Error fetching user profile on retry ${attemptNumber}:`, retryError);
                    retry(retryCount + 1);
                  }
                }, delay);
              };
              
              // Start retry if it's a 403, 401, or network error
              if (error?.response?.status === 403 || 
                  error?.response?.status === 401 || 
                  error?.code === 'NETWORK_ERROR' ||
                  !error?.response) {
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
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
      },
    });
  };

  const loginWithGoogle = async () => {
    await loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
        screen_hint: 'login',
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
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  };

  const registerWithGoogle = async () => {
    await loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
        screen_hint: 'signup',
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
      // Get access token with audience (returns JWT when audience is configured)
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
      const token = await getAccessTokenSilently({
        authorizationParams: audience ? { audience } : undefined,
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
        getAccessToken 
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
