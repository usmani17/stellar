import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "stellar-dashboard-theme";

type DashboardTheme = "light" | "dark";

interface DashboardThemeContextType {
  theme: DashboardTheme;
  toggleTheme: () => void;
  isDark: boolean;
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

export const DashboardThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(STORAGE_KEY) as DashboardTheme) || "light";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  return (
    <DashboardThemeContext.Provider
      value={{ theme, toggleTheme, isDark: theme === "dark" }}
    >
      {children}
    </DashboardThemeContext.Provider>
  );
};

export const useDashboardTheme = (): DashboardThemeContextType => {
  const ctx = useContext(DashboardThemeContext);
  if (ctx === undefined) {
    return {
      theme: "light",
      toggleTheme: () => {},
      isDark: false,
    };
  }
  return ctx;
};
