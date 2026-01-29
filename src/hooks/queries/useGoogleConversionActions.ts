import { useQuery } from "@tanstack/react-query";
import {
  googleAdwordsConversionActionsService,
  type GoogleConversionAction,
} from "../../services/googleAdwords/googleAdwordsConversionActions";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch conversion actions for a specific profile (account-level)
 * Uses React Query for caching and automatic state management
 * 
 * @param accountId - The account ID
 * @param channelId - The channel ID
 * @param profileId - The profile ID to fetch conversion actions for
 */
export const useGoogleConversionActions = (
  accountId: number | undefined,
  channelId: number | undefined,
  profileId: number | undefined
) => {
  return useQuery<GoogleConversionAction[], Error>({
    queryKey: accountId && channelId && profileId
      ? queryKeys.googleConversionActions.lists(accountId, channelId, profileId)
      : ["googleConversionActions", "list", "disabled"],
    queryFn: async () => {
      if (!accountId || !channelId || !profileId) {
        return [];
      }
      const response = await googleAdwordsConversionActionsService.listConversionActions(
        accountId,
        channelId,
        profileId
      );
      if (response.success) {
        return response.conversion_actions;
      }
      throw new Error("Failed to load conversion actions");
    },
    enabled: !!(accountId && channelId && profileId), // Only run query if all IDs are provided
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on window focus for conversion actions
  });
};
