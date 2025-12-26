import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { accountsService, type Channel } from "../services/accounts";
import { campaignsService, type CampaignsResponse, type CampaignsQueryParams } from "../services/campaigns";
import { queryKeys } from "../hooks/queries/queryKeys";

interface GlobalStateContextType {
  // Channels state management
  channels: {
    // Get channels for a specific account (from cache)
    getChannels: (accountId: number) => Channel[];
    // Get loading state for a specific account
    isLoading: (accountId: number) => boolean;
    // Get error for a specific account
    getError: (accountId: number) => Error | null;
    // Load channels for a specific account (imperative - triggers fetch if not cached)
    loadChannels: (accountId: number) => Promise<void>;
    // Refresh channels for a specific account
    refreshChannels: (accountId: number) => Promise<void>;
    // Clear channels for a specific account
    clearChannels: (accountId: number) => void;
    // Clear all channels
    clearAllChannels: () => void;
  };
  // Campaigns state management
  campaigns: {
    // Get campaigns for a specific account with params (from cache)
    getCampaigns: (accountId: number, params?: CampaignsQueryParams) => CampaignsResponse | null;
    // Get loading state for a specific account and params
    isLoading: (accountId: number, params?: CampaignsQueryParams) => boolean;
    // Get error for a specific account and params
    getError: (accountId: number, params?: CampaignsQueryParams) => Error | null;
    // Load campaigns for a specific account (imperative - triggers fetch if not cached)
    loadCampaigns: (accountId: number, params?: CampaignsQueryParams) => Promise<void>;
    // Refresh campaigns for a specific account and params
    refreshCampaigns: (accountId: number, params?: CampaignsQueryParams) => Promise<void>;
    // Invalidate campaigns cache for an account (all pages/filters)
    invalidateCampaigns: (accountId: number) => Promise<void>;
    // Clear campaigns for a specific account
    clearCampaigns: (accountId: number) => void;
    // Clear all campaigns
    clearAllCampaigns: () => void;
  };
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();

  /**
   * Load channels for a specific account
   * Uses React Query's fetchQuery which handles caching and deduplication automatically
   */
  const loadChannels = useCallback(
    async (accountId: number) => {
      const queryKey = queryKeys.channels.lists(accountId);

      // Check if data already exists in cache
      const cachedData = queryClient.getQueryData<Channel[]>(queryKey);
      if (cachedData) {
        // Data already cached, no need to fetch
        return;
      }

      // Fetch data using React Query (handles deduplication automatically)
      await queryClient.fetchQuery<Channel[], Error>({
        queryKey,
        queryFn: async () => {
          const data = await accountsService.getAccountChannels(accountId);
          return Array.isArray(data) ? data : [];
        },
      });
    },
    [queryClient] // queryClient from useQueryClient is stable but should be in deps
  );

