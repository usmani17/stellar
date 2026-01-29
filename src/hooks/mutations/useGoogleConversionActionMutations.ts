import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  googleAdwordsConversionActionsService,
  type CreateGoogleConversionActionPayload,
  type GoogleConversionAction,
} from "../../services/googleAdwords/googleAdwordsConversionActions";
import { queryKeys } from "../queries/queryKeys";

/**
 * Hook for creating a conversion action
 * Automatically invalidates conversion actions cache after successful create
 */
export const useCreateGoogleConversionAction = (
  accountId: number,
  channelId: number,
  profileId: number
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGoogleConversionActionPayload) => {
      const response = await googleAdwordsConversionActionsService.createConversionAction(
        accountId,
        channelId,
        profileId,
        payload
      );
      if (response.success) {
        return response.conversion_action;
      }
      throw new Error("Failed to create conversion action");
    },
    onSuccess: () => {
      // Invalidate all conversion actions queries for this account/channel/profile to trigger fresh API call
      queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.googleConversionActions.all,
          "list",
          accountId,
          channelId,
          profileId,
        ],
      });
    },
  });
};
