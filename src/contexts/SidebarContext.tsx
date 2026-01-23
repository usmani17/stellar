import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarWidth: number;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const COLLAPSED_WIDTH = 80;
const EXPANDED_WIDTH = 200;

export const SidebarProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === "true";
  });

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      // Save to localStorage
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        sidebarWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

