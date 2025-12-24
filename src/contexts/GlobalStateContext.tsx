import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { accountsService, type Channel } from "../services/accounts";

interface GlobalStateContextType {
  // Channels state management
  channels: {
    // Get channels for a specific account
    getChannels: (accountId: number) => Channel[];
    // Get loading state for a specific account
    isLoading: (accountId: number) => boolean;
    // Get error for a specific account
    getError: (accountId: number) => Error | null;
    // Load channels for a specific account (deduplicated - only one call at a time)
    loadChannels: (accountId: number) => Promise<void>;
    // Refresh channels for a specific account
    refreshChannels: (accountId: number) => Promise<void>;
    // Clear channels for a specific account
    clearChannels: (accountId: number) => void;
    // Clear all channels
    clearAllChannels: () => void;
  };
  // Future: Add more global state here (e.g., campaigns, adGroups, etc.)
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Store channels by account ID
  const [channelsByAccount, setChannelsByAccount] = useState<
    Record<number, Channel[]>
  >({});

  // Store loading states by account ID
  const [loadingByAccount, setLoadingByAccount] = useState<
    Record<number, boolean>
  >({});

  // Store errors by account ID
  const [errorsByAccount, setErrorsByAccount] = useState<
    Record<number, Error | null>
  >({});

  // Track ongoing requests to prevent duplicate calls
  const ongoingRequestsRef = useRef<Set<number>>(new Set());

  /**
   * Load channels for a specific account
   * Deduplicates requests - if a request is already in progress, it won't make another call
   */
  const loadChannels = useCallback(async (accountId: number) => {
    // If channels already exist for this account, don't reload
    if (channelsByAccount[accountId]) {
      return;
    }

    // If a request is already in progress for this account, don't make another call
    if (ongoingRequestsRef.current.has(accountId)) {
      return;
    }

    // Mark request as ongoing
    ongoingRequestsRef.current.add(accountId);
    setLoadingByAccount((prev) => ({ ...prev, [accountId]: true }));
    setErrorsByAccount((prev) => ({ ...prev, [accountId]: null }));

    try {
      const channels = await accountsService.getAccountChannels(accountId);
      const channelsArray = Array.isArray(channels) ? channels : [];

      setChannelsByAccount((prev) => ({
        ...prev,
        [accountId]: channelsArray,
      }));
      setErrorsByAccount((prev) => ({ ...prev, [accountId]: null }));
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load channels");
      setErrorsByAccount((prev) => ({ ...prev, [accountId]: error }));
      console.error(`Failed to load channels for account ${accountId}:`, err);
    } finally {
      setLoadingByAccount((prev) => ({ ...prev, [accountId]: false }));
      ongoingRequestsRef.current.delete(accountId);
    }
  }, [channelsByAccount]);

  /**
   * Refresh channels for a specific account
   * This will always make a new API call, even if channels already exist
   */
  const refreshChannels = useCallback(async (accountId: number) => {
    // If a request is already in progress for this account, don't make another call
    if (ongoingRequestsRef.current.has(accountId)) {
      return;
    }

    // Mark request as ongoing
    ongoingRequestsRef.current.add(accountId);
    setLoadingByAccount((prev) => ({ ...prev, [accountId]: true }));
    setErrorsByAccount((prev) => ({ ...prev, [accountId]: null }));

    try {
      const channels = await accountsService.getAccountChannels(accountId);
      const channelsArray = Array.isArray(channels) ? channels : [];

      setChannelsByAccount((prev) => ({
        ...prev,
        [accountId]: channelsArray,
      }));
      setErrorsByAccount((prev) => ({ ...prev, [accountId]: null }));
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load channels");
      setErrorsByAccount((prev) => ({ ...prev, [accountId]: error }));
      console.error(`Failed to refresh channels for account ${accountId}:`, err);
    } finally {
      setLoadingByAccount((prev) => ({ ...prev, [accountId]: false }));
      ongoingRequestsRef.current.delete(accountId);
    }
  }, []);

  /**
   * Get channels for a specific account
   */
  const getChannels = useCallback(
    (accountId: number): Channel[] => {
      return channelsByAccount[accountId] || [];
    },
    [channelsByAccount]
  );

  /**
   * Get loading state for a specific account
   */
  const isLoading = useCallback(
    (accountId: number): boolean => {
      return loadingByAccount[accountId] || false;
    },
    [loadingByAccount]
  );

  /**
   * Get error for a specific account
   */
  const getError = useCallback(
    (accountId: number): Error | null => {
      return errorsByAccount[accountId] || null;
    },
    [errorsByAccount]
  );

  /**
   * Clear channels for a specific account
   */
  const clearChannels = useCallback((accountId: number) => {
    setChannelsByAccount((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
    setLoadingByAccount((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
    setErrorsByAccount((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
  }, []);

  /**
   * Clear all channels
   */
  const clearAllChannels = useCallback(() => {
    setChannelsByAccount({});
    setLoadingByAccount({});
    setErrorsByAccount({});
    ongoingRequestsRef.current.clear();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<GlobalStateContextType>(
    () => ({
      channels: {
        getChannels,
        isLoading,
        getError,
        loadChannels,
        refreshChannels,
        clearChannels,
        clearAllChannels,
      },
      // Future: Add more global state here
    }),
    [
      getChannels,
      isLoading,
      getError,
      loadChannels,
      refreshChannels,
      clearChannels,
      clearAllChannels,
    ]
  );

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
};

/**
 * Hook to access global state
 * Usage: const { channels } = useGlobalState();
 */
export const useGlobalState = (): GlobalStateContextType => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};

/**
 * Hook to access channels state (convenience hook)
 * Usage: const { getChannels, loadChannels, ... } = useChannels();
 */
export const useChannels = () => {
  const { channels } = useGlobalState();
  return channels;
};

