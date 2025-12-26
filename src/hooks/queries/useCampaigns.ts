import { useQuery } from "@tanstack/react-query";
import { campaignsService, type CampaignsResponse, type CampaignsQueryParams } from "../../services/campaigns";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch campaigns for a specific account with pagination and filters
 * Uses React Query for caching and automatic state management
 * 
 * @param accountId - The account ID to fetch campaigns for
 * @param params - Query parameters including pagination, sorting, filters, and date range
 */
export const useCampaigns = (
  accountId: number | undefined,
  params?: CampaignsQueryParams
) => {
  return useQuery<CampaignsResponse, Error>({
    queryKey: accountId
      ? queryKeys.campaigns.lists(accountId, params)
      : ["campaigns", "list", "disabled"],
    queryFn: async () => {
      if (!accountId) {
        return {
          campaigns: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        };
      }
      const response = await campaignsService.getCampaigns(accountId, params || {});
      return response;
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

