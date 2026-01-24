import { useQuery } from "@tanstack/react-query";
import { accountsService } from "../../services/accounts";
import { queryKeys } from "./queryKeys";

interface GoogleProfile {
  customer_id: string;
  customer_id_raw: string;
  resource_name: string;
  name: string;
  currency_code?: string;
  timezone?: string;
  is_manager?: boolean;
  manager_customer_id?: string | null;
  status?: string;
  is_selected?: boolean;
}

interface GoogleProfilesResponse {
  profiles: GoogleProfile[];
  total: number;
  selected: number;
}

/**
 * Hook to fetch Google profiles for a specific channel
 * Uses React Query for automatic request deduplication, caching, and state management
 * 
 * @param channelId - The channel ID to fetch Google profiles for
 */
export const useGoogleProfiles = (channelId: number | undefined) => {
  return useQuery<GoogleProfilesResponse, Error>({
    queryKey: channelId ? queryKeys.googleProfiles.lists(channelId) : ["googleProfiles", "list", "disabled"],
    queryFn: async () => {
      if (!channelId) {
        return { profiles: [], total: 0, selected: 0 };
      }
      const data = await accountsService.getGoogleProfiles(channelId);
      return {
        profiles: data.profiles || [],
        total: data.total || 0,
        selected: data.selected || 0,
      };
    },
    enabled: !!channelId, // Only run query if channelId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    // React Query automatically deduplicates requests with the same queryKey
    // So even if multiple components call this hook simultaneously, only one request is made
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on window focus for this data
  });
};