  /**
   * Refresh channels for a specific account
   * This will always make a new API call, even if channels already exist in cache
   */
  const refreshChannels = useCallback(
    async (accountId: number) => {
      const queryKey = queryKeys.channels.lists(accountId);

      // Use invalidateQueries to mark as stale and refetch
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  /**
   * Get channels for a specific account from React Query cache
   */
  const getChannels = useCallback(
    (accountId: number): Channel[] => {
      const queryKey = queryKeys.channels.lists(accountId);
      const data = queryClient.getQueryData<Channel[]>(queryKey);
      return data || [];
    },
    [queryClient]
  );

  /**
   * Get loading state for a specific account from React Query
   */
  const isLoading = useCallback(
    (accountId: number): boolean => {
      const queryKey = queryKeys.channels.lists(accountId);

      // If data exists in cache, we're definitely not loading
      const cachedData = queryClient.getQueryData<Channel[]>(queryKey);
      if (cachedData !== undefined && cachedData !== null) {
        return false;
      }

      // Check query from cache directly for more accurate state
      const query = queryClient.getQueryCache().find({ queryKey });
      if (!query) {
        // No query in cache means it hasn't been fetched, so not loading
        return false;
      }

      // Check if actively fetching
      return query.state.fetchStatus === "fetching";
    },
    [queryClient]
  );

  /**
   * Get error for a specific account from React Query
   */
  const getError = useCallback(
    (accountId: number): Error | null => {
      const queryKey = queryKeys.channels.lists(accountId);
      const queryState = queryClient.getQueryState(queryKey);
      return (queryState?.error as Error) || null;
    },
    [queryClient]
  );

  /**
   * Clear channels for a specific account from React Query cache
   */
  const clearChannels = useCallback(
    (accountId: number) => {
      const queryKey = queryKeys.channels.lists(accountId);
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );

  /**
   * Clear all channels from React Query cache
   */
  const clearAllChannels = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.channels.all });
  }, [queryClient]);

  // ==================== Campaigns State Management ====================

  /**
   * Load campaigns for a specific account with params
   * Uses React Query's fetchQuery which handles caching and deduplication automatically
   */
  const loadCampaigns = useCallback(
    async (accountId: number, params?: CampaignsQueryParams) => {
      const queryKey = queryKeys.campaigns.lists(accountId, params);

      // Check if data already exists in cache
      const cachedData = queryClient.getQueryData<CampaignsResponse>(queryKey);
      if (cachedData) {
        // Data already cached, no need to fetch
        return;
      }

      // Fetch data using React Query (handles deduplication automatically)
      await queryClient.fetchQuery<CampaignsResponse, Error>({
        queryKey,
        queryFn: async () => {
          const data = await campaignsService.getCampaigns(accountId, params || {});
          return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      });
    },
    [queryClient]
  );

  /**
   * Refresh campaigns for a specific account with params
   * This will always make a new API call, even if campaigns already exist in cache
   */
  const refreshCampaigns = useCallback(
    async (accountId: number, params?: CampaignsQueryParams) => {
      const queryKey = queryKeys.campaigns.lists(accountId, params);

      // Use invalidateQueries to mark as stale and refetch
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  /**
   * Invalidate all campaigns for an account (all pages/filters)
   * Useful when a campaign is updated/deleted and we want to refresh all views
   */
  const invalidateCampaigns = useCallback(
    async (accountId: number) => {
      // Invalidate all campaign queries for this account
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.campaigns.all, "list", accountId],
      });
    },
    [queryClient]
  );

  /**
   * Get campaigns for a specific account with params from React Query cache
   */
  const getCampaigns = useCallback(
    (accountId: number, params?: CampaignsQueryParams): CampaignsResponse | null => {
      const queryKey = queryKeys.campaigns.lists(accountId, params);
      const data = queryClient.getQueryData<CampaignsResponse>(queryKey);
      return data || null;
    },
    [queryClient]
  );

  /**
   * Get loading state for campaigns from React Query
   */
  const isCampaignsLoading = useCallback(
    (accountId: number, params?: CampaignsQueryParams): boolean => {
      const queryKey = queryKeys.campaigns.lists(accountId, params);

      // If data exists in cache, we're definitely not loading
      const cachedData = queryClient.getQueryData<CampaignsResponse>(queryKey);
      if (cachedData !== undefined && cachedData !== null) {
        return false;
      }

      // Check query from cache directly for more accurate state
      const query = queryClient.getQueryCache().find({ queryKey });
      if (!query) {
        // No query in cache means it hasn't been fetched, so not loading
        return false;
      }

      // Check if actively fetching
      return query.state.fetchStatus === "fetching";
    },
    [queryClient]
  );

  /**
   * Get error for campaigns from React Query
   */
  const getCampaignsError = useCallback(
    (accountId: number, params?: CampaignsQueryParams): Error | null => {
      const queryKey = queryKeys.campaigns.lists(accountId, params);
      const queryState = queryClient.getQueryState(queryKey);
      return (queryState?.error as Error) || null;
    },
    [queryClient]
  );

  /**
   * Clear campaigns for a specific account from React Query cache
   */
  const clearCampaigns = useCallback(
    (accountId: number) => {
      queryClient.removeQueries({
        queryKey: [...queryKeys.campaigns.all, "list", accountId],
      });
    },
    [queryClient]
  );

  /**
   * Clear all campaigns from React Query cache
   */
  const clearAllCampaigns = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.campaigns.all });
  }, [queryClient]);

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
      campaigns: {
        getCampaigns,
        isLoading: isCampaignsLoading,
        getError: getCampaignsError,
        loadCampaigns,
        refreshCampaigns,
        invalidateCampaigns,
        clearCampaigns,
        clearAllCampaigns,
      },
    }),
    [
      getChannels,
      isLoading,
      getError,
      loadChannels,
      refreshChannels,
      clearChannels,
      clearAllChannels,
      getCampaigns,
      isCampaignsLoading,
      getCampaignsError,
      loadCampaigns,
      refreshCampaigns,
      invalidateCampaigns,
      clearCampaigns,
      clearAllCampaigns,
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
 * Hook to access channels state (convenience hook for imperative methods)
 * Usage: const { getChannels, loadChannels, ... } = useChannelsHelpers();
 *
 * For React Query hooks with proper loading states, use useChannels from hooks/queries/useChannels
 */
export const useChannelsHelpers = () => {
  const { channels } = useGlobalState();
  return channels;
};

// Re-export the React Query hooks for convenience
export { useChannels } from "../hooks/queries/useChannels";
export { useCampaigns } from "../hooks/queries/useCampaigns";
