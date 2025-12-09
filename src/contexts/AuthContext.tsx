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
          // Get Auth0 access token
          const token = await getAccessTokenSilently();
          if (token) {
            localStorage.setItem("accessToken", token);
            
            // Fetch user profile from backend
            try {
              const backendUser = await authService.getProfile();
              setUser(backendUser);
              localStorage.setItem("user", JSON.stringify(backendUser));
            } catch (error) {
              // If profile doesn't exist, the backend will create it on first authenticated request
              // For now, create a user object from Auth0 data
              const tempUser: User = {
                id: 0,
                email: auth0User.email || '',
                first_name: auth0User.given_name || auth0User.name?.split(' ')[0] || '',
                last_name: auth0User.family_name || auth0User.name?.split(' ').slice(1).join(' ') || '',
                company_name: '',
                created_at: new Date().toISOString(),
              };
              setUser(tempUser);
            }
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
      const token = await getAccessTokenSilently();
      if (token) {
        localStorage.setItem("accessToken", token);
      }
      return token;
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
