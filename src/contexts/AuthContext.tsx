import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false); // Prevent duplicate calls in StrictMode

  // Initialize user from localStorage on mount
  useEffect(() => {
    // Prevent duplicate calls (especially in React StrictMode)
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    const initAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");

      if (storedUser && accessToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);

          // Verify token is still valid by fetching profile
          try {
            const backendUser = await authService.getProfile();
            setUser(backendUser);
            localStorage.setItem("user", JSON.stringify(backendUser));
          } catch (error) {
            // Token might be expired, clear storage
            console.warn("Token validation failed, clearing auth state");
            localStorage.removeItem("user");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            setUser(null);
          }
        } catch (error) {
          console.error("Error initializing auth:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      localStorage.setItem("accessToken", response.tokens.access);
      localStorage.setItem("refreshToken", response.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      // Re-throw the error so it can be handled by the Login component
      throw error;
    }
  };

  const loginWithAuth0 = async () => {
    try {
      // Get Auth0 login URL from backend
      const { auth_url } = await authService.getAuth0LoginUrl({
        screen_hint: "login",
      });
      // Redirect to Auth0
      window.location.href = auth_url;
    } catch (error) {
      console.error("Failed to get Auth0 login URL:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Get Auth0 login URL from backend with Google connection
      const { auth_url } = await authService.getAuth0LoginUrl({
        connection: "google-oauth2",
        screen_hint: "login",
      });
      // Redirect to Auth0
      window.location.href = auth_url;
    } catch (error) {
      console.error("Failed to get Auth0 Google login URL:", error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    localStorage.setItem("accessToken", response.tokens.access);
    localStorage.setItem("refreshToken", response.tokens.refresh);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const registerWithAuth0 = async () => {
    try {
      // Get Auth0 signup URL from backend
      const { auth_url } = await authService.getAuth0LoginUrl({
        screen_hint: "signup",
      });
      // Redirect to Auth0
      window.location.href = auth_url;
    } catch (error) {
      console.error("Failed to get Auth0 signup URL:", error);
      throw error;
    }
  };

  const registerWithGoogle = async () => {
    try {
      // Get Auth0 signup URL from backend with Google connection
      const { auth_url } = await authService.getAuth0LoginUrl({
        connection: "google-oauth2",
        screen_hint: "signup",
      });
      // Redirect to Auth0
      window.location.href = auth_url;
    } catch (error) {
      console.error("Failed to get Auth0 Google signup URL:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Check if we have an Auth0 token (stored in localStorage)
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken && user) {
        // Try to get Auth0 logout URL from backend
        try {
          const { logout_url } = await authService.getAuth0LogoutUrl();
          // Clear local storage first
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          setUser(null);
          // Redirect to Auth0 logout
          window.location.href = logout_url;
          return;
        } catch (error) {
          console.error("Failed to get Auth0 logout URL:", error);
          // Fall through to regular logout
        }
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }

    // Fallback: clear local storage and redirect
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const getAccessToken = async (): Promise<string | null> => {
    // Get token from localStorage (set by backend callback)
    const token = localStorage.getItem("accessToken");
    return token || null;
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
