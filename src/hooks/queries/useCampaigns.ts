import { useQuery } from "@tanstack/react-query";
import { campaignsService, type CampaignsResponse, type CampaignsQueryParams } from "../../services/campaigns";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch campaigns for a specific account with pagination and filters
 * Uses React Query for caching and automatic state management
 *
 * @param accountId - The account ID to fetch campaigns for
 * @param params - Query parameters including pagination, sorting, filters, and date range
 * @param channelId - Optional channel ID for Amazon channel-scoped API path
 * @param profileId - Optional profile ID for filtering by Amazon profile
 */
export const useCampaigns = (
  accountId: number | undefined,
  params?: CampaignsQueryParams,
  channelId?: number | string | null,
  profileId?: string | number | null
) => {
  return useQuery<CampaignsResponse, Error>({
    queryKey: accountId
      ? queryKeys.campaigns.lists(accountId, params, channelId, profileId)
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
      const response = await campaignsService.getCampaigns(
        accountId,
        params || {},
        channelId,
        profileId
      );
      return response;
    },
    enabled: !!accountId, // Only run query if accountId is provided
    staleTime: 0, // Always consider stale - fetch fresh data when navigating to campaigns
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: "always", // Always refetch from DB when Campaigns page mounts (e.g. sidebar nav click)
    refetchOnWindowFocus: true,
  });
};

