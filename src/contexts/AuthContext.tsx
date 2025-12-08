import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");

      if (storedUser && accessToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    localStorage.setItem("accessToken", response.tokens.access);
    localStorage.setItem("refreshToken", response.tokens.refresh);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    localStorage.setItem("accessToken", response.tokens.access);
    localStorage.setItem("refreshToken", response.tokens.refresh);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
