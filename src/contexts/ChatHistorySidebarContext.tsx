import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

const COLLAPSE_DELAY_MS = 150;

export interface ChatHistorySidebarContextType {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  /** Schedule collapse after delay (used when leaving Home link - user may be moving to sidebar) */
  scheduleCollapse: () => void;
  cancelCollapse: () => void;
}

const ChatHistorySidebarContext =
  createContext<ChatHistorySidebarContextType | undefined>(undefined);

export const useChatHistorySidebar = (): ChatHistorySidebarContextType => {
  const ctx = useContext(ChatHistorySidebarContext);
  if (ctx === undefined) {
    throw new Error("useChatHistorySidebar must be used within ChatHistorySidebarProvider");
  }
  return ctx;
};

/** Optional version for use in Sidebar; returns undefined when outside provider. */
export const useChatHistorySidebarOptional = (): ChatHistorySidebarContextType | undefined =>
  useContext(ChatHistorySidebarContext);

export const ChatHistorySidebarProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelCollapse = useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }, []);

  const setExpanded = useCallback(
    (expanded: boolean) => {
      cancelCollapse();
      setIsExpanded(expanded);
    },
    [cancelCollapse]
  );

  const scheduleCollapse = useCallback(() => {
    cancelCollapse();
    collapseTimeoutRef.current = setTimeout(() => {
      collapseTimeoutRef.current = null;
      setIsExpanded(false);
    }, COLLAPSE_DELAY_MS);
  }, [cancelCollapse]);

  return (
    <ChatHistorySidebarContext.Provider
      value={{ isExpanded, setExpanded, scheduleCollapse, cancelCollapse }}
    >
      {children}
    </ChatHistorySidebarContext.Provider>
  );
};
