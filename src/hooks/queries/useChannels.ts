import { useQuery } from "@tanstack/react-query";
import { accountsService, type Channel } from "../../services/accounts";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch channels for a specific account
 * Uses React Query for caching and automatic state management
 * 
 * @param accountId - The account ID to fetch channels for
 */
export const useChannels = (accountId: number | undefined) => {
  return useQuery<Channel[], Error>({
    queryKey: accountId ? queryKeys.channels.lists(accountId) : ["channels", "list", "disabled"],
    queryFn: async () => {
      if (!accountId) return [];
      const data = await accountsService.getAccountChannels(accountId);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!accountId, // Only run query if accountId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes - same as global config
    gcTime: 10 * 60 * 1000, // 10 minutes - same as global config
    // Refetch on mount if data is stale (after staleTime)
    refetchOnMount: true,
    // Refetch on window focus if data is stale
    refetchOnWindowFocus: true,
  });
};

