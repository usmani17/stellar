import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaignsService,
  type CampaignsQueryParams,
} from "../../services/campaigns";
import { buildGroupedCampaignPayload } from "../../utils/campaignBulkPayload";
import { queryKeys } from "../queries/queryKeys";

/**
 * Hook for bulk updating campaigns (status, budget, etc.)
 * Automatically invalidates campaigns cache after successful update
 */
export const useBulkUpdateCampaigns = (
  accountId: number,
  channelId?: number | string | null,
  profileId?: string | number | null
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      payload: Record<string, Partial<Record<"SP" | "SB" | "SD", Array<string | number>>>>;
      action: "status" | "budget";
      status?: "enable" | "pause" | "archive";
      budgetAction?: "increase" | "decrease" | "set";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
      endDate?: string | null;
      portfolioId?: string | number | null;
      targetingType?: "AUTO" | "MANUAL";
      name?: string;
      tags?: Record<string, string>;
      siteRestrictions?: string | null;
      dynamicBidding?: any;
    }) => {
      return await campaignsService.bulkUpdateCampaigns(
        accountId,
        payload,
        channelId,
        profileId
      );
    },
    onSuccess: () => {
      // Invalidate all campaigns queries for this account to refetch fresh data
      console.log("Invalidating campaigns queries for account", accountId);
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.campaigns.all, "list", accountId],
      });
    },
  });
};

/**
 * Hook for bulk deleting campaigns
 * Automatically invalidates campaigns cache after successful delete
 */
export const useBulkDeleteCampaigns = (
  accountId: number,
  channelId?: number | string | null,
  profileId?: string | number | null
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { campaignIds: Array<string | number> }) => {
      return await campaignsService.bulkDeleteCampaigns(
        accountId,
        payload,
        channelId,
        profileId
      );
    },
    onSuccess: () => {
      // Invalidate all campaigns queries for this account to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.campaigns.all, "list", accountId],
      });
    },
  });
};

/**
 * Hook for creating a campaign
 * Automatically invalidates campaigns cache after successful create
 */
export const useCreateCampaign = (
  accountId: number,
  channelId?: number | string | null,
  profileId?: string | number | null
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: "SP" | "SB" | "SD";
      budget: number;
      budgetType: "DAILY" | "LIFETIME";
      startDate: string;
      endDate?: string;
      portfolioId?: string | number;
      targetingType?: "AUTO" | "MANUAL";
      profileId: string | number;
    }) => {
      return await campaignsService.createCampaign(
        accountId,
        data,
        channelId,
        profileId
      );
    },
    onSuccess: () => {
      // Invalidate all campaigns queries for this account to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.campaigns.all, "list", accountId],
      });
    },
  });
};

/**
 * Hook for updating a campaign (via form)
 * Automatically invalidates campaigns cache after successful update
 */
export const useUpdateCampaign = (
  accountId: number,
  channelId?: number | string | null,
  profileId?: string | number | null
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      campaignId: string | number;
      campaignType?: "SP" | "SB" | "SD";
      data: {
        name?: string;
        budget?: number;
        budgetType?: "DAILY" | "LIFETIME";
        startDate?: string;
        endDate?: string | null;
        portfolioId?: string | number | null;
        targetingType?: "AUTO" | "MANUAL";
      };
    }) => {
      const campType = (payload.campaignType || "SP").toUpperCase() as "SP" | "SB" | "SD";
      const profileIdStr = profileId ? String(profileId) : undefined;
      const bulkPayload = buildGroupedCampaignPayload([
        {
          campaignId: payload.campaignId,
          profile_id: profileIdStr,
          type: campType,
        },
      ]);
      if (Object.keys(bulkPayload).length === 0) {
        throw new Error("Profile ID required for campaign update");
      }

      const updates: Promise<any>[] = [];

      if (payload.data.budget !== undefined) {
        updates.push(
          campaignsService.bulkUpdateCampaigns(
            accountId,
            {
              payload: bulkPayload,
              action: "budget",
              budgetAction: "set",
              unit: "amount",
              value: payload.data.budget,
            },
            channelId,
            profileId
          )
        );
      }

      // budgetType, endDate, portfolioId, targetingType - backend bulk only supports status/budget; use updateCampaign
      const singleUpdateFields: Record<string, any> = {};
      if (payload.data.budgetType) singleUpdateFields.budgetType = payload.data.budgetType;
      if (payload.data.endDate !== undefined) singleUpdateFields.endDate = payload.data.endDate;
      if (payload.data.portfolioId !== undefined) singleUpdateFields.portfolioId = payload.data.portfolioId;
      if (payload.data.targetingType) singleUpdateFields.targetingType = payload.data.targetingType;

      if (Object.keys(singleUpdateFields).length > 0) {
        updates.push(
          campaignsService.updateCampaign(
            accountId,
            payload.campaignId,
            singleUpdateFields,
            channelId,
            profileId
          )
        );
      }

      await Promise.all(updates);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate all campaigns queries for this account to refetch fresh data
      console.log("Invalidating campaigns queries for account", accountId);
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.campaigns.all, "list", accountId],
      });
    },
  });
};
