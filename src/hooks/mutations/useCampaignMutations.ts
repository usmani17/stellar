import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaignsService,
  type CampaignsQueryParams,
} from "../../services/campaigns";
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
      campaignIds: Array<string | number>;
      action: "status" | "budget" | "budgetType" | "endDate" | "portfolioId" | "targetingType" | "name" | "tags" | "siteRestrictions" | "dynamicBidding";
      status?: "enable" | "pause";
      budgetAction?: "increase" | "decrease" | "set";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
      budgetType?: "DAILY" | "LIFETIME";
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
      const updates: Promise<any>[] = [];

      if (payload.data.budget !== undefined) {
        updates.push(
          campaignsService.bulkUpdateCampaigns(
            accountId,
            {
              campaignIds: [payload.campaignId],
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

      if (payload.data.budgetType) {
        updates.push(
          campaignsService.bulkUpdateCampaigns(
            accountId,
            {
              campaignIds: [payload.campaignId],
              action: "budgetType",
              budgetType: payload.data.budgetType,
            },
            channelId,
            profileId
          )
        );
      }

      if (payload.data.endDate !== undefined) {
        updates.push(
          campaignsService.bulkUpdateCampaigns(
            accountId,
            {
              campaignIds: [payload.campaignId],
              action: "endDate",
              endDate: payload.data.endDate,
            },
            channelId,
            profileId
          )
        );
      }

      if (payload.data.portfolioId !== undefined) {
        updates.push(
          campaignsService.bulkUpdateCampaigns(
            accountId,
            {
              campaignIds: [payload.campaignId],
              action: "portfolioId",
              portfolioId: payload.data.portfolioId,
            },
            channelId,
            profileId
          )
        );
      }

      if (payload.data.targetingType) {
        updates.push(
          campaignsService.bulkUpdateCampaigns(
            accountId,
            {
              campaignIds: [payload.campaignId],
              action: "targetingType",
              targetingType: payload.data.targetingType,
            },
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
